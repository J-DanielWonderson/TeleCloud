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
