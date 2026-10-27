import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';

interface StocklistScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserHqId?: string;
  currentUserHqName?: string;
  onBack?: () => void;
}

interface StockerItem {
  id: string;
  hq_id: string;
  hq_name: string;
  sub_area?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
}

interface InventoryProductItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  medicine_code: string;
  unit: string;
  price?: number | null;
  pts_rate?: number;
  ptr_rate?: number;
  mrp?: number;
  quantity: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock' | 'In Stock' | 'Inactive';
  stocker_name?: string;
  hq_name?: string;
  low_stock_threshold?: number;
}

const DEFAULT_AREAS_BY_HQ: Record<string, string[]> = {
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

const MASTER_COMPANY_MEDICINES: InventoryProductItem[] = [
  {
    id: 'med-01',
    medicine_id: 'med-01',
    medicine_name: 'AHTRI-S',
    medicine_code: 'AHTRI-S',
    unit: '200 ML',
    price: 38.40,
    quantity: 60,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-02',
    medicine_id: 'med-02',
    medicine_name: 'AHTRI-A A2Z',
    medicine_code: 'AHTRI-A-A2Z',
    unit: '200 ML',
    price: 36.80,
    quantity: 50,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-03',
    medicine_id: 'med-03',
    medicine_name: 'AHTYME',
    medicine_code: 'AHTYME',
    unit: '200 ML',
    price: 36.80,
    quantity: 45,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-04',
    medicine_id: 'med-04',
    medicine_name: 'ATHRIMOX CV 625',
    medicine_code: 'ATHRIMOX-CV-625',
    unit: '10*1*10',
    price: 68.00,
    quantity: 70,
    low_stock_threshold: 20,
    status: 'In Stock',
  },
  {
    id: 'med-05',
    medicine_id: 'med-05',
    medicine_name: 'AHTRI-P',
    medicine_code: 'AHTRI-P',
    unit: '20*10',
    price: 12.00,
    quantity: 100,
    low_stock_threshold: 25,
    status: 'In Stock',
  },
  {
    id: 'med-06',
    medicine_id: 'med-06',
    medicine_name: 'TRIPAN DSR',
    medicine_code: 'TRIPAN-DSR',
    unit: '10*10',
    price: 20.80,
    quantity: 80,
    low_stock_threshold: 20,
    status: 'In Stock',
  },
  {
    id: 'med-07',
    medicine_id: 'med-07',
    medicine_name: 'AHTRI SP',
    medicine_code: 'AHTRI-SP',
    unit: '10*10',
    price: 19.80,
    quantity: 65,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-08',
    medicine_id: 'med-08',
    medicine_name: 'TRIZOLE OC',
    medicine_code: 'TRIZOLE-OC',
    unit: '30 GM',
    price: 37.80,
    quantity: 55,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-09',
    medicine_id: 'med-09',
    medicine_name: 'TRIZOLE 200',
    medicine_code: 'TRIZOLE-200',
    unit: '10*10',
    price: 64.20,
    quantity: 40,
    low_stock_threshold: 10,
    status: 'In Stock',
  },
  {
    id: 'med-10',
    medicine_id: 'med-10',
    medicine_name: 'AHTRI K27',
    medicine_code: 'AHTRI-K27',
    unit: '10*1*10',
    price: 38.20,
    quantity: 50,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-11',
    medicine_id: 'med-11',
    medicine_name: 'TRIDIC GEL',
    medicine_code: 'TRIDIC-GEL',
    unit: '30 GM',
    price: 55.20,
    quantity: 45,
    low_stock_threshold: 10,
    status: 'In Stock',
  },
  {
    id: 'med-12',
    medicine_id: 'med-12',
    medicine_name: 'AHTRI STRETCH MARK CREAM',
    medicine_code: 'AHTRI-STRETCH-MARK',
    unit: '50 GM',
    price: 357.37,
    quantity: 30,
    low_stock_threshold: 10,
    status: 'In Stock',
  },
  {
    id: 'med-13',
    medicine_id: 'med-13',
    medicine_name: 'AHTRI 5G SYP',
    medicine_code: 'AHTRI-5G-SYP',
    unit: '200 ML',
    price: 157.00,
    quantity: 50,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-14',
    medicine_id: 'med-14',
    medicine_name: 'TRIRAB DSR',
    medicine_code: 'TRIRAB-DSR',
    unit: '10*10',
    price: 80.46,
    quantity: 60,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-15',
    medicine_id: 'med-15',
    medicine_name: 'AHTRIMOX CV SUSPENSION',
    medicine_code: 'AHTRIMOX-CV-SUSP',
    unit: '30 ML',
    price: 42.00,
    quantity: 50,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-16',
    medicine_id: 'med-16',
    medicine_name: 'MAFTRI P',
    medicine_code: 'MAFTRI-P',
    unit: '60 ML',
    price: 63.70,
    quantity: 60,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-17',
    medicine_id: 'med-17',
    medicine_name: 'AHTRI 9G',
    medicine_code: 'AHTRI-9G',
    unit: '200 ML',
    price: 147.50,
    quantity: 45,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
];

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
]);

