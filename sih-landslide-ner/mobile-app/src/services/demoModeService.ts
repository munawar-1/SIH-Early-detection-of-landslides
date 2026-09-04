import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEMO_MODE_STORAGE_KEY = '@ner_landslide_demo_mode';

type DemoModeListener = (enabled: boolean) => void;
const listeners = new Set<DemoModeListener>();

let cachedDemoMode: boolean | null = null;

/**
 * Gets the current Demo Mode state. Persisted in AsyncStorage.
 * Default is false (Live/Production Mode).
 */
export async function getDemoMode(): Promise<boolean> {
  if (cachedDemoMode !== null) {
    return cachedDemoMode;
  }
  try {
    const val = await AsyncStorage.getItem(DEMO_MODE_STORAGE_KEY);
    cachedDemoMode = val === 'true';
    return cachedDemoMode;
  } catch (err) {
    console.warn('Failed to read demo mode from storage:', err);
    return false;
  }
}

/**
 * Sets the Demo Mode state and notifies all active subscribers.
 */
export async function setDemoMode(enabled: boolean): Promise<void> {
  try {
    cachedDemoMode = enabled;
    await AsyncStorage.setItem(DEMO_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
    listeners.forEach(cb => {
      try {
        cb(enabled);
      } catch (e) {
        console.warn('Error in demo mode listener:', e);
      }
    });
  } catch (err) {
    console.warn('Failed to save demo mode to storage:', err);
  }
}

/**
 * Toggles the Demo Mode state. Returns the new state.
 */
export async function toggleDemoMode(): Promise<boolean> {
  const current = await getDemoMode();
  const next = !current;
  await setDemoMode(next);
  return next;
}

/**
 * Subscribe to Demo Mode changes across the app.
 */
export function subscribeDemoMode(callback: DemoModeListener): () => void {
  listeners.add(callback);
  // Call immediately with current cached value if available
  if (cachedDemoMode !== null) {
    callback(cachedDemoMode);
  } else {
    getDemoMode().then(val => callback(val));
  }
  return () => {
    listeners.delete(callback);
  };
}
