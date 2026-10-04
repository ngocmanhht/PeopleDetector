import { NativeModules } from 'react-native';

const { FileCleaner } = NativeModules;

/**
 * Deletes a temporary file from disk (e.g. VisionCamera snapshot/photo)
 * to avoid leaking disk storage on continuous AI scanning.
 */
export async function deleteTempFile(filePath?: string | null): Promise<boolean> {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  // Do not delete web/data URIs
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:')
  ) {
    return false;
  }

  try {
    if (FileCleaner && typeof FileCleaner.deleteFile === 'function') {
      return await FileCleaner.deleteFile(filePath);
    }
  } catch (_e) {
    // Ignore error if file was already removed or inaccessible
  }
  return false;
}

export default { deleteTempFile };
