import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  List,
  Search,
  Plus,
  Building,
  Phone,
  Calendar,
  Layers,
  CheckCircle2,
  Filter,
  UserCheck,
  Compass,
  Pencil,
  Trash2,
} from 'lucide-react';
import { DoctorItem } from '../types';
import { MapLocationPickerModal } from '../components/MapLocationPickerModal';
import { create3DMapPinHtml, PinCategory } from '../utils/mapPinGenerator';
import {
  getStoredSavedLocations,
  persistSavedLocations,
  syncSavedLocationsWithBackend,
  getOperatingZones,
  TerritoryZone,
  calculateDistanceKm,
} from '../utils/savedLocationsStore';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

interface SavedLocationsViewProps {
  onAssignTaskToLocation: (loc: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius_m: number;
  }) => void;
  targetLocationId?: string | null;
  onClearTargetLocation?: () => void;
  onLocationAcknowledge?: (id: string) => void;
}

export const SavedLocationsView: React.FC<SavedLocationsViewProps> = ({
  onAssignTaskToLocation,
  targetLocationId,
  onClearTargetLocation,
  onLocationAcknowledge,
}) => {
  // Set of location IDs that the owner has already clicked/viewed
  const [readLocationIds, setReadLocationIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('ahtri_read_locations');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Centralized Saved Locations across all territories (Delhi + Shahdol)
  const [locations, setLocations] = useState<DoctorItem[]>(getStoredSavedLocations);
  const [zones, setZones] = useState<TerritoryZone[]>(getOperatingZones);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DoctorItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<DoctorItem | null>(null);

  // Helper to check if a location has a NEW unread mark
  const isLocationUnread = (loc: DoctorItem) => {
    if (readLocationIds.has(loc.id)) return false;
    return Boolean(loc.is_new);
  };

  // Mark a location as read / acknowledged (removes the "NEW" mark immediately)
  const markLocationAsRead = (id: string) => {
    setReadLocationIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('ahtri_read_locations', JSON.stringify(Array.from(next)));
      } catch {
        // Ignored
      }
      return next;
    });

    // Remove is_new flag in component state so UI updates instantly
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, is_new: false } : loc)),
    );

    // Notify parent to decrement SubNav badge counter
    onLocationAcknowledge?.(id);

    // Persist acknowledgment to backend
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
    fetch(`${apiUrl}/locations/${id}/acknowledge`, { method: 'POST' }).catch(() => {});
  };

  // Central handler for selecting a location (card click or pin click)
    // Handler to switch zone and pan map to that zone
  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    if (zoneId === 'all') {
      fitAllMarkers();
    } else {
      const z = zones.find((item) => item.id === zoneId);
      if (z && mapInstanceRef.current) {
        mapInstanceRef.current.setView([z.latitude, z.longitude], 13);
      }
    }
  };

  const fitAllMarkers = () => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    try {
      const layers = markersGroupRef.current.getLayers();
      if (layers.length > 0) {
        const bounds = L.featureGroup(layers as L.Marker[]).getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
        }
      }
    } catch {}
  };

  const handleSelectLocation = (loc: DoctorItem) => {
    setSelectedLocation(loc);
    mapInstanceRef.current?.flyTo([loc.latitude, loc.longitude], 16, { duration: 0.8 });
    if (isLocationUnread(loc)) {
      markLocationAsRead(loc.id);
    }
  };

  // Live Auto-Fetch Locations from Backend (Without causing map zoom resets)
  const fetchLocations = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/locations`);
      if (res.ok) {
        const data: DoctorItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLocations((prev) => {
            // Check if there is an actual difference to avoid continuous re-rendering
            if (prev.length === data.length) {
              const isIdentical = prev.every((p, idx) => {
                const d = data[idx];
                return (
                  d &&
                  p.id === d.id &&
                  p.is_new === d.is_new &&
                  p.visit_count === d.visit_count
                );
              });
              if (isIdentical) return prev;
            }
            return data;
          });
        }
      }
    } catch {
      // Fallback to current state
    }
  };

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setLocations(e.detail);
      }
    };
    window.addEventListener('ahtri_locations_updated', handleUpdate);
    fetchLocations();
    const interval = setInterval(fetchLocations, 4000);
    return () => {
      window.removeEventListener('ahtri_locations_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const lastTargetIdRef = useRef<string | null>(null);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);

  const toggleMapInteraction = () => {
    if (!mapInstanceRef.current) return;
    if (isMapInteracting) {
      mapInstanceRef.current.dragging.disable();
      mapInstanceRef.current.touchZoom.disable();
      setIsMapInteracting(false);
    } else {
      mapInstanceRef.current.dragging.enable();
      mapInstanceRef.current.touchZoom.enable();
      setIsMapInteracting(true);
    }
  };

  // Compute locations inside a zone
  const getLocationsInZone = (zone: TerritoryZone) => {
    return locations.filter((loc) => {
      const dist = calculateDistanceKm(zone.latitude, zone.longitude, loc.latitude, loc.longitude);
      const inRadius = dist <= (zone.radiusKm || 5) * 1.5;
      const zoneKey = zone.name.toLowerCase().split(' ')[0];
      const inArea = loc.area_name && loc.area_name.toLowerCase().includes(zoneKey);
      return inRadius || inArea;
    });
  };

  const activeZone = zones.find((z) => z.id === selectedZoneId);
  const zoneScopedLocations =
    selectedZoneId === 'all'
      ? locations
      : activeZone
      ? getLocationsInZone(activeZone)
      : locations;

  const filteredLocations = zoneScopedLocations.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.clinic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.address && l.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || l.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Initialize interactive overview map with ResizeObserver and multi-phase rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = createOptimizedMap(mapContainerRef.current, {
        zoomControl: false,
        dragging: true,
        touchZoom: true,
      }).setView([28.535, 77.207], 13);
      mapInstanceRef.current = map;
      map.dragging.enable();
      map.touchZoom.enable();

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);

      // Add ResizeObserver to prevent blank white maps on mobile layout reflow
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          mapInstanceRef.current?.invalidateSize();
        });
        ro.observe(mapContainerRef.current);
      }
    }

    // Refresh markers
    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();

      filteredLocations.forEach((loc) => {
        const lat = Number(loc.latitude);
        const lng = Number(loc.longitude);
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

        const isSelected = selectedLocation?.id === loc.id;
        const pinCategory = (loc.category || 'CLINIC') as PinCategory;
        const isLocNew = isLocationUnread(loc);

        const pinHtml = create3DMapPinHtml({
          category: pinCategory,
          isSelected,
          isNew: isLocNew,
        });

        const customIcon = L.divIcon({
          html: pinHtml,
          className: 'saved-location-3d-marker',
          iconSize: isSelected ? [45, 59] : [38, 50],
          iconAnchor: isSelected ? [22.5, 59] : [19, 50],
          popupAnchor: [0, isSelected ? -56 : -48],
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        const badgeBg =
          loc.category === 'HOSPITAL'
            ? '#FEE2E2'
            : loc.category === 'PHARMACY'
            ? '#DBEAFE'
            : '#DCFCE7';

        const badgeText =
          loc.category === 'HOSPITAL'
            ? '#991B1B'
            : loc.category === 'PHARMACY'
            ? '#1E40AF'
            : '#166534';

        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:210px;padding:2px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
              <strong style="font-size:13px;color:#0F172A;line-height:1.2;">${loc.name}</strong>
              <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${badgeBg};color:${badgeText};">${loc.category === 'PHARMACY' ? 'CHEMIST' : (loc.category || 'CLINIC')}</span>
            </div>
            <p style="margin:2px 0 4px;font-size:11px;color:#475569;">${loc.clinic}</p>
            <p style="margin:2px 0 6px;font-size:11px;color:#64748B;">${loc.address || ''}</p>
            <div style="background:#F8FAFC;padding:6px 8px;border-radius:6px;border:1px solid #E2E8F0;font-size:11px;">
              <span style="color:#64748B;font-size:10px;">Attribution:</span><br/>
              <strong style="color:${loc.created_by_role === 'MR' ? '#0F8B5A' : '#1A3C6E'};">${loc.created_by_name || (loc.created_by_role === 'MR' ? 'Field MR' : 'System Admin')}</strong>
              <span style="font-size:10px;color:#94A3B8;"> • ${loc.created_by_role === 'MR' ? 'MR Discovery' : 'Owner Defined'}</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;">
              <button class="popup-edit-btn" data-id="${loc.id}" style="flex:1;padding:4px 8px;font-size:11px;background:#F1F5F9;color:#1E293B;border:1px solid #CBD5E1;border-radius:4px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px;">✏️ Edit</button>
              <button class="popup-del-btn" data-id="${loc.id}" data-name="${loc.clinic || loc.name}" style="flex:1;padding:4px 8px;font-size:11px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;border-radius:4px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px;">🗑️ Delete</button>
            </div>
          </div>
        `);

        marker.on('click', () => {
          handleSelectLocation(loc);
        });

        markersGroupRef.current?.addLayer(marker);
      });

      // Attach click listeners to popup buttons
      mapInstanceRef.current?.off('popupopen');
      mapInstanceRef.current?.on('popupopen', (e) => {
        const container = e.popup.getElement();
        if (!container) return;
        const editBtn = container.querySelector('.popup-edit-btn') as HTMLButtonElement | null;
        if (editBtn) {
          editBtn.onclick = () => {
            const id = editBtn.getAttribute('data-id');
            const found = locations.find((l) => l.id === id);
            if (found) handleEditLocation(found);
          };
        }
        const delBtn = container.querySelector('.popup-del-btn') as HTMLButtonElement | null;
        if (delBtn) {
          delBtn.onclick = () => {
            const id = delBtn.getAttribute('data-id');
            const name = delBtn.getAttribute('data-name') || 'Location';
            if (id) handleDeleteLocation(id, name);
          };
        }
      });
    }

    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 80);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      fitAllMarkers();
    }, 250);
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 600);
  }, [locations, selectedCategory, searchQuery, selectedLocation, readLocationIds, selectedZoneId]);

  // Auto-focus on targetLocationId if provided from toast notification (RUN ONCE ONLY)
  useEffect(() => {
    if (!targetLocationId || targetLocationId === lastTargetIdRef.current) return;

    const matched = locations.find((l) => l.id === targetLocationId);
    if (matched) {
      lastTargetIdRef.current = targetLocationId;
      setSelectedLocation(matched);
      mapInstanceRef.current?.flyTo([matched.latitude, matched.longitude], 16, { duration: 0.8 });
      if (isLocationUnread(matched)) {
        markLocationAsRead(matched.id);
      }
      if (onClearTargetLocation) {
        onClearTargetLocation();
      }
    }
  }, [targetLocationId, locations]);

  // Update Tile Layer when satellite / street mode toggles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(mapInstanceRef.current);
  }, [mapMode]);

  // Handle editing an existing location
  const handleEditLocation = (loc: DoctorItem) => {
    setEditingLocation(loc);
    setIsPickerOpen(true);
  };

  // Handle deleting a location
  const handleDeleteLocation = async (id: string, name: string) => {
    const ok = window.confirm(
      `Are you sure you want to delete "${name}"?\nThis will permanently remove it from your territory master directory and maps.`,
    );
    if (!ok) return;

    const next = locations.filter((l) => l.id !== id);
    setLocations(next);
    persistSavedLocations(next);
    if (selectedLocation?.id === id) {
      setSelectedLocation(null);
    }

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/locations/${id}`, { method: 'DELETE' });
      fetchLocations();
    } catch (err) {
      console.warn('Backend delete location warning:', err);
    }
  };

  // Handle saving new or updated location from modal
  const handleSaveLocation = async (locData: any) => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

    if (locData.id) {
      // Update existing location
      const updatedList = locations.map((l) =>
        l.id === locData.id
          ? {
              ...l,
              name: locData.name,
              clinic: locData.clinic || locData.name,
              doctor_name: locData.name,
              address: locData.address,
              category: locData.category,
              latitude: locData.latitude,
              longitude: locData.longitude,
              phone: locData.phone || l.phone,
            }
          : l,
      );
      setLocations(updatedList);
      persistSavedLocations(updatedList);
      setSelectedLocation(updatedList.find((l) => l.id === locData.id) || null);
      setEditingLocation(null);

      try {
        await fetch(`${apiUrl}/locations/${locData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: locData.name,
            clinic: locData.clinic || locData.name,
            doctor_name: locData.name,
            category: locData.category,
            address: locData.address,
            latitude: locData.latitude,
            longitude: locData.longitude,
            phone: locData.phone,
          }),
        });
        fetchLocations();
      } catch {}
      return;
    }

    // Create new location
    const created: DoctorItem = {
      id: `loc-${Date.now().toString().slice(-4)}`,
      name: locData.name,
      clinic: locData.clinic,
      qualification: 'Registered Point of Care',
      specialization: locData.category,
      class: 'A',
      potential_score: 90,
      phone: locData.phone || 'N/A',
      address: locData.address,
      latitude: locData.latitude,
      longitude: locData.longitude,
      category: locData.category,
      created_by_role: 'ADMIN',
      created_by_name: 'System Admin (Owner)',
      area_name: locData.address.includes('Shahdol') ? 'Shahdol District' : 'Delhi Territory',
      visit_count: 0,
    };

    const nextLocations = [created, ...locations];
    setLocations(nextLocations);
    persistSavedLocations(nextLocations);
    setSelectedLocation(created);
    mapInstanceRef.current?.setView([created.latitude, created.longitude], 15);

    try {
      await fetch(`${apiUrl}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locData.clinic || locData.name,
          doctor_name: locData.name,
          category: locData.category,
          address: locData.address,
          latitude: locData.latitude,
          longitude: locData.longitude,
          phone: locData.phone,
          mr_name: 'System Admin (Owner)',
        }),
      });
      fetchLocations();
    } catch {
      // Local state already updated
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%', paddingBottom: '30px' }}>
      {/* Top Banner Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
            Live Map & Saved Territory Locations
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
            Mark doctor clinics, hospitals, and pharmacies on the live map. Saved locations can be assigned directly to MRs.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingLocation(null);
            setIsPickerOpen(true);
          }}
          style={{
            padding: '9px 16px',
            background: '#0F8B5A',
            color: '#FFFFFF',
            borderRadius: '6px',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(15, 139, 90, 0.25)',
          }}
        >
          <Plus size={16} /> Mark New Location on Map
        </button>
      </div>

      {/* Territory Zone Selector Chips Bar */}
      <div
        style={{
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Compass size={14} color="#1A3C6E" /> OPERATIONAL ZONE:
        </div>

        {/* All Zones */}
        <button
          type="button"
          onClick={() => {
            setSelectedZoneId('all');
            mapInstanceRef.current?.flyTo([28.535, 77.207], 12);
          }}
          style={{
            padding: '5px 12px',
            borderRadius: '16px',
            border: selectedZoneId === 'all' ? '2px solid #1A3C6E' : '1px solid #CBD5E1',
            background: selectedZoneId === 'all' ? '#EFF6FF' : '#FFFFFF',
            color: selectedZoneId === 'all' ? '#1A3C6E' : '#475569',
            fontSize: '11.5px',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          All Territories ({locations.length})
        </button>

        {/* Zone chips */}
        {zones.map((zone) => {
          const isSelected = selectedZoneId === zone.id;
          const count = getLocationsInZone(zone).length;

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                setSelectedZoneId(zone.id);
                mapInstanceRef.current?.flyTo([zone.latitude, zone.longitude], 13.5);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '16px',
                border: isSelected ? `2px solid ${zone.color}` : '1px solid #CBD5E1',
                background: isSelected ? `${zone.color}15` : '#FFFFFF',
                color: isSelected ? zone.color : '#334155',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: zone.color }} />
              <span>{zone.name}</span>
              <span
                style={{
                  background: isSelected ? zone.color : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#64748B',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: '800',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Quick Jump to Directory List Bar */}
      <div
        style={{
          background: '#EFF6FF',
          borderBottom: '1px solid #DBEAFE',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📍</span>
          <span>{filteredLocations.length} Saved Points Plotted Across Map</span>
        </span>
        <button
          type="button"
          onClick={() => {
            const listEl = document.querySelector('.saved-locations-list-col');
            if (listEl) {
              listEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          style={{
            background: '#1A3C6E',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '5px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          View Saved Directory List
        </button>
      </div>

      {/* Main Split Layout: Filter/List on Left, Live Leaflet Map on Right */}
      <div className="saved-locations-split">
        {/* Left Side: Directory List */}
        <div className="saved-locations-list-col">
          {/* Search & Category Filter */}
          <div style={{ padding: '14px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#FFFFFF',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                padding: '0 10px',
                marginBottom: '10px',
              }}
            >
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Search saved clinic or doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '8px 10px',
                  fontSize: '12px',
                  width: '100%',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'CLINIC', label: 'Clinics' },
                { id: 'HOSPITAL', label: 'Hospitals' },
                { id: 'PHARMACY', label: 'Pharmacies' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setSelectedCategory(pill.id);
                    const matching = locations.filter(
                      (l) => pill.id === 'ALL' || l.category === pill.id
                    );
                    if (matching.length > 0 && mapInstanceRef.current) {
                      if (matching.length === 1) {
                        mapInstanceRef.current.flyTo(
                          [matching[0].latitude, matching[0].longitude],
                          16,
                          { duration: 0.8 }
                        );
                      } else {
                        const bounds = L.latLngBounds(
                          matching.map((l) => [l.latitude, l.longitude])
                        );
                        mapInstanceRef.current.fitBounds(bounds, {
                          padding: [50, 50],
                          maxZoom: 16,
                        });
                      }
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '14px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: selectedCategory === pill.id ? '700' : '500',
                    background: selectedCategory === pill.id ? '#1A3C6E' : '#E2E8F0',
                    color: selectedCategory === pill.id ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Cards */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {filteredLocations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748B', fontSize: '13px' }}>
                No locations match your search.
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                const isUnread = isLocationUnread(loc);

                return (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className={isUnread ? 'location-unread-card' : ''}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: isSelected
                        ? '2px solid #0F8B5A'
                        : isUnread
                        ? '1px solid #10B981'
                        : '1px solid #E2E8F0',
                      background: isSelected ? '#F0FDF4' : isUnread ? '#F0FDF4' : '#FFFFFF',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isUnread ? '0 2px 8px rgba(16, 185, 129, 0.18)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#0F172A',
                          }}
                        >
                          {loc.name}
                        </span>
                        {isUnread && (
                          <span className="whatsapp-new-pill">
                            <span className="whatsapp-new-dot" />
                            NEW
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          background:
                            loc.category === 'HOSPITAL'
                              ? '#FEE2E2'
                              : loc.category === 'PHARMACY'
                              ? '#DBEAFE'
                              : '#DCFCE7',
                          color:
                            loc.category === 'HOSPITAL'
                              ? '#991B1B'
                              : loc.category === 'PHARMACY'
                              ? '#1E40AF'
                              : '#166534',
                        }}
                      >
                        {loc.category === 'PHARMACY' ? 'CHEMIST' : (loc.category || 'CLINIC')}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {loc.clinic}
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} color="#0F8B5A" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                      </span>
                    </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontSize: '11px', color: loc.created_by_role === 'MR' ? '#0F8B5A' : '#1A3C6E', fontWeight: '700' }}>
                            Marked by: {loc.created_by_name || (loc.created_by_role === 'MR' ? 'Field MR' : 'System Admin')}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                            {loc.created_by_role === 'MR' ? 'Field MR Discovery' : 'Owner Defined'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          title="Edit Location Details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLocation(loc);
                          }}
                          style={{
                            padding: '3px 7px',
                            background: '#F1F5F9',
                            color: '#1E293B',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Pencil size={11} color="#2563EB" /> Edit
                        </button>
                        <button
                          type="button"
                          title="Delete Location"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocation(loc.id, loc.clinic || loc.name);
                          }}
                          style={{
                            padding: '3px 7px',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            borderRadius: '4px',
                            border: '1px solid #FECACA',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Trash2 size={11} color="#DC2626" /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignTaskToLocation({
                              name: loc.clinic || loc.name,
                              address: loc.address || loc.clinic,
                              latitude: loc.latitude,
                              longitude: loc.longitude,
                              geofence_radius_m: 50,
                            });
                          }}
                          style={{
                            padding: '3px 8px',
                            background: '#1A3C6E',
                            color: '#FFFFFF',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Calendar size={11} /> Assign
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Leaflet Interactive Map */}
        <div className="saved-locations-map-col">
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '420px' }} />

          {/* Top Floating Controls Bar */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              zIndex: 400,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {/* Left Controls: Street vs Satellite & Touch Scroll Unlock */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', pointerEvents: 'auto' }}>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  padding: '2px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                }}
              >
                <button
                  onClick={() => setMapMode('street')}
                  style={{
                    padding: '4px 8px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: mapMode === 'street' ? '#1A3C6E' : 'transparent',
                    color: mapMode === 'street' ? '#FFFFFF' : '#475569',
                  }}
                >
                  Street
                </button>
                <button
                  onClick={() => setMapMode('satellite')}
                  style={{
                    padding: '4px 8px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: mapMode === 'satellite' ? '#1A3C6E' : 'transparent',
                    color: mapMode === 'satellite' ? '#FFFFFF' : '#475569',
                  }}
                >
                  Satellite
                </button>
              </div>

              {/* Mobile Touch Pan Lock / Unlock Button (Prevents page freeze) */}
              <button
                type="button"
                onClick={toggleMapInteraction}
                style={{
                  background: isMapInteracting ? '#0F8B5A' : '#FFFFFF',
                  color: isMapInteracting ? '#FFFFFF' : '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Toggle whether map dragging captures your touch or lets you scroll the page"
              >
                <span>{isMapInteracting ? '🔓 Pan On' : '🔒 Pan Map'}</span>
              </button>
            </div>

            {/* Right Controls: Collapsible Points of Care Chip & Popover */}
            <div style={{ position: 'relative', pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  padding: '5px 9px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#1E293B',
                  cursor: 'pointer',
                }}
              >
                <span>📍 {filteredLocations.length} Points</span>
                <span style={{ fontSize: '10px' }}>{isLegendOpen ? '▲' : '▼'}</span>
              </button>

              {/* Collapsible Dropdown Legend */}
              {isLegendOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '32px',
                    right: 0,
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    border: '1px solid #E2E8F0',
                    fontSize: '11.5px',
                    minWidth: '200px',
                    zIndex: 500,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '800', color: '#0F172A' }}>Points of Care</span>
                    <button
                      onClick={() => setIsLegendOpen(false)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '13px' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0F8B5A' }} />
                      <span>Clinics (Green)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }} />
                      <span>Hospitals (Red)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706' }} />
                      <span>Pharmacies (Orange)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={isPickerOpen}
        editingLocation={editingLocation}
        onClose={() => {
          setIsPickerOpen(false);
          setEditingLocation(null);
        }}
        onSaveLocation={handleSaveLocation}
        onAssignTaskHere={(loc) => {
          handleSaveLocation(loc);
          onAssignTaskToLocation(loc);
        }}
      />
    </div>
  );
};
