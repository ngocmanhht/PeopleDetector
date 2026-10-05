import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../../components/app-text';
import {
  Camera,
  Building2,
  DoorOpen,
  ChevronDown,
  Play,
  Sliders,
  Cpu,
  Tablet,
  Lock,
  Unlock,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { startSession, setScanMode } from '../../../store/slices/detectorSlice';
import { sessionService } from '../../../services/api';
import { appColors } from '../../../const/app-colors';
import { useAppToast } from '../../../hooks/use-app-toast';
import { useResponsive } from '../../../hooks/use-responsive';
import { StartSessionModal } from './StartSessionModal';
import { YoloDetectorService } from '../../../services/yolo-detector';
import { RefreshButton } from '../../../components/refresh-button';

interface HeaderBarProps {
  onOpenManageRooms: () => void;
  onToggleCamera: () => void;
  onSelectZone: () => void;
  onSelectRoom: () => void;
  onOpenDeviceInfo?: () => void;
  onOpenKiosk?: () => void;
  isKioskActive?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenManageRooms,
  onToggleCamera,
  onSelectZone,
  onSelectRoom,
  onOpenDeviceInfo,
  onOpenKiosk,
  isKioskActive = false,
}) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const {
    zones,
    rooms,
    userProfiles,
    selectedZoneId,
    selectedRoomId,
    isSessionActive,
    activeSessionName,
    scanMode,
  } = useAppSelector(state => state.detector);

  const { showWarnToast, showSuccessToast } = useAppToast();
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);

  const [activeModel, setActiveModel] = useState<
    'mobilefacenet' | 'ghostfacenet'
  >(() => YoloDetectorService.getBiometricModel());

  const handleToggleModel = async () => {
    const nextModel =
      activeModel === 'mobilefacenet' ? 'ghostfacenet' : 'mobilefacenet';
    await YoloDetectorService.setBiometricModel(nextModel);
    setActiveModel(nextModel);
    showSuccessToast(
      'Đã đổi mô hình sinh trắc',
      nextModel === 'ghostfacenet'
        ? 'Kích hoạt GhostFaceNetV1-512d (SOTA 2023)'
        : 'Kích hoạt MobileFaceNet (InsightFace 512d)',
    );
  };

  const [currentTime, setCurrentTime] = useState<string>(() =>
    dayjs().format('HH:mm:ss'),
  );
  const [currentDate, setCurrentDate] = useState<string>(() =>
    dayjs().format('DD/MM/YYYY'),
  );

  useEffect(() => {
    const updateTime = () => {
      const now = dayjs();
      setCurrentTime(now.format('HH:mm:ss'));
      setCurrentDate(now.format('DD/MM/YYYY'));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedZone = zones.find(z => z.id === selectedZoneId) || zones[0];
  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const effectiveZoneId = selectedZoneId || selectedZone?.id || zones[0]?.id || '';

  const zoneRoomIds = useMemo(
    () => new Set(rooms.filter(r => r.zoneId === effectiveZoneId).map(r => r.id)),
    [rooms, effectiveZoneId],
  );
  const zoneMembersCount = useMemo(
    () =>
      (userProfiles || []).filter(
        u =>
          !u.isVisitor &&
          (u.zoneId === effectiveZoneId || (u.roomId && zoneRoomIds.has(u.roomId))),
      ).length,
    [userProfiles, effectiveZoneId, zoneRoomIds],
  );
  const targetMemberCount = useMemo(() => {
    if (scanMode === 'all') return (userProfiles || []).length;
    if (scanMode === 'zone') return zoneMembersCount;
    return (userProfiles || []).filter(u => u.roomId === selectedRoom?.id).length;
  }, [scanMode, userProfiles, zoneMembersCount, selectedRoom]);

  const handleStartPress = () => {
    if (scanMode === 'zone' && (!selectedZone || !selectedZone.id)) {
      showWarnToast(
        'Chưa chọn khu vực',
        'Vui lòng chọn khu vực trước khi bắt đầu phiên theo khu!',
      );
      onSelectZone();
      return;
    }
    if (scanMode === 'room' && (!selectedRoom || !selectedRoom.id)) {
      showWarnToast(
        'Chưa chọn phòng',
        'Vui lòng tạo hoặc chọn phòng trước khi bắt đầu phiên theo phòng!',
      );
      onOpenManageRooms();
      return;
    }
    setShowStartSessionModal(true);
  };

  const handleStartSessionConfirm = async (sessionName: string) => {
    setShowStartSessionModal(false);
    try {
      const isZoneMode = scanMode === 'zone';
      const isRoomMode = scanMode === 'room';
      const actualRoomId = isRoomMode ? selectedRoom?.id : undefined;
      const actualZoneId = isRoomMode || isZoneMode ? selectedZone?.id || effectiveZoneId : undefined;
      const payload = {
        name: sessionName,
        scanMode,
        roomId: actualRoomId,
        roomName: isRoomMode ? selectedRoom?.name : isZoneMode ? 'Theo khu vực' : 'Toàn cơ sở',
        zoneId: actualZoneId,
        zoneName: actualZoneId ? selectedZone?.name : 'Toàn cơ sở',
        startTime: new Date().toISOString(),
      };
      const res = await sessionService.startSession(payload);
      const beId = res?.data?.id;
      dispatch(
        startSession({
          id: beId,
          name: sessionName,
          scanMode,
          roomId: actualRoomId,
        }),
      );
      showSuccessToast(
        'Bắt đầu phiên',
        `Đã khởi tạo phiên trên hệ thống: ${sessionName}`,
      );
    } catch (err: any) {
      console.log(
        '[HeaderBar] BE start session error, running offline session:',
        err?.message || err,
      );
      const isRoomMode = scanMode === 'room';
      const actualRoomId = isRoomMode ? selectedRoom?.id : undefined;
      dispatch(
        startSession({
          name: sessionName,
          scanMode,
          roomId: actualRoomId,
        }),
      );
      showSuccessToast(
        'Bắt đầu phiên (Offline)',
        `Đang chạy phiên cục bộ: ${sessionName}`,
      );
    }
  };

  if (isPhone) {
    return (
      <View style={styles.phoneHeader}>
        {/* Phone Row 1: Brand & Online dot & Session Button & Camera */}
        <View style={styles.phoneRow1}>
          <View style={styles.phoneRow1Actions}>
            <TouchableOpacity
              style={styles.modelToggleBtnPhone}
              onPress={handleToggleModel}
              activeOpacity={0.75}
            >
              <Cpu size={14} color={appColors.blue600} />
              <AppText style={styles.modelToggleTextPhone}>
                {activeModel === 'ghostfacenet' ? 'Ghost' : 'Mobile'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconAction}
              onPress={onToggleCamera}
              activeOpacity={0.7}
            >
              <Camera size={18} color={appColors.gray600} />
            </TouchableOpacity>

            {Boolean(onOpenDeviceInfo) && (
              <TouchableOpacity
                style={styles.iconAction}
                onPress={onOpenDeviceInfo}
                activeOpacity={0.7}
              >
                <Tablet size={18} color={appColors.blue600} />
              </TouchableOpacity>
            )}

            {Boolean(onOpenKiosk) && (
              <TouchableOpacity
                style={[
                  styles.iconAction,
                  isKioskActive && styles.iconActionKioskActive,
                ]}
                onPress={onOpenKiosk}
                activeOpacity={0.7}
              >
                {isKioskActive ? (
                  <Lock size={18} color={appColors.red600} />
                ) : (
                  <Unlock size={18} color={appColors.slate600} />
                )}
              </TouchableOpacity>
            )}

            <RefreshButton size={34} iconSize={16} />

            {!isSessionActive ? (
              <TouchableOpacity
                style={styles.startSessionBtnPhone}
                onPress={handleStartPress}
                activeOpacity={0.85}
              >
                <Play
                  size={13}
                  color={appColors.white}
                  fill={appColors.white}
                />
                <AppText style={styles.startSessionTextPhone}>
                  Bắt đầu phiên
                </AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.sessionActiveBadgePhone}>
                <View style={styles.pulsingSessionDot} />
                <AppText
                  style={styles.sessionActiveTextPhone}
                  numberOfLines={1}
                >
                  {activeSessionName || 'Đang chạy'}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Phone Mode Toggle Row: Quét All vs Theo khu vs Theo phòng */}
        <View style={styles.modeToggleWrapPhone}>
          <TouchableOpacity
            style={[
              styles.modeToggleTabPhone,
              scanMode === 'all' && styles.modeToggleTabActiveAll,
            ]}
            onPress={() => {
              dispatch(setScanMode('all'));
              showSuccessToast(
                'Chế độ Quét All',
                'Xác nhận vào cơ sở cho toàn bộ nhân sự!',
              );
            }}
            activeOpacity={0.8}
          >
            <Building2
              size={13}
              color={scanMode === 'all' ? appColors.white : appColors.slate600}
            />
            <AppText
              style={[
                styles.modeToggleTextPhone,
                scanMode === 'all' && styles.modeToggleTextActive,
              ]}
            >
              Quét All
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeToggleTabPhone,
              scanMode === 'zone' && styles.modeToggleTabActiveZone,
            ]}
            onPress={() => {
              dispatch(setScanMode('zone'));
              showSuccessToast(
                'Chế độ Theo khu',
                'Quét nhân sự các phòng thuộc khu đã chọn!',
              );
            }}
            activeOpacity={0.8}
          >
            <Building2
              size={13}
              color={scanMode === 'zone' ? appColors.white : appColors.slate600}
            />
            <AppText
              style={[
                styles.modeToggleTextPhone,
                scanMode === 'zone' && styles.modeToggleTextActive,
              ]}
            >
              Theo khu
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeToggleTabPhone,
              scanMode === 'room' && styles.modeToggleTabActiveRoom,
            ]}
            onPress={() => {
              dispatch(setScanMode('room'));
              showSuccessToast(
                'Chế độ Theo phòng',
                'Chỉ điểm danh nhân sự thuộc phòng đã chọn!',
              );
            }}
            activeOpacity={0.8}
          >
            <DoorOpen
              size={13}
              color={scanMode === 'room' ? appColors.white : appColors.slate600}
            />
            <AppText
              style={[
                styles.modeToggleTextPhone,
                scanMode === 'room' && styles.modeToggleTextActive,
              ]}
            >
              Theo phòng
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Phone Row 2: Selectors for Zone & Room & Manage */}
        {scanMode === 'room' ? (
          <View style={styles.phoneRow2}>
            <TouchableOpacity
              style={styles.dropdownBtnPhone}
              onPress={onSelectZone}
              activeOpacity={0.8}
            >
              <Building2
                size={15}
                color={appColors.blue600}
                style={{ flexShrink: 0 }}
              />
              <AppText
                style={styles.dropdownTextPhone}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedZone ? selectedZone.name : 'Chọn Khu'}
              </AppText>
              <ChevronDown
                size={14}
                color={appColors.gray500}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownBtnPhone}
              onPress={onSelectRoom}
              activeOpacity={0.8}
            >
              <DoorOpen
                size={15}
                color={appColors.blue600}
                style={{ flexShrink: 0 }}
              />
              <AppText
                style={styles.dropdownTextPhone}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedRoom ? selectedRoom.name : 'Chọn Phòng'}
              </AppText>
              <ChevronDown
                size={14}
                color={appColors.gray500}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manageBtnPhone}
              onPress={onOpenManageRooms}
              activeOpacity={0.8}
            >
              <Sliders
                size={16}
                color={appColors.gray600}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>
          </View>
        ) : scanMode === 'zone' ? (
          <View style={styles.phoneRow2}>
            <TouchableOpacity
              style={[styles.dropdownBtnPhone, { flex: 1 }]}
              onPress={onSelectZone}
              activeOpacity={0.8}
            >
              <Building2
                size={15}
                color={appColors.amber600}
                style={{ flexShrink: 0 }}
              />
              <AppText
                style={styles.dropdownTextPhone}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedZone ? `Khu: ${selectedZone.name}` : 'Chọn Khu vực'}
              </AppText>
              <ChevronDown
                size={14}
                color={appColors.gray500}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>
            <View style={[styles.phoneFacilityBanner, { flex: 1.2, backgroundColor: appColors.warningBg, borderColor: appColors.warning }]}>
              <AppText style={[styles.phoneFacilityBannerText, { color: appColors.warningText, fontSize: 11 }]}>
                {rooms.filter(r => r.zoneId === effectiveZoneId).length} phòng • {zoneMembersCount} người
              </AppText>
            </View>
          </View>
        ) : (
          <View style={styles.phoneFacilityBanner}>
            <Building2 size={13} color={appColors.blue600} />
            <AppText style={styles.phoneFacilityBannerText}>
              Toàn bộ cơ sở • {userProfiles?.length || 0} nhân sự
            </AppText>
          </View>
        )}

        {/* Start Session Modal */}
        <StartSessionModal
          visible={showStartSessionModal}
          scanMode={scanMode}
          roomName={
            scanMode === 'all'
              ? 'Tất cả phòng ban'
              : scanMode === 'zone'
              ? 'Tất cả các phòng trong khu'
              : selectedRoom
              ? selectedRoom.name
              : ''
          }
          zoneName={
            scanMode === 'all'
              ? 'Toàn cơ sở'
              : selectedZone
              ? selectedZone.name
              : ''
          }
          memberCount={targetMemberCount}
          onClose={() => setShowStartSessionModal(false)}
          onStart={handleStartSessionConfirm}
        />
      </View>
    );
  }

  return (
    <View style={styles.header}>
      {/* Brand logo & status */}

      {/* Selectors for Zone & Room & Mode */}
      <View style={styles.selectorsRow}>
        {/* Mode Toggle: Quét All (Cơ sở) vs Theo khu vs Theo phòng */}
        <View style={styles.modeToggleWrapTablet}>
          <TouchableOpacity
            style={[
              styles.modeToggleTabTablet,
              scanMode === 'all' && styles.modeToggleTabActiveAll,
            ]}
            onPress={() => {
              dispatch(setScanMode('all'));
              showSuccessToast(
                'Chế độ Quét All',
                'Xác nhận vào cơ sở cho toàn bộ nhân sự!',
              );
            }}
            activeOpacity={0.8}
          >
            <Building2
              size={14}
              color={scanMode === 'all' ? appColors.white : appColors.slate600}
            />
            <AppText
              style={[
                styles.modeToggleTextTablet,
                scanMode === 'all' && styles.modeToggleTextActive,
              ]}
            >
              Quét All (Cơ sở)
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeToggleTabTablet,
              scanMode === 'zone' && styles.modeToggleTabActiveZone,
            ]}
            onPress={() => {
              dispatch(setScanMode('zone'));
              showSuccessToast(
                'Chế độ Theo khu vực',
                'Quét nhân sự các phòng thuộc khu đã chọn!',
              );
            }}
            activeOpacity={0.8}
          >
            <Building2
              size={14}
              color={scanMode === 'zone' ? appColors.white : appColors.slate600}
            />
            <AppText
              style={[
                styles.modeToggleTextTablet,
                scanMode === 'zone' && styles.modeToggleTextActive,
              ]}
            >
              Theo khu
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeToggleTabTablet,
              scanMode === 'room' && styles.modeToggleTabActiveRoom,
            ]}
            onPress={() => {
              dispatch(setScanMode('room'));
              showSuccessToast(
                'Chế độ Theo phòng',
                'Chỉ điểm danh nhân sự thuộc phòng đã chọn!',
              );
            }}
            activeOpacity={0.8}
          >
            <DoorOpen
              size={14}
              color={scanMode === 'room' ? appColors.white : appColors.slate600}
            />
            <AppText
              style={[
                styles.modeToggleTextTablet,
                scanMode === 'room' && styles.modeToggleTextActive,
              ]}
            >
              Theo phòng
            </AppText>
          </TouchableOpacity>
        </View>

        {scanMode === 'room' ? (
          <>
            {/* Zone Selector */}
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={onSelectZone}
              activeOpacity={0.8}
            >
              <Building2
                size={16}
                color={appColors.blue600}
                style={{ flexShrink: 0 }}
              />
              <AppText
                style={styles.dropdownText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedZone ? selectedZone.name : 'Chọn Khu'}
              </AppText>
              <ChevronDown
                size={16}
                color={appColors.gray500}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>

            {/* Room Selector */}
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={onSelectRoom}
              activeOpacity={0.8}
            >
              <DoorOpen
                size={16}
                color={appColors.blue600}
                style={{ flexShrink: 0 }}
              />
              <AppText
                style={styles.dropdownText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedRoom ? selectedRoom.name : 'Chọn Phòng'}
              </AppText>
              <ChevronDown
                size={16}
                color={appColors.gray500}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>

            {/* Manage Zones & Rooms */}
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={onOpenManageRooms}
              activeOpacity={0.8}
            >
              <Sliders
                size={16}
                color={appColors.gray600}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>
          </>
        ) : scanMode === 'zone' ? (
          <>
            {/* Zone Selector */}
            <TouchableOpacity
              style={[styles.dropdownBtn, { minWidth: 150 }]}
              onPress={onSelectZone}
              activeOpacity={0.8}
            >
              <Building2
                size={16}
                color={appColors.amber600}
                style={{ flexShrink: 0 }}
              />
              <AppText
                style={styles.dropdownText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedZone ? `Khu: ${selectedZone.name}` : 'Chọn Khu'}
              </AppText>
              <ChevronDown
                size={16}
                color={appColors.gray500}
                style={{ flexShrink: 0 }}
              />
            </TouchableOpacity>

            <View style={[styles.tabletFacilityBanner, { backgroundColor: appColors.warningBg, borderColor: appColors.warning }]}>
              <AppText style={[styles.tabletFacilityBannerText, { color: appColors.warningText }]}>
                Toàn bộ {rooms.filter(r => r.zoneId === effectiveZoneId).length} phòng trong khu • {zoneMembersCount} nhân sự
              </AppText>
            </View>
          </>
        ) : (
          <View style={styles.tabletFacilityBanner}>
            <Building2 size={16} color={appColors.blue600} />
            <AppText style={styles.tabletFacilityBannerText}>
              Toàn bộ cơ sở • {userProfiles?.length || 0} nhân sự
            </AppText>
          </View>
        )}

        {/* Session Action Button */}
        {!isSessionActive ? (
          <TouchableOpacity
            style={styles.startSessionBtn}
            onPress={handleStartPress}
            activeOpacity={0.85}
          >
            <Play
              size={15}
              color={appColors.white}
              fill={appColors.white}
              style={{ flexShrink: 0 }}
            />
            <AppText style={styles.startSessionText}>Bắt đầu phiên</AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.sessionActiveBadge}>
            <View style={styles.pulsingSessionDot} />
            <AppText style={styles.sessionActiveText} numberOfLines={1}>
              {activeSessionName || 'Phiên đang chạy'}
            </AppText>
          </View>
        )}
      </View>

      {/* System utilities & Live Clock */}
      <View style={styles.systemInfoRow}>
        <TouchableOpacity
          style={styles.modelToggleBtn}
          onPress={handleToggleModel}
          activeOpacity={0.75}
        >
          <Cpu size={15} color={appColors.blue600} />
          <AppText style={styles.modelToggleText}>
            {activeModel === 'ghostfacenet' ? 'GhostFaceNet' : 'MobileFaceNet'}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconAction}
          onPress={onToggleCamera}
          activeOpacity={0.7}
        >
          <Camera size={20} color={appColors.gray600} />
        </TouchableOpacity>

        {Boolean(onOpenDeviceInfo) && (
          <TouchableOpacity
            style={styles.iconAction}
            onPress={onOpenDeviceInfo}
            activeOpacity={0.7}
          >
            <Tablet size={20} color={appColors.blue600} />
          </TouchableOpacity>
        )}

        {Boolean(onOpenKiosk) && (
          <TouchableOpacity
            style={[
              styles.iconAction,
              isKioskActive && styles.iconActionKioskActive,
            ]}
            onPress={onOpenKiosk}
            activeOpacity={0.7}
          >
            {isKioskActive ? (
              <Lock size={20} color={appColors.red600} />
            ) : (
              <Unlock size={20} color={appColors.slate600} />
            )}
          </TouchableOpacity>
        )}

        <RefreshButton size={38} iconSize={18} />

        {/* Real-time Clock */}
        <View style={styles.clockContainer}>
          <AppText style={styles.clockTime}>{currentTime}</AppText>
          <AppText style={styles.clockDate}>{currentDate}</AppText>
        </View>
      </View>

      {/* Start Session Modal */}
      <StartSessionModal
        visible={showStartSessionModal}
        scanMode={scanMode}
        roomName={
          scanMode === 'all'
            ? 'Tất cả phòng ban'
            : scanMode === 'zone'
            ? 'Tất cả các phòng trong khu'
            : selectedRoom
            ? selectedRoom.name
            : ''
        }
        zoneName={
          scanMode === 'all'
            ? 'Toàn cơ sở'
            : selectedZone
            ? selectedZone.name
            : ''
        }
        memberCount={targetMemberCount}
        onClose={() => setShowStartSessionModal(false)}
        onStart={handleStartSessionConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 72,
    backgroundColor: appColors.white,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  brandContainer: {
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitlePrimary: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.slate900,
    letterSpacing: -0.5,
  },
  brandTitleSecondary: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.sky600,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.slate500,
    letterSpacing: 1.5,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.emerald50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 18,
    borderWidth: 1,
    borderColor: appColors.emerald200,
    flexShrink: 0,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.emerald500,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.emerald600,
    letterSpacing: 0.5,
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    maxWidth: 200,
    flexShrink: 1,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate800,
    flexShrink: 1,
  },
  manageBtn: {
    backgroundColor: appColors.slate100,
    padding: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.slate200,
    flexShrink: 0,
  },
  startSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue600,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 8,
    shadowColor: appColors.blue600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  startSessionText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.white,
  },
  sessionActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue300,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    maxWidth: 220,
    flexShrink: 1,
  },
  pulsingSessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.blue600,
    flexShrink: 0,
  },
  sessionActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.blue700,
    flexShrink: 1,
  },
  systemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  iconAction: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: appColors.slate50,
  },
  iconActionKioskActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  clockContainer: {
    alignItems: 'flex-end',
    marginLeft: 6,
  },
  clockTime: {
    fontSize: 17,
    fontWeight: '800',
    color: appColors.slate900,
  },
  clockDate: {
    fontSize: 11,
    fontWeight: '500',
    color: appColors.slate500,
  },
  phoneHeader: {
    backgroundColor: appColors.white,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  phoneRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneRow1Actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  startSessionBtnPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue600,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    gap: 5,
    flexShrink: 0,
  },
  startSessionTextPhone: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.white,
  },
  sessionActiveBadgePhone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue300,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    gap: 6,
    maxWidth: 140,
    flexShrink: 1,
  },
  sessionActiveTextPhone: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.blue700,
    flexShrink: 1,
  },
  phoneRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownBtnPhone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dropdownTextPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate800,
    flex: 1,
    marginHorizontal: 4,
  },
  manageBtnPhone: {
    backgroundColor: appColors.slate100,
    padding: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  modelToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    gap: 6,
  },
  modelToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue700,
  },
  modelToggleBtnPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  modelToggleTextPhone: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.blue700,
  },
  modeToggleWrapPhone: {
    flexDirection: 'row',
    backgroundColor: appColors.slate100,
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  modeToggleTabPhone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 5,
  },
  modeToggleTabActiveAll: {
    backgroundColor: appColors.blue600,
  },
  modeToggleTabActiveZone: {
    backgroundColor: appColors.amber600,
  },
  modeToggleTabActiveRoom: {
    backgroundColor: appColors.emerald600,
  },
  modeToggleTextPhone: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.slate600,
  },
  modeToggleTextActive: {
    color: appColors.white,
  },
  phoneFacilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  phoneFacilityBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.blue700,
  },
  modeToggleWrapTablet: {
    flexDirection: 'row',
    backgroundColor: appColors.slate100,
    borderRadius: 12,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  modeToggleTabTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    gap: 6,
  },
  modeToggleTextTablet: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate600,
  },
  tabletFacilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  tabletFacilityBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.blue700,
  },
});
