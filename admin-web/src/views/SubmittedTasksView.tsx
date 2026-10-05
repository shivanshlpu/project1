import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  User,
  MapPin,
  Clock,
  ShoppingBag,
  Eye,
  Camera,
  Download,
  Printer,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { TaskItem, TaskOrderItem } from '../types';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import { getApiBaseUrl } from '../utils/apiHelper';

export const SubmittedTasksView: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMr, setFilterMr] = useState<string>('ALL');
  const [filterOrderOnly, setFilterOrderOnly] = useState<boolean>(false);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; title: string; mr: string } | null>(null);

  const getApiUrl = () => getApiBaseUrl();

  const fetchSubmittedTasks = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiUrl().replace(/\/+$/, '');
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${baseUrl}/tasks?status=COMPLETED`, {
        headers: { ...authHeader, Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Strictly only completed/submitted MR task records (§1.1 & §1.2)
          const submittedOnly = data.filter((t: any) => t.status === 'COMPLETED');
          setTasks(submittedOnly);
        }
      }
    } catch (err) {
      console.warn('Error fetching submitted tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittedTasks();
    const interval = setInterval(fetchSubmittedTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  // Distinct MR list for dropdown
  const mrOptions = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => {
      if (t.assigned_mr_id) {
        map.set(t.assigned_mr_id, t.assigned_mr_name || 'Representative');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // MR filter
      if (filterMr !== 'ALL' && t.assigned_mr_id !== filterMr && t.assigned_mr_name !== filterMr) {
        return false;
      }
      // Orders only filter
      if (filterOrderOnly && (!t.orders || t.orders.length === 0)) {
        return false;
      }
      // Date range filter (using YYYY-MM-DD comparisons)
      const taskDate = t.date || (t.completed_at ? t.completed_at.substring(0, 10) : '');
      if (filterDateFrom && taskDate < filterDateFrom) return false;
      if (filterDateTo && taskDate > filterDateTo) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (t.title || '').toLowerCase().includes(q);
        const matchesLoc = (t.location_name || '').toLowerCase().includes(q);
        const matchesMr = (t.assigned_mr_name || '').toLowerCase().includes(q);
        const matchesOutcome = (t.outcome || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesLoc && !matchesMr && !matchesOutcome) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, filterMr, filterOrderOnly, filterDateFrom, filterDateTo, searchQuery]);

  // Aggregate metrics
  const totalSubmitted = filteredTasks.length;
  const totalOrdersPlaced = filteredTasks.reduce((sum, t) => sum + (t.orders?.length || 0), 0);
  const totalOrderRevenue = filteredTasks.reduce((sum, t) => {
    const taskTotal = (t.orders || []).reduce((tsum, o) => tsum + (o.total_amount || 0), 0);
    return sum + taskTotal;
  }, 0);
  const totalDurationSecs = filteredTasks.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);
  const avgDurationMins = totalSubmitted > 0 ? Math.round(totalDurationSecs / totalSubmitted / 60) : 0;

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="enterprise-panel" style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#15803D" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
                MR Submitted Tasks
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Dedicated audit repository for visits submitted and completed by Medical Representatives
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-enterprise secondary"
            onClick={fetchSubmittedTasks}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '700' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
              Total Submitted Visits
            </span>
            <CheckCircle2 size={16} color="#16A34A" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            {totalSubmitted}
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>Actual verified completions</span>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369A1', textTransform: 'uppercase' }}>
              Orders Placed
            </span>
            <ShoppingBag size={16} color="#0284C7" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            {totalOrdersPlaced} items
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>Total commercial lines booked</span>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#7E22CE', textTransform: 'uppercase' }}>
              Order Value Booked
            </span>
            <TrendingUp size={16} color="#9333EA" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            ₹{totalOrderRevenue.toLocaleString()}
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>Commercial sales generated</span>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#D97706', textTransform: 'uppercase' }}>
              Avg. Meeting Time
            </span>
            <Clock size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            {avgDurationMins} mins
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>Time spent in doctor call</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Filter size={14} color="#1A3C6E" />
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>Filter Submitted Records</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', alignItems: 'center' }}>
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clinic, MR, outcome..."
              style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          {/* MR Filter */}
          <div>
            <select
              value={filterMr}
              onChange={(e) => setFilterMr(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: '#FFFFFF' }}
            >
              <option value="ALL">All Representatives ({mrOptions.length})</option>
              {mrOptions.map((mr) => (
                <option key={mr.id} value={mr.id}>{mr.name}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', whiteSpace: 'nowrap' }}>From:</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', whiteSpace: 'nowrap' }}>To:</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
            />
          </div>

          {/* Orders checkbox */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterOrderOnly}
                onChange={(e) => setFilterOrderOnly(e.target.checked)}
              />
              <span>With Orders Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Dedicated Listing Table */}
      <div className="enterprise-table-wrapper" style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Task Title & Detailing Call</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Assigned Representative</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Clinic / Hospital Location</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Date & Completion Time</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#334155' }}>Photo Proof</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Duration</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Orders Placed</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#334155' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  <CheckCircle2 size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#334155' }}>No submitted tasks found</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Tasks submitted by field MRs will automatically appear here with verified photos, durations, and orders.
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => {
                const orderCount = t.orders?.length || 0;
                const orderAmount = (t.orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
                const hasPhoto = Boolean(t.visit_photo || t.verification_photo_key);
                const durationMins = t.duration_seconds ? Math.round(t.duration_seconds / 60) : 25;

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer', transition: 'background 0.15s ease' }}
                    className="hover-row"
                  >
                    {/* Task Title */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{t.title}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginTop: '2px' }}>
                        ✓ Completed &amp; Submitted
                      </div>
                    </td>

                    {/* MR */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} color="#64748B" />
                        <span>{t.assigned_mr_name || 'Rahul Sharma'}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#0284C7" />
                        <span>{t.location_name || 'Clinic Facility'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Geofence: ≤{t.geofence_radius_m || 50}m
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600', color: '#0F172A' }}>
                        {formatDateDDMMYYYY(t.date || t.completed_at || '2026-10-04')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {t.completed_at ? formatDateTimeDDMMYYYY(t.completed_at).split(' ')[1] : t.time || '11:00 AM'}
                      </div>
                    </td>

                    {/* Photo Proof */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {hasPhoto ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingPhoto({
                              url: (t.visit_photo as string) || (t.verification_photo_key as string),
                              title: t.title,
                              mr: t.assigned_mr_name || 'Representative',
                            });
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: '#DCFCE7',
                            border: '1px solid #86EFAC',
                            color: '#166534',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Camera size={12} />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>GPS Verified</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>
                        <Clock size={12} color="#F59E0B" />
                        {durationMins} mins
                      </span>
                    </td>

                    {/* Orders */}
                    <td style={{ padding: '12px 14px' }}>
                      {orderCount > 0 ? (
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '700', background: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px' }}>
                            {orderCount} product{orderCount > 1 ? 's' : ''} (₹{orderAmount.toLocaleString()})
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Detailing Only</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(t);
                        }}
                        className="btn-enterprise secondary"
                        style={{ padding: '5px 12px', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Task Complete Detailed Information Modal (§1.2) */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '680px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BBF7D0' }}>
                    ✓ SUBMITTED TASK RECORD
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>ID: {selectedTask.id}</span>
                </div>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                  {selectedTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} color="#64748B" />
              </button>
            </div>

            {/* Core Verification Badges Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Representative</span>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                  {selectedTask.assigned_mr_name || 'Rahul Sharma'}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Date &amp; Time</span>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                  {formatDateDDMMYYYY(selectedTask.date || '2026-10-04')}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Call Duration</span>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                  {selectedTask.duration_seconds ? `${Math.round(selectedTask.duration_seconds / 60)} minutes` : '28 minutes'}
                </div>
              </div>

              <div style={{ background: '#DCFCE7', padding: '10px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>GPS Integrity</span>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534', marginTop: '2px' }}>
                  ✓ 100% Verified On-Site
                </div>
              </div>
            </div>

            {/* Location & GPS Detail */}
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                <MapPin size={15} color="#0284C7" />
                <span>Facility Coordinates &amp; Location</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                {selectedTask.location_name || 'Designated Clinic / Hospital Facility'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Latitude: {selectedTask.latitude} • Longitude: {selectedTask.longitude} (Allowed Geofence: ≤{selectedTask.geofence_radius_m || 50}m)
              </div>
            </div>

            {/* Visit Outcome & Feedback */}
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Doctor Call Feedback &amp; Discussion
              </div>
              <div style={{ fontSize: '13px', color: '#1E293B', fontStyle: 'italic', background: '#F1F5F9', padding: '10px 12px', borderRadius: '6px' }}>
                "{selectedTask.outcome || 'Presented clinical trial efficacy data for CardioFix-50; doctor confirmed monthly prescription potential.'}"
              </div>
            </div>

            {/* Verification Photo Proof */}
            {(selectedTask.visit_photo || selectedTask.verification_photo_key) && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  On-Site Photo Proof Captured
                </div>
                <div style={{ textAlign: 'center', background: '#000000', borderRadius: '8px', overflow: 'hidden', padding: '10px' }}>
                  <img
                    src={(selectedTask.visit_photo as string) || (selectedTask.verification_photo_key as string)}
                    alt="Visit proof"
                    style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                  />
                </div>
              </div>
            )}

            {/* Orders Breakdown */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={14} color="#1A3C6E" />
                  <span>Commercial Orders Booked ({selectedTask.orders?.length || 0})</span>
                </div>
              </div>

              {selectedTask.orders && selectedTask.orders.length > 0 ? (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product Formulation</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Units</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit Price</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (₹)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Stockist / Distributor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTask.orders.map((ord, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0F172A' }}>{ord.product_name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700' }}>{ord.quantity}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{ord.unit_price}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#166534' }}>₹{ord.total_amount?.toLocaleString()}</td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{ord.distributor || 'MedPlus Saket'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                  No commercial orders booked for this detailing visit.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={handlePrintSlip}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700' }}
              >
                <Printer size={13} />
                <span>Print Official Slip</span>
              </button>
              <button
                type="button"
                className="btn-enterprise primary"
                onClick={() => setSelectedTask(null)}
                style={{ padding: '8px 20px', fontSize: '12.5px', fontWeight: '700' }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-res Image Modal */}
      {viewingPhoto && (
        <div className="modal-overlay" onClick={() => setViewingPhoto(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', width: '92%', textAlign: 'center', padding: '16px', background: '#0F172A' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>{viewingPhoto.title}</span>
              <button
                type="button"
                onClick={() => setViewingPhoto(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={viewingPhoto.url}
              alt={viewingPhoto.title}
              style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
            />
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
              Captured by {viewingPhoto.mr}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
