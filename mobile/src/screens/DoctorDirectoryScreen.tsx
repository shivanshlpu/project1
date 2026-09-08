import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { InteractiveMapPicker } from '../components/InteractiveMapPicker';
import { PinCategory } from '../utils/mapPinGenerator';

export interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  class: 'A' | 'B' | 'C';
  potential_score: number;
  clinic: string;
  hospital?: string;
  address?: string;
  area_name?: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  visit_count?: number;
  assigned_mr_id?: string;
  assigned_mr_name?: string;
  category?: PinCategory;
}

interface DoctorDirectoryScreenProps {
  currentUser?: {
    id: string;
    name: string;
    role: string;
    phone?: string;
  };
}

export const DoctorDirectoryScreen: React.FC<DoctorDirectoryScreenProps> = ({
  currentUser = { id: 'usr-mr-01', name: 'Rahul Sharma', role: 'MR' },
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([
    {
      id: 'doc-01',
      name: 'Dr. Rajesh Sharma',
      qualification: 'MD, DM (Cardiology)',
      specialization: 'Cardiologist',
      class: 'A',
      potential_score: 95,
      clinic: 'Apex Heart Centre',
      hospital: 'Max Super Specialty Hospital',
      address: 'Ring Road, Saket, South Delhi',
      area_name: 'South Delhi (Saket)',
      phone: '+91 98111 22233',
      latitude: 28.5245,
      longitude: 77.2066,
      visit_count: 14,
      assigned_mr_id: 'usr-mr-01',
      assigned_mr_name: 'Rahul Sharma',
      category: 'HOSPITAL',
    },
    {
      id: 'doc-02',
      name: 'Dr. Priya Verma',
      qualification: 'MBBS, DNB (Paediatrics)',
      specialization: 'Paediatrician',
      class: 'B',
      potential_score: 82,
      clinic: 'Little Care Clinic',
      address: 'Green Park Extension, New Delhi',
      area_name: 'South Delhi (Green Park)',
      phone: '+91 98111 44455',
      latitude: 28.5585,
      longitude: 77.2028,
      visit_count: 9,
      assigned_mr_id: 'usr-mr-01',
      assigned_mr_name: 'Rahul Sharma',
      category: 'CLINIC',
    },
    {
      id: 'doc-03',
      name: 'Dr. Anita Desai',
      qualification: 'MBBS, MD (Dermatology)',
      specialization: 'Dermatologist',
      class: 'A',
      potential_score: 91,
      clinic: 'Skin Care Centre',
      address: 'Hauz Khas Market, New Delhi',
      area_name: 'South Delhi (Hauz Khas)',
      phone: '+91 98777 66554',
      latitude: 28.5494,
      longitude: 77.2001,
      visit_count: 11,
      assigned_mr_id: 'usr-mr-02',
      assigned_mr_name: 'Vikram Malhotra',
      category: 'CLINIC',
    },
    {
      id: 'doc-04',
      name: 'Dr. Sameer Kapoor',
      qualification: 'MBBS',
      specialization: 'General Physician',
      class: 'C',
      potential_score: 64,
      clinic: 'Kapoor Health Clinic',
      address: 'Main Market, Malviya Nagar',
      area_name: 'South Delhi (Malviya Nagar)',
      phone: '+91 98999 11122',
      latitude: 28.53,
      longitude: 77.215,
      visit_count: 5,
      assigned_mr_id: 'usr-mr-03',
      assigned_mr_name: 'Pooja Verma',
      category: 'CLINIC',
    },
  ]);

  const [filterMode, setFilterMode] = useState<'assigned' | 'all'>('assigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Map Picker State
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [targetDoctorForMap, setTargetDoctorForMap] = useState<Doctor | null>(null);

  // Fetch doctors from backend
  const loadDoctors = async () => {
    setIsLoading(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/doctors`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDoctors(data);
        }
      }
    } catch {
      // Keep offline fallback state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  // Filtered doctors list
  const filteredDoctors = doctors.filter((doc) => {
    const matchesAssigned =
      filterMode === 'assigned' ? doc.assigned_mr_id === currentUser.id : true;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesAssigned;
    const matchesQuery =
      doc.name.toLowerCase().includes(query) ||
      doc.clinic.toLowerCase().includes(query) ||
      doc.specialization.toLowerCase().includes(query) ||
      (doc.address && doc.address.toLowerCase().includes(query)) ||
      (doc.area_name && doc.area_name.toLowerCase().includes(query));
    return matchesAssigned && matchesQuery;
  });

  const myAssignedCount = doctors.filter((d) => d.assigned_mr_id === currentUser.id).length;
  const taggedCount = doctors.filter(
    (d) => d.assigned_mr_id === currentUser.id && d.latitude && d.longitude,
  ).length;

  // Open Interactive Map for a specific doctor
  const handleOpenDoctorMap = (doc: Doctor) => {
    setTargetDoctorForMap(doc);
    setIsMapPickerOpen(true);
  };

  // Open Interactive Map to Add New Doctor / Facility
  const handleAddNewPlace = () => {
    setTargetDoctorForMap(null);
    setIsMapPickerOpen(true);
  };

  // Save location from Interactive Map Picker
  const handleSaveLocationFromMap = async (data: {
    name: string;
    doctor_name?: string;
    category: PinCategory;
    latitude: number;
    longitude: number;
    address: string;
    phone?: string;
  }) => {
    setIsMapPickerOpen(false);

    const baseUrl = await ApiConfig.getBaseUrl();
    const headers = await ApiConfig.getAuthHeaders();

    if (targetDoctorForMap) {
      // 1. Updating Existing Doctor
      const docId = targetDoctorForMap.id;
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                clinic: data.name,
                name: data.doctor_name || d.name,
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.address,
                phone: data.phone || d.phone,
                category: data.category,
              }
            : d,
        ),
      );

      try {
        // Update Doctor
        await fetch(`${baseUrl}/doctors/${docId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            clinic: data.name,
            name: data.doctor_name,
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address,
            phone: data.phone,
          }),
        });

        // Register Location in Locations table
        await fetch(`${baseUrl}/locations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: data.name,
            doctor_name: data.doctor_name || targetDoctorForMap.name,
            category: data.category,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            phone: data.phone || targetDoctorForMap.phone,
            mr_id: currentUser.id,
            mr_name: `${currentUser.name} (Field MR)`,
          }),
        });
      } catch {
        // Fallback
      }

      Alert.alert(
        'Location Geotagged',
        `Successfully marked exact coordinates (${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}) for ${targetDoctorForMap.name} at ${data.name}.`,
      );
    } else {
      // 2. Creating New Doctor & Facility Discovery
      const newDocId = `doc-mr-${Date.now().toString().slice(-4)}`;
      const newDoc: Doctor = {
        id: newDocId,
        name: data.doctor_name || 'Medical Specialist',
        qualification: 'MBBS, MD',
        specialization: data.category === 'HOSPITAL' ? 'Cardiology / Multi-Specialty' : 'General Practice',
        class: 'A',
        potential_score: 85,
        clinic: data.name,
        address: data.address,
        area_name: 'South Delhi',
        phone: data.phone || '+91 98000 00000',
        latitude: data.latitude,
        longitude: data.longitude,
        visit_count: 0,
        assigned_mr_id: currentUser.id,
        assigned_mr_name: currentUser.name,
        category: data.category,
      };

      setDoctors((prev) => [newDoc, ...prev]);

      try {
        await fetch(`${baseUrl}/doctors`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: newDoc.name,
            qualification: newDoc.qualification,
            specialization: newDoc.specialization,
            class: newDoc.class,
            potential_score: newDoc.potential_score,
            clinic: newDoc.clinic,
            address: newDoc.address,
            phone: newDoc.phone,
            latitude: newDoc.latitude,
            longitude: newDoc.longitude,
            assigned_mr_id: currentUser.id,
            assigned_mr_name: currentUser.name,
          }),
        });

        await fetch(`${baseUrl}/locations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: newDoc.clinic,
            doctor_name: newDoc.name,
            category: data.category,
            address: newDoc.address,
            latitude: newDoc.latitude,
            longitude: newDoc.longitude,
            phone: newDoc.phone,
            mr_id: currentUser.id,
            mr_name: `${currentUser.name} (Field MR)`,
          }),
        });
      } catch {
        // Fallback
      }

      Alert.alert(
        'New Place & Doctor Registered',
        `"${data.name}" has been mapped at (${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}) and linked to your territory agenda.`,
      );
    }
  };

  // If map picker is open, render full-viewport interactive map picker
  if (isMapPickerOpen) {
    return (
      <InteractiveMapPicker
        isOpen={true}
        onClose={() => setIsMapPickerOpen(false)}
        initialLat={targetDoctorForMap?.latitude || 28.5245}
        initialLng={targetDoctorForMap?.longitude || 77.2066}
        initialCategory={targetDoctorForMap?.category || 'CLINIC'}
        initialName={targetDoctorForMap?.clinic || ''}
        initialDoctorName={targetDoctorForMap?.name || ''}
        initialAddress={targetDoctorForMap?.address || ''}
        initialPhone={targetDoctorForMap?.phone || ''}
        onSave={handleSaveLocationFromMap}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header & Search Panel */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.screenTitle}>Doctors & Locations</Text>
            <Text style={styles.screenSubtitle}>
              Territory doctor directory and interactive GPS pinpointing
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddNewPlace}>
            <Text style={styles.addBtnText}>+ Add on Map</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Bar */}
        <View style={styles.statsStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>My Assigned</Text>
            <Text style={styles.statVal}>{myAssignedCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Geotagged</Text>
            <Text style={[styles.statVal, { color: '#0F8B5A' }]}>{taggedCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Need Geotag</Text>
            <Text
              style={[
                styles.statVal,
                { color: myAssignedCount - taggedCount > 0 ? '#DC2626' : '#64748B' },
              ]}
            >
              {Math.max(0, myAssignedCount - taggedCount)}
            </Text>
          </View>
        </View>

        {/* Territory Filter & Search */}
        <View style={styles.controlsRow}>
          <View style={styles.filterPills}>
            <TouchableOpacity
              style={[styles.filterPill, filterMode === 'assigned' && styles.filterPillActive]}
              onPress={() => setFilterMode('assigned')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterMode === 'assigned' && styles.filterPillTextActive,
                ]}
              >
                My Assigned ({myAssignedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, filterMode === 'all' && styles.filterPillActive]}
              onPress={() => setFilterMode('all')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterMode === 'all' && styles.filterPillTextActive,
                ]}
              >
                All Territory ({doctors.length})
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search doctor, hospital, clinic, specialization..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Doctor Cards Scroll List */}
      <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0052cc" />
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
              Syncing directory...
            </Text>
          </View>
        )}

        {filteredDoctors.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateTitle}>No Doctors or Places Found</Text>
            <Text style={styles.emptyStateSub}>
              {filterMode === 'assigned'
                ? 'No doctors currently assigned to your ID in this view.'
                : 'No results matched your search term.'}
            </Text>
          </View>
        ) : (
          filteredDoctors.map((doc) => {
            const isAssignedToMe = doc.assigned_mr_id === currentUser.id;
            const hasGeotag = Boolean(doc.latitude && doc.longitude);

            return (
              <View key={doc.id} style={styles.doctorCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.doctorName}>{doc.name}</Text>
                      <View
                        style={[
                          styles.classBadge,
                          doc.class === 'A'
                            ? styles.classBadgeA
                            : doc.class === 'B'
                            ? styles.classBadgeB
                            : styles.classBadgeC,
                        ]}
                      >
                        <Text
                          style={[
                            styles.classBadgeText,
                            doc.class === 'A'
                              ? styles.classTextA
                              : doc.class === 'B'
                              ? styles.classTextB
                              : styles.classTextC,
                          ]}
                        >
                          Class {doc.class}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.qualificationText}>
                      {doc.qualification} • {doc.specialization}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.potentialScore}>{doc.potential_score} Pts</Text>
                    <Text style={styles.potentialLabel}>Potential</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Facility / Place:</Text>
                    <Text style={styles.infoValue}>{doc.clinic}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Address / Landmark:</Text>
                    <Text style={styles.infoValue}>
                      {doc.address || doc.area_name || 'South Delhi'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{doc.phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Representative:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        isAssignedToMe ? { color: '#0052cc', fontWeight: '700' } : {},
                      ]}
                    >
                      {doc.assigned_mr_name || 'Unassigned'}
                      {isAssignedToMe ? ' (You)' : ''}
                    </Text>
                  </View>
                </View>

                {/* Geotag GPS Status & Interactive Map Action */}
                <View style={styles.geotagStrip}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View
                        style={[
                          styles.statusDot,
                          hasGeotag ? styles.statusDotGreen : styles.statusDotOrange,
                        ]}
                      />
                      <Text
                        style={[
                          styles.geotagStatusText,
                          hasGeotag ? styles.textGreen : styles.textOrange,
                        ]}
                      >
                        {hasGeotag ? 'Geotagged & Verified' : 'Location Not Geotagged'}
                      </Text>
                    </View>
                    {hasGeotag ? (
                      <Text style={styles.coordsText}>
                        GPS: {doc.latitude?.toFixed(4)}, {doc.longitude?.toFixed(4)}
                      </Text>
                    ) : (
                      <Text style={styles.coordsMissingText}>
                        Open interactive map to set pinpoint
                      </Text>
                    )}
                  </View>

                  {/* Interactive Map Button */}
                  <TouchableOpacity
                    style={[
                      styles.mapActionBtn,
                      hasGeotag ? styles.mapActionBtnUpdate : styles.mapActionBtnNew,
                    ]}
                    onPress={() => handleOpenDoctorMap(doc)}
                  >
                    <Text
                      style={[
                        styles.mapActionBtnText,
                        hasGeotag ? styles.mapActionBtnTextUpdate : styles.mapActionBtnTextNew,
                      ]}
                    >
                      {hasGeotag ? 'Update on Map' : 'Pinpoint on Map'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#0052cc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
  },
  controlsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0052cc',
    borderColor: '#0052cc',
  },
  filterPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  listScroll: {
    flex: 1,
    padding: 12,
  },
  emptyStateBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  qualificationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  classBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  classBadgeA: { backgroundColor: '#DBEAFE' },
  classBadgeB: { backgroundColor: '#FEF3C7' },
  classBadgeC: { backgroundColor: '#F1F5F9' },
  classBadgeText: { fontSize: 10, fontWeight: '700' },
  classTextA: { color: '#1E40AF' },
  classTextB: { color: '#B45309' },
  classTextC: { color: '#475569' },
  potentialScore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F8B5A',
  },
  potentialLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  geotagStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotGreen: { backgroundColor: '#0F8B5A' },
  statusDotOrange: { backgroundColor: '#D97706' },
  geotagStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textGreen: { color: '#0F8B5A' },
  textOrange: { color: '#D97706' },
  coordsText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  coordsMissingText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  mapActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  mapActionBtnNew: {
    backgroundColor: '#0F8B5A',
  },
  mapActionBtnUpdate: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mapActionBtnTextNew: {
    color: '#FFFFFF',
  },
  mapActionBtnTextUpdate: {
    color: '#334155',
  },
});
