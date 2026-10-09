import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: '@ahtri_auth_token',
  USER: '@ahtri_auth_user',
  SERVER_URL: '@ahtri_custom_server_url',
};

// Permanent Production Render Backend Endpoint (overridable via EXPO_PUBLIC_API_URL)
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ahtri-backend.onrender.com';

export const PRESET_SERVER_URLS = [
  { label: 'Production Render Server', url: DEFAULT_API_URL, desc: 'Live enterprise cloud API' },
];

export const ApiConfig = {
  async getBaseUrl(): Promise<string> {
    try {
      if (
        typeof window !== 'undefined' &&
        window.location &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        return 'http://localhost:3000';
      }
      const custom = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
      if (custom) return custom;
    } catch {}
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

  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async getAuthHeaders(overrideUserId?: string): Promise<Record<string, string>> {
    const token = await this.getToken();
    let uid = overrideUserId;
    if (!uid) {
      const u = await this.getUser();
      if (u?.id) uid = u.id;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (uid) {
      headers['x-user-id'] = uid;
    }
    return headers;
  },

  /**
   * Fire a silent background warm-up request to wake up Render container from cold sleep
   */
  warmupServer(): void {
    const baseUrl = DEFAULT_API_URL;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
        .then(() => clearTimeout(timeoutId))
        .catch(() => clearTimeout(timeoutId));
    } catch {
      // Non-blocking fire-and-forget
    }
  },

  /**
   * Resilient fetch helper with automatic retry for Render spin-up tolerance
   */
  async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = 2,
    timeoutMs = 15000
  ): Promise<Response> {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // If Render is waking up and returns 502/503/504, retry after short pause
        if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        if (attempt < maxRetries) {
          // Wait 2s before retry on cold-start abort or connection drop
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
    throw lastError || new Error('Server request failed after retries');
  },

  async testConnection(targetUrl?: string): Promise<{ ok: boolean; message: string; latency?: number; data?: any }> {
    const baseUrl = targetUrl || DEFAULT_API_URL;
    const start = Date.now();

    try {
      // 18-second tolerance for Render free-tier cold starts with retry
      const res = await this.fetchWithRetry(
        `${baseUrl}/health`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
        2,
        18000
      );

      const elapsed = Date.now() - start;

      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          message: `Connected successfully (${elapsed}ms • HTTP ${res.status} OK)`,
          latency: elapsed,
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
          message: 'Connection timed out. Server may be spinning up from sleep.',
        };
      }
      return {
        ok: false,
        message: err?.message || 'Could not reach server.',
      };
    }
  },
};
