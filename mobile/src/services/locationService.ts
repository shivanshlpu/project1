import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
  is_mocked?: boolean;
}

export type AccuracyGrade = 'HIGH' | 'GOOD' | 'MODERATE' | 'COARSE';

// In-memory hot GPS state to prevent cold-start satellite delays
let _latestCoords: LocationCoords | null = null;
let _bestRecentCoords: LocationCoords | null = null;
let _watchSubscription: Location.LocationSubscription | null = null;
const _listeners = new Set<(coords: LocationCoords) => void>();

export const LocationService = {
  /**
   * Request foreground GPS location permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('[LocationService] Permission request failed:', error);
      return false;
    }
  },

  /**
   * Ensure hardware GPS & Google High Accuracy Location services are enabled
   */
  async ensureLocationServices(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // User dismissed or platform doesn't support dialog
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Start continuous active GPS watching with satellite convergence.
   * Keeps phone GPS sensor warm and provides real-time fixes with zero lag.
   */
  async startWatching(onUpdate?: (coords: LocationCoords) => void): Promise<() => void> {
    if (onUpdate) {
      _listeners.add(onUpdate);
      if (_latestCoords) {
        onUpdate(_latestCoords);
      }
    }

    if (!_watchSubscription) {
      try {
        const hasPermission = await this.requestPermissions();
        if (hasPermission) {
          await this.ensureLocationServices();

          _watchSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1500,
              distanceInterval: 1,
            },
            (location) => {
              if (location && location.coords) {
                const isMocked = !!(
                  location.mocked ||
                  (location.coords as any).isMocked ||
                  (location.coords as any).mocked
                );

                const coords: LocationCoords = {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  accuracy: location.coords.accuracy,
                  timestamp: location.timestamp,
                  is_mocked: isMocked,
                };

                _latestCoords = coords;

                // Retain best fix seen in recent memory
                if (
                  !_bestRecentCoords ||
                  (coords.accuracy !== null &&
                    coords.accuracy !== undefined &&
                    (_bestRecentCoords.accuracy === null ||
                      _bestRecentCoords.accuracy === undefined ||
                      coords.accuracy <= _bestRecentCoords.accuracy))
                ) {
                  _bestRecentCoords = coords;
                }

                _listeners.forEach((listener) => {
                  try {
                    listener(coords);
                  } catch (e) {
                    console.warn('[LocationService] Listener error:', e);
                  }
                });
              }
            },
          );
        }
      } catch (err) {
        console.warn('[LocationService] Failed to start active GPS watcher:', err);
      }
    }

    return () => {
      if (onUpdate) {
        _listeners.delete(onUpdate);
      }
      if (_listeners.size === 0 && _watchSubscription) {
        _watchSubscription.remove();
        _watchSubscription = null;
      }
    };
  },

  /**
   * Stop active GPS watching completely
   */
  stopWatching() {
    if (_watchSubscription) {
      _watchSubscription.remove();
      _watchSubscription = null;
    }
    _listeners.clear();
  },

  /**
   * Retrieve high-precision device GPS coordinates with progressive satellite convergence.
   * Eliminates the 100m+ cell tower error by allowing hardware GPS sufficient time to lock satellites.
   */
  async getCurrentLocation(options?: {
    timeoutMs?: number;
    targetAccuracy?: number;
    maxAgeMs?: number;
  }): Promise<LocationCoords | null> {
    const timeoutMs = options?.timeoutMs ?? 12000;
    const targetAccuracy = options?.targetAccuracy ?? 25; // meters
    const maxAgeMs = options?.maxAgeMs ?? 15000; // 15 seconds

    // 1. Fast path: check if warm GPS watcher already holds a fresh, high-precision fix
    const now = Date.now();
    if (_latestCoords && _latestCoords.timestamp && now - _latestCoords.timestamp < maxAgeMs) {
      if (
        _latestCoords.accuracy !== null &&
        _latestCoords.accuracy !== undefined &&
        _latestCoords.accuracy <= targetAccuracy
      ) {
        return _latestCoords;
      }
    }

    if (_bestRecentCoords && _bestRecentCoords.timestamp && now - _bestRecentCoords.timestamp < maxAgeMs) {
      if (
        _bestRecentCoords.accuracy !== null &&
        _bestRecentCoords.accuracy !== undefined &&
        _bestRecentCoords.accuracy <= targetAccuracy
      ) {
        return _bestRecentCoords;
      }
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.ensureLocationServices();

      // 2. High-precision progressive convergence loop:
      // Poll satellite receiver until accuracy reaches target or timeout is reached.
      let bestFix: LocationCoords | null = _latestCoords || _bestRecentCoords || null;

      const convergencePromise = new Promise<LocationCoords | null>(async (resolve) => {
        let isResolved = false;
        let tempWatcher: Location.LocationSubscription | null = null;

        const cleanup = () => {
          if (tempWatcher) {
            tempWatcher.remove();
            tempWatcher = null;
          }
        };

        const timer = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve(bestFix);
          }
        }, timeoutMs);

        try {
          tempWatcher = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 0.5,
            },
            (pos) => {
              if (pos && pos.coords) {
                const isMocked = !!(
                  pos.mocked ||
                  (pos.coords as any).isMocked ||
                  (pos.coords as any).mocked
                );
                const fix: LocationCoords = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  timestamp: pos.timestamp,
                  is_mocked: isMocked,
                };

                _latestCoords = fix;

                if (
                  !bestFix ||
                  (fix.accuracy !== null &&
                    fix.accuracy !== undefined &&
                    (bestFix.accuracy === null ||
                      bestFix.accuracy === undefined ||
                      fix.accuracy <= bestFix.accuracy))
                ) {
                  bestFix = fix;
                  _bestRecentCoords = fix;
                }

                // If accuracy reached target (e.g. <= 25m), resolve immediately!
                if (fix.accuracy !== null && fix.accuracy !== undefined && fix.accuracy <= targetAccuracy) {
                  if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timer);
                    cleanup();
                    resolve(fix);
                  }
                }
              }
            },
          );
        } catch {
          // If watcher fails, fallback to one-shot Highest accuracy
          try {
            const oneShot = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Highest,
            });
            if (oneShot && oneShot.coords) {
              const fix: LocationCoords = {
                latitude: oneShot.coords.latitude,
                longitude: oneShot.coords.longitude,
                accuracy: oneShot.coords.accuracy,
                timestamp: oneShot.timestamp,
                is_mocked: !!(oneShot.mocked || (oneShot.coords as any).isMocked),
              };
              bestFix = fix;
            }
          } catch {}

          if (!isResolved) {
            isResolved = true;
            clearTimeout(timer);
            cleanup();
            resolve(bestFix);
          }
        }
      });

      const result = await convergencePromise;
      if (result) return result;

      // 3. Fallback: High accuracy single position
      const fallbackPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (fallbackPos && fallbackPos.coords) {
        return {
          latitude: fallbackPos.coords.latitude,
          longitude: fallbackPos.coords.longitude,
          accuracy: fallbackPos.coords.accuracy,
          timestamp: fallbackPos.timestamp,
          is_mocked: !!(fallbackPos.mocked || (fallbackPos.coords as any).isMocked),
        };
      }
    } catch (err) {
      console.warn('[LocationService] GPS convergence notice:', err);
    }

    // 4. Last resort: last known recent position if within 5 minutes
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown && lastKnown.coords) {
        const isRecent = Date.now() - (lastKnown.timestamp || 0) < 5 * 60 * 1000;
        if (isRecent) {
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy,
            timestamp: lastKnown.timestamp,
            is_mocked: !!(lastKnown.mocked || (lastKnown.coords as any).isMocked),
          };
        }
      }
    } catch {}

    return _bestRecentCoords || _latestCoords || null;
  },

  /**
   * Determine categorical accuracy rating for UI feedback
   */
  getAccuracyGrade(accuracyMeters?: number | null): {
    grade: AccuracyGrade;
    label: string;
    color: string;
    badgeText: string;
  } {
    const acc = typeof accuracyMeters === 'number' ? accuracyMeters : 999;
    if (acc <= 15) {
      return {
        grade: 'HIGH',
        label: 'High Precision GPS',
        color: '#10B981',
        badgeText: `±${Math.round(acc)}m (Satellite)`,
      };
    }
    if (acc <= 40) {
      return {
        grade: 'GOOD',
        label: 'Good GPS Fix',
        color: '#0EA5E9',
        badgeText: `±${Math.round(acc)}m (Good)`,
      };
    }
    if (acc <= 80) {
      return {
        grade: 'MODERATE',
        label: 'Indoor / Dense Area',
        color: '#F59E0B',
        badgeText: `±${Math.round(acc)}m (Indoor)`,
      };
    }
    return {
      grade: 'COARSE',
      label: 'Weak Signal / Cell Tower',
      color: '#EF4444',
      badgeText: `±${Math.round(acc)}m (Weak)`,
    };
  },

  /**
   * Calculate distance between two coordinates in meters using the Haversine formula
   */
  calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  /**
   * Calculate dynamic effective geofence radius that incorporates sensor accuracy error margin.
   * Solves indoor false-rejections when the user is physically inside a clinic.
   */
  calculateEffectiveGeofence(baseRadiusMeters?: number, accuracyMeters?: number | null): number {
    const base = Math.max(baseRadiusMeters || 50, 100);
    const accBuffer = Math.min(Math.max(accuracyMeters || 10, 0), 120);
    return Math.round(base + accBuffer);
  },

  /**
   * Determine if current position is within designated geofence radius with error margin
   */
  isWithinGeofence(
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number,
    baseRadiusMeters: number,
    accuracyMeters?: number | null,
  ): { isInside: boolean; distanceMeters: number; effectiveRadius: number } {
    const distanceMeters = this.calculateDistanceMeters(
      currentLat,
      currentLon,
      targetLat,
      targetLon,
    );
    const effectiveRadius = this.calculateEffectiveGeofence(baseRadiusMeters, accuracyMeters);
    return {
      isInside: distanceMeters <= effectiveRadius,
      distanceMeters,
      effectiveRadius,
    };
  },
};

