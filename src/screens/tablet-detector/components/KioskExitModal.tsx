import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import {
  Lock,
  Unlock,
  X,
  KeyRound,
  AlertCircle,
  Delete,
  ShieldCheck,
} from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { kioskService, DEFAULT_ADMIN_PIN } from '../../../services/kiosk-service';
import { useAppToast } from '../../../hooks/use-app-toast';

interface KioskExitModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const KioskExitModal: React.FC<KioskExitModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { showSuccessToast, showErrorToast } = useAppToast();
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMessage('');
      kioskService.isDeviceOwner().then(setIsOwner).catch(() => setIsOwner(false));
    }
  }, [visible]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
      setErrorMessage('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
  };

  const handleConfirmExit = useCallback(async () => {
    if (!pin) {
      setErrorMessage('Vui lòng nhập mã PIN Quản trị viên!');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const isValid = kioskService.verifyAdminPin(pin);
      if (!isValid) {
        setErrorMessage('Mã PIN không chính xác! Vui lòng thử lại.');
        setLoading(false);
        return;
      }

      const stopped = await kioskService.stopKioskMode();
      setLoading(false);

      if (stopped) {
        showSuccessToast(
          'Đã thoát Kiosk Mode',
          'Đã mở khóa màn hình Samsung Tablet thành công.',
        );
      } else {
        showSuccessToast(
          'Đã mở khóa',
          'Thiết bị đã thoát khỏi chế độ ghim màn hình.',
        );
      }

      onSuccess?.();
      onClose();
    } catch {
      setLoading(false);
      showErrorToast('Lỗi thoát Kiosk', 'Không thể dừng chế độ LockTask.');
    }
  }, [pin, onSuccess, onClose, showSuccessToast, showErrorToast]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Lock size={22} color={appColors.red500} />
              </View>
              <View>
                <AppText style={styles.title}>Thoát Chế Độ Kiosk</AppText>
                <AppText style={styles.subtitle}>
                  {isOwner
                    ? 'Samsung Tablet • Device Owner Mode'
                    : 'Samsung Tablet • Screen Pinning Mode'}
                </AppText>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.promptBox}>
            <KeyRound size={18} color={appColors.blue600} />
            <AppText style={styles.promptText}>
              Nhập mã PIN Quản trị viên (mặc định: {DEFAULT_ADMIN_PIN}) để mở khóa hệ thống.
            </AppText>
          </View>

          {/* PIN Display */}
          <View style={styles.pinDisplayContainer}>
            <View style={styles.pinDotsRow}>
              {[0, 1, 2, 3, 4, 5].map(idx => {
                const filled = pin.length > idx;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.pinDot,
                      filled && styles.pinDotFilled,
                      errorMessage ? styles.pinDotError : null,
                    ]}
                  >
                    {filled ? (
                      <AppText style={styles.pinDotText}>●</AppText>
                    ) : (
                      <View style={styles.pinDotInner} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Hidden / Native TextInput for hardware keyboard input */}
            <TextInput
              value={pin}
              onChangeText={val => {
                setPin(val.slice(0, 8));
                setErrorMessage('');
              }}
              keyboardType="number-pad"
              maxLength={8}
              secureTextEntry
              style={styles.hiddenInput}
              autoFocus
            />
          </View>

          {/* Error Message */}
          {Boolean(errorMessage) && (
            <View style={styles.errorContainer}>
              <AlertCircle size={15} color={appColors.red500} />
              <AppText style={styles.errorText}>{errorMessage}</AppText>
            </View>
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['C', '0', 'DEL'],
            ].map((row, rIdx) => (
              <View key={`row-${rIdx}`} style={styles.keypadRow}>
                {row.map(k => {
                  if (k === 'C') {
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[styles.keyBtn, styles.keyBtnSpecial]}
                        onPress={handleClear}
                        activeOpacity={0.7}
                      >
                        <AppText style={styles.keyBtnSpecialText}>Xóa hết</AppText>
                      </TouchableOpacity>
                    );
                  }
                  if (k === 'DEL') {
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[styles.keyBtn, styles.keyBtnSpecial]}
                        onPress={handleBackspace}
                        activeOpacity={0.7}
                      >
                        <Delete size={20} color={appColors.slate700} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={k}
                      style={styles.keyBtn}
                      onPress={() => handleKeyPress(k)}
                      activeOpacity={0.7}
                    >
                      <AppText style={styles.keyBtnText}>{k}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.8}
            >
              <AppText style={styles.cancelBtnText}>Hủy bỏ</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.btnDisabled]}
              onPress={handleConfirmExit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={appColors.white} size="small" />
              ) : (
                <>
                  <Unlock size={18} color={appColors.white} />
                  <AppText style={styles.confirmBtnText}>Xác nhận Thoát</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Status footer */}
          <View style={styles.footerNote}>
            <ShieldCheck size={14} color={appColors.slate400} />
            <AppText style={styles.footerNoteText}>
              Bảo mật thiết bị Samsung Tablet • PeopleDetector Kiosk Lock
            </AppText>
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
    maxWidth: 420,
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
  },
  promptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: appColors.blue50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: appColors.blue100,
  },
  promptText: {
    fontSize: 12,
    color: appColors.blue900,
    flex: 1,
    lineHeight: 16,
  },
  pinDisplayContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  pinDot: {
    width: 38,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: appColors.slate300,
    backgroundColor: appColors.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDotFilled: {
    borderColor: appColors.blue600,
    backgroundColor: appColors.blue50,
  },
  pinDotError: {
    borderColor: appColors.red500,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  pinDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.slate300,
  },
  pinDotText: {
    fontSize: 18,
    color: appColors.blue600,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.01,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.red500,
  },
  keypad: {
    gap: 10,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyBtn: {
    flex: 1,
    height: 50,
    backgroundColor: appColors.slate100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyBtnSpecial: {
    backgroundColor: appColors.slate200,
  },
  keyBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: appColors.slate900,
  },
  keyBtnSpecialText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate700,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.slate300,
    backgroundColor: appColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.slate700,
  },
  confirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: appColors.red600,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: appColors.red600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  footerNoteText: {
    fontSize: 11,
    color: appColors.slate400,
  },
});
