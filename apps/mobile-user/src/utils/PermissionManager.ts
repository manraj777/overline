import { Platform, PermissionsAndroid } from 'react-native';
import { request, check, PERMISSIONS, RESULTS, requestNotifications } from 'react-native-permissions';

export const PermissionManager = {
  requestLocationPermission: async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Overline needs access to your location to find nearby services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  },

  requestCameraPermission: async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Overline needs access to your camera to capture profile photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        return result === RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  },

  requestNotificationPermission: async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // For Android 13+ (API level 33), POST_NOTIFICATIONS is required
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
             title: 'Notification Permission',
             message: 'Overline needs permission to send you booking remidners.',
             buttonNeutral: 'Ask Me Later',
             buttonNegative: 'Cancel',
             buttonPositive: 'OK'
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else if (Platform.OS === 'ios') {
        const { status } = await requestNotifications(['alert', 'sound', 'badge']);
        return status === RESULTS.GRANTED;
      }
      return true; // Auto granted for older Android versions
    } catch (err) {
      console.warn(err);
      return false;
    }
  },

  requestAllRequiredPermissions: async () => {
    await PermissionManager.requestLocationPermission();
    await PermissionManager.requestNotificationPermission();
    await PermissionManager.requestCameraPermission();
  }
};
