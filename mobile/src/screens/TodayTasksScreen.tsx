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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DistanceIndicator } from '../components/DistanceIndicator';
import { LocationService } from '../services/locationService';
import { CameraService, PhotoResult } from '../services/cameraService';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import { NotificationService } from '../services/notificationService';

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
  orders?: Array<{ product_name: string; quantity: number; unit_price: number; total_amount: number; distributor?: string }>;
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

  // Real Hardware Sensor GPS Tracking
  const [deviceCoords, setDeviceCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isReadingGps, setIsReadingGps] = useState<boolean>(false);
  const [liveGpsInfo, setLiveGpsInfo] = useState<string | null>(null);

  // Active Detailing Timer State
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState<number>(0);

  // Completion Modal & Detailing State
  const [completingTask, setCompletingTask] = useState<MobileTaskItem | null>(null);
  const [visitPhoto, setVisitPhoto] = useState<PhotoResult | null>(null);
  const [visitOutcome, setVisitOutcome] = useState(
    'Reviewed CardioFix-50 scheme. Doctor agreed to prescribe for 20 patients.',
  );
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

  // Top Segmented Tab for Active Calls vs Completed & History
  const [taskTab, setTaskTab] = useState<'AGENDA' | 'HISTORY'>('AGENDA');

  // STRICT FILTERING: Only show tasks assigned to this logged-in member!
  const myTasks = allTasks.filter((t) => t.assigned_mr_id === currentUserId);
  const agendaTasks = myTasks.filter((t) => t.status !== 'COMPLETED');
  const historyTasks = myTasks.filter((t) => t.status === 'COMPLETED');

  // Track seen tasks to fire notifications on newly assigned tasks
  const seenTaskIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef<boolean>(true);

  // Completed history date filter
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('ALL');

  // Load persistent completed tasks from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(`@ahtri_completed_tasks_${currentUserId}`)
      .then((raw) => {
        if (raw) {
          const savedCompleted: MobileTaskItem[] = JSON.parse(raw);
          if (Array.isArray(savedCompleted) && savedCompleted.length > 0) {
            setAllTasks((prev) => {
              const map = new Map(prev.map((t) => [t.id, t]));
              savedCompleted.forEach((sc) => {
                map.set(sc.id, sc);
              });
              return Array.from(map.values());
            });
          }
        }
      })
      .catch(() => {});

    // Populate initial seen IDs
    allTasks.forEach((t) => seenTaskIdsRef.current.add(t.id));
  }, [currentUserId]);

  // Live Auto-Fetch from Backend Server
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
          // Read local completed tasks so completed status is never overridden
          let locallyCompleted: MobileTaskItem[] = [];
          try {
            const raw = await AsyncStorage.getItem(`@ahtri_completed_tasks_${currentUserId}`);
            if (raw) locallyCompleted = JSON.parse(raw);
          } catch {}
          const localCompMap = new Map(locallyCompleted.map((c) => [c.id, c]));

          const mapped: MobileTaskItem[] = data.map((t: any) => {
            const locallyComp = localCompMap.get(t.id);
            if (locallyComp) {
              return locallyComp;
            }
            return {
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
            };
          });

          // Also keep any completed items not in backend response
          locallyCompleted.forEach((lc) => {
            if (!mapped.some((m) => m.id === lc.id)) {
              mapped.push(lc);
            }
          });

          // Check for newly assigned tasks and fire WhatsApp-style system notification
          if (!isInitialLoadRef.current) {
            data.forEach((t: any) => {
              if (t.assigned_mr_id === currentUserId && t.status !== 'COMPLETED') {
                if (!seenTaskIdsRef.current.has(t.id)) {
                  seenTaskIdsRef.current.add(t.id);
                  NotificationService.notifyTaskAssigned({
                    id: t.id,
                    title: t.title,
                    location_name: t.location_name,
                    address: t.address,
                    time: t.time,
                    priority: t.priority,
                  });
                }
              }
            });
          } else {
            data.forEach((t: any) => seenTaskIdsRef.current.add(t.id));
            isInitialLoadRef.current = false;
          }

          setAllTasks(mapped);
        }
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchTasksFromBackend();
    const interval = setInterval(fetchTasksFromBackend, 4000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Unique dates from completed history
  const availableHistoryDates = React.useMemo(() => {
    const dates = new Set<string>();
    historyTasks.forEach((t) => {
      const d = formatDateDDMMYYYY(t.date || t.completed_at || '');
      if (d) dates.add(d);
    });
    return Array.from(dates);
  }, [historyTasks]);

  // Filtered completed tasks based on historyDateFilter
  const filteredHistoryTasks = React.useMemo(() => {
    if (historyDateFilter === 'ALL') return historyTasks;
    return historyTasks.filter((t) => {
      const d = formatDateDDMMYYYY(t.date || t.completed_at || '');
      return d === historyDateFilter;
    });
  }, [historyTasks, historyDateFilter]);

  // Executive summary metrics for filtered history
  const historyMetrics = React.useMemo(() => {
    const totalCalls = filteredHistoryTasks.length;
    let totalRevenue = 0;
    let totalUnits = 0;
    let totalSecs = 0;

    filteredHistoryTasks.forEach((t) => {
      totalSecs += t.duration_seconds || 0;
      if (t.orders && Array.isArray(t.orders)) {
        t.orders.forEach((o) => {
          totalRevenue += o.total_amount || 0;
          totalUnits += o.quantity || 0;
        });
      }
    });

    return { totalCalls, totalRevenue, totalUnits, totalSecs };
  }, [filteredHistoryTasks]);

  // Read Live Hardware GPS from phone sensor
  const handleReadLiveGPS = async (silent = false) => {
    setIsReadingGps(true);
    try {
      const coords = await LocationService.getCurrentLocation();
      if (coords) {
        const accuracy = coords.accuracy ? Math.round(coords.accuracy) : 10;
        setDeviceCoords({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy,
        });
        setLiveGpsInfo(
          `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (±${accuracy}m)`,
        );
        if (!silent) {
          Alert.alert(
            'GPS Sensor Synced',
            `Current Device GPS:\nLat: ${coords.latitude.toFixed(5)}\nLng: ${coords.longitude.toFixed(5)}\nAccuracy: ±${accuracy}m`,
          );
        }
      } else if (!silent) {
        Alert.alert(
          'GPS Notice',
          'Could not obtain GPS lock. Please ensure Location Permissions and GPS are enabled.',
        );
      }
    } catch (err: any) {
      if (!silent) {
        Alert.alert('Location Error', err?.message || 'Failed to read device GPS.');
      }
    } finally {
      setIsReadingGps(false);
    }
  };

  // Auto-acquire GPS on mount and periodically every 15s
  useEffect(() => {
    handleReadLiveGPS(true);
    const gpsInterval = setInterval(() => handleReadLiveGPS(true), 15000);
    return () => clearInterval(gpsInterval);
  }, []);

  // Live Timer for In-Progress Detailing Visit
  useEffect(() => {
    if (!completingTask || completingTask.status !== 'IN_PROGRESS') return;
    const startMs = completingTask.started_at
      ? new Date(completingTask.started_at).getTime()
      : Date.now();
    const updateTimer = () => {
      const now = Date.now();
      setActiveElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [completingTask]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  // Precise Distance from current device coordinates to target task
  const getTaskDistance = (task: MobileTaskItem): number | null => {
    if (!deviceCoords) return null;
    return LocationService.calculateDistanceMeters(
      deviceCoords.latitude,
      deviceCoords.longitude,
      task.latitude,
      task.longitude,
    );
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

  // Start Task (Automatic Geofence Enforced + Instant Detailing Workspace Transition)
  const handleStartTask = async (task: MobileTaskItem) => {
    if (task.status === 'SUSPENDED') {
      Alert.alert(
        'TASK SUSPENDED',
        `Scheduled date (${formatDateDDMMYYYY(task.date)}) has passed without visit completion. This task is locked by company administration.\n\nOnly Owner (Shivansh Tiwari) can unsuspend it so you can complete this task.`,
      );
      return;
    }

    // 1. Ensure we have fresh, live GPS coordinates
    let currentCoords = deviceCoords;
    if (!currentCoords) {
      const fresh = await LocationService.getCurrentLocation();
      if (fresh) {
        const acc = fresh.accuracy ? Math.round(fresh.accuracy) : 10;
        currentCoords = {
          latitude: fresh.latitude,
          longitude: fresh.longitude,
          accuracy: acc,
        };
        setDeviceCoords(currentCoords);
        setLiveGpsInfo(`${fresh.latitude.toFixed(4)}, ${fresh.longitude.toFixed(4)} (±${acc}m)`);
      }
    }

    if (!currentCoords) {
      Alert.alert(
        'GPS Sensor Syncing',
        'Acquiring your real-time location coordinates. Please wait a moment...',
      );
      await handleReadLiveGPS(false);
      return;
    }

    const dist = LocationService.calculateDistanceMeters(
      currentCoords.latitude,
      currentCoords.longitude,
      task.latitude,
      task.longitude,
    );

    const accuracy = currentCoords.accuracy || 10;
    // Effective radius: at least 100m base + GPS accuracy buffer up to 60m for dense clinic structures
    const baseRadius = Math.max(task.geofence_radius_m || 50, 100);
    const effectiveRadius = baseRadius + Math.min(accuracy, 60);

    if (dist > effectiveRadius) {
      Alert.alert(
        'Geofence Range Notice',
        `You are currently ${formatDistance(dist)} away from ${task.location_name}.\n\nAllowed range for this facility: ${Math.round(effectiveRadius)}m.\n\nIf you are already inside the clinic, tap "Refresh GPS Location" above to update your phone's sensor.`,
      );
      return;
    }

    if (accuracy > 150) {
      Alert.alert(
        'GPS Accuracy Weak',
        `GPS accuracy is ±${accuracy}m. Tap "Refresh GPS Location" to sync a stronger fix.`,
      );
      return;
    }

    const startTime = new Date().toISOString();
    const inProgressTask: MobileTaskItem = {
      ...task,
      status: 'IN_PROGRESS',
      started_at: startTime,
    };

    setAllTasks((prev) =>
      prev.map((t) => (t.id === task.id ? inProgressTask : t)),
    );

    // Immediately open Active Detailing & Visit Finalization Workspace!
    setCompletingTask(inProgressTask);

    // Sync start to backend
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      await fetch(`${baseUrl}/tasks/${task.id}/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          latitude: deviceCoords?.latitude || task.latitude,
          longitude: deviceCoords?.longitude || task.longitude,
          gps_accuracy_m: accuracy,
        }),
      });
    } catch {
      // Offline fallback
    }
  };

  // Open Visit Completion & Immediate Order Sheet
  const handleOpenCompleteSheet = (task: MobileTaskItem) => {
    if (task.status === 'SUSPENDED') {
      Alert.alert(
        'Task Suspended',
        'This task is suspended. Please contact Owner (Shivansh Tiwari) to unsuspend.',
      );
      return;
    }
    setCompletingTask(task);
  };

  // Submit Visit Completion & Immediate Order
  const handleSubmitCompletion = async () => {
    if (!completingTask) return;

    const endTime = new Date();
    const startTime = completingTask.started_at
      ? new Date(completingTask.started_at)
      : new Date(Date.now() - 35 * 60 * 1000);
    const duration = Math.max(60, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    const validOrders = modalOrders
      .filter((o) => (parseInt(o.quantity) || 0) > 0 && o.product_name.trim().length > 0)
      .map((o) => ({
        product_name: o.product_name,
        quantity: parseInt(o.quantity) || 0,
        unit_price: parseFloat(o.unit_price) || 0,
        total_amount: (parseInt(o.quantity) || 0) * (parseFloat(o.unit_price) || 0),
        distributor: o.distributor || 'MedPlus Saket',
      }));
    const totalOrderAmount = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalOrderUnits = validOrders.reduce((sum, o) => sum + o.quantity, 0);

    const completedTask: MobileTaskItem = {
      ...completingTask,
      status: 'COMPLETED',
      completed_at: endTime.toISOString(),
      duration_seconds: duration,
      outcome: visitOutcome,
      orders: validOrders,
    };

    setAllTasks((prev) => {
      const updated = prev.map((t) => (t.id === completingTask.id ? completedTask : t));
      try {
        const completedList = updated.filter((t) => t.status === 'COMPLETED');
        AsyncStorage.setItem(
          `@ahtri_completed_tasks_${currentUserId}`,
          JSON.stringify(completedList),
        );
      } catch {}
      return updated;
    });

    // Sync completion to backend
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/tasks/${completingTask.id}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          latitude: deviceCoords?.latitude || completingTask.latitude,
          longitude: deviceCoords?.longitude || completingTask.longitude,
          gps_accuracy_m: deviceCoords?.accuracy || 10,
          outcome: visitOutcome,
          orders: validOrders,
        }),
      });
      if (res.ok) {
        fetchTasksFromBackend();
      }
    } catch {
      // Offline fallback
    }

    setCompletingTask(null);

    Alert.alert(
      'Visit Finalized & Logged! ✓',
      `Call concluded for ${completingTask.location_name}.\n\n• Duration: ${formatTimer(duration)}\n• Feedback: "${visitOutcome.slice(0, 50)}${visitOutcome.length > 50 ? '...' : ''}"\n• Orders: ${validOrders.length} products (${totalOrderUnits} units • ₹${totalOrderAmount.toLocaleString()})\n\nThis call has been closed and moved to 'Completed & History'.`,
      [
        { text: 'Stay on Agenda', style: 'cancel' },
        { text: 'View in History →', onPress: () => setTaskTab('HISTORY') },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Representative Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Field Calls</Text>
        <Text style={styles.headerSub}>
          {currentUserName} • Today's Schedule & History
        </Text>
      </View>

      {/* Top Segmented Tab Navigation */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, taskTab === 'AGENDA' ? styles.segmentBtnActive : styles.segmentBtnInactive]}
          onPress={() => setTaskTab('AGENDA')}
        >
          <Text style={[styles.segmentBtnText, taskTab === 'AGENDA' ? styles.segmentBtnTextActive : {}]}>
            Today's Agenda ({agendaTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, taskTab === 'HISTORY' ? styles.segmentBtnActive : styles.segmentBtnInactive]}
          onPress={() => setTaskTab('HISTORY')}
        >
          <Text style={[styles.segmentBtnText, taskTab === 'HISTORY' ? styles.segmentBtnTextActive : {}]}>
            Completed & History ({historyTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* === TAB 1: TODAY'S AGENDA (ACTIVE CALLS ONLY) === */}
      {taskTab === 'AGENDA' && (
        <>
          {/* GPS Status Banner */}
          <View style={styles.simBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.simHeader}>Automatic GPS &amp; Geofence Sensor</Text>
              <Text
                style={{
                  fontSize: 10.5,
                  color: deviceCoords ? '#0F8B5A' : '#D97706',
                  fontWeight: '700',
                }}
              >
                {deviceCoords ? `● GPS Live (±${deviceCoords.accuracy}m)` : '○ Locating...'}
              </Text>
            </View>

            {deviceCoords ? (
              <Text style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                Coordinates: {deviceCoords.latitude.toFixed(5)}, {deviceCoords.longitude.toFixed(5)}
              </Text>
            ) : (
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>
                Acquiring high-accuracy satellite lock from phone sensor...
              </Text>
            )}

            {/* Live GPS Sensor Trigger */}
            <TouchableOpacity
              style={[styles.liveGpsBtn, isReadingGps ? { opacity: 0.7 } : {}]}
              onPress={() => handleReadLiveGPS(false)}
              disabled={isReadingGps}
            >
              <Text style={styles.liveGpsBtnText}>
                {isReadingGps ? 'Syncing Satellite Fix...' : '↻ Refresh GPS Location'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Agenda Task List */}
          {agendaTasks.length === 0 ? (
            <View style={[styles.emptyCard, { alignItems: 'center', paddingVertical: 28 }]}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🎉</Text>
              <Text style={[styles.emptyText, { fontWeight: '800', color: '#0F172A', fontSize: 15, marginBottom: 4 }]}>
                All Scheduled Calls Completed!
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 14, paddingHorizontal: 20 }}>
                You have concluded all scheduled visits for today. Switch to the 'Completed & History' tab to review your submitted orders and visit details.
              </Text>
              {historyTasks.length > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: '#1A3C6E', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 6 }}
                  onPress={() => setTaskTab('HISTORY')}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>
                    View Completed Calls & Orders ({historyTasks.length}) →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            agendaTasks.map((task) => {
              const dist = getTaskDistance(task);
              const isOutOfRange = dist === null || dist > task.geofence_radius_m;

              return (
                <View key={task.id} style={styles.taskCard}>
                  {/* Header Row */}
                  <View style={styles.taskHeaderRow}>
                    <Text style={[styles.taskTime, task.status === 'SUSPENDED' ? { color: '#DC2626' } : {}]}>
                      {formatDateDDMMYYYY(task.date)} • {task.time} • {task.priority} PRIORITY
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        task.status === 'IN_PROGRESS'
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
                        Scheduled date ({formatDateDDMMYYYY(task.date)}) has passed without visit completion. This call is locked by company administration.
                      </Text>
                      <Text style={styles.suspendedContactText}>
                        Contact Owner (Shivansh Tiwari) to unsuspend this call so you can complete it.
                      </Text>
                    </View>
                  )}

                  {/* Geofence Distance Indicator */}
                  {task.status !== 'SUSPENDED' && (
                    <DistanceIndicator
                      distanceMeters={dist !== null ? dist : 99999}
                      maxGeofenceRadiusM={task.geofence_radius_m}
                      gpsAccuracyMeters={deviceCoords?.accuracy || 15}
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
                          isOutOfRange ? styles.btnDisabled : {},
                        ]}
                        disabled={isOutOfRange}
                        onPress={() => handleStartTask(task)}
                      >
                        <Text style={styles.actionBtnText}>
                          {dist === null
                            ? 'Acquiring GPS Fix...'
                            : !isOutOfRange
                            ? '▶ Start Visit (On-Site Verified)'
                            : `Out of Range (${formatDistance(dist)}) • Reach Clinic`}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Resume In-Progress Detailing Visit Button */}
                    {task.status === 'IN_PROGRESS' && (
                      <TouchableOpacity
                        style={styles.actionBtnInProgress}
                        onPress={() => handleOpenCompleteSheet(task)}
                      >
                        <Text style={styles.actionBtnText}>
                          ⏱ Detailing In Progress ({formatTimer(activeElapsedSeconds)}) • Resume &amp; Finalize
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </>
      )}

      {/* === TAB 2: COMPLETED & HISTORY SECTION (WITH DATE-WISE FILTER) === */}
      {taskTab === 'HISTORY' && (
        <View style={{ marginBottom: 20 }}>
          {/* Date-Wise Filter Chips Bar */}
          <View style={styles.historyFilterBar}>
            <Text style={styles.historyFilterLabel}>Filter by Date:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyDateScroll}>
              <TouchableOpacity
                style={[
                  styles.historyDateChip,
                  historyDateFilter === 'ALL' && styles.historyDateChipActive,
                ]}
                onPress={() => setHistoryDateFilter('ALL')}
              >
                <Text
                  style={[
                    styles.historyDateChipText,
                    historyDateFilter === 'ALL' && styles.historyDateChipTextActive,
                  ]}
                >
                  All Dates ({historyTasks.length})
                </Text>
              </TouchableOpacity>

              {availableHistoryDates.map((dateStr) => (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.historyDateChip,
                    historyDateFilter === dateStr && styles.historyDateChipActive,
                  ]}
                  onPress={() => setHistoryDateFilter(dateStr)}
                >
                  <Text
                    style={[
                      styles.historyDateChipText,
                      historyDateFilter === dateStr && styles.historyDateChipTextActive,
                    ]}
                  >
                    📅 {dateStr}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Work Completed Executive Summary Card */}
          <View style={styles.historySummaryCard}>
            <View style={styles.historySummaryHeader}>
              <Text style={styles.historySummaryTitle}>
                📊 Work Completed Summary
              </Text>
              <Text style={styles.historySummaryBadge}>
                {historyDateFilter === 'ALL' ? 'All Dates Combined' : historyDateFilter}
              </Text>
            </View>

            <View style={styles.historySummaryGrid}>
              <View style={styles.historySummaryItem}>
                <Text style={styles.historySummaryValue}>{historyMetrics.totalCalls}</Text>
                <Text style={styles.historySummarySub}>Visits Concluded</Text>
              </View>

              <View style={styles.historySummaryItem}>
                <Text style={[styles.historySummaryValue, { color: '#166534' }]}>
                  ₹{historyMetrics.totalRevenue.toLocaleString()}
                </Text>
                <Text style={styles.historySummarySub}>POB Booked ({historyMetrics.totalUnits} units)</Text>
              </View>

              <View style={styles.historySummaryItem}>
                <Text style={styles.historySummaryValue}>
                  {formatTimer(historyMetrics.totalSecs)}
                </Text>
                <Text style={styles.historySummarySub}>Detailing Logged</Text>
              </View>

              <View style={styles.historySummaryItem}>
                <Text style={[styles.historySummaryValue, { color: '#0F8B5A' }]}>100%</Text>
                <Text style={styles.historySummarySub}>Geofence Verified</Text>
              </View>
            </View>
          </View>

          {filteredHistoryTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No completed visits found for {historyDateFilter === 'ALL' ? 'history' : historyDateFilter}. Select another date above to view completed work.
              </Text>
            </View>
          ) : (
            filteredHistoryTasks.map((task) => {
              const orderTotal = task.orders ? task.orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) : 0;
              const orderUnits = task.orders ? task.orders.reduce((sum, o) => sum + (o.quantity || 0), 0) : 0;
              const visitFormattedDate = formatDateDDMMYYYY(task.date || task.completed_at || '');

              return (
                <View key={task.id} style={[styles.taskCard, styles.historyCard]}>
                  {/* History Header Row */}
                  <View style={styles.taskHeaderRow}>
                    <Text style={[styles.taskTime, { color: '#166534', fontWeight: '700' }]}>
                      ✓ COMPLETED {visitFormattedDate ? `• ${visitFormattedDate}` : ''} {task.completed_at ? `(${new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                    </Text>
                    <View style={styles.badgeCompleted}>
                      <Text style={[styles.badgeText, { color: '#166534' }]}>
                        VERIFIED ON-SITE
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.locationName}>{task.location_name}</Text>
                  <Text style={styles.addressText}>{task.address}</Text>

                  {/* Detailing Details & Duration */}
                  <View style={styles.historyMetaBox}>
                    <Text style={styles.historyMetaText}>
                      ⏱ Detailing Duration: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{formatTimer(task.duration_seconds || 0)}</Text>
                    </Text>
                    {task.outcome ? (
                      <Text style={[styles.historyMetaText, { marginTop: 3 }]}>
                        📝 Remarks: <Text style={{ fontStyle: 'italic', color: '#334155' }}>"{task.outcome}"</Text>
                      </Text>
                    ) : null}
                  </View>

                  {/* POB Commercial Orders Review Box */}
                  <View style={styles.historyOrdersBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.historyOrdersTitle}>
                        📦 Commercial Orders Placed
                      </Text>
                      {orderTotal > 0 ? (
                        <Text style={styles.historyOrdersTotalBadge}>
                          ₹{orderTotal.toLocaleString()} ({orderUnits} units)
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '600' }}>
                          Sampling Only
                        </Text>
                      )}
                    </View>

                    {task.orders && task.orders.length > 0 ? (
                      task.orders.map((ord, idx) => (
                        <View key={idx} style={styles.historyOrderItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyOrderProductName}>{ord.product_name}</Text>
                            <Text style={styles.historyOrderDistributor}>
                              Distributor: {ord.distributor || 'MedPlus Saket'}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.historyOrderAmount}>₹{ord.total_amount.toLocaleString()}</Text>
                            <Text style={styles.historyOrderQty}>
                              {ord.quantity} units @ ₹{ord.unit_price}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noOrdersText}>
                        No commercial booking logged for this call (Doctor consultation & product sampling concluded).
                      </Text>
                    )}
                  </View>

                  {/* Sync Status Badge */}
                  <View style={styles.historyFooter}>
                    <Text style={styles.historyFooterText}>✓ Synced with Company Administration</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Active Visit Detailing & Order Finalization Modal */}
      {completingTask && (
        <Modal visible={true} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                {/* Active Visit Top Bar */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#0F8B5A', letterSpacing: 0.5 }}>
                        ACTIVE VISIT IN PROGRESS
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>{completingTask.location_name}</Text>
                    <Text style={styles.modalSubtitle}>{completingTask.title}</Text>
                  </View>
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#92400E' }}>ELAPSED TIME</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#B45309' }}>
                      ⏱ {formatTimer(activeElapsedSeconds)}
                    </Text>
                  </View>
                </View>

                {/* Facility Info Card */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                    📍 Location: <Text style={{ fontWeight: '400', color: '#64748B' }}>{completingTask.address}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', marginTop: 2 }}>
                    🎯 Priority: <Text style={{ fontWeight: '700', color: completingTask.priority === 'HIGH' ? '#DC2626' : '#2563EB' }}>{completingTask.priority}</Text>
                  </Text>
                </View>

                {/* Visit Outcome / Doctor Remarks */}
                <Text style={styles.inputHeader}>Doctor Reaction &amp; Detailing Remarks *</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60 }]}
                  value={visitOutcome}
                  onChangeText={setVisitOutcome}
                  placeholder="Record doctor feedback, product discussion, or prescription commitment..."
                  placeholderTextColor="#94A3B8"
                  multiline
                />

                {/* Preset Chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 12 }}>
                  {[
                    'Detailed CardioFix-50 scheme',
                    'Samples handed over',
                    'Doctor agreed to prescribe',
                    'Follow-up next week',
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}
                      onPress={() => setVisitOutcome((prev) => (prev ? `${prev}. ${preset}` : preset))}
                    >
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>+ {preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Immediate Order Form */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.inputHeader}>Immediate Medicine Orders:</Text>
                  <TouchableOpacity
                    onPress={handleAddModalOrder}
                    style={{ backgroundColor: '#1E40AF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>+ Add Product</Text>
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
                    Total ({modalOrders.filter((o) => (parseInt(o.quantity) || 0) > 0).length} items):
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#15803D' }}>
                    ₹{modalOrders.reduce((sum, o) => sum + ((parseInt(o.quantity) || 0) * (parseFloat(o.unit_price) || 0)), 0).toLocaleString()}
                  </Text>
                </View>

                {/* Finalize Action Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setCompletingTask(null)}
                  >
                    <Text style={styles.cancelBtnText}>Minimize</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleSubmitCompletion}
                  >
                    <Text style={styles.submitBtnText}>✓ Finalize &amp; Complete Visit</Text>
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
  actionBtnInProgress: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: 'center',
    shadowColor: '#0F8B5A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#1A3C6E',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnInactive: {
    backgroundColor: 'transparent',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  historyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#166534',
    backgroundColor: '#FFFFFF',
  },
  historyMetaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyMetaText: {
    fontSize: 11,
    color: '#475569',
  },
  historyOrdersBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  historyOrdersTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  historyOrdersTotalBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  historyOrderProductName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyOrderDistributor: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  historyOrderAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  historyOrderQty: {
    fontSize: 10,
    color: '#475569',
  },
  noOrdersText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  historyFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'flex-end',
  },
  historyFooterText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#059669',
  },
  historyFilterBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyFilterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyDateScroll: {
    flexDirection: 'row',
  },
  historyDateChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  historyDateChipActive: {
    backgroundColor: '#0F8B5A',
    borderColor: '#0F8B5A',
  },
  historyDateChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  historyDateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  historySummaryCard: {
    backgroundColor: '#0B2545',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  historySummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  historySummaryTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  historySummaryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historySummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historySummaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 8,
    borderRadius: 8,
  },
  historySummaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  historySummarySub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
