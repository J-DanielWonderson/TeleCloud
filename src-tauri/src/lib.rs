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
use engine::preview_stream::{self, PreviewStreamManager};
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
            let preview_mgr = Arc::new(
                tauri::async_runtime::block_on(PreviewStreamManager::new(
                    app_handle,
                    Arc::clone(&db),
                    Arc::clone(&bot_pool),
                    Arc::clone(&tg),
                ))?
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
            let preview_init = Arc::clone(&preview_mgr);
            let app_handle_bg = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = pool_init.initialize_from_db().await {
                    eprintln!("Bot pool initialization error: {e}");
                }

                // Background DC pre-warming for instant first video open
                preview_init.warm_up_active_bots().await;

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
            commands::open_external_player
        ])
        .run(tauri::generate_context!())
        .expect("error while running TeleCloud Vault application");
}
