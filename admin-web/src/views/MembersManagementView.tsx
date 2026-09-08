import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  RotateCcw,
  Copy,
  Check,
  Search,
  Key,
  Phone,
  Mail,
  User,
  MapPin,
  Lock,
  X,
} from 'lucide-react';
import { MRMemberItem } from '../types';

export const MembersManagementView: React.FC = () => {
  const [members, setMembers] = useState<MRMemberItem[]>([
    {
      id: 'usr-mr-01',
      name: 'Rahul Sharma',
      phone: '9876543212',
      email: 'mr@ahtri.com',
      role: 'MR',
      status: 'ACTIVE',
      device_id: 'dev-hw-s22-9f8a2c',
      device_model: 'Samsung Galaxy S22 (SM-S901B)',
      device_bound_at: '2026-09-06 09:12:00',
      created_at: '2026-09-01',
    },
    {
      id: 'usr-mr-02',
      name: 'Vikram Malhotra',
      phone: '9876543213',
      email: 'vikram@ahtri.com',
      role: 'MR',
      status: 'ACTIVE',
      device_id: 'dev-hw-oneplus-71b4e0',
      device_model: 'OnePlus 11 5G (CPH2449)',
      device_bound_at: '2026-09-05 14:30:22',
      created_at: '2026-09-02',
    },
    {
      id: 'usr-mr-03',
      name: 'Pooja Verma',
      phone: '9876543214',
      email: 'pooja@ahtri.com',
      role: 'MR',
      status: 'ACTIVE',
      device_id: undefined, // Unbound - awaiting pairing
      created_at: '2026-09-06',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-fetch registered members from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
        const res = await fetch(`${apiUrl}/users?role=MR`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMembers(data);
          }
        }
      } catch {
        // Keep fallback
      }
    };
    fetchUsers();
  }, []);

  // New MR Registration Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password@123');
  const [newTerritory, setNewTerritory] = useState('South Delhi');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newEmail.trim() || !newPassword.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const newMember: MRMemberItem = {
      id: `usr-mr-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim().toLowerCase(),
      role: 'MR',
      status: 'ACTIVE',
      device_id: undefined, // Unbound until first login on designated device
      created_at: new Date().toISOString().split('T')[0],
    };

    setMembers((prev) => [newMember, ...prev]);
    setIsRegisterOpen(false);

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newMember.name,
          email: newMember.email,
          phone: newMember.phone,
          password: newPassword,
          role: 'MR',
          zone_id: 'zone-north-01',
          region_id: 'reg-delhi-01',
          area_id: 'area-sdelhi-1',
        }),
      });
    } catch (err) {
      console.warn('Register member backend call error:', err);
    }

    // Reset Form
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewPassword('Password@123');
  };

  const handleResetDevice = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to reset device binding for ${name}? The current phone lock will be cleared, allowing the MR to pair their new device on next login.`,
      )
    ) {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        await fetch(`${apiUrl}/auth/device-binding/reset/${id}`, { method: 'POST' });
      } catch (err) {
        console.warn('Device reset API call error:', err);
      }
      setMembers(
        members.map((m) =>
          m.id === id
            ? { ...m, device_id: undefined, device_model: undefined, device_bound_at: undefined }
            : m,
        ),
      );
      alert(`Device binding successfully cleared for ${name}. On their next login, an OTP will appear on your Owner Dashboard to approve the new phone.`);
    }
  };

  const handleCopyCredentials = (member: MRMemberItem) => {
    const text = `AHTRI MR Mobile Login Credentials:\nName: ${member.name}\nLogin ID / Email: ${member.email}\nRegistered Phone: ${member.phone}\nPassword: Password@123\nNote: For bank-grade security, the app will lock to your phone on your first login.`;
    navigator.clipboard.writeText(text);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap' as const,
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '800', color: '#0F172A' }}>
            MR Members & Device Security Hub
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Register field representatives, generate credentials, and enforce bank-grade hardware device binding.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          style={{
            padding: '10px 18px',
            background: '#1A3C6E',
            color: '#FFFFFF',
            borderRadius: '6px',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(26, 60, 110, 0.25)',
          }}
        >
          <UserPlus size={16} /> Register New MR Member
        </button>
      </div>

      {/* Security Architecture Notice Banner */}
      <div
        style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <ShieldCheck size={24} color="#2563EB" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: '18px' }}>
          <strong>Bank-Grade Device Lock Active:</strong> Medical Representatives cannot create their own accounts. Once registered by the Owner, the MR's account permanently locks to the hardware ID and phone number of their designated phone upon first login. Any attempt to access from an unauthorized device is immediately rejected.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Search size={18} color="#64748B" />
        <input
          type="text"
          placeholder="Search by MR name, registered phone number, or login email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            width: '100%',
          }}
        />
      </div>

      {/* MR Members Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Representative Name</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Assigned Phone</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Login ID (Email)</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Bank-Style Device Binding Status</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => {
              const isBound = Boolean(member.device_id);
              return (
                <tr
                  key={member.id}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                >
                  {/* Name */}
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#E2E8F0',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '12px',
                        }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <span>{member.name}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '14px 16px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="#64748B" />
                      <span>{member.phone}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ padding: '14px 16px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} color="#64748B" />
                      <span>{member.email}</span>
                    </div>
                  </td>

                  {/* Device Binding */}
                  <td style={{ padding: '14px 16px' }}>
                    {isBound ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '600' }}>
                          <ShieldCheck size={16} color="#0F8B5A" />
                          <span>Locked to Phone</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {member.device_model || member.device_id}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309' }}>
                        <ShieldAlert size={16} color="#D97706" />
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>Unbound (Awaiting First Phone Login)</span>
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: '700',
                        background: member.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9',
                        color: member.status === 'ACTIVE' ? '#166534' : '#64748B',
                      }}
                    >
                      {member.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {/* Copy Credentials */}
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(member)}
                        title="Copy Login Credentials for WhatsApp/SMS"
                        style={{
                          padding: '6px 10px',
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#334155',
                        }}
                      >
                        {copiedId === member.id ? <Check size={13} color="#0F8B5A" /> : <Copy size={13} />}
                        {copiedId === member.id ? 'Copied' : 'Credentials'}
                      </button>

                      {/* Reset Device Lock */}
                      {isBound && (
                        <button
                          type="button"
                          onClick={() => handleResetDevice(member.id, member.name)}
                          title="Reset Device Binding (Allows MR to link a new phone if replaced)"
                          style={{
                            padding: '6px 10px',
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: '#B91C1C',
                            fontWeight: '600',
                          }}
                        >
                          <RotateCcw size={13} /> Reset Phone Lock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-box" style={{ width: 'min(480px, 94vw)', padding: 'clamp(16px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#1A3C6E" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                  Register Field MR & Generate Login
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              Create an official representative login. Provide these credentials to the MR. Their account will bind to their phone when they first log in.
            </p>

            <form onSubmit={handleRegisterMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Assigned Phone Number */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Assigned Device Phone Number (Bank Verified) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876500001"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  The app verifies this SIM/number on the phone during login.
                </span>
              </div>

              {/* Login Email */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Login ID / Email *
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@ahtri.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Password Generator */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                    Generated Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Generate Password
                  </button>
                </div>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </div>

              {/* Territory */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Assigned Territory Area
                </label>
                <input
                  type="text"
                  value={newTerritory}
                  onChange={(e) => setNewTerritory(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  style={{ flex: 1, padding: '10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#1A3C6E', border: 'none', color: '#FFFFFF', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '700' }}
                >
                  Register Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
