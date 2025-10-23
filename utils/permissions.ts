import { Platform, PermissionsAndroid, Linking, NativeModules } from 'react-native';
const AllFilesNative = NativeModules?.AllFilesPermissionModule;

export const isExternalStorageManager = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !AllFilesNative || typeof AllFilesNative.isExternalStorageManager !== 'function') {
    return true;
  }
  try {
    return await AllFilesNative.isExternalStorageManager();
  } catch {
    return false;
  }
};

export const openManageAllFilesSettings = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !AllFilesNative || typeof AllFilesNative.openManageAllFilesSettings !== 'function') {
    return false;
  }
  try {
    return await AllFilesNative.openManageAllFilesSettings();
  } catch {
    return false;
  }
};

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
      // Try to open the exact All-files page via native module first
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const NativeModule = require('react-native').NativeModules?.AllFilesPermissionModule;
      if (NativeModule && typeof NativeModule.openManageAllFiles === 'function') {
        try { NativeModule.openManageAllFiles(); return; } catch (e) { /* fallthrough */ }
      }
      // If native module missing, silently return per user's instruction
    } catch (error) {
      // silent fail
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

// No-op: user requested alerts be removed completely
export const showPermissionDeniedAlert = (_onOpenSettings: () => void) => {
  // Intentionally empty
};
