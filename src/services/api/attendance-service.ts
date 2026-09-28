import { apiClient } from '../axios-services';
import { AttendanceRecord, AttendanceStatus } from '../../model/detector';

export interface RecordAttendancePayload {
  sessionId?: string;
  userId: string;
  status: AttendanceStatus;
  confidence: number;
  timestamp: string;
  avatarUri?: string;
  detectedImageUrl?: string;
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

  public async getHistory(params?: {
    sessionId?: string;
    userId?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    return apiClient.get<{ success: boolean; data: any[] }>(
      '/attendance/history',
      params,
    );
  }
}

export const attendanceService = AttendanceService.getInstance();
