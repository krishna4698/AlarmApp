import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
  AndroidFlags,
  Notification,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { Alarm } from '../types/alarm';
import { calculateNextTrigger } from '../utils/timeUtils';
import { AlarmStorageService } from './alarmStorage';
import { VolumeLockService } from './volumeLockService';

export const ALARM_CHANNEL_ID = 'pushup_alarm_channel_v4';

export class NativeAlarmService {
  private static isInitialized = false;

  /**
   * Builds the persistent, non-dismissible Android notification payload for an alarm.
   * Audio is omitted from the notification itself so the un-mutable MediaPlayer handles sound.
   */
  private static buildAlarmNotification(params: {
    id: string;
    pushUpTarget: number;
    label: string;
  }): Notification {
    const { id, pushUpTarget, label } = params;

    return {
      id,
      title: '🚨 PUSH-UP ALARM RINGING!',
      body: `Wake up! Complete ${pushUpTarget} push-ups to silence your alarm.`,
      data: {
        alarmId: id,
        pushUpTarget: String(pushUpTarget),
        label,
      },
      android: {
        channelId: ALARM_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        // Locked notification flags: CANNOT be swiped away or cleared
        flags: [AndroidFlags.FLAG_NO_CLEAR],
        ongoing: true,
        autoCancel: false,
        asForegroundService: true,
        lightUpScreen: true,
        fullScreenAction: {
          id: 'default', // Launches MainActivity over lock screen
        },
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: '⚡ START CHALLENGE',
            pressAction: { id: 'start_challenge' },
          },
        ],
      },
    };
  }

  /**
   * Initializes high-importance alarm notification channel and verifies Android permissions.
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized || Platform.OS !== 'android') return;

    try {
      await notifee.requestPermission();

      // Leave sound disabled on the notification channel so Android's system
      // RingtonePlayer does not play a muteable sound; AlarmAudioPlayer handles audio.
      await notifee.createChannel({
        id: ALARM_CHANNEL_ID,
        name: 'Push-Up Alarms',
        description: 'Persistent alarm notifications that require push-ups to dismiss',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        bypassDnd: true,
        vibration: true,
        vibrationPattern: [300, 400, 300, 400, 300, 400],
      });

      this.isInitialized = true;
      console.log('[NativeAlarmService] Channel initialized with USAGE_ALARM MediaPlayer engine');
    } catch (error) {
      console.error('[NativeAlarmService] Initialization failed:', error);
    }
  }

  /**
   * Checks if exact alarm permissions are granted (Android 12+).
   */
  static async checkExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.android.alarm !== AndroidNotificationSetting.DISABLED;
    } catch {
      return true;
    }
  }

  /**
   * Opens the system settings screen for exact alarm permission.
   */
  static async openExactAlarmSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      await notifee.openAlarmPermissionSettings();
    }
  }

  /**
   * Schedules an exact native alarm using Android AlarmManager + ForegroundService.
   */
  static async scheduleAlarm(alarm: Alarm): Promise<Date | null> {
    await this.initialize();

    if (!alarm.isEnabled) {
      await this.cancelAlarm(alarm.id);
      return null;
    }

    const nextTriggerDate = calculateNextTrigger(
      alarm.hour,
      alarm.minute,
      alarm.repeatDays
    );

    await this.cancelAlarm(alarm.id);

    try {
      await notifee.createTriggerNotification(
        this.buildAlarmNotification({
          id: alarm.id,
          pushUpTarget: alarm.pushUpTarget,
          label: alarm.label,
        }),
        {
          type: TriggerType.TIMESTAMP,
          timestamp: nextTriggerDate.getTime(),
          alarmManager: {
            allowWhileIdle: true,
          },
        }
      );

      console.log(
        `[NativeAlarmService] Scheduled alarm "${alarm.label}" (${alarm.id}) for ${nextTriggerDate.toLocaleString()}`
      );
      return nextTriggerDate;
    } catch (error) {
      console.error(`[NativeAlarmService] Failed to schedule alarm ${alarm.id}:`, error);
      return null;
    }
  }

  /**
   * Schedules an exact alarm 10 seconds in the future for verification.
   */
  static async scheduleQuickTestAlarm(
    pushUpTarget: number = 20,
    label: string = 'Test Push-Up Alarm'
  ): Promise<Date> {
    await this.initialize();
    const triggerDate = new Date(Date.now() + 10 * 1000);
    const testId = `test-alarm-${Date.now()}`;

    await notifee.createTriggerNotification(
      this.buildAlarmNotification({
        id: testId,
        pushUpTarget,
        label,
      }),
      {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerDate.getTime(),
        alarmManager: {
          allowWhileIdle: true,
        },
      }
    );

    console.log(`[NativeAlarmService] Quick test alarm scheduled for ${triggerDate.toLocaleTimeString()}`);
    return triggerDate;
  }

  /**
   * Cancels a scheduled alarm.
   */
  static async cancelAlarm(alarmId: string): Promise<void> {
    try {
      await notifee.cancelNotification(alarmId);
      await notifee.cancelTriggerNotification(alarmId);
      console.log(`[NativeAlarmService] Cancelled alarm: ${alarmId}`);
    } catch (error) {
      console.error(`[NativeAlarmService] Failed to cancel alarm ${alarmId}:`, error);
    }
  }

  /**
   * Silences the active ringing alarm and stops the Android foreground service.
   */
  static async stopAlarm(alarmId: string): Promise<void> {
    try {
      // 1. Release hardware volume button lock & stop native MediaPlayer
      VolumeLockService.stopAlarmSound();
      VolumeLockService.unlock();

      // 2. Terminate foreground service to kill persistent notification
      await notifee.stopForegroundService();

      // 3. Clear the ringing notification
      await notifee.cancelNotification(alarmId);

      // 4. Disable one-time alarms or reschedule recurring alarms
      const alarm = await AlarmStorageService.getAlarmById(alarmId);
      if (alarm) {
        if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
          await AlarmStorageService.toggleAlarm(alarm.id, false);
        } else {
          await this.scheduleAlarm(alarm);
        }
      }

      console.log(`[NativeAlarmService] Alarm ${alarmId} stopped successfully.`);
    } catch (error) {
      console.error(`[NativeAlarmService] Error stopping alarm ${alarmId}:`, error);
    }
  }

  /**
   * Reschedules all enabled alarms from storage (used on boot or app launch).
   */
  static async syncAllAlarms(): Promise<void> {
    await this.initialize();
    const alarms = await AlarmStorageService.getAlarms();

    for (const alarm of alarms) {
      if (alarm.isEnabled) {
        await this.scheduleAlarm(alarm);
      } else {
        await this.cancelAlarm(alarm.id);
      }
    }
    console.log(`[NativeAlarmService] Synced ${alarms.length} alarms with Android AlarmManager.`);
  }
}
