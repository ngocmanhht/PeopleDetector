import { apiClient } from '../axios-services';

export interface DeviceStatusResponse {
  allowed: boolean;
  deviceId: string;
  deviceName?: string;
  model?: string;
  message: string;
}

class DeviceService {
  /**
   * Kiểm tra xem thiết bị này đã được cấu hình cấp quyền trên CMS chưa
   */
  async checkStatus(deviceId: string): Promise<DeviceStatusResponse> {
    return apiClient.get<DeviceStatusResponse>(`/devices/status/${encodeURIComponent(deviceId)}`);
  }
}

export const deviceService = new DeviceService();
