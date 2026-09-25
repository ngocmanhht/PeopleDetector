import React, { useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  I18nManager,
  Platform,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { AppText } from '../app-text';
import { LucideEye, LucideEyeOff } from 'lucide-react-native';
import { appFontSize } from '../../const/app-font';
import { appColors } from '../../const/app-colors';

type StatusType = 'default' | 'success' | 'warning' | 'error';

type AppTextInputProps = TextInputProps & {
  label?: string;
  error?: string;
  secure?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  status?: StatusType;
  containerStyle?: ViewStyle;
  inputWrapperStyle?: ViewStyle;
};

export const AppTextInput = ({
  label,
  error,
  secure = false,
  leftIcon,
  rightIcon,
  status = 'default',
  style,
  multiline,
  containerStyle,
  inputWrapperStyle,
  editable,
  ...rest
}: AppTextInputProps) => {
  const [secureText, setSecureText] = useState(secure);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const borderColor = {
    default: appColors.cDDDDDD,
    success: appColors.greenMaterial,
    warning: appColors.amberMaterial,
    error: appColors.redMaterial,
  }[status || (error ? 'error' : 'default')];

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <AppText style={styles.label}>{label}</AppText>}

      <View
        style={[
          styles.inputWrapper,
          { borderColor },
          inputWrapperStyle,
          editable === false && { backgroundColor: appColors.cF3F3F4 },
        ]}
      >
        {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            style,
            {
              height: multiline ? height : undefined,
              color: editable === false ? appColors.gray : appColors.black,
              fontSize: appFontSize.s14,
            },
          ]}
          editable={editable}
          placeholderTextColor={appColors.cAAAAAA}
          secureTextEntry={secureText}
          multiline={multiline}
          onContentSizeChange={e =>
            multiline && setHeight(e.nativeEvent.contentSize.height + 10)
          }
          textAlign={I18nManager.isRTL ? 'right' : 'left'}
          {...rest}
        />
        {secure && (
          <TouchableOpacity onPress={() => setSecureText(!secureText)}>
            {secureText ? <LucideEyeOff /> : <LucideEye />}
          </TouchableOpacity>
        )}
        {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>

      {!!error && <AppText style={styles.errorText}>{error}</AppText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: appFontSize.s14,
    color: appColors.c333333,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: appColors.white,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: appColors.black,
    padding: 0,
  },
  icon: {
    marginRight: 4,
  },
  errorText: {
    marginTop: 4,
    color: appColors.redMaterial,
    fontSize: 12,
  },
});
