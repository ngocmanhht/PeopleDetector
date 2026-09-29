import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { X, Check, Plus, AlertCircle, FileSpreadsheet } from 'lucide-react-native';
import { upsertUserProfile } from '../../../store/slices/detectorSlice';
import { profileService } from '../../../services/api';
import { UserProfile } from '../../../model/detector';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';

interface BatchAddUserModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BatchAddUserModal: React.FC<BatchAddUserModalProps> = ({
  visible,
  onClose,
}) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const { zones, rooms, selectedZoneId, selectedRoomId, userProfiles } =
    useAppSelector(state => state.detector);

  const [zoneId, setZoneId] = useState(selectedZoneId || (zones[0]?.id ?? ''));
  const [roomId, setRoomId] = useState(selectedRoomId || (rooms[0]?.id ?? ''));
  const [rawText, setRawText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<
    Array<{ fullName: string; code: string; phoneNumber?: string; error?: string }>
  >([]);

  React.useEffect(() => {
    if (visible) {
      if (selectedZoneId) setZoneId(selectedZoneId);
      if (selectedRoomId) setRoomId(selectedRoomId);
      setRawText('');
      setParsedUsers([]);
    }
  }, [visible, selectedZoneId, selectedRoomId]);

  const roomsInZone = rooms.filter(r => r.zoneId === zoneId);

  // Parse raw text: each line is "Họ và tên, Mã NV, Số điện thoại" or tab-separated
  const handleParseText = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedUsers([]);
      return;
    }

    const lines = text.split('\n');
    const existingCodes = new Set(userProfiles.map(u => u.code.toLowerCase()));

    const list: Array<{
      fullName: string;
      code: string;
      phoneNumber?: string;
      error?: string;
    }> = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Split by comma or tab or semicolon
      const parts = trimmed.split(/[,;\t]+/).map(p => p.trim());
      const fullName = parts[0] || '';
      let code = parts[1] || '';
      const phoneNumber = parts[2] || '';

      if (!code) {
        code = `NS-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      let error = '';
      if (!fullName) {
        error = `Dòng ${index + 1}: Thiếu họ tên`;
      } else if (existingCodes.has(code.toLowerCase())) {
        error = `Mã "${code}" đã tồn tại trên hệ thống`;
      }

      list.push({ fullName, code, phoneNumber, error });
    });

    setParsedUsers(list);
  };

  // Sample data template generator
  const handleInsertSample = () => {
    const sample = [
      'Nguyễn Văn An, NS-2001, 0912345671',
      'Trần Thị Bích, NS-2002, 0987654322',
      'Lê Hoàng Cường, NS-2003, 0901234563',
      'Phạm Minh Dũng, NS-2004, 0934567894',
      'Võ Thị Ánh Nguyệt, NS-2005, 0976543215',
    ].join('\n');
    handleParseText(sample);
  };

  const handleSave = async () => {
    if (parsedUsers.length === 0) {
      Alert.alert('Chưa có dữ liệu', 'Vui lòng nhập danh sách nhân sự.');
      return;
    }

    const hasError = parsedUsers.some(u => Boolean(u.error));
    if (hasError) {
      Alert.alert(
        'Lỗi dữ liệu',
        'Vui lòng sửa các dòng bị lỗi hoặc trùng lặp trước khi lưu.',
      );
      return;
    }

    if (!roomId) {
      Alert.alert('Chưa chọn phòng', 'Vui lòng chọn phòng để xếp danh sách nhân sự vào.');
      return;
    }

    const now = new Date().toISOString();
    const newProfiles: UserProfile[] = parsedUsers.map((item, idx) => ({
      id: `usr-batch-${Date.now()}-${idx}`,
      code: item.code.trim().toUpperCase(),
      fullName: item.fullName.trim(),
      phoneNumber: item.phoneNumber?.trim(),
      zoneId,
      roomId,
      photos: [],
      avatarUri: '',
      conditionStatus: 'normal',
      conditionNote: 'Nhập theo danh sách',
      statusLogs: [
        {
          id: `log-${Date.now()}-${idx}`,
          timestamp: now,
          oldStatus: 'normal',
          newStatus: 'normal',
          note: 'Khởi tạo theo danh sách nhân sự mới',
          updatedBy: 'Admin',
        },
      ],
      enrolledAt: now,
    }));

    try {
      setIsSaving(true);
      const res = await profileService.batchCreateProfiles(
        newProfiles.map(p => ({
          code: p.code,
          fullName: p.fullName,
          phoneNumber: p.phoneNumber || undefined,
          zoneId: p.zoneId,
          roomId: p.roomId,
          conditionStatus: 'normal',
          conditionNote: 'Nhập theo danh sách',
          enrolledAt: p.enrolledAt,
        })),
      );
      (res?.data || []).forEach(p => dispatch(upsertUserProfile(p)));
      const skippedMsg =
        res?.skippedCount > 0
          ? `\nBỏ qua ${res.skippedCount} dòng: ${res.skipped
              .map(s => `${s.code} (${s.reason})`)
              .join(', ')}`
          : '';
      Alert.alert(
        'Thành công',
        `Đã thêm ${res?.count ?? 0} nhân sự vào phòng đã chọn.${skippedMsg}`,
      );
      onClose();
    } catch (e: any) {
      Alert.alert(
        'Lỗi lưu danh sách',
        e?.message || 'Không kết nối được server. Vui lòng thử lại.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            isPhone ? styles.modalContentPhone : styles.modalContentTablet,
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <FileSpreadsheet size={22} color={appColors.blue600} />
              </View>
              <View>
                <AppText style={styles.modalTitle}>Thêm danh sách nhân sự</AppText>
                <AppText style={styles.modalSubtitle}>
                  Nhập danh sách theo định dạng: Họ tên, Mã NV, Số điện thoại
                </AppText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Zone & Room Selector */}
            <View style={styles.roomSelectRow}>
              <View style={styles.selectCol}>
                <AppText style={styles.inputLabel}>Chọn Khu:</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipsRow}>
                    {zones.map(z => (
                      <TouchableOpacity
                        key={z.id}
                        style={[
                          styles.chip,
                          zoneId === z.id && styles.chipActive,
                        ]}
                        onPress={() => {
                          setZoneId(z.id);
                          const firstRoom = rooms.find(r => r.zoneId === z.id);
                          if (firstRoom) setRoomId(firstRoom.id);
                        }}
                      >
                        <AppText
                          style={[
                            styles.chipText,
                            zoneId === z.id && styles.chipTextActive,
                          ]}
                        >
                          {z.name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <View style={styles.roomSelectRow}>
              <View style={styles.selectCol}>
                <AppText style={styles.inputLabel}>Chọn Phòng:</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipsRow}>
                    {roomsInZone.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.chip,
                          roomId === r.id && styles.chipActive,
                        ]}
                        onPress={() => setRoomId(r.id)}
                      >
                        <AppText
                          style={[
                            styles.chipText,
                            roomId === r.id && styles.chipTextActive,
                          ]}
                        >
                          {r.name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Quick Sample Button */}
            <View style={styles.sampleRow}>
              <AppText style={styles.inputLabel}>Nhập văn bản (1 dòng / 1 người):</AppText>
              <TouchableOpacity
                style={styles.insertSampleBtn}
                onPress={handleInsertSample}
              >
                <Plus size={13} color={appColors.blue600} />
                <AppText style={styles.insertSampleText}>Điền mẫu thử</AppText>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.rawTextInput}
              multiline
              numberOfLines={6}
              placeholder={`Nguyễn Văn An, NS-2001, 0912345671\nTrần Thị Bích, NS-2002, 0987654322\nLê Hoàng Cường, NS-2003, 0901234563`}
              placeholderTextColor={appColors.slate400}
              value={rawText}
              onChangeText={handleParseText}
            />

            {/* Preview List */}
            {parsedUsers.length > 0 && (
              <View style={styles.previewContainer}>
                <AppText style={styles.previewTitle}>
                  Xem trước danh sách ({parsedUsers.length} người)
                </AppText>
                {parsedUsers.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.previewItem,
                      Boolean(item.error) && styles.previewItemError,
                    ]}
                  >
                    <View style={styles.previewNumberWrap}>
                      <AppText style={styles.previewNumber}>{idx + 1}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.previewName}>{item.fullName}</AppText>
                      <AppText style={styles.previewMeta}>
                        Mã: {item.code} {item.phoneNumber ? ` • SĐT: ${item.phoneNumber}` : ''}
                      </AppText>
                      {Boolean(item.error) && (
                        <View style={styles.errorRow}>
                          <AlertCircle size={12} color={appColors.red500} />
                          <AppText style={styles.errorText}>{item.error}</AppText>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText}>Hủy bỏ</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                parsedUsers.length === 0 && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={parsedUsers.length === 0 || isSaving}
            >
              <Check size={18} color={appColors.white} />
              <AppText style={styles.saveBtnText}>
                Lưu {parsedUsers.length > 0 ? `(${parsedUsers.length} người)` : ''}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    maxHeight: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalContentPhone: {
    width: '100%',
  },
  modalContentTablet: {
    maxWidth: 680,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  headerLeft: {
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
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: appColors.slate900,
  },
  modalSubtitle: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  bodyScroll: {
    padding: 20,
  },
  roomSelectRow: {
    marginBottom: 14,
  },
  selectCol: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate700,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: appColors.slate100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue600,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  chipTextActive: {
    color: appColors.blue600,
  },
  sampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  insertSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: appColors.blue50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  insertSampleText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.blue600,
  },
  rawTextInput: {
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: appColors.slate800,
    backgroundColor: appColors.slate50,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  previewContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
    paddingTop: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate700,
    marginBottom: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: appColors.slate50,
    marginBottom: 6,
    gap: 10,
  },
  previewItemError: {
    backgroundColor: appColors.red50,
    borderWidth: 1,
    borderColor: appColors.red200,
  },
  previewNumberWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: appColors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate700,
  },
  previewName: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate900,
  },
  previewMeta: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  errorText: {
    fontSize: 11,
    color: appColors.red600,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate700,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: appColors.blue600,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.white,
  },
});
