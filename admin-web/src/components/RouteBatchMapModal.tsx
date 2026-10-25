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

// Predefined well-known hubs in Shahdol / MP territory for one-click quick addition
const KNOWN_HUBS: Array<{ name: string; lat: number; lng: number; area: string }> = [
  { name: 'Shahdol', lat: 23.2883, lng: 81.3522, area: 'HQ Center' },
  { name: 'Burhar', lat: 23.2083, lng: 81.5456, area: 'Commercial Town' },
  { name: 'Dhanpuri', lat: 23.1678, lng: 81.5644, area: 'Mining Hub' },
  { name: 'Amlai (OPM)', lat: 23.1650, lng: 81.6150, area: 'Paper Mill & Township' },
  { name: 'Kotma', lat: 23.2014, lng: 81.9669, area: 'Colliery Belt' },
  { name: 'Anuppur', lat: 23.1044, lng: 81.6881, area: 'District HQ' },
  { name: 'Jaithari', lat: 23.0336, lng: 81.7958, area: 'Thermal Power' },
  { name: 'Bijuri', lat: 23.2681, lng: 82.1289, area: 'Border Belt' },
  { name: 'Manpur', lat: 23.6339, lng: 81.0825, area: 'Forest Route' },
  { name: 'Pali', lat: 23.3644, lng: 81.0425, area: 'Birshingpur Pali' },
  { name: 'Nowrozabad', lat: 23.4000, lng: 80.9333, area: 'Colliery Route' },
  { name: 'Umaria', lat: 23.5244, lng: 80.8358, area: 'District HQ' },
  { name: 'Singhpur', lat: 23.2100, lng: 81.3800, area: 'Sub-district' },
  { name: 'Jaisinghnagar', lat: 23.7000, lng: 81.3833, area: 'North Route' },
  { name: 'Beohari', lat: 24.0333, lng: 81.3833, area: 'North Highway' },
];

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

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Initialize waypoints from initialStops on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialStops && initialStops.length > 0) {
      const parsed: RouteWaypoint[] = [];
      initialStops.forEach((stopName, idx) => {
        const clean = stopName.trim();
        if (!clean) return;
        // Check known hubs
        const hubMatch = KNOWN_HUBS.find((h) => h.name.toLowerCase() === clean.toLowerCase());
        if (hubMatch) {
          parsed.push({
            id: `wp-${idx}-${Date.now()}`,
            name: hubMatch.name,
            lat: hubMatch.lat,
            lng: hubMatch.lng,
          });
          return;
        }
        // Check saved locations
        const locMatch = allSavedLocations.find(
          (l) => l.name.toLowerCase() === clean.toLowerCase() && l.latitude && l.longitude
        );
        if (locMatch && locMatch.latitude && locMatch.longitude) {
          parsed.push({
            id: `wp-${idx}-${Date.now()}`,
            name: locMatch.name,
            lat: locMatch.latitude,
            lng: locMatch.longitude,
            address: locMatch.address,
          });
          return;
        }
        // Fallback default coordinate around Shahdol offset
        parsed.push({
          id: `wp-${idx}-${Date.now()}`,
          name: clean,
          lat: 23.2883 + idx * 0.05,
          lng: 81.3522 + idx * 0.08,
          isCustom: true,
        });
      });
      setWaypoints(parsed);
    } else {
      // Default initial start stop: Shahdol
      setWaypoints([
        {
          id: `wp-init-${Date.now()}`,
          name: 'Shahdol',
          lat: 23.2883,
          lng: 81.3522,
        },
      ]);
    }
  }, [isOpen]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small delay to ensure container is fully painted in DOM
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const defaultCenter: [number, number] =
        waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [23.2883, 81.3522];

      const map = createOptimizedMap(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 10,
        minZoom: 6,
        maxZoom: 19,
      });

      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      // Click on map to add custom waypoint
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        // Attempt reverse geocode or label with coordinates
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
      renderMarkersAndRoute(map, waypoints);
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Toggle map mode
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

    const bounds: L.LatLngExpression[] = [];

    // 1. Draw markers for each waypoint
    currentWaypoints.forEach((wp, idx) => {
      bounds.push([wp.lat, wp.lng]);
      const isStart = idx === 0;
      const isEnd = idx === currentWaypoints.length - 1 && currentWaypoints.length > 1;

      const bgColor = isStart ? '#059669' : isEnd ? '#7C3AED' : '#2563EB';
      const badgeText = isStart ? '1' : isEnd ? `${idx + 1}` : `${idx + 1}`;
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

            // Draw outer glow and main route polyline
            const routePoly = L.polyline(linePoints, {
              color: '#2563EB',
              weight: 5,
              opacity: 0.85,
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
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [45, 45], maxZoom: 14 });
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
    // Multiply by 1.25 road curvature factor for realistic Indian rural/state road estimation
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
    setWaypoints((prev) => {
      const next = [...prev, newWp];
      if (mapInstanceRef.current) {
        renderMarkersAndRoute(mapInstanceRef.current, next);
      }
      return next;
    });
  };

  const handleRemoveWaypoint = (id: string) => {
    setWaypoints((prev) => {
      const next = prev.filter((w) => w.id !== id);
      if (mapInstanceRef.current) {
        renderMarkersAndRoute(mapInstanceRef.current, next);
      }
      return next;
    });
  };

  const handleMoveWaypoint = (index: number, direction: 'UP' | 'DOWN') => {
    setWaypoints((prev) => {
      const target = direction === 'UP' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      if (mapInstanceRef.current) {
        renderMarkersAndRoute(mapInstanceRef.current, copy);
      }
      return copy;
    });
  };

  const handleClearAll = () => {
    setWaypoints([]);
    setCalculatedKm(0);
    if (mapInstanceRef.current) {
      renderMarkersAndRoute(mapInstanceRef.current, []);
    }
  };

  // Search cities / areas
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      // 1. Search local saved locations first
      const qLower = searchQuery.toLowerCase().trim();
      const localMatches = allSavedLocations
        .filter(
          (l) =>
            l.name.toLowerCase().includes(qLower) ||
            (l.address && l.address.toLowerCase().includes(qLower))
        )
        .slice(0, 4)
        .map((l) => ({
          name: l.name,
          lat: l.latitude || 23.2883,
          lng: l.longitude || 81.3522,
        }));

      // 2. Search OpenStreetMap Nominatim
      const queryStr = encodeURIComponent(`${searchQuery}, Madhya Pradesh, India`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${queryStr}&countrycodes=in&limit=5`
      );
      let remoteMatches: any[] = [];
      if (res.ok) {
        const data = await res.json();
        remoteMatches = data.map((d: any) => ({
          name: d.display_name.split(',')[0],
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        }));
      }

      setSearchResults([...localMatches, ...remoteMatches]);
    } catch {
      // Silent error handling
    } finally {
      setIsSearching(false);
    }
  };

  // Generate Suggested Batch Name from stops
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
          maxWidth: '1160px',
          width: '100%',
          height: '90vh',
          maxHeight: '840px',
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
                Interactive Route Circuit & Distance Builder
              </h2>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
              Select your origin city (e.g. Shahdol), intermediate stops, and final area. Driving distance (one-way km) is calculated automatically.
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
            gridTemplateColumns: 'minmax(340px, 380px) 1fr',
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
            {/* Quick Pick Regional Hubs */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                ⚡ Quick Add Key Towns & Cities:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {KNOWN_HUBS.map((hub) => {
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
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: isAdded ? '1px solid #10B981' : '1px solid #CBD5E1',
                        backgroundColor: isAdded ? '#ECFDF5' : '#FFFFFF',
                        color: isAdded ? '#065F46' : '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Add ${hub.name} (${hub.area}) to route`}
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
                    placeholder="Search city, village, clinic..."
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '200px' }}>
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
                            title="Remove"
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

            {/* Real-Time Distance & Financial Summary Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                padding: '12px 14px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                  🛣️ Driving Distance Calculation:
                </span>
                {isCalculatingRoute && (
                  <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700 }}>
                    Routing on roads...
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: '#EFF6FF', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 700 }}>ONE-WAY DISTANCE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1D4ED8', marginTop: '2px' }}>
                    {calculatedKm} km
                  </div>
                </div>

                <div style={{ backgroundColor: '#F0FDF4', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>ROUND-TRIP (2-WAY)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                    {calculatedKm * 2} km
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '8px',
                  padding: '6px 8px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  color: '#92400E',
                  fontWeight: 600,
                }}
              >
                Reimbursement: <strong>₹{((calculatedKm * 2) * ratePerKm).toFixed(2)}</strong> (@ ₹{ratePerKm}/km)
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
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
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
                  padding: '9px 14px',
                  backgroundColor: waypoints.length === 0 ? '#94A3B8' : '#059669',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: waypoints.length === 0 ? 'not-allowed' : 'pointer',
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

          {/* Right Panel: Leaflet Interactive Map Canvas */}
          <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#E2E8F0' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* Floating Top Control Badge */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#1E293B',
              }}
            >
              <Info size={14} color="#2563EB" />
              <span>Click anywhere on map to add custom waypoint stop</span>
            </div>

            {/* Floating Satellite / Street Toggle */}
            <button
              type="button"
              onClick={handleToggleMapMode}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1000,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '6px 12px',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Layers size={14} />
              {mapMode === 'street' ? 'Satellite View' : 'Street View'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
