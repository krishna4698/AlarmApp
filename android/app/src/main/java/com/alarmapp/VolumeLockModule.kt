package com.alarmapp

import android.content.Context
import android.media.AudioManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VolumeLockModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VolumeLockModule"

    @ReactMethod
    fun lockVolume() {
        MainActivity.isVolumeLocked = true
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun unlockVolume() {
        MainActivity.isVolumeLocked = false
    }

    @ReactMethod
    fun startAlarmSound() {
        MainActivity.isVolumeLocked = true
        AlarmAudioPlayer.play(reactContext)
    }

    @ReactMethod
    fun stopAlarmSound() {
        MainActivity.isVolumeLocked = false
        AlarmAudioPlayer.stop()
    }
}
