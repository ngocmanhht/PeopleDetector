import { useCallback, useState } from 'react';

export function useRefresh<T extends (...args: any[]) => Promise<any>>(fn: T) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(
    async (...args: Parameters<T>) => {
      try {
        setRefreshing(true);
        await fn(...args);
      } finally {
        setRefreshing(false);
      }
    },
    [fn],
  );

  return { refreshing, onRefresh };
}
