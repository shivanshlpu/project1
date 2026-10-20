import React, { useState, useEffect } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DistanceIndicator } from '../components/DistanceIndicator';
import { LocationService } from '../services/locationService';
import { CameraService, PhotoResult } from '../services/cameraService';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import { NotificationService } from '../services/notificationService';
import * as FileSystem from 'expo-file-system';

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
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED' | 'ORDER_PENDING' | 'CANCELLED';
  hq_id?: string;
  hq_name?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number; 
  outcome?: string;
  orders?: Array<{ product_name: string; quantity: number; unit_price: number; total_amount: number; distributor?: string }>;
  visit_photo?: string;
  suspended_at?: string;
  suspended_reason?: string;
  products?: string[];
}

const COMPANY_MEDICINES_CHIPS = [
  { name: 'AHTRI-S (200 ML)', short: 'AHTRI-S', price: 38.40 },
  { name: 'AHTRI-A2Z (200 ML)', short: 'AHTRI-A2Z', price: 36.80 },
  { name: 'AHTYME (200 ML)', short: 'AHTYME', price: 36.80 },
  { name: 'ATHRIMOX CV 625 (10*1*10)', short: 'ATHRIMOX CV 625', price: 68.00 },
  { name: 'AHTRI-P (20*10)', short: 'AHTRI-P', price: 12.00 },
  { name: 'TRIPAN DSR (10*10)', short: 'TRIPAN DSR', price: 20.80 },
  { name: 'AHTRI SP (10*10)', short: 'AHTRI SP', price: 19.80 },
  { name: 'TRIZOLE OC (30 GM)', short: 'TRIZOLE OC', price: 37.80 },
  { name: 'TRIZOLE 200 (10*10)', short: 'TRIZOLE 200', price: 64.20 },
  { name: 'AHTRI K27 (10*1*10)', short: 'AHTRI K27', price: 38.20 },
  { name: 'TRIDIC GEL (30 GM)', short: 'TRIDIC GEL', price: 55.20 },
  { name: 'AHTRI STRETCH MARK CREAM (50 GM)', short: 'STRETCH MARK', price: 357.37 },
  { name: 'AHTRI 5G SYP (200 ML)', short: 'AHTRI 5G', price: 157.00 },
  { name: 'TRIRAB DSR (10*10)', short: 'TRIRAB DSR', price: 80.46 },
  { name: 'AHTRIMOX CV SUSPENSION (30 ML)', short: 'AHTRIMOX CV SUSP', price: 42.00 },
  { name: 'MAFTRI P (60 ML)', short: 'MAFTRI P', price: 63.70 },
  { name: 'AHTRI 9G (200 ML)', short: 'AHTRI 9G', price: 147.50 },
];

