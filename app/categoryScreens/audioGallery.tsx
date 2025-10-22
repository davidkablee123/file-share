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
    Sound = require('react-native-sound');
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
                        const roots = Platform.OS === 'android'
                            ? ['/storage/emulated/0/Music', '/storage/emulated/0/Download']
                            : [platformPaths.docs].filter(Boolean) as string[];
                const collected: AudioItem[] = [];
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
                                    collected.push({ path: e.path, name: e.name });
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
                        if (!isMounted) setLoading(false);
            }
        };
        load();
        return () => { isMounted = false };
    }, []);

            const handlePlay = (item: AudioItem) => {
                if (!Sound) {
                    setError("Audio playback native module not available. Install and rebuild react-native-sound.");
                    return;
                }
                // stop any existing player
                if (playerRef.current) {
                    try { playerRef.current.stop(); playerRef.current.release(); } catch {}
                    playerRef.current = null;
                }
                // For files on external storage, pass an empty basePath (not MAIN_BUNDLE)
                // Using Sound.MAIN_BUNDLE causes loading to fail for absolute file paths.
                const s = new Sound(item.path, '', (err: any) => {
                    if (err) {
                        console.error('Sound error', err);
                        setError('Failed to play audio');
                        return;
                    }
                    playerRef.current = s;
                    s.play((success: boolean) => {
                        if (!success) setError('Playback failed');
                        try { s.release(); } catch {}
                        playerRef.current = null;
                    });
                });
            };

            const handleStop = () => {
                if (playerRef.current) {
                    try { playerRef.current.stop(); playerRef.current.release(); } catch {}
                    playerRef.current = null;
                }
            };

    return (
        <View style={{ flex: 1, backgroundColor: '#0b0b12' }}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
            >
                <Entypo name="chevron-thin-left" size={20} color="white" />
            </TouchableOpacity>

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
                            renderItem={({ item }) => (
                                <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: 'white', flex: 1 }}>{item.name}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity onPress={() => handlePlay(item)} style={{ padding: 8 }}>
                                            <Text style={{ color: '#7d64ca' }}>Play</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleStop} style={{ padding: 8 }}>
                                            <Text style={{ color: '#7d64ca' }}>Stop</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
});