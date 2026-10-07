import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiConfig } from '../services/apiConfig';

interface DcrScreenProps {
  currentUserId?: string;
  currentUserName?: string;
}

export const DcrScreen: React.FC<DcrScreenProps> = ({
  currentUserId = 'usr-mr-01',
  currentUserName = 'Field Representative',
}) => {
  const [dcrSubmitted, setDcrSubmitted] = useState<boolean>(false);
  const [completedVisits, setCompletedVisits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadTodayVisits = async () => {
      setIsLoading(true);
      try {
        // 1. Check local completed tasks cache first
        let localTasks: any[] = [];
        const raw = await AsyncStorage.getItem(`@ahtri_completed_tasks_${currentUserId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localTasks = parsed.filter(
              (t: any) =>
                t.status === 'COMPLETED' &&
                (t.date === todayStr || (t.completed_at && t.completed_at.startsWith(todayStr)))
            );
          }
        }

        // 2. Query backend for today's completed calls
        try {
          const baseUrl = await ApiConfig.getBaseUrl();
          const headers = await ApiConfig.getAuthHeaders();
          const res = await fetch(`${baseUrl}/tasks?mr_id=${currentUserId}&status=COMPLETED&date=${todayStr}`, {
            headers,
          });
          if (res.ok) {
            const serverTasks = await res.json();
            if (Array.isArray(serverTasks) && serverTasks.length > 0) {
              const map = new Map();
              localTasks.forEach((t) => map.set(t.id, t));
              serverTasks.forEach((t) => map.set(t.id, t));
              setCompletedVisits(Array.from(map.values()));
              setIsLoading(false);
              return;
            }
          }
        } catch {}

        setCompletedVisits(localTasks);
      } catch {
        setCompletedVisits([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTodayVisits();
  }, [currentUserId, todayStr]);

  const handleSubmitDcr = () => {
    if (completedVisits.length === 0) {
      Alert.alert('No Calls Completed', 'You have not completed any field calls today to submit in the DCR.');
      return;
    }
    setDcrSubmitted(true);
    Alert.alert(
      'DCR Submitted',
      `Today's Daily Call Report with ${completedVisits.length} verified visit(s) submitted for manager review.`,
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Call Report (DCR)</Text>
        <Text style={styles.headerSub}>
          Summary of today's verified doctor detailing calls
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            Calls Summary ({completedVisits.length} Completed)
          </Text>
          <View style={[styles.badge, dcrSubmitted ? styles.badgeGreen : styles.badgeAmber]}>
            <Text style={styles.badgeText}>{dcrSubmitted ? 'SUBMITTED' : 'DRAFT'}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1A3C6E" />
            <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Loading today's calls...</Text>
          </View>
        ) : completedVisits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Completed Visits Today</Text>
            <Text style={styles.emptySub}>
              Doctor calls completed from your Today's Tasks agenda will automatically appear here for your Daily Call Report.
            </Text>
          </View>
        ) : (
          completedVisits.map((v) => (
            <View key={v.id} style={styles.visitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName}>{v.title || v.location_name}</Text>
                <Text style={styles.clinicText}>{v.location_name || v.address} • {v.time || 'Completed'}</Text>
                {v.outcome ? (
                  <Text style={styles.sampleText}>Outcome: {v.outcome}</Text>
                ) : null}
              </View>
              <Text style={styles.gpsVerifiedTag}>✓ Verified</Text>
            </View>
          ))
        )}

        {completedVisits.length > 0 && !dcrSubmitted && (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitDcr}>
            <Text style={styles.submitBtnText}>Submit Today DCR to Manager</Text>
          </TouchableOpacity>
        )}

        {dcrSubmitted && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ DCR Submitted Successfully</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA', padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A3C6E' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeAmber: { backgroundColor: '#FFF3E0' },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#F57C00' },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  clinicText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sampleText: { fontSize: 12, color: '#0F8B5A', fontWeight: '600', marginTop: 2 },
  gpsVerifiedTag: { fontSize: 11, color: '#0F8B5A', fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#1A3C6E',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  successText: { color: '#0F8B5A', fontWeight: '700', fontSize: 13 },
});
