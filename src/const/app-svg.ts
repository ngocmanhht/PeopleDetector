import { SvgProps } from 'react-native-svg';
import Success from '../assets/svg/success.svg';
import Warning from '../assets/svg/warning.svg';
import Infor from '../assets/svg/infor.svg';
import Error from '../assets/svg/error.svg';
import ArrowLeft from '../assets/svg/arrow-left.svg';

export const appSvg = {
  success: Success,
  warning: Warning,
  infor: Infor,
  error: Error,
  ArrowLeft,
} as const;

export type AppSvgKey = keyof typeof appSvg;
export type AppSvgProps = SvgProps & { name: AppSvgKey };
