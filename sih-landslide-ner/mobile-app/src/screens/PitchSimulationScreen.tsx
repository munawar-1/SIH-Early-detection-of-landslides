import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAlert } from '../services/apiService';
import { performOfflineGeofenceCheck } from '../services/offlineRiskEngine';
import { APP_COLORS } from '../constants/theme';

export interface SavedCoordinate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
  risk_level?: string;
}

export const ACTIVE_COORD_KEY = 'active_pitch_coordinate';

interface PitchSimulationScreenProps {
  onBackToHome: () => void;
}

export const PitchSimulationScreen: React.FC<PitchSimulationScreenProps> = ({ onBackToHome }) => {
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  const [locNameInput, setLocNameInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadCurrentSavedCoord();
  }, []);

  const loadCurrentSavedCoord = async () => {
    try {
      const active = await AsyncStorage.getItem(ACTIVE_COORD_KEY);
      if (active) {
        const parsed = JSON.parse(active);
        setLatInput(parsed.lat?.toString() || '');
        setLngInput(parsed.lng?.toString() || '');
        setLocNameInput(parsed.name || '');
      }
    } catch (e) {
      console.warn('Could not load current pitch coordinate');
    }
  };

  const handleSaveCoordinate = async () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const name = locNameInput.trim() || `Custom (${lat.toFixed(3)}, ${lng.toFixed(3)})`;

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Input', 'Please enter valid numerical Latitude and Longitude.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Out of Bounds', 'Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }

    setLoading(true);

    try {
      // 1. Evaluate risk level of this coordinate
      let riskResult;
      try {
        riskResult = await checkAlert(lat, lng);
      } catch (err) {
        riskResult = await performOfflineGeofenceCheck(lat, lng);
      }

      const payload: SavedCoordinate = {
        id: Date.now().toString(),
        name,
        lat,
        lng,
        district: riskResult.district || 'Custom Location',
        risk_level: riskResult.risk_level
      };

      // 2. Save active coordinate for monitoring
      await AsyncStorage.setItem(ACTIVE_COORD_KEY, JSON.stringify(payload));

      const isRisk = riskResult.risk_level === 'CRITICAL' || riskResult.risk_level === 'HIGH' || riskResult.in_risk_zone;

      Alert.alert(
        '💾 Coordinates Saved!',
        `Location: ${name}\nCoordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E\nAI Risk Status: ${riskResult.risk_level} ${isRisk ? '🚨' : '✅'}\n\n${
          isRisk
            ? 'This coordinate is in a HIGH-RISK HAZARD ZONE. The app will receive simulated emergency alert SMS dispatches and banner advisories.'
            : 'This coordinate is in a SAFE ZONE. Alert banners will remain quiet under normal conditions.'
        }`,
        [
          {
            text: 'Go to Home Screen',
            onPress: onBackToHome
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to save coordinate.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCoordinate = async () => {
    await AsyncStorage.removeItem(ACTIVE_COORD_KEY);
    setLatInput('');
    setLngInput('');
    setLocNameInput('');
    Alert.alert('Cleared', 'Simulated coordinates removed. App will now use physical phone GPS.', [
      { text: 'OK', onPress: onBackToHome }
    ]);
  };

  const setPresetJatinga = () => {
    setLocNameInput('Jatinga Ridge (NH-27 Pass)');
    setLatInput('25.180');
    setLngInput('92.760');
  };

  const setPresetHaflong = () => {
    setLocNameInput('Haflong Ghat Road Corridor');
    setLatInput('25.080');
    setLngInput('92.840');
  };

  const setPresetSafe = () => {
    setLocNameInput('Silchar Plain Sector (Safe)');
    setLatInput('24.833');
    setLngInput('92.778');
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToHome}>
          <Text style={styles.backBtnText}>⬅ Back to Monitor</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pitch Simulation Studio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instruction Banner */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📍 Real-Time Coordinate Sandbox</Text>
          <Text style={styles.infoSub}>
            Set simulated coordinates to demonstrate how the geofence engine triggers incoming SMS dispatches and banner alerts when entering danger zones.
          </Text>
        </View>

        {/* Quick Presets */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Quick Pilot Corridor Presets</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity style={[styles.presetBtn, styles.presetBtnRed]} onPress={setPresetJatinga}>
              <Text style={styles.presetBtnText}>🚨 Jatinga (Critical)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.presetBtn, styles.presetBtnOrange]} onPress={setPresetHaflong}>
              <Text style={styles.presetBtnText}>⚠️ Haflong (High)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.presetBtn, styles.presetBtnGreen]} onPress={setPresetSafe}>
              <Text style={styles.presetBtnText}>✅ Silchar (Safe)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coordinate Input Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Enter Custom Location Coordinates</Text>

          <Text style={styles.inputLabel}>Location Name / Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Selected Point from GIS Map"
            placeholderTextColor="#8FA48A"
            value={locNameInput}
            onChangeText={setLocNameInput}
          />

          <View style={styles.coordRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Latitude (°N)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 25.180"
                placeholderTextColor="#8FA48A"
                keyboardType="numeric"
                value={latInput}
                onChangeText={setLatInput}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Longitude (°E)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 92.760"
                placeholderTextColor="#8FA48A"
                keyboardType="numeric"
                value={lngInput}
                onChangeText={setLngInput}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.primarySaveBtn}
            onPress={handleSaveCoordinate}
            disabled={loading}
          >
            <Text style={styles.primarySaveBtnText}>
              {loading ? 'Evaluating Spatial Risk...' : '💾 Save Simulated Coordinates'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearCoordinate}
          >
            <Text style={styles.clearBtnText}>🗑️ Clear & Revert to Physical GPS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  headerBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  backBtnText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  headerTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  scrollContent: {
    padding: 16
  },
  infoCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  infoTitle: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4
  },
  infoSub: {
    color: '#14532D',
    fontSize: 12,
    lineHeight: 18
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  formTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1
  },
  presetBtnRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5'
  },
  presetBtnOrange: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D'
  },
  presetBtnGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC'
  },
  presetBtnText: {
    color: APP_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800'
  },
  inputLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  textInput: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 12
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  primarySaveBtn: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  clearBtn: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  clearBtnText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  }
});
