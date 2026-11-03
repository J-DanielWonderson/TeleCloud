# ai-digest.config.json

```json
target/
*.db
*.exe
*.dll
bin/

```

# build.rs

```rs
fn main() {
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build()
}

```

# capabilities\default.json

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for TeleCloud Vault window",
  "windows": ["*"],
  "permissions": [
    "core:default",
    "dialog:default",
    "fs:default"
  ]
}

```

# Cargo.toml

```toml
[package]
name = "telecloud-vault"
version = "1.0.0"
description = "TeleCloud — Unlimited Cloud Storage backed by Telegram MTProto"
authors = ["J Daniel Wonderson"]
edition = "2021"

[lib]
name = "telecloud_vault_lib"
crate-type = ["cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]

[dependencies]
tauri = { version = "2.0", features = ["image-png", "image-ico", "custom-protocol"] }
tauri-plugin-dialog = "2.0"
tauri-plugin-fs = "2.0"
tokio = { version = "1", features = ["full"] }
grammers-client = "0.11"
grammers-session = { version = "0.11", default-features = false }
grammers-tl-types = "0.11"
grammers-mtsender = "0.11"
rusqlite = { version = "0.32", features = ["bundled"] }
sha2 = "0.10"
hex = "0.4"
flate2 = "1.0"
uuid = { version = "1", features = ["v4", "serde"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
rand = "0.8"
aes-gcm = "0.10"
dirs = "5.0"
chrono = { version = "0.4", features = ["serde"] }

[target.'cfg(target_os = "android")'.dependencies]
jni = "0.21"
ndk-context = "0.1"

[profile.release]
opt-level = 2
lto = false
codegen-units = 4
panic = "abort"
strip = true

[profile.release.package.windows]
opt-level = 0

[profile.release.package.windows-sys]
opt-level = 0

[profile.release.package.grammers-tl-types]
opt-level = "s"
codegen-units = 1

[profile.release.package.grammers-client]
opt-level = "s"
codegen-units = 1

```

# icons\32x32.png

This is a binary file of the type: Image

# icons\64x64.png

This is a binary file of the type: Image

# icons\128x128.png

This is a binary file of the type: Image

# icons\128x128@2x.png

This is a binary file of the type: Image

# icons\android\mipmap-anydpi-v26\ic_launcher.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>

```

# icons\android\mipmap-hdpi\ic_launcher_foreground.png

This is a binary file of the type: Image

# icons\android\mipmap-hdpi\ic_launcher_round.png

This is a binary file of the type: Image

# icons\android\mipmap-hdpi\ic_launcher.png

This is a binary file of the type: Image

# icons\android\mipmap-mdpi\ic_launcher_foreground.png

This is a binary file of the type: Image

# icons\android\mipmap-mdpi\ic_launcher_round.png

This is a binary file of the type: Image

# icons\android\mipmap-mdpi\ic_launcher.png

This is a binary file of the type: Image

# icons\android\mipmap-xhdpi\ic_launcher_foreground.png

This is a binary file of the type: Image

# icons\android\mipmap-xhdpi\ic_launcher_round.png

This is a binary file of the type: Image

# icons\android\mipmap-xhdpi\ic_launcher.png

This is a binary file of the type: Image

# icons\android\mipmap-xxhdpi\ic_launcher_foreground.png

This is a binary file of the type: Image

# icons\android\mipmap-xxhdpi\ic_launcher_round.png

This is a binary file of the type: Image

# icons\android\mipmap-xxhdpi\ic_launcher.png

This is a binary file of the type: Image

# icons\android\mipmap-xxxhdpi\ic_launcher_foreground.png

This is a binary file of the type: Image

# icons\android\mipmap-xxxhdpi\ic_launcher_round.png

This is a binary file of the type: Image

# icons\android\mipmap-xxxhdpi\ic_launcher.png

This is a binary file of the type: Image

# icons\android\values\ic_launcher_background.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#FFFFFF</color>
</resources>
```

# icons\icon.icns

This is a binary file of the type: Binary

# icons\icon.ico

This is a binary file of the type: Binary

# icons\icon.png

This is a binary file of the type: Image

# icons\ios\AppIcon-20x20@1x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-20x20@2x-1.png

This is a binary file of the type: Image

# icons\ios\AppIcon-20x20@2x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-20x20@3x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-29x29@1x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-29x29@2x-1.png

This is a binary file of the type: Image

# icons\ios\AppIcon-29x29@2x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-29x29@3x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-40x40@1x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-40x40@2x-1.png

This is a binary file of the type: Image

# icons\ios\AppIcon-40x40@2x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-40x40@3x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-60x60@2x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-60x60@3x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-76x76@1x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-76x76@2x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-83.5x83.5@2x.png

This is a binary file of the type: Image

# icons\ios\AppIcon-512@2x.png

This is a binary file of the type: Image

# icons\Square30x30Logo.png

This is a binary file of the type: Image

# icons\Square44x44Logo.png

This is a binary file of the type: Image

# icons\Square71x71Logo.png

This is a binary file of the type: Image

# icons\Square89x89Logo.png

This is a binary file of the type: Image

# icons\Square107x107Logo.png

This is a binary file of the type: Image

# icons\Square142x142Logo.png

This is a binary file of the type: Image

# icons\Square150x150Logo.png

This is a binary file of the type: Image

# icons\Square284x284Logo.png

This is a binary file of the type: Image

# icons\Square310x310Logo.png

This is a binary file of the type: Image

# icons\StoreLogo.png

This is a binary file of the type: Image

# src\android_bridge.rs

```rs
#[cfg(target_os = "android")]
pub mod bridge {
    use jni::objects::{GlobalRef, JClass, JObject, JString, JValue};
    use jni::JavaVM;
    use std::sync::{OnceLock, RwLock};

    static JVM: OnceLock<JavaVM> = OnceLock::new();
    static MAIN_ACTIVITY_CLASS: RwLock<Option<GlobalRef>> = RwLock::new(None);

    #[no_mangle]
    pub unsafe extern "C" fn JNI_OnLoad(vm: *mut jni::sys::JavaVM, _reserved: *mut std::ffi::c_void) -> jni::sys::jint {
        if !vm.is_null() {
            if let Ok(java_vm) = JavaVM::from_raw(vm) {
                if let Ok(mut env) = java_vm.get_env() {
                    if let Ok(class) = env.find_class("com/telecloud/app/MainActivity") {
                        if let Ok(g_ref) = env.new_global_ref(&class) {
                            if let Ok(mut lock) = MAIN_ACTIVITY_CLASS.write() {
                                *lock = Some(g_ref);
                            }
                        }
                    }
                }
                let _ = JVM.set(java_vm);
            }
        }
        jni::sys::JNI_VERSION_1_6
    }

    #[no_mangle]
    pub unsafe extern "C" fn Java_com_telecloud_app_MainActivity_registerAppInstance(
        mut env: jni::JNIEnv,
        activity: JObject,
    ) {
        if JVM.get().is_none() {
            if let Ok(vm) = env.get_java_vm() {
                let _ = JVM.set(vm);
            }
        }

        let mut found_class = env.find_class("com/telecloud/app/MainActivity").ok();
        if found_class.is_none() && !activity.is_null() {
            found_class = env.get_object_class(&activity).ok();
        }

        if let Some(class) = found_class {
            if let Ok(g_class) = env.new_global_ref(&class) {
                if let Ok(mut lock) = MAIN_ACTIVITY_CLASS.write() {
                    *lock = Some(g_class);
                    eprintln!("[android_bridge] Successfully registered MainActivity GlobalRef");
                }
            }
        }

        if env.exception_check().unwrap_or(false) {
            let _ = env.exception_clear();
        }
    }

    pub fn get_jvm() -> Option<&'static JavaVM> {
        if let Some(vm) = JVM.get() {
            return Some(vm);
        }
        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm();
        if !vm_ptr.is_null() {
            if let Ok(vm) = unsafe { JavaVM::from_raw(vm_ptr as *mut _) } {
                let _ = JVM.set(vm);
                return JVM.get();
            }
        }
        None
    }

    fn get_main_activity_class<'a>(env: &mut jni::JNIEnv<'a>) -> Option<JClass<'a>> {
        if let Ok(lock) = MAIN_ACTIVITY_CLASS.read() {
            if let Some(ref g_class) = *lock {
                if let Ok(local) = env.new_local_ref(g_class.as_obj()) {
                    return Some(JClass::from(local));
                }
            }
        }

        // Fallback: FindClass in initial load thread
        let class = env.find_class("com/telecloud/app/MainActivity").ok();
        if env.exception_check().unwrap_or(false) {
            let _ = env.exception_clear();
        }
        if let Some(ref c) = class {
            if let Ok(g_ref) = env.new_global_ref(c) {
                if let Ok(mut lock) = MAIN_ACTIVITY_CLASS.write() {
                    *lock = Some(g_ref);
                }
            }
        }
        class
    }

    pub fn resolve_content_uri(uri: &str) -> Option<String> {
        let vm = get_jvm()?;
        let mut env = vm.attach_current_thread().ok()?;
        let class = get_main_activity_class(&mut env)?;
        let j_uri = env.new_string(uri).ok()?;

        let result = env.call_static_method(
            class,
            "resolveContentUriToCache",
            "(Ljava/lang/String;)Ljava/lang/String;",
            &[JValue::from(&j_uri)],
        );

        if env.exception_check().unwrap_or(false) {
            let _ = env.exception_describe();
            let _ = env.exception_clear();
            return None;
        }

        let j_obj = result.ok()?.l().ok()?;
        if j_obj.is_null() {
            return None;
        }
        let j_str: JString = j_obj.into();
        let rust_str: String = env.get_string(&j_str).ok()?.into();
        Some(rust_str)
    }

    pub fn get_downloads_dir() -> Option<String> {
        let vm = get_jvm()?;
        let mut env = vm.attach_current_thread().ok()?;
        let class = get_main_activity_class(&mut env)?;

        let result = env.call_static_method(
            class,
            "getDownloadsPath",
            "()Ljava/lang/String;",
            &[],
        );

        if env.exception_check().unwrap_or(false) {
            let _ = env.exception_describe();
            let _ = env.exception_clear();
            return None;
        }

        let j_obj = result.ok()?.l().ok()?;
        if j_obj.is_null() {
            return None;
        }
        let j_str: JString = j_obj.into();
        let rust_str: String = env.get_string(&j_str).ok()?.into();
        Some(rust_str)
    }

    pub fn scan_media_file(path: &str) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                if let Some(class) = get_main_activity_class(&mut env) {
                    if let Ok(j_path) = env.new_string(path) {
                        let _ = env.call_static_method(
                            class,
                            "scanMediaFile",
                            "(Ljava/lang/String;)V",
                            &[JValue::from(&j_path)],
                        );
                        if env.exception_check().unwrap_or(false) {
                            let _ = env.exception_describe();
                            let _ = env.exception_clear();
                        }
                    }
                }
            }
        }
    }

    pub fn update_transfer_notification(
        notification_id: i32,
        title: &str,
        content: &str,
        progress: i32,
        max: i32,
        is_ongoing: bool,
    ) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                if let Some(class) = get_main_activity_class(&mut env) {
                    if let (Ok(j_title), Ok(j_content)) = (env.new_string(title), env.new_string(content)) {
                        let _ = env.call_static_method(
                            class,
                            "updateTransferNotification",
                            "(ILjava/lang/String;Ljava/lang/String;IIZ)V",
                            &[
                                JValue::Int(notification_id),
                                JValue::from(&j_title),
                                JValue::from(&j_content),
                                JValue::Int(progress),
                                JValue::Int(max),
                                JValue::Bool(if is_ongoing { 1 } else { 0 }),
                            ],
                        );
                        if env.exception_check().unwrap_or(false) {
                            let _ = env.exception_describe();
                            let _ = env.exception_clear();
                        }
                    }
                }
            }
        }
    }

    pub fn cancel_notification(notification_id: i32) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                if let Some(class) = get_main_activity_class(&mut env) {
                    let _ = env.call_static_method(
                        class,
                        "cancelNotification",
                        "(I)V",
                        &[JValue::Int(notification_id)],
                    );
                    if env.exception_check().unwrap_or(false) {
                        let _ = env.exception_clear();
                    }
                }
            }
        }
    }

    pub fn request_app_permissions() {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                if let Some(class) = get_main_activity_class(&mut env) {
                    let _ = env.call_static_method(class, "requestAppPermissionsStatic", "()V", &[]);
                    if env.exception_check().unwrap_or(false) {
                        let _ = env.exception_clear();
                    }
                }
            }
        }
    }
}

