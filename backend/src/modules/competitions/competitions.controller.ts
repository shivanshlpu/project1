import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  DecideRewardClaimDto,
} from './competitions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('competitions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Get('my')
  async getMyCompetitions(@CurrentUser() user: any) {
    const userId = user?.id || 'usr-mr-01';
    return this.competitionsService.getMyCompetitions(userId);
  }

  @Post(':id/claim')
  async claimReward(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user?.id || 'usr-mr-01';
    return this.competitionsService.claimReward(id, userId);
  }

  @Get('admin')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminCompetitions() {
    return this.competitionsService.getAdminCompetitions();
  }

  @Get('claims')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAllRewardClaims() {
    return this.competitionsService.getAllRewardClaims();
  }

  @Patch('claims/:claimId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async decideRewardClaim(
    @Param('claimId') claimId: string,
    @Body() dto: DecideRewardClaimDto,
    @CurrentUser() user: any,
  ) {
    return this.competitionsService.decideRewardClaim(claimId, dto, user.id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createCompetition(@Body() dto: CreateCompetitionDto) {
    return this.competitionsService.createCompetition(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateCompetition(
    @Param('id') id: string,
    @Body() dto: UpdateCompetitionDto,
  ) {
    return this.competitionsService.updateCompetition(id, dto);
  }
}
