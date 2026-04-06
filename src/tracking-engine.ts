/**
 * ha-ble-livemap — Tracking Engine (Geometry-First Architecture)
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * The single source of truth for all live device tracking logic.
 * Both the panel (editor) and the Lovelace card use this engine
 * so that tracking results are identical everywhere.
 *
 * Architecture (v2.1 — Geometry-First):
 * ──────────────────────────────────────
 * Step 1: TRILATERATE — raw (x,y) from all visible proxies
 * Step 2: DETERMINE CANDIDATE ZONE — which zone polygon contains (x,y)?
 * Step 3: VALIDATE ZONE TRANSITION — door-graph + movement direction
 * Step 4: BERMUDA AREA AS HINT — probability boost, never override
 * Step 5: CONSTRAIN POSITION — clamp to resolved zone polygon
 *
 * Key principle: Proxies are geometric points. The map geometry
 * (zones, walls, doors) decides where a device is. A device can
 * only change rooms by passing through a configured door.
 */

import {
  BLELivemapConfig,
  HomeAssistant,
  DeviceState,
  DevicePosition,
  ProxyConfig,
  ProxyDistance,
  ZoneConfig,
  DoorConfig,
  FloorConfig,
  HistoryPoint,
  TrackedDeviceConfig,
  DEFAULT_CONFIG,
} from "./types";

import { trilaterate, smoothPosition, cleanupKalmanStates } from "./trilateration";
import { cleanupAnimations } from "./renderer";
import { HistoryStore } from "./history-store";
import {
  collectDeviceDistances,
  applyRssiCalibration,
  readDeviceArea,
  findZoneForArea,
  constrainToPolygon,
  isPointInPolygon,
  resolveZoneAreaMap,
  ZoneAreaMapping,
  extractDeviceSlug,
  extractProxySlug,
} from "./bermuda-utils";

// ─── Internal State Types ──────────────────────────────────────────

/** Per-device floor tracking state for gateway logic */
interface DeviceFloorState {
  current_floor_id: string;
  last_gateway_passage: number;
  last_gateway_floor: string | null;
  override_start: number;
  override_candidate_floor: string | null;
}

/** Per-device zone tracking state with movement-direction door passage */
interface DeviceZoneState {
  current_zone_id: string | null;
  /** Per-door distance history for approach detection (doorId → last N distances) */
  door_distances: Map<string, number[]>;
  /** Last door that was passed through */
  last_passage_door: string | null;
  last_passage_time: number;
  /** Soft override for sustained presence in a new zone */
  override_candidate_zone: string | null;
  override_start: number;
  /** Bermuda Area hint tracking */
  bermuda_hint_zone: string | null;
  bermuda_hint_count: number;
}

/** Per-device Bermuda Area debounce state */
interface AreaDebounceState {
  confirmedArea: string | null;
  confirmedZoneId: string | null;
  candidateArea: string | null;
  candidateCount: number;
  lastReading: number;
}

/** Debug info for a single proxy-device pair */
export interface ProxyDebugInfo {
  proxyName: string;
  proxyId: string;
  proxyX: number;
  proxyY: number;
  proxyFloorId: string;
  distance: number | null;
  rssi: number | null;
  sensorId: string;
  placed: boolean;
  /** Which device this debug info belongs to */
  deviceId: string;
}

/** Options for creating a TrackingEngine */
export interface TrackingEngineOptions {
  enableHistory?: boolean;
  historyRetention?: number; // minutes
  historyTrailLength?: number;
}

// ─── Constants ────────────────────────────────────────────────────

/** Number of distance samples to keep per door for approach detection */
const DOOR_DISTANCE_HISTORY = 4;
/** Distance threshold (% units) to consider "near a door" */
const DOOR_PROXIMITY_THRESHOLD = 8;
/** Minimum consecutive approaching readings to allow passage */
const DOOR_APPROACH_MIN_READINGS = 2;
/** Bermuda hint: how many consistent readings before it influences zone */
const BERMUDA_HINT_REQUIRED = 5;
/** Bermuda hint: trilateration confidence below which hint is considered */
const BERMUDA_HINT_CONFIDENCE_THRESHOLD = 0.35;

// ─── Tracking Engine ───────────────────────────────────────────────

