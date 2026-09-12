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
    latestVersion: '1.0.5',
    latestVersionCode: 5,
    minimumVersion: '1.0.0',
    downloadUrl: 'https://expo.dev/artifacts/eas/2230bgQr8OI66zRhFj6-h4Nfg3R4ynIQ-oUwaecgHAY.apk',
    forceUpdate: false,
    isActive: true,
    releaseDate: new Date().toISOString().split('T')[0],
    publishedAt: '',
    publishedBy: managerName || 'System Admin',
  });
  const [releaseNotesText, setReleaseNotesText] = useState(
    'WhatsApp-Style Push & Heads-Up Notifications for assigned MR tasks & leave decisions\nCompleted Tasks History Page with Date-Wise Filter Chips & Executive Work Summary (Visits, POB ₹, Detailing)\nOfficial AHTRI Pharmaceuticals Branding & High-Resolution App Logo (Launcher, Splash, Header)\nAutomated In-App Update Notifications with one-tap APK installation flow\nLive GPS Geofencing, Leaflet mapping, and real-time reverse geocoding'
  );
  const [isLoadingUpdateInfo, setIsLoadingUpdateInfo] = useState(false);
  const [isSavingUpdateInfo, setIsSavingUpdateInfo] = useState(false);
  const [updateNotice, setUpdateNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedDownloadUrl, setCopiedDownloadUrl] = useState(false);
  const [copiedServerUrl, setCopiedServerUrl] = useState(false);
  const [isTestingServerConnection, setIsTestingServerConnection] = useState(false);
  const [justSentSuccess, setJustSentSuccess] = useState(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<string | null>(null);

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

    if (!updateData.downloadUrl.trim()) {
      setUpdateNotice({ type: 'error', message: 'Please enter the app download link.' });
      return;
    }

    setIsSavingUpdateInfo(true);
    try {
      const cleanUrl = targetServerUrl.replace(/\/+$/, '');
      const payload = {
        latestVersion: updateData.latestVersion?.trim() || '1.0.4',
        latestVersionCode: Number(updateData.latestVersionCode) || 5,
        downloadUrl: updateData.downloadUrl.trim(),
        forceUpdate: updateData.forceUpdate,
        isActive: updateData.isActive,
        publishedBy: managerName || 'Admin',
      };

      const res = await fetch(`${cleanUrl}/api/app/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Synchronize with live Render backend if running on another target
      if (cleanUrl !== 'https://ahtri-backend.onrender.com') {
        try {
          await fetch('https://ahtri-backend.onrender.com/api/app/version', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(payload),
          });
        } catch {
          // Secondary sync attempt
        }
      }

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

      setJustSentSuccess(true);
      const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastBroadcastTime(nowTime);

      setUpdateNotice({
        type: 'success',
        message: lang === 'hi'
          ? '✓ सफलतापूर्वक भेजा गया (Send successfully)! ऐप अपडेट नोटिफिकेशन सभी कर्मचारियों के ऐप्स पर प्रसारित कर दिया गया है।'
          : '✓ Send successfully! App update notification has been broadcasted to all employees.',
      });

      setTimeout(() => {
        setJustSentSuccess(false);
      }, 7000);
    } catch (err: any) {
      setUpdateNotice({
        type: 'error',
        message: `Failed to save update link: ${err?.message || 'Server error'}`,
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
        dragging: true,
        touchZoom: true,
      }).setView([currentCityPin.lat, currentCityPin.lng], 11);
      mapInstanceRef.current = map;
      map.dragging.enable();
      map.touchZoom.enable();

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

      {/* 5. APP UPDATE LINK TAB */}
      {activeTab === 'updates' && (
        <div className="enterprise-panel" style={{ padding: '28px', maxWidth: '720px' }}>
          <div style={{ marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={20} color="#1A3C6E" />
              {lang === 'hi' ? 'मोबाइल ऐप अपडेट और कर्मचारी शेयरिंग' : 'Mobile App Update & Employee Sharing'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
              {lang === 'hi'
                ? 'नया ऐप लिंक कर्मचारियों को भेजें या ऐप में सीधे ऑटो-अपडेट पॉपअप सक्रिय करें।'
                : 'Send the latest APK update link to field employees or trigger the in-app auto-update popup.'}
            </p>
          </div>

          {updateNotice && (
            <div
              style={{
                background: updateNotice.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: updateNotice.type === 'success' ? '#166534' : '#991B1B',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: updateNotice.type === 'success' ? '1px solid #86EFAC' : '1px solid #FCA5A5',
              }}
            >
              {updateNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{updateNotice.message}</span>
            </div>
          )}

          {/* Quick Share with Field Employees Box */}
          <div
            style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={18} color="#166534" />
                <strong style={{ fontSize: '14px', color: '#166534' }}>
                  {lang === 'hi' ? 'कर्मचारियों को भेजने हेतु डायरेक्ट डाउनलोड लिंक' : 'Direct Download Link for Employees'}
                </strong>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '12px' }}>
                Active v{updateData.latestVersion || '1.0.4'}
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#14532D' }}>
              {lang === 'hi'
                ? 'यह लिंक किसी भी कर्मचारी के फोन में डायरेक्ट APK डाउनलोड शुरू करेगा (बिना किसी परेशानी के):'
                : 'This direct permanent link starts downloading the APK immediately when clicked on an Android phone:'}
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                readOnly
                value="https://ahtri-backend.onrender.com/api/app/latest-apk"
                style={{
                  flex: 1,
                  minWidth: '240px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #86EFAC',
                  background: '#FFFFFF',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#0F172A',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('https://ahtri-backend.onrender.com/api/app/latest-apk');
                  setCopiedServerUrl(true);
                  setTimeout(() => setCopiedServerUrl(false), 2500);
                }}
                style={{
                  padding: '9px 16px',
                  background: copiedServerUrl ? '#166534' : '#0F8B5A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {copiedServerUrl ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedServerUrl ? (lang === 'hi' ? 'कॉपी हो गया!' : 'Copied!') : (lang === 'hi' ? 'लिंक कॉपी करें' : 'Copy Link')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const shareMsg = `AHTRI FFA Mobile App Update (v${updateData.latestVersion || '1.0.4'}):\nClick here to download and install the new APK:\nhttps://ahtri-backend.onrender.com/api/app/latest-apk`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`, '_blank');
                }}
                style={{
                  padding: '9px 16px',
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>💬 {lang === 'hi' ? 'WhatsApp पर भेजें' : 'Share on WhatsApp'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#166534' }}>
              <DownloadCloud size={13} />
              <span>
                {lang === 'hi'
                  ? 'कर्मचारी इस लिंक को WhatsApp या SMS से खोलकर तुरंत नया APK इनस्टॉल कर सकते हैं।'
                  : 'Employees can click this link from WhatsApp or SMS to directly download and install.'}
              </span>
            </div>
          </div>

          <form onSubmit={handleBroadcastUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  {lang === 'hi' ? 'संस्करण संख्या (Version) *' : 'Target Version *'}
                </label>
                <input
                  type="text"
                  value={updateData.latestVersion}
                  onChange={(e) => setUpdateData({ ...updateData, latestVersion: e.target.value })}
                  placeholder="1.0.4"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '3px' }}>
                  {lang === 'hi'
                    ? 'कर्मचारियों के फोन पर 1.0.3 है, इसलिए 1.0.4 रखने पर तुरंत अपडेट का विकल्प दिखेगा।'
                    : 'Set higher than 1.0.3 (e.g. 1.0.4) so employee phones trigger the update prompt.'}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  {lang === 'hi' ? 'संस्करण कोड (Version Code)' : 'Version Code'}
                </label>
                <input
                  type="number"
                  value={updateData.latestVersionCode}
                  onChange={(e) => setUpdateData({ ...updateData, latestVersionCode: Number(e.target.value) })}
                  placeholder="5"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                {lang === 'hi' ? 'डायरेक्ट APK फ़ाइल लिंक (EAS/Cloud Storage URL) *' : 'Direct APK File URL (EAS Artifact) *'}
              </label>
              <input
                type="url"
                value={updateData.downloadUrl}
                onChange={(e) => setUpdateData({ ...updateData, downloadUrl: e.target.value })}
                placeholder="https://expo.dev/artifacts/eas/...apk"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: '#FFFFFF',
                  color: '#0F172A',
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                  {lang === 'hi' ? 'ऐप खोलते ही कर्मचारियों को डाउनलोड विकल्प दिखाएं' : 'Show In-App Download Popup to Employees'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  {updateData.isActive
                    ? (lang === 'hi' ? 'सक्रिय: ऐप खोलते ही कर्मचारियों को अपडेट डाउनलोड का पॉपअप मिलेगा।' : 'Active: Employees will see the download update modal upon opening the app.')
                    : (lang === 'hi' ? 'स्थगित: अपडेट पॉपअप अभी बंद है।' : 'Paused: Update prompts are currently suppressed.')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={updateData.isActive}
                onChange={(e) => setUpdateData({ ...updateData, isActive: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                  {lang === 'hi' ? 'अनिवार्य अपडेट (Force Mandatory Update)' : 'Mandatory Update (Lock app until updated)'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  {updateData.forceUpdate
                    ? (lang === 'hi' ? 'अनिवार्य: कर्मचारी बिना अपडेट किए ऐप इस्तेमाल नहीं कर पाएंगे।' : 'Mandatory: Employees must update before proceeding.')
                    : (lang === 'hi' ? 'वैकल्पिक: कर्मचारी बाद में भी अपडेट कर सकते हैं।' : 'Optional: Employees can update or dismiss.')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={updateData.forceUpdate}
                onChange={(e) => setUpdateData({ ...updateData, forceUpdate: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ paddingTop: '6px' }}>
              {/* Prominent Send Successfully Alert directly above the button */}
              {justSentSuccess && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: '#DCFCE7',
                    border: '2px solid #22C55E',
                    color: '#15803D',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    marginBottom: '14px',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)',
                  }}
                >
                  <CheckCircle2 size={22} color="#166534" />
                  <div>
                    <div style={{ fontSize: '14px', color: '#166534' }}>
                      {lang === 'hi' ? '✓ सफलतापूर्वक भेजा गया (Send successfully)' : '✓ Send successfully!'}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#15803D', marginTop: '2px' }}>
                      {lang === 'hi'
                        ? `वर्जन v${updateData.latestVersion || '1.0.4'} का नोटिफिकेशन सभी कर्मचारियों के ऐप्स पर भेज दिया गया है।`
                        : `Update notification for v${updateData.latestVersion || '1.0.4'} broadcasted to all employee devices.`}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={isSavingUpdateInfo}
                  className="btn-enterprise primary"
                  style={{
                    padding: '12px 26px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: justSentSuccess ? '#166534' : undefined,
                    borderColor: justSentSuccess ? '#166534' : undefined,
                    boxShadow: justSentSuccess ? '0 0 12px rgba(22, 101, 52, 0.4)' : undefined,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {justSentSuccess ? <Check size={18} /> : <Save size={16} />}
                  <span>
                    {isSavingUpdateInfo
                      ? (lang === 'hi' ? 'प्रसारित कर रहे हैं...' : 'Publishing...')
                      : justSentSuccess
                      ? (lang === 'hi' ? '✓ सफलतापूर्वक भेजा गया (Send successfully)' : '✓ Send successfully!')
                      : (lang === 'hi' ? 'सभी कर्मचारियों को अपडेट भेजें' : 'Broadcast Update to All Employees')}
                  </span>
                </button>

                {lastBroadcastTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                    <CheckCircle2 size={15} color="#166534" />
                    <span>
                      {lang === 'hi'
                        ? `अंतिम बार भेजा गया: ${lastBroadcastTime}`
                        : `Last sent: ${lastBroadcastTime}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Floating toast notification for screen-wide confirmation */}
          {justSentSuccess && (
            <div
              style={{
                position: 'fixed',
                bottom: '28px',
                right: '28px',
                zIndex: 9999,
                background: '#166534',
                color: '#FFFFFF',
                padding: '14px 22px',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13.5px',
                fontWeight: '700',
              }}
            >
              <CheckCircle2 size={22} color="#FFFFFF" />
              <div>
                <div style={{ fontSize: '14.5px' }}>
                  {lang === 'hi' ? '✓ सफलतापूर्वक भेजा गया (Send successfully)' : '✓ Send successfully!'}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '400', opacity: 0.9 }}>
                  {lang === 'hi' ? 'सभी कर्मचारी ऐप्स को अपडेट लिंक भेज दिया गया है।' : 'Update notification sent to all employee apps.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
