import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import {
  DetectionResult,
  ScanHistoryItem,
  ScanMode,
  ScanDirection,
} from '../../../model/detector';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  LogIn,
  LogOut,
  Building2,
  X,
  History,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Search,
  UserPlus,
} from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { appUtils } from '../../../utils';

interface ScannedResultsListProps {
  scanHistory: ScanHistoryItem[];
  activeDetection: DetectionResult | null;
  isSessionActive: boolean;
  scanMode: ScanMode;
  scanDirection?: ScanDirection;
  onEnrollStranger?: (
    photoUri?: string,
    defaultName?: string,
    strangerId?: string,
  ) => void;
}

type FilterType = 'all' | 'verified' | 'unverified';

export const ScannedResultsList: React.FC<ScannedResultsListProps> = ({
  scanHistory,
  activeDetection,
  isSessionActive,
  scanMode,
  scanDirection = 'in',
  onEnrollStranger,
}) => {
  const { isPhone } = useResponsive();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDetailItem, setSelectedDetailItem] =
    useState<ScanHistoryItem | null>(null);

  const isAllMode = scanMode === 'all';

  // Counts
  const verifiedCount = useMemo(
    () => scanHistory.filter(i => i.status === 'present').length,
    [scanHistory],
  );
  const unverifiedCount = useMemo(
    () => scanHistory.filter(i => i.status === 'verify').length,
    [scanHistory],
  );

  // Filtered List
  const filteredList = useMemo(() => {
    if (filter === 'verified') {
      return scanHistory.filter(i => i.status === 'present');
    }
    if (filter === 'unverified') {
      return scanHistory.filter(i => i.status === 'verify');
    }
    return scanHistory;
  }, [scanHistory, filter]);

  if (!isSessionActive) {
    return (
      <View style={[styles.container, isPhone && styles.containerPhone]}>
        <View style={styles.emptyCard}>
          <Clock size={40} color={appColors.slate400} />
          <AppText style={styles.emptyTitle}>Phiên chưa bắt đầu</AppText>
          <AppText style={styles.emptySubtitle}>
            Nhấn "Bắt đầu" để camera kích hoạt quét và ghi nhận thời gian vào/ra
            của từng nhân sự.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      {/* 1. Header with title & Mode badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            {isAllMode ? (
              <Building2 size={18} color={appColors.blue600} />
            ) : (
              <UserCheck size={18} color={appColors.emerald600} />
            )}
          </View>
          <View>
            <AppText style={styles.headerTitle}>
              {isAllMode ? 'Xác nhận vào cơ sở' : 'Kết quả điểm danh phòng'}
            </AppText>
            <AppText style={styles.headerSubtitle}>
              {isAllMode
                ? 'Quét All • Đối chiếu toàn bộ nhân sự'
                : 'Theo phòng • Chỉ người trong phòng'}
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.modeBadge,
            isAllMode ? styles.modeBadgeAll : styles.modeBadgeRoom,
          ]}
        >
          <AppText
            style={[
              styles.modeBadgeText,
              isAllMode ? styles.modeBadgeTextAll : styles.modeBadgeTextRoom,
            ]}
          >
            {isAllMode ? 'QUÉT ALL' : 'THEO PHÒNG'}
          </AppText>
        </View>
      </View>

      {/* 2. Live Detection Flash Hero (Latest Scanned Face) */}
      {activeDetection && (
        <View
          style={[
            styles.heroCard,
            activeDetection.status === 'present'
              ? styles.heroCardVerified
              : styles.heroCardWarning,
          ]}
        >
          <View style={styles.heroAvatarWrap}>
            {activeDetection.avatarUri ? (
              <Image
                source={{
                  uri: appUtils.getUrlImage(activeDetection.avatarUri),
                }}
                style={styles.heroAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroAvatarPlaceholder}>
                <AppText style={styles.heroAvatarPlaceholderText}>
                  {(activeDetection.fullName || 'N')[0]}
                </AppText>
              </View>
            )}
            <View
              style={[
                styles.heroDot,
                activeDetection.status === 'present'
                  ? styles.heroDotGreen
                  : styles.heroDotAmber,
              ]}
            />
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <AppText style={styles.heroName} numberOfLines={1}>
                {activeDetection.fullName}
              </AppText>
              <AppText style={styles.heroConfidence}>
                {activeDetection.confidence}%
              </AppText>
            </View>

            <View style={styles.heroMetaRow}>
              {Boolean(
                activeDetection.code && activeDetection.code !== 'UNKNOWN',
              ) && (
                <View style={styles.heroCodeBadge}>
                  <AppText style={styles.heroCodeText}>
                    {activeDetection.code}
                  </AppText>
                </View>
              )}

              {/* Department & Room Tag */}
              {Boolean(
                activeDetection.roomName || activeDetection.zoneName,
              ) && (
                <View style={styles.heroDeptBadge}>
                  <Building2 size={11} color={appColors.slate600} />
                  <AppText style={styles.heroDeptText} numberOfLines={1}>
                    {activeDetection.roomName
                      ? `P.${activeDetection.roomName}`
                      : ''}
                    {activeDetection.zoneName
                      ? ` • K.${activeDetection.zoneName}`
                      : ''}
                  </AppText>
                </View>
              )}

              <View
                style={[
                  styles.heroStatusBadge,
                  activeDetection.status === 'present'
                    ? scanDirection === 'out'
                      ? styles.heroStatusBadgeRed
                      : styles.heroStatusBadgeGreen
                    : styles.heroStatusBadgeAmber,
                ]}
              >
                {activeDetection.status === 'present' ? (
                  scanDirection === 'out' ? (
                    <LogOut size={12} color={appColors.rose700} />
                  ) : (
                    <CheckCircle2 size={12} color={appColors.emerald700} />
                  )
                ) : (
                  <AlertCircle size={12} color={appColors.amber700} />
                )}
                <AppText
                  style={[
                    styles.heroStatusText,
                    activeDetection.status === 'present'
                      ? scanDirection === 'out'
                        ? styles.heroStatusTextRed
                        : styles.heroStatusTextGreen
                      : styles.heroStatusTextAmber,
                  ]}
                >
                  {activeDetection.status === 'present'
                    ? isAllMode
                      ? scanDirection === 'out'
                        ? 'Đã ra cơ sở'
                        : 'Đã vào cơ sở'
                      : scanDirection === 'out'
                      ? 'Điểm danh RA (OUT)'
                      : 'Đã điểm danh'
                    : 'Chưa xác minh'}
                </AppText>
              </View>

              {activeDetection.status !== 'present' && onEnrollStranger && (
                <TouchableOpacity
                  style={styles.heroEnrollBtn}
                  onPress={() =>
                    onEnrollStranger(
                      activeDetection.avatarUri,
                      activeDetection.fullName !== 'Người chưa xác minh'
                        ? activeDetection.fullName
                        : '',
                      activeDetection.userId,
                    )
                  }
                  activeOpacity={0.8}
                >
                  <UserPlus size={12} color={appColors.white} />
                  <AppText style={styles.heroEnrollBtnText}>
                    + Thêm User
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* 3. Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.8}
        >
          <AppText
            style={[
              styles.filterTabText,
              filter === 'all' && styles.filterTabTextActive,
            ]}
          >
            Tất cả ({scanHistory.length})
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'verified' && styles.filterTabActiveGreen,
          ]}
          onPress={() => setFilter('verified')}
          activeOpacity={0.8}
        >
          <ShieldCheck
            size={13}
            color={
              filter === 'verified' ? appColors.emerald700 : appColors.slate500
            }
          />
          <AppText
            style={[
              styles.filterTabText,
              filter === 'verified' && styles.filterTabTextActiveGreen,
            ]}
          >
            {isAllMode ? 'Đã vào cơ sở' : 'Đã xác minh'} ({verifiedCount})
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'unverified' && styles.filterTabActiveAmber,
          ]}
          onPress={() => setFilter('unverified')}
          activeOpacity={0.8}
        >
          <ShieldAlert
            size={13}
            color={
              filter === 'unverified' ? appColors.amber700 : appColors.slate500
            }
          />
          <AppText
            style={[
              styles.filterTabText,
              filter === 'unverified' && styles.filterTabTextActiveAmber,
            ]}
          >
            Chưa xác minh ({unverifiedCount})
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 4. Scanned List Feed */}
      {filteredList.length === 0 ? (
        <View style={styles.emptyList}>
          <Search size={32} color={appColors.slate300} />
          <AppText style={styles.emptyListText}>
            {filter === 'all'
              ? 'Chưa ghi nhận ai trong phiên này.'
              : filter === 'verified'
              ? 'Chưa có người được xác minh.'
              : 'Chưa phát hiện người lạ/chưa xác minh.'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isVerified = item.status === 'present';
            return (
              <TouchableOpacity
                style={[
                  styles.historyItemCard,
                  !isVerified && styles.historyItemCardUnverified,
                ]}
                onPress={() => setSelectedDetailItem(item)}
                activeOpacity={0.85}
              >
                {/* Avatar */}
                <View style={styles.itemAvatarWrap}>
                  {item.avatarUri ? (
                    <Image
                      source={{ uri: appUtils.getUrlImage(item.avatarUri) }}
                      style={styles.itemAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.itemAvatarPlaceholder}>
                      <AppText style={styles.itemAvatarPlaceholderText}>
                        {(item.fullName || 'N')[0]}
                      </AppText>
                    </View>
                  )}
                  <View
                    style={[
                      styles.itemStatusDot,
                      isVerified
                        ? styles.itemStatusDotGreen
                        : styles.itemStatusDotAmber,
                    ]}
                  />
                </View>

                {/* Main Info */}
                <View style={styles.itemMainInfo}>
                  <View style={styles.itemNameRow}>
                    <AppText style={styles.itemName} numberOfLines={1}>
                      {item.fullName}
                    </AppText>
                    {Boolean(item.code && item.code !== 'STRANGER') && (
                      <AppText style={styles.itemCode}>{item.code}</AppText>
                    )}
                  </View>

                  {/* Room / Ban / Zone Tag */}
                  <View style={styles.itemDeptRow}>
                    <Building2 size={12} color={appColors.slate500} />
                    <AppText style={styles.itemDeptText} numberOfLines={1}>
                      {item.roomName
                        ? item.roomName
                        : isVerified
                        ? 'Chưa gán phòng'
                        : 'Không có dữ liệu'}
                      {Boolean(item.zoneName) && ` • ${item.zoneName}`}
                    </AppText>
                  </View>

                  {Boolean(item.isVisitor) && (
                    <View style={styles.visitorTagRow}>
                      <UserCheck size={11} color={appColors.purple700} />
                      <AppText style={styles.visitorTagText} numberOfLines={1}>
                        Khách thăm: {item.visitedProfileName || 'Người thân'}
                      </AppText>
                    </View>
                  )}

                  {/* Timestamps IN / OUT Badge Row */}
                  <View style={styles.itemTimestampsRow}>
                    {/* IN (Earliest) */}
                    {Boolean(item.firstInTime) && (
                      <View style={styles.timeTagIn}>
                        <LogIn size={11} color={appColors.emerald700} />
                        <AppText style={styles.timeTagInText}>
                          IN: {item.firstInTime}
                        </AppText>
                      </View>
                    )}

                    {/* OUT (Latest) */}
                    {Boolean(item.lastOutTime) && (
                      <View style={styles.timeTagOut}>
                        <LogOut size={11} color={appColors.rose700} />
                        <AppText style={styles.timeTagOutText}>
                          OUT: {item.lastOutTime}
                        </AppText>
                      </View>
                    )}

                    {/* Scan Count */}
                    <View style={styles.scanCountTag}>
                      <History size={11} color={appColors.slate600} />
                      <AppText style={styles.scanCountText}>
                        {item.scanCount} lượt
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Status Badge */}
                <View style={styles.itemRightStatus}>
                  <View
                    style={[
                      styles.statusPill,
                      isVerified
                        ? item.lastDirection === 'out'
                          ? styles.statusPillRed
                          : styles.statusPillGreen
                        : styles.statusPillAmber,
                    ]}
                  >
                    {isVerified ? (
                      item.lastDirection === 'out' ? (
                        <LogOut size={11} color={appColors.rose700} />
                      ) : (
                        <CheckCircle2 size={11} color={appColors.emerald700} />
                      )
                    ) : (
                      <AlertCircle size={11} color={appColors.amber700} />
                    )}
                    <AppText
                      style={[
                        styles.statusPillText,
                        isVerified
                          ? item.lastDirection === 'out'
                            ? styles.statusPillTextRed
                            : styles.statusPillTextGreen
                          : styles.statusPillTextAmber,
                      ]}
                    >
                      {isVerified
                        ? isAllMode
                          ? item.lastDirection === 'out'
                            ? 'Đã ra cơ sở'
                            : 'Đã vào cơ sở'
                          : item.lastDirection === 'out'
                          ? 'Đã ra (OUT)'
                          : 'Đã vào (IN)'
                        : 'Chưa xác minh'}
                    </AppText>
                  </View>
                  <AppText style={styles.itemConfidenceText}>
                    Độ tin cậy: {item.confidence}%
                  </AppText>
                  {!isVerified && onEnrollStranger && (
                    <TouchableOpacity
                      style={styles.itemEnrollBtn}
                      onPress={e => {
                        e.stopPropagation?.();
                        onEnrollStranger(
                          item.avatarUri,
                          item.fullName !== 'Người chưa xác minh'
                            ? item.fullName
                            : '',
                          item.id || item.userId,
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <UserPlus size={10} color={appColors.blue700} />
                      <AppText style={styles.itemEnrollBtnText}>
                        + Thêm User
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* 5. Detail History Modal for Selected Person */}
      <Modal
        visible={Boolean(selectedDetailItem)}
        transparent
        animationType="fade"
        supportedOrientations={[
          'portrait',
          'landscape',
          'landscape-left',
          'landscape-right',
        ]}
        statusBarTranslucent
        onRequestClose={() => setSelectedDetailItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <History size={20} color={appColors.blue600} />
                <AppText style={styles.modalTitle}>
                  Lịch sử quét chi tiết
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedDetailItem(null)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={appColors.slate500} />
              </TouchableOpacity>
            </View>

            {selectedDetailItem && (
              <>
                {/* Person Profile Overview */}
                <View style={styles.modalProfileCard}>
                  {selectedDetailItem.avatarUri ? (
                    <Image
                      source={{
                        uri: appUtils.getUrlImage(selectedDetailItem.avatarUri),
                      }}
                      style={styles.modalAvatar}
                    />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <AppText style={styles.modalAvatarPlaceholderText}>
                        {(selectedDetailItem.fullName || 'N')[0]}
                      </AppText>
                    </View>
                  )}

                  <View style={styles.modalProfileInfo}>
                    <AppText style={styles.modalFullName}>
                      {selectedDetailItem.fullName}
                    </AppText>
                    {Boolean(selectedDetailItem.code) && (
                      <AppText style={styles.modalCode}>
                        Mã: {selectedDetailItem.code}
                      </AppText>
                    )}
                    <View style={styles.modalDeptRow}>
                      <Building2 size={13} color={appColors.slate600} />
                      <AppText style={styles.modalDeptText}>
                        {selectedDetailItem.roomName || 'Chưa gán phòng'}
                        {Boolean(selectedDetailItem.zoneName) &&
                          ` • ${selectedDetailItem.zoneName}`}
                      </AppText>
                    </View>
                    {Boolean(selectedDetailItem.isVisitor) && (
                      <View style={styles.modalVisitorTagRow}>
                        <UserCheck size={13} color={appColors.purple700} />
                        <AppText style={styles.modalVisitorTagText}>
                          Khách thăm:{' '}
                          {selectedDetailItem.visitedProfileName || 'Thân nhân'}
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>

                {/* In / Out Summary Cards */}
                <View style={styles.modalInOutSummaryRow}>
                  <View style={styles.modalSummaryBoxIn}>
                    <LogIn size={16} color={appColors.emerald600} />
                    <View>
                      <AppText style={styles.modalSummaryLabel}>
                        Giờ vào sớm nhất (IN)
                      </AppText>
                      <AppText style={styles.modalSummaryValueIn}>
                        {selectedDetailItem.firstInTime || 'Chưa ghi nhận'}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.modalSummaryBoxOut}>
                    <LogOut size={16} color={appColors.rose700} />
                    <View>
                      <AppText style={styles.modalSummaryLabel}>
                        Giờ ra muộn nhất (OUT)
                      </AppText>
                      <AppText style={styles.modalSummaryValueOut}>
                        {selectedDetailItem.lastOutTime || 'Chưa ghi nhận'}
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Timestamps Log List */}
                <AppText style={styles.modalLogSectionTitle}>
                  Tất cả lượt quét phát hiện ({selectedDetailItem.scanCount}{' '}
                  lần):
                </AppText>
                <FlatList
                  data={selectedDetailItem.history}
                  keyExtractor={ev => ev.id}
                  style={styles.modalLogList}
                  renderItem={({ item: ev, index }) => (
                    <View style={styles.logItemRow}>
                      <View style={styles.logIndexBadge}>
                        <AppText style={styles.logIndexText}>
                          #{selectedDetailItem.history.length - index}
                        </AppText>
                      </View>
                      <View style={styles.logTimeCol}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <AppText style={styles.logTimeText}>
                            {ev.timestamp}
                          </AppText>
                          {Boolean(ev.direction) && (
                            <View
                              style={[
                                styles.logDirectionBadge,
                                ev.direction === 'out'
                                  ? styles.logDirectionBadgeOut
                                  : styles.logDirectionBadgeIn,
                              ]}
                            >
                              <AppText
                                style={[
                                  styles.logDirectionBadgeText,
                                  ev.direction === 'out'
                                    ? styles.logDirectionBadgeTextOut
                                    : styles.logDirectionBadgeTextIn,
                                ]}
                              >
                                {ev.direction === 'out'
                                  ? 'RA (OUT)'
                                  : 'VÀO (IN)'}
                              </AppText>
                            </View>
                          )}
                        </View>
                        <AppText style={styles.logModeText}>
                          Chế độ:{' '}
                          {ev.scanMode === 'all'
                            ? 'Quét All (Cơ sở)'
                            : 'Theo phòng'}
                        </AppText>
                      </View>
                      <View style={styles.logConfidenceCol}>
                        <AppText style={styles.logConfidenceText}>
                          Độ tin cậy: {ev.confidence}%
                        </AppText>
                      </View>
                    </View>
                  )}
                />

                {selectedDetailItem.status !== 'present' &&
                  onEnrollStranger && (
                    <TouchableOpacity
                      style={styles.modalEnrollBtn}
                      onPress={() => {
                        const item = selectedDetailItem;
                        setSelectedDetailItem(null);
                        onEnrollStranger(
                          item.avatarUri,
                          item.fullName !== 'Người chưa xác minh'
                            ? item.fullName
                            : '',
                          item.id || item.userId,
                        );
                      }}
                      activeOpacity={0.85}
                    >
                      <UserPlus size={16} color={appColors.white} />
                      <AppText style={styles.modalEnrollBtnText}>
                        + Thêm người này vào danh sách nhân sự
                      </AppText>
                    </TouchableOpacity>
                  )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerPhone: {
    padding: 12,
    borderRadius: 14,
  },
  emptyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate800,
  },
  emptySubtitle: {
    fontSize: 13,
    color: appColors.slate500,
    textAlign: 'center',
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.slate900,
  },
  headerSubtitle: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 1,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeBadgeAll: {
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  modeBadgeRoom: {
    backgroundColor: appColors.emerald50,
    borderWidth: 1,
    borderColor: appColors.emerald200,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modeBadgeTextAll: {
    color: appColors.blue700,
  },
  modeBadgeTextRoom: {
    color: appColors.emerald700,
  },
  // Hero Card for instant live detection
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  heroCardVerified: {
    backgroundColor: appColors.emerald50,
    borderColor: appColors.emerald300,
  },
  heroCardWarning: {
    backgroundColor: appColors.amber50,
    borderColor: appColors.amber300,
  },
  heroAvatarWrap: {
    position: 'relative',
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.white,
  },
  heroAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: appColors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.slate700,
  },
  heroDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: appColors.white,
  },
  heroDotGreen: {
    backgroundColor: appColors.emerald500,
  },
  heroDotAmber: {
    backgroundColor: appColors.amber500,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroName: {
    fontSize: 15,
    fontWeight: '800',
    color: appColors.slate900,
    flexShrink: 1,
  },
  heroConfidence: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.slate600,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroCodeBadge: {
    backgroundColor: appColors.slate200,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate700,
  },
  heroDeptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: appColors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  heroDeptText: {
    fontSize: 11,
    color: appColors.slate700,
    fontWeight: '600',
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroStatusBadgeGreen: {
    backgroundColor: appColors.emerald100,
  },
  heroStatusBadgeAmber: {
    backgroundColor: appColors.amber100,
  },
  heroStatusBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  heroStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroStatusTextGreen: {
    color: appColors.emerald800,
  },
  heroStatusTextAmber: {
    color: appColors.amber800,
  },
  heroStatusTextRed: {
    color: '#B91C1C',
  },
  // Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: appColors.slate100,
  },
  filterTabActive: {
    backgroundColor: appColors.slate800,
  },
  filterTabActiveGreen: {
    backgroundColor: appColors.emerald100,
    borderWidth: 1,
    borderColor: appColors.emerald300,
  },
  filterTabActiveAmber: {
    backgroundColor: appColors.amber100,
    borderWidth: 1,
    borderColor: appColors.amber300,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  filterTabTextActive: {
    color: appColors.white,
  },
  filterTabTextActiveGreen: {
    color: appColors.emerald800,
    fontWeight: '700',
  },
  filterTabTextActiveAmber: {
    color: appColors.amber800,
    fontWeight: '700',
  },
  // Empty List
  emptyList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  emptyListText: {
    fontSize: 13,
    color: appColors.slate400,
    textAlign: 'center',
  },
  // List Content
  listContent: {
    paddingVertical: 4,
    gap: 8,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: appColors.slate150 || '#E2E8F0',
    gap: 10,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  historyItemCardUnverified: {
    backgroundColor: '#FFFBEB',
    borderColor: appColors.amber200,
  },
  itemAvatarWrap: {
    position: 'relative',
  },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
  },
  itemAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: appColors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAvatarPlaceholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate700,
  },
  itemStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: appColors.white,
  },
  itemStatusDotGreen: {
    backgroundColor: appColors.emerald500,
  },
  itemStatusDotAmber: {
    backgroundColor: appColors.amber500,
  },
  itemMainInfo: {
    flex: 1,
    gap: 3,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate900,
  },
  itemCode: {
    fontSize: 11,
    color: appColors.slate500,
    fontWeight: '600',
  },
  itemDeptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemDeptText: {
    fontSize: 11,
    color: appColors.slate600,
    fontWeight: '500',
  },
  itemTimestampsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  timeTagIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: appColors.emerald50,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeTagInText: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.emerald800,
  },
  timeTagOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeTagOutText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
  },
  scanCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: appColors.slate100,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scanCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: appColors.slate600,
  },
  itemRightStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillGreen: {
    backgroundColor: appColors.emerald100,
  },
  statusPillAmber: {
    backgroundColor: appColors.amber100,
  },
  statusPillRed: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextGreen: {
    color: appColors.emerald800,
  },
  statusPillTextAmber: {
    color: appColors.amber800,
  },
  statusPillTextRed: {
    color: '#B91C1C',
  },
  itemConfidenceText: {
    fontSize: 10,
    color: appColors.slate400,
  },
  // Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate900,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  modalProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  modalAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: appColors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: appColors.slate700,
  },
  modalProfileInfo: {
    flex: 1,
    gap: 3,
  },
  modalFullName: {
    fontSize: 16,
    fontWeight: '800',
    color: appColors.slate900,
  },
  modalCode: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  modalDeptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalDeptText: {
    fontSize: 12,
    color: appColors.slate600,
    fontWeight: '500',
  },
  modalInOutSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalSummaryBoxIn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: appColors.emerald50,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.emerald200,
  },
  modalSummaryBoxOut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalSummaryLabel: {
    fontSize: 10,
    color: appColors.slate600,
    fontWeight: '600',
  },
  modalSummaryValueIn: {
    fontSize: 13,
    fontWeight: '800',
    color: appColors.emerald800,
    marginTop: 1,
  },
  modalSummaryValueOut: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
    marginTop: 1,
  },
  logDirectionBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  logDirectionBadgeIn: {
    backgroundColor: appColors.emerald100,
  },
  logDirectionBadgeOut: {
    backgroundColor: '#FEE2E2',
  },
  logDirectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logDirectionBadgeTextIn: {
    color: appColors.emerald800,
  },
  logDirectionBadgeTextOut: {
    color: '#B91C1C',
  },
  modalLogSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate700,
    marginTop: 14,
    marginBottom: 8,
  },
  modalLogList: {
    maxHeight: 200,
  },
  logItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
    gap: 10,
  },
  logIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: appColors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logIndexText: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.slate600,
  },
  logTimeCol: {
    flex: 1,
  },
  logTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate900,
  },
  logModeText: {
    fontSize: 10,
    color: appColors.slate500,
  },
  logConfidenceCol: {
    alignItems: 'flex-end',
  },
  logConfidenceText: {
    fontSize: 11,
    color: appColors.slate600,
    fontWeight: '600',
  },
  visitorTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  visitorTagText: {
    fontSize: 11,
    color: '#7E22CE',
    fontWeight: '600',
  },
  modalVisitorTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  modalVisitorTagText: {
    fontSize: 12,
    color: '#7E22CE',
    fontWeight: '600',
  },
  heroEnrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: appColors.blue600,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroEnrollBtnText: {
    color: appColors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  itemEnrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  itemEnrollBtnText: {
    color: appColors.blue700,
    fontSize: 10,
    fontWeight: '700',
  },
  modalEnrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: appColors.blue600,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  modalEnrollBtnText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
