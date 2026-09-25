import React, { useState } from 'react';
import { Switch, StyleSheet } from 'react-native';
import { appColors } from '../../const/app-colors';

type AppSwitchProps = {
  value?: boolean;
  onValueChange?: (val: boolean) => void;
};

const AppSwitch: React.FC<AppSwitchProps> = ({
  value = false,
  onValueChange,
}) => {
  // const [isEnabled, setIsEnabled] = useState(value);

  const toggleSwitch = (val: boolean) => {
    // setIsEnabled(val);
    onValueChange?.(val);
  };

  return (
    <Switch
      value={value}
      onValueChange={toggleSwitch}
      trackColor={{
        false: appColors.cE0E0E0,
        true: appColors.primary,
      }}
      thumbColor={appColors.white}
      ios_backgroundColor={appColors.cE0E0E0}
      style={styles.switch}
    />
  );
};

const styles = StyleSheet.create({
  switch: {
    transform: [{ scaleX: 1 }, { scaleY: 1 }],
  },
});

export default AppSwitch;
