import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';

// Define initial state interface
interface UiState {
  isLoading: boolean;
}

// Initial state
const initialState: UiState = {
  isLoading: false,
};

// Create slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAppLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

// Export actions
export const { setAppLoading } = uiSlice.actions;

// Export selectors
export const getAppLoading = (state: RootState) => state.ui.isLoading;

// Export reducer
export const uiReducer = uiSlice.reducer;
