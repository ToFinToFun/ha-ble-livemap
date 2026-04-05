/**
 * ha-ble-livemap - BLE LiveMap Card for Home Assistant
 * Real-time BLE device position tracking on your floor plan.
 *
 * Author: Jerry Paasovaara
 * License: MIT
 * Version: 1.0.0
 */

import { LitElement, html, css, PropertyValues, nothing, CSSResultGroup } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import {
  BLELivemapConfig,
  HomeAssistant,
  DeviceState,
  ProxyConfig,
  ProxyDistance,
  DevicePosition,
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
  documentationURL: "https://github.com/jerrypaasovaara/ha-ble-livemap",
});

console.info(
  `%c BLE-LIVEMAP %c v${CARD_VERSION} `,
  "color: white; background: #4FC3F7; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: #4FC3F7; background: #263238; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

@customElement(CARD_NAME)
export class BLELivemapCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: BLELivemapConfig;
  @state() private _devices: DeviceState[] = [];
  @state() private _activeFloor: string | null = null;
  @state() private _isFullscreen = false;
  @state() private _imageLoaded = false;
  @state() private _imageError = false;
  @state() private _showDevicePanel = false;

  @query("#livemap-canvas") private _canvas!: HTMLCanvasElement;
  @query("#floorplan-img") private _image!: HTMLImageElement;

  private _historyStore: HistoryStore | null = null;
  private _animationFrame: number | null = null;
  private _updateTimer: number | null = null;
  private _previousPositions: Map<string, DevicePosition> = new Map();
  private _lang = "en";
  private _resizeObserver: ResizeObserver | null = null;

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
      ...DEFAULT_CONFIG,
    };
  }

  setConfig(config: BLELivemapConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...DEFAULT_CONFIG, ...config } as BLELivemapConfig;

    // Initialize history store
    if (this._config.history_enabled) {
      this._historyStore = new HistoryStore(
        this._config.history_retention || 60,
        this._config.history_trail_length || 50
      );
      this._historyStore.init();
    }

    // Set active floor
    if (this._config.floors && this._config.floors.length > 0) {
      this._activeFloor = this._config.active_floor || this._config.floors[0].id;
    }
  }

  getCardSize(): number {
    return 6;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._startUpdateLoop();
    this._setupResizeObserver();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopUpdateLoop();
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("hass") && this.hass) {
      this._lang = this.hass.selectedLanguage || this.hass.language || "en";
    }

    if (changedProps.has("_imageLoaded") && this._imageLoaded) {
      this._resizeCanvas();
      this._startRenderLoop();
    }
  }

  // ─── Data Processing ───────────────────────────────────────

  private _startUpdateLoop(): void {
    const interval = (this._config?.update_interval || 2) * 1000;
    this._updateTimer = window.setInterval(() => {
      this._updateDevicePositions();
    }, interval);
    // Initial update
    this._updateDevicePositions();
  }

  private _stopUpdateLoop(): void {
    if (this._updateTimer) {
      clearInterval(this._updateTimer);
      this._updateTimer = null;
    }
  }

  private _updateDevicePositions(): void {
    if (!this.hass || !this._config) return;

    const trackedDevices = this._config.tracked_devices || [];
    const proxies = this._getAllProxies();
    const newDevices: DeviceState[] = [];

    // Build proxy position map
    const proxyPositions = new Map<string, { x: number; y: number }>();
    for (const proxy of proxies) {
      proxyPositions.set(proxy.entity_id, { x: proxy.x, y: proxy.y });
    }

    // Get floor dimensions
    const floor = this._getActiveFloor();
    const realWidth = floor?.image_width || 20;
    const realHeight = floor?.image_height || 15;

    for (let i = 0; i < trackedDevices.length; i++) {
      const deviceConfig = trackedDevices[i];
      const deviceId = deviceConfig.bermuda_device_id || deviceConfig.entity_prefix || `device_${i}`;

      // Collect distances from all proxies for this device
      const distances = this._getDeviceDistances(deviceConfig, proxies);

      // Calculate position via trilateration
      let rawPosition = trilaterate(proxyPositions, distances, 100, 100, realWidth, realHeight);

      // Smooth position
      const prevPos = this._previousPositions.get(deviceId);
      const smoothed = smoothPosition(
        rawPosition
          ? { x: rawPosition.x, y: rawPosition.y, accuracy: rawPosition.accuracy, confidence: rawPosition.confidence }
          : null,
        prevPos
          ? { x: prevPos.x, y: prevPos.y, accuracy: prevPos.accuracy, confidence: prevPos.confidence }
          : null,
        0.25
      );

      let position: DevicePosition | null = null;
      if (smoothed) {
        position = {
          x: smoothed.x,
          y: smoothed.y,
          accuracy: smoothed.accuracy,
          confidence: smoothed.confidence,
          timestamp: Date.now(),
          floor_id: this._activeFloor || undefined,
        };
        this._previousPositions.set(deviceId, position);

        // Store history
        if (this._historyStore && this._config.history_enabled) {
          this._historyStore.addPoint(deviceId, {
            x: position.x,
            y: position.y,
            timestamp: position.timestamp,
            floor_id: position.floor_id,
          });
        }
      }

      // Get area from Bermuda sensor
      const areaEntity = this._findEntity(deviceConfig, "area");
      const area = areaEntity ? this.hass.states[areaEntity]?.state : null;

      // Get nearest proxy
      const nearestEntity = this._findEntity(deviceConfig, "nearest");
      const nearest = nearestEntity ? this.hass.states[nearestEntity]?.state : null;

      // Get history trail
      const trail = this._historyStore ? this._historyStore.getTrail(deviceId) : [];

      newDevices.push({
        device_id: deviceId,
        name: deviceConfig.name || `Device ${i + 1}`,
        position,
        history: trail,
        distances,
        nearest_proxy: nearest,
        area,
        last_seen: position?.timestamp || 0,
        config: {
          ...deviceConfig,
          color: deviceConfig.color || DEVICE_COLORS[i % DEVICE_COLORS.length],
        },
      });
    }

    this._devices = newDevices;
    cleanupAnimations(newDevices.map((d) => d.device_id));
  }

  private _getDeviceDistances(deviceConfig: any, proxies: ProxyConfig[]): ProxyDistance[] {
    const distances: ProxyDistance[] = [];
    if (!this.hass) return distances;

    const prefix = deviceConfig.entity_prefix || "";

    // Strategy 1: Look for individual distance sensors per proxy
    // Bermuda creates sensors like: sensor.bermuda_<device>_<scanner>_distance
    for (const proxy of proxies) {
      // Try to find a distance entity for this device-proxy pair
      const proxyShortId = proxy.entity_id.replace(/^sensor\./, "").replace(/_[^_]+$/, "");

      // Search through all states for matching distance entities
      for (const [entityId, state] of Object.entries(this.hass.states)) {
        if (!entityId.startsWith("sensor.bermuda_")) continue;
        if (!entityId.includes("distance")) continue;

        // Check if this entity's attributes reference this proxy
        const attrs = state.attributes || {};
        if (
          prefix &&
          entityId.includes(prefix.replace("sensor.bermuda_", "")) &&
          (attrs.scanner_name?.includes(proxy.name || "") ||
            attrs.scanner_entity_id === proxy.entity_id ||
            entityId.includes(proxyShortId))
        ) {
          const dist = parseFloat(state.state);
          if (!isNaN(dist) && dist > 0) {
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
    // Bermuda main sensor often has scanner distances in attributes
    if (distances.length === 0 && prefix) {
      const mainEntity = `${prefix}_distance`;
      const mainState = this.hass.states[mainEntity];
      if (mainState) {
        const attrs = mainState.attributes || {};
        // Check for scanner_distances attribute
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

    // Strategy 3: Use bermuda.dump_devices service result if available
    // This is handled via the device tracker entity attributes
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

  private _findEntity(deviceConfig: any, suffix: string): string | null {
    if (!this.hass || !deviceConfig.entity_prefix) return null;
    const entityId = `${deviceConfig.entity_prefix}_${suffix}`;
    return this.hass.states[entityId] ? entityId : null;
  }

  private _getAllProxies(): ProxyConfig[] {
    if (!this._config) return [];

    // Combine floor-specific and global proxies
    const floor = this._getActiveFloor();
    const floorProxies = floor?.proxies || [];
    const globalProxies = this._config.proxies || [];

    return [...globalProxies, ...floorProxies];
  }

  private _getActiveFloor() {
    if (!this._config?.floors) return null;
    return this._config.floors.find((f) => f.id === this._activeFloor) || this._config.floors[0] || null;
  }

  private _getFloorplanImage(): string {
    const floor = this._getActiveFloor();
    return floor?.image || this._config?.floorplan_image || "";
  }

  // ─── Canvas Rendering ──────────────────────────────────────

  private _setupResizeObserver(): void {
    this._resizeObserver = new ResizeObserver(() => {
      this._resizeCanvas();
    });
    const container = this.shadowRoot?.querySelector(".map-container");
    if (container) {
      this._resizeObserver.observe(container);
    }
  }

  private _resizeCanvas(): void {
    const canvas = this._canvas;
    const image = this._image;
    if (!canvas || !image) return;

    const container = canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const imgRatio = image.naturalWidth / image.naturalHeight;
    const canvasWidth = containerWidth;
    const canvasHeight = containerWidth / imgRatio;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
  }

  private _startRenderLoop(): void {
    const renderFrame = () => {
      this._renderCanvas();
      this._animationFrame = requestAnimationFrame(renderFrame);
    };
    this._animationFrame = requestAnimationFrame(renderFrame);
  }

  private _renderCanvas(): void {
    const canvas = this._canvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    const isDark = this._isDarkMode();

    renderCanvas(
      { ctx, width, height, dpr, isDark },
      this._devices,
      this._getAllProxies(),
      this._config,
      this._activeFloor
    );
  }

  private _isDarkMode(): boolean {
    if (this._config?.theme_mode === "dark") return true;
    if (this._config?.theme_mode === "light") return false;
    return this.hass?.themes?.darkMode ?? false;
  }

  // ─── Event Handlers ────────────────────────────────────────

  private _handleImageLoad(): void {
    this._imageLoaded = true;
    this._imageError = false;
  }

  private _handleImageError(): void {
    this._imageError = true;
    this._imageLoaded = false;
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
        transition: background 0.2s, color 0.2s;
      }

      .header-btn:hover {
        background: var(--divider-color, rgba(0,0,0,0.05));
        color: var(--text-primary);
      }

      .header-btn svg {
        width: 18px;
        height: 18px;
      }

      .floor-select {
        background: var(--divider-color, rgba(0,0,0,0.05));
        border: none;
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 12px;
        color: var(--text-primary);
        cursor: pointer;
        outline: none;
      }

      .map-container {
        position: relative;
        width: 100%;
        overflow: hidden;
        background: var(--divider-color, rgba(0,0,0,0.03));
      }

      .map-container img {
        width: 100%;
        display: block;
        opacity: 0.85;
      }

      .map-container canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        pointer-events: none;
      }

      .status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px 12px;
        font-size: 11px;
        color: var(--text-secondary);
      }

      .status-left {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .status-item .count {
        font-weight: 600;
        color: var(--text-primary);
      }

      .device-panel {
        border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        max-height: 200px;
        overflow-y: auto;
        transition: max-height 0.3s ease;
      }

      .device-panel.collapsed {
        max-height: 0;
        border-top: none;
      }

      .device-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        gap: 10px;
        transition: background 0.15s;
      }

      .device-item:hover {
        background: var(--divider-color, rgba(0,0,0,0.03));
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .device-detail {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .device-accuracy {
        font-size: 11px;
        color: var(--text-secondary);
        text-align: right;
        flex-shrink: 0;
      }

      .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: var(--text-secondary);
      }

      .empty-state svg {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.3;
      }

      .empty-state p {
        margin: 4px 0;
        font-size: 13px;
      }

      :host([fullscreen]) ha-card {
        height: 100vh;
        border-radius: 0;
      }

      :host([fullscreen]) .map-container {
        flex: 1;
      }
    `;
  }

  protected render() {
    if (!this._config) return nothing;

    const floorplanImage = this._getFloorplanImage();
    const floors = this._config.floors || [];
    const hasMultipleFloors = floors.length > 1;
    const title = this._config.card_title || "BLE LiveMap";
    const t = (key: string) => localize(key, this._lang);

    return html`
      <ha-card>
        <!-- Header -->
        <div class="card-header">
          <div class="card-title">
            <span class="dot"></span>
            ${title}
          </div>
          <div class="header-actions">
            ${hasMultipleFloors
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

        <!-- Map -->
        ${floorplanImage
          ? html`
              <div class="map-container">
                <img
                  id="floorplan-img"
                  src=${floorplanImage}
                  @load=${this._handleImageLoad}
                  @error=${this._handleImageError}
                  alt="Floor plan"
                  crossorigin="anonymous"
                />
                ${this._imageLoaded
                  ? html`<canvas id="livemap-canvas"></canvas>`
                  : nothing}
                ${this._imageError
                  ? html`<div class="empty-state"><p>Failed to load floor plan image</p></div>`
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
      </ha-card>
    `;
  }
}

// Also import and register the editor
import "./editor";
