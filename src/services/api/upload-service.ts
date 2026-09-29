import { apiClient } from '../axios-services';
import { UploadFolder } from '../../const/upload-folder';
import { loadImage } from 'react-native-nitro-image';

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
   * Chuẩn hóa ảnh trước khi tải lên:
   * 1. Hỗ trợ mọi định dạng (HEIC, HEIF trên iPhone, PNG, WEBP) -> Convert sang .jpg chuẩn
   * 2. Tự động resize và nén để dung lượng file luôn <= 5MB
   */
  public async prepareImageForUpload(fileUri: string): Promise<string> {
    try {
      if (!fileUri || fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
        return fileUri;
      }

      // Xóa tiền tố file:// nếu có để nạp vào native image loader
      const cleanPath = fileUri.replace(/^file:\/\//, '');

      // Native loader hỗ trợ tự động decode HEIC/HEIF/PNG/JPG trên iOS & Android
      let img = await loadImage({ filePath: cleanPath });

      // 1. Giới hạn độ phân giải (tối đa 2048px) giữ nguyên tỉ lệ khung hình
      const maxDim = Math.max(img.width, img.height);
      if (maxDim > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / maxDim;
        const newWidth = Math.round(img.width * scale);
        const newHeight = Math.round(img.height * scale);
        img = await img.resizeAsync(newWidth, newHeight);
      }

      // 2. Nén sang định dạng 'jpg' với chất lượng khởi đầu 85%
      let quality = 85;
      let encoded = await img.toEncodedImageDataAsync('jpg', quality);

      // 3. Nếu vượt quá 5MB, tiếp tục giảm quality xuống mức an toàn
      while (encoded.buffer.byteLength > MAX_IMAGE_SIZE_BYTES && quality > 30) {
        quality -= 15;
        encoded = await img.toEncodedImageDataAsync('jpg', quality);
      }

      // 4. Lưu ra file tạm thời dạng .jpg
      const tempPath = await img.saveToTemporaryFileAsync('jpg', quality);
      return tempPath.startsWith('file://') ? tempPath : `file://${tempPath}`;
    } catch (err) {
      console.warn('[UploadService] Không thể convert/resize ảnh, dùng file gốc:', err);
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
      readyUri.split('/').pop()?.replace(/\.(heic|heif|png|webp)$/i, '.jpg') ||
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
      fileUris.map((uri) => this.prepareImageForUpload(uri)),
    );

    const formData = new FormData();

    readyUris.forEach((uri, idx) => {
      const name =
        uri.split('/').pop()?.replace(/\.(heic|heif|png|webp)$/i, '.jpg') ||
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

  /**
   * Lưu ảnh từ chuỗi Base64 / Data URI
   */
  public async uploadBase64(
    base64: string,
    folder: UploadFolder = UploadFolder.COMMON,
  ): Promise<UploadFileResponse> {
    return apiClient.post<UploadFileResponse>('/upload/base64', {
      base64,
      folder,
    });
  }
}

export const uploadService = UploadService.getInstance();
