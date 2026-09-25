import React, { useState } from 'react';
import { StyleSheet, View, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from './components/HeaderBar';
import { CameraViewFinder } from './components/CameraViewFinder';
import { StatsBar } from './components/StatsBar';
import { AttendanceCard } from './components/AttendanceCard';
import { SessionControls } from './components/SessionControls';
import { AddUserModal } from './components/AddUserModal';
import { PickerModal } from './components/PickerModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearMockData,
  endSession,
  recordAttendance,
  setSelectedRoomId,
  setSelectedZoneId,
} from '../../store/slices/detectorSlice';
import { YoloDetectorService } from '../../services/yolo-detector';
import { appColors } from '../../const/app-colors';

const TabletDetectorScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    zones,
    rooms,
    userProfiles,
    selectedZoneId,
    selectedRoomId,
    isSessionActive,
    attendanceMap,
    activeDetection,
  } = useAppSelector(state => state.detector);

  // Modals state
  const [addUserVisible, setAddUserVisible] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);

  // Camera Facing
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  // Filter users by selected room
  const currentRoomUsers = userProfiles.filter(
    u => u.roomId === selectedRoomId,
  );

  // Calculate statistics
  let presentCount = 0;
  let verifyCount = 0;
  currentRoomUsers.forEach(u => {
    const att = attendanceMap[u.id];
    if (att?.status === 'present') presentCount++;
    else if (att?.status === 'verify') verifyCount++;
  });
  const missingCount = Math.max(
    0,
    currentRoomUsers.length - presentCount - verifyCount,
  );

  // Clear legacy mock data once on mount if present
  React.useEffect(() => {
    dispatch(clearMockData());
  }, [dispatch]);

  // Initialize YOLO & MobileFaceNet models on mount
  React.useEffect(() => {
    YoloDetectorService.initialize().then(ready => {
      console.log('[TabletDetectorScreen] YOLO Engine ready:', ready);
    });
  }, []);

  // Pre-enroll room users into embedding cache
  React.useEffect(() => {
    currentRoomUsers.forEach(u => YoloDetectorService.enrollProfile(u));
  }, [currentRoomUsers]);

  // Trigger manual or auto detection
  const handleScanDetection = React.useCallback(
    (targetUserId?: string) => {
      if (!isSessionActive) return;

      // Pick target user or next missing user or random
      const missingUsers = currentRoomUsers.filter(
        u => !attendanceMap[u.id] || attendanceMap[u.id]?.status !== 'present',
      );
      const target = targetUserId
        ? currentRoomUsers.find(u => u.id === targetUserId)
        : missingUsers.length > 0
        ? missingUsers[0]
        : currentRoomUsers[Math.floor(Math.random() * currentRoomUsers.length)];

      if (!target) return;

      const box = YoloDetectorService.generateYoloBoundingBox();
      const result = YoloDetectorService.matchDetectedFace(
        box,
        currentRoomUsers,
        target,
      );

      if (result) {
        dispatch(
          recordAttendance({
            userId: result.userId,
            status: result.status,
            confidence: result.confidence,
            timestamp: result.timestamp,
            boundingBox: result.boundingBox,
          }),
        );
      }
    },
    [isSessionActive, currentRoomUsers, attendanceMap, dispatch],
  );

  // Continuous YOLO face scanning loop when session is active
  React.useEffect(() => {
    if (!isSessionActive) return;

    const timer = setTimeout(() => {
      handleScanDetection();
    }, 800);

    const interval = setInterval(() => {
      handleScanDetection();
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isSessionActive, handleScanDetection]);

  const handleEndSession = () => {
    Alert.alert(
      'Kết thúc phiên điểm danh',
      'Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Kết thúc',
          style: 'destructive',
          onPress: () => dispatch(endSession()),
        },
      ],
    );
  };

  const zonePickerItems = zones.map(z => ({
    id: z.id,
    label: z.name,
    subtitle: z.description,
  }));

  const roomPickerItems = rooms
    .filter(r => r.zoneId === selectedZoneId)
    .map(r => ({
      id: r.id,
      label: r.name,
      subtitle: `Sức chứa ${r.capacity || 30} người`,
    }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 1. Header Bar */}
      <HeaderBar
        onOpenManageRooms={() => setRoomPickerVisible(true)}
        onToggleCamera={() =>
          setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'))
        }
        onSelectZone={() => setZonePickerVisible(true)}
        onSelectRoom={() => setRoomPickerVisible(true)}
      />

      {/* 2. Main 2-Column Tablet Landscape Body */}
      <View style={styles.mainContainer}>
        {/* Left Column: Camera + Stats Bar + Bottom Actions */}
        <View style={styles.leftColumn}>
          <CameraViewFinder
            boundingBox={activeDetection?.boundingBox}
            isSessionActive={isSessionActive}
            onManualScan={() => handleScanDetection()}
            cameraFacing={cameraFacing}
          />

          <StatsBar
            presentCount={presentCount}
            missingCount={missingCount}
            verifyCount={verifyCount}
          />
        </View>

        {/* Right Column: Attendance Result Card + End Session Button */}
        <View style={styles.rightColumn}>
          <AttendanceCard
            detection={activeDetection}
            isSessionActive={isSessionActive}
          />

          <SessionControls
            onEndSession={handleEndSession}
            isSessionActive={isSessionActive}
          />
        </View>
      </View>

      <AddUserModal
        visible={addUserVisible}
        onClose={() => setAddUserVisible(false)}
      />

      <PickerModal
        visible={zonePickerVisible}
        title="Chọn Khu vực (Zone)"
        items={zonePickerItems}
        selectedId={selectedZoneId}
        onSelect={id => dispatch(setSelectedZoneId(id))}
        onClose={() => setZonePickerVisible(false)}
      />

      <PickerModal
        visible={roomPickerVisible}
        title="Chọn Phòng (Room)"
        items={roomPickerItems}
        selectedId={selectedRoomId}
        onSelect={id => dispatch(setSelectedRoomId(id))}
        onClose={() => setRoomPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

export default TabletDetectorScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appColors.slate50,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  leftColumn: {
    flex: 1.25,
    flexDirection: 'column',
  },
  rightColumn: {
    flex: 0.95,
    flexDirection: 'column',
  },
});
