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
  Check,
  ArrowRight,
} from 'lucide-react';
import { ApprovalItem } from '../types';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import { getApiBaseUrl } from '../utils/apiHelper';
import { showCenteredNotice } from '../components/CenteredModalNotice';
import { markTaskAsDeleted, getDeletedTaskIds } from '../utils/deletedTasksStore';

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

interface RouteChangeRequestItem {
  id: string;
  mr_id: string;
  mr_name: string;
  hq_name: string;
  date: string;
  tour_plan_id: string;
  tour_plan_item_id: string;
  original_batch_name: string;
  original_locations?: Array<{ id: string; name: string }>;
  requested_batch_name: string;
  requested_locations?: Array<{ id: string; name: string }>;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_remarks?: string;
  created_at: string;
}

export const ApprovalsView: React.FC = () => {
  const [filterType, setFilterType] = useState<'ALL' | 'LEAVE' | 'SUSPENDED_TASK' | 'ROUTE_CHANGE'>(() => {
    try {
      const saved = localStorage.getItem('ahtri_approvals_filter_type');
      if (saved === 'ALL' || saved === 'LEAVE' || saved === 'SUSPENDED_TASK' || saved === 'ROUTE_CHANGE') return saved;
    } catch {}
    return 'ALL';
  });
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'RESOLVED'>(() => {
    try {
      const saved = localStorage.getItem('ahtri_approvals_filter_status');
      if (saved === 'ALL' || saved === 'PENDING' || saved === 'RESOLVED') return saved;
    } catch {}
    return 'PENDING';
  });

  useEffect(() => {
    try {
      localStorage.setItem('ahtri_approvals_filter_type', filterType);
      localStorage.setItem('ahtri_approvals_filter_status', filterStatus);
    } catch {}
  }, [filterType, filterStatus]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unsuspendingId, setUnsuspendingId] = useState<string | null>(null);

  
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  
  const [suspendedTasks, setSuspendedTasks] = useState<SuspendedTaskItem[]>([]);
  const [resolvedTasks, setResolvedTasks] = useState<{ id: string; title: string; assigned_mr_name: string; resolvedAt: string }[]>([]);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [routeChangeRequests, setRouteChangeRequests] = useState<RouteChangeRequestItem[]>([]);

  const [activeModal, setActiveModal] = useState<{
    id: string;
    action: 'APPROVE' | 'REJECT';
    title: string;
    type: 'LEAVE' | 'TASK';
  } | null>(null);

  const [comment, setComment] = useState('');

  
  const fetchData = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      
      const apprRes = await fetch(`${apiUrl}/approvals/pending`, { headers }).catch(() => null);
      if (apprRes && apprRes.ok) {
        const data = await apprRes.json();
        const storedDecisions = getStoredDecisions();
        if (Array.isArray(data)) {
          
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

      
      const tasksRes = await fetch(`${apiUrl}/tasks`, { headers }).catch(() => null);
      if (tasksRes && tasksRes.ok) {
        const allTasks = await tasksRes.json();
        if (Array.isArray(allTasks)) {
          const deletedIds = getDeletedTaskIds();
          const susp = allTasks.filter(
            (t: any) => t.status === 'SUSPENDED' && !deletedIds.has(t.id)
          );
          setSuspendedTasks(susp);
        } else {
          setSuspendedTasks([]);
        }
      }

      // Fetch Route Change Requests
      const rcrRes = await fetch(`${apiUrl}/tour-plans/route-change-requests`, { headers }).catch(() => null);
      if (rcrRes && rcrRes.ok) {
        const rcrData = await rcrRes.json();
        if (Array.isArray(rcrData)) {
          setRouteChangeRequests(rcrData);
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
        window.dispatchEvent(new Event('ahtri_tasks_updated'));
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

  
  const handleDeleteSuspendedTask = async (taskId: string, title: string) => {
    showCenteredNotice({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete task "${title}"?\n\nThis will remove it from the system entirely.`,
      type: 'confirm',
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setDeletingTaskId(taskId);
        
        markTaskAsDeleted(taskId);
        setSuspendedTasks((prev) => prev.filter((t) => t.id !== taskId));
        window.dispatchEvent(new Event('ahtri_approvals_updated'));
        window.dispatchEvent(new Event('ahtri_tasks_updated'));

        
        try {
          const apiUrl = getApiBaseUrl();
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          const hdrs: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
          
          await fetch(`${apiUrl}/tasks/${taskId}`, { method: 'DELETE', headers: hdrs }).catch(() => null);
          
          await fetch(`${apiUrl}/tasks/${taskId}/delete`, { method: 'POST', headers: hdrs }).catch(() => null);
          
          await fetch(`${apiUrl}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: hdrs,
            body: JSON.stringify({ status: 'CANCELLED' }),
          }).catch(() => null);
        } catch {}

        setDeletingTaskId(null);
        showCenteredNotice({
          title: 'Task Deleted',
          message: `Task "${title}" deleted successfully.`,
          type: 'success',
        });
      },
    });
  };

  
  const handleClearAllSuspendedTasks = async () => {
    const idsToClear = suspendedTasks.map((t) => t.id);
    showCenteredNotice({
      title: 'Clear All Suspended Tasks',
      message: `Are you sure you want to permanently delete all ${suspendedTasks.length} suspended task(s)?\n\nThis will clear your Approval Hub completely.`,
      type: 'confirm',
      confirmText: 'Clear All Tasks',
      cancelText: 'Cancel',
      onConfirm: async () => {
        
        markTaskAsDeleted(idsToClear);
        setSuspendedTasks([]);
        window.dispatchEvent(new Event('ahtri_approvals_updated'));
        window.dispatchEvent(new Event('ahtri_tasks_updated'));

        
        try {
          const apiUrl = getApiBaseUrl();
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          const hdrs: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
          
          await fetch(`${apiUrl}/tasks/purge-suspended`, { method: 'POST', headers: hdrs }).catch(() => null);
          
          for (const id of idsToClear) {
            fetch(`${apiUrl}/tasks/${id}`, {
              method: 'PATCH',
              headers: hdrs,
              body: JSON.stringify({ status: 'CANCELLED' }),
            }).catch(() => null);
          }
        } catch {}

        showCenteredNotice({
          title: 'Approval Hub Cleared',
          message: 'All suspended tasks have been deleted.',
          type: 'success',
        });
      },
    });
  };

  
  const [routeChangeModal, setRouteChangeModal] = useState<{
    isOpen: boolean;
    request: RouteChangeRequestItem | null;
    action: 'APPROVE' | 'REJECT';
    remark: string;
  }>({
    isOpen: false,
    request: null,
    action: 'APPROVE',
    remark: '',
  });

  const handleOpenRouteChangeModal = (rc: RouteChangeRequestItem, action: 'APPROVE' | 'REJECT') => {
    const defaultRemark = action === 'APPROVE' ? 'Approved by Operations' : 'Route switch declined';
    setRouteChangeModal({
      isOpen: true,
      request: rc,
      action,
      remark: defaultRemark,
    });
  };

  const handleConfirmRouteChangeModal = async () => {
    if (!routeChangeModal.request) return;
    const { request, action, remark } = routeChangeModal;
    setRouteChangeModal((prev) => ({ ...prev, isOpen: false }));

    try {
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/tour-plans/route-change-requests/${request.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          admin_remarks: (remark || '').trim(),
        }),
      });

      if (res.ok) {
        showCenteredNotice({
          title: action === 'APPROVE' ? 'Route Change Approved' : 'Route Change Rejected',
          message: `Route change request ${action === 'APPROVE' ? 'approved' : 'rejected'}. Field representative agenda updated.`,
          type: action === 'APPROVE' ? 'success' : 'info',
        });
        fetchData();
        window.dispatchEvent(new Event('ahtri_tasks_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_approvals_updated'));
      } else {
        const err = await res.json().catch(() => ({}));
        showCenteredNotice({
          title: 'Review Failed',
          message: err.message || 'Failed to update route change request status.',
          type: 'error',
        });
      }
    } catch (err: any) {
      showCenteredNotice({
        title: 'Network Error',
        message: err.message || 'Error communicating with server.',
        type: 'error',
      });
    }
  };

  const handleReviewRouteChange = (id: string, action: 'APPROVE' | 'REJECT') => {
    const rc = routeChangeRequests.find((r) => r.id === id);
    if (rc) {
      handleOpenRouteChangeModal(rc, action);
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const pendingSuspendedCount = suspendedTasks.length;
  const pendingRcrCount = routeChangeRequests.filter((r) => r.status === 'PENDING').length;
  const totalPendingActionCount = pendingApprovalsCount + pendingSuspendedCount + pendingRcrCount;

  return (
    <div className="enterprise-panel">
      {/* Header Bar */}
      <div className="panel-header-bar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div className="panel-headline" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
            <CheckSquare size={16} color="#0052cc" />
            <span>Approval Hub (Leave Requests &amp; Suspended Task Approvals)</span>
          </div>
          <span className={`status-pill ${totalPendingActionCount > 0 ? 'warning' : 'success'}`}>
            <span className={`status-dot ${totalPendingActionCount > 0 ? 'warning' : 'success'}`}></span>
            {totalPendingActionCount} Pending Action
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {/* Category Filter */}
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px', flexWrap: 'wrap', gap: '2px' }}>
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
            <button
              onClick={() => setFilterType('ROUTE_CHANGE')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'ROUTE_CHANGE' ? '#0F8B5A' : 'transparent',
                color: filterType === 'ROUTE_CHANGE' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              Route Changes ({pendingRcrCount})
            </button>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px', flexWrap: 'wrap', gap: '2px' }}>
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

            {/* 3. ROUTE CHANGE REQUESTS SECTION */}
            {(filterType === 'ALL' || filterType === 'ROUTE_CHANGE') && (
              <>
                {routeChangeRequests
                  .filter((r) => {
                    if (filterStatus === 'PENDING') return r.status === 'PENDING';
                    if (filterStatus === 'RESOLVED') return r.status === 'APPROVED' || r.status === 'REJECTED';
                    return true;
                  })
                  .map((rc) => (
                    <tr key={rc.id}>
                      <td>
                        <span className="status-pill warning" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                          🔄 Route Change
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={13} color="#64748B" />
                          <span>{rc.mr_name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{rc.hq_name || 'Shahdol'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{rc.original_batch_name}</span>
                          <span style={{ color: '#2563EB', fontWeight: 800 }}>➡️</span>
                          <span style={{ color: '#0F8B5A' }}>{rc.requested_batch_name}</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: 3 }}>
                          Reason: <em>"{rc.reason}"</em>
                        </div>
                        {rc.requested_locations && rc.requested_locations.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: 2 }}>
                            Planned Stops: {rc.requested_locations.map((l) => l.name).join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {formatDateDDMMYYYY(rc.date)}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            rc.status === 'APPROVED' ? 'success' : rc.status === 'REJECTED' ? 'alert' : 'warning'
                          }`}
                        >
                          <span
                            className={`status-dot ${
                              rc.status === 'APPROVED' ? 'success' : rc.status === 'REJECTED' ? 'alert' : 'warning'
                            }`}
                          ></span>
                          {rc.status}
                        </span>
                      </td>
                      <td>
                        {rc.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn-enterprise success sm"
                              onClick={() => handleReviewRouteChange(rc.id, 'APPROVE')}
                              style={{
                                background: '#0F8B5A',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-enterprise secondary sm"
                              style={{ color: 'var(--color-alert)' }}
                              onClick={() => handleReviewRouteChange(rc.id, 'REJECT')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {rc.status === 'APPROVED' ? 'Approved' : 'Declined'}
                            {rc.admin_remarks ? ` • "${rc.admin_remarks}"` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </>
            )}

            {/* Empty State */}
            {suspendedTasks.length === 0 &&
              approvals.filter((a) => (filterStatus === 'PENDING' ? a.status === 'PENDING' : a.status !== 'PENDING')).length === 0 &&
              routeChangeRequests.filter((r) => (filterStatus === 'PENDING' ? r.status === 'PENDING' : r.status !== 'PENDING')).length === 0 && (
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
                Confirm your decision. This action updates the record and transmits a real-time notification to the field representative.
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

      {/* MODAL: ROUTE CHANGE REQUEST CUSTOM REVIEW */}
      {routeChangeModal.isOpen && routeChangeModal.request && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRouteChangeModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background:
                  routeChangeModal.action === 'APPROVE'
                    ? 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)'
                    : 'linear-gradient(180deg, #FEF2F2 0%, #FFFFFF 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: routeChangeModal.action === 'APPROVE' ? '#DCFCE7' : '#FEE2E2',
                    color: routeChangeModal.action === 'APPROVE' ? '#15803D' : '#DC2626',
                    boxShadow:
                      routeChangeModal.action === 'APPROVE'
                        ? '0 2px 8px rgba(34, 197, 94, 0.2)'
                        : '0 2px 8px rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {routeChangeModal.action === 'APPROVE' ? <Check size={22} /> : <X size={22} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                    {routeChangeModal.action === 'APPROVE'
                      ? 'Approve Route Deviation'
                      : 'Decline Route Deviation'}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {routeChangeModal.action === 'APPROVE'
                      ? 'Confirm schedule switch & update agenda tasks automatically.'
                      : 'Decline this change request and keep the original planned route.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRouteChangeModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Request Info Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 14,
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Medical Rep</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                      {routeChangeModal.request.mr_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Headquarter</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {routeChangeModal.request.hq_name || 'Shahdol'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Visit Date</div>
                    <div style={{ fontWeight: 800, color: '#1A3C6E', marginTop: 2 }}>
                      {formatDateDDMMYYYY(routeChangeModal.request.date)}
                    </div>
                  </div>
                </div>

                {/* Route Deviation Box */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>
                      Current Planned
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>
                      {routeChangeModal.request.original_batch_name || 'Standard Route'}
                    </div>
                  </div>
                  <ArrowRight size={16} color="#94A3B8" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                      Requested Deviation
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F8B5A', marginTop: 2 }}>
                      {routeChangeModal.request.requested_batch_name || 'Deviation Route'}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {routeChangeModal.request.reason && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: '#475569' }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>MR Stated Reason:</span>{' '}
                    <em>"{routeChangeModal.request.reason}"</em>
                  </div>
                )}
              </div>

              {/* Review Note / Remark Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                    Review Note / Instructions for MR
                  </label>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>Optional</span>
                </div>
                <textarea
                  value={routeChangeModal.remark}
                  onChange={(e) =>
                    setRouteChangeModal((prev) => ({ ...prev, remark: e.target.value }))
                  }
                  rows={3}
                  placeholder="Enter a note or instructions for the Medical Representative..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 12.5,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      routeChangeModal.action === 'APPROVE' ? '#0F8B5A' : '#EF4444';
                    e.currentTarget.style.boxShadow =
                      routeChangeModal.action === 'APPROVE'
                        ? '0 0 0 3px rgba(15, 139, 90, 0.15)'
                        : '0 0 0 3px rgba(239, 68, 68, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />

                {/* Quick Suggestion Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {(routeChangeModal.action === 'APPROVE'
                    ? [
                        'Approved by Operations',
                        'Key doctor detailing confirmed',
                        'Authorized for today only',
                      ]
                    : [
                        'Route switch declined',
                        'Please continue with standard approved route',
                        'Reschedule for next week',
                      ]
                  ).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setRouteChangeModal((prev) => ({ ...prev, remark: chip }))}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #F1F5F9',
                background: '#FAFAFA',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn-enterprise secondary"
                onClick={() => setRouteChangeModal((prev) => ({ ...prev, isOpen: false }))}
                style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-enterprise"
                onClick={handleConfirmRouteChangeModal}
                style={{
                  padding: '8px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  background:
                    routeChangeModal.action === 'APPROVE'
                      ? 'linear-gradient(135deg, #10B981 0%, #0F8B5A 100%)'
                      : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  borderColor: routeChangeModal.action === 'APPROVE' ? '#0F8B5A' : '#DC2626',
                  color: '#FFFFFF',
                  boxShadow:
                    routeChangeModal.action === 'APPROVE'
                      ? '0 4px 12px rgba(15, 139, 90, 0.3)'
                      : '0 4px 12px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                {routeChangeModal.action === 'APPROVE' ? <Check size={16} /> : <X size={16} />}
                {routeChangeModal.action === 'APPROVE'
                  ? 'Confirm Approval & Apply'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
