# TeleCloud v1.2.3

TeleCloud **v1.2.3** delivers seamless in-app auto-updates, zero-conflict Android release signing, hardened credential persistence, and background transfer resiliency.

---

### 🚀 What's New in v1.2.3

- **Zero-Conflict Android Signing:** Fixed package signature conflicts on Android by embedding a persistent release keystore across all builds and CI pipelines, ensuring smooth seamless updates over previous versions.
- **In-App Self Updater:** Added automatic update detection from GitHub releases with direct in-app download and installation for Windows (`Setup.exe`) and Android (`.apk`).
- **Background Transfer Resiliency:** Integrated Android Foreground Service (`TransferForegroundService`) with ongoing status notifications and wake-lock guards for uninterruptible background file transfers.
- **Hardened Keystore & Safe Migration:** Enhanced AES-256 vault encryption with persistent entropy keys and automatic migration, ensuring accounts and session tokens survive app updates.
- **Non-Blocking UI Performance:** Migrated all SQLite database queries to background thread workers, eliminating UI hitching during intensive file indexing and media caching.
- **Enhanced Media Playback & Logs:** Added bitrate-aware streaming to the Android Media3 ExoPlayer, external player handoff (VLC / MX Player), and an in-app debug log viewer for instant diagnostics.

---

### 📦 Distribution Packages

| Platform | Format | Asset Name | Description |
| :--- | :--- | :--- | :--- |
| **Windows x64** | Installer | `TeleCloud-1.2.3-Setup.exe` | Animated custom installer wizard; installs to `Program Files` with uninstaller. |
| **Windows x64** | Portable | `TeleCloud.exe` | Standalone portable executable. |
| **Android** | APK | `TeleCloud-1.2.3-arm64.apk` | Native ARM64 package with Media3 ExoPlayer & auto-updater (Android 7.0+). |
