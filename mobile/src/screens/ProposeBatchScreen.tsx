import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface ProposeBatchScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserHqId?: string;
  currentUserHqName?: string;
  currentUserHqCode?: string;
  onBack?: () => void;
}

export interface RouteBatchItem {
  id: string;
  batch_code: string;
  name: string;
  route_stops: string[];
  distance_km: number;
  standard_reimbursement_rate?: number;
  hq_id?: string;
  hq_code?: string;
  hq_name?: string;
  mr_id?: string;
  mr_name?: string;
  status?: string;
  notes?: string;
  created_at?: string;
}

export const ProposeBatchScreen: React.FC<ProposeBatchScreenProps> = ({
  currentUserId,
  currentUserName,
  currentUserHqId = 'HQ-SHD-001',
  currentUserHqName = 'Shahdol',
  currentUserHqCode,
  onBack,
}) => {
  const [batches, setBatches] = useState<RouteBatchItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Form State
  const [batchCode, setBatchCode] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('');
  const [batchStops, setBatchStops] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resolvedHqCode = (
    currentUserHqCode ||
    (currentUserHqName.toLowerCase().includes('bilaspur')
      ? 'BSP'
      : currentUserHqName.toLowerCase().includes('kotma')
      ? 'KOT'
      : currentUserHqName.toLowerCase().includes('ambikapur')
      ? 'AMB'
      : 'SHD')
  ).toUpperCase();

  const standardRate = 2.25;

  const loadBatches = async () => {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(
        `${baseUrl}/territories/route-batches?hq_id=${encodeURIComponent(currentUserHqId)}`,
        { headers },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBatches(data);
          // Suggest next batch code
          const existingCodes = data.filter((b) => b.batch_code?.startsWith(resolvedHqCode));
          const nextNum = existingCodes.length + 1;
          if (!batchCode) {
            setBatchCode(`${resolvedHqCode}-B${String(nextNum).padStart(2, '0')}`);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch batches:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [currentUserHqId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBatches();
  };

  const handleSubmit = async () => {
    if (!batchCode.trim()) {
      Alert.alert('Required Field', 'Please enter a route batch code (e.g. KOT-B10).');
      return;
    }
    if (!batchName.trim()) {
      Alert.alert('Required Field', 'Please enter a descriptive circuit route name.');
      return;
    }
    const distNum = parseFloat(distanceKm);
    if (isNaN(distNum) || distNum <= 0) {
      Alert.alert('Invalid Distance', 'Please enter a valid round-trip distance in km.');
      return;
    }

    setIsSubmitting(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const stopsArray = batchStops
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        batch_code: batchCode.trim().toUpperCase(),
        name: batchName.trim(),
        hq_id: currentUserHqId,
        hq_code: resolvedHqCode,
        hq_name: currentUserHqName,
        mr_id: currentUserId,
        mr_name: currentUserName,
        route_stops: stopsArray.length > 0 ? stopsArray : [batchName.trim()],
        distance_km: distNum,
        standard_reimbursement_rate: standardRate,
        notes: notes.trim(),
        status: 'PENDING_APPROVAL',
      };

      const res = await fetch(`${baseUrl}/territories/route-batches`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert(
          'Route Batch Submitted! 🚀',
          `Itinerary [${batchCode.trim().toUpperCase()}] has been submitted to Admin for review. Once approved, it will be listed in your HQ (${currentUserHqName}) permanently.`,
        );
        setBatchName('');
        setBatchStops('');
        setDistanceKm('');
        setNotes('');
        loadBatches();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Submission Error', err.message || 'Could not submit route batch.');
      }
    } catch (err: any) {
      Alert.alert('Network Error', err?.message || 'Could not connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Text style={styles.headerTitle}>Propose Route Batch</Text>
          <Text style={styles.headerSubtitle}>
            Submit new travel circuits to Admin for review &amp; HQ listing
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1A3C6E']} />}
      >
        {/* Policy Explainer Banner */}
        <View style={styles.policyBanner}>
          <Text style={styles.policyBannerTitle}>ℹ️ Company Route Batch Guidelines</Text>
          <Text style={styles.policyBannerText}>
            • Batches are locked to your assigned HQ: <Text style={{ fontWeight: '800' }}>{currentUserHqName} ({resolvedHqCode})</Text>.{'\n'}
            • Distance must cover complete round-trip travel from HQ to all planned stops.{'\n'}
            • Once approved by Admin, the batch is saved permanently in your HQ database.
          </Text>
        </View>

        {/* Proposal Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>➕ Propose New Itinerary Route</Text>

          {/* Assigned HQ (Read-Only) */}
          <Text style={styles.inputLabel}>Assigned Operating HQ (Fixed)</Text>
          <View style={[styles.inputBox, styles.readOnlyBox]}>
            <Text style={styles.readOnlyText}>🏛️ {currentUserHqName} ({resolvedHqCode}) — {currentUserHqId}</Text>
          </View>

          {/* Batch Code */}
          <Text style={styles.inputLabel}>Route Batch Code *</Text>
          <TextInput
            style={styles.inputBox}
            value={batchCode}
            onChangeText={setBatchCode}
            placeholder={`e.g. ${resolvedHqCode}-B06`}
            autoCapitalize="characters"
          />

          {/* Batch Name */}
          <Text style={styles.inputLabel}>Circuit / Route Name *</Text>
          <TextInput
            style={styles.inputBox}
            value={batchName}
            onChangeText={setBatchName}
            placeholder={`e.g. ${currentUserHqName} - Chakarbhatha - Bodri`}
          />

          {/* Stops */}
          <Text style={styles.inputLabel}>Route Stops / Towns (Comma Separated)</Text>
          <TextInput
            style={styles.inputBox}
            value={batchStops}
            onChangeText={setBatchStops}
            placeholder={`e.g. ${currentUserHqName}, Chakarbhatha, Bodri`}
          />

          {/* Distance KM */}
          <Text style={styles.inputLabel}>Round-Trip Travel Distance (in KM) *</Text>
          <TextInput
            style={styles.inputBox}
            value={distanceKm}
            onChangeText={setDistanceKm}
            placeholder="e.g. 55"
            keyboardType="numeric"
          />

          {/* Notes */}
          <Text style={styles.inputLabel}>Justification / Notes for Admin (Optional)</Text>
          <TextInput
            style={[styles.inputBox, { minHeight: 60, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Added 4 new clinic stops on state highway"
            multiline
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { backgroundColor: '#94A3B8' }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Route Batch for Admin Approval →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing & Proposed Batches Section */}
        <View style={styles.listSection}>
          <View style={styles.listSectionHeader}>
            <Text style={styles.listSectionTitle}>
              📋 HQ Batches &amp; Proposal Status ({batches.length})
            </Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={{ fontSize: 12, color: '#1A3C6E', fontWeight: '700' }}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#1A3C6E" style={{ marginVertical: 20 }} />
          ) : batches.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No route batches found in this HQ.</Text>
            </View>
          ) : (
            batches.map((b) => {
              const isPending = b.status === 'PENDING_APPROVAL';
              const isRejected = b.status === 'REJECTED';
              const isApproved = !isPending && !isRejected;

              const stops = Array.isArray(b.route_stops)
                ? b.route_stops.join(' → ')
                : b.name;

              return (
                <View key={b.id} style={styles.batchCard}>
                  <View style={styles.batchCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>{b.batch_code}</Text>
                        </View>
                        <Text style={styles.batchName} numberOfLines={1}>
                          {b.name}
                        </Text>
                      </View>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        isApproved
                          ? styles.statusApproved
                          : isRejected
                          ? styles.statusRejected
                          : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isApproved
                            ? styles.statusTextApproved
                            : isRejected
                            ? styles.statusTextRejected
                            : styles.statusTextPending,
                        ]}
                      >
                        {isApproved ? '● Active / Approved' : isRejected ? '✕ Declined' : '⏱️ Pending Review'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.stopsText}>🛣️ Circuit: {stops}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaBadge}>🚗 {b.distance_km || 0} km (Round Trip)</Text>
                    {b.created_at && (
                      <Text style={styles.metaDate}>
                        Submitted: {formatDateDDMMYYYY(b.created_at)}
                      </Text>
                    )}
                  </View>

                  {b.notes ? (
                    <Text style={styles.notesText}>Note: "{b.notes}"</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
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
  policyBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  policyBannerTitle: { fontSize: 12.5, fontWeight: '800', color: '#1E40AF', marginBottom: 4 },
  policyBannerText: { fontSize: 11, color: '#334155', lineHeight: 16 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  formCardTitle: { fontSize: 14.5, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 5 },
  inputBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  readOnlyBox: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  readOnlyText: { fontSize: 12, color: '#475569', fontWeight: '700' },
  payoutEstimateBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  payoutEstimateText: { fontSize: 11.5, color: '#166534', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  listSection: { marginBottom: 30 },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listSectionTitle: { fontSize: 13.5, fontWeight: '800', color: '#0F172A' },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { fontSize: 12, color: '#64748B' },
  batchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  batchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  codeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#1D4ED8' },
  batchName: { fontSize: 13, fontWeight: '700', color: '#0F172A', flex: 1 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 12 },
  statusApproved: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextApproved: { color: '#15803D' },
  statusTextPending: { color: '#B45309' },
  statusTextRejected: { color: '#B91C1C' },
  stopsText: { fontSize: 11.5, color: '#334155', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  metaDate: { fontSize: 10, color: '#94A3B8' },
  notesText: { fontSize: 10.5, color: '#64748B', fontStyle: 'italic', marginTop: 6 },
});

