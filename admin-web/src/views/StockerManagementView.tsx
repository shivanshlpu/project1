import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Building,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  X,
  Calendar,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import { syncInStockFromInventoryItems, syncInStockProductsWithBackend } from '../utils/inventoryStore';

interface Headquarter {
  id: string;
  name: string;
  code?: string;
  state?: string;
  isHeadquarters?: boolean;
}

const DEFAULT_HQS: Headquarter[] = [
  { id: 'hq-shahdol', name: 'Shahdol', code: 'HQ-SHD', state: 'Madhya Pradesh' },
  { id: 'hq-ambikapur', name: 'Ambikapur', code: 'HQ-AMB', state: 'Chhattisgarh' },
  { id: 'hq-bilaspur', name: 'Bilaspur', code: 'HQ-BSP', state: 'Chhattisgarh' },
  { id: 'hq-kotma', name: 'Kotma', code: 'HQ-KTM', state: 'Madhya Pradesh' },
];

export const DEFAULT_HQ_AREAS_MAP: Record<string, string[]> = {
  'hq-shahdol': [
    'Shahdol Central',
    'Burhar',
    'Gohparu',
    'Beohari',
    'Jaisinghnagar',
    'Sohagpur',
    'Singhpur',
    'Amdih',
    'Dhanpuri',
    'Amlai',
    'Janakpur Road',
    'Bakaho',
  ],
  'hq-ambikapur': [
    'Ambikapur Central',
    'Sitapur',
    'Lundra',
    'Batoli',
    'Mainpat',
    'Udaipur',
    'Lakhanpur',
    'Surguja',
    'Ramanujganj',
  ],
  'hq-bilaspur': [
    'Bilaspur City',
    'Kota',
    'Takhatpur',
    'Masturi',
    'Bilha',
    'Ratanpur',
    'Bodri',
    'Sakri',
  ],
  'hq-kotma': [
    'Kotma Town',
    'Anuppur',
    'Jaithari',
    'Bijuri',
    'Rajendragram',
    'Bhalumuda',
  ],
};

const NON_HQ_NAMES = new Set([
  'jaisinghnagar',
  'burhar',
  'bauhari',
  'burhar/bauhari',
  'gohparu',
  'beohari',
  'sohagpur',
  'singhpur',
  'amdih',
  'dhanpuri',
  'amlai',
  'janakpur road',
  'bakaho',
]);

const getMergedHqs = (): Headquarter[] => {
  const map = new Map<string, Headquarter>();
  for (const hq of DEFAULT_HQS) {
    map.set(hq.name.toLowerCase().trim(), { ...hq });
  }

  try {
    const saved = localStorage.getItem('ahtri_inventory_hqs');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.name) {
            const key = item.name.toLowerCase().trim();
            // Jaisinghnagar, Burhar etc. are sub-areas, never HQs
            if (NON_HQ_NAMES.has(key)) continue;
            map.set(key, {
              id: item.id || `hq-${key.replace(/[^a-z0-9]/g, '-')}`,
              name: item.name.trim(),
              code: item.code || `HQ-${item.name.substring(0, 3).toUpperCase()}`,
              state: item.state || '',
              isHeadquarters: !!item.isHeadquarters,
            });
          }
        }
      }
    }
  } catch {}

  try {
    const savedCities = localStorage.getItem('ahtri_operating_cities');
    if (savedCities) {
      const parsed = JSON.parse(savedCities);
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          const name = c.cityName || c.name;
          if (name) {
            const key = name.toLowerCase().trim();
            if (NON_HQ_NAMES.has(key)) continue;
            const isHq = !!c.isHeadquarters || c.branchType === 'HEADQUARTERS';
            if (!isHq) continue; // Only actual HQs should be merged
            const existing = map.get(key);
            map.set(key, {
              id: existing?.id || (c.id && c.id.startsWith('hq-') ? c.id : `hq-${key.replace(/[^a-z0-9]/g, '-')}`),
              name: name.trim(),
              code: existing?.code || `HQ-${name.substring(0, 3).toUpperCase()}`,
              state: c.state || existing?.state || '',
              isHeadquarters: isHq,
            });
          }
        }
      }
    }
  } catch {}

  return Array.from(map.values());
};

interface StockerItem {
  id: string;
  hq_id: string;
  hq_name: string;
  sub_area?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface MedicineItem {
  id: string;
  name: string;
  code?: string;
  product_code: string;
  unit: string;
  base_price: number;
  status?: string;
  is_active: boolean;
  low_stock_threshold: number;
}

interface StockerProductItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  medicine_code: string;
  unit: string;
  price: number;
  quantity: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  stocker_name: string;
  hq_name: string;
}

interface MonthlyStockEntryItem {
  id: string;
  hq_id: string;
  hq_name?: string;
  stocker_id: string;
  stocker_name?: string;
  month: string;
  entry_date: string;
  invoice_no?: string;
  medicine_id: string;
  medicine_name: string;
  medicine_code: string;
  quantity: number;
  unit: string;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
  user_name?: string;
  created_at: string;
}

interface InventoryAuditItem {
  id: string;
  hq_id: string;
  stocker_id: string;
  stocker_name?: string;
  product_id: string;
  product_name?: string;
  opening_stock: number;
  change_quantity: number;
  new_stock: number;
  transaction_type: string;
  order_id?: string;
  reason?: string;
  user_name: string;
  created_at: string;
}

