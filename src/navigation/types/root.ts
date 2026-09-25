import { NavigatorScreenParams } from '@react-navigation/native';
import { appScreens } from '../../const/app-screens';
import { AuthenticatedParamList } from './authenticated';
import { AuthenticationParamList } from './authentication';

export type RootNavigatorParamList = {
  [appScreens.Authentication]: NavigatorScreenParams<AuthenticationParamList>;
  [appScreens.Authenticated]: NavigatorScreenParams<AuthenticatedParamList>;
} & AuthenticationParamList &
  AuthenticatedParamList;
