import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { appScreens } from '../../const/app-screens';
import { DrawerContainer } from './drawer-container';
import { AuthenticatedParamList } from '../types/authenticated';

const AuthenticatedStack = createStackNavigator<AuthenticatedParamList>();

export const AuthenticatedNavigator = () => {
  return (
    <AuthenticatedStack.Navigator
      initialRouteName={appScreens.BottomTab}
      screenOptions={{ headerShown: false }}
    >
      <AuthenticatedStack.Screen
        name={appScreens.BottomTab}
        component={DrawerContainer}
      />
    </AuthenticatedStack.Navigator>
  );
};
