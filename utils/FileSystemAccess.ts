import { Platform, PermissionsAndroid } from 'react-native';
import * as RNFS from 'react-native-fs';
import { requestStoragePermissions } from './permissions';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
}

export class FileSystemAccess {
  private static instance: FileSystemAccess;
  
  public static getInstance(): FileSystemAccess {
    if (!FileSystemAccess.instance) {
      FileSystemAccess.instance = new FileSystemAccess();
    }
    return FileSystemAccess.instance;
  }

  /**
   * Get root directory path based on platform
   */
  public getRootPath(): string {
    if (Platform.OS === 'android') {
      return '/storage/emulated/0';
    } else if (Platform.OS === 'ios') {
      return RNFS.DocumentDirectoryPath;
    }
    return '/';
  }

  /**
   * List files and directories in a given path
   */
  public async listDirectory(path: string): Promise<FileItem[]> {
    try {
      // First check if we have the necessary permissions
      if (Platform.OS === 'android') {
        const hasPermission = await requestStoragePermissions();
        if (!hasPermission) {
          throw new Error('Storage permission not granted');
        }
      }

      // Check if the path exists
      const exists = await this.pathExists(path);
      if (!exists) {
        throw new Error(`Directory does not exist: ${path}`);
      }

      // Check if it's a directory
      const stat = await RNFS.stat(path);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${path}`);
      }

      const files = await RNFS.readDir(path);
      const fileItems: FileItem[] = files.map(file => ({
        name: file.name,
        path: file.path,
        isDirectory: file.isDirectory(),
        size: file.size,
        modificationTime: file.mtime ? new Date(file.mtime).getTime() : undefined,
      }));

      return fileItems.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error: unknown) {
      console.error('Error listing directory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorToThrow = new Error(`Failed to list directory: ${errorMessage}`);
      errorToThrow.name = 'FileSystemError';
      (errorToThrow as any).code = 'EUNSPECIFIED';
      throw errorToThrow;
    }
  }

  /**
   * Get file information
   */
  public async getFileInfo(path: string): Promise<FileItem> {
    try {
      const stat = await RNFS.stat(path);
      return {
        name: path.split('/').pop() || '',
        path: path,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modificationTime: stat.mtime ? new Date(stat.mtime).getTime() : undefined,
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw new Error(`Failed to get file info: ${error}`);
    }
  }

  /**
   * Read file content
   */
  public async readFile(path: string): Promise<string> {
    try {
      return await RNFS.readFile(path, 'utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  /**
   * Write file content
   */
  public async writeFile(path: string, content: string): Promise<void> {
    try {
      await RNFS.writeFile(path, content, 'utf8');
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  /**
   * Delete file or directory
   */
  public async deleteItem(path: string): Promise<void> {
    try {
      const stat = await RNFS.stat(path);
      if (stat.isDirectory()) {
        await RNFS.unlink(path);
      } else {
        await RNFS.unlink(path);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error(`Failed to delete item: ${error}`);
    }
  }

  /**
   * Create directory
   */
  public async createDirectory(path: string): Promise<void> {
    try {
      await RNFS.mkdir(path);
    } catch (error) {
      console.error('Error creating directory:', error);
      throw new Error(`Failed to create directory: ${error}`);
    }
  }

  /**
   * Copy file or directory
   */
  public async copyItem(sourcePath: string, destPath: string): Promise<void> {
    try {
      await RNFS.copyFile(sourcePath, destPath);
    } catch (error) {
      console.error('Error copying item:', error);
      throw new Error(`Failed to copy item: ${error}`);
    }
  }

  /**
   * Move file or directory
   */
  public async moveItem(sourcePath: string, destPath: string): Promise<void> {
    try {
      await RNFS.moveFile(sourcePath, destPath);
    } catch (error) {
      console.error('Error moving item:', error);
      throw new Error(`Failed to move item: ${error}`);
    }
  }
  /**
   * Check if path exists
   */
  public async pathExists(path: string): Promise<boolean> {
    try {
      if (!path) return false;
      await RNFS.stat(path);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT' || error?.message?.includes('does not exist')) {
        return false;
      }
      console.error('Error checking path existence:', error);
      throw error; // Re-throw other errors
    }
  }

  /**
   * Get available storage space
   */
  public async getStorageInfo(): Promise<{ freeSpace: number; totalSpace: number }> {
    try {
      const freeSpace = await RNFS.getFSInfo();
      return {
        freeSpace: freeSpace.freeSpace,
        totalSpace: freeSpace.totalSpace,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { freeSpace: 0, totalSpace: 0 };
    }
  }
}
