import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/locations.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async getAllLocations(@Req() req: any, @Query() query: any) {
    const user = req.user || null;
    return this.locationsService.getAllLocations(user, query);
  }

  @Get('recent')
  async getRecentUnreadLocations() {
    return this.locationsService.getRecentUnreadLocations();
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR')
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() dto: CreateLocationDto, @Req() req: any) {
    const user = req.user || null;
    return this.locationsService.createLocation(dto, user);
  }

  @Put(':id')
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async updateLocation(@Param('id') id: string, @Body() dto: Partial<CreateLocationDto>) {
    return this.locationsService.updateLocation(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async deleteLocation(@Param('id') id: string) {
    return this.locationsService.deleteLocation(id);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledgeLocation(@Param('id') id: string) {
    return this.locationsService.acknowledgeLocation(id);
  }

  @Post('acknowledge-all')
  @HttpCode(HttpStatus.OK)
  async acknowledgeAllLocations() {
    return this.locationsService.acknowledgeAllLocations();
  }
}


