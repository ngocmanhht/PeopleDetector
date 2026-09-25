import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { AppText } from '../app-text';
import { appColors } from '../../const/app-colors';

interface AppBottomSheetProps {
  visible?: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export const AppBottomSheet: React.FC<AppBottomSheetProps> = ({
  visible = false,
  title,
  children,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText style={styles.title}>{title}</AppText>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={appColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appColors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: appColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    paddingBottom: 20,
  },
});
