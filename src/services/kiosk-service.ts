import { NativeModules, Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

const { KioskModule } = NativeModules;

const kioskStorage = createMMKV({ id: 'kiosk-settings' });

const KEY_ADMIN_PIN = 'kiosk_admin_pin';
const KEY_AUTO_KIOSK = 'kiosk_auto_enabled';
export const DEFAULT_ADMIN_PIN = '123456';

export interface KioskStatus {
  isDeviceOwner: boolean;
  isKioskModeActive: boolean;
  lockTaskModeState: number; // 0 = NONE, 1 = LOCKED, 2 = PINNED
  packageName: string;
}

export class KioskService {
  private static instance: KioskService;

  private constructor() {}

  public static getInstance(): KioskService {
    if (!KioskService.instance) {
      KioskService.instance = new KioskService();
    }
    return KioskService.instance;
  }

  /**
   * Checks if this device/platform supports Android Kiosk (LockTask)
   */
  public isSupported(): boolean {
    return Platform.OS === 'android' && Boolean(KioskModule);
  }

  /**
   * Starts Lock Task (Kiosk) mode.
   * If the app is Device Owner, it enters fully locked kiosk mode without dialogs.
   * If not Device Owner, it enters standard Android screen pinning.
   */
  public async startKioskMode(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    try {
      return await KioskModule.startKioskMode();
    } catch (e) {
      console.warn('[KioskService] startKioskMode failed:', e);
      return false;
    }
  }

  /**
   * Exits Lock Task (Kiosk) mode.
   */
  public async stopKioskMode(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    try {
      return await KioskModule.stopKioskMode();
    } catch (e) {
      console.warn('[KioskService] stopKioskMode failed:', e);
      return false;
    }
  }

  /**
   * Checks if the app is currently in Lock Task (Kiosk / Screen Pinning) mode.
   */
  public async isKioskModeActive(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    try {
      return await KioskModule.isKioskModeActive();
    } catch (e) {
      console.warn('[KioskService] isKioskModeActive failed:', e);
      return false;
    }
  }

  /**
   * Alias for isKioskModeActive
   */
  public async isInLockTaskMode(): Promise<boolean> {
    return this.isKioskModeActive();
  }

  /**
   * Checks if the app has been granted Device Owner privileges via ADB.
   */
  public async isDeviceOwner(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    try {
      return await KioskModule.isDeviceOwner();
    } catch (e) {
      console.warn('[KioskService] isDeviceOwner failed:', e);
      return false;
    }
  }

  /**
   * Sets the lock task packages whitelist for Device Owner.
   */
  public async setLockTaskPackages(packages?: string[]): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    try {
      return await KioskModule.setLockTaskPackages(packages || []);
    } catch (e) {
      console.warn('[KioskService] setLockTaskPackages failed:', e);
      return false;
    }
  }

  /**
   * Retrieves comprehensive kiosk & device status
   */
  public async getKioskStatus(): Promise<KioskStatus> {
    if (!this.isSupported()) {
      return {
        isDeviceOwner: false,
        isKioskModeActive: false,
        lockTaskModeState: 0,
        packageName: 'com.peopledetector',
      };
    }
    try {
      return await KioskModule.getKioskStatus();
    } catch (e) {
      console.warn('[KioskService] getKioskStatus failed:', e);
      return {
        isDeviceOwner: false,
        isKioskModeActive: false,
        lockTaskModeState: 0,
        packageName: 'com.peopledetector',
      };
    }
  }

  // ================= ADMIN PIN & PREFERENCES ================= //

  /**
   * Retrieves configured Admin PIN (defaults to 123456)
   */
  public getAdminPin(): string {
    const pin = kioskStorage.getString(KEY_ADMIN_PIN);
    return pin || DEFAULT_ADMIN_PIN;
  }

  /**
   * Sets a new Admin PIN for exiting Kiosk mode (min 4 characters)
   */
  public setAdminPin(newPin: string): boolean {
    if (!newPin || newPin.trim().length < 4) {
      return false;
    }
    kioskStorage.set(KEY_ADMIN_PIN, newPin.trim());
    return true;
  }

  /**
   * Verifies if the provided PIN matches configured Admin PIN
   */
  public verifyAdminPin(inputPin: string): boolean {
    if (!inputPin) return false;
    const currentPin = this.getAdminPin();
    return inputPin.trim() === currentPin;
  }

  /**
   * Checks whether Kiosk mode should automatically start on tablet screen launch
   */
  public isAutoKioskEnabled(): boolean {
    return kioskStorage.getBoolean(KEY_AUTO_KIOSK) ?? true;
  }

  /**
   * Sets auto-kiosk preference
   */
  public setAutoKioskEnabled(enabled: boolean): void {
    kioskStorage.set(KEY_AUTO_KIOSK, enabled);
  }
}

export const kioskService = KioskService.getInstance();
