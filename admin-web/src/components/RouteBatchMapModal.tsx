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
} from 'lucide-react';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  isCustom?: boolean;
}

interface RouteBatchMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchTitle?: string;
  initialStops?: string[];
  initialDistanceKm?: number;
  ratePerKm?: number;
  onApplyRoute: (result: {
    stops: string[];
    distanceKm: number;
    suggestedBatchName: string;
    waypoints: RouteWaypoint[];
  }) => void;
  allSavedLocations?: Array<{ id: string; name: string; latitude?: number; longitude?: number; address?: string }>;
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
  { name: 'Budhar', aliases: ['budhar', 'burhar', 'boodhar', 'bhr'], lat: 23.2083, lng: 81.5456, area: 'Commercial Town', region: 'shahdol' },
  { name: 'Dhanpuri', aliases: ['dhanpuri', 'dhanpoori'], lat: 23.1678, lng: 81.5644, area: 'Mining Hub', region: 'shahdol' },
  { name: 'Amlai (OPM)', aliases: ['amlai', 'opm', 'amlai opm', 'orient paper mills', 'amlai (opm)'], lat: 23.1650, lng: 81.6150, area: 'Paper Mill & Township', region: 'shahdol' },
  { name: 'Bakaho', aliases: ['bakaho', 'bakkaho'], lat: 23.2200, lng: 81.5800, area: 'Sub-Town', region: 'shahdol' },
  { name: 'Pali', aliases: ['pali', 'birsinghpur pali', 'birsinghpur', 'birshingpur pali'], lat: 23.3644, lng: 81.0425, area: 'Thermal Town', region: 'shahdol' },
  { name: 'Nowrozabad', aliases: ['nowrozabad', 'navrozabad', 'naurozabad'], lat: 23.4000, lng: 80.9333, area: 'Colliery Belt', region: 'shahdol' },
  { name: 'Gohparu', aliases: ['gohparu', 'gohparoo'], lat: 23.4682, lng: 81.4428, area: 'Sub-district', region: 'shahdol' },
  { name: 'Jaisinghnagar', aliases: ['jaisinghnagar', 'jaisingh nagar'], lat: 23.7000, lng: 81.3833, area: 'North Route', region: 'shahdol' },
  { name: 'Jaitpur', aliases: ['jaitpur'], lat: 23.3667, lng: 81.6833, area: 'Rural Hub', region: 'shahdol' },
  { name: 'Manpur', aliases: ['manpur', 'maanpur'], lat: 23.6339, lng: 81.0825, area: 'Forest Route', region: 'shahdol' },
  { name: 'Singhpur', aliases: ['singhpur'], lat: 23.2100, lng: 81.3800, area: 'Sub-district', region: 'shahdol' },
  { name: 'Beohari', aliases: ['beohari', 'byohari'], lat: 24.0333, lng: 81.3833, area: 'North Highway', region: 'shahdol' },
  { name: 'Umaria', aliases: ['umaria'], lat: 23.5244, lng: 80.8358, area: 'District HQ', region: 'shahdol' },
  { name: 'Khannoudhi', aliases: ['khannoudhi', 'khannaudhi'], lat: 23.5833, lng: 81.3667, area: 'North Route', region: 'shahdol' },
  { name: 'Amjhor', aliases: ['amjhor'], lat: 23.7500, lng: 81.4500, area: 'North Border', region: 'shahdol' },
  { name: 'Chuhiri', aliases: ['chuhiri', 'chuhiree'], lat: 23.5167, lng: 81.4667, area: 'Township', region: 'shahdol' },

  // --- KOTMA / ANUPPUR BELT ---
  { name: 'Kotma', aliases: ['kotma', 'kotma hq', 'kotma town'], lat: 23.2014, lng: 81.9669, area: 'Colliery Belt HQ', region: 'kotma' },
  { name: 'Anuppur', aliases: ['anuppur', 'anuppur hq', 'anuppur town'], lat: 23.1044, lng: 81.6881, area: 'District HQ', region: 'kotma' },
  { name: 'Jaithari', aliases: ['jaithari', 'jaitharee'], lat: 23.0336, lng: 81.7958, area: 'Thermal Power Hub', region: 'kotma' },
  { name: 'Rajendragram', aliases: ['rajendragram', 'rajendragram pusprajgarh', 'pushprajgarh'], lat: 22.8256, lng: 81.7139, area: 'Highland Route', region: 'kotma' },
  { name: 'Amarkantak', aliases: ['amarkantak'], lat: 22.6738, lng: 81.7589, area: 'Holy Hill Town', region: 'kotma' },
  { name: 'Bijuri', aliases: ['bijuri', 'bijuri colliery'], lat: 23.2681, lng: 82.1289, area: 'Border Belt', region: 'kotma' },
  { name: 'Kelhari', aliases: ['kelhari'], lat: 23.3986, lng: 82.1931, area: 'North Mining Belt', region: 'kotma' },
  { name: 'Janakpur', aliases: ['janakpur', 'bharatpur'], lat: 23.7428, lng: 82.0250, area: 'Northern Border', region: 'kotma' },
  { name: 'Marwahi', aliases: ['marwahi'], lat: 22.9833, lng: 82.0333, area: 'CG Belt', region: 'kotma' },
  { name: 'Dhanikundi', aliases: ['dhanikundi', 'dhankundi'], lat: 22.9333, lng: 82.1167, area: 'Border Route', region: 'kotma' },
  { name: 'Keswahi', aliases: ['keswahi', 'keshwahi', 'keshavwahi'], lat: 23.3167, lng: 81.7833, area: 'Central Route', region: 'kotma' },
  { name: 'Girva', aliases: ['girva', 'girwa'], lat: 23.2500, lng: 81.7500, area: 'Rural Sector', region: 'kotma' },
  { name: 'Khamhidol', aliases: ['khamhidol', 'khamhidhol'], lat: 23.3833, lng: 81.8500, area: 'Rural Sector', region: 'kotma' },
  { name: 'Manendragarh', aliases: ['manendragarh', 'manendragarh city'], lat: 23.2144, lng: 82.2039, area: 'District Border', region: 'kotma' },
  { name: 'Chirmiri', aliases: ['chirmiri', 'chirimiri'], lat: 23.1814, lng: 82.3533, area: 'Coal City', region: 'kotma' },
  { name: 'Baikunthpur', aliases: ['baikunthpur'], lat: 23.2667, lng: 82.5500, area: 'District HQ (Koriya)', region: 'kotma' },
  { name: 'Gaurela', aliases: ['gaurela', 'pendra', 'pendra road', 'gaurella'], lat: 22.7667, lng: 81.9167, area: 'Railway Junction', region: 'kotma' },
  { name: 'Venkatnagar', aliases: ['venkatnagar', 'vynkatnagar'], lat: 23.0833, lng: 82.0333, area: 'Border Belt', region: 'kotma' },
  { name: 'Jamuna Colliery', aliases: ['jamuna colliery', 'jamuna'], lat: 23.1833, lng: 81.9333, area: 'Mining Colony', region: 'kotma' },

  // --- AMBIKAPUR / SURGUJA BELT ---
  { name: 'Ambikapur', aliases: ['ambikapur', 'ambikapur hq', 'surguja'], lat: 23.1200, lng: 83.1900, area: 'Surguja HQ', region: 'ambikapur' },
  { name: 'Lakhanpur', aliases: ['lakhanpur', 'laknapur'], lat: 22.9833, lng: 83.0500, area: 'South Highway', region: 'ambikapur' },
  { name: 'Udaipur', aliases: ['udaipur', 'udaypur'], lat: 22.8167, lng: 82.9333, area: 'Forest Route', region: 'ambikapur' },
  { name: 'Kedma', aliases: ['kedma'], lat: 22.7500, lng: 82.8500, area: 'South West Border', region: 'ambikapur' },
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
  allSavedLocations: Array<{ id: string; name: string; latitude?: number; longitude?: number; address?: string }> = [],
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
      return aClean === lower || lower.includes(aClean) || aClean.includes(lower);
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

  // 2. Check allSavedLocations
  const locMatch = allSavedLocations.find((l) => {
    if (!l.latitude || !l.longitude) return false;
    const lName = l.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lAddr = (l.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return lName.includes(lower) || lower.includes(lName) || lAddr.includes(lower);
  });

  if (locMatch && locMatch.latitude && locMatch.longitude) {
    return {
      id: `wp-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: locMatch.name,
      lat: locMatch.latitude,
      lng: locMatch.longitude,
      address: locMatch.address,
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

export const RouteBatchMapModal: React.FC<RouteBatchMapModalProps> = ({
  isOpen,
  onClose,
  batchTitle,
  initialStops = [],
  initialDistanceKm,
  ratePerKm = 2.25,
  onApplyRoute,
  allSavedLocations = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.Layer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);

  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [calculatedKm, setCalculatedKm] = useState<number>(initialDistanceKm || 0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [selectedBelt, setSelectedBelt] = useState<'all' | 'shahdol' | 'kotma' | 'ambikapur' | 'bilaspur'>('all');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Parse initialStops whenever modal opens or stops prop changes
  const initialStopsSignature = JSON.stringify(initialStops);
  useEffect(() => {
    if (!isOpen) return;

    let parsed: RouteWaypoint[] = [];
    if (initialStops && initialStops.length > 0) {
      let prevWp: RouteWaypoint | undefined = undefined;
      initialStops.forEach((stopName, idx) => {
        const wp = resolveStopCoordinate(stopName, idx, allSavedLocations, prevWp);
        parsed.push(wp);
        prevWp = wp;
      });
    } else {
      // Default initial start stop: Shahdol
      parsed = [
        {
          id: `wp-init-${Date.now()}`,
          name: 'Shahdol',
          lat: 23.2883,
          lng: 81.3522,
          address: 'Shahdol Central HQ',
        },
      ];
    }

    setWaypoints(parsed);
  }, [isOpen, initialStopsSignature]);

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
      zoom: 10,
      minZoom: 5,
      maxZoom: 19,
    });

    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Map click to add custom waypoint
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      let name = `Stop (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
        );
        if (res.ok) {
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.suburb ||
            data.address?.county ||
            data.name;
          if (city) name = city;
        }
      } catch {}

      handleAddWaypoint({
        id: `wp-${Date.now()}`,
        name,
        lat,
        lng,
        isCustom: true,
      });
    });

    mapInstanceRef.current = map;

    // Small delay to ensure container is painted, then trigger size refresh & initial render
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (waypoints.length > 0) {
        renderMarkersAndRoute(map, waypoints);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Automatically sync map whenever waypoints list updates
  useEffect(() => {
    if (mapInstanceRef.current && waypoints.length > 0) {
      renderMarkersAndRoute(mapInstanceRef.current, waypoints);
    }
  }, [waypoints]);

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

  // Render Waypoints & Polyline Route on map
  const renderMarkersAndRoute = async (map: L.Map, currentWaypoints: RouteWaypoint[]) => {
    if (!map || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    if (polylineLayerRef.current) {
      polylineLayerRef.current.remove();
      polylineLayerRef.current = null;
    }

    if (currentWaypoints.length === 0) return;

    const bounds: [number, number][] = [];

    // 1. Draw distinct numbered badges for each stop
    currentWaypoints.forEach((wp, idx) => {
      bounds.push([wp.lat, wp.lng]);
      const isStart = idx === 0;
      const isEnd = idx === currentWaypoints.length - 1 && currentWaypoints.length > 1;

      const bgColor = isStart ? '#059669' : isEnd ? '#7C3AED' : '#2563EB';
      const badgeText = `${idx + 1}`;
      const roleLabel = isStart ? 'Start / HQ' : isEnd ? 'Final Area' : `Stop ${idx + 1}`;

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
          font-size: 13px;
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          position: relative;
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

      const marker = L.marker([wp.lat, wp.lng], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-size: 10px; font-weight: 800; color: ${bgColor}; text-transform: uppercase;">
            ${roleLabel}
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 2px;">
            ${wp.name}
          </div>
          ${wp.address ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">${wp.address}</div>` : ''}
          <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">Lat: ${wp.lat.toFixed(4)}, Lng: ${wp.lng.toFixed(4)}</div>
        </div>
      `);
      markersLayerRef.current?.addLayer(marker);
    });

    // 2. Calculate Road Routing & Polyline if 2 or more waypoints exist
    if (currentWaypoints.length >= 2) {
      setIsCalculatingRoute(true);
      try {
        const coordsParam = currentWaypoints.map((w) => `${w.lng},${w.lat}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

        const res = await fetch(osrmUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const meters = data.routes[0].distance;
            const km = Math.round((meters / 1000) * 10) / 10;
            setCalculatedKm(km);

            // Coordinates in GeoJSON are [lng, lat], Leaflet polyline requires [lat, lng]
            const linePoints: [number, number][] = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );

            // Draw clean road route polyline
            const routePoly = L.polyline(linePoints, {
              color: '#2563EB',
              weight: 5,
              opacity: 0.88,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);

            polylineLayerRef.current = routePoly;
          } else {
            fallbackPolyline(map, currentWaypoints);
          }
        } else {
          fallbackPolyline(map, currentWaypoints);
        }
      } catch {
        fallbackPolyline(map, currentWaypoints);
      } finally {
        setIsCalculatingRoute(false);
      }
    } else {
      setCalculatedKm(0);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [55, 55], maxZoom: 14 });
    }
  };

  const fallbackPolyline = (map: L.Map, pts: RouteWaypoint[]) => {
    let totalHaversine = 0;
    const latlngs: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      latlngs.push([pts[i].lat, pts[i].lng]);
      if (i > 0) {
        totalHaversine += calculateHaversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
      }
    }
    // Multiply by 1.25 road curvature factor for realistic state road estimation
    const estimatedRoadKm = Math.round(totalHaversine * 1.25 * 10) / 10;
    setCalculatedKm(estimatedRoadKm);

    const poly = L.polyline(latlngs, {
      color: '#3B82F6',
      weight: 4,
      dashArray: '8, 6',
      opacity: 0.9,
    }).addTo(map);
    polylineLayerRef.current = poly;
  };

  const handleAddWaypoint = (newWp: RouteWaypoint) => {
    setWaypoints((prev) => [...prev, newWp]);
  };

  const handleRemoveWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  const handleMoveWaypoint = (index: number, direction: 'UP' | 'DOWN') => {
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

  const handleClearAll = () => {
    setWaypoints([]);
    setCalculatedKm(0);
    if (mapInstanceRef.current) {
      if (markersLayerRef.current) markersLayerRef.current.clearLayers();
      if (polylineLayerRef.current) {
        polylineLayerRef.current.remove();
        polylineLayerRef.current = null;
      }
    }
  };

  // Search cities / areas
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const qLower = searchQuery.toLowerCase().trim();

      // 1. Search local directory first
      const dirMatches = TERRITORY_DIRECTORY.filter((h) => {
        return (
          h.name.toLowerCase().includes(qLower) ||
          h.aliases.some((a) => a.toLowerCase().includes(qLower)) ||
          h.area.toLowerCase().includes(qLower)
        );
      }).map((h) => ({
        name: h.name,
        lat: h.lat,
        lng: h.lng,
      }));

      // 2. Search local saved locations
      const localMatches = allSavedLocations
        .filter(
          (l) =>
            l.latitude &&
            l.longitude &&
            (l.name.toLowerCase().includes(qLower) || (l.address && l.address.toLowerCase().includes(qLower)))
        )
        .map((l) => ({
          name: l.name,
          lat: l.latitude!,
          lng: l.longitude!,
        }));

      // 3. Online OpenStreetMap Geocoding bounded to central India
      let remoteMatches: Array<{ name: string; lat: number; lng: number }> = [];
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ' Madhya Pradesh India'
        )}&limit=5&countrycodes=in`
      );
      if (res.ok) {
        const data = await res.json();
        remoteMatches = data.map((d: any) => ({
          name: d.display_name.split(',')[0],
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        }));
      }

      setSearchResults([...dirMatches, ...localMatches, ...remoteMatches]);
    } catch {
      // Silent error handling
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

  const handleApply = () => {
    if (waypoints.length === 0) return;
    const stopNames = waypoints.map((w) => w.name);
    onApplyRoute({
      stops: stopNames,
      distanceKm: calculatedKm || (waypoints.length > 1 ? 30 : 15),
      suggestedBatchName,
      waypoints,
    });
    onClose();
  };

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

            {/* City / Landmark Search Box */}
            <div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search city, tehsil, clinic..."
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

              {/* Search Results Dropdown List */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    marginTop: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    maxHeight: '140px',
                    overflowY: 'auto',
                  }}
                >
                  {searchResults.map((sr, sIdx) => (
                    <div
                      key={sIdx}
                      onClick={() => {
                        handleAddWaypoint({
                          id: `search-${sIdx}-${Date.now()}`,
                          name: sr.name,
                          lat: sr.lat,
                          lng: sr.lng,
                        });
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#1E293B',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <MapPin size={12} color="#2563EB" />
                      <span style={{ fontWeight: 600 }}>{sr.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Stops Ribbon List */}
            <div style={{ flex: 1, minHeight: '150px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Ordered Circuit Stops ({waypoints.length}):
                </span>
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
                    Click towns above or click anywhere directly on the map.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '210px' }}>
                  {waypoints.map((wp, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === waypoints.length - 1 && waypoints.length > 1;
                    const badgeBg = isStart ? '#059669' : isEnd ? '#7C3AED' : '#2563EB';

                    return (
                      <div
                        key={wp.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: `1px solid ${isStart ? '#A7F3D0' : isEnd ? '#DDD6FE' : '#E2E8F0'}`,
                          borderRadius: '6px',
                          padding: '7px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: badgeBg,
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                              {wp.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: isStart ? '#059669' : isEnd ? '#7C3AED' : '#64748B', fontWeight: 600 }}>
                              {isStart ? 'Origin (Start HQ)' : isEnd ? 'Final Destination' : 'Transit Stop'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                <div style={{ backgroundColor: '#EFF6FF', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                    One-Way Distance
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1D4ED8', marginTop: '2px' }}>
                    {calculatedKm > 0 ? `${calculatedKm} km` : '0 km'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F0FDF4', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    Round-Trip (2-Way)
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                    {calculatedKm > 0 ? `${(calculatedKm * 2).toFixed(1)} km` : '0 km'}
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
                  ₹{((calculatedKm * 2) * ratePerKm).toFixed(2)} (@ ₹{ratePerKm}/km)
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
                disabled={waypoints.length === 0}
                style={{
                  flex: 2,
                  padding: '9px 12px',
                  backgroundColor: waypoints.length > 0 ? '#0F8B5A' : '#94A3B8',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: waypoints.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Check size={16} />
                Apply Route ({calculatedKm} km)
              </button>
            </div>
          </div>

          {/* Right Interactive Leaflet Canvas */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

            {/* Top Overlay: Click Anywhere Banner */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '6px 12px',
                borderRadius: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#1E293B',
              }}
            >
              <Info size={14} color="#2563EB" />
              <span>Click anywhere on map to add custom waypoint stop</span>
            </div>

            {/* Top Right Controls: Satellite Switch */}
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
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
