#[cfg(target_os = "android")]
pub mod bridge {
    use jni::objects::{GlobalRef, JClass, JObject, JString, JValue};
    use jni::JavaVM;
    use std::sync::{OnceLock, RwLock};

    static JVM: OnceLock<JavaVM> = OnceLock::new();
    static MAIN_ACTIVITY_CLASS: RwLock<Option<GlobalRef>> = RwLock::new(None);

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

        let mut found_class = match env.find_class("com/telecloud/app/MainActivity") {
            Ok(c) => Some(c),
            Err(_) => {
                if env.exception_check().unwrap_or(false) {
                    let _ = env.exception_clear();
                }
                None
            }
        };

        if found_class.is_none() && !activity.is_null() {
            found_class = match env.get_object_class(&activity) {
                Ok(c) => Some(c),
                Err(_) => {
                    if env.exception_check().unwrap_or(false) {
                        let _ = env.exception_clear();
                    }
                    None
                }
            };
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
        let class = match env.find_class("com/telecloud/app/MainActivity") {
            Ok(c) => Some(c),
            Err(_) => {
                if env.exception_check().unwrap_or(false) {
                    let _ = env.exception_clear();
                }
                None
            }
        };
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
        env.with_local_frame(16, |env| {
            let class = match get_main_activity_class(env) {
                Some(c) => c,
                None => return Ok(None),
            };
            let j_uri = env.new_string(uri)?;

            let result = env.call_static_method(
                class,
                "resolveContentUriToCache",
                "(Ljava/lang/String;)Ljava/lang/String;",
                &[JValue::from(&j_uri)],
            );

            if env.exception_check().unwrap_or(false) {
                let _ = env.exception_describe();
                let _ = env.exception_clear();
                return Ok(None);
            }

            let j_obj = match result {
                Ok(val) => val.l()?,
                Err(e) => return Err(e),
            };

            if j_obj.is_null() {
                return Ok(None);
            }
            let j_str: JString = j_obj.into();
            let rust_str: String = env.get_string(&j_str)?.into();
            Ok(Some(rust_str))
        }).ok().flatten()
    }

    /// Returns the human-readable reason the last `resolve_content_uri` call failed
    /// (set by MainActivity.resolveContentUriToCache), if any.
    pub fn last_resolve_error() -> Option<String> {
        let vm = get_jvm()?;
        let mut env = vm.attach_current_thread().ok()?;
        env.with_local_frame(16, |env| {
            let class = match get_main_activity_class(env) {
                Some(c) => c,
                None => return Ok(None),
            };

            let result = env.call_static_method(
                class,
                "getLastResolveError",
                "()Ljava/lang/String;",
                &[],
            );

            if env.exception_check().unwrap_or(false) {
                let _ = env.exception_describe();
                let _ = env.exception_clear();
                return Ok(None);
            }

            let j_obj = match result {
                Ok(val) => val.l()?,
                Err(e) => return Err(e),
            };

            if j_obj.is_null() {
                return Ok(None);
            }
            let j_str: JString = j_obj.into();
            let rust_str: String = env.get_string(&j_str)?.into();
            Ok(Some(rust_str))
        }).ok().flatten()
    }

    pub fn get_downloads_dir() -> Option<String> {
        let vm = get_jvm()?;
        let mut env = vm.attach_current_thread().ok()?;
        env.with_local_frame(16, |env| {
            let class = match get_main_activity_class(env) {
                Some(c) => c,
                None => return Ok(None),
            };

            let result = env.call_static_method(
                class,
                "getDownloadsPath",
                "()Ljava/lang/String;",
                &[],
            );

            if env.exception_check().unwrap_or(false) {
                let _ = env.exception_describe();
                let _ = env.exception_clear();
                return Ok(None);
            }

            let j_obj = match result {
                Ok(val) => val.l()?,
                Err(e) => return Err(e),
            };

            if j_obj.is_null() {
                return Ok(None);
            }
            let j_str: JString = j_obj.into();
            let rust_str: String = env.get_string(&j_str)?.into();
            Ok(Some(rust_str))
        }).ok().flatten()
    }

