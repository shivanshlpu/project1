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
        name: 'Dr. Rajesh Sharma',
        clinic: 'Apex Heart Centre',
        doctor_name: 'Dr. Rajesh Sharma',
        qualification: 'MD, DM (Cardiology)',
        specialization: 'Cardiologist',
        class: 'A',
        potential_score: 95,
        phone: '+91 98111 22233',
        address: 'Ring Road, Saket, South Delhi',
        latitude: 28.5245,
        longitude: 77.2066,
        category: 'CLINIC',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'South Delhi (Saket)',
        visit_count: 14,
        is_new: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'loc-02',
        name: 'Dr. Priya Verma',
        clinic: 'Little Care Clinic',
        doctor_name: 'Dr. Priya Verma',
        qualification: 'MBBS, DNB (Paediatrics)',
        specialization: 'Paediatrician',
        class: 'B',
        potential_score: 82,
        phone: '+91 98111 44455',
        address: 'Green Park Extension, New Delhi',
        latitude: 28.5585,
        longitude: 77.2028,
        category: 'CLINIC',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'South Delhi (Green Park)',
        visit_count: 9,
        is_new: false,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'loc-03',
        name: 'Max Super Specialty Hospital',
        clinic: 'Max Super Specialty Hospital Saket',
        doctor_name: '',
        qualification: 'Multi-Specialty Facility',
        specialization: 'Cardiology & Oncology Hub',
        class: 'A',
        potential_score: 98,
        phone: '+91 98111 99988',
        address: '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
        latitude: 28.5282,
        longitude: 77.2124,
        category: 'HOSPITAL',
        created_by: 'usr-mr-01',
        created_by_role: 'MR',
        created_by_name: 'Rahul Sharma (Field MR)',
        area_name: 'South Delhi',
        visit_count: 5,
        is_new: false,
        created_at: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        id: 'loc-04',
        name: 'Apollo Pharmacy Retail Depot',
        clinic: 'Apollo Pharmacy Green Park',
        doctor_name: '',
        qualification: 'Retail & Stockist Partner',
        specialization: 'High-Volume Pharmacy',
        class: 'B',
        potential_score: 88,
        phone: '+91 98777 11223',
        address: 'Main Market, Green Park, New Delhi',
        latitude: 28.5598,
        longitude: 77.2045,
        category: 'PHARMACY',
        created_by: 'usr-mr-01',
        created_by_role: 'MR',
        created_by_name: 'Rahul Sharma (Field MR)',
        area_name: 'South Delhi (Green Park)',
        visit_count: 3,
        is_new: false,
        created_at: new Date(Date.now() - 21600000).toISOString(),
      },
      {
        id: 'loc-05',
        name: 'Dr. Anita Desai',
        clinic: 'Skin Care & Laser Centre',
        doctor_name: 'Dr. Anita Desai',
        qualification: 'MD (Dermatology)',
        specialization: 'Dermatologist',
        class: 'A',
        potential_score: 91,
        phone: '+91 98222 33445',
        address: 'Hauz Khas Market, New Delhi',
        latitude: 28.5494,
        longitude: 77.2001,
        category: 'CLINIC',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'Central Delhi (Hauz Khas)',
        visit_count: 7,
        is_new: false,
        created_at: new Date(Date.now() - 18000000).toISOString(),
      },
      {
        id: 'loc-06',
        name: 'Batra Medicos & Chemists',
        clinic: 'Batra Medicos Saket',
        doctor_name: 'Ramesh Batra',
        qualification: 'B.Pharm, Registered Chemist',
        specialization: 'Chemist & Surgical Partner',
        class: 'B',
        potential_score: 84,
        phone: '+91 98112 55667',
        address: 'Pramod Mahajan Marg, Saket, New Delhi',
        latitude: 28.5251,
        longitude: 77.2058,
        category: 'PHARMACY',
        created_by: 'usr-mr-01',
        created_by_role: 'MR',
        created_by_name: 'Rahul Sharma (Field MR)',
        area_name: 'South Delhi (Saket)',
        visit_count: 4,
        is_new: false,
        created_at: new Date(Date.now() - 14000000).toISOString(),
      },
      {
        id: 'loc-07',
        name: 'Dr. Sameer Kapoor',
        clinic: 'Kapoor Health Clinic',
        doctor_name: 'Dr. Sameer Kapoor',
        qualification: 'MBBS, MD (Medicine)',
        specialization: 'General Physician',
        class: 'B',
        potential_score: 86,
        phone: '+91 98444 66778',
        address: 'Malviya Nagar Main Road, New Delhi',
        latitude: 28.5300,
        longitude: 77.2150,
        category: 'CLINIC',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'South Delhi (Malviya Nagar)',
        visit_count: 6,
        is_new: false,
        created_at: new Date(Date.now() - 10000000).toISOString(),
      },
      {
        id: 'loc-08',
        name: 'AIIMS Central OPD Dispensary',
        clinic: 'AIIMS OPD Block',
        doctor_name: 'Dr. V. N. Rao',
        qualification: 'Government Medical Complex',
        specialization: 'Government Medical Complex',
        class: 'A',
        potential_score: 99,
        phone: '+91 11 2658 8500',
        address: 'Ansari Nagar East, New Delhi',
        latitude: 28.5672,
        longitude: 77.2100,
        category: 'HOSPITAL',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'North Delhi (AIIMS)',
        visit_count: 18,
        is_new: false,
        created_at: new Date(Date.now() - 8000000).toISOString(),
      },
      {
        id: 'loc-09',
        name: 'Dr. Neha Malhotra',
        clinic: 'Hauz Khas Diagnostics',
        doctor_name: 'Dr. Neha Malhotra',
        qualification: 'MD (Radiology)',
        specialization: 'Radiology & Blood Lab',
        class: 'B',
        potential_score: 83,
        phone: '+91 98999 44332',
        address: 'Aurobindo Marg, Hauz Khas, New Delhi',
        latitude: 28.5480,
        longitude: 77.2030,
        category: 'OFFICE',
        created_by: 'usr-admin-01',
        created_by_role: 'ADMIN',
        created_by_name: 'System Admin (Owner)',
        area_name: 'Central Delhi (Hauz Khas)',
        visit_count: 5,
        is_new: false,
        created_at: new Date(Date.now() - 6000000).toISOString(),
      },
      {
        id: 'loc-10',
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
        created_by: 'usr-mr-01',
        created_by_role: 'MR',
        created_by_name: 'Rahul Sharma (Field MR)',
        area_name: 'Shahdol District',
        visit_count: 12,
        is_new: false,
        created_at: new Date(Date.now() - 4000000).toISOString(),
      },
      {
        id: 'loc-11',
        name: 'Shree Ram Pharmacy',
        clinic: 'Shree Ram Medicos Shahdol',
        doctor_name: 'Manoj Tiwari',
        qualification: 'Lead Chemist & Distributor',
        specialization: 'Retail Chemist Partner',
        class: 'B',
        potential_score: 89,
        phone: '+91 7652 245678',
        address: 'Main Market, Station Road, Shahdol, MP',
        latitude: 23.3012,
        longitude: 81.3620,
        category: 'PHARMACY',
        created_by: 'usr-mr-01',
        created_by_role: 'MR',
        created_by_name: 'Rahul Sharma (Field MR)',
        area_name: 'Shahdol District',
        visit_count: 8,
        is_new: false,
        created_at: new Date(Date.now() - 2000000).toISOString(),
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

