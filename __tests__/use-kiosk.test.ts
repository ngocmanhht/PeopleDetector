import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useKiosk } from '../src/hooks/use-kiosk';
import { kioskService } from '../src/services/kiosk-service';

const mockStorage = new Map<string, any>();
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockStorage.get(key),
    setString: (key: string, val: string) => mockStorage.set(key, val),
    set: (key: string, val: any) => mockStorage.set(key, val),
    getBoolean: (key: string) => mockStorage.get(key),
    delete: (key: string) => mockStorage.delete(key),
  }),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    KioskModule: {
      startKioskMode: jest.fn().mockResolvedValue(true),
      stopKioskMode: jest.fn().mockResolvedValue(true),
      isKioskModeActive: jest.fn().mockResolvedValue(false),
      isInLockTaskMode: jest.fn().mockResolvedValue(false),
      isDeviceOwner: jest.fn().mockResolvedValue(true),
      getKioskStatus: jest.fn().mockResolvedValue({
        isDeviceOwner: true,
        isKioskModeActive: false,
        lockTaskModeState: 0,
        packageName: 'com.peopledetector',
      }),
    },
  },
}));

describe('useKiosk Hook Tests', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
  });

  test('provides initial kiosk states and allows toggling autoKiosk and PIN', async () => {
    let hookResult: ReturnType<typeof useKiosk> | null = null;

    const TestComponent: React.FC = () => {
      hookResult = useKiosk();
      return null;
    };

    await act(async () => {
      ReactTestRenderer.create(React.createElement(TestComponent));
    });

    expect(hookResult).not.toBeNull();
    expect(hookResult!.isSupported).toBe(true);
    expect(hookResult!.isDeviceOwner).toBe(true);
    expect(hookResult!.isKioskActive).toBe(false);

    // Toggle autoKiosk
    act(() => {
      hookResult!.setAutoKiosk(true);
    });
    expect(hookResult!.autoKiosk).toBe(true);
    expect(kioskService.isAutoKioskEnabled()).toBe(true);

    // Verify and update Admin PIN
    expect(hookResult!.verifyAdminPin('123456')).toBe(true);

    act(() => {
      const ok = hookResult!.setAdminPin('999999');
      expect(ok).toBe(true);
    });

    expect(hookResult!.getAdminPin()).toBe('999999');
    expect(hookResult!.verifyAdminPin('999999')).toBe(true);
  });
});
