import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore, Storage, createTransform } from 'redux-persist';
import { createMMKV } from 'react-native-mmkv';
import { appReducer } from './slices/appSlice';
import { uiReducer } from './slices/uiSlice';
import { detectorReducer } from './slices/detectorSlice';

// MMKV Storage

const mmkvStorage = createMMKV({
  id: 'people-detector-storage',
  encryptionKey: 'h2tech-people-detector-2026',
  encryptionType: 'AES-256',
});

export const storage: Storage = {
  setItem: (key, value) => {
    mmkvStorage.set(key, value);
    return Promise.resolve(true);
  },
  getItem: key => {
    const value = mmkvStorage.getString(key);
    return Promise.resolve(value);
  },
  removeItem: key => {
    mmkvStorage.remove(key);
    return Promise.resolve();
  },
};

// Combine reducer
const rootReducer = combineReducers({
  app: appReducer,
  ui: uiReducer,
  detector: detectorReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

// Transform to filter out high-frequency ephemeral fields (camera detection frames & 1-second ticks)
// and strip bulky base64 images from heavy AES-256 MMKV disk encryption while keeping all essential business data.
const detectorTransform = createTransform<any, any>(
  (inboundState: any) => {
    if (!inboundState || typeof inboundState !== 'object') return inboundState;
    const { sessionDurationSeconds, activeDetection, ...persistedState } =
      inboundState;

    // Sanitize scanHistory: retain top 50 entries and strip bulky nested base64 strings
    let sanitizedScanHistory = persistedState.scanHistory;
    if (Array.isArray(sanitizedScanHistory)) {
      sanitizedScanHistory = sanitizedScanHistory.slice(0, 50).map((item: any) => ({
        ...item,
        history: Array.isArray(item.history)
          ? item.history.slice(0, 3).map((h: any) => ({ ...h, avatarUri: undefined }))
          : [],
      }));
    }

    let sanitizedAlerts = persistedState.alerts;
    if (Array.isArray(sanitizedAlerts)) {
      sanitizedAlerts = sanitizedAlerts.slice(0, 30);
    }

    return {
      ...persistedState,
      scanHistory: sanitizedScanHistory,
      alerts: sanitizedAlerts,
    };
  },
  (outboundState: any) => {
    if (!outboundState || typeof outboundState !== 'object') return outboundState;
    return {
      ...outboundState,
      sessionDurationSeconds: 0,
      activeDetection: null,
    };
  },
  { whitelist: ['detector'] },
);

// Persist configs
const persistConfig: any = {
  key: 'root',
  storage: storage,
  whitelist: ['app', 'detector'],
  transforms: [detectorTransform],
};

const persistedReducer = persistReducer(persistConfig, rootReducer) as unknown as typeof rootReducer;

// Configure Redux store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/FLUSH',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }),
});

// Persistor
export const persistor = persistStore(store);

// Export types for TypeScript
export type AppDispatch = typeof store.dispatch;
