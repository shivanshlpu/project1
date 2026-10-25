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
  subAreas?: string[];
}

export const INITIAL_SAVED_LOCATIONS: DoctorItem[] = [
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
    created_by: 'usr-mr-01',
    created_by_role: 'MR',
    created_by_name: 'Amar Dwivedi (usr-mr-01)',
    area_name: 'Kotma HQ Territory',
    visit_count: 8,
    is_new: false,
    batch_id: 'rb-kot-b01',
    batch_code: 'KOT-B01',
    batch_name: 'Kotma - Marwahi - Dhanikundi',
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
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'Bilaspur HQ Territory',
    visit_count: 6,
    is_new: false,
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
    created_by_role: 'ADMIN',
    created_by_name: 'System Admin (Owner)',
    area_name: 'Kotma HQ Territory',
    visit_count: 4,
    is_new: false,
  },
];

export const DEFAULT_TERRITORY_ZONES: TerritoryZone[] = [
  {
    id: 'zone-HQ-KOT-001',
    name: 'Kotma HQ',
    code: 'KOT',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Amar Dwivedi',
    assignedMrId: 'usr-mr-01',
    latitude: 23.2035,
    longitude: 81.9669,
    radiusKm: 25.0,
    color: '#059669',
    description: 'Covering: Kotma Town, Anuppur, Jaithari, Bijuri, Rajendragram, Bhalumuda',
    subAreas: ['Kotma Town', 'Anuppur', 'Jaithari', 'Bijuri', 'Rajendragram', 'Bhalumuda'],
  },
  {
    id: 'zone-HQ-SHD-001',
    name: 'Shahdol HQ',
    code: 'SHD',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Aman Rathore',
    assignedMrId: 'usr-mr-02',
    latitude: 23.2953,
    longitude: 81.3586,
    radiusKm: 25.0,
    color: '#1A3C6E',
    description: 'Covering: Shahdol Central, Burhar, Gohparu, Beohari, Jaisinghnagar, Sohagpur, Singhpur, Amdih, Janakpur Road, Dhanpuri, Amlai, Bakaho',
    subAreas: ['Shahdol Central', 'Burhar', 'Gohparu', 'Beohari', 'Jaisinghnagar', 'Sohagpur', 'Singhpur', 'Amdih', 'Janakpur Road', 'Dhanpuri', 'Amlai', 'Bakaho'],
  },
  {
    id: 'zone-HQ-AMB-001',
    name: 'Ambikapur HQ',
    code: 'AMB',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Ashish Soni',
    assignedMrId: 'usr-mr-03',
    latitude: 23.1197,
    longitude: 83.1979,
    radiusKm: 30.0,
    color: '#0891B2',
    description: 'Covering: Ambikapur Central, Sitapur, Lundra, Batoli, Mainpat, Udaipur, Lakhanpur, Surguja, Ramanujganj',
    subAreas: ['Ambikapur Central', 'Sitapur', 'Lundra', 'Batoli', 'Mainpat', 'Udaipur', 'Lakhanpur', 'Surguja', 'Ramanujganj'],
  },
  {
    id: 'zone-HQ-BSP-001',
    name: 'Bilaspur HQ',
    code: 'BSP',
    branchType: 'HEADQUARTERS',
    assignedMr: 'Field Force Team',
    assignedMrId: 'usr-admin-01',
    latitude: 22.0797,
    longitude: 82.1409,
    radiusKm: 30.0,
    color: '#D97706',
    description: 'Covering: Bilaspur City, Kota, Takhatpur, Masturi, Bilha, Ratanpur, Bodri, Sakri',
    subAreas: ['Bilaspur City', 'Kota', 'Takhatpur', 'Masturi', 'Bilha', 'Ratanpur', 'Bodri', 'Sakri'],
  },
];

