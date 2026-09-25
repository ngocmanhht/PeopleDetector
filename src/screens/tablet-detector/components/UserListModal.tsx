import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
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

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAddUser: () => void;
}

export const UserListModal: React.FC<UserListModalProps> = ({
  visible,
  onClose,
  onOpenAddUser,
}) => {
  const dispatch = useAppDispatch();
  const { userProfiles, selectedZoneId, selectedRoomId, rooms, zones, attendanceMap, isSessionActive } =
    useAppSelector(state => state.detector);

  const [search, setSearch] = useState('');

  const currentZone = zones.find(z => z.id === selectedZoneId);
  const currentRoom = rooms.find(r => r.id === selectedRoomId);

  // Filter users by selected room
  const usersInRoom = userProfiles.filter(u => u.roomId === selectedRoomId);

  const filteredUsers = usersInRoom.filter(
    u =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSimulateScan = (user: UserProfile) => {
    dispatch(
      recordAttendance({
        userId: user.id,
        confidence: Math.floor(Math.random() * 11) + 89, // 89 - 99%
        status: 'present',
        timestamp: dayjs().format('HH:mm:ss'),
      })
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <AppText style={styles.title}>
                Danh sách: {currentRoom?.name || 'Phòng'} ({usersInRoom.length})
              </AppText>
              <AppText style={styles.subtitle}>
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
            renderItem={({ item }) => {
              const attendance = attendanceMap[item.id];
              const isPresent = attendance?.status === 'present';
              const isVerify = attendance?.status === 'verify';

              return (
                <View style={styles.userCard}>
                  <Image source={{ uri: item.avatarUri }} style={styles.userAvatar} />
                  <View style={styles.userInfo}>
                    <AppText style={styles.userName}>{item.fullName}</AppText>
                    <AppText style={styles.userCode}>{item.code}</AppText>
                  </View>

                  {/* Attendance status badge */}
                  <View style={styles.statusCol}>
                    {isPresent ? (
                      <View style={styles.presentBadge}>
                        <CheckCircle2 size={15} color={appColors.green600} />
                        <AppText style={styles.presentText}>Đã có</AppText>
                        <AppText style={styles.timeSub}>{attendance.timestamp}</AppText>
                      </View>
                    ) : isVerify ? (
                      <View style={styles.verifyBadge}>
                        <AlertCircle size={15} color={appColors.red600} />
                        <AppText style={styles.verifyText}>Cần xác minh</AppText>
                      </View>
                    ) : (
                      <View style={styles.missingBadge}>
                        <AlertTriangle size={15} color={appColors.amber600} />
                        <AppText style={styles.missingText}>Còn thiếu</AppText>
                      </View>
                    )}
                  </View>

                  {/* Quick scan trigger */}
                  {isSessionActive && (
                    <TouchableOpacity
                      style={styles.scanBtn}
                      onPress={() => handleSimulateScan(item)}
                      activeOpacity={0.7}
                    >
                      <ScanLine size={16} color={appColors.blue600} />
                      <AppText style={styles.scanBtnText}>Quét</AppText>
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
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate900,
  },
  userCode: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
    fontWeight: '500',
  },
  statusCol: {
    alignItems: 'flex-end',
    minWidth: 110,
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
