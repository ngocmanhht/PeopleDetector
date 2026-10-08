import React, { useState, useMemo } from 'react';
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
import { Room, UserProfile, Zone } from '../../../model/detector';
import {
  X,
  Search,
  UserPlus,
  Users,
  Check,
  Building2,
  DoorOpen,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { appUtils } from '../../../utils';

interface AddRoomMemberModalProps {
  visible: boolean;
  roomName: string;
  zoneName: string;
  roomId: string;
  zoneId: string;
  currentRoomUserIds: string[];
  allUsers: UserProfile[];
  rooms: Room[];
  zones: Zone[];
  onClose: () => void;
  onOpenCreateNew: () => void;
  onAssignUsers: (userIds: string[]) => void;
}

export const AddRoomMemberModal: React.FC<AddRoomMemberModalProps> = ({
  visible,
  roomName,
  zoneName,
  roomId,
  currentRoomUserIds,
  allUsers,
  rooms,
  zones,
  onClose,
  onOpenCreateNew,
  onAssignUsers,
}: AddRoomMemberModalProps) => {
  const { isPhone } = useResponsive();
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Filter available users (not already in this room)
  const availableUsers = useMemo(() => {
    return allUsers.filter(u => u.roomId !== roomId);
  }, [allUsers, roomId]);

  // Filter by search query
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableUsers;
    return availableUsers.filter(
      u =>
        u.fullName.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q),
    );
  }, [availableUsers, search]);

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleConfirm = () => {
    if (selectedUserIds.length === 0) return;
    onAssignUsers(selectedUserIds);
    setSelectedUserIds([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      supportedOrientations={[
        'portrait',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isPhone && styles.overlayPhone]}>
        <View style={[styles.modalCard, isPhone && styles.modalCardPhone]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <AppText style={styles.title} numberOfLines={1}>
                Thêm nhân sự vào {roomName || 'phòng'}
              </AppText>
              <AppText style={styles.subtitle} numberOfLines={1}>
                {zoneName ? `Khu vực: ${zoneName} • ` : ''}
                Hiện có {currentRoomUserIds.length} người
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          {/* Top Choice: Create New User Button */}
          <TouchableOpacity
            style={styles.createNewOptionBtn}
            onPress={() => {
              onClose();
              onOpenCreateNew();
            }}
            activeOpacity={0.85}
          >
            <View style={styles.createNewIconWrap}>
              <UserPlus size={18} color={appColors.white} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={styles.createNewTitle}>
                + Tạo hồ sơ nhân sự mới
              </AppText>
              <AppText style={styles.createNewSubtitle}>
                Chụp ảnh nhận diện AI và thêm trực tiếp vào phòng này
              </AppText>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <AppText style={styles.dividerText}>
              HOẶC CHỌN TỪ NHÂN SỰ ĐÃ CÓ ({availableUsers.length})
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          {/* Search & Select All Bar */}
          <View style={styles.searchRow}>
            <Search size={16} color={appColors.slate400} style={{ flexShrink: 0 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên hoặc mã nhân sự..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={appColors.slate400}
            />
            {filteredUsers.length > 0 && (
              <TouchableOpacity
                onPress={handleSelectAll}
                style={styles.selectAllBtn}
              >
                <AppText style={styles.selectAllText}>
                  {selectedUserIds.length === filteredUsers.length
                    ? 'Bỏ chọn'
                    : 'Chọn hết'}
                </AppText>
              </TouchableOpacity>
            )}
          </View>

          {/* Available Users List */}
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const isSelected = selectedUserIds.includes(item.id);
              const curRoom = rooms.find(r => r.id === item.roomId);
              const curZone = zones.find(z => z.id === item.zoneId);

              return (
                <TouchableOpacity
                  style={[
                    styles.userCard,
                    isSelected && styles.userCardSelected,
                  ]}
                  onPress={() => toggleSelectUser(item.id)}
                  activeOpacity={0.8}
                >
                  {/* Checkbox */}
                  <View style={styles.checkboxWrap}>
                    {isSelected ? (
                      <CheckSquare size={20} color={appColors.blue600} />
                    ) : (
                      <Square size={20} color={appColors.slate400} />
                    )}
                  </View>

                  {/* Avatar */}
                  {item.avatarUri ? (
                    <Image
                      source={{ uri: appUtils.getUrlImage(item.avatarUri) }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                      <AppText style={styles.placeholderText}>
                        {(item.fullName || 'N')[0]}
                      </AppText>
                    </View>
                  )}

                  {/* User info */}
                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <AppText style={styles.userName} numberOfLines={1}>
                      {item.fullName}
                    </AppText>
                    <AppText style={styles.userCode} numberOfLines={1}>
                      {item.code}
                    </AppText>
                    {curRoom ? (
                      <View style={styles.curLocationBadge}>
                        <DoorOpen size={11} color={appColors.slate500} />
                        <AppText style={styles.curLocationText} numberOfLines={1}>
                          Đang ở: {curRoom.name}
                        </AppText>
                      </View>
                    ) : (
                      <AppText style={styles.unassignedText}>
                        Chưa thuộc phòng nào
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={36} color={appColors.slate300} />
                <AppText style={styles.emptyTitle}>
                  {availableUsers.length === 0
                    ? 'Tất cả nhân sự trong hệ thống đã thuộc phòng này'
                    : 'Không tìm thấy nhân sự phù hợp'}
                </AppText>
              </View>
            }
          />

          {/* Footer with selection counter & Confirm Button */}
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.selectedCountText}>
                Đã chọn: <AppText style={{ fontWeight: '800', color: appColors.blue600 }}>{selectedUserIds.length}</AppText> nhân sự
              </AppText>
            </View>

            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
              >
                <AppText style={styles.cancelBtnText}>Đóng</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  selectedUserIds.length === 0 && styles.confirmBtnDisabled,
                ]}
                onPress={handleConfirm}
                disabled={selectedUserIds.length === 0}
                activeOpacity={0.85}
              >
                <Check size={16} color={appColors.white} />
                <AppText style={styles.confirmBtnText}>
                  Thêm vào phòng ({selectedUserIds.length})
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
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
  overlayPhone: {
    padding: 12,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  modalCardPhone: {
    maxWidth: '100%',
    maxHeight: '95%',
    padding: 14,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
    flexShrink: 0,
  },
  createNewOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1.5,
    borderColor: appColors.blue300,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 12,
  },
  createNewIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: appColors.blue600,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  createNewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.blue700,
  },
  createNewSubtitle: {
    fontSize: 11,
    color: appColors.blue600,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: appColors.slate200,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate400,
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.slate200,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: appColors.slate900,
    paddingVertical: 0,
  },
  selectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: appColors.slate200,
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate700,
  },
  listContainer: {
    paddingBottom: 10,
    gap: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 10,
  },
  userCardSelected: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue600,
  },
  checkboxWrap: {
    flexShrink: 0,
    padding: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: appColors.slate200,
    flexShrink: 0,
  },
  placeholderAvatar: {
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '800',
    color: appColors.blue600,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate900,
    flexShrink: 1,
  },
  userCode: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 1,
  },
  curLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  curLocationText: {
    fontSize: 11,
    color: appColors.slate600,
    fontWeight: '500',
    flexShrink: 1,
  },
  unassignedText: {
    fontSize: 11,
    color: appColors.amber600,
    fontWeight: '600',
    marginTop: 3,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
    marginTop: 6,
    gap: 12,
  },
  selectedCountText: {
    fontSize: 13,
    color: appColors.slate700,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate700,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue600,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: appColors.slate300,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.white,
  },
});
