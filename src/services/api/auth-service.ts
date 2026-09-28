import { apiClient } from '../axios-services';
import { Token } from '../../model/token';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserSessionDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserSessionDto;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  }

  public async refreshToken(token: string): Promise<RefreshResponse> {
    return apiClient.post<RefreshResponse>('/auth/refresh', {
      refreshToken: token,
      refresh_token: token,
    });
  }

  public async getMe(): Promise<{ user: UserSessionDto }> {
    return apiClient.get<{ user: UserSessionDto }>('/auth/me');
  }

  public async logout(
    refreshToken?: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      '/auth/logout',
      {
        refreshToken,
        refresh_token: refreshToken,
      },
    );
  }
}

export const authService = AuthService.getInstance();
