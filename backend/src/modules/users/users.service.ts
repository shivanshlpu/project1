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
      .map(({ password_hash, ...userWithoutPassword }) => {
        const u = { ...userWithoutPassword } as any;
        if (!u.hq_id && u.hq_name) {
          const hq = this.db.findHeadquarter(u.hq_name);
          if (hq) {
            u.hq_id = hq.hq_id;
            u.hq_code = hq.code;
          }
        }
        u.assigned_territory = u.assigned_territory || u.territory || '';
        u.assigned_route_batches = u.assigned_route_batches || u.route_batches || [];
        return u;
      });
  }

  async getUserById(id: string) {
    const user = this.db.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { password_hash, ...userWithoutPassword } = user;
    const u = { ...userWithoutPassword } as any;
    if (!u.hq_id && u.hq_name) {
      const hq = this.db.findHeadquarter(u.hq_name);
      if (hq) {
        u.hq_id = hq.hq_id;
        u.hq_code = hq.code;
      }
    }
    u.assigned_territory = u.assigned_territory || u.territory || '';
    u.assigned_route_batches = u.assigned_route_batches || u.route_batches || [];
    return u;
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
    const newUser: any = {
      id: `usr-${uuidv4().substring(0, 8)}`,
      name: dto.name,
      phone: dto.phone,
      email: dto.email.toLowerCase(),
      password_hash,
      role: dto.role,
      zone_id: dto.zone_id,
      region_id: dto.region_id,
      area_id: dto.area_id,
      hq_id: dto.hq_id,
      hq_code: dto.hq_code,
      hq_name: dto.hq_name,
      territory: dto.territory,
      assigned_territory: dto.assigned_territory || dto.territory,
      assigned_route_batches: dto.assigned_route_batches || [],
      route_batches: dto.assigned_route_batches || [],
      manager_id: dto.manager_id,
      status: 'ACTIVE' as const,
      biometric_enabled: !!dto.biometric_enabled,
      created_at: new Date().toISOString(),
    };

    if (dto.hq_id && !dto.hq_code) {
      const hq = this.db.findHeadquarter(dto.hq_id);
      if (hq) {
        newUser.hq_code = hq.code;
        newUser.hq_name = hq.name;
      }
    }

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
    if (dto.role) user.role = dto.role;
    if (dto.area_id) user.area_id = dto.area_id;
    if (dto.hq_id) user.hq_id = dto.hq_id;
    if (dto.hq_code) user.hq_code = dto.hq_code;
    if (dto.hq_name) user.hq_name = dto.hq_name;
    if (dto.territory) user.territory = dto.territory;
    if (dto.assigned_territory) user.assigned_territory = dto.assigned_territory;
    if (dto.assigned_route_batches) {
      user.assigned_route_batches = dto.assigned_route_batches;
      user.route_batches = dto.assigned_route_batches;
    }
    if (dto.route_batches) {
      user.route_batches = dto.route_batches;
      user.assigned_route_batches = dto.route_batches;
    }
    if (dto.biometric_enabled !== undefined) user.biometric_enabled = dto.biometric_enabled;

    if (dto.password && dto.password.trim()) {
      user.password_hash = await bcrypt.hash(dto.password.trim(), 10);
    }

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteUser(id: string) {
    const userIndex = this.db.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const deletedUser = this.db.users.splice(userIndex, 1)[0];

    // Cascade delete all associated data for this user across all in-memory collections
    this.db.tasks = this.db.tasks.filter((t) => t.assigned_mr_id !== id && t.created_by !== id);
    this.db.taskAssignments = this.db.taskAssignments.filter((ta) => ta.mr_id !== id);
    this.db.locationVerifications = this.db.locationVerifications.filter((lv) => lv.user_id !== id);
    this.db.attendance = this.db.attendance.filter((a) => a.user_id !== id);

    const userVisitIds = new Set(this.db.doctorVisits.filter((dv) => dv.mr_id === id).map((dv) => dv.id));
    this.db.doctorVisits = this.db.doctorVisits.filter((dv) => dv.mr_id !== id);
    this.db.visitDetails = this.db.visitDetails.filter((vd) => !userVisitIds.has(vd.visit_id));

    const userDcrIds = new Set(this.db.dcrList.filter((dcr) => dcr.mr_id === id).map((dcr) => dcr.id));
    this.db.dcrList = this.db.dcrList.filter((dcr) => dcr.mr_id !== id);
    this.db.dcrItems = this.db.dcrItems.filter((item) => !userDcrIds.has(item.dcr_id));
    this.db.expenses = this.db.expenses.filter((e) => e.mr_id !== id);
    this.db.leaveRequests = this.db.leaveRequests.filter((lr) => lr.mr_id !== id);
    this.db.leaveQuotas = this.db.leaveQuotas.filter((lq) => lq.mr_id !== id);
    this.db.tourPlans = this.db.tourPlans.filter((tp) => tp.mr_id !== id);
    this.db.monthlyTourPlans = this.db.monthlyTourPlans.filter((mtp) => mtp.mr_id !== id);
    this.db.deviceAuthorizations = this.db.deviceAuthorizations.filter((da) => da.user_id !== id);
    this.db.rewardClaims = this.db.rewardClaims.filter((rc) => rc.mr_id !== id);
    this.db.notifications = this.db.notifications.filter((n) => n.user_id !== id);

    this.db.persistToDisk();

    // Supabase cascade cleanup
    if (this.db.supabase && this.db.supabase.isConnected) {
      try {
        const client = this.db.supabase.getClient();
        if (client) {
          await client.from('tasks').delete().or(`assigned_mr_id.eq.${id},created_by.eq.${id}`);
          await client.from('attendance').delete().eq('user_id', id);
          await client.from('leave_requests').delete().eq('mr_id', id);
          await client.from('doctor_visits').delete().eq('mr_id', id);
          await client.from('device_authorizations').delete().eq('user_id', id);
          await client.from('users').delete().eq('id', id);
        }
      } catch (err: any) {
        console.warn(`[UsersService] Supabase cascade delete notice for ${id}:`, err?.message);
      }
    }

    return {
      success: true,
      message: `Employee ${deletedUser.name} (${id}) and all associated records deleted successfully.`,
      id,
    };
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
