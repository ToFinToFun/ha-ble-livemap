/**
 * ha-ble-livemap - Canvas Renderer
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * High-performance Canvas2D renderer for device positions,
 * gradient accuracy circles, history trails, zones, and proxy indicators.
 *
 * Optimizations:
 * - Static elements (zones, doors) are rendered to an offscreen canvas
 *   and only redrawn when configuration changes.
 * - A shared `frameTime` is computed once per frame instead of calling
 *   Date.now() multiple times.
 * - Font strings are defined as constants to avoid repeated allocation.
 */

import { DeviceState, ProxyConfig, ZoneConfig, DoorConfig, BLELivemapConfig } from "./types";

// ─── Constants ────────────────────────────────────────────────────

const FONT_LABEL = `500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
const FONT_DEVICE = `600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
const FONT_PROXY = `10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
const FONT_DOOR = `9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  isDark: boolean;
  frameTime: number; // shared timestamp for all animations this frame
}

// ─── Animation State ──────────────────────────────────────────────

const animatedPositions: Map<string, { x: number; y: number; accuracy: number }> = new Map();
const ANIMATION_SPEED = 0.08;

// ─── Offscreen Canvas Cache ───────────────────────────────────────

/**
 * Cache for static layer (zones + doors).
 * Invalidated when config fingerprint changes.
 */
let staticCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let staticFingerprint = "";
let staticWidth = 0;
let staticHeight = 0;
let staticDpr = 1;

/**
 * Generate a fingerprint for the static layer configuration.
 * If this changes, we need to re-render the offscreen canvas.
 */
function getStaticFingerprint(
  zones: ZoneConfig[],
  doors: DoorConfig[],
  config: BLELivemapConfig,
  activeFloor: string | null,
  width: number,
  height: number,
  dpr: number,
  isDark: boolean
): string {
  // Include dimensions, theme, floor, and a hash of zone/door config
  const zoneHash = zones.map(z =>
    `${z.id}:${z.color}:${z.border_color}:${z.opacity}:${z.show_label}:${z.floor_id}:${z.points.map(p => `${p.x},${p.y}`).join(";")}`
  ).join("|");
  const doorHash = doors.map(d =>
    `${d.id}:${d.x}:${d.y}:${d.type}:${d.name}:${d.floor_id}`
  ).join("|");
  return `${width}x${height}@${dpr}:${isDark}:${activeFloor}:${config.show_zones}:${config.show_zone_labels}:${config.show_doors}:${zoneHash}:${doorHash}`;
}

/**
 * Render static elements (zones, doors) to the offscreen canvas.
 */
function renderStaticLayer(
  zones: ZoneConfig[],
  doors: DoorConfig[],
  config: BLELivemapConfig,
  activeFloor: string | null,
  width: number,
  height: number,
  dpr: number,
  isDark: boolean
): void {
  // Create or resize offscreen canvas
  const pixelWidth = Math.ceil(width * dpr);
  const pixelHeight = Math.ceil(height * dpr);

  if (typeof OffscreenCanvas !== "undefined") {
    staticCanvas = new OffscreenCanvas(pixelWidth, pixelHeight);
  } else {
    staticCanvas = document.createElement("canvas");
    staticCanvas.width = pixelWidth;
    staticCanvas.height = pixelHeight;
  }

  staticWidth = width;
  staticHeight = height;
  staticDpr = dpr;

  const ctx = staticCanvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) return;

  ctx.clearRect(0, 0, pixelWidth, pixelHeight);
  ctx.save();
  ctx.scale(dpr, dpr);

  const rc: RenderContext = { ctx: ctx as CanvasRenderingContext2D, width, height, dpr, isDark, frameTime: Date.now() };

  // Draw zones
  if (config.show_zones !== false && zones.length > 0) {
    for (const zone of zones) {
      if (activeFloor && zone.floor_id && zone.floor_id !== activeFloor) continue;
      drawZone(rc, zone, config.show_zone_labels !== false);
    }
  }

  // Draw doors
  if (config.show_doors !== false && doors.length > 0) {
    for (const door of doors) {
      if (activeFloor && door.floor_id && door.floor_id !== activeFloor) continue;
      drawDoor(rc, door);
    }
  }

  ctx.restore();
}

// ─── Main Render Function ─────────────────────────────────────────

/**
 * Main render function - called on every animation frame.
 */
