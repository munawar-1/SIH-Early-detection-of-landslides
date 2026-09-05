import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACTIVE_COORD_KEY = 'active_pitch_coordinate';
export const MONITOR_COORD_KEY = 'monitor_active_coordinate';

export interface ActiveCoordinate {
  latitude: number;
  longitude: number;
  locationName: string;
  accuracy?: number | null;
  isCustom?: boolean;
  source?: 'MONITOR_ASSESSMENT' | 'GPS_DEVICE' | 'FALLBACK';
}

/**
 * Persist the current active monitor coordinates so other tabs (Upload, SOS)
 * immediately inherit the exact coordinates and location without re-querying GPS.
 */
export async function setActiveMonitorCoordinate(coord: ActiveCoordinate): Promise<void> {
  try {
    await AsyncStorage.setItem(MONITOR_COORD_KEY, JSON.stringify(coord));
  } catch (err) {
    console.warn('Could not persist monitor active coordinate:', err);
  }
}

/**
 * Retrieve the active coordinate currently in effect on the Monitor page.
 * Prioritizes active custom/assessment coordinates, then cached monitor GPS, then default fallback.
 */
export async function getActiveMonitorCoordinate(): Promise<ActiveCoordinate> {
  try {
    // 1. Check if user set a custom assessment coordinate (Pitch Studio / Enter Coords)
    const activePitch = await AsyncStorage.getItem(ACTIVE_COORD_KEY);
    if (activePitch) {
      const parsed = JSON.parse(activePitch);
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return {
          latitude: parsed.lat,
          longitude: parsed.lng,
          locationName: parsed.name || parsed.district || `${parsed.lat.toFixed(3)}°N, ${parsed.lng.toFixed(3)}°E`,
          accuracy: 5,
          isCustom: true,
          source: 'MONITOR_ASSESSMENT'
        };
      }
    }

    // 2. Check cached active coordinate from Monitor screen
    const monitorCoord = await AsyncStorage.getItem(MONITOR_COORD_KEY);
    if (monitorCoord) {
      const parsed: ActiveCoordinate = JSON.parse(monitorCoord);
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading active monitor coordinate:', err);
  }

  // 3. Fallback default Dima Hasao regional coordinate
  return {
    latitude: 25.180,
    longitude: 92.760,
    locationName: 'Dima Hasao Sector (Haflong)',
    accuracy: 10,
    isCustom: false,
    source: 'FALLBACK'
  };
}
