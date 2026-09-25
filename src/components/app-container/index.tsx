import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
  ViewStyle,
} from 'react-native';
import { appPadding } from '../../const/app-font';
import { appColors } from '../../const/app-colors';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppContainerProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  backgroundColor?: string;
};

export const AppContainer = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  keyboardAvoiding = true,
  backgroundColor = appColors.white,
}: AppContainerProps) => {
  const Wrapper = scrollable ? ScrollView : View;

  const commonStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    padding: appPadding.screen,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  };

  const content = (
    <Wrapper
      style={[commonStyle, style]}
      {...(scrollable
        ? {
            contentContainerStyle: [
              { paddingBottom: 20 },
              contentContainerStyle,
            ],
          }
        : {})}
    >
      {children}
    </Wrapper>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      {keyboardAvoiding && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={64}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};
