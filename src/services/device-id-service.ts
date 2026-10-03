import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

const deviceStorage = createMMKV({
  id: 'pd-device-identity',
  encryptionKey: 'pd-device-identity-key-2026',
});

const DEVICE_ID_KEY = 'peopledetector_unique_device_id';
const DEVICE_NAME_KEY = 'peopledetector_device_custom_name';

/**
 * Tạo chuỗi UUID ngẫu nhiên v4
 */
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class DeviceIdService {
  private cachedDeviceId: string | null = null;

  /**
   * Lấy mã Device ID duy nhất của thiết bị
   * Tự động sinh và lưu vĩnh viễn trong MMKV nếu chưa có
   */
  public getDeviceId(): string {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    try {
      let storedId = deviceStorage.getString(DEVICE_ID_KEY);
      if (!storedId) {
        const prefix = Platform.OS === 'ios' ? 'ipad' : 'tab';
        const shortUuid = generateUuid().slice(0, 13);
        storedId = `${prefix}-${shortUuid}`;
        deviceStorage.set(DEVICE_ID_KEY, storedId);
      }
      this.cachedDeviceId = storedId;
      return storedId;
    } catch (e) {
      // Fallback nếu storage gặp lỗi
      const fallbackId = `dev-${Platform.OS}-${Math.floor(Date.now() / 1000)}`;
      this.cachedDeviceId = fallbackId;
      return fallbackId;
    }
  }

  /**
   * Đặt mã thiết bị thủ công (nếu admin muốn gán mã tùy biến)
   */
  public setCustomDeviceId(newId: string): void {
    const clean = newId.trim();
    if (clean) {
      deviceStorage.set(DEVICE_ID_KEY, clean);
      this.cachedDeviceId = clean;
    }
  }

  /**
   * Thông tin dòng máy
   */
  public getDeviceModel(): string {
    if (Platform.OS === 'ios') {
      return 'Apple iPad / iOS';
    }
    return 'Android Tablet / Device';
  }

  /**
   * Tên định danh thiết bị
   */
  public getDeviceName(): string {
    const savedName = deviceStorage.getString(DEVICE_NAME_KEY);
    if (savedName) return savedName;
    return Platform.OS === 'ios' ? 'iPad Điểm Danh' : 'Android Tablet Điểm Danh';
  }

  public setDeviceName(name: string): void {
    if (name.trim()) {
      deviceStorage.set(DEVICE_NAME_KEY, name.trim());
    }
  }
}

export const deviceIdService = new DeviceIdService();
