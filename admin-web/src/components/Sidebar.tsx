import React from 'react';

export type NavTab = 'dashboard' | 'tasks' | 'doctors' | 'approvals' | 'reports';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Manager Overview', icon: '' },
    { id: 'tasks' as NavTab, label: 'Tasks & Geofence Logs', icon: '' },
    { id: 'doctors' as NavTab, label: 'Doctor Master (Coverage)', icon: '' },
    {
      id: 'approvals' as NavTab,
      label: 'Approvals Hub',
      icon: '',
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'reports' as NavTab, label: 'Reports & Exports', icon: '' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">A</div>
        <div>
          <h2 className="brand-title">AHTRI FFA</h2>
          <div className="brand-subtitle">Field Force Automation</div>
        </div>
      </div>

      <ul className="nav-list">
        {navItems.map((item) => (
          <li
            key={item.id}
            className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <span>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  background: 'var(--color-alert)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {item.badge}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="user-profile-mini">
          <span className="user-name">Anil Kumar</span>
          <span className="user-role-badge">Area Manager (South Delhi)</span>
        </div>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontSize: '1.1rem',
          }}
          title="Sign Out"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};
