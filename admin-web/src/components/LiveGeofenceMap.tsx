import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Crosshair,
  MapPin,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Radio,
  Clock,
  HelpCircle,
  Eye,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { create3DMapPinHtml } from '../utils/mapPinGenerator';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

interface LiveGeofenceMapProps {
  lang?: Language;
}

export const LiveGeofenceMap: React.FC<LiveGeofenceMapProps> = ({ lang = 'en' }) => {
  const t = translations[lang];

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapMode, setMapMode] = useState<'street' | 'satellite' | 'topo'>('street');
  const [showExplanation, setShowExplanation] = useState(true);
  const [showGeofenceCircles, setShowGeofenceCircles] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');
  const [selectedPin, setSelectedPin] = useState<{
    type: 'doctor' | 'mr';
    name: string;
    title: string;
    lat: number;
    lng: number;
    distance?: number;
    accuracy?: number;
    status?: string;
  } | null>({
    type: 'mr',
    name: 'Rahul Sharma (Field MR)',
    title: 'On-Site at Apex Heart Centre',
    lat: 28.52458,
    lng: 77.20664,
    distance: 8.4,
    accuracy: 9.5,
    status: 'VERIFIED_ON_SITE',
  });

  // Master Clinics & Active Field MR Coordinates
  const fieldData = {
    clinic: {
      id: 'doc-1',
      doctorName: 'Dr. Rajesh Sharma (Cardiologist)',
      clinicName: 'Apex Heart Centre',
      address: 'Ring Road, Saket, South Delhi',
      lat: 28.5245,
      lng: 77.2066,
      radiusM: 50,
    },
    activeMR: {
      id: 'mr-1',
      name: 'Rahul Sharma (MR)',
      lat: 28.52458,
      lng: 77.20664,
      distanceM: 8.4,
      accuracyM: 9.5,
      verified: true,
      lastCheckin: '09:15 AM',
      currentCallStarted: '10:28 AM',
    },
    otherClinics: [
      {
        id: 'doc-2',
        name: 'Dr. Priya Verma',
        clinic: 'Little Care Clinic',
        lat: 28.5585,
        lng: 77.2028,
        radiusM: 50,
      },
      {
        id: 'doc-3',
        name: 'Max Super Specialty Hospital',
        clinic: 'Max Hospital Saket',
        lat: 28.5282,
        lng: 77.2124,
        radiusM: 60,
      },
    ],
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = createOptimizedMap(mapContainerRef.current, {
        center: [fieldData.clinic.lat, fieldData.clinic.lng],
        zoom: 17,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // Add Resilient Base Layer
      tileLayerRef.current = createResilientTileLayer(mapMode === 'satellite' ? 'satellite' : 'street').addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
    }

    renderMapEntities();

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, []);

  // Update Tile Layer when mode toggles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    tileLayerRef.current = createResilientTileLayer(mapMode === 'satellite' ? 'satellite' : 'street').addTo(mapInstanceRef.current);
  }, [mapMode]);

  // Re-render markers and geofences
  useEffect(() => {
    renderMapEntities();
  }, [showGeofenceCircles, mapMode]);

  const renderMapEntities = () => {
    if (!layersGroupRef.current || !mapInstanceRef.current) return;
    layersGroupRef.current.clearLayers();

    // 1. Plot Main Clinic & Geofence Circle
    const clinicIcon = L.divIcon({
      html: create3DMapPinHtml({ category: 'CLINIC', isSelected: selectedPin?.type === 'doctor' }),
      className: 'saved-location-3d-marker',
      iconSize: [42, 54],
      iconAnchor: [21, 54],
      popupAnchor: [0, -50],
    });

    const clinicMarker = L.marker([fieldData.clinic.lat, fieldData.clinic.lng], { icon: clinicIcon });
    clinicMarker.bindPopup(`
      <div style="font-family:sans-serif;min-width:180px;">
        <strong style="color:#0F172A;font-size:13px;">${fieldData.clinic.clinicName}</strong>
        <p style="margin:3px 0;font-size:11px;color:#475569;">${fieldData.clinic.doctorName}</p>
        <p style="margin:2px 0;font-size:11px;color:#64748B;">${fieldData.clinic.address}</p>
        <div style="margin-top:6px;font-size:10px;font-weight:700;color:#0F8B5A;background:#DCFCE7;padding:2px 6px;border-radius:4px;display:inline-block;">
          Geofence Perimeter: ${fieldData.clinic.radiusM}m
        </div>
      </div>
    `);

    clinicMarker.on('click', () => {
      setSelectedPin({
        type: 'doctor',
        name: fieldData.clinic.doctorName,
        title: fieldData.clinic.clinicName,
        lat: fieldData.clinic.lat,
        lng: fieldData.clinic.lng,
      });
    });
    layersGroupRef.current.addLayer(clinicMarker);

    // 2. Plot Geofence Circle Boundary
    if (showGeofenceCircles) {
      const circle = L.circle([fieldData.clinic.lat, fieldData.clinic.lng], {
        radius: fieldData.clinic.radiusM,
        color: '#0F8B5A',
        fillColor: '#0F8B5A',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '5, 8',
      });
      circle.bindTooltip(`${fieldData.clinic.radiusM}m Authorized Geofence`, { permanent: false });
      layersGroupRef.current.addLayer(circle);
    }

    // 3. Plot Field MR with live GPS Position & 3D Agent Pin
    const mrIcon = L.divIcon({
      html: create3DMapPinHtml({ category: 'MR', isSelected: selectedPin?.type === 'mr' }),
      className: 'saved-location-3d-marker',
      iconSize: [42, 54],
      iconAnchor: [21, 54],
      popupAnchor: [0, -50],
    });

    const mrMarker = L.marker([fieldData.activeMR.lat, fieldData.activeMR.lng], { icon: mrIcon });
    mrMarker.bindPopup(`
      <div style="font-family:sans-serif;min-width:180px;">
        <strong style="color:#0F172A;font-size:13px;">${fieldData.activeMR.name}</strong>
        <p style="margin:2px 0;font-size:11px;color:#166534;font-weight:700;">On-Site Verified (8.4m from clinic)</p>
        <p style="margin:2px 0;font-size:11px;color:#64748B;">GPS Accuracy: ±${fieldData.activeMR.accuracyM}m</p>
        <p style="margin:2px 0;font-size:11px;color:#64748B;">Arrival: ${fieldData.activeMR.currentCallStarted}</p>
      </div>
    `);

    mrMarker.on('click', () => {
      setSelectedPin({
        type: 'mr',
        name: fieldData.activeMR.name,
        title: 'Active Detailing Call',
        lat: fieldData.activeMR.lat,
        lng: fieldData.activeMR.lng,
        distance: fieldData.activeMR.distanceM,
        accuracy: fieldData.activeMR.accuracyM,
        status: 'VERIFIED_ON_SITE',
      });
    });
    layersGroupRef.current.addLayer(mrMarker);

    // 4. Distance connection line between MR and Clinic
    const line = L.polyline(
      [
        [fieldData.clinic.lat, fieldData.clinic.lng],
        [fieldData.activeMR.lat, fieldData.activeMR.lng],
      ],
      { color: '#0F8B5A', weight: 2, dashArray: '4, 6' },
    );
    layersGroupRef.current.addLayer(line);

    // 5. Plot Secondary Doctors in vicinity
    fieldData.otherClinics.forEach((oc) => {
      const isHospital = oc.name.toLowerCase().includes('hospital');
      const otherIcon = L.divIcon({
        html: create3DMapPinHtml({ category: isHospital ? 'HOSPITAL' : 'CLINIC', isSelected: false }),
        className: 'saved-location-3d-marker',
        iconSize: [36, 47],
        iconAnchor: [18, 47],
        popupAnchor: [0, -44],
      });
      const m = L.marker([oc.lat, oc.lng], { icon: otherIcon });
      m.bindPopup(`<strong>${oc.name}</strong><br/><span style="font-size:11px;color:#64748B;">${oc.clinic}</span>`);
      layersGroupRef.current?.addLayer(m);
    });
  };

  const handleRecenter = () => {
    mapInstanceRef.current?.setView([fieldData.clinic.lat, fieldData.clinic.lng], 17);
  };

  const handleRefresh = () => {
    setLastRefreshed(new Date().toLocaleTimeString());
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }
  };

  return (
    <div className="enterprise-panel" style={{ marginBottom: '20px', overflow: 'hidden' }}>
      {/* Geofencing Educational & Control Header Bar */}
      <div
        style={{
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#0F8B5A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crosshair size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                Live Geofence Perimeter & GPS Tracking Engine
              </span>
              <span
                style={{
                  background: '#DCFCE7',
                  color: '#166534',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheck size={12} /> {t.geofenceActive}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
              Real-time on-site verification • Distance: <strong>8.4m from Apex Heart Centre</strong> (Allowed: ≤50m) • Accuracy: ±9.5m
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tile Mode Switcher (Satellite vs Street vs Topo) */}
          <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '2px' }}>
            <button
              onClick={() => setMapMode('street')}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: mapMode === 'street' ? '#1A3C6E' : 'transparent',
                color: mapMode === 'street' ? '#FFFFFF' : '#475569',
              }}
            >
              {t.streetMode}
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: mapMode === 'satellite' ? '#1A3C6E' : 'transparent',
                color: mapMode === 'satellite' ? '#FFFFFF' : '#475569',
              }}
            >
              {t.satelliteMode}
            </button>
            <button
              onClick={() => setMapMode('topo')}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: mapMode === 'topo' ? '#1A3C6E' : 'transparent',
                color: mapMode === 'topo' ? '#FFFFFF' : '#475569',
              }}
            >
              {t.topoMode}
            </button>
          </div>

          <button
            onClick={handleRecenter}
            title="Recenter Map on Active Call"
            style={{
              padding: '6px 10px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
            }}
          >
            <Navigation size={12} /> Recenter
          </button>

          <button
            onClick={handleRefresh}
            title="Refresh GPS Feed"
            style={{
              padding: '6px 10px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Geofence Feature Purpose Explanation (Answering User's Question Directly) */}
      {showExplanation && (
        <div
          style={{
            background: '#EFF6FF',
            borderBottom: '1px solid #BFDBFE',
            padding: '10px 18px',
            fontSize: '12px',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <HelpCircle size={16} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>{t.geofenceTitle}:</strong>{' '}
              {t.geofenceDesc}
            </div>
          </div>
          <button
            onClick={() => setShowExplanation(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#60A5FA',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: '12px',
            }}
          >
            X
          </button>
        </div>
      )}

      {/* Map Canvas & Live Position Bar */}
      <div style={{ position: 'relative', height: '380px', width: '100%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Floating Real-Time Data Box */}
        {selectedPin && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              zIndex: 500,
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(6px)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#FFFFFF',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              fontSize: '11px',
              border: '1px solid rgba(255,255,255,0.15)',
              maxWidth: '360px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontWeight: '800', fontSize: '12px', color: '#38BDF8' }}>
                {selectedPin.name}
              </span>
              <span style={{ background: '#0F8B5A', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700' }}>
                LIVE GPS
              </span>
            </div>
            <div style={{ color: '#E2E8F0', marginBottom: '4px' }}>{selectedPin.title}</div>
            <div style={{ display: 'flex', gap: '12px', color: '#94A3B8', fontSize: '10.5px' }}>
              <span>Lat: <strong>{selectedPin.lat.toFixed(5)}</strong></span>
              <span>Lng: <strong>{selectedPin.lng.toFixed(5)}</strong></span>
              {selectedPin.distance !== undefined && (
                <span>Distance: <strong style={{ color: '#4ADE80' }}>{selectedPin.distance}m</strong></span>
              )}
            </div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: '#CBD5E1' }}>
              GPS Accuracy: ±9.5m • Last Verified: <strong>{lastRefreshed}</strong>
            </div>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 500,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1A3C6E', display: 'inline-block' }}></span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>Doctor Clinic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0F8B5A', display: 'inline-block' }}></span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>Field MR On-Site</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px dashed #0F8B5A', display: 'inline-block' }}></span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>50m Geofence</span>
          </div>
        </div>
      </div>
    </div>
  );
};
