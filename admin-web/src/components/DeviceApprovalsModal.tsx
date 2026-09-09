import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Clock,
  X,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

export interface DeviceAuthItem {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_email: string;
  device_id: string;
  device_model: string;
  otp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface DeviceApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCountUpdate?: (count: number) => void;
}

export const DeviceApprovalsModal: React.FC<DeviceApprovalsModalProps> = ({
  isOpen,
  onClose,
  onCountUpdate,
}) => {
  const [pendingList, setPendingList] = useState<DeviceAuthItem[]>([]);
  const [historyList, setHistoryList] = useState<DeviceAuthItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchAuthorizations = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/auth/device-authorizations`);
      if (res.ok) {
        const data = await res.json();
        const pending = data.pending || [];
        const history = data.history || [];
        setPendingList(pending);
        setHistoryList(history);
        if (onCountUpdate) {
          onCountUpdate(pending.length);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchAuthorizations();
    const interval = setInterval(fetchAuthorizations, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyOtp = (item: DeviceAuthItem) => {
    navigator.clipboard.writeText(item.otp);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (item: DeviceAuthItem) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/auth/device-authorizations/${item.id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setActionMessage(`Approved ${item.user_name}'s phone (${item.device_model}).`);
        fetchAuthorizations();
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (item: DeviceAuthItem) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/auth/device-authorizations/${item.id}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        setActionMessage(`Device login request rejected.`);
        fetchAuthorizations();
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1200,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#FFFFFF',
          background: '#FFFFFF',
          color: '#0F172A',
          maxWidth: '680px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          zIndex: 1201,
          opacity: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
            color: '#FFFFFF',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  Device Authorizations & 6-Digit OTPs
                </h3>
                <span
                  style={{
                    background: '#059669',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  LIVE SECURITY GATEWAY
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                Owner Approval Control: Authorize new employee phones to prevent unauthorized access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FFFFFF',
              transition: 'background 0.2s ease',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Inner Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Live Auto-Refresh Notice & Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'pending' ? '#0B2545' : '#F1F5F9',
                color: activeTab === 'pending' ? '#FFFFFF' : '#475569',
              }}
            >
              Pending Approval ({pendingList.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'history' ? '#0B2545' : '#F1F5F9',
                color: activeTab === 'history' ? '#FFFFFF' : '#475569',
              }}
            >
              Authorization Log
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#00875A', fontWeight: 600 }}>
            <span className="live-ping-dot" style={{ width: '6px', height: '6px' }} />
            <span>Listening Live for Phone Attempts</span>
          </div>
        </div>

        {/* Status / Action Alert */}
        {actionMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#E3FCEF',
              color: '#006644',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '14px',
            }}
          >
            {actionMessage}
          </div>
        )}

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {activeTab === 'pending' ? (
            pendingList.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1.5px dashed #CBD5E1',
                }}
              >
                <ShieldCheck size={36} color="#00875A" style={{ marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                  All Authorized Phones Are Active
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                  No pending device requests. When an employee attempts to log in on a new phone, their 6-digit OTP will immediately appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pendingList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #2563EB',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                            {item.user_name}
                          </span>
                          <span
                            style={{
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            New Phone Activation
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          Phone: <strong>{item.user_phone}</strong> • Email: {item.user_email}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                        <Clock size={12} />
                        <span>Expires in 15m</span>
                      </div>
                    </div>

                    {/* Device Specs Banner */}
                    <div
                      style={{
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        border: '1px solid #E2E8F0',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>ATTEMPTED DEVICE:</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0B2545', marginTop: '2px' }}>
                          {item.device_model}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Hardware ID: {item.device_id}</div>
                      </div>
                    </div>

                    {/* Prominent 6-Digit OTP Box */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #0B2545 0%, #133A6B 100%)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#FFFFFF',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#93C5FD' }}>
                          6-DIGIT APPROVAL CODE FOR EMPLOYEE
                        </div>
                        <div
                          style={{
                            fontSize: '26px',
                            fontWeight: 900,
                            letterSpacing: '6px',
                            fontFamily: 'monospace',
                            color: '#FFFFFF',
                            marginTop: '2px',
                          }}
                        >
                          {item.otp}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyOtp(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: copiedId === item.id ? '#00875A' : 'rgba(255, 255, 255, 0.18)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedId === item.id ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleReject(item)}
                        disabled={isLoading}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          background: '#FFF0F0',
                          border: '1px solid #FFBDAD',
                          color: '#DE350B',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Reject Attempt
                      </button>
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isLoading}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          background: '#00875A',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0, 135, 90, 0.3)',
                        }}
                      >
                        Approve & Bind Phone
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historyList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                      {item.user_name} • <span style={{ color: '#64748B', fontWeight: 500 }}>{item.device_model}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                      OTP: {item.otp} • Requested {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: item.status === 'APPROVED' ? '#E3FCEF' : item.status === 'REJECTED' ? '#FFEBE6' : '#F1F5F9',
                      color: item.status === 'APPROVED' ? '#006644' : item.status === 'REJECTED' ? '#BF2600' : '#475569',
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748B', flex: '1 1 180px', lineHeight: '1.4' }}>
            Hardware locking active. Only Owner (Shivansh Tiwari) can approve devices.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 20px',
              borderRadius: '8px',
              background: '#0B2545',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Done
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
