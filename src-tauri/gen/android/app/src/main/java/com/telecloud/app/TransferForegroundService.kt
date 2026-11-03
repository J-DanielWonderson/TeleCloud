package com.telecloud.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class TransferForegroundService : Service() {

    companion object {
        const val SERVICE_NOTIF_ID = 99991
        const val ACTION_START = "ACTION_START_TRANSFER_SERVICE"
        const val ACTION_STOP = "ACTION_STOP_TRANSFER_SERVICE"
        const val TAG = "TeleCloudService"
        @Volatile
        var isRunning = false
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "TeleCloud::TransferWakeLock"
            )?.apply {
                setReferenceCounted(false)
                acquire() // Held only while at least one transfer keeps this service running.
            }

            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            wifiLock = wifiManager?.createWifiLock(
                WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                "TeleCloud::TransferWifiLock"
            )?.apply {
                setReferenceCounted(false)
                acquire()
            }
            Log.d(TAG, "TransferForegroundService created with WakeLock and WifiLock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring locks: ${e.message}", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopTransferService()
            return START_NOT_STICKY
        }

        isRunning = true
        MainActivity.onForegroundServiceStarted()
        startInForeground()
        return START_NOT_STICKY
    }

    private fun startInForeground() {
        try {
            val openIntent = Intent(this, MainActivity::class.java).apply {
                this.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val currentState = MainActivity.getActiveTransferState()
            val safeMax = currentState?.max?.coerceAtLeast(1) ?: 100
            val safeProgress = currentState?.progress?.coerceIn(0, safeMax) ?: 0
            val isIndeterminate = currentState?.isIndeterminate ?: (currentState == null)
            val percent = if (isIndeterminate) 0 else (safeProgress * 100 / safeMax)

            val builder = NotificationCompat.Builder(this, MainActivity.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_transfer)
                .setContentTitle(currentState?.title ?: "TeleCloud Vault")
                .setContentText(currentState?.content ?: "Transfers active in background")
                .setStyle(NotificationCompat.BigTextStyle().bigText(currentState?.content ?: "Transfers active in background"))
                .setSubText(if (isIndeterminate) "Preparing" else "$percent%")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(pendingIntent)

            if (isIndeterminate) {
                builder.setProgress(0, 0, true)
            } else {
                builder.setProgress(safeMax, safeProgress, false)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    SERVICE_NOTIF_ID,
                    builder.build(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(SERVICE_NOTIF_ID, builder.build())
            }

            // Sync with any progress updates that arrived during promotion
            MainActivity.refreshForegroundNotification()
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
        }
    }

    private fun stopTransferService() {
        isRunning = false
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wakeLock: ${e.message}")
        }
        try {
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wifiLock: ${e.message}")
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        isRunning = false
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}
        try {
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
        } catch (_: Exception) {}
        super.onDestroy()
    }
}
