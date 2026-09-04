import React, { useState } from 'react';
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
import { SupportedLanguage, LANGUAGE_TABS } from '../services/smsService';

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

export interface StepTranslation {
  stepBadge: string;
  title: string;
  desc: string;
  tag: string;
}

export interface FirstAidStep {
  step: string;
  translations: Record<SupportedLanguage, StepTranslation>;
}

export const FIRST_AID_SECTION_SUB: Record<SupportedLanguage, string> = {
  en: 'Standardized disaster trauma management steps (Steps 1 to 6):',
  as: 'প্ৰমাণিত দুৰ্যোগ আঘাত ব্যৱস্থাপনা পদ্ধতি (পদক্ষেপ ১ ৰ পৰা ৬):',
  bn: 'প্রমাণিত দুর্যোগ ট্রমা ব্যবস্থাপনা পদক্ষেপ (পদক্ষেপ ১ থেকে ৬):',
  hi: 'मानकीकृत आपदा ट्रॉमा प्रबंधन चरण (चरण १ से ६):',
  dimasa: 'Trauma dukhu dam-garba kabor (Steps 1 niprah 6):'
};

export const INJURY_FIRST_AID_STEPS: FirstAidStep[] = [
  {
    step: '1',
    translations: {
      en: {
        stepBadge: 'STEP 1',
        tag: 'PRIORITY: IMMINENT SAFETY',
        title: 'Scene Safety & Slope Triage',
        desc: 'Do not enter active mudslide channels or unstable cliff cuttings. Move conscious or lightly injured victims to firm, elevated ground at least 50m away from the slide scar.'
      },
      as: {
        stepBadge: 'পদক্ষেপ ১',
        tag: 'অগ্ৰাধিকাৰ: তাৎক্ষণিক সুৰক্ষা',
        title: 'ঘটনাস্থলীৰ সুৰক্ষা আৰু বিপদ নিৰ্ধাৰণ',
        desc: 'সক্ৰিয় ভূমিস্খলন নলা বা অস্থিৰ পাহাৰীয়া অংশত প্ৰৱেশ নকৰিব। চেতন থকা বা সামান্য আঘাতপ্ৰাপ্ত লোকসকলক স্খলন হোৱা স্থানৰ পৰা কমেও ৫০ মিটাৰ দূৰত থকা নিৰাপদ, ওখ আৰু কঠিন মাটিলৈ স্থানান্তৰ কৰক।'
      },
      bn: {
        stepBadge: 'পদক্ষেপ ১',
        tag: 'অগ্রাধিকার: তাৎক্ষণিক সুরক্ষা',
        title: 'দুর্ঘটনাস্থলের সুরক্ষা ও বিপদ মূল্যায়ন',
        desc: 'সক্রিয় ভূমিধস চ্যানেল বা অস্থির খাড়া ঢালে প্রবেশ করবেন না। সচেতন বা সামান্য আহত ব্যক্তিদের ধসের স্থান থেকে কমপক্ষে ৫০ মিটার দূরে নিরাপদ, উঁচু ও শক্ত স্থানে সরিয়ে নিন।'
      },
      hi: {
        stepBadge: 'चरण १',
        tag: 'प्राथमिकता: तत्काल सुरक्षा',
        title: 'घटनास्थल की सुरक्षा व खतरा आकलन',
        desc: 'सक्रिय भूस्खलन मलबे या अस्थिर ढलानों पर न जाएं। होश में मौजूद या मामूली रूप से घायल व्यक्तियों को भूस्खलन क्षेत्र से कम से कम 50 मीटर दूर सुरक्षित, ऊंची व पक्की जमीन पर ले जाएं।'
      },
      dimasa: {
        stepBadge: 'STEP 1',
        tag: 'KHASIMA: THIK BASAHBAH',
        title: 'Grao Dugba Jaga Basahbah & Halim Kabor',
        desc: 'Habaishi khoroh aroni phurba jaga-ha dah hang-ba. Giri-giri dukhu maimu-rang khah ha-phlang khoroh niprah 50m gajanha khobor thik dong-ba gajao jaga-ha la-lang-ba.'
      }
    }
  },
  {
    step: '2',
    translations: {
      en: {
        stepBadge: 'STEP 2',
        tag: 'AIRWAY / BREATHING',
        title: 'Clear Airway (Soil & Mud Inhalation)',
        desc: 'Check breathing immediately. Gently sweep out visible mud, gravel, or dust from the mouth and nose. For unconscious breathing victims, place them in the lateral recovery position to prevent choking.'
      },
      as: {
        stepBadge: 'পদক্ষেপ ২',
        tag: 'শ্বাসনালী আৰু শ্বাস-প্ৰশ্বাস',
        title: 'শ্বাস-প্ৰশ্বাস পথ পৰিষ্কাৰ কৰক (বোকামাটি আৰু ধূলি)',
        desc: 'তৎক্ষণাত শ্বাস-প্ৰশ্বাস পৰীক্ষা কৰক। মুখ আৰু নাকৰ পৰা দৃশ্যমান বোকামাটি, শিলগুটি বা ধূলি লাহেকৈ উলিয়াই দিয়ক। অচেতন অথচ উশাহ লৈ থকা ব্যক্তিক ডিঙি বন্ধ নহ\'বলৈ কাটি কৰি (পাৰ্শ্বীয় ৰিকভাৰী অৱস্থাত) শুৱাই ৰাখক।'
      },
      bn: {
        stepBadge: 'পদক্ষেপ ২',
        tag: 'শ্বাসনালী ও শ্বাস-প্রশ্বাস',
        title: 'শ্বাসপথ পরিষ্কার করুন (কাদামাটি ও ধুলোবালি)',
        desc: 'অবিলম্বে শ্বাস-প্রশ্বাস পরীক্ষা করুন। মুখ ও নাক থেকে দৃশ্যমান কাদা, কাঁকর বা ধুলো আলতো করে পরিষ্কার করুন। অজ্ঞান কিন্তু শ্বাস নেওয়া ব্যক্তিকে দমবন্ধ হওয়া রোধ করতে কাত করে (রিকভারি পজিশনে) রাখুন।'
      },
      hi: {
        stepBadge: 'चरण २',
        tag: 'श्वसन व सांस लेना',
        title: 'श्वसन मार्ग साफ करें (मिट्टी व कीचड़)',
        desc: 'तुरंत सांस की जांच करें। मुंह और नाक से दिखाई देने वाले कीचड़, कंकड़ या धूल को धीरे से बाहर निकालें। बेहोश लेकिन सांस ले रहे पीड़ितों को घुटन से बचाने के लिए करवट (रिकवरी स्थिति) में लिटाएं।'
      },
      dimasa: {
        stepBadge: 'STEP 2',
        tag: 'HANG LABA & SHAN SHABA',
        title: 'Hang Laba Lampo Garba (Ha-dithu aroni Ha-phong)',
        desc: 'Hang laba thik dong ma-dong giri-giri nai-ba. Khuthur aroni khoroh-prah ha-dithu, longthai, ha-phong khiriph-hi garba. Shing gisi dong-ba borai-rang khah hang shaba thik dong-hi khuthe jaba rao-hi phithang-ba.'
      }
    }
  },
  {
    step: '3',
    translations: {
      en: {
        stepBadge: 'STEP 3',
        tag: 'CIRCULATION & BLEEDING',
        title: 'Control Severe Bleeding & Lacerations',
        desc: 'Apply firm, continuous direct pressure over bleeding wounds with sterile dressing or clean cloth. Elevate injured limbs above heart level if no fracture is suspected. Never remove deeply embedded debris yourself.'
      },
      as: {
        stepBadge: 'পদক্ষেপ ৩',
        tag: 'ৰক্ত চলাচল আৰু ৰক্তক্ষৰণ',
        title: 'প্ৰচুৰ ৰক্তক্ষৰণ আৰু কটা-ছিঙা নিয়ন্ত্ৰণ',
        desc: 'বীজাণুমুক্ত বেণ্ডেজ বা পৰিষ্কাৰ কাপোৰেৰে ৰক্তক্ষৰণ হোৱা স্থানত অবিৰতভাৱে হেঁচা প্ৰয়োগ কৰক। হাড় ভগাৰ সন্দেহ নাথাকিলে আঘাতপ্ৰাপ্ত অংগটো হৃদযন্ত্ৰৰ উচ্চতাতকৈ ওখকৈ ৰাখক। শৰীৰত সোমাই থকা জোঙা বস্তু বা শিল নিজাববীয়াকৈ আঁতৰাবলৈ চেষ্টা নকৰিব।'
      },
      bn: {
        stepBadge: 'পদক্ষেপ ৩',
        tag: 'রক্ত সঞ্চালন ও রক্তপাত',
        title: 'মারাত্মক রক্তপাত ও ক্ষত নিয়ন্ত্রণ',
        desc: 'জীবাণুমুক্ত ড্রেসিং বা পরিষ্কার কাপড় দিয়ে রক্তপাতের স্থানে একটানা সরাসরি চাপ দিন। হাড় ভাঙার সন্দেহ না থাকলে আহত অঙ্গ হৃদপিণ্ডের স্তরের চেয়ে উঁচুতে রাখুন। শরীরে গভীরভাবে ঢুকে থাকা কোনো ধ্বংসাবশেষ নিজে বের করার চেষ্টা করবেন না।'
      },
      hi: {
        stepBadge: 'चरण ३',
        tag: 'रक्त प्रवाह व रक्तस्राव',
        title: 'गंभीर रक्तस्राव व घाव नियंत्रण',
        desc: 'स्टेरलाइज़्ड ड्रेसिंग या साफ कपड़े से खून बहने वाले स्थान पर लगातार सीधा दबाव बनाएं। यदि हड्डी टूटने का संदेह न हो, तो घायल अंग को दिल के स्तर से ऊपर उठाएं। शरीर में गहराई तक धंसा मलबा खुद न निकालें।'
      },
      dimasa: {
        stepBadge: 'STEP 3',
        tag: 'THI DUGBA DAM-GARBA',
        title: 'Thi Dugba aroni Kharo-ba Dam-garba',
        desc: 'Subra rih ya-ba patthi jang thi dugba jaga-ha khop-hi khoro-ba khereng. Ya-phah kholop thik dong-ba bukhuk ning-gajao khere-ba. Deha-ha shing ha-ba longthai-rang gabon sising dah bokhoba.'
      }
    }
  },
  {
    step: '4',
    translations: {
      en: {
        stepBadge: 'STEP 4',
        tag: 'CRUSH TRAUMA',
        title: 'Crush Injury & Entrapment Protocol',
        desc: 'If a limb has been trapped under heavy rocks/debris for >15 minutes, notify 108/1077 immediately before lifting the weight to avoid sudden crush syndrome toxins. Stabilize and splint limbs.'
      },
      as: {
        stepBadge: 'পদক্ষেপ ৪',
        tag: 'ক্ৰাছ ট্ৰমা / চেপা আঘাত',
        title: 'গধুৰ বস্তুৰ তলত চেপা খোৱা আঘাতৰ প্ৰট’কল',
        desc: 'যদি কোনো অংগ ১৫ মিনিটতকৈ অধিক সময় গধুৰ শিল বা ধ্বংসাৱশেষৰ তলত আৱদ্ধ হৈ থাকে, হঠাৎ গধুৰ বস্তু আঁতৰোৱাৰ আগতে তাৎক্ষণিকভাৱে ১০৮/১০৭৭ ক অৱগত কৰক, যাতে বিষাক্ত দ্ৰব্যৰ বিষক্ৰিয়া ৰোধ কৰিব পৰা যায়। অংগবোৰ স্থিৰ কৰি স্প্লিণ্ট বান্ধক।'
      },
      bn: {
        stepBadge: 'পদক্ষেপ ৪',
        tag: 'ক্রাশ ট্রমা / পিষ্ট আঘাত',
        title: 'ভারী চাপে পিষ্ট ও আটকা পড়ার প্রোটোকল',
        desc: 'কোনো অঙ্গ যদি ১৫ মিনিটের বেশি সময় ভারী পাথর বা ধ্বংসস্তূপের নিচে আটকে থাকে, তবে হঠাৎ ওজন সরানোর আগেই অবিলম্বে ১০৮/১০৭৭ নম্বরে জানান, যাতে ক্রাশ সিন্ড্রোমের বিষক্রিয়া এড়ানো যায়। অঙ্গ স্থির করে স্প্লিন্ট বাঁধুন।'
      },
      hi: {
        stepBadge: 'चरण ४',
        tag: 'क्रश ट्रॉमा / दबने की चोट',
        title: 'मलबे में दबने व क्रश इंजरी प्रोटोकॉल',
        desc: 'यदि कोई अंग 15 मिनट से अधिक समय तक भारी पत्थरों या मलबे के नीचे दबा रहा हो, तो अचानक वजन हटाने से पहले तुरंत 108/1077 को सूचित करें ताकि क्रश सिंड्रोम के विषैले असर से बचा जा सके। अंगों को स्थिर कर स्प्लिंट बांधें।'
      },
      dimasa: {
        stepBadge: 'STEP 4',
        tag: 'LONGTHAI THEP-BA DUKHU',
        title: 'Longthai Ha-phlang Doba & Thep-ba Dukhu',
        desc: 'Ya-phah longthai giding-ha 15 minute niprah boro doba dong-ba, longthai bokho-ya se 108/1077-ha giri-giri khobor ri-ba, thi poison giding-ya jathain. Ya-phah rathao-hi khere-ba.'
      }
    }
  },
  {
    step: '5',
    translations: {
      en: {
        stepBadge: 'STEP 5',
        tag: 'SPINE & HEAD INJURY',
        title: 'Head, Neck & Spinal Immobilization',
        desc: 'Assume spinal trauma if the victim was struck by falling boulders or carried by mud. Keep the head and neck strictly aligned; avoid twisting or bending the back during movement.'
      },
      as: {
        stepBadge: 'পদক্ষেপ ৫',
        tag: 'মেৰুদণ্ড আৰু মূৰৰ আঘাত',
        title: 'মূৰ, ডিঙি আৰু মেৰুদণ্ড স্থিৰ কৰি ৰখা',
        desc: 'যদি ব্যক্তিজনক খহি পৰা শিলাখণ্ডই আঘাত কৰিছে বা বোকাৰ সৈতে উটি আহিছে, তেন্তে মেৰুদণ্ডত আঘাত পাইছে বুলি গণ্য কৰক। মূৰ আৰু ডিঙি একেবাৰে পোন কৰি ৰাখক; স্থানান্তৰ কৰোঁতে পিঠি বা ডিঙি বেঁকা হ’বলৈ নিদিব।'
      },
      bn: {
        stepBadge: 'পদক্ষেপ ৫',
        tag: 'মেরুদণ্ড ও মাথার আঘাত',
        title: 'মাথা, ঘাড় ও মেরুদণ্ড স্থির রাখা',
        desc: 'পাথরের আঘাত বা কাদার তোড়ে ভেসে এলে মেরুদণ্ডে গুরুতর আঘাত ধরে নিতে হবে। মাথা ও ঘাড় সোজা লাইনে রাখুন; সরানোর সময় পিঠ বা ঘাড় বাঁকা বা মোচড় যেন না খায়।'
      },
      hi: {
        stepBadge: 'चरण ५',
        tag: 'रीढ़ व सिर की चोट',
        title: 'सिर, गर्दन व रीढ़ की हड्डी को स्थिर रखना',
        desc: 'यदि पीड़ित पर पत्थर गिरे हों या वह मलबे में बहा हो, तो रीढ़ की चोट मानकर चलें। सिर और गर्दन को पूरी तरह सीधा रखें; ले जाते समय पीठ को मोड़ने या झुकाने से बचें।'
      },
      dimasa: {
        stepBadge: 'STEP 5',
        tag: 'KHORO-BA & KHOROH DUKHU',
        title: 'Khoroh, Gudung aroni Khoro-ba Rathao-hi Lakhoba',
        desc: 'Longthai jiri-ba ya-ba ha-baishi-ha joroba borai-khah khoro-ba dukhu maimu hi san-ba. Khoroh aroni gudung thik rathao-hi lakho; deha-khah phili-pheli dah klaba.'
      }
    }
  },
  {
    step: '6',
    translations: {
      en: {
        stepBadge: 'STEP 6',
        tag: 'HYPOTHERMIA PREVENTION',
        title: 'Combat Hypothermia & Shock',
        desc: 'Wet, muddy clothing causes rapid core body cooling in hill rain. Strip soaked outer layers, wrap victim in dry blankets or thermal foil, and keep them calm and warm until rescue teams arrive.'
      },
      as: {
        stepBadge: 'পদক্ষেপ ৬',
        tag: 'অত্যধিক ঠাণ্ডা প্ৰতিৰোধ',
        title: 'হাইপ’থাৰ্মিয়া আৰু শক্ প্ৰতিৰোধ',
        desc: 'পাহাৰীয়া বৰষুণত তিতা বোকাময় কাপোৰে শৰীৰৰ উষ্ণতা দ্ৰুতগতিত হ্ৰাস কৰে। তিতা কাপোৰ আঁতৰাই শুকান কম্বল বা থাৰ্মেল ফইলেৰে মেৰিয়াই ৰাখক আৰু উদ্ধাৰকাৰী দল নহালৈকে তেওঁলোকক শান্ত আৰু উমাল কৰি ৰাখক।'
      },
      bn: {
        stepBadge: 'পদক্ষেপ ৬',
        tag: 'তীব্র ঠান্ডা প্রতিরোধ',
        title: 'হাইপোথার্মিয়া ও শক প্রতিরোধ',
        desc: 'পাহাড়ি বৃষ্টিতে ভেজা কাদাভর্তি পোশাক শরীরের তাপমাত্রা দ্রুত কমিয়ে দেয়। ভেজা পোশাক সরিয়ে শুকনো কম্বল বা থার্মাল ফয়েল দিয়ে ঢেকে রাখুন এবং উদ্ধারকারী দল না আসা পর্যন্ত আক্রান্তকে শান্ত ও উষ্ণ রাখুন।'
      },
      hi: {
        stepBadge: 'चरण ६',
        tag: 'हाइपोथर्मिया रोकथाम',
        title: 'हाइपोथर्मिया (अत्यधिक ठंड) व सदमे से बचाव',
        desc: 'पहाड़ी बारिश में गीले, कीचड़युक्त कपड़े शरीर का तापमान तेजी से गिरा देते हैं। भीगे कपड़े उतारें, पीड़ित को सूखे कंबल या थर्मल फॉयल में लपेटें और बचाव दल आने तक उसे शांत व गर्म रखें।'
      },
      dimasa: {
        stepBadge: 'STEP 6',
        tag: 'GIKIRI PRATHIKAR',
        title: 'Gikiri aroni Gushu Dukhu Doba',
        desc: 'Hadu-ha ha-dithu rih bini jadu-khah giri-giri gushuh klahu-ba. Gushuh rih garhi rangphu rih ya-ba kambol jang thu-ba, aroni rescue team jiphu se deha-khah warm lakho-ba.'
      }
    }
  }
];

