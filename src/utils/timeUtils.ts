import { Alarm, Weekday } from '../types/alarm';

export const WEEKDAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Formats 24-hour hour and minute into 12-hour display and AM/PM
 */
export function formatTime12h(hour: number, minute: number): {
  timeString: string;
  period: 'AM' | 'PM';
  hour12: number;
  minuteString: string;
} {
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;

  const minuteString = minute < 10 ? `0${minute}` : `${minute}`;
  const formattedHour = hour12 < 10 ? `0${hour12}` : `${hour12}`;

  return {
    timeString: `${formattedHour}:${minuteString}`,
    period,
    hour12,
    minuteString,
  };
}

/**
 * Formats repeat days into a friendly string (e.g. "Every day", "Weekdays", "Mon, Wed")
 */
export function formatRepeatDays(repeatDays: Weekday[]): string {
  if (!repeatDays || repeatDays.length === 0) {
    return 'Ring once (no repeat)';
  }

  if (repeatDays.length === 7) {
    return 'Every day';
  }

  const sorted = [...repeatDays].sort((a, b) => a - b);

  // Check for Mon-Fri (1, 2, 3, 4, 5)
  if (
    sorted.length === 5 &&
    sorted[0] === 1 &&
    sorted[1] === 2 &&
    sorted[2] === 3 &&
    sorted[3] === 4 &&
    sorted[4] === 5
  ) {
    return 'Weekdays (Mon–Fri)';
  }

  // Check for Weekends (0, 6)
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) {
    return 'Weekends (Sat–Sun)';
  }

  return sorted.map((d) => WEEKDAY_SHORT_NAMES[d]).join(', ');
}

/**
 * Calculates the exact upcoming Date when this alarm will trigger next
 */
export function calculateNextTrigger(hour: number, minute: number, repeatDays: Weekday[]): Date {
  const now = new Date();
  const candidate = new Date();
  candidate.setHours(hour, minute, 0, 0);

  // If no repeat days specified: ring today if in future, else tomorrow
  if (!repeatDays || repeatDays.length === 0) {
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  // If repeat days are specified: find the closest future weekday in the list
  const currentDay = now.getDay() as Weekday;

  // Check if today is an active day and the time has not yet passed
  if (repeatDays.includes(currentDay) && candidate.getTime() > now.getTime()) {
    return candidate;
  }

  // Look ahead over the next 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const nextDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const dayOfWeek = nextDate.getDay() as Weekday;

    if (repeatDays.includes(dayOfWeek)) {
      nextDate.setHours(hour, minute, 0, 0);
      return nextDate;
    }
  }

  // Fallback to tomorrow
  candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

/**
 * Generates human readable countdown (e.g. "Alarm in 6 hours 25 minutes")
 */
export function getTimeUntilString(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Alarm ringing now';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) {
    return 'Alarm in less than a minute';
  }

  if (hours === 0) {
    return `Alarm in ${minutes}m`;
  }

  if (minutes === 0) {
    return `Alarm in ${hours}h`;
  }

  return `Alarm in ${hours}h ${minutes}m`;
}
