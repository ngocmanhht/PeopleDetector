import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../../../components/app-text';
import { StopCircle, Play, Timer } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { ScanMode } from '../../../model/detector';
import { useAppSelector } from '../../../store/hooks';

interface SessionControlsProps {
  onStartSession?: () => void;
  onEndSession: () => void;
  isSessionActive: boolean;
  scanMode?: ScanMode;
  sessionDurationSeconds?: number;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  onStartSession,
  onEndSession,
  isSessionActive,
  scanMode = 'room',
  sessionDurationSeconds: propDuration,
}) => {
  const { isPhone } = useResponsive();
  const reduxDuration = useAppSelector(
    state => state.detector.sessionDurationSeconds,
  );
  const sessionDurationSeconds =
    propDuration !== undefined ? propDuration : reduxDuration;

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

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      {!isSessionActive ? (
        <TouchableOpacity
          style={[styles.startButton, isPhone && styles.startButtonPhone]}
          onPress={onStartSession}
          activeOpacity={0.88}
        >
          <Play
            size={isPhone ? 18 : 22}
            color={appColors.white}
            fill={appColors.white}
          />
          <AppText
            style={[styles.buttonText, isPhone && styles.buttonTextPhone]}
          >
            {scanMode === 'all' ? 'Bắt đầu quét All' : 'Bắt đầu điểm danh'}
          </AppText>
        </TouchableOpacity>
      ) : (
        <View style={styles.activeWrap}>
          <View style={[styles.timerRow, isPhone && styles.timerRowPhone]}>
            <View style={styles.timerBadge}>
              <Timer size={14} color={appColors.blue600} />
              <AppText style={styles.timerLabel}>Thời gian quét:</AppText>
              <AppText style={styles.timerValue}>{formattedDuration}</AppText>
              <View style={styles.livePulseDot} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.endButton, isPhone && styles.endButtonPhone]}
            onPress={onEndSession}
            activeOpacity={0.85}
          >
            <StopCircle size={isPhone ? 18 : 22} color={appColors.white} />
            <AppText
              style={[styles.buttonText, isPhone && styles.buttonTextPhone]}
            >
              Kết thúc quét
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 'auto',
    paddingTop: 12,
  },
  containerPhone: {
    marginTop: 8,
    paddingTop: 0,
    paddingBottom: 16,
  },
  activeWrap: {
    gap: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  timerRowPhone: {
    marginBottom: 0,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: '800',
    color: appColors.blue700,
    letterSpacing: 0.5,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: appColors.emerald500,
  },
  startButton: {
    backgroundColor: appColors.blue600,
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: appColors.blue600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  startButtonPhone: {
    height: 48,
    borderRadius: 12,
  },
  endButton: {
    backgroundColor: appColors.red500,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: appColors.red500,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  endButtonPhone: {
    height: 48,
    borderRadius: 12,
  },
  buttonText: {
    color: appColors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonTextPhone: {
    fontSize: 15,
  },
});
