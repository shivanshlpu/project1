import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TourPlansService } from './tour-plans.service';
import {
  SubmitMonthlyTpDto,
  UpdateTpStatusDto,
  FilterMonthlyTpDto,
} from './tour-plans.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('tour-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TourPlansController {
  constructor(private readonly tourPlansService: TourPlansService) {}

  @Post('monthly')
  async submitMonthlyTourPlan(
    @CurrentUser() user: any,
    @Body() dto: SubmitMonthlyTpDto,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tourPlansService.submitMonthlyTourPlan(userId, dto);
  }

  @Get('my')
  async getMyTourPlans(
    @CurrentUser() user: any,
    @Query('month') month?: string,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tourPlansService.getMyTourPlans(userId, month);
  }

  @Get('admin')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminMonthlyTp(@Query() filter: FilterMonthlyTpDto) {
    return this.tourPlansService.getAdminMonthlyTp(filter);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateTpStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTpStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.tourPlansService.updateTpStatus(id, dto, user.id);
  }
}
