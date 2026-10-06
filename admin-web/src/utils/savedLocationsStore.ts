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
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'Shahdol HQ Territory',
    visit_count: 14,
    is_new: false,
  },
  {
    id: 'loc-02',
    name: 'Shree Ram Pharmacy',
    clinic: 'Shree Ram Medicos Shahdol',
    qualification: 'Lead Chemist & Distributor',
    specialization: 'Retail Chemist Partner',
    class: 'A',
    potential_score: 92,
    phone: '+91 7652 245678',
    address: 'Main Market, Station Road, Shahdol, MP',
    latitude: 23.3012,
    longitude: 81.3620,
    category: 'PHARMACY',
    created_by_role: 'MR',
    created_by_name: 'Rahul Sharma (Field MR)',
    area_name: 'Shahdol HQ Territory',
    visit_count: 8,
    is_new: false,
  },
  {
    id: 'loc-03',
    name: 'Ambikapur Civil Hospital',
    clinic: 'Surguja District Hospital & Trauma Centre',
    qualification: 'Chief Medical Officer',
    specialization: 'Multispecialty Public Healthcare',
    class: 'A',
    potential_score: 95,
    phone: '+91 7774 223400',
    address: 'Hospital Chowk, Ambikapur, Chhattisgarh',
    latitude: 23.1197,
    longitude: 83.1979,
    category: 'HOSPITAL',
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'Ambikapur HQ Territory',
    visit_count: 11,
    is_new: false,
  },
  {
    id: 'loc-04',
    name: 'Bilaspur Healthcare Centre',
    clinic: 'Bilaspur Central Polyclinic & Diagnostics',
    qualification: 'MD (General Medicine)',
    specialization: 'Internal Medicine & Cardiology',
    class: 'B',
    potential_score: 88,
    phone: '+91 7752 234567',
    address: 'Old Bus Stand Road, Bilaspur, Chhattisgarh',
    latitude: 22.0797,
    longitude: 82.1409,
    category: 'CLINIC',
    created_by_role: 'MR',
    created_by_name: 'Pooja Verma (Field MR)',
    area_name: 'Bilaspur HQ Territory',
    visit_count: 6,
    is_new: false,
  },
  {
    id: 'loc-05',
    name: 'Kotma Primary Healthcare Center',
    clinic: 'Kotma Community Health Center',
    qualification: 'Medical Officer',
    specialization: 'Community Medicine',
    class: 'B',
    potential_score: 84,
    phone: '+91 7658 241234',
    address: 'Main Market, Kotma Town, Anuppur, MP',
    latitude: 23.2035,
    longitude: 81.9669,
    category: 'HOSPITAL',
    created_by_role: 'MR',
    created_by_name: 'Vikram Malhotra (Field MR)',
    area_name: 'Kotma HQ Territory',
    visit_count: 5,
    is_new: false,
  },
];

export const DEFAULT_TERRITORY_ZONES: TerritoryZone[] = [
  {
    id: 'zone-hq-shahdol',
    name: 'Shahdol HQ',
    code: 'HQ-SHD',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Rahul Sharma',
    assignedMrId: 'usr-mr-01',
    latitude: 23.2953,
    longitude: 81.3586,
    radiusKm: 25.0,
    color: '#1A3C6E',
    description: 'Covering: Burhar, Gohparu, Beohari, Jaisinghnagar, Sohagpur, Singhpur, Amdih, Janakpur Road, Dhanpuri, Amlai, Bakaho',
  },
  {
    id: 'zone-hq-ambikapur',
    name: 'Ambikapur HQ',
    code: 'HQ-AMB',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Pooja Verma',
    assignedMrId: 'usr-mr-03',
    latitude: 23.1197,
    longitude: 83.1979,
    radiusKm: 30.0,
    color: '#0891B2',
    description: 'Covering: Sitapur, Lundra, Batoli, Mainpat, Udaipur, Lakhanpur, Surguja, Ramanujganj',
  },
  {
    id: 'zone-hq-bilaspur',
    name: 'Bilaspur HQ',
    code: 'HQ-BSP',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Vikram Malhotra',
    assignedMrId: 'usr-mr-02',
    latitude: 22.0797,
    longitude: 82.1409,
    radiusKm: 25.0,
    color: '#4F46E5',
    description: 'Covering: Kota, Takhatpur, Masturi, Bilha, Ratanpur, Bodri, Sakri, Bilaspur City',
  },
  {
    id: 'zone-hq-kotma',
    name: 'Kotma HQ',
    code: 'HQ-KTM',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Rahul Sharma',
    assignedMrId: 'usr-mr-01',
    latitude: 23.2035,
    longitude: 81.9669,
    radiusKm: 20.0,
    color: '#059669',
    description: 'Covering: Kotma Town, Anuppur, Jaithari, Bijuri, Rajendragram, Bhalumuda',
  },
];

