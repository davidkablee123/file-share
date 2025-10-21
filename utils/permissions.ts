import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

export const requestStoragePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // On iOS, permissions are handled differently (via Info.plist)
  }

  try {
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );

    if (hasPermission) {
      return true;
    }

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'App needs access to your storage to read files.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    return status === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Error requesting storage permission:', err);
    const error = new Error('Storage permission request failed');
    error.name = 'PermissionError';
    (error as any).cause = err;
    throw error;
  }
};

export const openDeviceSettings = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Cannot open settings', error);
    }
  } else {
    // For iOS, open app settings
    await Linking.openURL('app-settings:');
  }
};

export const hasManageAllFilesPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    // On iOS, use the standard storage permission check
    return requestStoragePermissions();
  }

  // For Android, we'll use the standard storage permission check
  // as MANAGE_EXTERNAL_STORAGE is not recommended for most apps
  // and requires special approval on the Play Store
  return requestStoragePermissions();
};

export const showPermissionDeniedAlert = (onOpenSettings: () => void) => {
  Alert.alert(
    'Permission Required',
    'Storage permission is required to access files. Please grant the permission in settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => onOpenSettings() },
    ],
  );
};
