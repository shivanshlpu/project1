import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { DecideApprovalDto, CreateLeaveDto } from './dto/approvals.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getPendingApprovals(@CurrentUser() user: any) {
    return this.approvalsService.getPendingApprovals(user);
  }

  @Post(':id/decide')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async decideApproval(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: DecideApprovalDto,
  ) {
    return this.approvalsService.decideApproval(id, user, dto);
  }
}

@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @Roles('MR', 'MANAGER', 'SUPER_ADMIN')
  async createLeave(@CurrentUser() user: any, @Body() dto: CreateLeaveDto) {
    return this.approvalsService.createLeave(user.id, dto);
  }

  @Get('my')
  async getMyLeaves(@CurrentUser() user: any) {
    return this.approvalsService.getMyLeaves(user.id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminLeaves() {
    return this.approvalsService.getAdminLeaves({});
  }
}
