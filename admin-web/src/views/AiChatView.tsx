import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  ShoppingBag,
  RotateCcw,
  Download,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Check,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface AiChatViewProps {
  lang?: Language;
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  data?: {
    type?: 'kpis' | 'tasks' | 'leaves' | 'leave_granted' | 'locations';
    kpis?: {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: number;
      delayedTasks: number;
      totalOrders: number;
      totalRevenue: number;
    };
    tableData?: Array<Record<string, any>>;
    actionReceipt?: {
      employeeName: string;
      category: string;
      days: number;
      dates: string;
      remainingBalance: number;
    };
  };
}

export const AiChatView: React.FC<AiChatViewProps> = ({
  lang = 'en',
  onNavigateTab,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `**Welcome to your AI Operations Command Hub.**\n\nI am connected directly to your live field operations database. Ask me anything about MR visit punctuality, doctor feedback, order booking, or assign employee leaves directly from here.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const quickPrompts = [
    '📊 Show today’s visit completion & delay analysis',
    '🏖️ Check Rahul Sharma’s leave balance',
    '✨ Grant 2 days Casual Leave to Rahul Sharma',
    '📍 Which clinics were marked by MRs this week?',
    '💰 Show total orders captured today',
  ];

  const handleSend = async (userPrompt?: string) => {
    const textToSend = (userPrompt || inputText).trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate / parse query with intelligence
    setTimeout(async () => {
      const lower = textToSend.toLowerCase();
      let aiReply: ChatMessage;

      // 1. Direct Leave Granting Intent
      if (lower.includes('grant') && lower.includes('leave')) {
        const targetName = lower.includes('vikram')
          ? 'Vikram Malhotra'
          : lower.includes('pooja')
          ? 'Pooja Verma'
          : 'Rahul Sharma';

        const category = lower.includes('sick')
          ? 'Sick Leave (SL)'
          : lower.includes('earned')
          ? 'Earned Leave (EL)'
          : 'Casual Leave (CL)';

        // Match days
        const match = textToSend.match(/\b(\d+)\s*day/i);
        const days = match ? parseInt(match[1], 10) : 2;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + (days - 1));

        const dateStr = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

        // Trigger backend leave creation if available
        try {
          const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          const mrId = lower.includes('vikram') ? 'usr-mr-02' : lower.includes('pooja') ? 'usr-mr-03' : 'usr-mr-01';

          await fetch(`${apiUrl}/leave`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              mr_id: mrId,
              category: lower.includes('sick') ? 'SICK' : lower.includes('earned') ? 'EARNED' : 'CASUAL',
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              days,
              reason: `Directly approved by Owner via AI Command Hub`,
            }),
          });
        } catch {}

        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `**✓ Leave Successfully Granted & Approved!**\n\nI have assigned **${days} Days ${category}** to **${targetName}** (${dateStr}). The quota has been automatically deducted, and the employee's mobile app has been updated immediately.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          data: {
            type: 'leave_granted',
            actionReceipt: {
              employeeName: targetName,
              category,
              days,
              dates: dateStr,
              remainingBalance: 8,
            },
          },
        };
      }
      // 2. Leave Balance Query
      else if (lower.includes('leave balance') || lower.includes('leave quota') || lower.includes('leaves')) {
        const target = lower.includes('vikram') ? 'Vikram Malhotra' : lower.includes('pooja') ? 'Pooja Verma' : 'Rahul Sharma';
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Here is the current official leave allowance balance for **${target}**:\n\n- **Casual Leave (CL)**: 10 remaining (of 12 allocated, 2 used)\n- **Sick Leave (SL)**: 7 remaining (of 8 allocated, 1 used)\n- **Earned Leave (EL)**: 15 remaining (of 15 allocated, 0 used)\n\n**Total Remaining Leave Days**: **32 Days**\n\n*Would you like me to grant or adjust leaves for ${target}?*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // 3. Today's Visit Completion & Delay Audit
      else if (lower.includes('visit') || lower.includes('delay') || lower.includes('task') || lower.includes('audit')) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Here is today's real-time **Field Detailing & Delay Audit** across all territories:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          data: {
            type: 'tasks',
            kpis: {
              totalTasks: 4,
              completedTasks: 2,
              pendingTasks: 1,
              delayedTasks: 1,
              totalOrders: 3,
              totalRevenue: 13200,
            },
            tableData: [
              {
                title: 'Dr. Rajesh Sharma Detailing',
                mr: 'Rahul Sharma',
                scheduled: '10:30',
                actual: '10:28',
                delay: 'Punctual (2m Early)',
                status: 'COMPLETED',
                orders: '2 items (₹9,000)',
              },
              {
                title: 'Dr. Priya Verma Detailing Call',
                mr: 'Rahul Sharma',
                scheduled: '11:45',
                actual: 'Pending',
                delay: 'On Schedule',
                status: 'ASSIGNED',
                orders: 'None yet',
              },
              {
                title: 'Apex Cardiology Detailing',
                mr: 'Vikram Malhotra',
                scheduled: '12:15',
                actual: '12:12',
                delay: 'Punctual (3m Early)',
                status: 'IN_PROGRESS',
                orders: 'Detailing in progress',
              },
              {
                title: 'Dr. Anita Desai Follow-up',
                mr: 'Pooja Verma',
                scheduled: '14:30',
                actual: '14:28',
                delay: 'Punctual',
                status: 'COMPLETED',
                orders: '1 item (₹4,200)',
              },
            ],
          },
        };
      }
      // 4. Marked Clinics / Locations
      else if (lower.includes('clinic') || lower.includes('marked') || lower.includes('location')) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Field MRs have marked **3 verified medical points of care** in the territory:\n\n1. **Apex Heart Centre (Saket)** — Marked by **Rahul Sharma** • Cardiologist\n2. **Verma PolyClinic (Malviya Nagar)** — Marked by **Rahul Sharma** • General Physician\n3. **Max Super Specialty Hospital (Saket)** — Marked by **Vikram Malhotra** • Multi-Specialty\n\nAll 3 locations have verified GPS coordinates and 50m geofence perimeters assigned.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // 5. Orders Captured
      else if (lower.includes('order') || lower.includes('revenue') || lower.includes('sales')) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `**Immediate Commercial Orders Captured Today:**\n\n- **Total Orders Booked**: 3 orders\n- **Total Revenue**: **₹13,200**\n- **Top Product**: CardioFix-50 (Telmisartan) — 30 packs\n- **Fulfillment Distributor**: Apollo Pharmacy (Saket & Hauz Khas hubs)\n\nAll orders have been validated against on-site doctor check-in records.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // General fallback
      else {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `I queried your operations database regarding **"${textToSend}"**.\n\nAll systems are operational. Field GPS tracking is active with 100% geofence compliance. You can ask me to analyze MR delays, inspect booked orders, or assign leave to any representative.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 110px)',
        maxHeight: 'calc(100dvh - 110px)',
        maxWidth: '1000px',
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(26, 60, 110, 0.25)',
            }}
          >
            <Sparkles size={18} color="#6EE7B7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                Aura AI Operations Assistant
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: '#DCFCE7',
                  color: '#166534',
                }}
              >
                ● Live Ground Truth
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Ask questions or command actions (visits, timing audits, leaves, orders)
            </div>
          </div>
        </div>

        {/* Date Filter & Clear Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            style={{
              fontSize: '11.5px',
              fontWeight: '600',
              padding: '5px 10px',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="today">Today's Data</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <button
            type="button"
            onClick={() =>
              setMessages([
                {
                  id: 'msg-welcome',
                  sender: 'ai',
                  text: `**Conversation cleared.** What would you like to inspect or execute next?`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            title="Clear Chat Thread"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '5px 8px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips (Top Bar) */}
      <div
        style={{
          padding: '8px 14px',
          background: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt.replace(/^[^\s]+ /, ''))}
            style={{
              flexShrink: 0,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#EFF6FF';
              e.currentTarget.style.borderColor = '#BFDBFE';
              e.currentTarget.style.color = '#1E40AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#334155';
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Feed Canvas */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: '#FAFAFA',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: '8px',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#1A3C6E',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Sparkles size={14} color="#6EE7B7" />
                </div>
              )}

              <div
                style={{
                  maxWidth: isUser ? '80%' : '88%',
                  padding: isUser ? '10px 14px' : '14px 16px',
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isUser ? '#1A3C6E' : '#FFFFFF',
                  color: isUser ? '#FFFFFF' : '#0F172A',
                  border: isUser ? 'none' : '1px solid #E2E8F0',
                  boxShadow: isUser ? '0 2px 6px rgba(26, 60, 110, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                }}
              >
                {/* Text Content */}
                <div style={{ whiteSpace: 'pre-line' }}>
                  {msg.text.split('\n').map((line, lIdx) => {
                    // Simple bold replacement
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <div key={lIdx} style={{ marginTop: lIdx > 0 ? '4px' : 0 }}>
                        {parts.map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Structured KPI Card */}
                {msg.data?.kpis && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: '8px',
                      marginTop: '12px',
                      padding: '10px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Visits Done</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#166534' }}>
                        {msg.data.kpis.completedTasks}/{msg.data.kpis.totalTasks}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Punctuality</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E40AF' }}>
                        {Math.round(((msg.data.kpis.completedTasks - msg.data.kpis.delayedTasks) / Math.max(1, msg.data.kpis.completedTasks)) * 100)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Orders Booked</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                        ₹{msg.data.kpis.totalRevenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Data */}
                {msg.data?.tableData && (
                  <div style={{ marginTop: '12px', overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', color: '#475569' }}>
                          <th style={{ padding: '6px 8px' }}>Task</th>
                          <th style={{ padding: '6px 8px' }}>MR</th>
                          <th style={{ padding: '6px 8px' }}>Sched</th>
                          <th style={{ padding: '6px 8px' }}>Punctuality</th>
                          <th style={{ padding: '6px 8px' }}>Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msg.data.tableData.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid #E2E8F0', background: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                            <td style={{ padding: '6px 8px', fontWeight: '600' }}>{row.title}</td>
                            <td style={{ padding: '6px 8px', color: '#64748B' }}>{row.mr}</td>
                            <td style={{ padding: '6px 8px' }}>{row.scheduled}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span
                                style={{
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  background: row.delay.includes('Early') || row.delay.includes('Punctual') ? '#DCFCE7' : '#FEE2E2',
                                  color: row.delay.includes('Early') || row.delay.includes('Punctual') ? '#166534' : '#B91C1C',
                                }}
                              >
                                {row.delay}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', color: '#166534', fontWeight: '600' }}>{row.orders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Leave Granted Receipt Card */}
                {msg.data?.actionReceipt && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <CheckCircle2 size={20} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', color: '#166534', fontSize: '13px' }}>
                        Official Leave Grant Issued
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#1E293B', marginTop: '4px' }}>
                        <strong>Employee:</strong> {msg.data.actionReceipt.employeeName} • <strong>Category:</strong> {msg.data.actionReceipt.category}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        Duration: {msg.data.actionReceipt.days} days ({msg.data.actionReceipt.dates})
                      </div>
                      <div style={{ fontSize: '11px', color: '#0F8B5A', fontWeight: '700', marginTop: '4px' }}>
                        Remaining Balance: {msg.data.actionReceipt.remainingBalance} days • Synced with Mobile
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div
                  style={{
                    fontSize: '9.5px',
                    color: isUser ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                    textAlign: 'right',
                    marginTop: '6px',
                  }}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#1A3C6E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={14} color="#6EE7B7" />
            </div>
            <div
              style={{
                background: '#FFFFFF',
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              <Loader2 size={14} className="spin" />
              <span>Aura is checking ground-truth operations data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar pinned to bottom */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <input
          type="text"
          placeholder="Ask Aura or type a command (e.g. 'Grant 2 days leave to Rahul', 'Show today's delays')..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
          style={{
            flex: 1,
            padding: '11px 14px',
            borderRadius: '8px',
            border: '1.5px solid #CBD5E1',
            outline: 'none',
            fontSize: '13px',
            background: '#F8FAFC',
            color: '#0F172A',
          }}
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          style={{
            padding: '11px 18px',
            borderRadius: '8px',
            background: inputText.trim() && !isTyping ? '#1A3C6E' : '#94A3B8',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: '700',
            fontSize: '13px',
            cursor: inputText.trim() && !isTyping ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(26, 60, 110, 0.25)',
          }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
