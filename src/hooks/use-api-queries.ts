import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  authService,
  zoneService,
  roomService,
  profileService,
  sessionService,
  attendanceService,
  alertService,
  LoginCredentials,
  CreateZonePayload,
  UpdateZonePayload,
  CreateRoomPayload,
  UpdateRoomPayload,
  CreateProfilePayload,
  UpdateProfilePayload,
  StartSessionPayload,
  RecordAttendancePayload,
  CreateAlertPayload,
} from '../services/api';
import { login, logout } from '../store/slices/appSlice';
import {
  setZones,
  setRooms,
  setUserProfiles,
  setSessions,
  setAlerts,
  addZone,
  addRoom,
  addUserProfile,
  updateUserProfile,
  deleteUserProfile,
  startSession,
  endSession,
  deleteSession,
  recordAttendance,
  addAlert,
  clearAlerts,
} from '../store/slices/detectorSlice';

// ======================== AUTH HOOKS ========================
export const useLoginMutation = () => {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: res => {
      const accessToken = res.access_token;
      const refreshToken = res.refresh_token;
      dispatch(
        login({
          user: res.user,
          token: { accessToken, refreshToken },
        }),
      );
    },
  });
};

export const useLogoutMutation = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(state => state.app.token);

  return useMutation({
    mutationFn: () => authService.logout(token?.refreshToken),
    onSettled: () => {
      dispatch(logout());
    },
  });
};

// ======================== ZONES HOOKS ========================
export const useZonesQuery = (enabled = true) => {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const res = await zoneService.getZones();
      if (res.data) {
        dispatch(setZones(res.data));
      }
      return res.data;
    },
    enabled,
  });
};

export const useCreateZoneMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (payload: CreateZonePayload) => zoneService.createZone(payload),
    onSuccess: res => {
      dispatch(addZone(res.data));
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
  });
};

export const useUpdateZoneMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateZonePayload }) =>
      zoneService.updateZone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
  });
};

export const useDeleteZoneMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => zoneService.deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
  });
};

// ======================== ROOMS HOOKS ========================
export const useRoomsQuery = (zoneId?: string, enabled = true) => {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['rooms', zoneId],
    queryFn: async () => {
      const res = await roomService.getRooms(zoneId);
      if (res.data) {
        dispatch(setRooms(res.data));
      }
      return res.data;
    },
    enabled,
  });
};

export const useCreateRoomMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (payload: CreateRoomPayload) => roomService.createRoom(payload),
    onSuccess: res => {
      dispatch(addRoom(res.data));
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useUpdateRoomMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoomPayload }) =>
      roomService.updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useDeleteRoomMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roomService.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

// ======================== PROFILES HOOKS ========================
export const useProfilesQuery = (
  params?: { zoneId?: string; roomId?: string; q?: string },
  enabled = true,
) => {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['profiles', params],
    queryFn: async () => {
      const res = await profileService.getProfiles(params);
      if (res.data) {
        dispatch(setUserProfiles(res.data));
      }
      return res.data;
    },
    enabled,
  });
};

export const useCreateProfileMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (payload: CreateProfilePayload) => profileService.createProfile(payload),
    onSuccess: res => {
      dispatch(addUserProfile(res.data));
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfilePayload }) =>
      profileService.updateProfile(id, data),
    onSuccess: res => {
      dispatch(updateUserProfile(res.data));
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};

export const useDeleteProfileMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (id: string) => profileService.deleteProfile(id),
    onSuccess: (_, id) => {
      dispatch(deleteUserProfile(id));
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};

// ======================== SESSIONS HOOKS ========================
export const useSessionsQuery = (
  params?: { roomId?: string; zoneId?: string },
  enabled = true,
) => {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['sessions', params],
    queryFn: async () => {
      const res = await sessionService.getSessions(params);
      if (res.data) {
        dispatch(setSessions(res.data));
      }
      return res.data;
    },
    enabled,
  });
};

export const useStartSessionMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (payload: StartSessionPayload) => sessionService.startSession(payload),
    onSuccess: res => {
      dispatch(startSession({ name: res.data.name }));
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

export const useEndSessionMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: ({ id, endTime }: { id: string; endTime?: string }) =>
      sessionService.endSession(id, endTime),
    onSuccess: () => {
      dispatch(endSession());
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

export const useDeleteSessionMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (id: string) => sessionService.deleteSession(id),
    onSuccess: (_, id) => {
      dispatch(deleteSession(id));
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

// ======================== ATTENDANCE HOOKS ========================
export const useRecordAttendanceMutation = () => {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (payload: RecordAttendancePayload) =>
      attendanceService.recordAttendance(payload),
    onSuccess: res => {
      dispatch(recordAttendance(res.data));
    },
  });
};

// ======================== ALERTS HOOKS ========================
export const useAlertsQuery = (enabled = true) => {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await alertService.getAlerts();
      if (res.data) {
        dispatch(setAlerts(res.data));
      }
      return res.data;
    },
    enabled,
  });
};

export const useCreateAlertMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (payload: CreateAlertPayload) => alertService.createAlert(payload),
    onSuccess: res => {
      dispatch(addAlert(res.data));
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useClearAlertsMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: () => alertService.clearAlerts(),
    onSuccess: () => {
      dispatch(clearAlerts());
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};
