import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { AttendanceSession, UserProfile } from '../../../model/detector';
import {
  X,
  Clock,
  DoorOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  Users,
  Percent,
  Camera,
} from 'lucide-react-native';
import { useResponsive } from '../../../hooks/use-responsive';
import { appColors } from '../../../const/app-colors';
import { appUtils } from '../../../utils';

interface SessionDetailModalProps {
  visible: boolean;
  session: AttendanceSession | null;
  userProfiles: UserProfile[];
  onClose: () => void;
}

type FilterType = 'all' | 'present' | 'verify' | 'missing';

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  visible,
  session,
  userProfiles,
  onClose,
}) => {
  const { isPhone } = useResponsive();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Assemble list of users relevant to this session
  const sessionUsers = useMemo(() => {
    if (!session) return [];

    // All users assigned to this room + any user that has attendance recorded in session
    const roomUsers = userProfiles.filter(u => u.roomId === session.roomId);
    const attendedUserIds = Object.keys(session.attendanceMap || {});

    const map = new Map<string, UserProfile>();
    roomUsers.forEach(u => map.set(u.id, u));
    attendedUserIds.forEach(id => {
      if (!map.has(id)) {
        const found = userProfiles.find(u => u.id === id);
        if (found) {
          map.set(id, found);
        } else {
          // Unrecognized or guest face detected during session
          const record = session.attendanceMap?.[id];
          map.set(id, {
            id,
            fullName: 'Khuôn mặt chưa nhận diện',
            code: 'UNKNOWN',
            avatarUri: record?.detectedImageUrl || '',
            photos: [],
            zoneId: session.zoneId,
            roomId: session.roomId,
            enrolledAt: record?.timestamp || '',
          });
        }
      }
    });

    return Array.from(map.values()).map(u => {
      const record = session.attendanceMap?.[u.id];
      const status: 'present' | 'verify' | 'missing' = record
        ? record.status
        : 'missing';
      return {
        user: u,
        status,
        confidence: record?.confidence,
        timestamp: record?.timestamp,
        detectedImageUrl: record?.detectedImageUrl,
      };
    });
  }, [session, userProfiles]);

  const filteredUsers = useMemo(() => {
    return sessionUsers.filter(item => {
      // Status filter
      if (filter !== 'all' && item.status !== filter) return false;
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.user.fullName.toLowerCase().includes(q) ||
        item.user.code.toLowerCase().includes(q)
      );
    });
  }, [sessionUsers, filter, searchQuery]);

  if (!session) return null;

  const presentCount = session.presentCount || 0;
  const verifyCount = session.verifyCount || 0;
  const missingCount = session.missingCount || 0;
  const totalCount = session.totalCount || sessionUsers.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, isPhone && styles.modalCardPhone]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
              <View style={styles.titleRow}>
                <AppText style={styles.sessionTitle} numberOfLines={1} ellipsizeMode="tail">
                  {session.name}
                </AppText>
                {session.isActive ? (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <AppText style={styles.activeBadgeText}>Đang diễn ra</AppText>
                  </View>
                ) : (
                  <View style={styles.finishedBadge}>
                    <CheckCircle2 size={12} color={appColors.slate600} style={{ flexShrink: 0 }} />
                    <AppText style={styles.finishedBadgeText}>Đã hoàn thành</AppText>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Building2 size={13} color={appColors.slate400} style={{ flexShrink: 0 }} />
                  <AppText style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                    {session.zoneName || 'Khu'}
                  </AppText>
                </View>
                <AppText style={styles.metaDivider}>•</AppText>
                <View style={styles.metaItem}>
                  <DoorOpen size={13} color={appColors.blue600} style={{ flexShrink: 0 }} />
                  <AppText
                    style={[styles.metaText, { color: appColors.blue600, fontWeight: '700' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {session.roomName}
                  </AppText>
                </View>
                <AppText style={styles.metaDivider}>•</AppText>
                <View style={styles.metaItem}>
                  <Clock size={13} color={appColors.slate400} style={{ flexShrink: 0 }} />
                  <AppText style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                    Bắt đầu: {session.startTime}
                  </AppText>
                </View>
                {Boolean(session.endTime) && (
                  <>
                    <AppText style={styles.metaDivider}>•</AppText>
                    <View style={styles.metaItem}>
                      <Clock size={13} color={appColors.slate400} style={{ flexShrink: 0 }} />
                      <AppText style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                        Kết thúc: {session.endTime}
                      </AppText>
                    </View>
                  </>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Bar */}
          {isPhone ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricsBarPhone}
            >
              <View style={styles.metricItemPhone}>
                <View style={styles.metricIconWrap}>
                  <Users size={15} color={appColors.slate700} />
                </View>
                <View>
                  <AppText style={styles.metricLabel}>Tổng sĩ số</AppText>
                  <AppText style={styles.metricValue}>{totalCount}</AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItemPhone}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.green50 }]}>
                  <CheckCircle2 size={15} color={appColors.green600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.green700 }]}>
                    Có mặt
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.green700 }]}>
                    {presentCount}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItemPhone}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.amber50 }]}>
                  <AlertTriangle size={15} color={appColors.amber600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.amber600 }]}>
                    Còn thiếu
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.amber600 }]}>
                    {missingCount}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItemPhone}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.red50 }]}>
                  <AlertCircle size={15} color={appColors.red600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.red700 }]}>
                    Xác minh
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.red700 }]}>
                    {verifyCount}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItemPhone}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.blue50 }]}>
                  <Percent size={15} color={appColors.blue600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.blue700 }]}>
                    Tỷ lệ
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.blue700 }]}>
                    {attendanceRate}%
                  </AppText>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.metricsBar}>
              <View style={styles.metricItem}>
                <View style={styles.metricIconWrap}>
                  <Users size={16} color={appColors.slate700} />
                </View>
                <View>
                  <AppText style={styles.metricLabel}>Tổng sĩ số</AppText>
                  <AppText style={styles.metricValue}>{totalCount}</AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.green50 }]}>
                  <CheckCircle2 size={16} color={appColors.green600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.green700 }]}>
                    Đã có mặt
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.green700 }]}>
                    {presentCount}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.amber50 }]}>
                  <AlertTriangle size={16} color={appColors.amber600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.amber600 }]}>
                    Còn thiếu
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.amber600 }]}>
                    {missingCount}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.red50 }]}>
                  <AlertCircle size={16} color={appColors.red600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.red700 }]}>
                    Xác minh
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.red700 }]}>
                    {verifyCount}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <View style={[styles.metricIconWrap, { backgroundColor: appColors.blue50 }]}>
                  <Percent size={16} color={appColors.blue600} />
                </View>
                <View>
                  <AppText style={[styles.metricLabel, { color: appColors.blue700 }]}>
                    Tỷ lệ có mặt
                  </AppText>
                  <AppText style={[styles.metricValue, { color: appColors.blue700 }]}>
                    {attendanceRate}%
                  </AppText>
                </View>
              </View>
            </View>
          )}

          {/* Filter & Search Bar */}
          <View style={[styles.filterSection, isPhone && styles.filterSectionPhone]}>
            <View style={[styles.tabsRow, isPhone && styles.tabsRowPhone]}>
              <TouchableOpacity
                style={[styles.tabBtn, filter === 'all' && styles.tabBtnActive]}
                onPress={() => setFilter('all')}
              >
                <AppText
                  style={[styles.tabBtnText, filter === 'all' && styles.tabBtnTextActive]}
                >
                  Tất cả ({sessionUsers.length})
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, filter === 'present' && styles.tabBtnActive]}
                onPress={() => setFilter('present')}
              >
                <AppText
                  style={[styles.tabBtnText, filter === 'present' && styles.tabBtnTextActive]}
                >
                  Đã có ({presentCount})
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, filter === 'missing' && styles.tabBtnActive]}
                onPress={() => setFilter('missing')}
              >
                <AppText
                  style={[styles.tabBtnText, filter === 'missing' && styles.tabBtnTextActive]}
                >
                  Thiếu ({missingCount})
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, filter === 'verify' && styles.tabBtnActive]}
                onPress={() => setFilter('verify')}
              >
                <AppText
                  style={[styles.tabBtnText, filter === 'verify' && styles.tabBtnTextActive]}
                >
                  Xác minh ({verifyCount})
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchWrap, isPhone && styles.searchWrapPhone]}>
              <Search size={16} color={appColors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm học viên trong phiên..."
                placeholderTextColor={appColors.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {Boolean(searchQuery) && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={appColors.slate400} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Members Attendance List */}
          <FlatList
            key={isPhone ? 'session-detail-1-col' : 'session-detail-2-col'}
            data={filteredUsers}
            keyExtractor={item => item.user.id}
            contentContainerStyle={styles.listContent}
            numColumns={isPhone ? 1 : 2}
            columnWrapperStyle={isPhone ? undefined : styles.columnWrapper}
            renderItem={({ item }) => {
              const { user, status, confidence, timestamp, detectedImageUrl } = item;
              const isPresent = status === 'present';
              const isVerify = status === 'verify';

              // Priority: Show real camera detected/scanned photo if present, otherwise profile avatar
              const photoToShow = detectedImageUrl || user.avatarUri;
              const isCameraPhoto = Boolean(detectedImageUrl);

              return (
                <View style={styles.userCard}>
                  {photoToShow ? (
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: appUtils.getUrlImage(photoToShow) }} style={styles.avatar} />
                      {isCameraPhoto && (
                        <View style={styles.cameraIndicator}>
                          <Camera size={9} color={appColors.white} />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                      <AppText style={styles.placeholderText}>
                        {(user.fullName || 'N')[0]}
                      </AppText>
                    </View>
                  )}

                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <AppText style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                      {user.fullName}
                    </AppText>
                    <AppText style={styles.userCode} numberOfLines={1}>{user.code}</AppText>

                    {/* Detection info if attended */}
                    {Boolean(timestamp) && (
                      <AppText style={styles.detectTimeText} numberOfLines={1} ellipsizeMode="tail">
                        Lúc: {timestamp}{' '}
                        {confidence !== undefined
                          ? `(${confidence > 1 ? Math.round(confidence) : Math.round(confidence * 100)}%)`
                          : ''}
                      </AppText>
                    )}
                  </View>

                  {/* Status Badge */}
                  <View style={styles.statusBadgeWrap}>
                    {isPresent ? (
                      <View style={styles.presentBadge}>
                        <CheckCircle2 size={12} color={appColors.green600} style={{ flexShrink: 0 }} />
                        <AppText style={styles.presentBadgeText}>Đã có</AppText>
                      </View>
                    ) : isVerify ? (
                      <View style={styles.verifyBadge}>
                        <AlertCircle size={12} color={appColors.red600} style={{ flexShrink: 0 }} />
                        <AppText style={styles.verifyBadgeText}>Xác minh</AppText>
                      </View>
                    ) : (
                      <View style={styles.missingBadge}>
                        <AlertTriangle size={12} color={appColors.amber600} style={{ flexShrink: 0 }} />
                        <AppText style={styles.missingBadgeText}>Còn thiếu</AppText>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={40} color={appColors.slate300} />
                <AppText style={styles.emptyText}>
                  Không có học viên nào phù hợp bộ lọc
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 820,
    maxHeight: '90%',
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.slate900,
    flexShrink: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.emerald50,
    borderWidth: 1,
    borderColor: appColors.emerald200,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
    flexShrink: 0,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: appColors.emerald600,
    flexShrink: 0,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.emerald600,
  },
  finishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
    flexShrink: 0,
  },
  finishedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: appColors.slate600,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    color: appColors.slate500,
    fontWeight: '500',
    flexShrink: 1,
  },
  metaDivider: {
    fontSize: 12,
    color: appColors.slate300,
    flexShrink: 0,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
    flexShrink: 0,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: appColors.slate200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: appColors.slate500,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: appColors.slate900,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: appColors.slate200,
    marginHorizontal: 8,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: appColors.slate100,
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: appColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  tabBtnTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  searchWrap: {
    flex: 1,
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate100,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: appColors.slate900,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  userCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: appColors.green600,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: appColors.white,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
  },
  placeholderAvatar: {
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.blue600,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate900,
    flexShrink: 1,
  },
  userCode: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 1,
  },
  detectTimeText: {
    fontSize: 10,
    color: appColors.emerald600,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadgeWrap: {
    marginLeft: 4,
    flexShrink: 0,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.green50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: appColors.green200,
  },
  presentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.green700,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.red50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: appColors.red200,
  },
  verifyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.red700,
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.amber50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: appColors.amber200,
  },
  missingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.amber600,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: appColors.slate400,
    fontWeight: '500',
  },
  modalCardPhone: {
    maxWidth: '100%',
    maxHeight: '94%',
    padding: 14,
    borderRadius: 16,
  },
  metricsBarPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 8,
  },
  metricItemPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  filterSectionPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },
  tabsRowPhone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchWrapPhone: {
    maxWidth: '100%',
    width: '100%',
  },
});
