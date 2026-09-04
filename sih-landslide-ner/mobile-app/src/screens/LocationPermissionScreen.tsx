import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import { startBackgroundLocationTracking } from '../services/backgroundLocationTask';
import { APP_COLORS } from '../constants/theme';

interface LocationPermissionScreenProps {
  onPermissionComplete: () => void;
}

export const LocationPermissionScreen: React.FC<LocationPermissionScreenProps> = ({ onPermissionComplete }) => {
  const [requesting, setRequesting] = useState<boolean>(false);

  const handleGrantPermissions = async () => {
    setRequesting(true);
    try {
      // 1. Request Foreground Permission
      try {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus === 'granted') {
          // 2. Safely attempt Background Permission
          try {
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus === 'granted') {
              await startBackgroundLocationTracking().catch(() => {});
            }
          } catch (bgErr) {
            console.log('Background permission skipped in Expo Go:', bgErr);
          }
        }
      } catch (locErr) {
        console.warn('Location request error in Expo Go:', locErr);
      }

      onPermissionComplete();
    } catch (err) {
      console.error('Permission handler error:', err);
      onPermissionComplete();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>📍</Text>
      </View>

      <Text style={styles.title}>Enable Spatial Landslide Monitoring</Text>
      <Text style={styles.description}>
        To protect you against sudden slope failures and rockfalls in Dima Hasao and the North Eastern Region, we match your coordinates against high-resolution GIS hazard grids.
      </Text>

      <View style={styles.featureBox}>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🛡️</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Foreground Hazard Assessment</Text>
            <Text style={styles.featureSub}>Instant spatial check when opening the app or tapping "Re-Assess".</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🔔</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>SMS Early Warning Dispatch</Text>
            <Text style={styles.featureSub}>Delivers high-priority emergency SMS alerts when slope saturation reaches critical thresholds.</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🔒</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Privacy & Offline Protection</Text>
            <Text style={styles.featureSub}>Works with offline on-device client cache even without internet connectivity.</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleGrantPermissions}
        disabled={requesting}
        accessibilityRole="button"
        accessibilityLabel="Enable Location Protection"
      >
        <Text style={styles.primaryButtonText}>Enable Location Protection</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={onPermissionComplete}
        accessibilityRole="button"
        accessibilityLabel="Skip for now"
      >
        <Text style={styles.skipButtonText}>Skip for now (Manual Mode)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: APP_COLORS.bgSurface,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  iconText: {
    fontSize: 32
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2
  },
  description: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20
  },
  featureBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2
  },
  featureTextCol: {
    flex: 1
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: APP_COLORS.textPrimary
  },
  featureSub: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16
  },
  primaryButton: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    height: 48,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  skipButton: {
    paddingVertical: 8
  },
  skipButtonText: {
    color: APP_COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600'
  }
});
