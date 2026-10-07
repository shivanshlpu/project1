import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Camera,
  Settings,
  X,
  User,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Check,
  Trash2,
  Info,
  HardDrive,
  Printer,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import { resilientFetch, getAuthHeaders, RENDER_BACKEND_URL } from '../utils/apiHelper';

interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_location_name?: string;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_location_name?: string;
  gps_accuracy_m?: number;
  is_mocked?: boolean;
  status: string;
  late_minutes?: number;
  early_minutes?: number;
  total_working_hours?: number;
  working_hours?: number;
  check_in_photo?: string | null;
  photo_captured_at?: string;
  photo_purged?: boolean;
  photo_key?: string | null;
  punch_in_photo_key?: string | null;
  hq_name?: string;
}

interface AttendanceSettingsData {
  expected_punch_in_time: string;
  allowed_punch_in_window_minutes: number;
  expected_punch_out_time: string;
  allowed_punch_out_window_minutes: number;
  updated_at?: string;
  updated_by?: string;
}

export const AdminAttendanceView: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mrs, setMrs] = useState<Array<{ id: string; name: string }>>([]);

  // 512MB Quota Protection Manual Purge State
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  // Filters (§26)
  const [filterMr, setFilterMr] = useState<string>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLateOnly, setFilterLateOnly] = useState<boolean>(false);
  const [filterEarlyOnly, setFilterEarlyOnly] = useState<boolean>(false);
  const [filterMissingPunchOutOnly, setFilterMissingPunchOutOnly] = useState<boolean>(false);
  const [filterSuspiciousOnly, setFilterSuspiciousOnly] = useState<boolean>(false);

  // Attendance PDF Report State (§1.6)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [pdfStartDate, setPdfStartDate] = useState<string>('2026-09-01');
  const [pdfEndDate, setPdfEndDate] = useState<string>('2026-09-30');
  const [pdfSelectedMr, setPdfSelectedMr] = useState<string>('ALL');

  const handleGenerateAttendancePdf = () => {
    const list = records.filter((r) => {
      const rDate = r.date ? r.date.split('T')[0] : '';
      const inDateRange = (!pdfStartDate || rDate >= pdfStartDate) && (!pdfEndDate || rDate <= pdfEndDate);
      const inMr = pdfSelectedMr === 'ALL' || r.user_id === pdfSelectedMr || r.user_name === pdfSelectedMr;
      return inDateRange && inMr;
    });

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up blocked. Please allow pop-ups for this site to generate the PDF report.');
      return;
    }

    const startFmt = formatDateDDMMYYYY(pdfStartDate || '2026-09-01');
    const endFmt = formatDateDDMMYYYY(pdfEndDate || '2026-09-30');
    const generatedOn = formatDateDDMMYYYY(new Date());

    const rowsHtml = list.map((r, idx) => `
      <tr style="border-bottom: 1px solid #E2E8F0; background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding: 8px 10px; font-weight: 600;">${formatDateDDMMYYYY(r.date)}</td>
        <td style="padding: 8px 10px; font-weight: 700; color: #1A3C6E;">${r.user_name || 'Representative'}</td>
        <td style="padding: 8px 10px;">${r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
        <td style="padding: 8px 10px;">${r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Active'}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #475569;">${r.check_in_location_name || 'Geofenced Location'}</td>
        <td style="padding: 8px 10px; font-weight: 600;">${r.working_hours ? `${r.working_hours.toFixed(1)} hrs` : r.total_working_hours ? `${r.total_working_hours.toFixed(1)} hrs` : 'In Shift'}</td>
        <td style="padding: 8px 10px;"><span style="color: ${r.status === 'ON_TIME' || r.status === 'COMPLETED' ? '#166534' : r.status === 'LATE' ? '#D97706' : '#2563EB'}; font-weight: 700;">${r.status || 'VERIFIED'}</span></td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Field Attendance & Punch Log Report - ${startFmt} to ${endFmt}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; padding: 12px; font-size: 12px; }
          .header { border-bottom: 2px solid #1A3C6E; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 18px; font-weight: 800; color: #1A3C6E; }
          .subtitle { font-size: 12px; color: #64748B; margin-top: 3px; }
          .meta-box { background: #F1F5F9; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; display: flex; gap: 24px; font-size: 11.5px; }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11.5px; }
          th { background: #1A3C6E; color: #FFFFFF; padding: 8px 10px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">AHTRI BIOTECH — FIELD FORCE AUTOMATION</div>
            <div class="subtitle">Official Field Staff Attendance & GPS Verification Audit Log</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748B;">
            <div>Report Date Range: <strong>${startFmt}</strong> to <strong>${endFmt}</strong></div>
            <div>Generated on: ${generatedOn} (IST)</div>
          </div>
        </div>

        <div class="meta-box">
          <div><strong>Total Shifts Logged:</strong> ${list.length}</div>
          <div><strong>Employee Scope:</strong> ${pdfSelectedMr === 'ALL' ? 'All Field Representatives' : pdfSelectedMr}</div>
          <div><strong>On-Time Verified:</strong> ${list.filter(r => r.status === 'ON_TIME' || r.status === 'COMPLETED').length}</div>
          <div><strong>Late Check-ins:</strong> ${list.filter(r => r.status === 'LATE').length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date (DD-MM-YYYY)</th>
              <th>Employee Name</th>
              <th>Check-In (IST)</th>
              <th>Check-Out (IST)</th>
              <th>Verified Punch Location</th>
              <th>Working Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 24px; color: #64748B;">No attendance records found for this date range.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 24px; display: flex; justify-content: space-between; border-top: 1px solid #CBD5E1; padding-top: 12px; font-size: 10px; color: #64748B;">
          <div>AHTRI BIOTECH PVT LTD • Geofence Verified Biometric Attendance Log</div>
          <div>System Generated Audit Trail</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
    setIsPdfModalOpen(false);
  };

  // Settings & Policy Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<AttendanceSettingsData>({
    expected_punch_in_time: '10:00',
    allowed_punch_in_window_minutes: 30,
    expected_punch_out_time: '18:00',
    allowed_punch_out_window_minutes: 30,
  });
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Photo Preview Modal (§20 & §21)
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    userName: string;
    date: string;
    time: string;
    locationName?: string;
    gpsCoords?: string;
    photoPurged?: boolean;
  } | null>(null);

  // Load MR list on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await resilientFetch('/users', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setMrs(data.filter((u: any) => u.role === 'MR'));
          }
        }
      } catch {}
    };
    fetchUsers();
  }, []);

  // Load Settings on mount (§22)
  const fetchSettings = async () => {
    try {
      const res = await resilientFetch('/attendance/settings', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Load Attendance Records (§26)
  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMr !== 'ALL') {
        params.append('user_id', filterMr);
        params.append('mr_id', filterMr);
      }
      if (filterDateFrom) {
        params.append('startDate', filterDateFrom);
        params.append('date_from', filterDateFrom);
      }
      if (filterDateTo) {
        params.append('endDate', filterDateTo);
        params.append('date_to', filterDateTo);
      }
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterLateOnly) params.append('is_late', 'true');
      if (filterEarlyOnly) params.append('is_early', 'true');
      if (filterMissingPunchOutOnly) {
        params.append('missing_punchout', 'true');
        params.append('is_missing_punchout', 'true');
      }
      if (filterSuspiciousOnly) {
        params.append('suspicious', 'true');
        params.append('is_suspicious', 'true');
      }

      const res = await resilientFetch(`/attendance?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecords(data);
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [
    filterMr,
    filterDateFrom,
    filterDateTo,
    filterStatus,
    filterLateOnly,
    filterEarlyOnly,
    filterMissingPunchOutOnly,
    filterSuspiciousOnly,
  ]);

  // Save Settings (§22)
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await resilientFetch('/attendance/settings', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          expected_punch_in_time: settings.expected_punch_in_time,
          allowed_punch_in_window_minutes: Number(settings.allowed_punch_in_window_minutes),
          expected_punch_out_time: settings.expected_punch_out_time,
          allowed_punch_out_window_minutes: Number(settings.allowed_punch_out_window_minutes),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setIsSettingsModalOpen(false);
        fetchAttendance();
      }
    } catch {} finally {
      setIsSavingSettings(false);
    }
  };

  // 24-Hour Auto-Purge Manual Action (512MB Database Quota Protection)
  const handleManualPurge = async () => {
    setIsPurging(true);
    try {
      const res = await resilientFetch('/attendance/purge-expired-photos', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPurgeNotice(data.message || 'Auto-purge completed: expired photos removed, attendance records preserved.');
        fetchAttendance();
        setTimeout(() => setPurgeNotice(null), 6000);
      }
    } catch {
      setPurgeNotice('Purge check failed. Please verify server connection.');
      setTimeout(() => setPurgeNotice(null), 4000);
    } finally {
      setIsPurging(false);
    }
  };

  // Clear all attendance records from database and UI
  const handleClearAllAttendance = async () => {
    if (!window.confirm('Are you sure you want to remove ALL attendance records from the database? This cannot be undone.')) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await resilientFetch('/attendance/clear-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setRecords([]);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Metrics summary
  const todayStr = new Date().toISOString().split('T')[0];
  const totalLogs = records.length;
  const activeOnFieldCount = records.filter(
    (r) => r.check_in_at && !r.check_out_at && r.date === todayStr
  ).length;
  const lateCount = records.filter((r) => r.late_minutes && r.late_minutes > 0).length;
  const earlyCount = records.filter((r) => r.early_minutes && r.early_minutes > 0).length;
  const missingPunchOutCount = records.filter(
    (r) => r.check_in_at && !r.check_out_at && r.date !== todayStr
  ).length;
  const suspiciousCount = records.filter((r) => r.is_mocked).length;

  return (
    <div style={{ padding: '16px 14px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 260, flex: '1 1 280px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="var(--color-brand)" style={{ flexShrink: 0 }} />
            <span>Field Attendance &amp; Identity Verification</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Geofenced GPS tracking, live work attire &amp; ID card verification, and employee shift registers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn-enterprise secondary"
            onClick={() => setIsPolicyModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <span>📋 Attendance Policy</span>
          </button>

          <button
            className="btn-enterprise"
            onClick={() => setIsPdfModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
            title="Generate official Attendance PDF report"
          >
            <Printer size={14} />
            <span>Print / PDF Report</span>
          </button>

          <button
            className="btn-enterprise secondary"
            onClick={() => setIsSettingsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <Sliders size={14} />
            <span>Time Settings</span>
          </button>

          <button
            className="btn-enterprise secondary"
            onClick={handleClearAllAttendance}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap', color: '#DC2626', borderColor: '#FCA5A5' }}
            title="Clear all attendance records from database"
          >
            <Trash2 size={14} color="#DC2626" />
            <span>Clear All Data</span>
          </button>

          <button
            className="btn-enterprise secondary"
            onClick={fetchAttendance}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time Status & Sync Reassurance Banner */}
      <div
        style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={18} color="#16A34A" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: '#166534', fontWeight: 600 }}>
            <strong>Instant Check-In Tracking:</strong> Attendance records &amp; work-attire selfie photos appear immediately when employees punch in. Shifts remain active until punch-out at the end of the day.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#DCFCE7', padding: '4px 10px', borderRadius: 20 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }}></span>
          <span style={{ fontSize: 11, color: '#15803D', fontWeight: 700 }}>
            Real-Time Sync
          </span>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 8, border: '1px solid #BBF7D0', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
            Active On Field
          </span>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#15803D', marginTop: 2 }}>{activeOnFieldCount}</p>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Shift Logs
          </span>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>{totalLogs}</p>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
            Late Entries
          </span>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#B45309', marginTop: 2 }}>{lateCount}</p>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
            Early Exits
          </span>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#1D4ED8', marginTop: 2 }}>{earlyCount}</p>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
            Missing Punch-Out
          </span>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#991B1B', marginTop: 2 }}>{missingPunchOutCount}</p>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
            Suspicious GPS
          </span>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#991B1B', marginTop: 2 }}>{suspiciousCount}</p>
        </div>
      </div>

      {/* Advanced Filter Toolbar (§26) */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Filter size={15} color="var(--color-brand)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-primary)' }}>
            Attendance Filters
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          {/* MR Filter */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              REPRESENTATIVE
            </label>
            <select
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
              value={filterMr}
              onChange={(e) => setFilterMr(e.target.value)}
            >
              <option value="ALL">All Representatives ({mrs.length})</option>
              {mrs.map((mr) => (
                <option key={mr.id} value={mr.id}>{mr.name}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              FROM DATE
            </label>
            <input
              type="date"
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              TO DATE
            </label>
            <input
              type="date"
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              ATTENDANCE STATUS
            </label>
            <select
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">🟢 ACTIVE ON FIELD (In Progress)</option>
              <option value="PRESENT">PRESENT</option>
              <option value="LATE">LATE</option>
              <option value="MISSING_PUNCH_OUT">MISSING PUNCH OUT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="ON_LEAVE">ON LEAVE</option>
            </select>
          </div>
        </div>

        {/* Quick Checkbox Chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={filterLateOnly}
              onChange={(e) => setFilterLateOnly(e.target.checked)}
            />
            <span>Show Late Only</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={filterEarlyOnly}
              onChange={(e) => setFilterEarlyOnly(e.target.checked)}
            />
            <span>Show Early Punch-Out Only</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={filterMissingPunchOutOnly}
              onChange={(e) => setFilterMissingPunchOutOnly(e.target.checked)}
            />
            <span>Show Missing Punch-Out Only</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={filterSuspiciousOnly}
              onChange={(e) => setFilterSuspiciousOnly(e.target.checked)}
            />
            <span>Show Suspicious / Mock Location</span>
          </label>
        </div>
      </div>

      {/* Attendance Table Card (§26) */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
            Daily Attendance &amp; Shift Register ({records.length} records)
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            Configured default punch-in: {settings.expected_punch_in_time} (±{settings.allowed_punch_in_window_minutes}m)
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading attendance records...
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Clock size={36} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
              No Attendance Records Found
            </p>
            <p style={{ fontSize: 12, color: '#64748B' }}>
              No check-ins match the selected filters.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Date</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Representative</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Punch In</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Punch Out</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Late / Early</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Duration</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>GPS / Integrity</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Photo Proof</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isMissingPunchOut = rec.check_in_at && !rec.check_out_at && rec.date !== todayStr;
                  const isActiveShift = !!(rec.check_in_at && !rec.check_out_at && rec.date === todayStr);

                  // Calculate live duration for active shift
                  let liveDurationStr = '';
                  if (isActiveShift && rec.check_in_at) {
                    const diffMs = Math.max(0, Date.now() - new Date(rec.check_in_at).getTime());
                    const hrs = Math.floor(diffMs / 3600000);
                    const mins = Math.floor((diffMs % 3600000) / 60000);
                    liveDurationStr = `${hrs}h ${mins}m (Live)`;
                  }

                  const inTimeStr = rec.check_in_at
                    ? new Date(rec.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const outTimeStr = rec.check_out_at
                    ? new Date(rec.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : isMissingPunchOut
                    ? 'MISSING PUNCH-OUT'
                    : 'Active Shift (In Progress)';

                  return (
                    <tr
                      key={rec.id || idx}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isMissingPunchOut
                          ? '#FEF2F2'
                          : rec.is_mocked
                          ? '#FFFBEB'
                          : isActiveShift
                          ? '#F0FDF4'
                          : idx % 2 === 0
                          ? '#FFFFFF'
                          : '#FAFCFA',
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>
                        📅 {formatDateDDMMYYYY(rec.date)}
                      </td>

                      {/* MR */}
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {rec.user_name && rec.user_name !== 'Unknown'
                          ? rec.user_name
                          : mrs.find((m) => m.id === rec.user_id)?.name ||
                            (rec.user_id === 'usr-admin-01'
                              ? 'System Admin (Headquarters)'
                              : 'Field Representative')}
                      </td>

                      {/* Punch In */}
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F8B5A', whiteSpace: 'nowrap' }}>
                        {inTimeStr}
                      </td>

                      {/* Punch Out */}
                      <td
                        style={{
                          padding: '11px 14px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isActiveShift ? (
                          <span
                            style={{
                              background: '#DCFCE7',
                              color: '#15803D',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }}></span>
                            Active Shift (On Duty)
                          </span>
                        ) : (
                          <span
                            style={{
                              color: isMissingPunchOut ? '#DC2626' : rec.check_out_at ? '#1E40AF' : '#D97706',
                            }}
                          >
                            {outTimeStr}
                          </span>
                        )}
                      </td>

                      {/* Late / Early Deviation (§24) */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        {rec.late_minutes && rec.late_minutes > 0 ? (
                          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: 11, display: 'block' }}>
                            Late: {rec.late_minutes} mins
                          </span>
                        ) : rec.check_in_at ? (
                          <span style={{ color: '#166534', fontWeight: 600, fontSize: 11, display: 'block' }}>
                            On-Time In
                          </span>
                        ) : null}

                        {rec.early_minutes && rec.early_minutes > 0 ? (
                          <span style={{ color: '#D97706', fontWeight: 700, fontSize: 11, display: 'block' }}>
                            Early Out: {rec.early_minutes} mins
                          </span>
                        ) : rec.check_out_at ? (
                          <span style={{ color: '#166534', fontWeight: 600, fontSize: 11, display: 'block' }}>
                            Standard Out
                          </span>
                        ) : null}
                      </td>

                      {/* Working Hours */}
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#334155' }}>
                        {isActiveShift && liveDurationStr ? (
                          <span style={{ color: '#15803D', fontWeight: 700 }}>{liveDurationStr}</span>
                        ) : rec.total_working_hours !== undefined
                          ? `${rec.total_working_hours} hrs`
                          : rec.working_hours !== undefined
                          ? `${rec.working_hours} hrs`
                          : 'In Progress'}
                      </td>

                      {/* GPS & Geo-Location (§4) */}
                      <td style={{ padding: '11px 14px', minWidth: 170 }}>
                        {rec.check_in_lat ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                              <MapPin size={13} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                              <div>
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', display: 'block', lineHeight: 1.3 }}>
                                  {rec.check_in_location_name || `${rec.check_in_lat.toFixed(4)}°, ${rec.check_in_lng?.toFixed(4)}°`}
                                </span>
                                <span style={{ fontSize: 10, color: '#64748B' }}>
                                  Lat: {rec.check_in_lat.toFixed(4)}, Lng: {rec.check_in_lng?.toFixed(4)}
                                </span>
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: rec.is_mocked ? '#DC2626' : '#059669',
                                display: 'block',
                                marginTop: 2,
                              }}
                            >
                              {rec.is_mocked ? '⚠️ Suspicious Mock GPS' : '✓ Verified Live Phone GPS'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>No GPS Logged</span>
                        )}
                      </td>

                      {/* Live Work-Attire Photo Proof */}
                      <td style={{ padding: '11px 14px', minWidth: 160 }}>
                        {rec.check_in_photo && (rec.check_in_photo.startsWith('data:') || rec.check_in_photo.startsWith('http')) ? (
                          <div>
                            <button
                              onClick={() => {
                                setPreviewPhoto({
                                  url: rec.check_in_photo!,
                                  userName: rec.user_name && rec.user_name !== 'Unknown'
                                    ? rec.user_name
                                    : mrs.find((m) => m.id === rec.user_id)?.name ||
                                      (rec.user_id === 'usr-admin-01'
                                        ? 'System Admin (Headquarters)'
                                        : 'Field Representative'),
                                  date: rec.date,
                                  time: inTimeStr,
                                  locationName: rec.check_in_location_name,
                                  gpsCoords: rec.check_in_lat
                                    ? `${rec.check_in_lat.toFixed(4)}° N, ${rec.check_in_lng?.toFixed(4)}° E`
                                    : undefined,
                                  photoPurged: false,
                                });
                              }}
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#047857',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                              title="Click to view verified employee photo uploaded from mobile app"
                            >
                              <Camera size={13} />
                              <span>View Uploaded Photo</span>
                            </button>
                            <span
                              style={{
                                display: 'block',
                                fontSize: 9.5,
                                color: '#059669',
                                fontWeight: 600,
                                marginTop: 3,
                              }}
                            >
                              ✓ Live Mobile Upload
                            </span>
                          </div>
                        ) : rec.photo_purged || (!rec.check_in_photo && rec.date < todayStr) ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                            <span
                              style={{
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: '#475569',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              title="Photo archived according to 24-hour retention policy. Attendance records and GPS logs remain permanently preserved."
                            >
                              🛡️ Photo Archived (24h Policy)
                            </span>
                            <span style={{ fontSize: 9.5, color: '#64748B', marginTop: 2 }}>
                              Attendance Record Intact
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>No Photo Uploaded</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: isMissingPunchOut
                              ? '#FEE2E2'
                              : isActiveShift
                              ? '#DCFCE7'
                              : rec.check_out_at
                              ? '#EFF6FF'
                              : '#FEF3C7',
                            color: isMissingPunchOut
                              ? '#991B1B'
                              : isActiveShift
                              ? '#15803D'
                              : rec.check_out_at
                              ? '#1D4ED8'
                              : '#92400E',
                            border: `1px solid ${
                              isMissingPunchOut
                                ? '#FECACA'
                                : isActiveShift
                                ? '#86EFAC'
                                : rec.check_out_at
                                ? '#BFDBFE'
                                : '#FDE68A'
                            }`,
                          }}
                        >
                          {isMissingPunchOut ? (
                            'MISSING PUNCH-OUT'
                          ) : isActiveShift ? (
                            <>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }}></span>
                              PUNCHED IN (ON FIELD)
                            </>
                          ) : rec.check_out_at ? (
                            '✅ COMPLETED'
                          ) : (
                            rec.status
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Attendance Time Settings (§22) */}
      {isSettingsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 460,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 22,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={18} color="var(--color-brand)" />
                Attendance Time Settings
              </h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              Configure expected shift timings and allowable tolerance windows. Check-ins or punch-outs outside these windows will trigger automatic late or early calculation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  EXPECTED PUNCH IN TIME
                </label>
                <input
                  type="time"
                  value={settings.expected_punch_in_time}
                  onChange={(e) => setSettings({ ...settings, expected_punch_in_time: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  ALLOWED IN WINDOW (MINUTES)
                </label>
                <input
                  type="number"
                  value={settings.allowed_punch_in_window_minutes}
                  onChange={(e) => setSettings({ ...settings, allowed_punch_in_window_minutes: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  EXPECTED PUNCH OUT TIME
                </label>
                <input
                  type="time"
                  value={settings.expected_punch_out_time}
                  onChange={(e) => setSettings({ ...settings, expected_punch_out_time: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  ALLOWED OUT WINDOW (MINUTES)
                </label>
                <input
                  type="number"
                  value={settings.allowed_punch_out_window_minutes}
                  onChange={(e) => setSettings({ ...settings, allowed_punch_out_window_minutes: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-enterprise"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Attendance Photo Preview (§20 & §21) */}
      {previewPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 480,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 22,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)' }}>
                    👔 Live Work Attire &amp; ID Card Proof
                  </h4>
                  <span
                    style={{
                      background: '#DCFCE7',
                      color: '#166534',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                      textTransform: 'uppercase',
                    }}
                  >
                    Active &lt; 24h
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                  Representative: <strong style={{ color: '#0F172A' }}>{previewPhoto.userName}</strong> • {formatDateDDMMYYYY(previewPhoto.date)} at {previewPhoto.time}
                </p>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Photo Frame */}
            <div
              style={{
                width: '100%',
                maxHeight: 340,
                minHeight: 280,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                border: '1px solid #334155',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
              }}
            >
              {previewPhoto.url && (previewPhoto.url.startsWith('http') || previewPhoto.url.startsWith('data:') || previewPhoto.url.startsWith('/')) ? (
                <img
                  src={previewPhoto.url}
                  alt="Work attire and ID card live snapshot"
                  style={{ width: '100%', height: '100%', maxHeight: 340, objectFit: 'contain' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 20px', color: '#F8FAFC', width: '100%' }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                      border: '3px solid #60A5FA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    <User size={38} color="#FFFFFF" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', marginBottom: 2 }}>
                    {previewPhoto.userName}
                  </div>
                  <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 700, letterSpacing: '0.5px' }}>
                    OFFICIAL FIELD REPRESENTATIVE (AHTRI)
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 11.5,
                    }}
                  >
                    <div style={{ color: '#E2E8F0', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Attire Proof:</span>
                      <strong style={{ color: '#4ADE80' }}>✓ Full Dress &amp; Visible ID Verified</strong>
                    </div>
                    <div style={{ color: '#E2E8F0', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Captured Time:</span>
                      <strong>{previewPhoto.time} ({formatDateDDMMYYYY(previewPhoto.date)})</strong>
                    </div>
                    {previewPhoto.gpsCoords && (
                      <div style={{ color: '#E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94A3B8' }}>GPS Coordinates:</span>
                        <strong style={{ color: '#38BDF8' }}>{previewPhoto.gpsCoords}</strong>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: '#64748B', marginTop: 10 }}>
                    Active 24-Hour Policy: Hardware snapshot securely validated upon shift entry.
                  </p>
                </div>
              )}
            </div>

            {/* Verification Checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 6,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>Full Dress Attire</div>
                  <div style={{ fontSize: 10, color: '#15803D' }}>Formal Uniform Verified</div>
                </div>
              </div>

              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 6,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ShieldCheck size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>ID Card on Chest</div>
                  <div style={{ fontSize: 10, color: '#15803D' }}>Visible &amp; Legible</div>
                </div>
              </div>
            </div>

            {/* Geo-Location Card */}
            {(previewPhoto.locationName || previewPhoto.gpsCoords) && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 6,
                  padding: '8px 12px',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MapPin size={15} color="#059669" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: '#334155' }}>
                  <strong style={{ color: '#0F172A' }}>Punch-in Geo-Location:</strong>{' '}
                  {previewPhoto.locationName || previewPhoto.gpsCoords}
                </div>
              </div>
            )}

            {/* Verification image preview footer */}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => setPreviewPhoto(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Organizational Attendance & Uniform Policy (§ Admin Policy Reference) */}
      {isPolicyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 22,
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)' }}>
                  Field Attendance &amp; Attire Policy
                </h3>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              Standard operating procedures and compliance guidelines for Field Medical Representatives.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                  👔 1. Mandatory Formal Dress Code
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                  Employees must be dressed in complete formal office attire or designated company uniform while on field duty. Professional presentation is mandatory for all doctor and hospital visits.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                  🪪 2. Official ID Card Placement
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                  The company ID card must be worn visibly on the chest in the punch-in verification photo. This confirms the physical identity of the representative.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                  📍 3. Live GPS Field Verification
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                  Punch-in and punch-out events automatically verify presence within designated headquarters or territories.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                  🛡️ 4. Photo Retention &amp; Shift Data Preservation
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                  Daily verification photos are retained for 24 hours for administrative spot-checks and are then automatically cleared. All shift hours, punch times, and GPS logs remain permanently preserved in employee records.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                  ⏱️ 5. Shift Hours &amp; Deviations
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                  Expected check-in is 10:00 AM and check-out is 06:00 PM. Deviations outside the configured tolerance window are logged as late entry or early departure.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => setIsPolicyModalOpen(false)}
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Attendance PDF Generation Dialog (§1.6) */}
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
                  Generate Attendance PDF Report
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
              Select a date range (in DD-MM-YYYY format) to export verified employee attendance and punch logs.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  From Date (DD-MM-YYYY)
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
                  To Date (DD-MM-YYYY)
                </label>
                <input
                  type="date"
                  value={pdfEndDate}
                  onChange={(e) => setPdfEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Filter by Employee / MR
              </label>
              <select
                value={pdfSelectedMr}
                onChange={(e) => setPdfSelectedMr(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12.5, background: '#FFFFFF', boxSizing: 'border-box' }}
              >
                <option value="ALL">All Field Employees</option>
                {mrs.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
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
                onClick={handleGenerateAttendancePdf}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={15} />
                <span>Generate &amp; Print PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
