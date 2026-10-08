import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface MonthlyTpScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserHqId?: string;
  currentUserHqName?: string;
  onBack?: () => void;
}

export interface RouteBatchSuggestion {
  id: string;
  batch_code: string;
  name: string;
  route: string;
  route_stops: string[];
  distance_km: number;
  one_way_distance_km?: number;
  round_trip_distance_km?: number;
  is_round_trip?: boolean;
  reimbursement_rate?: number;
  reimbursement_amount?: number;
  hq_id?: string;
  hq_name?: string;
  mr_id?: string;
  mr_name?: string;
  territory_name?: string;
  is_exact_match?: boolean;
}

interface WorkingTpItem {
  id: string;
  date: string;
  hq_id: string;
  hq_name: string;
  planned_area: string;
  work_type: string;
  planned_kol_drs: string;
  planned_activity: string;
  route_batch_id?: string;
  route_batch_code?: string;
  route_batch_name?: string;
  route?: string;
  route_stops?: string[];
  distance_km?: number;
  one_way_distance_km?: number;
  round_trip_distance_km?: number;
  is_round_trip?: boolean;
  reimbursement_rate?: number;
  reimbursement_amount?: number;
  reimbursement_status?: string;
  calculation_basis?: string;
}

const WORK_TYPES = [
  'Doctor Visit',
  'Order Collection',
  'Follow-up',
  'Transit',
  'Induction / Camp',
  'Stockist Detailing',
  'Other',
];

const DEFAULT_HQS = [
  { id: 'hq-shahdol', name: 'Shahdol', state: 'Madhya Pradesh' },
  { id: 'hq-ambikapur', name: 'Ambikapur', state: 'Chhattisgarh' },
  { id: 'hq-bilaspur', name: 'Bilaspur', state: 'Chhattisgarh' },
  { id: 'hq-kotma', name: 'Kotma', state: 'Madhya Pradesh' },
  { id: 'hq-jaisinghnagar', name: 'Jaisinghnagar', state: 'Madhya Pradesh' },
  { id: 'hq-burhar', name: 'Burhar', state: 'Madhya Pradesh' },
];

