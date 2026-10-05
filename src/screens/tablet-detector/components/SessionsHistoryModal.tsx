import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { AttendanceSession } from '../../../model/detector';
import {
  X,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Timer,
  History,
  ChevronRight,
  RotateCw,
} from 'lucide-react-native';
import { useResponsive } from '../../../hooks/use-responsive';
import { appColors } from '../../../const/app-colors';
import { useAppDispatch } from '../../../store/hooks';
import { setSessions } from '../../../store/slices/detectorSlice';
import { sessionService } from '../../../services/api';

interface SessionsHistoryModalProps {
  visible: boolean;
  sessions: AttendanceSession[];
  onClose: () => void;
  onSelectSession: (session: AttendanceSession) => void;
}

type ModeFilter = 'all' | 'all_mode' | 'zone_mode' | 'room_mode';

export const SessionsHistoryModal: React.FC<SessionsHistoryModalProps> = ({
  visible,
  sessions,
  onClose,
  onSelectSession,
}) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSessionsFromBE = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await sessionService.getSessions({ limit: 50 });
      if (res && Array.isArray(res.data)) {
        dispatch(setSessions(res.data));
      }
    } catch (err) {
      console.log(
        '[SessionsHistoryModal] Failed to fetch sessions from BE:',
        err,
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (visible) {
      fetchSessionsFromBE();
    }
  }, [visible, fetchSessionsFromBE]);

  const filteredSessions = useMemo(() => {
    return (sessions || []).filter(session => {
      const isAllMode = session.scanMode === 'all' || session.roomId === 'all';
      const isZoneMode = session.scanMode === 'zone';
      const isRoomMode = !isAllMode && !isZoneMode;

      // Mode filter
      if (modeFilter === 'all_mode' && !isAllMode) return false;
      if (modeFilter === 'zone_mode' && !isZoneMode) return false;
      if (modeFilter === 'room_mode' && !isRoomMode) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        session.name.toLowerCase().includes(q) ||
        (session.roomName || '').toLowerCase().includes(q) ||
        (session.zoneName || '').toLowerCase().includes(q) ||
        session.startTime.includes(q)
      );
    });
  }, [sessions, modeFilter, searchQuery]);

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
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIcon}>
                <History size={20} color={appColors.white} />
              </View>
              <View>
                <AppText style={styles.title}>Lịch sử các phiên quét</AppText>
                <AppText style={styles.subtitle}>
                  Xem lại kết quả điểm danh, thời gian vào/ra và thống kê từng
                  phiên
                </AppText>
              </View>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <TouchableOpacity
                onPress={fetchSessionsFromBE}
                style={[styles.closeBtn, isRefreshing && { opacity: 0.6 }]}
                disabled={isRefreshing}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={appColors.blue600} />
                ) : (
                  <RotateCw size={18} color={appColors.slate600} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={appColors.slate400} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Tabs & Search */}
          <View style={styles.controlsRow}>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  modeFilter === 'all' && styles.tabBtnActive,
                ]}
                onPress={() => setModeFilter('all')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    modeFilter === 'all' && styles.tabBtnTextActive,
                  ]}
                >
                  Tất cả ({sessions.length})
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  modeFilter === 'all_mode' && styles.tabBtnActive,
                ]}
                onPress={() => setModeFilter('all_mode')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    modeFilter === 'all_mode' && styles.tabBtnTextActive,
                  ]}
                >
                  Quét All (
                  {
                    sessions.filter(
                      s => s.scanMode === 'all' || s.roomId === 'all',
                    ).length
                  }
                  )
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  modeFilter === 'zone_mode' && styles.tabBtnActive,
                ]}
                onPress={() => setModeFilter('zone_mode')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    modeFilter === 'zone_mode' && styles.tabBtnTextActive,
                  ]}
                >
                  Theo khu (
                  {
                    sessions.filter(
                      s => s.scanMode === 'zone',
                    ).length
                  }
                  )
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  modeFilter === 'room_mode' && styles.tabBtnActive,
                ]}
                onPress={() => setModeFilter('room_mode')}
              >
                <AppText
                  style={[
                    styles.tabBtnText,
                    modeFilter === 'room_mode' && styles.tabBtnTextActive,
                  ]}
                >
                  Theo phòng (
                  {
                    sessions.filter(
                      s =>
                        s.scanMode === 'room' ||
                        (!s.scanMode && s.roomId && s.roomId !== 'all'),
                    ).length
                  }
                  )
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <Search size={16} color={appColors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm phiên theo tên, phòng, thời gian..."
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

          {/* Sessions List */}
          <FlatList
            data={filteredSessions}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={fetchSessionsFromBE}
                colors={[appColors.blue600]}
                tintColor={appColors.blue600}
              />
            }
            renderItem={({ item }) => {
              const isAllMode =
                item.scanMode === 'all' || item.roomId === 'all';
              const isZoneMode = item.scanMode === 'zone';
              const total = item.totalCount || 0;
              const present = item.presentCount || 0;
              const missing = item.missingCount || 0;
              const verify = item.verifyCount || 0;
              const rate = total > 0 ? Math.round((present / total) * 100) : 0;
              const totalScans = item.totalScansCount || 0;

              let durStr = '';
              if (item.durationSeconds) {
                const h = Math.floor(item.durationSeconds / 3600);
                const m = Math.floor((item.durationSeconds % 3600) / 60);
                const s = item.durationSeconds % 60;
                durStr = h > 0 ? `${h}h ${m}p ${s}s` : `${m}p ${s}s`;
              }

              return (
                <View style={styles.sessionCard}>
                  {/* Card Header: Name, Mode, Status */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <View style={styles.cardTitleRow}>
                        <AppText
                          style={styles.cardTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.name}
                        </AppText>
                        <View
                          style={[
                            styles.modeTag,
                            isAllMode
                              ? styles.modeTagAll
                              : isZoneMode
                              ? styles.modeTagZone
                              : styles.modeTagRoom,
                          ]}
                        >
                          <AppText
                            style={[
                              styles.modeTagText,
                              isAllMode
                                ? styles.modeTagTextAll
                                : isZoneMode
                                ? styles.modeTagTextZone
                                : styles.modeTagTextRoom,
                            ]}
                          >
                            {isAllMode
                              ? 'QUÉT ALL'
                              : isZoneMode
                              ? 'THEO KHU'
                              : 'THEO PHÒNG'}
                          </AppText>
                        </View>
                        {item.isActive ? (
                          <View style={styles.activeTag}>
                            <View style={styles.pulseDot} />
                            <AppText style={styles.activeTagText}>
                              Đang quét
                            </AppText>
                          </View>
                        ) : (
                          <View style={styles.finishedTag}>
                            <CheckCircle2
                              size={11}
                              color={appColors.slate500}
                            />
                            <AppText style={styles.finishedTagText}>
                              Đã kết thúc
                            </AppText>
                          </View>
                        )}
                      </View>

                      {/* Card Meta Row */}
                      <View style={styles.cardMetaRow}>
                        <View style={styles.cardMetaItem}>
                          <Clock size={12} color={appColors.slate400} />
                          <AppText style={styles.cardMetaText}>
                            Bắt đầu: {item.startTime}
                            {item.endTime ? ` • Kết thúc: ${item.endTime}` : ''}
                          </AppText>
                        </View>
                        {Boolean(durStr) && (
                          <View style={styles.cardMetaItem}>
                            <Timer size={12} color={appColors.blue600} />
                            <AppText
                              style={[
                                styles.cardMetaText,
                                { color: appColors.blue700, fontWeight: '700' },
                              ]}
                            >
                              Thời gian: {durStr}
                            </AppText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Metric Pills */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricPill}>
                      <Users size={12} color={appColors.slate600} />
                      <AppText style={styles.metricPillLabel}>
                        {isAllMode ? 'Toàn cơ sở:' : 'Sĩ số:'}
                      </AppText>
                      <AppText style={styles.metricPillVal}>{total}</AppText>
                    </View>

                    <View
                      style={[
                        styles.metricPill,
                        { backgroundColor: appColors.emerald50 },
                      ]}
                    >
                      <CheckCircle2 size={12} color={appColors.emerald700} />
                      <AppText
                        style={[
                          styles.metricPillLabel,
                          { color: appColors.emerald700 },
                        ]}
                      >
                        {isAllMode ? 'Đã vào:' : 'Có mặt:'}
                      </AppText>
                      <AppText
                        style={[
                          styles.metricPillVal,
                          { color: appColors.emerald700 },
                        ]}
                      >
                        {present} ({rate}%)
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.metricPill,
                        { backgroundColor: appColors.amber50 },
                      ]}
                    >
                      <AlertCircle size={12} color={appColors.amber700} />
                      <AppText
                        style={[
                          styles.metricPillLabel,
                          { color: appColors.amber700 },
                        ]}
                      >
                        Chưa xác minh:
                      </AppText>
                      <AppText
                        style={[
                          styles.metricPillVal,
                          { color: appColors.amber700 },
                        ]}
                      >
                        {verify}
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.metricPill,
                        { backgroundColor: appColors.slate100 },
                      ]}
                    >
                      <AlertTriangle size={12} color={appColors.slate500} />
                      <AppText style={styles.metricPillLabel}>Thiếu:</AppText>
                      <AppText style={styles.metricPillVal}>{missing}</AppText>
                    </View>

                    {totalScans > 0 && (
                      <View
                        style={[
                          styles.metricPill,
                          { backgroundColor: appColors.blue50 },
                        ]}
                      >
                        <History size={12} color={appColors.blue700} />
                        <AppText
                          style={[
                            styles.metricPillLabel,
                            { color: appColors.blue700 },
                          ]}
                        >
                          Lượt quét:
                        </AppText>
                        <AppText
                          style={[
                            styles.metricPillVal,
                            { color: appColors.blue700 },
                          ]}
                        >
                          {totalScans}
                        </AppText>
                      </View>
                    )}
                  </View>

                  {/* Card Bottom: Detail View Button */}
                  <View style={styles.cardBottom}>
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() => onSelectSession(item)}
                      activeOpacity={0.8}
                    >
                      <AppText style={styles.detailBtnText}>
                        Xem chi tiết danh sách vào/ra
                      </AppText>
                      <ChevronRight size={15} color={appColors.blue600} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <History size={44} color={appColors.slate300} />
                <AppText style={styles.emptyTitle}>
                  Chưa có phiên nào phù hợp
                </AppText>
                <AppText style={styles.emptySubtitle}>
                  Các phiên quét sau khi kết thúc sẽ được lưu trữ tự động tại
                  đây.
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
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: appColors.blue600,
    justifyContent: 'center',
    alignItems: 'center',
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  tabsRow: {
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
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: appColors.slate900,
    padding: 0,
  },
  listContent: {
    paddingBottom: 16,
    gap: 10,
  },
  sessionCard: {
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.slate200,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: appColors.slate900,
    flexShrink: 1,
  },
  modeTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeTagAll: {
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  modeTagZone: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  modeTagRoom: {
    backgroundColor: appColors.slate100,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  modeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modeTagTextAll: {
    color: appColors.blue700,
  },
  modeTagTextZone: {
    color: '#92400E',
  },
  modeTagTextRoom: {
    color: appColors.slate700,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.emerald50,
    borderWidth: 1,
    borderColor: appColors.emerald200,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: appColors.emerald500,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.emerald700,
  },
  finishedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate100,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  finishedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: appColors.slate600,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardMetaText: {
    fontSize: 11,
    color: appColors.slate500,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    gap: 5,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  metricPillLabel: {
    fontSize: 11,
    color: appColors.slate600,
    fontWeight: '600',
  },
  metricPillVal: {
    fontSize: 11,
    fontWeight: '800',
    color: appColors.slate900,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: appColors.slate200,
    paddingTop: 8,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue600,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate700,
  },
  emptySubtitle: {
    fontSize: 12,
    color: appColors.slate500,
    textAlign: 'center',
  },
});
