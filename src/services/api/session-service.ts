import { apiClient } from '../axios-services';
import { AttendanceSession } from '../../model/detector';

export interface StartSessionPayload {
  id?: string;
  name?: string;
  zoneId?: string;
  zoneName?: string;
  roomId: string;
  roomName?: string;
  startTime?: string;
}

export class SessionService {
  private static instance: SessionService;

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  public async getSessions(params?: {
    roomId?: string;
    zoneId?: string;
  }): Promise<{ success: boolean; data: AttendanceSession[] }> {
    return apiClient.get<{ success: boolean; data: AttendanceSession[] }>(
      '/sessions',
      params,
    );
  }

  public async getSessionById(
    id: string,
  ): Promise<{ success: boolean; data: AttendanceSession }> {
    return apiClient.get<{ success: boolean; data: AttendanceSession }>(
      `/sessions/${id}`,
    );
  }

  public async startSession(
    payload: StartSessionPayload,
  ): Promise<{ success: boolean; data: AttendanceSession }> {
    return apiClient.post<{ success: boolean; data: AttendanceSession }>(
      '/sessions/start',
      payload,
    );
  }

  public async endSession(
    id: string,
    endTime?: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `/sessions/${id}/end`,
      { endTime },
    );
  }

  public async deleteSession(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/sessions/${id}`,
    );
  }
}

export const sessionService = SessionService.getInstance();
