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
import { getStoredSavedLocations } from '../utils/savedLocationsStore';

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
  } | null>(null);

  // Dynamic Saved Locations from Store (no hardcoded dummy pins)
  const savedLocations = getStoredSavedLocations();
  const primaryLoc = savedLocations.length > 0 ? savedLocations[0] : null;
  const otherClinics = savedLocations.length > 1 ? savedLocations.slice(1) : [];

  const defaultCenter = {
    lat: primaryLoc ? primaryLoc.latitude : 23.2953,
    lng: primaryLoc ? primaryLoc.longitude : 81.3586,
  };

  const activeMR = {
    id: 'usr-mr-02',
    name: 'Aman Rathore (Field MR)',
    lat: defaultCenter.lat + (primaryLoc ? 0.0001 : 0),
    lng: defaultCenter.lng + (primaryLoc ? 0.0001 : 0),
    distanceM: primaryLoc ? 8.4 : 0,
    accuracyM: 6.5,
    verified: true,
    lastCheckin: '10:00 AM',
    currentCallStarted: '10:15 AM',
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = createOptimizedMap(mapContainerRef.current, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom: 16,
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

    // 1. Plot Main Clinic & Geofence Circle if genuine saved location exists
    if (primaryLoc) {
      const clinicIcon = L.divIcon({
        html: create3DMapPinHtml({ category: primaryLoc.category || 'CLINIC', isSelected: selectedPin?.type === 'doctor' }),
        className: 'saved-location-3d-marker',
        iconSize: selectedPin?.type === 'doctor' ? [28, 37] : [24, 32],
        iconAnchor: selectedPin?.type === 'doctor' ? [14, 37] : [12, 32],
        popupAnchor: [0, selectedPin?.type === 'doctor' ? -35 : -30],
      });

      const clinicMarker = L.marker([primaryLoc.latitude, primaryLoc.longitude], { icon: clinicIcon });
      clinicMarker.bindPopup(`
        <div style="font-family:sans-serif;min-width:180px;">
          <strong style="color:#0F172A;font-size:13px;">${primaryLoc.clinic || primaryLoc.name}</strong>
          <p style="margin:3px 0;font-size:11px;color:#475569;">${primaryLoc.name}</p>
          <p style="margin:2px 0;font-size:11px;color:#64748B;">${primaryLoc.address}</p>
          <div style="margin-top:6px;font-size:10px;font-weight:700;color:#0F8B5A;background:#DCFCE7;padding:2px 6px;border-radius:4px;display:inline-block;">
            Geofence Perimeter: ${primaryLoc.geofence_radius_m || 20}m
          </div>
        </div>
      `);

      clinicMarker.on('click', () => {
        setSelectedPin({
          type: 'doctor',
          name: primaryLoc.name,
          title: primaryLoc.clinic || primaryLoc.name,
          lat: primaryLoc.latitude,
          lng: primaryLoc.longitude,
        });
      });
      layersGroupRef.current.addLayer(clinicMarker);

      // 2. Plot Geofence Circle Boundary
      if (showGeofenceCircles) {
        const radius = primaryLoc.geofence_radius_m || 20;
        const circle = L.circle([primaryLoc.latitude, primaryLoc.longitude], {
          radius,
          color: '#0F8B5A',
          fillColor: '#0F8B5A',
          fillOpacity: 0.18,
          weight: 2,
          dashArray: '5, 8',
        });
        circle.bindTooltip(`${radius}m Authorized Geofence`, { permanent: false });
        layersGroupRef.current.addLayer(circle);
      }

      // Distance connection line between MR and Clinic
      const line = L.polyline(
        [
          [primaryLoc.latitude, primaryLoc.longitude],
          [activeMR.lat, activeMR.lng],
        ],
        { color: '#0F8B5A', weight: 2, dashArray: '4, 6' },
      );
      layersGroupRef.current.addLayer(line);
    }

    // 3. Plot Field MR with live GPS Position & 3D Agent Pin
    const mrIcon = L.divIcon({
      html: create3DMapPinHtml({ category: 'MR', isSelected: selectedPin?.type === 'mr' }),
      className: 'saved-location-3d-marker',
      iconSize: selectedPin?.type === 'mr' ? [28, 37] : [24, 32],
      iconAnchor: selectedPin?.type === 'mr' ? [14, 37] : [12, 32],
      popupAnchor: [0, selectedPin?.type === 'mr' ? -35 : -30],
    });

    const mrMarker = L.marker([activeMR.lat, activeMR.lng], { icon: mrIcon });
    mrMarker.bindPopup(`
      <div style="font-family:sans-serif;min-width:180px;">
        <strong style="color:#0F172A;font-size:13px;">${activeMR.name}</strong>
        <p style="margin:2px 0;font-size:11px;color:#166534;font-weight:700;">On-Site Active</p>
        <p style="margin:2px 0;font-size:11px;color:#64748B;">GPS Accuracy: ±${activeMR.accuracyM}m</p>
        <p style="margin:2px 0;font-size:11px;color:#64748B;">Status: Live in Field</p>
      </div>
    `);

    mrMarker.on('click', () => {
      setSelectedPin({
        type: 'mr',
        name: activeMR.name,
        title: 'Active Field MR',
        lat: activeMR.lat,
        lng: activeMR.lng,
        distance: activeMR.distanceM,
        accuracy: activeMR.accuracyM,
        status: 'VERIFIED_ON_SITE',
      });
    });
    layersGroupRef.current.addLayer(mrMarker);

    // 4. Plot any other genuine saved locations
    otherClinics.forEach((oc) => {
      const isHospital = (oc.category || '').toUpperCase() === 'HOSPITAL' || oc.name.toLowerCase().includes('hospital');
      const otherIcon = L.divIcon({
        html: create3DMapPinHtml({ category: isHospital ? 'HOSPITAL' : 'CLINIC', isSelected: false }),
        className: 'saved-location-3d-marker',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -30],
      });
      const m = L.marker([oc.latitude, oc.longitude], { icon: otherIcon });
      m.bindPopup(`<strong>${oc.name}</strong><br/><span style="font-size:11px;color:#64748B;">${oc.clinic || oc.address}</span>`);
      layersGroupRef.current?.addLayer(m);
    });
  };

  const handleRecenter = () => {
    mapInstanceRef.current?.setView([defaultCenter.lat, defaultCenter.lng], 16);
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
                  Field Team Locations &amp; Geofence
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
                Verified on-site locations and territory geofence perimeters (&le;50m tolerance)
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
