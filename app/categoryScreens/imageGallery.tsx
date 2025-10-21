import { openDeviceSettings, requestStoragePermissions } from '../../utils/permissions';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// react-native-fs may not be available during development; require guarded at runtime
import * as safeRfs from '../utils/safeRfs';
import Entypo from 'react-native-vector-icons/Entypo';

type GalleryItem = { path: string; name: string };

const ANDROID_IMAGE_DIRS = [
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/Pictures',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Images',
  '/storage/emulated/0/Telegram/Telegram Images',
];

// Don't read RNFS.* fields at module-eval time (native module might be null)
const IOS_IMAGE_DIRS_PLACEHOLDER: string[] = [];

const IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','heic','heif'];

export default function ImageGallery() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roots = useMemo(() => (
    Platform.OS === 'android' ? ANDROID_IMAGE_DIRS : IOS_IMAGE_DIRS_PLACEHOLDER
  ), []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const hasPermission = await requestStoragePermissions();
        if (!hasPermission) {
          if (isMounted) setError('Storage permission denied. Please grant access to view images.');
          // Optionally, prompt to open settings
          openDeviceSettings();
          return;
        }
        const platformPaths = safeRfs.getPlatformPaths();
        if (!platformPaths.docs && Platform.OS !== 'android') {
          if (isMounted) setError("File system native module isn't available. Install and rebuild the app (react-native-fs).");
          return;
        }
        const platformRoots = Platform.OS === 'android' ? ANDROID_IMAGE_DIRS : [platformPaths.pictures || platformPaths.docs].filter(Boolean) as string[];
        const collected: GalleryItem[] = [];
        for (const root of platformRoots) {
          try {
            const exists = await safeRfs.exists(root);
            if (!exists) continue;
          } catch (e) {
            continue;
          }
          await collectImagesRecursively(root, collected, 3, 800); // depth 3, cap 800 files
          if (collected.length >= 800) break;
        }
        if (!isMounted) return;
        // Newest first by filename mtime when possible (we didn't stat for perf). Keep as-is.
        setImages(collected);
      } catch (e: any) {
        if (isMounted) setError('Failed to load images');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false };
  }, [roots]);

  const renderItem = ({ item }: { item: GalleryItem }) => (
    <TouchableOpacity style={styles.thumbWrap} activeOpacity={0.8}>
      <Image source={{ uri: 'file://' + item.path }} style={styles.thumb} resizeMode="cover" />
    </TouchableOpacity>
  );

  const navigation = useNavigation();

  if (loading) {
    return (
      <View style={styles.container}> 
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Entypo name="chevron-thin-left" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#7d64ca" />
          <Text style={styles.loadingText}>Loading images…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Entypo name="chevron-thin-left" size={20} color="white" />
      </TouchableOpacity>

      {error ? (
        <View style={styles.centerFill}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(it) => it.path}
          numColumns={3}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          initialNumToRender={24}
          windowSize={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

async function collectImagesRecursively(
  dir: string,
  out: GalleryItem[],
  depth: number,
  cap: number,
) {
  if (depth < 0 || out.length >= cap) return;
  try {
  const entries = await safeRfs.readDir(dir);
    for (const entry of entries) {
      if (out.length >= cap) break;
      if (entry.isDirectory()) {
        // Skip hidden/system folders to reduce load
        const name = entry.name || '';
        if (name.startsWith('.')) continue;
        await collectImagesRecursively(entry.path, out, depth - 1, cap);
      } else {
        const lower = (entry.name || '').toLowerCase();
        const ext = lower.split('.').pop();
        if (ext && IMAGE_EXTS.includes(ext)) {
          out.push({ path: entry.path, name: entry.name || entry.path });
        }
      }
    }
  } catch (e) {
    // ignore folder read errors
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b12',
  },
  backButton: {
    position: 'absolute',
    marginTop: 30,
    top: 20, left: 16, zIndex: 10, width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(125, 100, 202, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(125, 100, 202, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7d64ca',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
  },
  errorText: {
    color: '#ff6b6b',
  },
  grid: {
    paddingTop: 80, // leave space for back button
    paddingHorizontal: 6,
  },
  thumbWrap: {
    width: '33.3333%',
    aspectRatio: 1,
    padding: 6,
  },
  thumb: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
})