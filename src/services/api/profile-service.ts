import { apiClient } from '../axios-services';
import { UserProfile } from '../../model/detector';

export interface CreateProfilePayload {
  id?: string;
  code: string;
  fullName: string;
  avatarUri?: string;
  photos?: string[];
  zoneId?: string;
  roomId?: string;
  enrolledAt?: string;
}

export interface UpdateProfilePayload {
  code?: string;
  fullName?: string;
  avatarUri?: string;
  photos?: string[];
  zoneId?: string;
  roomId?: string;
  enrolledAt?: string;
}

export class ProfileService {
  private static instance: ProfileService;

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  public async getProfiles(params?: {
    zoneId?: string;
    roomId?: string;
    q?: string;
  }): Promise<{ success: boolean; data: UserProfile[] }> {
    return apiClient.get<{ success: boolean; data: UserProfile[] }>(
      '/profiles',
      params,
    );
  }

  public async getProfileById(
    id: string,
  ): Promise<{ success: boolean; data: UserProfile }> {
    return apiClient.get<{ success: boolean; data: UserProfile }>(
      `/profiles/${id}`,
    );
  }

  public async createProfile(
    payload: CreateProfilePayload,
  ): Promise<{ success: boolean; data: UserProfile }> {
    return apiClient.post<{ success: boolean; data: UserProfile }>(
      '/profiles',
      payload,
    );
  }

  public async updateProfile(
    id: string,
    payload: UpdateProfilePayload,
  ): Promise<{ success: boolean; data: UserProfile }> {
    return apiClient.put<{ success: boolean; data: UserProfile }>(
      `/profiles/${id}`,
      payload,
    );
  }

  public async deleteProfile(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/profiles/${id}`,
    );
  }
}

export const profileService = ProfileService.getInstance();
