import React from 'react';
import { Crosshair, MapPin, Building2, ShieldCheck, Radio, Navigation } from 'lucide-react';

interface MapMarkerViewProps {
  doctorName?: string;
  clinicName?: string;
  doctorLat?: number;
  doctorLng?: number;
  mrDistanceM?: number;
  verified?: boolean;
}

export const MapMarkerView: React.FC<MapMarkerViewProps> = ({
  doctorName = 'Dr. Rajesh Sharma',
  clinicName = 'Apex Heart Centre',
  doctorLat = 28.5245,
  doctorLng = 77.2066,
  mrDistanceM = 8.4,
  verified = true,
}) => {
  return (
    <div className="enterprise-panel">
      <div className="panel-header-bar">
        <div className="panel-headline">
          <Crosshair size={16} color="#0052cc" />
          <span>Geofence Perimeter Inspector (Non-Live Static Map per PRD §21)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`status-pill ${verified ? 'success' : 'alert'}`}>
            <span className={`status-dot ${verified ? 'success' : 'alert'}`}></span>
            {verified ? 'Perimeter Verified (≤20m)' : 'Outside Perimeter (>20m)'}
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Distance: {mrDistanceM}m (Allowed Radius: 20m)
          </span>
        </div>
      </div>

      <div style={{ padding: '14px' }}>
        <div className="geofence-radar-canvas">
          {/* Radar Sweep Grids */}
          <div className="radar-sweep"></div>
          <div className="radar-perimeter-ring">
            <span style={{ color: 'rgba(0, 230, 153, 0.8)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
              20m Geofence
            </span>
          </div>

          {/* Doctor Destination Anchor */}
          <div className="radar-pin-doctor">
            <Building2 size={14} color="#60a5fa" />
            <div>
              <div>{doctorName}</div>
              <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                {clinicName} • ({doctorLat}, {doctorLng})
              </div>
            </div>
          </div>

          {/* MR On-Site Verification Pin */}
          <div className="radar-pin-mr">
            <Navigation size={13} color="#4ade80" />
            <div>
              <div>MR Rahul Sharma</div>
              <div style={{ fontSize: '9.5px', color: '#bbf7d0' }}>
                {mrDistanceM}m from destination (GPS accuracy: ±10m)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
