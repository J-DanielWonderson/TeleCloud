use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

use crate::db::cloud_sync::{CloudSyncManager, SyncStatus};
use crate::db::schema::{BreadcrumbItem, DbManager, FileChunkRecord, FileRecord, FolderRecord};
use crate::engine::chunk_merger::ChunkMergerManager;
use crate::engine::chunk_uploader::ChunkUploaderManager;
use crate::error::AppError;
use crate::telegram::bot_pool::{BotPool, BotPoolHealth, WorkerBotInfo};
use crate::telegram::client::{
    RequestCodeResponse, SignInResponse, StorageChannelInfo, TelegramClientManager,
    TelegramUserProfile,
};
use crate::vault::keystore::{Keystore, VaultCredentials};

#[derive(Debug, Serialize, Deserialize)]
pub struct SetupStatus {
    pub is_configured: bool,
    pub has_session: bool,
    pub storage_channel_id: Option<i64>,
    pub phone: Option<String>,
    pub bot_count: usize,
}

#[derive(Debug, Deserialize)]
pub struct InitialCredentialsPayload {
    pub api_id: i32,
    pub api_hash: String,
    pub phone: String,
    pub worker_bot_tokens: Vec<String>,
}

#[tauri::command]
pub async fn check_setup_status(
    keystore: State<'_, Arc<Keystore>>,
    tg: State<'_, Arc<TelegramClientManager>>,
    db: State<'_, Arc<DbManager>>,
) -> Result<SetupStatus, AppError> {
    if !keystore.is_configured() {
        return Ok(SetupStatus {
            is_configured: false,
            has_session: false,
            storage_channel_id: None,
            phone: None,
            bot_count: 0,
        });
    }

    let is_authorized = tg.is_authorized().await.unwrap_or(false);
    let active_bots_count = db.list_active_bots().map(|b| b.len()).unwrap_or(0);

    match keystore.load_credentials()? {
        Some(creds) => Ok(SetupStatus {
            is_configured: true,
            has_session: is_authorized,
            storage_channel_id: creds.storage_channel_id,
            phone: Some(creds.phone),
            bot_count: active_bots_count,
        }),
        None => Ok(SetupStatus {
            is_configured: false,
            has_session: false,
            storage_channel_id: None,
            phone: None,
            bot_count: 0,
        }),
    }
}

#[tauri::command]
pub fn save_initial_credentials(
    payload: InitialCredentialsPayload,
    keystore: State<'_, Arc<Keystore>>,
) -> Result<(), AppError> {
    if payload.api_id <= 0 {
        return Err(AppError::Validation("API_ID must be a positive integer".into()));
    }
    if payload.api_hash.trim().is_empty() {
        return Err(AppError::Validation("API_HASH cannot be empty".into()));
    }
    if payload.phone.trim().is_empty() {
        return Err(AppError::Validation("Phone number cannot be empty".into()));
    }

    let now = chrono::Utc::now().timestamp();
    let creds = VaultCredentials {
        api_id: payload.api_id,
        api_hash: payload.api_hash.trim().to_string(),
        phone: payload.phone.trim().to_string(),
        session_bytes: None,
        storage_channel_id: None,
        worker_bot_tokens: payload.worker_bot_tokens,
        created_at: now,
        updated_at: now,
    };

    keystore.save_credentials(&creds)?;
    Ok(())
}

#[tauri::command]
pub async fn request_login_code(
    phone: String,
    tg: State<'_, Arc<TelegramClientManager>>,
) -> Result<RequestCodeResponse, AppError> {
    tg.request_login_code(&phone).await
}

#[tauri::command]
pub async fn submit_login_code(
    code: String,
    tg: State<'_, Arc<TelegramClientManager>>,
) -> Result<SignInResponse, AppError> {
    tg.submit_login_code(&code).await
}

#[tauri::command]
pub async fn submit_password_2fa(
    password: String,
    tg: State<'_, Arc<TelegramClientManager>>,
) -> Result<SignInResponse, AppError> {
    tg.submit_password_2fa(&password).await
}

#[tauri::command]
pub async fn check_auth_status(
    tg: State<'_, Arc<TelegramClientManager>>,
) -> Result<bool, AppError> {
    tg.is_authorized().await
}

#[tauri::command]
pub async fn provision_channel(
    tg: State<'_, Arc<TelegramClientManager>>,
) -> Result<StorageChannelInfo, AppError> {
    tg.provision_storage_channel().await
}

#[tauri::command]
pub async fn get_telegram_me(
    tg: State<'_, Arc<TelegramClientManager>>,
) -> Result<TelegramUserProfile, AppError> {
    tg.get_me().await
}

