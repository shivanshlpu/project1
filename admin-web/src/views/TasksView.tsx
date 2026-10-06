import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  MessageSquare,
  Timer,
  User,
  ExternalLink,
  Calendar,
  X,
  Crosshair,
  Layers,
  Sparkles,
  Stethoscope,
  Building,
  Navigation,
  ChevronRight,
  Eye,
  Check,
  Compass,
  FileText,
  Camera,
  Trash2,
  Pencil,
} from 'lucide-react';
import { TaskItem, VerificationLogItem, DoctorItem, TaskOrderItem } from '../types';
import { Language, translations } from '../utils/i18n';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import { create3DMapPinHtml } from '../utils/mapPinGenerator';
import {
  getStoredSavedLocations,
  persistSavedLocations,
  syncSavedLocationsWithBackend,
  getOperatingZones,
  TerritoryZone,
  calculateDistanceKm,
} from '../utils/savedLocationsStore';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';
import { InStockProduct, getStoredInStockProducts, syncInStockProductsWithBackend } from '../utils/inventoryStore';
import { showCenteredNotice } from '../components/CenteredModalNotice';
import { getApiBaseUrl } from '../utils/apiHelper';
import { markTaskAsDeleted, getDeletedTaskIds } from '../utils/deletedTasksStore';

declare global {
  interface Window {
    __assignTaskToLocation?: (locId: string) => void;
    __selectModalLocation?: (locId: string) => void;
  }
}

// Distance helper between two geographic coordinates
function getDistanceFromLatLngInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  return calculateDistanceKm(lat1, lon1, lat2, lon2);
}

interface TasksViewProps {
  prefilledLocation?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius_m: number;
  } | null;
  onClearPrefilledLocation?: () => void;
  lang?: Language;
}

