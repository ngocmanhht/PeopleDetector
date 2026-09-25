import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { X, AlertTriangle, AlertCircle, Info, Trash2 } from 'lucide-react-native';
import { clearAlerts } from '../../../store/slices/detectorSlice';
import { appColors } from '../../../const/app-colors';

interface AlertsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  visible,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const alerts = useAppSelector(state => state.detector.alerts);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <AppText style={styles.title}>Nhật ký Cảnh báo & Sự kiện</AppText>
              <AppText style={styles.subtitle}>
                Các trường hợp độ tin cậy thấp hoặc người lạ xuất hiện trong phiên
              </AppText>
            </View>

            <View style={styles.headerActions}>
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
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={22} color={appColors.slate500} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Alerts list */}
          <FlatList
            data={alerts}
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
                  <View style={styles.iconWrap}>
                    {isWarning ? (
                      <AlertTriangle size={20} color={appColors.amber600} />
                    ) : isError ? (
                      <AlertCircle size={20} color={appColors.red600} />
                    ) : (
                      <Info size={20} color={appColors.blue600} />
                    )}
                  </View>
                  <View style={styles.contentWrap}>
                    <View style={styles.titleRow}>
                      <AppText style={styles.alertTitle}>{item.title}</AppText>
                      <AppText style={styles.alertTime}>{item.timestamp}</AppText>
                    </View>
                    <AppText style={styles.alertMessage}>{item.message}</AppText>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppText style={styles.emptyText}>
                  Không có cảnh báo nào trong phiên làm việc này.
                </AppText>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appColors.overlayDark65,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    width: '75%',
    maxHeight: '85%',
    padding: 24,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.red50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  clearBtnText: {
    color: appColors.red600,
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  list: {
    gap: 10,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: appColors.blue50,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: appColors.blue200,
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
    marginTop: 2,
  },
  contentWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate900,
  },
  alertTime: {
    fontSize: 12,
    color: appColors.slate500,
    fontWeight: '500',
  },
  alertMessage: {
    fontSize: 13,
    color: appColors.slate700,
    lineHeight: 18,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: appColors.slate500,
    fontSize: 14,
  },
});
