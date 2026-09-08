import React, { useState } from 'react';
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Stethoscope,
  FileText,
  Receipt,
  UserCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Minus,
  PenTool,
  Check,
  Building,
  Radio,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  KeyRound,
  ArrowLeft,
  Copy,
} from 'lucide-react';

export const SalesmanPortalView: React.FC = () => {
  // Persistent MR Session State (never logs out unless explicitly requested)
  const [salesmanUser, setSalesmanUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    device_id: string;
    device_model: string;
    token?: string;
  } | null>(() => {
    const saved = localStorage.getItem('ahtri_salesman_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return {
      id: 'usr-mr-01',
      name: 'Rahul Sharma',
      email: 'mr@ahtri.com',
      phone: '9876543212',
      device_id: 'dev-hw-s22-9f8a2c',
      device_model: 'Samsung Galaxy S22 (SM-S901B)',
    };
  });

  // Login & Device OTP Challenge Simulation State
  const [simIdentifier, setSimIdentifier] = useState('mr@ahtri.com');
  const [simPassword, setSimPassword] = useState('Password@123');
  const [isSimulatingOtherPhone, setIsSimulatingOtherPhone] = useState(false);
  const [simStep, setSimStep] = useState<'credentials' | 'otp_challenge'>('credentials');
  const [simRequestId, setSimRequestId] = useState('');
  const [simOtpCode, setSimOtpCode] = useState('');
  const [simOtpError, setSimOtpError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [salesmanTab, setSalesmanTab] = useState<'calls' | 'detailing' | 'dcr' | 'expenses' | 'attendance'>('calls');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingDrafts, setPendingDrafts] = useState<number>(1);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Live Geofence Parameters for Salesman
  const [currentDistance, setCurrentDistance] = useState<number>(12.4); // 12.4m on-site
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(9.5); // ±9.5m accuracy
  const [callState, setCallState] = useState<'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ASSIGNED');
  const [assignedCalls, setAssignedCalls] = useState<any[]>([]);
  const [activeCallId, setActiveCallId] = useState<string>('task-01');

  // Fetch Assigned Calls from Backend Server
  const fetchSalesmanCalls = async () => {
    if (!salesmanUser?.id) return;
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = salesmanUser.token || localStorage.getItem('ahtri_auth_token');
      const res = await fetch(`${apiUrl}/tasks?mr_id=${salesmanUser.id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAssignedCalls(data);
        }
      }
    } catch (err) {
      // Keep local state
    }
  };

  React.useEffect(() => {
    fetchSalesmanCalls();
    const interval = setInterval(fetchSalesmanCalls, 4000);
    return () => clearInterval(interval);
  }, [salesmanUser?.id]);

  // Detailing State
  const [sampleUnits, setSampleUnits] = useState<number>(5);
  const [doctorFeedback, setDoctorFeedback] = useState<string>('Reviewed clinical trial data for CardioFix-50. Prescribed for 12 hypertensive patients.');
  const [signatureCaptured, setSignatureCaptured] = useState<boolean>(false);

  // Expense State
  const [expenseCategory, setExpenseCategory] = useState<'CONVEYANCE' | 'TA_DA' | 'FOOD'>('CONVEYANCE');
  const [expenseAmount, setExpenseAmount] = useState<string>('380');

  // Attendance State
  const [checkedIn, setCheckedIn] = useState<boolean>(true);
  const [checkedOut, setCheckedOut] = useState<boolean>(false);

  const isGeofenceVerified = currentDistance <= 20;
  const isGpsAccurate = gpsAccuracy <= 50;

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setPendingDrafts(0);
      setIsSyncing(false);
    }, 1200);
  };

  const handleStartCall = () => {
    if (!isGeofenceVerified || !isGpsAccurate) return;
    setCallState('IN_PROGRESS');
    setSalesmanTab('detailing');
  };

  const handleCompleteCall = () => {
    setCallState('COMPLETED');
    setSalesmanTab('dcr');
  };

  const currentSimDeviceId = isSimulatingOtherPhone ? 'dev-hw-iphone14-pro' : 'dev-hw-s22-9f8a2c';
  const currentSimDeviceModel = isSimulatingOtherPhone ? 'Apple iPhone 14 Pro Max (NEW PHONE)' : 'Samsung Galaxy S22 (SM-S901B)';

  const handleSalesmanLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setSimOtpError('');
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: simIdentifier.trim(),
          password: simPassword,
          device_id: currentSimDeviceId,
          device_model: currentSimDeviceModel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requires_device_otp) {
          setSimRequestId(data.request_id);
          setSimStep('otp_challenge');
        } else if (data.access_token) {
          const user = {
            id: data.user?.id || 'usr-mr-01',
            name: data.user?.name || 'Rahul Sharma',
            email: data.user?.email || simIdentifier,
            phone: data.user?.phone || '9876543212',
            device_id: currentSimDeviceId,
            device_model: currentSimDeviceModel,
            token: data.access_token,
          };
          localStorage.setItem('ahtri_salesman_session', JSON.stringify(user));
          setSalesmanUser(user);
        }
      } else {
        alert(data.message || 'Login failed');
      }
    } catch {
      alert('Could not connect to backend server. Make sure backend is running on http://localhost:3000');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifySimOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (simOtpCode.trim().length !== 6) {
      setSimOtpError('Please enter the exact 6-digit code from the Owner dashboard.');
      return;
    }
    setIsLoggingIn(true);
    setSimOtpError('');
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/auth/device-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: simRequestId,
          otp: simOtpCode.trim(),
          deviceId: currentSimDeviceId,
          deviceModel: currentSimDeviceModel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        const user = {
          id: data.user?.id || 'usr-mr-01',
          name: data.user?.name || 'Rahul Sharma',
          email: data.user?.email || simIdentifier,
          phone: data.user?.phone || '9876543212',
          device_id: currentSimDeviceId,
          device_model: currentSimDeviceModel,
          token: data.access_token,
        };
        localStorage.setItem('ahtri_salesman_session', JSON.stringify(user));
        setSalesmanUser(user);
      } else {
        setSimOtpError(data.message || 'Invalid or expired OTP code.');
      }
    } catch {
      setSimOtpError('Error communicating with backend.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSalesmanLogout = () => {
    if (window.confirm('Are you sure you want to log out from this phone session?')) {
      localStorage.removeItem('ahtri_salesman_session');
      setSalesmanUser(null);
      setSimStep('credentials');
      setSimOtpCode('');
      setSimOtpError('');
    }
  };

  if (!salesmanUser) {
    return (
      <div className="salesman-mobile-view-container">
        <div className="mobile-frame-wrapper" style={{ minHeight: '620px', display: 'flex', flexDirection: 'column' }}>
          {/* Mobile Phone Top Header */}
          <div className="mobile-app-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#0F8B5A', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={13} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700 }}>AHTRI MR Mobile Gateway</div>
                <div style={{ fontSize: '10px', color: '#b3bac5' }}>Bank-Grade Device Lock Active</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {simStep === 'otp_challenge' ? (
              <div>
                <div style={{ background: '#FFF7ED', border: '1.5px solid #FDBA74', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C2410C', fontWeight: '700', fontSize: '13px' }}>
                    <ShieldAlert size={16} />
                    <span>New / Secondary Device Detected</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9A3412', marginTop: '6px', lineHeight: '16px' }}>
                    A 6-digit OTP code has been generated exclusively on the <strong>Owner Dashboard (Shivansh Tiwari)</strong>. Click <strong>Device OTPs</strong> in the top navbar above to view or 1-click approve it!
                  </div>
                </div>

                <form onSubmit={handleVerifySimOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Enter 6-Digit Owner Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={simOtpCode}
                      onChange={(e) => setSimOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0 0 0 0 0 0"
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '22px',
                        fontWeight: '800',
                        letterSpacing: '8px',
                        textAlign: 'center',
                        color: '#B45309',
                        background: '#FFFBEB',
                        border: '2px solid #F59E0B',
                        borderRadius: '8px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {simOtpError && (
                    <div style={{ color: '#DC2626', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                      {simOtpError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    style={{
                      padding: '12px',
                      background: '#EA580C',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {isLoggingIn ? 'Verifying...' : 'Verify Code & Pair Phone'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSalesmanLogin()}
                    style={{
                      padding: '8px',
                      background: '#F1F5F9',
                      color: '#334155',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Owner Clicked &quot;Approve&quot; in Top Bar? Re-check
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSimStep('credentials'); setSimOtpError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    Back to Credentials
                  </button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleSalesmanLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#0F8B5A', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: '800' }}>
                    A
                  </div>
                  <h3 style={{ margin: '8px 0 2px 0', fontSize: '16px', color: '#0F172A' }}>Representative Sign In</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>Authorized hardware identification required</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Login ID / Email
                  </label>
                  <input
                    type="text"
                    value={simIdentifier}
                    onChange={(e) => setSimIdentifier(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={simPassword}
                    onChange={(e) => setSimPassword(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Device Profile */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Device Hardware Profile:
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsSimulatingOtherPhone(false)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: !isSimulatingOtherPhone ? '1.5px solid #0F8B5A' : '1px solid #CBD5E1',
                        background: !isSimulatingOtherPhone ? '#DCFCE7' : '#FFFFFF',
                        color: !isSimulatingOtherPhone ? '#166534' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      Primary Device (S22)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSimulatingOtherPhone(true)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: isSimulatingOtherPhone ? '1.5px solid #EA580C' : '1px solid #CBD5E1',
                        background: isSimulatingOtherPhone ? '#FFF7ED' : '#FFFFFF',
                        color: isSimulatingOtherPhone ? '#C2410C' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      Secondary Device (iPhone)
                    </button>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
                    Hardware Model: <strong>{currentSimDeviceModel}</strong>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  style={{
                    padding: '11px',
                    background: '#1A3C6E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  {isLoggingIn ? 'Verifying...' : 'Sign In & Access Portal'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="salesman-mobile-view-container">
      <div className="mobile-frame-wrapper">
        {/* Mobile Device App Header */}
        <div className="mobile-app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#00875a', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={13} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{salesmanUser.name}</div>
              <div style={{ fontSize: '10px', color: '#b3bac5' }}>MR • {salesmanUser.phone}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setIsOffline(!isOffline)}
              style={{
                background: isOffline ? '#ff8b00' : 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '12px',
                padding: '3px 8px',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isOffline ? <WifiOff size={11} /> : <Wifi size={11} />}
              <span>{isOffline ? 'Offline' : 'Online'}</span>
            </button>

            <button
              onClick={handleSalesmanLogout}
              title="Log Out (Switch Phone / Device)"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '12px',
                padding: '3px 8px',
                color: '#ffc0c0',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <LogOut size={10} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Offline Banner */}
        {isOffline && (
          <div className="mobile-banner-offline">
            <span>Operating in local SQLite offline mode</span>
            <span style={{ fontSize: '10px', opacity: 0.9 }}>{pendingDrafts} Actions Queued</span>
          </div>
        )}

        {/* Sync Status Banner */}
        <div className="mobile-banner-sync">
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {isSyncing ? 'Reconciling with server...' : pendingDrafts === 0 ? 'All local drafts synced' : `${pendingDrafts} local draft pending sync`}
          </span>
          <button
            className="btn-enterprise secondary sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            style={{ fontSize: '10px', padding: '2px 6px' }}
          >
            <RefreshCw size={10} className={isSyncing ? 'spin' : ''} />
            <span>Sync</span>
          </button>
        </div>

        {/* Mobile View Body */}
        <div className="mobile-screen-body">
          {/* TAB 1: TODAY CALLS & GEOFENCE */}
          {salesmanTab === 'calls' && (
            <div>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    Today Call Agenda ({assignedCalls.length > 0 ? assignedCalls.length : 1} Assigned)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Territory: Saket & Green Park • Strict Member Confidentiality Active
                  </div>
                </div>
                <span style={{ fontSize: '10.5px', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {salesmanUser.name}
                </span>
              </div>

              {/* Dynamic Calls List */}
              {(assignedCalls.length > 0
                ? assignedCalls
                : [
                    {
                      id: 'task-01',
                      title: 'Dr. Rajesh Sharma Detailing',
                      date: '2026-09-06',
                      time: '10:30 AM',
                      location_name: 'Apex Heart Centre, Saket',
                      status: callState,
                    },
                  ]
              ).map((call) => (
                <div
                  key={call.id}
                  style={{
                    background: '#ffffff',
                    border: call.status === 'SUSPENDED' ? '1.5px solid #FCA5A5' : '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '14px',
                    marginBottom: '14px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: call.status === 'SUSPENDED' ? '#DC2626' : 'var(--color-text-muted)' }}>
                      {call.date} • {call.time}
                    </span>
                    <span
                      className={`status-pill ${
                        call.status === 'COMPLETED'
                          ? 'success'
                          : call.status === 'IN_PROGRESS'
                          ? 'info'
                          : call.status === 'SUSPENDED'
                          ? 'danger'
                          : 'warning'
                      }`}
                      style={call.status === 'SUSPENDED' ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' } : {}}
                    >
                      <span
                        className={`status-dot ${
                          call.status === 'COMPLETED' ? 'success' : call.status === 'IN_PROGRESS' ? 'info' : 'warning'
                        }`}
                        style={call.status === 'SUSPENDED' ? { background: '#DC2626' } : {}}
                      ></span>
                      {call.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {call.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                    {call.location_name || 'Designated Clinic Location'}
                  </div>

                  {/* SUSPENDED CALL LOCKOUT BANNER */}
                  {call.status === 'SUSPENDED' && (
                    <div
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #F87171',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991B1B', fontWeight: '800', fontSize: '12px' }}>
                        <span>CALL SUSPENDED (&gt;24 HRS PASSED)</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#7F1D1D', marginTop: '4px', lineHeight: '15px' }}>
                        The scheduled visit date ({call.date}) has passed without completion. This call is automatically suspended and locked.
                      </div>
                      <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px', fontWeight: '700' }}>
                        Contact Owner (Shivansh Tiwari) to unsuspend this call so you can proceed.
                      </div>
                    </div>
                  )}

                  {/* THE 20m GEOFENCE WIDGET (when not suspended) */}
                  {call.status !== 'SUSPENDED' && (
                    <>
                      <div className={`distance-widget-card ${isGeofenceVerified && isGpsAccurate ? 'verified' : !isGpsAccurate ? 'rejected' : 'unverified'}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: isGeofenceVerified && isGpsAccurate ? '#006644' : '#a05200' }}>
                            {isGeofenceVerified && isGpsAccurate ? 'PERIMETER VERIFIED (≤20m)' : 'OUTSIDE 20m GEOFENCE'}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: isGeofenceVerified && isGpsAccurate ? '#006644' : '#de350b' }}>
                            {currentDistance}m away
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#5e6c84' }}>
                          <span>Target Radius: ≤20m</span>
                          <span style={{ color: isGpsAccurate ? '#006644' : '#de350b', fontWeight: 600 }}>
                            GPS Fix: ±{gpsAccuracy}m {isGpsAccurate ? '(Good)' : '(Degraded >50m)'}
                          </span>
                        </div>
                      </div>

                      {/* Interactive GPS Test Controls */}
                      <div style={{ background: '#f4f5f7', padding: '8px 10px', borderRadius: '4px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#5e6c84', marginBottom: '6px', textTransform: 'uppercase' }}>
                          Interactive GPS Verification Simulator:
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn-enterprise secondary sm"
                            onClick={() => { setCurrentDistance(12.4); setGpsAccuracy(9.5); }}
                            style={{ flex: 1, fontSize: '10px' }}
                          >
                            Inside (12.4m)
                          </button>
                          <button
                            className="btn-enterprise secondary sm"
                            onClick={() => { setCurrentDistance(84.0); setGpsAccuracy(12.0); }}
                            style={{ flex: 1, fontSize: '10px' }}
                          >
                            Outside (84m)
                          </button>
                          <button
                            className="btn-enterprise secondary sm"
                            onClick={() => { setCurrentDistance(14.0); setGpsAccuracy(65.0); }}
                            style={{ flex: 1, fontSize: '10px' }}
                          >
                            Bad GPS (±65m)
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action CTA */}
                  {call.status === 'SUSPENDED' && (
                    <button
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#991B1B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '12px',
                        opacity: 0.8,
                        cursor: 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Lock size={14} />
                      <span>Locked by Owner (Call Expired)</span>
                    </button>
                  )}

                  {call.status === 'ASSIGNED' && (
                    <button
                      className="btn-enterprise primary"
                      onClick={() => {
                        setActiveCallId(call.id);
                        handleStartCall();
                      }}
                      disabled={!isGeofenceVerified || !isGpsAccurate}
                      style={{ width: '100%', padding: '9px', opacity: isGeofenceVerified && isGpsAccurate ? 1 : 0.6 }}
                    >
                      <MapPin size={13} />
                      <span>{isGeofenceVerified && isGpsAccurate ? 'Verify Geofence & Start Detailing' : 'Move within 20m to Unlock Call'}</span>
                    </button>
                  )}

                  {call.status === 'IN_PROGRESS' && (
                    <button
                      className="btn-enterprise success"
                      onClick={() => setSalesmanTab('detailing')}
                      style={{ width: '100%', padding: '9px' }}
                    >
                      <span>Resume Doctor Detailing Call</span>
                    </button>
                  )}

                  {call.status === 'COMPLETED' && (
                    <div style={{ background: '#e3fcef', padding: '8px', borderRadius: '4px', textAlign: 'center', color: '#006644', fontWeight: 600, fontSize: '11.5px' }}>
                      Call Completed & Recorded in Today DCR
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: DOCTOR DETAILING & SAMPLES */}
          {salesmanTab === 'detailing' && (
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '2px' }}>
                Doctor Detailing & Sample Distribution
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                Dr. Rajesh Sharma • Apex Heart Centre
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Core Formulation:
                </label>
                <div style={{ background: '#e8eef8', color: '#0052cc', fontWeight: 600, padding: '7px 10px', borderRadius: '4px', fontSize: '12px' }}>
                  CardioFix-50 (Telmisartan 40mg + Amlodipine 5mg)
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Physician Sample Dispensing:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    className="btn-enterprise secondary sm"
                    onClick={() => setSampleUnits(Math.max(0, sampleUnits - 1))}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-main)' }}>
                    {sampleUnits} Sample Strips
                  </span>
                  <button
                    className="btn-enterprise secondary sm"
                    onClick={() => setSampleUnits(sampleUnits + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Doctor Clinical Feedback & Discussion Notes:
                </label>
                <textarea
                  rows={3}
                  value={doctorFeedback}
                  onChange={(e) => setDoctorFeedback(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '11.5px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Doctor Signature Verification:
                </label>
                <div
                  onClick={() => setSignatureCaptured(true)}
                  style={{
                    height: '75px',
                    border: '1px dashed #b3bac5',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fafbfc',
                    cursor: 'pointer',
                  }}
                >
                  {signatureCaptured ? (
                    <span style={{ color: '#00875a', fontWeight: 600, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} />
                      Digital Signature Captured & Geotagged
                    </span>
                  ) : (
                    <span style={{ color: '#5e6c84', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PenTool size={13} />
                      Tap to Capture Doctor Digital Signature
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn-enterprise success"
                onClick={handleCompleteCall}
                style={{ width: '100%', padding: '10px' }}
              >
                <span>Save Call & Append to Today DCR</span>
              </button>
            </div>
          )}

          {/* TAB 3: DAILY CALL REPORT (DCR) */}
          {salesmanTab === 'dcr' && (
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '2px' }}>
                Daily Call Report (DCR) Pre-Fill
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                Auto-aggregated from completed geofence calls (§4.2)
              </div>

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '12.5px' }}>Dr. Rajesh Sharma</span>
                  <span className="status-pill success">Verified 8.4m</span>
                </div>
                <div style={{ fontSize: '11px', color: '#5e6c84' }}>Apex Heart Centre, Saket • 10:30 AM</div>
                <div style={{ fontSize: '11px', color: '#00875a', fontWeight: 600, marginTop: '2px' }}>
                  {sampleUnits} strips CardioFix-50 dispensed
                </div>
              </div>

              <button
                className="btn-enterprise primary"
                onClick={() => alert('DCR submitted to Area Manager Anil Kumar for review.')}
                style={{ width: '100%', padding: '10px', marginTop: '10px' }}
              >
                <span>Submit DCR for Manager Approval</span>
              </button>
            </div>
          )}

          {/* TAB 4: EXPENSES */}
          {salesmanTab === 'expenses' && (
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                Field Expense Claim
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                Submit conveyance and daily allowance claims
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Expense Category:
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['CONVEYANCE', 'TA_DA', 'FOOD'] as const).map((cat) => (
                    <button
                      key={cat}
                      className={`btn-enterprise sm ${expenseCategory === cat ? 'primary' : 'secondary'}`}
                      onClick={() => setExpenseCategory(cat)}
                    >
                      {cat.replace('_', '/')}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Amount Claimed (₹):
                </label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontWeight: 700, fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Voucher / Receipt Slip:
                </label>
                <div style={{ padding: '12px', border: '1px dashed #b3bac5', borderRadius: '4px', textAlign: 'center', background: '#fafbfc' }}>
                  <span style={{ fontSize: '11px', color: '#00875a', fontWeight: 600 }}>
                    Receipt Photo Attached: fuel_sep06_saket.jpg
                  </span>
                </div>
              </div>

              <button
                className="btn-enterprise success"
                onClick={() => { setPendingDrafts(pendingDrafts + 1); alert('Expense draft stored in offline queue.'); }}
                style={{ width: '100%', padding: '10px' }}
              >
                <span>Add Claim to Sync Queue</span>
              </button>
            </div>
          )}

          {/* TAB 5: ATTENDANCE */}
          {salesmanTab === 'attendance' && (
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                Daily Field Attendance
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                GPS-authenticated punch-in and checkout
              </div>

              <div style={{ background: '#f4f5f7', padding: '12px', borderRadius: '6px', textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '10.5px', color: '#5e6c84', fontWeight: 600, textTransform: 'uppercase' }}>Duty Status</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: checkedOut ? '#0052cc' : '#00875a', marginTop: '2px' }}>
                  {checkedOut ? 'COMPLETED (LOGGED OUT)' : 'CHECKED IN (PRESENT)'}
                </div>
                <div style={{ fontSize: '11px', color: '#7a869a', marginTop: '4px' }}>Date: Sep 6, 2026 • Territory: South Delhi</div>
              </div>

              {checkedIn && (
                <div style={{ background: '#e3fcef', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '11px', color: '#006644' }}>
                  <div style={{ fontWeight: 700 }}>Punch-In Verified: 09:15 AM</div>
                  <div>Coordinates: 28.5245, 77.2066 (Accuracy: ±10m)</div>
                </div>
              )}

              {checkedIn && !checkedOut && (
                <button
                  className="btn-enterprise secondary"
                  onClick={() => setCheckedOut(true)}
                  style={{ width: '100%', padding: '10px' }}
                >
                  <Clock size={13} />
                  <span>Punch Out for the Day</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="mobile-bottom-bar">
          <button
            className={`mobile-bottom-tab ${salesmanTab === 'calls' ? 'active' : ''}`}
            onClick={() => setSalesmanTab('calls')}
          >
            <MapPin size={15} />
            <span>Calls</span>
          </button>
          <button
            className={`mobile-bottom-tab ${salesmanTab === 'detailing' ? 'active' : ''}`}
            onClick={() => setSalesmanTab('detailing')}
          >
            <Stethoscope size={15} />
            <span>Detailing</span>
          </button>
          <button
            className={`mobile-bottom-tab ${salesmanTab === 'dcr' ? 'active' : ''}`}
            onClick={() => setSalesmanTab('dcr')}
          >
            <FileText size={15} />
            <span>DCR</span>
          </button>
          <button
            className={`mobile-bottom-tab ${salesmanTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setSalesmanTab('expenses')}
          >
            <Receipt size={15} />
            <span>Expenses</span>
          </button>
          <button
            className={`mobile-bottom-tab ${salesmanTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setSalesmanTab('attendance')}
          >
            <UserCheck size={15} />
            <span>Attendance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
