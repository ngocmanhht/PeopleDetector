import { createStackNavigator } from '@react-navigation/stack';
import { appScreens } from '../const/app-screens';
import { AuthenticationNavigator } from './authentication/authentication-navigator';
import { AuthenticatedNavigator } from './authenticated/authenticated-navigator';
import { RootNavigatorParamList } from './types/root';

const RootStack = createStackNavigator<RootNavigatorParamList>();

export const RootNavigator = () => {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen
        name={appScreens.Authentication}
        component={AuthenticationNavigator}
      />
      <RootStack.Screen
        name={appScreens.Authenticated}
        component={AuthenticatedNavigator}
      />
    </RootStack.Navigator>
  );
};
