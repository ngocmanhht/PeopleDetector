export interface BaseResponse<T> {
  data: T;
  message: string;
}

export interface PaginationResponse<T> {
  items: Array<T> | [];
  pagination: IPagination;
}

export interface IPagination {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

export interface DefaultPaginationFilter {
  page?: number;
  per_page?: number;
  sort_type?: 'asc' | 'desc';
  sort?: 'created_at' | 'updated_at' | 'id';
}
