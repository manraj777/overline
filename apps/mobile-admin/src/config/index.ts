import { Platform } from 'react-native';

const DEV_HOST = (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const PROD_URL = 'https://overlinebackend-production.up.railway.app';

export const Config = {
  API_URL: __DEV__ ? `http://${DEV_HOST}:3001` : PROD_URL,
  API_PREFIX: '/api/v1',
  APP_VERSION: '1.0.0-admin',
  FEATURES: {
    GOOGLE_AUTH_ENABLED: true,
  },
  GOOGLE: {
    WEB_CLIENT_ID: '409423359805-5istogdcdj476ff3816m28g7qkc622bc.apps.googleusercontent.com',
    OFFLINE_ACCESS: false,
  },
};
