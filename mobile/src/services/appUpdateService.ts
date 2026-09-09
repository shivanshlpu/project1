import { Linking, Platform } from 'react-native';
import { ApiConfig } from './apiConfig';

export interface AppVersionInfo {
  appName: string;
  packageName: string;
  latestVersion: string;
  latestVersionCode: number;
  minimumVersion: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseDate?: string;
  releaseNotes: string[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isMandatory: boolean;
  currentVersion: string;
  info?: AppVersionInfo;
  error?: string;
}

// Current version installed on this device (matches app.json version)
export const CURRENT_APP_VERSION = '1.0.0';

/**
 * Compare two semver strings like "1.0.1" vs "1.0.0".
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
function compareSemVer(v1: string, v2: string): number {
  const p1 = v1.replace(/[^0-9.]/g, '').split('.').map((x) => parseInt(x, 10) || 0);
  const p2 = v2.replace(/[^0-9.]/g, '').split('.').map((x) => parseInt(x, 10) || 0);
  const maxLen = Math.max(p1.length, p2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export const AppUpdateService = {
  /**
   * Check backend for newer application versions
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${baseUrl}/api/app/version`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Fallback to /app/version
        const resFallback = await fetch(`${baseUrl}/app/version`, {
          headers: { Accept: 'application/json' },
        });
        if (!resFallback.ok) {
          return {
            hasUpdate: false,
            isMandatory: false,
            currentVersion: CURRENT_APP_VERSION,
            error: `Server returned HTTP ${resFallback.status}`,
          };
        }
        const data: AppVersionInfo = await resFallback.json();
        return this.evaluateVersion(data);
      }

      const data: AppVersionInfo = await res.json();
      return this.evaluateVersion(data);
    } catch (err: any) {
      return {
        hasUpdate: false,
        isMandatory: false,
        currentVersion: CURRENT_APP_VERSION,
        error: err?.message || 'Could not reach update server',
      };
    }
  },

  /**
   * Evaluate whether the returned version is newer than installed
   */
  evaluateVersion(info: AppVersionInfo): UpdateCheckResult {
    const isNewer = compareSemVer(info.latestVersion, CURRENT_APP_VERSION) > 0;
    const isBelowMinimum = compareSemVer(CURRENT_APP_VERSION, info.minimumVersion) < 0;
    const isMandatory = info.forceUpdate || isBelowMinimum;

    return {
      hasUpdate: isNewer,
      isMandatory,
      currentVersion: CURRENT_APP_VERSION,
      info,
    };
  },

  /**
   * Trigger direct APK download / browser package install
   * Android Package Installer seamlessly updates the app without losing data or requiring manual uninstallation.
   */
  async startUpdate(downloadUrl: string): Promise<boolean> {
    try {
      if (!downloadUrl) return false;
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
        return true;
      } else {
        await Linking.openURL(downloadUrl);
        return true;
      }
    } catch (err) {
      console.error('Failed to open update URL:', err);
      return false;
    }
  },
};
