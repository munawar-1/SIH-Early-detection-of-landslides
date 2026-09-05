import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: 'NER Landslide Citizen Early Warning',
  slug: 'ner-landslide-citizen',
  owner: 'monu2007',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.sih.nerlandslide.citizen',
    infoPlist: {
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
      NSLocationWhenInUseUsageDescription: 'NER-Landslide GIS needs location permission to monitor nearby landslide hazard zones and warn you in high risk areas.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'NER-Landslide GIS uses background location to monitor slope stability in the North Eastern Region and issue emergency warnings.'
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a'
    },
    package: 'com.sih.nerlandslide.citizen',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'POST_NOTIFICATIONS'
    ]
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: ['expo-secure-store', 'expo-status-bar'],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ner-landslide-backend.onrender.com',
    mlApiBaseUrl: process.env.EXPO_PUBLIC_ML_API_BASE_URL || 'https://sih-early-detection-of-landslides.onrender.com',
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'ner-landslide-gis',
    eas: {
      projectId: '37c14176-e764-4107-9526-fc355c66102d'
    }
  }
});
