import { getAuthToken } from './storageService';
import { performOfflineGeofenceCheck, evaluateGeotechnicalRisk } from './offlineRiskEngine';
import REAL_GRID_POINTS from '../data/realDimaHasaoGrid.json';

// Backend URL configurable via Expo environment variables (defaults to live Render cloud backend)
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://ner-landslide-backend.onrender.com'
).replace(/\/$/, '');

export const ML_API_BASE_URL = (
  process.env.EXPO_PUBLIC_ML_API_BASE_URL ||
  'https://sih-early-detection-of-landslides.onrender.com'
).replace(/\/$/, '');

export interface AlertCheckResponse {
  in_risk_zone: boolean;
  risk_level: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  zone_id?: number;
  district?: string;
  location_name?: string;
  distance_meters?: number;
  probability?: number;
  advisory?: string;
  action_required?: string;
  primary_hazard_driver?: string;
  evaluated_by?: string;
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
  return predictCoordinateRisk(lat, lng);
}

/**
 * Evaluates risk dynamically for specified coordinates via the calibrated
 * Geotechnical ML Microservice and authentic Dima Hasao satellite DEM GIS Grid.
 */
export async function predictCoordinateRisk(
  lat: number,
  lng: number,
  locationName?: string
): Promise<AlertCheckResponse> {
  const resolvedName = locationName && locationName.trim().length > 0
    ? locationName.trim()
    : `Sector (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;

  // 1. Spatial DEM analysis from 5,076 authentic satellite terrain cells
  const isInsideRegion = (lat >= 24.85 && lat <= 25.95 && lng >= 92.35 && lng <= 93.45);
  let nearestPoint: any = null;
  let minDistKm = Infinity;

  if (Array.isArray(REAL_GRID_POINTS) && REAL_GRID_POINTS.length > 0) {
    for (let i = 0; i < REAL_GRID_POINTS.length; i++) {
      const p = (REAL_GRID_POINTS as any[])[i];
      const dLat = (lat - p.latitude) * 111.0;
      const dLng = (lng - p.longitude) * 111.0 * Math.cos((lat * Math.PI) / 180);
      const d = Math.sqrt(dLat * dLat + dLng * dLng);
      if (d < minDistKm) {
        minDistKm = d;
        nearestPoint = p;
      }
    }
  }

  // Determine geotechnical metrics based on real satellite terrain
  const isNearMountainGrid = isInsideRegion && minDistKm <= 25.0;
  const slope = isNearMountainGrid
    ? (Number(nearestPoint?.slope) || 3.0)
    : 2.0;
  const elevation = isNearMountainGrid
    ? (Number(nearestPoint?.elevation) || 450.0)
    : 120.0;
  const clay = isNearMountainGrid
    ? Number(nearestPoint?.clay_percent || nearestPoint?.clay_percentage || 32.0)
    : 28.0;
  const sand = isNearMountainGrid ? Number(nearestPoint?.sand_percent || 30.0) : 36.0;
  const silt = isNearMountainGrid ? Number(nearestPoint?.silt_percent || 38.0) : 36.0;
  const bulkDensity = isNearMountainGrid ? Number(nearestPoint?.bulk_density || 1.25) : 1.28;

  const rain1 = slope >= 28.0 ? 35.0 : 5.0;
  const rain3d = slope >= 28.0 ? 90.0 : 12.0;

  const mlFeaturesPayload = {
    slope,
    elevation,
    aspect: 145.0,
    clay_percent: clay,
    sand_percent: sand,
    silt_percent: silt,
    bulk_density: bulkDensity,
    rain_day_minus_1_mm: rain1,
    rain_3d_sum_mm: rain3d
  };

  // 1. Primary Path: Backend /predict-coordinate (Backend collects all DEM/terrain/weather features & runs ML model)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${ML_API_BASE_URL}/predict-coordinate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        location_name: resolvedName
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const prob = typeof data.landslide_probability === 'number'
        ? data.landslide_probability
        : 0.05;
      const riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = data.risk_level || (prob >= 0.70 ? 'CRITICAL' : prob >= 0.40 ? 'HIGH' : prob >= 0.15 ? 'MODERATE' : 'SAFE');
      const isHazard = Boolean(data.in_risk_zone) || (riskLevel === 'CRITICAL' || riskLevel === 'HIGH');

      return {
        in_risk_zone: isHazard,
        risk_level: riskLevel,
        district: data.district || (isNearMountainGrid ? 'Dima Hasao' : 'Lowland Plains (Safe Sector)'),
        location_name: data.location_name || resolvedName,
        distance_meters: typeof data.nearest_grid_distance_m === 'number' ? Math.round(data.nearest_grid_distance_m) : Math.round(minDistKm * 1000),
        probability: Math.round(prob * 1000) / 1000,
        advisory: data.advisory,
        action_required: data.action_required,
        primary_hazard_driver: data.primary_hazard_driver,
        evaluated_by: data.evaluated_by || 'FastAPI Geotechnical ML Microservice (Calibrated XGBoost Engine)',
        alert_dispatched: isHazard,
        checked_at: data.timestamp || new Date().toISOString(),
        isOfflineFallback: false
      };
    }
  } catch (coordErr) {
    console.warn('Backend /predict-coordinate call note:', coordErr);
  }

  // 3. Secondary Path: Try Spring Boot evaluate-coordinate
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_BASE_URL}/api/predictions/evaluate-coordinate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        locationName: resolvedName
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const prob = typeof data.probability === 'number' ? data.probability : 0.05;
      const isHazard = prob >= 0.40;
      const riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = isHazard
        ? (prob >= 0.70 ? 'CRITICAL' : 'HIGH')
        : 'SAFE';

      return {
        in_risk_zone: isHazard,
        risk_level: riskLevel,
        district: data.district || 'Dima Hasao',
        location_name: resolvedName,
        distance_meters: data.distanceMeters || Math.round(minDistKm * 1000),
        probability: Math.round(prob * 1000) / 1000,
        advisory: data.advisory,
        action_required: data.actionRequired,
        primary_hazard_driver: data.primaryHazardDriver || 'Spring Boot Geotechnical Grid',
        evaluated_by: 'Spring Boot Backend Engine',
        alert_dispatched: isHazard,
        checked_at: new Date().toISOString(),
        isOfflineFallback: false
      };
    }
  } catch (backErr) {
    // Continue to offline fallback
  }

  // 4. Offline Fallback: High-Precision Geotechnical Engine
  console.info('Evaluating coordinate via local Geotechnical Risk Engine.');
  const offlineResult = evaluateGeotechnicalRisk(lat, lng);
  return {
    ...offlineResult,
    location_name: resolvedName,
    isOfflineFallback: true
  };
}

/**
 * Checks connectivity to the backend and ML microservice.
 */
export async function checkBackendOnlineStatus(): Promise<{
  isOnline: boolean;
  backendConnected: boolean;
  mlConnected: boolean;
}> {
  let backendOk = false;
  let mlOk = false;

  try {
    const c1 = new AbortController();
    const t1 = setTimeout(() => c1.abort(), 3500);
    const r1 = await fetch(`${API_BASE_URL}/actuator/health`, { method: 'GET', signal: c1.signal });
    clearTimeout(t1);
    backendOk = r1.ok;
  } catch (e) {
    backendOk = false;
  }

  try {
    const c2 = new AbortController();
    const t2 = setTimeout(() => c2.abort(), 3500);
    const r2 = await fetch(`${ML_API_BASE_URL}/health`, { method: 'GET', signal: c2.signal });
    clearTimeout(t2);
    mlOk = r2.ok;
  } catch (e) {
    mlOk = false;
  }

  return {
    isOnline: backendOk || mlOk,
    backendConnected: backendOk,
    mlConnected: mlOk
  };
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

export async function fetchSimulatorAlert(): Promise<any | null> {
  const urls = [
    `${ML_API_BASE_URL}/api/alerts/simulator/active`,
    `${API_BASE_URL}/api/alerts/simulator/active`,
    `${ML_API_BASE_URL}/api/alerts/active-broadcast?source=SIMULATOR`,
    `${API_BASE_URL}/api/alerts/active-broadcast?source=SIMULATOR`
  ];

  const fetchPromises = urls.map(async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        if (data && data.active && (data.source === 'SIMULATOR' || !data.source)) {
          return { ...data, source: 'SIMULATOR' };
        }
      }
      throw new Error('Not active simulator alert');
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

export async function dismissSimulatorAlert(): Promise<void> {
  const urls = [
    `${ML_API_BASE_URL}/api/alerts/simulator/dismiss`,
    `${API_BASE_URL}/api/alerts/simulator/dismiss`,
    `${ML_API_BASE_URL}/api/alerts/dismiss-broadcast?source=SIMULATOR`,
    `${API_BASE_URL}/api/alerts/dismiss-broadcast?source=SIMULATOR`
  ];

  await Promise.allSettled(
    urls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => { })
    )
  );
}

export async function fetchLiveAlert(): Promise<any | null> {
  const urls = [
    `${ML_API_BASE_URL}/api/alerts/live/active`,
    `${API_BASE_URL}/api/alerts/live/active`,
    `${ML_API_BASE_URL}/api/alerts/active-broadcast?source=LIVE_MONITORING`,
    `${API_BASE_URL}/api/alerts/active-broadcast?source=LIVE_MONITORING`
  ];

  const fetchPromises = urls.map(async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        if (data && data.active && data.source !== 'SIMULATOR') {
          return { ...data, source: 'LIVE_MONITORING' };
        }
      }
      throw new Error('Not active live alert');
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

export async function dismissLiveAlert(): Promise<void> {
  const urls = [
    `${ML_API_BASE_URL}/api/alerts/live/dismiss`,
    `${API_BASE_URL}/api/alerts/live/dismiss`,
    `${ML_API_BASE_URL}/api/alerts/dismiss-broadcast?source=LIVE_MONITORING`,
    `${API_BASE_URL}/api/alerts/dismiss-broadcast?source=LIVE_MONITORING`
  ];

  await Promise.allSettled(
    urls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => { })
    )
  );
}

export async function fetchActiveBroadcast(sourceFilter?: 'SIMULATOR' | 'LIVE_MONITORING'): Promise<any | null> {
  if (sourceFilter === 'SIMULATOR') {
    return fetchSimulatorAlert();
  }
  if (sourceFilter === 'LIVE_MONITORING') {
    return fetchLiveAlert();
  }

  const urls = [
    `${ML_API_BASE_URL}/api/alerts/active-broadcast`,
    `${API_BASE_URL}/api/alerts/active-broadcast`
  ];

  const fetchPromises = urls.map(async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
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

export async function dismissActiveBroadcast(sourceFilter?: 'SIMULATOR' | 'LIVE_MONITORING'): Promise<void> {
  if (sourceFilter === 'SIMULATOR') {
    return dismissSimulatorAlert();
  }
  if (sourceFilter === 'LIVE_MONITORING') {
    return dismissLiveAlert();
  }

  const urls = [
    `${ML_API_BASE_URL}/api/alerts/dismiss-broadcast`,
    `${API_BASE_URL}/api/alerts/dismiss-broadcast`
  ];

  await Promise.allSettled(
    urls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => { })
    )
  );
}


