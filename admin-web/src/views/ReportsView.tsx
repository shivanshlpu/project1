import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Table,
  FileSpreadsheet,
  FileCode,
  Filter,
  Calendar,
  MapPin,
  User,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Clock,
  Printer,
  Search,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Activity,
  Layers,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import { parseSafeOrders, calculateOrderRevenue } from '../utils/orderHelper';

interface ReportsViewProps {
  lang?: Language;
}

export type ReportCategory = 'visits' | 'attendance' | 'tasks' | 'dcr' | 'expenses';

export interface VisitRecord {
  id: string;
  date: string;
  time: string;
  mr_name: string;
  doctor_name: string;
  clinic: string;
  territory: string;
  lat: number;
  lng: number;
  distance_m: number;
  geofence_status: 'VERIFIED_ON_SITE' | 'OUTSIDE_GEOFENCE';
  duration_mins: number;
  order_amount: number;
  products_detailed: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  mr_name: string;
  hq_name: string;
  check_in_time: string;
  check_out_time: string;
  check_in_location_name: string;
  working_hours: number;
  status: string;
  late_minutes: number;
  device_integrity_status: string;
  distance_meters: number;
}

export interface TaskRecord {
  id: string;
  date: string;
  time: string;
  title: string;
  mr_name: string;
  hq_name: string;
  target_location: string;
  status: string;
  distance_m: number;
  geofence_status: 'VERIFIED_ON_SITE' | 'OUTSIDE_GEOFENCE';
  geofence_verified: boolean;
  duration_minutes: number;
}

