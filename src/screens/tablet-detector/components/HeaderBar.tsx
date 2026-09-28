import React, { useEffect, useState } from 'react';
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
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { startSession } from '../../../store/slices/detectorSlice';
import { sessionService } from '../../../services/api';
import { appColors } from '../../../const/app-colors';
import { useAppToast } from '../../../hooks/use-app-toast';
import { useResponsive } from '../../../hooks/use-responsive';
import { StartSessionModal } from './StartSessionModal';

interface HeaderBarProps {
  onOpenManageRooms: () => void;
  onToggleCamera: () => void;
  onSelectZone: () => void;
  onSelectRoom: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenManageRooms,
  onToggleCamera,
  onSelectZone,
  onSelectRoom,
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
  } = useAppSelector(state => state.detector);

  const { showWarnToast } = useAppToast();
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);

  const [currentTime, setCurrentTime] = useState<string>(() => dayjs().format('HH:mm:ss'));
  const [currentDate, setCurrentDate] = useState<string>(() => dayjs().format('DD/MM/YYYY'));

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

  const handleStartPress = () => {
    if (!selectedRoom || !selectedRoom.id) {
      showWarnToast(
        'Chưa chọn phòng',
        'Vui lòng tạo hoặc chọn phòng trước khi bắt đầu phiên!'
      );
      onOpenManageRooms();
      return;
    }
    setShowStartSessionModal(true);
  };

  if (isPhone) {
    return (
      <View style={styles.phoneHeader}>
        {/* Phone Row 1: Brand & Online dot & Session Button & Camera */}
        <View style={styles.phoneRow1}>
          <View style={styles.brandContainer}>
            <View style={styles.logoRow}>
              <AppText style={styles.brandTitlePrimary}>VietCore</AppText>
              <AppText style={styles.brandTitleSecondary}> AI</AppText>
            </View>
          </View>

          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <AppText style={styles.onlineText}>ONLINE</AppText>
          </View>

          <View style={styles.phoneRow1Actions}>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={onToggleCamera}
              activeOpacity={0.7}
            >
              <Camera size={18} color={appColors.gray600} />
            </TouchableOpacity>

            {!isSessionActive ? (
              <TouchableOpacity
                style={styles.startSessionBtnPhone}
                onPress={handleStartPress}
                activeOpacity={0.85}
              >
                <Play size={13} color={appColors.white} fill={appColors.white} />
                <AppText style={styles.startSessionTextPhone}>Bắt đầu phiên</AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.sessionActiveBadgePhone}>
                <View style={styles.pulsingSessionDot} />
                <AppText style={styles.sessionActiveTextPhone} numberOfLines={1}>
                  {activeSessionName || 'Đang chạy'}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Phone Row 2: Selectors for Zone & Room & Manage */}
        <View style={styles.phoneRow2}>
          <TouchableOpacity
            style={styles.dropdownBtnPhone}
            onPress={onSelectZone}
            activeOpacity={0.8}
          >
            <Building2 size={15} color={appColors.blue600} style={{ flexShrink: 0 }} />
            <AppText style={styles.dropdownTextPhone} numberOfLines={1} ellipsizeMode="tail">
              {selectedZone ? selectedZone.name : 'Chọn Khu'}
            </AppText>
            <ChevronDown size={14} color={appColors.gray500} style={{ flexShrink: 0 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownBtnPhone}
            onPress={onSelectRoom}
            activeOpacity={0.8}
          >
            <DoorOpen size={15} color={appColors.blue600} style={{ flexShrink: 0 }} />
            <AppText style={styles.dropdownTextPhone} numberOfLines={1} ellipsizeMode="tail">
              {selectedRoom ? selectedRoom.name : 'Chọn Phòng'}
            </AppText>
            <ChevronDown size={14} color={appColors.gray500} style={{ flexShrink: 0 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manageBtnPhone}
            onPress={onOpenManageRooms}
            activeOpacity={0.8}
          >
            <Sliders size={16} color={appColors.gray600} style={{ flexShrink: 0 }} />
          </TouchableOpacity>
        </View>

        {/* Start Session Modal */}
        <StartSessionModal
          visible={showStartSessionModal}
          roomName={selectedRoom ? selectedRoom.name : ''}
          zoneName={selectedZone ? selectedZone.name : ''}
          memberCount={
            selectedRoom
              ? userProfiles.filter(u => u.roomId === selectedRoom.id).length
              : 0
          }
          onClose={() => setShowStartSessionModal(false)}
          onStart={(sessionName: string) => {
            setShowStartSessionModal(false);
            dispatch(startSession({ name: sessionName }));
            if (selectedRoom) {
              sessionService.startSession({
                name: sessionName,
                roomId: selectedRoom.id,
                roomName: selectedRoom.name,
                zoneId: selectedZone?.id,
                zoneName: selectedZone?.name,
              }).catch(err => {
                console.log('[HeaderBar] Failed to start session on BE:', err);
              });
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.header}>
      {/* Brand logo & status */}
      <View style={styles.brandContainer}>
        <View style={styles.logoRow}>
          <AppText style={styles.brandTitlePrimary}>VietCore</AppText>
          <AppText style={styles.brandTitleSecondary}> AI</AppText>
        </View>
        <AppText style={styles.brandSub}>FACE CHECK</AppText>
      </View>

      <View style={styles.onlineBadge}>
        <View style={styles.onlineDot} />
        <AppText style={styles.onlineText}>ONLINE</AppText>
      </View>

      {/* Selectors for Zone & Room */}
      <View style={styles.selectorsRow}>
        {/* Zone Selector */}
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={onSelectZone}
          activeOpacity={0.8}
        >
          <Building2 size={18} color={appColors.blue600} style={{ flexShrink: 0 }} />
          <AppText style={styles.dropdownText} numberOfLines={1} ellipsizeMode="tail">
            {selectedZone ? selectedZone.name : 'Chọn Khu'}
          </AppText>
          <ChevronDown size={18} color={appColors.gray500} style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* Room Selector */}
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={onSelectRoom}
          activeOpacity={0.8}
        >
          <DoorOpen size={18} color={appColors.blue600} style={{ flexShrink: 0 }} />
          <AppText style={styles.dropdownText} numberOfLines={1} ellipsizeMode="tail">
            {selectedRoom ? selectedRoom.name : 'Chọn Phòng'}
          </AppText>
          <ChevronDown size={18} color={appColors.gray500} style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* Manage Zones & Rooms */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={onOpenManageRooms}
          activeOpacity={0.8}
        >
          <Sliders size={16} color={appColors.gray600} style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* Session Action Button */}
        {!isSessionActive ? (
          <TouchableOpacity
            style={styles.startSessionBtn}
            onPress={handleStartPress}
            activeOpacity={0.85}
          >
            <Play size={16} color={appColors.white} fill={appColors.white} style={{ flexShrink: 0 }} />
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
          style={styles.iconAction}
          onPress={onToggleCamera}
          activeOpacity={0.7}
        >
          <Camera size={20} color={appColors.gray600} />
        </TouchableOpacity>

        {/* Real-time Clock */}
        <View style={styles.clockContainer}>
          <AppText style={styles.clockTime}>{currentTime}</AppText>
          <AppText style={styles.clockDate}>{currentDate}</AppText>
        </View>
      </View>

      {/* Start Session Modal */}
      <StartSessionModal
        visible={showStartSessionModal}
        roomName={selectedRoom ? selectedRoom.name : ''}
        zoneName={selectedZone ? selectedZone.name : ''}
        memberCount={
          selectedRoom
            ? userProfiles.filter(u => u.roomId === selectedRoom.id).length
            : 0
        }
        onClose={() => setShowStartSessionModal(false)}
        onStart={(sessionName: string) => {
          setShowStartSessionModal(false);
          dispatch(startSession({ name: sessionName }));
          if (selectedRoom) {
            sessionService.startSession({
              name: sessionName,
              roomId: selectedRoom.id,
              roomName: selectedRoom.name,
              zoneId: selectedZone?.id,
              zoneName: selectedZone?.name,
            }).catch(err => {
              console.log('[HeaderBar] Failed to start session on BE:', err);
            });
          }
        }}
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
});
