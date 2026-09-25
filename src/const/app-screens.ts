export const authenticationScreens = {
  Login: 'Login',
  Register: 'Register',
  Splash: 'Splash',
} as const;
export const authenticatedScreens = {
  BottomTab: 'BottomTab',
  Home: 'Home',
} as const;

export const appScreens = {
  ...authenticatedScreens,
  ...authenticationScreens,
  Authentication: 'Authentication',
  Authenticated: 'Authenticated',
} as const;
