pub mod android_bridge;
pub mod commands;
pub mod db;
pub mod engine;
pub mod error;
pub mod telegram;
pub mod vault;

use std::path::PathBuf;
use std::sync::{Arc, OnceLock};
use tauri::{Emitter, Manager};

use db::cloud_sync::CloudSyncManager;
use db::schema::DbManager;
use engine::chunk_merger::ChunkMergerManager;
use engine::chunk_uploader::ChunkUploaderManager;
use engine::preview_stream::{self, PreviewStreamManager};
use telegram::bot_pool::BotPool;
use telegram::client::TelegramClientManager;
use vault::keystore::Keystore;

static APP_DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

#[cfg(not(target_os = "android"))]
fn get_desktop_log_dir() -> Option<PathBuf> {
    if let Some(dir) = APP_DATA_DIR.get() {
        return Some(dir.join("logs"));
    }
    dirs::data_dir().map(|d| d.join("com.telecloud.app").join("logs"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|panic_info| {
        let thread = std::thread::current();
        let thread_name = thread.name().unwrap_or("unnamed");
        let location = panic_info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".into());
        let msg = match panic_info.payload().downcast_ref::<&str>() {
            Some(s) => (*s).to_string(),
            None => match panic_info.payload().downcast_ref::<String>() {
                Some(s) => s.clone(),
                None => format!("{panic_info}"),
            },
        };
        let backtrace = std::backtrace::Backtrace::force_capture();

        let panic_summary = format!("*** RUST PANIC in thread '{thread_name}' at {location}: {msg} ***");
        eprintln!("{panic_summary}\nBacktrace:\n{backtrace}");

        // Keep the Android path
        crate::android_bridge::log_to_file(
            "RUST_PANIC",
            &format!("{panic_summary}\nBacktrace:\n{backtrace}"),
        );

        #[cfg(not(target_os = "android"))]
        {
            if let Some(log_dir) = get_desktop_log_dir() {
                if let Ok(()) = std::fs::create_dir_all(&log_dir) {
                    let log_file = log_dir.join("telecloud.log");
                    use std::io::Write;
                    if let Ok(mut file) = std::fs::OpenOptions::new()
                        .create(true)
                        .append(true)
                        .open(&log_file)
                    {
                        let ts = chrono::Utc::now().to_rfc3339();
                        let _ = writeln!(
                            file,
                            "[{ts}] [PANIC] [thread: {thread_name}] at {location}\nMessage: {msg}\nBacktrace:\n{backtrace}\n---"
                        );
                    }
                }
            }
        }
    }));

    crate::android_bridge::log_to_file("STARTUP", "TeleCloud Rust core starting up (v1.2.3)");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            crate::android_bridge::log_to_file("SETUP", "Tauri setup hook invoked");
            let app_handle = app.handle();
            if let Ok(dir) = app_handle.path().app_data_dir() {
                let _ = APP_DATA_DIR.set(dir);
            }

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
            crate::android_bridge::log_to_file("SETUP", "Initializing keystore & database");
            let keystore = Arc::new(Keystore::new(app_handle).unwrap_or_else(|e| {
                let msg = format!("Keystore initialization failed: {e}. Degrading gracefully.");
                eprintln!("[SETUP_ERROR] {msg}");
                crate::android_bridge::log_to_file("SETUP_ERROR", &msg);
                Keystore::fallback()
            }));

            let db = Arc::new(DbManager::new(app_handle).unwrap_or_else(|e| {
                let msg = format!("DbManager initialization failed: {e}. Degrading gracefully.");
                eprintln!("[SETUP_ERROR] {msg}");
                crate::android_bridge::log_to_file("SETUP_ERROR", &msg);
                DbManager::fallback()
            }));

            crate::android_bridge::log_to_file("SETUP", "Initializing Telegram manager & bot pool");
            let tg = Arc::new(TelegramClientManager::new(
                app_handle,
                Arc::clone(&keystore),
                Arc::clone(&db),
            ).unwrap_or_else(|e| {
                let msg = format!("TelegramClientManager initialization failed: {e}. Degrading gracefully.");
                eprintln!("[SETUP_ERROR] {msg}");
                crate::android_bridge::log_to_file("SETUP_ERROR", &msg);
                TelegramClientManager::fallback(Arc::clone(&keystore), Arc::clone(&db))
            }));

            let bot_pool = Arc::new(BotPool::new(
                app_handle,
                Arc::clone(&keystore),
                Arc::clone(&db),
                Arc::clone(&tg),
            ).unwrap_or_else(|e| {
                let msg = format!("BotPool initialization failed: {e}. Degrading gracefully.");
                eprintln!("[SETUP_ERROR] {msg}");
                crate::android_bridge::log_to_file("SETUP_ERROR", &msg);
                BotPool::fallback(Arc::clone(&keystore), Arc::clone(&db), Arc::clone(&tg))
            }));

            let cloud_sync = Arc::new(CloudSyncManager::new(
                app_handle,
                Arc::clone(&db),
                Arc::clone(&tg),
                Arc::clone(&keystore),
            ).unwrap_or_else(|e| {
                let msg = format!("CloudSyncManager initialization failed: {e}. Degrading gracefully.");
                eprintln!("[SETUP_ERROR] {msg}");
                crate::android_bridge::log_to_file("SETUP_ERROR", &msg);
                CloudSyncManager::fallback(Arc::clone(&db), Arc::clone(&tg), Arc::clone(&keystore))
            }));
            cloud_sync.set_bot_pool(Arc::clone(&bot_pool));

            crate::android_bridge::log_to_file("SETUP", "Initializing transfer engines & preview server");
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
            let preview_mgr = Arc::new(
                match tauri::async_runtime::block_on(PreviewStreamManager::new(
                    app_handle,
                    Arc::clone(&db),
                    Arc::clone(&bot_pool),
                    Arc::clone(&tg),
                )) {
                    Ok(pm) => pm,
                    Err(e) => {
                        let msg = format!("PreviewStreamManager initialization failed: {e}. Degrading gracefully.");
                        eprintln!("[SETUP_ERROR] {msg}");
                        crate::android_bridge::log_to_file("SETUP_ERROR", &msg);
                        PreviewStreamManager::fallback(
                            app_handle,
                            Arc::clone(&db),
                            Arc::clone(&bot_pool),
                            Arc::clone(&tg),
                        )
                    }
                }
            );

            let p_init = Arc::clone(&preview_mgr);
            tauri::async_runtime::spawn(async move {
                if let Err(e) = preview_stream::start_preview_server(p_init).await {
                    eprintln!("Failed to start preview stream server: {e}");
                }
            });

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

                // Wait 10 seconds before starting background poller so startup finishes cleanly
                tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;

                // Continuous real-time multi-device sync loop (15s on Android, 10s on desktop)
                let poll_interval = if cfg!(target_os = "android") {
                    tokio::time::Duration::from_secs(15)
                } else {
                    tokio::time::Duration::from_secs(10)
                };

                loop {
                    tokio::time::sleep(poll_interval).await;
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
            app.manage(preview_mgr);

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
            commands::copy_folder,
            commands::copy_file,
            commands::save_update_temp_file,
            commands::install_update_package,
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
            commands::request_android_permissions,
            commands::get_preview_stream_url,
            commands::get_preview_thumbnail_url,
            commands::get_file_thumbnail,
            commands::save_file_thumbnail,
            commands::get_file_preview_text,
            commands::probe_media,
            commands::prepare_preview,
            commands::cancel_preview,
            commands::clear_preview_cache,
            commands::open_native_player,
            commands::open_external_player,
            commands::get_debug_logs,
            commands::get_debug_log_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running TeleCloud Vault application");
}
