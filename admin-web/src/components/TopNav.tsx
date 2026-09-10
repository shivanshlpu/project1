import React, { useState } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Search,
  CheckCircle2,
  Bell,
  Building,
  Languages,
  Menu,
  X,
  LogOut,
  Database,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';

export type AppMode = 'manager';

interface TopNavProps {
  appMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
  pendingApprovalsCount: number;
  pendingDeviceApprovalsCount?: number;
  onOpenDeviceApprovals?: () => void;
  lang: Language;
  onToggleLang: () => void;
  onSearch?: (query: string) => void;
  managerName?: string;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  pendingApprovalsCount,
  pendingDeviceApprovalsCount = 0,
  onOpenDeviceApprovals,
  lang,
  onToggleLang,
  onSearch,
  managerName = 'Shivansh Tiwari',
  onOpenSettings,
  onLogout,
}) => {
  const t = translations[lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="enterprise-navbar">
      <div className="nav-brand-cluster">
        <div
          className="company-badge"
          style={{
            background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(26, 60, 110, 0.25)',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4H14V10H20V14H14V20H10V14H4V10H10V4Z" fill="#FFFFFF" />
            <circle cx="12" cy="12" r="2.2" fill="#10B981" />
          </svg>
        </div>
        <div className="brand-text-col">
          <span className="brand-org-name" style={{ fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.03em', color: '#0F172A' }}>
            {t.brandName}
          </span>
          <span className="brand-org-sub" style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500, letterSpacing: '0.01em' }}>
            {t.brandSub}
          </span>
        </div>
      </div>

      <div className="nav-actions-cluster">
        {/* Global Quick Search — hidden on mobile via CSS */}
        <div className="global-search-box">
          <Search size={14} color="#7a869a" />
          <input
            type="text"
            className="global-search-input"
            placeholder={t.searchPlaceholder}
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
          <span className="search-shortcut-kbd">⌘K</span>
        </div>

        {/* Bilingual Hindi / English Toggle Button */}
        <button
          onClick={onToggleLang}
          title={lang === 'en' ? 'Switch to Hindi (हिंदी)' : 'Switch to English'}
          className="lang-toggle-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            borderRadius: '20px',
            padding: '5px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            color: '#1A3C6E',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1A3C6E')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
        >
          <Languages size={15} color="#0F8B5A" />
          <span>{t.langToggleLabel}</span>
        </button>

        {/* Owner Device Approvals & OTP Manager Button */}
        {onOpenDeviceApprovals && (
          <button
            onClick={onOpenDeviceApprovals}
            title="Manage Employee Device Authorizations & 6-Digit OTPs"
            className="device-approvals-nav-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: pendingDeviceApprovalsCount > 0 ? '#FFF7ED' : '#FFFFFF',
              border: pendingDeviceApprovalsCount > 0 ? '1.5px solid #F97316' : '1.5px solid #CBD5E1',
              color: pendingDeviceApprovalsCount > 0 ? '#C2410C' : '#334155',
              borderRadius: '20px',
              padding: '5px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              boxShadow: pendingDeviceApprovalsCount > 0 ? '0 0 10px rgba(249, 115, 22, 0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease',
            }}
          >
            <Smartphone size={14} color={pendingDeviceApprovalsCount > 0 ? '#EA580C' : '#64748B'} />
            <span>Device OTPs</span>
            {pendingDeviceApprovalsCount > 0 && (
              <span
                style={{
                  background: '#EA580C',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: '800',
                  lineHeight: '14px',
                }}
              >
                {pendingDeviceApprovalsCount}
              </span>
            )}
          </button>
        )}

        {/* Operational Status */}
        <div className="status-indicator-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="status-pill success">
            <span className="status-dot success"></span>
            <span>System Operational</span>
          </span>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* User Profile */}
        <div
          className="user-profile-cluster"
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
          }}
          style={{ cursor: 'pointer' }}
          title="Click to open Settings"
        >
          <div className="user-avatar" style={{ background: '#0B2545', color: '#FFFFFF', fontWeight: '700' }}>
            {managerName
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)' }}>
              {managerName}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
              {managerName.includes('Shivansh')
                ? 'Super Admin (Owner)'
                : lang === 'hi' ? 'क्षेत्र व्यवसाय प्रबंधक' : 'Area Business Manager'}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Log Out from Admin Session"
            className="logout-nav-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFF0F0',
              border: '1.5px solid #FFBDAD',
              color: '#DE350B',
              borderRadius: '20px',
              padding: '5px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={14} color="#DE350B" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`mobile-dropdown-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="global-search-box" style={{ width: '100%' }}>
          <Search size={14} color="#7a869a" />
          <input
            type="text"
            className="global-search-input"
            placeholder={t.searchPlaceholder}
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { onToggleLang(); setMobileMenuOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              borderRadius: '20px',
              padding: '5px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              color: '#1A3C6E',
            }}
          >
            <Languages size={15} color="#0F8B5A" />
            <span>{t.langToggleLabel}</span>
          </button>
          {onOpenDeviceApprovals && (
            <button
              onClick={() => { onOpenDeviceApprovals(); setMobileMenuOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: pendingDeviceApprovalsCount > 0 ? '#FFF7ED' : '#FFFFFF',
                border: pendingDeviceApprovalsCount > 0 ? '1.5px solid #F97316' : '1.5px solid #CBD5E1',
                color: pendingDeviceApprovalsCount > 0 ? '#C2410C' : '#334155',
                borderRadius: '20px',
                padding: '5px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              <Smartphone size={14} color={pendingDeviceApprovalsCount > 0 ? '#EA580C' : '#64748B'} />
              <span>Device OTPs ({pendingDeviceApprovalsCount})</span>
            </button>
          )}
          <span className="status-pill success">
            <span className="status-dot success"></span>
            <span>System Operational</span>
          </span>
          {onLogout && (
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFF0F0',
                border: '1.5px solid #FFBDAD',
                color: '#DE350B',
                borderRadius: '20px',
                padding: '5px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              <LogOut size={14} color="#DE350B" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
