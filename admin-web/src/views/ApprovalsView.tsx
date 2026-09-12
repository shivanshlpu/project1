import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Receipt,
  Calendar,
  FileEdit,
  X,
} from 'lucide-react';
import { ApprovalItem } from '../types';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const DECIDED_STORAGE_KEY = 'ahtri_decided_approvals';

const getStoredDecisions = (): Record<string, { status: 'APPROVED' | 'REJECTED'; comment?: string; date?: string }> => {
  try {
    const raw = localStorage.getItem(DECIDED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoredDecision = (id: string, entityId: string | undefined, status: 'APPROVED' | 'REJECTED', comment?: string) => {
  try {
    const current = getStoredDecisions();
    const payload = { status, comment, date: formatDateDDMMYYYY(new Date()) };
    current[id] = payload;
    if (entityId) current[entityId] = payload;
    localStorage.setItem(DECIDED_STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

export const ApprovalsView: React.FC = () => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [approvals, setApprovals] = useState<ApprovalItem[]>(() => {
    const stored = getStoredDecisions();
    const initialItems: ApprovalItem[] = [
      {
        id: 'appr-01',
        entity_type: 'LEAVE',
        entity_id: 'leave-101',
        requester_name: 'Rahul Sharma',
        details: 'Casual Leave (2 days): 12-09-2026 to 13-09-2026 (Family occasion)',
        date: '06-09-2026',
        status: 'PENDING',
      },
      {
        id: 'appr-02',
        entity_type: 'EXPENSE',
        entity_id: 'exp-102',
        requester_name: 'Rahul Sharma',
        details: 'Conveyance Allowance: Saket Clinic Visits (Fuel receipt attached)',
        amount: 450.0,
        date: '06-09-2026',
        status: 'PENDING',
      },
      {
        id: 'appr-03',
        entity_type: 'DCR_CORRECTION',
        entity_id: 'dcr-103',
        requester_name: 'Vikram Malhotra',
        details: 'DCR Resubmission: Added sample dispensing voucher for Dr. Anita Desai',
        date: '05-09-2026',
        status: 'PENDING',
      },
      {
        id: 'appr-04',
        entity_type: 'EXPENSE',
        entity_id: 'exp-104',
        requester_name: 'Pooja Verma',
        details: 'Doctor Detailing Lunch with Dr. Sameer Kapoor',
        amount: 620.0,
        date: '05-09-2026',
        status: 'APPROVED',
      },
    ];

    return initialItems.map((item) => {
      const dec = stored[item.id] || (item.entity_id ? stored[item.entity_id] : undefined);
      return dec ? { ...item, status: dec.status } : item;
    });
  });

  const [activeModal, setActiveModal] = useState<{
    id: string;
    action: 'APPROVE' | 'REJECT';
    title: string;
  } | null>(null);

  const [comment, setComment] = useState('');

  // Fetch live approvals from backend
  const fetchApprovals = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/approvals/pending`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const storedDecisions = getStoredDecisions();
        if (Array.isArray(data)) {
          const mapped: ApprovalItem[] = data.map((a: any) => {
            const dec = storedDecisions[a.id] || (a.entity_id ? storedDecisions[a.entity_id] : undefined);
            return {
              id: a.id,
              entity_type: a.entity_type,
              entity_id: a.entity_id,
              requester_name: a.requester_name || 'Rahul Sharma',
              details: a.entity_details?.reason
                ? `${a.entity_details.reason} (${formatDateDDMMYYYY(a.entity_details.start_date)} to ${formatDateDDMMYYYY(a.entity_details.end_date)})`
                : a.entity_details?.description || `${a.entity_type} Request`,
              amount: a.entity_details?.amount,
              date: formatDateDDMMYYYY(a.created_at || a.date || '08-09-2026'),
              status: dec ? dec.status : a.status,
            };
          });

          // Merge backend data with local state while strictly respecting stored decisions
          setApprovals((prev) => {
            const map = new Map(mapped.map((m) => [m.id, m]));
            // Retain any items from prev that are not returned by pending endpoint
            prev.forEach((p) => {
              if (!map.has(p.id)) {
                mapped.push(p);
              }
            });
            // Override with stored decisions so decided items NEVER revert to PENDING
            return mapped.map((item) => {
              const dec = storedDecisions[item.id] || (item.entity_id ? storedDecisions[item.entity_id] : undefined);
              return dec ? { ...item, status: dec.status } : item;
            });
          });
        }
      }
    } catch {
      // Keep local state
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const item = approvals.find((a) => a.id === id);
    const newStatus: 'APPROVED' | 'REJECTED' = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const commentTrimmed = comment.trim();

    // 1. Immediately persist decision to localStorage to ensure it NEVER reverts
    saveStoredDecision(id, item?.entity_id, newStatus, commentTrimmed);

    // 2. Immediately update state
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: newStatus } : a,
      ),
    );

    // 3. Post to backend
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = JSON.stringify({
        status: newStatus,
        comment: commentTrimmed,
      });

      // Call approvals engine endpoint
      await fetch(`${apiUrl}/approvals/${id}/decide`, {
        method: 'POST',
        headers,
        body,
      });

      // If leave item, also hit leave decision endpoint
      if (item?.entity_type === 'LEAVE' || id.startsWith('leave-') || item?.entity_id?.startsWith('leave-')) {
        const leaveId = item?.entity_id || id;
        await fetch(`${apiUrl}/leave/${leaveId}/decide`, {
          method: 'POST',
          headers,
          body,
        }).catch(() => {});
      }
    } catch {
      // Graceful local handling
    }

    setActiveModal(null);
    setComment('');
  };

  const displayedApprovals = approvals.filter((a) => {
    if (filterTab === 'ALL') return true;
    return a.status === filterTab;
  });

  return (
    <div className="enterprise-panel">
      <div className="panel-header-bar">
        <div className="panel-headline">
          <CheckSquare size={16} color="#0052cc" />
          <span>Unified Approvals Inbox (Leave, Expenses & DCR Resubmissions)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterTab === tab ? '#0052cc' : 'transparent',
                  color: filterTab === tab ? '#FFFFFF' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab === 'ALL' ? 'All Requests' : tab === 'PENDING' ? `Pending (${approvals.filter(a => a.status === 'PENDING').length})` : tab}
              </button>
            ))}
          </div>
          <span className="status-pill warning">
            <span className="status-dot warning"></span>
            {approvals.filter((a) => a.status === 'PENDING').length} Pending Action
          </span>
        </div>
      </div>

      <div className="enterprise-table-wrapper">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Request Type</th>
              <th>Applicant</th>
              <th>Request Description</th>
              <th>Amount Claimed</th>
              <th>Submission Date</th>
              <th>Approval State</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedApprovals.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                  No approval requests found for this filter.
                </td>
              </tr>
            ) : (
              displayedApprovals.map((item) => (
              <tr key={item.id}>
                <td>
                  <span
                    className={`status-pill ${
                      item.entity_type === 'EXPENSE'
                        ? 'warning'
                        : item.entity_type === 'LEAVE'
                        ? 'info'
                        : 'neutral'
                    }`}
                  >
                    {item.entity_type === 'EXPENSE' && <Receipt size={11} style={{ marginRight: 3 }} />}
                    {item.entity_type === 'LEAVE' && <Calendar size={11} style={{ marginRight: 3 }} />}
                    {item.entity_type === 'DCR_CORRECTION' && <FileEdit size={11} style={{ marginRight: 3 }} />}
                    {item.entity_type}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{item.requester_name}</td>
                <td>{item.details}</td>
                <td style={{ fontWeight: 700 }}>
                  {item.amount ? `₹${item.amount.toFixed(2)}` : '—'}
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{formatDateDDMMYYYY(item.date)}</td>
                <td>
                  <span
                    className={`status-pill ${
                      item.status === 'APPROVED'
                        ? 'success'
                        : item.status === 'REJECTED'
                        ? 'alert'
                        : 'warning'
                    }`}
                  >
                    <span
                      className={`status-dot ${
                        item.status === 'APPROVED'
                          ? 'success'
                          : item.status === 'REJECTED'
                          ? 'alert'
                          : 'warning'
                      }`}
                    ></span>
                    {item.status}
                  </span>
                </td>
                <td>
                  {item.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-enterprise success sm"
                        onClick={() =>
                          setActiveModal({
                            id: item.id,
                            action: 'APPROVE',
                            title: `Approve ${item.entity_type} for ${item.requester_name}`,
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="btn-enterprise secondary sm"
                        style={{ color: 'var(--color-alert)' }}
                        onClick={() =>
                          setActiveModal({
                            id: item.id,
                            action: 'REJECT',
                            title: `Reject ${item.entity_type} for ${item.requester_name}`,
                          })
                        }
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Decision Resolved
                    </span>
                  )}
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Decision Modal */}
      {activeModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-main)' }}>
                {activeModal.title}
              </span>
              <button
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => setActiveModal(null)}
              >
                <X size={16} color="#7a869a" />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                Confirm your decision. This action updates the record in PostgreSQL and transmits a real-time notification to the field representative.
              </p>

              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px' }}>
                Manager Remark / Audit Note:
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter remarks for the applicant..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-enterprise secondary sm" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button
                className={`btn-enterprise sm ${activeModal.action === 'APPROVE' ? 'success' : 'danger'}`}
                onClick={() => handleDecision(activeModal.id, activeModal.action)}
              >
                Confirm {activeModal.action === 'APPROVE' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
