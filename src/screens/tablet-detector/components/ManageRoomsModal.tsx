import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  X,
  Plus,
  Building2,
  DoorOpen,
  Users,
  Check,
} from 'lucide-react-native';
import {
  addRoom,
  addZone,
  setSelectedRoomId,
  setSelectedZoneId,
} from '../../../store/slices/detectorSlice';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { zoneService, roomService } from '../../../services/api';

interface ManageRoomsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ManageRoomsModal: React.FC<ManageRoomsModalProps> = ({
  visible,
  onClose,
}) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const { zones, rooms, userProfiles, selectedZoneId, selectedRoomId } =
    useAppSelector(state => state.detector);

  const [activeTab, setActiveTab] = useState<'zones' | 'rooms'>('zones');

  // Form states for adding Zone
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');

  // Form states for adding Room
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('30');
  const [newRoomZoneId, setNewRoomZoneId] = useState(selectedZoneId || (zones[0]?.id ?? ''));

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep newRoomZoneId in sync when zones or selectedZoneId changes
  React.useEffect(() => {
    if (!newRoomZoneId && (selectedZoneId || zones[0]?.id)) {
      setNewRoomZoneId(selectedZoneId || zones[0]?.id || '');
    }
  }, [selectedZoneId, zones, newRoomZoneId]);

  const handleAddZone = async () => {
    if (!newZoneName.trim()) {
      setError('Vui lòng nhập tên khu vực.');
      return;
    }
    const zoneName = newZoneName.trim();
    const zoneDesc = newZoneDesc.trim();
    const tempZoneId = `zone-${Date.now()}`;
    dispatch(
      addZone({
        id: tempZoneId,
        name: zoneName,
        description: zoneDesc,
      }),
    );
    setNewRoomZoneId(tempZoneId);
    dispatch(setSelectedZoneId(tempZoneId));
    setNewZoneName('');
    setNewZoneDesc('');
    setError('');
    setSuccess('Đã thêm khu vực mới thành công!');
    setTimeout(() => setSuccess(''), 2500);

    try {
      const res = await zoneService.createZone({
        id: tempZoneId,
        name: zoneName,
        description: zoneDesc,
      });
      if (res?.data?.id && res.data.id !== tempZoneId) {
        dispatch(addZone(res.data));
        dispatch(setSelectedZoneId(res.data.id));
        setNewRoomZoneId(res.data.id);
      }
    } catch (err) {
      console.log(
        '[ManageRoomsModal] BE create zone error (running offline):',
        err,
      );
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) {
      setError('Vui lòng nhập tên phòng.');
      return;
    }
    const targetZoneId = newRoomZoneId || selectedZoneId || zones[0]?.id;
    if (!targetZoneId) {
      setError('Vui lòng chọn khu vực trực thuộc.');
      return;
    }
    const cap = parseInt(newRoomCapacity, 10) || 30;
    const roomName = newRoomName.trim();
    const tempRoomId = `room-${Date.now()}`;
    dispatch(
      addRoom({
        id: tempRoomId,
        name: roomName,
        zoneId: targetZoneId,
        capacity: cap,
      }),
    );
    dispatch(setSelectedZoneId(targetZoneId));
    dispatch(setSelectedRoomId(tempRoomId));
    setNewRoomName('');
    setNewRoomCapacity('30');
    setError('');
    setSuccess('Đã thêm phòng học/làm việc mới thành công!');
    setTimeout(() => setSuccess(''), 2500);

    try {
      const res = await roomService.createRoom({
        id: tempRoomId,
        name: roomName,
        zoneId: targetZoneId,
        capacity: cap,
      });
      if (res?.data?.id && res.data.id !== tempRoomId) {
        dispatch(addRoom(res.data));
        dispatch(setSelectedRoomId(res.data.id));
      }
    } catch (err) {
      console.log(
        '[ManageRoomsModal] BE create room error (running offline):',
        err,
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={[styles.overlay, isPhone && styles.overlayPhone]}>
        <View style={[styles.modalContent, isPhone && styles.modalContentPhone]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText style={[styles.title, isPhone && { fontSize: 16 }]} numberOfLines={1}>
                {isPhone ? 'Quản lý Khu & Phòng' : 'Quản lý Khu & Phòng học / làm việc'}
              </AppText>
              <AppText style={styles.subtitle} numberOfLines={1}>
                Xem danh sách khu vực, phòng và thêm mới nhanh chóng
              </AppText>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={22} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabRow, isPhone && styles.tabRowPhone]}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'zones' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('zones');
                setError('');
                setSuccess('');
              }}
            >
              <Building2
                size={18}
                color={activeTab === 'zones' ? appColors.blue600 : appColors.slate500}
              />
              <AppText
                style={[styles.tabText, activeTab === 'zones' && styles.tabTextActive]}
              >
                Danh sách Khu vực ({zones.length})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'rooms' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('rooms');
                setError('');
                setSuccess('');
              }}
            >
              <DoorOpen
                size={18}
                color={activeTab === 'rooms' ? appColors.blue600 : appColors.slate500}
              />
              <AppText
                style={[styles.tabText, activeTab === 'rooms' && styles.tabTextActive]}
              >
                Danh sách Phòng ({rooms.length})
              </AppText>
            </TouchableOpacity>
          </View>

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
          {success ? <AppText style={styles.successText}>{success}</AppText> : null}

          {/* Content Area */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {activeTab === 'zones' ? (
              <View>
                {/* Form Add Zone */}
                <View style={styles.addCard}>
                  <AppText style={styles.cardTitle}>+ Thêm Khu vực mới</AppText>
                  <View style={styles.formRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Tên khu (vd: Khu D, Khu Nhà xưởng 2)..."
                      value={newZoneName}
                      onChangeText={setNewZoneName}
                      placeholderTextColor={appColors.slate400}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1.5 }]}
                      placeholder="Mô tả khu vực..."
                      value={newZoneDesc}
                      onChangeText={setNewZoneDesc}
                      placeholderTextColor={appColors.slate400}
                    />
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={handleAddZone}
                    >
                      <Plus size={16} color={appColors.white} />
                      <AppText style={styles.actionBtnText}>Thêm Khu</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Zone List */}
                <View style={styles.itemsList}>
                  {zones.map(z => {
                    const roomsCount = rooms.filter(r => r.zoneId === z.id).length;
                    const membersCount = userProfiles.filter(u => u.zoneId === z.id).length;
                    const isSelected = z.id === selectedZoneId;

                    return (
                      <TouchableOpacity
                        key={z.id}
                        style={[
                          styles.listItem,
                          isSelected && styles.listItemActive,
                        ]}
                        onPress={() => dispatch(setSelectedZoneId(z.id))}
                        activeOpacity={0.8}
                      >
                        <View style={styles.itemIconWrap}>
                          <Building2 size={20} color={appColors.blue600} style={{ flexShrink: 0 }} />
                        </View>
                        <View style={styles.itemInfo}>
                          <AppText style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                            {z.name}
                          </AppText>
                          <AppText style={styles.itemDesc} numberOfLines={1} ellipsizeMode="tail">
                            {z.description || 'Không có mô tả'}
                          </AppText>
                        </View>
                        <View style={styles.itemMeta}>
                          <AppText style={styles.metaText} numberOfLines={1}>
                            {roomsCount} phòng • {membersCount} nhân sự
                          </AppText>
                          {isSelected && (
                            <View style={styles.selectedPill}>
                              <Check size={12} color={appColors.green600} style={{ flexShrink: 0 }} />
                              <AppText style={styles.selectedPillText}>
                                Đang chọn
                              </AppText>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View>
                {/* Form Add Room */}
                <View style={styles.addCard}>
                  <AppText style={styles.cardTitle}>+ Thêm Phòng mới</AppText>
                  <View style={styles.formRow}>
                    {/* Zone Dropdown in form */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 10 }}
                    >
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {zones.map(z => (
                          <TouchableOpacity
                            key={z.id}
                            style={[
                              styles.smallZoneChip,
                              newRoomZoneId === z.id && styles.smallZoneChipActive,
                            ]}
                            onPress={() => setNewRoomZoneId(z.id)}
                          >
                            <AppText
                              style={[
                                styles.smallZoneText,
                                newRoomZoneId === z.id && styles.smallZoneTextActive,
                              ]}
                            >
                              {z.name}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    <View style={styles.formRowInline}>
                      <TextInput
                        style={[styles.input, { flex: 1.5 }]}
                        placeholder="Tên phòng (vd: Phòng A03, Phòng Kỹ thuật 1)..."
                        value={newRoomName}
                        onChangeText={setNewRoomName}
                        placeholderTextColor={appColors.slate400}
                      />
                      <TextInput
                        style={[styles.input, { width: 100 }]}
                        placeholder="Sức chứa"
                        keyboardType="numeric"
                        value={newRoomCapacity}
                        onChangeText={setNewRoomCapacity}
                        placeholderTextColor={appColors.slate400}
                      />
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleAddRoom}
                      >
                        <Plus size={16} color={appColors.white} />
                        <AppText style={styles.actionBtnText}>Thêm Phòng</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Rooms List */}
                <View style={styles.itemsList}>
                  {rooms.map(r => {
                    const zone = zones.find(z => z.id === r.zoneId);
                    const membersCount = userProfiles.filter(u => u.roomId === r.id).length;
                    const isSelected = r.id === selectedRoomId;

                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.listItem,
                          isSelected && styles.listItemActive,
                        ]}
                        onPress={() => {
                          dispatch(setSelectedZoneId(r.zoneId));
                          dispatch(setSelectedRoomId(r.id));
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.itemIconWrap}>
                          <DoorOpen size={20} color={appColors.blue600} style={{ flexShrink: 0 }} />
                        </View>
                        <View style={styles.itemInfo}>
                          <AppText style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                            {r.name}
                          </AppText>
                          <AppText style={styles.itemDesc} numberOfLines={1} ellipsizeMode="tail">
                            Thuộc {zone?.name || 'Khu vực'} • Sức chứa {r.capacity || 30} người
                          </AppText>
                        </View>
                        <View style={styles.itemMeta}>
                          <View style={styles.usersCountRow}>
                            <Users size={14} color={appColors.slate500} style={{ flexShrink: 0 }} />
                            <AppText style={styles.metaText} numberOfLines={1}>
                              {membersCount} học viên
                            </AppText>
                          </View>
                          {isSelected && (
                            <View style={styles.selectedPill}>
                              <Check size={12} color={appColors.green600} style={{ flexShrink: 0 }} />
                              <AppText style={styles.selectedPillText}>
                                Đang chọn
                              </AppText>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appColors.overlayDark65,
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
    width: '80%',
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
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
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
  tabRow: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate200,
    paddingBottom: 10,
    marginBottom: 14,
  },
  tabRowPhone: {
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    backgroundColor: appColors.slate50,
  },
  tabBtnActive: {
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.slate500,
  },
  tabTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  errorText: {
    color: appColors.red600,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  successText: {
    color: appColors.green600,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  scrollArea: {
    maxHeight: 460,
  },
  addCard: {
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate800,
    marginBottom: 10,
  },
  formRow: {
    gap: 10,
  },
  formRowInline: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate300,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: appColors.slate900,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue600,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    justifyContent: 'center',
    height: 42,
  },
  actionBtnText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  smallZoneChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate300,
  },
  smallZoneChipActive: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue600,
  },
  smallZoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  smallZoneTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  itemsList: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.slate200,
    padding: 14,
    gap: 14,
  },
  listItemActive: {
    borderColor: appColors.blue600,
    backgroundColor: appColors.slate50,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate900,
    flexShrink: 1,
  },
  itemDesc: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
    flexShrink: 1,
  },
  itemMeta: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  usersCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: appColors.slate500,
    fontWeight: '500',
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.green50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: appColors.green200,
  },
  selectedPillText: {
    fontSize: 11,
    color: appColors.green600,
    fontWeight: '700',
  },
});
