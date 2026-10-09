import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

export interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  distributor?: string;
}

export interface MobileOrder {
  id: string;
  order_number: string;
  task_id?: string;
  mr_id: string;
  mr_name: string;
  customer_name: string;
  location_name?: string;
  hq_id: string;
  hq_name: string;
  stocker_id?: string;
  stocker_name?: string;
  items: OrderItem[];
  total_units: number;
  total_amount: number;
  delivery_status: 'PENDING' | 'DELIVERED';
  delivered_at?: string;
  delivered_by_user_id?: string;
  delivery_notes?: string;
  hq_accepted: boolean;
  accepted_at?: string;
  accepted_by_user_id?: string;
  inventory_deducted: boolean;
  inventory_deducted_at?: string;
  created_at: string;
  updated_at: string;
}

interface OrdersScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserHqId?: string;
  currentUserHqName?: string;
  onBack?: () => void;
}

const COMMON_PRODUCTS = [
  { name: 'Cefixime 200mg Tablets', price: 120 },
  { name: 'Amoxicillin + Clav 625mg', price: 185 },
  { name: 'Paracetamol 650mg Tabs', price: 35 },
  { name: 'Pantoprazole 40mg DSR', price: 140 },
  { name: 'Azithromycin 500mg Tabs', price: 110 },
  { name: 'Montelukast + Levocetirizine', price: 95 },
  { name: 'Multivitamin & Zinc Syrup', price: 80 },
  { name: 'Diclofenac Gel 30g', price: 65 },
];

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  currentUserId = 'usr-mr-02',
  currentUserName = 'Aman Rathore',
  currentUserHqId = 'hq-shahdol',
  currentUserHqName = 'Shahdol HQ',
  onBack,
}) => {
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'DELIVERED' | 'ACCEPTED'>('ALL');
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // New Order Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newOrderItems, setNewOrderItems] = useState<
    Array<{ id: string; product_name: string; quantity: string; unit_price: string }>
  >([
    { id: '1', product_name: 'Cefixime 200mg Tablets', quantity: '10', unit_price: '120' },
  ]);

  const fetchOrders = useCallback(async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      // Scoped fetch: will return orders matching current user's HQ or created by this user
      const res = await fetch(`${baseUrl}/orders`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
          try {
            await AsyncStorage.setItem(
              `@ahtri_orders_cache_${currentUserId}`,
              JSON.stringify(data),
            );
          } catch {}
        }
      }
    } catch (err) {
      // Offline fallback: load cached orders
      try {
        const cached = await AsyncStorage.getItem(`@ahtri_orders_cache_${currentUserId}`);
        if (cached) {
          setOrders(JSON.parse(cached));
        }
      } catch {}
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        fetchOrders();
      }
    }, 30000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchOrders();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Toggle delivery status
  const handleToggleDelivery = async (order: MobileOrder) => {
    const nextStatus = order.delivery_status === 'DELIVERED' ? 'PENDING' : 'DELIVERED';
    const actionLabel = nextStatus === 'DELIVERED' ? 'Mark as Delivered' : 'Revert to Pending';

    Alert.alert(
      `${actionLabel}?`,
      nextStatus === 'DELIVERED'
        ? `Confirm that Order #${order.order_number} for ${order.customer_name} has been successfully delivered?\n\n• Delivery status will update to DELIVERED.\n• Target HQ (${order.hq_name}) will be notified and given the option to officially accept and count the stock.`
        : `Revert Order #${order.order_number} back to PENDING delivery?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus === 'DELIVERED' ? 'Yes, Delivered ✓' : 'Yes, Revert',
          onPress: async () => {
            setActionProcessingId(order.id);
            try {
              const baseUrl = await ApiConfig.getBaseUrl();
              const headers = await ApiConfig.getAuthHeaders();

              const res = await fetch(`${baseUrl}/orders/${order.id}/delivery`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                  delivery_status: nextStatus,
                  notes: `Updated by MR ${currentUserName}`,
                }),
              });

              if (res.ok) {
                const updated = await res.json();
                setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
                Alert.alert(
                  nextStatus === 'DELIVERED' ? 'Order Marked Delivered! 🚚' : 'Status Reverted',
                  nextStatus === 'DELIVERED'
                    ? `Order #${order.order_number} is marked as DELIVERED.\n\nOnly the target HQ (${order.hq_name}) can now accept it to start stock counting.`
                    : `Order #${order.order_number} is now marked as PENDING delivery.`,
                );
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Update Failed', err.message || 'Could not update delivery status.');
              }
            } catch (err: any) {
              Alert.alert('Network Notice', 'Could not sync delivery status to server.');
            } finally {
              setActionProcessingId(null);
            }
          },
        },
      ],
    );
  };

  // Handle direct order creation
  const handleCreateOrder = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Validation Error', 'Please enter customer or clinic name.');
      return;
    }

    const validItems = newOrderItems
      .filter((i) => (parseInt(i.quantity) || 0) > 0 && i.product_name.trim().length > 0)
      .map((i) => ({
        product_name: i.product_name.trim(),
        quantity: parseInt(i.quantity) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
        total_amount: (parseInt(i.quantity) || 1) * (parseFloat(i.unit_price) || 0),
        distributor: 'Central Stocker',
      }));

    if (validItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one product with quantity.');
      return;
    }

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_name: newCustomerName.trim(),
          location_name: newLocationName.trim() || newCustomerName.trim(),
          hq_id: currentUserHqId,
          items: validItems,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setOrders((prev) => [created, ...prev]);
        setShowCreateModal(false);
        setNewCustomerName('');
        setNewLocationName('');
        setNewOrderItems([
          { id: '1', product_name: 'Cefixime 200mg Tablets', quantity: '10', unit_price: '120' },
        ]);

        Alert.alert(
          'Order Created! 📦',
          `Order #${created.order_number} for ${created.customer_name} created successfully!\n\n• Delivery Status: PENDING\n• Inventory: NOT deducted directly\n\nYou can mark it as delivered once handed over to the client.`,
        );
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Creation Failed', err.message || 'Could not create order.');
      }
    } catch {
      Alert.alert('Error', 'Network error creating order.');
    }
  };

  // Filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Filter tab
      if (filterTab === 'PENDING' && o.delivery_status !== 'PENDING') return false;
      if (filterTab === 'DELIVERED' && o.delivery_status !== 'DELIVERED') return false;
      if (filterTab === 'ACCEPTED' && !o.hq_accepted) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = (o.order_number || '').toLowerCase().includes(q);
        const custMatch = (o.customer_name || '').toLowerCase().includes(q);
        const mrMatch = (o.mr_name || '').toLowerCase().includes(q);
        const prodMatch = (o.items || []).some((i) =>
          (i.product_name || '').toLowerCase().includes(q)
        );
        if (!numMatch && !custMatch && !mrMatch && !prodMatch) return false;
      }

      return true;
    });
  }, [orders, filterTab, searchQuery]);

  // Aggregate counts
  const pendingCount = orders.filter((o) => o.delivery_status === 'PENDING').length;
  const deliveredCount = orders.filter((o) => o.delivery_status === 'DELIVERED').length;
  const acceptedCount = orders.filter((o) => o.hq_accepted).length;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>Field Orders & Deliveries</Text>
            <Text style={styles.headerSubtitle}>
              {currentUserHqName} • {orders.length} Total Orders
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newOrderBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.newOrderBtnText}>+ New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Notice Banner explaining the workflow */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>💡</Text>
        <Text style={styles.infoBannerText}>
          Orders are NOT deducted directly from inventory. Mark an order as DELIVERED once handed over. The target HQ will then accept it and inventory counting will start.
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterTab === 'ALL' && styles.filterChipActive]}
            onPress={() => setFilterTab('ALL')}
          >
            <Text style={[styles.filterChipText, filterTab === 'ALL' && styles.filterChipTextActive]}>
              All ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterTab === 'PENDING' && styles.filterChipActiveAmber]}
            onPress={() => setFilterTab('PENDING')}
          >
            <Text style={[styles.filterChipText, filterTab === 'PENDING' && styles.filterChipTextAmber]}>
              ⏳ Pending Delivery ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterTab === 'DELIVERED' && styles.filterChipActiveGreen]}
            onPress={() => setFilterTab('DELIVERED')}
          >
            <Text style={[styles.filterChipText, filterTab === 'DELIVERED' && styles.filterChipTextGreen]}>
              🚚 Delivered ({deliveredCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterTab === 'ACCEPTED' && styles.filterChipActiveBlue]}
            onPress={() => setFilterTab('ACCEPTED')}
          >
            <Text style={[styles.filterChipText, filterTab === 'ACCEPTED' && styles.filterChipTextBlue]}>
              ✅ Accepted by HQ ({acceptedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Order #, Customer, or Medicine..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} />}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No orders match your search query.'
                : filterTab !== 'ALL'
                ? `No orders currently in ${filterTab} status.`
                : 'No orders have been recorded yet. Tap "+ New Order" to create one.'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((ord) => {
            const isDelivered = ord.delivery_status === 'DELIVERED';
            const isAccepted = ord.hq_accepted;
            const isProcessing = actionProcessingId === ord.id;

            return (
              <View key={ord.id} style={styles.orderCard}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.orderNumberRow}>
                      <Text style={styles.orderNumberText}>#{ord.order_number}</Text>
                      <View style={styles.hqPill}>
                        <Text style={styles.hqPillText}>{ord.hq_name}</Text>
                      </View>
                    </View>
                    <Text style={styles.orderDateText}>
                      Placed: {formatDateTimeDDMMYYYY(ord.created_at)}
                    </Text>
                  </View>

                  {/* Delivery Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      isDelivered ? styles.statusBadgeDelivered : styles.statusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isDelivered ? styles.statusBadgeTextDelivered : styles.statusBadgeTextPending,
                      ]}
                    >
                      {isDelivered ? '🚚 DELIVERED' : '⏳ PENDING DELIVERY'}
                    </Text>
                  </View>
                </View>

                {/* Customer / Location */}
                <View style={styles.customerBox}>
                  <Text style={styles.customerName}>{ord.customer_name}</Text>
                  {ord.location_name && (
                    <Text style={styles.customerLocation}>📍 {ord.location_name}</Text>
                  )}
                  <Text style={styles.mrTag}>By: {ord.mr_name}</Text>
                </View>

                {/* What has been ordered (Itemized list) */}
                <View style={styles.itemsSection}>
                  <Text style={styles.itemsSectionTitle}>
                    🛒 Ordered Items ({ord.items?.length || 0} products • {ord.total_units} units):
                  </Text>
                  {(ord.items || []).map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemProductName}>{item.product_name}</Text>
                        <Text style={styles.itemDistributor}>
                          {item.distributor || ord.stocker_name || 'Central Stocker'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                        <Text style={styles.itemAmount}>
                          ₹{(item.total_amount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {/* Total Value Bar */}
                  <View style={styles.totalBar}>
                    <Text style={styles.totalLabel}>Grand Total Value:</Text>
                    <Text style={styles.totalValue}>
                      ₹{(ord.total_amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* HQ Acceptance Status Notice */}
                <View
                  style={[
                    styles.acceptanceBox,
                    isAccepted ? styles.acceptanceBoxDone : styles.acceptanceBoxWait,
                  ]}
                >
                  <Text style={styles.acceptanceIcon}>{isAccepted ? '✅' : '⏸️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.acceptanceTitle,
                        isAccepted ? styles.acceptanceTitleDone : styles.acceptanceTitleWait,
                      ]}
                    >
                      {isAccepted
                        ? 'Officially Accepted by HQ'
                        : isDelivered
                        ? `Delivered • Awaiting ${ord.hq_name} Acceptance`
                        : 'Delivery Not Complete'}
                    </Text>
                    <Text style={styles.acceptanceSubtitle}>
                      {isAccepted
                        ? 'Stock count has started and inventory deducted.'
                        : isDelivered
                        ? `Only ${ord.hq_name} can accept this in their ID to start counting.`
                        : 'Stock is NOT deducted. Mark delivered when handed over.'}
                    </Text>
                  </View>
                </View>

                {/* Employee Delivery Action Button */}
                <View style={styles.actionRow}>
                  {!isDelivered ? (
                    <TouchableOpacity
                      style={styles.markDeliveredBtn}
                      onPress={() => handleToggleDelivery(ord)}
                      disabled={isProcessing}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.markDeliveredBtnText}>
                        {isProcessing ? 'Updating...' : '🚚 Mark as Delivered ✓'}
                      </Text>
                    </TouchableOpacity>
                  ) : !isAccepted ? (
                    <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                      <View style={styles.deliveredSuccessTag}>
                        <Text style={styles.deliveredSuccessTagText}>
                          ✓ Delivered {ord.delivered_at ? `(${formatTimeShort(ord.delivered_at)})` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.revertBtn}
                        onPress={() => handleToggleDelivery(ord)}
                        disabled={isProcessing}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.revertBtnText}>
                          {isProcessing ? '...' : '↩ Revert'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.lockedAcceptedTag}>
                      <Text style={styles.lockedAcceptedTagText}>
                        🔒 Accepted & Counted by {ord.hq_name}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: Create New Order */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Create New Order</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalNotice}>
                Orders will be added to the order list in PENDING status. Inventory will NOT be deducted until delivered and accepted by {currentUserHqName}.
              </Text>

              {/* Customer / Doctor name */}
              <Text style={styles.fieldLabel}>Doctor / Chemist / Clinic Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Rajesh Sharma or Apex Medical Store"
                placeholderTextColor="#94A3B8"
                value={newCustomerName}
                onChangeText={setNewCustomerName}
              />

              {/* Location */}
              <Text style={styles.fieldLabel}>Area / Location</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Saket Colony, Shahdol"
                placeholderTextColor="#94A3B8"
                value={newLocationName}
                onChangeText={setNewLocationName}
              />

              {/* Products selection */}
              <View style={styles.itemsHeaderRow}>
                <Text style={styles.fieldLabel}>Ordered Products</Text>
                <TouchableOpacity
                  onPress={() => {
                    const nextId = String(newOrderItems.length + 1);
                    setNewOrderItems((prev) => [
                      ...prev,
                      { id: nextId, product_name: COMMON_PRODUCTS[0].name, quantity: '5', unit_price: String(COMMON_PRODUCTS[0].price) },
                    ]);
                  }}
                >
                  <Text style={styles.addItemBtnText}>+ Add Product</Text>
                </TouchableOpacity>
              </View>

              {newOrderItems.map((item, idx) => (
                <View key={item.id} style={styles.modalItemRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.itemSubLabel}>Product {idx + 1}</Text>
                    <TextInput
                      style={styles.modalItemInput}
                      value={item.product_name}
                      onChangeText={(val) => {
                        setNewOrderItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, product_name: val } : i))
                        );
                      }}
                      placeholder="Medicine name"
                    />
                  </View>

                  <View style={{ width: 60, marginRight: 8 }}>
                    <Text style={styles.itemSubLabel}>Qty</Text>
                    <TextInput
                      style={[styles.modalItemInput, { textAlign: 'center' }]}
                      keyboardType="numeric"
                      value={item.quantity}
                      onChangeText={(val) => {
                        setNewOrderItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, quantity: val } : i))
                        );
                      }}
                    />
                  </View>

                  <View style={{ width: 75, marginRight: 6 }}>
                    <Text style={styles.itemSubLabel}>Price (₹)</Text>
                    <TextInput
                      style={[styles.modalItemInput, { textAlign: 'center' }]}
                      keyboardType="numeric"
                      value={item.unit_price}
                      onChangeText={(val) => {
                        setNewOrderItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, unit_price: val } : i))
                        );
                      }}
                    />
                  </View>

                  {newOrderItems.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeItemBtn}
                      onPress={() => {
                        setNewOrderItems((prev) => prev.filter((i) => i.id !== item.id));
                      }}
                    >
                      <Text style={styles.removeItemBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Quick Preset Buttons */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Quick Add Popular Medicines:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {COMMON_PRODUCTS.slice(0, 5).map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.presetChip}
                    onPress={() => {
                      setNewOrderItems((prev) => [
                        ...prev,
                        { id: String(Date.now() + i), product_name: p.name, quantity: '10', unit_price: String(p.price) },
                      ]);
                    }}
                  >
                    <Text style={styles.presetChipText}>+ {p.name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Total calculation */}
              <View style={styles.modalTotalBox}>
                <Text style={styles.modalTotalLabel}>Estimated Order Value:</Text>
                <Text style={styles.modalTotalValue}>
                  ₹
                  {newOrderItems
                    .reduce(
                      (sum, i) =>
                        sum + (parseInt(i.quantity) || 0) * (parseFloat(i.unit_price) || 0),
                      0
                    )
                    .toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleCreateOrder}
                >
                  <Text style={styles.modalSubmitBtnText}>Create Order</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function formatTimeShort(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  newOrderBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
  },
  newOrderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBannerIcon: {
    fontSize: 14,
  },
  infoBannerText: {
    fontSize: 11,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  filterRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipActiveAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  filterChipActiveGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  filterChipActiveBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextAmber: {
    color: '#B45309',
  },
  filterChipTextGreen: {
    color: '#15803D',
  },
  filterChipTextBlue: {
    color: '#1D4ED8',
  },
  searchContainer: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  clearSearchText: {
    fontSize: 13,
    color: '#94A3B8',
    padding: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 14,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 10,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
  },
  hqPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  hqPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
  },
  orderDateText: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusBadgeDelivered: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextPending: {
    color: '#B45309',
  },
  statusBadgeTextDelivered: {
    color: '#15803D',
  },
  customerBox: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerLocation: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  mrTag: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  itemsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 10,
  },
  itemsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemProductName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemDistributor: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  itemQuantity: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  itemAmount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F8B5A',
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#CBD5E1',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F8B5A',
  },
  acceptanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  acceptanceBoxDone: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  acceptanceBoxWait: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  acceptanceIcon: {
    fontSize: 14,
  },
  acceptanceTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  acceptanceTitleDone: {
    color: '#1E40AF',
  },
  acceptanceTitleWait: {
    color: '#475569',
  },
  acceptanceSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markDeliveredBtn: {
    backgroundColor: '#0F8B5A',
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#0F8B5A',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  markDeliveredBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  deliveredSuccessTag: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    justifyContent: 'center',
  },
  deliveredSuccessTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  revertBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  revertBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  lockedAcceptedTag: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockedAcceptedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    padding: 4,
  },
  modalNotice: {
    fontSize: 11,
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  addItemBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemSubLabel: {
    fontSize: 9.5,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '600',
  },
  modalItemInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  removeItemBtn: {
    padding: 6,
    marginTop: 14,
  },
  removeItemBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 10.5,
    color: '#334155',
    fontWeight: '600',
  },
  modalTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  modalTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  modalTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F8B5A',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#0F8B5A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
