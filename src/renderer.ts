/**
 * ha-ble-livemap - Canvas Renderer
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * High-performance Canvas2D renderer for device positions,
 * gradient accuracy circles, history trails, and proxy indicators.
 */

import { DeviceState, ProxyConfig, BLELivemapConfig } from "./types";

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  isDark: boolean;
}

// Animation state for smooth transitions
const animatedPositions: Map<string, { x: number; y: number; accuracy: number }> = new Map();
const ANIMATION_SPEED = 0.08;

/**
 * Main render function - called on every animation frame.
 */
export function render(
  rc: RenderContext,
  devices: DeviceState[],
  proxies: ProxyConfig[],
  config: BLELivemapConfig,
  activeFloor: string | null
): void {
  const { ctx, width, height, dpr } = rc;

  // Clear canvas
  ctx.clearRect(0, 0, width * dpr, height * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // Draw signal coverage overlay
  if (config.show_signal_overlay) {
    drawSignalOverlay(rc, proxies, activeFloor);
  }

  // Draw proxy indicators
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

    // Draw history trail
    if (device.config.show_trail !== false && device.history.length > 1) {
      drawTrail(rc, device, width, height);
    }
  }

  // Draw device positions on top of trails
  for (const device of devices) {
    if (!device.position) continue;
    if (activeFloor && device.position.floor_id && device.position.floor_id !== activeFloor) continue;

    drawDevice(rc, device, width, height, config);
  }

  ctx.restore();
}

/**
 * Draw a BLE proxy indicator on the map.
 */
function drawProxy(rc: RenderContext, proxy: ProxyConfig): void {
  const { ctx, width, height, isDark } = rc;
  const x = (proxy.x / 100) * width;
  const y = (proxy.y / 100) * height;
  const radius = 6;

  // Outer ring
  ctx.beginPath();
  ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  const color = proxy.color || (isDark ? "#546E7A" : "#90A4AE");
  ctx.fillStyle = color;
  ctx.fill();

  // Bluetooth icon (simplified)
  ctx.fillStyle = isDark ? "#fff" : "#fff";
  ctx.font = `bold ${radius}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", x, y);

  // Label
  if (proxy.name) {
    ctx.font = `10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(proxy.name, x, y + radius + 6);
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
  const { ctx, isDark } = rc;
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

  // Parse color to RGB
  const rgb = hexToRgb(color);

  // Gradient accuracy circle (faded)
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

  // Pulsing outer ring
  const pulsePhase = (Date.now() % 3000) / 3000;
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
    ctx.font = `600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Label background
    const metrics = ctx.measureText(label);
    const labelX = x;
    const labelY = y + 14;
    const padding = 4;

    ctx.fillStyle = isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)";
    const bgRadius = 4;
    roundRect(
      ctx,
      labelX - metrics.width / 2 - padding,
      labelY - 1,
      metrics.width + padding * 2,
      14,
      bgRadius
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

  // Create coverage gradient for each proxy
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
