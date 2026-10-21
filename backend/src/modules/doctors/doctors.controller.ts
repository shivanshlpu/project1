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
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto, UpdateDoctorDto, DoctorFilterDto } from './dto/doctors.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async getDoctors(@Query() filter: DoctorFilterDto, @CurrentUser() user: any) {
    return this.doctorsService.getDoctors(filter, user);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR')
  async createDoctor(@Body() dto: CreateDoctorDto, @CurrentUser() user: any) {
    return this.doctorsService.createDoctor(dto, user.id);
  }

  @Get(':id')
  async getDoctorById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorById(id, user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR')
  async updateDoctor(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() user: any,
  ) {
    return this.doctorsService.updateDoctor(id, dto, user);
  }

  @Get(':id/visits')
  async getDoctorVisits(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorVisits(id, user);
  }
}
