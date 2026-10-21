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

export const CURRENT_APP_VERSION =
  Constants.expoConfig?.version ||
  (Constants as any).manifest2?.extra?.expoClient?.version ||
  '1.0.36';

export const CURRENT_APP_VERSION_CODE =
  Constants.expoConfig?.android?.versionCode ||
  37;

const UPDATE_STORAGE_KEYS = {
  INSTALLED_VERSION: '@ahtri_installed_version',
  LAST_UPDATE_TIME: '@ahtri_last_update_time',
  DOWNLOADED_APK_URL: '@ahtri_downloaded_apk_url',
  DISMISSED_VERSION: '@ahtri_dismissed_version',
};

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

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
  
  async getEffectiveCurrentVersion(): Promise<string> {
    return CURRENT_APP_VERSION;
  },

  
  async markVersionDismissed(version: string): Promise<void> {
    try {
      await AsyncStorage.setItem(UPDATE_STORAGE_KEYS.DISMISSED_VERSION, version);
    } catch {
      // Non-blocking
    }
  },

  
  async isVersionDismissed(version: string): Promise<boolean> {
    try {
      const dismissed = await AsyncStorage.getItem(UPDATE_STORAGE_KEYS.DISMISSED_VERSION);
      return dismissed === version;
    } catch {
      return false;
    }
  },

  
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

  
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const effectiveVersion = CURRENT_APP_VERSION;

    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      
      const res = await ApiConfig.fetchWithRetry(
        `${baseUrl}/api/app/version`,
        { headers: { Accept: 'application/json' } },
        2,
        15000
      );

      if (!res.ok) {
        
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

  
  async evaluateVersion(info: AppVersionInfo, baseVersion?: string): Promise<UpdateCheckResult> {
    const currentVer = baseVersion || CURRENT_APP_VERSION;
    const currentCode = CURRENT_APP_VERSION_CODE;

    
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

  
  async downloadAndInstallApk(
    downloadUrl: string,
    onProgress?: UpdateProgressCallback,
    targetVersion?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!downloadUrl) {
        return { success: false, error: 'No download URL provided' };
      }

      
      await AsyncStorage.setItem(UPDATE_STORAGE_KEYS.LAST_UPDATE_TIME, new Date().toISOString());

      
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

      
      const targetFileName = 'ahtri-ffa-update.apk';
      const fileUri = `${FileSystem.documentDirectory}${targetFileName}`;

      
      const existing = await FileSystem.getInfoAsync(fileUri);
      if (existing.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }

      
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

      
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      if (!fileInfo.exists || ('size' in fileInfo && fileInfo.size < 1000000)) {
        throw new Error('Downloaded APK appears corrupted or truncated. Please retry.');
      }

      
      if (Platform.OS === 'android') {
        const installRes = await this.launchApkInstaller(downloadResult.uri);
        return installRes;
      }

      return { success: true };
    } catch (err: any) {
      console.error('In-app download & install error:', err);
      return { success: false, error: err?.message || 'Could not complete in-app update' };
    }
  },

  
  async launchApkInstaller(fileUri?: string): Promise<{ success: boolean; error?: string }> {
    if (Platform.OS !== 'android') {
      return { success: true };
    }

    try {
      const targetUri = fileUri || `${FileSystem.documentDirectory}ahtri-ffa-update.apk`;
      const fileInfo = await FileSystem.getInfoAsync(targetUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'Update file not found on device. Please download again.' };
      }

      const contentUri = await FileSystem.getContentUriAsync(targetUri);
      
      const flags = 1 | 268435456;

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags,
        type: 'application/vnd.android.package-archive',
      });

      return { success: true };
    } catch (err: any) {
      console.warn('[launchApkInstaller] Failed to open installer intent:', err);
      return {
        success: false,
        error: err?.message || 'Android package installer could not be launched automatically.',
      };
    }
  },

  
  async openInstallUnknownSourcesSettings(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
        data: 'package:com.ahtri.ffa',
      });
    } catch {
      try {
        await IntentLauncher.startActivityAsync('android.settings.APPLICATION_DETAILS_SETTINGS', {
          data: 'package:com.ahtri.ffa',
        });
      } catch (err) {
        console.warn('Could not open app settings:', err);
      }
    }
  },

  
  async openBrowserDownload(downloadUrl: string): Promise<boolean> {
    try {
      await Linking.openURL(downloadUrl);
      return true;
    } catch (err) {
      console.error('Browser download fallback failed:', err);
      return false;
    }
  },

  
  async startUpdate(downloadUrl: string): Promise<boolean> {
    const res = await this.downloadAndInstallApk(downloadUrl);
    return res.success;
  },
};

