import React, { useState } from 'react';
import {
  Building,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Database,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Language } from '../utils/i18n';

interface LoginViewProps {
  lang: Language;
  onLoginSuccess: (user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    token: string;
  }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ lang, onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('shivanshti10@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickFill = (mode: 'email' | 'phone') => {
    setAuthMode(mode);
    setErrorMsg(null);
    if (mode === 'email') {
      setIdentifier('shivanshti10@gmail.com');
    } else {
      setIdentifier('9009149694');
    }
    setPassword('12345678');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMsg(authMode === 'email' ? 'Please enter your email ID.' : 'Please enter your mobile number.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      // Post to backend via Vite proxy /api or directly
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      let response: Response | null = null;
      try {
        response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password: password,
          }),
        });
      } catch (localErr) {
        // Fallback to live production Render backend if localhost is offline
        try {
          response = await fetch('https://ahtri-backend.onrender.com/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identifier: cleanIdentifier,
              password: password,
            }),
          });
        } catch {
          // If network is completely down, allow verified default admin credentials
          if (
            (cleanIdentifier === 'shivanshti10@gmail.com' || cleanIdentifier === '9009149694') &&
            password === '12345678'
          ) {
            const fallbackAdmin = {
              id: 'admin-01',
              name: 'Shivansh Tiwari',
              email: 'shivanshti10@gmail.com',
              phone: '9009149694',
              role: 'SUPER_ADMIN',
              token: 'mock-admin-token-' + Date.now(),
            };
            if (rememberMe) {
              localStorage.setItem('ahtri_auth_token', fallbackAdmin.token);
              localStorage.setItem('ahtri_user', JSON.stringify(fallbackAdmin));
              localStorage.setItem('ahtri_manager_name', fallbackAdmin.name);
            }
            onLoginSuccess(fallbackAdmin);
            return;
          }
          throw new Error('Unable to connect to backend server. Please check your internet connection.');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'Login failed. Please check credentials.';
        throw new Error(message);
      }

      // Success
      const userData = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role,
        token: data.access_token,
      };

      if (rememberMe) {
        localStorage.setItem('ahtri_auth_token', data.access_token);
        localStorage.setItem('ahtri_user', JSON.stringify(userData));
        localStorage.setItem('ahtri_manager_name', userData.name);
      }

      onLoginSuccess(userData);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to connect to backend server. Make sure port 3000 is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      {/* Ambient background decoration */}
      <div className="login-bg-shape login-bg-shape-1" />
      <div className="login-bg-shape login-bg-shape-2" />

      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-badge">
            <Building size={26} color="#ffffff" />
          </div>
          <div className="login-brand-title">
            <h2>AHTRI PHARMA</h2>
            <span>Field Force Automation Command Center</span>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="login-status-pill">
          <ShieldCheck size={13} color="#00875a" />
          <span>Secure Enterprise Access</span>
          <span className="live-ping-dot" />
        </div>

        {/* Quick-fill Demo Shortcut */}
        <div className="login-quickfill-box">
          <div className="quickfill-label">
            <Sparkles size={13} color="#0052cc" />
            <span>Quick Fill Admin Credentials:</span>
          </div>
          <div className="quickfill-btn-group">
            <button
              type="button"
              className={`quickfill-chip ${authMode === 'email' && identifier === 'shivanshti10@gmail.com' ? 'active' : ''}`}
              onClick={() => handleQuickFill('email')}
            >
              <Mail size={12} />
              <span>Email: shivanshti10@gmail.com</span>
            </button>
            <button
              type="button"
              className={`quickfill-chip ${authMode === 'phone' && identifier === '9009149694' ? 'active' : ''}`}
              onClick={() => handleQuickFill('phone')}
            >
              <Phone size={12} />
              <span>Mobile: 9009149694</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="login-error-banner">
            <AlertCircle size={16} color="#de350b" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${authMode === 'email' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('email');
              if (identifier === '9009149694') setIdentifier('shivanshti10@gmail.com');
              setErrorMsg(null);
            }}
          >
            <Mail size={14} />
            <span>Email Sign In</span>
          </button>
          <button
            type="button"
            className={`login-tab ${authMode === 'phone' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('phone');
              if (identifier === 'shivanshti10@gmail.com') setIdentifier('9009149694');
              setErrorMsg(null);
            }}
          >
            <Phone size={14} />
            <span>Mobile Sign In</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group-field">
            <label className="field-label">
              {authMode === 'email' ? 'Admin Email Address' : 'Registered Mobile Number'}
            </label>
            <div className="field-input-wrapper">
              {authMode === 'email' ? (
                <Mail size={16} className="field-prefix-icon" />
              ) : (
                <Phone size={16} className="field-prefix-icon" />
              )}
              <input
                type={authMode === 'email' ? 'email' : 'tel'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={authMode === 'email' ? 'e.g. shivanshti10@gmail.com' : 'e.g. 9009149694'}
                className="login-input"
                autoComplete={authMode === 'email' ? 'username' : 'tel'}
                required
              />
            </div>
          </div>

          <div className="form-group-field">
            <label className="field-label">Password</label>
            <div className="field-input-wrapper">
              <Lock size={16} className="field-prefix-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (e.g. 12345678)"
                className="login-input"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="field-toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="login-options-row">
            <label className="remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember session on this device</span>
            </label>
            <span className="default-pill">Role: SUPER_ADMIN</span>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Admin Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Assurance Footer */}
        <div className="login-footer">
          <div className="security-item">
            <ShieldCheck size={14} color="#00875a" />
            <span>Encrypted Authentication</span>
          </div>
          <span className="dot-sep">•</span>
          <div className="security-item">
            <CheckCircle2 size={14} color="#0052cc" />
            <span>Authorized Personnel Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
