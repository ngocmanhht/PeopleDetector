import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AppState {
  isAuthenticated: boolean;
  currentUser: UserSession | null;
}

const initialState: AppState = {
  isAuthenticated: false,
  currentUser: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<UserSession>) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.currentUser = null;
    },
  },
});

export const { login, logout } = appSlice.actions;

export const appReducer = appSlice.reducer;
