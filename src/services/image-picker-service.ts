import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';
import { PHOTO_CONFIG } from '../const/photo-config';
import { loadImage, type Image } from 'react-native-nitro-image';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from './tflite-yolo-service';

export class ImagePickerService {
  /**
   * Request Android runtime permission if needed
   */
  private static async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Quyền sử dụng máy ảnh',
          message: 'Ứng dụng cần quyền máy ảnh để chụp ảnh nhận diện.',
          buttonNeutral: 'Hỏi lại sau',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  /**
   * Pick multiple images from photo library up to remaining limit
   */
  public static async pickImagesFromLibrary(
    currentCount = 0,
  ): Promise<string[]> {
    const remainingSlots = PHOTO_CONFIG.MAX_PHOTOS_PER_USER - currentCount;
    if (remainingSlots <= 0) {
      Alert.alert(
        'Đã đạt giới hạn ảnh',
        `Mỗi hồ sơ được lưu tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh nhận diện.`,
      );
      return [];
    }

    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: remainingSlots,
      quality: PHOTO_CONFIG.IMAGE_QUALITY,
      maxWidth: PHOTO_CONFIG.MAX_WIDTH,
      maxHeight: PHOTO_CONFIG.MAX_HEIGHT,
      includeBase64: true,
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel || !result.assets) {
        return [];
      }
      if (result.errorCode) {
        Alert.alert(
          'Không thể chọn ảnh',
          result.errorMessage || result.errorCode,
        );
        return [];
      }

      const uris = result.assets
        .map(asset => {
          if (asset.base64) {
            return `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
          }
          return asset.uri || '';
        })
        .filter((uri): uri is string => Boolean(uri));

      return uris;
    } catch (err) {
      console.warn('[ImagePickerService] pick error:', err);
      return [];
    }
  }

  /**
   * Capture single photo with device camera
   */
  public static async captureImageWithCamera(
    currentCount = 0,
    cameraType: 'front' | 'back' = 'back',
  ): Promise<string | null> {
    const remainingSlots = PHOTO_CONFIG.MAX_PHOTOS_PER_USER - currentCount;
    if (remainingSlots <= 0) {
      Alert.alert(
        'Đã đạt giới hạn ảnh',
        `Mỗi hồ sơ được lưu tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh nhận diện.`,
      );
      return null;
    }

    const hasPerm = await this.requestCameraPermission();
    if (!hasPerm) {
      Alert.alert(
        'Chưa cấp quyền',
        'Vui lòng cấp quyền camera trong cài đặt thiết bị.',
      );
      return null;
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      cameraType,
      saveToPhotos: false,
      quality: PHOTO_CONFIG.IMAGE_QUALITY,
      maxWidth: PHOTO_CONFIG.MAX_WIDTH,
      maxHeight: PHOTO_CONFIG.MAX_HEIGHT,
      includeBase64: true,
    };

    try {
      const result = await launchCamera(options);
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }
      if (result.errorCode) {
        Alert.alert(
          'Không thể chụp ảnh',
          result.errorMessage || result.errorCode,
        );
        return null;
      }

      const asset = result.assets[0];
      if (asset.base64) {
        return `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
      }
      return asset.uri || null;
    } catch (err) {
      console.warn('[ImagePickerService] capture error:', err);
      return null;
    }
  }

  /**
   * Horizontally flips an image (solves front-camera mirrored/reversed images)
   */
  public static async flipImageHorizontal(uri: string): Promise<string> {
    try {
      let image: Image;
      if (uri.startsWith('data:')) {
        const buffer = base64ToArrayBuffer(uri);
        image = await loadImage({
          encodedImageData: { buffer, width: 0, height: 0, imageFormat: 'jpg' },
        });
      } else {
        image = await loadImage({ filePath: uri });
      }
      const mirrored = image.mirrorHorizontally();
      const encoded = mirrored.toEncodedImageData('jpg', 80);
      return `data:image/jpeg;base64,${arrayBufferToBase64(encoded.buffer)}`;
    } catch (e) {
      console.warn('[ImagePickerService] flip error:', e);
      return uri;
    }
  }

  /**
   * Rotates an image by 90 degrees clockwise (solves rotated/upside-down photos)
   */
  public static async rotateImage90(uri: string): Promise<string> {
    try {
      let image: Image;
      if (uri.startsWith('data:')) {
        const buffer = base64ToArrayBuffer(uri);
        image = await loadImage({
          encodedImageData: { buffer, width: 0, height: 0, imageFormat: 'jpg' },
        });
      } else {
        image = await loadImage({ filePath: uri });
      }
      const rotated = image.rotate(90);
      const encoded = rotated.toEncodedImageData('jpg', 80);
      return `data:image/jpeg;base64,${arrayBufferToBase64(encoded.buffer)}`;
    } catch (e) {
      console.warn('[ImagePickerService] rotate error:', e);
      return uri;
    }
  }
}
