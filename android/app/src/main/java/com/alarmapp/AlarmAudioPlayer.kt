package com.alarmapp

import android.content.Context
import android.database.ContentObserver
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Dedicated looping alarm audio engine running on USAGE_ALARM.
 * Pairs with a system ContentObserver to prevent muting or lowering volume
 * from the lock screen or background.
 */
object AlarmAudioPlayer {
    private var mediaPlayer: MediaPlayer? = null
    private var volumeObserver: ContentObserver? = null
    private var appContext: Context? = null
    private const val TAG = "AlarmAudioPlayer"

    private fun enforceMaxAlarmVolume(audioManager: AudioManager) {
        val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
        val currentVol = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
        if (currentVol < maxVol) {
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
        }
    }

    @Synchronized
    fun play(context: Context) {
        val targetContext = context.applicationContext ?: context
        appContext = targetContext

        val audioManager = targetContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        try {
            enforceMaxAlarmVolume(audioManager)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting max alarm volume", e)
        }

        registerVolumeLockObserver(targetContext, audioManager)

        if (mediaPlayer != null && isPlaying()) {
            Log.d(TAG, "Alarm MediaPlayer already playing")
            return
        }

        stopMediaPlayerOnly()

        try {
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                val afd = targetContext.resources.openRawResourceFd(R.raw.alarm_sound)
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                afd.close()
                isLooping = true
                prepare()
                start()
            }
            Log.d(TAG, "Dedicated alarm MediaPlayer started on USAGE_ALARM stream at MAX volume")
        } catch (e: Exception) {
            Log.e(TAG, "Error playing alarm audio via MediaPlayer", e)
        }
    }

    private fun registerVolumeLockObserver(context: Context, audioManager: AudioManager) {
        unregisterVolumeLockObserver(context)
        val handler = Handler(Looper.getMainLooper())
        volumeObserver = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean) {
                super.onChange(selfChange)
                try {
                    if (isPlaying()) {
                        enforceMaxAlarmVolume(audioManager)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error enforcing volume in observer", e)
                }
            }
        }
        try {
            context.contentResolver.registerContentObserver(
                android.provider.Settings.System.CONTENT_URI,
                true,
                volumeObserver!!
            )
            Log.d(TAG, "Volume lock observer registered")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register volume observer", e)
        }
    }

    private fun unregisterVolumeLockObserver(context: Context) {
        volumeObserver?.let {
            try {
                context.contentResolver.unregisterContentObserver(it)
                Log.d(TAG, "Volume lock observer unregistered")
            } catch (_: Exception) {}
        }
        volumeObserver = null
    }

    private fun stopMediaPlayerOnly() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.reset()
                it.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping alarm MediaPlayer", e)
        } finally {
            mediaPlayer = null
        }
    }

    @Synchronized
    fun stop() {
        stopMediaPlayerOnly()
        appContext?.let { unregisterVolumeLockObserver(it) }
        appContext = null
        Log.d(TAG, "Dedicated alarm MediaPlayer and Volume Observer completely stopped")
    }

    fun isPlaying(): Boolean {
        return try {
            mediaPlayer?.isPlaying ?: false
        } catch (e: Exception) {
            false
        }
    }
}
