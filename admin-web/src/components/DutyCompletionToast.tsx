import React from 'react';
import { CheckCircle2, X, ShoppingBag, Clock, MapPin } from 'lucide-react';

export interface DutyCompletionItem {
  id: string;
  title: string;
  assigned_mr_name: string;
  assigned_mr_id: string;
  location_name: string;
  completed_at: string;
  duration_seconds?: number;
  outcome?: string;
  orders?: Array<{
    product_name: string;
    quantity: number;
    total_amount?: number;
    unit_price?: number;
  }>;
}

interface DutyCompletionToastProps {
  completions: DutyCompletionItem[];
  onViewTask: (task: DutyCompletionItem) => void;
  onDismiss: (taskId: string) => void;
  onDismissAll: () => void;
}

export const DutyCompletionToast: React.FC<DutyCompletionToastProps> = ({
  completions,
  onViewTask,
  onDismiss,
  onDismissAll,
}) => {
  if (!completions || completions.length === 0) return null;

  const current = completions[0];

  const totalOrders = current.orders?.reduce((sum, o) => sum + (o.quantity || 0), 0) || 0;
  const totalAmount = current.orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

  const formatDuration = (sec?: number) => {
    if (!sec) return '15m';
    const m = Math.floor(sec / 60);
    return `${m}m`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 16px 36px rgba(15, 23, 42, 0.25), 0 3px 10px rgba(15, 23, 42, 0.1)',
        border: '2px solid #0F8B5A',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Banner Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #0F8B5A 100%)',
          color: '#FFFFFF',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: '#34D399',
              boxShadow: '0 0 10px #34D399',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>
            🎉 DUTY COMPLETED BY FIELD MR
          </span>
          {completions.length > 1 && (
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: '700',
              }}
            >
              +{completions.length - 1} more
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(current.id)}
          title="Dismiss notification"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#A7F3D0',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body Content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                {current.assigned_mr_name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: '#DCFCE7',
                  color: '#166534',
                }}
              >
                COMPLETED ✓
              </span>
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#1E293B',
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <MapPin size={12} color="#0F8B5A" />
              <span>{current.location_name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#64748B' }}>
            <Clock size={11} />
            <span>{formatDuration(current.duration_seconds)}</span>
          </div>
        </div>

        {/* Doctor Feedback / Meeting Outcome */}
        {current.outcome && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 10px',
              background: '#F8FAFC',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              fontSize: '11.5px',
              color: '#334155',
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            "{current.outcome}"
          </div>
        )}

        {/* Orders Captured */}
        {totalOrders > 0 && (
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: '#F0FDF4',
              borderRadius: '6px',
              border: '1px solid #BBF7D0',
              fontSize: '11.5px',
              color: '#166534',
              fontWeight: 700,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShoppingBag size={13} color="#166534" />
              <span>{totalOrders} Units Ordered</span>
            </div>
            {totalAmount > 0 && <span>₹{totalAmount.toLocaleString()}</span>}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => onViewTask(current)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#0F8B5A',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} /> View in Duty List
          </button>

          {completions.length > 1 ? (
            <button
              type="button"
              onClick={onDismissAll}
              style={{
                padding: '8px 12px',
                background: '#F1F5F9',
                color: '#475569',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Dismiss All ({completions.length})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDismiss(current.id)}
              style={{
                padding: '8px 12px',
                background: '#F1F5F9',
                color: '#475569',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
