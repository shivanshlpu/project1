import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Building,
  Plus,
  Edit2,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  X,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface Headquarter {
  id: string;
  name: string;
}

interface StockerItem {
  id: string;
  hq_id: string;
  hq_name: string;
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface MedicineItem {
  id: string;
  name: string;
  product_code: string;
  unit: string;
  base_price: number;
  is_active: boolean;
  low_stock_threshold: number;
}

interface StockerProductItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  medicine_code: string;
  unit: string;
  price: number;
  quantity: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  stocker_name: string;
  hq_name: string;
}

interface InventoryAuditItem {
  id: string;
  hq_id: string;
  stocker_id: string;
  stocker_name?: string;
  product_id: string;
  product_name?: string;
  opening_stock: number;
  change_quantity: number;
  new_stock: number;
  transaction_type: string;
  order_id?: string;
  reason?: string;
  user_name: string;
  created_at: string;
}

export const StockerManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'STOCKERS' | 'MEDICINES' | 'ALERTS' | 'AUDIT'>('INVENTORY');
  const [hqs, setHqs] = useState<Headquarter[]>([]);
  const [selectedHqId, setSelectedHqId] = useState<string>('hq-shahdol');

  // Stockers state
  const [stockers, setStockers] = useState<StockerItem[]>([]);
  const [selectedStockerId, setSelectedStockerId] = useState<string>('');
  const [isAddStockerModalOpen, setIsAddStockerModalOpen] = useState<boolean>(false);
  const [newStockerName, setNewStockerName] = useState<string>('');
  const [newStockerContact, setNewStockerContact] = useState<string>('');
  const [newStockerPhone, setNewStockerPhone] = useState<string>('');
  const [newStockerAddress, setNewStockerAddress] = useState<string>('');

  // Inventory state
  const [inventory, setInventory] = useState<StockerProductItem[]>([]);
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState<boolean>(false);
  const [stockEditTarget, setStockEditTarget] = useState<StockerProductItem | null>(null);
  const [stockAdjustmentQty, setStockAdjustmentQty] = useState<string>('0');
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState<string>('Warehouse replenishment');

  // Medicines state
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState<boolean>(false);
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedCode, setNewMedCode] = useState<string>('');
  const [newMedUnit, setNewMedUnit] = useState<string>('Strip of 10');
  const [newMedPrice, setNewMedPrice] = useState<string>('150');
  const [newMedThreshold, setNewMedThreshold] = useState<string>('15');

  // Alerts & Audit
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<InventoryAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Load HQs on mount
  useEffect(() => {
    const fetchHqs = async () => {
      try {
        const res = await fetch(`${apiUrl}/inventory/hqs`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setHqs(data);
            setSelectedHqId(data[0].id);
          }
        }
      } catch {}
    };
    fetchHqs();
  }, [apiUrl]);

  // Load stockers when HQ changes (§10)
  const fetchStockers = async () => {
    if (!selectedHqId) return;
    try {
      const res = await fetch(`${apiUrl}/inventory/stockers?hq_id=${selectedHqId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStockers(data);
          if (data.length > 0) {
            setSelectedStockerId(data[0].id);
          } else {
            setSelectedStockerId('');
            setInventory([]);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchStockers();
  }, [selectedHqId]);

  // Load stocker inventory when selectedStockerId changes (§12)
  const fetchInventory = async () => {
    if (!selectedStockerId) {
      setInventory([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/inventory/stockers/${selectedStockerId}/inventory`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInventory(data);
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedStockerId]);

  // Fetch medicines master (§11)
  const fetchMedicines = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/medicines`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMedicines(data);
        }
      }
    } catch {}
  };

  // Fetch alerts (§18)
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/alerts`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      }
    } catch {}
  };

  // Fetch audit trail (§19)
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/inventory/transactions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAuditLogs(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'MEDICINES') fetchMedicines();
    if (activeTab === 'ALERTS') fetchAlerts();
    if (activeTab === 'AUDIT') fetchAuditLogs();
  }, [activeTab]);

  // Handler: Add Stocker under HQ (§10)
  const handleAddStocker = async () => {
    if (!newStockerName.trim()) {
      alert('Please enter stocker name.');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/inventory/stockers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hq_id: selectedHqId,
          name: newStockerName.trim(),
          contact_person: newStockerContact.trim(),
          phone: newStockerPhone.trim(),
          address: newStockerAddress.trim(),
        }),
      });
      if (res.ok) {
        setIsAddStockerModalOpen(false);
        setNewStockerName('');
        setNewStockerContact('');
        setNewStockerPhone('');
        setNewStockerAddress('');
        fetchStockers();
      }
    } catch {}
  };

  // Handler: Add Medicine (§11)
  const handleAddMedicine = async () => {
    if (!newMedName.trim()) {
      alert('Please enter medicine name.');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/inventory/medicines`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newMedName.trim(),
          product_code: newMedCode.trim() || `MED-${Date.now().toString().slice(-4)}`,
          unit: newMedUnit.trim(),
          base_price: parseFloat(newMedPrice) || 100,
          low_stock_threshold: parseInt(newMedThreshold) || 10,
        }),
      });
      if (res.ok) {
        setIsAddMedicineModalOpen(false);
        setNewMedName('');
        setNewMedCode('');
        fetchMedicines();
        if (selectedStockerId) fetchInventory();
      }
    } catch {}
  };

  // Handler: Adjust Stock Quantity (§12, §13, §19)
  const handleSaveStockAdjustment = async () => {
    if (!stockEditTarget || !selectedStockerId) return;
    try {
      const res = await fetch(`${apiUrl}/inventory/stockers/${selectedStockerId}/adjust`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          medicine_id: stockEditTarget.medicine_id,
          quantity: parseInt(stockAdjustmentQty) || 0,
          transaction_type: 'ADJUSTMENT',
          reason: stockAdjustmentReason.trim(),
        }),
      });
      if (res.ok) {
        setIsUpdateStockModalOpen(false);
        setStockEditTarget(null);
        fetchInventory();
        fetchAlerts();
      }
    } catch {}
  };

  const selectedStocker = stockers.find((s) => s.id === selectedStockerId);
  const selectedHq = hqs.find((h) => h.id === selectedHqId);

  return (
    <div style={{ padding: '16px 14px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 260, flex: '1 1 280px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Boxes size={20} color="var(--color-brand)" style={{ flexShrink: 0 }} />
            <span>HQ Stocker &amp; Medicine Inventory</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Multi-HQ isolated inventory, medicine master catalog, real-time stock deduction, and shortage tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            className="btn-enterprise secondary"
            onClick={() => {
              fetchStockers();
              fetchInventory();
              fetchAlerts();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync Live Stock</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs - Smooth Horizontal Swipe on Mobile */}
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
          width: '100%',
        }}
      >
        <button
          onClick={() => setActiveTab('INVENTORY')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'INVENTORY' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'INVENTORY' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'INVENTORY' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Layers size={14} />
          <span>Stocker Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('STOCKERS')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'STOCKERS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'STOCKERS' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'STOCKERS' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Building size={14} />
          <span>HQ Stockers ({stockers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MEDICINES')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'MEDICINES' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'MEDICINES' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'MEDICINES' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Package size={14} />
          <span>Medicine Master</span>
        </button>

        <button
          onClick={() => setActiveTab('ALERTS')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'ALERTS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'ALERTS' ? '#DC2626' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'ALERTS' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <AlertTriangle size={14} color="#DC2626" />
          <span>Stock Shortage Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          style={{
            flex: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'AUDIT' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'AUDIT' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            boxShadow: activeTab === 'AUDIT' ? 'var(--shadow-xs)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={14} />
          <span>Inventory Audit Log</span>
        </button>
      </div>

      {/* HQ Selector Bar (Used across Inventory, Stockers, and Alerts) */}
      {(activeTab === 'INVENTORY' || activeTab === 'STOCKERS') && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 16,
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Select Headquarters (HQ):
              </span>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {hqs.map((hq) => {
                  const isSelected = selectedHqId === hq.id;
                  return (
                    <button
                      key={hq.id}
                      onClick={() => setSelectedHqId(hq.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: isSelected ? '1.5px solid var(--color-brand)' : '1px solid var(--color-border)',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        color: isSelected ? 'var(--color-brand)' : 'var(--color-text-main)',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hq.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stocker Selector under this HQ */}
            {activeTab === 'INVENTORY' && (
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  2. Select Stocker under {selectedHq?.name || 'Selected HQ'}:
                </span>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {stockers.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                      No stockers registered under this HQ yet.
                    </span>
                  ) : (
                    stockers.map((st) => {
                      const isSelected = selectedStockerId === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => setSelectedStockerId(st.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: isSelected ? '1.5px solid #0F8B5A' : '1px solid var(--color-border)',
                            background: isSelected ? '#ECFDF5' : '#FFFFFF',
                            color: isSelected ? '#065F46' : 'var(--color-text-main)',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Boxes size={13} color={isSelected ? '#0F8B5A' : '#64748B'} />
                          <span>{st.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 1: STOCKER INVENTORY ================= */}
      {activeTab === 'INVENTORY' && (
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
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                {selectedStocker ? `${selectedStocker.name} Inventory Catalog` : 'Select a Stocker'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                (HQ: {selectedHq?.name || '—'} • Isolated stock balance)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px', maxWidth: 280, minWidth: 180 }}>
              <input
                type="text"
                placeholder="Search medicine in this stocker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                  width: '100%',
                }}
              />
            </div>
          </div>

          {!selectedStockerId ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Please select a Stocker above to view and update its inventory.
            </div>
          ) : inventory.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No inventory records initialized for this stocker.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Medicine / Product</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>SKU Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Unit</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Base Price</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Current Stock Quantity</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status (§12 &amp; §17)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory
                    .filter((item) =>
                      !searchQuery.trim()
                        ? true
                        : item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.medicine_code.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item, idx) => {
                      const isNegative = item.quantity < 0;
                      const isZero = item.quantity === 0;

                      return (
                        <tr
                          key={item.id || idx}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: isNegative ? '#FEF2F2' : isZero ? '#FFFBEB' : '#FFFFFF',
                          }}
                        >
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {item.medicine_name}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#64748B', fontFamily: 'monospace' }}>
                            {item.medicine_code}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {item.unit}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#166534' }}>
                            ₹{item.price.toFixed(2)}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: isNegative ? '#DC2626' : isZero ? '#D97706' : '#0F172A',
                              }}
                            >
                              {item.quantity} {item.quantity < 0 ? '(Shortage Backorder)' : 'units'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  isNegative || isZero
                                    ? '#FEE2E2'
                                    : item.status === 'Low Stock'
                                    ? '#FEF3C7'
                                    : '#DCFCE7',
                                color:
                                  isNegative || isZero
                                    ? '#991B1B'
                                    : item.status === 'Low Stock'
                                    ? '#92400E'
                                    : '#166534',
                              }}
                            >
                              {isNegative
                                ? '⚠️ Shortage / Negative'
                                : isZero
                                ? 'Out of Stock'
                                : item.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setStockEditTarget(item);
                                setStockAdjustmentQty(String(item.quantity));
                                setStockAdjustmentReason('Admin manual adjustment');
                                setIsUpdateStockModalOpen(true);
                              }}
                              style={{
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                padding: '4px 10px',
                                borderRadius: 4,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Adjust Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: HQ STOCKERS ================= */}
      {activeTab === 'STOCKERS' && (
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
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
              Stockers &amp; Shops under {selectedHq?.name || 'Selected HQ'}
            </span>

            <button
              className="btn-enterprise"
              onClick={() => setIsAddStockerModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
            >
              <Plus size={14} />
              <span>Add Stocker to {selectedHq?.name}</span>
            </button>
          </div>

          {stockers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No stockers found for {selectedHq?.name}. Click "Add Stocker" to register one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Stocker Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>HQ Territory</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Contact Person</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Phone</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Address</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockers.map((st) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                        📦 {st.name}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#1E40AF', fontWeight: 600 }}>
                        {st.hq_name}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#334155' }}>
                        {st.contact_person || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#64748B' }}>
                        {st.phone || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#475569' }}>
                        {st.address || '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            background: st.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9',
                            color: st.status === 'ACTIVE' ? '#166534' : '#64748B',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedStockerId(st.id);
                            setActiveTab('INVENTORY');
                          }}
                          style={{
                            background: '#F0FDF4',
                            color: '#166534',
                            border: '1px solid #BBF7D0',
                            padding: '4px 10px',
                            borderRadius: 4,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          View Inventory →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: MEDICINE MASTER ================= */}
      {activeTab === 'MEDICINES' && (
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
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                Medicine &amp; Pharmaceutical Product Master Catalog (§11)
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                Fixed price, unit of measure, and active business status
              </span>
            </div>

            <button
              className="btn-enterprise"
              onClick={() => setIsAddMedicineModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
            >
              <Plus size={14} />
              <span>Add New Medicine</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Medicine Name</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>SKU Code</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Packaging Unit</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Fixed Base Price</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Low Stock Threshold</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Catalog Status</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med) => (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      💊 {med.name}
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#64748B' }}>
                      {med.product_code}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#334155' }}>
                      {med.unit}
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 800, color: '#166534' }}>
                      ₹{med.base_price.toFixed(2)}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>
                      {med.low_stock_threshold} units
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span
                        style={{
                          background: med.is_active ? '#DCFCE7' : '#FEE2E2',
                          color: med.is_active ? '#166534' : '#991B1B',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {med.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: STOCK ALERTS (§18) ================= */}
      {activeTab === 'ALERTS' && (
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
              background: '#FEF2F2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} />
                Critical Inventory Shortage &amp; Low Stock Warnings (§18)
              </span>
              <span style={{ fontSize: 11, color: '#7F1D1D', display: 'block', marginTop: 2 }}>
                Items where stock has reached 0, fallen negative (backorders), or dropped below configured threshold.
              </span>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <CheckCircle size={36} color="#10B981" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                All Stock Levels Healthy
              </p>
              <p style={{ fontSize: 12, color: '#64748B' }}>
                No medicines are currently out of stock or in negative shortage.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#FFF1F2', borderBottom: '1px solid #FECDD3' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Medicine</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Stocker Facility</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>HQ</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Current Stock</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Warning Level</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>Required Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((al, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #FEE2E2', background: '#FFFFFF' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {al.medicine_name}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1E3A8A' }}>
                        {al.stocker_name}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#475569' }}>
                        {al.hq_name}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: al.quantity <= 0 ? '#DC2626' : '#D97706' }}>
                        {al.quantity} {al.quantity < 0 ? '(Shortage Backorder)' : 'units'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            background: al.quantity < 0 ? '#FEE2E2' : al.quantity === 0 ? '#FEF3C7' : '#EFF6FF',
                            color: al.quantity < 0 ? '#991B1B' : al.quantity === 0 ? '#92400E' : '#1E40AF',
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {al.alert_type}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#DC2626' }}>
                        {al.action_required || 'Replenish Stock'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: AUDIT TRAIL (§19) ================= */}
      {activeTab === 'AUDIT' && (
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
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                Inventory Audit Trail &amp; Transaction Ledger (§19)
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                Every stock addition, order deduction, and adjustment is recorded with user and timestamp
              </span>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No inventory transactions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Timestamp</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Stocker Facility</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Product</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Opening Stock</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Change</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>New Stock</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Type / Reason</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    const isDeduction = log.change_quantity < 0;
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {formatDateDDMMYYYY(log.created_at)}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {log.stocker_name || log.stocker_id}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--color-brand)' }}>
                          {log.product_name || log.product_id}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>
                          {log.opening_stock}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: isDeduction ? '#DC2626' : '#166534' }}>
                          {isDeduction ? `${log.change_quantity}` : `+${log.change_quantity}`}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: '#0F172A' }}>
                          {log.new_stock}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#334155' }}>
                          <span
                            style={{
                              background: isDeduction ? '#FEE2E2' : '#EFF6FF',
                              color: isDeduction ? '#991B1B' : '#1E40AF',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 700,
                              marginRight: 6,
                            }}
                          >
                            {log.transaction_type}
                          </span>
                          {log.reason || (log.order_id ? `Order #${log.order_id}` : 'Stock update')}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>
                          {log.user_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Update Stock Quantity (§12 & §13) */}
      {isUpdateStockModalOpen && stockEditTarget && (
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
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
                Set Stock Quantity
              </h3>
              <button
                onClick={() => setIsUpdateStockModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Product: <strong>{stockEditTarget.medicine_name}</strong> ({stockEditTarget.medicine_code})<br />
              Stocker: <strong>{selectedStocker?.name}</strong> • HQ: <strong>{selectedHq?.name}</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                NEW STOCK QUANTITY (UNITS)
              </label>
              <input
                type="number"
                value={stockAdjustmentQty}
                onChange={(e) => setStockAdjustmentQty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />
              <span style={{ fontSize: 10.5, color: '#64748B', marginTop: 2, display: 'block' }}>
                Negative numbers indicate backorders/shortage (§17).
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                REASON / AUDIT NOTE (§19)
              </label>
              <input
                type="text"
                value={stockAdjustmentReason}
                onChange={(e) => setStockAdjustmentReason(e.target.value)}
                placeholder="e.g. Warehouse delivery, Batch transfer"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => setIsUpdateStockModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-enterprise"
                onClick={handleSaveStockAdjustment}
              >
                Save Stock Quantity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Stocker under HQ (§10) */}
      {isAddStockerModalOpen && (
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
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
                Add New Stocker under {selectedHq?.name}
              </h3>
              <button
                onClick={() => setIsAddStockerModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                STOCKER / SHOP NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Shahdol Stocker 3, City Medico"
                value={newStockerName}
                onChange={(e) => setNewStockerName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                CONTACT PERSON
              </label>
              <input
                type="text"
                placeholder="Manager / Proprietor name"
                value={newStockerContact}
                onChange={(e) => setNewStockerContact(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                PHONE NUMBER
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={newStockerPhone}
                onChange={(e) => setNewStockerPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                ADDRESS / LOCATION
              </label>
              <input
                type="text"
                placeholder="Warehouse or shop address"
                value={newStockerAddress}
                onChange={(e) => setNewStockerAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => setIsAddStockerModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-enterprise"
                onClick={handleAddStocker}
              >
                Register Stocker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Medicine (§11) */}
      {isAddMedicineModalOpen && (
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
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
                Add Medicine to Master Catalog (§11)
              </h3>
              <button
                onClick={() => setIsAddMedicineModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                PRODUCT / MEDICINE NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. CardioFix-50 (Telmisartan 40mg)"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  PRODUCT CODE / SKU
                </label>
                <input
                  type="text"
                  placeholder="e.g. MED-CF50"
                  value={newMedCode}
                  onChange={(e) => setNewMedCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  PACKAGING UNIT
                </label>
                <input
                  type="text"
                  placeholder="e.g. Strip of 10"
                  value={newMedUnit}
                  onChange={(e) => setNewMedUnit(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  BASE PRICE (₹) *
                </label>
                <input
                  type="number"
                  placeholder="180"
                  value={newMedPrice}
                  onChange={(e) => setNewMedPrice(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  LOW STOCK THRESHOLD
                </label>
                <input
                  type="number"
                  placeholder="15"
                  value={newMedThreshold}
                  onChange={(e) => setNewMedThreshold(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary"
                onClick={() => setIsAddMedicineModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-enterprise"
                onClick={handleAddMedicine}
              >
                Save Medicine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