const resolveInitialHqId = (hqId?: string): string => {
  if (!hqId) return 'HQ-SHD-001';
  const lower = hqId.toLowerCase();
  if (lower.includes('kot') || lower.includes('ktm')) return 'HQ-KOT-001';
  if (lower.includes('amb')) return 'HQ-AMB-001';
  if (lower.includes('bsp') || lower.includes('bilaspur')) return 'HQ-BSP-001';
  if (lower.includes('shd') || lower.includes('shahdol')) return 'HQ-SHD-001';
  return hqId;
};

const matchHq = (
  hqList: Array<{ id: string; name: string; code?: string; hq_id?: string }>,
  targetId?: string,
  targetName?: string,
): string => {
  if (!targetId && !targetName) return hqList[0]?.id || 'HQ-SHD-001';
  const cleanId = (targetId || '').toLowerCase().trim();
  const cleanName = (targetName || '').toLowerCase().trim();

  const exact = hqList.find(
    (h) =>
      h.id.toLowerCase() === cleanId ||
      (h.hq_id && h.hq_id.toLowerCase() === cleanId) ||
      (h.code && h.code.toLowerCase() === cleanId) ||
      h.name.toLowerCase() === cleanName ||
      h.name.toLowerCase() === cleanId,
  );
  if (exact) return exact.id;

  const sub = hqList.find(
    (h) =>
      (cleanId && (h.id.toLowerCase().includes(cleanId) || cleanId.includes(h.name.toLowerCase()))) ||
      (cleanName && (h.name.toLowerCase().includes(cleanName) || cleanName.includes(h.name.toLowerCase()))),
  );
  if (sub) return sub.id;

  return hqList[0]?.id || 'HQ-SHD-001';
};

