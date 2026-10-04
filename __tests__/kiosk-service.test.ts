import { kioskService, DEFAULT_ADMIN_PIN } from '../src/services/kiosk-service';

// Mock react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    KioskModule: {
      startKioskMode: jest.fn().mockResolvedValue(true),
      stopKioskMode: jest.fn().mockResolvedValue(true),
      isKioskModeActive: jest.fn().mockResolvedValue(true),
      isInLockTaskMode: jest.fn().mockResolvedValue(true),
      isDeviceOwner: jest.fn().mockResolvedValue(true),
      getKioskStatus: jest.fn().mockResolvedValue({
        isDeviceOwner: true,
        isKioskModeActive: true,
        lockTaskModeState: 1,
        packageName: 'com.peopledetector',
      }),
    },
  },
}));

// Mock react-native-mmkv
const mockStorageMap = new Map<string, any>();
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockStorageMap.get(key),
    setString: (key: string, val: string) => mockStorageMap.set(key, val),
    set: (key: string, val: any) => mockStorageMap.set(key, val),
    getBoolean: (key: string) => mockStorageMap.get(key),
    delete: (key: string) => mockStorageMap.delete(key),
  }),
}));

describe('KioskService Unit Tests', () => {
  beforeEach(() => {
    mockStorageMap.clear();
  });

  test('default admin PIN is 123456', () => {
    expect(kioskService.getAdminPin()).toBe(DEFAULT_ADMIN_PIN);
    expect(kioskService.verifyAdminPin('123456')).toBe(true);
    expect(kioskService.verifyAdminPin('000000')).toBe(false);
  });

  test('updates admin PIN with valid length', () => {
    const updated = kioskService.setAdminPin('888888');
    expect(updated).toBe(true);
    expect(kioskService.getAdminPin()).toBe('888888');
    expect(kioskService.verifyAdminPin('888888')).toBe(true);
    expect(kioskService.verifyAdminPin('123456')).toBe(false);
  });

  test('rejects PIN with fewer than 4 digits', () => {
    const updated = kioskService.setAdminPin('123');
    expect(updated).toBe(false);
    expect(kioskService.getAdminPin()).toBe(DEFAULT_ADMIN_PIN);
  });

  test('auto kiosk preferences toggle', () => {
    expect(kioskService.isAutoKioskEnabled()).toBe(false);
    kioskService.setAutoKioskEnabled(true);
    expect(kioskService.isAutoKioskEnabled()).toBe(true);
    kioskService.setAutoKioskEnabled(false);
    expect(kioskService.isAutoKioskEnabled()).toBe(false);
  });

  test('calls native startKioskMode and stopKioskMode', async () => {
    const startRes = await kioskService.startKioskMode();
    expect(startRes).toBe(true);

    const active = await kioskService.isKioskModeActive();
    expect(active).toBe(true);

    const owner = await kioskService.isDeviceOwner();
    expect(owner).toBe(true);

    const status = await kioskService.getKioskStatus();
    expect(status.isDeviceOwner).toBe(true);
    expect(status.packageName).toBe('com.peopledetector');

    const stopRes = await kioskService.stopKioskMode();
    expect(stopRes).toBe(true);
  });
});
