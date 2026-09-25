/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/root-navigator';
import { NavigationContainer } from '@react-navigation/native';
import { navigationService } from './src/navigation/navigation-service';
import AppLoadingIndicator from './src/components/app-loading-indicator';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/services/query-client';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/config/toast-config';
import { Provider } from 'react-redux';
import { persistor, store } from './src/store';
import { PersistGate } from 'redux-persist/integration/react';

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <GestureHandlerRootView>
              <StatusBar barStyle="default" />
              <NavigationContainer ref={navigationService.navigationRef}>
                <RootNavigator />
                <Toast config={toastConfig} />
              </NavigationContainer>
              <AppLoadingIndicator />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
