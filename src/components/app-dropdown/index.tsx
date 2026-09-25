import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { AppText } from '../app-text';
import { appColors } from '../../const/app-colors';
import { appFontSize } from '../../const/app-font';
import {
  ChevronDown,
  Search,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';

export interface DropdownOption {
  label: string;
  value: string;
}

export interface AppDropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  error?: string;
}

export const AppDropdown: React.FC<AppDropdownProps> = ({
  label,
  placeholder = 'Chọn một tùy chọn...',
  options,
  selectedValue,
  onSelect,
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === selectedValue);
  }, [options, selectedValue]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  const handleSelectOption = (value: string) => {
    onSelect(value);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label && <AppText style={styles.label}>{label}</AppText>}

      <TouchableOpacity
        style={[
          styles.triggerBox,
          error ? styles.triggerError : null,
          modalVisible ? styles.triggerActive : null,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <AppText
          style={[
            styles.selectedText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </AppText>
        <ChevronDown size={20} color={appColors.textSecondary} />
      </TouchableOpacity>

      {error && <AppText style={styles.errorText}>{error}</AppText>}

      {/* Modern Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View style={styles.sheetContainer}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <AppText style={styles.headerTitle}>
                {label || 'Vui lòng chọn'}
              </AppText>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <X size={20} color={appColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input inside modal for fast filtering */}
            {options.length > 5 && (
              <View style={styles.searchBox}>
                <Search size={18} color={appColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm bưu cục..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={appColors.textTertiary}
                />
              </View>
            )}

            <ScrollView contentContainerStyle={styles.optionList}>
              {filteredOptions.length === 0 ? (
                <AppText style={styles.emptyText}>
                  Không tìm thấy bưu cục phù hợp.
                </AppText>
              ) : (
                filteredOptions.map(item => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemActive,
                      ]}
                      onPress={() => handleSelectOption(item.value)}
                    >
                      {isSelected ? (
                        <CheckCircle2 size={18} color={appColors.primary} />
                      ) : (
                        <Circle size={18} color={appColors.textTertiary} />
                      )}
                      <AppText
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelActive,
                        ]}
                      >
                        {item.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: appFontSize.s12,
    fontWeight: '700',
    color: appColors.primary,
    marginBottom: 6,
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: appColors.surface,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
  },
  triggerActive: {
    borderColor: appColors.primary,
  },
  triggerError: {
    borderColor: appColors.error,
  },
  selectedText: {
    fontSize: appFontSize.s13,
    color: appColors.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: appColors.textTertiary,
    fontWeight: '400',
  },
  errorText: {
    fontSize: appFontSize.s11,
    color: appColors.error,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: appColors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: appColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: appColors.primary,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  headerTitle: {
    fontSize: appFontSize.s15,
    fontWeight: '800',
    color: appColors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: appFontSize.s13,
    color: appColors.textPrimary,
    paddingVertical: 0,
  },
  optionList: {
    paddingVertical: 10,
    gap: 8,
  },
  emptyText: {
    fontSize: appFontSize.s13,
    color: appColors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.background,
    gap: 10,
  },
  optionItemActive: {
    borderColor: appColors.primary,
    backgroundColor: appColors.cF4F9F4,
  },
  optionLabel: {
    fontSize: appFontSize.s13,
    color: appColors.textPrimary,
    flex: 1,
  },
  optionLabelActive: {
    color: appColors.primary,
    fontWeight: '700',
  },
});
