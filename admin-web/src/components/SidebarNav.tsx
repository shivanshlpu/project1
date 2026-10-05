import React from 'react';
import {
  BarChart3,
  MapPin,
  Map,
  Users,
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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { ManagerTab } from './SubNav';

interface SidebarNavProps {
  currentTab: ManagerTab;
  onSelectTab: (tab: ManagerTab) => void;
  pendingApprovalsCount: number;
  newLocationsCount?: number;
  lang: Language;
  onAssignNewCall?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: ManagerTab;
  label: string;
  Icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  newLocationsCount = 0,
  lang,
  onAssignNewCall,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const t = translations[lang];

  const groups: NavGroup[] = [
    {
      title: lang === 'hi' ? 'फ़ील्ड संचालन' : 'FIELD OPERATIONS',
      items: [
        { id: 'overview', label: t.tabOverview, Icon: BarChart3 },
        { id: 'tasks', label: lang === 'hi' ? 'असाइन किए गए टास्क' : 'Assigned Tasks', Icon: MapPin },
        { id: 'submitted_tasks', label: lang === 'hi' ? 'सबमिट किए गए कार्य' : 'Submitted Tasks', Icon: CheckCircle2 },
        {
          id: 'locations',
          label: t.tabLocations,
          Icon: Map,
          badge: newLocationsCount,
          badgeColor: '#0F8B5A',
        },
        { id: 'members', label: t.tabMembers, Icon: Users },
      ],
    },
    {
      title: lang === 'hi' ? 'एमआर एवं इन्वेंटरी' : 'MR & INVENTORY',
      items: [
        {
          id: 'attendance',
          label: t.tabAttendance || 'Attendance & Integrity',
          Icon: Clock,
        },
        {
          id: 'tp',
          label: t.tabMonthlyTp || 'Monthly Tour Plan',
          Icon: Calendar,
        },
        {
          id: 'stockers',
          label: t.tabStockers || 'Stocker Management',
          Icon: Boxes,
        },
        {
          id: 'competitions',
          label: t.tabCompetitions || 'Competitions & Rewards',
          Icon: Trophy,
        },
      ],
    },
    {
      title: lang === 'hi' ? 'प्रशासन एवं एआई' : 'GOVERNANCE & AI',
      items: [
        {
          id: 'approvals',
          label: t.tabApprovals,
          Icon: CheckSquare,
          badge: pendingApprovalsCount,
          badgeColor: '#DC2626',
        },
        { id: 'reports', label: t.tabReports, Icon: FileDown },
        { id: 'ai', label: t.tabAi || 'AI Command Hub', Icon: Sparkles },
        { id: 'settings', label: t.tabSettings, Icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Drawer Dark Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-label="Close menu backdrop"
        />
      )}

      <aside
        className={`enterprise-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Sidebar Header & Toggle */}
        <div className="sidebar-header">
          {(!isCollapsed || isMobileOpen) && (
            <div className="sidebar-brand-title">
              <span className="sidebar-brand-badge">AHTRI</span>
              <span className="sidebar-brand-text">
                {lang === 'hi' ? 'कमांड सेंटर' : 'Command Center'}
              </span>
            </div>
          )}
          {isMobileOpen ? (
            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={onCloseMobile}
              title={lang === 'hi' ? 'साइडबार बंद करें' : 'Close Sidebar'}
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Prominent Quick Action Button */}
        <div className="sidebar-action-wrap">
          <button
            type="button"
            className={`sidebar-cta-btn ${isCollapsed && !isMobileOpen ? 'icon-only' : ''}`}
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              if (onAssignNewCall) {
                onAssignNewCall();
              } else {
                onSelectTab('tasks');
              }
            }}
            title={lang === 'hi' ? 'नया कॉल असाइन करें' : 'Assign New Call'}
          >
            <Plus size={16} />
            {(!isCollapsed || isMobileOpen) && (
              <span>{t.assignNewCall || (lang === 'hi' ? 'नया कॉल असाइन' : 'Assign Call')}</span>
            )}
          </button>
        </div>

        {/* Scrollable Navigation List (Scroll Up & Down) */}
        <div className="sidebar-nav-scroll">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="sidebar-group">
              {(!isCollapsed || isMobileOpen) && (
                <div className="sidebar-group-title">{group.title}</div>
              )}
              <nav className="sidebar-group-items">
                {group.items.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      title={item.label}
                    >
                      <span className="sidebar-item-icon">
                        <item.Icon size={17} />
                      </span>
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="sidebar-item-label">{item.label}</span>
                      )}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className="sidebar-item-badge"
                          style={{ background: item.badgeColor || '#DC2626' }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Export Button & Status */}
        <div className="sidebar-footer">
          {!isCollapsed || isMobileOpen ? (
            <>
              <button
                type="button"
                className="sidebar-export-btn"
                onClick={() => {
                  onSelectTab('reports');
                  if (onCloseMobile) onCloseMobile();
                }}
                title={lang === 'hi' ? 'रिपोर्ट्स डाउनलोड करें' : 'Export Reports'}
              >
                <Download size={14} />
                <span>{t.exportSummary || (lang === 'hi' ? 'डेटा निर्यात' : 'Export Summary')}</span>
              </button>
              <div className="sidebar-status-indicator">
                <span className="status-dot-green"></span>
                <span className="status-text">
                  {lang === 'hi' ? 'सिस्टम सक्रिय' : 'System Active'}
                </span>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="sidebar-export-btn icon-only"
              onClick={() => {
                onSelectTab('reports');
                if (onCloseMobile) onCloseMobile();
              }}
              title={t.exportSummary || 'Export Summary'}
            >
              <Download size={15} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