export function render(
  rc: RenderContext,
  devices: DeviceState[],
  proxies: ProxyConfig[],
  zones: ZoneConfig[],
  doors: DoorConfig[],
  config: BLELivemapConfig,
  activeFloor: string | null
): void {
  const { ctx, width, height, dpr } = rc;

  // Compute shared frame timestamp once
  rc.frameTime = Date.now();

  // Clear canvas
  ctx.clearRect(0, 0, width * dpr, height * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // ── Static layer (zones + doors) via offscreen canvas ──
  const fp = getStaticFingerprint(zones, doors, config, activeFloor, width, height, dpr, rc.isDark);
  if (fp !== staticFingerprint || !staticCanvas) {
    renderStaticLayer(zones, doors, config, activeFloor, width, height, dpr, rc.isDark);
    staticFingerprint = fp;
  }

  // Blit the static layer onto the main canvas
  if (staticCanvas && staticWidth === width && staticHeight === height) {
    ctx.save();
    ctx.scale(1 / dpr, 1 / dpr); // undo the dpr scale for the blit
    ctx.drawImage(staticCanvas as any, 0, 0);
    ctx.restore();
  }

  // Draw signal coverage overlay (semi-static but cheap)
  if (config.show_signal_overlay) {
    drawSignalOverlay(rc, proxies, activeFloor);
  }

  // Draw proxy indicators (dynamic: gateway pulse animation)
  if (config.show_proxies) {
    for (const proxy of proxies) {
      if (activeFloor && proxy.floor_id && proxy.floor_id !== activeFloor) continue;
      drawProxy(rc, proxy);
    }
  }

  // Draw devices (trails first, then dots on top)
  for (const device of devices) {
    if (!device.position) continue;
    if (activeFloor && device.position.floor_id && device.position.floor_id !== activeFloor) continue;

    if (device.config.show_trail !== false && device.history.length > 1) {
      drawTrail(rc, device, width, height);
    }
  }

  for (const device of devices) {
    if (!device.position) continue;
    if (activeFloor && device.position.floor_id && device.position.floor_id !== activeFloor) continue;

    drawDevice(rc, device, width, height, config);
  }

  ctx.restore();
}

// ─── Drawing Functions ────────────────────────────────────────────

/**
 * Draw a zone polygon on the map.
 */
function drawZone(rc: RenderContext, zone: ZoneConfig, showLabel: boolean): void {
  const { ctx, width, height, isDark } = rc;
  const points = zone.points;

  if (!points || points.length < 3) return;

  const fillColor = zone.color || "#4FC3F7";
  const borderColor = zone.border_color || fillColor;
  const opacity = zone.opacity ?? 0.12;
  const rgb = hexToRgb(fillColor);
  const borderRgb = hexToRgb(borderColor);

  // Draw filled polygon
  ctx.beginPath();
  ctx.moveTo((points[0].x / 100) * width, (points[0].y / 100) * height);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo((points[i].x / 100) * width, (points[i].y / 100) * height);
  }
  ctx.closePath();

  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`;
  ctx.fill();

  // Draw border
  ctx.strokeStyle = `rgba(${borderRgb.r},${borderRgb.g},${borderRgb.b},${Math.min(opacity * 3, 0.6)})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw label at centroid
  if (showLabel && zone.show_label !== false && zone.name) {
    const centroid = getPolygonCentroid(points);
    const cx = (centroid.x / 100) * width;
    const cy = (centroid.y / 100) * height;

    ctx.font = FONT_LABEL;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const metrics = ctx.measureText(zone.name);
    const padding = 5;
    const bgX = cx - metrics.width / 2 - padding;
    const bgY = cy - 8;
    const bgW = metrics.width + padding * 2;
    const bgH = 16;

    ctx.fillStyle = isDark ? `rgba(0,0,0,0.55)` : `rgba(255,255,255,0.75)`;
    roundRect(ctx, bgX, bgY, bgW, bgH, 4);
    ctx.fill();

    ctx.fillStyle = `rgba(${borderRgb.r},${borderRgb.g},${borderRgb.b},0.8)`;
    ctx.fillText(zone.name, cx, cy);
  }
}

/**
 * Calculate centroid of a polygon.
 */
function getPolygonCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / points.length, y: cy / points.length };
}

// Gateway type icon characters for canvas rendering
const GATEWAY_ICONS: Record<string, string> = {
  stairway: "\u2191", // ↑ arrow
  elevator: "\u25A0", // ■ square
  door: "\u25C6",     // ◆ diamond
  passage: "\u25CF",  // ● circle
};

/**
 * Draw a BLE proxy indicator on the map.
 * Gateway proxies get a distinct visual treatment with colored ring and icon.
 */
