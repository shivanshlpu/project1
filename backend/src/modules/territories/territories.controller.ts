import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TerritoriesService } from './territories.service';
import {
  CreateZoneDto,
  CreateRegionDto,
  CreateAreaDto,
  AssignAreaManagerDto,
  AssignAreaMrDto,
} from './territories.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('territories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  @Get('zones')
  async getZones() {
    return this.territoriesService.getZones();
  }

  @Post('zones')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createZone(@Body() dto: CreateZoneDto) {
    return this.territoriesService.createZone(dto);
  }

  @Get('regions')
  async getRegions(@Query('zone_id') zoneId?: string) {
    return this.territoriesService.getRegions(zoneId);
  }

  @Post('regions')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createRegion(@Body() dto: CreateRegionDto) {
    return this.territoriesService.createRegion(dto);
  }

  @Get('areas')
  async getAreas(@Query('region_id') regionId?: string) {
    return this.territoriesService.getAreas(regionId);
  }

  @Post('areas')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createArea(@Body() dto: CreateAreaDto) {
    return this.territoriesService.createArea(dto);
  }

  @Patch('areas/:id/assign-manager')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async assignManager(@Param('id') areaId: string, @Body() dto: AssignAreaManagerDto) {
    return this.territoriesService.assignAreaManager(areaId, dto);
  }

  @Patch('areas/:id/assign-mr')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async assignMr(@Param('id') areaId: string, @Body() dto: AssignAreaMrDto) {
    return this.territoriesService.assignAreaMr(areaId, dto);
  }
}
