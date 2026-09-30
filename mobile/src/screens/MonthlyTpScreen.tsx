import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface MonthlyTpScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  onBack?: () => void;
}

interface WorkingTpItem {
  id: string;
  date: string;
  hq_id: string;
  hq_name: string;
  planned_area: string;
  work_type: string;
  planned_kol_drs: string;
  planned_activity: string;
}

const WORK_TYPES = [
  'Doctor Visit',
  'Order Collection',
  'Follow-up',
  'Transit',
  'Induction',
  'Other',
];

const DEFAULT_HQS = [
  { id: 'hq-shahdol', name: 'Shahdol' },
  { id: 'hq-jaisinghnagar', name: 'Jaisinghnagar' },
  { id: 'hq-burhar', name: 'Burhar/Bauhari' },
  { id: 'hq-ambikapur', name: 'Ambikapur' },
  { id: 'hq-bilaspur', name: 'Bilaspur' },
  { id: 'hq-kotma', name: 'Kotma' },
];

const DEFAULT_AREAS = [
  'Shahdol',
  'Burhar',
  'Goparu',
  'Kotma',
  'Ambikapur',
  'Jaisinghnagar',
  'Bauhari',
];

export const MonthlyTpScreen: React.FC<MonthlyTpScreenProps> = ({
  currentUserId = 'usr-mr-01',
  currentUserName = 'Rahul Sharma',
  onBack,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [hqs, setHqs] = useState<Array<{ id: string; name: string }>>(DEFAULT_HQS);
  const [availableAreas, setAvailableAreas] = useState<string[]>(DEFAULT_AREAS);

  // Form inputs
  const [formDate, setFormDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedHqId, setSelectedHqId] = useState<string>('hq-shahdol');
  const [selectedArea, setSelectedArea] = useState<string>('Shahdol');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('Doctor Visit');
  const [kolDrsName, setKolDrsName] = useState<string>('');
  const [plannedActivity, setPlannedActivity] = useState<string>('');

  // Working list of TP entries
  const [workingEntries, setWorkingEntries] = useState<WorkingTpItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedPlans, setSubmittedPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CREATE' | 'VIEW_SUBMITTED'>('CREATE');

  // Load HQs from backend
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/hqs`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setHqs(list);
            if (!list.some((h) => h.id === selectedHqId)) {
              setSelectedHqId(list[0].id);
            }
          }
        }
      } catch {}
    })();
  }, []);

  // Load areas when HQ changes
  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/inventory/areas?hq_id=${selectedHqId}`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const areaNames = list.map((a: any) => a.name);
            setAvailableAreas(areaNames);
            setSelectedArea(areaNames[0]);
          } else {
            setAvailableAreas(DEFAULT_AREAS);
          }
        }
      } catch {}
    })();
  }, [selectedHqId]);

  // Load previously submitted plans for this MR
  const fetchMyTourPlans = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/tour-plans/my?month=${selectedMonth}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSubmittedPlans(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchMyTourPlans();
  }, [selectedMonth]);

  // Add Next TP handler (§7)
  const handleAddNextTp = () => {
    if (!formDate.trim()) {
      Alert.alert('Date Required', 'Please enter or select a planned date.');
      return;
    }
    if (!kolDrsName.trim()) {
      Alert.alert('KOL / Doctor Required', 'Please enter Planned KOL DRS name.');
      return;
    }
    if (!plannedActivity.trim()) {
      Alert.alert('Activity Required', 'Please specify the Planned Activity.');
      return;
    }

    const currentHq = hqs.find((h) => h.id === selectedHqId) || hqs[0];

    const newItem: WorkingTpItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formDate,
      hq_id: currentHq.id,
      hq_name: currentHq.name,
      planned_area: selectedArea,
      work_type: selectedWorkType,
      planned_kol_drs: kolDrsName.trim(),
      planned_activity: plannedActivity.trim(),
    };

    setWorkingEntries((prev) => [...prev, newItem]);

    // Reset inputs for fast next entry
    setKolDrsName('');
    setPlannedActivity('');

    // Advance date to next day automatically
    try {
      const parts = formDate.split('-');
      if (parts.length === 3) {
        const nextD = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]) + 1);
        setFormDate(
          `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-${String(nextD.getDate()).padStart(2, '0')}`,
        );
      }
    } catch {}

    Alert.alert('TP Added', `Added visit for ${newItem.date}. You can add more dates or submit.`);
  };

  const handleRemoveWorkingItem = (id: string) => {
    setWorkingEntries((prev) => prev.filter((i) => i.id !== id));
  };

  // Submit complete monthly TP together (§7)
  const handleSubmitMonthlyPlan = async () => {
    if (workingEntries.length === 0) {
      Alert.alert('No Entries', 'Please add at least one planned date using "Add Next TP" before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      const res = await fetch(`${baseUrl}/tour-plans/monthly`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          month: selectedMonth,
          entries: workingEntries,
          remarks: `Submitted by ${currentUserName}`,
        }),
      });

      if (res.ok) {
        Alert.alert(
          'Monthly TP Submitted! ✓',
          `Successfully submitted Tour Plan for ${selectedMonth} with ${workingEntries.length} planned calls.\n\nYour manager will review and approve.`,
        );
        setWorkingEntries([]);
        fetchMyTourPlans();
        setActiveTab('VIEW_SUBMITTED');
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Submission Error', err.message || 'Failed to submit monthly TP.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e?.message || 'Failed to connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#93C5FD', fontWeight: '700', fontSize: 13 }}>← Back to More Menu</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Monthly Tour Plan (TP)</Text>
        <Text style={styles.headerSub}>
          {currentUserName} • Field Schedule Planning
        </Text>
      </View>

      {/* Segmented View Mode */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CREATE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('CREATE')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'CREATE' && styles.tabBtnTextActive]}>
            📝 Plan Month ({workingEntries.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'VIEW_SUBMITTED' && styles.tabBtnActive]}
          onPress={() => setActiveTab('VIEW_SUBMITTED')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'VIEW_SUBMITTED' && styles.tabBtnTextActive]}>
            📋 Submitted TPs ({submittedPlans.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <View style={styles.monthCard}>
        <Text style={styles.sectionLabel}>Target Month:</Text>
        <View style={styles.monthRow}>
          {['2026-09', '2026-10', '2026-11'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.monthPill, selectedMonth === m && styles.monthPillActive]}
              onPress={() => setSelectedMonth(m)}
            >
              <Text style={[styles.monthPillText, selectedMonth === m && styles.monthPillTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'CREATE' && (
        <>
          {/* New TP Entry Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Add Planned Visit Date</Text>

            {/* Date Input */}
            <Text style={styles.fieldLabel}>Planned Date (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.textInput}
              value={formDate}
              onChangeText={setFormDate}
              placeholder="2026-09-15"
            />

            {/* HQ Selector */}
            <Text style={styles.fieldLabel}>Headquarters (HQ):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {hqs.map((hq) => {
                const isSelected = selectedHqId === hq.id;
                return (
                  <TouchableOpacity
                    key={hq.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedHqId(hq.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {hq.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Planned Area */}
            <Text style={styles.fieldLabel}>Planned Area / Sub-Territory:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {availableAreas.map((area) => {
                const isSelected = selectedArea === area;
                return (
                  <TouchableOpacity
                    key={area}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedArea(area)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Type of Work */}
            <Text style={styles.fieldLabel}>Type of Work:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {WORK_TYPES.map((wt) => {
                const isSelected = selectedWorkType === wt;
                return (
                  <TouchableOpacity
                    key={wt}
                    style={[styles.chip, isSelected && styles.chipActiveSecondary]}
                    onPress={() => setSelectedWorkType(wt)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {wt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Planned KOL DRS */}
            <Text style={styles.fieldLabel}>PLANNED KOL DRS (Name):</Text>
            <TextInput
              style={styles.textInput}
              value={kolDrsName}
              onChangeText={setKolDrsName}
              placeholder="e.g. Dr. Rajesh Sharma (Cardio Specialist)"
            />

            {/* Planned Activity */}
            <Text style={styles.fieldLabel}>PLANNED ACTIVITY (Specify):</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              value={plannedActivity}
              onChangeText={setPlannedActivity}
              placeholder="e.g. CardioFix-50 scheme presentation & sample distribution"
              multiline
            />

            {/* Add Next TP Button (§7) */}
            <TouchableOpacity style={styles.addNextBtn} onPress={handleAddNextTp}>
              <Text style={styles.addNextBtnText}>+ Add Next TP (Continue Month)</Text>
            </TouchableOpacity>
          </View>

          {/* Working Entries Review Table (§7) */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.cardHeader}>Month Plan Entries ({workingEntries.length})</Text>
              {workingEntries.length > 0 && (
                <TouchableOpacity onPress={() => setWorkingEntries([])}>
                  <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {workingEntries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No TP entries added for this month yet.</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  Fill the form above and click "+ Add Next TP" to add dates.
                </Text>
              </View>
            ) : (
              workingEntries.map((item, idx) => (
                <View key={item.id} style={styles.entryRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.entryDate}>{formatDateDDMMYYYY(item.date)}</Text>
                      <View style={styles.tagHq}>
                        <Text style={styles.tagHqText}>{item.hq_name} • {item.planned_area}</Text>
                      </View>
                      <View style={styles.tagWork}>
                        <Text style={styles.tagWorkText}>{item.work_type}</Text>
                      </View>
                    </View>
                    <Text style={styles.entryDoctor}>Dr: {item.planned_kol_drs}</Text>
                    <Text style={styles.entryActivity}>Task: {item.planned_activity}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemoveWorkingItem(item.id)}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Final Submit Button (§7) */}
            {workingEntries.length > 0 && (
              <TouchableOpacity
                style={[styles.submitPlanBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSubmitMonthlyPlan}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitPlanBtnText}>
                    ✓ Submit Complete Monthly TP ({workingEntries.length} Dates)
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {activeTab === 'VIEW_SUBMITTED' && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Submitted Tour Plans for {selectedMonth}</Text>
          {submittedPlans.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No submitted plans found for {selectedMonth}.</Text>
            </View>
          ) : (
            submittedPlans.map((plan) => (
              <View key={plan.id} style={styles.submittedCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                    Month: {plan.month}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      plan.status === 'APPROVED'
                        ? { backgroundColor: '#DCFCE7' }
                        : plan.status === 'REJECTED'
                        ? { backgroundColor: '#FEE2E2' }
                        : { backgroundColor: '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        plan.status === 'APPROVED'
                          ? { color: '#15803D' }
                          : plan.status === 'REJECTED'
                          ? { color: '#B91C1C' }
                          : { color: '#B45309' },
                      ]}
                    >
                      ● {plan.status}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  Submitted: {new Date(plan.submitted_at).toLocaleDateString()} • {plan.entries?.length || 0} visits scheduled
                </Text>

                {plan.remarks ? (
                  <Text style={{ fontSize: 11, color: '#334155', marginTop: 4, fontStyle: 'italic' }}>
                    Remarks: "{plan.remarks}"
                  </Text>
                ) : null}

                {/* Entries table */}
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
                  {(plan.entries || []).map((e: any, i: number) => (
                    <View key={e.id || i} style={styles.subItemRow}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B', width: 85 }}>
                        {formatDateDDMMYYYY(e.date)}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#0F172A' }}>
                          {e.planned_kol_drs} ({e.work_type})
                        </Text>
                        <Text style={{ fontSize: 10, color: '#64748B' }}>
                          {e.hq_name} / {e.planned_area} • {e.planned_activity}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { backgroundColor: '#1A3C6E', padding: 16 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#0F8B5A' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabBtnTextActive: { color: '#0F8B5A', fontWeight: '800' },
  monthCard: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    marginBottom: 0,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 },
  monthRow: { flexDirection: 'row', gap: 8 },
  monthPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  monthPillActive: { backgroundColor: '#1A3C6E' },
  monthPillText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  monthPillTextActive: { color: '#FFFFFF', fontWeight: '800' },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginTop: 8, marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#FAFAFA',
  },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: { backgroundColor: '#1A3C6E', borderColor: '#1A3C6E' },
  chipActiveSecondary: { backgroundColor: '#0F8B5A', borderColor: '#0F8B5A' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  addNextBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 14,
  },
  addNextBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  entryDate: { fontSize: 11.5, fontWeight: '800', color: '#1A3C6E' },
  tagHq: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagHqText: { fontSize: 9.5, color: '#0369A1', fontWeight: '700' },
  tagWork: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagWorkText: { fontSize: 9.5, color: '#B45309', fontWeight: '700' },
  entryDoctor: { fontSize: 11.5, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  entryActivity: { fontSize: 10.5, color: '#64748B', marginTop: 1 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  deleteBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '800' },
  submitPlanBtn: {
    backgroundColor: '#1A3C6E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  submitPlanBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  submittedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 10.5, fontWeight: '800' },
  subItemRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
});
