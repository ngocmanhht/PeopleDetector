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
      this.navigationRef.navigate(name as any, params as any);
    }
  }

  public goBack() {
    if (this.navigationRef.isReady() && this.navigationRef.canGoBack()) {
      this.navigationRef.goBack();
    }
  }

  public reset(routeName: keyof RootNavigatorParamList, params?: any) {
    if (this.navigationRef.isReady()) {
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
    }
  }
}

export const navigationService = new NavigationService();
