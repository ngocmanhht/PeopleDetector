import { apiClient } from '../axios-services';
import { UserProfile } from '../../model/detector';
import { PaginatedResponse, PaginationParams } from '../../const/pagination';

export interface GetProfilesParams extends PaginationParams {
  zoneId?: string;
  roomId?: string;
  q?: string;
}

export interface CreateProfilePayload extends Partial<UserProfile> {
  code: string;
  fullName: string;
}

export interface UpdateConditionPayload {
  conditionStatus: string;
  conditionNote?: string;
  updatedBy?: string;
}

export interface BatchCreateProfilesResponse {
  success: boolean;
  count: number;
  skippedCount: number;
  skipped: { code: string; reason: string }[];
  data: UserProfile[];
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

  public async getProfiles(
    params?: GetProfilesParams,
  ): Promise<PaginatedResponse<UserProfile>> {
    return apiClient.get<PaginatedResponse<UserProfile>>(
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

  public async updateCondition(
    id: string,
    payload: UpdateConditionPayload,
  ): Promise<{ success: boolean; message?: string; data: UserProfile }> {
    return apiClient.patch<{
      success: boolean;
      message?: string;
      data: UserProfile;
    }>(`/profiles/${id}/condition`, payload);
  }

  public async batchCreateProfiles(
    profiles: CreateProfilePayload[],
  ): Promise<BatchCreateProfilesResponse> {
    return apiClient.post<BatchCreateProfilesResponse>('/profiles/batch', {
      profiles,
    });
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
