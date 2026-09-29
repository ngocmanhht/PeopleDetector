import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { AppText } from '../../../components/app-text';
import { DetectionResult } from '../../../model/detector';
import { CheckCircle2, AlertCircle, UserX } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { appUtils } from '../../../utils';

interface AttendanceCardProps {
  detection: DetectionResult | null;
  isSessionActive: boolean;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  detection,
  isSessionActive,
}) => {
  const { isPhone } = useResponsive();
  if (!isSessionActive) {
    return (
      <View
        style={[
          styles.container,
          isPhone && styles.containerPhone,
          styles.emptyContainer,
          isPhone && styles.emptyContainerPhone,
        ]}
      >
        <UserX size={isPhone ? 38 : 48} color={appColors.slate400} />
        <AppText style={styles.emptyTitle}>Phiên điểm danh chưa bắt đầu</AppText>
        <AppText style={styles.emptySubtitle}>
          Vui lòng nhấn "Bắt đầu phiên" để camera quét và nhận diện khuôn mặt.
        </AppText>
      </View>
    );
  }

  if (!detection) {
    return (
      <View
        style={[
          styles.container,
          isPhone && styles.containerPhone,
          styles.emptyContainer,
          isPhone && styles.emptyContainerPhone,
        ]}
      >
        <View style={styles.scanningPlaceholder}>
          <AppText style={styles.scanningText}>Đang quét khuôn mặt...</AppText>
        </View>
        <AppText style={styles.emptySubtitle}>
          Đưa khuôn mặt vào giữa khung camera để hệ thống AI nhận diện.
        </AppText>
      </View>
    );
  }

  const isVerified = detection.status === 'present';

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      {/* Top Row: Avatar & Status Badge */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrapper}>
          {detection.avatarUri ? (
            <Image
              source={{ uri: appUtils.getUrlImage(detection.avatarUri) }}
              style={[styles.avatarImage, isPhone && styles.avatarImagePhone]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.avatarImage,
                isPhone && styles.avatarImagePhone,
                styles.placeholderAvatar,
              ]}
            >
              <AppText style={styles.placeholderText}>
                {(detection.fullName || 'N')[0]}
              </AppText>
            </View>
          )}
          <View style={styles.scannedBadge}>
            <AppText style={styles.scannedBadgeText}>Ảnh quét camera</AppText>
          </View>
        </View>

        <View style={styles.badgeWrapper}>
          {isVerified ? (
            <View style={styles.verifiedBadge}>
              <CheckCircle2 size={20} color={appColors.green600} />
              <AppText style={styles.verifiedBadgeText}>Đã điểm danh</AppText>
            </View>
          ) : (
            <View style={styles.warningBadge}>
              <AlertCircle size={20} color={appColors.red600} />
              <AppText style={styles.warningBadgeText}>Cần xác minh</AppText>
            </View>
          )}
        </View>
      </View>

      {/* User Information */}
      <View style={styles.infoSection}>
        <AppText style={styles.fullName} numberOfLines={2} ellipsizeMode="tail">
          {detection.fullName}
        </AppText>
        <AppText style={styles.codeText} numberOfLines={1}>
          {detection.code}
        </AppText>

        <View style={styles.detailList}>
          <View style={styles.detailLocationRow}>
            <View style={styles.detailLocationItem}>
              <AppText style={styles.detailLabel}>Khu: </AppText>
              <AppText
                style={styles.detailValueBold}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {detection.zoneName}
              </AppText>
            </View>
            <View style={styles.detailLocationItem}>
              <AppText style={styles.detailLabel}>Phòng: </AppText>
              <AppText
                style={styles.detailValueBold}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {detection.roomName}
              </AppText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Confidence: </AppText>
            <AppText style={styles.confidenceText}>
              {detection.confidence}%
            </AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Thời gian: </AppText>
            <AppText style={styles.detailValue}>{detection.timestamp}</AppText>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: appColors.slate200,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 320,
  },
  containerPhone: {
    padding: 14,
    minHeight: 180,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyContainerPhone: {
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: appColors.slate700,
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: appColors.slate500,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  scanningPlaceholder: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: appColors.slate100,
    marginBottom: 12,
  },
  scanningText: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.sky600,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: appColors.slate200,
    backgroundColor: appColors.slate50,
  },
  avatarImagePhone: {
    width: 88,
    height: 88,
    borderRadius: 14,
  },
  scannedBadge: {
    position: 'absolute',
    bottom: -6,
    left: 8,
    right: 8,
    backgroundColor: appColors.slate800,
    borderRadius: 6,
    paddingVertical: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.slate600,
  },
  scannedBadgeText: {
    color: appColors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  placeholderAvatar: {
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: appColors.blue200,
  },
  placeholderText: {
    fontSize: 42,
    fontWeight: '800',
    color: appColors.blue600,
  },
  badgeWrapper: {
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.green50,
    borderColor: appColors.green300,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    alignSelf: 'flex-start',
    gap: 8,
  },
  verifiedBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.green700,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.red50,
    borderColor: appColors.red300,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    alignSelf: 'flex-start',
    gap: 8,
  },
  warningBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.red700,
  },
  infoSection: {
    marginTop: 4,
  },
  fullName: {
    fontSize: 26,
    fontWeight: '800',
    color: appColors.slate900,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.slate500,
    marginBottom: 16,
  },
  detailList: {
    gap: 8,
  },
  detailLocationRow: {
    gap: 6,
  },
  detailLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: appColors.slate600,
    fontWeight: '500',
    flexShrink: 0,
  },
  detailValueBold: {
    fontSize: 16,
    color: appColors.slate900,
    fontWeight: '700',
    flexShrink: 1,
  },
  detailDivider: {
    fontSize: 16,
    color: appColors.slate300,
    marginHorizontal: 4,
  },
  confidenceText: {
    fontSize: 17,
    fontWeight: '800',
    color: appColors.emerald600,
  },
  detailValue: {
    fontSize: 16,
    color: appColors.slate900,
    fontWeight: '600',
  },
});