export function getOperatingZones(): TerritoryZone[] {
  try {
    // Dynamically derive operating zones from Headquarters & Sub-Areas configured in Settings
    const rawHqs = localStorage.getItem('ahtri_inventory_hqs');
    const hqs = rawHqs ? JSON.parse(rawHqs) : null;

    const rawAreas = localStorage.getItem('ahtri_hq_subareas');
    const areas = rawAreas ? JSON.parse(rawAreas) : null;

    const effectiveHqs = Array.isArray(hqs) && hqs.length > 0 ? hqs : [
      { id: 'hq-shahdol', name: 'Shahdol', code: 'HQ-SHD', state: 'Madhya Pradesh', status: 'ACTIVE' },
      { id: 'hq-ambikapur', name: 'Ambikapur', code: 'HQ-AMB', state: 'Chhattisgarh', status: 'ACTIVE' },
      { id: 'hq-bilaspur', name: 'Bilaspur', code: 'HQ-BSP', state: 'Chhattisgarh', status: 'ACTIVE' },
      { id: 'hq-kotma', name: 'Kotma', code: 'HQ-KTM', state: 'Madhya Pradesh', status: 'ACTIVE' },
    ];

    const hqCoordMap: Record<string, { lat: number; lng: number }> = {
      'hq-shahdol': { lat: 23.2953, lng: 81.3586 },
      'hq-ambikapur': { lat: 23.1197, lng: 83.1979 },
      'hq-bilaspur': { lat: 22.0797, lng: 82.1409 },
      'hq-kotma': { lat: 23.2035, lng: 81.9669 },
    };

    const colors = ['#1A3C6E', '#0891B2', '#4F46E5', '#059669', '#D97706'];

    return effectiveHqs.map((hq: any, idx: number) => {
      const hqId = hq.id;
      const subAreas = Array.isArray(areas)
        ? areas.filter((a: any) => a.hq_id === hqId && a.status !== 'INACTIVE')
        : [];
      const regionNames = subAreas.map((a: any) => a.name).join(', ');
      const coords = hqCoordMap[hqId] || { lat: 23.2953 + idx * 0.25, lng: 81.3586 + idx * 0.35 };

      return {
        id: `zone-${hqId}`,
        name: `${hq.name} HQ`,
        code: hq.code || `HQ-${hq.name.slice(0, 3).toUpperCase()}`,
        branchType: 'HEADQUARTERS' as const,
        assignedMr: idx % 2 === 0 ? 'Rahul Sharma' : 'Pooja Verma',
        assignedMrId: idx % 2 === 0 ? 'usr-mr-01' : 'usr-mr-03',
        latitude: coords.lat,
        longitude: coords.lng,
        radiusKm: 25.0,
        color: colors[idx % colors.length],
        description: regionNames
          ? `Covering Regions: ${regionNames}`
          : `${hq.name}, ${hq.state || 'Operational'} Territory`,
      };
    });
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
