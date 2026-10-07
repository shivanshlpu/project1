import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  CreateZoneDto,
  CreateRegionDto,
  CreateAreaDto,
  AssignAreaManagerDto,
  AssignAreaMrDto,
  CreateRouteBatchDto,
  UpdateRouteBatchDto,
} from './territories.dto';
import { RouteBatch } from '../../database/database.types';

@Injectable()
export class TerritoriesService {
  constructor(private readonly db: DatabaseService) {}

  // Zones
  async getZones() {
    return this.db.zones;
  }

  async createZone(dto: CreateZoneDto) {
    const zone = {
      id: `zone-${uuidv4().substring(0, 8)}`,
      name: dto.name,
    };
    this.db.zones.push(zone);
    return zone;
  }

  // Regions
  async getRegions(zoneId?: string) {
    if (zoneId) {
      return this.db.regions.filter((r) => r.zone_id === zoneId);
    }
    return this.db.regions;
  }

  async createRegion(dto: CreateRegionDto) {
    const zone = this.db.zones.find((z) => z.id === dto.zone_id);
    if (!zone) throw new NotFoundException('Zone not found');

    const region = {
      id: `reg-${uuidv4().substring(0, 8)}`,
      zone_id: dto.zone_id,
      name: dto.name,
    };
    this.db.regions.push(region);
    return region;
  }

  // Areas
  async getAreas(regionId?: string) {
    if (regionId) {
      return this.db.areas.filter((a) => a.region_id === regionId);
    }
    return this.db.areas;
  }

  async createArea(dto: CreateAreaDto) {
    const region = this.db.regions.find((r) => r.id === dto.region_id);
    if (!region) throw new NotFoundException('Region not found');

    const area = {
      id: `area-${uuidv4().substring(0, 8)}`,
      region_id: dto.region_id,
      name: dto.name,
      manager_id: dto.manager_id,
    };
    this.db.areas.push(area);
    return area;
  }

  async assignAreaManager(areaId: string, dto: AssignAreaManagerDto) {
    const area = this.db.areas.find((a) => a.id === areaId);
    if (!area) throw new NotFoundException('Area not found');

    const manager = this.db.users.find(
      (u) => u.id === dto.manager_id && u.role === 'MANAGER' && !u.deleted_at,
    );
    if (!manager) throw new NotFoundException('Manager not found');

    area.manager_id = dto.manager_id;
    manager.area_id = areaId;
    return { message: 'Manager assigned successfully', area };
  }

  async assignAreaMr(areaId: string, dto: AssignAreaMrDto) {
    const area = this.db.areas.find((a) => a.id === areaId);
    if (!area) throw new NotFoundException('Area not found');

    const mr = this.db.users.find(
      (u) => u.id === dto.mr_user_id && u.role === 'MR' && !u.deleted_at,
    );
    if (!mr) throw new NotFoundException('MR user not found');

    mr.area_id = areaId;
    const territory = {
      id: `terr-${uuidv4().substring(0, 8)}`,
      area_id: areaId,
      mr_user_id: dto.mr_user_id,
    };
    this.db.territories.push(territory);

    return { message: 'MR assigned to area successfully', territory };
  }

  // ==========================================
  // ROUTE BATCHES (Mapped per MR & HQ ID)
  // ==========================================

  async getRouteBatches(user: any, hqId?: string, mrId?: string): Promise<RouteBatch[]> {
    let list = this.db.routeBatches;

    // Strict MR data isolation:
    // If the authenticated user is an MR, they can ONLY access their own HQ or MR route batches
    if (user?.role === 'MR') {
      const userHq = user.hq_id;
      const userHqCode = user.hq_code;
      const userId = user.id || user.sub;
      return list.filter((rb) => {
        const matchesHq = (userHq && rb.hq_id === userHq) || (userHqCode && rb.hq_code === userHqCode);
        const matchesMr = rb.mr_id === userId;
        return matchesHq || matchesMr;
      });
    }

    if (hqId && hqId !== 'ALL') {
      const cleanHq = hqId.toLowerCase().trim();
      list = list.filter((rb) =>
        rb.hq_id.toLowerCase() === cleanHq ||
        rb.hq_code.toLowerCase() === cleanHq ||
        rb.hq_name.toLowerCase() === cleanHq,
      );
    }

    if (mrId && mrId !== 'ALL') {
      list = list.filter((rb) => rb.mr_id === mrId);
    }

    return list;
  }

