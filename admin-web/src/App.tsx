import React, { useState, useEffect } from 'react';
import { TopNav, AppMode } from './components/TopNav';
import { SubNav, ManagerTab } from './components/SubNav';
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { SavedLocationsView } from './views/SavedLocationsView';
import { MembersManagementView } from './views/MembersManagementView';
import { ApprovalsView } from './views/ApprovalsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { AiChatView } from './views/AiChatView';
import { DeviceApprovalsModal } from './components/DeviceApprovalsModal';
import { Sparkles } from 'lucide-react';
import { NewLocationToast, NewLocationItem } from './components/NewLocationToast';
import { DutyCompletionToast, DutyCompletionItem } from './components/DutyCompletionToast';
import { Language } from './utils/i18n';
import './styles/app.css';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  token: string;
}

export const App: React.FC = () => {
  // Authentication Gate State
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

  const [managerTab, setManagerTab] = useState<ManagerTab>('overview');
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('ahtri_lang') as Language) || 'en';
  });

  const [managerName, setManagerName] = useState<string>(() => {
    return localStorage.getItem('ahtri_manager_name') || 'Shivansh Tiwari';
  });

  const [assignedLocationTarget, setAssignedLocationTarget] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius_m: number;
  } | null>(null);

  // Owner Device Authorizations & 6-Digit OTP State
  const [isDeviceApprovalsOpen, setIsDeviceApprovalsOpen] = useState(false);
  const [deviceApprovalsCount, setDeviceApprovalsCount] = useState(0);

  // New MR-Marked Field Locations Notification State
  const [recentNewLocations, setRecentNewLocations] = useState<NewLocationItem[]>([]);
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);

  // Live MR Duty Completion Notification State
  const [recentCompletions, setRecentCompletions] = useState<DutyCompletionItem[]>([]);
  const [acknowledgedCompletionIds, setAcknowledgedCompletionIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('ahtri_acked_completions');
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Live poll pending device authorizations count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/auth/device-authorizations`);
        if (res.ok) {
          const data = await res.json();
          setDeviceApprovalsCount((data.pending || []).length);
        }
      } catch {
        // Fallback silently
      }
    };
    fetchPendingCount();
    const timer = setInterval(fetchPendingCount, 4000);
    return () => clearInterval(timer);
  }, []);

  // Live poll for newly marked field locations from MRs
  useEffect(() => {
    const fetchRecentLocations = async () => {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/locations/recent`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Only field discoveries submitted by MRs trigger notifications for owner
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
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/locations/${id}/acknowledge`, { method: 'POST' });
    } catch {
      // Ignored
    }
  };

  const handleAcknowledgeAllLocations = async () => {
    setRecentNewLocations([]);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/locations/acknowledge-all`, { method: 'POST' });
    } catch {
      // Ignored
    }
  };

  // Live poll for MR completed duties
  useEffect(() => {
    const fetchRecentCompletions = async () => {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
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
    localStorage.setItem('ahtri_manager_name', user.name);
  };

  const handleLogout = () => {
    localStorage.removeItem('ahtri_auth_token');
    localStorage.removeItem('ahtri_user');
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
    // Open clean task modal without hardcoded mock location
    setAssignedLocationTarget(null);
    setManagerTab('tasks');
  };

  // If not authenticated, render Login Page
  if (!authUser) {
    return <LoginView lang={lang} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell">
      {/* Enterprise Top Navigation */}
      <TopNav
        pendingApprovalsCount={3}
        pendingDeviceApprovalsCount={deviceApprovalsCount}
        onOpenDeviceApprovals={() => setIsDeviceApprovalsOpen(true)}
        lang={lang}
        onToggleLang={toggleLanguage}
        managerName={managerName}
        onOpenSettings={() => setManagerTab('settings')}
        onLogout={handleLogout}
      />

      {/* Subnav for Manager Command Center */}
      <SubNav
        currentTab={managerTab}
        onSelectTab={(tab) => {
          if (tab !== 'tasks') setAssignedLocationTarget(null);
          setManagerTab(tab);
        }}
        pendingApprovalsCount={3}
        newLocationsCount={recentNewLocations.length}
        lang={lang}
        onAssignNewCall={handleAssignNewCall}
      />

      {/* Main Workspace Canvas */}
      <main className="workspace-canvas">
        {managerTab === 'overview' && <DashboardView lang={lang} />}
        {managerTab === 'tasks' && (
          <TasksView
            prefilledLocation={assignedLocationTarget}
            onClearPrefilledLocation={() => setAssignedLocationTarget(null)}
          />
        )}
        {managerTab === 'locations' && (
          <SavedLocationsView
            onAssignTaskToLocation={handleAssignTaskToLocation}
            targetLocationId={focusedLocationId}
            onClearTargetLocation={() => setFocusedLocationId(null)}
            onLocationAcknowledge={handleAcknowledgeLocation}
          />
        )}
        {managerTab === 'members' && (
          <MembersManagementView
            onNavigateToLocation={(locId) => {
              setFocusedLocationId(locId);
              setManagerTab('locations');
            }}
          />
        )}
        {managerTab === 'approvals' && <ApprovalsView />}
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
          />
        )}
      </main>

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
      {/* Floating AHTRI AI Operations Copilot Trigger -> Switches directly to AI Command Page */}
      {managerTab !== 'ai' && (
        <button
          onClick={() => setManagerTab('ai')}
          className="floating-ai-fab"
          title="Open AI Command Hub"
        >
          <Sparkles size={16} color="#38BDF8" />
          <span className="fab-text">Ask Aura AI</span>
          <span
            className="fab-badge"
            style={{
              background: '#0F8B5A',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '9.5px',
              padding: '1px 6px',
              fontWeight: '700',
            }}
          >
            AURA
          </span>
        </button>
      )}
    </div>
  );
};
