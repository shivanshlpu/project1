import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { sqliteQueue } from '../services/sqliteQueue';

export interface OrderItem {
  id: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  distributor: string;
}

const CATALOG_SUGGESTIONS = [
  { name: 'CardioFix-50 (Telmisartan 40mg)', price: '180' },
  { name: 'CardioFix-AM (Telmisartan + Amlodipine)', price: '220' },
  { name: 'DermaSoothe Cream 30g', price: '210' },
  { name: 'Glucotrol-M (Metformin 500mg)', price: '145' },
  { name: 'PanSafe-DSR Capsules', price: '160' },
  { name: 'NeuroCalm-B12 Tablets', price: '240' },
];

export const DoctorVisitScreen: React.FC = () => {
  const [samplesCount, setSamplesCount] = useState<number>(5);
  const [remarks, setRemarks] = useState<string>(
    'Presented CardioFix-50 clinical brochure. Doctor requested 25 commercial packs via MedPlus Saket.',
  );
  const [followUpDate, setFollowUpDate] = useState<string>('15-09-2026');

  // Multiple Orders State
  const [orders, setOrders] = useState<OrderItem[]>([
    {
      id: 'ord-1',
      productName: 'CardioFix-50 (Telmisartan 40mg)',
      quantity: '25',
      unitPrice: '180',
      distributor: 'MedPlus Pharmacy Saket',
    },
  ]);

  const handleAddOrder = () => {
    const nextIndex = orders.length + 1;
    const defaultDistributor = orders[0]?.distributor || 'MedPlus Pharmacy Saket';
    const suggestion = CATALOG_SUGGESTIONS[orders.length % CATALOG_SUGGESTIONS.length];

    setOrders([
      ...orders,
      {
        id: `ord-${Date.now()}-${nextIndex}`,
        productName: suggestion.name,
        quantity: '10',
        unitPrice: suggestion.price,
        distributor: defaultDistributor,
      },
    ]);
  };

  const handleRemoveOrder = (id: string) => {
    if (orders.length <= 1) {
      // If only 1 order left, just clear it
      setOrders([
        {
          id: `ord-${Date.now()}`,
          productName: '',
          quantity: '0',
          unitPrice: '0',
          distributor: orders[0]?.distributor || 'MedPlus Pharmacy Saket',
        },
      ]);
      return;
    }
    setOrders(orders.filter((o) => o.id !== id));
  };

  const handleUpdateOrder = (id: string, field: keyof OrderItem, value: string) => {
    setOrders(
      orders.map((o) => {
        if (o.id !== id) return o;
        const updated = { ...o, [field]: value };
        // If product chosen matches a catalog suggestion, auto-fill standard price
        if (field === 'productName') {
          const matched = CATALOG_SUGGESTIONS.find((c) => c.name === value);
          if (matched && (!o.unitPrice || o.unitPrice === '0' || o.unitPrice === '180')) {
            updated.unitPrice = matched.price;
          }
        }
        return updated;
      }),
    );
  };

  const handleSelectCatalogItem = (orderId: string, item: { name: string; price: string }) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, productName: item.name, unitPrice: item.price }
          : o,
      ),
    );
  };

  // Totals Calculation
  const validOrders = orders.filter((o) => (parseInt(o.quantity) || 0) > 0 && o.productName.trim().length > 0);
  const totalUnits = validOrders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
  const grandTotal = validOrders.reduce(
    (sum, o) => sum + (parseInt(o.quantity) || 0) * (parseFloat(o.unitPrice) || 0),
    0,
  );

  const handleSaveVisit = async () => {
    const formattedOrders = validOrders.map((o) => ({
      product_name: o.productName,
      quantity: parseInt(o.quantity) || 0,
      unit_price: parseFloat(o.unitPrice) || 0,
      total_amount: (parseInt(o.quantity) || 0) * (parseFloat(o.unitPrice) || 0),
      distributor: o.distributor,
    }));

    await sqliteQueue.enqueueDraft('visit_drafts', {
      doctor_id: 'doc-01',
      start_time: new Date().toISOString(),
      samples_given: samplesCount,
      remarks,
      follow_up_date: followUpDate,
      orders: formattedOrders,
      order: formattedOrders[0] || null, // Backward compatibility
      total_order_value: grandTotal,
      total_units: totalUnits,
      start_lat: 28.5245,
      start_lng: 77.2066,
    });

    Alert.alert(
      'Visit & Orders Logged',
      `Visit outcome and ${formattedOrders.length} orders (${totalUnits} units, total value ₹${grandTotal.toLocaleString()}) recorded and queued for server sync.\n\n* Note: Signature requirement has been disabled per company policy.`,
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Doctor Detailing & Immediate Orders</Text>
        <Text style={styles.subtitle}>Dr. Rajesh Sharma • Apex Heart Centre</Text>

        {/* Product Focus */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Primary Detailing Product:</Text>
          <Text style={styles.productBadge}>CardioFix-50 (Telmisartan 40mg + Amlodipine 5mg)</Text>
        </View>

        {/* Sample Units */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Sample Units Given:</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setSamplesCount(Math.max(0, samplesCount - 1))}
            >
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{samplesCount} Strips</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setSamplesCount(samplesCount + 1)}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Doctor Feedback / Discussion Remarks */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Doctor Feedback / Visit Outcome:</Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={3}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Record doctor response, interest level, prescribing habits..."
          />
        </View>

        {/* Follow-up Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Next Follow-up Date:</Text>
          <TextInput
            style={styles.input}
            value={followUpDate}
            onChangeText={setFollowUpDate}
            placeholder="DD-MM-YYYY"
          />
        </View>

        {/* IMMEDIATE MULTIPLE ORDERS SECTION */}
        <View style={styles.orderSection}>
          <View style={styles.orderHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.orderSectionTitle}>Immediate Order Taking</Text>
              <Text style={styles.orderSectionSub}>
                Book multiple products & stockist orders directly on-site
              </Text>
            </View>
            <TouchableOpacity style={styles.addOrderHeaderBtn} onPress={handleAddOrder}>
              <Text style={styles.addOrderHeaderBtnText}>+ Add Product</Text>
            </TouchableOpacity>
          </View>

          {/* List of Orders */}
          {orders.map((order, index) => {
            const itemQty = parseInt(order.quantity) || 0;
            const itemPrice = parseFloat(order.unitPrice) || 0;
            const itemTotal = itemQty * itemPrice;

            return (
              <View key={order.id} style={styles.orderItemCard}>
                {/* Item Card Header */}
                <View style={styles.itemHeader}>
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>Order #{index + 1}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.itemSubtotal}>₹{itemTotal.toLocaleString()}</Text>
                    {orders.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveOrder(order.id)}
                      >
                        <Text style={styles.removeBtnText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Product Name Input */}
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.subLabel}>Product Ordered</Text>
                  <TextInput
                    style={styles.input}
                    value={order.productName}
                    onChangeText={(val) => handleUpdateOrder(order.id, 'productName', val)}
                    placeholder="Enter or select medicine name"
                  />
                </View>

                {/* Quick Catalog Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsScroll}
                  contentContainerStyle={{ paddingRight: 16 }}
                >
                  {CATALOG_SUGGESTIONS.map((catItem, cIdx) => (
                    <TouchableOpacity
                      key={cIdx}
                      style={[
                        styles.chip,
                        order.productName === catItem.name && styles.chipActive,
                      ]}
                      onPress={() => handleSelectCatalogItem(order.id, catItem)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          order.productName === catItem.name && styles.chipTextActive,
                        ]}
                      >
                        {catItem.name.split(' (')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Quantity and Price */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>Quantity (Units)</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() =>
                          handleUpdateOrder(
                            order.id,
                            'quantity',
                            String(Math.max(1, (parseInt(order.quantity) || 1) - 5)),
                          )
                        }
                      >
                        <Text style={styles.qtyBtnText}>-5</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.input, styles.qtyInput]}
                        value={order.quantity}
                        onChangeText={(val) => handleUpdateOrder(order.id, 'quantity', val)}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() =>
                          handleUpdateOrder(
                            order.id,
                            'quantity',
                            String((parseInt(order.quantity) || 0) + 5),
                          )
                        }
                      >
                        <Text style={styles.qtyBtnText}>+5</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>Unit Price (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={order.unitPrice}
                      onChangeText={(val) => handleUpdateOrder(order.id, 'unitPrice', val)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Distributor / Chemist Partner */}
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.subLabel}>Distributor / Chemist Partner</Text>
                  <TextInput
                    style={styles.input}
                    value={order.distributor}
                    onChangeText={(val) => handleUpdateOrder(order.id, 'distributor', val)}
                    placeholder="e.g. MedPlus Pharmacy Saket"
                  />
                </View>
              </View>
            );
          })}

          {/* Add Another Product Button */}
          <TouchableOpacity style={styles.addOrderDashedBtn} onPress={handleAddOrder}>
            <Text style={styles.addOrderDashedBtnText}>+ Add Another Order Item</Text>
          </TouchableOpacity>

          {/* Grand Total Row */}
          <View style={styles.grandTotalContainer}>
            <View>
              <Text style={styles.grandTotalSub}>
                {validOrders.length} {validOrders.length === 1 ? 'Product' : 'Products'} • {totalUnits} Total Units
              </Text>
              <Text style={styles.grandTotalLabel}>Grand Total Order Value:</Text>
            </View>
            <Text style={styles.grandTotalValue}>₹{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveVisit}>
          <Text style={styles.submitBtnText}>
            Submit Visit & Send {validOrders.length > 1 ? `${validOrders.length} Orders` : 'Order'} (₹{grandTotal.toLocaleString()})
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA', padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 30,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  subLabel: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  productBadge: {
    backgroundColor: '#EFF6FF',
    color: '#1E40AF',
    padding: 8,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  counterBtnText: { fontSize: 18, fontWeight: '700', color: '#334155' },
  counterValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  orderSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderSectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  orderSectionSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
  addOrderHeaderBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOrderHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  orderItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
    marginBottom: 6,
  },
  itemBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730A3',
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  removeBtnText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  chipsScroll: {
    marginTop: 6,
    marginBottom: 2,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qtyBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  qtyInput: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  addOrderDashedBtn: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginTop: 4,
    marginBottom: 10,
  },
  addOrderDashedBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
  },
  grandTotalSub: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14532D',
    marginTop: 2,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
  },
  submitBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 13,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