#[cfg(not(target_os = "android"))]
pub mod bridge {
    pub fn resolve_content_uri(_uri: &str) -> Option<String> {
        None
    }

    pub fn get_downloads_dir() -> Option<String> {
        None
    }

    pub fn scan_media_file(_path: &str) {}

    pub fn update_transfer_notification(
        _notification_id: i32,
        _title: &str,
        _content: &str,
        _progress: i32,
        _max: i32,
        _is_ongoing: bool,
    ) {}

    pub fn cancel_notification(_notification_id: i32) {}

    pub fn request_app_permissions() {}
}

pub fn get_notif_id(file_id: &str) -> i32 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    std::hash::Hash::hash(file_id, &mut hasher);
    (std::hash::Hasher::finish(&hasher) & 0x7FFFFFFF) as i32
}

pub use bridge::*;

```

# src\commands.rs

```rs
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
            .ok_or_else(|| AppError::Validation(format!("Failed to read selected file URI from Android system: {file_path}")))?
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
            .ok_or_else(|| AppError::Validation(format!("Failed to read selected file URI from Android system: {file_path}")))?
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


```

# src\db\cloud_sync.rs

```rs
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

```

# src\db\mod.rs

```rs
pub mod cloud_sync;
pub mod schema;

```

# src\db\schema.rs

```rs
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