    pub fn scan_media_file(path: &str) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
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
                    Ok::<(), jni::errors::Error>(())
                });
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
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
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
                    Ok::<(), jni::errors::Error>(())
                });
            }
        }
    }

    pub fn cancel_notification(notification_id: i32) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
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
                    Ok::<(), jni::errors::Error>(())
                });
            }
        }
    }

    pub fn request_app_permissions() {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
                        let _ = env.call_static_method(class, "requestAppPermissionsStatic", "()V", &[]);
                        if env.exception_check().unwrap_or(false) {
                            let _ = env.exception_clear();
                        }
                    }
                    Ok::<(), jni::errors::Error>(())
                });
            }
        }
    }

    pub fn open_native_player(url: &str, title: &str, bitrate_bps: i64, throughput_ratio: f32) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
                        if let (Ok(j_url), Ok(j_title)) = (env.new_string(url), env.new_string(title)) {
                            let _ = env.call_static_method(
                                class,
                                "openNativePlayer",
                                "(Ljava/lang/String;Ljava/lang/String;JF)V",
                                &[
                                    jni::objects::JValue::from(&j_url),
                                    jni::objects::JValue::from(&j_title),
                                    jni::objects::JValue::Long(bitrate_bps),
                                    jni::objects::JValue::Float(throughput_ratio),
                                ],
                            );
                            if env.exception_check().unwrap_or(false) {
                                let _ = env.exception_describe();
                                let _ = env.exception_clear();
                            }
                        }
                    }
                    Ok::<(), jni::errors::Error>(())
                });
            }
        }
    }

    pub fn open_in_external_player(url: &str, mime: &str, title: &str) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
                        if let (Ok(j_url), Ok(j_mime), Ok(j_title)) = (env.new_string(url), env.new_string(mime), env.new_string(title)) {
                            let _ = env.call_static_method(
                                class,
                                "openInExternalPlayer",
                                "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V",
                                &[jni::objects::JValue::from(&j_url), jni::objects::JValue::from(&j_mime), jni::objects::JValue::from(&j_title)],
                            );
                            if env.exception_check().unwrap_or(false) {
                                let _ = env.exception_describe();
                                let _ = env.exception_clear();
                            }
                        }
                    }
                    Ok::<(), jni::errors::Error>(())
                });
            }
        }
    }

    pub fn install_apk(file_path: &str) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
                        if let Ok(j_path) = env.new_string(file_path) {
                            let _ = env.call_static_method(
                                class,
                                "installApk",
                                "(Ljava/lang/String;)V",
                                &[jni::objects::JValue::from(&j_path)],
                            );
                            if env.exception_check().unwrap_or(false) {
                                let _ = env.exception_describe();
                                let _ = env.exception_clear();
                            }
                        }
                    }
                    Ok::<(), jni::errors::Error>(())
                });
            }
        }
    }

    pub fn log_to_file(tag: &str, message: &str) {
        if let Some(vm) = get_jvm() {
            if let Ok(mut env) = vm.attach_current_thread() {
                let _ = env.with_local_frame(16, |env| {
                    if let Some(class) = get_main_activity_class(env) {
                        if let (Ok(j_tag), Ok(j_msg)) = (env.new_string(tag), env.new_string(message)) {
                            let _ = env.call_static_method(
                                class,
                                "logToFile",
                                "(Ljava/lang/String;Ljava/lang/String;)V",
                                &[jni::objects::JValue::from(&j_tag), jni::objects::JValue::from(&j_msg)],
                            );
                            if env.exception_check().unwrap_or(false) {
                                let _ = env.exception_clear();
                            }
                        }
                    }
                    Ok::<(), jni::errors::Error>(())
                });
            }
        }
    }

    pub fn get_log_file_path() -> String {
        let default_path = "/storage/emulated/0/Android/data/com.telecloud.app/files/telecloud_debug.log".to_string();
        let vm = match get_jvm() {
            Some(v) => v,
            None => return default_path,
        };
        let mut env = match vm.attach_current_thread() {
            Ok(e) => e,
            Err(_) => return default_path,
        };
        let res: Result<String, jni::errors::Error> = env.with_local_frame(16, |env| {
            let class = match get_main_activity_class(env) {
                Some(c) => c,
                None => return Ok(default_path.clone()),
            };
            let res = env.call_static_method(class, "getLogFilePath", "()Ljava/lang/String;", &[])?;
            let obj = res.l()?;
            if obj.is_null() {
                return Ok(default_path.clone());
            }
            let j_str: jni::objects::JString = obj.into();
            let rust_str: String = env.get_string(&j_str)?.into();
            Ok(rust_str)
        });
        res.unwrap_or(default_path)
    }

    pub fn get_recent_logs() -> String {
        let default_msg = "Could not access Android log system".to_string();
        let vm = match get_jvm() {
            Some(v) => v,
            None => return default_msg,
        };
        let mut env = match vm.attach_current_thread() {
            Ok(e) => e,
            Err(_) => return default_msg,
        };
        let res: Result<String, jni::errors::Error> = env.with_local_frame(16, |env| {
            let class = match get_main_activity_class(env) {
                Some(c) => c,
                None => return Ok(default_msg.clone()),
            };
            let res = env.call_static_method(class, "getRecentLogs", "()Ljava/lang/String;", &[])?;
            let obj = res.l()?;
            if obj.is_null() {
                return Ok(default_msg.clone());
            }
            let j_str: jni::objects::JString = obj.into();
            let rust_str: String = env.get_string(&j_str)?.into();
            Ok(rust_str)
        });
        res.unwrap_or(default_msg)
    }
}

#[cfg(not(target_os = "android"))]
pub mod bridge {
    pub fn resolve_content_uri(_uri: &str) -> Option<String> {
        None
    }

    pub fn last_resolve_error() -> Option<String> {
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

    pub fn open_native_player(_url: &str, _title: &str, _bitrate_bps: i64, _throughput_ratio: f32) {}

    pub fn open_in_external_player(url: &str, _mime: &str, _title: &str) {
        #[cfg(target_os = "windows")]
        {
            let vlc_paths = [
                r"C:\Program Files\VideoLAN\VLC\vlc.exe",
                r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe",
            ];
            for vlc in &vlc_paths {
                if std::path::Path::new(vlc).exists() {
                    if std::process::Command::new(vlc).arg(url).spawn().is_ok() {
                        return;
                    }
                }
            }
            let _ = std::process::Command::new("cmd")
                .args(["/C", "start", "", url])
                .spawn();
        }
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("open").arg(url).spawn();
        }
        #[cfg(target_os = "linux")]
        {
            let _ = std::process::Command::new("xdg-open").arg(url).spawn();
        }
    }

    pub fn install_apk(_file_path: &str) {}

    pub fn log_to_file(tag: &str, message: &str) {
        eprintln!("[{tag}] {message}");
    }

    pub fn get_log_file_path() -> String {
        "stdout / stderr console".into()
    }

    pub fn get_recent_logs() -> String {
        "Desktop logging active via standard terminal output.".into()
    }
}

pub fn get_notif_id(file_id: &str) -> i32 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    std::hash::Hash::hash(file_id, &mut hasher);
    (std::hash::Hasher::finish(&hasher) & 0x7FFFFFFF) as i32
}

pub use bridge::*;

