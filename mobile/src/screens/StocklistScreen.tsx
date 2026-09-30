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
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  stocker_name: string;
  hq_name: string;
}

export const StocklistScreen: React.FC<StocklistScreenProps> = ({
  currentUserId = 'usr-mr-01',
  currentUserName = 'Rahul Sharma',
  onBack,
}) => {
  const [hqs, setHqs] = useState<Array<{ id: string; name: string }>>([
    { id: 'hq-shahdol', name: 'Shahdol' },
    { id: 'hq-jaisinghnagar', name: 'Jaisinghnagar' },
    { id: 'hq-burhar', name: 'Burhar/Bauhari' },
    { id: 'hq-ambikapur', name: 'Ambikapur' },
    { id: 'hq-bilaspur', name: 'Bilaspur' },
    { id: 'hq-kotma', name: 'Kotma' },
  ]);

  const [selectedHqId, setSelectedHqId] = useState<string>('hq-shahdol');
  const [stockers, setStockers] = useState<StockerItem[]>([]);
  const [selectedStockerId, setSelectedStockerId] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryProductItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Fetch HQs
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/hqs`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setHqs(list);
            if (!list.some((h) => h.id === selectedHqId)) {
              setSelectedHqId(list[0].id);
            }
          }
        }
      } catch {}
    })();
  }, []);

  // 2. Fetch stockers under selected HQ
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/stockers?hq_id=${selectedHqId}`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            setStockers(list);
            if (list.length > 0) {
              setSelectedStockerId(list[0].id);
            } else {
              setSelectedStockerId('');
              setInventory([]);
            }
          }
        }
      } catch {}
    })();
  }, [selectedHqId]);

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

  const filteredInventory = inventory.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.medicine_name.toLowerCase().includes(q) ||
      (item.medicine_code && item.medicine_code.toLowerCase().includes(q))
    );
  });

  const selectedStocker = stockers.find((s) => s.id === selectedStockerId);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#93C5FD', fontWeight: '700', fontSize: 13 }}>← Back to More Menu</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Point-of-Care Stocklist</Text>
        <Text style={styles.headerSub}>
          {currentUserName} • Field Inventory Lookup
        </Text>
      </View>

      {/* 1. HQ Selector (§10 & §14) */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>1. Select Headquarters (HQ):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {hqs.map((hq) => {
            const isSelected = selectedHqId === hq.id;
            return (
              <TouchableOpacity
                key={hq.id}
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

      {/* 2. Stocker Selector under HQ (§14) */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>2. Select Stocker / Distributor Depot:</Text>
        {stockers.length === 0 ? (
          <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>
            No stockers registered under this HQ yet.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {stockers.map((stk) => {
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
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>
              📍 {selectedStocker.name}
            </Text>
            {selectedStocker.contact_person ? (
              <Text style={{ fontSize: 10.5, color: '#475569', marginTop: 2 }}>
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

      {/* 3. Medicines Inventory Table / Cards (§12, §14, §17) */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.cardLabel}>
            3. Available Medicines ({filteredInventory.length})
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