pub const DEFAULT_CHUNK_SIZE_BYTES: i64 = 262_144_000; // 250 MB
const DB_FILE_NAME: &str = "telecloud_vfs.db";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfigEntry {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreadcrumbItem {
    pub id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_trashed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileRecord {
    pub id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub total_size_bytes: i64,
    pub mime_type: String,
    pub full_sha256: Option<String>,
    pub total_chunks: i64,
    pub status: String, // 'PENDING', 'UPLOADING', 'READY', 'CORRUPTED'
    pub created_at: i64,
    pub updated_at: i64,
    pub is_trashed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChunkRecord {
    pub id: String,
    pub file_id: String,
    pub chunk_index: i64,
    pub byte_offset: i64,
    pub byte_length: i64,
    pub telegram_message_id: Option<i64>,
    pub chunk_sha256: Option<String>,
    pub upload_status: String, // 'PENDING', 'UPLOADING', 'UPLOADED', 'VERIFIED'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerBotRecord {
    pub bot_id: String,
    pub bot_username: String,
    pub token_encrypted: String,
    pub cooldown_until: i64,
    pub total_uploaded_bytes: i64,
    pub is_active: i64,
}

#[derive(Clone)]
pub struct DbManager {
    conn: Arc<Mutex<Connection>>,
    db_path: PathBuf,
}

impl DbManager {
    /// Initialize local SQLite VFS database with exact schema and WAL mode
    pub fn new(app_handle: &AppHandle) -> Result<Self, AppError> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Database(format!("Failed to resolve app data directory: {e}")))?;

        let db_dir = app_dir.join("db");
        if !db_dir.exists() {
            fs::create_dir_all(&db_dir)
                .map_err(|e| AppError::Database(format!("Failed to create db directory: {e}")))?;
        }

        let db_path = db_dir.join(DB_FILE_NAME);
        Self::open(db_path)
    }

    pub fn open(db_path: PathBuf) -> Result<Self, AppError> {
        let conn = Connection::open(&db_path)
            .map_err(|e| AppError::Database(format!("Failed to open SQLite database: {e}")))?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path,
        };

        db.init_schema()?;
        Ok(db)
    }

    /// Initializes schema with strict PRAGMAs, tables, and indexes
    fn init_schema(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        // Strict PRAGMAs
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA synchronous = NORMAL;
            "#,
        )?;

        // Tables and indexes
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS vault_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                color TEXT DEFAULT '#3b82f6',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_trashed INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                total_size_bytes INTEGER NOT NULL,
                mime_type TEXT NOT NULL,
                full_sha256 TEXT,
                total_chunks INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('PENDING', 'UPLOADING', 'READY', 'CORRUPTED')),
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_trashed INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS file_chunks (
                id TEXT PRIMARY KEY,
                file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                byte_offset INTEGER NOT NULL,
                byte_length INTEGER NOT NULL,
                telegram_message_id INTEGER,
                chunk_sha256 TEXT,
                upload_status TEXT NOT NULL CHECK(upload_status IN ('PENDING', 'UPLOADING', 'UPLOADED', 'VERIFIED')),
                UNIQUE(file_id, chunk_index)
            );

            CREATE TABLE IF NOT EXISTS worker_bots (
                bot_id TEXT PRIMARY KEY,
                bot_username TEXT NOT NULL,
                token_encrypted TEXT NOT NULL,
                cooldown_until INTEGER NOT NULL DEFAULT 0,
                total_uploaded_bytes INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
            CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
            CREATE INDEX IF NOT EXISTS idx_chunks_file ON file_chunks(file_id, chunk_index);
            "#,
        )?;

        // Non-destructive schema migration for existing databases
        let _ = conn.execute("ALTER TABLE folders ADD COLUMN color TEXT DEFAULT '#3b82f6'", []);

        // Seed default config keys if missing
        let defaults = [
            ("chunk_size_bytes", DEFAULT_CHUNK_SIZE_BYTES.to_string()),
            ("last_synced_message_id", "0".to_string()),
            ("sync_version", "1".to_string()),
        ];

        for (k, v) in defaults {
            conn.execute(
                "INSERT OR IGNORE INTO vault_config (key, value) VALUES (?1, ?2)",
                params![k, v],
            )?;
        }

        Ok(())
    }

    pub fn get_db_path(&self) -> PathBuf {
        self.db_path.clone()
    }

    // -------------------------------------------------------------------------
    // Configuration CRUD
    // -------------------------------------------------------------------------
    pub fn get_config(&self, key: &str) -> Result<Option<String>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM vault_config WHERE key = ?1")?;
        let res = stmt.query_row(params![key], |row| row.get(0)).optional()?;
        Ok(res)
    }

    pub fn set_config(&self, key: &str, value: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO vault_config (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_chunk_size_bytes(&self) -> Result<i64, AppError> {
        let val = self.get_config("chunk_size_bytes")?;
        Ok(val.and_then(|v| v.parse::<i64>().ok()).unwrap_or(DEFAULT_CHUNK_SIZE_BYTES))
    }

    // -------------------------------------------------------------------------
    // Folders CRUD
    // -------------------------------------------------------------------------
    pub fn create_folder(&self, record: &FolderRecord) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO folders (id, parent_id, name, color, created_at, updated_at, is_trashed)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                record.id,
                record.parent_id,
                record.name,
                record.color.as_deref().unwrap_or("#3b82f6"),
                record.created_at,
                record.updated_at,
                record.is_trashed
            ],
        )?;
        Ok(())
    }

    pub fn list_folders(&self, parent_id: Option<&str>, is_trashed: bool) -> Result<Vec<FolderRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let trashed_val = if is_trashed { 1 } else { 0 };

        let mut folders = Vec::new();
        match parent_id {
            Some(pid) => {
                let mut stmt = conn.prepare(
                    "SELECT id, parent_id, name, color, created_at, updated_at, is_trashed FROM folders WHERE parent_id = ?1 AND is_trashed = ?2 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![pid, trashed_val], |row| {
                    Ok(FolderRecord {
                        id: row.get(0)?,
                        parent_id: row.get(1)?,
                        name: row.get(2)?,
                        color: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                        is_trashed: row.get(6)?,
                    })
                })?;
                for f in rows {
                    folders.push(f?);
                }
            }
            None => {
                let mut stmt = conn.prepare(
                    "SELECT id, parent_id, name, color, created_at, updated_at, is_trashed FROM folders WHERE parent_id IS NULL AND is_trashed = ?1 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![trashed_val], |row| {
                    Ok(FolderRecord {
                        id: row.get(0)?,
                        parent_id: row.get(1)?,
                        name: row.get(2)?,
                        color: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                        is_trashed: row.get(6)?,
                    })
                })?;
                for f in rows {
                    folders.push(f?);
                }
            }
        }
        Ok(folders)
    }

    /// Dynamic breadcrumb path resolution from any nested folder up to Root ("Home")
    pub fn get_breadcrumbs(&self, current_folder_id: Option<&str>) -> Result<Vec<BreadcrumbItem>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut crumbs = Vec::new();
        let mut curr = current_folder_id.map(|s| s.to_string());

        while let Some(fid) = curr {
            let mut stmt = conn.prepare("SELECT id, parent_id, name FROM folders WHERE id = ?1")?;
            let res = stmt.query_row(params![fid], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                ))
            });

            match res {
                Ok((id, parent_id, name)) => {
                    crumbs.push(BreadcrumbItem { id: Some(id), name });
                    curr = parent_id;
                }
                Err(_) => break,
            }
        }

        crumbs.reverse();
        let mut full_path = vec![BreadcrumbItem { id: None, name: "Home".to_string() }];
        full_path.extend(crumbs);
        Ok(full_path)
    }

    /// Move a folder into another parent folder (with cycle/descendant guard)
    pub fn move_folder(&self, folder_id: &str, target_parent_id: Option<&str>) -> Result<(), AppError> {
        if let Some(target_id) = target_parent_id {
            if target_id == folder_id {
                return Err(AppError::Validation("Cannot move folder into itself".into()));
            }
            // Check if target_id is a descendant of folder_id
            let conn = self.conn.lock().unwrap();
            let mut curr = Some(target_id.to_string());
            while let Some(pid) = curr {
                if pid == folder_id {
                    return Err(AppError::Validation("Cannot move folder into its own sub-folder".into()));
                }
                let mut stmt = conn.prepare("SELECT parent_id FROM folders WHERE id = ?1")?;
                let res = stmt.query_row(params![pid], |row| row.get::<_, Option<String>>(0));
                match res {
                    Ok(next_pid) => curr = next_pid,
                    Err(_) => break,
                }
            }
        }

        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE folders SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![target_parent_id, now, folder_id],
        )?;
        Ok(())
    }

    /// Move a file into another folder (or root if None)
    pub fn move_file(&self, file_id: &str, target_folder_id: Option<&str>) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE files SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![target_folder_id, now, file_id],
        )?;
        Ok(())
    }

    pub fn rename_folder(&self, id: &str, new_name: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_name, now, id],
        )?;
        Ok(())
    }

    pub fn set_folder_trashed(&self, id: &str, is_trashed: bool) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let val = if is_trashed { 1 } else { 0 };
        conn.execute(
            "UPDATE folders SET is_trashed = ?1, updated_at = ?2 WHERE id = ?3",
            params![val, now, id],
        )?;
        Ok(())
    }

    pub fn delete_folder_permanent(&self, id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // Files CRUD
    // -------------------------------------------------------------------------
    pub fn create_file(&self, file: &FileRecord) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO files (id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                file.id,
                file.folder_id,
                file.name,
                file.total_size_bytes,
                file.mime_type,
                file.full_sha256,
                file.total_chunks,
                file.status,
                file.created_at,
                file.updated_at,
                file.is_trashed
            ],
        )?;
        Ok(())
    }

    pub fn get_file(&self, id: &str) -> Result<Option<FileRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files WHERE id = ?1"
        )?;
        let res = stmt
            .query_row(params![id], |row| {
                Ok(FileRecord {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    name: row.get(2)?,
                    total_size_bytes: row.get(3)?,
                    mime_type: row.get(4)?,
                    full_sha256: row.get(5)?,
                    total_chunks: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    is_trashed: row.get(10)?,
                })
            })
            .optional()?;
        Ok(res)
    }

    pub fn list_files(&self, folder_id: Option<&str>, is_trashed: bool) -> Result<Vec<FileRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let trashed_val = if is_trashed { 1 } else { 0 };

        let mut files = Vec::new();
        match folder_id {
            Some(fid) => {
                let mut stmt = conn.prepare(
                    "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files WHERE folder_id = ?1 AND is_trashed = ?2 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![fid, trashed_val], |row| {
                    Ok(FileRecord {
                        id: row.get(0)?,
                        folder_id: row.get(1)?,
                        name: row.get(2)?,
                        total_size_bytes: row.get(3)?,
                        mime_type: row.get(4)?,
                        full_sha256: row.get(5)?,
                        total_chunks: row.get(6)?,
                        status: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                        is_trashed: row.get(10)?,
                    })
                })?;
                for f in rows {
                    files.push(f?);
                }
            }
            None => {
                let mut stmt = conn.prepare(
                    "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files WHERE folder_id IS NULL AND is_trashed = ?1 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![trashed_val], |row| {
                    Ok(FileRecord {
                        id: row.get(0)?,
                        folder_id: row.get(1)?,
                        name: row.get(2)?,
                        total_size_bytes: row.get(3)?,
                        mime_type: row.get(4)?,
                        full_sha256: row.get(5)?,
                        total_chunks: row.get(6)?,
                        status: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                        is_trashed: row.get(10)?,
                    })
                })?;
                for f in rows {
                    files.push(f?);
                }
            }
        }
        Ok(files)
    }

    pub fn update_file_status(&self, id: &str, status: &str, full_sha256: Option<&str>) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE files SET status = ?1, full_sha256 = COALESCE(?2, full_sha256), updated_at = ?3 WHERE id = ?4",
            params![status, full_sha256, now, id],
        )?;
        Ok(())
    }

    pub fn set_file_trashed(&self, id: &str, is_trashed: bool) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let val = if is_trashed { 1 } else { 0 };
        conn.execute(
            "UPDATE files SET is_trashed = ?1, updated_at = ?2 WHERE id = ?3",
            params![val, now, id],
        )?;
        Ok(())
    }

    pub fn delete_file_permanent(&self, id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM files WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn rename_file(&self, id: &str, new_name: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE files SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_name, now, id],
        )?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // File Chunks CRUD
    // -------------------------------------------------------------------------
    pub fn insert_chunks_batch(&self, chunks: &[FileChunkRecord]) -> Result<(), AppError> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO file_chunks (id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ON CONFLICT(file_id, chunk_index) DO UPDATE SET
                    byte_offset = excluded.byte_offset,
                    byte_length = excluded.byte_length
                "#
            )?;

            for chunk in chunks {
                stmt.execute(params![
                    chunk.id,
                    chunk.file_id,
                    chunk.chunk_index,
                    chunk.byte_offset,
                    chunk.byte_length,
                    chunk.telegram_message_id,
                    chunk.chunk_sha256,
                    chunk.upload_status
                ])?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    pub fn get_chunks_for_file(&self, file_id: &str) -> Result<Vec<FileChunkRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status
            FROM file_chunks
            WHERE file_id = ?1
            ORDER BY chunk_index ASC
            "#,
        )?;

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(FileChunkRecord {
                id: row.get(0)?,
                file_id: row.get(1)?,
                chunk_index: row.get(2)?,
                byte_offset: row.get(3)?,
                byte_length: row.get(4)?,
                telegram_message_id: row.get(5)?,
                chunk_sha256: row.get(6)?,
                upload_status: row.get(7)?,
            })
        })?;

        let mut chunks = Vec::new();
        for r in rows {
            chunks.push(r?);
        }
        Ok(chunks)
    }

    pub fn get_pending_chunks_for_file(&self, file_id: &str) -> Result<Vec<FileChunkRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status
            FROM file_chunks
            WHERE file_id = ?1 AND upload_status != 'UPLOADED' AND upload_status != 'VERIFIED'
            ORDER BY chunk_index ASC
            "#,
        )?;

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(FileChunkRecord {
                id: row.get(0)?,
                file_id: row.get(1)?,
                chunk_index: row.get(2)?,
                byte_offset: row.get(3)?,
                byte_length: row.get(4)?,
                telegram_message_id: row.get(5)?,
                chunk_sha256: row.get(6)?,
                upload_status: row.get(7)?,
            })
        })?;

        let mut chunks = Vec::new();
        for r in rows {
            chunks.push(r?);
        }
        Ok(chunks)
    }

    pub fn update_chunk_uploaded(
        &self,
        file_id: &str,
        chunk_index: i64,
        telegram_message_id: i64,
        chunk_sha256: &str,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            UPDATE file_chunks
            SET telegram_message_id = ?1,
                chunk_sha256 = ?2,
                upload_status = 'UPLOADED'
            WHERE file_id = ?3 AND chunk_index = ?4
            "#,
            params![telegram_message_id, chunk_sha256, file_id, chunk_index],
        )?;
        Ok(())
    }

    pub fn update_chunk_verified(&self, file_id: &str, chunk_index: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE file_chunks SET upload_status = 'VERIFIED' WHERE file_id = ?1 AND chunk_index = ?2",
            params![file_id, chunk_index],
        )?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // Worker Bots CRUD
    // -------------------------------------------------------------------------
    pub fn upsert_worker_bot(&self, bot: &WorkerBotRecord) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO worker_bots (bot_id, bot_username, token_encrypted, cooldown_until, total_uploaded_bytes, is_active)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(bot_id) DO UPDATE SET
                bot_username = excluded.bot_username,
                token_encrypted = excluded.token_encrypted,
                is_active = excluded.is_active
            "#,
            params![
                bot.bot_id,
                bot.bot_username,
                bot.token_encrypted,
                bot.cooldown_until,
                bot.total_uploaded_bytes,
                bot.is_active
            ],
        )?;
        Ok(())
    }

    pub fn get_worker_bot(&self, bot_id: &str) -> Result<Option<WorkerBotRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT bot_id, bot_username, token_encrypted, cooldown_until, total_uploaded_bytes, is_active FROM worker_bots WHERE bot_id = ?1"
        )?;
        let res = stmt
            .query_row(params![bot_id], |row| {
                Ok(WorkerBotRecord {
                    bot_id: row.get(0)?,
                    bot_username: row.get(1)?,
                    token_encrypted: row.get(2)?,
                    cooldown_until: row.get(3)?,
                    total_uploaded_bytes: row.get(4)?,
                    is_active: row.get(5)?,
                })
            })
            .optional()?;
        Ok(res)
    }

    pub fn list_active_bots(&self) -> Result<Vec<WorkerBotRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT bot_id, bot_username, token_encrypted, cooldown_until, total_uploaded_bytes, is_active FROM worker_bots WHERE is_active = 1"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(WorkerBotRecord {
                bot_id: row.get(0)?,
                bot_username: row.get(1)?,
                token_encrypted: row.get(2)?,
                cooldown_until: row.get(3)?,
                total_uploaded_bytes: row.get(4)?,
                is_active: row.get(5)?,
            })
        })?;

        let mut bots = Vec::new();
        for b in rows {
            bots.push(b?);
        }
        Ok(bots)
    }

    pub fn update_bot_cooldown(&self, bot_id: &str, cooldown_until: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE worker_bots SET cooldown_until = ?1 WHERE bot_id = ?2",
            params![cooldown_until, bot_id],
        )?;
        Ok(())
    }

    pub fn add_bot_uploaded_bytes(&self, bot_id: &str, bytes: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE worker_bots SET total_uploaded_bytes = total_uploaded_bytes + ?1 WHERE bot_id = ?2",
            params![bytes, bot_id],
        )?;
        Ok(())
    }

    pub fn delete_worker_bot(&self, bot_id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM worker_bots WHERE bot_id = ?1", params![bot_id])?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // VFS Snapshot Export & Import for Cloud Sync
    // -------------------------------------------------------------------------
    pub fn export_vfs_snapshot(
        &self,
    ) -> Result<(Vec<FolderRecord>, Vec<FileRecord>, Vec<FileChunkRecord>), AppError> {
        let conn = self.conn.lock().unwrap();

        // Folders
        let mut f_stmt = conn.prepare("SELECT id, parent_id, name, color, created_at, updated_at, is_trashed FROM folders")?;
        let folders = f_stmt
            .query_map([], |r| {
                Ok(FolderRecord {
                    id: r.get(0)?,
                    parent_id: r.get(1)?,
                    name: r.get(2)?,
                    color: r.get(3)?,
                    created_at: r.get(4)?,
                    updated_at: r.get(5)?,
                    is_trashed: r.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Files
        let mut file_stmt = conn.prepare(
            "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files"
        )?;
        let files = file_stmt
            .query_map([], |r| {
                Ok(FileRecord {
                    id: r.get(0)?,
                    folder_id: r.get(1)?,
                    name: r.get(2)?,
                    total_size_bytes: r.get(3)?,
                    mime_type: r.get(4)?,
                    full_sha256: r.get(5)?,
                    total_chunks: r.get(6)?,
                    status: r.get(7)?,
                    created_at: r.get(8)?,
                    updated_at: r.get(9)?,
                    is_trashed: r.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Chunks
        let mut c_stmt = conn.prepare(
            "SELECT id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status FROM file_chunks"
        )?;
        let chunks = c_stmt
            .query_map([], |r| {
                Ok(FileChunkRecord {
                    id: r.get(0)?,
                    file_id: r.get(1)?,
                    chunk_index: r.get(2)?,
                    byte_offset: r.get(3)?,
                    byte_length: r.get(4)?,
                    telegram_message_id: r.get(5)?,
                    chunk_sha256: r.get(6)?,
                    upload_status: r.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok((folders, files, chunks))
    }

    /// Import and merge a remote VFS snapshot atomically inside a SQLite transaction
    pub fn import_vfs_snapshot(
        &self,
        folders: &[FolderRecord],
        files: &[FileRecord],
        chunks: &[FileChunkRecord],
    ) -> Result<(), AppError> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // 1. Upsert Folders
        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO folders (id, parent_id, name, color, created_at, updated_at, is_trashed)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ON CONFLICT(id) DO UPDATE SET
                    parent_id = excluded.parent_id,
                    name = excluded.name,
                    color = excluded.color,
                    updated_at = excluded.updated_at,
                    is_trashed = excluded.is_trashed
                WHERE excluded.updated_at >= folders.updated_at
                "#,
            )?;
            for f in folders {
                stmt.execute(params![
                    f.id,
                    f.parent_id,
                    f.name,
                    f.color.as_deref().unwrap_or("#3b82f6"),
                    f.created_at,
                    f.updated_at,
                    f.is_trashed
                ])?;
            }
        }

        // 2. Upsert Files
        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO files (id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                ON CONFLICT(id) DO UPDATE SET
                    folder_id = excluded.folder_id,
                    name = excluded.name,
                    total_size_bytes = excluded.total_size_bytes,
                    mime_type = excluded.mime_type,
                    full_sha256 = excluded.full_sha256,
                    total_chunks = excluded.total_chunks,
                    status = excluded.status,
                    updated_at = excluded.updated_at,
                    is_trashed = excluded.is_trashed
                WHERE excluded.updated_at >= files.updated_at
                "#,
            )?;
            for file in files {
                stmt.execute(params![
                    file.id,
                    file.folder_id,
                    file.name,
                    file.total_size_bytes,
                    file.mime_type,
                    file.full_sha256,
                    file.total_chunks,
                    file.status,
                    file.created_at,
                    file.updated_at,
                    file.is_trashed
                ])?;
            }
        }

        // 3. Upsert Chunks
        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO file_chunks (id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ON CONFLICT(file_id, chunk_index) DO UPDATE SET
                    telegram_message_id = COALESCE(excluded.telegram_message_id, file_chunks.telegram_message_id),
                    chunk_sha256 = COALESCE(excluded.chunk_sha256, file_chunks.chunk_sha256),
                    upload_status = CASE
                        WHEN excluded.upload_status IN ('UPLOADED', 'VERIFIED') THEN excluded.upload_status
                        ELSE file_chunks.upload_status
                    END
                "#,
            )?;
            for c in chunks {
                stmt.execute(params![
                    c.id,
                    c.file_id,
                    c.chunk_index,
                    c.byte_offset,
                    c.byte_length,
                    c.telegram_message_id,
                    c.chunk_sha256,
                    c.upload_status
                ])?;
            }
        }

        tx.commit()?;
        Ok(())
    }
}

```

# src\engine\chunk_merger.rs

```rs
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

```

# src\engine\chunk_uploader.rs

```rs
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

```

# src\engine\mod.rs

```rs
pub mod chunk_merger;
pub mod chunk_uploader;

```

# src\error.rs

```rs
use serde::{ser::SerializeStruct, Serialize, Serializer};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Keystore security error: {0}")]
    Keystore(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Telegram MTProto error: {0}")]
    Telegram(String),

    #[error("Telegram FLOOD_WAIT: cooldown required for {0} seconds")]
    FloodWait(u64),

    #[error("Authentication required: user session is missing or expired")]
    AuthRequired,

    #[error("Invalid phone number or authentication code")]
    InvalidAuthCode,

    #[error("2-Step Verification password is required for this Telegram account")]
    Password2FaRequired,

    #[error("Invalid 2-Step Verification password")]
    InvalidPassword,

    #[error("TeleCloud storage channel not provisioned or inaccessible")]
    StorageChannelNotFound,

    #[error("File system I/O error: {0}")]
    Io(String),

    #[error("Chunk integrity verification failed: expected {expected}, computed {computed}")]
    ChunkHashMismatch {
        expected: String,
        computed: String,
    },

    #[error("VFS file record not found: {0}")]
    FileNotFound(String),

    #[error("VFS folder record not found: {0}")]
    FolderNotFound(String),

    #[error("Input validation error: {0}")]
    Validation(String),

    #[error("Data serialization error: {0}")]
    Serialization(String),

    #[error("Worker bot pool exhausted or unavailable")]
    WorkerPoolExhausted,
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("AppError", 3)?;
        state.serialize_field("message", &self.to_string())?;

        let code = match self {
            AppError::Keystore(_) => "KEYSTORE_ERROR",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Telegram(_) => "TELEGRAM_ERROR",
            AppError::FloodWait(_) => "FLOOD_WAIT",
            AppError::AuthRequired => "AUTH_REQUIRED",
            AppError::InvalidAuthCode => "INVALID_AUTH_CODE",
            AppError::Password2FaRequired => "PASSWORD_2FA_REQUIRED",
            AppError::InvalidPassword => "INVALID_PASSWORD",
            AppError::StorageChannelNotFound => "CHANNEL_NOT_FOUND",
            AppError::Io(_) => "IO_ERROR",
            AppError::ChunkHashMismatch { .. } => "HASH_MISMATCH",
            AppError::FileNotFound(_) => "FILE_NOT_FOUND",
            AppError::FolderNotFound(_) => "FOLDER_NOT_FOUND",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::Serialization(_) => "SERIALIZATION_ERROR",
            AppError::WorkerPoolExhausted => "WORKER_POOL_EXHAUSTED",
        };
        state.serialize_field("code", code)?;

        if let AppError::FloodWait(wait_seconds) = self {
            state.serialize_field("retry_after_secs", &Some(wait_seconds))?;
        } else {
            state.serialize_field("retry_after_secs", &None::<u64>)?;
        }

        state.end()
    }
}

```

# src\lib.rs

```rs
pub mod android_bridge;
pub mod commands;
pub mod db;
pub mod engine;
pub mod error;
pub mod telegram;
pub mod vault;

use std::sync::Arc;
use tauri::{Emitter, Manager};

use db::cloud_sync::CloudSyncManager;
use db::schema::DbManager;
use engine::chunk_merger::ChunkMergerManager;
use engine::chunk_uploader::ChunkUploaderManager;
use telegram::bot_pool::BotPool;
use telegram::client::TelegramClientManager;
use vault::keystore::Keystore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            eprintln!("===> SETUP HOOK CALLED");
            let app_handle = app.handle();

            #[cfg(desktop)]
            {
                let app_handle_show = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
                    if let Some(win) = app_handle_show.get_webview_window("main") {
                        let _ = win.show();
                    }
                });
            }
            eprintln!("===> Initializing keystore");
            let keystore = Arc::new(Keystore::new(app_handle)?);
            eprintln!("===> Initializing db");
            let db = Arc::new(DbManager::new(app_handle)?);
            eprintln!("===> Initializing tg manager");
            let tg = Arc::new(TelegramClientManager::new(
                app_handle,
                Arc::clone(&keystore),
                Arc::clone(&db),
            )?);
            eprintln!("===> Initializing bot pool");
            let bot_pool = Arc::new(BotPool::new(
                app_handle,
                Arc::clone(&keystore),
                Arc::clone(&db),
                Arc::clone(&tg),
            )?);
            eprintln!("===> Initializing cloud sync");
            let cloud_sync = Arc::new(CloudSyncManager::new(
                app_handle,
                Arc::clone(&db),
                Arc::clone(&tg),
                Arc::clone(&keystore),
            )?);
            cloud_sync.set_bot_pool(Arc::clone(&bot_pool));

            eprintln!("===> Initializing transfer engines");
            let uploader = Arc::new(ChunkUploaderManager::new(
                Arc::clone(&db),
                Arc::clone(&bot_pool),
                Arc::clone(&cloud_sync),
                Arc::clone(&tg),
            ));
            let merger = Arc::new(ChunkMergerManager::new(
                Arc::clone(&db),
                Arc::clone(&bot_pool),
                Arc::clone(&tg),
            ));

            // Background task: initialize stored worker bots and continuous real-time cloud VFS sync loop
            let pool_init = Arc::clone(&bot_pool);
            let sync_init = Arc::clone(&cloud_sync);
            let tg_init = Arc::clone(&tg);
            let app_handle_bg = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = pool_init.initialize_from_db().await {
                    eprintln!("Bot pool initialization error: {e}");
                }

                // Initial sync
                if let Ok(true) = tg_init.is_authorized().await {
                    eprintln!("===> Auto-syncing initial VFS snapshot from cloud channel...");
                    if let Ok(true) = sync_init.pull_vfs_index(false).await {
                        let _ = app_handle_bg.emit("vfs-changed", ());
                    }
                }

                // Continuous real-time multi-device sync loop (polls every 5 seconds)
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    if let Ok(true) = tg_init.is_authorized().await {
                        match sync_init.pull_vfs_index(false).await {
                            Ok(true) => {
                                eprintln!("===> Real-time multi-device sync: merged newer cloud VFS snapshot!");
                                let _ = app_handle_bg.emit("vfs-changed", ());
                            }
                            Ok(false) => {
                                // Up to date
                            }
                            Err(e) => {
                                eprintln!("Real-time sync poller notice: {e}");
                            }
                        }
                    }
                }
            });

            app.manage(keystore);
            app.manage(db);
            app.manage(tg);
            app.manage(bot_pool);
            app.manage(cloud_sync);
            app.manage(uploader);
            app.manage(merger);

            eprintln!("===> SETUP HOOK COMPLETED SUCCESSFULLY");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::show_main_window,
            commands::check_setup_status,
            commands::save_initial_credentials,
            commands::request_login_code,
            commands::submit_login_code,
            commands::submit_password_2fa,
            commands::check_auth_status,
            commands::provision_channel,
            commands::get_telegram_me,
            commands::get_vault_config,
            commands::set_chunk_size,
            commands::list_folders,
            commands::list_files,
            commands::get_folder_breadcrumbs,
            commands::get_subfolders,
            commands::get_files_in_folder,
            commands::move_folder,
            commands::move_file,
            commands::create_folder,
            commands::rename_folder,
            commands::delete_folder,
            commands::rename_file,
            commands::delete_file,
            commands::get_file_chunks,
            commands::wipe_vault,
            commands::push_vfs_index,
            commands::pull_vfs_index,
            commands::get_sync_status,
            commands::add_worker_bot,
            commands::list_worker_bots,
            commands::remove_worker_bot,
            commands::get_bot_pool_health,
            commands::start_upload,
            commands::stage_upload_chunk,
            commands::pause_upload,
            commands::resume_upload,
            commands::cancel_upload,
            commands::start_download,
            commands::pause_download,
            commands::resume_download,
            commands::cancel_download,
            commands::get_default_download_directory,
            commands::request_android_permissions
        ])
        .run(tauri::generate_context!())
        .expect("error while running TeleCloud Vault application");
}

