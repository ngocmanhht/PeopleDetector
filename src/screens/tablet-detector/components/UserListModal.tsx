import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  X,
  Search,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ScanLine,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import { UserProfile } from '../../../model/detector';
import { recordAttendance } from '../../../store/slices/detectorSlice';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { appUtils } from '../../../utils';

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAddUser: () => void;
}

export const UserListModal: React.FC<UserListModalProps> = ({
  visible,
  onClose,
  onOpenAddUser,
}: UserListModalProps) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const {
    userProfiles,
    selectedZoneId,
    selectedRoomId,
    rooms,
    zones,
    attendanceMap,
    isSessionActive,
  } = useAppSelector(state => state.detector);
  const currentUser = useAppSelector(state => state.app.currentUser);
  const isGuard = currentUser?.role === 'GUARD';

  const [search, setSearch] = useState('');

  const currentZone = zones.find(z => z.id === selectedZoneId);
  const currentRoom = rooms.find(r => r.id === selectedRoomId);

  // Filter users by selected room
  const usersInRoom = userProfiles.filter(u => u.roomId === selectedRoomId);

  const filteredUsers = usersInRoom.filter(
    u =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleManualCheckIn = (user: UserProfile) => {
    dispatch(
      recordAttendance({
        userId: user.id,
        confidence: 100,
        status: 'present',
        timestamp: dayjs().format('HH:mm:ss'),
      }),
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.overlay, isPhone && styles.overlayPhone]}>
          <View style={[styles.modalContent, isPhone && styles.modalContentPhone]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText style={styles.title} numberOfLines={1}>
                  Danh sách: {currentRoom?.name || 'Phòng'} ({usersInRoom.length})
                </AppText>
                <AppText style={styles.subtitle} numberOfLines={1}>
                  {currentZone?.name || 'Khu vực'} • Quản lý học viên & điểm danh
                </AppText>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.addUserBtn}
                  onPress={() => {
                    onClose();
                    onOpenAddUser();
                  }}
                  activeOpacity={0.8}
                >
                  <UserPlus size={16} color={appColors.white} />
                  <AppText style={styles.addUserText}>Thêm người</AppText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X size={22} color={appColors.slate500} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchRow}>
              <Search size={18} color={appColors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm theo họ tên hoặc mã học viên..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={appColors.slate400}
              />
            </View>

            {/* User List */}
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
            renderItem={({ item }) => {
              const attendance = attendanceMap[item.id];
              const isPresent = attendance?.status === 'present';
              const isVerify = attendance?.status === 'verify';

              return (
                <View style={styles.userCard}>
                  {item.avatarUri ? (
                    <Image
                      source={{ uri: appUtils.getUrlImage(item.avatarUri) }}
                      style={styles.userAvatar}
                    />
                  ) : (
                    <View style={[styles.userAvatar, styles.placeholderAvatar]}>
                      <AppText style={styles.placeholderText}>
                        {(item.fullName || 'N')[0]}
                      </AppText>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <AppText style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                      {item.fullName}
                    </AppText>
                    <AppText style={styles.userCode} numberOfLines={1}>{item.code}</AppText>
                  </View>

                  {/* Attendance status badge */}
                  <View style={styles.statusCol}>
                    {isPresent ? (
                      <View style={styles.presentBadge}>
                        <CheckCircle2 size={15} color={appColors.green600} style={{ flexShrink: 0 }} />
                        <AppText style={styles.presentText}>Đã có</AppText>
                        <AppText style={styles.timeSub}>
                          {attendance.timestamp}
                        </AppText>
                      </View>
                    ) : isVerify ? (
                      <View style={styles.verifyBadge}>
                        <AlertCircle size={15} color={appColors.red600} style={{ flexShrink: 0 }} />
                        <AppText style={styles.verifyText}>
                          Cần xác minh
                        </AppText>
                      </View>
                    ) : (
                      <View style={styles.missingBadge}>
                        <AlertTriangle size={15} color={appColors.amber600} style={{ flexShrink: 0 }} />
                        <AppText style={styles.missingText}>Còn thiếu</AppText>
                      </View>
                    )}
                  </View>

                  {/* Manual check-in trigger - Bảo vệ không được điểm danh thủ công */}
                  {isSessionActive && !isGuard && (
                    <TouchableOpacity
                      style={styles.scanBtn}
                      onPress={() => handleManualCheckIn(item)}
                      activeOpacity={0.7}
                    >
                      <ScanLine size={16} color={appColors.blue600} style={{ flexShrink: 0 }} />
                      <AppText style={styles.scanBtnText}>Điểm danh</AppText>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <AppText style={styles.emptyText}>
                  Không tìm thấy hồ sơ nào trong phòng này.
                </AppText>
              </View>
            }
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appColors.overlayDark60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayPhone: {
    padding: 12,
  },
  modalContent: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    width: '85%',
    maxHeight: '90%',
    padding: 24,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalContentPhone: {
    width: '100%',
    maxHeight: '94%',
    padding: 14,
    borderRadius: 16,
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
    fontSize: 14,
    color: appColors.slate500,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue600,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addUserText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.slate200,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: appColors.slate900,
  },
  listContainer: {
    paddingBottom: 10,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 14,
    padding: 12,
    gap: 14,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
    flexShrink: 0,
  },
  placeholderAvatar: {
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.blue200,
    flexShrink: 0,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '800',
    color: appColors.blue600,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate900,
    flexShrink: 1,
  },
  userCode: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
    fontWeight: '500',
  },
  statusCol: {
    alignItems: 'flex-end',
    minWidth: 90,
    flexShrink: 0,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: appColors.green50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.green200,
  },
  presentText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.green600,
  },
  timeSub: {
    fontSize: 10,
    color: appColors.green700,
    marginLeft: 4,
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: appColors.amber50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.amber200,
  },
  missingText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.amber600,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: appColors.red50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.red200,
  },
  verifyText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.red600,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue600,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: appColors.slate500,
    fontSize: 14,
  },
});