#[tauri::command]
pub fn get_vault_config(
    key: String,
    db: State<'_, Arc<DbManager>>,
) -> Result<Option<String>, AppError> {
    db.get_config(&key)
}

#[tauri::command]
pub fn set_chunk_size(
    chunk_size_bytes: i64,
    db: State<'_, Arc<DbManager>>,
) -> Result<(), AppError> {
    if chunk_size_bytes < 100 * 1024 * 1024 || chunk_size_bytes > 500 * 1024 * 1024 {
        return Err(AppError::Validation("Chunk size must be between 100MB and 500MB".into()));
    }
    db.set_config("chunk_size_bytes", &chunk_size_bytes.to_string())
}

#[tauri::command]
pub fn list_folders(
    parent_id: Option<String>,
    is_trashed: Option<bool>,
    db: State<'_, Arc<DbManager>>,
) -> Result<Vec<FolderRecord>, AppError> {
    db.list_folders(parent_id.as_deref(), is_trashed.unwrap_or(false))
}

#[tauri::command]
pub fn list_files(
    folder_id: Option<String>,
    is_trashed: Option<bool>,
    db: State<'_, Arc<DbManager>>,
) -> Result<Vec<FileRecord>, AppError> {
    db.list_files(folder_id.as_deref(), is_trashed.unwrap_or(false))
}

fn trigger_auto_cloud_sync(cloud_sync: &Arc<CloudSyncManager>, app_handle: &AppHandle) {
    let sync = Arc::clone(cloud_sync);
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let _ = sync.pull_vfs_index(false).await;
        if let Err(e) = sync.push_vfs_index().await {
            eprintln!("Auto cloud sync push notice: {e}");
        }
        let _ = handle.emit("vfs-changed", ());
    });
}

#[tauri::command]
pub fn create_folder(
    parent_id: Option<String>,
    name: String,
    color: Option<String>,
    db: State<'_, Arc<DbManager>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<FolderRecord, AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("Folder name cannot be empty".into()));
    }

    let now = chrono::Utc::now().timestamp();
    let record = FolderRecord {
        id: uuid::Uuid::new_v4().to_string(),
        parent_id,
        name: trimmed.to_string(),
        color: Some(color.unwrap_or_else(|| "#3b82f6".into())),
        created_at: now,
        updated_at: now,
        is_trashed: 0,
    };

    db.create_folder(&record)?;
    trigger_auto_cloud_sync(&cloud_sync, &app_handle);
    Ok(record)
}

#[tauri::command]
pub fn get_folder_breadcrumbs(
    folder_id: Option<String>,
    db: State<'_, Arc<DbManager>>,
) -> Result<Vec<BreadcrumbItem>, AppError> {
    db.get_breadcrumbs(folder_id.as_deref())
}

#[tauri::command]
pub fn get_subfolders(
    parent_id: Option<String>,
    db: State<'_, Arc<DbManager>>,
) -> Result<Vec<FolderRecord>, AppError> {
    db.list_folders(parent_id.as_deref(), false)
}

#[tauri::command]
pub fn get_files_in_folder(
    folder_id: Option<String>,
    db: State<'_, Arc<DbManager>>,
) -> Result<Vec<FileRecord>, AppError> {
    db.list_files(folder_id.as_deref(), false)
}

