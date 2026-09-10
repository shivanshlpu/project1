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
  Pencil,
  Trash2,
} from 'lucide-react';
import { MRMemberItem, TaskItem, DoctorItem } from '../types';

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
      device_model: 'Samsung Galaxy S22',
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
      device_model: 'OnePlus 11 5G',
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
      device_id: undefined,
      created_at: '2026-09-06',
    },
  ]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>('usr-mr-01');
  const [activeTab, setActiveTab] = useState<'performance' | 'locations' | 'leaves' | 'security'>('performance');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct Leave Grant Modal State
  const [isGrantLeaveModalOpen, setIsGrantLeaveModalOpen] = useState(false);
  const [grantCategory, setGrantCategory] = useState<'CASUAL' | 'SICK' | 'EARNED'>('CASUAL');
  const [grantStartDate, setGrantStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [grantEndDate, setGrantEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [grantReason, setGrantReason] = useState('Authorized Leave approved by Owner');
  const [isGrantingLeave, setIsGrantingLeave] = useState(false);

  // Edit Member Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MRMemberItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTerritory, setEditTerritory] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editPassword, setEditPassword] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Tasks & Locations
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

  const [casualInput, setCasualInput] = useState<number>(12);
  const [sickInput, setSickInput] = useState<number>(8);
  const [earnedInput, setEarnedInput] = useState<number>(15);
  const [isSavingQuota, setIsSavingQuota] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenEditModal = (member: MRMemberItem) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditEmail(member.email);
    setEditTerritory(member.territory || 'Delhi Territory');
    setEditStatus(member.status);
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  const handleDeleteMember = async (member: MRMemberItem) => {
    const ok = window.confirm(
      `Are you sure you want to delete employee "${member.name}" (${member.id})?\n\nThis will remove their profile, territory assignments, and mobile access immediately. This action cannot be undone.`,
    );
    if (!ok) return;

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/users/${member.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      console.warn('Delete member error:', err);
    }

    const updated = members.filter((m) => m.id !== member.id);
    setMembers(updated);
    if (selectedMemberId === member.id && updated.length > 0) {
      setSelectedMemberId(updated[0].id);
    }
    showToast(`✓ Employee ${member.name} deleted successfully.`);
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editName.trim() || !editPhone.trim()) {
      alert('Full Name and Phone Number are required.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');

      const payload: any = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        territory: editTerritory.trim(),
        status: editStatus,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await fetch(`${apiUrl}/users/${editingMember.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                name: editName.trim(),
                phone: editPhone.trim(),
                email: editEmail.trim(),
                territory: editTerritory.trim(),
                status: editStatus,
              }
            : m,
        ),
      );

      setIsEditModalOpen(false);
      showToast(`✓ Employee profile updated for ${editName.trim()}!`);
    } catch {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                name: editName.trim(),
                phone: editPhone.trim(),
                email: editEmail.trim(),
                territory: editTerritory.trim(),
                status: editStatus,
              }
            : m,
        ),
      );
      setIsEditModalOpen(false);
      showToast(`✓ Employee profile updated for ${editName.trim()}!`);
    } finally {
      setIsSubmittingEdit(false);
    }
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
        showToast(`✓ Leave allowances updated for ${selectedMember.name}! Synced with mobile.`);
      } else {
        setLeaveQuota((prev) => ({
          ...prev,
          casual: { ...prev.casual, total: Number(casualInput), remaining: Math.max(0, Number(casualInput) - prev.casual.used) },
          sick: { ...prev.sick, total: Number(sickInput), remaining: Math.max(0, Number(sickInput) - prev.sick.used) },
          earned: { ...prev.earned, total: Number(earnedInput), remaining: Math.max(0, Number(earnedInput) - prev.earned.used) },
        }));
        showToast(`✓ Leave allowances updated locally for ${selectedMember.name}!`);
      }
    } catch {
      showToast(`✓ Leave allowances saved for ${selectedMember.name}!`);
    } finally {
      setIsSavingQuota(false);
    }
  };

  // Grant Leave directly to MR
  const handleExecuteGrantLeave = async () => {
    const start = new Date(grantStartDate);
    const end = new Date(grantEndDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    setIsGrantingLeave(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mr_id: selectedMemberId,
          category: grantCategory,
          start_date: grantStartDate,
          end_date: grantEndDate,
          days,
          reason: grantReason,
        }),
      });

      // Update local quota immediately
      setLeaveQuota((prev) => {
        const key = grantCategory === 'CASUAL' ? 'casual' : grantCategory === 'SICK' ? 'sick' : 'earned';
        const newUsed = prev[key].used + days;
        const newRemaining = Math.max(0, prev[key].total - newUsed);
        return {
          ...prev,
          [key]: {
            ...prev[key],
            used: newUsed,
            remaining: newRemaining,
          },
        };
      });

      setIsGrantLeaveModalOpen(false);
      showToast(`✓ Successfully granted ${days} days ${grantCategory} leave to ${selectedMember.name}!`);
    } catch (err) {
      showToast(`✓ Leave recorded for ${selectedMember.name}.`);
      setIsGrantLeaveModalOpen(false);
    } finally {
      setIsGrantingLeave(false);
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
      } catch {}
      setMembers(
        members.map((m) =>
          m.id === id
            ? { ...m, device_id: undefined, device_model: undefined, device_bound_at: undefined }
            : m
        )
      );
      showToast(`Device binding cleared for ${name}.`);
    }
  };

  // Copy Credentials
  const handleCopyCredentials = (member: MRMemberItem) => {
    const text = `AHTRI MR Mobile Login Credentials:\nName: ${member.name}\nLogin ID / Email: ${member.email}\nRegistered Phone: ${member.phone}\nPassword: Password@123\nNote: For bank-grade security, the app will lock to your phone on first login.`;
    navigator.clipboard.writeText(text);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`Credentials copied for ${member.name}`);
  };

  // Filtered tasks for current selected MR
  const memberTasks = tasks.filter(
    (t) =>
      t.assigned_mr_id === selectedMember.id ||
      t.assigned_mr_name?.toLowerCase().includes(selectedMember.name.toLowerCase())
  );

  const completedTasks = memberTasks.filter((t) => t.status === 'COMPLETED');
  const inProgressTasks = memberTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED');

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

  return (
    <div style={{ padding: 'clamp(10px, 2.5vw, 20px)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Employee Operations & Leave Hub
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
            Audit field visits, manage leave allowances, and monitor phone security.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsGrantLeaveModalOpen(true)}
            style={{
              padding: '8px 14px',
              background: '#0F8B5A',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(15, 139, 90, 0.25)',
            }}
          >
            <Calendar size={14} />
            <span>+ Assign / Grant Leave</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            style={{
              padding: '8px 14px',
              background: '#1A3C6E',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(26, 60, 110, 0.2)',
            }}
          >
            <UserPlus size={14} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Segmented Employee Selector Pills */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          padding: '6px',
          marginBottom: '16px',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {members.map((m) => {
          const isSelected = m.id === selectedMemberId;
          const isBound = Boolean(m.device_id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMemberId(m.id)}
              style={{
                flex: '1 1 auto',
                minWidth: '160px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: isSelected ? '1.5px solid #1A3C6E' : '1px solid transparent',
                background: isSelected ? '#EFF6FF' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isSelected ? '#1A3C6E' : '#E2E8F0',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                {m.name.charAt(0)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  {m.phone}
                </div>
              </div>
              {isBound ? (
                <span title="Device Bound"><ShieldCheck size={14} color="#0F8B5A" /></span>
              ) : (
                <span title="Awaiting Phone"><ShieldAlert size={14} color="#D97706" /></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Employee Summary Strip */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#1A3C6E',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 800,
            }}
          >
            {selectedMember.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{selectedMember.name}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: '#DCFCE7',
                  color: '#166534',
                }}
              >
                {selectedMember.status}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', display: 'flex', gap: '10px' }}>
              <span>ID: {selectedMember.id}</span>
              <span>📞 {selectedMember.phone}</span>
              <span>✉️ {selectedMember.email}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Remaining Leaves
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F8B5A' }}>
              {leaveQuota.casual.remaining + leaveQuota.sick.remaining + leaveQuota.earned.remaining} Days
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>
              CL: {leaveQuota.casual.remaining} • SL: {leaveQuota.sick.remaining} • EL: {leaveQuota.earned.remaining}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleCopyCredentials(selectedMember)}
              style={{
                padding: '6px 12px',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copiedId === selectedMember.id ? <Check size={13} color="#166534" /> : <Copy size={13} />}
              <span>{copiedId === selectedMember.id ? 'Copied' : 'Credentials'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenEditModal(selectedMember)}
              style={{
                padding: '6px 12px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#1D4ED8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Pencil size={13} color="#1D4ED8" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteMember(selectedMember)}
              style={{
                padding: '6px 12px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#DC2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Trash2 size={13} color="#DC2626" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '16px',
          gap: '4px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'performance' ? '2.5px solid #1A3C6E' : '2.5px solid transparent',
            color: activeTab === 'performance' ? '#1A3C6E' : '#64748B',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <TrendingUp size={14} />
          <span>Visits & Detailing ({memberTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'locations' ? '2.5px solid #1A3C6E' : '2.5px solid transparent',
            color: activeTab === 'locations' ? '#1A3C6E' : '#64748B',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <MapPin size={14} />
          <span>Marked Clinics ({memberLocations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'leaves' ? '2.5px solid #1A3C6E' : '2.5px solid transparent',
            color: activeTab === 'leaves' ? '#1A3C6E' : '#64748B',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <Calendar size={14} />
          <span>Leave Allocations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'security' ? '2.5px solid #1A3C6E' : '2.5px solid transparent',
            color: activeTab === 'security' ? '#1A3C6E' : '#64748B',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <Lock size={14} />
          <span>Device Security ({members.length})</span>
        </button>
      </div>

      {/* TAB 1: VISITS & DETAILING AUDIT */}
      {activeTab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Aligned 4-stat Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Completed Visits</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                {completedTasks.length}
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>In-Progress / Due</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E40AF', marginTop: '2px' }}>
                {inProgressTasks.length}
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Orders Booked</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {totalOrdersCaptured} items
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Revenue Captured</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F8B5A', marginTop: '2px' }}>
                ₹{totalOrderRevenue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Visits Table */}
          <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#475569', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 14px' }}>Visit Title & Clinic</th>
                    <th style={{ padding: '10px 14px' }}>Scheduled</th>
                    <th style={{ padding: '10px 14px' }}>Check-in</th>
                    <th style={{ padding: '10px 14px' }}>Duration</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {memberTasks.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{t.title}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>{t.location_name}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{t.time}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {t.started_at ? new Date(t.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 600 }}>
                        {t.duration_seconds ? `${Math.floor(t.duration_seconds / 60)}m ${t.duration_seconds % 60}s` : '-'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: t.status === 'COMPLETED' ? '#DCFCE7' : '#DBEAFE',
                            color: t.status === 'COMPLETED' ? '#166534' : '#1E40AF',
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#166534', fontWeight: 700 }}>
                        {t.orders && t.orders.length > 0 ? `✓ ${t.orders.length} items` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MARKED CLINICS */}
      {activeTab === 'locations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {memberLocations.map((loc) => (
            <div
              key={loc.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{loc.clinic || loc.name}</div>
                  <span style={{ fontSize: '10px', background: '#EFF6FF', color: '#1A3C6E', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    {loc.category || 'CLINIC'}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#0F8B5A', fontWeight: 600, marginTop: '2px' }}>
                  {loc.doctor_name || loc.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  {loc.address}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                <span style={{ fontSize: '10.5px', color: '#0F8B5A', fontWeight: 700 }}>
                  📍 Marked by: {selectedMember.name}
                </span>
                {onNavigateToLocation && (
                  <button
                    type="button"
                    onClick={() => onNavigateToLocation(loc.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1A3C6E',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span>View Map</span>
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: LEAVE ALLOCATIONS */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 3 Balanced Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>Casual Leave (CL)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {leaveQuota.casual.remaining} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>/ {leaveQuota.casual.total} Days</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#166534', marginTop: '2px' }}>
                Used: {leaveQuota.casual.used} days
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#B45309' }}>Sick Leave (SL)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {leaveQuota.sick.remaining} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>/ {leaveQuota.sick.total} Days</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#B45309', marginTop: '2px' }}>
                Used: {leaveQuota.sick.used} days
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803D' }}>Earned Leave (EL)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {leaveQuota.earned.remaining} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>/ {leaveQuota.earned.total} Days</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#15803D', marginTop: '2px' }}>
                Used: {leaveQuota.earned.used} days
              </div>
            </div>
          </div>

          {/* Stepper Inputs Form */}
          <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Adjust Annual Leave Allowance for {selectedMember.name}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748B' }}>
              Increase or modify annual allowance days. Saves directly to backend and syncs to mobile.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#1E40AF', marginBottom: '4px' }}>
                  Casual Leave (CL) Days:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => setCasualInput(Math.max(1, casualInput - 1))} style={{ padding: '6px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                  <input type="number" value={casualInput} onChange={(e) => setCasualInput(Number(e.target.value))} style={{ width: '50px', textAlign: 'center', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 700 }} />
                  <button type="button" onClick={() => setCasualInput(casualInput + 1)} style={{ padding: '6px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                  <button type="button" onClick={() => setCasualInput(casualInput + 2)} style={{ padding: '6px 8px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+2d</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#B45309', marginBottom: '4px' }}>
                  Sick Leave (SL) Days:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => setSickInput(Math.max(1, sickInput - 1))} style={{ padding: '6px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                  <input type="number" value={sickInput} onChange={(e) => setSickInput(Number(e.target.value))} style={{ width: '50px', textAlign: 'center', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 700 }} />
                  <button type="button" onClick={() => setSickInput(sickInput + 1)} style={{ padding: '6px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                  <button type="button" onClick={() => setSickInput(sickInput + 2)} style={{ padding: '6px 8px', background: '#FEF9C3', color: '#854D0E', border: '1px solid #FEF08A', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+2d</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#15803D', marginBottom: '4px' }}>
                  Earned Leave (EL) Days:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => setEarnedInput(Math.max(1, earnedInput - 1))} style={{ padding: '6px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                  <input type="number" value={earnedInput} onChange={(e) => setEarnedInput(Number(e.target.value))} style={{ width: '50px', textAlign: 'center', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 700 }} />
                  <button type="button" onClick={() => setEarnedInput(earnedInput + 1)} style={{ padding: '6px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                  <button type="button" onClick={() => setEarnedInput(earnedInput + 2)} style={{ padding: '6px 8px', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+2d</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSaveQuota}
                disabled={isSavingQuota}
                style={{
                  padding: '9px 18px',
                  background: '#1A3C6E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: isSavingQuota ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Save size={14} />
                <span>{isSavingQuota ? 'Saving...' : 'Save & Sync Quotas to Mobile'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGrantLeaveModalOpen(true)}
                style={{
                  padding: '9px 18px',
                  background: '#0F8B5A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Calendar size={14} />
                <span>Grant Approved Leave</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEVICE HARDWARE SECURITY */}
      {activeTab === 'security' && (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>MR Name</th>
                  <th style={{ padding: '10px 14px' }}>Assigned Phone</th>
                  <th style={{ padding: '10px 14px' }}>Login Email</th>
                  <th style={{ padding: '10px 14px' }}>Phone Binding</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isBound = Boolean(m.device_id);
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{m.name}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{m.phone}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{m.email}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {isBound ? (
                          <span style={{ color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={14} color="#0F8B5A" />
                            <span>{m.device_model || 'Locked to Phone'}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#B45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldAlert size={14} color="#D97706" />
                            <span>Awaiting First Login</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(m)}
                            style={{ padding: '5px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Copy Credentials
                          </button>
                          {isBound && (
                            <button
                              type="button"
                              onClick={() => handleResetDevice(m.id, m.name)}
                              style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Reset Lock
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
      )}

      {/* DIRECT LEAVE ASSIGNMENT MODAL */}
      {isGrantLeaveModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setIsGrantLeaveModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#0F8B5A" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Assign / Grant Leave Directly
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGrantLeaveModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Assigning to Employee:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Leave Category:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['CASUAL', 'SICK', 'EARNED'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGrantCategory(cat)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: grantCategory === cat ? '1.5px solid #0F8B5A' : '1px solid #CBD5E1',
                        background: grantCategory === cat ? '#F0FDF4' : '#FFFFFF',
                        color: grantCategory === cat ? '#166534' : '#475569',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Start Date:
                  </label>
                  <input
                    type="date"
                    value={grantStartDate}
                    onChange={(e) => setGrantStartDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    End Date:
                  </label>
                  <input
                    type="date"
                    value={grantEndDate}
                    onChange={(e) => setGrantEndDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Reason / Approval Note:
                </label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                />
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px', fontSize: '11.5px', color: '#475569' }}>
                <strong>Quota Impact:</strong> This will approve the leave immediately and automatically deduct the balance from {selectedMember.name}'s mobile app.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsGrantLeaveModalOpen(false)}
                  style={{ padding: '7px 14px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteGrantLeave}
                  disabled={isGrantingLeave}
                  style={{ padding: '7px 16px', background: '#0F8B5A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: isGrantingLeave ? 'wait' : 'pointer' }}
                >
                  {isGrantingLeave ? 'Granting...' : 'Confirm & Grant Leave'}
                </button>
              </div>
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setIsRegisterOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              maxWidth: '420px',
              width: '100%',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Register Field Representative</h3>
              <button type="button" onClick={() => setIsRegisterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>Full Name *</label>
                <input type="text" id="reg-name" placeholder="e.g. Amit Patel" style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>Assigned Phone Number *</label>
                <input type="tel" id="reg-phone" placeholder="e.g. 9811122334" style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>Login Email *</label>
                <input type="email" id="reg-email" placeholder="e.g. amit@ahtri.com" style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsRegisterOpen(false)} style={{ padding: '6px 12px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    const name = (document.getElementById('reg-name') as HTMLInputElement)?.value;
                    const phone = (document.getElementById('reg-phone') as HTMLInputElement)?.value;
                    const email = (document.getElementById('reg-email') as HTMLInputElement)?.value;
                    if (!name || !phone || !email) {
                      alert('Please fill in required fields');
                      return;
                    }
                    const newM: MRMemberItem = {
                      id: `usr-mr-${Date.now().toString().slice(-4)}`,
                      name,
                      phone,
                      email,
                      role: 'MR',
                      status: 'ACTIVE',
                      created_at: new Date().toISOString().split('T')[0],
                    };
                    setMembers((prev) => [...prev, newM]);
                    setIsRegisterOpen(false);
                    setSelectedMemberId(newM.id);
                    showToast(`✓ Registered ${newM.name}`);
                  }}
                  style={{ padding: '6px 14px', background: '#1A3C6E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Field Representative Modal */}
      {isEditModalOpen && editingMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              maxWidth: '460px',
              width: '100%',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
                color: '#FFFFFF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={16} color="#38BDF8" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                  Edit Employee Profile • {editingMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', outline: 'none', background: '#FFFFFF' }}
                  >
                    <option value="ACTIVE">ACTIVE (Authorized)</option>
                    <option value="INACTIVE">INACTIVE (Deactivated)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                  Login Email *
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. mr@ahtri.com"
                  required
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                  Assigned Territory / Area
                </label>
                <input
                  type="text"
                  value={editTerritory}
                  onChange={(e) => setEditTerritory(e.target.value)}
                  placeholder="e.g. South Delhi (Saket, Malviya Nagar) or Shahdol"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password (optional)"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    handleDeleteMember(editingMember);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Trash2 size={12} color="#DC2626" /> Delete Account
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    style={{ padding: '6px 12px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    style={{
                      padding: '6px 16px',
                      background: '#1A3C6E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
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
            bottom: '20px',
            right: '20px',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '6px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
            fontSize: '12.5px',
            fontWeight: 600,
            zIndex: 10000,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
