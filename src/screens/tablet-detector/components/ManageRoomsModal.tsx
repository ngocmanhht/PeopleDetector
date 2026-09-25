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

interface ManageRoomsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ManageRoomsModal: React.FC<ManageRoomsModalProps> = ({
  visible,
  onClose,
}) => {
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

  const handleAddZone = () => {
    if (!newZoneName.trim()) {
      setError('Vui lòng nhập tên khu vực.');
      return;
    }
    dispatch(
      addZone({
        name: newZoneName.trim(),
        description: newZoneDesc.trim(),
      })
    );
    setNewZoneName('');
    setNewZoneDesc('');
    setError('');
    setSuccess('Đã thêm khu vực mới thành công!');
    setTimeout(() => setSuccess(''), 2500);
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) {
      setError('Vui lòng nhập tên phòng.');
      return;
    }
    if (!newRoomZoneId) {
      setError('Vui lòng chọn khu vực trực thuộc.');
      return;
    }
    const cap = parseInt(newRoomCapacity, 10) || 30;
    dispatch(
      addRoom({
        name: newRoomName.trim(),
        zoneId: newRoomZoneId,
        capacity: cap,
      })
    );
    setNewRoomName('');
    setNewRoomCapacity('30');
    setError('');
    setSuccess('Đã thêm phòng học/làm việc mới thành công!');
    setTimeout(() => setSuccess(''), 2500);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <AppText style={styles.title}>Quản lý Khu & Phòng học / làm việc</AppText>
              <AppText style={styles.subtitle}>
                Xem danh sách khu vực, phòng và thêm mới nhanh chóng
              </AppText>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={22} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabRow}>
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
                          <Building2 size={20} color={appColors.blue600} />
                        </View>
                        <View style={styles.itemInfo}>
                          <AppText style={styles.itemName}>{z.name}</AppText>
                          <AppText style={styles.itemDesc}>
                            {z.description || 'Không có mô tả'}
                          </AppText>
                        </View>
                        <View style={styles.itemMeta}>
                          <AppText style={styles.metaText}>
                            {roomsCount} phòng • {membersCount} nhân sự
                          </AppText>
                          {isSelected && (
                            <View style={styles.selectedPill}>
                              <Check size={12} color={appColors.green600} />
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
                          <DoorOpen size={20} color={appColors.blue600} />
                        </View>
                        <View style={styles.itemInfo}>
                          <AppText style={styles.itemName}>{r.name}</AppText>
                          <AppText style={styles.itemDesc}>
                            Thuộc {zone?.name || 'Khu vực'} • Sức chứa {r.capacity || 30} người
                          </AppText>
                        </View>
                        <View style={styles.itemMeta}>
                          <View style={styles.usersCountRow}>
                            <Users size={14} color={appColors.slate500} />
                            <AppText style={styles.metaText}>
                              {membersCount} học viên
                            </AppText>
                          </View>
                          {isSelected && (
                            <View style={styles.selectedPill}>
                              <Check size={12} color={appColors.green600} />
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
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate900,
  },
  itemDesc: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  itemMeta: {
    alignItems: 'flex-end',
    gap: 6,
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