export const StockerManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'MONTHLY_INWARD' | 'STOCKERS' | 'MEDICINES' | 'ALERTS' | 'AUDIT'>('INVENTORY');

  const initialHqs = getMergedHqs();
  const defaultSelectedHq = initialHqs.find((h) => h.isHeadquarters) || initialHqs[0];

  const [hqs, setHqs] = useState<Headquarter[]>(initialHqs);
  const [selectedHqId, setSelectedHqId] = useState<string>(defaultSelectedHq ? defaultSelectedHq.id : 'hq-shahdol');

  // HQ Modals state
  const [isAddHqModalOpen, setIsAddHqModalOpen] = useState<boolean>(false);
  const [isEditHqModalOpen, setIsEditHqModalOpen] = useState<boolean>(false);
  const [editingHq, setEditingHq] = useState<Headquarter | null>(null);
  const [newHqName, setNewHqName] = useState<string>('');
  const [newHqCode, setNewHqCode] = useState<string>('');
  const [newHqState, setNewHqState] = useState<string>('');
  const [editHqName, setEditHqName] = useState<string>('');
  const [editHqCode, setEditHqCode] = useState<string>('');
  const [editHqState, setEditHqState] = useState<string>('');

  // Stockers state
  const [stockers, setStockers] = useState<StockerItem[]>([]);
  const [selectedStockerId, setSelectedStockerId] = useState<string>('');
  const [selectedSubAreaFilter, setSelectedSubAreaFilter] = useState<string>('ALL');
  const [isAddStockerModalOpen, setIsAddStockerModalOpen] = useState<boolean>(false);
  const [newStockerHqId, setNewStockerHqId] = useState<string>(defaultSelectedHq ? defaultSelectedHq.id : 'hq-shahdol');
  const [newStockerSubArea, setNewStockerSubArea] = useState<string>('');
  const [newStockerName, setNewStockerName] = useState<string>('');
  const [newStockerContact, setNewStockerContact] = useState<string>('');
  const [newStockerPhone, setNewStockerPhone] = useState<string>('');
  const [newStockerAddress, setNewStockerAddress] = useState<string>('');

  // Edit Stocker Modal state
  const [isEditStockerModalOpen, setIsEditStockerModalOpen] = useState<boolean>(false);
  const [editingStocker, setEditingStocker] = useState<StockerItem | null>(null);
  const [editStockerSubArea, setEditStockerSubArea] = useState<string>('');
  const [editStockerName, setEditStockerName] = useState<string>('');
  const [editStockerContact, setEditStockerContact] = useState<string>('');
  const [editStockerPhone, setEditStockerPhone] = useState<string>('');
  const [editStockerAddress, setEditStockerAddress] = useState<string>('');
  const [editStockerStatus, setEditStockerStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Helper to dynamically resolve Sub-Areas / Markets for an HQ
  const getSubAreasForHq = (hqId: string): string[] => {
    const list: string[] = [];
    const normalizedHqId = (hqId || '').toLowerCase().trim();
    try {
      const raw = localStorage.getItem('ahtri_hq_subareas');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((a: any) => {
            if (a && a.name) {
              const matchesHq =
                a.hq_id === normalizedHqId ||
                (normalizedHqId.includes('shahdol') &&
                  (a.hq_id === 'hq-jaisinghnagar' || a.hq_id === 'hq-burhar'));
              if (matchesHq && !list.includes(a.name.trim())) {
                list.push(a.name.trim());
              }
            }
          });
        }
      }
    } catch {}

    const defaults = DEFAULT_HQ_AREAS_MAP[normalizedHqId] || [];
    defaults.forEach((d) => {
      if (!list.includes(d)) list.push(d);
    });
    return list;
  };

  // Inventory state
  const [inventory, setInventory] = useState<StockerProductItem[]>([]);
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState<boolean>(false);
  const [stockEditTarget, setStockEditTarget] = useState<StockerProductItem | null>(null);
  const [stockAdjustmentQty, setStockAdjustmentQty] = useState<string>('0');
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState<string>('Warehouse replenishment');

  // Monthly Stock Inward state
  const [monthlyEntries, setMonthlyEntries] = useState<MonthlyStockEntryItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [inwardDate, setInwardDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [inwardInvoiceNo, setInwardInvoiceNo] = useState<string>('');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('');
  const [inwardQuantity, setInwardQuantity] = useState<string>('50');
  const [inwardBatchNo, setInwardBatchNo] = useState<string>('');
  const [inwardExpiryDate, setInwardExpiryDate] = useState<string>('');
  const [inwardNotes, setInwardNotes] = useState<string>('');
  const [isSubmittingInward, setIsSubmittingInward] = useState<boolean>(false);
  const [inwardSuccessMsg, setInwardSuccessMsg] = useState<string>('');
  const [monthlyFilterMonth, setMonthlyFilterMonth] = useState<string>('ALL');

  // Medicines state
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState<boolean>(false);
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedCode, setNewMedCode] = useState<string>('');
  const [newMedUnit, setNewMedUnit] = useState<string>('Strip of 10');
  const [newMedPrice, setNewMedPrice] = useState<string>('150');
  const [newMedThreshold, setNewMedThreshold] = useState<string>('15');

  // Edit Medicine Modal state
  const [isEditMedicineModalOpen, setIsEditMedicineModalOpen] = useState<boolean>(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);
  const [editMedName, setEditMedName] = useState<string>('');
  const [editMedCode, setEditMedCode] = useState<string>('');
  const [editMedUnit, setEditMedUnit] = useState<string>('Strip of 10');
  const [editMedPrice, setEditMedPrice] = useState<string>('150');
  const [editMedThreshold, setEditMedThreshold] = useState<string>('15');
  const [editMedStatus, setEditMedStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Alerts & Audit
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<InventoryAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isSubmittingStocker, setIsSubmittingStocker] = useState<boolean>(false);
  const [stockerModalError, setStockerModalError] = useState<string>('');

  const getApiUrl = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:3000';
    }
    return (
      (import.meta as any).env?.VITE_API_URL ||
      localStorage.getItem('ahtri_backend_url') ||
      'http://localhost:3000'
    );
  };
  const apiUrl = getApiUrl();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Load HQs on mount and sync with settings
  const fetchHqs = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/hqs`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const current = getMergedHqs();
          const map = new Map<string, Headquarter>();
          current.forEach((h) => map.set(h.name.toLowerCase().trim(), h));
          data.forEach((h: any) => {
            const key = h.name.toLowerCase().trim();
            if (NON_HQ_NAMES.has(key)) return;
            const existing = map.get(key);
            map.set(key, {
              id: h.id,
              name: h.name,
              code: h.code || `HQ-${h.name.substring(0, 3).toUpperCase()}`,
              state: h.state || '',
              isHeadquarters: existing?.isHeadquarters || false,
            });
          });
          const merged = Array.from(map.values());
          setHqs(merged);
          try {
            localStorage.setItem('ahtri_inventory_hqs', JSON.stringify(merged));
          } catch {}
          return;
        }
      }
    } catch {}
    const merged = getMergedHqs();
    setHqs(merged);
  };

  useEffect(() => {
    fetchHqs();

    const handleHqUpdate = () => {
      fetchHqs();
    };

    window.addEventListener('ahtri_hq_updated', handleHqUpdate);
    window.addEventListener('storage', handleHqUpdate);
    return () => {
      window.removeEventListener('ahtri_hq_updated', handleHqUpdate);
      window.removeEventListener('storage', handleHqUpdate);
    };
  }, [apiUrl]);

  // Load stockers when HQ changes (§10)
  const fetchStockers = async () => {
    if (!selectedHqId) return;

    let localForHq: StockerItem[] = [];
    try {
      const savedStkRaw = localStorage.getItem('ahtri_inventory_stockers');
      if (savedStkRaw) {
        const allSaved = JSON.parse(savedStkRaw);
        if (Array.isArray(allSaved)) {
          localForHq = allSaved.filter((s: any) => s.hq_id === selectedHqId);
        }
      }
    } catch {}

    try {
      const res = await fetch(`${apiUrl}/inventory/stockers?hq_id=${selectedHqId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const map = new Map<string, StockerItem>();
          localForHq.forEach((s) => map.set(s.id, s));
          data.forEach((s: any) => map.set(s.id, s));
          const merged = Array.from(map.values());
          setStockers(merged);
          if (merged.length > 0) {
            setSelectedStockerId((prev) => (merged.some((m) => m.id === prev) ? prev : merged[0].id));
          } else {
            setSelectedStockerId('');
            setInventory([]);
          }
          return;
        }
      }
    } catch {}

    if (localForHq.length > 0) {
      setStockers(localForHq);
      setSelectedStockerId((prev) => (localForHq.some((m) => m.id === prev) ? prev : localForHq[0].id));
    }
  };

  useEffect(() => {
    fetchStockers();
  }, [selectedHqId]);

  // Load stocker inventory when selectedStockerId changes (§12)
  const fetchInventory = async () => {
    if (!selectedStockerId) {
      setInventory([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/inventory/stockers/${selectedStockerId}/inventory`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInventory(data);
          syncInStockFromInventoryItems(data);
          syncInStockProductsWithBackend();
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedStockerId]);

  // Fetch medicines master (§11)
  const fetchMedicines = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/medicines`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMedicines(data);
          if (data.length > 0) {
            setSelectedMedicineId((prev) => prev || data[0].id);
          }
        }
      }
    } catch {}
  };

  // Fetch monthly inward records
  const fetchMonthlyEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedHqId) params.append('hq_id', selectedHqId);
      if (selectedStockerId) params.append('stocker_id', selectedStockerId);
      if (monthlyFilterMonth && monthlyFilterMonth !== 'ALL') {
        params.append('month', monthlyFilterMonth);
      }
      const res = await fetch(`${apiUrl}/inventory/monthly-entries?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMonthlyEntries(data);
        }
      }
    } catch {}
  };

  // Fetch alerts (§18)
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/alerts`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      }
    } catch {}
  };

  // Fetch audit trail (§19)
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/transactions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAuditLogs(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'MEDICINES' || activeTab === 'MONTHLY_INWARD') fetchMedicines();
    if (activeTab === 'MONTHLY_INWARD') fetchMonthlyEntries();
    if (activeTab === 'ALERTS') fetchAlerts();
    if (activeTab === 'AUDIT') fetchAuditLogs();
  }, [activeTab, selectedHqId, selectedStockerId, monthlyFilterMonth]);

  // === HQ CRUD HANDLERS ===
  const handleAddHq = async () => {
    if (!newHqName.trim()) {
      alert('Please enter Headquarters name.');
      return;
    }
    const name = newHqName.trim();
    const code = (newHqCode.trim() || `HQ-${name.substring(0, 3).toUpperCase()}`).toUpperCase();
    const state = newHqState.trim() || 'Madhya Pradesh';
    let createdId = `hq-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    try {
      const res = await fetch(`${apiUrl}/inventory/hqs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, code, state }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) createdId = data.id;
      }
    } catch {}

    const newHqObj: Headquarter = { id: createdId, name, code, state };
    const updated = [...hqs.filter((h) => h.name.toLowerCase() !== name.toLowerCase()), newHqObj];
    setHqs(updated);
    setSelectedHqId(createdId);
    setNewStockerHqId(createdId);
    try {
      localStorage.setItem('ahtri_inventory_hqs', JSON.stringify(updated));
      const citiesRaw = localStorage.getItem('ahtri_operating_cities');
      const cities = citiesRaw ? JSON.parse(citiesRaw) : [];
      if (!cities.some((c: any) => (c.cityName || c.name || '').toLowerCase() === name.toLowerCase())) {
        cities.push({
          id: `city-${Date.now()}`,
          cityName: name,
          state,
          country: 'India',
          latitude: 23.29,
          longitude: 81.35,
          radiusKm: 25,
          isHeadquarters: false,
          branchType: 'HEADQUARTERS',
        });
        localStorage.setItem('ahtri_operating_cities', JSON.stringify(cities));
      }
    } catch {}

    setIsAddHqModalOpen(false);
    setNewHqName('');
    setNewHqCode('');
    setNewHqState('');
  };

  const handleOpenEditHq = (hq: Headquarter) => {
    setEditingHq(hq);
    setEditHqName(hq.name);
    setEditHqCode(hq.code || `HQ-${hq.name.substring(0, 3).toUpperCase()}`);
    setEditHqState(hq.state || '');
    setIsEditHqModalOpen(true);
  };

  const handleSaveEditHq = async () => {
    if (!editingHq || !editHqName.trim()) return;
    const name = editHqName.trim();
    const code = (editHqCode.trim() || `HQ-${name.substring(0, 3).toUpperCase()}`).toUpperCase();
    const state = editHqState.trim();

    try {
      await fetch(`${apiUrl}/inventory/hqs/${editingHq.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, code, state }),
      });
    } catch {}

    const updated = hqs.map((h) => (h.id === editingHq.id ? { ...h, name, code, state } : h));
    setHqs(updated);
    try {
      localStorage.setItem('ahtri_inventory_hqs', JSON.stringify(updated));
    } catch {}

    setIsEditHqModalOpen(false);
    setEditingHq(null);
  };

  const handleDeleteHq = async (hqId: string) => {
    const target = hqs.find((h) => h.id === hqId);
    if (!target) return;
    if (hqs.length <= 1) {
      alert('At least one headquarters must remain configured.');
      return;
    }
    if (!confirm(`Are you sure you want to delete headquarters "${target.name}"? Stockers under this HQ will be removed.`)) {
      return;
    }

    try {
      await fetch(`${apiUrl}/inventory/hqs/${hqId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}

    const updated = hqs.filter((h) => h.id !== hqId);
    setHqs(updated);
    try {
      localStorage.setItem('ahtri_inventory_hqs', JSON.stringify(updated));
    } catch {}

    if (selectedHqId === hqId && updated.length > 0) {
      setSelectedHqId(updated[0].id);
      setNewStockerHqId(updated[0].id);
    }
  };

  // === STOCKER CRUD HANDLERS ===
  const handleAddStocker = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStockerName.trim()) {
      setStockerModalError('Please enter stocker or shop name.');
      return;
    }
    const targetHqId = newStockerHqId || selectedHqId;
    const targetHq = hqs.find((h) => h.id === targetHqId);
    setIsSubmittingStocker(true);
    setStockerModalError('');

    const newStkLocal: StockerItem = {
      id: `stk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      hq_id: targetHqId,
      hq_name: targetHq?.name || 'HQ',
      sub_area: newStockerSubArea.trim() || undefined,
      name: newStockerName.trim(),
      contact_person: newStockerContact.trim(),
      phone: newStockerPhone.trim(),
      address: newStockerAddress.trim(),
      status: 'ACTIVE',
    };

    try {
      const res = await fetch(`${apiUrl}/inventory/stockers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hq_id: targetHqId,
          sub_area: newStockerSubArea.trim() || undefined,
          name: newStockerName.trim(),
          contact_person: newStockerContact.trim(),
          phone: newStockerPhone.trim(),
          address: newStockerAddress.trim(),
        }),
      });

      if (res.ok) {
        const saved = await res.json().catch(() => null);
        if (saved && saved.id) {
          newStkLocal.id = saved.id;
        }
      }
    } catch (err: any) {
      console.warn('Network sync failed, saving locally:', err);
    } finally {
      try {
        const savedStkRaw = localStorage.getItem('ahtri_inventory_stockers');
        const savedList: StockerItem[] = savedStkRaw ? JSON.parse(savedStkRaw) : [];
        const updatedList = [newStkLocal, ...savedList.filter((s) => s.id !== newStkLocal.id)];
        localStorage.setItem('ahtri_inventory_stockers', JSON.stringify(updatedList));
      } catch {}

      setIsSubmittingStocker(false);
      setIsAddStockerModalOpen(false);
      setStockerModalError('');
      setNewStockerName('');
      setNewStockerSubArea('');
      setNewStockerContact('');
      setNewStockerPhone('');
      setNewStockerAddress('');

      if (selectedHqId !== targetHqId) {
        setSelectedHqId(targetHqId);
      } else {
        await fetchStockers();
      }
      setSelectedStockerId(newStkLocal.id);
    }
  };

  const handleOpenEditStocker = (st: StockerItem) => {
    setEditingStocker(st);
    setEditStockerName(st.name);
    setEditStockerSubArea(st.sub_area || '');
    setEditStockerContact(st.contact_person || '');
    setEditStockerPhone(st.phone || '');
    setEditStockerAddress(st.address || '');
    setEditStockerStatus(st.status || 'ACTIVE');
    setIsEditStockerModalOpen(true);
  };

  const handleSaveEditStocker = async () => {
    if (!editingStocker || !editStockerName.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/inventory/stockers/${editingStocker.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editStockerName.trim(),
          sub_area: editStockerSubArea.trim() || undefined,
          contact_person: editStockerContact.trim(),
          phone: editStockerPhone.trim(),
          address: editStockerAddress.trim(),
          status: editStockerStatus,
        }),
      });
      if (res.ok) {
        try {
          const savedStkRaw = localStorage.getItem('ahtri_inventory_stockers');
          if (savedStkRaw) {
            const list: StockerItem[] = JSON.parse(savedStkRaw);
            const idx = list.findIndex((s) => s.id === editingStocker.id);
            if (idx >= 0) {
              list[idx] = {
                ...list[idx],
                name: editStockerName.trim(),
                sub_area: editStockerSubArea.trim() || undefined,
                contact_person: editStockerContact.trim(),
                phone: editStockerPhone.trim(),
                address: editStockerAddress.trim(),
                status: editStockerStatus,
              };
              localStorage.setItem('ahtri_inventory_stockers', JSON.stringify(list));
            }
          }
        } catch {}

        setIsEditStockerModalOpen(false);
        setEditingStocker(null);
        fetchStockers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to update stocker.');
      }
    } catch (err: any) {
      alert('Error updating stocker: ' + err.message);
    }
  };

  const handleDeleteStocker = async (stockerId: string) => {
    const target = stockers.find((s) => s.id === stockerId);
    if (!target) return;
    if (!confirm(`Are you sure you want to delete stocker "${target.name}"?`)) return;

    try {
      const res = await fetch(`${apiUrl}/inventory/stockers/${stockerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (selectedStockerId === stockerId) {
          setSelectedStockerId('');
          setInventory([]);
        }
        fetchStockers();
      }
    } catch {}
  };

  // === MEDICINE CRUD HANDLERS ===
  const handleAddMedicine = async () => {
    if (!newMedName.trim()) {
      alert('Please enter medicine name.');
      return;
    }
    const code = (newMedCode.trim() || `MED-${Date.now().toString().slice(-4)}`).toUpperCase();
    try {
      const res = await fetch(`${apiUrl}/inventory/medicines`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newMedName.trim(),
          code: code,
          product_code: code,
          unit: newMedUnit.trim(),
          base_price: parseFloat(newMedPrice) || 100,
          low_stock_threshold: parseInt(newMedThreshold) || 10,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setIsAddMedicineModalOpen(false);
        setNewMedName('');
        setNewMedCode('');
        await fetchMedicines();
        if (saved && saved.id) {
          setSelectedMedicineId(saved.id);
        }
        if (selectedStockerId) fetchInventory();
        syncInStockProductsWithBackend();
        setInwardSuccessMsg(`✨ New medicine "${saved.name || newMedName}" added to catalog and selected!`);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add medicine.');
      }
    } catch (err: any) {
      alert('Error creating medicine: ' + err.message);
    }
  };

  const handleOpenEditMedicine = (med: MedicineItem) => {
    setEditingMedicine(med);
    setEditMedName(med.name);
    setEditMedCode(med.product_code || med.code || '');
    setEditMedUnit(med.unit || 'Strip of 10');
    setEditMedPrice(String(med.base_price || 100));
    setEditMedThreshold(String(med.low_stock_threshold || 10));
    setEditMedStatus(med.is_active ? 'ACTIVE' : 'INACTIVE');
    setIsEditMedicineModalOpen(true);
  };

  const handleSaveEditMedicine = async () => {
    if (!editingMedicine || !editMedName.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/inventory/medicines/${editingMedicine.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editMedName.trim(),
          code: (editMedCode.trim() || editingMedicine.code || '').toUpperCase(),
          unit: editMedUnit.trim(),
          base_price: parseFloat(editMedPrice) || 100,
          status: editMedStatus,
        }),
      });
      if (res.ok) {
        setIsEditMedicineModalOpen(false);
        setEditingMedicine(null);
        fetchMedicines();
        if (selectedStockerId) fetchInventory();
        syncInStockProductsWithBackend();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to update medicine.');
      }
    } catch (err: any) {
      alert('Error updating medicine: ' + err.message);
    }
  };

  const handleDeleteMedicine = async (medId: string) => {
    const target = medicines.find((m) => m.id === medId);
    if (!target) return;
    if (!confirm(`Are you sure you want to delete "${target.name}" from the master catalog?`)) return;

    try {
      const res = await fetch(`${apiUrl}/inventory/medicines/${medId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchMedicines();
        if (selectedStockerId) fetchInventory();
        syncInStockProductsWithBackend();
      }
    } catch {}
  };

  // Handler: Save Monthly Stock Inward Entry
  const handleSaveMonthlyInward = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedHqId) {
      alert('Please select a Headquarters (HQ) first.');
      return;
    }
    if (!selectedStockerId) {
      alert('Please select a Stocker under the selected HQ.');
      return;
    }
    if (!selectedMedicineId) {
      alert('Please select a medicine or add a new medicine first.');
      return;
    }
    const qty = parseInt(inwardQuantity);
    if (!qty || qty <= 0) {
      alert('Please enter a valid incoming quantity (e.g. 50, 100).');
      return;
    }

    setIsSubmittingInward(true);
    setInwardSuccessMsg('');
    try {
      const res = await fetch(`${apiUrl}/inventory/monthly-entries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hq_id: selectedHqId,
          stocker_id: selectedStockerId,
          month: selectedMonth,
          entry_date: inwardDate,
          invoice_no: inwardInvoiceNo.trim(),
          medicine_id: selectedMedicineId,
          quantity: qty,
          batch_no: inwardBatchNo.trim(),
          expiry_date: inwardExpiryDate.trim(),
          notes: inwardNotes.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const medObj = medicines.find((m) => m.id === selectedMedicineId);
        const stObj = stockers.find((s) => s.id === selectedStockerId);
        setInwardSuccessMsg(
          `✅ Successfully recorded inward of +${qty} ${medObj?.unit || 'units'} of "${medObj?.name || 'Medicine'}" into ${stObj?.name || 'Stocker'} for ${selectedMonth}!`
        );
        fetchMonthlyEntries();
        fetchInventory();
        fetchAlerts();
        syncInStockProductsWithBackend();
        // Reset quantity & batch for quick sequential entries
        setInwardQuantity('50');
        setInwardBatchNo('');
        setInwardNotes('');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to record monthly inward entry.');
      }
    } catch (err: any) {
      alert('Error recording monthly inward entry: ' + err.message);
    } finally {
      setIsSubmittingInward(false);
    }
  };

  // Handler: Adjust Stock Quantity (§12, §13, §19)
  const handleSaveStockAdjustment = async () => {
    if (!stockEditTarget || !selectedStockerId) return;
    try {
      const res = await fetch(`${apiUrl}/inventory/stockers/${selectedStockerId}/adjust`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          medicine_id: stockEditTarget.medicine_id,
          quantity: parseInt(stockAdjustmentQty) || 0,
          transaction_type: 'ADJUSTMENT',
          reason: stockAdjustmentReason.trim(),
        }),
      });
      if (res.ok) {
        setIsUpdateStockModalOpen(false);
        setStockEditTarget(null);
        fetchInventory();
        fetchAlerts();
        syncInStockProductsWithBackend();
      }
    } catch {}
  };

  const selectedStocker = stockers.find((s) => s.id === selectedStockerId);
  const selectedHq = hqs.find((h) => h.id === selectedHqId);

  return (
    <div style={{ padding: '16px 14px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 260, flex: '1 1 280px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Boxes size={20} color="var(--color-brand)" style={{ flexShrink: 0 }} />
            <span>HQ Stocker &amp; Medicine Inventory</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Multi-HQ isolated inventory, medicine master catalog, real-time stock deduction, and shortage tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            className="btn-enterprise secondary"
            onClick={() => {
              fetchStockers();
              fetchInventory();
              fetchAlerts();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync Live Stock</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs - Smooth Horizontal Swipe on Mobile */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--color-surface-secondary)',
          padding: 4,
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid var(--color-border)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          flexWrap: 'nowrap',
          width: '100%',
        }}
      >
        <button
          onClick={() => setActiveTab('INVENTORY')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'INVENTORY' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'INVENTORY' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'INVENTORY' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Layers size={14} />
          <span>Stocker Inventory</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('MONTHLY_INWARD');
            fetchMedicines();
            fetchMonthlyEntries();
          }}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'MONTHLY_INWARD' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'MONTHLY_INWARD' ? '#0F8B5A' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'MONTHLY_INWARD' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Calendar size={14} color={activeTab === 'MONTHLY_INWARD' ? '#0F8B5A' : '#64748B'} />
          <span>Monthly Stock Inward</span>
          <span style={{ background: '#DCFCE7', color: '#166534', fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 800 }}>New</span>
        </button>

        <button
          onClick={() => setActiveTab('STOCKERS')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'STOCKERS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'STOCKERS' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'STOCKERS' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Building size={14} />
          <span>HQ Stockers ({stockers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MEDICINES')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'MEDICINES' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'MEDICINES' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'MEDICINES' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Package size={14} />
          <span>Medicine Master</span>
        </button>

        <button
          onClick={() => setActiveTab('ALERTS')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'ALERTS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'ALERTS' ? '#DC2626' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'ALERTS' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <AlertTriangle size={14} color="#DC2626" />
          <span>Stock Shortage Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'AUDIT' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'AUDIT' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'AUDIT' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={14} />
          <span>Inventory Audit Log</span>
        </button>
      </div>

      {/* HQ Selector Bar (Used across Inventory, Monthly Inward, Stockers) */}
      {(activeTab === 'INVENTORY' || activeTab === 'STOCKERS' || activeTab === 'MONTHLY_INWARD') && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 16,
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Select Headquarters (HQ):
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {selectedHq && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditHq(selectedHq)}
                        className="btn-enterprise secondary"
                        style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Edit selected Headquarters"
                      >
                        <Edit2 size={12} />
                        <span>Edit HQ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHq(selectedHq.id)}
                        className="btn-enterprise secondary"
                        style={{ padding: '3px 8px', fontSize: 11, color: '#DC2626', borderColor: '#FECACA', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Delete selected Headquarters"
                      >
                        <Trash2 size={12} />
                        <span>Delete HQ</span>
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddHqModalOpen(true)}
                    className="btn-enterprise"
                    style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--color-brand)', color: '#FFFFFF' }}
                  >
                    <Plus size={13} />
                    <span>Add HQ</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {hqs.map((hq) => {
                  const isSelected = selectedHqId === hq.id;
                  return (
                    <button
                      key={hq.id}
                      type="button"
                      onClick={() => {
                        setSelectedHqId(hq.id);
                        setNewStockerHqId(hq.id);
                        setSelectedSubAreaFilter('ALL');
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: isSelected ? '1.5px solid var(--color-brand)' : '1px solid var(--color-border)',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        color: isSelected ? 'var(--color-brand)' : 'var(--color-text-main)',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Building size={12} color={isSelected ? 'var(--color-brand)' : '#64748B'} />
                      <span>{hq.name}</span>
                      {hq.isHeadquarters && (
                        <span style={{ fontSize: 9, background: '#DCFCE7', color: '#166534', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                          HQ
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stocker Selector under this HQ */}
            {(activeTab === 'INVENTORY' || activeTab === 'MONTHLY_INWARD') && (
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  2. Select Stocker under {selectedHq?.name || 'Selected HQ'}:
                </span>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {stockers.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                      No stockers registered under this HQ yet.
                    </span>
                  ) : (
                    stockers.map((st) => {
                      const isSelected = selectedStockerId === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => setSelectedStockerId(st.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: isSelected ? '1.5px solid #0F8B5A' : '1px solid var(--color-border)',
                            background: isSelected ? '#ECFDF5' : '#FFFFFF',
                            color: isSelected ? '#065F46' : 'var(--color-text-main)',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Boxes size={13} color={isSelected ? '#0F8B5A' : '#64748B'} />
                          <span>{st.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 1: STOCKER INVENTORY ================= */}
      {activeTab === 'INVENTORY' && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                {selectedStocker ? `${selectedStocker.name} Inventory Catalog` : 'Select a Stocker'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                (HQ: {selectedHq?.name || '—'} • Isolated stock balance)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn-enterprise"
                onClick={() => {
                  setActiveTab('MONTHLY_INWARD');
                  fetchMedicines();
                  fetchMonthlyEntries();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  padding: '6px 12px',
                  background: '#0F8B5A',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={14} />
                <span>Record Monthly Inward</span>
              </button>

              <input
                type="text"
                placeholder="Search medicine in this stocker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                  minWidth: 180,
                }}
              />
            </div>
          </div>

          {!selectedStockerId ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Please select a Stocker above to view and update its inventory.
            </div>
          ) : inventory.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No inventory records initialized for this stocker.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Medicine / Product</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>SKU Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Unit</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Base Price</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Current Stock Quantity</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory
                    .filter((item) =>
                      !searchQuery.trim()
                        ? true
                        : item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.medicine_code.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item, idx) => {
                      const isNegative = item.quantity < 0;
                      const isZero = item.quantity === 0;

                      return (
                        <tr
                          key={item.id || idx}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: isNegative ? '#FEF2F2' : isZero ? '#FFFBEB' : '#FFFFFF',
                          }}
                        >
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {item.medicine_name}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#64748B', fontFamily: 'monospace' }}>
                            {item.medicine_code}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {item.unit}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#166534' }}>
                            ₹{item.price.toFixed(2)}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: isNegative ? '#DC2626' : isZero ? '#D97706' : '#0F172A',
                              }}
                            >
                              {item.quantity} {item.quantity < 0 ? '(Shortage Backorder)' : 'units'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  isNegative || isZero
                                    ? '#FEE2E2'
                                    : item.status === 'Low Stock'
                                    ? '#FEF3C7'
                                    : '#DCFCE7',
                                color:
                                  isNegative || isZero
                                    ? '#991B1B'
                                    : item.status === 'Low Stock'
                                    ? '#92400E'
                                    : '#166534',
                              }}
                            >
                              {isNegative
                                ? '⚠️ Shortage / Negative'
                                : isZero
                                ? 'Out of Stock'
                                : item.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                              <button
                                onClick={() => {
                                  setSelectedMedicineId(item.medicine_id);
                                  setActiveTab('MONTHLY_INWARD');
                                  fetchMedicines();
                                  fetchMonthlyEntries();
                                }}
                                style={{
                                  background: '#ECFDF5',
                                  color: '#065F46',
                                  border: '1px solid #A7F3D0',
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                + Inward
                              </button>
                              <button
                                onClick={() => {
                                  setStockEditTarget(item);
                                  setStockAdjustmentQty(String(item.quantity));
                                  setStockAdjustmentReason('Admin manual adjustment');
                                  setIsUpdateStockModalOpen(true);
                                }}
                                style={{
                                  background: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  padding: '4px 10px',
                                  borderRadius: 4,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Adjust Stock
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: MONTHLY STOCK INWARD ================= */}
      {activeTab === 'MONTHLY_INWARD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Success Notification Banner */}
          {inwardSuccessMsg && (
            <div
              style={{
                background: '#ECFDF5',
                border: '1.5px solid #10B981',
                color: '#065F46',
                padding: '12px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} color="#059669" />
                <span>{inwardSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setInwardSuccessMsg('')}
                style={{ background: 'none', border: 'none', color: '#065F46', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Inward Form Card */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-xs)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#065F46', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <Calendar size={18} color="#0F8B5A" />
                  <span>Monthly Medicine Stock Inward / Inflow</span>
                </h2>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                  Select fixed medicines, record quantities received from supplier, and track batch/invoice numbers for monthly reconciliation.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: '#DCFCE7',
                    color: '#166534',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  HQ: {selectedHq?.name || 'Select HQ'}
                </span>
                <span
                  style={{
                    background: '#EFF6FF',
                    color: '#1E40AF',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Stocker: {selectedStocker?.name || 'Select Stocker'}
                </span>
              </div>
            </div>

            {!selectedStockerId ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Please select a Headquarters and a Stocker facility above before recording monthly medicine inward.
              </div>
            ) : (
              <form onSubmit={handleSaveMonthlyInward} style={{ padding: 18 }}>
                {/* 1. Month, Date & Invoice Reference Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 14,
                    background: '#F8FAFC',
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                      MONTH OF ENTRY (PERIOD) *
                    </label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                      INWARD RECEIPT DATE *
                    </label>
                    <input
                      type="date"
                      value={inwardDate}
                      onChange={(e) => setInwardDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        fontSize: 12.5,
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                      INVOICE / CHALLAN NO. (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-AHTRI-2026/10-01"
                      value={inwardInvoiceNo}
                      onChange={(e) => setInwardInvoiceNo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        fontSize: 12.5,
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>

                {/* 2. Medicine Selection Strip */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Package size={15} color="#0F8B5A" />
                      <span>SELECT MEDICINE PRODUCT *</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                        (Choose from fixed catalog or add a new medicine)
                      </span>
                    </label>

                    <button
                      type="button"
                      className="btn-enterprise"
                      onClick={() => setIsAddMedicineModalOpen(true)}
                      style={{
                        fontSize: 11.5,
                        padding: '4px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#0F8B5A',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      <span>+ Add New Medicine to Catalog</span>
                    </button>
                  </div>

                  {/* Fixed Medicines Quick-Select Pills */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                      padding: '4px 0 10px 0',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                    }}
                  >
                    {medicines.map((m) => {
                      const isSel = selectedMedicineId === m.id;
                      const invItem = inventory.find((i) => i.medicine_id === m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMedicineId(m.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: isSel ? '2px solid #0F8B5A' : '1px solid var(--color-border)',
                            background: isSel ? '#ECFDF5' : '#FFFFFF',
                            color: isSel ? '#065F46' : 'var(--color-text-main)',
                            fontSize: 12,
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 3,
                            flex: 'none',
                            textAlign: 'left',
                            boxShadow: isSel ? '0 1px 3px rgba(15, 139, 90, 0.2)' : 'none',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            💊 <strong>{m.name}</strong>
                          </span>
                          <span style={{ fontSize: 10.5, color: isSel ? '#047857' : '#64748B' }}>
                            {m.product_code || m.code} • Stock: {invItem ? invItem.quantity : 0} {m.unit}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown for wide selection */}
                  <div style={{ marginTop: 6 }}>
                    <select
                      value={selectedMedicineId}
                      onChange={(e) => setSelectedMedicineId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        fontSize: 13,
                        fontWeight: 600,
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="">-- Choose a medicine from catalog --</option>
                      {medicines.map((m) => {
                        const invItem = inventory.find((i) => i.medicine_id === m.id);
                        return (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.product_code || m.code}) — Current Stock: {invItem ? invItem.quantity : 0} {m.unit} (₹{m.base_price})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* 3. Selected Medicine Live Preview Card */}
                {selectedMedicineId && (() => {
                  const med = medicines.find((m) => m.id === selectedMedicineId);
                  const currentInv = inventory.find((i) => i.medicine_id === selectedMedicineId);
                  const currStock = currentInv ? currentInv.quantity : 0;
                  const addQty = parseInt(inwardQuantity) || 0;
                  const projectedStock = currStock + addQty;

                  return (
                    <div
                      style={{
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginBottom: 18,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>
                          💊 {med?.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#047857', marginTop: 2 }}>
                          SKU: <strong>{med?.product_code || med?.code}</strong> • Unit: <strong>{med?.unit}</strong> • Fixed Price: <strong>₹{med?.base_price}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 10.5, color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                            Current Stock in {selectedStocker?.name}
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: currStock <= 0 ? '#DC2626' : '#0F172A' }}>
                            {currStock} {med?.unit}
                          </span>
                        </div>

                        <div style={{ fontSize: 16, color: '#0F8B5A', fontWeight: 800 }}>+</div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 10.5, color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                            Incoming Quantity
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#0F8B5A' }}>
                            {addQty} {med?.unit}
                          </span>
                        </div>

                        <div style={{ fontSize: 16, color: '#0F8B5A', fontWeight: 800 }}>=</div>

                        <div style={{ textAlign: 'right', background: '#FFFFFF', padding: '6px 12px', borderRadius: 6, border: '1px solid #86EFAC' }}>
                          <span style={{ fontSize: 10, color: '#065F46', display: 'block', textTransform: 'uppercase', fontWeight: 800 }}>
                            Projected New Stock
                          </span>
                          <span style={{ fontSize: 16, fontWeight: 900, color: '#065F46' }}>
                            {projectedStock} {med?.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Inward Quantity & Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>
                      HOW MUCH CAME / INWARD QUANTITY *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={inwardQuantity}
                      onChange={(e) => setInwardQuantity(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '2px solid #0F8B5A',
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#065F46',
                      }}
                    />
                    {/* Quick quantity buttons */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {[10, 25, 50, 100, 200, 500].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setInwardQuantity(String(num))}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid var(--color-border)',
                            background: '#F1F5F9',
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          +{num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                      BATCH / LOT NUMBER
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B-2610A"
                      value={inwardBatchNo}
                      onChange={(e) => setInwardBatchNo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        fontSize: 12.5,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                      EXPIRY DATE (OPTIONAL)
                    </label>
                    <input
                      type="date"
                      value={inwardExpiryDate}
                      onChange={(e) => setInwardExpiryDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        fontSize: 12.5,
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    TRANSACTION NOTES / REMARKS (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Central manufacturing batch, arrived via cold-chain carrier"
                    value={inwardNotes}
                    onChange={(e) => setInwardNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      fontSize: 12.5,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="submit"
                    className="btn-enterprise"
                    disabled={isSubmittingInward}
                    style={{
                      padding: '10px 24px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: '#0F8B5A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 2px 4px rgba(15, 139, 90, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>{isSubmittingInward ? 'Recording Inward...' : 'Record Monthly Stock Inward'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Monthly Inward Entries Ledger Table */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                background: 'var(--color-surface-secondary)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>
                  Monthly Medicine Inward History &amp; Records
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                  ({monthlyEntries.length} entries recorded for {selectedHq?.name || 'All HQs'})
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={monthlyFilterMonth}
                  onChange={(e) => setMonthlyFilterMonth(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--color-border)',
                    fontSize: 11.5,
                  }}
                >
                  <option value="ALL">All Recorded Months</option>
                  <option value={selectedMonth}>Selected: {selectedMonth}</option>
                  <option value="2026-10">October 2026</option>
                  <option value="2026-09">September 2026</option>
                </select>

                <button
                  className="btn-enterprise secondary"
                  onClick={fetchMonthlyEntries}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  Refresh History
                </button>
              </div>
            </div>

            {monthlyEntries.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No monthly medicine inward records found for this period. Use the form above to record incoming medicine shipments.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Entry Date &amp; Month</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Medicine / Product</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Inward Qty</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>HQ &amp; Stocker</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Batch &amp; Expiry</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Invoice No.</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyEntries.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'block' }}>
                            {formatDateDDMMYYYY(entry.entry_date)}
                          </span>
                          <span style={{ fontSize: 10.5, color: '#64748B' }}>
                            Month: {entry.month}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'block' }}>
                            💊 {entry.medicine_name}
                          </span>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748B' }}>
                            {entry.medicine_code}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0F8B5A' }}>
                            +{entry.quantity}
                          </span>{' '}
                          <span style={{ fontSize: 11, color: '#475569' }}>
                            {entry.unit}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontWeight: 600, color: '#1E3A8A', display: 'block' }}>
                            {entry.stocker_name}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748B' }}>
                            HQ: {entry.hq_name}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 11.5 }}>
                          <div style={{ fontWeight: 600, color: '#334155' }}>
                            {entry.batch_no ? `Batch: ${entry.batch_no}` : '—'}
                          </div>
                          {entry.expiry_date && (
                            <div style={{ color: '#64748B', fontSize: 10.5 }}>
                              Exp: {formatDateDDMMYYYY(entry.expiry_date)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
                          {entry.invoice_no || '—'}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 11.5, color: '#475569' }}>
                          {entry.user_name || 'Admin'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: HQ STOCKERS ================= */}
      {activeTab === 'STOCKERS' && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                Stockers &amp; Shops under {selectedHq?.name || 'Selected HQ'}
              </span>

              {/* Sub-Area Dropdown Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  SUB-AREA / MARKET:
                </span>
                <select
                  value={selectedSubAreaFilter}
                  onChange={(e) => setSelectedSubAreaFilter(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: '#FFFFFF',
                    color: 'var(--color-text-main)',
                  }}
                >
                  <option value="ALL">All Sub-Areas ({stockers.length})</option>
                  {getSubAreasForHq(selectedHqId).map((area) => {
                    const count = stockers.filter(
                      (s) => (s.sub_area || '').toLowerCase() === area.toLowerCase()
                    ).length;
                    return (
                      <option key={area} value={area}>
                        📍 {area} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <button
              className="btn-enterprise"
              onClick={() => {
                const available = getSubAreasForHq(selectedHqId);
                setNewStockerSubArea(available[0] || '');
                setIsAddStockerModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
            >
              <Plus size={14} />
              <span>Add Stocker to {selectedHq?.name}</span>
            </button>
          </div>

          {(() => {
            const displayedStockers = stockers.filter((st) => {
              if (selectedSubAreaFilter === 'ALL') return true;
              return (st.sub_area || '').toLowerCase() === selectedSubAreaFilter.toLowerCase();
            });

            if (displayedStockers.length === 0) {
              return (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No stockers found for {selectedHq?.name}{selectedSubAreaFilter !== 'ALL' ? ` under ${selectedSubAreaFilter}` : ''}. Click "Add Stocker" to register one.
                </div>
              );
            }

            return (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Stocker Name</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>HQ Territory</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Sub-Area / Market</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Contact Person</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Phone</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Address</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStockers.map((st) => (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          📦 {st.name}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#1E40AF', fontWeight: 600 }}>
                          {st.hq_name}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span
                            style={{
                              background: '#F1F5F9',
                              color: '#0F172A',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            📍 {st.sub_area || 'Shahdol Central'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#334155' }}>
                          {st.contact_person || '—'}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#64748B' }}>
                          {st.phone || '—'}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>
                          {st.address || '—'}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span
                            style={{
                              background: st.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9',
                              color: st.status === 'ACTIVE' ? '#166534' : '#64748B',
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {st.status}
                          </span>
                        </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStockerId(st.id);
                              setActiveTab('INVENTORY');
                            }}
                            style={{
                              background: '#F0FDF4',
                              color: '#166534',
                              border: '1px solid #BBF7D0',
                              padding: '4px 10px',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            View Inventory →
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStocker(st)}
                            style={{
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title="Edit Stocker"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStocker(st.id)}
                            style={{
                              background: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title="Delete Stocker"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}
        </div>
      )}

      {/* ================= TAB 3: MEDICINE MASTER ================= */}
      {activeTab === 'MEDICINES' && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                Medicine &amp; Pharmaceutical Product Master Catalog
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                Fixed price, unit of measure, and active business status
              </span>
            </div>

            <button
              className="btn-enterprise"
              onClick={() => setIsAddMedicineModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
            >
              <Plus size={14} />
              <span>Add New Medicine</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Medicine Name</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>SKU Code</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Packaging Unit</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Fixed Base Price</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Low Stock Threshold</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Catalog Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med) => (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      💊 {med.name}
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#64748B' }}>
                      {med.product_code}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#334155' }}>
                      {med.unit}
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 800, color: '#166534' }}>
                      ₹{med.base_price.toFixed(2)}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>
                      {med.low_stock_threshold} units
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span
                        style={{
                          background: med.is_active ? '#DCFCE7' : '#FEE2E2',
                          color: med.is_active ? '#166534' : '#991B1B',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {med.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditMedicine(med)}
                          style={{
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                          title="Edit Medicine Details"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedicine(med.id)}
                          style={{
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                          title="Delete Medicine from Catalog"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: STOCK ALERTS (§18) ================= */}
      {activeTab === 'ALERTS' && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--color-border)',
              background: '#FEF2F2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} />
                Critical Inventory Shortage &amp; Low Stock Warnings
              </span>
              <span style={{ fontSize: 11, color: '#7F1D1D', display: 'block', marginTop: 2 }}>
                Items where stock has reached 0, fallen negative (backorders), or dropped below configured threshold.
              </span>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <CheckCircle size={36} color="#10B981" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                All Stock Levels Healthy
              </p>
              <p style={{ fontSize: 12, color: '#64748B' }}>
                No medicines are currently out of stock or in negative shortage.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#FFF1F2', borderBottom: '1px solid #FECDD3' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Medicine</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Stocker Facility</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>HQ</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Current Stock</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Warning Level</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Required Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((al, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #FEE2E2', background: '#FFFFFF' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {al.medicine_name}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1E3A8A' }}>
                        {al.stocker_name}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#475569' }}>
                        {al.hq_name}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: al.quantity <= 0 ? '#DC2626' : '#D97706' }}>
                        {al.quantity} {al.quantity < 0 ? '(Shortage Backorder)' : 'units'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            background: al.quantity < 0 ? '#FEE2E2' : al.quantity === 0 ? '#FEF3C7' : '#EFF6FF',
                            color: al.quantity < 0 ? '#991B1B' : al.quantity === 0 ? '#92400E' : '#1E40AF',
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {al.alert_type}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#DC2626' }}>
                        {al.action_required || 'Replenish Stock'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: AUDIT TRAIL (§19) ================= */}
      {activeTab === 'AUDIT' && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                Inventory Audit Trail &amp; Transaction Ledger
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                Every stock addition, order deduction, and adjustment is recorded with user and timestamp
              </span>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No inventory transactions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Timestamp</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Stocker Facility</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Product</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Opening Stock</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Change</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>New Stock</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Type / Reason</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    const isDeduction = log.change_quantity < 0;
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {formatDateDDMMYYYY(log.created_at)}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {log.stocker_name || log.stocker_id}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-brand)' }}>
                          {log.product_name || log.product_id}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>
                          {log.opening_stock}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: isDeduction ? '#DC2626' : '#166534' }}>
                          {isDeduction ? `${log.change_quantity}` : `+${log.change_quantity}`}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: '#0F172A' }}>
                          {log.new_stock}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#334155' }}>
                          <span
                            style={{
                              background: isDeduction ? '#FEE2E2' : '#EFF6FF',
                              color: isDeduction ? '#991B1B' : '#1E40AF',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 700,
                              marginRight: 6,
                            }}
                          >
                            {log.transaction_type}
                          </span>
                          {log.reason || (log.order_id ? `Order #${log.order_id}` : 'Stock update')}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>
                          {log.user_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Update Stock Quantity (§12 & §13) */}
      {isUpdateStockModalOpen && stockEditTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveStockAdjustment();
            }}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
                Set Stock Quantity
              </h3>
              <button
                type="button"
                onClick={() => setIsUpdateStockModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Product: <strong>{stockEditTarget.medicine_name}</strong> ({stockEditTarget.medicine_code})<br />
              Stocker: <strong>{selectedStocker?.name}</strong> • HQ: <strong>{selectedHq?.name}</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                NEW STOCK QUANTITY (UNITS)
              </label>
              <input
                type="number"
                value={stockAdjustmentQty}
                onChange={(e) => setStockAdjustmentQty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />
              <span style={{ fontSize: 10.5, color: '#64748B', marginTop: 2, display: 'block' }}>
                Negative numbers indicate backorders/shortage.
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                REASON / AUDIT NOTE
              </label>
              <input
                type="text"
                value={stockAdjustmentReason}
                onChange={(e) => setStockAdjustmentReason(e.target.value)}
                placeholder="e.g. Warehouse delivery, Batch transfer"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setIsUpdateStockModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-enterprise"
              >
                Save Stock Quantity
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add Headquarters */}
      {isAddHqModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddHq();
            }}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={16} color="var(--color-brand)" />
                <span>Add New Headquarters (HQ)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddHqModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                HEADQUARTERS / CITY NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Rewa, Indore, Raipur, Delhi"
                value={newHqName}
                onChange={(e) => setNewHqName(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  HQ CODE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. HQ-REW"
                  value={newHqCode}
                  onChange={(e) => setNewHqCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  STATE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Madhya Pradesh"
                  value={newHqState}
                  onChange={(e) => setNewHqState(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setIsAddHqModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-enterprise"
              >
                Add Headquarters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Headquarters */}
      {isEditHqModalOpen && editingHq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEditHq();
            }}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit2 size={16} color="var(--color-brand)" />
                <span>Edit Headquarters ({editingHq.name})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditHqModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                HEADQUARTERS NAME *
              </label>
              <input
                type="text"
                value={editHqName}
                onChange={(e) => setEditHqName(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  HQ CODE
                </label>
                <input
                  type="text"
                  value={editHqCode}
                  onChange={(e) => setEditHqCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  STATE
                </label>
                <input
                  type="text"
                  value={editHqState}
                  onChange={(e) => setEditHqState(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setIsEditHqModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-enterprise"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add Stocker under HQ (§10) */}
      {isAddStockerModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <form
            onSubmit={handleAddStocker}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
                Add New Stocker under {hqs.find((h) => h.id === newStockerHqId)?.name || selectedHq?.name || 'Selected HQ'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddStockerModalOpen(false);
                  setStockerModalError('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {stockerModalError && (
              <div style={{ color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '6px 10px', borderRadius: 6, fontSize: 11.5, marginBottom: 12 }}>
                {stockerModalError}
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                SELECT HEADQUARTERS (HQ) *
              </label>
              <select
                value={newStockerHqId}
                onChange={(e) => {
                  setNewStockerHqId(e.target.value);
                  const available = getSubAreasForHq(e.target.value);
                  setNewStockerSubArea(available[0] || '');
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#FFFFFF',
                }}
              >
                {hqs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code || 'HQ'}) {h.state ? `— ${h.state}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                SELECT SUB-AREA / TEHSIL / VILLAGE *
              </label>
              <select
                value={newStockerSubArea}
                onChange={(e) => setNewStockerSubArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#FFFFFF',
                }}
              >
                <option value="">-- Select Sub-Area / Tehsil / Village --</option>
                {getSubAreasForHq(newStockerHqId || selectedHqId).map((area) => (
                  <option key={area} value={area}>
                    📍 {area}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                STOCKER / SHOP NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Shahdol Stocker 3, City Medico"
                value={newStockerName}
                onChange={(e) => setNewStockerName(e.target.value)}
                required
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                CONTACT PERSON
              </label>
              <input
                type="text"
                placeholder="Manager / Proprietor name"
                value={newStockerContact}
                onChange={(e) => setNewStockerContact(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                PHONE NUMBER
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={newStockerPhone}
                onChange={(e) => setNewStockerPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                ADDRESS / LOCATION
              </label>
              <input
                type="text"
                placeholder="Warehouse or shop address"
                value={newStockerAddress}
                onChange={(e) => setNewStockerAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => {
                  setIsAddStockerModalOpen(false);
                  setStockerModalError('');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-enterprise"
                disabled={isSubmittingStocker}
                style={{ opacity: isSubmittingStocker ? 0.7 : 1 }}
              >
                {isSubmittingStocker ? 'Registering...' : 'Register Stocker'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Stocker */}
      {isEditStockerModalOpen && editingStocker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEditStocker();
            }}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit2 size={16} color="var(--color-brand)" />
                <span>Edit Stocker ({editingStocker.name})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditStockerModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                STOCKER / SHOP NAME *
              </label>
              <input
                type="text"
                value={editStockerName}
                onChange={(e) => setEditStockerName(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                SUB-AREA / TEHSIL / VILLAGE
              </label>
              <select
                value={editStockerSubArea}
                onChange={(e) => setEditStockerSubArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#FFFFFF',
                }}
              >
                <option value="">-- Select Sub-Area / Tehsil / Village --</option>
                {getSubAreasForHq(editingStocker?.hq_id || selectedHqId).map((area) => (
                  <option key={area} value={area}>
                    📍 {area}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                CONTACT PERSON
              </label>
              <input
                type="text"
                value={editStockerContact}
                onChange={(e) => setEditStockerContact(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                PHONE NUMBER
              </label>
              <input
                type="text"
                value={editStockerPhone}
                onChange={(e) => setEditStockerPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                ADDRESS / LOCATION
              </label>
              <input
                type="text"
                value={editStockerAddress}
                onChange={(e) => setEditStockerAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                STATUS
              </label>
              <select
                value={editStockerStatus}
                onChange={(e) => setEditStockerStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12, background: '#FFFFFF' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setIsEditStockerModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-enterprise"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add New Medicine (§11) */}
      {isAddMedicineModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddMedicine();
            }}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
                Add Medicine to Master Catalog
              </h3>
              <button
                type="button"
                onClick={() => setIsAddMedicineModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                PRODUCT / MEDICINE NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. CardioFix-50 (Telmisartan 40mg)"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  PRODUCT CODE / SKU
                </label>
                <input
                  type="text"
                  placeholder="e.g. MED-CF50"
                  value={newMedCode}
                  onChange={(e) => setNewMedCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  PACKAGING UNIT
                </label>
                <input
                  type="text"
                  placeholder="e.g. Strip of 10"
                  value={newMedUnit}
                  onChange={(e) => setNewMedUnit(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  BASE PRICE (₹) *
                </label>
                <input
                  type="number"
                  placeholder="180"
                  value={newMedPrice}
                  onChange={(e) => setNewMedPrice(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  LOW STOCK THRESHOLD
                </label>
                <input
                  type="number"
                  placeholder="15"
                  value={newMedThreshold}
                  onChange={(e) => setNewMedThreshold(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setIsAddMedicineModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-enterprise"
              >
                Save Medicine
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Medicine Master */}
      {isEditMedicineModalOpen && editingMedicine && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEditMedicine();
            }}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit2 size={16} color="var(--color-brand)" />
                <span>Edit Medicine ({editingMedicine.name})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditMedicineModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                PRODUCT / MEDICINE NAME *
              </label>
              <input
                type="text"
                value={editMedName}
                onChange={(e) => setEditMedName(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  PRODUCT CODE / SKU
                </label>
                <input
                  type="text"
                  value={editMedCode}
                  onChange={(e) => setEditMedCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  PACKAGING UNIT
                </label>
                <input
                  type="text"
                  value={editMedUnit}
                  onChange={(e) => setEditMedUnit(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  BASE PRICE (₹) *
                </label>
                <input
                  type="number"
                  value={editMedPrice}
                  onChange={(e) => setEditMedPrice(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  STATUS
                </label>
                <select
                  value={editMedStatus}
                  onChange={(e) => setEditMedStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12, background: '#FFFFFF' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setIsEditMedicineModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-enterprise"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
