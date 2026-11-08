// File: MainActivity.kt
package com.telecloud.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.provider.Settings
import android.util.Log
import android.webkit.MimeTypeMap
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.URLDecoder

class MainActivity : TauriActivity() {

    companion object {
        const val CHANNEL_ID = "telecloud_transfers_v5"
        const val CHANNEL_NAME = "File Transfers"
        const val TAG = "TeleCloudApp"
        const val PERMISSION_REQUEST_CODE = 4201

        @Volatile
        @JvmStatic
        var instance: MainActivity? = null

        @Volatile
        private var appContext: Context? = null

        /** Human-readable reason the last resolveContentUriToCache() call failed (null = last call succeeded).
         *  Read from Rust via getLastResolveError() so the UI can show the real cause. */
        @Volatile
        private var lastResolveErrorMsg: String? = null

        /** Last exception seen while trying to open a stream (used to enrich the error message). */
        @Volatile
        private var lastOpenFailure: String? = null

        init {
            try {
                System.loadLibrary("telecloud_vault_lib")
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to load telecloud_vault_lib from MainActivity static init", e)
            }
        }

        @JvmStatic
        fun getLastResolveError(): String? = lastResolveErrorMsg

        @JvmStatic
        fun getDownloadsPath(): String {
            val ctx = instance
            // App-specific external files directory (Environment.DIRECTORY_DOWNLOADS)
            // Path: /storage/emulated/0/Android/data/com.telecloud.app/files/Download
            // Guaranteed 100% writable on ALL Android versions (including Android 11, 12, 13, 14, 15) without permission errors!
            if (ctx != null) {
                val appDownloads = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                if (appDownloads != null) {
                    if (!appDownloads.exists()) {
                        appDownloads.mkdirs()
                    }
                    Log.d(TAG, "Using app external Downloads directory: ${appDownloads.absolutePath}")
                    return appDownloads.absolutePath
                }
                val internalDownloads = File(ctx.filesDir, "Downloads")
                if (!internalDownloads.exists()) {
                    internalDownloads.mkdirs()
                }
                return internalDownloads.absolutePath
            }

            return "/data/data/com.telecloud.app/files/Downloads"
        }

        @JvmStatic
        fun openNativePlayer(url: String, title: String) {
            val ctx = instance ?: return
            try {
                val intent = Intent(ctx, NativePlayerActivity::class.java).apply {
                    putExtra("STREAM_URL", url)
                    putExtra("TITLE", title)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                ctx.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch NativePlayerActivity: ${e.message}", e)
            }
        }

        @JvmStatic
        fun openInExternalPlayer(url: String, mime: String, title: String) {
            val ctx = instance ?: return
            try {
                val uri = Uri.parse(url)
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, if (mime.isEmpty()) "video/*" else mime)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                val chooser = Intent.createChooser(intent, "Play with external video player")
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                ctx.startActivity(chooser)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open in external player: ${e.message}", e)
            }
        }

        @JvmStatic
        fun scanMediaFile(path: String) {
            val ctx = instance ?: return
            try {
                val file = File(path)
                if (!file.exists()) return

                // On Android 10+ (API 29+), publish copy to MediaStore Downloads collection if it is not already in public downloads
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    copyToPublicDownloads(ctx, file)
                }

                MediaScannerConnection.scanFile(ctx, arrayOf(path), null) { scannedPath, uri ->
                    Log.d(TAG, "Media scan complete for: $scannedPath -> $uri")
                }
            } catch (e: Exception) {
                Log.e(TAG, "scanMediaFile error: ${e.message}", e)
            }
        }

