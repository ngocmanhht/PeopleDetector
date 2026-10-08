import { apiClient } from '../axios-services';
import { AttendanceRecord, AttendanceStatus } from '../../model/detector';
import { PaginatedResponse, PaginationParams } from '../../const/pagination';
import { createMMKV } from 'react-native-mmkv';

const offlineStorage = createMMKV({ id: 'offline-attendance-queue-v1' });
const OFFLINE_QUEUE_KEY = 'pending_scans';
const MAX_QUEUE_LIMIT = 500;

export interface GetAttendanceHistoryParams extends PaginationParams {
  sessionId?: string;
  userId?: string;
}

export interface RecordAttendancePayload {
  sessionId?: string;
  userId: string;
  status: AttendanceStatus;
  confidence: number;
  timestamp: string;
  avatarUri?: string;
  detectedImageUrl?: string;
  direction?: 'in' | 'out';
}

export class AttendanceService {
  private static instance: AttendanceService;
  private isFlushing = false;

  private constructor() {}

  public static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  /**
   * Reads pending attendance scans stored in MMKV
   */
  public getOfflineQueue(): RecordAttendancePayload[] {
    try {
      const raw = offlineStorage.getString(OFFLINE_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Enqueues an attendance scan locally for future background retry
   */
  public enqueueOffline(payload: RecordAttendancePayload): void {
    try {
      const current = this.getOfflineQueue();
      // Keep payload lightweight for storage by omitting heavy raw base64 if already large
      const sanitized = { ...payload };
      if (sanitized.avatarUri && sanitized.avatarUri.length > 50000) {
        sanitized.avatarUri = undefined;
      }
      current.push(sanitized);
      // Cap queue size to prevent filling disk
      const bounded =
        current.length > MAX_QUEUE_LIMIT
          ? current.slice(-MAX_QUEUE_LIMIT)
          : current;
      offlineStorage.set(OFFLINE_QUEUE_KEY, JSON.stringify(bounded));
      console.log(
        `[AttendanceService] Enqueued offline scan. Total in queue: ${bounded.length}`,
      );
    } catch (e) {
      console.warn('[AttendanceService] Failed to persist offline scan:', e);
    }
  }

  /**
   * Clears or updates the offline queue
   */
  private saveOfflineQueue(queue: RecordAttendancePayload[]): void {
    try {
      if (queue.length === 0) {
        offlineStorage.remove(OFFLINE_QUEUE_KEY);
      } else {
        offlineStorage.set(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (e) {
      console.warn('[AttendanceService] Failed to save queue:', e);
    }
  }

  /**
   * Attempts to send pending offline scans to the server
   */
  public async flushOfflineQueue(): Promise<{
    flushed: number;
    remaining: number;
  }> {
    if (this.isFlushing) {
      return { flushed: 0, remaining: this.getOfflineQueue().length };
    }
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { flushed: 0, remaining: 0 };

    this.isFlushing = true;
    let flushedCount = 0;
    const remainingQueue: RecordAttendancePayload[] = [];

    try {
      console.log(
        `[AttendanceService] Flushing ${queue.length} offline scans to server...`,
      );
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          await apiClient.post('/attendance/record', item);
          flushedCount++;
        } catch (postErr) {
          // If sending fails (e.g. still offline), keep remaining items and abort this flush cycle
          console.log(
            '[AttendanceService] Flush paused due to network error:',
            postErr,
          );
          remainingQueue.push(...queue.slice(i));
          break;
        }
      }
      this.saveOfflineQueue(remainingQueue);
    } finally {
      this.isFlushing = false;
    }

    return { flushed: flushedCount, remaining: remainingQueue.length };
  }

  public async recordAttendance(
    payload: RecordAttendancePayload,
  ): Promise<{
    success: boolean;
    data?: AttendanceRecord;
    queuedOffline?: boolean;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: AttendanceRecord;
      }>('/attendance/record', payload);
      // If we had pending items in offline queue, opportunistically flush them in background
      if (this.getOfflineQueue().length > 0) {
        this.flushOfflineQueue().catch(() => {});
      }
      return res;
    } catch (err) {
      console.warn(
        '[AttendanceService] Network post failed, saving to offline queue:',
        err,
      );
      this.enqueueOffline(payload);
      return { success: false, queuedOffline: true };
    }
  }

  public async getHistory(
    params?: GetAttendanceHistoryParams,
  ): Promise<PaginatedResponse<AttendanceRecord>> {
    return apiClient.get<PaginatedResponse<AttendanceRecord>>(
      '/attendance/history',
      params,
    );
  }
}

export const attendanceService = AttendanceService.getInstance();
