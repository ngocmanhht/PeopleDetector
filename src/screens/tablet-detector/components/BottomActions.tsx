import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../../../components/app-text';
import { List, Bell } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';

interface BottomActionsProps {
  onOpenList: () => void;
  onOpenAlerts: () => void;
  unreadAlertsCount?: number;
}

export const BottomActions: React.FC<BottomActionsProps> = ({
  onOpenList,
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
        <List size={20} color={appColors.slate800} />
        <AppText style={styles.btnText}>Danh sách</AppText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenAlerts}
        activeOpacity={0.8}
      >
        <Bell size={20} color={appColors.slate800} />
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
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    backgroundColor: appColors.white,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: appColors.slate200,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate800,
  },
  alertBadge: {
    position: 'absolute',
    top: 10,
    right: 18,
    backgroundColor: appColors.red500,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: appColors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
