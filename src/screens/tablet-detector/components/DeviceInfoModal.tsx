import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  ScrollView,
  Platform,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import {
  Tablet,
  Copy,
  RefreshCw,
  X,
  ShieldCheck,
  AlertTriangle,
  Lock,
  ShieldAlert,
} from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { deviceIdService } from '../../../services/device-id-service';
import { deviceService, DeviceStatusResponse } from '../../../services/api';
import { useAppToast } from '../../../hooks/use-app-toast';
import { useAppDispatch } from '../../../store/hooks';
import { setDeviceAuthorized } from '../../../store/slices/detectorSlice';

interface DeviceInfoModalProps {
  visible: boolean;
  onClose?: () => void;
  isLocked?: boolean;
  lockMessage?: string;
  onUnlocked?: () => void;
}

export const DeviceInfoModal: React.FC<DeviceInfoModalProps> = ({
  visible,
  onClose,
  isLocked = false,
  lockMessage,
  onUnlocked,
}: DeviceInfoModalProps) => {
  const dispatch = useAppDispatch();
  const { showSuccessToast, showErrorToast, showWarnToast } = useAppToast();
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceModel, setDeviceModel] = useState<string>('');
  const [status, setStatus] = useState<DeviceStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadDeviceInfo = useCallback(async () => {
    const id = deviceIdService.getDeviceId();
    const model = deviceIdService.getDeviceModel();
    setDeviceId(id);
    setDeviceModel(model);

    setLoading(true);
    try {
      const res = await deviceService.checkStatus(id);
      setStatus(res);
      if (res?.allowed) {
        dispatch(setDeviceAuthorized({ authorized: true }));
        onUnlocked?.();
      } else {
        dispatch(
          setDeviceAuthorized({
            authorized: false,
            message: res?.message || 'Thiết bị chưa được cấp quyền',
          }),
        );
      }
    } catch (err: unknown) {
      const errMsg =
        (err as Error)?.message ||
        'Không thể kết nối đến máy chủ kiểm tra thiết bị';
      setStatus({
        allowed: false,
        deviceId: id,
        message: errMsg,
      });
      dispatch(setDeviceAuthorized({ authorized: false, message: errMsg }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, onUnlocked]);

  useEffect(() => {
    if (visible) {
      loadDeviceInfo();
    }
  }, [visible, loadDeviceInfo]);

  const handleManualCheck = async () => {
    setLoading(true);
    try {
      const id = deviceId || deviceIdService.getDeviceId();
      const res = await deviceService.checkStatus(id);
      setStatus(res);

      if (res?.allowed) {
        dispatch(setDeviceAuthorized({ authorized: true }));
        showSuccessToast(
          'Cấp quyền thành công',
          `Thiết bị "${res.deviceName || id}" đã được kích hoạt!`,
        );
        onUnlocked?.();
        onClose?.();
      } else {
        dispatch(
          setDeviceAuthorized({
            authorized: false,
            message: res?.message,
          }),
        );
        showWarnToast(
          'Chưa được cấp quyền',
          res?.message ||
            'Vui lòng cấu hình Device ID này trên Web CMS trước khi thử lại.',
        );
      }
    } catch (err: unknown) {
      showErrorToast(
        'Lỗi kiểm tra',
        (err as Error)?.message || 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await Share.share({
        message: deviceId,
        title: 'Mã thiết bị People Detector',
      });
      showSuccessToast('Đã mở chia sẻ', 'Sao chép mã thiết bị thành công!');
    } catch (err: unknown) {
      showErrorToast(
        'Lỗi chia sẻ',
        (err as Error)?.message || 'Không thể sao chép',
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={[
        'portrait',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      statusBarTranslucent
      onRequestClose={isLocked ? () => {} : onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, isLocked && styles.cardLocked]}>
          {/* Header */}
          <View style={[styles.header, isLocked && styles.headerLocked]}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconCircle,
                  isLocked && styles.iconCircleLocked,
                ]}
              >
                {isLocked ? (
                  <ShieldAlert size={22} color={appColors.rose600} />
                ) : (
                  <Tablet size={22} color={appColors.blue600} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  style={[styles.title, isLocked && styles.titleLocked]}
                  numberOfLines={1}
                >
                  {isLocked
                    ? 'Thiết bị chưa được cấp quyền'
                    : 'Định danh thiết bị'}
                </AppText>
                <AppText style={styles.subtitle}>
                  {isLocked
                    ? 'Ứng dụng đã tạm khóa toàn bộ thao tác'
                    : deviceModel}
                </AppText>
              </View>
            </View>

            {!isLocked && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={appColors.slate500} />
              </TouchableOpacity>
            )}
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Warning Banner in locked mode */}
            {isLocked && (
              <View style={styles.lockedBanner}>
                <View style={styles.lockedBannerIconRow}>
                  <Lock size={18} color={appColors.rose600} />
                  <AppText style={styles.lockedBannerTitle}>
                    YÊU CẦU CẤP QUYỀN TRÊN CMS
                  </AppText>
                </View>
                <AppText style={styles.lockedBannerDesc}>
                  {lockMessage ||
                    status?.message ||
                    'Máy tính bảng/Điện thoại này chưa nằm trong danh sách cho phép (Allowed Devices). Toàn bộ chức năng điểm danh và quét camera đã bị khóa để đảm bảo an ninh.'}
                </AppText>
              </View>
            )}

            {/* Device ID Box */}
            <View style={styles.idBox}>
              <AppText style={styles.idLabel}>MÃ THIẾT BỊ (DEVICE ID):</AppText>
              <View style={styles.idValueRow}>
                <AppText style={styles.idValue} numberOfLines={1} selectable>
                  {deviceId || 'Đang tải...'}
                </AppText>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={handleCopy}
                  activeOpacity={0.8}
                >
                  <Copy size={16} color={appColors.blue600} />
                  <AppText style={styles.copyBtnText}>Sao chép</AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Section */}
            <View style={styles.statusBox}>
              <View style={styles.statusHeaderRow}>
                <AppText style={styles.statusLabel}>TRẠNG THÁI HỆ THỐNG:</AppText>
                {!isLocked && (
                  <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={handleManualCheck}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    {loading ? (
                      <ActivityIndicator
                        size="small"
                        color={appColors.blue600}
                      />
                    ) : (
                      <>
                        <RefreshCw size={13} color={appColors.blue600} />
                        <AppText style={styles.refreshBtnText}>
                          Kiểm tra lại
                        </AppText>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {status ? (
                status.allowed ? (
                  <View style={styles.allowedCard}>
                    <View style={styles.statusIconRow}>
                      <ShieldCheck size={20} color={appColors.emerald600} />
                      <AppText style={styles.allowedTitle}>
                        ĐÃ ĐƯỢC CẤP QUYỀN TRUY CẬP
                      </AppText>
                    </View>
                    <AppText style={styles.allowedDesc}>
                      {status.deviceName
                        ? `Tên máy: ${status.deviceName}`
                        : 'Thiết bị đã được cấu hình trong danh sách cho phép (Allowed Devices).'}
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.unauthorizedCard}>
                    <View style={styles.statusIconRow}>
                      <AlertTriangle size={20} color={appColors.rose600} />
                      <AppText style={styles.unauthorizedTitle}>
                        CHƯA ĐƯỢC CẤP QUYỀN HOẶC ĐÃ BỊ KHÓA
                      </AppText>
                    </View>
                    <AppText style={styles.unauthorizedDesc}>
                      {status.message ||
                        'Vui lòng sao chép mã thiết bị trên và nhờ Quản trị viên thêm vào trang Quản lý thiết bị trên Web CMS.'}
                    </AppText>
                  </View>
                )
              ) : null}
            </View>

            {/* Instructions */}
            <View style={styles.noteBox}>
              <AppText style={styles.noteTitle}>💡 Cách kích hoạt thiết bị:</AppText>
              <AppText style={styles.noteText}>
                1. Nhấn nút "Sao chép" để lấy mã thiết bị.{'\n'}
                2. Mở Web CMS Quản trị → Vào mục "Quản lý thiết bị".{'\n'}
                3. Bấm "Thêm thiết bị", dán mã này vào và bật kích hoạt.{'\n'}
                4. Nhấn nút "Kiểm tra lại quyền truy cập" bên dưới để mở khóa ứng dụng.
              </AppText>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {isLocked ? (
              <TouchableOpacity
                style={[styles.recheckPrimaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleManualCheck}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={appColors.white} />
                ) : (
                  <>
                    <RefreshCw size={17} color={appColors.white} />
                    <AppText style={styles.recheckPrimaryBtnText}>
                      Kiểm tra lại quyền truy cập
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <AppText style={styles.doneBtnText}>Đóng</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: appColors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  cardLocked: {
    borderWidth: 2,
    borderColor: appColors.rose500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  headerLocked: {
    backgroundColor: appColors.rose50,
    borderBottomColor: appColors.rose200,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: appColors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleLocked: {
    backgroundColor: appColors.rose100,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: appColors.slate900,
  },
  titleLocked: {
    color: appColors.rose900,
  },
  subtitle: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  lockedBanner: {
    backgroundColor: appColors.rose50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.rose200,
    padding: 12,
    gap: 4,
  },
  lockedBannerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: appColors.rose700,
    letterSpacing: 0.5,
  },
  lockedBannerDesc: {
    fontSize: 12,
    color: appColors.rose900,
    lineHeight: 18,
  },
  idBox: {
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: appColors.slate200,
    padding: 14,
  },
  idLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate500,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  idValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  idValue: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate900,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appColors.blue50,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue700,
  },
  statusBox: {
    gap: 8,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate500,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.blue600,
  },
  allowedCard: {
    backgroundColor: appColors.emerald50,
    borderWidth: 1,
    borderColor: appColors.emerald200,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statusIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allowedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.emerald700,
  },
  allowedDesc: {
    fontSize: 12,
    color: appColors.emerald800,
    lineHeight: 18,
  },
  unauthorizedCard: {
    backgroundColor: appColors.rose50,
    borderWidth: 1,
    borderColor: appColors.rose200,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  unauthorizedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.rose700,
  },
  unauthorizedDesc: {
    fontSize: 12,
    color: appColors.rose800,
    lineHeight: 18,
  },
  noteBox: {
    backgroundColor: appColors.slate50,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.slate700,
  },
  noteText: {
    fontSize: 11,
    color: appColors.slate600,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
  },
  recheckPrimaryBtn: {
    backgroundColor: appColors.blue600,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: appColors.blue600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  recheckPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.white,
  },
  doneBtn: {
    backgroundColor: appColors.slate900,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.white,
  },
});
