import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert
} from 'react-native';
import { APP_COLORS } from '../constants/theme';
import { getSafeAreaInsets } from '../constants/layout';

export interface InjuryFirstAidModalProps {
  visible: boolean;
  onClose: () => void;
}

export const VALID_HELPLINES = [
  {
    number: '1070',
    title: 'ASDMA State Disaster Control',
    subtitle: 'Assam State Disaster Management Authority (Toll-Free 24x7)',
    icon: '🚨',
    badge: 'STATE DISASTER'
  },
  {
    number: '1077',
    title: 'DDMA Dima Hasao Control Room',
    subtitle: 'District Disaster Management Office, Haflong',
    icon: '🏔️',
    badge: 'DISTRICT EOC'
  },
  {
    number: '108',
    title: '108 Emergency Ambulance',
    subtitle: 'Free Medical Trauma & Critical Care Transport',
    icon: '🚑',
    badge: 'AMBULANCE'
  },
  {
    number: '112',
    title: '112 Unified Emergency Police & Fire',
    subtitle: 'National Emergency Response Support System',
    icon: '🚓',
    badge: 'ALL-IN-ONE'
  },
  {
    number: '139',
    title: 'Northeast Frontier Railway (NFR)',
    subtitle: 'Railway Track Mudslide & Corridor Emergency',
    icon: '🚂',
    badge: 'RAIL SAFETY'
  },
  {
    number: '1078',
    title: 'NDMA National Emergency Centre',
    subtitle: 'National Disaster Management Authority, New Delhi',
    icon: '🏛️',
    badge: 'NATIONAL'
  }
];

export const INJURY_FIRST_AID_STEPS = [
  {
    step: '1',
    title: 'Scene Safety & Slope Triage',
    desc: 'Do not enter active mudslide channels or unstable cliff cuttings. Move conscious or lightly injured victims to firm, elevated ground at least 50m away from the slide scar.',
    tag: 'PRIORITY: IMMINENT SAFETY'
  },
  {
    step: '2',
    title: 'Clear Airway (Soil & Mud Inhalation)',
    desc: 'Check breathing immediately. Gently sweep out visible mud, gravel, or dust from the mouth and nose. For unconscious breathing victims, place them in the lateral recovery position to prevent choking.',
    tag: 'AIRWAY / BREATHING'
  },
  {
    step: '3',
    title: 'Control Severe Bleeding & Lacerations',
    desc: 'Apply firm, continuous direct pressure over bleeding wounds with sterile dressing or clean cloth. Elevate injured limbs above heart level if no fracture is suspected. Never remove deeply embedded debris yourself.',
    tag: 'CIRCULATION & BLEEDING'
  },
  {
    step: '4',
    title: 'Crush Injury & Entrapment Protocol',
    desc: 'If a limb has been trapped under heavy rocks/debris for >15 minutes, notify 108/1077 immediately before lifting the weight to avoid sudden crush syndrome toxins. Stabilize and splint limbs.',
    tag: 'CRUSH TRAUMA'
  },
  {
    step: '5',
    title: 'Head, Neck & Spinal Immobilization',
    desc: 'Assume spinal trauma if the victim was struck by falling boulders or carried by mud. Keep the head and neck strictly aligned; avoid twisting or bending the back during movement.',
    tag: 'SPINE & HEAD INJURY'
  },
  {
    step: '6',
    title: 'Combat Hypothermia & Shock',
    desc: 'Wet, muddy clothing causes rapid core body cooling in hill rain. Strip soaked outer layers, wrap victim in dry blankets or thermal foil, and keep them calm and warm until rescue teams arrive.',
    tag: 'HYPOTHERMIA PREVENTION'
  }
];

