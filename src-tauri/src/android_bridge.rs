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

    /// Returns the human-readable reason the last `resolve_content_uri` call failed
    /// (set by MainActivity.resolveContentUriToCache), if any.
    pub fn last_resolve_error() -> Option<String> {
        let vm = get_jvm()?;
        let mut env = vm.attach_current_thread().ok()?;
        let class = get_main_activity_class(&mut env)?;

        let result = env.call_static_method(
            class,
            "getLastResolveError",
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
}

pub fn get_notif_id(file_id: &str) -> i32 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    std::hash::Hash::hash(file_id, &mut hasher);
    (std::hash::Hasher::finish(&hasher) & 0x7FFFFFFF) as i32
}

pub use bridge::*;

