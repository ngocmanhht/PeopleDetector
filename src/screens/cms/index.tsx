import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  ScanFace,
  Users,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  Calendar,
  Filter,
  Check,
  History,
  Phone,
  DoorOpen,
  Camera,
  Share2,
  FileText,
  UserCheck,
} from 'lucide-react-native';
import {
  updateUserCondition,
  upsertUserProfile,
} from '../../store/slices/detectorSlice';
import { profileService } from '../../services/api';
import {
  UserConditionStatus,
  UserProfile,
} from '../../model/detector';
import { useResponsive } from '../../hooks/use-responsive';
import { appColors } from '../../const/app-colors';
import { exportMonthlyAttendanceExcel } from '../../services/excel-export-service';
import { ImagePickerService } from '../../services/image-picker-service';
import { tfliteYoloService } from '../../services/tflite-yolo-service';
import { AddUserModal } from '../tablet-detector/components/AddUserModal';
import { BatchAddUserModal } from './components/BatchAddUserModal';
import dayjs from 'dayjs';

type CmsSubTab = 'scan_status' | 'user_list' | 'reports';

const STATUS_CONFIG: Record<
  UserConditionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  normal: {
    label: 'Bình thường',
    bg: appColors.green50,
    text: appColors.green700,
    border: appColors.green200,
  },
  leave: {
    label: 'Nghỉ phép',
    bg: appColors.blue50,
    text: appColors.blue700,
    border: appColors.blue200,
  },
  medical: {
    label: 'Y tế / Khám',
    bg: appColors.amber50,
    text: appColors.amber600,
    border: appColors.amber200,
  },
  warning: {
    label: 'Cảnh báo',
    bg: appColors.red50,
    text: appColors.red700,
    border: appColors.red200,
  },
  suspended: {
    label: 'Đình chỉ',
    bg: appColors.slate100,
    text: appColors.slate700,
    border: appColors.slate300,
  },
};

const getStatusConfig = (status?: string) => {
  if (status && status in STATUS_CONFIG) {
    return STATUS_CONFIG[status as UserConditionStatus];
  }
  return STATUS_CONFIG.normal;
};