```

# src\main.rs

```rs
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    {
        // Prevent Windows WebView2 from throttling background timers and suspending active operations
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--disable-background-timer-throttling --disable-renderer-backgrounding",
        );
    }
    telecloud_vault_lib::run();
}

```

# src\telegram\bot_pool.rs

```rs
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

```

# src\telegram\client.rs

```rs
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

```

# src\telegram\flood_guard.rs

```rs
use std::time::{SystemTime, UNIX_EPOCH};
use grammers_mtsender::InvocationError;
use rand::Rng;
use tokio::time::{sleep, Duration};

/// Helper to get current Unix timestamp in seconds
pub fn current_unix_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Injects a randomized delay between 2,500ms and 4,500ms before chunk upload
/// or high-frequency Telegram RPC operations to prevent rate limiting.
pub async fn inject_jitter() {
    let jitter_ms = {
        let mut rng = rand::thread_rng();
        rng.gen_range(2500..=4500)
    };
    sleep(Duration::from_millis(jitter_ms)).await;
}

/// Inspects a Telegram RPC error or InvocationError to determine if it is a FLOOD_WAIT error.
/// If so, extracts the required wait duration in seconds.
pub fn extract_flood_wait_secs(err: &InvocationError) -> Option<u64> {
    match err {
        InvocationError::Rpc(rpc_err) => {
            // grammers-mtsender normalizes "FLOOD_WAIT_X" to name="FLOOD_WAIT" with value=Some(X)
            if rpc_err.name == "FLOOD_WAIT" {
                return Some(rpc_err.value.unwrap_or(30) as u64);
            }

            if rpc_err.name.starts_with("FLOOD_WAIT") {
                if let Some(val) = rpc_err.value {
                    return Some(val as u64);
                }
                // Try parsing numerical suffix if present
                let suffix = rpc_err.name.trim_start_matches("FLOOD_WAIT_").trim_start_matches("FLOOD_WAIT");
                if let Ok(num) = suffix.parse::<u64>() {
                    return Some(num);
                }
                return Some(30);
            }
            None
        }
        _ => parse_flood_wait_from_str(&err.to_string()),
    }
}

