import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  Camera,
  DoorOpen,
  Phone,
  History,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Check,
  FileText,
  ChevronRight,
  Users,
} from 'lucide-react-native';
import {
  updateUserCondition,
  upsertUserProfile,
} from '../../../store/slices/detectorSlice';
import { profileService } from '../../../services/api';
import { UserConditionStatus } from '../../../model/detector';
import { useResponsive } from '../../../hooks/use-responsive';
import { appColors } from '../../../const/app-colors';
import { ImagePickerService } from '../../../services/image-picker-service';
import { tfliteYoloService } from '../../../services/tflite-yolo-service';
import { appUtils } from '../../../utils';
import dayjs from 'dayjs';
import { STATUS_CONFIG, getStatusConfig } from '../types';
import { styles } from '../styles';

interface CmsScanStatusTabProps {
  selectedUserId: string | null;
  onSelectUserId: (id: string | null) => void;
}

export const CmsScanStatusTab: React.FC<CmsScanStatusTabProps> = ({
  selectedUserId,
  onSelectUserId,
}) => {
  const { isTablet } = useResponsive();
  const dispatch = useAppDispatch();
  const { userProfiles, rooms, zones, sessions } = useAppSelector(
    state => state.detector,
  );
  const currentUser = useAppSelector(state => state.app.currentUser);

  // Admin form state for updating condition
  const [targetStatus, setTargetStatus] =
    useState<UserConditionStatus>('normal');
  const [updateNote, setUpdateNote] = useState('');
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [isSavingCondition, setIsSavingCondition] = useState(false);

  const selectedUser = useAppSelector(state =>
    state.detector.userProfiles.find(u => u.id === selectedUserId),
  );

  // Synchronize form when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      setTargetStatus(
        (selectedUser.conditionStatus as UserConditionStatus) || 'normal',
      );
      setUpdateNote(selectedUser.conditionNote || '');
    }
  }, [selectedUserId, selectedUser]);

  // Attendance History for selected User
  const userSessionHistory = useMemo(() => {
    if (!selectedUserId) return [];
    return sessions
      .filter(s => s.attendanceMap && s.attendanceMap[selectedUserId])
      .map(s => {
        const att = s.attendanceMap[selectedUserId];
        const room = rooms.find(r => r.id === s.roomId);
        return {
          session: s,
          roomName: room?.name || 'Phòng',
          status: att.status,
          timestamp: att.timestamp,
          confidence: att.confidence,
        };
      });
  }, [selectedUserId, sessions, rooms]);

  // Step 1: Face Scan handler via Camera
  const handleFaceScan = async () => {
    try {
      setIsScanningFace(true);
      const photoUri = await ImagePickerService.captureImageWithCamera(
        0,
        'front',
      );
      if (!photoUri) {
        setIsScanningFace(false);
        return;
      }

      // Run AI face matching against user profiles
      const match = await tfliteYoloService.processCapturedFrame(
        photoUri,
        userProfiles,
        true,
      );

      if (match && match.status === 'present' && match.userId) {
        onSelectUserId(match.userId);
        const confPct =
          match.confidence !== undefined
            ? match.confidence > 1
              ? Math.round(match.confidence)
              : Math.round(match.confidence * 100)
            : 95;
        Alert.alert(
          'Nhận diện thành công',
          `Đã tìm thấy hồ sơ: ${match.fullName} (${confPct}%)`,
        );
      } else {
        Alert.alert(
          'Chưa xác định được khuôn mặt',
          'Không tìm thấy nhân sự phù hợp với khuôn mặt vừa quét. Bạn có thể chọn trực tiếp từ danh sách.',
        );
      }
    } catch (e: any) {
      Alert.alert('Lỗi quét khuôn mặt', e?.message || 'Không thể xử lý ảnh');
    } finally {
      setIsScanningFace(false);
    }
  };

  // Step 2: Admin updates user condition
  const handleSaveCondition = async () => {
    if (!selectedUser) {
      Alert.alert('Thông báo', 'Vui lòng chọn nhân sự trước khi cập nhật.');
      return;
    }

    const adminName = currentUser?.name || currentUser?.email || 'Admin';
    const note = updateNote.trim();

    try {
      setIsSavingCondition(true);
      const res = await profileService.updateCondition(selectedUser.id, {
        conditionStatus: targetStatus,
        conditionNote: note,
        updatedBy: adminName,
      });
      if (res?.data) {
        // Server response carries the persisted audit log list
        dispatch(upsertUserProfile(res.data));
      }
      Alert.alert(
        'Thành công',
        `Đã cập nhật tình trạng [${STATUS_CONFIG[targetStatus].label}] cho ${selectedUser.fullName} và lưu nhật ký thay đổi.`,
      );
    } catch (e: any) {
      // Keep the change locally so the admin doesn't lose it; it will be overwritten on next sync
      dispatch(
        updateUserCondition({
          userId: selectedUser.id,
          status: targetStatus,
          note: note || undefined,
          updatedBy: adminName,
        }),
      );
      Alert.alert(
        'Chưa đồng bộ được với server',
        `Đã lưu tạm trên máy. Lỗi: ${e?.message || 'không kết nối được server'}`,
      );
    } finally {
      setIsSavingCondition(false);
    }
  };

  const selectedUserRoom = rooms.find(r => r.id === selectedUser?.roomId);
  const selectedUserZone = zones.find(z => z.id === selectedUser?.zoneId);

  return (
    <ScrollView
      style={styles.scrollBody}
      contentContainerStyle={[
        styles.scrollContent,
        isTablet && styles.scrollContentTablet,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick User Picker / Scan Bar */}
      <View style={styles.actionCard}>
        <View style={styles.actionCardTop}>
          <View>
            <AppText style={styles.cardTitle}>
              Bước 1: Quét nhận diện hoặc chọn nhân sự
            </AppText>
            <AppText style={styles.cardDesc}>
              Sử dụng camera AI quét khuôn mặt để mở ngay hồ sơ và lịch sử
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.scanCameraBtn}
            onPress={handleFaceScan}
            disabled={isScanningFace}
          >
            {isScanningFace ? (
              <ActivityIndicator size="small" color={appColors.white} />
            ) : (
              <>
                <Camera size={18} color={appColors.white} />
                <AppText style={styles.scanCameraBtnText}>
                  Quét khuôn mặt AI
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Horizontal Picker */}
        <AppText style={styles.quickPickLabel}>
          Hoặc chọn nhanh từ danh sách ({userProfiles.length} nhân sự):
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.userChipsRow}>
            {userProfiles.map(u => {
              const isSelected = u.id === selectedUserId;
              const cond = getStatusConfig(u.conditionStatus);
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.userChip, isSelected && styles.userChipSelected]}
                  onPress={() => onSelectUserId(u.id)}
                >
                  <View style={styles.userChipAvatar}>
                    {u.avatarUri ? (
                      <Image
                        source={{ uri: appUtils.getUrlImage(u.avatarUri) }}
                        style={styles.userChipAvatarImg}
                      />
                    ) : (
                      <AppText style={styles.userChipAvatarText}>
                        {(u.fullName || 'N')[0]}
                      </AppText>
                    )}
                  </View>
                  <View>
                    <AppText
                      style={[
                        styles.userChipName,
                        isSelected && styles.userChipNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {u.fullName}
                    </AppText>
                    <View style={styles.userChipMeta}>
                      <AppText style={styles.userChipCode}>{u.code}</AppText>
                      <View
                        style={[
                          styles.miniStatusDot,
                          { backgroundColor: cond.text },
                        ]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Profile & History & Admin Form (2 Columns on Tablet, 1 Column on Phone) */}
      {selectedUser ? (
        <View
          style={[
            styles.detailRowLayout,
            isTablet && styles.detailRowLayoutTablet,
          ]}
        >
          {/* Left Column: User Profile & Attendance History */}
          <View style={[styles.colSection, isTablet && { flex: 1.1 }]}>
            {/* Profile Card */}
            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarLargeWrapper}>
                  {selectedUser.avatarUri ? (
                    <Image
                      source={{ uri: appUtils.getUrlImage(selectedUser.avatarUri) }}
                      style={styles.avatarLarge}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <AppText style={styles.avatarPlaceholderText}>
                        {(selectedUser.fullName || 'N')[0]}
                      </AppText>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.nameRow}>
                    <AppText style={styles.profileName} numberOfLines={1}>
                      {selectedUser.fullName}
                    </AppText>
                  </View>

                  <AppText style={styles.profileCode}>
                    Mã NV/HV: {selectedUser.code}
                  </AppText>

                  {selectedUser.phoneNumber && (
                    <View style={styles.phoneRow}>
                      <Phone size={13} color={appColors.slate500} />
                      <AppText style={styles.phoneText}>
                        {selectedUser.phoneNumber}
                      </AppText>
                    </View>
                  )}

                  <View style={styles.roomZoneRow}>
                    <DoorOpen size={13} color={appColors.blue600} />
                    <AppText style={styles.roomZoneText} numberOfLines={1}>
                      {selectedUserRoom?.name || 'Chưa xếp phòng'} •{' '}
                      {selectedUserZone?.name || 'Khu'}
                    </AppText>
                  </View>

                  {/* Current Condition Status Badge */}
                  {(() => {
                    const curCond = getStatusConfig(selectedUser.conditionStatus);
                    return (
                      <View style={styles.currentStatusRow}>
                        <View
                          style={[
                            styles.conditionPill,
                            {
                              backgroundColor: curCond.bg,
                              borderColor: curCond.border,
                            },
                          ]}
                        >
                          <AppText
                            style={[
                              styles.conditionPillText,
                              { color: curCond.text },
                            ]}
                          >
                            Tình trạng: {curCond.label}
                          </AppText>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              </View>

              {selectedUser.conditionNote && (
                <View style={styles.noteBox}>
                  <AppText style={styles.noteBoxLabel}>Ghi chú hiện tại:</AppText>
                  <AppText style={styles.noteBoxText}>
                    {selectedUser.conditionNote}
                  </AppText>
                </View>
              )}
            </View>

            {/* Attendance History Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <History size={18} color={appColors.blue600} />
                <AppText style={styles.cardTitle}>
                  Lịch sử điểm danh qua các phiên ({userSessionHistory.length})
                </AppText>
              </View>

              {userSessionHistory.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Clock size={32} color={appColors.slate300} />
                  <AppText style={styles.emptyText}>
                    Chưa có dữ liệu điểm danh trong các phiên đã lưu.
                  </AppText>
                </View>
              ) : (
                userSessionHistory.map((item, idx) => {
                  const isPresent = item.status === 'present';
                  const isVerify = item.status === 'verify';
                  const confPct =
                    item.confidence !== undefined
                      ? item.confidence > 1
                        ? Math.round(item.confidence)
                        : Math.round(item.confidence * 100)
                      : null;

                  return (
                    <View key={idx} style={styles.historyItem}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <AppText style={styles.historySessionName}>
                          {item.session.name}
                        </AppText>
                        <AppText style={styles.historyMeta}>
                          Phòng {item.roomName} • {item.timestamp}
                          {confPct !== null ? ` • Độ khớp AI: ${confPct}%` : ''}
                        </AppText>
                      </View>

                      <View
                        style={[
                          styles.historyStatusBadge,
                          isPresent
                            ? styles.historyPresent
                            : isVerify
                            ? styles.historyVerify
                            : styles.historyMissing,
                        ]}
                      >
                        {isPresent ? (
                          <CheckCircle2 size={12} color={appColors.green600} />
                        ) : isVerify ? (
                          <AlertCircle size={12} color={appColors.red600} />
                        ) : (
                          <AlertTriangle size={12} color={appColors.amber600} />
                        )}
                        <AppText
                          style={[
                            styles.historyStatusText,
                            isPresent
                              ? styles.textGreen
                              : isVerify
                              ? styles.textRed
                              : styles.textAmber,
                          ]}
                        >
                          {isPresent
                            ? 'Có mặt'
                            : isVerify
                            ? 'Cần xác minh'
                            : 'Vắng'}
                        </AppText>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Right Column: Step 2 Admin Update Form & Audit Logs */}
          <View style={[styles.colSection, isTablet && { flex: 1 }]}>
            {/* Admin Update Condition Form */}
            <View style={[styles.card, styles.updateFormCard]}>
              <View style={styles.cardHeaderRow}>
                <UserCheck size={18} color={appColors.blue600} />
                <AppText style={styles.cardTitle}>
                  Bước 2: Admin cập nhật tình trạng
                </AppText>
              </View>

              <AppText style={styles.fieldLabel}>
                Chọn trạng thái mới cho nhân sự:
              </AppText>
              <View style={styles.statusChipsGrid}>
                {(
                  [
                    'normal',
                    'leave',
                    'medical',
                    'warning',
                    'suspended',
                  ] as UserConditionStatus[]
                ).map(st => {
                  const cfg = STATUS_CONFIG[st];
                  const isSelected = targetStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOptionChip,
                        {
                          backgroundColor: isSelected
                            ? cfg.bg
                            : appColors.slate50,
                          borderColor: isSelected
                            ? cfg.text
                            : appColors.slate200,
                        },
                      ]}
                      onPress={() => setTargetStatus(st)}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: cfg.text },
                        ]}
                      />
                      <AppText
                        style={[
                          styles.statusOptionText,
                          {
                            color: isSelected ? cfg.text : appColors.slate600,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cfg.label}
                      </AppText>
                      {isSelected && (
                        <Check
                          size={14}
                          color={cfg.text}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText style={[styles.fieldLabel, { marginTop: 14 }]}>
                Lý do / Ghi chú cập nhật:
              </AppText>
              <TextInput
                style={styles.noteInput}
                multiline
                numberOfLines={3}
                placeholder="Ví dụ: Xin nghỉ phép có đơn, bị sốt cần theo dõi y tế, vi phạm..."
                placeholderTextColor={appColors.slate400}
                value={updateNote}
                onChangeText={setUpdateNote}
              />

              <TouchableOpacity
                style={styles.submitUpdateBtn}
                onPress={handleSaveCondition}
                disabled={isSavingCondition}
              >
                {isSavingCondition ? (
                  <ActivityIndicator size="small" color={appColors.white} />
                ) : (
                  <>
                    <Check size={18} color={appColors.white} />
                    <AppText style={styles.submitUpdateBtnText}>
                      Lưu tình trạng & Ghi nhật ký
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Audit Logs Timeline */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <FileText size={18} color={appColors.blue600} />
                <AppText style={styles.cardTitle}>
                  Nhật ký thay đổi (Audit Log)
                </AppText>
              </View>

              {!selectedUser.statusLogs ||
              selectedUser.statusLogs.length === 0 ? (
                <View style={styles.emptyBox}>
                  <AppText style={styles.emptyText}>
                    Chưa có nhật ký thay đổi nào được ghi nhận.
                  </AppText>
                </View>
              ) : (
                selectedUser.statusLogs.map((log, idx) => {
                  const oldCfg = getStatusConfig(log.oldStatus);
                  const newCfg = getStatusConfig(log.newStatus);
                  const dateStr = dayjs(log.timestamp).format(
                    'DD/MM/YYYY HH:mm',
                  );

                  return (
                    <View key={log.id || idx} style={styles.logItem}>
                      <View style={styles.logTimelineDot} />
                      <View style={styles.logContent}>
                        <View style={styles.logTopRow}>
                          <AppText style={styles.logTime}>{dateStr}</AppText>
                          <AppText style={styles.logAdmin}>
                            Bởi: {log.updatedBy || 'Admin'}
                          </AppText>
                        </View>

                        <View style={styles.logTransitionRow}>
                          <AppText
                            style={[styles.logTag, { color: oldCfg.text }]}
                          >
                            {oldCfg.label}
                          </AppText>
                          <ChevronRight
                            size={12}
                            color={appColors.slate400}
                          />
                          <AppText
                            style={[
                              styles.logTag,
                              { color: newCfg.text, fontWeight: '700' },
                            ]}
                          >
                            {newCfg.label}
                          </AppText>
                        </View>

                        {log.note && (
                          <AppText style={styles.logNoteText}>
                            "{log.note}"
                          </AppText>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptySelectBox}>
          <Users size={48} color={appColors.slate300} />
          <AppText style={styles.emptySelectTitle}>Chưa chọn nhân sự</AppText>
          <AppText style={styles.emptySelectDesc}>
            Nhấn "Quét khuôn mặt AI" hoặc chọn một nhân sự phía trên để xem
            thông tin và cập nhật tình trạng.
          </AppText>
        </View>
      )}
    </ScrollView>
  );
};
