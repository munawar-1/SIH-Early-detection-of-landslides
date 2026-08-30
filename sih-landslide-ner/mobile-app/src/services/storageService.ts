import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_jwt_token';
const USER_KEY = 'auth_user_data';
const CONSENT_KEY = 'location_consent_status';

export async function saveAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (err) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  await AsyncStorage.removeItem(USER_KEY);
}

export async function saveUserData(user: any): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUserData(): Promise<any | null> {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function setLocationConsent(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(enabled));
}

export async function getLocationConsent(): Promise<boolean> {
  const data = await AsyncStorage.getItem(CONSENT_KEY);
  return data ? JSON.parse(data) : true;
}