/// Parses FLOOD_WAIT duration from raw error string
pub fn parse_flood_wait_from_str(err_str: &str) -> Option<u64> {
    if let Some(pos) = err_str.find("FLOOD_WAIT_") {
        let rest = &err_str[pos + "FLOOD_WAIT_".len()..];
        let num_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
        if let Ok(num) = num_str.parse::<u64>() {
            return Some(num);
        }
        return Some(30);
    } else if err_str.contains("FLOOD_WAIT") {
        return Some(30);
    }
    None
}

/// Calculates cooldown timestamp: current_time + X + 2 seconds buffer (Rule 5)
pub fn calculate_cooldown_timestamp(wait_secs: u64) -> i64 {
    current_unix_timestamp() + wait_secs as i64 + 2
}

/// Checks whether an InvocationError indicates a flood wait condition
pub fn is_flood_wait(err: &InvocationError) -> bool {
    extract_flood_wait_secs(err).is_some()
}

```

# src\telegram\mod.rs

```rs
pub mod bot_pool;
pub mod client;
pub mod flood_guard;
pub mod session;

```

# src\telegram\session.rs

```rs
// TeleCloud Vault — RusqliteSession MTProto Session Storage
// Replaces libsql with bundled rusqlite to eliminate MSVC duplicate symbol link collisions.

use std::collections::HashMap;
use std::fmt;
use std::net::{AddrParseError, Ipv4Addr, Ipv6Addr, SocketAddrV4, SocketAddrV6};
use std::path::Path;
use std::sync::{Arc, Mutex};

use grammers_session::{
    types::{
        ChannelKind, ChannelState, DcOption, PeerAuth, PeerId, PeerInfo, PeerKind, UpdateState,
        UpdatesState,
    },
    BoxFuture, Session,
};
use rusqlite::{params, Connection, OptionalExtension};

pub const DEFAULT_DC: i32 = 2;

const fn ipv4(a: u8, b: u8, c: u8, d: u8) -> SocketAddrV4 {
    SocketAddrV4::new(Ipv4Addr::new(a, b, c, d), 443)
}

const fn ipv6(a: u16, b: u16, c: u16, d: u16, e: u16, f: u16, g: u16, h: u16) -> SocketAddrV6 {
    SocketAddrV6::new(Ipv6Addr::new(a, b, c, d, e, f, g, h), 443, 0, 0)
}

pub const KNOWN_DC_OPTIONS: [DcOption; 5] = [
    DcOption {
        id: 1,
        ipv4: ipv4(149, 154, 175, 53),
        ipv6: ipv6(0x2001, 0xb28, 0xf23d, 0xf001, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 2,
        ipv4: ipv4(149, 154, 167, 41),
        ipv6: ipv6(0x2001, 0x67c, 0x4e8, 0xf002, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 3,
        ipv4: ipv4(149, 154, 175, 100),
        ipv6: ipv6(0x2001, 0xb28, 0xf23d, 0xf003, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 4,
        ipv4: ipv4(149, 154, 167, 92),
        ipv6: ipv6(0x2001, 0x67c, 0x4e8, 0xf004, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 5,
        ipv4: ipv4(91, 108, 56, 104),
        ipv6: ipv6(0x2001, 0xb28, 0xf23f, 0xf005, 0, 0, 0, 0xa),
        auth_key: None,
    },
];

#[repr(u8)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum PeerSubtype {
    UserBot = 1,
    UserSelf = 2,
    UserSelfBot = 3,
    Megagroup = 4,
    Broadcast = 8,
    Gigagroup = 12,
    Community = 16,
}

#[derive(Debug)]
pub enum RusqliteSessionError {
    Poisoned,
    AddrParse(AddrParseError),
    Sql(rusqlite::Error),
    InvalidAuthKeyLength(usize),
}

impl std::error::Error for RusqliteSessionError {}

impl fmt::Display for RusqliteSessionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Poisoned => write!(f, "session lock is poisoned"),
            Self::AddrParse(e) => write!(f, "invalid socket address: {e}"),
            Self::Sql(e) => write!(f, "sqlite error: {e}"),
            Self::InvalidAuthKeyLength(len) => {
                write!(f, "invalid auth_key length: expected 256, got {len}")
            }
        }
    }
}

impl From<AddrParseError> for RusqliteSessionError {
    fn from(err: AddrParseError) -> Self {
        Self::AddrParse(err)
    }
}

impl From<rusqlite::Error> for RusqliteSessionError {
    fn from(err: rusqlite::Error) -> Self {
        Self::Sql(err)
    }
}

struct Cache {
    home_dc: i32,
    dc_options: HashMap<i32, DcOption>,
}

#[derive(Clone)]
pub struct RusqliteSession {
    conn: Arc<Mutex<Connection>>,
    cache: Arc<Mutex<Cache>>,
}

impl RusqliteSession {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, RusqliteSessionError> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS dc_home (
                 dc_id INTEGER NOT NULL PRIMARY KEY
             );
             CREATE TABLE IF NOT EXISTS dc_option (
                 dc_id INTEGER NOT NULL PRIMARY KEY,
                 ipv4 TEXT NOT NULL,
                 ipv6 TEXT NOT NULL,
                 auth_key BLOB
             );
             CREATE TABLE IF NOT EXISTS peer_info (
                 peer_id INTEGER NOT NULL PRIMARY KEY,
                 hash INTEGER,
                 subtype INTEGER
             );
             CREATE TABLE IF NOT EXISTS update_state (
                 pts INTEGER NOT NULL,
                 qts INTEGER NOT NULL,
                 date INTEGER NOT NULL,
                 seq INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS channel_state (
                 peer_id INTEGER NOT NULL PRIMARY KEY,
                 pts INTEGER NOT NULL
             );",
        )?;

        let home_dc: i32 = conn
            .query_row("SELECT dc_id FROM dc_home LIMIT 1", [], |row| row.get(0))
            .optional()?
            .unwrap_or(DEFAULT_DC);

        let dc_options = {
            let mut stmt = conn.prepare("SELECT dc_id, ipv4, ipv6, auth_key FROM dc_option")?;
            let dc_options_rows = stmt.query_map([], |row| {
                let id: i32 = row.get(0)?;
                let ipv4_str: String = row.get(1)?;
                let ipv6_str: String = row.get(2)?;
                let auth_key_raw: Option<Vec<u8>> = row.get(3)?;
                Ok((id, ipv4_str, ipv6_str, auth_key_raw))
            })?;

            let mut map = HashMap::new();
            for item in dc_options_rows {
                let (id, ipv4_str, ipv6_str, auth_key_raw) = item?;
                let ipv4: SocketAddrV4 = ipv4_str.parse().map_err(RusqliteSessionError::AddrParse)?;
                let ipv6: SocketAddrV6 = ipv6_str.parse().map_err(RusqliteSessionError::AddrParse)?;
                let auth_key = match auth_key_raw {
                    Some(bytes) => {
                        let len = bytes.len();
                        let key: [u8; 256] = bytes
                            .try_into()
                            .map_err(|_| RusqliteSessionError::InvalidAuthKeyLength(len))?;
                        Some(key)
                    }
                    None => None,
                };
                map.insert(
                    id,
                    DcOption {
                        id,
                        ipv4,
                        ipv6,
                        auth_key,
                    },
                );
            }
            map
        };

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            cache: Arc::new(Mutex::new(Cache {
                home_dc,
                dc_options,
            })),
        })
    }
}

impl Session for RusqliteSession {
    type Error = RusqliteSessionError;

    fn home_dc_id(&self) -> Result<i32, Self::Error> {
        Ok(self
            .cache
            .lock()
            .map_err(|_| RusqliteSessionError::Poisoned)?
            .home_dc)
    }

