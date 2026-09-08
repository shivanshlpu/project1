import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { PinCategory } from '../utils/mapPinGenerator';
import { LocationService } from '../services/locationService';

interface InteractiveMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  initialCategory?: PinCategory;
  initialName?: string;
  initialDoctorName?: string;
  initialAddress?: string;
  initialPhone?: string;
  onSave: (data: {
    name: string;
    doctor_name?: string;
    category: PinCategory;
    latitude: number;
    longitude: number;
    address: string;
    phone?: string;
  }) => void;
}

const CATEGORIES: { id: PinCategory; label: string; color: string }[] = [
  { id: 'CLINIC', label: 'Clinic', color: '#1B9AAA' },
  { id: 'HOSPITAL', label: 'Hospital', color: '#E63946' },
  { id: 'PHARMACY', label: 'Pharmacy', color: '#0F8B5A' },
  { id: 'CHEMIST', label: 'Chemist', color: '#E76F51' },
];

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  isOpen,
  onClose,
  initialLat = 28.5245,
  initialLng = 77.2066,
  initialCategory = 'CLINIC',
  initialName = '',
  initialDoctorName = '',
  initialAddress = '',
  initialPhone = '',
  onSave,
}) => {
  const [selectedLat, setSelectedLat] = useState<number>(initialLat);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(8.0);
  const [category, setCategory] = useState<PinCategory>(initialCategory);
  const [placeName, setPlaceName] = useState<string>(initialName);
  const [doctorName, setDoctorName] = useState<string>(initialDoctorName);
  const [address, setAddress] = useState<string>(initialAddress);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGetCurrentLocation = async () => {
    setIsLocatingGps(true);
    try {
      const loc = await LocationService.getCurrentLocation();
      if (loc) {
        setSelectedLat(Number(loc.coords.latitude.toFixed(6)));
        setSelectedLng(Number(loc.coords.longitude.toFixed(6)));
        if (loc.coords.accuracy) {
          setGpsAccuracy(Number(loc.coords.accuracy.toFixed(1)));
        }
        Alert.alert(
          'GPS Location Acquired',
          `Coordinates: ${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)} (Accuracy: ±${loc.coords.accuracy?.toFixed(1) || '8'}m)`
        );
      } else {
        Alert.alert('Location Error', 'Unable to retrieve high-accuracy GPS coordinates.');
      }
    } catch (err: any) {
      Alert.alert('GPS Error', err?.message || 'Could not fetch device location');
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handleSave = () => {
    if (!placeName.trim()) {
      Alert.alert('Missing Name', 'Please enter a facility or clinic name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Missing Address', 'Please provide an address for this location.');
      return;
    }

    onSave({
      name: placeName.trim(),
      doctor_name: doctorName.trim() || undefined,
      category,
      latitude: selectedLat,
      longitude: selectedLng,
      address: address.trim(),
      phone: phone.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mark Facility Location</Text>
            <Text style={styles.subtitle}>Geotag Clinic, Hospital, or Chemist</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
          {/* GPS Coordinates Card */}
          <View style={styles.gpsCard}>
            <View style={styles.gpsRow}>
              <View style={styles.gpsInfo}>
                <Text style={styles.gpsLabel}>CURRENT GEOTAG COORDINATES</Text>
                <Text style={styles.gpsCoords}>
                  {selectedLat.toFixed(6)}° N, {selectedLng.toFixed(6)}° E
                </Text>
                <Text style={styles.gpsAccuracy}>GPS Accuracy: ±{gpsAccuracy}m</Text>
              </View>

              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={handleGetCurrentLocation}
                disabled={isLocatingGps}
              >
                {isLocatingGps ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.gpsBtnText}>Update GPS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Selector */}
          <Text style={styles.sectionHeading}>Facility Type</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryTab,
                    isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Facility Name */}
          <Text style={styles.inputLabel}>Facility / Clinic Name *</Text>
          <TextInput
            style={styles.textInput}
            value={placeName}
            onChangeText={setPlaceName}
            placeholder="e.g. Metro Heart Clinic"
            placeholderTextColor="#94A3B8"
          />

          {/* Doctor Name */}
          <Text style={styles.inputLabel}>Key Doctor / Contact Person</Text>
          <TextInput
            style={styles.textInput}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="e.g. Dr. Rajesh Sharma, MD"
            placeholderTextColor="#94A3B8"
          />

          {/* Address */}
          <Text style={styles.inputLabel}>Full Address *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Street, Landmark, Area, City, Pincode"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
          />

          {/* Phone */}
          <Text style={styles.inputLabel}>Contact Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />

          {/* Coordinate Adjustment Inputs */}
          <Text style={styles.sectionHeading}>Manual Coordinate Adjustment</Text>
          <View style={styles.coordInputsRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.coordSubLabel}>Latitude</Text>
              <TextInput
                style={styles.coordInput}
                value={String(selectedLat)}
                onChangeText={(val) => {
                  const n = parseFloat(val);
                  if (!isNaN(n)) setSelectedLat(n);
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.coordSubLabel}>Longitude</Text>
              <TextInput
                style={styles.coordInput}
                value={String(selectedLng)}
                onChangeText={(val) => {
                  const n = parseFloat(val);
                  if (!isNaN(n)) setSelectedLng(n);
                }}
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Geotag Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0B2545',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  gpsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsInfo: {
    flex: 1,
    marginRight: 12,
  },
  gpsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gpsCoords: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B2545',
    marginBottom: 2,
  },
  gpsAccuracy: {
    fontSize: 11,
    color: '#0F8B5A',
    fontWeight: '600',
  },
  gpsBtn: {
    backgroundColor: '#134074',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  coordInputsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  coordSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  coordInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
