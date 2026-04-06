/**
 * ha-ble-livemap — Bermuda Entity Utilities
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * Centralized helpers for parsing Bermuda entity IDs, extracting device
 * slugs, proxy slugs, building sensor entity IDs, and discovering
 * proxies and devices from Home Assistant state.
 *
 * Every file that needs to work with Bermuda naming conventions should
 * import from this module instead of duplicating regex chains.
 */

import { HomeAssistant, ProxyConfig, ProxyDistance, ProxyCalibration, ZoneConfig } from "./types";

// ─── Slug Extraction ────────────────────────────────────────────────

/**
 * Extract the Bermuda device slug from an entity prefix.
 *
 * Examples:
 *   "device_tracker.bermuda_abc123_bermuda_tracker" → "abc123"
 *   "sensor.bermuda_abc123_distance"                → "abc123"
 *   "sensor.bermuda_abc123"                         → "abc123"
 *   "bermuda_abc123"                                → "abc123"
 */
export function extractDeviceSlug(prefix: string): string {
  if (!prefix) return "";
  return prefix
    .replace(/^device_tracker\.bermuda_/, "")
    .replace(/^sensor\.bermuda_/, "")
    .replace(/^bermuda_/, "")
    .replace(/_bermuda_tracker$/, "")
    .replace(/_distance$/, "");
}

/**
 * Extract the raw proxy slug from a proxy entity_id stored in config.
 *
 * Config may store proxy IDs in several legacy formats:
 *   "ble_proxy_shelly_koksbord"     → "shelly_koksbord"
 *   "bermuda_proxy_shelly_koksbord" → "shelly_koksbord"
 *   "sensor.something"              → "something"
 *   "shelly_koksbord"               → "shelly_koksbord"
 */
export function extractProxySlug(proxyEntityId: string): string {
  if (!proxyEntityId) return "";
  return proxyEntityId
    .replace(/^ble_proxy_/, "")
    .replace(/^bermuda_proxy_/, "")
    .replace(/^.*\./, "")
    .replace(/_proxy$/, "");
}

// ─── Sensor Entity ID Construction ──────────────────────────────────

/**
 * Build the primary Bermuda distance sensor entity ID.
 *
 * Bermuda creates sensors named:
 *   sensor.bermuda_{deviceSlug}_distance_to_{proxySlug}
 */
export function buildDistanceSensorId(deviceSlug: string, proxySlug: string): string {
  return `sensor.bermuda_${deviceSlug}_distance_to_${proxySlug}`;
}

/**
 * Return an ordered list of candidate entity IDs for a given
 * device + proxy combination. The first match wins.
 */
export function getDistanceSensorCandidates(
  deviceSlug: string,
  proxySlug: string,
  rawPrefix: string
): string[] {
  return [
    // Primary: standard Bermuda naming
    buildDistanceSensorId(deviceSlug, proxySlug),
    // Legacy fallbacks (older Bermuda versions or custom setups)
    `${rawPrefix}_${proxySlug}_distance`,
    `${rawPrefix}_distance_${proxySlug}`,
  ];
}

// ─── Distance Collection ────────────────────────────────────────────

/**
 * Collect distances from Bermuda sensors for a single tracked device.
 *
 * This replaces the duplicated `_getDeviceDistances` / `_getDeviceDistancesForPanel`
 * methods that existed in ble-livemap-card.ts and panel.ts.
 *
 * Strategy 1: Individual `sensor.bermuda_*_distance_to_*` sensors (preferred).
 * Strategy 2: `scanners` attribute on the main distance sensor.
 * Strategy 3: `scanners` attribute on the device_tracker entity.
 */
export function collectDeviceDistances(
  hass: HomeAssistant,
  entityPrefix: string,
  proxies: ProxyConfig[],
  applyCalibrationFn?: (rssi: number, cal: ProxyCalibration) => number | null
): ProxyDistance[] {
  if (!hass?.states || !entityPrefix) return [];

  const deviceSlug = extractDeviceSlug(entityPrefix);
  const distances: ProxyDistance[] = [];

  // ── Strategy 1: Individual distance-to sensors ──
  for (const proxy of proxies) {
    const proxySlug = extractProxySlug(proxy.entity_id);
    const candidates = getDistanceSensorCandidates(deviceSlug, proxySlug, entityPrefix);

    for (const sensorId of candidates) {
      const state = hass.states[sensorId];
      if (state && !isNaN(parseFloat(state.state))) {
        let dist = parseFloat(state.state);

        // Apply RSSI calibration if available
        if (applyCalibrationFn && proxy.calibration?.ref_rssi !== undefined && state.attributes?.rssi) {
          const calibrated = applyCalibrationFn(state.attributes.rssi, proxy.calibration);
          if (calibrated !== null) dist = calibrated;
        }

        distances.push({
          proxy_entity_id: proxy.entity_id,
          distance: dist,
          rssi: state.attributes?.rssi ?? -80,
          timestamp: new Date(state.last_updated).getTime(),
        });
        break; // first match wins
      }
    }
  }

  if (distances.length > 0) return distances;

  // ── Strategy 2: Main distance sensor attributes ──
  const mainEntity = `${entityPrefix}_distance`;
  const mainState = hass.states[mainEntity];
  if (mainState?.attributes?.scanners) {
    matchScannersToProxies(mainState.attributes.scanners, proxies, distances);
  }

  if (distances.length > 0) return distances;

  // ── Strategy 3: Device tracker entity attributes ──
  const dtEntity = entityPrefix.replace("sensor.bermuda_", "device_tracker.bermuda_");
  const dtState = hass.states[dtEntity];
  if (dtState?.attributes?.scanners) {
    matchScannersToProxies(dtState.attributes.scanners, proxies, distances);
  }

  return distances;
}

