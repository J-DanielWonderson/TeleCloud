use std::{
    collections::HashMap,
    io::{self, SeekFrom},
    path::Path,
    pin::Pin,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    task::{Context, Poll},
    time::Instant,
};
use grammers_client::message::InputMessage;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use tokio::{
    fs::File,
    io::{AsyncRead, AsyncReadExt, AsyncSeekExt, BufReader, ReadBuf},
    sync::{mpsc, RwLock},
};

use crate::db::cloud_sync::CloudSyncManager;
use crate::db::schema::{DbManager, FileChunkRecord, FileRecord};
use crate::error::AppError;
use crate::telegram::bot_pool::BotPool;
use crate::telegram::client::TelegramClientManager;
use crate::telegram::flood_guard::{extract_flood_wait_secs, inject_jitter, parse_flood_wait_from_str};

pub const DEFAULT_CHUNK_SIZE_BYTES: i64 = 262_144_000; // 250 MB
pub const PROGRESS_EVENT_NAME: &str = "transfer://progress";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadProgressPayload {
    pub file_id: String,
    pub file_name: String,
    pub chunk_index: i64,
    pub total_chunks: i64,
    pub bytes_transferred_chunk: u64,
    pub total_chunk_bytes: u64,
    pub bytes_transferred_file: u64,
    pub total_file_bytes: u64,
    pub speed_bytes_per_sec: f64,
    pub active_worker: String,
    pub status: String, // 'UPLOADING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct UploadControl {
    pub is_paused: Arc<AtomicBool>,
    pub is_cancelled: Arc<AtomicBool>,
    worker_abort_handles: Arc<tokio::sync::Mutex<Vec<tokio::task::AbortHandle>>>,
    coordinator_abort_handle: Arc<tokio::sync::Mutex<Option<tokio::task::AbortHandle>>>,
}

impl UploadControl {
    pub fn new() -> Self {
        Self {
            is_paused: Arc::new(AtomicBool::new(false)),
            is_cancelled: Arc::new(AtomicBool::new(false)),
            worker_abort_handles: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            coordinator_abort_handle: Arc::new(tokio::sync::Mutex::new(None)),
        }
    }

    pub async fn add_worker_abort_handle(&self, handle: tokio::task::AbortHandle) {
        self.worker_abort_handles.lock().await.push(handle);
    }

    pub async fn set_coordinator_abort_handle(&self, handle: tokio::task::AbortHandle) {
        *self.coordinator_abort_handle.lock().await = Some(handle);
    }

    pub async fn abort_workers(&self) {
        let handles = self.worker_abort_handles.lock().await;
        for handle in handles.iter() {
            handle.abort();
        }
    }

    pub async fn abort_all(&self) {
        self.abort_workers().await;
        if let Some(handle) = self.coordinator_abort_handle.lock().await.as_ref() {
            handle.abort();
        }
    }
}

pub struct HashingProgressReader<R: AsyncRead + Unpin> {
    inner: R,
    hasher: Sha256,
    bytes_read: usize,
    chunk_progress_tx: Option<mpsc::UnboundedSender<usize>>,
    is_cancelled: Arc<AtomicBool>,
    is_paused: Arc<AtomicBool>,
}

impl<R: AsyncRead + Unpin> HashingProgressReader<R> {
    pub fn new(
        inner: R,
        chunk_progress_tx: Option<mpsc::UnboundedSender<usize>>,
        is_cancelled: Arc<AtomicBool>,
        is_paused: Arc<AtomicBool>,
    ) -> Self {
        Self {
            inner,
            hasher: Sha256::new(),
            bytes_read: 0,
            chunk_progress_tx,
            is_cancelled,
            is_paused,
        }
    }

    pub fn close_progress(&mut self) {
        self.chunk_progress_tx.take();
    }

    pub fn finalize_sha256(self) -> String {
        hex::encode(self.hasher.finalize())
    }

    pub fn bytes_read(&self) -> usize {
        self.bytes_read
    }
}

impl<R: AsyncRead + Unpin> AsyncRead for HashingProgressReader<R> {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if self.is_cancelled.load(Ordering::Relaxed) {
            return Poll::Ready(Err(io::Error::new(
                io::ErrorKind::Interrupted,
                "Upload cancelled by user",
            )));
        }
        if self.is_paused.load(Ordering::Relaxed) {
            return Poll::Ready(Err(io::Error::new(
                io::ErrorKind::Interrupted,
                "Upload paused by user",
            )));
        }

