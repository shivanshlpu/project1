import { DoctorItem } from '../types';

export interface TerritoryZone {
  id: string;
  name: string;
  code: string;
  branchType: 'HEADQUARTERS' | 'SUB_CITY_BRANCH' | 'REGIONAL_HUB' | 'ZONAL_DEPOT';
  assignedMr: string;
  assignedMrId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  color: string;
  description: string;
}

export const INITIAL_SAVED_LOCATIONS: DoctorItem[] = [
  {
    id: 'loc-01',
    name: 'Dr. Rajesh Sharma',
    clinic: 'Apex Heart Centre',
    qualification: 'MD, DM (Cardiology)',
    specialization: 'Cardiologist',
    class: 'A',
    potential_score: 95,
    phone: '+91 98111 22233',
    address: 'Ring Road, Saket, South Delhi',
    latitude: 28.5245,
    longitude: 77.2066,
    category: 'CLINIC',
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'South Delhi (Saket)',
    visit_count: 14,
    is_new: false,
  },
  {
    id: 'loc-02',
    name: 'Dr. Priya Verma',
    clinic: 'Little Care Clinic',
    qualification: 'MBBS, DNB (Paediatrics)',
    specialization: 'Paediatrician',
    class: 'B',
    potential_score: 82,
    phone: '+91 98111 44455',
    address: 'Green Park Extension, New Delhi',
    latitude: 28.5585,
    longitude: 77.2028,
    category: 'CLINIC',
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'North Delhi (Green Park)',
    visit_count: 9,
    is_new: false,
  },
  {
    id: 'loc-03',
    name: 'Max Super Specialty Hospital',
    clinic: 'Max Super Specialty Hospital Saket',
    qualification: 'Multi-Specialty Facility',
    specialization: 'Cardiology & Oncology Hub',
    class: 'A',
    potential_score: 98,
    phone: '+91 98111 99988',
    address: '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
    latitude: 28.5282,
    longitude: 77.2124,
    category: 'HOSPITAL',
    created_by_role: 'MR',
    created_by_name: 'Rahul Sharma (Field MR)',
    area_name: 'South Delhi (Saket)',
    visit_count: 5,
    is_new: false,
  },
  {
    id: 'loc-04',
    name: 'Apollo Pharmacy Retail Depot',
    clinic: 'Apollo Pharmacy Green Park',
    qualification: 'Retail & Stockist Partner',
    specialization: 'High-Volume Pharmacy',
    class: 'B',
    potential_score: 88,
    phone: '+91 98777 11223',
    address: 'Main Market, Green Park, New Delhi',
    latitude: 28.5598,
    longitude: 77.2045,
    category: 'PHARMACY',
    created_by_role: 'MR',
    created_by_name: 'Rahul Sharma (Field MR)',
    area_name: 'North Delhi (Green Park)',
    visit_count: 3,
    is_new: false,
  },
  {
    id: 'loc-05',
    name: 'Dr. Anita Desai',
    clinic: 'Skin Care & Laser Centre',
    qualification: 'MD (Dermatology)',
    specialization: 'Dermatologist',
    class: 'A',
    potential_score: 91,
    phone: '+91 98222 33445',
    address: 'Hauz Khas Market, New Delhi',
    latitude: 28.5494,
    longitude: 77.2001,
    category: 'CLINIC',
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'Central Delhi (Hauz Khas)',
    visit_count: 7,
    is_new: false,
  },
  {
    id: 'loc-06',
    name: 'Batra Medicos & Chemists',
    clinic: 'Batra Medicos Saket',
    qualification: 'B.Pharm, Registered Chemist',
    specialization: 'Chemist & Surgical Partner',
    class: 'B',
    potential_score: 84,
    phone: '+91 98112 55667',
    address: 'Pramod Mahajan Marg, Saket, New Delhi',
    latitude: 28.5251,
    longitude: 77.2058,
    category: 'PHARMACY',
    created_by_role: 'MR',
    created_by_name: 'Rahul Sharma (Field MR)',
    area_name: 'South Delhi (Saket)',
    visit_count: 4,
    is_new: false,
  },
  {
    id: 'loc-07',
    name: 'Dr. Sameer Kapoor',
    clinic: 'Kapoor Health Clinic',
    qualification: 'MBBS, MD (Medicine)',
    specialization: 'General Physician',
    class: 'B',
    potential_score: 86,
    phone: '+91 98444 66778',
    address: 'Malviya Nagar Main Road, New Delhi',
    latitude: 28.5300,
    longitude: 77.2150,
    category: 'CLINIC',
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'South Delhi (Malviya Nagar)',
    visit_count: 6,
    is_new: false,
  },
  {
    id: 'loc-08',
    name: 'AIIMS Central OPD Dispensary',
    clinic: 'AIIMS OPD Block',
    qualification: 'Government Medical Complex',
    specialization: 'Government Medical Complex',
    class: 'A',
    potential_score: 99,
    phone: '+91 11 2658 8500',
    address: 'Ansari Nagar East, New Delhi',
    latitude: 28.5672,
    longitude: 77.2100,
    category: 'HOSPITAL',
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'North Delhi (AIIMS)',
    visit_count: 18,
    is_new: false,
  },
  {
    id: 'loc-09',
    name: 'Dr. Neha Malhotra',
    clinic: 'Hauz Khas Diagnostics',
    qualification: 'MD (Radiology)',
    specialization: 'Radiology & Blood Lab',
    class: 'B',
    potential_score: 83,
    phone: '+91 98999 44332',
    address: 'Aurobindo Marg, Hauz Khas, New Delhi',
    latitude: 28.5480,
    longitude: 77.2030,
    category: 'OFFICE',
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'Central Delhi (Hauz Khas)',
    visit_count: 5,
    is_new: false,
  },
  {
    id: 'loc-10',
    name: 'District Hospital Shahdol',
    clinic: 'Shahdol Civil Hospital & Trauma Centre',
    qualification: 'Civil Surgeon, MS',
    specialization: 'District Healthcare Centre',
    class: 'A',
    potential_score: 97,
    phone: '+91 7652 240100',
    address: 'Hospital Road, Bicharpur, Shahdol, MP',
    latitude: 23.2953,
    longitude: 81.3586,
    category: 'HOSPITAL',
    created_by_role: 'MR',
    created_by_name: 'Rahul Sharma (Field MR)',
    area_name: 'Shahdol District',
    visit_count: 12,
    is_new: false,
  },
  {
    id: 'loc-11',
    name: 'Shree Ram Pharmacy',
    clinic: 'Shree Ram Medicos Shahdol',
    qualification: 'Lead Chemist & Distributor',
    specialization: 'Retail Chemist Partner',
    class: 'B',
    potential_score: 89,
    phone: '+91 7652 245678',
    address: 'Main Market, Station Road, Shahdol, MP',
    latitude: 23.3012,
    longitude: 81.3620,
    category: 'PHARMACY',
    created_by_role: 'MR',
    created_by_name: 'Rahul Sharma (Field MR)',
    area_name: 'Shahdol District',
    visit_count: 8,
    is_new: false,
  },
];

