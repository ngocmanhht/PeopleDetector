import { apiClient } from '../axios-services';
import { AttendanceRecord, AttendanceStatus } from '../../model/detector';
import { PaginatedResponse, PaginationParams } from '../../const/pagination';

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

  private constructor() {}

  public static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  public async recordAttendance(
    payload: RecordAttendancePayload,
  ): Promise<{ success: boolean; data: AttendanceRecord }> {
    return apiClient.post<{ success: boolean; data: AttendanceRecord }>(
      '/attendance/record',
      payload,
    );
  }

  public async getHistory(
    params?: GetAttendanceHistoryParams,
  ): Promise<PaginatedResponse<any>> {
    return apiClient.get<PaginatedResponse<any>>(
      '/attendance/history',
      params,
    );
  }
}

export const attendanceService = AttendanceService.getInstance();
