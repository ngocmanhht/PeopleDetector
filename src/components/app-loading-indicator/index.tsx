import React from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';
import { appColors } from '../../const/app-colors';
import { useSelector } from 'react-redux';
import { getAppLoading } from '../../store/slices/uiSlice';

const AppLoadingIndicator = () => {
  const isLoading = useSelector(getAppLoading);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isLoading}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View
        style={{
          backgroundColor: appColors.loadingBg,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    </Modal>
  );
};

export default AppLoadingIndicator;