    fn set_home_dc_id(&self, dc_id: i32) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        let cache = Arc::clone(&self.cache);
        Box::pin(async move {
            {
                let mut guard = cache.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
                guard.home_dc = dc_id;
            }
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            conn_guard.execute("DELETE FROM dc_home", [])?;
            conn_guard.execute("INSERT INTO dc_home (dc_id) VALUES (?1)", params![dc_id])?;
            Ok(())
        })
    }

    fn dc_option(&self, dc_id: i32) -> Result<Option<DcOption>, Self::Error> {
        Ok(self
            .cache
            .lock()
            .map_err(|_| RusqliteSessionError::Poisoned)?
            .dc_options
            .get(&dc_id)
            .cloned()
            .or_else(|| {
                KNOWN_DC_OPTIONS
                    .iter()
                    .find(|dc_option| dc_option.id == dc_id)
                    .cloned()
            }))
    }

    fn set_dc_option(&self, dc_option: &DcOption) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        let cache = Arc::clone(&self.cache);
        let dc_option = dc_option.clone();
        Box::pin(async move {
            {
                let mut guard = cache.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
                guard.dc_options.insert(dc_option.id, dc_option.clone());
            }
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let auth_key_slice = dc_option.auth_key.as_ref().map(|k| k.as_slice());
            conn_guard.execute(
                "INSERT OR REPLACE INTO dc_option (dc_id, ipv4, ipv6, auth_key) VALUES (?1, ?2, ?3, ?4)",
                params![
                    dc_option.id,
                    dc_option.ipv4.to_string(),
                    dc_option.ipv6.to_string(),
                    auth_key_slice
                ],
            )?;
            Ok(())
        })
    }

    fn peer(&self, peer: PeerId) -> BoxFuture<'_, Result<Option<PeerInfo>, Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;

            let map_row = |row: &rusqlite::Row| -> rusqlite::Result<PeerInfo> {
                let id_val: i64 = row.get(0)?;
                let hash_val: Option<i64> = row.get(1)?;
                let subtype_val: Option<i64> = row.get(2)?;
                let subtype = subtype_val.map(|s| s as u8);

                let auth = hash_val.map(PeerAuth::from_hash);

                Ok(match peer.kind() {
                    PeerKind::User => PeerInfo::User {
                        id: PeerId::user_unchecked(id_val).bare_id_unchecked(),
                        auth,
                        bot: subtype.map(|s| s & (PeerSubtype::UserBot as u8) != 0),
                        is_self: subtype.map(|s| s & (PeerSubtype::UserSelf as u8) != 0),
                    },
                    PeerKind::Chat => PeerInfo::Chat {
                        id: peer.bare_id_unchecked(),
                    },
                    PeerKind::Channel => PeerInfo::Channel {
                        id: peer.bare_id_unchecked(),
                        auth,
                        kind: subtype.and_then(|s| {
                            if (s & PeerSubtype::Gigagroup as u8) == PeerSubtype::Gigagroup as u8 {
                                Some(ChannelKind::Gigagroup)
                            } else if s & PeerSubtype::Broadcast as u8 != 0 {
                                Some(ChannelKind::Broadcast)
                            } else if s & PeerSubtype::Megagroup as u8 != 0 {
                                Some(ChannelKind::Megagroup)
                            } else {
                                None
                            }
                        }),
                    },
                })
            };

            if let Some(peer_id) = peer.bot_api_dialog_id() {
                conn_guard
                    .query_row(
                        "SELECT peer_id, hash, subtype FROM peer_info WHERE peer_id = ?1 LIMIT 1",
                        params![peer_id],
                        map_row,
                    )
                    .optional()
                    .map_err(RusqliteSessionError::Sql)
            } else {
                conn_guard
                    .query_row(
                        "SELECT peer_id, hash, subtype FROM peer_info WHERE (subtype & ?1) != 0 LIMIT 1",
                        params![PeerSubtype::UserSelf as i64],
                        map_row,
                    )
                    .optional()
                    .map_err(RusqliteSessionError::Sql)
            }
        })
    }

    fn cache_peer(&self, peer: PeerInfo) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        let peer_clone = peer.clone();
        Box::pin(async move {
            let mut final_peer = peer_clone;
            if let Some(mut existing) = self.peer(final_peer.id()).await? {
                existing.extend_info(&final_peer);
                final_peer = existing;
            }

            let subtype = match &final_peer {
                PeerInfo::User { bot, is_self, .. } => {
                    match (bot.unwrap_or_default(), is_self.unwrap_or_default()) {
                        (true, true) => Some(PeerSubtype::UserSelfBot),
                        (true, false) => Some(PeerSubtype::UserBot),
                        (false, true) => Some(PeerSubtype::UserSelf),
                        (false, false) => None,
                    }
                }
                PeerInfo::Chat { .. } => None,
                PeerInfo::Channel { kind, .. } => kind.map(|k| match k {
                    ChannelKind::Megagroup => PeerSubtype::Megagroup,
                    ChannelKind::Broadcast => PeerSubtype::Broadcast,
                    ChannelKind::Gigagroup => PeerSubtype::Gigagroup,
                    ChannelKind::Community => PeerSubtype::Community,
                }),
            };

            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let peer_id = final_peer.id().bot_api_dialog_id_unchecked();
            let hash = final_peer.auth().map(|a| a.hash());
            let subtype_num = subtype.map(|s| s as i64);

            conn_guard.execute(
                "INSERT OR REPLACE INTO peer_info (peer_id, hash, subtype) VALUES (?1, ?2, ?3)",
                params![peer_id, hash, subtype_num],
            )?;
            Ok(())
        })
    }

    fn cache_peers(&self, peers: Vec<PeerInfo>) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let mut extended_peers = Vec::with_capacity(peers.len());
            for peer in peers {
                if let Some(mut existing) = self.peer(peer.id()).await? {
                    existing.extend_info(&peer);
                    extended_peers.push(existing);
                } else {
                    extended_peers.push(peer);
                }
            }

            let mut conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let tx = conn_guard.transaction()?;
            for p in extended_peers {
                let subtype = match &p {
                    PeerInfo::User { bot, is_self, .. } => {
                        match (bot.unwrap_or_default(), is_self.unwrap_or_default()) {
                            (true, true) => Some(PeerSubtype::UserSelfBot),
                            (true, false) => Some(PeerSubtype::UserBot),
                            (false, true) => Some(PeerSubtype::UserSelf),
                            (false, false) => None,
                        }
                    }
                    PeerInfo::Chat { .. } => None,
                    PeerInfo::Channel { kind, .. } => kind.map(|k| match k {
                        ChannelKind::Megagroup => PeerSubtype::Megagroup,
                        ChannelKind::Broadcast => PeerSubtype::Broadcast,
                        ChannelKind::Gigagroup => PeerSubtype::Gigagroup,
                        ChannelKind::Community => PeerSubtype::Community,
                    }),
                };
                let peer_id = p.id().bot_api_dialog_id_unchecked();
                let hash = p.auth().map(|a| a.hash());
                let subtype_num = subtype.map(|s| s as i64);

                tx.execute(
                    "INSERT OR REPLACE INTO peer_info (peer_id, hash, subtype) VALUES (?1, ?2, ?3)",
                    params![peer_id, hash, subtype_num],
                )?;
            }
            tx.commit()?;
            Ok(())
        })
    }

    fn updates_state(&self) -> BoxFuture<'_, Result<UpdatesState, Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;

            let state_opt = conn_guard
                .query_row(
                    "SELECT pts, qts, date, seq FROM update_state LIMIT 1",
                    [],
                    |row| {
                        Ok(UpdatesState {
                            pts: row.get(0)?,
                            qts: row.get(1)?,
                            date: row.get(2)?,
                            seq: row.get(3)?,
                            channels: Vec::new(),
                        })
                    },
                )
                .optional()?;

            let mut state = state_opt.unwrap_or_default();

            let mut stmt = conn_guard.prepare("SELECT peer_id, pts FROM channel_state")?;
            let channels_iter = stmt.query_map([], |row| {
                Ok(ChannelState {
                    id: row.get(0)?,
                    pts: row.get(1)?,
                })
            })?;

            for ch in channels_iter {
                state.channels.push(ch?);
            }

            Ok(state)
        })
    }

    fn set_update_state(
        &self,
        update: UpdateState,
    ) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let mut conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let tx = conn_guard.transaction()?;

            match update {
                UpdateState::All(updates_state) => {
                    tx.execute("DELETE FROM update_state", [])?;
                    tx.execute(
                        "INSERT INTO update_state (pts, qts, date, seq) VALUES (?1, ?2, ?3, ?4)",
                        params![
                            updates_state.pts,
                            updates_state.qts,
                            updates_state.date,
                            updates_state.seq
                        ],
                    )?;
                    tx.execute("DELETE FROM channel_state", [])?;
                    for ch in updates_state.channels {
                        tx.execute(
                            "INSERT INTO channel_state (peer_id, pts) VALUES (?1, ?2)",
                            params![ch.id, ch.pts],
                        )?;
                    }
                }
                UpdateState::Primary { pts, date, seq } => {
                    let has_state: bool = tx
                        .query_row("SELECT 1 FROM update_state LIMIT 1", [], |_| Ok(true))
                        .optional()?
                        .unwrap_or(false);

                    if has_state {
                        tx.execute(
                            "UPDATE update_state SET pts = ?1, date = ?2, seq = ?3",
                            params![pts, date, seq],
                        )?;
                    } else {
                        tx.execute(
                            "INSERT INTO update_state (pts, qts, date, seq) VALUES (?1, 0, ?2, ?3)",
                            params![pts, date, seq],
                        )?;
                    }
                }
                UpdateState::Secondary { qts } => {
                    let has_state: bool = tx
                        .query_row("SELECT 1 FROM update_state LIMIT 1", [], |_| Ok(true))
                        .optional()?
                        .unwrap_or(false);

                    if has_state {
                        tx.execute(
                            "UPDATE update_state SET qts = ?1",
                            params![qts],
                        )?;
                    } else {
                        tx.execute(
                            "INSERT INTO update_state (pts, qts, date, seq) VALUES (0, ?1, 0, 0)",
                            params![qts],
                        )?;
                    }
                }
                UpdateState::Channel { id, pts } => {
                    tx.execute(
                        "INSERT OR REPLACE INTO channel_state (peer_id, pts) VALUES (?1, ?2)",
                        params![id, pts],
                    )?;
                }
            }

            tx.commit()?;
            Ok(())
        })
    }
}

```

# src\vault\keystore.rs

```rs
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

```

# src\vault\mod.rs

```rs
pub mod keystore;

```

# tauri.android.conf.json

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "TeleCloud",
        "fullscreen": true,
        "resizable": true,
        "visible": true
      }
    ]
  }
}

```

# tauri.conf.json

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "TeleCloud",
  "version": "1.0.0",
  "identifier": "com.telecloud.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "TeleCloud — Unlimited Cloud Storage",
        "width": 1280,
        "height": 840,
        "minWidth": 960,
        "minHeight": 640,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "center": true,
        "visible": false,
        "theme": "Dark",
        "backgroundColor": [6, 9, 14, 255],
        "backgroundThrottling": "disabled"
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "wix": {
        "language": "en-US"
      },
      "nsis": {
        "installMode": "perMachine"
      }
    }
  }
}

