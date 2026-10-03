import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from './components/HeaderBar';
import {
  CameraViewFinder,
  CameraViewFinderRef,
} from './components/CameraViewFinder';
import { ScannedResultsList } from './components/ScannedResultsList';
import { SessionSummaryBar } from './components/SessionSummaryBar';
import { ScanDirectionToggle } from './components/ScanDirectionToggle';
import { SessionControls } from './components/SessionControls';
import { StartSessionModal } from './components/StartSessionModal';
import { AddUserModal } from './components/AddUserModal';
import { UserListModal } from './components/UserListModal';
import { AlertsModal } from './components/AlertsModal';
import { BottomActions } from './components/BottomActions';
import { SessionsHistoryModal } from './components/SessionsHistoryModal';
import { SessionDetailModal } from '../rooms-manager/components/SessionDetailModal';
import { DeviceInfoModal } from './components/DeviceInfoModal';
import { AttendanceSession } from '../../model/detector';
import { PickerModal } from './components/PickerModal';
import { ManageRoomsModal } from './components/ManageRoomsModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addAlert,
  clearMockData,
  endSession,
  recordAttendance,
  recordScanEvent,
  setActiveDetection,
  setSelectedRoomId,
  setSelectedZoneId,
  setScanMode,
  setScanDirection,
  startSession,
  tickSessionDuration,
  setDeviceAuthorized,
} from '../../store/slices/detectorSlice';
import { YoloDetectorService } from '../../services/yolo-detector';
import { useResponsive } from '../../hooks/use-responsive';
import { useAppToast } from '../../hooks/use-app-toast';
import { appColors } from '../../const/app-colors';
import {
  sessionService,
  attendanceService,
  alertService,
  deviceService,
} from '../../services/api';
import { deviceIdService } from '../../services/device-id-service';

interface TabletDetectorScreenProps {
  isTabFocused?: boolean;
}

