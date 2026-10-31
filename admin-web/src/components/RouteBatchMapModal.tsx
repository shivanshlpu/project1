import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Search,
  Plus,
  Trash2,
  ArrowRight,
  RotateCcw,
  Check,
  X,
  Layers,
  Car,
  ChevronUp,
  ChevronDown,
  Info,
  Building,
  Flag,
  Map as MapIcon,
  Crosshair,
  Sparkles,
  Maximize2,
  AlertTriangle,
  Edit2,
  Shield,
  Milestone,
  Sliders,
} from 'lucide-react';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  isCustom?: boolean;
  isViaPoint?: boolean;
}

export interface SearchResultItem {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  category: 'GPS' | 'Hub' | 'Clinic' | 'Map';
  address?: string;
}

interface RouteBatchMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchTitle?: string;
  initialStops?: string[];
  initialWaypoints?: RouteWaypoint[];
  initialDistanceKm?: number;
  ratePerKm?: number;
  onApplyRoute: (result: {
    stops: string[];
    distanceKm: number;
    suggestedBatchName: string;
    waypoints: RouteWaypoint[];
  }) => Promise<void> | void;
  allSavedLocations?: Array<{
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    clinic?: string;
    doctor_name?: string;
    category?: string;
  }>;
}

export interface TerritoryHub {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  area: string;
  region: 'shahdol' | 'kotma' | 'ambikapur' | 'bilaspur';
}

// Comprehensive territorial database of all towns, tehsils & stops in field operational circuits
export const TERRITORY_DIRECTORY: TerritoryHub[] = [
  // --- SHAHDOL HQ BELT ---
  { name: 'Shahdol', aliases: ['shahdol', 'shd', 'shahdol hq', 'shahdol city', 'sohagpur'], lat: 23.2883, lng: 81.3522, area: 'Shahdol Central HQ', region: 'shahdol' },
  { name: 'Budhar', aliases: ['budhar', 'burhar', 'boodhar'], lat: 23.2167, lng: 81.5333, area: 'Commercial Town', region: 'shahdol' },
  { name: 'Dhanpuri', aliases: ['dhanpuri', 'dhanpoori'], lat: 23.1833, lng: 81.5667, area: 'Mining Hub', region: 'shahdol' },
  { name: 'Amlai (OPM)', aliases: ['amlai', 'opm', 'amlai opm', 'orient paper mills', 'amlai (opm)'], lat: 23.1950, lng: 81.6120, area: 'Paper Mill & Township', region: 'shahdol' },
  { name: 'Bakaho', aliases: ['bakaho', 'bakkaho'], lat: 23.2350, lng: 81.5120, area: 'Sub-Town', region: 'shahdol' },
  { name: 'Pali', aliases: ['pali', 'birsinghpur pali', 'birsinghpur', 'birshingpur pali'], lat: 23.3644, lng: 81.0425, area: 'Thermal Town', region: 'shahdol' },
  { name: 'Nowrozabad', aliases: ['nowrozabad', 'navrozabad', 'naurozabad'], lat: 23.4000, lng: 80.9333, area: 'Colliery Belt', region: 'shahdol' },
  { name: 'Gohparu', aliases: ['gohparu', 'gohparoo'], lat: 23.4682, lng: 81.4428, area: 'Sub-district', region: 'shahdol' },
  { name: 'Jaisinghnagar', aliases: ['jaisinghnagar', 'jaisingh nagar'], lat: 23.7000, lng: 81.3833, area: 'North Route', region: 'shahdol' },
  { name: 'Jaitpur', aliases: ['jaitpur', 'jaitpur shahdol'], lat: 23.4791, lng: 81.7289, area: 'Rural Hub', region: 'shahdol' },
  { name: 'Manpur', aliases: ['manpur', 'maanpur'], lat: 23.6339, lng: 81.0825, area: 'Forest Route', region: 'shahdol' },
  { name: 'Singhpur', aliases: ['singhpur'], lat: 23.2100, lng: 81.3800, area: 'Sub-district', region: 'shahdol' },
  { name: 'Beohari', aliases: ['beohari', 'byohari'], lat: 24.0333, lng: 81.3833, area: 'North Highway', region: 'shahdol' },
  { name: 'Umaria', aliases: ['umaria'], lat: 23.5244, lng: 80.8358, area: 'District HQ', region: 'shahdol' },
  { name: 'Khannoudhi', aliases: ['khannoudhi', 'khannaudhi'], lat: 23.5833, lng: 81.3667, area: 'North Route', region: 'shahdol' },
  { name: 'Amjhor', aliases: ['amjhor'], lat: 23.7500, lng: 81.4500, area: 'North Border', region: 'shahdol' },
  { name: 'Chuhiri', aliases: ['chuhiri', 'chuhiree'], lat: 23.5167, lng: 81.4667, area: 'Township', region: 'shahdol' },

  // --- KOTMA / ANUPPUR BELT ---
  { name: 'Kotma', aliases: ['kotma', 'kotma hq', 'kotma town'], lat: 23.2042, lng: 81.9790, area: 'Colliery Belt HQ & Station', region: 'kotma' },
  { name: 'Anuppur', aliases: ['anuppur', 'anuppur hq', 'anuppur town'], lat: 23.1044, lng: 81.6881, area: 'District HQ', region: 'kotma' },
  { name: 'Jaithari', aliases: ['jaithari', 'jaitharee'], lat: 23.0336, lng: 81.7958, area: 'Thermal Power Hub', region: 'kotma' },
  { name: 'Rajendragram', aliases: ['rajendragram', 'rajendragram pusprajgarh', 'pushprajgarh'], lat: 22.8256, lng: 81.7139, area: 'Highland Route', region: 'kotma' },
  { name: 'Amarkantak', aliases: ['amarkantak'], lat: 22.6705, lng: 81.7588, area: 'Holy Hill Town', region: 'kotma' },
  { name: 'Bijuri', aliases: ['bijuri', 'bijuri colliery'], lat: 23.2657, lng: 82.1233, area: 'Border Belt', region: 'kotma' },
  { name: 'Kelhari', aliases: ['kelhari'], lat: 23.3986, lng: 82.1931, area: 'North Mining Belt', region: 'kotma' },
  { name: 'Janakpur', aliases: ['janakpur', 'bharatpur'], lat: 23.7428, lng: 82.0250, area: 'Northern Border', region: 'kotma' },
  { name: 'Marwahi', aliases: ['marwahi'], lat: 23.0044, lng: 82.0572, area: 'Marwahi Tehsil Market', region: 'kotma' },
  { name: 'Dhanikundi', aliases: ['dhanikundi', 'dhankundi', 'danikundi'], lat: 22.9309, lng: 82.1079, area: 'PHC Danikundi Border', region: 'kotma' },
  { name: 'Keswahi', aliases: ['keswahi', 'keshwahi', 'keshavwahi', 'keswani', 'keshwani'], lat: 23.2991, lng: 81.7760, area: 'PHC Keshwahi Central Route', region: 'kotma' },
  { name: 'Girva', aliases: ['girva', 'girwa', 'girba'], lat: 23.2620, lng: 81.6974, area: 'Girva Sub-centre & Village', region: 'kotma' },
  { name: 'Khamhidol', aliases: ['khamhidol', 'khamhidhol', 'khamhi dol'], lat: 23.3673, lng: 81.7267, area: 'Khamhidol Village', region: 'kotma' },
  { name: 'Manendragarh', aliases: ['manendragarh', 'manendragarh city'], lat: 23.2144, lng: 82.2039, area: 'District Border', region: 'kotma' },
  { name: 'Chirmiri', aliases: ['chirmiri', 'chirimiri'], lat: 23.1814, lng: 82.3533, area: 'Coal City', region: 'kotma' },
  { name: 'Baikunthpur', aliases: ['baikunthpur'], lat: 23.2667, lng: 82.5500, area: 'District HQ (Koriya)', region: 'kotma' },
  { name: 'Gaurela', aliases: ['gaurela', 'pendra', 'pendra road', 'gaurella'], lat: 22.7667, lng: 81.9167, area: 'Railway Junction', region: 'kotma' },
  { name: 'Pendra', aliases: ['pendra', 'pendra town', 'pendra road'], lat: 22.7743, lng: 81.9602, area: 'Pendra Town', region: 'kotma' },
  { name: 'Venkatnagar', aliases: ['venkatnagar', 'vynkatnagar'], lat: 22.9254, lng: 81.8764, area: 'Border Belt', region: 'kotma' },
  { name: 'Jamuna Colliery', aliases: ['jamuna colliery', 'jamuna'], lat: 23.1833, lng: 81.9333, area: 'Mining Colony', region: 'kotma' },

  // --- AMBIKAPUR / SURGUJA BELT ---
  { name: 'Ambikapur', aliases: ['ambikapur', 'ambikapur hq', 'surguja'], lat: 23.1200, lng: 83.1900, area: 'Surguja HQ', region: 'ambikapur' },
  { name: 'Lakhanpur', aliases: ['lakhanpur', 'laknapur', 'lakhanpur surguja'], lat: 22.9995, lng: 83.0446, area: 'NH130 Main Market & Bypass', region: 'ambikapur' },
  { name: 'Udaipur', aliases: ['udaipur', 'udaypur', 'udaipur surguja'], lat: 22.9039, lng: 82.9358, area: 'Udaipur Tehsil Market & NH130', region: 'ambikapur' },
  { name: 'Kedma', aliases: ['kedma', 'kedma surguja', 'kedama'], lat: 22.7462, lng: 83.0544, area: 'Kedma Junction & Market (NH130)', region: 'ambikapur' },
  { name: 'Batuli', aliases: ['batuli'], lat: 22.9667, lng: 83.3333, area: 'South Route', region: 'ambikapur' },
  { name: 'Sitapur', aliases: ['sitapur'], lat: 22.7833, lng: 83.5000, area: 'Jashpur Highway', region: 'ambikapur' },
  { name: 'Pathalgaon', aliases: ['pathalgaon', 'patthalgawn'], lat: 22.5667, lng: 83.7000, area: 'Commercial Mandi', region: 'ambikapur' },
  { name: 'Silpili', aliases: ['silpili'], lat: 23.1667, lng: 83.0833, area: 'West Highway', region: 'ambikapur' },
  { name: 'Bishrampur', aliases: ['bishrampur', 'vishrampur'], lat: 23.1833, lng: 82.9833, area: 'Railway Colony', region: 'ambikapur' },
  { name: 'Surajpur', aliases: ['surajpur', 'surajpur district'], lat: 23.2167, lng: 82.8667, area: 'District HQ', region: 'ambikapur' },
  { name: 'Devnagar', aliases: ['devnagar'], lat: 23.2667, lng: 82.9333, area: 'Colliery Belt', region: 'ambikapur' },
  { name: 'Srinagar', aliases: ['srinagar', 'shreenagar'], lat: 23.3167, lng: 82.9833, area: 'North Route', region: 'ambikapur' },
  { name: 'Pratappur', aliases: ['pratappur', 'pratapur'], lat: 23.4833, lng: 83.2167, area: 'North East Tehsil', region: 'ambikapur' },
  { name: 'Siluta', aliases: ['siluta'], lat: 23.6333, lng: 83.2833, area: 'Border Highway', region: 'ambikapur' },
  { name: 'Wadrafnagar', aliases: ['wadrafnagar', 'vadrafnagar'], lat: 23.7667, lng: 83.2000, area: 'North Border Tehsil', region: 'ambikapur' },
  { name: 'Latori', aliases: ['latori'], lat: 23.2833, lng: 83.0833, area: 'Central Route', region: 'ambikapur' },
  { name: 'Karwan', aliases: ['karwan', 'krwan'], lat: 23.3333, lng: 83.0500, area: 'Rural Sector', region: 'ambikapur' },
  { name: 'Datima', aliases: ['datima'], lat: 23.3667, lng: 83.0167, area: 'Rural Sector', region: 'ambikapur' },
  { name: 'Batra', aliases: ['batra'], lat: 23.4000, lng: 82.9667, area: 'Rural Sector', region: 'ambikapur' },
  { name: 'Bhatgaon', aliases: ['bhatgaon', 'bhatgawn'], lat: 23.4333, lng: 82.9167, area: 'Mining Town', region: 'ambikapur' },

  // --- BILASPUR BELT ---
  { name: 'Bilaspur', aliases: ['bilaspur', 'bilaspur hq'], lat: 22.0797, lng: 82.1409, area: 'Bilaspur City HQ', region: 'bilaspur' },
  { name: 'Ratanpur', aliases: ['ratanpur'], lat: 22.3000, lng: 82.1667, area: 'Heritage Town', region: 'bilaspur' },
  { name: 'Kota', aliases: ['kota'], lat: 22.3000, lng: 82.0167, area: 'Railway Junction', region: 'bilaspur' },
  { name: 'Takhatpur', aliases: ['takhatpur'], lat: 22.1500, lng: 81.8667, area: 'Tehsil Mandi', region: 'bilaspur' },
  { name: 'Mungeli', aliases: ['mungeli'], lat: 22.0667, lng: 81.6833, area: 'District HQ', region: 'bilaspur' },
  { name: 'Masturi', aliases: ['masturi'], lat: 21.9833, lng: 82.2667, area: 'East Tehsil', region: 'bilaspur' },
  { name: 'Chakarbhatha', aliases: ['chakarbhatha'], lat: 22.0167, lng: 82.1167, area: 'Airport Suburb', region: 'bilaspur' },
];

