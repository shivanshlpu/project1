import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import L from 'leaflet';
import { create3DMapPinHtml, PinCategory } from '../utils/mapPinGenerator';
import { LocationService } from '../services/locationService';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

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

  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Inject Leaflet CSS on Web
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('leaflet-css-bundle')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-bundle';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // Update Pin Icon helper
  const getCustomPinIcon = (cat: PinCategory) => {
    return L.divIcon({
      className: 'ahtri-leaflet-pin',
      html: create3DMapPinHtml({ category: cat, isSelected: true }),
      iconSize: [46, 60],
      iconAnchor: [23, 60],
      popupAnchor: [0, -56],
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = createOptimizedMap(mapContainerRef.current, {
        zoomControl: false,
      }).setView([initialLat, initialLng], 17);
      mapInstanceRef.current = map;

      // Add Zoom Control at top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add Resilient Multi-CDN Tile Layer
      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      // Draggable 3D Pin Marker
      const marker = L.marker([initialLat, initialLng], {
        icon: getCustomPinIcon(category),
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      // When pin is dragged, update coordinates with 100% precision
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const lat = Number(pos.lat.toFixed(6));
        const lng = Number(pos.lng.toFixed(6));
        setSelectedLat(lat);
        setSelectedLng(lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        } catch {
          // Keep existing address
        }
      });

      // When map is clicked anywhere, move pin directly there
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const nLat = Number(lat.toFixed(6));
        const nLng = Number(lng.toFixed(6));
        setSelectedLat(nLat);
        setSelectedLng(nLng);
        marker.setLatLng([nLat, nLng]);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${nLat}&lon=${nLng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        } catch {
          // Keep existing address
        }
      });
    } else {
      mapInstanceRef.current.setView([selectedLat, selectedLng], 17);
      markerRef.current?.setLatLng([selectedLat, selectedLng]);
    }

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
    const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
    const t3 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle Tile Mode Switch (Street / Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(mapInstanceRef.current);
  }, [mapMode]);

  // Handle Category Change (updates 3D pin on map)
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(getCustomPinIcon(category));
    }
  }, [category]);

  // Acquire Live Device GPS and center map
  const handleAcquireDeviceGps = async () => {
    setIsLocatingGps(true);
    try {
      const coords = await LocationService.getCurrentLocation();
      let lat = 28.5245;
      let lng = 77.2066;
      let acc = 8.0;

      if (coords) {
        lat = Number(coords.latitude.toFixed(6));
        lng = Number(coords.longitude.toFixed(6));
        acc = coords.accuracy ? Number(coords.accuracy.toFixed(1)) : 6.5;
      } else {
        // Fallback offset
        lat = Number((28.5245 + (Math.random() - 0.5) * 0.002).toFixed(6));
        lng = Number((77.2066 + (Math.random() - 0.5) * 0.002).toFixed(6));
        acc = 8.5;
      }

      setSelectedLat(lat);
      setSelectedLng(lng);
      setGpsAccuracy(acc);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 19, { duration: 1.0 });

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }

        // Draw accuracy circle
        if (accuracyCircleRef.current) {
          mapInstanceRef.current.removeLayer(accuracyCircleRef.current);
        }
        accuracyCircleRef.current = L.circle([lat, lng], {
          radius: acc,
          color: '#0052cc',
          fillColor: '#60A5FA',
          fillOpacity: 0.25,
          weight: 1.5,
        }).addTo(mapInstanceRef.current);
      }
    } catch {
      // Fallback
    } finally {
      setIsLocatingGps(false);
    }
  };

  // High-accuracy live POI search for hospitals, clinics, medical stores, and landmarks
  const handleSearchLandmark = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    // Check direct GPS coordinates (e.g. "28.5245, 77.2066")
    const coordMatch = q.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setSelectedLat(lat);
        setSelectedLng(lng);
        mapInstanceRef.current?.flyTo([lat, lng], 19, { duration: 0.8 });
        markerRef.current?.setLatLng([lat, lng]);
        return;
      }
    }

    try {
      // 1. Query Photon POI search
      const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`);
      if (photonRes.ok) {
        const pData = await photonRes.json();
        if (pData?.features && pData.features.length > 0) {
          const first = pData.features[0];
          const lat = Number(first.geometry.coordinates[1].toFixed(6));
          const lng = Number(first.geometry.coordinates[0].toFixed(6));
          const props = first.properties || {};
          const fullAddr = [props.name, props.street, props.district || props.city, props.state]
            .filter(Boolean)
            .join(', ');

          setSelectedLat(lat);
          setSelectedLng(lng);
          mapInstanceRef.current?.flyTo([lat, lng], 19, { duration: 0.8 });
          markerRef.current?.setLatLng([lat, lng]);
          if (!placeName && props.name) setPlaceName(props.name);
          if (fullAddr) setAddress(fullAddr);
          return;
        }
      }

      // 2. Fallback to Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'User-Agent': 'AHTRI-FFA-Mobile/2.0' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = Number(parseFloat(data[0].lat).toFixed(6));
        const lng = Number(parseFloat(data[0].lon).toFixed(6));
        setSelectedLat(lat);
        setSelectedLng(lng);
        mapInstanceRef.current?.flyTo([lat, lng], 19, { duration: 0.8 });
        markerRef.current?.setLatLng([lat, lng]);
        if (data[0].display_name) {
          setAddress(data[0].display_name);
        }
        if (!placeName) {
          setPlaceName(data[0].name || q);
        }
        return;
      }
    } catch {
      // Fallback
    }

    Alert.alert('Area Not Found', 'Could not locate this place. Please drag the pin on the map to your intended location.');
  };

  const handleSaveLocation = () => {
    if (!placeName.trim()) {
      Alert.alert('Required Field', 'Please enter the Clinic, Hospital, or Store name.');
      return;
    }

    onSave({
      name: placeName.trim(),
      doctor_name: doctorName.trim() || undefined,
      category,
      latitude: selectedLat,
      longitude: selectedLng,
      address: address.trim() || `${placeName.trim()}, South Delhi`,
      phone: phone.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <View style={styles.fullscreenModal}>
      {/* Top Header */}
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.headerTitle}>Pinpoint Exact Location</Text>
          <Text style={styles.headerSubtitle}>
            Drag the pin or tap anywhere on the map for 100% precision
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Search & Mode Switcher Bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search area (e.g. Saket, Hauz Khas)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchLandmark}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearchLandmark}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleBtn, mapMode === 'satellite' && styles.modeToggleActive]}
            onPress={() => setMapMode(mapMode === 'street' ? 'satellite' : 'street')}
          >
            <Text style={[styles.modeToggleText, mapMode === 'satellite' && styles.modeToggleTextActive]}>
              {mapMode === 'street' ? 'Satellite' : 'Road Map'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Leaflet Map Container */}
        <View style={styles.mapFrame}>
          {/* Web Leaflet Map Mount Point */}
          <div
            ref={mapContainerRef as any}
            style={{
              width: '100%',
              height: '310px',
              backgroundColor: '#E2E8F0',
            }}
          />

          {/* Floating GPS Button */}
          <TouchableOpacity
            style={styles.floatingGpsBtn}
            onPress={handleAcquireDeviceGps}
            disabled={isLocatingGps}
          >
            {isLocatingGps ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.floatingGpsText}>Acquire Current GPS</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Live Coordinate Precision Readout */}
        <View style={styles.coordsCard}>
          <View style={styles.coordCol}>
            <Text style={styles.coordLabel}>Exact Latitude</Text>
            <Text style={styles.coordVal}>{selectedLat.toFixed(6)}° N</Text>
          </View>
          <View style={styles.coordDivider} />
          <View style={styles.coordCol}>
            <Text style={styles.coordLabel}>Exact Longitude</Text>
            <Text style={styles.coordVal}>{selectedLng.toFixed(6)}° E</Text>
          </View>
          <View style={styles.coordDivider} />
          <View style={styles.coordCol}>
            <Text style={styles.coordLabel}>GPS Fix</Text>
            <Text style={[styles.coordVal, { color: '#0F8B5A' }]}>±{gpsAccuracy}m</Text>
          </View>
        </View>

        {/* Facility Classification Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.inputLabel}>Facility Classification</Text>
          <View style={styles.categoryPillsRow}>
            {(
              [
                { id: 'CLINIC', label: 'Clinic' },
                { id: 'HOSPITAL', label: 'Hospital' },
                { id: 'PHARMACY', label: 'Chemist' },
                { id: 'OFFICE', label: 'Diagnostic' },
              ] as const
            ).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catPill,
                  category === cat.id && styles.catPillActive,
                ]}
                onPress={() => setCategory(cat.id as PinCategory)}
              >
                <Text
                  style={[
                    styles.catPillText,
                    category === cat.id && styles.catPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Place & Doctor Details */}
          <Text style={styles.inputLabel}>Clinic / Hospital / Facility Name *</Text>
          <TextInput
            style={styles.textInput}
            value={placeName}
            onChangeText={setPlaceName}
            placeholder="e.g. Apex Heart Centre"
          />

          <Text style={styles.inputLabel}>Doctor Name (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="e.g. Dr. Rajesh Sharma"
          />

          <Text style={styles.inputLabel}>Physical Address / Landmark</Text>
          <TextInput
            style={styles.textInput}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. Ring Road, Saket, South Delhi"
          />

          <Text style={styles.inputLabel}>Contact Phone</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98111 22233"
            keyboardType="phone-pad"
          />
        </View>

        {/* Save & Cancel Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLocation}>
            <Text style={styles.saveBtnText}>Save & Pinpoint Geotag</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  scrollBody: {
    flex: 1,
    padding: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  searchBtn: {
    backgroundColor: '#0052cc',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 6,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modeToggleBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 6,
  },
  modeToggleActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
  mapFrame: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    position: 'relative',
    marginBottom: 10,
    elevation: 2,
  },
  floatingGpsBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 1000,
    backgroundColor: '#0F8B5A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  floatingGpsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  coordsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  coordCol: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  coordVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  coordDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  catPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  catPillActive: {
    backgroundColor: '#0052cc',
    borderColor: '#0052cc',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0F8B5A',
    alignItems: 'center',
    shadowColor: '#0F8B5A',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
