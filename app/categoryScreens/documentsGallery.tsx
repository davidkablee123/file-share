import { openDeviceSettings, requestStoragePermissions } from '../../utils/permissions';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';
import * as safeRfs from '../utils/safeRfs';
import { openManageAllFilesSettings } from '../../utils/permissions';

type DocItem = { path: string; name: string };

let docsCache: DocItem[] = [];
let docsSettingsPromptShown = false;

const DOC_EXTS = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'];

const ANDROID_DOC_DIRS = [
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Downloads',
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [scannedRoots, setScannedRoots] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (docsCache.length > 0) return;
      try {
        if (docsCache.length === 0) setLoading(true);
        setError(null);
        const ok = await requestStoragePermissions();
        console.log('[DocumentsGallery] requestStoragePermissions ->', ok);
        if (!ok) {
          if (isMounted) setError('Storage permission denied. Opening settings…');
          // Prompt the user to grant All-files access (only once per session)
          if (!docsSettingsPromptShown) {
            docsSettingsPromptShown = true;
            try { await openManageAllFilesSettings(); } catch (e) { console.warn('open settings failed', e); }
          }
          return;
        }
        const platformPaths = safeRfs.getPlatformPaths();
        if (!platformPaths.docs && Platform.OS !== 'android') {
          if (isMounted) setError("File system native module isn't available. Install and rebuild the app (react-native-fs).");
          return;
        }
        let roots: string[] = [];
        if (Platform.OS === 'android') {
          const RNFS = safeRfs.getRNFSSync();
          if (RNFS && RNFS.DownloadDirectoryPath) {
            const esd = RNFS.ExternalStorageDirectoryPath || '';
            roots = [
              RNFS.DownloadDirectoryPath,
              esd ? esd + '/Documents' : '',
              esd ? esd + '/Download' : '',
            ].filter(Boolean);
          } else {
            roots = ANDROID_DOC_DIRS;
          }
        } else {
          roots = IOS_DOC_DIRS_PLACEHOLDER.length ? IOS_DOC_DIRS_PLACEHOLDER : [platformPaths.docs].filter(Boolean) as string[];
        }
        if (isMounted) setScannedRoots(roots);
        console.log('[DocumentsGallery] scanning roots:', roots);
        const collected: DocItem[] = [];
        for (const root of roots) {
          try {
            let exists = false;
            try {
              exists = await safeRfs.exists(root);
              console.log('[DocumentsGallery] exists(', root, ') ->', exists);
            } catch (e) {
              console.warn('[DocumentsGallery] exists() failed for', root, e);
              continue;
            }
            if (!exists) continue;
          } catch { continue; }
          try {
            await collectDocsRecursively(root, collected, 3, 400);
          } catch (e) {
            console.warn('[DocumentsGallery] readDir failed for', root, e);
          }
          if (collected.length >= 400) break;
        }
        if (!isMounted) return;
        console.log('[DocumentsGallery] collected files:', collected.length);
        const uniqueMap = new Map<string, DocItem>();
        for (const it of collected) uniqueMap.set(it.path, it);
        const unique = Array.from(uniqueMap.values());
        docsCache = unique;
        setItems(unique);
      } catch (e) {
        if (isMounted) setError('Failed to load documents');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false };
  }, []);

  const openDocument = async (item: DocItem) => {
    setError(null);
    try {
      const RNFS = safeRfs.getRNFSSync();
      // Ensure file exists where possible
      if (RNFS) {
        const exists = await safeRfs.exists(item.path);
        if (!exists) {
          setError('File not found');
          return;
        }
      }

      const uri = item.path.startsWith('file://') ? item.path : 'file://' + item.path;

      const FV = require('react-native-file-viewer');
      if (!FV || typeof FV.open !== 'function') {
        setError('Document viewer native module not available. Install and rebuild react-native-file-viewer.');
        return;
      }

      await FV.open(uri, { showOpenWithDialog: true });
    } catch (e: any) {
      console.error('Failed to open document', e);
      const msg = e?.message || String(e);
      setError('Failed to open document: ' + msg);
    }
  };

  // Load persisted cache (if available) so the gallery shows instantly across restarts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        const raw = await AsyncStorage.getItem('docsCacheV1');
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as DocItem[];
          docsCache = parsed;
          setItems(parsed);
          setLoading(false);
        }
      } catch (e) {
        // ignore: AsyncStorage not available or parse failed
      }
    })();
    return () => { mounted = false };
  }, []);


  const renderItem = ({ item }: { item: DocItem }) => {
    const isSelected = selected[item.path] || false;
    
    return (
      <TouchableOpacity
        style={styles.thumbWrap}
        activeOpacity={0.8}
        onPress={() => {
          if (selectionMode) {
            const newSelected = { ...selected };
            if (isSelected) {
              delete newSelected[item.path];
            } else {
              newSelected[item.path] = true;
            }
            setSelected(newSelected);
          } else {
            openDocument(item);
          }
        }}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            setSelected({ [item.path]: true });
          }
        }}
      >
        <View style={[
          styles.thumb,
          isSelected && { borderWidth: 2, borderColor: '#7d64ca' }
        ]}>
          <Entypo name="text-document" size={34} color="white" />
          {selectionMode && (
            <View style={{
              position: 'absolute',
              top: 5,
              right: 5,
              backgroundColor: isSelected ? '#7d64ca' : 'rgba(255,255,255,0.3)',
              borderRadius: 12,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {isSelected ? (
                <Entypo name="check" size={16} color="white" />
              ) : (
                <View style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: 'rgba(255,255,255,0.5)',
                }} />
              )}
            </View>
          )}
        </View>
        <Text style={{ color: 'white', fontSize: 12, marginTop: 6 }} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

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
        <Entypo name={selectionMode ? "cross" : "chevron-thin-left"} size={20} color="white" />
      </TouchableOpacity>

      {selectionMode && (
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionText}>
            {Object.keys(selected).length} selected
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectionMode(false);
              setSelected({});
            }}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <View style={styles.centerFill}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        items.length === 0 ? (
          <View style={[styles.centerFill, { padding: 16 }]}>
            <Text style={{ color: 'white', marginBottom: 12 }}>No documents found in scanned folders.</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
              If you denied storage permission earlier, open the app settings to grant access. The app will prompt for storage access on first launch.
            </Text>
          </View>
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
        )
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
  actionButton: {
    backgroundColor: '#7d64ca',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  selectionHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 70,
    zIndex: 5,
  },
  selectionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


