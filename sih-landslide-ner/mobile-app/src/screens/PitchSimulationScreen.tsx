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
import { checkAlert, predictCoordinateRisk } from '../services/apiService';
import { performOfflineGeofenceCheck } from '../services/offlineRiskEngine';
import { soundService } from '../services/soundService';
import { APP_COLORS } from '../constants/theme';
import { getRecentCachedEvaluations, CachedEvaluation, getCacheStatusSummary } from '../services/gridCacheService';
import { setActiveMonitorCoordinate } from '../services/coordinateService';

export interface SavedCoordinate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
  risk_level?: string;
  probability?: number;
  primary_hazard_driver?: string;
  advisory?: string;
  action_required?: string;
  evaluated_by?: string;
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
  const [recentEvaluations, setRecentEvaluations] = useState<CachedEvaluation[]>([]);

  useEffect(() => {
    loadCurrentSavedCoord();
  }, []);

  const loadCurrentSavedCoord = async () => {
    try {
      const [active, history] = await Promise.all([
        AsyncStorage.getItem(ACTIVE_COORD_KEY),
        getRecentCachedEvaluations()
      ]);
      if (active) {
        const parsed = JSON.parse(active);
        setLatInput(parsed.lat?.toString() || '');
        setLngInput(parsed.lng?.toString() || '');
        setLocNameInput(parsed.name || '');
      }
      setRecentEvaluations(history);
    } catch (e) {
      console.warn('Could not load current active coordinate or history');
    }
  };

  const applyPreset = (name: string, lat: number, lng: number) => {
    setLocNameInput(name);
    setLatInput(lat.toFixed(3));
    setLngInput(lng.toFixed(3));
  };

  const handleSaveCoordinate = async () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const name = locNameInput.trim() || `Coordinate (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`;

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
      // Evaluate risk level of this coordinate dynamically via Calibrated Geotechnical ML Engine
      const riskResult = await predictCoordinateRisk(lat, lng, name);
      const effectiveRiskLevel = riskResult.risk_level;

      const payload: SavedCoordinate = {
        id: Date.now().toString(),
        name,
        lat,
        lng,
        district: riskResult.district || 'Custom Location',
        risk_level: effectiveRiskLevel,
        probability: riskResult.probability,
        primary_hazard_driver: riskResult.primary_hazard_driver,
        advisory: riskResult.advisory,
        action_required: riskResult.action_required,
        evaluated_by: riskResult.evaluated_by
      };

      // Save active coordinate for monitoring
      await AsyncStorage.setItem(ACTIVE_COORD_KEY, JSON.stringify(payload));
      await setActiveMonitorCoordinate({
        latitude: lat,
        longitude: lng,
        locationName: name,
        accuracy: 5,
        isCustom: true,
        source: 'MONITOR_ASSESSMENT'
      });

      const isRisk = (effectiveRiskLevel === 'CRITICAL' || effectiveRiskLevel === 'HIGH') && riskResult.in_risk_zone;

      // If SAFE or MODERATE coordinate, immediately silence any siren
      if (!isRisk) {
        soundService.stopEmergencySiren();
      }

      const probText = typeof riskResult.probability === 'number'
        ? ` (${(riskResult.probability * 100).toFixed(1)}%)`
        : '';
      const driverText = riskResult.primary_hazard_driver
        ? `\nHazard Driver: ${riskResult.primary_hazard_driver}`
        : '';
      const engineText = riskResult.evaluated_by
        ? `\nEngine: ${riskResult.evaluated_by}`
        : '';

      Alert.alert(
        '💾 Coordinates Evaluated & Activated!',
        `Location: ${name}\nCoordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E\nAI Risk Status: ${effectiveRiskLevel}${probText} ${isRisk ? '🚨' : effectiveRiskLevel === 'MODERATE' ? '⚠️' : '✅'}${driverText}${engineText}\n\n${
          isRisk
            ? 'This coordinate is in a HIGH-RISK HAZARD ZONE. The app will trigger an incoming emergency alert SMS and sounding siren.'
            : effectiveRiskLevel === 'MODERATE'
            ? 'This coordinate is in a MODERATE ADVISORY ZONE. Cautionary status is displayed.'
            : 'This coordinate is in a SAFE ZONE. Normal monitoring is active and siren remains quiet.'
        }`,
        [
          {
            text: 'Go to Home Screen',
            onPress: onBackToHome
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to evaluate and activate coordinates.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCoordinate = async () => {
    soundService.stopEmergencySiren();
    await AsyncStorage.removeItem(ACTIVE_COORD_KEY);
    setLatInput('');
    setLngInput('');
    setLocNameInput('');
    Alert.alert('Cleared', 'Custom coordinate removed. App is now monitoring your physical GPS location.', [
      { text: 'OK', onPress: onBackToHome }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToHome}>
          <Text style={styles.backBtnText}>⬅ Back to Monitor</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Coordinate Studio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instruction Banner */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📍 Geographical Coordinate Assessment</Text>
          <Text style={styles.infoSub}>
            Enter custom coordinates or tap presets to evaluate real geotechnical landslide susceptibility with calibrated satellite DEM terrain data and live XGBoost ML predictions.
          </Text>
        </View>

        {/* Quick 1-Tap Field Presets */}
        <View style={styles.presetsCard}>
          <Text style={styles.presetsHeader}>⚡ Quick Terrain Presets (1-Tap Test)</Text>
          <View style={styles.presetChipsRow}>
            <TouchableOpacity
              style={[styles.presetChip, styles.presetChipRed]}
              onPress={() => applyPreset('Haflong Escarpment Zone', 24.990, 92.760)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipTextRed}>🚨 Extreme Slope (34°+)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, styles.presetChipAmber]}
              onPress={() => applyPreset('Mahur Hill Corridor', 24.990, 92.780)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipTextAmber}>⚠️ Moderate Hill (31°)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, styles.presetChipGreen]}
              onPress={() => applyPreset('Stable Valley Corridor', 24.970, 92.850)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipTextGreen}>🛡️ Safe Lowland (5°)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coordinate Input Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Enter Custom Location Coordinates</Text>

          <Text style={styles.inputLabel}>Location Name / Sector</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Dima Hasao Hill Sector"
            placeholderTextColor="#8FA48A"
            value={locNameInput}
            onChangeText={setLocNameInput}
          />

          <View style={styles.coordRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Latitude (°N)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 25.100"
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
                placeholder="e.g. 92.750"
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
              {loading ? 'Evaluating Spatial Risk...' : '🧠 Evaluate & Activate Coordinates'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearCoordinate}
          >
            <Text style={styles.clearBtnText}>📍 Clear & Revert to Physical GPS</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Cached Lookups in Phone Memory */}
        {recentEvaluations.length > 0 && (
          <View style={styles.historyCard}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historyTitle}>📦 Local Cache Memory History</Text>
              <Text style={styles.historySubBadge}>{recentEvaluations.length} Saved</Text>
            </View>
            <Text style={styles.historySubtitle}>
              Previously queried coordinates cached in device storage for instant 0ms offline recall. Tap any to load.
            </Text>
            {recentEvaluations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => applyPreset(item.name, item.lat, item.lng)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyItemName}>{item.name}</Text>
                  <Text style={styles.historyItemCoords}>
                    {item.lat.toFixed(3)}°N, {item.lng.toFixed(3)}°E • {item.evaluated_by}
                  </Text>
                </View>
                <View style={[
                  styles.historyBadge,
                  item.risk_level === 'CRITICAL' ? styles.badgeRed :
                  item.risk_level === 'HIGH' ? styles.badgeOrange :
                  item.risk_level === 'MODERATE' ? styles.badgeYellow : styles.badgeGreen
                ]}>
                  <Text style={styles.historyBadgeText}>{item.risk_level}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    borderColor: APP_COLORS.borderDefault,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backBtnText: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800'
  },
  headerTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2
  },
  scrollContent: {
    padding: 16
  },
  infoCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  infoTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4
  },
  infoSub: {
    color: '#14532D',
    fontSize: 12,
    lineHeight: 17
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  formTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.1
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  presetBtn: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 42
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
    fontWeight: '800',
    textAlign: 'center'
  },
  inputLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  textInput: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 12,
    minHeight: 46
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
    marginBottom: 10,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  clearBtn: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    minHeight: 44
  },
  clearBtnText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  riskSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  riskChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: APP_COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center'
  },
  riskChipText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  riskChipActiveAuto: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7'
  },
  riskChipTextActiveAuto: {
    color: '#0369A1',
    fontWeight: '800'
  },
  riskChipActiveRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626'
  },
  riskChipTextActiveRed: {
    color: '#B91C1C',
    fontWeight: '800'
  },
  riskChipActiveOrange: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706'
  },
  riskChipTextActiveOrange: {
    color: '#B45309',
    fontWeight: '800'
  },
  riskChipActiveGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  riskChipTextActiveGreen: {
    color: '#15803D',
    fontWeight: '800'
  },
  demoCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5
  },
  demoCardActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#C084FC'
  },
  demoCardLive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC'
  },
  demoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  demoCardTitleCol: {
    flex: 1
  },
  demoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  demoCardIcon: {
    fontSize: 16
  },
  demoCardBadge: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  demoBadgeTextActive: {
    color: '#6B21A8'
  },
  demoBadgeTextLive: {
    color: '#15803D'
  },
  demoCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16
  },
  demoToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF'
  },
  demoToggleBtnActive: {
    borderColor: '#A855F7'
  },
  demoToggleBtnLive: {
    borderColor: '#22C55E'
  },
  demoToggleText: {
    fontSize: 12,
    fontWeight: '800'
  },
  demoToggleTextActive: {
    color: '#7E22CE'
  },
  demoToggleTextLive: {
    color: '#16A34A'
  },
  // Presets & Cache History Styles
  presetsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  presetsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    marginBottom: 10
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  presetChip: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  presetChipRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5'
  },
  presetChipAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D'
  },
  presetChipGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC'
  },
  presetChipTextRed: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#991B1B'
  },
  presetChipTextAmber: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E'
  },
  presetChipTextGreen: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#166534'
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: APP_COLORS.textPrimary
  },
  historySubBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    backgroundColor: '#D1FAE5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6
  },
  historySubtitle: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 15
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8
  },
  historyItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.textPrimary
  },
  historyItemCoords: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    marginTop: 2
  },
  historyBadge: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6
  },
  badgeRed: {
    backgroundColor: '#FEE2E2'
  },
  badgeOrange: {
    backgroundColor: '#FFEDD5'
  },
  badgeYellow: {
    backgroundColor: '#FEF3C7'
  },
  badgeGreen: {
    backgroundColor: '#DCFCE7'
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: APP_COLORS.textPrimary
  }
});
