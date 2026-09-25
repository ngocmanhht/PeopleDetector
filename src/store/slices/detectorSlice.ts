import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AlertLog,
  AttendanceRecord,
  AttendanceStatus,
  DetectionResult,
  Room,
  UserProfile,
  Zone,
} from '../../model/detector';

export interface DetectorState {
  zones: Zone[];
  rooms: Room[];
  userProfiles: UserProfile[];
  selectedZoneId: string;
  selectedRoomId: string;
  isSessionActive: boolean;
  sessionStartTime: string | null;
  attendanceMap: Record<string, AttendanceRecord>; // key: userId
  activeDetection: DetectionResult | null;
  alerts: AlertLog[];
}

import { PHOTO_CONFIG } from '../../const/photo-config';

const initialState: DetectorState = {
  zones: [],
  rooms: [],
  userProfiles: [],
  selectedZoneId: '',
  selectedRoomId: '',
  isSessionActive: false,
  sessionStartTime: null,
  attendanceMap: {},
  activeDetection: null,
  alerts: [],
};

const detectorSlice = createSlice({
  name: 'detector',
  initialState,
  reducers: {
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
    addZone: (state, action: PayloadAction<{ name: string; description?: string }>) => {
      const newZone: Zone = {
        id: `zone-${Date.now()}`,
        name: action.payload.name,
        description: action.payload.description,
      };
      state.zones.push(newZone);
      if (!state.selectedZoneId) {
        state.selectedZoneId = newZone.id;
      }
    },
    addRoom: (
      state,
      action: PayloadAction<{ zoneId: string; name: string; capacity?: number }>
    ) => {
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        zoneId: action.payload.zoneId,
        name: action.payload.name,
        capacity: action.payload.capacity || 30,
      };
      state.rooms.push(newRoom);
      if (state.selectedZoneId === action.payload.zoneId && !state.selectedRoomId) {
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
      state.zones = state.zones.filter(z => !['zone-a', 'zone-b', 'zone-c'].includes(z.id));
      state.rooms = state.rooms.filter(r => !['room-a01', 'room-a02', 'room-b01', 'room-b02', 'room-c01'].includes(r.id));
      state.userProfiles = state.userProfiles.filter(
        u => !u.id.startsWith('user-001') && !u.id.startsWith('user-b0')
      );
      if (['room-a01', 'room-a02', 'room-b01', 'room-b02', 'room-c01'].includes(state.selectedRoomId)) {
        state.selectedRoomId = state.rooms[0]?.id || '';
      }
      if (['zone-a', 'zone-b', 'zone-c'].includes(state.selectedZoneId)) {
        state.selectedZoneId = state.zones[0]?.id || '';
      }
    },
    resetAllData: (state) => {
      state.zones = [];
      state.rooms = [];
      state.userProfiles = [];
      state.selectedZoneId = '';
      state.selectedRoomId = '';
      state.isSessionActive = false;
      state.sessionStartTime = null;
      state.attendanceMap = {};
      state.activeDetection = null;
      state.alerts = [];
    },
    startSession: (state) => {
      state.isSessionActive = true;
      const now = new Date();
      state.sessionStartTime = now.toLocaleTimeString('vi-VN');
      // Reset attendance map when starting a new fresh session
      state.attendanceMap = {};
      state.activeDetection = null;
      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        title: 'Bắt đầu phiên',
        message: `Bắt đầu phiên điểm danh cho ${
          state.rooms.find(r => r.id === state.selectedRoomId)?.name || 'phòng'
        }`,
        timestamp: now.toLocaleTimeString('vi-VN'),
        type: 'info',
      });
    },
    endSession: (state) => {
      state.isSessionActive = false;
      const now = new Date();
      state.alerts.unshift({
        id: `alert-${Date.now()}`,
        title: 'Kết thúc phiên',
        message: 'Phiên điểm danh đã được kết thúc thành công',
        timestamp: now.toLocaleTimeString('vi-VN'),
        type: 'info',
      });
    },
    recordAttendance: (
      state,
      action: PayloadAction<{
        userId: string;
        status: AttendanceStatus;
        confidence: number;
        timestamp: string;
        boundingBox?: { x: number; y: number; width: number; height: number };
      }>
    ) => {
      const { userId, status, confidence, timestamp, boundingBox } = action.payload;
      state.attendanceMap[userId] = {
        userId,
        status,
        confidence,
        timestamp,
      };

      const user = state.userProfiles.find(u => u.id === userId);
      const zone = state.zones.find(z => z.id === user?.zoneId);
      const room = state.rooms.find(r => r.id === user?.roomId);

      if (user) {
        state.activeDetection = {
          userId: user.id,
          fullName: user.fullName,
          code: user.code,
          avatarUri: user.avatarUri,
          zoneName: zone ? zone.name.replace('Khu ', '') : 'A',
          roomName: room ? room.name.replace('Phòng ', '') : 'A01',
          confidence,
          timestamp,
          status,
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
  recordAttendance,
  setActiveDetection,
  addAlert,
  clearAlerts,
} = detectorSlice.actions;

export const detectorReducer = detectorSlice.reducer;
