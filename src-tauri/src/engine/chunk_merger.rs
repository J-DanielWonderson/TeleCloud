use std::{
    collections::{HashMap, HashSet},
    io::SeekFrom,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc,
    },
    time::Instant,
};
use grammers_client::media::Downloadable;
use grammers_mtsender::InvocationError;
use grammers_tl_types as tl;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use tokio::{
    fs::{self, File, OpenOptions},
    io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, BufWriter},
    sync::{mpsc, RwLock},
};

use crate::db::schema::DbManager;
use crate::engine::chunk_uploader::{PROGRESS_EVENT_NAME, UploadProgressPayload};
use crate::error::AppError;
use crate::telegram::bot_pool::BotPool;
use crate::telegram::client::TelegramClientManager;
use crate::telegram::flood_guard::extract_flood_wait_secs;

#[derive(Clone)]
pub struct DownloadControl {
    pub is_paused: Arc<AtomicBool>,
    pub is_cancelled: Arc<AtomicBool>,
    pub destination_path: PathBuf,
    worker_abort_handles: Arc<tokio::sync::Mutex<Vec<tokio::task::AbortHandle>>>,
    coordinator_abort_handle: Arc<tokio::sync::Mutex<Option<tokio::task::AbortHandle>>>,
}

impl DownloadControl {
    pub fn new(destination_path: PathBuf) -> Self {
        Self {
            is_paused: Arc::new(AtomicBool::new(false)),
            is_cancelled: Arc::new(AtomicBool::new(false)),
            destination_path,
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

#[derive(Clone)]
pub struct ChunkMergerManager {
    db: Arc<DbManager>,
    bot_pool: Arc<BotPool>,
    _telegram: Arc<TelegramClientManager>,
    controls: Arc<RwLock<HashMap<String, DownloadControl>>>,
    completed_chunks_map: Arc<RwLock<HashMap<String, HashSet<i64>>>>,
}

impl ChunkMergerManager {
    pub fn new(
        db: Arc<DbManager>,
        bot_pool: Arc<BotPool>,
        telegram: Arc<TelegramClientManager>,
    ) -> Self {
        Self {
            db,
            bot_pool,
            _telegram: telegram,
            controls: Arc::new(RwLock::new(HashMap::new())),
            completed_chunks_map: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Start a new download for a file into the given destination path
    pub async fn start_download(
        &self,
        app_handle: AppHandle,
        file_id: &str,
        destination_path: &str,
    ) -> Result<(), AppError> {
        let file_record = self
            .db
            .get_file(file_id)?
            .ok_or_else(|| AppError::FileNotFound(file_id.to_string()))?;

        let dest_path = PathBuf::from(destination_path);
        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        // Pre-allocate target file size on disk without creating split temporary files
        let file = OpenOptions::new()
            .create(true)
            .write(true)
            .read(true)
            .open(&dest_path)
            .await?;
        file.set_len(file_record.total_size_bytes as u64).await?;
        drop(file);

        let control = DownloadControl::new(dest_path.clone());

        {
            let mut controls = self.controls.write().await;
            controls.insert(file_id.to_string(), control.clone());
        }

        let notification_id = crate::android_bridge::get_notif_id(file_id);
        crate::android_bridge::update_transfer_notification(
            notification_id,
            &format!("Downloading {}", file_record.name),
            "Preparing download",
            0,
            0,
            true,
        );

        // Spawn async download worker
        let self_clone = self.clone();
        let file_id_str = file_id.to_string();
        let ctrl_clone = control.clone();
        let notification_name = file_record.name.clone();

        let process_task = tokio::spawn(async move {
            if let Err(e) = self_clone
                .process_file_download(app_handle, file_id_str, dest_path, ctrl_clone)
                .await
            {
                eprintln!("Download pipeline error: {e}");
                crate::android_bridge::update_transfer_notification(
                    notification_id,
                    &format!("Download failed: {notification_name}"),
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
        // Leave the coordinator alive on pause so it can close writers and
        // preserve its in-memory completed-chunk map. Child network workers
        // are registered separately and can still be interrupted at once.
        drop(process_task);

        Ok(())
    }

    /// Pause an active file download immediately
    pub async fn pause_download(&self, app_handle: &AppHandle, file_id: &str) -> Result<(), AppError> {
        let (file_name, total_chunks, total_size) = if let Ok(Some(f)) = self.db.get_file(file_id) {
            (f.name, f.total_chunks, f.total_size_bytes as u64)
        } else {
            ("downloaded_file".to_string(), 1, 0)
        };

        let downloaded_bytes: u64 = {
            let map = self.completed_chunks_map.read().await;
            if let Some(completed) = map.get(file_id) {
                if let Ok(chunks) = self.db.get_chunks_for_file(file_id) {
                    chunks
                        .iter()
                        .filter(|c| completed.contains(&(c.chunk_index as i64)))
                        .map(|c| c.byte_length as u64)
                        .sum()
                } else {
                    0
                }
            } else {
                0
            }
        };

        let control = self.controls.write().await.remove(file_id);
        if let Some(ctrl) = control {
            ctrl.is_paused.store(true, Ordering::Relaxed);
            ctrl.abort_all().await;
        }
        let _ = self.db.update_file_status(file_id, "PAUSED", None);

        let _ = app_handle.emit(
            PROGRESS_EVENT_NAME,
            UploadProgressPayload {
                file_id: file_id.to_string(),
                file_name: file_name.clone(),
                chunk_index: 0,
                total_chunks,
                bytes_transferred_chunk: 0,
                total_chunk_bytes: 0,
                bytes_transferred_file: downloaded_bytes,
                total_file_bytes: total_size,
                speed_bytes_per_sec: 0.0,
                active_worker: "none".into(),
                status: "PAUSED".into(),
                error: None,
            },
        );

        crate::android_bridge::update_transfer_notification(
            crate::android_bridge::get_notif_id(file_id),
            &format!("Download Paused: {file_name}"),
            "Transfer paused",
            0,
            100,
            false,
        );

        Ok(())
    }

    /// Resume a previously paused file download
    pub async fn resume_download(
        &self,
        app_handle: AppHandle,
        file_id: &str,
        destination_path: &str,
    ) -> Result<(), AppError> {
        let dest_path = PathBuf::from(destination_path);
        let control = DownloadControl::new(dest_path.clone());

        {
            let mut controls = self.controls.write().await;
            controls.insert(file_id.to_string(), control.clone());
        }

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
            &format!("Downloading {notification_name}"),
            "Resuming download",
            0,
            0,
            true,
        );

        let self_clone = self.clone();
        let file_id_str = file_id.to_string();
        let ctrl_clone = control.clone();
        let notification_name = notification_name.clone();

        let process_task = tokio::spawn(async move {
            if let Err(e) = self_clone
                .process_file_download(app_handle, file_id_str, dest_path, ctrl_clone)
                .await
            {
                eprintln!("Resume download pipeline error: {e}");
                crate::android_bridge::update_transfer_notification(
                    notification_id,
                    &format!("Download failed: {notification_name}"),
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
        // See start_download: only worker I/O tasks are abortable for pause.
        drop(process_task);

        Ok(())
    }

    /// Cancel an active file download and clean up destination file immediately
    pub async fn cancel_download(&self, app_handle: &AppHandle, file_id: &str) -> Result<(), AppError> {
        let (file_name, total_chunks, total_size) = if let Ok(Some(f)) = self.db.get_file(file_id) {
            (f.name, f.total_chunks, f.total_size_bytes as u64)
        } else {
            ("downloaded_file".to_string(), 1, 0)
        };

        let control = self.controls.write().await.remove(file_id);
        let dest_opt = if let Some(ctrl) = control {
            ctrl.is_cancelled.store(true, Ordering::Relaxed);
            ctrl.abort_all().await;
            Some(ctrl.destination_path.clone())
        } else {
            None
        };

        if let Some(dest_path) = dest_opt {
            let _ = fs::remove_file(dest_path).await;
        }

        self.completed_chunks_map.write().await.remove(file_id);

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

    /// Core stream download and virtual merge processor
    async fn process_file_download(
        &self,
        app_handle: AppHandle,
        file_id: String,
        dest_path: PathBuf,
        control: DownloadControl,
    ) -> Result<(), AppError> {
        let file_record = self
            .db
            .get_file(&file_id)?
            .ok_or_else(|| AppError::FileNotFound(file_id.clone()))?;

        let chunks = self.db.get_chunks_for_file(&file_id)?;
        if chunks.is_empty() {
            return Err(AppError::Validation("File has no recorded chunks in database".into()));
        }

        let total_file_bytes = file_record.total_size_bytes as u64;

        // Check which chunks were already downloaded in a previous session
        let completed_chunks = {
            let read_map = self.completed_chunks_map.read().await;
            read_map.get(&file_id).cloned().unwrap_or_default()
        };

        let mut cumulative_file_bytes: u64 = chunks
            .iter()
            .filter(|c| completed_chunks.contains(&c.chunk_index))
            .map(|c| c.byte_length as u64)
            .sum();

        for chunk in &chunks {
            // Skip already downloaded chunks
            if completed_chunks.contains(&chunk.chunk_index) {
                continue;
            }

            // Check cancellation
            if control.is_cancelled.load(Ordering::Relaxed) {
                let _ = app_handle.emit(
                    PROGRESS_EVENT_NAME,
                    UploadProgressPayload {
                        file_id: file_id.clone(),
                        file_name: file_record.name.clone(),
                        chunk_index: chunk.chunk_index,
                        total_chunks: file_record.total_chunks,
                        bytes_transferred_chunk: 0,
                        total_chunk_bytes: chunk.byte_length as u64,
                        bytes_transferred_file: cumulative_file_bytes,
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
                let _ = app_handle.emit(
                    PROGRESS_EVENT_NAME,
                    UploadProgressPayload {
                        file_id: file_id.clone(),
                        file_name: file_record.name.clone(),
                        chunk_index: chunk.chunk_index,
                        total_chunks: file_record.total_chunks,
                        bytes_transferred_chunk: 0,
                        total_chunk_bytes: chunk.byte_length as u64,
                        bytes_transferred_file: cumulative_file_bytes,
                        total_file_bytes,
                        speed_bytes_per_sec: 0.0,
                        active_worker: "none".into(),
                        status: "PAUSED".into(),
                        error: None,
                    },
                );
                return Ok(());
            }

            let msg_id = match chunk.telegram_message_id {
                Some(id) => id as i32,
                None => {
                    let err = format!(
                        "Chunk {} has no recorded Telegram message ID in vault database",
                        chunk.chunk_index
                    );
                    let _ = app_handle.emit(
                        PROGRESS_EVENT_NAME,
                        UploadProgressPayload {
                            file_id: file_id.clone(),
                            file_name: file_record.name.clone(),
                            chunk_index: chunk.chunk_index,
                            total_chunks: file_record.total_chunks,
                            bytes_transferred_chunk: 0,
                            total_chunk_bytes: chunk.byte_length as u64,
                            bytes_transferred_file: cumulative_file_bytes,
                            total_file_bytes,
                            speed_bytes_per_sec: 0.0,
                            active_worker: "none".into(),
                            status: "FAILED".into(),
                            error: Some(err.clone()),
                        },
                    );
                    return Err(AppError::Telegram(err));
                }
            };

            // Anti-flood chunk download retry loop across worker bot pool
            let mut chunk_downloaded = false;
            let mut attempts = 0;
            const MAX_ATTEMPTS: usize = 5;

            while !chunk_downloaded && attempts < MAX_ATTEMPTS {
                attempts += 1;

                if control.is_cancelled.load(Ordering::Relaxed) || control.is_paused.load(Ordering::Relaxed) {
                    break;
                }

                // 1. Select healthy worker from bot pool with verified channel PeerRef
                let (worker_client, worker_id, bot_username, target_channel_peer) = match self.bot_pool.select_worker().await {
                    Ok(w) => w,
                    Err(e) => {
                        eprintln!("Failed to acquire worker from bot pool: {e}");
                        tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
                        continue;
                    }
                };

                // 2. Locate Telegram message in storage channel
                let msgs = match worker_client.get_messages_by_id(target_channel_peer, &[msg_id]).await {
                    Ok(m) => m,
                    Err(err) => {
                        if let Some(wait_secs) = extract_flood_wait_secs(&err) {
                            self.bot_pool.report_flood_wait(&worker_id, wait_secs).await;
                            continue; // Failover to next worker bot in pool
                        }
                        eprintln!("Error fetching message {msg_id}: {err}");
                        continue;
                    }
                };

                let msg = match msgs.into_iter().next().flatten() {
                    Some(m) => m,
                    None => {
                        eprintln!("Telegram message {msg_id} not found in channel. Retrying attempt {attempts}...");
                        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                        continue;
                    }
                };

                let media = match msg.media() {
                    Some(m) => m,
                    None => {
                        eprintln!("Message {msg_id} contains no downloadable media. Retrying...");
                        continue;
                    }
                };

                // Check for fast concurrent download capabilities via Downloadable
                let location_opt = media.to_raw_input_location();
                let dc_id = media.dc_id().unwrap_or(2);
                let chunk_byte_len = chunk.byte_length as usize;

                let mut stream_failed = false;
                let mut chunk_bytes_read: u64 = 0;
                let mut last_emit = Instant::now();
                let mut last_bytes_emitted: u64 = 0;
                let mut current_speed: f64 = 0.0;
                let base_file_bytes = cumulative_file_bytes;

                if let Some(location) = location_opt {
                    // Fast multi-connection concurrent download (4 parallel pipelined streams)
                    const CONCURRENCY: usize = 4;
                    const PART_SIZE: usize = 512 * 1024; // 512 KB optimal MTProto block

                    let (tx, mut rx) = mpsc::channel::<(usize, Vec<u8>)>(16);
                    let part_counter = Arc::new(AtomicUsize::new(0));
                    let is_cancelled = control.is_cancelled.clone();
                    let is_paused = control.is_paused.clone();

                    let mut worker_tasks = Vec::with_capacity(CONCURRENCY);

                    for _ in 0..CONCURRENCY {
                        let client_w = worker_client.clone();
                        let loc_w = location.clone();
                        let tx_w = tx.clone();
                        let part_idx = Arc::clone(&part_counter);
                        let is_canc = is_cancelled.clone();
                        let is_pau = is_paused.clone();

                        let task = tokio::spawn(async move {
                            let mut task_dc = dc_id;
                            let mut retry_offset: Option<usize> = None;

                            loop {
                                if is_canc.load(Ordering::Relaxed) || is_pau.load(Ordering::Relaxed) {
                                    break;
                                }

                                let offset = if let Some(r_off) = retry_offset.take() {
                                    r_off
                                } else {
                                    let idx = part_idx.fetch_add(1, Ordering::Relaxed);
                                    let off = idx * PART_SIZE;
                                    if off >= chunk_byte_len {
                                        break;
                                    }
                                    off
                                };

                                // Telegram upload.getFile requires limit to be a multiple of 4 KB (PART_SIZE = 512 KB = 128 * 4096).
                                // Passing PART_SIZE unconditionally prevents RPC 400: LIMIT_INVALID on EOF blocks.
                                let limit = PART_SIZE as i32;

                                let req = tl::functions::upload::GetFile {
                                    precise: true,
                                    cdn_supported: false,
                                    location: loc_w.clone(),
                                    offset: offset as i64,
                                    limit,
                                };

                                match client_w.invoke_in_dc(task_dc, &req).await {
                                    Ok(tl::enums::upload::File::File(f)) => {
                                        if tx_w.send((offset, f.bytes)).await.is_err() {
                                            break;
                                        }
                                    }
                                    Ok(tl::enums::upload::File::CdnRedirect(_)) => {
                                        break;
                                    }
                                    Err(InvocationError::Rpc(err)) => {
                                        if err.code == 303 {
                                            if let Some(new_dc) = err.value {
                                                task_dc = new_dc as i32;
                                                retry_offset = Some(offset);
                                                continue;
                                            }
                                        }
                                        eprintln!("RPC error in download worker at offset {offset}: {err}");
                                        break;
                                    }
                                    Err(e) => {
                                        eprintln!("Network error in download worker at offset {offset}: {e}");
                                        break;
                                    }
                                }
                            }
                        });
                        control.add_worker_abort_handle(task.abort_handle()).await;
                        worker_tasks.push(task);
                    }
                    drop(tx); // Drop original sender so channel terminates when all workers finish

                    let mut dest_file = match OpenOptions::new().write(true).open(&dest_path).await {
                        Ok(f) => f,
                        Err(e) => return Err(AppError::Io(format!("Failed to open destination file for write: {e}"))),
                    };

                    while let Some((part_offset, bytes)) = rx.recv().await {
                        if control.is_cancelled.load(Ordering::Relaxed) || control.is_paused.load(Ordering::Relaxed) {
                            break;
                        }

                        let target_offset = chunk.byte_offset as u64 + part_offset as u64;
                        if let Err(e) = dest_file.seek(SeekFrom::Start(target_offset)).await {
                            eprintln!("Seek error at {target_offset}: {e}");
                            stream_failed = true;
                            break;
                        }

                        // Clamp to valid chunk bytes to avoid writing excess padding on EOF block
                        let valid_len = (chunk_byte_len.saturating_sub(part_offset)).min(bytes.len());
                        if valid_len > 0 {
                            if let Err(e) = dest_file.write_all(&bytes[..valid_len]).await {
                                eprintln!("Write error: {e}");
                                stream_failed = true;
                                break;
                            }
                        }

                        chunk_bytes_read += valid_len as u64;

                        // Rolling EMA speed calculation over 200ms intervals
                        let now = Instant::now();
                        let elapsed_ms = now.duration_since(last_emit).as_millis();
                        if elapsed_ms >= 200 {
                            let delta_secs = now.duration_since(last_emit).as_secs_f64();
                            let delta_bytes = (chunk_bytes_read - last_bytes_emitted) as f64;
                            let instant_speed = if delta_secs > 0.0 { delta_bytes / delta_secs } else { 0.0 };

                            current_speed = if current_speed == 0.0 {
                                instant_speed
                            } else {
                                current_speed * 0.7 + instant_speed * 0.3
                            };

                            last_emit = now;
                            last_bytes_emitted = chunk_bytes_read;

                            let _ = app_handle.emit(
                                PROGRESS_EVENT_NAME,
                                UploadProgressPayload {
                                    file_id: file_id.clone(),
                                    file_name: file_record.name.clone(),
                                    chunk_index: chunk.chunk_index,
                                    total_chunks: file_record.total_chunks,
                                    bytes_transferred_chunk: chunk_bytes_read,
                                    total_chunk_bytes: chunk.byte_length as u64,
                                    bytes_transferred_file: base_file_bytes + chunk_bytes_read,
                                    total_file_bytes,
                                    speed_bytes_per_sec: current_speed,
                                    active_worker: format!("1 Bot: {}", bot_username),
                                    status: "DOWNLOADING".into(),
                                    error: None,
                                },
                            );

                            let transferred = base_file_bytes + chunk_bytes_read;
                            let percent = if total_file_bytes > 0 {
                                ((transferred as f64 / total_file_bytes as f64) * 100.0) as i32
                            } else {
                                0
                            };
                            let speed_mb = current_speed / (1024.0 * 1024.0);
                            let speed_text = if speed_mb >= 1.0 {
                                format!("{:.1} MB/s", speed_mb)
                            } else {
                                format!("{:.0} KB/s", current_speed / 1024.0)
                            };
                            let notif_content = format!("{percent}% • {speed_text} • Chunk {}/{}", chunk.chunk_index + 1, file_record.total_chunks);
                            crate::android_bridge::update_transfer_notification(
                                crate::android_bridge::get_notif_id(&file_id),
                                &format!("Downloading {}", file_record.name),
                                &notif_content,
                                percent,
                                100,
                                true,
                            );
                        }
                    }

                    for task in worker_tasks {
                        let _ = task.await;
                    }

                    if let Err(e) = dest_file.flush().await {
                        eprintln!("Failed to flush chunk buffer: {e}");
                        stream_failed = true;
                    }

                    if chunk_bytes_read != chunk.byte_length as u64 {
                        stream_failed = true;
                    }
                } else {
                    // Fallback to DownloadIter if raw input location is not available
                    let mut dest_file = match OpenOptions::new().write(true).open(&dest_path).await {
                        Ok(f) => f,
                        Err(e) => return Err(AppError::Io(format!("Failed to open destination file for write: {e}"))),
                    };

                    if let Err(e) = dest_file.seek(SeekFrom::Start(chunk.byte_offset as u64)).await {
                        return Err(AppError::Io(format!("Failed to seek destination file: {e}")));
                    }

                    let mut writer = BufWriter::with_capacity(8 * 1024 * 1024, dest_file);
                    let mut download_iter = worker_client.iter_download(&media);

                    loop {
                        let piece_opt = match download_iter.next().await {
                            Ok(Some(p)) => Some(p),
                            Ok(None) => None,
                            Err(err) => {
                                if let Some(wait_secs) = extract_flood_wait_secs(&err) {
                                    self.bot_pool.report_flood_wait(&worker_id, wait_secs).await;
                                }
                                stream_failed = true;
                                break;
                            }
                        };

                        let piece = match piece_opt {
                            Some(p) => p,
                            None => break,
                        };

                        if control.is_cancelled.load(Ordering::Relaxed) || control.is_paused.load(Ordering::Relaxed) {
                            break;
                        }

                        if let Err(e) = writer.write_all(&piece).await {
                            eprintln!("Error writing piece: {e}");
                            stream_failed = true;
                            break;
                        }

                        chunk_bytes_read += piece.len() as u64;

                        let now = Instant::now();
                        let elapsed_ms = now.duration_since(last_emit).as_millis();
                        if elapsed_ms >= 200 {
                            let delta_secs = now.duration_since(last_emit).as_secs_f64();
                            let delta_bytes = (chunk_bytes_read - last_bytes_emitted) as f64;
                            let instant_speed = if delta_secs > 0.0 { delta_bytes / delta_secs } else { 0.0 };

                            current_speed = if current_speed == 0.0 {
                                instant_speed
                            } else {
                                current_speed * 0.7 + instant_speed * 0.3
                            };

                            last_emit = now;
                            last_bytes_emitted = chunk_bytes_read;

                            let _ = app_handle.emit(
                                PROGRESS_EVENT_NAME,
                                UploadProgressPayload {
                                    file_id: file_id.clone(),
                                    file_name: file_record.name.clone(),
                                    chunk_index: chunk.chunk_index,
                                    total_chunks: file_record.total_chunks,
                                    bytes_transferred_chunk: chunk_bytes_read,
                                    total_chunk_bytes: chunk.byte_length as u64,
                                    bytes_transferred_file: base_file_bytes + chunk_bytes_read,
                                    total_file_bytes,
                                    speed_bytes_per_sec: current_speed,
                                    active_worker: format!("1 Bot: {}", bot_username),
                                    status: "DOWNLOADING".into(),
                                    error: None,
                                },
                            );

                            let transferred = base_file_bytes + chunk_bytes_read;
                            let percent = if total_file_bytes > 0 {
                                ((transferred as f64 / total_file_bytes as f64) * 100.0) as i32
                            } else {
                                0
                            };
                            let speed_mb = current_speed / (1024.0 * 1024.0);
                            let speed_text = if speed_mb >= 1.0 {
                                format!("{:.1} MB/s", speed_mb)
                            } else {
                                format!("{:.0} KB/s", current_speed / 1024.0)
                            };
                            let notif_content = format!("{percent}% • {speed_text} • Chunk {}/{}", chunk.chunk_index + 1, file_record.total_chunks);
                            crate::android_bridge::update_transfer_notification(
                                crate::android_bridge::get_notif_id(&file_id),
                                &format!("Downloading {}", file_record.name),
                                &notif_content,
                                percent,
                                100,
                                true,
                            );
                        }
                    }

                    if let Err(e) = writer.flush().await {
                        eprintln!("Failed to flush buffer: {e}");
                        stream_failed = true;
                    }
                }

                if control.is_cancelled.load(Ordering::Relaxed) || control.is_paused.load(Ordering::Relaxed) {
                    break;
                }

                if stream_failed {
                    continue; // Retry chunk with next worker bot
                }

                // 4. Verify chunk SHA-256 integrity from disk
                if let Some(ref recorded_sha) = chunk.chunk_sha256 {
                    let mut check_file = match File::open(&dest_path).await {
                        Ok(f) => f,
                        Err(e) => {
                            eprintln!("Failed to open file for chunk verification: {e}");
                            continue;
                        }
                    };

                    if let Err(e) = check_file.seek(SeekFrom::Start(chunk.byte_offset as u64)).await {
                        eprintln!("Seek error during checksum verification: {e}");
                        continue;
                    }

                    let mut chunk_hasher = Sha256::new();
                    let mut remaining = chunk.byte_length as u64;
                    let mut buf = vec![0u8; (8 * 1024 * 1024).min(remaining as usize)];
                    let mut read_failed = false;

                    while remaining > 0 {
                        let to_read = (buf.len() as u64).min(remaining) as usize;
                        match check_file.read(&mut buf[..to_read]).await {
                            Ok(0) => break,
                            Ok(n) => {
                                chunk_hasher.update(&buf[..n]);
                                remaining -= n as u64;
                            }
                            Err(e) => {
                                eprintln!("Read error during checksum verification: {e}");
                                read_failed = true;
                                break;
                            }
                        }
                    }

                    if read_failed || remaining > 0 {
                        continue;
                    }

                    let calculated_sha = hex::encode(chunk_hasher.finalize());
                    if !calculated_sha.eq_ignore_ascii_case(recorded_sha) {
                        eprintln!(
                            "Chunk {} checksum mismatch! Expected {}, got {}. Retrying chunk...",
                            chunk.chunk_index, recorded_sha, calculated_sha
                        );
                        continue;
                    }
                }

                // Chunk successfully downloaded and verified!
                chunk_downloaded = true;
                cumulative_file_bytes += chunk.byte_length as u64;

                {
                    let mut map = self.completed_chunks_map.write().await;
                    map.entry(file_id.clone()).or_default().insert(chunk.chunk_index);
                }
            }

            if control.is_cancelled.load(Ordering::Relaxed) {
                let _ = app_handle.emit(
                    PROGRESS_EVENT_NAME,
                    UploadProgressPayload {
                        file_id: file_id.clone(),
                        file_name: file_record.name.clone(),
                        chunk_index: chunk.chunk_index,
                        total_chunks: file_record.total_chunks,
                        bytes_transferred_chunk: 0,
                        total_chunk_bytes: chunk.byte_length as u64,
                        bytes_transferred_file: cumulative_file_bytes,
                        total_file_bytes,
                        speed_bytes_per_sec: 0.0,
                        active_worker: "none".into(),
                        status: "CANCELLED".into(),
                        error: None,
                    },
                );
                return Ok(());
            }

            if control.is_paused.load(Ordering::Relaxed) {
                let _ = app_handle.emit(
                    PROGRESS_EVENT_NAME,
                    UploadProgressPayload {
                        file_id: file_id.clone(),
                        file_name: file_record.name.clone(),
                        chunk_index: chunk.chunk_index,
                        total_chunks: file_record.total_chunks,
                        bytes_transferred_chunk: 0,
                        total_chunk_bytes: chunk.byte_length as u64,
                        bytes_transferred_file: cumulative_file_bytes,
                        total_file_bytes,
                        speed_bytes_per_sec: 0.0,
                        active_worker: "none".into(),
                        status: "PAUSED".into(),
                        error: None,
                    },
                );
                return Ok(());
            }

            if !chunk_downloaded {
                let err_msg = format!("Failed to download chunk {} after {} attempts", chunk.chunk_index, MAX_ATTEMPTS);
                let _ = app_handle.emit(
                    PROGRESS_EVENT_NAME,
                    UploadProgressPayload {
                        file_id: file_id.clone(),
                        file_name: file_record.name.clone(),
                        chunk_index: chunk.chunk_index,
                        total_chunks: file_record.total_chunks,
                        bytes_transferred_chunk: 0,
                        total_chunk_bytes: chunk.byte_length as u64,
                        bytes_transferred_file: cumulative_file_bytes,
                        total_file_bytes,
                        speed_bytes_per_sec: 0.0,
                        active_worker: "none".into(),
                        status: "FAILED".into(),
                        error: Some(err_msg.clone()),
                    },
                );
                return Err(AppError::Telegram(err_msg));
            }
        }

        // 7. Full-file SHA-256 verification of the assembled file
        if let Some(ref expected_full_sha) = file_record.full_sha256 {
            let mut check_file = File::open(&dest_path).await?;
            let mut full_hasher = Sha256::new();
            let mut buffer = vec![0u8; 8 * 1024 * 1024]; // 8MB buffer flat RAM
            loop {
                let n = check_file.read(&mut buffer).await?;
                if n == 0 {
                    break;
                }
                full_hasher.update(&buffer[..n]);
            }

            let calculated_full = hex::encode(full_hasher.finalize());
            if !calculated_full.eq_ignore_ascii_case(expected_full_sha) {
                let err_msg = format!(
                    "Assembled file full SHA-256 validation failed! Expected: {expected_full_sha}, got: {calculated_full}"
                );
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
                        active_worker: "none".into(),
                        status: "FAILED".into(),
                        error: Some(err_msg.clone()),
                    },
                );
                return Err(AppError::Validation(err_msg));
            }
        }

        // 8. Emit final COMPLETED event
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
                active_worker: "All bots finished".into(),
                status: "COMPLETED".into(),
                error: None,
            },
        );

        crate::android_bridge::scan_media_file(&dest_path.to_string_lossy());
        crate::android_bridge::update_transfer_notification(
            crate::android_bridge::get_notif_id(&file_id),
            &format!("Download Complete: {}", file_record.name),
            "Saved to Downloads folder",
            100,
            100,
            false,
        );

        // Clean up session records
        self.controls.write().await.remove(&file_id);
        self.completed_chunks_map.write().await.remove(&file_id);

        Ok(())
    }
}
