import React, { useState, useEffect, Suspense, lazy } from 'react';
import { TopNav, AppMode } from './components/TopNav';
import { SubNav, ManagerTab } from './components/SubNav';
import { SidebarNav } from './components/SidebarNav';
import { DeviceApprovalsModal } from './components/DeviceApprovalsModal';
import { Sparkles } from 'lucide-react';
import { NewLocationToast, NewLocationItem } from './components/NewLocationToast';
import { DutyCompletionToast, DutyCompletionItem } from './components/DutyCompletionToast';
import { FloatingAiFab } from './components/FloatingAiFab';
import { Language } from './utils/i18n';
import { CenteredModalNotice } from './components/CenteredModalNotice';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getApiBaseUrl, fetchDeviceAuthorizationsMerged } from './utils/apiHelper';
import './styles/app.css';

const DashboardView = lazy(() => import('./views/DashboardView').then((m) => ({ default: m.DashboardView })));
const TasksView = lazy(() => import('./views/TasksView').then((m) => ({ default: m.TasksView })));
const SubmittedTasksView = lazy(() => import('./views/SubmittedTasksView').then((m) => ({ default: m.SubmittedTasksView })));
const OrdersManagementView = lazy(() => import('./views/OrdersManagementView').then((m) => ({ default: m.OrdersManagementView })));
const SavedLocationsView = lazy(() => import('./views/SavedLocationsView').then((m) => ({ default: m.SavedLocationsView })));
const BatchLocationsView = lazy(() => import('./views/BatchLocationsView').then((m) => ({ default: m.BatchLocationsView })));
const MembersManagementView = lazy(() => import('./views/MembersManagementView').then((m) => ({ default: m.MembersManagementView })));
const ApprovalsView = lazy(() => import('./views/ApprovalsView').then((m) => ({ default: m.ApprovalsView })));
const ReportsView = lazy(() => import('./views/ReportsView').then((m) => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./views/SettingsView').then((m) => ({ default: m.SettingsView })));
const MonthlyTpView = lazy(() => import('./views/MonthlyTpView').then((m) => ({ default: m.MonthlyTpView })));
const StockerManagementView = lazy(() => import('./views/StockerManagementView').then((m) => ({ default: m.StockerManagementView })));
const AdminAttendanceView = lazy(() => import('./views/AdminAttendanceView').then((m) => ({ default: m.AdminAttendanceView })));
const CompetitionsView = lazy(() => import('./views/CompetitionsView').then((m) => ({ default: m.CompetitionsView })));
const LoginView = lazy(() => import('./views/LoginView').then((m) => ({ default: m.LoginView })));
const AiChatView = lazy(() => import('./views/AiChatView').then((m) => ({ default: m.AiChatView })));

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  token: string;
}

const VALID_MANAGER_TABS: readonly ManagerTab[] = [
  'overview',
  'tasks',
  'submitted_tasks',
  'orders',
  'locations',
  'batch_locations',
  'members',
  'attendance',
  'tp',
  'stockers',
  'competitions',
  'approvals',
  'reports',
  'ai',
  'settings',
] as const;

const isValidManagerTab = (tab: any): tab is ManagerTab => {
  return typeof tab === 'string' && (VALID_MANAGER_TABS as readonly string[]).includes(tab);
};

const parseTabFromLocation = (): ManagerTab | null => {
  try {
    
    if (typeof window !== 'undefined' && window.location.hash) {
      const cleanHash = window.location.hash.replace(/^#\/?/, '').trim();
      const tabName = cleanHash.split('?')[0].split('/')[0];
      if (isValidManagerTab(tabName)) {
        return tabName;
      }
    }
  } catch {}

  try {
    
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && isValidManagerTab(tabParam)) {
        return tabParam;
      }
    }
  } catch {}

  try {
    
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ahtri_active_manager_tab') || localStorage.getItem('ahtri_active_tab');
      if (saved && isValidManagerTab(saved)) {
        return saved;
      }
    }
  } catch {}

  return null;
};