#[tauri::command]
pub fn move_folder(
    id: String,
    target_folder_id: Option<String>,
    db: State<'_, Arc<DbManager>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    db.move_folder(&id, target_folder_id.as_deref())?;
    trigger_auto_cloud_sync(&cloud_sync, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn move_file(
    id: String,
    target_folder_id: Option<String>,
    db: State<'_, Arc<DbManager>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    db.move_file(&id, target_folder_id.as_deref())?;
    trigger_auto_cloud_sync(&cloud_sync, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn rename_folder(
    id: String,
    new_name: String,
    db: State<'_, Arc<DbManager>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("Folder name cannot be empty".into()));
    }
    db.rename_folder(&id, trimmed)?;
    trigger_auto_cloud_sync(&cloud_sync, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn delete_folder(
    id: String,
    permanent: Option<bool>,
    db: State<'_, Arc<DbManager>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    if permanent.unwrap_or(false) {
        db.delete_folder_permanent(&id)?;
    } else {
        db.set_folder_trashed(&id, true)?;
    }
    trigger_auto_cloud_sync(&cloud_sync, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn rename_file(
    id: String,
    new_name: String,
    db: State<'_, Arc<DbManager>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("File name cannot be empty".into()));
    }
    db.rename_file(&id, trimmed)?;
    trigger_auto_cloud_sync(&cloud_sync, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn delete_file(
    id: String,
    permanent: Option<bool>,
    db: State<'_, Arc<DbManager>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    if permanent.unwrap_or(false) {
        db.delete_file_permanent(&id)?;
    } else {
        db.set_file_trashed(&id, true)?;
    }
    trigger_auto_cloud_sync(&cloud_sync, &app_handle);
    Ok(())
}

#[tauri::command]
pub fn get_file_chunks(
    file_id: String,
    db: State<'_, Arc<DbManager>>,
) -> Result<Vec<FileChunkRecord>, AppError> {
    db.get_chunks_for_file(&file_id)
}

#[tauri::command]
pub fn wipe_vault(
    keystore: State<'_, Arc<Keystore>>,
) -> Result<(), AppError> {
    keystore.wipe()
}

#[tauri::command]
pub async fn push_vfs_index(
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
) -> Result<i64, AppError> {
    cloud_sync.push_vfs_index().await
}

#[tauri::command]
pub async fn pull_vfs_index(
    force: Option<bool>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
) -> Result<bool, AppError> {
    cloud_sync.pull_vfs_index(force.unwrap_or(false)).await
}

#[tauri::command]
pub fn get_sync_status(
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
) -> Result<SyncStatus, AppError> {
    cloud_sync.get_sync_status()
}

#[tauri::command]
pub async fn add_worker_bot(
    token: String,
    bot_pool: State<'_, Arc<BotPool>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<WorkerBotInfo, AppError> {
    let res = bot_pool.add_worker_bot(&token).await?;
    if let Err(e) = cloud_sync.push_vfs_index().await {
        eprintln!("Warning: Failed to auto-sync worker bot to cloud channel: {e}");
    }
    let _ = app_handle.emit("vfs-changed", ());
    Ok(res)
}

#[tauri::command]
pub async fn list_worker_bots(
    bot_pool: State<'_, Arc<BotPool>>,
) -> Result<Vec<WorkerBotInfo>, AppError> {
    Ok(bot_pool.list_workers().await)
}

#[tauri::command]
pub async fn remove_worker_bot(
    bot_id: String,
    bot_pool: State<'_, Arc<BotPool>>,
    cloud_sync: State<'_, Arc<CloudSyncManager>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    bot_pool.remove_worker(&bot_id).await?;
    if let Err(e) = cloud_sync.push_vfs_index().await {
        eprintln!("Warning: Failed to auto-sync worker bot removal to cloud channel: {e}");
    }
    let _ = app_handle.emit("vfs-changed", ());
    Ok(())
}

#[tauri::command]
pub async fn get_bot_pool_health(
    bot_pool: State<'_, Arc<BotPool>>,
) -> Result<BotPoolHealth, AppError> {
    Ok(bot_pool.get_pool_health().await)
}

#[tauri::command]
pub async fn start_upload(
    app_handle: tauri::AppHandle,
    file_path: String,
    folder_id: Option<String>,
    uploader: State<'_, Arc<ChunkUploaderManager>>,
) -> Result<FileRecord, AppError> {
    let resolved_path = if file_path.starts_with("content://") {
        crate::android_bridge::resolve_content_uri(&file_path)
            .ok_or_else(|| {
                let reason = crate::android_bridge::last_resolve_error()
                    .unwrap_or_else(|| "unknown error (check logcat, tag TeleCloudApp)".to_string());
                AppError::Validation(format!("Could not read the selected file: {reason}"))
            })?
    } else {
        file_path
    };
    uploader.start_upload(app_handle, &resolved_path, folder_id).await
}

#[tauri::command]
pub async fn pause_upload(
    app_handle: tauri::AppHandle,
    file_id: String,
    uploader: State<'_, Arc<ChunkUploaderManager>>,
) -> Result<(), AppError> {
    uploader.pause_upload(&app_handle, &file_id).await
}

#[tauri::command]
pub async fn resume_upload(
    app_handle: tauri::AppHandle,
    file_id: String,
    file_path: String,
    uploader: State<'_, Arc<ChunkUploaderManager>>,
) -> Result<(), AppError> {
    let resolved_path = if file_path.starts_with("content://") {
        crate::android_bridge::resolve_content_uri(&file_path)
            .ok_or_else(|| {
                let reason = crate::android_bridge::last_resolve_error()
                    .unwrap_or_else(|| "unknown error (check logcat, tag TeleCloudApp)".to_string());
                AppError::Validation(format!("Could not read the selected file: {reason}"))
            })?
    } else {
        file_path
    };
    uploader.resume_upload(app_handle, &file_id, &resolved_path).await
}

#[tauri::command]
pub async fn cancel_upload(
    app_handle: tauri::AppHandle,
    file_id: String,
    uploader: State<'_, Arc<ChunkUploaderManager>>,
) -> Result<(), AppError> {
    uploader.cancel_upload(&app_handle, &file_id).await
}

#[tauri::command]
pub async fn start_download(
    app_handle: tauri::AppHandle,
    file_id: String,
    destination_path: String,
    merger: State<'_, Arc<ChunkMergerManager>>,
) -> Result<(), AppError> {
    merger.start_download(app_handle, &file_id, &destination_path).await
}

#[tauri::command]
pub async fn pause_download(
    app_handle: tauri::AppHandle,
    file_id: String,
    merger: State<'_, Arc<ChunkMergerManager>>,
) -> Result<(), AppError> {
    merger.pause_download(&app_handle, &file_id).await
}

#[tauri::command]
pub async fn resume_download(
    app_handle: tauri::AppHandle,
    file_id: String,
    destination_path: String,
    merger: State<'_, Arc<ChunkMergerManager>>,
) -> Result<(), AppError> {
    merger.resume_download(app_handle, &file_id, &destination_path).await
}

#[tauri::command]
pub async fn cancel_download(
    app_handle: tauri::AppHandle,
    file_id: String,
    merger: State<'_, Arc<ChunkMergerManager>>,
) -> Result<(), AppError> {
    merger.cancel_download(&app_handle, &file_id).await
}

#[tauri::command]
pub fn show_main_window(window: tauri::WebviewWindow) {
    #[cfg(desktop)]
    if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")) {
        let _ = window.set_icon(icon);
    }
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
pub async fn stage_upload_chunk(
    app_handle: tauri::AppHandle,
    session_id: String,
    file_name: String,
    chunk_index: usize,
    total_chunks: usize,
    data: Vec<u8>,
    folder_id: Option<String>,
    uploader: State<'_, Arc<ChunkUploaderManager>>,
) -> Result<Option<FileRecord>, AppError> {
    use tauri::Manager;
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::Io(format!("Could not get cache dir: {e}")))?
        .join("staged_uploads");
    tokio::fs::create_dir_all(&cache_dir)
        .await
        .map_err(|e| AppError::Io(format!("Could not create staging dir: {e}")))?;

    let safe_name = file_name.replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_', "_");
    let staged_path = cache_dir.join(format!("{}_{}", session_id, safe_name));

    let mut file = tokio::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open(&staged_path)
        .await
        .map_err(|e| AppError::Io(format!("Could not open staging file: {e}")))?;

    use tokio::io::AsyncWriteExt;
    file.write_all(&data)
        .await
        .map_err(|e| AppError::Io(format!("Could not write chunk data: {e}")))?;
    file.flush()
        .await
        .map_err(|e| AppError::Io(format!("Could not flush chunk data: {e}")))?;
    drop(file);

    if chunk_index + 1 >= total_chunks {
        let record = uploader
            .start_upload(app_handle, &staged_path.to_string_lossy(), folder_id)
            .await?;
        return Ok(Some(record));
    }

    Ok(None)
}

#[tauri::command]
pub fn get_default_download_directory(app_handle: tauri::AppHandle) -> Result<String, AppError> {
    use tauri::Manager;
    #[cfg(target_os = "android")]
    {
        if let Some(dir) = crate::android_bridge::get_downloads_dir() {
            let p = std::path::Path::new(&dir);
            let _ = std::fs::create_dir_all(p);
            return Ok(dir);
        }
        if let Ok(dir) = app_handle.path().download_dir() {
            let _ = std::fs::create_dir_all(&dir);
            return Ok(dir.to_string_lossy().to_string());
        }
        if let Ok(dir) = app_handle.path().app_data_dir() {
            let downloads = dir.join("Downloads");
            let _ = std::fs::create_dir_all(&downloads);
            return Ok(downloads.to_string_lossy().to_string());
        }
    }

    #[cfg(not(target_os = "android"))]
    {
        if let Some(dir) = dirs::download_dir() {
            return Ok(dir.to_string_lossy().to_string());
        }
        if let Ok(dir) = app_handle.path().download_dir() {
            return Ok(dir.to_string_lossy().to_string());
        }
    }

    Ok(".".to_string())
}

#[tauri::command]
pub fn request_android_permissions() -> Result<(), AppError> {
    crate::android_bridge::request_app_permissions();
    Ok(())
}


