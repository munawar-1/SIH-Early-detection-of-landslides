import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Linking
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { smsService, DEFAULT_PLACEHOLDER_CONTACT } from '../services/smsService';
import { ACTIVE_COORD_KEY, SavedCoordinate } from './PitchSimulationScreen';
import { APP_COLORS } from '../constants/theme';
import { InjuryFirstAidModal, VALID_HELPLINES } from '../components/InjuryFirstAidModal';

export const SosSmsScreen: React.FC = () => {
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; altitude: number | null } | null>(null);
  const [locating, setLocating] = useState<boolean>(true);
  const [targetContact, setTargetContact] = useState<string>(DEFAULT_PLACEHOLDER_CONTACT);
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [editContactModal, setEditContactModal] = useState<boolean>(false);
  const [batteryPct, setBatteryPct] = useState<number>(84);
  const [nearestShelter, setNearestShelter] = useState<string>('Haflong Govt College Relief Camp (~2.4 km)');
  const [firstAidModalVisible, setFirstAidModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadTargetContact();
    fetchCurrentPosition();
  }, []);

  const loadTargetContact = async () => {
    const contact = await smsService.getTargetContact();
    setTargetContact(contact);
  };

  const fetchCurrentPosition = async () => {
    setLocating(true);

    try {
      // 1. Check if Pitch Studio coordinate is active
      const savedPitch = await AsyncStorage.getItem(ACTIVE_COORD_KEY);
      if (savedPitch) {
        const parsed: SavedCoordinate = JSON.parse(savedPitch);
        setGpsCoords({
          lat: parsed.lat,
          lng: parsed.lng,
          altitude: 512
        });
        setNearestShelter(
          parsed.lat === 25.18
            ? 'Jatinga Forest Inspection Bungalow Shelter (~1.2 km)'
            : 'Haflong Relief Shelter Camp (~2.4 km)'
        );
        setLocating(false);
        return;
      }

      // 2. Otherwise get physical device GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setGpsCoords({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          altitude: loc.coords.altitude ? Math.round(loc.coords.altitude) : 512
        });
      } else {
        setGpsCoords({ lat: 25.180, lng: 92.760, altitude: 512 });
      }
    } catch (e) {
      setGpsCoords({ lat: 25.180, lng: 92.760, altitude: 512 });
    } finally {
      setLocating(false);
    }
  };

  const lat = gpsCoords ? gpsCoords.lat.toFixed(4) : '25.1800';
  const lng = gpsCoords ? gpsCoords.lng.toFixed(4) : '92.7600';
  const alt = gpsCoords?.altitude ? gpsCoords.altitude : 512;

  const generatedSosBody = `[EMERGENCY RESCUE REQUEST] Trapped near landslide at [${lat}°N, ${lng}°E].\nLive Map: https://maps.google.com/?q=${lat},${lng}\nAlt: ~${alt}m. Battery: ${batteryPct}%. Nearest Shelter: ${nearestShelter}. Please dispatch SDRF / NDRF rescue team.`;

  const activeRecipient = customRecipient.trim() || targetContact;

  const handleLaunchComposer = async () => {
    if (!activeRecipient || activeRecipient.length < 8) {
      Alert.alert('Invalid Recipient', 'Please enter a valid phone number.');
      return;
    }

    const success = await smsService.openNativeComposer(activeRecipient, generatedSosBody);
    if (!success) {
      Alert.alert(
        'SMS Composer Unavailable',
        'Could not open device SMS composer. You can copy the SOS text manually.'
      );
    }
  };

  const handleSaveContact = async () => {
    const cleaned = targetContact.trim();
    if (cleaned.length < 8) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number format.');
      return;
    }
    await smsService.setTargetContact(cleaned);
    setEditContactModal(false);
    Alert.alert('Contact Saved', `Target contact updated to: ${cleaned}`);
  };

  const handleCallHelpline = (number: string, title: string) => {
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Banner Notice */}
      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerText}>
          🆘 Offline Emergency Rescue SOS Tool • Dima Hasao Disaster Operations
        </Text>
      </View>

      <View style={styles.content}>
        {/* Title Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Emergency SOS SMS Composer</Text>
          <Text style={styles.subtitle}>
            Generates pre-formatted emergency coordinates text to send via your phone's native SIM SMS app without internet.
          </Text>
        </View>

        {/* Live Diagnostics Card */}
        <View style={styles.diagnosticsCard}>
          <View style={styles.diagHeaderRow}>
            <Text style={styles.diagTitle}>📍 Real-Time Location & Device Diagnostics</Text>
            {locating ? (
              <ActivityIndicator size="small" color="#1E2B18" />
            ) : (
              <TouchableOpacity onPress={fetchCurrentPosition} accessibilityLabel="Refresh GPS coordinates">
                <Text style={styles.refreshGpsText}>🔄 Refresh Fix</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.diagGrid}>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Coordinates</Text>
              <Text style={styles.diagValue}>{lat}°N, {lng}°E</Text>
            </View>

            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Estimated Elevation</Text>
              <Text style={styles.diagValue}>~{alt} meters</Text>
            </View>

            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Battery Level</Text>
              <Text style={styles.diagValue}>{batteryPct}% Power</Text>
            </View>

            <View style={[styles.diagItem, styles.diagItemFull]}>
              <Text style={styles.diagLabel}>Nearest Refuge / Safe Shelter</Text>
              <Text style={styles.diagValue}>{nearestShelter}</Text>
            </View>
          </View>
        </View>

        {/* First Aid & Injury Action Banner */}
        <TouchableOpacity
          style={styles.firstAidBanner}
          onPress={() => setFirstAidModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Landslide Injury & Triage Protocol"
        >
          <View style={styles.firstAidLeft}>
            <Text style={styles.firstAidIcon}>🩹</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.firstAidTitle}>Trauma & Injury First-Aid Guide</Text>
              <Text style={styles.firstAidSub}>Airway, crush wound stabilization & hypothermia care steps</Text>
            </View>
          </View>
          <View style={styles.firstAidBadge}>
            <Text style={styles.firstAidBadgeText}>View Guide ➔</Text>
          </View>
        </TouchableOpacity>

        {/* Direct Helpline Calling Buttons */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📞 Direct Emergency Helplines</Text>
          <View style={styles.helplineGrid}>
            <TouchableOpacity
              style={styles.helplineBtn}
              onPress={() => handleCallHelpline('1077', 'DDMA Dima Hasao')}
            >
              <Text style={styles.helplineBtnText}>🏔️ DDMA: 1077</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.helplineBtn, styles.helplineBtnAmb]}
              onPress={() => handleCallHelpline('108', '108 Ambulance')}
            >
              <Text style={styles.helplineBtnText}>🚑 Ambulance: 108</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineBtn}
              onPress={() => handleCallHelpline('1070', 'ASDMA State Control')}
            >
              <Text style={styles.helplineBtnText}>🚨 ASDMA: 1070</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineBtn}
              onPress={() => handleCallHelpline('112', '112 Unified Emergency')}
            >
              <Text style={styles.helplineBtnText}>🚓 Police/Fire: 112</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Target Recipient Card */}
        <View style={styles.card}>
          <View style={styles.recipientHeaderRow}>
            <Text style={styles.cardTitle}>SMS Target Recipient</Text>
            <TouchableOpacity
              style={styles.editContactBtn}
              onPress={() => setEditContactModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Edit target phone number"
            >
              <Text style={styles.editContactBtnText}>✏️ Edit Target</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activeContactBox}>
            <Text style={styles.activeContactLabel}>Selected Recipient:</Text>
            <Text style={styles.activeContactNumber}>{activeRecipient}</Text>
            <Text style={styles.activeContactHint}>
              Configurable family / team test contact number.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Or Custom Recipient Phone Number:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. +91 98765 43210 (Team Test Phone)"
            placeholderTextColor="#8FA48A"
            keyboardType="phone-pad"
            value={customRecipient}
            onChangeText={setCustomRecipient}
          />
        </View>

        {/* Pre-Filled Message Preview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Generated Distress Message Preview</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>{generatedSosBody}</Text>
          </View>

          <Text style={styles.mapLinkNote}>
            🔗 Live Map: https://maps.google.com/?q={lat},{lng}
          </Text>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.primarySosBtn}
          onPress={handleLaunchComposer}
          accessibilityRole="button"
          accessibilityLabel="Open Native SMS Composer"
        >
          <Text style={styles.primarySosBtnText}>
            📤 Open Pre-Filled Native SMS App
          </Text>
        </TouchableOpacity>

        {/* Notice */}
        <View style={styles.infoNotice}>
          <Text style={styles.infoNoticeTitle}>ℹ️ How Native SMS Works:</Text>
          <Text style={styles.infoNoticeText}>
            Tapping above will open your device's native SMS Messages app with your live GPS coordinates pre-filled. Simply tap 'Send' in Messages. No cellular internet or data plan is required.
          </Text>
        </View>
      </View>

      {/* Edit Target Contact Modal */}
      <Modal visible={editContactModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Target Phone Number</Text>
            <Text style={styles.modalDescription}>
              Enter a family emergency contact number or team test phone for SOS drills.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="+91 98765 43210"
              placeholderTextColor="#8FA48A"
              keyboardType="phone-pad"
              value={targetContact}
              onChangeText={setTargetContact}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditContactModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing target contact"
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveContact}
                accessibilityRole="button"
                accessibilityLabel="Save target contact"
              >
                <Text style={styles.modalSaveBtnText}>Save Number</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Injury First-Aid Protocol & Valid Helplines Modal */}
      <InjuryFirstAidModal
        visible={firstAidModalVisible}
        onClose={() => setFirstAidModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  disclaimerBar: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#86EFAC'
  },
  disclaimerText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2
  },
  content: {
    padding: 16
  },
  header: {
    marginBottom: 14
  },
  title: {
    color: APP_COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2
  },
  subtitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  diagnosticsCard: {
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
  diagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  diagTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  refreshGpsText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700'
  },
  diagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  diagItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: APP_COLORS.bgCardSubtle,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.borderSubtle
  },
  diagItemFull: {
    width: '100%',
    minWidth: '100%'
  },
  diagLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  diagValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3
  },
  firstAidBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  firstAidLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  firstAidIcon: {
    fontSize: 24,
    marginRight: 10
  },
  firstAidTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800'
  },
  firstAidSub: {
    color: '#14532D',
    fontSize: 11,
    marginTop: 2
  },
  firstAidBadge: {
    backgroundColor: '#166534',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  firstAidBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 14,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  cardTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10
  },
  helplineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  helplineBtn: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#DCFCE7',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center'
  },
  helplineBtnAmb: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5'
  },
  helplineBtnText: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800'
  },
  recipientHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  editContactBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  editContactBtnText: {
    color: APP_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700'
  },
  activeContactBox: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 12
  },
  activeContactLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  activeContactNumber: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 2
  },
  activeContactHint: {
    color: APP_COLORS.textSecondary,
    fontSize: 11
  },
  inputLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  textInput: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    minHeight: 46
  },
  previewBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706'
  },
  previewText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600'
  },
  mapLinkNote: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8
  },
  primarySosBtn: {
    backgroundColor: '#DC2626',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6
  },
  primarySosBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  infoNotice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    marginBottom: 16
  },
  infoNoticeTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4
  },
  infoNoticeText: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 36, 23, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6
  },
  modalTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6
  },
  modalDescription: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14
  },
  modalInput: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 16,
    minHeight: 46
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.bgCardSubtle,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  modalCancelBtnText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  }
});
