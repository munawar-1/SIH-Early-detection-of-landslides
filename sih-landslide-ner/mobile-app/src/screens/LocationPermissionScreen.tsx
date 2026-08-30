import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import { startBackgroundLocationTracking } from '../services/backgroundLocationTask';

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
          // 2. Safely attempt Background Permission (optional in Expo Go)
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>📍</Text>
      </View>

      <Text style={styles.title}>Landslide Early Warning Needs Your Location</Text>
      <Text style={styles.description}>
        To protect you against hill slope failures and sudden rockslides in Dima Hasao and the North Eastern Region, we match your coordinates against high-resolution GIS hazard grids.
      </Text>

      <View style={styles.featureBox}>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🛡️</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Foreground Hazard Assessment</Text>
            <Text style={styles.featureSub}>Instant spatial check when opening the app or tapping "Check now".</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🔔</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Periodic Background Protection</Text>
            <Text style={styles.featureSub}>Significant movement (&gt;500m / 15 min) battery-efficient checks to warn you before entering critical zones.</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🔒</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Full Privacy & Control</Text>
            <Text style={styles.featureSub}>You can toggle location consent anytime in app settings without deleting your account.</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleGrantPermissions} disabled={requesting}>
        <Text style={styles.primaryButtonText}>Enable Location Protection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={onPermissionComplete}>
        <Text style={styles.skipButtonText}>Skip for now (Manual Mode)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  iconText: {
    fontSize: 36
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 12
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  featureBox: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    marginBottom: 28
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  featureIcon: {
    fontSize: 22,
    marginRight: 14,
    marginTop: 2
  },
  featureTextCol: {
    flex: 1
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc'
  },
  featureSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
    lineHeight: 16
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    height: 52,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  skipButton: {
    paddingVertical: 10
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600'
  }
});
