import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { useAppDispatch } from '../../store/hooks';
import { login } from '../../store/slices/appSlice';
import { useMutation } from '@tanstack/react-query';
import { useCustomNavigation } from '../../hooks/use-custom-navigation';
import { appScreens } from '../../const/app-screens';
import { RootNavigatorParamList } from '../../navigation/types/root';
import { useResponsive } from '../../hooks/use-responsive';
import { useAppToast } from '../../hooks/use-app-toast';
import {
  ScanFace,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Zap,
  CheckCircle2,
} from 'lucide-react-native';
import { appColors } from '../../const/app-colors';
import { authService } from '../../services/api';

export const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useCustomNavigation<RootNavigatorParamList>();
  const { showErrorToast } = useAppToast();

  const [email, setEmail] = useState('admin@vietcore.ai');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);

  // Real Backend API Login with JWT & Refresh Token support
  // Loading and error toast are automatically handled by queryClient default options
  const loginMutation = useMutation({
    mutationFn: async ({
      email: userEmail,
      password: userPassword,
    }: {
      email: string;
      password: string;
    }) => {
      return await authService.login({
        email: userEmail,
        password: userPassword,
      });
    },
    onSuccess: res => {
      const accessToken = res.access_token;
      const refreshToken = res.refresh_token;
      dispatch(
        login({
          user: res.user,
          token: { accessToken, refreshToken },
        }),
      );
      navigation.reset({
        index: 0,
        routes: [{ name: appScreens.Authenticated as never }],
      });
    },
  });

  const handleLogin = (customEmail?: string, customPassword?: string) => {
    const targetEmail = (
      customEmail !== undefined ? customEmail : email
    ).trim();
    const targetPassword = (
      customPassword !== undefined ? customPassword : password
    ).trim();

    if (!targetEmail) {
      showErrorToast('Vui lòng nhập email hoặc tài khoản.');
      return;
    }
    if (!targetPassword) {
      showErrorToast('Vui lòng nhập mật khẩu.');
      return;
    }

    loginMutation.mutate({
      email: targetEmail,
      password: targetPassword,
    });
  };

  const { isPhone } = useResponsive();

  const renderFormContent = (isPhoneLayout: boolean = false) => (
    <View style={isPhoneLayout ? styles.phoneFormCard : styles.formCard}>
      <AppText style={isPhoneLayout ? styles.phoneFormTitle : styles.formTitle}>
        Đăng nhập hệ thống
      </AppText>
      <AppText style={styles.formSubtitle}>
        Nhập tài khoản quản trị để bắt đầu phiên làm việc
      </AppText>
      {/* Email input */}
      <View style={styles.inputGroup}>
        <AppText style={styles.inputLabel}>Tài khoản / Email</AppText>
        <View style={styles.inputWrapper}>
          <Mail size={18} color={appColors.slate400} />
          <TextInput
            style={styles.textInput}
            placeholder="admin@vietcore.ai"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={appColors.slate400}
          />
        </View>
      </View>
      {/* Password input */}
      <View style={styles.inputGroup}>
        <AppText style={styles.inputLabel}>Mật khẩu</AppText>
        <View style={styles.inputWrapper}>
          <Lock size={18} color={appColors.slate400} />
          <TextInput
            style={styles.textInput}
            placeholder="Mật khẩu..."
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor={appColors.slate400}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
          >
            {showPassword ? (
              <EyeOff size={18} color={appColors.slate400} />
            ) : (
              <Eye size={18} color={appColors.slate400} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* Submit Button */}
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => handleLogin()}
        disabled={loginMutation.isPending}
        activeOpacity={0.85}
      >
        <LogIn size={18} color={appColors.white} />
        <AppText style={styles.loginBtnText}>Đăng nhập</AppText>
      </TouchableOpacity>
      {/* Quick Login Admin Button */}
      <TouchableOpacity
        style={styles.mockLoginBtn}
        onPress={() => {
          setEmail('admin@vietcore.ai');
          setPassword('123456');
          handleLogin('admin@vietcore.ai', '123456');
        }}
        disabled={loginMutation.isPending}
        activeOpacity={0.85}
      >
        <Zap size={18} color={appColors.blue600} />
        <AppText style={styles.mockLoginBtnText}>
          Đăng nhập nhanh tài khoản Admin
        </AppText>
      </TouchableOpacity>
      <AppText style={styles.hintText}>
        Tài khoản thử nghiệm:{' '}
        <AppText style={styles.hintBold}>admin@vietcore.ai</AppText> /{' '}
        <AppText style={styles.hintBold}>123456</AppText>
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {isPhone ? (
        <ScrollView
          style={styles.phoneScrollView}
          contentContainerStyle={styles.phoneScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Compact Brand Presentation for Phone */}
          <View style={styles.phoneBrandWrap}>
            <View style={styles.phoneIconCircle}>
              <ScanFace size={38} color={appColors.sky400} />
            </View>

            <View style={styles.logoRow}>
              <AppText style={styles.phoneBrandTitlePrimary}>VietCore</AppText>
              <AppText style={styles.phoneBrandTitleSecondary}> AI</AppText>
            </View>
            <AppText style={styles.phoneBrandSub}>
              HỆ THỐNG ĐIỂM DANH KHUÔN MẶT
            </AppText>
          </View>

          {renderFormContent(true)}
        </ScrollView>
      ) : (
        /* Original Tablet 2-column Landscape */
        <View style={styles.container}>
          {/* Left Side: Brand presentation */}
          <View style={styles.leftBrandCol}>
            <View style={styles.iconCircle}>
              <ScanFace size={52} color={appColors.sky400} />
            </View>

            <View style={styles.logoRow}>
              <AppText style={styles.brandTitlePrimary}>H2Tech</AppText>
              <AppText style={styles.brandTitleSecondary}> AI</AppText>
            </View>
            <AppText style={styles.brandSub}>
              FACE CHECK • TABLET SYSTEM
            </AppText>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={appColors.emerald400} />
                <AppText style={styles.featureText}>
                  Nhận diện khuôn mặt thời gian thực
                </AppText>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={appColors.emerald400} />
                <AppText style={styles.featureText}>
                  Quản lý Khu & Phòng học/làm việc linh hoạt
                </AppText>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={appColors.emerald400} />
                <AppText style={styles.featureText}>
                  Đối soát danh sách & cảnh báo vắng mặt tự động
                </AppText>
              </View>
            </View>
          </View>

          {/* Right Side: Login Card */}
          <View style={styles.rightFormCol}>{renderFormContent(false)}</View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appColors.slate900,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 40,
  },
  leftBrandCol: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: appColors.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.slate700,
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitlePrimary: {
    fontSize: 34,
    fontWeight: '900',
    color: appColors.slate50,
    letterSpacing: -1,
  },
  brandTitleSecondary: {
    fontSize: 34,
    fontWeight: '900',
    color: appColors.sky400,
    letterSpacing: -1,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: '800',
    color: appColors.slate400,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 32,
  },
  featuresList: {
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: appColors.slate300,
    fontSize: 15,
    fontWeight: '500',
  },
  rightFormCol: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: appColors.white,
    borderRadius: 24,
    padding: 32,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: appColors.slate900,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: appColors.slate500,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate700,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: appColors.slate900,
  },
  eyeBtn: {
    padding: 4,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.blue600,
    height: 50,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  loginBtnText: {
    color: appColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  mockLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.blue50,
    borderWidth: 1,
    borderColor: appColors.blue200,
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  mockLoginBtnText: {
    color: appColors.blue600,
    fontSize: 14,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    color: appColors.slate400,
    textAlign: 'center',
  },
  hintBold: {
    color: appColors.slate600,
    fontWeight: '700',
  },
  phoneScrollView: {
    flex: 1,
    backgroundColor: appColors.slate900,
  },
  phoneScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  phoneBrandWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  phoneIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: appColors.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.slate700,
    marginBottom: 12,
  },
  phoneBrandTitlePrimary: {
    fontSize: 26,
    fontWeight: '900',
    color: appColors.slate50,
    letterSpacing: -0.5,
  },
  phoneBrandTitleSecondary: {
    fontSize: 26,
    fontWeight: '900',
    color: appColors.sky400,
    letterSpacing: -0.5,
  },
  phoneBrandSub: {
    fontSize: 10,
    fontWeight: '700',
    color: appColors.slate400,
    letterSpacing: 2,
    marginTop: 4,
  },
  phoneFormCard: {
    width: '100%',
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 6,
  },
  phoneFormTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: appColors.slate900,
    marginBottom: 4,
  },
});
