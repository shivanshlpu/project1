import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { CreateLocationDto } from './dto/locations.dto';

export interface SavedLocation {
  id: string;
  name: string;
  clinic: string;
  doctor_name?: string;
  qualification: string;
  specialization: string;
  class: 'A' | 'B' | 'C';
  potential_score: number;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  category: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';
  created_by: string;
  created_by_role: 'ADMIN' | 'MR';
  created_by_name: string;
  area_name: string;
  visit_count: number;
  is_new?: boolean;
  batch_id?: string;
  batch_code?: string;
  batch_name?: string;
  created_at: string;
}

@Injectable()
export class LocationsService implements OnModuleInit {
  private locations: SavedLocation[] = [];

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    this.seedDefaultLocations();
    if (this.db.savedLocations && this.db.savedLocations.length > 0) {
      this.locations = this.db.savedLocations;
    }
    await this.syncFromSupabase();
    this.db.savedLocations = this.locations;
  }

  private async syncFromSupabase() {
    if (!this.db.supabase?.isConnected) return;
    const client = this.db.supabase.getClient();
    if (!client) return;
    try {
      const { data, error } = await client.from('saved_locations').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        this.locations = data.map((d: any) => {
          const user = this.db.users.find((u) => u.id === d.created_by);
          const isMr = user?.role === 'MR' || (d.created_by && String(d.created_by).includes('mr'));
          const creatorRole: 'ADMIN' | 'MR' = isMr ? 'MR' : (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'ADMIN' : 'MR');
          const creatorName = user ? `${user.name} (${user.id})` : (isMr ? `Field MR (${d.created_by})` : 'System Admin');

          return {
            id: d.id,
            name: d.name,
            clinic: d.name,
            doctor_name: d.contact_person || '',
            qualification: d.category === 'HOSPITAL' ? 'Hospital Facility' : d.category === 'PHARMACY' ? 'Chemist / Pharmacy' : 'Registered Practice',
            specialization: d.category === 'PHARMACY' ? 'Pharmacy Depot' : 'General Practice',
            class: 'A',
            potential_score: 85,
            phone: d.contact_phone || 'N/A',
            address: d.address,
            latitude: Number(d.latitude),
            longitude: Number(d.longitude),
            category: d.category || 'CLINIC',
            created_by: d.created_by || 'usr-admin-01',
            created_by_role: creatorRole,
            created_by_name: creatorName,
            area_name: 'Territory',
            visit_count: 0,
            is_new: false,
            batch_id: d.batch_id || undefined,
            batch_code: d.batch_code || undefined,
            batch_name: d.batch_name || undefined,
            created_at: d.created_at || new Date().toISOString(),
          };
        });
        console.log(`[LocationsService] Loaded ${this.locations.length} live saved locations from data store.`);
      }
    } catch (err: any) {
      console.warn('[LocationsService] Data sync notice:', err?.message);
    }
  }

  private seedDefaultLocations() {
    this.locations = [
      {
        id: 'loc-01',
        name: 'District Hospital Shahdol',
        clinic: 'Shahdol Civil Hospital & Trauma Centre',
        doctor_name: 'Dr. R. K. Mishra',
        qualification: 'Civil Surgeon, MS',
        specialization: 'District Healthcare Centre',
        class: 'A',
        potential_score: 97,
        phone: '+91 7652 240100',
        address: 'Hospital Road, Bicharpur, Shahdol, MP',
        latitude: 23.2953,
        longitude: 81.3586,
        category: 'HOSPITAL',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'Shahdol HQ Territory',
        visit_count: 14,
        is_new: false,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'loc-02',
        name: 'Shree Ram Pharmacy',
        clinic: 'Shree Ram Medicos Shahdol',
        doctor_name: 'Manoj Tiwari',
        qualification: 'Lead Chemist & Distributor',
        specialization: 'Retail Chemist Partner',
        class: 'A',
        potential_score: 92,
        phone: '+91 7652 245678',
        address: 'Main Market, Station Road, Shahdol, MP',
        latitude: 23.3012,
        longitude: 81.3620,
        category: 'PHARMACY',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'Shahdol HQ Territory',
        visit_count: 8,
        is_new: false,
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'loc-03',
        name: 'Ambikapur Civil Hospital',
        clinic: 'Surguja District Hospital & Trauma Centre',
        doctor_name: 'Dr. S. K. Singh',
        qualification: 'Chief Medical Officer',
        specialization: 'Multispecialty Public Healthcare',
        class: 'A',
        potential_score: 95,
        phone: '+91 7774 223400',
        address: 'Hospital Chowk, Ambikapur, Chhattisgarh',
        latitude: 23.1197,
        longitude: 83.1979,
        category: 'HOSPITAL',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'Ambikapur HQ Territory',
        visit_count: 11,
        is_new: false,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'loc-04',
        name: 'Bilaspur Healthcare Centre',
        clinic: 'Bilaspur Central Polyclinic & Diagnostics',
        doctor_name: 'Dr. V. K. Agrawal',
        qualification: 'MD (General Medicine)',
        specialization: 'Internal Medicine & Cardiology',
        class: 'B',
        potential_score: 88,
        phone: '+91 7752 234567',
        address: 'Old Bus Stand Road, Bilaspur, Chhattisgarh',
        latitude: 22.0797,
        longitude: 82.1409,
        category: 'CLINIC',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'Bilaspur HQ Territory',
        visit_count: 6,
        is_new: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'loc-05',
        name: 'Kotma Primary Healthcare Center',
        clinic: 'Kotma Community Health Center',
        doctor_name: 'Dr. N. P. Sharma',
        qualification: 'Medical Officer',
        specialization: 'Community Medicine',
        class: 'B',
        potential_score: 84,
        phone: '+91 7658 221122',
        address: 'Colliery Chowk, Kotma, Anuppur, MP',
        latitude: 23.2035,
        longitude: 81.9669,
        category: 'CLINIC',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'Kotma HQ Territory',
        visit_count: 4,
        is_new: false,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ];
  }

  async getAllLocations(user?: any, query?: { batch_id?: string; mr_id?: string; category?: string }): Promise<SavedLocation[]> {
    if (this.db.supabase?.isConnected) {
      const client = this.db.supabase.getClient();
      if (client) {
        try {
          const { data, error } = await client.from('saved_locations').select('*').order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            this.locations = data.map((d: any) => {
              const creator = this.db.users.find((u) => u.id === d.created_by);
              const isMr = creator?.role === 'MR' || (d.created_by && String(d.created_by).includes('mr'));
              const creatorRole: 'ADMIN' | 'MR' = isMr ? 'MR' : (creator?.role === 'ADMIN' || creator?.role === 'SUPER_ADMIN' ? 'ADMIN' : 'MR');
              const creatorName = creator ? `${creator.name} (${creator.id})` : (isMr ? `Field MR (${d.created_by})` : 'System Admin');

              return {
                id: d.id,
                name: d.name,
                clinic: d.name,
                doctor_name: d.contact_person || '',
                qualification: d.category === 'HOSPITAL' ? 'Hospital Facility' : d.category === 'PHARMACY' ? 'Chemist / Pharmacy' : 'Registered Practice',
                specialization: d.category === 'PHARMACY' ? 'Pharmacy Depot' : 'General Practice',
                class: 'A',
                potential_score: 85,
                phone: d.contact_phone || 'N/A',
                address: d.address,
                latitude: Number(d.latitude),
                longitude: Number(d.longitude),
                category: d.category || 'CLINIC',
                created_by: d.created_by || 'usr-admin-01',
                created_by_role: creatorRole,
                created_by_name: creatorName,
                area_name: 'Territory',
                visit_count: 0,
                is_new: false,
                batch_id: d.batch_id || undefined,
                batch_code: d.batch_code || undefined,
                batch_name: d.batch_name || undefined,
                created_at: d.created_at || new Date().toISOString(),
              };
            });
          }
        } catch {}
      }
    }

    let result = [...this.locations];

    // MR Isolation: If the request is from a Field MR, only display locations they personally marked (§Client Requirement)
    if (user && user.role === 'MR') {
      const mrId = user.id || user.sub;
      result = result.filter((l) => l.created_by === mrId);
    } else if (query?.mr_id && query.mr_id !== 'ALL') {
      result = result.filter((l) => l.created_by === query.mr_id);
    }

    // Filter by route batch if requested
    if (query?.batch_id && query.batch_id !== 'ALL') {
      result = result.filter(
        (l) => l.batch_id === query.batch_id || l.batch_code === query.batch_id,
      );
    }

    // Filter by category if requested
    if (query?.category && query.category !== 'ALL') {
      result = result.filter((l) => l.category === query.category);
    }

    return result;
  }

  async getRecentUnreadLocations(): Promise<SavedLocation[]> {
    return this.locations.filter((loc) => loc.is_new === true);
  }

  async createLocation(dto: CreateLocationDto, authenticatedUser?: any): Promise<SavedLocation> {
    const userFromId = dto.mr_id ? this.db.users.find((u) => u.id === dto.mr_id) : null;
    const creatorUser = authenticatedUser || userFromId;
    const creatorRole: 'ADMIN' | 'MR' =
      creatorUser?.role === 'SUPER_ADMIN' || creatorUser?.role === 'ADMIN'
        ? 'ADMIN'
        : 'MR';

    const creatorId = creatorUser?.id || dto.mr_id || 'usr-mr-02';
    const creatorName = creatorUser
      ? `${creatorUser.name} (${creatorId})`
      : dto.mr_name || (creatorRole === 'MR' ? `Field MR (${creatorId})` : 'System Admin');

    const displayName = dto.doctor_name && dto.doctor_name.trim()
      ? (dto.doctor_name.trim().startsWith('Dr.') ? dto.doctor_name.trim() : `Dr. ${dto.doctor_name.trim()}`)
      : dto.name;

    // Resolve assigned route batch if selected
    let batchId = dto.batch_id;
    let batchCode = dto.batch_code;
    let batchName = dto.batch_name;
    if (batchId) {
      const foundBatch = this.db.routeBatches.find(
        (b) => b.id === batchId || b.batch_code === batchId,
      );
      if (foundBatch) {
        batchId = foundBatch.id;
        batchCode = foundBatch.batch_code;
        batchName = foundBatch.name;
      }
    }

    const newLocation: SavedLocation = {
      id: `loc-${uuidv4().substring(0, 8)}`,
      name: displayName,
      clinic: dto.name,
      doctor_name: dto.doctor_name || '',
      qualification: dto.category === 'HOSPITAL' ? 'Hospital Facility' : dto.category === 'PHARMACY' ? 'Chemist / Pharmacy' : 'Registered Practice',
      specialization: dto.specialization || (dto.category === 'PHARMACY' ? 'Pharmacy Depot' : 'General Practice'),
      class: 'A',
      potential_score: 85,
      phone: dto.phone || 'N/A',
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      category: dto.category || 'CLINIC',
      created_by: creatorId,
      created_by_role: creatorRole,
      created_by_name: creatorName,
      area_name: 'Territory',
      visit_count: 0,
      is_new: creatorRole === 'MR',
      batch_id: batchId,
      batch_code: batchCode,
      batch_name: batchName,
      created_at: new Date().toISOString(),
    };

    this.locations.unshift(newLocation);

    // If assigned to a batch, append this location to the batch's location_ids and route_stops
    if (batchId) {
      const targetBatch = this.db.routeBatches.find(
        (b) => b.id === batchId || b.batch_code === batchId,
      );
      if (targetBatch) {
        if (!targetBatch.location_ids) targetBatch.location_ids = [];
        if (!targetBatch.location_ids.includes(newLocation.id)) {
          targetBatch.location_ids.push(newLocation.id);
        }
        if (!targetBatch.route_stops) targetBatch.route_stops = [];
        if (!targetBatch.route_stops.includes(newLocation.clinic || newLocation.name)) {
          targetBatch.route_stops.push(newLocation.clinic || newLocation.name);
        }
      }
    }

    // Sync to Supabase saved_locations table
    if (this.db.supabase?.isConnected) {
      const client = this.db.supabase.getClient();
      if (client) {
        try {
          await client.from('saved_locations').upsert({
            id: newLocation.id,
            name: newLocation.clinic || newLocation.name,
            address: newLocation.address || '',
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            geofence_radius_m: 50,
            category: newLocation.category,
            contact_person: newLocation.doctor_name || '',
            contact_phone: newLocation.phone || '',
            created_by: creatorId,
            batch_id: batchId,
            batch_code: batchCode,
            batch_name: batchName,
            created_at: newLocation.created_at,
            updated_at: newLocation.created_at,
          });
        } catch (sbErr: any) {
          console.warn('[LocationsService] Failed to insert into Supabase:', sbErr?.message);
        }
      }
    }

    // Also register in DatabaseService doctors list
    this.db.doctors.unshift({
      id: newLocation.id,
      name: newLocation.name,
      qualification: newLocation.qualification,
      specialization: newLocation.specialization,
      class: newLocation.class,
      potential_score: newLocation.potential_score,
      phone: newLocation.phone,
      clinic: newLocation.clinic,
      address: newLocation.address,
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
      area_id: dto.area_id || 'area-shd-07',
      created_by: creatorId,
      created_by_role: creatorRole,
      created_by_name: creatorName,
      category: newLocation.category,
      created_at: newLocation.created_at,
    });

    if (creatorRole === 'MR') {
      this.db.notifications.unshift({
        id: uuidv4(),
        user_id: 'usr-admin-01',
        title: 'New Location Marked by MR',
        body: `${creatorName} marked new ${newLocation.category.toLowerCase()}: ${newLocation.clinic} at ${newLocation.address}${batchName ? ` (Batch: ${batchName})` : ''}`,
        type: 'INFO',
        data_json: {
          location_id: newLocation.id,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          category: newLocation.category,
          batch_name: batchName,
          mr_name: creatorName,
        },
        created_at: newLocation.created_at,
      });
    }

    this.db.persistToDisk();
    return newLocation;
  }

  async acknowledgeLocation(id: string): Promise<SavedLocation> {
    const loc = this.locations.find((l) => l.id === id);
    if (!loc) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    loc.is_new = false;
    return loc;
  }

  async updateLocation(id: string, dto: Partial<CreateLocationDto>): Promise<SavedLocation> {
    const loc = this.locations.find((l) => l.id === id);
    if (!loc) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    if (dto.name !== undefined) loc.name = dto.name;
    if (dto.clinic !== undefined) loc.clinic = dto.clinic;
    if (dto.doctor_name !== undefined) loc.doctor_name = dto.doctor_name;
    if (dto.qualification !== undefined) loc.qualification = dto.qualification;
    if (dto.specialization !== undefined) loc.specialization = dto.specialization;
    if (dto.phone !== undefined) loc.phone = dto.phone;
    if (dto.address !== undefined) loc.address = dto.address;
    if (dto.category !== undefined) loc.category = dto.category;
    if (dto.latitude !== undefined) loc.latitude = dto.latitude;
    if (dto.longitude !== undefined) loc.longitude = dto.longitude;
    if (dto.class !== undefined) loc.class = dto.class as any;

    if (dto.batch_id !== undefined) {
      loc.batch_id = dto.batch_id;
      const foundBatch = this.db.routeBatches.find(
        (b) => b.id === dto.batch_id || b.batch_code === dto.batch_id,
      );
      if (foundBatch) {
        loc.batch_code = foundBatch.batch_code;
        loc.batch_name = foundBatch.name;
        if (!foundBatch.location_ids) foundBatch.location_ids = [];
        if (!foundBatch.location_ids.includes(loc.id)) {
          foundBatch.location_ids.push(loc.id);
        }
      } else {
        loc.batch_code = dto.batch_code;
        loc.batch_name = dto.batch_name;
      }
    }

    // Sync to Supabase
    if (this.db.supabase?.isConnected) {
      const client = this.db.supabase.getClient();
      if (client) {
        try {
          await client.from('saved_locations').update({
            name: loc.clinic || loc.name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
            category: loc.category,
            contact_person: loc.doctor_name,
            contact_phone: loc.phone,
            batch_id: loc.batch_id,
            batch_code: loc.batch_code,
            batch_name: loc.batch_name,
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        } catch (sbErr: any) {
          console.warn('[LocationsService] Failed to update in Supabase:', sbErr?.message);
        }
      }
    }

    const doc = this.db.doctors.find((d) => d.id === id);
    if (doc) {
      if (dto.name !== undefined) doc.name = dto.name;
      if (dto.clinic !== undefined) doc.clinic = dto.clinic;
      if (dto.qualification !== undefined) doc.qualification = dto.qualification;
      if (dto.specialization !== undefined) doc.specialization = dto.specialization;
      if (dto.phone !== undefined) doc.phone = dto.phone;
      if (dto.address !== undefined) doc.address = dto.address;
      if (dto.category !== undefined) doc.category = dto.category;
      if (dto.latitude !== undefined) doc.latitude = dto.latitude;
      if (dto.longitude !== undefined) doc.longitude = dto.longitude;
      if (dto.class !== undefined) doc.class = dto.class as any;
    }

    this.db.persistToDisk();
    return loc;
  }

  async deleteLocation(id: string): Promise<{ success: boolean; message: string; id: string }> {
    const locIndex = this.locations.findIndex((l) => l.id === id);
    if (locIndex !== -1) {
      this.locations.splice(locIndex, 1);
    }

    const docIndex = this.db.doctors.findIndex((d) => d.id === id);
    if (docIndex !== -1) {
      this.db.doctors.splice(docIndex, 1);
    }

    // Delete directly from Supabase saved_locations table
    if (this.db.supabase?.isConnected) {
      const client = this.db.supabase.getClient();
      if (client) {
        try {
          const { error } = await client.from('saved_locations').delete().eq('id', id);
          if (error) {
            console.warn(`[LocationsService] Supabase delete error for ${id}:`, error.message);
          } else {
            console.log(`[LocationsService] Deleted location ${id} from Supabase.`);
          }
        } catch (sbErr: any) {
          console.warn('[LocationsService] Supabase delete exception:', sbErr?.message);
        }
      }
    }

    this.db.persistToDisk();
    return { success: true, message: `Location ${id} deleted successfully`, id };
  }

  async acknowledgeAllLocations(): Promise<{ acknowledged: number }> {
    let count = 0;
    this.locations.forEach((loc) => {
      if (loc.is_new) {
        loc.is_new = false;
        count++;
      }
    });
    return { acknowledged: count };
  }
}

