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
  created_at: string;
}

@Injectable()
export class LocationsService implements OnModuleInit {
  private locations: SavedLocation[] = [];

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    this.seedDefaultLocations();
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
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }

  async getAllLocations(): Promise<SavedLocation[]> {
    return this.locations;
  }

  async getRecentUnreadLocations(): Promise<SavedLocation[]> {
    return this.locations.filter((loc) => loc.is_new === true);
  }

  async createLocation(dto: CreateLocationDto, authenticatedUser?: any): Promise<SavedLocation> {
    const creatorRole = authenticatedUser?.role === 'SUPER_ADMIN' || authenticatedUser?.role === 'ADMIN'
      ? 'ADMIN'
      : 'MR';

    const creatorName = authenticatedUser?.name
      || dto.mr_name
      || (creatorRole === 'MR' ? 'Rahul Sharma (Field MR)' : 'System Admin (Owner)');

    const creatorId = authenticatedUser?.id || dto.mr_id || 'usr-mr-01';

    const displayName = dto.doctor_name && dto.doctor_name.trim()
      ? (dto.doctor_name.trim().startsWith('Dr.') ? dto.doctor_name.trim() : `Dr. ${dto.doctor_name.trim()}`)
      : dto.name;

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
      area_name: 'South Delhi Territory',
      visit_count: 0,
      is_new: creatorRole === 'MR', // Only MR field discoveries trigger owner alerts; admin assignments/marks do not popup on dashboard
      created_at: new Date().toISOString(),
    };

    this.locations.unshift(newLocation);

    // Also register in DatabaseService doctors list so other modules can access it
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
      area_id: dto.area_id || 'area-sdelhi-1',
      created_by: creatorId,
      created_by_role: creatorRole,
      created_by_name: creatorName,
      category: newLocation.category,
      created_at: newLocation.created_at,
    });

    // Create a central notification record for owner only when an MR discovers a facility
    if (creatorRole === 'MR') {
      this.db.notifications.unshift({
        id: uuidv4(),
        user_id: 'usr-admin-01',
        title: 'New Location Marked by MR',
        body: `${creatorName} marked new ${newLocation.category.toLowerCase()}: ${newLocation.clinic} at ${newLocation.address}`,
        type: 'INFO',
        data_json: {
          location_id: newLocation.id,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          category: newLocation.category,
          mr_name: creatorName,
        },
        created_at: newLocation.created_at,
      });
    }

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

    // Sync with DatabaseService doctors list
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

    return loc;
  }

  async deleteLocation(id: string): Promise<{ success: boolean; message: string; id: string }> {
    const locIndex = this.locations.findIndex((l) => l.id === id);
    if (locIndex === -1) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    this.locations.splice(locIndex, 1);

    const docIndex = this.db.doctors.findIndex((d) => d.id === id);
    if (docIndex !== -1) {
      this.db.doctors.splice(docIndex, 1);
    }

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

