import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: '@ahtri_auth_token',
  USER: '@ahtri_auth_user',
  SERVER_URL: '@ahtri_custom_server_url',
};

// Permanent Production Render Backend Endpoint
export const DEFAULT_API_URL = 'https://ahtri-backend.onrender.com';

export const PRESET_SERVER_URLS = [
  { label: 'Production Render Server', url: DEFAULT_API_URL, desc: 'Live enterprise cloud API' },
];

export const ApiConfig = {
  async getBaseUrl(): Promise<string> {
    // Locked strictly to Render production server
    return DEFAULT_API_URL;
  },

  async setBaseUrl(_url: string): Promise<void> {
    // Locked: always maintain Render production server
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, DEFAULT_API_URL);
  },

  async resetToDefault(): Promise<string> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL);
    return DEFAULT_API_URL;
  },

  async getToken(): Promise<string | null> {
    try {
      // Clean up legacy local dev IP if previously stored
      await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL);
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
    await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL);
  },

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async testConnection(targetUrl?: string): Promise<{ ok: boolean; message: string; data?: any }> {
    const baseUrl = DEFAULT_API_URL;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

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
          message: 'Connection timed out after 6 seconds.',
        };
      }
      return {
        ok: false,
        message: err?.message || 'Could not reach server.',
      };
    }
  },
};
