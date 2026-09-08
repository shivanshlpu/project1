import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = '@ahtri_device_installation_id';

export interface DeviceHardwareProfile {
  deviceId: string;
  brand: string;
  modelName: string;
  osName: string;
  osVersion: string;
  isPhysicalPhone: boolean;
  summary: string;
}

export const DeviceBindingService = {
  /**
   * Retrieve or create a persistent unique hardware ID for this phone
   */
  async getUniqueDeviceId(): Promise<string> {
    try {
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = `dev-${(Device.brand || 'gen').toLowerCase()}-${uuidv4().slice(0, 8)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return 'dev-fallback-unknown';
    }
  },

  /**
   * Retrieve complete device profile for bank-grade binding verification
   */
  async getDeviceProfile(): Promise<DeviceHardwareProfile> {
    const deviceId = await this.getUniqueDeviceId();
    const brand = Device.brand || 'Android';
    const modelName = Device.modelName || 'Device';
    const osName = Device.osName || 'Android';
    const osVersion = Device.osVersion || '14';
    const isPhysicalPhone = Device.isDevice;

    return {
      deviceId,
      brand,
      modelName,
      osName,
      osVersion,
      isPhysicalPhone,
      summary: `${brand} ${modelName} (${osName} ${osVersion})`,
    };
  },
};
