import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm } from '../types/alarm';
import { calculateNextTrigger } from '../utils/timeUtils';

const ALARMS_STORAGE_KEY = '@pushup_alarms_v1';

const INITIAL_DEFAULT_ALARMS: Alarm[] = [
  {
    id: 'default-morning-alarm',
    hour: 6,
    minute: 30,
    label: 'Morning Push-Ups',
    isEnabled: true,
    repeatDays: [1, 2, 3, 4, 5], // Monday to Friday
    pushUpTarget: 20,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastTriggeredAt: null,
  },
];

export class AlarmStorageService {
  /**
   * Persists the full alarms array to AsyncStorage.
   */
  private static async persistAlarms(alarms: Alarm[]): Promise<void> {
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  }

  /**
   * Loads all stored alarms, seeding the default morning alarm on first launch.
   */
  static async getAlarms(): Promise<Alarm[]> {
    try {
      const data = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      if (!data) {
        await this.persistAlarms(INITIAL_DEFAULT_ALARMS);
        return INITIAL_DEFAULT_ALARMS;
      }
      const alarms: Alarm[] = JSON.parse(data);
      return Array.isArray(alarms) ? alarms : [];
    } catch (error) {
      console.error('[AlarmStorage] Error loading alarms:', error);
      return INITIAL_DEFAULT_ALARMS;
    }
  }

  /**
   * Retrieves a single alarm by ID.
   */
  static async getAlarmById(id: string): Promise<Alarm | null> {
    const alarms = await this.getAlarms();
    return alarms.find((a) => a.id === id) || null;
  }

  /**
   * Saves a new alarm or updates an existing alarm.
   */
  static async saveAlarm(
    alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Alarm> {
    const alarms = await this.getAlarms();
    const now = Date.now();

    if (alarm.id) {
      const index = alarms.findIndex((a) => a.id === alarm.id);
      if (index !== -1) {
        const updated: Alarm = {
          ...alarms[index],
          ...alarm,
          id: alarm.id,
          updatedAt: now,
        };
        alarms[index] = updated;
        await this.persistAlarms(alarms);
        return updated;
      }
    }

    const newAlarm: Alarm = {
      ...alarm,
      id: alarm.id || `alarm-${now}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: null,
    };

    alarms.push(newAlarm);
    await this.persistAlarms(alarms);
    return newAlarm;
  }

  /**
   * Deletes an alarm by ID.
   */
  static async deleteAlarm(id: string): Promise<void> {
    const alarms = await this.getAlarms();
    const filtered = alarms.filter((a) => a.id !== id);
    await this.persistAlarms(filtered);
  }

  /**
   * Toggles alarm enabled/disabled status.
   */
  static async toggleAlarm(id: string, isEnabled: boolean): Promise<Alarm | null> {
    const alarms = await this.getAlarms();
    const index = alarms.findIndex((a) => a.id === id);
    if (index === -1) return null;

    alarms[index] = {
      ...alarms[index],
      isEnabled,
      updatedAt: Date.now(),
    };

    await this.persistAlarms(alarms);
    return alarms[index];
  }

  /**
   * Calculates which enabled alarm will ring next.
   */
  static getNextUpcomingAlarm(alarms: Alarm[]): { alarm: Alarm; nextTriggerDate: Date } | null {
    const enabledAlarms = alarms.filter((a) => a.isEnabled);
    if (enabledAlarms.length === 0) return null;

    let closestAlarm: Alarm | null = null;
    let earliestTime = Infinity;
    let closestDate: Date | null = null;

    for (const alarm of enabledAlarms) {
      const nextDate = calculateNextTrigger(alarm.hour, alarm.minute, alarm.repeatDays);
      const timeMs = nextDate.getTime();
      if (timeMs < earliestTime) {
        earliestTime = timeMs;
        closestAlarm = alarm;
        closestDate = nextDate;
      }
    }

    if (closestAlarm && closestDate) {
      return {
        alarm: closestAlarm,
        nextTriggerDate: closestDate,
      };
    }

    return null;
  }
}
