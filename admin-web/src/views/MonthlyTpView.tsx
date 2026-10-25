import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Filter,
  RefreshCw,
  Search,
  MapPin,
  User,
  Building,
  CheckCircle,
  Clock,
  Briefcase,
  Download,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Eye,
  Printer,
  FileText,
  Navigation,
  Plus,
  Trash2,
  Edit2,
  Sliders,
  Sparkles,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  ExternalLink,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import { getApiBaseUrl, resilientFetch } from '../utils/apiHelper';
import { showConfirmModal } from '../components/CenteredModalNotice';

export interface MonthlyTpItem {
  id: string;
  tp_id: string;
  plan_id?: string;
  entry_id: string;
  mr_id: string;
  mr_name: string;
  month: string;
  date: string;
  hq_id: string;
  hq_name: string;
  planned_area: string;
  destination?: string;
  location_ids?: string[];
  selected_locations?: any[];
  work_type: string;
  planned_kol_drs: string;
  planned_activity: string;
  route_batch_id?: string;
  route_batch_code?: string;
  route_batch_name?: string;
  route?: string;
  route_stops?: string[];
  is_round_trip?: boolean;
  one_way_distance_km?: number;
  round_trip_distance_km?: number;
  distance_km?: number;
  reimbursement_rate?: number;
  reimbursement_amount?: number;
  reimbursement_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  calculation_basis?: 'ROUND_TRIP_BATCH' | 'ROUND_TRIP_CENTER_TO_BOUNDARY' | 'MANUAL' | string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  plan_status?: string;
  created_at: string;
  submitted_at?: string;
  remarks?: string;
}

