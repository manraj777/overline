import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const PROD_URL = 'https://api.overline.in';

export async function resolveApiUrl(): Promise<{ apiBase: string; wsBase: string }> {
  // 1. Check AsyncStorage for explicit override
  const override = await AsyncStorage.getItem('OVERRIDE_API_URL');
  if (override) {
    const ws = override.replace('http://', 'ws://').replace('https://', 'wss://');
    return {
      apiBase: `${override}/api/v1`,
      wsBase: ws,
    };
  }

  // 2. If in dev mode, default to local
  if (__DEV__) {
    return {
      apiBase: `http://${DEV_HOST}:3001/api/v1`,
      wsBase: `ws://${DEV_HOST}:3001`,
    };
  }

  // 3. In release mode, auto-detect if the local development server is reachable on emulator
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1000); // 1-second timeout
    const res = await fetch(`http://${DEV_HOST}:3001/api/v1/shops/cities`, {
      signal: controller.signal,
    });
    clearTimeout(id);
    if (res.status === 200 || res.status === 404 || res.status === 401 || res.status === 500) {
      console.log('Local development backend detected on emulator, dynamic fallback active.');
      return {
        apiBase: `http://${DEV_HOST}:3001/api/v1`,
        wsBase: `ws://${DEV_HOST}:3001`,
      };
    }
  } catch (err) {
    // Local server not running or not reachable, fallback to production
  }

  return {
    apiBase: `${PROD_URL}/api/v1`,
    wsBase: PROD_URL.replace('http://', 'ws://').replace('https://', 'wss://'),
  };
}
