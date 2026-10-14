import { createMMKV } from 'react-native-mmkv';
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

const syncMetaStorage = createMMKV({ id: 'sync-meta-storage-v1' });
const LAST_EMBEDDINGS_SYNC_KEY = 'last_embeddings_synced_at';

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
      const lastSyncedAt = syncMetaStorage.getString(LAST_EMBEDDINGS_SYNC_KEY);

      // Parallelize all sync requests concurrently for maximum throughput
      const [
        zonesRes,
        roomsRes,
        profilesRes,
        embeddingsRes,
        sessionsRes,
        alertsRes,
      ] = await Promise.allSettled([
        zoneService.getZones(),
        roomService.getRooms(),
        // 1. Tải danh sách hồ sơ siêu nhẹ (không mang vector) để nạp Redux UI trong ~100ms
        profileService.getProfiles({ limit: 2000, includeEmbeddings: false }),
        // 2. Tải riêng gói vector sinh trắc học từ endpoint chuyên dụng (đồng bộ gia tăng qua updatedAfter)
        profileService.getEmbeddingsSync(
          lastSyncedAt ? { updatedAfter: lastSyncedAt } : undefined,
        ),
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
      }

      // Nạp vector từ endpoint sinh trắc học chuyên dụng vào RAM & MMKV cho AI Engine
      if (embeddingsRes.status === 'fulfilled' && embeddingsRes.value?.data) {
        if (embeddingsRes.value.data.length > 0) {
          YoloDetectorService.fastHydrateServerEmbeddings(
            embeddingsRes.value.data,
          );
        }
        if (embeddingsRes.value.syncedAt) {
          syncMetaStorage.set(
            LAST_EMBEDDINGS_SYNC_KEY,
            embeddingsRes.value.syncedAt,
          );
        }
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
    syncAllData: async (options?: { forceFullEmbeddingsSync?: boolean }) => {
      if (options?.forceFullEmbeddingsSync) {
        syncMetaStorage.remove(LAST_EMBEDDINGS_SYNC_KEY);
      }
      const res = await query.refetch();
      return res.data;
    },
    isSyncing: query.isFetching,
    lastSyncedAt: query.data?.syncedAt || null,
  };
};
