import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { addAlert, clearAlerts } from '../../store/slices/detectorSlice';
import { appColors } from '../../const/app-colors';

export const AlertsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const alerts = useAppSelector(state => state.detector.alerts);

  const [activeFilter, setActiveFilter] = useState<'all' | 'warning' | 'error' | 'info'>('all');

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'all') return true;
    return a.type === activeFilter;
  });

  const handleSimulateAlert = () => {
    const types: Array<'warning' | 'error' | 'info'> = ['warning', 'info', 'error'];
    const selectedType = types[Math.floor(Math.random() * types.length)];

    const titles = {
      warning: 'Cảnh báo khuôn mặt không khớp',
      error: 'Lỗi khung hình camera',
      info: 'Ghi nhận điểm danh mới',
    };

    const messages = {
      warning: 'Phát hiện đối tượng chưa đăng ký trong danh sách phòng A01',
      error: 'FPS sụt giảm bất thường, độ phân giải điều chỉnh tự động',
      info: 'Học viên vừa hoàn tất điểm danh thành công với độ tin cậy 99%',
    };

    dispatch(
      addAlert({
        title: titles[selectedType],
        message: messages[selectedType],
        timestamp: dayjs().format('HH:mm:ss'),
        type: selectedType,
      })
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Bell size={26} color={appColors.red600} />
            <AppText style={styles.title}>Nhật ký Cảnh báo & Sự kiện AI</AppText>
          </View>
          <AppText style={styles.subtitle}>
            Theo dõi tất cả các phát hiện bất thường, lỗi hệ thống và nhật ký điểm danh
          </AppText>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleSimulateAlert}
            activeOpacity={0.8}
          >
            <Plus size={16} color={appColors.blue600} />
            <AppText style={styles.testBtnText}>Tạo cảnh báo test</AppText>
          </TouchableOpacity>

          {alerts.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => dispatch(clearAlerts())}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color={appColors.red600} />
              <AppText style={styles.clearBtnText}>Xóa tất cả</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'warning', 'error', 'info'] as const).map(tab => {
          const isSelected = activeFilter === tab;
          const labels = {
            all: `Tất cả (${alerts.length})`,
            warning: `Cảnh báo (${alerts.filter(a => a.type === 'warning').length})`,
            error: `Lỗi (${alerts.filter(a => a.type === 'error').length})`,
            info: `Thông tin (${alerts.filter(a => a.type === 'info').length})`,
          };

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}
            >
              <AppText
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextActive,
                ]}
              >
                {labels[tab]}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isWarning = item.type === 'warning';
          const isError = item.type === 'error';

          return (
            <View
              style={[
                styles.alertCard,
                isWarning && styles.warningCard,
                isError && styles.errorCard,
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  isWarning && styles.warningIconWrap,
                  isError && styles.errorIconWrap,
                ]}
              >
                {isWarning ? (
                  <AlertTriangle size={22} color={appColors.amber600} />
                ) : isError ? (
                  <AlertCircle size={22} color={appColors.red600} />
                ) : (
                  <Info size={22} color={appColors.blue600} />
                )}
              </View>

              <View style={styles.alertContent}>
                <View style={styles.cardTopRow}>
                  <AppText style={styles.alertTitle}>{item.title}</AppText>
                  <AppText style={styles.alertTime}>{item.timestamp}</AppText>
                </View>
                <AppText style={styles.alertMessage}>{item.message}</AppText>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell size={48} color={appColors.slate300} />
            <AppText style={styles.emptyTitle}>
              Không có sự kiện hoặc cảnh báo nào
            </AppText>
            <AppText style={styles.emptyDesc}>
              Hệ thống vận hành bình thường. Mọi sự cố bất thường sẽ được ghi nhận tại đây.
            </AppText>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.slate50,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: appColors.white,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  testBtnText: {
    color: appColors.blue600,
    fontSize: 13,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.red50,
    borderWidth: 1,
    borderColor: appColors.red200,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  clearBtnText: {
    color: appColors.red600,
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  filterChipActive: {
    backgroundColor: appColors.blue600,
    borderColor: appColors.blue600,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate500,
  },
  filterTextActive: {
    color: appColors.white,
    fontWeight: '700',
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: appColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 14,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  warningCard: {
    backgroundColor: appColors.amber50,
    borderColor: appColors.amber200,
  },
  errorCard: {
    backgroundColor: appColors.red50,
    borderColor: appColors.red200,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIconWrap: {
    backgroundColor: appColors.amber100,
  },
  errorIconWrap: {
    backgroundColor: appColors.red100,
  },
  alertContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate900,
  },
  alertTime: {
    fontSize: 12,
    color: appColors.slate500,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 13,
    color: appColors.slate700,
    lineHeight: 19,
  },
  emptyContainer: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate700,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 4,
  },
});
