import { PaginationResponse } from '../model/response';

export function useGetNextPageParam<T>() {
  return (
    lastPage: PaginationResponse<T>,
    allPages: PaginationResponse<T>[],
  ): number | undefined => {
    const { pagination } = lastPage;

    if (!pagination) return undefined;

    const nextPage = pagination.current_page + 1;

    return nextPage <= pagination.last_page ? nextPage : undefined;
  };
}
