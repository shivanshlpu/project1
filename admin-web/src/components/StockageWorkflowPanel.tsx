import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  Package,
  Eye,
  Check,
  X,
  FileCheck,
  Send,
  Building,
} from 'lucide-react';

interface Headquarter {
  id: string;
  name: string;
  code?: string;
}

interface StockerItem {
  id: string;
  name: string;
  hq_id: string;
  hq_name: string;
}

interface MedicineItem {
  id: string;
  name: string;
  code?: string;
  product_code?: string;
  unit: string;
  pts_rate?: number;
  mrp?: number;
  base_price?: number | null;
  is_active?: boolean;
}

interface PackagingVariant {
  id: string;
  medicine_id: string;
  size: number;
  unit: string;
  display_name: string;
  pts_rate: number;
  ptr_rate?: number;
  mrp: number;
  is_active: boolean;
  created_at?: string;
}

interface MonthlyPermission {
  id: string;
  mr_id: string;
  mr_name: string;
  month_year: string;
  stocker_id?: string;
  hq_id?: string;
  status: 'AVAILABLE' | 'RESERVED' | 'CONSUMED' | 'REVOKED' | 'EXPIRED';
  granted_by_admin_name: string;
  notes?: string;
  created_at: string;
  revoked_at?: string;
  consumed_at?: string;
}

interface StockageSubmissionItem {
  id: string;
  request_id: string;
  medicine_id: string;
  medicine_name: string;
  packaging_id?: string;
  packaging_size?: string;
  packaging_unit?: string;
  submitted_quantity: number;
  approved_quantity?: number;
  previous_stock?: number;
  final_stock?: number;
  pts_rate?: number;
  mrp?: number;
  notes?: string;
}

interface StockageRequest {
  id: string;
  permission_id: string;
  mr_id: string;
  mr_name: string;
  month_year: string;
  stocker_id: string;
  hq_id: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  total_items: number;
  total_quantity: number;
  notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by_admin_name?: string;
  admin_notes?: string;
  applied_at?: string;
  items: StockageSubmissionItem[];
}

interface StockageWorkflowPanelProps {
  apiUrl: string;
  getAuthHeaders: () => Record<string, string>;
  hqs: Headquarter[];
  stockers: StockerItem[];
  medicines: MedicineItem[];
  onRefreshInventory?: () => void;
}

