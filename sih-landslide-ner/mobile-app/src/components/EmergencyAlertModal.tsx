import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform
} from 'react-native';

export type SupportedLanguage = 'en' | 'as' | 'hi' | 'bn' | 'dimasa';

export interface EmergencyAlertModalProps {
  visible: boolean;
  onClose: () => void;
  district?: string;
  riskLevel?: string;
  locationName?: string;
}

export const MULTILINGUAL_ALERTS: Record<SupportedLanguage, {
  label: string;
  flag: string;
  title: string;
  advisory: string;
  precautions: string[];
  helplines: { label: string; number: string }[];
}> = {
  en: {
    label: 'English',
    flag: '🇬🇧',
    title: '🚨 CRITICAL LANDSLIDE EMERGENCY WARNING',
    advisory: 'Severe monsoon slope saturation detected in Dima Hasao. Imminent threat of rockfalls and mudslides near railway corridors and highway passes.',
    precautions: [
      '1. Evacuate immediately from steep slopes and cliff bases.',
      '2. Move to designated relief shelter at Haflong Govt College.',
      '3. Do not cross flooded river streams or muddy hillside roads.',
      '4. Keep emergency survival kit, flashlight & medicines ready.'
    ],
    helplines: [
      { label: 'ASDMA Emergency', number: '1070' },
      { label: 'Dima Hasao DDMO', number: '1077' },
      { label: 'Railway Helpline', number: '139' },
    ]
  },
  as: {
    label: 'অসমীয়া',
    flag: '🇮🇳',
    title: '🚨 জৰুৰী ভূমিস্খলন সতৰ্কবাণী (অসমীয়া)',
    advisory: 'দিমা হাছাও জিলাৰ পাহাৰীয়া অঞ্চলত ভূমিস্খলনৰ তীব্ৰ আশংকা। ৰেললাইন আৰু ৰাষ্ট্ৰীয় ঘাইপথত শিলেৰে স্খলন হ’ব পাৰে।',
    precautions: [
      '১. পাহাৰৰ তলনি অঞ্চলৰ পৰা লগে লগে সুৰক্ষিত স্থানলৈ যাওঁক।',
      '২. হাফলং চৰকাৰী মহাবিদ্যালয়ৰ সাহায্য শিবিৰত আশ্ৰয় লওঁক।',
      '৩. পাহাৰীয়া জৰুৰী পথ বা পানী থকা অঞ্চল পাৰ নহ’ব।',
      '৪. জৰুৰীকালীন ঔষধ আৰু পোহৰৰ লাইট সাজু ৰাখক।'
    ],
    helplines: [
      { label: 'অসম দুৰ্যোগ ব্যৱস্থাপনা', number: '1070' },
      { label: 'দিমা হাছাও কন্ট্ৰ’ল ৰুম', number: '1077' },
      { label: 'ৰে’লৱে হেল্পলাইন', number: '139' },
    ]
  },
  hi: {
    label: 'हिंदी',
    flag: '🇮🇳',
    title: '🚨 भूस्खलन आपातकालीन चेतावनी (हिंदी)',
    advisory: 'दिमा हसाओ के पहाड़ी क्षेत्रों में भारी बारिश के कारण भूस्खलन की अत्यधिक संभावना है। रेलवे लाइन व राष्ट्रीय राजमार्ग पर यात्रा टालें।',
    precautions: [
      '1. ढलान वाले खतरनाक क्षेत्रों से तुरंत सुरक्षित स्थान पर जाएं।',
      '2. हाफलोंग शासकीय कॉलेज राहत शिविर में शरण लें।',
      '3. तेज बहते पहाड़ी नालों और भूस्खलन प्रभावित सड़कों से दूर रहें।',
      '4. टॉर्च, जरूरी दवाइयां और आपातकालीन किट साथ रखें।'
    ],
    helplines: [
      { label: 'राज्य आपदा राहत', number: '1070' },
      { label: 'जिला आपदा कंट्रोल रूम', number: '1077' },
      { label: 'रेलवे हेल्पलाइन', number: '139' },
    ]
  },
  bn: {
    label: 'বাংলা',
    flag: '🇮🇳',
    title: '🚨 জরুরি ভূমিধস সতর্কতা (বাংলা)',
    advisory: 'ডিমা হাসাও জেলার পাহাড়ে অতি ভারী বৃষ্টির কারণে মারাত্মক ভূমিধসের আশঙ্কা। রেলওয়ে এবং হাইওয়ে করিডোরে বিশেষ সতর্কতা জারি।',
    precautions: [
      '১. বিপজ্জনক পাহাড়ি ঢাল থেকে দ্রুত নিরাপদ স্থানে সরে যান।',
      '২. হাফলং সরকারি কলেজের ত্রাণ শিবিরে আশ্রয় নিন।',
      '৩. জলমগ্ন পাহাড়ি রাস্তা বা নদী পার হবেন না।',
      '৪. জরুরি ওষুধ, টর্চ এবং প্রয়োজনীয় নথিপত্র সাথে রাখুন।'
    ],
    helplines: [
      { label: 'রাজ্য দুর্যোগ মোকাবিলা', number: '1070' },
      { label: 'ডিমা হাসাও কন্ট্রোল রুম', number: '1077' },
      { label: 'রেলওয়ে হেল্পলাইন', number: '139' },
    ]
  },
  dimasa: {
    label: 'Dimasa',
    flag: '🏔️',
    title: '🚨 Habaikhang Bahaiba Emergency Alert',
    advisory: 'Dima Hasao raba-ha habaikhang phainu thama. Haflong, Jatinga halo-hali nangba khala safe refuge diba.',
    precautions: [
      '1. Haflong Govt College shelter camp-ha thango.',
      '2. Daosidong bahai cliff side-ha thang ya diba.',
      '3. Torch light, muli & survival kit raba diba.',
      '4. Helpline 1077-ha call raba emergency bantuan-hi.'
    ],
    helplines: [
      { label: 'ASDMA Relief', number: '1070' },
      { label: 'DDMO Haflong', number: '1077' },
      { label: 'NFR Railway', number: '139' },
    ]
  }
};

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  visible,
  onClose,
  district = 'Dima Hasao',
  riskLevel = 'CRITICAL',
  locationName = 'Jatinga / Haflong Corridor'
}) => {
  const [lang, setLang] = useState<SupportedLanguage>('en');

  const activeContent = MULTILINGUAL_ALERTS[lang];

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Emergency Header */}
        <View style={styles.topHeader}>
          <Text style={styles.headerBadge}>🚨 OFFICIAL DISASTER BROADCAST</Text>
          <Text style={styles.headerSub}>District Disaster Management Authority • {district}</Text>
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
              >
                <Text style={[styles.langChipText, isSelected && styles.langChipTextActive]}>
                  {item.flag} {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Alert Banner */}
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>{activeContent.title}</Text>
            <Text style={styles.locationText}>Location: {locationName} • Risk Level: {riskLevel === 'SAFE' ? 'CRITICAL' : riskLevel}</Text>
            <Text style={styles.advisoryText}>{activeContent.advisory}</Text>

            {/* Mandatory Safety Precautions */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>🛡️ Mandatory Safety Precautions</Text>
              {activeContent.precautions.map((precaution, idx) => (
                <Text key={idx} style={styles.precautionItem}>
                  {precaution}
                </Text>
              ))}
            </View>

            {/* Emergency Helpline One-Touch Buttons */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>📞 Direct Helpline Dialers</Text>
              <View style={styles.helplineGrid}>
                {activeContent.helplines.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.callButton}
                    onPress={() => handleCall(item.number)}
                  >
                    <Text style={styles.callBtnText}>📞 {item.label}</Text>
                    <Text style={styles.callNumberText}>{item.number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Acknowledge Button */}
        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.acknowledgeBtn} onPress={onClose}>
            <Text style={styles.acknowledgeBtnText}>✅ I Acknowledge & Stand By</Text>
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
  headerBadge: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1
  },
  headerSub: {
    color: '#fecaca',
    fontSize: 12,
    marginTop: 2
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
    padding: 16
  },
  alertCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#dc2626'
  },
  alertTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6
  },
  locationText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12
  },
  advisoryText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    backgroundColor: '#450a0a',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444'
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
  acknowledgeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  }
});
