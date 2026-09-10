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
  Calendar,
  Clock,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Plus,
  Minus,
  Save,
  ExternalLink,
  FileText,
  RefreshCw,
  Stethoscope,
  Building,
} from 'lucide-react';
import { MRMemberItem, TaskItem, DoctorItem, TaskOrderItem } from '../types';

interface LeaveQuotaData {
  mr_id: string;
  year: number;
  casual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  earned: { total: number; used: number; remaining: number };
  total_remaining: number;
}

interface MembersManagementViewProps {
  onNavigateToLocation?: (locId: string) => void;
}

export const MembersManagementView: React.FC<MembersManagementViewProps> = ({
  onNavigateToLocation,
}) => {
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

  const [selectedMemberId, setSelectedMemberId] = useState<string>('usr-mr-01');
  const [activeTab, setActiveTab] = useState<'performance' | 'locations' | 'leaves' | 'security'>('performance');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Loaded Tasks & Locations
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 'task-01',
      title: 'Dr. Rajesh Sharma Clinic Detailing',
      date: '2026-09-06',
      time: '10:30:00',
      assigned_mr_name: 'Rahul Sharma',
      assigned_mr_id: 'usr-mr-01',
      location_name: 'Apex Heart Centre (Saket)',
      latitude: 28.5245,
      longitude: 77.2066,
      geofence_radius_m: 50,
      priority: 'HIGH',
      status: 'COMPLETED',
      distance_verified: true,
      started_at: '2026-09-06T10:28:14.000Z',
      completed_at: '2026-09-06T11:06:38.000Z',
      duration_seconds: 2280,
      outcome: 'Presented CardioFix-50 clinical data. Doctor agreed to initiate 5 trial patients and requested samples.',
      orders: [
        { product_name: 'CardioFix-50 (Telmisartan)', quantity: 30, unit_price: 180, total_amount: 5400, distributor: 'Apollo Pharmacy Saket' },
        { product_name: 'CardioFix-AM Suspension', quantity: 15, unit_price: 240, total_amount: 3600, distributor: 'Apollo Pharmacy Saket' },
      ],
    },
    {
      id: 'task-02',
      title: 'Dr. Priya Verma Detailing Call',
      date: '2026-09-06',
      time: '11:45:00',
      assigned_mr_name: 'Rahul Sharma',
      assigned_mr_id: 'usr-mr-01',
      location_name: 'Verma PolyClinic (Malviya Nagar)',
      latitude: 28.5355,
      longitude: 77.2101,
      geofence_radius_m: 50,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      distance_verified: false,
    },
    {
      id: 'task-03',
      title: 'Apex Cardiology Hospital Detailing',
      date: '2026-09-06',
      time: '12:15:00',
      assigned_mr_name: 'Vikram Malhotra',
      assigned_mr_id: 'usr-mr-02',
      location_name: 'Max Super Specialty Hospital',
      latitude: 28.5282,
      longitude: 77.2124,
      geofence_radius_m: 60,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      distance_verified: true,
      started_at: '2026-09-06T12:12:00.000Z',
    },
    {
      id: 'task-04',
      title: 'Dr. Anita Desai Follow-up Call',
      date: '2026-09-06',
      time: '14:30:00',
      assigned_mr_name: 'Pooja Verma',
      assigned_mr_id: 'usr-mr-03',
      location_name: 'Skin Care Centre (Hauz Khas)',
      latitude: 28.5494,
      longitude: 77.2001,
      geofence_radius_m: 40,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      distance_verified: true,
      started_at: '2026-09-06T14:28:00.000Z',
      completed_at: '2026-09-06T14:52:15.000Z',
      duration_seconds: 1455,
      outcome: 'Followed up on dermatologist sample kit. Requested 10 additional sample packs for next week.',
      orders: [
        { product_name: 'DermaSoothe Cream', quantity: 20, unit_price: 210, total_amount: 4200, distributor: 'Apollo Hauz Khas' },
      ],
    },
  ]);

  const [locations, setLocations] = useState<DoctorItem[]>([
    {
      id: 'loc-01',
      name: 'Dr. Rajesh Sharma',
      clinic: 'Apex Heart Centre',
      qualification: 'MD, DM (Cardiology)',
      specialization: 'Cardiologist',
      class: 'A',
      potential_score: 94,
      area_name: 'Saket',
      phone: '+91 98111 22334',
      latitude: 28.5245,
      longitude: 77.2066,
      visit_count: 14,
      category: 'CLINIC',
      address: 'Press Enclave Marg, Saket, New Delhi',
      created_by_name: 'Rahul Sharma',
      created_by_role: 'MR',
    },
    {
      id: 'loc-02',
      name: 'Dr. Priya Verma',
      clinic: 'Verma PolyClinic',
      qualification: 'MBBS, DNB (Internal Med)',
      specialization: 'General Physician',
      class: 'B',
      potential_score: 78,
      area_name: 'Malviya Nagar',
      phone: '+91 98222 33445',
      latitude: 28.5355,
      longitude: 77.2101,
      visit_count: 9,
      category: 'CLINIC',
      address: 'Block B, Main Market, Malviya Nagar, New Delhi',
      created_by_name: 'Rahul Sharma',
      created_by_role: 'MR',
    },
    {
      id: 'loc-03',
      name: 'Max Super Specialty Hospital',
      clinic: 'Max Healthcare OPD',
      qualification: 'NABH Accredited',
      specialization: 'Multi-Specialty',
      class: 'A',
      potential_score: 98,
      area_name: 'Saket Institutional Area',
      phone: '+91 11 2651 5050',
      latitude: 28.5282,
      longitude: 77.2124,
      visit_count: 22,
      category: 'HOSPITAL',
      address: '1, 2, Press Enclave Road, Mandir Marg, Saket',
      created_by_name: 'Vikram Malhotra',
      created_by_role: 'MR',
    },
  ]);

  // Leave Quota State for Selected Member
  const [leaveQuota, setLeaveQuota] = useState<LeaveQuotaData>({
    mr_id: 'usr-mr-01',
    year: 2026,
    casual: { total: 12, used: 2, remaining: 10 },
    sick: { total: 8, used: 1, remaining: 7 },
    earned: { total: 15, used: 0, remaining: 15 },
    total_remaining: 32,
  });

  // Quota edit inputs
  const [casualInput, setCasualInput] = useState<number>(12);
  const [sickInput, setSickInput] = useState<number>(8);
  const [earnedInput, setEarnedInput] = useState<number>(15);
  const [isSavingQuota, setIsSavingQuota] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected visit for inspection
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskItem | null>(null);

  // Top tabs for MR selector
  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Users, Tasks, and Locations
  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const usersRes = await fetch(`${apiUrl}/users?role=MR`, { headers });
        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (Array.isArray(uData) && uData.length > 0) setMembers(uData);
        }
      } catch {}

      try {
        const tasksRes = await fetch(`${apiUrl}/tasks`, { headers });
        if (tasksRes.ok) {
          const tData = await tasksRes.json();
          if (Array.isArray(tData) && tData.length > 0) setTasks(tData);
        }
      } catch {}

      try {
        const locsRes = await fetch(`${apiUrl}/locations`, { headers });
        if (locsRes.ok) {
          const lData = await locsRes.json();
          if (Array.isArray(lData) && lData.length > 0) setLocations(lData);
        }
      } catch {}
    };
    fetchData();
  }, []);

  // Fetch Leave Quota for selected member
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
        const res = await fetch(`${apiUrl}/leave/quota?mr_id=${selectedMemberId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data: LeaveQuotaData = await res.json();
          setLeaveQuota(data);
          setCasualInput(data.casual.total);
          setSickInput(data.sick.total);
          setEarnedInput(data.earned.total);
        }
      } catch {
        // Fallback default
        if (selectedMemberId === 'usr-mr-01') {
          setCasualInput(12);
          setSickInput(8);
          setEarnedInput(15);
        } else if (selectedMemberId === 'usr-mr-02') {
          setCasualInput(10);
          setSickInput(6);
          setEarnedInput(12);
        } else {
          setCasualInput(14);
          setSickInput(8);
          setEarnedInput(15);
        }
      }
    };
    fetchQuota();
  }, [selectedMemberId]);

  // Update Leave Quota in Backend
  const handleSaveQuota = async () => {
    setIsSavingQuota(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/leave/quota/${selectedMemberId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          casual_total: Number(casualInput),
          sick_total: Number(sickInput),
          earned_total: Number(earnedInput),
        }),
      });

      if (res.ok) {
        const updated: LeaveQuotaData = await res.json();
        setLeaveQuota(updated);
        showToast(`✓ Leave allowances updated for ${selectedMember.name}! Synced with mobile app.`);
      } else {
        // Local simulation fallback
        setLeaveQuota((prev) => ({
          ...prev,
          casual: { ...prev.casual, total: Number(casualInput), remaining: Math.max(0, Number(casualInput) - prev.casual.used) },
          sick: { ...prev.sick, total: Number(sickInput), remaining: Math.max(0, Number(sickInput) - prev.sick.used) },
          earned: { ...prev.earned, total: Number(earnedInput), remaining: Math.max(0, Number(earnedInput) - prev.earned.used) },
        }));
        showToast(`✓ Leave allowances updated locally for ${selectedMember.name}!`);
      }
    } catch {
      setLeaveQuota((prev) => ({
        ...prev,
        casual: { ...prev.casual, total: Number(casualInput), remaining: Math.max(0, Number(casualInput) - prev.casual.used) },
        sick: { ...prev.sick, total: Number(sickInput), remaining: Math.max(0, Number(sickInput) - prev.sick.used) },
        earned: { ...prev.earned, total: Number(earnedInput), remaining: Math.max(0, Number(earnedInput) - prev.earned.used) },
      }));
      showToast(`✓ Leave allowances saved for ${selectedMember.name}!`);
    } finally {
      setIsSavingQuota(false);
    }
  };

  // Reset Device Lock
  const handleResetDevice = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to reset device binding for ${name}? The current phone lock will be cleared, allowing the MR to pair their new device on next login.`
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
            : m
        )
      );
      showToast(`Device binding successfully cleared for ${name}.`);
    }
  };

  // Copy Credentials
  const handleCopyCredentials = (member: MRMemberItem) => {
    const text = `AHTRI MR Mobile Login Credentials:\nName: ${member.name}\nLogin ID / Email: ${member.email}\nRegistered Phone: ${member.phone}\nPassword: Password@123\nNote: For bank-grade security, the app will lock to your phone on your first login.`;
    navigator.clipboard.writeText(text);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`Credentials copied for ${member.name}`);
  };

  // MR Registration Form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password@123');

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
      device_id: undefined,
      created_at: new Date().toISOString().split('T')[0],
    };

    setMembers((prev) => [newMember, ...prev]);
    setIsRegisterOpen(false);
    setSelectedMemberId(newMember.id);

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
        }),
      });
    } catch {}

    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewPassword('Password@123');
    showToast(`✓ Registered new MR member: ${newMember.name}`);
  };

  // Filtered tasks for current selected MR
  const memberTasks = tasks.filter(
    (t) =>
      t.assigned_mr_id === selectedMember.id ||
      t.assigned_mr_name?.toLowerCase().includes(selectedMember.name.toLowerCase())
  );

  const completedTasks = memberTasks.filter((t) => t.status === 'COMPLETED');
  const inProgressTasks = memberTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED');
  const missedTasks = memberTasks.filter((t) => t.status === 'MISSED');

  const totalOrdersCaptured = memberTasks.reduce(
    (acc, t) => acc + (t.orders ? t.orders.length : 0),
    0
  );
  const totalOrderRevenue = memberTasks.reduce((acc, t) => {
    if (!t.orders) return acc;
    return (
      acc +
      t.orders.reduce(
        (sum, ord) => sum + (ord.total_amount || (ord.unit_price ? ord.unit_price * ord.quantity : 0)),
        0
      )
    );
  }, 0);

  // Filtered locations marked by current MR
  const memberLocations = locations.filter(
    (loc) =>
      loc.created_by_name?.toLowerCase().includes(selectedMember.name.toLowerCase()) ||
      loc.assigned_mr_id === selectedMember.id ||
      (selectedMember.id === 'usr-mr-01' && (loc.created_by_role === 'MR' || !loc.created_by_name))
  );

  // Delay calculation helper
  const getDelayBadge = (task: TaskItem) => {
    if (!task.started_at || !task.time) return { isDelayed: false, text: 'Scheduled' };
    try {
      const scheduled = new Date(`${task.date || '2026-09-06'}T${task.time}`);
      const actual = new Date(task.started_at);
      const diff = Math.round((actual.getTime() - scheduled.getTime()) / 60000);
      if (diff > 15) {
        return { isDelayed: true, text: `${diff}m Delay` };
      } else if (diff < -10) {
        return { isDelayed: false, text: `${Math.abs(diff)}m Early` };
      }
      return { isDelayed: false, text: 'Punctual (±10m)' };
    } catch {
      return { isDelayed: false, text: 'Verified' };
    }
  };

  return (
    <div style={{ padding: 'clamp(14px, 3vw, 24px)', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '800', color: '#0F172A' }}>
            Employee Hub & Representative Management
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Audit field visit punctuality, review doctor feedback & orders, allocate leave quotas, and enforce device security.
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

      {/* Employee Selector Bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '12px 16px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
          Select Medical Representative (Employee Profile)
        </div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {members.map((m) => {
            const isSelected = m.id === selectedMemberId;
            const isBound = Boolean(m.device_id);
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #1A3C6E' : '1px solid #E2E8F0',
                  background: isSelected ? '#EFF6FF' : '#F8FAFC',
                  cursor: 'pointer',
                  minWidth: '220px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isSelected ? '#1A3C6E' : '#E2E8F0',
                    color: isSelected ? '#FFFFFF' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '13px',
                  }}
                >
                  {m.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {m.phone}
                  </div>
                </div>
                {isBound ? (
                  <span title="Hardware Locked"><ShieldCheck size={16} color="#0F8B5A" /></span>
                ) : (
                  <span title="Awaiting Phone Binding"><ShieldAlert size={16} color="#D97706" /></span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Employee Summary Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
          borderRadius: '12px',
          padding: '20px 24px',
          color: '#FFFFFF',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 14px rgba(26, 60, 110, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '800',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            {selectedMember.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{selectedMember.name}</h2>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#6EE7B7',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: '700',
                }}
              >
                {selectedMember.status}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#93C5FD', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>ID: {selectedMember.id}</span>
              <span>📞 {selectedMember.phone}</span>
              <span>✉️ {selectedMember.email}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#93C5FD', fontWeight: '600' }}>Remaining Leave Allowance</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#FCD34D' }}>
              {leaveQuota.casual.remaining + leaveQuota.sick.remaining + leaveQuota.earned.remaining} Days
            </div>
            <div style={{ fontSize: '10.5px', color: '#CBD5E1' }}>
              (CL: {leaveQuota.casual.remaining} • SL: {leaveQuota.sick.remaining} • EL: {leaveQuota.earned.remaining})
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyCredentials(selectedMember)}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {copiedId === selectedMember.id ? <Check size={14} color="#6EE7B7" /> : <Copy size={14} />}
            <span>{copiedId === selectedMember.id ? 'Copied' : 'Share Credentials'}</span>
          </button>
        </div>
      </div>

      {/* Hub Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '20px',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'performance' ? '3px solid #1A3C6E' : '3px solid transparent',
            color: activeTab === 'performance' ? '#1A3C6E' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TrendingUp size={16} />
          <span>Field Performance & Visits ({memberTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'locations' ? '3px solid #1A3C6E' : '3px solid transparent',
            color: activeTab === 'locations' ? '#1A3C6E' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MapPin size={16} />
          <span>Marked Locations ({memberLocations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'leaves' ? '3px solid #1A3C6E' : '3px solid transparent',
            color: activeTab === 'leaves' ? '#1A3C6E' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={16} />
          <span>Leave Allowance & Quotas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'security' ? '3px solid #1A3C6E' : '3px solid transparent',
            color: activeTab === 'security' ? '#1A3C6E' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Lock size={16} />
          <span>Device Pairing & Security ({members.length} Members)</span>
        </button>
      </div>

      {/* TAB 1: FIELD PERFORMANCE & VISITS */}
      {activeTab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>Completed Visits</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                {completedTasks.length}
              </div>
              <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
                Detailing done on-site
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>Pending / In-Progress</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563EB', marginTop: '4px' }}>
                {inProgressTasks.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                Scheduled for today
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>Orders Booked (POB)</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
                {totalOrdersCaptured} items
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px', fontWeight: '700' }}>
                ₹{totalOrderRevenue.toLocaleString('en-IN')} Total Value
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>Locations Marked</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F8B5A', marginTop: '4px' }}>
                {memberLocations.length} clinics
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                Contributed to company database
              </div>
            </div>
          </div>

          {/* Visits Detailing & Timing Table */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                Visits & Timing Audit Log for {selectedMember.name}
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Showing all assigned, in-progress & completed visits
              </span>
            </div>

            {memberTasks.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', color: '#475569', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 14px' }}>Visit Title & Clinic</th>
                      <th style={{ padding: '10px 14px' }}>Scheduled</th>
                      <th style={{ padding: '10px 14px' }}>Actual Check-in</th>
                      <th style={{ padding: '10px 14px' }}>Punctuality</th>
                      <th style={{ padding: '10px 14px' }}>Meeting Duration</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Orders Captured</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberTasks.map((t) => {
                      const delay = getDelayBadge(t);
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '700', color: '#0F172A' }}>{t.title}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{t.location_name}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>
                            {t.time}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>
                            {t.started_at ? new Date(t.started_at).toLocaleTimeString() : 'Not started'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: delay.isDelayed ? '#FEE2E2' : '#DCFCE7',
                                color: delay.isDelayed ? '#B91C1C' : '#15803D',
                              }}
                            >
                              {delay.text}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#0F172A', fontWeight: '600' }}>
                            {t.duration_seconds
                              ? `${Math.floor(t.duration_seconds / 60)}m ${t.duration_seconds % 60}s`
                              : '-'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background:
                                  t.status === 'COMPLETED'
                                    ? '#DCFCE7'
                                    : t.status === 'IN_PROGRESS'
                                    ? '#DBEAFE'
                                    : '#F1F5F9',
                                color:
                                  t.status === 'COMPLETED'
                                    ? '#166534'
                                    : t.status === 'IN_PROGRESS'
                                    ? '#1E40AF'
                                    : '#475569',
                              }}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {t.orders && t.orders.length > 0 ? (
                              <span style={{ color: '#166534', fontWeight: '700' }}>
                                ✓ {t.orders.length} items (₹{t.orders.reduce((sum, o) => sum + (o.total_amount || ((o.unit_price || 0) * o.quantity)), 0)})
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>None</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedTaskDetails(t)}
                              style={{
                                padding: '5px 10px',
                                background: '#EFF6FF',
                                color: '#1A3C6E',
                                border: '1px solid #BFDBFE',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                No visits currently assigned to {selectedMember.name}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MARKED LOCATIONS */}
      {activeTab === 'locations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                  Clinics & Facilities Marked by {selectedMember.name}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Locations discovered and marked by this representative from the field mobile app.
                </p>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  background: '#DCFCE7',
                  color: '#166534',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                {memberLocations.length} Locations Contributed
              </span>
            </div>

            {memberLocations.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {memberLocations.map((loc) => (
                  <div
                    key={loc.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '14px',
                      background: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>
                          {loc.clinic || loc.name}
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#EFF6FF',
                            color: '#1A3C6E',
                          }}
                        >
                          {loc.category || 'CLINIC'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#0F8B5A', fontWeight: '600', marginTop: '2px' }}>
                        {loc.doctor_name || loc.name} ({loc.specialization || 'Consultant'})
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', lineHeight: '1.4' }}>
                        {loc.address}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#0F8B5A', fontWeight: '700' }}>
                        📍 Marked by: {loc.created_by_name || selectedMember.name}
                      </div>

                      {onNavigateToLocation && (
                        <button
                          type="button"
                          onClick={() => onNavigateToLocation(loc.id)}
                          style={{
                            background: '#1A3C6E',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>View on Map</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                No locations have been marked by {selectedMember.name} yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE ALLOWANCE & QUOTA ALLOCATOR */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Informational Guidance Alert */}
          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Calendar size={22} color="#2563EB" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: '18px' }}>
              <strong>Admin Leave Allowance Allocator:</strong> Define and increase annual leave allowances for each field representative below. When an employee takes approved leave in the mobile app, their balance automatically decreases. If their quota is exhausted, their mobile app blocks further applications and prompts them to speak with their manager.
            </div>
          </div>

          {/* Current Quota Status Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Casual Leave */}
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF', marginBottom: '4px' }}>
                Casual Leave (CL)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A' }}>
                  {leaveQuota.casual.remaining}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  of {leaveQuota.casual.total} Allocated
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                Used: {leaveQuota.casual.used} days • Remaining: {leaveQuota.casual.remaining} days
              </div>
            </div>

            {/* Sick Leave */}
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#B45309', marginBottom: '4px' }}>
                Sick Leave (SL)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A' }}>
                  {leaveQuota.sick.remaining}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  of {leaveQuota.sick.total} Allocated
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                Used: {leaveQuota.sick.used} days • Remaining: {leaveQuota.sick.remaining} days
              </div>
            </div>

            {/* Earned Leave */}
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803D', marginBottom: '4px' }}>
                Earned / Annual Leave (EL)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A' }}>
                  {leaveQuota.earned.remaining}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  of {leaveQuota.earned.total} Allocated
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#15803D', marginTop: '4px' }}>
                Used: {leaveQuota.earned.used} days • Remaining: {leaveQuota.earned.remaining} days
              </div>
            </div>
          </div>

          {/* Interactive Allowance Editor Panel */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
              Adjust Leave Allowance for {selectedMember.name}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: '#64748B' }}>
              Increase or adjust total leave days available for this employee. Saved changes immediately update the employee's mobile leave balances.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '24px',
              }}
            >
              {/* Casual Leave Input */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', background: '#F8FAFC' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E40AF', marginBottom: '4px' }}>
                  Casual Leave (CL) Total Days:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCasualInput(Math.max(1, casualInput - 1))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={casualInput}
                    onChange={(e) => setCasualInput(Number(e.target.value))}
                    style={{
                      width: '70px',
                      height: '36px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: '800',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCasualInput(casualInput + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCasualInput(casualInput + 2)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #BFDBFE',
                      background: '#EFF6FF',
                      color: '#1E40AF',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    +2 Days
                  </button>
                </div>
              </div>

              {/* Sick Leave Input */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', background: '#F8FAFC' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#B45309', marginBottom: '4px' }}>
                  Sick Leave (SL) Total Days:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSickInput(Math.max(1, sickInput - 1))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={sickInput}
                    onChange={(e) => setSickInput(Number(e.target.value))}
                    style={{
                      width: '70px',
                      height: '36px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: '800',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSickInput(sickInput + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSickInput(sickInput + 2)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #FEF08A',
                      background: '#FEF9C3',
                      color: '#854D0E',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    +2 Days
                  </button>
                </div>
              </div>

              {/* Earned Leave Input */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', background: '#F8FAFC' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#15803D', marginBottom: '4px' }}>
                  Earned Leave (EL) Total Days:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEarnedInput(Math.max(1, earnedInput - 1))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={earnedInput}
                    onChange={(e) => setEarnedInput(Number(e.target.value))}
                    style={{
                      width: '70px',
                      height: '36px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: '800',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setEarnedInput(earnedInput + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEarnedInput(earnedInput + 2)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #BBF7D0',
                      background: '#F0FDF4',
                      color: '#166534',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    +2 Days
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveQuota}
              disabled={isSavingQuota}
              style={{
                padding: '12px 24px',
                background: '#1A3C6E',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: isSavingQuota ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(26, 60, 110, 0.25)',
              }}
            >
              <Save size={16} />
              <span>{isSavingQuota ? 'Updating Quotas...' : `Save & Sync Quotas to ${selectedMember.name}'s App`}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: DEVICE HARDWARE SECURITY & ALL MEMBERS */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Security Architecture Notice Banner */}
          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '12px 16px',
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

          {/* Search Bar */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '12px 16px',
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

          {/* Members Table */}
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
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Bank-Style Device Binding</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members
                    .filter(
                      (m) =>
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.phone.includes(searchQuery) ||
                        m.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((member) => {
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

                          <td style={{ padding: '14px 16px', color: '#334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={13} color="#64748B" />
                              <span>{member.phone}</span>
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', color: '#334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Mail size={13} color="#64748B" />
                              <span>{member.email}</span>
                            </div>
                          </td>

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
                                <span style={{ fontSize: '12px', fontWeight: '600' }}>Unbound (Awaiting Phone Login)</span>
                              </div>
                            )}
                          </td>

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

                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(member)}
                                title="Copy Credentials for WhatsApp/SMS"
                                style={{
                                  padding: '6px 10px',
                                  background: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11.5px',
                                  fontWeight: '600',
                                  color: '#334155',
                                }}
                              >
                                {copiedId === member.id ? <Check size={13} color="#166534" /> : <Copy size={13} />}
                                <span>{copiedId === member.id ? 'Copied' : 'Share'}</span>
                              </button>

                              {isBound && (
                                <button
                                  type="button"
                                  onClick={() => handleResetDevice(member.id, member.name)}
                                  title="Reset Hardware Binding (Clear Phone Lock)"
                                  style={{
                                    padding: '6px 10px',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11.5px',
                                    fontWeight: '600',
                                    color: '#DC2626',
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Reset Phone Lock</span>
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
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setSelectedTaskDetails(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#166534" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                  {selectedTaskDetails.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskDetails(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                <div><strong>Location:</strong> {selectedTaskDetails.location_name}</div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Timing:</strong> Scheduled at {selectedTaskDetails.time} • Check-in:{' '}
                  {selectedTaskDetails.started_at ? new Date(selectedTaskDetails.started_at).toLocaleTimeString() : 'N/A'}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Duration:</strong> {selectedTaskDetails.duration_seconds ? `${Math.floor(selectedTaskDetails.duration_seconds / 60)}m ${selectedTaskDetails.duration_seconds % 60}s` : '-'}
                </div>
              </div>

              {selectedTaskDetails.outcome && (
                <div style={{ background: '#FEF9C3', border: '1px solid #FEF08A', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '12px', color: '#854D0E', marginBottom: '4px' }}>
                    Doctor Remarks / Feedback:
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#1E293B' }}>{selectedTaskDetails.outcome}</div>
                </div>
              )}

              {selectedTaskDetails.orders && selectedTaskDetails.orders.length > 0 && (
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A', marginBottom: '8px' }}>
                    Commercial Orders Booked ({selectedTaskDetails.orders.length}):
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px' }}>Product</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTaskDetails.orders.map((ord, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '600' }}>{ord.product_name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{ord.quantity}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#166534' }}>
                            ₹{ord.total_amount || (ord.unit_price ? ord.unit_price * ord.quantity : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedTaskDetails(null)}
                style={{
                  padding: '8px 16px',
                  background: '#1A3C6E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setIsRegisterOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                Register New Field Representative
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterMember} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Patel"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Assigned Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9811122334"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. amit@ahtri.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Initial Temporary Password *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', background: '#1A3C6E', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', color: '#FFFFFF', cursor: 'pointer' }}
                >
                  Register Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            fontSize: '13px',
            fontWeight: '600',
            zIndex: 10000,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
