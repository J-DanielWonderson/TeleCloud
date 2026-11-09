package com.telecloud.app

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView

@UnstableApi
class NativePlayerActivity : AppCompatActivity() {

    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private var errorLayout: LinearLayout? = null
    private var errorMessageView: TextView? = null

    private var streamUrl: String = ""
    private var videoTitle: String = ""
    private var bitrateBps: Long = 0L
    private var throughputRatio: Float = 1.0f

    companion object {
        const val TAG = "NativePlayerActivity"
        const val EXTRA_STREAM_URL = "STREAM_URL"
        const val EXTRA_TITLE = "TITLE"
        const val EXTRA_BITRATE_BPS = "BITRATE_BPS"
        const val EXTRA_THROUGHPUT_RATIO = "THROUGHPUT_RATIO"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on on all API levels while video player activity is active
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        streamUrl = intent.getStringExtra(EXTRA_STREAM_URL) ?: ""
        videoTitle = intent.getStringExtra(EXTRA_TITLE) ?: "Video Preview"
        bitrateBps = intent.getLongExtra(EXTRA_BITRATE_BPS, 0L)
        throughputRatio = intent.getFloatExtra(EXTRA_THROUGHPUT_RATIO, 1.0f)

        val root = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.BLACK)
        }

        playerView = PlayerView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            useController = true
            setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS)
            setBackgroundColor(Color.BLACK)
        }
        root.addView(playerView)

        // Error view overlay
        errorLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            visibility = View.GONE
            setBackgroundColor(Color.parseColor("#EE0B0F19"))
            setPadding(48, 48, 48, 48)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )

            val titleView = TextView(context).apply {
                text = "Native Playback Notice"
                textSize = 20f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 16)
            }
            addView(titleView)

            errorMessageView = TextView(context).apply {
                text = "ExoPlayer could not decode this media format with device hardware codecs."
                textSize = 14f
                setTextColor(Color.parseColor("#94A3B8"))
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 32)
            }
            addView(errorMessageView)

            val buttonsLayout = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )

                val extButton = Button(context).apply {
                    text = "Open in VLC / MX Player"
                    setBackgroundColor(Color.parseColor("#4F46E5"))
                    setTextColor(Color.WHITE)
                    setOnClickListener {
                        openInExternalPlayer()
                    }
                }
                addView(extButton)

                val closeButton = Button(context).apply {
                    text = "Close"
                    setBackgroundColor(Color.parseColor("#334155"))
                    setTextColor(Color.WHITE)
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        marginStart = 24
                    }
                    setOnClickListener {
                        finish()
                    }
                }
                addView(closeButton)
            }
            addView(buttonsLayout)
        }
        root.addView(errorLayout)

        setContentView(root)
        hideSystemUI()
        initializePlayer()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        streamUrl = intent.getStringExtra(EXTRA_STREAM_URL) ?: ""
        videoTitle = intent.getStringExtra(EXTRA_TITLE) ?: "Video Preview"
        bitrateBps = intent.getLongExtra(EXTRA_BITRATE_BPS, 0L)
        throughputRatio = intent.getFloatExtra(EXTRA_THROUGHPUT_RATIO, 1.0f)

        playerView?.player = null
        player?.release()
        player = null
        initializePlayer()
    }

    private fun initializePlayer() {
        if (streamUrl.isEmpty()) {
            showError("No video stream URL provided.")
            return
        }

        try {
            // Configure HTTP data source with 15s connect and 30s read timeouts
            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setConnectTimeoutMs(15_000)
                .setReadTimeoutMs(30_000)
                .setAllowCrossProtocolRedirects(true)

            // Dynamic buffer configuration based on bitrate and throughput ratio:
            // Buffer for playback: 3 to 8s, rebuffer: 8 to 15s, max buffer up to 120s
            // If throughput < bitrate (ratio < 1.0), pre-roll longer before starting playback
            val (startBufferMs, rebufferMs, minBufferMs) = if (throughputRatio < 1.0f) {
                val factor = (1.0f - throughputRatio).coerceIn(0.0f, 1.0f)
                val start = (5_000 + factor * 3_000).toInt() // 5,000ms to 8,000ms
                val rebuf = (10_000 + factor * 5_000).toInt() // 10,000ms to 15,000ms
                Triple(start, rebuf, 30_000)
            } else if (throughputRatio < 1.5f) {
                val factor = ((1.5f - throughputRatio) / 0.5f).coerceIn(0.0f, 1.0f)
                val start = (3_000 + factor * 2_000).toInt() // 3,000ms to 5,000ms
                val rebuf = (8_000 + factor * 2_000).toInt()  // 8,000ms to 10,000ms
                Triple(start, rebuf, 25_000)
            } else {
                Triple(3_000, 8_000, 20_000)
            }
            val maxBufferMs = 120_000

            val loadControl = DefaultLoadControl.Builder()
                .setBufferDurationsMs(minBufferMs, maxBufferMs, startBufferMs, rebufferMs)
                .setPrioritizeTimeOverSizeThresholds(true)
                .build()

            val mediaSourceFactory = DefaultMediaSourceFactory(httpDataSourceFactory)

            player = ExoPlayer.Builder(this)
                .setMediaSourceFactory(mediaSourceFactory)
                .setLoadControl(loadControl)
                .build()
                .apply {
                    playerView?.player = this
                    val mediaItem = MediaItem.fromUri(Uri.parse(streamUrl))
                    setMediaItem(mediaItem)
                    prepare()
                    playWhenReady = true

                    addListener(object : Player.Listener {
                        override fun onPlayerError(error: PlaybackException) {
                            Log.e(TAG, "ExoPlayer playback error: ${error.errorCodeName}", error)
                            showError("Playback error: ${error.localizedMessage ?: error.errorCodeName}. You can stream this file in an external player like VLC.")
                        }

                        override fun onPlaybackStateChanged(playbackState: Int) {
                            if (playbackState == Player.STATE_READY) {
                                errorLayout?.visibility = View.GONE
                            }
                        }
                    })
                }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize ExoPlayer: ${e.message}", e)
            showError("Player initialization failed: ${e.message}")
        }
    }

    private fun showError(message: String) {
        errorMessageView?.text = message
        errorLayout?.visibility = View.VISIBLE
    }

    private fun openInExternalPlayer() {
        try {
            val uri = Uri.parse(streamUrl)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "video/*")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(intent, "Play with external video player")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(chooser)
        } catch (e: Exception) {
            Log.e(TAG, "Cannot open external player: ${e.message}")
        }
    }

    private fun hideSystemUI() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }

    override fun onResume() {
        super.onResume()
        hideSystemUI()
        player?.play()
    }

    override fun onPause() {
        super.onPause()
        player?.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        playerView?.player = null
        player?.release()
        player = null
    }
}
