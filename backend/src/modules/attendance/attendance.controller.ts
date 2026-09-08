import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, AttendanceFilterDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(@CurrentUser() user: any, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(user.id, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  async checkOut(@CurrentUser() user: any, @Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(user.id, dto);
  }

  @Get('my')
  async getMyAttendance(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.attendanceService.getMyAttendance(user.id, month);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminAttendance(@Query() filter: AttendanceFilterDto) {
    return this.attendanceService.getAdminAttendance(filter);
  }
}
