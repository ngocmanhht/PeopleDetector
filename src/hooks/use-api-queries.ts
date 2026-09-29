import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, PaginationParams } from '../const/pagination';
import { UploadFolder } from '../const/upload-folder';
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
  GetProfilesParams,
  GetSessionsParams,
  StartSessionPayload,
  RecordAttendancePayload,
  GetAttendanceHistoryParams,
  CreateAlertPayload,
  uploadService,
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
  params?: GetProfilesParams,
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

export const useInfiniteProfilesQuery = (
  params?: Omit<GetProfilesParams, 'page' | 'limit'>,
  limit = DEFAULT_PAGE_SIZE,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: ['profiles', 'infinite', params, limit],
    queryFn: async ({ pageParam = DEFAULT_PAGE }) => {
      return await profileService.getProfiles({
        ...params,
        page: pageParam,
        limit,
      });
    },
    initialPageParam: DEFAULT_PAGE,
    getNextPageParam: lastPage => {
      const p = lastPage.pagination;
      if (!p || p.page >= p.totalPages) {
        return undefined;
      }
      return p.page + 1;
    },
    getPreviousPageParam: firstPage => {
      const p = firstPage.pagination;
      if (!p || p.page <= 1) {
        return undefined;
      }
      return p.page - 1;
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
  params?: GetSessionsParams,
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

export const useInfiniteSessionsQuery = (
  params?: Omit<GetSessionsParams, 'page' | 'limit'>,
  limit = DEFAULT_PAGE_SIZE,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: ['sessions', 'infinite', params, limit],
    queryFn: async ({ pageParam = DEFAULT_PAGE }) => {
      return await sessionService.getSessions({
        ...params,
        page: pageParam,
        limit,
      });
    },
    initialPageParam: DEFAULT_PAGE,
    getNextPageParam: lastPage => {
      const p = lastPage.pagination;
      if (!p || p.page >= p.totalPages) {
        return undefined;
      }
      return p.page + 1;
    },
    getPreviousPageParam: firstPage => {
      const p = firstPage.pagination;
      if (!p || p.page <= 1) {
        return undefined;
      }
      return p.page - 1;
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
export const useAttendanceHistoryQuery = (
  params?: GetAttendanceHistoryParams,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['attendance', 'history', params],
    queryFn: async () => {
      const res = await attendanceService.getHistory(params);
      return res.data;
    },
    enabled,
  });
};

export const useInfiniteAttendanceHistoryQuery = (
  params?: Omit<GetAttendanceHistoryParams, 'page' | 'limit'>,
  limit = DEFAULT_PAGE_SIZE,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: ['attendance', 'history', 'infinite', params, limit],
    queryFn: async ({ pageParam = DEFAULT_PAGE }) => {
      return await attendanceService.getHistory({
        ...params,
        page: pageParam,
        limit,
      });
    },
    initialPageParam: DEFAULT_PAGE,
    getNextPageParam: lastPage => {
      const p = lastPage.pagination;
      if (!p || p.page >= p.totalPages) {
        return undefined;
      }
      return p.page + 1;
    },
    getPreviousPageParam: firstPage => {
      const p = firstPage.pagination;
      if (!p || p.page <= 1) {
        return undefined;
      }
      return p.page - 1;
    },
    enabled,
  });
};

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
export const useAlertsQuery = (
  params?: PaginationParams,
  enabled = true,
) => {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['alerts', params],
    queryFn: async () => {
      const res = await alertService.getAlerts(params);
      if (res.data) {
        dispatch(setAlerts(res.data));
      }
      return res.data;
    },
    enabled,
  });
};

export const useInfiniteAlertsQuery = (
  limit = DEFAULT_PAGE_SIZE,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: ['alerts', 'infinite', limit],
    queryFn: async ({ pageParam = DEFAULT_PAGE }) => {
      return await alertService.getAlerts({
        page: pageParam,
        limit,
      });
    },
    initialPageParam: DEFAULT_PAGE,
    getNextPageParam: lastPage => {
      const p = lastPage.pagination;
      if (!p || p.page >= p.totalPages) {
        return undefined;
      }
      return p.page + 1;
    },
    getPreviousPageParam: firstPage => {
      const p = firstPage.pagination;
      if (!p || p.page <= 1) {
        return undefined;
      }
      return p.page - 1;
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

// ======================== UPLOAD HOOKS ========================
export const useUploadImageMutation = () => {
  return useMutation({
    mutationFn: ({
      fileUri,
      folder = UploadFolder.PROFILES,
      filename,
    }: {
      fileUri: string;
      folder?: UploadFolder;
      filename?: string;
    }) => uploadService.uploadImage(fileUri, folder, filename),
  });
};

export const useUploadImagesMutation = () => {
  return useMutation({
    mutationFn: ({
      fileUris,
      folder = UploadFolder.PROFILES,
    }: {
      fileUris: string[];
      folder?: UploadFolder;
    }) => uploadService.uploadImages(fileUris, folder),
  });
};

export const useUploadBase64Mutation = () => {
  return useMutation({
    mutationFn: ({
      base64,
      folder = UploadFolder.COMMON,
    }: {
      base64: string;
      folder?: UploadFolder;
    }) => uploadService.uploadBase64(base64, folder),
  });
};