const TabletDetectorScreen: React.FC<TabletDetectorScreenProps> = ({
  isTabFocused = true,
}) => {
  const { isPhone } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();
  // Camera điện thoại cao ~50% màn hình (giới hạn 340–520)
  const phoneCameraHeight = Math.round(
    Math.min(520, Math.max(340, windowHeight * 0.5)),
  );
  const { showSuccessToast, showWarnToast } = useAppToast();
  const dispatch = useAppDispatch();
  const cameraViewFinderRef = useRef<CameraViewFinderRef>(null);

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
    scanMode,
    scanDirection,
    sessionDurationSeconds,
    scanHistory,
    sessions,
    isDeviceAuthorized,
    deviceLockMessage,
  } = useAppSelector(state => state.detector);

  // Modals state
  const [addUserVisible, setAddUserVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);
  const [manageRoomsVisible, setManageRoomsVisible] = useState(false);
  const [startSessionModalVisible, setStartSessionModalVisible] =
    useState(false);
  const [sessionsHistoryVisible, setSessionsHistoryVisible] = useState(false);
  const [deviceInfoModalVisible, setDeviceInfoModalVisible] = useState(false);
  const [selectedDetailSession, setSelectedDetailSession] =
    useState<AttendanceSession | null>(null);
  const [enrollStrangerPhotoUri, setEnrollStrangerPhotoUri] = useState<
    string | null
  >(null);
  const [enrollStrangerFullName, setEnrollStrangerFullName] =
    useState<string>('');

  const handleEnrollStranger = useCallback(
    (photoUri?: string, defaultName?: string) => {
      setEnrollStrangerPhotoUri(photoUri || null);
      setEnrollStrangerFullName(
        defaultName &&
          defaultName !== 'Người chưa xác minh' &&
          defaultName !== 'Người lạ'
          ? defaultName
          : '',
      );
      setAddUserVisible(true);
    },
    [],
  );

  // Camera Facing
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  // Filter users by selected room (including visitors visiting members in this room)
  const currentRoomUsers = useMemo(
    () =>
      (userProfiles || []).filter(u => {
        if (u.roomId === selectedRoomId) return true;
        if (u.isVisitor && u.visitedProfileId) {
          const visitedUser = (userProfiles || []).find(
            v => v.id === u.visitedProfileId,
          );
          return visitedUser?.roomId === selectedRoomId;
        }
        return false;
      }),
    [userProfiles, selectedRoomId],
  );

  // Target profiles: in 'all' mode match against all facility profiles, in 'room' mode match room profiles
  const targetProfiles = useMemo(
    () => (scanMode === 'all' ? userProfiles || [] : currentRoomUsers),
    [scanMode, userProfiles, currentRoomUsers],
  );

  const selectedZone = zones.find(z => z.id === selectedZoneId) || zones[0];
  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  // Clear legacy mock data once on mount if present
  useEffect(() => {
    dispatch(clearMockData());
  }, [dispatch]);

  // Kiểm tra tình trạng cấp quyền thiết bị ngay khi vào màn hình
  useEffect(() => {
    let isMounted = true;
    const checkInitialDeviceStatus = async () => {
      try {
        const id = deviceIdService.getDeviceId();
        const res = await deviceService.checkStatus(id);
        if (isMounted) {
          if (res?.allowed) {
            dispatch(setDeviceAuthorized({ authorized: true }));
          } else {
            dispatch(
              setDeviceAuthorized({
                authorized: false,
                message:
                  res?.message ||
                  'Thiết bị chưa được cấp quyền truy cập hệ thống.',
              }),
            );
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const msg = err?.message || 'Không thể xác thực thiết bị';
          if (
            msg.includes('Thiết bị') ||
            msg.includes('403') ||
            msg.includes('cấp quyền')
          ) {
            dispatch(setDeviceAuthorized({ authorized: false, message: msg }));
          }
        }
      }
    };

    checkInitialDeviceStatus();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // Pre-warm embeddings for target profiles when engine is ready or targetProfiles change
  useEffect(() => {
    YoloDetectorService.initialize().then(async ready => {
      console.log('[TabletDetectorScreen] YOLO Engine ready:', ready);
      if (ready && targetProfiles.length > 0) {
        await YoloDetectorService.warmupRoomEmbeddings(targetProfiles);
      }
    });
  }, [targetProfiles]);

  // Real-time Session Duration Timer: ticks every second when session is running
  useEffect(() => {
    if (!isSessionActive || !isTabFocused) return;
    const timer = setInterval(() => {
      dispatch(tickSessionDuration());
    }, 1000);
    return () => clearInterval(timer);
  }, [isSessionActive, isTabFocused, dispatch]);

  const isScanningRef = useRef(false);
  const scanLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveMissedFramesRef = useRef(0);
  const attendanceMapRef = useRef(attendanceMap);
  attendanceMapRef.current = attendanceMap;
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const isSessionRunningRef = useRef(false);
  isSessionRunningRef.current =
    isSessionActive && isTabFocused && isDeviceAuthorized !== false;

  const handleScanDetectionRef = useRef<
    ((providedPhotoPath?: string) => Promise<void>) | null
  >(null);

  const scheduleNextScan = useCallback((delayMs: number) => {
    if (scanLoopTimerRef.current) {
      clearTimeout(scanLoopTimerRef.current);
      scanLoopTimerRef.current = null;
    }
    if (!isSessionRunningRef.current) return;
    scanLoopTimerRef.current = setTimeout(() => {
      handleScanDetectionRef.current?.();
    }, delayMs);
  }, []);

  // Trigger auto or manual detection
  const handleScanDetection = useCallback(
    async (providedPhotoPath?: string) => {
      if (!isSessionRunningRef.current) return;
      if (isScanningRef.current) return;
      isScanningRef.current = true;

      try {
        // 1. Capture real frame from Camera hardware if available
        let photoPath = providedPhotoPath;
        if (!photoPath && cameraViewFinderRef.current) {
          photoPath =
            (await cameraViewFinderRef.current.captureFrame()) || undefined;
        }

        // 2. If camera photo is captured, run real YOLOv8 & MobileFaceNet/GhostFaceNet AI pipeline
        if (photoPath) {
          const isFront = cameraFacing === 'front';
          const realResult = await YoloDetectorService.processCapturedFrame(
            photoPath,
            targetProfiles,
            isFront,
          );

          if (realResult) {
            consecutiveMissedFramesRef.current = 0;

            // Lookup room and zone details for the detected user
            const matchedProfile = targetProfiles.find(
              u => u.id === realResult.userId,
            );

            // Quy tắc nghiệp vụ: Chế độ Quét All (Xác nhận vào cơ sở) tự động BỎ QUA người thân nhân
            if (scanMode === 'all' && matchedProfile?.isVisitor) {
              console.log(
                '[TabletDetector] Quét All: Bỏ qua người thân nhân:',
                matchedProfile.fullName,
              );
              scheduleNextScan(120);
              return;
            }

            const userRoomId =
              matchedProfile?.roomId ||
              (scanMode === 'room' ? selectedRoomId : undefined);
            const userZoneId =
              matchedProfile?.zoneId ||
              (scanMode === 'room' ? selectedZoneId : undefined);
            const userRoom = rooms.find(r => r.id === userRoomId);
            const userZone = zones.find(z => z.id === userZoneId);
            const deptName = userRoom?.name || 'Phòng ban khác';

            // Record into Redux scanHistory list with IN/OUT timestamps & scan counts
            dispatch(
              recordScanEvent({
                userId: realResult.userId,
                fullName: realResult.fullName,
                code: realResult.code,
                roomId: userRoom?.id,
                roomName: userRoom?.name,
                zoneId: userZone?.id,
                zoneName: userZone?.name,
                avatarUri: realResult.avatarUri,
                confidence: realResult.confidence,
                status: realResult.status,
                timestamp: realResult.timestamp,
                scanMode,
                direction: scanDirection,
                isVisitor: matchedProfile?.isVisitor,
                visitedProfileName: matchedProfile?.visitedProfile?.fullName,
              }),
            );

            const attPayload = {
              sessionId: activeSessionId || undefined,
              userId: realResult.userId,
              status: realResult.status,
              confidence: realResult.confidence,
              timestamp: realResult.timestamp,
              avatarUri: realResult.avatarUri,
              direction: scanDirection,
            };

            dispatch(
              recordAttendance({
                ...attPayload,
                boundingBox: realResult.boundingBox,
              }),
            );
            dispatch(setActiveDetection(realResult));

            if (
              activeSessionId &&
              realResult.userId &&
              realResult.userId !== 'unverified-unknown'
            ) {
              attendanceService.recordAttendance(attPayload).catch(err => {
                console.log(
                  '[TabletDetector] Failed to sync attendance to BE:',
                  err,
                );
              });
            }

            if (realResult.status === 'present') {
              const prevAtt = attendanceMapRef.current?.[realResult.userId];
              if (!prevAtt || prevAtt.status !== 'present') {
                const isVisitorUser = matchedProfile?.isVisitor;
                const visitorTag =
                  isVisitorUser && matchedProfile?.visitedProfile?.fullName
                    ? ` [Khách thăm: ${matchedProfile.visitedProfile.fullName}]`
                    : isVisitorUser
                    ? ' [Khách thăm]'
                    : '';
                const isOut = scanDirection === 'out';
                const alertPayload = {
                  title:
                    scanMode === 'all'
                      ? isOut
                        ? 'Xác nhận ra cơ sở'
                        : 'Xác nhận vào cơ sở'
                      : isVisitorUser
                      ? 'Thân nhân'
                      : isOut
                      ? 'Điểm danh RA thành công'
                      : 'Điểm danh VÀO thành công',
                  message:
                    scanMode === 'all'
                      ? `${realResult.fullName} (${
                          realResult.code
                        }) đã xác nhận ${
                          isOut ? 'ra khỏi' : 'vào'
                        } cơ sở [${deptName}] với độ tin cậy ${
                          realResult.confidence
                        }%`
                      : `${realResult.fullName} (${
                          realResult.code
                        })${visitorTag} đã điểm danh ${
                          isOut ? 'RA' : 'VÀO'
                        } với độ tin cậy ${realResult.confidence}%`,
                  timestamp: realResult.timestamp,
                  type: 'info' as const,
                };
                dispatch(addAlert(alertPayload));
                alertService.createAlert(alertPayload).catch(err => {
                  console.log(
                    '[TabletDetector] Failed to sync alert to BE:',
                    err,
                  );
                });
              }

              // Also check-in any additional enrolled members verified in the same camera frame!
              if (
                realResult.additionalVerified &&
                realResult.additionalVerified.length > 0
              ) {
                for (const addResult of realResult.additionalVerified) {
                  const addMatched = targetProfiles.find(
                    u => u.id === addResult.userId,
                  );
                  // Quét All: bỏ qua người thân nhân
                  if (scanMode === 'all' && addMatched?.isVisitor) {
                    continue;
                  }

                  const addRoomId =
                    addMatched?.roomId ||
                    (scanMode === 'room' ? selectedRoomId : undefined);
                  const addZoneId =
                    addMatched?.zoneId ||
                    (scanMode === 'room' ? selectedZoneId : undefined);
                  const addRoom = rooms.find(r => r.id === addRoomId);
                  const addZone = zones.find(z => z.id === addZoneId);
                  const addDept = addRoom?.name || 'Phòng ban khác';

                  dispatch(
                    recordScanEvent({
                      userId: addResult.userId,
                      fullName: addResult.fullName,
                      code: addResult.code,
                      roomId: addRoom?.id,
                      roomName: addRoom?.name,
                      zoneId: addZone?.id,
                      zoneName: addZone?.name,
                      avatarUri: addResult.avatarUri,
                      confidence: addResult.confidence,
                      status: addResult.status,
                      timestamp: addResult.timestamp,
                      scanMode,
                      direction: scanDirection,
                      isVisitor: addMatched?.isVisitor,
                      visitedProfileName: addMatched?.visitedProfile?.fullName,
                    }),
                  );

                  const addAttPayload = {
                    sessionId: activeSessionId || undefined,
                    userId: addResult.userId,
                    status: addResult.status,
                    confidence: addResult.confidence,
                    timestamp: addResult.timestamp,
                    avatarUri: addResult.avatarUri,
                    direction: scanDirection,
                  };
                  dispatch(
                    recordAttendance({
                      ...addAttPayload,
                      boundingBox: addResult.boundingBox,
                    }),
                  );
                  if (
                    activeSessionId &&
                    addResult.userId &&
                    addResult.userId !== 'unverified-unknown'
                  ) {
                    attendanceService
                      .recordAttendance(addAttPayload)
                      .catch(err => {
                        console.log(
                          '[TabletDetector] Failed to sync multi-attendance to BE:',
                          err,
                        );
                      });
                  }
                  const prevAddAtt =
                    attendanceMapRef.current?.[addResult.userId];
                  if (!prevAddAtt || prevAddAtt.status !== 'present') {
                    const isAddVisitor = addMatched?.isVisitor;
                    const addVisitorTag =
                      isAddVisitor && addMatched?.visitedProfile?.fullName
                        ? ` [Khách thăm: ${addMatched.visitedProfile.fullName}]`
                        : isAddVisitor
                        ? ' [Khách thăm]'
                        : '';
                    const isOut = scanDirection === 'out';
                    const alertPayload = {
                      title:
                        scanMode === 'all'
                          ? isOut
                            ? 'Xác nhận ra cơ sở'
                            : 'Xác nhận vào cơ sở'
                          : isAddVisitor
                          ? 'Thân nhân'
                          : isOut
                          ? 'Điểm danh RA thành công'
                          : 'Điểm danh VÀO thành công',
                      message:
                        scanMode === 'all'
                          ? `${addResult.fullName} (${
                              addResult.code
                            }) đã xác nhận ${
                              isOut ? 'ra khỏi' : 'vào'
                            } cơ sở [${addDept}] với độ tin cậy ${
                              addResult.confidence
                            }%`
                          : `${addResult.fullName} (${
                              addResult.code
                            })${addVisitorTag} đã điểm danh ${
                              isOut ? 'RA' : 'VÀO'
                            } với độ tin cậy ${addResult.confidence}%`,
                      timestamp: addResult.timestamp,
                      type: 'info' as const,
                    };
                    dispatch(addAlert(alertPayload));
                    alertService.createAlert(alertPayload).catch(err => {
                      console.log(
                        '[TabletDetector] Failed to sync alert to BE:',
                        err,
                      );
                    });
                  }
                }
              }

              // If a stranger is also detected in the same frame alongside the enrolled user
              if (realResult.hasUnverifiedStranger) {
                dispatch(
                  recordScanEvent({
                    userId: `stranger_${Date.now()}`,
                    fullName: 'Người chưa xác minh',
                    code: 'STRANGER',
                    avatarUri: undefined,
                    confidence: 50,
                    status: 'verify',
                    timestamp: realResult.timestamp,
                    scanMode,
                  }),
                );
                const lastAlert = alertsRef.current?.[0];
                const isRecentStrangerAlert =
                  lastAlert?.type === 'warning' &&
                  lastAlert?.title === 'Phát hiện người chưa xác minh';
                if (!isRecentStrangerAlert) {
                  const strangerPayload = {
                    title: 'Phát hiện người chưa xác minh',
                    message: `Phát hiện thêm người chưa có dữ liệu trong khung hình cùng ${realResult.fullName}`,
                    timestamp: realResult.timestamp,
                    type: 'warning' as const,
                  };
                  dispatch(addAlert(strangerPayload));
                  alertService.createAlert(strangerPayload).catch(err => {
                    console.log(
                      '[TabletDetector] Failed to sync stranger alert to BE:',
                      err,
                    );
                  });
                }
              }
            } else if (realResult.status === 'verify') {
              dispatch(
                recordScanEvent({
                  userId: `stranger_${Date.now()}`,
                  fullName: 'Người chưa xác minh',
                  code: 'STRANGER',
                  avatarUri: realResult.avatarUri,
                  confidence: realResult.confidence,
                  status: 'verify',
                  timestamp: realResult.timestamp,
                  scanMode,
                }),
              );
              const lastAlert = alertsRef.current?.[0];
              const isRecentUnknownAlert =
                lastAlert?.type === 'warning' &&
                lastAlert?.title === 'Khuôn mặt chưa khớp';
              if (!isRecentUnknownAlert) {
                const warnPayload = {
                  title: 'Khuôn mặt chưa khớp',
                  message: `Phát hiện đối tượng chưa khớp với danh sách (độ khớp: ${realResult.confidence}%)`,
                  timestamp: realResult.timestamp,
                  type: 'warning' as const,
                };
                dispatch(addAlert(warnPayload));
                alertService.createAlert(warnPayload).catch(err => {
                  console.log(
                    '[TabletDetector] Failed to sync alert to BE:',
                    err,
                  );
                });
              }
            }

            // Face is actively tracked: fast chained scan (80ms) for high-FPS, butter-smooth tracking
            scheduleNextScan(80);
          } else {
            // Debounce 2 consecutive missed frames before clearing active detection
            consecutiveMissedFramesRef.current += 1;
            if (consecutiveMissedFramesRef.current >= 2) {
              dispatch(setActiveDetection(null));
            }
            // No face in current frame: moderate delay (200ms) to save CPU/battery
            scheduleNextScan(200);
          }
        } else {
          consecutiveMissedFramesRef.current += 1;
          if (consecutiveMissedFramesRef.current >= 2) {
            dispatch(setActiveDetection(null));
          }
          scheduleNextScan(250);
        }
      } catch (err) {
        console.warn('[TabletDetectorScreen] auto-scan error:', err);
        scheduleNextScan(350);
      } finally {
        isScanningRef.current = false;
      }
    },
    [
      activeSessionId,
      targetProfiles,
      cameraFacing,
      dispatch,
      scheduleNextScan,
      scanMode,
      scanDirection,
      selectedRoomId,
      selectedZoneId,
      rooms,
      zones,
    ],
  );
  handleScanDetectionRef.current = handleScanDetection;

  // Reactive YOLO face scanning loop when session is active
  useEffect(() => {
    if (!isSessionActive || !isTabFocused) {
      if (scanLoopTimerRef.current) {
        clearTimeout(scanLoopTimerRef.current);
        scanLoopTimerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      handleScanDetection();
    }, 350);

    return () => {
      clearTimeout(timer);
      if (scanLoopTimerRef.current) {
        clearTimeout(scanLoopTimerRef.current);
        scanLoopTimerRef.current = null;
      }
    };
  }, [isSessionActive, isTabFocused, handleScanDetection]);

  const handleOpenStartSession = () => {
    if (scanMode === 'room' && (!selectedRoom || !selectedRoom.id)) {
      showWarnToast(
        'Chưa chọn phòng',
        'Vui lòng tạo hoặc chọn phòng trước khi bắt đầu phiên quét theo phòng!',
      );
      setManageRoomsVisible(true);
      return;
    }
    setStartSessionModalVisible(true);
  };

  const handleStartSessionConfirm = async (sessionName: string) => {
    setStartSessionModalVisible(false);
    try {
      const isRoomMode = scanMode === 'room';
      const payload = {
        name: sessionName,
        roomId: isRoomMode ? selectedRoom?.id : selectedRoom?.id || undefined,
        roomName: isRoomMode ? selectedRoom?.name : 'Toàn cơ sở',
        zoneId: isRoomMode ? selectedZone?.id : undefined,
        zoneName: isRoomMode ? selectedZone?.name : 'Toàn cơ sở',
        startTime: new Date().toISOString(),
      };
      const res = await sessionService.startSession(payload);
      const beId = res?.data?.id;
      dispatch(startSession({ id: beId, name: sessionName, scanMode }));
      showSuccessToast(
        'Bắt đầu phiên',
        `Đã khởi tạo phiên trên hệ thống: ${sessionName}`,
      );
    } catch (err: any) {
      console.log(
        '[TabletDetectorScreen] BE start session error, running offline session:',
        err?.message || err,
      );
      dispatch(startSession({ name: sessionName, scanMode }));
      showSuccessToast(
        'Bắt đầu phiên (Offline)',
        `Đang chạy phiên cục bộ: ${sessionName}`,
      );
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'Kết thúc phiên quét',
      'Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Kết thúc',
          style: 'destructive',
          onPress: () => {
            if (activeSessionId) {
              sessionService
                .endSession(activeSessionId, new Date().toISOString())
                .catch(err => {
                  console.log(
                    '[TabletDetector] Failed to end session on BE:',
                    err,
                  );
                });
            }
            dispatch(endSession());
            showSuccessToast('Kết thúc phiên', 'Phiên quét đã được hoàn tất!');
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

  const roomPickerItems = [
    {
      id: 'all_mode_option',
      label: 'Tất cả phòng ban (Quét All - Vào cơ sở)',
      subtitle: `Xác nhận vào cơ sở (${(userProfiles || []).length} nhân sự)`,
    },
    ...(rooms || [])
      .filter(r => r.zoneId === selectedZoneId)
      .map(r => ({
        id: r.id,
        label: r.name,
        subtitle: `Sức chứa ${r.capacity || 30} người`,
      })),
  ];

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
        onOpenDeviceInfo={() => setDeviceInfoModalVisible(true)}
      />

      {/* 2. Main Body: Responsive Tablet Landscape vs Mobile Portrait */}
      {isPhone ? (
        <ScrollView
          style={styles.phoneMainContainer}
          contentContainerStyle={styles.phoneScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScanDirectionToggle
            value={scanDirection}
            onChange={d => dispatch(setScanDirection(d))}
          />
          {/* Camera View */}
          <View style={[styles.phoneCameraWrap, { height: phoneCameraHeight }]}>
            <CameraViewFinder
              ref={cameraViewFinderRef}
              boundingBox={activeDetection?.boundingBox}
              detection={activeDetection}
              isSessionActive={isSessionActive}
              onManualScan={photoPath => handleScanDetection(photoPath)}
              cameraFacing={cameraFacing}
              isTabFocused={isTabFocused}
              onEnrollStranger={handleEnrollStranger}
            />
          </View>

          {/* Session Summary Bar */}
          <SessionSummaryBar
            isSessionActive={isSessionActive}
            sessionDurationSeconds={sessionDurationSeconds}
            scanHistory={scanHistory}
            scanMode={scanMode}
            totalMembersCount={targetProfiles.length}
            scanDirection={scanDirection}
          />

          {/* Quick List & Sessions History & Alerts Actions */}
          <BottomActions
            onOpenList={() => setListModalVisible(true)}
            onOpenSessionsHistory={() => setSessionsHistoryVisible(true)}
            onOpenAlerts={() => setAlertsModalVisible(true)}
            unreadAlertsCount={
              (alerts || []).filter(a => a.type === 'warning').length
            }
          />

          {/* Scanned Results List */}
          <ScannedResultsList
            scanHistory={scanHistory}
            activeDetection={activeDetection}
            isSessionActive={isSessionActive}
            scanMode={scanMode}
            scanDirection={scanDirection}
            onEnrollStranger={handleEnrollStranger}
          />

          {/* Session Controls */}
          <SessionControls
            onStartSession={handleOpenStartSession}
            onEndSession={handleEndSession}
            isSessionActive={isSessionActive}
            scanMode={scanMode}
            sessionDurationSeconds={sessionDurationSeconds}
          />
        </ScrollView>
      ) : (
        <View style={styles.mainContainer}>
          {/* Left Column: Camera + Session Summary (Duration timer, KPIs, Department breakdown) + Actions */}
          <View style={styles.leftColumn}>
            <ScanDirectionToggle
              value={scanDirection}
              onChange={d => dispatch(setScanDirection(d))}
            />
            <CameraViewFinder
              ref={cameraViewFinderRef}
              boundingBox={activeDetection?.boundingBox}
              detection={activeDetection}
              isSessionActive={isSessionActive}
              onManualScan={photoPath => handleScanDetection(photoPath)}
              cameraFacing={cameraFacing}
              isTabFocused={isTabFocused}
              onEnrollStranger={handleEnrollStranger}
            />

            <SessionSummaryBar
              isSessionActive={isSessionActive}
              sessionDurationSeconds={sessionDurationSeconds}
              scanHistory={scanHistory}
              scanMode={scanMode}
              totalMembersCount={targetProfiles.length}
              scanDirection={scanDirection}
            />

            <BottomActions
              onOpenList={() => setListModalVisible(true)}
              onOpenSessionsHistory={() => setSessionsHistoryVisible(true)}
              onOpenAlerts={() => setAlertsModalVisible(true)}
              unreadAlertsCount={
                (alerts || []).filter(a => a.type === 'warning').length
              }
            />
          </View>

          {/* Right Column: Scanned Results List (IN/OUT, verified/unverified, dept tag) + Session Controls */}
          <View style={styles.rightColumn}>
            <ScannedResultsList
              scanHistory={scanHistory}
              activeDetection={activeDetection}
              isSessionActive={isSessionActive}
              scanMode={scanMode}
              scanDirection={scanDirection}
              onEnrollStranger={handleEnrollStranger}
            />

            <SessionControls
              onStartSession={handleOpenStartSession}
              onEndSession={handleEndSession}
              isSessionActive={isSessionActive}
              scanMode={scanMode}
              sessionDurationSeconds={sessionDurationSeconds}
            />
          </View>
        </View>
      )}

      {/* Start Session Modal (invoked from SessionControls or HeaderBar) */}
      <StartSessionModal
        visible={startSessionModalVisible}
        scanMode={scanMode}
        roomName={
          scanMode === 'all'
            ? 'Tất cả phòng ban'
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
        memberCount={
          scanMode === 'all'
            ? (userProfiles || []).length
            : selectedRoom
            ? (userProfiles || []).filter(u => u.roomId === selectedRoom.id)
                .length
            : 0
        }
        onClose={() => setStartSessionModalVisible(false)}
        onStart={handleStartSessionConfirm}
      />

      <AddUserModal
        visible={addUserVisible}
        initialPhotoUri={enrollStrangerPhotoUri}
        initialFullName={enrollStrangerFullName}
        onClose={() => {
          setAddUserVisible(false);
          setEnrollStrangerPhotoUri(null);
          setEnrollStrangerFullName('');
        }}
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
        title="Chọn Phòng / Chế độ quét"
        items={roomPickerItems}
        selectedId={scanMode === 'all' ? 'all_mode_option' : selectedRoomId}
        onSelect={id => {
          if (id === 'all_mode_option') {
            dispatch(setScanMode('all'));
          } else {
            dispatch(setScanMode('room'));
            dispatch(setSelectedRoomId(id));
          }
        }}
        onClose={() => setRoomPickerVisible(false)}
      />

      <ManageRoomsModal
        visible={manageRoomsVisible}
        onClose={() => setManageRoomsVisible(false)}
      />

      {/* Sessions History Modal */}
      <SessionsHistoryModal
        visible={sessionsHistoryVisible}
        sessions={sessions || []}
        onClose={() => setSessionsHistoryVisible(false)}
        onSelectSession={sess => {
          setSessionsHistoryVisible(false);
          setSelectedDetailSession(sess);
        }}
      />

      {/* Session Details Modal */}
      <SessionDetailModal
        visible={Boolean(selectedDetailSession)}
        session={selectedDetailSession}
        userProfiles={userProfiles}
        rooms={rooms}
        zones={zones}
        onClose={() => setSelectedDetailSession(null)}
      />

      {/* Device Identity & Lock Modal */}
      <DeviceInfoModal
        visible={isDeviceAuthorized === false || deviceInfoModalVisible}
        isLocked={isDeviceAuthorized === false}
        lockMessage={deviceLockMessage}
        onClose={() => setDeviceInfoModalVisible(false)}
        onUnlocked={() => {
          setDeviceInfoModalVisible(false);
        }}
      />

      {/* Screen-wide Touch Blocking Overlay when Device is Unauthorized */}
      {isDeviceAuthorized === false && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998 },
          ]}
          pointerEvents="auto"
        />
      )}
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
    flex: 1.2,
    flexDirection: 'column',
    gap: 10,
  },
  rightColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 10,
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
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
