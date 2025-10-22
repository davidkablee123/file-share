import { openDeviceSettings, requestStoragePermissions } from '../../utils/permissions';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';
import * as safeRfs from '../utils/safeRfs';
let FileViewer: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileViewer = require('react-native-file-viewer');
} catch (e) {
  FileViewer = null;
}

type DocItem = { path: string; name: string };

let docsCache: DocItem[] = [];

const DOC_EXTS = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'];

const ANDROID_DOC_DIRS = [
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Documents',
  '/storage/emulated/0/Telegram/Telegram Documents',
];
const IOS_DOC_DIRS_PLACEHOLDER: string[] = [];

export default function DocumentsGallery() {
  const navigation = useNavigation();
  const [items, setItems] = useState<DocItem[]>(() => docsCache);
  const [loading, setLoading] = useState(() => docsCache.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (docsCache.length > 0) return;
      try {
        if (docsCache.length === 0) setLoading(true);
        setError(null);
        const ok = await requestStoragePermissions();
        if (!ok) {
          if (isMounted) setError('Storage permission denied.');
          openDeviceSettings();
          return;
        }
        const platformPaths = safeRfs.getPlatformPaths();
        if (!platformPaths.docs && Platform.OS !== 'android') {
          if (isMounted) setError("File system native module isn't available. Install and rebuild the app (react-native-fs).");
          return;
        }
        const roots = Platform.OS === 'android'
          ? ANDROID_DOC_DIRS
          : IOS_DOC_DIRS_PLACEHOLDER.length ? IOS_DOC_DIRS_PLACEHOLDER : [platformPaths.docs].filter(Boolean) as string[];
        if (isMounted) setScannedRoots(roots);
        const collected: DocItem[] = [];
        for (const root of roots) {
          try {
            const exists = await safeRfs.exists(root);
            if (!exists) continue;
          } catch { continue; }
          await collectDocsRecursively(root, collected, 3, 400);
          if (collected.length >= 400) break;
        }
        if (!isMounted) return;
        docsCache = collected;
        setItems(collected);
      } catch (e) {
        if (isMounted) setError('Failed to load documents');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false };
  }, []);

  const [scannedRoots, setScannedRoots] = useState<string[]>([]);

  const renderItem = ({ item }: { item: DocItem }) => (
    <TouchableOpacity
      style={styles.thumbWrap}
      activeOpacity={0.8}
      onPress={async () => {
        if (!FileViewer) {
          setError('Document viewer module not available. Install and rebuild react-native-file-viewer.');
          return;
        }
        try {
          await FileViewer.open(item.path);
        } catch (e) {
          console.error('Failed to open document', e);
          setError('Failed to open document');
        }
      }}
    >
      <View style={styles.thumb}>
        <Entypo name="text-document" size={34} color="white" />
      </View>
      <Text style={{ color: 'white', fontSize: 12, marginTop: 6 }} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

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
          <Text style={styles.loadingText}>Loading documents…</Text>
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

      {/* show concise scanned roots + count */}
      <View style={{ paddingTop: 64, paddingHorizontal: 12 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Scanned: {scannedRoots.length ? scannedRoots.join(', ') : '—'}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>{items.length} files</Text>
      </View>

      {error ? (
        <View style={styles.centerFill}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={items}
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

async function collectDocsRecursively(
  dir: string,
  out: DocItem[],
  depth: number,
  cap: number,
) {
  if (depth < 0 || out.length >= cap) return;
  try {
    const entries = await safeRfs.readDir(dir);
    for (const entry of entries) {
      if (out.length >= cap) break;
      if (entry.isDirectory()) {
        const name = entry.name || '';
        if (name.startsWith('.')) continue;
        await collectDocsRecursively(entry.path, out, depth - 1, cap);
      } else {
        const lower = (entry.name || '').toLowerCase();
        const ext = lower.split('.').pop();
        if (ext && DOC_EXTS.includes(ext)) {
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
    alignItems: 'center',
  },
  thumb: {
    flex: 1,
    width: '100%',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


