import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { CheckInDto, CheckOutDto, AttendanceFilterDto } from './dto/attendance.dto';
import { Attendance } from '../../database/database.types';

@Injectable()
export class AttendanceService {
  constructor(private readonly db: DatabaseService) {}

  async checkIn(userId: string, dto: CheckInDto) {
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.db.attendance.find(
      (a) => a.user_id === userId && a.date === todayStr,
    );

    if (existing) {
      return { message: 'Attendance already recorded for today', attendance: existing };
    }

    const now = new Date();
    // If check-in is after 09:30 AM, mark as LATE, else PRESENT
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && minutes > 30);

    const record: Attendance = {
      id: `att-${uuidv4().substring(0, 8)}`,
      user_id: userId,
      date: todayStr,
      check_in_at: now.toISOString(),
      check_in_lat: dto.latitude,
      check_in_lng: dto.longitude,
      status: isLate ? 'LATE' : 'PRESENT',
    };

    this.db.attendance.push(record);
    return { message: 'Check-in recorded successfully', attendance: record };
  }

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

    record.check_out_at = new Date().toISOString();
    record.check_out_lat = dto.latitude;
    record.check_out_lng = dto.longitude;

    return { message: 'Check-out recorded successfully', attendance: record };
  }

  async getMyAttendance(userId: string, month?: string) {
    return this.db.attendance
      .filter((a) => a.user_id === userId)
      .filter((a) => (month ? a.date.startsWith(month) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getAdminAttendance(filter: AttendanceFilterDto) {
    return this.db.attendance
      .filter((a) => (filter.user_id ? a.user_id === filter.user_id : true))
      .filter((a) => (filter.startDate ? a.date >= filter.startDate : true))
      .filter((a) => (filter.endDate ? a.date <= filter.endDate : true))
      .map((a) => {
        const user = this.db.users.find((u) => u.id === a.user_id);
        return {
          ...a,
          user_name: user?.name || 'Unknown',
          user_role: user?.role || 'MR',
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}
