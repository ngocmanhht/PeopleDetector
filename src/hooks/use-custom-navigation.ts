import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';

export function useCustomNavigation<T extends ParamListBase>() {
  return useNavigation<NavigationProp<T>>();
}
