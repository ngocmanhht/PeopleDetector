import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../../../components/app-text';
import { List, Bell, History } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';

interface BottomActionsProps {
  onOpenList: () => void;
  onOpenSessionsHistory?: () => void;
  onOpenAlerts: () => void;
  unreadAlertsCount?: number;
}

export const BottomActions: React.FC<BottomActionsProps> = ({
  onOpenList,
  onOpenSessionsHistory,
  onOpenAlerts,
  unreadAlertsCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenList}
        activeOpacity={0.8}
      >
        <List size={18} color={appColors.slate800} />
        <AppText style={styles.btnText}>Danh sách</AppText>
      </TouchableOpacity>

      {Boolean(onOpenSessionsHistory) && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onOpenSessionsHistory}
          activeOpacity={0.8}
        >
          <History size={18} color={appColors.blue600} />
          <AppText style={[styles.btnText, { color: appColors.blue700 }]}>
            Lịch sử phiên
          </AppText>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenAlerts}
        activeOpacity={0.8}
      >
        <Bell size={18} color={appColors.slate800} />
        <AppText style={styles.btnText}>Cảnh báo</AppText>
        {unreadAlertsCount > 0 && (
          <View style={styles.alertBadge}>
            <AppText style={styles.alertBadgeText}>{unreadAlertsCount}</AppText>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    backgroundColor: appColors.white,
    borderRadius: 12,
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
    position: 'relative',
    paddingHorizontal: 4,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate800,
  },
  alertBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: appColors.red500,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: appColors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