function drawProxy(rc: RenderContext, proxy: ProxyConfig): void {
  const { ctx, width, height, isDark, frameTime } = rc;
  const x = (proxy.x / 100) * width;
  const y = (proxy.y / 100) * height;
  const radius = 6;
  const isGateway = proxy.is_gateway === true;
  const isCalibrated = proxy.calibration?.ref_rssi !== undefined;

  if (isGateway) {
    const gwRadius = 9;
    const gwColor = proxy.color || "#FF9800";

    // Pulsing outer ring for gateways
    const pulsePhase = (frameTime % 4000) / 4000;
    const pulseAlpha = 0.15 + Math.sin(pulsePhase * Math.PI * 2) * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, gwRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 152, 0, ${pulseAlpha})`;
    ctx.fill();

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, gwRadius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = gwColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, gwRadius, 0, Math.PI * 2);
    ctx.fillStyle = gwColor;
    ctx.fill();

    // Gateway icon
    const icon = GATEWAY_ICONS[proxy.gateway_type || "passage"] || "G";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${gwRadius}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, x, y);
  } else {
    // Standard proxy rendering
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const color = proxy.color || (isDark ? "#546E7A" : "#90A4AE");
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${radius}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("B", x, y);
  }

  // Calibration indicator: small green dot
  if (isCalibrated) {
    ctx.beginPath();
    ctx.arc(x + (isGateway ? 9 : 6) + 1, y - (isGateway ? 9 : 6) - 1, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#4CAF50";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Label
  const labelText = proxy.name || "";
  const gatewayLabel = isGateway ? ` [${proxy.gateway_type || "GW"}]` : "";
  const fullLabel = labelText + gatewayLabel;

  if (fullLabel) {
    ctx.font = FONT_PROXY;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(fullLabel, x, y + (isGateway ? 13 : radius + 6));
  }
}

/**
 * Draw a door/opening/portal marker on the map.
 */
function drawDoor(rc: RenderContext, door: DoorConfig): void {
  const { ctx, width, height, isDark, frameTime } = rc;
  const x = (door.x / 100) * width;
  const y = (door.y / 100) * height;

  const isPortal = door.type === "portal";
  const isDoor = door.type === "door";
  const size = isPortal ? 10 : 8;

  const color = isPortal ? "#E040FB" : isDoor ? "#FF9800" : "#78909C";
  const rgb = hexToRgb(color);

  if (isPortal) {
    const pulsePhase = (frameTime % 3000) / 3000;
    const pulseAlpha = 0.1 + Math.sin(pulsePhase * Math.PI * 2) * 0.08;

    ctx.beginPath();
    ctx.arc(x, y, size + 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${pulseAlpha})`;
    ctx.fill();

    const bgSize = size * 1.8;
    roundRect(ctx, x - bgSize / 2, y - bgSize / 2, bgSize, bgSize, 4);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw stairway steps icon
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    const stepW = size * 0.35;
    const stepH = size * 0.3;
    const startX = x - size * 0.45;
    const startY = y + size * 0.45;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + stepW, startY);
    ctx.lineTo(startX + stepW, startY - stepH);
    ctx.lineTo(startX + stepW * 2, startY - stepH);
    ctx.lineTo(startX + stepW * 2, startY - stepH * 2);
    ctx.lineTo(startX + stepW * 3, startY - stepH * 2);
    ctx.stroke();
    ctx.lineCap = "butt";
  } else if (isDoor) {
    const w = size * 2;
    const h = size * 1.5;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 3);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${size - 1}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("D", x, y);
  } else {
    // Opening: simple gap indicator
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x - size, y - size * 0.6);
    ctx.lineTo(x - size, y + size * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + size, y - size * 0.6);
    ctx.lineTo(x + size, y + size * 0.6);
    ctx.stroke();

    ctx.lineCap = "butt";
  }

  // Label
  if (door.name) {
    ctx.font = FONT_DOOR;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(door.name, x, y + size + 4);
  }
}

/**
 * Draw a tracked device with gradient accuracy circle.
 */
