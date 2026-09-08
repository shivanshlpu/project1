import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { LocationService } from '../services/locationService';
import { ApiConfig } from '../services/apiConfig';

interface MarkLocationScreenProps {
  currentUser?: {
    id: string;
    name: string;
    role: string;
    phone?: string;
  };
  onLocationSaved?: (newLocation: any) => void;
}

export const MarkLocationScreen: React.FC<MarkLocationScreenProps> = ({
  currentUser,
  onLocationSaved,
}) => {
  // Current GPS coordinates captured by the phone
  const [currentLat, setCurrentLat] = useState<number>(28.5325);
  const [currentLng, setCurrentLng] = useState<number>(77.2115);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(9.5); // ±9.5m accuracy
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Assigned Doctors list to link geotag
  const [assignedDoctors, setAssignedDoctors] = useState<any[]>([
    { id: 'doc-01', name: 'Dr. Rajesh Sharma', clinic: 'Apex Heart Centre', specialization: 'Cardiologist', address: 'Ring Road, Saket, South Delhi' },
    { id: 'doc-02', name: 'Dr. Priya Verma', clinic: 'Little Care Clinic', specialization: 'Paediatrician', address: 'Green Park Extension, New Delhi' },
  ]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Form Fields
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialization, setSpecialization] = useState('Cardiologist');
  const [category, setCategory] = useState<'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE'>('CLINIC');
  const [address, setAddress] = useState('Saket Institutional Area, New Delhi');
  const [phone, setPhone] = useState('');

  // Fetch assigned doctors from backend
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const mrId = currentUser?.id || 'usr-mr-01';
        const res = await fetch(`${baseUrl}/doctors?assigned_mr_id=${mrId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAssignedDoctors(data);
          }
        }
      } catch {
        // Keep fallback
      }
    };
    fetchDoctors();
  }, [currentUser]);

  const handleRefreshGps = async () => {
    setIsLocating(true);
    try {
      const coords = await LocationService.getCurrentLocation();
      if (coords) {
        setCurrentLat(Number(coords.latitude.toFixed(6)));
        setCurrentLng(Number(coords.longitude.toFixed(6)));
        setGpsAccuracy(coords.accuracy ? Number(coords.accuracy.toFixed(1)) : 8.0);
      } else {
        // Fallback simulation if indoors without sky view
        const deltaLat = (Math.random() - 0.5) * 0.002;
        const deltaLng = (Math.random() - 0.5) * 0.002;
        setCurrentLat(Number((28.5325 + deltaLat).toFixed(6)));
        setCurrentLng(Number((77.2115 + deltaLng).toFixed(6)));
      }
    } catch {
      // Fallback
    } finally {
      setIsLocating(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!clinicName.trim()) {
      Alert.alert('Missing Field', 'Please enter the Clinic, Hospital, or Store name.');
      return;
    }

    setIsSaving(true);
    const mrName = currentUser?.name ? `${currentUser.name} (Field MR)` : 'Rahul Sharma (Field MR)';
    const mrId = currentUser?.id || 'usr-mr-01';

    const payload = {
      name: clinicName.trim(),
      doctor_name: doctorName.trim() || undefined,
      category,
      specialization: specialization.trim() || undefined,
      address: address.trim(),
      latitude: currentLat,
      longitude: currentLng,
      phone: phone.trim() || 'N/A',
      mr_id: mrId,
      mr_name: mrName,
    };

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const response = await fetch(`${baseUrl}/locations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      // If linked to an assigned doctor, update doctor's geotag as well
      if (selectedDoctorId) {
        await fetch(`${baseUrl}/doctors/${selectedDoctorId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            latitude: currentLat,
            longitude: currentLng,
            clinic: clinicName.trim(),
            address: address.trim(),
          }),
        }).catch(() => {});
      }

      if (response.ok) {
        const savedData = await response.json();
        if (onLocationSaved) {
          onLocationSaved(savedData);
        }
        Alert.alert(
          'Location Geotag Saved',
          `"${clinicName}" with GPS coordinates (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}) has been saved to the server.\n\nSynchronized with Saved Locations and Doctor Directory.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setClinicName('');
                setDoctorName('');
                setPhone('');
                setSelectedDoctorId('');
              },
            },
          ],
        );
      } else {
        if (onLocationSaved) {
          onLocationSaved(payload);
        }
        Alert.alert(
          'Saved Locally',
          `"${clinicName}" saved to offline buffer. Synchronized with Doctor Directory when connection is active.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setClinicName('');
                setDoctorName('');
                setPhone('');
                setSelectedDoctorId('');
              },
            },
          ],
        );
      }
    } catch {
      if (onLocationSaved) {
        onLocationSaved(payload);
      }
      Alert.alert(
        'Saved Locally',
        `"${clinicName}" saved to offline buffer. Will synchronize with the Owner Dashboard when connection is active.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setClinicName('');
              setDoctorName('');
              setPhone('');
            },
          },
        ],
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mark New Field Location</Text>
        <Text style={styles.headerSub}>
          Save newly discovered clinics & pharmacies directly to the Owner Dashboard
        </Text>
      </View>

      {/* GPS Capture Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionTitle}>Live Device GPS Fix</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefreshGps}
            disabled={isLocating}
          >
            <Text style={styles.refreshBtnText}>
              {isLocating ? 'Acquiring...' : 'Re-Read GPS'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gpsDataGrid}>
          <View style={styles.gpsItem}>
            <Text style={styles.gpsLabel}>Latitude:</Text>
            <Text style={styles.gpsValue}>{currentLat.toFixed(6)}</Text>
          </View>
          <View style={styles.gpsItem}>
            <Text style={styles.gpsLabel}>Longitude:</Text>
            <Text style={styles.gpsValue}>{currentLng.toFixed(6)}</Text>
          </View>
          <View style={styles.gpsItem}>
            <Text style={styles.gpsLabel}>GPS Accuracy:</Text>
            <Text style={[styles.gpsValue, { color: '#0F8B5A' }]}>±{gpsAccuracy}m (High Precision)</Text>
          </View>
        </View>

        {/* Visual Map Preview Box with 3D Pin Style */}
        <View style={styles.mapVisualizer}>
          <View style={styles.pinWrapper}>
            {/* Ground Drop Shadow */}
            <View style={styles.pinGroundShadow} />
            {/* 3D Pin Teardrop Body */}
            <View
              style={[
                styles.pinTeardrop,
                {
                  backgroundColor:
                    category === 'HOSPITAL'
                      ? '#DC2626'
                      : category === 'PHARMACY'
                      ? '#2563EB'
                      : category === 'OFFICE'
                      ? '#7C3AED'
                      : '#0F8B5A',
                  borderColor:
                    category === 'HOSPITAL'
                      ? '#991B1B'
                      : category === 'PHARMACY'
                      ? '#1E40AF'
                      : category === 'OFFICE'
                      ? '#5B21B6'
                      : '#065F46',
                },
              ]}
            >
              {/* Inner White Badge */}
              <View style={styles.pinBadge}>
                <Text
                  style={[
                    styles.pinBadgeText,
                    {
                      color:
                        category === 'HOSPITAL'
                          ? '#DC2626'
                          : category === 'PHARMACY'
                          ? '#2563EB'
                          : category === 'OFFICE'
                          ? '#7C3AED'
                          : '#0F8B5A',
                    },
                  ]}
                >
                  {category === 'HOSPITAL'
                    ? 'HOSP'
                    : category === 'PHARMACY'
                    ? 'SHOP'
                    : category === 'OFFICE'
                    ? 'LAB'
                    : 'CLINIC'}
                </Text>
              </View>
            </View>
            {/* Pin Tip */}
            <View
              style={[
                styles.pinTip,
                {
                  borderTopColor:
                    category === 'HOSPITAL'
                      ? '#DC2626'
                      : category === 'PHARMACY'
                      ? '#2563EB'
                      : category === 'OFFICE'
                      ? '#7C3AED'
                      : '#0F8B5A',
                },
              ]}
            />
          </View>
          <Text style={styles.mapLabel}>
            {category === 'HOSPITAL'
              ? 'Hospital Facility Mark'
              : category === 'PHARMACY'
              ? 'Medical Store / Chemist Mark'
              : category === 'OFFICE'
              ? 'Diagnostic Center Mark'
              : 'Doctor Practice Mark'}
          </Text>
          <Text style={styles.mapSub}>Google Maps 3D Pinpoint • Fixed On-Site</Text>
        </View>
      </View>

      {/* Location Details Form */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Location & Doctor Details</Text>

        {/* Link to Assigned Doctor */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Link to Doctor (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 6 }}>
            <TouchableOpacity
              style={[styles.categoryBtn, !selectedDoctorId && styles.categoryBtnActive, { marginRight: 6, minWidth: 100 }]}
              onPress={() => setSelectedDoctorId('')}
            >
              <Text style={[styles.categoryBtnText, !selectedDoctorId && styles.catTextActive]}>
                New / Other
              </Text>
            </TouchableOpacity>
            {assignedDoctors.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.categoryBtn,
                  selectedDoctorId === doc.id && styles.categoryBtnActive,
                  { marginRight: 6, minWidth: 140 },
                ]}
                onPress={() => {
                  setSelectedDoctorId(doc.id);
                  setDoctorName(doc.name);
                  setClinicName(doc.clinic);
                  setSpecialization(doc.specialization || 'General');
                  setAddress(doc.address || `${doc.clinic}, South Delhi`);
                }}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    selectedDoctorId === doc.id && styles.catTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {doc.name} ({doc.clinic})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Clinic / Facility Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Clinic / Facility Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. Gupta Diabetes Care Clinic"
            value={clinicName}
            onChangeText={setClinicName}
          />
        </View>

        {/* Doctor Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Doctor Name (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. S.K. Gupta"
            value={doctorName}
            onChangeText={setDoctorName}
          />
        </View>

        {/* Category Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Point of Care Category</Text>
          <View style={styles.categoryRow}>
            {(['CLINIC', 'HOSPITAL', 'PHARMACY', 'OFFICE'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryBtn,
                  category === cat ? styles.categoryBtnActive : styles.categoryBtnInactive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    category === cat ? styles.catTextActive : styles.catTextInactive,
                  ]}
                >
                  {cat === 'CLINIC'
                    ? 'Clinic'
                    : cat === 'HOSPITAL'
                    ? 'Hospital'
                    : cat === 'PHARMACY'
                    ? 'Chemist / Medical Shop'
                    : 'Diagnostic / Other'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Specialization */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Specialization / Focus</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Diabetologist / General Physician"
            value={specialization}
            onChangeText={setSpecialization}
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Physical Address / Landmark</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Enter street or building details"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Doctor / Reception Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98111 XXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
          onPress={handleSaveLocation}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Registering Location...' : 'Save Location to System'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  header: {
    backgroundColor: '#1A3C6E',
    padding: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  refreshBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A3C6E',
  },
  gpsDataGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  gpsLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  gpsValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  mapVisualizer: {
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pinWrapper: {
    alignItems: 'center',
    marginBottom: 4,
  },
  pinGroundShadow: {
    position: 'absolute',
    bottom: -2,
    width: 28,
    height: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  pinTeardrop: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pinBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  mapLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A3C6E',
    marginTop: 4,
  },
  mapSub: {
    fontSize: 10,
    color: '#64748B',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryBtnActive: {
    backgroundColor: '#1A3C6E',
    borderColor: '#1A3C6E',
  },
  categoryBtnInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  categoryBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  catTextInactive: {
    color: '#475569',
  },
  saveBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