// Predefined Initial Master Batches Configured in System
const STATIC_PRESET_BATCHES: Array<{
  id: string;
  batch_code: string;
  name: string;
  route_stops: string[];
  distance_km: number;
  reimbursement_rate: number;
  hq_id: string;
  mr_id: string;
}> = [
  // Amar Dwivedi (Kotma)
  { id: 'rb-kot-01', batch_code: 'Batch 1', name: 'Kotma → Marwahi → Dhanikundi', route_stops: ['Kotma', 'Marwahi', 'Dhanikundi'], distance_km: 85, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-02', batch_code: 'Batch 2', name: 'Kotma → Kelhari → Janakpur', route_stops: ['Kotma', 'Kelhari', 'Janakpur'], distance_km: 95, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-03', batch_code: 'Batch 3', name: 'Kotma → Keswahi → Girva → Khamhidol', route_stops: ['Kotma', 'Keswahi', 'Girva', 'Khamhidol'], distance_km: 110, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-04', batch_code: 'Batch 4', name: 'Kotma → Jaithari → Rajendragram', route_stops: ['Kotma', 'Jaithari', 'Rajendragram'], distance_km: 70, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-05', batch_code: 'Batch 5', name: 'Kotma → Anuppur', route_stops: ['Kotma', 'Anuppur'], distance_km: 45, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-06', batch_code: 'Batch 6', name: 'Kotma → Manendragarh', route_stops: ['Kotma', 'Manendragarh'], distance_km: 65, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-07', batch_code: 'Batch 7', name: 'Kotma → Chirmiri', route_stops: ['Kotma', 'Chirmiri'], distance_km: 80, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-08', batch_code: 'Batch 8', name: 'Kotma → Baikunthpur', route_stops: ['Kotma', 'Baikunthpur'], distance_km: 90, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },
  { id: 'rb-kot-09', batch_code: 'Batch 9', name: 'Kotma → Gaurela', route_stops: ['Kotma', 'Gaurela'], distance_km: 95, reimbursement_rate: 2.5, hq_id: 'hq-kotma', mr_id: 'usr-mr-01' },

  // Aman Rathore (Shahdol)
  { id: 'rb-sha-01', batch_code: 'Batch 1', name: 'Shahdol → Budhar → Dhanpuri → OPM', route_stops: ['Shahdol', 'Budhar', 'Dhanpuri', 'OPM'], distance_km: 55, reimbursement_rate: 2.5, hq_id: 'hq-shahdol', mr_id: 'usr-mr-02' },
  { id: 'rb-sha-02', batch_code: 'Batch 2', name: 'Shahdol → Pali → Navrozabad', route_stops: ['Shahdol', 'Pali', 'Navrozabad'], distance_km: 75, reimbursement_rate: 2.5, hq_id: 'hq-shahdol', mr_id: 'usr-mr-02' },
  { id: 'rb-sha-03', batch_code: 'Batch 3', name: 'Shahdol → Gohparu → Jaisinghnagar', route_stops: ['Shahdol', 'Gohparu', 'Jaisinghnagar'], distance_km: 120, reimbursement_rate: 2.5, hq_id: 'hq-shahdol', mr_id: 'usr-mr-02' },
  { id: 'rb-sha-04', batch_code: 'Batch 4', name: 'Shahdol → Jaitpur', route_stops: ['Shahdol', 'Jaitpur'], distance_km: 80, reimbursement_rate: 2.5, hq_id: 'hq-shahdol', mr_id: 'usr-mr-02' },
  { id: 'rb-sha-05', batch_code: 'Batch 5', name: 'Shahdol → Manpur', route_stops: ['Shahdol', 'Manpur'], distance_km: 110, reimbursement_rate: 2.5, hq_id: 'hq-shahdol', mr_id: 'usr-mr-02' },

  // Ashish Soni (Ambikapur)
  { id: 'rb-amb-01', batch_code: 'Batch 1', name: 'Ambikapur → Laknapur → Udaypur → Kedma', route_stops: ['Ambikapur', 'Laknapur', 'Udaypur', 'Kedma'], distance_km: 90, reimbursement_rate: 2.5, hq_id: 'hq-ambikapur', mr_id: 'usr-mr-03' },
  { id: 'rb-amb-02', batch_code: 'Batch 2', name: 'Ambikapur → Batuli → Sitapur → Patthalgawn', route_stops: ['Ambikapur', 'Batuli', 'Sitapur', 'Patthalgawn'], distance_km: 130, reimbursement_rate: 2.5, hq_id: 'hq-ambikapur', mr_id: 'usr-mr-03' },
  { id: 'rb-amb-03', batch_code: 'Batch 3', name: 'Ambikapur → Silpili → Vishrampur → Surajpur → Devnagar → Shreenagar', route_stops: ['Ambikapur', 'Silpili', 'Vishrampur', 'Surajpur', 'Devnagar', 'Shreenagar'], distance_km: 115, reimbursement_rate: 2.5, hq_id: 'hq-ambikapur', mr_id: 'usr-mr-03' },
  { id: 'rb-amb-04', batch_code: 'Batch 4', name: 'Ambikapur → Pratapur → Siluta → Vadrafnagar', route_stops: ['Ambikapur', 'Pratapur', 'Siluta', 'Vadrafnagar'], distance_km: 140, reimbursement_rate: 2.5, hq_id: 'hq-ambikapur', mr_id: 'usr-mr-03' },
  { id: 'rb-amb-05', batch_code: 'Batch 5', name: 'Ambikapur → Latori → Krwan → Datima → Batra → Bhatgawn', route_stops: ['Ambikapur', 'Latori', 'Krwan', 'Datima', 'Batra', 'Bhatgawn'], distance_km: 125, reimbursement_rate: 2.5, hq_id: 'hq-ambikapur', mr_id: 'usr-mr-03' },
];

const DEFAULT_HQ_AREAS_MAP: Record<string, string[]> = {
  'hq-shahdol': [
    'Jaisinghnagar',
    'Gohparu',
    'Budhar',
    'Dhanpuri',
    'OPM',
    'Pali',
    'Navrozabad',
    'Jaitpur',
    'Manpur',
    'Beohari',
    'Sohagpur',
    'Singhpur',
    'Shahdol Central',
  ],
  'hq-ambikapur': [
    'Laknapur',
    'Udaypur',
    'Kedma',
    'Batuli',
    'Sitapur',
    'Patthalgawn',
    'Silpili',
    'Vishrampur',
    'Surajpur',
    'Devnagar',
    'Shreenagar',
    'Pratapur',
    'Siluta',
    'Vadrafnagar',
    'Latori',
    'Krwan',
    'Datima',
    'Batra',
    'Bhatgawn',
    'Ambikapur Central',
  ],
  'hq-bilaspur': [
    'Kota',
    'Takhatpur',
    'Masturi',
    'Bilha',
    'Ratanpur',
    'Bodri',
    'Sakri',
    'Bilaspur City',
  ],
  'hq-kotma': [
    'Marwahi',
    'Dhanikundi',
    'Kelhari',
    'Janakpur',
    'Keswahi',
    'Girva',
    'Khamhidol',
    'Jaithari',
    'Rajendragram',
    'Anuppur',
    'Manendragarh',
    'Chirmiri',
    'Baikunthpur',
    'Gaurela',
    'Kotma Town',
    'Bijuri',
  ],
  'hq-jaisinghnagar': [
    'Jaisinghnagar Town',
    'Amdih',
    'Janakpur Road',
  ],
  'hq-burhar': [
    'Burhar Town',
    'Dhanpuri',
    'Amlai',
    'Bakaho',
  ],
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const MonthlyTpScreen: React.FC<MonthlyTpScreenProps> = ({
  currentUserId = 'usr-mr-02',
  currentUserName = 'Aman Rathore',
  currentUserHqId,
  currentUserHqName,
  onBack,
}) => {
  // Auto-detect HQ based on props or username
  const initialHqId = (() => {
    if (currentUserHqId) {
      const lower = currentUserHqId.toLowerCase();
      if (lower.includes('kot')) return 'hq-kotma';
      if (lower.includes('amb')) return 'hq-ambikapur';
      if (lower.includes('sha')) return 'hq-shahdol';
      return currentUserHqId;
    }
    const nameLower = (currentUserName || '').toLowerCase();
    if (nameLower.includes('amar')) return 'hq-kotma';
    if (nameLower.includes('ashish')) return 'hq-ambikapur';
    return 'hq-shahdol';
  })();

  const [hqs, setHqs] = useState<Array<{ id: string; name: string; state?: string }>>(DEFAULT_HQS);
  const [selectedHqId, setSelectedHqId] = useState<string>(initialHqId);
  const [availableAreas, setAvailableAreas] = useState<string[]>(
    DEFAULT_HQ_AREAS_MAP[initialHqId] || DEFAULT_HQ_AREAS_MAP['hq-shahdol'],
  );

  // Form inputs
  const [formDate, setFormDate] = useState<string>(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${d.getFullYear()}`;
  });
  const [selectedArea, setSelectedArea] = useState<string>(
    (DEFAULT_HQ_AREAS_MAP[initialHqId] || DEFAULT_HQ_AREAS_MAP['hq-shahdol'])[0],
  );
  const [selectedWorkType, setSelectedWorkType] = useState<string>('Doctor Visit');
  const [kolDrsName, setKolDrsName] = useState<string>('');
  const [plannedActivity, setPlannedActivity] = useState<string>('');

  // Route Batch Suggestion States
  const [availableBatches, setAvailableBatches] = useState<RouteBatchSuggestion[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<RouteBatchSuggestion | null>(null);
  const [allHqBatches, setAllHqBatches] = useState<RouteBatchSuggestion[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [batchSuggestionNotice, setBatchSuggestionNotice] = useState<string>('');
  const [isAllBatchesModalOpen, setIsAllBatchesModalOpen] = useState<boolean>(false);

  // Status Notification Banner
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Punching & Submitting States
  const [isPunching, setIsPunching] = useState<boolean>(false);
  const [workingEntries, setWorkingEntries] = useState<WorkingTpItem[]>([]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);
  const [submittedPlans, setSubmittedPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CREATE' | 'VIEW_SUBMITTED'>('CREATE');

  // Edit Modal Route Batch States
  const [editSelectedBatch, setEditSelectedBatch] = useState<RouteBatchSuggestion | null>(null);
  const [editAvailableBatches, setEditAvailableBatches] = useState<RouteBatchSuggestion[]>([]);
  const [isLoadingEditBatches, setIsLoadingEditBatches] = useState<boolean>(false);

  // Calendar modal state
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

  // 24-Hour Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editHqId, setEditHqId] = useState<string>('');
  const [editArea, setEditArea] = useState<string>('');
  const [editWorkType, setEditWorkType] = useState<string>('Doctor Visit');
  const [editDoctor, setEditDoctor] = useState<string>('');
  const [editActivity, setEditActivity] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Native Select/Picker Modal State
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: Array<{ label: string; value: string; sublabel?: string }>;
    selectedValue: string;
    onSelect: (value: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    selectedValue: '',
    onSelect: () => {},
  });

  // Helper to extract YYYY-MM
  const getMonthKeyFromDate = (dateStr: string): string => {
    try {
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('-');
        return `${y}-${m}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${y}-${m}`;
      }
    } catch {}
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Helper to get areas for an HQ (from localStorage settings or fallback)
  const getStoredAreasForHq = (hqId: string): string[] => {
    try {
      const savedRaw = localStorage.getItem('ahtri_hq_subareas');
      if (savedRaw) {
        const list = JSON.parse(savedRaw);
        if (Array.isArray(list)) {
          const matched = list
            .filter((a: any) => a.hq_id === hqId && a.status !== 'INACTIVE')
            .map((a: any) => a.name);
          if (matched.length > 0) return matched;
        }
      }
    } catch {}
    return DEFAULT_HQ_AREAS_MAP[hqId] || ['Main Market', 'Station Road'];
  };

  // Load HQs from backend & localStorage
  const loadHqs = async () => {
    let loadedHqs = DEFAULT_HQS;
    try {
      const savedRaw = localStorage.getItem('ahtri_inventory_hqs');
      if (savedRaw) {
        const list = JSON.parse(savedRaw);
        if (Array.isArray(list) && list.length > 0) {
          loadedHqs = list;
          setHqs(list);
        }
      }
    } catch {}

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/inventory/hqs`, { headers });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          setHqs(list);
          loadedHqs = list;
        }
      }
    } catch {}

    // Match against user's HQ
    const matched = loadedHqs.find((h) =>
      (currentUserHqId && (h.id.toLowerCase() === currentUserHqId.toLowerCase() || h.name.toLowerCase() === currentUserHqId.toLowerCase())) ||
      h.id === selectedHqId
    );
    if (matched) {
      setSelectedHqId(matched.id);
    } else if (loadedHqs.length > 0) {
      setSelectedHqId(loadedHqs[0].id);
    }
  };

  useEffect(() => {
    loadHqs();
  }, []);

  // Local helper to match static preset batches (offline / fallback)
  const matchBatchesLocally = (
    destination: string,
    hqId: string,
    mrId?: string
  ): RouteBatchSuggestion[] => {
    const cleanDest = (destination || '').trim().toLowerCase();
    const cleanHq = (hqId || '').trim().toLowerCase();

    const matchedList = STATIC_PRESET_BATCHES.filter((b) => {
      const matchesHq = cleanHq.includes(b.hq_id.replace('hq-', '')) || b.hq_id === cleanHq;
      const matchesMr = mrId && b.mr_id === mrId;
      return matchesHq || matchesMr;
    });

    if (!cleanDest) return [];

    const results: { batch: (typeof STATIC_PRESET_BATCHES)[0]; score: number }[] = [];

    for (const b of matchedList) {
      const stops = b.route_stops.map((s) => s.toLowerCase());
      const name = b.name.toLowerCase();
      let score = 0;
      if (stops.includes(cleanDest)) {
        score = 100;
      } else if (stops.some((s) => s.includes(cleanDest) || cleanDest.includes(s))) {
        score = 70;
      } else if (name.includes(cleanDest)) {
        score = 50;
      }

      if (score > 0) {
        results.push({ batch: b, score });
      }
    }

    results.sort((a, b) => b.score - a.score || a.batch.distance_km - b.batch.distance_km);

    return results.map(({ batch, score }) => ({
      id: batch.id,
      batch_code: batch.batch_code,
      name: batch.name,
      route: batch.route_stops.join(' → '),
      route_stops: batch.route_stops,
      distance_km: batch.distance_km,
      one_way_distance_km: batch.distance_km,
      round_trip_distance_km: batch.distance_km * 2,
      is_round_trip: true,
      hq_id: batch.hq_id,
      mr_id: batch.mr_id,
      is_exact_match: score >= 90,
    }));
  };

  const getStaticBatchesForHq = (hqId: string, mrId?: string): RouteBatchSuggestion[] => {
    const cleanHq = (hqId || '').trim().toLowerCase();
    return STATIC_PRESET_BATCHES
      .filter((b) => {
        const matchesHq = cleanHq.includes(b.hq_id.replace('hq-', '')) || b.hq_id === cleanHq;
        const matchesMr = mrId && b.mr_id === mrId;
        return matchesHq || matchesMr;
      })
      .map((b) => ({
        id: b.id,
        batch_code: b.batch_code,
        name: b.name,
        route: b.route_stops.join(' → '),
        route_stops: b.route_stops,
        distance_km: b.distance_km,
        one_way_distance_km: b.distance_km,
        round_trip_distance_km: b.distance_km * 2,
        is_round_trip: true,
        hq_id: b.hq_id,
        mr_id: b.mr_id,
        is_exact_match: false,
      }));
  };

  // Fetch Route Batch suggestions for a destination
  const fetchBatchSuggestions = async (destination: string, hqId: string) => {
    if (!destination || !destination.trim()) {
      setAvailableBatches([]);
      setSelectedBatch(null);
      setBatchSuggestionNotice('');
      return;
    }

    setIsLoadingBatches(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(
        `${baseUrl}/territories/route-batches/suggest?destination=${encodeURIComponent(destination.trim())}&hq_id=${encodeURIComponent(hqId)}&mr_id=${encodeURIComponent(currentUserId)}`,
        { headers },
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableBatches(data.batches || []);
        setSelectedBatch(data.suggested_batch || (data.batches && data.batches[0]) || null);
        setBatchSuggestionNotice(data.message || '');
        setIsLoadingBatches(false);
        return;
      }
    } catch {}

    // Offline / local fallback
    const localMatches = matchBatchesLocally(destination, hqId, currentUserId);
    setAvailableBatches(localMatches);
    setSelectedBatch(localMatches[0] || null);
    setBatchSuggestionNotice(
      localMatches.length > 0
        ? `Found ${localMatches.length} matching batch(es) for '${destination}'`
        : `No predefined route batch found containing '${destination}'.`,
    );
    setIsLoadingBatches(false);
  };

  // Fetch all assigned route batches for the selected HQ
  const fetchAllHqBatches = async (hqId: string) => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(
        `${baseUrl}/territories/route-batches?hq_id=${encodeURIComponent(hqId)}&mr_id=${encodeURIComponent(currentUserId)}`,
        { headers },
      );
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const mapped = list.map((b: any) => ({
            id: b.id,
            batch_code: b.batch_code,
            name: b.name,
            route: b.route_stops && b.route_stops.length > 0 ? b.route_stops.join(' → ') : b.name,
            route_stops: b.route_stops || b.areas || [],
            distance_km: b.distance_km || 0,
            one_way_distance_km: b.distance_km || 0,
            round_trip_distance_km: (b.distance_km || 0) * 2,
            is_round_trip: true,
            hq_id: b.hq_id,
            hq_name: b.hq_name,
          }));
          setAllHqBatches(mapped);
          return;
        }
      }
    } catch {}

    const fallback = getStaticBatchesForHq(hqId, currentUserId);
    setAllHqBatches(fallback);
  };

  // Fetch suggestions for the Edit Modal
  const fetchEditBatchSuggestions = async (destination: string, hqId: string) => {
    if (!destination || !destination.trim()) {
      setEditAvailableBatches([]);
      return;
    }
    setIsLoadingEditBatches(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(
        `${baseUrl}/territories/route-batches/suggest?destination=${encodeURIComponent(destination.trim())}&hq_id=${encodeURIComponent(hqId)}&mr_id=${encodeURIComponent(currentUserId)}`,
        { headers },
      );
      if (res.ok) {
        const data = await res.json();
        setEditAvailableBatches(data.batches || []);
        if (data.suggested_batch && (!editSelectedBatch || editSelectedBatch.id !== data.suggested_batch.id)) {
          setEditSelectedBatch(data.suggested_batch);
        }
        setIsLoadingEditBatches(false);
        return;
      }
    } catch {}

    const localMatches = matchBatchesLocally(destination, hqId, currentUserId);
    setEditAvailableBatches(localMatches);
    if (localMatches.length > 0 && !editSelectedBatch) {
      setEditSelectedBatch(localMatches[0]);
    }
    setIsLoadingEditBatches(false);
  };

  // Auto-fetch suggestions when destination (selectedArea) or selectedHqId changes
  useEffect(() => {
    if (selectedArea && selectedHqId) {
      fetchBatchSuggestions(selectedArea, selectedHqId);
    }
  }, [selectedArea, selectedHqId]);

  useEffect(() => {
    if (selectedHqId) {
      fetchAllHqBatches(selectedHqId);
    }
  }, [selectedHqId]);

  // Load areas when HQ changes
  useEffect(() => {
    const activeAreas = getStoredAreasForHq(selectedHqId);
    setAvailableAreas(activeAreas);
    if (!activeAreas.includes(selectedArea)) {
      setSelectedArea(activeAreas[0] || 'Main Area');
    }

    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/areas?hq_id=${selectedHqId}`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const areaNames = list.map((a: any) => a.name);
            setAvailableAreas(areaNames);
            if (!areaNames.includes(selectedArea)) {
              setSelectedArea(areaNames[0]);
            }
          }
        }
      } catch {}
    })();
  }, [selectedHqId]);

  // Load submitted plans for this MR
  const fetchMyTourPlans = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/tour-plans/my`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.sort(
            (a, b) =>
              new Date(b.submitted_at || b.created_at || 0).getTime() -
              new Date(a.submitted_at || a.created_at || 0).getTime(),
          );
          setSubmittedPlans(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchMyTourPlans();
  }, []);

  // Handle HQ selection change
  const handleHqChange = (newHqId: string) => {
    setSelectedHqId(newHqId);
    const newAreas = getStoredAreasForHq(newHqId);
    setAvailableAreas(newAreas);
    setSelectedArea(newAreas[0] || 'Main Area');
  };

  // Open calendar with current formDate
  const handleOpenCalendar = () => {
    try {
      if (/^\d{2}-\d{2}-\d{4}$/.test(formDate)) {
        const [d, m, y] = formDate.split('-').map(Number);
        setCalendarYear(y);
        setCalendarMonth(m - 1);
      }
    } catch {}
    setIsCalendarOpen(true);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    setFormDate(`${dayStr}-${monthStr}-${calendarYear}`);
    setIsCalendarOpen(false);
  };

  const handleSelectToday = () => {
    const d = new Date();
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    setFormDate(`${dayStr}-${monthStr}-${d.getFullYear()}`);
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
    setIsCalendarOpen(false);
  };

  const advanceFormDate = () => {
    try {
      let dObj: Date | null = null;
      if (/^\d{2}-\d{2}-\d{4}$/.test(formDate)) {
        const [d, m, y] = formDate.split('-').map(Number);
        dObj = new Date(y, m - 1, d + 1);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
        const [y, m, d] = formDate.split('-').map(Number);
        dObj = new Date(y, m - 1, d + 1);
      }
      if (dObj && !isNaN(dObj.getTime())) {
        const day = String(dObj.getDate()).padStart(2, '0');
        const month = String(dObj.getMonth() + 1).padStart(2, '0');
        setFormDate(`${day}-${month}-${dObj.getFullYear()}`);
      }
    } catch {}
  };

  // 1. Direct Punch & Save Visit Handler
  const handlePunchVisitDirectly = async () => {
    if (!formDate.trim()) {
      setStatusNotice({ type: 'error', message: 'Please enter or select a planned visit date.' });
      return;
    }

    setIsPunching(true);
    const currentHq = hqs.find((h) => h.id === selectedHqId) || hqs[0];
    const finalDoctor = kolDrsName.trim() || 'General Field Detailing';
    const finalActivity = plannedActivity.trim() || 'Routine Field Detailing & Sampling';

    const punchItem = {
      date: formDate,
      hq_id: currentHq.id,
      hq_name: currentHq.name,
      planned_area: selectedArea,
      work_type: selectedWorkType,
      planned_kol_drs: finalDoctor,
      planned_activity: finalActivity,
      route_batch_id: selectedBatch?.id,
      route_batch_code: selectedBatch?.batch_code,
      route_batch_name: selectedBatch?.name,
      route: selectedBatch?.route,
      route_stops: selectedBatch?.route_stops,
      distance_km: selectedBatch?.distance_km,
      reimbursement_rate: selectedBatch?.reimbursement_rate,
      reimbursement_amount: selectedBatch?.reimbursement_amount,
    };

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      const res = await fetch(`${baseUrl}/tour-plans/punch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(punchItem),
      });

      if (res.ok) {
        setStatusNotice({
          type: 'success',
          message: `✓ Visit successfully Punched & Saved for ${formatDateDDMMYYYY(formDate)} (${currentHq.name} • ${selectedArea})! ${selectedBatch ? `Batch: ${selectedBatch.batch_code} (${selectedBatch.distance_km} km one-way • ${selectedBatch.distance_km * 2} km round-trip)` : ''}`,
        });

        advanceFormDate();
        setKolDrsName('');
        setPlannedActivity('');
        fetchMyTourPlans();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusNotice({
          type: 'error',
          message: err.message || 'Failed to save Tour Plan. Please try again.',
        });
      }
    } catch (e: any) {
      // Local fallback
      try {
        const savedRaw = localStorage.getItem('ahtri_punched_tour_plans');
        const list = savedRaw ? JSON.parse(savedRaw) : [];
        list.push({
          id: `local-tp-${Date.now()}`,
          ...punchItem,
          submitted_at: new Date().toISOString(),
        });
        localStorage.setItem('ahtri_punched_tour_plans', JSON.stringify(list));
      } catch {}

      setStatusNotice({
        type: 'success',
        message: `✓ Visit Punched locally for ${formatDateDDMMYYYY(formDate)} (${currentHq.name} • ${selectedArea})! Editable for 24 hours.`,
      });
      advanceFormDate();
      setKolDrsName('');
      setPlannedActivity('');
    } finally {
      setIsPunching(false);
      setTimeout(() => setStatusNotice(null), 6000);
    }
  };

  // 2. Add to Working Batch (Plan Month)
  const handleAddNextTp = () => {
    if (!formDate.trim()) {
      setStatusNotice({ type: 'error', message: 'Please enter or select a planned visit date.' });
      return;
    }

    const currentHq = hqs.find((h) => h.id === selectedHqId) || hqs[0];
    const finalDoctor = kolDrsName.trim() || 'General Field Detailing';
    const finalActivity = plannedActivity.trim() || 'Routine Field Detailing & Sampling';

    const newItem: WorkingTpItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formDate,
      hq_id: currentHq.id,
      hq_name: currentHq.name,
      planned_area: selectedArea,
      work_type: selectedWorkType,
      planned_kol_drs: finalDoctor,
      planned_activity: finalActivity,
      route_batch_id: selectedBatch?.id,
      route_batch_code: selectedBatch?.batch_code,
      route_batch_name: selectedBatch?.name,
      route: selectedBatch?.route,
      route_stops: selectedBatch?.route_stops,
      distance_km: selectedBatch?.distance_km,
      reimbursement_rate: selectedBatch?.reimbursement_rate,
      reimbursement_amount: selectedBatch?.reimbursement_amount,
      reimbursement_status: 'PENDING',
    };

    setWorkingEntries((prev) => [...prev, newItem]);
    setStatusNotice({
      type: 'success',
      message: `✓ Added visit for ${formatDateDDMMYYYY(newItem.date)} to working batch below (${selectedBatch ? `${selectedBatch.batch_code} • ${selectedBatch.distance_km} km` : 'Unrouted'}).`,
    });

    setKolDrsName('');
    setPlannedActivity('');
    advanceFormDate();
    setTimeout(() => setStatusNotice(null), 4000);
  };

  const handleRemoveWorkingItem = (id: string) => {
    setWorkingEntries((prev) => prev.filter((i) => i.id !== id));
  };

  // 3. Submit complete monthly TP together
  const handleSubmitMonthlyPlan = async () => {
    if (workingEntries.length === 0) {
      setStatusNotice({
        type: 'error',
        message: 'Please add at least one planned visit date to the batch before submitting.',
      });
      return;
    }

    const targetMonth = getMonthKeyFromDate(workingEntries[0].date);

    setIsSubmittingBatch(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      const res = await fetch(`${baseUrl}/tour-plans/monthly`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          month: targetMonth,
          entries: workingEntries,
          remarks: `Submitted by ${currentUserName}`,
        }),
      });

      if (res.ok) {
        setStatusNotice({
          type: 'success',
          message: `✓ Monthly TP submitted for ${targetMonth} (${workingEntries.length} visits)! You can edit within 24 hours.`,
        });
        setWorkingEntries([]);
        fetchMyTourPlans();
        setActiveTab('VIEW_SUBMITTED');
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusNotice({
          type: 'error',
          message: err.message || 'Failed to submit monthly TP.',
        });
      }
    } catch (e: any) {
      setStatusNotice({
        type: 'error',
        message: e?.message || 'Failed to connect to server.',
      });
    } finally {
      setIsSubmittingBatch(false);
      setTimeout(() => setStatusNotice(null), 6000);
    }
  };

  // 4. 24-Hour Edit Window Calculation
  const getPlanEditStatus = (plan: any) => {
    const submittedTime = new Date(plan.submitted_at || plan.created_at || Date.now()).getTime();
    const now = Date.now();
    const elapsedHours = (now - submittedTime) / (1000 * 60 * 60);
    const remainingHours = 24 - elapsedHours;

    if (remainingHours <= 0) {
      return {
        canEdit: false,
        badgeText: '🔒 Locked (24hr Window Expired)',
        badgeColor: '#64748B',
        badgeBg: '#F1F5F9',
      };
    }

    const wholeHours = Math.floor(remainingHours);
    const wholeMinutes = Math.floor((remainingHours % 1) * 60);
    return {
      canEdit: true,
      remainingHours,
      badgeText: `⏳ Editable (${wholeHours}h ${wholeMinutes}m left)`,
      badgeColor: '#0F8B5A',
      badgeBg: '#DCFCE7',
    };
  };

  // Open Edit Modal for a punched plan/entry
  const handleOpenEditModal = (plan: any, entry: any) => {
    const status = getPlanEditStatus(plan);
    if (!status.canEdit) {
      setStatusNotice({
        type: 'error',
        message: 'The 24-hour edit window has expired for this Tour Plan. It cannot be edited.',
      });
      return;
    }

    setEditingPlan(plan);
    setEditingEntry(entry);
    setEditDate(entry.date);
    setEditHqId(entry.hq_id || selectedHqId);
    setEditArea(entry.planned_area || availableAreas[0]);
    setEditWorkType(entry.work_type || 'Doctor Visit');
    setEditDoctor(entry.planned_kol_drs || '');
    setEditActivity(entry.planned_activity || '');

    if (entry.route_batch_id || entry.route) {
      setEditSelectedBatch({
        id: entry.route_batch_id || `batch-${entry.id}`,
        batch_code: entry.route_batch_code || 'Assigned Batch',
        name: entry.route_batch_name || entry.route || '',
        route: entry.route || '',
        route_stops: entry.route_stops || [],
        distance_km: entry.distance_km || 0,
        reimbursement_rate: entry.reimbursement_rate ?? 2.5,
        reimbursement_amount: entry.reimbursement_amount ?? 0,
      });
    } else {
      setEditSelectedBatch(null);
    }

    fetchEditBatchSuggestions(entry.planned_area || '', entry.hq_id || selectedHqId);
    setIsEditModalOpen(true);
  };

  // Save changes from Edit Modal (Strictly enforced 24-hour window)
  const handleSaveEditedPlan = async () => {
    if (!editingPlan || !editingEntry) return;

    const editStatus = getPlanEditStatus(editingPlan);
    if (!editStatus.canEdit) {
      setStatusNotice({
        type: 'error',
        message: 'The 24-hour edit window has expired. Changes can no longer be saved for this plan.',
      });
      setIsEditModalOpen(false);
      return;
    }

    setIsSavingEdit(true);
    const targetHq = hqs.find((h) => h.id === editHqId) || { id: editHqId, name: editingEntry.hq_name };

    const updatedEntries = (editingPlan.entries || []).map((e: any) => {
      if (e.id === editingEntry.id) {
        return {
          ...e,
          date: editDate,
          hq_id: editHqId,
          hq_name: targetHq.name,
          planned_area: editArea,
          work_type: editWorkType,
          planned_kol_drs: editDoctor.trim() || 'General Field Detailing',
          planned_activity: editActivity.trim() || 'Routine Field Detailing & Sampling',
          route_batch_id: editSelectedBatch?.id || e.route_batch_id,
          route_batch_code: editSelectedBatch?.batch_code || e.route_batch_code,
          route_batch_name: editSelectedBatch?.name || e.route_batch_name,
          route: editSelectedBatch?.route || e.route,
          route_stops: editSelectedBatch?.route_stops || e.route_stops,
          distance_km: editSelectedBatch?.distance_km ?? e.distance_km,
          reimbursement_rate: editSelectedBatch?.reimbursement_rate ?? e.reimbursement_rate,
          reimbursement_amount: editSelectedBatch?.reimbursement_amount ?? e.reimbursement_amount,
        };
      }
      return e;
    });

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      const res = await fetch(`${baseUrl}/tour-plans/${editingPlan.id}/edit`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          month: editingPlan.month,
          entries: updatedEntries,
        }),
      });

      if (res.ok) {
        setStatusNotice({
          type: 'success',
          message: '✓ Tour Plan updated successfully! (Changes saved within 24h window).',
        });
        setIsEditModalOpen(false);
        fetchMyTourPlans();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusNotice({
          type: 'error',
          message: err.message || 'Failed to update tour plan.',
        });
      }
    } catch (e: any) {
      setStatusNotice({
        type: 'error',
        message: e?.message || 'Network error while updating tour plan.',
      });
    } finally {
      setIsSavingEdit(false);
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  // Calendar calculations
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  const isSelectedDay = (day: number) => {
    if (!formDate) return false;
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    return formDate === `${dayStr}-${monthStr}-${calendarYear}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarMonth === today.getMonth() &&
      calendarYear === today.getFullYear()
    );
  };

  const activeHqName = hqs.find((h) => h.id === selectedHqId)?.name || 'HQ';

  return (
    <ScrollView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#93C5FD', fontWeight: '700', fontSize: 13 }}>← Back to More Menu</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Monthly Tour Plan (TP)</Text>
        <Text style={styles.headerSub}>
          {currentUserName} • Field Schedule Planning & Punching
        </Text>
      </View>

      {/* Notice Banner */}
      {statusNotice && (
        <View style={[styles.statusNoticeBox, statusNotice.type === 'error' ? styles.statusNoticeBoxError : styles.statusNoticeBoxSuccess]}>
          <Text style={[styles.statusNoticeText, statusNotice.type === 'error' ? styles.statusNoticeTextError : styles.statusNoticeTextSuccess]}>
            {statusNotice.message}
          </Text>
        </View>
      )}

      {/* Segmented View Mode */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CREATE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('CREATE')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'CREATE' && styles.tabBtnTextActive]}>
            📝 Punch & Schedule Visit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'VIEW_SUBMITTED' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('VIEW_SUBMITTED');
            fetchMyTourPlans();
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'VIEW_SUBMITTED' && styles.tabBtnTextActive]}>
            📋 Punched Plans ({submittedPlans.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'CREATE' && (
        <>
          {/* New TP Entry Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Schedule & Punch Planned Visit</Text>

            {/* Date Input with Calendar Trigger */}
            <Text style={styles.fieldLabel}>Planned Visit Date (DD-MM-YYYY):</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="DD-MM-YYYY (e.g. 04-10-2026)"
              />
              <TouchableOpacity style={styles.calendarBtn} onPress={handleOpenCalendar}>
                <Text style={styles.calendarBtnText}>📅 Pick Date</Text>
              </TouchableOpacity>
            </View>

            {/* HQ Selector Dropdown */}
            <Text style={styles.fieldLabel}>Headquarters (HQ):</Text>
            <TouchableOpacity
              style={styles.dropdownBox}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Headquarters (HQ)',
                  options: hqs.map((hq) => ({
                    label: hq.name,
                    value: hq.id,
                    sublabel: hq.state ? `(${hq.state})` : undefined,
                  })),
                  selectedValue: selectedHqId,
                  onSelect: (val) => handleHqChange(val),
                })
              }
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {hqs.find((h) => h.id === selectedHqId)?.name || 'Select HQ'}
                {hqs.find((h) => h.id === selectedHqId)?.state ? ` (${hqs.find((h) => h.id === selectedHqId)?.state})` : ''}
              </Text>
              <Text style={styles.dropdownChevron}>▼</Text>
            </TouchableOpacity>

            {/* Planned Destination / Area Input & Picker */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4 }}>
              <Text style={[styles.fieldLabel, { marginTop: 0, marginBottom: 0 }]}>
                Planned Destination / Area:
              </Text>
              <Text style={{ fontSize: 10.5, color: '#0369A1', fontWeight: '700' }}>
                Assigned {activeHqName} ({availableAreas.length})
              </Text>
            </View>

            {/* Destination Input Row: Allows typing destination directly (e.g. Jaisinghnagar) OR picking from HQ areas */}
            <View style={styles.destinationInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={selectedArea}
                onChangeText={(text) => setSelectedArea(text)}
                placeholder="Type destination (e.g. Jaisinghnagar)"
              />
              <TouchableOpacity
                style={styles.pickAreaBtn}
                activeOpacity={0.7}
                onPress={() =>
                  setPickerModal({
                    visible: true,
                    title: `Select Planned Area (${activeHqName})`,
                    options: availableAreas.map((area) => ({
                      label: area,
                      value: area,
                    })),
                    selectedValue: selectedArea,
                    onSelect: (val) => setSelectedArea(val),
                  })
                }
              >
                <Text style={styles.pickAreaBtnText}>📍 Select Area ▼</Text>
              </TouchableOpacity>
            </View>

            {/* ══════════════ PREDEFINED ROUTE BATCH & REIMBURSEMENT ══════════════ */}
            <View style={styles.routeBatchCard}>
              <View style={styles.routeBatchHeaderRow}>
                <Text style={styles.routeBatchTitle}>🛣️ Route Batch &amp; Travel Distance</Text>
                {isLoadingBatches && <ActivityIndicator size="small" color="#1A3C6E" />}
              </View>

              {availableBatches.length > 0 ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.routeBatchSub}>
                    {availableBatches.length === 1
                      ? `✓ 1 suggested route batch matches destination '${selectedArea}':`
                      : `✓ ${availableBatches.length} route batches match destination '${selectedArea}'. Select one:`}
                  </Text>

                  {availableBatches.map((batch) => {
                    const isSelected = selectedBatch?.id === batch.id;
                    return (
                      <TouchableOpacity
                        key={batch.id}
                        style={[styles.batchOptionCard, isSelected && styles.batchOptionCardSelected]}
                        onPress={() => setSelectedBatch(batch)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.batchCardTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                              {isSelected && <View style={styles.radioInner} />}
                            </View>
                            <Text style={[styles.batchCodeText, isSelected && styles.batchCodeTextSelected]}>
                              {batch.batch_code}
                            </Text>
                            {batch.is_exact_match && (
                              <View style={styles.exactMatchBadge}>
                                <Text style={styles.exactMatchBadgeText}>Recommended</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.distPill}>
                            <Text style={styles.distPillText}>{batch.distance_km} km</Text>
                          </View>
                        </View>

                        {/* Complete Route Stops */}
                        <View style={styles.routeStopsRow}>
                          <Text style={styles.routeStopsLabel}>Route:</Text>
                          <Text style={styles.routeStopsValue}>{batch.route}</Text>
                        </View>

                        {/* Two-Way Round Trip Travel Distance */}
                        <View style={styles.batchDistRow}>
                          <View style={styles.distPill}>
                            <Text style={styles.distPillText}>📏 {batch.distance_km} km (One-Way)</Text>
                          </View>
                          <View style={[styles.distPill, { backgroundColor: '#DCFCE7' }]}>
                            <Text style={[styles.distPillText, { color: '#15803D' }]}>🔄 {batch.distance_km * 2} km (Round-Trip)</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noBatchNotice}>
                  <Text style={styles.noBatchNoticeTitle}>
                    📍 Direct Area Travel to '{selectedArea}'
                  </Text>
                  <Text style={styles.noBatchNoticeText}>
                    No predefined route batch selected. The system will automatically calculate average distance from {activeHqName} center to {selectedArea} boundary for your round-trip journey.
                  </Text>
                  <TouchableOpacity
                    style={styles.browseAllBatchesBtn}
                    onPress={() => setIsAllBatchesModalOpen(true)}
                  >
                    <Text style={styles.browseAllBatchesBtnText}>
                      📋 Browse All {activeHqName} Batches ({allHqBatches.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Active Selection Summary Banner */}
              {selectedBatch && (
                <View style={styles.activeBatchSummary}>
                  <Text style={styles.activeBatchSummaryTitle}>
                    ✅ Selected Route: <Text style={{ fontWeight: '800', color: '#0F8B5A' }}>{selectedBatch.batch_code}</Text>
                  </Text>
                  <Text style={styles.activeBatchSummaryRoute}>
                    {selectedBatch.route}
                  </Text>
                  <View style={styles.activeBatchSummaryMetrics}>
                    <Text style={styles.activeBatchMetricText}>
                      📏 One-Way Distance: <Text style={{ fontWeight: '700' }}>{selectedBatch.distance_km} km</Text>
                    </Text>
                    <Text style={[styles.activeBatchMetricText, { color: '#0F8B5A', fontWeight: '800' }]}>
                      🔄 Round Trip (Two-Way): {selectedBatch.distance_km * 2} km
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Type of Work Dropdown */}
            <Text style={styles.fieldLabel}>Type of Work:</Text>
            <TouchableOpacity
              style={styles.dropdownBox}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Type of Work',
                  options: WORK_TYPES.map((wt) => ({
                    label: wt,
                    value: wt,
                  })),
                  selectedValue: selectedWorkType,
                  onSelect: (val) => setSelectedWorkType(val),
                })
              }
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedWorkType || 'Select Work Type'}
              </Text>
              <Text style={styles.dropdownChevron}>▼</Text>
            </TouchableOpacity>

            {/* Planned KOL DRS (Optional) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
              <Text style={[styles.fieldLabel, { marginTop: 0, marginBottom: 0 }]}>
                PLANNED KOL DRS (Name):
              </Text>
              <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>Optional</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={kolDrsName}
              onChangeText={setKolDrsName}
              placeholder="e.g. Dr. Rajesh Sharma (Cardio Specialist) [Optional]"
            />

            {/* Planned Activity (Optional) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
              <Text style={[styles.fieldLabel, { marginTop: 0, marginBottom: 0 }]}>
                PLANNED ACTIVITY (Specify):
              </Text>
              <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>Optional</Text>
            </View>
            <TextInput
              style={[styles.textInput, { height: 52 }]}
              value={plannedActivity}
              onChangeText={setPlannedActivity}
              placeholder="e.g. CardioFix-50 scheme presentation & sample distribution [Optional]"
              multiline
            />

            {/* Dual Action Buttons: Punch Now or Add to Batch */}
            <View style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* PRIMARY ACTION: PUNCH & SAVE NOW */}
              <TouchableOpacity
                style={[styles.punchDirectBtn, isPunching && { opacity: 0.7 }]}
                onPress={handlePunchVisitDirectly}
                disabled={isPunching}
              >
                {isPunching ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.punchDirectBtnText}>
                    ✓ Punch &amp; Save Visit for {formatDateDDMMYYYY(formDate)}
                  </Text>
                )}
              </TouchableOpacity>

              {/* SECONDARY ACTION: ADD TO WORKING BATCH */}
              <TouchableOpacity
                style={styles.addBatchBtn}
                onPress={handleAddNextTp}
              >
                <Text style={styles.addBatchBtnText}>
                  + Add to Working Batch (Plan Multi-Date Month)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Working Entries Review Table (Batch Planning) */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.cardHeader}>Working Batch Visits ({workingEntries.length})</Text>
              {workingEntries.length > 0 && (
                <TouchableOpacity onPress={() => setWorkingEntries([])}>
                  <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {workingEntries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No visits in working batch yet.</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
                  Click "✓ Punch &amp; Save Visit" above to save directly, or "+ Add to Working Batch" to prepare multiple dates before submitting together.
                </Text>
              </View>
            ) : (
              workingEntries.map((item) => (
                <View key={item.id} style={styles.entryRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.entryDate}>{formatDateDDMMYYYY(item.date)}</Text>
                      <View style={styles.tagHq}>
                        <Text style={styles.tagHqText}>{item.hq_name} • {item.planned_area}</Text>
                      </View>
                      <View style={styles.tagWork}>
                        <Text style={styles.tagWorkText}>{item.work_type}</Text>
                      </View>
                    </View>
                    {item.route ? (
                      <View style={{ marginTop: 3 }}>
                        <Text style={{ fontSize: 10.5, color: '#0F8B5A', fontWeight: '700' }}>
                          🛣️ {item.route_batch_code ? `${item.route_batch_code}: ` : ''}{item.route}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#64748B' }}>
                          🚗 Round-Trip Distance: {item.distance_km || 0} km
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.entryDoctor}>Dr: {item.planned_kol_drs}</Text>
                    <Text style={styles.entryActivity}>Task: {item.planned_activity}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemoveWorkingItem(item.id)}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Final Batch Submit Button */}
            {workingEntries.length > 0 && (
              <TouchableOpacity
                style={[styles.submitPlanBtn, isSubmittingBatch && { opacity: 0.7 }]}
                onPress={handleSubmitMonthlyPlan}
                disabled={isSubmittingBatch}
              >
                {isSubmittingBatch ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitPlanBtnText}>
                    ✓ Submit Complete Batch TP ({workingEntries.length} Dates)
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {activeTab === 'VIEW_SUBMITTED' && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>My Punched Tour Plans ({submittedPlans.length})</Text>
          <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12 }}>
            ⏱️ 24-Hour Rule: Any Tour Plan or punched visit can be edited/changed within 24 hours of submission. After 1 day, the edit option locks permanently.
          </Text>

          {submittedPlans.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No punched plans found yet.</Text>
            </View>
          ) : (
            submittedPlans.map((plan) => {
              const editStatus = getPlanEditStatus(plan);
              return (
                <View key={plan.id} style={styles.submittedCard}>
                  {/* Plan Top Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <View>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                        Month: {plan.month}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                        Submitted: {formatDateDDMMYYYY(plan.submitted_at)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {/* 24-Hour Edit Window Badge */}
                      <View style={[styles.statusBadge, { backgroundColor: editStatus.badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: editStatus.badgeColor }]}>
                          {editStatus.badgeText}
                        </Text>
                      </View>

                      {/* Approval Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          plan.status === 'APPROVED'
                            ? { backgroundColor: '#DCFCE7' }
                            : plan.status === 'REJECTED'
                            ? { backgroundColor: '#FEE2E2' }
                            : { backgroundColor: '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            plan.status === 'APPROVED'
                              ? { color: '#15803D' }
                              : plan.status === 'REJECTED'
                              ? { color: '#B91C1C' }
                              : { color: '#B45309' },
                          ]}
                        >
                          ● {plan.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {plan.remarks ? (
                    <Text style={{ fontSize: 11, color: '#334155', marginTop: 6, fontStyle: 'italic' }}>
                      Remarks: "{plan.remarks}"
                    </Text>
                  ) : null}

                  {/* Punched Visits Table */}
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
                    {(plan.entries || []).map((e: any, i: number) => (
                      <View key={e.id || i} style={styles.subItemRow}>
                        <View style={{ width: 85 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>
                            {formatDateDDMMYYYY(e.date)}
                          </Text>
                          <Text style={{ fontSize: 9.5, color: '#0369A1', fontWeight: '600' }}>
                            {e.work_type}
                          </Text>
                        </View>

                        <View style={{ flex: 1, paddingHorizontal: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#0F172A' }}>
                            {e.hq_name} • {e.planned_area}
                          </Text>
                          {e.route ? (
                            <View style={{ marginTop: 2 }}>
                              <Text style={{ fontSize: 10, color: '#0F8B5A', fontWeight: '700' }}>
                                🛣️ {e.route_batch_code ? `${e.route_batch_code}: ` : ''}{e.route}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                <Text style={{ fontSize: 9.5, color: '#475569' }}>
                                  🚗 Travel Distance: {e.distance_km || 0} km (Round Trip)
                                </Text>
                              </View>
                            </View>
                          ) : null}
                          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                            Dr: {e.planned_kol_drs} • {e.planned_activity}
                          </Text>
                        </View>

                        {/* 24-HOUR EDIT BUTTON: ONLY APPEARS IF WITHIN 24 HOURS */}
                        {editStatus.canEdit && (
                          <TouchableOpacity
                            style={styles.editVisitBtn}
                            onPress={() => handleOpenEditModal(plan, e)}
                          >
                            <Text style={styles.editVisitBtnText}>✏️ Edit</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Calendar Picker Modal */}
      {isCalendarOpen && (
        <Modal
          visible={isCalendarOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCalendarOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModalBox}>
              {/* Calendar Month & Year Navigation Header */}
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                  <Text style={styles.calNavBtnText}>◀</Text>
                </TouchableOpacity>

                <Text style={styles.calMonthTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                  <Text style={styles.calNavBtnText}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* Day of Week Row */}
              <View style={styles.calWeekRow}>
                {DAY_NAMES.map((d) => (
                  <Text key={d} style={styles.calWeekText}>{d}</Text>
                ))}
              </View>

              {/* Day Grid */}
              <View style={styles.calGrid}>
                {blankDays.map((b) => (
                  <View key={`b-${b}`} style={styles.calBlankCell} />
                ))}

                {calendarDays.map((day) => {
                  const selected = isSelectedDay(day);
                  const currentToday = isToday(day);
                  return (
                    <TouchableOpacity
                      key={`d-${day}`}
                      onPress={() => handleSelectDay(day)}
                      style={[
                        styles.calDayCell,
                        selected && styles.calDaySelected,
                        !selected && currentToday && styles.calDayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          selected && styles.calDayTextSelected,
                          !selected && currentToday && styles.calDayTextToday,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Calendar Footer Shortcuts */}
              <View style={styles.calFooter}>
                <TouchableOpacity style={styles.calTodayBtn} onPress={handleSelectToday}>
                  <Text style={styles.calTodayBtnText}>Select Today</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.calCloseBtn} onPress={() => setIsCalendarOpen(false)}>
                  <Text style={styles.calCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 24-HOUR EDIT TOUR PLAN MODAL */}
      {isEditModalOpen && editingPlan && (
        <Modal
          visible={isEditModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsEditModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.calendarModalBox, { maxWidth: 380, maxHeight: '90%' }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                      ✏️ Change / Edit Tour Plan
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#0F8B5A', fontWeight: '700', marginTop: 2 }}>
                      {getPlanEditStatus(editingPlan).badgeText}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsEditModalOpen(false)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Edit Date */}
                <Text style={styles.fieldLabel}>Planned Visit Date (DD-MM-YYYY):</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="DD-MM-YYYY"
                />

                {/* Edit HQ Dropdown */}
                <Text style={styles.fieldLabel}>Headquarters (HQ):</Text>
                <TouchableOpacity
                  style={styles.dropdownBox}
                  activeOpacity={0.7}
                  onPress={() =>
                    setPickerModal({
                      visible: true,
                      title: 'Edit Headquarters (HQ)',
                      options: hqs.map((hq) => ({
                        label: hq.name,
                        value: hq.id,
                        sublabel: hq.state ? `(${hq.state})` : undefined,
                      })),
                      selectedValue: editHqId,
                      onSelect: (newHq) => {
                        setEditHqId(newHq);
                        const areasForHq = getStoredAreasForHq(newHq);
                        setEditArea(areasForHq[0] || 'Main Area');
                      },
                    })
                  }
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {hqs.find((h) => h.id === editHqId)?.name || 'Select HQ'}
                    {hqs.find((h) => h.id === editHqId)?.state ? ` (${hqs.find((h) => h.id === editHqId)?.state})` : ''}
                  </Text>
                  <Text style={styles.dropdownChevron}>▼</Text>
                </TouchableOpacity>

                {/* Edit Destination / Area */}
                <Text style={styles.fieldLabel}>Planned Destination / Area:</Text>
                <View style={styles.destinationInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={editArea}
                    onChangeText={(text) => {
                      setEditArea(text);
                      fetchEditBatchSuggestions(text, editHqId);
                    }}
                    placeholder="Destination (e.g. Jaisinghnagar)"
                  />
                  <TouchableOpacity
                    style={styles.pickAreaBtn}
                    activeOpacity={0.7}
                    onPress={() =>
                      setPickerModal({
                        visible: true,
                        title: 'Edit Planned Area',
                        options: getStoredAreasForHq(editHqId).map((area) => ({
                          label: area,
                          value: area,
                        })),
                        selectedValue: editArea,
                        onSelect: (val) => {
                          setEditArea(val);
                          fetchEditBatchSuggestions(val, editHqId);
                        },
                      })
                    }
                  >
                    <Text style={styles.pickAreaBtnText}>📍 Select ▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Edit Route Batch Suggestion Card */}
                <View style={[styles.routeBatchCard, { marginTop: 8 }]}>
                  <Text style={styles.routeBatchTitle}>🛣️ Route Batch &amp; Travel Distance</Text>
                  {isLoadingEditBatches && <ActivityIndicator size="small" color="#1A3C6E" />}

                  {editAvailableBatches.length > 0 ? (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.routeBatchSub}>
                        {editAvailableBatches.length === 1
                          ? `✓ 1 suggested batch for '${editArea}':`
                          : `✓ ${editAvailableBatches.length} batches match '${editArea}':`}
                      </Text>
                      {editAvailableBatches.map((b) => {
                        const isSelected = editSelectedBatch?.id === b.id;
                        return (
                          <TouchableOpacity
                            key={b.id}
                            style={[styles.batchOptionCard, isSelected && styles.batchOptionCardSelected]}
                            onPress={() => setEditSelectedBatch(b)}
                          >
                            <View style={styles.batchCardTop}>
                              <Text style={[styles.batchCodeText, isSelected && styles.batchCodeTextSelected]}>
                                {b.batch_code}
                              </Text>
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0369A1' }}>
                                {b.distance_km} km (One-Way) • {b.distance_km * 2} km (Round-Trip)
                              </Text>
                            </View>
                            <Text style={{ fontSize: 10.5, color: '#475569', marginTop: 2 }}>
                              {b.route}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 4 }}>
                      No predefined batch for '{editArea}'. Center-to-boundary direct distance applies.
                    </Text>
                  )}

                  {editSelectedBatch && (
                    <View style={[styles.activeBatchSummary, { marginTop: 6 }]}>
                      <Text style={styles.activeBatchSummaryTitle}>
                        Selected: <Text style={{ fontWeight: '800' }}>{editSelectedBatch.batch_code}</Text> ({editSelectedBatch.distance_km} km one-way • {editSelectedBatch.distance_km * 2} km round-trip)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Edit Work Type Dropdown */}
                <Text style={styles.fieldLabel}>Type of Work:</Text>
                <TouchableOpacity
                  style={styles.dropdownBox}
                  activeOpacity={0.7}
                  onPress={() =>
                    setPickerModal({
                      visible: true,
                      title: 'Edit Type of Work',
                      options: WORK_TYPES.map((wt) => ({
                        label: wt,
                        value: wt,
                      })),
                      selectedValue: editWorkType,
                      onSelect: (val) => setEditWorkType(val),
                    })
                  }
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {editWorkType || 'Select Work Type'}
                  </Text>
                  <Text style={styles.dropdownChevron}>▼</Text>
                </TouchableOpacity>

                {/* Edit Doctor Name */}
                <Text style={styles.fieldLabel}>PLANNED KOL DRS (Name):</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDoctor}
                  onChangeText={setEditDoctor}
                  placeholder="Doctor name or leave empty"
                />

                {/* Edit Planned Activity */}
                <Text style={styles.fieldLabel}>PLANNED ACTIVITY (Specify):</Text>
                <TextInput
                  style={[styles.textInput, { height: 48 }]}
                  value={editActivity}
                  onChangeText={setEditActivity}
                  placeholder="Activity details or leave empty"
                  multiline
                />

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.calCloseBtn, { flex: 1, alignItems: 'center' }]}
                    onPress={() => setIsEditModalOpen(false)}
                  >
                    <Text style={styles.calCloseBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitPlanBtn, { flex: 2, marginTop: 0, paddingVertical: 10 }]}
                    onPress={handleSaveEditedPlan}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitPlanBtnText}>Save Changes ✓</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Reusable Native Dropdown Selection Modal */}
      <Modal
        visible={pickerModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{pickerModal.title}</Text>
              <TouchableOpacity
                onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
                style={styles.pickerCloseBtn}
              >
                <Text style={styles.pickerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator>
              {pickerModal.options.map((opt) => {
                const isSelected = opt.value === pickerModal.selectedValue;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      pickerModal.onSelect(opt.value);
                      setPickerModal((prev) => ({ ...prev, visible: false }));
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.pickerItemLabel,
                          isSelected && styles.pickerItemLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {opt.sublabel ? (
                        <Text style={styles.pickerItemSublabel}>{opt.sublabel}</Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Text style={styles.pickerItemCheck}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Browse All Assigned Batches Modal */}
      {isAllBatchesModalOpen && (
        <Modal
          visible={isAllBatchesModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAllBatchesModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.calendarModalBox, { maxWidth: 390, maxHeight: '85%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  All Assigned Batches for {activeHqName} ({allHqBatches.length})
                </Text>
                <TouchableOpacity onPress={() => setIsAllBatchesModalOpen(false)}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#64748B' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 380 }}>
                {allHqBatches.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginVertical: 20 }}>
                    No route batches assigned for {activeHqName}.
                  </Text>
                ) : (
                  allHqBatches.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.batchOptionCard,
                        selectedBatch?.id === b.id && styles.batchOptionCardSelected,
                        { marginBottom: 8 },
                      ]}
                      onPress={() => {
                        setSelectedBatch(b);
                        setIsAllBatchesModalOpen(false);
                      }}
                    >
                      <View style={styles.batchCardTop}>
                        <Text style={styles.batchCodeText}>{b.batch_code}</Text>
                        <Text style={styles.distPillText}>{b.distance_km} km</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>
                        {b.route}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#0369A1', fontWeight: '700', marginTop: 4 }}>
                        🔄 Two-Way Round Trip: {b.distance_km * 2} km
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
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
  statusNoticeBox: {
    padding: 12,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusNoticeBoxSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusNoticeBoxError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusNoticeTextSuccess: {
    color: '#15803D',
  },
  statusNoticeTextError: {
    color: '#B91C1C',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#0F8B5A' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabBtnTextActive: { color: '#0F8B5A', fontWeight: '800' },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginTop: 8, marginBottom: 4 },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#FAFAFA',
  },
  calendarBtn: {
    backgroundColor: '#1A3C6E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  dropdownBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dropdownText: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
    paddingRight: 20,
  },
  dropdownChevron: {
    position: 'absolute',
    right: 12,
    fontSize: 10,
    color: '#64748B',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  pickerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  pickerCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  pickerCloseText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  pickerItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerItemLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  pickerItemLabelSelected: {
    color: '#1A3C6E',
    fontWeight: '800',
  },
  pickerItemSublabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pickerItemCheck: {
    fontSize: 15,
    color: '#1A3C6E',
    fontWeight: '900',
    marginLeft: 12,
  },
  punchDirectBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F8B5A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  punchDirectBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  addBatchBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#1A3C6E',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBatchBtnText: {
    color: '#1A3C6E',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  entryDate: { fontSize: 11.5, fontWeight: '800', color: '#1A3C6E' },
  tagHq: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagHqText: { fontSize: 9.5, color: '#0369A1', fontWeight: '700' },
  tagWork: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagWorkText: { fontSize: 9.5, color: '#B45309', fontWeight: '700' },
  entryDoctor: { fontSize: 11.5, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  entryActivity: { fontSize: 10.5, color: '#64748B', marginTop: 1 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  deleteBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '800' },
  submitPlanBtn: {
    backgroundColor: '#1A3C6E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  submitPlanBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  submittedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  editVisitBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  editVisitBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calNavBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  calNavBtnText: {
    fontSize: 12,
    color: '#1A3C6E',
    fontWeight: '800',
  },
  calMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calBlankCell: {
    width: '14.28%',
    height: 36,
  },
  calDayCell: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  calDaySelected: {
    backgroundColor: '#1A3C6E',
  },
  calDayToday: {
    borderWidth: 1.5,
    borderColor: '#0F8B5A',
  },
  calDayText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calDayTextToday: {
    color: '#0F8B5A',
    fontWeight: '800',
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  calTodayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  calTodayBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  calCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  calCloseBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  routeBatchCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 8,
  },
  routeBatchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeBatchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeBatchSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  batchOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  batchOptionCardSelected: {
    borderColor: '#0F8B5A',
    backgroundColor: '#F0FDF4',
  },
  batchCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#0F8B5A',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F8B5A',
  },
  batchCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  batchCodeTextSelected: {
    color: '#0F8B5A',
    fontWeight: '800',
  },
  exactMatchBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  exactMatchBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#166534',
  },
  distPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  distPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  routeStopsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  routeStopsLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  routeStopsValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  batchDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  calcCol: {
    flex: 1,
    alignItems: 'center',
  },
  calcColLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  calcColValue: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  calcSymbol: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  calcTotalCol: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    borderRadius: 4,
  },
  calcTotalLabel: {
    fontSize: 9,
    color: '#15803D',
    fontWeight: '700',
  },
  calcTotalValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
  },
  noBatchNotice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 6,
  },
  noBatchNoticeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  noBatchNoticeText: {
    fontSize: 10.5,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },
  browseAllBatchesBtn: {
    backgroundColor: '#1E40AF',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  browseAllBatchesBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeBatchSummary: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  activeBatchSummaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  activeBatchSummaryRoute: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  activeBatchSummaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: 4,
  },
  activeBatchMetricText: {
    fontSize: 10,
    color: '#334155',
  },
  destinationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickAreaBtn: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickAreaBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  reimbursementStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reimbursementStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
});
