import { AttendanceSettings } from '../../database/database.types';

/**
 * Convert an ISO timestamp (or Date) to India Standard Time (IST, UTC+5:30) minutes from midnight.
 * e.g. 11:43:23 IST -> 11 * 60 + 43 = 703 minutes
 */
export function getIstMinutesFromMidnight(dateOrIso: Date | string): number {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return 0;

  // Format in Asia/Kolkata timezone: "HH:mm" (24-hour)
  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  return h * 60 + m;
}

/**
 * Convert time string "HH:mm" or "HH:mm:ss" to minutes from midnight.
 * e.g. "10:00" -> 600 minutes
 * "09:00" -> 540 minutes
 * "18:00" -> 1080 minutes
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Calculate late and early deviation minutes and status given check-in/out timestamps and settings.
 * All comparisons are accurately performed against India Standard Time (IST).
 */
export function computeAttendanceDeviations(
  checkInAt?: string | null,
  checkOutAt?: string | null,
  settings?: AttendanceSettings,
): {
  lateMinutes: number;
  isLate: boolean;
  earlyMinutes: number;
  isEarly: boolean;
} {
  const expectedInMinutes = parseTimeToMinutes(settings?.expected_punch_in_time || '10:00:00');
  const allowedInWindow = settings?.allowed_punch_in_window_minutes ?? 30;

  const expectedOutMinutes = parseTimeToMinutes(settings?.expected_punch_out_time || '18:00:00');
  const allowedOutWindow = settings?.allowed_punch_out_window_minutes ?? 30;

  let lateMinutes = 0;
  let isLate = false;

  if (checkInAt) {
    const checkInMins = getIstMinutesFromMidnight(checkInAt);
    const diff = checkInMins - expectedInMinutes;
    if (diff > 0) {
      lateMinutes = diff;
      if (diff > allowedInWindow) {
        isLate = true;
      }
    }
  }

  let earlyMinutes = 0;
  let isEarly = false;

  if (checkOutAt) {
    const checkOutMins = getIstMinutesFromMidnight(checkOutAt);
    // Early punch-out means checking out BEFORE expected punch out time
    const diff = expectedOutMinutes - checkOutMins;
    if (diff > 0) {
      earlyMinutes = diff;
      if (diff > allowedOutWindow) {
        isEarly = true;
      }
    }
  }

  return { lateMinutes, isLate, earlyMinutes, isEarly };
}
