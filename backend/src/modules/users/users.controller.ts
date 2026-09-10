import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  AssignManagerDto,
  AssignTerritoryDto,
  UserFilterDto,
} from './dto/users.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getUsers(@Query() filter: UserFilterDto) {
    return this.usersService.getUsers(filter);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id')
  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Patch(':id/assign-manager')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async assignManager(@Param('id') id: string, @Body() dto: AssignManagerDto) {
    return this.usersService.assignManager(id, dto);
  }

  @Patch(':id/assign-territory')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async assignTerritory(@Param('id') id: string, @Body() dto: AssignTerritoryDto) {
    return this.usersService.assignTerritory(id, dto);
  }

  @Patch(':id/reset-device')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async resetDevice(@Param('id') id: string) {
    return this.usersService.resetDeviceBinding(id);
  }
}
