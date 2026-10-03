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
  Modal,
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
  'Induction / Camp',
  'Stockist Detailing',
  'Other',
];

const DEFAULT_HQS = [
  { id: 'hq-shahdol', name: 'Shahdol', state: 'Madhya Pradesh' },
  { id: 'hq-ambikapur', name: 'Ambikapur', state: 'Chhattisgarh' },
  { id: 'hq-bilaspur', name: 'Bilaspur', state: 'Chhattisgarh' },
  { id: 'hq-kotma', name: 'Kotma', state: 'Madhya Pradesh' },
  { id: 'hq-jaisinghnagar', name: 'Jaisinghnagar', state: 'Madhya Pradesh' },
  { id: 'hq-burhar', name: 'Burhar', state: 'Madhya Pradesh' },
];

const DEFAULT_HQ_AREAS_MAP: Record<string, string[]> = {
  'hq-shahdol': [
    'Burhar',
    'Gohparu',
    'Beohari',
    'Jaisinghnagar',
    'Sohagpur',
    'Singhpur',
    'Shahdol Central',
  ],
  'hq-ambikapur': [
    'Sitapur',
    'Lundra',
    'Batoli',
    'Mainpat',
    'Udaipur',
    'Lakhanpur',
    'Surguja',
    'Ramanujganj',
    'Ambikapur Central',
  ],
  'hq-bilaspur': [
    'Kota',
    'Takhatpur',
    'Masturi',
    'Bilha',
    'Ratanpur',
    'Bodri',
    'Sakri',
    'Bilaspur City',
  ],
  'hq-kotma': [
    'Kotma Town',
    'Anuppur',
    'Jaithari',
    'Bijuri',
    'Rajendragram',
    'Bhalumuda',
  ],
  'hq-jaisinghnagar': [
    'Jaisinghnagar Town',
    'Amdih',
    'Janakpur Road',
  ],
  'hq-burhar': [
    'Burhar Town',
    'Dhanpuri',
    'Amlai',
    'Bakaho',
  ],
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const MonthlyTpScreen: React.FC<MonthlyTpScreenProps> = ({
  currentUserId = 'usr-mr-01',
  currentUserName = 'Rahul Sharma',
  onBack,
}) => {
  const [hqs, setHqs] = useState<Array<{ id: string; name: string; state?: string }>>(DEFAULT_HQS);
  const [availableAreas, setAvailableAreas] = useState<string[]>(DEFAULT_HQ_AREAS_MAP['hq-shahdol']);

  // Form inputs
  const [formDate, setFormDate] = useState<string>(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${d.getFullYear()}`;
  });
  const [selectedHqId, setSelectedHqId] = useState<string>('hq-shahdol');
  const [selectedArea, setSelectedArea] = useState<string>(DEFAULT_HQ_AREAS_MAP['hq-shahdol'][0]);
  const [selectedWorkType, setSelectedWorkType] = useState<string>('Doctor Visit');
  const [kolDrsName, setKolDrsName] = useState<string>('');
  const [plannedActivity, setPlannedActivity] = useState<string>('');

  // Working list of TP entries
  const [workingEntries, setWorkingEntries] = useState<WorkingTpItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedPlans, setSubmittedPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CREATE' | 'VIEW_SUBMITTED'>('CREATE');

  // Calendar modal state
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    const d = new Date();
    return d.getFullYear();
  });
  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    const d = new Date();
    return d.getMonth(); // 0-indexed
  });

  // Helper to extract YYYY-MM from DD-MM-YYYY
  const getMonthKeyFromDate = (dateStr: string): string => {
    try {
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('-');
        return `${y}-${m}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${y}-${m}`;
      }
    } catch {}
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Helper to get areas for an HQ (from localStorage settings or fallback)
  const getStoredAreasForHq = (hqId: string): string[] => {
    try {
      const savedRaw = localStorage.getItem('ahtri_hq_subareas');
      if (savedRaw) {
        const list = JSON.parse(savedRaw);
        if (Array.isArray(list)) {
          const matched = list
            .filter((a: any) => a.hq_id === hqId && a.status !== 'INACTIVE')
            .map((a: any) => a.name);
          if (matched.length > 0) return matched;
        }
      }
    } catch {}
    return DEFAULT_HQ_AREAS_MAP[hqId] || ['Main Market', 'Station Road'];
  };

  // Load HQs from backend & localStorage
  const loadHqs = async () => {
    let loadedHqs = DEFAULT_HQS;
    try {
      const savedRaw = localStorage.getItem('ahtri_inventory_hqs');
      if (savedRaw) {
        const list = JSON.parse(savedRaw);
        if (Array.isArray(list) && list.length > 0) {
          loadedHqs = list;
          setHqs(list);
        }
      }
    } catch {}

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/inventory/hqs`, { headers });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          setHqs(list);
          loadedHqs = list;
        }
      }
    } catch {}

    // Ensure selected HQ exists
    if (!loadedHqs.some((h) => h.id === selectedHqId)) {
      setSelectedHqId(loadedHqs[0].id);
    }
  };

  useEffect(() => {
    loadHqs();
  }, []);

  // Load areas when HQ changes
  useEffect(() => {
    let activeAreas = getStoredAreasForHq(selectedHqId);
    setAvailableAreas(activeAreas);
    setSelectedArea(activeAreas[0] || 'Main Area');

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
            if (!areaNames.includes(selectedArea)) {
              setSelectedArea(areaNames[0]);
            }
          }
        }
      } catch {}
    })();
  }, [selectedHqId]);

  // Load submitted plans for this MR
  const fetchMyTourPlans = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/tour-plans/my`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sort newest submission first
          data.sort((a, b) => new Date(b.submitted_at || b.created_at || 0).getTime() - new Date(a.submitted_at || a.created_at || 0).getTime());
          setSubmittedPlans(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchMyTourPlans();
  }, []);

  // Handle HQ selection change
  const handleHqChange = (newHqId: string) => {
    setSelectedHqId(newHqId);
    const newAreas = getStoredAreasForHq(newHqId);
    setAvailableAreas(newAreas);
    setSelectedArea(newAreas[0] || 'Main Area');
  };

  // Open calendar with current formDate
  const handleOpenCalendar = () => {
    try {
      if (/^\d{2}-\d{2}-\d{4}$/.test(formDate)) {
        const [d, m, y] = formDate.split('-').map(Number);
        setCalendarYear(y);
        setCalendarMonth(m - 1);
      }
    } catch {}
    setIsCalendarOpen(true);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    setFormDate(`${dayStr}-${monthStr}-${calendarYear}`);
    setIsCalendarOpen(false);
  };

  const handleSelectToday = () => {
    const d = new Date();
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    setFormDate(`${dayStr}-${monthStr}-${d.getFullYear()}`);
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
    setIsCalendarOpen(false);
  };

  // Add Next TP handler
  const handleAddNextTp = () => {
    if (!formDate.trim()) {
      Alert.alert('Date Required', 'Please enter or select a planned visit date.');
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

    // Advance date to next day automatically in DD-MM-YYYY format
    try {
      let dObj: Date | null = null;
      if (/^\d{2}-\d{2}-\d{4}$/.test(formDate)) {
        const [d, m, y] = formDate.split('-').map(Number);
        dObj = new Date(y, m - 1, d + 1);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
        const [y, m, d] = formDate.split('-').map(Number);
        dObj = new Date(y, m - 1, d + 1);
      }
      if (dObj && !isNaN(dObj.getTime())) {
        const day = String(dObj.getDate()).padStart(2, '0');
        const month = String(dObj.getMonth() + 1).padStart(2, '0');
        setFormDate(`${day}-${month}-${dObj.getFullYear()}`);
      }
    } catch {}

    Alert.alert('Visit Added', `Added visit for ${formatDateDDMMYYYY(newItem.date)}. You can add more dates or submit the full plan.`);
  };

  const handleRemoveWorkingItem = (id: string) => {
    setWorkingEntries((prev) => prev.filter((i) => i.id !== id));
  };

  // Submit complete monthly TP together
  const handleSubmitMonthlyPlan = async () => {
    if (workingEntries.length === 0) {
      Alert.alert('No Entries', 'Please add at least one planned visit date using "+ Add Next TP" before submitting.');
      return;
    }

    const targetMonth = getMonthKeyFromDate(workingEntries[0].date);

    setIsSubmitting(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();

      const res = await fetch(`${baseUrl}/tour-plans/monthly`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          month: targetMonth,
          entries: workingEntries,
          remarks: `Submitted by ${currentUserName}`,
        }),
      });

      if (res.ok) {
        Alert.alert(
          'Monthly TP Submitted! ✓',
          `Successfully submitted Tour Plan for ${targetMonth} with ${workingEntries.length} planned calls.\n\nYour manager will review and approve.`,
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

  // Calendar calculations
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  // Check if a calendar day matches formDate
  const isSelectedDay = (day: number) => {
    if (!formDate) return false;
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    return formDate === `${dayStr}-${monthStr}-${calendarYear}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarMonth === today.getMonth() &&
      calendarYear === today.getFullYear()
    );
  };

  // Active HQ name
  const activeHqName = hqs.find((h) => h.id === selectedHqId)?.name || 'HQ';

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
            📝 Plan Visits ({workingEntries.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'VIEW_SUBMITTED' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('VIEW_SUBMITTED');
            fetchMyTourPlans();
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'VIEW_SUBMITTED' && styles.tabBtnTextActive]}>
            📋 Submitted TPs ({submittedPlans.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'CREATE' && (
        <>
          {/* New TP Entry Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Add Planned Visit Date</Text>

            {/* Date Input with Calendar Trigger */}
            <Text style={styles.fieldLabel}>Planned Visit Date (DD-MM-YYYY):</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="DD-MM-YYYY (e.g. 15-10-2026)"
              />
              <TouchableOpacity style={styles.calendarBtn} onPress={handleOpenCalendar}>
                <Text style={styles.calendarBtnText}>📅 Pick Date</Text>
              </TouchableOpacity>
            </View>

            {/* HQ Selector Dropdown */}
            <Text style={styles.fieldLabel}>Headquarters (HQ):</Text>
            <View style={styles.dropdownBox}>
              <select
                value={selectedHqId}
                onChange={(e: any) => handleHqChange(e.target.value)}
                style={dropdownSelectStyle}
              >
                {hqs.map((hq) => (
                  <option key={hq.id} value={hq.id}>
                    {hq.name} {hq.state ? `(${hq.state})` : ''}
                  </option>
                ))}
              </select>
              <Text style={styles.dropdownChevron}>▼</Text>
            </View>

            {/* Planned Area Dropdown (Filtered Strictly for selected HQ) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4 }}>
              <Text style={[styles.fieldLabel, { marginTop: 0, marginBottom: 0 }]}>
                Planned Area / Sub-Territory:
              </Text>
              <Text style={{ fontSize: 10.5, color: '#0369A1', fontWeight: '700' }}>
                Filtered for {activeHqName} ({availableAreas.length})
              </Text>
            </View>
            <View style={styles.dropdownBox}>
              <select
                value={selectedArea}
                onChange={(e: any) => setSelectedArea(e.target.value)}
                style={dropdownSelectStyle}
              >
                {availableAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <Text style={styles.dropdownChevron}>▼</Text>
            </View>

            {/* Type of Work Dropdown */}
            <Text style={styles.fieldLabel}>Type of Work:</Text>
            <View style={styles.dropdownBox}>
              <select
                value={selectedWorkType}
                onChange={(e: any) => setSelectedWorkType(e.target.value)}
                style={dropdownSelectStyle}
              >
                {WORK_TYPES.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </select>
              <Text style={styles.dropdownChevron}>▼</Text>
            </View>

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

            {/* Add Next TP Button */}
            <TouchableOpacity style={styles.addNextBtn} onPress={handleAddNextTp}>
              <Text style={styles.addNextBtnText}>+ Add Next TP (Continue Plan)</Text>
            </TouchableOpacity>
          </View>

          {/* Working Entries Review Table */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.cardHeader}>Planned Visits for Month ({workingEntries.length})</Text>
              {workingEntries.length > 0 && (
                <TouchableOpacity onPress={() => setWorkingEntries([])}>
                  <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {workingEntries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No TP entries added yet.</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  Select a date from calendar or type it, choose HQ & sub-area, and click "+ Add Next TP".
                </Text>
              </View>
            ) : (
              workingEntries.map((item) => (
                <View key={item.id} style={styles.entryRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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

            {/* Final Submit Button */}
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
          <Text style={styles.cardHeader}>My Submitted Tour Plans ({submittedPlans.length})</Text>
          {submittedPlans.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No submitted plans found yet.</Text>
            </View>
          ) : (
            submittedPlans.map((plan) => (
              <View key={plan.id} style={styles.submittedCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
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
                  Submitted: {formatDateDDMMYYYY(plan.submitted_at)} • {plan.entries?.length || 0} visits scheduled
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

      {/* Calendar Picker Modal */}
      {isCalendarOpen && (
        <Modal
          visible={isCalendarOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCalendarOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModalBox}>
              {/* Calendar Month & Year Navigation Header */}
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                  <Text style={styles.calNavBtnText}>◀</Text>
                </TouchableOpacity>

                <Text style={styles.calMonthTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                  <Text style={styles.calNavBtnText}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* Day of Week Row */}
              <View style={styles.calWeekRow}>
                {DAY_NAMES.map((d) => (
                  <Text key={d} style={styles.calWeekText}>{d}</Text>
                ))}
              </View>

              {/* Day Grid */}
              <View style={styles.calGrid}>
                {blankDays.map((b) => (
                  <View key={`b-${b}`} style={styles.calBlankCell} />
                ))}

                {calendarDays.map((day) => {
                  const selected = isSelectedDay(day);
                  const currentToday = isToday(day);
                  return (
                    <TouchableOpacity
                      key={`d-${day}`}
                      onPress={() => handleSelectDay(day)}
                      style={[
                        styles.calDayCell,
                        selected && styles.calDaySelected,
                        !selected && currentToday && styles.calDayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          selected && styles.calDayTextSelected,
                          !selected && currentToday && styles.calDayTextToday,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Calendar Footer Shortcuts */}
              <View style={styles.calFooter}>
                <TouchableOpacity style={styles.calTodayBtn} onPress={handleSelectToday}>
                  <Text style={styles.calTodayBtnText}>Select Today</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.calCloseBtn} onPress={() => setIsCalendarOpen(false)}>
                  <Text style={styles.calCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const dropdownSelectStyle: any = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  fontSize: 12.5,
  fontWeight: '600',
  color: '#0F172A',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
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
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  calendarBtn: {
    backgroundColor: '#1A3C6E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  dropdownBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
    position: 'relative',
    justifyContent: 'center',
  },
  dropdownChevron: {
    position: 'absolute',
    right: 12,
    fontSize: 10,
    color: '#64748B',
    pointerEvents: 'none' as any,
  },
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
  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calNavBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  calNavBtnText: {
    fontSize: 12,
    color: '#1A3C6E',
    fontWeight: '800',
  },
  calMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calBlankCell: {
    width: '14.28%',
    height: 36,
  },
  calDayCell: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  calDaySelected: {
    backgroundColor: '#1A3C6E',
  },
  calDayToday: {
    borderWidth: 1.5,
    borderColor: '#0F8B5A',
  },
  calDayText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calDayTextToday: {
    color: '#0F8B5A',
    fontWeight: '800',
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  calTodayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  calTodayBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  calCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  calCloseBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
});
