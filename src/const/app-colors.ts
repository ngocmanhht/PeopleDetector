export const appColors = {
  pureWhite: '#FFFFFF',
  // Brand
  primary: '#355E3B',
  primaryLight: '#4E7A52',
  primaryDark: '#244128',

  secondary: '#A3C9A8',
  accent: '#C27C3D',

  // Semantic
  success: '#2E8B57',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  greenMaterial: '#2E8B57',
  amberMaterial: '#D97706',
  redMaterial: '#DC2626',

  // Light Semantic Banners
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  errorBg: '#FEE2E2',
  errorText: '#991B1B',
  successBg: '#D1FAE5',
  successText: '#065F46',
  zaloBlue: '#0068FF',
  momoPink: '#D82D8B',

  // Background
  background: '#F8F7F2',
  surface: '#FFFFFF',
  card: '#FCFCF8',

  // Border
  border: '#E5E7EB',
  divider: '#F3F4F6',

  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Icons
  iconPrimary: '#355E3B',
  iconSecondary: '#6B7280',

  // Buttons
  buttonPrimary: '#355E3B',
  buttonPrimaryPressed: '#244128',
  buttonSecondary: '#A3C9A8',
  buttonDisabled: '#D1D5DB',

  // Inputs
  inputBackground: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputFocused: '#355E3B',
  inputPlaceholder: '#9CA3AF',

  // Status
  online: '#2E8B57',
  offline: '#9CA3AF',

  // Slate Palette
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate150: '#EAEFF5',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',

  // Blue & Sky Palette
  blue900: '#1E3A8A',
  blue800: '#1E40AF',
  blue700: '#1D4ED8',
  blue600: '#2563EB',
  blue500: '#2196F3',
  blueBootstrap: '#007BFF',
  blue300: '#93C5FD',
  blue200: '#BFDBFE',
  blue100: '#DBEAFE',
  blue50: '#EFF6FF',
  sky600: '#0284C7',
  sky400: '#38BDF8',

  // Green & Emerald Palette
  emerald900: '#064E3B',
  emerald800: '#065F46',
  emerald700: '#047857',
  emerald600: '#059669',
  emerald500: '#10B981',
  emerald400: '#34D399',
  emerald300: '#6EE7B7',
  emerald200: '#A7F3D0',
  emerald100: '#D1FAE5',
  emerald50: '#ECFDF5',
  green700: '#15803D',
  green600: '#16A34A',
  green500: '#22C55E',
  green400: '#4CAF50',
  green300: '#86EFAC',
  green200: '#BBF7D0',
  green50: '#F0FDF4',

  // Amber & Yellow Palette
  amber900: '#78350F',
  amber800: '#92400E',
  amber700: '#B45309',
  amber600: '#D97706',
  amber500: '#FF9800',
  amber300: '#FCD34D',
  amber200: '#FDE68A',
  amber100: '#FEF3C7',
  amber50: '#FFFBEB',
  amberBg: '#FFFBEB',
  amberText: '#B45309',

  // Red Palette
  red700: '#B91C1C',
  red600: '#DC2626',
  red500: '#EF4444',
  red400: '#F44336',
  red300: '#FCA5A5',
  red200: '#FECACA',
  red100: '#FEE2E2',
  red50: '#FEF2F2',

  // Rose Palette
  rose900: '#881337',
  rose800: '#9F1239',
  rose700: '#BE123C',
  rose600: '#E11D48',
  rose500: '#F43F5E',
  rose200: '#FECDD3',
  rose100: '#FFE4E6',
  rose50: '#FFF1F2',

  // Purple Palette
  purple800: '#6B21A8',
  purple700: '#7E22CE',
  purple600: '#9333EA',
  purple500: '#A855F7',
  purple100: '#F3E8FF',
  purple50: '#FAF5FF',

  // Gray Palette
  gray700: '#4B5563',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray: '#8C8C8C',
  c999999: '#999999',
  cAAAAAA: '#AAAAAA',
  cDDDDDD: '#DDDDDD',
  c262526: '#262526',
  c333333: '#333333',
  c5C5F60: '#5C5F60',
  cE2E2E2: '#E2E2E2',
  cE8BCBA: '#E8BCBA',
  cE0E0E0: '#E0E0E0',
  cF3F3F4: '#F3F3F4',
  cF4F9F4: '#F4F9F4',

  // Overlays & Translucents
  overlay: 'rgba(31,41,55,0.5)',
  overlayDark65: 'rgba(15, 23, 42, 0.65)',
  overlayDark60: 'rgba(15, 23, 42, 0.6)',
  overlayDark75: 'rgba(15, 23, 42, 0.75)',
  cameraBorder: 'rgba(34, 197, 94, 0.4)',
  cameraSuccessBg: 'rgba(34, 197, 94, 0.92)',
  cameraTagBg: 'rgba(37, 99, 235, 0.85)',
  white10: 'rgba(255, 255, 255, 0.1)',
  loadingBg: 'rgba(0, 0, 0, 0.3)',

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type AppColors = typeof appColors;
