import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  Phone,
  Building,
  MapPin,
  Map,
  X,
  Save,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  Crosshair,
} from 'lucide-react';
import { DoctorItem } from '../types';
import { Language, translations } from '../utils/i18n';
import { MapLocationPickerModal } from '../components/MapLocationPickerModal';
import { createOptimizedMap, createResilientTileLayer } from '../utils/mapTileEngine';

interface DoctorsViewProps {
  lang?: Language;
}

export const DoctorsView: React.FC<DoctorsViewProps> = ({ lang = 'en' }) => {
  const t = translations[lang];

  const [doctors, setDoctors] = useState<DoctorItem[]>([
    {
      id: 'doc-01',
      name: 'Dr. Rajesh Sharma',
      qualification: 'MD, DM (Cardiology)',
      specialization: 'Cardiologist',
      class: 'A',
      potential_score: 95,
      clinic: 'Apex Heart Centre',
      area_name: 'South Delhi (Saket)',
      phone: '+91 98111 22233',
      latitude: 28.5245,
      longitude: 77.2066,
      visit_count: 14,
      assigned_mr_id: 'usr-mr-01',
      assigned_mr_name: 'Rahul Sharma',
    },
    {
      id: 'doc-02',
      name: 'Dr. Priya Verma',
      qualification: 'MBBS, DNB (Paediatrics)',
      specialization: 'Paediatrician',
      class: 'B',
      potential_score: 82,
      clinic: 'Little Care Clinic',
      area_name: 'South Delhi (Green Park)',
      phone: '+91 98111 44455',
      latitude: 28.5585,
      longitude: 77.2028,
      visit_count: 9,
      assigned_mr_id: 'usr-mr-01',
      assigned_mr_name: 'Rahul Sharma',
    },
    {
      id: 'doc-03',
      name: 'Dr. Anita Desai',
      qualification: 'MBBS, MD (Dermatology)',
      specialization: 'Dermatologist',
      class: 'A',
      potential_score: 91,
      clinic: 'Skin Care Centre',
      area_name: 'South Delhi (Hauz Khas)',
      phone: '+91 98777 66554',
      latitude: 28.5494,
      longitude: 77.2001,
      visit_count: 11,
      assigned_mr_id: 'usr-mr-02',
      assigned_mr_name: 'Vikram Malhotra',
    },
    {
      id: 'doc-04',
      name: 'Dr. Sameer Kapoor',
      qualification: 'MBBS',
      specialization: 'General Physician',
      class: 'C',
      potential_score: 64,
      clinic: 'Kapoor Health Clinic',
      area_name: 'South Delhi (Malviya Nagar)',
      phone: '+91 98999 11122',
      latitude: 28.5300,
      longitude: 77.2150,
      visit_count: 5,
      assigned_mr_id: 'usr-mr-03',
      assigned_mr_name: 'Pooja Verma',
    },
  ]);

  const mrMembers = [
    { id: 'usr-mr-01', name: 'Rahul Sharma' },
    { id: 'usr-mr-02', name: 'Vikram Malhotra' },
    { id: 'usr-mr-03', name: 'Pooja Verma' },
    { id: 'usr-mr-04', name: 'Amit Kumar' },
  ];

  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [selectedDoctorForHistory, setSelectedDoctorForHistory] = useState<DoctorItem | null>(null);
  const [selectedDoctorForLocation, setSelectedDoctorForLocation] = useState<DoctorItem | null>(null);

  // Live auto-fetch from backend
  const fetchDoctors = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/doctors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDoctors(data);
        }
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
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

  // New Doctor Form State
  const [newDocName, setNewDocName] = useState('');
  const [newDocQual, setNewDocQual] = useState('MBBS, MD');
  const [newDocSpec, setNewDocSpec] = useState('Cardiologist');
  const [newDocClass, setNewDocClass] = useState<'A' | 'B' | 'C'>('A');
  const [newDocScore, setNewDocScore] = useState<number>(85);
  const [newDocClinic, setNewDocClinic] = useState('');
  const [newDocArea, setNewDocArea] = useState('South Delhi');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocAssignedMr, setNewDocAssignedMr] = useState('usr-mr-01');
  const [newDocLat, setNewDocLat] = useState<number>(28.5245);
  const [newDocLng, setNewDocLng] = useState<number>(77.2066);

  // Filter Doctors
  const filteredDoctors = doctors.filter((d) => {
    const matchesClass = selectedClass === 'ALL' ? true : d.class === selectedClass;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.clinic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.area_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = createOptimizedMap(mapContainerRef.current, {
        zoomControl: false,
        dragging: true,
        touchZoom: true,
      }).setView([28.538, 77.206], 13);
      mapInstanceRef.current = map;
      map.dragging.enable();
      map.touchZoom.enable();

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      tileLayerRef.current = createResilientTileLayer(mapMode).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    renderDoctorMarkers();

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, []);

  // Update map tile layer when satellite mode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = createResilientTileLayer(mapMode).addTo(mapInstanceRef.current);
  }, [mapMode]);

  // Update markers on doctor list or filter change
  useEffect(() => {
    renderDoctorMarkers();
  }, [doctors, selectedClass, searchQuery]);

  const renderDoctorMarkers = () => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    filteredDoctors.forEach((doc) => {
      const markerColor = doc.class === 'A' ? '#0F8B5A' : doc.class === 'B' ? '#2563EB' : '#64748B';
      const docIcon = L.divIcon({
        html: `<div style="background:${markerColor};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);font-size:14px;font-weight:bold;">🩺</div>`,
        className: 'doctor-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const m = L.marker([doc.latitude, doc.longitude], { icon: docIcon });
      m.bindPopup(`
        <div style="font-family:sans-serif;min-width:200px;">
          <strong style="color:#0F172A;font-size:13px;">${doc.name}</strong>
          <p style="margin:2px 0;font-size:11px;color:#475569;">${doc.qualification} • ${doc.specialization}</p>
          <p style="margin:2px 0;font-size:11px;color:#0F8B5A;font-weight:700;">${doc.clinic}</p>
          <p style="margin:2px 0;font-size:11px;color:#64748B;">${doc.area_name}</p>
          <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;">
            <span style="background:${doc.class === 'A' ? '#DCFCE7' : '#DBEAFE'};color:${doc.class === 'A' ? '#166534' : '#1E40AF'};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">
              Class ${doc.class} (Score: ${doc.potential_score})
            </span>
            <span style="font-size:10.5px;color:#64748B;">${doc.visit_count} Calls</span>
          </div>
        </div>
      `);
      markersLayerRef.current?.addLayer(m);
    });
  };

  const handleFocusDoctor = (doc: DoctorItem) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([doc.latitude, doc.longitude], 16);
    }
  };

  const handleAssignDoctorToMr = async (doctorId: string, mrId: string, mrName: string) => {
    setDoctors((prev) =>
      prev.map((d) =>
        d.id === doctorId ? { ...d, assigned_mr_id: mrId, assigned_mr_name: mrName } : d,
      ),
    );

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/doctors/${doctorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ assigned_mr_id: mrId, assigned_mr_name: mrName }),
      });
    } catch {
      // Offline fallback
    }
  };

  const handleMarkDoctorLocation = (doc: DoctorItem) => {
    setSelectedDoctorForLocation(doc);
    setIsMapPickerOpen(true);
  };

  const handleLocationPicked = async (loc: any) => {
    if (!selectedDoctorForLocation) return;
    const docId = selectedDoctorForLocation.id;
    setDoctors((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              latitude: loc.latitude,
              longitude: loc.longitude,
              address: loc.address || d.address,
              clinic: loc.clinic || d.clinic,
            }
          : d,
      ),
    );

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      await fetch(`${apiUrl}/doctors/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          clinic: loc.clinic,
        }),
      });
    } catch {
      // Fallback
    }

    setIsMapPickerOpen(false);
    setSelectedDoctorForLocation(null);
  };

  const handleSaveNewDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocClinic.trim()) {
      alert('Please enter doctor name and clinic name.');
      return;
    }

    const assignedMatch = mrMembers.find((m) => m.id === newDocAssignedMr);
    const created: DoctorItem = {
      id: `doc-${Date.now().toString().slice(-4)}`,
      name: newDocName,
      qualification: newDocQual,
      specialization: newDocSpec,
      class: newDocClass,
      potential_score: newDocScore,
      clinic: newDocClinic,
      area_name: newDocArea,
      phone: newDocPhone || '+91 98000 00000',
      latitude: newDocLat,
      longitude: newDocLng,
      visit_count: 0,
      assigned_mr_id: newDocAssignedMr,
      assigned_mr_name: assignedMatch ? assignedMatch.name : 'Rahul Sharma',
    };

    setDoctors([created, ...doctors]);
    setIsAddDoctorOpen(false);

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
      fetch(`${apiUrl}/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: created.name,
          qualification: created.qualification,
          specialization: created.specialization,
          class: created.class,
          potential_score: created.potential_score,
          clinic: created.clinic,
          address: `${created.clinic}, ${created.area_name}`,
          latitude: created.latitude,
          longitude: created.longitude,
          phone: created.phone,
          assigned_mr_id: created.assigned_mr_id,
          assigned_mr_name: created.assigned_mr_name,
        }),
      }).catch(() => {});
    } catch {}

    // Reset Form
    setNewDocName('');
    setNewDocClinic('');
    setNewDocPhone('');

    // Focus on new doctor
    setTimeout(() => {
      handleFocusDoctor(created);
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Unified Doctor Directory & Territory Map Header Panel */}
      <div className="enterprise-panel" style={{ overflow: 'hidden' }}>
        {/* Top Header Row: Title & Action Controls */}
        <div
          style={{
            padding: '12px 16px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Stethoscope size={18} color="#0052cc" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                {t.doctorDirectoryTitle} ({filteredDoctors.length} Plotted)
              </h2>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                Verified target doctors, geocoded clinic coordinates & detailing history
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Pan Toggle */}
            <button
              type="button"
              onClick={toggleMapInteraction}
              style={{
                background: isMapInteracting ? '#0F8B5A' : '#FFFFFF',
                color: isMapInteracting ? '#FFFFFF' : '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '4px 9px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
              title="Toggle whether touching the map drags the map or scrolls the page"
            >
              <span>{isMapInteracting ? '🔓 Pan On' : '🔒 Pan Map'}</span>
            </button>

            {/* Satellite / Street Mode Toggle */}
            <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setMapMode('street')}
                style={{
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: mapMode === 'street' ? '#1A3C6E' : 'transparent',
                  color: mapMode === 'street' ? '#FFFFFF' : '#475569',
                }}
              >
                Street Map
              </button>
              <button
                type="button"
                onClick={() => setMapMode('satellite')}
                style={{
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: mapMode === 'satellite' ? '#1A3C6E' : 'transparent',
                  color: mapMode === 'satellite' ? '#FFFFFF' : '#475569',
                }}
              >
                Satellite
              </button>
            </div>

            {/* Add Doctor Button */}
            <button
              className="btn-enterprise primary sm"
              onClick={() => setIsAddDoctorOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', whiteSpace: 'nowrap' }}
            >
              <Plus size={14} />
              <span>{t.addDoctor}</span>
            </button>
          </div>
        </div>

        {/* Dedicated Toolbar DIRECTLY Above The Map: Search & Classification Filter */}
        <div
          style={{
            padding: '10px 16px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Search Input Bar */}
          <div
            style={{
              flex: '1 1 200px',
              display: 'flex',
              alignItems: 'center',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              borderRadius: '6px',
              padding: '0 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="Search doctor name, clinic, specialization, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '7px 8px', fontSize: '12.5px', width: '100%', background: 'transparent' }}
            />
          </div>

          {/* Classification Filter Chips */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', marginRight: '4px' }}>Class:</span>
            {['ALL', 'A', 'B', 'C'].map((c) => (
              <button
                key={c}
                type="button"
                className={`btn-enterprise sm ${selectedClass === c ? 'primary' : 'secondary'}`}
                onClick={() => setSelectedClass(c)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {c === 'ALL' ? 'All' : `Class ${c}`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: '300px', width: '100%', position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* Doctors Table */}
      <div className="enterprise-panel">
        <div className="enterprise-table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>{t.doctorName}</th>
                <th>{t.classification}</th>
                <th>{t.potentialScore}</th>
                <th>{t.clinicHospitalName}</th>
                <th>{t.territoryArea}</th>
                <th>Assigned Representative</th>
                <th>GPS Geotag</th>
                <th>{t.totalVisits}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{doc.name}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)' }}>
                      {doc.qualification} • {doc.specialization}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        doc.class === 'A' ? 'success' : doc.class === 'B' ? 'warning' : 'neutral'
                      }`}
                    >
                      Class {doc.class}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, width: '24px' }}>{doc.potential_score}</span>
                      <div
                        style={{
                          width: '60px',
                          height: '5px',
                          background: '#dfe1e6',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${doc.potential_score}%`,
                            height: '100%',
                            background: doc.potential_score >= 90 ? '#00875a' : '#0052cc',
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>{doc.clinic}</td>
                  <td>{doc.area_name}</td>
                  <td>
                    <select
                      value={doc.assigned_mr_id || 'usr-mr-01'}
                      onChange={(e) => {
                        const mId = e.target.value;
                        const match = mrMembers.find((m) => m.id === mId);
                        handleAssignDoctorToMr(doc.id, mId, match ? match.name : 'Assigned MR');
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#1A3C6E',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {mrMembers.map((mr) => (
                        <option key={mr.id} value={mr.id}>
                          {mr.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => handleFocusDoctor(doc)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Center on map"
                    >
                      <MapPin size={12} />
                      <span>{doc.latitude.toFixed(4)}, {doc.longitude.toFixed(4)}</span>
                    </button>
                  </td>
                  <td style={{ fontWeight: 600 }}>{doc.visit_count} Calls</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-enterprise secondary sm"
                        onClick={() => handleMarkDoctorLocation(doc)}
                        title="Mark / Geotag Doctor Location"
                        style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <MapPin size={11} color="#0F8B5A" />
                        <span>Mark Pin</span>
                      </button>
                      <button
                        className="btn-enterprise secondary sm"
                        onClick={() => setSelectedDoctorForHistory(doc)}
                      >
                        <History size={12} />
                        <span>{t.callHistory}</span>
                      </button>
                      <button
                        className="btn-enterprise primary sm"
                        onClick={() => handleFocusDoctor(doc)}
                      >
                        <Crosshair size={12} />
                        <span>{t.viewOnMap}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD DOCTOR MODAL */}
      {isAddDoctorOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-box" style={{ width: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={20} color="#0052cc" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                  {t.addDoctorModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDoctorOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  {t.doctorName} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ramesh Gupta"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    {t.qualification}
                  </label>
                  <input
                    type="text"
                    value={newDocQual}
                    onChange={(e) => setNewDocQual(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    {t.specialization}
                  </label>
                  <input
                    type="text"
                    value={newDocSpec}
                    onChange={(e) => setNewDocSpec(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    {t.classification}
                  </label>
                  <select
                    value={newDocClass}
                    onChange={(e) => setNewDocClass(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="A">Class A (Top Tier)</option>
                    <option value="B">Class B (Medium)</option>
                    <option value="C">Class C (Standard)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    {t.potentialScore}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={newDocScore}
                    onChange={(e) => setNewDocScore(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  {t.clinicHospitalName} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. City Heart & Diabetes Centre"
                  value={newDocClinic}
                  onChange={(e) => setNewDocClinic(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    {t.territoryArea}
                  </label>
                  <input
                    type="text"
                    value={newDocArea}
                    onChange={(e) => setNewDocArea(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    {t.phone}
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98111 55667"
                    value={newDocPhone}
                    onChange={(e) => setNewDocPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Assigned MR */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Assigned Medical Representative
                </label>
                <select
                  value={newDocAssignedMr}
                  onChange={(e) => setNewDocAssignedMr(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  {mrMembers.map((mr) => (
                    <option key={mr.id} value={mr.id}>
                      {mr.name} ({mr.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinates & Map Picker */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                    Clinic Coordinates (Geotag)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoctorForLocation(null);
                      setIsMapPickerOpen(true);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#0F8B5A', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <MapPin size={12} /> Pick on Satellite Map
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={newDocLat}
                    onChange={(e) => setNewDocLat(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={newDocLng}
                    onChange={(e) => setNewDocLng(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(false)}
                  style={{ flex: 1, padding: '10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#0052cc', border: 'none', color: '#FFFFFF', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '700' }}
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR CALL HISTORY MODAL */}
      {selectedDoctorForHistory && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-box" style={{ width: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                  Field Visit History: {selectedDoctorForHistory.name}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                  {selectedDoctorForHistory.clinic} • {selectedDoctorForHistory.area_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctorForHistory(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {[
                { date: '06 Sep 2026', mr: 'Rahul Sharma', time: '10:30 AM', duration: '38 min', products: 'CardioFix-50, CardioFix-AM', order: '₹7,200', geofence: 'Verified (8.4m)' },
                { date: '02 Sep 2026', mr: 'Rahul Sharma', time: '11:15 AM', duration: '26 min', products: 'CardioFix-50', order: '₹4,500', geofence: 'Verified (11.2m)' },
                { date: '28 Aug 2026', mr: 'Vikram Malhotra', time: '04:00 PM', duration: '31 min', products: 'Samples Dispensed (5 units)', order: 'Detailing Only', geofence: 'Verified (14.0m)' },
              ].map((visit, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '12.5px', color: '#0F172A' }}>
                      {visit.date} • {visit.time}
                    </span>
                    <span style={{ background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                      {visit.geofence}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#475569' }}>
                    MR: <strong>{visit.mr}</strong> • Meeting Duration: <strong>{visit.duration}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Products: {visit.products} • Order Value: <strong style={{ color: '#0F8B5A' }}>{visit.order}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-enterprise secondary sm"
                onClick={() => setSelectedDoctorForHistory(null)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => {
          setIsMapPickerOpen(false);
          setSelectedDoctorForLocation(null);
        }}
        initialLat={selectedDoctorForLocation ? selectedDoctorForLocation.latitude : newDocLat}
        initialLng={selectedDoctorForLocation ? selectedDoctorForLocation.longitude : newDocLng}
        onSaveLocation={(loc) => {
          if (selectedDoctorForLocation) {
            handleLocationPicked(loc);
          } else {
            setNewDocClinic(loc.clinic || loc.name);
            setNewDocLat(loc.latitude);
            setNewDocLng(loc.longitude);
            setIsMapPickerOpen(false);
          }
        }}
      />
    </div>
  );
};