export const TasksView: React.FC<TasksViewProps> = ({
  prefilledLocation,
  onClearPrefilledLocation,
  lang = 'en',
}) => {
  const t = translations[lang];

  // Pre-saved Doctor & Location Presets
  const doctorPresets = [
    {
      id: 'doc-01',
      name: 'District Hospital Shahdol',
      clinic: 'Civil Hospital & Trauma Centre',
      specialty: 'District Healthcare Centre',
      address: 'Hospital Road, Bicharpur, Shahdol, MP',
      lat: 23.2953,
      lng: 81.3586,
      radius: 50,
      suggestedMr: 'Rahul Sharma',
    },
    {
      id: 'doc-02',
      name: 'Shree Ram Pharmacy',
      clinic: 'Shree Ram Medicos Shahdol',
      specialty: 'Retail Chemist Partner',
      address: 'Main Market, Station Road, Shahdol, MP',
      lat: 23.3012,
      lng: 81.3620,
      radius: 40,
      suggestedMr: 'Rahul Sharma',
    },
    {
      id: 'doc-03',
      name: 'Ambikapur Civil Hospital',
      clinic: 'Surguja District Hospital',
      specialty: 'Multispecialty Public Healthcare',
      address: 'Hospital Chowk, Ambikapur, Chhattisgarh',
      lat: 23.1197,
      lng: 83.1979,
      radius: 50,
      suggestedMr: 'Vikram Malhotra',
    },
    {
      id: 'doc-04',
      name: 'Bilaspur Healthcare Centre',
      clinic: 'Apollo Regional Medical Centre',
      specialty: 'Super Specialty Hospital',
      address: 'Vyapar Vihar, Bilaspur, Chhattisgarh',
      lat: 22.0797,
      lng: 82.1409,
      radius: 60,
      suggestedMr: 'Pooja Verma',
    },
    {
      id: 'doc-05',
      name: 'Kotma Primary Health Centre',
      clinic: 'Kotma PHC & Wellness Centre',
      specialty: 'Primary Healthcare',
      address: 'Main Road, Kotma, Madhya Pradesh',
      lat: 23.2035,
      lng: 81.9669,
      radius: 40,
      suggestedMr: 'Amit Kumar',
    },
  ];

  // Available Products for Detailing Focus (Only in-stock products with quantity > 0 in store)
  const [inStockProducts, setInStockProducts] = useState<InStockProduct[]>(getStoredInStockProducts);

  // Tasks State - Initialized empty without dummy seed data
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const [verificationLogs] = useState<VerificationLogItem[]>([]);

  // Registered Medical Representatives with Territories
  const mrList = [
    { id: 'usr-mr-01', name: 'Rahul Sharma', territory: 'Shahdol HQ Territory' },
    { id: 'usr-mr-02', name: 'Vikram Malhotra', territory: 'Ambikapur HQ Territory' },
    { id: 'usr-mr-03', name: 'Pooja Verma', territory: 'Bilaspur HQ Territory' },
    { id: 'usr-mr-04', name: 'Amit Kumar', territory: 'Kotma HQ Territory' },
  ];

  const [filterMr, setFilterMr] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(prefilledLocation));

  // Form State
  const [locationMode, setLocationMode] = useState<'saved' | 'custom'>('saved');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');
  const [taskTitle, setTaskTitle] = useState('');
  const [callCategory, setCallCategory] = useState<'DETAILING' | 'LAUNCH' | 'POB' | 'SAMPLE' | 'HOSPITAL'>('DETAILING');
  const [assignedMrId, setAssignedMrId] = useState<string>('usr-mr-01');
  const [assignedMr, setAssignedMr] = useState('Rahul Sharma');
  const [taskLocationName, setTaskLocationName] = useState('');
  const [taskAddress, setTaskAddress] = useState('');
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [taskLat, setTaskLat] = useState<number>(23.2953);
  const [taskLng, setTaskLng] = useState<number>(81.3586);
  const [taskRadius, setTaskRadius] = useState<number>(50);
  const [taskDate, setTaskDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [taskTime, setTaskTime] = useState('11:00');
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>('Asia/Kolkata');
  const [matchedSavedLocation, setMatchedSavedLocation] = useState<DoctorItem | null>(null);
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(() => {
    const initial = getStoredInStockProducts();
    return initial.slice(0, 2).map((p) => p.name);
  });
  const [taskDescription, setTaskDescription] = useState('');

  // Edit Assigned Task State
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskAssignedMrId, setEditTaskAssignedMrId] = useState('usr-mr-01');
  const [editTaskAssignedMrName, setEditTaskAssignedMrName] = useState('Rahul Sharma');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [editTaskLocationName, setEditTaskLocationName] = useState('');
  const [editTaskGeofenceRadius, setEditTaskGeofenceRadius] = useState<number>(100);
  const [editTaskStatus, setEditTaskStatus] = useState<TaskItem['status']>('ASSIGNED');
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // Live Sync In-Stock Products with Store Inventory
  useEffect(() => {
    syncInStockProductsWithBackend().then((items) => {
      if (items && items.length > 0) {
        setInStockProducts(items);
      }
    });

    const handleInventoryChange = (e: any) => {
      if (e && e.detail && Array.isArray(e.detail)) {
        setInStockProducts(e.detail);
      } else {
        setInStockProducts(getStoredInStockProducts());
      }
    };

    window.addEventListener('ahtri_inventory_updated', handleInventoryChange);
    window.addEventListener('storage', handleInventoryChange);

    return () => {
      window.removeEventListener('ahtri_inventory_updated', handleInventoryChange);
      window.removeEventListener('storage', handleInventoryChange);
    };
  }, []);

  useEffect(() => {
    if (inStockProducts.length > 0) {
      setSelectedProducts((prev) => {
        const stillInStock = prev.filter((p) =>
          inStockProducts.some((isp) => isp.name === p || isp.name.includes(p) || p.includes(isp.name))
        );
        return stillInStock.length > 0 ? stillInStock : [inStockProducts[0].name];
      });
    } else {
      setSelectedProducts([]);
    }
  }, [inStockProducts]);
  const [unsuspendingId, setUnsuspendingId] = useState<string | null>(null);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState<boolean>(false);
  const [isBulkUnsuspending, setIsBulkUnsuspending] = useState<boolean>(false);
  const [isCreatingOnServer, setIsCreatingOnServer] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [selectedCompletedTask, setSelectedCompletedTask] = useState<TaskItem | null>(null);
  const [selectedOrderItem, setSelectedOrderItem] = useState<TaskOrderItem | null>(null);
  const [viewingVisitPhoto, setViewingVisitPhoto] = useState<{ url: string; title: string; mrName: string; location: string } | null>(null);

  const getDelayAnalysis = (task: TaskItem) => {
    if (!task.started_at || !task.time) return { isDelayed: false, delayMinutes: 0, text: 'Scheduled On Time' };
    try {
      const scheduledDateTime = new Date(`${task.date || '2026-09-06'}T${task.time}`);
      const actualStart = new Date(task.started_at);
      const diffMinutes = Math.round((actualStart.getTime() - scheduledDateTime.getTime()) / 60000);
      if (diffMinutes > 15) {
        return { isDelayed: true, delayMinutes: diffMinutes, text: `${diffMinutes}m Delay (Late Check-in)` };
      } else if (diffMinutes < -10) {
        return { isDelayed: false, delayMinutes: diffMinutes, text: `${Math.abs(diffMinutes)}m Early (Punctual)` };
      } else {
        return { isDelayed: false, delayMinutes: diffMinutes, text: 'Punctual (±10m of Schedule)' };
      }
    } catch {
      return { isDelayed: false, delayMinutes: 0, text: 'Verified' };
    }
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 5000);
  };

  // Live Auto-Fetch and Overdue Check from Backend
  const fetchBackendTasks = async () => {
    try {
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/tasks`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const deletedIds = getDeletedTaskIds();
          setTasks(data.filter((t: any) => !deletedIds.has(t.id)));
        }
      }
    } catch (err) {
      console.warn('Backend tasks fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchBackendTasks();
    const interval = setInterval(fetchBackendTasks, 4000);
    return () => clearInterval(interval);
  }, []);

  // -------------------------------------------------------------
  // ZONE BY ZONE OPERATIONAL MAP & SAVED LOCATIONS DASHBOARD
  // -------------------------------------------------------------
  const [dashboardView, setDashboardView] = useState<'zone_map' | 'cards'>('zone_map');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
  const [zoneMapMode, setZoneMapMode] = useState<'street' | 'satellite'>('street');
  const [zoneSidebarTab, setZoneSidebarTab] = useState<'locations' | 'tasks'>('locations');
  const [isZoneMapInteracting, setIsZoneMapInteracting] = useState(false);
  const [isZoneLegendOpen, setIsZoneLegendOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [zoneCategoryFilter, setZoneCategoryFilter] = useState<'ALL' | 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE'>('ALL');

  const [zones, setZones] = useState<TerritoryZone[]>(getOperatingZones);
  const [savedLocations, setSavedLocations] = useState<DoctorItem[]>(getStoredSavedLocations);
  const [modalSelectedZoneId, setModalSelectedZoneId] = useState<string>(() => {
    const op = getOperatingZones();
    return op[0]?.id || 'zone-hq-shahdol';
  });

  // Dynamically re-read zones whenever Headquarters or covered regions are updated in Settings
  useEffect(() => {
    const handleHqUpdate = () => {
      setZones(getOperatingZones());
    };
    window.addEventListener('ahtri_hq_updated', handleHqUpdate);
    window.addEventListener('ahtri_areas_updated', handleHqUpdate);
    return () => {
      window.removeEventListener('ahtri_hq_updated', handleHqUpdate);
      window.removeEventListener('ahtri_areas_updated', handleHqUpdate);
    };
  }, []);

  // Modal Map Leaflet Refs
  const modalSavedLocationsLayerRef = useRef<L.LayerGroup | null>(null);
  const modalZoneCircleRef = useRef<L.Circle | null>(null);

  // Zone Map Leaflet Refs
  const zoneMapContainerRef = useRef<HTMLDivElement>(null);
  const zoneMapInstanceRef = useRef<L.Map | null>(null);
  const zoneTileLayerRef = useRef<L.TileLayer | null>(null);
  const zoneCirclesGroupRef = useRef<L.LayerGroup | null>(null);
  const zoneMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const lastZoneDataSigRef = useRef<string>('');
  const isUserInteractingRef = useRef<boolean>(false);

  // Auto-sync locations across all maps, views and backend
  useEffect(() => {
    const handleLocUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setSavedLocations(e.detail);
      }
    };
    window.addEventListener('ahtri_locations_updated', handleLocUpdate);
    syncSavedLocationsWithBackend().then((data) => {
      if (data && Array.isArray(data)) setSavedLocations(data);
    });
    return () => window.removeEventListener('ahtri_locations_updated', handleLocUpdate);
  }, []);

  // Compute locations inside a zone
  const getLocationsInZone = (zone: TerritoryZone) => {
    return savedLocations.filter((loc) => {
      const dist = getDistanceFromLatLngInKm(zone.latitude, zone.longitude, loc.latitude, loc.longitude);
      const inRadius = dist <= zone.radiusKm;
      const zoneKey = zone.name.toLowerCase().split(' ')[0];
      const inArea = loc.area_name && loc.area_name.toLowerCase().includes(zoneKey);
      return inRadius || inArea;
    });
  };

  // Compute tasks assigned inside a zone
  const getTasksInZone = (zone: TerritoryZone) => {
    return tasks.filter((t) => {
      const dist = getDistanceFromLatLngInKm(zone.latitude, zone.longitude, t.latitude, t.longitude);
      const inRadius = dist <= zone.radiusKm;
      const zoneKey = zone.name.toLowerCase().split(' ')[0];
      const inArea = t.location_name && t.location_name.toLowerCase().includes(zoneKey);
      return inRadius || inArea;
    });
  };

  // Switch Active Zone
  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    if (!zoneMapInstanceRef.current) return;
    if (zoneId === 'all') {
      zoneMapInstanceRef.current.flyTo([23.2953, 81.3586], 8.5, { duration: 1.0 });
    } else {
      const target = zones.find((z) => z.id === zoneId);
      if (target) {
        zoneMapInstanceRef.current.flyTo([target.latitude, target.longitude], 12.5, { duration: 1.0 });
      }
    }
  };

  // Open create task modal cleanly with preset or custom mode
  const handleOpenCreateModal = (mode: 'saved' | 'custom' = 'saved') => {
    setLocationMode(mode);
    const activeZone = zones.find((z) => z.id === modalSelectedZoneId) || zones[0];
    if (mode === 'custom') {
      setMatchedSavedLocation(null);
      setSelectedPresetId('custom');
      setTaskLocationName('');
      setTaskAddress('');
      setTaskTitle('');
      if (activeZone) {
        setTaskLat(activeZone.latitude);
        setTaskLng(activeZone.longitude);
        if (markerRef.current) markerRef.current.setLatLng([activeZone.latitude, activeZone.longitude]);
        if (circleRef.current) circleRef.current.setLatLng([activeZone.latitude, activeZone.longitude]);
        if (mapInstanceRef.current) mapInstanceRef.current.setView([activeZone.latitude, activeZone.longitude], 15);
      }
    } else {
      const inZone = savedLocations.filter((l) => {
        if (!activeZone) return true;
        const d = calculateDistanceKm(activeZone.latitude, activeZone.longitude, l.latitude, l.longitude);
        return d <= activeZone.radiusKm;
      });
      if (inZone.length > 0) {
        handleSelectSavedLocationPreset(inZone[0].id);
      } else if (savedLocations.length > 0) {
        handleSelectSavedLocationPreset(savedLocations[0].id);
      }
    }
    setIsCreateModalOpen(true);
  };


  const toggleZoneMapInteraction = () => {
    if (!zoneMapInstanceRef.current) return;
    if (isZoneMapInteracting) {
      zoneMapInstanceRef.current.dragging.disable();
      setIsZoneMapInteracting(false);
    } else {
      zoneMapInstanceRef.current.dragging.enable();
      setIsZoneMapInteracting(true);
    }
  };

  // Initialize Zone Overview Map with Hardware Canvas Acceleration & Multi-CDN Fallback
  useEffect(() => {
    if (dashboardView !== 'zone_map' || !zoneMapContainerRef.current) return;

    if (!zoneMapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = createOptimizedMap(zoneMapContainerRef.current, {
        zoomControl: false,
        dragging: !isMobile,
      }).setView([23.2953, 81.3586], 8.5);
      zoneMapInstanceRef.current = map;

      // Position zoom controls in bottom-right to avoid overlapping top controls
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('movestart', () => {
        isUserInteractingRef.current = true;
      });
      map.on('moveend', () => {
        isUserInteractingRef.current = false;
      });

      zoneTileLayerRef.current = createResilientTileLayer(zoneMapMode).addTo(map);

      zoneCirclesGroupRef.current = L.layerGroup().addTo(map);
      zoneMarkersGroupRef.current = L.layerGroup().addTo(map);

      let resizeObserver: ResizeObserver | null = null;
      if (zoneMapContainerRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          zoneMapInstanceRef.current?.invalidateSize();
        });
        resizeObserver.observe(zoneMapContainerRef.current);
      }
    }

    renderZoneMapEntities();

    setTimeout(() => zoneMapInstanceRef.current?.invalidateSize(), 50);
    setTimeout(() => zoneMapInstanceRef.current?.invalidateSize(), 200);
    setTimeout(() => zoneMapInstanceRef.current?.invalidateSize(), 500);
  }, [dashboardView]);

  // Update Zone Map Mode (Street / Satellite) with Resilient Layer
  useEffect(() => {
    if (!zoneMapInstanceRef.current || !zoneTileLayerRef.current) return;
    zoneMapInstanceRef.current.removeLayer(zoneTileLayerRef.current);
    zoneTileLayerRef.current = createResilientTileLayer(zoneMapMode).addTo(zoneMapInstanceRef.current);
  }, [zoneMapMode]);

  // Re-render Zone Map Entities with Intelligent Anti-Jank Diffing
  useEffect(() => {
    if (dashboardView === 'zone_map') {
      const currentSig = `${selectedZoneId}_${savedLocations.length}_${tasks.map((t) => `${t.id}:${t.status}:${t.date}`).join('|')}_${zones.length}`;
      if (currentSig !== lastZoneDataSigRef.current && !isUserInteractingRef.current) {
        lastZoneDataSigRef.current = currentSig;
        renderZoneMapEntities();
      }
    }
  }, [selectedZoneId, savedLocations, tasks, zones]);

  // Render HQ Territory Markers & Saved Points of Care (Clean view without dashed circles or TASK badges)
  const renderZoneMapEntities = () => {
    if (!zoneCirclesGroupRef.current || !zoneMarkersGroupRef.current || !zoneMapInstanceRef.current) return;
    zoneCirclesGroupRef.current.clearLayers();
    zoneMarkersGroupRef.current.clearLayers();

    // 1. Render clean Headquarters Badges for each configured HQ
    zones.forEach((zone) => {
      const isFocused = selectedZoneId === 'all' || selectedZoneId === zone.id;

      // Clean HQ Marker Badge - No dashed geofence circles or cluttered pill counters
      const centerIcon = L.divIcon({
        className: 'hq-marker-badge',
        html: `<div style="background:${isFocused ? '#1E293B' : '#334155'};color:#FFFFFF;padding:5px 12px;border-radius:8px;font-size:11.5px;font-weight:800;border:2px solid ${zone.color || '#3B82F6'};box-shadow:0 4px 14px rgba(0,0,0,0.38);white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:6px;transform:translate(-50%, -50%);">
          <span style="font-size:13px;">🏢</span>
          <span>${zone.name}</span>
        </div>`,
        iconAnchor: [0, 0],
      });

      const centerMarker = L.marker([zone.latitude, zone.longitude], { icon: centerIcon }).addTo(zoneCirclesGroupRef.current!);
      centerMarker.on('click', () => handleSelectZone(zone.id));
    });

    // 2. Render Saved Locations inside selected/all zones
    const activeZone = zones.find((z) => z.id === selectedZoneId);
    const visibleLocations = selectedZoneId === 'all' ? savedLocations : activeZone ? getLocationsInZone(activeZone) : savedLocations;

    visibleLocations.forEach((loc) => {
      const pinIcon = L.divIcon({
        html: create3DMapPinHtml({ category: loc.category || 'CLINIC', isSelected: false }),
        className: 'saved-location-3d-marker',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: pinIcon }).addTo(zoneMarkersGroupRef.current!);

      const popupHtml = `
        <div style="font-family:sans-serif;min-width:210px;padding:4px 2px;">
          <div style="font-weight:800;font-size:13.5px;color:#0F172A;margin-bottom:2px;">${loc.clinic || loc.name}</div>
          <div style="font-size:11.5px;color:#0F8B5A;font-weight:600;">${loc.doctor_name ? 'Dr. ' + loc.doctor_name : loc.specialization || ''}</div>
          <div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.3;">${loc.address}</div>
          <div style="font-size:11px;color:#0F8B5A;font-weight:700;margin-top:4px;display:flex;align-items:center;gap:4px;">
            📍 Marked by: ${loc.created_by_name || 'Rahul Sharma (Field MR)'}
          </div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;font-weight:700;background:#EFF6FF;color:#1A3C6E;padding:2px 6px;border-radius:4px;">${loc.category || 'CLINIC'}</span>
            <span style="font-size:10.5px;color:#64748B;font-weight:600;">Saved Point of Care</span>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  };

  // Embedded Map State inside the Modal
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [searchMapQuery, setSearchMapQuery] = useState('');
  const [isModalPinCardExpanded, setIsModalPinCardExpanded] = useState(false);
  const [isModalMapInteracting, setIsModalMapInteracting] = useState(false);

  const toggleModalMapInteraction = () => {
    if (!mapInstanceRef.current) return;
    if (isModalMapInteracting) {
      mapInstanceRef.current.dragging.disable();
      mapInstanceRef.current.touchZoom.disable();
      setIsModalMapInteracting(false);
    } else {
      mapInstanceRef.current.dragging.enable();
      mapInstanceRef.current.touchZoom.enable();
      setIsModalMapInteracting(true);
    }
  };
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  // Listen for prefilled location changes
  useEffect(() => {
    if (prefilledLocation) {
      setLocationMode('custom');
      setMatchedSavedLocation(null);
      setSelectedPresetId('custom');
      setTaskLocationName(prefilledLocation.name);
      setTaskAddress(prefilledLocation.address);
      setTaskLat(prefilledLocation.latitude);
      setTaskLng(prefilledLocation.longitude);
      setTaskRadius(prefilledLocation.geofence_radius_m || 50);
      setTaskTitle(`Detailing Call at ${prefilledLocation.name}`);
      setIsCreateModalOpen(true);
    }
  }, [prefilledLocation]);

  // Render all saved points of care as clickable 3D map pins inside Assign Modal Map
  const renderModalSavedLocations = (map: L.Map) => {
    if (!modalSavedLocationsLayerRef.current) return;
    modalSavedLocationsLayerRef.current.clearLayers();

    savedLocations.forEach((loc) => {
      const isSelected = matchedSavedLocation?.id === loc.id;
      const pinHtml = create3DMapPinHtml({
        category: loc.category || 'CLINIC',
        isSelected,
      });

      const icon = L.divIcon({
        html: pinHtml,
        className: 'saved-location-3d-marker',
        iconSize: isSelected ? [28, 37] : [24, 32],
        iconAnchor: isSelected ? [14, 37] : [12, 32],
        popupAnchor: [0, isSelected ? -35 : -30],
      });

      const m = L.marker([loc.latitude, loc.longitude], { icon }).addTo(modalSavedLocationsLayerRef.current!);
      m.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:220px;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;background:#1A3C6E;color:#FFFFFF;">${loc.category || 'POINT OF CARE'}</span>
            <span style="font-size:10px;color:#10B981;font-weight:700;">Verified Saved Location</span>
          </div>
          <div style="font-weight:800;font-size:13px;color:#0F172A;margin-top:4px;line-height:1.25;">${loc.clinic || loc.name}</div>
          <div style="font-size:11px;color:#0369A1;font-weight:600;margin-top:2px;">${loc.name} (${loc.specialization || 'Healthcare Provider'})</div>
          <div style="font-size:10.5px;color:#64748B;margin-top:3px;">${loc.address}</div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;">
            <button
              type="button"
              onclick="window.__selectModalLocation('${loc.id}')"
              style="width:100%;padding:6px 12px;background:#1A3C6E;color:#FFFFFF;border:none;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;"
            >
              Use This Saved Location
            </button>
          </div>
        </div>
      `);
    });
  };

  // Helper to select a saved location preset
  const handleSelectSavedLocationPreset = (locId: string) => {
    setLocationMode('saved');
    setSelectedPresetId(`saved-${locId}`);
    const loc = savedLocations.find((l) => l.id === locId);
    if (loc) {
      setMatchedSavedLocation(loc);
      setTaskLocationName(loc.clinic || loc.name);
      setTaskAddress(loc.address || '');
      setTaskLat(loc.latitude);
      setTaskLng(loc.longitude);
      setTaskRadius(loc.geofence_radius_m || 50);
      setTaskTitle(`Detailing Call at ${loc.clinic || loc.name}`);

      // Auto match zone
      const matchedZone = zones.find((z) => {
        const dist = calculateDistanceKm(z.latitude, z.longitude, loc.latitude, loc.longitude);
        return dist <= z.radiusKm * 1.5;
      });
      if (matchedZone) {
        setModalSelectedZoneId(matchedZone.id);
        if (matchedZone.assignedMrId) {
          setAssignedMrId(matchedZone.assignedMrId);
          setAssignedMr(matchedZone.assignedMr);
        }
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([loc.latitude, loc.longitude], 16);
      }
      if (markerRef.current) markerRef.current.setLatLng([loc.latitude, loc.longitude]);
      if (circleRef.current) {
        circleRef.current.setLatLng([loc.latitude, loc.longitude]);
        circleRef.current.setRadius(loc.geofence_radius_m || 50);
      }
    }
  };

  // Helper to change operational territory zone in modal
  const handleSelectModalZone = (zoneId: string) => {
    setModalSelectedZoneId(zoneId);
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    if (zone.assignedMrId) {
      setAssignedMrId(zone.assignedMrId);
      setAssignedMr(zone.assignedMr);
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([zone.latitude, zone.longitude], 14, { duration: 1.0 });
    }

    // Only auto-pick saved customer preset if currently in 'saved' mode
    if (locationMode === 'saved') {
      const inZone = savedLocations.filter((l) => {
        const dist = calculateDistanceKm(zone.latitude, zone.longitude, l.latitude, l.longitude);
        return dist <= zone.radiusKm;
      });

      if (inZone.length > 0) {
        handleSelectSavedLocationPreset(inZone[0].id);
      }
    }
  };

  // Global handler for Leaflet popup "Use This Saved Location" button
  useEffect(() => {
    window.__selectModalLocation = (locId: string) => {
      setLocationMode('saved');
      handleSelectSavedLocationPreset(locId);
    };
    return () => {
      delete window.__selectModalLocation;
    };
  }, [savedLocations, zones]);

  // Initialize Embedded Map when Create Modal is open
  useEffect(() => {
    if (!isCreateModalOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = createOptimizedMap(mapContainerRef.current, {
        zoomControl: false,
        dragging: true,
        touchZoom: true,
      }).setView([taskLat, taskLng], 16);
      mapInstanceRef.current = map;
      map.dragging.enable();
      map.touchZoom.enable();
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      // Group for all saved locations
      modalSavedLocationsLayerRef.current = L.layerGroup().addTo(map);

      // Render all saved points of care as 3D pins
      renderModalSavedLocations(map);

      const customIcon = L.divIcon({
        html: create3DMapPinHtml({ category: 'CLINIC', isSelected: true }),
        className: 'saved-location-3d-marker',
        iconSize: [28, 37],
        iconAnchor: [14, 37],
        popupAnchor: [0, -35],
      });

      const marker = L.marker([taskLat, taskLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      const circle = L.circle([taskLat, taskLng], {
        radius: taskRadius,
        color: '#0F8B5A',
        fillColor: '#0F8B5A',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '5, 8',
      }).addTo(map);
      circleRef.current = circle;

      // Click anywhere to place marker or snap to saved point of care
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updateLocationFromMap(lat, lng);
      });

      // Drag marker
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateLocationFromMap(pos.lat, pos.lng);
      });
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        modalSavedLocationsLayerRef.current = null;
        modalZoneCircleRef.current = null;
      }
    };
  }, [isCreateModalOpen]);

  // Re-render saved locations when locations change while modal is open
  useEffect(() => {
    if (isCreateModalOpen && mapInstanceRef.current) {
      renderModalSavedLocations(mapInstanceRef.current);
    }
  }, [savedLocations, matchedSavedLocation, isCreateModalOpen]);

  // Update map tile layer when switching Satellite vs Street mode
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(mapInstanceRef.current);
  }, [mapMode]);

  // Update circle radius on slider change
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(taskRadius);
    }
  }, [taskRadius]);

  // Update coordinates and reverse geocode when clicking/dragging map
  const updateLocationFromMap = async (lat: number, lng: number, nameHint?: string) => {
    // Only snap to saved customer if in SAVED mode
    if (locationMode === 'saved') {
      const nearbySaved = savedLocations.find((l) => {
        const dist = calculateDistanceKm(lat, lng, l.latitude, l.longitude);
        return dist <= 0.08; // 80 meters
      });

      if (nearbySaved) {
        handleSelectSavedLocationPreset(nearbySaved.id);
        showToast(`Selected saved customer: ${nearbySaved.clinic || nearbySaved.name}`, 'info');
        return;
      }
    }

    // Custom Mode (or no saved point nearby): update custom coordinates directly without snapping
    setMatchedSavedLocation(null);
    setTaskLat(lat);
    setTaskLng(lng);
    setSelectedPresetId('custom');

    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    if (circleRef.current) circleRef.current.setLatLng([lat, lng]);
    if (mapInstanceRef.current) mapInstanceRef.current.panTo([lat, lng]);

    if (nameHint) {
      setTaskLocationName(nameHint);
      if (!taskTitle || taskTitle.startsWith('Detailing Call at') || taskTitle === '') {
        setTaskTitle(`Detailing Call at ${nameHint}`);
      }
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setTaskAddress(data.display_name);
          if (!nameHint && !taskLocationName) {
            const shortName = data.name || (data.address && (data.address.hospital || data.address.amenity || data.address.road || data.address.suburb)) || 'Custom Destination';
            setTaskLocationName(shortName);
            if (!taskTitle || taskTitle.startsWith('Detailing Call at')) {
              setTaskTitle(`Detailing Call at ${shortName}`);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }
  };

  // Search Address / Clinic on map
  const handleSearchOnMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMapQuery.trim()) return;

    setIsSearchingMap(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchMapQuery)}&limit=1`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          mapInstanceRef.current?.setView([lat, lon], 16);
          updateLocationFromMap(lat, lon, first.name || searchMapQuery);
        } else {
          alert('Location not found. Try searching with city or landmark.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const [isLocatingMe, setIsLocatingMe] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setIsLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingMe(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);
        }
        updateLocationFromMap(latitude, longitude, 'Current GPS Position');
        showToast('Map centered to your current GPS position.', 'success');
      },
      (err) => {
        setIsLocatingMe(false);
        console.warn('Geolocation error:', err);
        showToast('Unable to get current location: ' + (err.message || 'Permission denied'), 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Preset or custom selection
  const handleSelectPreset = (presetId: string) => {
    if (presetId === 'custom') {
      setLocationMode('custom');
      setMatchedSavedLocation(null);
      setSelectedPresetId('custom');
      return;
    }
    if (presetId.startsWith('saved-')) {
      setLocationMode('saved');
      handleSelectSavedLocationPreset(presetId.replace('saved-', ''));
      return;
    }
    setSelectedPresetId(presetId);
    const preset = doctorPresets.find((p) => p.id === presetId);
    if (preset) {
      setLocationMode('saved');
      setMatchedSavedLocation(null);
      setTaskLocationName(preset.clinic);
      setTaskAddress(preset.address);
      setTaskLat(preset.lat);
      setTaskLng(preset.lng);
      setTaskRadius(preset.radius);
      setTaskTitle(`${preset.name} Detailing - ${preset.specialty}`);
      if (preset.suggestedMr) {
        const found = mrList.find((m) => m.name === preset.suggestedMr);
        if (found) {
          setAssignedMrId(found.id);
          setAssignedMr(found.name);
        } else {
          setAssignedMr(preset.suggestedMr);
        }
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([preset.lat, preset.lng], 16);
      }
      if (markerRef.current) markerRef.current.setLatLng([preset.lat, preset.lng]);
      if (circleRef.current) {
        circleRef.current.setLatLng([preset.lat, preset.lng]);
        circleRef.current.setRadius(preset.radius);
      }
    }
  };

  // Toggle product chip
  const toggleProduct = (prod: string) => {
    if (selectedProducts.includes(prod)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== prod));
    } else {
      setSelectedProducts([...selectedProducts, prod]);
    }
  };

  // Create Task on Backend with full resilience so no 401 ever blocks the manager
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !assignedMrId) {
      showToast('Please fill in task title and select an assigned MR', 'error');
      return;
    }

    setIsCreatingOnServer(true);
    const payload = {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      assigned_mr_id: assignedMrId,
      date: taskDate,
      time: taskTime.length === 5 ? `${taskTime}:00` : taskTime,
      latitude: taskLat,
      longitude: taskLng,
      location_name: taskLocationName,
      geofence_radius_m: taskRadius,
      priority: taskPriority,
    };

    try {
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
        setIsCreateModalOpen(false);
        if (onClearPrefilledLocation) onClearPrefilledLocation();
        showToast(`Task assigned to ${assignedMr} (${formatDateDDMMYYYY(taskDate)} • ${taskTime} ${selectedTimeZone === 'Asia/Kolkata' ? 'IST' : selectedTimeZone}).`, 'success');
      } else {
        // Graceful fallback on 401 or backend validation error
        console.warn('Backend rejected task assignment, saving locally:', res.status);
        const newTask: TaskItem = {
          id: `task-${Date.now().toString().slice(-4)}`,
          title: taskTitle,
          date: taskDate,
          time: taskTime,
          assigned_mr_name: assignedMr,
          assigned_mr_id: assignedMrId,
          location_name: taskLocationName,
          latitude: taskLat,
          longitude: taskLng,
          geofence_radius_m: taskRadius,
          priority: taskPriority,
          status: 'ASSIGNED',
          distance_verified: false,
        };
        setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
        setIsCreateModalOpen(false);
        if (onClearPrefilledLocation) onClearPrefilledLocation();
        showToast(`Task assigned to ${assignedMr} (${formatDateDDMMYYYY(taskDate)} • ${taskTime} IST).`, 'success');
      }
    } catch (err) {
      console.warn('Backend unavailable, falling back to local state:', err);
      const newTask: TaskItem = {
        id: `task-${Date.now().toString().slice(-4)}`,
        title: taskTitle,
        date: taskDate,
        time: taskTime,
        assigned_mr_name: assignedMr,
        assigned_mr_id: assignedMrId,
        location_name: taskLocationName,
        latitude: taskLat,
        longitude: taskLng,
        geofence_radius_m: taskRadius,
        priority: taskPriority,
        status: 'ASSIGNED',
        distance_verified: false,
      };
      setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
      setIsCreateModalOpen(false);
      if (onClearPrefilledLocation) onClearPrefilledLocation();
      showToast(`Task assigned locally to ${assignedMr}.`, 'info');
    } finally {
      setIsCreatingOnServer(false);
    }
  };

  // Owner Action: Unsuspend Task
  const handleUnsuspendTask = async (taskId: string, currentTaskTitle: string, mrName: string) => {
    setUnsuspendingId(taskId);
    try {
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const today = getTodayDateString();
      const res = await fetch(`${apiUrl}/tasks/${taskId}/unsuspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newDate: today }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Task unsuspended. Date reset to today (${formatDateDDMMYYYY(today)}). ${mrName} unlocked.`, 'success');
        await fetchBackendTasks();
      } else {
        showToast(data.message || 'Failed to unsuspend task.', 'error');
      }
    } catch (err) {
      console.error('Error unsuspending task:', err);
      // Fallback local update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: 'ASSIGNED', date: getTodayDateString() }
            : t
        )
      );
      showToast('Task status reset to ASSIGNED locally.', 'info');
    } finally {
      setUnsuspendingId(null);
    }
  };

  // Owner Action: Bulk Unsuspend All Overdue Tasks
  const handleUnsuspendAllTasks = async () => {
    const suspendedList = tasks.filter((t) => t.status === 'SUSPENDED');
    if (suspendedList.length === 0) return;
    setIsBulkUnsuspending(true);
    try {
      for (const t of suspendedList) {
        await handleUnsuspendTask(t.id, t.title, t.assigned_mr_name);
      }
      showToast(`All ${suspendedList.length} suspended task(s) unsuspended and reset to today.`, 'success');
    } catch (err) {
      console.error('Error bulk unsuspending:', err);
    } finally {
      setIsBulkUnsuspending(false);
    }
  };

  // Owner Action: Delete Individual Task
  const handleDeleteTask = async (taskId: string, title: string) => {
    showCenteredNotice({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete task "${title}"?\n\nThis will remove it from the system entirely.`,
      type: 'confirm',
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      onConfirm: async () => {
        // 1. Immediately persist locally
        markTaskAsDeleted(taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        window.dispatchEvent(new Event('ahtri_approvals_updated'));

        // 2. Resilient multi-method backend deletion
        try {
          const apiUrl = getApiBaseUrl();
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          const hdrs: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
          // Method A: DELETE
          await fetch(`${apiUrl}/tasks/${taskId}`, { method: 'DELETE', headers: hdrs }).catch(() => null);
          // Method B: POST :id/delete
          await fetch(`${apiUrl}/tasks/${taskId}/delete`, { method: 'POST', headers: hdrs }).catch(() => null);
          // Method C: Fallback PATCH status: CANCELLED
          await fetch(`${apiUrl}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: hdrs,
            body: JSON.stringify({ status: 'CANCELLED' }),
          }).catch(() => null);
        } catch {}

        showCenteredNotice({
          title: 'Task Deleted',
          message: `Task "${title}" deleted successfully.`,
          type: 'success',
        });
      },
    });
  };

  // Owner Action: Clear All Tasks Data
  const handleClearAllTasks = async () => {
    const idsToClear = tasks.map((t) => t.id);
    showCenteredNotice({
      title: 'Delete All Task Data',
      message: `Are you sure you want to permanently delete all ${tasks.length} task(s)?\n\nThis will clear all task data so you can start completely fresh.`,
      type: 'confirm',
      confirmText: 'Delete All Tasks',
      cancelText: 'Cancel',
      onConfirm: async () => {
        // 1. Immediately persist locally
        markTaskAsDeleted(idsToClear);
        setTasks([]);
        window.dispatchEvent(new Event('ahtri_approvals_updated'));

        // 2. Resilient backend deletion
        try {
          const apiUrl = getApiBaseUrl();
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          const hdrs: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
          // Method A: DELETE /tasks
          await fetch(`${apiUrl}/tasks`, { method: 'DELETE', headers: hdrs }).catch(() => null);
          // Method B: POST /tasks/clear-all
          await fetch(`${apiUrl}/tasks/clear-all`, { method: 'POST', headers: hdrs }).catch(() => null);
          // Method C: Fallback cancel each
          for (const id of idsToClear) {
            fetch(`${apiUrl}/tasks/${id}`, {
              method: 'PATCH',
              headers: hdrs,
              body: JSON.stringify({ status: 'CANCELLED' }),
            }).catch(() => null);
          }
        } catch {}

        showCenteredNotice({
          title: 'All Tasks Cleared',
          message: 'All task data has been permanently cleared. You can now create fresh tasks.',
          type: 'success',
        });
      },
    });
  };

  // Owner Action: Open Edit Task Modal
  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setEditTaskTitle(task.title || '');
    setEditTaskAssignedMrId(task.assigned_mr_id || 'usr-mr-01');
    setEditTaskAssignedMrName(task.assigned_mr_name || 'Rahul Sharma');
    setEditTaskDate(task.date || getTodayDateString());
    setEditTaskTime(task.time || '10:00 AM');
    setEditTaskPriority(task.priority || 'HIGH');
    setEditTaskLocationName(task.location_name || '');
    setEditTaskGeofenceRadius(task.geofence_radius_m || 100);
    setEditTaskStatus(task.status || 'ASSIGNED');
  };

  // Owner Action: Save Edited Task
  const handleSaveEditedTask = async () => {
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      showCenteredNotice({
        title: 'Validation Error',
        message: 'Please enter a task title.',
        type: 'warning',
      });
      return;
    }

    setIsUpdatingTask(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const payload = {
        title: editTaskTitle.trim(),
        assigned_mr_id: editTaskAssignedMrId,
        assigned_mr_name: editTaskAssignedMrName,
        date: editTaskDate,
        time: editTaskTime,
        priority: editTaskPriority,
        location_name: editTaskLocationName.trim(),
        geofence_radius_m: Number(editTaskGeofenceRadius),
        status: editTaskStatus,
      };

      // Try PATCH first, fallback to POST /update
      const res = await fetch(`${apiUrl}/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch(`${apiUrl}/tasks/${editingTask.id}/update`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }).catch(() => null);
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                ...payload,
              }
            : t
        )
      );

      setEditingTask(null);
      window.dispatchEvent(new Event('ahtri_approvals_updated'));

      showCenteredNotice({
        title: 'Task Reassigned & Updated',
        message: `Task "${editTaskTitle.trim()}" has been updated and assigned to ${editTaskAssignedMrName}.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error updating task:', err);
      showCenteredNotice({
        title: 'Update Error',
        message: 'Failed to update task: ' + (err.message || 'Network error'),
        type: 'error',
      });
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} mins ${s} secs`;
  };

  const filteredTasks = tasks.filter((t) => {
    // Suspended tasks are strictly routed to Approval Hub per requirements
    if (t.status === 'SUSPENDED') return false;
    const matchesMr = filterMr === 'ALL' || t.assigned_mr_name === filterMr;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesMr && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap' as const,
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
            MR Task Agenda & Secret Duration Tracking
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
            Assign tasks to registered MRs. Only the assigned member sees their task. Meeting durations and booked orders are tracked here for owner review.
          </p>
        </div>

        <div className="tasks-header-actions-row">
          {/* View Mode Switcher: Zone Map vs Task Cards */}
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '3px', borderRadius: '7px', border: '1px solid #CBD5E1' }}>
            <button
              type="button"
              onClick={() => {
                setDashboardView('zone_map');
                setTimeout(() => zoneMapInstanceRef.current?.invalidateSize(), 200);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '5px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                background: dashboardView === 'zone_map' ? '#1A3C6E' : 'transparent',
                color: dashboardView === 'zone_map' ? '#FFFFFF' : '#475569',
                boxShadow: dashboardView === 'zone_map' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Compass size={14} /> Zone by Zone Map
            </button>
            <button
              type="button"
              onClick={() => setDashboardView('cards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '5px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                background: dashboardView === 'cards' ? '#1A3C6E' : 'transparent',
                color: dashboardView === 'cards' ? '#FFFFFF' : '#475569',
                boxShadow: dashboardView === 'cards' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={14} /> Task Cards & Audit
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal('saved')}
            style={{
              padding: '9px 16px',
              background: '#1A3C6E',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap' as const,
            }}
          >
            <Plus size={16} /> Assign Task to MR
          </button>
        </div>
      </div>

      {/* Zone by Zone Map Section */}
      {dashboardView === 'zone_map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Zone Selector Chips */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflowX: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
              <Compass size={15} color="#1A3C6E" /> OPERATIONAL ZONES:
            </div>

            {/* All Zones Chip */}
            <button
              type="button"
              onClick={() => handleSelectZone('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                borderRadius: '20px',
                border: selectedZoneId === 'all' ? '2px solid #1A3C6E' : '1px solid #CBD5E1',
                background: selectedZoneId === 'all' ? '#EFF6FF' : '#F8FAFC',
                color: selectedZoneId === 'all' ? '#1A3C6E' : '#475569',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>All Territory Zones ({zones.length})</span>
              <span
                style={{
                  background: selectedZoneId === 'all' ? '#1A3C6E' : '#94A3B8',
                  color: '#FFFFFF',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '10.5px',
                  fontWeight: '800',
                }}
              >
                {savedLocations.length} Saved Locs
              </span>
            </button>

            {/* Individual Zones */}
            {zones.map((zone) => {
              const isSelected = selectedZoneId === zone.id;
              const locsCount = getLocationsInZone(zone).length;
              const tasksCount = getTasksInZone(zone).length;
              const branchLabel =
                zone.branchType === 'HEADQUARTERS'
                  ? 'HQ'
                  : zone.branchType === 'REGIONAL_HUB'
                  ? 'HUB'
                  : zone.branchType === 'ZONAL_DEPOT'
                  ? 'DEPOT'
                  : 'BRANCH';

              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => handleSelectZone(zone.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    border: isSelected ? `2px solid ${zone.color}` : '1px solid #E2E8F0',
                    background: isSelected ? `${zone.color}15` : '#FFFFFF',
                    color: isSelected ? zone.color : '#334155',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? `0 2px 8px ${zone.color}30` : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: zone.color,
                      display: 'inline-block',
                    }}
                  />
                  <span>{zone.name}</span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: '800',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: zone.branchType === 'HEADQUARTERS' ? '#1A3C6E' : '#F1F5F9',
                      color: zone.branchType === 'HEADQUARTERS' ? '#FFFFFF' : '#475569',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    {branchLabel}
                  </span>
                  <span
                    style={{
                      background: isSelected ? zone.color : '#E2E8F0',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      padding: '1px 7px',
                      borderRadius: '10px',
                      fontSize: '10.5px',
                      fontWeight: '800',
                    }}
                  >
                    {locsCount} Locs • {tasksCount} Tasks
                  </span>
                </button>
              );
            })}
          </div>

          {/* Zone Metrics Cards */}
          {(() => {
            const activeZone = zones.find((z) => z.id === selectedZoneId);
            const displayedLocations = selectedZoneId === 'all' ? savedLocations : activeZone ? getLocationsInZone(activeZone) : savedLocations;
            const displayedTasks = selectedZoneId === 'all' ? tasks : activeZone ? getTasksInZone(activeZone) : tasks;
            const clinicCount = displayedLocations.filter((l) => l.category === 'CLINIC').length;
            const hospitalCount = displayedLocations.filter((l) => l.category === 'HOSPITAL').length;
            const pharmacyCount = displayedLocations.filter((l) => l.category === 'PHARMACY').length;
            const pendingTasks = displayedTasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length;
            const completedTasks = displayedTasks.filter((t) => t.status === 'COMPLETED').length;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {/* Metric 1: Active Zone Territory */}
                <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Active Territory Zone
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: activeZone ? activeZone.color : '#1A3C6E', marginTop: '4px' }}>
                    {activeZone ? activeZone.name : 'All Territory Zones'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: '#F1F5F9', color: '#334155' }}>
                      {activeZone ? activeZone.branchType.replace('_', ' ') : `${zones.length} Zones Active`}
                    </span>
                    {activeZone && <span>{activeZone.radiusKm} km radius</span>}
                  </div>
                </div>

                {/* Metric 2: Saved Point-of-Care Locations */}
                <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Saved Locations in Zone
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F8B5A', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span>{displayedLocations.length}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>point-of-care units</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span><strong>{clinicCount}</strong> Clinics</span>
                    <span>•</span>
                    <span><strong>{hospitalCount}</strong> Hospitals</span>
                    <span>•</span>
                    <span><strong>{pharmacyCount}</strong> Pharmacies</span>
                  </div>
                </div>

                {/* Metric 3: Scheduled MR Tasks */}
                <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tasks in This Territory
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#1A3C6E', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span>{displayedTasks.length}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>scheduled visits</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#2563EB' }}><strong>{pendingTasks}</strong> Active/Pending</span>
                    <span>•</span>
                    <span style={{ color: '#166534' }}><strong>{completedTasks}</strong> Completed</span>
                  </div>
                </div>

                {/* Metric 4: Assigned Representative / Geofence Coverage */}
                <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Assigned Field Force
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} color="#1A3C6E" />
                    <span>{activeZone ? activeZone.assignedMr : 'Distributed Field Team'}</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                    {activeZone ? `GPS Geofence: ${activeZone.latitude.toFixed(4)}, ${activeZone.longitude.toFixed(4)}` : 'Covering all operational branches'}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Interactive Zone Map & Locations Intelligence Explorer */}
          <div className="tasks-geofence-grid">
            {/* Left: Map Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Map Controls Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={16} color="#1A3C6E" />
                  <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0F172A' }}>
                    Territory Geofences & Saved Points-of-Care
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Street vs Satellite */}
                  <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                    <button
                      type="button"
                      onClick={() => setZoneMapMode('street')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: zoneMapMode === 'street' ? '#1A3C6E' : 'transparent',
                        color: zoneMapMode === 'street' ? '#FFFFFF' : '#475569',
                      }}
                    >
                      Road Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoneMapMode('satellite')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: zoneMapMode === 'satellite' ? '#1A3C6E' : 'transparent',
                        color: zoneMapMode === 'satellite' ? '#FFFFFF' : '#475569',
                      }}
                    >
                      Satellite
                    </button>
                  </div>

                  {/* Mobile Touch Pan Lock / Unlock Button */}
                  <button
                    type="button"
                    onClick={toggleZoneMapInteraction}
                    style={{
                      padding: '4px 8px',
                      background: isZoneMapInteracting ? '#0F8B5A' : '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: isZoneMapInteracting ? '#FFFFFF' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                    title="Toggle whether touching the map drags the map or scrolls the page"
                  >
                    <span>{isZoneMapInteracting ? '🔓 Pan On' : '🔒 Pan Map'}</span>
                  </button>

                  {/* Reset Center */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedZoneId === 'all') {
                        zoneMapInstanceRef.current?.flyTo([28.538, 77.206], 12);
                      } else {
                        const target = zones.find((z) => z.id === selectedZoneId);
                        if (target) zoneMapInstanceRef.current?.flyTo([target.latitude, target.longitude], 13.5);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Crosshair size={12} /> Center
                  </button>
                </div>
              </div>

              {/* Map Canvas */}
              <div
                ref={zoneMapContainerRef}
                className="tasks-zone-map-wrapper"
                style={{
                  width: '100%',
                  minHeight: '380px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1,
                }}
              />

              {/* Map Legend (Collapsible on Mobile) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsZoneLegendOpen(!isZoneLegendOpen)}
                  style={{
                    alignSelf: 'flex-start',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>ℹ️ Map Legend {isZoneLegendOpen ? '▲' : '▼'}</span>
                </button>

                {isZoneLegendOpen && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      fontSize: '11px',
                      color: '#64748B',
                      padding: '8px 12px',
                      background: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#0F8B5A', display: 'inline-block' }} />
                      <span>Clinic (3D Pin)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#DC2626', display: 'inline-block' }} />
                      <span>Hospital (3D Pin)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#D97706', display: 'inline-block' }} />
                      <span>Pharmacy / Chemist (3D Pin)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
                      <span>Scheduled Task</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '14px', height: '0px', borderTop: '2px dashed #1A3C6E', display: 'inline-block' }} />
                      <span>Zone Geofence Perimeter</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Zone Intelligence Drawer */}
            <div className="tasks-geofence-drawer">
              {/* Drawer Tabs */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px' }}>
                {(() => {
                  const activeZone = zones.find((z) => z.id === selectedZoneId);
                  const locsInActive = selectedZoneId === 'all' ? savedLocations : activeZone ? getLocationsInZone(activeZone) : savedLocations;
                  const tasksInActive = selectedZoneId === 'all' ? tasks : activeZone ? getTasksInZone(activeZone) : tasks;

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setZoneSidebarTab('locations')}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          background: zoneSidebarTab === 'locations' ? '#1A3C6E' : 'transparent',
                          color: zoneSidebarTab === 'locations' ? '#FFFFFF' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <MapPin size={14} />
                        <span>Saved Locations ({locsInActive.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoneSidebarTab('tasks')}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          background: zoneSidebarTab === 'tasks' ? '#1A3C6E' : 'transparent',
                          color: zoneSidebarTab === 'tasks' ? '#FFFFFF' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Territory Tasks ({tasksInActive.length})</span>
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Tab 1: Saved Locations List & Direct Task Assignment */}
              {zoneSidebarTab === 'locations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
                  {/* Search and Category Filter */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
                      <input
                        type="text"
                        placeholder="Search locations or doctors in zone..."
                        value={zoneSearchQuery}
                        onChange={(e) => setZoneSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px 8px 30px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <select
                      value={zoneCategoryFilter}
                      onChange={(e) => setZoneCategoryFilter(e.target.value as any)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '11.5px',
                        background: '#FFFFFF',
                        fontWeight: '600',
                      }}
                    >
                      <option value="ALL">All Types</option>
                      <option value="CLINIC">Clinics</option>
                      <option value="HOSPITAL">Hospitals</option>
                      <option value="PHARMACY">Pharmacies</option>
                      <option value="OFFICE">Offices</option>
                    </select>
                  </div>

                  {/* Scrollable list of locations */}
                  {(() => {
                    const activeZone = zones.find((z) => z.id === selectedZoneId);
                    let locs = selectedZoneId === 'all' ? savedLocations : activeZone ? getLocationsInZone(activeZone) : savedLocations;

                    if (zoneSearchQuery.trim()) {
                      const q = zoneSearchQuery.toLowerCase();
                      locs = locs.filter(
                        (l) =>
                          (l.name && l.name.toLowerCase().includes(q)) ||
                          (l.clinic && l.clinic.toLowerCase().includes(q)) ||
                          (l.doctor_name && l.doctor_name.toLowerCase().includes(q)) ||
                          (l.address && l.address.toLowerCase().includes(q))
                      );
                    }

                    if (zoneCategoryFilter !== 'ALL') {
                      locs = locs.filter((l) => l.category === zoneCategoryFilter);
                    }

                    if (locs.length === 0) {
                      return (
                        <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px' }}>
                          No saved locations match the filter criteria in this zone.
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          maxHeight: '440px',
                          overflowY: 'auto',
                          paddingRight: '4px',
                        }}
                      >
                        {locs.map((loc) => {
                          const categoryColor =
                            loc.category === 'HOSPITAL' ? '#DC2626' : loc.category === 'PHARMACY' ? '#D97706' : '#0F8B5A';
                          const categoryBg =
                            loc.category === 'HOSPITAL' ? '#FEE2E2' : loc.category === 'PHARMACY' ? '#FEF3C7' : '#DCFCE7';

                          return (
                            <div
                              key={loc.id}
                              style={{
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                background: '#F8FAFC',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', wordBreak: 'break-word' }}>
                                    {loc.clinic || loc.name}
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: '#0F8B5A', fontWeight: '700', marginTop: '2px' }}>
                                    {loc.doctor_name
                                      ? (loc.doctor_name.startsWith('Dr.') || loc.doctor_name.startsWith('Dr ')
                                          ? loc.doctor_name
                                          : `Dr. ${loc.doctor_name}`)
                                      : loc.specialization || 'Healthcare Centre'}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: '800',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: categoryBg,
                                    color: categoryColor,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {loc.category || 'CLINIC'}
                                </span>
                              </div>

                              <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.3' }}>
                                {loc.address}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed #CBD5E1' }}>
                                <div style={{ fontSize: '10.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={11} color="#0F8B5A" />
                                  <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (zoneMapInstanceRef.current) {
                                        zoneMapInstanceRef.current.flyTo([loc.latitude, loc.longitude], 17);
                                      }
                                    }}
                                    style={{
                                      padding: '4px 12px',
                                      background: '#FFFFFF',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      color: '#334155',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    View on Map
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab 2: Territory Tasks List */}
              {zoneSidebarTab === 'tasks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                  {(() => {
                    const activeZone = zones.find((z) => z.id === selectedZoneId);
                    const displayedTasks = selectedZoneId === 'all' ? tasks : activeZone ? getTasksInZone(activeZone) : tasks;

                    if (displayedTasks.length === 0) {
                      return (
                        <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px' }}>
                          No tasks scheduled in this territory zone yet.
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          maxHeight: '480px',
                          overflowY: 'auto',
                          paddingRight: '4px',
                        }}
                      >
                        {displayedTasks.map((t) => {
                          const isDone = t.status === 'COMPLETED';
                          const isSusp = t.status === 'SUSPENDED';
                          const statusBg = isDone ? '#DCFCE7' : isSusp ? '#FEE2E2' : '#DBEAFE';
                          const statusColor = isDone ? '#166534' : isSusp ? '#991B1B' : '#1E40AF';

                          return (
                            <div
                              key={t.id}
                              style={{
                                border: isSusp ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                background: isSusp ? '#FFF5F5' : '#F8FAFC',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A' }}>
                                  {t.title}
                                </div>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: '800',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: statusBg,
                                    color: statusColor,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {t.status}
                                </span>
                              </div>

                              <div style={{ fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <User size={12} color="#64748B" />
                                <span>Assigned to: <strong>{t.assigned_mr_name}</strong></span>
                              </div>

                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                Date: {formatDateDDMMYYYY(t.date)} • {t.time} • Priority: {t.priority}
                              </div>

                              {t.location_name && (
                                <div style={{ fontSize: '11px', color: '#0F8B5A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={11} /> {t.location_name}
                                </div>
                              )}

                              {isDone && (
                                <div style={{ fontSize: '11px', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '6px 8px', borderRadius: '4px', marginTop: '2px' }}>
                                  {t.duration_seconds && (
                                    <div style={{ color: '#166534', fontWeight: '700', marginBottom: '2px' }}>
                                      ⏱ Visit Duration: {formatDuration(t.duration_seconds)}
                                    </div>
                                  )}
                                  {t.outcome && (
                                    <div style={{ color: '#15803D', fontStyle: 'italic' }}>
                                      💬 "{t.outcome.slice(0, 70)}{t.outcome.length > 70 ? '...' : ''}"
                                    </div>
                                  )}
                                  {t.orders && t.orders.length > 0 && (
                                    <div style={{ color: '#047857', fontWeight: '700', marginTop: '2px' }}>
                                      📦 {t.orders.length} orders recorded ({t.orders.reduce((sum, o) => sum + (o.quantity || 0), 0)} units)
                                    </div>
                                  )}
                                </div>
                              )}

                              {isSusp && (
                                <button
                                  type="button"
                                  onClick={() => handleUnsuspendTask(t.id, t.title, t.assigned_mr_name)}
                                  disabled={unsuspendingId === t.id}
                                  style={{
                                    marginTop: '4px',
                                    padding: '6px 10px',
                                    background: '#DC2626',
                                    color: '#FFFFFF',
                                    borderRadius: '4px',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px',
                                  }}
                                >
                                  <ShieldCheck size={12} /> {unsuspendingId === t.id ? 'Unsuspending...' : 'Unsuspend Task'}
                                </button>
                              )}

                              {/* Territory Drawer Task Actions: Edit & Delete */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #CBD5E1' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTask(t)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    color: '#1E293B',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                                  title="Edit or reassign task"
                                >
                                  <Pencil size={11} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(t.id, t.title)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #FCA5A5',
                                    background: '#FFFFFF',
                                    color: '#DC2626',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                                  title="Delete task"
                                >
                                  <Trash2 size={11} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', flex: '1 1 auto', minWidth: '200px' }}>
          <Filter size={15} />
          <span>Filter by MR:</span>
          <select
            value={filterMr}
            onChange={(e) => setFilterMr(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF', flex: '1 1 auto', minWidth: 0 }}
          >
            <option value="ALL">All Representatives</option>
            <option value="Rahul Sharma">Rahul Sharma</option>
            <option value="Vikram Malhotra">Vikram Malhotra</option>
            <option value="Pooja Verma">Pooja Verma</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', flex: '1 1 auto', minWidth: '200px' }}>
          <span>Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF', flex: '1 1 auto', minWidth: 0 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {tasks.length > 0 && (
          <button
            type="button"
            onClick={handleClearAllTasks}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              background: '#FEF2F2',
              color: '#DC2626',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
            title="Permanently delete all task data to start fresh"
          >
            <Trash2 size={13} />
            Delete All Task Data ({tasks.length})
          </button>
        )}
      </div>

      {/* Task Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '16px' }}>
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: task.status === 'SUSPENDED' ? '#DC2626' : task.priority === 'HIGH' ? '#DC2626' : '#2563EB',
                  }}
                >
                  {formatDateDDMMYYYY(task.date)} • {task.time} • {task.priority} PRIORITY
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                  {task.title}
                </h3>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background:
                    task.status === 'COMPLETED'
                      ? '#DCFCE7'
                      : task.status === 'IN_PROGRESS'
                      ? '#DBEAFE'
                      : task.status === 'SUSPENDED'
                      ? '#FEE2E2'
                      : '#FEF3C7',
                  color:
                    task.status === 'COMPLETED'
                      ? '#166534'
                      : task.status === 'IN_PROGRESS'
                      ? '#1E40AF'
                      : task.status === 'SUSPENDED'
                      ? '#991B1B'
                      : '#92400E',
                  border: task.status === 'SUSPENDED' ? '1px solid #FCA5A5' : 'none',
                }}
              >
                {task.status}
              </span>
            </div>

            {/* Assigned MR & Location */}
            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="#64748B" />
                <span>Assigned to: <strong>{task.assigned_mr_name}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={13} color="#0F8B5A" />
                <span>{task.location_name || `${task.latitude.toFixed(4)}, ${task.longitude.toFixed(4)}`} ({task.geofence_radius_m}m geofence)</span>
              </div>
            </div>

            {/* SECRET ON-SITE DURATION */}
            {task.status === 'COMPLETED' && task.duration_seconds !== undefined && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontWeight: '700', fontSize: '12px' }}>
                  <Timer size={14} color="#0F8B5A" />
                  <span>On-Site Meeting Duration: <span style={{ color: '#0F8B5A' }}>{formatDuration(task.duration_seconds)}</span></span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                  Started: {task.started_at ? new Date(task.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} • Completed: {task.completed_at ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontStyle: 'italic' }}>
                  * This duration is tracked silently and hidden from MR mobile screens.
                </div>
              </div>
            )}

            {/* VISIT OUTCOME */}
            {task.outcome && (
              <div style={{ fontSize: '12px', color: '#334155', background: '#FEF9C3', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#854D0E', marginBottom: '2px' }}>
                  <MessageSquare size={12} /> Visit Outcome / Feedback:
                </div>
                <div>{task.outcome}</div>
              </div>
            )}

            {/* ORDERS BOOKED */}
            {task.orders && task.orders.length > 0 && (
              <div style={{ fontSize: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#166534', marginBottom: '4px' }}>
                  <ShoppingBag size={13} /> Immediate Orders Captured ({task.orders.length}):
                </div>
                {task.orders.map((ord, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B', fontSize: '11px', marginTop: '2px' }}>
                    <span>{ord.product_name} x {ord.quantity}</span>
                    <strong>₹{ord.total_amount || (ord.unit_price ? ord.unit_price * ord.quantity : 0)}</strong>
                  </div>
                ))}
              </div>
            )}

            {task.status === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCompletedTask(task);
                  setSelectedOrderItem(null);
                }}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '9px 12px',
                  background: '#F0FDF4',
                  color: '#166534',
                  border: '1px solid #86EFAC',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#DCFCE7')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#F0FDF4')}
              >
                <FileText size={13} />
                <span>View Full Visit & Order Details ({task.orders?.length || 0} orders)</span>
              </button>
            )}

            {/* Task Card Actions: Edit & Delete */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => handleOpenEditTask(task)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#1E293B',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#EFF6FF';
                  e.currentTarget.style.borderColor = '#93C5FD';
                  e.currentTarget.style.color = '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#1E293B';
                }}
                title="Edit details or reassign this task"
              >
                <Pencil size={12} />
                <span>Edit / Reassign</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTask(task.id, task.title)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  border: '1px solid #FCA5A5',
                  background: '#FFFFFF',
                  color: '#DC2626',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                title="Permanently delete this task"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Geofence Verification Audit Logs */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          marginTop: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="#0F8B5A" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
            Live Geofence Verification Audit Log
          </h3>
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
              <th style={{ padding: '8px 12px' }}>Task Title</th>
              <th style={{ padding: '8px 12px' }}>Representative</th>
              <th style={{ padding: '8px 12px' }}>Event</th>
              <th style={{ padding: '8px 12px' }}>GPS Distance</th>
              <th style={{ padding: '8px 12px' }}>Accuracy</th>
              <th style={{ padding: '8px 12px' }}>Verification Result</th>
              <th style={{ padding: '8px 12px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {verificationLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>{log.task_title}</td>
                <td style={{ padding: '10px 12px' }}>{log.mr_name}</td>
                <td style={{ padding: '10px 12px' }}>{log.type}</td>
                <td style={{ padding: '10px 12px' }}>{log.distance_m}m</td>
                <td style={{ padding: '10px 12px' }}>±{log.gps_accuracy_m}m</td>
                <td style={{ padding: '10px 12px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      background: log.verified ? '#DCFCE7' : '#FEE2E2',
                      color: log.verified ? '#166534' : '#991B1B',
                    }}
                  >
                    {log.verified ? 'Verified On-Site' : 'Rejected (Out of Geofence)'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#64748B' }}>{formatDateTimeDDMMYYYY(log.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* RE-ARCHITECTED SPLIT ENTERPRISE MODAL: EMBEDDED LIVE MAP + STRUCTURED FORM */}
      {isCreateModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(0px, 2vw, 16px)' }}>
          <div
            className="modal-box"
            style={{
              width: '94vw',
              maxWidth: '1160px',
              height: '88vh',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              borderRadius: 'clamp(0px, 2vw, 12px)',
              background: '#FFFFFF',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
                color: '#FFFFFF',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                  }}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                      {t.assignTaskModalTitle}
                    </h3>
                    <span
                      style={{
                        background: '#059669',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                      }}
                    >
                      DIRECT DISPATCH ACTIVE
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                    {t.assignTaskModalDesc}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  transition: 'background 0.2s ease',
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Content: Left Map, Right Form */}
            <div className="tasks-modal-split">
              {/* LEFT SIDE: EMBEDDED INTERACTIVE LEAFLET SATELLITE MAP */}
              <div className="tasks-modal-map-col">
                {/* 1. Dedicated Search Bar OUTSIDE The Map Surface */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #CBD5E1',
                    flexShrink: 0,
                  }}
                >
                  <form
                    onSubmit={handleSearchOnMap}
                    style={{
                      display: 'flex',
                      background: '#FFFFFF',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', color: '#64748B' }}>
                      <Search size={15} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search clinic, hospital, chemist, shop, or landmark..."
                      value={searchMapQuery}
                      onChange={(e) => setSearchMapQuery(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 0', fontSize: '12.5px', background: 'transparent' }}
                    />
                    <button
                      type="submit"
                      disabled={isSearchingMap}
                      style={{
                        padding: '0 14px',
                        background: '#1A3C6E',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      {isSearchingMap ? '...' : 'Search'}
                    </button>
                  </form>
                </div>

                {/* 2. Interactive Map View with Pure Unobstructed Surface */}
                <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '340px' }}>
                  {/* Top Right Controls Overlay: Street/Satellite & Pan Toggle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      zIndex: 400,
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    {/* Touch Pan Lock/Unlock Toggle */}
                    <button
                      type="button"
                      onClick={toggleModalMapInteraction}
                      style={{
                        background: isModalMapInteracting ? '#0F8B5A' : '#FFFFFF',
                        color: isModalMapInteracting ? '#FFFFFF' : '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                      title="Toggle whether map dragging captures your touch or lets you scroll the modal"
                    >
                      <span>{isModalMapInteracting ? '🔓 Pan On' : '🔒 Pan Map'}</span>
                    </button>

                    {/* Locate Me / Center Map Control */}
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={isLocatingMe}
                      style={{
                        background: '#FFFFFF',
                        color: '#0052cc',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: isLocatingMe ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                      title="Center map on current GPS location and update marker"
                    >
                      <Crosshair size={12} />
                      <span>{isLocatingMe ? 'Locating...' : 'Locate Me'}</span>
                    </button>

                    {/* Satellite / Street View Toggle */}
                    <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', padding: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setMapMode('street')}
                        style={{
                          padding: '3px 8px',
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
                        type="button"
                        onClick={() => setMapMode('satellite')}
                        style={{
                          padding: '3px 8px',
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
                  </div>

                  {/* Leaflet Map DOM Node */}
                  <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                {/* Collapsible Pin Details Card */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 14,
                    right: 14,
                    zIndex: 400,
                    pointerEvents: 'auto',
                  }}
                >
                  {!isModalPinCardExpanded ? (
                    <button
                      type="button"
                      onClick={() => setIsModalPinCardExpanded(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        background: 'rgba(15, 23, 42, 0.93)',
                        backdropFilter: 'blur(8px)',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.25)',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                        cursor: 'pointer',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                      title="Tap to see coordinates and details"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <MapPin size={14} color="#38BDF8" />
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#38BDF8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {taskLocationName || 'Custom Location'}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#CBD5E1', whiteSpace: 'nowrap' }}>
                          • {taskRadius}m
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#6EE7B7', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        📍 Pin Details ▴
                      </span>
                    </button>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(8px)',
                        color: '#FFFFFF',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        {matchedSavedLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ background: '#059669', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '800' }}>
                              VERIFIED SAVED POINT
                            </span>
                            <span style={{ color: '#6EE7B7', fontSize: '11px', fontWeight: '600' }}>
                              Protected: Will NOT duplicate
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ background: '#D97706', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '800' }}>
                              CUSTOM PIN POINT
                            </span>
                            <span style={{ color: '#FDE68A', fontSize: '11px', fontWeight: '500' }}>
                              {taskLat.toFixed(4)}, {taskLng.toFixed(4)}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsModalPinCardExpanded(false)}
                          style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: '#CBD5E1',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Minimize
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: '800', color: '#38BDF8', fontSize: '13px' }}>
                            {taskLocationName}
                          </div>
                          <div style={{ color: '#CBD5E1', fontSize: '10.5px', marginTop: '2px' }}>
                            {taskAddress}
                          </div>
                          <div style={{ color: '#94A3B8', fontSize: '10.5px', marginTop: '2px' }}>
                            Lat: <strong>{taskLat.toFixed(4)}</strong> • Lng: <strong>{taskLng.toFixed(4)}</strong>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#0F8B5A', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                            Perimeter: {taskRadius}m
                          </span>
                          <div style={{ color: '#94A3B8', fontSize: '10px', marginTop: '4px' }}>
                            * Drag pin to re-mark
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* RIGHT SIDE: RICH STRUCTURED TASK FORM */}
              <div className="tasks-modal-form-col">
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* 1. Operational Territory Zone Selector */}
                  <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #CBD5E1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Navigation size={14} color="#1A3C6E" />
                        Operational Territory Zone *
                      </label>
                      <span style={{ fontSize: '11px', color: '#0369A1', fontWeight: '700' }}>
                        {zones.find((z) => z.id === modalSelectedZoneId)?.code || ''}
                      </span>
                    </div>
                    <select
                      value={modalSelectedZoneId}
                      onChange={(e) => handleSelectModalZone(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1.5px solid #0284C7', fontSize: '12.5px', background: '#FFFFFF', fontWeight: '700', color: '#0F172A' }}
                    >
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} • {zone.branchType.replace(/_/g, ' ')} (MR: {zone.assignedMr})
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                      Selecting a zone centers the interactive map, displays the zone perimeter, and auto-filters saved locations.
                    </div>
                  </div>

                  {/* 2. Destination Location Option: Saved Customer vs Custom Location */}
                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <MapPin size={14} color="#1A3C6E" />
                        Destination Location Option *
                      </label>
                      {/* Segmented 2-way toggle */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationMode('saved');
                            const currentZone = zones.find((z) => z.id === modalSelectedZoneId);
                            const inZone = savedLocations.filter((loc) => {
                              if (!currentZone) return true;
                              return calculateDistanceKm(currentZone.latitude, currentZone.longitude, loc.latitude, loc.longitude) <= currentZone.radiusKm;
                            });
                            if (inZone.length > 0) {
                              handleSelectSavedLocationPreset(inZone[0].id);
                            } else if (savedLocations.length > 0) {
                              handleSelectSavedLocationPreset(savedLocations[0].id);
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: locationMode === 'saved' ? '#1A3C6E' : 'transparent',
                            color: locationMode === 'saved' ? '#FFFFFF' : '#475569',
                            boxShadow: locationMode === 'saved' ? '0 2px 5px rgba(26,60,110,0.2)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Building size={13} />
                          <span>Saved Customer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationMode('custom');
                            setMatchedSavedLocation(null);
                            setSelectedPresetId('custom');
                            if (matchedSavedLocation) {
                              setTaskLocationName('');
                              setTaskAddress('');
                              setTaskTitle('');
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: locationMode === 'custom' ? '#0F8B5A' : 'transparent',
                            color: locationMode === 'custom' ? '#FFFFFF' : '#475569',
                            boxShadow: locationMode === 'custom' ? '0 2px 5px rgba(15,139,90,0.2)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Compass size={13} />
                          <span>Custom Location</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode A: Saved Customer */}
                    {locationMode === 'saved' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                            Pick Doctor, Clinic, Hospital or Chemist:
                          </span>
                          {matchedSavedLocation && (
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#059669', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                              ✓ Linked Customer
                            </span>
                          )}
                        </div>
                        <select
                          value={selectedPresetId}
                          onChange={(e) => handleSelectPreset(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: '#FFFFFF', fontWeight: '600' }}
                        >
                          <optgroup label="Saved Locations in this Zone">
                            {savedLocations
                              .filter((loc) => {
                                const currentZone = zones.find((z) => z.id === modalSelectedZoneId);
                                if (!currentZone) return true;
                                const dist = calculateDistanceKm(currentZone.latitude, currentZone.longitude, loc.latitude, loc.longitude);
                                return dist <= currentZone.radiusKm;
                              })
                              .map((loc) => (
                                <option key={loc.id} value={`saved-${loc.id}`}>
                                  {loc.clinic || loc.name} ({loc.category || 'CLINIC'}) — {loc.name}
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="All Other Saved Locations">
                            {savedLocations
                              .filter((loc) => {
                                const currentZone = zones.find((z) => z.id === modalSelectedZoneId);
                                if (!currentZone) return false;
                                const dist = calculateDistanceKm(currentZone.latitude, currentZone.longitude, loc.latitude, loc.longitude);
                                return dist > currentZone.radiusKm;
                              })
                              .map((loc) => (
                                <option key={loc.id} value={`saved-${loc.id}`}>
                                  {loc.clinic || loc.name} ({loc.area_name || loc.category}) — {loc.name}
                                </option>
                              ))}
                          </optgroup>
                        </select>
                        {matchedSavedLocation && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#059669' }}>
                            <CheckCircle2 size={13} color="#059669" />
                            <span>Linked to existing <strong>{matchedSavedLocation.clinic || matchedSavedLocation.name}</strong>. Will NOT duplicate or re-mark.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode B: Custom Location */}
                    {locationMode === 'custom' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px dashed #0F8B5A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0F8B5A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CheckCircle2 size={13} color="#0F8B5A" /> Custom Location Active
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748B' }}>
                            Click or drag pin on map to set position
                          </span>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                            Custom Location / Destination Name *
                          </label>
                          <input
                            type="text"
                            value={taskLocationName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTaskLocationName(val);
                              if (!taskTitle || taskTitle.startsWith('Detailing Call at') || taskTitle === '') {
                                setTaskTitle(val ? `Detailing Call at ${val}` : '');
                              }
                            }}
                            placeholder="e.g. City Diagnostic Center, Sub-Office, Sector-18 Meeting Spot"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                            Address / Landmark Details *
                          </label>
                          <input
                            type="text"
                            value={taskAddress}
                            onChange={(e) => setTaskAddress(e.target.value)}
                            placeholder="e.g. Near Metro Gate 2, Commercial Complex Road"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: '#475569', background: '#FFFFFF', padding: '5px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                          <span>📍 Coordinates: <strong>{taskLat.toFixed(4)}, {taskLng.toFixed(4)}</strong></span>
                          <span>•</span>
                          <span style={{ color: '#0F8B5A', fontWeight: '600' }}>Will NOT overwrite with any saved customer</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Title & Call Category */}
                  <div className="form-grid-2col">
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Task Call Title *
                      </label>
                      <input
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                        placeholder="e.g. Dr. Rajesh Sharma Detailing - CardioFix Launch"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        {t.callType}
                      </label>
                      <select
                        value={callCategory}
                        onChange={(e) => setCallCategory(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                      >
                        <option value="DETAILING">Doctor Detailing</option>
                        <option value="LAUNCH">New Product Launch</option>
                        <option value="POB">Chemist Order (POB)</option>
                        <option value="HOSPITAL">Hospital Presentation</option>
                        <option value="SAMPLE">Sample Follow-up</option>
                      </select>
                    </div>
                  </div>

                  {/* Assign to MR by Name & Priority */}
                  <div className="form-grid-2col">
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Assign to Representative (MR) *
                      </label>
                      <select
                        value={assignedMrId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setAssignedMrId(id);
                          const match = mrList.find((m) => m.id === id);
                          if (match) setAssignedMr(match.name);
                        }}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF', boxSizing: 'border-box', fontWeight: '600' }}
                      >
                        {mrList.map((mr) => (
                          <option key={mr.id} value={mr.id}>
                            {mr.name} ({mr.territory})
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                        * Confidential: Task will only appear on {assignedMr}&apos;s mobile device.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Priority
                      </label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF', boxSizing: 'border-box' }}
                      >
                        <option value="HIGH">High Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="LOW">Low Priority</option>
                      </select>
                    </div>
                  </div>

                  {/* Scheduled Date, Time & Time Zone */}
                  <div className="form-grid-2col equal">
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Scheduled Date
                      </label>
                      <input
                        type="date"
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                          {t.timeSlot} &amp; Time Zone
                        </label>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A3C6E', background: '#EFF6FF', padding: '1px 6px', borderRadius: '4px' }}>
                          IST (UTC+5:30)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="time"
                          value={taskTime}
                          onChange={(e) => setTaskTime(e.target.value)}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                        <select
                          value={selectedTimeZone}
                          onChange={(e) => setSelectedTimeZone(e.target.value)}
                          style={{ width: '125px', padding: '8px 6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px', background: '#FFFFFF', fontWeight: '600', color: '#1E293B' }}
                          title="Operational Scheduling Time Zone"
                        >
                          <option value="Asia/Kolkata">IST (UTC+5:30)</option>
                          <option value="Asia/Dubai">GST (UTC+4:00)</option>
                          <option value="Asia/Singapore">SGT (UTC+8:00)</option>
                          <option value="Europe/London">GMT (UTC+0:00)</option>
                          <option value="America/New_York">EST (UTC-5:00)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Product Detailing Focus Multi-Select Chips */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                        {t.productFocus} (Click to toggle)
                      </label>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0F8B5A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                        ● Store In-Stock Only ({inStockProducts.length})
                      </span>
                    </div>

                    {inStockProducts.length === 0 ? (
                      <div style={{ padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '11.5px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} color="#D97706" />
                        <span>No medicines currently in stock in store. Please inward stock in HQ Stocker &amp; Medicine Inventory.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {inStockProducts.map((prod) => {
                          const isSelected = selectedProducts.includes(prod.name);
                          return (
                            <button
                              key={prod.id || prod.name}
                              type="button"
                              onClick={() => toggleProduct(prod.name)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '16px',
                                border: isSelected ? '1.5px solid #1A3C6E' : '1px solid #CBD5E1',
                                background: isSelected ? '#EFF6FF' : '#FFFFFF',
                                color: isSelected ? '#1A3C6E' : '#475569',
                                fontSize: '11px',
                                fontWeight: isSelected ? '700' : '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {isSelected ? <CheckCircle2 size={12} color="#1A3C6E" /> : <Plus size={12} color="#64748B" />}
                              <span>{prod.name}</span>
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  padding: '1px 5px',
                                  borderRadius: '8px',
                                  background: prod.quantity <= 15 ? '#FEF3C7' : '#DCFCE7',
                                  color: prod.quantity <= 15 ? '#B45309' : '#15803D',
                                  fontWeight: '700',
                                }}
                              >
                                {prod.quantity} in stock
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Geofence Perimeter Radius Controller */}
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                        Allowed On-Site Geofence Radius
                      </span>
                      <strong style={{ color: '#0F8B5A', fontSize: '12.5px' }}>
                        {taskRadius} meters (≤{taskRadius}m)
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="5"
                      value={taskRadius}
                      onChange={(e) => setTaskRadius(parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                      MR mobile device must be within this circle to start detailing and record orders.
                    </span>
                  </div>

                  {/* Manager Briefing / Objectives */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      {t.detailingAgenda}
                    </label>
                    <textarea
                      rows={2}
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Submit & Cancel Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      style={{ flex: 1, padding: '11px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingOnServer}
                      style={{
                        flex: 2,
                        padding: '11px',
                        background: isCreatingOnServer ? '#64748B' : '#1A3C6E',
                        border: 'none',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: isCreatingOnServer ? 'not-allowed' : 'pointer',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{isCreatingOnServer ? 'Assigning on Server...' : t.assignButton}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Visit & Order Details Modal */}
      {selectedCompletedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setSelectedCompletedTask(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '840px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={22} color="#166534" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                      {selectedCompletedTask.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#DCFCE7',
                        color: '#166534',
                      }}
                    >
                      COMPLETED
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                    {selectedCompletedTask.location_name} • Dr. Detailing & Commercial Report
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompletedTask(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top Stats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* Rep */}
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={13} /> Field Representative
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>
                    {selectedCompletedTask.assigned_mr_name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>{selectedCompletedTask.assigned_mr_id || 'MR'}</div>
                </div>

                {/* Timing & Punctuality */}
                {(() => {
                  const delay = getDelayAnalysis(selectedCompletedTask);
                  return (
                    <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} /> Timing & Punctuality
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>
                        Sched: {selectedCompletedTask.time}
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: delay.isDelayed ? '#FEE2E2' : '#DCFCE7',
                          color: delay.isDelayed ? '#B91C1C' : '#15803D',
                        }}
                      >
                        {delay.text}
                      </div>
                    </div>
                  );
                })()}

                {/* Duration */}
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Timer size={13} /> Meeting Duration
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>
                    {selectedCompletedTask.duration_seconds
                      ? `${Math.floor(selectedCompletedTask.duration_seconds / 60)}m ${selectedCompletedTask.duration_seconds % 60}s`
                      : 'Not logged'}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                    Ended:{' '}
                    {selectedCompletedTask.completed_at
                      ? new Date(selectedCompletedTask.completed_at).toLocaleTimeString()
                      : 'Completed'}
                  </div>
                </div>

                {/* Geofence & GPS Audit */}
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldCheck size={13} color="#0F8B5A" /> Geofence Verification
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F8B5A', marginTop: '4px' }}>
                    {selectedCompletedTask.distance_verified ? 'Verified On-Site' : 'Verified'}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                    Radius: {selectedCompletedTask.geofence_radius_m}m
                  </div>
                </div>
              </div>

              {/* Doctor Remarks / Outcome Section */}
              <div
                style={{
                  background: '#FEF9C3',
                  border: '1px solid #FEF08A',
                  borderRadius: '10px',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: '#854D0E',
                    marginBottom: '6px',
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Doctor Remarks & Detailing Feedback</span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#1E293B',
                    lineHeight: '1.5',
                    background: '#FFFFFF',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #FDE047',
                  }}
                >
                  {selectedCompletedTask.outcome || 'No specific doctor remarks recorded for this visit.'}
                </div>
              </div>

              {/* On-Site Clinic & Doctor Detailing Proof Photo Section */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>
                    <Camera size={16} color="#2563EB" />
                    <span>📸 On-Site Clinic &amp; Detailing Proof Photo</span>
                  </div>
                  {selectedCompletedTask.visit_photo || (selectedCompletedTask.verification_photo_key && (selectedCompletedTask.verification_photo_key.startsWith('data:') || selectedCompletedTask.verification_photo_key.startsWith('http'))) ? (
                    <span
                      style={{
                        background: '#DCFCE7',
                        color: '#166534',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      ✓ Live Camera Verified
                    </span>
                  ) : selectedCompletedTask.verification_photo_key && selectedCompletedTask.verification_photo_key.startsWith('file:') ? (
                    <span
                      style={{
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      ⚠️ Local Cache Only (Old App Build)
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>No Photo Captured</span>
                  )}
                </div>

                {selectedCompletedTask.visit_photo || (selectedCompletedTask.verification_photo_key && (selectedCompletedTask.verification_photo_key.startsWith('data:') || selectedCompletedTask.verification_photo_key.startsWith('http'))) ? (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#0F172A',
                        flexShrink: 0,
                        border: '1px solid #CBD5E1',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setViewingVisitPhoto({
                          url: (selectedCompletedTask.visit_photo || selectedCompletedTask.verification_photo_key)!,
                          title: selectedCompletedTask.title,
                          mrName: selectedCompletedTask.assigned_mr_name,
                          location: selectedCompletedTask.location_name || 'Clinic',
                        })
                      }
                      title="Click to view full photo"
                    >
                      <img
                        src={selectedCompletedTask.visit_photo || selectedCompletedTask.verification_photo_key}
                        alt="Visit Proof"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>
                        Clinic &amp; Detailing Evidence Captured
                      </div>
                      <div style={{ color: '#64748B' }}>
                        Representative: <strong style={{ color: '#0F172A' }}>{selectedCompletedTask.assigned_mr_name}</strong>
                      </div>
                      <div style={{ color: '#64748B' }}>
                        Location: <strong style={{ color: '#059669' }}>{selectedCompletedTask.location_name || 'Designated Facility'}</strong>
                      </div>
                      {selectedCompletedTask.latitude && (
                        <div style={{ color: '#64748B' }}>
                          GPS Geotag: <strong>{Number(selectedCompletedTask.latitude).toFixed(4)}° N, {Number(selectedCompletedTask.longitude).toFixed(4)}° E</strong>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setViewingVisitPhoto({
                            url: (selectedCompletedTask.visit_photo || selectedCompletedTask.verification_photo_key)!,
                            title: selectedCompletedTask.title,
                            mrName: selectedCompletedTask.assigned_mr_name,
                            location: selectedCompletedTask.location_name || 'Clinic',
                          })
                        }
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: '6px',
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          borderRadius: '4px',
                          padding: '5px 12px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Camera size={13} />
                        <span>View Full-Size Proof Photo</span>
                      </button>
                    </div>
                  </div>
                ) : selectedCompletedTask.verification_photo_key && selectedCompletedTask.verification_photo_key.startsWith('file:') ? (
                  <div style={{ background: '#FFFBEB', padding: '12px 14px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '12px', color: '#92400E' }}>
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>⚠️ Photo Stored Only on Local Phone Storage (Old App Build)</div>
                    <div>
                      This call was recorded using an older mobile app session where the photo remained only in the phone's temporary local cache (<code style={{ fontSize: '11px', background: '#FEF3C7', padding: '1px 4px', borderRadius: '3px' }}>{selectedCompletedTask.verification_photo_key.slice(0, 55)}...</code>).
                      With the updated mobile app build, all photos are converted to verified compressed base64 data and transmitted directly to the server database.
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                    No on-site photo was attached for this visit. Meeting activity was validated via hardware GPS sensor logs.
                  </div>
                )}
              </div>

              {/* Orders Booked Table */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingBag size={16} color="#166534" />
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0F172A' }}>
                      Orders Captured / POB (Product On Booking)
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        background: '#DCFCE7',
                        color: '#166534',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {selectedCompletedTask.orders?.length || 0} items
                    </span>
                  </div>

                  {selectedCompletedTask.orders && selectedCompletedTask.orders.length > 0 && (
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                      Total Value: ₹
                      {selectedCompletedTask.orders
                        .reduce((sum, o) => sum + (o.total_amount || (o.unit_price ? o.unit_price * o.quantity : 0)), 0)
                        .toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {selectedCompletedTask.orders && selectedCompletedTask.orders.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>#</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>Product Name</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>Quantity</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Unit Price (₹)</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Total (₹)</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>Stockist / Distributor</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>Inspect</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCompletedTask.orders.map((ord, idx) => {
                          const total = ord.total_amount || (ord.unit_price ? ord.unit_price * ord.quantity : 0);
                          const isSelected = selectedOrderItem === ord;
                          return (
                            <tr
                              key={idx}
                              onClick={() => setSelectedOrderItem(isSelected ? null : ord)}
                              style={{
                                borderBottom: '1px solid #E2E8F0',
                                background: isSelected ? '#EFF6FF' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0F172A' }}>
                                {ord.product_name}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}>
                                <span
                                  style={{
                                    background: '#E2E8F0',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                  }}
                                >
                                  {ord.quantity} units
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                                ₹{ord.unit_price || '-'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#166534' }}>
                                ₹{total.toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#2563EB', fontWeight: '600' }}>
                                {ord.distributor || 'Default Stockist'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderItem(isSelected ? null : ord);
                                  }}
                                  style={{
                                    background: isSelected ? '#2563EB' : '#FFFFFF',
                                    color: isSelected ? '#FFFFFF' : '#475569',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isSelected ? 'Viewing' : 'Inspect'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No commercial orders were booked during this visit (Scientific detailing & sampling only).
                  </div>
                )}

                {/* Selected Order Inspector Sub-panel */}
                {selectedOrderItem && (
                  <div
                    style={{
                      margin: '12px 16px 16px',
                      padding: '14px 16px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShoppingBag size={14} /> Item Inspector: {selectedOrderItem.product_name}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderItem(null)}
                        style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Close Inspector
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Quantity:</span> <strong>{selectedOrderItem.quantity} packs</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Unit Rate:</span> <strong>₹{selectedOrderItem.unit_price || '-'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Line Total:</span> <strong>₹{(selectedOrderItem.total_amount || ((selectedOrderItem.unit_price || 0) * selectedOrderItem.quantity)).toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Fulfillment Hub:</span> <strong>{selectedOrderItem.distributor || 'Apollo Central Distribution'}</strong>
                      </div>
                    </div>
                    {selectedOrderItem.notes && (
                      <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#334155' }}>
                        <strong>Fulfillment Note:</strong> {selectedOrderItem.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#F8FAFC',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCompletedTask(null)}
                style={{
                  padding: '9px 18px',
                  background: '#1A3C6E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Close Audit Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Visit Photo Modal */}
      {viewingVisitPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
            padding: '20px',
          }}
          onClick={() => setViewingVisitPhoto(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '640px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                  📸 On-Site Clinic Detailing Proof
                </h4>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {viewingVisitPhoto.location} • {viewingVisitPhoto.mrName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingVisitPhoto(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '16px', background: '#0F172A', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={viewingVisitPhoto.url}
                alt="Clinic Proof"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setViewingVisitPhoto(null)}
                style={{
                  padding: '8px 16px',
                  background: '#1E293B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Reassign Assigned Task Modal */}
      {editingTask && (
        <div
          className="modal-overlay"
          onClick={() => setEditingTask(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1D4ED8',
                  }}
                >
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                    Edit & Reassign Task
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Fix incorrect MR assignment, update timing, or adjust destination
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Task Title */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="e.g. Dr. Detailing & Product Presentation"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    fontWeight: '600',
                  }}
                />
              </div>

              {/* Assigned Representative (MR) Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Reassign to Representative (MR) *
                </label>
                <select
                  value={editTaskAssignedMrId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setEditTaskAssignedMrId(id);
                    const match = mrList.find((m) => m.id === id);
                    if (match) {
                      setEditTaskAssignedMrName(match.name);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #3B82F6',
                    fontSize: '13px',
                    background: '#EFF6FF',
                    color: '#1E3A8A',
                    fontWeight: '700',
                    boxSizing: 'border-box',
                  }}
                >
                  {mrList.map((mr) => (
                    <option key={mr.id} value={mr.id}>
                      {mr.name} — {mr.territory}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: '#2563EB', marginTop: '4px', display: 'block' }}>
                  ✓ Task will be immediately routed to {editTaskAssignedMrName}&apos;s mobile device.
                </span>
              </div>

              {/* Scheduled Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={editTaskDate}
                    onChange={(e) => setEditTaskDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    value={editTaskTime}
                    onChange={(e) => setEditTaskTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Destination / Location & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Destination / Point of Care
                  </label>
                  <input
                    type="text"
                    value={editTaskLocationName}
                    onChange={(e) => setEditTaskLocationName(e.target.value)}
                    placeholder="e.g. District Hospital Shahdol"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              {/* Geofence Radius & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Geofence Radius (meters)
                  </label>
                  <select
                    value={editTaskGeofenceRadius}
                    onChange={(e) => setEditTaskGeofenceRadius(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value={50}>50 meters (Strict Hospital)</option>
                    <option value={100}>100 meters (Standard Facility)</option>
                    <option value={200}>200 meters (Broad Clinic Zone)</option>
                    <option value={500}>500 meters (Rural Territory)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Task Status
                  </label>
                  <select
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value as TaskItem['status'])}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="ASSIGNED">ASSIGNED (Active)</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="MISSED">MISSED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              {/* Delete button right inside modal */}
              <button
                type="button"
                onClick={() => {
                  const targetId = editingTask.id;
                  const targetTitle = editingTask.title;
                  setEditingTask(null);
                  handleDeleteTask(targetId, targetTitle);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #FCA5A5',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} />
                <span>Delete Task</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedTask}
                  disabled={isUpdatingTask}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1A3C6E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: isUpdatingTask ? 'not-allowed' : 'pointer',
                    opacity: isUpdatingTask ? 0.7 : 1,
                  }}
                >
                  <Check size={14} />
                  <span>{isUpdatingTask ? 'Saving Changes...' : 'Save & Reassign'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toastNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background:
              toastNotification.type === 'error'
                ? '#991B1B'
                : toastNotification.type === 'info'
                ? '#1E40AF'
                : '#065F46',
            color: '#FFFFFF',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '420px',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <span>{toastNotification.message}</span>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
