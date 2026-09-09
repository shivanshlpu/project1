import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
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

export interface DownloadProgressPayload {
  percent: number;
  totalBytes: number;
  writtenBytes: number;
  formattedTotal: string;
  formattedWritten: string;
}

export type UpdateProgressCallback = (progress: DownloadProgressPayload) => void;

// Current version installed on this device (matches app.json version)
export const CURRENT_APP_VERSION = '1.0.0';

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
      const timeoutId = setTimeout(() => controller.abort(), 6000);

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
   * Direct In-App APK Download & Native Package Installer
   * 1. Downloads the APK file directly inside the app with real-time progress.
   * 2. Prompts Android's native package installer dialog immediately on completion.
   * 3. No external browser redirect or multi-step manual download needed.
   */
  async downloadAndInstallApk(
    downloadUrl: string,
    onProgress?: UpdateProgressCallback
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!downloadUrl) {
        return { success: false, error: 'No download URL provided' };
      }

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
