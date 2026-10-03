import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LogIn, LogOut } from 'lucide-react-native';
import { AppText } from '../../../components/app-text';
import { appColors } from '../../../const/app-colors';
import { ScanDirection } from '../../../model/detector';

interface ScanDirectionToggleProps {
  value: ScanDirection;
  onChange: (direction: ScanDirection) => void;
}

/**
 * Chốt loại quét tại điểm quét: VÀO (IN) hoặc RA (OUT).
 * Mọi lượt quét sau khi chọn sẽ được gắn type tương ứng.
 */
export const ScanDirectionToggle: React.FC<ScanDirectionToggleProps> = ({
  value,
  onChange,
}) => {
  const isIn = value === 'in';
  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>Chốt quét:</AppText>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.btn, isIn && styles.btnIn]}
          onPress={() => onChange('in')}
          activeOpacity={0.85}
        >
          <LogIn size={15} color={isIn ? appColors.white : appColors.slate500} />
          <AppText style={[styles.btnText, isIn && styles.btnTextActive]}>
            VÀO (IN)
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, !isIn && styles.btnOut]}
          onPress={() => onChange('out')}
          activeOpacity={0.85}
        >
          <LogOut
            size={15}
            color={!isIn ? appColors.white : appColors.slate500}
          />
          <AppText style={[styles.btnText, !isIn && styles.btnTextActive]}>
            RA (OUT)
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.slate600,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: appColors.slate100,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnIn: { backgroundColor: appColors.emerald600 },
  btnOut: { backgroundColor: appColors.red600 },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate500,
  },
  btnTextActive: { color: appColors.white },
});
