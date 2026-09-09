import React, { useState, useEffect } from 'react';
import { TopNav, AppMode } from './components/TopNav';
import { SubNav, ManagerTab } from './components/SubNav';
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { SavedLocationsView } from './views/SavedLocationsView';
import { MembersManagementView } from './views/MembersManagementView';
import { DoctorsView } from './views/DoctorsView';
import { ApprovalsView } from './views/ApprovalsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { DeviceApprovalsModal } from './components/DeviceApprovalsModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { Sparkles } from 'lucide-react';
import { NewLocationToast, NewLocationItem } from './components/NewLocationToast';
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
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [deviceApprovalsCount, setDeviceApprovalsCount] = useState(0);

  // New MR-Marked Field Locations Notification State
  const [recentNewLocations, setRecentNewLocations] = useState<NewLocationItem[]>([]);
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);

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
        {managerTab === 'members' && <MembersManagementView />}
        {managerTab === 'doctors' && <DoctorsView lang={lang} />}
        {managerTab === 'approvals' && <ApprovalsView />}
        {managerTab === 'reports' && <ReportsView lang={lang} />}
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
      {/* Floating AHTRI AI Operations Copilot Trigger */}
      <button
        onClick={() => setIsAiModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9000,
          background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
          color: '#FFFFFF',
          border: '1.5px solid rgba(255,255,255,0.3)',
          borderRadius: '30px',
          padding: '10px 18px',
          boxShadow: '0 8px 24px rgba(26,60,110,0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '800',
          letterSpacing: '0.3px',
        }}
        title="Open AI Operations Copilot & Report Generator"
      >
        <Sparkles size={16} color="#38BDF8" />
        <span>Ask AHTRI AI</span>
        <span
          style={{
            background: '#0F8B5A',
            color: '#FFFFFF',
            borderRadius: '10px',
            fontSize: '9.5px',
            padding: '1px 6px',
            fontWeight: '700',
          }}
        >
          RAG
        </span>
      </button>

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};
