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

      {/* Screen Title & Action Bar with Zero Overlap */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleCol}>
          <Text style={styles.pageTitle}>Emergency SMS Inbox</Text>
          <Text style={styles.pageSub}>
            {unreadCount > 0
              ? `${unreadCount} unread emergency dispatch${unreadCount > 1 ? 'es' : ''}`
              : 'All alert advisories acknowledged'}
          </Text>
        </View>

        <View style={styles.topBarActions}>
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

      {/* Segmented Filter Tab Controls */}
      <View style={styles.segmentedFilterWrapper}>
        <View style={styles.segmentedFilterContainer}>
          <TouchableOpacity
            style={[styles.segmentedTab, filter === 'ALL' && styles.segmentedTabActive]}
            onPress={() => setFilter('ALL')}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'ALL' }}
          >
            <Text style={[styles.segmentedTabText, filter === 'ALL' && styles.segmentedTabTextActive]}>
              All Alerts ({alerts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTab, filter === 'CRITICAL' && styles.segmentedTabActive]}
            onPress={() => setFilter('CRITICAL')}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'CRITICAL' }}
          >
            <Text style={[styles.segmentedTabText, filter === 'CRITICAL' && styles.segmentedTabTextActive]}>
              Critical ({alerts.filter((a) => a.threatLevel === 'CRITICAL').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTab, filter === 'UNREAD' && styles.segmentedTabActive]}
            onPress={() => setFilter('UNREAD')}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'UNREAD' }}
          >
            <Text style={[styles.segmentedTabText, filter === 'UNREAD' && styles.segmentedTabTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fully Visible Multilingual Selector Bar */}
      <View style={styles.langSelectorBar}>
        <Text style={styles.langBarLabel}>LANGUAGE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.langScrollWrapper}
          contentContainerStyle={styles.langScrollContent}
        >
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
                <Text style={styles.langFlagText}>{item.flag}</Text>
                <Text style={[styles.langNameText, isSelected && styles.langNameTextActive]}>
                  {item.label}
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
            const borderAccent = item.threatLevel === 'CRITICAL'
              ? '#DC2626'
              : item.threatLevel === 'HIGH'
              ? '#D97706'
              : item.threatLevel === 'MODERATE'
              ? '#EAB308'
              : '#059669';

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.alertCard,
                  { borderLeftColor: borderAccent, borderLeftWidth: 4 },
                  !item.isRead && styles.alertCardUnread,
                  { borderColor: isExpanded ? theme.badgeBorder : APP_COLORS.borderDefault }
                ]}
                activeOpacity={0.88}
                onPress={() => handleCardPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`Alert from ${item.senderTag}, Level ${item.threatLevel}. Tap to toggle details.`}
              >
                {/* Header: Clean Stacked Hierarchy with Zero Overlap */}
                <View style={styles.cardHeader}>
                  {/* Row 1: Source & Unread Badge */}
                  <View style={styles.cardSourceRow}>
                    <Text style={styles.senderBadgeText} numberOfLines={2}>
                      {item.senderTag}
                    </Text>
                    {!item.isRead && (
                      <View style={styles.unreadTag}>
                        <Text style={styles.unreadTagText}>NEW</Text>
                      </View>
                    )}
                  </View>

                  {/* Row 2: Severity Badge & Timestamp */}
                  <View style={styles.cardMetaRow}>
                    <ThreatBadge level={item.threatLevel} size="small" />
                    <Text style={styles.cardTimeText}>{getRelativeTime(item.timestampISO)}</Text>
                  </View>

                  {/* Row 3: Location Pin (if available) */}
                  {item.locationName && (
                    <View style={styles.cardLocationRow}>
                      <Text style={styles.locationSubText} numberOfLines={2}>
                        📍 {item.locationName}
                      </Text>
                    </View>
                  )}
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
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5'
  },
  disclaimerText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  topBarTitleCol: {
    width: '100%',
    marginBottom: 8
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    letterSpacing: -0.2
  },
  pageSub: {
    fontSize: 11,
    color: APP_COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500'
  },
  firstAidPillBtn: {
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center'
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
    justifyContent: 'center',
    alignItems: 'center'
  },
  markReadBtnText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  segmentedFilterWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderSubtle
  },
  segmentedFilterContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EE',
    borderRadius: 12,
    padding: 3
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34
  },
  segmentedTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2
  },
  segmentedTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: APP_COLORS.textSecondary
  },
  segmentedTabTextActive: {
    fontWeight: '800',
    color: APP_COLORS.textPrimary
  },
  langSelectorBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  langBarLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6
  },
  langScrollWrapper: {
    width: '100%'
  },
  langScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderWidth: 1.5,
    borderColor: APP_COLORS.borderDefault,
    marginRight: 8,
    minHeight: 38,
    flexShrink: 0
  },
  langChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  langFlagText: {
    fontSize: 14,
    marginRight: 6
  },
  langNameText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false
  },
  langNameTextActive: {
    color: '#166534',
    fontWeight: '800'
  },
  unreadTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6
  },
  unreadTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginTop: 20,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 14,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  alertCardUnread: {
    borderLeftWidth: 5,
    borderLeftColor: '#DC2626'
  },
  cardHeader: {
    marginBottom: 8
  },
  cardSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  cardLocationRow: {
    marginTop: 2,
    marginBottom: 2
  },
  senderBadgeText: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 8
  },
  locationSubText: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  cardTimeText: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  messageBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 36, 23, 0.08)'
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
    borderRadius: 10,
    padding: 12,
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
    lineHeight: 18,
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
    borderRadius: 10,
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
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2
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
    borderRadius: 10,
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
    marginTop: 6,
    marginBottom: 20,
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
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
    fontSize: 24,
    marginRight: 12
  },
  firstAidBannerTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800'
  },
  firstAidBannerSub: {
    color: '#14532D',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2
  },
  firstAidBannerArrow: {
    fontSize: 16,
    color: '#166534',
    fontWeight: '800'
  }
});