export const KNOWN_HQ_COORDINATES: Record<string, { lat: number; lng: number; radiusKm: number; mrName?: string; mrId?: string }> = {
  
  'kotma': { lat: 23.2035, lng: 81.9669, radiusKm: 25.0, mrName: 'Amar Dwivedi', mrId: 'usr-mr-01' },
  'hq-kotma': { lat: 23.2035, lng: 81.9669, radiusKm: 25.0, mrName: 'Amar Dwivedi', mrId: 'usr-mr-01' },
  'hq-kot-001': { lat: 23.2035, lng: 81.9669, radiusKm: 25.0, mrName: 'Amar Dwivedi', mrId: 'usr-mr-01' },
  'kot': { lat: 23.2035, lng: 81.9669, radiusKm: 25.0, mrName: 'Amar Dwivedi', mrId: 'usr-mr-01' },
  'hq-ktm': { lat: 23.2035, lng: 81.9669, radiusKm: 25.0, mrName: 'Amar Dwivedi', mrId: 'usr-mr-01' },

  
  'shahdol': { lat: 23.2953, lng: 81.3586, radiusKm: 25.0, mrName: 'Aman Rathore', mrId: 'usr-mr-02' },
  'hq-shahdol': { lat: 23.2953, lng: 81.3586, radiusKm: 25.0, mrName: 'Aman Rathore', mrId: 'usr-mr-02' },
  'hq-shd-001': { lat: 23.2953, lng: 81.3586, radiusKm: 25.0, mrName: 'Aman Rathore', mrId: 'usr-mr-02' },
  'shd': { lat: 23.2953, lng: 81.3586, radiusKm: 25.0, mrName: 'Aman Rathore', mrId: 'usr-mr-02' },
  'hq-shd': { lat: 23.2953, lng: 81.3586, radiusKm: 25.0, mrName: 'Aman Rathore', mrId: 'usr-mr-02' },

  
  'ambikapur': { lat: 23.1197, lng: 83.1979, radiusKm: 30.0, mrName: 'Ashish Soni', mrId: 'usr-mr-03' },
  'hq-ambikapur': { lat: 23.1197, lng: 83.1979, radiusKm: 30.0, mrName: 'Ashish Soni', mrId: 'usr-mr-03' },
  'hq-amb-001': { lat: 23.1197, lng: 83.1979, radiusKm: 30.0, mrName: 'Ashish Soni', mrId: 'usr-mr-03' },
  'amb': { lat: 23.1197, lng: 83.1979, radiusKm: 30.0, mrName: 'Ashish Soni', mrId: 'usr-mr-03' },
  'hq-amb': { lat: 23.1197, lng: 83.1979, radiusKm: 30.0, mrName: 'Ashish Soni', mrId: 'usr-mr-03' },

  
  'bilaspur': { lat: 22.0797, lng: 82.1409, radiusKm: 30.0 },
  'hq-bilaspur': { lat: 22.0797, lng: 82.1409, radiusKm: 30.0 },
  'hq-bsp-001': { lat: 22.0797, lng: 82.1409, radiusKm: 30.0 },
  'bsp': { lat: 22.0797, lng: 82.1409, radiusKm: 30.0 },
  'hq-bsp': { lat: 22.0797, lng: 82.1409, radiusKm: 30.0 },

  
  'anuppur': { lat: 23.1037, lng: 81.6896, radiusKm: 20.0 },
  'burhar': { lat: 23.2185, lng: 81.5369, radiusKm: 20.0 },
  'manendragarh': { lat: 23.2147, lng: 82.2038, radiusKm: 25.0 },
  'chirmiri': { lat: 23.1843, lng: 82.3475, radiusKm: 25.0 },
  'baikunthpur': { lat: 23.2754, lng: 82.5542, radiusKm: 25.0 },
  'surajpur': { lat: 23.2192, lng: 82.8631, radiusKm: 25.0 },
  'rewa': { lat: 24.5362, lng: 81.3037, radiusKm: 30.0 },
  'satna': { lat: 24.6005, lng: 80.8322, radiusKm: 30.0 },
  'jabalpur': { lat: 23.1815, lng: 79.9864, radiusKm: 30.0 },
  'umaria': { lat: 23.5243, lng: 80.8354, radiusKm: 25.0 },
  'dindori': { lat: 22.9515, lng: 81.0827, radiusKm: 25.0 },
  'mandla': { lat: 22.5982, lng: 80.3712, radiusKm: 25.0 },
  'katni': { lat: 23.8343, lng: 80.3980, radiusKm: 25.0 },
  'chhindwara': { lat: 22.0574, lng: 78.9382, radiusKm: 30.0 },
  'seoni': { lat: 22.0869, lng: 79.5435, radiusKm: 25.0 },
  'bhopal': { lat: 23.2599, lng: 77.4126, radiusKm: 35.0 },
  'indore': { lat: 22.7196, lng: 75.8577, radiusKm: 35.0 },
  'gwalior': { lat: 26.2183, lng: 78.1828, radiusKm: 35.0 },
  'ujjain': { lat: 23.1765, lng: 75.7885, radiusKm: 30.0 },
  'sagar': { lat: 23.8388, lng: 78.7378, radiusKm: 30.0 },
  'raipur': { lat: 21.2514, lng: 81.6296, radiusKm: 35.0 },
  'durg': { lat: 21.1904, lng: 81.2849, radiusKm: 30.0 },
  'bhilai': { lat: 21.2167, lng: 81.4333, radiusKm: 30.0 },
  'korba': { lat: 22.3595, lng: 82.7501, radiusKm: 30.0 },
  'raigarh': { lat: 21.8974, lng: 83.3950, radiusKm: 30.0 },
  'rajnandgaon': { lat: 21.0971, lng: 81.0335, radiusKm: 30.0 },
  'jagdalpur': { lat: 19.0732, lng: 82.0298, radiusKm: 30.0 },
};

