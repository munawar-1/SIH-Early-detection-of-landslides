import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThreatLevel } from '../constants/theme';

export type SupportedLanguage = 'en' | 'as' | 'bn' | 'hi' | 'dimasa';

export interface EmergencySmsAlert {
  id: string;
  senderTag: string; // e.g. "[DEMO] DDMA-HAFLONG"
  threatLevel: ThreatLevel;
  timestampISO: string;
  bodyEnglish: string;
  translations: Record<SupportedLanguage, string>;
  precautions?: string[];
  isRead: boolean;
  locationName?: string;
}

const STORAGE_KEY_ALERTS = 'ner_emergency_sms_alerts_v2';
const STORAGE_KEY_TARGET_CONTACT = 'ner_emergency_target_contact_v2';

// Default safe placeholder number (editable in-app)
export const DEFAULT_PLACEHOLDER_CONTACT = '+91 98765 43210';

export const SEED_DEMO_ALERTS: EmergencySmsAlert[] = [
  {
    id: 'DEMO-SMS-101',
    senderTag: '[DEMO] DDMA-HAFLONG',
    threatLevel: 'CRITICAL',
    timestampISO: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    locationName: 'Jatinga Ridge Corridor (NH-27)',
    bodyEnglish: '[DEMO] DIMA HASAO DDMA: Extreme slope saturation detected at Jatinga pass. High probability of mudflow on NH-27. Immediate evacuation advised to Haflong relief shelter.',
    translations: {
      en: '[DEMO] DIMA HASAO DDMA: Extreme slope saturation detected at Jatinga pass. High probability of mudflow on NH-27. Immediate evacuation advised to Haflong relief shelter.',
      as: '[DEMO] দিমা হাছাও DDMA: জাতিংগা গিরিপথত অত্যন্ত তীব্র ভূমিস্খলনৰ আশংকা। ৰাষ্ট্ৰীয় ঘাইপথ-২৭ত যাতায়াত স্থগিত ৰাখক আৰু সুৰক্ষিত আশ্ৰয় শিবিৰত আশ্ৰয় লওক।',
      bn: '[DEMO] ডিমা হাসাও DDMA: জাতিঙ্গা গিরিপথে মারাত্মক ভূমিধসের চরম ঝুঁকি। জাতীয় সড়ক-২৭ এ ভ্রমণ পরিহার করুন এবং নিকটস্থ নিরাপদ ত্রাণ শিবিরে আশ্রয় নিন।',
      hi: '[DEMO] दिमा हसाओ DDMA: जतिंगा दर्रे में भारी भूस्खलन की अत्यधिक संभावना है। राष्ट्रीय राजमार्ग-27 पर यात्रा टालें और तुरंत हाफलोंग सुरक्षित राहत केंद्र जाएं।',
      dimasa: '[DEMO] DIMA HASAO DDMA: Jatinga aroni Borail hado ha-gasa bahaiba dong. Safe refuge shelter-ha thango.'
    },
    precautions: [
      'Evacuate immediately from steep hillside cuts.',
      'Seek refuge at Haflong Govt College Shelter.',
      'Do not attempt crossing active stream beds.'
    ],
    isRead: false
  },
  {
    id: 'DEMO-SMS-102',
    senderTag: '[DEMO] ASDMA-EARLY-WARNING',
    threatLevel: 'HIGH',
    timestampISO: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    locationName: 'Borail Mountain Corridor',
    bodyEnglish: '[DEMO] ASDMA CONTROL: Heavy rainfall accumulation (>110mm) in Dima Hasao sector. Vulnerable slopes active. Avoid night travel.',
    translations: {
      en: '[DEMO] ASDMA CONTROL: Heavy rainfall accumulation (>110mm) in Dima Hasao sector. Vulnerable slopes active. Avoid night travel.',
      as: '[DEMO] অসম দুৰ্যোগ ব্যৱস্থাপনা: দিমা হাছাও পাহাৰত ১১০ মিমিৰো অধিক বৰষুণ। পাহাৰীয়া পথত ৰাতি যাত্ৰা বন্ধ ৰাখক।',
      bn: '[DEMO] আসাম বিপর্যয় মোকাবিলা: ডিমা হাসাও এলাকায় ১১০ মিমি বৃষ্টিপাত। পাহাড়ি বিপজ্জনক রাস্তায় রাতের ভ্রমণ স্থগিত রাখুন।',
      hi: '[DEMO] राज्य आपदा नियंत्रण: दिमा हसाओ क्षेत्र में 110 मिमी से अधिक वर्षा। ढलानों पर सतर्क रहें, रात्रि यात्रा से बचें।',
      dimasa: '[DEMO] ASDMA: Dima Hasao Borail range-ha bahaiba dima hado. Hadur thangya diba.'
    },
    precautions: [
      'Monitor district rainfall warnings.',
      'Keep emergency flashlight and medications ready.'
    ],
    isRead: true
  },
  {
    id: 'DEMO-SMS-103',
    senderTag: '[DEMO] NFR-RAILWAY-ALERT',
    threatLevel: 'MODERATE',
    timestampISO: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    locationName: 'Lumding - Badarpur Hill Corridor',
    bodyEnglish: '[DEMO] NFR RAILWAY: Track monitoring activated between Daotuhaja and Jatinga Lampur. Speed restrictions applied due to debris risk.',
    translations: {
      en: '[DEMO] NFR RAILWAY: Track monitoring activated between Daotuhaja and Jatinga Lampur. Speed restrictions applied due to debris risk.',
      as: '[DEMO] উত্তৰ-পূব সীমান্ত ৰে’লৱে: দাওতুহাজা আৰু জাতিংগা লামপুৰৰ মাজত ৰেল লাইন সতৰ্কতা বলবৎ কৰা হৈছে।',
      bn: '[DEMO] উত্তর-পূর্ব সীমান্ত রেল: দাওতুহাজা ও জাতিঙ্গার মাঝে রেল ট্র্যাকে সতর্কতা জারি করা হয়েছে।',
      hi: '[DEMO] पूर्वोत्तर सीमांत रेलवे: दाओतुहाजा और जतिंगा के बीच ट्रैक निगरानी सक्रिय। गति प्रतिबंध लागू।',
      dimasa: '[DEMO] NFR: Daotuhaja aroni Jatinga railway track-ha caution bahaiba dong.'
    },
    precautions: [
      'Check station announcements before boarding hill trains.'
    ],
    isRead: true
  }
];

