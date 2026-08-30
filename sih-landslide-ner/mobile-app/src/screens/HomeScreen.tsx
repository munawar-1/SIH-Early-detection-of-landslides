import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAlert, updateLocation, fetchActiveBroadcast, dismissActiveBroadcast, AlertCheckResponse } from '../services/apiService';
import { performOfflineGeofenceCheck, syncRiskZonesToCache, flushOfflineQueueToBackend } from '../services/offlineRiskEngine';
import { EmergencyAlertModal } from '../components/EmergencyAlertModal';
import { ACTIVE_COORD_KEY, SavedCoordinate } from './PitchSimulationScreen';

interface HomeScreenProps {
  onOpenAlertDetail: (alert: AlertCheckResponse) => void;
  onOpenSettings: () => void;
  onOpenPitchSimulation: () => void;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenAlertDetail, onOpenSettings, onOpenPitchSimulation }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [alertStatus, setAlertStatus] = useState<AlertCheckResponse | null>(null);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [activePitchCoord, setActivePitchCoord] = useState<SavedCoordinate | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; districtName: string } | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [lastAckBroadcastId, setLastAckBroadcastId] = useState<number>(0);

  useEffect(() => {
    initApp();
  }, []);

  // Poll for higher authority emergency broadcast triggers from web dashboard
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        let currLat = 17.385;
        let currLng = 78.486;
        let currDistrict = 'Hyderabad, Telangana';

        const savedPitch = await AsyncStorage.getItem(ACTIVE_COORD_KEY);
        if (savedPitch) {
          const parsed: SavedCoordinate = JSON.parse(savedPitch);
          currLat = parsed.lat;
          currLng = parsed.lng;
          currDistrict = parsed.name || 'Custom Coordinate';
        } else if (currentCoords) {
          currLat = currentCoords.lat;
          currLng = currentCoords.lng;
          currDistrict = currentCoords.districtName;
        }

        const broadcast = await fetchActiveBroadcast();
        if (broadcast && broadcast.active && broadcast.broadcast_id && broadcast.broadcast_id !== lastAckBroadcastId) {
          // Dynamically check if the user's active coordinate is evaluated as a risk zone
          const dynamicCheck = await performOfflineGeofenceCheck(currLat, currLng);

          const isInsideRiskZone = dynamicCheck.risk_level === 'CRITICAL' || dynamicCheck.risk_level === 'HIGH' || dynamicCheck.in_risk_zone;

          if (isInsideRiskZone) {
            console.log(`🚨 [DANGER POINT MATCHED] Coord (${currLat}, ${currLng}) evaluated as ${dynamicCheck.risk_level}. Triggering popup alert.`);
            setLastAckBroadcastId(broadcast.broadcast_id);
            setAlertStatus({
              in_risk_zone: true,
              risk_level: dynamicCheck.risk_level,
              district: dynamicCheck.district || currDistrict,
              probability: dynamicCheck.probability || 0.94,
              advisory: broadcast.body || dynamicCheck.advisory || 'Extreme slope destabilization detected near active coordinate.',
              action_required: dynamicCheck.action_required || 'IMMEDIATE EVACUATION: Move away from steep slopes.',
              alert_dispatched: true,
              checked_at: new Date().toISOString()
            });
            setShowAlertModal(true);
          } else {
            console.log(`🛡️ [SAFE POINT MATCHED] Coord (${currLat}, ${currLng}) evaluated as SAFE. Broadcast popup strictly suppressed.`);
          }
        }
      } catch (err) {}
    }, 1200);

    return () => clearInterval(interval);
  }, [lastAckBroadcastId, currentCoords]);

  const initApp = async () => {
    const count = await syncRiskZonesToCache();
    setCachedCount(count);
    await runLocationCheck();
  };

  const runLocationCheck = async () => {
    setLoading(true);

    try {
      // 1. Check if user set an active coordinate in Pitch Studio
      const savedPitch = await AsyncStorage.getItem(ACTIVE_COORD_KEY);
      if (savedPitch) {
        const parsed: SavedCoordinate = JSON.parse(savedPitch);
        setActivePitchCoord(parsed);
        setCurrentCoords({ lat: parsed.lat, lng: parsed.lng, districtName: parsed.name });

        try {
          const response = await checkAlert(parsed.lat, parsed.lng);
          setAlertStatus(response);
          setIsOffline(false);
        } catch (netErr) {
          setIsOffline(true);
          const offlineResult = await performOfflineGeofenceCheck(parsed.lat, parsed.lng);
          setAlertStatus(offlineResult);
        }
        return;
      }

      // 2. Otherwise use user's REAL physical GPS location (e.g. Hyderabad)
      setActivePitchCoord(null);
      let lat = 17.385; // Default Hyderabad fallback if permission denied
      let lng = 78.486;
      let districtName = 'Hyderabad, Telangana';

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;

          try {
            const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (geocoded && geocoded.length > 0) {
              const place = geocoded[0];
              districtName = `${place.city || place.subregion || place.district || 'Current Location'}, ${place.region || ''}`.trim();
            }
          } catch (e) {
            districtName = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
          }
        }
      } catch (err) {
        console.warn('Could not get GPS fix:', err);
      }

      setCurrentCoords({ lat, lng, districtName });

      try {
        const response = await checkAlert(lat, lng);
        setAlertStatus({
          ...response,
          district: districtName
        });
        setIsOffline(false);
      } catch (netError) {
        setIsOffline(true);
        const offlineResult = await performOfflineGeofenceCheck(lat, lng);
        setAlertStatus({
          ...offlineResult,
          district: districtName
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResetToRealGps = async () => {
    await AsyncStorage.removeItem(ACTIVE_COORD_KEY);
    setActivePitchCoord(null);
    await runLocationCheck();
    Alert.alert('GPS Reset', 'Monitoring switched back to your real physical GPS location.');
  };

  const getRiskTheme = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#991b1b', border: '#ef4444', text: '#fef2f2', label: 'CRITICAL DANGER AREA', icon: '🚨' };
      case 'HIGH':
        return { bg: '#c2410c', border: '#f97316', text: '#fff7ed', label: 'HIGH RISK AREA', icon: '⚠️' };
      case 'MODERATE':
        return { bg: '#854d0e', border: '#eab308', text: '#fefce8', label: 'MODERATE RISK AREA', icon: '⚡' };
      default:
        return { bg: '#065f46', border: '#10b981', text: '#ecfdf5', label: 'SAFE AREA', icon: '✅' };
    }
  };

  const theme = getRiskTheme(alertStatus?.risk_level);

  return (
    <View style={styles.container}>
      {/* App Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>NER Landslide Warning</Text>
          <Text style={styles.navSub}>Citizen Safety Monitor • SIH 2026</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.pitchModeHeaderBtn} onPress={onOpenPitchSimulation}>
            <Text style={styles.pitchModeHeaderBtnText}>🎯 Pitch Studio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); runLocationCheck(); }} tintColor="#38bdf8" />
        }
      >
        {/* Active Pitch Mode Banner if simulated */}
        {activePitchCoord && (
          <View style={styles.pitchActiveBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pitchActiveTitle}>🎯 Pitch Simulation Active</Text>
              <Text style={styles.pitchActiveSub}>{activePitchCoord.name} ({activePitchCoord.lat.toFixed(3)}°, {activePitchCoord.lng.toFixed(3)}°)</Text>
            </View>
            <TouchableOpacity style={styles.resetGpsBtn} onPress={handleResetToRealGps}>
              <Text style={styles.resetGpsBtnText}>📍 Use Real GPS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Offline Cache Status Badge */}
        {isOffline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>
              📡 Network Offline • Operating on Turf.js Client Geofence Cache ({cachedCount} zones)
            </Text>
          </View>
        )}

        {/* Main Risk Status Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.statusCard, { backgroundColor: theme.bg, borderColor: theme.border }]}
          onPress={() => {
            if (alertStatus?.risk_level === 'CRITICAL' || alertStatus?.risk_level === 'HIGH' || alertStatus?.in_risk_zone) {
              setShowAlertModal(true);
            } else {
              Alert.alert(
                '🛡️ Safe Zone Verified',
                `Your current location (${currentCoords?.districtName || 'Safe Region'}) is safe.\n\nNo landslide risk detected at (${currentCoords?.lat.toFixed(3)}°N, ${currentCoords?.lng.toFixed(3)}°E).`
              );
            }
          }}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.riskIcon}>{theme.icon}</Text>
            <View style={styles.riskBadge}>
              <Text style={styles.riskBadgeText}>{alertStatus?.risk_level || 'SAFE'}</Text>
            </View>
          </View>

          <Text style={styles.statusHeading}>
            You are currently in a {alertStatus?.risk_level === 'SAFE' ? 'SAFE' : alertStatus?.risk_level + ' RISK'} area
          </Text>

          <Text style={[styles.advisorySummary, { color: theme.text }]}>
            {alertStatus?.advisory || 'Monitoring slope stability across district boundaries...'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>District & Location</Text>
              <Text style={styles.metaValue}>
                {currentCoords?.districtName || alertStatus?.district || 'Hyderabad, Telangana'} ({currentCoords?.lat.toFixed(3)}°, {currentCoords?.lng.toFixed(3)}°)
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Last Checked</Text>
              <Text style={styles.metaValue}>
                {alertStatus?.checked_at ? new Date(alertStatus.checked_at).toLocaleTimeString() : 'Just now'}
              </Text>
            </View>
          </View>

          <View style={styles.tapPrompt}>
            <Text style={styles.tapPromptText}>Tap card for recommended safety actions & helpline ➔</Text>
          </View>
        </TouchableOpacity>

        {/* Action Controls */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={() => runLocationCheck()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.checkButtonText}>📍 Use My Real GPS Location</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>⛰️ Spatial Landslide Hazard Buffer</Text>
            <Text style={styles.infoText}>
              • CRITICAL hazard zone buffer: 2,000 meters{"\n"}
              • HIGH hazard zone buffer: 500 meters{"\n"}
              • Cooldown protection: Prevents repetitive alerts for 6 hours
            </Text>
          </View>
        </View>

        {/* Local Emergency Helpline Card */}
        <View style={styles.helplineCard}>
          <Text style={styles.helplineTitle}>📞 Emergency Helplines</Text>
          <Text style={styles.helplineRow}>• ASDMA State Emergency: <Text style={styles.bold}>1070 / 1077</Text></Text>
          <Text style={styles.helplineRow}>• DDMO Dima Hasao Office: <Text style={styles.bold}>+91 94350 01122</Text></Text>
          <Text style={styles.helplineRow}>• NFR Rail Emergency: <Text style={styles.bold}>139</Text></Text>
        </View>
      </ScrollView>

      {/* Multilingual Emergency Alert Modal */}
      <EmergencyAlertModal
        visible={showAlertModal}
        onClose={() => {
          setShowAlertModal(false);
          setLastAckBroadcastId(Date.now());
          dismissActiveBroadcast();
        }}
        district={activePitchCoord?.name || currentCoords?.districtName || alertStatus?.district || 'Dima Hasao'}
        riskLevel={alertStatus?.risk_level || 'CRITICAL'}
        locationName={
          activePitchCoord?.name
            ? activePitchCoord.name
            : currentCoords?.lat === 25.18
            ? 'Jatinga Ridge Corridor (NH-27)'
            : currentCoords?.lat === 25.08
            ? 'Haflong Ghat Slope Section'
            : 'Dima Hasao Hill Sector'
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  navBar: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  pitchModeHeaderBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  pitchModeHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc'
  },
  navSub: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 2
  },
  settingsBtn: {
    padding: 8
  },
  settingsIcon: {
    fontSize: 22
  },
  scrollContent: {
    padding: 20
  },
  offlineBadge: {
    backgroundColor: '#7c2d12',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16
  },
  offlineBadgeText: {
    color: '#ffedd5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    marginBottom: 20,
    elevation: 6
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  riskIcon: {
    fontSize: 32
  },
  riskBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12
  },
  riskBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  statusHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10
  },
  advisorySummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 14
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  metaLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase'
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2
  },
  tapPrompt: {
    alignItems: 'center',
    paddingTop: 8
  },
  tapPromptText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '700'
  },
  actionContainer: {
    marginBottom: 20
  },
  checkButton: {
    backgroundColor: '#0284c7',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  checkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  infoBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  infoTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18
  },
  helplineCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  helplineTitle: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10
  },
  helplineRow: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 6
  },
  bold: {
    fontWeight: '800',
    color: '#ffffff'
  },
  pitchActiveBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pitchActiveTitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2
  },
  pitchActiveSub: {
    color: '#94a3b8',
    fontSize: 12
  },
  resetGpsBtn: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#64748b'
  },
  resetGpsBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  }
});
