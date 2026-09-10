import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
}

export const LocationService = {
  /**
   * Request foreground GPS location permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('Location permission request failed:', error);
      return false;
    }
  },

  /**
   * Ensure hardware GPS & Google Network Location services are enabled
   */
  async ensureLocationServices(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // Ignore if user dismisses or platform unsupported
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Retrieve current device GPS coordinates with indoor fallback
   */
  async getCurrentLocation(): Promise<LocationCoords | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      await this.ensureLocationServices();

      // 1. First attempt: High-accuracy GPS with 6s timeout race
      const highAccuracyPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 6000)
      );

      const highResult = await Promise.race([highAccuracyPromise, timeoutPromise]);
      if (highResult && highResult.coords) {
        return {
          latitude: highResult.coords.latitude,
          longitude: highResult.coords.longitude,
          accuracy: highResult.coords.accuracy,
          timestamp: highResult.timestamp,
        };
      }

      // 2. Second attempt: Balanced indoor accuracy (Google Fused Provider using Wi-Fi + Cell towers)
      const balancedResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (balancedResult && balancedResult.coords) {
        return {
          latitude: balancedResult.coords.latitude,
          longitude: balancedResult.coords.longitude,
          accuracy: balancedResult.coords.accuracy,
          timestamp: balancedResult.timestamp,
        };
      }
    } catch (error) {
      console.warn('Current GPS location retrieval fallback:', error);
    }

    // 3. Fallback: Last known recent position (within 10 minutes)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown && lastKnown.coords) {
        const isRecent = Date.now() - (lastKnown.timestamp || 0) < 10 * 60 * 1000;
        if (isRecent) {
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy,
            timestamp: lastKnown.timestamp,
          };
        }
      }
    } catch {
      // Fallback exhausted
    }

    return null;
  },

  /**
   * Calculate distance between two coordinates in meters using the Haversine formula
   */
  calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  /**
   * Determine if current position is within designated geofence radius
   */
  isWithinGeofence(
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number,
    radiusMeters: number
  ): { isInside: boolean; distanceMeters: number } {
    const distanceMeters = this.calculateDistanceMeters(
      currentLat,
      currentLon,
      targetLat,
      targetLon
    );
    return {
      isInside: distanceMeters <= radiusMeters,
      distanceMeters,
    };
  },
};
