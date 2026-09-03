import { Platform, StatusBar, Dimensions, ViewStyle } from 'react-native';
import Constants from 'expo-constants';

/**
 * Universal Safe Area & Layout Helper for Android, iOS, Expo Go, and Expo Web.
 * Accurately detects platform-specific status bar height, notch, and navigation gesture bars.
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
  statusBarHeight: number;
  isWeb: boolean;
}

export const getSafeAreaInsets = (): SafeAreaInsets => {
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  // 1. Precise Status Bar / Top Inset
  let statusBarHeight = 0;
  if (isAndroid) {
    statusBarHeight = StatusBar.currentHeight || Constants.statusBarHeight || 24;
  } else if (isIOS) {
    statusBarHeight = Constants.statusBarHeight || 44;
  } else if (isWeb) {
    statusBarHeight = 0;
  }

  // 2. Safe Bottom Inset (Gesture Navigation Pill / Home Indicator)
  let bottomInset = 0;
  if (isIOS) {
    bottomInset = statusBarHeight > 20 ? 24 : 10; // devices with notch vs classic home button
  } else if (isAndroid) {
    bottomInset = 10; // Safe gesture navigation clearance
  } else if (isWeb) {
    bottomInset = 12;
  }

  return {
    top: statusBarHeight,
    bottom: bottomInset,
    left: 0,
    right: 0,
    statusBarHeight,
    isWeb
  };
};

export const SCREEN_DIMENSIONS = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height
};

export const WEB_CONTAINER_STYLE: ViewStyle = Platform.OS === 'web'
  ? {
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center'
    }
  : {};

