import { apiClient } from '../axios-services';

export interface UploadFileResponse {
  success: boolean;
  url: string;
  path: string;
  filename: string;
  originalName?: string;
  size: number;
  mimetype: string;
}

export interface UploadFilesResponse {
  success: boolean;
  count: number;
  urls: string[];
  files: UploadFileResponse[];
}

export class UploadService {
  private static instance: UploadService;

  private constructor() {}

  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  /**
   * Upload 1 file ảnh (từ file URI cục bộ của thiết bị)
   * @param fileUri Đường dẫn file cục bộ (e.g. file:///... hoặc content://...)
   * @param folder Thư mục lưu trên server (profiles, attendance, common)
   * @param filename Tên file tùy chọn
   */
  public async uploadImage(
    fileUri: string,
    folder: 'profiles' | 'attendance' | 'common' = 'profiles',
    filename?: string,
  ): Promise<UploadFileResponse> {
    const formData = new FormData();
    const name =
      filename || fileUri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
    const type =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

    formData.append('file', {
      uri: fileUri,
      name,
      type,
    } as any);

    return apiClient.postFormData<UploadFileResponse>(
      `/upload/image?folder=${folder}`,
      formData,
    );
  }

  /**
   * Upload nhiều file ảnh cùng lúc
   */
  public async uploadImages(
    fileUris: string[],
    folder: 'profiles' | 'attendance' | 'common' = 'profiles',
  ): Promise<UploadFilesResponse> {
    const formData = new FormData();

    fileUris.forEach((uri, idx) => {
      const name = uri.split('/').pop() || `photo_${Date.now()}_${idx}.jpg`;
      const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
      const type =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

      formData.append('files', {
        uri,
        name,
        type,
      } as any);
    });

    return apiClient.postFormData<UploadFilesResponse>(
      `/upload/images?folder=${folder}`,
      formData,
    );
  }

  /**
   * Lưu ảnh từ chuỗi Base64 / Data URI
   */
  public async uploadBase64(
    base64: string,
    folder: 'profiles' | 'attendance' | 'common' = 'common',
  ): Promise<UploadFileResponse> {
    return apiClient.post<UploadFileResponse>('/upload/base64', {
      base64,
      folder,
    });
  }
}

export const uploadService = UploadService.getInstance();