export const CmsScreen: React.FC = () => {
  const { isTablet, isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const { userProfiles, rooms, zones, sessions } = useAppSelector(
    state => state.detector,
  );
  const currentUser = useAppSelector(state => state.app.currentUser);

  // Sub-tabs navigation
  const [subTab, setSubTab] = useState<CmsSubTab>('scan_status');

  // Selected User for Step 1 & Step 2
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    userProfiles[0]?.id || null,
  );

  // Admin form state for updating condition
  const [targetStatus, setTargetStatus] =
    useState<UserConditionStatus>('normal');
  const [updateNote, setUpdateNote] = useState('');
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [isSavingCondition, setIsSavingCondition] = useState(false);

  // Modals for User Management
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);

  // Search & Filter for User List
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRoomId, setFilterRoomId] = useState<string>('all');

  // Reports / Excel Export State
  const now = new Date();
  const [exportMonth, setExportMonth] = useState<number>(now.getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(now.getFullYear());
  const [exportRoomId, setExportRoomId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const selectedUser = useAppSelector(state =>
    state.detector.userProfiles.find(u => u.id === selectedUserId),
  );

  // Synchronize form when selectedUser changes
  React.useEffect(() => {
    if (selectedUser) {
      setTargetStatus((selectedUser.conditionStatus as UserConditionStatus) || 'normal');
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
      const photoUri = await ImagePickerService.captureImageWithCamera(0, 'front');
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
        setSelectedUserId(match.userId);
        Alert.alert(
          'Nhận diện thành công',
          `Đã tìm thấy hồ sơ: ${match.fullName} (${Math.round((match.confidence || 0.95) * 100)}%)`,
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

  // Filtered Users for Tab 2
  const filteredUsers = useMemo(() => {
    return userProfiles.filter(u => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phoneNumber && u.phoneNumber.includes(searchQuery));
      const matchStatus =
        filterStatus === 'all' || (u.conditionStatus || 'normal') === filterStatus;
      const matchRoom =
        filterRoomId === 'all' || u.roomId === filterRoomId;
      return matchSearch && matchStatus && matchRoom;
    });
  }, [userProfiles, searchQuery, filterStatus, filterRoomId]);

  // Export Excel handler
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const result = await exportMonthlyAttendanceExcel({
        month: exportMonth,
        year: exportYear,
        roomId: exportRoomId === 'all' ? undefined : exportRoomId,
        sessions,
        userProfiles,
        rooms,
        zones,
      });
      // The service swallows errors and returns { success: false }, so surface them here
      if (result && !result.success) {
        Alert.alert(
          'Lỗi xuất báo cáo',
          (result as { message?: string }).message || 'Không thể tạo file Excel',
        );
      }
    } catch (e: any) {
      Alert.alert('Lỗi xuất báo cáo', e?.message || 'Không thể tạo file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedUserRoom = rooms.find(r => r.id === selectedUser?.roomId);
  const selectedUserZone = zones.find(z => z.id === selectedUser?.zoneId);

  return (
    <View style={styles.container}>
      {/* Top Header Banner */}
      <View style={[styles.headerBanner, isPhone && styles.headerBannerPhone]}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeShield}>
            <ShieldCheck size={22} color={appColors.blue600} />
          </View>
          <View>
            <View style={styles.headerTitleRow}>
              <AppText style={styles.headerTitle}>Hệ thống Quản trị CMS</AppText>
              <View style={styles.adminRoleTag}>
                <AppText style={styles.adminRoleTagText}>Admin Portal</AppText>
              </View>
            </View>
            <AppText style={styles.headerSubtitle} numberOfLines={1}>
              {currentUser
                ? `Đăng nhập bởi: ${currentUser.name || currentUser.email}`
                : 'Cập nhật tình trạng nhân sự, duyệt danh sách & xuất báo cáo'}
            </AppText>
          </View>
        </View>

        {/* Sub-tab Switcher */}
        <View style={styles.subTabNav}>
          <TouchableOpacity
            style={[
              styles.subTabBtn,
              subTab === 'scan_status' && styles.subTabBtnActive,
            ]}
            onPress={() => setSubTab('scan_status')}
          >
            <ScanFace
              size={16}
              color={
                subTab === 'scan_status' ? appColors.blue600 : appColors.slate500
              }
            />
            <AppText
              style={[
                styles.subTabBtnText,
                subTab === 'scan_status' && styles.subTabBtnTextActive,
              ]}
            >
              Quét & Cập nhật
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabBtn,
              subTab === 'user_list' && styles.subTabBtnActive,
            ]}
            onPress={() => setSubTab('user_list')}
          >
            <Users
              size={16}
              color={
                subTab === 'user_list' ? appColors.blue600 : appColors.slate500
              }
            />
            <AppText
              style={[
                styles.subTabBtnText,
                subTab === 'user_list' && styles.subTabBtnTextActive,
              ]}
            >
              Danh sách ({userProfiles.length})
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabBtn,
              subTab === 'reports' && styles.subTabBtnActive,
            ]}
            onPress={() => setSubTab('reports')}
          >
            <FileSpreadsheet
              size={16}
              color={
                subTab === 'reports' ? appColors.blue600 : appColors.slate500
              }
            />
            <AppText
              style={[
                styles.subTabBtnText,
                subTab === 'reports' && styles.subTabBtnTextActive,
              ]}
            >
              Báo cáo Excel
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Body */}
      {subTab === 'scan_status' && (
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
                      style={[
                        styles.userChip,
                        isSelected && styles.userChipSelected,
                      ]}
                      onPress={() => setSelectedUserId(u.id)}
                    >
                      <View style={styles.userChipAvatar}>
                        {u.avatarUri ? (
                          <Image
                            source={{ uri: u.avatarUri }}
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
                          source={{ uri: selectedUser.avatarUri }}
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
                      return (
                        <View key={idx} style={styles.historyItem}>
                          <View style={{ flex: 1 }}>
                            <AppText style={styles.historySessionName}>
                              {item.session.name}
                            </AppText>
                            <AppText style={styles.historyMeta}>
                              Phòng {item.roomName} • {item.timestamp}
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
                                ? `Có mặt (${Math.round((item.confidence || 0.95) * 100)}%)`
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
                              backgroundColor: isSelected ? cfg.bg : appColors.slate50,
                              borderColor: isSelected ? cfg.text : appColors.slate200,
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
                                color: isSelected
                                  ? cfg.text
                                  : appColors.slate600,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {cfg.label}
                          </AppText>
                          {isSelected && (
                            <Check size={14} color={cfg.text} style={{ marginLeft: 4 }} />
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

                  {(!selectedUser.statusLogs ||
                    selectedUser.statusLogs.length === 0) ? (
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
                              <ChevronRight size={12} color={appColors.slate400} />
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
              <AppText style={styles.emptySelectTitle}>
                Chưa chọn nhân sự
              </AppText>
              <AppText style={styles.emptySelectDesc}>
                Nhấn "Quét khuôn mặt AI" hoặc chọn một nhân sự phía trên để xem
                thông tin và cập nhật tình trạng.
              </AppText>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sub-tab 2: User Directory & Batch Add */}
      {subTab === 'user_list' && (
        <View style={styles.userListContainer}>
          {/* Action & Filter Bar */}
          <View style={styles.userListTopBar}>
            <View style={styles.searchBarWrap}>
              <Search size={18} color={appColors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm theo tên, mã NV, số điện thoại..."
                placeholderTextColor={appColors.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.userActionBtns}>
              <TouchableOpacity
                style={styles.batchAddBtn}
                onPress={() => setShowBatchAddModal(true)}
              >
                <FileSpreadsheet size={16} color={appColors.blue600} />
                <AppText style={styles.batchAddBtnText}>
                  + Thêm danh sách
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addUserSingleBtn}
                onPress={() => setShowAddUserModal(true)}
              >
                <UserPlus size={16} color={appColors.white} />
                <AppText style={styles.addUserSingleBtnText}>
                  + Thêm 1 người
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Status Chips */}
          <View style={styles.filterChipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRowInner}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterStatus === 'all' && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterStatus('all')}
                >
                  <AppText
                    style={[
                      styles.filterChipText,
                      filterStatus === 'all' && styles.filterChipTextActive,
                    ]}
                  >
                    Tất cả ({userProfiles.length})
                  </AppText>
                </TouchableOpacity>

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
                  const count = userProfiles.filter(
                    u => (u.conditionStatus || 'normal') === st,
                  ).length;
                  const isSelected = filterStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.filterChip,
                        isSelected && {
                          backgroundColor: cfg.bg,
                          borderColor: cfg.border,
                        },
                      ]}
                      onPress={() => setFilterStatus(st)}
                    >
                      <View
                        style={[
                          styles.miniStatusDot,
                          { backgroundColor: cfg.text },
                        ]}
                      />
                      <AppText
                        style={[
                          styles.filterChipText,
                          isSelected && { color: cfg.text, fontWeight: '700' },
                        ]}
                      >
                        {cfg.label} ({count})
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Users Grid */}
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            numColumns={isTablet ? 2 : 1}
            key={isTablet ? 'grid-2-col' : 'grid-1-col'}
            contentContainerStyle={styles.usersListContent}
            renderItem={({ item }) => {
              const cond = getStatusConfig(item.conditionStatus);
              const room = rooms.find(r => r.id === item.roomId);

              return (
                <TouchableOpacity
                  style={styles.userListItemCard}
                  onPress={() => {
                    setSelectedUserId(item.id);
                    setSubTab('scan_status');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.userListAvatar}>
                    {item.avatarUri ? (
                      <Image
                        source={{ uri: item.avatarUri }}
                        style={styles.userListAvatarImg}
                      />
                    ) : (
                      <AppText style={styles.userListAvatarText}>
                        {(item.fullName || 'N')[0]}
                      </AppText>
                    )}
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.userListItemHeader}>
                      <AppText
                        style={styles.userListItemName}
                        numberOfLines={1}
                      >
                        {item.fullName}
                      </AppText>
                      <View
                        style={[
                          styles.conditionPillSmall,
                          {
                            backgroundColor: cond.bg,
                            borderColor: cond.border,
                          },
                        ]}
                      >
                        <AppText
                          style={[
                            styles.conditionPillSmallText,
                            { color: cond.text },
                          ]}
                        >
                          {cond.label}
                        </AppText>
                      </View>
                    </View>

                    <AppText style={styles.userListItemCode}>
                      {item.code} {item.phoneNumber ? ` • ${item.phoneNumber}` : ''}
                    </AppText>

                    <AppText style={styles.userListItemRoom} numberOfLines={1}>
                      {room ? room.name : 'Chưa xếp phòng'}
                    </AppText>
                  </View>

                  <ChevronRight size={16} color={appColors.slate400} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Users size={40} color={appColors.slate300} />
                <AppText style={styles.emptyText}>
                  Không tìm thấy nhân sự phù hợp với bộ lọc.
                </AppText>
              </View>
            }
          />
        </View>
      )}

      {/* Sub-tab 3: Reports & Monthly Excel Export */}
      {subTab === 'reports' && (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentTablet,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <FileSpreadsheet size={22} color={appColors.blue600} />
              <View>
                <AppText style={styles.cardTitle}>
                  Xuất báo cáo Excel định kỳ theo tháng
                </AppText>
                <AppText style={styles.cardDesc}>
                  Xuất file .xlsx chuẩn 3 sheet: Tổng hợp chuyên cần, Chi tiết điểm
                  danh và Nhật ký CMS
                </AppText>
              </View>
            </View>

            {/* Month & Year Selectors */}
            <View style={styles.reportFormRow}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.fieldLabel}>Chọn Tháng:</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.monthChipsRow}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.monthChip,
                          exportMonth === m && styles.monthChipActive,
                        ]}
                        onPress={() => setExportMonth(m)}
                      >
                        <AppText
                          style={[
                            styles.monthChipText,
                            exportMonth === m && styles.monthChipTextActive,
                          ]}
                        >
                          T{m}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={{ width: 140 }}>
                <AppText style={styles.fieldLabel}>Chọn Năm:</AppText>
                <View style={styles.yearChipsRow}>
                  {[2025, 2026, 2027].map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.yearChip,
                        exportYear === y && styles.yearChipActive,
                      ]}
                      onPress={() => setExportYear(y)}
                    >
                      <AppText
                        style={[
                          styles.yearChipText,
                          exportYear === y && styles.yearChipTextActive,
                        ]}
                      >
                        {y}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Room Filter */}
            <View style={{ marginTop: 14 }}>
              <AppText style={styles.fieldLabel}>
                Lọc theo phòng (hoặc chọn tất cả):
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.roomChipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.roomFilterChip,
                      exportRoomId === 'all' && styles.roomFilterChipActive,
                    ]}
                    onPress={() => setExportRoomId('all')}
                  >
                    <AppText
                      style={[
                        styles.roomFilterChipText,
                        exportRoomId === 'all' &&
                          styles.roomFilterChipTextActive,
                      ]}
                    >
                      Tất cả phòng ({rooms.length})
                    </AppText>
                  </TouchableOpacity>

                  {rooms.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.roomFilterChip,
                        exportRoomId === r.id && styles.roomFilterChipActive,
                      ]}
                      onPress={() => setExportRoomId(r.id)}
                    >
                      <AppText
                        style={[
                          styles.roomFilterChipText,
                          exportRoomId === r.id &&
                            styles.roomFilterChipTextActive,
                        ]}
                      >
                        {r.name}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Metrics preview */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <AppText style={styles.metricValue}>
                  {sessions.length}
                </AppText>
                <AppText style={styles.metricLabel}>Tổng phiên ghi nhận</AppText>
              </View>

              <View style={styles.metricCard}>
                <AppText style={styles.metricValue}>
                  {userProfiles.length}
                </AppText>
                <AppText style={styles.metricLabel}>Tổng số nhân sự</AppText>
              </View>

              <View style={styles.metricCard}>
                <AppText style={styles.metricValue}>
                  {
                    userProfiles.filter(
                      u => (u.conditionStatus || 'normal') !== 'normal',
                    ).length
                  }
                </AppText>
                <AppText style={styles.metricLabel}>Trạng thái đặc biệt</AppText>
              </View>
            </View>

            {/* Export Action Button */}
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExportExcel}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={appColors.white} />
              ) : (
                <>
                  <Share2 size={18} color={appColors.white} />
                  <AppText style={styles.exportBtnText}>
                    Xuất file Excel tháng {exportMonth}/{exportYear}
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Add Single User Modal */}
      <AddUserModal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
      />

      {/* Batch Add User Modal */}
      <BatchAddUserModal
        visible={showBatchAddModal}
        onClose={() => setShowBatchAddModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.slate100,
  },
  headerBanner: {
    backgroundColor: appColors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerBannerPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeShield: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: appColors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: appColors.slate900,
  },
  adminRoleTag: {
    backgroundColor: appColors.blue200,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminRoleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.blue700,
  },
  headerSubtitle: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  subTabNav: {
    flexDirection: 'row',
    backgroundColor: appColors.slate100,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  subTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: appColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  subTabBtnTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  scrollContentTablet: {
    padding: 24,
  },
  actionCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  actionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate800,
  },
  cardDesc: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  scanCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: appColors.blue600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scanCameraBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.white,
  },
  quickPickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
    marginTop: 14,
    marginBottom: 8,
  },
  userChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
    minWidth: 140,
  },
  userChipSelected: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue600,
  },
  userChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: appColors.blue200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userChipAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userChipAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue600,
  },
  userChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate800,
    maxWidth: 90,
  },
  userChipNameSelected: {
    color: appColors.blue700,
  },
  userChipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  userChipCode: {
    fontSize: 10,
    color: appColors.slate500,
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailRowLayout: {
    flexDirection: 'column',
    gap: 16,
  },
  detailRowLayoutTablet: {
    flexDirection: 'row',
  },
  colSection: {
    gap: 16,
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  profileHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  avatarLargeWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: appColors.slate100,
    borderWidth: 2,
    borderColor: appColors.blue200,
  },
  avatarLarge: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.blue50,
  },
  avatarPlaceholderText: {
    fontSize: 26,
    fontWeight: '700',
    color: appColors.blue600,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate900,
  },
  profileCode: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 12,
    color: appColors.slate600,
  },
  roomZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  roomZoneText: {
    fontSize: 12,
    color: appColors.blue700,
    fontWeight: '500',
  },
  currentStatusRow: {
    marginTop: 8,
  },
  conditionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  conditionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noteBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  noteBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate500,
  },
  noteBoxText: {
    fontSize: 12,
    color: appColors.slate700,
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  historySessionName: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate800,
  },
  historyMeta: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 2,
  },
  historyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyPresent: {
    backgroundColor: appColors.green50,
  },
  historyVerify: {
    backgroundColor: appColors.red50,
  },
  historyMissing: {
    backgroundColor: appColors.amber50,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textGreen: {
    color: appColors.green700,
  },
  textRed: {
    color: appColors.red700,
  },
  textAmber: {
    color: appColors.amber600,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: appColors.slate400,
    marginTop: 8,
    textAlign: 'center',
  },
  updateFormCard: {
    borderColor: appColors.blue200,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate700,
    marginBottom: 8,
  },
  statusChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOptionText: {
    fontSize: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: appColors.slate800,
    backgroundColor: appColors.slate50,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: appColors.blue600,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  submitUpdateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.white,
  },
  logItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  logTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: appColors.blue600,
    marginTop: 4,
  },
  logContent: {
    flex: 1,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTime: {
    fontSize: 11,
    fontWeight: '600',
    color: appColors.slate600,
  },
  logAdmin: {
    fontSize: 11,
    color: appColors.slate400,
  },
  logTransitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  logTag: {
    fontSize: 12,
  },
  logNoteText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: appColors.slate600,
    marginTop: 4,
  },
  emptySelectBox: {
    backgroundColor: appColors.white,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  emptySelectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate700,
    marginTop: 12,
  },
  emptySelectDesc: {
    fontSize: 13,
    color: appColors.slate500,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 400,
  },
  userListContainer: {
    flex: 1,
    padding: 16,
  },
  userListTopBar: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchBarWrap: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: appColors.slate800,
  },
  userActionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  batchAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  batchAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.blue600,
  },
  addUserSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appColors.blue600,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addUserSingleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.white,
  },
  filterChipsRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  filterRowInner: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  filterChipActive: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue600,
  },
  filterChipText: {
    fontSize: 12,
    color: appColors.slate600,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  usersListContent: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
  },
  userListItemCard: {
    flex: 1,
    margin: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 12,
  },
  userListAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: appColors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userListAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userListAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.blue600,
  },
  userListItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  userListItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.slate900,
    flex: 1,
  },
  conditionPillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  conditionPillSmallText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userListItemCode: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 2,
  },
  userListItemRoom: {
    fontSize: 11,
    color: appColors.blue600,
    marginTop: 2,
  },
  reportFormRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  monthChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  monthChipActive: {
    backgroundColor: appColors.blue600,
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  monthChipTextActive: {
    color: appColors.white,
  },
  yearChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  yearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  yearChipActive: {
    backgroundColor: appColors.blue600,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  yearChipTextActive: {
    color: appColors.white,
  },
  roomChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roomFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: appColors.slate100,
  },
  roomFilterChipActive: {
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue600,
  },
  roomFilterChipText: {
    fontSize: 12,
    color: appColors.slate600,
    fontWeight: '600',
  },
  roomFilterChipTextActive: {
    color: appColors.blue600,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: appColors.slate50,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.blue600,
  },
  metricLabel: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 4,
    textAlign: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: appColors.green600,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.white,
  },
});
