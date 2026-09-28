import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { useAppSelector } from '../../store/hooks';
import {
  LayoutDashboard,
  DoorOpen,
  Bell,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ScanFace,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { appColors } from '../../const/app-colors';
import { useResponsive } from '../../hooks/use-responsive';

// Screen Tabs
import HomeScreen from '../../screens/home';
import { RoomsManagerScreen } from '../../screens/rooms-manager';
import { CmsScreen } from '../../screens/cms';
import { AlertsScreen } from '../../screens/alerts';
import { SettingsScreen } from '../../screens/settings';
import { useBackendSync } from '../../hooks/use-backend-sync';

export type DrawerTabKey = 'home' | 'rooms' | 'cms' | 'alerts' | 'settings';

export const DrawerContainer: React.FC = () => {
  useBackendSync();
  const { isTablet, isPhone } = useResponsive();
  const [activeTab, setActiveTab] = useState<DrawerTabKey>('home');
  const [isExpanded, setIsExpanded] = useState(false);

  // Animations
  const sidebarWidth = useRef(new Animated.Value(74)).current;

  // Alerts & Rooms count for badges
  const alerts = useAppSelector(state => state.detector.alerts);
  const rooms = useAppSelector(state => state.detector.rooms);
  const unreadAlerts = alerts.filter(a => a.type === 'warning').length;

  const toggleExpand = () => {
    const toValue = isExpanded ? 74 : 240;
    Animated.spring(sidebarWidth, {
      toValue,
      friction: 8,
      tension: 50,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const navItems = [
    {
      key: 'home' as DrawerTabKey,
      label: 'Trang chủ',
      subtitle: 'Quét nhận diện AI',
      icon: LayoutDashboard,
    },
    {
      key: 'rooms' as DrawerTabKey,
      label: 'Danh sách phòng',
      subtitle: `${rooms.length} phòng học/xưởng`,
      icon: DoorOpen,
      badge: `${rooms.length}`,
    },
    {
      key: 'cms' as DrawerTabKey,
      label: 'Quản trị CMS',
      subtitle: 'Tình trạng & Báo cáo',
      icon: ShieldCheck,
    },
    {
      key: 'alerts' as DrawerTabKey,
      label: 'Cảnh báo',
      subtitle: 'Sự kiện hệ thống',
      icon: Bell,
      badge: unreadAlerts > 0 ? `${unreadAlerts}` : undefined,
      badgeDanger: true,
    },
    {
      key: 'settings' as DrawerTabKey,
      label: 'Cài đặt',
      subtitle: 'Hệ thống & Đăng xuất',
      icon: Settings,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.container, isPhone && styles.containerPhone]}>
        {/* Left Permanent Animated Drawer for Tablet */}
        {isTablet && (
          <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
            {/* Top Brand / Toggle Header */}
            <View style={styles.sidebarHeader}>
              {isExpanded ? (
                <View style={styles.expandedBrand}>
                  <View style={styles.brandIconWrap}>
                    <ScanFace size={24} color={appColors.blue600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.brandTitle}>VietCore AI</AppText>
                    <AppText style={styles.brandSubtitle}>FACE CHECK</AppText>
                  </View>
                  <TouchableOpacity
                    style={styles.toggleBtn}
                    onPress={toggleExpand}
                    activeOpacity={0.7}
                  >
                    <PanelLeftClose size={20} color={appColors.slate500} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.toggleBtnCollapsed}
                  onPress={toggleExpand}
                  activeOpacity={0.7}
                >
                  <PanelLeftOpen size={24} color={appColors.blue600} />
                </TouchableOpacity>
              )}
            </View>

            {/* Navigation Menu Items */}
            <View style={styles.menuList}>
              {navItems.map(item => {
                const isActive = activeTab === item.key;
                const IconComponent = item.icon;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.navItem,
                      isActive && styles.navItemActive,
                      !isExpanded && styles.navItemCollapsed,
                    ]}
                    onPress={() => setActiveTab(item.key)}
                    activeOpacity={0.8}
                  >
                    {/* Icon wrap */}
                    <View
                      style={[
                        styles.iconContainer,
                        isActive && styles.iconContainerActive,
                      ]}
                    >
                      <IconComponent
                        size={!isExpanded ? 24 : 20}
                        color={isActive ? appColors.white : appColors.slate500}
                      />
                      {/* Collapsed dot badge */}
                      {!isExpanded && Boolean(item.badge) && (
                        <View
                          style={[
                            styles.dotBadge,
                            item.badgeDanger ? styles.dotBadgeDanger : null,
                          ]}
                        />
                      )}
                    </View>

                    {/* Expanded text info */}
                    {isExpanded && (
                      <View style={styles.labelWrapper}>
                        <AppText
                          style={[
                            styles.navLabel,
                            isActive && styles.navLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </AppText>
                        <AppText style={styles.navSub} numberOfLines={1}>
                          {item.subtitle}
                        </AppText>
                      </View>
                    )}

                    {/* Expanded Badge */}
                    {isExpanded && Boolean(item.badge) && (
                      <View
                        style={[
                          styles.badgePill,
                          item.badgeDanger ? styles.badgePillDanger : null,
                        ]}
                      >
                        <AppText
                          style={[
                            styles.badgePillText,
                            item.badgeDanger ? styles.badgePillTextDanger : null,
                          ]}
                        >
                          {item.badge}
                        </AppText>
                      </View>
                    )}

                    {/* Active Indicator Chevron */}
                    {isExpanded && isActive && !item.badge && (
                      <ChevronRight size={16} color={appColors.blue600} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Sidebar Info / Mini toggle */}
            {isExpanded && (
              <View style={styles.sidebarFooter}>
                <View style={styles.systemStatusDot} />
                <AppText style={styles.systemStatusText}>
                  System Online • v1.0
                </AppText>
              </View>
            )}
          </Animated.View>
        )}

        {/* Content Area: Persistent Mounted Screens */}
        <View style={styles.contentArea}>
          <View
            style={[
              styles.screenWrapper,
              activeTab !== 'home' && styles.hiddenScreen,
            ]}
            pointerEvents={activeTab === 'home' ? 'auto' : 'none'}
          >
            <HomeScreen isTabFocused={activeTab === 'home'} />
          </View>

          <View
            style={[
              styles.screenWrapper,
              activeTab !== 'rooms' && styles.hiddenScreen,
            ]}
            pointerEvents={activeTab === 'rooms' ? 'auto' : 'none'}
          >
            <RoomsManagerScreen />
          </View>

          <View
            style={[
              styles.screenWrapper,
              activeTab !== 'cms' && styles.hiddenScreen,
            ]}
            pointerEvents={activeTab === 'cms' ? 'auto' : 'none'}
          >
            <CmsScreen />
          </View>

          <View
            style={[
              styles.screenWrapper,
              activeTab !== 'alerts' && styles.hiddenScreen,
            ]}
            pointerEvents={activeTab === 'alerts' ? 'auto' : 'none'}
          >
            <AlertsScreen />
          </View>

          <View
            style={[
              styles.screenWrapper,
              activeTab !== 'settings' && styles.hiddenScreen,
            ]}
            pointerEvents={activeTab === 'settings' ? 'auto' : 'none'}
          >
            <SettingsScreen />
          </View>
        </View>

        {/* Bottom Tab Bar for iPhone */}
        {isPhone && (
          <View style={styles.bottomTabBar}>
            {navItems.map(item => {
              const isActive = activeTab === item.key;
              const IconComponent = item.icon;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.bottomTabBtn}
                  onPress={() => setActiveTab(item.key)}
                  activeOpacity={0.75}
                >
                  <View style={styles.bottomTabIconWrap}>
                    <IconComponent
                      size={22}
                      color={isActive ? appColors.blue600 : appColors.slate400}
                    />
                    {Boolean(item.badge) && (
                      <View
                        style={[
                          styles.bottomBadge,
                          item.badgeDanger ? styles.badgePillDanger : null,
                        ]}
                      >
                        <AppText style={styles.bottomBadgeText}>{item.badge}</AppText>
                      </View>
                    )}
                  </View>
                  <AppText
                    style={[
                      styles.bottomTabText,
                      isActive && styles.bottomTabTextActive,
                    ]}
                  >
                    {item.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: appColors.slate50,
  },
  sidebar: {
    backgroundColor: appColors.white,
    borderRightWidth: 1,
    borderRightColor: appColors.slate200,
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: appColors.black,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  sidebarHeader: {
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  expandedBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appColors.blue200,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: appColors.slate900,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: appColors.slate500,
    letterSpacing: 1.2,
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate50,
  },
  toggleBtnCollapsed: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: appColors.blue50,
  },
  menuList: {
    flex: 1,
    paddingTop: 16,
    gap: 8,
    paddingHorizontal: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    backgroundColor: appColors.transparent,
  },
  navItemCollapsed: {
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: appColors.blue50,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: appColors.slate50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: appColors.blue600,
  },
  dotBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.blue600,
  },
  dotBadgeDanger: {
    backgroundColor: appColors.red500,
  },
  labelWrapper: {
    flex: 1,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.slate600,
  },
  navLabelActive: {
    color: appColors.blue700,
    fontWeight: '700',
  },
  navSub: {
    fontSize: 11,
    color: appColors.slate400,
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: appColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgePillDanger: {
    backgroundColor: appColors.red100,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: appColors.slate600,
  },
  badgePillTextDanger: {
    color: appColors.red600,
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
    gap: 8,
  },
  systemStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.emerald500,
  },
  systemStatusText: {
    fontSize: 11,
    color: appColors.slate500,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  hiddenScreen: {
    display: 'none',
  },
  containerPhone: {
    flexDirection: 'column',
  },
  bottomTabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: appColors.white,
    borderTopWidth: 1,
    borderTopColor: appColors.slate200,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  bottomTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomTabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bottomTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: appColors.slate500,
  },
  bottomTabTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  bottomBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: appColors.blue600,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBadgeText: {
    color: appColors.white,
    fontSize: 9,
    fontWeight: '700',
  },
});
