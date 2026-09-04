import React, { useState, useEffect } from 'react';
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
  Linking
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAlert, updateLocation, fetchActiveBroadcast, dismissActiveBroadcast, AlertCheckResponse } from '../services/apiService';
import { performOfflineGeofenceCheck, syncRiskZonesToCache } from '../services/offlineRiskEngine';
import { smsService, EmergencySmsAlert } from '../services/smsService';
import { ACTIVE_COORD_KEY, SavedCoordinate } from './PitchSimulationScreen';
import { getThreatTheme, APP_COLORS, ThreatLevel } from '../constants/theme';
import { ThreatBadge } from '../components/ThreatBadge';
import { InjuryFirstAidModal, VALID_HELPLINES } from '../components/InjuryFirstAidModal';

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
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [lastAckBroadcastId, setLastAckBroadcastId] = useState<number>(0);
  const [latestSms, setLatestSms] = useState<EmergencySmsAlert | null>(null);
  const [unreadSmsCount, setUnreadSmsCount] = useState<number>(0);
  const [firstAidModalVisible, setFirstAidModalVisible] = useState<boolean>(false);

  useEffect(() => {
    initApp();

    const unsubscribe = smsService.subscribe((alerts, unread) => {
      if (alerts.length > 0) {
        setLatestSms(alerts[0]);
      }
      setUnreadSmsCount(unread);
    });

    return () => unsubscribe();
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

          const isInsideRiskZone =
            dynamicCheck.risk_level === 'CRITICAL' ||
            dynamicCheck.risk_level === 'HIGH' ||
            dynamicCheck.in_risk_zone ||
            broadcast.threatLevel === 'CRITICAL' ||
            broadcast.threatLevel === 'HIGH';

          if (isInsideRiskZone) {
            const evaluatedRisk =
              dynamicCheck.risk_level === 'CRITICAL' || dynamicCheck.risk_level === 'HIGH'
                ? dynamicCheck.risk_level
                : (broadcast.threatLevel || 'HIGH');

            console.log(`🚨 [DANGER POINT MATCHED] Coord (${currLat}, ${currLng}) evaluated as ${evaluatedRisk}. Triggering alert & siren.`);
            setLastAckBroadcastId(broadcast.broadcast_id);
            setAlertStatus({
              in_risk_zone: true,
              risk_level: evaluatedRisk,
              district: dynamicCheck.district || currDistrict,
              probability: dynamicCheck.probability || 0.94,
              advisory: broadcast.body || dynamicCheck.advisory || 'Extreme slope destabilization detected near active coordinate.',
              action_required: dynamicCheck.action_required || 'IMMEDIATE EVACUATION: Move away from steep slopes.',
              alert_dispatched: true,
              checked_at: new Date().toISOString()
            });

            // Dispatch to SMS Inbox and trigger non-blocking banner with siren
            await smsService.addIncomingAlert({
              threatLevel: evaluatedRisk,
              senderTag: 'DDMA DIMA HASAO',
              locationName: currDistrict,
              bodyEnglish: broadcast.body || `EMERGENCY ALERT: Severe landslide hazard detected near ${currDistrict}. Evacuate vulnerable slopes immediately.`
            });

            dismissActiveBroadcast();
          } else {
            console.log(`🛡️ [SAFE POINT MATCHED] Coord (${currLat}, ${currLng}) evaluated as SAFE.`);
          }
        }
      } catch (err) {}
    }, 1200);

    return () => clearInterval(interval);
  }, [lastAckBroadcastId, currentCoords]);

  const initApp = async () => {
    const count = await syncRiskZonesToCache();
    setCachedCount(count);
    const stored = await smsService.getStoredAlerts();
    if (stored.length > 0) setLatestSms(stored[0]);
    const unread = await smsService.getUnreadAlertCount();
    setUnreadSmsCount(unread);
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

        let statusResult: AlertCheckResponse;
        try {
          statusResult = await checkAlert(parsed.lat, parsed.lng);
          setIsOffline(Boolean(statusResult.isOfflineFallback));
        } catch (netErr) {
          setIsOffline(true);
          statusResult = await performOfflineGeofenceCheck(parsed.lat, parsed.lng);
        }

        if (parsed.risk_level === 'CRITICAL' || parsed.risk_level === 'HIGH') {
          statusResult.risk_level = parsed.risk_level as any;
          statusResult.in_risk_zone = true;
        }

        setAlertStatus(statusResult);

        // If high risk or critical, trigger emergency alert banner and siren
        if (statusResult.risk_level === 'CRITICAL' || statusResult.risk_level === 'HIGH') {
          await smsService.addIncomingAlert({
            threatLevel: statusResult.risk_level,
            senderTag: 'DDMA DIMA HASAO',
            locationName: parsed.name || 'Dima Hasao Sector',
            bodyEnglish: statusResult.advisory || `EMERGENCY ALERT: Severe landslide hazard detected near ${parsed.name}. Evacuate vulnerable slopes immediately.`
          });
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
              { borderLeftColor: getThreatTheme(latestSms.threatLevel).accent }
            ]}
            onPress={onOpenSmsInbox}
            accessibilityRole="button"
            accessibilityLabel={`Latest SMS Alert from ${latestSms.senderTag}. Tap to open SMS Alerts Inbox.`}
          >
            {/* Row 1: Source Tag, Sender, and Unread Count */}
            <View style={styles.tickerTopRow}>
              <View style={styles.tickerSourceCol}>
                <Text style={[styles.tickerTag, { color: getThreatTheme(latestSms.threatLevel).accent }]}>
                  OFFICIAL EMERGENCY ALERT
                </Text>
                <Text style={styles.tickerSender} numberOfLines={1}>
                  {latestSms.senderTag}
                </Text>
              </View>
              {unreadSmsCount > 0 && (
                <View style={styles.tickerUnreadChip}>
                  <Text style={styles.tickerUnreadText}>{unreadSmsCount} new</Text>
                </View>
              )}
            </View>

            {/* Row 2: Threat Badge and Location metadata */}
            <View style={styles.tickerMetaRow}>
              <ThreatBadge level={latestSms.threatLevel} size="small" />
              {latestSms.locationName && (
                <Text style={styles.tickerLocationText} numberOfLines={1}>
                  📍 {latestSms.locationName}
                </Text>
              )}
            </View>

            <Text style={styles.tickerBody} numberOfLines={2}>
              {latestSms.bodyEnglish}
            </Text>

            {/* Row 3: Call-To-Action Link */}
            <View style={styles.tickerFooterRow}>
              <Text style={styles.tickerLinkText}>Open Emergency SMS Inbox ➔</Text>
            </View>
          </TouchableOpacity>
        )}

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
              📡 Network Offline • Operating on Client Geofence Cache ({cachedCount} zones)
            </Text>
          </View>
        )}

        {/* Main Risk Status Card (Primary Emergency Assessment Element) */}
        <View style={[styles.statusCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
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
            <Text style={styles.quickCardSub}>Official multilingual broadcasts & advisory</Text>
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
            <Text style={styles.quickCardSub}>Pre-fill rescue SMS with exact GPS</Text>
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

      {/* Injury First-Aid Protocol & Valid Helplines Modal */}
      <InjuryFirstAidModal
        visible={firstAidModalVisible}
        onClose={() => setFirstAidModalVisible(false)}
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
    fontWeight: '800',
    letterSpacing: 0.5
  },
  tickerSender: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2
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
    maxWidth: '55%'
  },
  tickerBody: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginVertical: 4
  },
  tickerFooterRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.borderSubtle
  },
  tickerLinkText: {
    color: '#166534',
    fontSize: 11,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
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
  }
});
