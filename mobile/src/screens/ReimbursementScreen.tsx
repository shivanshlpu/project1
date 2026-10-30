import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface ReimbursementScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserHqId?: string;
  currentUserHqName?: string;
  onBack?: () => void;
}

interface BatchTaskItem {
  id: string;
  title: string;
  location_name?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';
  date?: string;
  batch_id?: string;
  batch_code?: string;
  completed_at?: string;
}

interface BatchReimbursementRecord {
  key: string;
  date: string;
  batch_id?: string;
  batch_code: string;
  batch_name: string;
  hq_name: string;
  distance_km: number;
  rate: number;
  total_payout: number;
  tasks: BatchTaskItem[];
  total_tasks: number;
  completed_tasks: number;
  is_100_percent_completed: boolean;
  status: 'ELIGIBLE' | 'LOCKED';
}

export const ReimbursementScreen: React.FC<ReimbursementScreenProps> = ({
  currentUserId,
  currentUserName,
  currentUserHqId,
  currentUserHqName = 'Shahdol',
  onBack,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ELIGIBLE' | 'LOCKED'>('ALL');

  const [records, setRecords] = useState<BatchReimbursementRecord[]>([]);

  const standardRate = 2.25;

  const loadReimbursementData = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      // 1. Fetch user tasks
      const tasksRes = await fetch(`${baseUrl}/tasks/my`, { headers }).catch(() => null);
      let userTasks: any[] = [];
      if (tasksRes && tasksRes.ok) {
        const tData = await tasksRes.json();
        if (Array.isArray(tData)) userTasks = tData;
      }

      // 2. Fetch monthly tour plans
      const tpRes = await fetch(`${baseUrl}/tour-plans/my`, { headers }).catch(() => null);
      let tourPlans: any[] = [];
      if (tpRes && tpRes.ok) {
        const tpData = await tpRes.json();
        if (Array.isArray(tpData)) tourPlans = tpData;
      }

      // 3. Fetch HQ route batches for distances & metadata
      const rbRes = await fetch(
        `${baseUrl}/territories/route-batches?hq_id=${encodeURIComponent(currentUserHqId || '')}`,
        { headers },
      ).catch(() => null);
      let hqBatches: any[] = [];
      if (rbRes && rbRes.ok) {
        const rbData = await rbRes.json();
        if (Array.isArray(rbData)) hqBatches = rbData;
      }

      // Build composite Batch Reimbursement Records
      const map = new Map<string, BatchReimbursementRecord>();

      // A. Populate from Tour Plan entries
      tourPlans.forEach((tp: any) => {
        let entries: any[] = [];
        if (Array.isArray(tp.entries)) {
          entries = tp.entries;
        } else if (typeof tp.entries === 'string') {
          try {
            entries = JSON.parse(tp.entries);
          } catch {}
        }

        entries.forEach((e: any, idx: number) => {
          const dateStr = (e.date || '').slice(0, 10);
          if (!dateStr) return;

          const batchCode = e.route_batch_code || e.batch_code || 'LOCAL';
          const recordKey = `${dateStr}_${batchCode}_${idx}`;

          const matchedBatch = hqBatches.find(
            (b) => b.batch_code === batchCode || b.id === e.route_batch_id,
          );

          const distKm = Number(
            e.distance_km || matchedBatch?.distance_km || 0,
          );
          const rate = Number(
            e.reimbursement_rate || matchedBatch?.standard_reimbursement_rate || standardRate,
          );
          const totalPayout = distKm * rate;

          map.set(recordKey, {
            key: recordKey,
            date: dateStr,
            batch_id: e.route_batch_id || matchedBatch?.id,
            batch_code: batchCode,
            batch_name: e.route_batch_name || matchedBatch?.name || e.destination || e.planned_area || 'Field Circuit',
            hq_name: e.hq_name || matchedBatch?.hq_name || currentUserHqName,
            distance_km: distKm,
            rate,
            total_payout: totalPayout,
            tasks: [],
            total_tasks: 0,
            completed_tasks: 0,
            is_100_percent_completed: false,
            status: 'LOCKED',
          });
        });
      });

      // B. Also aggregate any direct batches found in tasks that may not have TP entry
      userTasks.forEach((t: any) => {
        const tDate = (t.date || t.created_at || '').slice(0, 10);
        const tBatch = t.batch_code || t.batch_id || 'DIRECT';
        const key = `${tDate}_${tBatch}`;

        let existing = Array.from(map.values()).find(
          (r) => r.date === tDate && (r.batch_code === tBatch || r.batch_id === tBatch),
        );

        if (!existing) {
          const matchedBatch = hqBatches.find(
            (b) => b.batch_code === tBatch || b.id === tBatch,
          );
          const distKm = Number(matchedBatch?.distance_km || t.distance_km || 0);
          const rate = Number(matchedBatch?.standard_reimbursement_rate || standardRate);
          const newRecord: BatchReimbursementRecord = {
            key,
            date: tDate,
            batch_id: t.batch_id || matchedBatch?.id,
            batch_code: tBatch,
            batch_name: matchedBatch?.name || t.batch_name || t.location_name || 'Field Route',
            hq_name: t.hq_name || matchedBatch?.hq_name || currentUserHqName,
            distance_km: distKm,
            rate,
            total_payout: distKm * rate,
            tasks: [],
            total_tasks: 0,
            completed_tasks: 0,
            is_100_percent_completed: false,
            status: 'LOCKED',
          };
          map.set(key, newRecord);
          existing = newRecord;
        }

        // Attach task to this batch record
        if (existing) {
          existing.tasks.push({
            id: t.id,
            title: t.title || t.location_name || 'Doctor Detailing Call',
            location_name: t.location_name,
            status: t.status,
            date: tDate,
            batch_id: t.batch_id,
            batch_code: t.batch_code,
            completed_at: t.completed_at,
          });
        }
      });

      // C. Evaluate 100% completion rule for each batch record:
      // STRICT RULE: Reimbursement is unlocked ONLY once all tasks for that batch are COMPLETED
      const calculatedRecords = Array.from(map.values()).map((rec) => {
        const total = rec.tasks.length;
        const completed = rec.tasks.filter((t) => t.status === 'COMPLETED').length;
        const isAllDone = total > 0 && completed === total;

        return {
          ...rec,
          total_tasks: total,
          completed_tasks: completed,
          is_100_percent_completed: isAllDone,
          status: isAllDone ? ('ELIGIBLE' as const) : ('LOCKED' as const),
        };
      });

      // Sort by date descending
      calculatedRecords.sort((a, b) => b.date.localeCompare(a.date));
      setRecords(calculatedRecords);
    } catch (e) {
      console.warn('Failed to load reimbursement data:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReimbursementData();
  }, [currentUserId, currentUserHqId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReimbursementData();
  };

  // Compute Aggregates
  const totalEligibleAmount = useMemo(() => {
    return records
      .filter((r) => r.is_100_percent_completed)
      .reduce((sum, r) => sum + r.total_payout, 0);
  }, [records]);

  const totalLockedAmount = useMemo(() => {
    return records
      .filter((r) => !r.is_100_percent_completed)
      .reduce((sum, r) => sum + r.total_payout, 0);
  }, [records]);

  const completedBatchesCount = useMemo(() => {
    return records.filter((r) => r.is_100_percent_completed).length;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (filterMode === 'ELIGIBLE') return records.filter((r) => r.is_100_percent_completed);
    if (filterMode === 'LOCKED') return records.filter((r) => !r.is_100_percent_completed);
    return records;
  }, [records, filterMode]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Travel Reimbursements</Text>
          <Text style={styles.headerSubtitle}>
            Verified mileage payouts for 100% completed route batches
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1A3C6E']} />}
      >
        {/* KPI Strip */}
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, styles.kpiEligible]}>
            <Text style={styles.kpiLabel}>Eligible Reimbursement</Text>
            <Text style={styles.kpiValueGreen}>₹{totalEligibleAmount.toFixed(2)}</Text>
            <Text style={styles.kpiSub}>100% Batch Tasks Done</Text>
          </View>

          <View style={[styles.kpiCard, styles.kpiLocked]}>
            <Text style={styles.kpiLabel}>Locked / Pending</Text>
            <Text style={styles.kpiValueAmber}>₹{totalLockedAmount.toFixed(2)}</Text>
            <Text style={styles.kpiSub}>Incomplete Tasks</Text>
          </View>
        </View>

        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, { flex: 1 }]}>
            <Text style={styles.kpiLabel}>Completed Batches</Text>
            <Text style={[styles.kpiValueDark]}>{completedBatchesCount} Batches</Text>
            <Text style={styles.kpiSub}>Fully verified circuits</Text>
          </View>

          <View style={[styles.kpiCard, { flex: 1 }]}>
            <Text style={styles.kpiLabel}>Company Rate Policy</Text>
            <Text style={[styles.kpiValueDark]}>₹{standardRate} / km</Text>
            <Text style={styles.kpiSub}>Standard reimbursement</Text>
          </View>
        </View>

        {/* Policy Rule Clarification Banner */}
        <View style={styles.policyBanner}>
          <Text style={styles.policyTitle}>⚖️ Strict Reimbursement Completion Policy</Text>
          <Text style={styles.policyText}>
            Reimbursement for any route batch is <Text style={{ fontWeight: '800' }}>only calculated and unlocked once ALL tasks assigned to that batch are 100% completed</Text>. If even one visit remains pending or suspended, the reimbursement is strictly held as locked until full batch completion.
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filterMode === 'ALL' && styles.filterBtnActive]}
            onPress={() => setFilterMode('ALL')}
          >
            <Text style={[styles.filterBtnText, filterMode === 'ALL' && styles.filterBtnTextActive]}>
              All ({records.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filterMode === 'ELIGIBLE' && styles.filterBtnActive]}
            onPress={() => setFilterMode('ELIGIBLE')}
          >
            <Text style={[styles.filterBtnText, filterMode === 'ELIGIBLE' && styles.filterBtnTextActive]}>
              ✅ Eligible ({completedBatchesCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filterMode === 'LOCKED' && styles.filterBtnActive]}
            onPress={() => setFilterMode('LOCKED')}
          >
            <Text style={[styles.filterBtnText, filterMode === 'LOCKED' && styles.filterBtnTextActive]}>
              🔒 Locked ({records.length - completedBatchesCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Records List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#1A3C6E" style={{ marginVertical: 30 }} />
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No reimbursement records found</Text>
            <Text style={styles.emptyText}>
              Complete your planned route batch tasks to unlock eligible mileage payouts here.
            </Text>
          </View>
        ) : (
          filteredRecords.map((r) => {
            const isEligible = r.is_100_percent_completed;
            const pct = r.total_tasks > 0 ? Math.round((r.completed_tasks / r.total_tasks) * 100) : 0;

            return (
              <View
                key={r.key}
                style={[
                  styles.recordCard,
                  isEligible ? styles.cardEligibleBorder : styles.cardLockedBorder,
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>📅 {formatDateDDMMYYYY(r.date)}</Text>
                      </View>
                      <View style={styles.batchCodeBadge}>
                        <Text style={styles.batchCodeText}>{r.batch_code}</Text>
                      </View>
                      <Text style={styles.hqText}>🏛️ {r.hq_name}</Text>
                    </View>
                    <Text style={styles.batchNameTitle}>{r.batch_name}</Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusPill,
                      isEligible ? styles.statusPillEligible : styles.statusPillLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isEligible ? styles.statusTextGreen : styles.statusTextAmber,
                      ]}
                    >
                      {isEligible ? '✅ 100% COMPLETED' : `🔒 LOCKED (${r.completed_tasks}/${r.total_tasks})`}
                    </Text>
                  </View>
                </View>

                {/* Travel & Mileage Metrics */}
                <View style={styles.metricsBox}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Round-Trip Distance</Text>
                    <Text style={styles.metricVal}>{r.distance_km} km</Text>
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Standard Rate</Text>
                    <Text style={styles.metricVal}>₹{r.rate}/km</Text>
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Potential Payout</Text>
                    <Text style={styles.metricVal}>₹{r.total_payout.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Task Completion Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.progressLabel}>
                      Batch Task Completion: <Text style={{ fontWeight: '800' }}>{r.completed_tasks} of {r.total_tasks} Done ({pct}%)</Text>
                    </Text>
                    <Text style={[styles.progressStatusText, isEligible ? { color: '#0F8B5A' } : { color: '#B45309' }]}>
                      {isEligible ? 'Full Batch Completed' : `${r.total_tasks - r.completed_tasks} Pending`}
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: isEligible ? '#0F8B5A' : '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Tasks Breakdown in this Batch */}
                {r.tasks.length > 0 && (
                  <View style={styles.tasksListContainer}>
                    <Text style={styles.tasksListHeader}>Batch Assigned Tasks:</Text>
                    {r.tasks.map((t) => {
                      const isTaskDone = t.status === 'COMPLETED';
                      const isTaskSuspended = t.status === 'SUSPENDED';

                      return (
                        <View key={t.id} style={styles.taskItemRow}>
                          <Text style={{ fontSize: 13, marginRight: 6 }}>
                            {isTaskDone ? '✅' : isTaskSuspended ? '⚠️' : '⏳'}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.taskTitleText} numberOfLines={1}>
                              {t.title}
                            </Text>
                            {t.location_name ? (
                              <Text style={styles.taskLocationText}>{t.location_name}</Text>
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.taskStatusText,
                              isTaskDone
                                ? { color: '#0F8B5A' }
                                : isTaskSuspended
                                ? { color: '#DC2626' }
                                : { color: '#D97706' },
                            ]}
                          >
                            {t.status}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Final Reimbursement Calculation Box */}
                {isEligible ? (
                  <View style={styles.eligibleBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eligibleBoxTitle}>🎉 Reimbursement Claim Unlocked!</Text>
                      <Text style={styles.eligibleBoxSub}>
                        {r.distance_km} km × ₹{r.rate}/km — Ready for payout
                      </Text>
                    </View>
                    <Text style={styles.eligibleBoxAmount}>₹{r.total_payout.toFixed(2)}</Text>
                  </View>
                ) : (
                  <View style={styles.lockedBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lockedBoxTitle}>🔒 Reimbursement Amount: ₹0.00</Text>
                      <Text style={styles.lockedBoxSub}>
                        Full payout of ₹{r.total_payout.toFixed(2)} will unlock automatically once all tasks in this batch are completed.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#1A3C6E',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: '#93C5FD', marginTop: 2 },
  scrollArea: { flex: 1, padding: 14 },
  kpiContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiEligible: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  kpiLocked: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  kpiLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  kpiValueGreen: { fontSize: 18, fontWeight: '900', color: '#0F8B5A', marginVertical: 2 },
  kpiValueAmber: { fontSize: 18, fontWeight: '900', color: '#B45309', marginVertical: 2 },
  kpiValueDark: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginVertical: 2 },
  kpiSub: { fontSize: 10, color: '#64748B' },
  policyBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  policyTitle: { fontSize: 12, fontWeight: '800', color: '#1E40AF', marginBottom: 4 },
  policyText: { fontSize: 11, color: '#334155', lineHeight: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#1A3C6E', borderColor: '#1A3C6E' },
  filterBtnText: { fontSize: 11.5, fontWeight: '700', color: '#64748B' },
  filterBtnTextActive: { color: '#FFFFFF' },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  emptyText: { fontSize: 11.5, color: '#64748B', textAlign: 'center', lineHeight: 16 },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardEligibleBorder: { borderColor: '#86EFAC' },
  cardLockedBorder: { borderColor: '#E2E8F0' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  dateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateBadgeText: { fontSize: 10.5, fontWeight: '700', color: '#334155' },
  batchCodeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  batchCodeText: { fontSize: 10.5, fontWeight: '800', color: '#1D4ED8' },
  hqText: { fontSize: 10.5, color: '#64748B', fontWeight: '600' },
  batchNameTitle: { fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 5 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillEligible: { backgroundColor: '#DCFCE7' },
  statusPillLocked: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  statusTextGreen: { color: '#15803D' },
  statusTextAmber: { color: '#B45309' },
  metricsBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCol: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 10, color: '#64748B', marginBottom: 2 },
  metricVal: { fontSize: 12.5, fontWeight: '800', color: '#0F172A' },
  progressContainer: { marginBottom: 12 },
  progressLabel: { fontSize: 11, color: '#334155' },
  progressStatusText: { fontSize: 11, fontWeight: '700' },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: { height: '100%', borderRadius: 3 },
  tasksListContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tasksListHeader: { fontSize: 10.5, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  taskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskTitleText: { fontSize: 11.5, fontWeight: '600', color: '#1E293B' },
  taskLocationText: { fontSize: 10, color: '#64748B' },
  taskStatusText: { fontSize: 10, fontWeight: '800', marginLeft: 6 },
  eligibleBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#0F8B5A',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eligibleBoxTitle: { fontSize: 12, fontWeight: '800', color: '#166534' },
  eligibleBoxSub: { fontSize: 10.5, color: '#15803D', marginTop: 1 },
  eligibleBoxAmount: { fontSize: 18, fontWeight: '900', color: '#0F8B5A', marginLeft: 10 },
  lockedBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedBoxTitle: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  lockedBoxSub: { fontSize: 10.5, color: '#94A3B8', marginTop: 2, lineHeight: 14 },
});
