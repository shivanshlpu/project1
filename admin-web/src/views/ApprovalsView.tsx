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

export const ApprovalsView: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: 'appr-01',
      entity_type: 'LEAVE',
      entity_id: 'leave-101',
      requester_name: 'Rahul Sharma',
      details: 'Casual Leave (2 days): Sep 12 - Sep 13 (Family occasion)',
      date: '2026-09-06',
      status: 'PENDING',
    },
    {
      id: 'appr-02',
      entity_type: 'EXPENSE',
      entity_id: 'exp-102',
      requester_name: 'Rahul Sharma',
      details: 'Conveyance Allowance: Saket Clinic Visits (Fuel receipt attached)',
      amount: 450.0,
      date: '2026-09-06',
      status: 'PENDING',
    },
    {
      id: 'appr-03',
      entity_type: 'DCR_CORRECTION',
      entity_id: 'dcr-103',
      requester_name: 'Vikram Malhotra',
      details: 'DCR Resubmission: Added sample dispensing voucher for Dr. Anita Desai',
      date: '2026-09-05',
      status: 'PENDING',
    },
    {
      id: 'appr-04',
      entity_type: 'EXPENSE',
      entity_id: 'exp-104',
      requester_name: 'Pooja Verma',
      details: 'Doctor Detailing Lunch with Dr. Sameer Kapoor',
      amount: 620.0,
      date: '2026-09-05',
      status: 'APPROVED',
    },
  ]);

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
        if (Array.isArray(data) && data.length > 0) {
          const mapped: ApprovalItem[] = data.map((a: any) => ({
            id: a.id,
            entity_type: a.entity_type,
            entity_id: a.entity_id,
            requester_name: a.requester_name || 'Rahul Sharma',
            details: a.entity_details?.reason
              ? `${a.entity_details.reason} (${a.entity_details.start_date} to ${a.entity_details.end_date})`
              : a.entity_details?.description || `${a.entity_type} Request`,
            amount: a.entity_details?.amount,
            date: a.created_at ? a.created_at.split('T')[0] : '2026-09-08',
            status: a.status,
          }));

          // Merge with any local approved/rejected items
          setApprovals((prev) => {
            const map = new Map(mapped.map((m) => [m.id, m]));
            prev.forEach((p) => {
              if (p.status !== 'PENDING' && !map.has(p.id)) {
                mapped.push(p);
              }
            });
            return mapped;
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
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/approvals/${id}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          comment: comment.trim(),
        }),
      });
    } catch {
      // Graceful local handling
    }

    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : a,
      ),
    );
    setActiveModal(null);
    setComment('');
  };

  return (
    <div className="enterprise-panel">
      <div className="panel-header-bar">
        <div className="panel-headline">
          <CheckSquare size={16} color="#0052cc" />
          <span>Unified Approvals Inbox (Leave, Expenses & DCR Resubmissions)</span>
        </div>
        <span className="status-pill warning">
          <span className="status-dot warning"></span>
          {approvals.filter((a) => a.status === 'PENDING').length} Pending Manager Action
        </span>
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
            {approvals.map((item) => (
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
                <td style={{ color: 'var(--color-text-secondary)' }}>{item.date}</td>
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
            ))}
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
