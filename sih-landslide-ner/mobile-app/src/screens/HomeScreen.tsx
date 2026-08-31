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
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAlert, updateLocation, fetchActiveBroadcast, dismissActiveBroadcast, AlertCheckResponse } from '../services/apiService';
import { performOfflineGeofenceCheck, syncRiskZonesToCache } from '../services/offlineRiskEngine';
import { smsService, EmergencySmsAlert } from '../services/smsService';
import { ACTIVE_COORD_KEY, SavedCoordinate } from './PitchSimulationScreen';
import { getThreatTheme, APP_COLORS } from '../constants/theme';
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

          const isInsideRiskZone = dynamicCheck.risk_level === 'CRITICAL' || dynamicCheck.risk_level === 'HIGH' || dynamicCheck.in_risk_zone;

          if (isInsideRiskZone) {
            console.log(`🚨 [DANGER POINT MATCHED] Coord (${currLat}, ${currLng}) evaluated as ${dynamicCheck.risk_level}. Adding SMS alert.`);
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

            // Dispatch to SMS Inbox and trigger non-blocking banner
            await smsService.addIncomingAlert({
              threatLevel: dynamicCheck.risk_level,
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

        try {
          const response = await checkAlert(parsed.lat, parsed.lng);
          setAlertStatus(response);
          setIsOffline(Boolean(response.isOfflineFallback));
        } catch (netErr) {
          setIsOffline(true);
          const offlineResult = await performOfflineGeofenceCheck(parsed.lat, parsed.lng);
          setAlertStatus(offlineResult);
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

      try {
        const response = await checkAlert(lat, lng);
        setAlertStatus({
          ...response,
          district: districtName
        });
        setIsOffline(Boolean(response.isOfflineFallback));
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

  const theme = getThreatTheme(alertStatus?.risk_level);

  return (
    <View style={styles.container}>
      {/* Top Website-Matched Mint Navbar */}
      <View style={styles.navBar}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.navTitle}>NER Landslide Warning</Text>
          </View>
          <Text style={styles.navSub}>Dima Hasao Early Warning System • SIH 2026</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            style={styles.smsTickerBar}
            onPress={onOpenSmsInbox}
            accessibilityRole="button"
            accessibilityLabel={`Latest SMS Alert from ${latestSms.senderTag}. Tap to open SMS Alerts Inbox.`}
          >
            <View style={styles.tickerHeaderRow}>
              <View style={styles.tickerBadgeCol}>
                <Text style={styles.tickerTag}>📩 OFFICIAL ALERT SMS</Text>
                <Text style={styles.tickerSender}>{latestSms.senderTag}</Text>
              </View>
              <ThreatBadge level={latestSms.threatLevel} size="small" />
            </View>

            <Text style={styles.tickerBody} numberOfLines={2}>
              {latestSms.bodyEnglish}
            </Text>

            <View style={styles.tickerFooterRow}>
              <Text style={styles.tickerLinkText}>Open Emergency SMS Inbox ➔</Text>
              {unreadSmsCount > 0 && (
                <View style={styles.tickerUnreadChip}>
                  <Text style={styles.tickerUnreadText}>{unreadSmsCount} new</Text>
                </View>
              )}
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

        {/* Main Risk Status Card (Website Styled Container) */}
        <View style={[styles.statusCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.statusHeading, { color: theme.text }]}>
                {alertStatus?.risk_level === 'CRITICAL' ? 'CRITICAL DANGER ZONE' :
                 alertStatus?.risk_level === 'HIGH' ? 'HIGH RISK HAZARD ZONE' :
                 alertStatus?.risk_level === 'MODERATE' ? 'MODERATE RISK ZONE' : 'SAFE ZONE VERIFIED'}
              </Text>
              <Text style={styles.statusSubLabel}>
                {alertStatus?.risk_level === 'SAFE'
                  ? 'No imminent landslide threat detected at your current coordinates'
                  : 'AI risk model detected high soil saturation & severe slope instability'}
              </Text>
            </View>
            <ThreatBadge level={alertStatus?.risk_level || 'SAFE'} size="medium" />
          </View>

          <Text style={styles.advisorySummary}>
            {alertStatus?.advisory || 'Continuous slope stability & rainfall monitoring active...'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Monitored Sector</Text>
              <Text style={styles.metaValue}>
                {currentCoords?.districtName || alertStatus?.district || 'Dima Hasao Sector'} ({currentCoords?.lat.toFixed(3)}°, {currentCoords?.lng.toFixed(3)}°)
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Last Assessment</Text>
              <Text style={styles.metaValue}>
                {alertStatus?.checked_at ? new Date(alertStatus.checked_at).toLocaleTimeString() : 'Just now'}
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
                Sequential First-Aid steps for crush injuries + Direct dial 1070 / 1077 / 108
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

        {/* Valid Emergency Helplines Card */}
        <View style={styles.helplineCard}>
          <View style={styles.helplineCardHeader}>
            <Text style={styles.helplineTitle}>📞 Official Emergency Helplines</Text>
            <TouchableOpacity onPress={() => setFirstAidModalVisible(true)}>
              <Text style={styles.viewAllHelpText}>View All ➔</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helplineRow}>• State Disaster (ASDMA): <Text style={styles.bold}>1070</Text></Text>
          <Text style={styles.helplineRow}>• District Disaster (DDMA): <Text style={styles.bold}>1077</Text></Text>
          <Text style={styles.helplineRow}>• Medical Trauma Ambulance: <Text style={styles.bold}>108</Text></Text>
          <Text style={styles.helplineRow}>• All-in-One National Helpline: <Text style={styles.bold}>112</Text></Text>
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
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981'
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: APP_COLORS.textPrimary
  },
  navSub: {
    fontSize: 11,
    color: APP_COLORS.textMuted,
    marginTop: 2
  },
  pitchModeHeaderBtn: {
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    minHeight: 36,
    justifyContent: 'center'
  },
  pitchModeHeaderBtnText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800'
  },
  settingsBtn: {
    padding: 8,
    minHeight: 40,
    justifyContent: 'center'
  },
  settingsIcon: {
    fontSize: 20
  },
  scrollContent: {
    padding: 16
  },
  smsTickerBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  tickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  tickerBadgeCol: {
    flex: 1
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
    fontWeight: '800'
  },
  tickerBody: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginVertical: 4
  },
  tickerFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
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
  offlineBadge: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 16
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
    marginBottom: 16,
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  statusHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2
  },
  statusSubLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15
  },
  advisorySummary: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(30, 43, 24, 0.08)',
    marginBottom: 12
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaLabel: {
    fontSize: 10,
    color: APP_COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700'
  },
  metaValue: {
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
    marginBottom: 16,
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
    fontSize: 26,
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  firstAidArrowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    shadowColor: '#1E2B18',
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
    marginBottom: 16
  },
  checkButton: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
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
    marginBottom: 20
  },
  helplineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
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
  helplineRow: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4
  },
  bold: {
    fontWeight: '800',
    color: APP_COLORS.textPrimary
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
    fontSize: 11
  },
  resetGpsBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  resetGpsBtnText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700'
  }
});
