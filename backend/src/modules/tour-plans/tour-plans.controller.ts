import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TourPlansService } from './tour-plans.service';
import {
  SubmitMonthlyTpDto,
  MonthlyTpItemDto,
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

  @Post('punch')
  async punchVisit(
    @CurrentUser() user: any,
    @Body() dto: MonthlyTpItemDto,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tourPlansService.punchVisit(userId, dto);
  }

  @Post('monthly')
  async submitMonthlyTourPlan(
    @CurrentUser() user: any,
    @Body() dto: SubmitMonthlyTpDto,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tourPlansService.submitMonthlyTourPlan(userId, dto);
  }

  @Patch(':id/edit')
  async editTourPlan(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SubmitMonthlyTpDto,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tourPlansService.editTourPlan(userId, id, dto);
  }

  @Delete(':id/entries/:entryId')
  async deleteTourPlanEntry(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tourPlansService.deleteTourPlanEntry(userId, id, entryId);
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
