import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../../../components/app-text';
import { StopCircle } from 'lucide-react-native';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';

interface SessionControlsProps {
  onEndSession: () => void;
  isSessionActive: boolean;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  onEndSession,
  isSessionActive,
}) => {
  const { isPhone } = useResponsive();

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      <TouchableOpacity
        style={[
          styles.endButton,
          isPhone && styles.endButtonPhone,
          !isSessionActive && styles.endButtonDisabled,
        ]}
        onPress={onEndSession}
        disabled={!isSessionActive}
        activeOpacity={0.85}
      >
        <StopCircle size={isPhone ? 20 : 24} color={appColors.white} />
        <AppText style={[styles.buttonText, isPhone && styles.buttonTextPhone]}>
          Kết thúc phiên
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  containerPhone: {
    marginTop: 8,
    paddingTop: 0,
    paddingBottom: 20,
  },
  endButton: {
    backgroundColor: appColors.red500,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: appColors.red500,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  endButtonPhone: {
    height: 50,
    borderRadius: 12,
  },
  endButtonDisabled: {
    backgroundColor: appColors.slate300,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: appColors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  buttonTextPhone: {
    fontSize: 16,
  },
});