export const DEFAULT_TERRITORY_ZONES: TerritoryZone[] = [
  {
    id: 'zone-south-delhi',
    name: 'South Delhi Zone (Saket Hub)',
    code: 'ZONE-DEL-01',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Rahul Sharma',
    assignedMrId: 'usr-mr-01',
    latitude: 28.5245,
    longitude: 77.2066,
    radiusKm: 5.5,
    color: '#1A3C6E',
    description: 'HQ territory covering Saket, Press Enclave, Anupam Cinema, and Malviya Nagar clinics',
  },
  {
    id: 'zone-central-delhi',
    name: 'Central Delhi Zone (Hauz Khas)',
    code: 'ZONE-DEL-02',
    branchType: 'SUB_CITY_BRANCH',
    assignedMr: 'Vikram Malhotra',
    assignedMrId: 'usr-mr-02',
    latitude: 28.5494,
    longitude: 77.2001,
    radiusKm: 4.5,
    color: '#0891B2',
    description: 'Sub-city branch covering Hauz Khas market, dermatologist centres, and South Ext',
  },
  {
    id: 'zone-north-delhi',
    name: 'North Delhi Zone (Green Park & AIIMS)',
    code: 'ZONE-DEL-03',
    branchType: 'REGIONAL_HUB',
    assignedMr: 'Pooja Verma',
    assignedMrId: 'usr-mr-03',
    latitude: 28.5672,
    longitude: 77.2100,
    radiusKm: 4.5,
    color: '#4F46E5',
    description: 'Regional Hub covering Green Park pediatric clinics, AIIMS OPD, and stockist partners',
  },
  {
    id: 'zone-shahdol',
    name: 'Shahdol Zonal Branch',
    code: 'ZONE-MP-04',
    branchType: 'ZONAL_DEPOT',
    assignedMr: 'Rahul Sharma',
    assignedMrId: 'usr-mr-01',
    latitude: 23.2953,
    longitude: 81.3586,
    radiusKm: 8.0,
    color: '#059669',
    description: 'Zonal Depot & Point-of-Care distribution network in Shahdol, MP',
  },
];

