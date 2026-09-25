import { createStackNavigator } from '@react-navigation/stack';
import { appScreens } from '../../const/app-screens';
import { LoginScreen } from '../../screens/login';
import RegisterScreen from '../../screens/register';
import SplashScreen from '../../screens/splash';
import { AuthenticationParamList } from '../types/authentication';

const AuthenticationStack = createStackNavigator<AuthenticationParamList>();

export const AuthenticationNavigator = () => {
  return (
    <AuthenticationStack.Navigator
      initialRouteName={appScreens.Splash}
      screenOptions={{ headerShown: false }}
    >
      <AuthenticationStack.Screen
        name={appScreens.Splash}
        component={SplashScreen}
      />
      <AuthenticationStack.Screen
        name={appScreens.Login}
        component={LoginScreen}
      />
      <AuthenticationStack.Screen
        name={appScreens.Register}
        component={RegisterScreen}
      />
    </AuthenticationStack.Navigator>
  );
};
