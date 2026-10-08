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
    // and fare / reimbursement rate is HIDDEN from MR per policy
    if (user?.role === 'MR') {
      const userHq = user.hq_id;
      const userHqCode = user.hq_code;
      const userId = user.id || user.sub;
      return list
        .filter((rb) => {
          const matchesHq = (userHq && rb.hq_id === userHq) || (userHqCode && rb.hq_code === userHqCode);
          const matchesMr = rb.mr_id === userId;
          return matchesHq || matchesMr;
        })
        .map((rb) => ({
          ...rb,
          standard_reimbursement_rate: undefined, // Fare hidden from MR
        }));
    }

    if (hqId && hqId !== 'ALL') {
      const cleanHq = hqId.toLowerCase().trim();
      const stripped = cleanHq.replace(/^hq-/, '');
      list = list.filter((rb) =>
        rb.hq_id.toLowerCase() === cleanHq ||
        rb.hq_id.toLowerCase().includes(stripped) ||
        rb.hq_code.toLowerCase() === cleanHq ||
        rb.hq_code.toLowerCase() === stripped ||
        rb.hq_name.toLowerCase() === cleanHq ||
        rb.hq_name.toLowerCase() === stripped,
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
      return {
        ...rb,
        standard_reimbursement_rate: undefined, // Fare hidden from MR
      };
    }

    return rb;
  }

  async suggestRouteBatches(
    user: any,
    destination: string,
    hqId?: string,
    mrId?: string,
  ): Promise<{
    suggested_batch: any;
    batches: any[];
    destination: string;
    configured_rate?: number;
    match_found: boolean;
    message?: string;
  }> {
    const defaultPolicyRate = this.db.attendanceSettings?.reimbursement_rate_per_km ?? 2.5;
    const cleanDest = (destination || '').trim().toLowerCase();
    const isMr = user?.role === 'MR';

    // 1. Identify MR & HQ
    let accessibleBatches = await this.getRouteBatches(user, hqId, mrId);
    // Filter to active batches only
    accessibleBatches = accessibleBatches.filter((b) => b.status === 'ACTIVE');

    if (!cleanDest) {
      return {
        suggested_batch: null,
        batches: [],
        destination: destination || '',
        configured_rate: isMr ? undefined : defaultPolicyRate,
        match_found: false,
        message: 'Please provide a destination to search for route batches.',
      };
    }

    // 2. Matching logic: Destination can exist as a stop inside a larger route
    // Matches if destination is in route_stops, areas, or name
    const matches: { batch: RouteBatch; score: number }[] = [];

    for (const batch of accessibleBatches) {
      const stops = (batch.route_stops || []).map((s) => s.trim().toLowerCase());
      const areas = (batch.areas || []).map((a) => a.trim().toLowerCase());
      const name = batch.name.toLowerCase();

      let score = 0;
      // Exact stop match gets highest priority
      if (stops.includes(cleanDest)) {
        score = 100;
      } else if (areas.includes(cleanDest)) {
        score = 90;
      } else if (stops.some((s) => s.includes(cleanDest) || cleanDest.includes(s))) {
        score = 70;
      } else if (areas.some((a) => a.includes(cleanDest) || cleanDest.includes(a))) {
        score = 60;
      } else if (name.includes(cleanDest)) {
        score = 50;
      }

      if (score > 0) {
        matches.push({ batch, score });
      }
    }

    // Sort by best score descending, then by distance
    matches.sort((a, b) => b.score - a.score || a.batch.distance_km - b.batch.distance_km);

    const formattedBatches = matches.map(({ batch, score }) => {
      const rate = batch.standard_reimbursement_rate ?? defaultPolicyRate;
      const oneWayDistance = batch.distance_km || 0;
      const roundTripDistance = oneWayDistance * 2;
      const amount = Math.round(roundTripDistance * rate * 100) / 100;
      const routeStr =
        batch.route_stops && batch.route_stops.length > 0
          ? batch.route_stops.join(' → ')
          : batch.name;

      return {
        id: batch.id,
        batch_code: batch.batch_code,
        name: batch.name,
        route: routeStr,
        route_stops: batch.route_stops || batch.areas || [],
        distance_km: oneWayDistance,
        one_way_distance_km: oneWayDistance,
        round_trip_distance_km: roundTripDistance,
        is_round_trip: true,
        // Fare details hidden from MR; visible only to admin/managers
        reimbursement_rate: isMr ? undefined : rate,
        reimbursement_amount: isMr ? undefined : amount,
        hq_id: batch.hq_id,
        hq_name: batch.hq_name,
        mr_id: batch.mr_id,
        mr_name: batch.mr_name,
        territory_name: batch.territory_name,
        is_exact_match: score >= 90,
      };
    });

    const matchFound = formattedBatches.length > 0;

    return {
      suggested_batch: matchFound ? formattedBatches[0] : null,
      batches: formattedBatches,
      destination,
      configured_rate: isMr ? undefined : defaultPolicyRate,
      match_found: matchFound,
      message: matchFound
        ? `Identified ${formattedBatches.length} route batch(es) for ${destination}.`
        : `No predefined route batch found containing '${destination}'. Center-to-boundary direct calculation applies.`,
    };
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

    const stops = dto.route_stops && dto.route_stops.length > 0
      ? dto.route_stops
      : (dto.areas && dto.areas.length > 0 ? dto.areas : [dto.name]);

    const defaultRate = this.db.attendanceSettings?.reimbursement_rate_per_km ?? 2.5;

    const newBatch: RouteBatch = {
      id: `rb-${uuidv4().substring(0, 8)}`,
      batch_code: dto.batch_code.trim(),
      name: dto.name.trim(),
      hq_id: hqId,
      hq_code: hqCode,
      hq_name: hqName,
      mr_id: dto.mr_id,
      mr_name: mrName,
      territory_name: dto.territory_name || `${hqName} HQ Territory`,
      route_stops: stops,
      areas: stops,
      distance_km: dto.distance_km || 0,
      standard_reimbursement_rate: dto.standard_reimbursement_rate ?? defaultRate,
      status: dto.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    this.db.persistToDisk();
    return newBatch;
  }

  async updateRouteBatch(id: string, dto: UpdateRouteBatchDto): Promise<RouteBatch> {
    const rb = this.db.routeBatches.find((b) => b.id === id || b.batch_code === id);
    if (!rb) throw new NotFoundException('Route Batch not found');

    if (dto.batch_code) rb.batch_code = dto.batch_code.trim();
    if (dto.name) rb.name = dto.name.trim();
    if (dto.route_stops) {
      rb.route_stops = dto.route_stops;
      rb.areas = dto.route_stops;
    } else if (dto.areas) {
      rb.areas = dto.areas;
      if (!rb.route_stops || rb.route_stops.length === 0) rb.route_stops = dto.areas;
    }
    if (dto.distance_km !== undefined) rb.distance_km = dto.distance_km;
    if (dto.standard_reimbursement_rate !== undefined) {
      rb.standard_reimbursement_rate = dto.standard_reimbursement_rate;
    }
    if (dto.status) rb.status = dto.status;
    if (dto.hq_id) {
      const hq = this.db.findHeadquarter(dto.hq_id);
      if (hq) {
        rb.hq_id = hq.hq_id;
        rb.hq_code = hq.code;
        rb.hq_name = hq.name;
      } else {
        rb.hq_id = dto.hq_id;
      }
    }
    if (dto.territory_name) rb.territory_name = dto.territory_name;
    if (dto.mr_id !== undefined) {
      rb.mr_id = dto.mr_id;
      if (dto.mr_id) {
        const mr = this.db.users.find((u) => u.id === dto.mr_id);
        rb.mr_name = mr ? mr.name : '';
      } else {
        rb.mr_name = undefined;
      }
    }

    rb.updated_at = new Date().toISOString();
    this.db.persistToDisk();
    return rb;
  }

  async deleteRouteBatch(id: string): Promise<{ success: boolean; message: string }> {
    const idx = this.db.routeBatches.findIndex((b) => b.id === id || b.batch_code === id);
    if (idx === -1) throw new NotFoundException('Route Batch not found');

    const removed = this.db.routeBatches.splice(idx, 1)[0];
    this.db.persistToDisk();
    return { success: true, message: `Route Batch ${removed.batch_code} deleted successfully` };
  }
}
