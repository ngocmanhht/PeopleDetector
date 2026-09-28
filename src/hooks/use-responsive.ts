import { Platform, useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  isPhone: boolean;
}

export const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // On iOS, Platform.isPad strictly tells if the device is iPad.
  // On other platforms, screens with smallest dimension >= 600 are considered tablets.
  const isTablet =
    Platform.OS === 'ios'
      ? Boolean(Platform.isPad)
      : Math.min(width, height) >= 600;

  const isPhone = !isTablet;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isPhone,
  };
};
