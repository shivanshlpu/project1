import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Headers,
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
  async checkIn(
    @CurrentUser() user: any,
    @Headers('x-user-id') headerUserId: string | undefined,
    @Body() dto: CheckInDto,
  ) {
    const userId = user?.id || headerUserId || (dto as any)?.userId || (dto as any)?.employeeId || 'usr-mr-01';
    return this.attendanceService.checkIn(userId, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @CurrentUser() user: any,
    @Headers('x-user-id') headerUserId: string | undefined,
    @Body() dto: CheckOutDto,
  ) {
    const userId = user?.id || headerUserId || (dto as any)?.userId || (dto as any)?.employeeId || 'usr-mr-01';
    return this.attendanceService.checkOut(userId, dto);
  }

  @Get('my')
  async getMyAttendance(
    @CurrentUser() user: any,
    @Query('userId') queryUserId?: string,
    @Headers('x-user-id') headerUserId?: string,
    @Query('month') month?: string,
  ) {
    const userId = user?.id || queryUserId || headerUserId || 'usr-mr-01';
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
