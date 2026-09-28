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
  History,
  Clock,
  ChevronRight,
  ChevronDown,
  Sliders,
} from 'lucide-react-native';
import {
  addRoom,
  addZone,
  deleteUserProfile,
  setSelectedRoomId,
  setSelectedZoneId,
  clearMockData,
  deleteSession,
} from '../../store/slices/detectorSlice';
import { AddUserModal } from '../tablet-detector/components/AddUserModal';
import { EditUserModal } from './components/EditUserModal';
import { SessionDetailModal } from './components/SessionDetailModal';
import { PickerModal } from '../tablet-detector/components/PickerModal';
import { ManageRoomsModal } from '../tablet-detector/components/ManageRoomsModal';
import { AttendanceSession, UserProfile } from '../../model/detector';
import { useResponsive } from '../../hooks/use-responsive';
import { appColors } from '../../const/app-colors';
import { tfliteYoloService } from '../../services/tflite-yolo-service';
import {
  zoneService,
  roomService,
  profileService,
  sessionService,
} from '../../services/api';

export const RoomsManagerScreen: React.FC = () => {
  const { isTablet, isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const {
    zones,
    rooms,
    userProfiles,
    selectedZoneId,
    selectedRoomId,
    attendanceMap,
    sessions,
  } = useAppSelector(state => state.detector);

  const [activeTab, setActiveTab] = useState<'members' | 'sessions'>('members');
  const [selectedDetailSession, setSelectedDetailSession] = useState<AttendanceSession | null>(null);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Mobile picker modals state
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);
  const [manageRoomsModalVisible, setManageRoomsModalVisible] = useState(false);

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

  // Sessions in currently selected room
  const currentRoomSessions = (sessions || []).filter(s => s.roomId === currentRoom?.id);

  const filteredUsers = usersInRoom.filter(
    u =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSessions = currentRoomSessions.filter(
    s =>
      s.name.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
      s.startTime.includes(sessionSearchQuery)
  );

  const zonePickerItems = zones.map(z => ({
    id: z.id,
    label: z.name,
    subtitle: z.description,
  }));

  const roomPickerItems = rooms
    .filter(r => r.zoneId === (currentZone?.id || selectedZoneId))
    .map(r => ({
      id: r.id,
      label: r.name,
      subtitle: `Sức chứa ${r.capacity || 30} người`,
    }));

  const handleDeleteSession = (sessionId: string, sessionName: string) => {
    Alert.alert(
      'Xóa phiên điểm danh',
      `Bạn có chắc chắn muốn xóa "${sessionName}" và toàn bộ dữ liệu điểm danh của phiên này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteSession(sessionId));
            sessionService.deleteSession(sessionId).catch(err => {
              console.log('[RoomsManager] Failed to delete session on BE:', err);
            });
          },
        },
      ]
    );
  };

  const handleCreateZone = () => {
    if (!newZoneName.trim()) return;
    const zoneId = `zone-${Date.now()}`;
    const zoneData = { id: zoneId, name: newZoneName.trim() };
    dispatch(addZone(zoneData));
    zoneService.createZone(zoneData).catch(err => {
      console.log('[RoomsManager] Failed to create zone on BE:', err);
    });
    dispatch(setSelectedZoneId(zoneId));
    setNewZoneName('');
    setShowAddZoneInput(false);
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || !currentZone) return;
    const roomId = `room-${Date.now()}`;
    const roomData = {
      id: roomId,
      zoneId: currentZone.id,
      name: newRoomName.trim(),
      capacity: 30,
    };
    dispatch(addRoom(roomData));
    roomService.createRoom(roomData).catch(err => {
      console.log('[RoomsManager] Failed to create room on BE:', err);
    });
    dispatch(setSelectedRoomId(roomId));
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
          onPress: () => {
            tfliteYoloService.invalidateProfileCache(userId);
            dispatch(deleteUserProfile(userId));
            profileService.deleteProfile(userId).catch(err => {
              console.log('[RoomsManager] Failed to delete profile on BE:', err);
            });
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      {/* Left Column: Zones and Rooms Explorer (Tablet only) */}
      {isTablet && (
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
                      numberOfLines={1}
                      ellipsizeMode="tail"
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
            <AppText style={styles.subSectionTitle} numberOfLines={1} ellipsizeMode="tail">
              Phòng trong {currentZone?.name || 'Khu'} ({roomsInCurrentZone.length})
            </AppText>
            <TouchableOpacity
              onPress={() => setShowAddRoomInput(!showAddRoomInput)}
              style={styles.inlineAddBtn}
            >
              <Plus size={14} color={appColors.blue600} style={{ flexShrink: 0 }} />
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
                      style={{ flexShrink: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      style={[
                        styles.roomName,
                        isSelected && styles.roomNameActive,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.name}
                    </AppText>
                    <AppText style={styles.roomCap} numberOfLines={1}>
                      Sức chứa: {item.capacity || 30} người
                    </AppText>
                  </View>
                  <View style={styles.roomBadge}>
                    <Users size={12} color={appColors.slate500} style={{ flexShrink: 0 }} />
                    <AppText style={styles.roomBadgeText}>{count}</AppText>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
      )}

      {/* Content Column: User Members in selected Room */}
      <View style={[styles.contentCol, isPhone && styles.contentColPhone]}>
        {/* Mobile Quick Zone & Room Picker Bar */}
        {isPhone && (
          <View style={styles.phoneRoomSelectorBar}>
            <TouchableOpacity
              style={styles.phoneSelectorBtn}
              onPress={() => setZonePickerVisible(true)}
              activeOpacity={0.8}
            >
              <Building2 size={15} color={appColors.blue600} style={{ flexShrink: 0 }} />
              <AppText style={styles.phoneSelectorText} numberOfLines={1} ellipsizeMode="tail">
                {currentZone ? currentZone.name : 'Chọn Khu'}
              </AppText>
              <ChevronDown size={14} color={appColors.slate400} style={{ flexShrink: 0 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.phoneSelectorBtn}
              onPress={() => setRoomPickerVisible(true)}
              activeOpacity={0.8}
            >
              <DoorOpen size={15} color={appColors.blue600} style={{ flexShrink: 0 }} />
              <AppText style={styles.phoneSelectorText} numberOfLines={1} ellipsizeMode="tail">
                {currentRoom ? currentRoom.name : 'Chọn Phòng'}
              </AppText>
              <ChevronDown size={14} color={appColors.slate400} style={{ flexShrink: 0 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.phoneManageBtn}
              onPress={() => setManageRoomsModalVisible(true)}
              activeOpacity={0.8}
            >
              <Sliders size={16} color={appColors.gray600} style={{ flexShrink: 0 }} />
            </TouchableOpacity>
          </View>
        )}
        {/* Top Header of Room Detail */}
        <View style={[styles.roomDetailHeader, isPhone && styles.roomDetailHeaderPhone]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.roomTitleRow}>
              <DoorOpen size={isPhone ? 20 : 24} color={appColors.blue600} style={{ flexShrink: 0 }} />
              <AppText
                style={[styles.roomDetailTitle, isPhone && styles.roomDetailTitlePhone]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentRoom?.name || 'Chưa chọn phòng'}
              </AppText>
              <View style={styles.zoneTag}>
                <AppText style={styles.zoneTagText} numberOfLines={1} ellipsizeMode="tail">
                  {currentZone?.name || 'Khu'}
                </AppText>
              </View>
            </View>
            <AppText style={styles.roomDetailSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {activeTab === 'members'
                ? `Tổng số hồ sơ: ${usersInRoom.length} người đã đăng ký`
                : `Lịch sử: ${currentRoomSessions.length} phiên đã thực hiện`}
            </AppText>
          </View>

          {activeTab === 'members' && (
            <TouchableOpacity
              style={[styles.addUserHeaderBtn, isPhone && styles.addUserHeaderBtnPhone]}
              onPress={() => setShowAddUserModal(true)}
              activeOpacity={0.85}
            >
              <UserPlus size={18} color={appColors.white} style={{ flexShrink: 0 }} />
              <AppText style={styles.addUserHeaderBtnText}>
                + Thêm người
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Switcher: Members vs Sessions */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'members' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('members')}
            activeOpacity={0.8}
          >
            <Users
              size={16}
              color={activeTab === 'members' ? appColors.blue600 : appColors.slate500}
            />
            <AppText
              style={[
                styles.segmentBtnText,
                activeTab === 'members' && styles.segmentBtnTextActive,
              ]}
            >
              Danh sách người ({usersInRoom.length})
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'sessions' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('sessions')}
            activeOpacity={0.8}
          >
            <History
              size={16}
              color={activeTab === 'sessions' ? appColors.blue600 : appColors.slate500}
            />
            <AppText
              style={[
                styles.segmentBtnText,
                activeTab === 'sessions' && styles.segmentBtnTextActive,
              ]}
            >
              Lịch sử theo phiên ({currentRoomSessions.length})
            </AppText>
          </TouchableOpacity>
        </View>

        {activeTab === 'members' ? (
          <>
            {/* Search Bar for Members */}
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
              key={isPhone ? 'members-grid-1-col' : 'members-grid-2-col'}
              data={filteredUsers}
              keyExtractor={item => item.id}
              numColumns={isPhone ? 1 : 2}
              columnWrapperStyle={isPhone ? undefined : styles.rowWrapper}
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
                      <AppText style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
                        {item.fullName}
                      </AppText>
                      <AppText style={styles.memberCode} numberOfLines={1}>
                        {item.code}
                      </AppText>

                      {/* Attendance status badge */}
                      <View style={styles.statusRow}>
                        {isPresent ? (
                          <View style={styles.presentBadge}>
                            <CheckCircle2 size={12} color={appColors.green600} style={{ flexShrink: 0 }} />
                            <AppText style={styles.presentText}>Đã có</AppText>
                          </View>
                        ) : isVerify ? (
                          <View style={styles.verifyBadge}>
                            <AlertCircle size={12} color={appColors.red600} style={{ flexShrink: 0 }} />
                            <AppText style={styles.verifyText}>Cần xác minh</AppText>
                          </View>
                        ) : (
                          <View style={styles.missingBadge}>
                            <AlertTriangle size={12} color={appColors.amber600} style={{ flexShrink: 0 }} />
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
          </>
        ) : (
          <>
            {/* Search Bar for Sessions */}
            <View style={styles.searchBar}>
              <Search size={18} color={appColors.slate400} style={{ flexShrink: 0 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm phiên theo tên hoặc thời gian..."
                value={sessionSearchQuery}
                onChangeText={setSessionSearchQuery}
                placeholderTextColor={appColors.slate400}
              />
            </View>

            {/* Sessions List */}
            <FlatList
              key="sessions-list-1-col"
              data={filteredSessions}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.sessionsListContainer}
              renderItem={({ item }) => {
                const total = item.totalCount || 0;
                const present = item.presentCount || 0;
                const missing = item.missingCount || 0;
                const verify = item.verifyCount || 0;
                const rate = total > 0 ? Math.round((present / total) * 100) : 0;

                return (
                  <View style={styles.sessionCard}>
                    {/* Top Row: Name, Status & Delete */}
                    <View style={styles.sessionCardTop}>
                      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <View style={styles.sessionNameRow}>
                          <AppText style={styles.sessionNameText} numberOfLines={1} ellipsizeMode="tail">
                            {item.name}
                          </AppText>
                          {item.isActive ? (
                            <View style={styles.sessionStatusActive}>
                              <View style={styles.pulseDot} />
                              <AppText style={styles.sessionStatusActiveText}>
                                Đang diễn ra
                              </AppText>
                            </View>
                          ) : (
                            <View style={styles.sessionStatusFinished}>
                              <CheckCircle2 size={12} color={appColors.slate500} style={{ flexShrink: 0 }} />
                              <AppText style={styles.sessionStatusFinishedText}>
                                Đã hoàn thành
                              </AppText>
                            </View>
                          )}
                        </View>

                        <View style={styles.sessionTimeRow}>
                          <Clock size={13} color={appColors.slate400} style={{ flexShrink: 0 }} />
                          <AppText style={styles.sessionTimeText} numberOfLines={1} ellipsizeMode="tail">
                            Bắt đầu: {item.startTime}
                            {item.endTime ? `  •  Kết thúc: ${item.endTime}` : ''}
                          </AppText>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteSessionBtn}
                        onPress={() => handleDeleteSession(item.id, item.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color={appColors.red500} />
                      </TouchableOpacity>
                    </View>

                    {/* Metric Pills */}
                    <View style={styles.sessionMetricsRow}>
                      <View style={[styles.sessionMetricPill, { backgroundColor: appColors.slate100 }]}>
                        <AppText style={styles.sessionMetricPillLabel}>Sĩ số:</AppText>
                        <AppText style={styles.sessionMetricPillVal}>{total}</AppText>
                      </View>

                      <View style={[styles.sessionMetricPill, { backgroundColor: appColors.green50 }]}>
                        <CheckCircle2 size={12} color={appColors.green600} />
                        <AppText style={[styles.sessionMetricPillLabel, { color: appColors.green700 }]}>
                          Đã có:
                        </AppText>
                        <AppText style={[styles.sessionMetricPillVal, { color: appColors.green700 }]}>
                          {present}
                        </AppText>
                      </View>

                      <View style={[styles.sessionMetricPill, { backgroundColor: appColors.amber50 }]}>
                        <AlertTriangle size={12} color={appColors.amber600} />
                        <AppText style={[styles.sessionMetricPillLabel, { color: appColors.amber600 }]}>
                          Còn thiếu:
                        </AppText>
                        <AppText style={[styles.sessionMetricPillVal, { color: appColors.amber600 }]}>
                          {missing}
                        </AppText>
                      </View>

                      <View style={[styles.sessionMetricPill, { backgroundColor: appColors.red50 }]}>
                        <AlertCircle size={12} color={appColors.red600} />
                        <AppText style={[styles.sessionMetricPillLabel, { color: appColors.red700 }]}>
                          Xác minh:
                        </AppText>
                        <AppText style={[styles.sessionMetricPillVal, { color: appColors.red700 }]}>
                          {verify}
                        </AppText>
                      </View>

                      <View style={[styles.sessionMetricPill, { backgroundColor: appColors.blue50 }]}>
                        <AppText style={[styles.sessionMetricPillLabel, { color: appColors.blue700 }]}>
                          Tỷ lệ:
                        </AppText>
                        <AppText style={[styles.sessionMetricPillVal, { color: appColors.blue700 }]}>
                          {rate}%
                        </AppText>
                      </View>
                    </View>

                    {/* Progress Bar & Detail View Action */}
                    <View style={styles.sessionCardBottom}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(100, rate)}%` }]} />
                      </View>

                      <TouchableOpacity
                        style={styles.viewSessionBtn}
                        onPress={() => setSelectedDetailSession(item)}
                        activeOpacity={0.8}
                      >
                        <AppText style={styles.viewSessionBtnText}>
                          Xem chi tiết danh sách
                        </AppText>
                        <ChevronRight size={14} color={appColors.blue600} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <History size={48} color={appColors.slate300} />
                  <AppText style={styles.emptyTitle}>Chưa có phiên điểm danh nào</AppText>
                  <AppText style={styles.emptyDesc}>
                    Để điểm danh theo phiên, hãy chọn phòng này và nhấn "Bắt đầu phiên" trên màn hình chính.
                  </AppText>
                </View>
              }
            />
          </>
        )}
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

      {/* Session Detail Modal */}
      <SessionDetailModal
        visible={Boolean(selectedDetailSession)}
        session={selectedDetailSession}
        userProfiles={userProfiles}
        onClose={() => setSelectedDetailSession(null)}
      />

      {/* Mobile Zone Picker */}
      <PickerModal
        visible={zonePickerVisible}
        title="Chọn Khu vực (Zone)"
        items={zonePickerItems}
        selectedId={selectedZoneId}
        onSelect={id => dispatch(setSelectedZoneId(id))}
        onClose={() => setZonePickerVisible(false)}
      />

      {/* Mobile Room Picker */}
      <PickerModal
        visible={roomPickerVisible}
        title="Chọn Phòng (Room)"
        items={roomPickerItems}
        selectedId={selectedRoomId}
        onSelect={id => dispatch(setSelectedRoomId(id))}
        onClose={() => setRoomPickerVisible(false)}
      />

      {/* Manage Rooms Modal */}
      <ManageRoomsModal
        visible={manageRoomsModalVisible}
        onClose={() => setManageRoomsModalVisible(false)}
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
    flex: 1,
    marginRight: 8,
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
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
    maxWidth: 160,
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
    flexShrink: 0,
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
  roomDetailHeaderPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 14,
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
    flexShrink: 1,
  },
  roomDetailTitlePhone: {
    fontSize: 20,
    flexShrink: 1,
  },
  zoneTag: {
    backgroundColor: appColors.blue50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.blue200,
    flexShrink: 0,
    maxWidth: 140,
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
    flexShrink: 0,
  },
  addUserHeaderBtnPhone: {
    justifyContent: 'center',
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
    flexShrink: 0,
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: appColors.slate100,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 8,
  },
  segmentBtnActive: {
    backgroundColor: appColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.slate600,
  },
  segmentBtnTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  sessionsListContainer: {
    paddingBottom: 24,
    gap: 14,
  },
  sessionCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sessionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate900,
    flexShrink: 1,
  },
  sessionStatusActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: appColors.emerald200,
    flexShrink: 0,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: appColors.emerald600,
  },
  sessionStatusActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.emerald600,
  },
  sessionStatusFinished: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
    flexShrink: 0,
  },
  sessionStatusFinishedText: {
    fontSize: 11,
    fontWeight: '600',
    color: appColors.slate600,
  },
  sessionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  sessionTimeText: {
    fontSize: 12,
    color: appColors.slate500,
  },
  deleteSessionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: appColors.red50,
    flexShrink: 0,
  },
  sessionMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sessionMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  sessionMetricPillLabel: {
    fontSize: 12,
    color: appColors.slate600,
    fontWeight: '500',
  },
  sessionMetricPillVal: {
    fontSize: 13,
    fontWeight: '800',
    color: appColors.slate900,
  },
  sessionCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
    gap: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: appColors.slate100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: appColors.blue600,
    borderRadius: 3,
  },
  viewSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    flexShrink: 0,
  },
  viewSessionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.blue600,
  },
  containerPhone: {
    flexDirection: 'column',
  },
  contentColPhone: {
    padding: 12,
  },
  phoneRoomSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  phoneSelectorBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  phoneSelectorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate800,
  },
  phoneManageBtn: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
