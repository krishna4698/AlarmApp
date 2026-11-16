import { NativeModules, Platform } from 'react-native';

const { VolumeLockModule } = NativeModules;

export class VolumeLockService {
  /**
   * Locks the hardware volume buttons and forces STREAM_ALARM to 100% max volume.
   * Pressing volume up or volume down will NOT mute or lower the audio.
   */
  static lock(): void {
    if (Platform.OS === 'android') {
      try {
        VolumeLockModule?.lockVolume();
        console.log('[VolumeLockService] Hardware volume buttons LOCKED at 100% max.');
      } catch (e) {
        console.warn('[VolumeLockService] Failed to lock volume:', e);
      }
    }
  }

  /**
   * Unlocks the hardware volume buttons, restoring standard Android volume control.
   */
  static unlock(): void {
    if (Platform.OS === 'android') {
      try {
        VolumeLockModule?.unlockVolume();
        console.log('[VolumeLockService] Hardware volume buttons UNLOCKED.');
      } catch (e) {
        console.warn('[VolumeLockService] Failed to unlock volume:', e);
      }
    }
  }

  /**
   * Starts dedicated alarm MediaPlayer audio playback on USAGE_ALARM stream.
   * Loops continuously and CANNOT be muted by Android's volume rocker keys!
   */
  static startAlarmSound(): void {
    if (Platform.OS === 'android') {
      try {
        VolumeLockModule?.startAlarmSound();
        console.log('[VolumeLockService] Dedicated alarm MediaPlayer started.');
      } catch (e) {
        console.warn('[VolumeLockService] Failed to start alarm MediaPlayer:', e);
      }
    }
  }

  /**
   * Stops dedicated alarm MediaPlayer audio playback and restores volume controls.
   */
  static stopAlarmSound(): void {
    if (Platform.OS === 'android') {
      try {
        VolumeLockModule?.stopAlarmSound();
        console.log('[VolumeLockService] Dedicated alarm MediaPlayer stopped.');
      } catch (e) {
        console.warn('[VolumeLockService] Failed to stop alarm MediaPlayer:', e);
      }
    }
  }
}
