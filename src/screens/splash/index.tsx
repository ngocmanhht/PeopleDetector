import { StyleSheet, View, ActivityIndicator, Image } from 'react-native';
import React, { useEffect } from 'react';
import { useCustomNavigation } from '../../hooks/use-custom-navigation';
import { appScreens } from '../../const/app-screens';
import { RootNavigatorParamList } from '../../navigation/types/root';
import { useAppSelector } from '../../store/hooks';
import { AppText } from '../../components/app-text';
import { appColors } from '../../const/app-colors';
import { appImages } from '../../const/app-images';

const SplashScreen = () => {
  const navigation = useCustomNavigation<RootNavigatorParamList>();
  const isAuthenticated = useAppSelector(state => state.app.isAuthenticated);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.reset({
          index: 0,
          routes: [{ name: appScreens.Authenticated as never }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: appScreens.Authentication as never,
              params: { screen: appScreens.Login },
            },
          ],
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [navigation, isAuthenticated]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={appImages.logo}
          style={{ width: 60, height: 60, resizeMode: 'contain' }}
        />
      </View>

      <AppText style={styles.brandSub}>Hệ thống nhận diện CS2</AppText>
      <ActivityIndicator
        size="small"
        color={appColors.blue600}
        style={{ marginTop: 24 }}
      />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.slate900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: appColors.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: appColors.slate700,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitlePrimary: {
    fontSize: 28,
    fontWeight: '800',
    color: appColors.slate50,
    letterSpacing: -0.5,
  },
  brandTitleSecondary: {
    fontSize: 28,
    fontWeight: '800',
    color: appColors.sky400,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.slate400,
    letterSpacing: 2,
    marginTop: 4,
  },
});
