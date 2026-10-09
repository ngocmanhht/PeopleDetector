import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/app-text';
import { ScanHistoryItem, ScanMode } from '../../../model/detector';
import {
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Timer,
} from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { useAppSelector } from '../../../store/hooks';

interface SessionSummaryBarProps {
  isSessionActive: boolean;
  sessionDurationSeconds?: number;
  scanHistory: ScanHistoryItem[];
  scanMode: ScanMode;
  totalMembersCount: number;
  scanDirection?: 'in' | 'out';
}

export const SessionSummaryBar: React.FC<SessionSummaryBarProps> = ({
  isSessionActive,
  sessionDurationSeconds: propDuration,
  scanHistory,
  scanMode,
  totalMembersCount,
  scanDirection = 'in',
}) => {
  const { isPhone } = useResponsive();
  const reduxDuration = useAppSelector(
    state => state.detector.sessionDurationSeconds,
  );
  const sessionDurationSeconds =
    propDuration !== undefined ? propDuration : reduxDuration;
  const isAllMode = scanMode === 'all';
  const isOut = scanDirection === 'out';

  // Format Duration HH:mm:ss
  const formattedDuration = useMemo(() => {
    const hours = Math.floor(sessionDurationSeconds / 3600);
    const minutes = Math.floor((sessionDurationSeconds % 3600) / 60);
    const seconds = sessionDurationSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [sessionDurationSeconds]);

  // Aggregate stats
  const verifiedItems = useMemo(
    () => (scanHistory || []).filter(i => i && i.status === 'present'),
    [scanHistory],
  );
  const unverifiedItems = useMemo(
    () => (scanHistory || []).filter(i => i && i.status === 'verify'),
    [scanHistory],
  );

  const totalScansCount = useMemo(
    () =>
      (scanHistory || []).reduce(
        (sum, item) => sum + (item?.scanCount || 0),
        0,
      ),
    [scanHistory],
  );

  // Department Breakdown (Phòng ban breakdown)
  const departmentStats = useMemo(() => {
    const map: Record<string, number> = {};
    (verifiedItems || []).forEach(item => {
      const dept = item?.roomName ? item.roomName : 'Chưa phân phòng';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [verifiedItems]);

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      {/* 1. Header & Live Timer */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.timerBadge}>
            <Timer
              size={14}
              color={isSessionActive ? appColors.blue600 : appColors.slate500}
            />
            <AppText style={styles.timerBadgeLabel}>
              {isSessionActive ? 'THỜI GIAN QUÉT:' : 'TỔNG THỜI GIAN:'}
            </AppText>
            <AppText
              style={[
                styles.timerValue,
                isSessionActive
                  ? styles.timerValueActive
                  : styles.timerValueInactive,
              ]}
            >
              {formattedDuration}
            </AppText>
            {isSessionActive && <View style={styles.livePulseDot} />}
          </View>
        </View>
      </View>
      <View style={styles.modeTag}>
        <AppText style={styles.modeTagText}>
          {scanMode === 'all'
            ? isOut
              ? 'QUÉT ALL • RA CƠ SỞ'
              : 'QUÉT ALL • VÀO CƠ SỞ'
            : scanMode === 'zone'
            ? isOut
              ? 'THEO KHU • RA'
              : 'THEO KHU • VÀO'
            : isOut
            ? 'THEO PHÒNG • RA'
            : 'THEO PHÒNG • VÀO'}
        </AppText>
      </View>

      {/* 2. Primary KPI Stats Row */}
      <View style={styles.kpiRow}>
        {/* Đã vào cơ sở / Đã xác minh */}
        <View style={[styles.kpiCard, styles.kpiCardVerified]}>
          <View style={styles.kpiTitleRow}>
            <CheckCircle2 size={15} color={appColors.emerald700} />
            <AppText style={styles.kpiLabelVerified}>
              {isAllMode
                ? isOut
                  ? 'Đã ra cơ sở'
                  : 'Đã vào cơ sở'
                : isOut
                ? 'Đã điểm danh RA'
                : 'Đã điểm danh VÀO'}
            </AppText>
          </View>
          <View style={styles.kpiValueRow}>
            <AppText style={styles.kpiValueVerified}>
              {verifiedItems.length}
            </AppText>
            {totalMembersCount > 0 && (
              <AppText style={styles.kpiSubText}>
                / {totalMembersCount} (
                {Math.round((verifiedItems.length / totalMembersCount) * 100)}%)
              </AppText>
            )}
          </View>
        </View>

        {/* Chưa xác minh (Người lạ) */}
        <View style={[styles.kpiCard, styles.kpiCardUnverified]}>
          <View style={styles.kpiTitleRow}>
            <AlertCircle size={15} color={appColors.amber700} />
            <AppText style={styles.kpiLabelUnverified}>Chưa xác minh</AppText>
          </View>
          <View style={styles.kpiValueRow}>
            <AppText style={styles.kpiValueUnverified}>
              {unverifiedItems.length}
            </AppText>
            <AppText style={styles.kpiSubText}>người lạ</AppText>
          </View>
        </View>

        {/* Tổng lượt phát hiện */}
        <View style={[styles.kpiCard, styles.kpiCardTotal]}>
          <View style={styles.kpiTitleRow}>
            <Users size={15} color={appColors.blue700} />
            <AppText style={styles.kpiLabelTotal}>Tổng lượt quét</AppText>
          </View>
          <View style={styles.kpiValueRow}>
            <AppText style={styles.kpiValueTotal}>{totalScansCount}</AppText>
            <AppText style={styles.kpiSubText}>lượt</AppText>
          </View>
        </View>
      </View>

      {/* 3. Department Breakdown (Phòng ban Breakdown khi Quét All) */}
      {departmentStats.length > 0 && (
        <View style={styles.deptSection}>
          <View style={styles.deptTitleRow}>
            <Building2 size={13} color={appColors.slate600} />
            <AppText style={styles.deptTitle}>
              Phân bổ nhân sự đã có mặt theo phòng ban:
            </AppText>
          </View>

          <View style={styles.deptChipsWrap}>
            {departmentStats.map(([deptName, count]) => (
              <View key={deptName} style={styles.deptChip}>
                <AppText style={styles.deptChipName} numberOfLines={1}>
                  {deptName}:
                </AppText>
                <View style={styles.deptChipCountBadge}>
                  <AppText style={styles.deptChipCountText}>{count}</AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.slate200,
    marginTop: 0,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  containerPhone: {
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appColors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timerBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate600,
    letterSpacing: 0.3,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerValueActive: {
    color: appColors.blue700,
  },
  timerValueInactive: {
    color: appColors.slate600,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.emerald500,
    marginLeft: 2,
  },
  modeTag: {
    backgroundColor: appColors.blue50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  modeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: appColors.blue700,
  },
  // Primary KPI Row
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 70,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  kpiCardVerified: {
    backgroundColor: appColors.emerald50,
    borderColor: appColors.emerald200,
  },
  kpiCardUnverified: {
    backgroundColor: appColors.amber50,
    borderColor: appColors.amber200,
  },
  kpiCardTotal: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue200,
  },
  kpiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  kpiLabelVerified: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.emerald800,
  },
  kpiLabelUnverified: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.amber800,
  },
  kpiLabelTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue800,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  kpiValueVerified: {
    fontSize: 22,
    fontWeight: '800',
    color: appColors.emerald900,
  },
  kpiValueUnverified: {
    fontSize: 22,
    fontWeight: '800',
    color: appColors.amber900,
  },
  kpiValueTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: appColors.blue900,
  },
  kpiSubText: {
    fontSize: 11,
    color: appColors.slate500,
    fontWeight: '500',
  },
  // Department Breakdown
  deptSection: {
    backgroundColor: appColors.slate50,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 6,
  },
  deptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deptTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.slate700,
  },
  deptChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 5,
  },
  deptChipName: {
    fontSize: 11,
    fontWeight: '600',
    color: appColors.slate700,
    maxWidth: 140,
  },
  deptChipCountBadge: {
    backgroundColor: appColors.blue600,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  deptChipCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: appColors.white,
  },
});
