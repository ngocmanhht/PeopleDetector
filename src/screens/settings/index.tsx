import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { AppText } from '../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/appSlice';
import { useCustomNavigation } from '../../hooks/use-custom-navigation';
import { appScreens } from '../../const/app-screens';
import { RootNavigatorParamList } from '../../navigation/types/root';
import {
  Settings as SettingsIcon,
  LogOut,
  User,
  Shield,
  Sliders,
  Camera,
  Info,
  Tablet,
  Lock,
  Unlock,
  KeyRound,
} from 'lucide-react-native';
import { appColors } from '../../const/app-colors';
import { useResponsive } from '../../hooks/use-responsive';
import { authService } from '../../services/api';
import { useKiosk } from '../../hooks/use-kiosk';
import { useAppToast } from '../../hooks/use-app-toast';
import { KioskExitModal } from '../tablet-detector/components/KioskExitModal';
import { ChangePinModal } from './components/ChangePinModal';
import { RefreshButton } from '../../components/refresh-button';

export const SettingsScreen: React.FC = () => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const navigation = useCustomNavigation<RootNavigatorParamList>();
  const currentUser = useAppSelector(state => state.app.currentUser);

  // Settings states
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [targetFps, setTargetFps] = useState(30);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSessionReset, setAutoSessionReset] = useState(false);

  // Kiosk Hook & Modals
  const {
    isKioskActive,
    isDeviceOwner,
    autoKiosk,
    startKiosk,
    setAutoKiosk,
    refreshStatus,
  } = useKiosk();
  const [kioskExitModalVisible, setKioskExitModalVisible] = useState(false);
  const [changePinModalVisible, setChangePinModalVisible] = useState(false);
  const { showSuccessToast, showWarnToast } = useAppToast();

  const token = useAppSelector(state => state.app.token);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất hệ thống',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản quản trị hiện tại không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            if (token?.refreshToken) {
              authService.logout(token.refreshToken).catch(err => {
                console.log('[Settings] Logout error on BE:', err);
              });
            }
            dispatch(logout());
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: appScreens.Authentication as never,
                  params: { screen: appScreens.Login },
                },
              ],
            });
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isPhone && styles.contentPhone]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, isPhone && styles.headerPhone]}>
        <View style={styles.headerIconWrap}>
          <SettingsIcon size={isPhone ? 22 : 26} color={appColors.blue600} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText
            style={[styles.headerTitle, isPhone && styles.headerTitlePhone]}
          >
            {isPhone ? 'Cài đặt hệ thống' : 'Cài đặt & Quản trị Hệ thống'}
          </AppText>
          <AppText style={styles.headerSub} numberOfLines={isPhone ? 1 : 2}>
            Cấu hình tham số AI nhận diện, camera và quản lý phiên đăng nhập
          </AppText>
        </View>
        <RefreshButton size={isPhone ? 34 : 38} iconSize={isPhone ? 16 : 18} />
      </View>

      <View
        style={[styles.gridContainer, isPhone && styles.gridContainerPhone]}
      >
        {/* Left Column: Account & Logout */}
        <View style={styles.column}>
          {/* User Account Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <User size={20} color={appColors.blue600} />
              <AppText style={styles.cardTitle}>Tài khoản hiện tại</AppText>
            </View>

            <View style={styles.accountRow}>
              <View style={styles.avatarWrap}>
                <AppText style={styles.avatarInitial}>
                  {(currentUser?.name || 'A')[0]}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.accountName}>
                  {currentUser?.name || 'Quản trị viên'}
                </AppText>
                <AppText style={styles.accountEmail}>
                  {currentUser?.email || 'admin@cscns2.ag'}
                </AppText>
                <View style={styles.roleBadge}>
                  <Shield size={12} color={appColors.emerald600} />
                  <AppText style={styles.roleBadgeText}>
                    {currentUser?.role || 'ADMIN'}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <LogOut size={18} color={appColors.white} />
              <AppText style={styles.logoutBtnText}>
                Đăng xuất khỏi thiết bị
              </AppText>
            </TouchableOpacity>
          </View>

          {/* System Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Info size={20} color={appColors.slate500} />
              <AppText style={styles.cardTitle}>Thông tin ứng dụng</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Phiên bản:</AppText>
              <AppText style={styles.infoValue}>
                v1.0.0 (Tablet Landscape)
              </AppText>
            </View>
          </View>

          {/* Kiosk Mode (Samsung Tablet) Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Tablet size={20} color={appColors.blue600} />
              <AppText style={styles.cardTitle}>Chế độ Kiosk (Samsung Tablet)</AppText>
            </View>

            {/* Device Owner Status */}
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Quyền Device Owner:</AppText>
              <View
                style={[
                  styles.statusBadge,
                  isDeviceOwner
                    ? styles.statusBadgeActive
                    : styles.statusBadgeWarn,
                ]}
              >
                <AppText
                  style={[
                    styles.statusBadgeText,
                    isDeviceOwner
                      ? styles.statusBadgeTextActive
                      : styles.statusBadgeTextWarn,
                  ]}
                >
                  {isDeviceOwner ? 'Đã kích hoạt' : 'Chưa cấp (ADB)'}
                </AppText>
              </View>
            </View>

            {/* Kiosk Lock Status */}
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Trạng thái LockTask:</AppText>
              <View
                style={[
                  styles.statusBadge,
                  isKioskActive
                    ? styles.statusBadgeDanger
                    : styles.statusBadgeNeutral,
                ]}
              >
                <AppText
                  style={[
                    styles.statusBadgeText,
                    isKioskActive
                      ? styles.statusBadgeTextDanger
                      : styles.statusBadgeTextNeutral,
                  ]}
                >
                  {isKioskActive ? 'Đang khóa Kiosk' : 'Chưa khóa'}
                </AppText>
              </View>
            </View>

            {/* Auto Kiosk Switch */}
            <View style={styles.kioskSwitchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText style={styles.kioskSwitchLabel}>
                  Tự động ghim Kiosk
                </AppText>
                <AppText style={styles.kioskSwitchSub}>
                  Tự động ghim app vào Kiosk khi vào màn hình điểm danh
                </AppText>
              </View>
              <Switch
                value={autoKiosk}
                onValueChange={setAutoKiosk}
                trackColor={{
                  false: appColors.slate300,
                  true: appColors.blue600,
                }}
                thumbColor={appColors.white}
              />
            </View>

            {/* Quick Actions */}
            <View style={{ gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[
                  styles.kioskActionBtn,
                  isKioskActive ? styles.kioskStopBtn : styles.kioskStartBtn,
                ]}
                onPress={() => {
                  if (isKioskActive) {
                    setKioskExitModalVisible(true);
                  } else {
                    startKiosk().then(ok => {
                      if (ok) {
                        showSuccessToast(
                          'Kiosk Mode',
                          'Đã kích hoạt chế độ Kiosk thành công.',
                        );
                      } else {
                        showWarnToast(
                          'Kiosk Mode',
                          'Vui lòng cấp quyền Device Owner hoặc ghim màn hình.',
                        );
                      }
                    });
                  }
                }}
                activeOpacity={0.85}
              >
                {isKioskActive ? (
                  <>
                    <Unlock size={16} color={appColors.white} />
                    <AppText style={styles.kioskActionBtnText}>
                      Thoát chế độ Kiosk (Nhập PIN)
                    </AppText>
                  </>
                ) : (
                  <>
                    <Lock size={16} color={appColors.white} />
                    <AppText style={styles.kioskActionBtnText}>
                      Kích hoạt chế độ Kiosk ngay
                    </AppText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changePinBtn}
                onPress={() => setChangePinModalVisible(true)}
                activeOpacity={0.8}
              >
                <KeyRound size={16} color={appColors.slate700} />
                <AppText style={styles.changePinBtnText}>
                  Đổi mã PIN Quản trị viên
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Right Column: AI & Camera Configurations */}
        <View style={styles.column}>
          {/* AI Settings */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Sliders size={20} color={appColors.blue600} />
              <AppText style={styles.cardTitle}>Cấu hình nhận diện</AppText>
            </View>

            {/* Confidence Threshold */}
            <View style={styles.settingItem}>
              <View>
                <AppText style={styles.settingLabel}>
                  Ngưỡng tin cậy (Confidence Threshold)
                </AppText>
                <AppText style={styles.settingDesc}>
                  Chỉ xác nhận điểm danh khi độ tin cậy đạt từ mức này trở lên
                </AppText>
              </View>
              <View style={styles.thresholdChips}>
                {[75, 80, 85, 90, 95].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.thresholdChip,
                      confidenceThreshold === val && styles.thresholdChipActive,
                    ]}
                    onPress={() => setConfidenceThreshold(val)}
                  >
                    <AppText
                      style={[
                        styles.thresholdChipText,
                        confidenceThreshold === val &&
                          styles.thresholdChipTextActive,
                      ]}
                    >
                      {val}%
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target FPS */}
            <View style={styles.settingItem}>
              <View>
                <AppText style={styles.settingLabel}>
                  Tốc độ quét nhận diện (FPS)
                </AppText>
                <AppText style={styles.settingDesc}>
                  Số khung hình quét mỗi giây cho mô hình
                </AppText>
              </View>
              <View style={styles.thresholdChips}>
                {[15, 30, 60].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.thresholdChip,
                      targetFps === val && styles.thresholdChipActive,
                    ]}
                    onPress={() => setTargetFps(val)}
                  >
                    <AppText
                      style={[
                        styles.thresholdChipText,
                        targetFps === val && styles.thresholdChipTextActive,
                      ]}
                    >
                      {val} FPS
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sound switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.settingLabel}>
                  Âm thanh thông báo
                </AppText>
                <AppText style={styles.settingDesc}>
                  Phát âm thanh bíp khi nhận diện điểm danh thành công
                </AppText>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{
                  false: appColors.slate300,
                  true: appColors.blue300,
                }}
                thumbColor={
                  soundEnabled ? appColors.blue600 : appColors.slate100
                }
              />
            </View>
          </View>

          {/* Camera Settings */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Camera size={20} color={appColors.blue600} />
              <AppText style={styles.cardTitle}>Cấu hình Camera</AppText>
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.settingLabel}>
                  Tự động làm mới điểm danh khi đổi phòng
                </AppText>
                <AppText style={styles.settingDesc}>
                  Đặt lại danh sách điểm danh khi người dùng chọn phòng khác
                </AppText>
              </View>
              <Switch
                value={autoSessionReset}
                onValueChange={setAutoSessionReset}
                trackColor={{
                  false: appColors.slate300,
                  true: appColors.blue300,
                }}
                thumbColor={
                  autoSessionReset ? appColors.blue600 : appColors.slate100
                }
              />
            </View>
          </View>
        </View>
      </View>

      {/* Kiosk Modals */}
      <KioskExitModal
        visible={kioskExitModalVisible}
        onClose={() => setKioskExitModalVisible(false)}
        onSuccess={() => {
          refreshStatus();
        }}
      />

      <ChangePinModal
        visible={changePinModalVisible}
        onClose={() => setChangePinModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.slate50,
  },
  content: {
    padding: 24,
  },
  contentPhone: {
    padding: 12,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: appColors.white,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
    marginBottom: 20,
  },
  headerPhone: {
    padding: 14,
    gap: 10,
    marginBottom: 14,
    borderRadius: 14,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: appColors.slate900,
  },
  headerTitlePhone: {
    fontSize: 18,
  },
  headerSub: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  gridContainerPhone: {
    flexDirection: 'column',
    gap: 14,
  },
  column: {
    flex: 1,
    gap: 20,
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: appColors.slate200,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.slate900,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: appColors.blue600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: appColors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: appColors.slate900,
  },
  accountEmail: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: appColors.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: appColors.emerald200,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.emerald600,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.red600,
    height: 48,
    borderRadius: 12,
    gap: 8,
    shadowColor: appColors.red600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutBtnText: {
    color: appColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate50,
  },
  infoLabel: {
    fontSize: 13,
    color: appColors.slate500,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: appColors.slate900,
    fontWeight: '600',
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate800,
  },
  settingDesc: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
    marginBottom: 8,
  },
  thresholdChips: {
    flexDirection: 'row',
    gap: 8,
  },
  thresholdChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  thresholdChipActive: {
    backgroundColor: appColors.blue600,
    borderColor: appColors.blue600,
  },
  thresholdChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate600,
  },
  thresholdChipTextActive: {
    color: appColors.white,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusBadgeWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusBadgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusBadgeNeutral: {
    backgroundColor: appColors.slate100,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextActive: {
    color: appColors.emerald600,
  },
  statusBadgeTextWarn: {
    color: appColors.amber600,
  },
  statusBadgeTextDanger: {
    color: appColors.red600,
  },
  statusBadgeTextNeutral: {
    color: appColors.slate600,
  },
  kioskSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
    marginTop: 6,
  },
  kioskSwitchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate800,
  },
  kioskSwitchSub: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 2,
  },
  kioskActionBtn: {
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  kioskStartBtn: {
    backgroundColor: appColors.blue600,
  },
  kioskStopBtn: {
    backgroundColor: appColors.red600,
  },
  kioskActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.white,
  },
  changePinBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.slate300,
    backgroundColor: appColors.slate50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  changePinBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate700,
  },
});
