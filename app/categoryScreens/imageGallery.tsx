import { openDeviceSettings, requestStoragePermissions } from '../../utils/permissions';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// react-native-fs may not be available during development; require guarded at runtime
import * as safeRfs from '../utils/safeRfs';
import Entypo from 'react-native-vector-icons/Entypo';

type GalleryItem = { path: string; name: string };

// Module-level cache: scan directories only once per app session.
let imagesCache: GalleryItem[] = [];


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

function ImageGallery() {
  const [images, setImages] = useState<GalleryItem[]>(() => imagesCache);
  const [loading, setLoading] = useState(() => imagesCache.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<{[path: string]: boolean}>({});

  const roots = useMemo(() => (
    Platform.OS === 'android' ? ANDROID_IMAGE_DIRS : IOS_IMAGE_DIRS_PLACEHOLDER
  ), []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // only set loading if we truly need to perform an IO scan
        if (imagesCache.length === 0) setLoading(true);
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
        // cache results for subsequent openings during this app session
        imagesCache = collected;
        setImages(collected);
      } catch (e: any) {
        if (isMounted) setError('Failed to load images');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false };
  }, [roots]);

  const renderItem = ({ item }: { item: GalleryItem }) => {
    const isSelected = !!selected[item.path];
    return (
      <TouchableOpacity
        style={styles.thumbWrap}
        activeOpacity={0.8}
        onLongPress={() => {
          setSelectionMode(true);
          setSelected((prev) => ({ ...prev, [item.path]: true }));
        }}
        onPress={() => {
          if (selectionMode) {
            setSelected((prev) => ({ ...prev, [item.path]: !prev[item.path] }));
          } else {
            // Optionally: preview image or do nothing
          }
        }}
      >
        <Image source={{ uri: 'file://' + item.path }} style={[styles.thumb, isSelected && { borderWidth: 3, borderColor: '#7d64ca' }]} resizeMode="cover" />
        {selectionMode && (
          <View style={{position:'absolute',top:10,right:10,backgroundColor:'#fff',borderRadius:12,padding:2}}>
            <Entypo name={isSelected ? 'check' : 'circle'} size={18} color={isSelected ? '#7d64ca' : '#bbb'} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
        onPress={() => {
          if (selectionMode) {
            setSelectionMode(false);
            setSelected({});
          } else {
            navigation.goBack();
          }
        }}
        activeOpacity={0.7}
      >
        <Entypo name={selectionMode ? 'cross' : 'chevron-thin-left'} size={20} color="white" />
      </TouchableOpacity>

      {selectionMode && (
        <View style={{flexDirection:'row',alignItems:'center',padding:10,backgroundColor:'#1a1333'}}>
          <Text style={{color:'#fff',fontWeight:'bold',marginRight:16}}>{Object.values(selected).filter(Boolean).length} selected</Text>
          <TouchableOpacity onPress={() => { setSelectionMode(false); setSelected({}); }} style={{marginRight:12}}>
            <Text style={{color:'#bbb'}}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

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

export default ImageGallery;