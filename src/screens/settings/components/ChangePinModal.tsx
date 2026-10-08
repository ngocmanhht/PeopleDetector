import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { KeyRound, X, Check, AlertCircle } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { kioskService } from '../../../services/kiosk-service';
import { useAppToast } from '../../../hooks/use-app-toast';

interface ChangePinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  visible,
  onClose,
  onSuccess,
}: ChangePinModalProps) => {
  const { showSuccessToast } = useAppToast();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setErrorMsg('');
      setSaving(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (!currentPin) {
      setErrorMsg('Vui lòng nhập mã PIN hiện tại.');
      return;
    }
    if (!kioskService.verifyAdminPin(currentPin)) {
      setErrorMsg('Mã PIN hiện tại không chính xác!');
      return;
    }
    if (!newPin || newPin.trim().length < 4) {
      setErrorMsg('Mã PIN mới phải có tối thiểu 4 chữ số.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('Mã PIN mới và xác nhận không khớp nhau.');
      return;
    }

    setSaving(true);
    const success = kioskService.setAdminPin(newPin);
    setSaving(false);

    if (success) {
      showSuccessToast(
        'Đã đổi mã PIN',
        'Mã PIN Quản trị viên Kiosk đã được cập nhật thành công.',
      );
      onSuccess?.();
      onClose();
    } else {
      setErrorMsg('Không thể lưu mã PIN mới. Vui lòng thử lại.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <KeyRound size={20} color={appColors.blue600} />
              </View>
              <View>
                <AppText style={styles.title}>Đổi Mã PIN Thoát Kiosk</AppText>
                <AppText style={styles.subtitle}>
                  Cập nhật mã bảo mật của Quản trị viên
                </AppText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          {Boolean(errorMsg) && (
            <View style={styles.errorBox}>
              <AlertCircle size={15} color={appColors.red500} />
              <AppText style={styles.errorText}>{errorMsg}</AppText>
            </View>
          )}

          <View style={styles.formGroup}>
            <AppText style={styles.label}>Mã PIN hiện tại:</AppText>
            <TextInput
              style={styles.input}
              value={currentPin}
              onChangeText={val => {
                setCurrentPin(val);
                setErrorMsg('');
              }}
              placeholder="Nhập mã PIN hiện tại (mặc định: 123456)"
              placeholderTextColor={appColors.slate400}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
          </View>

          <View style={styles.formGroup}>
            <AppText style={styles.label}>Mã PIN mới (tối thiểu 4 số):</AppText>
            <TextInput
              style={styles.input}
              value={newPin}
              onChangeText={val => {
                setNewPin(val);
                setErrorMsg('');
              }}
              placeholder="Nhập mã PIN mới"
              placeholderTextColor={appColors.slate400}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
          </View>

          <View style={styles.formGroup}>
            <AppText style={styles.label}>Xác nhận mã PIN mới:</AppText>
            <TextInput
              style={styles.input}
              value={confirmPin}
              onChangeText={val => {
                setConfirmPin(val);
                setErrorMsg('');
              }}
              placeholder="Nhập lại mã PIN mới"
              placeholderTextColor={appColors.slate400}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <AppText style={styles.cancelBtnText}>Hủy bỏ</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={appColors.white} />
              ) : (
                <>
                  <Check size={18} color={appColors.white} />
                  <AppText style={styles.saveBtnText}>Lưu mã PIN</AppText>
                </>
              )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: appColors.white,
    borderRadius: 18,
    padding: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 11,
    color: appColors.slate500,
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: appColors.red500,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate700,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: appColors.slate300,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: appColors.slate900,
    backgroundColor: appColors.slate50,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.slate300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate700,
  },
  saveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 10,
    backgroundColor: appColors.blue600,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