export const StocklistScreen: React.FC<StocklistScreenProps> = ({
  currentUserId = 'usr-mr-02',
  currentUserName = 'Aman Rathore',
  currentUserHqId,
  currentUserHqName,
  onBack,
}) => {
  const [hqs, setHqs] = useState<Array<{ id: string; name: string }>>([
    { id: 'HQ-SHD-001', name: 'Shahdol' },
    { id: 'HQ-KOT-001', name: 'Kotma' },
    { id: 'HQ-AMB-001', name: 'Ambikapur' },
  ]);

  const [selectedHqId, setSelectedHqId] = useState<string>(() => resolveInitialHqId(currentUserHqId || currentUserHqName));
  const [hqBreakdownMap, setHqBreakdownMap] = useState<Record<string, any>>({});
  const [stockers, setStockers] = useState<StockerItem[]>([]);
  const [selectedStockerId, setSelectedStockerId] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryProductItem[]>([]);
  const [companyCatalog, setCompanyCatalog] = useState<InventoryProductItem[]>(MASTER_COMPANY_MEDICINES);
  const [viewMode, setViewMode] = useState<'stockist' | 'catalog' | 'stockage'>('stockist');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (currentUserHqId || currentUserHqName) {
      if (hqs.length > 0) {
        setSelectedHqId(matchHq(hqs, currentUserHqId, currentUserHqName));
      } else {
        setSelectedHqId(resolveInitialHqId(currentUserHqId || currentUserHqName));
      }
    }
  }, [currentUserHqId, currentUserHqName, hqs]);

  
  const [activePermission, setActivePermission] = useState<any>(null);
  const [stockageRequests, setStockageRequests] = useState<any[]>([]);
  const [packagingVariants, setPackagingVariants] = useState<any[]>([]);
  const [draftItems, setDraftItems] = useState<
    Array<{
      id: string;
      medicine_id: string;
      medicine_name: string;
      packaging_id?: string;
      packaging_size?: string;
      packaging_unit?: string;
      quantity: number;
      pts_rate: number;
      mrp: number;
    }>
  >([]);
  const [selectedDraftMedId, setSelectedDraftMedId] = useState<string>('');
  const [selectedDraftVarId, setSelectedDraftVarId] = useState<string>('');
  const [draftQuantityInput, setDraftQuantityInput] = useState<string>('50');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [isSubmittingStockage, setIsSubmittingStockage] = useState<boolean>(false);

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const fetchStockageData = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders(currentUserId);

      
      const permRes = await fetch(`${baseUrl}/inventory/stockage/active-permission?month_year=${currentMonth}`, {
        headers,
      });
      if (permRes.ok) {
        const permData = await permRes.json();
        const permObj = permData?.permission || (permData?.status ? permData : null);
        if (permObj && !permObj.month_year) {
          permObj.month_year = permObj.month_str || (permObj.year && permObj.month ? `${permObj.year}-${String(permObj.month).padStart(2, '0')}` : currentMonth);
        }
        setActivePermission(permObj);
      } else {
        setActivePermission(null);
      }

      
      const reqRes = await fetch(`${baseUrl}/inventory/stockage/requests`, { headers });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setStockageRequests(Array.isArray(reqData) ? reqData : []);
      }

      
      const varRes = await fetch(`${baseUrl}/inventory/packaging-variants`, { headers });
      if (varRes.ok) {
        const varData = await varRes.json();
        setPackagingVariants(Array.isArray(varData) ? varData : []);
      }
    } catch (err) {
      console.warn('Failed to fetch Stockage data in mobile', err);
    }
  };

  useEffect(() => {
    if (viewMode === 'stockage') {
      fetchStockageData();
    }
  }, [viewMode]);

  const handleAddDraftRow = () => {
    if (!selectedDraftMedId) {
      Alert.alert('Selection Required', 'Please select a medicine to add.');
      return;
    }
    const qty = parseInt(draftQuantityInput, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive quantity.');
      return;
    }

    const med = companyCatalog.find((m) => m.medicine_id === selectedDraftMedId || m.id === selectedDraftMedId);
    if (!med) return;

    const variant = selectedDraftVarId
      ? packagingVariants.find((v) => v.id === selectedDraftVarId)
      : packagingVariants.find((v) => v.medicine_id === med.medicine_id);

    
    const alreadyExists = draftItems.some(
      (d) => d.medicine_id === med.medicine_id && (d.packaging_id || '') === (variant?.id || ''),
    );
    if (alreadyExists) {
      Alert.alert('Duplicate Row', `This medicine packaging variant is already added to your draft list.`);
      return;
    }

    const pts = variant ? variant.pts_rate : med.price || 150;
    const mrp = variant ? variant.mrp : Math.round(pts * 1.4);

    const newRow = {
      id: `${Date.now()}_${Math.random()}`,
      medicine_id: med.medicine_id,
      medicine_name: med.medicine_name,
      packaging_id: variant?.id,
      packaging_size: variant ? `${variant.size} ${variant.unit}` : med.unit,
      packaging_unit: variant?.unit || med.unit,
      quantity: qty,
      pts_rate: pts,
      mrp: mrp,
    };

    setDraftItems((prev) => [...prev, newRow]);
    setDraftQuantityInput('50');
  };

  const handleRemoveDraftRow = (id: string) => {
    setDraftItems((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmitStockage = async () => {
    if (!activePermission || activePermission.status !== 'AVAILABLE') {
      Alert.alert('No Active Permission', 'You do not have an active upload permission for this month.');
      return;
    }
    if (draftItems.length === 0) {
      Alert.alert('Draft Empty', 'Please add at least one medicine row to your submission draft.');
      return;
    }

    Alert.alert(
      'Confirm Stockage Submission',
      `Submit ${draftItems.length} medicine item(s) for ${activePermission.month_year}?\n\nReminder: Single-use permission will be reserved and sent to Administrator for additive Stockage review.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Submit',
          onPress: async () => {
            setIsSubmittingStockage(true);
            try {
              const baseUrl = await ApiConfig.getBaseUrl();
              const headers = await ApiConfig.getAuthHeaders(currentUserId);

              const payload = {
                permission_id: activePermission.id,
                month_year: activePermission.month_year,
                stocker_id: selectedStockerId || activePermission.stocker_id || stockers[0]?.id || 'stk-shd-01',
                hq_id: selectedHqId || activePermission.hq_id || 'hq-shahdol',
                items: draftItems.map((d) => ({
                  medicine_id: d.medicine_id,
                  packaging_id: d.packaging_id,
                  submitted_quantity: d.quantity,
                })),
                notes: submissionNotes.trim() || undefined,
              };

              const res = await fetch(`${baseUrl}/inventory/stockage/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Submission failed');
              }

              Alert.alert(
                'Stockage Submitted! 📦',
                `Your monthly Stockage request for ${activePermission.month_year} has been submitted.\n\n• Permission: RESERVED\n• Status: UNDER REVIEW\n\nOnce Admin approves, approved quantities will be added to the official Stockage.`,
              );

              setDraftItems([]);
              setSubmissionNotes('');
              await fetchStockageData();
            } catch (err: any) {
              Alert.alert('Submission Error', err.message || 'Could not submit Stockage.');
            } finally {
              setIsSubmittingStockage(false);
            }
          },
        },
      ],
    );
  };

  
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders(currentUserId);
        const res = await fetch(`${baseUrl}/inventory/medicines?all=true`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const mapped: InventoryProductItem[] = list.map((m: any) => {
              const pts = m.pts_rate ?? m.pts ?? m.base_price ?? 0;
              const ptr = m.ptr_rate ?? m.ptr ?? (pts ? pts * 1.15 : 0);
              const mrp = m.mrp ?? (pts ? pts * 1.4 : 0);
              return {
                id: m.id,
                medicine_id: m.id,
                medicine_name: m.name,
                medicine_code: m.code || m.product_code || 'MED',
                unit: m.unit || m.packing || 'Pack',
                price: pts,
                pts_rate: pts,
                ptr_rate: ptr,
                mrp: mrp,
                quantity: 0,
                low_stock_threshold: m.low_stock_threshold || 10,
                status: m.status === 'ACTIVE' ? 'In Stock' : 'Inactive',
              };
            });
            setCompanyCatalog(mapped);
          }
        }
      } catch {}
    })();
  }, [currentUserId]);

  
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/hqs`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const filtered = list.filter((h: any) => {
              const name = (h.name || '').toLowerCase().trim();
              return !NON_HQ_NAMES.has(name);
            });
            if (filtered.length > 0) {
              setHqs(filtered);
              const matched = matchHq(filtered, currentUserHqId, currentUserHqName);
              setSelectedHqId(matched);
            }
          }
        }
      } catch {}
    })();
  }, []);

  
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();

        
        const [stockersRes, hqStockRes] = await Promise.all([
          fetch(`${baseUrl}/inventory/stockers?hq_id=${selectedHqId}`, { headers }),
          fetch(`${baseUrl}/inventory/hq-stock?hq_id=${encodeURIComponent(selectedHqId)}`, { headers }),
        ]);
        if (stockersRes.ok) {
          const list: StockerItem[] = await stockersRes.json();
          if (Array.isArray(list)) {
            setStockers(list);
          }
        }
        if (hqStockRes.ok) {
          const hqStockData = await hqStockRes.json();
          const bdMap: Record<string, any> = {};
          (hqStockData.medicines || []).forEach((m: any) => {
            bdMap[m.medicine_id] = m;
            bdMap[m.medicine_name.toLowerCase().trim()] = m;
          });
          setHqBreakdownMap(bdMap);
        }
      } catch {}
    })();
  }, [selectedHqId]);

  const filteredStockers = stockers;

  
  useEffect(() => {
    if (filteredStockers.length > 0) {
      if (!filteredStockers.some((s) => s.id === selectedStockerId)) {
        setSelectedStockerId(filteredStockers[0].id);
      }
    } else {
      setSelectedStockerId('');
      setInventory([]);
    }
  }, [stockers]);

  
  useEffect(() => {
    if (!selectedStockerId) return;
    (async () => {
      setIsLoading(true);
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        if (selectedStockerId === 'ALL_DEPOTS') {
          const res = await fetch(`${baseUrl}/inventory/hq-stock?hq_id=${encodeURIComponent(selectedHqId)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const mapped: InventoryProductItem[] = (data.medicines || []).map((m: any) => ({
              id: m.medicine_id,
              medicine_id: m.medicine_id,
              medicine_name: m.medicine_name,
              medicine_code: m.medicine_code,
              unit: m.packing || m.unit,
              price: m.pts_rate,
              pts_rate: m.pts_rate,
              ptr_rate: m.ptr_rate || (m.pts_rate ? m.pts_rate * 1.15 : 0),
              mrp: m.mrp || (m.pts_rate ? m.pts_rate * 1.4 : 0),
              quantity: m.available_stock,
              status: m.is_out_of_stock ? 'Out of Stock' : m.is_low_stock ? 'Low Stock' : 'Available',
              low_stock_threshold: m.low_stock_threshold,
            }));
            setInventory(mapped);
          }
        } else {
          const res = await fetch(`${baseUrl}/inventory/stockers/${selectedStockerId}/inventory`, { headers });
          if (res.ok) {
            const items = await res.json();
            if (Array.isArray(items)) {
              setInventory(items);
            }
          }
        }
      } catch {} finally {
        setIsLoading(false);
      }
    })();
  }, [selectedStockerId]);

  
  const sourceInventory: InventoryProductItem[] =
    viewMode === 'catalog'
      ? companyCatalog.map((catItem) => {
          const invItem = inventory.find((i) => i.medicine_id === catItem.medicine_id);
          const qty = invItem ? invItem.quantity : 0;
          return {
            ...catItem,
            quantity: qty,
            status: qty <= 0 ? 'Out of Stock' : qty <= (catItem.low_stock_threshold || 10) ? 'Low Stock' : 'Available',
          };
        })
      : inventory.length > 0
      ? inventory.map((invItem) => {
          const cat = companyCatalog.find((c) => c.medicine_id === invItem.medicine_id);
          const pts = invItem.price ?? cat?.pts_rate ?? cat?.price ?? 0;
          const ptr = cat?.ptr_rate;
          const mrp = cat?.mrp;
          return {
            ...invItem,
            price: pts,
            pts_rate: pts,
            ptr_rate: ptr,
            mrp: mrp,
          };
        })
      : companyCatalog.map((catItem) => ({
          ...catItem,
          quantity: 0,
          status: 'Out of Stock' as const,
        }));

  const filteredInventory = sourceInventory.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.medicine_name.toLowerCase().includes(q) ||
      (item.medicine_code && item.medicine_code.toLowerCase().includes(q))
    );
  });

  const selectedStocker = filteredStockers.find((s) => s.id === selectedStockerId) || stockers.find((s) => s.id === selectedStockerId);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#93C5FD', fontWeight: '700', fontSize: 13 }}>← Back to More Menu</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Point-of-Care Medicines & Stock</Text>
        <Text style={styles.headerSub}>
          {currentUserName} • Enterprise Catalog & Inventory
        </Text>

        {/* View Mode Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 2, paddingRight: 16 }}
          style={{ marginTop: 12 }}
        >
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'stockist' && styles.modeTabActive]}
            onPress={() => setViewMode('stockist')}
          >
            <Text style={[styles.modeTabText, viewMode === 'stockist' && styles.modeTabTextActive]}>
              📦 By Stockage Depot
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'catalog' && styles.modeTabActive]}
            onPress={() => setViewMode('catalog')}
          >
            <Text style={[styles.modeTabText, viewMode === 'catalog' && styles.modeTabTextActive]}>
              💊 All Medicines ({companyCatalog.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'stockage' && styles.modeTabActive]}
            onPress={() => setViewMode('stockage')}
          >
            <Text style={[styles.modeTabText, viewMode === 'stockage' && styles.modeTabTextActive]}>
              📋 Monthly Stockage
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {viewMode === 'stockage' ? (
        <View style={{ padding: 12 }}>
          {/* Permission Status Banner */}
          <View
            style={{
              backgroundColor:
                activePermission?.status === 'AVAILABLE'
                  ? '#ECFDF5'
                  : activePermission?.status === 'RESERVED'
                  ? '#FEF3C7'
                  : activePermission?.status === 'CONSUMED'
                  ? '#EFF6FF'
                  : '#F1F5F9',
              borderRadius: 8,
              padding: 14,
              borderWidth: 1.5,
              borderColor:
                activePermission?.status === 'AVAILABLE'
                  ? '#10B981'
                  : activePermission?.status === 'RESERVED'
                  ? '#F59E0B'
                  : activePermission?.status === 'CONSUMED'
                  ? '#3B82F6'
                  : '#CBD5E1',
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '800',
                  color:
                    activePermission?.status === 'AVAILABLE'
                      ? '#065F46'
                      : activePermission?.status === 'RESERVED'
                      ? '#92400E'
                      : activePermission?.status === 'CONSUMED'
                      ? '#1E40AF'
                      : '#475569',
                }}
              >
                {activePermission?.status === 'AVAILABLE'
                  ? `✅ ACTIVE PERMISSION: ${activePermission.month_year}`
                  : activePermission?.status === 'RESERVED'
                  ? `⏳ SUBMISSION UNDER REVIEW (${activePermission.month_year})`
                  : activePermission?.status === 'CONSUMED'
                  ? `🎉 STOCKAGE CONSUMED & APPLIED (${activePermission.month_year})`
                  : '🔒 NO ACTIVE UPLOAD PERMISSION'}
              </Text>
              <TouchableOpacity
                onPress={fetchStockageData}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  marginLeft: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A3C6E' }}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11.5, color: '#475569', marginTop: 6, lineHeight: 17 }}>
              {activePermission?.status === 'AVAILABLE'
                ? `You have 1 active upload permission granted by ${activePermission.granted_by_admin_name || 'Admin'} for ${activePermission.month_year}. Add medicine rows below and submit.`
                : activePermission?.status === 'RESERVED'
                ? 'Your Stockage submission has been sent and is currently pending Admin review. Single-use permission is reserved; you cannot submit again until reviewed.'
                : activePermission?.status === 'CONSUMED'
                ? 'Your submitted Stockage for this month has been approved and additive quantities successfully applied to official stock.'
                : 'To upload monthly Stockage data, an Administrator must grant you permission after telephonic verification. Contact your Area Manager or Admin.'}
            </Text>
          </View>

          {/* Bulk Submission Draft Builder (Shown when Permission is AVAILABLE) */}
          {activePermission?.status === 'AVAILABLE' && (
            <View style={[styles.card, { margin: 0, marginBottom: 14 }]}>
              <Text style={styles.cardLabel}>Bulk Stockage Submission Form ({activePermission.month_year})</Text>

              {/* Medicine Selector */}
              <Text style={[styles.cardLabel, { marginTop: 6, fontSize: 11, color: '#64748B' }]}>
                1. Select Medicine:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {companyCatalog.map((med) => {
                  const isSelected = selectedDraftMedId === med.medicine_id;
                  return (
                    <TouchableOpacity
                      key={med.id}
                      style={[
                        styles.chip,
                        isSelected && { backgroundColor: '#0F8B5A', borderColor: '#0F8B5A' },
                      ]}
                      onPress={() => {
                        setSelectedDraftMedId(med.medicine_id);
                        const vList = packagingVariants.filter((v) => v.medicine_id === med.medicine_id);
                        if (vList.length > 0) setSelectedDraftVarId(vList[0].id);
                        else setSelectedDraftVarId('');
                      }}
                    >
                      <Text style={[styles.chipText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                        💊 {med.medicine_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Packaging Variant Selector */}
              {selectedDraftMedId ? (
                (() => {
                  const currentVariants = packagingVariants.filter(
                    (v) => v.medicine_id === selectedDraftMedId && v.is_active,
                  );
                  const selectedVariant = currentVariants.find((v) => v.id === selectedDraftVarId) || currentVariants[0];

                  return (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={[styles.cardLabel, { fontSize: 11, color: '#64748B' }]}>
                        2. Select Packaging Variant & Unit:
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {currentVariants.length > 0 ? (
                          currentVariants.map((v) => {
                            const isVarSelected = (selectedDraftVarId || currentVariants[0]?.id) === v.id;
                            return (
                              <TouchableOpacity
                                key={v.id}
                                style={[
                                  styles.chip,
                                  isVarSelected && { backgroundColor: '#1A3C6E', borderColor: '#1A3C6E' },
                                ]}
                                onPress={() => setSelectedDraftVarId(v.id)}
                              >
                                <Text style={[styles.chipText, isVarSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                                  {v.display_name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <View style={{ paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>Standard packaging unit</Text>
                          </View>
                        )}
                      </ScrollView>

                      {/* Read-only PTS & MRP display */}
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 10,
                          backgroundColor: '#F8FAFC',
                          padding: 8,
                          borderRadius: 6,
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#047857' }}>
                            PTS RATE (READ-ONLY)
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>
                            ₹{Number(selectedVariant?.pts_rate || 150).toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>
                            MRP (REFERENCE ONLY)
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                            ₹{Number(selectedVariant?.mrp || 210).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()
              ) : null}

              {/* Quantity Input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardLabel, { fontSize: 11, color: '#64748B' }]}>Quantity (Units):</Text>
                  <TextInput
                    style={[styles.searchInput, { marginBottom: 0, fontWeight: '800', fontSize: 14 }]}
                    keyboardType="numeric"
                    placeholder="e.g. 50"
                    value={draftQuantityInput}
                    onChangeText={setDraftQuantityInput}
                  />
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#0F8B5A',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignSelf: 'flex-end',
                  }}
                  onPress={handleAddDraftRow}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ Add to Draft</Text>
                </TouchableOpacity>
              </View>

              {/* Unsubmitted Draft Rows */}
              <Text style={[styles.cardLabel, { fontSize: 11, marginTop: 4 }]}>
                Draft Rows Ready to Submit ({draftItems.length}):
              </Text>

              {draftItems.length === 0 ? (
                <Text style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 8 }}>
                  No medicines added to draft yet. Select a medicine above and tap "+ Add to Draft".
                </Text>
              ) : (
                <View style={{ marginBottom: 12 }}>
                  {draftItems.map((item, idx) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F1F5F9',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', fontSize: 12, color: '#0F172A' }}>
                          {idx + 1}. {item.medicine_name}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                          Pack: {item.packaging_size} &bull; Qty: {item.quantity} &bull; PTS: ₹{item.pts_rate}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveDraftRow(item.id)}
                        style={{ padding: 6 }}
                      >
                        <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 12 }}>Remove ✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 12, color: '#334155' }}>Total Submission Units:</Text>
                    <Text style={{ fontWeight: '900', fontSize: 13, color: '#0F8B5A' }}>
                      {draftItems.reduce((acc, i) => acc + i.quantity, 0)} units ({draftItems.length} items)
                    </Text>
                  </View>
                </View>
              )}

              {/* Submission Notes */}
              <TextInput
                style={[styles.searchInput, { marginTop: 6 }]}
                placeholder="Optional notes or Stocker verification details..."
                value={submissionNotes}
                onChangeText={setSubmissionNotes}
              />

              {/* Submit Button */}
              <TouchableOpacity
                disabled={isSubmittingStockage || draftItems.length === 0}
                style={{
                  backgroundColor: draftItems.length > 0 ? '#1A3C6E' : '#94A3B8',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 6,
                }}
                onPress={handleSubmitStockage}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  {isSubmittingStockage ? 'Submitting...' : '🚀 Submit Complete Stockage Request'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submission History Section */}
          <View style={[styles.card, { margin: 0 }]}>
            <Text style={styles.cardLabel}>My Stockage Submission History</Text>
            {stockageRequests.length === 0 ? (
              <Text style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 10 }}>
                No past submissions found for your ID.
              </Text>
            ) : (
              stockageRequests.map((req) => (
                <View
                  key={req.id}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '800', fontSize: 12.5, color: '#0F172A' }}>
                      Month: {req.month_year} ({req.total_items} items)
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor:
                          req.status === 'APPLIED' ? '#DCFCE7' : req.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color:
                            req.status === 'APPLIED' ? '#166534' : req.status === 'REJECTED' ? '#991B1B' : '#B45309',
                        }}
                      >
                        {req.status === 'APPLIED' ? 'APPROVED & APPLIED' : req.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                    Submitted: {new Date(req.submitted_at).toLocaleDateString()} &bull; Total Units: {req.total_quantity}
                  </Text>
                  {req.admin_notes && (
                    <Text style={{ fontSize: 10.5, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>
                      Admin Feedback: {req.admin_notes}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      ) : (
        <>
          {/* 1. HQ & Depot Selector Header Panel */}
          {viewMode === 'stockist' && (
            <View style={styles.filterPanel}>
              {/* HQ Selection Tabs */}
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.sectionHeaderTitle}>📍 Select Headquarters (HQ):</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A3C6E' }}>
                    {hqs.find((h) => h.id === selectedHqId)?.name || 'HQ'}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  {hqs.map((hq) => {
                    const isSelected = selectedHqId === hq.id;
                    return (
                      <TouchableOpacity
                        key={hq.id}
                        activeOpacity={0.7}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setSelectedHqId(hq.id)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {hq.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Depot Selection */}
              {filteredStockers.length > 0 && (
                <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.sectionHeaderTitle}>📦 Storage / Depot:</Text>
                    {selectedStocker && (
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#64748B' }}>
                        {selectedStocker.name}
                      </Text>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {filteredStockers.length > 1 && (
                      <TouchableOpacity
                        style={[styles.chip, selectedStockerId === 'ALL_DEPOTS' && styles.chipActiveSecondary]}
                        onPress={() => setSelectedStockerId('ALL_DEPOTS')}
                      >
                        <Text style={[styles.chipText, selectedStockerId === 'ALL_DEPOTS' && styles.chipTextActive]}>
                          📦 All Depots ({filteredStockers.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                    {filteredStockers.map((stk) => {
                      const isSelected = selectedStockerId === stk.id;
                      return (
                        <TouchableOpacity
                          key={stk.id}
                          style={[styles.chip, isSelected && styles.chipActiveSecondary]}
                          onPress={() => setSelectedStockerId(stk.id)}
                        >
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                            {stk.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* 2. Medicines Inventory Cards Container */}
          <View style={styles.inventoryContainer}>
            <View style={styles.inventoryHeader}>
              <Text style={styles.inventoryTitle}>
                {viewMode === 'catalog'
                  ? `💊 All Company Medicines Catalog (${filteredInventory.length})`
                  : `📦 Available Storage Stock • ${hqs.find((h) => h.id === selectedHqId)?.name || 'HQ'} (${filteredInventory.length})`}
              </Text>
              <Text style={styles.inventorySubtitle}>
                Check medical stock availability and switch between Headquarters
              </Text>
            </View>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="🔍 Search medicine by name or code..."
              placeholderTextColor="#94A3B8"
            />

            {isLoading ? (
              <ActivityIndicator style={{ padding: 24 }} color="#1A3C6E" />
            ) : filteredInventory.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No medicines found in this storage depot.</Text>
              </View>
            ) : (
              filteredInventory.map((item) => {
                const isOutOfStock = item.quantity <= 0;
                const isLowStock = !isOutOfStock && item.status === 'Low Stock';
                const overview = hqBreakdownMap[item.medicine_id] || hqBreakdownMap[item.medicine_name.toLowerCase().trim()];
                const hasOtherHqs = overview && Array.isArray(overview.hq_breakdown) && overview.hq_breakdown.length > 1;

                return (
                  <View key={item.id} style={styles.productCard}>
                    {/* Top Row: Medicine Info on Left; Stock Quantity on Right */}
                    <View style={styles.productHeaderRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {item.medicine_name}
                        </Text>
                        <Text style={styles.productCode}>
                          Code: {item.medicine_code || 'GEN'} {item.unit ? `• ${item.unit}` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          <View style={styles.ptsBadge}>
                            <Text style={styles.ptsText}>
                              PTS: ₹{Number(item.pts_rate ?? item.price ?? 0).toFixed(2)}
                            </Text>
                          </View>
                          {item.ptr_rate != null ? (
                            <View style={styles.ptrBadge}>
                              <Text style={styles.ptrText}>
                                PTR: ₹{Number(item.ptr_rate).toFixed(2)}
                              </Text>
                            </View>
                          ) : null}
                          {item.mrp != null ? (
                            <View style={styles.mrpBadge}>
                              <Text style={styles.mrpText}>
                                MRP: ₹{Number(item.mrp).toFixed(2)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Stock Quantity & Status Badge */}
                      <View style={styles.stockQuantityContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <Text
                            style={[
                              styles.quantityNumber,
                              item.quantity < 0
                                ? { color: '#DC2626' }
                                : item.quantity === 0
                                ? { color: '#D97706' }
                                : { color: '#16A34A' },
                            ]}
                          >
                            {item.quantity}
                          </Text>
                          <Text style={styles.quantityUnit}>units</Text>
                        </View>

                        <View
                          style={[
                            styles.stockStatusBadge,
                            item.quantity < 0
                              ? { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }
                              : item.quantity === 0
                              ? { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }
                              : isLowStock
                              ? { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' }
                              : { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stockStatusText,
                              item.quantity < 0
                                ? { color: '#991B1B' }
                                : item.quantity === 0
                                ? { color: '#92400E' }
                                : isLowStock
                                ? { color: '#9A3412' }
                                : { color: '#166534' },
                            ]}
                          >
                            {item.quantity < 0
                              ? `Shortage (${item.quantity})`
                              : item.quantity === 0
                              ? 'Out of Stock'
                              : isLowStock
                              ? 'Low Stock'
                              : 'Available'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Row: Multi-HQ Stock Breakdown (Compact Wrap Chips - NEVER stretching vertically) */}
                    {hasOtherHqs && (
                      <View style={styles.crossHqContainer}>
                        <Text style={styles.crossHqLabel}>
                          🏥 Stock in Other HQs:
                        </Text>
                        <View style={styles.crossHqChipsWrap}>
                          {overview.hq_breakdown.map((hb: any) => {
                            const isCurrentHq = hb.hq_id === selectedHqId;
                            return (
                              <TouchableOpacity
                                key={hb.hq_id}
                                onPress={() => setSelectedHqId(hb.hq_id)}
                                activeOpacity={0.7}
                                style={[
                                  styles.crossHqChip,
                                  isCurrentHq
                                    ? styles.crossHqChipCurrent
                                    : hb.stock <= 0
                                    ? styles.crossHqChipOut
                                    : hb.is_low_stock
                                    ? styles.crossHqChipLow
                                    : styles.crossHqChipAvail,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.crossHqChipText,
                                    isCurrentHq
                                      ? { color: '#FFFFFF' }
                                      : hb.stock <= 0
                                      ? { color: '#991B1B' }
                                      : hb.is_low_stock
                                      ? { color: '#92400E' }
                                      : { color: '#1D4ED8' },
                                  ]}
                                >
                                  {hb.hq_name}: {hb.stock} {hb.stock <= 0 ? '(Out)' : 'units'} {isCurrentHq ? '✓' : '→'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { backgroundColor: '#1A3C6E', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  modeTabText: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#1A3C6E',
    fontWeight: '800',
  },
  filterPanel: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  chipRow: { flexDirection: 'row', marginTop: 2, marginBottom: 2 },
  chip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignSelf: 'flex-start',
  },
  chipActive: { backgroundColor: '#1A3C6E', borderColor: '#1A3C6E' },
  chipActiveSecondary: { backgroundColor: '#0F8B5A', borderColor: '#0F8B5A' },
  chipActiveTertiary: { backgroundColor: '#4338CA', borderColor: '#4338CA' },
  chipText: { fontSize: 11.5, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  inventoryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  inventoryHeader: {
    marginBottom: 10,
  },
  inventoryTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  inventorySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    marginBottom: 10,
  },
  productCard: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  productHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  productName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  productCode: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  ptsBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  ptsText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
  },
  ptrBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  ptrText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  mrpBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  mrpText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  stockQuantityContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 76,
  },
  quantityNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  quantityUnit: {
    fontSize: 10.5,
    color: '#64748B',
    marginLeft: 3,
    fontWeight: '600',
  },
  stockStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  stockStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  crossHqContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    width: '100%',
  },
  crossHqLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  crossHqChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  crossHqChip: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  crossHqChipCurrent: {
    backgroundColor: '#1A3C6E',
    borderColor: '#1A3C6E',
  },
  crossHqChipOut: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  crossHqChipLow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  crossHqChipAvail: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  crossHqChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    marginBottom: 0,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  stockerInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#64748B' },
});
