import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThreatLevel } from '../constants/theme';

export type SupportedLanguage = 'en' | 'as' | 'bn' | 'hi' | 'dimasa';

export const LANGUAGE_TABS: { key: SupportedLanguage; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'as', label: 'অসমীয়া', flag: '🇮🇳' },
  { key: 'bn', label: 'বাংলা', flag: '🇮🇳' },
  { key: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { key: 'dimasa', label: 'Dimasa', flag: '🏔️' }
];

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
    if (this.cachedAlerts !== null) return this.cachedAlerts;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_ALERTS);
      if (raw) {
        this.cachedAlerts = JSON.parse(raw);
      } else {
        this.cachedAlerts = [];
        await AsyncStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify([]));
      }
    } catch (e) {
      this.cachedAlerts = [];
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

    const senderTag = params.senderTag || 'DDMA-HAFLONG';

    const defaultTranslations: Record<SupportedLanguage, string> = params.translations || {
      en: params.bodyEnglish,
      as: `সতৰ্কবাণী: ${params.bodyEnglish}`,
      bn: `জরুরী সতর্কতা: ${params.bodyEnglish}`,
      hi: `आपातकालीन चेतावनी: ${params.bodyEnglish}`,
      dimasa: `Alert: ${params.bodyEnglish}`
    };

    const newAlert: EmergencySmsAlert = {
      id: `ALERT-SMS-${Date.now()}`,
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