export const StockageWorkflowPanel: React.FC<StockageWorkflowPanelProps> = ({
  apiUrl,
  getAuthHeaders,
  hqs,
  stockers,
  medicines,
  onRefreshInventory,
}) => {
  const [subTab, setSubTab] = useState<'PERMISSIONS' | 'APPROVALS' | 'VARIANTS'>('APPROVALS');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Monthly Permissions State ---
  const [permissions, setPermissions] = useState<MonthlyPermission[]>([]);
  const [permMonthYear, setPermMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [permHqId, setPermHqId] = useState<string>('ALL');
  const [permStockerId, setPermStockerId] = useState<string>('ALL');
  const [permNotes, setPermNotes] = useState<string>('');
  const [allMrs, setAllMrs] = useState<Array<{ id: string; name: string; phone?: string; hq_id?: string }>>([]);
  const [selectedMrIds, setSelectedMrIds] = useState<string[]>([]);
  const [permStatusFilter, setPermStatusFilter] = useState<string>('ALL');

  // --- Approvals & Requests State ---
  const [requests, setRequests] = useState<StockageRequest[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<StockageRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [itemApprovedQuantities, setItemApprovedQuantities] = useState<Record<string, number>>({});
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState<boolean>(false);

  // --- Packaging Variants State ---
  const [variants, setVariants] = useState<PackagingVariant[]>([]);
  const [isAddVariantModalOpen, setIsAddVariantModalOpen] = useState<boolean>(false);
  const [newVarMedId, setNewVarMedId] = useState<string>('');
  const [newVarSize, setNewVarSize] = useState<string>('60');
  const [newVarUnit, setNewVarUnit] = useState<string>('ml');
  const [newVarPts, setNewVarPts] = useState<string>('75');
  const [newVarPtr, setNewVarPtr] = useState<string>('85');
  const [newVarMrp, setNewVarMrp] = useState<string>('110');

  // Load Initial Data
  useEffect(() => {
    fetchPermissions();
    fetchRequests();
    fetchVariants();
    fetchMrs();
  }, [permMonthYear]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const fetchMrs = async () => {
    try {
      const res = await fetch(`${apiUrl}/users?role=MR`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllMrs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Failed to fetch MR list', err);
    }
  };

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const q = permMonthYear ? `?month_year=${permMonthYear}` : '';
      const res = await fetch(`${apiUrl}/inventory/stockage/permissions${q}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load permissions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/stockage/requests`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load requests', err);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/packaging-variants`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setVariants(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load packaging variants', err);
    }
  };

  // Grant Permissions
  const handleGrantPermissions = async () => {
    if (selectedMrIds.length === 0) {
      showToast('error', 'Please select at least one Medical Representative (MR)');
      return;
    }
    if (!permMonthYear) {
      showToast('error', 'Please select a valid Month & Year');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/inventory/stockage/permissions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mr_ids: selectedMrIds,
          month_year: permMonthYear,
          hq_id: permHqId !== 'ALL' ? permHqId : undefined,
          stocker_id: permStockerId !== 'ALL' ? permStockerId : undefined,
          notes: permNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to grant permissions');
      }

      showToast('success', `Successfully granted upload permissions to ${selectedMrIds.length} MR(s) for ${permMonthYear}!`);
      setSelectedMrIds([]);
      setPermNotes('');
      await fetchPermissions();
    } catch (err: any) {
      showToast('error', err.message || 'Permission grant failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke Permission
  const handleRevokePermission = async (permId: string, mrName: string) => {
    if (!window.confirm(`Revoke upload permission for ${mrName}? This MR will no longer be authorized to submit Stockage for this month.`)) {
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/inventory/stockage/permissions/${permId}/revoke`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: 'Revoked by administrator via Web Console' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to revoke permission');
      }

      showToast('success', `Permission for ${mrName} has been revoked`);
      await fetchPermissions();
    } catch (err: any) {
      showToast('error', err.message || 'Revocation failed');
    }
  };

  // Review & Approve Request (Additive Rule)
  const handleReviewRequest = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;

    if (status === 'REJECTED' && !approvalNotes.trim()) {
      showToast('error', 'Please provide a reason / review notes for rejecting the submission');
      return;
    }

    setIsReviewing(true);
    try {
      const adjustments = Object.entries(itemApprovedQuantities).map(([item_id, approved_qty]) => ({
        item_id,
        approved_quantity: approved_qty,
      }));

      const res = await fetch(`${apiUrl}/inventory/stockage/requests/${selectedRequest.id}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          admin_notes: approvalNotes.trim() || undefined,
          item_adjustments: adjustments.length > 0 ? adjustments : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to process request review');
      }

      const result = await res.json();
      if (status === 'APPROVED') {
        showToast(
          'success',
          `Request APPROVED! Additive Stockage rule applied: approved quantities added to stock. Permission CONSUMED.`,
        );
      } else {
        showToast('success', `Request REJECTED. Official Stockage was not changed.`);
      }

      setSelectedRequest(null);
      setApprovalNotes('');
      setItemApprovedQuantities({});
      setShowRejectConfirm(false);
      await fetchRequests();
      await fetchPermissions();
      if (onRefreshInventory) onRefreshInventory();
    } catch (err: any) {
      showToast('error', err.message || 'Review failed');
    } finally {
      setIsReviewing(false);
    }
  };

  // Add Packaging Variant
  const handleAddVariant = async () => {
    if (!newVarMedId) {
      showToast('error', 'Please select a medicine');
      return;
    }
    const sizeNum = parseFloat(newVarSize);
    const ptsNum = parseFloat(newVarPts);
    const ptrNum = parseFloat(newVarPtr);
    const mrpNum = parseFloat(newVarMrp);

    if (isNaN(sizeNum) || sizeNum <= 0) {
      showToast('error', 'Valid package size is required');
      return;
    }
    if (isNaN(ptsNum) || ptsNum <= 0) {
      showToast('error', 'Authoritative PTS rate must be a positive number');
      return;
    }
    if (isNaN(mrpNum) || mrpNum < ptsNum) {
      showToast('error', 'MRP must be greater than or equal to PTS rate');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/inventory/packaging-variants`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          medicine_id: newVarMedId,
          size: sizeNum,
          unit: newVarUnit.trim(),
          pts_rate: ptsNum,
          ptr_rate: !isNaN(ptrNum) ? ptrNum : undefined,
          mrp: mrpNum,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create packaging variant');
      }

      showToast('success', 'Packaging variant created successfully');
      setIsAddVariantModalOpen(false);
      await fetchVariants();
    } catch (err: any) {
      showToast('error', err.message || 'Creation failed');
    }
  };

  // Filtering helpers
  const filteredPermissions = permissions.filter((p) => {
    if (permStatusFilter !== 'ALL' && p.status !== permStatusFilter) return false;
    return true;
  });

  const filteredRequests = requests.filter((r) => {
    if (requestStatusFilter !== 'ALL' && r.status !== requestStatusFilter) return false;
    return true;
  });

  const pendingRequestsCount = requests.filter((r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toast Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 8,
            background: statusMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1.5px solid ${statusMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: statusMessage.type === 'success' ? '#065F46' : '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: 13,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Workflow Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: 'var(--color-surface-secondary)',
          padding: 6,
          borderRadius: 8,
          border: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => setSubTab('APPROVALS')}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'APPROVALS' ? '#FFFFFF' : 'transparent',
            color: subTab === 'APPROVALS' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: subTab === 'APPROVALS' ? 'var(--shadow-xs)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FileCheck size={15} />
          <span>Stockage Reviews &amp; Approvals</span>
          {pendingRequestsCount > 0 && (
            <span
              style={{
                background: '#EA580C',
                color: '#FFFFFF',
                borderRadius: 12,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {pendingRequestsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('PERMISSIONS')}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'PERMISSIONS' ? '#FFFFFF' : 'transparent',
            color: subTab === 'PERMISSIONS' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: subTab === 'PERMISSIONS' ? 'var(--shadow-xs)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ShieldCheck size={15} />
          <span>Monthly MR Permissions</span>
          <span style={{ background: '#E2E8F0', color: '#475569', borderRadius: 12, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {permissions.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('VARIANTS')}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'VARIANTS' ? '#FFFFFF' : 'transparent',
            color: subTab === 'VARIANTS' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: subTab === 'VARIANTS' ? 'var(--shadow-xs)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Package size={15} />
          <span>Packaging Variants &amp; PTS/MRP Master</span>
          <span style={{ background: '#E2E8F0', color: '#475569', borderRadius: 12, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {variants.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: STOCKAGE APPROVALS & ADDITIVE RULE REVIEW                      */}
      {/* ========================================================================= */}
      {subTab === 'APPROVALS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Information Notice Bar regarding Additive Rule */}
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 8,
              background: '#EFF6FF',
              border: '1.5px solid #93C5FD',
              color: '#1E40AF',
              fontSize: 12.5,
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <ShieldCheck size={24} style={{ flexShrink: 0, color: '#2563EB' }} />
            <div>
              <strong>Additive Stockage Business Rule Enforced:</strong> When you approve a submission, approved quantities are strictly{' '}
              <strong>ADDED</strong> to existing stock (`New Stock = Existing Stock + Approved Qty`). Existing values are never replaced or overwritten.
              Idempotency safeguards prevent double-addition on repeated clicks.
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>FILTER REQUESTS:</span>
              {(['ALL', 'SUBMITTED', 'APPLIED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRequestStatusFilter(st)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: requestStatusFilter === st ? '1.5px solid var(--color-brand)' : '1px solid var(--color-border)',
                    background: requestStatusFilter === st ? '#EFF6FF' : '#FFFFFF',
                    color: requestStatusFilter === st ? 'var(--color-brand)' : 'var(--color-text-main)',
                    fontWeight: requestStatusFilter === st ? 700 : 500,
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  {st === 'ALL' ? 'All Requests' : st === 'SUBMITTED' ? 'Pending Review' : st === 'APPLIED' ? 'Approved & Applied' : 'Rejected'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                fetchRequests();
                fetchPermissions();
              }}
              className="btn-enterprise secondary"
              style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: '#FFFFFF',
                borderRadius: 8,
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              <FileCheck size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>No Stockage Requests Found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {requestStatusFilter === 'SUBMITTED'
                  ? 'All submitted Stockage requests have been reviewed.'
                  : 'No submissions match your active filter.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredRequests.map((req) => {
                const isPending = req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW';
                const isSelected = selectedRequest?.id === req.id;

                return (
                  <div
                    key={req.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 8,
                      border: isPending ? '2px solid #F59E0B' : '1px solid var(--color-border)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '12px 18px',
                        background: isPending ? '#FFFBEB' : '#F8FAFC',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isPending ? '#FEF3C7' : '#E2E8F0',
                            color: isPending ? '#D97706' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 14,
                          }}
                        >
                          {req.mr_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-primary)' }}>
                            {req.mr_name}
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginLeft: 8 }}>
                              Month: <strong>{req.month_year}</strong>
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                            Stocker: <strong>{req.stocker_id}</strong> &bull; Total Items: <strong>{req.total_items}</strong> &bull; Total Units: <strong>{req.total_quantity}</strong> &bull; Submitted: {new Date(req.submitted_at).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 12,
                            fontSize: 11.5,
                            fontWeight: 800,
                            background:
                              req.status === 'APPLIED'
                                ? '#DCFCE7'
                                : req.status === 'REJECTED'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                            color:
                              req.status === 'APPLIED'
                                ? '#166534'
                                : req.status === 'REJECTED'
                                ? '#991B1B'
                                : '#B45309',
                          }}
                        >
                          {req.status === 'APPLIED' ? 'APPLIED (APPROVED)' : req.status}
                        </span>

                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedRequest(null);
                            } else {
                              setSelectedRequest(req);
                              // Initialize approved quantities with submitted quantities
                              const initQty: Record<string, number> = {};
                              req.items.forEach((it) => {
                                initQty[it.id] = it.approved_quantity != null ? it.approved_quantity : it.submitted_quantity;
                              });
                              setItemApprovedQuantities(initQty);
                            }
                          }}
                          className="btn-enterprise secondary"
                          style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          <Eye size={13} />
                          <span>{isSelected ? 'Hide Details' : 'Inspect & Review'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Review & Inspection Panel */}
                    {isSelected && (
                      <div style={{ padding: '16px 18px', background: '#FFFFFF' }}>
                        {/* Note from MR if any */}
                        {req.notes && (
                          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#F1F5F9', borderRadius: 6, fontSize: 12, color: '#334155' }}>
                            <strong>MR Notes:</strong> {req.notes}
                          </div>
                        )}

                        {/* Items Table */}
                        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 12.5 }}>
                            <thead>
                              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid var(--color-border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Medicine Name</th>
                                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Packaging Variant</th>
                                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Submitted Qty</th>
                                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Current Stock</th>
                                <th style={{ padding: '8px 10px', color: '#0F8B5A', fontWeight: 800, textAlign: 'center' }}>
                                  Approved Qty {isPending ? '(Adjustable)' : ''}
                                </th>
                                <th style={{ padding: '8px 10px', color: '#1E40AF', fontWeight: 800, textAlign: 'right' }}>
                                  Resulting Stock (Additive Rule)
                                </th>
                                <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700, textAlign: 'right' }}>PTS Rate (₹)</th>
                                <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700, textAlign: 'right' }}>MRP (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {req.items.map((item) => {
                                const currentApproved = itemApprovedQuantities[item.id] !== undefined ? itemApprovedQuantities[item.id] : item.submitted_quantity;
                                const currentStock = item.previous_stock ?? 0;
                                const calculatedNewStock = currentStock + (Number(currentApproved) || 0);

                                return (
                                  <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                    <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--color-primary)' }}>
                                      💊 {item.medicine_name}
                                    </td>
                                    <td style={{ padding: '10px 10px', color: '#334155' }}>
                                      <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                                        {item.packaging_size || 'Standard'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                                      {item.submitted_quantity}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748B', fontWeight: 600 }}>
                                      {item.previous_stock != null ? `${item.previous_stock} units` : '—'}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                      {isPending ? (
                                        <input
                                          type="number"
                                          min="0"
                                          value={currentApproved}
                                          onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                            setItemApprovedQuantities((prev) => ({ ...prev, [item.id]: val }));
                                          }}
                                          style={{
                                            width: 80,
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            border: '1.5px solid #0F8B5A',
                                            fontWeight: 800,
                                            color: '#065F46',
                                            textAlign: 'center',
                                            fontSize: 13,
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontWeight: 800, color: '#166534' }}>
                                          {item.approved_quantity ?? item.submitted_quantity}
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                                      <span
                                        style={{
                                          background: '#EFF6FF',
                                          color: '#1E40AF',
                                          padding: '3px 8px',
                                          borderRadius: 4,
                                          fontWeight: 800,
                                          fontSize: 12,
                                          display: 'inline-block',
                                        }}
                                      >
                                        {req.status === 'APPLIED' ? `${item.final_stock} units` : `${currentStock} + ${currentApproved} = ${calculatedNewStock} units`}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                                      ₹{Number(item.pts_rate || 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748B' }}>
                                      ₹{Number(item.mrp || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* If already reviewed, display admin notes */}
                        {req.admin_notes && (
                          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 6, fontSize: 12 }}>
                            <strong>Reviewer Feedback:</strong> {req.admin_notes}
                            {req.reviewed_by_admin_name && (
                              <span style={{ color: '#64748B', marginLeft: 8 }}>
                                &mdash; by {req.reviewed_by_admin_name} on {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : ''}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Review Action Controls for Pending Submissions */}
                        {isPending && (
                          <div
                            style={{
                              borderTop: '1px solid var(--color-border)',
                              paddingTop: 16,
                              marginTop: 12,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                            }}
                          >
                            <div>
                              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                                ADMIN REVIEW NOTES / COMMENTS (Required for Rejection)
                              </label>
                              <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                placeholder="Enter verification notes, Stocker confirmation code, or reasons for any quantity adjustment..."
                                rows={2}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  border: '1px solid var(--color-border)',
                                  fontSize: 12.5,
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                              <button
                                type="button"
                                disabled={isReviewing}
                                onClick={() => setShowRejectConfirm(true)}
                                style={{
                                  padding: '8px 18px',
                                  borderRadius: 6,
                                  border: '1.5px solid #EF4444',
                                  background: '#FEF2F2',
                                  color: '#DC2626',
                                  fontWeight: 700,
                                  fontSize: 12.5,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <XCircle size={15} />
                                <span>Reject Submission</span>
                              </button>

                              <button
                                type="button"
                                disabled={isReviewing}
                                onClick={() => handleReviewRequest('APPROVED')}
                                style={{
                                  padding: '8px 22px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                  color: '#FFFFFF',
                                  fontWeight: 800,
                                  fontSize: 12.5,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                                }}
                              >
                                <CheckCircle size={15} />
                                <span>{isReviewing ? 'Applying...' : 'Approve & Add to Stockage'}</span>
                              </button>
                            </div>

                            {/* Rejection confirmation popup */}
                            {showRejectConfirm && (
                              <div
                                style={{
                                  marginTop: 8,
                                  padding: '12px 16px',
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: 6,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 600 }}>
                                  Confirm rejection? The submission and reason will be archived. The MR will be notified and cannot resubmit without an explicit permission.
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => setShowRejectConfirm(false)}
                                    style={{ padding: '4px 10px', fontSize: 11, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 4 }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleReviewRequest('REJECTED')}
                                    style={{ padding: '4px 12px', fontSize: 11, background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: 4, fontWeight: 700 }}
                                  >
                                    Confirm Reject
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: MONTHLY MR UPLOAD PERMISSIONS                                  */}
      {/* ========================================================================= */}
      {subTab === 'PERMISSIONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Grant Permission Card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <ShieldCheck size={20} color="var(--color-brand)" />
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
                  Grant Monthly Stockage Upload Permission
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748B' }}>
                  Rule: Exactly one active permission allows one single Stockage submission per MR for the authorized month.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  1. SELECT MONTH &amp; YEAR
                </label>
                <input
                  type="month"
                  value={permMonthYear}
                  onChange={(e) => setPermMonthYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid var(--color-brand)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  2. SCOPE: HEADQUARTER (OPTIONAL)
                </label>
                <select
                  value={permHqId}
                  onChange={(e) => setPermHqId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                >
                  <option value="ALL">All Headquarters</option>
                  {hqs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  3. SCOPE: STOCKER (OPTIONAL)
                </label>
                <select
                  value={permStockerId}
                  onChange={(e) => setPermStockerId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                >
                  <option value="ALL">All Associated Stockers</option>
                  {stockers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.hq_name || s.hq_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select MRs Multi-Select */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>
                  4. SELECT MEDICAL REPRESENTATIVE(S) ({selectedMrIds.length} SELECTED)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedMrIds(allMrs.map((m) => m.id))}
                    style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-brand)', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMrIds([])}
                    style={{ background: 'none', border: 'none', fontSize: 11, color: '#64748B', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              <div
                style={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: 8,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  background: '#F8FAFC',
                }}
              >
                {allMrs.length === 0 ? (
                  <span style={{ fontSize: 12, color: '#94A3B8', padding: 4 }}>No active MRs registered in system.</span>
                ) : (
                  allMrs.map((mr) => {
                    const isChecked = selectedMrIds.includes(mr.id);
                    return (
                      <button
                        key={mr.id}
                        type="button"
                        onClick={() => {
                          setSelectedMrIds((prev) => (isChecked ? prev.filter((id) => id !== mr.id) : [...prev, mr.id]));
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: isChecked ? '1.5px solid var(--color-brand)' : '1px solid var(--color-border)',
                          background: isChecked ? '#EFF6FF' : '#FFFFFF',
                          color: isChecked ? 'var(--color-brand)' : 'var(--color-text-main)',
                          fontSize: 12,
                          fontWeight: isChecked ? 700 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {isChecked ? <Check size={12} /> : null}
                        <span>{mr.name}</span>
                        {mr.phone && <span style={{ fontSize: 10, color: '#94A3B8' }}>({mr.phone})</span>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                5. ADMIN NOTES (AUDIT TRAIL)
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="e.g. Authorized after monthly telephonic alignment with MR..."
                  value={permNotes}
                  onChange={(e) => setPermNotes(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                />
                <button
                  type="button"
                  disabled={isLoading || selectedMrIds.length === 0}
                  onClick={handleGrantPermissions}
                  className="btn-enterprise"
                  style={{
                    padding: '8px 20px',
                    fontSize: 12.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--color-brand)',
                    color: '#FFFFFF',
                  }}
                >
                  <Send size={14} />
                  <span>Grant Permission</span>
                </button>
              </div>
            </div>
          </div>

          {/* Granted Permissions Table */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                background: 'var(--color-surface-secondary)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                  Active &amp; Historical Permissions ({filteredPermissions.length})
                </span>
                <select
                  value={permStatusFilter}
                  onChange={(e) => setPermStatusFilter(e.target.value)}
                  style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid var(--color-border)', fontSize: 11.5 }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available Only</option>
                  <option value="RESERVED">Reserved (Under Review)</option>
                  <option value="CONSUMED">Consumed (Applied)</option>
                  <option value="REVOKED">Revoked</option>
                </select>
              </div>

              <button
                type="button"
                onClick={fetchPermissions}
                className="btn-enterprise secondary"
                style={{ padding: '4px 10px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={12} />
                <span>Refresh</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>MR Name</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Authorized Month</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Scope</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Permission Status</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Granted By</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px 14px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                        No permissions recorded for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPermissions.map((perm) => {
                      const isAvailable = perm.status === 'AVAILABLE';

                      return (
                        <tr key={perm.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            👤 {perm.mr_name}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A' }}>
                            {perm.month_year}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569', fontSize: 12 }}>
                            {perm.hq_id || perm.stocker_id ? (
                              <span>
                                {perm.hq_id ? `HQ: ${perm.hq_id}` : ''} {perm.stocker_id ? `Stocker: ${perm.stocker_id}` : ''}
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>All Assigned Scope</span>
                            )}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 800,
                                background:
                                  perm.status === 'AVAILABLE'
                                    ? '#DCFCE7'
                                    : perm.status === 'RESERVED'
                                    ? '#FEF3C7'
                                    : perm.status === 'CONSUMED'
                                    ? '#DBEAFE'
                                    : '#F1F5F9',
                                color:
                                  perm.status === 'AVAILABLE'
                                    ? '#166534'
                                    : perm.status === 'RESERVED'
                                    ? '#B45309'
                                    : perm.status === 'CONSUMED'
                                    ? '#1D4ED8'
                                    : '#64748B',
                              }}
                            >
                              {perm.status === 'AVAILABLE'
                                ? 'AVAILABLE (Ready)'
                                : perm.status === 'RESERVED'
                                ? 'RESERVED (Under Review)'
                                : perm.status === 'CONSUMED'
                                ? 'CONSUMED (Applied)'
                                : perm.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#64748B', fontSize: 12 }}>
                            {perm.granted_by_admin_name || 'Admin'}
                            <div style={{ fontSize: 10.5, color: '#94A3B8' }}>
                              {new Date(perm.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            {isAvailable ? (
                              <button
                                type="button"
                                onClick={() => handleRevokePermission(perm.id, perm.mr_name)}
                                style={{
                                  background: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  padding: '4px 10px',
                                  borderRadius: 4,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Revoke
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                                {perm.status === 'CONSUMED' ? 'Applied' : 'Locked'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PACKAGING VARIANTS & PTS/MRP MANAGEMENT                        */}
      {/* ========================================================================= */}
      {subTab === 'VARIANTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
                Medicine Packaging Variants, PTS Rate &amp; MRP Master
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#64748B' }}>
                Manage packaging options (e.g. 30ml, 60ml, 200ml, 30gm, 10*10), assign PTS and MRP. MR order amounts strictly use PTS: `Order Amount = Qty &times; PTS`.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (medicines.length > 0 && !newVarMedId) {
                  setNewVarMedId(medicines[0].id);
                }
                setIsAddVariantModalOpen(true);
              }}
              className="btn-enterprise"
              style={{
                padding: '6px 14px',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--color-brand)',
                color: '#FFFFFF',
              }}
            >
              <Plus size={14} />
              <span>Add Packaging Variant</span>
            </button>
          </div>

          {/* Variants Table */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Medicine</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Package Variant</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Size &amp; Unit</th>
                    <th style={{ padding: '10px 14px', color: '#047857', fontWeight: 800, textAlign: 'right' }}>Authoritative PTS (₹)</th>
                    <th style={{ padding: '10px 14px', color: '#2563EB', fontWeight: 700, textAlign: 'right' }}>PTR Rate (₹)</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>MRP (₹)</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px 14px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                        No packaging variants configured yet.
                      </td>
                    </tr>
                  ) : (
                    variants.map((v) => {
                      const med = medicines.find((m) => m.id === v.medicine_id);
                      return (
                        <tr key={v.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            💊 {med?.name || v.medicine_id}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 600, color: '#0F172A' }}>
                            {v.display_name}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {v.size} {v.unit}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 800, color: '#047857' }}>
                            ₹{Number(v.pts_rate).toFixed(2)}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>
                            {v.ptr_rate != null ? `₹${Number(v.ptr_rate).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#64748B' }}>
                            ₹{Number(v.mrp).toFixed(2)}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                background: v.is_active ? '#DCFCE7' : '#FEE2E2',
                                color: v.is_active ? '#166534' : '#991B1B',
                              }}
                            >
                              {v.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal to Add Variant */}
          {isAddVariantModalOpen && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  maxWidth: 480,
                  width: '100%',
                  padding: 24,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--color-primary)' }}>
                    Add Medicine Packaging Variant
                  </h3>
                  <button
                    onClick={() => setIsAddVariantModalOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      SELECT MEDICINE
                    </label>
                    <select
                      value={newVarMedId}
                      onChange={(e) => setNewVarMedId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                    >
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.product_code || m.code || m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        PACKAGING SIZE (NUMBER)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 60 or 200"
                        value={newVarSize}
                        onChange={(e) => setNewVarSize(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        UNIT (ml / gm / strips / tabs)
                      </label>
                      <input
                        type="text"
                        placeholder="ml, gm, etc."
                        value={newVarUnit}
                        onChange={(e) => setNewVarUnit(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#047857', display: 'block', marginBottom: 4 }}>
                        PTS RATE (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 75.00"
                        value={newVarPts}
                        onChange={(e) => setNewVarPts(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1.5px solid #059669', fontSize: 13, fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#2563EB', display: 'block', marginBottom: 4 }}>
                        PTR RATE (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 85.00"
                        value={newVarPtr}
                        onChange={(e) => setNewVarPtr(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1.5px solid #3B82F6', fontSize: 13, fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        MRP (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 110.00"
                        value={newVarMrp}
                        onChange={(e) => setNewVarMrp(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setIsAddVariantModalOpen(false)}
                      style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#FFFFFF', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: 'var(--color-brand)', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Save Packaging Variant
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
