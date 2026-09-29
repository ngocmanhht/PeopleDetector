import { apiClient } from '../axios-services';
import { UploadFolder } from '../../const/upload-folder';
import ImageResizer from '@bam.tech/react-native-image-resizer';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_DIMENSION = 2048; // Max width/height cho ảnh nhận diện khuôn mặt

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
  paths: string[];
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
   * Chuẩn hóa ảnh trước khi tải lên bằng @bam.tech/react-native-image-resizer:
   * 1. Hỗ trợ mọi định dạng (HEIC, HEIF trên iPhone, PNG, WEBP) -> Convert sang .jpg chuẩn (JPEG format)
   * 2. Tự động resize và nén để dung lượng file luôn <= 5MB
   */
  public async prepareImageForUpload(fileUri: string): Promise<string> {
    try {
      if (
        !fileUri ||
        fileUri.startsWith('http://') ||
        fileUri.startsWith('https://')
      ) {
        return fileUri;
      }

      // Convert sang JPEG (chất lượng khởi điểm 85%), scale down nếu > MAX_DIMENSION (2048px)
      let quality = 85;
      let resized = await ImageResizer.createResizedImage(
        fileUri,
        MAX_DIMENSION,
        MAX_DIMENSION,
        'JPEG',
        quality,
        0,
        null,
        false,
        { mode: 'contain', onlyScaleDown: true },
      );

      // Nếu dung lượng vượt quá MAX_IMAGE_SIZE_BYTES (5MB), nén tiếp với quality thấp hơn
      while (resized.size > MAX_IMAGE_SIZE_BYTES && quality > 30) {
        quality -= 15;
        resized = await ImageResizer.createResizedImage(
          fileUri,
          MAX_DIMENSION,
          MAX_DIMENSION,
          'JPEG',
          quality,
          0,
          null,
          false,
          { mode: 'contain', onlyScaleDown: true },
        );
      }

      return resized.uri;
    } catch (err) {
      console.warn(
        '[UploadService] Không thể convert/resize ảnh bằng ImageResizer, dùng file gốc:',
        err,
      );
      return fileUri;
    }
  }

  /**
   * Upload 1 file ảnh (từ file URI cục bộ của thiết bị)
   * Tự động convert HEIC/HEIF sang JPG và resize <= 5MB trước khi upload
   * @param fileUri Đường dẫn file cục bộ (e.g. file:///... hoặc ph://...)
   * @param folder Thư mục lưu trên server (UploadFolder.PROFILES, etc.)
   * @param filename Tên file tùy chọn
   */
  public async uploadImage(
    fileUri: string,
    folder: UploadFolder = UploadFolder.PROFILES,
    filename?: string,
  ): Promise<UploadFileResponse> {
    // 1. Chuẩn hóa sang JPG và nén <= 5MB
    const readyUri = await this.prepareImageForUpload(fileUri);

    const formData = new FormData();
    const name =
      filename ||
      readyUri
        .split('/')
        .pop()
        ?.replace(/\.(heic|heif|png|webp)$/i, '.jpg') ||
      `photo_${Date.now()}.jpg`;

    formData.append('file', {
      uri: readyUri,
      name,
      type: 'image/jpeg',
    } as any);

    return apiClient.postFormData<UploadFileResponse>(
      `/upload/image?folder=${folder}`,
      formData,
    );
  }

  /**
   * Upload nhiều file ảnh cùng lúc (đều được convert sang JPG và nén <= 5MB)
   */
  public async uploadImages(
    fileUris: string[],
    folder: UploadFolder = UploadFolder.PROFILES,
  ): Promise<UploadFilesResponse> {
    // Chuẩn hóa toàn bộ ảnh song song
    const readyUris = await Promise.all(
      fileUris.map(uri => this.prepareImageForUpload(uri)),
    );

    const formData = new FormData();

    readyUris.forEach((uri, idx) => {
      const name =
        uri
          .split('/')
          .pop()
          ?.replace(/\.(heic|heif|png|webp)$/i, '.jpg') ||
        `photo_${Date.now()}_${idx}.jpg`;

      formData.append('files', {
        uri,
        name,
        type: 'image/jpeg',
      } as any);
    });

    return apiClient.postFormData<UploadFilesResponse>(
      `/upload/images?folder=${folder}`,
      formData,
    );
  }
}

export const uploadService = UploadService.getInstance();
