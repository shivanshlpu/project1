import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  IndianRupee,
  Building,
  Package,
  Award,
  Filter,
  Check,
  X,
  FileCheck,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface CompetitionItem {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  hq_id: string;
  hq_name: string;
  medicine_id: string;
  medicine_name: string;
  target_quantity: number;
  reward_amount: number;
  description: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  participants?: MrProgressItem[];
  total_sales_all_mrs?: number;
  eligible_mrs_count?: number;
  claims_count?: number;
}

interface MrProgressItem {
  mr_id: string;
  mr_name: string;
  hq_id: string;
  hq_name: string;
  achieved_quantity: number;
  target_quantity: number;
  remaining_quantity: number;
  is_eligible: boolean;
  claim_status: 'IN_PROGRESS' | 'ELIGIBLE' | 'APPLIED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  claim_id?: string | null;
  supporting_orders_count: number;
}

interface RewardClaimItem {
  id: string;
  competition_id: string;
  competition_name?: string;
  mr_id: string;
  mr_name?: string;
  hq_name?: string;
  medicine_name?: string;
  achieved_quantity: number;
  target_quantity?: number;
  reward_amount: number;
  status: 'APPLIED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  claim_date: string;
  supporting_orders_count: number;
  notes?: string;
}

export const CompetitionsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'CLAIMS'>('CAMPAIGNS');
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [mrProgressList, setMrProgressList] = useState<MrProgressItem[]>([]);
  const [claims, setClaims] = useState<RewardClaimItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Master options
  const [hqs, setHqs] = useState<Array<{ id: string; name: string }>>([]);
  const [medicines, setMedicines] = useState<Array<{ id: string; name: string }>>([]);

  // Create Modal state (§27)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [compName, setCompName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-30');
  const [compHqId, setCompHqId] = useState<string>('hq-shahdol');
  const [compMedicineId, setCompMedicineId] = useState<string>('');
  const [compTargetQty, setCompTargetQty] = useState<string>('100');
  const [compRewardAmount, setCompRewardAmount] = useState<string>('2000');
  const [compDesc, setCompDesc] = useState<string>('Sell 100 units during competition period to claim ₹2,000 cash reward.');

  // Edit Modal state (§27)
  const [editingComp, setEditingComp] = useState<CompetitionItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editCompName, setEditCompName] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editCompHqId, setEditCompHqId] = useState<string>('');
  const [editCompMedicineId, setEditCompMedicineId] = useState<string>('');
  const [editCompTargetQty, setEditCompTargetQty] = useState<string>('100');
  const [editCompRewardAmount, setEditCompRewardAmount] = useState<string>('2000');
  const [editCompDesc, setEditCompDesc] = useState<string>('');
  const [editCompStatus, setEditCompStatus] = useState<'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');

  const handleOpenEditModal = (comp: CompetitionItem) => {
    setEditingComp(comp);
    setEditCompName(comp.name);
    setEditStartDate(comp.start_date ? comp.start_date.split('T')[0] : '2026-09-01');
    setEditEndDate(comp.end_date ? comp.end_date.split('T')[0] : '2026-09-30');
    setEditCompHqId(comp.hq_id || 'hq-shahdol');
    setEditCompMedicineId(comp.medicine_id || '');
    setEditCompTargetQty(String(comp.target_quantity || 100));
    setEditCompRewardAmount(String(comp.reward_amount || 2000));
    setEditCompDesc(comp.description || '');
    setEditCompStatus(comp.status || 'ACTIVE');
    setIsEditModalOpen(true);
  };

  const handleUpdateCompetition = async () => {
    if (!editingComp || !editCompName.trim()) {
      alert('Please enter competition name.');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/competitions/${editingComp.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editCompName.trim(),
          start_date: editStartDate,
          end_date: editEndDate,
          hq_id: editCompHqId,
          medicine_id: editCompMedicineId,
          target_quantity: parseInt(editCompTargetQty) || 100,
          reward_amount: parseFloat(editCompRewardAmount) || 2000,
          description: editCompDesc.trim(),
          status: editCompStatus,
        }),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingComp(null);
        fetchCompetitions();
      } else {
        alert('Failed to update competition.');
      }
    } catch (err) {
      console.error('Update competition error:', err);
      alert('Error updating competition.');
    }
  };

  const handleDeleteCompetition = async (comp: CompetitionItem) => {
    if (!window.confirm(`Are you sure you want to delete the competition "${comp.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/competitions/${comp.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCompetitions((prev) => prev.filter((c) => c.id !== comp.id));
        if (selectedCompId === comp.id) {
          setSelectedCompId('');
          setMrProgressList([]);
        }
        fetchCompetitions();
      } else {
        alert('Failed to delete competition.');
      }
    } catch (err) {
      console.error('Delete competition error:', err);
      alert('Error deleting competition.');
    }
  };

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Load HQs & Medicines master
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [hqRes, medRes] = await Promise.all([
          fetch(`${apiUrl}/inventory/hqs`, { headers: getAuthHeaders() }),
          fetch(`${apiUrl}/inventory/medicines?active_only=true`, { headers: getAuthHeaders() }),
        ]);
        if (hqRes.ok) {
          const data = await hqRes.json();
          if (Array.isArray(data)) setHqs(data);
        }
        if (medRes.ok) {
          const data = await medRes.json();
          if (Array.isArray(data)) {
            setMedicines(data);
            if (data.length > 0) setCompMedicineId(data[0].id);
          }
        }
      } catch {}
    };
    fetchMaster();
  }, [apiUrl]);

  // Fetch Competitions list (§27)
  const fetchCompetitions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/competitions/admin`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCompetitions(data);
          const activeId = selectedCompId || (data.length > 0 ? data[0].id : '');
          if (activeId) {
            setSelectedCompId(activeId);
            const found = data.find((c: any) => c.id === activeId);
            if (found && found.participants) {
              setMrProgressList(found.participants);
            }
          }
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  // Fetch MR progress for selected competition (§34)
  const fetchProgress = async () => {
    if (!selectedCompId) return;
    const found = competitions.find((c: any) => c.id === selectedCompId);
    if (found && found.participants) {
      setMrProgressList(found.participants);
    }
  };

  // Fetch all claims (§33 & §34)
  const fetchClaims = async () => {
    try {
      const res = await fetch(`${apiUrl}/competitions/claims`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setClaims(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchCompetitions();
    fetchClaims();
  }, [apiUrl]);

  useEffect(() => {
    if (selectedCompId && competitions.length > 0) {
      fetchProgress();
    }
  }, [selectedCompId, competitions]);

  // Handler: Create Competition (§27)
  const handleCreateCompetition = async () => {
    if (!compName.trim()) {
      alert('Please enter competition name.');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/competitions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: compName.trim(),
          start_date: startDate,
          end_date: endDate,
          hq_id: compHqId,
          medicine_id: compMedicineId,
          target_quantity: parseInt(compTargetQty) || 100,
          reward_amount: parseFloat(compRewardAmount) || 2000,
          description: compDesc.trim(),
        }),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setCompName('');
        fetchCompetitions();
      }
    } catch {}
  };

  // Handler: Decide Claim (Approve / Reject / Mark Paid) (§33 & §34)
  const handleDecideClaim = async (claimId: string, status: 'APPROVED' | 'REJECTED' | 'PAID') => {
    try {
      const res = await fetch(`${apiUrl}/competitions/claims/${claimId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          comment: `Decision recorded by Admin on ${formatDateDDMMYYYY(new Date())}`,
        }),
      });
      if (res.ok) {
        fetchClaims();
        fetchCompetitions();
      }
    } catch {}
  };

  const selectedComp = competitions.find((c) => c.id === selectedCompId);

  return (
    <div style={{ padding: '16px 14px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 260, flex: '1 1 280px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={20} color="var(--color-brand)" style={{ flexShrink: 0 }} />
            <span>MR Sales Competitions &amp; Incentive Rewards</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Configure sales target campaigns, track live orders (single source of truth), and review cash reward claims.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn-enterprise"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <Plus size={14} />
            <span>Create Competition</span>
          </button>

          <button
            className="btn-enterprise secondary"
            onClick={() => {
              fetchCompetitions();
              fetchProgress();
              fetchClaims();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Segment Tabs - Swipeable on mobile */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--color-surface-secondary)',
          padding: 4,
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid var(--color-border)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          flexWrap: 'nowrap',
        }}
      >
        <button
          onClick={() => setActiveTab('CAMPAIGNS')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'CAMPAIGNS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'CAMPAIGNS' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'CAMPAIGNS' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Trophy size={14} />
          <span>Active Competitions &amp; MR Progress</span>
        </button>

        <button
          onClick={() => setActiveTab('CLAIMS')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'CLAIMS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'CLAIMS' ? '#166534' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'CLAIMS' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Award size={14} color="#166534" />
          <span>Reward Claims ({claims.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: CAMPAIGNS & LIVE PROGRESS ================= */}
      {activeTab === 'CAMPAIGNS' && (
        <>
          {/* Active Campaigns Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 20 }}>
            {competitions.map((comp) => {
              const isSelected = selectedCompId === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    padding: 16,
                    border: isSelected ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        HQ: {comp.hq_name}
                      </span>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                        {comp.name}
                      </h3>
                    </div>
                    <span
                      style={{
                        background: '#DCFCE7',
                        color: '#166534',
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      ₹{comp.reward_amount.toLocaleString()} Reward
                    </span>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 11.5 }}>
                    <p style={{ color: '#334155' }}>
                      Target: <strong>{comp.target_quantity} units</strong> of <strong>{comp.medicine_name}</strong>
                    </p>
                    <p style={{ color: '#64748B', marginTop: 2 }}>
                      Period: {formatDateDDMMYYYY(comp.start_date)} to {formatDateDDMMYYYY(comp.end_date)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(comp);
                        }}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#1E293B',
                        }}
                        title="Edit Competition Details"
                      >
                        <Edit2 size={12} color="#0052cc" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompetition(comp);
                        }}
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#DC2626',
                        }}
                        title="Delete Competition"
                      >
                        <Trash2 size={12} color="#DC2626" />
                        <span>Delete</span>
                      </button>
                    </div>

                    <span
                      style={{
                        background: comp.status === 'ACTIVE' ? '#EFF6FF' : '#F1F5F9',
                        color: comp.status === 'ACTIVE' ? '#1D4ED8' : '#64748B',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {comp.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Participating MR Progress Table (§34) */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                  Participating MR Progress for "{selectedComp?.name || 'Selected Campaign'}"
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                  Single source of truth: calculated directly from valid, completed orders in database
                </span>
              </div>
            </div>

            {mrProgressList.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No MR progress recorded for this competition yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Medical Representative</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>HQ Territory</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Target</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Achieved Sales (Valid Orders)</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Remaining to Goal</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Progress %</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Eligibility Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Reward Claim Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mrProgressList.map((prog) => {
                      const percent = Math.min(100, Math.round((prog.achieved_quantity / prog.target_quantity) * 100));

                      return (
                        <tr key={prog.mr_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A' }}>
                            {prog.mr_name}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#1E40AF', fontWeight: 600 }}>
                            {prog.hq_name}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 600 }}>
                            {prog.target_quantity} units
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 800, color: '#166534' }}>
                            {prog.achieved_quantity} units
                            <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 400, marginLeft: 4 }}>
                              ({prog.supporting_orders_count} orders)
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: prog.remaining_quantity === 0 ? '#166534' : '#B45309' }}>
                            {prog.remaining_quantity === 0 ? '✓ Goal Achieved' : `${prog.remaining_quantity} units`}
                          </td>
                          <td style={{ padding: '11px 14px', width: 140 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${percent}%`, height: '100%', background: percent >= 100 ? '#10B981' : 'var(--color-brand)' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700 }}>{percent}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                background: prog.is_eligible ? '#DCFCE7' : '#F1F5F9',
                                color: prog.is_eligible ? '#166534' : '#64748B',
                              }}
                            >
                              {prog.is_eligible ? '🏆 Eligible for Reward' : 'In Progress'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  prog.claim_status === 'APPROVED' || prog.claim_status === 'PAID'
                                    ? '#DCFCE7'
                                    : prog.claim_status === 'APPLIED'
                                    ? '#FEF3C7'
                                    : '#F8FAFC',
                                color:
                                  prog.claim_status === 'APPROVED' || prog.claim_status === 'PAID'
                                    ? '#166534'
                                    : prog.claim_status === 'APPLIED'
                                    ? '#92400E'
                                    : '#64748B',
                              }}
                            >
                              {prog.claim_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= TAB 2: REWARD CLAIMS WORKFLOW (§33 & §34) ================= */}
      {activeTab === 'CLAIMS' && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                MR Incentive Reward Claims Queue
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                Verify underlying orders before approving reward payout
              </span>
            </div>
          </div>

          {claims.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Award size={36} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                No Reward Claims Pending
              </p>
              <p style={{ fontSize: 12, color: '#64748B' }}>
                When an MR hits their sales target and claims their incentive, it will appear here for verification.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Claim Date</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Representative</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Competition</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Achieved Sales</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Reward Amount</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Verification Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((cl) => (
                    <tr key={cl.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {formatDateDDMMYYYY(cl.claim_date)}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {cl.mr_name}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--color-brand)' }}>
                        {cl.competition_name}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#166534' }}>
                        {cl.achieved_quantity} units
                        <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 400, marginLeft: 4 }}>
                          ({cl.supporting_orders_count} valid orders)
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#0F172A' }}>
                        ₹{cl.reward_amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              cl.status === 'PAID'
                                ? '#DCFCE7'
                                : cl.status === 'APPROVED'
                                ? '#EFF6FF'
                                : cl.status === 'REJECTED'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                            color:
                              cl.status === 'PAID'
                                ? '#166534'
                                : cl.status === 'APPROVED'
                                ? '#1D4ED8'
                                : cl.status === 'REJECTED'
                                ? '#991B1B'
                                : '#92400E',
                          }}
                        >
                          {cl.status}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        {cl.status === 'APPLIED' || cl.status === 'UNDER_REVIEW' ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleDecideClaim(cl.id, 'APPROVED')}
                              style={{
                                background: '#ECFDF5',
                                color: '#065F46',
                                border: '1px solid #A7F3D0',
                                padding: '4px 10px',
                                borderRadius: 4,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleDecideClaim(cl.id, 'REJECTED')}
                              style={{
                                background: '#FEF2F2',
                                color: '#991B1B',
                                border: '1px solid #FECDD3',
                                padding: '4px 10px',
                                borderRadius: 4,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : cl.status === 'APPROVED' ? (
                          <button
                            onClick={() => handleDecideClaim(cl.id, 'PAID')}
                            style={{
                              background: '#166534',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Mark Paid ₹{cl.reward_amount.toLocaleString()}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>Concluded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Create New Competition (§27) */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 22,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trophy size={18} color="var(--color-brand)" />
                Create Sales Incentive Competition
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                COMPETITION / CAMPAIGN NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Shahdol CardioFix-50 Festive Sprint"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  START DATE
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  END DATE
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  TARGET HEADQUARTERS (HQ)
                </label>
                <select
                  value={compHqId}
                  onChange={(e) => setCompHqId(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5, background: '#FFFFFF' }}
                >
                  {hqs.map((hq) => (
                    <option key={hq.id} value={hq.id}>{hq.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  TARGET MEDICINE / PRODUCT
                </label>
                <select
                  value={compMedicineId}
                  onChange={(e) => setCompMedicineId(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5, background: '#FFFFFF' }}
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  TARGET QUANTITY (UNITS) *
                </label>
                <input
                  type="number"
                  value={compTargetQty}
                  onChange={(e) => setCompTargetQty(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  REWARD AMOUNT (₹) *
                </label>
                <input
                  type="number"
                  value={compRewardAmount}
                  onChange={(e) => setCompRewardAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5, fontWeight: 700, color: '#166534' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                TERMS &amp; ELIGIBILITY DESCRIPTION
              </label>
              <textarea
                value={compDesc}
                onChange={(e) => setCompDesc(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-enterprise"
                onClick={handleCreateCompetition}
              >
                Launch Competition
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Edit Competition */}
      {isEditModalOpen && editingComp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 22,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit2 size={18} color="var(--color-brand)" />
                Edit Incentive Competition
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingComp(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                COMPETITION / CAMPAIGN NAME *
              </label>
              <input
                type="text"
                value={editCompName}
                onChange={(e) => setEditCompName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  START DATE
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  END DATE
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  TARGET HEADQUARTERS (HQ)
                </label>
                <select
                  value={editCompHqId}
                  onChange={(e) => setEditCompHqId(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5, background: '#FFFFFF' }}
                >
                  {hqs.map((hq) => (
                    <option key={hq.id} value={hq.id}>
                      {hq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  TARGET MEDICINE
                </label>
                <select
                  value={editCompMedicineId}
                  onChange={(e) => setEditCompMedicineId(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5, background: '#FFFFFF' }}
                >
                  <option value="">-- All Products in HQ --</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  TARGET QUANTITY (UNITS)
                </label>
                <input
                  type="number"
                  value={editCompTargetQty}
                  onChange={(e) => setEditCompTargetQty(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  REWARD AMOUNT (₹)
                </label>
                <input
                  type="number"
                  value={editCompRewardAmount}
                  onChange={(e) => setEditCompRewardAmount(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                CAMPAIGN STATUS
              </label>
              <select
                value={editCompStatus}
                onChange={(e) => setEditCompStatus(e.target.value as any)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5, background: '#FFFFFF' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                COMPETITION DESCRIPTION / INSTRUCTIONS
              </label>
              <textarea
                value={editCompDesc}
                onChange={(e) => setEditCompDesc(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingComp(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-enterprise"
                onClick={handleUpdateCompetition}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