type AlertChangeListener = (alerts: EmergencySmsAlert[], unreadCount: number) => void;
type BannerTriggerListener = (alert: EmergencySmsAlert) => void;

class SmsServiceState {
  private listeners: Set<AlertChangeListener> = new Set();
  private bannerListeners: Set<BannerTriggerListener> = new Set();
  private cachedAlerts: EmergencySmsAlert[] | null = null;
  private cachedTargetContact: string | null = null;

  public subscribe(listener: AlertChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeBanner(listener: BannerTriggerListener): () => void {
    this.bannerListeners.add(listener);
    return () => this.bannerListeners.delete(listener);
  }

  private notify() {
    if (this.cachedAlerts) {
      const unreadCount = this.cachedAlerts.filter(a => !a.isRead).length;
      this.listeners.forEach(l => {
        try {
          l(this.cachedAlerts || [], unreadCount);
        } catch (e) {
          console.warn('Listener error in SmsService:', e);
        }
      });
    }
  }

  public triggerBanner(alert: EmergencySmsAlert) {
    this.bannerListeners.forEach(l => {
      try {
        l(alert);
      } catch (e) {
        console.warn('Banner listener error in SmsService:', e);
      }
    });
  }

  public async getStoredAlerts(): Promise<EmergencySmsAlert[]> {
    if (this.cachedAlerts) return this.cachedAlerts;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_ALERTS);
      if (raw) {
        this.cachedAlerts = JSON.parse(raw);
      } else {
        this.cachedAlerts = SEED_DEMO_ALERTS;
        await AsyncStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(SEED_DEMO_ALERTS));
      }
    } catch (e) {
      console.warn('Could not load alerts from AsyncStorage:', e);
      this.cachedAlerts = SEED_DEMO_ALERTS;
    }

    return this.cachedAlerts || [];
  }

  public async addIncomingAlert(params: {
    threatLevel: ThreatLevel;
    senderTag?: string;
    locationName?: string;
    bodyEnglish: string;
    translations?: Record<SupportedLanguage, string>;
  }): Promise<EmergencySmsAlert> {
    const existing = await this.getStoredAlerts();

    const senderTag = params.senderTag || '[DEMO] DDMA-HAFLONG';

    const defaultTranslations: Record<SupportedLanguage, string> = params.translations || {
      en: params.bodyEnglish,
      as: `[DEMO] সতৰ্কবাণী: ${params.bodyEnglish}`,
      bn: `[DEMO] জরুরী সতর্কতা: ${params.bodyEnglish}`,
      hi: `[DEMO] आपातकालीन चेतावनी: ${params.bodyEnglish}`,
      dimasa: `[DEMO] Alert: ${params.bodyEnglish}`
    };

    const newAlert: EmergencySmsAlert = {
      id: `DEMO-SMS-${Date.now()}`,
      senderTag,
      threatLevel: params.threatLevel,
      timestampISO: new Date().toISOString(),
      locationName: params.locationName || 'Dima Hasao Corridor',
      bodyEnglish: params.bodyEnglish,
      translations: defaultTranslations,
      isRead: false
    };

    const updated = [newAlert, ...existing];
    this.cachedAlerts = updated;

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save alert to AsyncStorage:', e);
    }

    this.notify();
    this.triggerBanner(newAlert);

    return newAlert;
  }

  public async markAlertAsRead(id: string): Promise<void> {
    const alerts = await this.getStoredAlerts();
    const updated = alerts.map(a => (a.id === id ? { ...a, isRead: true } : a));
    this.cachedAlerts = updated;

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update alert status in AsyncStorage:', e);
    }

    this.notify();
  }

  public async markAllAlertsAsRead(): Promise<void> {
    const alerts = await this.getStoredAlerts();
    const updated = alerts.map(a => ({ ...a, isRead: true }));
    this.cachedAlerts = updated;

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to mark all read in AsyncStorage:', e);
    }

    this.notify();
  }

  public async getUnreadAlertCount(): Promise<number> {
    const alerts = await this.getStoredAlerts();
    return alerts.filter(a => !a.isRead).length;
  }

  public async getTargetContact(): Promise<string> {
    if (this.cachedTargetContact) return this.cachedTargetContact;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_TARGET_CONTACT);
      if (stored && stored.trim().length > 0) {
        this.cachedTargetContact = stored.trim();
      } else {
        this.cachedTargetContact = DEFAULT_PLACEHOLDER_CONTACT;
      }
    } catch (e) {
      this.cachedTargetContact = DEFAULT_PLACEHOLDER_CONTACT;
    }

    return this.cachedTargetContact;
  }

  public async setTargetContact(phone: string): Promise<void> {
    const cleaned = phone.trim() || DEFAULT_PLACEHOLDER_CONTACT;
    this.cachedTargetContact = cleaned;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_TARGET_CONTACT, cleaned);
    } catch (e) {
      console.warn('Failed to save target contact:', e);
    }
  }

  public async openNativeComposer(phone: string, body: string): Promise<boolean> {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const targetNumber = phone.trim() || DEFAULT_PLACEHOLDER_CONTACT;
    const url = `sms:${targetNumber}${separator}body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Could not open native SMS composer:', err);
      return false;
    }
  }
}

export const smsService = new SmsServiceState();
