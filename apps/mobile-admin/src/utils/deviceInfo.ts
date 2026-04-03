import {Platform, Dimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'admin_device_unique_id';

class DeviceInfoHelper {
  private deviceId: string | null = null;

  async initialize() {
    let stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!stored) {
      stored = this.generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, stored);
    }
    this.deviceId = stored;
  }

  getFingerprint(): string {
    if (!this.deviceId) {
      return `${Platform.OS}-${Dimensions.get('window').width}x${Dimensions.get('window').height}`;
    }
    return this.deviceId;
  }

  getDeviceInfo() {
    const {width, height} = Dimensions.get('window');
    return {
      platform: Platform.OS,
      version: Platform.Version,
      screenWidth: width,
      screenHeight: height,
      deviceId: this.deviceId,
    };
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = Math.floor(Math.random() * 16);
        const v = c === 'x' ? r : (r % 4) + 8;
        return v.toString(16);
      },
    );
  }
}

const DeviceInfo = new DeviceInfoHelper();
DeviceInfo.initialize().catch(() => {});

export default DeviceInfo;
