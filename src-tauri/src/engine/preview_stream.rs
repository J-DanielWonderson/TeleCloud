use std::{
    collections::{HashMap, HashSet},
    io::SeekFrom,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU16, AtomicUsize, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
use grammers_client::media::Downloadable;
use grammers_mtsender::InvocationError;
use grammers_tl_types as tl;
use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{
    fs::{self, File, OpenOptions},
    io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::{broadcast, Mutex, RwLock, Semaphore},
};

use crate::db::schema::{DbManager, FileChunkRecord, FileRecord};
use crate::engine::media_probe::{
    evaluate_webview_playability, parse_ebml, parse_isobmff_boxes, parse_moov_payload, MediaProbe,
};
use crate::error::AppError;
use crate::telegram::bot_pool::BotPool;
use crate::telegram::client::TelegramClientManager;
use crate::telegram::flood_guard::extract_flood_wait_secs;

pub const BLOCK_SIZE: usize = 512 * 1024; // 512 KB optimal MTProto part size (128 * 4096)
pub const DEFAULT_MAX_CACHE_ANDROID: u64 = 1024 * 1024 * 1024; // 1 GB
pub const DEFAULT_MAX_CACHE_DESKTOP: u64 = 2 * 1024 * 1024 * 1024; // 2 GB

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewStatusEvent {
    pub file_id: String,
    pub stage: String, // resolving, connecting, fetching_header, fetching_index, buffering, ready
    pub message: String,
    pub cached_bytes: u64,
    pub total_bytes: u64,
    pub speed_bps: u64,
}

#[derive(Clone)]
pub struct PreviewStreamManager {
    db: Arc<DbManager>,
    bot_pool: Arc<BotPool>,
    _telegram: Arc<TelegramClientManager>,
    app_handle: AppHandle,
    preview_cache_dir: PathBuf,
    thumbnail_dir: PathBuf,
    cached_blocks: Arc<RwLock<HashMap<String, HashSet<usize>>>>,
    active_fetches: Arc<RwLock<HashMap<(String, usize), broadcast::Sender<Result<(), String>>>>>,
    chunk_locations: Arc<RwLock<HashMap<(String, i32), (tl::enums::InputFileLocation, i32)>>>,
    sticky_bots: Arc<RwLock<HashMap<String, String>>>, // file_id -> bot_id
    cancellation_flags: Arc<std::sync::RwLock<HashMap<String, Arc<AtomicBool>>>>,
    file_metadata_cache: Arc<RwLock<HashMap<String, (FileRecord, Arc<[FileChunkRecord]>)>>>,
    port: Arc<AtomicU16>,
    stream_token: String,
    read_ahead_limit: Arc<AtomicUsize>,
    global_mtproto_semaphore: Arc<Semaphore>,
    rate_limiter_last_tick: Arc<Mutex<Instant>>,
}

impl PreviewStreamManager {
    pub async fn new(
        app_handle: &AppHandle,
        db: Arc<DbManager>,
        bot_pool: Arc<BotPool>,
        telegram: Arc<TelegramClientManager>,
    ) -> Result<Self, AppError> {
        let app_dir = app_handle
            .path()
            .app_cache_dir()
            .map_err(|e| AppError::Io(format!("Failed to resolve cache dir: {e}")))?;

        let preview_cache_dir = app_dir.join("preview_cache");
        let thumbnail_dir = app_dir.join("thumbnails");

        fs::create_dir_all(&preview_cache_dir)
            .await
            .map_err(|e| AppError::Io(format!("Failed to create preview cache dir: {e}")))?;
        fs::create_dir_all(&thumbnail_dir)
            .await
            .map_err(|e| AppError::Io(format!("Failed to create thumbnail dir: {e}")))?;

        // Generate per-session random stream token for localhost access authorization
        let mut rng = rand::thread_rng();
        let token_bytes: [u8; 16] = rng.gen();
        let stream_token = hex::encode(token_bytes);

        let mgr = Self {
            db,
            bot_pool,
            _telegram: telegram,
            app_handle: app_handle.clone(),
            preview_cache_dir,
            thumbnail_dir,
            cached_blocks: Arc::new(RwLock::new(HashMap::new())),
            active_fetches: Arc::new(RwLock::new(HashMap::new())),
            chunk_locations: Arc::new(RwLock::new(HashMap::new())),
            sticky_bots: Arc::new(RwLock::new(HashMap::new())),
            cancellation_flags: Arc::new(std::sync::RwLock::new(HashMap::new())),
            file_metadata_cache: Arc::new(RwLock::new(HashMap::new())),
            port: Arc::new(AtomicU16::new(0)),
            stream_token,
            read_ahead_limit: Arc::new(AtomicUsize::new(3)),
            global_mtproto_semaphore: Arc::new(Semaphore::new(4)),
            rate_limiter_last_tick: Arc::new(Mutex::new(Instant::now())),
        };

        // Run startup LRU eviction
        let mgr_evict = mgr.clone();
        tokio::spawn(async move {
            let _ = mgr_evict.evict_preview_cache_if_needed().await;
        });

        Ok(mgr)
    }

    pub fn app_handle(&self) -> &AppHandle {
        &self.app_handle
    }

    pub fn port(&self) -> u16 {
        self.port.load(Ordering::Relaxed)
    }

    /// Background pre-warming of DC connection for active bots after app startup
    pub async fn warm_up_active_bots(&self) {
        if let Ok(files) = self.db.list_files(None, false) {
            if let Some(first_file) = files.first() {
                if let Ok(chunks) = self.db.get_chunks_for_file(&first_file.id) {
                    if let Some(first_chunk) = chunks.iter().find(|c| c.telegram_message_id.is_some()) {
                        if let Some(msg_id_raw) = first_chunk.telegram_message_id {
                            let msg_id = msg_id_raw as i32;
                            if let Ok((worker_client, worker_id, _, peer)) = self.bot_pool.select_worker().await {
                                if let Ok(msgs) = worker_client.get_messages_by_id(peer, &[msg_id]).await {
                                    if let Some(Some(msg)) = msgs.into_iter().next() {
                                        if let Some(media) = msg.media() {
                                            if let Some(loc) = media.to_raw_input_location() {
                                                let dc = media.dc_id().unwrap_or(2);
                                                self.chunk_locations.write().await.insert((worker_id.clone(), msg_id), (loc.clone(), dc));
                                                let req = tl::functions::upload::GetFile {
                                                    precise: true,
                                                    cdn_supported: false,
                                                    location: loc,
                                                    offset: 0,
                                                    limit: 4096,
                                                };
                                                let _ = worker_client.invoke_in_dc(dc, &req).await;
                                                eprintln!("[PreviewStream] Background DC {dc} pre-warmed for worker {worker_id}");
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn stream_token(&self) -> &str {
        &self.stream_token
    }

    pub fn get_stream_url(&self, file_id: &str) -> String {
        format!(
            "http://127.0.0.1:{}/stream/{}?t={}",
            self.port(),
            file_id,
            self.stream_token
        )
    }

    pub fn get_thumbnail_url(&self, file_id: &str) -> String {
        format!(
            "http://127.0.0.1:{}/thumbnail/{}?t={}",
            self.port(),
            file_id,
            self.stream_token
        )
    }

    pub fn cancel_preview(&self, file_id: &str) {
        if let Ok(flags) = self.cancellation_flags.read() {
            if let Some(flag) = flags.get(file_id) {
                flag.store(true, Ordering::SeqCst);
                eprintln!("[PreviewStream] Cancelled preview streaming and prefetch for {file_id}");
            }
        }
    }

    fn get_or_create_cancel_flag(&self, file_id: &str) -> Arc<AtomicBool> {
        let mut flags = self
            .cancellation_flags
            .write()
            .unwrap_or_else(|p| p.into_inner());
        let flag = flags
            .entry(file_id.to_string())
            .or_insert_with(|| Arc::new(AtomicBool::new(false)))
            .clone();
        flag.store(false, Ordering::SeqCst);
        flag
    }

    fn is_cancelled(&self, file_id: &str) -> bool {
        self.cancellation_flags
            .read()
            .ok()
            .and_then(|flags| flags.get(file_id).map(|f| f.load(Ordering::SeqCst)))
            .unwrap_or(false)
    }

    pub async fn save_thumbnail(
        &self,
        file_id: &str,
        base64_data: &str,
    ) -> Result<(), AppError> {
        let clean_base64 = if let Some(idx) = base64_data.find(',') {
            &base64_data[idx + 1..]
        } else {
            base64_data
        };

        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(clean_base64.trim())
            .map_err(|e| AppError::Validation(format!("Invalid base64 thumbnail data: {e}")))?;

        let path = self.thumbnail_dir.join(format!("{}.webp", file_id));
        let mut file = File::create(&path).await?;
        file.write_all(&bytes).await?;
        file.flush().await?;
        Ok(())
    }

    pub async fn get_thumbnail_base64(&self, file_id: &str) -> Result<Option<String>, AppError> {
        let path = self.thumbnail_dir.join(format!("{}.webp", file_id));
        if !path.exists() {
            return Ok(None);
        }
        let bytes = fs::read(&path)
            .await
            .map_err(|e| AppError::Io(format!("Failed to read thumbnail file: {e}")))?;
        use base64::Engine;
        let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Ok(Some(format!("data:image/webp;base64,{}", encoded)))
    }

    /// Deletes all on-disk preview cache files associated with a file (part, map, probe)
    pub async fn delete_file_cache(&self, file_id: &str) {
        let part_path = self.preview_cache_dir.join(format!("{}.part", file_id));
        let map_path = self.preview_cache_dir.join(format!("{}.map", file_id));
        let probe_path = self.preview_cache_dir.join(format!("{}.probe.json", file_id));
        let thumb_path = self.thumbnail_dir.join(format!("{}.webp", file_id));

        let _ = fs::remove_file(part_path).await;
        let _ = fs::remove_file(map_path).await;
        let _ = fs::remove_file(probe_path).await;
        let _ = fs::remove_file(thumb_path).await;

        self.cached_blocks.write().await.remove(file_id);
        self.file_metadata_cache.write().await.remove(file_id);
    }

    /// Clears the entire preview cache directory
    pub async fn clear_preview_cache(&self) -> Result<(), AppError> {
        let mut entries = fs::read_dir(&self.preview_cache_dir).await?;
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.is_file() {
                let _ = fs::remove_file(path).await;
            }
        }
        self.cached_blocks.write().await.clear();
        Ok(())
    }

    /// Best-effort cache of head (first 1 MB) and tail (moov) for locally uploaded files
    pub async fn cache_local_upload_head_tail(
        &self,
        file_id: &str,
        source_path: &Path,
        total_size: i64,
    ) {
        if total_size <= 0 {
            return;
        }
        let part_path = self.preview_cache_dir.join(format!("{}.part", file_id));
        let map_path = self.preview_cache_dir.join(format!("{}.map", file_id));

        let mut src_file = match File::open(source_path).await {
            Ok(f) => f,
            Err(_) => return,
        };

        let mut part_file = match OpenOptions::new()
            .create(true)
            .write(true)
            .read(true)
            .open(&part_path)
            .await
        {
            Ok(f) => f,
            Err(_) => return,
        };
        let _ = part_file.set_len(total_size as u64).await;

        let mut cached_set = HashSet::new();

        // Copy first 1 MB (blocks 0 and 1)
        let head_size = (1024 * 1024).min(total_size as usize);
        let mut head_buf = vec![0u8; head_size];
        if src_file.read_exact(&mut head_buf).await.is_ok() {
            let _ = part_file.seek(SeekFrom::Start(0)).await;
            let _ = part_file.write_all(&head_buf).await;
            let blocks_in_head = (head_size + BLOCK_SIZE - 1) / BLOCK_SIZE;
            for b in 0..blocks_in_head {
                cached_set.insert(b);
            }
        }

        // Copy last 2 MB (tail)
        if total_size > 2 * 1024 * 1024 {
            let tail_start = total_size as u64 - 2 * 1024 * 1024;
            if src_file.seek(SeekFrom::Start(tail_start)).await.is_ok() {
                let mut tail_buf = vec![0u8; 2 * 1024 * 1024];
                if src_file.read_exact(&mut tail_buf).await.is_ok() {
                    let _ = part_file.seek(SeekFrom::Start(tail_start)).await;
                    let _ = part_file.write_all(&tail_buf).await;
                    let start_b = (tail_start / BLOCK_SIZE as u64) as usize;
                    let end_b = (total_size as u64 / BLOCK_SIZE as u64) as usize;
                    for b in start_b..=end_b {
                        cached_set.insert(b);
                    }
                }
            }
        }

        save_block_map(&map_path, total_size as u64, &cached_set).await;
        self.cached_blocks.write().await.insert(file_id.to_string(), cached_set);
        eprintln!("[PreviewStream] Cached local upload head/tail for {file_id}");
    }

    /// Enforces preview cache quota using LRU eviction
    async fn evict_preview_cache_if_needed(&self) -> Result<(), AppError> {
        let max_bytes = if cfg!(target_os = "android") {
            DEFAULT_MAX_CACHE_ANDROID
        } else {
            DEFAULT_MAX_CACHE_DESKTOP
        };

        let mut files = Vec::new();
        let mut total_usage: u64 = 0;

        let mut entries = fs::read_dir(&self.preview_cache_dir).await?;
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("part") {
                if let Ok(meta) = entry.metadata().await {
                    let len = meta.len();
                    total_usage += len;
                    let mtime = meta.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                    files.push((path, len, mtime));
                }
            }
        }

        if total_usage > max_bytes {
            eprintln!(
                "[PreviewStream] Cache usage ({total_usage} bytes) exceeds limit ({max_bytes} bytes). Evicting LRU files..."
            );
            files.sort_by_key(|(_, _, mtime)| *mtime);
            let target_usage = (max_bytes as f64 * 0.8) as u64;

            for (path, len, _) in files {
                if total_usage <= target_usage {
                    break;
                }
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    let f_id = stem.to_string();
                    let map_path = self.preview_cache_dir.join(format!("{f_id}.map"));
                    let probe_path = self.preview_cache_dir.join(format!("{f_id}.probe.json"));
                    let _ = fs::remove_file(&path).await;
                    let _ = fs::remove_file(&map_path).await;
                    let _ = fs::remove_file(&probe_path).await;
                    self.cached_blocks.write().await.remove(&f_id);
                    total_usage = total_usage.saturating_sub(len);
                }
            }
        }

        Ok(())
    }

    pub async fn get_preview_text(
        &self,
        file_id: &str,
        max_bytes: Option<usize>,
    ) -> Result<String, AppError> {
        let (file_record, chunks) = self.get_cached_metadata(file_id).await?;
        let limit = max_bytes
            .unwrap_or(256 * 1024)
            .min(file_record.total_size_bytes as usize);
        if limit == 0 {
            return Ok(String::new());
        }

        let slice = self
            .read_byte_range(file_id, &file_record, &chunks, 0, (limit - 1) as u64)
            .await?;

        Ok(String::from_utf8_lossy(&slice).to_string())
    }

    /// Caches file record and chunks in memory to prevent blocking SQLite calls on streaming thread
    pub async fn get_cached_metadata(
        &self,
        file_id: &str,
    ) -> Result<(FileRecord, Arc<[FileChunkRecord]>), AppError> {
        {
            let map = self.file_metadata_cache.read().await;
            if let Some(meta) = map.get(file_id) {
                return Ok(meta.clone());
            }
        }

        let db = Arc::clone(&self.db);
        let f_id = file_id.to_string();
        let (file_record, chunks) = tokio::task::spawn_blocking(move || -> Result<_, AppError> {
            let fr = db
                .get_file(&f_id)?
                .ok_or_else(|| AppError::FileNotFound(f_id.clone()))?;
            let ch = db.get_chunks_for_file(&f_id)?;
            Ok((fr, ch.into_boxed_slice().into()))
        })
        .await
        .map_err(|e| AppError::Io(format!("DB task join error: {e}")))??;

        let result = (file_record, chunks);
        self.file_metadata_cache
            .write()
            .await
            .insert(file_id.to_string(), result.clone());
        Ok(result)
    }

    /// Non-blocking warm-up of preview stream: resolves chunk locations, warms DC, and pre-fetches head/tail
    pub async fn prepare_preview(
        &self,
        file_id: &str,
        app_handle: &AppHandle,
    ) -> Result<(), AppError> {
        let t0 = Instant::now();
        eprintln!("[PreviewStream] Preparing preview for {file_id}...");

        let _ = self.get_or_create_cancel_flag(file_id);
        let (file_record, chunks) = self.get_cached_metadata(file_id).await?;
        let total_size = file_record.total_size_bytes as u64;
        if total_size == 0 || chunks.is_empty() {
            return Ok(());
        }

        // Emit status: resolving
        let _ = app_handle.emit(
            "preview://status",
            PreviewStatusEvent {
                file_id: file_id.to_string(),
                stage: "resolving".to_string(),
                message: "Resolving Telegram chunks...".to_string(),
                cached_bytes: 0,
                total_bytes: total_size,
                speed_bps: 0,
            },
        );

        // Select sticky stream bot
        let (worker_client, worker_id, _bot_username, target_channel_peer) =
            self.bot_pool.select_worker().await?;
        self.sticky_bots
            .write()
            .await
            .insert(file_id.to_string(), worker_id.clone());

        // Batch resolve all chunk message IDs in ONE single MTProto call
        let msg_ids: Vec<i32> = chunks
            .iter()
            .filter_map(|c| c.telegram_message_id.map(|id| id as i32))
            .collect();

        let t_lookup = Instant::now();
        let msgs = worker_client
            .get_messages_by_id(target_channel_peer, &msg_ids)
            .await
            .map_err(|e| AppError::Telegram(format!("Batched get_messages_by_id failed: {e}")))?;
        eprintln!(
            "[PreviewStream] Batched lookup for {} chunk messages took {}ms",
            msg_ids.len(),
            t_lookup.elapsed().as_millis()
        );

        let mut primary_dc = 2;
        let mut first_loc = None;
        {
            let mut locs = self.chunk_locations.write().await;
            for (idx, msg_opt) in msgs.into_iter().enumerate() {
                if let Some(msg) = msg_opt {
                    if let Some(media) = msg.media() {
                        if let Some(loc) = media.to_raw_input_location() {
                            let dc = media.dc_id().unwrap_or(2);
                            if first_loc.is_none() {
                                first_loc = Some(loc.clone());
                                primary_dc = dc;
                            }
                            if idx < msg_ids.len() {
                                locs.insert((worker_id.clone(), msg_ids[idx]), (loc, dc));
                            }
                        }
                    }
                }
            }
        }

        // Emit status: connecting
        let _ = app_handle.emit(
            "preview://status",
            PreviewStatusEvent {
                file_id: file_id.to_string(),
                stage: "connecting".to_string(),
                message: "Connecting to media datacenter...".to_string(),
                cached_bytes: 0,
                total_bytes: total_size,
                speed_bps: 0,
            },
        );

        // Warm DC connection for the sticky stream bot with tiny 4096 request
        if let Some(loc) = first_loc {
            let t_dc = Instant::now();
            let req = tl::functions::upload::GetFile {
                precise: true,
                cdn_supported: false,
                location: loc,
                offset: 0,
                limit: 4096,
            };
            let _ = worker_client.invoke_in_dc(primary_dc, &req).await;
            eprintln!(
                "[PreviewStream] DC {primary_dc} connection warm-up took {}ms",
                t_dc.elapsed().as_millis()
            );
        }

        // Emit status: fetching_header
        let _ = app_handle.emit(
            "preview://status",
            PreviewStatusEvent {
                file_id: file_id.to_string(),
                stage: "fetching_header".to_string(),
                message: "Prefetching video header and index...".to_string(),
                cached_bytes: 0,
                total_bytes: total_size,
                speed_bps: 0,
            },
        );

        // Fetch block 0 and tail blocks in parallel
        let self_head = self.clone();
        let f_id = file_id.to_string();
        let fr_clone = file_record.clone();
        let ch_clone = chunks.clone();
        let head_handle = tokio::spawn(async move {
            let _ = self_head
                .read_byte_range(&f_id, &fr_clone, &ch_clone, 0, (BLOCK_SIZE as u64 - 1).min(total_size - 1))
                .await;
        });

        let self_tail = self.clone();
        let f_id2 = file_id.to_string();
        let fr_clone2 = file_record.clone();
        let ch_clone2 = chunks.clone();
        let tail_handle = tokio::spawn(async move {
            let tail_len = (2 * 1024 * 1024).min(total_size);
            let tail_start = total_size - tail_len;
            let _ = self_tail
                .read_byte_range(&f_id2, &fr_clone2, &ch_clone2, tail_start, total_size - 1)
                .await;
        });

        let _ = tokio::join!(head_handle, tail_handle);

        // Probe media metadata and ensure entire moov box is cached if at end
        let self_probe = self.clone();
        let f_id3 = file_id.to_string();
        let app_handle_clone = app_handle.clone();
        tokio::spawn(async move {
            if let Ok(probe) = self_probe.probe_media(&f_id3).await {
                if probe.moov_at_end {
                    if let (Some(offset), Some(size)) = (probe.moov_offset, probe.moov_size) {
                        eprintln!("[PreviewStream] moov atom at end: fetching {size} bytes at offset {offset}");
                        if let Ok((fr, ch)) = self_probe.get_cached_metadata(&f_id3).await {
                            let _ = self_probe
                                .read_byte_range(&f_id3, &fr, &ch, offset, offset + size - 1)
                                .await;
                        }
                    }
                }
            }
            let _ = app_handle_clone.emit(
                "preview://status",
                PreviewStatusEvent {
                    file_id: f_id3,
                    stage: "ready".to_string(),
                    message: "Stream ready".to_string(),
                    cached_bytes: 0,
                    total_bytes: total_size,
                    speed_bps: 0,
                },
            );
        });

        eprintln!(
            "[PreviewStream] prepare_preview completed initial stage in {}ms",
            t0.elapsed().as_millis()
        );
        Ok(())
    }

    /// Probes media container and codecs using partial header/tail range reads
    pub async fn probe_media(&self, file_id: &str) -> Result<MediaProbe, AppError> {
        let probe_file = self.preview_cache_dir.join(format!("{}.probe.json", file_id));
        if probe_file.exists() {
            if let Ok(bytes) = fs::read(&probe_file).await {
                if let Ok(probe) = serde_json::from_slice::<MediaProbe>(&bytes) {
                    return Ok(probe);
                }
            }
        }

        let (file_record, chunks) = self.get_cached_metadata(file_id).await?;
        let total_size = file_record.total_size_bytes as u64;

        if total_size == 0 {
            return Ok(MediaProbe {
                container: "empty".to_string(),
                video_codec: None,
                audio_codec: None,
                width: None,
                height: None,
                duration_secs: None,
                moov_at_end: false,
                moov_offset: None,
                moov_size: None,
                webview_likely_playable: false,
                reason: "File is empty".to_string(),
            });
        }

        // Read first 256 KB
        let head_len = (256 * 1024).min(total_size);
        let head_bytes = self
            .read_byte_range(file_id, &file_record, &chunks, 0, head_len - 1)
            .await?;

        // 1. Try EBML / Matroska / WebM
        if let Some((container, v_codec, a_codec)) = parse_ebml(&head_bytes) {
            let (playable, reason) = evaluate_webview_playability(
                &container,
                v_codec.as_deref(),
                a_codec.as_deref(),
            );
            let probe = MediaProbe {
                container,
                video_codec: v_codec,
                audio_codec: a_codec,
                width: None,
                height: None,
                duration_secs: None,
                moov_at_end: false,
                moov_offset: None,
                moov_size: None,
                webview_likely_playable: playable,
                reason,
            };
            let _ = fs::write(&probe_file, serde_json::to_vec(&probe).unwrap_or_default()).await;
            return Ok(probe);
        }

        // 2. Try ISO-BMFF (MP4/MOV)
        let head_boxes = parse_isobmff_boxes(&head_bytes, 0, total_size);
        let mut moov_box = head_boxes.iter().find(|b| b.fourcc == *b"moov").cloned();
        let mdat_box = head_boxes.iter().find(|b| b.fourcc == *b"mdat").cloned();

        let mut moov_at_end = false;
        let mut moov_offset = None;
        let mut moov_size = None;

        if let Some(ref mb) = moov_box {
            moov_offset = Some(mb.offset);
            moov_size = Some(mb.size);
            if let Some(ref mdat) = mdat_box {
                moov_at_end = mb.offset > mdat.offset;
            }
        } else {
            // moov not in head -> check tail (last 2 MB)
            moov_at_end = true;
            let tail_len = (2 * 1024 * 1024).min(total_size);
            let tail_start = total_size - tail_len;
            let tail_bytes = self
                .read_byte_range(file_id, &file_record, &chunks, tail_start, total_size - 1)
                .await?;

            let tail_boxes = parse_isobmff_boxes(&tail_bytes, tail_start, total_size);
            if let Some(tb) = tail_boxes.iter().find(|b| b.fourcc == *b"moov") {
                moov_offset = Some(tb.offset);
                moov_size = Some(tb.size);
                moov_box = Some(tb.clone());
            }
        }

        let mut video_codec = None;
        let mut audio_codec = None;
        let mut width = None;
        let mut height = None;
        let mut duration_secs = None;

        if let Some(ref mb) = moov_box {
            // Read entire moov box if needed
            let moov_bytes = self
                .read_byte_range(file_id, &file_record, &chunks, mb.offset, mb.offset + mb.size - 1)
                .await?;
            if moov_bytes.len() >= mb.header_size as usize {
                let payload = &moov_bytes[mb.header_size as usize..];
                let (vc, ac, w, h, dur) = parse_moov_payload(payload);
                video_codec = vc;
                audio_codec = ac;
                width = w;
                height = h;
                duration_secs = dur;
            }
        }

        let container = if !head_boxes.is_empty() {
            "mp4".to_string()
        } else {
            guess_container_from_name(&file_record.name)
        };

        let (playable, reason) = evaluate_webview_playability(
            &container,
            video_codec.as_deref(),
            audio_codec.as_deref(),
        );

        let probe = MediaProbe {
            container,
            video_codec,
            audio_codec,
            width,
            height,
            duration_secs,
            moov_at_end,
            moov_offset,
            moov_size,
            webview_likely_playable: playable,
            reason,
        };

        let _ = fs::write(&probe_file, serde_json::to_vec(&probe).unwrap_or_default()).await;
        Ok(probe)
    }

    /// Read an arbitrary byte range from local cache, fetching any missing blocks from Telegram MTProto
    pub async fn read_byte_range(
        &self,
        file_id: &str,
        file_record: &FileRecord,
        chunks: &[FileChunkRecord],
        start: u64,
        end: u64,
    ) -> Result<Vec<u8>, AppError> {
        let total_size = file_record.total_size_bytes as u64;
        if total_size == 0 || start >= total_size {
            return Ok(Vec::new());
        }

        let clamped_end = end.min(total_size - 1);
        if start > clamped_end {
            return Ok(Vec::new());
        }

        let part_path = self.preview_cache_dir.join(format!("{}.part", file_id));
        let map_path = self.preview_cache_dir.join(format!("{}.map", file_id));

        // Initialize block map from disk if not yet loaded in memory
        self.ensure_block_map_loaded(file_id, &map_path, &part_path, total_size).await?;

        let start_block = (start / BLOCK_SIZE as u64) as usize;
        let end_block = (clamped_end / BLOCK_SIZE as u64) as usize;

        // Identify missing blocks
        let mut missing_blocks = Vec::new();
        {
            let map = self.cached_blocks.read().await;
            if let Some(cached) = map.get(file_id) {
                for b_idx in start_block..=end_block {
                    if !cached.contains(&b_idx) {
                        missing_blocks.push(b_idx);
                    }
                }
            } else {
                for b_idx in start_block..=end_block {
                    missing_blocks.push(b_idx);
                }
            }
        }

        // Fetch missing foreground blocks concurrently
        if missing_blocks.len() == 1 {
            self.fetch_and_cache_block(file_id, chunks, total_size, missing_blocks[0], &part_path, &map_path)
                .await?;
        } else if !missing_blocks.is_empty() {
            let mut handles = Vec::new();
            for block_idx in missing_blocks {
                let self_clone = self.clone();
                let f_id = file_id.to_string();
                let ch_vec = chunks.to_vec();
                let p_path = part_path.clone();
                let m_path = map_path.clone();
                handles.push(tokio::spawn(async move {
                    self_clone
                        .fetch_and_cache_block(&f_id, &ch_vec, total_size, block_idx, &p_path, &m_path)
                        .await
                }));
            }
            for handle in handles {
                handle.await.map_err(|e| AppError::Io(format!("Foreground block fetch joined with error: {e}")))??;
            }
        }

        // Adaptive background read-ahead prefetch (Phase 1 & 1b)
        let prefetch_depth = self.read_ahead_limit.load(Ordering::Relaxed).min(8);
        if prefetch_depth > 0 && !self.is_cancelled(file_id) {
            let prefetch_self = self.clone();
            let pf_id = file_id.to_string();
            let pf_chunks = chunks.to_vec();
            let pf_part = part_path.clone();
            let pf_map = map_path.clone();
            tokio::spawn(async move {
                let max_b = (total_size / BLOCK_SIZE as u64) as usize;
                for next_b in (end_block + 1)..=(end_block + prefetch_depth).min(max_b) {
                    if prefetch_self.is_cancelled(&pf_id) {
                        break;
                    }
                    let is_cached = {
                        let map = prefetch_self.cached_blocks.read().await;
                        map.get(&pf_id).map_or(false, |s| s.contains(&next_b))
                    };
                    if !is_cached {
                        let _ = prefetch_self
                            .fetch_and_cache_block(&pf_id, &pf_chunks, total_size, next_b, &pf_part, &pf_map)
                            .await;
                    }
                }
            });
        }

        // Read requested slice from part file
        let slice_len = (clamped_end - start + 1) as usize;
        let mut file = File::open(&part_path).await?;
        file.seek(SeekFrom::Start(start)).await?;
        let mut buf = vec![0u8; slice_len];
        file.read_exact(&mut buf).await?;

        Ok(buf)
    }

    async fn ensure_block_map_loaded(
        &self,
        file_id: &str,
        map_path: &Path,
        part_path: &Path,
        total_size: u64,
    ) -> Result<(), AppError> {
        let is_loaded = {
            let map = self.cached_blocks.read().await;
            map.contains_key(file_id)
        };
        if is_loaded {
            return Ok(());
        }

        // Ensure part file exists on disk
        if !part_path.exists() {
            let file = OpenOptions::new()
                .create(true)
                .write(true)
                .read(true)
                .open(part_path)
                .await?;
            let _ = file.set_len(total_size).await;
        }

        let loaded = load_block_map(map_path, total_size).await.unwrap_or_default();
        self.cached_blocks
            .write()
            .await
            .insert(file_id.to_string(), loaded);
        Ok(())
    }

    async fn fetch_and_cache_block(
        &self,
        file_id: &str,
        chunks: &[FileChunkRecord],
        total_size: u64,
        block_idx: usize,
        part_path: &PathBuf,
        map_path: &PathBuf,
    ) -> Result<(), AppError> {
        let block_global_offset = (block_idx * BLOCK_SIZE) as u64;
        if block_global_offset >= total_size {
            return Ok(());
        }

        // Check if already cached
        {
            let map = self.cached_blocks.read().await;
            if let Some(set) = map.get(file_id) {
                if set.contains(&block_idx) {
                    return Ok(());
                }
            }
        }

        // Synchronize in-flight fetches: only one task downloads a given block, others await completion
        let fetch_key = (file_id.to_string(), block_idx);
        let (mut waiter_rx, is_leader) = {
            let mut active = self.active_fetches.write().await;
            if let Some(sender) = active.get(&fetch_key) {
                (sender.subscribe(), false)
            } else {
                let (tx, rx) = broadcast::channel(2);
                active.insert(fetch_key.clone(), tx);
                (rx, true)
            }
        };

        if !is_leader {
            // Await broadcast from leader task
            match waiter_rx.recv().await {
                Ok(Ok(())) => return Ok(()),
                Ok(Err(err_msg)) => return Err(AppError::Telegram(err_msg)),
                Err(_) => {
                    // Leader dropped or finished
                    let map = self.cached_blocks.read().await;
                    if map.get(file_id).map_or(false, |s| s.contains(&block_idx)) {
                        return Ok(());
                    }
                }
            }
        }

        // Bounded concurrency + rate limit for MTProto preview calls
        let _permit = self.global_mtproto_semaphore.acquire().await.ok();
        self.apply_rate_limit().await;

        let block_end = ((block_idx + 1) * BLOCK_SIZE as usize).min(total_size as usize) as u64;
        let block_bytes_to_fetch = (block_end - block_global_offset) as usize;

        let fetch_res = self
            .fetch_block_bytes(file_id, chunks, block_global_offset, block_bytes_to_fetch)
            .await;

        match fetch_res {
            Ok(block_data) => {
                // Write block to part file at positional global offset
                let mut file = OpenOptions::new().write(true).open(part_path).await?;
                file.seek(SeekFrom::Start(block_global_offset)).await?;
                file.write_all(&block_data).await?;
                file.flush().await?;

                // Update in-memory set and persist block map
                {
                    let mut map = self.cached_blocks.write().await;
                    let set = map.entry(file_id.to_string()).or_default();
                    set.insert(block_idx);
                    let _ = save_block_map(map_path, total_size, set).await;
                }

                // Notify all concurrent waiters
                if let Some(tx) = self.active_fetches.write().await.remove(&fetch_key) {
                    let _ = tx.send(Ok(()));
                }

                // AIMD success adaptation: grow read-ahead limit up to 8
                let curr = self.read_ahead_limit.load(Ordering::Relaxed);
                if curr < 8 {
                    self.read_ahead_limit.fetch_add(1, Ordering::Relaxed);
                }

                Ok(())
            }
            Err(e) => {
                let err_str = e.to_string();
                if let Some(tx) = self.active_fetches.write().await.remove(&fetch_key) {
                    let _ = tx.send(Err(err_str));
                }
                Err(e)
            }
        }
    }

    async fn apply_rate_limit(&self) {
        let mut last_tick = self.rate_limiter_last_tick.lock().await;
        let elapsed = last_tick.elapsed();
        // Min 30ms between MTProto preview requests (conservative ceiling ~33 req/s)
        let min_interval = Duration::from_millis(30);
        if elapsed < min_interval {
            tokio::time::sleep(min_interval - elapsed).await;
        }
        *last_tick = Instant::now();
    }

    /// Fetches byte range across chunk boundary if needed
    async fn fetch_block_bytes(
        &self,
        file_id: &str,
        chunks: &[FileChunkRecord],
        global_offset: u64,
        total_len: usize,
    ) -> Result<Vec<u8>, AppError> {
        let mut accumulated = Vec::with_capacity(total_len);
        let mut curr_offset = global_offset;
        let mut remaining = total_len;

        while remaining > 0 {
            // Find chunk covering curr_offset
            let chunk = chunks.iter().find(|c| {
                let c_start = c.byte_offset as u64;
                let c_end = c_start + c.byte_length as u64;
                curr_offset >= c_start && curr_offset < c_end
            }).ok_or_else(|| AppError::Validation(format!("No chunk found covering offset {curr_offset}")))?;

            let c_start = chunk.byte_offset as u64;
            let c_len = chunk.byte_length as u64;
            let offset_in_chunk = curr_offset - c_start;
            let available_in_chunk = (c_len - offset_in_chunk) as usize;
            let to_fetch = remaining.min(available_in_chunk);

            let part_data = self
                .fetch_chunk_slice_with_retries(file_id, chunk, offset_in_chunk, to_fetch)
                .await?;

            accumulated.extend_from_slice(&part_data);
            curr_offset += part_data.len() as u64;
            remaining = remaining.saturating_sub(part_data.len());
        }

        Ok(accumulated)
    }

    async fn fetch_chunk_slice_with_retries(
        &self,
        file_id: &str,
        chunk: &FileChunkRecord,
        chunk_offset: u64,
        limit: usize,
    ) -> Result<Vec<u8>, AppError> {
        let msg_id = chunk.telegram_message_id.ok_or_else(|| {
            AppError::Telegram(format!("Chunk {} has no message ID", chunk.chunk_index))
        })? as i32;

        let mut attempts = 0;
        const MAX_ATTEMPTS: usize = 4;
        let mut excluded_bots = Vec::new();

        while attempts < MAX_ATTEMPTS {
            attempts += 1;

            // Use sticky stream bot if available, otherwise select worker excluding failed bots
            let sticky_bot_id = self.sticky_bots.read().await.get(file_id).cloned();
            let is_sticky_valid = match sticky_bot_id.as_ref() {
                Some(id) => attempts == 1 && !excluded_bots.contains(id),
                None => false,
            };
            let (worker_client, worker_id, _bot_username, target_channel_peer) =
                if is_sticky_valid {
                    match self.bot_pool.select_worker().await {
                        Ok(w) => w,
                        Err(e) => {
                            eprintln!("[PreviewStream] Sticky worker acquire error: {e}");
                            self.bot_pool.select_worker_excluding(&excluded_bots).await?
                        }
                    }
                } else {
                    self.bot_pool.select_worker_excluding(&excluded_bots).await?
                };

            // Check cached location for (worker_id, msg_id)
            let cache_key = (worker_id.clone(), msg_id);
            let cached_loc = {
                let map = self.chunk_locations.read().await;
                map.get(&cache_key).cloned()
            };

            let (location, mut dc_id) = match cached_loc {
                Some((loc, dc)) => (loc, dc),
                None => {
                    let msgs = match worker_client.get_messages_by_id(target_channel_peer, &[msg_id]).await {
                        Ok(m) => m,
                        Err(err) => {
                            if let Some(wait_secs) = extract_flood_wait_secs(&err) {
                                eprintln!("[PreviewStream] FLOOD_WAIT {wait_secs}s on bot {worker_id}");
                                self.bot_pool.report_flood_wait(&worker_id, wait_secs).await;
                                // AIMD: halve read-ahead limit on flood
                                let cur = self.read_ahead_limit.load(Ordering::Relaxed);
                                self.read_ahead_limit.store((cur / 2).max(1), Ordering::Relaxed);
                                excluded_bots.push(worker_id);
                                continue;
                            }
                            excluded_bots.push(worker_id);
                            continue;
                        }
                    };

                    let msg = match msgs.into_iter().next().flatten() {
                        Some(m) => m,
                        None => {
                            excluded_bots.push(worker_id);
                            continue;
                        }
                    };

                    let media = match msg.media() {
                        Some(m) => m,
                        None => {
                            excluded_bots.push(worker_id);
                            continue;
                        }
                    };

                    let loc = match media.to_raw_input_location() {
                        Some(l) => l,
                        None => {
                            excluded_bots.push(worker_id);
                            continue;
                        }
                    };

                    let dc = media.dc_id().unwrap_or(2);
                    self.chunk_locations
                        .write()
                        .await
                        .insert(cache_key.clone(), (loc.clone(), dc));
                    (loc, dc)
                }
            };

            // Telegram upload.getFile requires offset & limit aligned to 4KB (4096)
            let aligned_offset = (chunk_offset / 4096) * 4096;
            let offset_delta = (chunk_offset - aligned_offset) as usize;
            let raw_len = limit + offset_delta;
            let aligned_limit = (((raw_len + 4095) / 4096) * 4096).min(1024 * 1024);

            let req = tl::functions::upload::GetFile {
                precise: true,
                cdn_supported: false,
                location: location.clone(),
                offset: aligned_offset as i64,
                limit: aligned_limit as i32,
            };

            let t_fetch = Instant::now();
            match worker_client.invoke_in_dc(dc_id, &req).await {
                Ok(tl::enums::upload::File::File(f)) => {
                    let mut data = f.bytes;
                    if offset_delta > 0 && offset_delta < data.len() {
                        data = data.split_off(offset_delta);
                    }
                    if data.len() > limit {
                        data.truncate(limit);
                    }
                    eprintln!(
                        "[PreviewStream] Fetched {} bytes for chunk {} (took {}ms, bot: {worker_id})",
                        data.len(),
                        chunk.chunk_index,
                        t_fetch.elapsed().as_millis()
                    );
                    return Ok(data);
                }
                Ok(tl::enums::upload::File::CdnRedirect(_)) => {
                    continue;
                }
                Err(InvocationError::Rpc(err)) => {
                    if err.code == 303 {
                        if let Some(new_dc) = err.value {
                            dc_id = new_dc as i32;
                            self.chunk_locations
                                .write()
                                .await
                                .insert(cache_key, (location.clone(), dc_id));
                            continue;
                        }
                    }

                    let err_name = &err.name;
                    // On location expiration or invalid access hash: invalidate cache entry!
                    if err_name.contains("FILE_REFERENCE")
                        || err_name.contains("ACCESS_HASH")
                        || err_name.contains("FILE_ID_INVALID")
                        || err_name.contains("LOCATION_INVALID")
                    {
                        eprintln!("[PreviewStream] Evicting expired location for {worker_id}:{msg_id} ({err_name})");
                        self.chunk_locations.write().await.remove(&cache_key);
                    }

                    if let Some(wait_secs) = extract_flood_wait_secs(&InvocationError::Rpc(err.clone())) {
                        eprintln!("[PreviewStream] RPC FLOOD_WAIT {wait_secs}s on bot {worker_id}");
                        self.bot_pool.report_flood_wait(&worker_id, wait_secs).await;
                        let cur = self.read_ahead_limit.load(Ordering::Relaxed);
                        self.read_ahead_limit.store((cur / 2).max(1), Ordering::Relaxed);
                        excluded_bots.push(worker_id);
                        continue;
                    }

                    excluded_bots.push(worker_id);
                }
                Err(e) => {
                    eprintln!("[PreviewStream] Network error in block fetch: {e}");
                    excluded_bots.push(worker_id);
                }
            }
        }

        Err(AppError::Telegram(format!(
            "Failed to fetch block for chunk {} at offset {}",
            chunk.chunk_index, chunk_offset
        )))
    }
}

/// Helper to serialize cached block set to compact bitmap on disk
async fn save_block_map(path: &Path, total_size: u64, cached_blocks: &HashSet<usize>) {
    let num_blocks = ((total_size + BLOCK_SIZE as u64 - 1) / BLOCK_SIZE as u64) as usize;
    let byte_count = (num_blocks + 7) / 8;
    let mut bitmap = vec![0u8; byte_count];

    for &b in cached_blocks {
        if b < num_blocks {
            bitmap[b / 8] |= 1 << (b % 8);
        }
    }

    let mut data = Vec::with_capacity(24 + bitmap.len());
    data.extend_from_slice(b"TCBMAP02");
    data.extend_from_slice(&total_size.to_be_bytes());
    data.extend_from_slice(&(BLOCK_SIZE as u32).to_be_bytes());
    data.extend_from_slice(&(num_blocks as u32).to_be_bytes());
    data.extend_from_slice(&bitmap);

    let _ = fs::write(path, data).await;
}

/// Helper to load cached block set from bitmap on disk
async fn load_block_map(path: &Path, expected_size: u64) -> Option<HashSet<usize>> {
    let data = fs::read(path).await.ok()?;
    if data.len() < 24 || &data[0..8] != b"TCBMAP02" {
        return None;
    }
    let stored_size = u64::from_be_bytes([
        data[8], data[9], data[10], data[11], data[12], data[13], data[14], data[15],
    ]);
    if stored_size != expected_size {
        return None;
    }

    let num_blocks = u32::from_be_bytes([data[20], data[21], data[22], data[23]]) as usize;
    let bitmap = &data[24..];
    let mut set = HashSet::new();

    for b in 0..num_blocks {
        let byte_idx = b / 8;
        if byte_idx < bitmap.len() {
            if (bitmap[byte_idx] & (1 << (b % 8))) != 0 {
                set.insert(b);
            }
        }
    }

    Some(set)
}

fn guess_container_from_name(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.ends_with(".mp4") || lower.ends_with(".m4v") {
        "mp4".to_string()
    } else if lower.ends_with(".webm") {
        "webm".to_string()
    } else if lower.ends_with(".mkv") {
        "matroska".to_string()
    } else if lower.ends_with(".mov") {
        "quicktime".to_string()
    } else if lower.ends_with(".avi") {
        "avi".to_string()
    } else if lower.ends_with(".ts") {
        "ts".to_string()
    } else {
        "unknown".to_string()
    }
}

pub fn guess_mime_type_from_name(name: &str) -> &'static str {
    let lower = name.to_lowercase();
    if lower.ends_with(".mp4") || lower.ends_with(".m4v") {
        "video/mp4"
    } else if lower.ends_with(".webm") {
        "video/webm"
    } else if lower.ends_with(".mkv") {
        "video/x-matroska"
    } else if lower.ends_with(".mov") {
        "video/quicktime"
    } else if lower.ends_with(".avi") {
        "video/x-msvideo"
    } else if lower.ends_with(".ts") {
        "video/mp2t"
    } else if lower.ends_with(".mp3") {
        "audio/mpeg"
    } else if lower.ends_with(".wav") {
        "audio/wav"
    } else if lower.ends_with(".flac") {
        "audio/flac"
    } else if lower.ends_with(".ogg") || lower.ends_with(".opus") {
        "audio/ogg"
    } else if lower.ends_with(".pdf") {
        "application/pdf"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".svg") {
        "image/svg+xml"
    } else if lower.ends_with(".txt") || lower.ends_with(".log") || lower.ends_with(".md") {
        "text/plain; charset=utf-8"
    } else if lower.ends_with(".json") {
        "application/json"
    } else if lower.ends_with(".html") || lower.ends_with(".htm") {
        "text/html; charset=utf-8"
    } else {
        "application/octet-stream"
    }
}

/// Starts loopback HTTP streaming server strictly bound to 127.0.0.1 (no 0.0.0.0 exposure)
pub async fn start_preview_server(manager: Arc<PreviewStreamManager>) -> Result<(), AppError> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| AppError::Io(format!("Failed to bind loopback preview stream server: {e}")))?;

    let local_addr = listener
        .local_addr()
        .map_err(|e| AppError::Io(format!("Failed to retrieve local address: {e}")))?;

    let port = local_addr.port();
    manager.port.store(port, Ordering::Relaxed);
    eprintln!("===> TeleCloud preview stream server listening on http://127.0.0.1:{port}");

    let mgr = Arc::clone(&manager);
    tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((socket, _)) => {
                    let mgr_clone = Arc::clone(&mgr);
                    tokio::spawn(async move {
                        if let Err(e) = handle_http_connection(socket, mgr_clone).await {
                            let err_str = e.to_string();
                            if !err_str.contains("connection reset") && !err_str.contains("broken pipe") {
                                eprintln!("[PreviewStream] Connection error: {e}");
                            }
                        }
                    });
                }
                Err(e) => {
                    eprintln!("[PreviewStream] Accept error: {e}");
                }
            }
        }
    });

    Ok(())
}

/// Handles persistent HTTP/1.1 connections with keep-alive support
async fn handle_http_connection(
    mut stream: TcpStream,
    mgr: Arc<PreviewStreamManager>,
) -> Result<(), AppError> {
    let mut buffer = Vec::with_capacity(4096);
    let mut temp_buf = [0u8; 2048];

    loop {
        let n = stream.read(&mut temp_buf).await?;
        if n == 0 {
            return Ok(());
        }
        buffer.extend_from_slice(&temp_buf[..n]);

        if buffer.len() > 16384 {
            let err_resp = "HTTP/1.1 431 Request Header Fields Too Large\r\nConnection: close\r\n\r\n";
            let _ = stream.write_all(err_resp.as_bytes()).await;
            return Ok(());
        }

        // Check if header delimiter is reached
        if let Some(pos) = buffer.windows(4).position(|w| w == b"\r\n\r\n") {
            let header_str = String::from_utf8_lossy(&buffer[..pos]).to_string();
            let rem_bytes = buffer[pos + 4..].to_vec();
            buffer = rem_bytes;

            let mut lines = header_str.lines();
            let req_line = match lines.next() {
                Some(l) => l,
                None => continue,
            };

            let parts: Vec<&str> = req_line.split_whitespace().collect();
            if parts.len() < 2 {
                continue;
            }

            let method = parts[0];
            let path = parts[1];

            // Parse headers
            let mut range_header = None;
            let mut connection_header = None;
            for line in lines {
                let lower = line.to_lowercase();
                if lower.starts_with("range:") {
                    range_header = Some(line[6..].trim().to_string());
                } else if lower.starts_with("connection:") {
                    connection_header = Some(line[11..].trim().to_lowercase());
                }
            }

            let keep_alive = connection_header.as_deref() != Some("close");

            // Handle CORS preflight
            if method == "OPTIONS" {
                let resp = "HTTP/1.1 204 No Content\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
                    Access-Control-Allow-Headers: Range, Content-Type, Accept, Origin\r\n\
                    Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n\
                    Cross-Origin-Resource-Policy: cross-origin\r\n\
                    Access-Control-Max-Age: 86400\r\n\
                    Content-Length: 0\r\n\r\n";
                stream.write_all(resp.as_bytes()).await?;
                if !keep_alive {
                    return Ok(());
                }
                continue;
            }

            // Health check
            if path == "/health" {
                let resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 15\r\n\r\n{\"status\":\"ok\"}";
                stream.write_all(resp.as_bytes()).await?;
                if !keep_alive {
                    return Ok(());
                }
                continue;
            }

            // Check session token authorization (?t=...)
            let query_token = path.split('?').nth(1).and_then(|q| {
                q.split('&').find_map(|pair| {
                    if pair.starts_with("t=") {
                        Some(&pair[2..])
                    } else {
                        None
                    }
                })
            });

            if query_token != Some(mgr.stream_token()) {
                let forbidden = "HTTP/1.1 403 Forbidden\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\n\r\n";
                stream.write_all(forbidden.as_bytes()).await?;
                return Ok(());
            }

            // Route: /stream/{file_id}
            if path.starts_with("/stream/") {
                let file_id = path
                    .trim_start_matches("/stream/")
                    .split('?')
                    .next()
                    .unwrap_or("");
                let should_continue = handle_stream_route(
                    &mut stream,
                    &mgr,
                    method,
                    file_id,
                    range_header.as_deref(),
                    keep_alive,
                )
                .await?;
                if !should_continue || !keep_alive {
                    return Ok(());
                }
                continue;
            }

            // Route: /thumbnail/{file_id}
            if path.starts_with("/thumbnail/") {
                let file_id = path
                    .trim_start_matches("/thumbnail/")
                    .split('?')
                    .next()
                    .unwrap_or("");
                handle_thumbnail_route(&mut stream, &mgr, file_id).await?;
                if !keep_alive {
                    return Ok(());
                }
                continue;
            }

            // Fallback 404
            let not_found = "HTTP/1.1 404 Not Found\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\n\r\n";
            stream.write_all(not_found.as_bytes()).await?;
            if !keep_alive {
                return Ok(());
            }
        }
    }
}

pub fn parse_http_range(range_header: Option<&str>, total_size: u64) -> Result<(bool, u64, u64), ()> {
    if total_size == 0 {
        return Ok((false, 0, 0));
    }
    let r_str = match range_header {
        Some(s) => s.trim(),
        None => return Ok((false, 0, total_size - 1)),
    };

    let spec = match r_str.strip_prefix("bytes=") {
        Some(s) => s.trim(),
        None => return Err(()),
    };

    if spec.starts_with('-') {
        // Suffix range: bytes=-500 (last 500 bytes)
        let suffix_len: u64 = spec[1..].trim().parse().map_err(|_| ())?;
        if suffix_len == 0 {
            return Err(());
        }
        let start = total_size.saturating_sub(suffix_len);
        let end = total_size - 1;
        return Ok((true, start, end));
    }

    let parts: Vec<&str> = spec.split('-').collect();
    if parts.is_empty() {
        return Err(());
    }

    let start: u64 = parts[0].trim().parse().map_err(|_| ())?;
    if start >= total_size {
        return Err(());
    }

    let end = if parts.len() > 1 && !parts[1].trim().is_empty() {
        let req_end: u64 = parts[1].trim().parse().map_err(|_| ())?;
        req_end.min(total_size - 1)
    } else {
        total_size - 1
    };

    if start > end {
        return Err(());
    }

    Ok((true, start, end))
}

async fn handle_stream_route(
    stream: &mut TcpStream,
    mgr: &PreviewStreamManager,
    method: &str,
    file_id: &str,
    range_header: Option<&str>,
    keep_alive: bool,
) -> Result<bool, AppError> {
    let t_start = Instant::now();

    let (file_record, chunks) = match mgr.get_cached_metadata(file_id).await {
        Ok(m) => m,
        Err(_) => {
            let not_found = "HTTP/1.1 404 Not Found\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\n\r\n";
            stream.write_all(not_found.as_bytes()).await?;
            return Ok(false);
        }
    };

    let total_size = file_record.total_size_bytes as u64;
    let guessed = guess_mime_type_from_name(&file_record.name);
    let mime_type = if !file_record.mime_type.is_empty() && file_record.mime_type != "application/octet-stream" {
        file_record.mime_type.as_str()
    } else {
        guessed
    };

    // Handle HEAD request
    if method == "HEAD" {
        let resp = format!(
            "HTTP/1.1 200 OK\r\n\
            Content-Type: {mime_type}\r\n\
            Content-Length: {total_size}\r\n\
            Accept-Ranges: bytes\r\n\
            Access-Control-Allow-Origin: *\r\n\
            Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
            Access-Control-Allow-Headers: Range, Content-Type, Accept, Origin\r\n\
            Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n\
            Cross-Origin-Resource-Policy: cross-origin\r\n\
            Connection: {}\r\n\r\n",
            if keep_alive { "keep-alive" } else { "close" }
        );
        stream.write_all(resp.as_bytes()).await?;
        return Ok(keep_alive);
    }

    // Parse HTTP Range header
    let (is_range, start, req_end) = match parse_http_range(range_header, total_size) {
        Ok(res) => res,
        Err(_) => {
            let range_not_satisfiable = format!(
                "HTTP/1.1 416 Range Not Satisfiable\r\n\
                Content-Range: bytes */{total_size}\r\n\
                Access-Control-Allow-Origin: *\r\n\
                Content-Length: 0\r\n\r\n"
            );
            stream.write_all(range_not_satisfiable.as_bytes()).await?;
            return Ok(keep_alive);
        }
    };

    // Grant larger streamed windows (up to 8-16 MB per request)
    let max_window = 16 * 1024 * 1024;
    let end = req_end.min(start + max_window - 1).min(total_size.saturating_sub(1));
    let content_len = if total_size == 0 { 0 } else { end - start + 1 };

    let header = if is_range {
        format!(
            "HTTP/1.1 206 Partial Content\r\n\
            Content-Type: {mime_type}\r\n\
            Content-Range: bytes {start}-{end}/{total_size}\r\n\
            Content-Length: {content_len}\r\n\
            Accept-Ranges: bytes\r\n\
            Access-Control-Allow-Origin: *\r\n\
            Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
            Access-Control-Allow-Headers: Range, Content-Type, Accept, Origin\r\n\
            Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n\
            Cross-Origin-Resource-Policy: cross-origin\r\n\
            Connection: {}\r\n\r\n",
            if keep_alive { "keep-alive" } else { "close" }
        )
    } else {
        format!(
            "HTTP/1.1 200 OK\r\n\
            Content-Type: {mime_type}\r\n\
            Content-Length: {content_len}\r\n\
            Accept-Ranges: bytes\r\n\
            Access-Control-Allow-Origin: *\r\n\
            Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
            Access-Control-Allow-Headers: Range, Content-Type, Accept, Origin\r\n\
            Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n\
            Cross-Origin-Resource-Policy: cross-origin\r\n\
            Connection: {}\r\n\r\n",
            if keep_alive { "keep-alive" } else { "close" }
        )
    };

    // Send HTTP headers immediately
    stream.write_all(header.as_bytes()).await?;
    stream.flush().await?;

    if content_len == 0 {
        return Ok(keep_alive);
    }

    // Stream the body block-by-block directly into socket (Phase 1.4)
    let start_block = (start / BLOCK_SIZE as u64) as usize;
    let end_block = (end / BLOCK_SIZE as u64) as usize;
    let mut ttfb_logged = false;

    for b_idx in start_block..=end_block {
        let b_start = (b_idx * BLOCK_SIZE) as u64;
        let b_end = ((b_idx + 1) * BLOCK_SIZE as usize).min(total_size as usize) as u64 - 1;

        let slice_start = start.max(b_start);
        let slice_end = end.min(b_end);

        let data_res = mgr
            .read_byte_range(file_id, &file_record, &chunks, slice_start, slice_end)
            .await;

        match data_res {
            Ok(bytes) => {
                if !ttfb_logged {
                    eprintln!(
                        "[PreviewStream] TTFB for Range {start}-{end}: {}ms",
                        t_start.elapsed().as_millis()
                    );
                    ttfb_logged = true;
                }
                if let Err(e) = stream.write_all(&bytes).await {
                    eprintln!("[PreviewStream] Socket write error: {e}");
                    return Ok(false);
                }
                let _ = stream.flush().await;
            }
            Err(e) => {
                eprintln!("[PreviewStream] Stream block fetch failed: {e}");
                return Ok(false);
            }
        }
    }

    Ok(keep_alive)
}

async fn handle_thumbnail_route(
    stream: &mut TcpStream,
    mgr: &PreviewStreamManager,
    file_id: &str,
) -> Result<(), AppError> {
    let thumb_path = mgr.thumbnail_dir.join(format!("{}.webp", file_id));

    if thumb_path.exists() {
        if let Ok(mut file) = File::open(&thumb_path).await {
            let mut data = Vec::new();
            if file.read_to_end(&mut data).await.is_ok() {
                let header = format!(
                    "HTTP/1.1 200 OK\r\n\
                    Content-Type: image/webp\r\n\
                    Content-Length: {}\r\n\
                    Cache-Control: public, max-age=31536000, immutable\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Cross-Origin-Resource-Policy: cross-origin\r\n\r\n",
                    data.len()
                );
                stream.write_all(header.as_bytes()).await?;
                stream.write_all(&data).await?;
                stream.flush().await?;
                return Ok(());
            }
        }
    }

    let not_found = "HTTP/1.1 404 Not Found\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\n\r\n";
    stream.write_all(not_found.as_bytes()).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_http_range() {
        let total = 1000;
        assert_eq!(parse_http_range(None, total), Ok((false, 0, 999)));
        assert_eq!(parse_http_range(Some("bytes=0-499"), total), Ok((true, 0, 499)));
        assert_eq!(parse_http_range(Some("bytes=500-"), total), Ok((true, 500, 999)));
        assert_eq!(parse_http_range(Some("bytes=-200"), total), Ok((true, 800, 999)));
        assert!(parse_http_range(Some("bytes=1500-"), total).is_err());
        assert!(parse_http_range(Some("bytes=500-200"), total).is_err());
    }

    #[test]
    fn test_block_alignment() {
        assert_eq!(BLOCK_SIZE, 512 * 1024);
        assert_eq!(BLOCK_SIZE % 4096, 0); // Must be a multiple of 4KB
        assert!(BLOCK_SIZE <= 1024 * 1024); // Must be <= 1MB
    }
}
