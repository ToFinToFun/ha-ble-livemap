/**
 * ha-ble-livemap - History Store
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * Stores position history in IndexedDB to avoid filling the HA database.
 * Automatically purges old entries based on retention settings.
 */

import { HistoryPoint } from "./types";

const DB_NAME = "ble-livemap-history";
const DB_VERSION = 1;
const STORE_NAME = "positions";

export class HistoryStore {
  private db: IDBDatabase | null = null;
  private memoryCache: Map<string, HistoryPoint[]> = new Map();
  private maxRetentionMs: number;
  private maxTrailLength: number;

  constructor(retentionMinutes: number = 60, maxTrailLength: number = 50) {
    this.maxRetentionMs = retentionMinutes * 60 * 1000;
    this.maxTrailLength = maxTrailLength;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { autoIncrement: true });
            store.createIndex("deviceId", "deviceId", { unique: false });
            store.createIndex("timestamp", "timestamp", { unique: false });
            store.createIndex("deviceTimestamp", ["deviceId", "timestamp"], { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.purgeOldEntries();
          resolve();
        };

        request.onerror = () => {
          // IndexedDB not available, use memory-only mode
          console.warn("[ble-livemap] IndexedDB not available, using memory-only history");
          resolve();
        };
      } catch {
        console.warn("[ble-livemap] IndexedDB not supported, using memory-only history");
        resolve();
      }
    });
  }

  async addPoint(deviceId: string, point: HistoryPoint): Promise<void> {
    // Always update memory cache
    if (!this.memoryCache.has(deviceId)) {
      this.memoryCache.set(deviceId, []);
    }
    const cache = this.memoryCache.get(deviceId)!;
    cache.push(point);

    // Trim memory cache
    while (cache.length > this.maxTrailLength) {
      cache.shift();
    }

    // Persist to IndexedDB if available
    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.add({ deviceId, ...point });
      } catch {
        // Silently fail - memory cache is the fallback
      }
    }
  }

  getTrail(deviceId: string): HistoryPoint[] {
    return this.memoryCache.get(deviceId) || [];
  }

  async loadHistory(deviceId: string): Promise<HistoryPoint[]> {
    if (!this.db) {
      return this.memoryCache.get(deviceId) || [];
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("deviceTimestamp");
        const cutoff = Date.now() - this.maxRetentionMs;
        const range = IDBKeyRange.bound([deviceId, cutoff], [deviceId, Infinity]);
        const request = index.getAll(range);

        request.onsuccess = () => {
          const results = (request.result || []).map((r: any) => ({
            x: r.x,
            y: r.y,
            timestamp: r.timestamp,
            floor_id: r.floor_id,
          }));

          // Update memory cache
          this.memoryCache.set(deviceId, results.slice(-this.maxTrailLength));
          resolve(results);
        };

        request.onerror = () => {
          resolve(this.memoryCache.get(deviceId) || []);
        };
      } catch {
        resolve(this.memoryCache.get(deviceId) || []);
      }
    });
  }

  private async purgeOldEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const cutoff = Date.now() - this.maxRetentionMs;
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch {
      // Silently fail
    }
  }

  updateSettings(retentionMinutes: number, maxTrailLength: number): void {
    this.maxRetentionMs = retentionMinutes * 60 * 1000;
    this.maxTrailLength = maxTrailLength;
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
      } catch {
        // Silently fail
      }
    }
  }
}
