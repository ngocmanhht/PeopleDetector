import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Token } from '../../model/token';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AppState {
  isAuthenticated: boolean;
  currentUser: UserSession | null;
  token: Token | null;
}

const initialState: AppState = {
  isAuthenticated: false,
  currentUser: null,
  token: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    login: (
      state,
      action: PayloadAction<{ user: UserSession; token: Token } | UserSession>,
    ) => {
      state.isAuthenticated = true;
      if ('user' in action.payload && 'token' in action.payload) {
        state.currentUser = action.payload.user;
        state.token = action.payload.token;
      } else {
        state.currentUser = action.payload as UserSession;
      }
    },
    setToken: (state, action: PayloadAction<Token>) => {
      state.token = action.payload;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.token = null;
    },
  },
});

export const { login, setToken, logout } = appSlice.actions;

export const appReducer = appSlice.reducer;
