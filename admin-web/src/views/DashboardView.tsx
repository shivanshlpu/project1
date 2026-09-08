import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Crosshair,
  Clock,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { Language, translations } from '../utils/i18n';

interface DashboardViewProps {
  lang?: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ lang = 'en' }) => {
  const t = translations[lang];

  const [selectedArea, setSelectedArea] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const [mrTeamActivities, setMrTeamActivities] = useState([
    {
      id: 'mr-1',
      name: 'Rahul Sharma',
      territory: 'South Delhi (Saket)',
      area: 'South Delhi',
      checkInTime: '09:15 AM (On-Time)',
      visitsCompleted: 6,
      visitsTarget: 8,
      lastVerification: 'Apex Heart Centre',
      distanceMeters: 8.4,
      dcrStatus: 'SUBMITTED',
      complianceScore: '100%',
    },
    {
      id: 'mr-2',
      name: 'Vikram Malhotra',
      territory: 'South Delhi (Hauz Khas)',
      area: 'South Delhi',
      checkInTime: '09:28 AM (On-Time)',
      visitsCompleted: 5,
      visitsTarget: 7,
      lastVerification: 'Skin Care Centre',
      distanceMeters: 14.2,
      dcrStatus: 'DRAFT',
      complianceScore: '100%',
    },
    {
      id: 'mr-3',
      name: 'Pooja Verma',
      territory: 'South Delhi (Green Park)',
      area: 'South Delhi',
      checkInTime: '09:10 AM (On-Time)',
      visitsCompleted: 8,
      visitsTarget: 8,
      lastVerification: 'Little Care Clinic',
      distanceMeters: 11.0,
      dcrStatus: 'APPROVED',
      complianceScore: '100%',
    },
    {
      id: 'mr-4',
      name: 'Amit Kumar',
      territory: 'South Delhi (Malviya Nagar)',
      area: 'South Delhi',
      checkInTime: '09:42 AM (Late)',
      visitsCompleted: 4,
      visitsTarget: 7,
      lastVerification: 'Kapoor Health Clinic',
      distanceMeters: 16.8,
      dcrStatus: 'DRAFT',
      complianceScore: '94%',
    },
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshNotice('Live GPS coordinates & compliance synchronized with server.');
      setTimeout(() => setRefreshNotice(null), 3000);
    }, 600);
  };

  const filteredActivities = mrTeamActivities.filter(
    (mr) => selectedArea === 'ALL' || mr.area === selectedArea,
  );

  return (
    <div>
      {/* KPI Tiles Strip */}
      <div className="metric-tiles-strip">
        <KPICard
          title={t.fieldAttendance}
          value="94.1%"
          subText="16 of 17 MRs Checked In"
          Icon={Users}
          trendText="+2.4% vs Last Week"
          trendType="positive"
        />
        <KPICard
          title={t.doctorCallOutput}
          value="48 / 60"
          subText="80.0% Daily Target Met"
          Icon={CheckCircle2}
          trendText="4.8 calls / MR"
          trendType="positive"
        />
        <KPICard
          title={t.geofenceCompliance}
          value="100.0%"
          subText="All visits verified ≤50m"
          Icon={Crosshair}
          trendText="0 Spoof Flags"
          trendType="positive"
        />
        <KPICard
          title={t.pendingApprovals}
          value="3 Requests"
          subText="Leave & Expenses"
          Icon={Clock}
          trendText="Action Required"
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
