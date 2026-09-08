import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { StartVisitDto, EndVisitDto } from './dto/visits.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('start')
  @Roles('MR', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async startVisit(@CurrentUser() user: any, @Body() dto: StartVisitDto) {
    return this.visitsService.startVisit(user.id, dto);
  }

  @Post(':id/end')
  @Roles('MR', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async endVisit(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: EndVisitDto,
  ) {
    return this.visitsService.endVisit(id, user.id, dto);
  }

  @Get('my')
  async getMyVisits(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.visitsService.getMyVisits(user.id, date);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminVisits(
    @Query('mr_id') mrId?: string,
    @Query('doctor_id') doctorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.visitsService.getAdminVisits({ mr_id: mrId, doctor_id: doctorId, startDate, endDate });
  }
}
