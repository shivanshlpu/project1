import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface CenteredNoticeOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

let notifyGlobalHandler: ((opts: CenteredNoticeOptions) => void) | null = null;

/**
 * Trigger a centered modal notice anywhere in the web app
 */
export const showCenteredNotice = (opts: CenteredNoticeOptions | string) => {
  const options: CenteredNoticeOptions =
    typeof opts === 'string' ? { message: opts, type: 'info' } : opts;

  if (notifyGlobalHandler) {
    notifyGlobalHandler(options);
  } else {
    // Fallback if component is not yet mounted
    console.log('[Notice]', options.message);
  }
};

/**
 * Centered modal dialog component rendered at top of the DOM tree
 */
export const CenteredModalNotice: React.FC = () => {
  const [activeNotice, setActiveNotice] = useState<CenteredNoticeOptions | null>(null);

  useEffect(() => {
    notifyGlobalHandler = (opts) => {
      setActiveNotice(opts);
    };

    // Override browser's native window.alert so all popups display as centered modals
    const originalAlert = window.alert;
    window.alert = (msg: any) => {
      showCenteredNotice({
        title: 'Notification',
        message: String(msg ?? ''),
        type: 'info',
      });
    };

    return () => {
      notifyGlobalHandler = null;
      window.alert = originalAlert;
    };
  }, []);

  if (!activeNotice) return null;

  const type = activeNotice.type || 'info';

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={28} color="#0F8B5A" />,
          titleColor: '#0F8B5A',
          btnBg: '#0F8B5A',
          defaultTitle: 'Success',
        };
      case 'error':
        return {
          icon: <AlertCircle size={28} color="#DC2626" />,
          titleColor: '#DC2626',
          btnBg: '#DC2626',
          defaultTitle: 'Notice',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={28} color="#D97706" />,
          titleColor: '#D97706',
          btnBg: '#D97706',
          defaultTitle: 'Warning',
        };
      case 'confirm':
        return {
          icon: <Info size={28} color="#2563EB" />,
          titleColor: '#1E293B',
          btnBg: '#2563EB',
          defaultTitle: 'Confirm Action',
        };
      default:
        return {
          icon: <Info size={28} color="#2563EB" />,
          titleColor: '#1E293B',
          btnBg: '#2563EB',
          defaultTitle: 'Information',
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && type !== 'confirm') {
          handleClose();
        }
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close Icon */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div
          style={{
            marginBottom: '12px',
            background: '#F8FAFC',
            padding: '10px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {theme.icon}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: theme.titleColor,
            marginBottom: '8px',
            marginTop: 0,
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: '13px',
            color: '#475569',
            lineHeight: 1.5,
            marginBottom: '20px',
            whiteSpace: 'pre-line',
            marginTop: 0,
          }}
        >
          {activeNotice.message}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
          {type === 'confirm' && (
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {activeNotice.cancelText || 'Cancel'}
            </button>
          )}

          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '9px 16px',
              borderRadius: '8px',
              border: 'none',
              background: theme.btnBg,
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'opacity 0.15s ease',
            }}
          >
            {activeNotice.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
