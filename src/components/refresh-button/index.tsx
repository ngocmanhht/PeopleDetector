import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { RotateCw } from 'lucide-react-native';
import { appColors } from '../../const/app-colors';
import { useBackendSync } from '../../hooks/use-backend-sync';
import { useAppToast } from '../../hooks/use-app-toast';

interface RefreshButtonProps {
  onRefresh?: () => Promise<unknown> | void;
  style?: StyleProp<ViewStyle>;
  size?: number;
  iconSize?: number;
  color?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  style,
  size = 36,
  iconSize = 17,
  color = appColors.blue600,
}) => {
  const { syncAllData } = useBackendSync();
  const { showSuccessToast, showWarnToast } = useAppToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  const startSpinAnimation = () => {
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 750,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  };

  const stopSpinAnimation = () => {
    spinValue.stopAnimation();
    spinValue.setValue(0);
  };

  const handlePress = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    startSpinAnimation();

    try {
      // 1. Đồng bộ toàn bộ dữ liệu backend (khu, phòng, học viên, phiên, cảnh báo)
      await syncAllData();

      // 2. Gọi hàm làm mới riêng của màn hình (nếu có)
      if (onRefresh) {
        await onRefresh();
      }

      showSuccessToast(
        'Đã làm mới dữ liệu',
        'Dữ liệu hệ thống đã được đồng bộ mới nhất!',
      );
    } catch (err: unknown) {
      console.log('[RefreshButton] Error refreshing:', err);
      showWarnToast('Làm mới thất bại', 'Không thể đồng bộ dữ liệu lúc này.');
    } finally {
      stopSpinAnimation();
      setIsRefreshing(false);
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: size, height: size, borderRadius: 10 },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isRefreshing}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <RotateCw size={iconSize} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
});
