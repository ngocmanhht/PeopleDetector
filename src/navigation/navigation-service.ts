import {
  createNavigationContainerRef,
  NavigationContainerRefWithCurrent,
} from '@react-navigation/native';
import { RootNavigatorParamList } from './types/root';

class NavigationService {
  public navigationRef: NavigationContainerRefWithCurrent<RootNavigatorParamList>;

  constructor() {
    this.navigationRef = createNavigationContainerRef<RootNavigatorParamList>();
  }

  public navigate<T extends keyof RootNavigatorParamList>(
    name: T,
    params?: RootNavigatorParamList[T],
  ) {
    if (this.navigationRef.isReady()) {
      (this.navigationRef.navigate as (screen: T, p?: RootNavigatorParamList[T]) => void)(name, params);
    }
  }

  public goBack() {
    if (this.navigationRef.isReady() && this.navigationRef.canGoBack()) {
      this.navigationRef.goBack();
    }
  }

  public reset<T extends keyof RootNavigatorParamList>(
    routeName: T,
    params?: RootNavigatorParamList[T],
  ) {
    if (this.navigationRef.isReady()) {
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
    }
  }
}

export const navigationService = new NavigationService();
