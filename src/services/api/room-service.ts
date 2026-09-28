import { apiClient } from '../axios-services';
import { Room } from '../../model/detector';

export interface CreateRoomPayload {
  id?: string;
  zoneId: string;
  name: string;
  capacity?: number;
}

export interface UpdateRoomPayload {
  zoneId?: string;
  name?: string;
  capacity?: number;
}

export class RoomService {
  private static instance: RoomService;

  private constructor() {}

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  public async getRooms(
    zoneId?: string,
  ): Promise<{ success: boolean; data: Room[] }> {
    return apiClient.get<{ success: boolean; data: Room[] }>(
      '/rooms',
      zoneId ? { zoneId } : undefined,
    );
  }

  public async createRoom(
    payload: CreateRoomPayload,
  ): Promise<{ success: boolean; data: Room }> {
    return apiClient.post<{ success: boolean; data: Room }>('/rooms', payload);
  }

  public async updateRoom(
    id: string,
    payload: UpdateRoomPayload,
  ): Promise<{ success: boolean; data: Room }> {
    return apiClient.put<{ success: boolean; data: Room }>(
      `/rooms/${id}`,
      payload,
    );
  }

  public async assignMembers(
    roomId: string,
    payload: { userIds: string[]; zoneId?: string },
  ): Promise<{ success: boolean; message: string; assignedCount: number }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      assignedCount: number;
    }>(`/rooms/${roomId}/members`, payload);
  }

  public async deleteRoom(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/rooms/${id}`,
    );
  }
}

export const roomService = RoomService.getInstance();
