import React, { useState, useEffect } from 'react';
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
  Image,
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
  { id: 'OFFICE', label: 'Chemist / Lab', color: '#E76F51' },
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
  const [zoom, setZoom] = useState<number>(16);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(8.0);
  const [category, setCategory] = useState<PinCategory>(initialCategory);
  const [placeName, setPlaceName] = useState<string>(initialName);
  const [doctorName, setDoctorName] = useState<string>(initialDoctorName);
  const [address, setAddress] = useState<string>(initialAddress);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [mapTileError, setMapTileError] = useState<boolean>(false);

  // Auto reverse-geocode whenever coordinates change significantly
  const resolveAddressFromCoords = async (lat: number, lng: number) => {
    try {
      setIsResolvingAddress(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'AHTRI-FFA-Mobile/1.0',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
          if (!placeName) {
            const suggested =
              data.name ||
              data.address?.amenity ||
              data.address?.hospital ||
              data.address?.road ||
              '';
            if (suggested) setPlaceName(suggested);
          }
        }
      }
    } catch {
      // Keep existing address on network failure
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsLocatingGps(true);
    try {
      const loc = await LocationService.getCurrentLocation();
      if (loc) {
        const lat = (loc as any).coords?.latitude ?? loc.latitude;
        const lng = (loc as any).coords?.longitude ?? loc.longitude;
        const acc = (loc as any).coords?.accuracy ?? loc.accuracy ?? 8.0;

        if (typeof lat === 'number' && typeof lng === 'number') {
          const nLat = Number(lat.toFixed(6));
          const nLng = Number(lng.toFixed(6));
          setSelectedLat(nLat);
          setSelectedLng(nLng);
          setGpsAccuracy(Number(acc.toFixed(1)));
          setMapTileError(false);
          resolveAddressFromCoords(nLat, nLng);
          Alert.alert(
            'GPS Location Acquired',
            `Coordinates: ${nLat.toFixed(5)}, ${nLng.toFixed(5)} (Accuracy: ±${acc.toFixed(1)}m)`
          );
        }
      } else {
        Alert.alert('Location Notice', 'Could not lock GPS. Using current coordinates.');
      }
    } catch (err: any) {
      Alert.alert('GPS Notice', err?.message || 'Could not fetch device GPS.');
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    const delta = 0.001; // ~100 meters
    let newLat = selectedLat;
    let newLng = selectedLng;

    if (direction === 'up') newLat += delta;
    if (direction === 'down') newLat -= delta;
    if (direction === 'left') newLng -= delta;
    if (direction === 'right') newLng += delta;

    const nLat = Number(newLat.toFixed(6));
    const nLng = Number(newLng.toFixed(6));
    setSelectedLat(nLat);
    setSelectedLng(nLng);
    setMapTileError(false);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(18, Math.max(13, prev + delta)));
    setMapTileError(false);
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

  if (!isOpen) return null;

  const activeCategoryConfig =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  // Slippy tile math for high-resolution OpenStreetMap tile preview
  const n = Math.pow(2, zoom);
  const tileX = Math.floor(((selectedLng + 180) / 360) * n);
  const latRad = (selectedLat * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mark Facility Location</Text>
            <Text style={styles.subtitle}>Interactive Geotag for Clinics, Hospitals & Chemists</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
          {/* VISUAL INTERACTIVE MAP SECTION */}
          <View style={styles.mapCard}>
            <View style={styles.mapHeaderRow}>
              <View style={styles.mapBadge}>
                <View style={[styles.statusDot, { backgroundColor: activeCategoryConfig.color }]} />
                <Text style={styles.mapBadgeText}>Live Map • Zoom {zoom}x</Text>
              </View>
              {isResolvingAddress && (
                <Text style={styles.resolvingText}>Resolving Address...</Text>
              )}
            </View>

            {/* Map Canvas with Center Pin & Crosshair */}
            <View style={styles.mapCanvas}>
              {!mapTileError ? (
                <Image
                  source={{ uri: tileUrl }}
                  style={styles.mapImage}
                  resizeMode="cover"
                  onError={() => setMapTileError(true)}
                />
              ) : (
                <View style={styles.mapFallbackContainer}>
                  <Text style={styles.mapFallbackText}>Global Geotag Map Canvas</Text>
                  <Text style={styles.mapFallbackSub}>
                    {selectedLat.toFixed(5)}° N, {selectedLng.toFixed(5)}° E
                  </Text>
                </View>
              )}

              {/* Grid Lines Visual Crosshair */}
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />

              {/* 3D Center Pin Overlay */}
              <View style={styles.pinOverlay}>
                <View
                  style={[
                    styles.pinHead,
                    { backgroundColor: activeCategoryConfig.color },
                  ]}
                >
                  <Text style={styles.pinIconText}>●</Text>
                </View>
                <View
                  style={[
                    styles.pinPointer,
                    { borderTopColor: activeCategoryConfig.color },
                  ]}
                />
                <View style={styles.pinRadarRing} />
              </View>

              {/* Map Floating Controls: Zoom In / Out */}
              <View style={styles.zoomControlCol}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(1)}>
                  <Text style={styles.controlBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(-1)}>
                  <Text style={styles.controlBtnText}>−</Text>
                </TouchableOpacity>
              </View>

              {/* Directional Pan Buttons */}
              <View style={styles.panControlCluster}>
                <TouchableOpacity
                  style={[styles.panBtn, styles.panUp]}
                  onPress={() => handlePan('up')}
                >
                  <Text style={styles.panArrowText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.panMiddleRow}>
                  <TouchableOpacity
                    style={[styles.panBtn, styles.panLeft]}
                    onPress={() => handlePan('left')}
                  >
                    <Text style={styles.panArrowText}>◀</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.panBtn, styles.panCenter]}
                    onPress={handleGetCurrentLocation}
                  >
                    <Text style={styles.panCenterText}>GPS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.panBtn, styles.panRight]}
                    onPress={() => handlePan('right')}
                  >
                    <Text style={styles.panArrowText}>▶</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.panBtn, styles.panDown]}
                  onPress={() => handlePan('down')}
                >
                  <Text style={styles.panArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Map Floating Coordinates Bar */}
              <View style={styles.mapCoordsBadge}>
                <Text style={styles.mapCoordsText}>
                  {selectedLat.toFixed(6)}°, {selectedLng.toFixed(6)}°
                </Text>
                <Text style={styles.mapAccuracyText}>±{gpsAccuracy}m</Text>
              </View>
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
          <Text style={styles.sectionHeading}>Fine-Tune GPS Coordinates</Text>
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

        {/* Sticky Action Footer */}
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
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: '#0B2545',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  resolvingText: {
    fontSize: 11,
    color: '#0F8B5A',
    fontWeight: '600',
  },
  mapCanvas: {
    height: 220,
    width: '100%',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapFallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  mapFallbackSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  crosshairH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  crosshairV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  pinOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  pinPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  pinRadarRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 139, 90, 0.45)',
    backgroundColor: 'rgba(15, 139, 90, 0.08)',
    top: -12,
  },
  zoomControlCol: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 3,
  },
  controlBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  panControlCluster: {
    position: 'absolute',
    bottom: 36,
    right: 10,
    alignItems: 'center',
  },
  panMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  panUp: {},
  panDown: {},
  panLeft: {},
  panRight: {},
  panCenter: {
    backgroundColor: '#0B2545',
    borderColor: '#0B2545',
  },
  panCenterText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  panArrowText: {
    fontSize: 9,
    color: '#1E293B',
    fontWeight: '700',
  },
  mapCoordsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapCoordsText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  mapAccuracyText: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginHorizontal: 2.5,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  categoryTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 5,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0F172A',
    marginBottom: 6,
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  coordInputsRow: {
    flexDirection: 'row',
    marginBottom: 10,
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
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    marginRight: 6,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    marginLeft: 6,
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
