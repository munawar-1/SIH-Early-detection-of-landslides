import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  AccessibilityInfo
} from 'react-native';
import { EmergencySmsAlert, smsService } from '../services/smsService';
import { soundService } from '../services/soundService';
import { getThreatTheme, APP_COLORS } from '../constants/theme';
import { ThreatBadge } from './ThreatBadge';
import { getSafeAreaInsets } from '../constants/layout';

interface SmsAlertBannerProps {
  onViewSms: (alert: EmergencySmsAlert) => void;
  onOpenFirstAid?: () => void;
}

export const SmsAlertBanner: React.FC<SmsAlertBannerProps> = ({ onViewSms, onOpenFirstAid }) => {
  const [currentAlert, setCurrentAlert] = useState<EmergencySmsAlert | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  const insets = getSafeAreaInsets();
  const OFFSCREEN_Y = -250;
  const translateY = useRef(new Animated.Value(OFFSCREEN_Y)).current;
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((enabled) => {
      setReduceMotion(Boolean(enabled));
    }).catch(() => {});

    const unsubscribe = smsService.subscribeBanner((alert) => {
      showAlert(alert);
    });

    return () => {
      unsubscribe();
      soundService.stopEmergencySiren();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [reduceMotion]);

  const showAlert = (alert: EmergencySmsAlert) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);

    setCurrentAlert(alert);
    setVisible(true);

    // Play siren for urgent danger levels
    if (alert.threatLevel === 'CRITICAL' || alert.threatLevel === 'HIGH') {
      soundService.playEmergencySiren();
    }

    if (reduceMotion) {
      translateY.setValue(0);
    } else {
      translateY.setValue(OFFSCREEN_Y);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14
      }).start();
    }

    // Auto-dismiss after 9 seconds and stop siren
    dismissTimer.current = setTimeout(() => {
      hideAlert();
    }, 9000);
  };

  const hideAlert = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    soundService.stopEmergencySiren();

    if (reduceMotion) {
      setVisible(false);
      setCurrentAlert(null);
      translateY.setValue(OFFSCREEN_Y);
    } else {
      Animated.timing(translateY, {
        toValue: OFFSCREEN_Y,
        duration: 250,
        useNativeDriver: true
      }).start(() => {
        setVisible(false);
        setCurrentAlert(null);
      });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy < -10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20) {
          hideAlert();
        }
      }
    })
  ).current;

  if (!visible || !currentAlert) return null;

  const theme = getThreatTheme(currentAlert.threatLevel);
  const dynamicTop = Platform.OS === 'android' ? insets.top + 8 : (Platform.OS === 'ios' ? Math.max(insets.top, 12) : 12);

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          top: dynamicTop,
          transform: [{ translateY }],
          borderColor: theme.badgeBorder,
          backgroundColor: theme.cardBg
        }
      ]}
      {...panResponder.panHandlers}
      accessibilityRole="alert"
      accessibilityLabel={`Emergency SMS Alert from ${currentAlert.senderTag}: ${currentAlert.bodyEnglish}`}
    >
      <View style={styles.contentRow}>
        {/* Left Accent Strip */}
        <View style={[styles.accentBar, { backgroundColor: theme.accent }]} />

        <View style={styles.mainContent}>
          {/* Header Row: Sender + Badge + Time */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.senderText} numberOfLines={1}>
                {currentAlert.senderTag}
              </Text>
              <Text style={styles.smsTag}>• ALERT SMS</Text>
              {(currentAlert.threatLevel === 'CRITICAL' || currentAlert.threatLevel === 'HIGH') && (
                <View style={styles.sirenPill}>
                  <Text style={styles.sirenPillText}>🔊 SIREN ACTIVE</Text>
                </View>
              )}
            </View>
            <ThreatBadge level={currentAlert.threatLevel} size="small" />
          </View>

          {/* Alert Message Snippet */}
          <Text style={styles.messageText} numberOfLines={2}>
            {currentAlert.bodyEnglish}
          </Text>

          {/* Footer Action Row */}
          <View style={styles.footerRow}>
            <Text style={styles.timeText}>Just now</Text>

            <View style={styles.actionButtons}>
              {onOpenFirstAid && (
                <TouchableOpacity
                  style={styles.firstAidBtn}
                  onPress={() => {
                    hideAlert();
                    onOpenFirstAid();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Open First-Aid & Helplines"
                >
                  <Text style={styles.firstAidBtnText}>🩹 First-Aid</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={hideAlert}
                accessibilityRole="button"
                accessibilityLabel="Dismiss SMS Banner"
              >
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewSmsBtn, { backgroundColor: theme.accent }]}
                onPress={() => {
                  hideAlert();
                  onViewSms(currentAlert);
                }}
                accessibilityRole="button"
                accessibilityLabel="View SMS in Alerts Inbox"
              >
                <Text style={styles.viewSmsBtnText}>View SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden'
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'stretch'
  },
  accentBar: {
    width: 6
  },
  mainContent: {
    flex: 1,
    padding: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  senderText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  smsTag: {
    color: APP_COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4
  },
  sirenPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6
  },
  sirenPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  messageText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginVertical: 4
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  timeText: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  firstAidBtn: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  firstAidBtnText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800'
  },
  dismissBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8
  },
  dismissBtnText: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  viewSmsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  viewSmsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});
