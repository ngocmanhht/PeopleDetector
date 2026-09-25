import { RouteProp, useRoute } from '@react-navigation/native';

export function useCustomRoute<
  ParamList extends Record<string, object | undefined>,
  RouteName extends keyof ParamList,
>() {
  const route = useRoute<RouteProp<ParamList, RouteName>>();
  return {
    route,
    params: route.params,
  };
}