        let prev_len = buf.filled().len();
        match Pin::new(&mut self.inner).poll_read(cx, buf) {
            Poll::Ready(Ok(())) => {
                let newly_read = &buf.filled()[prev_len..];
                if !newly_read.is_empty() {
                    self.hasher.update(newly_read);
                    self.bytes_read += newly_read.len();
                    if let Some(ref tx) = self.chunk_progress_tx {
                        let _ = tx.send(newly_read.len());
                    }
                } else if buf.remaining() > 0 {
                    // EOF reached: close the progress sender
                    self.chunk_progress_tx.take();
                }
                Poll::Ready(Ok(()))
            }
            other => other,
        }
    }
}

struct ActiveChunkProgress {
    bytes_transferred: u64,
    _total_bytes: u64,
    worker_name: String,
}

struct SharedUploadState {
    active_chunks: HashMap<i64, ActiveChunkProgress>,
    cumulative_bytes: u64,
    total_file_bytes: u64,
    last_emit: Instant,
    last_bytes: u64,
    current_speed: f64,
}

async fn emit_aggregate_progress(
    app_handle: &AppHandle,
    state: &tokio::sync::Mutex<SharedUploadState>,
    file_id: &str,
    file_name: &str,
    total_chunks: i64,
    force: bool,
) {
    let mut s = state.lock().await;
    let now = Instant::now();
    let elapsed = now.duration_since(s.last_emit).as_millis();
    if !force && elapsed < 200 {
        return;
    }

    let active_bytes: u64 = s.active_chunks.values().map(|c| c.bytes_transferred).sum();
    let current_total_bytes = (s.cumulative_bytes + active_bytes).min(s.total_file_bytes);

    let delta_secs = now.duration_since(s.last_emit).as_secs_f64();
    let delta_bytes = if current_total_bytes >= s.last_bytes {
        (current_total_bytes - s.last_bytes) as f64
    } else {
        0.0
    };

    let instant_speed = if delta_secs > 0.0 { delta_bytes / delta_secs } else { 0.0 };

    s.current_speed = if s.current_speed == 0.0 {
        instant_speed
    } else {
        s.current_speed * 0.7 + instant_speed * 0.3
    };

    s.last_emit = now;
    s.last_bytes = current_total_bytes;

    let mut names: Vec<String> = s.active_chunks.values().map(|c| c.worker_name.clone()).collect();
    names.sort();
    names.dedup();

    let active_worker_str = if names.is_empty() {
        "none".to_string()
    } else if names.len() == 1 {
        format!("1 Bot: {}", names[0])
    } else {
        format!("{} Bots: {}", names.len(), names.join(", "))
    };

    let min_chunk_idx = s.active_chunks.keys().min().copied().unwrap_or(0);

    let _ = app_handle.emit(
        PROGRESS_EVENT_NAME,
        UploadProgressPayload {
            file_id: file_id.to_string(),
            file_name: file_name.to_string(),
            chunk_index: min_chunk_idx,
            total_chunks,
            bytes_transferred_chunk: active_bytes,
            total_chunk_bytes: s.total_file_bytes,
            bytes_transferred_file: current_total_bytes,
            total_file_bytes: s.total_file_bytes,
            speed_bytes_per_sec: s.current_speed,
            active_worker: active_worker_str,
            status: "UPLOADING".into(),
            error: None,
        },
    );

    let percent = if s.total_file_bytes > 0 {
        ((current_total_bytes as f64 / s.total_file_bytes as f64) * 100.0) as i32
    } else {
        0
    };
    let speed_mb = s.current_speed / (1024.0 * 1024.0);
    let speed_text = if speed_mb >= 1.0 {
        format!("{:.1} MB/s", speed_mb)
    } else {
        format!("{:.0} KB/s", s.current_speed / 1024.0)
    };
    let notif_content = format!("{percent}% • {speed_text} • Chunk {}/{}", min_chunk_idx + 1, total_chunks);
    crate::android_bridge::update_transfer_notification(
        crate::android_bridge::get_notif_id(file_id),
        &format!("Uploading {file_name}"),
        &notif_content,
        percent,
        100,
        true,
    );
}

