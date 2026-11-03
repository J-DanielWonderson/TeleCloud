use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::PathBuf,
    sync::{Arc, RwLock},
};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

const VAULT_FILE_NAME: &str = "telecloud.vault.enc";
const VAULT_SALT: &[u8] = b"TeleCloud-Vault-Secure-Master-Entropy-Salt-2026";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultCredentials {
    pub api_id: i32,
    pub api_hash: String,
    pub phone: String,
    #[serde(default)]
    pub session_bytes: Option<Vec<u8>>,
    #[serde(default)]
    pub storage_channel_id: Option<i64>,
    #[serde(default)]
    pub worker_bot_tokens: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone)]
pub struct Keystore {
    vault_path: PathBuf,
    derived_key: [u8; 32],
    cache: Arc<RwLock<Option<VaultCredentials>>>,
}

impl Keystore {
    /// Initialize the encrypted keystore using app data directory
    pub fn new(app_handle: &AppHandle) -> Result<Self, AppError> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Keystore(format!("Failed to resolve app data directory: {e}")))?;
        Self::from_path(app_dir)
    }

    pub fn from_path(app_dir: PathBuf) -> Result<Self, AppError> {
        let vault_dir = app_dir.join("vault");
        if !vault_dir.exists() {
            fs::create_dir_all(&vault_dir).map_err(|e| {
                AppError::Keystore(format!("Failed to create vault directory: {e}"))
            })?;
        }

        let vault_path = vault_dir.join(VAULT_FILE_NAME);
        let derived_key = Self::derive_machine_key(&app_dir)?;

        let keystore = Self {
            vault_path,
            derived_key,
            cache: Arc::new(RwLock::new(None)),
        };

        // If file exists, pre-load and cache credentials
        if keystore.vault_path.exists() {
            let _ = keystore.load_credentials()?;
        }

        Ok(keystore)
    }

    /// Derives an AES-256 machine-bound encryption key
    fn derive_machine_key(app_dir: &PathBuf) -> Result<[u8; 32], AppError> {
        let mut hasher = Sha256::new();
        hasher.update(VAULT_SALT);
        hasher.update(app_dir.to_string_lossy().as_bytes());

        // Machine-specific entropy (hostname / user identity)
        if let Ok(user) = std::env::var("USERNAME").or_else(|_| std::env::var("USER")) {
            hasher.update(user.as_bytes());
        }

        #[cfg(target_os = "windows")]
        {
            if let Ok(computer_name) = std::env::var("COMPUTERNAME") {
                hasher.update(computer_name.as_bytes());
            }
        }

        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result[..32]);
        Ok(key)
    }

    /// Check if vault credentials have been set up and exist
    pub fn is_configured(&self) -> bool {
        let guard = self.cache.read().unwrap();
        if guard.is_some() {
            return true;
        }
        drop(guard);
        self.vault_path.exists()
    }

    /// Load and decrypt credentials from the vault file
    pub fn load_credentials(&self) -> Result<Option<VaultCredentials>, AppError> {
        {
            let guard = self.cache.read().unwrap();
            if let Some(ref creds) = *guard {
                return Ok(Some(creds.clone()));
            }
        }

        if !self.vault_path.exists() {
            return Ok(None);
        }

        let mut file = File::open(&self.vault_path)
            .map_err(|e| AppError::Keystore(format!("Failed to open vault file: {e}")))?;

        let mut encrypted_payload = Vec::new();
        file.read_to_end(&mut encrypted_payload)
            .map_err(|e| AppError::Keystore(format!("Failed to read vault file: {e}")))?;

        if encrypted_payload.len() < 12 {
            return Err(AppError::Keystore("Encrypted vault file is corrupted".into()));
        }

        let (nonce_bytes, ciphertext) = encrypted_payload.split_at(12);
        let cipher = Aes256Gcm::new_from_slice(&self.derived_key)
            .map_err(|e| AppError::Keystore(format!("AES initialization error: {e}")))?;
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, Payload { msg: ciphertext, aad: VAULT_SALT })
            .map_err(|_| AppError::Keystore("Failed to decrypt vault: invalid key or corrupted data".into()))?;

        let creds: VaultCredentials = serde_json::from_slice(&plaintext)
            .map_err(|e| AppError::Keystore(format!("Failed to parse decrypted credentials: {e}")))?;

        let mut guard = self.cache.write().unwrap();
        *guard = Some(creds.clone());

        Ok(Some(creds))
    }

    /// Encrypt and persist credentials
    pub fn save_credentials(&self, creds: &VaultCredentials) -> Result<(), AppError> {
        let plaintext = serde_json::to_vec(creds)
            .map_err(|e| AppError::Keystore(format!("Failed to serialize credentials: {e}")))?;

        let cipher = Aes256Gcm::new_from_slice(&self.derived_key)
            .map_err(|e| AppError::Keystore(format!("AES initialization error: {e}")))?;

        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, Payload { msg: &plaintext, aad: VAULT_SALT })
            .map_err(|e| AppError::Keystore(format!("AES encryption error: {e}")))?;

        let mut payload = Vec::with_capacity(12 + ciphertext.len());
        payload.extend_from_slice(&nonce_bytes);
        payload.extend_from_slice(&ciphertext);

        let temp_path = self.vault_path.with_extension("tmp");
        {
            let mut file = File::create(&temp_path)
                .map_err(|e| AppError::Keystore(format!("Failed to create temporary vault file: {e}")))?;
            file.write_all(&payload)
                .map_err(|e| AppError::Keystore(format!("Failed to write vault payload: {e}")))?;
            file.sync_all()
                .map_err(|e| AppError::Keystore(format!("Failed to flush vault payload: {e}")))?;
        }

        fs::rename(&temp_path, &self.vault_path)
            .map_err(|e| AppError::Keystore(format!("Failed to commit vault file: {e}")))?;

        let mut guard = self.cache.write().unwrap();
        *guard = Some(creds.clone());

        Ok(())
    }

    /// Update the MTProto session bytes when Telegram refreshes it
    pub fn update_session(&self, session_bytes: Vec<u8>) -> Result<(), AppError> {
        let current = self.load_credentials()?;
        if let Some(mut creds) = current {
            creds.session_bytes = Some(session_bytes);
            creds.updated_at = chrono::Utc::now().timestamp();
            self.save_credentials(&creds)?;
            Ok(())
        } else {
            Err(AppError::Keystore("Cannot update session: credentials not found".into()))
        }
    }

    /// Update the provisioned storage channel ID
    pub fn update_storage_channel(&self, channel_id: i64) -> Result<(), AppError> {
        let current = self.load_credentials()?;
        if let Some(mut creds) = current {
            creds.storage_channel_id = Some(channel_id);
            creds.updated_at = chrono::Utc::now().timestamp();
            self.save_credentials(&creds)?;
            Ok(())
        } else {
            Err(AppError::Keystore("Cannot update storage channel: credentials not found".into()))
        }
    }

    /// Add a new worker bot token to the pool
    pub fn add_worker_bot_token(&self, token: String) -> Result<(), AppError> {
        let current = self.load_credentials()?;
        if let Some(mut creds) = current {
            if !creds.worker_bot_tokens.contains(&token) {
                creds.worker_bot_tokens.push(token);
                creds.updated_at = chrono::Utc::now().timestamp();
                self.save_credentials(&creds)?;
            }
            Ok(())
        } else {
            Err(AppError::Keystore("Cannot add bot token: credentials not found".into()))
        }
    }

    /// Remove a worker bot token
    pub fn remove_worker_bot_token(&self, token: &str) -> Result<(), AppError> {
        let current = self.load_credentials()?;
        if let Some(mut creds) = current {
            creds.worker_bot_tokens.retain(|t| t != token);
            creds.updated_at = chrono::Utc::now().timestamp();
            self.save_credentials(&creds)?;
            Ok(())
        } else {
            Err(AppError::Keystore("Cannot remove bot token: credentials not found".into()))
        }
    }

    /// Wipe credentials on logout
    pub fn wipe(&self) -> Result<(), AppError> {
        if self.vault_path.exists() {
            fs::remove_file(&self.vault_path)
                .map_err(|e| AppError::Keystore(format!("Failed to delete vault file: {e}")))?;
        }
        let mut guard = self.cache.write().unwrap();
        *guard = None;
        Ok(())
    }

    /// Encrypt an arbitrary string value (e.g. worker bot token) with AES-256-GCM
    pub fn encrypt_value(&self, value: &str) -> Result<String, AppError> {
        let cipher = Aes256Gcm::new_from_slice(&self.derived_key)
            .map_err(|e| AppError::Keystore(format!("AES initialization error: {e}")))?;

        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, Payload { msg: value.as_bytes(), aad: VAULT_SALT })
            .map_err(|e| AppError::Keystore(format!("AES encryption error: {e}")))?;

        let mut payload = Vec::with_capacity(12 + ciphertext.len());
        payload.extend_from_slice(&nonce_bytes);
        payload.extend_from_slice(&ciphertext);

        Ok(hex::encode(payload))
    }

    /// Decrypt an arbitrary AES-256-GCM hex string value
    pub fn decrypt_value(&self, encrypted_hex: &str) -> Result<String, AppError> {
        let payload = hex::decode(encrypted_hex)
            .map_err(|e| AppError::Keystore(format!("Hex decode error: {e}")))?;

        if payload.len() < 12 {
            return Err(AppError::Keystore("Encrypted payload too short".into()));
        }

        let (nonce_bytes, ciphertext) = payload.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        let cipher = Aes256Gcm::new_from_slice(&self.derived_key)
            .map_err(|e| AppError::Keystore(format!("AES initialization error: {e}")))?;

        let plaintext = cipher
            .decrypt(nonce, Payload { msg: ciphertext, aad: VAULT_SALT })
            .map_err(|e| AppError::Keystore(format!("AES decryption error: {e}")))?;

        String::from_utf8(plaintext)
            .map_err(|e| AppError::Keystore(format!("UTF-8 decode error: {e}")))
    }
}
