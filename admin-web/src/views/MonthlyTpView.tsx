import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface MonthlyTpItem {
  id: string;
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
  created_at: string;
}

interface UserOption {
  id: string;
  name: string;
  hq_name?: string;
}

export const MonthlyTpView: React.FC = () => {
  const [plans, setPlans] = useState<MonthlyTpItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mrs, setMrs] = useState<UserOption[]>([]);
  const [hqs, setHqs] = useState<Array<{ id: string; name: string }>>([]);

  // Filters (§8)
  const [selectedMr, setSelectedMr] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedHq, setSelectedHq] = useState<string>('ALL');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  // Fetch MRs & HQs on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [usersRes, hqsRes] = await Promise.all([
          fetch(`${apiUrl}/users`),
          fetch(`${apiUrl}/inventory/hqs`),
        ]);
        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (Array.isArray(uData)) {
            setMrs(uData.filter((u: any) => u.role === 'MR'));
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

  // Fetch complete Monthly Tour Plan list (§8)
  const fetchMonthlyPlans = async () => {
    setIsLoading(true);
    try {
      let query = `?month=${selectedMonth}`;
      if (selectedMr !== 'ALL') query += `&mr_id=${selectedMr}`;
      if (selectedHq !== 'ALL') query += `&hq_id=${selectedHq}`;

      const res = await fetch(`${apiUrl}/tour-plans/admin-list${query}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPlans(data);
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
  }, [selectedMr, selectedMonth, selectedHq]);

  // Client-side search and work-type filtering
  const filteredPlans = plans.filter((p) => {
    if (selectedWorkType !== 'ALL' && p.work_type !== selectedWorkType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.mr_name.toLowerCase().includes(q) ||
        p.hq_name.toLowerCase().includes(q) ||
        p.planned_area.toLowerCase().includes(q) ||
        p.planned_kol_drs.toLowerCase().includes(q) ||
        p.planned_activity.toLowerCase().includes(q) ||
        p.date.includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={22} color="var(--color-brand)" />
            Monthly Tour Plan (TP) Management
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Review, verify, and monitor complete monthly travel schedules for Medical Representatives across HQs.
          </p>
        </div>

        <button
          className="btn-enterprise secondary"
          onClick={fetchMonthlyPlans}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Plan Data</span>
        </button>
      </div>

      {/* Filter Toolbar Card (§8 Filtering) */}
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
            Schedule Filters &amp; Selection
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Month Selector */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              TARGET MONTH
            </label>
            <select
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                fontSize: 12.5,
                background: '#FFFFFF',
              }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="2026-08">August 2026</option>
              <option value="2026-09">September 2026 (Active)</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-11">November 2026</option>
            </select>
          </div>

          {/* Select MR (§8) */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              SELECT MR / EMPLOYEE
            </label>
            <select
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                fontSize: 12.5,
                background: '#FFFFFF',
              }}
              value={selectedMr}
              onChange={(e) => setSelectedMr(e.target.value)}
            >
              <option value="ALL">All Representatives ({mrs.length})</option>
              {mrs.map((mr) => (
                <option key={mr.id} value={mr.id}>
                  {mr.name} {mr.hq_name ? `(${mr.hq_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Select HQ */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              HEADQUARTERS (HQ)
            </label>
            <select
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                fontSize: 12.5,
                background: '#FFFFFF',
              }}
              value={selectedHq}
              onChange={(e) => setSelectedHq(e.target.value)}
            >
              <option value="ALL">All Headquarters</option>
              {hqs.map((hq) => (
                <option key={hq.id} value={hq.id}>
                  {hq.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type of Work */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              TYPE OF WORK
            </label>
            <select
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                fontSize: 12.5,
                background: '#FFFFFF',
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

          {/* Search box */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
              KEYWORD SEARCH
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Doctor, Area, Activity..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 28px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12.5,
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={13} style={{ position: 'absolute', left: 8, top: 10, color: '#94A3B8' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Complete Monthly TP Table Card (§8) */}
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
            Schedule Itinerary ({filteredPlans.length} Planned Dates for {selectedMonth})
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            Full month schedule visible together without opening individual entries
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading monthly tour plan entries...
          </div>
        ) : filteredPlans.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Calendar size={36} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
              No Tour Plan Records Found
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              No tour plan submitted for the selected filter combination.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Date</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>MR / Representative</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>HQ</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Planned Area</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Type of Work</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Planned KOL DRS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Planned Activity</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FBFDFB',
                    }}
                  >
                    {/* Date */}
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>
                      📅 {formatDateDDMMYYYY(item.date)}
                    </td>

                    {/* MR */}
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            color: '#1E40AF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {item.mr_name.charAt(0)}
                        </div>
                        <span>{item.mr_name}</span>
                      </div>
                    </td>

                    {/* HQ */}
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          background: '#F1F5F9',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 600,
                          fontSize: 11.5,
                        }}
                      >
                        {item.hq_name}
                      </span>
                    </td>

                    {/* Planned Area */}
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: '#0F172A' }}>
                      {item.planned_area}
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
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        {item.work_type}
                      </span>
                    </td>

                    {/* Planned KOL DRS */}
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1E3A8A' }}>
                      {item.planned_kol_drs || '—'}
                    </td>

                    {/* Planned Activity */}
                    <td style={{ padding: '11px 14px', color: '#475569', maxWidth: 260 }}>
                      {item.planned_activity || '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#ECFDF5',
                          color: '#065F46',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle size={11} color="#0F8B5A" />
                        {item.status || 'SUBMITTED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
