import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Search,
  MapPin,
  X,
  Save,
  Navigation,
  Crosshair,
  Building,
  CheckCircle2,
  Loader2,
  Calendar,
} from 'lucide-react';
import { create3DMapPinHtml } from '../utils/mapPinGenerator';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocation: (loc: {
    name: string;
    clinic: string;
    category: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius_m: number;
    phone?: string;
  }) => void;
  onAssignTaskHere?: (loc: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius_m: number;
  }) => void;
  initialLat?: number;
  initialLng?: number;
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSaveLocation,
  onAssignTaskHere,
  initialLat = 28.5245,
  initialLng = 77.2066,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Selected Location State
  const [selectedLat, setSelectedLat] = useState<number>(initialLat);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng);
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('Ring Road, Saket, South Delhi');
  const [category, setCategory] = useState<'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER'>('CLINIC');
  const [phone, setPhone] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState<number>(50); // 50m default
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [isMapInteracting, setIsMapInteracting] = useState(false);

  const toggleMapInteraction = () => {
    if (!mapInstanceRef.current) return;
    if (isMapInteracting) {
      mapInstanceRef.current.dragging.disable();
      mapInstanceRef.current.touchZoom.disable();
      setIsMapInteracting(false);
    } else {
      mapInstanceRef.current.dragging.enable();
      mapInstanceRef.current.touchZoom.enable();
      setIsMapInteracting(true);
    }
  };
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = createOptimizedMap(mapContainerRef.current, {
        zoomControl: false,
        dragging: !isMobile,
        touchZoom: !isMobile,
      }).setView([selectedLat, selectedLng], 16);
      mapInstanceRef.current = map;
      if (isMobile) {
        map.dragging.disable();
        map.touchZoom.disable();
      }
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      const customIcon = L.divIcon({
        html: create3DMapPinHtml({ category, isSelected: true }),
        className: 'saved-location-3d-marker',
        iconSize: [45, 59],
        iconAnchor: [22.5, 59],
        popupAnchor: [0, -56],
      });

      const marker = L.marker([selectedLat, selectedLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      const getCatColor = (cat: string) => {
        if (cat === 'HOSPITAL') return '#DC2626';
        if (cat === 'PHARMACY') return '#2563EB';
        if (cat === 'OFFICE') return '#7C3AED';
        return '#0F8B5A';
      };

      const catColor = getCatColor(category);
      const circle = L.circle([selectedLat, selectedLng], {
        radius: geofenceRadius,
        color: catColor,
        fillColor: catColor,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 6',
      }).addTo(map);
      circleRef.current = circle;

      // Handle map clicks
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updatePosition(lat, lng);
      });

      // Handle marker drag
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updatePosition(pos.lat, pos.lng);
      });
    }

    // Update marker icon when category changes
    if (markerRef.current) {
      const updatedIcon = L.divIcon({
        html: create3DMapPinHtml({ category, isSelected: true }),
        className: 'saved-location-3d-marker',
        iconSize: [45, 59],
        iconAnchor: [22.5, 59],
        popupAnchor: [0, -56],
      });
      markerRef.current.setIcon(updatedIcon);
    }

    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
    const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 180);
    const t3 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 450);

    return () => {
      window.removeEventListener('resize', handleResize);
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

  // Dynamically update 3D map pin icon and geofence color when user changes category
  useEffect(() => {
    const getCatColor = (cat: string) => {
      if (cat === 'HOSPITAL') return '#DC2626';
      if (cat === 'PHARMACY') return '#2563EB';
      if (cat === 'OFFICE') return '#7C3AED';
      return '#0F8B5A';
    };

    if (markerRef.current) {
      const updatedIcon = L.divIcon({
        html: create3DMapPinHtml({ category, isSelected: true }),
        className: 'saved-location-3d-marker',
        iconSize: [45, 59],
        iconAnchor: [22.5, 59],
        popupAnchor: [0, -56],
      });
      markerRef.current.setIcon(updatedIcon);
    }

    if (circleRef.current) {
      const catColor = getCatColor(category);
      circleRef.current.setStyle({
        color: catColor,
        fillColor: catColor,
      });
    }
  }, [category]);

  // Handle mapMode switch (Street / Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(mapInstanceRef.current);
  }, [mapMode]);

  // Update position, marker, circle, and reverse geocode
  const updatePosition = async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng]);
    }

    // Live Reverse Geocode via OpenStreetMap Nominatim (100% free)
    try {
      setIsReverseGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
          if (!locationName) {
            const shortName = data.name || (data.address && (data.address.amenity || data.address.hospital || data.address.road)) || 'Marked Clinic';
            setLocationName(shortName);
          }
        }
      }
    } catch (err) {
      console.warn('Reverse geocode failed:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Update geofence radius visual circle
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(geofenceRadius);
    }
  }, [geofenceRadius]);

  // High-Accuracy Live Search (Photon POI for medical shops/hospitals + Nominatim + GPS Coords)
  const handleLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);

    // 1. Check if user entered direct GPS coordinates: "lat, lng" or "lat lng"
    const coordMatch = query.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        updatePosition(lat, lng);
        mapInstanceRef.current?.setView([lat, lng], 17);
        setIsSearching(false);
        return;
      }
    }

    try {
      // 2. Query Photon POI API (Specialized in places, clinics, pharmacies, hospitals & shops)
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`,
      );
      let parsedResults: any[] = [];

      if (photonRes.ok) {
        const pData = await photonRes.json();
        if (pData?.features && pData.features.length > 0) {
          parsedResults = pData.features.map((f: any) => {
            const props = f.properties || {};
            const name = props.name || props.street || query;
            const fullAddr = [
              props.name,
              props.housenumber ? `#${props.housenumber}` : null,
              props.street,
              props.district || props.city,
              props.state,
              props.postcode,
            ]
              .filter(Boolean)
              .join(', ');

            return {
              name,
              display_name: fullAddr || name,
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
              category: props.osm_value || 'PLACE',
            };
          });
        }
      }

      // 3. Fallback to Nominatim if Photon yields no results
      if (parsedResults.length === 0) {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6`,
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData)) {
            parsedResults = nomData.map((item: any) => ({
              name: item.name || item.display_name.split(',')[0],
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
              category: 'PLACE',
            }));
          }
        }
      }

      setSearchResults(parsedResults);

      if (parsedResults.length > 0) {
        const first = parsedResults[0];
        updatePosition(first.lat, first.lon);
        setLocationName(first.name);
        setAddress(first.display_name);
        mapInstanceRef.current?.setView([first.lat, first.lon], 16);
      }
    } catch (err) {
      console.error('Live search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    updatePosition(lat, lon);
    setLocationName(item.name || item.display_name.split(',')[0]);
    setAddress(item.display_name);
    setSearchResults([]);
    mapInstanceRef.current?.setView([lat, lon], 16);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updatePosition(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Could not access current browser GPS. Using default coordinates.');
        },
      );
    }
  };

  const handleSave = () => {
    if (!locationName.trim()) {
      alert('Please enter a Clinic or Location name');
      return;
    }
    onSaveLocation({
      name: locationName,
      clinic: locationName,
      category,
      address,
      latitude: selectedLat,
      longitude: selectedLng,
      geofence_radius_m: geofenceRadius,
      phone,
    });
    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-box map-picker-modal-box">
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#1A3C6E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                Interactive Live Map & Location Picker
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Free live global map • Search, click anywhere to pin coordinates, or save doctor clinics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body: Split Map & Form */}
        <div className="modal-split-container">
          {/* Left Column: Live Map */}
          <div className="modal-map-col">
            {/* Search Bar Floating on Map */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                right: 14,
                zIndex: 400,
                display: 'flex',
                gap: '8px',
              }}
            >
              <form
                onSubmit={handleLiveSearch}
                style={{
                  flex: 1,
                  display: 'flex',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  border: '1px solid #CBD5E1',
                }}
              >
                <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', color: '#64748B' }}>
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search live address, hospital, doctor clinic, landmark..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '10px 0',
                    fontSize: '13px',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  style={{
                    padding: '0 16px',
                    background: '#1A3C6E',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isSearching ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
                </button>
              </form>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                title="Locate Me (GPS)"
                style={{
                  width: '42px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#0F8B5A',
                }}
              >
                <Crosshair size={20} />
              </button>

              <button
                type="button"
                onClick={() => setMapMode(mapMode === 'street' ? 'satellite' : 'street')}
                title={mapMode === 'street' ? 'Switch to Satellite' : 'Switch to Road Map'}
                style={{
                  padding: '0 12px',
                  background: mapMode === 'satellite' ? '#1A3C6E' : '#FFFFFF',
                  color: mapMode === 'satellite' ? '#FFFFFF' : '#334155',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {mapMode === 'street' ? 'Satellite' : 'Road Map'}
              </button>
            </div>

            {/* Live Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 64,
                  left: 14,
                  right: 64,
                  zIndex: 400,
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                  border: '1px solid #E2E8F0',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    <MapPin size={14} color="#0F8B5A" />
                    <span>{item.display_name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Leaflet DOM Node */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* Bottom Floating Coordinate Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(4px)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                zIndex: 400,
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <span>Lat: <strong>{selectedLat.toFixed(6)}</strong></span>
              <span>Lng: <strong>{selectedLng.toFixed(6)}</strong></span>
              <span>Radius: <strong>{geofenceRadius}m</strong></span>
              {isReverseGeocoding && <span style={{ color: '#FCD34D' }}>Resolving address...</span>}
            </div>
          </div>

          {/* Right Column: Location Details & Save Form */}
          <div className="modal-form-col">
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                Save Marked Location
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Once saved, this location is stored in the master directory. You can assign future MR tasks directly without searching again.
              </p>
            </div>

            {/* Location / Clinic Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Doctor Clinic / Place Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Heart Centre, Dr. Sharma Clinic"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                <option value="CLINIC">Doctor Clinic</option>
                <option value="HOSPITAL">Hospital / Nursing Home</option>
                <option value="PHARMACY">Pharmacy / Chemist Store</option>
                <option value="OFFICE">Distributor / Stockist / Office</option>
                <option value="OTHER">Other Territory Location</option>
              </select>
            </div>

            {/* Resolved Address */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Doctor / Clinic Phone (Optional)
              </label>
              <input
                type="text"
                placeholder="+91 98111 22334"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Geofence Perimeter Radius Slider */}
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                  Allowed On-Site Geofence Radius
                </span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F8B5A' }}>
                  {geofenceRadius} meters
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                MR can only start or finish visits when within this circle.
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: isSavedSuccess ? '#0F8B5A' : '#1A3C6E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.2s',
                }}
              >
                {isSavedSuccess ? (
                  <>
                    <CheckCircle2 size={16} /> Saved to Master Directory!
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Location
                  </>
                )}
              </button>

              {onAssignTaskHere && (
                <button
                  type="button"
                  onClick={() => {
                    if (!locationName.trim()) {
                      alert('Please enter a location name before assigning task');
                      return;
                    }
                    onAssignTaskHere({
                      name: locationName,
                      address,
                      latitude: selectedLat,
                      longitude: selectedLng,
                      geofence_radius_m: geofenceRadius,
                    });
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#FFFFFF',
                    color: '#0F8B5A',
                    borderRadius: '6px',
                    border: '1px solid #0F8B5A',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Calendar size={15} /> Assign Task to This Location Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