export class TrackingEngine {
  // Internal state maps
  private _previousPositions: Map<string, DevicePosition> = new Map();
  private _deviceFloorState: Map<string, DeviceFloorState> = new Map();
  private _deviceZoneState: Map<string, DeviceZoneState> = new Map();
  private _deviceAreaState: Map<string, AreaDebounceState> = new Map();

  // Zone ↔ HA Area mapping
  private _zoneAreaMap: Map<string, ZoneAreaMapping> = new Map();
  private _zoneAreaMapStamp = 0;
  private _areaRegistry: Map<string, string> = new Map();
  private _areaRegistryLoaded = false;

  // History
  private _historyStore: HistoryStore | null = null;
  private _historyEnabled: boolean;

  // Debug info (populated during update, keyed by deviceId)
  private _debugInfoMap: Map<string, ProxyDebugInfo[]> = new Map();

  constructor(options: TrackingEngineOptions = {}) {
    this._historyEnabled = options.enableHistory ?? false;

    if (this._historyEnabled) {
      this._historyStore = new HistoryStore(
        options.historyRetention ?? 60,
        options.historyTrailLength ?? 50,
      );
      this._historyStore.init().catch(() => {
        // Non-critical — falls back to memory-only
      });
    }
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Run a full tracking update for all configured devices.
   *
   * Returns an array of DeviceState objects ready for rendering.
   * Both the panel and the card call this method on their update interval.
   *
   * Pipeline (Geometry-First):
   *   1. Trilaterate raw position from all visible proxies
   *   2. Determine candidate zone from raw position
   *   3. Validate zone transition via door graph + movement direction
   *   4. Use Bermuda Area as hint (low-confidence tie-breaker)
   *   5. Constrain final position to resolved zone polygon
   */
  update(hass: HomeAssistant, config: BLELivemapConfig): DeviceState[] {
    if (!hass?.states || !config?.tracked_devices) return [];

    const devices: DeviceState[] = [];
    const proxies = this._getAllProxies(config);
    const floors = this._getFloors(config);
    const zones = config.zones || [];
    const doors = config.doors || [];
    const hasMultipleFloors = floors.length > 1;
    const hasZones = zones.length > 0;
    const hasDoors = doors.length > 0;
    const now = Date.now();

    // Load area registry once (async, non-blocking)
    if (!this._areaRegistryLoaded && hass) {
      this._areaRegistryLoaded = true;
      hass.callWS({ type: "config/area_registry/list" }).then((areas: any) => {
        for (const area of areas as any[]) {
          this._areaRegistry.set(area.area_id, area.name);
        }
        this._zoneAreaMapStamp = 0; // force refresh
      }).catch(() => { /* non-critical */ });
    }

    // Refresh zone ↔ HA Area mapping every 30 seconds (for display only)
    if (hasZones && (now - this._zoneAreaMapStamp > 30_000)) {
      this._zoneAreaMap = resolveZoneAreaMap(
        zones, proxies, hass,
        this._areaRegistry.size > 0 ? this._areaRegistry : undefined,
      );
      this._zoneAreaMapStamp = now;
    }

    // Reset debug info
    this._debugInfoMap.clear();

    for (const deviceConfig of config.tracked_devices) {
      const deviceId = deviceConfig.entity_prefix || deviceConfig.bermuda_device_id || "";
      if (!deviceId) continue;

      // ── Collect distances from all proxies ──
      const distances = collectDeviceDistances(
        hass, deviceConfig.entity_prefix || "", proxies, applyRssiCalibration,
      );

      // Collect debug info for ALL proxies (per device)
      this._collectDebugInfo(hass, deviceConfig, proxies, floors, config);

      // ── Step 1: TRILATERATE — raw position from all visible proxies ──
      let position: DevicePosition | null = null;
      let trilaterationConfidence = 0;

      if (distances.length >= 1) {
        const proxyMap = new Map<string, { x: number; y: number }>();

        let resolvedFloorId: string | null = null;
        if (hasMultipleFloors) {
          resolvedFloorId = this._resolveDeviceFloor(deviceId, distances, proxies, config, floors);
        }

        // Use proxies on the resolved floor (or all if single floor)
        for (const d of distances) {
          const proxy = proxies.find((p) => p.entity_id === d.proxy_entity_id);
          if (proxy) {
            if (resolvedFloorId && proxy.floor_id && proxy.floor_id !== resolvedFloorId) continue;
            proxyMap.set(d.proxy_entity_id, { x: proxy.x, y: proxy.y });
          }
        }

        if (proxyMap.size >= 1) {
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

          const result = trilaterate(proxyMap, distances, 100, 100, imageWidth, imageHeight, deviceId);

          if (result) {
            const prevPos = this._previousPositions.get(deviceId);
            const prevResult = prevPos
              ? { x: prevPos.x, y: prevPos.y, accuracy: prevPos.accuracy, confidence: prevPos.confidence }
              : null;
            const smoothed = smoothPosition(result, prevResult, 0.3);

            if (smoothed) {
              trilaterationConfidence = smoothed.confidence;
              position = {
                x: smoothed.x,
                y: smoothed.y,
                accuracy: smoothed.accuracy,
                confidence: smoothed.confidence,
                timestamp: now,
                floor_id: resolvedFloorId || undefined,
              };
            }
          }
        }
      }

      // ── Step 2: DETERMINE CANDIDATE ZONE ──
      let candidateZoneId: string | null = null;
      let resolvedZoneId: string | null = null;

      if (position && hasZones) {
        candidateZoneId = this._findZoneForPosition(
          position.x, position.y, position.floor_id || null, config,
        );
      }

      // ── Step 3: VALIDATE ZONE TRANSITION (door-graph + movement direction) ──
      if (position && hasZones) {
        resolvedZoneId = this._resolveZoneTransition(
          deviceId, position, candidateZoneId, config, hasDoors,
        );
      }

      // ── Step 4: BERMUDA AREA AS HINT ──
      let bermudaAreaName: string | null = null;
      if (hasZones && deviceConfig.entity_prefix) {
        const bermudaArea = readDeviceArea(hass, deviceConfig.entity_prefix);
        if (bermudaArea) {
          bermudaAreaName = this._debounceAreaChange(deviceId, bermudaArea.areaName);

          // Only apply Bermuda hint when trilateration confidence is low
          if (
            bermudaAreaName &&
            trilaterationConfidence < BERMUDA_HINT_CONFIDENCE_THRESHOLD &&
            resolvedZoneId
          ) {
            const hintZone = this._findZoneForBermudaArea(bermudaAreaName, position?.floor_id || null, zones);
            if (hintZone && hintZone !== resolvedZoneId) {
              resolvedZoneId = this._applyBermudaHint(
                deviceId, resolvedZoneId, hintZone, config,
              );
            }
          }
        }
      }

      // ── Step 5: CONSTRAIN POSITION to resolved zone ──
      if (position && resolvedZoneId) {
        const zone = zones.find((z) => z.id === resolvedZoneId);
        if (zone && zone.points?.length >= 3) {
          const constrained = constrainToPolygon(position.x, position.y, zone.points);
          position = {
            ...position,
            x: constrained.x,
            y: constrained.y,
          };
        }
      }

      // Store final position
      if (position) {
        this._previousPositions.set(deviceId, position);
      }

      // Find nearest proxy
      let nearestProxy: string | null = null;
      if (distances.length > 0) {
        const nearest = distances.reduce((a, b) => (a.distance < b.distance ? a : b));
        const proxy = proxies.find((p) => p.entity_id === nearest.proxy_entity_id);
        nearestProxy = proxy?.name || proxy?.entity_id || null;
      }

      // Resolve area name for display
      let displayArea = bermudaAreaName;
      if (!displayArea && resolvedZoneId) {
        const mapping = this._zoneAreaMap.get(resolvedZoneId);
        if (mapping) displayArea = mapping.areaName;
        else {
          const zone = zones.find((z) => z.id === resolvedZoneId);
          if (zone) displayArea = zone.name;
        }
      }

      // Record history
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

      const floorState = this._deviceFloorState.get(deviceId);

      devices.push({
        device_id: deviceId,
        name: deviceConfig.name,
        position,
        history,
        distances,
        nearest_proxy: nearestProxy,
        area: displayArea || null,
        last_seen: position ? now : 0,
        config: deviceConfig,
        current_floor_id: floorState?.current_floor_id || undefined,
      });
    }

    // Cleanup stale state
    const activeIds = devices.map((d) => d.device_id);
    cleanupAnimations(activeIds);
    cleanupKalmanStates(activeIds);

    return devices;
  }

  /**
   * Get debug info from the last update() call for a specific device.
   * If no deviceId specified, returns info for the first device (backwards compat).
   */
  getDebugInfo(deviceId?: string): ProxyDebugInfo[] {
    if (deviceId) {
      return this._debugInfoMap.get(deviceId) || [];
    }
    // Backwards compatibility: return first device's debug info
    const first = this._debugInfoMap.values().next();
    return first.done ? [] : first.value;
  }

  /** Get all device IDs that have debug info. */
  getDebugDeviceIds(): string[] {
    return Array.from(this._debugInfoMap.keys());
  }

  /** Get the current zone ↔ area mapping. */
  getZoneAreaMap(): Map<string, ZoneAreaMapping> {
    return this._zoneAreaMap;
  }

  /** Get the loaded area registry. */
  getAreaRegistry(): Map<string, string> {
    return this._areaRegistry;
  }

  /** Update history settings at runtime. */
  updateHistorySettings(retentionMinutes: number, maxTrailLength: number): void {
    this._historyStore?.updateSettings(retentionMinutes, maxTrailLength);
  }

  /** Clean up all timers and resources. */
  destroy(): void {
    this._historyStore?.destroy();
    this._historyStore = null;
    this._previousPositions.clear();
    this._deviceFloorState.clear();
    this._deviceZoneState.clear();
    this._deviceAreaState.clear();
    this._zoneAreaMap.clear();
    this._debugInfoMap.clear();
  }

  // ─── Zone Transition (Geometry-First) ───────────────────────

  /**
   * Resolve whether a zone transition is allowed.
   *
   * Rules:
   * 1. Same zone as before → accept
   * 2. No current zone (first reading or outside all zones) → assign nearest
   * 3. Direct door exists → check movement direction (approaching + close)
   * 4. Path through 1-3 doors → require sustained presence (time-based)
   * 5. No path (through wall) → REJECT, keep current zone
   */
  private _resolveZoneTransition(
    deviceId: string,
    position: DevicePosition,
    candidateZoneId: string | null,
    config: BLELivemapConfig,
    hasDoors: boolean,
  ): string | null {
    const zones = config.zones || [];
    const doors = config.doors || [];
    if (zones.length === 0) return null;

    const now = Date.now();
    const overrideTimeout = (config.zone_override_timeout ?? 45) * 1000;

    let zoneState = this._deviceZoneState.get(deviceId);
    if (!zoneState) {
      // First reading: assign to candidate zone or nearest zone
      const initialZone = candidateZoneId || this._findNearestZone(
        position.x, position.y, position.floor_id || null, zones,
      );
      zoneState = {
        current_zone_id: initialZone,
        door_distances: new Map(),
        last_passage_door: null,
        last_passage_time: 0,
        override_candidate_zone: null,
        override_start: 0,
        bermuda_hint_zone: null,
        bermuda_hint_count: 0,
      };
      this._deviceZoneState.set(deviceId, zoneState);
      return initialZone;
    }

    const currentZone = zoneState.current_zone_id;

    // No doors configured → simple point-in-polygon zone detection
    if (!hasDoors || doors.length === 0) {
      if (candidateZoneId) {
        zoneState.current_zone_id = candidateZoneId;
        return candidateZoneId;
      }
      return currentZone;
    }

    // Device is in the same zone → accept, reset overrides
    if (candidateZoneId === currentZone) {
      zoneState.override_candidate_zone = null;
      zoneState.override_start = 0;
      return currentZone;
    }

    // No current zone → assign to candidate or nearest
    if (!currentZone) {
      const newZone = candidateZoneId || this._findNearestZone(
        position.x, position.y, position.floor_id || null, zones,
      );
      zoneState.current_zone_id = newZone;
      return newZone;
    }

    // Position is outside all zones → keep current zone (will be clamped in step 5)
    if (!candidateZoneId) {
      // Update door distances even when outside zones (device might be approaching a door)
      this._updateDoorDistances(deviceId, position, currentZone, config);
      return currentZone;
    }

    // ── Zone transition requested: candidateZoneId != currentZone ──

    // Update door approach distances
    this._updateDoorDistances(deviceId, position, currentZone, config);

    // Check 1: Direct door connection with movement-direction validation
    const connectingDoor = this._findConnectingDoor(currentZone, candidateZoneId, doors);
    if (connectingDoor) {
      if (this._isDoorPassageAllowed(deviceId, connectingDoor, position)) {
        // Door passage confirmed!
        zoneState.current_zone_id = candidateZoneId;
        zoneState.last_passage_door = connectingDoor.id;
        zoneState.last_passage_time = now;
        zoneState.override_candidate_zone = null;
        zoneState.override_start = 0;
        // Clear door distance history for this door
        zoneState.door_distances.delete(connectingDoor.id);
        return candidateZoneId;
      }

      // Near the door but not yet passing → start/continue override timer
      const doorDist = this._distanceToDoor(position, connectingDoor);
      if (doorDist < DOOR_PROXIMITY_THRESHOLD * 2) {
        if (zoneState.override_candidate_zone !== candidateZoneId) {
          zoneState.override_candidate_zone = candidateZoneId;
          zoneState.override_start = now;
        } else if ((now - zoneState.override_start) > overrideTimeout * 0.5) {
          // Fallback: if near door for extended time, allow transition
          zoneState.current_zone_id = candidateZoneId;
          zoneState.last_passage_door = connectingDoor.id;
          zoneState.last_passage_time = now;
          zoneState.override_candidate_zone = null;
          zoneState.override_start = 0;
          return candidateZoneId;
        }
      }

      return currentZone;
    }

    // Check 2: Path through 1-3 doors (indirect connection)
    const pathLen = this._findZonePath(currentZone, candidateZoneId, doors);
    if (pathLen > 0 && pathLen <= 3) {
      if (zoneState.override_candidate_zone === candidateZoneId) {
        // Shorter timeout for shorter paths
        const adjustedTimeout = overrideTimeout * Math.min(pathLen * 0.4, 1);
        if ((now - zoneState.override_start) >= adjustedTimeout) {
          zoneState.current_zone_id = candidateZoneId;
          zoneState.override_candidate_zone = null;
          zoneState.override_start = 0;
          return candidateZoneId;
        }
      } else {
        zoneState.override_candidate_zone = candidateZoneId;
        zoneState.override_start = now;
      }
      return currentZone;
    }

    // Check 3: No path exists (through a wall) → REJECT
    // But allow override after full timeout as safety valve
    if (zoneState.override_candidate_zone === candidateZoneId) {
      if ((now - zoneState.override_start) >= overrideTimeout) {
        // Safety valve: if device has been in the "wrong" zone for a very long time,
        // something is off — allow the transition to prevent permanent stuck state
        zoneState.current_zone_id = candidateZoneId;
        zoneState.override_candidate_zone = null;
        zoneState.override_start = 0;
        return candidateZoneId;
      }
    } else {
      zoneState.override_candidate_zone = candidateZoneId;
      zoneState.override_start = now;
    }

    return currentZone;
  }

  // ─── Door Approach Detection ────────────────────────────────

  /**
   * Update the distance-to-door history for approach detection.
   */
  private _updateDoorDistances(
    deviceId: string,
    position: DevicePosition,
    currentZoneId: string,
    config: BLELivemapConfig,
  ): void {
    const zoneState = this._deviceZoneState.get(deviceId);
    if (!zoneState) return;

    const doors = config.doors || [];

    // Track distances to all doors connected to the current zone
    for (const door of doors) {
      if (door.zone_a !== currentZoneId && door.zone_b !== currentZoneId) continue;
      if (door.floor_id && position.floor_id && door.floor_id !== position.floor_id) continue;

      const dist = this._distanceToDoor(position, door);
      let history = zoneState.door_distances.get(door.id);
      if (!history) {
        history = [];
        zoneState.door_distances.set(door.id, history);
      }

      history.push(dist);
      // Keep only last N samples
      if (history.length > DOOR_DISTANCE_HISTORY) {
        history.shift();
      }
    }
  }

  /**
   * Check if a door passage is allowed based on movement direction.
   *
   * A passage is allowed when:
   * 1. Device is close enough to the door (within threshold)
   * 2. Device has been consistently approaching the door (distance decreasing)
   */
  private _isDoorPassageAllowed(
    deviceId: string,
    door: DoorConfig,
    position: DevicePosition,
  ): boolean {
    const zoneState = this._deviceZoneState.get(deviceId);
    if (!zoneState) return false;

    const currentDist = this._distanceToDoor(position, door);

    // Must be close enough to the door
    if (currentDist > DOOR_PROXIMITY_THRESHOLD) return false;

    // Check approach history
    const history = zoneState.door_distances.get(door.id);
    if (!history || history.length < DOOR_APPROACH_MIN_READINGS) {
      // Not enough history — allow if very close (within half threshold)
      return currentDist < DOOR_PROXIMITY_THRESHOLD * 0.5;
    }

    // Count how many consecutive readings show decreasing distance (approaching)
    let approachCount = 0;
    for (let i = history.length - 1; i > 0; i--) {
      if (history[i] < history[i - 1]) {
        approachCount++;
      } else {
        break; // Stop at first non-approaching reading
      }
    }

    return approachCount >= DOOR_APPROACH_MIN_READINGS;
  }

  /**
   * Calculate distance from a position to a door (in % coordinate space).
   */
  private _distanceToDoor(position: DevicePosition, door: DoorConfig): number {
    const dx = position.x - door.x;
    const dy = position.y - door.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ─── Bermuda Area Hint ──────────────────────────────────────

  /**
   * Apply Bermuda Area as a hint for zone selection.
   *
   * Only used when trilateration confidence is low. Bermuda Area
   * can suggest a zone, but NEVER overrides the door-graph validation.
   * The hint must be consistent for N readings before it takes effect,
   * AND the target zone must be reachable via doors from the current zone.
   */
  private _applyBermudaHint(
    deviceId: string,
    currentZoneId: string,
    hintZoneId: string,
    config: BLELivemapConfig,
  ): string {
    const zoneState = this._deviceZoneState.get(deviceId);
    if (!zoneState) return currentZoneId;

    const doors = config.doors || [];

    // Track hint consistency
    if (zoneState.bermuda_hint_zone === hintZoneId) {
      zoneState.bermuda_hint_count++;
    } else {
      zoneState.bermuda_hint_zone = hintZoneId;
      zoneState.bermuda_hint_count = 1;
    }

    // Only apply if consistent for enough readings
    if (zoneState.bermuda_hint_count < BERMUDA_HINT_REQUIRED) {
      return currentZoneId;
    }

    // Verify the hint zone is reachable via doors (don't teleport through walls)
    if (doors.length > 0) {
      const pathLen = this._findZonePath(currentZoneId, hintZoneId, doors);
      if (pathLen < 0) {
        // No path exists — Bermuda hint is rejected
        return currentZoneId;
      }
      // Only allow hint for adjacent rooms (1 door away)
      if (pathLen > 1) {
        return currentZoneId;
      }
    }

    // Hint accepted — transition to hint zone
    zoneState.current_zone_id = hintZoneId;
    zoneState.bermuda_hint_zone = null;
    zoneState.bermuda_hint_count = 0;
    return hintZoneId;
  }

  /**
   * Find the zone that matches a Bermuda Area name.
   */
  private _findZoneForBermudaArea(
    areaName: string,
    floorId: string | null,
    zones: ZoneConfig[],
  ): string | null {
    const normalizedArea = areaName.toLowerCase().trim();

    // Check zone-area map first
    for (const [zoneId, mapping] of this._zoneAreaMap) {
      if (mapping.areaName.toLowerCase().trim() === normalizedArea) {
        const zone = zones.find((z) => z.id === zoneId);
        if (zone && (!floorId || !zone.floor_id || zone.floor_id === floorId)) {
          return zoneId;
        }
      }
    }

    // Fallback: direct name match
    for (const zone of zones) {
      if (floorId && zone.floor_id && zone.floor_id !== floorId) continue;
      if (zone.name.toLowerCase().trim() === normalizedArea) {
        return zone.id;
      }
    }

    return null;
  }

  // ─── Zone Graph Helpers ─────────────────────────────────────

  /**
   * Find which zone polygon contains a point.
   */
  private _findZoneForPosition(
    x: number, y: number, floorId: string | null, config: BLELivemapConfig,
  ): string | null {
    const zones = config.zones || [];
    for (const zone of zones) {
      if (floorId && zone.floor_id && zone.floor_id !== floorId) continue;
      if (isPointInPolygon(x, y, zone.points)) return zone.id;
    }
    return null;
  }

  /**
   * Find the nearest zone to a point (for when position is outside all zones).
   * Uses distance to zone centroid.
   */
  private _findNearestZone(
    x: number, y: number, floorId: string | null, zones: ZoneConfig[],
  ): string | null {
    let bestZone: string | null = null;
    let bestDist = Infinity;

    for (const zone of zones) {
      if (floorId && zone.floor_id && zone.floor_id !== floorId) continue;
      if (!zone.points || zone.points.length < 3) continue;

      const cx = zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length;
      const cy = zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length;
      const dx = x - cx;
      const dy = y - cy;
      const dist = dx * dx + dy * dy;

      if (dist < bestDist) {
        bestDist = dist;
        bestZone = zone.id;
      }
    }

    return bestZone;
  }

  /**
   * Find a door that directly connects two zones.
   */
  private _findConnectingDoor(zoneA: string, zoneB: string, doors: DoorConfig[]): DoorConfig | null {
    return doors.find(
      (d) =>
        (d.zone_a === zoneA && d.zone_b === zoneB) ||
        (d.zone_a === zoneB && d.zone_b === zoneA),
    ) || null;
  }

  /**
   * BFS to find shortest path (in door-hops) between two zones.
   * Returns -1 if no path exists.
   */
  private _findZonePath(zoneA: string, zoneB: string, doors: DoorConfig[]): number {
    if (zoneA === zoneB) return 0;
    if (doors.length === 0) return -1;

    const adj: Map<string, Set<string>> = new Map();
    for (const door of doors) {
      if (!door.zone_a || !door.zone_b) continue;
      if (!adj.has(door.zone_a)) adj.set(door.zone_a, new Set());
      if (!adj.has(door.zone_b)) adj.set(door.zone_b, new Set());
      adj.get(door.zone_a)!.add(door.zone_b);
      adj.get(door.zone_b)!.add(door.zone_a);
    }

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
    return -1;
  }

  // ─── Gateway / Floor Resolution ──────────────────────────────

  private _resolveDeviceFloor(
    deviceId: string,
    distances: ProxyDistance[],
    proxies: ProxyConfig[],
    config: BLELivemapConfig,
    floors: FloorConfig[],
  ): string | null {
    if (floors.length <= 1) return floors[0]?.id || null;

    const now = Date.now();
    const gatewayTimeout = (config.gateway_timeout ?? 30) * 1000;
    const overrideTimeout = (config.floor_override_timeout ?? 60) * 1000;
    const overrideMinProxies = config.floor_override_min_proxies ?? 2;

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

    // Count proxies per floor that see this device
    const floorProxyCounts: Map<string, number> = new Map();

    for (const dist of distances) {
      const proxy = proxies.find((p) => p.entity_id === dist.proxy_entity_id);
      if (!proxy || !proxy.floor_id) continue;

      const floorId = proxy.floor_id;
      floorProxyCounts.set(floorId, (floorProxyCounts.get(floorId) || 0) + 1);

      // Check gateway proxies
      if (proxy.is_gateway && proxy.gateway_connects?.length) {
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
      if (floors.some((f) => f.id === targetFloor)) {
        floorState.current_floor_id = targetFloor;
        floorState.last_gateway_floor = null;
        floorState.override_start = 0;
        floorState.override_candidate_floor = null;
        return targetFloor;
      }
    }

    // Rule 2: Soft override — consistent signals from another floor
    let bestFloor = floorState.current_floor_id;
    let bestCount = floorProxyCounts.get(bestFloor) || 0;

    for (const [floorId, count] of floorProxyCounts) {
      if (floorId !== floorState.current_floor_id && count > bestCount) {
        bestFloor = floorId;
        bestCount = count;
      }
    }

    if (bestFloor !== floorState.current_floor_id && bestCount >= overrideMinProxies) {
      const currentFloorCount = floorProxyCounts.get(floorState.current_floor_id) || 0;
      if (bestCount > currentFloorCount) {
        if (floorState.override_candidate_floor === bestFloor) {
          if ((now - floorState.override_start) >= overrideTimeout) {
            floorState.current_floor_id = bestFloor;
            floorState.override_start = 0;
            floorState.override_candidate_floor = null;
            return bestFloor;
          }
        } else {
          floorState.override_candidate_floor = bestFloor;
          floorState.override_start = now;
        }
      }
    } else {
      floorState.override_start = 0;
      floorState.override_candidate_floor = null;
    }

    return floorState.current_floor_id;
  }

  // ─── Area Debounce ───────────────────────────────────────────

  private _debounceAreaChange(deviceId: string, newAreaName: string): string | null {
    const REQUIRED_READINGS = 3;

    let state = this._deviceAreaState.get(deviceId);
    if (!state) {
      state = {
        confirmedArea: null,
        confirmedZoneId: null,
        candidateArea: null,
        candidateCount: 0,
        lastReading: 0,
      };
      this._deviceAreaState.set(deviceId, state);
    }

    state.lastReading = Date.now();

    if (newAreaName === state.confirmedArea) {
      state.candidateArea = null;
      state.candidateCount = 0;
      return state.confirmedArea;
    }

    if (newAreaName === state.candidateArea) {
      state.candidateCount++;
    } else {
      state.candidateArea = newAreaName;
      state.candidateCount = 1;
    }

    if (state.candidateCount >= REQUIRED_READINGS) {
      state.confirmedArea = newAreaName;
      state.confirmedZoneId = null;
      state.candidateArea = null;
      state.candidateCount = 0;
      return state.confirmedArea;
    }

    return state.confirmedArea;
  }

  // ─── Debug Info Collection ───────────────────────────────────

  private _collectDebugInfo(
    hass: HomeAssistant,
    deviceConfig: TrackedDeviceConfig,
    allProxies: ProxyConfig[],
    floors: FloorConfig[],
    config: BLELivemapConfig,
  ): void {
    const deviceId = deviceConfig.entity_prefix || deviceConfig.bermuda_device_id || "";
    if (!deviceId) return;

    const rawSlug = extractDeviceSlug(deviceId);
    const debugEntries: ProxyDebugInfo[] = [];

    for (const proxy of allProxies) {
      const proxySlug = extractProxySlug(proxy.entity_id);
      const sensorId = `sensor.bermuda_${rawSlug}_distance_to_${proxySlug}`;
      const state = hass.states[sensorId];
      const dist = state && !isNaN(parseFloat(state.state)) ? parseFloat(state.state) : null;
      const rssi = state?.attributes?.rssi ?? null;
      const isPlaced = (proxy.x > 0 || proxy.y > 0);

      debugEntries.push({
        proxyName: proxy.name || proxySlug,
        proxyId: proxySlug,
        proxyX: proxy.x,
        proxyY: proxy.y,
        proxyFloorId: proxy.floor_id || "",
        distance: dist,
        rssi: rssi !== null && rssi !== undefined ? Number(rssi) : null,
        sensorId,
        placed: isPlaced,
        deviceId,
      });
    }

    this._debugInfoMap.set(deviceId, debugEntries);
  }

  // ─── Config Helpers ──────────────────────────────────────────

  private _getAllProxies(config: BLELivemapConfig): ProxyConfig[] {
    const globalProxies = config.proxies || [];
    const floorProxies: ProxyConfig[] = [];
    for (const floor of this._getFloors(config)) {
      if (floor.proxies) {
        floorProxies.push(...floor.proxies);
      }
    }
    return [...globalProxies, ...floorProxies];
  }

  private _getFloors(config: BLELivemapConfig): FloorConfig[] {
    const floors = config.floors || [];
    if (floors.length === 0 && config.floorplan_image) {
      return [{
        id: "default",
        name: "Floor 1",
        image: config.floorplan_image,
        image_width: config.image_width || 20,
        image_height: config.image_height || 15,
      }];
    }
    return floors;
  }
}
