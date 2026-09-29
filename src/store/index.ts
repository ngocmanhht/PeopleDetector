import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore, Storage } from 'redux-persist';
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

// Persist configs
const persistConfig = {
  key: 'root',
  storage: storage,
  whitelist: ['app', 'detector'],
  // blacklist: [],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

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
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
