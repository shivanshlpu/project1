import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  PanResponder,
  Animated,
  Dimensions,
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
  { id: 'HOSPITAL', label: 'Hospital', color: '#DC2626' },
  { id: 'PHARMACY', label: 'Pharmacy', color: '#0F8B5A' },
  { id: 'OFFICE', label: 'Chemist / Lab', color: '#D97706' },
];

const TILE_SIZE = 256;

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
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(8.0);
  const [category, setCategory] = useState<PinCategory>(initialCategory);
  const [placeName, setPlaceName] = useState<string>(initialName);
  const [doctorName, setDoctorName] = useState<string>(initialDoctorName);
  const [address, setAddress] = useState<string>(initialAddress);
  const [phone, setPhone] = useState<string>(initialPhone);

  // Fullscreen map mode toggle
  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // State flags
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);

  // Map canvas layout measurement
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: 380,
    height: 290,
  });

  // Animated pin drop bounce
  const pinBounceAnim = useRef(new Animated.Value(0)).current;
  const triggerPinBounce = () => {
    pinBounceAnim.setValue(-18);
    Animated.spring(pinBounceAnim, {
      toValue: 0,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  // Debounced reverse-geocoding
  const reverseGeocodeTimer = useRef<any>(null);
  const resolveAddressFromCoords = (lat: number, lng: number) => {
    if (reverseGeocodeTimer.current) {
      clearTimeout(reverseGeocodeTimer.current);
    }
    reverseGeocodeTimer.current = setTimeout(async () => {
      try {
        setIsResolvingAddress(true);
        // Primary: Nominatim reverse geocode
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
        // Keep existing address on network error
      } finally {
        setIsResolvingAddress(false);
      }
    }, 400);
  };

  // High-accuracy live POI search
  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);

    // 1. Direct coordinate format: "28.5245, 77.2066"
    const coordMatch = query.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setSelectedLat(lat);
        setSelectedLng(lng);
        resolveAddressFromCoords(lat, lng);
        triggerPinBounce();
        setSearchResults([]);
        setIsSearching(false);
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
              category: p.osm_value || 'place',
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
              category: 'place',
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
        triggerPinBounce();
      } else {
        Alert.alert(
          'Location Search',
          `No places found for "${query}". You can tap anywhere on the map or drag the pin directly.`
        );
      }
    } catch {
      Alert.alert('Search Notice', 'Could not complete place search. Verify internet connection.');
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
    triggerPinBounce();
  };

  const handleGetCurrentLocation = async () => {
    setIsLocatingGps(true);
    try {
      const loc = await LocationService.getCurrentLocation();
      if (loc) {
        const lat = loc.latitude;
        const lng = loc.longitude;
        const acc = loc.accuracy ?? 8.0;

        if (typeof lat === 'number' && typeof lng === 'number') {
          const nLat = Number(lat.toFixed(6));
          const nLng = Number(lng.toFixed(6));
          setSelectedLat(nLat);
          setSelectedLng(nLng);
          setGpsAccuracy(Number(acc.toFixed(1)));
          resolveAddressFromCoords(nLat, nLng);
          triggerPinBounce();
        }
      } else {
        Alert.alert('Location Notice', 'Could not lock GPS. Using current pin position.');
      }
    } catch (err: any) {
      Alert.alert('GPS Notice', err?.message || 'Could not fetch device GPS.');
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(19, Math.max(13, prev + delta)));
  };

  // Micro-Nudge D-Pad: shift coordinates by ~3 meters in any cardinal direction
  const handleNudge = (deltaLat: number, deltaLng: number) => {
    const nextLat = Number((selectedLat + deltaLat).toFixed(6));
    const nextLng = Number((selectedLng + deltaLng).toFixed(6));
    setSelectedLat(nextLat);
    setSelectedLng(nextLng);
    resolveAddressFromCoords(nextLat, nextLng);
    triggerPinBounce();
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

  // Real-time animated drag translation
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const initialPinchDist = useRef<number | null>(null);

  // Fluid Touch PanResponder: Real-time 360° finger tracking with parent scroll freeze
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          setIsDraggingMap(true);
          pan.setOffset({ x: 0, y: 0 });
          pan.setValue({ x: 0, y: 0 });
          initialPinchDist.current = null;
        },

        onPanResponderMove: (evt, gesture) => {
          // Pinch-to-zoom multi-touch detection
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const t1 = touches[0];
            const t2 = touches[1];
            const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
            if (!initialPinchDist.current) {
              initialPinchDist.current = dist;
            } else {
              const ratio = dist / initialPinchDist.current;
              if (ratio > 1.35) {
                handleZoom(1);
                initialPinchDist.current = dist;
              } else if (ratio < 0.75) {
                handleZoom(-1);
                initialPinchDist.current = dist;
              }
            }
            return;
          }

          // Live 360° fluid tile tracking under finger
          pan.setValue({ x: gesture.dx, y: gesture.dy });
        },

        onPanResponderRelease: (evt, gesture) => {
          setIsDraggingMap(false);
          initialPinchDist.current = null;

          const n = Math.pow(2, zoom);
          const totalWorldPx = n * TILE_SIZE;

          // Direct tap-to-reposition (less than 6px drag)
          if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
            pan.setValue({ x: 0, y: 0 });
            const locX = evt.nativeEvent?.locationX;
            const locY = evt.nativeEvent?.locationY;
            if (typeof locX === 'number' && typeof locY === 'number') {
              const halfW = canvasLayout.width / 2;
              const halfH = canvasLayout.height / 2;
              const tapOffsetX = locX - halfW;
              const tapOffsetY = locY - halfH;

              if (Math.abs(tapOffsetX) > 6 || Math.abs(tapOffsetY) > 6) {
                const currentWorldX = ((selectedLng + 180) / 360) * totalWorldPx;
                const latRad = (selectedLat * Math.PI) / 180;
                const sinLat = Math.sin(latRad);
                const currentWorldY =
                  (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * totalWorldPx;

                const targetWorldX = currentWorldX + tapOffsetX;
                const targetWorldY = currentWorldY + tapOffsetY;

                const targetLng = (targetWorldX / totalWorldPx) * 360 - 180;
                const normY = 0.5 - targetWorldY / totalWorldPx;
                const targetLat =
                  (2 * Math.atan(Math.exp(normY * 2 * Math.PI)) - Math.PI / 2) * (180 / Math.PI);

                const nLat = Number(Math.max(-85, Math.min(85, targetLat)).toFixed(6));
                const nLng = Number(Math.max(-180, Math.min(180, targetLng)).toFixed(6));

                setSelectedLat(nLat);
                setSelectedLng(nLng);
                resolveAddressFromCoords(nLat, nLng);
                triggerPinBounce();
              }
            }
            return;
          }

          // Accurate 256px Web Mercator drag translation
          const currentWorldX = ((selectedLng + 180) / 360) * totalWorldPx;
          const latRad = (selectedLat * Math.PI) / 180;
          const sinLat = Math.sin(latRad);
          const currentWorldY =
            (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * totalWorldPx;

          const targetWorldX = currentWorldX - gesture.dx;
          const targetWorldY = currentWorldY - gesture.dy;

          const targetLng = (targetWorldX / totalWorldPx) * 360 - 180;
          const normY = 0.5 - targetWorldY / totalWorldPx;
          const targetLat =
            (2 * Math.atan(Math.exp(normY * 2 * Math.PI)) - Math.PI / 2) * (180 / Math.PI);

          const nLat = Number(Math.max(-85, Math.min(85, targetLat)).toFixed(6));
          const nLng = Number(Math.max(-180, Math.min(180, targetLng)).toFixed(6));

          setSelectedLat(nLat);
          setSelectedLng(nLng);
          resolveAddressFromCoords(nLat, nLng);
          triggerPinBounce();

          // Reset animated offset for newly centered tiles
          pan.setValue({ x: 0, y: 0 });
        },

        onPanResponderTerminate: () => {
          setIsDraggingMap(false);
          pan.setValue({ x: 0, y: 0 });
        },
      }),
    [zoom, selectedLat, selectedLng, canvasLayout]
  );

  if (!isOpen) return null;

  const activeCategoryConfig =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  // Slippy tile math with 256px standard tiles
  const n = Math.pow(2, zoom);
  const preciseTileX = ((selectedLng + 180) / 360) * n;
  const centerTileX = Math.floor(preciseTileX);
  const fracX = (preciseTileX - centerTileX) * TILE_SIZE;

  const latRad = (selectedLat * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  const preciseTileY =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n;
  const centerTileY = Math.floor(preciseTileY);
  const fracY = (preciseTileY - centerTileY) * TILE_SIZE;

  // Google Maps Road & Satellite Tile URLs
  const getTileUrl = (x: number, y: number) => {
    const s = Math.abs(x + y) % 4;
    const maxIndex = Math.pow(2, zoom);
    const wrapX = ((x % maxIndex) + maxIndex) % maxIndex;
    const wrapY = Math.max(0, Math.min(maxIndex - 1, y));

    if (mapMode === 'satellite') {
      return `https://mt${s}.google.com/vt/lyrs=y&x=${wrapX}&y=${wrapY}&z=${zoom}`;
    }
    return `https://mt${s}.google.com/vt/lyrs=m&x=${wrapX}&y=${wrapY}&z=${zoom}`;
  };

  // 5x5 tile grid (1280x1280px total coverage) for infinite free-drag margin
  const tileOffsets = [
    { dx: -2, dy: -2 }, { dx: -1, dy: -2 }, { dx: 0, dy: -2 }, { dx: 1, dy: -2 }, { dx: 2, dy: -2 },
    { dx: -2, dy: -1 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 },
    { dx: -2, dy: 0 },  { dx: -1, dy: 0 },  { dx: 0, dy: 0 },  { dx: 1, dy: 0 },  { dx: 2, dy: 0 },
    { dx: -2, dy: 1 },  { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },  { dx: 2, dy: 1 },
    { dx: -2, dy: 2 },  { dx: -1, dy: 2 },  { dx: 0, dy: 2 },  { dx: 1, dy: 2 },  { dx: 2, dy: 2 },
  ];

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Mark Facility Location</Text>
            <Text style={styles.subtitle}>Interactive Geotag for Clinics, Hospitals & Chemists</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* FULLSCREEN MAP VIEW OR STANDARD FORM VIEW */}
        {isFullscreenMap ? (
          <View style={styles.fullscreenContainer}>
            {/* Floating Top Header in Fullscreen */}
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
                  onPress={() => setMapMode('street')}
                >
                  <Text style={[styles.modeToggleText, mapMode === 'street' && styles.modeToggleTextActive]}>
                    Road
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, mapMode === 'satellite' && styles.modeToggleBtnActive]}
                  onPress={() => setMapMode('satellite')}
                >
                  <Text style={[styles.modeToggleText, mapMode === 'satellite' && styles.modeToggleTextActive]}>
                    Satellite
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Search Bar in Fullscreen */}
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

            {/* Fullscreen Map Canvas */}
            <View
              style={styles.fullscreenCanvas}
              onLayout={(e) => {
                setCanvasLayout({
                  width: e.nativeEvent.layout.width,
                  height: e.nativeEvent.layout.height,
                });
              }}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.tilesGrid,
                  {
                    left: '50%',
                    top: '50%',
                    marginLeft: -640 - fracX,
                    marginTop: -640 - fracY,
                    transform: [{ translateX: pan.x }, { translateY: pan.y }],
                  },
                ]}
              >
                {tileOffsets.map((offset, i) => {
                  const x = centerTileX + offset.dx;
                  const y = centerTileY + offset.dy;
                  const url = getTileUrl(x, y);
                  return (
                    <Image
                      key={`${mapMode}-${zoom}-${x}-${y}-${i}`}
                      source={{ uri: url }}
                      style={styles.gridTile}
                      resizeMode="cover"
                    />
                  );
                })}
              </Animated.View>

              {/* Crosshair & Bouncing Pin */}
              <View style={styles.crosshairH} pointerEvents="none" />
              <View style={styles.crosshairV} pointerEvents="none" />
              <Animated.View
                style={[styles.pinOverlay, { transform: [{ translateY: pinBounceAnim }] }]}
                pointerEvents="none"
              >
                <View style={styles.googlePinContainer}>
                  <View style={[styles.googlePinHead, { backgroundColor: activeCategoryConfig.color, borderColor: '#0F172A' }]}>
                    <View style={styles.googlePinDot} />
                  </View>
                  <View style={[styles.googlePinTip, { borderTopColor: activeCategoryConfig.color }]} />
                </View>
                <View style={styles.googlePinShadow} />
              </Animated.View>

              {/* Floating Zoom Controls */}
              <View style={styles.zoomControlCol}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(1)}>
                  <Text style={styles.controlBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(-1)}>
                  <Text style={styles.controlBtnText}>−</Text>
                </TouchableOpacity>
              </View>

              {/* 4-Direction Micro-Nudge D-Pad */}
              <View style={styles.nudgePad}>
                <TouchableOpacity
                  style={[styles.nudgeBtn, styles.nudgeBtnNorth]}
                  onPress={() => handleNudge(0.00003, 0)}
                >
                  <Text style={styles.nudgeBtnText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.nudgeMidRow}>
                  <TouchableOpacity
                    style={[styles.nudgeBtn, styles.nudgeBtnWest]}
                    onPress={() => handleNudge(0, -0.00003)}
                  >
                    <Text style={styles.nudgeBtnText}>◄</Text>
                  </TouchableOpacity>
                  <View style={styles.nudgeCenterDot}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>3m</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.nudgeBtn, styles.nudgeBtnEast]}
                    onPress={() => handleNudge(0, 0.00003)}
                  >
                    <Text style={styles.nudgeBtnText}>►</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.nudgeBtn, styles.nudgeBtnSouth]}
                  onPress={() => handleNudge(-0.00003, 0)}
                >
                  <Text style={styles.nudgeBtnText}>▼</Text>
                </TouchableOpacity>
              </View>

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

            {/* Bottom Floating Info Card */}
            <View style={styles.fullscreenBottomCard}>
              <Text style={styles.fullscreenCardTitle} numberOfLines={1}>
                {placeName || 'Selected Location'}
              </Text>
              <Text style={styles.fullscreenCardAddr} numberOfLines={2}>
                {address || 'Fetching address...'}
              </Text>
              <Text style={styles.fullscreenCardCoords}>
                {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)} • Zoom {zoom}x
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
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!isDraggingMap}
          >
            {/* LIVE PLACE SEARCH BAR */}
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
                      <View style={styles.suggestionIconBox}>
                        <Text style={{ fontSize: 13 }}>
                          {item.category?.toLowerCase().includes('hospital')
                            ? '🏥'
                            : item.category?.toLowerCase().includes('pharmacy')
                            ? '💊'
                            : '📍'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.suggestionAddr} numberOfLines={2}>
                          {item.display_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* VISUAL INTERACTIVE MAP SECTION */}
            <View style={styles.mapCard}>
              <View style={styles.mapHeaderRow}>
                <View style={styles.mapBadge}>
                  <View style={[styles.statusDot, { backgroundColor: activeCategoryConfig.color }]} />
                  <Text style={styles.mapBadgeText}>
                    {mapMode === 'satellite' ? 'Satellite' : 'Road'} • Zoom {zoom}x
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={[
                      styles.modeToggleBtn,
                      mapMode === 'satellite' && styles.modeToggleBtnActive,
                    ]}
                    onPress={() => setMapMode(mapMode === 'street' ? 'satellite' : 'street')}
                  >
                    <Text
                      style={[
                        styles.modeToggleText,
                        mapMode === 'satellite' && styles.modeToggleTextActive,
                      ]}
                    >
                      {mapMode === 'street' ? '🛰️ Satellite' : '🗺️ Road'}
                    </Text>
                  </TouchableOpacity>

                  {/* Fullscreen Map Mode Button */}
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
                  👆 Drag freely in 360° • Pinch to zoom • Tap anywhere to drop pin
                </Text>
              </View>

              {/* Map Canvas with 5x5 256px Stitched Tiles */}
              <View
                style={styles.mapCanvas}
                onLayout={(e) => {
                  setCanvasLayout({
                    width: e.nativeEvent.layout.width,
                    height: e.nativeEvent.layout.height,
                  });
                }}
                {...panResponder.panHandlers}
              >
                <Animated.View
                  style={[
                    styles.tilesGrid,
                    {
                      left: '50%',
                      top: '50%',
                      marginLeft: -640 - fracX,
                      marginTop: -640 - fracY,
                      transform: [{ translateX: pan.x }, { translateY: pan.y }],
                    },
                  ]}
                >
                  {tileOffsets.map((offset, i) => {
                    const x = centerTileX + offset.dx;
                    const y = centerTileY + offset.dy;
                    const url = getTileUrl(x, y);
                    return (
                      <Image
                        key={`${mapMode}-${zoom}-${x}-${y}-${i}`}
                        source={{ uri: url }}
                        style={styles.gridTile}
                        resizeMode="cover"
                      />
                    );
                  })}
                </Animated.View>

                {/* Crosshair & Pin */}
                <View style={styles.crosshairH} pointerEvents="none" />
                <View style={styles.crosshairV} pointerEvents="none" />
                <Animated.View
                  style={[styles.pinOverlay, { transform: [{ translateY: pinBounceAnim }] }]}
                  pointerEvents="none"
                >
                  <View style={styles.googlePinContainer}>
                    <View style={[styles.googlePinHead, { backgroundColor: activeCategoryConfig.color, borderColor: '#0F172A' }]}>
                      <View style={styles.googlePinDot} />
                    </View>
                    <View style={[styles.googlePinTip, { borderTopColor: activeCategoryConfig.color }]} />
                  </View>
                  <View style={styles.googlePinShadow} />
                </Animated.View>

                {/* Floating Zoom In / Out Buttons */}
                <View style={styles.zoomControlCol}>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(1)}>
                    <Text style={styles.controlBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(-1)}>
                    <Text style={styles.controlBtnText}>−</Text>
                  </TouchableOpacity>
                </View>

                {/* Micro-Nudge D-Pad (4 Directions: ▲, ▼, ◄, ►) */}
                <View style={styles.nudgePad}>
                  <TouchableOpacity
                    style={[styles.nudgeBtn, styles.nudgeBtnNorth]}
                    onPress={() => handleNudge(0.00003, 0)}
                  >
                    <Text style={styles.nudgeBtnText}>▲</Text>
                  </TouchableOpacity>
                  <View style={styles.nudgeMidRow}>
                    <TouchableOpacity
                      style={[styles.nudgeBtn, styles.nudgeBtnWest]}
                      onPress={() => handleNudge(0, -0.00003)}
                    >
                      <Text style={styles.nudgeBtnText}>◄</Text>
                    </TouchableOpacity>
                    <View style={styles.nudgeCenterDot}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>3m</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.nudgeBtn, styles.nudgeBtnEast]}
                      onPress={() => handleNudge(0, 0.00003)}
                    >
                      <Text style={styles.nudgeBtnText}>►</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.nudgeBtn, styles.nudgeBtnSouth]}
                    onPress={() => handleNudge(-0.00003, 0)}
                  >
                    <Text style={styles.nudgeBtnText}>▼</Text>
                  </TouchableOpacity>
                </View>

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
              placeholder="e.g. Apex Heart Centre, Metro Pharmacy"
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

            {/* Coordinate Fine-Tune Display */}
            <Text style={styles.sectionHeading}>GPS Geotag Coordinates</Text>
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
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
    maxHeight: 180,
  },
  suggestionsHeader: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
    marginLeft: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  suggestionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  suggestionAddr: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  modeToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modeToggleBtnActive: {
    backgroundColor: '#0B2545',
    borderColor: '#0B2545',
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
  expandMapBtn: {
    paddingHorizontal: 8,
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
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  interactiveInstructionText: {
    fontSize: 10.5,
    color: '#1D4ED8',
    textAlign: 'center',
    fontWeight: '600',
  },
  mapCanvas: {
    height: 290,
    width: '100%',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tilesGrid: {
    width: 1280,
    height: 1280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
  },
  gridTile: {
    width: 256,
    height: 256,
    backgroundColor: '#CBD5E1',
  },
  crosshairH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  crosshairV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  pinOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  googlePinContainer: {
    alignItems: 'center',
    transform: [{ translateY: -17 }],
  },
  googlePinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  googlePinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  googlePinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  googlePinShadow: {
    position: 'absolute',
    bottom: 24,
    width: 16,
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
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
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 4,
  },
  controlBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  nudgePad: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    alignItems: 'center',
  },
  nudgeMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nudgeBtn: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
  },
  nudgeBtnNorth: {
    marginBottom: 2,
  },
  nudgeBtnSouth: {
    marginTop: 2,
  },
  nudgeBtnWest: {
    marginRight: 2,
  },
  nudgeBtnEast: {
    marginLeft: 2,
  },
  nudgeCenterDot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1E293B',
  },
  floatingGpsBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: '#0284C7',
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
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.3,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  categoryTab: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  resolvingBadge: {
    fontSize: 11,
    color: '#0F8B5A',
    fontWeight: '600',
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
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  coordInputsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  coordSubLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  coordInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#334155',
    fontFamily: 'monospace',
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Fullscreen Map Styles
  fullscreenContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  fullscreenTopBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullscreenBackBtn: {
    backgroundColor: '#0B2545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fullscreenBackBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenModeToggle: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 3,
    borderRadius: 8,
  },
  fullscreenSearchBox: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  fullscreenSearchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
    color: '#0F172A',
  },
  fullscreenCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullscreenBottomCard: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fullscreenCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  fullscreenCardAddr: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  fullscreenCardCoords: {
    fontSize: 10.5,
    color: '#0284C7',
    fontWeight: '700',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  fullscreenConfirmBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  fullscreenConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
