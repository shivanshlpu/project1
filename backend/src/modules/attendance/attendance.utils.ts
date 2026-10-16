import { AttendanceSettings } from '../../database/database.types';

export function getIstMinutesFromMidnight(dateOrIso: Date | string): number {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return 0;

  
  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  return h * 60 + m;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

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
