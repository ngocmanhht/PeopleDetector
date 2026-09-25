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
import { appColors } from '../../../const/app-colors';

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
  const dispatch = useAppDispatch();
  const { zones, rooms, selectedZoneId, selectedRoomId, isSessionActive } =
    useAppSelector(state => state.detector);

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
          <Building2 size={18} color={appColors.blue600} />
          <AppText style={styles.dropdownText}>
            {selectedZone ? selectedZone.name : 'Chọn Khu'}
          </AppText>
          <ChevronDown size={18} color={appColors.gray500} />
        </TouchableOpacity>

        {/* Room Selector */}
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={onSelectRoom}
          activeOpacity={0.8}
        >
          <DoorOpen size={18} color={appColors.blue600} />
          <AppText style={styles.dropdownText}>
            {selectedRoom ? selectedRoom.name : 'Chọn Phòng'}
          </AppText>
          <ChevronDown size={18} color={appColors.gray500} />
        </TouchableOpacity>

        {/* Manage Zones & Rooms */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={onOpenManageRooms}
          activeOpacity={0.8}
        >
          <Sliders size={16} color={appColors.gray600} />
        </TouchableOpacity>

        {/* Session Action Button */}
        {!isSessionActive ? (
          <TouchableOpacity
            style={styles.startSessionBtn}
            onPress={() => {
              if (!selectedRoom) {
                // Open manage rooms
                onOpenManageRooms();
                return;
              }
              dispatch(startSession());
            }}
            activeOpacity={0.85}
          >
            <Play size={16} color={appColors.white} fill={appColors.white} />
            <AppText style={styles.startSessionText}>Bắt đầu phiên</AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.sessionActiveBadge}>
            <View style={styles.pulsingSessionDot} />
            <AppText style={styles.sessionActiveText}>Phiên đang chạy</AppText>
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
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate800,
  },
  manageBtn: {
    backgroundColor: appColors.slate100,
    padding: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.slate200,
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
  },
  pulsingSessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.blue600,
  },
  sessionActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.blue700,
  },
  systemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
});
