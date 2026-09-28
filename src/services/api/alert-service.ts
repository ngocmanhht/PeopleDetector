import { apiClient } from '../axios-services';
import { AlertLog } from '../../model/detector';

export interface CreateAlertPayload {
  id?: string;
  title: string;
  message: string;
  timestamp?: string;
  type?: 'warning' | 'info' | 'error';
}

export class AlertService {
  private static instance: AlertService;

  private constructor() {}

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  public async getAlerts(): Promise<{ success: boolean; data: AlertLog[] }> {
    return apiClient.get<{ success: boolean; data: AlertLog[] }>('/alerts');
  }

  public async createAlert(
    payload: CreateAlertPayload,
  ): Promise<{ success: boolean; data: AlertLog }> {
    return apiClient.post<{ success: boolean; data: AlertLog }>(
      '/alerts',
      payload,
    );
  }

  public async clearAlerts(): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>('/alerts');
  }
}

export const alertService = AlertService.getInstance();
