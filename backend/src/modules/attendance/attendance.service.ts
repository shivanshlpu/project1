import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
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
export class AttendanceService {
  constructor(private readonly db: DatabaseService) {}

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
    this.db.attendanceSettings.updated_at = new Date().toISOString();
    return this.db.attendanceSettings;
  }

  // === 2. PUNCH-IN (§20, §21, §22, §24) ===
  async checkIn(userId: string, dto: CheckInDto) {
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.db.attendance.find(
      (a) => a.user_id === userId && a.date === todayStr,
    );

    if (existing) {
      return { message: 'Attendance already recorded for today', attendance: existing };
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

    return {
      message: earlyMsg ? `Check-out recorded — ${earlyMsg}` : 'Check-out recorded successfully',
      attendance: record,
      deviation_notice: earlyMsg,
    };
  }

  // === 4. MR ATTENDANCE HISTORY (§25) ===
  async getMyAttendance(userId: string, month?: string) {
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
    const todayStr = new Date().toISOString().split('T')[0];

    return this.db.attendance
      .filter((a) => (filter.user_id ? a.user_id === filter.user_id : true))
      .filter((a) => (filter.startDate ? a.date >= filter.startDate : true))
      .filter((a) => (filter.endDate ? a.date <= filter.endDate : true))
      .filter((a) => (filter.hq_id ? a.hq_id === filter.hq_id : true))
      .filter((a) => (filter.status ? a.status === filter.status : true))
      .filter((a) => {
        if (filter.is_late === 'true') {
          return (a.late_minutes || 0) > (this.db.attendanceSettings.allowed_punch_in_window_minutes || 30);
        }
        return true;
      })
      .filter((a) => {
        if (filter.is_early === 'true') {
          return (a.early_minutes || 0) > (this.db.attendanceSettings.allowed_punch_out_window_minutes || 30);
        }
        return true;
      })
      .filter((a) => {
        if (filter.missing_punchout === 'true') {
          return !a.check_out_at && a.date < todayStr;
        }
        return true;
      })
      .filter((a) => {
        if (filter.suspicious === 'true') {
          return a.device_integrity_status !== 'VERIFIED';
        }
        return true;
      })
      .map((a) => {
        const user = this.db.users.find((u) => u.id === a.user_id);
        const isMissingPunchOut = !a.check_out_at && a.date < todayStr;

        return {
          ...a,
          user_name: user?.name || 'Unknown',
          user_phone: user?.phone || '',
          user_role: user?.role || 'MR',
          is_missing_punchout: isMissingPunchOut,
          status: isMissingPunchOut ? 'INCOMPLETE' : a.status,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}
