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
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface MonthlyTpItem {
  id: string;
  tp_id: string;
  entry_id: string;
  mr_id: string;
  mr_name: string;
  month: string;
  date: string;
  hq_id: string;
  hq_name: string;
  planned_area: string;
  work_type: string;
  planned_kol_drs: string;
  planned_activity: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  plan_status?: string;
  created_at: string;
  submitted_at?: string;
  remarks?: string;
}

interface UserOption {
  id: string;
  name: string;
  role?: string;
  hq_name?: string;
}

// Helper to get current YYYY-MM
const getCurrentMonthKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// Generate list of months centered around current month
const generateMonthOptions = () => {
  const options: Array<{ value: string; label: string; isCurrent: boolean }> = [];
  const currentKey = getCurrentMonthKey();
  const [currY, currM] = currentKey.split('-').map(Number);

  // 6 months in the past to 6 months in future
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

export const MonthlyTpView: React.FC = () => {
  const [plans, setPlans] = useState<MonthlyTpItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [hqs, setHqs] = useState<Array<{ id: string; name: string }>>([]);

  // Enterprise Filters (§8)
  const currentMonthKey = getCurrentMonthKey();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedMr, setSelectedMr] = useState<string>('ALL');
  const [selectedHq, setSelectedHq] = useState<string>('ALL');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination for 10,000+ employees
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Status Action state
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingTpId, setProcessingTpId] = useState<string | null>(null);

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Fetch Users & HQs on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [usersRes, hqsRes] = await Promise.all([
          fetch(`${apiUrl}/users`, { headers: getAuthHeaders() }),
          fetch(`${apiUrl}/inventory/hqs`, { headers: getAuthHeaders() }),
        ]);
        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (Array.isArray(uData)) {
            // Include MRs, Sales Officers, and Managers
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
  }, [apiUrl]);

  // Fetch complete Monthly Tour Plan list with fallback and field normalization
  const fetchMonthlyPlans = async () => {
    setIsLoading(true);
    try {
      let query = `?month=${selectedMonth}`;
      if (selectedMr !== 'ALL') query += `&mr_id=${selectedMr}`;
      if (selectedHq !== 'ALL') query += `&hq_id=${selectedHq}`;
      if (selectedWorkType !== 'ALL') query += `&work_type=${encodeURIComponent(selectedWorkType)}`;
      if (selectedStatus !== 'ALL') query += `&status=${selectedStatus}`;

      // Try /tour-plans/admin first, then fallback to /tour-plans/admin-list
      let res = await fetch(`${apiUrl}/tour-plans/admin${query}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        res = await fetch(`${apiUrl}/tour-plans/admin-list${query}`, {
          headers: getAuthHeaders(),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Normalize fields
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
            work_type: item.work_type || 'Doctor Visit',
            planned_kol_drs: item.planned_kol_drs || '',
            planned_activity: item.planned_activity || '',
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

  useEffect(() => {
    fetchMonthlyPlans();
    setCurrentPage(1); // reset to page 1 on filter change
  }, [selectedMr, selectedMonth, selectedHq, selectedWorkType, selectedStatus]);

  // Client-side search and filtering
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
          (p.planned_kol_drs && p.planned_kol_drs.toLowerCase().includes(q)) ||
          (p.planned_activity && p.planned_activity.toLowerCase().includes(q)) ||
          (p.date && p.date.includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [plans, selectedWorkType, selectedStatus, searchQuery]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage) || 1;
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPlans.slice(start, start + itemsPerPage);
  }, [filteredPlans, currentPage, itemsPerPage]);

  // KPI Metrics Calculation
  const kpiStats = useMemo(() => {
    const totalVisits = filteredPlans.length;
    const pendingCount = filteredPlans.filter((p) => p.status === 'SUBMITTED').length;
    const approvedCount = filteredPlans.filter((p) => p.status === 'APPROVED').length;
    const distinctMrs = new Set(filteredPlans.map((p) => p.mr_name)).size;
    return { totalVisits, pendingCount, approvedCount, distinctMrs };
  }, [filteredPlans]);

  // Quick Approve / Reject Handler
  const handleUpdateStatus = async (tpId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessingTpId(tpId);
    try {
      const res = await fetch(`${apiUrl}/tour-plans/${tpId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: newStatus,
          remarks: `Updated by Admin on ${new Date().toLocaleDateString()}`,
        }),
      });

      if (res.ok) {
        // Optimistic UI update
        setPlans((prev) =>
          prev.map((p) => (p.tp_id === tpId ? { ...p, status: newStatus } : p))
        );
        setActionNotice({
          type: 'success',
          message: `✓ Tour Plan schedule marked as ${newStatus} successfully!`,
        });
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

  // Export to CSV for Regional Office Reports
  const handleExportCsv = () => {
    if (filteredPlans.length === 0) return;
    const headers = [
      'Date (DD-MM-YYYY)',
      'Month',
      'Representative',
      'Headquarters',
      'Planned Area / Village',
      'Work Type',
      'Planned KOL / Doctors',
      'Planned Activity',
      'Approval Status',
      'Submitted At',
    ];

    const rows = filteredPlans.map((p) => [
      `"${formatDateDDMMYYYY(p.date)}"`,
      `"${p.month}"`,
      `"${p.mr_name.replace(/"/g, '""')}"`,
      `"${p.hq_name.replace(/"/g, '""')}"`,
      `"${p.planned_area.replace(/"/g, '""')}"`,
      `"${p.work_type.replace(/"/g, '""')}"`,
      `"${(p.planned_kol_drs || '').replace(/"/g, '""')}"`,
      `"${(p.planned_activity || '').replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${p.created_at}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Tour_Plan_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered representatives list
  const activeMrOptions = useMemo(() => {
    // Unique list of MRs from loaded users + any MR in tour plans
    const map = new Map<string, string>();
    users.forEach((u) => {
      map.set(u.id, u.name);
    });
    plans.forEach((p) => {
      if (p.mr_id && p.mr_name) {
        map.set(p.mr_id, p.mr_name);
      }
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
            <span>Monthly Tour Plan (TP) Management</span>
          </h1>
          <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
            Review, verify, and monitor complete monthly travel schedules for Medical Representatives across HQs. Designed to scale seamlessly for 10k+ field personnel.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-enterprise secondary"
            onClick={handleExportCsv}
            disabled={filteredPlans.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}
            title="Export filtered records to CSV"
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
            <span>Refresh Plan Data</span>
          </button>
        </div>
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

      {/* KPI Metric Summary Cards (Scalable Roster Overview) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ background: '#EFF6FF', padding: 10, borderRadius: 8, color: '#1E40AF' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Planned Visits
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
              {kpiStats.totalVisits}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ background: '#FEF3C7', padding: 10, borderRadius: 8, color: '#92400E' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Pending Approvals
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#B45309', marginTop: 2 }}>
              {kpiStats.pendingCount}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ background: '#ECFDF5', padding: 10, borderRadius: 8, color: '#065F46' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Approved Schedules
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F8B5A', marginTop: 2 }}>
              {kpiStats.approvedCount}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ background: '#F1F5F9', padding: 10, borderRadius: 8, color: '#1A3C6E' }}>
            <User size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Field MRs Covered
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
              {kpiStats.distinctMrs}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card (§8 Dynamic Enterprise Filters) */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#1A3C6E" />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              Schedule Filters &amp; Selection
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedMonth !== currentMonthKey && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthKey)}
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Jump to Current Month ({currentMonthKey})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('ALL');
                setSelectedMr('ALL');
                setSelectedHq('ALL');
                setSelectedWorkType('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset All Filters
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {/* Target Month Selector */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              TARGET MONTH
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="ALL">All Months (Consolidated Roster)</option>
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Select MR / Employee */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              SELECT MR / EMPLOYEE ({activeMrOptions.length})
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
              value={selectedMr}
              onChange={(e) => setSelectedMr(e.target.value)}
            >
              <option value="ALL">All Representatives ({activeMrOptions.length})</option>
              {activeMrOptions.map((mr) => (
                <option key={mr.id} value={mr.id}>
                  {mr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select HQ */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              HEADQUARTERS (HQ)
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
              value={selectedHq}
              onChange={(e) => setSelectedHq(e.target.value)}
            >
              <option value="ALL">All Headquarters ({hqs.length})</option>
              {hqs.map((hq) => (
                <option key={hq.id} value={hq.id}>
                  {hq.name}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Status Filter */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              APPROVAL STATUS
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted (Pending Review)</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Needs Correction</option>
            </select>
          </div>

          {/* Type of Work */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              TYPE OF WORK
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
              value={selectedWorkType}
              onChange={(e) => setSelectedWorkType(e.target.value)}
            >
              <option value="ALL">All Work Types</option>
              <option value="Doctor Visit">Doctor Visit</option>
              <option value="Order Collection">Order Collection</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Transit">Transit</option>
              <option value="Induction">Induction</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Keyword Search box */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              KEYWORD SEARCH
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Doctor, Area, MR, Date..."
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 30px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12.5,
                  boxSizing: 'border-box',
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: 9, top: 10, color: '#94A3B8' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Complete Monthly TP Table Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
              Schedule Itinerary ({filteredPlans.length} Planned Visits{' '}
              {selectedMonth !== 'ALL' ? `for ${selectedMonth}` : 'Across All Months'})
            </span>
            <span style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginTop: 2 }}>
              Complete month schedule visible together. Medical Representatives strictly follow this plan for geofence validation.
            </span>
          </div>

          {/* Records per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                background: '#FFFFFF',
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#1A3C6E' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>Loading monthly tour plan entries...</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Syncing schedules with enterprise database</div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <Calendar size={42} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
              No Tour Plan Records Found
            </p>
            <p style={{ fontSize: 12.5, color: '#64748B', maxWidth: 440, margin: '0 auto 16px auto' }}>
              No tour plan submitted for month <strong>{selectedMonth}</strong> with the selected filters.
              Try selecting &quot;All Months&quot; or check if field personnel submitted under another month.
            </p>
            <button
              type="button"
              className="btn-enterprise secondary"
              onClick={() => setSelectedMonth('ALL')}
              style={{ fontSize: 12, fontWeight: 700 }}
            >
              View All Months
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '11%' }}>Date</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '18%' }}>MR / Representative</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '12%' }}>Headquarters</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '14%' }}>Planned Area / Village</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '12%' }}>Work Type</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '15%' }}>KOL Doctors</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '10%' }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'right', width: '8%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlans.map((item, idx) => {
                  const isProcessing = processingTpId === item.tp_id;
                  const isApproved = item.status === 'APPROVED';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <tr
                      key={`${item.id}-${idx}`}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F0F9FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1A3C6E', whiteSpace: 'nowrap' }}>
                        📅 {formatDateDDMMYYYY(item.date)}
                        {item.month && (
                          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: 500 }}>
                            Month: {item.month}
                          </div>
                        )}
                      </td>

                      {/* MR */}
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10.5,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {item.mr_name.charAt(0)}
                          </div>
                          <div>
                            <span style={{ fontWeight: 700 }}>{item.mr_name}</span>
                            {item.remarks && (
                              <div style={{ fontSize: 10.5, color: '#64748B', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* HQ */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            background: '#F1F5F9',
                            color: '#1E293B',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 11.5,
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {item.hq_name}
                        </span>
                      </td>

                      {/* Planned Area */}
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A' }}>
                        📍 {item.planned_area}
                      </td>

                      {/* Type of Work */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            background:
                              item.work_type === 'Doctor Visit'
                                ? '#ECFDF5'
                                : item.work_type === 'Order Collection'
                                ? '#EFF6FF'
                                : '#FEF3C7',
                            color:
                              item.work_type === 'Doctor Visit'
                                ? '#065F46'
                                : item.work_type === 'Order Collection'
                                ? '#1E40AF'
                                : '#92400E',
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {item.work_type}
                        </span>
                      </td>

                      {/* Planned KOL DRS & Activity */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#1E3A8A' }}>
                          {item.planned_kol_drs || 'General Field Detailing'}
                        </div>
                        {item.planned_activity && (
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.planned_activity}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7',
                            color: isApproved ? '#166534' : isRejected ? '#991B1B' : '#92400E',
                            border: `1px solid ${isApproved ? '#86EFAC' : isRejected ? '#FCA5A5' : '#FDE68A'}`,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {isApproved ? (
                            <CheckCircle size={12} color="#166534" />
                          ) : isRejected ? (
                            <AlertCircle size={12} color="#991B1B" />
                          ) : (
                            <Clock size={12} color="#92400E" />
                          )}
                          {item.status || 'SUBMITTED'}
                        </span>
                      </td>

                      {/* Actions (Approve / Reject) */}
                      <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.tp_id, 'APPROVED')}
                              disabled={isProcessing}
                              style={{
                                background: '#0F8B5A',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '5px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title="Approve Tour Plan"
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                          )}

                          {!isRejected && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.tp_id, 'REJECTED')}
                              disabled={isProcessing}
                              style={{
                                background: '#FFFFFF',
                                color: '#DC2626',
                                border: '1px solid #FCA5A5',
                                padding: '4px 7px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title="Request Correction / Reject"
                            >
                              <X size={12} />
                              <span>Reject</span>
                            </button>
                          )}
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
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #E2E8F0',
              background: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Showing{' '}
              <strong>
                {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredPlans.length)}
              </strong>{' '}
              of <strong>{filteredPlans.length}</strong> planned visits
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', padding: '0 8px' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
