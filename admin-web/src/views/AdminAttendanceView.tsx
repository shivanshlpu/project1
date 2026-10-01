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
  Sliders,
  Check,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  gps_accuracy_m?: number;
  is_mocked?: boolean;
  status: string;
  late_minutes?: number;
  early_minutes?: number;
  total_working_hours?: number;
  check_in_photo?: string | null;
  photo_key?: string | null;
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

  // Filters (§26)
  const [filterMr, setFilterMr] = useState<string>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLateOnly, setFilterLateOnly] = useState<boolean>(false);
  const [filterEarlyOnly, setFilterEarlyOnly] = useState<boolean>(false);
  const [filterMissingPunchOutOnly, setFilterMissingPunchOutOnly] = useState<boolean>(false);
  const [filterSuspiciousOnly, setFilterSuspiciousOnly] = useState<boolean>(false);

  // Settings Modal (§22)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
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
  } | null>(null);

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Load MR list on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${apiUrl}/users`, {
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
  }, [apiUrl]);

  // Load Settings on mount (§22)
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${apiUrl}/attendance/settings`, {
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
  }, [apiUrl]);

  // Load Attendance Records (§26)
  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMr !== 'ALL') params.append('mr_id', filterMr);
      if (filterDateFrom) params.append('date_from', filterDateFrom);
      if (filterDateTo) params.append('date_to', filterDateTo);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterLateOnly) params.append('is_late', 'true');
      if (filterEarlyOnly) params.append('is_early', 'true');
      if (filterMissingPunchOutOnly) params.append('is_missing_punchout', 'true');
      if (filterSuspiciousOnly) params.append('is_suspicious', 'true');

      const res = await fetch(`${apiUrl}/attendance?${params.toString()}`, {
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
      const res = await fetch(`${apiUrl}/attendance/settings`, {
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

  // Metrics summary
  const totalLogs = records.length;
  const lateCount = records.filter((r) => r.late_minutes && r.late_minutes > 0).length;
  const earlyCount = records.filter((r) => r.early_minutes && r.early_minutes > 0).length;
  const missingPunchOutCount = records.filter(
    (r) => r.check_in_at && !r.check_out_at && r.date !== new Date().toISOString().split('T')[0]
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
            Geofenced GPS tracking, live work-attire camera snapshots, anti-mock integrity, and late/early deviation audit.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
            onClick={fetchAttendance}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
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
                  const inTimeStr = rec.check_in_at
                    ? new Date(rec.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const outTimeStr = rec.check_out_at
                    ? new Date(rec.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : isMissingPunchOut
                    ? 'MISSING PUNCH-OUT'
                    : 'Active Shift';

                  return (
                    <tr
                      key={rec.id || idx}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isMissingPunchOut
                          ? '#FEF2F2'
                          : rec.is_mocked
                          ? '#FFFBEB'
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
                        {rec.user_name}
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
                          color: isMissingPunchOut ? '#DC2626' : rec.check_out_at ? '#1E40AF' : '#D97706',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {outTimeStr}
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
                        {rec.total_working_hours !== undefined ? `${rec.total_working_hours} hrs` : 'In Progress'}
                      </td>

                      {/* GPS & Device Integrity (§4) */}
                      <td style={{ padding: '11px 14px' }}>
                        {rec.check_in_lat ? (
                          <div>
                            <span style={{ fontSize: 11, color: '#475569', display: 'block' }}>
                              {rec.check_in_lat.toFixed(4)}, {rec.check_in_lng?.toFixed(4)}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: rec.is_mocked ? '#DC2626' : '#0F8B5A',
                              }}
                            >
                              {rec.is_mocked ? '⚠️ Suspicious Mock Location' : '✓ Genuine Phone GPS'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>No GPS</span>
                        )}
                      </td>

                      {/* Live Work-Attire Photo (§20, §21) */}
                      <td style={{ padding: '11px 14px' }}>
                        {rec.check_in_photo || rec.photo_key ? (
                          <button
                            onClick={() =>
                              setPreviewPhoto({
                                url: rec.check_in_photo || rec.photo_key || '',
                                userName: rec.user_name,
                                date: rec.date,
                                time: inTimeStr,
                              })
                            }
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#1D4ED8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Camera size={12} />
                            <span>View Photo</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>No Photo</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isMissingPunchOut
                              ? '#FEE2E2'
                              : rec.check_out_at
                              ? '#DCFCE7'
                              : '#FEF3C7',
                            color: isMissingPunchOut
                              ? '#991B1B'
                              : rec.check_out_at
                              ? '#166534'
                              : '#92400E',
                          }}
                        >
                          {isMissingPunchOut ? 'MISSING PUNCH-OUT' : rec.status}
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
            background: 'rgba(15, 23, 42, 0.75)',
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
              maxWidth: 420,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 18,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
                  Work-Attire Attendance Photo
                </h4>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {previewPhoto.userName} • {formatDateDDMMYYYY(previewPhoto.date)} at {previewPhoto.time}
                </p>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                width: '100%',
                height: 320,
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              {previewPhoto.url && previewPhoto.url.startsWith('http') || previewPhoto.url.startsWith('data:') ? (
                <img
                  src={previewPhoto.url}
                  alt="Work attire verification"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Camera size={40} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Live Camera Captured Photo</p>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    Photo Key: {previewPhoto.url || 'Encrypted on-device snapshot'}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
    </div>
  );
};
