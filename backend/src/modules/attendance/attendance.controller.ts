import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  CheckInDto,
  CheckOutDto,
  AttendanceFilterDto,
  UpdateAttendanceSettingsDto,
} from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('settings')
  async getSettings() {
    return this.attendanceService.getSettings();
  }

  @Patch('settings')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateSettings(@Body() dto: UpdateAttendanceSettingsDto) {
    return this.attendanceService.updateSettings(dto);
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(@CurrentUser() user: any, @Body() dto: CheckInDto) {
    const userId = user?.id || 'usr-mr-01';
    return this.attendanceService.checkIn(userId, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  async checkOut(@CurrentUser() user: any, @Body() dto: CheckOutDto) {
    const userId = user?.id || 'usr-mr-01';
    return this.attendanceService.checkOut(userId, dto);
  }

  @Get('my')
  async getMyAttendance(@CurrentUser() user: any, @Query('month') month?: string) {
    const userId = user?.id || 'usr-mr-01';
    return this.attendanceService.getMyAttendance(userId, month);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminAttendance(@Query() filter: AttendanceFilterDto) {
    return this.attendanceService.getAdminAttendance(filter);
  }

  @Post('purge-expired-photos')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async purgeExpiredPhotos() {
    return this.attendanceService.purgeExpiredPhotos();
  }
}
