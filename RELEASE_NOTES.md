# TeleCloud v1.1.3 — High-Performance Video Streaming & Native Android Player

We are excited to release **TeleCloud v1.1.3**! 🚀

This release brings a complete overhaul of the in-app media preview and streaming engine, native Android hardware-accelerated playback via AndroidX Media3 (ExoPlayer), enhanced document thumbnailing, and critical stability fixes across Windows and Android.

---

## 🌟 What's New in v1.1.3

### ⚡ Overhauled High-Performance Video Streaming Engine
- **Instant Byte-Range Streaming:** Rewrote the loopback streaming engine in Rust to send immediate HTTP/1.1 `206 Partial Content` headers and stream 512 KiB blocks directly to the TCP socket as they arrive, eliminating Time-To-First-Byte (TTFB) latency.
- **Persistent HTTP/1.1 Loop:** Reusable connection pipeline with full keep-alive support, reducing socket teardown and handshake overhead.
- **Sticky Stream Bot Dispatch:** Preview sessions now bind to a sticky MTProto worker bot to maximize DC connection reuse, avoiding cold connection multiplication.
- **Automatic Cache Invalidation & Failover:** Invalidates cached Telegram file references on RPC expiration errors (`FILE_REFERENCE_EXPIRED`, `ACCESS_HASH_INVALID`) and automatically fails over across alternative workers with exponential backoff and jitter.
- **Tail & Header Pre-warming (`prepare_preview`):** Tapping or selecting any video immediately warms DC connections and parallel-fetches Block 0 and tail blocks so playback begins near-instantly, even for non-faststart MP4s with the `moov` atom at the end of the file.
- **Straddle-Safe Persistent Block Cache:** 512 KiB block alignment that safely handles chunk boundaries, paired with a persistent `.map` bitset cache for instant resume after app restarts and LRU disk bounds.

### 🎬 Android Native Media3 (ExoPlayer) Integration
- **Full-Screen Immersive Native Player:** Embedded `NativePlayerActivity` powered by AndroidX Media3 ExoPlayer 1.5.1, providing native hardware decoding for HEVC/H.265, 10-bit HDR, and audio codecs that the system WebView cannot play directly.
- **External Player & Download Fallback:** One-tap action to stream directly into VLC, MX Player, or download when desired.

### 🔍 In-Stream Media Probe & Diagnostics
- **Header & Box Inspection:** Built-in ISO-BMFF box parser (`ftyp`, `moov`, `mdat`) and EBML parser (MKV/WebM) to inspect codecs (`avc1`, `hvc1`, `hev1`, `dvh1`, `av01`, `mp4a`, `ac-3`, `ec-3`, `opus`), duration, and dimensions.
- **Collapsible Technical Details Panel:** In-depth diagnostics in the preview modal displaying container type, codec signatures, WebView playability evaluation, and player error codes.
- **4-Stage Pipeline Indicator:** Visual progress indicator showing live status: *Resolving $\to$ Connecting $\to$ Indexing $\to$ Playing*.
- **10-Second Stall Watchdog:** Automatically prompts fallback to the native ExoPlayer if the system WebView stalls during buffering.

### 📄 Document & Thumbnail Preview Enhancements
- **Multi-Format Previews:** Integrated in-app viewer for PDF documents (`pdfjs-dist`) and DOCX files (`mammoth`).
- **Asynchronous Thumbnail Pipeline:** Background thumbnail generation and caching for image, video, and document files.

### 🛡️ Critical Stability & Bug Fixes
- **Fixed Process Crash After Launch:** Resolved an issue where the application terminated 8–9 seconds after launch on Windows and Android caused by Tokio runtime thread blocking on cancellation rwlocks.
- **Eliminated Panics:** Hardened bot worker selection, peer resolution, and background prefetch loops against unwrap panics.

---

## 📦 Distribution Packages

| Platform | Format | Asset Name | Description |
| :--- | :--- | :--- | :--- |
| **Windows x64** | Installer | `TeleCloud-1.1.3-Setup.exe` | Frameless custom setup wizard; installs to `Program Files`, registers `HKLM` uninstall entries, adds Start Menu & Desktop shortcuts, includes `uninstall.exe`. |
| **Windows x64** | Portable | `TeleCloud.exe` | Standalone portable executable. No installation required. |
| **Android** | APK | `TeleCloud-1.1.3-arm64.apk` | Native ARM64 Android package with AndroidX Media3 ExoPlayer support and adaptive launcher icons (Android 7.0+ / API 24 to 36). |

---

## 🔧 System Requirements

- **Windows:** Windows 10 / Windows 11 (64-bit), WebView2 runtime (pre-installed on modern Windows).
- **Android:** Android 7.0 (Nougat, API Level 24) or higher (arm64-v8a architecture).
- **Telegram Account:** A standard Telegram account or bot token with an API ID & Hash from [my.telegram.org](https://my.telegram.org).
