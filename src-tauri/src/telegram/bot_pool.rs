use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
};
use grammers_client::{Client, SenderPool};
use grammers_session::types::{PeerAuth, PeerId, PeerRef};
use grammers_tl_types as tl;
use crate::telegram::session::RusqliteSession;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;

use crate::db::schema::{DbManager, WorkerBotRecord};
use crate::error::AppError;
use crate::telegram::client::TelegramClientManager;
use crate::telegram::flood_guard::{calculate_cooldown_timestamp, current_unix_timestamp};
use crate::vault::keystore::Keystore;

pub const MIN_BOTS_RULE_THRESHOLD: usize = 5;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotPoolHealth {
    pub total_bots: usize,
    pub active_bots: usize,
    pub cooling_bots: usize,
    pub min_rule_satisfied: bool,
    pub required_min_bots: usize,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerBotInfo {
    pub bot_id: String,
    pub bot_username: String,
    pub cooldown_until: i64,
    pub total_uploaded_bytes: i64,
    pub is_active: bool,
    pub is_cooling_down: bool,
    pub remaining_cooldown_secs: u64,
}

pub struct WorkerClient {
    pub bot_id: String,
    pub bot_username: String,
    pub client: Client,
    pub cooldown_until: i64,
    pub total_uploaded_bytes: i64,
    pub is_active: bool,
    pub channel_peer: Option<PeerRef>,
}

#[derive(Clone)]
pub struct BotPool {
    keystore: Arc<Keystore>,
    db: Arc<DbManager>,
    master_manager: Arc<TelegramClientManager>,
    session_dir: PathBuf,
    workers: Arc<RwLock<Vec<WorkerClient>>>,
    round_robin_idx: Arc<AtomicUsize>,
}

impl BotPool {
    /// Creates a new BotPool instance
    pub fn new(
        app_handle: &AppHandle,
        keystore: Arc<Keystore>,
        db: Arc<DbManager>,
        master_manager: Arc<TelegramClientManager>,
    ) -> Result<Self, AppError> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Keystore(format!("Failed to resolve app data dir: {e}")))?;

        let session_dir = app_dir.join("session").join("bots");
        if !session_dir.exists() {
            std::fs::create_dir_all(&session_dir)
                .map_err(|e| AppError::Io(format!("Failed to create bot session dir: {e}")))?;
        }

        Ok(Self {
            keystore,
            db,
            master_manager,
            session_dir,
            workers: Arc::new(RwLock::new(Vec::new())),
            round_robin_idx: Arc::new(AtomicUsize::new(0)),
        })
    }

    /// Resolves the storage channel PeerRef for a specific bot client using pure MTProto GetChannels
    pub async fn resolve_bot_channel_peer(client: &Client, channel_id: i64) -> Result<PeerRef, AppError> {
        let res = client
            .invoke(&tl::functions::channels::GetChannels {
                id: vec![tl::enums::InputChannel::Channel(tl::types::InputChannel {
                    channel_id,
                    access_hash: 0,
                })],
            })
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to resolve channel for bot: {e}")))?;

        match res {
            tl::enums::messages::Chats::Chats(c) => {
                if let Some(tl::enums::Chat::Channel(ch)) = c.chats.first() {
                    if let Some(hash) = ch.access_hash {
                        return Ok(PeerRef {
                            id: PeerId::channel_unchecked(channel_id),
                            auth: PeerAuth::from_hash(hash),
                        });
                    }
                }
                Err(AppError::Telegram("Storage channel returned no access hash for bot".into()))
            }
            _ => Err(AppError::Telegram("Unexpected response from GetChannels".into())),
        }
    }

    fn get_storage_channel_id(&self) -> Option<i64> {
        self.db
            .get_config("storage_channel_id")
            .ok()
            .flatten()
            .and_then(|s| s.parse().ok())
    }

    /// Initializes and authorizes all active worker bots previously stored in SQLite
    pub async fn initialize_from_db(&self) -> Result<(), AppError> {
        let creds = match self.keystore.load_credentials()? {
            Some(c) => c,
            None => return Ok(()), // Not yet logged in, skip until wizard finishes
        };

        let bot_records = self.db.list_active_bots()?;
        let channel_id_opt = self.get_storage_channel_id();
        let mut loaded_workers = Vec::new();

        for record in bot_records {
            let decrypted_token = match self.keystore.decrypt_value(&record.token_encrypted) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("Failed to decrypt token for bot {}: {e}", record.bot_id);
                    continue;
                }
            };

            let clean_id: String = record.bot_id.chars().filter(|c| c.is_alphanumeric() || *c == '_').collect();
            let session_path = self.session_dir.join(format!("bot_{clean_id}.session"));

            let session = match RusqliteSession::open(&session_path) {
                Ok(s) => Arc::new(s),
                Err(e) => {
                    eprintln!("Failed to open session for bot {}: {e}", record.bot_id);
                    continue;
                }
            };

            let pool = SenderPool::new(session, creds.api_id);
            let handle = pool.handle;
            tokio::spawn(pool.runner.run());

            let client = Client::new(handle);

            // Re-authenticate if session is new or needs sign in
            if let Ok(false) = client.is_authorized().await {
                if let Err(e) = client.bot_sign_in(&decrypted_token, &creds.api_hash).await {
                    eprintln!("Bot sign in failed for {}: {e}", record.bot_id);
                    continue;
                }
            }

            // Resolve bot-specific channel PeerRef with unique access_hash
            let channel_peer = if let Some(cid) = channel_id_opt {
                match Self::resolve_bot_channel_peer(&client, cid).await {
                    Ok(p) => {
                        eprintln!("Resolved storage channel peer for bot @{}", record.bot_username);
                        Some(p)
                    }
                    Err(e) => {
                        eprintln!("Could not resolve storage channel peer for bot @{}: {e}", record.bot_username);
                        None
                    }
                }
            } else {
                None
            };

            loaded_workers.push(WorkerClient {
                bot_id: record.bot_id,
                bot_username: record.bot_username,
                client,
                cooldown_until: record.cooldown_until,
                total_uploaded_bytes: record.total_uploaded_bytes,
                is_active: record.is_active == 1,
                channel_peer,
            });
        }

        let mut workers_guard = self.workers.write().await;
        *workers_guard = loaded_workers;
        Ok(())
    }

    /// Adds a new Worker Bot to the pool using MTProto Bot API login
    pub async fn add_worker_bot(&self, bot_token: &str) -> Result<WorkerBotInfo, AppError> {
        let clean_token = bot_token.trim().to_string();
        if clean_token.is_empty() || !clean_token.contains(':') {
            return Err(AppError::Validation("Invalid Telegram Bot token format. Expected <id>:<secret>".into()));
        }

        let creds = self
            .keystore
            .load_credentials()?
            .ok_or(AppError::AuthRequired)?;

        // Extract bot ID prefix from token
        let token_parts: Vec<&str> = clean_token.split(':').collect();
        let raw_bot_id = token_parts[0];
        let session_path = self.session_dir.join(format!("bot_{raw_bot_id}.session"));

        let session = Arc::new(
            RusqliteSession::open(&session_path)
                .map_err(|e| AppError::Telegram(format!("Failed to open bot session: {e}")))?,
        );

        let pool = SenderPool::new(session, creds.api_id);
        let handle = pool.handle;
        tokio::spawn(pool.runner.run());

        let client = Client::new(handle);

        // Authenticate bot over pure MTProto (no HTTP bot API cap)
        let bot_user = client
            .bot_sign_in(&clean_token, &creds.api_hash)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to sign in bot via MTProto: {e}")))?;

        let bot_id = bot_user.id().bare_id_unchecked().to_string();
        let bot_username = bot_user.username().unwrap_or("worker_bot").to_string();

        // Automatically promote this bot to Administrator in TeleCloud_Vault_Node
        if let Err(e) = self.master_manager.promote_bot_to_admin(&bot_username).await {
            eprintln!("Warning: Auto admin promotion for @{bot_username} failed: {e}. Channel might require manual admin rights.");
        }

        // Resolve bot's unique storage channel PeerRef with its own access_hash
        let channel_peer = if let Some(cid) = self.get_storage_channel_id() {
            Self::resolve_bot_channel_peer(&client, cid).await.ok()
        } else {
            None
        };

        // Encrypt bot token and persist in SQLite
        let token_encrypted = self.keystore.encrypt_value(&clean_token)?;
        let record = WorkerBotRecord {
            bot_id: bot_id.clone(),
            bot_username: bot_username.clone(),
            token_encrypted,
            cooldown_until: 0,
            total_uploaded_bytes: 0,
            is_active: 1,
        };
        self.db.upsert_worker_bot(&record)?;

        // Add to active memory pool
        let mut workers_guard = self.workers.write().await;
        // Remove existing instance if already present
        workers_guard.retain(|w| w.bot_id != bot_id);
        workers_guard.push(WorkerClient {
            bot_id: bot_id.clone(),
            bot_username: bot_username.clone(),
            client,
            cooldown_until: 0,
            total_uploaded_bytes: 0,
            is_active: true,
            channel_peer,
        });

        Ok(WorkerBotInfo {
            bot_id,
            bot_username,
            cooldown_until: 0,
            total_uploaded_bytes: 0,
            is_active: true,
            is_cooling_down: false,
            remaining_cooldown_secs: 0,
        })
    }

    /// Selects next available worker client using Round-Robin dispatch.
    /// Returns the Client, worker identifier, formatted username, and the matching channel PeerRef with valid access_hash.
    /// Skips any worker in FLOOD_WAIT cooldown.
    /// Falls back to the master user account if no bots are registered or if all are cooling down.
    pub async fn select_worker(&self) -> Result<(Client, String, String, PeerRef), AppError> {
        self.select_worker_excluding(&[]).await
    }

    /// Selects next available worker client, prioritizing bots not in `excluded_bot_ids`.
    pub async fn select_worker_excluding(&self, excluded_bot_ids: &[String]) -> Result<(Client, String, String, PeerRef), AppError> {
        let now = current_unix_timestamp();
        let workers_guard = self.workers.read().await;

        let mut available_indices: Vec<usize> = workers_guard
            .iter()
            .enumerate()
            .filter(|(_, w)| w.is_active && w.cooldown_until <= now && !excluded_bot_ids.contains(&w.bot_id))
            .map(|(idx, _)| idx)
            .collect();

        // If no non-excluded worker is available, fallback to any available active worker
        if available_indices.is_empty() {
            available_indices = workers_guard
                .iter()
                .enumerate()
                .filter(|(_, w)| w.is_active && w.cooldown_until <= now)
                .map(|(idx, _)| idx)
                .collect();
        }

        if !available_indices.is_empty() {
            let next_slot = self.round_robin_idx.fetch_add(1, Ordering::Relaxed) % available_indices.len();
            let selected_idx = available_indices[next_slot];
            let worker = &workers_guard[selected_idx];
            let formatted_username = if worker.bot_username.starts_with('@') {
                worker.bot_username.clone()
            } else {
                format!("@{}", worker.bot_username)
            };

            if let Some(ref peer) = worker.channel_peer {
                return Ok((worker.client.clone(), worker.bot_id.clone(), formatted_username, peer.clone()));
            }

            // If not cached yet, try to resolve on the fly
            let channel_id_opt = self.get_storage_channel_id();
            let client_clone = worker.client.clone();
            let bot_id_clone = worker.bot_id.clone();
            drop(workers_guard);

            if let Some(cid) = channel_id_opt {
                if let Ok(peer) = Self::resolve_bot_channel_peer(&client_clone, cid).await {
                    let mut write_guard = self.workers.write().await;
                    if let Some(w) = write_guard.iter_mut().find(|w| w.bot_id == bot_id_clone) {
                        w.channel_peer = Some(peer.clone());
                    }
                    return Ok((client_clone, bot_id_clone, formatted_username, peer));
                }
            }

            // Fallback to master's channel peer if resolving failed
            let master_peer = self.master_manager.resolve_storage_channel_peer_ref().await?;
            return Ok((client_clone, bot_id_clone, formatted_username, master_peer));
        }

        // If no worker bots configured or all are cooling down: gracefully fallback to master account
        let master_client = self.master_manager.get_client().await?;
        let master_peer = self.master_manager.resolve_storage_channel_peer_ref().await?;

        if workers_guard.is_empty() {
            return Ok((master_client, "master".to_string(), "Master Account".to_string(), master_peer));
        }

        if let Ok(master_client) = self.master_manager.get_client().await {
            return Ok((master_client, "master".to_string(), "Master Account".to_string(), master_peer));
        }

        // Compute shortest remaining cooldown for user notification
        let min_cooldown = workers_guard
            .iter()
            .filter(|w| w.is_active)
            .map(|w| w.cooldown_until)
            .min()
            .unwrap_or(now + 30);

        let wait_secs = if min_cooldown > now {
            (min_cooldown - now) as u64
        } else {
            1
        };

        Err(AppError::FloodWait(wait_secs))
    }

    /// Records FLOOD_WAIT cooldown against a specific worker bot (Rule 5: X + 2 seconds)
    pub async fn report_flood_wait(&self, bot_id: &str, wait_secs: u64) {
        let cooldown_until = calculate_cooldown_timestamp(wait_secs);
        {
            let mut workers_guard = self.workers.write().await;
            for worker in workers_guard.iter_mut() {
                if worker.bot_id == bot_id {
                    worker.cooldown_until = cooldown_until;
                    break;
                }
            }
        }

        if bot_id != "master" {
            let _ = self.db.update_bot_cooldown(bot_id, cooldown_until);
        }
    }

    /// Records uploaded bytes for statistics and pool accounting
    pub async fn report_bytes_uploaded(&self, bot_id: &str, bytes: i64) {
        {
            let mut workers_guard = self.workers.write().await;
            for worker in workers_guard.iter_mut() {
                if worker.bot_id == bot_id {
                    worker.total_uploaded_bytes += bytes;
                    break;
                }
            }
        }

        if bot_id != "master" {
            let _ = self.db.add_bot_uploaded_bytes(bot_id, bytes);
        }
    }

    /// Lists all worker bots with their real-time cooldown and upload statistics
    pub async fn list_workers(&self) -> Vec<WorkerBotInfo> {
        let now = current_unix_timestamp();
        let workers_guard = self.workers.read().await;

        workers_guard
            .iter()
            .map(|w| {
                let is_cooling = w.cooldown_until > now;
                let remaining = if is_cooling {
                    (w.cooldown_until - now) as u64
                } else {
                    0
                };

                WorkerBotInfo {
                    bot_id: w.bot_id.clone(),
                    bot_username: w.bot_username.clone(),
                    cooldown_until: w.cooldown_until,
                    total_uploaded_bytes: w.total_uploaded_bytes,
                    is_active: w.is_active,
                    is_cooling_down: is_cooling,
                    remaining_cooldown_secs: remaining,
                }
            })
            .collect()
    }

    /// Deactivates and removes a worker bot from pool
    pub async fn remove_worker(&self, bot_id: &str) -> Result<(), AppError> {
        {
            let mut workers_guard = self.workers.write().await;
            workers_guard.retain(|w| w.bot_id != bot_id);
        }

        self.db.delete_worker_bot(bot_id)?;
        Ok(())
    }

    /// Evaluates pool health against the 5-bot minimum rule
    pub async fn get_pool_health(&self) -> BotPoolHealth {
        let now = current_unix_timestamp();
        let workers_guard = self.workers.read().await;

        let total = workers_guard.len();
        let active = workers_guard.iter().filter(|w| w.is_active).count();
        let cooling = workers_guard.iter().filter(|w| w.is_active && w.cooldown_until > now).count();
        let satisfied = active >= MIN_BOTS_RULE_THRESHOLD;

        let recommendation = if satisfied {
            format!("Optimal: {active} worker bots active. Round-robin rotation absorbs flood limits seamlessly.")
        } else {
            format!(
                "Notice: {active}/{MIN_BOTS_RULE_THRESHOLD} worker bots active. Add {} more bot(s) to guarantee zero FLOOD_WAIT stalls and maximum streaming speeds.",
                MIN_BOTS_RULE_THRESHOLD.saturating_sub(active)
            )
        };

        BotPoolHealth {
            total_bots: total,
            active_bots: active,
            cooling_bots: cooling,
            min_rule_satisfied: satisfied,
            required_min_bots: MIN_BOTS_RULE_THRESHOLD,
            recommendation,
        }
    }
}