#[derive(Clone)]
pub struct ChunkUploaderManager {
    db: Arc<DbManager>,
    bot_pool: Arc<BotPool>,
    cloud_sync: Arc<CloudSyncManager>,
    _telegram: Arc<TelegramClientManager>,
    controls: Arc<RwLock<HashMap<String, UploadControl>>>,
}

impl ChunkUploaderManager {
    pub fn new(
        db: Arc<DbManager>,
        bot_pool: Arc<BotPool>,
        cloud_sync: Arc<CloudSyncManager>,
        telegram: Arc<TelegramClientManager>,
    ) -> Self {
        Self {
            db,
            bot_pool,
            cloud_sync,
            _telegram: telegram,
            controls: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Initiates a multi-part file upload with virtual byte-slicing
    pub async fn start_upload(
        &self,
        app_handle: AppHandle,
        file_path_str: &str,
        folder_id: Option<String>,
    ) -> Result<FileRecord, AppError> {
        let path = Path::new(file_path_str);
        if !path.exists() || !path.is_file() {
            return Err(AppError::Validation(format!("File does not exist: {file_path_str}")));
        }

        let metadata = std::fs::metadata(path)
            .map_err(|e| AppError::Io(format!("Failed to read metadata: {e}")))?;
        let total_size = metadata.len() as i64;
        let file_name = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unnamed_file")
            .to_string();

        let mime_type = detect_mime_type(path);

        // Retrieve configured chunk size (default 250 MB)
        let chunk_size = self
            .db
            .get_config("chunk_size_bytes")?
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or(DEFAULT_CHUNK_SIZE_BYTES);

        let total_chunks = if total_size == 0 {
            1
        } else {
            (total_size + chunk_size - 1) / chunk_size
        };

        let file_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        let file_record = FileRecord {
            id: file_id.clone(),
            folder_id,
            name: file_name.clone(),
            total_size_bytes: total_size,
            mime_type,
            full_sha256: None,
            total_chunks,
            status: "UPLOADING".to_string(),
            created_at: now,
            updated_at: now,
            is_trashed: 0,
        };

        self.db.create_file(&file_record)?;

        // Pre-create virtual chunk metadata without physical disk splitting
        let mut chunks = Vec::with_capacity(total_chunks as usize);
        for idx in 0..total_chunks {
            let offset = idx * chunk_size;
            let length = if offset + chunk_size > total_size {
                total_size - offset
            } else {
                chunk_size
            };

            chunks.push(FileChunkRecord {
                id: uuid::Uuid::new_v4().to_string(),
                file_id: file_id.clone(),
                chunk_index: idx,
                byte_offset: offset,
                byte_length: length,
                telegram_message_id: None,
                chunk_sha256: None,
                upload_status: "PENDING".to_string(),
            });
        }

        self.db.insert_chunks_batch(&chunks)?;

        let control = UploadControl::new();

        {
            let mut controls = self.controls.write().await;
            controls.insert(file_id.clone(), control.clone());
        }

        let notification_id = crate::android_bridge::get_notif_id(&file_id);
        crate::android_bridge::update_transfer_notification(
            notification_id,
            &format!("Uploading {file_name}"),
            "Preparing upload",
            0,
            0,
            true,
        );

        // Spawn async upload worker
        let self_clone = self.clone();
        let file_id_clone = file_id.clone();
        let path_buf = path.to_path_buf();
        let ctrl_clone = control.clone();
        let notification_name = file_name.clone();

        let process_task = tokio::spawn(async move {
            if let Err(e) = self_clone
                .process_file_upload(app_handle, file_id_clone, path_buf, ctrl_clone)
                .await
            {
                eprintln!("Upload pipeline error: {e}");
                crate::android_bridge::update_transfer_notification(
                    notification_id,
                    &format!("Upload failed: {notification_name}"),
                    &e.to_string(),
                    0,
                    0,
                    false,
                );
            }
        });
        control
            .set_coordinator_abort_handle(process_task.abort_handle())
            .await;
        // Dropping a JoinHandle detaches the coordinator; the explicit handle
        // above is reserved for cancellation, while pause only stops workers.
        drop(process_task);

        Ok(file_record)
    }

    /// Pause an active file upload immediately
    pub async fn pause_upload(&self, app_handle: &AppHandle, file_id: &str) -> Result<(), AppError> {
        let file_record = self.db.get_file(file_id)?;
        let file_name = file_record.as_ref().map(|f| f.name.clone()).unwrap_or_else(|| "File".to_string());
        let total_chunks = file_record.as_ref().map(|f| f.total_chunks).unwrap_or(1);
        let total_size = file_record.as_ref().map(|f| f.total_size_bytes as u64).unwrap_or(0);

        let uploaded_bytes: u64 = if let Ok(chunks) = self.db.get_chunks_for_file(file_id) {
            chunks
                .iter()
                .filter(|c| c.upload_status == "UPLOADED" || c.upload_status == "VERIFIED")
                .map(|c| c.byte_length as u64)
                .sum()
        } else {
            0
        };

        let control = self.controls.write().await.remove(file_id);
        if let Some(ctrl) = control {
            ctrl.is_paused.store(true, Ordering::Relaxed);
            ctrl.abort_all().await;
        }
        self.db.update_file_status(file_id, "PAUSED", None)?;

        let _ = app_handle.emit(
            PROGRESS_EVENT_NAME,
            UploadProgressPayload {
                file_id: file_id.to_string(),
                file_name: file_name.clone(),
                chunk_index: 0,
                total_chunks,
                bytes_transferred_chunk: 0,
                total_chunk_bytes: 0,
                bytes_transferred_file: uploaded_bytes,
                total_file_bytes: total_size,
                speed_bytes_per_sec: 0.0,
                active_worker: "none".into(),
                status: "PAUSED".into(),
                error: None,
            },
        );

        crate::android_bridge::update_transfer_notification(
            crate::android_bridge::get_notif_id(file_id),
            &format!("Upload Paused: {file_name}"),
            "Transfer paused",
            0,
            100,
            false,
        );

        Ok(())
    }

    /// Resume a previously paused upload
    pub async fn resume_upload(
        &self,
        app_handle: AppHandle,
        file_id: &str,
        file_path_str: &str,
    ) -> Result<(), AppError> {
        let path = Path::new(file_path_str).to_path_buf();
        if !path.exists() {
            return Err(AppError::Validation(format!("File not found: {file_path_str}")));
        }

        let control = UploadControl::new();

        {
            let mut controls = self.controls.write().await;
            controls.insert(file_id.to_string(), control.clone());
        }

        self.db.update_file_status(file_id, "UPLOADING", None)?;

        let notification_id = crate::android_bridge::get_notif_id(file_id);
        let notification_name = self
            .db
            .get_file(file_id)
            .ok()
            .flatten()
            .map(|record| record.name)
            .unwrap_or_else(|| "File".to_string());
        crate::android_bridge::update_transfer_notification(
            notification_id,
            &format!("Uploading {notification_name}"),
            "Resuming upload",
            0,
            0,
            true,
        );

        let self_clone = self.clone();
        let file_id_string = file_id.to_string();
        let ctrl_clone = control.clone();
        let notification_name = notification_name.clone();

        let process_task = tokio::spawn(async move {
            if let Err(e) = self_clone
                .process_file_upload(app_handle, file_id_string, path, ctrl_clone)
                .await
            {
                eprintln!("Resume upload error: {e}");
                crate::android_bridge::update_transfer_notification(
                    notification_id,
                    &format!("Upload failed: {notification_name}"),
                    &e.to_string(),
                    0,
                    0,
                    false,
                );
            }
        });
        control
            .set_coordinator_abort_handle(process_task.abort_handle())
            .await;
        drop(process_task);

        Ok(())
    }

    /// Cancel and remove an ongoing upload immediately
    pub async fn cancel_upload(&self, app_handle: &AppHandle, file_id: &str) -> Result<(), AppError> {
        let file_record = self.db.get_file(file_id)?;
        let file_name = file_record.as_ref().map(|f| f.name.clone()).unwrap_or_else(|| "File".to_string());
        let total_chunks = file_record.as_ref().map(|f| f.total_chunks).unwrap_or(1);
        let total_size = file_record.as_ref().map(|f| f.total_size_bytes as u64).unwrap_or(0);

        let control = self.controls.write().await.remove(file_id);
        if let Some(ctrl) = control {
            ctrl.is_cancelled.store(true, Ordering::Relaxed);
            ctrl.abort_all().await;
        }

        self.db.delete_file_permanent(file_id)?;

        let _ = app_handle.emit(
            PROGRESS_EVENT_NAME,
            UploadProgressPayload {
                file_id: file_id.to_string(),
                file_name: file_name.clone(),
                chunk_index: 0,
                total_chunks,
                bytes_transferred_chunk: 0,
                total_chunk_bytes: 0,
                bytes_transferred_file: 0,
                total_file_bytes: total_size,
                speed_bytes_per_sec: 0.0,
                active_worker: "none".into(),
                status: "CANCELLED".into(),
                error: None,
            },
        );

        crate::android_bridge::cancel_notification(crate::android_bridge::get_notif_id(file_id));

        Ok(())
    }

    /// Main streaming upload loop: slices virtually, streams with 8MB buffer,
    /// hashes on the fly, respects anti-flood cooldowns, and syncs VFS.
    /// Supports multi-bot parallel chunk uploading across distinct worker bots.
    async fn process_file_upload(
        &self,
        app_handle: AppHandle,
        file_id: String,
        file_path: std::path::PathBuf,
        control: UploadControl,
    ) -> Result<(), AppError> {
        let file_record = self
            .db
            .get_file(&file_id)?
            .ok_or_else(|| AppError::FileNotFound(file_id.clone()))?;

        let pending_chunks = self.db.get_pending_chunks_for_file(&file_id)?;

        // Calculate already uploaded bytes for cumulative file progress
        let all_chunks = self.db.get_chunks_for_file(&file_id)?;
        let cumulative_file_bytes: u64 = all_chunks
            .iter()
            .filter(|c| c.upload_status == "UPLOADED" || c.upload_status == "VERIFIED")
            .map(|c| c.byte_length as u64)
            .sum();

        let total_file_bytes = file_record.total_size_bytes as u64;

        if pending_chunks.is_empty() {
            self.db.update_file_status(&file_id, "READY", None)?;
            self.controls.write().await.remove(&file_id);
            let _ = self.cloud_sync.push_vfs_index().await;
            let _ = app_handle.emit(
                PROGRESS_EVENT_NAME,
                UploadProgressPayload {
                    file_id: file_id.clone(),
                    file_name: file_record.name.clone(),
                    chunk_index: file_record.total_chunks - 1,
                    total_chunks: file_record.total_chunks,
                    bytes_transferred_chunk: 0,
                    total_chunk_bytes: 0,
                    bytes_transferred_file: total_file_bytes,
                    total_file_bytes,
                    speed_bytes_per_sec: 0.0,
                    active_worker: "completed".into(),
                    status: "COMPLETED".into(),
                    error: None,
                },
            );
            return Ok(());
        }

        // Determine parallel upload concurrency based on available worker bots in the pool
        let pool_health = self.bot_pool.get_pool_health().await;
        let concurrency = if pool_health.active_bots >= 2 && pending_chunks.len() >= 2 {
            2
        } else {
            1
        };

        let pending_queue = Arc::new(tokio::sync::Mutex::new(pending_chunks));
        let leased_bots = Arc::new(tokio::sync::Mutex::new(Vec::<String>::new()));
        let shared_state = Arc::new(tokio::sync::Mutex::new(SharedUploadState {
            active_chunks: HashMap::new(),
            cumulative_bytes: cumulative_file_bytes,
            total_file_bytes,
            last_emit: Instant::now(),
            last_bytes: cumulative_file_bytes,
            current_speed: 0.0,
        }));

        let mut worker_handles = Vec::with_capacity(concurrency);

        for _ in 0..concurrency {
            let q_clone = Arc::clone(&pending_queue);
            let leased_clone = Arc::clone(&leased_bots);
            let state_clone = Arc::clone(&shared_state);
            let bot_pool = Arc::clone(&self.bot_pool);
            let db = Arc::clone(&self.db);
            let app_emit = app_handle.clone();
            let ctrl = control.clone();
            let f_id = file_id.clone();
            let f_path = file_path.clone();
            let f_record = file_record.clone();

            let handle = tokio::spawn(async move {
                loop {
                    if ctrl.is_cancelled.load(Ordering::Relaxed) || ctrl.is_paused.load(Ordering::Relaxed) {
                        break;
                    }

                    let chunk = {
                        let mut q = q_clone.lock().await;
                        if q.is_empty() {
                            break;
                        }
                        q.remove(0)
                    };

                    let mut attempt = 0;
                    const MAX_CHUNK_ATTEMPTS: usize = 12;
                    let mut chunk_succeeded = false;

                    while attempt < MAX_CHUNK_ATTEMPTS && !chunk_succeeded {
                        attempt += 1;

                        if ctrl.is_cancelled.load(Ordering::Relaxed) || ctrl.is_paused.load(Ordering::Relaxed) {
                            break;
                        }

                        // Select available worker excluding already leased bots
                        let excluded = leased_clone.lock().await.clone();
                        let (worker_client, worker_id, bot_name, target_channel_peer) = match bot_pool.select_worker_excluding(&excluded).await {
                            Ok(w) => w,
                            Err(AppError::FloodWait(wait)) => {
                                tokio::time::sleep(std::time::Duration::from_secs(wait.min(5))).await;
                                continue;
                            }
                            Err(e) => {
                                eprintln!("Failed to acquire worker from pool: {e}");
                                tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
                                continue;
                            }
                        };

                        leased_clone.lock().await.push(worker_id.clone());

                        {
                            let mut s = state_clone.lock().await;
                            s.active_chunks.insert(
                                chunk.chunk_index,
                                ActiveChunkProgress {
                                    bytes_transferred: 0,
                                    _total_bytes: chunk.byte_length as u64,
                                    worker_name: bot_name.clone(),
                                },
                            );
                        }

                        inject_jitter().await;

                        let mut source_file = match File::open(&f_path).await {
                            Ok(f) => f,
                            Err(e) => {
                                leased_clone.lock().await.retain(|id| id != &worker_id);
                                eprintln!("Failed to open file: {e}");
                                return Err(AppError::Io(format!("Failed to open source file: {e}")));
                            }
                        };

                        if let Err(e) = source_file.seek(SeekFrom::Start(chunk.byte_offset as u64)).await {
                            leased_clone.lock().await.retain(|id| id != &worker_id);
                            eprintln!("Seek error: {e}");
                            return Err(AppError::Io(format!("Seek error: {e}")));
                        }

                        let slice_stream = source_file.take(chunk.byte_length as u64);
                        let buf_reader = BufReader::with_capacity(8 * 1024 * 1024, slice_stream);

                        let (progress_tx, mut progress_rx) = mpsc::unbounded_channel::<usize>();
                        let mut stream_reader = HashingProgressReader::new(
                            buf_reader,
                            Some(progress_tx),
                            ctrl.is_cancelled.clone(),
                            ctrl.is_paused.clone(),
                        );

                        let state_ref = Arc::clone(&state_clone);
                        let app_ref = app_emit.clone();
                        let fid_ref = f_id.clone();
                        let fname_ref = f_record.name.clone();
                        let chunk_idx = chunk.chunk_index;
                        let total_chunks = f_record.total_chunks;
                        let ctrl_drain = ctrl.clone();

                        let drain_task = tokio::spawn(async move {
                            while let Some(delta) = progress_rx.recv().await {
                                if ctrl_drain.is_cancelled.load(Ordering::Relaxed) || ctrl_drain.is_paused.load(Ordering::Relaxed) {
                                    break;
                                }
                                {
                                    let mut s = state_ref.lock().await;
                                    if let Some(entry) = s.active_chunks.get_mut(&chunk_idx) {
                                        entry.bytes_transferred += delta as u64;
                                    }
                                }
                                if !ctrl_drain.is_cancelled.load(Ordering::Relaxed) && !ctrl_drain.is_paused.load(Ordering::Relaxed) {
                                    emit_aggregate_progress(&app_ref, &state_ref, &fid_ref, &fname_ref, total_chunks, false).await;
                                }
                            }
                        });
                        ctrl.add_worker_abort_handle(drain_task.abort_handle()).await;

                        let id_prefix = if f_id.len() >= 8 { &f_id[..8] } else { &f_id };
                        let obfuscated_name = format!("{}_{:04}.bin", id_prefix, chunk.chunk_index);

                        let upload_res = worker_client
                            .upload_stream(
                                &mut stream_reader,
                                chunk.byte_length as usize,
                                obfuscated_name,
                            )
                            .await;

                        stream_reader.close_progress();
                        let _ = drain_task.await;

                        leased_clone.lock().await.retain(|id| id != &worker_id);

                        if ctrl.is_cancelled.load(Ordering::Relaxed) || ctrl.is_paused.load(Ordering::Relaxed) {
                            eprintln!("Upload chunk aborted due to cancellation/pause: file {}", f_id);
                            break;
                        }

                        let uploaded = match upload_res {
                            Ok(u) => u,
                            Err(io_err) => {
                                if ctrl.is_cancelled.load(Ordering::Relaxed) || ctrl.is_paused.load(Ordering::Relaxed) {
                                    eprintln!("Upload aborted by user: {io_err}");
                                    break;
                                }
                                let err_str = io_err.to_string();
                                if let Some(wait_secs) = parse_flood_wait_from_str(&err_str) {
                                    bot_pool.report_flood_wait(&worker_id, wait_secs).await;
                                }
                                eprintln!("Upload stream error for chunk {}: {io_err}", chunk.chunk_index);
                                continue;
                            }
                        };

                        if ctrl.is_cancelled.load(Ordering::Relaxed) || ctrl.is_paused.load(Ordering::Relaxed) {
                            break;
                        }

                        let chunk_sha256 = stream_reader.finalize_sha256();
                        let caption = format!("CHUNK | {} | {} | sha256:{}", f_id, chunk.chunk_index, chunk_sha256);
                        let input_msg = InputMessage::default().text(&caption).document(uploaded);

                        match worker_client.send_message(target_channel_peer, input_msg).await {
                            Ok(msg) => {
                                if ctrl.is_cancelled.load(Ordering::Relaxed) || ctrl.is_paused.load(Ordering::Relaxed) {
                                    break;
                                }
                                let msg_id = msg.id() as i64;
                                let _ = db.update_chunk_uploaded(&f_id, chunk.chunk_index, msg_id, &chunk_sha256);
                                bot_pool.report_bytes_uploaded(&worker_id, chunk.byte_length).await;

                                {
                                    let mut s = state_clone.lock().await;
                                    s.cumulative_bytes += chunk.byte_length as u64;
                                    s.active_chunks.remove(&chunk.chunk_index);
                                }

                                emit_aggregate_progress(&app_emit, &state_clone, &f_id, &f_record.name, f_record.total_chunks, true).await;

                                eprintln!(
                                    "Chunk {}/{} uploaded and confirmed by worker {} for file {}",
                                    chunk.chunk_index + 1,
                                    f_record.total_chunks,
                                    bot_name,
                                    f_id
                                );
                                chunk_succeeded = true;
                            }
                            Err(err) => {
                                if let Some(wait_secs) = extract_flood_wait_secs(&err) {
                                    bot_pool.report_flood_wait(&worker_id, wait_secs).await;
                                }
                                eprintln!("Failed to send chunk message: {err}");
                                continue;
                            }
                        }
                    }

                    if !chunk_succeeded && !ctrl.is_cancelled.load(Ordering::Relaxed) && !ctrl.is_paused.load(Ordering::Relaxed) {
                        return Err(AppError::WorkerPoolExhausted);
                    }
                }

                Ok(())
            });

            control.add_worker_abort_handle(handle.abort_handle()).await;
            worker_handles.push(handle);
        }

        for handle in worker_handles {
            if let Err(e) = handle.await {
                eprintln!("Worker task join error: {e}");
            }
        }

        // Check cancellation
        if control.is_cancelled.load(Ordering::Relaxed) {
            let final_bytes = shared_state.lock().await.cumulative_bytes;
            let _ = app_handle.emit(
                PROGRESS_EVENT_NAME,
                UploadProgressPayload {
                    file_id: file_id.clone(),
                    file_name: file_record.name.clone(),
                    chunk_index: 0,
                    total_chunks: file_record.total_chunks,
                    bytes_transferred_chunk: 0,
                    total_chunk_bytes: 0,
                    bytes_transferred_file: final_bytes,
                    total_file_bytes,
                    speed_bytes_per_sec: 0.0,
                    active_worker: "none".into(),
                    status: "CANCELLED".into(),
                    error: None,
                },
            );
            return Ok(());
        }

        // Check pause
        if control.is_paused.load(Ordering::Relaxed) {
            let final_bytes = shared_state.lock().await.cumulative_bytes;
            let _ = app_handle.emit(
                PROGRESS_EVENT_NAME,
                UploadProgressPayload {
                    file_id: file_id.clone(),
                    file_name: file_record.name.clone(),
                    chunk_index: 0,
                    total_chunks: file_record.total_chunks,
                    bytes_transferred_chunk: 0,
                    total_chunk_bytes: 0,
                    bytes_transferred_file: final_bytes,
                    total_file_bytes,
                    speed_bytes_per_sec: 0.0,
                    active_worker: "none".into(),
                    status: "PAUSED".into(),
                    error: None,
                },
            );
            return Ok(());
        }

        // Verify all chunks uploaded
        let remaining_pending = self.db.get_pending_chunks_for_file(&file_id)?;
        if !remaining_pending.is_empty() {
            let err_msg = format!("Upload stopped with {} pending chunks", remaining_pending.len());
            let _ = app_handle.emit(
                PROGRESS_EVENT_NAME,
                UploadProgressPayload {
                    file_id: file_id.clone(),
                    file_name: file_record.name.clone(),
                    chunk_index: 0,
                    total_chunks: file_record.total_chunks,
                    bytes_transferred_chunk: 0,
                    total_chunk_bytes: 0,
                    bytes_transferred_file: shared_state.lock().await.cumulative_bytes,
                    total_file_bytes,
                    speed_bytes_per_sec: 0.0,
                    active_worker: "none".into(),
                    status: "FAILED".into(),
                    error: Some(err_msg.clone()),
                },
            );
            return Err(AppError::WorkerPoolExhausted);
        }

        // 6. All chunks uploaded successfully: set status = 'READY'
        self.db.update_file_status(&file_id, "READY", None)?;
        self.controls.write().await.remove(&file_id);

        // 7. Auto-push VFS snapshot to pinned message on channel
        if let Err(e) = self.cloud_sync.push_vfs_index().await {
            eprintln!("Auto cloud sync push warning: {e}");
        }

        // 8. Emit final completed progress event
        let _ = app_handle.emit(
            PROGRESS_EVENT_NAME,
            UploadProgressPayload {
                file_id: file_id.clone(),
                file_name: file_record.name.clone(),
                chunk_index: file_record.total_chunks - 1,
                total_chunks: file_record.total_chunks,
                bytes_transferred_chunk: 0,
                total_chunk_bytes: 0,
                bytes_transferred_file: total_file_bytes,
                total_file_bytes,
                speed_bytes_per_sec: 0.0,
                active_worker: "completed".into(),
                status: "COMPLETED".into(),
                error: None,
            },
        );

        crate::android_bridge::update_transfer_notification(
            crate::android_bridge::get_notif_id(&file_id),
            &format!("Upload Complete: {}", file_record.name),
            "Stored in TeleCloud Vault",
            100,
            100,
            false,
        );

        let path_str = file_path.to_string_lossy();
        if path_str.contains("staged_uploads") || path_str.contains("vault_uploads") {
            let _ = tokio::fs::remove_file(&file_path).await;
        }

        Ok(())
    }
}

fn detect_mime_type(path: &Path) -> String {
    match path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()).as_deref() {
        Some("png") => "image/png".into(),
        Some("jpg") | Some("jpeg") => "image/jpeg".into(),
        Some("gif") => "image/gif".into(),
        Some("webp") => "image/webp".into(),
        Some("mp4") => "video/mp4".into(),
        Some("mkv") => "video/x-matroska".into(),
        Some("mov") => "video/quicktime".into(),
        Some("mp3") => "audio/mpeg".into(),
        Some("wav") => "audio/wav".into(),
        Some("flac") => "audio/flac".into(),
        Some("pdf") => "application/pdf".into(),
        Some("zip") => "application/zip".into(),
        Some("tar") => "application/x-tar".into(),
        Some("gz") => "application/gzip".into(),
        Some("7z") => "application/x-7z-compressed".into(),
        Some("json") => "application/json".into(),
        Some("txt") => "text/plain".into(),
        Some("iso") => "application/x-iso9660-image".into(),
        _ => "application/octet-stream".into(),
    }
}
