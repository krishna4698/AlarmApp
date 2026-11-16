export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

export interface Alarm {
  id: string;
  hour: number;        // 0 - 23
  minute: number;      // 0 - 59
  label: string;
  isEnabled: boolean;
  repeatDays: Weekday[]; // e.g. [1, 2, 3, 4, 5] for Mon-Fri
  pushUpTarget: number; // e.g. 15, 20, 25
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt?: number | null;
}

export interface AlarmSession {
  alarmId: string;
  targetReps: number;
  completedReps: number;
  startTime: number;
  isCompleted: boolean;
}
