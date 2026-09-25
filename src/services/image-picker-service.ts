import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';
import { PHOTO_CONFIG } from '../const/photo-config';

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
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  /**
   * Pick multiple images from photo library up to remaining limit
   */
  public static async pickImagesFromLibrary(currentCount = 0): Promise<string[]> {
    const remainingSlots = PHOTO_CONFIG.MAX_PHOTOS_PER_USER - currentCount;
    if (remainingSlots <= 0) {
      Alert.alert(
        'Đã đạt giới hạn ảnh',
        `Mỗi hồ sơ được lưu tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh nhận diện.`
      );
      return [];
    }

    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: remainingSlots,
      quality: PHOTO_CONFIG.IMAGE_QUALITY,
      maxWidth: PHOTO_CONFIG.MAX_WIDTH,
      maxHeight: PHOTO_CONFIG.MAX_HEIGHT,
      includeBase64: false,
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel || !result.assets) {
        return [];
      }
      if (result.errorCode) {
        Alert.alert('Không thể chọn ảnh', result.errorMessage || result.errorCode);
        return [];
      }

      const uris = result.assets
        .map(asset => asset.uri)
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
  public static async captureImageWithCamera(currentCount = 0): Promise<string | null> {
    const remainingSlots = PHOTO_CONFIG.MAX_PHOTOS_PER_USER - currentCount;
    if (remainingSlots <= 0) {
      Alert.alert(
        'Đã đạt giới hạn ảnh',
        `Mỗi hồ sơ được lưu tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh nhận diện.`
      );
      return null;
    }

    const hasPerm = await this.requestCameraPermission();
    if (!hasPerm) {
      Alert.alert('Chưa cấp quyền', 'Vui lòng cấp quyền camera trong cài đặt thiết bị.');
      return null;
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      cameraType: 'front',
      saveToPhotos: false,
      quality: PHOTO_CONFIG.IMAGE_QUALITY,
      maxWidth: PHOTO_CONFIG.MAX_WIDTH,
      maxHeight: PHOTO_CONFIG.MAX_HEIGHT,
      includeBase64: false,
    };

    try {
      const result = await launchCamera(options);
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }
      if (result.errorCode) {
        Alert.alert('Không thể chụp ảnh', result.errorMessage || result.errorCode);
        return null;
      }

      return result.assets[0].uri || null;
    } catch (err) {
      console.warn('[ImagePickerService] capture error:', err);
      return null;
    }
  }
}
