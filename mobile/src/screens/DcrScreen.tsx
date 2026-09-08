import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';

export const DcrScreen: React.FC = () => {
  const [dcrSubmitted, setDcrSubmitted] = useState<boolean>(false);

  const autoPopulatedVisits = [
    {
      id: 'vis-1',
      doctorName: 'Dr. Rajesh Sharma',
      time: '10:30 AM (18 mins)',
      clinic: 'Apex Heart Centre, Saket',
      products: 'CardioFix-50',
      samples: 5,
      geofenceVerified: true,
    },
    {
      id: 'vis-2',
      doctorName: 'Dr. Priya Verma',
      time: '04:45 PM (22 mins)',
      clinic: 'Little Care Clinic, Green Park',
      products: 'Pedix Suspension',
      samples: 4,
      geofenceVerified: true,
    },
  ];

  const handleSubmitDcr = () => {
    setDcrSubmitted(true);
    Alert.alert(
      'DCR Submitted',
      'Today Daily Call Report submitted for Manager review. No manual re-typing required (§16).',
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Call Report (DCR)</Text>
        <Text style={styles.headerSub}>
          Auto-populated from today's GPS-verified doctor detailing visits (§4.2)
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Calls Summary (2 Completed)</Text>
          <View style={[styles.badge, dcrSubmitted ? styles.badgeGreen : styles.badgeAmber]}>
            <Text style={styles.badgeText}>{dcrSubmitted ? 'SUBMITTED' : 'DRAFT READY'}</Text>
          </View>
        </View>

        {autoPopulatedVisits.map((v) => (
          <View key={v.id} style={styles.visitRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>{v.doctorName}</Text>
              <Text style={styles.clinicText}>{v.clinic} • {v.time}</Text>
              <Text style={styles.sampleText}>Samples Handed: {v.samples} units ({v.products})</Text>
            </View>
            <Text style={styles.gpsVerifiedTag}>✓ 20m Verified</Text>
          </View>
        ))}

        {!dcrSubmitted ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitDcr}>
            <Text style={styles.submitBtnText}>Submit Today DCR to Manager</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ DCR Sent to Area Manager Anil Kumar</Text>
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
