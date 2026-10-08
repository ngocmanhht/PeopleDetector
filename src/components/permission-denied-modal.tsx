import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Share,
} from 'react-native';
import { AppText } from './app-text';
import {
  ShieldAlert,
  Lock,
  Copy,
  X,
  Tablet,
  AlertCircle,
} from 'lucide-react-native';
import { appColors } from '../const/app-colors';
import { useResponsive } from '../hooks/use-responsive';
import { useAppToast } from '../hooks/use-app-toast';

export type PermissionDeniedType =
  | 'device_unauthorized'
  | 'role_forbidden'
  | 'zone_restricted'
  | 'general';

export interface PermissionDeniedModalProps {
  visible: boolean;
  type?: PermissionDeniedType;
  title?: string;
  message?: string;
  deviceId?: string;
  userRole?: string;
  onClose: () => void;
  onOpenDeviceInfo?: () => void;
}

export const PermissionDeniedModal: React.FC<PermissionDeniedModalProps> = ({
  visible,
  type = 'general',
  title,
  message,
  deviceId,
  userRole,
  onClose,
  onOpenDeviceInfo,
}) => {
  const { isPhone } = useResponsive();
  const { showSuccessToast, showErrorToast } = useAppToast();

  const isDeviceError =
    type === 'device_unauthorized' ||
    Boolean(message?.includes('Thiết bị') || message?.includes('DEVICE_UNAUTHORIZED') || message?.includes('KIOSK'));

  const resolvedTitle =
    title ||
    (isDeviceError
      ? 'Thiết bị chưa được cấp quyền'
      : type === 'zone_restricted'
      ? 'Khu vực không thuộc thẩm quyền'
      : 'Tài khoản không được phép');

  const resolvedMessage =
    message ||
    (isDeviceError
      ? 'Thiết bị này chưa nằm trong danh sách được phê duyệt (Allowed Devices) trên Web CMS. Vui lòng liên hệ Quản trị viên hệ thống để được cấp quyền trước khi tiếp tục.'
      : type === 'zone_restricted'
      ? 'Tài khoản Cán bộ khu vực chỉ được phép thao tác và mở phiên điểm danh trong khu vực được phân công quản lý.'
      : 'Tài khoản của bạn không có đủ thẩm quyền để thực hiện nghiệp vụ này theo quy định phân quyền.');

  const handleCopyDeviceId = async () => {
    if (!deviceId) return;
    try {
      await Share.share({
        message: deviceId,
        title: 'Mã định danh thiết bị (Device ID)',
      });
      showSuccessToast('Đã mở chia sẻ', 'Sao chép mã thiết bị thành công!');
    } catch (err: unknown) {
      showErrorToast('Lỗi chia sẻ', (err as Error)?.message || 'Không thể sao chép');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, isPhone && styles.cardPhone]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              {isDeviceError ? (
                <Tablet size={24} color={appColors.rose600} />
              ) : type === 'zone_restricted' ? (
                <AlertCircle size={24} color={appColors.amber600} />
              ) : (
                <ShieldAlert size={24} color={appColors.rose600} />
              )}
            </View>

            <View style={styles.headerTextCol}>
              <AppText style={styles.modalTitle} numberOfLines={2}>
                {resolvedTitle}
              </AppText>
              {userRole && (
                <View style={styles.roleBadge}>
                  <AppText style={styles.roleBadgeText}>
                    Vai trò hiện tại: {userRole}
                  </AppText>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            <View style={styles.messageBox}>
              <AppText style={styles.messageText}>
                {resolvedMessage}
              </AppText>
            </View>

            {/* If Device ID is relevant, show copy box */}
            {Boolean(deviceId) && (
              <View style={styles.deviceBox}>
                <AppText style={styles.deviceBoxLabel}>
                  MÃ THIẾT BỊ NÀY (DEVICE ID):
                </AppText>
                <View style={styles.deviceIdRow}>
                  <AppText style={styles.deviceIdText} numberOfLines={1} selectable>
                    {deviceId}
                  </AppText>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopyDeviceId}
                    activeOpacity={0.75}
                  >
                    <Copy size={15} color={appColors.blue600} />
                    <AppText style={styles.copyBtnText}>Sao chép</AppText>
                  </TouchableOpacity>
                </View>
                <AppText style={styles.deviceHint}>
                  💡 Sao chép mã này gửi cho Quản trị viên (Super Admin) để thêm vào mục "Quản lý thiết bị" trên Web CMS.
                </AppText>
              </View>
            )}
          </View>

          {/* Actions Footer */}
          <View style={styles.footer}>
            {onOpenDeviceInfo && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  onClose();
                  onOpenDeviceInfo();
                }}
                activeOpacity={0.8}
              >
                <AppText style={styles.secondaryBtnText}>
                  Xem chi tiết thiết bị
                </AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <AppText style={styles.primaryBtnText}>
                Đã hiểu
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  cardPhone: {
    maxWidth: '100%',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffe4e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9f1239',
    fontWeight: '500',
  },
  deviceBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  deviceBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  deviceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deviceIdText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#1e293b',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
    gap: 4,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.blue600,
  },
  deviceHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  primaryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: appColors.blue600,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
