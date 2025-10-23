/**
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import React, { useEffect } from 'react';
import { requestStoragePermissions, openManageAllFilesSettings } from './utils/permissions';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './app/index';
import CategoriesScreen from './app/categories/index';
import CategoryDetailScreen from './app/categories/[category]';
import AudioGallery from './app/categoryScreens/audioGallery';
import DocumentsGallery from './app/categoryScreens/documentsGallery';
import ImageGallery from './app/categoryScreens/imageGallery';
import VideoGallery from './app/categoryScreens/videogallery';




const Stack = createStackNavigator();


function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // On first app launch ask for storage/all-files access so the user
  // can grant it before they navigate to the Documents screen. We
  // persist a flag in AsyncStorage so we only prompt once.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // runtime require to avoid a hard dependency if the package
        // isn't installed in some test setups.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        let AsyncStorage: any;
        try {
          AsyncStorage = require('@react-native-async-storage/async-storage');
          // prefer default export if present
          if (AsyncStorage && AsyncStorage.default) AsyncStorage = AsyncStorage.default;
        } catch (_err) {
          AsyncStorage = null;
        }
        const canUseAsync = AsyncStorage && typeof AsyncStorage.getItem === 'function';
        if (canUseAsync) {
          const asked = await AsyncStorage.getItem('askedAllFilesV1');
          if (asked) return;
        }

        // On Android 11+ prefer opening the All-files settings page
        // instead of requesting READ_EXTERNAL_STORAGE which triggers
        // the media permission dialog.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Platform } = require('react-native');
        const ver = Number(Platform.Version) || 0;
        if (Platform.OS === 'android' && ver >= 30) {
          try { await openManageAllFilesSettings(); } catch (e) { /* silent per user */ }
        } else {
          const granted = await requestStoragePermissions();
          if (!granted) {
            try { await openManageAllFilesSettings(); } catch (e) { /* silent per user */ }
          }
        }

        if (canUseAsync) {
          try { await AsyncStorage.setItem('askedAllFilesV1', '1'); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore missing AsyncStorage or other errors
        console.warn('First-launch storage prompt failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="ImageGallery" component={ImageGallery} />
        <Stack.Screen name="VideoGallery" component={VideoGallery} />
        <Stack.Screen name="AudioGallery" component={AudioGallery} />
        <Stack.Screen name="DocumentsGallery" component={DocumentsGallery} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    color: 'red'
  },
});

export default App;
