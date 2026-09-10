import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  Search,
  Languages,
  Menu,
  X,
  LogOut,
  Settings,
  ShieldCheck,
  CheckCircle2,
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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when mobile search is activated
  useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
    }
  }, [isMobileSearchOpen]);

  // Handle global Escape key to close mobile search or menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileSearchOpen) {
          handleCloseSearch();
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        desktopSearchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSearchOpen, mobileMenuOpen]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (onSearch) onSearch(val);
  };

  const handleCloseSearch = () => {
    setIsMobileSearchOpen(false);
    setSearchQuery('');
    if (onSearch) onSearch('');
  };

  const handleClearDesktopSearch = () => {
    setSearchQuery('');
    if (onSearch) onSearch('');
    desktopSearchInputRef.current?.focus();
  };

  return (
    <header className="enterprise-navbar">
      {/* 1. ACTIVE MOBILE SEARCH BAR OVERLAY (Full width when user taps search on mobile) */}
      {isMobileSearchOpen ? (
        <div className="mobile-search-bar-active">
          <div className="mobile-search-input-wrapper">
            <Search size={16} color="#64748B" style={{ flexShrink: 0 }} />
            <input
              ref={mobileSearchInputRef}
              type="text"
              className="mobile-search-input"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-inner-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  if (onSearch) onSearch('');
                  mobileSearchInputRef.current?.focus();
                }}
                aria-label="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="mobile-search-close-btn"
            onClick={handleCloseSearch}
            title="Close search"
          >
            <X size={15} />
            <span>{lang === 'hi' ? 'रद्द करें' : 'Cancel'}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Brand Logo & Name */}
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
              <span className="brand-org-name" style={{ fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.03em', color: '#0F172A', whiteSpace: 'nowrap' }}>
                {t.brandName}
              </span>
              <span className="brand-org-sub" style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500, letterSpacing: '0.01em' }}>
                {t.brandSub}
              </span>
            </div>
          </div>

          {/* Nav Actions Cluster */}
          <div className="nav-actions-cluster">
            {/* --- DESKTOP-ONLY ACTIONS (Hidden on <= 768px) --- */}
            
            {/* Desktop Global Quick Search */}
            <div className="global-search-box desktop-only-action">
              <Search size={14} color="#7a869a" style={{ flexShrink: 0 }} />
              <input
                ref={desktopSearchInputRef}
                type="text"
                className="global-search-input"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={handleClearDesktopSearch}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B', display: 'flex' }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              ) : (
                <span className="search-shortcut-kbd">⌘K</span>
              )}
            </div>

            {/* Desktop Bilingual Hindi / English Toggle Button */}
            <button
              onClick={onToggleLang}
              title={lang === 'en' ? 'Switch to Hindi (हिंदी)' : 'Switch to English'}
              className="lang-toggle-btn desktop-only-action"
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
                whiteSpace: 'nowrap',
              }}
            >
              <Languages size={15} color="#0F8B5A" />
              <span>{t.langToggleLabel}</span>
            </button>

            {/* Desktop Owner Device Approvals & OTP Manager Button */}
            {onOpenDeviceApprovals && (
              <button
                onClick={onOpenDeviceApprovals}
                title="Manage Employee Device Authorizations & 6-Digit OTPs"
                className="device-approvals-nav-btn desktop-only-action"
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
                  whiteSpace: 'nowrap',
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

            {/* Desktop Operational Status */}
            <div className="status-indicator-wrapper desktop-only-action" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-pill success">
                <span className="status-dot success"></span>
                <span>System Operational</span>
              </span>
            </div>

            {/* Desktop User Profile */}
            <div
              className="user-profile-cluster desktop-only-action"
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
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap' }}>
                  {managerName}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {managerName.includes('Shivansh')
                    ? 'Super Admin (Owner)'
                    : lang === 'hi' ? 'क्षेत्र व्यवसाय प्रबंधक' : 'Area Business Manager'}
                </span>
              </div>
            </div>

            {/* Desktop Sign Out Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out from Admin Session"
                className="logout-nav-btn desktop-only-action"
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
                  whiteSpace: 'nowrap',
                }}
              >
                <LogOut size={14} color="#DE350B" />
                <span>Sign Out</span>
              </button>
            )}

            {/* --- MOBILE-ONLY ACTIONS (Visible ONLY on <= 768px) --- */}

            {/* Mobile Search Toggle Icon Button */}
            <button
              type="button"
              className="mobile-icon-btn mobile-only-action"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="Open search"
              title="Search doctors, tasks, MRs"
            >
              <Search size={18} color="#1A3C6E" />
            </button>

            {/* Mobile Device OTP Quick Badge (Shown on mobile when requests exist) */}
            {onOpenDeviceApprovals && pendingDeviceApprovalsCount > 0 && (
              <button
                type="button"
                className="mobile-otp-quick-btn mobile-only-action"
                onClick={onOpenDeviceApprovals}
                aria-label="Pending device OTPs"
                title={`${pendingDeviceApprovalsCount} pending device OTP authorization requests`}
              >
                <Smartphone size={14} color="#EA580C" />
                <span>{pendingDeviceApprovalsCount}</span>
              </button>
            )}

            {/* Mobile Language Toggle Compact Pill */}
            <button
              type="button"
              onClick={onToggleLang}
              className="mobile-lang-pill mobile-only-action"
              title={lang === 'en' ? 'Switch to Hindi (हिंदी)' : 'Switch to English'}
            >
              <Languages size={13} color="#0F8B5A" />
              <span>{lang === 'en' ? 'HI' : 'EN'}</span>
            </button>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              className={`mobile-hamburger-btn mobile-only-action ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} color="#0F172A" /> : <Menu size={20} color="#0F172A" />}
            </button>
          </div>
        </>
      )}

      {/* 2. MOBILE SLIDE-DOWN DRAWER & BACKDROP */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="mobile-dropdown-menu open">
            {/* Drawer Header with Title & Explicit Close (X) Button */}
            <div className="mobile-menu-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="user-avatar" style={{ background: '#0B2545', color: '#FFFFFF', fontWeight: '700', width: '34px', height: '34px', fontSize: '12px' }}>
                  {managerName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    {managerName}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                    {managerName.includes('Shivansh')
                      ? 'Super Admin (Owner)'
                      : lang === 'hi' ? 'क्षेत्र व्यवसाय प्रबंधक' : 'Area Business Manager'}
                  </span>
                </div>
              </div>
              
              {/* Close Button (X) */}
              <button
                type="button"
                className="mobile-menu-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                title="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Search inside Drawer */}
            <div className="mobile-drawer-search-row">
              <Search size={14} color="#64748B" style={{ flexShrink: 0 }} />
              <input
                type="text"
                className="mobile-drawer-search-input"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B', display: 'flex' }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Navigation & Action Items List */}
            <div className="mobile-menu-items-list">
              {/* Settings Action */}
              {onOpenSettings && (
                <button
                  type="button"
                  className="mobile-menu-item-row"
                  onClick={() => {
                    onOpenSettings();
                    setMobileMenuOpen(false);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="mobile-menu-icon-square" style={{ background: '#F0F9FF', color: '#0284C7' }}>
                      <Settings size={16} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {lang === 'hi' ? 'सेटिंग्स और ऐप अपडेट' : 'Settings & App Updates'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {lang === 'hi' ? 'पासवर्ड, शहर, नई ऐप रिलीज' : 'System config, team passwords & APK'}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: '#94A3B8', fontSize: '16px' }}>›</span>
                </button>
              )}

              {/* Language Switch Action */}
              <button
                type="button"
                className="mobile-menu-item-row"
                onClick={() => {
                  onToggleLang();
                  setMobileMenuOpen(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="mobile-menu-icon-square" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                    <Languages size={16} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {lang === 'en' ? 'Switch to Hindi (हिंदी)' : 'Switch to English'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {lang === 'en' ? 'Active: English' : 'सक्रिय: हिंदी'}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#0F8B5A',
                    background: '#DCFCE7',
                    padding: '3px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {lang === 'en' ? 'HI' : 'EN'}
                </span>
              </button>

              {/* Device OTP Authorizations Action */}
              {onOpenDeviceApprovals && (
                <button
                  type="button"
                  className="mobile-menu-item-row"
                  onClick={() => {
                    onOpenDeviceApprovals();
                    setMobileMenuOpen(false);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="mobile-menu-icon-square"
                      style={{
                        background: pendingDeviceApprovalsCount > 0 ? '#FFF7ED' : '#F1F5F9',
                        color: pendingDeviceApprovalsCount > 0 ? '#EA580C' : '#64748B',
                      }}
                    >
                      <Smartphone size={16} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {lang === 'hi' ? 'डिवाइस ओटीपी और अनुमोदन' : 'Device OTP Authorizations'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {pendingDeviceApprovalsCount > 0
                          ? `${pendingDeviceApprovalsCount} pending authorization requests`
                          : 'Manage MR phone login authorizations'}
                      </div>
                    </div>
                  </div>
                  {pendingDeviceApprovalsCount > 0 ? (
                    <span
                      style={{
                        background: '#EA580C',
                        color: '#FFFFFF',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {pendingDeviceApprovalsCount}
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: '16px' }}>›</span>
                  )}
                </button>
              )}

              {/* Operational Status Pill */}
              <div className="mobile-menu-status-bar">
                <span className="status-dot success" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                  All Cloud Systems Operational
                </span>
              </div>

              {/* Sign Out Action */}
              {onLogout && (
                <button
                  type="button"
                  className="mobile-menu-logout-btn"
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut size={16} color="#DC2626" />
                  <span>{lang === 'hi' ? 'लॉग आउट करें' : 'Sign Out'}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};

