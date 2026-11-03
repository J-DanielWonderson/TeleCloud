// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File};
use std::io::{self, Cursor};
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;
use winreg::enums::*;
use winreg::RegKey;

// Embedded payload containing release TeleCloud.exe, uninstall.exe, and branding assets
static PAYLOAD_ZIP: &[u8] = include_bytes!("../payload.zip");

#[cfg(windows)]
fn is_elevated() -> bool {
    use std::ptr;
    type HANDLE = *mut std::ffi::c_void;
    type BOOL = i32;
    type DWORD = u32;

    #[allow(non_snake_case)]
    #[repr(C)]
    struct TOKEN_ELEVATION {
        TokenIsElevated: DWORD,
    }

    extern "system" {
        fn GetCurrentProcess() -> HANDLE;
        fn OpenProcessToken(ProcessHandle: HANDLE, DesiredAccess: DWORD, TokenHandle: *mut HANDLE) -> BOOL;
        fn GetTokenInformation(
            TokenHandle: HANDLE,
            TokenInformationClass: u32,
            TokenInformation: *mut std::ffi::c_void,
            TokenInformationLength: DWORD,
            ReturnLength: *mut DWORD,
        ) -> BOOL;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    const TOKEN_QUERY: DWORD = 0x0008;
    const TOKEN_ELEVATION_CLASS: u32 = 20;

    unsafe {
        let mut token: HANDLE = ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as DWORD;

        let ok = GetTokenInformation(
            token,
            TOKEN_ELEVATION_CLASS,
            &mut elevation as *mut _ as *mut _,
            size,
            &mut size,
        );

        CloseHandle(token);

        ok != 0 && elevation.TokenIsElevated != 0
    }
}

#[cfg(windows)]
fn ensure_administrator() {
    if !is_elevated() {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use std::ptr;

        let current_exe = match std::env::current_exe() {
            Ok(p) => p,
            Err(_) => return,
        };

        let current_exe_wide: Vec<u16> = current_exe
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let verb_wide: Vec<u16> = OsStr::new("runas")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let args: Vec<String> = std::env::args().skip(1).collect();
        let args_str = args.join(" ");
        let args_wide: Vec<u16> = OsStr::new(&args_str)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        extern "system" {
            fn ShellExecuteW(
                hwnd: *mut std::ffi::c_void,
                lpOperation: *const u16,
                lpFile: *const u16,
                lpParameters: *const u16,
                lpDirectory: *const u16,
                nShowCmd: i32,
            ) -> isize;
        }

        unsafe {
            let _res = ShellExecuteW(
                ptr::null_mut(),
                verb_wide.as_ptr(),
                current_exe_wide.as_ptr(),
                args_wide.as_ptr(),
                ptr::null_mut(),
                1, // SW_SHOWNORMAL
            );
            // If user consented, elevated process started. If cancelled, _res <= 32. Either way exit this non-admin instance.
            std::process::exit(0);
        }
    }
}

#[tauri::command]
fn show_installer_window(window: tauri::WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
fn close_installer(app_handle: AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
fn minimize_installer(window: tauri::WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
fn get_default_target_dir() -> String {
    let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".to_string());
    format!(r"{}\TeleCloud", program_files)
}

#[tauri::command]
async fn select_folder_dialog(_app_handle: AppHandle, current_path: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let script = format!(
            r#"Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.SelectedPath = '{}'; $f.Description = 'Select TeleCloud Installation Directory'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ Write-Output $f.SelectedPath }}"#,
            current_path.replace("'", "''")
        );
        let output = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
            .output()
            .map_err(|e| e.to_string())?;

        let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if selected.is_empty() {
            Ok(None)
        } else if selected.to_lowercase().ends_with("program files") {
            Ok(Some(format!(r"{}\TeleCloud", selected)))
        } else {
            Ok(Some(selected))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

fn create_shortcut(target_exe: &str, lnk_path: &str, working_dir: &str, icon_path: Option<&str>) -> Result<(), String> {
    // Attempt with mslnk
    let mut success = false;
    if let Ok(mut sl) = mslnk::ShellLink::new(target_exe) {
        sl.set_working_dir(Some(working_dir.to_string()));
        if let Some(ic) = icon_path {
            sl.set_icon_location(Some(ic.to_string()));
        }
        if sl.create_lnk(lnk_path).is_ok() {
            success = true;
        }
    }

    if !success {
        // Fallback using Windows PowerShell WScript.Shell
        let icon_line = match icon_path {
            Some(ic) => format!("$s.IconLocation = '{}';", ic.replace("'", "''")),
            None => String::new(),
        };
        let script = format!(
            "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); $s.TargetPath = '{}'; $s.WorkingDirectory = '{}'; {} $s.Save();",
            lnk_path.replace("'", "''"),
            target_exe.replace("'", "''"),
            working_dir.replace("'", "''"),
            icon_line
        );
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
            .output();
    }

    Ok(())
}

#[tauri::command]
async fn perform_install(
    target_dir: String,
    create_desktop: bool,
    create_start_menu: bool,
) -> Result<(), String> {
    let target_path = PathBuf::from(&target_dir);

    // 1. Create target directory
    if !target_path.exists() {
        fs::create_dir_all(&target_path)
            .map_err(|e| format!("Failed to create installation directory: {e}"))?;
    }

    // 2. Extract payload archive
    let cursor = Cursor::new(PAYLOAD_ZIP);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to read installation payload: {e}"))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read archive entry #{i}: {e}"))?;

        let outpath = match file.enclosed_name() {
            Some(path) => target_path.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory {}: {e}", outpath.display()))?;
        } else {
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("Failed to create parent directory: {e}"))?;
                }
            }
            let mut outfile = File::create(&outpath)
                .map_err(|e| format!("Failed to write file {}: {e}", outpath.display()))?;
            io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract {}: {e}", outpath.display()))?;
        }
    }

    let target_exe = target_path.join("TeleCloud.exe");
    let icon_ico = target_path.join("icon.ico");
    let target_exe_str = target_exe.to_string_lossy().to_string();
    let working_dir_str = target_path.to_string_lossy().to_string();
    let icon_ico_str = if icon_ico.exists() {
        Some(icon_ico.to_string_lossy().to_string())
    } else {
        None
    };

    // 3. Create Desktop shortcut
    if create_desktop {
        let public_desktop = PathBuf::from(r"C:\Users\Public\Desktop\TeleCloud.lnk");
        let _ = create_shortcut(
            &target_exe_str,
            &public_desktop.to_string_lossy(),
            &working_dir_str,
            icon_ico_str.as_deref(),
        );

        // Also add to current user's desktop
        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            let user_desktop = PathBuf::from(user_profile).join("Desktop").join("TeleCloud.lnk");
            let _ = create_shortcut(
                &target_exe_str,
                &user_desktop.to_string_lossy(),
                &working_dir_str,
                icon_ico_str.as_deref(),
            );
        }
    }

    // 4. Create Start Menu shortcut
    if create_start_menu {
        let program_data = std::env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".to_string());
        let start_menu_dir = PathBuf::from(program_data).join(r"Microsoft\Windows\Start Menu\Programs");
        if !start_menu_dir.exists() {
            let _ = fs::create_dir_all(&start_menu_dir);
        }
        let start_shortcut = start_menu_dir.join("TeleCloud.lnk");
        let _ = create_shortcut(
            &target_exe_str,
            &start_shortcut.to_string_lossy(),
            &working_dir_str,
            icon_ico_str.as_deref(),
        );
    }

    // 5. Register in Windows Registry (HKLM Uninstall)
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let uninstall_key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\TeleCloud";
    if let Ok((key, _)) = hklm.create_subkey(uninstall_key_path) {
        let uninstall_exe = target_path.join("uninstall.exe");
        let uninstall_cmd = format!("\"{}\"", uninstall_exe.display());
        let quiet_uninstall_cmd = format!("\"{}\" /S", uninstall_exe.display());
        let display_icon = format!("\"{}\",0", target_exe.display());

        let _ = key.set_value("DisplayName", &"TeleCloud — Unlimited Cloud Storage");
        let _ = key.set_value("DisplayVersion", &"1.0.0");
        let _ = key.set_value("Publisher", &"TeleCloud");
        let _ = key.set_value("DisplayIcon", &display_icon);
        let _ = key.set_value("InstallLocation", &working_dir_str);
        let _ = key.set_value("UninstallString", &uninstall_cmd);
        let _ = key.set_value("QuietUninstallString", &quiet_uninstall_cmd);
        let _ = key.set_value("EstimatedSize", &11240u32);
        let _ = key.set_value("NoModify", &1u32);
        let _ = key.set_value("NoRepair", &1u32);
    }

    Ok(())
}

#[tauri::command]
fn launch_installed_app(target_dir: String) -> Result<(), String> {
    let target_exe = PathBuf::from(&target_dir).join("TeleCloud.exe");
    if target_exe.exists() {
        Command::new(&target_exe)
            .current_dir(target_dir)
            .spawn()
            .map_err(|e| format!("Failed to spawn TeleCloud: {e}"))?;
    }
    Ok(())
}

fn main() {
    #[cfg(windows)]
    ensure_administrator();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            show_installer_window,
            close_installer,
            minimize_installer,
            get_default_target_dir,
            select_folder_dialog,
            perform_install,
            launch_installed_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running TeleCloud Setup");
}
