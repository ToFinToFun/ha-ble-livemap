/**
 * ha-ble-livemap - BLE LiveMap Card for Home Assistant
 * Real-time BLE device position tracking on your floor plan.
 *
 * Author: Jerry Paasovaara
 * License: MIT
 * Version: 1.7.0
 */

import { LitElement, html, css, PropertyValues, nothing, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  BLELivemapConfig,
  HomeAssistant,
  DeviceState,
  ProxyConfig,
  ZoneConfig,
  DoorConfig,
  ProxyDistance,
  DevicePosition,
  FloorConfig,
  DEFAULT_CONFIG,
  DEVICE_COLORS,
} from "./types";
import { CARD_VERSION, CARD_NAME, CARD_EDITOR_NAME } from "./const";
import { trilaterate, smoothPosition } from "./trilateration";
import { render as renderCanvas, cleanupAnimations } from "./renderer";
import { HistoryStore } from "./history-store";
import { localize } from "./localize/localize";

// Register the card with HA
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: CARD_NAME,
  name: "BLE LiveMap",
  description: "Real-time BLE device position tracking on your floor plan",
  preview: true,
  documentationURL: "https://github.com/ToFinToFun/ha-ble-livemap",
});

console.info(
  `%c BLE-LIVEMAP %c v${CARD_VERSION} `,
  "color: white; background: #4FC3F7; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: #4FC3F7; background: #263238; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

// ─── Cache-busting: clear Service Worker cache on version change ─────────
const CACHE_VERSION_KEY = "ble-livemap-version";
const CACHE_BUST_KEY = "ble-livemap-cache-busted";
const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);

/**
 * Robust cache invalidation for Home Assistant.
 * HA uses a Service Worker with Cache Storage ("file-cache") that
 * aggressively caches JS files. Ctrl+Shift+R does NOT clear this.
 * We must programmatically delete our cached entries.
 */
async function bustCache(): Promise<void> {
  const bustKey = `${CACHE_VERSION_KEY}-${CARD_VERSION}`;
  if (localStorage.getItem(CACHE_BUST_KEY) === bustKey) return; // Already busted for this version

  try {
    // 1. Clear from Service Worker Cache Storage
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        for (const request of requests) {
          if (request.url.includes("ble-livemap")) {
            await cache.delete(request);
            console.info(`[BLE LiveMap] Cleared cache entry: ${request.url} from ${name}`);
          }
        }
      }
    }

    // 2. Unregister and re-register service workers to force refresh
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        // Tell the SW to update - this will pick up new cached files
        await reg.update();
      }
    }

    localStorage.setItem(CACHE_BUST_KEY, bustKey);
    console.info(`[BLE LiveMap] Cache busted for v${CARD_VERSION}`);
  } catch (err) {
    console.warn("[BLE LiveMap] Cache busting failed:", err);
  }
}

if (storedVersion && storedVersion !== CARD_VERSION) {
  console.info(`[BLE LiveMap] Version changed: ${storedVersion} -> ${CARD_VERSION}, clearing caches...`);
  bustCache().then(() => {
    // After cache bust, reload the page once to pick up new code
    const reloadKey = `ble-livemap-reloaded-${CARD_VERSION}`;
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, "1");
      console.info("[BLE LiveMap] Reloading page to apply update...");
      window.location.reload();
    }
  });
} else if (!storedVersion) {
  // First install - just bust cache silently
  bustCache();
}
localStorage.setItem(CACHE_VERSION_KEY, CARD_VERSION);

/** Per-device floor tracking state for gateway logic */
interface DeviceFloorState {
  current_floor_id: string;
  last_gateway_passage: number; // timestamp of last gateway detection
  last_gateway_floor: string | null; // floor the gateway connects to
  override_start: number; // timestamp when soft override started counting
  override_candidate_floor: string | null; // floor being considered for soft override
}

/** Per-device zone tracking state for room connectivity */
interface DeviceZoneState {
  current_zone_id: string | null;
  last_door_passage: number; // timestamp of last door approach detection
  last_door_target_zone: string | null; // zone the door connects to
  override_start: number; // timestamp when soft zone override started
  override_candidate_zone: string | null; // zone being considered for soft override
  approaching_door: string | null; // door_id being approached
  prev_distance_to_door: number | null; // previous distance to the approaching door's nearest proxy
}

