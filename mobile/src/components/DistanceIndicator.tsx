import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface DistanceIndicatorProps {
  distanceMeters: number;
  maxGeofenceRadiusM?: number; // default 20m
  gpsAccuracyMeters: number;
}

/**
 * Section 5: The "76m away / 12m verified" widget.
 * This is the single most important UI component in the app since it drives the whole geofence flow.
 */
export const DistanceIndicator: React.FC<DistanceIndicatorProps> = ({
  distanceMeters,
  maxGeofenceRadiusM = 20,
  gpsAccuracyMeters,
}) => {
  const isVerified = distanceMeters <= maxGeofenceRadiusM;
  const isGpsPoor = gpsAccuracyMeters > 50;

  return (
    <View
      style={[
        styles.container,
        isVerified ? styles.containerVerified : styles.containerUnverified,
      ]}
    >
      <View style={styles.contentRow}>
        <View
          style={[
            styles.statusPill,
            isVerified ? styles.pillVerified : styles.pillUnverified,
          ]}
        >
          <Text style={styles.pillText}>
            {isVerified ? '✓ ON-SITE VERIFIED' : '○ OUTSIDE GEOFENCE'}
          </Text>
        </View>

        <Text
          style={[
            styles.distanceText,
            isVerified ? styles.textVerified : styles.textUnverified,
          ]}
        >
          {distanceMeters < 1000
            ? `${Math.round(distanceMeters)}m away`
            : `${(distanceMeters / 1000).toFixed(1)}km away`}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.radiusRule}>
          Required Perimeter: ≤ {maxGeofenceRadiusM}m
        </Text>
        <Text
          style={[
            styles.gpsText,
            isGpsPoor ? styles.gpsWarning : styles.gpsNormal,
          ]}
        >
          GPS Fix: ±{Math.round(gpsAccuracyMeters)}m {isGpsPoor ? '(Poor Fix >50m)' : ''}
        </Text>
      </View>

      {!isVerified && (
        <Text style={styles.guidanceText}>
          Please move within {maxGeofenceRadiusM} meters of the doctor's clinic to unlock visit check-in.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1.5,
  },
  containerVerified: {
    backgroundColor: '#E8F5E9',
    borderColor: '#0F8B5A',
  },
  containerUnverified: {
    backgroundColor: '#FFF3E0',
    borderColor: '#F57C00',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pillVerified: {
    backgroundColor: '#0F8B5A',
  },
  pillUnverified: {
    backgroundColor: '#F57C00',
  },
  pillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  distanceText: {
    fontSize: 18,
    fontWeight: '800',
  },
  textVerified: {
    color: '#0F8B5A',
  },
  textUnverified: {
    color: '#C25E00',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusRule: {
    fontSize: 12,
    color: '#555555',
  },
  gpsText: {
    fontSize: 12,
  },
  gpsNormal: {
    color: '#0F8B5A',
  },
  gpsWarning: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  guidanceText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
});
