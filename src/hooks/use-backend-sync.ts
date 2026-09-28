import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setZones,
  setRooms,
  setUserProfiles,
  setSessions,
  setAlerts,
} from '../store/slices/detectorSlice';
import {
  zoneService,
  roomService,
  profileService,
  sessionService,
  alertService,
} from '../services/api';

export const useBackendSync = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(state => state.app.isAuthenticated);

  const syncAllData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // 1. Sync Zones
      try {
        const zonesRes = await zoneService.getZones();
        if (zonesRes?.data) {
          dispatch(setZones(zonesRes.data));
        }
      } catch (e) {
        console.log('[BackendSync] Failed to sync zones:', e);
      }

      // 2. Sync Rooms
      try {
        const roomsRes = await roomService.getRooms();
        if (roomsRes?.data) {
          dispatch(setRooms(roomsRes.data));
        }
      } catch (e) {
        console.log('[BackendSync] Failed to sync rooms:', e);
      }

      // 3. Sync User Profiles
      try {
        const profilesRes = await profileService.getProfiles();
        if (profilesRes?.data) {
          dispatch(setUserProfiles(profilesRes.data));
        }
      } catch (e) {
        console.log('[BackendSync] Failed to sync profiles:', e);
      }

      // 4. Sync Sessions
      try {
        const sessionsRes = await sessionService.getSessions();
        if (sessionsRes?.data) {
          dispatch(setSessions(sessionsRes.data));
        }
      } catch (e) {
        console.log('[BackendSync] Failed to sync sessions:', e);
      }

      // 5. Sync Alerts
      try {
        const alertsRes = await alertService.getAlerts();
        if (alertsRes?.data) {
          dispatch(setAlerts(alertsRes.data));
        }
      } catch (e) {
        console.log('[BackendSync] Failed to sync alerts:', e);
      }
    } catch (err) {
      console.log('[BackendSync] Error syncing data from backend:', err);
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      syncAllData();
    }
  }, [isAuthenticated, syncAllData]);

  return { syncAllData };
};