export function findKnownCityCoordinates(cityName: string): { lat: number; lng: number } | null {
  const norm = (cityName || '').toLowerCase().trim().replace(/^(hq-|zone-)/, '').replace(/\s*hq$/, '');
  for (const [key, val] of Object.entries(KNOWN_HQ_COORDINATES)) {
    if (norm === key || norm.includes(key) || key.includes(norm)) {
      return { lat: val.lat, lng: val.lng };
    }
  }
  return null;
}

export const DEFAULT_MANAGED_AREAS_MAP: Record<string, string[]> = {
  'kotma': ['Kotma Town', 'Anuppur', 'Jaithari', 'Bijuri', 'Rajendragram', 'Bhalumuda', 'Marwahi', 'Kelhari', 'Janakpur'],
  'shahdol': ['Shahdol Central', 'Burhar', 'Gohparu', 'Beohari', 'Jaisinghnagar', 'Sohagpur', 'Singhpur', 'Dhanpuri', 'Amlai', 'OPM', 'Pali', 'Navrozabad'],
  'ambikapur': ['Ambikapur Central', 'Sitapur', 'Lundra', 'Batoli', 'Mainpat', 'Udaipur', 'Lakhanpur', 'Surguja', 'Ramanujganj', 'Surajpur', 'Bhatgaon'],
  'bilaspur': ['Bilaspur City', 'Kota', 'Takhatpur', 'Masturi', 'Bilha', 'Ratanpur', 'Bodri', 'Sakri'],
};

