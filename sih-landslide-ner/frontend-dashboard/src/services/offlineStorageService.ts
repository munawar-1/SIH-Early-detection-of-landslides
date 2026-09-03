import type { GridPoint } from '../types/landslide';

const DB_NAME = 'LandslideGisOfflineDB';
const DB_VERSION = 2;
const STORE_GRID_POINTS = 'grid_points';
const STORE_METADATA = 'sync_metadata';
const STORE_SMS_LOGS = 'sms_logs';

export interface SyncMetadata {
  key: string;
  value: any;
  timestamp: string;
}

export interface SmsLogEntry {
  id: string;
  timestamp: string;
  recipientGroup: string;
  phoneNumbersCount: number;
  threatLevel: 'WATCH' | 'WARNING' | 'RED_ALERT';
  language: 'en' | 'as' | 'bn' | 'dimasa';
  messageText: string;
  deliveryStatus: 'DELIVERED' | 'DISPATCHED_GSM' | 'PENDING_OFFLINE_SYNC';
  gateway: 'Twilio Cloud' | 'Fast2SMS' | 'NIC GSM Edge Modem';
  latencyMs: number;
}

/**
 * Initializes and opens the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_GRID_POINTS)) {
        db.createObjectStore(STORE_GRID_POINTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_SMS_LOGS)) {
        db.createObjectStore(STORE_SMS_LOGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save all grid points to IndexedDB for offline access
 */
export async function saveGridPointsToCache(points: GridPoint[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_GRID_POINTS, STORE_METADATA], 'readwrite');
    const pointStore = tx.objectStore(STORE_GRID_POINTS);
    const metaStore = tx.objectStore(STORE_METADATA);

    // Clear existing cached points and insert updated ones
    pointStore.clear();
    for (const point of points) {
      pointStore.put(point);
    }

    // Save sync metadata
    metaStore.put({
      key: 'last_sync_timestamp',
      value: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
    metaStore.put({
      key: 'cached_points_count',
      value: points.length,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('⚠️ Could not save grid points to IndexedDB cache:', err);
  }
}

/**
 * Retrieve cached grid points from IndexedDB
 */
export async function getCachedGridPoints(): Promise<GridPoint[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_GRID_POINTS, 'readonly');
    const store = tx.objectStore(STORE_GRID_POINTS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const points = (request.result as GridPoint[]) || [];
        if (points.length > 0 && points.some(p => p.elevation > 1670)) {
          console.info('Purging obsolete synthetic IndexedDB cache.');
          resolve([]);
          return;
        }
        resolve(points);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('⚠️ Could not load grid points from IndexedDB:', err);
    return [];
  }
}

/**
 * Get sync metadata (last synced time and cached count)
 */
export async function getSyncMetadata(): Promise<{ lastSync: string | null; count: number }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METADATA, 'readonly');
    const store = tx.objectStore(STORE_METADATA);

    const lastSyncReq = store.get('last_sync_timestamp');
    const countReq = store.get('cached_points_count');

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        resolve({
          lastSync: lastSyncReq.result ? lastSyncReq.result.value : null,
          count: countReq.result ? countReq.result.value : 0
        });
      };
      tx.onerror = () => resolve({ lastSync: null, count: 0 });
    });
  } catch (err) {
    return { lastSync: null, count: 0 };
  }
}

/**
 * Save an SMS dispatch log entry into local IndexedDB
 */
export async function saveSmsLog(entry: SmsLogEntry): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SMS_LOGS, 'readwrite');
    const store = tx.objectStore(STORE_SMS_LOGS);
    store.put(entry);
  } catch (err) {
    console.warn('⚠️ Could not save SMS log to IndexedDB:', err);
  }
}

/**
 * Get recent SMS logs from IndexedDB
 */
export async function getRecentSmsLogs(): Promise<SmsLogEntry[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SMS_LOGS, 'readonly');
    const store = tx.objectStore(STORE_SMS_LOGS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const logs = (request.result as SmsLogEntry[] || []).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(logs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return [];
  }
}
