// Small runtime-safe wrapper around react-native-fs that avoids requiring
// the native module at module-eval time. Each wrapper function attempts
// to require the package and throws a controlled error if the native
// module isn't available.

export function getRNFSSync(): any | null {
  try {
    // require on demand so Metro can load the bundle even if native
    // module isn't linked during development.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // @ts-ignore
    const RNFS = require('react-native-fs');
    return RNFS;
  } catch (e) {
    return null;
  }
}

export async function exists(path: string): Promise<boolean> {
  const rnfs = getRNFSSync();
  if (!rnfs) throw new Error('RNFS_NOT_AVAILABLE');
  return rnfs.exists(path);
}

export async function readDir(path: string): Promise<any[]> {
  const rnfs = getRNFSSync();
  if (!rnfs) throw new Error('RNFS_NOT_AVAILABLE');
  return rnfs.readDir(path);
}

export async function stat(path: string): Promise<any> {
  const rnfs = getRNFSSync();
  if (!rnfs) throw new Error('RNFS_NOT_AVAILABLE');
  return rnfs.stat(path);
}

export function getPlatformPaths(): { pictures?: string; docs?: string; caches?: string } {
  const rnfs = getRNFSSync();
  if (!rnfs) return {};
  return {
    pictures: rnfs.PicturesDirectoryPath,
    docs: rnfs.DocumentDirectoryPath,
    caches: rnfs.CachesDirectoryPath,
  };
}
