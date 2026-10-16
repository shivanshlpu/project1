import React, { useState, useEffect } from 'react';
import {
  Building,
  Layers,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
  CornerDownRight,
  Upload,
  Compass,
} from 'lucide-react';
import { showConfirmModal } from './CenteredModalNotice';
import { findKnownCityCoordinates } from '../utils/savedLocationsStore';

export interface HeadquarterItem {
  id: string;
  name: string;
  code: string;
  state: string;
  status: 'ACTIVE' | 'INACTIVE';
  hq_id?: string;
  hq_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface SubAreaItem {
  id: string;
  hq_id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export const DEFAULT_MANAGED_HQS: HeadquarterItem[] = [
  { id: 'HQ-SHD-001', name: 'Shahdol', code: 'SHD', state: 'Madhya Pradesh', status: 'ACTIVE', hq_id: 'HQ-SHD-001', hq_code: 'SHD' },
  { id: 'HQ-KOT-001', name: 'Kotma', code: 'KOT', state: 'Madhya Pradesh', status: 'ACTIVE', hq_id: 'HQ-KOT-001', hq_code: 'KOT' },
  { id: 'HQ-AMB-001', name: 'Ambikapur', code: 'AMB', state: 'Chhattisgarh', status: 'ACTIVE', hq_id: 'HQ-AMB-001', hq_code: 'AMB' },
  { id: 'HQ-BSP-001', name: 'Bilaspur', code: 'BSP', state: 'Chhattisgarh', status: 'ACTIVE', hq_id: 'HQ-BSP-001', hq_code: 'BSP' },
];

export const DEFAULT_MANAGED_AREAS: SubAreaItem[] = [
  
  { id: 'area-shd-01', hq_id: 'HQ-SHD-001', name: 'Burhar', status: 'ACTIVE' },
  { id: 'area-shd-02', hq_id: 'HQ-SHD-001', name: 'Gohparu', status: 'ACTIVE' },
  { id: 'area-shd-03', hq_id: 'HQ-SHD-001', name: 'Beohari', status: 'ACTIVE' },
  { id: 'area-shd-04', hq_id: 'HQ-SHD-001', name: 'Jaisinghnagar', status: 'ACTIVE' },
  { id: 'area-shd-05', hq_id: 'HQ-SHD-001', name: 'Sohagpur', status: 'ACTIVE' },
  { id: 'area-shd-06', hq_id: 'HQ-SHD-001', name: 'Singhpur', status: 'ACTIVE' },
  { id: 'area-shd-07', hq_id: 'HQ-SHD-001', name: 'Shahdol Central', status: 'ACTIVE' },
  { id: 'area-shd-08', hq_id: 'HQ-SHD-001', name: 'Amdih', status: 'ACTIVE' },
  { id: 'area-shd-09', hq_id: 'HQ-SHD-001', name: 'Janakpur Road', status: 'ACTIVE' },
  { id: 'area-shd-10', hq_id: 'HQ-SHD-001', name: 'Dhanpuri', status: 'ACTIVE' },
  { id: 'area-shd-11', hq_id: 'HQ-SHD-001', name: 'Amlai', status: 'ACTIVE' },
  { id: 'area-shd-12', hq_id: 'HQ-SHD-001', name: 'Bakaho', status: 'ACTIVE' },

  
  { id: 'area-amb-01', hq_id: 'HQ-AMB-001', name: 'Sitapur', status: 'ACTIVE' },
  { id: 'area-amb-02', hq_id: 'HQ-AMB-001', name: 'Lundra', status: 'ACTIVE' },
  { id: 'area-amb-03', hq_id: 'HQ-AMB-001', name: 'Batoli', status: 'ACTIVE' },
  { id: 'area-amb-04', hq_id: 'HQ-AMB-001', name: 'Mainpat', status: 'ACTIVE' },
  { id: 'area-amb-05', hq_id: 'HQ-AMB-001', name: 'Udaipur', status: 'ACTIVE' },
  { id: 'area-amb-06', hq_id: 'HQ-AMB-001', name: 'Lakhanpur', status: 'ACTIVE' },
  { id: 'area-amb-07', hq_id: 'HQ-AMB-001', name: 'Surguja', status: 'ACTIVE' },
  { id: 'area-amb-08', hq_id: 'HQ-AMB-001', name: 'Ramanujganj', status: 'ACTIVE' },
  { id: 'area-amb-09', hq_id: 'HQ-AMB-001', name: 'Ambikapur Central', status: 'ACTIVE' },

  
  { id: 'area-bsp-01', hq_id: 'HQ-BSP-001', name: 'Kota', status: 'ACTIVE' },
  { id: 'area-bsp-02', hq_id: 'HQ-BSP-001', name: 'Takhatpur', status: 'ACTIVE' },
  { id: 'area-bsp-03', hq_id: 'HQ-BSP-001', name: 'Masturi', status: 'ACTIVE' },
  { id: 'area-bsp-04', hq_id: 'HQ-BSP-001', name: 'Bilha', status: 'ACTIVE' },
  { id: 'area-bsp-05', hq_id: 'HQ-BSP-001', name: 'Ratanpur', status: 'ACTIVE' },
  { id: 'area-bsp-06', hq_id: 'HQ-BSP-001', name: 'Bodri', status: 'ACTIVE' },
  { id: 'area-bsp-07', hq_id: 'HQ-BSP-001', name: 'Sakri', status: 'ACTIVE' },
  { id: 'area-bsp-08', hq_id: 'HQ-BSP-001', name: 'Bilaspur City', status: 'ACTIVE' },

  
  { id: 'area-ktm-01', hq_id: 'HQ-KOT-001', name: 'Kotma Town', status: 'ACTIVE' },
  { id: 'area-ktm-02', hq_id: 'HQ-KOT-001', name: 'Anuppur', status: 'ACTIVE' },
  { id: 'area-ktm-03', hq_id: 'HQ-KOT-001', name: 'Jaithari', status: 'ACTIVE' },
  { id: 'area-ktm-04', hq_id: 'HQ-KOT-001', name: 'Bijuri', status: 'ACTIVE' },
  { id: 'area-ktm-05', hq_id: 'HQ-KOT-001', name: 'Rajendragram', status: 'ACTIVE' },
  { id: 'area-ktm-06', hq_id: 'HQ-KOT-001', name: 'Bhalumuda', status: 'ACTIVE' },
];

export const HqTerritoryManager: React.FC = () => {
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  
  const [hqs, setHqs] = useState<HeadquarterItem[]>(() => {
    try {
      const saved = localStorage.getItem('ahtri_inventory_hqs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((h: any) => {
            const name = (h.name || '').toLowerCase().trim();
            return !['jaisinghnagar', 'burhar', 'burhar/bauhari', 'bauhari'].includes(name);
          });
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return DEFAULT_MANAGED_HQS;
  });

  const [selectedHqId, setSelectedHqId] = useState<string>('hq-shahdol');

  
  const [areas, setAreas] = useState<SubAreaItem[]>(() => {
    try {
      const saved = localStorage.getItem('ahtri_hq_subareas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((a: any) => {
            if (a.hq_id === 'hq-jaisinghnagar' || a.hq_id === 'hq-burhar') {
              return { ...a, hq_id: 'hq-shahdol' };
            }
            return a;
          });
        }
      }
    } catch {}
    return DEFAULT_MANAGED_AREAS;
  });

  
  const [hqSearch, setHqSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  
  const [isAddHqModalOpen, setIsAddHqModalOpen] = useState(false);
  const [newHqName, setNewHqName] = useState('');
  const [newHqCode, setNewHqCode] = useState('');
  const [newHqState, setNewHqState] = useState('');
  const [newHqLat, setNewHqLat] = useState<string>('');
  const [newHqLng, setNewHqLng] = useState<string>('');
  const [isDetectingNewCoords, setIsDetectingNewCoords] = useState(false);

  const [editingHq, setEditingHq] = useState<HeadquarterItem | null>(null);
  const [editHqName, setEditHqName] = useState('');
  const [editHqCode, setEditHqCode] = useState('');
  const [editHqState, setEditHqState] = useState('');
  const [editHqLat, setEditHqLat] = useState<string>('');
  const [editHqLng, setEditHqLng] = useState<string>('');
  const [isDetectingEditCoords, setIsDetectingEditCoords] = useState(false);

  const detectCoordinates = async (cityName: string, target: 'new' | 'edit') => {
    if (!cityName.trim()) return;
    const clean = cityName.trim();
    if (target === 'new') setIsDetectingNewCoords(true);
    else setIsDetectingEditCoords(true);

    try {
      
      const local = findKnownCityCoordinates(clean);
      if (local) {
        if (target === 'new') {
          setNewHqLat(local.lat.toFixed(4));
          setNewHqLng(local.lng.toFixed(4));
        } else {
          setEditHqLat(local.lat.toFixed(4));
          setEditHqLng(local.lng.toFixed(4));
        }
        showNotice('success', `Coordinates resolved for "${clean}": [${local.lat.toFixed(4)}, ${local.lng.toFixed(4)}]`);
        return;
      }

      
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean + ', India')}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            if (target === 'new') {
              setNewHqLat(lat.toFixed(4));
              setNewHqLng(lon.toFixed(4));
            } else {
              setEditHqLat(lat.toFixed(4));
              setEditHqLng(lon.toFixed(4));
            }
            showNotice('success', `Online geocoding matched "${clean}": [${lat.toFixed(4)}, ${lon.toFixed(4)}]`);
            return;
          }
        }
      }
      showNotice('error', `Could not auto-detect GPS for "${clean}". Please enter coordinates manually.`);
    } catch {
      showNotice('error', `Geocoding lookup failed. Please enter coordinates manually.`);
    } finally {
      if (target === 'new') setIsDetectingNewCoords(false);
      else setIsDetectingEditCoords(false);
    }
  };

  const handleNewHqNameChange = (val: string) => {
    setNewHqName(val);
    const local = findKnownCityCoordinates(val);
    if (local) {
      setNewHqLat(local.lat.toFixed(4));
      setNewHqLng(local.lng.toFixed(4));
    }
  };

  
  const [newAreaName, setNewAreaName] = useState('');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkAreaText, setBulkAreaText] = useState('');

  
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState('');

  
  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  
  const persistHqs = (updated: HeadquarterItem[]) => {
    setHqs(updated);
    try {
      localStorage.setItem('ahtri_inventory_hqs', JSON.stringify(updated));
      window.dispatchEvent(new Event('ahtri_hq_updated'));
    } catch {}
  };

  const persistAreas = (updated: SubAreaItem[]) => {
    setAreas(updated);
    try {
      localStorage.setItem('ahtri_hq_subareas', JSON.stringify(updated));
      window.dispatchEvent(new Event('ahtri_hq_updated'));
      window.dispatchEvent(new Event('ahtri_areas_updated'));
    } catch {}
  };

  
  const fetchBackendData = async () => {
    setIsLoading(true);
    try {
      
      const resHqs = await fetch(`${apiUrl}/inventory/hqs`, { headers: getAuthHeaders() });
      if (resHqs.ok) {
        const dataHqs = await resHqs.json();
        const map = new Map<string, HeadquarterItem>();
        hqs.forEach((h) => {
          const normKey = (h.name || '').toLowerCase().trim();
          if (normKey) map.set(normKey, h);
        });
        dataHqs.forEach((h: any) => {
          const normKey = (h.name || '').toLowerCase().trim();
          if (!normKey) return;
          const hId = h.hq_id || h.id;
          const hCode = h.code || h.hq_code || (h.name ? `HQ-${h.name.substring(0, 3).toUpperCase()}` : 'HQ-SHD');
          const existing = map.get(normKey);
          const fallbackCoords = findKnownCityCoordinates(h.name) || { lat: 23.2953, lng: 81.3586 };
          map.set(normKey, {
            id: hId,
            name: h.name,
            code: hCode,
            state: h.state || existing?.state || '',
            status: h.status || 'ACTIVE',
            hq_id: h.hq_id || hId,
            hq_code: h.hq_code || hCode,
            latitude: existing?.latitude ?? fallbackCoords.lat,
            longitude: existing?.longitude ?? fallbackCoords.lng,
          });
        });
        const mergedHqs = Array.from(map.values());
        if (mergedHqs.length > 0) {
          persistHqs(mergedHqs);
        }
      }

      
      const resAreas = await fetch(`${apiUrl}/inventory/areas`, { headers: getAuthHeaders() });
      if (resAreas.ok) {
        const dataAreas = await resAreas.json();
        if (Array.isArray(dataAreas) && dataAreas.length > 0) {
          const map = new Map<string, SubAreaItem>();
          DEFAULT_MANAGED_AREAS.forEach((a) => map.set(a.id, a));
          areas.forEach((a) => map.set(a.id, a));
          dataAreas.forEach((a: any) => {
            map.set(a.id, {
              id: a.id,
              hq_id: a.hq_id,
              name: a.name,
              status: a.status || 'ACTIVE',
            });
          });
          const mergedAreas = Array.from(map.values());
          persistAreas(mergedAreas);
        }
      }
    } catch (e) {
      console.warn('Backend unavailable, using cached HQs and areas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  
  const activeHq = hqs.find((h) => h.id === selectedHqId || h.hq_id === selectedHqId || h.code === selectedHqId) || hqs[0] || {
    id: 'HQ-SHD-001',
    name: 'Shahdol',
    code: 'SHD',
    state: 'Madhya Pradesh',
    status: 'ACTIVE',
    hq_id: 'HQ-SHD-001',
    hq_code: 'SHD',
  };

  
  const filteredHqs = hqs.filter((h) =>
    h.name.toLowerCase().includes(hqSearch.toLowerCase()) ||
    h.state.toLowerCase().includes(hqSearch.toLowerCase()) ||
    h.code.toLowerCase().includes(hqSearch.toLowerCase()) ||
    (h.hq_id && h.hq_id.toLowerCase().includes(hqSearch.toLowerCase()))
  );

  
  const hqSubAreas = areas.filter((a) =>
    a.hq_id === activeHq.id ||
    a.hq_id === activeHq.code ||
    (activeHq.name && a.hq_id.toLowerCase().includes(activeHq.name.toLowerCase())) ||
    (activeHq.id === 'HQ-SHD-001' && a.hq_id === 'hq-shahdol') ||
    (activeHq.id === 'HQ-KOT-001' && a.hq_id === 'hq-kotma') ||
    (activeHq.id === 'HQ-AMB-001' && a.hq_id === 'hq-ambikapur') ||
    (activeHq.id === 'HQ-BSP-001' && a.hq_id === 'hq-bilaspur')
  );

  
  const filteredSubAreas = hqSubAreas.filter((a) =>
    a.name.toLowerCase().includes(areaSearch.toLowerCase())
  );

  
  const handleAddHq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHqName.trim()) {
      showNotice('error', 'Headquarters name is required.');
      return;
    }

    const name = newHqName.trim();
    const code = (newHqCode.trim() || `HQ-${name.substring(0, 3).toUpperCase()}`).toUpperCase();
    const state = newHqState.trim() || 'Madhya Pradesh';
    const id = `hq-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    
    const resolvedCoords = (newHqLat && newHqLng && !isNaN(Number(newHqLat)) && !isNaN(Number(newHqLng)))
      ? { lat: Number(newHqLat), lng: Number(newHqLng) }
      : (findKnownCityCoordinates(name) || { lat: 23.2953, lng: 81.3586 });

    try {
      await fetch(`${apiUrl}/inventory/hqs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, code, state, latitude: resolvedCoords.lat, longitude: resolvedCoords.lng }),
      });
    } catch {}

    const newHqObj: HeadquarterItem = {
      id,
      name,
      code,
      state,
      status: 'ACTIVE',
      latitude: resolvedCoords.lat,
      longitude: resolvedCoords.lng,
    };
    
    const updated = [...hqs.filter((h) => h.id !== id && h.name.toLowerCase().trim() !== name.toLowerCase().trim()), newHqObj];
    persistHqs(updated);
    setSelectedHqId(id);

    
    try {
      const citiesRaw = localStorage.getItem('ahtri_operating_cities');
      const cities = citiesRaw ? JSON.parse(citiesRaw) : [];
      const filteredCities = Array.isArray(cities)
        ? cities.filter((c: any) => (c.cityName || c.name || '').toLowerCase().trim() !== name.toLowerCase().trim())
        : [];
      filteredCities.push({
        id: `city-${Date.now()}`,
        cityName: name,
        state,
        country: 'India',
        latitude: resolvedCoords.lat,
        longitude: resolvedCoords.lng,
        radiusKm: 25,
        isHeadquarters: false,
        branchType: 'HEADQUARTERS',
      });
      localStorage.setItem('ahtri_operating_cities', JSON.stringify(filteredCities));
    } catch {}

    setIsAddHqModalOpen(false);
    setNewHqName('');
    setNewHqCode('');
    setNewHqState('');
    setNewHqLat('');
    setNewHqLng('');
    showNotice('success', `Headquarters "${name}" created at coordinates [${resolvedCoords.lat.toFixed(4)}, ${resolvedCoords.lng.toFixed(4)}]!`);
  };

  const handleOpenEditHq = (hq: HeadquarterItem) => {
    setEditingHq(hq);
    setEditHqName(hq.name);
    setEditHqCode(hq.code);
    setEditHqState(hq.state);
    const defaultCoords = findKnownCityCoordinates(hq.name);
    const lat = typeof hq.latitude === 'number' ? hq.latitude : (defaultCoords?.lat ?? 23.2953);
    const lng = typeof hq.longitude === 'number' ? hq.longitude : (defaultCoords?.lng ?? 81.3586);
    setEditHqLat(lat.toFixed(4));
    setEditHqLng(lng.toFixed(4));
  };

  const handleSaveEditHq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHq || !editHqName.trim()) return;

    const name = editHqName.trim();
    const code = (editHqCode.trim() || `HQ-${name.substring(0, 3).toUpperCase()}`).toUpperCase();
    const state = editHqState.trim();
    const resolvedCoords = (editHqLat && editHqLng && !isNaN(Number(editHqLat)) && !isNaN(Number(editHqLng)))
      ? { lat: Number(editHqLat), lng: Number(editHqLng) }
      : (findKnownCityCoordinates(name) || { lat: 23.2953, lng: 81.3586 });

    try {
      await fetch(`${apiUrl}/inventory/hqs/${editingHq.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, code, state, latitude: resolvedCoords.lat, longitude: resolvedCoords.lng }),
      });
    } catch {}

    const updated = hqs.map((h) =>
      h.id === editingHq.id ? { ...h, name, code, state, latitude: resolvedCoords.lat, longitude: resolvedCoords.lng } : h
    );
    persistHqs(updated);

    
    try {
      const citiesRaw = localStorage.getItem('ahtri_operating_cities');
      if (citiesRaw) {
        const cities = JSON.parse(citiesRaw);
        if (Array.isArray(cities)) {
          const updatedCities = cities.map((c: any) => {
            const cName = (c.cityName || c.name || '').toLowerCase().trim();
            if (cName === editingHq.name.toLowerCase().trim() || cName === name.toLowerCase().trim()) {
              return { ...c, cityName: name, name, state, latitude: resolvedCoords.lat, longitude: resolvedCoords.lng };
            }
            return c;
          });
          localStorage.setItem('ahtri_operating_cities', JSON.stringify(updatedCities));
        }
      }
    } catch {}

    setEditingHq(null);
    showNotice('success', `Headquarters "${name}" updated successfully!`);
  };

  const handleDeleteHq = async (hqId: string) => {
    const target = hqs.find((h) => h.id === hqId);
    if (!target) return;
    if (hqs.length <= 1) {
      showNotice('error', 'Cannot delete the only remaining Headquarters.');
      return;
    }

    const ok = await showConfirmModal({
      title: `Delete Headquarters "${target.name}"`,
      message: `Are you sure you want to delete Headquarters "${target.name}"?\n\nSub-areas and territory records associated with this HQ will also be removed.`,
      isDestructive: true,
      confirmText: 'Yes, Delete Headquarters',
      cancelText: 'Cancel',
    });
    if (!ok) {
      return;
    }

    try {
      await fetch(`${apiUrl}/inventory/hqs/${hqId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}

    const updatedHqs = hqs.filter((h) => h.id !== hqId);
    const updatedAreas = areas.filter((a) => a.hq_id !== hqId);
    persistHqs(updatedHqs);
    persistAreas(updatedAreas);

    
    try {
      const citiesRaw = localStorage.getItem('ahtri_operating_cities');
      if (citiesRaw) {
        const cities = JSON.parse(citiesRaw);
        if (Array.isArray(cities)) {
          const filtered = cities.filter(
            (c: any) => (c.cityName || c.name || '').toLowerCase().trim() !== target.name.toLowerCase().trim()
          );
          localStorage.setItem('ahtri_operating_cities', JSON.stringify(filtered));
        }
      }
    } catch {}

    if (selectedHqId === hqId) {
      setSelectedHqId(updatedHqs[0].id);
    }
    showNotice('success', `Headquarters "${target.name}" deleted.`);
  };

  
  const handleAddSingleArea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAreaName.trim()) {
      showNotice('error', 'Sub-area / village name cannot be empty.');
      return;
    }

    const name = newAreaName.trim();
    
    if (hqSubAreas.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      showNotice('error', `Sub-area "${name}" already exists under ${activeHq.name}.`);
      return;
    }

    const id = `area-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    try {
      await fetch(`${apiUrl}/inventory/areas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hq_id: activeHq.id, name }),
      });
    } catch {}

    const newAreaObj: SubAreaItem = {
      id,
      hq_id: activeHq.id,
      name,
      status: 'ACTIVE',
    };

    const updated = [...areas, newAreaObj];
    persistAreas(updated);
    setNewAreaName('');
    showNotice('success', `Added sub-area "${name}" to ${activeHq.name}!`);
  };

  const handleBulkAddAreas = async () => {
    if (!bulkAreaText.trim()) return;

    const names = bulkAreaText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (names.length === 0) return;

    const existingNames = new Set(hqSubAreas.map((a) => a.name.toLowerCase()));
    const toAdd = names.filter((n) => !existingNames.has(n.toLowerCase()));

    if (toAdd.length === 0) {
      showNotice('error', 'All listed sub-areas already exist under this HQ.');
      return;
    }

    try {
      await fetch(`${apiUrl}/inventory/areas/sync`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hq_id: activeHq.id, areas: toAdd }),
      });
    } catch {}

    const newItems: SubAreaItem[] = toAdd.map((name) => ({
      id: `area-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      hq_id: activeHq.id,
      name,
      status: 'ACTIVE',
    }));

    const updated = [...areas, ...newItems];
    persistAreas(updated);
    setBulkAreaText('');
    setIsBulkOpen(false);
    showNotice('success', `Successfully added ${toAdd.length} sub-areas to ${activeHq.name}!`);
  };

  const handleStartEditArea = (area: SubAreaItem) => {
    setEditingAreaId(area.id);
    setEditingAreaName(area.name);
  };

  const handleSaveEditArea = async (areaId: string) => {
    if (!editingAreaName.trim()) return;
    const name = editingAreaName.trim();

    try {
      await fetch(`${apiUrl}/inventory/areas/${areaId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
    } catch {}

    const updated = areas.map((a) => (a.id === areaId ? { ...a, name } : a));
    persistAreas(updated);
    setEditingAreaId(null);
    setEditingAreaName('');
    showNotice('success', `Renamed sub-area to "${name}".`);
  };

  const handleReassignHq = async (areaId: string, targetHqId: string) => {
    const targetHq = hqs.find((h) => h.id === targetHqId);
    if (!targetHq) return;

    try {
      await fetch(`${apiUrl}/inventory/areas/${areaId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hq_id: targetHqId }),
      });
    } catch {}

    const updated = areas.map((a) => (a.id === areaId ? { ...a, hq_id: targetHqId } : a));
    persistAreas(updated);
    showNotice('success', `Reassigned sub-area to "${targetHq.name}".`);
  };

  const handleDeleteArea = async (areaId: string) => {
    const target = areas.find((a) => a.id === areaId);
    const ok = await showConfirmModal({
      title: `Delete Sub-Area "${target.name}"`,
      message: `Are you sure you want to delete sub-area "${target.name}"?\n\nThis action cannot be undone.`,
      isDestructive: true,
      confirmText: 'Delete Sub-Area',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    try {
      await fetch(`${apiUrl}/inventory/areas/${areaId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}

    const updated = areas.filter((a) => a.id !== areaId);
    persistAreas(updated);
    showNotice('success', `Removed sub-area "${target.name}".`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div className="enterprise-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={22} color="#1A3C6E" />
              HQ & Territory Sub-Areas Management
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
              Configure and map which villages, tehsils, and sub-areas belong to each Headquarters. The Mobile Tour Plan and Stocker allocations strictly filter available areas based on this hierarchy.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchBackendData}
              disabled={isLoading}
              className="btn-enterprise secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: '700',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddHqModalOpen(true)}
              className="btn-enterprise primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: '700',
              }}
            >
              <Plus size={16} />
              <span>Add Headquarters</span>
            </button>
          </div>
        </div>

        {notice && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: notice.type === 'success' ? '#DCFCE7' : '#FEE2E2',
              color: notice.type === 'success' ? '#166534' : '#991B1B',
              border: `1px solid ${notice.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            }}
          >
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notice.message}</span>
          </div>
        )}
      </div>

      {/* Main Responsive Hierarchy View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Headquarters List */}
        <div className="enterprise-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={16} color="#1A3C6E" />
              Headquarters ({hqs.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Select to edit areas</span>
          </div>

          {/* Search HQs */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              value={hqSearch}
              onChange={(e) => setHqSearch(e.target.value)}
              placeholder="Search HQ, state, or code..."
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                boxSizing: 'border-box',
                background: '#FAFAFA',
              }}
            />
          </div>

          {/* HQ Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '580px', overflowY: 'auto' }}>
            {filteredHqs.map((hq) => {
              const isSelected = hq.id === activeHq.id;
              const subCount = areas.filter((a) => a.hq_id === hq.id).length;
              return (
                <div
                  key={hq.id}
                  onClick={() => setSelectedHqId(hq.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #1A3C6E' : '1px solid #E2E8F0',
                    background: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    boxShadow: isSelected ? '0 2px 8px rgba(26,60,110,0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? '#1A3C6E' : '#0F172A' }}>
                          {hq.name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isSelected ? '#DBEAFE' : '#F1F5F9',
                            color: isSelected ? '#1E40AF' : '#475569',
                          }}
                        >
                          {hq.code}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                        {hq.state || 'Madhya Pradesh'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditHq(hq);
                        }}
                        className="btn-icon-subtle"
                        title="Edit HQ Name / State"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHq(hq.id);
                        }}
                        className="btn-icon-danger"
                        title="Delete HQ"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: isSelected ? '#0369A1' : '#475569' }}>
                      📍 {subCount} Sub-Areas
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#1A3C6E', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        Active Selection <Check size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sub-Areas for Selected HQ */}
        <div className="enterprise-panel" style={{ padding: '22px' }}>
          {/* Active HQ Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: '#1A3C6E',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} color="#93C5FD" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  {activeHq.name} Headquarters
                </h3>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                  {activeHq.code}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#BFDBFE' }}>
                State: {activeHq.state || 'Madhya Pradesh'} • {hqSubAreas.length} Planned Sub-Areas Mapped
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsBulkOpen(!isBulkOpen)}
                style={{
                  background: isBulkOpen ? '#FFFFFF' : 'rgba(255,255,255,0.18)',
                  color: isBulkOpen ? '#1A3C6E' : '#FFFFFF',
                  border: isBulkOpen ? '1px solid #FFFFFF' : '1px solid rgba(255,255,255,0.4)',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isBulkOpen) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.color = '#FFFFFF';
                  } else {
                    e.currentTarget.style.background = '#F1F5F9';
                    e.currentTarget.style.color = '#0F172A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isBulkOpen) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                    e.currentTarget.style.color = '#FFFFFF';
                  } else {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.color = '#1A3C6E';
                  }
                }}
              >
                <Upload size={14} />
                <span>{isBulkOpen ? 'Close Bulk Paste' : 'Bulk Paste Villages'}</span>
              </button>
            </div>
          </div>

          {/* Bulk Paste Box */}
          {isBulkOpen && (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: '#F8FAFC',
                border: '1.5px dashed #94A3B8',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                  Paste Villages / Sub-Areas for {activeHq.name}:
                </span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Separate with commas or new lines</span>
              </div>
              <textarea
                value={bulkAreaText}
                onChange={(e) => setBulkAreaText(e.target.value)}
                placeholder="e.g. Buhar, Gohparu, Beohari, Jaisinghnagar, Sohagpur, Singhpur..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="btn-enterprise secondary"
                  style={{
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddAreas}
                  className="btn-enterprise success"
                  style={{
                    padding: '7px 18px',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  Import All to {activeHq.name}
                </button>
              </div>
            </div>
          )}

          {/* Quick Add Area Input Bar */}
          <form onSubmit={handleAddSingleArea} style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder={`Enter new village / sub-area name for ${activeHq.name} (e.g. Gohparu)...`}
              style={{
                flex: '1 1 200px',
                minWidth: '180px',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              className="btn-enterprise success"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
              }}
            >
              <Plus size={16} />
              <span>Add Sub-Area</span>
            </button>
          </form>

          {/* Sub-Areas Table Header & Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                Mapped Sub-Areas ({filteredSubAreas.length})
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Only these areas will show when MR selects {activeHq.name} HQ in Tour Plan
              </span>
            </div>

            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '8px', top: '9px' }} />
              <input
                type="text"
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
                placeholder="Filter sub-areas..."
                style={{
                  width: '100%',
                  padding: '6px 8px 6px 28px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Sub-Areas Grid / Table */}
          {filteredSubAreas.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                borderRadius: '8px',
                border: '1px dashed #CBD5E1',
                background: '#F8FAFC',
              }}
            >
              <MapPin size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                No sub-areas configured for {activeHq.name} yet.
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '380px', margin: '4px auto 14px auto' }}>
                Use the box above to enter village names, or click below to seed common villages for this district.
              </p>
              <button
                type="button"
                onClick={() => {
                  const demo = DEFAULT_MANAGED_AREAS.filter((a) => a.hq_id === activeHq.id);
                  if (demo.length > 0) {
                    persistAreas([...areas.filter((a) => a.hq_id !== activeHq.id), ...demo]);
                    showNotice('success', `Populated ${demo.length} default areas for ${activeHq.name}!`);
                  }
                }}
                className="btn-enterprise secondary"
                style={{
                  padding: '8px 18px',
                  borderColor: '#1A3C6E',
                  color: '#1A3C6E',
                  fontSize: '12.5px',
                  fontWeight: '700',
                }}
              >
                + Load Recommended District Villages
              </button>
            </div>
          ) : (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ minWidth: '520px', width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '38%' }}>Sub-Area / Village Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '22%' }}>Assigned HQ</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '25%' }}>Reassign / Move HQ</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', width: '15%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubAreas.map((area, index) => {
                    const isEditing = editingAreaId === area.id;
                    return (
                      <tr
                        key={area.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        }}
                      >
                        {/* Area Name / Inline Edit */}
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="text"
                                value={editingAreaName}
                                onChange={(e) => setEditingAreaName(e.target.value)}
                                autoFocus
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: '1.5px solid #1A3C6E',
                                  fontSize: '12.5px',
                                  width: '100%',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditArea(area.id)}
                                className="btn-enterprise success sm"
                                style={{ padding: '5px 8px' }}
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAreaId(null)}
                                className="btn-enterprise secondary sm"
                                style={{ padding: '5px 8px' }}
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', color: '#0F172A' }}>
                                {area.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditArea(area)}
                                className="btn-icon-subtle"
                                title="Rename Area"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Current HQ */}
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                            }}
                          >
                            {activeHq.name}
                          </span>
                        </td>

                        {/* Reassign HQ Dropdown */}
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CornerDownRight size={13} color="#64748B" />
                            <select
                              value={area.hq_id}
                              onChange={(e) => handleReassignHq(area.id, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '11.5px',
                                color: '#334155',
                                background: '#FFFFFF',
                                cursor: 'pointer',
                              }}
                            >
                              {hqs.map((h) => (
                                <option key={h.id} value={h.id}>
                                  Move to {h.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteArea(area.id)}
                            className="btn-icon-danger"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              gap: '4px',
                            }}
                            title="Delete Sub-Area"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add HQ Modal */}
      {isAddHqModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="enterprise-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              background: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} color="#1A3C6E" />
                Add New Headquarters
              </h3>
              <button
                type="button"
                onClick={() => setIsAddHqModalOpen(false)}
                className="btn-icon-subtle"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddHq} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Headquarters Name *
                </label>
                <input
                  type="text"
                  value={newHqName}
                  onChange={(e) => handleNewHqNameChange(e.target.value)}
                  placeholder="e.g. Shahdol, Ambikapur, Bilaspur, Rewa..."
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  HQ Code (Optional)
                </label>
                <input
                  type="text"
                  value={newHqCode}
                  onChange={(e) => setNewHqCode(e.target.value)}
                  placeholder="e.g. HQ-SHD (auto-generated if empty)"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  State *
                </label>
                <input
                  type="text"
                  value={newHqState}
                  onChange={(e) => setNewHqState(e.target.value)}
                  placeholder="e.g. Madhya Pradesh, Chhattisgarh..."
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    Geographic Coordinates (Lat / Lng)
                  </label>
                  <button
                    type="button"
                    onClick={() => detectCoordinates(newHqName, 'new')}
                    disabled={isDetectingNewCoords || !newHqName.trim()}
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: newHqName.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Compass size={12} />
                    <span>{isDetectingNewCoords ? 'Detecting...' : 'Auto-Detect Location'}</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    step="any"
                    value={newHqLat}
                    onChange={(e) => setNewHqLat(e.target.value)}
                    placeholder="Latitude (e.g. 24.5362)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="number"
                    step="any"
                    value={newHqLng}
                    onChange={(e) => setNewHqLng(e.target.value)}
                    placeholder="Longitude (e.g. 81.3037)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '3px' }}>
                  Recognizes specific region GPS so the HQ map and task pins mark the true area, not defaulting to Shahdol.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddHqModalOpen(false)}
                  className="btn-enterprise secondary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-enterprise primary"
                  style={{
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: '700',
                  }}
                >
                  Create HQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit HQ Modal */}
      {editingHq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="enterprise-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              background: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#1A3C6E" />
                Edit Headquarters: {editingHq.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingHq(null)}
                className="btn-icon-subtle"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditHq} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Headquarters Name *
                </label>
                <input
                  type="text"
                  value={editHqName}
                  onChange={(e) => setEditHqName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  HQ Code
                </label>
                <input
                  type="text"
                  value={editHqCode}
                  onChange={(e) => setEditHqCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  State *
                </label>
                <input
                  type="text"
                  value={editHqState}
                  onChange={(e) => setEditHqState(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    Geographic Coordinates (Lat / Lng)
                  </label>
                  <button
                    type="button"
                    onClick={() => detectCoordinates(editHqName, 'edit')}
                    disabled={isDetectingEditCoords || !editHqName.trim()}
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: editHqName.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Compass size={12} />
                    <span>{isDetectingEditCoords ? 'Detecting...' : 'Auto-Detect Location'}</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    step="any"
                    value={editHqLat}
                    onChange={(e) => setEditHqLat(e.target.value)}
                    placeholder="Latitude (e.g. 23.2035)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="number"
                    step="any"
                    value={editHqLng}
                    onChange={(e) => setEditHqLng(e.target.value)}
                    placeholder="Longitude (e.g. 81.9669)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingHq(null)}
                  className="btn-enterprise secondary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-enterprise primary"
                  style={{
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: '700',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
