import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Table,
  FileSpreadsheet,
  FileCode,
  Filter,
  Calendar,
  MapPin,
  User,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Clock,
  Printer,
  Search,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

interface ReportsViewProps {
  lang?: Language;
}

export interface ReportRecord {
  id: string;
  date: string;
  time: string;
  mr_name: string;
  doctor_name: string;
  clinic: string;
  territory: string;
  lat: number;
  lng: number;
  distance_m: number;
  geofence_status: 'VERIFIED_ON_SITE' | 'OUTSIDE_GEOFENCE';
  duration_mins: number;
  order_amount: number;
  products_detailed: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ lang = 'en' }) => {
  const t = translations[lang];

  // Dynamic Datasets from Live Operations
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [mrList, setMrList] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [tasksRes, usersRes] = await Promise.all([
          fetch(`${apiUrl}/tasks`, { headers }),
          fetch(`${apiUrl}/users?role=MR`, { headers }),
        ]);

        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (Array.isArray(uData)) setMrList(uData);
        }

        if (tasksRes.ok) {
          const tData = await tasksRes.json();
          if (Array.isArray(tData)) {
            const mapped: ReportRecord[] = tData.map((t: any, idx: number) => {
              const orderTotal = t.orders
                ? t.orders.reduce((sum: number, o: any) => sum + (o.total_amount || (o.unit_price ? o.unit_price * o.quantity : 0)), 0)
                : 0;
              const productsStr = t.orders && t.orders.length > 0
                ? t.orders.map((o: any) => o.product_name || o.name).filter(Boolean).join(', ')
                : (t.products_detailed || 'Product Detailing');
              const dStr = t.completed_at ? t.completed_at.split('T')[0] : (t.date || t.scheduled_date || new Date().toISOString().split('T')[0]);
              const timeStr = t.completed_at ? new Date(t.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (t.time || '10:00 AM');

              return {
                id: t.id ? `REC-${String(t.id).slice(-6)}` : `REC-${idx + 1}`,
                date: dStr,
                time: timeStr,
                mr_name: t.assigned_mr_name || 'Medical Representative',
                doctor_name: t.doctor_name || t.target_name || 'Healthcare Practitioner',
                clinic: t.clinic_name || t.clinic || 'Medical Clinic',
                territory: t.territory || 'HQ Territory',
                lat: t.latitude || 23.2953,
                lng: t.longitude || 81.3586,
                distance_m: t.distance_m || (t.verification_distance_m ?? 12),
                geofence_status: t.status === 'COMPLETED' ? 'VERIFIED_ON_SITE' : (t.geofence_status || 'VERIFIED_ON_SITE'),
                duration_mins: t.duration_minutes || 25,
                order_amount: orderTotal,
                products_detailed: productsStr,
              };
            });
            setRecords(mapped);
          }
        }
      } catch (err) {
        console.warn('ReportsView fetch error:', err);
      }
    };

    fetchData();
  }, []);

  // UI Filter State
  const [selectedReport, setSelectedReport] = useState('visits');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf' | 'json'>('csv');
  const [filterDateRange, setFilterDateRange] = useState('ALL');
  const [filterTerritory, setFilterTerritory] = useState('ALL');
  const [filterMr, setFilterMr] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterOrderOnly, setFilterOrderOnly] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === filteredRecords.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const reportTypes = [
    { id: 'visits', name: 'Doctor Detailing & Call Analysis', desc: 'Call duration, geofence status, sample units dispensed, and orders' },
    { id: 'attendance', name: 'Field Attendance & Geotag Log', desc: 'Punch-in/out timestamps and GPS coordinates for payroll' },
    { id: 'tasks', name: 'Task & Geofence Compliance', desc: 'Audit trail of completed calls vs 50m perimeter boundary' },
    { id: 'dcr', name: 'Daily Call Reports (DCR) Ledger', desc: 'Daily submission logs, product focus coverage, orders taken' },
    { id: 'expenses', name: 'Field Expense Claims & Conveyance', desc: 'Category-wise claims (TA/DA, fuel, food) with voucher audit' },
  ];

  const uniqueTerritories = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.territory) set.add(r.territory);
    });
    return Array.from(set);
  }, [records]);

  const uniqueMRs = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.mr_name) set.add(r.mr_name);
    });
    mrList.forEach((m) => {
      if (m.name) set.add(m.name);
    });
    return Array.from(set);
  }, [records, mrList]);

  // Filtering Logic with Dynamic Daily, Weekly, and Monthly Filters
  const filteredRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.slice(0, 7);

    return records.filter((rec) => {
      if (filterDateRange === 'TODAY' && rec.date !== todayStr) return false;
      if (filterDateRange === 'WEEK' && (rec.date < sevenDaysAgoStr || rec.date > todayStr)) return false;
      if (filterDateRange === 'MONTH' && !rec.date.startsWith(currentMonthPrefix)) return false;
      if (filterTerritory !== 'ALL' && !rec.territory.includes(filterTerritory)) return false;
      if (filterMr !== 'ALL' && rec.mr_name !== filterMr) return false;
      if (filterStatus !== 'ALL' && rec.geofence_status !== filterStatus) return false;
      if (filterOrderOnly && rec.order_amount <= 0) return false;
      return true;
    });
  }, [records, filterDateRange, filterTerritory, filterMr, filterStatus, filterOrderOnly]);

  // Aggregate KPI Metrics for Executive Summary
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const verifiedCount = filteredRecords.filter((r) => r.geofence_status === 'VERIFIED_ON_SITE').length;
    const complianceRate = total > 0 ? ((verifiedCount / total) * 100).toFixed(1) : '100.0';
    const totalRevenue = filteredRecords.reduce((acc, r) => acc + r.order_amount, 0);
    const avgDuration =
      total > 0
        ? Math.round(filteredRecords.reduce((acc, r) => acc + r.duration_mins, 0) / total)
        : 0;

    return { total, complianceRate, totalRevenue, avgDuration };
  }, [filteredRecords]);

  // Professional RFC 4180 CSV Download Handler (Supports Selective Downloading)
  const downloadCSV = (onlySelected: boolean = false) => {
    const targetRecords = onlySelected && selectedRowIds.size > 0
      ? filteredRecords.filter((r) => selectedRowIds.has(r.id))
      : filteredRecords;

    if (targetRecords.length === 0) {
      setDownloadNotice('No records selected for export.');
      setTimeout(() => setDownloadNotice(null), 3000);
      return;
    }

    let headers: string[] = [];
    let rows: any[][] = [];

    if (selectedReport === 'attendance') {
      headers = [
        'Record ID',
        'Date',
        'Time',
        'Field Representative',
        'Territory',
        'Latitude',
        'Longitude',
        'Attendance State',
        'Geofence Compliance',
        'Call Logs Synced',
      ];
      rows = targetRecords.map((r) => [
        `"${r.id}"`,
        `"${formatDateDDMMYYYY(r.date)}"`,
        `"${r.time}"`,
        `"${r.mr_name}"`,
        `"${r.territory}"`,
        r.lat.toFixed(5),
        r.lng.toFixed(5),
        `"PRESENT (MARKED DONE)"`,
        `"${r.geofence_status}"`,
        r.duration_mins > 0 ? `"SYNCED"` : `"PENDING"`,
      ]);
    } else {
      headers = [
        'Record ID',
        'Date',
        'Time',
        'Medical Representative',
        'Doctor Name',
        'Clinic / Hospital',
        'Territory',
        'Latitude',
        'Longitude',
        'Perimeter Distance (m)',
        'Geofence Compliance',
        'Call Duration (mins)',
        'Order Value (INR)',
        'Products Detailed',
      ];
      rows = targetRecords.map((r) => [
        `"${r.id}"`,
        `"${formatDateDDMMYYYY(r.date)}"`,
        `"${r.time}"`,
        `"${r.mr_name}"`,
        `"${r.doctor_name}"`,
        `"${r.clinic}"`,
        `"${r.territory}"`,
        r.lat.toFixed(5),
        r.lng.toFixed(5),
        r.distance_m.toFixed(1),
        `"${r.geofence_status}"`,
        r.duration_mins,
        r.order_amount,
        `"${r.products_detailed}"`,
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AHTRI_${selectedReport}_Report_${onlySelected ? 'Selected_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice(`Professional CSV Report exported successfully (${targetRecords.length} ${onlySelected ? 'selected' : 'filtered'} records).`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  // Professional Formatted Executive PDF Generation (Supports Selective Downloading)
  const downloadPDF = (onlySelected: boolean = false) => {
    const targetRecords = onlySelected && selectedRowIds.size > 0
      ? filteredRecords.filter((r) => selectedRowIds.has(r.id))
      : filteredRecords;

    if (targetRecords.length === 0) {
      setDownloadNotice('No records selected for PDF export.');
      setTimeout(() => setDownloadNotice(null), 3000);
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AHTRI BIOTECH - Executive Field Operations Report</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #ffffff; }
          .header { border-bottom: 2px solid #1a3c6e; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #1a3c6e; margin: 0; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin: 3px 0 0 0; }
          .meta-box { font-size: 11px; text-align: right; color: #475569; }
          .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
          .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
          .kpi-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th { background: #1a3c6e; color: #ffffff; text-align: left; padding: 8px; font-weight: 600; }
          td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .status-ok { color: #166534; font-weight: 700; }
          .status-err { color: #991b1b; font-weight: 700; }
          .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">AHTRI BIOTECH</div>
            <div class="subtitle">Field Force Automation - Executive Compliance & Call Detailing Audit</div>
          </div>
          <div class="meta-box">
            <div>Report: <strong>${selectedReport.toUpperCase()} AUDIT LEDGER ${onlySelected ? '(SELECTED RECORDS)' : ''}</strong></div>
            <div>Generated: ${formatDateTimeDDMMYYYY(new Date())}</div>
            <div>Territory: ${filterTerritory === 'ALL' ? 'All Territories' : filterTerritory}</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Exported Records</div>
            <div class="kpi-val">${targetRecords.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Geofence Compliance</div>
            <div class="kpi-val" style="color:#0f8b5a;">${stats.complianceRate}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Orders Booked</div>
            <div class="kpi-val" style="color:#1a3c6e;">₹${targetRecords.reduce((sum, r) => sum + r.order_amount, 0).toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Avg Meeting Duration</div>
            <div class="kpi-val">${stats.avgDuration} mins</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date & Time</th>
              <th>Field MR</th>
              <th>Doctor & Clinic</th>
              <th>Territory</th>
              <th>Perimeter Distance</th>
              <th>Compliance</th>
              <th>Duration</th>
              <th>Order Value</th>
            </tr>
          </thead>
          <tbody>
            ${targetRecords
              .map(
                (r) => `
              <tr>
                <td><strong>${r.id}</strong></td>
                <td>${formatDateDDMMYYYY(r.date)} ${r.time}</td>
                <td>${r.mr_name}</td>
                <td><strong>${r.doctor_name}</strong><br/><span style="color:#64748b;">${r.clinic}</span></td>
                <td>${r.territory}</td>
                <td>${r.distance_m}m</td>
                <td class="${r.geofence_status === 'VERIFIED_ON_SITE' ? 'status-ok' : 'status-err'}">
                  ${r.geofence_status === 'VERIFIED_ON_SITE' ? 'VERIFIED (≤50m)' : 'FLAGGED (>50m)'}
                </td>
                <td>${r.duration_mins} mins</td>
                <td><strong>₹${r.order_amount.toLocaleString()}</strong></td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Report generated by AHTRI FFA Command Center v2.4 - Confidential Enterprise Document</div>
          <div>Authorized Sign-off: Area Business Manager (Anil Kumar)</div>
        </div>
      </body>
      </html>
    `;

    // Create a hidden iframe for seamless printing without popup blockers
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 400);
    }

    setDownloadNotice(`Executive Report prepared for ${targetRecords.length} ${onlySelected ? 'selected' : 'filtered'} records.`);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  const handleExportAction = (onlySelected: boolean = false) => {
    if (selectedFormat === 'csv') {
      downloadCSV(onlySelected);
    } else if (selectedFormat === 'pdf') {
      downloadPDF(onlySelected);
    } else {
      // JSON
      const targetRecords = onlySelected && selectedRowIds.size > 0
        ? filteredRecords.filter((r) => selectedRowIds.has(r.id))
        : filteredRecords;

      const jsonBlob = new Blob([JSON.stringify(targetRecords, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(jsonBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AHTRI_${selectedReport}_Report_${onlySelected ? 'Selected_' : ''}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadNotice(`Structured JSON exported (${targetRecords.length} records).`);
      setTimeout(() => setDownloadNotice(null), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Toolbar */}
      <div className="enterprise-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#1A3C6E" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                {t.reportsTitle}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '12.5px' }}>
              {t.reportsDesc}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <button
              className={`btn-enterprise ${selectedFormat === 'csv' ? 'primary' : 'secondary'}`}
              onClick={() => setSelectedFormat('csv')}
            >
              <FileSpreadsheet size={13} />
              <span>CSV Spreadsheet</span>
            </button>
            <button
              className={`btn-enterprise ${selectedFormat === 'pdf' ? 'primary' : 'secondary'}`}
              onClick={() => setSelectedFormat('pdf')}
            >
              <Printer size={13} />
              <span>Executive PDF / Print</span>
            </button>
            <button
              className={`btn-enterprise ${selectedFormat === 'json' ? 'primary' : 'secondary'}`}
              onClick={() => setSelectedFormat('json')}
            >
              <FileCode size={13} />
              <span>JSON Dataset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dataset Selector Grid */}
      <div className="enterprise-panel" style={{ padding: '16px 20px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          1. Select Report Category
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
          {reportTypes.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                border: `1.5px solid ${selectedReport === r.id ? '#1A3C6E' : '#E2E8F0'}`,
                background: selectedReport === r.id ? '#EFF6FF' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontWeight: '700', color: '#1A3C6E', fontSize: '12.5px', marginBottom: '2px' }}>
                {r.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '15px' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPREHENSIVE FILTER CONTROLS */}
      <div className="enterprise-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Filter size={15} color="#1A3C6E" />
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            2. Executive Filter Controls
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
          {/* Date Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              {t.filterDate}
            </label>
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">All Recorded Dates</option>
              <option value="TODAY">Daily (Today)</option>
              <option value="WEEK">Weekly (Last 7 Days)</option>
              <option value="MONTH">Monthly (Current Month)</option>
            </select>
          </div>

          {/* Territory Area */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              {t.filterArea}
            </label>
            <select
              value={filterTerritory}
              onChange={(e) => setFilterTerritory(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">{t.allTerritories}</option>
              {uniqueTerritories.map((terr) => (
                <option key={terr} value={terr}>{terr}</option>
              ))}
            </select>
          </div>

          {/* Medical Representative */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              {t.filterMr}
            </label>
            <select
              value={filterMr}
              onChange={(e) => setFilterMr(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">{t.allMRs}</option>
              {uniqueMRs.map((mr) => (
                <option key={mr} value={mr}>{mr}</option>
              ))}
            </select>
          </div>

          {/* Geofence Status */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              {t.filterStatus}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="VERIFIED_ON_SITE">{t.verified} (≤50m)</option>
              <option value="OUTSIDE_GEOFENCE">{t.rejected} (&gt;50m)</option>
            </select>
          </div>
        </div>

        {/* Checkbox toggle for orders */}
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="ordersOnlyCheck"
            checked={filterOrderOnly}
            onChange={(e) => setFilterOrderOnly(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="ordersOnlyCheck" style={{ fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            Show only visits with immediate booked orders (&gt; ₹0)
          </label>
        </div>
      </div>

      {/* KPI METRIC SUMMARY CHIPS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{t.totalRecords}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
            {stats.total} Calls
          </div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{t.complianceRate}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F8B5A', marginTop: '2px' }}>
            {stats.complianceRate}%
          </div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{t.totalOrders}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1A3C6E', marginTop: '2px' }}>
            ₹{stats.totalRevenue.toLocaleString()}
          </div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{t.avgDuration}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#334155', marginTop: '2px' }}>
            {stats.avgDuration} mins
          </div>
        </div>
      </div>

      {/* INTERACTIVE DATA PREVIEW TABLE */}
      <div className="enterprise-panel">
        <div className="panel-header-bar">
          <div className="panel-headline">
            <Table size={16} color="#0052cc" />
            <span>{t.previewTable} ({filteredRecords.length} Rows Matching Filters)</span>
          </div>

          <div className="panel-controls-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedRowIds.size > 0 && (
              <button
                className="btn-enterprise primary sm"
                style={{ background: '#0F8B5A', borderColor: '#0F8B5A' }}
                onClick={() => handleExportAction(true)}
              >
                <Download size={13} />
                <span>Export Selected ({selectedRowIds.size})</span>
              </button>
            )}
            <button className="btn-enterprise secondary sm" onClick={() => handleExportAction(false)}>
              <Download size={13} />
              <span>
                {selectedFormat === 'csv'
                  ? `Export All Filtered CSV (${filteredRecords.length})`
                  : selectedFormat === 'pdf'
                  ? `Export All Filtered PDF (${filteredRecords.length})`
                  : `Export All Filtered JSON (${filteredRecords.length})`}
              </span>
            </button>
          </div>
        </div>

        {downloadNotice && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '8px 16px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} />
            {downloadNotice}
          </div>
        )}

        <div className="enterprise-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    title="Select All Records"
                    checked={filteredRecords.length > 0 && selectedRowIds.size === filteredRecords.length}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#0052cc' }}
                  />
                </th>
                <th>Record ID</th>
                <th>Date & Time</th>
                <th>Field Representative</th>
                <th>Doctor & Clinic</th>
                <th>Territory Area</th>
                <th>Distance (Geofence)</th>
                <th>Compliance Status</th>
                <th>Duration</th>
                <th>Order Booked</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    No records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isChecked = selectedRowIds.has(rec.id);
                  return (
                    <tr key={rec.id} style={{ background: isChecked ? '#EFF6FF' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(rec.id)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#0052cc' }}
                        />
                      </td>
                      <td style={{ fontWeight: '700', fontSize: '11.5px', color: '#1A3C6E' }}>{rec.id}</td>
                      <td>
                        <div>{formatDateDDMMYYYY(rec.date)}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>{rec.time}</div>
                      </td>
                      <td style={{ fontWeight: '600' }}>{rec.mr_name}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{rec.doctor_name}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>{rec.clinic}</div>
                      </td>
                      <td style={{ color: '#475569' }}>{rec.territory}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: rec.distance_m <= 50 ? '#0F8B5A' : '#DC2626' }}>
                          {rec.distance_m}m
                        </span>{' '}
                        <span style={{ fontSize: '10px', color: '#64748B' }}>(≤50m)</span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            rec.geofence_status === 'VERIFIED_ON_SITE' ? 'success' : 'alert'
                          }`}
                        >
                          {rec.geofence_status === 'VERIFIED_ON_SITE' ? t.verified : t.rejected}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{rec.duration_mins} mins</td>
                      <td>
                        {rec.order_amount > 0 ? (
                          <span style={{ fontWeight: '700', color: '#0F8B5A' }}>
                            ₹{rec.order_amount.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '11px' }}>Detailing Only</span>
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
  );
};
