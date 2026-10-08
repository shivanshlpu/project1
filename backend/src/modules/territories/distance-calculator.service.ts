/**
 * Distance Calculation Engine for AHTRI FFA Tour Plans
 * Calculates:
 * 1. Predefined route batch travel distance
 * 2. Fallback distance from HQ Center (e.g. Shahdol Center) to destination center / boundary
 * 3. Round-trip (two-way) travel distance and reimbursement fare
 */

export interface HqCenterPoint {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

export const HQ_CENTERS: Record<string, HqCenterPoint> = {
  'hq-shahdol': {
    id: 'hq-shahdol',
    name: 'Shahdol',
    code: 'SHD',
    latitude: 23.2953,
    longitude: 81.3586,
  },
  'hq-shd-001': {
    id: 'hq-shahdol',
    name: 'Shahdol',
    code: 'SHD',
    latitude: 23.2953,
    longitude: 81.3586,
  },
  'shahdol': {
    id: 'hq-shahdol',
    name: 'Shahdol',
    code: 'SHD',
    latitude: 23.2953,
    longitude: 81.3586,
  },
  'hq-kotma': {
    id: 'hq-kotma',
    name: 'Kotma',
    code: 'KOT',
    latitude: 23.2030,
    longitude: 81.9660,
  },
  'hq-kot-001': {
    id: 'hq-kotma',
    name: 'Kotma',
    code: 'KOT',
    latitude: 23.2030,
    longitude: 81.9660,
  },
  'kotma': {
    id: 'hq-kotma',
    name: 'Kotma',
    code: 'KOT',
    latitude: 23.2030,
    longitude: 81.9660,
  },
  'hq-ambikapur': {
    id: 'hq-ambikapur',
    name: 'Ambikapur',
    code: 'AMB',
    latitude: 23.1200,
    longitude: 83.1900,
  },
  'hq-amb-001': {
    id: 'hq-ambikapur',
    name: 'Ambikapur',
    code: 'AMB',
    latitude: 23.1200,
    longitude: 83.1900,
  },
  'ambikapur': {
    id: 'hq-ambikapur',
    name: 'Ambikapur',
    code: 'AMB',
    latitude: 23.1200,
    longitude: 83.1900,
  },
};

/**
 * Standard Google Maps road distance from Shahdol Center to sub-area centers/boundaries
 */
export const SHAHDOL_CENTER_TO_LOCATION_KM: Record<string, number> = {
  'shahdol': 5,
  'shahdol central': 5,
  'shahdol city': 5,
  'sohagpur': 5,
  'singhpur': 12,
  'burhar': 22,
  'burhar town': 22,
  'dhanpuri': 28,
  'amlai': 32,
  'opm': 32,
  'gohparu': 35,
  'pali': 38,
  'jaitpur': 42,
  'anuppur': 48,
  'navrozabad': 52,
  'manpur': 58,
  'jaisinghnagar': 60,
  'jaisinghnagar town': 60,
  'umaria': 65,
  'jaithari': 68,
  'kotma': 72,
  'beohari': 78,
  'rajendragram': 85,
  'bijuri': 88,
  'gaurela': 95,
  'manendragarh': 105,
  'chirmiri': 125,
  'baikunthpur': 140,
  'ambikapur': 195,
  'bilaspur': 210,
};

/**
 * Standard road distances from Kotma Center
 */
export const KOTMA_CENTER_TO_LOCATION_KM: Record<string, number> = {
  'kotma': 5,
  'kotma town': 5,
  'bijuri': 15,
  'kelhari': 30,
  'anuppur': 32,
  'keswahi': 35,
  'marwahi': 42,
  'jaithari': 45,
  'manendragarh': 65,
  'janakpur': 65,
  'rajendragram': 70,
  'chirmiri': 80,
  'girva': 85,
  'dhanikundi': 85,
  'baikunthpur': 90,
  'gaurela': 95,
  'khamhidol': 110,
  'shahdol': 72,
};

/**
 * Standard road distances from Ambikapur Center
 */
export const AMBIKAPUR_CENTER_TO_LOCATION_KM: Record<string, number> = {
  'ambikapur': 5,
  'ambikapur central': 5,
  'laknapur': 25,
  'lakhanpur': 25,
  'silpili': 30,
  'vishrampur': 32,
  'surajpur': 38,
  'udaypur': 45,
  'udaipur': 45,
  'latori': 45,
  'pratapur': 50,
  'batuli': 50,
  'sitapur': 55,
  'krwan': 60,
  'devnagar': 65,
  'datima': 75,
  'siluta': 80,
  'shreenagar': 85,
  'kedma': 90,
  'batra': 95,
  'bhatgawn': 125,
  'patthalgawn': 130,
  'vadrafnagar': 140,
};

/**
 * Known Coordinates for regional towns for Haversine fallback
 */
export const REGIONAL_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'shahdol': { lat: 23.2953, lon: 81.3586 },
  'sohagpur': { lat: 23.2800, lon: 81.3700 },
  'singhpur': { lat: 23.2300, lon: 81.3800 },
  'burhar': { lat: 23.2185, lon: 81.5458 },
  'dhanpuri': { lat: 23.2000, lon: 81.5600 },
  'amlai': { lat: 23.1800, lon: 81.6000 },
  'gohparu': { lat: 23.5350, lon: 81.3340 },
  'pali': { lat: 23.3600, lon: 81.0400 },
  'jaitpur': { lat: 23.0180, lon: 81.5640 },
  'anuppur': { lat: 23.1000, lon: 81.6900 },
  'navrozabad': { lat: 23.5400, lon: 80.9100 },
  'manpur': { lat: 23.6800, lon: 81.1200 },
  'jaisinghnagar': { lat: 23.7020, lon: 81.3780 },
  'umaria': { lat: 23.5200, lon: 80.8300 },
  'beohari': { lat: 24.0380, lon: 81.3810 },
  'kotma': { lat: 23.2030, lon: 81.9660 },
  'bijuri': { lat: 23.2600, lon: 82.1300 },
  'rajendragram': { lat: 22.7500, lon: 81.7500 },
  'ambikapur': { lat: 23.1200, lon: 83.1900 },
  'bilaspur': { lat: 22.0797, lon: 82.1409 },
};

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface DistanceCalculationResult {
  one_way_km: number;
  round_trip_km: number;
  calculation_basis: 'ROUND_TRIP_BATCH' | 'ROUND_TRIP_CENTER_TO_BOUNDARY';
  hq_name: string;
  destination: string;
  source: string;
}