        private fun copyToPublicDownloads(ctx: Context, file: File) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
            try {
                val extension = file.extension.lowercase()
                val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "application/octet-stream"

                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, file.name)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }

                val resolver = ctx.contentResolver
                val collectionUri = MediaStore.Downloads.EXTERNAL_CONTENT_URI
                val itemUri = resolver.insert(collectionUri, values)

                if (itemUri != null) {
                    resolver.openOutputStream(itemUri)?.use { out ->
                        file.inputStream().use { input ->
                            input.copyTo(out, 1 shl 20)
                        }
                    }
                    values.clear()
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                    resolver.update(itemUri, values, null, null)
                    Log.d(TAG, "Successfully published to MediaStore.Downloads: ${file.name}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Could not mirror file to MediaStore.Downloads: ${e.message}")
            }
        }

        /** Size in bytes reported by the provider, or -1 if unknown. */
        private fun querySize(ctx: Context, uri: Uri): Long {
            return try {
                ctx.contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { c ->
                    if (c.moveToFirst() && !c.isNull(0)) c.getLong(0) else -1L
                } ?: -1L
            } catch (_: Exception) {
                -1L
            }
        }

        @JvmStatic
        fun resolveContentUriToCache(uriString: String): String? {
            lastResolveErrorMsg = null
            lastOpenFailure = null

            val ctx = instance ?: appContext
            if (ctx == null) {
                lastResolveErrorMsg = "App context not available (activity not registered yet)"
                Log.e(TAG, lastResolveErrorMsg!!)
                return null
            }

            return try {
                Log.d(TAG, "Resolving content URI: $uriString")
                val decodedUriString = try {
                    URLDecoder.decode(uriString, "UTF-8")
                } catch (_: Exception) {
                    uriString
                }

                val uri = Uri.parse(uriString)
                val decodedUri = Uri.parse(decodedUriString)

                // 1. Direct filesystem path resolution (fast path: zero-copy)
                val directPath = resolveDirectPath(ctx, uri) ?: resolveDirectPath(ctx, decodedUri)
                if (!directPath.isNullOrBlank()) {
                    val directFile = File(directPath)
                    if (directFile.exists() && directFile.canRead()) {
                        Log.d(TAG, "Resolved URI directly to readable file: $directPath (size: ${directFile.length()} bytes)")
                        return directPath
                    }
                }

                // 2. Multi-tier stream resolution
                val streamResult = openStreamWithFallbacks(ctx, uri)
                    ?: openStreamWithFallbacks(ctx, decodedUri)

                if (streamResult == null) {
                    lastResolveErrorMsg = "Android would not let TeleCloud open this file" +
                        (lastOpenFailure?.let { " ($it)" } ?: "")
                    Log.e(TAG, "All stream resolution fallbacks failed for URI: $uriString")
                    return null
                }

                val (inputStream, sourceFileName) = streamResult

                // One sub-folder per upload so the file keeps its real name
                // (Rust uses the file name as the vault record name).
                // The path still contains "vault_uploads", so Rust cleans it up after a successful upload.
                val uploadDir = File(ctx.cacheDir, "vault_uploads/${System.currentTimeMillis()}")
                uploadDir.mkdirs()

                val safeName = (sourceFileName ?: "upload_${System.currentTimeMillis()}")
                    .replace("[/\\\\:*?\"<>|]".toRegex(), "_")
                val outFile = File(uploadDir, safeName)

                try {
                    // Fail early with a clear message if there isn't enough room for the copy
                    val expected = querySize(ctx, uri).takeIf { it > 0 } ?: querySize(ctx, decodedUri)
                    val free = uploadDir.usableSpace
                    if (expected > 0 && free < expected + 64L * 1024 * 1024) {
                        lastResolveErrorMsg = "Not enough free storage to prepare this file: " +
                            "need ${expected / 1048576} MB, only ${free / 1048576} MB free"
                        Log.e(TAG, lastResolveErrorMsg!!)
                        try { inputStream.close() } catch (_: Exception) {}
                        uploadDir.deleteRecursively()
                        return null
                    }

                    inputStream.use { input ->
                        FileOutputStream(outFile).use { output ->
                            input.copyTo(output, 1 shl 20)
                        }
                    }
                } catch (t: Throwable) {
                    lastResolveErrorMsg = "Copy failed: ${t.javaClass.simpleName}: ${t.message}"
                    Log.e(TAG, "Copy to cache failed for $uriString", t)
                    // Don't leave half-written multi-GB files behind
                    uploadDir.deleteRecursively()
                    return null
                }

                Log.d(TAG, "Resolved content URI '$uriString' to cached file: ${outFile.absolutePath} (size: ${outFile.length()} bytes)")
                lastResolveErrorMsg = null
                outFile.absolutePath
            } catch (e: Exception) {
                lastResolveErrorMsg = "${e.javaClass.simpleName}: ${e.message}"
                Log.e(TAG, "Failed resolving content URI: $uriString", e)
                null
            }
        }

        private fun resolveDirectPath(ctx: Context, uri: Uri): String? {
            try {
                val authority = uri.authority ?: return null

                // ExternalStorageProvider (e.g. primary:Download/filename.ext)
                if (authority.equals("com.android.externalstorage.documents", ignoreCase = true)) {
                    val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: return null
                    val split = docId.split(":")
                    if (split.size >= 2) {
                        val type = split[0]
                        val relativePath = split[1]
                        if ("primary".equals(type, ignoreCase = true)) {
                            return "${Environment.getExternalStorageDirectory()}/$relativePath"
                        } else {
                            val extDirs = ctx.getExternalFilesDirs(null)
                            for (dir in extDirs) {
                                if (dir != null) {
                                    val path = dir.absolutePath
                                    val index = path.indexOf("/Android/data")
                                    if (index > 0) {
                                        val root = path.substring(0, index)
                                        val file = File(root, relativePath)
                                        if (file.exists() && file.canRead()) return file.absolutePath
                                    }
                                }
                            }
                        }
                    }
                }

                // DownloadsProvider (e.g. msf:1000014323 or raw:/storage/emulated/0/Download/...)
                if (authority.equals("com.android.providers.downloads.documents", ignoreCase = true)) {
                    val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: return null
                    if (docId.startsWith("raw:")) {
                        return docId.removePrefix("raw:")
                    }
                    if (docId.startsWith("/")) {
                        return docId
                    }

                    val decodedDocId = try { URLDecoder.decode(docId, "UTF-8") } catch (_: Exception) { docId }
                    val idStr = if (decodedDocId.contains(":")) decodedDocId.substringAfterLast(":") else decodedDocId
                    val rawId = idStr.removePrefix("msf:").removePrefix("msf%3A").trim().toLongOrNull()
                        ?: Regex("""(\d+)$""").find(docId)?.value?.toLongOrNull()
                    if (rawId != null) {
                        val projection = arrayOf(MediaStore.MediaColumns.DATA)

                        // 1. MediaStore.Files with direct ID URI
                        try {
                            val directFileUri = ContentUris.withAppendedId(MediaStore.Files.getContentUri("external"), rawId)
                            ctx.contentResolver.query(directFileUri, projection, null, null, null)?.use { cursor ->
                                if (cursor.moveToFirst()) {
                                    val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                    if (col != -1) {
                                        val data = cursor.getString(col)
                                        if (!data.isNullOrBlank()) return data
                                    }
                                }
                            }
                        } catch (_: Exception) {}

                        // 2. MediaStore.Files with _ID = ? selection
                        try {
                            ctx.contentResolver.query(
                                MediaStore.Files.getContentUri("external"),
                                projection,
                                "${MediaStore.MediaColumns._ID} = ?",
                                arrayOf(rawId.toString()),
                                null
                            )?.use { cursor ->
                                if (cursor.moveToFirst()) {
                                    val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                    if (col != -1) {
                                        val data = cursor.getString(col)
                                        if (!data.isNullOrBlank()) return data
                                    }
                                }
                            }
                        } catch (_: Exception) {}

                        // 3. MediaStore.Downloads (API 29+)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            try {
                                val downloadItemUri = ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, rawId)
                                ctx.contentResolver.query(downloadItemUri, projection, null, null, null)?.use { cursor ->
                                    if (cursor.moveToFirst()) {
                                        val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                        if (col != -1) {
                                            val data = cursor.getString(col)
                                            if (!data.isNullOrBlank()) return data
                                        }
                                    }
                                }
                            } catch (_: Exception) {}
                        }
                    }
                }

                // MediaProvider
                if (authority.equals("com.android.providers.media.documents", ignoreCase = true)) {
                    val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: return null
                    val split = docId.split(":")
                    if (split.size >= 2) {
                        val id = split[1]
                        val projection = arrayOf(MediaStore.MediaColumns.DATA)
                        ctx.contentResolver.query(
                            MediaStore.Files.getContentUri("external"),
                            projection,
                            "${MediaStore.MediaColumns._ID} = ?",
                            arrayOf(id),
                            null
                        )?.use { cursor ->
                            if (cursor.moveToFirst()) {
                                val col = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                if (col != -1) {
                                    val data = cursor.getString(col)
                                    if (!data.isNullOrBlank()) return data
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error resolving direct path from URI: $uri: ${e.message}")
            }
            return null
        }

        private fun openStreamWithFallbacks(ctx: Context, uri: Uri): Pair<InputStream, String?>? {
            val resolver = ctx.contentResolver

            var displayName: String? = null
            try {
                resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (idx != -1) displayName = cursor.getString(idx)
                    }
                }
            } catch (_: Exception) {}

            // 1. Direct openInputStream
            try {
                val stream = resolver.openInputStream(uri)
                if (stream != null) {
                    return Pair(stream, displayName)
                }
            } catch (e: Exception) {
                lastOpenFailure = "${e.javaClass.simpleName}: ${e.message}"
                Log.w(TAG, "openInputStream failed on $uri: ${e.message}")
            }

            // 2. Direct openFileDescriptor
            // AutoCloseInputStream owns the descriptor, so it can't be closed underneath us by GC.
            try {
                val pfd = resolver.openFileDescriptor(uri, "r")
                if (pfd != null) {
                    return Pair(ParcelFileDescriptor.AutoCloseInputStream(pfd), displayName)
                }
            } catch (e: Exception) {
                lastOpenFailure = "${e.javaClass.simpleName}: ${e.message}"
                Log.w(TAG, "openFileDescriptor failed on $uri: ${e.message}")
            }

            // 3. Fallbacks for Downloads msf: IDs or document IDs
            val authority = uri.authority ?: ""
            val uriStr = uri.toString()
            if (authority.contains("downloads", ignoreCase = true) || uriStr.contains("msf", ignoreCase = true)) {
                val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: ""
                val decodedDocId = try { URLDecoder.decode(docId, "UTF-8") } catch (_: Exception) { docId }
                val idStr = if (decodedDocId.contains(":")) decodedDocId.substringAfterLast(":") else decodedDocId
                val cleanId = idStr.removePrefix("msf:").removePrefix("msf%3A").trim().toLongOrNull()
                    ?: Regex("""(\d+)$""").find(uriStr)?.value?.toLongOrNull()

                if (cleanId != null) {
                    val candidateUris = mutableListOf<Uri>()
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Files.getContentUri("external"), cleanId))
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        candidateUris.add(ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cleanId))
                    }
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cleanId))
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cleanId))
                    candidateUris.add(ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cleanId))
                    candidateUris.add(ContentUris.withAppendedId(Uri.parse("content://downloads/public_downloads"), cleanId))
                    candidateUris.add(ContentUris.withAppendedId(Uri.parse("content://downloads/my_downloads"), cleanId))
                    candidateUris.add(ContentUris.withAppendedId(Uri.parse("content://downloads/all_downloads"), cleanId))

                    for (candidate in candidateUris) {
                        try {
                            val stream = resolver.openInputStream(candidate)
                            if (stream != null) {
                                if (displayName == null) {
                                    try {
                                        resolver.query(candidate, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                                            if (c.moveToFirst()) {
                                                val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                                                if (idx != -1) displayName = c.getString(idx)
                                            }
                                        }
                                    } catch (_: Exception) {}
                                }
                                Log.d(TAG, "Opened stream via fallback candidate: $candidate")
                                return Pair(stream, displayName)
                            }
                        } catch (_: Exception) {}

                        try {
                            val pfd = resolver.openFileDescriptor(candidate, "r")
                            if (pfd != null) {
                                return Pair(ParcelFileDescriptor.AutoCloseInputStream(pfd), displayName)
                            }
                        } catch (_: Exception) {}
                    }
                }
            }

            // Direct public Downloads candidate by displayName if known
            if (displayName != null) {
                try {
                    val publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val candFile = File(publicDownloads, displayName!!)
                    if (candFile.exists() && candFile.canRead()) {
                        Log.d(TAG, "Opened stream directly from public Downloads: ${candFile.absolutePath}")
                        return Pair(FileInputStream(candFile), displayName)
                    }
                } catch (_: Exception) {}
            }

            // 4. Fallbacks for Media Documents (image:123, video:456, audio:789)
            if (authority.contains("media", ignoreCase = true)) {
                val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment } ?: ""
                val split = docId.split(":")
                if (split.size >= 2) {
                    val type = split[0]
                    val id = split[1].toLongOrNull()
                    if (id != null) {
                        val baseUri = when (type.lowercase()) {
                            "image" -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                            "video" -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                            "audio" -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                            else -> MediaStore.Files.getContentUri("external")
                        }
                        val candidate = ContentUris.withAppendedId(baseUri, id)
                        try {
                            val stream = resolver.openInputStream(candidate)
                            if (stream != null) return Pair(stream, displayName)
                        } catch (_: Exception) {}
                        try {
                            val pfd = resolver.openFileDescriptor(candidate, "r")
                            if (pfd != null) return Pair(ParcelFileDescriptor.AutoCloseInputStream(pfd), displayName)
                        } catch (_: Exception) {}
                    }
                }
            }

            return null
        }

        data class TransferNotificationState(
            val title: String,
            val content: String,
            val progress: Int,
            val max: Int,
            val isIndeterminate: Boolean,
            val updatedAt: Long
        )

        private val ongoingNotifications = java.util.concurrent.ConcurrentHashMap<Int, TransferNotificationState>()
        private val lastNotificationPostAt = java.util.concurrent.ConcurrentHashMap<Int, Long>()
        private const val NOTIFICATION_UPDATE_INTERVAL_MS = 750L

        @Volatile
        private var foregroundServiceStartRequested = false

        private fun startForegroundServiceSafely(ctx: Context) {
            try {
                if (!TransferForegroundService.isRunning && !foregroundServiceStartRequested) {
                    foregroundServiceStartRequested = true
                    val intent = Intent(ctx, TransferForegroundService::class.java).apply {
                        action = TransferForegroundService.ACTION_START
                    }
                    ContextCompat.startForegroundService(ctx, intent)
                }
            } catch (e: Exception) {
                foregroundServiceStartRequested = false
                Log.e(TAG, "Failed starting foreground service: ${e.message}", e)
            }
        }

        private fun stopForegroundServiceSafely(ctx: Context) {
            try {
                foregroundServiceStartRequested = false
                if (TransferForegroundService.isRunning) {
                    val intent = Intent(ctx, TransferForegroundService::class.java).apply {
                        action = TransferForegroundService.ACTION_STOP
                    }
                    ctx.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed stopping foreground service: ${e.message}", e)
            }
        }

        @JvmStatic
        fun getActiveTransferState(): TransferNotificationState? {
            return ongoingNotifications.values.maxByOrNull { it.updatedAt }
        }

        @JvmStatic
        fun onForegroundServiceStarted() {
            foregroundServiceStartRequested = false
        }

        @JvmStatic
        fun updateTransferNotification(
            notificationId: Int,
            title: String,
            content: String,
            progress: Int,
            max: Int,
            isOngoing: Boolean
        ) {
            val ctx = appContext ?: instance?.applicationContext ?: return
            try {
                if (isOngoing) {
                    val safeMax = max.coerceAtLeast(1)
                    val safeProgress = progress.coerceIn(0, safeMax)
                    ongoingNotifications[notificationId] = TransferNotificationState(
                        title,
                        content,
                        safeProgress,
                        safeMax,
                        max <= 0,
                        System.currentTimeMillis()
                    )
                    startForegroundServiceSafely(ctx)
                } else {
                    ongoingNotifications.remove(notificationId)
                    lastNotificationPostAt.remove(notificationId)
                    if (ongoingNotifications.isEmpty()) {
                        stopForegroundServiceSafely(ctx)
                    }
                }

                val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
                val now = System.currentTimeMillis()
                val lastPost = lastNotificationPostAt[notificationId] ?: 0L
                val shouldPost = !isOngoing || (max > 0 && progress >= max) || (now - lastPost >= NOTIFICATION_UPDATE_INTERVAL_MS)
                if (!shouldPost) return
                lastNotificationPostAt[notificationId] = now

                val openIntent = Intent(ctx, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val pendingIntent = PendingIntent.getActivity(
                    ctx,
                    0,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                if (isOngoing) {
                    val safeMax = max.coerceAtLeast(1)
                    val safeProgress = progress.coerceIn(0, safeMax)
                    val isIndet = max <= 0
                    val percent = if (isIndet) 0 else (safeProgress * 100 / safeMax)

                    val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_stat_transfer)
                        .setContentTitle(title)
                        .setContentText(content)
                        .setStyle(NotificationCompat.BigTextStyle().bigText(content))
                        .setSubText(if (isIndet) "Preparing" else "$percent%")
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                        .setOngoing(true)
                        .setOnlyAlertOnce(true)
                        .setContentIntent(pendingIntent)

                    if (isIndet) {
                        builder.setProgress(0, 0, true)
                    } else {
                        builder.setProgress(safeMax, safeProgress, false)
                    }

                    // Directly notify so download/upload progress bar is ALWAYS shown in notification shade
                    manager.notify(notificationId, builder.build())
                    updateForegroundProgress(ctx, manager)
                } else {
                    val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_stat_transfer)
                        .setContentTitle(title)
                        .setContentText(content)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setOnlyAlertOnce(true)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true)
                        .setOngoing(false)

                    manager.notify(notificationId, builder.build())
                    updateForegroundProgress(ctx, manager)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating transfer notification: ${e.message}", e)
            }
        }

        @JvmStatic
        fun cancelNotification(notificationId: Int) {
            val ctx = appContext ?: instance?.applicationContext ?: return
            try {
                ongoingNotifications.remove(notificationId)
                lastNotificationPostAt.remove(notificationId)
                if (ongoingNotifications.isEmpty()) {
                    stopForegroundServiceSafely(ctx)
                }
                val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.cancel(notificationId)
                if (manager != null) updateForegroundProgress(ctx, manager)
            } catch (e: Exception) {
                Log.e(TAG, "Error cancelling notification: ${e.message}", e)
            }
        }

        @JvmStatic
        fun requestAppPermissionsStatic() {
            instance?.requestAppPermissions()
        }

        /** Refresh the foreground-service notification after Android has
         * actually promoted the service.  Without this hand-off the service
         * can remain on its initial generic notification and never show the
         * transfer's progress bar. */
        @JvmStatic
        fun refreshForegroundNotification() {
            val ctx = appContext ?: instance?.applicationContext ?: return
            val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            updateForegroundProgress(ctx, manager)
        }

        private fun updateForegroundProgress(ctx: Context, manager: NotificationManager) {
            val current = ongoingNotifications.values.maxByOrNull { it.updatedAt } ?: return
            val openIntent = Intent(ctx, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                ctx,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val safeMax = current.max.coerceAtLeast(1)
            val safeProgress = current.progress.coerceIn(0, safeMax)
            val percent = if (current.isIndeterminate) 0 else (safeProgress * 100 / safeMax)

            val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_transfer)
                .setContentTitle(current.title)
                .setContentText(current.content)
                .setStyle(NotificationCompat.BigTextStyle().bigText(current.content))
                .setSubText(if (current.isIndeterminate) "Preparing" else "$percent%")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .setOnlyAlertOnce(true)
                .setOngoing(true)
                .setContentIntent(pendingIntent)

            if (current.isIndeterminate) {
                builder.setProgress(0, 0, true)
            } else {
                builder.setProgress(safeMax, safeProgress, false)
            }

            manager.notify(TransferForegroundService.SERVICE_NOTIF_ID, builder.build())
        }
    }

    private external fun registerAppInstance()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        instance = this
        appContext = applicationContext

        try {
            registerAppInstance()
        } catch (e: Throwable) {
            Log.e(TAG, "registerAppInstance native call notice: ${e.message}")
        }

        createNotificationChannel()
        requestAppPermissions()
    }

    override fun onResume() {
        super.onResume()
        instance = this
        appContext = applicationContext
        try {
            registerAppInstance()
        } catch (_: Throwable) {}
    }

    override fun onDestroy() {
        if (instance == this) {
            instance = null
        }
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)
            try {
                notificationManager?.deleteNotificationChannel("telecloud_transfers")
                notificationManager?.deleteNotificationChannel("telecloud_transfers_channel")
                notificationManager?.deleteNotificationChannel("telecloud_transfers_v3")
                notificationManager?.deleteNotificationChannel("telecloud_transfers_v4")
            } catch (_: Exception) {}

            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Shows live upload and download progress for TeleCloud Vault transfers"
                enableVibration(false)
                setSound(null, null)
                setShowBadge(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    fun requestAppPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        // 1. Notification Permission (Android 13+ / API 33)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // 2. Storage Permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_VIDEO)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_AUDIO)
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                }
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            Log.d(TAG, "Requesting runtime permissions: $permissionsToRequest")
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        }

        // 3. Battery Optimization Exemption for continuous background transfers without throttling
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
            if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Log.w(TAG, "Cannot launch ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS: ${e.message}")
                }
            }
        }
    }
}
