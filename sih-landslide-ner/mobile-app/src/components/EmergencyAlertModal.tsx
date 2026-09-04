import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking
} from 'react-native';
import { soundService } from '../services/soundService';

export type SupportedLanguage = 'en' | 'as' | 'bn' | 'dimasa';

export interface EmergencyAlertModalProps {
  visible: boolean;
  onClose: () => void;
  district?: string;
  riskLevel?: string;
  locationName?: string;
  title?: string;
  advisory?: string;
  source?: 'SIMULATOR' | 'LIVE_MONITORING';
}

const MULTILINGUAL_ALERTS: Record<
  SupportedLanguage,
  {
    label: string;
    flag: string;
    title: string;
    advisory: string;
    precautions: string[];
    helplines: { label: string; number: string }[];
  }
> = {
  en: {
    label: 'English',
    flag: '🇬🇧',
    title: '🚨 RED ALERT: Severe Landslide Warning',
    advisory:
      'Extreme slope destabilization detected along Lumding-Badarpur Railway corridor & NH-27 Jatinga Pass. Infiltration >110mm. Immediate evacuation recommended to Haflong Govt College shelter.',
    precautions: [
      '1. Evacuate immediately if residing near steep slopes or cliffs.',
      '2. Seek refuge in designated DDMA relief shelters.',
      '3. Avoid driving or walking through flooded mountain roads.',
      '4. Keep emergency kit, battery torch, and first aid ready.'
    ],
    helplines: [
      { label: 'State Disaster Response', number: '1070' },
      { label: 'DDMA Haflong Control', number: '1077' },
      { label: 'NFR Railway Emergency', number: '139' }
    ]
  },
  as: {
    label: 'অসমীয়া',
    flag: '🇮🇳',
    title: '🚨 জৰুৰী সতৰ্কবাণী: ভূমিস্খলনৰ উচ্চ সতৰ্কতা',
    advisory:
      'বৰাইল পাহাৰ, জাতিংগা আৰু হাফলং অঞ্চলত তীব্ৰ ভূমিস্খলনৰ আশংকা। পাহাৰৰ ঢালৰ পৰা ততাতৈয়াকৈ সুৰক্ষিত আশ্ৰয় শিবিৰলৈ যাওক। সাহায্য শিবিৰ: হাফলং গভৰ্ণমেণ্ট কলেজ।',
    precautions: [
      '১. পাহাৰৰ থিয় ঢালৰ ওচৰৰ পৰা অবিলম্বে আঁতৰি যাওক।',
      '২. হাফলং চৰকাৰী মহাবিদ্যালয়ৰ সাহায্য শিবিৰত আশ্ৰয় লওক।',
      '৩. পাহাৰীয়া নদী বা খহনীয়া এলেকা পাৰ নহব।',
      '৪. জৰুৰী ঔষধ, টৰ্চ আৰু প্ৰয়োজনীয় নথি লগত ৰাখক।'
    ],
    helplines: [
      { label: 'ৰাজ্যিক দুৰ্যোগ নিয়ন্ত্ৰণ', number: '1070' },
      { label: 'ডিমা হাছাও কন্ট্ৰোল ৰূম', number: '1077' },
      { label: 'ৰে\'লৱে হেল্পলাইন', number: '139' }
    ]
  },
  bn: {
    label: 'বাংলা',
    flag: '🇮🇳',
    title: '🚨 জরুরী সতর্কতা: ভয়াবহ ভূমিধসের লাল সংকেত',
    advisory:
      'লামডিং-বদরপুর রেল লাইন এবং এনএইচ-২৭ জাতিঙ্গা গিরিপথে ভয়াবহ ভূমিধসের ঝুঁকি। ঝুঁকিপূর্ণ ঢালু এলাকা অবিলম্বে খালি করার নির্দেশ। আশ্রয়স্থল: হাফলং সরকারি কলেজ।',
    precautions: [
      '১. ঝুঁকিপূর্ণ খাড়া ঢাল থেকে অবিলম্বে নিরাপদ স্থানে সরে যান।',
      '২. হাফলং সরকারি কলেজের ত্রাণ শিবিরে আশ্রয় নিন।',
      '৩. জলমগ্ন পাহাড়ি রাস্তা বা নদী পার হবেন না।',
      '৪. জরুরি ওষুধ, টর্চ এবং প্রয়োজনীয় নথিপত্র সাথে রাখুন।'
    ],
    helplines: [
      { label: 'রাজ্য দুর্যোগ মোকাবিলা', number: '1070' },
      { label: 'ডিমা হাসাও কন্ট্রোল রুম', number: '1077' },
      { label: 'রেলওয়ে হেল্পলাইন', number: '139' }
    ]
  },
  dimasa: {
    label: 'Dimasa',
    flag: '🏔️',
    title: '🚨 Habaikhang Bahaiba Emergency Alert',
    advisory:
      'Dima Hasao raba-ha habaikhang phainu thama. Haflong, Jatinga halo-hali nangba khala safe refuge diba. Haflong Govt College shelter bo thangba jaoba.',
    precautions: [
      '1. Haflong Govt College shelter camp-ha thango.',
      '2. Daosidong bahai cliff side-ha thang ya diba.',
      '3. Torch light, muli & survival kit raba diba.',
      '4. Helpline 1077-ha call raba emergency bantuan-hi.'
    ],
    helplines: [
      { label: 'ASDMA Relief', number: '1070' },
      { label: 'DDMO Haflong', number: '1077' },
      { label: 'NFR Railway', number: '139' }
    ]
  }
};

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  visible,
  onClose,
  district = 'Dima Hasao',
  riskLevel = 'CRITICAL',
  locationName = 'Jatinga / Haflong Corridor',
  title,
  advisory,
  source = 'LIVE_MONITORING'
}) => {
  const [lang, setLang] = useState<SupportedLanguage>('en');

  const isSimulator = source === 'SIMULATOR';
  const activeContent = MULTILINGUAL_ALERTS[lang];

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const handleDismissAlert = () => {
    soundService.stopEmergencySiren();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleDismissAlert}>
      <View style={styles.container}>
        {/* Top Emergency Header Strip */}
        <View style={[styles.topHeader, isSimulator && styles.topHeaderSimulator]}>
          <Text style={styles.headerBadge}>
            {isSimulator ? '🧪 MONSOON SIMULATOR DEMO ALERT' : '🚨 OFFICIAL DISASTER BROADCAST'}
          </Text>
          <Text style={styles.headerSub}>
            {isSimulator
              ? `Isolated Pitch Sandbox Engine • Demo Mode Active • ${district}`
              : `District Disaster Management Authority • Live Pipeline • ${district}`}
          </Text>
        </View>

        {/* Source Mode Routing Pill */}
        <View style={[styles.sourcePillRow, isSimulator ? styles.sourcePillSim : styles.sourcePillLive]}>
          <Text style={styles.sourcePillText}>
            {isSimulator
              ? 'TARGET: DEMO PHONES ONLY (Filtered by Local Demo Mode Flag)'
              : 'TARGET: LIVE PRODUCTION PHONES ONLY (Real-Time Monitoring)'}
          </Text>
        </View>

        {/* Language Selection Tabs */}
        <View style={styles.langSelector}>
          {(Object.keys(MULTILINGUAL_ALERTS) as SupportedLanguage[]).map((key) => {
            const item = MULTILINGUAL_ALERTS[key];
            const isSelected = key === lang;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.langChip, isSelected && styles.langChipActive]}
                onPress={() => setLang(key)}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${item.label}`}
              >
                <Text style={[styles.langChipText, isSelected && styles.langChipTextActive]}>
                  {item.flag} {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Alert Card */}
          <View style={[styles.alertCard, isSimulator && styles.alertCardSimulator]}>
            <Text style={styles.alertTitle}>{title || activeContent.title}</Text>
            <Text style={styles.locationText}>
              📍 Location: {locationName} • Risk Level:{' '}
              <Text style={riskLevel === 'CRITICAL' ? styles.criticalText : riskLevel === 'HIGH' ? styles.highText : styles.safeText}>
                {riskLevel || 'CRITICAL'}
              </Text>
            </Text>

            <Text style={[styles.advisoryText, isSimulator && styles.advisoryTextSimulator]}>
              {advisory || activeContent.advisory}
            </Text>

            {/* Mandatory Safety Precautions */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>🛡️ Mandatory Safety Directives</Text>
              {activeContent.precautions.map((precaution, idx) => (
                <Text key={idx} style={styles.precautionItem}>
                  {precaution}
                </Text>
              ))}
            </View>

            {/* Emergency Helpline One-Touch Buttons */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>📞 Direct Helpline Dialers (Fast Dial)</Text>
              <View style={styles.helplineGrid}>
                {activeContent.helplines.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.callButton}
                    onPress={() => handleCall(item.number)}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${item.label} at ${item.number}`}
                  >
                    <Text style={styles.callBtnText}>📞 {item.label}</Text>
                    <Text style={styles.callNumberText}>{item.number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Acknowledge Button */}
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={[styles.acknowledgeBtn, isSimulator && styles.acknowledgeBtnSimulator]}
            onPress={handleDismissAlert}
            accessibilityRole="button"
            accessibilityLabel="Acknowledge Alert and Dismiss"
          >
            <Text style={styles.acknowledgeBtnText}>
              {isSimulator ? '✅ Acknowledge Simulator Demo Alert' : '✅ I Acknowledge & Stand By'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#7f1d1d',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444'
  },
  topHeaderSimulator: {
    backgroundColor: '#4c1d95',
    borderBottomColor: '#8b5cf6'
  },
  headerBadge: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1
  },
  headerSub: {
    color: '#fecaca',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center'
  },
  sourcePillRow: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sourcePillLive: {
    backgroundColor: '#991b1b'
  },
  sourcePillSim: {
    backgroundColor: '#6b21a8'
  },
  sourcePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155'
  },
  langChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8'
  },
  langChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  langChipTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30
  },
  alertCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#dc2626'
  },
  alertCardSimulator: {
    borderColor: '#a855f7'
  },
  alertTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6
  },
  locationText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12
  },
  criticalText: {
    color: '#ef4444',
    fontWeight: '900'
  },
  highText: {
    color: '#f59e0b',
    fontWeight: '900'
  },
  safeText: {
    color: '#22c55e',
    fontWeight: '900'
  },
  advisoryText: {
    color: '#fee2e2',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    backgroundColor: '#450a0a',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444'
  },
  advisoryTextSimulator: {
    backgroundColor: '#2e1065',
    color: '#ede9fe',
    borderLeftColor: '#a855f7'
  },
  sectionBox: {
    marginTop: 12,
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  sectionTitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10
  },
  precautionItem: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8
  },
  helplineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6
  },
  callButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#065f46',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center'
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  callNumberText: {
    color: '#a7f3d0',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2
  },
  footerBar: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  acknowledgeBtn: {
    backgroundColor: '#16a34a',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  acknowledgeBtnSimulator: {
    backgroundColor: '#7c3aed'
  },
  acknowledgeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  }
});