export interface DcrRecord {
  id: string;
  date: string;
  mr_name: string;
  hq_name: string;
  territory: string;
  status: string;
  doctor_calls_count: number;
  chemist_calls_count: number;
  total_calls_count: number;
  orders_count: number;
  order_amount: number;
  products_detailed: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  mr_name: string;
  hq_name: string;
  category: string;
  amount: number;
  approved_amount: number;
  status: string;
  route: string;
  distance_km: number;
  remarks: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ lang = 'en' }) => {
  const t = translations[lang] || translations.en;

  // Selected Category
  const [selectedReport, setSelectedReport] = useState<ReportCategory>('visits');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf' | 'json'>('csv');
  const [isLoading, setIsLoading] = useState(false);

  // Raw datasets for each category
  const [visitsData, setVisitsData] = useState<VisitRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [tasksData, setTasksData] = useState<TaskRecord[]>([]);
  const [dcrData, setDcrData] = useState<DcrRecord[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseRecord[]>([]);
  const [mrList, setMrList] = useState<Array<{ id: string; name: string }>>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('ALL');
  const [filterTerritory, setFilterTerritory] = useState('ALL');
  const [filterMr, setFilterMr] = useState('ALL');
  const [filterCategoryStatus, setFilterCategoryStatus] = useState('ALL');
  const [filterOrderOnly, setFilterOrderOnly] = useState(false);

  // Selections & Notices
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Fetch all reports
  const fetchAllReports = async () => {
    setIsLoading(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [visitsRes, attRes, tasksRes, dcrRes, expRes, usersRes] = await Promise.all([
        fetch(`${apiUrl}/reports/visits`, { headers }).catch(() => null),
        fetch(`${apiUrl}/reports/attendance`, { headers }).catch(() => null),
        fetch(`${apiUrl}/reports/tasks`, { headers }).catch(() => null),
        fetch(`${apiUrl}/reports/dcr`, { headers }).catch(() => null),
        fetch(`${apiUrl}/reports/expenses`, { headers }).catch(() => null),
        fetch(`${apiUrl}/users?role=MR`, { headers }).catch(() => null),
      ]);

      if (usersRes && usersRes.ok) {
        const u = await usersRes.json();
        if (Array.isArray(u)) setMrList(u);
      }

      // Visits
      if (visitsRes && visitsRes.ok) {
        const v = await visitsRes.json();
        if (Array.isArray(v)) setVisitsData(v);
      } else {
        // Fallback to /tasks
        const fallbackTasks = await fetch(`${apiUrl}/tasks`, { headers }).then((r) => r.json()).catch(() => []);
        if (Array.isArray(fallbackTasks)) {
          setVisitsData(
            fallbackTasks.map((t: any, idx: number) => {
              const safeOrders = parseSafeOrders(t.orders);
              const orderTotal = calculateOrderRevenue(safeOrders);
              const dStr = t.completed_at ? t.completed_at.split('T')[0] : (t.date || new Date().toISOString().split('T')[0]);
              const timeStr = t.completed_at ? new Date(t.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (t.time || '10:00 AM');
              return {
                id: t.id ? `REC-${String(t.id).slice(-6)}` : `REC-${idx + 1}`,
                date: dStr,
                time: timeStr,
                mr_name: t.assigned_mr_name || 'Unassigned MR',
                doctor_name: t.doctor_name || t.location_name || 'Point of Care',
                clinic: t.clinic_name || t.location_name || 'Clinic',
                territory: t.territory || t.hq_name || 'N/A',
                lat: t.latitude || 23.2953,
                lng: t.longitude || 81.3586,
                distance_m: t.distance_m || 12,
                geofence_status: (t.distance_m || 12) <= 50 ? 'VERIFIED_ON_SITE' : 'OUTSIDE_GEOFENCE',
                duration_mins: t.duration_minutes || 25,
                order_amount: orderTotal,
                products_detailed: safeOrders.map((o: any) => o.product_name).filter(Boolean).join(', ') || 'Product Detailing',
              };
            })
          );
        }
      }

      // Attendance
      if (attRes && attRes.ok) {
        const a = await attRes.json();
        if (Array.isArray(a)) setAttendanceData(a);
      } else {
        const fallbackAtt = await fetch(`${apiUrl}/attendance`, { headers }).then((r) => r.json()).catch(() => []);
        if (Array.isArray(fallbackAtt)) {
          setAttendanceData(
            fallbackAtt.map((a: any) => ({
              id: a.id,
              date: a.date,
              mr_name: a.user_name || a.user_id || 'Staff Member',
              hq_name: a.hq_name || a.hq_id || 'N/A',
              check_in_time: a.check_in_at ? new Date(a.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
              check_out_time: a.check_out_at ? new Date(a.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Shift',
              check_in_location_name: a.check_in_location_name || 'Assigned Territory',
              working_hours: a.working_hours ?? 0,
              status: a.status || 'PRESENT',
              late_minutes: a.late_minutes ?? 0,
              device_integrity_status: a.device_integrity_status || 'VERIFIED',
              distance_meters: a.distance_meters ?? 12,
            }))
          );
        }
      }

      // Tasks
      if (tasksRes && tasksRes.ok) {
        const tk = await tasksRes.json();
        if (Array.isArray(tk)) setTasksData(tk);
      }

      // DCR
      if (dcrRes && dcrRes.ok) {
        const dc = await dcrRes.json();
        if (Array.isArray(dc)) setDcrData(dc);
      }

      // Expenses
      if (expRes && expRes.ok) {
        const ex = await expRes.json();
        if (Array.isArray(ex)) setExpensesData(ex);
      }
    } catch (err) {
      console.warn('ReportsView fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, []);

  // Reset row selection whenever category switches
  useEffect(() => {
    setSelectedRowIds(new Set());
    setFilterCategoryStatus('ALL');
  }, [selectedReport]);

  const reportCategories = [
    {
      id: 'visits' as ReportCategory,
      name: 'Doctor Detailing & Call Analysis',
      desc: 'Call duration, geofence status, sample units dispensed, and orders',
      count: visitsData.length,
    },
    {
      id: 'attendance' as ReportCategory,
      name: 'Field Attendance & Geotag Log',
      desc: 'Punch-in/out timestamps and GPS coordinates for payroll',
      count: attendanceData.length,
    },
    {
      id: 'tasks' as ReportCategory,
      name: 'Task & Geofence Compliance',
      desc: 'Audit trail of completed calls vs 50m perimeter boundary',
      count: tasksData.length,
    },
    {
      id: 'dcr' as ReportCategory,
      name: 'Daily Call Reports (DCR) Ledger',
      desc: 'Daily submission logs, product focus coverage, orders taken',
      count: dcrData.length,
    },
    {
      id: 'expenses' as ReportCategory,
      name: 'Field Expense Claims & Conveyance',
      desc: 'Category-wise claims (TA/DA, fuel, food) with voucher audit',
      count: expensesData.length,
    },
  ];

  // Helper date filtering
  const matchDateRange = (dateStr: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.slice(0, 10);
    const todayStr = new Date().toISOString().split('T')[0];
    if (filterDateRange === 'TODAY') return cleanDate === todayStr;
    if (filterDateRange === 'WEEK') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      return cleanDate >= sevenDaysAgoStr && cleanDate <= todayStr;
    }
    if (filterDateRange === 'MONTH') {
      return cleanDate.startsWith(todayStr.slice(0, 7));
    }
    return true;
  };

  // 1. Filtered Visits
  const filteredVisits = useMemo(() => {
    return visitsData.filter((r) => {
      if (!matchDateRange(r.date)) return false;
      if (filterTerritory !== 'ALL' && !r.territory?.toLowerCase().includes(filterTerritory.toLowerCase())) return false;
      if (filterMr !== 'ALL' && r.mr_name !== filterMr) return false;
      if (filterCategoryStatus !== 'ALL' && r.geofence_status !== filterCategoryStatus) return false;
      if (filterOrderOnly && r.order_amount <= 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.id.toLowerCase().includes(q) ||
          r.mr_name.toLowerCase().includes(q) ||
          r.doctor_name.toLowerCase().includes(q) ||
          r.clinic.toLowerCase().includes(q) ||
          r.territory.toLowerCase().includes(q) ||
          r.products_detailed.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [visitsData, filterDateRange, filterTerritory, filterMr, filterCategoryStatus, filterOrderOnly, searchQuery]);

  // 2. Filtered Attendance
  const filteredAttendance = useMemo(() => {
    return attendanceData.filter((r) => {
      if (!matchDateRange(r.date)) return false;
      if (filterTerritory !== 'ALL' && !r.hq_name?.toLowerCase().includes(filterTerritory.toLowerCase())) return false;
      if (filterMr !== 'ALL' && r.mr_name !== filterMr) return false;
      if (filterCategoryStatus !== 'ALL' && r.status !== filterCategoryStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.id.toLowerCase().includes(q) ||
          r.mr_name.toLowerCase().includes(q) ||
          r.hq_name.toLowerCase().includes(q) ||
          r.check_in_location_name.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [attendanceData, filterDateRange, filterTerritory, filterMr, filterCategoryStatus, searchQuery]);

  // 3. Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasksData.filter((r) => {
      if (!matchDateRange(r.date)) return false;
      if (filterTerritory !== 'ALL' && !r.hq_name?.toLowerCase().includes(filterTerritory.toLowerCase())) return false;
      if (filterMr !== 'ALL' && r.mr_name !== filterMr) return false;
      if (filterCategoryStatus !== 'ALL') {
        if (filterCategoryStatus === 'VERIFIED_ON_SITE' || filterCategoryStatus === 'OUTSIDE_GEOFENCE') {
          if (r.geofence_status !== filterCategoryStatus) return false;
        } else if (r.status !== filterCategoryStatus) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.id.toLowerCase().includes(q) ||
          r.mr_name.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.target_location.toLowerCase().includes(q) ||
          r.hq_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [tasksData, filterDateRange, filterTerritory, filterMr, filterCategoryStatus, searchQuery]);

  // 4. Filtered DCR
  const filteredDcr = useMemo(() => {
    return dcrData.filter((r) => {
      if (!matchDateRange(r.date)) return false;
      if (filterTerritory !== 'ALL' && !r.hq_name?.toLowerCase().includes(filterTerritory.toLowerCase())) return false;
      if (filterMr !== 'ALL' && r.mr_name !== filterMr) return false;
      if (filterCategoryStatus !== 'ALL' && r.status !== filterCategoryStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.id.toLowerCase().includes(q) ||
          r.mr_name.toLowerCase().includes(q) ||
          r.hq_name.toLowerCase().includes(q) ||
          r.territory.toLowerCase().includes(q) ||
          r.products_detailed.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [dcrData, filterDateRange, filterTerritory, filterMr, filterCategoryStatus, searchQuery]);

  // 5. Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expensesData.filter((r) => {
      if (!matchDateRange(r.date)) return false;
      if (filterTerritory !== 'ALL' && !r.hq_name?.toLowerCase().includes(filterTerritory.toLowerCase())) return false;
      if (filterMr !== 'ALL' && r.mr_name !== filterMr) return false;
      if (filterCategoryStatus !== 'ALL' && r.status !== filterCategoryStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.id.toLowerCase().includes(q) ||
          r.mr_name.toLowerCase().includes(q) ||
          r.hq_name.toLowerCase().includes(q) ||
          r.route.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.remarks.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [expensesData, filterDateRange, filterTerritory, filterMr, filterCategoryStatus, searchQuery]);

  // Active records based on selectedReport
  const activeRecords = useMemo(() => {
    switch (selectedReport) {
      case 'visits':
        return filteredVisits;
      case 'attendance':
        return filteredAttendance;
      case 'tasks':
        return filteredTasks;
      case 'dcr':
        return filteredDcr;
      case 'expenses':
        return filteredExpenses;
      default:
        return filteredVisits;
    }
  }, [selectedReport, filteredVisits, filteredAttendance, filteredTasks, filteredDcr, filteredExpenses]);

  // Territories & MR lists based on current category
  const dynamicTerritories = useMemo(() => {
    const set = new Set<string>();
    if (selectedReport === 'visits') visitsData.forEach((r) => r.territory && set.add(r.territory));
    if (selectedReport === 'attendance') attendanceData.forEach((r) => r.hq_name && set.add(r.hq_name));
    if (selectedReport === 'tasks') tasksData.forEach((r) => r.hq_name && set.add(r.hq_name));
    if (selectedReport === 'dcr') dcrData.forEach((r) => (r.hq_name || r.territory) && set.add(r.hq_name || r.territory));
    if (selectedReport === 'expenses') expensesData.forEach((r) => r.hq_name && set.add(r.hq_name));
    set.add('Shahdol');
    return Array.from(set);
  }, [selectedReport, visitsData, attendanceData, tasksData, dcrData, expensesData]);

  const dynamicMRs = useMemo(() => {
    const set = new Set<string>();
    mrList.forEach((m) => m.name && set.add(m.name));
    visitsData.forEach((r) => r.mr_name && set.add(r.mr_name));
    attendanceData.forEach((r) => r.mr_name && set.add(r.mr_name));
    tasksData.forEach((r) => r.mr_name && set.add(r.mr_name));
    dcrData.forEach((r) => r.mr_name && set.add(r.mr_name));
    expensesData.forEach((r) => r.mr_name && set.add(r.mr_name));
    set.add('Aman Rathore');
    return Array.from(set);
  }, [mrList, visitsData, attendanceData, tasksData, dcrData, expensesData]);

  // Dynamic KPI Metrics per Category
  const kpiMetrics = useMemo(() => {
    switch (selectedReport) {
      case 'visits': {
        const total = filteredVisits.length;
        const verified = filteredVisits.filter((r) => r.geofence_status === 'VERIFIED_ON_SITE').length;
        const rate = total > 0 ? ((verified / total) * 100).toFixed(1) : '100.0';
        const revenue = filteredVisits.reduce((acc, r) => acc + (r.order_amount || 0), 0);
        const avgDur = total > 0 ? Math.round(filteredVisits.reduce((acc, r) => acc + (r.duration_mins || 0), 0) / total) : 0;
        return [
          { label: 'Total Calls', val: `${total} Calls`, sub: 'Doctor detailing calls', color: '#0F172A' },
          { label: 'Geofence Compliance', val: `${rate}%`, sub: `${verified} on-site ≤50m`, color: '#0F8B5A' },
          { label: 'Total Orders Booked', val: `₹${revenue.toLocaleString()}`, sub: 'Field revenue generated', color: '#1A3C6E' },
          { label: 'Avg Meeting Duration', val: `${avgDur} mins`, sub: 'Average time with doctor', color: '#334155' },
        ];
      }
      case 'attendance': {
        const total = filteredAttendance.length;
        const verified = filteredAttendance.filter((r) => r.device_integrity_status === 'VERIFIED').length;
        const onTime = filteredAttendance.filter((r) => r.status === 'PRESENT' || r.late_minutes === 0).length;
        const totalHours = Math.round(filteredAttendance.reduce((acc, r) => acc + (r.working_hours || 0), 0) * 10) / 10;
        const onTimeRate = total > 0 ? ((onTime / total) * 100).toFixed(1) : '100.0';
        return [
          { label: 'Total Shifts Logged', val: `${total} Days`, sub: 'Punch-in records', color: '#0F172A' },
          { label: 'On-Time Rate', val: `${onTimeRate}%`, sub: `${onTime} punctual punches`, color: '#0F8B5A' },
          { label: 'Total Working Hours', val: `${totalHours} hrs`, sub: 'Field duty logged', color: '#1A3C6E' },
          { label: 'GPS Integrity Rate', val: `${total > 0 ? ((verified / total) * 100).toFixed(1) : '100.0'}%`, sub: 'Real device verification', color: '#334155' },
        ];
      }
      case 'tasks': {
        const total = filteredTasks.length;
        const verified = filteredTasks.filter((r) => r.geofence_status === 'VERIFIED_ON_SITE').length;
        const completed = filteredTasks.filter((r) => r.status === 'COMPLETED').length;
        const flagged = total - verified;
        const rate = total > 0 ? ((verified / total) * 100).toFixed(1) : '100.0';
        return [
          { label: 'Total Field Tasks', val: `${total} Tasks`, sub: 'Scheduled & ad-hoc', color: '#0F172A' },
          { label: 'Geofence Compliance', val: `${rate}%`, sub: `${verified} within 50m`, color: '#0F8B5A' },
          { label: 'Flagged (>50m)', val: `${flagged} Calls`, sub: 'Outside boundary', color: flagged > 0 ? '#DC2626' : '#64748B' },
          { label: 'Completed Tasks', val: `${completed} Tasks`, sub: `${total > 0 ? ((completed / total) * 100).toFixed(0) : 100}% completion rate`, color: '#1A3C6E' },
        ];
      }
      case 'dcr': {
        const total = filteredDcr.length;
        const docCalls = filteredDcr.reduce((sum, r) => sum + r.doctor_calls_count, 0);
        const chemCalls = filteredDcr.reduce((sum, r) => sum + r.chemist_calls_count, 0);
        const revenue = filteredDcr.reduce((sum, r) => sum + r.order_amount, 0);
        return [
          { label: 'Total DCR Submissions', val: `${total} Reports`, sub: 'Daily summary sheets', color: '#0F172A' },
          { label: 'Total Doctor Calls', val: `${docCalls} Calls`, sub: 'Practitioners visited', color: '#0F8B5A' },
          { label: 'Total Chemist Calls', val: `${chemCalls} Calls`, sub: 'Pharmacies audited', color: '#1A3C6E' },
          { label: 'Total Orders Generated', val: `₹${revenue.toLocaleString()}`, sub: 'Bookings recorded', color: '#334155' },
        ];
      }
      case 'expenses': {
        const total = filteredExpenses.length;
        const totalClaimed = filteredExpenses.reduce((sum, r) => sum + r.amount, 0);
        const totalApproved = filteredExpenses.reduce((sum, r) => sum + r.approved_amount, 0);
        const totalKm = filteredExpenses.reduce((sum, r) => sum + r.distance_km, 0);
        return [
          { label: 'Total Expense Claims', val: `${total} Claims`, sub: 'Conveyance & tour claims', color: '#0F172A' },
          { label: 'Total Claimed Amount', val: `₹${totalClaimed.toLocaleString()}`, sub: 'Submitted reimbursement', color: '#1A3C6E' },
          { label: 'Total Approved Amount', val: `₹${totalApproved.toLocaleString()}`, sub: 'Audit cleared', color: '#0F8B5A' },
          { label: 'Travel Distance', val: `${totalKm} km`, sub: 'Total route mileage', color: '#334155' },
        ];
      }
    }
  }, [selectedReport, filteredVisits, filteredAttendance, filteredTasks, filteredDcr, filteredExpenses]);

  // Row selection toggles
  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === activeRecords.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(activeRecords.map((r: any) => r.id)));
    }
  };

  // CSV Export for each category
  const downloadCSV = (onlySelected: boolean = false) => {
    const target = onlySelected && selectedRowIds.size > 0
      ? activeRecords.filter((r: any) => selectedRowIds.has(r.id))
      : activeRecords;

    if (target.length === 0) {
      setDownloadNotice('No records found for export.');
      setTimeout(() => setDownloadNotice(null), 3000);
      return;
    }

    let headers: string[] = [];
    let rows: any[][] = [];

    if (selectedReport === 'visits') {
      headers = ['ID', 'Date', 'Time', 'Field MR', 'Doctor Name', 'Clinic', 'Territory', 'Distance (m)', 'Geofence Status', 'Duration (mins)', 'Order Value (INR)', 'Products'];
      rows = (target as VisitRecord[]).map((r) => [
        `"${r.id}"`, `"${formatDateDDMMYYYY(r.date)}"`, `"${r.time}"`, `"${r.mr_name}"`, `"${r.doctor_name}"`, `"${r.clinic}"`, `"${r.territory}"`,
        r.distance_m, `"${r.geofence_status}"`, r.duration_mins, r.order_amount, `"${r.products_detailed}"`,
      ]);
    } else if (selectedReport === 'attendance') {
      headers = ['Attendance ID', 'Date', 'Employee (MR)', 'Headquarter', 'Check-In', 'Check-Out', 'Working Hours', 'Status', 'Late Mins', 'Device Integrity'];
      rows = (target as AttendanceRecord[]).map((r) => [
        `"${r.id}"`, `"${formatDateDDMMYYYY(r.date)}"`, `"${r.mr_name}"`, `"${r.hq_name}"`, `"${r.check_in_time}"`, `"${r.check_out_time}"`,
        r.working_hours, `"${r.status}"`, r.late_minutes, `"${r.device_integrity_status}"`,
      ]);
    } else if (selectedReport === 'tasks') {
      headers = ['Task ID', 'Date', 'Time', 'Task Title', 'Assigned MR', 'Target Location', 'Headquarter', 'Perimeter Distance (m)', 'Geofence Compliance', 'Task Status'];
      rows = (target as TaskRecord[]).map((r) => [
        `"${r.id}"`, `"${formatDateDDMMYYYY(r.date)}"`, `"${r.time}"`, `"${r.title}"`, `"${r.mr_name}"`, `"${r.target_location}"`, `"${r.hq_name}"`,
        r.distance_m, `"${r.geofence_status}"`, `"${r.status}"`,
      ]);
    } else if (selectedReport === 'dcr') {
      headers = ['DCR Ref', 'Date', 'Field Representative', 'Headquarter', 'Doctor Calls', 'Chemist Calls', 'Total Calls', 'Orders Amount (INR)', 'Products Focused', 'Status'];
      rows = (target as DcrRecord[]).map((r) => [
        `"${r.id}"`, `"${formatDateDDMMYYYY(r.date)}"`, `"${r.mr_name}"`, `"${r.hq_name}"`, r.doctor_calls_count, r.chemist_calls_count,
        r.total_calls_count, r.order_amount, `"${r.products_detailed}"`, `"${r.status}"`,
      ]);
    } else {
      headers = ['Claim ID', 'Travel Date', 'Employee (MR)', 'Headquarter', 'Expense Category', 'Distance (km)', 'Claim Amount (INR)', 'Approved Amount (INR)', 'Status', 'Route & Remarks'];
      rows = (target as ExpenseRecord[]).map((r) => [
        `"${r.id}"`, `"${formatDateDDMMYYYY(r.date)}"`, `"${r.mr_name}"`, `"${r.hq_name}"`, `"${r.category}"`, r.distance_km,
        r.amount, r.approved_amount, `"${r.status}"`, `"${r.route} - ${r.remarks}"`,
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AHTRI_${selectedReport}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice(`CSV Report exported successfully (${target.length} records).`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  // Structured JSON export
  const downloadJSON = (onlySelected: boolean = false) => {
    const target = onlySelected && selectedRowIds.size > 0
      ? activeRecords.filter((r: any) => selectedRowIds.has(r.id))
      : activeRecords;

    const jsonBlob = new Blob([JSON.stringify(target, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AHTRI_${selectedReport}_Report.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadNotice(`Structured JSON exported (${target.length} records).`);
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  // Direct Print & Executive PDF function
  const handlePrintReport = (onlySelected: boolean = false) => {
    const target = onlySelected && selectedRowIds.size > 0
      ? activeRecords.filter((r: any) => selectedRowIds.has(r.id))
      : activeRecords;

    if (target.length === 0) {
      setDownloadNotice('No records available to print.');
      setTimeout(() => setDownloadNotice(null), 3000);
      return;
    }

    const categoryTitle = reportCategories.find((c) => c.id === selectedReport)?.name || 'Operational Report';

    // Generate table HTML based on category
    let tableHeadersHtml = '';
    let tableRowsHtml = '';

    if (selectedReport === 'visits') {
      tableHeadersHtml = `
        <th>ID</th>
        <th>Date & Time</th>
        <th>Field MR</th>
        <th>Doctor & Clinic</th>
        <th>Territory</th>
        <th>Perimeter Dist</th>
        <th>Geofence</th>
        <th>Duration</th>
        <th>Order Value</th>
      `;
      tableRowsHtml = (target as VisitRecord[]).map((r) => `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${formatDateDDMMYYYY(r.date)} ${r.time}</td>
          <td>${r.mr_name}</td>
          <td><strong>${r.doctor_name}</strong><br/><span style="color:#64748b;font-size:10px;">${r.clinic}</span></td>
          <td>${r.territory}</td>
          <td>${r.distance_m}m</td>
          <td class="${r.geofence_status === 'VERIFIED_ON_SITE' ? 'badge-ok' : 'badge-err'}">${r.geofence_status === 'VERIFIED_ON_SITE' ? 'VERIFIED (≤50m)' : 'OUTSIDE (>50m)'}</td>
          <td>${r.duration_mins} mins</td>
          <td><strong>₹${(r.order_amount || 0).toLocaleString()}</strong></td>
        </tr>
      `).join('');
    } else if (selectedReport === 'attendance') {
      tableHeadersHtml = `
        <th>ID</th>
        <th>Date</th>
        <th>Field MR</th>
        <th>Headquarter</th>
        <th>Check-In</th>
        <th>Check-Out</th>
        <th>Working Hours</th>
        <th>Status</th>
        <th>Device Integrity</th>
      `;
      tableRowsHtml = (target as AttendanceRecord[]).map((r) => `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${formatDateDDMMYYYY(r.date)}</td>
          <td>${r.mr_name}</td>
          <td>${r.hq_name}</td>
          <td>${r.check_in_time}</td>
          <td>${r.check_out_time}</td>
          <td><strong>${r.working_hours} hrs</strong></td>
          <td class="${r.status === 'PRESENT' ? 'badge-ok' : 'badge-warn'}">${r.status}</td>
          <td>${r.device_integrity_status}</td>
        </tr>
      `).join('');
    } else if (selectedReport === 'tasks') {
      tableHeadersHtml = `
        <th>Task ID</th>
        <th>Date & Time</th>
        <th>Field MR</th>
        <th>Target Location / Title</th>
        <th>HQ</th>
        <th>Distance</th>
        <th>Geofence Compliance</th>
        <th>Task Status</th>
      `;
      tableRowsHtml = (target as TaskRecord[]).map((r) => `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${formatDateDDMMYYYY(r.date)} ${r.time}</td>
          <td>${r.mr_name}</td>
          <td><strong>${r.target_location}</strong><br/><span style="color:#64748b;font-size:10px;">${r.title}</span></td>
          <td>${r.hq_name}</td>
          <td>${r.distance_m}m</td>
          <td class="${r.geofence_status === 'VERIFIED_ON_SITE' ? 'badge-ok' : 'badge-err'}">${r.geofence_status === 'VERIFIED_ON_SITE' ? 'VERIFIED (≤50m)' : 'FLAGGED (>50m)'}</td>
          <td><span class="badge-ok">${r.status}</span></td>
        </tr>
      `).join('');
    } else if (selectedReport === 'dcr') {
      tableHeadersHtml = `
        <th>DCR Ref #</th>
        <th>Date</th>
        <th>Field MR</th>
        <th>Headquarter</th>
        <th>Doctor Calls</th>
        <th>Chemist Calls</th>
        <th>Total Calls</th>
        <th>Orders Booked</th>
        <th>Status</th>
      `;
      tableRowsHtml = (target as DcrRecord[]).map((r) => `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${formatDateDDMMYYYY(r.date)}</td>
          <td>${r.mr_name}</td>
          <td>${r.hq_name}</td>
          <td>${r.doctor_calls_count}</td>
          <td>${r.chemist_calls_count}</td>
          <td><strong>${r.total_calls_count}</strong></td>
          <td><strong>₹${(r.order_amount || 0).toLocaleString()}</strong></td>
          <td><span class="badge-ok">${r.status}</span></td>
        </tr>
      `).join('');
    } else {
      tableHeadersHtml = `
        <th>Claim ID</th>
        <th>Travel Date</th>
        <th>Employee (MR)</th>
        <th>Headquarter</th>
        <th>Category</th>
        <th>Distance (km)</th>
        <th>Claim Amount</th>
        <th>Approved Amount</th>
        <th>Status</th>
      `;
      tableRowsHtml = (target as ExpenseRecord[]).map((r) => `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${formatDateDDMMYYYY(r.date)}</td>
          <td>${r.mr_name}</td>
          <td>${r.hq_name}</td>
          <td>${r.category}</td>
          <td>${r.distance_km} km</td>
          <td>₹${(r.amount || 0).toLocaleString()}</td>
          <td><strong style="color:#0F8B5A;">₹${(r.approved_amount || 0).toLocaleString()}</strong></td>
          <td class="${r.status === 'APPROVED' ? 'badge-ok' : r.status === 'REJECTED' ? 'badge-err' : 'badge-warn'}">${r.status}</td>
        </tr>
      `).join('');
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>AHTRI BIOTECH - ${categoryTitle}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 20px; background: #FFFFFF; }
          .header { border-bottom: 2.5px solid #1A3C6E; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-title { font-size: 22px; font-weight: 800; color: #1A3C6E; margin: 0; letter-spacing: 0.5px; }
          .logo-sub { font-size: 11px; color: #475569; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
          .report-tag { background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 800; display: inline-block; margin-top: 6px; }
          .meta-box { font-size: 11px; text-align: right; color: #475569; line-height: 1.5; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .kpi-card { border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; background: #F8FAFC; }
          .kpi-label { font-size: 9.5px; color: #64748B; text-transform: uppercase; font-weight: 700; }
          .kpi-val { font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 2px; }
          .kpi-sub { font-size: 9px; color: #94A3B8; margin-top: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 10px; }
          th { background: #1A3C6E; color: #FFFFFF; text-align: left; padding: 7px 8px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
          td { border-bottom: 1px solid #E2E8F0; padding: 7px 8px; vertical-align: top; }
          tr:nth-child(even) { background: #F8FAFC; }
          .badge-ok { color: #166534; font-weight: 700; }
          .badge-err { color: #DC2626; font-weight: 700; }
          .badge-warn { color: #B45309; font-weight: 700; }
          .footer { margin-top: 25px; padding-top: 12px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 9.5px; color: #64748B; }
          .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 20px; }
          .sig-line { border-top: 1px solid #475569; width: 180px; text-align: center; padding-top: 4px; font-size: 10px; font-weight: 600; color: #334155; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-title">AHTRI BIOTECH PVT. LTD.</div>
            <div class="logo-sub">Field Force Automation • Operational Compliance &amp; Executive Audit</div>
            <div class="report-tag">${categoryTitle.toUpperCase()}</div>
          </div>
          <div class="meta-box">
            <div>Generated: <strong>${formatDateTimeDDMMYYYY(new Date())}</strong></div>
            <div>Territory Scope: <strong>${filterTerritory === 'ALL' ? 'All Territories' : filterTerritory}</strong></div>
            <div>Representative: <strong>${filterMr === 'ALL' ? 'All MRs' : filterMr}</strong></div>
            <div>Records Included: <strong>${target.length} records</strong></div>
          </div>
        </div>

        <div class="kpi-grid">
          ${kpiMetrics
            .map(
              (m) => `
            <div class="kpi-card">
              <div class="kpi-label">${m.label}</div>
              <div class="kpi-val" style="color: ${m.color};">${m.val}</div>
              <div class="kpi-sub">${m.sub}</div>
            </div>
          `
            )
            .join('')}
        </div>

        <table>
          <thead>
            <tr>
              ${tableHeadersHtml}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-line">Prepared By (Command Center)</div>
          <div class="sig-line">Audited By (Finance / Ops)</div>
          <div class="sig-line">Authorized Sign-off (ABM)</div>
        </div>

        <div class="footer">
          <div>Confidential Enterprise Record • Generated via AHTRI FFA Command Center v2.4</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch (e) {
          console.warn('Print trigger error:', e);
        }
      }, 350);
      setDownloadNotice(`Print preview generated for ${target.length} records.`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } else {
      // Fallback: in-page direct print
      window.print();
    }
  };

  const handleExportAction = (onlySelected: boolean = false) => {
    if (selectedFormat === 'csv') {
      downloadCSV(onlySelected);
    } else if (selectedFormat === 'pdf') {
      handlePrintReport(onlySelected);
    } else {
      downloadJSON(onlySelected);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Toolbar */}
      <div className="enterprise-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={22} color="#1A3C6E" />
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#0F172A' }}>
                Operational Reports &amp; Analytics Export Center
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '13px' }}>
              Extract structured datasets in professional CSV, PDF, or JSON format with executive filters.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div
              style={{
                padding: '6px 12px',
                background: '#F1F5F9',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={14} color="#0F8B5A" />
              <span>{activeRecords.length} records ready for export</span>
            </div>

            <button
              type="button"
              onClick={fetchAllReports}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
              <span>Refresh Data</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintReport(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                backgroundColor: '#1A3C6E',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#FFFFFF',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(26, 60, 110, 0.25)',
              }}
            >
              <Printer size={15} />
              <span>🖨️ Print Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. SELECT REPORT CATEGORY GRID */}
      <div className="enterprise-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '800',
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            1. SELECT REPORT CATEGORY
          </label>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Click any category below to switch datasets and tables
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
            gap: '10px',
          }}
        >
          {reportCategories.map((r) => {
            const isSelected = selectedReport === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: `2px solid ${isSelected ? '#1A3C6E' : '#E2E8F0'}`,
                  background: isSelected ? '#EFF6FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  boxShadow: isSelected ? '0 2px 6px rgba(26, 60, 110, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div style={{ fontWeight: '800', color: isSelected ? '#1A3C6E' : '#1E293B', fontSize: '13px' }}>
                    {r.name}
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#1A3C6E' : '#F1F5F9',
                      color: isSelected ? '#FFFFFF' : '#64748B',
                    }}
                  >
                    {r.count}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '15px' }}>{r.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. EXECUTIVE FILTER CONTROLS */}
      <div className="enterprise-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="#1A3C6E" />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. Executive Filter Controls
            </span>
          </div>

          {(searchQuery || filterDateRange !== 'ALL' || filterTerritory !== 'ALL' || filterMr !== 'ALL' || filterCategoryStatus !== 'ALL' || filterOrderOnly) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDateRange('ALL');
                setFilterTerritory('ALL');
                setFilterMr('ALL');
                setFilterCategoryStatus('ALL');
                setFilterOrderOnly(false);
              }}
              style={{
                fontSize: '11.5px',
                color: '#DC2626',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '12px', position: 'relative' }}>
          <Search size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder={`Search across ${reportCategories.find((c) => c.id === selectedReport)?.name} records (MR, location, ID, etc.)...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              fontSize: '12.5px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
          {/* Date Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Date Range
            </label>
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">All Recorded Dates</option>
              <option value="TODAY">Daily (Today)</option>
              <option value="WEEK">Weekly (Last 7 Days)</option>
              <option value="MONTH">Monthly (Current Month)</option>
            </select>
          </div>

          {/* Territory Area */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Territory / HQ
            </label>
            <select
              value={filterTerritory}
              onChange={(e) => setFilterTerritory(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">All Territories</option>
              {dynamicTerritories.map((terr) => (
                <option key={terr} value={terr}>
                  {terr}
                </option>
              ))}
            </select>
          </div>

          {/* Medical Representative */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Medical Representative
            </label>
            <select
              value={filterMr}
              onChange={(e) => setFilterMr(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">All Representatives</option>
              {dynamicMRs.map((mr) => (
                <option key={mr} value={mr}>
                  {mr}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Category Status */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              {selectedReport === 'visits'
                ? 'Geofence Status'
                : selectedReport === 'attendance'
                ? 'Attendance Status'
                : selectedReport === 'tasks'
                ? 'Task Compliance'
                : selectedReport === 'dcr'
                ? 'DCR Status'
                : 'Expense Status'}
            </label>
            <select
              value={filterCategoryStatus}
              onChange={(e) => setFilterCategoryStatus(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">All Statuses</option>
              {selectedReport === 'visits' && (
                <>
                  <option value="VERIFIED_ON_SITE">Verified (≤50m)</option>
                  <option value="OUTSIDE_GEOFENCE">Flagged (&gt;50m)</option>
                </>
              )}
              {selectedReport === 'attendance' && (
                <>
                  <option value="PRESENT">Present (On-Time)</option>
                  <option value="LATE">Late Punch-In</option>
                </>
              )}
              {selectedReport === 'tasks' && (
                <>
                  <option value="VERIFIED_ON_SITE">Verified on Site (≤50m)</option>
                  <option value="OUTSIDE_GEOFENCE">Flagged (&gt;50m)</option>
                  <option value="COMPLETED">Completed</option>
                </>
              )}
              {selectedReport === 'dcr' && (
                <>
                  <option value="SUBMITTED">Submitted</option>
                </>
              )}
              {selectedReport === 'expenses' && (
                <>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending Audit</option>
                  <option value="REJECTED">Rejected</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Checkbox toggle for orders (for visits) */}
        {selectedReport === 'visits' && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="ordersOnlyCheck"
              checked={filterOrderOnly}
              onChange={(e) => setFilterOrderOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="ordersOnlyCheck" style={{ fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
              Show only visits with immediate booked orders (&gt; ₹0)
            </label>
          </div>
        )}
      </div>

      {/* KPI METRIC SUMMARY CHIPS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
        {kpiMetrics.map((kpi, idx) => (
          <div
            key={idx}
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              padding: '14px 18px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: kpi.color, marginTop: '4px' }}>
              {kpi.val}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* 3. UNIFIED EXPORT ACTION CENTER */}
      <div className="enterprise-panel" style={{ padding: '16px 20px', background: '#F8FAFC', border: '1.5px solid #CBD5E1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Format Selection Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3. Export Format:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFormat('csv')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: `1.5px solid ${selectedFormat === 'csv' ? '#0F8B5A' : '#CBD5E1'}`,
                background: selectedFormat === 'csv' ? '#ECFDF5' : '#FFFFFF',
                color: selectedFormat === 'csv' ? '#065F46' : '#475569',
              }}
            >
              <FileSpreadsheet size={15} color={selectedFormat === 'csv' ? '#0F8B5A' : '#64748B'} />
              <span>Excel / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat('pdf')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: `1.5px solid ${selectedFormat === 'pdf' ? '#DC2626' : '#CBD5E1'}`,
                background: selectedFormat === 'pdf' ? '#FEF2F2' : '#FFFFFF',
                color: selectedFormat === 'pdf' ? '#991B1B' : '#475569',
              }}
            >
              <Printer size={15} color={selectedFormat === 'pdf' ? '#DC2626' : '#64748B'} />
              <span>Executive PDF / Print</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat('json')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: `1.5px solid ${selectedFormat === 'json' ? '#1A3C6E' : '#CBD5E1'}`,
                background: selectedFormat === 'json' ? '#EFF6FF' : '#FFFFFF',
                color: selectedFormat === 'json' ? '#1E40AF' : '#475569',
              }}
            >
              <FileCode size={15} color={selectedFormat === 'json' ? '#1A3C6E' : '#64748B'} />
              <span>Structured JSON</span>
            </button>
          </div>

          {/* Action Trigger Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {selectedRowIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear Selection ({selectedRowIds.size})
              </button>
            )}

            {selectedRowIds.size > 0 && (
              <button
                type="button"
                style={{
                  background: '#0F8B5A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={() => handleExportAction(true)}
              >
                <Download size={14} />
                <span>
                  {selectedFormat === 'pdf'
                    ? `Print Selected (${selectedRowIds.size})`
                    : `Download Selected (${selectedRowIds.size}) as ${selectedFormat.toUpperCase()}`}
                </span>
              </button>
            )}

            <button
              type="button"
              style={{
                background: '#1A3C6E',
                border: 'none',
                borderRadius: '6px',
                color: '#FFFFFF',
                padding: '8px 18px',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(26, 60, 110, 0.2)',
              }}
              onClick={() => handleExportAction(false)}
            >
              {selectedFormat === 'pdf' ? <Printer size={15} /> : <Download size={15} />}
              <span>
                {selectedFormat === 'pdf'
                  ? `Print All Filtered (${activeRecords.length})`
                  : `Download All Filtered (${activeRecords.length}) as ${selectedFormat.toUpperCase()}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. INTERACTIVE DATA PREVIEW TABLE */}
      <div className="enterprise-panel">
        <div className="panel-header-bar" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
            <Table size={16} color="#1A3C6E" />
            <span>
              {reportCategories.find((c) => c.id === selectedReport)?.name} Preview ({activeRecords.length} Rows
              {selectedRowIds.size > 0 ? ` • ${selectedRowIds.size} Selected` : ''})
            </span>
          </div>

          <div style={{ fontSize: '11px', color: '#64748B' }}>
            Select rows using checkboxes to export or print specific items
          </div>
        </div>

        {downloadNotice && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 20px', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #BBF7D0' }}>
            <CheckCircle2 size={16} />
            {downloadNotice}
          </div>
        )}

        <div className="enterprise-table-wrapper" style={{ maxHeight: '440px', overflowY: 'auto' }}>
          <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ width: '40px', textAlign: 'center', padding: '10px' }}>
                  <input
                    type="checkbox"
                    title="Select All Records"
                    checked={activeRecords.length > 0 && selectedRowIds.size === activeRecords.length}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#1A3C6E' }}
                  />
                </th>
                {selectedReport === 'visits' && (
                  <>
                    <th>Record ID</th>
                    <th>Date &amp; Time</th>
                    <th>Field MR</th>
                    <th>Doctor &amp; Clinic</th>
                    <th>Territory</th>
                    <th>Perimeter Distance</th>
                    <th>Compliance</th>
                    <th>Duration</th>
                    <th>Order Booked</th>
                  </>
                )}
                {selectedReport === 'attendance' && (
                  <>
                    <th>Attendance ID</th>
                    <th>Date</th>
                    <th>Employee (MR)</th>
                    <th>Headquarter</th>
                    <th>Check-In Time</th>
                    <th>Check-Out Time</th>
                    <th>Hours Logged</th>
                    <th>Status</th>
                    <th>GPS Integrity</th>
                  </>
                )}
                {selectedReport === 'tasks' && (
                  <>
                    <th>Task ID</th>
                    <th>Date &amp; Time</th>
                    <th>Assigned MR</th>
                    <th>Target Clinic / Doctor</th>
                    <th>HQ</th>
                    <th>Distance</th>
                    <th>Geofence Status</th>
                    <th>Execution Status</th>
                  </>
                )}
                {selectedReport === 'dcr' && (
                  <>
                    <th>DCR Ref #</th>
                    <th>Date</th>
                    <th>Field Representative</th>
                    <th>Headquarter / Territory</th>
                    <th>Doctor Calls</th>
                    <th>Chemist Calls</th>
                    <th>Total Calls</th>
                    <th>Orders Booked</th>
                    <th>DCR Status</th>
                  </>
                )}
                {selectedReport === 'expenses' && (
                  <>
                    <th>Claim ID</th>
                    <th>Travel Date</th>
                    <th>Employee (MR)</th>
                    <th>Headquarter</th>
                    <th>Category</th>
                    <th>Distance (km)</th>
                    <th>Claim Amount</th>
                    <th>Approved Amount</th>
                    <th>Audit Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                    <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#334155' }}>No records found</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      No records match the current filter selection in {reportCategories.find((c) => c.id === selectedReport)?.name}.
                    </div>
                  </td>
                </tr>
              ) : (
                activeRecords.map((item: any) => {
                  const isChecked = selectedRowIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: isChecked ? '#EFF6FF' : undefined,
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#1A3C6E' }}
                        />
                      </td>

                      {/* 1. Visits Table Row */}
                      {selectedReport === 'visits' && (
                        <>
                          <td style={{ fontWeight: '700', color: '#1A3C6E' }}>{item.id}</td>
                          <td>
                            <div>{formatDateDDMMYYYY(item.date)}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{item.time}</div>
                          </td>
                          <td style={{ fontWeight: '600' }}>{item.mr_name}</td>
                          <td>
                            <div style={{ fontWeight: '700', color: '#0F172A' }}>{item.doctor_name}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{item.clinic}</div>
                          </td>
                          <td style={{ color: '#475569' }}>{item.territory}</td>
                          <td>
                            <span style={{ fontWeight: '700', color: item.distance_m <= 50 ? '#0F8B5A' : '#DC2626' }}>
                              {item.distance_m}m
                            </span>{' '}
                            <span style={{ fontSize: '10px', color: '#64748B' }}>(≤50m)</span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: item.geofence_status === 'VERIFIED_ON_SITE' ? '#DCFCE7' : '#FEE2E2',
                                color: item.geofence_status === 'VERIFIED_ON_SITE' ? '#166534' : '#991B1B',
                              }}
                            >
                              {item.geofence_status === 'VERIFIED_ON_SITE' ? 'VERIFIED' : 'OUTSIDE'}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{item.duration_mins} mins</td>
                          <td>
                            {item.order_amount > 0 ? (
                              <span style={{ fontWeight: '700', color: '#0F8B5A' }}>
                                ₹{item.order_amount.toLocaleString()}
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '11px' }}>Detailing Only</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* 2. Attendance Table Row */}
                      {selectedReport === 'attendance' && (
                        <>
                          <td style={{ fontWeight: '700', color: '#1A3C6E' }}>{item.id}</td>
                          <td style={{ fontWeight: '600' }}>{formatDateDDMMYYYY(item.date)}</td>
                          <td style={{ fontWeight: '600' }}>{item.mr_name}</td>
                          <td>{item.hq_name}</td>
                          <td>
                            <div style={{ fontWeight: '700', color: '#0F172A' }}>{item.check_in_time}</div>
                            <div style={{ fontSize: '10.5px', color: '#64748B' }}>{item.check_in_location_name}</div>
                          </td>
                          <td>{item.check_out_time}</td>
                          <td style={{ fontWeight: '700', color: '#1A3C6E' }}>{item.working_hours} hrs</td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: item.status === 'PRESENT' ? '#DCFCE7' : '#FEF3C7',
                                color: item.status === 'PRESENT' ? '#166534' : '#92400E',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0F8B5A' }}>
                              ✓ {item.device_integrity_status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* 3. Tasks Table Row */}
                      {selectedReport === 'tasks' && (
                        <>
                          <td style={{ fontWeight: '700', color: '#1A3C6E' }}>{item.id}</td>
                          <td>
                            <div>{formatDateDDMMYYYY(item.date)}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{item.time}</div>
                          </td>
                          <td style={{ fontWeight: '600' }}>{item.mr_name}</td>
                          <td>
                            <div style={{ fontWeight: '700', color: '#0F172A' }}>{item.target_location}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{item.title}</div>
                          </td>
                          <td>{item.hq_name}</td>
                          <td>
                            <span style={{ fontWeight: '700', color: item.distance_m <= 50 ? '#0F8B5A' : '#DC2626' }}>
                              {item.distance_m}m
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: item.geofence_status === 'VERIFIED_ON_SITE' ? '#DCFCE7' : '#FEE2E2',
                                color: item.geofence_status === 'VERIFIED_ON_SITE' ? '#166534' : '#991B1B',
                              }}
                            >
                              {item.geofence_status === 'VERIFIED_ON_SITE' ? 'VERIFIED (≤50m)' : 'FLAGGED (>50m)'}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: item.status === 'COMPLETED' ? '#EFF6FF' : '#F1F5F9',
                                color: item.status === 'COMPLETED' ? '#1D4ED8' : '#475569',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* 4. DCR Table Row */}
                      {selectedReport === 'dcr' && (
                        <>
                          <td style={{ fontWeight: '700', color: '#1A3C6E' }}>{item.id}</td>
                          <td style={{ fontWeight: '600' }}>{formatDateDDMMYYYY(item.date)}</td>
                          <td style={{ fontWeight: '600' }}>{item.mr_name}</td>
                          <td>{item.hq_name || item.territory}</td>
                          <td style={{ fontWeight: '700', color: '#0F8B5A' }}>{item.doctor_calls_count}</td>
                          <td style={{ fontWeight: '700', color: '#1A3C6E' }}>{item.chemist_calls_count}</td>
                          <td style={{ fontWeight: '800' }}>{item.total_calls_count}</td>
                          <td>
                            <span style={{ fontWeight: '700', color: item.order_amount > 0 ? '#0F8B5A' : '#64748B' }}>
                              ₹{(item.order_amount || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: '#DCFCE7',
                                color: '#166534',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* 5. Expenses Table Row */}
                      {selectedReport === 'expenses' && (
                        <>
                          <td style={{ fontWeight: '700', color: '#1A3C6E' }}>{item.id}</td>
                          <td style={{ fontWeight: '600' }}>{formatDateDDMMYYYY(item.date)}</td>
                          <td style={{ fontWeight: '600' }}>{item.mr_name}</td>
                          <td>
                            <div style={{ fontWeight: '700' }}>{item.hq_name}</div>
                            <div style={{ fontSize: '10.5px', color: '#64748B' }}>{item.route}</div>
                          </td>
                          <td>{item.category}</td>
                          <td>{item.distance_km} km</td>
                          <td>₹{(item.amount || 0).toLocaleString()}</td>
                          <td>
                            <strong style={{ color: '#0F8B5A' }}>₹{(item.approved_amount || 0).toLocaleString()}</strong>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor:
                                  item.status === 'APPROVED' ? '#DCFCE7' : item.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                                color:
                                  item.status === 'APPROVED' ? '#166534' : item.status === 'REJECTED' ? '#991B1B' : '#92400E',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
