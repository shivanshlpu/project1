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

export const INITIAL_SAVED_LOCATIONS: DoctorItem[] = [];

export const DEFAULT_TERRITORY_ZONES: TerritoryZone[] = [
  {
    id: 'zone-hq-kotma',
    name: 'Kotma HQ',
    code: 'KOT',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Amar Dwivedi',
    assignedMrId: 'usr-mr-01',
    latitude: 23.2035,
    longitude: 81.9669,
    radiusKm: 20.0,
    color: '#059669',
    description: 'Covering: Kotma Town, Anuppur, Jaithari, Bijuri, Rajendragram, Bhalumuda',
  },
  {
    id: 'zone-hq-shahdol',
    name: 'Shahdol HQ',
    code: 'SHD',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Aman Rathore',
    assignedMrId: 'usr-mr-02',
    latitude: 23.2953,
    longitude: 81.3586,
    radiusKm: 25.0,
    color: '#1A3C6E',
    description: 'Covering: Burhar, Gohparu, Beohari, Jaisinghnagar, Sohagpur, Singhpur, Amdih, Janakpur Road, Dhanpuri, Amlai, Bakaho',
  },
  {
    id: 'zone-hq-ambikapur',
    name: 'Ambikapur HQ',
    code: 'AMB',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Ashish Soni',
    assignedMrId: 'usr-mr-03',
    latitude: 23.1197,
    longitude: 83.1979,
    radiusKm: 30.0,
    color: '#0891B2',
    description: 'Covering: Sitapur, Lundra, Batoli, Mainpat, Udaipur, Lakhanpur, Surguja, Ramanujganj',
  },
];

export function getOperatingZones(): TerritoryZone[] {
  try {
    const rawHqs = localStorage.getItem('ahtri_inventory_hqs');
    const hqs = rawHqs ? JSON.parse(rawHqs) : null;

    const rawAreas = localStorage.getItem('ahtri_hq_subareas');
    const areas = rawAreas ? JSON.parse(rawAreas) : null;

    const filteredHqs = Array.isArray(hqs)
      ? hqs.filter((h: any) => {
          const name = (h.name || '').toLowerCase();
          return !name.includes('delhi') && !name.includes('mumbai') && !name.includes('jaipur') && !name.includes('chandigarh');
        })
      : [];

    const effectiveHqs = filteredHqs.length > 0 ? filteredHqs : [
      { id: 'hq-kotma', name: 'Kotma', code: 'KOT', state: 'Madhya Pradesh', status: 'ACTIVE' },
      { id: 'hq-shahdol', name: 'Shahdol', code: 'SHD', state: 'Madhya Pradesh', status: 'ACTIVE' },
      { id: 'hq-ambikapur', name: 'Ambikapur', code: 'AMB', state: 'Chhattisgarh', status: 'ACTIVE' },
    ];

    const hqCoordMap: Record<string, { lat: number; lng: number }> = {
      'hq-kotma': { lat: 23.2035, lng: 81.9669 },
      'hq-shahdol': { lat: 23.2953, lng: 81.3586 },
      'hq-ambikapur': { lat: 23.1197, lng: 83.1979 },
    };

    const colors = ['#059669', '#1A3C6E', '#0891B2', '#D97706'];

    return effectiveHqs.map((hq: any, idx: number) => {
      const hqId = hq.id;
      const subAreas = Array.isArray(areas)
        ? areas.filter((a: any) => a.hq_id === hqId && a.status !== 'INACTIVE')
        : [];
      const regionNames = subAreas.map((a: any) => a.name).join(', ');
      const coords = hqCoordMap[hqId] || { lat: 23.2953 + idx * 0.25, lng: 81.3586 + idx * 0.35 };

      const resolvedMr =
        (hq.code === 'KOT' || (hq.name || '').toLowerCase().includes('kotma'))
          ? { name: 'Amar Dwivedi', id: 'usr-mr-01' }
          : (hq.code === 'AMB' || (hq.name || '').toLowerCase().includes('ambikapur'))
          ? { name: 'Ashish Soni', id: 'usr-mr-03' }
          : { name: 'Aman Rathore', id: 'usr-mr-02' };

      return {
        id: `zone-${hqId}`,
        name: `${hq.name} HQ`,
        code: hq.code || `HQ-${hq.name.slice(0, 3).toUpperCase()}`,
        branchType: 'HEADQUARTERS' as const,
        assignedMr: resolvedMr.name,
        assignedMrId: resolvedMr.id,
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
