use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

const VAULT_FILE_NAME: &str = "telecloud.vault.enc";
const KEY_FILE_NAME: &str = "telecloud.key";
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
    app_dir: PathBuf,
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

    /// Safe fallback keystore that allows the app to operate cleanly in unconfigured state
    pub fn fallback() -> Self {
        let temp = std::env::temp_dir().join("telecloud_vault_fallback");
        let _ = fs::create_dir_all(&temp);
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        Self {
            app_dir: temp.clone(),
            vault_path: temp.join(VAULT_FILE_NAME),
            derived_key: key,
            cache: Arc::new(RwLock::new(None)),
        }
    }

    pub fn from_path(app_dir: PathBuf) -> Result<Self, AppError> {
        let vault_dir = app_dir.join("vault");
        if !vault_dir.exists() {
            if let Err(e) = fs::create_dir_all(&vault_dir) {
                let msg = format!("Failed to create vault directory at {}: {e}", vault_dir.display());
                crate::android_bridge::log_to_file("KEYSTORE", &msg);
                return Err(AppError::Keystore(msg));
            }
        }

        let vault_path = vault_dir.join(VAULT_FILE_NAME);
        let derived_key = Self::get_or_create_vault_key(&vault_dir, &app_dir);

        let keystore = Self {
            app_dir,
            vault_path,
            derived_key,
            cache: Arc::new(RwLock::new(None)),
        };

        // If file exists, pre-load and cache credentials.
        // If decryption/parsing fails, load_credentials renames the corrupt file and returns Ok(None).
        if keystore.vault_path.exists() {
            let _ = keystore.load_credentials();
        }

        Ok(keystore)
    }

    /// Resolves the random 32-byte key file in the vault directory.
    /// If missing, checks for an existing legacy vault to decrypt with environment derivation and migrate.
    /// Otherwise, generates a fresh random 32-byte key file.
    fn get_or_create_vault_key(vault_dir: &Path, app_dir: &Path) -> [u8; 32] {
        let key_path = vault_dir.join(KEY_FILE_NAME);
        if key_path.exists() {
            if let Ok(data) = fs::read(&key_path) {
                if data.len() >= 32 {
                    let mut key = [0u8; 32];
                    key.copy_from_slice(&data[..32]);
                    return key;
                }
            }
        }

        let vault_path = vault_dir.join(VAULT_FILE_NAME);
        let legacy_key = Self::derive_legacy_machine_key(app_dir);

        // If legacy vault exists without a key file, attempt migration using the legacy env derivation
        if vault_path.exists() {
            if let Ok(payload) = fs::read(&vault_path) {
                if let Ok(creds) = Self::decrypt_payload_raw(&payload, &legacy_key) {
                    let mut new_key = [0u8; 32];
                    rand::thread_rng().fill_bytes(&mut new_key);
                    if fs::write(&key_path, &new_key).is_ok() {
                        if let Ok(new_payload) = Self::encrypt_payload_raw(&creds, &new_key) {
                            let _ = fs::write(&vault_path, &new_payload);
                            let msg = "Migrated existing vault from legacy env-derived key to new 32-byte key file.";
                            eprintln!("[KEYSTORE] {msg}");
                            crate::android_bridge::log_to_file("KEYSTORE", msg);
                            return new_key;
                        }
                    }
                } else {
                    // Legacy vault decryption failed during key migration; rename corrupt file
                    let ts = chrono::Utc::now().timestamp();
                    let corrupt_name = format!("{}.corrupt-{}", VAULT_FILE_NAME, ts);
                    let corrupt_path = vault_dir.join(&corrupt_name);
                    let _ = fs::rename(&vault_path, &corrupt_path);
                    let msg = format!(
                        "Existing vault could not be decrypted during key migration. Renamed to {}. Continuing as not configured.",
                        corrupt_path.display()
                    );
                    eprintln!("[KEYSTORE] {msg}");
                    crate::android_bridge::log_to_file("KEYSTORE", &msg);
                }
            }
        }

        // Clean install or after corrupt rename: generate fresh random 32-byte key
        let mut new_key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut new_key);
        if let Err(e) = fs::write(&key_path, &new_key) {
            let msg = format!("Warning: failed to persist key file at {}: {e}", key_path.display());
            eprintln!("[KEYSTORE] {msg}");
            crate::android_bridge::log_to_file("KEYSTORE", &msg);
        }
        new_key
    }

    /// Legacy env-var based key derivation (USER/USERNAME/COMPUTERNAME) kept strictly as fallback
    fn derive_legacy_machine_key(app_dir: &Path) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(VAULT_SALT);
        hasher.update(app_dir.to_string_lossy().as_bytes());

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
        key
    }

    fn decrypt_payload_raw(payload: &[u8], key: &[u8; 32]) -> Result<VaultCredentials, AppError> {
        if payload.len() < 12 {
            return Err(AppError::Keystore("Encrypted payload too short".into()));
        }

        let (nonce_bytes, ciphertext) = payload.split_at(12);
        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|e| AppError::Keystore(format!("AES initialization error: {e}")))?;
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, Payload { msg: ciphertext, aad: VAULT_SALT })
            .map_err(|_| AppError::Keystore("Failed to decrypt vault: invalid key or corrupted data".into()))?;

        let creds: VaultCredentials = serde_json::from_slice(&plaintext)
            .map_err(|e| AppError::Keystore(format!("Failed to parse decrypted credentials: {e}")))?;

        Ok(creds)
    }

    fn encrypt_payload_raw(creds: &VaultCredentials, key: &[u8; 32]) -> Result<Vec<u8>, AppError> {
        let plaintext = serde_json::to_vec(creds)
            .map_err(|e| AppError::Keystore(format!("Failed to serialize credentials: {e}")))?;

        let cipher = Aes256Gcm::new_from_slice(key)
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
        Ok(payload)
    }

    fn handle_corrupted_vault(&self, reason: &str) {
        let ts = chrono::Utc::now().timestamp();
        let corrupt_name = format!("{}.corrupt-{}", VAULT_FILE_NAME, ts);
        let corrupt_path = self.vault_path.with_file_name(&corrupt_name);
        let _ = fs::rename(&self.vault_path, &corrupt_path);
        let msg = format!(
            "Vault corruption detected ({reason}). Renamed to {}. Continuing as not configured.",
            corrupt_path.display()
        );
        eprintln!("[KEYSTORE] {msg}");
        crate::android_bridge::log_to_file("KEYSTORE", &msg);
        let mut guard = self.cache.write().unwrap_or_else(|p| p.into_inner());
        *guard = None;
    }

    /// Check if vault credentials have been set up and exist
    pub fn is_configured(&self) -> bool {
        let guard = self.cache.read().unwrap_or_else(|p| p.into_inner());
        if guard.is_some() {
            return true;
        }
        drop(guard);
        self.vault_path.exists()
    }

    /// Load and decrypt credentials from the vault file.
    /// If decryption or parsing fails, renames the corrupt file and continues as unconfigured.
    pub fn load_credentials(&self) -> Result<Option<VaultCredentials>, AppError> {
        {
            let guard = self.cache.read().unwrap_or_else(|p| p.into_inner());
            if let Some(ref creds) = *guard {
                return Ok(Some(creds.clone()));
            }
        }

        if !self.vault_path.exists() {
            return Ok(None);
        }

        let encrypted_payload = match fs::read(&self.vault_path) {
            Ok(p) => p,
            Err(e) => {
                let msg = format!("Failed to read vault file: {e}");
                crate::android_bridge::log_to_file("KEYSTORE", &msg);
                return Err(AppError::Keystore(msg));
            }
        };

        if encrypted_payload.len() < 12 {
            self.handle_corrupted_vault("payload size < 12 bytes");
            return Ok(None);
        }

        // Try decrypting with current 32-byte key
        let creds = match Self::decrypt_payload_raw(&encrypted_payload, &self.derived_key) {
            Ok(c) => c,
            Err(primary_err) => {
                // Fallback attempt: decrypt using legacy machine key
                let legacy_key = Self::derive_legacy_machine_key(&self.app_dir);
                match Self::decrypt_payload_raw(&encrypted_payload, &legacy_key) {
                    Ok(c) => {
                        let msg = "Vault decrypted with legacy key fallback. Migrating to primary key...";
                        eprintln!("[KEYSTORE] {msg}");
                        crate::android_bridge::log_to_file("KEYSTORE", msg);
                        let _ = self.save_credentials(&c);
                        c
                    }
                    Err(_) => {
                        self.handle_corrupted_vault(&format!("decrypt failed: {primary_err}"));
                        return Ok(None);
                    }
                }
            }
        };

        let mut guard = self.cache.write().unwrap_or_else(|p| p.into_inner());
        *guard = Some(creds.clone());

        Ok(Some(creds))
    }

    /// Encrypt and persist credentials
    pub fn save_credentials(&self, creds: &VaultCredentials) -> Result<(), AppError> {
        let payload = Self::encrypt_payload_raw(creds, &self.derived_key)?;

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

        let mut guard = self.cache.write().unwrap_or_else(|p| p.into_inner());
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
        let key_path = self.vault_path.with_file_name(KEY_FILE_NAME);
        if key_path.exists() {
            let _ = fs::remove_file(key_path);
        }
        let mut guard = self.cache.write().unwrap_or_else(|p| p.into_inner());
        *guard = None;
        Ok(())
    }

    /// Encrypt an arbitrary string value with AES-256-GCM
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

    /// Decrypt an arbitrary AES-256-GCM hex string value (with legacy fallback)
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

        let plaintext = match cipher.decrypt(nonce, Payload { msg: ciphertext, aad: VAULT_SALT }) {
            Ok(pt) => pt,
            Err(_) => {
                let legacy_key = Self::derive_legacy_machine_key(&self.app_dir);
                let legacy_cipher = Aes256Gcm::new_from_slice(&legacy_key)
                    .map_err(|e| AppError::Keystore(format!("AES initialization error: {e}")))?;
                legacy_cipher
                    .decrypt(nonce, Payload { msg: ciphertext, aad: VAULT_SALT })
                    .map_err(|e| AppError::Keystore(format!("AES decryption error: {e}")))?
            }
        };

        String::from_utf8(plaintext)
            .map_err(|e| AppError::Keystore(format!("UTF-8 decode error: {e}")))
    }
}
