import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface CompletedTask {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string;
  address?: string;
  status: string;
  priority: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  outcome?: string;
  orders?: Array<{ product_name: string; quantity: number; total_amount: number }>;
  assigned_mr_name?: string;
}

type FilterMode = 'today' | 'week' | 'month' | 'all' | 'custom';

interface TaskHistoryScreenProps {
  currentUserId?: string;
  currentUserName?: string;
}

function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getStartOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatTimeFromISO(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority?.toUpperCase()) {
    case 'HIGH': return '#EF4444';
    case 'MEDIUM': return '#F59E0B';
    case 'LOW': return '#22C55E';
    default: return '#64748B';
  }
}

export const TaskHistoryScreen: React.FC<TaskHistoryScreenProps> = ({
  currentUserId = 'usr-mr-01',
  currentUserName = 'Rahul Sharma',
}) => {
  const [allCompletedTasks, setAllCompletedTasks] = useState<CompletedTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CompletedTask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch completed tasks from API
  const fetchCompletedTasks = useCallback(async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      // Try the filtered endpoint first
      const res = await fetch(`${baseUrl}/tasks?status=COMPLETED`, { headers });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const completed = data
            .filter((t: any) => t.status === 'COMPLETED')
            .sort((a: any, b: any) => (b.completed_at || b.date || '').localeCompare(a.completed_at || a.date || ''));
          setAllCompletedTasks(completed);
          return;
        }
      }
    } catch {
      // Fallback: try my tasks endpoint
    }

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/tasks/my`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const completed = data
            .filter((t: any) => t.status === 'COMPLETED')
            .sort((a: any, b: any) => (b.completed_at || b.date || '').localeCompare(a.completed_at || a.date || ''));
          setAllCompletedTasks(completed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchCompletedTasks().finally(() => setIsLoading(false));
  }, [fetchCompletedTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCompletedTasks();
    setRefreshing(false);
  }, [fetchCompletedTasks]);

  // Apply filter
  useEffect(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    let filtered: CompletedTask[];

    switch (filterMode) {
      case 'today':
        filtered = allCompletedTasks.filter(t => {
          const taskDate = t.completed_at ? t.completed_at.substring(0, 10) : t.date;
          return taskDate === todayStr;
        });
        break;
      case 'week': {
        const weekStart = getStartOfWeek(now);
        const weekStartStr = getLocalDateStr(weekStart);
        filtered = allCompletedTasks.filter(t => {
          const taskDate = t.completed_at ? t.completed_at.substring(0, 10) : t.date;
          return taskDate >= weekStartStr && taskDate <= todayStr;
        });
        break;
      }
      case 'month': {
        const monthStart = getStartOfMonth(now);
        const monthStartStr = getLocalDateStr(monthStart);
        filtered = allCompletedTasks.filter(t => {
          const taskDate = t.completed_at ? t.completed_at.substring(0, 10) : t.date;
          return taskDate >= monthStartStr && taskDate <= todayStr;
        });
        break;
      }
      case 'custom':
        filtered = allCompletedTasks.filter(t => {
          const taskDate = t.completed_at ? t.completed_at.substring(0, 10) : t.date;
          if (customStartDate && taskDate < customStartDate) return false;
          if (customEndDate && taskDate > customEndDate) return false;
          return true;
        });
        break;
      default: // 'all'
        filtered = [...allCompletedTasks];
    }

    setFilteredTasks(filtered);
  }, [filterMode, allCompletedTasks, customStartDate, customEndDate]);

  // Group tasks by date
  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, CompletedTask[]> = {};
    filteredTasks.forEach(task => {
      const dateKey = task.completed_at ? task.completed_at.substring(0, 10) : task.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    // Sort groups by date (newest first)
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTasks]);

  // Summary stats
  const totalTasks = filteredTasks.length;
  const totalDuration = filteredTasks.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);
  const avgDuration = totalTasks > 0 ? Math.round(totalDuration / totalTasks) : 0;
  const totalOrders = filteredTasks.reduce((sum, t) => sum + (t.orders?.length || 0), 0);

  const handleFilterPress = (mode: FilterMode) => {
    if (mode === 'custom') {
      setShowCustomDateModal(true);
    } else {
      setFilterMode(mode);
    }
  };

  const applyCustomDateFilter = () => {
    setFilterMode('custom');
    setShowCustomDateModal(false);
  };

  const openTaskDetail = (task: CompletedTask) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F8B5A" />
        <Text style={styles.loadingText}>Loading completed tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.screenTitle}>📋 Task History</Text>
        <Text style={styles.screenSubtitle}>
          All completed visits & calls
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {([
            { mode: 'all' as FilterMode, label: 'All Time', icon: '📊' },
            { mode: 'today' as FilterMode, label: 'Today', icon: '📅' },
            { mode: 'week' as FilterMode, label: 'This Week', icon: '📆' },
            { mode: 'month' as FilterMode, label: 'This Month', icon: '🗓️' },
            { mode: 'custom' as FilterMode, label: 'Custom Range', icon: '🔍' },
          ]).map(({ mode, label, icon }) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.filterChip,
                filterMode === mode && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(mode)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterMode === mode && styles.filterChipTextActive]}>
                {icon} {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary Stats Card */}
      <View style={styles.summaryCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalTasks}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{formatDuration(avgDuration)}</Text>
          <Text style={styles.statLabel}>Avg. Duration</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.taskList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F8B5A']} />
        }
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No completed tasks</Text>
            <Text style={styles.emptySubtitle}>
              {filterMode === 'today'
                ? 'No tasks completed today. Keep going!'
                : filterMode === 'week'
                ? 'No tasks completed this week yet.'
                : filterMode === 'month'
                ? 'No tasks completed this month yet.'
                : 'Complete tasks to see them here.'}
            </Text>
          </View>
        ) : (
          groupedTasks.map(([dateKey, tasks]) => (
            <View key={dateKey} style={styles.dateGroup}>
              {/* Date Group Header */}
              <View style={styles.dateHeader}>
                <View style={styles.dateHeaderLeft}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>
                      {formatDateDDMMYYYY(dateKey)}
                    </Text>
                  </View>
                  <Text style={styles.dateTaskCount}>
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Tasks for this date */}
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => openTaskDetail(task)}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskCardHeader}>
                    <View style={styles.taskTitleRow}>
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                    </View>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Done</Text>
                    </View>
                  </View>

                  <View style={styles.taskCardBody}>
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoIcon}>📍</Text>
                      <Text style={styles.taskInfoText} numberOfLines={1}>
                        {task.location_name || 'Location'}
                      </Text>
                    </View>

                    <View style={styles.taskMetaRow}>
                      <View style={styles.taskMeta}>
                        <Text style={styles.taskMetaIcon}>🕐</Text>
                        <Text style={styles.taskMetaText}>
                          {task.time || formatTimeFromISO(task.completed_at)}
                        </Text>
                      </View>
                      {task.duration_seconds && task.duration_seconds > 0 && (
                        <View style={styles.taskMeta}>
                          <Text style={styles.taskMetaIcon}>⏱️</Text>
                          <Text style={styles.taskMetaText}>
                            {formatDuration(task.duration_seconds)}
                          </Text>
                        </View>
                      )}
                      {task.orders && task.orders.length > 0 && (
                        <View style={styles.taskMeta}>
                          <Text style={styles.taskMetaIcon}>🛒</Text>
                          <Text style={styles.taskMetaText}>
                            {task.orders.length} order{task.orders.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    {task.outcome && (
                      <View style={styles.outcomeRow}>
                        <Text style={styles.outcomeLabel}>Feedback:</Text>
                        <Text style={styles.outcomeText} numberOfLines={2}>
                          "{task.outcome}"
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        {/* Bottom padding */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateModal}>
            <Text style={styles.dateModalTitle}>📅 Select Date Range</Text>
            <Text style={styles.dateModalSubtitle}>
              Enter dates in YYYY-MM-DD format
            </Text>

            <View style={styles.dateInputGroup}>
              <Text style={styles.dateInputLabel}>From:</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2026-09-01"
                placeholderTextColor="#94A3B8"
                value={customStartDate}
                onChangeText={setCustomStartDate}
                keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
              />
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={styles.dateInputLabel}>To:</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2026-09-12"
                placeholderTextColor="#94A3B8"
                value={customEndDate}
                onChangeText={setCustomEndDate}
                keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
              />
            </View>

            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={styles.dateModalCancelBtn}
                onPress={() => setShowCustomDateModal(false)}
              >
                <Text style={styles.dateModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateModalApplyBtn}
                onPress={applyCustomDateFilter}
              >
                <Text style={styles.dateModalApplyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <View style={[styles.detailPriorityBand, { backgroundColor: getPriorityColor(selectedTask.priority) }]} />
                  <Text style={styles.detailTitle}>{selectedTask.title}</Text>
                  <View style={styles.detailCompletedBadge}>
                    <Text style={styles.detailCompletedText}>✓ Completed</Text>
                  </View>
                </View>

                {/* Info Rows */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📍 Location</Text>
                    <Text style={styles.detailValue}>{selectedTask.location_name || '—'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📅 Date</Text>
                    <Text style={styles.detailValue}>{formatDateDDMMYYYY(selectedTask.date)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🕐 Scheduled Time</Text>
                    <Text style={styles.detailValue}>{selectedTask.time || '—'}</Text>
                  </View>

                  {selectedTask.started_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>🟢 Started At</Text>
                      <Text style={styles.detailValue}>{formatTimeFromISO(selectedTask.started_at)}</Text>
                    </View>
                  )}

                  {selectedTask.completed_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>✅ Completed At</Text>
                      <Text style={styles.detailValue}>{formatTimeFromISO(selectedTask.completed_at)}</Text>
                    </View>
                  )}

                  {selectedTask.duration_seconds && selectedTask.duration_seconds > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>⏱️ Visit Duration</Text>
                      <Text style={[styles.detailValue, { color: '#0F8B5A', fontWeight: '700' }]}>
                        {formatDuration(selectedTask.duration_seconds)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🔴 Priority</Text>
                    <Text style={[styles.detailValue, { color: getPriorityColor(selectedTask.priority), fontWeight: '700' }]}>
                      {selectedTask.priority}
                    </Text>
                  </View>
                </View>

                {/* Outcome / Feedback */}
                {selectedTask.outcome && (
                  <View style={styles.detailOutcomeSection}>
                    <Text style={styles.detailSectionTitle}>💬 Visit Feedback</Text>
                    <View style={styles.detailOutcomeBox}>
                      <Text style={styles.detailOutcomeText}>"{selectedTask.outcome}"</Text>
                    </View>
                  </View>
                )}

                {/* Orders */}
                {selectedTask.orders && selectedTask.orders.length > 0 && (
                  <View style={styles.detailOrdersSection}>
                    <Text style={styles.detailSectionTitle}>🛒 Orders Placed ({selectedTask.orders.length})</Text>
                    {selectedTask.orders.map((order, idx) => (
                      <View key={idx} style={styles.orderItem}>
                        <Text style={styles.orderName}>{order.product_name}</Text>
                        <Text style={styles.orderDetails}>
                          Qty: {order.quantity} • ₹{order.total_amount?.toLocaleString('en-IN') || '0'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.detailCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },

  // Header
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Filter Chips
  filterRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F8B5A',
    borderColor: '#0F8B5A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },

  // Task List
  taskList: {
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Date Groups
  dateGroup: {
    marginBottom: 4,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBadge: {
    backgroundColor: '#1A3C6E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dateTaskCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Task Card
  taskCard: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    overflow: 'hidden',
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  taskCardBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  taskInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskInfoIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  taskInfoText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },

  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMetaIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  taskMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  outcomeRow: {
    marginTop: 8,
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 8,
  },
  outcomeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginRight: 4,
  },
  outcomeText: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
    fontStyle: 'italic',
  },

  // Custom Date Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  dateModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 20,
  },
  dateInputGroup: {
    marginBottom: 16,
  },
  dateInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  dateModalCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  dateModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  dateModalApplyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F8B5A',
  },
  dateModalApplyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Detail Modal
  detailModal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  detailHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  detailPriorityBand: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailCompletedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  detailCompletedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },

  detailSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },

  detailOutcomeSection: {
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  detailOutcomeBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  detailOutcomeText: {
    fontSize: 13,
    color: '#166534',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  detailOrdersSection: {
    marginBottom: 12,
  },
  orderItem: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  orderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  orderDetails: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },

  detailCloseBtn: {
    backgroundColor: '#1A3C6E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  detailCloseBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