  async getRouteBatchById(id: string, user: any): Promise<RouteBatch> {
    const rb = this.db.routeBatches.find((b) => b.id === id || b.batch_code === id);
    if (!rb) throw new NotFoundException('Route Batch not found');

    if (user?.role === 'MR') {
      const userHq = user.hq_id;
      const userHqCode = user.hq_code;
      const userId = user.id || user.sub;
      const matchesHq = (userHq && rb.hq_id === userHq) || (userHqCode && rb.hq_code === userHqCode);
      const matchesMr = rb.mr_id === userId;
      if (!matchesHq && !matchesMr) {
        throw new ForbiddenException('Access denied: You cannot access route batches of another MR/HQ');
      }
    }

    return rb;
  }

  async createRouteBatch(dto: CreateRouteBatchDto): Promise<RouteBatch> {
    const existing = this.db.routeBatches.find(
      (b) => b.batch_code.toUpperCase() === dto.batch_code.trim().toUpperCase(),
    );
    if (existing) {
      throw new BadRequestException(`Route Batch code ${dto.batch_code} already exists`);
    }

    const hq = this.db.findHeadquarter(dto.hq_id);
    const hqId = hq ? hq.hq_id : dto.hq_id;
    const hqCode = hq ? hq.code : (dto.hq_code || '');
    const hqName = hq ? hq.name : '';

    let mrName = '';
    if (dto.mr_id) {
      const mr = this.db.users.find((u) => u.id === dto.mr_id);
      if (mr) mrName = mr.name;
    }

    const newBatch: RouteBatch = {
      id: `rb-${uuidv4().substring(0, 8)}`,
      batch_code: dto.batch_code.trim().toUpperCase(),
      name: dto.name.trim(),
      hq_id: hqId,
      hq_code: hqCode,
      hq_name: hqName,
      mr_id: dto.mr_id,
      mr_name: mrName,
      territory_name: dto.territory_name || `${hqName} HQ Territory`,
      areas: dto.areas || [],
      distance_km: dto.distance_km || 0,
      standard_reimbursement_rate: dto.standard_reimbursement_rate || 10,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.db.routeBatches.push(newBatch);

    // Also link to user's assigned_route_batches if mr_id is provided
    if (dto.mr_id) {
      const mr = this.db.users.find((u) => u.id === dto.mr_id);
      if (mr) {
        if (!mr.assigned_route_batches) mr.assigned_route_batches = [];
        if (!mr.assigned_route_batches.includes(newBatch.batch_code)) {
          mr.assigned_route_batches.push(newBatch.batch_code);
          mr.route_batches = mr.assigned_route_batches;
        }
      }
    }

    return newBatch;
  }

  async updateRouteBatch(id: string, dto: UpdateRouteBatchDto): Promise<RouteBatch> {
    const rb = this.db.routeBatches.find((b) => b.id === id || b.batch_code === id);
    if (!rb) throw new NotFoundException('Route Batch not found');

    if (dto.name) rb.name = dto.name.trim();
    if (dto.areas) rb.areas = dto.areas;
    if (dto.distance_km !== undefined) rb.distance_km = dto.distance_km;
    if (dto.standard_reimbursement_rate !== undefined) {
      rb.standard_reimbursement_rate = dto.standard_reimbursement_rate;
    }
    if (dto.status) rb.status = dto.status;
    if (dto.mr_id !== undefined) {
      rb.mr_id = dto.mr_id;
      if (dto.mr_id) {
        const mr = this.db.users.find((u) => u.id === dto.mr_id);
        rb.mr_name = mr ? mr.name : '';
      } else {
        rb.mr_name = undefined;
      }
    }

    return rb;
  }

  async deleteRouteBatch(id: string): Promise<{ success: boolean; message: string }> {
    const idx = this.db.routeBatches.findIndex((b) => b.id === id || b.batch_code === id);
    if (idx === -1) throw new NotFoundException('Route Batch not found');

    const removed = this.db.routeBatches.splice(idx, 1)[0];
    return { success: true, message: `Route Batch ${removed.batch_code} deleted successfully` };
  }
}
