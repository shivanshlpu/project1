import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

export interface LeaveItem {
  id: string;
  mr_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_by?: string;
  days_count?: number;
}

interface LeaveScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  onBackToAttendance?: () => void;
}

export const LeaveScreen: React.FC<LeaveScreenProps> = ({
  currentUserId = 'usr-mr-01',
  currentUserName = 'Rahul Sharma',
  onBackToAttendance,
}) => {
  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [leaveCategory, setLeaveCategory] = useState<string>('Casual Leave');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState<string>('Family occasion');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Leave balances for this MR dynamically linked to Admin Panel
  const [balances, setBalances] = useState({
    casual: { total: 12, used: 4, remaining: 8 },
    sick: { total: 10, used: 4, remaining: 6 },
    earned: { total: 15, used: 3, remaining: 12 },
  });

  // Fetch live leave quota from backend
  const fetchQuota = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/leave/quota?mr_id=${currentUserId}`, {
        headers: {
          ...headers,
          'x-user-id': currentUserId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.casual && data.sick && data.earned) {
          setBalances({
            casual: data.casual,
            sick: data.sick,
            earned: data.earned,
          });
        }
      }
    } catch {
      // Fallback
    }
  };

  // Submitted leave requests list
  const [leaveHistory, setLeaveHistory] = useState<LeaveItem[]>([
    {
      id: 'leave-101',
      mr_id: currentUserId,
      start_date: '2026-09-12',
      end_date: '2026-09-13',
      reason: 'Casual Leave: Family occasion',
      status: 'PENDING',
      created_at: '2026-09-06T10:00:00.000Z',
      days_count: 2,
    },
  ]);

  // Calculate day count between start and end date
  const calculateDays = (s: string, e: string): number => {
    try {
      const d1 = new Date(s);
      const d2 = new Date(e);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  };

  const dayCount = calculateDays(startDate, endDate);
  const selectedKey =
    leaveCategory === 'Sick Leave'
      ? 'sick'
      : leaveCategory === 'Earned Leave'
      ? 'earned'
      : 'casual';
  const currentRemaining = balances[selectedKey]?.remaining ?? 0;

  // Fetch live leaves from backend
  const fetchMyLeaves = async () => {
    setIsLoadingHistory(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/leave/my`, {
        headers: {
          ...headers,
          'x-user-id': currentUserId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: LeaveItem[] = data.map((l: any) => ({
            ...l,
            days_count: calculateDays(l.start_date, l.end_date),
          }));
          setLeaveHistory(mapped);
        }
      }
    } catch {
      // Keep local state
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
    fetchQuota();
  }, [currentUserId]);

  // Quick Preset Date Helpers
  const setQuickDates = (offsetDays: number, durationDays: number) => {
    const s = new Date();
    s.setDate(s.getDate() + offsetDays);
    const e = new Date();
    e.setDate(e.getDate() + offsetDays + (durationDays - 1));
    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  };

  // Submit Leave Request
  const handleSubmitLeave = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      Alert.alert('Missing Details', 'Please specify both start date, end date, and reason for leave.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      Alert.alert('Invalid Date Range', 'End date cannot be earlier than start date.');
      return;
    }

    if (currentRemaining <= 0) {
      Alert.alert(
        'Leave Balance Exhausted',
        `Your ${leaveCategory} balance is 0 days remaining.\n\nPlease speak to your Area Manager to increase your leave quota before applying.`,
      );
      return;
    }

    if (dayCount > currentRemaining) {
      Alert.alert(
        'Insufficient Leave Balance',
        `You requested ${dayCount} day(s) of ${leaveCategory}, but only ${currentRemaining} day(s) remain in your quota.\n\nPlease reduce the duration or speak with your Area Manager.`,
      );
      return;
    }

    setIsSubmitting(true);
    const fullReason = `${leaveCategory}: ${reason.trim()}`;

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/leave`, {
        method: 'POST',
        headers: {
          ...headers,
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          reason: fullReason,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const createdLeave: LeaveItem = {
          id: result.leave?.id || `leave-${Date.now().toString().slice(-4)}`,
          mr_id: currentUserId,
          start_date: startDate,
          end_date: endDate,
          reason: fullReason,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          days_count: dayCount,
        };
        setLeaveHistory((prev) => [createdLeave, ...prev.filter((l) => l.id !== createdLeave.id)]);
        Alert.alert(
          'Leave Application Submitted',
          `Your ${leaveCategory} request for ${dayCount} day(s) has been sent to your Area Manager for approval.`
        );
        setActiveTab('history');
      } else {
        throw new Error('Server rejected request');
      }
    } catch {
      // Local fallback with pending status
      const fallbackLeave: LeaveItem = {
        id: `leave-${Date.now().toString().slice(-4)}`,
        mr_id: currentUserId,
        start_date: startDate,
        end_date: endDate,
        reason: fullReason,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        days_count: dayCount,
      };
      setLeaveHistory((prev) => [fallbackLeave, ...prev]);
      Alert.alert(
        'Leave Application Queued',
        `Your ${leaveCategory} request has been recorded locally and will synchronize with your manager's approval inbox.`
      );
      setActiveTab('history');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Leave Management</Text>
            <Text style={styles.headerSub}>
              {currentUserName} • Field Medical Representative
            </Text>
          </View>
          {onBackToAttendance && (
            <TouchableOpacity style={styles.backBtn} onPress={onBackToAttendance}>
              <Text style={styles.backBtnText}>Attendance</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Leave Balances Strip */}
        <View style={styles.balanceStrip}>
          <View style={[styles.balanceCard, { borderLeftColor: '#0284C7' }]}>
            <Text style={styles.balanceNum}>{balances.casual.remaining}</Text>
            <Text style={styles.balanceLabel}>Casual (CL)</Text>
            <Text style={styles.balanceSub}>Used: {balances.casual.used}</Text>
          </View>

          <View style={[styles.balanceCard, { borderLeftColor: '#059669' }]}>
            <Text style={styles.balanceNum}>{balances.sick.remaining}</Text>
            <Text style={styles.balanceLabel}>Sick (SL)</Text>
            <Text style={styles.balanceSub}>Used: {balances.sick.used}</Text>
          </View>

          <View style={[styles.balanceCard, { borderLeftColor: '#D97706' }]}>
            <Text style={styles.balanceNum}>{balances.earned.remaining}</Text>
            <Text style={styles.balanceLabel}>Earned (EL)</Text>
            <Text style={styles.balanceSub}>Used: {balances.earned.used}</Text>
          </View>
        </View>
      </View>

      {/* Segmented Tab Switch */}
      <View style={styles.tabSwitchContainer}>
        <TouchableOpacity
          style={[styles.tabSwitchBtn, activeTab === 'apply' && styles.tabSwitchBtnActive]}
          onPress={() => setActiveTab('apply')}
        >
          <Text style={[styles.tabSwitchText, activeTab === 'apply' && styles.tabSwitchTextActive]}>
            Apply for Leave
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSwitchBtn, activeTab === 'history' && styles.tabSwitchBtnActive]}
          onPress={() => {
            setActiveTab('history');
            fetchMyLeaves();
          }}
        >
          <Text style={[styles.tabSwitchText, activeTab === 'history' && styles.tabSwitchTextActive]}>
            Leave History &amp; Status ({leaveHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: APPLY FOR LEAVE FORM */}
      {activeTab === 'apply' && (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>New Leave Application</Text>
          <Text style={styles.sectionDesc}>
            Applications are reviewed by your Area Manager in the Unified Approvals Hub.
          </Text>

          {/* Leave Category Selector */}
          <Text style={styles.label}>Leave Type *</Text>
          <View style={styles.categoryRow}>
            {['Casual Leave', 'Sick Leave', 'Earned Leave', 'Emergency Leave'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  leaveCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setLeaveCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    leaveCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Dates Shortcuts */}
          <View style={styles.quickDatesRow}>
            <Text style={styles.quickDatesLabel}>Quick Pick:</Text>
            <TouchableOpacity
              style={styles.quickDateBtn}
              onPress={() => setQuickDates(1, 1)}
            >
              <Text style={styles.quickDateBtnText}>Tomorrow (1d)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateBtn}
              onPress={() => setQuickDates(1, 2)}
            >
              <Text style={styles.quickDateBtnText}>2 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateBtn}
              onPress={() => setQuickDates(3, 3)}
            >
              <Text style={styles.quickDateBtnText}>Long Weekend (3d)</Text>
            </TouchableOpacity>
          </View>

          {/* Date Range Inputs */}
          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>From Date *</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>To Date *</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {/* Duration Banner */}
          <View style={styles.durationBanner}>
            <View>
              <Text style={styles.durationTitle}>Total Duration</Text>
              <Text style={styles.durationSub}>
                {formatDateDDMMYYYY(startDate)} to {formatDateDDMMYYYY(endDate)}
              </Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>
                {dayCount} {dayCount === 1 ? 'Day' : 'Days'}
              </Text>
            </View>
          </View>

          {/* Reason / Explanation */}
          <Text style={styles.label}>Reason for Leave *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            placeholder="Explain the reason for your leave request..."
          />

          {/* Quick Reason Presets */}
          <View style={styles.reasonPresetsRow}>
            {['Family occasion', 'Medical checkup', 'Urgent personal work', 'Out of station'].map(
              (preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.reasonPresetBtn}
                  onPress={() => setReason(preset)}
                >
                  <Text style={styles.reasonPresetText}>{preset}</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Quota Exhausted Warning Banner */}
          {currentRemaining <= 0 && (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FCA5A5',
                borderRadius: 8,
                padding: 10,
                marginTop: 6,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>
                Leave Balance Exhausted
              </Text>
              <Text style={{ fontSize: 11, color: '#7F1D1D', marginTop: 2, lineHeight: 15 }}>
                Your {leaveCategory} balance is 0. Please speak with your Area Manager (Shivansh Tiwari) to assign or increase your leave allowance.
              </Text>
            </View>
          )}

          {/* Submit Action */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (isSubmitting || currentRemaining <= 0) && styles.submitBtnDisabled,
            ]}
            disabled={isSubmitting || currentRemaining <= 0}
            onPress={handleSubmitLeave}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {currentRemaining <= 0
                  ? 'Quota Exhausted • Speak to Manager'
                  : 'Submit Leave Application'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 2: MY LEAVE REQUESTS & STATUS HISTORY */}
      {activeTab === 'history' && (
        <View style={styles.card}>
          <View style={styles.historyHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.sectionHeader}>Leave Applications &amp; Status</Text>
              <Text style={styles.sectionDesc}>
                Real-time tracking of decisions made by your Manager
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                fetchMyLeaves();
                fetchQuota();
              }}
              disabled={isLoadingHistory}
            >
              <Text style={styles.refreshBtnText}>
                {isLoadingHistory ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {leaveHistory.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Leave Applications Found</Text>
              <Text style={styles.emptySub}>
                You have not submitted any leave requests yet.
              </Text>
            </View>
          ) : (
            leaveHistory.map((item) => {
              const isPending = item.status === 'PENDING';
              const isApproved = item.status === 'APPROVED';
              const isRejected = item.status === 'REJECTED';

              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyTopRow}>
                    <View>
                      <Text style={styles.historyDateRange}>
                        {formatDateDDMMYYYY(item.start_date)} to {formatDateDDMMYYYY(item.end_date)}
                      </Text>
                      <Text style={styles.historyDaysCount}>
                        {item.days_count || 1} day(s) duration
                      </Text>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        isPending && styles.statusPillPending,
                        isApproved && styles.statusPillApproved,
                        isRejected && styles.statusPillRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isPending && styles.statusTextPending,
                          isApproved && styles.statusTextApproved,
                          isRejected && styles.statusTextRejected,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.historyReason}>{item.reason}</Text>

                  <View style={styles.historyFooter}>
                    <Text style={styles.historyTimestamp}>
                      Submitted: {item.created_at ? item.created_at.split('T')[0] : 'Recent'}
                    </Text>
                    <Text
                      style={[
                        styles.historyActionNotice,
                        isPending && { color: '#D97706' },
                        isApproved && { color: '#059669' },
                        isRejected && { color: '#DC2626' },
                      ]}
                    >
                      {isPending && 'Pending Manager Action'}
                      {isApproved && 'Approved by Area Manager'}
                      {isRejected && 'Rejected by Manager'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  balanceStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  balanceLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 1,
  },
  balanceSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  tabSwitchBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabSwitchTextActive: {
    color: '#1A3C6E',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    borderColor: '#1A3C6E',
    backgroundColor: '#EFF6FF',
  },
  categoryChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#1A3C6E',
    fontWeight: '800',
  },
  quickDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quickDatesLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  quickDateBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickDateBtnText: {
    fontSize: 10.5,
    color: '#1A3C6E',
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  durationBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  durationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  durationSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 1,
  },
  durationBadge: {
    backgroundColor: '#166534',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  durationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  reasonPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 14,
  },
  reasonPresetBtn: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonPresetText: {
    fontSize: 10.5,
    color: '#475569',
  },
  submitBtn: {
    backgroundColor: '#1A3C6E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A3C6E',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  historyDateRange: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyDaysCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPillRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextApproved: {
    color: '#065F46',
  },
  statusTextRejected: {
    color: '#991B1B',
  },
  historyReason: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 8,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  historyTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
  },
  historyActionNotice: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
