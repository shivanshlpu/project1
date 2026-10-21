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
  UnauthorizedException,
} from '@nestjs/common';
import { TourPlansService } from './tour-plans.service';
import {
  SubmitMonthlyTpDto,
  MonthlyTpItemDto,
  UpdateTpStatusDto,
  FilterMonthlyTpDto,
  DecideTpReimbursementDto,
  CreateRouteChangeRequestDto,
  ReviewRouteChangeRequestDto,
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
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.punchVisit(userId, dto);
  }

  @Post('monthly')
  async submitMonthlyTourPlan(
    @CurrentUser() user: any,
    @Body() dto: SubmitMonthlyTpDto,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.submitMonthlyTourPlan(userId, dto);
  }

  @Patch(':id/edit')
  async editTourPlan(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SubmitMonthlyTpDto,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.editTourPlan(userId, id, dto);
  }

  @Delete(':id/entries/:entryId')
  async deleteTourPlanEntry(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.deleteTourPlanEntry(userId, id, entryId);
  }

  @Delete(':id')
  async deleteTourPlan(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.deleteTourPlan(userId, id);
  }

  @Get('my')
  async getMyTourPlans(
    @CurrentUser() user: any,
    @Query('month') month?: string,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.getMyTourPlans(userId, month);
  }

  @Get('admin')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminMonthlyTp(@Query() filter: FilterMonthlyTpDto) {
    return this.tourPlansService.getAdminMonthlyTp(filter);
  }

  @Get('admin-list')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminMonthlyTpAlias(@Query() filter: FilterMonthlyTpDto) {
    return this.tourPlansService.getAdminMonthlyTp(filter);
  }

  @Post('route-change-request')
  async submitRouteChangeRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateRouteChangeRequestDto,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.submitRouteChangeRequest(user, dto);
  }

  @Get('route-change-requests')
  async getRouteChangeRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User authentication required.');
    return this.tourPlansService.getRouteChangeRequests(user, status);
  }

  @Patch('route-change-requests/:id/review')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async reviewRouteChangeRequest(
    @Param('id') id: string,
    @Body() dto: ReviewRouteChangeRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.tourPlansService.reviewRouteChangeRequest(id, dto, user);
  }

  @Get(':id')
  async getTourPlanById(@Param('id') id: string) {
    return this.tourPlansService.getTourPlanById(id);
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

  @Patch(':id/entries/:entryId/reimbursement')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async decideReimbursement(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: DecideTpReimbursementDto,
    @CurrentUser() user: any,
  ) {
    return this.tourPlansService.decideReimbursement(
      id,
      entryId,
      dto.status,
      user.id,
      dto.remarks,
    );
  }
}
