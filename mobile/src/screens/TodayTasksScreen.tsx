import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { DistanceIndicator } from '../components/DistanceIndicator';
import { LocationService } from '../services/locationService';
import { CameraService, PhotoResult } from '../services/cameraService';
import { ApiConfig } from '../services/apiConfig';

export interface MobileTaskItem {
  id: string;
  title: string;
  date: string;
  time: string;
  assigned_mr_id: string;
  assigned_mr_name: string;
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number; // SECRET TRACKED (NOT DISPLAYED TO MR)
  outcome?: string;
  orders?: Array<{ product_name: string; quantity: number; unit_price: number; total_amount: number }>;
  suspended_at?: string;
  suspended_reason?: string;
}

interface TodayTasksScreenProps {
  currentUserId?: string;
  currentUserName?: string;
}

export const TodayTasksScreen: React.FC<TodayTasksScreenProps> = ({
  currentUserId = 'usr-mr-01',
  currentUserName = 'Rahul Sharma',
}) => {
  // All system tasks across MRs
  const [allTasks, setAllTasks] = useState<MobileTaskItem[]>([
    {
      id: 'task-01',
      title: 'Dr. Rajesh Sharma Detailing',
      date: '2026-09-06',
      time: '10:30 AM',
      assigned_mr_id: 'usr-mr-01', // Rahul Sharma
      assigned_mr_name: 'Rahul Sharma',
      location_name: 'Apex Heart Centre',
      address: 'Ring Road, Saket, South Delhi',
      latitude: 28.5245,
      longitude: 77.2066,
      geofence_radius_m: 50,
      priority: 'HIGH',
      status: 'ASSIGNED',
    },
    {
      id: 'task-02',
      title: 'Dr. Priya Verma Evening Visit',
      date: '2026-09-06',
      time: '05:00 PM',
      assigned_mr_id: 'usr-mr-01', // Rahul Sharma
      assigned_mr_name: 'Rahul Sharma',
      location_name: 'Little Care Clinic',
      address: 'Green Park Extension, New Delhi',
      latitude: 28.5585,
      longitude: 77.2028,
      geofence_radius_m: 50,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
    },
    {
      id: 'task-03',
      title: 'Max Super Specialty Hospital Detailing',
      date: '2026-09-06',
      time: '12:15 PM',
      assigned_mr_id: 'usr-mr-02', // Vikram Malhotra
      assigned_mr_name: 'Vikram Malhotra',
      location_name: 'Max Super Specialty Hospital',
      address: 'Press Enclave Marg, Saket',
      latitude: 28.5282,
      longitude: 77.2124,
      geofence_radius_m: 60,
      priority: 'HIGH',
      status: 'ASSIGNED',
    },
    {
      id: 'task-04',
      title: 'Dr. Anita Desai Follow-up Call',
      date: '2026-09-06',
      time: '02:30 PM',
      assigned_mr_id: 'usr-mr-03', // Pooja Verma
      assigned_mr_name: 'Pooja Verma',
      location_name: 'Skin Care Centre',
      address: 'Hauz Khas, New Delhi',
      latitude: 28.5494,
      longitude: 77.2001,
      geofence_radius_m: 40,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
    },
  ]);

  // Live GPS Tracking & Sensor Parameters
  const [currentDistance, setCurrentDistance] = useState<number>(14.5); // meters from clinic
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(12); // ±12m accuracy
  const [isReadingGps, setIsReadingGps] = useState<boolean>(false);
  const [liveGpsInfo, setLiveGpsInfo] = useState<string | null>(null);

  // Completion Modal & Camera State
  const [completingTask, setCompletingTask] = useState<MobileTaskItem | null>(null);
  const [visitPhoto, setVisitPhoto] = useState<PhotoResult | null>(null);
  const [visitOutcome, setVisitOutcome] = useState('Reviewed CardioFix-50 scheme. Doctor will prescribe for 20 patients.');
  // Multi-Order State for Task Completion
  const [modalOrders, setModalOrders] = useState<
    Array<{
      id: string;
      product_name: string;
      quantity: string;
      unit_price: string;
      distributor: string;
    }>
  >([
    {
      id: '1',
      product_name: 'CardioFix-50 (Telmisartan 40mg)',
      quantity: '25',
      unit_price: '180',
      distributor: 'MedPlus Saket',
    },
  ]);

  const handleAddModalOrder = () => {
    const nextIdx = modalOrders.length + 1;
    const defaultDist = modalOrders[0]?.distributor || 'MedPlus Saket';
    const suggestions = [
      { name: 'CardioFix-AM (Telmisartan + Amlodipine)', price: '220' },
      { name: 'DermaSoothe Cream 30g', price: '210' },
      { name: 'Glucotrol-M (Metformin 500mg)', price: '145' },
      { name: 'PanSafe-DSR Capsules', price: '160' },
    ];
    const suggestion = suggestions[(nextIdx - 2) % suggestions.length];
    setModalOrders([
      ...modalOrders,
      {
        id: `mord-${Date.now()}-${nextIdx}`,
        product_name: suggestion.name,
        quantity: '10',
        unit_price: suggestion.price,
        distributor: defaultDist,
      },
    ]);
  };

  const handleRemoveModalOrder = (id: string) => {
    if (modalOrders.length <= 1) {
      setModalOrders([
        {
          id: `mord-${Date.now()}`,
          product_name: '',
          quantity: '0',
          unit_price: '0',
          distributor: modalOrders[0]?.distributor || 'MedPlus Saket',
        },
      ]);
      return;
    }
    setModalOrders(modalOrders.filter((o) => o.id !== id));
  };

  const handleUpdateModalOrder = (id: string, field: string, val: string) => {
    setModalOrders(
      modalOrders.map((o) => (o.id === id ? { ...o, [field]: val } : o)),
    );
  };
  // STRICT FILTERING: Only show tasks assigned to this logged-in member!
  const myTasks = allTasks.filter((t) => t.assigned_mr_id === currentUserId);

  // Live Auto-Fetch from Backend Server (§4.1 Sync with Owner Assignments)
  const fetchTasksFromBackend = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/tasks?mr_id=${currentUserId}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: MobileTaskItem[] = data.map((t: any) => ({
            id: t.id,
            title: t.title,
            date: t.date,
            time: t.time,
            assigned_mr_id: t.assigned_mr_id,
            assigned_mr_name: t.assigned_mr_name || currentUserName,
            location_name: t.location_name || 'Designated Clinic',
            address: t.address || t.location_name || 'Delhi Territory',
            latitude: t.latitude,
            longitude: t.longitude,
            geofence_radius_m: t.geofence_radius_m || 50,
            priority: t.priority || 'MEDIUM',
            status: t.status,
            started_at: t.started_at,
            completed_at: t.completed_at,
            outcome: t.outcome,
            orders: t.orders,
            suspended_at: t.suspended_at,
            suspended_reason: t.suspended_reason,
          }));
          setAllTasks(mapped);
        }
      }
    } catch (err) {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchTasksFromBackend();
    const interval = setInterval(fetchTasksFromBackend, 4000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Read Live Hardware GPS from phone sensor
  const handleReadLiveGPS = async (targetTask?: MobileTaskItem) => {
    setIsReadingGps(true);
    try {
      const coords = await LocationService.getCurrentLocation();
      if (coords) {
        const accuracy = coords.accuracy ? Math.round(coords.accuracy) : 10;
        setGpsAccuracy(accuracy);
        const refTask = targetTask || myTasks[0];
        if (refTask) {
          const dist = LocationService.calculateDistanceMeters(
            coords.latitude,
            coords.longitude,
            refTask.latitude,
            refTask.longitude
          );
          setCurrentDistance(dist);
          setLiveGpsInfo(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (±${accuracy}m)`);
          Alert.alert(
            'GPS Sensor Synced',
            `Current Device GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}\nDistance to ${refTask.location_name}: ${dist} meters\nAccuracy: ±${accuracy}m`
          );
        }
      } else {
        Alert.alert('GPS Notice', 'Could not obtain GPS lock. Please ensure Location Permissions and GPS are enabled.');
      }
    } catch (err: any) {
      Alert.alert('Location Error', err?.message || 'Failed to read device GPS.');
    } finally {
      setIsReadingGps(false);
    }
  };

  // Capture Live Doctor / Clinic Proof Photo via Camera
  const handleCaptureVisitPhoto = async () => {
    const photo = await CameraService.captureLivePhoto({
      aspect: [4, 3],
      quality: 0.8,
    });
    if (photo) {
      setVisitPhoto(photo);
      Alert.alert('Photo Attached', 'Clinic detailing proof photo recorded.');
    }
  };

  // Open Google Maps Directions
  const handleGetDirections = (task: MobileTaskItem) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open Google Maps');
    });
  };

  // Start Task (Geofence Enforced + Suspension Guard)
  const handleStartTask = async (task: MobileTaskItem) => {
    if (task.status === 'SUSPENDED') {
      Alert.alert(
        'TASK SUSPENDED',
        `Scheduled date (${task.date}) has passed without visit completion. This task is locked by company administration.\n\nOnly Owner (Shivansh Tiwari) can unsuspend it so you can complete this task.`
      );
      return;
    }

    if (currentDistance > task.geofence_radius_m) {
      Alert.alert(
        'Geofence Rejected',
        `You are ${Math.round(currentDistance)}m away from ${task.location_name}. You must be physically within ${task.geofence_radius_m}m to start this visit.`
      );
      return;
    }
    if (gpsAccuracy > 50) {
      Alert.alert(
        'Poor GPS Fix',
        `GPS accuracy is ±${gpsAccuracy}m. Move to open sky for a fix <= 50m.`
      );
      return;
    }

    // Record start timestamp silently in background (NO TIMER SHOWN TO MR)
    const startTime = new Date().toISOString();
    setAllTasks(
      allTasks.map((t) =>
        t.id === task.id ? { ...t, status: 'IN_PROGRESS', started_at: startTime } : t,
      ),
    );

    // Sync start to backend
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      await fetch(`${baseUrl}/tasks/${task.id}/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          latitude: task.latitude,
          longitude: task.longitude,
          gps_accuracy_m: gpsAccuracy,
        }),
      });
    } catch {
      // Offline fallback
    }

    Alert.alert(
      'Visit Started',
      `On-site location verified within ${task.geofence_radius_m}m perimeter. You may now conduct the doctor detailing.`
    );
  };

  // Open Visit Completion & Immediate Order Sheet
  const handleOpenCompleteSheet = (task: MobileTaskItem) => {
    if (task.status === 'SUSPENDED') {
      Alert.alert('Task Suspended', 'This task is suspended. Please contact Owner (Shivansh Tiwari) to unsuspend.');
      return;
    }
    if (currentDistance > task.geofence_radius_m) {
      Alert.alert(
        'Geofence Rejected',
        `You must physically be at ${task.location_name} within ${task.geofence_radius_m}m to complete and close this visit.`
      );
      return;
    }
    setCompletingTask(task);
  };

  // Submit Visit Completion & Immediate Order
  const handleSubmitCompletion = async () => {
    if (!completingTask) return;

    const endTime = new Date();
    const startTime = completingTask.started_at ? new Date(completingTask.started_at) : new Date(Date.now() - 35 * 60 * 1000);
    // Secret duration calculated for Owner review
    const secretDuration = Math.max(60, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    const validOrders = modalOrders
      .filter((o) => (parseInt(o.quantity) || 0) > 0 && o.product_name.trim().length > 0)
      .map((o) => ({
        product_name: o.product_name,
        quantity: parseInt(o.quantity) || 0,
        unit_price: parseFloat(o.unit_price) || 0,
        total_amount: (parseInt(o.quantity) || 0) * (parseFloat(o.unit_price) || 0),
        distributor: o.distributor,
      }));
    const totalOrderAmount = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalOrderUnits = validOrders.reduce((sum, o) => sum + o.quantity, 0);

    setAllTasks(
      allTasks.map((t) =>
        t.id === completingTask.id
          ? {
              ...t,
              status: 'COMPLETED',
              completed_at: endTime.toISOString(),
              duration_seconds: secretDuration, // Sent to server secretly
              outcome: visitOutcome,
              orders: validOrders,
            }
          : t,
      ),
    );

    // Sync completion to backend
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      await fetch(`${baseUrl}/tasks/${completingTask.id}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          latitude: completingTask.latitude,
          longitude: completingTask.longitude,
          gps_accuracy_m: gpsAccuracy,
          outcome: visitOutcome,
          orders: validOrders,
        }),
      });
    } catch {
      // Offline fallback
    }

    setCompletingTask(null);

    Alert.alert(
      'Visit Completed',
      `Visit closed successfully! Outcome and ${validOrders.length > 0 ? `${validOrders.length} orders booked (${totalOrderUnits} units • ₹${totalOrderAmount.toLocaleString()})` : 'notes'} recorded and synced to the Owner Dashboard.`,
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Representative Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Assigned Calls ({myTasks.length})</Text>
        <Text style={styles.headerSub}>
          {currentUserName} • Today's Field Call Schedule
        </Text>
      </View>

      {/* GPS Controls Banner */}
      <View style={styles.simBox}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.simHeader}>Location & Geofencing Sensor</Text>
          {liveGpsInfo && (
            <Text style={{ fontSize: 10, color: '#0F8B5A', fontWeight: '700' }}>GPS Live</Text>
          )}
        </View>

        {/* Live GPS Sensor Trigger */}
        <TouchableOpacity
          style={[styles.liveGpsBtn, isReadingGps ? { opacity: 0.7 } : {}]}
          onPress={() => handleReadLiveGPS()}
          disabled={isReadingGps}
        >
          <Text style={styles.liveGpsBtnText}>
            {isReadingGps ? 'Acquiring GPS Fix...' : 'Acquire Current GPS Location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.simButtonsRow}>
          <TouchableOpacity
            style={[styles.simBtn, currentDistance <= 50 ? styles.simBtnSelected : {}]}
            onPress={() => {
              setCurrentDistance(12.0);
              setGpsAccuracy(10);
            }}
          >
            <Text style={styles.simBtnText}>On-Site (12m)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.simBtn, currentDistance > 50 ? styles.simBtnSelected : {}]}
            onPress={() => {
              setCurrentDistance(85.0);
              setGpsAccuracy(14);
            }}
          >
            <Text style={styles.simBtnText}>Out of Range (85m)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Task List */}
      {myTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tasks currently assigned to your account.</Text>
        </View>
      ) : (
        myTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            {/* Header Row */}
            {/* Header Row */}
            <View style={styles.taskHeaderRow}>
              <Text style={[styles.taskTime, task.status === 'SUSPENDED' ? { color: '#DC2626' } : {}]}>
                {task.date} • {task.time} • {task.priority} PRIORITY
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  task.status === 'COMPLETED'
                    ? styles.badgeCompleted
                    : task.status === 'IN_PROGRESS'
                    ? styles.badgeInProgress
                    : task.status === 'SUSPENDED'
                    ? styles.badgeSuspended
                    : styles.badgeAssigned,
                ]}
              >
                <Text style={[styles.badgeText, task.status === 'SUSPENDED' ? { color: '#991B1B' } : {}]}>
                  {task.status === 'SUSPENDED' ? 'SUSPENDED' : task.status}
                </Text>
              </View>
            </View>

            {/* Title & Location */}
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.locationName}>{task.location_name}</Text>
            <Text style={styles.addressText}>{task.address}</Text>

            {/* SUSPENDED LOCKOUT ALERT */}
            {task.status === 'SUSPENDED' && (
              <View style={styles.suspendedBanner}>
                <Text style={styles.suspendedBannerTitle}>TASK SUSPENDED (&gt;24h Exceeded)</Text>
                <Text style={styles.suspendedBannerText}>
                  Scheduled date ({task.date}) has passed without visit completion. This call is locked by company administration.
                </Text>
                <Text style={styles.suspendedContactText}>
                  Contact Owner (Shivansh Tiwari) to unsuspend this call so you can complete it.
                </Text>
              </View>
            )}

            {/* Geofence Distance Indicator */}
            {task.status !== 'SUSPENDED' && (
              <DistanceIndicator
                distanceMeters={currentDistance}
                maxGeofenceRadiusM={task.geofence_radius_m}
                gpsAccuracyMeters={gpsAccuracy}
              />
            )}

            {/* Action Buttons Row */}
            <View style={styles.btnRow}>
              {/* Suspended Lockout CTA */}
              {task.status === 'SUSPENDED' && (
                <View style={styles.suspendedBtn}>
                  <Text style={styles.suspendedBtnText}>Locked by Owner (Task Expired)</Text>
                </View>
              )}

              {/* Google Maps Directions Button */}
              {task.status !== 'SUSPENDED' && (
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={() => handleGetDirections(task)}
                >
                  <Text style={styles.directionsBtnText}>Get Directions (Google Maps)</Text>
                </TouchableOpacity>
              )}

              {/* Start Visit Button */}
              {task.status === 'ASSIGNED' && (
                <TouchableOpacity
                  style={[
                    styles.actionBtnPrimary,
                    currentDistance > task.geofence_radius_m ? styles.btnDisabled : {},
                  ]}
                  onPress={() => handleStartTask(task)}
                >
                  <Text style={styles.actionBtnText}>
                    {currentDistance <= task.geofence_radius_m
                      ? 'Start Visit (Verify On-Site)'
                      : 'Reach Location to Start'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Complete Visit & Book Order Button */}
              {task.status === 'IN_PROGRESS' && (
                <TouchableOpacity
                  style={[
                    styles.actionBtnSuccess,
                    currentDistance > task.geofence_radius_m ? styles.btnDisabled : {},
                  ]}
                  onPress={() => handleOpenCompleteSheet(task)}
                >
                  <Text style={styles.actionBtnText}>
                    ✓ Complete Call & Send Orders
                  </Text>
                </TouchableOpacity>
              )}

              {/* Completed Summary */}
              {task.status === 'COMPLETED' && (
                <View style={styles.completedSummary}>
                  <Text style={styles.completedText}>
                    Call Verified & Logged Successfully
                  </Text>
                  {task.orders && task.orders.length > 0 && (
                    <Text style={styles.orderSummaryText}>
                      Orders Booked ({task.orders.length} {task.orders.length === 1 ? 'item' : 'items'} • ₹{task.orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}): {task.orders.map((o) => `${o.product_name} x ${o.quantity}`).join(', ')}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        ))
      )}

      {/* Completion & Immediate Order Modal */}
      {completingTask && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                <Text style={styles.modalTitle}>Complete Call: {completingTask.location_name}</Text>
                <Text style={styles.modalSubtitle}>Record visit outcome and book multiple orders</Text>

                {/* Visit Outcome */}
                <Text style={styles.inputHeader}>Doctor Reaction / Visit Outcome:</Text>
                <TextInput
                  style={[styles.modalInput, { height: 50 }]}
                  value={visitOutcome}
                  onChangeText={setVisitOutcome}
                  multiline
                />

                {/* Immediate Order Form */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4 }}>
                  <Text style={styles.inputHeader}>Immediate Orders Received:</Text>
                  <TouchableOpacity
                    onPress={handleAddModalOrder}
                    style={{ backgroundColor: '#1E40AF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>+ Add Product</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ maxHeight: 240 }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {modalOrders.map((ord, idx) => {
                      const qty = parseInt(ord.quantity) || 0;
                      const price = parseFloat(ord.unit_price) || 0;
                      const sub = qty * price;
                      return (
                        <View key={ord.id} style={[styles.orderBox, { marginBottom: 6 }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>Item #{idx + 1}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>₹{sub.toLocaleString()}</Text>
                              {modalOrders.length > 1 && (
                                <TouchableOpacity onPress={() => handleRemoveModalOrder(ord.id)}>
                                  <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '700' }}>Delete</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          <Text style={styles.smallLabel}>Product Name</Text>
                          <TextInput
                            style={styles.smallInput}
                            value={ord.product_name}
                            onChangeText={(v) => handleUpdateModalOrder(ord.id, 'product_name', v)}
                            placeholder="Enter medicine name"
                          />

                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.smallLabel}>Quantity</Text>
                              <TextInput
                                style={styles.smallInput}
                                value={ord.quantity}
                                onChangeText={(v) => handleUpdateModalOrder(ord.id, 'quantity', v)}
                                keyboardType="numeric"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.smallLabel}>Unit Price (₹)</Text>
                              <TextInput
                                style={styles.smallInput}
                                value={ord.unit_price}
                                onChangeText={(v) => handleUpdateModalOrder(ord.id, 'unit_price', v)}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>

                          <View style={{ marginTop: 4 }}>
                            <Text style={styles.smallLabel}>Stockist / Distributor</Text>
                            <TextInput
                              style={styles.smallInput}
                              value={ord.distributor}
                              onChangeText={(v) => handleUpdateModalOrder(ord.id, 'distributor', v)}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: '#3B82F6',
                    borderStyle: 'dashed',
                    paddingVertical: 7,
                    borderRadius: 4,
                    alignItems: 'center',
                    marginTop: 4,
                    backgroundColor: '#F8FAFC',
                  }}
                  onPress={handleAddModalOrder}
                >
                  <Text style={{ color: '#1D4ED8', fontSize: 11, fontWeight: '700' }}>+ Add Another Order Item</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>
                    Total ({modalOrders.filter(o => (parseInt(o.quantity) || 0) > 0).length} items):
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#15803D' }}>
                    ₹{modalOrders.reduce((sum, o) => sum + ((parseInt(o.quantity) || 0) * (parseFloat(o.unit_price) || 0)), 0).toLocaleString()}
                  </Text>
                </View>

                {/* Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setCompletingTask(null)}
                  >
                    <Text style={styles.cancelBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleSubmitCompletion}
                  >
                    <Text style={styles.submitBtnText}>Submit & Close Visit</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { backgroundColor: '#1A3C6E', padding: 16 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  simBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simHeader: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 },
  simButtonsRow: { flexDirection: 'row', gap: 8 },
  simBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  simBtnSelected: { backgroundColor: '#E0F2FE', borderColor: '#0284C7' },
  simBtnText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  privacyNote: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  privacyText: { fontSize: 10, color: '#1E40AF', lineHeight: 14 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#64748B' },
  taskCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  taskHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTime: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeAssigned: { backgroundColor: '#FEF3C7' },
  badgeInProgress: { backgroundColor: '#DBEAFE' },
  badgeCompleted: { backgroundColor: '#DCFCE7' },
  badgeSuspended: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#0F172A' },
  suspendedBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  suspendedBannerTitle: {
    color: '#991B1B',
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 2,
  },
  suspendedBannerText: {
    color: '#7F1D1D',
    fontSize: 11,
    lineHeight: 15,
  },
  suspendedContactText: {
    color: '#DC2626',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 4,
  },
  suspendedBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    opacity: 0.85,
  },
  suspendedBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  taskTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  locationName: { fontSize: 13, fontWeight: '600', color: '#1A3C6E', marginTop: 2 },
  addressText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  btnRow: { marginTop: 12, gap: 8 },
  directionsBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  directionsBtnText: { color: '#0284C7', fontWeight: '700', fontSize: 12 },
  actionBtnPrimary: {
    backgroundColor: '#1A3C6E',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionBtnSuccess: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#94A3B8', opacity: 0.6 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  completedSummary: {
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  completedText: { color: '#166534', fontWeight: '700', fontSize: 12 },
  orderSummaryText: { color: '#15803D', fontSize: 11, marginTop: 3 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxWidth: 430,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  modalSubtitle: { fontSize: 11, color: '#64748B', marginBottom: 12 },
  inputHeader: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  orderBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smallLabel: { fontSize: 10, color: '#64748B', marginBottom: 2 },
  smallInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  cancelBtnText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0F8B5A',
    borderRadius: 6,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  liveGpsBtn: {
    backgroundColor: '#0B2545',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  liveGpsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
