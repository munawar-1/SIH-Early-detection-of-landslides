import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  Linking
} from 'react-native';
import {
  EmergencySmsAlert,
  SupportedLanguage,
  smsService
} from '../services/smsService';
import { getThreatTheme, APP_COLORS } from '../constants/theme';
import { ThreatBadge } from '../components/ThreatBadge';
import { InjuryFirstAidModal, VALID_HELPLINES } from '../components/InjuryFirstAidModal';

const LANGUAGE_TABS: { key: SupportedLanguage; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'as', label: 'অসমীয়া', flag: '🇮🇳' },
  { key: 'bn', label: 'বাংলা', flag: '🇮🇳' },
  { key: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { key: 'dimasa', label: 'Dimasa', flag: '🏔️' }
];

type FilterCategory = 'ALL' | 'CRITICAL' | 'UNREAD';

interface SmsInboxScreenProps {
  onOpenSos: () => void;
}

export const SmsInboxScreen: React.FC<SmsInboxScreenProps> = ({ onOpenSos }) => {
  const [alerts, setAlerts] = useState<EmergencySmsAlert[]>([]);
  const [filter, setFilter] = useState<FilterCategory>('ALL');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [firstAidModalVisible, setFirstAidModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadAlerts();

    const unsubscribe = smsService.subscribe((updatedAlerts) => {
      setAlerts([...updatedAlerts]);
    });

    return () => unsubscribe();
  }, []);

  const loadAlerts = async () => {
    const list = await smsService.getStoredAlerts();
    setAlerts([...list]);
  };

  const handleCardPress = async (alert: EmergencySmsAlert) => {
    if (expandedAlertId === alert.id) {
      setExpandedAlertId(null);
    } else {
      setExpandedAlertId(alert.id);
      if (!alert.isRead) {
        await smsService.markAlertAsRead(alert.id);
      }
    }
  };

  const handleMarkAllRead = async () => {
    await smsService.markAllAlertsAsRead();
  };

  const handleCopySms = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (e) {
      Alert.alert('SMS Text', text);
    }
  };

  const handleForwardNativeSms = async (alert: EmergencySmsAlert) => {
    const text = alert.translations[selectedLang] || alert.bodyEnglish;
    const targetContact = await smsService.getTargetContact();
    await smsService.openNativeComposer(targetContact, text);
  };

  const handleDialHelpline = (number: string, title: string) => {
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
    const diffMs = Date.now() - new Date(timestampISO).getTime();
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestampISO).toLocaleDateString();
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'CRITICAL') return a.threatLevel === 'CRITICAL';
    if (filter === 'UNREAD') return !a.isRead;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <View style={styles.container}>
      {/* Top Banner Disclaimer */}
      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerText}>
          🚨 Official Citizen Emergency Message Center • Dima Hasao Disaster Operations
        </Text>
      </View>

      {/* Screen Title & Action Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>Emergency SMS Inbox</Text>
          <Text style={styles.pageSub}>
            {unreadCount > 0
              ? `${unreadCount} unread emergency dispatch${unreadCount > 1 ? 'es' : ''}`
              : 'All alert advisories acknowledged'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.firstAidPillBtn}
            onPress={() => setFirstAidModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="First-Aid & Helplines"
          >
            <Text style={styles.firstAidPillText}>🩹 First-Aid</Text>
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markReadBtn}
              onPress={handleMarkAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all SMS alerts as read"
            >
              <Text style={styles.markReadBtnText}>Mark read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Category Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          onPress={() => setFilter('ALL')}
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'ALL' }}
        >
          <Text style={[styles.filterChipText, filter === 'ALL' && styles.filterChipTextActive]}>
            All Alerts ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'CRITICAL' && styles.filterChipActive]}
          onPress={() => setFilter('CRITICAL')}
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'CRITICAL' }}
        >
          <Text style={[styles.filterChipText, filter === 'CRITICAL' && styles.filterChipTextActive]}>
            Critical Red ({alerts.filter((a) => a.threatLevel === 'CRITICAL').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'UNREAD' && styles.filterChipActive]}
          onPress={() => setFilter('UNREAD')}
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'UNREAD' }}
        >
          <Text style={[styles.filterChipText, filter === 'UNREAD' && styles.filterChipTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language Selector Bar */}
      <View style={styles.langSelectorBar}>
        <Text style={styles.langBarLabel}>Language:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
          {LANGUAGE_TABS.map((item) => {
            const isSelected = item.key === selectedLang;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.langChip, isSelected && styles.langChipActive]}
                onPress={() => setSelectedLang(item.key)}
                accessibilityRole="button"
                accessibilityLabel={`Translate to ${item.label}`}
              >
                <Text style={[styles.langChipText, isSelected && styles.langChipTextActive]}>
                  {item.flag} {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Alert List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Alert Messages Found</Text>
            <Text style={styles.emptySub}>
              {filter === 'UNREAD'
                ? 'You have acknowledged all emergency SMS dispatches.'
                : 'No emergency SMS alerts logged yet — incoming disaster warnings will appear here.'}
            </Text>
          </View>
        ) : (
          filteredAlerts.map((item) => {
            const isExpanded = expandedAlertId === item.id;
            const theme = getThreatTheme(item.threatLevel);
            const localizedBody = item.translations[selectedLang] || item.bodyEnglish;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.alertCard,
                  !item.isRead && styles.alertCardUnread,
                  { borderColor: isExpanded ? theme.badgeBorder : APP_COLORS.borderDefault }
                ]}
                activeOpacity={0.88}
                onPress={() => handleCardPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`Alert from ${item.senderTag}, Level ${item.threatLevel}. Tap to toggle details.`}
              >
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.senderCol}>
                    <View style={styles.senderBadgeRow}>
                      <Text style={styles.senderBadgeText}>{item.senderTag}</Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                    {item.locationName && (
                      <Text style={styles.locationSubText} numberOfLines={1}>
                        📍 {item.locationName}
                      </Text>
                    )}
                  </View>

                  <View style={styles.cardMetaRight}>
                    <ThreatBadge level={item.threatLevel} size="small" />
                    <Text style={styles.cardTimeText}>{getRelativeTime(item.timestampISO)}</Text>
                  </View>
                </View>

                {/* SMS Body Text */}
                <View style={[styles.messageBox, { backgroundColor: theme.cardBg }]}>
                  <Text style={styles.messageBodyText} numberOfLines={isExpanded ? undefined : 3}>
                    {localizedBody}
                  </Text>
                </View>

                {/* Expanded Details & Actions */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {item.precautions && item.precautions.length > 0 && (
                      <View style={styles.precautionsBox}>
                        <Text style={styles.precautionsTitle}>🛡️ Mandatory Safety Actions:</Text>
                        {item.precautions.map((p, idx) => (
                          <Text key={idx} style={styles.precautionItem}>
                            • {p}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Action Buttons Row */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtnSecondary}
                        onPress={() => handleCopySms(localizedBody)}
                        accessibilityRole="button"
                        accessibilityLabel="Copy SMS text to clipboard"
                      >
                        <Text style={styles.actionBtnSecondaryText}>📋 Copy SMS</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => handleForwardNativeSms(item)}
                        accessibilityRole="button"
                        accessibilityLabel="Pre-fill native SMS composer"
                      >
                        <Text style={styles.actionBtnPrimaryText}>📤 Pre-fill SMS</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Valid Helpline Direct Callers */}
                    <View style={styles.helplineQuickGrid}>
                      <TouchableOpacity
                        style={styles.helplineCallBtn}
                        onPress={() => handleDialHelpline('1077', 'DDMA Dima Hasao')}
                      >
                        <Text style={styles.helplineCallBtnText}>📞 Call 1077 (DDMA)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.helplineCallBtn, styles.helplineCallBtnMed]}
                        onPress={() => handleDialHelpline('108', '108 Ambulance')}
                      >
                        <Text style={styles.helplineCallBtnText}>🚑 Call 108 (Medical)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Card Footer Toggle Hint */}
                <View style={styles.cardFooter}>
                  <Text style={styles.toggleHint}>
                    {isExpanded ? 'Tap to collapse ▲' : 'Tap for precautions & direct helplines ▼'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Bottom Shortcut to Injury First Aid Guide */}
        <TouchableOpacity
          style={styles.firstAidBannerCard}
          onPress={() => setFirstAidModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open First Aid and Trauma Guide"
        >
          <View style={styles.firstAidBannerLeft}>
            <Text style={styles.firstAidBannerIcon}>🩹</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.firstAidBannerTitle}>Landslide Injury & Triage Protocol</Text>
              <Text style={styles.firstAidBannerSub}>Step-by-step first-aid steps for crush trauma + Valid helplines (1070 / 1077 / 108)</Text>
            </View>
          </View>
          <Text style={styles.firstAidBannerArrow}>➔</Text>
        </TouchableOpacity>
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
  disclaimerBar: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#86EFAC'
  },
  disclaimerText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center'
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  pageTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800'
  },
  pageSub: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  firstAidPillBtn: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    minHeight: 36,
    justifyContent: 'center'
  },
  firstAidPillText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800'
  },
  markReadBtn: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    minHeight: 36,
    justifyContent: 'center'
  },
  markReadBtnText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderSubtle
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    minHeight: 34,
    justifyContent: 'center'
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    borderColor: APP_COLORS.buttonPrimaryBg
  },
  filterChipText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  filterChipTextActive: {
    color: '#FFFFFF'
  },
  langSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  langBarLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 8
  },
  langScroll: {
    gap: 6
  },
  langChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  langChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC'
  },
  langChipText: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600'
  },
  langChipTextActive: {
    color: '#166534',
    fontWeight: '800'
  },
  scrollContent: {
    padding: 16
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginTop: 20
  },
  emptyTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6
  },
  emptySub: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 14,
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  alertCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  senderCol: {
    flex: 1,
    marginRight: 8
  },
  senderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  senderBadgeText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginLeft: 6
  },
  locationSubText: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  cardMetaRight: {
    alignItems: 'flex-end'
  },
  cardTimeText: {
    color: APP_COLORS.textMuted,
    fontSize: 10,
    marginTop: 3
  },
  messageBox: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(30, 43, 24, 0.06)'
  },
  messageBodyText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 19
  },
  expandedSection: {
    marginTop: 12
  },
  precautionsBox: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 12
  },
  precautionsTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6
  },
  precautionItem: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: APP_COLORS.bgCardSubtle,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    minHeight: 44,
    justifyContent: 'center'
  },
  actionBtnSecondaryText: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center'
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  helplineQuickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  helplineCallBtn: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
    minHeight: 44,
    justifyContent: 'center'
  },
  helplineCallBtnMed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5'
  },
  helplineCallBtnText: {
    color: APP_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800'
  },
  cardFooter: {
    alignItems: 'center',
    paddingTop: 8
  },
  toggleHint: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  firstAidBannerCard: {
    marginTop: 10,
    marginBottom: 24,
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  firstAidBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  firstAidBannerIcon: {
    fontSize: 26,
    marginRight: 12
  },
  firstAidBannerTitle: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800'
  },
  firstAidBannerSub: {
    color: '#14532D',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2
  },
  firstAidBannerArrow: {
    fontSize: 18,
    color: '#166534',
    fontWeight: '800'
  }
});
