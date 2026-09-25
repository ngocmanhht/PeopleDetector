import React from 'react';
import { View } from 'react-native';
import AppSvg from '../components/app-svg';
import { AppText } from '../components/app-text';
import { AppSvgKey } from '../const/app-svg';
import { appColors } from '../const/app-colors';

interface ToastBaseProps {
  text1: string;
  text2?: string;
  bgColor: string;
  icon: AppSvgKey;
}

const ToastBase = ({ bgColor, icon, text1, text2 }: ToastBaseProps) => (
  <View
    style={{
      backgroundColor: bgColor,
      padding: 16,
      borderRadius: 10,
      marginHorizontal: 16,
      flexDirection: 'row',
    }}
  >
    <AppSvg
      name={icon}
      width={24}
      height={24}
      fill={appColors.white}
      style={{ marginRight: 12, alignSelf: 'center' }}
    />
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <AppText style={{ color: appColors.white, fontWeight: 'bold' }}>{text1}</AppText>
      {text2 && <AppText style={{ color: appColors.white }}>{text2}</AppText>}
    </View>
  </View>
);

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <ToastBase text1={text1} text2={text2} bgColor={appColors.greenMaterial} icon="success" />
  ),
  error: ({ text1, text2 }: any) => (
    <ToastBase text1={text1} text2={text2} bgColor={appColors.redMaterial} icon="error" />
  ),
  info: ({ text1, text2 }: any) => (
    <ToastBase text1={text1} text2={text2} bgColor={appColors.blue500} icon="infor" />
  ),
  warn: ({ text1, text2 }: any) => (
    <ToastBase text1={text1} text2={text2} bgColor={appColors.amberMaterial} icon="warning" />
  ),
};