export const App: React.FC = () => {
  
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('ahtri_user');
    const token = localStorage.getItem('ahtri_auth_token');
    if (saved && token) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  
  const [managerTab, setManagerTabState] = useState<ManagerTab>(() => {
    return parseTabFromLocation() || 'overview';
  });

  const setManagerTab = (nextTab: ManagerTab) => {
    setManagerTabState(nextTab);
    try {
      localStorage.setItem('ahtri_active_manager_tab', nextTab);
      localStorage.setItem('ahtri_active_tab', nextTab);
      const targetHash = `#/${nextTab}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } catch {}
  };

  
  useEffect(() => {
    try {
      const currentHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!currentHash && managerTab) {
        window.history.replaceState(null, '', `#/${managerTab}`);
      }
    } catch {}

    const handleSyncLocationTab = () => {
      const parsedTab = parseTabFromLocation();
      if (parsedTab && parsedTab !== managerTab) {
        setManagerTabState(parsedTab);
        try {
          localStorage.setItem('ahtri_active_manager_tab', parsedTab);
          localStorage.setItem('ahtri_active_tab', parsedTab);
        } catch {}
      }
    };

    window.addEventListener('hashchange', handleSyncLocationTab);
    window.addEventListener('popstate', handleSyncLocationTab);
    return () => {
      window.removeEventListener('hashchange', handleSyncLocationTab);
      window.removeEventListener('popstate', handleSyncLocationTab);
    };
  }, [managerTab]);

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('ahtri_lang') as Language) || 'en';
  });

  const [managerName, setManagerName] = useState<string>(() => {
    return localStorage.getItem('ahtri_manager_name') || 'System Administrator';
  });

  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ahtri_sidebar_collapsed') === 'true';
  });

  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ahtri_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleToggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const [assignedLocationTarget, setAssignedLocationTarget] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius_m: number;
  } | null>(null);

  
  const [isDeviceApprovalsOpen, setIsDeviceApprovalsOpen] = useState(false);
  const [deviceApprovalsCount, setDeviceApprovalsCount] = useState(0);

  
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pendingTpCount, setPendingTpCount] = useState<number>(0);

  
  const [recentNewLocations, setRecentNewLocations] = useState<NewLocationItem[]>([]);
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);

  
  const [recentCompletions, setRecentCompletions] = useState<DutyCompletionItem[]>([]);
  const [acknowledgedCompletionIds, setAcknowledgedCompletionIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('ahtri_acked_completions');
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  
  useEffect(() => {
    if (!authUser) return;
    const fetchPendingApprovals = async () => {
      if (document.hidden) return;
      try {
        const apiUrl = getApiBaseUrl();
        const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let leavesCount = 0;
        const apprRes = await fetch(`${apiUrl}/approvals/pending`, { headers }).catch(() => null);
        if (apprRes && apprRes.ok) {
          const data = await apprRes.json();
          if (Array.isArray(data)) {
            let storedDecisions: Record<string, any> = {};
            try {
              const raw = localStorage.getItem('ahtri_decided_approvals');
              if (raw) storedDecisions = JSON.parse(raw);
            } catch {}
            leavesCount = data.filter(
              (a: any) =>
                a.entity_type !== 'EXPENSE' &&
                !storedDecisions[a.id] &&
                !storedDecisions[a.entity_id]
            ).length;
          }
        }

        let suspendedCount = 0;
        const tasksRes = await fetch(`${apiUrl}/tasks`, { headers }).catch(() => null);
        if (tasksRes && tasksRes.ok) {
          const tData = await tasksRes.json();
          if (Array.isArray(tData)) {
            suspendedCount = tData.filter((t: any) => t.status === 'SUSPENDED').length;
          }
        }

        setPendingApprovalsCount(leavesCount + suspendedCount);
      } catch {
        setPendingApprovalsCount(0);
      }
    };

    fetchPendingApprovals();
    const interval = setInterval(fetchPendingApprovals, 4000);
    window.addEventListener('ahtri_approvals_updated', fetchPendingApprovals);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ahtri_approvals_updated', fetchPendingApprovals);
    };
  }, []);

  // Poll pending Tour Plans & Route Change Requests awaiting Monthly TP approval
  useEffect(() => {
    if (!authUser) return;
    const fetchPendingTp = async () => {
      if (document.hidden) return;
      try {
        const apiUrl = getApiBaseUrl();
        const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        let count = 0;
        const res = await fetch(`${apiUrl}/tour-plans/pending-count`, { headers }).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          count = Number(data.total_pending ?? (data.pending_plans ?? 0) + (data.pending_requests ?? 0));
        } else {
          // Fallback check
          const [plansRes, rcRes] = await Promise.all([
            fetch(`${apiUrl}/tour-plans/admin?status=SUBMITTED`, { headers }).catch(() => null),
            fetch(`${apiUrl}/tour-plans/route-change-requests?status=PENDING`, { headers }).catch(() => null),
          ]);
          let pCount = 0;
          let rCount = 0;
          if (plansRes && plansRes.ok) {
            const pData = await plansRes.json();
            if (Array.isArray(pData)) {
              const pendingItems = pData.filter(
                (d: any) =>
                  (d.reimbursement_status || d.status || '').toUpperCase() === 'SUBMITTED' ||
                  (d.reimbursement_status || d.status || '').toUpperCase() === 'PENDING',
              );
              const uniquePlans = new Set(pendingItems.map((d: any) => d.tp_id || d.plan_id || d.id));
              pCount = uniquePlans.size;
            }
          }
          if (rcRes && rcRes.ok) {
            const rcData = await rcRes.json();
            if (Array.isArray(rcData)) {
              rCount = rcData.filter((r: any) => (r.status || '').toUpperCase() === 'PENDING').length;
            }
          }
          count = pCount + rCount;
        }
        setPendingTpCount(count);
      } catch {
        setPendingTpCount(0);
      }
    };

    fetchPendingTp();
    const interval = setInterval(fetchPendingTp, 4000);
    window.addEventListener('ahtri_tp_updated', fetchPendingTp);
    window.addEventListener('ahtri_approvals_updated', fetchPendingTp);
    window.addEventListener('ahtri_notification_received', fetchPendingTp);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ahtri_tp_updated', fetchPendingTp);
      window.removeEventListener('ahtri_approvals_updated', fetchPendingTp);
      window.removeEventListener('ahtri_notification_received', fetchPendingTp);
    };
  }, [authUser]);

  
  useEffect(() => {
    if (!authUser) return;
    const fetchPendingCount = async () => {
      if (document.hidden) return;
      try {
        const data = await fetchDeviceAuthorizationsMerged();
        setDeviceApprovalsCount((data.pending || []).length);
      } catch {
        // Fallback silently
      }
    };
    fetchPendingCount();
    const timer = setInterval(fetchPendingCount, 3000);
    return () => clearInterval(timer);
  }, []);

  
  useEffect(() => {
    if (!authUser) return;
    const fetchRecentLocations = async () => {
      if (document.hidden) return;
      try {
        const apiUrl = getApiBaseUrl();
        const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
        const res = await fetch(`${apiUrl}/locations/recent`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            
            setRecentNewLocations(data.filter((l) => l.created_by_role === 'MR'));
          }
        }
      } catch {
        // Fallback silently
      }
    };
    fetchRecentLocations();
    const timer = setInterval(fetchRecentLocations, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleAcknowledgeLocation = async (id: string) => {
    setRecentNewLocations((prev) => prev.filter((l) => l.id !== id));
    try {
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/locations/${id}/acknowledge`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Ignored
    }
  };

  const handleAcknowledgeAllLocations = async () => {
    setRecentNewLocations([]);
    try {
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/locations/acknowledge-all`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Ignored
    }
  };

  
  useEffect(() => {
    if (!authUser) return;
    const fetchRecentCompletions = async () => {
      if (document.hidden) return;
      try {
        const apiUrl = getApiBaseUrl();
        const res = await fetch(`${apiUrl}/tasks/recent-completions`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const unacked = data.filter((c: any) => !acknowledgedCompletionIds.has(c.id));
            setRecentCompletions(unacked);
          }
        }
      } catch {
        // Fallback silently
      }
    };
    fetchRecentCompletions();
    const timer = setInterval(fetchRecentCompletions, 3500);
    return () => clearInterval(timer);
  }, [acknowledgedCompletionIds]);

  const handleAcknowledgeCompletion = (id: string) => {
    setRecentCompletions((prev) => prev.filter((c) => c.id !== id));
    setAcknowledgedCompletionIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('ahtri_acked_completions', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleAcknowledgeAllCompletions = () => {
    setRecentCompletions([]);
    setAcknowledgedCompletionIds((prev) => {
      const next = new Set(prev);
      recentCompletions.forEach((c) => next.add(c.id));
      try {
        localStorage.setItem('ahtri_acked_completions', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleViewCompletedTask = (task: DutyCompletionItem) => {
    handleAcknowledgeCompletion(task.id);
    setManagerTab('tasks');
  };

  const handleViewLocationOnMap = (loc: NewLocationItem) => {
    setFocusedLocationId(loc.id);
    setManagerTab('locations');
    handleAcknowledgeLocation(loc.id);
  };

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === 'en' ? 'hi' : 'en';
      localStorage.setItem('ahtri_lang', next);
      return next;
    });
  };

  const handleUpdateManagerName = (newName: string) => {
    setManagerName(newName);
    localStorage.setItem('ahtri_manager_name', newName);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setManagerName(user.name);
    if (user.token) {
      localStorage.setItem('ahtri_auth_token', user.token);
      localStorage.setItem('token', user.token);
    }
    localStorage.setItem('ahtri_user', JSON.stringify(user));
    localStorage.setItem('ahtri_manager_name', user.name);
  };

  const handleLogout = () => {
    localStorage.removeItem('ahtri_auth_token');
    localStorage.removeItem('ahtri_user');
    localStorage.removeItem('ahtri_active_manager_tab');
    localStorage.removeItem('ahtri_active_tab');
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {}
    setManagerTabState('overview');
    setAuthUser(null);
  };

  const handleAssignTaskToLocation = (loc: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius_m: number;
  }) => {
    setAssignedLocationTarget(loc);
    setManagerTab('tasks');
  };

  const handleAssignNewCall = () => {
    
    setAssignedLocationTarget(null);
    setManagerTab('tasks');
  };

  
  if (!authUser) {
    return (
      <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading login...</div>}>
        <LoginView lang={lang} onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  return (
    <div className="app-shell">
      {/* Universal Centered Modal Alerts & Notices (Replaces all browser native alert popups) */}
      <CenteredModalNotice />

      {/* Enterprise Top Navigation with Sidebar Toggle */}
      <TopNav
        pendingApprovalsCount={pendingApprovalsCount}
        pendingDeviceApprovalsCount={deviceApprovalsCount}
        onOpenDeviceApprovals={() => setIsDeviceApprovalsOpen(true)}
        lang={lang}
        onToggleLang={toggleLanguage}
        managerName={managerName}
        onOpenSettings={() => setManagerTab('settings')}
        onLogout={handleLogout}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleMobileSidebar={handleToggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Prominent Emergency Alert Banner for Employee Device Login / OTP Requests */}
      {deviceApprovalsCount > 0 && (
        <div
          onClick={() => setIsDeviceApprovalsOpen(true)}
          style={{
            background: 'linear-gradient(90deg, #EA580C 0%, #C2410C 100%)',
            color: '#FFFFFF',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
            zIndex: 999,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🔐</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.2px' }}>
                SECURITY ACTION REQUIRED: {deviceApprovalsCount} Employee Login OTP Request{deviceApprovalsCount > 1 ? 's' : ''} Pending!
              </div>
              <div style={{ fontSize: '12px', opacity: 0.95 }}>
                An employee has logged out and is requesting re-login authorization. Click to view the 6-Digit OTP code or 1-Click Approve.
              </div>
            </div>
          </div>
          <button
            style={{
              background: '#FFFFFF',
              color: '#C2410C',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 16px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Review OTP Now</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Main Body Layout with Scrollable Sidebar and Canvas */}
      <div className="app-body-layout">
        {/* Enterprise Vertical Sidebar (Scrollable & Categorized) */}
        <SidebarNav
          currentTab={managerTab}
          onSelectTab={(tab) => {
            if (tab !== 'tasks') setAssignedLocationTarget(null);
            setManagerTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          pendingApprovalsCount={pendingApprovalsCount}
          pendingTpCount={pendingTpCount}
          newLocationsCount={recentNewLocations.length}
          lang={lang}
          onAssignNewCall={handleAssignNewCall}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Workspace Canvas */}
        <main className="workspace-canvas">
          <ErrorBoundary
            fallbackTitle="Unable to Load View"
            onReset={() => setManagerTab('overview')}
          >
            <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading workspace...</div>}>
              {managerTab === 'overview' && <DashboardView lang={lang} />}
              {managerTab === 'tasks' && (
                <TasksView
                  prefilledLocation={assignedLocationTarget}
                  onClearPrefilledLocation={() => setAssignedLocationTarget(null)}
                />
              )}
              {managerTab === 'submitted_tasks' && <SubmittedTasksView />}
              {managerTab === 'orders' && <OrdersManagementView lang={lang} />}
              {managerTab === 'locations' && (
                <SavedLocationsView
                  onAssignTaskToLocation={handleAssignTaskToLocation}
                  targetLocationId={focusedLocationId}
                  onClearTargetLocation={() => setFocusedLocationId(null)}
                  onLocationAcknowledge={handleAcknowledgeLocation}
                />
              )}
              {managerTab === 'batch_locations' && <BatchLocationsView />}
              {managerTab === 'members' && (
                <MembersManagementView
                  onNavigateToLocation={(locId) => {
                    setFocusedLocationId(locId);
                    setManagerTab('locations');
                  }}
                />
              )}
              {managerTab === 'approvals' && <ApprovalsView />}
              {managerTab === 'attendance' && <AdminAttendanceView />}
              {managerTab === 'tp' && (
                <MonthlyTpView onNavigateToBatches={() => setManagerTab('batch_locations')} />
              )}
              {managerTab === 'stockers' && <StockerManagementView />}
              {managerTab === 'competitions' && <CompetitionsView />}
              {managerTab === 'reports' && <ReportsView lang={lang} />}
              {managerTab === 'ai' && (
                <AiChatView
                  lang={lang}
                  onNavigateTab={(tab) => {
                    if (tab !== 'tasks') setAssignedLocationTarget(null);
                    setManagerTab(tab as any);
                  }}
                />
              )}
              {managerTab === 'settings' && (
                <SettingsView
                  lang={lang}
                  managerName={managerName}
                  onUpdateManagerName={handleUpdateManagerName}
                  onNavigateTab={(tab) => setManagerTab(tab as any)}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Owner Device Approvals & 6-Digit OTP Modal */}
      <DeviceApprovalsModal
        isOpen={isDeviceApprovalsOpen}
        onClose={() => setIsDeviceApprovalsOpen(false)}
        onCountUpdate={setDeviceApprovalsCount}
      />

      {/* Live Real-time Popup for New MR Location Discoveries */}
      <NewLocationToast
        locations={recentNewLocations}
        onViewOnMap={handleViewLocationOnMap}
        onAcknowledge={handleAcknowledgeLocation}
        onAcknowledgeAll={handleAcknowledgeAllLocations}
      />

      {/* Live Real-time Popup for MR Duty Completions */}
      <DutyCompletionToast
        completions={recentCompletions}
        onViewTask={handleViewCompletedTask}
        onDismiss={handleAcknowledgeCompletion}
        onDismissAll={handleAcknowledgeAllCompletions}
      />
      {/* Floating AHTRI AI Operations Copilot Trigger (Circle Option Type, Non-Overlapping) */}
      {managerTab !== 'ai' && (
        <FloatingAiFab onOpenAi={() => setManagerTab('ai')} />
      )}
    </div>
  );
};