function resolveHqCoordinates(
  hq: any,
  operatingCities: any[]
): { lat: number; lng: number; radiusKm: number } {
  
  if (typeof hq.latitude === 'number' && !isNaN(hq.latitude) && typeof hq.longitude === 'number' && !isNaN(hq.longitude)) {
    return { lat: hq.latitude, lng: hq.longitude, radiusKm: hq.radiusKm || 25.0 };
  }
  if (typeof hq.lat === 'number' && !isNaN(hq.lat) && typeof hq.lng === 'number' && !isNaN(hq.lng)) {
    return { lat: hq.lat, lng: hq.lng, radiusKm: hq.radiusKm || 25.0 };
  }

  const normName = (hq.name || hq.cityName || '').toLowerCase().trim();
  const normId = (hq.id || '').toLowerCase().trim();

  
  const cityMatch = operatingCities.find((c: any) => {
    const cName = (c.cityName || c.name || '').toLowerCase().trim();
    const cId = (c.id || '').toLowerCase().trim();
    return cName === normName || cId === normId || (normName && cName.includes(normName)) || (normName && normName.includes(cName));
  });
  if (cityMatch && typeof cityMatch.latitude === 'number' && typeof cityMatch.longitude === 'number') {
    return { lat: cityMatch.latitude, lng: cityMatch.longitude, radiusKm: cityMatch.radiusKm || 25.0 };
  }

  
  const candidates = [
    normId,
    normName,
    (hq.code || hq.hq_code || '').toLowerCase().trim(),
    (hq.hq_id || '').toLowerCase().trim(),
  ];
  for (const cand of candidates) {
    if (cand && KNOWN_HQ_COORDINATES[cand]) {
      const match = KNOWN_HQ_COORDINATES[cand];
      return { lat: match.lat, lng: match.lng, radiusKm: match.radiusKm || 25.0 };
    }
  }

  
  for (const [key, val] of Object.entries(KNOWN_HQ_COORDINATES)) {
    if (normName && (normName.includes(key) || key.includes(normName))) {
      return { lat: val.lat, lng: val.lng, radiusKm: val.radiusKm || 25.0 };
    }
  }

  
  if (normName.includes('kot') || normId.includes('kot') || normId.includes('ktm')) {
    return { lat: 23.2035, lng: 81.9669, radiusKm: 25.0 };
  }
  if (normName.includes('amb') || normId.includes('amb')) {
    return { lat: 23.1197, lng: 83.1979, radiusKm: 30.0 };
  }
  if (normName.includes('bsp') || normId.includes('bsp') || normName.includes('bilas')) {
    return { lat: 22.0797, lng: 82.1409, radiusKm: 30.0 };
  }

  return { lat: 23.2953, lng: 81.3586, radiusKm: 25.0 };
}

function resolveSubAreasForHq(hq: any, allAreas: any[]): string[] {
  const normId = (hq.id || '').toLowerCase().trim();
  const normCode = (hq.code || hq.hq_code || '').toLowerCase().trim();
  const normName = (hq.name || hq.cityName || '').toLowerCase().trim();

  
  const matched = Array.isArray(allAreas)
    ? allAreas.filter((a: any) => {
        if (a && a.status === 'INACTIVE') return false;
        const aHqId = (a.hq_id || '').toLowerCase().trim();
        if (!aHqId) return false;
        if (aHqId === normId || aHqId === normCode) return true;
        if (normName && (aHqId === normName || aHqId.includes(normName) || normName.includes(aHqId))) return true;
        if ((normId.includes('kot') || normCode.includes('kot') || normName.includes('kot')) && (aHqId.includes('kot') || aHqId.includes('ktm'))) return true;
        if ((normId.includes('shd') || normCode.includes('shd') || normName.includes('shd')) && aHqId.includes('shd')) return true;
        if ((normId.includes('amb') || normCode.includes('amb') || normName.includes('amb')) && aHqId.includes('amb')) return true;
        if ((normId.includes('bsp') || normCode.includes('bsp') || normName.includes('bsp') || normName.includes('bilas')) && (aHqId.includes('bsp') || aHqId.includes('bilas'))) return true;
        return false;
      })
    : [];

  const userAreaNames = matched.map((a: any) => (a.name || '').trim()).filter(Boolean);

  
  let defaultAreas: string[] = [];
  if (normName.includes('kot') || normId.includes('kot') || normId.includes('ktm')) {
    defaultAreas = DEFAULT_MANAGED_AREAS_MAP['kotma'] || [];
  } else if (normName.includes('shd') || normId.includes('shd')) {
    defaultAreas = DEFAULT_MANAGED_AREAS_MAP['shahdol'] || [];
  } else if (normName.includes('amb') || normId.includes('amb')) {
    defaultAreas = DEFAULT_MANAGED_AREAS_MAP['ambikapur'] || [];
  } else if (normName.includes('bsp') || normId.includes('bsp') || normName.includes('bilas')) {
    defaultAreas = DEFAULT_MANAGED_AREAS_MAP['bilaspur'] || [];
  }

  const combined = Array.from(new Set([...userAreaNames, ...defaultAreas]));
  return combined;
}

