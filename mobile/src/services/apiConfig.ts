import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  TOKEN: '@ahtri_auth_token',
  USER: '@ahtri_auth_user',
  SERVER_URL: '@ahtri_custom_server_url',
};

// Default fallback URLs:
// - Physical Android via Wi-Fi / LAN: 10.48.153.83:3000
// - Android Emulator: 10.0.2.2:3000
// - Web / iOS: localhost:3000
const LAN_HOST = '10.48.153.83';
const EMULATOR_HOST = '10.0.2.2';
const DEFAULT_HOST =
  Platform.OS === 'android' ? LAN_HOST : 'localhost';

export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3000`;

export const PRESET_SERVER_URLS = [
  { label: 'LAN Wi-Fi Host', url: `http://${LAN_HOST}:3000`, desc: 'Direct connection to local development server' },
  { label: 'Localhost (3000)', url: 'http://localhost:3000', desc: 'Standard local web and iOS dev port' },
  { label: 'Android Emulator', url: `http://${EMULATOR_HOST}:3000`, desc: 'For Android Studio virtual devices' },
];

export const ApiConfig = {
  async getBaseUrl(): Promise<string> {
    try {
      const customUrl = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
      if (customUrl && customUrl.trim()) {
        return customUrl.trim();
      }
    } catch {
      // Fallback
    }
    return DEFAULT_API_URL;
  },

  async setBaseUrl(url: string): Promise<void> {
    const trimmed = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, trimmed);
  },

  async resetToDefault(): Promise<string> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL);
    return DEFAULT_API_URL;
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  },

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async testConnection(targetUrl?: string): Promise<{ ok: boolean; message: string; data?: any }> {
    const baseUrl = targetUrl ? targetUrl.trim().replace(/\/+$/, '') : await this.getBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          message: `Connected successfully (HTTP ${res.status} OK)`,
          data,
        };
      } else {
        return {
          ok: false,
          message: `Server returned HTTP ${res.status}`,
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          ok: false,
          message: 'Connection timed out after 4 seconds. Ensure phone is on the same Wi-Fi.',
        };
      }
      return {
        ok: false,
        message: err?.message || 'Could not reach server. Verify network and IP.',
      };
    }
  },
};
