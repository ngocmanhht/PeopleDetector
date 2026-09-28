import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { X, Check } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';

export interface PickerItem {
  id: string;
  label: string;
  subtitle?: string;
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
}) => {
  const { isPhone } = useResponsive();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={[styles.overlay, isPhone && styles.overlayPhone]}>
        <View style={[styles.modalContent, isPhone && styles.modalContentPhone]}>
          <View style={styles.header}>
            <AppText style={styles.title}>{title}</AppText>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[
                    styles.item,
                    isSelected && styles.itemActive,
                  ]}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <AppText
                      style={[
                        styles.itemLabel,
                        isSelected && styles.itemLabelActive,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.label}
                    </AppText>
                    {item.subtitle ? (
                      <AppText style={styles.itemSub} numberOfLines={1} ellipsizeMode="tail">
                        {item.subtitle}
                      </AppText>
                    ) : null}
                  </View>
                  {isSelected && <Check size={18} color={appColors.blue600} style={{ flexShrink: 0 }} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appColors.overlayDark60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayPhone: {
    padding: 16,
  },
  modalContent: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    width: '45%',
    maxHeight: '70%',
    padding: 20,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalContentPhone: {
    width: '100%',
    maxHeight: '80%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
    paddingBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: appColors.slate900,
  },
  closeBtn: {
    padding: 4,
    flexShrink: 0,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  itemActive: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue300,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.slate700,
    flexShrink: 1,
  },
  itemLabelActive: {
    color: appColors.blue700,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
    flexShrink: 1,
  },
});
