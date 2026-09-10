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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/locations.dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async getAllLocations() {
    return this.locationsService.getAllLocations();
  }

  @Get('recent')
  async getRecentUnreadLocations() {
    return this.locationsService.getRecentUnreadLocations();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() dto: CreateLocationDto, @Req() req: any) {
    const user = req.user || null;
    return this.locationsService.createLocation(dto, user);
  }

  @Put(':id')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateLocation(@Param('id') id: string, @Body() dto: Partial<CreateLocationDto>) {
    return this.locationsService.updateLocation(id, dto);
  }

  @Delete(':id')
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

