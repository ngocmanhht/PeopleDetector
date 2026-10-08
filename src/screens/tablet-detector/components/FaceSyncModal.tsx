import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import {
  Cpu,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { ScanMode } from '../../../model/detector';

interface FaceSyncModalProps {
  visible: boolean;
  current: number;
  total: number;
  currentProfileName?: string;
  scanMode?: ScanMode;
  onDismiss?: () => void;
}

export const FaceSyncModal: React.FC<FaceSyncModalProps> = ({
  visible,
  current,
  total,
  currentProfileName,
  scanMode = 'all',
  onDismiss,
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const isDone = total > 0 && current >= total;

  useEffect(() => {
    if (visible && !isDone) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      spin.start();
      pulse.start();
      return () => {
        spin.stop();
        pulse.stop();
      };
    }
  }, [visible, isDone, spinAnim, pulseAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percent,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [percent, progressAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const modeLabel =
    scanMode === 'all'
      ? 'Toàn cơ sở'
      : scanMode === 'zone'
      ? 'Theo khu vực'
      : 'Theo phòng';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={[
        'portrait',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.iconGlow,
                isDone && styles.iconGlowDone,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View
              style={[
                styles.iconBadge,
                isDone && { backgroundColor: appColors.green600 },
              ]}
            >
              {isDone ? (
                <CheckCircle2 size={36} color={appColors.white} />
              ) : (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Cpu size={32} color={appColors.white} />
                </Animated.View>
              )}
            </View>
          </View>

          {/* Title & Mode */}
          <View style={styles.titleWrap}>
            <AppText style={styles.title}>
              {isDone
                ? 'Dữ liệu nhận diện đã sẵn sàng!'
                : 'Đang nạp dữ liệu nhận diện khuôn mặt'}
            </AppText>
            <View style={styles.modeBadge}>
              <Sparkles size={13} color={appColors.blue600} />
              <AppText style={styles.modeText}>
                {modeLabel} • {total} hồ sơ
              </AppText>
            </View>
          </View>

          {/* Subtitle / Guidance */}
          <AppText style={styles.description}>
            {isDone
              ? 'Toàn bộ vector khuôn mặt đã sẵn sàng trong bộ nhớ máy. Camera đã bắt đầu quét điểm danh.'
              : 'Hệ thống đang chuẩn bị vector đặc trưng AI để nhận diện tức thì và tránh báo nhầm người lạ.'}
          </AppText>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  isDone && { backgroundColor: appColors.green600 },
                  { width: progressWidth },
                ]}
              />
            </View>
            <View style={styles.progressTextRow}>
              <AppText style={styles.progressDetail}>
                {current} / {total} hồ sơ
              </AppText>
              <AppText style={styles.progressPercent}>{percent}%</AppText>
            </View>
          </View>

          {/* Current Processing Profile */}
          {!isDone && (
            <View style={styles.currentProfileBox}>
              <AppText style={styles.currentProfileLabel}>
                Đang xử lý:
              </AppText>
              <AppText
                style={styles.currentProfileName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentProfileName || 'Đang nạp bộ nhớ đệm vector AI...'}
              </AppText>
            </View>
          )}

          {/* Notice Box */}
          {!isDone && (
            <View style={styles.warningBox}>
              <AlertCircle size={15} color={appColors.amber600} style={styles.warningIcon} />
              <AppText style={styles.warningText}>
                Camera tạm khóa quét trong giây lát để đảm bảo nhận diện chính xác 100%.
              </AppText>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {onDismiss && !isDone && (
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Eye size={15} color={appColors.slate600} />
                <AppText style={styles.dismissBtnText}>Chạy nền</AppText>
              </TouchableOpacity>
            )}

            {isDone && (
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <ShieldCheck size={16} color={appColors.white} />
                <AppText style={styles.doneBtnText}>Bắt đầu quét ngay</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  iconGlowDone: {
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: appColors.blue600,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: appColors.blue600,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: appColors.slate900,
    textAlign: 'center',
    marginBottom: 6,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.blue700,
  },
  description: {
    fontSize: 13,
    color: appColors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 14,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: appColors.slate100,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: appColors.blue600,
    borderRadius: 5,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDetail: {
    fontSize: 12,
    fontWeight: '500',
    color: appColors.slate500,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.blue600,
  },
  currentProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: appColors.slate50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.slate200,
    marginBottom: 12,
  },
  currentProfileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
    marginRight: 6,
  },
  currentProfileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: appColors.blue700,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fffbe6',
    borderWidth: 1,
    borderColor: '#ffe58f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  warningIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#ad6800',
    lineHeight: 15,
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: appColors.slate100,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate700,
  },
  doneBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: appColors.green600,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.white,
  },
});
