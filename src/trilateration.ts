/**
 * ha-ble-livemap - Trilateration Engine
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * Calculates device position from distances to known proxy positions
 * using weighted least-squares trilateration.
 */

import { TrilaterationResult, ProxyConfig, ProxyDistance } from "./types";

interface Point {
  x: number;
  y: number;
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Weighted least-squares trilateration.
 * Uses inverse-distance weighting so closer (more reliable) proxies
 * have greater influence on the result.
 */
export function trilaterate(
  proxyPositions: Map<string, Point>,
  distances: ProxyDistance[],
  imageWidth: number,
  imageHeight: number,
  realWidth: number,
  realHeight: number
): TrilaterationResult | null {
  // Filter to only proxies we have positions for and valid distances
  const circles: Circle[] = [];
  const weights: number[] = [];

  for (const d of distances) {
    const pos = proxyPositions.get(d.proxy_entity_id);
    if (!pos || d.distance <= 0 || d.distance > 50) continue;

    // Convert proxy position from percentage to real-world meters
    const realX = (pos.x / 100) * realWidth;
    const realY = (pos.y / 100) * realHeight;

    circles.push({ x: realX, y: realY, r: d.distance });

    // Weight: closer distances are more reliable
    // Use inverse square of distance for weighting
    const weight = 1 / (d.distance * d.distance + 0.1);
    weights.push(weight);
  }

  if (circles.length === 0) return null;

  // Single proxy: return proxy position with large accuracy circle
  if (circles.length === 1) {
    const c = circles[0];
    return {
      x: (c.x / realWidth) * 100,
      y: (c.y / realHeight) * 100,
      accuracy: Math.min(c.r * 2, 15),
      confidence: 0.3,
    };
  }

  // Two proxies: use midpoint weighted by distance
  if (circles.length === 2) {
    const totalWeight = weights[0] + weights[1];
    const wx = (circles[0].x * weights[0] + circles[1].x * weights[1]) / totalWeight;
    const wy = (circles[0].y * weights[0] + circles[1].y * weights[1]) / totalWeight;
    const avgDist = (circles[0].r + circles[1].r) / 2;

    return {
      x: (wx / realWidth) * 100,
      y: (wy / realHeight) * 100,
      accuracy: Math.min(avgDist * 1.5, 12),
      confidence: 0.5,
    };
  }

  // Three or more proxies: weighted least-squares
  const result = weightedLeastSquares(circles, weights);

  if (!result) return null;

  // Calculate accuracy from residuals
  let residualSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < circles.length; i++) {
    const dx = result.x - circles[i].x;
    const dy = result.y - circles[i].y;
    const actualDist = Math.sqrt(dx * dx + dy * dy);
    const residual = Math.abs(actualDist - circles[i].r);
    residualSum += residual * weights[i];
    totalWeight += weights[i];
  }
  const avgResidual = residualSum / totalWeight;

  // Confidence based on number of proxies and residual
  const proxyBonus = Math.min(circles.length / 6, 1);
  const residualPenalty = Math.max(0, 1 - avgResidual / 10);
  const confidence = Math.min(0.3 + proxyBonus * 0.4 + residualPenalty * 0.3, 1);

  return {
    x: Math.max(0, Math.min(100, (result.x / realWidth) * 100)),
    y: Math.max(0, Math.min(100, (result.y / realHeight) * 100)),
    accuracy: Math.max(0.5, Math.min(avgResidual * 2, 10)),
    confidence,
  };
}

/**
 * Weighted least-squares solver for trilateration.
 * Linearizes the circle equations and solves via normal equations.
 */
function weightedLeastSquares(circles: Circle[], weights: number[]): Point | null {
  const n = circles.length;

  // Use the last circle as reference to linearize
  const refIdx = n - 1;
  const xr = circles[refIdx].x;
  const yr = circles[refIdx].y;
  const dr = circles[refIdx].r;

  // Build the linear system: A * [x, y]^T = b
  // From: (x - xi)^2 + (y - yi)^2 = di^2
  //       (x - xr)^2 + (y - yr)^2 = dr^2
  // Subtracting: 2(xr-xi)x + 2(yr-yi)y = dr^2 - di^2 - xr^2 + xi^2 - yr^2 + yi^2

  let ATA00 = 0, ATA01 = 0, ATA11 = 0;
  let ATb0 = 0, ATb1 = 0;

  for (let i = 0; i < n - 1; i++) {
    const xi = circles[i].x;
    const yi = circles[i].y;
    const di = circles[i].r;
    const w = weights[i];

    const a0 = 2 * (xr - xi);
    const a1 = 2 * (yr - yi);
    const bi = dr * dr - di * di - xr * xr + xi * xi - yr * yr + yi * yi;

    ATA00 += w * a0 * a0;
    ATA01 += w * a0 * a1;
    ATA11 += w * a1 * a1;
    ATb0 += w * a0 * bi;
    ATb1 += w * a1 * bi;
  }

  // Solve 2x2 system
  const det = ATA00 * ATA11 - ATA01 * ATA01;
  if (Math.abs(det) < 1e-10) {
    // Degenerate case: proxies are collinear
    // Fall back to weighted centroid
    return weightedCentroid(circles, weights);
  }

  const x = (ATA11 * ATb0 - ATA01 * ATb1) / det;
  const y = (ATA00 * ATb1 - ATA01 * ATb0) / det;

  return { x, y };
}

/**
 * Fallback: weighted centroid based on inverse distance.
 */
function weightedCentroid(circles: Circle[], weights: number[]): Point {
  let totalWeight = 0;
  let wx = 0;
  let wy = 0;

  for (let i = 0; i < circles.length; i++) {
    wx += circles[i].x * weights[i];
    wy += circles[i].y * weights[i];
    totalWeight += weights[i];
  }

  return {
    x: wx / totalWeight,
    y: wy / totalWeight,
  };
}

/**
 * Smooth position using exponential moving average.
 */
export function smoothPosition(
  current: TrilaterationResult | null,
  previous: TrilaterationResult | null,
  alpha: number = 0.3
): TrilaterationResult | null {
  if (!current) return previous;
  if (!previous) return current;

  return {
    x: previous.x + alpha * (current.x - previous.x),
    y: previous.y + alpha * (current.y - previous.y),
    accuracy: previous.accuracy + alpha * (current.accuracy - previous.accuracy),
    confidence: previous.confidence + alpha * (current.confidence - previous.confidence),
  };
}
