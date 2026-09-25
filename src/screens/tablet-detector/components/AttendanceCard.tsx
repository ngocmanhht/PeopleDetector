import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { AppText } from '../../../components/app-text';
import { DetectionResult } from '../../../model/detector';
import { CheckCircle2, AlertCircle, UserX } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';

interface AttendanceCardProps {
  detection: DetectionResult | null;
  isSessionActive: boolean;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  detection,
  isSessionActive,
}) => {
  if (!isSessionActive) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <UserX size={48} color={appColors.slate400} />
        <AppText style={styles.emptyTitle}>Phiên điểm danh chưa bắt đầu</AppText>
        <AppText style={styles.emptySubtitle}>
          Vui lòng nhấn "Bắt đầu phiên" để camera quét và nhận diện khuôn mặt.
        </AppText>
      </View>
    );
  }

  if (!detection) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
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
    <View style={styles.container}>
      {/* Top Row: Avatar & Status Badge */}
      <View style={styles.avatarRow}>
        {detection.avatarUri ? (
          <Image
            source={{ uri: detection.avatarUri }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarImage, styles.placeholderAvatar]}>
            <AppText style={styles.placeholderText}>
              {(detection.fullName || 'N')[0]}
            </AppText>
          </View>
        )}

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
        <AppText style={styles.fullName}>{detection.fullName}</AppText>
        <AppText style={styles.codeText}>{detection.code}</AppText>

        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Khu: </AppText>
            <AppText style={styles.detailValueBold}>{detection.zoneName}</AppText>
            <AppText style={styles.detailDivider}> | </AppText>
            <AppText style={styles.detailLabel}>Phòng: </AppText>
            <AppText style={styles.detailValueBold}>{detection.roomName}</AppText>
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
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
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
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: appColors.slate200,
    backgroundColor: appColors.slate50,
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: appColors.slate600,
    fontWeight: '500',
  },
  detailValueBold: {
    fontSize: 16,
    color: appColors.slate900,
    fontWeight: '700',
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
