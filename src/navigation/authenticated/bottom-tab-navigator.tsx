import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { appScreens } from '../../const/app-screens';
import HomeScreen from '../../screens/home';
import { BottomTabParamList } from '../types/authenticated';

const BottomTab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator = () => {
  return (
    <BottomTab.Navigator
      initialRouteName={appScreens.Home}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <BottomTab.Screen name={appScreens.Home} component={HomeScreen} />
    </BottomTab.Navigator>
  );
};
