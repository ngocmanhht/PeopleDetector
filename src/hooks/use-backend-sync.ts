import { useQuery } from '@tanstack/react-query';
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
import { YoloDetectorService } from '../services/yolo-detector';

/**
 * Hook tự động đồng bộ toàn bộ dữ liệu hệ thống từ Backend sử dụng TanStack Query
 * - Tự động Polling định kỳ mỗi 60 giây (refetchInterval)
 * - Tự động kết nối lại khi có mạng LAN (refetchOnReconnect)
 * - Chống trùng lặp request (Request Deduplication) & Stale-while-revalidate
 * - Nạp trực tiếp vào Redux Store cho Engine AI / Offline Kiosk Mode
 */
export const useBackendSync = (intervalMs: number = 60000) => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(state => state.app.isAuthenticated);

  const query = useQuery({
    queryKey: ['backend-sync-all'],
    queryFn: async () => {
      // Parallelize all 5 sync requests concurrently for 3x-5x faster response time
      const [zonesRes, roomsRes, profilesRes, sessionsRes, alertsRes] =
        await Promise.allSettled([
          zoneService.getZones(),
          roomService.getRooms(),
          profileService.getProfiles({ limit: 2000 }),
          sessionService.getSessions(),
          alertService.getAlerts(),
        ]);

      if (zonesRes.status === 'fulfilled' && zonesRes.value?.data) {
        dispatch(setZones(zonesRes.value.data));
      }

      if (roomsRes.status === 'fulfilled' && roomsRes.value?.data) {
        dispatch(setRooms(roomsRes.value.data));
      }

      if (profilesRes.status === 'fulfilled' && profilesRes.value?.data) {
        dispatch(setUserProfiles(profilesRes.value.data));
        YoloDetectorService.fastHydrateServerEmbeddings(profilesRes.value.data);
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value?.data) {
        dispatch(setSessions(sessionsRes.value.data));
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value?.data) {
        dispatch(setAlerts(alertsRes.value.data));
      }

      return { syncedAt: new Date() };
    },
    enabled: isAuthenticated,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
    refetchIntervalInBackground: false,
    staleTime: 30000,
    retry: 2,
  });

  return {
    syncAllData: async () => {
      const res = await query.refetch();
      return res.data;
    },
    isSyncing: query.isFetching,
    lastSyncedAt: query.data?.syncedAt || null,
  };
};