function parseSafeOrders(rawOrders: any): any[] {
  if (!rawOrders) return [];
  if (Array.isArray(rawOrders)) return rawOrders;
  if (typeof rawOrders === 'string') {
    try {
      const parsed = JSON.parse(rawOrders);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

function formatSafeCompletedTime(completedAt?: string): string {
  if (!completedAt) return '';
  try {
    const d = new Date(completedAt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface TodayTasksScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserHqId?: string;
  currentUserHqName?: string;
}

export const TodayTasksScreen: React.FC<TodayTasksScreenProps> = ({
  currentUserId = 'usr-mr-02',
  currentUserName = 'Aman Rathore',
  currentUserHqId = 'hq-shahdol',
  currentUserHqName = 'Shahdol HQ',
}) => {
  
  const [allTasks, setAllTasks] = useState<MobileTaskItem[]>([]);
  
  const [hqStockMap, setHqStockMap] = useState<Record<string, any>>({});
  const [dynamicMedicines, setDynamicMedicines] = useState<any[]>([]);

  
  const [deviceCoords, setDeviceCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isReadingGps, setIsReadingGps] = useState<boolean>(false);
  const [liveGpsInfo, setLiveGpsInfo] = useState<string | null>(null);

  
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState<number>(0);

  
  const [completingTask, setCompletingTask] = useState<MobileTaskItem | null>(null);
  const [visitPhoto, setVisitPhoto] = useState<PhotoResult | null>(null);
  const [visitOutcome, setVisitOutcome] = useState(
    'Reviewed AHTRI-S scheme. Doctor agreed to prescribe for 20 patients.',
  );
  
  const [modalOrders, setModalOrders] = useState<
    Array<{
      id: string;
      product_name: string;
      quantity: string;
      unit_price: string;
      distributor: string;
    }>
  >([]);

  
  const [activeHqId, setActiveHqId] = useState<string>(currentUserHqId || 'HQ-SHD-001');
  const [activeHqName, setActiveHqName] = useState<string>(currentUserHqName || 'Headquarters');
  const [availableHqs, setAvailableHqs] = useState<Array<{ id: string; name: string; code?: string }>>([
    { id: 'HQ-KOT-001', name: 'Kotma', code: 'KOT' },
    { id: 'HQ-SHD-001', name: 'Shahdol', code: 'SHD' },
    { id: 'HQ-AMB-001', name: 'Ambikapur', code: 'AMB' },
    { id: 'HQ-BSP-001', name: 'Bilaspur', code: 'BSP' },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/hqs`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setAvailableHqs(list);
          }
        }
      } catch {}
    })();
  }, []);

  const loadHqStock = async (targetHqId?: string) => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const hq = targetHqId || activeHqId || currentUserHqId || 'HQ-SHD-001';
      const res = await fetch(`${baseUrl}/inventory/hq-stock?hq_id=${encodeURIComponent(hq)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.hq_id) setActiveHqId(data.hq_id);
        if (data.hq_name) setActiveHqName(data.hq_name);
        if (Array.isArray(data.hqs) && data.hqs.length > 0) {
          setAvailableHqs(data.hqs);
        }
        const map: Record<string, any> = {};
        const medList: any[] = [];
        const normKey = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        (data.medicines || []).forEach((m: any) => {
          const fullName = `${m.medicine_name} (${m.packing || m.unit || ''})`;
          map[m.medicine_name.toLowerCase().trim()] = m;
          map[m.medicine_id] = m;
          map[fullName.toLowerCase().trim()] = m;
          map[normKey(m.medicine_name)] = m;
          map[normKey(fullName)] = m;
          const short = m.medicine_name.split(' (')[0].toLowerCase().trim();
          map[short] = m;
          map[normKey(short)] = m;

          medList.push({
            name: fullName,
            short: m.medicine_name,
            price: m.pts_rate || m.base_price || 0,
            available_stock: m.available_stock,
            is_out_of_stock: m.is_out_of_stock,
            is_low_stock: m.is_low_stock,
            stock_status: m.stock_status,
            hq_breakdown: m.hq_breakdown || [],
          });
        });
        setHqStockMap(map);
        if (medList.length > 0) {
          setDynamicMedicines(medList);
        }
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    const target = completingTask?.hq_id || currentUserHqId;
    if (target) {
      setActiveHqId(target);
      if (completingTask?.hq_name) setActiveHqName(completingTask.hq_name);
      else if (currentUserHqName) setActiveHqName(currentUserHqName);
    }
    loadHqStock(target);
  }, [completingTask?.hq_id, completingTask?.hq_name, currentUserHqId, currentUserHqName]);

  const handleAddModalOrder = () => {
    const nextIdx = modalOrders.length + 1;
    const defaultDist = modalOrders[0]?.distributor || 'Main Medical Store';
    setModalOrders((prev) => [
      ...prev,
      {
        id: `mord-${Date.now()}-${nextIdx}`,
        product_name: '',
        quantity: '1',
        unit_price: '0',
        distributor: defaultDist,
      },
    ]);
  };

  const handleRemoveModalOrder = (id: string) => {
    setModalOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const handleUpdateModalOrder = (id: string, field: string, val: string) => {
    setModalOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: val } : o))
    );
  };

  
  const handleSelectMedicineForOrder = (id: string, name: string, price: number) => {
    setModalOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, product_name: name, unit_price: String(price) } : o
      )
    );
  };

  
  const [taskTab, setTaskTab] = useState<'AGENDA' | 'HISTORY'>('AGENDA');

  
  const isCancelledTask = (status?: string): boolean => {
    if (!status) return false;
    const s = String(status).trim().toUpperCase();
    return s === 'CANCELLED' || s === 'CANCELED' || s === 'CANCEL';
  };

  
  const myTasks = allTasks.filter(
    (t) => t.assigned_mr_id === currentUserId && !isCancelledTask(t.status)
  );
  const agendaTasks = myTasks.filter((t) => t.status !== 'COMPLETED' && !isCancelledTask(t.status));
  const historyTasks = myTasks.filter((t) => t.status === 'COMPLETED' && !isCancelledTask(t.status));

  
  const seenTaskIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef<boolean>(true);

  
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('ALL');

  
  useEffect(() => {
    (async () => {
      try {
        let cachedAll: MobileTaskItem[] = [];
        const rawAll = await AsyncStorage.getItem(`@ahtri_all_tasks_cache_${currentUserId}`);
        if (rawAll) {
          const parsed = JSON.parse(rawAll);
          if (Array.isArray(parsed)) cachedAll = parsed.filter((t) => !isCancelledTask(t.status));
        }

        let cachedCompleted: MobileTaskItem[] = [];
        const rawCompleted = await AsyncStorage.getItem(`@ahtri_completed_tasks_${currentUserId}`);
        if (rawCompleted) {
          const parsed = JSON.parse(rawCompleted);
          if (Array.isArray(parsed)) cachedCompleted = parsed.filter((t) => !isCancelledTask(t.status));
        }

        const map = new Map<string, MobileTaskItem>();
        cachedAll.forEach((t) => map.set(t.id, t));
        cachedCompleted.forEach((t) => map.set(t.id, t));

        if (map.size > 0) {
          setAllTasks(Array.from(map.values()));
        }
      } catch {}
    })();
  }, [currentUserId]);

  
  useEffect(() => {
    AsyncStorage.getItem(`@ahtri_seen_task_ids_${currentUserId}`)
      .then((raw) => {
        if (raw) {
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              arr.forEach((id: string) => seenTaskIdsRef.current.add(id));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [currentUserId]);

  
  const fetchTasksFromBackend = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/tasks?mr_id=${currentUserId}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          
          let locallyCompleted: MobileTaskItem[] = [];
          try {
            const raw = await AsyncStorage.getItem(`@ahtri_completed_tasks_${currentUserId}`);
            if (raw) locallyCompleted = JSON.parse(raw);
          } catch {}
          const localCompMap = new Map(locallyCompleted.map((c) => [c.id, c]));

          
          const activeBackendTasks = data.filter(
            (t: any) => !isCancelledTask(t.status) && !t.deleted_at
          );

          
          const backendMapped: MobileTaskItem[] = activeBackendTasks.map((t: any) => {
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
              address: t.address || t.location_name || '',
              latitude: t.latitude,
              longitude: t.longitude,
              geofence_radius_m: t.geofence_radius_m || 50,
              priority: t.priority || 'MEDIUM',
              status: t.status,
              hq_id: t.hq_id,
              hq_name: t.hq_name,
              started_at: t.started_at,
              completed_at: t.completed_at,
              outcome: t.outcome,
              orders: t.orders,
              suspended_at: t.suspended_at,
              suspended_reason: t.suspended_reason,
              products: t.products || [],
            };
          });

          
          const explicitlyCancelledIds = new Set(
            data.filter((t: any) => isCancelledTask(t.status) || t.deleted_at).map((t: any) => t.id)
          );

          
          const mergedMap = new Map<string, MobileTaskItem>();
          backendMapped.forEach((t) => mergedMap.set(t.id, t));
          locallyCompleted.forEach((lc) => {
            if (!explicitlyCancelledIds.has(lc.id) && !isCancelledTask(lc.status)) {
              mergedMap.set(lc.id, lc);
            }
          });

          
          if (activeBackendTasks.length === 0 && allTasks.length > 0) {
            allTasks.forEach((pt) => {
              if (!explicitlyCancelledIds.has(pt.id) && !isCancelledTask(pt.status) && !mergedMap.has(pt.id)) {
                mergedMap.set(pt.id, pt);
              }
            });
          }

          const finalTasks = Array.from(mergedMap.values());

          
          const finalCompleted = finalTasks.filter((t) => t.status === 'COMPLETED');
          await AsyncStorage.setItem(
            `@ahtri_completed_tasks_${currentUserId}`,
            JSON.stringify(finalCompleted)
          ).catch(() => {});
          await AsyncStorage.setItem(
            `@ahtri_all_tasks_cache_${currentUserId}`,
            JSON.stringify(finalTasks)
          ).catch(() => {});

          
          const rawSeen = await AsyncStorage.getItem(`@ahtri_seen_task_ids_${currentUserId}`).catch(() => null);
          if (rawSeen) {
            try {
              const arr = JSON.parse(rawSeen);
              if (Array.isArray(arr)) arr.forEach((id: string) => seenTaskIdsRef.current.add(id));
            } catch {}
          }

          let hasNewTask = false;
          activeBackendTasks.forEach((t: any) => {
            if (t.assigned_mr_id === currentUserId && t.status !== 'COMPLETED' && !isCancelledTask(t.status)) {
              if (!seenTaskIdsRef.current.has(t.id)) {
                seenTaskIdsRef.current.add(t.id);
                hasNewTask = true;
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

          if (hasNewTask) {
            AsyncStorage.setItem(
              `@ahtri_seen_task_ids_${currentUserId}`,
              JSON.stringify(Array.from(seenTaskIdsRef.current))
            ).catch(() => {});
          }

          setAllTasks(finalTasks);
        }
      }
    } catch {
      
      try {
        const raw = await AsyncStorage.getItem(`@ahtri_all_tasks_cache_${currentUserId}`);
        if (raw) {
          const cached = JSON.parse(raw);
          if (Array.isArray(cached) && cached.length > 0) {
            setAllTasks(cached);
          }
        }
      } catch {}
    }
  };

  useEffect(() => {
    fetchTasksFromBackend();
    
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        fetchTasksFromBackend();
      }
    }, 25000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchTasksFromBackend();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [currentUserId]);

  
  const availableHistoryDates = React.useMemo(() => {
    const dates = new Set<string>();
    historyTasks.forEach((t) => {
      const d = formatDateDDMMYYYY(t.date || t.completed_at || '');
      if (d) dates.add(d);
    });
    return Array.from(dates);
  }, [historyTasks]);

  
  const filteredHistoryTasks = React.useMemo(() => {
    if (historyDateFilter === 'ALL') return historyTasks;
    return historyTasks.filter((t) => {
      const d = formatDateDDMMYYYY(t.date || t.completed_at || '');
      return d === historyDateFilter;
    });
  }, [historyTasks, historyDateFilter]);

  
  const historyMetrics = React.useMemo(() => {
    const totalCalls = filteredHistoryTasks.length;
    let totalRevenue = 0;
    let totalUnits = 0;
    let totalSecs = 0;

    filteredHistoryTasks.forEach((t) => {
      totalSecs += Number(t.duration_seconds) || 0;
      const orders = parseSafeOrders(t.orders);
      orders.forEach((o) => {
        const qty = Number(o?.quantity) || 0;
        const price = Number(o?.unit_price) || 0;
        const amt = Number(o?.total_amount) || (qty * price);
        totalRevenue += isNaN(amt) ? 0 : amt;
        totalUnits += isNaN(qty) ? 0 : qty;
      });
    });

    return { totalCalls, totalRevenue, totalUnits, totalSecs };
  }, [filteredHistoryTasks]);

  
  const handleReadLiveGPS = async (silent = false) => {
    setIsReadingGps(true);
    try {
      const coords = await LocationService.getCurrentLocation({ timeoutMs: 10000, targetAccuracy: 25 });
      if (coords) {
        const accuracy = coords.accuracy ? Math.round(coords.accuracy) : 10;
        setDeviceCoords({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy,
        });
        const grade = LocationService.getAccuracyGrade(accuracy);
        setLiveGpsInfo(
          `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (${grade.badgeText})`,
        );
        if (!silent) {
          Alert.alert(
            'GPS Sensor Synced',
            `Current Device GPS:\nLat: ${coords.latitude.toFixed(5)}\nLng: ${coords.longitude.toFixed(5)}\nAccuracy: ±${accuracy}m (${grade.label})`,
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

  
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    LocationService.startWatching((coords) => {
      const accuracy = coords.accuracy ? Math.round(coords.accuracy) : 10;
      setDeviceCoords({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy,
      });
      const grade = LocationService.getAccuracyGrade(accuracy);
      setLiveGpsInfo(
        `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (${grade.badgeText})`,
      );
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  
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

  
  const getTaskDistance = (task: MobileTaskItem): number | null => {
    if (!deviceCoords) return null;
    return LocationService.calculateDistanceMeters(
      deviceCoords.latitude,
      deviceCoords.longitude,
      task.latitude,
      task.longitude,
    );
  };

  
  const handleCaptureVisitPhoto = async () => {
    const photo = await CameraService.captureLivePhoto({
      aspect: [4, 3],
      quality: 0.35, // Enterprise compressed ~20KB-30KB
    });
    if (photo) {
      setVisitPhoto(photo);
      Alert.alert('Photo Attached ✓', 'On-site clinic detailing photo captured and compressed.');
    }
  };

  
  const handleGetDirections = (task: MobileTaskItem) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open Google Maps');
    });
  };

  
  const handleStartTask = async (task: MobileTaskItem) => {
    if (task.status === 'SUSPENDED') {
      Alert.alert(
        'TASK SUSPENDED',
        `Scheduled date (${formatDateDDMMYYYY(task.date)}) has passed without visit completion. This task is locked by company administration.\n\nOnly Administrator can unsuspend it so you can complete this task.`,
      );
      return;
    }

    
    let currentCoords = deviceCoords;
    if (!currentCoords || (currentCoords.accuracy && currentCoords.accuracy > 40)) {
      setIsReadingGps(true);
      const fresh = await LocationService.getCurrentLocation({ timeoutMs: 8000, targetAccuracy: 25 });
      if (fresh) {
        const acc = fresh.accuracy ? Math.round(fresh.accuracy) : 10;
        currentCoords = {
          latitude: fresh.latitude,
          longitude: fresh.longitude,
          accuracy: acc,
        };
        setDeviceCoords(currentCoords);
        const grade = LocationService.getAccuracyGrade(acc);
        setLiveGpsInfo(`${fresh.latitude.toFixed(4)}, ${fresh.longitude.toFixed(4)} (${grade.badgeText})`);
      }
      setIsReadingGps(false);
    }

    if (!currentCoords) {
      Alert.alert(
        'GPS Sensor Syncing',
        'Acquiring your real-time location coordinates. Please ensure GPS is enabled...',
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
    const baseRadius = Math.max(task.geofence_radius_m || 50, 100);
    const effectiveRadius = LocationService.calculateEffectiveGeofence(baseRadius, accuracy);

    const proceedWithTask = async (onSiteOverride = false) => {
      const startTime = new Date().toISOString();
      const inProgressTask: MobileTaskItem = {
        ...task,
        status: 'IN_PROGRESS',
        started_at: startTime,
      };

      setAllTasks((prev) =>
        prev.map((t) => (t.id === task.id ? inProgressTask : t)),
      );

      
      setCompletingTask(inProgressTask);

      
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        await fetch(`${baseUrl}/tasks/${task.id}/start`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            latitude: currentCoords?.latitude || task.latitude,
            longitude: currentCoords?.longitude || task.longitude,
            gps_accuracy_m: accuracy,
            on_site_override: onSiteOverride,
          }),
        });
      } catch {
        // Offline fallback
      }
    };

    if (dist > effectiveRadius) {
      
      if (dist <= 350) {
        Alert.alert(
          'Location Calibration Notice',
          `Current GPS reading is ${formatDistance(dist)} from ${task.location_name} (Accuracy: ±${accuracy}m).\n\nIf you are physically present at the doctor clinic/facility, you can verify your on-site presence now.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Re-sync GPS',
              onPress: () => handleReadLiveGPS(false),
            },
            {
              text: 'Start Task (I am On-Site)',
              style: 'default',
              onPress: () => proceedWithTask(true),
            },
          ],
        );
        return;
      }

      Alert.alert(
        'Geofence Range Notice',
        `You are currently ${formatDistance(dist)} away from ${task.location_name}.\n\nAllowed range for this facility: ${Math.round(effectiveRadius)}m.\n\nIf you are already inside the clinic, tap "Refresh GPS Location" above to update your phone's sensor.`,
      );
      return;
    }

    
    proceedWithTask(false);
  };

  
  const handleOpenCompleteSheet = (task: MobileTaskItem) => {
    if (task.status === 'SUSPENDED') {
      Alert.alert(
        'Task Suspended',
        'This task is suspended. Please contact Administrator to unsuspend.',
      );
      return;
    }
    setCompletingTask(task);
  };

  
  const handleSkipOrder = async () => {
    if (!completingTask) return;

    const endTime = new Date();
    const startTime = completingTask.started_at
      ? new Date(completingTask.started_at)
      : new Date(Date.now() - 15 * 60 * 1000);
    const duration = Math.max(60, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    
    let photoPayload: string | undefined = undefined;
    if (visitPhoto?.base64 && visitPhoto.base64.startsWith('data:image')) {
      photoPayload = visitPhoto.base64;
    } else if (visitPhoto?.base64 && !visitPhoto.base64.startsWith('file:') && !visitPhoto.base64.startsWith('content:')) {
      const raw = visitPhoto.base64.includes(',') ? visitPhoto.base64.split(',')[1] : visitPhoto.base64;
      photoPayload = `data:image/jpeg;base64,${raw}`;
    } else if (visitPhoto?.uri && visitPhoto.uri.startsWith('data:image')) {
      photoPayload = visitPhoto.uri;
    } else {
      const targetUri = visitPhoto?.uri || (visitPhoto?.base64 && visitPhoto.base64.startsWith('file:') ? visitPhoto.base64 : null);
      if (targetUri) {
        try {
          const raw = await FileSystem.readAsStringAsync(targetUri, { encoding: FileSystem.EncodingType.Base64 });
          if (raw && raw.length > 50) {
            photoPayload = `data:image/jpeg;base64,${raw}`;
          }
        } catch (fsErr) {
          console.warn('FileSystem direct read error in handleSkipOrder:', fsErr);
        }
      }
    }

    const pendingTask: MobileTaskItem = {
      ...completingTask,
      status: 'ORDER_PENDING',
      duration_seconds: duration,
      outcome: visitOutcome || 'Detailing concluded - Order skipped for now',
      visit_photo: photoPayload,
    };

    setAllTasks((prev) =>
      prev.map((t) => (t.id === completingTask.id ? pendingTask : t)),
    );

    
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      await fetch(`${baseUrl}/tasks/${completingTask.id}/skip-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          latitude: deviceCoords?.latitude || completingTask.latitude,
          longitude: deviceCoords?.longitude || completingTask.longitude,
          gps_accuracy_m: deviceCoords?.accuracy || 10,
          outcome: visitOutcome || 'Detailing finished; order pending',
          visit_photo: photoPayload,
          photo_key: photoPayload,
        }),
      });
      fetchTasksFromBackend();
    } catch {
      // Offline fallback
    }

    const locName = completingTask.location_name;
    setCompletingTask(null);
    setVisitPhoto(null);

    Alert.alert(
      'Order Skipped for Now ⏸️',
      `Visit recorded for ${locName}.\n\nStatus: ORDER PENDING.\nYou can return to this task from your agenda whenever you receive the doctor's order (e.g. this evening) to submit the final order and complete the task.`,
      [{ text: 'OK' }],
    );
  };

  
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

    
    let photoPayload: string | undefined = undefined;
    if (visitPhoto?.base64 && visitPhoto.base64.startsWith('data:image')) {
      photoPayload = visitPhoto.base64;
    } else if (visitPhoto?.base64 && !visitPhoto.base64.startsWith('file:') && !visitPhoto.base64.startsWith('content:')) {
      const raw = visitPhoto.base64.includes(',') ? visitPhoto.base64.split(',')[1] : visitPhoto.base64;
      photoPayload = `data:image/jpeg;base64,${raw}`;
    } else if (visitPhoto?.uri && visitPhoto.uri.startsWith('data:image')) {
      photoPayload = visitPhoto.uri;
    } else {
      const targetUri = visitPhoto?.uri || (visitPhoto?.base64 && visitPhoto.base64.startsWith('file:') ? visitPhoto.base64 : null);
      if (targetUri) {
        try {
          const raw = await FileSystem.readAsStringAsync(targetUri, { encoding: FileSystem.EncodingType.Base64 });
          if (raw && raw.length > 50) {
            photoPayload = `data:image/jpeg;base64,${raw}`;
          }
        } catch (fsErr) {
          console.warn('FileSystem direct read error in handleSubmitCompletion:', fsErr);
        }
      }
    }

    const completedTask: MobileTaskItem = {
      ...completingTask,
      status: 'COMPLETED',
      completed_at: endTime.toISOString(),
      duration_seconds: duration,
      outcome: visitOutcome,
      orders: validOrders,
      visit_photo: photoPayload,
    };

    setAllTasks((prev) => {
      const updated = prev.map((t) => (t.id === completingTask.id ? completedTask : t));
      try {
        const completedList = updated.filter((t) => t.status === 'COMPLETED');
        AsyncStorage.setItem(
          `@ahtri_completed_tasks_${currentUserId}`,
          JSON.stringify(completedList),
        ).catch(() => {});
        AsyncStorage.setItem(
          `@ahtri_all_tasks_cache_${currentUserId}`,
          JSON.stringify(updated),
        ).catch(() => {});
      } catch {}
      return updated;
    });

    
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const endpoint = completingTask.status === 'ORDER_PENDING'
        ? `${baseUrl}/tasks/${completingTask.id}/submit-order`
        : `${baseUrl}/tasks/${completingTask.id}/complete`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          latitude: deviceCoords?.latitude || completingTask.latitude,
          longitude: deviceCoords?.longitude || completingTask.longitude,
          gps_accuracy_m: deviceCoords?.accuracy || 10,
          outcome: visitOutcome,
          orders: validOrders,
          visit_photo: photoPayload,
          photo_key: photoPayload,
        }),
      });
      if (res.ok) {
        fetchTasksFromBackend();
      }
    } catch {
      // Offline fallback
    }

    setCompletingTask(null);
    setVisitPhoto(null);

    
    const effectiveHqTitle = completingTask.hq_name || currentUserHqName || 'HQ';
    const stockShortages: string[] = [];
    validOrders.forEach((o) => {
      const clean = o.product_name.toLowerCase().trim();
      const short = clean.split(' (')[0];
      const stock = hqStockMap[clean] || hqStockMap[short];
      if (stock) {
        if (stock.is_out_of_stock) {
          stockShortages.push(`• ${o.product_name}: OUT OF STOCK (0 in ${effectiveHqTitle} stock, ${o.quantity} ordered)`);
        } else if (stock.available_stock < o.quantity) {
          stockShortages.push(`• ${o.product_name}: Insufficient Stock (${stock.available_stock} available, ${o.quantity} ordered)`);
        } else if (stock.is_low_stock) {
          stockShortages.push(`• ${o.product_name}: LOW STOCK (${stock.available_stock} left in depot)`);
        }
      }
    });

    if (stockShortages.length > 0) {
      Alert.alert(
        '⚠️ Order Placed - Stock Alert!',
        `Call concluded for ${completingTask.location_name}.\n\n• Orders: ${validOrders.length} products (${totalOrderUnits} units • ₹${totalOrderAmount.toLocaleString()})\n\n⚠️ Stock Shortage Notice at ${effectiveHqTitle}:\n${stockShortages.join('\n')}\n\nBoth you and the Admin have received an alert so this stock can be replenished.`,
        [
          { text: 'Stay on Agenda', style: 'cancel' },
          { text: 'View in History →', onPress: () => setTaskTab('HISTORY') },
        ],
      );
    } else {
      Alert.alert(
        'Visit Finalized & Logged! ✓',
        `Call concluded for ${completingTask.location_name}.\n\n• Duration: ${formatTimer(duration)}\n• Feedback: "${visitOutcome.slice(0, 50)}${visitOutcome.length > 50 ? '...' : ''}"\n• Orders: ${validOrders.length} products (${totalOrderUnits} units • ₹${totalOrderAmount.toLocaleString()})\n\nThis call has been closed and moved to 'Completed & History'.`,
        [
          { text: 'Stay on Agenda', style: 'cancel' },
          { text: 'View in History →', onPress: () => setTaskTab('HISTORY') },
        ],
      );
    }
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
              {deviceCoords ? (
                (() => {
                  const grade = LocationService.getAccuracyGrade(deviceCoords.accuracy);
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${grade.color}18`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                      <Text style={{ fontSize: 10.5, color: grade.color, fontWeight: '800' }}>
                        ● {grade.badgeText}
                      </Text>
                    </View>
                  );
                })()
              ) : (
                <Text style={{ fontSize: 10.5, color: '#D97706', fontWeight: '700' }}>
                  ○ Acquiring GPS...
                </Text>
              )}
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
              if (isCancelledTask(task.status)) return null;
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
                          : task.status === 'ORDER_PENDING'
                          ? styles.badgeOrderPending
                          : styles.badgeAssigned,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          task.status === 'SUSPENDED'
                            ? { color: '#991B1B' }
                            : task.status === 'ORDER_PENDING'
                            ? { color: '#92400E' }
                            : {},
                        ]}
                      >
                        {task.status === 'SUSPENDED'
                          ? 'SUSPENDED'
                          : task.status === 'ORDER_PENDING'
                          ? 'Visit Verified • Order Deferred'
                          : task.status}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Location */}
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.locationName}>{task.location_name}</Text>
                  <Text style={styles.addressText}>{task.address}</Text>
                  {task.products && task.products.length > 0 && (
                    <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginTop: 4, marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: '#1E40AF', fontWeight: '700' }}>
                        🎯 Product Focus: {task.products.join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* SUSPENDED LOCKOUT ALERT */}
                  {task.status === 'SUSPENDED' && (
                    <View style={styles.suspendedBanner}>
                      <Text style={styles.suspendedBannerTitle}>TASK SUSPENDED (&gt;24h Exceeded)</Text>
                      <Text style={styles.suspendedBannerText}>
                        Scheduled date ({formatDateDDMMYYYY(task.date)}) has passed without visit completion. This call is locked by company administration.
                      </Text>
                      <Text style={styles.suspendedContactText}>
                        Contact Administrator to unsuspend this call so you can complete it.
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

                    {/* Pending Order Later Entry Button (§2) */}
                    {task.status === 'ORDER_PENDING' && (
                      <TouchableOpacity
                        style={styles.actionBtnOrderPending}
                        onPress={() => handleOpenCompleteSheet(task)}
                      >
                        <Text style={styles.actionBtnText}>
                          📝 Order Pending • Record &amp; Submit Order Now
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
              if (!task || isCancelledTask(task.status)) return null;
              const safeOrders = parseSafeOrders(task.orders);
              const orderTotal = safeOrders.reduce((sum, o) => {
                const total = Number(o?.total_amount) || (Number(o?.quantity) || 0) * (Number(o?.unit_price) || 0);
                return sum + (isNaN(total) ? 0 : total);
              }, 0);
              const orderUnits = safeOrders.reduce((sum, o) => {
                const q = Number(o?.quantity) || 0;
                return sum + (isNaN(q) ? 0 : q);
              }, 0);
              const visitFormattedDate = formatDateDDMMYYYY(task.date || task.completed_at || '');
              const timeFormatted = formatSafeCompletedTime(task.completed_at);

              return (
                <View key={task.id} style={[styles.taskCard, styles.historyCard]}>
                  {/* History Header Row */}
                  <View style={styles.taskHeaderRow}>
                    <Text style={[styles.taskTime, { color: '#166534', fontWeight: '700' }]}>
                      ✓ COMPLETED {visitFormattedDate ? `• ${visitFormattedDate}` : ''} {timeFormatted ? `(${timeFormatted})` : ''}
                    </Text>
                    <View style={styles.badgeCompleted}>
                      <Text style={[styles.badgeText, { color: '#166534' }]}>
                        VERIFIED ON-SITE
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.taskTitle}>{task.title || 'Untitled Call'}</Text>
                  <Text style={styles.locationName}>{task.location_name || 'Designated Clinic'}</Text>
                  <Text style={styles.addressText}>{task.address || ''}</Text>

                  {/* Detailing Details & Duration */}
                  <View style={styles.historyMetaBox}>
                    <Text style={styles.historyMetaText}>
                      ⏱ Detailing Duration: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{formatTimer(Number(task.duration_seconds) || 0)}</Text>
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
                          ₹{orderTotal.toLocaleString('en-IN')} ({orderUnits} units)
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '600' }}>
                          Sampling Only
                        </Text>
                      )}
                    </View>

                    {safeOrders.length > 0 ? (
                      safeOrders.map((ord, idx) => {
                        const unitPrice = Number(ord?.unit_price) || 0;
                        const qty = Number(ord?.quantity) || 1;
                        const totalAmt = Number(ord?.total_amount) || (qty * unitPrice);
                        return (
                          <View key={idx} style={styles.historyOrderItem}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.historyOrderProductName}>{ord?.product_name || 'Medicine'}</Text>
                              <Text style={styles.historyOrderDistributor}>
                                Distributor: {ord?.distributor || 'Central Stocker'}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.historyOrderAmount}>₹{totalAmt.toLocaleString('en-IN')}</Text>
                              <Text style={styles.historyOrderQty}>
                                {qty} units @ ₹{unitPrice}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noOrdersText}>
                        No commercial booking logged for this call (Doctor consultation & product sampling concluded).
                      </Text>
                    )}
                  </View>

                  {/* On-Site Visit Proof Photo Thumbnail */}
                  {typeof task.visit_photo === 'string' && task.visit_photo.trim().length > 10 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, padding: 8, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                      <Image source={{ uri: task.visit_photo.trim() }} style={{ width: 44, height: 44, borderRadius: 6, borderWidth: 1.5, borderColor: '#16A34A' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>✓ On-Site Proof Photo Verified</Text>
                        <Text style={{ fontSize: 9.5, color: '#15803D' }}>Geotagged &amp; Transmitted to Admin</Text>
                      </View>
                    </View>
                  )}

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
                    'Detailed AHTRI-S scheme',
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

                {/* On-Site Visit Proof Camera Capture (§3) */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 12 }}>
                  <Text style={[styles.inputHeader, { marginBottom: 2 }]}>📸 On-Site Clinic / Doctor Visit Photo *</Text>
                  <Text style={{ fontSize: 10.5, color: '#64748B', marginBottom: 8 }}>
                    Direct camera capture required for visit verification.
                  </Text>
                  {visitPhoto ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#86EFAC' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Image source={{ uri: visitPhoto.uri }} style={{ width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: '#166534' }} />
                        <View>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>✓ Live Camera Photo Attached</Text>
                          <Text style={{ fontSize: 9.5, color: '#15803D' }}>GPS &amp; Timestamp encoded</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={handleCaptureVisitPhoto} style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#334155' }}>Retake</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleCaptureVisitPhoto}
                      style={{ backgroundColor: '#1A3C6E', paddingVertical: 9, borderRadius: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>📷 Capture Visit Verification Photo</Text>
                    </TouchableOpacity>
                  )}
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
                              <TouchableOpacity onPress={() => handleRemoveModalOrder(ord.id)}>
                                <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '700' }}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <Text style={styles.smallLabel}>Product Name</Text>
                          <TextInput
                            style={styles.smallInput}
                            value={ord.product_name}
                            onChangeText={(v) => handleUpdateModalOrder(ord.id, 'product_name', v)}
                            placeholder="Enter medicine name"
                          />

                          {/* Live HQ Stock Availability Badge */}
                          {(() => {
                            const cleanName = (ord.product_name || '').toLowerCase().trim();
                            const shortName = cleanName.split(' (')[0];
                            const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            const stock = hqStockMap[cleanName] || hqStockMap[shortName] || hqStockMap[norm(cleanName)] || hqStockMap[norm(shortName)];
                            if (!stock) return null;
                            const effectiveHq = activeHqName || completingTask?.hq_name || currentUserHqName || 'HQ';
                            return (
                              <View style={{ marginTop: 4 }}>
                                {stock.is_out_of_stock ? (
                                  <View style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                                    <Text style={{ fontSize: 11, color: '#991B1B', fontWeight: '700' }}>
                                      🔴 OUT OF STOCK at {effectiveHq} (0 available in depot)
                                    </Text>
                                  </View>
                                ) : stock.is_low_stock ? (
                                  <View style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                                    <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700' }}>
                                      🟠 LOW STOCK at {effectiveHq} ({stock.available_stock} units remaining)
                                    </Text>
                                  </View>
                                ) : (
                                  <View style={{ backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                                    <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                                      🟢 IN STOCK at {effectiveHq} ({stock.available_stock} units available)
                                    </Text>
                                  </View>
                                )}

                                {/* Cross-HQ Stock Overview Breakdown */}
                                {Array.isArray(stock.hq_breakdown) && stock.hq_breakdown.length > 1 && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Stock in Other HQs:</Text>
                                    {stock.hq_breakdown.map((hb: any) => {
                                      const isCur = hb.hq_id === activeHqId || hb.hq_name === activeHqName;
                                      if (isCur) return null;
                                      return (
                                        <TouchableOpacity
                                          key={hb.hq_id}
                                          onPress={() => {
                                            setActiveHqId(hb.hq_id);
                                            setActiveHqName(hb.hq_name);
                                            loadHqStock(hb.hq_id);
                                          }}
                                          style={{
                                            backgroundColor: hb.stock <= 0 ? '#FEE2E2' : hb.is_low_stock ? '#FEF3C7' : '#EFF6FF',
                                            borderWidth: 1,
                                            borderColor: hb.stock <= 0 ? '#FCA5A5' : hb.is_low_stock ? '#FCD34D' : '#BFDBFE',
                                            borderRadius: 8,
                                            paddingHorizontal: 6,
                                            paddingVertical: 2,
                                          }}
                                        >
                                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: hb.stock <= 0 ? '#991B1B' : hb.is_low_stock ? '#92400E' : '#1D4ED8' }}>
                                            {hb.hq_name}: {hb.stock} {hb.stock <= 0 ? '(Out)' : 'units'} →
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            );
                          })()}

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 2 }}>
                            {(dynamicMedicines.length > 0 ? dynamicMedicines : COMPANY_MEDICINES_CHIPS).map((med, mIdx) => {
                              const isSelected = ord.product_name === med.name || ord.product_name === med.short;
                              const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                              const stock = hqStockMap[med.name.toLowerCase().trim()] || (med.short && hqStockMap[med.short.toLowerCase().trim()]) || hqStockMap[norm(med.name)] || (med.short && hqStockMap[norm(med.short)]);
                              const isOut = stock?.is_out_of_stock;
                              const isLow = stock?.is_low_stock;

                              return (
                                <TouchableOpacity
                                  key={mIdx}
                                  onPress={() => handleSelectMedicineForOrder(ord.id, med.name, med.price)}
                                  style={{
                                    backgroundColor: isSelected ? '#1E40AF' : isOut ? '#FEF2F2' : isLow ? '#FFFBEB' : '#F1F5F9',
                                    paddingHorizontal: 8,
                                    paddingVertical: 3.5,
                                    borderRadius: 12,
                                    marginRight: 6,
                                    borderWidth: 1,
                                    borderColor: isSelected ? '#1E40AF' : isOut ? '#FCA5A5' : isLow ? '#FCD34D' : '#CBD5E1',
                                  }}
                                >
                                  <Text style={{ fontSize: 10, color: isSelected ? '#FFFFFF' : isOut ? '#DC2626' : isLow ? '#D97706' : '#1E293B', fontWeight: isSelected ? '700' : '600' }}>
                                    {med.short} (₹{med.price}) {stock ? (isOut ? '• 🔴 Out' : isLow ? `• 🟠 ${stock.available_stock} left` : `• 🟢 ${stock.available_stock}`) : ''}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>

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
                <View style={{ marginTop: 14, gap: 8 }}>
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
                      <Text style={styles.submitBtnText}>
                        {completingTask.status === 'ORDER_PENDING'
                          ? '✓ Save Order & Complete Visit'
                          : '✓ Finalize & Complete Visit'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Skip Order for Now (§2) */}
                  {completingTask.status !== 'ORDER_PENDING' && (
                    <TouchableOpacity
                      style={styles.skipOrderBtn}
                      onPress={handleSkipOrder}
                    >
                      <Text style={styles.skipOrderBtnText}>⏸ Skip Order for Now (Enter Later)</Text>
                      <Text style={styles.skipOrderBtnSub}>Conclude visit now. You can record orders this evening.</Text>
                    </TouchableOpacity>
                  )}
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
  badgeOrderPending: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
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
  actionBtnOrderPending: {
    backgroundColor: '#D97706',
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  skipOrderBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  skipOrderBtnText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 12.5,
  },
  skipOrderBtnSub: {
    color: '#92400E',
    fontSize: 10,
    marginTop: 2,
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
