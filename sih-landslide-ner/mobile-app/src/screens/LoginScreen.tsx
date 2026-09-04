import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { saveAuthToken, saveUserData } from '../services/storageService';
import { APP_COLORS } from '../constants/theme';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mobileNumber, setMobileNumber] = useState<string>('9876543210');
  const [otp, setOtp] = useState<string>('123456');
  const [step, setStep] = useState<'MOBILE' | 'OTP'>('MOBILE');
  const [loading, setLoading] = useState<boolean>(false);
  const [infoMsg, setInfoMsg] = useState<string | null>('Demo Test Mode: Any 10-digit phone accepted. Code: 123456');

  const handleRequestOtp = async () => {
    const cleaned = mobileNumber.replace(/[^0-9]/g, '');
    if (!cleaned || cleaned.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('OTP');
      setInfoMsg(`Verification code sent to +91 ${cleaned}. Enter 123456 to continue.`);
    }, 300);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit test code (123456).');
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      setLoading(false);
      const dummyToken = 'demo_jwt_token_' + Date.now();
      await saveAuthToken(dummyToken);
      await saveUserData({
        mobile_number: '+91' + mobileNumber.replace(/[^0-9]/g, ''),
        name: 'Citizen Demo User',
        role: 'ROLE_CITIZEN',
        district: 'Dima Hasao'
      });
      onLoginSuccess();
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Header */}
        <View style={styles.headerContainer}>
          <View style={styles.badgeIcon}>
            <Text style={styles.badgeText}>⛰️ GIS LANDSLIDE MONITOR</Text>
          </View>
          <Text style={styles.title}>NER Landslide Warning</Text>
          <Text style={styles.subtitle}>
            North Eastern Region Early Warning Platform • Dima Hasao Pilot
          </Text>
        </View>

        {/* Auth Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {step === 'MOBILE' ? 'Citizen Mobile Sign-In' : 'Enter Verification Code'}
          </Text>
          <Text style={styles.cardDescription}>
            {step === 'MOBILE'
              ? 'Receive cellular emergency alert SMS and live landslide risk assessments.'
              : `Verification code sent to +91 ${mobileNumber}`}
          </Text>

          {infoMsg && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>{infoMsg}</Text>
            </View>
          )}

          {step === 'MOBILE' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.phoneInputRow}>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#8FA48A"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor="#8FA48A"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
              <Text style={styles.otpHint}>Demo test code: 123456</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={step === 'MOBILE' ? handleRequestOtp : handleVerifyOtp}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={step === 'MOBILE' ? 'Request OTP' : 'Verify & Continue'}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 'MOBILE' ? 'Get Verification Code ➔' : 'Verify & Access Monitor ✅'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 'OTP' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep('MOBILE')}
              accessibilityRole="button"
              accessibilityLabel="Change mobile number"
            >
              <Text style={styles.secondaryButtonText}>← Change Mobile Number</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.footerNote}>
          🔒 Secure E.164 Citizen Authentication • Dima Hasao Pilot Area
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  badgeIcon: {
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 10
  },
  badgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 3
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    marginBottom: 3
  },
  cardDescription: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 16
  },
  infoBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  infoBannerText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700'
  },
  inputGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    paddingHorizontal: 14
  },
  countryCode: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 10
  },
  input: {
    flex: 1,
    height: 48,
    color: APP_COLORS.textPrimary,
    fontSize: 15
  },
  otpInput: {
    backgroundColor: APP_COLORS.bgCardSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    paddingHorizontal: 16,
    letterSpacing: 6,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center'
  },
  otpHint: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center'
  },
  button: {
    backgroundColor: APP_COLORS.buttonPrimaryBg,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6
  },
  secondaryButtonText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700'
  },
  footerNote: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20
  }
});
