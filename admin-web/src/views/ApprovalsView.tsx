import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Calendar,
  FileEdit,
  X,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  User,
  MapPin,
  Trash2,
} from 'lucide-react';
import { ApprovalItem } from '../types';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import { getApiBaseUrl } from '../utils/apiHelper';
import { showCenteredNotice } from '../components/CenteredModalNotice';

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

interface SuspendedTaskItem {
  id: string;
  title: string;
  assigned_mr_name: string;
  assigned_mr_id?: string;
  location_name: string;
  date: string;
  suspended_at?: string;
  status: string;
  priority?: string;
}

export const ApprovalsView: React.FC = () => {
  const [filterType, setFilterType] = useState<'ALL' | 'LEAVE' | 'SUSPENDED_TASK'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unsuspendingId, setUnsuspendingId] = useState<string | null>(null);

  // Leave & DCR Approvals State (Strictly dynamic from database)
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  // Suspended Tasks State
  const [suspendedTasks, setSuspendedTasks] = useState<SuspendedTaskItem[]>([]);
  const [resolvedTasks, setResolvedTasks] = useState<{ id: string; title: string; assigned_mr_name: string; resolvedAt: string }[]>([]);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<{
    id: string;
    action: 'APPROVE' | 'REJECT';
    title: string;
    type: 'LEAVE' | 'TASK';
  } | null>(null);

  const [comment, setComment] = useState('');

  // Fetch approvals and suspended tasks from backend
  const fetchData = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Fetch pending approvals (strictly exclude EXPENSE)
      const apprRes = await fetch(`${apiUrl}/approvals/pending`, { headers }).catch(() => null);
      if (apprRes && apprRes.ok) {
        const data = await apprRes.json();
        const storedDecisions = getStoredDecisions();
        if (Array.isArray(data)) {
          // Filter out any EXPENSE item
          const filtered = data.filter((a: any) => a.entity_type !== 'EXPENSE');
          const mapped: ApprovalItem[] = filtered.map((a: any) => {
            const dec = storedDecisions[a.id] || (a.entity_id ? storedDecisions[a.entity_id] : undefined);
            return {
              id: a.id,
              entity_type: a.entity_type,
              entity_id: a.entity_id,
              requester_name: a.requester_name || 'Representative',
              details: a.entity_details?.reason
                ? `${a.entity_details.reason} (${formatDateDDMMYYYY(a.entity_details.start_date)} to ${formatDateDDMMYYYY(a.entity_details.end_date)})`
                : a.entity_details?.description || `${a.entity_type} Request`,
              date: formatDateDDMMYYYY(a.created_at || a.date || new Date().toISOString()),
              status: dec ? dec.status : a.status,
            };
          });
          setApprovals(mapped);
        } else {
          setApprovals([]);
        }
      }

      // 2. Fetch suspended tasks from /tasks
      const tasksRes = await fetch(`${apiUrl}/tasks`, { headers }).catch(() => null);
      if (tasksRes && tasksRes.ok) {
        const allTasks = await tasksRes.json();
        if (Array.isArray(allTasks)) {
          const susp = allTasks.filter((t: any) => t.status === 'SUSPENDED');
          setSuspendedTasks(susp);
        } else {
          setSuspendedTasks([]);
        }
      }
    } catch (err) {
      console.warn('Error fetching approvals & suspended tasks:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle Approve / Reject for Leave & DCR
  const handleLeaveDecision = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const item = approvals.find((a) => a.id === id);
    const newStatus: 'APPROVED' | 'REJECTED' = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const commentTrimmed = comment.trim();

    saveStoredDecision(id, item?.entity_id, newStatus, commentTrimmed);

    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    try {
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = JSON.stringify({
        status: newStatus,
        comment: commentTrimmed,
      });

      await fetch(`${apiUrl}/approvals/${id}/decide`, {
        method: 'POST',
        headers,
        body,
      }).catch(() => {});

      if (item?.entity_type === 'LEAVE' || id.startsWith('leave-') || item?.entity_id?.startsWith('leave-')) {
        const leaveId = item?.entity_id || id;
        await fetch(`${apiUrl}/leave/${leaveId}/decide`, {
          method: 'POST',
          headers,
          body,
        }).catch(() => {});
      }
    } catch {}

    setActiveModal(null);
    setComment('');
    window.dispatchEvent(new Event('ahtri_approvals_updated'));
  };

  // Handle Approve & Unsuspend for Suspended Task
  const handleUnsuspendTask = async (taskId: string, mrName: string, taskTitle: string) => {
    setUnsuspendingId(taskId);
    try {
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/tasks/${taskId}/unsuspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setSuspendedTasks((prev) => prev.filter((t) => t.id !== taskId));
        setResolvedTasks((prev) => [
          {
            id: taskId,
            title: taskTitle,
            assigned_mr_name: mrName,
            resolvedAt: formatDateTimeDDMMYYYY(new Date()),
          },
          ...prev,
        ]);
        window.dispatchEvent(new Event('ahtri_approvals_updated'));
        showCenteredNotice({
          title: 'Task Unsuspended',
          message: `Task "${taskTitle}" successfully unsuspended. Representative ${mrName} can now execute calls.`,
          type: 'success',
        });
      } else {
        showCenteredNotice({
          title: 'Notice',
          message: 'Failed to unsuspend task.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error unsuspending task:', err);
      showCenteredNotice({
        title: 'Connection Error',
        message: 'Network error unsuspending task.',
        type: 'error',
      });
    } finally {
      setUnsuspendingId(null);
    }
  };

  // Permanently Delete a Suspended Task
  const handleDeleteSuspendedTask = async (taskId: string, title: string) => {
    showCenteredNotice({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete task "${title}"?\n\nThis will remove it from the system entirely.`,
      type: 'confirm',
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setDeletingTaskId(taskId);
        try {
          const apiUrl = getApiBaseUrl();
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          await fetch(`${apiUrl}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        } catch {}
        setSuspendedTasks((prev) => prev.filter((t) => t.id !== taskId));
        window.dispatchEvent(new Event('ahtri_approvals_updated'));
        setDeletingTaskId(null);
        showCenteredNotice({
          title: 'Task Deleted',
          message: `Task "${title}" deleted successfully.`,
          type: 'success',
        });
      },
    });
  };

  // Permanently Delete All Suspended Tasks
  const handleClearAllSuspendedTasks = async () => {
    showCenteredNotice({
      title: 'Clear All Suspended Tasks',
      message: `Are you sure you want to permanently delete all ${suspendedTasks.length} suspended task(s)?\n\nThis will clear your Approval Hub completely.`,
      type: 'confirm',
      confirmText: 'Clear All Tasks',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const apiUrl = getApiBaseUrl();
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          await fetch(`${apiUrl}/tasks/purge-suspended`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        } catch {}
        setSuspendedTasks([]);
        window.dispatchEvent(new Event('ahtri_approvals_updated'));
        showCenteredNotice({
          title: 'Approval Hub Cleared',
          message: 'All suspended tasks have been deleted.',
          type: 'success',
        });
      },
    });
  };

  // Filtered Leave/DCR requests
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const pendingSuspendedCount = suspendedTasks.length;
  const totalPendingActionCount = pendingApprovalsCount + pendingSuspendedCount;

  return (
    <div className="enterprise-panel">
      {/* Header Bar */}
      <div className="panel-header-bar">
        <div className="panel-headline">
          <CheckSquare size={16} color="#0052cc" />
          <span>Approval Hub (Leave Requests & Suspended Task Approvals)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Category Filter */}
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => setFilterType('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'ALL' ? '#0052cc' : 'transparent',
                color: filterType === 'ALL' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              All Approvals
            </button>
            <button
              onClick={() => setFilterType('LEAVE')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'LEAVE' ? '#0052cc' : 'transparent',
                color: filterType === 'LEAVE' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              Leave Requests ({pendingApprovalsCount})
            </button>
            <button
              onClick={() => setFilterType('SUSPENDED_TASK')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'SUSPENDED_TASK' ? '#DC2626' : 'transparent',
                color: filterType === 'SUSPENDED_TASK' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              Suspended Tasks ({pendingSuspendedCount})
            </button>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => setFilterStatus('PENDING')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterStatus === 'PENDING' ? '#0052cc' : 'transparent',
                color: filterStatus === 'PENDING' ? '#FFFFFF' : '#64748B',
              }}
            >
              Pending ({totalPendingActionCount})
            </button>
            <button
              onClick={() => setFilterStatus('RESOLVED')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterStatus === 'RESOLVED' ? '#0052cc' : 'transparent',
                color: filterStatus === 'RESOLVED' ? '#FFFFFF' : '#64748B',
              }}
            >
              Resolved
            </button>
          </div>

          {pendingSuspendedCount > 0 && (
            <button
              onClick={handleClearAllSuspendedTasks}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #FCA5A5',
                background: '#FEF2F2',
                color: '#DC2626',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Permanently remove all suspended tasks from Approval Hub"
            >
              <Trash2 size={12} />
              Clear All Suspended ({pendingSuspendedCount})
            </button>
          )}

          <span className={`status-pill ${totalPendingActionCount > 0 ? 'warning' : 'success'}`}>
            <span className={`status-dot ${totalPendingActionCount > 0 ? 'warning' : 'success'}`}></span>
            {totalPendingActionCount} Pending Action
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="enterprise-table-wrapper">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Request Type</th>
              <th style={{ width: '160px' }}>Applicant / MR</th>
              <th>Request Details & Reason</th>
              <th style={{ width: '130px' }}>Date</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '220px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {/* 1. SUSPENDED TASKS SECTION (when filter matches) */}
            {(filterType === 'ALL' || filterType === 'SUSPENDED_TASK') && (
              <>
                {filterStatus === 'PENDING' &&
                  suspendedTasks.map((st) => (
                    <tr key={`task-${st.id}`} style={{ background: '#FFF5F5' }}>
                      <td>
                        <span className="status-pill alert" style={{ fontWeight: 700 }}>
                          <AlertTriangle size={11} style={{ marginRight: 4 }} />
                          Suspended Task
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#1E293B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={13} color="#64748B" />
                          <span>{st.assigned_mr_name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{st.title}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={11} color="#94A3B8" />
                          <span>{st.location_name}</span>
                          <span style={{ color: '#DC2626', marginLeft: 6, fontWeight: 600 }}>
                            • Overdue &gt;24h without visit. Mobile access locked.
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {formatDateDDMMYYYY(st.suspended_at || st.date)}
                      </td>
                      <td>
                        <span className="status-pill alert">
                          <span className="status-dot alert"></span>
                          SUSPENDED
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn-enterprise success sm"
                            onClick={() => handleUnsuspendTask(st.id, st.assigned_mr_name, st.title)}
                            disabled={unsuspendingId === st.id}
                            style={{
                              background: '#0F8B5A',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: unsuspendingId === st.id ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Reset task date to today and unlock MR on mobile app"
                          >
                            <ShieldCheck size={13} />
                            {unsuspendingId === st.id ? '...' : 'Approve'}
                          </button>

                          <button
                            onClick={() => handleDeleteSuspendedTask(st.id, st.title)}
                            disabled={deletingTaskId === st.id}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #FCA5A5',
                              background: '#FFFFFF',
                              color: '#DC2626',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title="Delete this task permanently"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {filterStatus === 'RESOLVED' &&
                  resolvedTasks.map((rt) => (
                    <tr key={`resolved-${rt.id}`}>
                      <td>
                        <span className="status-pill success">
                          <ShieldCheck size={11} style={{ marginRight: 4 }} />
                          Task Unsuspended
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{rt.assigned_mr_name}</td>
                      <td>
                        <div>{rt.title}</div>
                        <div style={{ fontSize: '11px', color: '#0F8B5A' }}>
                          Approved & reset to today. Mobile unlocked.
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{rt.resolvedAt}</td>
                      <td>
                        <span className="status-pill success">
                          <span className="status-dot success"></span>
                          RESOLVED
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Unsuspend Completed</span>
                      </td>
                    </tr>
                  ))}
              </>
            )}

            {/* 2. LEAVE & DCR REQUESTS SECTION (Strictly NO Expense) */}
            {(filterType === 'ALL' || filterType === 'LEAVE') && (
              <>
                {approvals
                  .filter((a) => {
                    if (filterStatus === 'PENDING') return a.status === 'PENDING';
                    if (filterStatus === 'RESOLVED') return a.status === 'APPROVED' || a.status === 'REJECTED';
                    return true;
                  })
                  .map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={`status-pill ${item.entity_type === 'LEAVE' ? 'info' : 'neutral'}`}>
                          {item.entity_type === 'LEAVE' ? (
                            <Calendar size={11} style={{ marginRight: 4 }} />
                          ) : (
                            <FileEdit size={11} style={{ marginRight: 4 }} />
                          )}
                          {item.entity_type === 'LEAVE' ? 'Leave Request' : item.entity_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={13} color="#64748B" />
                          <span>{item.requester_name}</span>
                        </div>
                      </td>
                      <td>
                        <div>{item.details}</div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {formatDateDDMMYYYY(item.date)}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'alert' : 'warning'
                          }`}
                        >
                          <span
                            className={`status-dot ${
                              item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'alert' : 'warning'
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
                                  title: `Approve Leave for ${item.requester_name}`,
                                  type: 'LEAVE',
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
                                  title: `Reject Leave for ${item.requester_name}`,
                                  type: 'LEAVE',
                                })
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Decision Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </>
            )}

            {/* Empty State */}
            {suspendedTasks.length === 0 && approvals.filter((a) => (filterStatus === 'PENDING' ? a.status === 'PENDING' : a.status !== 'PENDING')).length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                  <CheckCircle2 size={32} color="#0F8B5A" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>No Pending Approvals</div>
                  <div style={{ fontSize: '12px', marginTop: 4 }}>
                    All leave applications and suspended task review items are currently resolved.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Decision Modal for Leave / DCR */}
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
                onClick={() => handleLeaveDecision(activeModal.id, activeModal.action)}
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