/**
 * Calculates distance from HQ Center (e.g. Shahdol center) to the destination boundary/center.
 * Also calculates the two-way (round-trip) distance.
 */
export function calculateHqCenterToDestinationDistance(
  hqIdentifier: string,
  destination: string,
): DistanceCalculationResult {
  const cleanDest = (destination || '').trim().toLowerCase();
  const cleanHq = (hqIdentifier || '').trim().toLowerCase();

  // 1. Identify HQ Center
  let hqKey = 'hq-shahdol';
  let hqName = 'Shahdol';
  if (cleanHq.includes('kot')) {
    hqKey = 'hq-kotma';
    hqName = 'Kotma';
  } else if (cleanHq.includes('amb')) {
    hqKey = 'hq-ambikapur';
    hqName = 'Ambikapur';
  }

  const hqCenter = HQ_CENTERS[hqKey] || HQ_CENTERS['hq-shahdol'];

  // 2. Lookup distance in HQ road distance reference
  let distMap = SHAHDOL_CENTER_TO_LOCATION_KM;
  if (hqKey === 'hq-kotma') distMap = KOTMA_CENTER_TO_LOCATION_KM;
  else if (hqKey === 'hq-ambikapur') distMap = AMBIKAPUR_CENTER_TO_LOCATION_KM;

  // Exact or direct match
  if (distMap[cleanDest] !== undefined) {
    const oneWay = distMap[cleanDest];
    return {
      one_way_km: oneWay,
      round_trip_km: oneWay * 2,
      calculation_basis: 'ROUND_TRIP_CENTER_TO_BOUNDARY',
      hq_name: hqName,
      destination: destination.trim(),
      source: `${hqName} Center to ${destination.trim()} Boundary (Road Distance Reference)`,
    };
  }

  // Substring matching in distance map
  for (const [locKey, km] of Object.entries(distMap)) {
    if (cleanDest.includes(locKey) || locKey.includes(cleanDest)) {
      return {
        one_way_km: km,
        round_trip_km: km * 2,
        calculation_basis: 'ROUND_TRIP_CENTER_TO_BOUNDARY',
        hq_name: hqName,
        destination: destination.trim(),
        source: `${hqName} Center to ${locKey} Boundary (Road Reference Match)`,
      };
    }
  }

  // Fallback 1: Coordinate-based center-to-center calculation with 1.28 winding factor
  for (const [locKey, coords] of Object.entries(REGIONAL_COORDINATES)) {
    if (cleanDest.includes(locKey) || locKey.includes(cleanDest)) {
      const straightMeters = haversineMeters(
        hqCenter.latitude,
        hqCenter.longitude,
        coords.lat,
        coords.lon,
      );
      // Road network factor: 1.28x straight line distance
      const roadKm = Math.max(5, Math.round((straightMeters / 1000) * 1.28));
      return {
        one_way_km: roadKm,
        round_trip_km: roadKm * 2,
        calculation_basis: 'ROUND_TRIP_CENTER_TO_BOUNDARY',
        hq_name: hqName,
        destination: destination.trim(),
        source: `${hqName} Center to ${locKey} Center (Haversine 1.28 Road Network Factor)`,
      };
    }
  }

  // Fallback 2: Conservative standard perimeter distance from district center (25 km one-way)
  const defaultOneWay = 25;
  return {
    one_way_km: defaultOneWay,
    round_trip_km: defaultOneWay * 2,
    calculation_basis: 'ROUND_TRIP_CENTER_TO_BOUNDARY',
    hq_name: hqName,
    destination: destination.trim(),
    source: `${hqName} Center to Boundary (Default District Radius Estimation)`,
  };
}
