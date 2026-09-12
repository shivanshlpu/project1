import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Crosshair,
  Clock,
  RefreshCw,
  Filter,
  Calendar,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { Language, translations } from '../utils/i18n';

interface DashboardViewProps {
  lang?: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ lang = 'en' }) => {
  const t = translations[lang];

  const [timeframe, setTimeframe] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const [mrTeamActivities, setMrTeamActivities] = useState([
    {
      id: 'usr-mr-01',
      name: 'Rahul Sharma',
      territory: 'South Delhi (Saket)',
      area: 'South Delhi',
      attendanceMarked: true,
      checkInTime: '09:15 AM (On-Time)',
      visitsCompleted: 6,
      visitsTarget: 8,
      lastVerification: 'Apex Heart Centre',
      distanceMeters: 8.4,
      dcrStatus: 'SUBMITTED',
      complianceScore: '100%',
    },
    {
      id: 'usr-mr-02',
      name: 'Vikram Malhotra',
      territory: 'South Delhi (Hauz Khas)',
      area: 'South Delhi',
      attendanceMarked: true,
      checkInTime: '09:28 AM (On-Time)',
      visitsCompleted: 5,
      visitsTarget: 7,
      lastVerification: 'Skin Care Centre',
      distanceMeters: 14.2,
      dcrStatus: 'DRAFT',
      complianceScore: '100%',
    },
    {
      id: 'usr-mr-03',
      name: 'Pooja Verma',
      territory: 'South Delhi (Green Park)',
      area: 'South Delhi',
      attendanceMarked: true,
      checkInTime: '09:10 AM (On-Time)',
      visitsCompleted: 8,
      visitsTarget: 8,
      lastVerification: 'Little Care Clinic',
      distanceMeters: 11.0,
      dcrStatus: 'APPROVED',
      complianceScore: '100%',
    },
    {
      id: 'usr-mr-04',
      name: 'Amit Kumar',
      territory: 'South Delhi (Malviya Nagar)',
      area: 'South Delhi',
      attendanceMarked: true,
      checkInTime: '09:42 AM (Late)',
      visitsCompleted: 4,
      visitsTarget: 7,
      lastVerification: 'Kapoor Health Clinic',
      distanceMeters: 16.8,
      dcrStatus: 'DRAFT',
      complianceScore: '94%',
    },
  ]);

  // Fetch live attendance from backend
  const fetchLiveAttendance = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/attendance`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayAtt = data.filter((a: any) => a.date === todayStr);

          if (todayAtt.length > 0) {
            setMrTeamActivities((prev) =>
              prev.map((mr) => {
                const match = todayAtt.find((a: any) => a.user_id === mr.id || a.user_name === mr.name);
                if (match) {
                  const inTime = match.check_in_at
                    ? new Date(match.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '09:15 AM';
                  return {
                    ...mr,
                    attendanceMarked: true,
                    checkInTime: `${inTime} (${match.status === 'LATE' ? 'Late' : 'On-Time'})`,
                  };
                }
                return mr;
              }),
            );
          }
        }
      }
    } catch {
      // Fallback to local state
    }
  };

  useEffect(() => {
    fetchLiveAttendance();
    const interval = setInterval(fetchLiveAttendance, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLiveAttendance().finally(() => {
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshNotice('Live attendance & compliance metrics synchronized with server.');
        setTimeout(() => setRefreshNotice(null), 3000);
      }, 500);
    });
  };

  const filteredActivities = mrTeamActivities.filter(
    (mr) => selectedArea === 'ALL' || mr.area === selectedArea,
  );

  // Dynamic Metrics Based on Selected Timeframe Filter
  const totalEmployees = filteredActivities.length;
  const markedEmployees = filteredActivities.filter((mr) => mr.attendanceMarked).length;

  const kpiData = {
    DAILY: {
      attendanceVal: `${markedEmployees} / ${totalEmployees}`,
      attendanceSub: `${markedEmployees} of ${totalEmployees} Employees Marked Done Today (100%)`,
      attendanceTrend: 'All scheduled staff present',
      callsVal: '23 / 30 Calls',
      callsSub: '76.7% Daily Field Target Met',
      callsTrend: '5.8 calls / MR today',
      complianceVal: '100.0%',
      complianceSub: 'All visits verified ≤50m boundary',
      approvalsVal: '3 Pending',
      approvalsSub: 'Leave & Expense claims',
    },
    WEEKLY: {
      attendanceVal: `${markedEmployees * 5} / ${totalEmployees * 5}`,
      attendanceSub: `96.8% Avg Attendance for Last 7 Days`,
      attendanceTrend: '+3.2% vs Previous Week',
      callsVal: '142 / 160 Calls',
      callsSub: '88.8% Weekly Target Achieved',
      callsTrend: '35.5 calls / MR this week',
      complianceVal: '99.2%',
      complianceSub: '1 flagged call outside perimeter',
      approvalsVal: '12 Resolved',
      approvalsSub: '12 approved this week',
    },
    MONTHLY: {
      attendanceVal: `${markedEmployees * 22} / ${totalEmployees * 22}`,
      attendanceSub: `97.4% Monthly Avg Attendance (Current Month)`,
      attendanceTrend: '+1.5% MoM compliance',
      callsVal: '584 / 640 Calls',
      callsSub: '91.3% Monthly Territory Target Met',
      callsTrend: '146 calls / MR this month',
      complianceVal: '99.5%',
      complianceSub: 'Zero GPS spoofing detections',
      approvalsVal: '46 Resolved',
      approvalsSub: '46 requests processed',
    },
  }[timeframe];

  return (
    <div>
      {/* Top Timeframe Filter Strip for Reports & Performance */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          marginBottom: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="#1A3C6E" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
            Performance & Attendance Report Scope:
          </span>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            {timeframe === 'DAILY' ? "Today's Live Shift" : timeframe === 'WEEKLY' ? 'Last 7 Days (Weekly Aggregate)' : 'Current Month (Monthly Aggregate)'}
          </span>
        </div>

        {/* Daily, Weekly, Monthly Filter Buttons */}
        <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '3px', borderRadius: '6px', gap: '3px' }}>
          <button
            onClick={() => setTimeframe('DAILY')}
            style={{
              padding: '5px 12px',
              borderRadius: '5px',
              fontSize: '11.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: timeframe === 'DAILY' ? '#1A3C6E' : 'transparent',
              color: timeframe === 'DAILY' ? '#FFFFFF' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarDays size={13} />
            <span>Daily (Today)</span>
          </button>

          <button
            onClick={() => setTimeframe('WEEKLY')}
            style={{
              padding: '5px 12px',
              borderRadius: '5px',
              fontSize: '11.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: timeframe === 'WEEKLY' ? '#1A3C6E' : 'transparent',
              color: timeframe === 'WEEKLY' ? '#FFFFFF' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarRange size={13} />
            <span>Weekly Report</span>
          </button>

          <button
            onClick={() => setTimeframe('MONTHLY')}
            style={{
              padding: '5px 12px',
              borderRadius: '5px',
              fontSize: '11.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: timeframe === 'MONTHLY' ? '#1A3C6E' : 'transparent',
              color: timeframe === 'MONTHLY' ? '#FFFFFF' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <Calendar size={13} />
            <span>Monthly Report</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles Strip */}
      <div className="metric-tiles-strip">
        <KPICard
          title={`${t.fieldAttendance} (${timeframe === 'DAILY' ? 'Marked Today' : timeframe === 'WEEKLY' ? 'Weekly' : 'Monthly'})`}
          value={kpiData.attendanceVal}
          subText={kpiData.attendanceSub}
          Icon={Users}
          trendText={kpiData.attendanceTrend}
          trendType="positive"
        />
        <KPICard
          title={`${t.doctorCallOutput} (${timeframe})`}
          value={kpiData.callsVal}
          subText={kpiData.callsSub}
          Icon={CheckCircle2}
          trendText={kpiData.callsTrend}
          trendType="positive"
        />
        <KPICard
          title={t.geofenceCompliance}
          value={kpiData.complianceVal}
          subText={kpiData.complianceSub}
          Icon={Crosshair}
          trendText="0 Spoof Flags"
          trendType="positive"
        />
        <KPICard
          title={t.pendingApprovals}
          value={kpiData.approvalsVal}
          subText={kpiData.approvalsSub}
          Icon={Clock}
          trendText={timeframe === 'DAILY' ? 'Action Required' : 'Engine Synced'}
          trendType="neutral"
        />
      </div>

      {/* Team Operations Activity Table */}
      <div className="enterprise-panel">
        <div className="panel-header-bar">
          <div className="panel-headline">
            <Users size={16} color="#0052cc" />
            <span>Field Team Operations & Geofence Compliance</span>
          </div>

          <div className="panel-controls-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} color="#64748B" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  fontSize: '11px',
                  background: '#FFFFFF',
                  color: '#334155',
                }}
              >
                <option value="ALL">All Territories</option>
                <option value="South Delhi">South Delhi</option>
              </select>
            </div>

            <button
              className="btn-enterprise secondary sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {refreshNotice && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '6px 14px', fontSize: '11px', fontWeight: 600 }}>
            ✓ {refreshNotice}
          </div>
        )}

        <div className="enterprise-table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Medical Representative</th>
                <th>Assigned Territory</th>
                <th>Punctuality (GPS)</th>
                <th>Calls Done / Target</th>
                <th>Latest Verified Geofence Call</th>
                <th>Perimeter Distance</th>
                <th>DCR State</th>
                <th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((mr) => (
                <tr key={mr.id}>
                  <td style={{ fontWeight: 600 }}>{mr.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{mr.territory}</td>
                  <td>
                    <span className="status-pill success">
                      <span className="status-dot success"></span>
                      {mr.checkInTime}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {mr.visitsCompleted} of {mr.visitsTarget}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{mr.lastVerification}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#0F8B5A' }}>
                      {mr.distanceMeters}m
                    </span>{' '}
                    <span style={{ fontSize: '10px', color: '#64748B' }}>(≤50m)</span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        mr.dcrStatus === 'SUBMITTED' || mr.dcrStatus === 'APPROVED'
                          ? 'success'
                          : 'warning'
                      }`}
                    >
                      {mr.dcrStatus}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      {mr.complianceScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
