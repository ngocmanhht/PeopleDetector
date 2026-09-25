import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/app-text';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';

interface StatsBarProps {
  presentCount: number;
  missingCount: number;
  verifyCount: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  presentCount,
  missingCount,
  verifyCount,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Đã có (Present) */}
      <View style={[styles.statCard, styles.presentCard]}>
        <View style={styles.titleRow}>
          <CheckCircle2 size={16} color={appColors.green600} />
          <AppText style={[styles.statLabel, { color: appColors.green600 }]}>
            Đã có
          </AppText>
        </View>
        <AppText style={[styles.statValue, { color: appColors.green600 }]}>
          {presentCount}
        </AppText>
      </View>

      {/* 2. Còn thiếu (Missing) */}
      <View style={[styles.statCard, styles.missingCard]}>
        <View style={styles.titleRow}>
          <AlertTriangle size={16} color={appColors.amber600} />
          <AppText style={[styles.statLabel, { color: appColors.amber600 }]}>
            Còn thiếu
          </AppText>
        </View>
        <AppText style={[styles.statValue, { color: appColors.amber600 }]}>
          {missingCount}
        </AppText>
      </View>

      {/* 3. Cần xác minh (Verify) */}
      <View style={[styles.statCard, styles.verifyCard]}>
        <View style={styles.titleRow}>
          <AlertCircle size={16} color={appColors.red600} />
          <AppText style={[styles.statLabel, { color: appColors.red600 }]}>
            Cần xác minh
          </AppText>
        </View>
        <AppText style={[styles.statValue, { color: appColors.red600 }]}>
          {verifyCount}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: appColors.white,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.slate100,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  presentCard: {
    backgroundColor: appColors.green50,
    borderColor: appColors.green200,
  },
  missingCard: {
    backgroundColor: appColors.amber50,
    borderColor: appColors.amber200,
  },
  verifyCard: {
    backgroundColor: appColors.red50,
    borderColor: appColors.red200,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
