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
} from 'lucide-react-native';
import { appColors } from '../../const/app-colors';

export const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useCustomNavigation<RootNavigatorParamList>();
  const currentUser = useAppSelector(state => state.app.currentUser);

  // Settings states
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [targetFps, setTargetFps] = useState(30);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSessionReset, setAutoSessionReset] = useState(false);

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
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <SettingsIcon size={26} color={appColors.blue600} />
        </View>
        <View>
          <AppText style={styles.headerTitle}>Cài đặt & Quản trị Hệ thống</AppText>
          <AppText style={styles.headerSub}>
            Cấu hình tham số AI nhận diện, camera và quản lý phiên đăng nhập
          </AppText>
        </View>
      </View>

      <View style={styles.gridContainer}>
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
                  {currentUser?.email || 'admin@vietcore.ai'}
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
              <AppText style={styles.logoutBtnText}>Đăng xuất khỏi thiết bị</AppText>
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
              <AppText style={styles.infoValue}>v1.0.0 (Tablet Landscape)</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Engine nhận diện:</AppText>
              <AppText style={styles.infoValue}>YOLOv8-Face Detection</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Vision Camera:</AppText>
              <AppText style={styles.infoValue}>v4.7.3 (Hardware Accelerated)</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Môi trường:</AppText>
              <AppText style={styles.infoValue}>React Native New Architecture</AppText>
            </View>
          </View>
        </View>

        {/* Right Column: AI & Camera Configurations */}
        <View style={styles.column}>
          {/* AI Settings */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Sliders size={20} color={appColors.blue600} />
              <AppText style={styles.cardTitle}>Cấu hình nhận diện YOLO</AppText>
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
                        confidenceThreshold === val && styles.thresholdChipTextActive,
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
                <AppText style={styles.settingLabel}>Tốc độ quét nhận diện (FPS)</AppText>
                <AppText style={styles.settingDesc}>
                  Số khung hình quét mỗi giây cho mô hình YOLO
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
                <AppText style={styles.settingLabel}>Âm thanh thông báo</AppText>
                <AppText style={styles.settingDesc}>
                  Phát âm thanh bíp khi nhận diện điểm danh thành công
                </AppText>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: appColors.slate300, true: appColors.blue300 }}
                thumbColor={soundEnabled ? appColors.blue600 : appColors.slate100}
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
                trackColor={{ false: appColors.slate300, true: appColors.blue300 }}
                thumbColor={autoSessionReset ? appColors.blue600 : appColors.slate100}
              />
            </View>
          </View>
        </View>
      </View>
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
  headerSub: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 20,
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
});
