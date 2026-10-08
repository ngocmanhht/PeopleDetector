import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import { sessionService, attendanceService } from '../../../services/api';
import { AppText } from '../../../components/app-text';
import {
  AttendanceSession,
  UserProfile,
  Room,
  Zone,
  ScanHistoryItem,
} from '../../../model/detector';
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
  Timer,
  LogIn,
  LogOut,
  History,
} from 'lucide-react-native';
import { useResponsive } from '../../../hooks/use-responsive';
import { appColors } from '../../../const/app-colors';
import { appUtils } from '../../../utils';

interface SessionDetailModalProps {
  visible: boolean;
  session: AttendanceSession | null;
  userProfiles: UserProfile[];
  rooms?: Room[];
  zones?: Zone[];
  onClose: () => void;
}

type FilterType = 'all' | 'present' | 'verify' | 'missing';

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  visible,
  session,
  userProfiles,
  rooms = [],
  zones = [],
  onClose,
}: SessionDetailModalProps) => {
  const { isPhone } = useResponsive();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuditItem, setSelectedAuditItem] =
    useState<ScanHistoryItem | null>(null);

  const [liveSession, setLiveSession] = useState<AttendanceSession | null>(
    session,
  );
  const [liveHistoryItems, setLiveHistoryItems] = useState<
    ScanHistoryItem[] | null
  >(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    setLiveSession(session);
    setLiveHistoryItems(session?.scanHistory || null);

    if (visible && session?.id) {
      setIsLoadingDetail(true);
      Promise.all([
        sessionService.getSessionById(session.id).catch(() => null),
        attendanceService
          .getHistory({ sessionId: session.id, limit: 100 })
          .catch(() => null),
      ])
        .then(([sessionRes, historyRes]) => {
          if (sessionRes?.data) {
            setLiveSession(prev => ({
              ...(prev || session),
              ...sessionRes.data,
            }));
          }

          const rawRecords = historyRes?.data;
          if (Array.isArray(rawRecords) && rawRecords.length > 0) {
            interface RawRecordItem {
              id?: string;
              userId: string;
              createdAt?: string;
              timestamp?: string;
              detectedImageUrl?: string;
              status?: 'present' | 'verify' | 'missing';
              confidence: number;
              userProfile?: UserProfile;
            }
            const dbHistory: ScanHistoryItem[] = (
              rawRecords as RawRecordItem[]
            ).map(r => {
              const prof =
                r.userProfile || userProfiles.find(u => u.id === r.userId);
              const userRoom = rooms.find(rm => rm.id === prof?.roomId);
              const userZone = zones.find(z => z.id === prof?.zoneId);
              const firstInStr = r.createdAt
                ? dayjs(r.createdAt).format('HH:mm:ss')
                : r.timestamp || '';
              const lastOutStr = r.timestamp
                ? dayjs(r.timestamp).isValid()
                  ? dayjs(r.timestamp).format('HH:mm:ss')
                  : r.timestamp
                : firstInStr;

              const isEntry =
                session?.scanMode === 'all' || session?.roomId === 'all';

              return {
                id: r.id || `rec-${r.userId}`,
                userId: r.userId,
                fullName: prof?.fullName || 'Nhân sự',
                code: prof?.code || 'ID',
                avatarUri: r.detectedImageUrl || prof?.avatarUri || '',
                roomId: prof?.roomId,
                roomName: userRoom?.name || session.roomName || 'Phòng',
                zoneId: prof?.zoneId,
                zoneName: userZone?.name || session.zoneName || 'Khu',
                status: r.status || 'present',
                confidence:
                  r.confidence > 1
                    ? Math.round(r.confidence)
                    : Math.round(r.confidence * 100),
                timestamp: r.timestamp || '',
                scanMode: session.scanMode || 'all',
                firstInTime: firstInStr,
                firstInEpoch: r.createdAt ? new Date(r.createdAt).getTime() : 0,
                lastOutTime: lastOutStr !== firstInStr ? lastOutStr : '',
                lastOutEpoch: r.timestamp ? new Date(r.timestamp).getTime() : 0,
                scanCount: 1,
                lastScanTime: lastOutStr || firstInStr,
                isFacilityEntry: isEntry,
                history: [
                  {
                    id: `hist-in-${r.id}`,
                    timestamp: firstInStr,
                    epochTime: r.createdAt
                      ? new Date(r.createdAt).getTime()
                      : Date.now(),
                    confidence:
                      r.confidence > 1
                        ? Math.round(r.confidence)
                        : Math.round(r.confidence * 100),
                    avatarUri: r.detectedImageUrl || prof?.avatarUri,
                    scanMode: session.scanMode || 'all',
                  },
                  ...(lastOutStr && lastOutStr !== firstInStr
                    ? [
                        {
                          id: `hist-out-${r.id}`,
                          timestamp: lastOutStr,
                          epochTime: r.timestamp
                            ? new Date(r.timestamp).getTime()
                            : Date.now(),
                          confidence:
                            r.confidence > 1
                              ? Math.round(r.confidence)
                              : Math.round(r.confidence * 100),
                          avatarUri: r.detectedImageUrl || prof?.avatarUri,
                          scanMode: session.scanMode || 'all',
                        },
                      ]
                    : []),
                ],
              };
            });
            setLiveHistoryItems(dbHistory);
          }
        })
        .finally(() => {
          setIsLoadingDetail(false);
        });
    }
  }, [visible, session, userProfiles, rooms, zones]);

  const activeSession = liveSession || session;

  const isAllMode =
    activeSession?.scanMode === 'all' || activeSession?.roomId === 'all';
  const isZoneMode = activeSession?.scanMode === 'zone';

  // Format Duration HH:mm:ss
  const formattedDuration = useMemo(() => {
    if (!activeSession?.durationSeconds) return null;
    const durSec = activeSession.durationSeconds;
    const hours = Math.floor(durSec / 3600);
    const minutes = Math.floor((durSec % 3600) / 60);
    const seconds = durSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [activeSession?.durationSeconds]);

  // Target profiles that were expected for this session
  const targetMembers = useMemo(() => {
    if (!activeSession) return [];
    if (isAllMode) {
      return userProfiles;
    }
    if (isZoneMode) {
      const roomIdsInZone = new Set(
        rooms.filter(r => r.zoneId === activeSession.zoneId).map(r => r.id),
      );
      return userProfiles.filter(
        u =>
          !u.isVisitor &&
          (u.zoneId === activeSession.zoneId ||
            (u.roomId && roomIdsInZone.has(u.roomId))),
      );
    }
    return userProfiles.filter(u => u.roomId === activeSession.roomId);
  }, [activeSession, isAllMode, isZoneMode, rooms, userProfiles]);

  // Assemble list of items combining scanHistory and missing members
  const itemsList = useMemo(() => {
    if (!activeSession) return [];

    const effectiveScanHistory = liveHistoryItems || activeSession.scanHistory;

    // Case 1: Session has rich scanHistory array
    if (effectiveScanHistory && effectiveScanHistory.length > 0) {
      const scannedItems = effectiveScanHistory;
      const scannedUserIds = new Set(
        scannedItems
          .filter(i => i.status === 'present' && Boolean(i.userId))
          .map(i => i.userId!),
      );

      // Generate missing members from target pool
      const missingItems: ScanHistoryItem[] = targetMembers
        .filter(u => !scannedUserIds.has(u.id))
        .map(u => {
          const userRoom = rooms.find(r => r.id === u.roomId);
          const userZone = zones.find(z => z.id === u.zoneId);
          return {
            id: `missing-${u.id}`,
            userId: u.id,
            fullName: u.fullName,
            code: u.code,
            avatarUri: u.avatarUri,
            roomId: u.roomId,
            roomName: userRoom?.name || 'Phòng',
            zoneId: u.zoneId,
            zoneName: userZone?.name || 'Khu',
            status: 'missing' as const,
            confidence: 0,
            firstInTime: '',
            firstInEpoch: 0,
            lastOutTime: '',
            lastOutEpoch: 0,
            scanCount: 0,
            history: [],
            lastScanTime: '',
            isFacilityEntry: isAllMode,
          };
        });

      return [...scannedItems, ...missingItems];
    }

    // Case 2: Legacy fallback to attendanceMap
    const roomUsers = targetMembers;
    const attendedUserIds = Object.keys(activeSession.attendanceMap || {});
    const map = new Map<string, UserProfile>();
    roomUsers.forEach(u => map.set(u.id, u));

    attendedUserIds.forEach(id => {
      if (!map.has(id)) {
        const found = userProfiles.find(u => u.id === id);
        if (found) {
          map.set(id, found);
        } else {
          const record = activeSession.attendanceMap?.[id];
          map.set(id, {
            id,
            fullName: 'Chưa xác minh',
            code: 'STRANGER',
            avatarUri: record?.detectedImageUrl || '',
            photos: [],
            zoneId: activeSession.zoneId || '',
            roomId: activeSession.roomId || '',
            enrolledAt: record?.timestamp || '',
          });
        }
      }
    });

    return Array.from(map.values()).map(u => {
      const record = activeSession.attendanceMap?.[u.id];
      const status: 'present' | 'verify' | 'missing' = record
        ? record.status
        : 'missing';
      const userRoom = rooms.find(r => r.id === u.roomId);
      const userZone = zones.find(z => z.id === u.zoneId);

      return {
        id: u.id,
        userId: u.id,
        fullName: u.fullName,
        code: u.code,
        avatarUri: record?.detectedImageUrl || u.avatarUri,
        roomId: u.roomId,
        roomName: userRoom?.name || activeSession.roomName,
        zoneId: u.zoneId,
        zoneName: userZone?.name || activeSession.zoneName,
        status,
        confidence: record?.confidence || 0,
        firstInTime: record?.timestamp || '',
        firstInEpoch: 0,
        lastOutTime: record?.timestamp || '',
        lastOutEpoch: 0,
        scanCount: record ? 1 : 0,
        history: record
          ? [
              {
                id: `scan-${u.id}`,
                timestamp: record.timestamp,
                epochTime: Date.now(),
                confidence: record.confidence,
                avatarUri: record.detectedImageUrl,
                scanMode: isAllMode ? 'all' : 'room',
              },
            ]
          : [],
        lastScanTime: record?.timestamp || '',
        isFacilityEntry: isAllMode,
      } as ScanHistoryItem;
    });
  }, [
    activeSession,
    liveHistoryItems,
    targetMembers,
    isAllMode,
    rooms,
    zones,
    userProfiles,
  ]);

  const filteredItems = useMemo(() => {
    return itemsList.filter(item => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.fullName.toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.roomName || '').toLowerCase().includes(q)
      );
    });
  }, [itemsList, filter, searchQuery]);

  if (!activeSession) return null;

  const verifiedCount = itemsList.filter(i => i.status === 'present').length;
  const unverifiedCount = itemsList.filter(i => i.status === 'verify').length;
  const missingCount = itemsList.filter(i => i.status === 'missing').length;
  const totalCount = targetMembers.length || itemsList.length;
  const totalScans =
    activeSession.totalScansCount ||
    itemsList.reduce((sum, item) => sum + item.scanCount, 0);
  const attendanceRate =
    totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={[
        'portrait',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, isPhone && styles.modalCardPhone]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
              <View style={styles.titleRow}>
                <AppText
                  style={styles.sessionTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {activeSession.name}
                </AppText>
                {activeSession.isActive ? (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <AppText style={styles.activeBadgeText}>Đang quét</AppText>
                  </View>
                ) : (
                  <View style={styles.finishedBadge}>
                    <CheckCircle2
                      size={12}
                      color={appColors.slate600}
                      style={{ flexShrink: 0 }}
                    />
                    <AppText style={styles.finishedBadgeText}>
                      Đã kết thúc
                    </AppText>
                  </View>
                )}
                <View
                  style={[
                    styles.modeBadge,
                    isAllMode
                      ? styles.modeBadgeAll
                      : isZoneMode
                      ? styles.modeBadgeZone
                      : styles.modeBadgeRoom,
                  ]}
                >
                  <AppText
                    style={[
                      styles.modeBadgeText,
                      isAllMode
                        ? styles.modeBadgeTextAll
                        : isZoneMode
                        ? styles.modeBadgeTextZone
                        : styles.modeBadgeTextRoom,
                    ]}
                  >
                    {isAllMode
                      ? 'QUÉT ALL'
                      : isZoneMode
                      ? 'THEO KHU'
                      : 'THEO PHÒNG'}
                  </AppText>
                </View>
                {isLoadingDetail && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      marginLeft: 6,
                    }}
                  >
                    <ActivityIndicator size="small" color={appColors.blue600} />
                    <AppText
                      style={{
                        fontSize: 11,
                        color: appColors.blue600,
                        fontWeight: '600',
                      }}
                    >
                      Đang đồng bộ DB...
                    </AppText>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Building2
                    size={13}
                    color={appColors.slate400}
                    style={{ flexShrink: 0 }}
                  />
                  <AppText
                    style={styles.metaText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {isAllMode ? 'Toàn cơ sở' : activeSession.zoneName || 'Khu'}
                  </AppText>
                </View>
                <AppText style={styles.metaDivider}>•</AppText>
                <View style={styles.metaItem}>
                  <DoorOpen
                    size={13}
                    color={appColors.blue600}
                    style={{ flexShrink: 0 }}
                  />
                  <AppText
                    style={[
                      styles.metaText,
                      { color: appColors.blue600, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {isAllMode
                      ? 'Tất cả phòng ban'
                      : isZoneMode
                      ? 'Tất cả các phòng trong khu'
                      : activeSession.roomName}
                  </AppText>
                </View>
                <AppText style={styles.metaDivider}>•</AppText>
                <View style={styles.metaItem}>
                  <Clock
                    size={13}
                    color={appColors.slate400}
                    style={{ flexShrink: 0 }}
                  />
                  <AppText
                    style={styles.metaText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Bắt đầu: {activeSession.startTime}
                  </AppText>
                </View>
                {Boolean(activeSession.endTime) && (
                  <>
                    <AppText style={styles.metaDivider}>•</AppText>
                    <View style={styles.metaItem}>
                      <Clock
                        size={13}
                        color={appColors.slate400}
                        style={{ flexShrink: 0 }}
                      />
                      <AppText
                        style={styles.metaText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Kết thúc: {activeSession.endTime}
                      </AppText>
                    </View>
                  </>
                )}
                {Boolean(formattedDuration) && (
                  <>
                    <AppText style={styles.metaDivider}>•</AppText>
                    <View style={styles.metaItem}>
                      <Timer
                        size={13}
                        color={appColors.blue600}
                        style={{ flexShrink: 0 }}
                      />
                      <AppText
                        style={[
                          styles.metaText,
                          { color: appColors.blue700, fontWeight: '700' },
                        ]}
                      >
                        Thời gian quét: {formattedDuration}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricsBar}
          >
            {/* Tổng sĩ số / đối tượng */}
            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Users size={15} color={appColors.slate700} />
              </View>
              <View>
                <AppText style={styles.metricLabel}>
                  {isAllMode ? 'Toàn cơ sở' : 'Tổng sĩ số'}
                </AppText>
                <AppText style={styles.metricValue}>{totalCount}</AppText>
              </View>
            </View>

            <View style={styles.metricDivider} />

            {/* Đã vào cơ sở / Có mặt */}
            <View style={styles.metricItem}>
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: appColors.green50 },
                ]}
              >
                <CheckCircle2 size={15} color={appColors.green600} />
              </View>
              <View>
                <AppText
                  style={[styles.metricLabel, { color: appColors.green700 }]}
                >
                  {isAllMode ? 'Đã vào cơ sở' : 'Đã có mặt'}
                </AppText>
                <AppText
                  style={[styles.metricValue, { color: appColors.green700 }]}
                >
                  {verifiedCount} ({attendanceRate}%)
                </AppText>
              </View>
            </View>

            <View style={styles.metricDivider} />

            {/* Chưa xác minh (Người lạ) */}
            <View style={styles.metricItem}>
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: appColors.amber50 },
                ]}
              >
                <AlertCircle size={15} color={appColors.amber600} />
              </View>
              <View>
                <AppText
                  style={[styles.metricLabel, { color: appColors.amber700 }]}
                >
                  Chưa xác minh
                </AppText>
                <AppText
                  style={[styles.metricValue, { color: appColors.amber700 }]}
                >
                  {unverifiedCount} người lạ
                </AppText>
              </View>
            </View>

            <View style={styles.metricDivider} />

            {/* Còn thiếu */}
            <View style={styles.metricItem}>
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: appColors.red50 },
                ]}
              >
                <AlertTriangle size={15} color={appColors.red600} />
              </View>
              <View>
                <AppText
                  style={[styles.metricLabel, { color: appColors.red700 }]}
                >
                  Còn thiếu
                </AppText>
                <AppText
                  style={[styles.metricValue, { color: appColors.red700 }]}
                >
                  {missingCount}
                </AppText>
              </View>
            </View>

            <View style={styles.metricDivider} />

            {/* Tổng lượt quét */}
            <View style={styles.metricItem}>
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: appColors.blue50 },
                ]}
              >
                <History size={15} color={appColors.blue600} />
              </View>
              <View>
                <AppText
                  style={[styles.metricLabel, { color: appColors.blue700 }]}
                >
                  Tổng lượt quét
                </AppText>
                <AppText
                  style={[styles.metricValue, { color: appColors.blue700 }]}
                >
                  {totalScans} lượt
                </AppText>
              </View>
            </View>
          </ScrollView>

          {/* Filter Tabs & Search Bar */}
          <View style={styles.controlsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsWrap}
            >
              <TouchableOpacity
                style={[styles.tabBtn, filter === 'all' && styles.tabBtnActive]}
                onPress={() => setFilter('all')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    filter === 'all' && styles.tabBtnTextActive,
                  ]}
                >
                  Tất cả ({itemsList.length})
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  filter === 'present' && styles.tabBtnActive,
                ]}
                onPress={() => setFilter('present')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    filter === 'present' && styles.tabBtnTextActive,
                  ]}
                >
                  {isAllMode ? 'Đã vào cơ sở' : 'Có mặt'} ({verifiedCount})
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  filter === 'verify' && styles.tabBtnActive,
                ]}
                onPress={() => setFilter('verify')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    filter === 'verify' && styles.tabBtnTextActive,
                  ]}
                >
                  Chưa xác minh ({unverifiedCount})
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  filter === 'missing' && styles.tabBtnActive,
                ]}
                onPress={() => setFilter('missing')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    filter === 'missing' && styles.tabBtnTextActive,
                  ]}
                >
                  Còn thiếu ({missingCount})
                </AppText>
              </TouchableOpacity>
            </ScrollView>

            <View
              style={[styles.searchWrap, isPhone && styles.searchWrapPhone]}
            >
              <Search size={16} color={appColors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm nhân sự, mã số, phòng ban..."
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

          {/* Members Attendance & Scan History List */}
          <FlatList
            key={isPhone ? 'session-detail-1-col' : 'session-detail-2-col'}
            data={filteredItems}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            numColumns={isPhone ? 1 : 2}
            columnWrapperStyle={isPhone ? undefined : styles.columnWrapper}
            renderItem={({ item }) => {
              const isPresent = item.status === 'present';
              const isVerify = item.status === 'verify';

              return (
                <TouchableOpacity
                  style={[
                    styles.userCard,
                    isPresent && styles.userCardPresent,
                    isVerify && styles.userCardVerify,
                  ]}
                  onPress={() => {
                    if (item.history && item.history.length > 0) {
                      setSelectedAuditItem(item);
                    }
                  }}
                  activeOpacity={0.8}
                >
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

                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <View style={styles.nameRow}>
                      <AppText
                        style={styles.userName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.fullName}
                      </AppText>
                      {item.code ? (
                        <View style={styles.codeBadge}>
                          <AppText style={styles.codeBadgeText}>
                            {item.code}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    {/* Department Tag */}
                    {Boolean(item.roomName) && (
                      <View style={styles.deptBadge}>
                        <Building2 size={11} color={appColors.slate600} />
                        <AppText style={styles.deptBadgeText} numberOfLines={1}>
                          {item.roomName}
                          {item.zoneName ? ` • ${item.zoneName}` : ''}
                        </AppText>
                      </View>
                    )}

                    {/* IN & OUT Times Row */}
                    {isPresent && Boolean(item.firstInTime) && (
                      <View style={styles.inOutRow}>
                        <View style={styles.inBadge}>
                          <LogIn size={11} color={appColors.emerald700} />
                          <AppText style={styles.inBadgeText}>
                            IN: {item.firstInTime}
                          </AppText>
                        </View>
                        {Boolean(item.lastOutTime) && (
                          <View style={styles.outBadge}>
                            <LogOut size={11} color={appColors.blue700} />
                            <AppText style={styles.outBadgeText}>
                              OUT: {item.lastOutTime}
                            </AppText>
                          </View>
                        )}
                        {item.scanCount > 1 && (
                          <View style={styles.countBadge}>
                            <AppText style={styles.countBadgeText}>
                              {item.scanCount} lượt
                            </AppText>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Stranger Info */}
                    {isVerify && (
                      <View style={styles.strangerRow}>
                        <AlertCircle size={12} color={appColors.amber600} />
                        <AppText style={styles.strangerText}>
                          Phát hiện: {item.firstInTime || item.lastScanTime}
                          {item.scanCount > 1
                            ? ` (${item.scanCount} lượt)`
                            : ''}
                        </AppText>
                      </View>
                    )}
                  </View>

                  {/* Status Badge */}
                  <View style={styles.statusBadgeWrap}>
                    {isPresent ? (
                      <View style={styles.presentBadge}>
                        <CheckCircle2
                          size={12}
                          color={appColors.green600}
                          style={{ flexShrink: 0 }}
                        />
                        <AppText style={styles.presentBadgeText}>
                          {isAllMode ? 'Đã vào cơ sở' : 'Đã có'}
                        </AppText>
                      </View>
                    ) : isVerify ? (
                      <View style={styles.verifyBadge}>
                        <AlertCircle
                          size={12}
                          color={appColors.amber600}
                          style={{ flexShrink: 0 }}
                        />
                        <AppText style={styles.verifyBadgeText}>
                          Chưa xác minh
                        </AppText>
                      </View>
                    ) : (
                      <View style={styles.missingBadge}>
                        <AlertTriangle
                          size={12}
                          color={appColors.slate500}
                          style={{ flexShrink: 0 }}
                        />
                        <AppText style={styles.missingBadgeText}>
                          Còn thiếu
                        </AppText>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={40} color={appColors.slate300} />
                <AppText style={styles.emptyText}>
                  Không có nhân sự nào phù hợp bộ lọc
                </AppText>
              </View>
            }
          />

          {/* Sub-modal: Individual Audit Log of All Scans for Selected Person */}
          <Modal
            visible={Boolean(selectedAuditItem)}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedAuditItem(null)}
          >
            <View style={styles.auditOverlay}>
              <View style={styles.auditModalCard}>
                <View style={styles.auditHeader}>
                  <View style={styles.auditHeaderLeft}>
                    <History size={18} color={appColors.blue600} />
                    <View>
                      <AppText style={styles.auditTitle}>
                        Lịch sử quét chi tiết
                      </AppText>
                      <AppText style={styles.auditSubtitle}>
                        {selectedAuditItem?.fullName} (
                        {selectedAuditItem?.code || 'N/A'}) •{' '}
                        {selectedAuditItem?.scanCount} lượt phát hiện
                      </AppText>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedAuditItem(null)}
                    style={styles.closeBtn}
                  >
                    <X size={18} color={appColors.slate500} />
                  </TouchableOpacity>
                </View>

                {/* Audit summary banner */}
                <View style={styles.auditSummaryBanner}>
                  <View style={styles.auditSummaryItem}>
                    <LogIn size={14} color={appColors.emerald700} />
                    <AppText style={styles.auditSummaryLabel}>
                      Giờ vào (IN):
                    </AppText>
                    <AppText style={styles.auditSummaryVal}>
                      {selectedAuditItem?.firstInTime || '-'}
                    </AppText>
                  </View>
                  <View style={styles.auditSummaryItem}>
                    <LogOut size={14} color={appColors.blue700} />
                    <AppText style={styles.auditSummaryLabel}>
                      Giờ ra (OUT):
                    </AppText>
                    <AppText style={styles.auditSummaryVal}>
                      {selectedAuditItem?.lastOutTime || '-'}
                    </AppText>
                  </View>
                </View>

                {/* Chronological events */}
                <FlatList
                  data={selectedAuditItem?.history || []}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.auditList}
                  renderItem={({ item, index }) => (
                    <View style={styles.auditEventRow}>
                      <View style={styles.auditIndexBadge}>
                        <AppText style={styles.auditIndexText}>
                          #{(selectedAuditItem?.history || []).length - index}
                        </AppText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.auditEventTime}>
                          Thời điểm: {item.timestamp}
                        </AppText>
                        <AppText style={styles.auditEventSub}>
                          Chế độ:{' '}
                          {item.scanMode === 'all'
                            ? 'Quét All (Cơ sở)'
                            : 'Theo phòng'}{' '}
                          • Độ tin cậy: {item.confidence}%
                        </AppText>
                      </View>
                    </View>
                  )}
                />
              </View>
            </View>
          </Modal>
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
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 860,
    maxHeight: '92%',
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    flexDirection: 'column',
  },
  modalCardPhone: {
    padding: 14,
    maxHeight: '96%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionTitle: {
    fontSize: 18,
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
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modeBadgeAll: {
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  modeBadgeZone: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  modeBadgeRoom: {
    backgroundColor: appColors.slate100,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modeBadgeTextAll: {
    color: appColors.blue700,
  },
  modeBadgeTextZone: {
    color: '#92400E',
  },
  modeBadgeTextRoom: {
    color: appColors.slate700,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
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
    fontSize: 13,
    fontWeight: '800',
    color: appColors.slate900,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: appColors.slate200,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  tabsWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: appColors.slate100,
  },
  tabBtnActive: {
    backgroundColor: appColors.blue600,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.slate600,
  },
  tabBtnTextActive: {
    color: appColors.white,
  },
  searchWrap: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 6,
  },
  searchWrapPhone: {
    width: '100%',
    minWidth: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: appColors.slate900,
    padding: 0,
  },
  listContent: {
    paddingBottom: 16,
    gap: 8,
  },
  columnWrapper: {
    gap: 8,
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
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  userCardPresent: {
    borderColor: appColors.emerald200,
    backgroundColor: appColors.emerald50 + '20',
  },
  userCardVerify: {
    borderColor: appColors.amber200,
    backgroundColor: appColors.amber50 + '20',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
  },
  placeholderAvatar: {
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.blue700,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate900,
    flexShrink: 1,
  },
  codeBadge: {
    backgroundColor: appColors.slate100,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.slate600,
  },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  deptBadgeText: {
    fontSize: 11,
    color: appColors.slate600,
    fontWeight: '500',
    flexShrink: 1,
  },
  inOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  inBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.emerald50,
    borderWidth: 1,
    borderColor: appColors.emerald200,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
  },
  inBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.emerald700,
  },
  outBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
  },
  outBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.blue700,
  },
  countBadge: {
    backgroundColor: appColors.slate100,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.slate700,
  },
  strangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  strangerText: {
    fontSize: 11,
    color: appColors.amber700,
    fontWeight: '600',
  },
  statusBadgeWrap: {
    alignItems: 'flex-end',
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.emerald50,
    borderWidth: 1,
    borderColor: appColors.emerald200,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  presentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.emerald700,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.amber50,
    borderWidth: 1,
    borderColor: appColors.amber200,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.amber700,
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate100,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  missingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: appColors.slate600,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: appColors.slate400,
  },
  auditOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  auditModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: appColors.white,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'column',
    gap: 12,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  auditTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: appColors.slate900,
  },
  auditSubtitle: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 1,
  },
  auditSummaryBanner: {
    flexDirection: 'row',
    backgroundColor: appColors.slate50,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  auditSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: appColors.slate600,
  },
  auditSummaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: appColors.slate900,
  },
  auditList: {
    gap: 8,
    paddingVertical: 4,
  },
  auditEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  auditIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auditIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: appColors.blue700,
  },
  auditEventTime: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate800,
  },
  auditEventSub: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 1,
  },
});
