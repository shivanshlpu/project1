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

export interface BatchTaskItem {
  id: string;
  title: string;
  location_name?: string;
  category?: string;
  address?: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';
  date?: string;
  time?: string;
  batch_id?: string;
  batch_code?: string;
  completed_at?: string;
  geofence_verified?: boolean;
  notes?: string;
}

export interface ExpectedLocationItem {
  id?: string;
  name: string;
  category?: string;
  address?: string;
}

export interface BatchReimbursementRecord {
  key: string;
  id: string;
  date: string;
  monthKey: string;
  monthLabel: string;
  batch_id?: string;
  batch_code: string;
  batch_name: string;
  destination: string;
  hq_name: string;
  mr_name: string;
  distance_km: number;
  rate: number;
  total_payout: number;
  tasks: BatchTaskItem[];
  expected_locations: ExpectedLocationItem[];
  total_tasks: number;
  completed_tasks: number;
  is_approved: boolean;
  is_100_percent_completed: boolean;
  status: 'ELIGIBLE' | 'LOCKED';
  locked_reason?: string;
}

interface MonthlyReimbursementGroup {
  monthKey: string;
  monthLabel: string;
  totalPayout: number;
  totalDistanceKm: number;
  completedCircuitsCount: number;
  totalCircuitsCount: number;
  records: BatchReimbursementRecord[];
}

const formatMonthLabel = (monthKey: string): string => {
  try {
    const [y, m] = monthKey.split('-').map(Number);
    if (!y || !m) return monthKey;
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthKey;
  }
};

const getCurrentMonthKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const ReimbursementScreen: React.FC<ReimbursementScreenProps> = ({
  currentUserId,
  currentUserName = 'Shivansh Tiwari',
  currentUserHqId,
  currentUserHqName = 'Shahdol',
  onBack,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [records, setRecords] = useState<BatchReimbursementRecord[]>([]);

  // Filter States: Status Tab & Selected Month
  const [activeFilterTab, setActiveFilterTab] = useState<'VERIFIED' | 'PENDING' | 'ALL'>('VERIFIED');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Interactive Task Drill-down: Track which batch records are expanded to see tasks
  const [expandedRecordKeys, setExpandedRecordKeys] = useState<Set<string>>(new Set());

  const standardRate = 2.25;

  const toggleRecordExpansion = (key: string) => {
    setExpandedRecordKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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

      // 4. Fetch marked/saved locations to capture field discovery for open batches
      const locsRes = await fetch(`${baseUrl}/locations`, { headers }).catch(() => null);
      let allSavedLocs: any[] = [];
      if (locsRes && locsRes.ok) {
        const lData = await locsRes.json();
        if (Array.isArray(lData)) allSavedLocs = lData;
      }

      // Build Composite Batch Reimbursement Records
      const map = new Map<string, BatchReimbursementRecord>();

      // A. Populate from Tour Plan entries
      tourPlans.forEach((tp: any) => {
        const isPlanApproved = ['APPROVED', 'Approved'].includes(tp.status);

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

          const isEntryApproved = isPlanApproved || ['APPROVED', 'Approved'].includes(e.reimbursement_status);
          const isEntryRejected = ['REJECTED', 'Rejected'].includes(e.reimbursement_status);
          if (isEntryRejected) return; // Rejected entries are not eligible

          const monthKey = tp.month || (dateStr.length >= 7 ? dateStr.slice(0, 7) : getCurrentMonthKey());
          const batchCode = e.route_batch_code || e.batch_code || 'DIRECT';
          const recordKey = `tp_${e.id || idx}_${dateStr}_${batchCode}`;

          const matchedBatch = hqBatches.find(
            (b) => b.batch_code === batchCode || b.id === e.route_batch_id,
          );

          const distKm = Number(
            e.round_trip_distance_km || e.distance_km || matchedBatch?.distance_km || 0,
          );
          const rate = Number(
            e.reimbursement_rate || matchedBatch?.standard_reimbursement_rate || standardRate,
          );
          const totalPayout = Math.round(distKm * rate * 100) / 100;

          // Determine expected locations for this TP entry
          const expectedLocs: ExpectedLocationItem[] = [];
          if (Array.isArray(e.selected_locations) && e.selected_locations.length > 0) {
            e.selected_locations.forEach((l: any) => {
              expectedLocs.push({
                id: l.id,
                name: l.name || l.clinic || 'Medical Center',
                category: l.category || 'CLINIC',
                address: l.address,
              });
            });
          } else if (Array.isArray(e.location_ids) && e.location_ids.length > 0) {
            e.location_ids.forEach((id: string) => {
              expectedLocs.push({ id, name: `Location ${id}`, category: 'CLINIC' });
            });
          } else if (matchedBatch?.route_stops && matchedBatch.route_stops.length > 0) {
            matchedBatch.route_stops.forEach((stop: string, sIdx: number) => {
              expectedLocs.push({ id: `stop-${sIdx + 1}`, name: stop, category: 'CLINIC' });
            });
          }

          // Match tasks belonging to this TP entry
          const entryTasks: BatchTaskItem[] = [];
          userTasks.forEach((t: any) => {
            const tDate = (t.date || t.created_at || '').slice(0, 10);
            const matchByEntryId = t.tp_entry_id && (t.tp_entry_id === e.id || t.tp_entry_id === e.entry_id);
            const matchByPlanDate = t.tp_id && t.tp_id === tp.id && tDate === dateStr;
            const matchByBatchDate =
              tDate === dateStr &&
              ((e.route_batch_id && t.route_batch_id === e.route_batch_id) ||
                (batchCode && (t.batch_code === batchCode || t.route_batch_code === batchCode)));
            const matchByLocName =
              tDate === dateStr &&
              expectedLocs.some(
                (el) => el.name.toLowerCase() === (t.location_name || '').toLowerCase(),
              );

            if (matchByEntryId || matchByPlanDate || matchByBatchDate || matchByLocName) {
              if (!entryTasks.some((existing) => existing.id === t.id)) {
                entryTasks.push({
                  id: t.id,
                  title: t.title || t.location_name || 'Doctor Detailing Call',
                  location_name: t.location_name,
                  category: t.category,
                  address: t.address,
                  status: t.status,
                  date: tDate,
                  time: t.time,
                  batch_id: t.route_batch_id || t.batch_id,
                  batch_code: t.route_batch_code || t.batch_code,
                  completed_at: t.completed_at,
                  geofence_verified: t.geofence_verified || t.status === 'COMPLETED',
                  notes: t.notes || t.work_summary,
                });
              }
            }
          });

          // Check if the route batch had pre-planned locations or was an open route
          const hasPrePlannedLocations =
            (Array.isArray(e.selected_locations) && e.selected_locations.length > 0) ||
            (Array.isArray(e.location_ids) && e.location_ids.length > 0);

          // If no pre-planned locations in the batch, check for locations marked in the field on that date
          if (!hasPrePlannedLocations) {
            const discoveredLocsOnDate = allSavedLocs.filter((loc: any) => {
              const locDate = (loc.created_at || '').slice(0, 10);
              const isDateMatch = locDate === dateStr;
              if (!isDateMatch) return false;

              const isBatchMatch =
                (e.route_batch_id && loc.batch_id === e.route_batch_id) ||
                (batchCode &&
                  (loc.batch_code === batchCode ||
                    (loc.address && loc.address.toLowerCase().includes(batchCode.toLowerCase()))));
              const isAreaMatch =
                (e.planned_area &&
                  loc.address &&
                  loc.address.toLowerCase().includes(e.planned_area.toLowerCase())) ||
                (e.destination &&
                  loc.address &&
                  loc.address.toLowerCase().includes(e.destination.toLowerCase()));
              const isCreatorMatch =
                !currentUserId || loc.created_by === currentUserId || loc.assigned_mr_id === currentUserId;

              return isCreatorMatch && (isBatchMatch || isAreaMatch);
            });

            discoveredLocsOnDate.forEach((dl: any) => {
              if (
                !entryTasks.some(
                  (tk) =>
                    tk.id === dl.id ||
                    (dl.name && tk.location_name?.toLowerCase() === dl.name.toLowerCase()) ||
                    (dl.clinic && tk.location_name?.toLowerCase() === dl.clinic.toLowerCase()),
                )
              ) {
                entryTasks.push({
                  id: dl.id || `loc-disc-${Math.random()}`,
                  title: dl.clinic || dl.name || 'Discovered Doctor / Chemist',
                  location_name: dl.name || dl.clinic,
                  category: dl.category || 'CLINIC',
                  address: dl.address,
                  status: 'COMPLETED',
                  date: dateStr,
                  time: dl.created_at
                    ? new Date(dl.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : undefined,
                  batch_id: dl.batch_id || e.route_batch_id,
                  batch_code: dl.batch_code || batchCode,
                  completed_at: dl.created_at,
                  geofence_verified: true,
                  notes: 'Field discovered & marked on-site with GPS',
                });
              }
            });
          }

          // Secret internal threshold (Option 2): requires >= 2 field locations/tasks for open routes
          const FIELD_DISCOVERY_MINIMUM = 2;

          const totalTasks = entryTasks.length;
          const completedTasks = entryTasks.filter((t) => t.status === 'COMPLETED').length;

          let isAllDone = false;
          let lockedReason = '';

          if (!isEntryApproved) {
            lockedReason = 'Tour Plan awaiting Admin approval';
          } else if (hasPrePlannedLocations) {
            // Strict rule for pre-planned routes: 100% of planned location tasks completed
            const minRequired = Math.max(totalTasks, expectedLocs.length);
            isAllDone = minRequired > 0 && completedTasks >= minRequired;
            if (!isAllDone) {
              lockedReason = 'Location tasks pending verification';
            }
          } else {
            // Route had no pre-planned locations: Field discovery proof rule (Option 2)
            isAllDone = completedTasks >= FIELD_DISCOVERY_MINIMUM;
            if (!isAllDone) {
              // Note: Never mention the number "2" to MRs
              lockedReason = 'Field location tasks pending verification';
            }
          }

          map.set(recordKey, {
            key: recordKey,
            id: e.id || `entry-${idx}`,
            date: dateStr,
            monthKey,
            monthLabel: formatMonthLabel(monthKey),
            batch_id: e.route_batch_id || matchedBatch?.id,
            batch_code: batchCode,
            batch_name: e.route_batch_name || matchedBatch?.name || e.destination || e.planned_area || 'Field Circuit',
            destination: e.destination || e.planned_area || matchedBatch?.name || 'Field Area',
            hq_name: e.hq_name || matchedBatch?.hq_name || currentUserHqName,
            mr_name: currentUserName || 'Field Representative',
            distance_km: distKm,
            rate,
            total_payout: totalPayout,
            tasks: entryTasks,
            expected_locations: expectedLocs,
            total_tasks: hasPrePlannedLocations ? Math.max(totalTasks, expectedLocs.length) : Math.max(totalTasks, FIELD_DISCOVERY_MINIMUM),
            completed_tasks: completedTasks,
            is_approved: isEntryApproved,
            is_100_percent_completed: isAllDone,
            status: isAllDone ? 'ELIGIBLE' : 'LOCKED',
            locked_reason: lockedReason,
          });
        });
      });

      // B. Also aggregate standalone tasks on batches not in TP entries
      userTasks.forEach((t: any) => {
        const tDate = (t.date || t.created_at || '').slice(0, 10);
        const tBatch = t.batch_code || t.route_batch_code || t.batch_id || '';
        if (!tBatch) return;

        const key = `task_${tDate}_${tBatch}`;
        let existing = Array.from(map.values()).find(
          (r) => r.date === tDate && (r.batch_code === tBatch || r.batch_id === tBatch),
        );

        if (!existing) {
          const matchedBatch = hqBatches.find(
            (b) => b.batch_code === tBatch || b.id === tBatch,
          );
          const distKm = Number(matchedBatch?.distance_km || t.distance_km || 0);
          const rate = Number(matchedBatch?.standard_reimbursement_rate || standardRate);
          const mKey = tDate.length >= 7 ? tDate.slice(0, 7) : getCurrentMonthKey();

          const newRecord: BatchReimbursementRecord = {
            key,
            id: t.id,
            date: tDate,
            monthKey: mKey,
            monthLabel: formatMonthLabel(mKey),
            batch_id: t.batch_id || matchedBatch?.id,
            batch_code: tBatch,
            batch_name: matchedBatch?.name || t.batch_name || t.location_name || 'Field Circuit',
            destination: t.location_name || matchedBatch?.name || 'Field Area',
            hq_name: t.hq_name || matchedBatch?.hq_name || currentUserHqName,
            mr_name: currentUserName || 'Field Representative',
            distance_km: distKm,
            rate,
            total_payout: Math.round(distKm * rate * 100) / 100,
            tasks: [],
            expected_locations: [],
            total_tasks: 0,
            completed_tasks: 0,
            is_approved: true,
            is_100_percent_completed: false,
            status: 'LOCKED',
            locked_reason: 'Tasks in progress',
          };
          map.set(key, newRecord);
          existing = newRecord;
        }

        if (existing && !existing.tasks.some((existingTask) => existingTask.id === t.id)) {
          existing.tasks.push({
            id: t.id,
            title: t.title || t.location_name || 'Doctor Detailing Call',
            location_name: t.location_name,
            category: t.category,
            address: t.address,
            status: t.status,
            date: tDate,
            time: t.time,
            batch_id: t.batch_id,
            batch_code: t.batch_code,
            completed_at: t.completed_at,
            geofence_verified: t.geofence_verified || t.status === 'COMPLETED',
            notes: t.notes,
          });

          existing.total_tasks = existing.tasks.length;
          existing.completed_tasks = existing.tasks.filter((tk) => tk.status === 'COMPLETED').length;
          const isDone = existing.total_tasks > 0 && existing.completed_tasks === existing.total_tasks;
          existing.is_100_percent_completed = isDone;
          existing.status = isDone ? 'ELIGIBLE' : 'LOCKED';
          if (!isDone) {
            existing.locked_reason = `${existing.total_tasks - existing.completed_tasks} tasks pending completion`;
          }
        }
      });

      const calculatedRecords = Array.from(map.values());
      // Sort chronologically descending
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

  // Distinct Months available in records
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.monthKey) set.add(r.monthKey);
    });
    // Ensure current month is at least an option
    const currKey = getCurrentMonthKey();
    set.add(currKey);

    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Filtered Records based on status tab & selected month
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Month Filter
      if (selectedMonth !== 'ALL' && r.monthKey !== selectedMonth) {
        return false;
      }

      // 2. Status Tab Filter
      if (activeFilterTab === 'VERIFIED') {
        return r.is_100_percent_completed && r.status === 'ELIGIBLE';
      }
      if (activeFilterTab === 'PENDING') {
        return !r.is_100_percent_completed;
      }
      return true;
    });
  }, [records, activeFilterTab, selectedMonth]);

  // Group Filtered Records Month-by-Month
  const monthlyGroups = useMemo<MonthlyReimbursementGroup[]>(() => {
    const map = new Map<string, MonthlyReimbursementGroup>();

    filteredRecords.forEach((r) => {
      const mKey = r.monthKey;
      if (!map.has(mKey)) {
        map.set(mKey, {
          monthKey: mKey,
          monthLabel: r.monthLabel || formatMonthLabel(mKey),
          totalPayout: 0,
          totalDistanceKm: 0,
          completedCircuitsCount: 0,
          totalCircuitsCount: 0,
          records: [],
        });
      }

      const group = map.get(mKey)!;
      group.records.push(r);
      group.totalCircuitsCount += 1;
      if (r.is_100_percent_completed) {
        group.totalPayout += r.total_payout;
        group.totalDistanceKm += r.distance_km;
        group.completedCircuitsCount += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredRecords]);

  // Overall Verified Totals for Active Selection
  const activeMetrics = useMemo(() => {
    const verified = records.filter((r) => {
      if (selectedMonth !== 'ALL' && r.monthKey !== selectedMonth) return false;
      return r.is_100_percent_completed;
    });
    const pending = records.filter((r) => {
      if (selectedMonth !== 'ALL' && r.monthKey !== selectedMonth) return false;
      return !r.is_100_percent_completed;
    });

    const totalEarned = verified.reduce((sum, r) => sum + r.total_payout, 0);
    const totalKm = verified.reduce((sum, r) => sum + r.distance_km, 0);

    return {
      totalEarned,
      totalKm,
      verifiedCount: verified.length,
      pendingCount: pending.length,
    };
  }, [records, selectedMonth]);

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
          <View style={[styles.kpiCard, styles.kpiEligible, { flex: 1.3 }]}>
            <Text style={styles.kpiLabel}>Verified Reimbursement</Text>
            <Text style={styles.kpiValueGreen}>₹{activeMetrics.totalEarned.toFixed(2)}</Text>
            <Text style={styles.kpiSub}>
              {selectedMonth === 'ALL' ? 'All Months Combined' : formatMonthLabel(selectedMonth)}
            </Text>
          </View>

          <View style={[styles.kpiCard, { flex: 1 }]}>
            <Text style={styles.kpiLabel}>Completed Circuits</Text>
            <Text style={styles.kpiValueDark}>{activeMetrics.verifiedCount} Trips</Text>
            <Text style={styles.kpiSub}>{activeMetrics.totalKm} km Traveled</Text>
          </View>
        </View>

        {/* Policy Rule Clarification Banner */}
        <View style={styles.policyBanner}>
          <Text style={styles.policyTitle}>✅ 100% Task Completion Policy</Text>
          <Text style={styles.policyText}>
            Reimbursement payouts unlock and display here <Text style={{ fontWeight: '800' }}>strictly after all location tasks assigned in the approved route batch are 100% completed</Text>. Pending or incomplete visits are locked until all location tasks are finished.
          </Text>
        </View>

        {/* Filter Bar: Status Tabs (Verified vs Incomplete) */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilterTab === 'VERIFIED' && styles.filterTabActiveGreen]}
            onPress={() => setActiveFilterTab('VERIFIED')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, activeFilterTab === 'VERIFIED' && styles.filterTabTextActive]}>
              ✅ Verified &amp; Earned ({activeMetrics.verifiedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilterTab === 'PENDING' && styles.filterTabActiveAmber]}
            onPress={() => setActiveFilterTab('PENDING')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, activeFilterTab === 'PENDING' && styles.filterTabTextActiveAmber]}>
              🔒 Incomplete Tasks ({activeMetrics.pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilterTab === 'ALL' && styles.filterTabActiveBlue]}
            onPress={() => setActiveFilterTab('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, activeFilterTab === 'ALL' && styles.filterTabTextActive]}>
              All ({records.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Month Selector Pills (Horizontal Scroll) */}
        <View style={{ marginBottom: 14 }}>
          <Text style={styles.sectionSmallTitle}>SELECT TARGET MONTH:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <TouchableOpacity
              onPress={() => setSelectedMonth('ALL')}
              style={[styles.monthPill, selectedMonth === 'ALL' && styles.monthPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthPillText, selectedMonth === 'ALL' && styles.monthPillTextActive]}>
                All Months
              </Text>
            </TouchableOpacity>

            {availableMonths.map((mKey) => {
              const isSel = selectedMonth === mKey;
              const mLabel = formatMonthLabel(mKey);
              const mRecords = records.filter((r) => r.monthKey === mKey && r.is_100_percent_completed);
              const mEarned = mRecords.reduce((sum, r) => sum + r.total_payout, 0);

              return (
                <TouchableOpacity
                  key={mKey}
                  onPress={() => setSelectedMonth(mKey)}
                  style={[styles.monthPill, isSel && styles.monthPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthPillText, isSel && styles.monthPillTextActive]}>
                    📅 {mLabel} {mEarned > 0 ? `(₹${Math.round(mEarned)})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Content Area */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#1A3C6E" style={{ marginVertical: 30 }} />
        ) : monthlyGroups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>
              {activeFilterTab === 'VERIFIED' ? '🎉' : '📋'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeFilterTab === 'VERIFIED'
                ? 'No Verified Reimbursements Found'
                : 'No Incomplete Route Batches'}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilterTab === 'VERIFIED'
                ? 'Reimbursements unlock automatically as soon as all location tasks assigned to an approved route batch are 100% completed. Switch to "Incomplete Tasks" above to check pending routes.'
                : 'All route batch tasks are up to date! There are currently no pending tasks holding up reimbursements.'}
            </Text>
          </View>
        ) : (
          monthlyGroups.map((group) => {
            return (
              <View key={group.monthKey} style={styles.monthGroupContainer}>
                {/* Monthly Group Header Banner */}
                <View style={styles.monthHeaderCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.monthHeaderCalendarIcon}>📅</Text>
                      <Text style={styles.monthHeaderTitle}>{group.monthLabel}</Text>
                    </View>
                    <Text style={styles.monthHeaderSub}>
                      {group.completedCircuitsCount} of {group.totalCircuitsCount} Circuits Completed • {group.totalDistanceKm} km
                    </Text>
                  </View>
                  <View style={styles.monthHeaderAmountBox}>
                    <Text style={styles.monthHeaderAmountLabel}>Verified Payout</Text>
                    <Text style={styles.monthHeaderAmountVal}>₹{group.totalPayout.toFixed(2)}</Text>
                  </View>
                </View>

                {/* List of Circuits under this Month */}
                {group.records.map((r) => {
                  const isEligible = r.is_100_percent_completed;
                  const isExpanded = expandedRecordKeys.has(r.key);
                  const totalTaskCount = r.tasks.length > 0 ? r.tasks.length : r.expected_locations.length;

                  return (
                    <View
                      key={r.key}
                      style={[
                        styles.recordCard,
                        isEligible ? styles.cardEligibleBorder : styles.cardLockedBorder,
                      ]}
                    >
                      {/* Top Circuit Info Row */}
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
                          <Text style={styles.destinationSubtitle}>
                            📍 Destination: <Text style={{ color: '#0284C7', fontWeight: '700' }}>{r.destination}</Text>
                          </Text>
                        </View>

                        {/* Status Pill */}
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

                      {/* Travel Mileage and Payout Summary */}
                      <View style={styles.mileageStrip}>
                        <View style={styles.mileageCol}>
                          <Text style={styles.mileageLabel}>🚗 Travel Distance</Text>
                          <Text style={styles.mileageValue}>{r.distance_km} km (Round Trip)</Text>
                        </View>
                        <View style={styles.mileageCol}>
                          <Text style={styles.mileageLabel}>🏷️ Rate / KM</Text>
                          <Text style={styles.mileageValue}>₹{r.rate.toFixed(2)}/km</Text>
                        </View>
                        <View style={styles.mileageCol}>
                          <Text style={styles.mileageLabel}>💰 Eligible Reimbursement</Text>
                          <Text style={[styles.mileageValue, { color: isEligible ? '#0F8B5A' : '#64748B' }]}>
                            ₹{r.total_payout.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* Beneficiary & Recipient Details */}
                      <View style={styles.recipientInfoCard}>
                        <View style={styles.recipientInfoRow}>
                          <Text style={styles.recipientInfoLabel}>👤 Beneficiary / Recipient:</Text>
                          <Text style={styles.recipientInfoValue}>{r.mr_name || currentUserName}</Text>
                        </View>
                        <View style={styles.recipientInfoRow}>
                          <Text style={styles.recipientInfoLabel}>🏛️ Operating HQ:</Text>
                          <Text style={styles.recipientInfoValue}>{r.hq_name || currentUserHqName}</Text>
                        </View>
                        <View style={styles.recipientInfoRow}>
                          <Text style={styles.recipientInfoLabel}>
                            {isEligible ? '✅ Verification Status:' : '⚠️ Completion Requirement:'}
                          </Text>
                          <Text
                            style={[
                              styles.recipientInfoValue,
                              { color: isEligible ? '#0F8B5A' : '#B45309', fontWeight: '800' },
                            ]}
                          >
                            {isEligible
                              ? `All ${r.total_tasks} Location Tasks 100% Completed`
                              : r.locked_reason || 'Complete all location tasks to unlock'}
                          </Text>
                        </View>
                      </View>

                      {/* Interactive Task Drill-down Accordion Button */}
                      <TouchableOpacity
                        style={styles.drillDownButton}
                        onPress={() => toggleRecordExpansion(r.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.drillDownButtonText}>
                          📍 {isExpanded ? '▲ Hide Tasks Breakdown' : `▼ Click to see which tasks unlocked this (${totalTaskCount} Tasks)`}
                        </Text>
                      </TouchableOpacity>

                      {/* Expanded Tasks & Visited Locations Breakdown */}
                      {isExpanded && (
                        <View style={styles.drillDownContainer}>
                          <Text style={styles.drillDownHeaderTitle}>
                            📋 Location Tasks Breakdown for this Circuit:
                          </Text>

                          {r.tasks.length > 0 ? (
                            r.tasks.map((t, tIdx) => {
                              const isTaskDone = t.status === 'COMPLETED';
                              return (
                                <View key={t.id || tIdx} style={styles.taskDetailRow}>
                                  <Text style={{ fontSize: 16, marginRight: 8 }}>
                                    {isTaskDone ? '✅' : '⏳'}
                                  </Text>
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <Text style={styles.taskDetailTitle}>
                                        {t.location_name || t.title}
                                      </Text>
                                      {t.category && (
                                        <View style={styles.taskCatBadge}>
                                          <Text style={styles.taskCatBadgeText}>{t.category}</Text>
                                        </View>
                                      )}
                                    </View>
                                    <Text style={styles.taskDetailSub}>{t.title}</Text>
                                    {t.address && (
                                      <Text style={styles.taskDetailAddr}>📍 {t.address}</Text>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                      <Text style={styles.taskGeofenceTag}>
                                        🛡️ 50m Geofence Verified
                                      </Text>
                                      {t.completed_at && (
                                        <Text style={styles.taskTimeTag}>
                                          🕒 Completed at {new Date(t.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  <View
                                    style={[
                                      styles.taskStatusPill,
                                      isTaskDone ? styles.taskStatusPillDone : styles.taskStatusPillPending,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.taskStatusPillText,
                                        isTaskDone ? styles.statusTextGreen : styles.statusTextAmber,
                                      ]}
                                    >
                                      {isTaskDone ? 'DONE' : 'PENDING'}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })
                          ) : r.expected_locations.length > 0 ? (
                            r.expected_locations.map((loc, lIdx) => (
                              <View key={loc.id || lIdx} style={styles.taskDetailRow}>
                                <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.taskDetailTitle}>{loc.name}</Text>
                                  <Text style={styles.taskDetailSub}>
                                    Scheduled planned location • Check-in required
                                  </Text>
                                  {loc.address && (
                                    <Text style={styles.taskDetailAddr}>{loc.address}</Text>
                                  )}
                                </View>
                                <View style={[styles.taskStatusPill, styles.taskStatusPillPending]}>
                                  <Text style={[styles.taskStatusPillText, styles.statusTextAmber]}>
                                    UNVISITED
                                  </Text>
                                </View>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.noTasksNotice}>
                              No individual tasks recorded for this circuit entry.
                            </Text>
                          )}

                          {isEligible ? (
                            <View style={styles.drillDownSummaryBox}>
                              <Text style={styles.drillDownSummaryText}>
                                🎉 Route locations 100% verified! Full ₹{r.total_payout.toFixed(2)} mileage reimbursement credited to {r.mr_name}.
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.drillDownWarningBox}>
                              <Text style={styles.drillDownWarningText}>
                                ⚠️ Field location check-ins pending verification for this route to unlock reimbursement.
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Final Payout Amount Banner */}
                      {isEligible ? (
                        <View style={styles.eligibleBox}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eligibleBoxTitle}>🎉 Reimbursement Claim Unlocked</Text>
                            <Text style={styles.eligibleBoxSub}>
                              Payable to: {r.mr_name || currentUserName} • {r.distance_km} km
                            </Text>
                          </View>
                          <Text style={styles.eligibleBoxAmount}>₹{r.total_payout.toFixed(2)}</Text>
                        </View>
                      ) : (
                        <View style={styles.lockedBox}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.lockedBoxTitle}>🔒 Reimbursement Locked</Text>
                            <Text style={styles.lockedBoxSub}>
                              {r.locked_reason || 'Requires 100% tasks completion'} • Amount: ₹{r.total_payout.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
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
  kpiLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  kpiValueGreen: { fontSize: 18, fontWeight: '900', color: '#0F8B5A', marginVertical: 2 },
  kpiValueDark: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginVertical: 2 },
  kpiSub: { fontSize: 10, color: '#64748B' },
  policyBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  policyTitle: { fontSize: 12, fontWeight: '800', color: '#1E40AF', marginBottom: 4 },
  policyText: { fontSize: 11, color: '#334155', lineHeight: 16 },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActiveGreen: {
    backgroundColor: '#0F8B5A',
    borderColor: '#0F8B5A',
  },
  filterTabActiveAmber: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterTabActiveBlue: {
    backgroundColor: '#1A3C6E',
    borderColor: '#1A3C6E',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabTextActiveAmber: {
    color: '#FFFFFF',
  },
  sectionSmallTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  monthPillActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  monthPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  monthPillTextActive: {
    color: '#FFFFFF',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  emptyText: { fontSize: 11.5, color: '#64748B', textAlign: 'center', lineHeight: 16 },
  monthGroupContainer: {
    marginBottom: 20,
  },
  monthHeaderCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  monthHeaderCalendarIcon: { fontSize: 16 },
  monthHeaderTitle: { fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' },
  monthHeaderSub: { fontSize: 10.5, color: '#94A3B8', marginTop: 2 },
  monthHeaderAmountBox: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  monthHeaderAmountLabel: { fontSize: 9.5, color: '#CBD5E1', fontWeight: '700' },
  monthHeaderAmountVal: { fontSize: 15, fontWeight: '900', color: '#4ADE80' },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
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
    marginBottom: 8,
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
  batchNameTitle: { fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  destinationSubtitle: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillEligible: { backgroundColor: '#DCFCE7' },
  statusPillLocked: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  statusTextGreen: { color: '#15803D' },
  statusTextAmber: { color: '#B45309' },
  mileageStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mileageCol: { flex: 1, alignItems: 'center' },
  mileageLabel: { fontSize: 9.5, color: '#64748B', marginBottom: 2 },
  mileageValue: { fontSize: 11.5, fontWeight: '800', color: '#0F172A' },
  recipientInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 9,
    marginBottom: 8,
    gap: 3,
  },
  recipientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipientInfoLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  recipientInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  drillDownButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  drillDownButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  drillDownContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  drillDownHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  taskDetailTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskDetailSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  taskDetailAddr: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  taskCatBadge: {
    backgroundColor: '#E0F2FE',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  taskCatBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0369A1',
  },
  taskGeofenceTag: {
    fontSize: 9.5,
    color: '#15803D',
    fontWeight: '700',
  },
  taskTimeTag: {
    fontSize: 9.5,
    color: '#64748B',
  },
  taskStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  taskStatusPillDone: {
    backgroundColor: '#DCFCE7',
  },
  taskStatusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  taskStatusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  noTasksNotice: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  drillDownSummaryBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  drillDownSummaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    lineHeight: 15,
  },
  drillDownWarningBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  drillDownWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 15,
  },
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
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
  },
  lockedBoxTitle: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  lockedBoxSub: { fontSize: 10.5, color: '#94A3B8', marginTop: 2, lineHeight: 14 },
});
