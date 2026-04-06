/**
 * ha-ble-livemap — Tracking Engine
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * The single source of truth for all live device tracking logic.
 * Both the panel (editor) and the Lovelace card use this engine
 * so that tracking results are identical everywhere.
 *
 * Responsibilities:
 * - Collect BLE distances from Bermuda sensors
 * - Read Bermuda Area (room determination) with debounce
 * - Resolve device floor via gateway logic
 * - Trilaterate position (with Kalman-smoothed distances)
 * - Constrain position to area zone polygon
 * - Resolve zone connectivity (door-based transitions)
 * - Record position history (optional)
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

/** Per-device zone tracking state for room connectivity */
interface DeviceZoneState {
  current_zone_id: string | null;
  last_door_passage: number;
  last_door_target_zone: string | null;
  override_start: number;
  override_candidate_zone: string | null;
  approaching_door: string | null;
  prev_distance_to_door: number | null;
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
  distance: number | null;
  sensorId: string;
  placed: boolean;
}

/** Options for creating a TrackingEngine */
export interface TrackingEngineOptions {
  enableHistory?: boolean;
  historyRetention?: number; // minutes
  historyTrailLength?: number;
}

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

  // Debug info (populated during update)
  private _debugInfo: ProxyDebugInfo[] = [];

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
   */
  update(hass: HomeAssistant, config: BLELivemapConfig): DeviceState[] {
    if (!hass?.states || !config?.tracked_devices) return [];

    const devices: DeviceState[] = [];
    const proxies = this._getAllProxies(config);
    const floors = this._getFloors(config);
    const zones = config.zones || [];
    const hasMultipleFloors = floors.length > 1;
    const hasZones = zones.length > 0;
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

    // Refresh zone ↔ HA Area mapping every 30 seconds
    if (hasZones && (now - this._zoneAreaMapStamp > 30_000)) {
      this._zoneAreaMap = resolveZoneAreaMap(
        zones, proxies, hass,
        this._areaRegistry.size > 0 ? this._areaRegistry : undefined,
      );
      this._zoneAreaMapStamp = now;
    }

    // Reset debug info
    this._debugInfo = [];

    for (const deviceConfig of config.tracked_devices) {
      const deviceId = deviceConfig.entity_prefix || deviceConfig.bermuda_device_id || "";
      if (!deviceId) continue;

      const distances = collectDeviceDistances(
        hass, deviceConfig.entity_prefix || "", proxies, applyRssiCalibration,
      );

      // Collect debug info for ALL proxies
      this._collectDebugInfo(hass, deviceConfig, proxies, floors, config);

      let position: DevicePosition | null = null;

      // ── Layer 1: Read Bermuda Area (room determination) ──
      let bermudaArea: { areaId: string; areaName: string } | null = null;
      let areaZone: ZoneConfig | null = null;
      let confirmedAreaName: string | null = null;

      if (hasZones && deviceConfig.entity_prefix) {
        bermudaArea = readDeviceArea(hass, deviceConfig.entity_prefix);

        if (bermudaArea) {
          confirmedAreaName = this._debounceAreaChange(deviceId, bermudaArea.areaName);

          if (confirmedAreaName) {
            const floorId = hasMultipleFloors
              ? this._resolveDeviceFloor(deviceId, distances, proxies, config, floors)
              : null;

            // Find zone via pre-resolved zone area map
            for (const zone of zones) {
              if (floorId && zone.floor_id && zone.floor_id !== floorId) continue;
              const mapping = this._zoneAreaMap.get(zone.id);
              if (mapping && mapping.areaName.toLowerCase().trim() === confirmedAreaName.toLowerCase().trim()) {
                areaZone = zone;
                break;
              }
            }

            // Fallback: direct name/id matching
            if (!areaZone) {
              areaZone = findZoneForArea(zones, bermudaArea.areaId, confirmedAreaName, floorId);
            }
          }
        }
      }

      // ── Layer 2: Trilateration (intra-room positioning) ──
      if (distances.length >= 1) {
        const proxyMap = new Map<string, { x: number; y: number }>();

        let resolvedFloorId: string | null = null;
        if (hasMultipleFloors) {
          resolvedFloorId = this._resolveDeviceFloor(deviceId, distances, proxies, config, floors);
        }

        // Only use proxies on the resolved floor
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
              let finalX = smoothed.x;
              let finalY = smoothed.y;

              // Zone constraint: keep device inside the Bermuda-determined room
              if (areaZone && areaZone.points?.length >= 3) {
                const constrained = constrainToPolygon(finalX, finalY, areaZone.points);
                finalX = constrained.x;
                finalY = constrained.y;
              }

              position = {
                x: finalX,
                y: finalY,
                accuracy: smoothed.accuracy,
                confidence: smoothed.confidence,
                timestamp: Date.now(),
                floor_id: resolvedFloorId || undefined,
              };

              this._previousPositions.set(deviceId, position);
            }
          }
        }
      }

      // ── Layer 3: Zone connectivity (door-based transitions) ──
      if (position && !areaZone && (config.doors?.length || 0) > 0) {
        const resolvedZone = this._resolveDeviceZone(
          deviceId,
          { x: position.x, y: position.y },
          position.floor_id || null,
          config,
        );
        if (resolvedZone) {
          const posZone = this._findZoneForPosition(
            position.x, position.y, position.floor_id || null, config,
          );
          if (posZone && posZone !== resolvedZone) {
            const prevPos = this._previousPositions.get(deviceId);
            if (prevPos) {
              position = { ...position, x: prevPos.x, y: prevPos.y };
              this._previousPositions.set(deviceId, position);
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
        area: confirmedAreaName || null,
        last_seen: position ? Date.now() : 0,
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

  /** Get debug info from the last update() call. */
  getDebugInfo(): ProxyDebugInfo[] {
    return this._debugInfo;
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
    this._debugInfo = [];
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

  // ─── Zone Connectivity ───────────────────────────────────────

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

  private _zonesConnected(zoneA: string, zoneB: string, config: BLELivemapConfig): DoorConfig | null {
    return (config.doors || []).find(
      (d) =>
        (d.zone_a === zoneA && d.zone_b === zoneB) ||
        (d.zone_a === zoneB && d.zone_b === zoneA),
    ) || null;
  }

  private _findZonePath(zoneA: string, zoneB: string, config: BLELivemapConfig): number {
    if (zoneA === zoneB) return 0;
    const doors = config.doors || [];
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

  private _resolveDeviceZone(
    deviceId: string,
    position: { x: number; y: number },
    floorId: string | null,
    config: BLELivemapConfig,
  ): string | null {
    const zones = config.zones || [];
    const doors = config.doors || [];
    if (zones.length === 0) return null;

    // No doors → simple zone detection
    if (doors.length === 0) {
      return this._findZoneForPosition(position.x, position.y, floorId, config);
    }

    const now = Date.now();
    const overrideTimeout = (config.zone_override_timeout ?? 45) * 1000;

    let zoneState = this._deviceZoneState.get(deviceId);
    if (!zoneState) {
      const initialZone = this._findZoneForPosition(position.x, position.y, floorId, config);
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

    const positionZone = this._findZoneForPosition(position.x, position.y, floorId, config);

    if (!positionZone || positionZone === zoneState.current_zone_id) {
      zoneState.override_start = 0;
      zoneState.override_candidate_zone = null;
      return zoneState.current_zone_id;
    }

    const currentZone = zoneState.current_zone_id;
    if (!currentZone) {
      zoneState.current_zone_id = positionZone;
      return positionZone;
    }

    // Check direct door connection
    const connectingDoor = this._zonesConnected(currentZone, positionZone, config);

    if (connectingDoor) {
      const doorDist = Math.sqrt(
        Math.pow(position.x - connectingDoor.x, 2) +
        Math.pow(position.y - connectingDoor.y, 2),
      );

      if (doorDist < 15 || (now - (zoneState.override_start || now)) > 5000) {
        zoneState.current_zone_id = positionZone;
        zoneState.override_start = 0;
        zoneState.override_candidate_zone = null;
        zoneState.approaching_door = null;
        return positionZone;
      }

      if (zoneState.override_candidate_zone !== positionZone) {
        zoneState.override_candidate_zone = positionZone;
        zoneState.override_start = now;
      }
      return zoneState.current_zone_id;
    }

    // Check path through doors
    const pathLen = this._findZonePath(currentZone, positionZone, config);

    if (pathLen > 0 && pathLen <= 3) {
      if (zoneState.override_candidate_zone === positionZone) {
        if ((now - zoneState.override_start) >= overrideTimeout * 0.5) {
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
      if (zoneState.override_candidate_zone === positionZone) {
        if ((now - zoneState.override_start) >= overrideTimeout) {
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

    return zoneState.current_zone_id;
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
    const activeFloorId = floors[0]?.id || "";

    for (const proxy of allProxies) {
      const proxyName = extractProxySlug(proxy.entity_id);
      const sensorId = `sensor.bermuda_${rawSlug}_distance_to_${proxyName}`;
      const state = hass.states[sensorId];
      const dist = state && !isNaN(parseFloat(state.state)) ? parseFloat(state.state) : null;
      const isPlaced = (proxy.x > 0 || proxy.y > 0) && (!proxy.floor_id || proxy.floor_id === activeFloorId);

      this._debugInfo.push({
        proxyName: proxy.name || proxyName,
        proxyId: proxyName,
        distance: dist,
        sensorId,
        placed: isPlaced,
      });
    }
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