function drawDevice(
  rc: RenderContext,
  device: DeviceState,
  canvasWidth: number,
  canvasHeight: number,
  config: BLELivemapConfig
): void {
  const { ctx, isDark, frameTime } = rc;
  const pos = device.position!;
  const color = device.config.color || "#4FC3F7";

  // Animate position smoothly
  const key = device.device_id;
  const targetX = (pos.x / 100) * canvasWidth;
  const targetY = (pos.y / 100) * canvasHeight;
  const accuracyPx = Math.max(8, (pos.accuracy / 20) * Math.min(canvasWidth, canvasHeight));

  let anim = animatedPositions.get(key);
  if (!anim) {
    anim = { x: targetX, y: targetY, accuracy: accuracyPx };
    animatedPositions.set(key, anim);
  } else {
    anim.x += (targetX - anim.x) * ANIMATION_SPEED;
    anim.y += (targetY - anim.y) * ANIMATION_SPEED;
    anim.accuracy += (accuracyPx - anim.accuracy) * ANIMATION_SPEED;
  }

  const x = anim.x;
  const y = anim.y;
  const accRadius = anim.accuracy;

  const rgb = hexToRgb(color);

  // Gradient accuracy circle
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, accRadius);
  gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
  gradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`);
  gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);

  ctx.beginPath();
  ctx.arc(x, y, accRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Accuracy ring
  if (config.show_accuracy_indicator) {
    ctx.beginPath();
    ctx.arc(x, y, accRadius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Pulsing outer ring (using shared frameTime)
  const pulsePhase = (frameTime % 3000) / 3000;
  const pulseRadius = 10 + Math.sin(pulsePhase * Math.PI * 2) * 3;
  const pulseAlpha = 0.3 + Math.sin(pulsePhase * Math.PI * 2) * 0.15;

  ctx.beginPath();
  ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${pulseAlpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Core dot
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // White inner dot
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Device label
  if (device.config.show_label !== false) {
    const label = device.config.name || device.name;
    ctx.font = FONT_DEVICE;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const metrics = ctx.measureText(label);
    const labelX = x;
    const labelY = y + 14;
    const padding = 4;

    ctx.fillStyle = isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)";
    roundRect(
      ctx,
      labelX - metrics.width / 2 - padding,
      labelY - 1,
      metrics.width + padding * 2,
      14,
      4
    );
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(label, labelX, labelY + 1);
  }
}

/**
 * Draw history trail as a fading path.
 */
function drawTrail(
  rc: RenderContext,
  device: DeviceState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const { ctx } = rc;
  const trail = device.history;
  const color = device.config.trail_color || device.config.color || "#4FC3F7";
  const rgb = hexToRgb(color);

  if (trail.length < 2) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 1; i < trail.length; i++) {
    const alpha = (i / trail.length) * 0.5;
    const lineWidth = 1 + (i / trail.length) * 2;

    const x1 = (trail[i - 1].x / 100) * canvasWidth;
    const y1 = (trail[i - 1].y / 100) * canvasHeight;
    const x2 = (trail[i].x / 100) * canvasWidth;
    const y2 = (trail[i].y / 100) * canvasHeight;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  // Trail dots at each point
  for (let i = 0; i < trail.length; i++) {
    const alpha = (i / trail.length) * 0.4;
    const dotRadius = 1 + (i / trail.length) * 1.5;
    const x = (trail[i].x / 100) * canvasWidth;
    const y = (trail[i].y / 100) * canvasHeight;

    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    ctx.fill();
  }
}

/**
 * Draw signal coverage heatmap overlay.
 */
function drawSignalOverlay(
  rc: RenderContext,
  proxies: ProxyConfig[],
  activeFloor: string | null
): void {
  const { ctx, width, height } = rc;
  const floorProxies = proxies.filter(
    (p) => !activeFloor || !p.floor_id || p.floor_id === activeFloor
  );

  if (floorProxies.length === 0) return;

  for (const proxy of floorProxies) {
    const x = (proxy.x / 100) * width;
    const y = (proxy.y / 100) * height;
    const maxRadius = Math.min(width, height) * 0.3;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, maxRadius);
    gradient.addColorStop(0, "rgba(76,175,80,0.08)");
    gradient.addColorStop(0.5, "rgba(76,175,80,0.03)");
    gradient.addColorStop(1, "rgba(76,175,80,0)");

    ctx.beginPath();
    ctx.arc(x, y, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

// ─── Utility Functions ────────────────────────────────────────────

/**
 * Draw a rounded rectangle.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Convert hex color to RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 79, g: 195, b: 247 }; // fallback to light blue
}

/**
 * Clean up animation state for removed devices.
 */
export function cleanupAnimations(activeDeviceIds: string[]): void {
  const activeSet = new Set(activeDeviceIds);
  for (const key of animatedPositions.keys()) {
    if (!activeSet.has(key)) {
      animatedPositions.delete(key);
    }
  }
}