@customElement(CARD_NAME)
export class BLELivemapCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: BLELivemapConfig;
  @state() private _devices: DeviceState[] = [];
  @state() private _activeFloor: string | null = null;
  @state() private _isFullscreen = false;
  @state() private _imageLoaded: { [floorId: string]: boolean } = {};
  @state() private _imageError: { [floorId: string]: boolean } = {};
  @state() private _showDevicePanel = false;
  @state() private _runtimeShowProxies: boolean | null = null;
  @state() private _runtimeShowZones: boolean | null = null;
  @state() private _runtimeShowZoneLabels: boolean | null = null;
  @state() private _showSetupDialog = false;

  private _canvases: Map<string, HTMLCanvasElement> = new Map();
  private _images: Map<string, HTMLImageElement> = new Map();
  private _historyStore: HistoryStore | null = null;
  private _animationFrame: number | null = null;
  private _updateTimer: number | null = null;
  private _previousPositions: Map<string, DevicePosition> = new Map();
  private _lang = "en";
  private _resizeObserver: ResizeObserver | null = null;

  // Gateway transition state per device
  private _deviceFloorState: Map<string, DeviceFloorState> = new Map();

  // Zone connectivity state per device
  private _deviceZoneState: Map<string, DeviceZoneState> = new Map();
  @state() private _runtimeShowDoors: boolean | null = null;

  // ─── Lifecycle ──────────────────────────────────────────────

  static getConfigElement() {
    return document.createElement(CARD_EDITOR_NAME);
  }

  static getStubConfig() {
    return {
      type: `custom:${CARD_NAME}`,
      floorplan_image: "",
      tracked_devices: [],
      proxies: [],
    };
  }

  setConfig(config: BLELivemapConfig): void {
    this._config = { ...DEFAULT_CONFIG, ...config };

    if (this._config.history_enabled) {
      this._historyStore = new HistoryStore(
        this._config.history_retention || 60,
        this._config.history_trail_length || 50
      );
    }

    const floors = this._getFloors();
    if (floors.length > 0 && !this._activeFloor) {
      this._activeFloor = config.active_floor || floors[0].id;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._startUpdateLoop();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopUpdateLoop();
    this._stopRenderLoop();
    this._resizeObserver?.disconnect();
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._setupResizeObserver();
    this._startRenderLoop();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("hass") && this.hass) {
      this._lang = this.hass.selectedLanguage || this.hass.language || "en";
    }

    // Update canvas/image references after render
    this._updateCanvasRefs();
  }

  getCardSize(): number {
    return 6;
  }

  // ─── Gateway Transition Logic ─────────────────────────────

  /**
   * Determine which floor a device should be on based on gateway logic.
   * 
   * Rules:
   * 1. If device passes through a gateway proxy → immediate floor transition
   * 2. If no gateway passage but consistent signals from another floor for
   *    floor_override_timeout seconds → soft override (allow transition)
   * 3. Manual reset always available
   */
  private _resolveDeviceFloor(
    deviceId: string,
    distances: ProxyDistance[],
    proxies: ProxyConfig[]
  ): string | null {
    const floors = this._getFloors();
    if (floors.length <= 1) return floors[0]?.id || null;

    const now = Date.now();
    const gatewayTimeout = (this._config.gateway_timeout || 30) * 1000;
    const overrideTimeout = (this._config.floor_override_timeout || 60) * 1000;
    const overrideMinProxies = this._config.floor_override_min_proxies || 2;

    // Get or create floor state for this device
    let floorState = this._deviceFloorState.get(deviceId);
    if (!floorState) {
      floorState = {
        current_floor_id: floors[0].id,
        last_gateway_passage: 0,
        last_gateway_floor: null,
        override_start: 0,
        override_candidate_floor: null,
      };
      this._deviceFloorState.set(deviceId, floorState);
    }

    // Count how many proxies on each floor see this device
    const floorProxyCounts: Map<string, number> = new Map();
    const floorMinDistances: Map<string, number> = new Map();

    for (const dist of distances) {
      const proxy = proxies.find((p) => p.entity_id === dist.proxy_entity_id);
      if (!proxy || !proxy.floor_id) continue;

      const floorId = proxy.floor_id;
      floorProxyCounts.set(floorId, (floorProxyCounts.get(floorId) || 0) + 1);

      const currentMin = floorMinDistances.get(floorId) || Infinity;
      if (dist.distance < currentMin) {
        floorMinDistances.set(floorId, dist.distance);
      }

      // Check if this is a gateway proxy that sees the device
      if (proxy.is_gateway && proxy.gateway_connects && proxy.gateway_connects.length > 0) {
        // Gateway detected! Check if it connects to a different floor
        for (const connectedFloor of proxy.gateway_connects) {
          if (connectedFloor !== floorState.current_floor_id) {
            floorState.last_gateway_passage = now;
            floorState.last_gateway_floor = connectedFloor;
          }
        }
      }
    }

    // Rule 1: Gateway passage → immediate transition
    if (
      floorState.last_gateway_floor &&
      (now - floorState.last_gateway_passage) < gatewayTimeout
    ) {
      const targetFloor = floorState.last_gateway_floor;
      // Verify the target floor actually exists
      if (floors.some((f) => f.id === targetFloor)) {
        floorState.current_floor_id = targetFloor;
        floorState.last_gateway_floor = null; // consumed
        floorState.override_start = 0;
        floorState.override_candidate_floor = null;
        return targetFloor;
      }
    }

    // Rule 2: Soft override — check if signals consistently point to another floor
    // Find the floor with the most proxies seeing the device
    let bestFloor = floorState.current_floor_id;
    let bestCount = floorProxyCounts.get(bestFloor) || 0;

    for (const [floorId, count] of floorProxyCounts) {
      if (floorId !== floorState.current_floor_id && count > bestCount) {
        bestFloor = floorId;
        bestCount = count;
      }
    }

    // If a different floor has more proxies seeing the device (and meets minimum)
    if (bestFloor !== floorState.current_floor_id && bestCount >= overrideMinProxies) {
      // Check if current floor has fewer or zero proxies seeing the device
      const currentFloorCount = floorProxyCounts.get(floorState.current_floor_id) || 0;

      if (bestCount > currentFloorCount) {
        // Start or continue override timer
        if (floorState.override_candidate_floor === bestFloor) {
          // Same candidate — check if timeout has elapsed
          if ((now - floorState.override_start) >= overrideTimeout) {
            // Soft override: transition without gateway
            floorState.current_floor_id = bestFloor;
            floorState.override_start = 0;
            floorState.override_candidate_floor = null;
            return bestFloor;
          }
        } else {
          // New candidate — start timer
          floorState.override_candidate_floor = bestFloor;
          floorState.override_start = now;
        }
      }
    } else {
      // Reset override timer if signals no longer point elsewhere
      floorState.override_start = 0;
      floorState.override_candidate_floor = null;
    }

    return floorState.current_floor_id;
  }

  // ─── Zone Connectivity Logic ─────────────────────────────

  /**
   * Check if a point (in % coords) is inside a zone polygon.
   */
  private _pointInZone(px: number, py: number, zone: ZoneConfig): boolean {
    const pts = zone.points;
    if (!pts || pts.length < 3) return false;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Find which zone a position falls into.
   */
  private _findZoneForPosition(x: number, y: number, floorId: string | null): string | null {
    const zones = this._config.zones || [];
    for (const zone of zones) {
      if (floorId && zone.floor_id && zone.floor_id !== floorId) continue;
      if (this._pointInZone(x, y, zone)) return zone.id;
    }
    return null;
  }

  /**
   * Get all doors that connect to a given zone.
   */
  private _getDoorsForZone(zoneId: string): DoorConfig[] {
    return (this._config.doors || []).filter(
      (d) => d.zone_a === zoneId || d.zone_b === zoneId
    );
  }

  /**
   * Check if two zones are directly connected by a door.
   */
  private _zonesConnected(zoneA: string, zoneB: string): DoorConfig | null {
    return (this._config.doors || []).find(
      (d) =>
        (d.zone_a === zoneA && d.zone_b === zoneB) ||
        (d.zone_a === zoneB && d.zone_b === zoneA)
    ) || null;
  }

  /**
   * BFS to check if there's any path from zoneA to zoneB through doors.
   * Returns the path length (number of doors to traverse), or -1 if unreachable.
   */
  private _findZonePath(zoneA: string, zoneB: string): number {
    if (zoneA === zoneB) return 0;
    const doors = this._config.doors || [];
    if (doors.length === 0) return -1;

    // Build adjacency list
    const adj: Map<string, Set<string>> = new Map();
    for (const door of doors) {
      if (!door.zone_a || !door.zone_b) continue;
      if (!adj.has(door.zone_a)) adj.set(door.zone_a, new Set());
      if (!adj.has(door.zone_b)) adj.set(door.zone_b, new Set());
      adj.get(door.zone_a)!.add(door.zone_b);
      adj.get(door.zone_b)!.add(door.zone_a);
    }

    // BFS
    const visited = new Set<string>([zoneA]);
    const queue: { zone: string; dist: number }[] = [{ zone: zoneA, dist: 0 }];
    while (queue.length > 0) {
      const { zone, dist } = queue.shift()!;
      const neighbors = adj.get(zone);
      if (!neighbors) continue;
      for (const next of neighbors) {
        if (next === zoneB) return dist + 1;
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ zone: next, dist: dist + 1 });
        }
      }
    }
    return -1; // unreachable
  }

  /**
   * Resolve which zone a device should be in, respecting door connectivity.
   *
   * Rules:
   * 1. If the device's trilateral position is in a zone directly connected
   *    to the current zone via a door → allow transition
   * 2. If the position is in a non-adjacent zone, block the transition
   *    unless the soft override timeout has elapsed
   * 3. If no doors are configured, fall back to simple zone detection
   */
  private _resolveDeviceZone(
    deviceId: string,
    position: { x: number; y: number },
    floorId: string | null
  ): string | null {
    const zones = this._config.zones || [];
    const doors = this._config.doors || [];
    if (zones.length === 0) return null;

    // If no doors configured, just return the zone the position is in
    if (doors.length === 0) {
      return this._findZoneForPosition(position.x, position.y, floorId);
    }

    const now = Date.now();
    const overrideTimeout = (this._config.zone_override_timeout || 45) * 1000;

    // Get or create zone state
    let zoneState = this._deviceZoneState.get(deviceId);
    if (!zoneState) {
      // Initialize: find current zone from position
      const initialZone = this._findZoneForPosition(position.x, position.y, floorId);
      zoneState = {
        current_zone_id: initialZone,
        last_door_passage: 0,
        last_door_target_zone: null,
        override_start: 0,
        override_candidate_zone: null,
        approaching_door: null,
        prev_distance_to_door: null,
      };
      this._deviceZoneState.set(deviceId, zoneState);
      return initialZone;
    }

    // Find which zone the trilateral position is in
    const positionZone = this._findZoneForPosition(position.x, position.y, floorId);

    // If position is in the current zone, no transition needed
    if (!positionZone || positionZone === zoneState.current_zone_id) {
      zoneState.override_start = 0;
      zoneState.override_candidate_zone = null;
      return zoneState.current_zone_id;
    }

    // Position is in a different zone — check if transition is allowed
    const currentZone = zoneState.current_zone_id;

    if (!currentZone) {
      // No current zone — just accept the new one
      zoneState.current_zone_id = positionZone;
      return positionZone;
    }

    // Check if the zones are directly connected by a door
    const connectingDoor = this._zonesConnected(currentZone, positionZone);

    if (connectingDoor) {
      // Direct connection exists — allow transition
      // Check if device is near the door (within reasonable distance)
      const doorDist = Math.sqrt(
        Math.pow(position.x - connectingDoor.x, 2) +
        Math.pow(position.y - connectingDoor.y, 2)
      );

      // If device is within 15% of map size from the door, or has been
      // consistently in the new zone, allow transition
      if (doorDist < 15 || (now - (zoneState.override_start || now)) > 5000) {
        zoneState.current_zone_id = positionZone;
        zoneState.override_start = 0;
        zoneState.override_candidate_zone = null;
        zoneState.approaching_door = null;
        return positionZone;
      }

      // Start approach timer
      if (zoneState.override_candidate_zone !== positionZone) {
        zoneState.override_candidate_zone = positionZone;
        zoneState.override_start = now;
      }
      return zoneState.current_zone_id;
    }

    // Zones are NOT directly connected — check for path
    const pathLen = this._findZonePath(currentZone, positionZone);

    if (pathLen > 0 && pathLen <= 3) {
      // Reachable through a short path — use longer timeout
      // (device might be passing through intermediate rooms quickly)
      if (zoneState.override_candidate_zone === positionZone) {
        if ((now - zoneState.override_start) >= overrideTimeout * 0.5) {
          // Allow after half the timeout for short paths
          zoneState.current_zone_id = positionZone;
          zoneState.override_start = 0;
          zoneState.override_candidate_zone = null;
          return positionZone;
        }
      } else {
        zoneState.override_candidate_zone = positionZone;
        zoneState.override_start = now;
      }
    } else {
      // Not connected or very long path — use full timeout (wall blocking)
      if (zoneState.override_candidate_zone === positionZone) {
        if ((now - zoneState.override_start) >= overrideTimeout) {
          // Soft override: allow after full timeout
          zoneState.current_zone_id = positionZone;
          zoneState.override_start = 0;
          zoneState.override_candidate_zone = null;
          return positionZone;
        }
      } else {
        zoneState.override_candidate_zone = positionZone;
        zoneState.override_start = now;
      }
    }

    // Block transition — stay in current zone
    return zoneState.current_zone_id;
  }

  /**
   * Get doors for a specific floor.
   */
  private _getDoorsForFloor(floorId: string): DoorConfig[] {
    return (this._config.doors || []).filter(
      (d) => !d.floor_id || d.floor_id === floorId
    );
  }

  // ─── Data Update ───────────────────────────────────────────

  private _startUpdateLoop(): void {
    const interval = (this._config?.update_interval || 2) * 1000;
    this._updateTimer = window.setInterval(() => this._updateDevices(), interval);
    this._updateDevices();
  }

  private _stopUpdateLoop(): void {
    if (this._updateTimer) {
      clearInterval(this._updateTimer);
      this._updateTimer = null;
    }
  }

  private _updateDevices(): void {
    if (!this.hass || !this._config?.tracked_devices) return;

    const devices: DeviceState[] = [];
    const proxies = this._getAllProxies();
    const floors = this._getFloors();
    const hasMultipleFloors = floors.length > 1;

    for (const deviceConfig of this._config.tracked_devices) {
      const distances = this._getDeviceDistances(deviceConfig, proxies);
      let position: DevicePosition | null = null;

      const deviceId = deviceConfig.entity_prefix || deviceConfig.bermuda_device_id || "";

      if (distances.length >= 1) {
        const proxyMap = new Map<string, { x: number; y: number }>();

        // Resolve which floor this device should be on
        let resolvedFloorId: string | null = null;

        if (hasMultipleFloors) {
          resolvedFloorId = this._resolveDeviceFloor(deviceId, distances, proxies);
        }

        // Only use proxies on the resolved floor for trilateration
        for (const d of distances) {
          const proxy = proxies.find((p) => p.entity_id === d.proxy_entity_id);
          if (proxy) {
            // If we have a resolved floor, only use proxies on that floor
            if (resolvedFloorId && proxy.floor_id && proxy.floor_id !== resolvedFloorId) {
              continue;
            }
            proxyMap.set(d.proxy_entity_id, { x: proxy.x, y: proxy.y });
          }
        }

        if (proxyMap.size >= 1) {
          // Use the resolved floor's dimensions
          let imageWidth = 20;
          let imageHeight = 15;
          if (resolvedFloorId) {
            const floor = floors.find((f) => f.id === resolvedFloorId);
            if (floor) {
              imageWidth = floor.image_width || 20;
              imageHeight = floor.image_height || 15;
            }
          } else {
            const floor = floors[0];
            imageWidth = floor?.image_width || 20;
            imageHeight = floor?.image_height || 15;
          }

          const result = trilaterate(proxyMap, distances, 100, 100, imageWidth, imageHeight);

          if (result) {
            const prevKey = deviceConfig.entity_prefix || "";
            const prevPos = this._previousPositions.get(prevKey);
            const prevResult = prevPos
              ? { x: prevPos.x, y: prevPos.y, accuracy: prevPos.accuracy, confidence: prevPos.confidence }
              : null;
            const smoothed = smoothPosition(result, prevResult, 0.3);

            if (smoothed) {
              position = {
                x: smoothed.x,
                y: smoothed.y,
                accuracy: smoothed.accuracy,
                confidence: smoothed.confidence,
                timestamp: Date.now(),
                floor_id: resolvedFloorId || undefined,
              };

              this._previousPositions.set(prevKey, position);
            }
          }
        }
      }

      // Resolve zone using door connectivity
      if (position && (this._config.doors?.length || 0) > 0) {
        const resolvedZone = this._resolveDeviceZone(
          deviceId,
          { x: position.x, y: position.y },
          position.floor_id || null
        );
        // If zone connectivity blocks the move, constrain position
        // to the nearest point inside the allowed zone
        if (resolvedZone) {
          const posZone = this._findZoneForPosition(
            position.x, position.y, position.floor_id || null
          );
          if (posZone && posZone !== resolvedZone) {
            // Position is in a blocked zone - keep the previous position
            const prevKey = deviceConfig.entity_prefix || "";
            const prevPos = this._previousPositions.get(prevKey);
            if (prevPos) {
              position = { ...position, x: prevPos.x, y: prevPos.y };
              this._previousPositions.set(prevKey, position);
            }
          }
        }
      }

      // Find nearest proxy
      let nearestProxy: string | null = null;
      if (distances.length > 0) {
        const nearest = distances.reduce((a, b) => (a.distance < b.distance ? a : b));
        const proxy = proxies.find((p) => p.entity_id === nearest.proxy_entity_id);
        nearestProxy = proxy?.name || proxy?.entity_id || null;
      }

      // Get history
      let history = this._historyStore?.getTrail(deviceId) || [];
      if (position && this._historyStore) {
        this._historyStore.addPoint(deviceId, {
          x: position.x,
          y: position.y,
          timestamp: position.timestamp,
          floor_id: position.floor_id,
        });
        history = this._historyStore.getTrail(deviceId);
      }

      // Get current floor from floor state
      const floorState = this._deviceFloorState.get(deviceId);

      devices.push({
        device_id: deviceId,
        name: deviceConfig.name,
        position,
        history,
        distances,
        nearest_proxy: nearestProxy,
        area: null,
        last_seen: position ? Date.now() : 0,
        config: deviceConfig,
        current_floor_id: floorState?.current_floor_id || undefined,
      });
    }

    this._devices = devices;
    cleanupAnimations(devices.map((d) => d.device_id));
  }

  private _getDeviceDistances(deviceConfig: any, proxies: ProxyConfig[]): ProxyDistance[] {
    if (!this.hass) return [];

    const prefix = deviceConfig.entity_prefix;
    const distances: ProxyDistance[] = [];

    // Strategy 1: Individual distance sensors per proxy
    if (prefix) {
      for (const proxy of proxies) {
        const proxyName = proxy.entity_id.replace(/^.*\./, "").replace(/_proxy$/, "");
        const possibleEntities = [
          `${prefix}_${proxyName}_distance`,
          `${prefix}_distance_${proxyName}`,
        ];

        for (const entityId of possibleEntities) {
          const state = this.hass.states[entityId];
          if (state && !isNaN(parseFloat(state.state))) {
            let dist = parseFloat(state.state);

            // Apply RSSI calibration if available
            if (proxy.calibration?.ref_rssi !== undefined && state.attributes?.rssi) {
              const calibratedDist = this._applyCalibration(
                state.attributes.rssi,
                proxy.calibration
              );
              if (calibratedDist !== null) {
                dist = calibratedDist;
              }
            }

            const attrs = state.attributes || {};
            distances.push({
              proxy_entity_id: proxy.entity_id,
              distance: dist,
              rssi: attrs.rssi || -80,
              timestamp: new Date(state.last_updated).getTime(),
            });
            break;
          }
        }
      }
    }

    // Strategy 2: Use the main distance sensor attributes
    if (distances.length === 0 && prefix) {
      const mainEntity = `${prefix}_distance`;
      const mainState = this.hass.states[mainEntity];
      if (mainState) {
        const attrs = mainState.attributes || {};
        if (attrs.scanners) {
          for (const [scannerId, scannerData] of Object.entries(attrs.scanners as Record<string, any>)) {
            const matchingProxy = proxies.find(
              (p) => p.entity_id === scannerId || p.name === scannerData?.name
            );
            if (matchingProxy && scannerData?.distance) {
              distances.push({
                proxy_entity_id: matchingProxy.entity_id,
                distance: scannerData.distance,
                rssi: scannerData.rssi || -80,
                timestamp: Date.now(),
              });
            }
          }
        }
      }
    }

    // Strategy 3: Device tracker entity attributes
    if (distances.length === 0 && prefix) {
      const dtEntity = prefix.replace("sensor.bermuda_", "device_tracker.bermuda_");
      const dtState = this.hass.states[dtEntity];
      if (dtState?.attributes?.scanners) {
        for (const [scannerId, scannerData] of Object.entries(dtState.attributes.scanners as Record<string, any>)) {
          const matchingProxy = proxies.find((p) => p.entity_id === scannerId);
          if (matchingProxy && scannerData?.distance) {
            distances.push({
              proxy_entity_id: matchingProxy.entity_id,
              distance: scannerData.distance,
              rssi: scannerData.rssi || -80,
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    return distances;
  }

  /**
   * Apply per-proxy RSSI calibration to convert RSSI to distance.
   * Uses the log-distance path loss model:
   *   distance = 10^((ref_rssi - measured_rssi) / (10 * n))
   */
  private _applyCalibration(
    measuredRssi: number,
    calibration: { ref_rssi: number; ref_distance: number; attenuation?: number }
  ): number | null {
    if (!calibration || calibration.ref_rssi === undefined) return null;

    const refRssi = calibration.ref_rssi;
    const refDist = calibration.ref_distance || 1.0;
    const n = calibration.attenuation || 2.5; // default path-loss exponent

    // Log-distance path loss model
    const exponent = (refRssi - measuredRssi) / (10 * n);
    const distance = refDist * Math.pow(10, exponent);

    // Clamp to reasonable range
    return Math.max(0.1, Math.min(distance, 50));
  }

  private _findEntity(deviceConfig: any, suffix: string): string | null {
    if (!this.hass || !deviceConfig.entity_prefix) return null;
    const entityId = `${deviceConfig.entity_prefix}_${suffix}`;
    return this.hass.states[entityId] ? entityId : null;
  }

  private _getAllProxies(): ProxyConfig[] {
    if (!this._config) return [];
    const globalProxies = this._config.proxies || [];
    // In stacked mode, combine all floor proxies too
    const floorProxies: ProxyConfig[] = [];
    for (const floor of this._getFloors()) {
      if (floor.proxies) {
        floorProxies.push(...floor.proxies);
      }
    }
    return [...globalProxies, ...floorProxies];
  }

  private _getProxiesForFloor(floorId: string): ProxyConfig[] {
    if (!this._config) return [];
    const globalProxies = (this._config.proxies || []).filter(
      (p) => !p.floor_id || p.floor_id === floorId
    );
    const floor = this._getFloors().find((f) => f.id === floorId);
    const floorProxies = floor?.proxies || [];
    return [...globalProxies, ...floorProxies];
  }

  private _getZonesForFloor(floorId: string): ZoneConfig[] {
    return (this._config.zones || []).filter(
      (z) => !z.floor_id || z.floor_id === floorId
    );
  }

  private _getFloors(): FloorConfig[] {
    const floors = this._config?.floors || [];
    // If no floors defined but floorplan_image exists, create a virtual floor
    if (floors.length === 0 && this._config?.floorplan_image) {
      return [{
        id: "default",
        name: "Floor 1",
        image: this._config.floorplan_image,
        image_width: 20,
        image_height: 15,
      }];
    }
    return floors;
  }

  private _getActiveFloor(): FloorConfig | null {
    const floors = this._getFloors();
    return floors.find((f) => f.id === this._activeFloor) || floors[0] || null;
  }

  private _getFloorplanImage(): string {
    const floor = this._getActiveFloor();
    return floor?.image || this._config?.floorplan_image || "";
  }

  private _isStackedMode(): boolean {
    return this._config?.floor_display_mode === "stacked" && this._getFloors().length > 1;
  }

  // ─── Canvas Rendering ──────────────────────────────────────

  private _updateCanvasRefs(): void {
    const root = this.shadowRoot;
    if (!root) return;

    // Collect all canvas and image elements
    const canvasElements = root.querySelectorAll<HTMLCanvasElement>("canvas[data-floor-id]");
    const imgElements = root.querySelectorAll<HTMLImageElement>("img[data-floor-id]");

    canvasElements.forEach((canvas) => {
      const floorId = canvas.dataset.floorId || "";
      this._canvases.set(floorId, canvas);
    });

    imgElements.forEach((img) => {
      const floorId = img.dataset.floorId || "";
      this._images.set(floorId, img);
    });
  }

  private _setupResizeObserver(): void {
    this._resizeObserver = new ResizeObserver(() => {
      this._resizeAllCanvases();
    });
    const containers = this.shadowRoot?.querySelectorAll(".map-container");
    containers?.forEach((container) => {
      this._resizeObserver!.observe(container);
    });
  }

  private _resizeAllCanvases(): void {
    for (const [floorId, canvas] of this._canvases.entries()) {
      const image = this._images.get(floorId);
      if (!canvas || !image) continue;

      const container = canvas.parentElement;
      if (!container) continue;

      const containerWidth = container.clientWidth;
      if (containerWidth === 0 || !image.naturalWidth || !image.naturalHeight) continue;

      const imgRatio = image.naturalWidth / image.naturalHeight;
      const canvasWidth = containerWidth;
      const canvasHeight = containerWidth / imgRatio;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
    }
  }

  private _startRenderLoop(): void {
    const renderFrame = () => {
      this._renderAllCanvases();
      this._animationFrame = requestAnimationFrame(renderFrame);
    };
    this._animationFrame = requestAnimationFrame(renderFrame);
  }

  private _stopRenderLoop(): void {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  private _renderAllCanvases(): void {
    const isDark = this._isDarkMode();
    const effectiveConfig = {
      ...this._config,
      show_proxies: this._runtimeShowProxies ?? this._config.show_proxies,
      show_zones: this._runtimeShowZones ?? this._config.show_zones,
      show_zone_labels: this._runtimeShowZoneLabels ?? this._config.show_zone_labels,
      show_doors: this._runtimeShowDoors ?? this._config.show_doors,
    };

    if (this._isStackedMode()) {
      // Render each floor's canvas
      for (const floor of this._getFloors()) {
        this._renderFloorCanvas(floor.id, effectiveConfig, isDark);
      }
    } else {
      // Single floor mode
      const activeFloor = this._getActiveFloor();
      if (activeFloor) {
        this._renderFloorCanvas(activeFloor.id, effectiveConfig, isDark);
      }
    }
  }

  private _renderFloorCanvas(floorId: string, config: any, isDark: boolean): void {
    const canvas = this._canvases.get(floorId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    if (width === 0 || height === 0) return;

    const proxies = this._getProxiesForFloor(floorId);
    const zones = this._getZonesForFloor(floorId);
    const doors = this._getDoorsForFloor(floorId);

    renderCanvas(
      { ctx, width, height, dpr, isDark },
      this._devices,
      proxies,
      zones,
      doors,
      config,
      floorId
    );
  }

  private _isDarkMode(): boolean {
    if (this._config?.theme_mode === "dark") return true;
    if (this._config?.theme_mode === "light") return false;
    return this.hass?.themes?.darkMode ?? false;
  }

  // ─── Event Handlers ────────────────────────────────────────

  private _handleImageLoad(floorId: string): void {
    this._imageLoaded = { ...this._imageLoaded, [floorId]: true };
    this._imageError = { ...this._imageError, [floorId]: false };
    // Re-setup resize observer and resize canvases
    requestAnimationFrame(() => {
      this._updateCanvasRefs();
      this._resizeAllCanvases();
      // Re-observe new containers
      this._resizeObserver?.disconnect();
      this._setupResizeObserver();
    });
  }

  private _handleImageError(floorId: string): void {
    this._imageError = { ...this._imageError, [floorId]: true };
    this._imageLoaded = { ...this._imageLoaded, [floorId]: false };
  }

  private _handleFloorChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._activeFloor = select.value;
  }

  private _toggleFullscreen(): void {
    this._isFullscreen = !this._isFullscreen;
    if (this._isFullscreen) {
      this.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  private _toggleDevicePanel(): void {
    this._showDevicePanel = !this._showDevicePanel;
  }

  private _toggleProxies(): void {
    const current = this._runtimeShowProxies ?? this._config.show_proxies ?? true;
    this._runtimeShowProxies = !current;
  }

  private _toggleZones(): void {
    const current = this._runtimeShowZones ?? this._config.show_zones ?? true;
    this._runtimeShowZones = !current;
  }

  private _toggleZoneLabels(): void {
    const current = this._runtimeShowZoneLabels ?? this._config.show_zone_labels ?? true;
    this._runtimeShowZoneLabels = !current;
  }

  private _toggleDoors(): void {
    const current = this._runtimeShowDoors ?? this._config.show_doors ?? true;
    this._runtimeShowDoors = !current;
  }

  private _openSetupDialog(): void {
    this._showSetupDialog = true;
    // After render, set config on the editor element
    this.updateComplete.then(() => {
      const editor = this.shadowRoot?.querySelector('ble-livemap-card-editor') as any;
      if (editor && editor.setConfig) {
        editor.setConfig(this._config);
      }
    });
  }

  private _closeSetupDialog(): void {
    this._showSetupDialog = false;
  }

  private _handleSetupConfigChanged(e: CustomEvent): void {
    if (e.detail?.config) {
      this._config = { ...e.detail.config };
      // Fire event to persist config in Lovelace
      const event = new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
      // Re-init if needed
      this.setConfig(this._config);
    }
  }

  private _renderSetupDialog() {
    if (!this._showSetupDialog) return nothing;
    const t = (key: string) => localize(key, this._lang);
    return html`
      <div class="setup-overlay" @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains('setup-overlay')) this._closeSetupDialog();
      }}>
        <div class="setup-dialog">
          <div class="setup-header">
            <h2>${t('editor.title')}</h2>
            <button class="setup-close" @click=${this._closeSetupDialog}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="setup-body" id="setup-body">
            <ble-livemap-card-editor
              .hass=${this.hass}
              @config-changed=${this._handleSetupConfigChanged}
            ></ble-livemap-card-editor>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Floor Rendering Helpers ───────────────────────────────

  private _renderFloorMap(floor: FloorConfig) {
    const loaded = this._imageLoaded[floor.id] || false;
    const error = this._imageError[floor.id] || false;

    return html`
      <div class="map-container" data-floor-id="${floor.id}">
        ${this._isStackedMode()
          ? html`<div class="floor-label">${floor.name}</div>`
          : nothing}
        <img
          data-floor-id="${floor.id}"
          src=${floor.image}
          @load=${() => this._handleImageLoad(floor.id)}
          @error=${() => this._handleImageError(floor.id)}
          alt="${floor.name}"
          crossorigin="anonymous"
        />
        ${loaded
          ? html`<canvas data-floor-id="${floor.id}"></canvas>`
          : nothing}
        ${error
          ? html`<div class="empty-state"><p>Failed to load: ${floor.image}</p></div>`
          : nothing}
      </div>
    `;
  }

  // ─── Rendering ─────────────────────────────────────────────

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
        --card-radius: var(--ha-card-border-radius, 12px);
        --text-primary: var(--primary-text-color, #212121);
        --text-secondary: var(--secondary-text-color, #727272);
        --accent: var(--primary-color, #4FC3F7);
      }

      ha-card {
        overflow: hidden;
        border-radius: var(--card-radius);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px 4px;
      }

      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .card-title .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4CAF50;
        animation: pulse-dot 2s ease-in-out infinite;
      }

      @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }

      .header-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .header-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .header-btn:hover {
        background: var(--divider-color, rgba(0,0,0,0.05));
        color: var(--text-primary);
      }

      .header-btn.off {
        opacity: 0.4;
      }

      .header-btn svg {
        width: 20px;
        height: 20px;
      }

      .floor-select {
        padding: 4px 8px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 6px;
        font-size: 12px;
        background: var(--card-bg);
        color: var(--text-primary);
      }

      .maps-wrapper {
        position: relative;
      }

      .map-container {
        position: relative;
        line-height: 0;
      }

      .map-container img {
        width: 100%;
        height: auto;
        display: block;
      }

      .map-container canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .floor-label {
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        background: var(--divider-color, rgba(0,0,0,0.03));
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .floor-divider {
        height: 2px;
        background: var(--divider-color, rgba(0,0,0,0.08));
      }

      .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: var(--text-secondary);
      }

      .empty-state svg {
        width: 48px;
        height: 48px;
        opacity: 0.3;
        margin-bottom: 12px;
      }

      .empty-state p {
        margin: 4px 0;
        font-size: 13px;
      }

      /* Device Panel */
      .device-panel {
        padding: 8px 12px;
        border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        max-height: 200px;
        overflow-y: auto;
        transition: max-height 0.3s ease;
      }

      .device-panel.collapsed {
        max-height: 0;
        padding: 0 12px;
        overflow: hidden;
      }

      .device-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 0;
      }

      .device-item + .device-item {
        border-top: 1px solid var(--divider-color, rgba(0,0,0,0.04));
      }

      .device-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .device-info {
        flex: 1;
        min-width: 0;
      }

      .device-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .device-detail {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .device-accuracy {
        text-align: right;
        font-size: 11px;
        color: var(--text-secondary);
      }

      /* Status Bar */
      .status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 16px;
        font-size: 11px;
        color: var(--text-secondary);
        border-top: 1px solid var(--divider-color, rgba(0,0,0,0.06));
      }

      .status-left {
        display: flex;
        gap: 16px;
      }

      .status-item {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .status-item .count {
        font-weight: 600;
        color: var(--text-primary);
      }

      /* Setup Dialog */
      .setup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .setup-dialog {
        background: var(--card-bg, #fff);
        border-radius: 16px;
        width: 95vw;
        max-width: 1200px;
        height: 90vh;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
        animation: slideUp 0.25s ease;
      }

      .setup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        flex-shrink: 0;
      }

      .setup-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .setup-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, color 0.2s;
      }

      .setup-close:hover {
        background: var(--divider-color, rgba(0,0,0,0.08));
        color: var(--text-primary);
      }

      .setup-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }

      .setup-body ble-livemap-card-editor {
        display: block;
        width: 100%;
      }
    `;
  }

  protected render() {
    if (!this._config) return nothing;

    const floors = this._getFloors();
    const hasMultipleFloors = floors.length > 1;
    const isStacked = this._isStackedMode();
    const title = this._config.card_title || "BLE LiveMap";
    const t = (key: string) => localize(key, this._lang);
    const hasFloorplanImage = floors.some((f) => f.image);

    return html`
      <ha-card>
        <!-- Header -->
        <div class="card-header">
          <div class="card-title">
            <span class="dot"></span>
            ${title}
          </div>
          <div class="header-actions">
            ${hasMultipleFloors && !isStacked
              ? html`
                  <select class="floor-select" @change=${this._handleFloorChange}>
                    ${floors.map(
                      (f) => html`
                        <option value=${f.id} ?selected=${f.id === this._activeFloor}>
                          ${f.name}
                        </option>
                      `
                    )}
                  </select>
                `
              : nothing}
            <!-- Toggle proxies -->
            <button
              class="header-btn ${(this._runtimeShowProxies ?? this._config.show_proxies ?? true) ? '' : 'off'}"
              @click=${this._toggleProxies}
              title="${t('card.toggle_proxies')}"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
              </svg>
            </button>
            <!-- Toggle zones -->
            ${(this._config.zones?.length || 0) > 0
              ? html`
                  <button
                    class="header-btn ${(this._runtimeShowZones ?? this._config.show_zones ?? true) ? '' : 'off'}"
                    @click=${this._toggleZones}
                    title="${t('card.toggle_zones')}"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                    </svg>
                  </button>
                `
              : nothing}
            <!-- Toggle doors -->
            ${(this._config.doors?.length || 0) > 0
              ? html`
                  <button
                    class="header-btn ${(this._runtimeShowDoors ?? this._config.show_doors ?? true) ? '' : 'off'}"
                    @click=${this._toggleDoors}
                    title="Doors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-2 0H7V5h10v14zm-4-8c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1z"/>
                    </svg>
                  </button>
                `
              : nothing}
            <!-- Setup button -->
            <button class="header-btn" @click=${this._openSetupDialog} title="${t('common.configure')}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/>
              </svg>
            </button>
            <button class="header-btn" @click=${this._toggleDevicePanel} title="Devices">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
            ${this._config.fullscreen_enabled
              ? html`
                  <button class="header-btn" @click=${this._toggleFullscreen} title="${t("card.fullscreen")}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  </button>
                `
              : nothing}
          </div>
        </div>

        <!-- Maps -->
        ${hasFloorplanImage
          ? html`
              <div class="maps-wrapper">
                ${isStacked
                  ? floors.map(
                      (floor, idx) => html`
                        ${idx > 0 ? html`<div class="floor-divider"></div>` : nothing}
                        ${this._renderFloorMap(floor)}
                      `
                    )
                  : this._getActiveFloor()
                    ? this._renderFloorMap(this._getActiveFloor()!)
                    : nothing}
              </div>
            `
          : html`
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
                </svg>
                <p>${t("common.no_floorplan")}</p>
              </div>
            `}

        <!-- Device Panel -->
        <div class="device-panel ${this._showDevicePanel ? "" : "collapsed"}">
          ${this._devices.map(
            (device) => html`
              <div class="device-item">
                <div class="device-dot" style="background: ${device.config.color}"></div>
                <div class="device-info">
                  <div class="device-name">${device.name}</div>
                  <div class="device-detail">
                    ${device.area || device.nearest_proxy || t("common.unknown")}
                    ${device.current_floor_id
                      ? html` <span style="opacity:0.6;">| ${this._getFloors().find(f => f.id === device.current_floor_id)?.name || device.current_floor_id}</span>`
                      : nothing}
                  </div>
                </div>
                <div class="device-accuracy">
                  ${device.position
                    ? html`
                        <div>${device.position.accuracy.toFixed(1)}m</div>
                        <div>${Math.round(device.position.confidence * 100)}%</div>
                      `
                    : html`<div>--</div>`}
                </div>
              </div>
            `
          )}
        </div>

        <!-- Status Bar -->
        <div class="status-bar">
          <div class="status-left">
            <div class="status-item">
              <span class="count">${this._devices.filter((d) => d.position).length}</span>
              ${t("card.devices_tracked")}
            </div>
            <div class="status-item">
              <span class="count">${this._getAllProxies().length}</span>
              ${t("card.proxies_active")}
            </div>
          </div>
          <div>v${CARD_VERSION}</div>
        </div>
        <!-- Setup Dialog -->
        ${this._renderSetupDialog()}
      </ha-card>
    `;
  }
}

// Also import and register the editor and panel
import "./editor";
import "./panel";
