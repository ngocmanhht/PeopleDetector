import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppSelector } from '../../../store/hooks';
import { FileSpreadsheet, Share2 } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/use-responsive';
import { appColors } from '../../../const/app-colors';
import { exportMonthlyAttendanceExcel } from '../../../services/excel-export-service';
import { styles } from '../styles';

export const CmsReportsTab: React.FC = () => {
  const { isTablet } = useResponsive();
  const { sessions, userProfiles, rooms, zones } = useAppSelector(
    state => state.detector,
  );

  // Reports / Excel Export State
  const now = new Date();
  const [exportMonth, setExportMonth] = useState<number>(now.getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(now.getFullYear());
  const [exportRoomId, setExportRoomId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Export Excel handler
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const result = await exportMonthlyAttendanceExcel({
        month: exportMonth,
        year: exportYear,
        roomId: exportRoomId === 'all' ? undefined : exportRoomId,
        sessions,
        userProfiles,
        rooms,
        zones,
      });
      // The service swallows errors and returns { success: false }, so surface them here
      if (result && !result.success) {
        Alert.alert(
          'Lỗi xuất báo cáo',
          (result as { message?: string }).message || 'Không thể tạo file Excel',
        );
      }
    } catch (e: any) {
      Alert.alert('Lỗi xuất báo cáo', e?.message || 'Không thể tạo file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView
      style={styles.scrollBody}
      contentContainerStyle={[
        styles.scrollContent,
        isTablet && styles.scrollContentTablet,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <FileSpreadsheet size={22} color={appColors.blue600} />
          <View>
            <AppText style={styles.cardTitle}>
              Xuất báo cáo Excel định kỳ theo tháng
            </AppText>
            <AppText style={styles.cardDesc}>
              Xuất file .xlsx chuẩn 3 sheet: Tổng hợp chuyên cần, Chi tiết điểm
              danh và Nhật ký CMS
            </AppText>
          </View>
        </View>

        {/* Month & Year Selectors */}
        <View style={styles.reportFormRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.fieldLabel}>Chọn Tháng:</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.monthChipsRow}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.monthChip,
                      exportMonth === m && styles.monthChipActive,
                    ]}
                    onPress={() => setExportMonth(m)}
                  >
                    <AppText
                      style={[
                        styles.monthChipText,
                        exportMonth === m && styles.monthChipTextActive,
                      ]}
                    >
                      T{m}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={{ width: 140 }}>
            <AppText style={styles.fieldLabel}>Chọn Năm:</AppText>
            <View style={styles.yearChipsRow}>
              {[2025, 2026, 2027].map(y => (
                <TouchableOpacity
                  key={y}
                  style={[
                    styles.yearChip,
                    exportYear === y && styles.yearChipActive,
                  ]}
                  onPress={() => setExportYear(y)}
                >
                  <AppText
                    style={[
                      styles.yearChipText,
                      exportYear === y && styles.yearChipTextActive,
                    ]}
                  >
                    {y}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Room Filter */}
        <View style={{ marginTop: 14 }}>
          <AppText style={styles.fieldLabel}>
            Lọc theo phòng (hoặc chọn tất cả):
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.roomChipsRow}>
              <TouchableOpacity
                style={[
                  styles.roomFilterChip,
                  exportRoomId === 'all' && styles.roomFilterChipActive,
                ]}
                onPress={() => setExportRoomId('all')}
              >
                <AppText
                  style={[
                    styles.roomFilterChipText,
                    exportRoomId === 'all' &&
                      styles.roomFilterChipTextActive,
                  ]}
                >
                  Tất cả phòng ({rooms.length})
                </AppText>
              </TouchableOpacity>

              {rooms.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roomFilterChip,
                    exportRoomId === r.id && styles.roomFilterChipActive,
                  ]}
                  onPress={() => setExportRoomId(r.id)}
                >
                  <AppText
                    style={[
                      styles.roomFilterChipText,
                      exportRoomId === r.id &&
                        styles.roomFilterChipTextActive,
                    ]}
                  >
                    {r.name}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Metrics preview */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <AppText style={styles.metricValue}>{sessions.length}</AppText>
            <AppText style={styles.metricLabel}>Tổng phiên ghi nhận</AppText>
          </View>

          <View style={styles.metricCard}>
            <AppText style={styles.metricValue}>
              {userProfiles.length}
            </AppText>
            <AppText style={styles.metricLabel}>Tổng số nhân sự</AppText>
          </View>

          <View style={styles.metricCard}>
            <AppText style={styles.metricValue}>
              {
                userProfiles.filter(
                  u => (u.conditionStatus || 'normal') !== 'normal',
                ).length
              }
            </AppText>
            <AppText style={styles.metricLabel}>Trạng thái đặc biệt</AppText>
          </View>
        </View>

        {/* Export Action Button */}
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExportExcel}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={appColors.white} />
          ) : (
            <>
              <Share2 size={18} color={appColors.white} />
              <AppText style={styles.exportBtnText}>
                Xuất file Excel tháng {exportMonth}/{exportYear}
              </AppText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