/**
 * Match scanner entries from entity attributes to configured proxies.
 * Used by strategies 2 and 3 above.
 */
function matchScannersToProxies(
  scanners: Record<string, any>,
  proxies: ProxyConfig[],
  out: ProxyDistance[]
): void {
  for (const [scannerId, scannerData] of Object.entries(scanners)) {
    const scannerSlug = scannerId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    const matchingProxy = proxies.find((p) => {
      const pSlug = extractProxySlug(p.entity_id);
      return p.entity_id === scannerId || pSlug === scannerSlug || p.name === scannerData?.name;
    });

    if (matchingProxy && scannerData?.distance) {
      out.push({
        proxy_entity_id: matchingProxy.entity_id,
        distance: scannerData.distance,
        rssi: scannerData.rssi ?? -80,
        timestamp: Date.now(),
      });
    }
  }
}

// ─── Discovery Helpers ──────────────────────────────────────────────

/**
 * Discover BLE proxy slugs from Bermuda distance_to sensors.
 *
 * Scans `hass.states` for `sensor.bermuda_*_distance_to_*` (excluding
 * unfiltered variants) and returns a Map of proxySlug → entity IDs.
 */
export function discoverProxySlugs(
  hass: HomeAssistant
): Map<string, { slug: string; friendlyName: string; entityIds: string[] }> {
  const proxyMap = new Map<string, { slug: string; friendlyName: string; entityIds: string[] }>();
  if (!hass?.states) return proxyMap;

  for (const entityId of Object.keys(hass.states)) {
    const eid = entityId.toLowerCase();
    if (
      eid.startsWith("sensor.bermuda_") &&
      eid.includes("_distance_to_") &&
      !eid.includes("_unfiltered_distance_to_")
    ) {
      const parts = eid.split("_distance_to_");
      if (parts.length >= 2) {
        const slug = parts[parts.length - 1];
        if (proxyMap.has(slug)) {
          proxyMap.get(slug)!.entityIds.push(entityId);
        } else {
          const friendlyName = slug
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          proxyMap.set(slug, { slug, friendlyName, entityIds: [entityId] });
        }
      }
    }
  }

  return proxyMap;
}

/**
 * Discover trackable Bermuda devices (device_tracker.bermuda_*).
 */
export function discoverTrackableDevices(
  hass: HomeAssistant
): { entityId: string; friendlyName: string; state: string }[] {
  if (!hass?.states) return [];

  const devices: { entityId: string; friendlyName: string; state: string }[] = [];

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    if (entityId.toLowerCase().startsWith("device_tracker.bermuda_")) {
      devices.push({
        entityId,
        friendlyName: stateObj?.attributes?.friendly_name || entityId,
        state: stateObj?.state || "",
      });
    }
  }

  return devices.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
}

/**
 * Discover Bermuda device prefixes from state (for the editor dropdown).
 *
 * Looks for sensor entities containing "bermuda" and extracts unique
 * prefixes by stripping known suffixes.
 */
export function discoverDevicePrefixes(
  hass: HomeAssistant
): { prefix: string; name: string }[] {
  if (!hass?.states) return [];

  const prefixes = new Map<string, string>();
  const knownSuffixes = ["distance", "area", "rssi", "power", "scanner"];

  for (const entityId of Object.keys(hass.states)) {
    if (!entityId.includes("bermuda")) continue;

    const parts = entityId.split("_");
    const lastPart = parts[parts.length - 1];

    if (knownSuffixes.includes(lastPart)) {
      const prefix = parts.slice(0, -1).join("_");
      if (!prefixes.has(prefix)) {
        const name = hass.states[entityId]?.attributes?.friendly_name || prefix;
        const cleanName = name.replace(/ (Distance|Area|RSSI|Power|Scanner)$/i, "");
        prefixes.set(prefix, cleanName);
      }
    }
  }

  return Array.from(prefixes.entries()).map(([prefix, name]) => ({ prefix, name }));
}

// ─── Geometry Helpers ───────────────────────────────────────────────

/**
 * Calculate the centroid (center of mass) of a polygon.
 */
