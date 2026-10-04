import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../../../components/app-text';
import { List, Bell, History, Lock, Unlock } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';

interface BottomActionsProps {
  onOpenList: () => void;
  onOpenSessionsHistory?: () => void;
  onOpenAlerts: () => void;
  unreadAlertsCount?: number;
  onOpenKioskModal?: () => void;
  isKioskActive?: boolean;
}

export const BottomActions: React.FC<BottomActionsProps> = ({
  onOpenList,
  onOpenSessionsHistory,
  onOpenAlerts,
  unreadAlertsCount = 0,
  onOpenKioskModal,
  isKioskActive = false,
}) => {
  return (
    <View style={styles.container}>
      {/* Hàng 1: Danh sách + Lịch sử phiên */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onOpenList}
          activeOpacity={0.75}
        >
          <View style={styles.iconWrap}>
            <List size={16} color={appColors.slate700} />
          </View>
          <AppText
            style={styles.btnText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Danh sách
          </AppText>
        </TouchableOpacity>

        {Boolean(onOpenSessionsHistory) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onOpenSessionsHistory}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, styles.historyIconWrap]}>
              <History size={16} color={appColors.blue600} />
            </View>
            <AppText
              style={[styles.btnText, { color: appColors.blue700 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Lịch sử phiên
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Hàng 2: Cảnh báo + Kiosk */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onOpenAlerts}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.iconWrap,
              unreadAlertsCount > 0 && styles.alertIconWrap,
            ]}
          >
            <Bell
              size={16}
              color={
                unreadAlertsCount > 0
                  ? appColors.amber600
                  : appColors.slate700
              }
            />
            {unreadAlertsCount > 0 && (
              <View style={styles.alertBadge}>
                <AppText style={styles.alertBadgeText}>
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </AppText>
              </View>
            )}
          </View>
          <AppText
            style={[
              styles.btnText,
              unreadAlertsCount > 0 && { color: appColors.amber800 },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Cảnh báo
          </AppText>
        </TouchableOpacity>

        {Boolean(onOpenKioskModal) && (
          <TouchableOpacity
            style={[styles.actionBtn, isKioskActive && styles.kioskActiveBtn]}
            onPress={onOpenKioskModal}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconWrap,
                isKioskActive && styles.kioskActiveIconWrap,
              ]}
            >
              {isKioskActive ? (
                <Lock size={16} color={appColors.red600} />
              ) : (
                <Unlock size={16} color={appColors.slate700} />
              )}
            </View>
            <AppText
              style={[
                styles.btnText,
                isKioskActive && {
                  color: appColors.red600,
                  fontWeight: '700',
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isKioskActive ? 'Thoát Kiosk' : 'Kiosk'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    backgroundColor: appColors.white,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: appColors.slate200,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    paddingHorizontal: 8,
  },
  kioskActiveBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  historyIconWrap: {
    // optional tint container
  },
  alertIconWrap: {
    // optional tint container
  },
  kioskActiveIconWrap: {
    // optional tint container
  },
  btnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: appColors.slate800,
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: appColors.red500,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: appColors.white,
  },
  alertBadgeText: {
    color: appColors.white,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
