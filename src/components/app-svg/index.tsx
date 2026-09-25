import React from 'react';
import { appSvg, AppSvgProps } from '../../const/app-svg';

export default function AppSvg({ name, ...svgProps }: AppSvgProps) {
  const IconComponent = appSvg[name];
  return <IconComponent {...svgProps} />;
}
