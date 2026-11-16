import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
  AndroidFlags,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { Alarm } from '../types/alarm';
import { calculateNextTrigger } from '../utils/timeUtils';
import { AlarmStorageService } from './alarmStorage';
import { VolumeLockService } from './volumeLockService';

export const ALARM_CHANNEL_ID = 'pushup_alarm_channel_v2';

export class NativeAlarmService {
  private static isInitialized = false;

  /**
   * Initializes high-importance alarm notification channel and verifies Android permissions
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized || Platform.OS !== 'android') return;

    try {
      // 1. Request notification permissions (Android 13+)
      await notifee.requestPermission();

      // 2. Create the specialized High-Importance Alarm Notification Channel
      await notifee.createChannel({
        id: ALARM_CHANNEL_ID,
        name: 'Push-Up Alarms',
        description: 'Persistent alarm notifications that require push-ups to dismiss',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'alarm_sound', // Points to res/raw/alarm_sound.wav
        bypassDnd: true,
        vibration: true,
        vibrationPattern: [300, 400, 300, 400, 300, 400],
      });

      this.isInitialized = true;
      console.log('[NativeAlarmService] Channel initialized with sound: alarm_sound');
    } catch (error) {
      console.error('[NativeAlarmService] Initialization failed:', error);
    }
  }

  /**
   * Checks if exact alarm permissions are granted (Android 12+)
   */
  static async checkExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const settings = await notifee.getNotificationSettings();
      // On Android 12+, exact alarm permission might be disabled by user or OS
      if (settings.android.alarm === AndroidNotificationSetting.DISABLED) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Opens the system settings screen for exact alarm permission
   */
  static async openExactAlarmSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      await notifee.openAlarmPermissionSettings();
    }
  }

  /**
   * Schedules an exact native alarm using Android AlarmManager + ForegroundService
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
    const triggerTimestamp = nextTriggerDate.getTime();

    // Cancel any existing scheduled notification for this alarm before setting new one
    await this.cancelAlarm(alarm.id);

    try {
      await notifee.createTriggerNotification(
        {
          id: alarm.id,
          title: '🚨 PUSH-UP ALARM RINGING!',
          body: `Wake up! Complete ${alarm.pushUpTarget} push-ups to silence your alarm.`,
          data: {
            alarmId: alarm.id,
            pushUpTarget: String(alarm.pushUpTarget),
            label: alarm.label,
          },
          android: {
            channelId: ALARM_CHANNEL_ID,
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'alarm_sound',
            loopSound: true,
            flags: [AndroidFlags.FLAG_INSISTENT],
            ongoing: true, // Prevents swiping away notification
            autoCancel: false,
            asForegroundService: true, // Runs as a persistent foreground service
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
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTimestamp,
          alarmManager: {
            allowWhileIdle: true, // Wakes phone up even in deep Doze mode
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
   * Schedules an exact alarm 10 seconds in the future for verification
   */
  static async scheduleQuickTestAlarm(
    pushUpTarget: number = 20,
    label: string = 'Test Push-Up Alarm'
  ): Promise<Date> {
    await this.initialize();
    const triggerDate = new Date(Date.now() + 10 * 1000); // 10 seconds from now
    const testId = `test-alarm-${Date.now()}`;

    await notifee.createTriggerNotification(
      {
        id: testId,
        title: '🚨 PUSH-UP ALARM RINGING!',
        body: `Wake up! Complete ${pushUpTarget} push-ups to silence your alarm.`,
        data: {
          alarmId: testId,
          pushUpTarget: String(pushUpTarget),
          label,
        },
        android: {
          channelId: ALARM_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'alarm_sound',
          loopSound: true,
          flags: [AndroidFlags.FLAG_INSISTENT],
          ongoing: true,
          autoCancel: false,
          asForegroundService: true,
          lightUpScreen: true,
          fullScreenAction: {
            id: 'default',
          },
          pressAction: {
            id: 'default',
          },
        },
      },
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
   * Cancels a scheduled alarm
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
   * Silences the active ringing alarm and stops the Android foreground service
   */
  static async stopAlarm(alarmId: string): Promise<void> {
    try {
      // 1. Release hardware volume button lock & stop native MediaPlayer
      VolumeLockService.stopAlarmSound();
      VolumeLockService.unlock();

      // 2. Terminate foreground service to kill alarm audio
      await notifee.stopForegroundService();

      // 2. Clear the ringing notification
      await notifee.cancelNotification(alarmId);

      // 3. Mark last triggered timestamp and handle repeat logic
      const alarm = await AlarmStorageService.getAlarmById(alarmId);
      if (alarm) {
        if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
          // One-time alarm: turn off
          await AlarmStorageService.toggleAlarm(alarm.id, false);
        } else {
          // Recurring alarm: schedule next occurrence
          await this.scheduleAlarm(alarm);
        }
      }

      console.log(`[NativeAlarmService] Alarm ${alarmId} stopped successfully.`);
    } catch (error) {
      console.error(`[NativeAlarmService] Error stopping alarm ${alarmId}:`, error);
    }
  }

  /**
   * Reschedules all enabled alarms from storage (used on boot or app launch)
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
