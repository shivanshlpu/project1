import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  CheckInDto,
  CheckOutDto,
  AttendanceFilterDto,
  UpdateAttendanceSettingsDto,
} from './dto/attendance.dto';
import { Attendance, AttendanceSettings } from '../../database/database.types';

function parseTimeToDate(dateStr: string, timeStr: string): Date {
  const [hours, minutes, seconds] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hours, minutes, seconds || 0, 0);
  return d;
}

@Injectable()
export class AttendanceService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    // Initial purge check on server startup
    this.purgeExpiredPhotos();

    // Routine purge every 15 minutes to guarantee 512MB quota protection
    setInterval(() => {
      this.purgeExpiredPhotos();
    }, 15 * 60 * 1000);
  }

  /**
   * 24-Hour Auto-Purge Service
   * Automatically clears compressed attendance photos older than 24 hours to prevent overloading
   * the database (512MB storage quota protection).
   * ALL other attendance records, check-in/out timestamps, GPS coordinates, and statuses remain PERMANENTLY INTACT.
   */
  purgeExpiredPhotos(): { purgedCount: number; message: string } {
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    let purgedCount = 0;

    for (const record of this.db.attendance) {
      if (record.check_in_photo) {
        const photoTime = record.photo_captured_at
          ? new Date(record.photo_captured_at).getTime()
          : record.check_in_at
          ? new Date(record.check_in_at).getTime()
          : record.created_at
          ? new Date(record.created_at).getTime()
          : 0;

        if (photoTime > 0 && now - photoTime >= TWENTY_FOUR_HOURS_MS) {
          record.check_in_photo = null;
          record.photo_purged = true;
          purgedCount++;
        }
      }
    }

    if (purgedCount > 0) {
      console.log(
        `[Storage Quota Protection] Purged ${purgedCount} attendance photo(s) older than 24h. Attendance & GPS data intact.`,
      );
    }

    return {
      purgedCount,
      message: `24-hour purge executed. ${purgedCount} expired photo(s) deleted from database. Attendance logs preserved.`,
    };
  }

  /**
   * Reset / Clear all attendance records completely
   */
  clearAllAttendance(): { clearedCount: number; message: string } {
    const count = this.db.attendance.length;
    this.db.attendance = [];
    this.db.persistToDisk();
    return {
      clearedCount: count,
      message: `All ${count} attendance records have been completely removed from the database.`,
    };
  }

  // === 1. SETTINGS (§22) ===
  async getSettings(): Promise<AttendanceSettings> {
    return this.db.attendanceSettings;
  }

  async updateSettings(dto: UpdateAttendanceSettingsDto): Promise<AttendanceSettings> {
    if (dto.expected_punch_in_time) {
      this.db.attendanceSettings.expected_punch_in_time = dto.expected_punch_in_time;
    }
    if (dto.allowed_punch_in_window_minutes !== undefined) {
      this.db.attendanceSettings.allowed_punch_in_window_minutes = dto.allowed_punch_in_window_minutes;
    }
    if (dto.expected_punch_out_time) {
      this.db.attendanceSettings.expected_punch_out_time = dto.expected_punch_out_time;
    }
    if (dto.allowed_punch_out_window_minutes !== undefined) {
      this.db.attendanceSettings.allowed_punch_out_window_minutes = dto.allowed_punch_out_window_minutes;
    }
    if (dto.reimbursement_rate_per_km !== undefined) {
      this.db.attendanceSettings.reimbursement_rate_per_km = dto.reimbursement_rate_per_km;
    }
    this.db.attendanceSettings.updated_at = new Date().toISOString();
    this.db.persistToDisk();
    return this.db.attendanceSettings;
  }

  // === 2. PUNCH-IN (§20, §21, §22, §24) ===
  async checkIn(userId: string, dto: CheckInDto) {
    this.purgeExpiredPhotos();

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.db.attendance.find(
      (a) => a.user_id === userId && a.date === todayStr,
    );

    if (existing) {
      const photoPayload = dto.check_in_photo || (dto.photo_key && dto.photo_key.startsWith('data:') ? dto.photo_key : undefined);
      if (photoPayload) {
        existing.check_in_photo = photoPayload;
        existing.photo_captured_at = new Date().toISOString();
        existing.photo_purged = false;
      }
      if (dto.photo_key) {
        existing.punch_in_photo_key = dto.photo_key;
      }
      if (dto.latitude && dto.longitude) {
        existing.check_in_lat = dto.latitude;
        existing.check_in_lng = dto.longitude;
        if (dto.location_name) {
          existing.check_in_location_name = dto.location_name;
        }
      }
      this.db.persistToDisk();
      return { message: 'Attendance already recorded for today (photo & location updated)', attendance: existing };
    }

    // Anti-Mock & Device Integrity validation (§4)
    if (dto.is_mocked) {
      throw new BadRequestException(
        'Mock / fake GPS location detected on device. Location verification rejected.',
      );
    }
    if (dto.developer_mode) {
      throw new BadRequestException(
        'Developer Mode is enabled on this device. Please disable it before using location-based attendance.',
      );
    }

    // Photo verification (§21)
    if (dto.photo_source === 'GALLERY') {
      throw new BadRequestException(
        'Live camera photograph required. Gallery photos are not permitted for attendance.',
      );
    }

    const accuracy = dto.gps_accuracy_m ?? 10;
    if (accuracy > 150) {
      throw new BadRequestException(
        `GPS accuracy insufficient (±${accuracy}m). Must be <= 150m for verification.`,
      );
    }

    const now = new Date();
    const settings = this.db.attendanceSettings;

    // Calculate Late Entry (§24)
    const expectedInDate = parseTimeToDate(todayStr, settings.expected_punch_in_time || '10:00:00');
    const lateDiffMs = now.getTime() - expectedInDate.getTime();
    let lateMinutes = 0;
    let isLate = false;

    if (lateDiffMs > 0) {
      lateMinutes = Math.round(lateDiffMs / 60000);
      // If beyond allowed window, mark as LATE
      if (lateMinutes > (settings.allowed_punch_in_window_minutes || 30)) {
        isLate = true;
      }
    }

    let hqName = '';
    if (dto.hq_id) {
      const hq = this.db.headquarters.find((h) => h.id === dto.hq_id);
      hqName = hq?.name || '';
    } else {
      const user = this.db.users.find((u) => u.id === userId);
      const hq = this.db.headquarters.find((h) => h.id === user?.area_id);
      hqName = hq?.name || 'Shahdol';
    }

    const record: Attendance = {
      id: `att-${uuidv4().substring(0, 8)}`,
      user_id: userId,
      date: todayStr,
      check_in_at: now.toISOString(),
      check_in_lat: dto.latitude,
      check_in_lng: dto.longitude,
      check_in_location_name: dto.location_name || `Lat: ${dto.latitude.toFixed(4)}, Lng: ${dto.longitude.toFixed(4)}`,
      check_in_photo: dto.check_in_photo || (dto.photo_key && dto.photo_key.startsWith('data:') ? dto.photo_key : null),
      photo_captured_at: now.toISOString(),
      photo_purged: false,
      distance_meters: accuracy,
      is_verified_location: true,
      status: isLate ? 'LATE' : 'PRESENT',
      late_minutes: lateMinutes,
      early_minutes: 0,
      working_hours: 0,
      punch_in_photo_key: dto.photo_key,
      punch_in_photo_source: dto.photo_source || 'CAMERA',
      device_integrity_status: 'VERIFIED',
      hq_id: dto.hq_id || 'hq-shahdol',
      hq_name: hqName,
      created_at: now.toISOString(),
    };

    this.db.attendance.push(record);
    this.db.persistToDisk();

    let lateMsg = '';
    if (lateMinutes > 0) {
      const hrs = Math.floor(lateMinutes / 60);
      const mins = lateMinutes % 60;
      lateMsg = hrs > 0 ? `Late Entry — ${hrs} hour ${mins} minutes` : `Late Entry — ${lateMinutes} minutes`;
    }

    return {
      message: isLate ? `Check-in recorded — ${lateMsg}` : 'Check-in recorded successfully on time',
      attendance: record,
      deviation_notice: lateMsg,
    };
  }

  // === 3. PUNCH-OUT (§23 & §24) ===
  async checkOut(userId: string, dto: CheckOutDto) {
    const todayStr = new Date().toISOString().split('T')[0];
    const record = this.db.attendance.find(
      (a) => a.user_id === userId && a.date === todayStr,
    );

    if (!record) {
      throw new BadRequestException('You must check in before checking out');
    }

    if (record.check_out_at) {
      throw new ConflictException('Already checked out for today');
    }

    // Anti-Mock & Device Integrity validation (§4)
    if (dto.is_mocked) {
      throw new BadRequestException(
        'Mock / fake GPS location detected on device. Checkout verification rejected.',
      );
    }
    if (dto.developer_mode) {
      throw new BadRequestException(
        'Developer Mode is enabled on this device. Please disable it before checking out.',
      );
    }

    const now = new Date();
    const settings = this.db.attendanceSettings;

    // Calculate Early Punch-Out (§24)
    const expectedOutDate = parseTimeToDate(todayStr, settings.expected_punch_out_time || '18:00:00');
    const earlyDiffMs = expectedOutDate.getTime() - now.getTime();
    let earlyMinutes = 0;

    if (earlyDiffMs > 0) {
      earlyMinutes = Math.round(earlyDiffMs / 60000);
    }

    // Calculate total working hours
    const inDate = new Date(record.check_in_at);
    const durationHours = parseFloat(((now.getTime() - inDate.getTime()) / 3600000).toFixed(2));

    record.check_out_at = now.toISOString();
    record.check_out_lat = dto.latitude;
    record.check_out_lng = dto.longitude;
    record.early_minutes = earlyMinutes;
    record.working_hours = durationHours;
    if (dto.photo_key) {
      record.punch_out_photo_key = dto.photo_key;
      record.punch_out_photo_source = dto.photo_source || 'CAMERA';
    }

    let earlyMsg = '';
    if (earlyMinutes > (settings.allowed_punch_out_window_minutes || 30)) {
      const hrs = Math.floor(earlyMinutes / 60);
      const mins = earlyMinutes % 60;
      earlyMsg = hrs > 0 ? `Early Punch Out — ${hrs} hour ${mins} minutes` : `Early Punch Out — ${earlyMinutes} minutes`;
    }

    this.db.persistToDisk();
    return {
      message: earlyMsg ? `Check-out recorded — ${earlyMsg}` : 'Check-out recorded successfully',
      attendance: record,
      deviation_notice: earlyMsg,
    };
  }

  // === 4. MR ATTENDANCE HISTORY (§25) ===
  async getMyAttendance(userId: string, month?: string) {
    this.purgeExpiredPhotos();
    const todayStr = new Date().toISOString().split('T')[0];

    return this.db.attendance
      .filter((a) => a.user_id === userId)
      .filter((a) => (month ? a.date.startsWith(month) : true))
      .map((a) => {
        // Missing Punch-out detection (§23)
        const isMissingPunchOut = !a.check_out_at && a.date < todayStr;
        return {
          ...a,
          is_missing_punchout: isMissingPunchOut,
          status: isMissingPunchOut ? 'INCOMPLETE' : a.status,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // === 5. ADMIN ATTENDANCE TABLE & FILTERS (§26) ===
  async getAdminAttendance(filter: AttendanceFilterDto) {
    this.purgeExpiredPhotos();
    const todayStr = new Date().toISOString().split('T')[0];

    const userIdFilter = filter.user_id || filter.mr_id;
    const startDateFilter = filter.startDate || filter.date_from;
    const endDateFilter = filter.endDate || filter.date_to;
    const isLateFilter = filter.is_late === 'true';
    const isEarlyFilter = filter.is_early === 'true';
    const isMissingPunchoutFilter = filter.missing_punchout === 'true' || filter.is_missing_punchout === 'true';
    const isSuspiciousFilter = filter.suspicious === 'true' || filter.is_suspicious === 'true';

    return this.db.attendance
      .filter((a) => (userIdFilter && userIdFilter !== 'ALL' ? a.user_id === userIdFilter : true))
      .filter((a) => (startDateFilter ? a.date >= startDateFilter : true))
      .filter((a) => (endDateFilter ? a.date <= endDateFilter : true))
      .filter((a) => (filter.hq_id && filter.hq_id !== 'ALL' ? a.hq_id === filter.hq_id : true))
      .filter((a) => {
        if (!filter.status || filter.status === 'ALL') return true;
        if (filter.status === 'ACTIVE' || filter.status === 'ON_FIELD') {
          return a.check_in_at && !a.check_out_at && a.date === todayStr;
        }
        if (filter.status === 'MISSING_PUNCH_OUT') {
          return a.check_in_at && !a.check_out_at && a.date < todayStr;
        }
        return a.status === filter.status;
      })
      .filter((a) => {
        if (isLateFilter) {
          return (a.late_minutes || 0) > (this.db.attendanceSettings.allowed_punch_in_window_minutes || 30);
        }
        return true;
      })
      .filter((a) => {
        if (isEarlyFilter) {
          return (a.early_minutes || 0) > (this.db.attendanceSettings.allowed_punch_out_window_minutes || 30);
        }
        return true;
      })
      .filter((a) => {
        if (isMissingPunchoutFilter) {
          return !a.check_out_at && a.date < todayStr;
        }
        return true;
      })
      .filter((a) => {
        if (isSuspiciousFilter) {
          return a.is_mocked || a.device_integrity_status !== 'VERIFIED';
        }
        return true;
      })
      .map((a) => {
        const user = this.db.users.find((u) => u.id === a.user_id);
        const isMissingPunchOut = !a.check_out_at && a.date < todayStr;
        const isActiveShift = !!(a.check_in_at && !a.check_out_at && a.date === todayStr);

        let workingHours = a.working_hours || 0;
        if (isActiveShift && a.check_in_at) {
          const diffMs = Date.now() - new Date(a.check_in_at).getTime();
          workingHours = parseFloat(Math.max(0, diffMs / 3600000).toFixed(2));
        }

        let resolvedName = user?.name || (a as any).user_name || 'Field Representative';

        const photoKey = a.punch_in_photo_key || (a as any).photo_key;
        let photoProof = a.check_in_photo;

        // Clean up any local device path (file:///...) that cannot be viewed on web
        if (photoProof && photoProof.startsWith('file://')) {
          photoProof = null;
        }

        // Keep active photo proof available if available
        if (!photoProof && !a.photo_purged && a.date === todayStr && a.check_in_at) {
          photoProof = photoKey || null;
        }

        return {
          ...a,
          user_name: resolvedName,
          user_phone: user?.phone || (a as any).user_phone || '',
          user_role: user?.role || (a as any).user_role || 'MR',
          check_in_photo: photoProof,
          photo_key: photoKey || photoProof,
          punch_in_photo_key: photoKey || photoProof,
          is_missing_punchout: isMissingPunchOut,
          is_active_shift: isActiveShift,
          working_hours: a.working_hours !== undefined && a.working_hours > 0 ? a.working_hours : workingHours,
          total_working_hours: a.working_hours !== undefined && a.working_hours > 0 ? a.working_hours : workingHours,
          status: isMissingPunchOut
            ? 'INCOMPLETE'
            : isActiveShift
            ? 'PRESENT'
            : a.status,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}