export function getPolygonCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 50, y: 50 };
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / points.length, y: cy / points.length };
}

/**
 * Point-in-polygon test using the ray-casting algorithm.
 */
export function isPointInPolygon(
  x: number,
  y: number,
  points: { x: number; y: number }[]
): boolean {
  if (points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Area & Zone-Constrained Positioning ──────────────────────────

/**
 * Read the Bermuda Area sensor for a tracked device.
 *
 * Bermuda creates `sensor.bermuda_{deviceSlug}_area` whose state is the
 * HA Area name (e.g. "Kitchen", "Living Room").
 * It also exposes `area_id` and `area_name` as attributes.
 *
 * Returns `{ areaId, areaName }` or null if unavailable.
 */
export function readDeviceArea(
  hass: HomeAssistant,
  entityPrefix: string
): { areaId: string; areaName: string } | null {
  if (!hass?.states || !entityPrefix) return null;

  const deviceSlug = extractDeviceSlug(entityPrefix);

  // Try the standard Bermuda area sensor
  const candidates = [
    `sensor.bermuda_${deviceSlug}_area`,
    `${entityPrefix}_area`,
  ];

  for (const sensorId of candidates) {
    const state = hass.states[sensorId];
    if (state && state.state && state.state !== "unknown" && state.state !== "unavailable") {
      return {
        areaId: state.attributes?.area_id || "",
        areaName: state.state,
      };
    }
  }

  // Fallback: check device_tracker attributes
  const dtEntity = entityPrefix.replace("sensor.bermuda_", "device_tracker.bermuda_");
  const dtState = hass.states[dtEntity];
  if (dtState?.attributes?.area_name) {
    return {
      areaId: dtState.attributes.area_id || "",
      areaName: dtState.attributes.area_name,
    };
  }

  return null;
}

/**
 * Find the zone that matches a Bermuda Area.
 *
 * Matching priority:
 * 1. Zone has `ha_area_id` set and it matches the Bermuda area_id
 * 2. Zone name matches the Bermuda area name (case-insensitive)
 */
export function findZoneForArea(
  zones: ZoneConfig[],
  areaId: string,
  areaName: string,
  floorId?: string | null
): ZoneConfig | null {
  if (!zones || zones.length === 0) return null;

  // Priority 1: Explicit ha_area_id match
  for (const zone of zones) {
    if (floorId && zone.floor_id && zone.floor_id !== floorId) continue;
    if (zone.ha_area_id && zone.ha_area_id === areaId) return zone;
  }

  // Priority 2: Name match (case-insensitive)
  const normalizedAreaName = areaName.toLowerCase().trim();
  for (const zone of zones) {
    if (floorId && zone.floor_id && zone.floor_id !== floorId) continue;
    if (zone.name && zone.name.toLowerCase().trim() === normalizedAreaName) return zone;
  }

  return null;
}

/**
 * Constrain a point to lie inside a polygon.
 *
 * If the point is already inside, returns it unchanged.
 * Otherwise, finds the nearest point on the polygon boundary.
 *
 * All coordinates are in percentage (0-100) space.
 */
export function constrainToPolygon(
  x: number,
  y: number,
  points: { x: number; y: number }[]
): { x: number; y: number } {
  if (points.length < 3) return { x, y };
  if (isPointInPolygon(x, y, points)) return { x, y };

  // Find the nearest point on any edge of the polygon
  let nearestX = x;
  let nearestY = y;
  let minDist = Infinity;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const closest = nearestPointOnSegment(
      x, y,
      points[j].x, points[j].y,
      points[i].x, points[i].y
    );
    const dx = x - closest.x;
    const dy = y - closest.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearestX = closest.x;
      nearestY = closest.y;
    }
  }

  return { x: nearestX, y: nearestY };
}

/**
 * Find the nearest point on a line segment to a given point.
 */
function nearestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return { x: ax, y: ay }; // degenerate segment

  // Project point onto the line, clamped to [0, 1]
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: ax + t * dx,
    y: ay + t * dy,
  };
}

// ─── RSSI Calibration ───────────────────────────────────────────────

/**
 * Apply RSSI calibration to estimate distance.
 *
 * Uses the log-distance path-loss model:
 *   distance = refDistance * 10^((refRSSI - measuredRSSI) / (10 * n))
 *
 * where n is the path-loss exponent (default 2.5 for indoor BLE).
 */
export function applyRssiCalibration(
  measuredRssi: number,
  calibration: ProxyCalibration
): number | null {
  if (!calibration?.ref_rssi) return null;

  const refRssi = calibration.ref_rssi;
  const refDist = calibration.ref_distance || 1.0;
  const n = calibration.attenuation || 2.5;

  const distance = refDist * Math.pow(10, (refRssi - measuredRssi) / (10 * n));

  // Sanity check: BLE distances should be 0-50m
  if (distance < 0 || distance > 50 || isNaN(distance)) return null;

  return Math.round(distance * 100) / 100;
}
