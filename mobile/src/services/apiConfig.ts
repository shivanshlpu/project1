import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  TOKEN: '@ahtri_auth_token',
  USER: '@ahtri_auth_user',
  SERVER_URL: '@ahtri_custom_server_url',
};

// Default fallback URLs:
// - Android Emulator: 10.0.2.2 points to host machine
// - Physical Android via Wi-Fi: 192.168.1.42
// - Web / iOS: localhost:3000
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3000`;

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
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, url.trim());
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
};
