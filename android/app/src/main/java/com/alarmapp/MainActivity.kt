package com.alarmapp

import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    companion object {
        @JvmStatic
        var isVolumeLocked: Boolean = false
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null) // Recommended by react-navigation to prevent state crashes on restore

        // Ensure the app can turn on the display and show directly over the lockscreen when an alarm rings
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
    }

    /**
     * Intercepts hardware keys before the Android system can mute or lower the audio
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (isVolumeLocked) {
            val keyCode = event.keyCode
            if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
                try {
                    val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                    audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
                } catch (_: Exception) {}
                return true // Consumes the event so Android OS does not mute
            }
        }
        return super.dispatchKeyEvent(event)
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "AlarmApp"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
