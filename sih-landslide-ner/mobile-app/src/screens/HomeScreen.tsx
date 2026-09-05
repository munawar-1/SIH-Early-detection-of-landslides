import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Linking,
  TextInput,
  Modal
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkAlert,
  updateLocation,
  fetchActiveBroadcast,
  dismissActiveBroadcast,
  fetchLiveAlert,
  dismissLiveAlert,
  predictCoordinateRisk,
  checkBackendOnlineStatus,
  AlertCheckResponse,
  syncRegionalGridCache,
  getCacheStatusSummary,
  initGridCache
} from '../services/apiService';
import { EmergencyAlertModal } from '../components/EmergencyAlertModal';
import { performOfflineGeofenceCheck, syncRiskZonesToCache } from '../services/offlineRiskEngine';
import { smsService, EmergencySmsAlert } from '../services/smsService';
import { ACTIVE_COORD_KEY, SavedCoordinate } from './PitchSimulationScreen';
import { setActiveMonitorCoordinate } from '../services/coordinateService';
import { getThreatTheme, APP_COLORS, ThreatLevel } from '../constants/theme';
import { ThreatBadge } from '../components/ThreatBadge';
import { InjuryFirstAidModal, VALID_HELPLINES } from '../components/InjuryFirstAidModal';
import { soundService } from '../services/soundService';

