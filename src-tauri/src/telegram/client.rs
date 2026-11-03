use std::{
    path::PathBuf,
    sync::Arc,
};
use grammers_client::{
    client::{LoginToken, PasswordToken},
    peer::Peer,
    Client, SenderPool, SignInError,
};
use crate::telegram::session::RusqliteSession;
use grammers_session::types::{PeerAuth, PeerId, PeerRef};
use grammers_tl_types as tl;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tokio::sync::{Mutex, RwLock};

use crate::db::schema::DbManager;
use crate::error::AppError;
use crate::vault::keystore::Keystore;

pub const DEFAULT_STORAGE_CHANNEL_TITLE: &str = "TeleCloud_Vault_Node";
pub const DEFAULT_STORAGE_CHANNEL_ABOUT: &str = "TeleCloud Vault encrypted binary object store node";

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestCodeResponse {
    pub phone: String,
    pub code_sent: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SignInResponse {
    pub success: bool,
    pub password_required: bool,
    pub hint: Option<String>,
    pub user_id: Option<i64>,
    pub storage_channel_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageChannelInfo {
    pub channel_id: i64,
    pub title: String,
    pub is_newly_created: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TelegramUserProfile {
    pub id: i64,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub username: Option<String>,
    pub phone: Option<String>,
}

enum AuthState {
    Idle,
    CodeSent {
        _phone: String,
        token: LoginToken,
    },
    PasswordNeeded {
        _phone: String,
        password_token: PasswordToken,
    },
    Authenticated {
        _user_id: i64,
    },
}

#[derive(Clone)]
pub struct TelegramClientManager {
    keystore: Arc<Keystore>,
    db: Arc<DbManager>,
    session_path: PathBuf,
    client: Arc<RwLock<Option<Client>>>,
    auth_state: Arc<Mutex<AuthState>>,
}

impl TelegramClientManager {
    /// Initialize manager with app data paths
    pub fn new(app_handle: &AppHandle, keystore: Arc<Keystore>, db: Arc<DbManager>) -> Result<Self, AppError> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Keystore(format!("Failed to resolve app data dir: {e}")))?;

        let session_dir = app_dir.join("session");
        if !session_dir.exists() {
            std::fs::create_dir_all(&session_dir)
                .map_err(|e| AppError::Io(format!("Failed to create session dir: {e}")))?;
        }

        let session_path = session_dir.join("telecloud_master.session");

        Ok(Self {
            keystore,
            db,
            session_path,
            client: Arc::new(RwLock::new(None)),
            auth_state: Arc::new(Mutex::new(AuthState::Idle)),
        })
    }

    /// Connect or retrieve cached MTProto client
    pub async fn get_client(&self) -> Result<Client, AppError> {
        {
            let guard = self.client.read().await;
            if let Some(ref c) = *guard {
                return Ok(c.clone());
            }
        }

        let creds = self
            .keystore
            .load_credentials()?
            .ok_or(AppError::AuthRequired)?;

        let session = Arc::new(
            RusqliteSession::open(&self.session_path)
                .map_err(|e| AppError::Telegram(format!("Failed to open session: {e}")))?,
        );

        let pool = SenderPool::new(Arc::clone(&session), creds.api_id);
        let handle = pool.handle;
        tokio::spawn(pool.runner.run());

        let client = Client::new(handle);

        let mut guard = self.client.write().await;
        *guard = Some(client.clone());

        Ok(client)
    }

    /// Check if current MTProto session is authorized
    pub async fn is_authorized(&self) -> Result<bool, AppError> {
        if !self.keystore.is_configured() {
            return Ok(false);
        }

        match self.get_client().await {
            Ok(client) => match client.is_authorized().await {
                Ok(auth) => Ok(auth),
                Err(e) => {
                    eprintln!("is_authorized check failed: {e}");
                    Ok(false)
                }
            },
            Err(_) => Ok(false),
        }
    }

    /// Request OTP login code via Telegram MTProto
    pub async fn request_login_code(&self, phone: &str) -> Result<RequestCodeResponse, AppError> {
        let clean_phone = phone.trim().to_string();
        if clean_phone.is_empty() {
            return Err(AppError::Validation("Phone number is required".into()));
        }

        let creds = self
            .keystore
            .load_credentials()?
            .ok_or(AppError::AuthRequired)?;

        let client = self.get_client().await?;

        let token = client
            .request_login_code(&clean_phone, &creds.api_hash)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to request login code: {e}")))?;

        let mut auth_guard = self.auth_state.lock().await;
        *auth_guard = AuthState::CodeSent {
            _phone: clean_phone.clone(),
            token,
        };

        Ok(RequestCodeResponse {
            phone: clean_phone,
            code_sent: true,
        })
    }

    /// Submit the login code received by the user
    pub async fn submit_login_code(&self, code: &str) -> Result<SignInResponse, AppError> {
        let clean_code = code.trim();
        if clean_code.is_empty() {
            return Err(AppError::Validation("Login code cannot be empty".into()));
        }

        let client = self.get_client().await?;

        let token = {
            let mut auth_guard = self.auth_state.lock().await;
            match std::mem::replace(&mut *auth_guard, AuthState::Idle) {
                AuthState::CodeSent { _phone: _, token } => token,
                AuthState::PasswordNeeded { _phone, password_token } => {
                    // Restore state if was in password mode
                    *auth_guard = AuthState::PasswordNeeded { _phone, password_token };
                    return Err(AppError::Validation("2FA password is required, not login code".into()));
                }
                _ => return Err(AppError::Validation("No pending login code request found. Request a code first.".into())),
            }
        };

        match client.sign_in(&token, clean_code).await {
            Ok(user) => {
                let user_id = user.id().bare_id_unchecked();

                let mut auth_guard = self.auth_state.lock().await;
                *auth_guard = AuthState::Authenticated { _user_id: user_id };

                // Automatically provision or resolve storage channel
                let channel_info = self.provision_storage_channel().await.ok();
                let storage_channel_id = channel_info.map(|c| c.channel_id);

                Ok(SignInResponse {
                    success: true,
                    password_required: false,
                    hint: None,
                    user_id: Some(user_id),
                    storage_channel_id,
                })
            }
            Err(SignInError::PasswordRequired(password_token)) => {
                let hint = password_token.hint().map(String::from);

                let mut auth_guard = self.auth_state.lock().await;
                *auth_guard = AuthState::PasswordNeeded {
                    _phone: "".into(),
                    password_token,
                };

                Ok(SignInResponse {
                    success: false,
                    password_required: true,
                    hint,
                    user_id: None,
                    storage_channel_id: None,
                })
            }
            Err(SignInError::InvalidCode) => Err(AppError::InvalidAuthCode),
            Err(e) => Err(AppError::Telegram(format!("Sign in failed: {e}"))),
        }
    }

    /// Submit 2FA cloud password if account has 2-step verification enabled
    pub async fn submit_password_2fa(&self, password: &str) -> Result<SignInResponse, AppError> {
        let client = self.get_client().await?;

        let password_token = {
            let mut auth_guard = self.auth_state.lock().await;
            match std::mem::replace(&mut *auth_guard, AuthState::Idle) {
                AuthState::PasswordNeeded { _phone: _, password_token } => password_token,
                _ => return Err(AppError::Validation("No pending 2FA password verification required.".into())),
            }
        };

        match client.check_password(password_token, password.trim()).await {
            Ok(user) => {
                let user_id = user.id().bare_id_unchecked();

                let mut auth_guard = self.auth_state.lock().await;
                *auth_guard = AuthState::Authenticated { _user_id: user_id };

                // Automatically provision storage channel
                let channel_info = self.provision_storage_channel().await.ok();
                let storage_channel_id = channel_info.map(|c| c.channel_id);

                Ok(SignInResponse {
                    success: true,
                    password_required: false,
                    hint: None,
                    user_id: Some(user_id),
                    storage_channel_id,
                })
            }
            Err(SignInError::InvalidPassword(token)) => {
                let _hint = token.hint().map(String::from);
                let mut auth_guard = self.auth_state.lock().await;
                *auth_guard = AuthState::PasswordNeeded {
                    _phone: "".into(),
                    password_token: token,
                };
                Err(AppError::InvalidPassword)
            }
            Err(e) => Err(AppError::Telegram(format!("2FA check failed: {e}"))),
        }
    }

    /// Provision or discover the "TeleCloud_Vault_Node" private storage channel
    pub async fn provision_storage_channel(&self) -> Result<StorageChannelInfo, AppError> {
        let client = self.get_client().await?;

        // 1. Check if channel ID is already stored and still valid
        if let Some(cached_id) = self.db.get_config("storage_channel_id")? {
            if let Ok(id) = cached_id.parse::<i64>() {
                return Ok(StorageChannelInfo {
                    channel_id: id,
                    title: DEFAULT_STORAGE_CHANNEL_TITLE.to_string(),
                    is_newly_created: false,
                });
            }
        }

        // 2. Query user dialogs to see if channel already exists
        let mut dialogs = client.iter_dialogs();
        while let Ok(Some(dialog)) = dialogs.next().await {
            let peer = dialog.peer();
            if peer.name() == Some(DEFAULT_STORAGE_CHANNEL_TITLE) {
                let channel_id = peer.id().bare_id_unchecked();
                let access_hash = dialog.peer_ref().auth.hash();

                self.keystore.update_storage_channel(channel_id)?;
                self.db.set_config("storage_channel_id", &channel_id.to_string())?;
                self.db.set_config("storage_channel_access_hash", &access_hash.to_string())?;

                return Ok(StorageChannelInfo {
                    channel_id,
                    title: DEFAULT_STORAGE_CHANNEL_TITLE.to_string(),
                    is_newly_created: false,
                });
            }
        }

        // 3. Create private storage channel via MTProto CreateChannel RPC
        let create_request = tl::functions::channels::CreateChannel {
            broadcast: true,
            megagroup: false,
            for_import: false,
            forum: false,
            title: DEFAULT_STORAGE_CHANNEL_TITLE.to_string(),
            about: DEFAULT_STORAGE_CHANNEL_ABOUT.to_string(),
            geo_point: None,
            address: None,
            ttl_period: None,
        };

        let updates = client
            .invoke(&create_request)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to create storage channel: {e}")))?;

        let mut created_channel_id: Option<i64> = None;
        let mut created_access_hash: Option<i64> = None;
        match updates {
            tl::enums::Updates::Updates(u) => {
                for chat in u.chats {
                    if let tl::enums::Chat::Channel(c) = chat {
                        created_channel_id = Some(c.id);
                        created_access_hash = c.access_hash;
                        break;
                    }
                }
            }
            tl::enums::Updates::Combined(c) => {
                for chat in c.chats {
                    if let tl::enums::Chat::Channel(ch) = chat {
                        created_channel_id = Some(ch.id);
                        created_access_hash = ch.access_hash;
                        break;
                    }
                }
            }
            _ => {}
        }

        let channel_id = created_channel_id.ok_or_else(|| {
            AppError::Telegram("Channel creation succeeded but no channel ID was returned".into())
        })?;

        self.keystore.update_storage_channel(channel_id)?;
        self.db.set_config("storage_channel_id", &channel_id.to_string())?;
        if let Some(hash) = created_access_hash {
            self.db.set_config("storage_channel_access_hash", &hash.to_string())?;
        }

        Ok(StorageChannelInfo {
            channel_id,
            title: DEFAULT_STORAGE_CHANNEL_TITLE.to_string(),
            is_newly_created: true,
        })
    }

    /// Resolve the storage channel PeerRef for MTProto calls
    pub async fn resolve_storage_channel_peer_ref(&self) -> Result<PeerRef, AppError> {
        let client = self.get_client().await?;

        // 1. Try finding in dialogs
        let mut dialogs = client.iter_dialogs();
        while let Ok(Some(dialog)) = dialogs.next().await {
            if dialog.peer().name() == Some(DEFAULT_STORAGE_CHANNEL_TITLE) {
                let pr = dialog.peer_ref();
                self.db.set_config("storage_channel_id", &pr.id.bare_id_unchecked().to_string())?;
                self.db.set_config("storage_channel_access_hash", &pr.auth.hash().to_string())?;
                return Ok(pr);
            }
        }

        // 2. Use cached channel_id & access_hash
        if let (Some(id_str), Some(hash_str)) = (
            self.db.get_config("storage_channel_id")?,
            self.db.get_config("storage_channel_access_hash")?,
        ) {
            if let (Ok(channel_id), Ok(access_hash)) = (id_str.parse::<i64>(), hash_str.parse::<i64>()) {
                let id = PeerId::channel_unchecked(channel_id);
                let auth = PeerAuth::from_hash(access_hash);
                return Ok(PeerRef { id, auth });
            }
        }

        // 3. Fallback: provision and return
        let info = self.provision_storage_channel().await?;
        if let Some(hash_str) = self.db.get_config("storage_channel_access_hash")? {
            if let Ok(access_hash) = hash_str.parse::<i64>() {
                let id = PeerId::channel_unchecked(info.channel_id);
                let auth = PeerAuth::from_hash(access_hash);
                return Ok(PeerRef { id, auth });
            }
        }

        Err(AppError::StorageChannelNotFound)
    }

    /// Promote a worker bot to channel administrator with upload & message rights
    pub async fn promote_bot_to_admin(&self, bot_username: &str) -> Result<(), AppError> {
        let client = self.get_client().await?;
        let clean_username = bot_username.trim_start_matches('@');

        let peer = client
            .resolve_username(clean_username)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to resolve @{clean_username}: {e}")))?
            .ok_or_else(|| AppError::Telegram(format!("Bot @{clean_username} not found on Telegram")))?;

        let bot_ref = match peer {
            Peer::User(u) => u
                .to_ref()
                .await
                .map_err(|e| AppError::Telegram(e.to_string()))?
                .ok_or_else(|| AppError::Telegram("Cannot resolve bot peer reference".into()))?,
            _ => return Err(AppError::Telegram(format!("@{clean_username} is not a valid Telegram user"))),
        };

        let channel_peer = self.resolve_storage_channel_peer_ref().await?;
        let input_channel = tl::enums::InputChannel::from(&channel_peer);
        let input_user = tl::enums::InputUser::from(&bot_ref);

        let admin_rights = tl::enums::ChatAdminRights::Rights(tl::types::ChatAdminRights {
            change_info: false,
            post_messages: true,
            edit_messages: true,
            delete_messages: true,
            ban_users: false,
            invite_users: false,
            pin_messages: true,
            add_admins: false,
            anonymous: false,
            manage_call: false,
            other: false,
            manage_topics: false,
            post_stories: false,
            edit_stories: false,
            delete_stories: false,
            manage_direct_messages: false,
            manage_ranks: false,
            manage_linked_peers: false,
            manage_welcome_messages: false,
        });

        client
            .invoke(&tl::functions::channels::EditAdmin {
                channel: input_channel,
                user_id: input_user,
                admin_rights,
                rank: Some("WorkerBot".to_string()),
            })
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to promote bot @{clean_username} to admin: {e}")))?;

        Ok(())
    }

    /// Retrieve the currently authenticated Telegram user profile
    pub async fn get_me(&self) -> Result<TelegramUserProfile, AppError> {
        let client = self.get_client().await?;
        let user = client
            .get_me()
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to fetch user profile: {e}")))?;

        Ok(TelegramUserProfile {
            id: user.id().bare_id_unchecked(),
            first_name: user.first_name().map(String::from),
            last_name: user.last_name().map(String::from),
            username: user.username().map(String::from),
            phone: user.phone().map(String::from),
        })
    }
}
