import React from 'react';
import TabletDetectorScreen from '../tablet-detector';

interface HomeScreenProps {
  isTabFocused?: boolean;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ isTabFocused = true }) => {
  return <TabletDetectorScreen isTabFocused={isTabFocused} />;
};

export default HomeScreen;