interface HomeScreenProps {
  onOpenSmsInbox: () => void;
  onOpenSos: () => void;
  onOpenSettings: () => void;
  onOpenPitchSimulation: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenSmsInbox,
  onOpenSos,
  onOpenSettings,
  onOpenPitchSimulation
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [alertStatus, setAlertStatus] = useState<AlertCheckResponse | null>(null);
  const [activePitchCoord, setActivePitchCoord] = useState<SavedCoordinate | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; districtName: string } | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [cachedCount, setCachedCount] = useState<number>(5076);
  const [cacheStatus, setCacheStatus] = useState<{
    cellCount: number;
    timeAgo: string;
    sourceLabel: string;
    isExpired: boolean;
  }>({
    cellCount: 5076,
    timeAgo: 'Just now',
    sourceLabel: 'Bundled Seed',
    isExpired: false
  });
  const [syncingGrid, setSyncingGrid] = useState<boolean>(false);

  const handleManualGridSync = async () => {
    if (syncingGrid) return;
    setSyncingGrid(true);
    try {
      const res = await syncRegionalGridCache(true);
      const summary = getCacheStatusSummary();
      setCacheStatus(summary);
      setCachedCount(summary.cellCount);
      await runLocationCheck();
      Alert.alert(
        res.success ? '✅ Cache Memory Synced' : '📡 Offline Mode Active',
        res.message
      );
    } catch (e) {
      console.warn('Manual sync failed:', e);
    } finally {
      setSyncingGrid(false);
    }
  };

  const [lastAckBroadcastId, setLastAckBroadcastId] = useState<number>(0);
  const [latestSms, setLatestSms] = useState<EmergencySmsAlert | null>(null);
  const [unreadSmsCount, setUnreadSmsCount] = useState<number>(0);
  const [firstAidModalVisible, setFirstAidModalVisible] = useState<boolean>(false);

  // Online Coordinate Entry & Dynamic ML State
  const [coordModalVisible, setCoordModalVisible] = useState<boolean>(false);
  const [coordLatInput, setCoordLatInput] = useState<string>('');
  const [coordLngInput, setCoordLngInput] = useState<string>('');
  const [coordNameInput, setCoordNameInput] = useState<string>('');
  const [evaluatingCoord, setEvaluatingCoord] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  const lastAckBroadcastIdRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  // Emergency Alert Modal State
  const [emergencyModalVisible, setEmergencyModalVisible] = useState<boolean>(false);
  const [emergencyModalData, setEmergencyModalData] = useState<{
    title?: string;
    advisory?: string;
    district?: string;
    riskLevel?: string;
    locationName?: string;
    source?: 'LIVE_MONITORING';
  } | null>(null);

  const handleAcknowledgeEmergencyAlert = async () => {
    soundService.stopEmergencySiren();
    setEmergencyModalVisible(false);
    await dismissLiveAlert();
  };

  const handleEvaluateCoordinate = async (customLat?: string, customLng?: string, customName?: string) => {
    const latStr = customLat ?? coordLatInput;
    const lngStr = customLng ?? coordLngInput;
    const nameStr = customName ?? (coordNameInput.trim() || `Coordinate (${parseFloat(latStr).toFixed(3)}°, ${parseFloat(lngStr).toFixed(3)}°)`);

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Input', 'Please enter valid numerical Latitude and Longitude values.');
      return;
    }

    setEvaluatingCoord(true);
    try {
      // Direct navigation of coordinates to backend & ML service
      const result = await predictCoordinateRisk(lat, lng, nameStr);
      setIsOffline(Boolean(result.isOfflineFallback));

      const effectiveRisk = result.risk_level;
      const isRisk = (effectiveRisk === 'CRITICAL' || effectiveRisk === 'HIGH') && result.in_risk_zone;

      // Save active coordinate for monitoring
      const payload: SavedCoordinate = {
        id: Date.now().toString(),
        name: nameStr,
        lat,
        lng,
        district: result.district || 'Dima Hasao Sector',
        risk_level: effectiveRisk,
        probability: result.probability,
        primary_hazard_driver: result.primary_hazard_driver,
        advisory: result.advisory,
        action_required: result.action_required,
        evaluated_by: result.evaluated_by
      };
      await AsyncStorage.setItem(ACTIVE_COORD_KEY, JSON.stringify(payload));
      await setActiveMonitorCoordinate({
        latitude: lat,
        longitude: lng,
        locationName: nameStr,
        accuracy: 5,
        isCustom: true,
        source: 'MONITOR_ASSESSMENT'
      });
      setActivePitchCoord(payload);
      setCurrentCoords({ lat, lng, districtName: nameStr });
      setAlertStatus(result);

      setCoordModalVisible(false);

      if (isRisk) {
        // High Risk detected by ML model:
        // 1. Play emergency siren
        soundService.startEmergencySiren();

        // 2. Add SMS alert to official emergency inbox
        await smsService.addIncomingAlert({
          threatLevel: effectiveRisk === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          senderTag: 'DDMA / ML EARLY WARNING',
          locationName: nameStr,
          bodyEnglish: result.advisory || `EMERGENCY ALERT: Severe slope failure risk predicted at ${nameStr}. Evacuate vulnerable slopes immediately.`
        });

        // 3. Show full emergency alert modal
        setEmergencyModalData({
          title: `🚨 ${effectiveRisk} LANDSLIDE HAZARD DETECTED`,
          advisory: result.advisory || `AI Geotechnical Engine predicts imminent slope destabilization near ${nameStr}.`,
          district: result.district || 'Dima Hasao Sector',
          riskLevel: effectiveRisk,
          locationName: nameStr,
          source: 'LIVE_MONITORING'
        });
        setEmergencyModalVisible(true);
      } else {
        // Safe or Moderate detected: silence siren & close modal
        soundService.stopEmergencySiren();
        setEmergencyModalVisible(false);
      }
    } catch (err) {
      Alert.alert('Evaluation Error', 'Could not evaluate coordinates via backend ML service.');
    } finally {
      setEvaluatingCoord(false);
    }
  };

  useEffect(() => {
    initApp();

    const unsubscribeSms = smsService.subscribe((alerts, unread) => {
      if (alerts.length > 0) {
        setLatestSms(alerts[0]);
      }
      setUnreadSmsCount(unread);
    });

    return () => {
      unsubscribeSms();
    };
  }, []);

  // Poll for official live emergency broadcasts with strict deduplication
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

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

        const broadcast = await fetchLiveAlert();

        if (
          broadcast &&
          broadcast.active &&
          broadcast.broadcast_id &&
          broadcast.broadcast_id !== lastAckBroadcastIdRef.current
        ) {
          // Record broadcast_id to guarantee NO duplicate firing/siren looping
          lastAckBroadcastIdRef.current = broadcast.broadcast_id;
          setLastAckBroadcastId(broadcast.broadcast_id);

          // Check if current tracked position is evaluated as a risk zone
          const dynamicCheck = await performOfflineGeofenceCheck(currLat, currLng);

          const isUserInRiskZone =
            dynamicCheck.risk_level === 'CRITICAL' ||
            dynamicCheck.risk_level === 'HIGH' ||
            dynamicCheck.in_risk_zone;

          // SAFE COORDINATE CHECK:
          // If the user coordinate is SAFE, DO NOT trigger emergency modal and DO NOT sound siren!
          if (!isUserInRiskZone) {
            console.log(`🛡️ [COORDINATE SAFE] User is in safe zone (${currDistrict}). Suppressing emergency modal & siren.`);
            soundService.stopEmergencySiren();
            setEmergencyModalVisible(false);
            setAlertStatus(dynamicCheck);
            await dismissLiveAlert();
            return;
          }

          // User IS in a danger zone (CRITICAL or HIGH)
          const effectiveRisk = dynamicCheck.risk_level;
          console.log(`🚨 [ALERT MATCHED] Source: LIVE_MONITORING, Danger Level: ${effectiveRisk}`);

          setAlertStatus({
            in_risk_zone: true,
            risk_level: dynamicCheck.risk_level,
            district: dynamicCheck.district || broadcast.district || currDistrict,
            probability: dynamicCheck.probability || 0.94,
            advisory: broadcast.body || dynamicCheck.advisory || 'Extreme slope destabilization detected near active coordinate.',
            action_required: dynamicCheck.action_required || 'IMMEDIATE EVACUATION: Move away from steep slopes.',
            alert_dispatched: true,
            checked_at: new Date().toISOString()
          });

          // Trigger EmergencyAlertModal ONLY for users in risk zone
          setEmergencyModalData({
            title: broadcast.title || '🚨 OFFICIAL DISASTER BROADCAST',
            advisory: broadcast.body || dynamicCheck.advisory || 'Extreme slope destabilization detected in sector.',
            district: broadcast.district || dynamicCheck.district || currDistrict,
            riskLevel: effectiveRisk,
            locationName: currDistrict,
            source: 'LIVE_MONITORING'
          });
          setEmergencyModalVisible(true);

          // Dispatch to SMS Inbox and trigger banner with siren
          await smsService.addIncomingAlert({
            threatLevel: effectiveRisk,
            senderTag: 'DDMA DIMA HASAO',
            locationName: currDistrict,
            bodyEnglish: broadcast.body || `EMERGENCY ALERT: Severe landslide hazard detected near ${currDistrict}. Evacuate vulnerable slopes immediately.`
          });

          // Dismiss from active queue on server
          await dismissLiveAlert();
        }
      } catch (err) {
      } finally {
        isPollingRef.current = false;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentCoords]);

  const initApp = async () => {
    try {
      await initGridCache();
      const initialSummary = getCacheStatusSummary();
      setCacheStatus(initialSummary);
      setCachedCount(initialSummary.cellCount);
      await runLocationCheck();

      // Background refresh from Render cloud backend (if expired or bundled seed)
      syncRegionalGridCache(false).then((res) => {
        const updated = getCacheStatusSummary();
        setCacheStatus(updated);
        setCachedCount(updated.cellCount);
        if (res && res.success && res.source === 'CLOUD_BACKEND') {
          console.info('✅ Cloud cache updated from Render backend; refreshing location check.');
          runLocationCheck();
        }
      }).catch((e) => console.warn('Background sync note:', e));
    } catch (e) {
      console.warn('Grid cache init note:', e);
    }

    const stored = await smsService.getStoredAlerts();
    if (stored.length > 0) setLatestSms(stored[0]);
    const unread = await smsService.getUnreadAlertCount();
    setUnreadSmsCount(unread);
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
        await setActiveMonitorCoordinate({
          latitude: parsed.lat,
          longitude: parsed.lng,
          locationName: parsed.name || 'Dima Hasao Sector',
          accuracy: 5,
          isCustom: true,
          source: 'MONITOR_ASSESSMENT'
        });

        let statusResult: AlertCheckResponse;
        try {
          statusResult = await predictCoordinateRisk(parsed.lat, parsed.lng, parsed.name);
          setIsOffline(Boolean(statusResult.isOfflineFallback));
        } catch (netErr) {
          setIsOffline(true);
          statusResult = await performOfflineGeofenceCheck(parsed.lat, parsed.lng);
        }

        setAlertStatus(statusResult);

        const isHazard = (statusResult.risk_level === 'CRITICAL' || statusResult.risk_level === 'HIGH') && statusResult.in_risk_zone;

        // If high risk or critical, trigger emergency alert banner and siren
        if (isHazard) {
          soundService.startEmergencySiren();
          await smsService.addIncomingAlert({
            threatLevel: statusResult.risk_level === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            senderTag: 'DDMA / ML EARLY WARNING',
            locationName: parsed.name || 'Dima Hasao Sector',
            bodyEnglish: statusResult.advisory || `EMERGENCY ALERT: Severe landslide hazard detected near ${parsed.name}. Evacuate vulnerable slopes immediately.`
          });
        } else {
          // SAFE coordinate - immediately silence siren and close modal
          soundService.stopEmergencySiren();
          setEmergencyModalVisible(false);
        }
        return;
      }

      // 2. Otherwise use physical device GPS
      setActivePitchCoord(null);
      let lat = 17.385;
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
      await setActiveMonitorCoordinate({
        latitude: lat,
        longitude: lng,
        locationName: districtName,
        accuracy: 10,
        isCustom: false,
        source: 'GPS_DEVICE'
      });

      let response: AlertCheckResponse;
      try {
        response = await checkAlert(lat, lng);
        setIsOffline(Boolean(response.isOfflineFallback));
      } catch (netError) {
        setIsOffline(true);
        response = await performOfflineGeofenceCheck(lat, lng);
      }

      setAlertStatus({
        ...response,
        district: districtName
      });

      if (response.risk_level === 'CRITICAL' || response.risk_level === 'HIGH') {
        await smsService.addIncomingAlert({
          threatLevel: response.risk_level,
          senderTag: 'DDMA DIMA HASAO',
          locationName: districtName,
          bodyEnglish: response.advisory || `EMERGENCY ALERT: Severe landslide hazard detected near ${districtName}. Evacuate vulnerable slopes immediately.`
        });
      } else {
        soundService.stopEmergencySiren();
        setEmergencyModalVisible(false);
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

  const handleCallHelpline = (number: string, title: string) => {
    Alert.alert(
      `Call Emergency Helpline`,
      `Dial ${title} (${number}) now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Call ${number}`,
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Alert.alert('Dialer Error', `Could not open dialer for ${number}`);
            });
          }
        }
      ]
    );
  };

  const getRelativeTime = (timestampISO: string) => {
    try {
      const diffMs = Date.now() - new Date(timestampISO).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Recent';
    }
  };

  // Derived coherent risk presentation states to prevent contradictory UI
  const currentRiskLevel: ThreatLevel = (alertStatus?.risk_level as ThreatLevel) || 'SAFE';
  const isSafe = currentRiskLevel === 'SAFE';
  const isCritical = currentRiskLevel === 'CRITICAL';
  const isHigh = currentRiskLevel === 'HIGH';
  const isModerate = currentRiskLevel === 'MODERATE';

  const statusIndicatorText = isSafe
    ? 'MONITORING NORMAL'
    : isCritical
      ? 'CRITICAL HAZARD ALERT'
      : isHigh
        ? 'HIGH HAZARD WARNING'
        : 'MODERATE ADVISORY';

  const statusHeading = isCritical
    ? 'CRITICAL HAZARD ZONE'
    : isHigh
      ? 'HIGH WARNING HAZARD ZONE'
      : isModerate
        ? 'MODERATE ADVISORY ZONE'
        : 'SAFE ZONE VERIFIED';

  const statusSubLabel = isSafe
    ? 'No imminent landslide threat detected at your current coordinates.'
    : isCritical
      ? 'Immediate danger: Severe slope instability & critical debris-flow threat.'
      : isHigh
        ? 'High hazard detected: Heavy soil saturation & elevated rockfall potential.'
        : 'Moderate slope alert: Saturated ground conditions monitored in sector.';

  const probabilityPercent = alertStatus?.probability !== undefined
    ? Math.round(alertStatus.probability * 100)
    : isCritical
      ? 94
      : isHigh
        ? 75
        : isModerate
          ? 45
          : 8;

  const riskScoreLabel = isSafe
    ? `${probabilityPercent}% Low`
    : isCritical
      ? `${probabilityPercent}% Critical`
      : isHigh
        ? `${probabilityPercent}% High`
        : `${probabilityPercent}% Moderate`;

  const citizenActionText = alertStatus?.action_required || (
    isCritical
      ? 'Move away from steep slopes, cliff edges, and natural drainage paths immediately.'
      : isHigh
        ? 'Stay vigilant for ground movement, bulging retaining walls, and localized rockfalls.'
        : isModerate
          ? 'Monitor weather forecasts and avoid non-essential hillside corridor transit.'
          : 'Normal conditions verified. Maintain standard situational awareness during monsoon.'
  );

  const theme = getThreatTheme(currentRiskLevel);

  return (
    <View style={styles.container}>
      {/* Top Professional National/State Warning Navbar */}
      <View style={styles.navBar}>
        <View style={styles.brandContainer}>
          <View style={styles.brandRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.navTitle} numberOfLines={1} ellipsizeMode="tail">NER Landslide Warning</Text>
          </View>
          <Text style={styles.navSub} numberOfLines={1} ellipsizeMode="tail">Dima Hasao Sector • Early Warning Platform</Text>
        </View>

        <View style={styles.navActionsRow}>
          <TouchableOpacity
            style={styles.pitchModeHeaderBtn}
            onPress={onOpenPitchSimulation}
            accessibilityRole="button"
            accessibilityLabel="Open Pitch Simulation Studio"
          >
            <Text style={styles.pitchModeHeaderBtnText}>🎯 Pitch Studio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Sign out or App Settings"
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); runLocationCheck(); }} tintColor="#1E2B18" />
        }
      >
        {/* Latest Incoming Alert SMS Ticker Strip */}
        {latestSms && (
          <TouchableOpacity
            style={[
              styles.smsTickerBar,
              { borderLeftColor: isSafe ? '#22c55e' : getThreatTheme(latestSms.threatLevel).accent }
            ]}
            onPress={onOpenSmsInbox}
            accessibilityRole="button"
            accessibilityLabel={`Latest SMS Alert from ${latestSms.senderTag}. Tap to open SMS Alerts Inbox.`}
          >
            {/* OFFICIAL EMERGENCY ALERT / BULLETIN */}
            <Text style={[styles.tickerTag, { color: isSafe ? '#22c55e' : getThreatTheme(latestSms.threatLevel).accent }]}>
              {isSafe ? 'OFFICIAL DDMA BULLETIN' : 'OFFICIAL EMERGENCY ALERT'}
            </Text>

            {/* Source */}
            <Text style={styles.tickerSender} numberOfLines={1}>
              {latestSms.senderTag}
            </Text>

            {/* Severity and Unread Chip */}
            <View style={styles.tickerSeverityRow}>
              <ThreatBadge level={latestSms.threatLevel} size="small" />
              {unreadSmsCount > 0 && (
                <View style={styles.tickerUnreadChip}>
                  <Text style={styles.tickerUnreadText}>{unreadSmsCount} new</Text>
                </View>
              )}
            </View>

            {/* Location and Time */}
            <View style={styles.tickerMetaRow}>
              <Text style={styles.tickerLocationText} numberOfLines={1}>
                📍 {latestSms.locationName || 'Dima Hasao Sector'}
              </Text>
              <Text style={styles.tickerTimeText}>
                {getRelativeTime(latestSms.timestampISO)}
              </Text>
            </View>

            {/* Message */}
            <Text style={styles.tickerBody} numberOfLines={2}>
              {latestSms.bodyEnglish}
            </Text>

            {/* Call-To-Action Link */}
            <View style={styles.tickerFooterRow}>
              <Text style={styles.tickerLinkText}>Open Emergency SMS Inbox ➔</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Real-time Connection Status Indicator */}
        <View style={[styles.connectionStatusBar, isOffline ? styles.connBarOffline : styles.connBarOnline]}>
          <View style={styles.connectionStatusLeft}>
            <View style={[styles.onlineDot, { backgroundColor: isOffline ? '#F59E0B' : '#10B981' }]} />
            <Text style={styles.connectionStatusText}>
              {isOffline ? '📡 Autonomous Geofence Mode' : '🟢 ONLINE • Backend & ML Engine Connected'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.enterCoordHeaderBtn}
            onPress={() => setCoordModalVisible(true)}
            accessibilityRole="button"
          >
            <Text style={styles.enterCoordHeaderBtnText}>📍 Enter Coords</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Cache Memory Status Pill */}
        <View style={styles.cachePillContainer}>
          <View style={styles.cachePillLeft}>
            <Text style={styles.cachePillIcon}>📦</Text>
            <Text style={styles.cachePillText}>
              Cache: <Text style={{ fontWeight: '800' }}>{cacheStatus.cellCount.toLocaleString()}</Text> cells • {cacheStatus.timeAgo}
            </Text>
            <View style={[styles.cacheValidityBadge, isOffline ? styles.badgeOffline : styles.badgeFresh]}>
              <Text style={[styles.cacheValidityText, isOffline ? styles.textOffline : styles.textFresh]}>
                {isOffline ? 'OFFLINE ACTIVE' : 'VALID (4H)'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.cacheSyncBtn, syncingGrid && { opacity: 0.6 }]}
            onPress={handleManualGridSync}
            disabled={syncingGrid}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.cacheSyncBtnText}>
              {syncingGrid ? '⏳ Syncing...' : '🔄 Sync Grid'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Custom Coordinate Mode Banner */}
        {activePitchCoord && (
          <View style={styles.pitchActiveBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pitchActiveTitle}>📍 Active Coordinates Under Assessment</Text>
              <Text style={styles.pitchActiveSub}>{activePitchCoord.name} ({activePitchCoord.lat.toFixed(3)}°N, {activePitchCoord.lng.toFixed(3)}°E)</Text>
              {activePitchCoord.evaluated_by && (
                <Text style={styles.pitchActiveEngine}>🧠 {activePitchCoord.evaluated_by}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.resetGpsBtn} onPress={handleResetToRealGps}>
              <Text style={styles.resetGpsBtnText}>📍 Revert to GPS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Risk Status Card (Primary Emergency Assessment Element) */}
        <View style={[styles.statusCard, { borderLeftColor: theme.accent, borderLeftWidth: 4 }]}>
          {/* Card Top Row: State Tag + ThreatBadge */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.statusIndicatorWrapper}>
              <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.statusIndicatorText, { color: theme.text }]}>
                {statusIndicatorText}
              </Text>
            </View>
            <ThreatBadge level={currentRiskLevel} size="medium" />
          </View>

          {/* Primary Risk Heading */}
          <Text style={[styles.statusHeading, { color: theme.text }]}>
            {statusHeading}
          </Text>

          <Text style={styles.statusSubLabel}>
            {statusSubLabel}
          </Text>

          {/* Recommended Action Callout */}
          <View style={[styles.actionCalloutBox, { borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}>
            <Text style={[styles.actionCalloutTag, { color: theme.text }]}>RECOMMENDED CITIZEN ACTION</Text>
            <Text style={[styles.actionCalloutText, { color: theme.text }]}>
              {citizenActionText}
            </Text>
          </View>

          {/* Advisory Detail */}
          <Text style={styles.advisorySummary}>
            {alertStatus?.advisory || 'Continuous slope stability & rainfall monitoring active...'}
          </Text>

          {/* Command-Center Visual Risk Saturation Meter */}
          <View style={styles.riskMeterBox}>
            <View style={styles.riskMeterHeader}>
              <Text style={styles.riskMeterLabel}>SLOPE SATURATION INDEX</Text>
              <Text style={[styles.riskMeterValue, { color: theme.text }]}>{riskScoreLabel}</Text>
            </View>
            <View style={styles.riskMeterTrack}>
              <View
                style={[
                  styles.riskMeterFill,
                  {
                    width: `${Math.min(100, Math.max(5, probabilityPercent))}%`,
                    backgroundColor: theme.accent
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* 4-Item Telemetry Matrix */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Monitored Sector</Text>
              <Text style={styles.telemetryValue} numberOfLines={1} ellipsizeMode="tail">
                {currentCoords?.districtName || alertStatus?.district || 'Dima Hasao Sector'}
              </Text>
            </View>

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Coordinates</Text>
              <Text style={styles.telemetryValue} numberOfLines={1} ellipsizeMode="tail">
                {currentCoords ? `${currentCoords.lat.toFixed(3)}°N, ${currentCoords.lng.toFixed(3)}°E` : 'Acquiring GPS...'}
              </Text>
            </View>

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Saturation Status</Text>
              <Text style={styles.telemetryValue} numberOfLines={1} ellipsizeMode="tail">
                {riskScoreLabel}
              </Text>
            </View>

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Last Assessment</Text>
              <Text style={styles.telemetryValue} numberOfLines={1} ellipsizeMode="tail">
                {alertStatus?.checked_at ? new Date(alertStatus.checked_at).toLocaleTimeString() : 'Live Fix'}
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency First-Aid & Helplines Hero CTA */}
        <TouchableOpacity
          style={styles.firstAidHeroBanner}
          onPress={() => setFirstAidModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Landslide Injury Triage & Valid Helplines"
        >
          <View style={styles.firstAidHeroLeft}>
            <Text style={styles.firstAidHeroIcon}>🩹</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.firstAidHeroTitle}>Landslide Injury & Triage Protocol</Text>
              <Text style={styles.firstAidHeroSub}>
                Sequential First-Aid steps for crush trauma + Direct dial 1070 / 1077 / 108
              </Text>
            </View>
          </View>
          <View style={styles.firstAidArrowBtn}>
            <Text style={styles.firstAidArrowText}>View ➔</Text>
          </View>
        </TouchableOpacity>

        {/* Prominent Enter Coordinates CTA Card */}
        <TouchableOpacity
          style={styles.enterCoordHeroCard}
          onPress={() => setCoordModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Enter coordinates for backend ML risk prediction"
        >
          <View style={styles.enterCoordLeft}>
            <View style={styles.enterCoordIconWrap}>
              <Text style={styles.enterCoordIcon}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.enterCoordTitleRow}>
                <Text style={styles.enterCoordTitle}>Enter Coordinates for ML Risk</Text>
                <View style={styles.onlinePill}>
                  <Text style={styles.onlinePillText}>ONLINE ML</Text>
                </View>
              </View>
              <Text style={styles.enterCoordSub}>
                Input custom Lat/Lng to navigate coordinates to Backend & XGBoost ML Geotechnical Engine
              </Text>
            </View>
          </View>
          <View style={styles.enterCoordArrowBtn}>
            <Text style={styles.enterCoordArrowText}>Check ➔</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Access Dual Hub Cards */}
        <View style={styles.quickAccessGrid}>
          {/* SMS Alerts Inbox Card */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={onOpenSmsInbox}
            accessibilityRole="button"
            accessibilityLabel="Open Emergency SMS Alerts Inbox"
          >
            <View style={styles.quickCardHeader}>
              <Text style={styles.quickCardIcon}>📩</Text>
              {unreadSmsCount > 0 && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{unreadSmsCount} new</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickCardTitle}>Emergency SMS Inbox</Text>
            <Text style={styles.quickCardSub}>Read official emergency alerts</Text>
          </TouchableOpacity>

          {/* SOS SMS Composer Card */}
          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardSos]}
            onPress={onOpenSos}
            accessibilityRole="button"
            accessibilityLabel="Open Emergency SOS SMS Composer"
          >
            <View style={styles.quickCardHeader}>
              <Text style={styles.quickCardIcon}>🆘</Text>
              <View style={styles.badgePillRed}>
                <Text style={styles.badgePillText}>Offline</Text>
              </View>
            </View>
            <Text style={styles.quickCardTitle}>Offline SOS Composer</Text>
            <Text style={styles.quickCardSub}>Send emergency GPS coordinates</Text>
          </TouchableOpacity>
        </View>

        {/* Check Location Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={() => runLocationCheck()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Re-check risk at current location"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.checkButtonText}>📍 Re-Assess Location Hazard</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>⛰️ Spatial Landslide Hazard Buffers</Text>
            <Text style={styles.infoText}>
              • CRITICAL hazard buffer: 2,000 meters{"\n"}
              • HIGH hazard buffer: 500 meters{"\n"}
              • Real-time broadcast alerts delivered via SMS message center
            </Text>
          </View>
        </View>

        {/* Valid Emergency Helplines Card with Direct 1-Tap Calling */}
        <View style={styles.helplineCard}>
          <View style={styles.helplineCardHeader}>
            <Text style={styles.helplineTitle}>📞 Official Emergency Helplines</Text>
            <TouchableOpacity onPress={() => setFirstAidModalVisible(true)}>
              <Text style={styles.viewAllHelpText}>View Full Guide ➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.helplineGrid}>
            <TouchableOpacity
              style={styles.helplineGridBtn}
              onPress={() => handleCallHelpline('1070', 'ASDMA State Disaster Control')}
              accessibilityRole="button"
              accessibilityLabel="Call ASDMA Helpline 1070"
            >
              <Text style={styles.helplineBtnNum}>1070</Text>
              <Text style={styles.helplineBtnLabel} numberOfLines={1} ellipsizeMode="tail">State ASDMA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineGridBtn}
              onPress={() => handleCallHelpline('1077', 'DDMA Dima Hasao')}
              accessibilityRole="button"
              accessibilityLabel="Call DDMA Helpline 1077"
            >
              <Text style={styles.helplineBtnNum}>1077</Text>
              <Text style={styles.helplineBtnLabel} numberOfLines={1} ellipsizeMode="tail">District DDMA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.helplineGridBtn, styles.helplineGridBtnAmb]}
              onPress={() => handleCallHelpline('108', '108 Ambulance')}
              accessibilityRole="button"
              accessibilityLabel="Call Ambulance Helpline 108"
            >
              <Text style={[styles.helplineBtnNum, styles.helplineBtnNumAmb]}>108</Text>
              <Text style={styles.helplineBtnLabel} numberOfLines={1} ellipsizeMode="tail">Ambulance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineGridBtn}
              onPress={() => handleCallHelpline('112', '112 Unified Emergency')}
              accessibilityRole="button"
              accessibilityLabel="Call Unified Emergency 112"
            >
              <Text style={styles.helplineBtnNum}>112</Text>
              <Text style={styles.helplineBtnLabel} numberOfLines={1} ellipsizeMode="tail">Unified 112</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Enter Coordinates Modal for Dynamic ML Risk Evaluation */}
      <Modal
        visible={coordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCoordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.coordModalContent}>
            <View style={styles.coordModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.coordModalTitle}>📍 Enter Coordinates for ML Risk</Text>
                <Text style={styles.coordModalSub}>
                  Directly navigates coordinates to Backend & XGBoost ML Model
                </Text>
              </View>
              <TouchableOpacity
                style={styles.coordModalCloseBtn}
                onPress={() => setCoordModalVisible(false)}
              >
                <Text style={styles.coordModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Form Inputs */}
              <Text style={styles.coordSectionLabel}>CUSTOM GEOGRAPHICAL COORDINATES</Text>

              <Text style={styles.inputFieldLabel}>Location Name / Sector</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Dima Hasao Hill Slope Section"
                placeholderTextColor="#8FA48A"
                value={coordNameInput}
                onChangeText={setCoordNameInput}
              />

              <View style={styles.coordInputsRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputFieldLabel}>Latitude (°N)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="e.g. 25.100"
                    placeholderTextColor="#8FA48A"
                    keyboardType="numeric"
                    value={coordLatInput}
                    onChangeText={setCoordLatInput}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputFieldLabel}>Longitude (°E)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="e.g. 92.750"
                    placeholderTextColor="#8FA48A"
                    keyboardType="numeric"
                    value={coordLngInput}
                    onChangeText={setCoordLngInput}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.coordModalActions}>
              <TouchableOpacity
                style={styles.coordSubmitBtn}
                onPress={() => handleEvaluateCoordinate()}
                disabled={evaluatingCoord}
              >
                {evaluatingCoord ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.coordSubmitBtnText}>🧠 Predict Risk via Backend ML</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Injury First-Aid Protocol & Valid Helplines Modal */}
      <InjuryFirstAidModal
        visible={firstAidModalVisible}
        onClose={() => setFirstAidModalVisible(false)}
      />

      {/* Emergency Alert Modal with Dual Source Routing Indicator & Multilingual Directives */}
      <EmergencyAlertModal
        visible={emergencyModalVisible}
        onClose={handleAcknowledgeEmergencyAlert}
        district={emergencyModalData?.district}
        riskLevel={emergencyModalData?.riskLevel}
        locationName={emergencyModalData?.locationName}
        title={emergencyModalData?.title}
        advisory={emergencyModalData?.advisory}
        source={emergencyModalData?.source}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  navBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  brandContainer: {
    flex: 1,
    marginRight: 8
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981'
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    letterSpacing: -0.2
  },
  navSub: {
    fontSize: 11,
    color: APP_COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500'
  },
  navActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  pitchModeHeaderBtn: {
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pitchModeHeaderBtnText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800'
  },
  settingsBtn: {
    padding: 8,
    minHeight: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingsIcon: {
    fontSize: 18
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110
  },
  smsTickerBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  tickerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  tickerSourceCol: {
    flex: 1,
    marginRight: 8
  },
  tickerTag: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  tickerSender: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6
  },
  tickerSeverityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  tickerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  tickerLocationText: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: '60%'
  },
  tickerTimeText: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500'
  },
  tickerBody: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 4
  },
  tickerFooterRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.borderSubtle
  },
  tickerLinkText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700'
  },
  tickerUnreadChip: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  tickerUnreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  pitchActiveBanner: {
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pitchActiveTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800'
  },
  pitchActiveSub: {
    color: '#14532D',
    fontSize: 11,
    marginTop: 1
  },
  resetGpsBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    minHeight: 34,
    justifyContent: 'center'
  },
  resetGpsBtnText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700'
  },
  offlineBadge: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 14
  },
  offlineBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 16,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  statusIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  statusHeading: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.3
  },
  statusSubLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12
  },
  actionCalloutBox: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginBottom: 12
  },
  actionCalloutTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 3
  },
  actionCalloutText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  advisorySummary: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: '500'
  },
  riskMeterBox: {
    backgroundColor: 'rgba(15, 36, 23, 0.04)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12
  },
  riskMeterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  riskMeterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: APP_COLORS.textMuted,
    letterSpacing: 0.4
  },
  riskMeterValue: {
    fontSize: 11,
    fontWeight: '800'
  },
  riskMeterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 36, 23, 0.08)',
    overflow: 'hidden'
  },
  riskMeterFill: {
    height: '100%',
    borderRadius: 3
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15, 36, 23, 0.08)',
    marginBottom: 12
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  telemetryItem: {
    flex: 1,
    minWidth: '45%'
  },
  telemetryLabel: {
    fontSize: 10,
    color: APP_COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3
  },
  telemetryValue: {
    fontSize: 12,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    marginTop: 2
  },
  firstAidHeroBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  firstAidHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  firstAidHeroIcon: {
    fontSize: 24,
    marginRight: 12
  },
  firstAidHeroTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800'
  },
  firstAidHeroSub: {
    color: '#14532D',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2
  },
  firstAidArrowBtn: {
    backgroundColor: '#166534',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center'
  },
  firstAidArrowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  quickCardSos: {
    borderColor: '#FCA5A5'
  },
  quickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  quickCardIcon: {
    fontSize: 22
  },
  badgePill: {
    backgroundColor: '#166534',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgePillRed: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800'
  },
  quickCardTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2
  },
  quickCardSub: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15
  },
  actionContainer: {
    marginBottom: 14
  },
  checkButton: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  infoTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4
  },
  infoText: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16
  },
  helplineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 16,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  helplineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  helplineTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  viewAllHelpText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800'
  },
  helplineGrid: {
    flexDirection: 'row',
    gap: 6
  },
  helplineGridBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    minHeight: 46
  },
  helplineGridBtnAmb: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5'
  },
  helplineBtnNum: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  helplineBtnNumAmb: {
    color: '#DC2626'
  },
  helplineBtnLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  modeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1
  },
  modeStripLive: {
    backgroundColor: '#F0FDF4',
    borderBottomColor: '#BBF7D0'
  },
  modeStripDemo: {
    backgroundColor: '#FAF5FF',
    borderBottomColor: '#E9D5FF'
  },
  modeStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8
  },
  modeStripIcon: {
    fontSize: 18
  },
  modeTextCol: {
    flex: 1
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  modeStripTitle: {
    fontSize: 12,
    fontWeight: '800'
  },
  modeTitleLive: {
    color: '#166534'
  },
  modeTitleDemo: {
    color: '#6B21A8'
  },
  modeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  modeTagLive: {
    backgroundColor: '#DCFCE7'
  },
  modeTagDemo: {
    backgroundColor: '#F3E8FF'
  },
  modeTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  modeTagTextLive: {
    color: '#15803D'
  },
  modeTagTextDemo: {
    color: '#7E22CE'
  },
  modeStripSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1
  },
  modeToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8
  },
  modeToggleBtnLive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#86EFAC'
  },
  modeToggleBtnDemo: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8B4FE'
  },
  modeToggleBtnText: {
    fontSize: 11,
    fontWeight: '800'
  },
  modeToggleTextLive: {
    color: '#166534'
  },
  modeToggleTextDemo: {
    color: '#6B21A8'
  },

  // Real-time Connection Status Styles
  connectionStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1
  },
  connBarOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  connBarOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A'
  },
  connectionStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  connectionStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46'
  },
  enterCoordHeaderBtn: {
    backgroundColor: '#047857',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  enterCoordHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  // Offline Cache Memory Pill Styles
  cachePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cachePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  cachePillIcon: {
    fontSize: 12
  },
  cachePillText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600'
  },
  cacheValidityBadge: {
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 4
  },
  badgeFresh: {
    backgroundColor: '#E0F2FE'
  },
  badgeOffline: {
    backgroundColor: '#FEF3C7'
  },
  cacheValidityText: {
    fontSize: 9,
    fontWeight: '800'
  },
  textFresh: {
    color: '#0369A1'
  },
  textOffline: {
    color: '#B45309'
  },
  cacheSyncBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  cacheSyncBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569'
  },
  pitchActiveEngine: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    marginTop: 2
  },

  // Enter Coordinates Hero Card
  enterCoordHeroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#34D399',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  enterCoordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  enterCoordIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  enterCoordIcon: {
    fontSize: 22
  },
  enterCoordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  enterCoordTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B'
  },
  onlinePill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  onlinePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900'
  },
  enterCoordSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15
  },
  enterCoordArrowBtn: {
    backgroundColor: '#059669',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10
  },
  enterCoordArrowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },

  // Coordinate Input Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  coordModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  coordModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 12
  },
  coordModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  coordModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  coordModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },
  coordModalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B'
  },
  coordSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 6
  },
  coordPresetsRow: {
    gap: 8,
    marginBottom: 12
  },
  coordPresetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5
  },
  presetChipRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  presetChipOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5'
  },
  presetChipGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0'
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 6
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A'
  },
  coordInputsRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  coordModalActions: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14
  },
  coordSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3
  },
  coordSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});
