/**
 * ha-ble-livemap - History Store
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * Stores position history in IndexedDB to avoid filling the HA database.
 * Automatically purges old entries based on retention settings.
 *
 * Optimizations:
 * - Batch writes: points are buffered in memory and flushed to IndexedDB
 *   every FLUSH_INTERVAL_MS to reduce transaction overhead.
 * - Periodic purge: old entries are cleaned up every PURGE_INTERVAL_MS
 *   (not just on init) to prevent unbounded growth during long sessions.
 */

import { HistoryPoint } from "./types";

const DB_NAME = "ble-livemap-history";
const DB_VERSION = 1;
const STORE_NAME = "positions";

/** How often to flush buffered points to IndexedDB (ms) */
const FLUSH_INTERVAL_MS = 10_000; // 10 seconds

/** How often to purge old entries from IndexedDB (ms) */
const PURGE_INTERVAL_MS = 3_600_000; // 1 hour

export class HistoryStore {
  private db: IDBDatabase | null = null;
  private memoryCache: Map<string, HistoryPoint[]> = new Map();
  private maxRetentionMs: number;
  private maxTrailLength: number;

  // Batch write buffer
  private writeBuffer: { deviceId: string; point: HistoryPoint }[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private purgeTimer: ReturnType<typeof setInterval> | null = null;

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
          this.startTimers();
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

  /**
   * Start periodic flush and purge timers.
   */
  private startTimers(): void {
    // Periodic flush of write buffer to IndexedDB
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => this.flushBuffer(), FLUSH_INTERVAL_MS);
    }

    // Periodic purge of old entries
    if (!this.purgeTimer) {
      this.purgeTimer = setInterval(() => this.purgeOldEntries(), PURGE_INTERVAL_MS);
    }
  }

  /**
   * Stop timers (call when the store is no longer needed).
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
    // Final flush
    this.flushBuffer();
  }

  /**
   * Add a point to the history.
   * The point is immediately added to the in-memory cache and buffered
   * for batch writing to IndexedDB.
   */
  addPoint(deviceId: string, point: HistoryPoint): void {
    // Always update memory cache immediately
    if (!this.memoryCache.has(deviceId)) {
      this.memoryCache.set(deviceId, []);
    }
    const cache = this.memoryCache.get(deviceId)!;
    cache.push(point);

    // Trim memory cache to max trail length
    while (cache.length > this.maxTrailLength) {
      cache.shift();
    }

    // Buffer for batch write to IndexedDB
    if (this.db) {
      this.writeBuffer.push({ deviceId, point });
    }
  }

  /**
   * Flush the write buffer to IndexedDB in a single transaction.
   */
  private flushBuffer(): void {
    if (!this.db || this.writeBuffer.length === 0) return;

    try {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      for (const { deviceId, point } of this.writeBuffer) {
        store.add({ deviceId, ...point });
      }

      this.writeBuffer = [];
    } catch {
      // Silently fail - memory cache is the fallback
      // Don't clear the buffer so we can retry next flush
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
    this.writeBuffer = [];
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
