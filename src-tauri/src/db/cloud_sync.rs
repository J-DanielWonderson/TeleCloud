use std::{
    fs::{self, File},
    io::{Read, Write},
    path::PathBuf,
    sync::{Arc, RwLock as StdRwLock},
};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use grammers_client::message::InputMessage;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

use crate::db::schema::{DbManager, FileChunkRecord, FileRecord, FolderRecord};
use crate::error::AppError;
use crate::telegram::bot_pool::BotPool;
use crate::telegram::client::TelegramClientManager;
use crate::telegram::flood_guard::current_unix_timestamp;
use crate::vault::keystore::Keystore;

pub const SNAPSHOT_FILE_NAME: &str = "vfs_index.db.gz";
pub const SNAPSHOT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerBotCloudRecord {
    pub bot_id: String,
    pub bot_username: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VfsCloudSnapshot {
    pub version: u32,
    pub created_at: i64,
    pub folders: Vec<FolderRecord>,
    pub files: Vec<FileRecord>,
    pub chunks: Vec<FileChunkRecord>,
    #[serde(default)]
    pub worker_bots: Option<Vec<WorkerBotCloudRecord>>,
    pub sha256_checksum: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_synced_message_id: Option<i64>,
    pub last_synced_at: Option<i64>,
    pub is_in_sync: bool,
}

#[derive(Clone)]
pub struct CloudSyncManager {
    db: Arc<DbManager>,
    telegram: Arc<TelegramClientManager>,
    keystore: Arc<Keystore>,
    cache_dir: PathBuf,
    bot_pool: Arc<StdRwLock<Option<Arc<BotPool>>>>,
}

impl CloudSyncManager {
    /// Initialize CloudSyncManager with application data cache directory
    pub fn new(
        app_handle: &AppHandle,
        db: Arc<DbManager>,
        telegram: Arc<TelegramClientManager>,
        keystore: Arc<Keystore>,
    ) -> Result<Self, AppError> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Io(format!("Failed to resolve app data dir: {e}")))?;

        let cache_dir = app_dir.join("cache");
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)
                .map_err(|e| AppError::Io(format!("Failed to create cache dir: {e}")))?;
        }

        Ok(Self {
            db,
            telegram,
            keystore,
            cache_dir,
            bot_pool: Arc::new(StdRwLock::new(None)),
        })
    }

    /// Connects the BotPool instance for automatic cloud-restored bot registration
    pub fn set_bot_pool(&self, bot_pool: Arc<BotPool>) {
        if let Ok(mut guard) = self.bot_pool.write() {
            *guard = Some(bot_pool);
        }
    }

    /// Retrieve local synchronization status
    pub fn get_sync_status(&self) -> Result<SyncStatus, AppError> {
        let last_msg_id = self
            .db
            .get_config("last_synced_message_id")?
            .and_then(|s| s.parse::<i64>().ok());

        let last_time = self
            .db
            .get_config("last_synced_at")?
            .and_then(|s| s.parse::<i64>().ok());

        Ok(SyncStatus {
            last_synced_message_id: last_msg_id,
            last_synced_at: last_time,
            is_in_sync: last_msg_id.is_some(),
        })
    }

    /// Exports local VFS, Gzip compresses, uploads to TeleCloud_Vault_Node channel, and pins message
    pub async fn push_vfs_index(&self) -> Result<i64, AppError> {
        let (folders, files, chunks) = self.db.export_vfs_snapshot()?;

        // Export active worker bots for cross-device synchronization
        let mut worker_bots = Vec::new();
        if let Ok(active_bots) = self.db.list_active_bots() {
            for b in active_bots {
                if let Ok(token) = self.keystore.decrypt_value(&b.token_encrypted) {
                    worker_bots.push(WorkerBotCloudRecord {
                        bot_id: b.bot_id,
                        bot_username: b.bot_username,
                        token,
                    });
                }
            }
        }

        // Calculate SHA-256 integrity hash of exported metadata (including worker bots)
        let raw_bytes = serde_json::to_vec(&(folders.clone(), files.clone(), chunks.clone(), worker_bots.clone()))?;
        let sha256_checksum = hex::encode(Sha256::digest(&raw_bytes));

        let snapshot = VfsCloudSnapshot {
            version: SNAPSHOT_VERSION,
            created_at: current_unix_timestamp(),
            folders,
            files,
            chunks,
            worker_bots: Some(worker_bots),
            sha256_checksum: sha256_checksum.clone(),
        };

        let snapshot_json = serde_json::to_vec(&snapshot)?;

        // Compress snapshot using Gzip
        let gz_path = self.cache_dir.join(SNAPSHOT_FILE_NAME);
        {
            let file = File::create(&gz_path)?;
            let mut encoder = GzEncoder::new(file, Compression::default());
            encoder.write_all(&snapshot_json)?;
            encoder.finish()?;
        }

        let client = self.telegram.get_client().await?;
        let peer_ref = self.telegram.resolve_storage_channel_peer_ref().await?;

        // Upload compressed archive over Telegram MTProto
        let uploaded = client
            .upload_file(&gz_path)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to upload VFS snapshot: {e}")))?;

        let caption = format!(
            "VFS_SYNC_SNAPSHOT | v{} | {} | sha256:{}",
            SNAPSHOT_VERSION,
            chrono::Utc::now().to_rfc3339(),
            sha256_checksum
        );

        // Send message with document attachment
        let message = client
            .send_message(peer_ref, InputMessage::default().text(&caption).document(uploaded))
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to send VFS snapshot message: {e}")))?;

        let msg_id = message.id();

        // Pin the latest snapshot message to the channel
        client
            .pin_message(peer_ref, msg_id)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to pin VFS snapshot message: {e}")))?;

        // Clean up temporary local compressed file
        let _ = fs::remove_file(&gz_path);

        // Update local database sync metadata
        self.db
            .set_config("last_synced_message_id", &msg_id.to_string())?;
        self.db
            .set_config("last_synced_at", &current_unix_timestamp().to_string())?;
        self.db.set_config("sync_version", &SNAPSHOT_VERSION.to_string())?;

        Ok(msg_id as i64)
    }

    /// Pulls and merges remote pinned VFS snapshot if newer than local database
    pub async fn pull_vfs_index(&self, force: bool) -> Result<bool, AppError> {
        let client = self.telegram.get_client().await?;
        let peer_ref = self.telegram.resolve_storage_channel_peer_ref().await?;

        // Retrieve pinned message in the storage channel
        let pinned = client
            .get_pinned_message(peer_ref)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to fetch pinned message: {e}")))?;

        let msg = match pinned {
            Some(m) => m,
            None => return Ok(false), // No snapshot pinned in channel yet
        };

        let remote_msg_id = msg.id() as i64;
        let local_msg_id = self
            .db
            .get_config("last_synced_message_id")?
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or(0);

        // If local is already up to date and force is not requested, skip
        if !force && remote_msg_id <= local_msg_id {
            return Ok(false);
        }

        let media = msg
            .media()
            .ok_or_else(|| AppError::Telegram("Pinned snapshot message has no attached media".into()))?;

        let download_path = self.cache_dir.join("remote_vfs_index.db.gz");

        // Download snapshot archive
        client
            .download_media(&media, &download_path)
            .await
            .map_err(|e| AppError::Telegram(format!("Failed to download remote VFS snapshot: {e}")))?;

        // Decompress and parse
        let decompressed_bytes = {
            let file = File::open(&download_path)?;
            let mut decoder = GzDecoder::new(file);
            let mut buffer = Vec::new();
            decoder.read_to_end(&mut buffer)?;
            buffer
        };

        // Remove temporary download file
        let _ = fs::remove_file(&download_path);

        let snapshot: VfsCloudSnapshot = serde_json::from_slice(&decompressed_bytes)?;

        // Merge snapshot into SQLite database atomically
        self.db
            .import_vfs_snapshot(&snapshot.folders, &snapshot.files, &snapshot.chunks)?;

        // Auto-register and restore worker bots on this device if any are present in the cloud snapshot
        if let Some(bots) = snapshot.worker_bots {
            let pool_opt = self.bot_pool.read().ok().and_then(|g| g.clone());
            if let Some(pool) = pool_opt {
                for b in bots {
                    let already_exists = self.db.get_worker_bot(&b.bot_id).ok().flatten().is_some();
                    if !already_exists {
                        eprintln!("Cloud sync: auto-registering worker bot @{} from cloud snapshot", b.bot_username);
                        if let Err(e) = pool.add_worker_bot(&b.token).await {
                            eprintln!("Failed to auto-register worker bot @{}: {e}", b.bot_username);
                        }
                    }
                }
            }
        }

        // Update local sync status
        self.db
            .set_config("last_synced_message_id", &remote_msg_id.to_string())?;
        self.db
            .set_config("last_synced_at", &current_unix_timestamp().to_string())?;

        Ok(true)
    }
}
