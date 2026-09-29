import React, { useState } from 'react';
import { StyleSheet, View, StatusBar, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from './components/HeaderBar';
import { CameraViewFinder, CameraViewFinderRef } from './components/CameraViewFinder';
import { StatsBar } from './components/StatsBar';
import { AttendanceCard } from './components/AttendanceCard';
import { SessionControls } from './components/SessionControls';
import { AddUserModal } from './components/AddUserModal';
import { UserListModal } from './components/UserListModal';
import { AlertsModal } from './components/AlertsModal';
import { BottomActions } from './components/BottomActions';
import { PickerModal } from './components/PickerModal';
import { ManageRoomsModal } from './components/ManageRoomsModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addAlert,
  clearMockData,
  endSession,
  recordAttendance,
  setActiveDetection,
  setSelectedRoomId,
  setSelectedZoneId,
} from '../../store/slices/detectorSlice';
import { YoloDetectorService } from '../../services/yolo-detector';
import { useResponsive } from '../../hooks/use-responsive';
import { appColors } from '../../const/app-colors';
import {
  sessionService,
  attendanceService,
  alertService,
} from '../../services/api';

interface TabletDetectorScreenProps {
  isTabFocused?: boolean;
}

const TabletDetectorScreen: React.FC<TabletDetectorScreenProps> = ({
  isTabFocused = true,
}) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const cameraViewFinderRef = React.useRef<CameraViewFinderRef>(null);
  const {
    zones,
    rooms,
    userProfiles,
    selectedZoneId,
    selectedRoomId,
    isSessionActive,
    activeSessionId,
    attendanceMap,
    activeDetection,
    alerts,
  } = useAppSelector(state => state.detector);

  // Modals state
  const [addUserVisible, setAddUserVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);
  const [manageRoomsVisible, setManageRoomsVisible] = useState(false);

  // Camera Facing
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  // Filter users by selected room (memoized to avoid unneeded re-enrollments)
  const currentRoomUsers = React.useMemo(
    () => (userProfiles || []).filter(u => u.roomId === selectedRoomId),
    [userProfiles, selectedRoomId],
  );

  // Calculate statistics
  let presentCount = 0;
  let verifyCount = 0;
  currentRoomUsers.forEach(u => {
    const att = attendanceMap?.[u.id];
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

  // Initialize YOLO & MobileFaceNet models on mount and pre-enroll room users
  React.useEffect(() => {
    YoloDetectorService.initialize().then(async ready => {
      console.log('[TabletDetectorScreen] YOLO Engine ready:', ready);
      if (ready && currentRoomUsers.length > 0) {
        await YoloDetectorService.warmupRoomEmbeddings(currentRoomUsers);
      }
    });
  }, [currentRoomUsers]);

  const isScanningRef = React.useRef(false);
  const consecutiveMissedFramesRef = React.useRef(0);
  const attendanceMapRef = React.useRef(attendanceMap);
  attendanceMapRef.current = attendanceMap;
  const alertsRef = React.useRef(alerts);
  alertsRef.current = alerts;

  // Trigger auto or manual detection
  const handleScanDetection = React.useCallback(
    async (providedPhotoPath?: string) => {
      if (!isSessionActive || !isTabFocused) return;
      if (isScanningRef.current) return;
      isScanningRef.current = true;

      try {
        // 1. Capture real frame from Camera hardware if available
        let photoPath = providedPhotoPath;
        if (!photoPath && cameraViewFinderRef.current) {
          photoPath =
            (await cameraViewFinderRef.current.captureFrame()) || undefined;
        }

        // 2. If camera photo is captured, run real YOLOv8 & MobileFaceNet AI pipeline
        if (photoPath) {
          const isFront = cameraFacing === 'front';
          const realResult = await YoloDetectorService.processCapturedFrame(
            photoPath,
            currentRoomUsers,
            isFront,
          );

          if (realResult) {
            consecutiveMissedFramesRef.current = 0;
            const attPayload = {
              sessionId: activeSessionId || undefined,
              userId: realResult.userId,
              status: realResult.status,
              confidence: realResult.confidence,
              timestamp: realResult.timestamp,
              avatarUri: realResult.avatarUri,
            };

            dispatch(
              recordAttendance({
                ...attPayload,
                boundingBox: realResult.boundingBox,
              }),
            );
            dispatch(setActiveDetection(realResult));

            attendanceService.recordAttendance(attPayload).catch(err => {
              console.log('[TabletDetector] Failed to sync attendance to BE:', err);
            });

            if (realResult.status === 'present') {
              const prevAtt = attendanceMapRef.current?.[realResult.userId];
              if (!prevAtt || prevAtt.status !== 'present') {
                const alertPayload = {
                  title: 'Điểm danh thành công',
                  message: `${realResult.fullName} (${realResult.code}) đã điểm danh với độ tin cậy ${realResult.confidence}%`,
                  timestamp: realResult.timestamp,
                  type: 'info' as const,
                };
                dispatch(addAlert(alertPayload));
                alertService.createAlert(alertPayload).catch(err => {
                  console.log('[TabletDetector] Failed to sync alert to BE:', err);
                });
              }
            } else if (realResult.status === 'verify') {
              const lastAlert = alertsRef.current?.[0];
              const isRecentUnknownAlert =
                lastAlert?.type === 'warning' &&
                lastAlert?.title === 'Khuôn mặt chưa khớp';
              if (!isRecentUnknownAlert) {
                const warnPayload = {
                  title: 'Khuôn mặt chưa khớp',
                  message: `Phát hiện đối tượng chưa khớp với danh sách phòng (độ khớp: ${realResult.confidence}%)`,
                  timestamp: realResult.timestamp,
                  type: 'warning' as const,
                };
                dispatch(addAlert(warnPayload));
                alertService.createAlert(warnPayload).catch(err => {
                  console.log('[TabletDetector] Failed to sync alert to BE:', err);
                });
              }
            }
          } else {
            // Debounce 2 consecutive missed frames before clearing active detection
            consecutiveMissedFramesRef.current += 1;
            if (consecutiveMissedFramesRef.current >= 2) {
              dispatch(setActiveDetection(null));
            }
          }
        } else {
          consecutiveMissedFramesRef.current += 1;
          if (consecutiveMissedFramesRef.current >= 2) {
            dispatch(setActiveDetection(null));
          }
        }
      } catch (err) {
        console.warn('[TabletDetectorScreen] auto-scan error:', err);
      } finally {
        isScanningRef.current = false;
      }
    },
    [
      isSessionActive,
      isTabFocused,
      activeSessionId,
      currentRoomUsers,
      cameraFacing,
      dispatch,
    ],
  );

  // Continuous YOLO face scanning loop when session is active
  React.useEffect(() => {
    if (!isSessionActive || !isTabFocused) return;

    const timer = setTimeout(() => {
      handleScanDetection();
    }, 600);

    const interval = setInterval(() => {
      handleScanDetection();
    }, 900);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isSessionActive, isTabFocused, handleScanDetection]);

  const handleEndSession = () => {
    Alert.alert(
      'Kết thúc phiên điểm danh',
      'Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Kết thúc',
          style: 'destructive',
          onPress: () => {
            if (activeSessionId) {
              sessionService.endSession(activeSessionId).catch(err => {
                console.log('[TabletDetector] Failed to end session on BE:', err);
              });
            }
            dispatch(endSession());
          },
        },
      ],
    );
  };

  const zonePickerItems = (zones || []).map(z => ({
    id: z.id,
    label: z.name,
    subtitle: z.description,
  }));

  const roomPickerItems = (rooms || [])
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
        onOpenManageRooms={() => setManageRoomsVisible(true)}
        onToggleCamera={() =>
          setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'))
        }
        onSelectZone={() => setZonePickerVisible(true)}
        onSelectRoom={() => setRoomPickerVisible(true)}
      />

      {/* 2. Main Body: Responsive Tablet Landscape vs Mobile Portrait */}
      {isPhone ? (
        <ScrollView
          style={styles.phoneMainContainer}
          contentContainerStyle={styles.phoneScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Camera */}
          <View style={styles.phoneCameraWrap}>
            <CameraViewFinder
              ref={cameraViewFinderRef}
              boundingBox={activeDetection?.boundingBox}
              detection={activeDetection}
              isSessionActive={isSessionActive}
              onManualScan={photoPath => handleScanDetection(photoPath)}
              cameraFacing={cameraFacing}
              isTabFocused={isTabFocused}
            />
          </View>

          {/* Stats Bar */}
          <StatsBar
            presentCount={presentCount}
            missingCount={missingCount}
            verifyCount={verifyCount}
          />

          {/* Quick List & Alerts Actions */}
          <BottomActions
            onOpenList={() => setListModalVisible(true)}
            onOpenAlerts={() => setAlertsModalVisible(true)}
            unreadAlertsCount={(alerts || []).filter(a => a.type === 'warning').length}
          />

          {/* Attendance Result Card */}
          <AttendanceCard
            detection={activeDetection}
            isSessionActive={isSessionActive}
          />

          {/* Session Controls */}
          <SessionControls
            onEndSession={handleEndSession}
            isSessionActive={isSessionActive}
          />
        </ScrollView>
      ) : (
        <View style={styles.mainContainer}>
          {/* Left Column: Camera + Stats Bar + Bottom Actions */}
          <View style={styles.leftColumn}>
            <CameraViewFinder
              ref={cameraViewFinderRef}
              boundingBox={activeDetection?.boundingBox}
              detection={activeDetection}
              isSessionActive={isSessionActive}
              onManualScan={photoPath => handleScanDetection(photoPath)}
              cameraFacing={cameraFacing}
              isTabFocused={isTabFocused}
            />

            <StatsBar
              presentCount={presentCount}
              missingCount={missingCount}
              verifyCount={verifyCount}
            />

            <BottomActions
              onOpenList={() => setListModalVisible(true)}
              onOpenAlerts={() => setAlertsModalVisible(true)}
              unreadAlertsCount={(alerts || []).filter(a => a.type === 'warning').length}
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
      )}

      <AddUserModal
        visible={addUserVisible}
        onClose={() => setAddUserVisible(false)}
      />

      <UserListModal
        visible={listModalVisible}
        onClose={() => setListModalVisible(false)}
        onOpenAddUser={() => setAddUserVisible(true)}
      />

      <AlertsModal
        visible={alertsModalVisible}
        onClose={() => setAlertsModalVisible(false)}
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

      <ManageRoomsModal
        visible={manageRoomsVisible}
        onClose={() => setManageRoomsVisible(false)}
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
  phoneMainContainer: {
    flex: 1,
  },
  phoneScrollContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 28,
  },
  phoneCameraWrap: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
