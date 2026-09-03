import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform
} from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LocationPermissionScreen } from './src/screens/LocationPermissionScreen';
import { PitchSimulationScreen } from './src/screens/PitchSimulationScreen';
import { SmsInboxScreen } from './src/screens/SmsInboxScreen';
import { SosSmsScreen } from './src/screens/SosSmsScreen';
import { SmsAlertBanner } from './src/components/SmsAlertBanner';
import { InjuryFirstAidModal } from './src/components/InjuryFirstAidModal';
import { smsService } from './src/services/smsService';
import { getAuthToken, removeAuthToken } from './src/services/storageService';
import { APP_COLORS } from './src/constants/theme';
import { getSafeAreaInsets, WEB_CONTAINER_STYLE } from './src/constants/layout';

type AppTab = 'MONITOR' | 'SMS_INBOX' | 'SOS';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppTab>('MONITOR');
  const [isPitchStudioOpen, setIsPitchStudioOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [firstAidModalVisible, setFirstAidModalVisible] = useState<boolean>(false);

  const insets = getSafeAreaInsets();

  useEffect(() => {
    checkAuth();

    const unsubscribe = smsService.subscribe((_, unread) => {
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.log('No token found');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await removeAuthToken();
    setIsAuthenticated(false);
    setHasLocationPermission(false);
    setActiveTab('MONITOR');
  };

  if (loading) {
    return (
      <View style={[styles.rootWrapper, styles.center]}>
        <ActivityIndicator size="large" color="#1E2B18" />
      </View>
    );
  }

  return (
    <View style={[styles.rootWrapper, insets.isWeb && styles.webOuter]}>
      <SafeAreaView
        style={[
          styles.container,
          insets.isWeb && styles.webContainer,
          { paddingTop: Platform.OS === 'android' ? insets.top : 0 }
        ]}
      >
        <StatusBar style="dark" translucent={Platform.OS === 'android'} backgroundColor="transparent" />

        {/* Global Non-Blocking Incoming SMS Banner */}
        <SmsAlertBanner
          onViewSms={() => {
            setIsPitchStudioOpen(false);
            setActiveTab('SMS_INBOX');
          }}
          onOpenFirstAid={() => setFirstAidModalVisible(true)}
        />

        {!isAuthenticated ? (
          <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
        ) : !hasLocationPermission ? (
          <LocationPermissionScreen
            onPermissionComplete={() => setHasLocationPermission(true)}
          />
        ) : isPitchStudioOpen ? (
          <PitchSimulationScreen onBackToHome={() => setIsPitchStudioOpen(false)} />
        ) : (
          <View style={styles.mainLayout}>
            {/* Active Screen Tab View */}
            <View style={styles.tabContent}>
              {activeTab === 'MONITOR' && (
                <HomeScreen
                  onOpenSmsInbox={() => setActiveTab('SMS_INBOX')}
                  onOpenSos={() => setActiveTab('SOS')}
                  onOpenSettings={handleLogout}
                  onOpenPitchSimulation={() => setIsPitchStudioOpen(true)}
                />
              )}

              {activeTab === 'SMS_INBOX' && (
                <SmsInboxScreen onOpenSos={() => setActiveTab('SOS')} />
              )}

              {activeTab === 'SOS' && <SosSmsScreen />}
            </View>

            {/* Bottom 3-Tab Navigation Bar with Safe Area Bottom Inset */}
            <View
              style={[
                styles.bottomNav,
                {
                  paddingBottom: Math.max(insets.bottom, 6),
                  height: (Platform.OS === 'ios' ? 56 : 58) + Math.max(insets.bottom, 6)
                }
              ]}
            >
              {/* Tab 1: Monitor */}
              <TouchableOpacity
                style={[styles.navItem, activeTab === 'MONITOR' && styles.navItemActive]}
                onPress={() => setActiveTab('MONITOR')}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'MONITOR' }}
                accessibilityLabel="Monitor Tab: Hazard assessment"
              >
                <Text style={[styles.navIconText, activeTab === 'MONITOR' && styles.navIconTextActive]}>
                  🛰️
                </Text>
                <Text style={[styles.navLabel, activeTab === 'MONITOR' && styles.navLabelActive]}>
                  Monitor
                </Text>
              </TouchableOpacity>

              {/* Tab 2: SMS Alerts */}
              <TouchableOpacity
                style={[styles.navItem, activeTab === 'SMS_INBOX' && styles.navItemActive]}
                onPress={() => setActiveTab('SMS_INBOX')}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'SMS_INBOX' }}
                accessibilityLabel={`SMS Alerts Tab: ${unreadCount} unread emergency messages`}
              >
                <View style={styles.navIconBadgeWrapper}>
                  <Text style={[styles.navIconText, activeTab === 'SMS_INBOX' && styles.navIconTextActive]}>
                    📩
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.navLabel, activeTab === 'SMS_INBOX' && styles.navLabelActive]}>
                  SMS Alerts
                </Text>
              </TouchableOpacity>

              {/* Tab 3: Emergency SOS */}
              <TouchableOpacity
                style={[styles.navItem, activeTab === 'SOS' && styles.navItemActive]}
                onPress={() => setActiveTab('SOS')}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'SOS' }}
                accessibilityLabel="Emergency SOS Tab: Pre-fill offline SMS"
              >
                <Text style={[styles.navIconText, activeTab === 'SOS' && styles.navIconTextActive]}>
                  🆘
                </Text>
                <Text style={[styles.navLabel, activeTab === 'SOS' && styles.navLabelActive]}>
                  SOS SMS
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Global Injury First Aid & Valid Helplines Modal */}
        <InjuryFirstAidModal
          visible={firstAidModalVisible}
          onClose={() => setFirstAidModalVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  webOuter: {
    backgroundColor: '#E8EFE9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  webContainer: {
    ...WEB_CONTAINER_STYLE
  },
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  mainLayout: {
    flex: 1
  },
  tabContent: {
    flex: 1
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.borderDefault,
    paddingTop: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  navItemActive: {
    borderTopWidth: 2.5,
    borderTopColor: '#1E2B18'
  },
  navIconBadgeWrapper: {
    position: 'relative'
  },
  navIconText: {
    fontSize: 20,
    opacity: 0.6
  },
  navIconTextActive: {
    opacity: 1
  },
  navLabel: {
    fontSize: 11,
    color: APP_COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2
  },
  navLabelActive: {
    color: APP_COLORS.textPrimary,
    fontWeight: '800'
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900'
  }
});
