// useAppToast.ts
import Toast from 'react-native-toast-message';

export const useAppToast = () => {
  const showSuccessToast = (message: string, description?: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: description,
      position: 'top',
    });
  };

  const showErrorToast = (message: string, description?: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: description,
      position: 'top',
    });
  };

  const showInfoToast = (message: string, description?: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: description,
      position: 'top',
    });
  };

  const showWarnToast = (message: string, description?: string) => {
    Toast.show({
      type: 'warn',
      text1: message,
      text2: description,
      position: 'top',
    });
  };

  return {
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarnToast,
  };
};