export function resolveStopCoordinate(
  stopName: string,
  idx: number,
  allSavedLocations: Array<{
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    clinic?: string;
    doctor_name?: string;
    category?: string;
  }> = [],
  previousWaypoint?: RouteWaypoint
): RouteWaypoint {
  const clean = stopName.trim();
  const lower = clean.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Direct or alias match in TERRITORY_DIRECTORY
  const match = TERRITORY_DIRECTORY.find((h) => {
    if (h.name.toLowerCase() === clean.toLowerCase()) return true;
    const hClean = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (hClean === lower) return true;
    return h.aliases.some((a) => {
      const aClean = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (aClean === lower) return true;
      if (aClean.length >= 4 && (lower.includes(aClean) || aClean.includes(lower))) return true;
      return false;
    });
  });

  if (match) {
    return {
      id: `wp-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: match.name,
      lat: match.lat,
      lng: match.lng,
      address: match.area,
    };
  }

  // 2. Check allSavedLocations (clinics, doctors, facilities)
  const locMatch = allSavedLocations.find((l) => {
    if (!l.latitude || !l.longitude) return false;
    const lName = (l.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const lClinic = (l.clinic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const lDoc = (l.doctor_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const lAddr = (l.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      (lName && (lName.includes(lower) || lower.includes(lName))) ||
      (lClinic && (lClinic.includes(lower) || lower.includes(lClinic))) ||
      (lDoc && (lDoc.includes(lower) || lower.includes(lDoc))) ||
      (lAddr && lAddr.includes(lower))
    );
  });

  if (locMatch && locMatch.latitude && locMatch.longitude) {
    return {
      id: `wp-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: locMatch.clinic || locMatch.name || clean,
      lat: locMatch.latitude,
      lng: locMatch.longitude,
      address: locMatch.address || locMatch.clinic,
    };
  }

  // 3. Fallback: Keep close to previous waypoint if available (offset slightly for visibility),
  // rather than jumping across districts!
  const baseLat = previousWaypoint ? previousWaypoint.lat + 0.025 : 23.2883 + idx * 0.03;
  const baseLng = previousWaypoint ? previousWaypoint.lng + 0.025 : 81.3522 + idx * 0.03;

  return {
    id: `wp-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: clean,
    lat: baseLat,
    lng: baseLng,
    isCustom: true,
  };
}


// Calculate perpendicular distance in km from point (pLat, pLon) to line segment (lat1, lon1)-(lat2, lon2)
function pointToLineDistanceKm(
  pLat: number,
  pLon: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const avgLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(avgLatRad);
  const x = (pLon - lon1) * cosLat * 111.32;
  const y = (pLat - lat1) * 110.574;
  const dx = (lon2 - lon1) * cosLat * 111.32;
  const dy = (lat2 - lat1) * 110.574;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt(x * x + y * y);
  return Math.abs(dx * y - dy * x) / Math.sqrt(lenSq);
}

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Find optimal insertion index along current route to prevent accidental 50km loops
function findBestInsertionIndex(current: RouteWaypoint[], newPoint: RouteWaypoint): number {
  if (current.length <= 1) return current.length;
  let bestIdx = current.length;
  let minAddedDist = Infinity;

  // Check inserting between adjacent stops, keeping Stop 0 (Origin HQ) first
  for (let i = 1; i <= current.length; i++) {
    const prev = current[i - 1];
    const next = current[i]; // undefined if inserting at end

    let addedDist = 0;
    if (next) {
      const orig = calculateHaversineKm(prev.lat, prev.lng, next.lat, next.lng);
      const withNew =
        calculateHaversineKm(prev.lat, prev.lng, newPoint.lat, newPoint.lng) +
        calculateHaversineKm(newPoint.lat, newPoint.lng, next.lat, next.lng);
      addedDist = withNew - orig;
    } else {
      addedDist = calculateHaversineKm(prev.lat, prev.lng, newPoint.lat, newPoint.lng);
    }

    if (addedDist < minAddedDist) {
      minAddedDist = addedDist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export const RouteBatchMapModal: React.FC<RouteBatchMapModalProps> = ({
  isOpen,
  onClose,
  batchTitle,
  initialStops = [],
  initialWaypoints = [],
  initialDistanceKm,
  ratePerKm = 2.25,
  onApplyRoute,
  allSavedLocations = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.Layer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.Layer | null>(null);
  const accessLinesLayerRef = useRef<L.LayerGroup | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const keepViewportRef = useRef<boolean>(false);
  const renderRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [calculatedKm, setCalculatedKm] = useState<number>(initialDistanceKm || 0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [selectedBelt, setSelectedBelt] = useState<'all' | 'shahdol' | 'kotma' | 'ambikapur' | 'bilaspur'>('all');
  // Route customization & highway priority state
  const [routeMode, setRouteMode] = useState<'highway' | 'osrm' | 'direct'>('highway');
  const [avoidLanes, setAvoidLanes] = useState<boolean>(true);
  const [segmentOverrides, setSegmentOverrides] = useState<Record<string, 'highway' | 'osrm'>>({});
  const [manualDistanceKm, setManualDistanceKm] = useState<string | null>(null);
  const [isEditingDistance, setIsEditingDistance] = useState<boolean>(false);
  const [manualDistanceInput, setManualDistanceInput] = useState<string>('');
  const [bypassedDetours, setBypassedDetours] = useState<
    Array<{ segmentIndex: number; from: string; to: string; savedKm: number; detourKm: number; highwayKm: number }>
  >([]);
  const [segmentSummaries, setSegmentSummaries] = useState<
    Array<{
      fromId: string;
      toId: string;
      fromName: string;
      toName: string;
      mode: 'highway' | 'osrm';
      distanceKm: number;
      isDetourBypassed: boolean;
      originalOsrmKm?: number;
    }>
  >([]);


  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Parse initialStops whenever modal opens or stops prop changes
  const initialStopsSignature = JSON.stringify(initialStops);
  const initialWaypointsSignature = JSON.stringify(initialWaypoints || []);
  useEffect(() => {
    if (!isOpen) return;

    if (initialWaypoints && initialWaypoints.length > 0) {
      setWaypoints(initialWaypoints);
      return;
    }

    let parsed: RouteWaypoint[] = [];
    if (initialStops && initialStops.length > 0) {
      let prevWp: RouteWaypoint | undefined = undefined;
      initialStops.forEach((stopName, idx) => {
        const wp = resolveStopCoordinate(stopName, idx, allSavedLocations, prevWp);
        parsed.push(wp);
        prevWp = wp;
      });
    }

    setWaypoints(parsed);

    // Background accuracy refinement: for any stop flagged as isCustom (not matched in territory directory),
    // query OpenStreetMap bounded to Central India to verify exact coordinates
    parsed.forEach((wp, wIdx) => {
      if (wp.isCustom) {
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            wp.name
          )}&viewbox=80.0,24.5,84.5,21.5&bounded=0&limit=1&countrycodes=in`
        )
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            if (data && data.length > 0) {
              const matchedLat = parseFloat(data[0].lat);
              const matchedLng = parseFloat(data[0].lon);
              if (!isNaN(matchedLat) && !isNaN(matchedLng)) {
                setWaypoints((current) => {
                  const updated = [...current];
                  if (updated[wIdx] && updated[wIdx].id === wp.id) {
                    updated[wIdx] = {
                      ...updated[wIdx],
                      lat: matchedLat,
                      lng: matchedLng,
                      address: data[0].display_name?.split(',').slice(0, 3).join(', ') || updated[wIdx].address,
                      isCustom: false,
                    };
                  }
                  return updated;
                });
              }
            }
          })
          .catch(() => {});
      }
    });
  }, [isOpen, initialStopsSignature, initialWaypointsSignature]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter: [number, number] =
      waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [23.2883, 81.3522];

    const map = createOptimizedMap(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 11,
      minZoom: 5,
      maxZoom: 19,
    });

    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    accessLinesLayerRef.current = L.layerGroup().addTo(map);

    // Map click to add pinpoint waypoint with high-accuracy reverse geocoding (zoom 18)
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      keepViewportRef.current = true; // Lock viewport so map doesn't zoom out!

      // Smoothly pan map to center right on the user's pinpoint
      map.panTo([lat, lng], { animate: true });

      let name = `Stop (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      let address = '';
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          const road = data.address?.road;
          const villageOrTown =
            data.address?.village ||
            data.address?.town ||
            data.address?.city ||
            data.address?.suburb ||
            data.address?.hamlet;
          const amenity = data.address?.amenity || data.address?.hospital || data.address?.clinic;

          if (amenity && villageOrTown) {
            name = `${amenity}, ${villageOrTown}`;
          } else if (amenity) {
            name = amenity;
          } else if (villageOrTown && road) {
            name = `${villageOrTown} (${road})`;
          } else if (villageOrTown) {
            name = villageOrTown;
          } else if (data.name) {
            name = data.name;
          }

          address = data.display_name?.split(',').slice(0, 3).join(', ') || '';
        }
      } catch {}

      const newWp: RouteWaypoint = {
        id: `wp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        lat,
        lng,
        address,
        isCustom: true,
      };

      handleAddWaypoint(newWp, { keepView: true });

      // Open popup on newly marked pinpoint
      setTimeout(() => {
        const m = markersMapRef.current.get(newWp.id);
        if (m) m.openPopup();
      }, 350);
    });

    mapInstanceRef.current = map;

    // Small delay to ensure container is painted, then trigger size refresh & initial render
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (waypoints.length > 0) {
        renderMarkersAndRoute(map, waypoints);
      } else {
        clearAllMapLayers(map);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (mapInstanceRef.current) {
        clearAllMapLayers(mapInstanceRef.current);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Helper to completely purge all route lines and polylines from the map
  const clearMapRouteLayers = (map?: L.Map | null) => {
    if (routesLayerRef.current) {
      routesLayerRef.current.clearLayers();
    }
    if (polylineLayerRef.current) {
      try {
        polylineLayerRef.current.remove();
      } catch {}
      polylineLayerRef.current = null;
    }
    const targetMap = map || mapInstanceRef.current;
    if (targetMap) {
      try {
        targetMap.eachLayer((layer: any) => {
          if (layer !== tileLayerRef.current && layer instanceof L.Polyline) {
            try {
              targetMap.removeLayer(layer);
            } catch {}
          }
        });
      } catch {}
    }
  };

  // Helper to completely purge all markers, routes, lines, and popups from the map
  const clearAllMapLayers = (map?: L.Map | null) => {
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }
    markersMapRef.current.clear();
    if (accessLinesLayerRef.current) {
      accessLinesLayerRef.current.clearLayers();
    }
    clearMapRouteLayers(map);
    const targetMap = map || mapInstanceRef.current;
    if (targetMap) {
      try {
        targetMap.closePopup();
        targetMap.eachLayer((layer: any) => {
          if (
            layer !== tileLayerRef.current &&
            (layer instanceof L.Polyline || layer instanceof L.Marker || layer instanceof L.Polygon)
          ) {
            try {
              targetMap.removeLayer(layer);
            } catch {}
          }
        });
      } catch {}
    }
  };

  // Automatically sync map whenever waypoints list updates (including when all waypoints are removed!)
  useEffect(() => {
    if (mapInstanceRef.current) {
      renderMarkersAndRoute(mapInstanceRef.current, waypoints);
    }
  }, [waypoints, routeMode, avoidLanes, segmentOverrides]);

  // Toggle street vs satellite
  const handleToggleMapMode = () => {
    const nextMode = mapMode === 'street' ? 'satellite' : 'street';
    setMapMode(nextMode);
    if (mapInstanceRef.current) {
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
      }
      tileLayerRef.current = createResilientTileLayer(nextMode).addTo(mapInstanceRef.current);
    }
  };

  // Render Waypoints & Polyline Route on map (markers are draggable to fine-tune exact locations)
  const renderMarkersAndRoute = async (map: L.Map, currentWaypoints: RouteWaypoint[]) => {
    // 1. Advance request ID and cancel any previous in-flight fetch
    const currentRequestId = ++renderRequestIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!map) return;

    // 2. Clear markers, popups, and route lines
    if (markersLayerRef.current) markersLayerRef.current.clearLayers();
    markersMapRef.current.clear();
    if (accessLinesLayerRef.current) accessLinesLayerRef.current.clearLayers();
    clearMapRouteLayers(map);

    // 3. If no waypoints exist, wipe everything and reset calculations
    if (currentWaypoints.length === 0) {
      clearAllMapLayers(map);
      setCalculatedKm(0);
      setBypassedDetours([]);
      setSegmentSummaries([]);
      setIsCalculatingRoute(false);
      return;
    }

    // 4. If only 1 waypoint exists, ensure route lines and distance are completely cleared
    if (currentWaypoints.length === 1) {
      clearMapRouteLayers(map);
      setCalculatedKm(0);
      setBypassedDetours([]);
      setSegmentSummaries([]);
      setIsCalculatingRoute(false);
    }

    const bounds: [number, number][] = [];

    // 1. Draw distinct numbered badges for each stop (or highway shield badge for via points)
    currentWaypoints.forEach((wp, idx) => {
      bounds.push([wp.lat, wp.lng]);
      const isStart = idx === 0;
      const isEnd = idx === currentWaypoints.length - 1 && currentWaypoints.length > 1;
      const isVia = !!wp.isViaPoint;

      const bgColor = isVia ? '#D97706' : isStart ? '#059669' : isEnd ? '#7C3AED' : '#2563EB';
      const badgeText = isVia ? '🛣️' : `${idx + 1}`;
      const roleLabel = isVia ? 'Highway Anchor (Via)' : isStart ? 'Start / HQ' : isEnd ? 'Final Area' : `Stop ${idx + 1}`;

      const iconHtml = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${bgColor};
          color: #FFFFFF;
          font-weight: 800;
          font-size: ${isVia ? '11px' : '13px'};
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          position: relative;
          cursor: grab;
        ">
          ${badgeText}
          <div style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid ${bgColor};
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'route-waypoint-pin',
        html: iconHtml,
        iconSize: [32, 38],
        iconAnchor: [16, 38],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([wp.lat, wp.lng], {
        icon: customIcon,
        draggable: true,
        autoPan: true,
      });

      marker.bindTooltip('🖐️ Drag to adjust location', {
        direction: 'top',
        offset: [0, -38],
        opacity: 0.9,
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 175px;">
          <div style="font-size: 10px; font-weight: 800; color: ${bgColor}; text-transform: uppercase;">
            ${roleLabel}
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 2px;">
            ${wp.name}
          </div>
          ${wp.address ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">${wp.address}</div>` : ''}
          <div style="font-size: 10px; color: #2563EB; font-weight: 700; margin-top: 4px;">
            📍 ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}
          </div>
          <div style="font-size: 10px; color: #94A3B8; margin-top: 4px; font-style: italic;">
            Tip: Drag pin to fine-tune exact location on the highway or clinic
          </div>
        </div>
      `);

      marker.on('dragstart', () => {
        isDraggingRef.current = true;
        marker.closePopup();
      });

      marker.on('dragend', async () => {
        const newPos = marker.getLatLng();
        const newLat = parseFloat(newPos.lat.toFixed(6));
        const newLng = parseFloat(newPos.lng.toFixed(6));

        setWaypoints((prev) => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              lat: newLat,
              lng: newLng,
              isCustom: true,
            };
          }
          return next;
        });

        // Background reverse geocode to fetch updated landmark / address details
        try {
          const revRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            const shortAddr = revData.display_name?.split(',').slice(0, 3).join(', ');
            if (shortAddr) {
              setWaypoints((prev) => {
                const next = [...prev];
                if (next[idx]) {
                  next[idx] = {
                    ...next[idx],
                    address: shortAddr,
                  };
                }
                return next;
              });
            }
          }
        } catch {}

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 400);
      });

      markersMapRef.current.set(wp.id, marker);
      markersLayerRef.current?.addLayer(marker);
    });

    // 2. Calculate Road Routing & Polyline if 2 or more waypoints exist
    if (currentWaypoints.length >= 2) {
      setIsCalculatingRoute(true);
      const newBypassedDetours: Array<{
        segmentIndex: number;
        from: string;
        to: string;
        savedKm: number;
        detourKm: number;
        highwayKm: number;
      }> = [];
      const newSegmentSummaries: Array<{
        fromId: string;
        toId: string;
        fromName: string;
        toName: string;
        mode: 'highway' | 'osrm';
        distanceKm: number;
        isDetourBypassed: boolean;
        originalOsrmKm?: number;
      }> = [];

      try {
        if (routeMode === 'direct') {
          // Direct Highway Corridor mode: connects all waypoints along direct road corridors
          let totalKm = 0;
          const linePoints: [number, number][] = [];
          for (let i = 0; i < currentWaypoints.length - 1; i++) {
            const w1 = currentWaypoints[i];
            const w2 = currentWaypoints[i + 1];
            const dDirect = calculateHaversineKm(w1.lat, w1.lng, w2.lat, w2.lng);
            const segKm = Math.max(0.1, Math.round(dDirect * 1.05 * 10) / 10);
            totalKm += segKm;
            if (linePoints.length === 0) {
              linePoints.push([w1.lat, w1.lng], [w2.lat, w2.lng]);
            } else {
              linePoints.push([w2.lat, w2.lng]);
            }
            newSegmentSummaries.push({
              fromId: w1.id,
              toId: w2.id,
              fromName: w1.name,
              toName: w2.name,
              mode: 'highway',
              distanceKm: segKm,
              isDetourBypassed: false,
            });
          }
          if (currentRequestId !== renderRequestIdRef.current || controller.signal.aborted) return;

          if (manualDistanceKm === null) {
            setCalculatedKm(Math.round(totalKm * 10) / 10);
          }
          setSegmentSummaries(newSegmentSummaries);
          setBypassedDetours([]);

          // Draw clean highway corridor polyline
          const glowPoly = L.polyline(linePoints, {
            color: '#93C5FD',
            weight: 8,
            opacity: 0.5,
            lineCap: 'round',
            lineJoin: 'round',
          });
          const routePoly = L.polyline(linePoints, {
            color: '#2563EB',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          });
          clearMapRouteLayers(map);
          if (routesLayerRef.current) {
            glowPoly.addTo(routesLayerRef.current);
            routePoly.addTo(routesLayerRef.current);
          } else {
            const polyGroup = L.layerGroup([glowPoly, routePoly]).addTo(map);
            polylineLayerRef.current = polyGroup as any;
          }
        } else {
          // Highway or OSRM mode: query OSRM driving engine
          const coordsParam = currentWaypoints.map((w) => `${w.lng},${w.lat}`).join(';');
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson&continue_straight=false&steps=true`;

          const res = await fetch(osrmUrl, { signal: controller.signal });
          if (currentRequestId !== renderRequestIdRef.current || controller.signal.aborted) return;
          if (res.ok) {
            const data = await res.json();
            if (currentRequestId !== renderRequestIdRef.current || controller.signal.aborted) return;
            if (data.routes && data.routes[0] && data.routes[0].legs) {
              const combinedLinePoints: [number, number][] = [];
              let totalDistanceKm = 0;

              for (let i = 0; i < currentWaypoints.length - 1; i++) {
                const wStart = currentWaypoints[i];
                const wEnd = currentWaypoints[i + 1];
                const segKey = `${wStart.id}_${wEnd.id}`;
                const leg = data.routes[0].legs[i];
                const dDirect = calculateHaversineKm(wStart.lat, wStart.lng, wEnd.lat, wEnd.lng);

                // Extract leg points from steps
                const osrmLegPoints: [number, number][] = [];
                if (leg && leg.steps) {
                  leg.steps.forEach((step: any) => {
                    if (step.geometry && step.geometry.coordinates) {
                      step.geometry.coordinates.forEach((c: [number, number]) => {
                        osrmLegPoints.push([c[1], c[0]]);
                      });
                    }
                  });
                }

                const dOsrmKm = leg ? Math.round((leg.distance / 1000) * 10) / 10 : Math.round(dDirect * 1.25 * 10) / 10;
                const detourRatio = dDirect > 0 ? dOsrmKm / dDirect : 1;

                // Check lateral detour deviation
                let maxDeviationKm = 0;
                if (osrmLegPoints.length > 2) {
                  for (let pIdx = 1; pIdx < osrmLegPoints.length - 1; pIdx++) {
                    const dev = pointToLineDistanceKm(
                      osrmLegPoints[pIdx][0],
                      osrmLegPoints[pIdx][1],
                      wStart.lat,
                      wStart.lng,
                      wEnd.lat,
                      wEnd.lng
                    );
                    if (dev > maxDeviationKm) maxDeviationKm = dev;
                  }
                }

                // Detect if OSRM is taking an unnatural detour into residential alleys
                const isDetour =
                  (dDirect < 6.0 && (detourRatio > 1.30 || maxDeviationKm > 0.35 * dDirect)) ||
                  (dDirect >= 6.0 && (detourRatio > 1.45 || maxDeviationKm > 0.45 * dDirect));

                // Determine active mode for this segment
                let activeMode: 'highway' | 'osrm' = 'highway';
                if (segmentOverrides[segKey]) {
                  activeMode = segmentOverrides[segKey];
                } else if (routeMode === 'osrm') {
                  activeMode = 'osrm';
                } else if (routeMode === 'highway') {
                  if (avoidLanes && isDetour) {
                    activeMode = 'highway';
                  } else if (osrmLegPoints.length > 0) {
                    activeMode = 'osrm';
                  } else {
                    activeMode = 'highway';
                  }
                }

                let segPoints: [number, number][] = [];
                let segKm = 0;

                if (activeMode === 'highway') {
                  // Direct highway corridor
                  segPoints = [
                    [wStart.lat, wStart.lng],
                    [wEnd.lat, wEnd.lng],
                  ];
                  segKm = Math.max(0.1, Math.round(dDirect * 1.05 * 10) / 10);
                  if (isDetour) {
                    newBypassedDetours.push({
                      segmentIndex: i,
                      from: wStart.name,
                      to: wEnd.name,
                      savedKm: Math.round((dOsrmKm - segKm) * 10) / 10,
                      detourKm: dOsrmKm,
                      highwayKm: segKm,
                    });
                  }
                } else {
                  // Standard OSRM road
                  segPoints = osrmLegPoints.length > 0 ? osrmLegPoints : [
                    [wStart.lat, wStart.lng],
                    [wEnd.lat, wEnd.lng],
                  ];
                  segKm = dOsrmKm;
                }

                // Add to combined path
                if (combinedLinePoints.length === 0) {
                  combinedLinePoints.push(...segPoints);
                } else {
                  combinedLinePoints.push(...segPoints.slice(1));
                }
                totalDistanceKm += segKm;

                newSegmentSummaries.push({
                  fromId: wStart.id,
                  toId: wEnd.id,
                  fromName: wStart.name,
                  toName: wEnd.name,
                  mode: activeMode,
                  distanceKm: segKm,
                  isDetourBypassed: isDetour && activeMode === 'highway',
                  originalOsrmKm: dOsrmKm,
                });
              }

              // Ensure polyline matches exact pinpoint coordinates at ends
              if (combinedLinePoints.length > 0) {
                const firstWp = currentWaypoints[0];
                const lastWp = currentWaypoints[currentWaypoints.length - 1];
                combinedLinePoints[0] = [firstWp.lat, firstWp.lng];
                combinedLinePoints[combinedLinePoints.length - 1] = [lastWp.lat, lastWp.lng];
              }

              if (manualDistanceKm === null) {
                setCalculatedKm(Math.round(totalDistanceKm * 10) / 10);
              }
              setBypassedDetours(newBypassedDetours);
              setSegmentSummaries(newSegmentSummaries);

              // Render polyline with glow casing
              const glowPoly = L.polyline(combinedLinePoints, {
                color: '#93C5FD',
                weight: 8,
                opacity: 0.6,
                lineCap: 'round',
                lineJoin: 'round',
              });
              const routePoly = L.polyline(combinedLinePoints, {
                color: '#2563EB',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              });
              clearMapRouteLayers(map);
              if (routesLayerRef.current) {
                glowPoly.addTo(routesLayerRef.current);
                routePoly.addTo(routesLayerRef.current);
              } else {
                const polyGroup = L.layerGroup([glowPoly, routePoly]).addTo(map);
                polylineLayerRef.current = polyGroup as any;
              }
            } else {
              fallbackPolyline(map, currentWaypoints);
            }
          } else {
            fallbackPolyline(map, currentWaypoints);
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted || currentRequestId !== renderRequestIdRef.current) {
          return;
        }
        fallbackPolyline(map, currentWaypoints);
      } finally {
        if (currentRequestId === renderRequestIdRef.current) {
          setIsCalculatingRoute(false);
        }
      }
    } else {
      clearMapRouteLayers(map);
      setCalculatedKm(0);
      setBypassedDetours([]);
      setSegmentSummaries([]);
      setIsCalculatingRoute(false);
    }

    // Only fitBounds on initial modal load, NOT during drag or when user clicks to mark a pinpoint location!
    if (bounds.length > 0 && !isDraggingRef.current && !keepViewportRef.current) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [55, 55], maxZoom: 14 });
    }
    keepViewportRef.current = false;
  };

  const fallbackPolyline = (map: L.Map, pts: RouteWaypoint[]) => {
    if (pts.length < 2) {
      clearMapRouteLayers(map);
      return;
    }
    clearMapRouteLayers(map);
    let totalHaversine = 0;
    const latlngs: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      latlngs.push([pts[i].lat, pts[i].lng]);
      if (i > 0) {
        totalHaversine += calculateHaversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
      }
    }
    // Multiply by 1.15 road curvature factor for realistic state road estimation
    const estimatedRoadKm = Math.round(totalHaversine * 1.15 * 10) / 10;
    if (manualDistanceKm === null) {
      setCalculatedKm(estimatedRoadKm);
    }

    const glow = L.polyline(latlngs, {
      color: '#93C5FD',
      weight: 7,
      opacity: 0.5,
      dashArray: '8, 6',
    });
    const poly = L.polyline(latlngs, {
      color: '#3B82F6',
      weight: 4,
      dashArray: '8, 6',
      opacity: 0.9,
    });
    if (routesLayerRef.current) {
      glow.addTo(routesLayerRef.current);
      poly.addTo(routesLayerRef.current);
    } else {
      const group = L.layerGroup([glow, poly]).addTo(map);
      polylineLayerRef.current = group as any;
    }
  };

  const handleAddWaypoint = (newWp: RouteWaypoint, options?: { forceEnd?: boolean; keepView?: boolean }) => {
    if (options?.keepView) {
      keepViewportRef.current = true;
    }
    setWaypoints((prev) => {
      if (prev.length <= 1 || options?.forceEnd) {
        return [...prev, newWp];
      }
      // Smart insertion to prevent accidental 50km backtracking loops
      const insertIdx = findBestInsertionIndex(prev, newWp);
      const copy = [...prev];
      copy.splice(insertIdx, 0, newWp);
      return copy;
    });
  };

  const handleRemoveWaypoint = (id: string) => {
    keepViewportRef.current = true;
    setWaypoints((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      if (remaining.length === 0) {
        renderRequestIdRef.current++;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setCalculatedKm(0);
        setBypassedDetours([]);
        setSegmentSummaries([]);
        setIsCalculatingRoute(false);
        if (mapInstanceRef.current) {
          clearAllMapLayers(mapInstanceRef.current);
        }
      } else if (remaining.length === 1) {
        renderRequestIdRef.current++;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setCalculatedKm(0);
        setBypassedDetours([]);
        setSegmentSummaries([]);
        setIsCalculatingRoute(false);
        if (mapInstanceRef.current) {
          clearMapRouteLayers(mapInstanceRef.current);
        }
      }
      return remaining;
    });
  };

  const handleMoveWaypoint = (index: number, direction: 'UP' | 'DOWN') => {
    keepViewportRef.current = true;
    setWaypoints((prev) => {
      const target = direction === 'UP' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  // Fly to exact street/building level (zoom 17) pinpoint location
  const handleLocateWaypoint = (wp: RouteWaypoint) => {
    if (!mapInstanceRef.current) return;
    keepViewportRef.current = true;
    mapInstanceRef.current.flyTo([wp.lat, wp.lng], 17, { animate: true, duration: 0.8 });
    const m = markersMapRef.current.get(wp.id);
    if (m) {
      setTimeout(() => {
        m.openPopup();
      }, 500);
    }
  };


  const handleToggleViaPoint = (id: string) => {
    keepViewportRef.current = true;
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isViaPoint: !w.isViaPoint } : w))
    );
  };

  const handleToggleSegmentMode = (fromId: string, toId: string) => {
    const segKey = `${fromId}_${toId}`;
    setSegmentOverrides((prev) => {
      const current = prev[segKey] || (routeMode === 'highway' ? 'highway' : 'osrm');
      const next = current === 'highway' ? 'osrm' : 'highway';
      return { ...prev, [segKey]: next };
    });
  };

  // 1-Click route sequence optimizer: orders intermediate stops to minimize total distance
  const handleOptimizeRouteSequence = () => {
    if (waypoints.length <= 2) return;
    const start = waypoints[0];
    const unvisited = [...waypoints.slice(1)];
    const ordered: RouteWaypoint[] = [start];

    let current = start;
    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateHaversineKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      const [nextStop] = unvisited.splice(nearestIdx, 1);
      ordered.push(nextStop);
      current = nextStop;
    }

    keepViewportRef.current = true;
    setWaypoints(ordered);
  };

  // Fit all stops on screen when user explicitly requests it
  const handleFitEntireRoute = () => {
    if (!mapInstanceRef.current || waypoints.length === 0) return;
    const b: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
    mapInstanceRef.current.fitBounds(b as L.LatLngBoundsExpression, { padding: [55, 55], maxZoom: 14 });
  };

  // Check if route has unnecessary backtracking
  const backtrackingWarning = (() => {
    if (waypoints.length <= 2) return null;
    let currentDist = 0;
    for (let i = 1; i < waypoints.length; i++) {
      currentDist += calculateHaversineKm(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
    }

    const start = waypoints[0];
    const unvisited = [...waypoints.slice(1)];
    let optDist = 0;
    let curr = start;
    while (unvisited.length > 0) {
      let nIdx = 0;
      let nDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateHaversineKm(curr.lat, curr.lng, unvisited[i].lat, unvisited[i].lng);
        if (d < nDist) {
          nDist = d;
          nIdx = i;
        }
      }
      const [nxt] = unvisited.splice(nIdx, 1);
      optDist += nDist;
      curr = nxt;
    }

    const excessKm = Math.round((currentDist - optDist) * 1.25);
    if (excessKm >= 8) {
      return { excessKm };
    }
    return null;
  })();

  const handleClearAll = () => {
    // 1. Immediately abort any active routing/reverse geocode operations
    renderRequestIdRef.current++;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // 2. Wipe state
    setWaypoints([]);
    setCalculatedKm(0);
    setBypassedDetours([]);
    setSegmentSummaries([]);
    setIsCalculatingRoute(false);
    // 3. Completely purge all markers, polylines, and layers from the map canvas
    if (mapInstanceRef.current) {
      clearAllMapLayers(mapInstanceRef.current);
    }
  };

  // High-accuracy location finding with GPS parsing, local directory, clinics, and viewbox-bounded OSM
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const results: SearchResultItem[] = [];

      // 1. Direct GPS coordinate entry (e.g. "23.3673, 81.7267", "23.3673 81.7267", "23.3673° N, 81.7267° E")
      const coordClean = query.replace(/[°NSEWnsew]/g, ' ').trim().replace(/\s+/g, ' ');
      const coordParts = coordClean.split(/[\s,]+/);
      if (coordParts.length === 2) {
        const pLat = parseFloat(coordParts[0]);
        const pLng = parseFloat(coordParts[1]);
        if (!isNaN(pLat) && !isNaN(pLng) && pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
          results.push({
            id: `gps-${Date.now()}`,
            name: `Direct GPS Pin (${pLat.toFixed(4)}, ${pLng.toFixed(4)})`,
            subtitle: `Coordinates: ${pLat.toFixed(6)}, ${pLng.toFixed(6)} • Exact Coordinates`,
            lat: pLat,
            lng: pLng,
            category: 'GPS',
          });

          // Fast reverse geocoding to find landmark name at these coordinates
          try {
            const revRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pLat}&lon=${pLng}&zoom=18&addressdetails=1`
            );
            if (revRes.ok) {
              const revData = await revRes.json();
              const placeName =
                revData.name ||
                revData.address?.amenity ||
                revData.address?.hospital ||
                revData.address?.clinic ||
                revData.address?.village ||
                revData.address?.town ||
                revData.address?.road;
              if (placeName) {
                results[0].name = `${placeName} (${pLat.toFixed(4)}, ${pLng.toFixed(4)})`;
                results[0].subtitle = revData.display_name?.split(',').slice(0, 3).join(', ') || results[0].subtitle;
              }
            }
          } catch {}
        }
      }

      const qLower = query.toLowerCase();

      // 2. Search local territory directory
      TERRITORY_DIRECTORY.forEach((h) => {
        const nameMatch = h.name.toLowerCase().includes(qLower);
        const aliasMatch = h.aliases.some((a) => a.toLowerCase().includes(qLower));
        const areaMatch = h.area.toLowerCase().includes(qLower);
        if (nameMatch || aliasMatch || areaMatch) {
          results.push({
            id: `hub-${h.name}`,
            name: h.name,
            subtitle: `${h.area} • ${h.region.toUpperCase()}`,
            lat: h.lat,
            lng: h.lng,
            category: 'Hub',
            address: h.area,
          });
        }
      });

      // 3. Search saved doctor clinics & field locations
      allSavedLocations.forEach((l) => {
        if (!l.latitude || !l.longitude) return;
        const nameMatch = (l.name || '').toLowerCase().includes(qLower);
        const clinicMatch = (l.clinic || '').toLowerCase().includes(qLower);
        const docMatch = (l.doctor_name || '').toLowerCase().includes(qLower);
        const addrMatch = (l.address || '').toLowerCase().includes(qLower);
        if (nameMatch || clinicMatch || docMatch || addrMatch) {
          const displayTitle = l.clinic || l.name;
          const details = [l.doctor_name, l.address, l.category].filter(Boolean).join(' • ');
          results.push({
            id: `clinic-${l.id}`,
            name: displayTitle,
            subtitle: details || 'Saved Clinic Location',
            lat: l.latitude,
            lng: l.longitude,
            category: 'Clinic',
            address: l.address,
          });
        }
      });

      // 4. Online OpenStreetMap Geocoding prioritized by map viewbox / regional envelope
      let viewboxParam = '80.0,24.5,84.5,21.5'; // Central India (Shahdol, Anuppur, Bilaspur, Surguja, Koriya)
      if (mapInstanceRef.current) {
        const b = mapInstanceRef.current.getBounds();
        viewboxParam = `${b.getWest().toFixed(4)},${b.getNorth().toFixed(4)},${b.getEast().toFixed(4)},${b.getSouth().toFixed(4)}`;
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&viewbox=${viewboxParam}&bounded=0&limit=6&countrycodes=in&addressdetails=1`;

      const res = await fetch(nominatimUrl);
      if (res.ok) {
        const data = await res.json();
        data.forEach((d: any, idx: number) => {
          const primaryName =
            d.name ||
            d.address?.village ||
            d.address?.town ||
            d.address?.city ||
            d.address?.suburb ||
            d.display_name.split(',')[0];
          const subParts = [
            d.address?.county || d.address?.state_district,
            d.address?.state,
          ].filter(Boolean);
          const subtitle = subParts.length > 0 ? subParts.join(', ') : d.display_name;

          // Don't add duplicate if coordinates match an existing item closely
          const dLat = parseFloat(d.lat);
          const dLng = parseFloat(d.lon);
          const isDup = results.some(
            (r) => Math.abs(r.lat - dLat) < 0.001 && Math.abs(r.lng - dLng) < 0.001
          );
          if (!isDup) {
            results.push({
              id: `osm-${idx}-${d.place_id || Date.now()}`,
              name: primaryName,
              subtitle: subtitle,
              lat: dLat,
              lng: dLng,
              category: 'Map',
              address: d.display_name,
            });
          }
        });
      }

      setSearchResults(results);
    } catch {
      // Keep existing results if network fails
    } finally {
      setIsSearching(false);
    }
  };

  // Filtered Hubs for Quick Add by Belt
  const filteredHubs =
    selectedBelt === 'all'
      ? TERRITORY_DIRECTORY
      : TERRITORY_DIRECTORY.filter((h) => h.region === selectedBelt);

  // Suggested Batch Name from stops
  const suggestedBatchName =
    waypoints.length >= 2
      ? `${waypoints[0].name} - ${waypoints.slice(1).map((w) => w.name).join(' - ')} Circuit`
      : waypoints.length === 1
      ? `${waypoints[0].name} Circuit`
      : 'Custom Route Circuit';

  const handleApply = async () => {
    if (waypoints.length === 0 || isApplying) return;
    setIsApplying(true);
    try {
      const activeDistance = manualDistanceKm !== null ? parseFloat(manualDistanceKm) || calculatedKm : calculatedKm;
      // Filter out pure via anchors from stops list if there are regular stops
      const regularStops = waypoints.filter((w) => !w.isViaPoint);
      const stopNames = (regularStops.length > 0 ? regularStops : waypoints).map((w) => w.name);

      await onApplyRoute({
        stops: stopNames,
        distanceKm: activeDistance || (waypoints.length > 1 ? 30 : 15),
        suggestedBatchName,
        waypoints,
      });
      onClose();
    } catch (err) {
      console.error('Error applying route:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const effectiveDistanceKm = manualDistanceKm !== null ? parseFloat(manualDistanceKm) || calculatedKm : calculatedKm;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          maxWidth: '1200px',
          width: '100%',
          height: '92vh',
          maxHeight: '860px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1.5px solid #CBD5E1',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 22px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={20} color="#38BDF8" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                {batchTitle ? `Route Circuit Map: ${batchTitle}` : 'Interactive Route Circuit & Distance Builder'}
              </h2>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
              Select origin HQ, intermediate stops, and destination area. Driving distance (one-way km) is calculated automatically.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Split: Left Sidebar & Right Interactive Map */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(350px, 390px) 1fr',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Left Panel: Waypoint Manager, Search & Distance Metrics */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#F8FAFC',
              borderRight: '1.5px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
            }}
          >
            {/* Quick Pick Regional Hubs with Belt Tabs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  ⚡ Quick Add Key Towns:
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['all', 'shahdol', 'kotma', 'ambikapur', 'bilaspur'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBelt(b)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: selectedBelt === b ? '#2563EB' : '#E2E8F0',
                        color: selectedBelt === b ? '#FFFFFF' : '#475569',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '2px' }}>
                {filteredHubs.map((hub) => {
                  const isAdded = waypoints.some((w) => w.name.toLowerCase() === hub.name.toLowerCase());
                  return (
                    <button
                      key={hub.name}
                      type="button"
                      onClick={() => {
                        handleAddWaypoint({
                          id: `hub-${hub.name}-${Date.now()}`,
                          name: hub.name,
                          lat: hub.lat,
                          lng: hub.lng,
                          address: hub.area,
                        });
                      }}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '16px',
                        border: isAdded ? '1px solid #10B981' : '1px solid #CBD5E1',
                        backgroundColor: isAdded ? '#ECFDF5' : '#FFFFFF',
                        color: isAdded ? '#065F46' : '#334155',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Add ${hub.name} (${hub.area}) to circuit`}
                    >
                      <Plus size={11} />
                      {hub.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* City, Tehsil, Clinic, or GPS Coordinate Search Box */}
            <div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search town, tehsil, clinic, or GPS (lat, lng)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 30px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                    }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: '#94A3B8' }} />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  style={{
                    padding: '7px 12px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSearching ? '...' : 'Find'}
                </button>
              </form>

              {/* Enhanced Search Results Dropdown List with Badges and Coordinates */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    marginTop: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #93C5FD',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#64748B',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '1px solid #E2E8F0',
                      textTransform: 'uppercase',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Found Locations ({searchResults.length}):</span>
                    <span
                      style={{ cursor: 'pointer', color: '#2563EB', textTransform: 'none', fontWeight: 600 }}
                      onClick={() => setSearchResults([])}
                    >
                      Dismiss
                    </span>
                  </div>
                  {searchResults.map((sr) => {
                    const badgeBg =
                      sr.category === 'GPS'
                        ? '#4F46E5'
                        : sr.category === 'Clinic'
                        ? '#059669'
                        : sr.category === 'Hub'
                        ? '#2563EB'
                        : '#64748B';

                    return (
                      <div
                        key={sr.id}
                        onClick={() => {
                          handleAddWaypoint({
                            id: `wp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                            name: sr.name,
                            lat: sr.lat,
                            lng: sr.lng,
                            address: sr.address || sr.subtitle,
                            isCustom: sr.category !== 'Hub',
                          });
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([sr.lat, sr.lng], 14, { animate: true });
                          }
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        style={{
                          padding: '7px 10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          color: '#1E293B',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: badgeBg,
                                color: '#FFFFFF',
                                textTransform: 'uppercase',
                                flexShrink: 0,
                              }}
                            >
                              {sr.category}
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {sr.name}
                            </span>
                          </div>
                          {sr.subtitle && (
                            <div
                              style={{
                                fontSize: '0.7rem',
                                color: '#64748B',
                                marginTop: '1px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {sr.subtitle}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'monospace', flexShrink: 0 }}>
                          {sr.lat.toFixed(3)}, {sr.lng.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Stops Ribbon List */}
            <div style={{ flex: 1, minHeight: '150px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Ordered Circuit Stops ({waypoints.length}):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {waypoints.length > 2 && (
                    <button
                      type="button"
                      onClick={handleOptimizeRouteSequence}
                      style={{
                        border: '1px solid #93C5FD',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '4px',
                        padding: '2px 7px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Sort intermediate stops along shortest highway path without backtracking"
                    >
                      <Sparkles size={11} /> Auto-Sort
                    </button>
                  )}
                  {waypoints.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#EF4444',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Trash2 size={12} />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Backtracking alert when route sequence is out of order and adds miles */}
              {backtrackingWarning && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    fontSize: '0.72rem',
                    color: '#92400E',
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0 }} />
                    <span>Sequence adds ~{backtrackingWarning.excessKm} km from backtracking</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOptimizeRouteSequence}
                    style={{
                      padding: '2px 7px',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Sparkles size={10} /> Auto-Sort
                  </button>
                </div>
              )}

              {waypoints.length === 0 ? (
                <div
                  style={{
                    padding: '24px 12px',
                    textAlign: 'center',
                    border: '1.5px dashed #CBD5E1',
                    borderRadius: '8px',
                    color: '#64748B',
                    fontSize: '0.8rem',
                  }}
                >
                  <MapPin size={24} color="#94A3B8" style={{ margin: '0 auto 6px auto' }} />
                  <div>No stops picked yet.</div>
                  <div style={{ fontSize: '0.72rem', marginTop: '2px', color: '#94A3B8' }}>
                    Click towns above, search by name/GPS, or click directly on map.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '210px' }}>
                  {waypoints.map((wp, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === waypoints.length - 1 && waypoints.length > 1;
                    const isVia = !!wp.isViaPoint;
                    const badgeBg = isVia ? '#D97706' : isStart ? '#059669' : isEnd ? '#7C3AED' : '#2563EB';
                    const badgeText = isVia ? '🛣️' : `${idx + 1}`;
                    const roleLabel = isVia ? 'Highway Route Anchor (Via)' : isStart ? 'Origin (Start HQ)' : isEnd ? 'Final Destination' : 'Transit Stop';
                    const prevSummary = idx > 0 && segmentSummaries[idx - 1] ? segmentSummaries[idx - 1] : null;

                    return (
                      <React.Fragment key={wp.id}>
                        {/* Connecting Road Segment Card */}
                        {prevSummary && (
                          <div
                            style={{
                              padding: '5px 8px',
                              margin: '1px 0 3px 22px',
                              backgroundColor: prevSummary.mode === 'highway' ? '#EFF6FF' : '#F8FAFC',
                              border: `1px dashed ${prevSummary.mode === 'highway' ? '#93C5FD' : '#CBD5E1'}`,
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.71rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontWeight: 800, color: prevSummary.mode === 'highway' ? '#1D4ED8' : '#475569' }}>
                                {prevSummary.mode === 'highway' ? '🛣️ Highway Corridor' : '🚗 Road Route'}
                              </span>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>({prevSummary.distanceKm} km)</span>
                              {prevSummary.isDetourBypassed && (
                                <span
                                  style={{
                                    fontSize: '0.62rem',
                                    backgroundColor: '#DCFCE7',
                                    color: '#15803D',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontWeight: 800,
                                  }}
                                  title="Detour through residential lanes was bypassed in favor of the direct highway corridor"
                                >
                                  Alley Bypassed
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSegmentMode(prevSummary.fromId, prevSummary.toId)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#2563EB',
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                padding: '1px 5px',
                                textDecoration: 'underline',
                              }}
                              title="Toggle between Highway Corridor and Standard Road Route for this specific segment"
                            >
                              {prevSummary.mode === 'highway' ? 'Allow Lane Route' : 'Stick to Highway'}
                            </button>
                          </div>
                        )}

                        {/* Stop Card */}
                        <div
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: `1px solid ${isVia ? '#FDE68A' : isStart ? '#A7F3D0' : isEnd ? '#DDD6FE' : '#E2E8F0'}`,
                            borderRadius: '6px',
                            padding: '7px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: badgeBg,
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isVia ? '0.68rem' : '0.72rem',
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {badgeText}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {wp.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: isVia ? '#D97706' : isStart ? '#059669' : isEnd ? '#7C3AED' : '#64748B',
                                    fontWeight: 700,
                                  }}
                                >
                                  {roleLabel}
                                </span>
                                <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                                  • {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleViaPoint(wp.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: isVia ? '#D97706' : '#94A3B8',
                                padding: '3px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title={isVia ? 'Highway Anchor (Click to convert to official MR visit stop)' : 'Click to convert to Highway Route Anchor (guides route without adding clinic stop)'}
                            >
                              <Milestone size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLocateWaypoint(wp)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#2563EB',
                                padding: '3px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Locate & zoom to stop on map"
                            >
                              <Crosshair size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveWaypoint(idx, 'UP')}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                color: idx === 0 ? '#CBD5E1' : '#64748B',
                                padding: '2px',
                              }}
                              title="Move Up"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === waypoints.length - 1}
                              onClick={() => handleMoveWaypoint(idx, 'DOWN')}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: idx === waypoints.length - 1 ? 'not-allowed' : 'pointer',
                                color: idx === waypoints.length - 1 ? '#CBD5E1' : '#64748B',
                                padding: '2px',
                              }}
                              title="Move Down"
                            >
                              <ChevronDown size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveWaypoint(wp.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#EF4444',
                                padding: '2px',
                              }}
                              title="Remove Stop"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Driving Distance & Reimbursement Metrics Panel */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #CBD5E1',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Car size={16} color="#2563EB" />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A' }}>
                  Driving Distance Calculation:
                </span>
                {isCalculatingRoute && (
                  <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, marginLeft: 'auto' }}>
                    Computing Road Km...
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: '#EFF6FF', borderRadius: '6px', padding: '8px 10px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                      One-Way Distance
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingDistance(!isEditingDistance);
                        setManualDistanceInput(String(manualDistanceKm ?? calculatedKm));
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#2563EB',
                        cursor: 'pointer',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '0 2px',
                      }}
                      title="Manually override route distance"
                    >
                      <Edit2 size={11} /> {isEditingDistance ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {isEditingDistance ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={manualDistanceInput}
                        onChange={(e) => setManualDistanceInput(e.target.value)}
                        style={{
                          width: '75px',
                          padding: '2px 6px',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          borderRadius: '4px',
                          border: '1.5px solid #2563EB',
                          color: '#1E293B',
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E40AF' }}>km</span>
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseFloat(manualDistanceInput);
                          if (!isNaN(val) && val > 0) {
                            setManualDistanceKm(val.toFixed(1));
                          }
                          setIsEditingDistance(false);
                        }}
                        style={{
                          padding: '3px 7px',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Set
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1D4ED8' }}>
                        {effectiveDistanceKm > 0 ? `${effectiveDistanceKm} km` : '0 km'}
                      </span>
                      {manualDistanceKm !== null && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: 800,
                          }}
                          title="Manual custom distance applied"
                        >
                          Custom
                        </span>
                      )}
                    </div>
                  )}

                  {manualDistanceKm !== null && !isEditingDistance && (
                    <button
                      type="button"
                      onClick={() => setManualDistanceKm(null)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#D97706',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <RotateCcw size={10} /> Reset to Auto ({calculatedKm} km)
                    </button>
                  )}
                </div>

                <div style={{ backgroundColor: '#F0FDF4', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    Round-Trip (2-Way)
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                    {effectiveDistanceKm > 0 ? `${(effectiveDistanceKm * 2).toFixed(1)} km` : '0 km'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '10px',
                  padding: '6px 10px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  color: '#92400E',
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Reimbursement:</span>
                <span>
                  ₹{((effectiveDistanceKm * 2) * ratePerKm).toFixed(2)} (@ ₹{ratePerKm}/km)
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={waypoints.length === 0 || isApplying}
                style={{
                  flex: 2,
                  padding: '9px 12px',
                  backgroundColor: waypoints.length > 0 && !isApplying ? '#0F8B5A' : '#94A3B8',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: waypoints.length > 0 && !isApplying ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Check size={16} />
                {isApplying ? 'Applying Route...' : `Apply Route (${effectiveDistanceKm} km)`}
              </button>
            </div>
          </div>

          {/* Right Interactive Leaflet Canvas */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

            {/* Top Overlay: Route Mode Pills & Lane Detour Prevention Controls */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxWidth: '650px',
              }}
            >
              {/* Route Mode Pills Toolbar */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setRouteMode('highway');
                    setAvoidLanes(true);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: routeMode === 'highway' ? '#2563EB' : 'transparent',
                    color: routeMode === 'highway' ? '#FFFFFF' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Prioritizes national highways, state highways, and major arterial roads. Automatically bypasses narrow residential alleys."
                >
                  🛣️ Highway / Main Roads
                </button>

                <button
                  type="button"
                  onClick={() => setRouteMode('osrm')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: routeMode === 'osrm' ? '#2563EB' : 'transparent',
                    color: routeMode === 'osrm' ? '#FFFFFF' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Routes using standard OSRM driving logic (may detour through residential back alleys if OSM tags prefer them)."
                >
                  🚗 Standard Driving
                </button>

                <button
                  type="button"
                  onClick={() => setRouteMode('direct')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: routeMode === 'direct' ? '#2563EB' : 'transparent',
                    color: routeMode === 'direct' ? '#FFFFFF' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Connects stops directly along the highway corridor line."
                >
                  📏 Direct Corridor
                </button>

                {routeMode === 'highway' && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: '#475569',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      borderLeft: '1px solid #E2E8F0',
                      marginLeft: '2px',
                    }}
                    title="When enabled, prevents routes from taking winding detours down narrow residential back alleys"
                  >
                    <input
                      type="checkbox"
                      checked={avoidLanes}
                      onChange={(e) => setAvoidLanes(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Avoid Alleys
                  </label>
                )}
              </div>

              {/* Highway Preferred Detour Alert Notification Banner */}
              {bypassedDetours.length > 0 && routeMode === 'highway' && (
                <div
                  style={{
                    backgroundColor: 'rgba(240, 253, 244, 0.96)',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#166534',
                  }}
                >
                  <Shield size={14} color="#16A34A" style={{ flexShrink: 0 }} />
                  <span>
                    🛣️ Highway Priority: Bypassed {bypassedDetours.length} residential lane detour{bypassedDetours.length > 1 ? 's' : ''} (saved ~{bypassedDetours.reduce((acc, d) => acc + d.savedKm, 0).toFixed(1)} km of alley detours)
                  </span>
                </div>
              )}

              {/* Click map tip banner */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#334155',
                  width: 'fit-content',
                }}
              >
                <Info size={13} color="#2563EB" />
                <span>Click map to add stop • Drag any pin to fine-tune exact location on the highway</span>
              </div>
            </div>

            {/* Top Right Controls: Satellite Switch, Fit Entire Route & Clear Map */}
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: '8px' }}>
              {waypoints.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#DC2626',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Remove all stops and clear route from map"
                >
                  <Trash2 size={13} color="#DC2626" />
                  Clear Map
                </button>
              )}
              {waypoints.length > 0 && (
                <button
                  type="button"
                  onClick={handleFitEntireRoute}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Fit and zoom to view all route stops"
                >
                  <Maximize2 size={14} color="#2563EB" />
                  Fit Route
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleMapMode}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Layers size={14} color="#2563EB" />
                {mapMode === 'street' ? 'Satellite View' : 'Street Map'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
