import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AiQueryResponse {
  answer: string;
  intent: string;
  kpis: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    suspendedTasks: number;
    completionRate: string;
    activeMrs: number;
    totalVisits: number;
    dateRangeLabel: string;
  };
  breakdown: Array<Record<string, any>>;
  suggestedActions: string[];
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Date range filters
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Response state
  const [history, setHistory] = useState<Array<{ type: 'user' | 'ai'; text: string; data?: AiQueryResponse }>>([
    {
      type: 'ai',
      text: '👋 **Hello! I am your AHTRI AI Operations Copilot.**\n\nI query the ground-truth database directly to give you accurate operational insights. You can ask me questions like:\n- *"How many tasks are completed?"*\n- *"What is the work status across all MRs?"*\n- *"Show doctor visit summary for this week"*\n\nOr choose a quick prompt below to begin.',
    },
  ]);

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  // Preset date handler
  const handleDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const start = new Date(today.setDate(today.getDate() - today.getDay() + 1)).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(start);
      setEndDate(todayStr);
    }
  };

  // Query executor
  const handleSendQuery = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q) return;

    // Add user query to thread
    setHistory((prev) => [...prev, { type: 'user', text: q }]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          dateRange: { start: startDate, end: endDate },
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: AiQueryResponse = await res.json();

      setHistory((prev) => [
        ...prev,
        {
          type: 'ai',
          text: data.answer,
          data,
        },
      ]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          type: 'ai',
          text: `⚠️ **Could not complete query:** ${err.message || 'Please check backend connection.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Export Excel handler
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const res = await fetch(`${apiUrl}/api/ai/export/excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRange: { start: startDate, end: endDate },
        }),
      });

      if (!res.ok) throw new Error('Excel generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ahtri_FFA_Report_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error downloading Excel report: ' + err.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export PDF / Print handler
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await fetch(`${apiUrl}/api/ai/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRange: { start: startDate, end: endDate },
        }),
      });

      if (!res.ok) throw new Error('PDF report generation failed');

      const html = await res.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        alert('Please allow popups to preview and print the report.');
      }
    } catch (err: any) {
      alert('Error opening PDF report: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          border: '1px solid #CBD5E1',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
            color: '#FFFFFF',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>
                  AHTRI AI Operations Copilot
                </h3>
                <span
                  style={{
                    background: '#059669',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  LIVE RAG
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                Direct database intelligence, ground-truth analytics & executive reports
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Date Scope & Export Bar */}
        <div
          style={{
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Quick Date Range Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Date Scope:
            </span>
            {(['today', 'yesterday', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleDatePreset(p)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: '700',
                  border: '1px solid',
                  cursor: 'pointer',
                  background: datePreset === p ? '#1A3C6E' : '#FFFFFF',
                  color: datePreset === p ? '#FFFFFF' : '#475569',
                  borderColor: datePreset === p ? '#1A3C6E' : '#CBD5E1',
                }}
              >
                {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Download Reports Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              style={{
                background: '#0F8B5A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(15,139,90,0.2)',
              }}
              title="Download Excel spreadsheet with Tasks, Visits, and Attendance"
            >
              {isExportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              style={{
                background: '#FFFFFF',
                color: '#1A3C6E',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Print or save PDF audit report"
            >
              {isExportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
              <span>Print / PDF Report</span>
            </button>
          </div>
        </div>

        {/* Quick Suggested Queries */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #F1F5F9',
            padding: '8px 16px',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {[
            '📋 How many tasks are completed?',
            '🏥 What is the work status across all MRs?',
            '🩺 Show doctor visit coverage summary',
            '⏱️ Team attendance & clock-in status',
          ].map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(q.replace(/^[^s]+s/, ''))}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                background: '#F1F5F9',
                color: '#334155',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat / Response Scroll Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: '#FAFBFD',
          }}
        >
          {history.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.type === 'user' ? '75%' : '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {msg.type === 'user' ? (
                <div
                  style={{
                    background: '#1A3C6E',
                    color: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: '16px 16px 2px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(26,60,110,0.2)',
                  }}
                >
                  {msg.text}
                </div>
              ) : (
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Markdown Answer */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#1E293B',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: msg.text
                        .replace(/^### (.*$)/gim, '<h4 style="margin: 0 0 8px 0; color: #1A3C6E; font-size: 15px; font-weight: 800;">$1</h4>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/^- (.*$)/gim, '<div style="margin-left: 12px; margin-bottom: 4px;">• $1</div>')
                    }}
                  />

                  {/* KPI Cards when available */}
                  {msg.data && msg.data.kpis && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '10px',
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#1A3C6E' }}>{msg.data.kpis.totalTasks}</div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Total Calls</div>
                      </div>

                      <div style={{ background: '#F0FDF4', padding: '10px', borderRadius: '6px', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#166534' }}>{msg.data.kpis.completedTasks}</div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Completed</div>
                      </div>

                      <div style={{ background: '#F0F9FF', padding: '10px', borderRadius: '6px', border: '1px solid #BAE6FD', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0369A1' }}>{msg.data.kpis.completionRate}</div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#0369A1', textTransform: 'uppercase' }}>Completion %</div>
                      </div>

                      <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '6px', border: '1px solid #FDE68A', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#B45309' }}>{msg.data.kpis.pendingTasks}</div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>Pending</div>
                      </div>

                      {msg.data.kpis.suspendedTasks > 0 && (
                        <div style={{ background: '#FEF2F2', padding: '10px', borderRadius: '6px', border: '1px solid #FECACA', textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: '#DC2626' }}>{msg.data.kpis.suspendedTasks}</div>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' }}>Suspended</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Breakdown Table when available */}
                  {msg.data && msg.data.breakdown && msg.data.breakdown.length > 0 && (
                    <div style={{ marginTop: '14px', overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC' }}>
                            {Object.keys(msg.data.breakdown[0]).map((h, i) => (
                              <th key={i} style={{ padding: '7px 10px', borderBottom: '1px solid #CBD5E1', textAlign: 'left', fontWeight: '700', color: '#475569' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.data.breakdown.map((row, rIdx) => (
                            <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                              {Object.values(row).map((val, cIdx) => (
                                <td key={cIdx} style={{ padding: '7px 10px', borderBottom: '1px solid #F1F5F9', color: '#334155' }}>
                                  {typeof val === 'string' && val.includes('%') ? (
                                    <span style={{ fontWeight: '700', color: '#0F8B5A' }}>{val}</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1A3C6E', fontSize: '12.5px', fontWeight: '600', padding: '12px' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Querying ground-truth database & calculating real-time metrics...</span>
            </div>
          )}
        </div>

        {/* Query Input Bar */}
        <div style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '12px 16px' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F8FAFC',
              border: '1.5px solid #CBD5E1',
              borderRadius: '8px',
              padding: '4px 6px 4px 14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <input
              type="text"
              placeholder="Ask anything (e.g., 'how many tasks completed', 'what is work status', 'attendance today')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '13px',
                color: '#0F172A',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              style={{
                background: query.trim() ? '#1A3C6E' : '#94A3B8',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: query.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Send size={14} />
              <span>Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
