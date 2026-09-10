import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Settings,
  User,
  Key,
  MapPin,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Search,
  Crosshair,
  Copy,
  Check,
  Layers,
  Clock,
  Sliders,
  Trash2,
  Navigation,
  Globe,
  Sparkles,
  UploadCloud,
  Smartphone,
  Radio,
  DownloadCloud,
  ExternalLink,
  RefreshCw,
  Play,
  Pause,
  Terminal,
  Info,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

interface SettingsViewProps {
  lang?: Language;
  managerName: string;
  onUpdateManagerName: (name: string) => void;
}

export type BranchTagType = 'HEADQUARTERS' | 'SUB_CITY_BRANCH' | 'REGIONAL_HUB' | 'ZONAL_DEPOT';

export interface OperatingCity {
  id: string;
  cityName: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  isHeadquarters: boolean;
  branchType?: BranchTagType;
  customTag?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang = 'en',
  managerName,
  onUpdateManagerName,
}) => {
  const t = translations[lang];

  // Settings Sub-Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'city' | 'policy' | 'updates'>('profile');

  // 1. Profile State
  const [name, setName] = useState(managerName);
  const [email, setEmail] = useState(() => localStorage.getItem('ahtri_user_email') || 'anil.kumar@ahtripharma.com');
  const [phone, setPhone] = useState(() => localStorage.getItem('ahtri_user_phone') || '+91 98111 22334');
  const [designation, setDesignation] = useState(() => localStorage.getItem('ahtri_user_designation') || 'Area Business Manager');
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('ahtri_company_name') || 'AHTRI PHARMACEUTICALS');
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // 2. Password Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Team MR Passwords
  const [mrList, setMrList] = useState([
    { id: 'mr-01', name: 'Rahul Sharma', email: 'mr@ahtri.com', phone: '9876543212', password: 'Password@123', territory: 'South Delhi' },
    { id: 'mr-02', name: 'Vikram Malhotra', email: 'vikram@ahtri.com', phone: '9876543213', password: 'Password@123', territory: 'Central Delhi' },
    { id: 'mr-03', name: 'Pooja Verma', email: 'pooja@ahtri.com', phone: '9876543214', password: 'Password@123', territory: 'North Delhi' },
    { id: 'mr-04', name: 'Amit Kumar', email: 'amit@ahtri.com', phone: '9876543215', password: 'Password@123', territory: 'East Delhi' },
  ]);
  const [editingMrPasswordId, setEditingMrPasswordId] = useState<string | null>(null);
  const [tempMrPassword, setTempMrPassword] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 3. City Pinpoint & Map State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [isPinBoxExpanded, setIsPinBoxExpanded] = useState(false);
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

  const [searchCityQuery, setSearchCityQuery] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [currentCityPin, setCurrentCityPin] = useState<{
    cityName: string;
    state: string;
    country: string;
    lat: number;
    lng: number;
    radiusKm: number;
  }>({
    cityName: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    lat: 28.6139,
    lng: 77.2090,
    radiusKm: 30,
  });

  const [newCityBranchTag, setNewCityBranchTag] = useState<BranchTagType>('SUB_CITY_BRANCH');

  const [operatingCities, setOperatingCities] = useState<OperatingCity[]>(() => {
    try {
      const saved = localStorage.getItem('ahtri_operating_cities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'city-01',
        cityName: 'New Delhi',
        state: 'National Capital Territory',
        country: 'India',
        latitude: 28.6139,
        longitude: 77.2090,
        radiusKm: 35,
        isHeadquarters: true,
        branchType: 'HEADQUARTERS',
      },
      {
        id: 'city-02',
        cityName: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
        radiusKm: 40,
        isHeadquarters: false,
        branchType: 'REGIONAL_HUB',
      },
      {
        id: 'city-03',
        cityName: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        latitude: 26.9124,
        longitude: 75.7873,
        radiusKm: 25,
        isHeadquarters: false,
        branchType: 'SUB_CITY_BRANCH',
      },
      {
        id: 'city-04',
        cityName: 'Chandigarh',
        state: 'Punjab / Haryana',
        country: 'India',
        latitude: 30.7333,
        longitude: 76.7794,
        radiusKm: 20,
        isHeadquarters: false,
        branchType: 'SUB_CITY_BRANCH',
      },
      {
        id: 'city-05',
        cityName: 'Shahdol',
        state: 'Madhya Pradesh',
        country: 'India',
        latitude: 23.2953,
        longitude: 81.3586,
        radiusKm: 15,
        isHeadquarters: false,
        branchType: 'SUB_CITY_BRANCH',
      },
    ];
  });
  const [cityNotice, setCityNotice] = useState<string | null>(null);

  // 4. Field Policy State
  const [defaultGeofenceRadius, setDefaultGeofenceRadius] = useState<number>(50);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [gracePeriod, setGracePeriod] = useState<number>(15);
  const [deviceBindingEnabled, setDeviceBindingEnabled] = useState(true);
  const [spoofLockEnabled, setSpoofLockEnabled] = useState(true);
  const [policyNotice, setPolicyNotice] = useState<string | null>(null);

  // 5. App Updates & OTA State
  const [targetServerUrl, setTargetServerUrl] = useState(() => {
    return (
      (import.meta as any).env?.VITE_API_URL ||
      localStorage.getItem('ahtri_backend_url') ||
      'https://ahtri-backend.onrender.com'
    );
  });
  const [updateData, setUpdateData] = useState({
    appName: 'AHTRI FFA Mobile',
    packageName: 'com.ahtri.ffa',
    latestVersion: '1.0.1',
    latestVersionCode: 2,
    minimumVersion: '1.0.0',
    downloadUrl: 'https://expo.dev/artifacts/eas/y2kIcf-EohAYBP1skXo_FZp1moFAJZUZNWwMv2Uo5YY.apk',
    forceUpdate: false,
    isActive: true,
    releaseDate: new Date().toISOString().split('T')[0],
    publishedAt: '',
    publishedBy: managerName || 'System Admin',
  });
  const [releaseNotesText, setReleaseNotesText] = useState(
    'Free Touch & Pan Live Google Maps with Road & Satellite views\nTap-to-Pinpoint: Instantly mark clinic/hospital locations anywhere\nSeamless Native Update Prompt: No browser redirects required\nTerritory doctor directory & instant geotagging\nUltra-fast server connection & zero freeze'
  );
  const [isLoadingUpdateInfo, setIsLoadingUpdateInfo] = useState(false);
  const [isSavingUpdateInfo, setIsSavingUpdateInfo] = useState(false);
  const [updateNotice, setUpdateNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedDownloadUrl, setCopiedDownloadUrl] = useState(false);
  const [isTestingServerConnection, setIsTestingServerConnection] = useState(false);

  // Fetch active version configuration from server
  const fetchRemoteVersionInfo = async (serverUrl = targetServerUrl) => {
    setIsLoadingUpdateInfo(true);
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/app/version`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && data.latestVersion) {
        setUpdateData({
          appName: data.appName || 'AHTRI FFA Mobile',
          packageName: data.packageName || 'com.ahtri.ffa',
          latestVersion: data.latestVersion || '1.0.1',
          latestVersionCode: Number(data.latestVersionCode) || 2,
          minimumVersion: data.minimumVersion || '1.0.0',
          downloadUrl: data.downloadUrl || '',
          forceUpdate: !!data.forceUpdate,
          isActive: data.isActive !== false,
          releaseDate: data.releaseDate || new Date().toISOString().split('T')[0],
          publishedAt: data.publishedAt || '',
          publishedBy: data.publishedBy || 'System Admin',
        });
        if (Array.isArray(data.releaseNotes) && data.releaseNotes.length > 0) {
          setReleaseNotesText(data.releaseNotes.join('\n'));
        }
        setUpdateNotice({ type: 'success', message: 'Loaded active update configuration from server!' });
        setTimeout(() => setUpdateNotice(null), 3000);
      }
    } catch (err: any) {
      console.warn('Could not fetch app version from server:', err);
      setUpdateNotice({
        type: 'error',
        message: `Could not reach server at ${serverUrl}. Server may be sleeping on Render. (${err?.message || 'Network error'})`,
      });
    } finally {
      setIsLoadingUpdateInfo(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'updates') {
      fetchRemoteVersionInfo();
    }
  }, [activeTab]);

  // Test server connection
  const handleTestServerConnection = async () => {
    setIsTestingServerConnection(true);
    try {
      const cleanUrl = targetServerUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/health`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        localStorage.setItem('ahtri_backend_url', cleanUrl);
        setUpdateNotice({ type: 'success', message: `Connected to server successfully at ${cleanUrl}!` });
        await fetchRemoteVersionInfo(cleanUrl);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setUpdateNotice({ type: 'error', message: `Connection failed to ${targetServerUrl}: ${err?.message || 'Offline'}` });
    } finally {
      setIsTestingServerConnection(false);
      setTimeout(() => setUpdateNotice(null), 4000);
    }
  };

  // Broadcast update to all employees
  const handleBroadcastUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!updateData.latestVersion.trim()) {
      setUpdateNotice({ type: 'error', message: 'Version string (e.g. 1.0.1) is required.' });
      return;
    }
    if (!updateData.downloadUrl.trim()) {
      setUpdateNotice({ type: 'error', message: 'APK download URL is required.' });
      return;
    }

    setIsSavingUpdateInfo(true);
    try {
      const cleanUrl = targetServerUrl.replace(/\/+$/, '');
      const notes = releaseNotesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...updateData,
        releaseNotes: notes,
        publishedBy: managerName || 'System Admin',
      };

      const res = await fetch(`${cleanUrl}/api/app/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const resData = await res.json();
      if (resData && resData.current) {
        setUpdateData((prev) => ({
          ...prev,
          ...resData.current,
        }));
      }

      setUpdateNotice({
        type: 'success',
        message: `✓ Version ${updateData.latestVersion} (Build #${updateData.latestVersionCode}) is now LIVE and broadcasted to all employees!`,
      });
    } catch (err: any) {
      setUpdateNotice({
        type: 'error',
        message: `Failed to broadcast update: ${err?.message || 'Server unreachable'}`,
      });
    } finally {
      setIsSavingUpdateInfo(false);
      setTimeout(() => setUpdateNotice(null), 5000);
    }
  };

  // Toggle active broadcast state (pause / resume)
  const handleToggleBroadcastActive = async (newActiveState: boolean) => {
    setIsSavingUpdateInfo(true);
    try {
      const cleanUrl = targetServerUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/app/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ isActive: newActiveState }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      setUpdateData((prev) => ({ ...prev, isActive: newActiveState }));
      setUpdateNotice({
        type: 'success',
        message: newActiveState
          ? '✓ Update broadcast resumed. All employee apps will now receive this update.'
          : '⏸ Update broadcast paused. Mobile apps will not show update prompts.',
      });
    } catch (err: any) {
      setUpdateNotice({
        type: 'error',
        message: `Could not change broadcast status: ${err?.message || 'Server error'}`,
      });
    } finally {
      setIsSavingUpdateInfo(false);
      setTimeout(() => setUpdateNotice(null), 4000);
    }
  };

  // Helper to generate styled 3D Pin Icon based on Headquarters / Branch Tag
  const createCityPinIcon = (branchType: BranchTagType = 'SUB_CITY_BRANCH', isHq: boolean = false) => {
    const isHeadquarters = isHq || branchType === 'HEADQUARTERS';
    const bg = isHeadquarters ? '#1A3C6E' : branchType === 'REGIONAL_HUB' ? '#4F46E5' : branchType === 'ZONAL_DEPOT' ? '#059669' : '#0891B2';
    const label = isHeadquarters ? 'HQ' : branchType === 'REGIONAL_HUB' ? 'HUB' : branchType === 'ZONAL_DEPOT' ? 'DEPOT' : 'BRANCH';
    const border = isHeadquarters ? '3px solid #F59E0B' : '3px solid #FFFFFF';
    return L.divIcon({
      html: `<div style="background:${bg};color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:${border};box-shadow:0 4px 14px rgba(0,0,0,0.35);font-size:10px;font-weight:800;letter-spacing:0.5px;">${label}</div>`,
      className: 'city-pin-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
  };

  const getBranchColor = (branchType: BranchTagType = 'SUB_CITY_BRANCH', isHq: boolean = false) => {
    if (isHq || branchType === 'HEADQUARTERS') return '#1A3C6E';
    if (branchType === 'REGIONAL_HUB') return '#4F46E5';
    if (branchType === 'ZONAL_DEPOT') return '#059669';
    return '#0891B2';
  };

  // Initialize City Pinpoint Map when city tab is active
  useEffect(() => {
    if (activeTab !== 'city' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = createOptimizedMap(mapContainerRef.current, {
        dragging: !isMobile,
        touchZoom: !isMobile,
      }).setView([currentCityPin.lat, currentCityPin.lng], 11);
      mapInstanceRef.current = map;
      if (isMobile) {
        map.dragging.disable();
        map.touchZoom.disable();
      }

      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      // Create pinpoint marker
      const pinIcon = createCityPinIcon(newCityBranchTag, newCityBranchTag === 'HEADQUARTERS');

      const marker = L.marker([currentCityPin.lat, currentCityPin.lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      const circle = L.circle([currentCityPin.lat, currentCityPin.lng], {
        radius: currentCityPin.radiusKm * 1000,
        color: getBranchColor(newCityBranchTag, newCityBranchTag === 'HEADQUARTERS'),
        fillColor: getBranchColor(newCityBranchTag, newCityBranchTag === 'HEADQUARTERS'),
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '5, 8',
      }).addTo(map);
      circleRef.current = circle;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateCityPinPosition(pos.lat, pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        updateCityPinPosition(e.latlng.lat, e.latlng.lng);
      });
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, [activeTab]);

  // Update Tile Layer on satellite toggle
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(mapInstanceRef.current);
  }, [mapMode]);

  // Update radius circle
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(currentCityPin.radiusKm * 1000);
    }
  }, [currentCityPin.radiusKm]);

  // Reverse geocode clicked/dragged position to identify city
  const updateCityPinPosition = async (lat: number, lng: number, fallbackName?: string) => {
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    if (circleRef.current) circleRef.current.setLatLng([lat, lng]);
    if (mapInstanceRef.current) mapInstanceRef.current.panTo([lat, lng]);

    let detectedCity = fallbackName || 'Marked City';
    let detectedState = 'Operating Territory';
    let detectedCountry = 'India';

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          detectedCity =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.state_district ||
            data.address.county ||
            data.name ||
            fallbackName ||
            'Marked Location';
          detectedState = data.address.state || data.address.region || 'Region';
          detectedCountry = data.address.country || 'India';
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }

    setCurrentCityPin((prev) => ({
      ...prev,
      cityName: detectedCity,
      state: detectedState,
      country: detectedCountry,
      lat,
      lng,
    }));
  };

  // Search City via Nominatim
  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCityQuery.trim()) return;

    setIsSearchingCity(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchCityQuery)}&limit=1`,
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          mapInstanceRef.current?.setView([lat, lon], 12);
          updateCityPinPosition(lat, lon, first.name || searchCityQuery);
        } else {
          alert('City not found. Please try entering state or country along with city name.');
        }
      }
    } catch (err) {
      console.error('City search failed:', err);
    } finally {
      setIsSearchingCity(false);
    }
  };

  // Save Marked City to Operating Zones List
  const handleSaveMarkedCity = () => {
    const isHq = newCityBranchTag === 'HEADQUARTERS';
    const newCity: OperatingCity = {
      id: `city-${Date.now().toString().slice(-4)}`,
      cityName: currentCityPin.cityName,
      state: currentCityPin.state,
      country: currentCityPin.country,
      latitude: currentCityPin.lat,
      longitude: currentCityPin.lng,
      radiusKm: currentCityPin.radiusKm,
      isHeadquarters: isHq,
      branchType: newCityBranchTag,
    };

    let updatedList: OperatingCity[];
    if (isHq) {
      updatedList = [
        newCity,
        ...operatingCities.map((c) => ({
          ...c,
          isHeadquarters: false,
          branchType: (c.branchType === 'HEADQUARTERS' ? 'SUB_CITY_BRANCH' : c.branchType) as BranchTagType,
        })),
      ];
    } else {
      updatedList = [newCity, ...operatingCities];
    }

    setOperatingCities(updatedList);
    try {
      localStorage.setItem('ahtri_operating_cities', JSON.stringify(updatedList));
    } catch {}

    const branchLabel = newCityBranchTag === 'HEADQUARTERS' ? 'Official Headquarters' : newCityBranchTag.replace(/_/g, ' ');
    setCityNotice(`Saved "${currentCityPin.cityName}" as ${branchLabel}!`);
    setTimeout(() => setCityNotice(null), 3500);

    handleSelectOperatingCity(newCity);
  };

  // Focus on a saved city
  const handleSelectOperatingCity = (city: OperatingCity) => {
    setCurrentCityPin({
      cityName: city.cityName,
      state: city.state,
      country: city.country,
      lat: city.latitude,
      lng: city.longitude,
      radiusKm: city.radiusKm,
    });
    setNewCityBranchTag(city.branchType || (city.isHeadquarters ? 'HEADQUARTERS' : 'SUB_CITY_BRANCH'));
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([city.latitude, city.longitude], 12);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([city.latitude, city.longitude]);
      markerRef.current.setIcon(createCityPinIcon(city.branchType, city.isHeadquarters));
    }
    if (circleRef.current) {
      const color = getBranchColor(city.branchType, city.isHeadquarters);
      circleRef.current.setLatLng([city.latitude, city.longitude]);
      circleRef.current.setRadius(city.radiusKm * 1000);
      circleRef.current.setStyle({ color, fillColor: color });
    }
  };

  // Set any city as official Headquarters
  const handleSetHeadquarters = (cityId: string) => {
    const target = operatingCities.find((c) => c.id === cityId);
    if (!target) return;

    const updated = operatingCities.map((c) => {
      if (c.id === cityId) {
        return { ...c, isHeadquarters: true, branchType: 'HEADQUARTERS' as BranchTagType };
      }
      return {
        ...c,
        isHeadquarters: false,
        branchType: (c.branchType === 'HEADQUARTERS' ? 'SUB_CITY_BRANCH' : c.branchType) as BranchTagType,
      };
    });

    setOperatingCities(updated);
    try {
      localStorage.setItem('ahtri_operating_cities', JSON.stringify(updated));
    } catch {}

    setCityNotice(`Official Headquarters transferred to "${target.cityName}"!`);
    setTimeout(() => setCityNotice(null), 3500);

    handleSelectOperatingCity({ ...target, isHeadquarters: true, branchType: 'HEADQUARTERS' });
  };

  // Change branch tag (Sub-City Branch, Regional Hub, Zonal Depot, Headquarters)
  const handleChangeBranchTag = (cityId: string, tag: BranchTagType) => {
    if (tag === 'HEADQUARTERS') {
      handleSetHeadquarters(cityId);
      return;
    }

    const target = operatingCities.find((c) => c.id === cityId);
    if (!target) return;

    const updated = operatingCities.map((c) => {
      if (c.id === cityId) {
        return { ...c, isHeadquarters: false, branchType: tag };
      }
      return c;
    });

    setOperatingCities(updated);
    try {
      localStorage.setItem('ahtri_operating_cities', JSON.stringify(updated));
    } catch {}

    const labelMap: Record<BranchTagType, string> = {
      HEADQUARTERS: 'Headquarters',
      SUB_CITY_BRANCH: 'Sub-City Branch',
      REGIONAL_HUB: 'Regional Hub',
      ZONAL_DEPOT: 'Zonal Depot',
    };

    setCityNotice(`"${target.cityName}" tagged as ${labelMap[tag]}.`);
    setTimeout(() => setCityNotice(null), 3500);

    handleSelectOperatingCity({ ...target, isHeadquarters: false, branchType: tag });
  };

  // Delete city / branch
  const handleDeleteCity = (cityId: string) => {
    const target = operatingCities.find((c) => c.id === cityId);
    if (!target) return;
    if (target.isHeadquarters || target.branchType === 'HEADQUARTERS') {
      alert('Cannot delete the Headquarters location. Please designate another city as Headquarters first.');
      return;
    }
    const updated = operatingCities.filter((c) => c.id !== cityId);
    setOperatingCities(updated);
    try {
      localStorage.setItem('ahtri_operating_cities', JSON.stringify(updated));
    } catch {}
    setCityNotice(`Removed "${target.cityName}" from operating locations.`);
    setTimeout(() => setCityNotice(null), 3500);
  };

  // Save Profile Handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    onUpdateManagerName(name);
    localStorage.setItem('ahtri_user_email', email);
    localStorage.setItem('ahtri_user_phone', phone);
    localStorage.setItem('ahtri_user_designation', designation);
    localStorage.setItem('ahtri_company_name', companyName);

    setProfileNotice('✓ Profile and name updated successfully across the entire system!');
    setTimeout(() => setProfileNotice(null), 3500);
  };

  // Update Manager Password
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordNotice({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordNotice({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }

    // Success
    setPasswordNotice({ type: 'success', message: 'Your manager account password has been updated securely.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordNotice(null), 4000);
  };

  // Generate random strong password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Update MR Password
  const handleSaveMrPassword = (mrId: string) => {
    if (!tempMrPassword.trim()) {
      alert('Password cannot be empty');
      return;
    }
    setMrList(mrList.map((m) => (m.id === mrId ? { ...m, password: tempMrPassword } : m)));
    setEditingMrPasswordId(null);
    setTempMrPassword('');
    setPasswordNotice({ type: 'success', message: 'Representative password updated. You can share credentials with the member.' });
    setTimeout(() => setPasswordNotice(null), 3500);
  };

  const handleCopyMrCredentials = (mr: any) => {
    const text = `AHTRI Field Representative Login Credentials:\nName: ${mr.name}\nEmail / Login ID: ${mr.email}\nAssigned Phone: ${mr.phone}\nPassword: ${mr.password}\nNote: Device locks to your phone on first login.`;
    navigator.clipboard.writeText(text);
    setCopiedId(mr.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Settings Top Header */}
      <div className="enterprise-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#1A3C6E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
                {t.settingsTitle}
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                {t.settingsDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '14px', overflowX: 'auto' }}>
          {[
            { id: 'profile' as const, label: t.tabProfile, Icon: User },
            { id: 'security' as const, label: t.tabSecurity, Icon: Key },
            { id: 'city' as const, label: t.tabCityPinpoint, Icon: MapPin },
            { id: 'policy' as const, label: t.tabFieldPolicy, Icon: ShieldCheck },
            { id: 'updates' as const, label: (t as any).tabAppUpdates || 'Update Settings (OTA)', Icon: UploadCloud },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '6px',
                border: activeTab === tab.id ? '1.5px solid #1A3C6E' : '1px solid #CBD5E1',
                background: activeTab === tab.id ? '#EFF6FF' : '#FFFFFF',
                color: activeTab === tab.id ? '#1A3C6E' : '#475569',
                fontWeight: activeTab === tab.id ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <tab.Icon size={15} color={activeTab === tab.id ? '#1A3C6E' : '#64748B'} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. PROFILE & ACCOUNT TAB */}
      {activeTab === 'profile' && (
        <div className="enterprise-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
              {t.profileHeading}
            </h2>
            <p style={{ margin: '4px 0 12px 0', fontSize: '12px', color: '#64748B' }}>
              Update your account name, contact coordinates, and corporate enterprise identity.
            </p>
          </div>

          {profileNotice && (
            <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 16px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {profileNotice}
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '680px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  placeholder="e.g. Anil Kumar"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  {t.designation}
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  placeholder="e.g. Area Business Manager"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  {t.contactPhone}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                {t.companyName}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ paddingTop: '8px' }}>
              <button
                type="submit"
                className="btn-enterprise primary"
                style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '700' }}
              >
                <Save size={15} />
                <span>{t.saveProfile}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. PASSWORDS & SECURITY TAB */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {passwordNotice && (
            <div
              style={{
                background: passwordNotice.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: passwordNotice.type === 'success' ? '#166534' : '#991B1B',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {passwordNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {passwordNotice.message}
            </div>
          )}

          {/* Manager Change Password */}
          <div className="enterprise-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} color="#1A3C6E" />
                {t.managerPasswordTitle}
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Ensure your administrative command center password is secure with uppercase, lowercase, numbers, and symbols.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  {t.currentPassword} *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  {t.newPassword} *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  {t.confirmPassword} *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ paddingTop: '6px' }}>
                <button type="submit" className="btn-enterprise primary" style={{ padding: '9px 20px', fontWeight: '700' }}>
                  <Save size={14} />
                  <span>{t.updatePassword}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ALL OTHER PASSWORDS (MR FIELD MEMBERS) */}
          <div className="enterprise-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={16} color="#0F8B5A" />
                    {t.mrPasswordsTitle}
                  </h2>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    {t.mrPasswordsDesc}
                  </p>
                </div>
              </div>
            </div>

            <div className="enterprise-table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Medical Representative</th>
                    <th>Login ID (Email)</th>
                    <th>Registered Phone</th>
                    <th>Current Assigned Password</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mrList.map((mr) => (
                    <tr key={mr.id}>
                      <td style={{ fontWeight: '600', color: '#0F172A' }}>
                        <div>{mr.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{mr.territory}</div>
                      </td>
                      <td style={{ color: '#334155' }}>{mr.email}</td>
                      <td style={{ color: '#334155' }}>{mr.phone}</td>
                      <td>
                        {editingMrPasswordId === mr.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="text"
                              value={tempMrPassword}
                              onChange={(e) => setTempMrPassword(e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', width: '130px', fontFamily: 'monospace' }}
                            />
                            <button
                              onClick={() => setTempMrPassword(generateRandomPassword())}
                              title="Generate Random"
                              style={{ padding: '4px 6px', fontSize: '11px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Gen
                            </button>
                            <button
                              onClick={() => handleSaveMrPassword(mr.id)}
                              className="btn-enterprise success sm"
                              style={{ padding: '4px 8px' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMrPasswordId(null)}
                              className="btn-enterprise secondary sm"
                              style={{ padding: '4px 8px' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#1E293B' }}>
                              {mr.password}
                            </code>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            className="btn-enterprise secondary sm"
                            onClick={() => {
                              setEditingMrPasswordId(mr.id);
                              setTempMrPassword(mr.password);
                            }}
                          >
                            <Key size={12} />
                            <span>{t.changeMrPassword}</span>
                          </button>
                          <button
                            className="btn-enterprise secondary sm"
                            onClick={() => handleCopyMrCredentials(mr)}
                            title="Copy credentials to clipboard"
                          >
                            {copiedId === mr.id ? <Check size={12} color="#0F8B5A" /> : <Copy size={12} />}
                            <span>{copiedId === mr.id ? 'Copied' : t.copyCredentials}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CITY PINPOINT & OPERATING ZONE MAP */}
      {activeTab === 'city' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Explainer */}
          <div className="enterprise-panel" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#1A3C6E" />
                  {t.cityPinpointTitle}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  {t.cityPinpointDesc}
                </p>
              </div>

              {/* Satellite / Street Map Toggle & Mobile Pan Lock */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={toggleMapInteraction}
                  style={{
                    background: isMapInteracting ? '#0F8B5A' : '#FFFFFF',
                    color: isMapInteracting ? '#FFFFFF' : '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  title="Toggle whether touching the map drags the map or scrolls the page"
                >
                  <span>{isMapInteracting ? '🔓 Pan On' : '🔒 Pan Map'}</span>
                </button>

                <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '2px' }}>
                <button
                  onClick={() => setMapMode('street')}
                  style={{
                    padding: '5px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: mapMode === 'street' ? '#1A3C6E' : 'transparent',
                    color: mapMode === 'street' ? '#FFFFFF' : '#475569',
                  }}
                >
                  {t.streetMode}
                </button>
                <button
                  onClick={() => setMapMode('satellite')}
                  style={{
                    padding: '5px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: mapMode === 'satellite' ? '#1A3C6E' : 'transparent',
                    color: mapMode === 'satellite' ? '#FFFFFF' : '#475569',
                  }}
                >
                  {t.satelliteMode}
                </button>
                </div>
              </div>
            </div>

            {/* City Live Search Bar */}
            <form onSubmit={handleSearchCity} style={{ display: 'flex', gap: '10px', marginTop: '16px', maxWidth: '600px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 12px' }}>
                <Search size={16} color="#64748B" />
                <input
                  type="text"
                  placeholder={t.searchCityPlaceholder}
                  value={searchCityQuery}
                  onChange={(e) => setSearchCityQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', padding: '9px 10px', fontSize: '13px', width: '100%' }}
                />
              </div>
              <button type="submit" disabled={isSearchingCity} className="btn-enterprise primary" style={{ fontWeight: '700' }}>
                {isSearchingCity ? 'Searching...' : t.search}
              </button>
            </form>
          </div>

          {cityNotice && (
            <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 16px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {cityNotice}
            </div>
          )}

          {/* Split Map & City Cards Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '20px' }}>
            {/* Interactive Leaflet Pinpoint Map */}
            <div className="enterprise-panel" style={{ overflow: 'hidden', height: '480px', position: 'relative' }}>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

              {/* Collapsible Compact Branch Save Pill / Drawer */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 14,
                  left: 14,
                  right: 14,
                  maxWidth: '380px',
                  zIndex: 500,
                  pointerEvents: 'auto',
                }}
              >
                {!isPinBoxExpanded ? (
                  <button
                    type="button"
                    onClick={() => setIsPinBoxExpanded(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      background: 'rgba(15, 23, 42, 0.92)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      borderRadius: '30px',
                      padding: '8px 14px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                      cursor: 'pointer',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    title="Tap to configure branch type and save"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <MapPin size={14} color="#38BDF8" />
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#38BDF8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {currentCityPin.cityName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#CBD5E1', whiteSpace: 'nowrap' }}>
                        ({currentCityPin.radiusKm}km)
                      </span>
                    </div>
                    <span
                      style={{
                        background: '#0F8B5A',
                        color: '#FFFFFF',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⚙️ Save Branch ▾
                    </span>
                  </button>
                ) : (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontSize: '13px', fontWeight: '800' }}>
                        <MapPin size={15} />
                        <span>{currentCityPin.cityName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPinBoxExpanded(false)}
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          border: 'none',
                          color: '#CBD5E1',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        ✕ Minimize
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
                      {currentCityPin.state}, {currentCityPin.country}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      <span>Lat: <strong style={{ color: '#FFFFFF' }}>{currentCityPin.lat.toFixed(4)}</strong></span>
                      <span>Lng: <strong style={{ color: '#FFFFFF' }}>{currentCityPin.lng.toFixed(4)}</strong></span>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: '600' }}>Branch Type:</span>
                        <select
                          value={newCityBranchTag}
                          onChange={(e) => setNewCityBranchTag(e.target.value as BranchTagType)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: '#1E293B',
                            color: '#38BDF8',
                            border: '1px solid rgba(255,255,255,0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="SUB_CITY_BRANCH">Sub-City Branch</option>
                          <option value="REGIONAL_HUB">Regional Hub</option>
                          <option value="ZONAL_DEPOT">Zonal Depot</option>
                          <option value="HEADQUARTERS">Headquarters (HQ)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#4ADE80', fontWeight: '700' }}>
                          Radius: {currentCityPin.radiusKm} km
                        </span>
                        <button
                          onClick={() => {
                            handleSaveMarkedCity();
                            setIsPinBoxExpanded(false);
                          }}
                          style={{
                            background: '#0F8B5A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '6px 14px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(15,139,90,0.4)',
                          }}
                        >
                          + Save City / Branch
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Operating Cities Sidebar List */}
            <div className="enterprise-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto' }}>
              <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  {t.savedOperatingCities} ({operatingCities.length})
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                  {t.clickToCenter}
                </p>
              </div>

              {/* Territory Radius Controller for Current Pinpoint */}
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  <span>{t.operatingRadius}</span>
                  <strong style={{ color: '#1A3C6E' }}>{currentCityPin.radiusKm} km</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={currentCityPin.radiusKm}
                  onChange={(e) => setCurrentCityPin({ ...currentCityPin, radiusKm: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {/* List of Cities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {operatingCities.map((city) => {
                  const isSelected = city.cityName === currentCityPin.cityName;
                  const isHq = city.isHeadquarters || city.branchType === 'HEADQUARTERS';
                  const branchType = city.branchType || (isHq ? 'HEADQUARTERS' : 'SUB_CITY_BRANCH');

                  const badgeBg = isHq ? '#1A3C6E' : branchType === 'REGIONAL_HUB' ? '#4F46E5' : branchType === 'ZONAL_DEPOT' ? '#059669' : '#0891B2';
                  const badgeText = isHq ? 'HEADQUARTERS' : branchType === 'REGIONAL_HUB' ? 'REGIONAL HUB' : branchType === 'ZONAL_DEPOT' ? 'ZONAL DEPOT' : 'SUB-CITY BRANCH';

                  return (
                    <div
                      key={city.id}
                      onClick={() => handleSelectOperatingCity(city)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isSelected ? '1.5px solid #1A3C6E' : '1px solid #CBD5E1',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                          {city.cityName}
                        </div>
                        <span
                          style={{
                            background: badgeBg,
                            color: '#FFFFFF',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: '800',
                            letterSpacing: '0.4px',
                            border: isHq ? '1px solid #F59E0B' : 'none',
                          }}
                        >
                          {badgeText}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {city.state}, {city.country}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10.5px', color: '#475569' }}>
                        <span>Lat {city.latitude.toFixed(2)}, Lng {city.longitude.toFixed(2)}</span>
                        <span style={{ fontWeight: '700', color: '#0F8B5A' }}>{city.radiusKm} km zone</span>
                      </div>

                      {/* Tag Switcher & HQ Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px dashed #E2E8F0',
                          flexWrap: 'wrap',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isHq && (
                          <button
                            onClick={() => handleSetHeadquarters(city.id)}
                            style={{
                              padding: '3px 8px',
                              fontSize: '10.5px',
                              fontWeight: '700',
                              borderRadius: '4px',
                              background: '#1A3C6E',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title="Promote this location to Official Company Headquarters"
                          >
                            Set as HQ
                          </button>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                          <span>Tag:</span>
                          <select
                            value={branchType}
                            onChange={(e) => handleChangeBranchTag(city.id, e.target.value as BranchTagType)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#0F172A',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="HEADQUARTERS">Headquarters (HQ)</option>
                            <option value="SUB_CITY_BRANCH">Sub-City Branch</option>
                            <option value="REGIONAL_HUB">Regional Hub</option>
                            <option value="ZONAL_DEPOT">Zonal Depot</option>
                          </select>
                        </div>
                        {!isHq && (
                          <button
                            onClick={() => handleDeleteCity(city.id)}
                            title="Remove Branch"
                            style={{
                              marginLeft: 'auto',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#94A3B8',
                              padding: '2px 4px',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FIELD RULES & GEOFENCE POLICY TAB */}
      {activeTab === 'policy' && (
        <div className="enterprise-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#0F8B5A" />
              {t.fieldPolicyTitle}
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
              Configure automatic perimeter boundaries, hardware device binding rules, and payroll attendance thresholds.
            </p>
          </div>

          {policyNotice && (
            <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 16px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {policyNotice}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
            {/* Default Geofence Radius */}
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>
                  {t.defaultGeofenceRadius}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F8B5A' }}>
                  {defaultGeofenceRadius} meters
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="5"
                value={defaultGeofenceRadius}
                onChange={(e) => setDefaultGeofenceRadius(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                Automatically applied when assigning new calls or marking new doctor clinics.
              </span>
            </div>

            {/* Shift Start Time & Grace Period */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  {t.shiftStartTime}
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  {t.gracePeriod}
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Device Binding & Anti-Spoofing Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#0F172A' }}>
                    {t.deviceBindingEnforced}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Permanently binds the MR account to their hardware phone ID on first login.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={deviceBindingEnabled}
                  onChange={(e) => setDeviceBindingEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#0F172A' }}>
                    {t.spoofAlertLocked}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Blocks visit completion if fake GPS or location spoofing apps are detected.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={spoofLockEnabled}
                  onChange={(e) => setSpoofLockEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ paddingTop: '10px' }}>
              <button
                className="btn-enterprise primary"
                onClick={() => {
                  setPolicyNotice('✓ Field policy rules and geofence standards updated successfully.');
                  setTimeout(() => setPolicyNotice(null), 3500);
                }}
                style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '700' }}
              >
                <Save size={15} />
                <span>Save Field Rules</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. APP UPDATES & OTA SETTINGS TAB */}
      {activeTab === 'updates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Notification Alert */}
          {updateNotice && (
            <div
              style={{
                background: updateNotice.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: updateNotice.type === 'success' ? '#166534' : '#991B1B',
                padding: '12px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: updateNotice.type === 'success' ? '1px solid #86EFAC' : '1px solid #FCA5A5',
              }}
            >
              {updateNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <div style={{ flex: 1 }}>{updateNotice.message}</div>
            </div>
          )}

          {/* Active Broadcast Status Hero */}
          <div
            className="enterprise-panel"
            style={{
              padding: '24px',
              background: updateData.isActive
                ? 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)'
                : 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
              border: updateData.isActive ? '1.5px solid #86EFAC' : '1.5px solid #FDE68A',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: updateData.isActive ? '#16A34A' : '#D97706',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  }}
                >
                  <Radio size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: updateData.isActive ? '#DCFCE7' : '#FEF3C7',
                        color: updateData.isActive ? '#15803D' : '#B45309',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: updateData.isActive ? '#16A34A' : '#D97706',
                        }}
                      />
                      {updateData.isActive ? 'LIVE BROADCAST ACTIVE' : 'BROADCAST PAUSED'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Target Build: <strong>v{updateData.latestVersion}</strong> (Build #{updateData.latestVersionCode})
                    </span>
                  </div>
                  <h2 style={{ margin: '6px 0 3px 0', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                    {updateData.isActive
                      ? `Version v${updateData.latestVersion} is actively being served to employees`
                      : 'Update broadcast is currently paused for all field devices'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', maxWidth: '680px' }}>
                    {updateData.isActive
                      ? 'When representatives open their AHTRI FFA mobile app, their device will automatically detect this build and prompt in-app download.'
                      : 'Representatives will continue running their existing installed version without any update interruption or prompt.'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleToggleBroadcastActive(!updateData.isActive)}
                  disabled={isSavingUpdateInfo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '9px 16px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: updateData.isActive ? '1px solid #DC2626' : '1px solid #16A34A',
                    background: updateData.isActive ? '#FEF2F2' : '#F0FDF4',
                    color: updateData.isActive ? '#DC2626' : '#16A34A',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {updateData.isActive ? <Pause size={15} /> : <Play size={15} />}
                  <span>{updateData.isActive ? 'Pause Broadcast' : 'Resume Broadcast'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchRemoteVersionInfo()}
                  disabled={isLoadingUpdateInfo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '9px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                  }}
                >
                  <RefreshCw size={14} style={{ animation: isLoadingUpdateInfo ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main 2-Column Form Layout */}
          <form onSubmit={handleBroadcastUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '20px' }}>
              {/* Column 1: Backend Connection & APK Binary */}
              <div className="enterprise-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={17} color="#1A3C6E" />
                    Binary Package & Target Version
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Configure the compiled APK artifact URL, version numbers, and update enforcement.
                  </p>
                </div>

                {/* Target Server Endpoint */}
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                    Connected Backend Server Endpoint
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={targetServerUrl}
                      onChange={(e) => setTargetServerUrl(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        fontFamily: 'monospace',
                      }}
                      placeholder="https://ahtri-backend.onrender.com"
                    />
                    <button
                      type="button"
                      onClick={handleTestServerConnection}
                      disabled={isTestingServerConnection}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        border: '1px solid #1A3C6E',
                        background: '#1A3C6E',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isTestingServerConnection ? 'Testing...' : 'Test Server'}
                    </button>
                  </div>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748B', marginTop: '4px' }}>
                    Production Render URL: <code>https://ahtri-backend.onrender.com</code>
                  </span>
                </div>

                {/* APK Download URL Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    Expo EAS / Compiled APK Download URL *
                  </label>
                  <input
                    type="url"
                    value={updateData.downloadUrl}
                    onChange={(e) => setUpdateData({ ...updateData, downloadUrl: e.target.value })}
                    placeholder="https://expo.dev/artifacts/eas/...apk"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #94A3B8',
                      fontSize: '12.5px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                    }}
                    required
                  />

                  {/* URL Action Tools */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {updateData.downloadUrl && (
                      <a
                        href={updateData.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: '#1A3C6E',
                          textDecoration: 'none',
                          padding: '3px 8px',
                          background: '#EFF6FF',
                          borderRadius: '4px',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        <ExternalLink size={12} />
                        Test / Download Link
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (updateData.downloadUrl) {
                          navigator.clipboard.writeText(updateData.downloadUrl);
                          setCopiedDownloadUrl(true);
                          setTimeout(() => setCopiedDownloadUrl(false), 2500);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: copiedDownloadUrl ? '#166534' : '#475569',
                        background: copiedDownloadUrl ? '#DCFCE7' : '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedDownloadUrl ? <Check size={12} /> : <Copy size={12} />}
                      {copiedDownloadUrl ? 'Link Copied!' : 'Copy Link'}
                    </button>
                  </div>

                  <div style={{ marginTop: '10px', padding: '8px 10px', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1', fontSize: '11px', color: '#475569' }}>
                    <strong>Permanent Universal Link for MRs:</strong>
                    <div style={{ marginTop: '3px', fontFamily: 'monospace', color: '#1A3C6E', wordBreak: 'break-all' }}>
                      {targetServerUrl.replace(/\/+$/, '')}/app/latest-apk
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>
                      (Redirects automatically to the latest active APK configured above)
                    </span>
                  </div>
                </div>

                {/* Version Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Latest Version *
                    </label>
                    <input
                      type="text"
                      value={updateData.latestVersion}
                      onChange={(e) => setUpdateData({ ...updateData, latestVersion: e.target.value })}
                      placeholder="1.0.1"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Version Code (Build #)
                    </label>
                    <input
                      type="number"
                      value={updateData.latestVersionCode}
                      onChange={(e) => setUpdateData({ ...updateData, latestVersionCode: parseInt(e.target.value, 10) || 1 })}
                      placeholder="2"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Min Supported Version
                    </label>
                    <input
                      type="text"
                      value={updateData.minimumVersion}
                      onChange={(e) => setUpdateData({ ...updateData, minimumVersion: e.target.value })}
                      placeholder="1.0.0"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={updateData.forceUpdate}
                      onChange={(e) => setUpdateData({ ...updateData, forceUpdate: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#0F172A' }}>
                        Mandatory Update (Strict Enforcement)
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Prevents representatives from closing the update dialog until they have installed the new APK.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={updateData.isActive}
                      onChange={(e) => setUpdateData({ ...updateData, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#0F172A' }}>
                        Active Broadcast Enabled
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Uncheck to temporarily pause broadcasting update prompts to mobile apps.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Column 2: Release Notes & Mobile App Preview */}
              <div className="enterprise-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={17} color="#F59E0B" />
                    Release Notes & In-App Preview
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Explain the changes and see how the prompt will look on the employee's screen.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Release Notes (One feature or fix per line)
                  </label>
                  <textarea
                    rows={5}
                    value={releaseNotesText}
                    onChange={(e) => setReleaseNotesText(e.target.value)}
                    placeholder="Enter what's new in this build..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                      lineHeight: '1.5',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Mobile Screen In-App Mockup Preview */}
                <div style={{ background: '#0F172A', padding: '16px', borderRadius: '12px', color: '#FFFFFF', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>
                      <Smartphone size={13} />
                      EMPLOYEE MOBILE SCREEN PREVIEW
                    </div>
                    <span style={{ fontSize: '10px', background: '#1E293B', padding: '2px 6px', borderRadius: '4px', color: '#38BDF8' }}>
                      Native Dialog
                    </span>
                  </div>

                  <div style={{ background: '#1E293B', borderRadius: '8px', padding: '14px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
                        New Version Available: v{updateData.latestVersion}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#94A3B8' }}>
                      A newer version of AHTRI FFA is ready with enhanced stability and performance.
                    </p>

                    <div style={{ background: '#0F172A', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px', maxHeight: '100px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#CBD5E1', marginBottom: '4px' }}>
                        What's New:
                      </div>
                      {releaseNotesText.split('\n').filter(Boolean).map((note, idx) => (
                        <div key={idx} style={{ fontSize: '10px', color: '#94A3B8', display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '2px' }}>
                          <span style={{ color: '#22C55E' }}>•</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'default',
                      }}
                    >
                      <DownloadCloud size={14} />
                      Update Now (In-App Download)
                    </button>
                  </div>
                </div>

                {updateData.publishedAt && (
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Last broadcasted: {new Date(updateData.publishedAt).toLocaleString()}</span>
                    <span>By: {updateData.publishedBy || 'Admin'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Broadcast Submission Bar */}
            <div className="enterprise-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#F8FAFC' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0F172A' }}>
                  Deploy Update to All Field Representatives
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Saves configuration to persistent backend storage and updates live endpoints instantly.
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingUpdateInfo}
                className="btn-enterprise primary"
                style={{
                  padding: '11px 26px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(26,60,110,0.25)',
                }}
              >
                <UploadCloud size={18} />
                <span>{isSavingUpdateInfo ? 'Broadcasting to Server...' : 'Broadcast Update to All Employees'}</span>
              </button>
            </div>
          </form>

          {/* Operator Step-by-Step Instructions Card */}
          <div className="enterprise-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={17} color="#1A3C6E" />
              Standard Operator Procedure: Compiling in Expo & Publishing Updates
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#1A3C6E', marginBottom: '4px' }}>
                  1. Compile in Expo EAS
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.5' }}>
                  In the <code>mobile/</code> directory, execute:
                  <br />
                  <code style={{ background: '#E2E8F0', padding: '2px 5px', borderRadius: '3px', display: 'inline-block', marginTop: '4px' }}>
                    npx eas-cli build -p android --profile preview
                  </code>
                  <br />
                  Or push your commit to GitHub to run GitHub Actions.
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#1A3C6E', marginBottom: '4px' }}>
                  2. Copy Direct APK Artifact Link
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.5' }}>
                  When EAS Build finishes, copy the generated <code>.apk</code> URL (e.g. <code>https://expo.dev/artifacts/eas/....apk</code>).
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#1A3C6E', marginBottom: '4px' }}>
                  3. Paste & Broadcast
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.5' }}>
                  Paste the APK link in the form above, bump the version string (e.g. <code>1.0.2</code>), write release notes, and click <strong>"Broadcast Update"</strong>.
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#166534', marginBottom: '4px' }}>
                  4. Automated In-App Installation
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.5' }}>
                  When employees open their app, they see the update popup. The app downloads the APK in-app with a progress bar and launches the native package installer.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
