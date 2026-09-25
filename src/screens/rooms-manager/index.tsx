import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { AppText } from '../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  Building2,
  DoorOpen,
  Plus,
  Trash2,
  Users,
  Search,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Image as ImageIcon,
} from 'lucide-react-native';
import {
  addRoom,
  addZone,
  deleteUserProfile,
  setSelectedRoomId,
  setSelectedZoneId,
  clearMockData,
} from '../../store/slices/detectorSlice';
import { AddUserModal } from '../tablet-detector/components/AddUserModal';
import { EditUserModal } from './components/EditUserModal';
import { UserProfile } from '../../model/detector';
import { appColors } from '../../const/app-colors';

export const RoomsManagerScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    zones,
    rooms,
    userProfiles,
    selectedZoneId,
    selectedRoomId,
    attendanceMap,
  } = useAppSelector(state => state.detector);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Clear legacy mock data once on mount if present
  React.useEffect(() => {
    dispatch(clearMockData());
  }, [dispatch]);

  // Quick Add Room / Zone state
  const [showAddZoneInput, setShowAddZoneInput] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [showAddRoomInput, setShowAddRoomInput] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const currentZone = zones.find(z => z.id === selectedZoneId) || zones[0];
  const currentRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  // Rooms in currently selected zone
  const roomsInCurrentZone = rooms.filter(r => r.zoneId === currentZone?.id);

  // Users in currently selected room
  const usersInRoom = userProfiles.filter(u => u.roomId === currentRoom?.id);

  const filteredUsers = usersInRoom.filter(
    u =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateZone = () => {
    if (!newZoneName.trim()) return;
    dispatch(addZone({ name: newZoneName.trim() }));
    setNewZoneName('');
    setShowAddZoneInput(false);
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || !currentZone) return;
    dispatch(
      addRoom({
        zoneId: currentZone.id,
        name: newRoomName.trim(),
        capacity: 30,
      })
    );
    setNewRoomName('');
    setShowAddRoomInput(false);
  };

  const handleDeleteUser = (userId: string, name: string) => {
    Alert.alert(
      'Xóa hồ sơ người dùng',
      `Bạn có chắc chắn muốn xóa hồ sơ của "${name}" khỏi phòng không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => dispatch(deleteUserProfile(userId)),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Left Column: Zones and Rooms Explorer */}
      <View style={styles.sidebarCol}>
        <View style={styles.colHeader}>
          <Building2 size={20} color={appColors.blue600} />
          <AppText style={styles.colHeaderTitle}>Khu vực & Phòng</AppText>
        </View>

        {/* Zones Horizontal Pills */}
        <View style={styles.zonesSection}>
          <View style={styles.sectionTitleRow}>
            <AppText style={styles.subSectionTitle}>Khu vực (Zones)</AppText>
            <TouchableOpacity
              onPress={() => setShowAddZoneInput(!showAddZoneInput)}
              style={styles.inlineAddBtn}
            >
              <Plus size={14} color={appColors.blue600} />
              <AppText style={styles.inlineAddBtnText}>Thêm khu</AppText>
            </TouchableOpacity>
          </View>

          {showAddZoneInput && (
            <View style={styles.inlineInputRow}>
              <TextInput
                style={styles.inlineTextInput}
                placeholder="Tên khu mới (vd: Khu D)..."
                value={newZoneName}
                onChangeText={setNewZoneName}
                placeholderTextColor={appColors.slate400}
              />
              <TouchableOpacity
                style={styles.inlineConfirmBtn}
                onPress={handleCreateZone}
              >
                <AppText style={styles.inlineConfirmText}>Lưu</AppText>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.zonesRow}>
              {zones.map(z => {
                const isSelected = z.id === currentZone?.id;
                return (
                  <TouchableOpacity
                    key={z.id}
                    style={[styles.zoneChip, isSelected && styles.zoneChipActive]}
                    onPress={() => dispatch(setSelectedZoneId(z.id))}
                  >
                    <AppText
                      style={[
                        styles.zoneChipText,
                        isSelected && styles.zoneChipTextActive,
                      ]}
                    >
                      {z.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Rooms List in selected Zone */}
        <View style={styles.roomsSection}>
          <View style={styles.sectionTitleRow}>
            <AppText style={styles.subSectionTitle}>
              Phòng trong {currentZone?.name || 'Khu'} ({roomsInCurrentZone.length})
            </AppText>
            <TouchableOpacity
              onPress={() => setShowAddRoomInput(!showAddRoomInput)}
              style={styles.inlineAddBtn}
            >
              <Plus size={14} color={appColors.blue600} />
              <AppText style={styles.inlineAddBtnText}>Thêm phòng</AppText>
            </TouchableOpacity>
          </View>

          {showAddRoomInput && (
            <View style={styles.inlineInputRow}>
              <TextInput
                style={styles.inlineTextInput}
                placeholder="Tên phòng (vd: Phòng A03)..."
                value={newRoomName}
                onChangeText={setNewRoomName}
                placeholderTextColor={appColors.slate400}
              />
              <TouchableOpacity
                style={styles.inlineConfirmBtn}
                onPress={handleCreateRoom}
              >
                <AppText style={styles.inlineConfirmText}>Lưu</AppText>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={roomsInCurrentZone}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.roomsList}
            renderItem={({ item }) => {
              const isSelected = item.id === currentRoom?.id;
              const count = userProfiles.filter(u => u.roomId === item.id).length;

              return (
                <TouchableOpacity
                  style={[
                    styles.roomCard,
                    isSelected && styles.roomCardActive,
                  ]}
                  onPress={() => dispatch(setSelectedRoomId(item.id))}
                  activeOpacity={0.8}
                >
                  <View style={styles.roomIconWrap}>
                    <DoorOpen
                      size={20}
                      color={isSelected ? appColors.blue600 : appColors.slate500}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={[
                        styles.roomName,
                        isSelected && styles.roomNameActive,
                      ]}
                    >
                      {item.name}
                    </AppText>
                    <AppText style={styles.roomCap}>
                      Sức chứa: {item.capacity || 30} người
                    </AppText>
                  </View>
                  <View style={styles.roomBadge}>
                    <Users size={12} color={appColors.slate500} />
                    <AppText style={styles.roomBadgeText}>{count}</AppText>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Right Column: User Members in selected Room */}
      <View style={styles.contentCol}>
        {/* Top Header of Room Detail */}
        <View style={styles.roomDetailHeader}>
          <View>
            <View style={styles.roomTitleRow}>
              <DoorOpen size={24} color={appColors.blue600} />
              <AppText style={styles.roomDetailTitle}>
                {currentRoom?.name || 'Chưa chọn phòng'}
              </AppText>
              <View style={styles.zoneTag}>
                <AppText style={styles.zoneTagText}>
                  {currentZone?.name || 'Khu'}
                </AppText>
              </View>
            </View>
            <AppText style={styles.roomDetailSubtitle}>
              Tổng số hồ sơ: {usersInRoom.length} học viên / nhân sự đã đăng ký
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.addUserHeaderBtn}
            onPress={() => setShowAddUserModal(true)}
            activeOpacity={0.85}
          >
            <UserPlus size={18} color={appColors.white} />
            <AppText style={styles.addUserHeaderBtnText}>
              + Thêm người
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={appColors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo họ tên hoặc mã nhân sự..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={appColors.slate400}
          />
        </View>

        {/* Members Grid / List */}
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={styles.usersListContainer}
          renderItem={({ item }) => {
            const att = attendanceMap[item.id];
            const isPresent = att?.status === 'present';
            const isVerify = att?.status === 'verify';
            const photoCount = item.photos?.length || (item.avatarUri ? 1 : 0);

            return (
              <TouchableOpacity
                style={styles.memberCard}
                onPress={() => setEditingUser(item)}
                activeOpacity={0.88}
              >
                <View style={styles.avatarWrapper}>
                  {item.avatarUri ? (
                    <Image
                      source={{ uri: item.avatarUri }}
                      style={styles.memberAvatar}
                    />
                  ) : (
                    <View style={[styles.memberAvatar, styles.placeholderAvatar]}>
                      <AppText style={styles.placeholderText}>
                        {(item.fullName || 'N')[0]}
                      </AppText>
                    </View>
                  )}
                  {photoCount > 0 && (
                    <View style={styles.photoCountBadge}>
                      <ImageIcon size={10} color={appColors.white} />
                      <AppText style={styles.photoCountText}>{photoCount}</AppText>
                    </View>
                  )}
                </View>

                <View style={styles.memberInfo}>
                  <AppText style={styles.memberName}>{item.fullName}</AppText>
                  <AppText style={styles.memberCode}>{item.code}</AppText>

                  {/* Attendance status badge */}
                  <View style={styles.statusRow}>
                    {isPresent ? (
                      <View style={styles.presentBadge}>
                        <CheckCircle2 size={12} color={appColors.green600} />
                        <AppText style={styles.presentText}>Đã có</AppText>
                      </View>
                    ) : isVerify ? (
                      <View style={styles.verifyBadge}>
                        <AlertCircle size={12} color={appColors.red600} />
                        <AppText style={styles.verifyText}>Cần xác minh</AppText>
                      </View>
                    ) : (
                      <View style={styles.missingBadge}>
                        <AlertTriangle size={12} color={appColors.amber600} />
                        <AppText style={styles.missingText}>Còn thiếu</AppText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action Buttons: Edit & Delete */}
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setEditingUser(item)}
                  >
                    <Edit2 size={15} color={appColors.blue600} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteUser(item.id, item.fullName)}
                  >
                    <Trash2 size={15} color={appColors.red600} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={appColors.slate300} />
              <AppText style={styles.emptyTitle}>Chưa có người nào trong phòng</AppText>
              <AppText style={styles.emptyDesc}>
                Nhấn "+ Thêm người" để tạo hồ sơ và chụp hoặc chọn ảnh nhận diện.
              </AppText>
            </View>
          }
        />
      </View>

      {/* Add User Modal */}
      <AddUserModal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
      />

      {/* Edit User Modal */}
      <EditUserModal
        visible={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: appColors.slate50,
  },
  sidebarCol: {
    width: 320,
    backgroundColor: appColors.white,
    borderRightWidth: 1,
    borderRightColor: appColors.slate200,
    padding: 18,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  colHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: appColors.slate900,
  },
  zonesSection: {
    marginTop: 14,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate500,
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue600,
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  inlineTextInput: {
    flex: 1,
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate300,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 13,
    color: appColors.slate900,
  },
  inlineConfirmBtn: {
    backgroundColor: appColors.blue600,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineConfirmText: {
    color: appColors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  zonesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  zoneChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  zoneChipActive: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue600,
  },
  zoneChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate600,
  },
  zoneChipTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  roomsSection: {
    flex: 1,
  },
  roomsList: {
    gap: 8,
    paddingTop: 4,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 10,
  },
  roomCardActive: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue300,
  },
  roomIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: appColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate800,
  },
  roomNameActive: {
    color: appColors.blue700,
  },
  roomCap: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 2,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  roomBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate600,
  },
  contentCol: {
    flex: 1,
    padding: 24,
  },
  roomDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomDetailTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: appColors.slate900,
  },
  zoneTag: {
    backgroundColor: appColors.blue50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  zoneTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue600,
  },
  roomDetailSubtitle: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 4,
  },
  addUserHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    shadowColor: appColors.blue600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addUserHeaderBtnText: {
    color: appColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: appColors.slate900,
  },
  rowWrapper: {
    gap: 14,
    marginBottom: 14,
  },
  usersListContainer: {
    paddingBottom: 20,
  },
  memberCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 12,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: appColors.slate100,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate900,
  },
  memberCode: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  statusRow: {
    marginTop: 6,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.green50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  presentText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.green600,
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.amber50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  missingText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.amber600,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.red50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  verifyText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.red600,
  },
  avatarWrapper: {
    position: 'relative',
  },
  placeholderAvatar: {
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.blue600,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: appColors.slate900,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  photoCountText: {
    color: appColors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: appColors.blue50,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: appColors.red50,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate700,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 4,
  },
});
