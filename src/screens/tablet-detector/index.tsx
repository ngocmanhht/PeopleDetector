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
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
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
import { FaceSyncModal } from './components/FaceSyncModal';
import { AttendanceSession } from '../../model/detector';
import { KioskExitModal } from './components/KioskExitModal';
import { kioskService } from '../../services/kiosk-service';
import { PickerModal } from './components/PickerModal';
import { ManageRoomsModal } from './components/ManageRoomsModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addAlert,
  clearMockData,
  endSession,
  recordAttendance,
  recordScanEvent,
  convertStrangerToUser,
  setActiveDetection,
  setSelectedRoomId,
  setSelectedZoneId,
  setScanMode,
  setScanDirection,
  startSession,
  tickSessionDuration,
  setDeviceAuthorized,
  resetAttendanceMap,
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
import { deleteTempFile } from '../../utils/file-cleaner';
import {
  PermissionDeniedModal,
  PermissionDeniedType,
} from '../../components/permission-denied-modal';

interface TabletDetectorScreenProps {
  isTabFocused?: boolean;
}

const TabletDetectorScreen: React.FC<TabletDetectorScreenProps> = ({
  isTabFocused = true,
}) => {
  const { isPhone, isLandscape } = useResponsive();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);

  // Exact 50% width for Camera (2 parts) and 25% for other 2 columns (1 part each)
  // padding 12*2 = 24, 2 gaps of 12 = 24 => total spacing = 48
  const activeW = containerWidth > 0 ? containerWidth : windowWidth;
  const availableContentW = Math.max(0, activeW - 48);
  const cameraWidth = Math.floor(availableContentW * 0.5);
  const sideColWidth = Math.floor(availableContentW * 0.25);

  // Camera điện thoại cao ~50% màn hình (giới hạn 340–520)
  const phoneCameraHeight = Math.round(
    Math.min(520, Math.max(340, windowHeight * 0.5)),
  );
  const { showSuccessToast, showWarnToast } = useAppToast();
  const dispatch = useAppDispatch();
  const cameraViewFinderRef = useRef<CameraViewFinderRef>(null);

  const zones = useAppSelector(state => state.detector.zones);
  const rooms = useAppSelector(state => state.detector.rooms);
  const userProfiles = useAppSelector(state => state.detector.userProfiles);
  const currentUser = useAppSelector(state => state.app.currentUser);
  const isGuard = currentUser?.role === 'GUARD';
  const selectedZoneId = useAppSelector(state => state.detector.selectedZoneId);
  const selectedRoomId = useAppSelector(state => state.detector.selectedRoomId);
  const isSessionActive = useAppSelector(
    state => state.detector.isSessionActive,
  );
  const activeSessionId = useAppSelector(
    state => state.detector.activeSessionId,
  );
  const attendanceMap = useAppSelector(state => state.detector.attendanceMap);
  const activeDetection = useAppSelector(
    state => state.detector.activeDetection,
  );
  const alerts = useAppSelector(state => state.detector.alerts);
  const scanMode = useAppSelector(state => state.detector.scanMode);
  const scanDirection = useAppSelector(state => state.detector.scanDirection);
  const scanHistory = useAppSelector(state => state.detector.scanHistory);
  const sessions = useAppSelector(state => state.detector.sessions);
  const isDeviceAuthorized = useAppSelector(
    state => state.detector.isDeviceAuthorized,
  );
  const deviceLockMessage = useAppSelector(
    state => state.detector.deviceLockMessage,
  );
  const confidenceThreshold = useAppSelector(
    state => state.detector.confidenceThreshold ?? 75,
  );
  const targetFps = useAppSelector(
    state => state.detector.targetFps ?? 30,
  );
  const soundEnabled = useAppSelector(
    state => state.detector.soundEnabled ?? true,
  );
  const autoSessionReset = useAppSelector(
    state => state.detector.autoSessionReset ?? false,
  );

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
  const [enrollStrangerId, setEnrollStrangerId] = useState<string | null>(null);

  // Face Embeddings Sync Progress Modal States
  const [faceSyncModalVisible, setFaceSyncModalVisible] = useState(false);
  const [faceSyncProgress, setFaceSyncProgress] = useState({
    current: 0,
    total: 0,
    profileName: '',
  });

  // Permission Denied Modal State
  const [deniedModal, setDeniedModal] = useState<{
    visible: boolean;
    type: PermissionDeniedType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'general',
    title: '',
    message: '',
  });
  const [isFaceDataReady, setIsFaceDataReady] = useState(false);

  // Role Enforcement: Officer chỉ có quyền điểm danh theo phòng thuộc khu được giao
  const isOfficer = currentUser?.role === 'OFFICER';
  useEffect(() => {
    if (isOfficer) {
      if (scanMode !== 'room') {
        dispatch(setScanMode('room'));
      }
      if (currentUser?.zoneId) {
        if (selectedZoneId !== currentUser.zoneId) {
          dispatch(setSelectedZoneId(currentUser.zoneId));
        }
        const validRooms = (rooms || []).filter(
          r => r.zoneId === currentUser.zoneId,
        );
        const isRoomValid = validRooms.some(r => r.id === selectedRoomId);
        if (!isRoomValid && validRooms.length > 0) {
          dispatch(setSelectedRoomId(validRooms[0].id));
        }
      }
    }
  }, [
    isOfficer,
    scanMode,
    selectedZoneId,
    selectedRoomId,
    currentUser?.zoneId,
    rooms,
    dispatch,
  ]);

  // Role Enforcement: Guard chỉ điểm danh ra vào toàn cơ sở (chế độ all)
  useEffect(() => {
    if (isGuard) {
      if (scanMode !== 'all') {
        dispatch(setScanMode('all'));
      }
    }
  }, [isGuard, scanMode, dispatch]);

  // Kiosk Mode States
  const [kioskExitModalVisible, setKioskExitModalVisible] = useState(false);
  const [isKioskActive, setIsKioskActive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const initKiosk = async () => {
      const active = await kioskService.isKioskModeActive();
      if (!isMounted) return;
      setIsKioskActive(active);

      // Auto start kiosk mode on tablet if enabled
      if (!active && !isPhone && kioskService.isAutoKioskEnabled()) {
        const ok = await kioskService.startKioskMode();
        if (isMounted && ok) {
          setIsKioskActive(true);
        }
      }
    };
    initKiosk();
    return () => {
      isMounted = false;
    };
  }, [isPhone]);

  const handleToggleKiosk = useCallback(async () => {
    if (isKioskActive) {
      setKioskExitModalVisible(true);
    } else {
      const started = await kioskService.startKioskMode();
      if (started) {
        setIsKioskActive(true);
        showSuccessToast(
          'Đã kích hoạt Kiosk Mode',
          'Thiết bị đã vào chế độ ghim màn hình chuyên dụng.',
        );
      } else {
        showWarnToast(
          'Chưa kích hoạt Kiosk Mode',
          'Vui lòng cấp quyền Device Owner qua ADB hoặc xác nhận trên máy tính bảng.',
        );
      }
    }
  }, [isKioskActive, showSuccessToast, showWarnToast]);

  const handleKioskExitSuccess = useCallback(() => {
    setIsKioskActive(false);
  }, []);

  const handleEnrollStranger = useCallback(
    (photoUri?: string, defaultName?: string, strangerId?: string) => {
      setEnrollStrangerPhotoUri(photoUri || null);
      setEnrollStrangerFullName(
        defaultName &&
          defaultName !== 'Người chưa xác minh' &&
          defaultName !== 'Người lạ'
          ? defaultName
          : '',
      );
      setEnrollStrangerId(strangerId || null);
      setAddUserVisible(true);
    },
    [],
  );

  // Camera Facing
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  const availableZones =
    isOfficer && currentUser?.zoneId
      ? (zones || []).filter(z => z.id === currentUser.zoneId)
      : zones || [];
  const selectedZone =
    availableZones.find(z => z.id === selectedZoneId) || availableZones[0];
  const effectiveZoneId =
    selectedZoneId || selectedZone?.id || availableZones[0]?.id || '';

  const roomsInSelectedZone = (rooms || []).filter(
    r => r.zoneId === effectiveZoneId,
  );
  const selectedRoom =
    roomsInSelectedZone.find(r => r.id === selectedRoomId) ||
    roomsInSelectedZone[0];
  const effectiveRoomId =
    selectedRoom?.id || selectedRoomId || roomsInSelectedZone[0]?.id || '';

  // 1. Lấy tất cả ID phòng thuộc khu vực đang chọn
  const roomIdsInZone = useMemo(
    () =>
      new Set(
        (rooms || []).filter(r => r.zoneId === effectiveZoneId).map(r => r.id),
      ),
    [rooms, effectiveZoneId],
  );

  // 2. Gộp nhân sự cả khu (tất cả học viên thuộc các phòng trong khu + trực thuộc khu + khách thăm)
  const currentZoneUsers = useMemo(() => {
    if (!effectiveZoneId) return [];
    return (userProfiles || []).filter(u => {
      if (u.zoneId === effectiveZoneId) return true;
      if (u.roomId && roomIdsInZone.has(u.roomId)) return true;
      if (u.isVisitor && u.visitedProfileId) {
        const visitedUser = (userProfiles || []).find(
          v => v.id === u.visitedProfileId,
        );
        return (
          visitedUser &&
          (visitedUser.zoneId === effectiveZoneId ||
            roomIdsInZone.has(visitedUser.roomId))
        );
      }
      return false;
    });
  }, [userProfiles, effectiveZoneId, roomIdsInZone]);

  // Filter users by selected room (including visitors visiting members in this room)
  const currentRoomUsers = useMemo(
    () =>
      (userProfiles || []).filter(u => {
        if (!effectiveRoomId) return false;
        if (u.roomId === effectiveRoomId) return true;
        if (u.isVisitor && u.visitedProfileId) {
          const visitedUser = (userProfiles || []).find(
            v => v.id === u.visitedProfileId,
          );
          return visitedUser?.roomId === effectiveRoomId;
        }
        return false;
      }),
    [userProfiles, effectiveRoomId],
  );

  // Target profiles: in 'all' mode match against all facility profiles, in 'zone' match zone profiles, in 'room' match room profiles
  const targetProfiles = useMemo(() => {
    if (scanMode === 'all') return userProfiles || [];
    if (scanMode === 'zone') return currentZoneUsers;
    return currentRoomUsers;
  }, [scanMode, userProfiles, currentZoneUsers, currentRoomUsers]);

  // Clear legacy mock data once on mount if present
  useEffect(() => {
    dispatch(clearMockData());
  }, [dispatch]);

  // Tự động làm mới điểm danh khi đổi phòng nếu bật autoSessionReset
  const prevRoomIdRef = useRef(effectiveRoomId);
  useEffect(() => {
    if (
      autoSessionReset &&
      prevRoomIdRef.current &&
      prevRoomIdRef.current !== effectiveRoomId
    ) {
      console.log(
        '[TabletDetector] Auto resetting attendance session due to room switch:',
        prevRoomIdRef.current,
        '->',
        effectiveRoomId,
      );
      dispatch(resetAttendanceMap());
    }
    prevRoomIdRef.current = effectiveRoomId;
  }, [effectiveRoomId, autoSessionReset, dispatch]);

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
      } catch (err: unknown) {
        if (isMounted) {
          const msg = (err as Error)?.message || 'Không thể xác thực thiết bị';
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
    let isCancelled = false;
    YoloDetectorService.initialize().then(async ready => {
      console.log('[TabletDetectorScreen] YOLO Engine ready:', ready);
      if (ready && targetProfiles.length > 0) {
        setIsFaceDataReady(false);
        setFaceSyncProgress({
          current: 0,
          total: targetProfiles.length,
          profileName: targetProfiles[0]?.fullName || '',
        });
        setFaceSyncModalVisible(true);

        await YoloDetectorService.warmupRoomEmbeddings(
          targetProfiles,
          (current, total, profileName) => {
            if (isCancelled) return;
            setFaceSyncProgress({
              current,
              total,
              profileName: profileName || '',
            });
          },
        );

        if (!isCancelled) {
          setIsFaceDataReady(true);
          // Cho phép xem hoàn thành 100% trong 600ms rồi đóng mượt mà
          setTimeout(() => {
            if (!isCancelled) {
              setFaceSyncModalVisible(false);
            }
          }, 600);
        }
      } else {
        setIsFaceDataReady(true);
      }
    });

    return () => {
      isCancelled = true;
    };
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

  // Thermal Power Management & Network Throttle refs
  const lastAttendanceSyncedTimeRef = useRef<Record<string, number>>({});
  const lastFaceSeenTimestampRef = useRef<number>(Date.now());

  // Periodically flush any queued offline scans when network is restored
  useEffect(() => {
    const flushInterval = setInterval(() => {
      attendanceService.flushOfflineQueue().catch(() => {});
    }, 20000);
    return () => clearInterval(flushInterval);
  }, []);

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
      if (!isFaceDataReady && YoloDetectorService.isWarmingUp()) {
        scheduleNextScan(400);
        return;
      }
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      let photoPath = providedPhotoPath;
      try {
        // 1. Capture real frame from Camera hardware if available
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
            confidenceThreshold,
          );

          if (realResult) {
            consecutiveMissedFramesRef.current = 0;

            // Face Quality Gate: if frame is blurry or angle is partial/extreme, guide user without recording attendance
            if (realResult.qualityWarning) {
              dispatch(setActiveDetection(realResult));
              lastFaceSeenTimestampRef.current = Date.now();
              const activeTrackDelay = Math.max(
                16,
                Math.round(1000 / Math.max(15, targetFps)),
              );
              scheduleNextScan(activeTrackDelay);
              return;
            }

            // Lookup room and zone details for the detected user
            const matchedProfile = targetProfiles.find(
              u => u.id === realResult.userId,
            );

            const isVisitor = Boolean(matchedProfile?.isVisitor);
            const visitedProfileName =
              matchedProfile?.visitedProfile?.fullName || undefined;

            const userRoomId =
              matchedProfile?.roomId ||
              (scanMode === 'room' ? selectedRoomId : undefined);
            const userZoneId =
              matchedProfile?.zoneId ||
              (scanMode === 'room' ? selectedZoneId : undefined);
            const userRoom = rooms.find(r => r.id === userRoomId);
            const userZone = zones.find(z => z.id === userZoneId);
            const deptName = userRoom?.name || (isVisitor ? 'Khách thăm' : 'Toàn cơ sở');

            // Record into Redux scanHistory list with IN/OUT timestamps & scan counts
            dispatch(
              recordScanEvent({
                userId: realResult.userId,
                fullName: realResult.fullName,
                code: realResult.code,
                roomId: userRoom?.id,
                roomName: isVisitor
                  ? `Khách thăm (${visitedProfileName ? `gặp ${visitedProfileName}` : 'Thân nhân'})`
                  : userRoom?.name,
                zoneId: userZone?.id,
                zoneName: userZone?.name,
                avatarUri: realResult.avatarUri,
                confidence: realResult.confidence,
                status: realResult.status,
                timestamp: realResult.timestamp,
                scanMode,
                direction: scanDirection,
                isVisitor,
                visitedProfileName,
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

            // Cooldown 5s per user to prevent high-frequency request flooding
            const now = Date.now();
            const lastSyncTime =
              lastAttendanceSyncedTimeRef.current[realResult.userId] || 0;
            const COOLDOWN_SYNC_MS = 5000;

            if (
              realResult.userId &&
              realResult.userId !== 'unverified-unknown' &&
              now - lastSyncTime > COOLDOWN_SYNC_MS
            ) {
              lastAttendanceSyncedTimeRef.current[realResult.userId] = now;
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
                if (soundEnabled) {
                  Vibration.vibrate(80);
                }
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
                  const nowAdd = Date.now();
                  const lastAddSyncTime =
                    lastAttendanceSyncedTimeRef.current[addResult.userId] || 0;
                  if (
                    addResult.userId &&
                    addResult.userId !== 'unverified-unknown' &&
                    nowAdd - lastAddSyncTime > COOLDOWN_SYNC_MS
                  ) {
                    lastAttendanceSyncedTimeRef.current[addResult.userId] =
                      nowAdd;
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
                    if (soundEnabled) {
                      Vibration.vibrate(80);
                    }
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
                    fullName: 'Người chưa xác minh',
                    code: 'STRANGER',
                    avatarUri: undefined,
                    confidence: 50,
                    status: 'verify',
                    timestamp: realResult.timestamp,
                    scanMode,
                    direction: scanDirection,
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
                  userId: realResult.userId,
                  fullName: realResult.fullName,
                  code: realResult.code,
                  avatarUri: realResult.avatarUri,
                  confidence: realResult.confidence,
                  status: 'verify',
                  timestamp: realResult.timestamp,
                  scanMode,
                  direction: scanDirection,
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

            // Face is actively tracked: update timestamp and dynamic scan delay based on targetFps
            lastFaceSeenTimestampRef.current = Date.now();
            const activeTrackDelay = Math.max(
              16,
              Math.round(1000 / Math.max(15, targetFps)),
            );
            scheduleNextScan(activeTrackDelay);
          } else {
            // Debounce 2 consecutive missed frames before clearing active detection
            consecutiveMissedFramesRef.current += 1;
            if (consecutiveMissedFramesRef.current >= 2) {
              dispatch(setActiveDetection(null));
            }
            // Dynamic Idle Power Management:
            // If room is empty for > 10s, throttle down to 1 FPS (1000ms) to cool CPU/GPU and prevent thermal throttling
            const idleTime = Date.now() - lastFaceSeenTimestampRef.current;
            if (idleTime > 10000) {
              scheduleNextScan(1000); // 1 FPS deep idle to keep tablet cool
            } else if (idleTime > 3000) {
              scheduleNextScan(Math.max(200, Math.round(8000 / targetFps))); // 2.5 FPS transition
            } else {
              scheduleNextScan(Math.max(40, Math.round(2000 / targetFps))); // Fast search
            }
          }
        } else {
          consecutiveMissedFramesRef.current += 1;
          if (consecutiveMissedFramesRef.current >= 2) {
            dispatch(setActiveDetection(null));
          }
          const idleTime = Date.now() - lastFaceSeenTimestampRef.current;
          if (idleTime > 10000) {
            scheduleNextScan(1000);
          } else {
            scheduleNextScan(Math.max(50, Math.round(2500 / targetFps)));
          }
        }
      } catch (err) {
        console.warn('[TabletDetectorScreen] auto-scan error:', err);
        scheduleNextScan(Math.max(100, Math.round(3000 / targetFps)));
      } finally {
        if (photoPath) {
          deleteTempFile(photoPath).catch(() => {});
        }
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
      confidenceThreshold,
      targetFps,
      soundEnabled,
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
    if (!isGuard && scanMode === 'zone' && (!selectedZone || !selectedZone.id)) {
      showWarnToast(
        'Chưa chọn khu vực',
        'Vui lòng chọn khu vực trước khi bắt đầu phiên quét theo khu!',
      );
      setZonePickerVisible(true);
      return;
    }
    if (!isGuard && scanMode === 'room' && (!selectedRoom || !selectedRoom.id)) {
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
    YoloDetectorService.clearStrangerCache();
    try {
      const finalScanMode = isGuard ? 'all' : scanMode;
      const finalSessionName = isGuard
        ? sessionName || `Điểm danh ra vào cơ sở - ${dayjs().format('DD/MM/YYYY HH:mm')}`
        : sessionName;
      const isZoneMode = finalScanMode === 'zone';
      const isRoomMode = finalScanMode === 'room';
      const actualRoomId = isRoomMode
        ? selectedRoom?.id || effectiveRoomId
        : undefined;
      const actualZoneId =
        isRoomMode || isZoneMode
          ? selectedZone?.id || effectiveZoneId
          : undefined;

      // 1. Phân quyền: Cán bộ khu vực chỉ được mở phiên thuộc khu vực mình quản lý
      if (
        isOfficer &&
        currentUser?.zoneId &&
        actualZoneId &&
        actualZoneId !== currentUser.zoneId
      ) {
        setDeniedModal({
          visible: true,
          type: 'zone_restricted',
          title: 'Khu vực không thuộc thẩm quyền',
          message:
            'Tài khoản Cán bộ khu vực chỉ được phép mở phiên điểm danh cho các phòng thuộc khu vực được phân công quản lý.',
        });
        return;
      }

      const payload = {
        name: finalSessionName,
        scanMode: finalScanMode,
        roomId: actualRoomId,
        roomName: isRoomMode
          ? selectedRoom?.name
          : isZoneMode
          ? 'Theo khu vực'
          : 'Toàn cơ sở',
        zoneId: actualZoneId,
        zoneName: actualZoneId ? selectedZone?.name : 'Toàn cơ sở',
        startTime: new Date().toISOString(),
      };
      const res = await sessionService.startSession(payload);
      const beId = res?.data?.id;
      dispatch(
        startSession({
          id: beId,
          name: finalSessionName,
          scanMode: finalScanMode,
          roomId: actualRoomId,
        }),
      );
      showSuccessToast(
        'Bắt đầu',
        `Đã khởi tạo phiên trên hệ thống: ${finalSessionName}`,
      );
    } catch (err: unknown) {
      console.log(
        '[TabletDetectorScreen] BE start session error:',
        (err as Error)?.message || err,
      );
      const errMsg = (err as Error)?.message || 'Lỗi khởi tạo phiên điểm danh';
      const isForbidden =
        errMsg.includes('403') ||
        errMsg.includes('Thiết bị') ||
        errMsg.includes('DEVICE_UNAUTHORIZED') ||
        errMsg.includes('DEVICE_ID_REQUIRED') ||
        errMsg.includes('KIOSK_DEVICE_REQUIRED') ||
        errMsg.includes('quyền') ||
        errMsg.includes('phân công') ||
        errMsg.includes('cho phép');

      if (isForbidden) {
        const isDeviceBlocked =
          errMsg.includes('Thiết bị') ||
          errMsg.includes('DEVICE_UNAUTHORIZED') ||
          errMsg.includes('DEVICE_ID_REQUIRED') ||
          errMsg.includes('KIOSK');
        if (isDeviceBlocked) {
          dispatch(
            setDeviceAuthorized({
              authorized: false,
              message: errMsg,
            }),
          );
        } else {
          setDeniedModal({
            visible: true,
            type: 'role_forbidden',
            title: 'Tài khoản không được phép',
            message: errMsg,
          });
        }
        return; // KHÔNG tự ý chạy phiên offline khi bị từ chối quyền!
      }

      // Chỉ chạy phiên ngoại tuyến khi gặp sự cố mạng thuần túy
      const isRoomMode = scanMode === 'room';
      const actualRoomId = isRoomMode
        ? selectedRoom?.id || effectiveRoomId
        : undefined;
      dispatch(
        startSession({
          name: sessionName,
          scanMode,
          roomId: actualRoomId,
        }),
      );
      showWarnToast(
        'Bắt đầu (Mất kết nối)',
        `Đang chạy phiên cục bộ offline: ${sessionName}`,
      );
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'Kết thúc quét',
      'Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Kết thúc',
          style: 'destructive',
          onPress: async () => {
            if (activeSessionId) {
              try {
                await sessionService.endSession(
                  activeSessionId,
                  new Date().toISOString(),
                );
              } catch (err: unknown) {
                console.log(
                  '[TabletDetector] Failed to end session on BE:',
                  err,
                );
                const errMsg = (err as Error)?.message || '';
                const isForbidden =
                  errMsg.includes('403') ||
                  errMsg.includes('DEVICE_UNAUTHORIZED') ||
                  errMsg.includes('KIOSK_DEVICE_REQUIRED') ||
                  errMsg.includes('quyền') ||
                  errMsg.includes('cho phép');
                if (isForbidden) {
                  setDeniedModal({
                    visible: true,
                    type: 'device_unauthorized',
                    title: 'Không thể kết thúc phiên trên máy chủ',
                    message:
                      errMsg ||
                      'Chỉ thiết bị máy quét điểm danh chuyên dụng (KIOSK) đã được phê duyệt mới được phép kết thúc phiên.',
                  });
                  return;
                }
              }
            }
            dispatch(endSession());
            showSuccessToast('Kết thúc phiên', 'Phiên quét đã được hoàn tất!');
          },
        },
      ],
    );
  };

  const zonePickerItems = availableZones.map(z => ({
    id: z.id,
    label: z.name,
    subtitle: z.description,
  }));

  const roomPickerItems = isGuard
    ? [
        {
          id: 'all_mode_option',
          label: 'Toàn cơ sở (Quét All - Ra/Vào cơ sở)',
          subtitle: `Điểm danh ra vào cổng cơ sở (${(userProfiles || []).length} nhân sự)`,
        },
      ]
    : isOfficer
    ? roomsInSelectedZone.map(r => ({
        id: r.id,
        label: r.name,
        subtitle: `Sức chứa ${r.capacity || 30} người`,
      }))
    : [
        {
          id: 'all_mode_option',
          label: 'Tất cả phòng ban (Quét All - Vào cơ sở)',
          subtitle: `Xác nhận vào cơ sở (${(userProfiles || []).length} nhân sự)`,
        },
        ...(roomsInSelectedZone.length > 0 ? roomsInSelectedZone : rooms || []).map(r => ({
          id: r.id,
          label: r.name,
          subtitle: `Sức chứa ${r.capacity || 30} người`,
        })),
      ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden={isKioskActive} barStyle="dark-content" />

      {/* 1. Header Bar */}
      <HeaderBar
        onOpenManageRooms={() => setManageRoomsVisible(true)}
        onToggleCamera={() =>
          setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'))
        }
        onSelectZone={() => setZonePickerVisible(true)}
        onSelectRoom={() => setRoomPickerVisible(true)}
        onOpenDeviceInfo={() => setDeviceInfoModalVisible(true)}
        onOpenKiosk={handleToggleKiosk}
        isKioskActive={isKioskActive}
      />

      {/* 2. Main Body: Responsive Tablet Landscape vs Mobile Portrait */}
      {isPhone && !isLandscape ? (
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
            scanHistory={scanHistory}
            scanMode={scanMode}
            totalMembersCount={targetProfiles.length}
            scanDirection={scanDirection}
          />

          {/* Quick List & Sessions History & Alerts Actions */}
          <BottomActions
            onOpenList={isGuard ? undefined : () => setListModalVisible(true)}
            onOpenAddUser={() => setAddUserVisible(true)}
            isGuard={isGuard}
            onOpenSessionsHistory={
              isGuard ? undefined : () => setSessionsHistoryVisible(true)
            }
            onOpenAlerts={() => setAlertsModalVisible(true)}
            unreadAlertsCount={
              (alerts || []).filter(a => a.type === 'warning').length
            }
            onOpenKioskModal={handleToggleKiosk}
            isKioskActive={isKioskActive}
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
          />
        </ScrollView>
      ) : (
        <View
          style={styles.mainContainer}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - containerWidth) > 1) {
              setContainerWidth(w);
            }
          }}
        >
          {/* 1. Camera Column: Chỉ riêng camera, chiếm đúng 50% (2 phần / 4) */}
          <View
            style={[
              styles.cameraColumn,
              cameraWidth > 0
                ? {
                    width: cameraWidth,
                    minWidth: cameraWidth,
                    maxWidth: cameraWidth,
                  }
                : { flex: 2 },
            ]}
          >
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

          {/* 2. Session Column: Quản lý phiên, Chốt quét, Thống kê, chiếm đúng 25% (1 phần / 4) */}
          <View
            style={[
              styles.sessionColumn,
              sideColWidth > 0
                ? {
                    width: sideColWidth,
                    minWidth: sideColWidth,
                    maxWidth: sideColWidth,
                  }
                : { flex: 1 },
            ]}
          >
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sessionColumnContent}
            >
              <ScanDirectionToggle
                value={scanDirection}
                onChange={d => dispatch(setScanDirection(d))}
              />

              <SessionSummaryBar
                isSessionActive={isSessionActive}
                scanHistory={scanHistory}
                scanMode={scanMode}
                totalMembersCount={targetProfiles.length}
                scanDirection={scanDirection}
              />

              <SessionControls
                onStartSession={handleOpenStartSession}
                onEndSession={handleEndSession}
                isSessionActive={isSessionActive}
                scanMode={scanMode}
              />

              <BottomActions
                onOpenList={isGuard ? undefined : () => setListModalVisible(true)}
                onOpenAddUser={() => setAddUserVisible(true)}
                isGuard={isGuard}
                onOpenSessionsHistory={
                  isGuard ? undefined : () => setSessionsHistoryVisible(true)
                }
                onOpenAlerts={() => setAlertsModalVisible(true)}
                unreadAlertsCount={
                  (alerts || []).filter(a => a.type === 'warning').length
                }
                onOpenKioskModal={handleToggleKiosk}
                isKioskActive={isKioskActive}
              />
            </ScrollView>
          </View>

          {/* 3. Results Column: Danh sách kết quả quét, chiếm đúng 25% (1 phần / 4) */}
          <View
            style={[
              styles.resultsColumn,
              sideColWidth > 0
                ? {
                    width: sideColWidth,
                    minWidth: sideColWidth,
                    maxWidth: sideColWidth,
                  }
                : { flex: 1 },
            ]}
          >
            <ScannedResultsList
              scanHistory={scanHistory}
              activeDetection={activeDetection}
              isSessionActive={isSessionActive}
              scanMode={scanMode}
              scanDirection={scanDirection}
              onEnrollStranger={handleEnrollStranger}
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
        memberCount={targetProfiles.length}
        onClose={() => setStartSessionModalVisible(false)}
        onStart={handleStartSessionConfirm}
      />

      <AddUserModal
        visible={addUserVisible}
        initialPhotoUri={enrollStrangerPhotoUri}
        initialFullName={enrollStrangerFullName}
        onUserCreated={newProfile => {
          if (enrollStrangerId) {
            dispatch(
              convertStrangerToUser({
                strangerId: enrollStrangerId,
                userProfile: newProfile,
              }),
            );
            YoloDetectorService.removeStranger(enrollStrangerId);
          }
          // Warm up biometric embedding immediately for newly enrolled user
          YoloDetectorService.enrollProfile(newProfile).catch(err => {
            console.warn(
              '[TabletDetector] Failed to pre-enroll new user embeddings:',
              err,
            );
          });
        }}
        onClose={() => {
          setAddUserVisible(false);
          setEnrollStrangerPhotoUri(null);
          setEnrollStrangerFullName('');
          setEnrollStrangerId(null);
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

      {/* Face Biometric Embeddings Sync Progress Modal */}
      <FaceSyncModal
        visible={faceSyncModalVisible}
        current={faceSyncProgress.current}
        total={faceSyncProgress.total}
        currentProfileName={faceSyncProgress.profileName}
        scanMode={scanMode}
        onDismiss={() => setFaceSyncModalVisible(false)}
      />

      {/* Kiosk Mode Exit PIN Modal */}
      <KioskExitModal
        visible={kioskExitModalVisible}
        onClose={() => setKioskExitModalVisible(false)}
        onSuccess={handleKioskExitSuccess}
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

      {/* Permission Denied Modal */}
      <PermissionDeniedModal
        visible={deniedModal.visible}
        type={deniedModal.type}
        title={deniedModal.title}
        message={deniedModal.message}
        deviceId={deviceIdService.getDeviceId()}
        userRole={currentUser?.role}
        onClose={() => setDeniedModal(prev => ({ ...prev, visible: false }))}
        onOpenDeviceInfo={() => setDeviceInfoModalVisible(true)}
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
    padding: 12,
    gap: 12,
  },
  cameraColumn: {
    flex: 2,
    height: '100%',
  },
  sessionColumn: {
    flex: 1,
    height: '100%',
  },
  sessionColumnContent: {
    gap: 10,
    paddingBottom: 16,
  },
  resultsColumn: {
    flex: 1,
    height: '100%',
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
