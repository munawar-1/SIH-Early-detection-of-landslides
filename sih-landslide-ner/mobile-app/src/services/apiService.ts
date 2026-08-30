import { getAuthToken } from './storageService';
import { performOfflineGeofenceCheck } from './offlineRiskEngine';

// Backend URL configurable for emulator / device / local development
export const API_BASE_URL = 'http://192.168.1.13:8080';

export interface AlertCheckResponse {
  in_risk_zone: boolean;
  risk_level: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  zone_id?: number;
  district?: string;
  distance_meters?: number;
  probability?: number;
  advisory?: string;
  action_required?: string;
  alert_dispatched?: boolean;
  checked_at?: string;
  isOfflineFallback?: boolean;
}

export async function requestOtp(mobileNumber: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/mobile/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile_number: mobileNumber })
  });

  if (!response.ok) {
    throw new Error('Failed to send OTP to ' + mobileNumber);
  }
  return await response.json();
}

export async function verifyOtp(mobileNumber: string, otp: string, fcmToken?: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/mobile/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile_number: mobileNumber,
      otp: otp,
      fcm_token: fcmToken
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'OTP verification failed. Please try 123456');
  }

  return await response.json(); // returns { token, user }
}

export async function updateLocation(lat: number, lng: number, fcmToken?: string): Promise<AlertCheckResponse> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/location/update`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lat, lng, fcm_token: fcmToken })
  });

  if (!response.ok) {
    throw new Error('Location update failed (HTTP ' + response.status + ')');
  }

  return await response.json();
}

export async function checkAlert(lat: number, lng: number): Promise<AlertCheckResponse> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${API_BASE_URL}/api/alerts/check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lat, lng }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return {
        in_risk_zone: data.inRiskZone ?? data.in_risk_zone ?? false,
        risk_level: data.riskLevel ?? data.risk_level ?? 'SAFE',
        district: data.district,
        distance_meters: data.distanceMeters ?? data.distance_meters,
        probability: data.probability,
        advisory: data.advisory,
        action_required: data.actionRequired ?? data.action_required,
        alert_dispatched: data.alertDispatched ?? data.alert_dispatched ?? false,
        checked_at: data.checkedAt ?? data.checked_at ?? new Date().toISOString(),
        isOfflineFallback: false
      };
    }
    return await performOfflineGeofenceCheck(lat, lng);
  } catch (error) {
    clearTimeout(timeout);
    return await performOfflineGeofenceCheck(lat, lng);
  }
}

export async function fetchLiveRiskZones(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/predictions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    return [];
  }
}

export async function fetchActiveBroadcast(): Promise<any | null> {
  const urls = [
    'http://192.168.1.13:8000/api/alerts/active-broadcast',
    'http://192.168.1.13:8080/api/alerts/active-broadcast'
  ];

  const fetchPromises = urls.map(async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        if (data && data.active) {
          return data;
        }
      }
      throw new Error('Not active');
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  });

  try {
    return await Promise.any(fetchPromises);
  } catch (e) {
    return null;
  }
}

export async function dismissActiveBroadcast(): Promise<void> {
  const urls = [
    'http://192.168.1.13:8000/api/alerts/dismiss-broadcast',
    'http://192.168.1.13:8080/api/alerts/dismiss-broadcast'
  ];

  await Promise.allSettled(
    urls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {})
    )
  );
}


