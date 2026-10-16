import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, Trash2, ShieldCheck } from 'lucide-react';

export interface CenteredNoticeOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  isDestructive?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

let notifyGlobalHandler: ((opts: CenteredNoticeOptions) => void) | null = null;

export const showCenteredNotice = (opts: CenteredNoticeOptions | string) => {
  const options: CenteredNoticeOptions =
    typeof opts === 'string' ? { message: opts, type: 'info' } : opts;

  if (notifyGlobalHandler) {
    notifyGlobalHandler(options);
  } else {
    console.log('[Notice]', options.message);
  }
};

export const showConfirmModal = (opts: {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  isDestructive?: boolean;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> => {
  return new Promise((resolve) => {
    showCenteredNotice({
      title: opts.title || (opts.isDestructive ? 'Confirm Deletion' : 'Confirm Action'),
      message: opts.message,
      type: opts.isDestructive ? 'error' : (opts.type || 'confirm'),
      isDestructive: opts.isDestructive ?? (opts.type === 'error'),
      confirmText: opts.confirmText || (opts.isDestructive ? 'Delete Permanently' : 'Confirm'),
      cancelText: opts.cancelText || 'Cancel',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
};

export const CenteredModalNotice: React.FC = () => {
  const [activeNotice, setActiveNotice] = useState<CenteredNoticeOptions | null>(null);

  useEffect(() => {
    notifyGlobalHandler = (opts) => {
      setActiveNotice(opts);
    };

    
    const originalAlert = window.alert;
    window.alert = (msg: any) => {
      showCenteredNotice({
        title: 'Notification',
        message: String(msg ?? ''),
        type: 'info',
      });
    };

    
    const originalConfirm = window.confirm;
    window.confirm = (msg?: string) => {
      showCenteredNotice({
        title: 'Action Confirmation',
        message: String(msg ?? ''),
        type: 'confirm',
      });
      return false;
    };

    return () => {
      notifyGlobalHandler = null;
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, []);

  
  useEffect(() => {
    if (!activeNotice) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNotice]);

  if (!activeNotice) return null;

  const type = activeNotice.type || 'info';
  const isDestructive = activeNotice.isDestructive || type === 'error';
  const showCancelButton =
    type === 'confirm' ||
    isDestructive ||
    Boolean(activeNotice.onCancel) ||
    Boolean(activeNotice.cancelText);

  const getTheme = () => {
    if (isDestructive) {
      return {
        icon: <Trash2 size={26} color="#DC2626" />,
        badgeBg: '#FEE2E2',
        ringColor: 'rgba(254, 226, 226, 0.7)',
        titleColor: '#0F172A',
        badgeText: 'DELETION REQUIRED',
        badgeTextColor: '#B91C1C',
        btnBg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        btnShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
        defaultTitle: 'Confirm Permanent Deletion',
        defaultConfirmText: 'Delete Permanently',
      };
    }

    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={26} color="#059669" />,
          badgeBg: '#D1FAE5',
          ringColor: 'rgba(209, 250, 229, 0.7)',
          titleColor: '#0F172A',
          badgeText: 'SUCCESS',
          badgeTextColor: '#047857',
          btnBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          btnShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
          defaultTitle: 'Action Successful',
          defaultConfirmText: 'Done',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={26} color="#D97706" />,
          badgeBg: '#FEF3C7',
          ringColor: 'rgba(254, 243, 199, 0.7)',
          titleColor: '#0F172A',
          badgeText: 'WARNING',
          badgeTextColor: '#B45309',
          btnBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          btnShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
          defaultTitle: 'Important Warning',
          defaultConfirmText: 'Proceed',
        };
      case 'confirm':
        return {
          icon: <ShieldCheck size={26} color="#2563EB" />,
          badgeBg: '#DBEAFE',
          ringColor: 'rgba(219, 234, 254, 0.7)',
          titleColor: '#0F172A',
          badgeText: 'CONFIRMATION',
          badgeTextColor: '#1D4ED8',
          btnBg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          btnShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
          defaultTitle: 'Confirm Action',
          defaultConfirmText: 'Confirm',
        };
      default:
        return {
          icon: <Info size={26} color="#2563EB" />,
          badgeBg: '#DBEAFE',
          ringColor: 'rgba(219, 234, 254, 0.7)',
          titleColor: '#0F172A',
          badgeText: 'SYSTEM NOTICE',
          badgeTextColor: '#1D4ED8',
          btnBg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          btnShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
          defaultTitle: 'Notice',
          defaultConfirmText: 'OK',
        };
    }
  };

  const theme = getTheme();
  const title = activeNotice.title || theme.defaultTitle;

  const handleClose = () => {
    const cancelCb = activeNotice.onCancel;
    setActiveNotice(null);
    if (cancelCb) cancelCb();
  };

  const handleConfirm = () => {
    const confirmCb = activeNotice.onConfirm;
    setActiveNotice(null);
    if (confirmCb) confirmCb();
  };

  
  const messageParts = (activeNotice.message || '').split('\n\n');
  const primaryMessage = messageParts[0] || '';
  const secondaryDetails = messageParts.slice(1).join('\n\n').trim();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.18s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !showCancelButton) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          padding: '28px 24px 22px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#64748B',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Close dialog (Esc)"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Halo Icon Badge */}
        <div
          style={{
            marginBottom: '14px',
            background: theme.badgeBg,
            boxShadow: `0 0 0 8px ${theme.ringColor}`,
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
          }}
        >
          {theme.icon}
        </div>

        {/* Small Category Badge Chip */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.6px',
            color: theme.badgeTextColor,
            marginBottom: '6px',
            textTransform: 'uppercase',
          }}
        >
          {theme.badgeText}
        </div>

        {/* Dialog Title */}
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: theme.titleColor,
            marginBottom: '10px',
            marginTop: 0,
            letterSpacing: '-0.2px',
          }}
        >
          {title}
        </h3>

        {/* Primary Message */}
        <p
          style={{
            fontSize: '14px',
            color: '#334155',
            lineHeight: 1.55,
            marginBottom: secondaryDetails ? '12px' : '22px',
            marginTop: 0,
            fontWeight: 500,
          }}
        >
          {primaryMessage}
        </p>

        {/* Secondary Details / Consequence Callout Box */}
        {secondaryDetails && (
          <div
            style={{
              background: isDestructive ? '#FEF2F2' : '#F8FAFC',
              border: `1px solid ${isDestructive ? '#FCA5A5' : '#E2E8F0'}`,
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '22px',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontSize: '12.5px',
                color: isDestructive ? '#991B1B' : '#475569',
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
              }}
            >
              {secondaryDetails}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {showCancelButton && (
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '11px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {activeNotice.cancelText || 'Cancel'}
            </button>
          )}

          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: '10px',
              border: 'none',
              background: theme.btnBg,
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: theme.btnShadow,
              transition: 'opacity 0.15s ease, transform 0.1s ease',
            }}
          >
            {activeNotice.confirmText || theme.defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
