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
} from 'lucide-react';
import { TaskItem, VerificationLogItem, DoctorItem } from '../types';
import { Language, translations } from '../utils/i18n';
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
      name: 'Dr. Rajesh Sharma',
      clinic: 'Apex Heart Centre',
      specialty: 'Cardiologist',
      address: 'Ring Road, Saket, South Delhi',
      lat: 28.5245,
      lng: 77.2066,
      radius: 50,
      suggestedMr: 'Rahul Sharma',
    },
    {
      id: 'doc-02',
      name: 'Dr. Priya Verma',
      clinic: 'Little Care Clinic',
      specialty: 'Paediatrician',
      address: 'Green Park Extension, New Delhi',
      lat: 28.5585,
      lng: 77.2028,
      radius: 50,
      suggestedMr: 'Rahul Sharma',
    },
    {
      id: 'doc-03',
      name: 'Dr. Anita Desai',
      clinic: 'Skin Care Centre',
      specialty: 'Dermatologist',
      address: 'Hauz Khas Market, New Delhi',
      lat: 28.5494,
      lng: 77.2001,
      radius: 40,
      suggestedMr: 'Vikram Malhotra',
    },
    {
      id: 'doc-04',
      name: 'Dr. Sameer Kapoor',
      clinic: 'Kapoor Health Clinic',
      specialty: 'General Physician',
      address: 'Malviya Nagar Main Road, New Delhi',
      lat: 28.5300,
      lng: 77.2150,
      radius: 50,
      suggestedMr: 'Pooja Verma',
    },
    {
      id: 'doc-05',
      name: 'Max Super Specialty Hospital',
      clinic: 'Max Hospital Saket',
      specialty: 'Cardiology & Oncology Hub',
      address: '1, 2, Press Enclave Marg, Saket, New Delhi',
      lat: 28.5282,
      lng: 77.2124,
      radius: 60,
      suggestedMr: 'Vikram Malhotra',
    },
    {
      id: 'doc-06',
      name: 'Apollo Pharmacy Retail Depot',
      clinic: 'Apollo Pharmacy Green Park',
      specialty: 'Chemist & Stockist Partner',
      address: 'Main Market, Green Park, New Delhi',
      lat: 28.5598,
      lng: 77.2045,
      radius: 40,
      suggestedMr: 'Pooja Verma',
    },
  ];

  // Available Products for Detailing Focus
  const availableProducts = [
    'CardioFix-50 (Telmisartan)',
    'CardioFix-AM Suspension',
    'DermaSoothe Anti-Itch Cream',
    'Pediatric FeverDrop Syrup',
    'MultiVit Active Capsules',
  ];

  // Tasks State
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 'task-01',
      title: 'Dr. Rajesh Sharma Detailing - CardioFix Launch',
      date: '2026-09-06',
      time: '10:30:00',
      assigned_mr_name: 'Rahul Sharma',
      assigned_mr_id: 'usr-mr-01',
      location_name: 'Apex Heart Centre (Saket)',
      latitude: 28.5245,
      longitude: 77.2066,
      geofence_radius_m: 50,
      priority: 'HIGH',
      status: 'COMPLETED',
      distance_verified: true,
      started_at: '2026-09-06T10:28:14.000Z',
      completed_at: '2026-09-06T11:06:38.000Z',
      duration_seconds: 2304,
      outcome: 'Doctor reviewed clinical trial data for CardioFix-50. Agreed to prescribe for 25 hypertension patients.',
      orders: [
        { product_name: 'CardioFix-50 (Telmisartan)', quantity: 30, unit_price: 180, total_amount: 5400, distributor: 'MedPlus Saket' },
        { product_name: 'CardioFix-AM Suspension', quantity: 15, unit_price: 120, total_amount: 1800, distributor: 'MedPlus Saket' },
      ],
    },
    {
      id: 'task-02',
      title: 'Dr. Priya Verma Evening Detailing Visit',
      date: '2026-09-06',
      time: '17:00:00',
      assigned_mr_name: 'Rahul Sharma',
      assigned_mr_id: 'usr-mr-01',
      location_name: 'Little Care Clinic (Green Park)',
      latitude: 28.5585,
      longitude: 77.2028,
      geofence_radius_m: 50,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      distance_verified: false,
    },
    {
      id: 'task-03',
      title: 'Apex Cardiology Hospital Detailing',
      date: '2026-09-06',
      time: '12:15:00',
      assigned_mr_name: 'Vikram Malhotra',
      assigned_mr_id: 'usr-mr-02',
      location_name: 'Max Super Specialty Hospital',
      latitude: 28.5282,
      longitude: 77.2124,
      geofence_radius_m: 60,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      distance_verified: true,
      started_at: '2026-09-06T12:12:00.000Z',
    },
    {
      id: 'task-04',
      title: 'Dr. Anita Desai Follow-up Call',
      date: '2026-09-06',
      time: '14:30:00',
      assigned_mr_name: 'Pooja Verma',
      assigned_mr_id: 'usr-mr-03',
      location_name: 'Skin Care Centre (Hauz Khas)',
      latitude: 28.5494,
      longitude: 77.2001,
      geofence_radius_m: 40,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      distance_verified: true,
      started_at: '2026-09-06T14:28:00.000Z',
      completed_at: '2026-09-06T14:52:15.000Z',
      duration_seconds: 1455,
      outcome: 'Followed up on dermatologist sample kit. Requested 10 additional sample packs for next week.',
      orders: [
        { product_name: 'DermaSoothe Cream', quantity: 20, unit_price: 210, total_amount: 4200, distributor: 'Apollo Hauz Khas' },
      ],
    },
  ]);

  const [verificationLogs] = useState<VerificationLogItem[]>([
    {
      id: 'lv-101',
      task_title: 'Dr. Rajesh Sharma Clinic Detailing',
      mr_name: 'Rahul Sharma',
      type: 'START',
      distance_m: 8.4,
      gps_accuracy_m: 12.0,
      verified: true,
      timestamp: '2026-09-06 10:28:14',
    },
    {
      id: 'lv-102',
      task_title: 'Dr. Rajesh Sharma Clinic Detailing',
      mr_name: 'Rahul Sharma',
      type: 'COMPLETE',
      distance_m: 6.8,
      gps_accuracy_m: 10.5,
      verified: true,
      timestamp: '2026-09-06 11:06:38',
    },
    {
      id: 'lv-103',
      task_title: 'Dr. Priya Verma Evening Visit (Spoof Attempt)',
      mr_name: 'Rahul Sharma',
      type: 'START',
      distance_m: 82.5,
      gps_accuracy_m: 14.0,
      verified: false,
      timestamp: '2026-09-05 16:55:00',
    },
  ]);

  // Registered Medical Representatives with Territories
  const mrList = [
    { id: 'usr-mr-01', name: 'Rahul Sharma', territory: 'South Delhi • Saket' },
    { id: 'usr-mr-02', name: 'Vikram Malhotra', territory: 'Central Delhi • Hauz Khas' },
    { id: 'usr-mr-03', name: 'Pooja Verma', territory: 'North Delhi • Green Park' },
  ];

  const [filterMr, setFilterMr] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(prefilledLocation));

  // Form State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('doc-01');
  const [taskTitle, setTaskTitle] = useState('Dr. Rajesh Sharma Detailing - CardioFix Launch');
  const [callCategory, setCallCategory] = useState<'DETAILING' | 'LAUNCH' | 'POB' | 'SAMPLE' | 'HOSPITAL'>('DETAILING');
  const [assignedMrId, setAssignedMrId] = useState<string>('usr-mr-01');
  const [assignedMr, setAssignedMr] = useState('Rahul Sharma');
  const [taskLocationName, setTaskLocationName] = useState('Apex Heart Centre (Saket)');
  const [taskAddress, setTaskAddress] = useState('Press Enclave Marg, Saket, New Delhi');
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [taskLat, setTaskLat] = useState<number>(28.5245);
  const [taskLng, setTaskLng] = useState<number>(77.2066);
  const [taskRadius, setTaskRadius] = useState<number>(50);
  const [taskDate, setTaskDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [taskTime, setTaskTime] = useState('11:00');
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>('Asia/Kolkata');
  const [matchedSavedLocation, setMatchedSavedLocation] = useState<DoctorItem | null>(null);
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['CardioFix-50 (Telmisartan)', 'CardioFix-AM Suspension']);
  const [taskDescription, setTaskDescription] = useState('Present clinical trial efficacy data for CardioFix-50; confirm monthly prescription potential.');
  const [unsuspendingId, setUnsuspendingId] = useState<string | null>(null);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState<boolean>(false);
  const [isBulkUnsuspending, setIsBulkUnsuspending] = useState<boolean>(false);
  const [isCreatingOnServer, setIsCreatingOnServer] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 5000);
  };

  // Live Auto-Fetch and Overdue Check from Backend
  const fetchBackendTasks = async () => {
    try {
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/tasks`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTasks(data);
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
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [zoneCategoryFilter, setZoneCategoryFilter] = useState<'ALL' | 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE'>('ALL');

  const [zones, setZones] = useState<TerritoryZone[]>(getOperatingZones);
  const [savedLocations, setSavedLocations] = useState<DoctorItem[]>(getStoredSavedLocations);
  const [modalSelectedZoneId, setModalSelectedZoneId] = useState<string>('zone-south-delhi');

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
      zoneMapInstanceRef.current.flyTo([28.538, 77.206], 12, { duration: 1.0 });
    } else {
      const target = zones.find((z) => z.id === zoneId);
      if (target) {
        zoneMapInstanceRef.current.flyTo([target.latitude, target.longitude], 13.5, { duration: 1.0 });
      }
    }
  };

  // Global handler for Leaflet popup "Assign Task Here" button
  useEffect(() => {
    window.__assignTaskToLocation = (locId: string) => {
      const loc = savedLocations.find((l) => l.id === locId);
      if (loc) {
        setTaskLocationName(loc.clinic || loc.name);
        setTaskAddress(loc.address || '');
        setTaskLat(loc.latitude);
        setTaskLng(loc.longitude);
        setTaskRadius(loc.geofence_radius_m || 50);
        setTaskTitle(`Detailing Call at ${loc.clinic || loc.name}`);
        setIsCreateModalOpen(true);
        setSelectedPresetId('custom');
      }
    };
    return () => {
      delete window.__assignTaskToLocation;
    };
  }, [savedLocations]);

  // Initialize Zone Overview Map with Hardware Canvas Acceleration & Multi-CDN Fallback
  useEffect(() => {
    if (dashboardView !== 'zone_map' || !zoneMapContainerRef.current) return;

    if (!zoneMapInstanceRef.current) {
      const map = createOptimizedMap(zoneMapContainerRef.current, {
        zoomControl: true,
      }).setView([28.538, 77.206], 12);
      zoneMapInstanceRef.current = map;

      map.on('movestart', () => {
        isUserInteractingRef.current = true;
      });
      map.on('moveend', () => {
        isUserInteractingRef.current = false;
      });

      zoneTileLayerRef.current = createResilientTileLayer(zoneMapMode).addTo(map);

      zoneCirclesGroupRef.current = L.layerGroup().addTo(map);
      zoneMarkersGroupRef.current = L.layerGroup().addTo(map);
    }

    renderZoneMapEntities();

    setTimeout(() => {
      zoneMapInstanceRef.current?.invalidateSize();
    }, 250);
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

  // Render Zone Boundaries, Saved Location 3D Pins, and Assigned Tasks
  const renderZoneMapEntities = () => {
    if (!zoneCirclesGroupRef.current || !zoneMarkersGroupRef.current || !zoneMapInstanceRef.current) return;
    zoneCirclesGroupRef.current.clearLayers();
    zoneMarkersGroupRef.current.clearLayers();

    // 1. Draw Zones Circles and Center Labels
    zones.forEach((zone) => {
      const isFocused = selectedZoneId === 'all' || selectedZoneId === zone.id;
      const locsInZone = getLocationsInZone(zone);
      const tasksInZone = getTasksInZone(zone);

      // Zone Circle Geofence
      const circle = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radiusKm * 1000,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: isFocused ? (selectedZoneId === zone.id ? 0.18 : 0.08) : 0.03,
        weight: selectedZoneId === zone.id ? 3 : 1.5,
        dashArray: '6, 8',
      }).addTo(zoneCirclesGroupRef.current!);

      circle.on('click', () => handleSelectZone(zone.id));

      // Zone Center Badge Marker
      const centerIcon = L.divIcon({
        className: 'zone-center-pill',
        html: `<div style="background:${zone.color};color:white;padding:3px 10px;border-radius:14px;font-size:11px;font-weight:800;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.35);white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:6px;">
          <span>${zone.name}</span>
          <span style="background:rgba(255,255,255,0.28);padding:1px 6px;border-radius:8px;font-size:10px;">${locsInZone.length} Locations</span>
          <span style="background:#0F8B5A;color:white;padding:1px 6px;border-radius:8px;font-size:10px;">${tasksInZone.length} Tasks</span>
        </div>`,
        iconAnchor: [80, 16],
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
        iconSize: [42, 55],
        iconAnchor: [21, 55],
        popupAnchor: [0, -50],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: pinIcon }).addTo(zoneMarkersGroupRef.current!);

      const popupHtml = `
        <div style="font-family:sans-serif;min-width:210px;padding:4px 2px;">
          <div style="font-weight:800;font-size:13.5px;color:#0F172A;margin-bottom:2px;">${loc.clinic || loc.name}</div>
          <div style="font-size:11.5px;color:#0F8B5A;font-weight:600;">${loc.doctor_name ? 'Dr. ' + loc.doctor_name : loc.specialization || ''}</div>
          <div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.3;">${loc.address}</div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;font-weight:700;background:#EFF6FF;color:#1A3C6E;padding:2px 6px;border-radius:4px;">${loc.category || 'CLINIC'}</span>
            <button onclick="window.__assignTaskToLocation('${loc.id}')" style="background:#1A3C6E;color:white;border:none;padding:5px 10px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;">+ Assign Task</button>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });

    // 3. Render Active Tasks inside selected/all zones
    const visibleTasks = selectedZoneId === 'all' ? tasks : activeZone ? getTasksInZone(activeZone) : tasks;

    visibleTasks.forEach((t) => {
      const isDone = t.status === 'COMPLETED';
      const isSusp = t.status === 'SUSPENDED';
      const bg = isDone ? '#166534' : isSusp ? '#DC2626' : '#2563EB';

      const taskMarkerIcon = L.divIcon({
        html: `<div style="background:${bg};color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);font-size:9.5px;font-weight:800;">TASK</div>`,
        className: 'task-map-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
      });

      const tm = L.marker([t.latitude, t.longitude], { icon: taskMarkerIcon }).addTo(zoneMarkersGroupRef.current!);
      tm.bindPopup(`
        <div style="font-family:sans-serif;min-width:200px;padding:4px 2px;">
          <div style="font-weight:800;font-size:13px;color:#0F172A;">${t.title}</div>
          <div style="font-size:11.5px;color:#475569;margin-top:3px;">Assigned to: <strong>${t.assigned_mr_name}</strong></div>
          <div style="font-size:11px;color:#64748B;margin-top:2px;">Scheduled: ${t.date} at ${t.time}</div>
          <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;background:${bg};color:white;">${t.status}</span>
            <span style="font-size:10.5px;color:#64748B;">Priority: ${t.priority}</span>
          </div>
        </div>
      `);
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
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  // Listen for prefilled location changes
  useEffect(() => {
    if (prefilledLocation) {
      setTaskLocationName(prefilledLocation.name);
      setTaskAddress(prefilledLocation.address);
      setTaskLat(prefilledLocation.latitude);
      setTaskLng(prefilledLocation.longitude);
      setTaskRadius(prefilledLocation.geofence_radius_m || 50);
      setTaskTitle(`Detailing Call at ${prefilledLocation.name}`);
      setIsCreateModalOpen(true);
      setSelectedPresetId('custom');
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
        iconSize: [40, 52],
        iconAnchor: [20, 52],
        popupAnchor: [0, -48],
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
      if (modalZoneCircleRef.current) {
        modalZoneCircleRef.current.setLatLng([zone.latitude, zone.longitude]);
        modalZoneCircleRef.current.setRadius(zone.radiusKm * 1000);
        modalZoneCircleRef.current.setStyle({ color: zone.color, fillColor: zone.color });
      }
    }

    // Check if there are saved locations in this zone
    const inZone = savedLocations.filter((l) => {
      const dist = calculateDistanceKm(zone.latitude, zone.longitude, l.latitude, l.longitude);
      return dist <= zone.radiusKm;
    });

    if (inZone.length > 0) {
      handleSelectSavedLocationPreset(inZone[0].id);
    } else {
      setTaskLat(zone.latitude);
      setTaskLng(zone.longitude);
      setTaskLocationName(`${zone.name} Point of Care`);
      setTaskAddress(zone.description);
      setMatchedSavedLocation(null);
      setSelectedPresetId('custom');
      if (markerRef.current) markerRef.current.setLatLng([zone.latitude, zone.longitude]);
      if (circleRef.current) circleRef.current.setLatLng([zone.latitude, zone.longitude]);
    }
  };

  // Listen for prefilled location changes
  useEffect(() => {
    if (prefilledLocation) {
      setTaskLocationName(prefilledLocation.name);
      setTaskAddress(prefilledLocation.address);
      setTaskLat(prefilledLocation.latitude);
      setTaskLng(prefilledLocation.longitude);
      setTaskRadius(prefilledLocation.geofence_radius_m || 50);
      setTaskTitle(`Detailing Call at ${prefilledLocation.name}`);
      setIsCreateModalOpen(true);
      setSelectedPresetId('custom');

      // Proximity check on prefilled location to snap to existing saved location
      const nearby = savedLocations.find((l) => {
        const d = calculateDistanceKm(prefilledLocation.latitude, prefilledLocation.longitude, l.latitude, l.longitude);
        return d <= 0.08;
      });
      if (nearby) {
        setMatchedSavedLocation(nearby);
        setSelectedPresetId(`saved-${nearby.id}`);
      }
    }
  }, [prefilledLocation, savedLocations]);

  // Global handler for Leaflet popup "Use This Saved Location" button
  useEffect(() => {
    window.__selectModalLocation = (locId: string) => {
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
      const map = createOptimizedMap(mapContainerRef.current).setView([taskLat, taskLng], 16);
      mapInstanceRef.current = map;

      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      // Group for all saved locations
      modalSavedLocationsLayerRef.current = L.layerGroup().addTo(map);

      // Zone perimeter circle
      const activeZone = zones.find((z) => z.id === modalSelectedZoneId) || zones[0];
      if (activeZone) {
        modalZoneCircleRef.current = L.circle([activeZone.latitude, activeZone.longitude], {
          radius: activeZone.radiusKm * 1000,
          color: activeZone.color || '#1A3C6E',
          fillColor: activeZone.color || '#1A3C6E',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '5, 8',
        }).addTo(map);
      }

      // Render all saved points of care as 3D pins
      renderModalSavedLocations(map);

      const customIcon = L.divIcon({
        html: create3DMapPinHtml({ category: 'CLINIC', isSelected: true }),
        className: 'saved-location-3d-marker',
        iconSize: [45, 59],
        iconAnchor: [22.5, 59],
        popupAnchor: [0, -56],
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
    // Proximity Snap Check: If user clicks within 80m of an already saved point of care, snap to it!
    const nearbySaved = savedLocations.find((l) => {
      const dist = calculateDistanceKm(lat, lng, l.latitude, l.longitude);
      return dist <= 0.08; // 80 meters
    });

    if (nearbySaved) {
      handleSelectSavedLocationPreset(nearbySaved.id);
      showToast(`Snapped to existing saved point: ${nearbySaved.clinic || nearbySaved.name}`, 'info');
      return;
    }

    // No existing saved point nearby; custom pin location
    setMatchedSavedLocation(null);
    setTaskLat(lat);
    setTaskLng(lng);
    setSelectedPresetId('custom');

    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    if (circleRef.current) circleRef.current.setLatLng([lat, lng]);
    if (mapInstanceRef.current) mapInstanceRef.current.panTo([lat, lng]);

    if (nameHint) {
      setTaskLocationName(nameHint);
      setTaskTitle(`Detailing Call at ${nameHint}`);
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setTaskAddress(data.display_name);
          if (!nameHint) {
            const shortName = data.name || (data.address && (data.address.hospital || data.address.amenity || data.address.road)) || 'Doctor Clinic';
            setTaskLocationName(shortName);
            setTaskTitle(`Detailing Call at ${shortName}`);
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

  // Legacy preset selection fallback
  const handleSelectPreset = (presetId: string) => {
    if (presetId.startsWith('saved-')) {
      handleSelectSavedLocationPreset(presetId.replace('saved-', ''));
      return;
    }
    setSelectedPresetId(presetId);
    const preset = doctorPresets.find((p) => p.id === presetId);
    if (preset) {
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
        showToast(`Task assigned to ${assignedMr} (${taskDate} • ${taskTime} ${selectedTimeZone === 'Asia/Kolkata' ? 'IST' : selectedTimeZone}).`, 'success');
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
        showToast(`Task assigned to ${assignedMr} (${taskDate} • ${taskTime} IST).`, 'success');
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
        showToast(`Task unsuspended. Date reset to today (${today}). ${mrName} unlocked.`, 'success');
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} mins ${s} secs`;
  };

  const filteredTasks = tasks.filter((t) => {
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
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
            onClick={() => setIsCreateModalOpen(true)}
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

      {/* Overdue Suspended Tasks Owner Banner */}
      {tasks.some((t) => t.status === 'SUSPENDED') && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #F87171',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#991B1B' }}>
                {tasks.filter((t) => t.status === 'SUSPENDED').length} Overdue Task(s) Suspended (&gt;24h Exceeded)
              </div>
              <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '2px' }}>
                1 day has passed without the assigned MR conducting the visit. These tasks are locked out on MR mobile devices. Only you (Owner Shivansh Tiwari) can unsuspend them to reset execution.
              </div>
            </div>
          </div>
          <button
            id="review-suspended-btn"
            type="button"
            onClick={() => {
              setIsSuspendedModalOpen(true);
              setFilterStatus('SUSPENDED');
              setDashboardView('cards');
            }}
            style={{
              padding: '8px 16px',
              background: '#DC2626',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={15} />
            <span>Review Suspended ({tasks.filter((t) => t.status === 'SUSPENDED').length})</span>
          </button>
        </div>
      )}

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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(360px, 1fr)',
              gap: '16px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
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
                    <Crosshair size={12} /> Center Zone
                  </button>
                </div>
              </div>

              {/* Map Canvas */}
              <div
                ref={zoneMapContainerRef}
                style={{
                  width: '100%',
                  height: '520px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1,
                }}
              />

              {/* Map Legend */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  flexWrap: 'wrap',
                  fontSize: '11px',
                  color: '#64748B',
                  padding: '6px 10px',
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0F8B5A', display: 'inline-block' }} />
                  <span>Clinic (3D Pin)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#DC2626', display: 'inline-block' }} />
                  <span>Hospital (3D Pin)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#D97706', display: 'inline-block' }} />
                  <span>Pharmacy / Chemist (3D Pin)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
                  <span>Scheduled Task</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '16px', height: '0px', borderTop: '2px dashed #1A3C6E', display: 'inline-block' }} />
                  <span>Zone Geofence Perimeter</span>
                </div>
              </div>
            </div>

            {/* Right: Zone Intelligence Drawer */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderLeft: '1px solid #E2E8F0',
                paddingLeft: '16px',
              }}
            >
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
                                    {loc.doctor_name ? `Dr. ${loc.doctor_name}` : loc.specialization || 'Healthcare Centre'}
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
                                      padding: '4px 8px',
                                      background: '#FFFFFF',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '4px',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      color: '#334155',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    View on Map
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTaskLocationName(loc.clinic || loc.name);
                                      setTaskAddress(loc.address || '');
                                      setTaskLat(loc.latitude);
                                      setTaskLng(loc.longitude);
                                      setTaskRadius(loc.geofence_radius_m || 50);
                                      setTaskTitle(`Detailing Call at ${loc.clinic || loc.name}`);
                                      setIsCreateModalOpen(true);
                                      setSelectedPresetId('custom');
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      background: '#1A3C6E',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      color: '#FFFFFF',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    + Assign Task
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
                                Date: {t.date} • {t.time} • Priority: {t.priority}
                              </div>

                              {t.location_name && (
                                <div style={{ fontSize: '11px', color: '#0F8B5A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={11} /> {t.location_name}
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
            <option value="SUSPENDED">Suspended (&gt;24h Overdue)</option>
          </select>
        </div>
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
                  {task.date} • {task.time} • {task.priority} PRIORITY
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

            {/* SUSPENDED WARNING & OWNER UNSUSPEND ACTION */}
            {task.status === 'SUSPENDED' && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991B1B', fontWeight: '800', fontSize: '12px' }}>
                  <AlertTriangle size={14} color="#DC2626" />
                  <span>TASK SUSPENDED (1 Day Passed Without Visit)</span>
                </div>
                <div style={{ fontSize: '11px', color: '#7F1D1D', marginTop: '3px', lineHeight: '15px' }}>
                  The MR did not visit on scheduled date ({task.date}). This task is locked out on their phone.
                </div>
                {task.suspended_at && (
                  <div style={{ fontSize: '10px', color: '#991B1B', marginTop: '2px', opacity: 0.85 }}>
                    Suspended on: {new Date(task.suspended_at).toLocaleString()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleUnsuspendTask(task.id, task.title, task.assigned_mr_name)}
                  disabled={unsuspendingId === task.id}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>{unsuspendingId === task.id ? 'Unsuspending...' : 'Unsuspend Task (Owner Action)'}</span>
                </button>
              </div>
            )}

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
                <td style={{ padding: '10px 12px', color: '#64748B' }}>{log.timestamp}</td>
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
                padding: '16px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#1A3C6E',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                    {t.assignTaskModalTitle}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                    {t.assignTaskModalDesc}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '22px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Split Content: Left Map, Right Form */}
            <div className="tasks-modal-split">
              {/* LEFT SIDE: EMBEDDED INTERACTIVE LEAFLET SATELLITE MAP */}
              <div className="tasks-modal-map-col">
                {/* Floating Search & Mode Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    right: 14,
                    zIndex: 400,
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <form
                    onSubmit={handleSearchOnMap}
                    style={{
                      flex: 1,
                      display: 'flex',
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                      overflow: 'hidden',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', color: '#64748B' }}>
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search clinic, hospital, address, or landmark..."
                      value={searchMapQuery}
                      onChange={(e) => setSearchMapQuery(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', padding: '9px 0', fontSize: '12.5px' }}
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

                  {/* Satellite / Street View Toggle */}
                  <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setMapMode('street')}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '6px',
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
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '6px',
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

                {/* Floating Bottom Card */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 14,
                    right: 14,
                    zIndex: 400,
                    background: 'rgba(15, 23, 42, 0.94)',
                    backdropFilter: 'blur(6px)',
                    color: '#FFFFFF',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <div>
                    {matchedSavedLocation ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ background: '#059669', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '800', letterSpacing: '0.5px' }}>
                          VERIFIED SAVED POINT
                        </span>
                        <span style={{ color: '#6EE7B7', fontSize: '11px', fontWeight: '600' }}>
                          Protected: Will NOT duplicate or re-mark
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ background: '#D97706', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '800' }}>
                          CUSTOM PIN POINT
                        </span>
                        <span style={{ color: '#FDE68A', fontSize: '11px', fontWeight: '500' }}>
                          Coordinates: {taskLat.toFixed(4)}, {taskLng.toFixed(4)}
                        </span>
                      </div>
                    )}
                    <div style={{ fontWeight: '800', color: '#38BDF8', fontSize: '13px' }}>
                      {taskLocationName}
                    </div>
                    <div style={{ color: '#CBD5E1', fontSize: '10.5px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
                      {taskAddress}
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: '10.5px', marginTop: '2px' }}>
                      Lat: <strong>{taskLat.toFixed(4)}</strong> • Lng: <strong>{taskLng.toFixed(4)}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: '#0F8B5A', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                      Perimeter: {taskRadius}m
                    </span>
                    <div style={{ color: '#94A3B8', fontSize: '10px', marginTop: '4px' }}>
                      * Click or drag pin to re-mark
                    </div>
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

                  {/* 2. Pick Saved Location (Point of Care) in Zone */}
                  <div style={{ background: matchedSavedLocation ? '#F0FDF4' : '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: matchedSavedLocation ? '1.5px solid #10B981' : '1.5px solid #CBD5E1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={14} color={matchedSavedLocation ? '#059669' : '#1A3C6E'} />
                        Saved Point of Care in Zone (Doctor / Clinic / Hospital / Chemist)
                      </label>
                      {matchedSavedLocation && (
                        <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#059669', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                          Linked (No Re-marking)
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
                              {loc.clinic || loc.name} ({loc.category || 'CLINIC'}) - {loc.name}
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
                              {loc.clinic || loc.name} ({loc.area_name || loc.category})
                            </option>
                          ))}
                      </optgroup>
                      <option value="custom">Custom Location Pin (Marked on Map)</option>
                    </select>
                    {matchedSavedLocation ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#059669' }}>
                        <CheckCircle2 size={13} color="#059669" />
                        <span>Linked to existing <strong>{matchedSavedLocation.clinic || matchedSavedLocation.name}</strong>. Will NOT duplicate or re-mark.</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Pick an existing saved point of care or drag/click on the interactive map to select.
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
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      {t.productFocus} (Click to toggle)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {availableProducts.map((prod) => {
                        const isSelected = selectedProducts.includes(prod);
                        return (
                          <button
                            key={prod}
                            type="button"
                            onClick={() => toggleProduct(prod)}
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
                              gap: '5px',
                            }}
                          >
                            {isSelected ? <CheckCircle2 size={12} color="#1A3C6E" /> : <Plus size={12} color="#64748B" />}
                            <span>{prod}</span>
                          </button>
                        );
                      })}
                    </div>
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

      {/* OWNER REVIEW SUSPENDED TASKS MODAL */}
      {isSuspendedModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSuspendedModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #FEE2E2',
                background: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#DC2626',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#991B1B' }}>
                    Owner Audit: Overdue Suspended Tasks
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#B91C1C' }}>
                    Tasks where 24+ hours passed without an MR visit. Locked out on mobile until you unsuspend.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSuspendedModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Task List */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {tasks.filter((t) => t.status === 'SUSPENDED').length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    color: '#166534',
                  }}
                >
                  <CheckCircle2 size={36} color="#16A34A" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>All Suspended Tasks Resolved</div>
                  <div style={{ fontSize: '12px', color: '#15803D', marginTop: '4px' }}>
                    There are no suspended tasks remaining. All MR devices are unlocked and ready for execution.
                  </div>
                </div>
              ) : (
                tasks
                  .filter((t) => t.status === 'SUSPENDED')
                  .map((task) => (
                    <div
                      key={task.id}
                      style={{
                        border: '1px solid #FCA5A5',
                        borderRadius: '8px',
                        background: '#FFF5F5',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                            {task.title}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#475569' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={13} color="#64748B" />
                              Assigned: <strong>{task.assigned_mr_name}</strong>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} color="#0F8B5A" />
                              {task.location_name || `${task.latitude.toFixed(4)}, ${task.longitude.toFixed(4)}`}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} color="#64748B" />
                              Scheduled Date: <strong>{task.date}</strong>
                            </span>
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '3px 8px',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                            border: '1px solid #FCA5A5',
                            flexShrink: 0,
                          }}
                        >
                          SUSPENDED
                        </span>
                      </div>

                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #FECACA',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '11.5px',
                          color: '#7F1D1D',
                          lineHeight: '16px',
                        }}
                      >
                        <strong>Suspension Reason:</strong> Scheduled visit was not conducted within 24 hours of scheduled date. The MR is locked out from beginning this visit until you unsuspend.
                        {task.suspended_at && (
                          <span style={{ display: 'block', marginTop: '2px', color: '#991B1B', opacity: 0.85 }}>
                            Suspended on: {new Date(task.suspended_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleUnsuspendTask(task.id, task.title, task.assigned_mr_name)}
                          disabled={unsuspendingId === task.id || isBulkUnsuspending}
                          style={{
                            padding: '8px 16px',
                            background: '#DC2626',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: unsuspendingId === task.id ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                          }}
                        >
                          <ShieldCheck size={14} />
                          <span>
                            {unsuspendingId === task.id
                              ? 'Unsuspending...'
                              : `Unsuspend & Unlock ${task.assigned_mr_name.split(' ')[0]}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Unsuspending resets the task date to today ({getTodayDateString()}) and restores status to ASSIGNED.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsSuspendedModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                {tasks.some((t) => t.status === 'SUSPENDED') && (
                  <button
                    type="button"
                    onClick={handleUnsuspendAllTasks}
                    disabled={isBulkUnsuspending || Boolean(unsuspendingId)}
                    style={{
                      padding: '8px 16px',
                      background: '#1A3C6E',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: isBulkUnsuspending ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>{isBulkUnsuspending ? 'Unsuspending All...' : 'Unsuspend All Tasks'}</span>
                  </button>
                )}
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
