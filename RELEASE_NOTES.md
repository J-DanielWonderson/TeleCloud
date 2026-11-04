# TeleCloud v1.0.0 — Official First Release

Welcome to the initial public release of **TeleCloud**! 🎉

TeleCloud transforms distributed Telegram MTProto channels into a secure, encrypted, and virtually limitless personal cloud drive. Engineered from the ground up on **Tauri 2.0** and **Rust**, TeleCloud delivers high-speed parallelized transfers, low memory consumption, and a seamless native experience across Windows and Android.

---

## 🌟 What is TeleCloud?

TeleCloud bridges the reliability of Telegram's worldwide data center infrastructure with the speed and flexibility of a modern desktop and mobile file manager. Files of arbitrary size are intelligently split into 512 MB encrypted streamable segments, dispatched across Telegram MTProto channels, indexed in an embedded SQLite Virtual File System (VFS), and cached locally for instantaneous offline access.

---

## 🚀 Key Features in v1.0.0

### 🗂️ Virtual File System (VFS) & Explorer
- **Hierarchical Directory Tree:** Organize your files with nested folders, drag-and-drop movement, and recursive folder downloads.
- **Fast Search & Sorting:** Instant search and multi-criteria sorting (by name, size, date modified, and file type).
- **Embedded SQLite Metadata Cache:** Fast directory loading and offline browsing backed by local SQLite persistence.
- **File Previews & Icons:** Automatic file type detection with high-resolution iconography.

### ⚡ 512 MB Multi-Threaded Chunking Engine
- **Large File Support:** Seamlessly split and upload files of any size into parallel 512 MB chunks.
- **SHA-256 Verification:** Every chunk is verified with cryptographic checksums upon download and reassembly.
- **Flood-Wait Mitigation:** Automatic backoff and rate-limit recovery ensures uninterrupted transfers without Telegram API bans.
- **Multi-Bot & Multi-Session Pools:** Parallelize uploads across worker pools for maximum bandwidth utilization.

### 📊 Real-Time Transfer Manager
- **Dedicated Transfer Drawer:** Live visibility into active uploads, active downloads, pending queues, and transfer history.
- **Performance Metrics:** Real-time transfer speed calculation (MB/s), elapsed time, and dynamic ETA estimation.
- **Transfer Controls:** Pause, resume, retry, or cancel ongoing transfers on the fly.

### 💬 In-App Feedback & Issue Reporting
- **Direct Developer Feedback:** Built-in modal to submit Bug Reports, Feature Requests, Performance Issues, or Questions directly from inside the app.
- **Serverless Cloudflare Relay:** Submissions are securely delivered to GitHub Issues via our Cloudflare Worker relay without exposing sensitive GitHub API tokens in client binaries.
- **Client Diagnostics:** Opt-in inclusion of platform, OS version, architecture, and display resolution to streamline troubleshooting.
- **Zero Configuration Required:** The official Cloudflare relay endpoint is pre-configured and active by default.

### 🛠️ Interactive Setup Wizard & Onboarding
- **Step-by-Step Onboarding:** Simple setup flow for Telegram API credentials (API ID, API Hash) and bot or user session tokens.
- **Storage Target Selector:** Configure dedicated channels or chats for storage with automated permissions verification.
- **Built-In User Guide:** Interactive documentation modal with tips on optimization, security, and best practices.

---

## 📦 Distribution Packages

| Platform | Format | Asset Name | Description |
| :--- | :--- | :--- | :--- |
| **Windows x64** | Installer | `TeleCloud-1.0.0-Setup.exe` | Frameless custom setup wizard; installs to `Program Files`, registers `HKLM` uninstall entries, adds Start Menu & Desktop shortcuts, includes `uninstall.exe`. |
| **Windows x64** | Portable | `TeleCloud.exe` | Standalone portable executable. No installation required. |
| **Android** | APK | `app-arm64-release.apk` | Native ARM64 Android package with adaptive launcher icons, compatible with Android 7.0+ (API 24 to 34+). |

---

## 🔧 System Requirements

- **Windows:** Windows 10 / Windows 11 (64-bit), WebView2 runtime (pre-installed on modern Windows).
- **Android:** Android 7.0 (Nougat, API Level 24) or higher (arm64-v8a architecture).
- **Telegram Account:** A standard Telegram account or bot token with an API ID & Hash from [my.telegram.org](https://my.telegram.org).
