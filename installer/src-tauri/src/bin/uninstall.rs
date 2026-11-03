#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

fn main() {
    let args: Vec<String> = env::args().collect();
    let is_silent = args.iter().any(|a| a.eq_ignore_ascii_case("/S") || a.eq_ignore_ascii_case("--silent") || a.eq_ignore_ascii_case("-s"));

    // Find our current executable's folder (expected to be C:\Program Files\TeleCloud)
    let current_exe = env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
    let install_dir = current_exe.parent().unwrap_or_else(|| Path::new("."));

    // 1. Terminate running TeleCloud instances
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "TeleCloud.exe"])
        .output();
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "telecloud-vault.exe"])
        .output();

    // 2. Remove Shortcuts
    let public_desktop = PathBuf::from(r"C:\Users\Public\Desktop\TeleCloud.lnk");
    if public_desktop.exists() {
        let _ = fs::remove_file(public_desktop);
    }

    if let Ok(user_profile) = env::var("USERPROFILE") {
        let user_desktop = PathBuf::from(user_profile).join("Desktop").join("TeleCloud.lnk");
        if user_desktop.exists() {
            let _ = fs::remove_file(user_desktop);
        }
    }

    let program_data_menu = PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\TeleCloud.lnk");
    if program_data_menu.exists() {
        let _ = fs::remove_file(program_data_menu);
    }

    if let Ok(app_data) = env::var("APPDATA") {
        let user_menu = PathBuf::from(app_data)
            .join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs")
            .join("TeleCloud.lnk");
        if user_menu.exists() {
            let _ = fs::remove_file(user_menu);
        }
    }

    // 3. Remove Registry Entries
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let _ = hklm.delete_subkey_all(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\TeleCloud");

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let _ = hkcu.delete_subkey_all(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\TeleCloud");

    // 4. Schedule self-deletion of directory via background cmd
    let install_dir_str = install_dir.to_string_lossy().to_string();
    if !install_dir_str.is_empty() && install_dir_str != "." && install_dir_str.to_lowercase().contains("telecloud") {
        let del_cmd = format!(
            "ping 127.0.0.1 -n 2 > nul & rmdir /s /q \"{}\"",
            install_dir_str
        );
        let _ = Command::new("cmd")
            .args(["/C", &del_cmd])
            .spawn();
    }

    if !is_silent {
        // Show clean completion alert
        let ps_script = "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.MessageBox]::Show('TeleCloud has been successfully uninstalled from this computer.', 'TeleCloud Uninstall', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information);";
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_script])
            .output();
    }
}
