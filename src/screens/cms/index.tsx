import React, { useState, useMemo, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { AppText } from '../../components/app-text';
import { useAppSelector } from '../../store/hooks';
import {
  ScanFace,
  Users,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react-native';
import { useResponsive } from '../../hooks/use-responsive';
import { appColors } from '../../const/app-colors';
import { CmsSubTab } from './types';
import { styles } from './styles';
import { CmsScanStatusTab } from './components/CmsScanStatusTab';
import { CmsUserListTab } from './components/CmsUserListTab';
import { CmsReportsTab } from './components/CmsReportsTab';

interface TabItem {
  id: CmsSubTab;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

export const CmsScreen: React.FC = () => {
  const { isPhone } = useResponsive();
  const { userProfiles } = useAppSelector(state => state.detector);
  const currentUser = useAppSelector(state => state.app.currentUser);

  // Sub-tabs navigation using Enum
  const [subTab, setSubTab] = useState<CmsSubTab>(CmsSubTab.SCAN_STATUS);

  // Selected User for Face Scan & Condition Management
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    userProfiles[0]?.id || null,
  );

  // Memoized tabs configuration array
  const tabItems: TabItem[] = useMemo(
    () => [
      {
        id: CmsSubTab.SCAN_STATUS,
        label: 'Quét & Cập nhật',
        icon: ScanFace,
      },
      {
        id: CmsSubTab.USER_LIST,
        label: `Danh sách (${userProfiles.length})`,
        icon: Users,
      },
      {
        id: CmsSubTab.REPORTS,
        label: 'Báo cáo Excel',
        icon: FileSpreadsheet,
      },
    ],
    [userProfiles.length],
  );

  // Callback passed to UserListTab to avoid recreating function on re-renders
  const handleSelectUserFromList = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setSubTab(CmsSubTab.SCAN_STATUS);
  }, []);

  // Content switcher
  const renderTabContent = () => {
    switch (subTab) {
      case CmsSubTab.SCAN_STATUS:
        return (
          <CmsScanStatusTab
            selectedUserId={selectedUserId}
            onSelectUserId={setSelectedUserId}
          />
        );
      case CmsSubTab.USER_LIST:
        return <CmsUserListTab onSelectUser={handleSelectUserFromList} />;
      case CmsSubTab.REPORTS:
        return <CmsReportsTab />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Banner */}
      <View style={[styles.headerBanner, isPhone && styles.headerBannerPhone]}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeShield}>
            <ShieldCheck size={22} color={appColors.blue600} />
          </View>
          <View>
            <View style={styles.headerTitleRow}>
              <AppText style={styles.headerTitle}>Hệ thống Quản trị CMS</AppText>
              <View style={styles.adminRoleTag}>
                <AppText style={styles.adminRoleTagText}>Admin Portal</AppText>
              </View>
            </View>
            <AppText style={styles.headerSubtitle} numberOfLines={1}>
              {currentUser
                ? `Đăng nhập bởi: ${currentUser.name || currentUser.email}`
                : 'Cập nhật tình trạng nhân sự, duyệt danh sách & xuất báo cáo'}
            </AppText>
          </View>
        </View>

        {/* Sub-tab Navigation (Array Map) */}
        <View style={styles.subTabNav}>
          {tabItems.map(tab => {
            const isActive = subTab === tab.id;
            const Icon = tab.icon;
            const iconColor = isActive ? appColors.blue600 : appColors.slate500;

            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.subTabBtn, isActive && styles.subTabBtnActive]}
                onPress={() => setSubTab(tab.id)}
              >
                <Icon size={16} color={iconColor} />
                <AppText
                  style={[
                    styles.subTabBtnText,
                    isActive && styles.subTabBtnTextActive,
                  ]}
                >
                  {tab.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Content Body */}
      {renderTabContent()}
    </View>
  );
};

export default CmsScreen;
