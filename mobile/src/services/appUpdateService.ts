import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
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
  isActive?: boolean;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isMandatory: boolean;
  currentVersion: string;
  info?: AppVersionInfo;
  error?: string;
}

export interface DownloadProgressPayload {
  percent: number;
  totalBytes: number;
  writtenBytes: number;
  formattedTotal: string;
  formattedWritten: string;
}

export type UpdateProgressCallback = (progress: DownloadProgressPayload) => void;

// Current version and versionCode installed on this device (read dynamically from manifest or fallback to 1.0.5 / 5)
export const CURRENT_APP_VERSION =
  Constants.expoConfig?.version ||
  (Constants as any).manifest2?.extra?.expoClient?.version ||
  '1.0.5';

export const CURRENT_APP_VERSION_CODE =
  Constants.expoConfig?.android?.versionCode ||
  5;

const UPDATE_STORAGE_KEYS = {
  INSTALLED_VERSION: '@ahtri_installed_version',
  LAST_UPDATE_TIME: '@ahtri_last_update_time',
  DOWNLOADED_APK_URL: '@ahtri_downloaded_apk_url',
  DISMISSED_VERSION: '@ahtri_dismissed_version',
};

/**
 * Format bytes to readable MB / KB
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/**
 * Compare two semver strings like "1.0.1" vs "1.0.0".
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareSemVer(v1: string, v2: string): number {
  const p1 = (v1 || '0').replace(/[^0-9.]/g, '').split('.').map((x) => parseInt(x, 10) || 0);
  const p2 = (v2 || '0').replace(/[^0-9.]/g, '').split('.').map((x) => parseInt(x, 10) || 0);
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
   * Get effective version of the installed app
   */
  async getEffectiveCurrentVersion(): Promise<string> {
    return CURRENT_APP_VERSION;
  },

  /**
   * Mark a version as dismissed by user so they are not nagged again
   */
  async markVersionDismissed(version: string): Promise<void> {
    try {
      await AsyncStorage.setItem(UPDATE_STORAGE_KEYS.DISMISSED_VERSION, version);
    } catch {
      // Non-blocking
    }
  },

  /**
   * Check if a specific version was dismissed by the user
   */
  async isVersionDismissed(version: string): Promise<boolean> {
    try {
      const dismissed = await AsyncStorage.getItem(UPDATE_STORAGE_KEYS.DISMISSED_VERSION);
      return dismissed === version;
    } catch {
      return false;
    }
  },

  /**
   * Clear any legacy suppression keys
   */
  async clearSuppressionCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        UPDATE_STORAGE_KEYS.INSTALLED_VERSION,
        UPDATE_STORAGE_KEYS.DOWNLOADED_APK_URL,
      ]);
    } catch {
      // Non-blocking
    }
  },

  /**
   * Check backend for newer application versions
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const effectiveVersion = CURRENT_APP_VERSION;

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      // Resilient fetch with automatic retries for Render wake-up tolerance
      const res = await ApiConfig.fetchWithRetry(
        `${baseUrl}/api/app/version`,
        { headers: { Accept: 'application/json' } },
        2,
        15000
      );

      if (!res.ok) {
        // Fallback to /app/version
        const resFallback = await fetch(`${baseUrl}/app/version`, {
          headers: { Accept: 'application/json' },
        });
        if (!resFallback.ok) {
          return {
            hasUpdate: false,
            isMandatory: false,
            currentVersion: effectiveVersion,
            error: `Server returned HTTP ${resFallback.status}`,
          };
        }
        const data: AppVersionInfo = await resFallback.json();
        return await this.evaluateVersion(data, effectiveVersion);
      }

      const data: AppVersionInfo = await res.json();
      return await this.evaluateVersion(data, effectiveVersion);
    } catch (err: any) {
      return {
        hasUpdate: false,
        isMandatory: false,
        currentVersion: effectiveVersion,
        error: err?.message || 'Could not reach update server',
      };
    }
  },

  /**
   * Evaluate whether the returned version is newer than installed
   */
  async evaluateVersion(info: AppVersionInfo, baseVersion?: string): Promise<UpdateCheckResult> {
    const currentVer = baseVersion || CURRENT_APP_VERSION;
    const currentCode = CURRENT_APP_VERSION_CODE;

    // If update broadcast is paused or deactivated by admin, suppress update prompts
    if (info.isActive === false || !info.downloadUrl) {
      return {
        hasUpdate: false,
        isMandatory: false,
        currentVersion: currentVer,
        info,
      };
    }

    const isNewerSemVer = compareSemVer(info.latestVersion, currentVer) > 0;
    const isNewerCode = (info.latestVersionCode || 0) > currentCode;
    const isTrulyNewer = isNewerSemVer || isNewerCode;

    // If user is ALREADY on the same or newer version, NEVER trigger update!
    if (!isTrulyNewer) {
      return {
        hasUpdate: false,
        isMandatory: false,
        currentVersion: currentVer,
        info,
      };
    }

    const isBelowMinimum = compareSemVer(currentVer, info.minimumVersion) < 0;
    const isMandatory = !!info.forceUpdate || isBelowMinimum;

    return {
      hasUpdate: true,
      isMandatory,
      currentVersion: currentVer,
      info,
    };
  },

  /**
   * Direct In-App APK Download & Native Package Installer
   * 1. Downloads the APK file directly inside the app with real-time progress.
   * 2. Prompts Android's native package installer dialog immediately on completion.
   * 3. No external browser redirect or multi-step manual download needed.
   */
  async downloadAndInstallApk(
    downloadUrl: string,
    onProgress?: UpdateProgressCallback,
    targetVersion?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!downloadUrl) {
        return { success: false, error: 'No download URL provided' };
      }

      // Record download timestamp
      await AsyncStorage.setItem(UPDATE_STORAGE_KEYS.LAST_UPDATE_TIME, new Date().toISOString());

      // Web Fallback: direct file download trigger (no external navigation)
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'ahtri-ffa-mobile.apk';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true };
      }

      // Native Android / iOS: In-App Download via FileSystem
      const targetFileName = 'ahtri-ffa-update.apk';
      const fileUri = `${FileSystem.cacheDirectory}${targetFileName}`;

      // Clean up previous temporary update file if exists
      const existing = await FileSystem.getInfoAsync(fileUri);
      if (existing.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }

      // Resumable background-safe downloader with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const total = downloadProgress.totalBytesExpectedToWrite;
          const written = downloadProgress.totalBytesWritten;
          const percent = total > 0 ? Math.min(100, Math.round((written / total) * 100)) : 0;
          if (onProgress) {
            onProgress({
              percent,
              totalBytes: total,
              writtenBytes: written,
              formattedTotal: formatBytes(total),
              formattedWritten: formatBytes(written),
            });
          }
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (!downloadResult || !downloadResult.uri) {
        throw new Error('Download failed to produce a valid APK file.');
      }

      // Immediately launch Android OS Native Package Installer
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'application/vnd.android.package-archive',
        });
        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      console.error('In-app download & install error:', err);
      try {
        await Linking.openURL(downloadUrl);
        return { success: true };
      } catch (fallbackErr: any) {
        return { success: false, error: err?.message || 'Could not complete in-app update' };
      }
    }
  },

  /**
   * Legacy simple launcher
   */
  async startUpdate(downloadUrl: string): Promise<boolean> {
    const res = await this.downloadAndInstallApk(downloadUrl);
    return res.success;
  },
};
