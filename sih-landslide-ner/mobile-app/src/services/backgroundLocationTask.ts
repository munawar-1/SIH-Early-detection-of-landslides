import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { updateLocation, checkAlert } from './apiService';
import { getLocationConsent } from './storageService';
import { performOfflineGeofenceCheck } from './offlineRiskEngine';

export const BACKGROUND_LOCATION_TASK_NAME = 'ner-landslide-background-location-task';

// Define background task execution handler
TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('❌ Background Location Task Error:', error);
    return;
  }

  const consent = await getLocationConsent();
  if (!consent) {
    console.info('⏹️ Background location update skipped: User turned off location consent.');
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude } = location.coords;

      console.log(`📍 [BACKGROUND LOCATION UPDATE] Lat: ${latitude}, Lng: ${longitude}`);

      try {
        // Attempt live server update & spatial check
        const response = await updateLocation(latitude, longitude);
        if (response && response.in_risk_zone) {
          console.warn(`🚨 [BACKGROUND HAZARD DETECTED] Risk Level: ${response.risk_level} | District: ${response.district}`);
        }
      } catch (netErr) {
        console.warn('⚠️ Server unreachable in background task. Running offline geofence fallback...');
        const offlineResult = await performOfflineGeofenceCheck(latitude, longitude);
        if (offlineResult.in_risk_zone) {
          console.warn(`🚨 [OFFLINE HAZARD DETECTED] Level: ${offlineResult.risk_level}`);
        }
      }
    }
  }
});

/**
 * Register periodic / significant-change background location task
 * Distance interval: 500m
 * Time interval: 15 minutes (900,000 ms)
 */
export async function startBackgroundLocationTracking(): Promise<boolean> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK_NAME);
  if (isRegistered) {
    console.log('✅ Background location task already registered.');
    return true;
  }

  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    console.warn('Foreground location permission denied.');
    return false;
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    console.warn('Background location permission denied.');
    return false;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15 * 60 * 1000, // 15 minutes
    distanceInterval: 500,        // >500m movement threshold
    deferredUpdatesInterval: 15 * 60 * 1000,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'NER-Landslide GIS Monitoring Active',
      notificationBody: 'Protecting your area with early landslide risk detection.',
      notificationColor: '#0284c7'
    }
  });

  console.log('✅ Started periodic background location monitoring (15 min / 500m threshold).');
  return true;
}

export async function stopBackgroundLocationTracking() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    console.log('⏹️ Stopped background location tracking.');
  }
}
