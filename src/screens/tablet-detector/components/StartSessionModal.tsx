import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../../components/app-text';
import {
  Play,
  X,
  Building2,
  DoorOpen,
  Users,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { ScanMode } from '../../../model/detector';

interface StartSessionModalProps {
  visible: boolean;
  scanMode?: ScanMode;
  roomName: string;
  zoneName: string;
  memberCount: number;
  onClose: () => void;
  onStart: (sessionName: string) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({
  visible,
  scanMode = 'room',
  roomName,
  zoneName,
  memberCount,
  onClose,
  onStart,
}) => {
  const isAllMode = scanMode === 'all';
  const isZoneMode = scanMode === 'zone';
  const getDefaultName = useCallback(() => {
    if (isAllMode) {
      return `Phiên vào cơ sở ${dayjs().format('HH:mm DD-MM-YYYY')}`;
    }
    if (isZoneMode) {
      return `Phiên Khu ${zoneName || ''} ${dayjs().format(
        'HH:mm DD-MM-YYYY',
      )}`;
    }
    return `Phiên ${dayjs().format('HH:mm DD-MM-YYYY')}`;
  }, [isAllMode, isZoneMode, zoneName]);
  const [sessionName, setSessionName] = useState(getDefaultName());

  useEffect(() => {
    if (visible) {
      setSessionName(getDefaultName());
    }
  }, [visible, getDefaultName]);

  const handleStart = () => {
    const finalName = sessionName.trim() || getDefaultName();
    onStart(finalName);
  };

  const handleResetToDefault = () => {
    setSessionName(getDefaultName());
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
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <View
                  style={[
                    styles.headerIcon,
                    isAllMode && { backgroundColor: appColors.blue600 },
                    isZoneMode && { backgroundColor: appColors.amber600 },
                  ]}
                >
                  <Play
                    size={20}
                    color={appColors.white}
                    fill={appColors.white}
                  />
                </View>
                <View>
                  <AppText style={styles.title}>
                    {isAllMode
                      ? 'Bắt đầu quét vào cơ sở'
                      : isZoneMode
                      ? 'Bắt đầu quét theo khu vực'
                      : 'Bắt đầu điểm danh'}
                  </AppText>
                  <AppText style={styles.subtitle}>
                    {isAllMode
                      ? 'Xác nhận vào cơ sở cho toàn bộ phòng ban / nhân sự'
                      : isZoneMode
                      ? `Quét kiểm soát nhân sự toàn bộ các phòng trong ${
                          zoneName || 'khu vực'
                        }`
                      : 'Khởi tạo phiên nhận diện khuôn mặt tự động'}
                  </AppText>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={appColors.slate400} />
              </TouchableOpacity>
            </View>

            {/* Room & Zone Info Card */}
            <View style={styles.infoBox}>
              <View style={styles.infoItem}>
                <Building2 size={16} color={appColors.blue600} />
                <AppText style={styles.infoLabel}>Khu:</AppText>
                <AppText style={styles.infoValue} numberOfLines={1}>
                  {zoneName || 'Chưa có khu'}
                </AppText>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <DoorOpen size={16} color={appColors.blue600} />
                <AppText style={styles.infoLabel}>Phòng:</AppText>
                <AppText style={styles.infoValue} numberOfLines={1}>
                  {roomName || 'Chưa chọn'}
                </AppText>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <Users size={16} color={appColors.emerald600} />
                <AppText style={styles.infoLabel}>Sĩ số:</AppText>
                <AppText
                  style={[styles.infoValue, { color: appColors.emerald600 }]}
                >
                  {memberCount} người
                </AppText>
              </View>
            </View>

            {/* Session Name Input Field */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <AppText style={styles.inputLabel}>Tên phiên làm việc</AppText>
                <TouchableOpacity
                  onPress={handleResetToDefault}
                  style={styles.defaultRuleBtn}
                >
                  <RotateCcw size={12} color={appColors.blue600} />
                  <AppText style={styles.defaultRuleBtnText}>
                    Đặt lại mặc định
                  </AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  value={sessionName}
                  onChangeText={setSessionName}
                  placeholder={`vd: ${getDefaultName()}`}
                  placeholderTextColor={appColors.slate400}
                  autoFocus={visible}
                  returnKeyType="done"
                  onSubmitEditing={handleStart}
                />
                {Boolean(sessionName) && (
                  <TouchableOpacity
                    onPress={() => setSessionName('')}
                    style={styles.clearInputBtn}
                  >
                    <X size={14} color={appColors.slate400} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Helper Rule Note */}
              <View style={styles.hintRow}>
                <Sparkles size={13} color={appColors.slate500} />
                <AppText style={styles.hintText}>
                  Nếu để trống, tên sẽ tự động là{' '}
                  <AppText style={styles.hintHighlight}>
                    Phiên HH:mm dd-mm-yyyy
                  </AppText>
                </AppText>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <AppText style={styles.cancelBtnText}>Hủy</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startBtn}
                onPress={handleStart}
                activeOpacity={0.88}
              >
                <Play
                  size={16}
                  color={appColors.white}
                  fill={appColors.white}
                />
                <AppText style={styles.startBtnText}>Bắt đầu ngay</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: appColors.blue600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: appColors.slate500,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: appColors.slate800,
    fontWeight: '700',
    flexShrink: 1,
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: appColors.slate200,
    marginHorizontal: 10,
  },
  formGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.slate800,
  },
  defaultRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  defaultRuleBtnText: {
    fontSize: 12,
    color: appColors.blue600,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: appColors.blue600,
    borderRadius: 12,
    backgroundColor: appColors.white,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: appColors.slate900,
    fontWeight: '600',
  },
  clearInputBtn: {
    padding: 6,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: appColors.slate500,
  },
  hintHighlight: {
    fontWeight: '600',
    color: appColors.blue600,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: appColors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.slate700,
  },
  startBtn: {
    flex: 1.6,
    height: 48,
    borderRadius: 12,
    backgroundColor: appColors.blue600,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: appColors.blue600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.white,
  },
});
