/**
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
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
