import React from 'react';
import { MapPin, Navigation, CheckCircle2, X, Eye, Bell, ExternalLink } from 'lucide-react';

export interface NewLocationItem {
  id: string;
  name: string;
  clinic: string;
  doctor_name?: string;
  category: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';
  specialization?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  created_by_name: string;
  created_by_role: string;
  created_at: string;
}

interface NewLocationToastProps {
  locations: NewLocationItem[];
  onViewOnMap: (loc: NewLocationItem) => void;
  onAcknowledge: (id: string) => void;
  onAcknowledgeAll: () => void;
}

export const NewLocationToast: React.FC<NewLocationToastProps> = ({
  locations,
  onViewOnMap,
  onAcknowledge,
  onAcknowledgeAll,
}) => {
  if (!locations || locations.length === 0) return null;

  const currentLoc = locations[0];

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'HOSPITAL':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Hospital' };
      case 'PHARMACY':
        return { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD', label: 'Chemist / Medical Shop' };
      case 'OFFICE':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'Diagnostic / Office' };
      case 'CLINIC':
      default:
        return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC', label: 'Clinic' };
    }
  };

  const theme = getCategoryTheme(currentLoc.category);

  return (
    <div
      style={{
        position: 'fixed',
        top: '72px',
        right: '24px',
        zIndex: 9999,
        width: '400px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22), 0 2px 8px rgba(15, 23, 42, 0.08)',
        border: '2px solid #0F8B5A',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Banner Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0B2545 0%, #1A3C6E 100%)',
          color: '#FFFFFF',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
            NEW LOCATION MARKED BY MR
          </span>
          {locations.length > 1 && (
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: '600',
              }}
            >
              +{locations.length - 1} more
            </span>
          )}
        </div>
        <button
          onClick={() => onAcknowledge(currentLoc.id)}
          title="Dismiss notification"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Card Content */}
      <div style={{ padding: '14px 16px' }}>
        {/* MR Attribution Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>
            Reported by:
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#0F172A',
              background: '#F1F5F9',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #E2E8F0',
            }}
          >
            {currentLoc.created_by_name || 'Field MR'}
          </span>
        </div>

        {/* Facility Name & Category */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: '700',
                color: '#0F172A',
                lineHeight: '1.3',
              }}
            >
              {currentLoc.name}
            </h3>
            {currentLoc.doctor_name && currentLoc.doctor_name !== currentLoc.name && (
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                {currentLoc.doctor_name}
              </p>
            )}
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {theme.label}
          </span>
        </div>

        {/* Address */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            marginTop: '8px',
            color: '#475569',
            fontSize: '12px',
          }}
        >
          <MapPin size={14} color="#0F8B5A" style={{ marginTop: '2px', flexShrink: 0 }} />
          <span style={{ lineHeight: '1.4' }}>{currentLoc.address}</span>
        </div>

        {/* Coordinates */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            fontSize: '11px',
            color: '#64748B',
            fontFamily: 'monospace',
          }}
        >
          <Navigation size={12} color="#64748B" />
          <span>
            {currentLoc.latitude.toFixed(5)}, {currentLoc.longitude.toFixed(5)}
          </span>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '14px',
            paddingTop: '10px',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <button
            onClick={() => onViewOnMap(currentLoc)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: '#0F8B5A',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 139, 90, 0.25)',
              transition: 'background 0.2s',
            }}
          >
            <Eye size={14} />
            <span>View on Map</span>
          </button>

          <button
            onClick={() => onAcknowledge(currentLoc.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={14} />
            <span>Acknowledge</span>
          </button>

          {locations.length > 1 && (
            <button
              onClick={onAcknowledgeAll}
              style={{
                backgroundColor: 'transparent',
                color: '#64748B',
                border: 'none',
                padding: '8px 6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
