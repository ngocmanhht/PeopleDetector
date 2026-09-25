import Toast from 'react-native-toast-message';
import { QueryClient } from '@tanstack/react-query';
import { store } from '../store';
import { setAppLoading } from '../store/slices/uiSlice';

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onMutate: () => {
        store.dispatch(setAppLoading(true));
      },
      onError: err => {
        Toast.show({
          type: 'error',
          text1: err.message ?? 'Hệ thống đang lỗi vui lòng thử lại sau ',
          position: 'top',
        });
      },
      onSettled: () => {
        store.dispatch(setAppLoading(false));
      },
    },
  },
});
