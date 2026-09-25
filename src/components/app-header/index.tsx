import { Text, TouchableOpacity, View } from 'react-native';
import React, { ReactNode } from 'react';
import { navigationService } from '../../navigation/navigation-service.ts';
import AppSvg from '../app-svg/index.tsx';
import { appColors } from '../../const/app-colors.ts';

interface AppHeaderProps {
  title: string;
  onPressRight?: () => void;
  onPressLeft?: () => void;
  renderRightComponent?: () => ReactNode;
  renderLeftComponent?: () => ReactNode;
  labelRight?: string;
  isShowBack?: boolean;
}

export const AppHeader = ({
  title,
  onPressRight,
  onPressLeft,
  renderRightComponent,
  renderLeftComponent,
  labelRight,
  isShowBack = true,
}: AppHeaderProps) => {
  const goBack = () => {
    navigationService.goBack();
  };
  return (
    <View>
      <View style={{ flex: 2 }}>
        {isShowBack &&
          (renderLeftComponent ? (
            renderLeftComponent()
          ) : (
            <TouchableOpacity onPress={onPressLeft ? onPressLeft : goBack}>
              <AppSvg name="ArrowLeft" width={24} height={24} color={appColors.c262526} />
            </TouchableOpacity>
          ))}
      </View>

      <View style={{ flex: 4, justifyContent: 'center', alignItems: 'center' }}>
        <Text numberOfLines={1}>{title}</Text>
      </View>

      <View style={{ flex: 2 }}>
        {renderRightComponent ? (
          renderRightComponent()
        ) : (
          <TouchableOpacity onPress={onPressRight}>
            <Text>{labelRight}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
