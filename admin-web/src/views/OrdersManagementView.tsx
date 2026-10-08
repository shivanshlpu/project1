import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Boxes,
  MapPin,
  User,
  Eye,
  RefreshCw,
  AlertCircle,
  Truck,
  Check,
  Building2,
  X,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { OrderItemRecord, OrderProductItem } from '../types';
import { getApiBaseUrl, getAuthHeaders, resilientFetch } from '../utils/apiHelper';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import { showCenteredNotice } from '../components/CenteredModalNotice';
import { Language } from '../utils/i18n';

interface OrdersManagementViewProps {
  lang?: Language;
}

export const OrdersManagementView: React.FC<OrdersManagementViewProps> = ({ lang = 'en' }) => {
  const [orders, setOrders] = useState<OrderItemRecord[]>([]);
  const [hqs, setHqs] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHq, setFilterHq] = useState<string>('ALL');
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState<string>('ALL');
  const [filterAcceptance, setFilterAcceptance] = useState<string>('ALL');

  // Modals
  const [selectedOrderForItems, setSelectedOrderForItems] = useState<OrderItemRecord | null>(null);
  const [confirmAcceptOrder, setConfirmAcceptOrder] = useState<OrderItemRecord | null>(null);

  const getApiUrl = () => getApiBaseUrl();

  const fetchOrdersAndMetadata = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiUrl().replace(/\/+$/, '');
      const headers = getAuthHeaders();

      const [ordersRes, hqsRes] = await Promise.all([
        resilientFetch(`${baseUrl}/orders`, { headers }),
        resilientFetch(`${baseUrl}/inventory/hqs`, { headers }).catch(() => null),
      ]);

      if (ordersRes && ordersRes.ok) {
        const data = await ordersRes.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
      }

      if (hqsRes && hqsRes.ok) {
        const hqsData = await hqsRes.json();
        if (Array.isArray(hqsData)) {
          setHqs(hqsData);
        }
      }
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndMetadata();
    const interval = setInterval(fetchOrdersAndMetadata, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // HQ filter
      if (filterHq !== 'ALL') {
        const hqNorm = filterHq.toLowerCase();
        const ordHqNorm = (o.hq_id || '').toLowerCase();
        if (!ordHqNorm.includes(hqNorm) && o.hq_id !== filterHq && o.hq_name !== filterHq) {
          return false;
        }
      }

      // Delivery Status filter
      if (filterDeliveryStatus !== 'ALL' && o.delivery_status !== filterDeliveryStatus) {
        return false;
      }

      // Acceptance filter
      if (filterAcceptance === 'ACCEPTED' && !o.hq_accepted) {
        return false;
      }
      if (filterAcceptance === 'PENDING' && o.hq_accepted) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = (o.order_number || '').toLowerCase().includes(q);
        const matchMr = (o.mr_name || '').toLowerCase().includes(q);
        const matchCust = (o.customer_name || '').toLowerCase().includes(q);
        const matchLoc = (o.location_name || '').toLowerCase().includes(q);
        const matchHq = (o.hq_name || '').toLowerCase().includes(q);
        const matchItems = (o.items || []).some((item) =>
          (item.product_name || '').toLowerCase().includes(q)
        );
        if (!matchNum && !matchMr && !matchCust && !matchLoc && !matchHq && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, filterHq, filterDeliveryStatus, filterAcceptance, searchQuery]);

  // Aggregate Metrics
  const totalCount = orders.length;
  const pendingDeliveryCount = orders.filter((o) => o.delivery_status === 'PENDING').length;
  const deliveredAwaitingAcceptance = orders.filter(
    (o) => o.delivery_status === 'DELIVERED' && !o.hq_accepted
  ).length;
  const acceptedAndCountedCount = orders.filter((o) => o.hq_accepted).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Delivery Status Toggle Handler (Admin supervision)
  const handleToggleDeliveryStatus = async (order: OrderItemRecord) => {
    const nextStatus = order.delivery_status === 'DELIVERED' ? 'PENDING' : 'DELIVERED';
    setIsProcessingAction(order.id);
    try {
      const baseUrl = getApiUrl().replace(/\/+$/, '');
      const res = await resilientFetch(`${baseUrl}/orders/${order.id}/delivery`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          delivery_status: nextStatus,
          notes: `Delivery status updated to ${nextStatus} via Admin supervision`,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
        if (selectedOrderForItems?.id === order.id) {
          setSelectedOrderForItems(updated);
        }
        showCenteredNotice({
          type: 'success',
          title: 'Delivery Status Updated',
          message: `Order #${order.order_number} marked as ${nextStatus}.`,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        showCenteredNotice({
          type: 'error',
          title: 'Update Failed',
          message: err.message || 'Could not update delivery status.',
        });
      }
    } catch (err: any) {
      showCenteredNotice({
        type: 'error',
        title: 'Network Error',
        message: err.message || 'Error updating delivery status.',
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

  // HQ Acceptance & Stock Deduction Handler
  const handleExecuteHqAcceptance = async (order: OrderItemRecord) => {
    setIsProcessingAction(order.id);
    try {
      const baseUrl = getApiUrl().replace(/\/+$/, '');
      const res = await resilientFetch(`${baseUrl}/orders/${order.id}/accept`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
        if (selectedOrderForItems?.id === order.id) {
          setSelectedOrderForItems(updated);
        }
        setConfirmAcceptOrder(null);
        showCenteredNotice({
          type: 'success',
          title: 'Order Accepted & Stock Counted! ✓',
          message: `Order #${order.order_number} has been officially accepted for ${order.hq_name}. Inventory counting has started and stock was deducted.`,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        showCenteredNotice({
          type: 'error',
          title: 'Acceptance Rejected',
          message:
            err.message ||
            'Only the HQ for which the order was placed can accept it, and delivery must be complete.',
        });
      }
    } catch (err: any) {
      showCenteredNotice({
        type: 'error',
        title: 'Network Error',
        message: err.message || 'Error processing HQ acceptance.',
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

  return (
    <div className="orders-page-container">
      <style>{`
        .orders-page-container {
          padding: 24px 32px;
          max-width: 1440px;
          margin: 0 auto;
          font-family: inherit;
        }
        .orders-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 14px;
          flex-wrap: wrap;
        }
        .orders-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1 1 300px;
        }
        .orders-header-icon {
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          flex-shrink: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
        }
        .orders-header-h1 {
          font-size: clamp(19px, 3.8vw, 24px);
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.3px;
          line-height: 1.25;
        }
        .orders-header-sub {
          font-size: 13px;
          color: #64748B;
          margin: 4px 0 0;
          line-height: 1.4;
        }
        .orders-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .orders-desktop-table {
          display: block;
          overflow-x: auto;
        }
        .orders-mobile-card-list {
          display: none;
        }

        @media (max-width: 768px) {
          .orders-page-container {
            padding: 12px 14px 28px !important;
          }
          .orders-header-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            margin-bottom: 16px !important;
          }
          .orders-title-wrapper {
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .orders-header-icon {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            border-radius: 9px !important;
            margin-top: 2px !important;
          }
          .orders-header-h1 {
            font-size: 18px !important;
          }
          .orders-header-sub {
            font-size: 12px !important;
            margin-top: 3px !important;
          }
          .orders-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 16px !important;
          }
          .orders-desktop-table {
            display: none !important;
          }
          .orders-mobile-card-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 12px 10px !important;
          }
        }
        @media (max-width: 440px) {
          .orders-kpi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="orders-header-row">
        <div>
          <div className="orders-title-wrapper">
            <div className="orders-header-icon">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h1 className="orders-header-h1">
                Orders &amp; Delivery Supervision
              </h1>
              <p className="orders-header-sub">
                Manage field orders, employee delivery tracking, HQ-scoped visibility, and stock count acceptance.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchOrdersAndMetadata}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="orders-kpi-grid">
        {/* Total Orders */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
              Total Orders
            </span>
            <span style={{ fontSize: '18px' }}>📦</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
            Across all authorized HQs
          </div>
        </div>

        {/* Pending Delivery */}
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>
              Delivery Pending
            </span>
            <Clock size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#92400E', marginTop: '6px' }}>
            {pendingDeliveryCount}
          </div>
          <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
            No stock deducted yet
          </div>
        </div>

        {/* Delivered - Awaiting HQ Acceptance */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase' }}>
              Awaiting HQ Acceptance
            </span>
            <Truck size={16} color="#16A34A" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '6px' }}>
            {deliveredAwaitingAcceptance}
          </div>
          <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
            Delivered • Ready for stock count
          </div>
        </div>

        {/* Accepted & Counted */}
        <div
          style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase' }}>
              Accepted & Counted
            </span>
            <CheckCircle2 size={16} color="#2563EB" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E40AF', marginTop: '6px' }}>
            {acceptedAndCountedCount}
          </div>
          <div style={{ fontSize: '11px', color: '#1D4ED8', marginTop: '2px' }}>
            Inventory successfully deducted
          </div>
        </div>

        {/* Total Value */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
              Total Order Revenue
            </span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F8B5A' }}>₹</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F8B5A', marginTop: '6px' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
            Gross order bookings
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search Order #, MR, Doctor, Clinic, Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              outline: 'none',
              backgroundColor: '#F8FAFC',
            }}
          />
        </div>

        {/* HQ Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Building2 size={15} color="#64748B" />
          <select
            value={filterHq}
            onChange={(e) => setFilterHq(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: '500',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Head Quarters</option>
            {hqs.map((hq) => (
              <option key={hq.id} value={hq.id}>
                {hq.name} ({hq.code || hq.id})
              </option>
            ))}
          </select>
        </div>

        {/* Delivery Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Truck size={15} color="#64748B" />
          <select
            value={filterDeliveryStatus}
            onChange={(e) => setFilterDeliveryStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: '500',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Delivery: All Statuses</option>
            <option value="PENDING">⏳ Delivery Pending</option>
            <option value="DELIVERED">🚚 Delivered</option>
          </select>
        </div>

        {/* Acceptance Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Boxes size={15} color="#64748B" />
          <select
            value={filterAcceptance}
            onChange={(e) => setFilterAcceptance(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: '500',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Stock Acceptance: All</option>
            <option value="PENDING">⏳ Awaiting HQ Acceptance</option>
            <option value="ACCEPTED">✅ Accepted & Counted</option>
          </select>
        </div>

        {/* Reset */}
        {(searchQuery || filterHq !== 'ALL' || filterDeliveryStatus !== 'ALL' || filterAcceptance !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterHq('ALL');
              setFilterDeliveryStatus('ALL');
              setFilterAcceptance('ALL');
            }}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#EF4444',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Orders Table Container */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            💡 Stock is deducted only after employee marks delivery AND target HQ accepts.
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#475569' }}>No orders found</div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              No orders match the current filter selection or search query.
            </div>
          </div>
        ) : (
          <>
            <div className="orders-desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '880px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>Order # / Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>Field Rep (MR)</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>Customer / Doctor</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>HQ & Stocker</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>Ordered Items</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>Delivery Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px' }}>HQ Acceptance & Counting</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, idx) => {
                  const isDelivered = ord.delivery_status === 'DELIVERED';
                  const isAccepted = ord.hq_accepted;
                  const isProcessing = isProcessingAction === ord.id;

                  return (
                    <tr
                      key={ord.id}
                      style={{
                        borderBottom: '1px solid #E2E8F0',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Order # and Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#0284C7' }}>#</span>
                          <span>{ord.order_number}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                          {formatDateTimeDDMMYYYY(ord.created_at)}
                        </div>
                      </td>

                      {/* Field Rep */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={13} color="#64748B" />
                          <span>{ord.mr_name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          ID: {ord.mr_id}
                        </div>
                      </td>

                      {/* Customer / Doctor */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600', color: '#0F172A' }}>{ord.customer_name}</div>
                        {ord.location_name && ord.location_name !== ord.customer_name && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} />
                            <span>{ord.location_name}</span>
                          </div>
                        )}
                      </td>

                      {/* HQ & Stocker */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#334155',
                          }}
                        >
                          {ord.hq_name}
                        </div>
                        {ord.stocker_name && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                            Stocker: {ord.stocker_name}
                          </div>
                        )}
                      </td>

                      {/* Ordered Items Preview */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <button
                          onClick={() => setSelectedOrderForItems(ord)}
                          style={{
                            background: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#0369A1',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                          <span>
                            {ord.items?.length || 0} Products ({ord.total_units} units)
                          </span>
                        </button>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', maxWidth: '200px' }} className="truncate">
                          {ord.items?.map((i) => i.product_name).join(', ') || 'No products'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '800', color: '#0F8B5A', fontSize: '14px' }}>
                          ₹{(ord.total_amount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Delivery Status Badge & Supervision Action */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '700',
                              width: 'fit-content',
                              backgroundColor: isDelivered ? '#DCFCE7' : '#FEF3C7',
                              color: isDelivered ? '#166534' : '#92400E',
                              border: `1px solid ${isDelivered ? '#86EFAC' : '#FCD34D'}`,
                            }}
                          >
                            {isDelivered ? <Truck size={12} /> : <Clock size={12} />}
                            <span>{isDelivered ? 'DELIVERED' : 'PENDING'}</span>
                          </span>

                          {/* Delivered Timestamp */}
                          {isDelivered && ord.delivered_at && (
                            <span style={{ fontSize: '10.5px', color: '#15803D' }}>
                              at {formatDateTimeDDMMYYYY(ord.delivered_at)}
                            </span>
                          )}

                          {/* Admin Supervision Toggle */}
                          <button
                            onClick={() => handleToggleDeliveryStatus(ord)}
                            disabled={isProcessing}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              cursor: 'pointer',
                              width: 'fit-content',
                            }}
                          >
                            {isProcessing ? 'Updating...' : isDelivered ? 'Mark Pending ↩' : 'Mark Delivered ✓'}
                          </button>
                        </div>
                      </td>

                      {/* HQ Acceptance & Stock Counting */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        {isAccepted ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                width: 'fit-content',
                                backgroundColor: '#EFF6FF',
                                color: '#1E40AF',
                                border: '1px solid #BFDBFE',
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>Accepted & Counted</span>
                            </span>
                            <span style={{ fontSize: '10.5px', color: '#1D4ED8' }}>
                              Deducted at {formatDateTimeDDMMYYYY(ord.accepted_at || ord.updated_at)}
                            </span>
                          </div>
                        ) : !isDelivered ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600',
                                width: 'fit-content',
                                backgroundColor: '#F1F5F9',
                                color: '#64748B',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              <span>Awaiting Delivery</span>
                            </span>
                            <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                              Cannot count before delivery
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button
                              onClick={() => setConfirmAcceptOrder(ord)}
                              disabled={isProcessing}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                backgroundColor: '#0F8B5A',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(15, 139, 90, 0.25)',
                              }}
                            >
                              <Check size={13} />
                              <span>Accept & Count Stock</span>
                            </button>
                            <span style={{ fontSize: '10.5px', color: '#0F8B5A', fontWeight: '500' }}>
                              Authorized for {ord.hq_name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Detail View Action */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedOrderForItems(ord)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#0F172A',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
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

            {/* Mobile Card List (Visible on screens < 768px) */}
        <div className="orders-mobile-card-list">
          {filteredOrders.map((ord) => {
            const isDelivered = ord.delivery_status === 'DELIVERED';
            const isAccepted = ord.hq_accepted;
            const isProcessing = isProcessingAction === ord.id;

            return (
              <div
                key={`mob-${ord.id}`}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Header: Order # + Date + Delivery Pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '800', color: '#0284C7', fontSize: '14px' }}>#{ord.order_number}</span>
                      <span
                        style={{
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#334155',
                        }}
                      >
                        {ord.hq_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {formatDateTimeDDMMYYYY(ord.created_at)}
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      backgroundColor: isDelivered ? '#DCFCE7' : '#FEF3C7',
                      color: isDelivered ? '#166534' : '#92400E',
                      border: `1px solid ${isDelivered ? '#86EFAC' : '#FCD34D'}`,
                    }}
                  >
                    {isDelivered ? <Truck size={11} /> : <Clock size={11} />}
                    <span>{isDelivered ? 'DELIVERED' : 'PENDING'}</span>
                  </span>
                </div>

                {/* Customer & MR Info */}
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>{ord.customer_name}</div>
                  {ord.location_name && ord.location_name !== ord.customer_name && (
                    <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={11} color="#0284C7" />
                      <span>{ord.location_name}</span>
                    </div>
                  )}
                  <div style={{ fontSize: '11.5px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <User size={12} color="#64748B" />
                    <span>MR: {ord.mr_name}</span>
                    {ord.stocker_name && <span style={{ color: '#94A3B8' }}>• Stocker: {ord.stocker_name}</span>}
                  </div>
                </div>

                {/* Products & Total Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                  <button
                    onClick={() => setSelectedOrderForItems(ord)}
                    style={{
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      color: '#0369A1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Eye size={12} />
                    <span>{ord.items?.length || 0} Products ({ord.total_units} units)</span>
                  </button>

                  <div style={{ fontWeight: '800', color: '#0F8B5A', fontSize: '15px' }}>
                    ₹{(ord.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Supervision & HQ Acceptance Action Strip */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                  {/* Toggle Delivery */}
                  <button
                    onClick={() => handleToggleDeliveryStatus(ord)}
                    disabled={isProcessing}
                    style={{
                      flex: '1 1 120px',
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: isDelivered ? '#F8FAFC' : '#0284C7',
                      color: isDelivered ? '#475569' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    {isProcessing ? 'Updating...' : isDelivered ? '↩ Mark Pending' : '✓ Mark Delivered'}
                  </button>

                  {/* HQ Acceptance Action */}
                  {isAccepted ? (
                    <div
                      style={{
                        flex: '1 1 140px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#1D4ED8',
                      }}
                    >
                      <CheckCircle2 size={13} color="#2563EB" />
                      <span>Stock Deducted ✓</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmAcceptOrder(ord)}
                      disabled={isProcessing || !isDelivered}
                      style={{
                        flex: '1 1 140px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: !isDelivered ? '1px dashed #CBD5E1' : '1px solid #16A34A',
                        backgroundColor: !isDelivered ? '#F8FAFC' : '#DCFCE7',
                        color: !isDelivered ? '#94A3B8' : '#166534',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: !isDelivered ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Check size={13} />
                      <span>{!isDelivered ? 'Awaiting Delivery' : `Accept for ${ord.hq_name}`}</span>
                    </button>
                  )}

                  {/* Details Button */}
                  <button
                    onClick={() => setSelectedOrderForItems(ord)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
        )}
    </div>

      {/* Itemized Order Details Modal */ }
  {
    selectedOrderForItems && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}
        onClick={() => setSelectedOrderForItems(null)}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            padding: '20px 22px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #E2E8F0',
              paddingBottom: '16px',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#E0F2FE',
                    color: '#0369A1',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '800',
                  }}
                >
                  #{selectedOrderForItems.order_number}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Order Details &amp; Product Breakdown
                </h2>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Placed on {formatDateTimeDDMMYYYY(selectedOrderForItems.created_at)} by {selectedOrderForItems.mr_name}
              </div>
            </div>
            <button
              onClick={() => setSelectedOrderForItems(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Meta Information Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                Customer / Doctor
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                {selectedOrderForItems.customer_name}
              </div>
              {selectedOrderForItems.location_name && (
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  📍 {selectedOrderForItems.location_name}
                </div>
              )}
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                Target HQ & Stocker
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                {selectedOrderForItems.hq_name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                📦 {selectedOrderForItems.stocker_name || 'Central Stocker'}
              </div>
            </div>
          </div>

          {/* Status Status Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: selectedOrderForItems.hq_accepted ? '#EFF6FF' : '#FFFBEB',
              border: `1px solid ${selectedOrderForItems.hq_accepted ? '#BFDBFE' : '#FDE68A'}`,
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                Workflow Status
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                Delivery: {selectedOrderForItems.delivery_status} • HQ Acceptance:{' '}
                {selectedOrderForItems.hq_accepted ? 'ACCEPTED & COUNTED' : 'PENDING'}
              </div>
            </div>

            {/* Action within modal if delivered & not accepted */}
            {selectedOrderForItems.delivery_status === 'DELIVERED' && !selectedOrderForItems.hq_accepted && (
              <button
                onClick={() => {
                  setConfirmAcceptOrder(selectedOrderForItems);
                }}
                style={{
                  backgroundColor: '#0F8B5A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Accept & Count Stock
              </button>
            )}
          </div>

          {/* Product Item List */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>
              Ordered Products ({selectedOrderForItems.items?.length || 0})
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600' }}>Product Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>Unit Price</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>Total</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600' }}>Distributor</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrderForItems.items || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0F172A' }}>
                        {item.product_name}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748B' }}>
                        ₹{(item.unit_price || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#0F8B5A' }}>
                        ₹{(item.total_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748B', fontSize: '12px' }}>
                        {item.distributor || 'Central Stocker'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '800', color: '#0F172A' }}>
                      Grand Total
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#0F172A' }}>
                      {selectedOrderForItems.total_units} units
                    </td>
                    <td style={{ padding: '10px 12px' }}></td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: '800',
                        fontSize: '15px',
                        color: '#0F8B5A',
                      }}
                    >
                      ₹{(selectedOrderForItems.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 12px' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Close Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => setSelectedOrderForItems(null)}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  {/* Confirmation Dialog for HQ Acceptance */ }
  {
    confirmAcceptOrder && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
        }}
        onClick={() => setConfirmAcceptOrder(null)}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16A34A',
              }}
            >
              <Check size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              Accept Order & Count Stock?
            </h3>
          </div>

          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px' }}>
            You are about to officially accept Order <strong>#{confirmAcceptOrder.order_number}</strong> for{' '}
            <strong>{confirmAcceptOrder.hq_name}</strong>.
          </p>

          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '12.5px',
              color: '#166534',
            }}
          >
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Counting will now start:</div>
            <div>• {confirmAcceptOrder.total_units} product units will be deducted from {confirmAcceptOrder.hq_name} inventory.</div>
            <div>• This order is already marked as DELIVERED by {confirmAcceptOrder.mr_name}.</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => setConfirmAcceptOrder(null)}
              disabled={isProcessingAction === confirmAcceptOrder.id}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleExecuteHqAcceptance(confirmAcceptOrder)}
              disabled={isProcessingAction === confirmAcceptOrder.id}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0F8B5A',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15, 139, 90, 0.3)',
              }}
            >
              {isProcessingAction === confirmAcceptOrder.id ? 'Accepting & Deducting...' : 'Yes, Accept & Deduct Stock'}
            </button>
          </div>
        </div>
      </div>
    )
  }
    </div >
  );
};
