import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AlertLog,
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  DetectionResult,
  Room,
  ScanDirection,
  ScanEvent,
  ScanHistoryItem,
  ScanMode,
  UserProfile,
  Zone,
} from '../../model/detector';
import dayjs from 'dayjs';

export interface DetectorState {
  zones: Zone[];
  rooms: Room[];
  userProfiles: UserProfile[];
  selectedZoneId: string;
  selectedRoomId: string;
  scanMode: ScanMode; // 'all' (Quét xác nhận vào cơ sở) | 'room' (Quét theo phòng)
  scanDirection: ScanDirection; // Chốt quét hiện tại: 'in' (vào) | 'out' (ra)
  isSessionActive: boolean;
  activeSessionId: string | null;
  activeSessionName: string | null;
  sessionStartTime: string | null;
  sessionStartEpoch: number | null;
  sessionDurationSeconds: number; // Đếm giây thời gian phiên quét
  attendanceMap: Record<string, AttendanceRecord>; // key: userId
  activeDetection: DetectionResult | null;
  alerts: AlertLog[];
  sessions: AttendanceSession[];
  scanHistory: ScanHistoryItem[]; // Lịch sử các người/khuôn mặt quét được trong phiên kèm IN/OUT
  isDeviceAuthorized: boolean | null; // null = chưa kiểm tra, true = hợp lệ, false = chưa được cấp quyền/bị khóa
  deviceLockMessage: string;
  confidenceThreshold: number; // Ngưỡng % tin cậy AI (75, 80, 85, 90, 95)
  targetFps: number; // Tốc độ quét FPS (15, 30, 60)
  soundEnabled: boolean; // Bật âm thanh / rung phản hồi khi điểm danh thành công
  autoSessionReset: boolean; // Tự động làm mới điểm danh khi chuyển phòng
}

import { PHOTO_CONFIG } from '../../const/photo-config';

const initialState: DetectorState = {
  zones: [],
  rooms: [],
  userProfiles: [],
  selectedZoneId: '',
  selectedRoomId: '',
  scanMode: 'all',
  scanDirection: 'in',
  isSessionActive: false,
  activeSessionId: null,
  activeSessionName: null,
  sessionStartTime: null,
  sessionStartEpoch: null,
  sessionDurationSeconds: 0,
  attendanceMap: {},
  activeDetection: null,
  alerts: [],
  sessions: [],
  scanHistory: [],
  isDeviceAuthorized: null,
  deviceLockMessage: '',
  confidenceThreshold: 75,
  targetFps: 30,
  soundEnabled: true,
  autoSessionReset: false,
};

