import { NativeModules, Platform } from 'react-native';

const { VolumeLockModule } = NativeModules;

export class VolumeLockService {
  private static invokeNative(
    action: () => void,
    successLog: string,
    errorContext: string
  ): void {
    if (Platform.OS !== 'android') return;
    try {
      action();
      console.log(`[VolumeLockService] ${successLog}`);
    } catch (e) {
      console.warn(`[VolumeLockService] ${errorContext}:`, e);
    }
  }

  /**
   * Locks the hardware volume buttons and forces STREAM_ALARM to 100% max volume.
   * Pressing volume up or volume down will NOT mute or lower the audio.
   */
  static lock(): void {
    this.invokeNative(
      () => VolumeLockModule?.lockVolume(),
      'Hardware volume buttons LOCKED at 100% max.',
      'Failed to lock volume'
    );
  }

  /**
   * Unlocks the hardware volume buttons, restoring standard Android volume control.
   */
  static unlock(): void {
    this.invokeNative(
      () => VolumeLockModule?.unlockVolume(),
      'Hardware volume buttons UNLOCKED.',
      'Failed to unlock volume'
    );
  }

  /**
   * Starts dedicated alarm MediaPlayer audio playback on USAGE_ALARM stream.
   * Loops continuously and CANNOT be muted by Android's volume rocker keys.
   */
  static startAlarmSound(): void {
    this.invokeNative(
      () => VolumeLockModule?.startAlarmSound(),
      'Dedicated alarm MediaPlayer started.',
      'Failed to start alarm MediaPlayer'
    );
  }

  /**
   * Stops dedicated alarm MediaPlayer audio playback and restores volume controls.
   */
  static stopAlarmSound(): void {
    this.invokeNative(
      () => VolumeLockModule?.stopAlarmSound(),
      'Dedicated alarm MediaPlayer stopped.',
      'Failed to stop alarm MediaPlayer'
    );
  }
}
