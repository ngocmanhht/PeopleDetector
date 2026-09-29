/**
 * Cấu hình phân trang dùng chung cho toàn bộ Mobile App
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: PaginationMeta;
}
