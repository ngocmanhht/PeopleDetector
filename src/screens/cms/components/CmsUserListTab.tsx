import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppSelector } from '../../../store/hooks';
import {
  Search,
  FileSpreadsheet,
  UserPlus,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import { UserConditionStatus } from '../../../model/detector';
import { useResponsive } from '../../../hooks/use-responsive';
import { appColors } from '../../../const/app-colors';
import { appUtils } from '../../../utils';
import { AddUserModal } from '../../tablet-detector/components/AddUserModal';
import { BatchAddUserModal } from './BatchAddUserModal';
import { STATUS_CONFIG, getStatusConfig } from '../types';
import { styles } from '../styles';

interface CmsUserListTabProps {
  onSelectUser: (userId: string) => void;
}

export const CmsUserListTab: React.FC<CmsUserListTabProps> = ({
  onSelectUser,
}) => {
  const { isTablet } = useResponsive();
  const { userProfiles, rooms } = useAppSelector(state => state.detector);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRoomId] = useState<string>('all');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);

  // Filtered Users for Tab 2
  const filteredUsers = useMemo(() => {
    return userProfiles.filter(u => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phoneNumber && u.phoneNumber.includes(searchQuery));
      const matchStatus =
        filterStatus === 'all' ||
        (u.conditionStatus || 'normal') === filterStatus;
      const matchRoom =
        filterRoomId === 'all' || u.roomId === filterRoomId;
      return matchSearch && matchStatus && matchRoom;
    });
  }, [userProfiles, searchQuery, filterStatus, filterRoomId]);

  return (
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
            <AppText style={styles.batchAddBtnText}>+ Thêm danh sách</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addUserSingleBtn}
            onPress={() => setShowAddUserModal(true)}
          >
            <UserPlus size={16} color={appColors.white} />
            <AppText style={styles.addUserSingleBtnText}>+ Thêm 1 người</AppText>
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
              onPress={() => onSelectUser(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.userListAvatar}>
                {item.avatarUri ? (
                  <Image
                    source={{ uri: appUtils.getUrlImage(item.avatarUri) }}
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
                  <AppText style={styles.userListItemName} numberOfLines={1}>
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
