import React from 'react';
import {
  BarChart3,
  MapPin,
  Map,
  Users,
  Stethoscope,
  CheckSquare,
  CheckCircle2,
  FileDown,
  Download,
  Plus,
  Settings,
  Sparkles,
  Clock,
  Calendar,
  Boxes,
  Trophy,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';

export type ManagerTab =
  | 'overview'
  | 'tasks'
  | 'submitted_tasks'
  | 'locations'
  | 'members'
  | 'attendance'
  | 'tp'
  | 'stockers'
  | 'competitions'
  | 'approvals'
  | 'reports'
  | 'ai'
  | 'settings';

interface SubNavProps {
  currentTab: ManagerTab;
  onSelectTab: (tab: ManagerTab) => void;
  pendingApprovalsCount: number;
  newLocationsCount?: number;
  lang: Language;
  onAssignNewCall?: () => void;
}

export const SubNav: React.FC<SubNavProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  newLocationsCount = 0,
  lang,
  onAssignNewCall,
}) => {
  const t = translations[lang];

  const tabs = [
    { id: 'overview' as ManagerTab, label: t.tabOverview, Icon: BarChart3 },
    { id: 'tasks' as ManagerTab, label: lang === 'hi' ? 'असाइन किए गए टास्क' : 'Assigned Tasks', Icon: MapPin },
    { id: 'submitted_tasks' as ManagerTab, label: lang === 'hi' ? 'सबमिट किए गए टास्क' : 'Submitted Tasks', Icon: CheckCircle2 },
    {
      id: 'locations' as ManagerTab,
      label: t.tabLocations,
      Icon: Map,
      badge: newLocationsCount,
      badgeColor: '#0F8B5A',
    },
    { id: 'members' as ManagerTab, label: t.tabMembers, Icon: Users },
    { id: 'attendance' as ManagerTab, label: t.tabAttendance || 'Attendance & Integrity', Icon: Clock },
    { id: 'tp' as ManagerTab, label: t.tabMonthlyTp || 'Monthly TP', Icon: Calendar },
    { id: 'stockers' as ManagerTab, label: t.tabStockers || 'Stocker Management', Icon: Boxes },
    { id: 'competitions' as ManagerTab, label: t.tabCompetitions || 'Competitions', Icon: Trophy },
    {
      id: 'approvals' as ManagerTab,
      label: t.tabApprovals,
      Icon: CheckSquare,
      badge: pendingApprovalsCount,
    },
    { id: 'reports' as ManagerTab, label: t.tabReports, Icon: FileDown },
    { id: 'ai' as ManagerTab, label: t.tabAi || 'AI Command Hub', Icon: Sparkles },
    { id: 'settings' as ManagerTab, label: t.tabSettings, Icon: Settings },
  ];

  return (
    <div className="subnav-bar">
      <div className="subnav-left">
        <span className="page-headline">{t.fieldOperations}</span>
        <nav className="nav-tabs-inline">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-tab-link ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
                title={tab.label}
              >
                <tab.Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    style={{
                      background: (tab as any).badgeColor || 'var(--color-alert)',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="subnav-right">
        {/* Export Summary Button -> Switches to Reports tab and sets focus */}
        <button
          className="btn-enterprise secondary"
          onClick={() => onSelectTab('reports')}
          title="Export CSV / PDF reports"
        >
          <Download size={13} />
          <span>{t.exportSummary}</span>
        </button>

        {/* Assign New Call Button -> Triggers new task modal or navigates to tasks */}
        <button
          className="btn-enterprise primary"
          onClick={() => {
            if (onAssignNewCall) {
              onAssignNewCall();
            } else {
              onSelectTab('tasks');
            }
          }}
          title="Assign a new doctor call to MR"
        >
          <Plus size={14} />
          <span>{t.assignNewCall}</span>
        </button>
      </div>
    </div>
  );
};