export function getOperatingZones(): TerritoryZone[] {
  try {
    const rawHqs = localStorage.getItem('ahtri_inventory_hqs');
    const hqs = rawHqs ? JSON.parse(rawHqs) : null;

    const rawAreas = localStorage.getItem('ahtri_hq_subareas');
    const areas = rawAreas ? JSON.parse(rawAreas) : null;

    const rawCities = localStorage.getItem('ahtri_operating_cities');
    const operatingCities = rawCities && Array.isArray(JSON.parse(rawCities)) ? JSON.parse(rawCities) : [];

    
    const isExcluded = (name: string) => {
      const n = (name || '').toLowerCase();
      return n.includes('delhi') || n.includes('mumbai') || n.includes('jaipur') || n.includes('chandigarh');
    };

    
    const getZoneKey = (item: any) => {
      const name = (item.name || item.cityName || '').toLowerCase().trim();
      const cleanName = name.replace(/^(hq-|zone-)/, '').replace(/\s*hq$/, '').trim();
      if (cleanName) {
        if (cleanName === 'shd' || cleanName.includes('shahdol')) return 'shahdol';
        if (cleanName === 'kot' || cleanName.includes('kotma')) return 'kotma';
        if (cleanName === 'amb' || cleanName.includes('ambikapur')) return 'ambikapur';
        if (cleanName === 'bsp' || cleanName.includes('bilaspur')) return 'bilaspur';
        return cleanName;
      }
      const rawCode = (item.code || item.hq_code || item.id || '').toLowerCase().trim().replace(/^(hq-|zone-)/, '').replace(/-001$/, '').replace(/\s*hq$/, '').trim();
      if (rawCode === 'shd' || rawCode.includes('shahdol')) return 'shahdol';
      if (rawCode === 'kot' || rawCode.includes('kotma')) return 'kotma';
      if (rawCode === 'amb' || rawCode.includes('ambikapur')) return 'ambikapur';
      if (rawCode === 'bsp' || rawCode.includes('bilaspur')) return 'bilaspur';
      return rawCode;
    };

    
    const zoneMap = new Map<string, any>();

    
    DEFAULT_TERRITORY_ZONES.forEach((dz) => {
      const key = getZoneKey(dz);
      zoneMap.set(key, {
        id: dz.id.replace('zone-', ''),
        name: dz.name.replace(/\s*HQ$/i, '').trim(),
        code: dz.code,
        state: dz.code === 'KOT' || dz.code === 'SHD' ? 'Madhya Pradesh' : 'Chhattisgarh',
        branchType: 'HEADQUARTERS',
        color: dz.color,
        latitude: dz.latitude,
        longitude: dz.longitude,
        radiusKm: dz.radiusKm,
        subAreas: dz.subAreas,
      });
    });

    
    if (Array.isArray(hqs)) {
      hqs.forEach((h: any) => {
        if (!h || !h.name || isExcluded(h.name)) return;
        const key = getZoneKey(h);
        const existing = zoneMap.get(key) || {};
        zoneMap.set(key, {
          ...existing,
          ...h,
          id: h.hq_id || h.id || existing.id,
          name: h.name.replace(/\s*HQ$/i, '').trim(),
          code: h.code || h.hq_code || existing.code,
        });
      });
    }

    
    if (Array.isArray(operatingCities)) {
      operatingCities.forEach((c: any) => {
        if (!c || !c.cityName || isExcluded(c.cityName)) return;
        const key = getZoneKey({ name: c.cityName });
        const existing = zoneMap.get(key) || {};
        zoneMap.set(key, {
          ...existing,
          id: existing.id || c.id,
          name: existing.name || c.cityName.replace(/\s*HQ$/i, '').trim(),
          code: existing.code || `HQ-${c.cityName.substring(0, 3).toUpperCase()}`,
          latitude: typeof c.latitude === 'number' ? c.latitude : existing.latitude,
          longitude: typeof c.longitude === 'number' ? c.longitude : existing.longitude,
          radiusKm: c.radiusKm || existing.radiusKm || 25,
          branchType: c.branchType || existing.branchType || (c.isHeadquarters ? 'HEADQUARTERS' : 'SUB_CITY_BRANCH'),
        });
      });
    }

    
    const seenZoneKeys = new Set<string>();
    const effectiveHqs = Array.from(zoneMap.values()).filter((hq: any) => {
      const k = getZoneKey(hq);
      if (seenZoneKeys.has(k)) return false;
      seenZoneKeys.add(k);
      return true;
    });

    const colors = ['#059669', '#1A3C6E', '#0891B2', '#D97706', '#7C3AED', '#DB2777', '#2563EB'];

    return effectiveHqs.map((hq: any, idx: number) => {
      const hqId = hq.id || `hq-${(hq.name || 'zone').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const coords = resolveHqCoordinates(hq, operatingCities);
      const subAreas = resolveSubAreasForHq(hq, areas);
      const regionNames = subAreas.join(', ');

      const normName = (hq.name || '').toLowerCase();
      const normCode = (hq.code || hq.hq_code || '').toUpperCase();

      const resolvedMr =
        normCode === 'KOT' || normName.includes('kotma')
          ? { name: 'Amar Dwivedi', id: 'usr-mr-01' }
          : normCode === 'AMB' || normName.includes('ambikapur')
          ? { name: 'Ashish Soni', id: 'usr-mr-03' }
          : normCode === 'SHD' || normName.includes('shahdol')
          ? { name: 'Aman Rathore', id: 'usr-mr-02' }
          : { name: 'Distributed Field Force', id: 'usr-admin-01' };

      return {
        id: `zone-${hqId}`,
        name: hq.name.endsWith(' HQ') ? hq.name : `${hq.name} HQ`,
        code: normCode || `HQ-${hq.name.slice(0, 3).toUpperCase()}`,
        branchType: (hq.branchType as any) || 'HEADQUARTERS',
        assignedMr: resolvedMr.name,
        assignedMrId: resolvedMr.id,
        latitude: coords.lat,
        longitude: coords.lng,
        radiusKm: coords.radiusKm,
        color: hq.color || colors[idx % colors.length],
        description: regionNames
          ? `Covering: ${regionNames}`
          : `${hq.name}, ${hq.state || 'Operational'} Territory`,
        subAreas,
      };
    });
  } catch (err) {
    console.warn('[savedLocationsStore] Error resolving operating zones:', err);
    return DEFAULT_TERRITORY_ZONES;
  }
}

export function getStoredSavedLocations(): DoctorItem[] {
  try {
    let deletedIds: string[] = [];
    try {
      const rawDeleted = localStorage.getItem('ahtri_deleted_location_ids');
      if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
    } catch {}

    const raw = localStorage.getItem('ahtri_saved_locations');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((l) => l && !deletedIds.includes(l.id));
      }
    }
    
    const initialized = localStorage.getItem('ahtri_locations_initialized');
    if (initialized === 'true') {
      return [];
    }

    return INITIAL_SAVED_LOCATIONS.filter((l) => l && !deletedIds.includes(l.id));
  } catch {
    return [];
  }
}

export function persistSavedLocations(locs: DoctorItem[]) {
  try {
    localStorage.setItem('ahtri_saved_locations', JSON.stringify(locs));
    localStorage.setItem('ahtri_locations_initialized', 'true');
    window.dispatchEvent(new CustomEvent('ahtri_locations_updated', { detail: locs }));
  } catch {}
}

export function deleteSavedLocation(id: string): DoctorItem[] {
  try {
    const rawDeleted = localStorage.getItem('ahtri_deleted_location_ids');
    const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('ahtri_deleted_location_ids', JSON.stringify(deletedIds));
    }
  } catch {}
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
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    const res = await fetch(`${apiUrl}/locations`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
