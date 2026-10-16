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
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Language } from '../utils/i18n';
import { getApiBaseUrl } from '../utils/apiHelper';

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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const apiUrl = getApiBaseUrl();
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
      } catch (primaryErr) {
        
        if (apiUrl !== 'https://ahtri-backend.onrender.com') {
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
            throw new Error('Unable to connect to backend server. Please verify your connection or server status.');
          }
        } else {
          throw new Error('Unable to connect to backend server. The free cloud server may be waking up from inactivity (typically takes 20-40s). Please try again in a few moments.');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'Login failed. Please check credentials.';
        throw new Error(message);
      }

      
      const userData = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role,
        token: data.access_token,
      };

      
      localStorage.setItem('ahtri_auth_token', data.access_token);
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('ahtri_refresh_token', data.refresh_token);
      }
      localStorage.setItem('ahtri_user', JSON.stringify(userData));
      localStorage.setItem('ahtri_manager_name', userData.name);
      if (rememberMe) {
        localStorage.setItem('ahtri_remember_me', 'true');
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
          <div
            className="login-badge"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              borderRadius: '16px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              margin: '0 auto 12px',
              border: '1.5px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <img
              src="/assets/ahtri_logo.png"
              alt="AHTRI BIOTECH"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div className="login-brand-title">
            <h2>AHTRI BIOTECH</h2>
            <span>Field Force Automation</span>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="login-status-pill">
          <ShieldCheck size={13} color="#00875a" />
          <span>Secure Enterprise Access</span>
          <span className="live-ping-dot" />
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
                placeholder={authMode === 'email' ? 'Enter admin email' : 'Enter mobile number'}
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
                placeholder="Enter password"
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
