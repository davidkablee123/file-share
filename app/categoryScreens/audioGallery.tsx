import { openDeviceSettings, requestStoragePermissions } from '../../utils/permissions';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';
import * as safeRfs from '../utils/safeRfs';
// react-native-sound is a native module; require at runtime and guard
let Sound: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const _s = require('react-native-sound');
    // Some bundlers put the actual constructor on .default
    Sound = _s && _s.default ? _s.default : _s;
} catch (e) {
    Sound = null;
}

type AudioItem = { path: string; name: string };

let audioCache: AudioItem[] = [];

export default function AudioGallery() {
    const navigation = useNavigation();
    const [items, setItems] = useState<AudioItem[]>(() => audioCache);
    const [loading, setLoading] = useState(() => audioCache.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState<{[path: string]: boolean}>({});

    const playerRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (audioCache.length > 0) return; // already loaded
            try {
                setLoading(true);
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
                // Build candidate roots and remove obvious duplicates (e.g. /sdcard and /storage/emulated/0 aliases)
                const potentialRoots = Platform.OS === 'android'
                    ? [
                        '/storage/emulated/0/Music',
                        '/storage/emulated/0/Download',
                        '/sdcard/Music',
                        '/sdcard/Download',
                        '/storage/emulated/0/Podcasts',
                        '/storage/emulated/0/Audiobooks',
                        '/storage/emulated/0/Alarms',
                        '/storage/emulated/0/Notifications',
                        '/storage/emulated/0/Ringtones',
                        '/storage/emulated/0/Android/data'
                    ]
                    : [
                        platformPaths.docs,
                        platformPaths.caches,
                        // bundle may contain media for some apps
                        (platformPaths as any).bundle
                    ].filter(Boolean) as string[];
                // Normalize and deduplicate root paths so we don't scan the same location twice
                const roots = Array.from(new Set(potentialRoots.map(p => (p || '').replace(/\/+$/, '')))).filter(Boolean);
                const collected: AudioItem[] = [];
                // Track seen file paths to avoid adding duplicates coming from multiple roots/aliases
                const seenPaths = new Set<string>();
                for (const root of roots) {
                    try {
                        const exists = await safeRfs.exists(root);
                        if (!exists) continue;
                    } catch { continue; }
                    try {
                        const entries = await safeRfs.readDir(root);
                        for (const e of entries) {
                            if (!e.isDirectory()) {
                                const lower = (e.name || '').toLowerCase();
                                if (lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.wav') || lower.endsWith('.aac')) {
                                    // Normalize path and skip if we've already seen it
                                    const p = (e.path || '').replace(/\/+$/, '');
                                    if (seenPaths.has(p)) continue;
                                    seenPaths.add(p);
                                    collected.push({ path: p, name: e.name });
                                }
                            }
                        }
                    } catch (e) { /* ignore */ }
                    if (collected.length >= 200) break;
                }
                if (!isMounted) return;
                audioCache = collected;
                setItems(collected);
            } catch (e) {
                if (isMounted) setError('Failed to load audio files');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        load();
        return () => {
            isMounted = false;
            // Ensure any playing audio is stopped and released on unmount
            if (playerRef.current) {
                try {
                    if (typeof playerRef.current.stop === 'function') playerRef.current.stop();
                    if (typeof playerRef.current.release === 'function') playerRef.current.release();
                } catch (e) { }
                playerRef.current = null;
            }
        };
    }, []);

    const handlePlay = (item: AudioItem) => {
        if (!Sound) {
            setError("Audio playback native module not available. Install and rebuild react-native-sound.");
            return;
        }
        // stop any existing player
        if (playerRef.current) {
            try {
                if (typeof playerRef.current.stop === 'function') playerRef.current.stop();
                if (typeof playerRef.current.release === 'function') playerRef.current.release();
            } catch (e) { }
            playerRef.current = null;
        }
        // Determine constructor function
        const SoundCtor = typeof Sound === 'function' ? Sound : (Sound && Sound.Sound) ? Sound.Sound : null;
        if (!SoundCtor) {
            setError('Audio native module has unexpected shape; playback unavailable.');
            return;
        }
        // For absolute file paths on Android, pass empty basePath
        try {
            const s = new SoundCtor(item.path, '', (err: any) => {
                if (err) {
                    console.error('Sound error', err);
                    setError('Failed to play audio');
                    return;
                }
                playerRef.current = s;
                s.play((success: boolean) => {
                    if (!success) setError('Playback failed');
                    try { s.release(); } catch { }
                    playerRef.current = null;
                });
            });
        } catch (err) {
            console.error('Failed to construct Sound:', err);
            setError('Playback initialization failed');
        }
    };

    const handleStop = () => {
        if (playerRef.current) {
            try { playerRef.current.stop(); playerRef.current.release(); } catch { }
            playerRef.current = null;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0b0b12' }}>
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
                <View style={{flexDirection:'row',alignItems:'center',padding:10,backgroundColor:'#1a1333'}}>
                    <Text style={{color:'#fff',fontWeight:'bold',marginRight:16}}>{Object.values(selected).filter(Boolean).length} selected</Text>
                    <TouchableOpacity onPress={() => { setSelectionMode(false); setSelected({}); }} style={{marginRight:12}}>
                        <Text style={{color:'#bbb'}}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#7d64ca" />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: 'white' }}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(it) => it.path}
                    renderItem={({ item }) => {
                        const isSelected = !!selected[item.path];
                        return (
                            <TouchableOpacity
                                style={[
                                    { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                                    isSelected && { backgroundColor: 'rgba(125, 100, 202, 0.2)' }
                                ]}
                                onLongPress={() => {
                                    setSelectionMode(true);
                                    setSelected((prev) => ({ ...prev, [item.path]: true }));
                                }}
                                onPress={() => {
                                    if (selectionMode) {
                                        setSelected((prev) => ({ ...prev, [item.path]: !prev[item.path] }));
                                    }
                                }}
                            >
                                <Text style={{ color: 'white', flex: 1 }}>{item.name}</Text>
                                {selectionMode ? (
                                    <View style={{backgroundColor:'#fff',borderRadius:12,padding:2,marginRight:8}}>
                                        <Entypo name={isSelected ? 'check' : 'circle'} size={18} color={isSelected ? '#7d64ca' : '#bbb'} />
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => handlePlay(item)} style={{ padding: 8 }}>
                                            <Text style={{ color: '#7d64ca' }}>Play</Text>
                                        </TouchableOpacity>
                                        <View style={{ width: 8 }} />
                                        <TouchableOpacity onPress={handleStop} style={{ padding: 8 }}>
                                            <Text style={{ color: '#7d64ca' }}>Stop</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    backButton: {
        marginTop: 30,
        marginLeft: 16,
        alignSelf: 'flex-start',
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
});