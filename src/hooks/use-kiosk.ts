import { useState, useEffect, useCallback } from 'react';
import { kioskService, KioskStatus } from '../services/kiosk-service';

export function useKiosk() {
  const [status, setStatus] = useState<KioskStatus>({
    isDeviceOwner: false,
    isKioskModeActive: false,
    lockTaskModeState: 0,
    packageName: 'com.peopledetector',
  });
  const [autoKiosk, setAutoKioskState] = useState<boolean>(() =>
    kioskService.isAutoKioskEnabled(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshStatus = useCallback(async () => {
    try {
      const current = await kioskService.getKioskStatus();
      setStatus(current);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const startKiosk = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await kioskService.startKioskMode();
      await refreshStatus();
      return ok;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const stopKiosk = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await kioskService.stopKioskMode();
      await refreshStatus();
      return ok;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const setAutoKiosk = useCallback((enabled: boolean) => {
    kioskService.setAutoKioskEnabled(enabled);
    setAutoKioskState(enabled);
  }, []);

  return {
    isSupported: kioskService.isSupported(),
    isKioskActive: status.isKioskModeActive,
    isDeviceOwner: status.isDeviceOwner,
    lockTaskModeState: status.lockTaskModeState,
    autoKiosk,
    isLoading,
    refreshStatus,
    startKiosk,
    stopKiosk,
    setAutoKiosk,
    verifyAdminPin: (pin: string) => kioskService.verifyAdminPin(pin),
    setAdminPin: (pin: string) => kioskService.setAdminPin(pin),
    getAdminPin: () => kioskService.getAdminPin(),
  };
}