export function getOperatingZones(): TerritoryZone[] {
  try {
    const savedCities = localStorage.getItem('ahtri_operating_cities');
    if (savedCities) {
      const parsed = JSON.parse(savedCities);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any, idx: number) => ({
          id: `zone-${c.id}`,
          name: `${c.cityName} Zone`,
          code: `ZONE-${c.cityName.slice(0, 3).toUpperCase()}-${String(idx + 1).padStart(2, '0')}`,
          branchType: c.branchType || (c.isHeadquarters ? 'HEADQUARTERS' : 'SUB_CITY_BRANCH'),
          assignedMr: idx % 2 === 0 ? 'Rahul Sharma' : idx % 3 === 0 ? 'Vikram Malhotra' : 'Pooja Verma',
          assignedMrId: idx % 2 === 0 ? 'usr-mr-01' : idx % 3 === 0 ? 'usr-mr-02' : 'usr-mr-03',
          latitude: c.latitude,
          longitude: c.longitude,
          radiusKm: c.radiusKm || 5,
          color:
            c.isHeadquarters || c.branchType === 'HEADQUARTERS'
              ? '#1A3C6E'
              : c.branchType === 'REGIONAL_HUB'
              ? '#4F46E5'
              : c.branchType === 'ZONAL_DEPOT'
              ? '#059669'
              : '#0891B2',
          description: `${c.state}, ${c.country} territory`,
        }));
      }
    }
  } catch {}
  return DEFAULT_TERRITORY_ZONES;
}

export function getStoredSavedLocations(): DoctorItem[] {
  try {
    const raw = localStorage.getItem('ahtri_saved_locations');
    if (raw !== null) {
      const parsed: DoctorItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_SAVED_LOCATIONS;
}

export function persistSavedLocations(locs: DoctorItem[]) {
  try {
    localStorage.setItem('ahtri_saved_locations', JSON.stringify(locs));
    window.dispatchEvent(new CustomEvent('ahtri_locations_updated', { detail: locs }));
  } catch {}
}

export function deleteSavedLocation(id: string): DoctorItem[] {
  const current = getStoredSavedLocations();
  const filtered = current.filter((l) => l.id !== id);
  persistSavedLocations(filtered);
  return filtered;
}

export function updateSavedLocation(id: string, updates: Partial<DoctorItem>): DoctorItem[] {
  const current = getStoredSavedLocations();
  const updated = current.map((l) => (l.id === id ? { ...l, ...updates } : l));
  persistSavedLocations(updated);
  return updated;
}

export async function syncSavedLocationsWithBackend(): Promise<DoctorItem[]> {
  try {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/locations`);
    if (res.ok) {
      const data: DoctorItem[] = await res.json();
      if (Array.isArray(data)) {
        persistSavedLocations(data);
        return data;
      }
    }
  } catch {}
  return getStoredSavedLocations();
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