```



// File: MainActivity.kt
package com.telecloud.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.provider.Settings
import android.util.Log
import android.webkit.MimeTypeMap
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.URLDecoder

class MainActivity : TauriActivity() {

    companion object {
        const val CHANNEL_ID = "telecloud_transfers_v5"
        const val CHANNEL_NAME = "File Transfers"
        const val TAG = "TeleCloudApp"
        const val PERMISSION_REQUEST_CODE = 4201

        @Volatile
        @JvmStatic
        var instance: MainActivity? = null

        @Volatile
        private var appContext: Context? = null

        init {
            try {
                System.loadLibrary("telecloud_vault_lib")
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to load telecloud_vault_lib from MainActivity static init", e)
            }
        }

        @JvmStatic
        fun getDownloadsPath(): String {
            val ctx = instance
            // App-specific external files directory (Environment.DIRECTORY_DOWNLOADS)
            // Path: /storage/emulated/0/Android/data/com.telecloud.app/files/Download
            // Guaranteed 100% writable on ALL Android versions (including Android 11, 12, 13, 14, 15) without permission errors!
            if (ctx != null) {
                val appDownloads = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                if (appDownloads != null) {
                    if (!appDownloads.exists()) {
                        appDownloads.mkdirs()
                    }
                    Log.d(TAG, "Using app external Downloads directory: ${appDownloads.absolutePath}")
                    return appDownloads.absolutePath
                }
                val internalDownloads = File(ctx.filesDir, "Downloads")
                if (!internalDownloads.exists()) {
                    internalDownloads.mkdirs()
                }
                return internalDownloads.absolutePath
            }

            return "/data/data/com.telecloud.app/files/Downloads"
        }

        @JvmStatic
        fun scanMediaFile(path: String) {
            val ctx = instance ?: return
            try {
                val file = File(path)
                if (!file.exists()) return

                // On Android 10+ (API 29+), publish copy to MediaStore Downloads collection if it is not already in public downloads
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    copyToPublicDownloads(ctx, file)
                }

                MediaScannerConnection.scanFile(ctx, arrayOf(path), null) { scannedPath, uri ->
                    Log.d(TAG, "Media scan complete for: $scannedPath -> $uri")
                }
            } catch (e: Exception) {
                Log.e(TAG, "scanMediaFile error: ${e.message}", e)
            }
        }

        private fun copyToPublicDownloads(ctx: Context, file: File) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
            try {
                val extension = file.extension.lowercase()
                val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "application/octet-stream"

                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, file.name)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }

                val resolver = ctx.contentResolver
                val collectionUri = MediaStore.Downloads.EXTERNAL_CONTENT_URI
                val itemUri = resolver.insert(collectionUri, values)

                if (itemUri != null) {
                    resolver.openOutputStream(itemUri)?.use { out ->
                        file.inputStream().use { input ->
                            input.copyTo(out)
                        }
                    }
                    values.clear()
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                    resolver.update(itemUri, values, null, null)
                    Log.d(TAG, "Successfully published to MediaStore.Downloads: ${file.name}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Could not mirror file to MediaStore.Downloads: ${e.message}")
            }
        }

        @JvmStatic
        fun resolveContentUriToCache(uriString: String): String? {
            val ctx = instance ?: appContext ?: return null
            return try {
                Log.d(TAG, "Resolving content URI: $uriString")
                val decodedUriString = try {
                    URLDecoder.decode(uriString, "UTF-8")
                } catch (_: Exception) {
                    uriString
                }

                val uri = Uri.parse(uriString)
                val decodedUri = Uri.parse(decodedUriString)

                // 1. Direct filesystem path resolution (fast path: zero-copy)
                val directPath = resolveDirectPath(ctx, uri) ?: resolveDirectPath(ctx, decodedUri)
                if (!directPath.isNullOrBlank()) {
                    val directFile = File(directPath)
                    if (directFile.exists() && directFile.canRead()) {
                        Log.d(TAG, "Resolved URI directly to readable file: $directPath (size: ${directFile.length()} bytes)")
                        return directPath
                    }
                }

                // 2. Multi-tier stream resolution
                val streamResult = openStreamWithFallbacks(ctx, uri)
                    ?: openStreamWithFallbacks(ctx, decodedUri)

                if (streamResult == null) {
                    Log.e(TAG, "All stream resolution fallbacks failed for URI: $uriString")
                    return null
                }

                val (inputStream, sourceFileName) = streamResult
                val cacheDir = File(ctx.cacheDir, "vault_uploads")
                if (!cacheDir.exists()) {
                    cacheDir.mkdirs()
                }

                val safeName = (sourceFileName ?: "upload_${System.currentTimeMillis()}").replace("[/\\\\:*?\"<>|]".toRegex(), "_")
                val outFile = File(cacheDir, "${System.currentTimeMillis()}_$safeName")

                inputStream.use { input ->
                    FileOutputStream(outFile).use { output ->
                        input.copyTo(output)
                    }
                }

                Log.d(TAG, "Resolved content URI '$uriString' to cached file: ${outFile.absolutePath} (size: ${outFile.length()} bytes)")
                outFile.absolutePath
            } catch (e: Exception) {
                Log.e(TAG, "Failed resolving content URI: $uriString", e)
                null
            }
        }

        private fun resolveDirectPath(ctx: Context, uri: Uri): String? {
            try {
                val authority = uri.authority ?: return null

                // ExternalStorageProvider (e.g. primary:Download/filename.ext)
                if (authority.equals("com.android.externalstorage.documents", ignoreCase = true)) {
                    val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: return null
                    val split = docId.split(":")
                    if (split.size >= 2) {
                        val type = split[0]
                        val relativePath = split[1]
                        if ("primary".equals(type, ignoreCase = true)) {
                            return "${Environment.getExternalStorageDirectory()}/$relativePath"
                        } else {
                            val extDirs = ctx.getExternalFilesDirs(null)
                            for (dir in extDirs) {
                                if (dir != null) {
                                    val path = dir.absolutePath
                                    val index = path.indexOf("/Android/data")
                                    if (index > 0) {
                                        val root = path.substring(0, index)
                                        val file = File(root, relativePath)
                                        if (file.exists() && file.canRead()) return file.absolutePath
                                    }
                                }
                            }
                        }
                    }
                }

                // DownloadsProvider (e.g. msf:1000014323 or raw:/storage/emulated/0/Download/...)
                if (authority.equals("com.android.providers.downloads.documents", ignoreCase = true)) {
                    val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: return null
                    if (docId.startsWith("raw:")) {
                        return docId.removePrefix("raw:")
                    }
                    if (docId.startsWith("/")) {
                        return docId
                    }

                    val decodedDocId = try { URLDecoder.decode(docId, "UTF-8") } catch (_: Exception) { docId }
                    val idStr = if (decodedDocId.contains(":")) decodedDocId.substringAfterLast(":") else decodedDocId
                    val rawId = idStr.removePrefix("msf:").removePrefix("msf%3A").trim().toLongOrNull()
                        ?: Regex("""(\d+)$""").find(docId)?.value?.toLongOrNull()
                    if (rawId != null) {
                        val projection = arrayOf(MediaStore.MediaColumns.DATA)

                        // 1. MediaStore.Files with direct ID URI
                        try {
                            val directFileUri = ContentUris.withAppendedId(MediaStore.Files.getContentUri("external"), rawId)
                            ctx.contentResolver.query(directFileUri, projection, null, null, null)?.use { cursor ->
                                if (cursor.moveToFirst()) {
                                    val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                    if (col != -1) {
                                        val data = cursor.getString(col)
                                        if (!data.isNullOrBlank()) return data
                                    }
                                }
                            }
                        } catch (_: Exception) {}

                        // 2. MediaStore.Files with _ID = ? selection
                        try {
                            ctx.contentResolver.query(
                                MediaStore.Files.getContentUri("external"),
                                projection,
                                "${MediaStore.MediaColumns._ID} = ?",
                                arrayOf(rawId.toString()),
                                null
                            )?.use { cursor ->
                                if (cursor.moveToFirst()) {
                                    val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                    if (col != -1) {
                                        val data = cursor.getString(col)
                                        if (!data.isNullOrBlank()) return data
                                    }
                                }
                            }
                        } catch (_: Exception) {}

                        // 3. MediaStore.Downloads (API 29+)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            try {
                                val downloadItemUri = ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, rawId)
                                ctx.contentResolver.query(downloadItemUri, projection, null, null, null)?.use { cursor ->
                                    if (cursor.moveToFirst()) {
                                        val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                        if (col != -1) {
                                            val data = cursor.getString(col)
                                            if (!data.isNullOrBlank()) return data
                                        }
                                    }
                                }
                            } catch (_: Exception) {}
                        }
                    }
                }

                // MediaProvider
                if (authority.equals("com.android.providers.media.documents", ignoreCase = true)) {
                    val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: return null
                    val split = docId.split(":")
                    if (split.size >= 2) {
                        val id = split[1]
                        val projection = arrayOf(MediaStore.MediaColumns.DATA)
                        ctx.contentResolver.query(
                            MediaStore.Files.getContentUri("external"),
                            projection,
                            "${MediaStore.MediaColumns._ID} = ?",
                            arrayOf(id),
                            null
                        )?.use { cursor ->
                            if (cursor.moveToFirst()) {
                                val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                if (col != -1) {
                                    val data = cursor.getString(col)
                                    if (!data.isNullOrBlank()) return data
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error resolving direct path from URI: $uri: ${e.message}")
            }
            return null
        }

        private fun openStreamWithFallbacks(ctx: Context, uri: Uri): Pair<InputStream, String?>? {
            val resolver = ctx.contentResolver

            var displayName: String? = null
            try {
                resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (idx != -1) displayName = cursor.getString(idx)
                    }
                }
            } catch (_: Exception) {}

            // 1. Direct openInputStream
            try {
                val stream = resolver.openInputStream(uri)
                if (stream != null) {
                    return Pair(stream, displayName)
                }
            } catch (e: Exception) {
                Log.w(TAG, "openInputStream failed on $uri: ${e.message}")
            }

            // 2. Direct openFileDescriptor
            try {
                val pfd = resolver.openFileDescriptor(uri, "r")
                if (pfd != null) {
                    return Pair(FileInputStream(pfd.fileDescriptor), displayName)
                }
            } catch (e: Exception) {
                Log.w(TAG, "openFileDescriptor failed on $uri: ${e.message}")
            }

            // 3. Fallbacks for Downloads msf: IDs or document IDs
            val authority = uri.authority ?: ""
            val uriStr = uri.toString()
            if (authority.contains("downloads", ignoreCase = true) || uriStr.contains("msf", ignoreCase = true)) {
                val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: ""
                val decodedDocId = try { URLDecoder.decode(docId, "UTF-8") } catch (_: Exception) { docId }
                val idStr = if (decodedDocId.contains(":")) decodedDocId.substringAfterLast(":") else decodedDocId
                val cleanId = idStr.removePrefix("msf:").removePrefix("msf%3A").trim().toLongOrNull()
                    ?: Regex("""(\d+)$""").find(uriStr)?.value?.toLongOrNull()

                if (cleanId != null) {
                    val candidateUris = mutableListOf<Uri>()
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Files.getContentUri("external"), cleanId))
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        candidateUris.add(ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cleanId))
                    }
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cleanId))
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cleanId))
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cleanId))
                    candidateUris.add(ContentUris.withAppendedId(Uri.parse("content://downloads/public_downloads"), cleanId))
                    candidateUris.add(ContentUris.withAppendedId(Uri.parse("content://downloads/my_downloads"), cleanId))
                    candidateUris.add(ContentUris.withAppendedId(Uri.parse("content://downloads/all_downloads"), cleanId))

                    for (candidate in candidateUris) {
                        try {
                            val stream = resolver.openInputStream(candidate)
                            if (stream != null) {
                                if (displayName == null) {
                                    try {
                                        resolver.query(candidate, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                                            if (c.moveToFirst()) {
                                                val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                                                if (idx != -1) displayName = c.getString(idx)
                                            }
                                        }
                                    } catch (_: Exception) {}
                                }
                                Log.d(TAG, "Opened stream via fallback candidate: $candidate")
                                return Pair(stream, displayName)
                            }
                        } catch (_: Exception) {}

                        try {
                            val pfd = resolver.openFileDescriptor(candidate, "r")
                            if (pfd != null) {
                                return Pair(FileInputStream(pfd.fileDescriptor), displayName)
                            }
                        } catch (_: Exception) {}
                    }
                }
            }

            // Direct public Downloads candidate by displayName if known
            if (displayName != null) {
                try {
                    val publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val candFile = File(publicDownloads, displayName)
                    if (candFile.exists() && candFile.canRead()) {
                        Log.d(TAG, "Opened stream directly from public Downloads: ${candFile.absolutePath}")
                        return Pair(FileInputStream(candFile), displayName)
                    }
                } catch (_: Exception) {}
            }

            // 4. Fallbacks for Media Documents (image:123, video:456, audio:789)
            if (authority.contains("media", ignoreCase = true)) {
                val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: ""
                val split = docId.split(":")
                if (split.size >= 2) {
                    val type = split[0]
                    val id = split[1].toLongOrNull()
                    if (id != null) {
                        val baseUri = when (type.lowercase()) {
                            "image" -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                            "video" -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                            "audio" -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                            else -> MediaStore.Files.getContentUri("external")
                        }
                        val candidate = ContentUris.withAppendedId(baseUri, id)
                        try {
                            val stream = resolver.openInputStream(candidate)
                            if (stream != null) return Pair(stream, displayName)
                        } catch (_: Exception) {}
                        try {
                            val pfd = resolver.openFileDescriptor(candidate, "r")
                            if (pfd != null) return Pair(FileInputStream(pfd.fileDescriptor), displayName)
                        } catch (_: Exception) {}
                    }
                }
            }

            return null
        }

        data class TransferNotificationState(
            val title: String,
            val content: String,
            val progress: Int,
            val max: Int,
            val isIndeterminate: Boolean,
            val updatedAt: Long
        )

        private val ongoingNotifications = java.util.concurrent.ConcurrentHashMap<Int, TransferNotificationState>()
        private val lastNotificationPostAt = java.util.concurrent.ConcurrentHashMap<Int, Long>()
        private const val NOTIFICATION_UPDATE_INTERVAL_MS = 750L

        @Volatile
        private var foregroundServiceStartRequested = false

        private fun startForegroundServiceSafely(ctx: Context) {
            try {
                if (!TransferForegroundService.isRunning && !foregroundServiceStartRequested) {
                    foregroundServiceStartRequested = true
                    val intent = Intent(ctx, TransferForegroundService::class.java).apply {
                        action = TransferForegroundService.ACTION_START
                    }
                    ContextCompat.startForegroundService(ctx, intent)
                }
            } catch (e: Exception) {
                foregroundServiceStartRequested = false
                Log.e(TAG, "Failed starting foreground service: ${e.message}", e)
            }
        }

        private fun stopForegroundServiceSafely(ctx: Context) {
            try {
                foregroundServiceStartRequested = false
                if (TransferForegroundService.isRunning) {
                    val intent = Intent(ctx, TransferForegroundService::class.java).apply {
                        action = TransferForegroundService.ACTION_STOP
                    }
                    ctx.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed stopping foreground service: ${e.message}", e)
            }
        }

        @JvmStatic
        fun getActiveTransferState(): TransferNotificationState? {
            return ongoingNotifications.values.maxByOrNull { it.updatedAt }
        }

        @JvmStatic
        fun onForegroundServiceStarted() {
            foregroundServiceStartRequested = false
        }

        @JvmStatic
        fun updateTransferNotification(
            notificationId: Int,
            title: String,
            content: String,
            progress: Int,
            max: Int,
            isOngoing: Boolean
        ) {
            val ctx = appContext ?: instance?.applicationContext ?: return
            try {
                if (isOngoing) {
                    val safeMax = max.coerceAtLeast(1)
                    val safeProgress = progress.coerceIn(0, safeMax)
                    ongoingNotifications[notificationId] = TransferNotificationState(
                        title,
                        content,
                        safeProgress,
                        safeMax,
                        max <= 0,
                        System.currentTimeMillis()
                    )
                    startForegroundServiceSafely(ctx)
                } else {
                    ongoingNotifications.remove(notificationId)
                    lastNotificationPostAt.remove(notificationId)
                    if (ongoingNotifications.isEmpty()) {
                        stopForegroundServiceSafely(ctx)
                    }
                }

                val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
                val now = System.currentTimeMillis()
                val lastPost = lastNotificationPostAt[notificationId] ?: 0L
                val shouldPost = !isOngoing || (max > 0 && progress >= max) || (now - lastPost >= NOTIFICATION_UPDATE_INTERVAL_MS)
                if (!shouldPost) return
                lastNotificationPostAt[notificationId] = now

                val openIntent = Intent(ctx, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val pendingIntent = PendingIntent.getActivity(
                    ctx,
                    0,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                if (isOngoing) {
                    val safeMax = max.coerceAtLeast(1)
                    val safeProgress = progress.coerceIn(0, safeMax)
                    val isIndet = max <= 0
                    val percent = if (isIndet) 0 else (safeProgress * 100 / safeMax)

                    val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_stat_transfer)
                        .setContentTitle(title)
                        .setContentText(content)
                        .setStyle(NotificationCompat.BigTextStyle().bigText(content))
                        .setSubText(if (isIndet) "Preparing" else "$percent%")
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                        .setOngoing(true)
                        .setOnlyAlertOnce(true)
                        .setContentIntent(pendingIntent)

                    if (isIndet) {
                        builder.setProgress(0, 0, true)
                    } else {
                        builder.setProgress(safeMax, safeProgress, false)
                    }

                    // Directly notify so download/upload progress bar is ALWAYS shown in notification shade
                    manager.notify(notificationId, builder.build())
                    updateForegroundProgress(ctx, manager)
                } else {
                    val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_stat_transfer)
                        .setContentTitle(title)
                        .setContentText(content)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setOnlyAlertOnce(true)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true)
                        .setOngoing(false)

                    manager.notify(notificationId, builder.build())
                    updateForegroundProgress(ctx, manager)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating transfer notification: ${e.message}", e)
            }
        }

        @JvmStatic
        fun cancelNotification(notificationId: Int) {
            val ctx = appContext ?: instance?.applicationContext ?: return
            try {
                ongoingNotifications.remove(notificationId)
                lastNotificationPostAt.remove(notificationId)
                if (ongoingNotifications.isEmpty()) {
                    stopForegroundServiceSafely(ctx)
                }
                val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.cancel(notificationId)
                if (manager != null) updateForegroundProgress(ctx, manager)
            } catch (e: Exception) {
                Log.e(TAG, "Error cancelling notification: ${e.message}", e)
            }
        }

        @JvmStatic
        fun requestAppPermissionsStatic() {
            instance?.requestAppPermissions()
        }

        /** Refresh the foreground-service notification after Android has
         * actually promoted the service.  Without this hand-off the service
         * can remain on its initial generic notification and never show the
         * transfer's progress bar. */
        @JvmStatic
        fun refreshForegroundNotification() {
            val ctx = appContext ?: instance?.applicationContext ?: return
            val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            updateForegroundProgress(ctx, manager)
        }

        private fun updateForegroundProgress(ctx: Context, manager: NotificationManager) {
            val current = ongoingNotifications.values.maxByOrNull { it.updatedAt } ?: return
            val openIntent = Intent(ctx, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                ctx,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val safeMax = current.max.coerceAtLeast(1)
            val safeProgress = current.progress.coerceIn(0, safeMax)
            val percent = if (current.isIndeterminate) 0 else (safeProgress * 100 / safeMax)

            val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_transfer)
                .setContentTitle(current.title)
                .setContentText(current.content)
                .setStyle(NotificationCompat.BigTextStyle().bigText(current.content))
                .setSubText(if (current.isIndeterminate) "Preparing" else "$percent%")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .setOnlyAlertOnce(true)
                .setOngoing(true)
                .setContentIntent(pendingIntent)

            if (current.isIndeterminate) {
                builder.setProgress(0, 0, true)
            } else {
                builder.setProgress(safeMax, safeProgress, false)
            }

            manager.notify(TransferForegroundService.SERVICE_NOTIF_ID, builder.build())
        }
    }

    private external fun registerAppInstance()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        instance = this
        appContext = applicationContext

        try {
            registerAppInstance()
        } catch (e: Throwable) {
            Log.e(TAG, "registerAppInstance native call notice: ${e.message}")
        }

        createNotificationChannel()
        requestAppPermissions()
    }

    override fun onResume() {
        super.onResume()
        instance = this
        appContext = applicationContext
        try {
            registerAppInstance()
        } catch (_: Throwable) {}
    }

    override fun onDestroy() {
        if (instance == this) {
            instance = null
        }
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)
            try {
                notificationManager?.deleteNotificationChannel("telecloud_transfers")
                notificationManager?.deleteNotificationChannel("telecloud_transfers_channel")
                notificationManager?.deleteNotificationChannel("telecloud_transfers_v3")
                notificationManager?.deleteNotificationChannel("telecloud_transfers_v4")
            } catch (_: Exception) {}

            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Shows live upload and download progress for TeleCloud Vault transfers"
                enableVibration(false)
                setSound(null, null)
                setShowBadge(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    fun requestAppPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        // 1. Notification Permission (Android 13+ / API 33)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // 2. Storage Permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_VIDEO)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_AUDIO)
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                }
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            Log.d(TAG, "Requesting runtime permissions: $permissionsToRequest")
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        }

        // 3. Battery Optimization Exemption for continuous background transfers without throttling
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
            if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Log.w(TAG, "Cannot launch ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS: ${e.message}")
                }
            }
        }
    }
}
