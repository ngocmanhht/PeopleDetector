import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { useAppDispatch } from '../../store/hooks';
import { login } from '../../store/slices/appSlice';
import { setAppLoading } from '../../store/slices/uiSlice';
import { useMutation } from '@tanstack/react-query';
import { useCustomNavigation } from '../../hooks/use-custom-navigation';
import { appScreens } from '../../const/app-screens';
import { RootNavigatorParamList } from '../../navigation/types/root';
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

export const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useCustomNavigation<RootNavigatorParamList>();

  const [email, setEmail] = useState('admin@vietcore.ai');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Use TanStack Query useMutation + uiSlice for loading control
  const loginMutation = useMutation({
    mutationFn: async ({
      email: userEmail,
      role,
    }: {
      email: string;
      role: string;
    }) => {
      // Mock network delay
      await new Promise(resolve => setTimeout(() => resolve(undefined), 800));
      return {
        id: 'admin-01',
        name: role,
        email: userEmail,
        role: 'ADMIN',
      };
    },
    onMutate: () => {
      dispatch(setAppLoading(true));
      setErrorMessage('');
    },
    onSuccess: user => {
      dispatch(login(user));
      navigation.reset({
        index: 0,
        routes: [{ name: appScreens.Authenticated as never }],
      });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Đăng nhập không thành công.');
    },
    onSettled: () => {
      dispatch(setAppLoading(false));
    },
  });

  const handleLogin = (mockRole: string = 'Quản trị viên') => {
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập email hoặc tài khoản.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    loginMutation.mutate({
      email: email.trim(),
      role: mockRole,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        {/* Left Side: Brand presentation */}
        <View style={styles.leftBrandCol}>
          <View style={styles.iconCircle}>
            <ScanFace size={52} color={appColors.sky400} />
          </View>

          <View style={styles.logoRow}>
            <AppText style={styles.brandTitlePrimary}>VietCore</AppText>
            <AppText style={styles.brandTitleSecondary}> AI</AppText>
          </View>
          <AppText style={styles.brandSub}>FACE CHECK • TABLET SYSTEM</AppText>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle2 size={18} color={appColors.emerald400} />
              <AppText style={styles.featureText}>
                Nhận diện khuôn mặt thời gian thực bằng YOLO
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
        <View style={styles.rightFormCol}>
          <View style={styles.formCard}>
            <AppText style={styles.formTitle}>Đăng nhập hệ thống</AppText>
            <AppText style={styles.formSubtitle}>
              Nhập tài khoản quản trị để bắt đầu phiên làm việc
            </AppText>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText}>{errorMessage}</AppText>
              </View>
            ) : null}

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
              onPress={() => handleLogin('Quản trị viên')}
              disabled={loginMutation.isPending}
              activeOpacity={0.85}
            >
              <LogIn size={18} color={appColors.white} />
              <AppText style={styles.loginBtnText}>Đăng nhập</AppText>
            </TouchableOpacity>

            {/* Quick Mock Login Button */}
            <TouchableOpacity
              style={styles.mockLoginBtn}
              onPress={() => {
                setEmail('admin@vietcore.ai');
                setPassword('123456');
                handleLogin('Admin Quản Trị');
              }}
              disabled={loginMutation.isPending}
              activeOpacity={0.85}
            >
              <Zap size={18} color={appColors.blue600} />
              <AppText style={styles.mockLoginBtnText}>
                Đăng nhập nhanh (Mock Login Admin)
              </AppText>
            </TouchableOpacity>

            <AppText style={styles.hintText}>
              Tài khoản thử nghiệm:{' '}
              <AppText style={styles.hintBold}>admin@vietcore.ai</AppText> /{' '}
              <AppText style={styles.hintBold}>123456</AppText>
            </AppText>
          </View>
        </View>
      </View>
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
  errorBox: {
    backgroundColor: appColors.red50,
    borderWidth: 1,
    borderColor: appColors.red300,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: appColors.red600,
    fontSize: 12,
    fontWeight: '600',
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
});
