import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAlert } from '../services/apiService';
import { performOfflineGeofenceCheck } from '../services/offlineRiskEngine';

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
      // 1. Evaluate risk level of this exact coordinate
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
            ? 'This is a HIGH-RISK area. When higher authorities broadcast an alert on the website, this phone WILL receive the emergency warning popup.'
            : 'This is a SAFE area. When higher authorities broadcast an alert for risk zones, this phone will NOT receive unnecessary alert popups.'
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
    Alert.alert('Cleared', 'Simulated coordinates removed. App will now use your phone\'s real GPS location.', [
      { text: 'OK', onPress: onBackToHome }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToHome}>
          <Text style={styles.backBtnText}>⬅ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎯 Set Simulation Coordinates</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instruction Banner */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📍 Enter Any Coordinates to Test</Text>
          <Text style={styles.infoSub}>
            Enter any Latitude & Longitude below and save. When an authority broadcasts an emergency warning from the website:
            {'\n'}• If your coordinate is in a <Text style={{ color: '#ef4444', fontWeight: '800' }}>HIGH-RISK AREA</Text>, the alert will pop up on this phone.
            {'\n'}• If your coordinate is in a <Text style={{ color: '#10b981', fontWeight: '800' }}>SAFE AREA</Text>, NO alert will pop up.
          </Text>
        </View>

        {/* Coordinate Input Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Enter Location Details</Text>

          <Text style={styles.inputLabel}>Location Name / Description (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Selected Point from GIS Map"
            placeholderTextColor="#64748b"
            value={locNameInput}
            onChangeText={setLocNameInput}
          />

          <View style={styles.coordRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Latitude (°N)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 25.180"
                placeholderTextColor="#64748b"
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
                placeholderTextColor="#64748b"
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
              {loading ? 'Evaluating Risk...' : '💾 Save Coordinates'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearCoordinate}
          >
            <Text style={styles.clearBtnText}>🗑️ Clear & Revert to Real Phone GPS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  headerBar: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#334155',
    borderRadius: 8
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700'
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800'
  },
  scrollContent: {
    padding: 16
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0284c7'
  },
  infoTitle: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6
  },
  infoSub: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  primarySaveBtn: {
    backgroundColor: '#0284c7',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10
  },
  primarySaveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  },
  clearBtn: {
    backgroundColor: '#334155',
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569'
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  }
});
