import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  CreateZoneDto,
  CreateRegionDto,
  CreateAreaDto,
  AssignAreaManagerDto,
  AssignAreaMrDto,
} from './territories.dto';

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
}
