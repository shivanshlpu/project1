import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  CreateUserDto,
  UpdateUserDto,
  AssignManagerDto,
  AssignTerritoryDto,
  UserFilterDto,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getUsers(filter: UserFilterDto) {
    return this.db.users
      .filter((u) => !u.deleted_at)
      .filter((u) => (filter.zone_id ? u.zone_id === filter.zone_id : true))
      .filter((u) => (filter.region_id ? u.region_id === filter.region_id : true))
      .filter((u) => (filter.area_id ? u.area_id === filter.area_id : true))
      .filter((u) => (filter.role ? u.role === filter.role : true))
      .filter((u) => (filter.status ? u.status === filter.status : true))
      .map(({ password_hash, ...userWithoutPassword }) => userWithoutPassword);
  }

  async getUserById(id: string) {
    const user = this.db.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(dto: CreateUserDto) {
    const existing = this.db.users.find(
      (u) =>
        (u.email.toLowerCase() === dto.email.toLowerCase() || u.phone === dto.phone) &&
        !u.deleted_at,
    );
    if (existing) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const newUser = {
      id: `usr-${uuidv4().substring(0, 8)}`,
      name: dto.name,
      phone: dto.phone,
      email: dto.email.toLowerCase(),
      password_hash,
      role: dto.role,
      zone_id: dto.zone_id,
      region_id: dto.region_id,
      area_id: dto.area_id,
      manager_id: dto.manager_id,
      status: 'ACTIVE' as const,
      biometric_enabled: !!dto.biometric_enabled,
      created_at: new Date().toISOString(),
    };

    this.db.users.push(newUser);
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = this.db.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) throw new NotFoundException('User not found');

    if (dto.name) user.name = dto.name;
    if (dto.phone) user.phone = dto.phone;
    if (dto.email) user.email = dto.email.toLowerCase();
    if (dto.status) user.status = dto.status;
    if (dto.biometric_enabled !== undefined) user.biometric_enabled = dto.biometric_enabled;

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deactivateUser(id: string) {
    const user = this.db.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) throw new NotFoundException('User not found');

    user.status = 'INACTIVE';
    user.deleted_at = new Date().toISOString(); // Soft-delete per Section 2
    return { message: 'User deactivated and soft-deleted successfully' };
  }

  async assignManager(id: string, dto: AssignManagerDto) {
    const user = this.db.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) throw new NotFoundException('User not found');

    const manager = this.db.users.find(
      (u) => u.id === dto.manager_id && u.role === 'MANAGER' && !u.deleted_at,
    );
    if (!manager) throw new NotFoundException('Manager user not found');

    user.manager_id = dto.manager_id;
    return { message: 'Manager assigned successfully', user_id: id, manager_id: dto.manager_id };
  }

  async assignTerritory(id: string, dto: AssignTerritoryDto) {
    const user = this.db.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) throw new NotFoundException('User not found');

    user.area_id = dto.area_id;
    if (dto.region_id) user.region_id = dto.region_id;
    if (dto.zone_id) user.zone_id = dto.zone_id;

    if (user.role === 'MR') {
      this.db.territories.push({
        id: `terr-${uuidv4().substring(0, 8)}`,
        area_id: dto.area_id,
        mr_user_id: user.id,
      });
    }

    return { message: 'Territory assigned successfully', user_id: id, area_id: dto.area_id };
  }

  async resetDeviceBinding(id: string) {
    const user = this.db.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) throw new NotFoundException('User not found');

    const previousDevice = user.device_model || user.device_id || 'None';
    user.device_id = undefined;
    user.device_model = undefined;
    user.device_bound_at = undefined;

    return {
      message: 'Device binding successfully reset. The user can now pair a new designated phone on their next login.',
      user_id: id,
      previous_device: previousDevice,
    };
  }
}