const detectorSlice = createSlice({
  name: 'detector',
  initialState,
  reducers: {
    setZones: (state, action: PayloadAction<Zone[]>) => {
      const remoteIds = new Set(action.payload.map(z => z.id));
      const localOnly = (state.zones || []).filter(
        z => !remoteIds.has(z.id) && z.id.startsWith('zone-'),
      );
      state.zones = [...action.payload, ...localOnly];
      const isValid = state.zones.some(z => z.id === state.selectedZoneId);
      if (!isValid && state.zones.length > 0) {
        state.selectedZoneId = state.zones[0].id;
        const roomsInZone = state.rooms.filter(r => r.zoneId === state.zones[0].id);
        if (roomsInZone.length > 0) {
          state.selectedRoomId = roomsInZone[0].id;
        }
      }
    },
    setRooms: (state, action: PayloadAction<Room[]>) => {
      const remoteIds = new Set(action.payload.map(r => r.id));
      const localOnly = (state.rooms || []).filter(
        r => !remoteIds.has(r.id) && r.id.startsWith('room-'),
      );
      state.rooms = [...action.payload, ...localOnly];
      const roomsInCurrentZone = state.selectedZoneId
        ? state.rooms.filter(r => r.zoneId === state.selectedZoneId)
        : state.rooms;
      const isValid = roomsInCurrentZone.some(r => r.id === state.selectedRoomId);
      if (!isValid && roomsInCurrentZone.length > 0) {
        state.selectedRoomId = roomsInCurrentZone[0].id;
      }
    },
    setUserProfiles: (state, action: PayloadAction<UserProfile[]>) => {
      state.userProfiles = action.payload;
    },
    setSessions: (state, action: PayloadAction<AttendanceSession[]>) => {
      // BE không lưu chiều IN/OUT nên giữ lại scanHistory cục bộ theo id phiên
      const local = new Map(
        (state.sessions || []).map(s => [s.id, s] as const),
      );
      const merged = action.payload.map(s => {
        const prev = local.get(s.id);
        return prev?.scanHistory?.length
          ? {
              ...s,
              scanHistory: prev.scanHistory,
              scanMode: s.scanMode || prev.scanMode,
              durationSeconds: s.durationSeconds ?? prev.durationSeconds,
              totalScansCount: prev.totalScansCount,
            }
          : s;
      });
      // Giữ các phiên chỉ có ở máy (chưa/không đồng bộ được lên BE)
      const remoteIds = new Set(action.payload.map(s => s.id));
      const localOnly = (state.sessions || []).filter(
        s => !remoteIds.has(s.id),
      );
      state.sessions = [...merged, ...localOnly];
    },
    setAlerts: (state, action: PayloadAction<AlertLog[]>) => {
      state.alerts = action.payload;
    },
    setSelectedZoneId: (state, action: PayloadAction<string>) => {
      state.selectedZoneId = action.payload;
      // Auto pick first room in this zone if current room is not in zone
      const roomsInZone = state.rooms.filter(r => r.zoneId === action.payload);
      if (roomsInZone.length > 0) {
        state.selectedRoomId = roomsInZone[0].id;
      }
    },
    setSelectedRoomId: (state, action: PayloadAction<string>) => {
      state.selectedRoomId = action.payload;
    },
    setScanMode: (state, action: PayloadAction<ScanMode>) => {
      state.scanMode = action.payload;
      if (action.payload === 'room') {
        const isValid = state.rooms.some(r => r.id === state.selectedRoomId);
        if (!isValid && state.rooms.length > 0) {
          const inZone = state.selectedZoneId
            ? state.rooms.find(r => r.zoneId === state.selectedZoneId)
            : null;
          state.selectedRoomId = inZone?.id || state.rooms[0].id;
        }
      }
    },
    setScanDirection: (state, action: PayloadAction<ScanDirection>) => {
      state.scanDirection = action.payload;
    },
    tickSessionDuration: state => {
      if (state.isSessionActive) {
        state.sessionDurationSeconds += 1;
      }
    },
    addZone: (
      state,
      action: PayloadAction<{
        id?: string;
        name: string;
        description?: string;
      }>,
    ) => {
      const newZone: Zone = {
        id: action.payload.id || `zone-${Date.now()}`,
        name: action.payload.name,
        description: action.payload.description,
      };
      if (!Array.isArray(state.zones)) {
        state.zones = [];
      }
      state.zones.push(newZone);
      if (!state.selectedZoneId) {
        state.selectedZoneId = newZone.id;
      }
    },
    addRoom: (
      state,
      action: PayloadAction<{
        id?: string;
        zoneId: string;
        name: string;
        capacity?: number;
      }>,
    ) => {
      const newRoom: Room = {
        id: action.payload.id || `room-${Date.now()}`,
        zoneId: action.payload.zoneId,
        name: action.payload.name,
        capacity: action.payload.capacity || 30,
      };
      if (!Array.isArray(state.rooms)) {
        state.rooms = [];
      }
      state.rooms.push(newRoom);
      if (
        !state.selectedRoomId ||
        state.selectedZoneId === action.payload.zoneId
      ) {
        state.selectedRoomId = newRoom.id;
      }
    },
    addUserProfile: (
      state,
      action: PayloadAction<Omit<UserProfile, 'id' | 'enrolledAt'>>,
    ) => {
      const photos =
        action.payload.photos && action.payload.photos.length > 0
          ? action.payload.photos
          : action.payload.avatarUri
          ? [action.payload.avatarUri]
          : [];
      const primaryAvatar = action.payload.avatarUri || photos[0] || '';

      const newProfile: UserProfile = {
        id: `user-${Date.now()}`,
        ...action.payload,
        avatarUri: primaryAvatar,
        photos,
        enrolledAt: new Date().toISOString().split('T')[0],
      };
      if (!Array.isArray(state.userProfiles)) {
        state.userProfiles = [];
      }
      state.userProfiles.push(newProfile);
    },
    updateUserProfile: (
      state,
      action: PayloadAction<{
        id: string;
        fullName?: string;
        code?: string;
        roomId?: string;
        zoneId?: string;
        avatarUri?: string;
        photos?: string[];
        isVisitor?: boolean;
        visitedProfileId?: string | null;
        visitedProfile?: {
          id: string;
          fullName: string;
          code: string;
          roomName?: string;
        } | null;
      }>,
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.id);
      if (user) {
        if (action.payload.fullName !== undefined)
          user.fullName = action.payload.fullName;
        if (action.payload.code !== undefined) user.code = action.payload.code;
        if (action.payload.roomId !== undefined)
          user.roomId = action.payload.roomId;
        if (action.payload.zoneId !== undefined)
          user.zoneId = action.payload.zoneId;
        if (action.payload.avatarUri !== undefined)
          user.avatarUri = action.payload.avatarUri;
        if (action.payload.photos !== undefined)
          user.photos = action.payload.photos;
        if (action.payload.isVisitor !== undefined)
          user.isVisitor = action.payload.isVisitor;
        if (action.payload.visitedProfileId !== undefined)
          user.visitedProfileId = action.payload.visitedProfileId;
        if (action.payload.visitedProfile !== undefined)
          user.visitedProfile = action.payload.visitedProfile;
      }
    },
    addPhotosToProfile: (
      state,
      action: PayloadAction<{ userId: string; photos: string[] }>,
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.userId);
      if (user) {
        const existing =
          user.photos || (user.avatarUri ? [user.avatarUri] : []);
        const nextList = [...existing];
        action.payload.photos.forEach(p => {
          if (
            !nextList.includes(p) &&
            nextList.length < PHOTO_CONFIG.MAX_PHOTOS_PER_USER
          ) {
            nextList.push(p);
          }
        });
        user.photos = nextList;
        if (!user.avatarUri && nextList.length > 0) {
          user.avatarUri = nextList[0];
        }
      }
    },
    deletePhotoFromProfile: (
      state,
      action: PayloadAction<{ userId: string; photoUri: string }>,
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.userId);
      if (user && user.photos) {
        user.photos = user.photos.filter(p => p !== action.payload.photoUri);
        if (user.avatarUri === action.payload.photoUri) {
          user.avatarUri = user.photos.length > 0 ? user.photos[0] : '';
        }
      }
    },
    setMainAvatar: (
      state,
      action: PayloadAction<{ userId: string; avatarUri: string }>,
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.userId);
      if (user) {
        user.avatarUri = action.payload.avatarUri;
      }
    },
    upsertUserProfile: (state, action: PayloadAction<UserProfile>) => {
      const idx = state.userProfiles.findIndex(u => u.id === action.payload.id);
      if (idx >= 0) {
        state.userProfiles[idx] = {
          ...state.userProfiles[idx],
          ...action.payload,
        };
      } else {
        state.userProfiles.push(action.payload);
      }
    },
    deleteUserProfile: (state, action: PayloadAction<string>) => {
      state.userProfiles = state.userProfiles.filter(
        u => u.id !== action.payload,
      );
      delete state.attendanceMap[action.payload];
      if (state.activeDetection?.userId === action.payload) {
        state.activeDetection = null;
      }
    },
    updateUserCondition: (
      state,
      action: PayloadAction<{
        userId: string;
        status: string;
        note?: string;
        updatedBy: string;
      }>,
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.userId);
      if (user) {
        const oldStatus = user.conditionStatus || 'normal';
        user.conditionStatus = action.payload.status;
        user.conditionNote = action.payload.note || '';
        if (!Array.isArray(user.statusLogs)) {
          user.statusLogs = [];
        }
        user.statusLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: dayjs().toISOString(),
          oldStatus,
          newStatus: action.payload.status,
          note: action.payload.note || '',
          updatedBy: action.payload.updatedBy || 'Admin',
        });
      }
    },
    assignUsersToRoom: (
      state,
      action: PayloadAction<{
        userIds: string[];
        roomId: string;
        zoneId: string;
      }>,
    ) => {
      const { userIds, roomId, zoneId } = action.payload;
      state.userProfiles.forEach(user => {
        if (userIds.includes(user.id)) {
          user.roomId = roomId;
          user.zoneId = zoneId;
        }
      });
    },
    addBatchUserProfiles: (
      state,
      action: PayloadAction<Omit<UserProfile, 'id' | 'enrolledAt'>[]>,
    ) => {
      if (!Array.isArray(state.userProfiles)) {
        state.userProfiles = [];
      }
      action.payload.forEach((item, index) => {
        const photos =
          item.photos && item.photos.length > 0
            ? item.photos
            : item.avatarUri
            ? [item.avatarUri]
            : [];
        const primaryAvatar = item.avatarUri || photos[0] || '';
        state.userProfiles.push({
          id: `user-${Date.now()}-${index}`,
          ...item,
          avatarUri: primaryAvatar,
          photos,
          enrolledAt: new Date().toISOString().split('T')[0],
        });
      });
    },
    clearMockData: state => {
      state.zones = Array.isArray(state.zones)
        ? state.zones.filter(
            z => !['zone-a', 'zone-b', 'zone-c'].includes(z.id),
          )
        : [];
      state.rooms = Array.isArray(state.rooms)
        ? state.rooms.filter(
            r =>
              ![
                'room-a01',
                'room-a02',
                'room-b01',
                'room-b02',
                'room-c01',
              ].includes(r.id),
          )
        : [];
      state.userProfiles = Array.isArray(state.userProfiles)
        ? state.userProfiles.filter(
            u => !u.id.startsWith('user-001') && !u.id.startsWith('user-b0'),
          )
        : [];
      if (
        ['room-a01', 'room-a02', 'room-b01', 'room-b02', 'room-c01'].includes(
          state.selectedRoomId,
        )
      ) {
        state.selectedRoomId = '';
      }
      if (['zone-a', 'zone-b', 'zone-c'].includes(state.selectedZoneId)) {
        state.selectedZoneId = '';
      }
      if (!state.selectedZoneId && state.zones.length > 0) {
        state.selectedZoneId = state.zones[0].id;
      }
      if (!state.selectedRoomId && state.rooms.length > 0) {
        const roomsInZone = state.rooms.filter(
          r => r.zoneId === state.selectedZoneId,
        );
        state.selectedRoomId = roomsInZone[0]?.id || state.rooms[0].id;
      }
      if (!Array.isArray(state.sessions)) {
        state.sessions = [];
      }
      if (!Array.isArray(state.alerts)) {
        state.alerts = [];
      }
      if (!state.attendanceMap || typeof state.attendanceMap !== 'object') {
        state.attendanceMap = {};
      }
    },
    resetAllData: state => {
      state.zones = [];
      state.rooms = [];
      state.userProfiles = [];
      state.selectedZoneId = '';
      state.selectedRoomId = '';
      state.isSessionActive = false;
      state.activeSessionId = null;
      state.activeSessionName = null;
      state.sessionStartTime = null;
      state.attendanceMap = {};
      state.activeDetection = null;
      state.alerts = [];
      state.sessions = [];
    },
    startSession: (
      state,
      action: PayloadAction<
        | { id?: string; name?: string; scanMode?: ScanMode; roomId?: string }
        | undefined
      >,
    ) => {
      state.isSessionActive = true;
      const now = dayjs();
      const currentMode = action?.payload?.scanMode || state.scanMode || 'all';
      state.scanMode = currentMode;
      const isAll = currentMode === 'all';
      const isZone = currentMode === 'zone';
      const isRoom = currentMode === 'room';

      // Resolve room and zone for session
      const targetRoomId = isRoom
        ? action?.payload?.roomId ||
          state.selectedRoomId ||
          state.rooms[0]?.id ||
          ''
        : undefined;
      if (targetRoomId && isRoom) {
        state.selectedRoomId = targetRoomId;
      }

      const room = isRoom
        ? state.rooms.find(r => r.id === targetRoomId) || state.rooms[0]
        : undefined;
      const zone = isAll
        ? undefined
        : state.zones.find(z => z.id === state.selectedZoneId) ||
          state.zones.find(z => z.id === room?.zoneId) ||
          state.zones[0];

      // Rule: Nếu không đặt tên phiên thì mặc định là "Phiên [Tên phạm vi] HH:mm dd-mm-yyyy"
      const defaultName = isAll
        ? `Phiên vào cơ sở ${now.format('HH:mm DD-MM-YYYY')}`
        : isZone
        ? `Phiên Khu ${zone?.name || ''} ${now.format('HH:mm DD-MM-YYYY')}`
        : `Phiên ${now.format('HH:mm DD-MM-YYYY')}`;
      const sessionName = action?.payload?.name?.trim() || defaultName;

      state.activeSessionName = sessionName;
      state.sessionStartTime = now.format('HH:mm:ss DD/MM/YYYY');
      state.sessionStartEpoch = Date.now();
      state.sessionDurationSeconds = 0;
      state.attendanceMap = {};
      state.activeDetection = null;
      state.scanHistory = [];

      let targetUsers: UserProfile[] = [];
      if (isAll) {
        targetUsers = state.userProfiles.filter(u => !u.isVisitor);
      } else if (isZone) {
        const roomIdsInZone = new Set(
          state.rooms.filter(r => r.zoneId === zone?.id).map(r => r.id),
        );
        targetUsers = state.userProfiles.filter(
          u =>
            !u.isVisitor &&
            (u.zoneId === zone?.id ||
              (u.roomId && roomIdsInZone.has(u.roomId))),
        );
      } else {
        targetUsers = state.userProfiles.filter(
          u => u.roomId === (room?.id || targetRoomId),
        );
      }

      const sessionId = action?.payload?.id || `session-${Date.now()}`;
      state.activeSessionId = sessionId;

      const newSession: AttendanceSession = {
        id: sessionId,
        name: sessionName,
        zoneId: isAll ? undefined : zone?.id || '',
        zoneName: isAll ? 'Toàn cơ sở' : zone?.name || '',
        roomId: isRoom ? room?.id || targetRoomId || '' : undefined,
        roomName: isRoom
          ? room?.name || 'Phòng'
          : isZone
          ? 'Theo khu vực'
          : 'Toàn cơ sở',
        startTime: now.format('HH:mm:ss DD/MM/YYYY'),
        createdAt: now.toISOString(),
        isActive: true,
        attendanceMap: {},
        totalCount: targetUsers.length,
        presentCount: 0,
        missingCount: targetUsers.length,
        verifyCount: 0,
        scanMode: currentMode,
        durationSeconds: 0,
      };

      if (!Array.isArray(state.sessions)) {
        state.sessions = [];
      }
      state.sessions.unshift(newSession);

      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        title: 'Bắt đầu phiên',
        message: isAll
          ? `Bắt đầu "${sessionName}" - Chế độ Quét All (Vào cơ sở)`
          : isZone
          ? `Bắt đầu "${sessionName}" - Chế độ Quét Khu vực (${
              zone?.name || 'Khu'
            })`
          : `Khởi tạo "${sessionName}" cho ${room?.name || 'phòng'}`,
        timestamp: now.format('HH:mm:ss'),
        type: 'info',
      });
    },
    endSession: state => {
      state.isSessionActive = false;
      const now = dayjs();
      if (state.activeSessionId && state.sessions) {
        const activeSess = state.sessions.find(
          s => s.id === state.activeSessionId,
        );
        if (activeSess) {
          activeSess.isActive = false;
          activeSess.endTime = now.format('HH:mm:ss DD/MM/YYYY');
          activeSess.durationSeconds = state.sessionDurationSeconds;
          activeSess.attendanceMap = { ...state.attendanceMap };
          activeSess.scanHistory = [...state.scanHistory];

          const verifiedItems = state.scanHistory.filter(
            i => i.status === 'present',
          );
          const unverifiedItems = state.scanHistory.filter(
            i => i.status === 'verify',
          );
          const totalScans = state.scanHistory.reduce(
            (sum, item) => sum + item.scanCount,
            0,
          );

          activeSess.presentCount = verifiedItems.length;
          activeSess.verifyCount = unverifiedItems.length;
          activeSess.totalScansCount = totalScans;

          if (activeSess.scanMode === 'all') {
            const officialUsers = state.userProfiles.filter(u => !u.isVisitor);
            activeSess.totalCount = officialUsers.length;
            activeSess.missingCount = Math.max(
              0,
              officialUsers.length - verifiedItems.length,
            );
          } else if (activeSess.scanMode === 'zone') {
            const roomIds = new Set(
              state.rooms
                .filter(r => r.zoneId === activeSess.zoneId)
                .map(r => r.id),
            );
            const zoneMembers = state.userProfiles.filter(
              u =>
                !u.isVisitor &&
                (u.zoneId === activeSess.zoneId ||
                  (u.roomId && roomIds.has(u.roomId))),
            );
            activeSess.totalCount = zoneMembers.length;
            activeSess.missingCount = Math.max(
              0,
              zoneMembers.length - verifiedItems.length,
            );
          } else {
            const roomMembers = state.userProfiles.filter(
              u => u.roomId === activeSess.roomId,
            );
            activeSess.totalCount = roomMembers.length;
            activeSess.missingCount = Math.max(
              0,
              roomMembers.length - verifiedItems.length,
            );
          }
        }
      }
      const durSec = state.sessionDurationSeconds;
      const minStr = Math.floor(durSec / 60);
      const secStr = durSec % 60;
      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        title: 'Kết thúc quét',
        message: `Phiên "${
          state.activeSessionName || 'Điểm danh'
        }" đã kết thúc. Thời gian quét: ${minStr}p ${secStr}s.`,
        timestamp: now.format('HH:mm:ss'),
        type: 'info',
      });
      state.activeSessionId = null;
      state.activeSessionName = null;
      state.sessionStartEpoch = null;
    },
    recordScanEvent: (
      state,
      action: PayloadAction<{
        userId?: string;
        fullName?: string;
        code?: string;
        avatarUri?: string;
        capturedAvatarUri?: string;
        roomId?: string;
        roomName?: string;
        zoneId?: string;
        zoneName?: string;
        status: AttendanceStatus;
        confidence: number;
        timestamp: string;
        scanMode: ScanMode;
        direction?: ScanDirection;
        isVisitor?: boolean;
        visitedProfileName?: string;
      }>,
    ) => {
      const {
        userId,
        fullName,
        code,
        avatarUri,
        capturedAvatarUri,
        roomId,
        roomName,
        zoneId,
        zoneName,
        status,
        confidence,
        timestamp,
        scanMode,
        isVisitor,
        visitedProfileName,
      } = action.payload;
      const direction: ScanDirection =
        action.payload.direction || state.scanDirection || 'in';

      const nowEpoch = Date.now();
      const isAll = scanMode === 'all';
      if (!Array.isArray(state.scanHistory)) {
        state.scanHistory = [];
      }

      const event: ScanEvent = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        epochTime: nowEpoch,
        confidence,
        avatarUri: capturedAvatarUri || avatarUri,
        capturedAvatarUri: capturedAvatarUri || avatarUri,
        scanMode,
        direction,
        isVisitor,
        visitedProfileName,
      };

      if (userId && status === 'present') {
        const existingIdx = state.scanHistory.findIndex(
          item => item.userId === userId,
        );

        if (existingIdx >= 0) {
          const existing = state.scanHistory[existingIdx];
          existing.scanCount += 1;
          existing.lastScanTime = timestamp;
          existing.confidence = Math.max(existing.confidence, confidence);
          if (avatarUri) existing.avatarUri = avatarUri;
          if (capturedAvatarUri) existing.capturedAvatarUri = capturedAvatarUri;
          if (isVisitor !== undefined) existing.isVisitor = isVisitor;
          if (visitedProfileName !== undefined)
            existing.visitedProfileName = visitedProfileName;
          existing.lastDirection = direction;

          if (direction === 'in') {
            existing.inCount = (existing.inCount || 0) + 1;
            if (!existing.firstInTime) {
              existing.firstInTime = timestamp;
              existing.firstInEpoch = nowEpoch;
            }
          } else {
            existing.outCount = (existing.outCount || 0) + 1;
            existing.lastOutTime = timestamp;
            existing.lastOutEpoch = nowEpoch;
          }

          existing.history.unshift(event);
          if (existing.history.length > 5) {
            existing.history = existing.history.slice(0, 5);
          }
          // Move to top of the list for fresh real-time feed
          state.scanHistory.splice(existingIdx, 1);
          state.scanHistory.unshift(existing);
        } else {
          const newItem: ScanHistoryItem = {
            id: userId,
            userId,
            fullName: fullName || 'Nhân sự',
            code: code || '',
            avatarUri,
            capturedAvatarUri: capturedAvatarUri || avatarUri,
            roomId,
            roomName,
            zoneId,
            zoneName,
            status: 'present',
            confidence,
            firstInTime: direction === 'in' ? timestamp : undefined,
            firstInEpoch: direction === 'in' ? nowEpoch : undefined,
            lastOutTime: direction === 'out' ? timestamp : undefined,
            lastOutEpoch: direction === 'out' ? nowEpoch : undefined,
            lastDirection: direction,
            inCount: direction === 'in' ? 1 : 0,
            outCount: direction === 'out' ? 1 : 0,
            scanCount: 1,
            history: [event],
            lastScanTime: timestamp,
            isFacilityEntry: isAll,
            isVisitor,
            visitedProfileName,
          };
          state.scanHistory.unshift(newItem);
        }
      } else {
        // Unverified stranger: cluster by persistent stranger userId from biometric embedding
        const existingStranger = userId
          ? state.scanHistory.find(
              item => item.id === userId || item.userId === userId,
            )
          : state.scanHistory.find(
              item =>
                item.status === 'verify' &&
                nowEpoch - (item.firstInEpoch || item.lastOutEpoch || 0) < 4000,
            );

        if (existingStranger) {
          existingStranger.scanCount += 1;
          existingStranger.lastScanTime = timestamp;
          existingStranger.lastDirection = direction;
          existingStranger.confidence = Math.max(
            existingStranger.confidence,
            confidence,
          );
          if (direction === 'in') {
            existingStranger.inCount = (existingStranger.inCount || 0) + 1;
            if (!existingStranger.firstInTime) {
              existingStranger.firstInTime = timestamp;
              existingStranger.firstInEpoch = nowEpoch;
            }
          } else {
            existingStranger.outCount = (existingStranger.outCount || 0) + 1;
            existingStranger.lastOutTime = timestamp;
            existingStranger.lastOutEpoch = nowEpoch;
          }
          if (avatarUri) existingStranger.avatarUri = avatarUri;
          existingStranger.history.unshift(event);
          if (existingStranger.history.length > 5) {
            existingStranger.history = existingStranger.history.slice(0, 5);
          }
          // Move to top of the list for fresh real-time feed
          const strangerIdx = state.scanHistory.indexOf(existingStranger);
          if (strangerIdx > 0) {
            state.scanHistory.splice(strangerIdx, 1);
            state.scanHistory.unshift(existingStranger);
          }
        } else {
          const strangerId =
            userId ||
            `stranger-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 5)}`;
          const strangerName = fullName || 'Chưa xác minh';
          const strangerCode = code || 'STRANGER';
          const newStranger: ScanHistoryItem = {
            id: strangerId,
            userId: strangerId,
            fullName: strangerName,
            code: strangerCode,
            avatarUri,
            status: 'verify',
            confidence,
            firstInTime: direction === 'in' ? timestamp : undefined,
            firstInEpoch: direction === 'in' ? nowEpoch : undefined,
            lastOutTime: direction === 'out' ? timestamp : undefined,
            lastOutEpoch: direction === 'out' ? nowEpoch : undefined,
            lastDirection: direction,
            inCount: direction === 'in' ? 1 : 0,
            outCount: direction === 'out' ? 1 : 0,
            scanCount: 1,
            history: [event],
            lastScanTime: timestamp,
            isFacilityEntry: isAll,
          };
          state.scanHistory.unshift(newStranger);
        }
      }

      // Bound total scanHistory entries to 100 to prevent OOM
      if (state.scanHistory.length > 100) {
        state.scanHistory = state.scanHistory.slice(0, 100);
      }

      // Keep active session in sessions array synced with latest scanHistory
      if (state.activeSessionId && state.sessions) {
        const activeSess = state.sessions.find(
          s => s.id === state.activeSessionId,
        );
        if (activeSess) {
          activeSess.scanHistory = [...state.scanHistory];
          activeSess.totalScansCount = state.scanHistory.reduce(
            (sum, item) => sum + item.scanCount,
            0,
          );
        }
      }
    },
    convertStrangerToUser: (
      state,
      action: PayloadAction<{
        strangerId: string;
        userProfile: UserProfile;
      }>,
    ) => {
      const { strangerId, userProfile } = action.payload;
      const item = state.scanHistory.find(
        i => i.id === strangerId || i.userId === strangerId,
      );
      if (item) {
        item.id = userProfile.id;
        item.userId = userProfile.id;
        item.fullName = userProfile.fullName;
        item.code = userProfile.code;
        item.status = 'present';
        item.roomId = userProfile.roomId;
        item.zoneId = userProfile.zoneId;
        item.avatarUri = userProfile.avatarUri || item.avatarUri;
        item.isVisitor = userProfile.isVisitor;
        item.visitedProfileName = userProfile.visitedProfile?.fullName;

        item.history.forEach(evt => {
          evt.isVisitor = userProfile.isVisitor;
          evt.visitedProfileName = userProfile.visitedProfile?.fullName;
        });
      }

      state.attendanceMap[userProfile.id] = {
        userId: userProfile.id,
        status: 'present',
        confidence: item ? item.confidence : 95,
        timestamp: item ? item.lastScanTime : dayjs().format('HH:mm:ss'),
        detectedImageUrl: userProfile.avatarUri,
      };

      if (state.activeSessionId && state.sessions) {
        const activeSess = state.sessions.find(
          s => s.id === state.activeSessionId,
        );
        if (activeSess) {
          activeSess.scanHistory = [...state.scanHistory];
          activeSess.attendanceMap = { ...state.attendanceMap };
          const verifiedItems = state.scanHistory.filter(
            i => i.status === 'present',
          );
          const unverifiedItems = state.scanHistory.filter(
            i => i.status === 'verify',
          );
          activeSess.presentCount = verifiedItems.length;
          activeSess.verifyCount = unverifiedItems.length;
        }
      }
    },
    clearScanHistory: state => {
      state.scanHistory = [];
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      if (state.sessions) {
        state.sessions = state.sessions.filter(s => s.id !== action.payload);
      }
      if (state.activeSessionId === action.payload) {
        state.activeSessionId = null;
        state.activeSessionName = null;
        state.isSessionActive = false;
      }
    },
    recordAttendance: (
      state,
      action: PayloadAction<{
        userId: string;
        status: AttendanceStatus;
        confidence: number;
        timestamp: string;
        boundingBox?: { x: number; y: number; width: number; height: number };
        avatarUri?: string;
      }>,
    ) => {
      const { userId, status, confidence, timestamp, boundingBox, avatarUri } =
        action.payload;
      state.attendanceMap[userId] = {
        userId,
        status,
        confidence,
        timestamp,
        detectedImageUrl: avatarUri,
      };

      // Đồng bộ vào phiên đang hoạt động
      if (state.activeSessionId && state.sessions) {
        const activeSess = state.sessions.find(
          s => s.id === state.activeSessionId,
        );
        if (activeSess) {
          activeSess.attendanceMap[userId] = state.attendanceMap[userId];
          let p = 0;
          let v = 0;
          Object.values(activeSess.attendanceMap).forEach(rec => {
            if (rec.status === 'present') p++;
            else if (rec.status === 'verify') v++;
          });
          activeSess.presentCount = p;
          activeSess.verifyCount = v;
          activeSess.missingCount = Math.max(0, activeSess.totalCount - p);
        }
      }

      const user = state.userProfiles.find(u => u.id === userId);
      const zone = state.zones.find(z => z.id === user?.zoneId);
      const room = state.rooms.find(r => r.id === user?.roomId);

      if (user && status === 'present') {
        state.activeDetection = {
          userId: user.id,
          fullName: user.fullName,
          code: user.code,
          avatarUri: avatarUri || user.avatarUri,
          zoneName: zone ? zone.name.replace('Khu ', '') : 'A',
          roomName: room ? room.name.replace('Phòng ', '') : 'A01',
          confidence,
          timestamp,
          status,
          boundingBox,
        };
      } else {
        state.activeDetection = {
          userId: userId || 'unverified-unknown',
          fullName: 'Khuôn mặt chưa nhận diện',
          code: 'UNKNOWN',
          avatarUri: avatarUri || '',
          zoneName: '',
          roomName: '',
          confidence,
          timestamp,
          status: 'verify',
          boundingBox,
        };
      }
    },
    setActiveDetection: (
      state,
      action: PayloadAction<DetectionResult | null>,
    ) => {
      state.activeDetection = action.payload;
    },
    addAlert: (state, action: PayloadAction<Omit<AlertLog, 'id'>>) => {
      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        ...action.payload,
      });
      if (state.alerts.length > 50) {
        state.alerts = state.alerts.slice(0, 50);
      }
    },
    clearAlerts: state => {
      state.alerts = [];
    },
    setDeviceAuthorized: (
      state,
      action: PayloadAction<{ authorized: boolean; message?: string }>,
    ) => {
      state.isDeviceAuthorized = action.payload.authorized;
      if (action.payload.message !== undefined) {
        state.deviceLockMessage = action.payload.message;
      }
    },
    setConfidenceThreshold: (state, action: PayloadAction<number>) => {
      state.confidenceThreshold = action.payload;
    },
    setTargetFps: (state, action: PayloadAction<number>) => {
      state.targetFps = action.payload;
    },
    setSoundEnabled: (state, action: PayloadAction<boolean>) => {
      state.soundEnabled = action.payload;
    },
    setAutoSessionReset: (state, action: PayloadAction<boolean>) => {
      state.autoSessionReset = action.payload;
    },
    updateDetectorSettings: (
      state,
      action: PayloadAction<{
        confidenceThreshold?: number;
        targetFps?: number;
        soundEnabled?: boolean;
        autoSessionReset?: boolean;
      }>,
    ) => {
      if (action.payload.confidenceThreshold !== undefined) {
        state.confidenceThreshold = action.payload.confidenceThreshold;
      }
      if (action.payload.targetFps !== undefined) {
        state.targetFps = action.payload.targetFps;
      }
      if (action.payload.soundEnabled !== undefined) {
        state.soundEnabled = action.payload.soundEnabled;
      }
      if (action.payload.autoSessionReset !== undefined) {
        state.autoSessionReset = action.payload.autoSessionReset;
      }
    },
    resetAttendanceMap: state => {
      state.attendanceMap = {};
      state.activeDetection = null;
      state.scanHistory = [];
    },
  },
});

export const {
  setDeviceAuthorized,
  setZones,
  setRooms,
  setUserProfiles,
  setSessions,
  setAlerts,
  setSelectedZoneId,
  setSelectedRoomId,
  setScanMode,
  setScanDirection,
  tickSessionDuration,
  recordScanEvent,
  convertStrangerToUser,
  clearScanHistory,
  addZone,
  addRoom,
  addUserProfile,
  updateUserProfile,
  addPhotosToProfile,
  deletePhotoFromProfile,
  setMainAvatar,
  upsertUserProfile,
  deleteUserProfile,
  updateUserCondition,
  assignUsersToRoom,
  addBatchUserProfiles,
  clearMockData,
  resetAllData,
  startSession,
  endSession,
  deleteSession,
  recordAttendance,
  setActiveDetection,
  addAlert,
  clearAlerts,
  setConfidenceThreshold,
  setTargetFps,
  setSoundEnabled,
  setAutoSessionReset,
  updateDetectorSettings,
  resetAttendanceMap,
} = detectorSlice.actions;

export const detectorReducer = detectorSlice.reducer;