export const InjuryFirstAidModal: React.FC<InjuryFirstAidModalProps> = ({ visible, onClose }) => {
  const insets = getSafeAreaInsets();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');

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
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.headerBadge}>🏥 EMERGENCY PROTOCOL & HELPLINES</Text>
              <Text style={styles.headerMainTitle}>Trauma and Injury First Aid Guide</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close Trauma and Injury First Aid Guide"
            >
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. Short Existing Description */}
          <View style={styles.bannerNotice}>
            <Text style={styles.bannerNoticeTitle}>⚡ Critical Response Instructions</Text>
            <Text style={styles.bannerNoticeSub}>
              Follow these sequential medical triage steps while awaiting emergency search & rescue teams.
            </Text>
          </View>

          {/* 2. Language Selector Bar (Flags removed, clean text only) */}
          <View style={styles.langSelectorContainer}>
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
                    accessibilityLabel={`Select ${item.label}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.langNameText, isSelected && styles.langNameTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Step-by-Step Six-Step Protocol */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>🩹 Step-by-Step Injury First-Aid Protocol</Text>
            <Text style={styles.sectionSub}>{FIRST_AID_SECTION_SUB[selectedLang] || FIRST_AID_SECTION_SUB.en}</Text>

            {INJURY_FIRST_AID_STEPS.map((stepItem, idx) => {
              const localized = stepItem.translations[selectedLang] || stepItem.translations.en;

              return (
                <View key={idx} style={styles.stepCard}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>{localized.stepBadge}</Text>
                    </View>
                    <Text style={styles.stepTagText}>{localized.tag}</Text>
                  </View>

                  <Text style={styles.stepTitle}>{localized.title}</Text>
                  <Text style={styles.stepDesc}>{localized.desc}</Text>
                </View>
              );
            })}
          </View>

          {/* 4. Valid Government Emergency Helplines */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>📞 Emergency Helplines</Text>
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
        </ScrollView>

        {/* Bottom Bar with Safe Inset */}
        <View style={[styles.footerBar, { paddingBottom: bottomPadding }]}>
          <TouchableOpacity
            style={styles.acknowledgeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="I Understand and Close Guide"
          >
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
  langSelectorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  langBarLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8
  },
  langScrollWrapper: {
    width: '100%'
  },
  langScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8
  },
  langChip: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
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
  langNameText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
    includeFontPadding: false
  },
  langNameTextActive: {
    color: '#166534',
    fontWeight: '800'
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