export const InjuryFirstAidModal: React.FC<InjuryFirstAidModalProps> = ({ visible, onClose }) => {
  const insets = getSafeAreaInsets();

  const handleDial = (number: string, title: string) => {
    Alert.alert(
      `Call Emergency Helpline`,
      `Dial ${title} (${number}) now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Call ${number}`,
          style: 'default',
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Alert.alert('Dialer Error', `Could not open phone dialer for ${number}.`);
            });
          }
        }
      ]
    );
  };

  const topPadding = (Platform.OS === 'android' ? insets.top : (Platform.OS === 'ios' ? insets.statusBarHeight : 12)) + 10;
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, insets.isWeb && styles.webContainer]}>
        {/* Top Header */}
        <View style={[styles.topHeader, { paddingTop: topPadding }]}>
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={styles.headerBadge}>🏥 EMERGENCY PROTOCOL & HELPLINES</Text>
              <Text style={styles.headerMainTitle}>Landslide Injury & Triage Guide</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close Guide">
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Quick Notice */}
          <View style={styles.bannerNotice}>
            <Text style={styles.bannerNoticeTitle}>⚡ Critical Response Instructions</Text>
            <Text style={styles.bannerNoticeSub}>
              Follow these sequential medical triage steps while awaiting emergency search & rescue teams.
            </Text>
          </View>

          {/* Valid Government Helplines Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>📞 Valid Government Emergency Helplines</Text>
            <Text style={styles.sectionSub}>Tap any card to connect immediately via official 24x7 control rooms:</Text>

            <View style={styles.helplineList}>
              {VALID_HELPLINES.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.helplineCard}
                  onPress={() => handleDial(item.number, item.title)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${item.title} at ${item.number}`}
                >
                  <View style={styles.helplineCardLeft}>
                    <Text style={styles.helplineIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.helplineBadgeRow}>
                        <Text style={styles.helplineTitle}>{item.title}</Text>
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{item.badge}</Text>
                        </View>
                      </View>
                      <Text style={styles.helplineSub}>{item.subtitle}</Text>
                    </View>
                  </View>

                  <View style={styles.dialButton}>
                    <Text style={styles.dialNumberText}>📞 {item.number}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Step-by-Step Injury Response Protocol */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>🩹 Step-by-Step Injury First-Aid Protocol</Text>

            {INJURY_FIRST_AID_STEPS.map((stepItem, idx) => (
              <View key={idx} style={styles.stepCard}>
                <View style={styles.stepHeaderRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>STEP {stepItem.step}</Text>
                  </View>
                  <Text style={styles.stepTagText}>{stepItem.tag}</Text>
                </View>

                <Text style={styles.stepTitle}>{stepItem.title}</Text>
                <Text style={styles.stepDesc}>{stepItem.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Bar with Safe Inset */}
        <View style={[styles.footerBar, { paddingBottom: bottomPadding }]}>
          <TouchableOpacity style={styles.acknowledgeBtn} onPress={onClose}>
            <Text style={styles.acknowledgeBtnText}>✅ I Understand & Stand By</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  webContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center'
  },
  topHeader: {
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderDefault
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerBadge: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  headerMainTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2
  },
  closeBtn: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  closeBtnText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  scrollContent: {
    padding: 16
  },
  bannerNotice: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 18
  },
  bannerNoticeTitle: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4
  },
  bannerNoticeSub: {
    color: '#14532D',
    fontSize: 12,
    lineHeight: 18
  },
  sectionContainer: {
    marginBottom: 22
  },
  sectionHeader: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  sectionSub: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12
  },
  helplineList: {
    gap: 10
  },
  helplineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    shadowColor: '#1E2B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  helplineCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  helplineIcon: {
    fontSize: 24,
    marginRight: 12
  },
  helplineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6
  },
  helplineTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  badgePill: {
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgePillText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '800'
  },
  helplineSub: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  dialButton: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dialNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 12,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  stepNumberBadge: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  stepTagText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  stepTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6
  },
  stepDesc: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  footerBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.borderDefault,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4
  },
  acknowledgeBtn: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2
  },
  acknowledgeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2
  }
});
