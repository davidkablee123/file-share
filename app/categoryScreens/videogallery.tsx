import { openDeviceSettings, requestStoragePermissions } from '../../utils/permissions';
import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import * as safeRfs from '../utils/safeRfs';


import Entypo from 'react-native-vector-icons/Entypo';
// Load expo-av and expo-video-thumbnails dynamically so the project
// can compile/run without those optional Expo packages. If they're
// not available, we'll fall back to a simple message.
let Video: any = null;
let ResizeMode: any = null;
let VideoThumbnails: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _av = require('expo-av');
  Video = _av?.Video;
  ResizeMode = _av?.ResizeMode;
} catch (e) {
  // module not available
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  VideoThumbnails = require('expo-video-thumbnails');
} catch (e) {
  // module not available
}

type VideoItem = {
  path: string;
  name: string;
  thumbnail?: string | null;
};

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_GAP = 8;
const ITEM_SIZE = (width - (NUM_COLUMNS + 1) * ITEM_GAP) / NUM_COLUMNS;

const ANDROID_VIDEO_DIRS = [
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/Movies',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Video',
  '/storage/emulated/0/Telegram/Telegram Video',
];

// Avoid reading RNFS.* paths at module-eval time (RNFS native may be null).
const IOS_VIDEO_DIRS_PLACEHOLDER: string[] = [];
const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', '3gp', 'webm'];

export default function VideoGallery() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const roots = Platform.OS === 'android' ? ANDROID_VIDEO_DIRS : IOS_VIDEO_DIRS_PLACEHOLDER;

  useEffect(() => {
    let isMounted = true;
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const hasPermission = await requestStoragePermissions();
        if (!hasPermission) {
          if (isMounted) setError('Storage permission denied. Please grant access to view videos.');
          openDeviceSettings();
          return;
        }
        // ensure native RNFS is available at runtime
        const platformPaths = safeRfs.getPlatformPaths();
        if (!platformPaths.docs && Platform.OS !== 'android') {
          if (isMounted) setError("File system native module isn't available. Install and rebuild the app (react-native-fs).");
          return;
        }
        const platformRoots = Platform.OS === 'android' ? ANDROID_VIDEO_DIRS : [platformPaths.docs, platformPaths.caches].filter(Boolean) as string[];
        const collected: VideoItem[] = [];
        for (const root of platformRoots) {
          try {
            try {
              const exists = await safeRfs.exists(root);
              if (!exists) continue;
            } catch (e) {
              continue;
            }
          } catch (e) {
            // skip inaccessible roots
            continue;
          }
          await collectVideosRecursively(root, collected, 3, 100);
          if (collected.length >= 100) break;
        }
        for (const vid of collected) {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(vid.path, { time: 1000 });
            vid.thumbnail = uri;
          } catch {
            vid.thumbnail = null;
          }
        }
        if (isMounted) setVideos(collected);
      } catch (err) {
        console.error('Error loading videos:', err);
        if (isMounted) setError('Failed to load videos. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadVideos();
    return () => {
      isMounted = false;
    };
  }, []);

  const collectVideosRecursively = async (
    dir: string,
    out: VideoItem[],
    depth: number,
    cap: number
  ) => {
    if (out.length >= cap || depth < 0) return;
    try {
  const items = await safeRfs.readDir(dir);
      for (const item of items) {
        if (out.length >= cap) break;
        if (item.isDirectory()) {
          await collectVideosRecursively(item.path, out, depth - 1, cap);
        } else {
          const ext = item.name.split('.').pop()?.toLowerCase();
          if (ext && VIDEO_EXTS.includes(ext)) {
            out.push({
              path: item.path,
              name: item.name,
              thumbnail: null,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Error reading directory ${dir}:`, err);
    }
  };

  const VideoCard = React.memo(
    ({
      item,
      isCurrent,
      onPress,
    }: {
      item: VideoItem;
      isCurrent: boolean;
      onPress: () => void;
    }) => {
  const videoRef = useRef<any>(null);
      const [playbackError, setPlaybackError] = useState<string | null>(null);

      useEffect(() => {
        return () => {
          if (videoRef.current) {
            videoRef.current.pauseAsync().catch(console.warn);
          }
        };
      }, []);

      const handleError = (error: { error: { message?: string } } | string) => {
        const message =
          typeof error === 'string' ? error : error?.error?.message || 'Unknown error';
        console.error('Video playback error:', message);
        setPlaybackError('Error loading video');
      };

      return (
        <TouchableOpacity style={styles.videoContainer} onPress={onPress} activeOpacity={0.8}>
          {isCurrent ? (
            <View style={styles.videoWrapper}>
              {playbackError ? (
                <View
                  style={[
                    styles.video,
                    { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
                  ]}
                >
                  <Text style={{ color: 'white' }}>{playbackError}</Text>
                </View>
              ) : (
                <Video
                  ref={videoRef}
                  source={{ uri: item.path }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  shouldPlay={isCurrent}
                  onError={handleError}
                  onLoadStart={() => setPlaybackError(null)}
                />
              )}
            </View>
              ) : (
            <View style={styles.thumbnailContainer}>
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} />
              ) : (
                <View style={[styles.thumbnailImage, { backgroundColor: '#1a1a2e' }]} />
              )}
              <View style={styles.playOverlay}>
                <Entypo name="controller-play" size={28} color="white" />
              </View>
              <Text style={styles.videoName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7d64ca" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If expo-av isn't available, show a friendly fallback UI.
  if (!Video) {
    return (
      <View style={[styles.loadingContainer, { padding: 20 }]}> 
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Video playback is not available because the optional native module is not installed.
          To enable it, install 'expo-av' or replace this screen with a native player.
        </Text>
      </View>
    );
  }

  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Entypo name="chevron-left" size={32} color="white" />
      </TouchableOpacity>

      <FlatList
        data={videos}
        renderItem={({ item }) => (
          <VideoCard
            item={item}
            isCurrent={currentVideo === item.path}
            onPress={() => setCurrentVideo(item.path === currentVideo ? null : item.path)}
          />
        )}
        keyExtractor={(item) => item.path}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={[styles.listContent, { padding: ITEM_GAP }]}
        columnWrapperStyle={{ gap: ITEM_GAP }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b12',
    paddingTop: 60,
  },
  listContent: {
    gap: ITEM_GAP,
  },
  videoContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginBottom: ITEM_GAP,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    position: 'absolute',
    marginTop: 30,
    top: 20,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
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
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  thumbnailContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    padding: 6,
  },
  videoName: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b12',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0b0b12',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#7d64ca',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