export interface RouteBatchItem {
  id: string;
  batch_code: string;
  name: string;
  hq_id: string;
  hq_code: string;
  hq_name: string;
  mr_id?: string;
  mr_name?: string;
  territory_name?: string;
  route_stops: string[];
  areas?: string[];
  distance_km: number;
  standard_reimbursement_rate?: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

interface UserOption {
  id: string;
  name: string;
  role?: string;
  hq_name?: string;
  hq_id?: string;
}

const getCurrentMonthKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const generateMonthOptions = () => {
  const options: Array<{ value: string; label: string; isCurrent: boolean }> = [];
  const currentKey = getCurrentMonthKey();
  const [currY, currM] = currentKey.split('-').map(Number);

  
  for (let offset = -6; offset <= 6; offset++) {
    const targetDate = new Date(currY, currM - 1 + offset, 1);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const val = `${y}-${m}`;
    const monthName = targetDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const isCurrent = val === currentKey;
    options.push({
      value: val,
      label: isCurrent ? `${monthName} (★ Active Current)` : monthName,
      isCurrent,
    });
  }
  return options;
};

const DEFAULT_ROUTE_BATCHES: RouteBatchItem[] = [];

export interface RouteChangeRequestAdminItem {
  id: string;
  mr_id: string;
  mr_name: string;
  hq_name: string;
  date: string;
  tour_plan_id: string;
  tour_plan_item_id: string;
  original_batch_name: string;
  original_area?: string;
  original_locations?: Array<{ id: string; name: string }>;
  requested_batch_name: string;
  requested_area?: string;
  requested_locations?: Array<{ id: string; name: string }>;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_remarks?: string;
  created_at: string;
}

interface MonthlyTpViewProps {
  onNavigateToBatches?: () => void;
}

export const MonthlyTpView: React.FC<MonthlyTpViewProps> = ({ onNavigateToBatches }) => {
  // Navigation Sub-Tabs: Schedules and Change Requests
  const [activeSubTab, setActiveSubTab] = useState<'schedules' | 'change_requests'>('schedules');

  const [routeChangeRequests, setRouteChangeRequests] = useState<RouteChangeRequestAdminItem[]>([]);
  const [isLoadingChangeRequests, setIsLoadingChangeRequests] = useState<boolean>(false);
  const [rcFilterStatus, setRcFilterStatus] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');

  const [plans, setPlans] = useState<MonthlyTpItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [hqs, setHqs] = useState<Array<{ id: string; name: string; code?: string }>>([]);

  
  const [routeBatches, setRouteBatches] = useState<RouteBatchItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [batchHqFilter, setBatchHqFilter] = useState<string>('ALL');
  const [batchMrFilter, setBatchMrFilter] = useState<string>('ALL');
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [editingBatch, setEditingBatch] = useState<RouteBatchItem | null>(null);

  
  const [batchFormData, setBatchFormData] = useState({
    batch_code: '',
    name: '',
    hq_id: '',
    mr_id: '',
    route_stops_str: '',
    distance_km: 0,
    standard_reimbursement_rate: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<MonthlyTpItem | null>(null);

  
  const currentMonthKey = getCurrentMonthKey();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedMr, setSelectedMr] = useState<string>('ALL');
  const [selectedHq, setSelectedHq] = useState<string>('ALL');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);

  
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfStartDate, setPdfStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [pdfEndDate, setPdfEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [pdfSelectedHq, setPdfSelectedHq] = useState('ALL');
  const [pdfSelectedMr, setPdfSelectedMr] = useState('ALL');

  
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingTpId, setProcessingTpId] = useState<string | null>(null);

  
  const resolveItemBatchRateAndAmount = (item: MonthlyTpItem) => {
    const matchedBatch = routeBatches.find(
      (b) =>
        (item.route_batch_id && (b.id === item.route_batch_id || b.batch_code === item.route_batch_id)) ||
        (item.route_batch_code && b.batch_code?.toLowerCase() === item.route_batch_code?.toLowerCase()) ||
        (item.route_batch_name && b.name?.toLowerCase() === item.route_batch_name?.toLowerCase())
    );
    const effectiveRate = (matchedBatch?.standard_reimbursement_rate !== undefined && matchedBatch?.standard_reimbursement_rate !== null) ? matchedBatch.standard_reimbursement_rate : item.reimbursement_rate;
    const dist = item.round_trip_distance_km || item.distance_km || 0;
    const effectiveAmount =
      effectiveRate !== undefined && dist > 0
        ? Math.round(dist * effectiveRate * 100) / 100
        : item.reimbursement_amount;
    return { effectiveRate, effectiveAmount, matchedBatch };
  };

  const apiUrl = getApiBaseUrl();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [usersRes, hqsRes] = await Promise.all([
          resilientFetch('/users'),
          resilientFetch('/inventory/hqs'),
        ]);
        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (Array.isArray(uData)) {
            setUsers(uData);
          }
        }
        if (hqsRes.ok) {
          const hData = await hqsRes.json();
          if (Array.isArray(hData)) {
            setHqs(hData);
          }
        }
      } catch {}
    };
    fetchMetadata();
    fetchRouteBatches();
  }, [apiUrl]);

  
  const fetchRouteBatches = async (silent?: boolean | any) => {
    const isSilent = silent === true;
    if (!isSilent) setIsBatchesLoading(true);
    try {
      const res = await resilientFetch('/territories/route-batches');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRouteBatches(data);
        }
      }
    } catch {
      // offline fallback
    } finally {
      if (!isSilent) setIsBatchesLoading(false);
    }
  };

  const setIsBatchesLoading = (val: boolean) => {
    setIsLoadingBatches(val);
  };

  useEffect(() => {
    if (activeSubTab === 'change_requests') {
      fetchRouteChangeRequests(false);
    }
  }, [activeSubTab]);

  useEffect(() => {
    fetchRouteChangeRequests(true);
  }, []);

  const fetchRouteChangeRequests = async (silent?: boolean | any) => {
    const isSilent = silent === true;
    if (!isSilent) setIsLoadingChangeRequests(true);
    try {
      const res = await resilientFetch('/tour-plans/route-change-requests');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRouteChangeRequests(data);
        }
      }
    } catch {
      // offline fallback
    } finally {
      if (!isSilent) setIsLoadingChangeRequests(false);
    }
  };

  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    request: any | null;
    action: 'APPROVED' | 'REJECTED';
    remark: string;
  }>({
    isOpen: false,
    request: null,
    action: 'APPROVED',
    remark: '',
  });

  const handleOpenReviewModal = (rc: any, action: 'APPROVED' | 'REJECTED') => {
    const defaultRemark = action === 'APPROVED' ? 'Approved by Admin' : 'Change request declined';
    setReviewModalState({
      isOpen: true,
      request: rc,
      action,
      remark: defaultRemark,
    });
  };

  const handleConfirmReviewModal = async () => {
    if (!reviewModalState.request) return;
    const { request, action, remark } = reviewModalState;
    setReviewModalState((prev) => ({ ...prev, isOpen: false }));
    setProcessingTpId(request.id);
    try {
      const res = await resilientFetch(`/tour-plans/route-change-requests/${request.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: action,
          admin_remarks: (remark || '').trim(),
        }),
      });

      if (res.ok) {
        setActionNotice({
          type: 'success',
          message: `✓ Route change request marked as ${action}! Active Tour Plan & Tasks updated.`,
        });
        fetchRouteChangeRequests();
        fetchMonthlyPlans();
        window.dispatchEvent(new Event('ahtri_tasks_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_approvals_updated'));
      } else {
        const err = await res.json().catch(() => ({}));
        setActionNotice({
          type: 'error',
          message: err.message || 'Failed to review route change request.',
        });
      }
    } catch {
      setActionNotice({
        type: 'error',
        message: 'Network error reviewing route change request.',
      });
    } finally {
      setProcessingTpId(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleReviewRouteChange = (id: string, action: 'APPROVED' | 'REJECTED') => {
    const rc = routeChangeRequests.find((r) => r.id === id);
    if (rc) {
      handleOpenReviewModal(rc, action);
    }
  };

  
  const fetchMonthlyPlans = async () => {
    setIsLoading(true);
    try {
      let query = `?month=${selectedMonth}`;
      if (selectedMr !== 'ALL') query += `&mr_id=${selectedMr}`;
      if (selectedHq !== 'ALL') query += `&hq_id=${selectedHq}`;
      if (selectedWorkType !== 'ALL') query += `&work_type=${encodeURIComponent(selectedWorkType)}`;
      if (selectedStatus !== 'ALL') query += `&status=${selectedStatus}`;

      let res = await resilientFetch(`/tour-plans/admin${query}`);
      if (!res.ok) {
        res = await resilientFetch(`/tour-plans/admin-list${query}`);
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const normalized: MonthlyTpItem[] = data.map((item: any) => ({
            id: item.id || item.entry_id || item.tp_id || `tp-${Math.random()}`,
            tp_id: item.tp_id || item.id,
            entry_id: item.entry_id || item.id,
            mr_id: item.mr_id || '',
            mr_name: item.mr_name || 'Field Representative',
            month: item.month || selectedMonth,
            date: item.date || '',
            hq_id: item.hq_id || '',
            hq_name: item.hq_name || 'Shahdol',
            planned_area: item.planned_area || '',
            destination: item.destination || item.planned_area || '',
            work_type: item.work_type || 'Doctor Visit',
            planned_kol_drs: item.planned_kol_drs || '',
            planned_activity: item.planned_activity || '',
            route_batch_id: item.route_batch_id,
            route_batch_code: item.route_batch_code,
            route_batch_name: item.route_batch_name,
            route: item.route,
            route_stops: Array.isArray(item.route_stops) ? item.route_stops : [],
            is_round_trip: item.is_round_trip !== undefined ? item.is_round_trip : true,
            one_way_distance_km:
              item.one_way_distance_km !== undefined
                ? item.one_way_distance_km
                : item.distance_km !== undefined
                ? Math.round((item.distance_km / 2) * 10) / 10
                : undefined,
            round_trip_distance_km:
              item.round_trip_distance_km !== undefined
                ? item.round_trip_distance_km
                : item.distance_km !== undefined
                ? item.distance_km
                : undefined,
            distance_km: item.distance_km,
            reimbursement_rate: item.reimbursement_rate,
            reimbursement_amount: item.reimbursement_amount,
            reimbursement_status: item.reimbursement_status,
            calculation_basis:
              item.calculation_basis ||
              (item.route_batch_code === 'DIRECT_AREA' ? 'ROUND_TRIP_CENTER_TO_BOUNDARY' : 'ROUND_TRIP_BATCH'),
            status: item.status || item.plan_status || 'SUBMITTED',
            created_at: item.created_at || item.submitted_at || new Date().toISOString(),
            remarks: item.remarks || '',
          }));
          setPlans(normalized);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthlyPlansSilent = async () => {
    try {
      let query = `?month=${selectedMonth}`;
      if (selectedMr !== 'ALL') query += `&mr_id=${selectedMr}`;
      if (selectedHq !== 'ALL') query += `&hq_id=${selectedHq}`;
      if (selectedWorkType !== 'ALL') query += `&work_type=${encodeURIComponent(selectedWorkType)}`;
      if (selectedStatus !== 'ALL') query += `&status=${selectedStatus}`;

      let res = await resilientFetch(`/tour-plans/admin${query}`);
      if (!res.ok) {
        res = await resilientFetch(`/tour-plans/admin-list${query}`);
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const normalized: MonthlyTpItem[] = data.map((item: any) => ({
            id: item.id || item.entry_id || item.tp_id || `tp-${Math.random()}`,
            tp_id: item.tp_id || item.id,
            entry_id: item.entry_id || item.id,
            mr_id: item.mr_id || '',
            mr_name: item.mr_name || 'Field Representative',
            month: item.month || selectedMonth,
            date: item.date || '',
            hq_id: item.hq_id || '',
            hq_name: item.hq_name || 'Shahdol',
            planned_area: item.planned_area || '',
            destination: item.destination || item.planned_area || '',
            work_type: item.work_type || 'Doctor Visit',
            planned_kol_drs: item.planned_kol_drs || '',
            planned_activity: item.planned_activity || '',
            route_batch_id: item.route_batch_id,
            route_batch_code: item.route_batch_code,
            route_batch_name: item.route_batch_name,
            route: item.route,
            route_stops: Array.isArray(item.route_stops) ? item.route_stops : [],
            is_round_trip: item.is_round_trip !== undefined ? item.is_round_trip : true,
            one_way_distance_km:
              item.one_way_distance_km !== undefined
                ? item.one_way_distance_km
                : item.distance_km !== undefined
                ? Math.round((item.distance_km / 2) * 10) / 10
                : undefined,
            round_trip_distance_km:
              item.round_trip_distance_km !== undefined
                ? item.round_trip_distance_km
                : item.distance_km !== undefined
                ? item.distance_km
                : undefined,
            distance_km: item.distance_km,
            reimbursement_rate: item.reimbursement_rate,
            reimbursement_amount: item.reimbursement_amount,
            reimbursement_status: item.reimbursement_status,
            calculation_basis:
              item.calculation_basis ||
              (item.route_batch_code === 'DIRECT_AREA' ? 'ROUND_TRIP_CENTER_TO_BOUNDARY' : 'ROUND_TRIP_BATCH'),
            status: item.status || item.plan_status || 'SUBMITTED',
            created_at: item.created_at || item.submitted_at || new Date().toISOString(),
            remarks: item.remarks || '',
          }));
          setPlans(normalized);
        }
      }
    } catch {
      // Silent error suppression during background sync
    }
  };

  useEffect(() => {
    if (activeSubTab === 'schedules') {
      fetchMonthlyPlans();
      setCurrentPage(1);
    }
  }, [selectedMr, selectedMonth, selectedHq, selectedWorkType, selectedStatus, activeSubTab]);

  // Real-time live synchronization: update silently on notifications, price changes, or system updates without reloads
  useEffect(() => {
    const handleLiveSync = () => {
      fetchMonthlyPlansSilent();
      fetchRouteBatches(true);
      fetchRouteChangeRequests(true);
    };

    window.addEventListener('ahtri_notification_received', handleLiveSync);
    window.addEventListener('ahtri_tp_updated', handleLiveSync);
    window.addEventListener('ahtri_batch_updated', handleLiveSync);
    window.addEventListener('ahtri_data_updated', handleLiveSync);
    window.addEventListener('ahtri_tasks_updated', handleLiveSync);
    window.addEventListener('ahtri_locations_updated', handleLiveSync);
    window.addEventListener('ahtri_approvals_updated', handleLiveSync);

    return () => {
      window.removeEventListener('ahtri_notification_received', handleLiveSync);
      window.removeEventListener('ahtri_tp_updated', handleLiveSync);
      window.removeEventListener('ahtri_batch_updated', handleLiveSync);
      window.removeEventListener('ahtri_data_updated', handleLiveSync);
      window.removeEventListener('ahtri_tasks_updated', handleLiveSync);
      window.removeEventListener('ahtri_locations_updated', handleLiveSync);
      window.removeEventListener('ahtri_approvals_updated', handleLiveSync);
    };
  }, [selectedMonth, selectedMr, selectedHq, selectedWorkType, selectedStatus]);

  
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (selectedWorkType !== 'ALL' && p.work_type !== selectedWorkType) return false;
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (p.mr_name && p.mr_name.toLowerCase().includes(q)) ||
          (p.hq_name && p.hq_name.toLowerCase().includes(q)) ||
          (p.planned_area && p.planned_area.toLowerCase().includes(q)) ||
          (p.route_batch_code && p.route_batch_code.toLowerCase().includes(q)) ||
          (p.route && p.route.toLowerCase().includes(q)) ||
          (p.planned_kol_drs && p.planned_kol_drs.toLowerCase().includes(q)) ||
          (p.planned_activity && p.planned_activity.toLowerCase().includes(q)) ||
          (p.date && p.date.includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [plans, selectedWorkType, selectedStatus, searchQuery]);

  
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage) || 1;
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPlans.slice(start, start + itemsPerPage);
  }, [filteredPlans, currentPage, itemsPerPage]);

  
  const kpiStats = useMemo(() => {
    const totalVisits = filteredPlans.length;
    const pendingCount = filteredPlans.filter((p) => (p.reimbursement_status || p.status) === 'PENDING' || p.status === 'SUBMITTED').length;
    const approvedCount = filteredPlans.filter((p) => (p.reimbursement_status || p.status) === 'APPROVED').length;
    const distinctMrs = new Set(filteredPlans.map((p) => p.mr_name)).size;
    const totalDistance = filteredPlans.reduce((acc, p) => acc + (p.distance_km || 0), 0);
    const totalReimbursement = filteredPlans.reduce((acc, p) => acc + (resolveItemBatchRateAndAmount(p).effectiveAmount || 0), 0);
    return { totalVisits, pendingCount, approvedCount, distinctMrs, totalDistance, totalReimbursement };
  }, [filteredPlans, routeBatches]);

  const distinctPlans = useMemo(() => {
    const map = new Map<string, {
      tp_id: string;
      mr_id: string;
      mr_name: string;
      month: string;
      hq_name: string;
      status: string;
      totalVisits: number;
      approvedVisits: number;
    }>();

    filteredPlans.forEach((p) => {
      const tpId = p.tp_id;
      if (!tpId) return;
      const isAppr = (p.reimbursement_status || p.status) === 'APPROVED';
      const existing = map.get(tpId);
      if (!existing) {
        map.set(tpId, {
          tp_id: tpId,
          mr_id: p.mr_id,
          mr_name: p.mr_name,
          month: p.month,
          hq_name: p.hq_name,
          status: p.status,
          totalVisits: 1,
          approvedVisits: isAppr ? 1 : 0,
        });
      } else {
        existing.totalVisits += 1;
        if (isAppr) existing.approvedVisits += 1;
        if ((p.status === 'APPROVED' || p.reimbursement_status === 'APPROVED') && existing.status !== 'APPROVED') {
          existing.status = 'APPROVED';
        }
      }
    });

    // Auto-resolve: if all visits are approved, mark plan as APPROVED
    map.forEach((dp) => {
      if (dp.totalVisits > 0 && dp.approvedVisits === dp.totalVisits) {
        dp.status = 'APPROVED';
      }
    });

    return Array.from(map.values());
  }, [filteredPlans]);

  const pendingChangeRequestsCount = useMemo(() => {
    return routeChangeRequests.filter((r) => r.status === 'PENDING').length;
  }, [routeChangeRequests]);

  
  const filteredBatches = useMemo(() => {
    return routeBatches.filter((b) => {
      if (batchHqFilter !== 'ALL' && b.hq_id !== batchHqFilter && b.hq_name !== batchHqFilter) return false;
      if (batchMrFilter !== 'ALL' && b.mr_id !== batchMrFilter) return false;
      if (batchSearchQuery.trim()) {
        const q = batchSearchQuery.toLowerCase();
        const inCode = b.batch_code?.toLowerCase().includes(q);
        const inName = b.name?.toLowerCase().includes(q);
        const inMr = b.mr_name?.toLowerCase().includes(q);
        const inHq = b.hq_name?.toLowerCase().includes(q);
        const inStops = b.route_stops?.some((s) => s.toLowerCase().includes(q));
        if (!inCode && !inName && !inMr && !inHq && !inStops) return false;
      }
      return true;
    });
  }, [routeBatches, batchHqFilter, batchMrFilter, batchSearchQuery]);

  
  const handleDecideReimbursement = async (
    item: MonthlyTpItem,
    newStatus: 'APPROVED' | 'REJECTED',
    remarks?: string,
  ) => {
    setProcessingTpId(item.entry_id || item.id);
    try {
      const res = await resilientFetch(`/tour-plans/${item.tp_id}/entries/${item.entry_id}/reimbursement`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          remarks: remarks || `Reimbursement ${newStatus.toLowerCase()} by Admin`,
        }),
      });

      if (res.ok) {
        setPlans((prev) =>
          prev.map((p) => {
            if (p.entry_id === item.entry_id || p.id === item.id) {
              return { ...p, reimbursement_status: newStatus, status: newStatus };
            }
            if (newStatus === 'APPROVED' && p.tp_id === item.tp_id) {
              return { ...p, status: 'APPROVED' };
            }
            return p;
          }),
        );
        if (selectedEntryForDetails && (selectedEntryForDetails.entry_id === item.entry_id || selectedEntryForDetails.id === item.id)) {
          setSelectedEntryForDetails((prev) => prev ? { ...prev, reimbursement_status: newStatus, status: newStatus } : null);
        }
        setActionNotice({
          type: 'success',
          message: `✓ Visit marked as ${newStatus} for ${item.mr_name} (${item.date}) and Tour Plan synchronized!`,
        });
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_approvals_updated'));
        fetchMonthlyPlans();
      } else {
        await handleUpdateStatus(item.tp_id, newStatus);
      }
    } catch {
      setActionNotice({
        type: 'error',
        message: 'Network error updating reimbursement status.',
      });
    } finally {
      setProcessingTpId(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  
  const handleDeleteEntry = async (item: MonthlyTpItem) => {
    const entryId = item.entry_id || item.id;
    const planId = item.tp_id || item.plan_id;
    if (!planId) return;

    const ok = await showConfirmModal({
      title: 'Remove Monthly TP Entry',
      message: `Are you sure you want to remove this punched TP entry for ${item.mr_name} on ${item.date} (${item.destination || item.planned_area || 'Visit'})?\n\nThis will remove the entry from the tour plan and recalculate eligible reimbursements.`,
      isDestructive: true,
      confirmText: 'Yes, Remove Entry',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    setProcessingTpId(entryId);
    try {
      const res = await resilientFetch(`/tour-plans/${planId}/entries/${entryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => (p.entry_id || p.id) !== entryId));
        if (selectedEntryForDetails && (selectedEntryForDetails.entry_id || selectedEntryForDetails.id) === entryId) {
          setSelectedEntryForDetails(null);
        }
        setActionNotice({
          type: 'success',
          message: `✓ Removed Monthly TP entry for ${item.mr_name} (${item.date})`,
        });
      } else {
        const errJson = await res.json().catch(() => ({}));
        setActionNotice({
          type: 'error',
          message: errJson.message || 'Failed to remove entry.',
        });
      }
    } catch {
      setActionNotice({
        type: 'error',
        message: 'Network error deleting tour plan entry.',
      });
    } finally {
      setProcessingTpId(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  
  const handleUpdateStatus = async (tpId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessingTpId(tpId);
    try {
      const res = await resilientFetch(`/tour-plans/${tpId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          remarks: `Updated by Admin on ${new Date().toLocaleDateString()}`,
        }),
      });

      if (res.ok) {
        setPlans((prev) =>
          prev.map((p) =>
            p.tp_id === tpId
              ? { ...p, status: newStatus, reimbursement_status: newStatus }
              : p,
          ),
        );
        setActionNotice({
          type: 'success',
          message: `✓ Tour Plan marked as ${newStatus} successfully! All visits and 50m geofenced tasks synchronized.`,
        });
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_approvals_updated'));
        fetchMonthlyPlans();
      } else {
        setActionNotice({
          type: 'error',
          message: 'Failed to update Tour Plan status. Please check backend connection.',
        });
      }
    } catch {
      setActionNotice({
        type: 'error',
        message: 'Network error updating Tour Plan status.',
      });
    } finally {
      setProcessingTpId(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  
  const handleOpenBatchModal = (batch?: RouteBatchItem) => {
    if (batch) {
      setEditingBatch(batch);
      setBatchFormData({
        batch_code: batch.batch_code,
        name: batch.name,
        hq_id: batch.hq_id,
        mr_id: batch.mr_id || '',
        route_stops_str: (batch.route_stops || []).join(' → '),
        distance_km: batch.distance_km,
        standard_reimbursement_rate: batch.standard_reimbursement_rate ?? 0,
        status: batch.status,
      });
    } else {
      setEditingBatch(null);
      setBatchFormData({
        batch_code: `Batch ${(routeBatches.length % 9) + 1}`,
        name: '',
        hq_id: hqs[0]?.id || '',
        mr_id: '',
        route_stops_str: '',
        distance_km: 60,
        standard_reimbursement_rate: 0,
        status: 'ACTIVE',
      });
    }
    setIsBatchModalOpen(true);
  };

  
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const stops = batchFormData.route_stops_str
      .split(/→|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (stops.length === 0) {
      alert('Please enter at least one route stop');
      return;
    }

    const payload = {
      batch_code: batchFormData.batch_code.trim(),
      name: batchFormData.name.trim() || stops.join(' → '),
      hq_id: batchFormData.hq_id,
      mr_id: batchFormData.mr_id || undefined,
      route_stops: stops,
      areas: stops,
      distance_km: Number(batchFormData.distance_km),
      standard_reimbursement_rate: Number(batchFormData.standard_reimbursement_rate),
      status: batchFormData.status,
    };

    try {
      let res;
      if (editingBatch) {
        res = await resilientFetch(`/territories/route-batches/${editingBatch.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        res = await resilientFetch('/territories/route-batches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsBatchModalOpen(false);
        setActionNotice({
          type: 'success',
          message: editingBatch
            ? `✓ Route Batch ${payload.batch_code} updated successfully!`
            : `✓ Route Batch ${payload.batch_code} created successfully!`,
        });
        fetchRouteBatches();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save route batch: ${err.message || 'Validation error'}`);
      }
    } catch {
      alert('Failed to connect to backend server');
    }
  };

  
  const handleToggleBatchStatus = async (batch: RouteBatchItem) => {
    const nextStatus = batch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await resilientFetch(`/territories/route-batches/${batch.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setRouteBatches((prev) =>
          prev.map((b) => (b.id === batch.id ? { ...b, status: nextStatus } : b)),
        );
        setActionNotice({
          type: 'success',
          message: `✓ Batch ${batch.batch_code} is now ${nextStatus}`,
        });
      }
    } catch {
      alert('Error updating batch status');
    }
  };

  
  const handleDeleteBatch = async (batch: RouteBatchItem) => {
    const ok = await showConfirmModal({
      title: `Delete Route Batch "${batch.batch_code}"`,
      message: `Are you sure you want to delete route batch "${batch.batch_code}" (${batch.name})?\n\nThis will remove the route batch template from the territory system.`,
      isDestructive: true,
      confirmText: 'Yes, Delete Route Batch',
      cancelText: 'Cancel',
    });
    if (!ok) {
      return;
    }
    try {
      const res = await resilientFetch(`/territories/route-batches/${batch.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRouteBatches((prev) => prev.filter((b) => b.id !== batch.id));
        setActionNotice({
          type: 'success',
          message: `✓ Batch ${batch.batch_code} deleted successfully`,
        });
      }
    } catch {
      alert('Error deleting route batch');
    }
  };

  
  const handleExportCsv = () => {
    const headers = [
      'Date (DD-MM-YYYY)',
      'Month',
      'Representative',
      'Headquarters',
      'Destination / Area',
      'Route Batch',
      'Route Stops',
      'Distance (KM)',
      'Rate per KM',
      'Reimbursement Amount (INR)',
      'Reimbursement Status',
      'Work Type',
      'KOL Doctors',
      'Planned Activity',
      'Plan Status',
    ];

    const rows = filteredPlans.map((p) => [
      `"${formatDateDDMMYYYY(p.date)}"`,
      `"${p.month}"`,
      `"${p.mr_name.replace(/"/g, '""')}"`,
      `"${p.hq_name.replace(/"/g, '""')}"`,
      `"${(p.destination || p.planned_area).replace(/"/g, '""')}"`,
      `"${(p.route_batch_code || '').replace(/"/g, '""')}"`,
      `"${(p.route || (p.route_stops || []).join(' -> ')).replace(/"/g, '""')}"`,
      `"${p.distance_km ?? ''}"`,
      `"${p.reimbursement_rate ?? ''}"`,
      `"${p.reimbursement_amount ?? ''}"`,
      `"${p.reimbursement_status || ''}"`,
      `"${p.work_type.replace(/"/g, '""')}"`,
      `"${(p.planned_kol_drs || '').replace(/"/g, '""')}"`,
      `"${(p.planned_activity || '').replace(/"/g, '""')}"`,
      `"${p.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Tour_Plan_Reimbursement_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  const handleGenerateTpPdf = () => {
    const list = plans.filter((p) => {
      const pDate = p.date || '';
      if (pdfStartDate && pDate < pdfStartDate) return false;
      if (pdfEndDate && pDate > pdfEndDate) return false;
      if (pdfSelectedHq !== 'ALL' && p.hq_name !== pdfSelectedHq) return false;
      if (pdfSelectedMr !== 'ALL' && p.mr_name !== pdfSelectedMr) return false;
      return true;
    });

    const printWin = window.open('', '_blank', 'width=1000,height=800');
    if (!printWin) {
      alert('Popup blocker prevented opening the print report.');
      return;
    }

    const rowsHtml = list
      .map(
        (p) => `
      <tr>
        <td>${formatDateDDMMYYYY(p.date)}</td>
        <td><strong>${p.mr_name}</strong></td>
        <td>${p.hq_name}</td>
        <td>${p.destination || p.planned_area}</td>
        <td>${p.route_batch_code || 'Manual'} - ${p.route || p.planned_area}</td>
        <td>${p.distance_km ? `${p.distance_km} km` : '-'}</td>
        <td>${p.reimbursement_rate ? `₹${p.reimbursement_rate}` : '-'}</td>
        <td>${p.reimbursement_amount ? `<strong>₹${p.reimbursement_amount}</strong>` : '-'}</td>
        <td><span class="badge ${p.reimbursement_status === 'APPROVED' ? 'approved' : p.reimbursement_status === 'REJECTED' ? 'rejected' : 'pending'}">${p.reimbursement_status || p.status}</span></td>
      </tr>
    `,
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Tour Plan & Reimbursement Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; font-size: 11px; }
          .header { border-bottom: 2px solid #1A3C6E; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 18px; font-weight: 800; color: #1A3C6E; margin: 0 0 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th { background: #F8FAFC; border-bottom: 1.5px solid #CBD5E1; text-align: left; padding: 8px 10px; font-weight: 700; color: #334155; }
          td { border-bottom: 1px solid #E2E8F0; padding: 8px 10px; }
          .badge { padding: 3px 6px; border-radius: 4px; font-weight: 800; font-size: 9.5px; text-transform: uppercase; }
          .approved { background: #DCFCE7; color: #166534; }
          .rejected { background: #FEE2E2; color: #991B1B; }
          .pending { background: #FEF3C7; color: #92400E; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">AHTRI BIOTECH PVT LTD</h1>
            <div>Field Tour Plan & Travel Reimbursement Audit Report</div>
          </div>
          <div>Period: ${formatDateDDMMYYYY(pdfStartDate)} to ${formatDateDDMMYYYY(pdfEndDate)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Representative</th>
              <th>HQ</th>
              <th>Destination</th>
              <th>Route Batch</th>
              <th>Distance</th>
              <th>Rate</th>
              <th>Reimbursement</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding: 20px;">No records found.</td></tr>'}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWin.document.close();
    setIsPdfModalOpen(false);
  };

  
  const activeMrOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      map.set(u.id, u.name);
    });
    plans.forEach((p) => {
      if (p.mr_id && p.mr_name) map.set(p.mr_id, p.mr_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [users, plans]);

  return (
    <div style={{ padding: '18px 20px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ minWidth: 280, flex: '1 1 300px' }}>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-primary, #0F172A)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={22} color="var(--color-brand, #1A3C6E)" style={{ flexShrink: 0 }} />
            <span>Monthly Tour Plan (TP) & Route Batch Management</span>
          </h1>
          <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
            Manage predefined Route Batches, calculate eligible travel distance and travel reimbursement, and review/approve monthly TP schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {activeSubTab === 'schedules' ? (
            <>
              <button
                type="button"
                className="btn-enterprise"
                onClick={() => setIsPdfModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}
              >
                <Printer size={14} />
                <span>Print / PDF Report</span>
              </button>

              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={handleExportCsv}
                disabled={filteredPlans.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={fetchMonthlyPlans}
                disabled={isLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}
              >
                <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-enterprise secondary"
              onClick={() => fetchRouteChangeRequests(false)}
              disabled={isLoadingChangeRequests}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}
            >
              <RefreshCw size={14} className={isLoadingChangeRequests ? 'spin' : ''} />
              <span>Refresh Requests</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: '#F1F5F9',
          padding: 4,
          borderRadius: 8,
          marginBottom: 16,
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('schedules')}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeSubTab === 'schedules' ? '#FFFFFF' : 'transparent',
            color: activeSubTab === 'schedules' ? '#1A3C6E' : '#64748B',
            boxShadow: activeSubTab === 'schedules' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Calendar size={15} />
          <span>
            Monthly TP Schedules & Reimbursements
            {kpiStats.pendingCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {kpiStats.pendingCount}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNavigateToBatches) {
              onNavigateToBatches();
            } else {
              window.location.hash = 'batch_locations';
            }
          }}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            color: '#2563EB',
          }}
          title="Manage circuits, standard rates (₹/km), and assigned locations in dedicated Batch Manager"
        >
          <ExternalLink size={15} />
          <span>Route Batches & Rates ↗</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('change_requests')}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeSubTab === 'change_requests' ? '#FFFFFF' : 'transparent',
            color: activeSubTab === 'change_requests' ? '#1A3C6E' : '#64748B',
            boxShadow: activeSubTab === 'change_requests' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <RefreshCw size={15} />
          <span>
            Route Change Requests
            {pendingChangeRequestsCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {pendingChangeRequestsCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: actionNotice.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color: actionNotice.type === 'success' ? '#166534' : '#991B1B',
            border: `1px solid ${actionNotice.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {actionNotice.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* SUB-VIEW 1: MONTHLY TP SCHEDULES & REIMBURSEMENTS */}
      {activeSubTab === 'schedules' && (
        <>
          {/* KPI Metric Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#EFF6FF', padding: 10, borderRadius: 8, color: '#1E40AF' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Planned Visits</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{kpiStats.totalVisits}</div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#F0FDF4', padding: 10, borderRadius: 8, color: '#15803D' }}>
                <Navigation size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Distance</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#15803D', marginTop: 2 }}>{kpiStats.totalDistance} km</div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#FEF3C7', padding: 10, borderRadius: 8, color: '#B45309' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Calculated Reimbursement</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#B45309', marginTop: 2 }}>₹{kpiStats.totalReimbursement.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#ECFDF5', padding: 10, borderRadius: 8, color: '#065F46' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Approved Claims</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#0F8B5A', marginTop: 2 }}>{kpiStats.approvedCount}</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 18px', marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>TARGET MONTH</label>
                <select
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, fontWeight: 600, background: '#FFFFFF' }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="ALL">All Months</option>
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>REPRESENTATIVE (MR)</label>
                <select
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, fontWeight: 600, background: '#FFFFFF' }}
                  value={selectedMr}
                  onChange={(e) => setSelectedMr(e.target.value)}
                >
                  <option value="ALL">All Representatives ({activeMrOptions.length})</option>
                  {activeMrOptions.map((mr) => (
                    <option key={mr.id} value={mr.id}>{mr.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>HEADQUARTERS (HQ)</label>
                <select
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, fontWeight: 600, background: '#FFFFFF' }}
                  value={selectedHq}
                  onChange={(e) => setSelectedHq(e.target.value)}
                >
                  <option value="ALL">All Headquarters ({hqs.length})</option>
                  {hqs.map((hq) => (
                    <option key={hq.id} value={hq.id}>{hq.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>APPROVAL STATUS</label>
                <select
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, fontWeight: 600, background: '#FFFFFF' }}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>KEYWORD SEARCH</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Destination, Route, MR, Date..."
                    style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, boxSizing: 'border-box' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={14} style={{ position: 'absolute', left: 9, top: 10, color: '#94A3B8' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Schedules Table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#1A3C6E' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>Loading monthly tour plans...</div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div style={{ padding: '56px 20px', textAlign: 'center' }}>
                <Calendar size={42} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
                <p style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>No Tour Plan Records Found</p>
                <p style={{ fontSize: 12.5, color: '#64748B', maxWidth: 440, margin: '0 auto' }}>
                  No tour plan matches the selected filters for month {selectedMonth}.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '10%' }}>Date</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '13%' }}>MR / Representative</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '8%' }}>HQ</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '12%' }}>Destination</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '19%' }}>Route / Batch Type</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '9%', textAlign: 'right' }}>Distance (2-Way)</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '8%', textAlign: 'right' }}>Rate / km</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '11%', textAlign: 'right' }}>Reimbursement</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '8%', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', width: '10%', textAlign: 'center' }}>Admin Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlans.map((item, idx) => {
                      const isProcessing = processingTpId === (item.entry_id || item.id);
                      const reimbStatus = item.reimbursement_status || item.status;
                      const isApproved = reimbStatus === 'APPROVED';
                      const isRejected = reimbStatus === 'REJECTED';
                      const { effectiveRate, effectiveAmount } = resolveItemBatchRateAndAmount(item);

                      return (
                        <tr
                          key={`${item.id}-${idx}`}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                          }}
                        >
                          {/* Date */}
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1A3C6E', whiteSpace: 'nowrap' }}>
                            📅 {formatDateDDMMYYYY(item.date)}
                          </td>

                          {/* MR */}
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <User size={14} color="#64748B" />
                              <span>{item.mr_name}</span>
                            </div>
                          </td>

                          {/* HQ */}
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ background: '#EFF6FF', color: '#1E40AF', padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11.5 }}>
                              {item.hq_name}
                            </span>
                          </td>

                          {/* Destination & Planned Locations */}
                          <td style={{ padding: '11px 14px', color: '#0F172A' }}>
                            <div style={{ fontWeight: 800 }}>📍 {item.destination || item.planned_area}</div>
                            {item.selected_locations && item.selected_locations.length > 0 && (
                              <div style={{ fontSize: 10.5, color: '#0F8B5A', fontWeight: 600, marginTop: 3 }}>
                                🏥 {item.selected_locations.map((l) => l.name).join(', ')}
                              </div>
                            )}
                            {item.planned_kol_drs && item.planned_kol_drs !== 'General Field Coverage' && (
                              <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
                                👤 {item.planned_kol_drs}
                              </div>
                            )}
                          </td>

                          {/* Route Batch & Complete Route */}
                          <td style={{ padding: '11px 14px' }}>
                            {item.calculation_basis === 'ROUND_TRIP_CENTER_TO_BOUNDARY' || item.route_batch_code === 'DIRECT_AREA' ? (
                              <div>
                                <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, fontWeight: 800, fontSize: 10, border: '1px solid #FDE68A', marginRight: 6 }}>
                                  📍 Center ⇄ Boundary (Direct)
                                </span>
                                <div style={{ fontWeight: 600, color: '#334155', marginTop: 2 }}>
                                  {item.route || `${item.hq_name} Center ⇄ ${item.destination || item.planned_area} (Round Trip)`}
                                </div>
                              </div>
                            ) : item.route_batch_code ? (
                              <div>
                                <span style={{ background: '#F1F5F9', color: '#0F172A', padding: '2px 6px', borderRadius: 4, fontWeight: 800, fontSize: 10.5, border: '1px solid #CBD5E1', marginRight: 6 }}>
                                  {item.route_batch_code}
                                </span>
                                <span style={{ fontWeight: 600, color: '#334155' }}>
                                  {item.route || item.route_batch_name || item.planned_area}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#64748B', fontStyle: 'italic' }}>
                                {item.planned_area || 'Manual destination'}
                              </span>
                            )}
                          </td>

                          {/* Distance (Two-Way Round Trip) */}
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            {item.distance_km !== undefined ? (
                              <div>
                                <span style={{ fontWeight: 800, color: '#0F172A' }}>
                                  {item.round_trip_distance_km || item.distance_km} km
                                </span>
                                <div style={{ fontSize: 10, color: '#0284C7', fontWeight: 700 }}>
                                  2-Way (2 × {item.one_way_distance_km || Math.round(((item.distance_km || 0) / 2) * 10) / 10} km)
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Rate / km */}
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#64748B' }}>
                            {effectiveRate !== undefined ? `₹${effectiveRate.toFixed(2)}` : '-'}
                          </td>

                          {/* Calculated Two-Way Reimbursement */}
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            {effectiveAmount !== undefined ? (
                              <div>
                                <span style={{ fontWeight: 800, color: '#0F8B5A', fontSize: 13 }}>
                                  ₹{effectiveAmount.toFixed(2)}
                                </span>
                                <div style={{ fontSize: 10, color: '#64748B' }}>
                                  {item.round_trip_distance_km || item.distance_km}km (2-way) × ₹{(effectiveRate ?? item.reimbursement_rate ?? 0).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '11px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7',
                                color: isApproved ? '#166534' : isRejected ? '#991B1B' : '#92400E',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {isApproved ? <CheckCircle size={12} /> : isRejected ? <AlertCircle size={12} /> : <Clock size={12} />}
                              {reimbStatus}
                            </span>
                          </td>

                          {/* Admin Actions */}
                          <td style={{ padding: '11px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedEntryForDetails(item)}
                                style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '4px 6px', borderRadius: 4, cursor: 'pointer', color: '#1E293B' }}
                                title="View calculation breakdown"
                              >
                                <Eye size={13} />
                              </button>

                              {!isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleDecideReimbursement(item, 'APPROVED')}
                                  disabled={isProcessing}
                                  style={{ background: '#0F8B5A', color: '#FFFFFF', border: 'none', padding: '4px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                  title="Approve Reimbursement"
                                >
                                  <Check size={11} />
                                  <span>Approve</span>
                                </button>
                              )}

                              {!isRejected && (
                                <button
                                  type="button"
                                  onClick={() => handleDecideReimbursement(item, 'REJECTED')}
                                  disabled={isProcessing}
                                  style={{ background: '#FFFFFF', color: '#DC2626', border: '1px solid #FCA5A5', padding: '3px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                  title="Reject Reimbursement"
                                >
                                  <X size={11} />
                                  <span>Reject</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(item)}
                                disabled={isProcessing}
                                style={{ background: '#FFFFFF', color: '#DC2626', border: '1px solid #FECACA', padding: '3px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                title="Remove / Delete Entry"
                              >
                                <Trash2 size={11} />
                                <span>Delete</span>
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

            {/* Pagination Bar */}
            {filteredPlans.length > 0 && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Showing <strong>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPlans.length)}</strong> of <strong>{filteredPlans.length}</strong> visits
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-enterprise secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '4px 8px', fontSize: 12 }}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', padding: '0 8px' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn-enterprise secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    style={{ padding: '4px 8px', fontSize: 12 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}


      {/* SUB-VIEW 3: ROUTE CHANGE REQUESTS */}
      {activeSubTab === 'change_requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header & Filter Controls */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                Field Tour Plan Change Requests
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748B' }}>
                Review requested route batch and location changes on already-approved Tour Plans. Upon approval, agenda and geofenced tasks are automatically updated.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 6 }}>
                {(['ALL', 'PENDING', 'RESOLVED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRcFilterStatus(st)}
                    style={{
                      border: 'none',
                      background: rcFilterStatus === st ? '#FFFFFF' : 'transparent',
                      color: rcFilterStatus === st ? '#1A3C6E' : '#64748B',
                      padding: '5px 12px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: rcFilterStatus === st ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {st === 'ALL' ? 'All Requests' : st === 'PENDING' ? `Pending (${pendingChangeRequestsCount})` : 'Resolved'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => fetchRouteChangeRequests(false)}
                disabled={isLoadingChangeRequests}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
              >
                <RefreshCw size={13} className={isLoadingChangeRequests ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* List of Change Requests */}
          {isLoadingChangeRequests ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 60, textAlign: 'center' }}>
              <RefreshCw size={26} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#1A3C6E' }} />
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>Loading route change requests...</div>
            </div>
          ) : (
            (() => {
              const filteredList = routeChangeRequests.filter((r) => {
                if (rcFilterStatus === 'PENDING') return r.status === 'PENDING';
                if (rcFilterStatus === 'RESOLVED') return r.status === 'APPROVED' || r.status === 'REJECTED';
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '56px 20px', textAlign: 'center' }}>
                    <RefreshCw size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>No Change Requests Found</p>
                    <p style={{ fontSize: 12.5, color: '#64748B' }}>
                      {rcFilterStatus === 'PENDING'
                        ? 'There are no pending route change requests awaiting authorization.'
                        : 'No route change requests match the selected filter.'}
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredList.map((rc) => {
                    const isPending = rc.status === 'PENDING';
                    const isApproved = rc.status === 'APPROVED';
                    const isRejected = rc.status === 'REJECTED';
                    const isProcessing = processingTpId === rc.id;

                    return (
                      <div
                        key={rc.id}
                        style={{
                          background: '#FFFFFF',
                          border: `1.5px solid ${isPending ? '#FDE68A' : isApproved ? '#86EFAC' : '#E2E8F0'}`,
                          borderRadius: 8,
                          padding: '16px 20px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>
                                {rc.mr_name}
                              </span>
                              <span style={{ fontSize: 11.5, background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                                {rc.hq_name || 'HQ Territory'}
                              </span>
                              <span style={{ fontSize: 12, color: '#64748B' }}>
                                Visit Date: <strong>{formatDateDDMMYYYY(rc.date)}</strong>
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                              Submitted: {formatDateDDMMYYYY(rc.created_at)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '3px 9px',
                                borderRadius: 12,
                                background: isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7',
                                color: isApproved ? '#166534' : isRejected ? '#991B1B' : '#92400E',
                              }}
                            >
                              ● {rc.status}
                            </span>
                          </div>
                        </div>

                        {/* Side by side comparison */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }}>
                          {/* Current Approved */}
                          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '12px 14px' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
                              📌 Current Approved Route
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                              {rc.original_batch_name || rc.original_area || 'Standard Circuit'}
                            </div>
                            {rc.original_area && rc.original_area !== rc.original_batch_name && (
                              <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                                Area: {rc.original_area}
                              </div>
                            )}
                            {rc.original_locations && rc.original_locations.length > 0 && (
                              <div style={{ marginTop: 6, fontSize: 11, color: '#64748B' }}>
                                Planned Stops ({rc.original_locations.length}): {rc.original_locations.map((l) => l.name).join(', ')}
                              </div>
                            )}
                          </div>

                          {/* Requested Changes */}
                          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '12px 14px' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 6 }}>
                              ➡️ Requested Deviation / Destination
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#15803D' }}>
                              {rc.requested_batch_name || rc.requested_area || 'Direct Area'}
                            </div>
                            {rc.requested_area && (
                              <div style={{ fontSize: 11.5, color: '#166534', marginTop: 2 }}>
                                Planned Area: {rc.requested_area}
                              </div>
                            )}
                            {rc.requested_locations && rc.requested_locations.length > 0 && (
                              <div style={{ marginTop: 6, fontSize: 11, color: '#166534' }}>
                                Proposed Stops ({rc.requested_locations.length}): {rc.requested_locations.map((l) => l.name).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reason */}
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92400E' }}>MR Stated Reason: </span>
                          <span style={{ fontSize: 12, color: '#78350F' }}>"{rc.reason}"</span>
                        </div>

                        {/* Admin Remarks if already reviewed */}
                        {rc.admin_remarks && (
                          <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 10 }}>
                            Admin Review Notes: <em>"{rc.admin_remarks}"</em>
                          </div>
                        )}

                        {/* Actions */}
                        {isPending && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                            <button
                              type="button"
                              className="btn-enterprise secondary"
                              onClick={() => handleReviewRouteChange(rc.id, 'REJECTED')}
                              disabled={isProcessing}
                              style={{ color: '#DC2626', borderColor: '#FCA5A5', padding: '6px 14px', fontSize: 12 }}
                            >
                              <X size={13} style={{ marginRight: 4 }} />
                              Reject Deviation
                            </button>
                            <button
                              type="button"
                              className="btn-enterprise"
                              onClick={() => handleReviewRouteChange(rc.id, 'APPROVED')}
                              disabled={isProcessing}
                              style={{ background: '#0F8B5A', padding: '6px 16px', fontSize: 12 }}
                            >
                              <Check size={14} style={{ marginRight: 4 }} />
                              {isProcessing ? 'Applying...' : 'Approve & Update Tour Plan'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* MODAL 1: CALCULATION BREAKDOWN MODAL */}
      {selectedEntryForDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Navigation size={20} color="#1A3C6E" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Tour Plan & Reimbursement Calculation
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntryForDetails(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Medical Rep:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 1 }}>{selectedEntryForDetails.mr_name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>HQ:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 1 }}>{selectedEntryForDetails.hq_name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Date:</span>
                  <div style={{ fontWeight: 800, color: '#1A3C6E', marginTop: 1 }}>{formatDateDDMMYYYY(selectedEntryForDetails.date)}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Destination:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 1 }}>{selectedEntryForDetails.destination || selectedEntryForDetails.planned_area}</div>
                </div>
              </div>
            </div>

            {/* Route Details & Travel Mode */}
            <div style={{ marginBottom: 16 }}>
              {selectedEntryForDetails.calculation_basis === 'ROUND_TRIP_CENTER_TO_BOUNDARY' || selectedEntryForDetails.route_batch_code === 'DIRECT_AREA' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: 11, border: '1px solid #FDE68A' }}>
                      📍 Center to Boundary Direct Calculation
                    </span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>
                      (No batch selected • Google Maps center-to-center road reference)
                    </span>
                  </div>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                    {selectedEntryForDetails.route || `${selectedEntryForDetails.hq_name || 'Shahdol'} Center ⇄ ${selectedEntryForDetails.destination || selectedEntryForDetails.planned_area} (Round Trip)`}
                  </div>
                  <div style={{ fontSize: 11, color: '#78350F', marginTop: 4 }}>
                    Distance measured from <strong>{selectedEntryForDetails.hq_name || 'Shahdol'} Center</strong> to the boundary / center of <strong>{selectedEntryForDetails.destination || selectedEntryForDetails.planned_area}</strong>.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    SELECTED ROUTE BATCH: {selectedEntryForDetails.route_batch_code || 'Standard Circuit'}
                  </div>
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>
                    {selectedEntryForDetails.route || selectedEntryForDetails.route_batch_name || selectedEntryForDetails.planned_area}
                  </div>
                </div>
              )}
            </div>

            {/* Calculation Formula Breakdown Card (Two-Way Round Trip) */}
            <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 8, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                  TWO-WAY ROUND TRIP REIMBURSEMENT CALCULATION
                </div>
                <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: 4, fontWeight: 800, fontSize: 10 }}>
                  2-WAY FARE
                </span>
              </div>

              {(() => {
                const oneWay = selectedEntryForDetails.one_way_distance_km || Math.round(((selectedEntryForDetails.distance_km || 0) / 2) * 10) / 10;
                const roundTrip = selectedEntryForDetails.round_trip_distance_km || selectedEntryForDetails.distance_km || (oneWay * 2);
                const { effectiveRate, effectiveAmount } = resolveItemBatchRateAndAmount(selectedEntryForDetails);
                const rate = effectiveRate ?? selectedEntryForDetails.reimbursement_rate ?? 0;
                const totalAmount = effectiveAmount ?? Math.round(roundTrip * rate * 100) / 100;

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1.3fr', gap: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10.5, color: '#15803D', fontWeight: 600 }}>One-Way Distance</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{oneWay} km</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10.5, color: '#15803D', fontWeight: 600 }}>Two-Way Round Trip</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0284C7' }}>
                          2 × {oneWay} = {roundTrip} km
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10.5, color: '#15803D', fontWeight: 600 }}>Policy Rate</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>₹{rate.toFixed(2)}/km</div>
                      </div>
                      <div style={{ borderLeft: '1.5px solid #BBF7D0', paddingLeft: 12 }}>
                        <div style={{ fontSize: 10.5, color: '#15803D', fontWeight: 700 }}>Total 2-Way Fare</div>
                        <div style={{ fontSize: 19, fontWeight: 900, color: '#0F8B5A' }}>₹{totalAmount.toFixed(2)}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, padding: '8px 10px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: 11.5, color: '#166534', fontWeight: 700 }}>
                        Formula: {roundTrip} km (Round Trip) × ₹{rate.toFixed(2)}/km = ₹{totalAmount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                        ✓ Calculated based on a complete round trip (two-way fare) rather than just a one-way journey. Visible exclusively to Admin.
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Approval Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12 }}>
                Status: <strong style={{ color: selectedEntryForDetails.reimbursement_status === 'APPROVED' ? '#166534' : selectedEntryForDetails.reimbursement_status === 'REJECTED' ? '#991B1B' : '#B45309' }}>{selectedEntryForDetails.reimbursement_status || selectedEntryForDetails.status}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleDeleteEntry(selectedEntryForDetails)}
                  style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', padding: '7px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={13} />
                  <span>Delete Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecideReimbursement(selectedEntryForDetails, 'REJECTED')}
                  style={{ background: '#FFFFFF', color: '#DC2626', border: '1px solid #FCA5A5', padding: '7px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                >
                  Reject Reimbursement
                </button>
                <button
                  type="button"
                  onClick={() => handleDecideReimbursement(selectedEntryForDetails, 'APPROVED')}
                  style={{ background: '#0F8B5A', color: '#FFFFFF', border: 'none', padding: '7px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                >
                  Approve Reimbursement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL 3: MONTHLY TP PDF GENERATION DIALOG */}
      {isPdfModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={20} color="#1A3C6E" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Generate Tour Plan (TP) PDF
                </h3>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: 12.5, color: '#64748B' }}>
              Select a date range and filters to generate an official printable executive Tour Plan &amp; Reimbursement report.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={pdfStartDate}
                  onChange={(e) => setPdfStartDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={pdfEndDate}
                  onChange={(e) => setPdfEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Filter by Headquarters (HQ)
              </label>
              <select
                value={pdfSelectedHq}
                onChange={(e) => setPdfSelectedHq(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, background: '#FFFFFF', boxSizing: 'border-box' }}
              >
                <option value="ALL">All Headquarters</option>
                {hqs.map((h) => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Filter by Medical Representative (MR)
              </label>
              <select
                value={pdfSelectedMr}
                onChange={(e) => setPdfSelectedMr(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, background: '#FFFFFF', boxSizing: 'border-box' }}
              >
                <option value="ALL">All Medical Representatives</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} {u.hq_name ? `(${u.hq_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setIsPdfModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-enterprise"
                onClick={handleGenerateTpPdf}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={15} />
                <span>Generate &amp; Print PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ROUTE CHANGE REQUEST CUSTOM REVIEW */}
      {reviewModalState.isOpen && reviewModalState.request && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setReviewModalState((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background:
                  reviewModalState.action === 'APPROVED'
                    ? 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)'
                    : 'linear-gradient(180deg, #FEF2F2 0%, #FFFFFF 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: reviewModalState.action === 'APPROVED' ? '#DCFCE7' : '#FEE2E2',
                    color: reviewModalState.action === 'APPROVED' ? '#15803D' : '#DC2626',
                    boxShadow:
                      reviewModalState.action === 'APPROVED'
                        ? '0 2px 8px rgba(34, 197, 94, 0.2)'
                        : '0 2px 8px rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {reviewModalState.action === 'APPROVED' ? <Check size={22} /> : <X size={22} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                    {reviewModalState.action === 'APPROVED'
                      ? 'Approve Route Deviation'
                      : 'Decline Route Deviation'}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {reviewModalState.action === 'APPROVED'
                      ? 'Confirm schedule switch & update agenda tasks automatically.'
                      : 'Decline this change request and keep the original planned route.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalState((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Request Info Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 14,
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Medical Rep</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                      {reviewModalState.request.mr_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Headquarter</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {reviewModalState.request.hq_name || 'Shahdol'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Visit Date</div>
                    <div style={{ fontWeight: 800, color: '#1A3C6E', marginTop: 2 }}>
                      {formatDateDDMMYYYY(reviewModalState.request.date)}
                    </div>
                  </div>
                </div>

                {/* Route Deviation Box */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>
                      Current Planned
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>
                      {reviewModalState.request.original_batch_name || reviewModalState.request.original_area || 'Standard Route'}
                    </div>
                  </div>
                  <ArrowRight size={16} color="#94A3B8" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                      Requested Deviation
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F8B5A', marginTop: 2 }}>
                      {reviewModalState.request.requested_batch_name || reviewModalState.request.requested_area || 'Deviation Route'}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {reviewModalState.request.reason && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: '#475569' }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>MR Stated Reason:</span>{' '}
                    <em>"{reviewModalState.request.reason}"</em>
                  </div>
                )}
              </div>

              {/* Review Note / Remark Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                    Review Note / Instructions for MR
                  </label>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>Optional</span>
                </div>
                <textarea
                  value={reviewModalState.remark}
                  onChange={(e) =>
                    setReviewModalState((prev) => ({ ...prev, remark: e.target.value }))
                  }
                  rows={3}
                  placeholder="Enter a note or instructions for the Medical Representative..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 12.5,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      reviewModalState.action === 'APPROVED' ? '#0F8B5A' : '#EF4444';
                    e.currentTarget.style.boxShadow =
                      reviewModalState.action === 'APPROVED'
                        ? '0 0 0 3px rgba(15, 139, 90, 0.15)'
                        : '0 0 0 3px rgba(239, 68, 68, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />

                {/* Quick Suggestion Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {(reviewModalState.action === 'APPROVED'
                    ? [
                        'Approved by Admin',
                        'Key doctor detailing confirmed',
                        'Authorized for today only',
                      ]
                    : [
                        'Change request declined',
                        'Please continue with standard approved route',
                        'Reschedule for next week',
                      ]
                  ).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setReviewModalState((prev) => ({ ...prev, remark: chip }))}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #F1F5F9',
                background: '#FAFAFA',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setReviewModalState((prev) => ({ ...prev, isOpen: false }))}
                style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-enterprise"
                onClick={handleConfirmReviewModal}
                style={{
                  padding: '8px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  background:
                    reviewModalState.action === 'APPROVED'
                      ? 'linear-gradient(135deg, #10B981 0%, #0F8B5A 100%)'
                      : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  borderColor: reviewModalState.action === 'APPROVED' ? '#0F8B5A' : '#DC2626',
                  color: '#FFFFFF',
                  boxShadow:
                    reviewModalState.action === 'APPROVED'
                      ? '0 4px 12px rgba(15, 139, 90, 0.3)'
                      : '0 4px 12px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                {reviewModalState.action === 'APPROVED' ? <Check size={16} /> : <X size={16} />}
                {reviewModalState.action === 'APPROVED'
                  ? 'Confirm Approval & Apply'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

