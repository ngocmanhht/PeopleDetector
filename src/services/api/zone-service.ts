import { apiClient } from '../axios-services';
import { Zone } from '../../model/detector';

export interface CreateZonePayload {
  id?: string;
  name: string;
  description?: string;
}

export interface UpdateZonePayload {
  name?: string;
  description?: string;
}

export class ZoneService {
  private static instance: ZoneService;

  private constructor() {}

  public static getInstance(): ZoneService {
    if (!ZoneService.instance) {
      ZoneService.instance = new ZoneService();
    }
    return ZoneService.instance;
  }

  public async getZones(): Promise<{ success: boolean; data: Zone[] }> {
    return apiClient.get<{ success: boolean; data: Zone[] }>('/zones');
  }

  public async createZone(
    payload: CreateZonePayload,
  ): Promise<{ success: boolean; data: Zone }> {
    return apiClient.post<{ success: boolean; data: Zone }>('/zones', payload);
  }

  public async updateZone(
    id: string,
    payload: UpdateZonePayload,
  ): Promise<{ success: boolean; data: Zone }> {
    return apiClient.put<{ success: boolean; data: Zone }>(
      `/zones/${id}`,
      payload,
    );
  }

  public async deleteZone(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/zones/${id}`,
    );
  }
}

export const zoneService = ZoneService.getInstance();
