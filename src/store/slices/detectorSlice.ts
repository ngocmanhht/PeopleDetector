import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AlertLog,
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  DetectionResult,
  Room,
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
  isSessionActive: boolean;
  activeSessionId: string | null;
  activeSessionName: string | null;
  sessionStartTime: string | null;
  attendanceMap: Record<string, AttendanceRecord>; // key: userId
  activeDetection: DetectionResult | null;
  alerts: AlertLog[];
  sessions: AttendanceSession[];
}

import { PHOTO_CONFIG } from '../../const/photo-config';

const initialState: DetectorState = {
  zones: [],
  rooms: [],
  userProfiles: [],
  selectedZoneId: '',
  selectedRoomId: '',
  isSessionActive: false,
  activeSessionId: null,
  activeSessionName: null,
  sessionStartTime: null,
  attendanceMap: {},
  activeDetection: null,
  alerts: [],
  sessions: [],
};

const detectorSlice = createSlice({
  name: 'detector',
  initialState,
  reducers: {
    setZones: (state, action: PayloadAction<Zone[]>) => {
      state.zones = action.payload;
      if (!state.selectedZoneId && action.payload.length > 0) {
        state.selectedZoneId = action.payload[0].id;
      }
    },
    setRooms: (state, action: PayloadAction<Room[]>) => {
      state.rooms = action.payload;
      if (!state.selectedRoomId && action.payload.length > 0) {
        state.selectedRoomId = action.payload[0].id;
      }
    },
    setUserProfiles: (state, action: PayloadAction<UserProfile[]>) => {
      state.userProfiles = action.payload;
    },
    setSessions: (state, action: PayloadAction<AttendanceSession[]>) => {
      state.sessions = action.payload;
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
    addZone: (
      state,
      action: PayloadAction<{ id?: string; name: string; description?: string }>
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
      action: PayloadAction<{ id?: string; zoneId: string; name: string; capacity?: number }>
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
      if (!state.selectedRoomId || state.selectedZoneId === action.payload.zoneId) {
        state.selectedRoomId = newRoom.id;
      }
    },
    addUserProfile: (
      state,
      action: PayloadAction<Omit<UserProfile, 'id' | 'enrolledAt'>>
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
      }>
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.id);
      if (user) {
        if (action.payload.fullName !== undefined) user.fullName = action.payload.fullName;
        if (action.payload.code !== undefined) user.code = action.payload.code;
        if (action.payload.roomId !== undefined) user.roomId = action.payload.roomId;
        if (action.payload.zoneId !== undefined) user.zoneId = action.payload.zoneId;
        if (action.payload.avatarUri !== undefined) user.avatarUri = action.payload.avatarUri;
        if (action.payload.photos !== undefined) user.photos = action.payload.photos;
      }
    },
    addPhotosToProfile: (
      state,
      action: PayloadAction<{ userId: string; photos: string[] }>
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.userId);
      if (user) {
        const existing = user.photos || (user.avatarUri ? [user.avatarUri] : []);
        const nextList = [...existing];
        action.payload.photos.forEach(p => {
          if (!nextList.includes(p) && nextList.length < PHOTO_CONFIG.MAX_PHOTOS_PER_USER) {
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
      action: PayloadAction<{ userId: string; photoUri: string }>
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
      action: PayloadAction<{ userId: string; avatarUri: string }>
    ) => {
      const user = state.userProfiles.find(u => u.id === action.payload.userId);
      if (user) {
        user.avatarUri = action.payload.avatarUri;
      }
    },
    deleteUserProfile: (state, action: PayloadAction<string>) => {
      state.userProfiles = state.userProfiles.filter(u => u.id !== action.payload);
      delete state.attendanceMap[action.payload];
      if (state.activeDetection?.userId === action.payload) {
        state.activeDetection = null;
      }
    },
    clearMockData: (state) => {
      state.zones = Array.isArray(state.zones)
        ? state.zones.filter(z => !['zone-a', 'zone-b', 'zone-c'].includes(z.id))
        : [];
      state.rooms = Array.isArray(state.rooms)
        ? state.rooms.filter(r => !['room-a01', 'room-a02', 'room-b01', 'room-b02', 'room-c01'].includes(r.id))
        : [];
      state.userProfiles = Array.isArray(state.userProfiles)
        ? state.userProfiles.filter(
            u => !u.id.startsWith('user-001') && !u.id.startsWith('user-b0')
          )
        : [];
      if (['room-a01', 'room-a02', 'room-b01', 'room-b02', 'room-c01'].includes(state.selectedRoomId)) {
        state.selectedRoomId = '';
      }
      if (['zone-a', 'zone-b', 'zone-c'].includes(state.selectedZoneId)) {
        state.selectedZoneId = '';
      }
      if (!state.selectedZoneId && state.zones.length > 0) {
        state.selectedZoneId = state.zones[0].id;
      }
      if (!state.selectedRoomId && state.rooms.length > 0) {
        const roomsInZone = state.rooms.filter(r => r.zoneId === state.selectedZoneId);
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
    resetAllData: (state) => {
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
    startSession: (state, action: PayloadAction<{ name?: string } | undefined>) => {
      state.isSessionActive = true;
      const now = dayjs();
      // Rule: Nếu không đặt tên phiên thì mặc định là "Phiên HH:mm dd-mm-yyyy"
      const defaultName = `Phiên ${now.format('HH:mm DD-MM-YYYY')}`;
      const sessionName = action?.payload?.name?.trim() || defaultName;

      state.activeSessionName = sessionName;
      state.sessionStartTime = now.format('HH:mm:ss DD/MM/YYYY');
      state.attendanceMap = {};
      state.activeDetection = null;

      const room = state.rooms.find(r => r.id === state.selectedRoomId);
      const zone =
        state.zones.find(z => z.id === state.selectedZoneId) ||
        state.zones.find(z => z.id === room?.zoneId);
      const roomUsers = state.userProfiles.filter(u => u.roomId === state.selectedRoomId);

      const sessionId = `session-${Date.now()}`;
      state.activeSessionId = sessionId;

      const newSession: AttendanceSession = {
        id: sessionId,
        name: sessionName,
        zoneId: zone?.id || '',
        zoneName: zone?.name || '',
        roomId: room?.id || state.selectedRoomId,
        roomName: room?.name || 'Phòng',
        startTime: now.format('HH:mm:ss DD/MM/YYYY'),
        createdAt: now.toISOString(),
        isActive: true,
        attendanceMap: {},
        totalCount: roomUsers.length,
        presentCount: 0,
        missingCount: roomUsers.length,
        verifyCount: 0,
      };

      if (!Array.isArray(state.sessions)) {
        state.sessions = [];
      }
      state.sessions.unshift(newSession);

      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        title: 'Bắt đầu phiên',
        message: `Khởi tạo "${sessionName}" cho ${room?.name || 'phòng'}`,
        timestamp: now.format('HH:mm:ss'),
        type: 'info',
      });
    },
    endSession: (state) => {
      state.isSessionActive = false;
      const now = dayjs();
      if (state.activeSessionId && state.sessions) {
        const activeSess = state.sessions.find(s => s.id === state.activeSessionId);
        if (activeSess) {
          activeSess.isActive = false;
          activeSess.endTime = now.format('HH:mm:ss DD/MM/YYYY');
        }
      }
      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        title: 'Kết thúc phiên',
        message: `Phiên "${state.activeSessionName || 'Điểm danh'}" đã kết thúc thành công`,
        timestamp: now.format('HH:mm:ss'),
        type: 'info',
      });
      state.activeSessionId = null;
      state.activeSessionName = null;
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
      }>
    ) => {
      const { userId, status, confidence, timestamp, boundingBox, avatarUri } = action.payload;
      state.attendanceMap[userId] = {
        userId,
        status,
        confidence,
        timestamp,
        detectedImageUrl: avatarUri,
      };

      // Đồng bộ vào phiên đang hoạt động
      if (state.activeSessionId && state.sessions) {
        const activeSess = state.sessions.find(s => s.id === state.activeSessionId);
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
          activeSess.missingCount = Math.max(0, activeSess.totalCount - p - v);
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
    setActiveDetection: (state, action: PayloadAction<DetectionResult | null>) => {
      state.activeDetection = action.payload;
    },
    addAlert: (state, action: PayloadAction<Omit<AlertLog, 'id'>>) => {
      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        ...action.payload,
      });
    },
    clearAlerts: (state) => {
      state.alerts = [];
    },
  },
});

export const {
  setZones,
  setRooms,
  setUserProfiles,
  setSessions,
  setAlerts,
  setSelectedZoneId,
  setSelectedRoomId,
  addZone,
  addRoom,
  addUserProfile,
  updateUserProfile,
  addPhotosToProfile,
  deletePhotoFromProfile,
  setMainAvatar,
  deleteUserProfile,
  clearMockData,
  resetAllData,
  startSession,
  endSession,
  deleteSession,
  recordAttendance,
  setActiveDetection,
  addAlert,
  clearAlerts,
} = detectorSlice.actions;

export const detectorReducer = detectorSlice.reducer;
