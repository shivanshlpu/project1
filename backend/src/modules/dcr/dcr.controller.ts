import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DcrService } from './dcr.service';
import { SubmitDcrDto, ManagerCorrectionDcrDto, ApproveDcrDto } from './dto/dcr.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('dcr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DcrController {
  constructor(private readonly dcrService: DcrService) {}

  @Get('today')
  @Roles('MR', 'SUPER_ADMIN')
  async getTodayDcrDraft(@CurrentUser() user: any) {
    return this.dcrService.getTodayDcrDraft(user.id);
  }

  @Post(':id/submit')
  @Roles('MR', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async submitDcr(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitDcrDto,
  ) {
    return this.dcrService.submitDcr(id, user.id, dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async managerCorrection(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ManagerCorrectionDcrDto,
  ) {
    return this.dcrService.managerCorrection(id, user.id, dto);
  }

  @Post(':id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async approveDcr(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApproveDcrDto,
  ) {
    return this.dcrService.approveDcr(id, user.id, dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminDcrList(
    @Query('mr_id') mrId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dcrService.getAdminDcrList({ mr_id: mrId, status, startDate, endDate });
  }
}
