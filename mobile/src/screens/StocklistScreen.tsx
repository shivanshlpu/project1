import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';

interface StocklistScreenProps {
  currentUserId?: string;
  currentUserName?: string;
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
  price: number;
  quantity: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock' | 'In Stock' | 'Inactive';
  stocker_name?: string;
  hq_name?: string;
  low_stock_threshold?: number;
}

const DEFAULT_AREAS_BY_HQ: Record<string, string[]> = {
  'hq-delhi': [
    'Saket',
    'Hauz Khas',
    'Green Park',
    'South Extension',
    'Malviya Nagar',
  ],
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
    medicine_name: 'CardioFix-50 (Telmisartan 40mg)',
    medicine_code: 'CF-50',
    unit: 'Box of 10x10',
    price: 180,
    quantity: 60,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-02',
    medicine_id: 'med-02',
    medicine_name: 'CardioFix-AM (Telmisartan + Amlodipine)',
    medicine_code: 'CF-AM',
    unit: 'Box of 10x10',
    price: 220,
    quantity: 45,
    low_stock_threshold: 15,
    status: 'In Stock',
  },
  {
    id: 'med-03',
    medicine_id: 'med-03',
    medicine_name: 'DermaSoothe Cream 30g',
    medicine_code: 'DS-30',
    unit: 'Tube',
    price: 210,
    quantity: 40,
    low_stock_threshold: 10,
    status: 'In Stock',
  },
  {
    id: 'med-04',
    medicine_id: 'med-04',
    medicine_name: 'Glucotrol-M (Metformin 500mg)',
    medicine_code: 'GM-500',
    unit: 'Box of 10x10',
    price: 145,
    quantity: 85,
    low_stock_threshold: 20,
    status: 'In Stock',
  },
  {
    id: 'med-05',
    medicine_id: 'med-05',
    medicine_name: 'AhtriCef-O 200mg (Cefixime)',
    medicine_code: 'ACO-200',
    unit: 'Strip of 10',
    price: 165,
    quantity: 55,
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

export const StocklistScreen: React.FC<StocklistScreenProps> = ({
  currentUserId = 'usr-mr-02',
  currentUserName = 'Aman Rathore',
  onBack,
}) => {
  const [hqs, setHqs] = useState<Array<{ id: string; name: string }>>([
    { id: 'HQ-SHD-001', name: 'Shahdol' },
    { id: 'HQ-KOT-001', name: 'Kotma' },
    { id: 'HQ-AMB-001', name: 'Ambikapur' },
  ]);

  const [selectedHqId, setSelectedHqId] = useState<string>('HQ-SHD-001');
  const [selectedSubArea, setSelectedSubArea] = useState<string>('ALL');
  const [availableAreas, setAvailableAreas] = useState<string[]>(DEFAULT_AREAS_BY_HQ['hq-delhi'] || []);
  const [stockers, setStockers] = useState<StockerItem[]>([]);
  const [selectedStockerId, setSelectedStockerId] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryProductItem[]>([]);
  const [companyCatalog, setCompanyCatalog] = useState<InventoryProductItem[]>(MASTER_COMPANY_MEDICINES);
  const [viewMode, setViewMode] = useState<'stockist' | 'catalog'>('stockist');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch Master Company Medicines Catalog
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders(currentUserId);
        const res = await fetch(`${baseUrl}/inventory/medicines`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const mapped: InventoryProductItem[] = list.map((m: any) => ({
              id: m.id,
              medicine_id: m.id,
              medicine_name: m.name,
              medicine_code: m.code || m.product_code || 'MED',
              unit: m.unit || 'Pack',
              price: m.base_price || 150,
              quantity: 50,
              low_stock_threshold: 10,
              status: m.status === 'ACTIVE' ? 'In Stock' : 'Inactive',
            }));
            setCompanyCatalog(mapped);
          }
        }
      } catch {}
    })();
  }, [currentUserId]);

  // 1. Fetch HQs (Excluding sub-areas like Jaisinghnagar or Burhar)
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
              if (!filtered.some((h) => h.id === selectedHqId)) {
                setSelectedHqId(filtered[0].id);
              }
            }
          }
        }
      } catch {}
    })();
  }, []);

  // 2. Fetch stockers and sub-areas under selected HQ
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();

        // Sub-areas for this HQ
        const areasRes = await fetch(`${baseUrl}/inventory/areas?hq_id=${selectedHqId}`, { headers }).catch(() => null);
        let dynamicAreas: string[] = [];
        if (areasRes && areasRes.ok) {
          const areasData = await areasRes.json();
          if (Array.isArray(areasData) && areasData.length > 0) {
            dynamicAreas = areasData.map((a: any) => (typeof a === 'string' ? a : a.name || a.area_name)).filter(Boolean);
          }
        }
        const defaultAreas = DEFAULT_AREAS_BY_HQ[selectedHqId] || [];
        const mergedAreas = Array.from(new Set([...dynamicAreas, ...defaultAreas]));
        setAvailableAreas(mergedAreas);

        // Stockers for this HQ
        const res = await fetch(`${baseUrl}/inventory/stockers?hq_id=${selectedHqId}`, { headers });
        if (res.ok) {
          const list: StockerItem[] = await res.json();
          if (Array.isArray(list)) {
            setStockers(list);
            // Collect any custom sub_areas from stockers
            list.forEach((s) => {
              if (s.sub_area && !mergedAreas.includes(s.sub_area)) {
                mergedAreas.push(s.sub_area);
              }
            });
            setAvailableAreas([...mergedAreas]);
          }
        }
      } catch {}
    })();
  }, [selectedHqId]);

  // Dynamic filter of stockers by chosen sub-area
  const filteredStockers = stockers.filter((stk) => {
    if (selectedSubArea === 'ALL') return true;
    return (stk.sub_area || '').toLowerCase() === selectedSubArea.toLowerCase();
  });

  // Auto-select active stocker when filter changes
  useEffect(() => {
    if (filteredStockers.length > 0) {
      if (!filteredStockers.some((s) => s.id === selectedStockerId)) {
        setSelectedStockerId(filteredStockers[0].id);
      }
    } else {
      setSelectedStockerId('');
      setInventory([]);
    }
  }, [selectedSubArea, stockers]);

  // 3. Fetch inventory for selected stocker
  useEffect(() => {
    if (!selectedStockerId) return;
    (async () => {
      setIsLoading(true);
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/stockers/${selectedStockerId}/inventory`, { headers });
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            setInventory(items);
          }
        }
      } catch {} finally {
        setIsLoading(false);
      }
    })();
  }, [selectedStockerId]);

  // If in catalog mode, or if stockist inventory is empty, show master company medicines
  const sourceInventory =
    viewMode === 'catalog'
      ? companyCatalog
      : inventory.length > 0
      ? inventory
      : companyCatalog;

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
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'stockist' && styles.modeTabActive]}
            onPress={() => setViewMode('stockist')}
          >
            <Text style={[styles.modeTabText, viewMode === 'stockist' && styles.modeTabTextActive]}>
              📦 By Stockist
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
        </View>
      </View>

      {/* 1. HQ Selector (§10 & §14) - Optional if in catalog mode */}
      {viewMode === 'stockist' && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>1. Select Headquarters (HQ):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {hqs.map((hq) => {
              const isSelected = selectedHqId === hq.id;
              return (
                <TouchableOpacity
                  key={hq.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => {
                    setSelectedHqId(hq.id);
                    setSelectedSubArea('ALL');
                  }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {hq.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 2. Sub-Area / Tehsil / Market Filter */}
      {viewMode === 'stockist' && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>2. Select Sub-Area / Market / Tehsil:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, selectedSubArea === 'ALL' && styles.chipActiveTertiary]}
              onPress={() => setSelectedSubArea('ALL')}
            >
              <Text style={[styles.chipText, selectedSubArea === 'ALL' && styles.chipTextActive]}>
                All Areas ({stockers.length})
              </Text>
            </TouchableOpacity>
            {availableAreas.map((area) => {
              const isSelected = selectedSubArea.toLowerCase() === area.toLowerCase();
              const count = stockers.filter((s) => (s.sub_area || '').toLowerCase() === area.toLowerCase()).length;
              return (
                <TouchableOpacity
                  key={area}
                  style={[styles.chip, isSelected && styles.chipActiveTertiary]}
                  onPress={() => setSelectedSubArea(area)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    📍 {area} {count > 0 ? `(${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 3. Stocker Selector under HQ & Sub-Area (§14) */}
      {viewMode === 'stockist' && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            3. Select Stocker / Distributor Depot:
            {selectedSubArea !== 'ALL' ? ` (${selectedSubArea})` : ''}
          </Text>
          {filteredStockers.length === 0 ? (
            <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', paddingVertical: 6 }}>
              No stockers registered in {selectedSubArea === 'ALL' ? 'this HQ' : selectedSubArea} yet. Showing company catalog below.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
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
          )}

          {selectedStocker && (
            <View style={styles.stockerInfoBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1E293B', flex: 1 }}>
                  📦 {selectedStocker.name}
                </Text>
                {selectedStocker.sub_area ? (
                  <View style={{ backgroundColor: '#E0E7FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#3730A3' }}>
                      📍 {selectedStocker.sub_area}
                    </Text>
                  </View>
                ) : null}
              </View>
              {selectedStocker.contact_person ? (
                <Text style={{ fontSize: 10.5, color: '#475569', marginTop: 3 }}>
                  Contact: {selectedStocker.contact_person} {selectedStocker.phone ? `(${selectedStocker.phone})` : ''}
                </Text>
              ) : null}
              {selectedStocker.address ? (
                <Text style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
                  {selectedStocker.address}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      )}

      {/* 4. Medicines Inventory Table / Cards (§12, §14, §17) */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.cardLabel}>
            {viewMode === 'catalog'
              ? `💊 All Company Medicines Catalog (${filteredInventory.length})`
              : `📦 Available Stockist Medicines (${filteredInventory.length})`}
          </Text>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 Search medicine by name or code..."
          placeholderTextColor="#94A3B8"
        />

        {isLoading ? (
          <ActivityIndicator style={{ padding: 20 }} color="#1A3C6E" />
        ) : filteredInventory.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No medicines found in this stocker's inventory.</Text>
          </View>
        ) : (
          filteredInventory.map((item) => {
            const isOutOfStock = item.quantity <= 0;
            const isLowStock = !isOutOfStock && item.status === 'Low Stock';

            return (
              <View key={item.id} style={styles.productCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.medicine_name}</Text>
                  <Text style={styles.productCode}>
                    Code: {item.medicine_code} • {item.unit}
                  </Text>
                  <Text style={styles.productPrice}>₹{item.price.toLocaleString()} per unit</Text>
                </View>

                {/* Stock Quantity & Status Badge (§17) */}
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text
                      style={[
                        styles.quantityNumber,
                        item.quantity < 0
                          ? { color: '#B91C1C' }
                          : item.quantity === 0
                          ? { color: '#D97706' }
                          : { color: '#15803D' },
                      ]}
                    >
                      {item.quantity}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748B', marginLeft: 2 }}>units</Text>
                  </View>

                  <View
                    style={[
                      styles.stockStatusBadge,
                      item.quantity < 0
                        ? { backgroundColor: '#FEE2E2' }
                        : item.quantity === 0
                        ? { backgroundColor: '#FEF3C7' }
                        : isLowStock
                        ? { backgroundColor: '#FFEDD5' }
                        : { backgroundColor: '#DCFCE7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockStatusText,
                        item.quantity < 0
                          ? { color: '#B91C1C' }
                          : item.quantity === 0
                          ? { color: '#B45309' }
                          : isLowStock
                          ? { color: '#C2410C' }
                          : { color: '#15803D' },
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
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { backgroundColor: '#1A3C6E', padding: 16 },
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
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: { backgroundColor: '#1A3C6E', borderColor: '#1A3C6E' },
  chipActiveSecondary: { backgroundColor: '#0F8B5A', borderColor: '#0F8B5A' },
  chipActiveTertiary: { backgroundColor: '#4338CA', borderColor: '#4338CA' },
  chipText: { fontSize: 11.5, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  stockerInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 10,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productName: { fontSize: 12.5, fontWeight: '800', color: '#0F172A' },
  productCode: { fontSize: 10.5, color: '#64748B', marginTop: 1 },
  productPrice: { fontSize: 11, fontWeight: '700', color: '#1A3C6E', marginTop: 2 },
  quantityNumber: { fontSize: 15, fontWeight: '900' },
  stockStatusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, marginTop: 3 },
  stockStatusText: { fontSize: 9.5, fontWeight: '800' },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#64748B' },
});
