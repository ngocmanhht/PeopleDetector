import React from 'react';
import {
  Text,
  TextStyle,
  StyleProp,
  StyleSheet,
  TextProps as RNTextProps,
  I18nManager,
  Platform,
} from 'react-native';
import { appFontSize } from '../../const/app-font';

/**
 * A mapping of font weight keys to their corresponding Inter font family names.
 *
 * Keys can be numeric strings representing font weights (e.g., '100', '400', '700')
 * or semantic names ('normal', 'bold'). The values are the names of the Inter font
 * variants to be used for each weight.
 *
 * Example usage:
 *   fontVariants['400'] // returns 'Inter-Regular'
 *   fontVariants['bold'] // returns 'Inter-Bold'
 */
const fontVariants: Record<string, string> = {
  '100': 'Inter-Thin',
  '200': 'Inter-ExtraLight',
  '300': 'Inter-Light',
  '400': 'Inter-Regular',
  '500': 'Inter-Medium',
  '600': 'Inter-SemiBold',
  '700': 'Inter-Bold',
  '800': 'Inter-ExtraBold',
  '900': 'Inter-Black',
  normal: 'Inter-Regular',
  bold: 'Inter-Bold',
};

/**
 * Returns the font family name based on the given weight and style.
 *
 * @param weight - The font weight, defaulting to '400'. Acceptable values
 * correspond to keys in the fontVariants map.
 * @param style - The font style, which can be 'italic' or undefined.
 *
 * @returns The concatenated font family name, appending 'Italic' if the style
 * is 'italic'.
 */

function getFontFamily(
  weight: string = '400',
  style?: TextStyle['fontStyle'],
): string {
  const font = fontVariants[weight] ?? '';
  const italic = style === 'italic' ? 'Italic' : '';
  return `${font}${italic}`;
}

type AppTextProps = RNTextProps & {
  style?: StyleProp<TextStyle>;
};

export function AppText({ style, ...rest }: AppTextProps) {
  const flattenedStyle = StyleSheet.flatten(style || {}) as TextStyle;
  const {
    fontWeight = '400',
    fontStyle,
    fontSize,
    lineHeight,
    writingDirection,
    textAlign,
  } = flattenedStyle;

  const fontFamily = getFontFamily(
    fontWeight?.toString?.() ?? '400',
    fontStyle,
  );

  return (
    <Text
      {...rest}
      allowFontScaling={rest.allowFontScaling ?? false}
      style={[
        style,
        {
          fontFamily,
          lineHeight:
            Platform.OS === 'ios'
              ? lineHeight ?? (fontSize ?? appFontSize.s14) * 1.5
              : fontSize
              ? undefined
              : undefined,
          writingDirection:
            writingDirection ?? (I18nManager.isRTL ? 'rtl' : 'ltr'),
          textAlign: textAlign ?? (I18nManager.isRTL ? 'right' : 'left'),
        },
      ]}
    />
  );
}
