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
  Modal,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { PinCategory, create3DMapPinHtml } from '../utils/mapPinGenerator';
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
  { id: 'HOSPITAL', label: 'Hospital', color: '#DC2626' },
  { id: 'PHARMACY', label: 'Pharmacy', color: '#0F8B5A' },
  { id: 'OFFICE', label: 'Chemist / Lab', color: '#D97706' },
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
  const [category, setCategory] = useState<PinCategory>(initialCategory);
  const [placeName, setPlaceName] = useState<string>(initialName);
  const [doctorName, setDoctorName] = useState<string>(initialDoctorName);
  const [address, setAddress] = useState<string>(initialAddress);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(8.0);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');

  // Fullscreen state
  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(false);
  const [isScrollEnabled, setIsScrollEnabled] = useState<boolean>(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Loading flags
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);

  const webViewRef = useRef<WebView | null>(null);
  const reverseGeocodeTimer = useRef<any>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
      setCategory(initialCategory);
      setPlaceName(initialName);
      setDoctorName(initialDoctorName);
      setAddress(initialAddress);
      setPhone(initialPhone);
      setSearchQuery('');
      setSearchResults([]);
      setIsFullscreenMap(false);
    }
  }, [isOpen]);

  // Debounced reverse geocode on coordinate change
  const resolveAddressFromCoords = (lat: number, lng: number) => {
    if (reverseGeocodeTimer.current) {
      clearTimeout(reverseGeocodeTimer.current);
    }
    reverseGeocodeTimer.current = setTimeout(async () => {
      try {
        setIsResolvingAddress(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: {
              'User-Agent': 'AHTRI-FFA-Mobile/2.0 (Pharma Field Force Automation)',
              Accept: 'application/json',
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
                data.address?.pharmacy ||
                data.address?.clinic ||
                data.address?.road ||
                '';
              if (suggested) setPlaceName(suggested);
            }
            return;
          }
        }
        // Fallback: Photon Reverse
        const photonRes = await fetch(
          `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
        );
        if (photonRes.ok) {
          const pData = await photonRes.json();
          if (pData?.features && pData.features.length > 0) {
            const props = pData.features[0].properties;
            const full = [props.name, props.street, props.city || props.district, props.state]
              .filter(Boolean)
              .join(', ');
            if (full) setAddress(full);
            if (!placeName && props.name) setPlaceName(props.name);
          }
        }
      } catch {
        // Keep existing address
      } finally {
        setIsResolvingAddress(false);
      }
    }, 350);
  };

  // Live POI & Address Search
  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);

    // Direct coords check (e.g., "28.5245, 77.2066")
    const coordMatch = query.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setSelectedLat(lat);
        setSelectedLng(lng);
        resolveAddressFromCoords(lat, lng);
        setSearchResults([]);
        setIsSearching(false);
        flyMapTo(lat, lng);
        return;
      }
    }

    try {
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`
      );
      let parsed: any[] = [];

      if (photonRes.ok) {
        const pData = await photonRes.json();
        if (pData?.features && pData.features.length > 0) {
          parsed = pData.features.map((f: any) => {
            const p = f.properties || {};
            const name = p.name || p.street || query;
            const fullAddr = [
              p.name,
              p.housenumber ? `#${p.housenumber}` : null,
              p.street,
              p.district || p.city,
              p.state,
              p.postcode,
            ]
              .filter(Boolean)
              .join(', ');

            return {
              name,
              display_name: fullAddr || name,
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
            };
          });
        }
      }

      if (parsed.length === 0) {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6`,
          {
            headers: {
              'User-Agent': 'AHTRI-FFA-Mobile/2.0 (Pharma Field Force Automation)',
              Accept: 'application/json',
            },
          }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData)) {
            parsed = nomData.map((item: any) => ({
              name: item.name || item.display_name.split(',')[0],
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
            }));
          }
        }
      }

      setSearchResults(parsed);

      if (parsed.length > 0) {
        const first = parsed[0];
        setSelectedLat(first.lat);
        setSelectedLng(first.lon);
        if (!placeName) setPlaceName(first.name);
        setAddress(first.display_name);
        flyMapTo(first.lat, first.lon);
      } else {
        Alert.alert(
          'Location Search',
          `No places found for "${query}". You can tap anywhere on the map or drag the pin directly.`
        );
      }
    } catch {
      Alert.alert('Search Notice', 'Could not complete search. Check network connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    setSelectedLat(item.lat);
    setSelectedLng(item.lon);
    setPlaceName(item.name);
    setAddress(item.display_name);
    setSearchResults([]);
    flyMapTo(item.lat, item.lon);
  };

  // Device GPS
  const handleGetCurrentLocation = async () => {
    setIsLocatingGps(true);
    try {
      const loc = await LocationService.getCurrentLocation();
      if (loc) {
        const lat = Number(loc.latitude.toFixed(6));
        const lng = Number(loc.longitude.toFixed(6));
        const acc = loc.accuracy ?? 8.0;

        setSelectedLat(lat);
        setSelectedLng(lng);
        setGpsAccuracy(Number(acc.toFixed(1)));
        resolveAddressFromCoords(lat, lng);
        flyMapTo(lat, lng);
      } else {
        Alert.alert('GPS Notice', 'Could not lock GPS. Using current pin position.');
      }
    } catch (err: any) {
      Alert.alert('GPS Notice', err?.message || 'Could not fetch device GPS.');
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Fly Leaflet Map to coordinates
  const flyMapTo = (lat: number, lng: number) => {
    const js = `
      if (window.leafletMap && window.marker) {
        window.leafletMap.flyTo([${lat}, ${lng}], 17, { duration: 0.8 });
        window.marker.setLatLng([${lat}, ${lng}]);
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  // Toggle map mode
  const handleToggleMapMode = (mode: 'street' | 'satellite') => {
    setMapMode(mode);
    const js = `
      if (window.setTileMode) {
        window.setTileMode('${mode}');
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  // Handle messages from Leaflet inside WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_selected') {
        const lat = Number(data.lat.toFixed(6));
        const lng = Number(data.lng.toFixed(6));
        setSelectedLat(lat);
        setSelectedLng(lng);
        resolveAddressFromCoords(lat, lng);
      }
    } catch {
      // Ignored
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

  // Dynamic 3D Pin HTML based on category
  const pinHtml = create3DMapPinHtml({ category, isSelected: true });

  // Full Leaflet HTML page rendered inside WebView
  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #E2E8F0;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .leaflet-control-attribution {
      display: none !important;
    }
    .custom-3d-pin {
      background: transparent !important;
      border: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function() {
      var streetTiles = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 22,
        maxNativeZoom: 20
      });

      var satelliteTiles = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 22,
        maxNativeZoom: 20
      });

      var currentTileLayer = streetTiles;

      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        tap: true
      }).setView([${selectedLat}, ${selectedLng}], 17);

      currentTileLayer.addTo(map);

      // Custom 3D Pin
      var pinIcon = L.divIcon({
        className: 'custom-3d-pin',
        html: ${JSON.stringify(pinHtml)},
        iconSize: [46, 60],
        iconAnchor: [23, 60],
        popupAnchor: [0, -56]
      });

      var marker = L.marker([${selectedLat}, ${selectedLng}], {
        icon: pinIcon,
        draggable: true
      }).addTo(map);

      window.leafletMap = map;
      window.marker = marker;

      // Post coordinates to React Native
      function sendCoords(lat, lng) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'location_selected',
            lat: lat,
            lng: lng
          }));
        }
      }

      // 1. Drag marker freely
      marker.on('dragend', function(e) {
        var pos = marker.getLatLng();
        sendCoords(pos.lat, pos.lng);
      });

      // 2. Tap anywhere on map to drop / move pin
      map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        sendCoords(e.latlng.lat, e.latlng.lng);
      });

      // Switch Street / Satellite
      window.setTileMode = function(mode) {
        map.removeLayer(currentTileLayer);
        if (mode === 'satellite') {
          currentTileLayer = satelliteTiles;
        } else {
          currentTileLayer = streetTiles;
        }
        currentTileLayer.addTo(map);
      };

      // Invalidate size on load
      setTimeout(function() {
        map.invalidateSize();
      }, 100);
      setTimeout(function() {
        map.invalidateSize();
      }, 400);
    })();
  </script>
</body>
</html>
  `;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Mark Facility Location</Text>
            <Text style={styles.subtitle}>
              {isFullscreenMap
                ? 'Tap anywhere to drop pin or drag freely'
                : 'Interactive Geotag for Clinics, Hospitals & Chemists'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isFullscreenMap ? (
          /* FULLSCREEN MAP VIEW */
          <View style={styles.fullscreenContainer}>
            {/* Top Toolbar in Fullscreen */}
            <View style={styles.fullscreenTopBar}>
              <TouchableOpacity
                style={styles.fullscreenBackBtn}
                onPress={() => setIsFullscreenMap(false)}
              >
                <Text style={styles.fullscreenBackBtnText}>← Return to Form</Text>
              </TouchableOpacity>
              <View style={styles.fullscreenModeToggle}>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, mapMode === 'street' && styles.modeToggleBtnActive]}
                  onPress={() => handleToggleMapMode('street')}
                >
                  <Text style={[styles.modeToggleText, mapMode === 'street' && styles.modeToggleTextActive]}>
                    Road
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, mapMode === 'satellite' && styles.modeToggleBtnActive]}
                  onPress={() => handleToggleMapMode('satellite')}
                >
                  <Text style={[styles.modeToggleText, mapMode === 'satellite' && styles.modeToggleTextActive]}>
                    Satellite
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Search in Fullscreen */}
            <View style={styles.fullscreenSearchBox}>
              <TextInput
                style={styles.fullscreenSearchInput}
                placeholder="Search clinic, hospital, chemist, area..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchSubmitBtn} onPress={handleSearch}>
                <Text style={styles.searchSubmitText}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* Fullscreen Map Canvas (WebView with Leaflet) */}
            <View style={styles.fullscreenCanvas}>
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: leafletHtml }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                geolocationEnabled={true}
                onMessage={handleWebViewMessage}
                style={styles.webView}
                scrollEnabled={false}
              />

              {/* Floating GPS Button */}
              <TouchableOpacity
                style={styles.floatingGpsBtn}
                onPress={handleGetCurrentLocation}
                disabled={isLocatingGps}
              >
                {isLocatingGps ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <View style={styles.gpsIconInner}>
                    <Text style={styles.gpsIconText}>🎯</Text>
                    <Text style={styles.gpsLabelText}>GPS</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Card in Fullscreen */}
            <View style={styles.fullscreenBottomCard}>
              <Text style={styles.fullscreenCardTitle} numberOfLines={1}>
                {placeName || 'Selected Location'}
              </Text>
              <Text style={styles.fullscreenCardAddr} numberOfLines={2}>
                {address || 'Fetching address...'}
              </Text>
              <Text style={styles.fullscreenCardCoords}>
                {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </Text>
              <TouchableOpacity
                style={styles.fullscreenConfirmBtn}
                onPress={() => setIsFullscreenMap(false)}
              >
                <Text style={styles.fullscreenConfirmBtnText}>✓ Use This Precise Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* STANDARD FORM VIEW */
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={isScrollEnabled}
          >
            {/* Search Bar */}
            <View style={styles.searchCard}>
              <View style={styles.searchInputRow}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search clinic, hospital, chemist, area..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSearchBtn}
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.searchSubmitBtn}
                  onPress={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.searchSubmitText}>Search</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsHeader}>Select Matched Location:</Text>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSearchResult(item)}
                    >
                      <Text style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionAddress} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Interactive Map Frame */}
            <View style={styles.mapFrameCard}>
              <View style={styles.mapTopBar}>
                <View style={styles.mapTitleRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.mapModeTitle}>
                    {mapMode === 'street' ? 'Road Map' : 'Satellite Hybrid'}
                  </Text>
                </View>
                <View style={styles.mapControlGroup}>
                  <TouchableOpacity
                    style={styles.mapModeBtn}
                    onPress={() =>
                      handleToggleMapMode(mapMode === 'street' ? 'satellite' : 'street')
                    }
                  >
                    <Text style={styles.mapModeBtnText}>
                      {mapMode === 'street' ? '🛰️ Satellite' : '🗺️ Road'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.expandMapBtn}
                    onPress={() => setIsFullscreenMap(true)}
                  >
                    <Text style={styles.expandMapText}>⛶ Expand</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Instructions banner */}
              <View style={styles.interactiveInstructionBanner}>
                <Text style={styles.interactiveInstructionText}>
                  👆 Drag map freely • Pinch to zoom • Tap anywhere to drop pin
                </Text>
              </View>

              {/* Map Canvas (WebView with Leaflet) */}
              <View
                style={styles.mapCanvas}
                onTouchStart={() => setIsScrollEnabled(false)}
                onTouchEnd={() => setIsScrollEnabled(true)}
                onTouchCancel={() => setIsScrollEnabled(true)}
              >
                <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{ html: leafletHtml }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  geolocationEnabled={true}
                  onMessage={handleWebViewMessage}
                  style={styles.webView}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                />

                {/* Floating GPS Button */}
                <TouchableOpacity
                  style={styles.floatingGpsBtn}
                  onPress={handleGetCurrentLocation}
                  disabled={isLocatingGps}
                  activeOpacity={0.8}
                >
                  {isLocatingGps ? (
                    <ActivityIndicator size="small" color="#0284C7" />
                  ) : (
                    <View style={styles.gpsIconInner}>
                      <Text style={styles.gpsIconText}>🎯</Text>
                      <Text style={styles.gpsLabelText}>GPS</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Facility Type Selector */}
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
              placeholder="e.g. Apex Heart Centre, Metro Pharmacy"
              placeholderTextColor="#94A3B8"
            />

            {/* Key Doctor / Contact */}
            <Text style={styles.inputLabel}>Key Doctor / Contact Person</Text>
            <TextInput
              style={styles.textInput}
              value={doctorName}
              onChangeText={setDoctorName}
              placeholder="e.g. Dr. Rajesh Sharma, MD"
              placeholderTextColor="#94A3B8"
            />

            {/* Address */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.inputLabel}>Full Address *</Text>
              {isResolvingAddress && (
                <Text style={styles.resolvingBadge}>Resolving address...</Text>
              )}
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, Landmark, Area, City, Pincode"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />

            {/* Contact Phone */}
            <Text style={styles.inputLabel}>Contact Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            {/* Coordinate Readout */}
            <Text style={styles.sectionHeading}>GPS Coordinates (Precision Pin)</Text>
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
        )}

        {/* Sticky Action Footer */}
        {!isFullscreenMap && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Geotag Location</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingBottom: 40,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 6,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    paddingHorizontal: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  searchSubmitBtn: {
    backgroundColor: '#0B2545',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  searchSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
    paddingTop: 6,
  },
  suggestionsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  mapFrameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  mapTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F8B5A',
    marginRight: 6,
  },
  mapModeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  mapControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapModeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  expandMapBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#0284C7',
  },
  expandMapText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  interactiveInstructionBanner: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    alignItems: 'center',
  },
  interactiveInstructionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  mapCanvas: {
    height: 330,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  floatingGpsBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    zIndex: 100,
  },
  gpsIconInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsIconText: {
    fontSize: 14,
  },
  gpsLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0B2545',
    zIndex: 200,
  },
  fullscreenBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fullscreenBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  fullscreenModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modeToggleBtnActive: {
    backgroundColor: '#0284C7',
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
  fullscreenSearchBox: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    zIndex: 200,
  },
  fullscreenSearchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
    color: '#0F172A',
  },
  fullscreenCanvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  fullscreenBottomCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 200,
  },
  fullscreenCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  fullscreenCardAddr: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  fullscreenCardCoords: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 4,
    marginBottom: 10,
  },
  fullscreenConfirmBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullscreenConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 4,
  },
  resolvingBadge: {
    fontSize: 10.5,
    color: '#0284C7',
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  coordInputsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  coordSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  coordInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0B2545',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
