/**
 * ha-ble-livemap - BLE LiveMap Card for Home Assistant
 * Real-time BLE device position tracking on your floor plan.
 *
 * Author: Jerry Paasovaara
 * License: MIT
 * Version: 1.2.0
 */

import { LitElement, html, css, PropertyValues, nothing, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  BLELivemapConfig,
  HomeAssistant,
  DeviceState,
  ProxyConfig,
  ZoneConfig,
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

  private _canvases: Map<string, HTMLCanvasElement> = new Map();
  private _images: Map<string, HTMLImageElement> = new Map();
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

    for (const deviceConfig of this._config.tracked_devices) {
      const distances = this._getDeviceDistances(deviceConfig, proxies);
      let position: DevicePosition | null = null;

      if (distances.length >= 1) {
        const proxyMap = new Map<string, { x: number; y: number }>();
        for (const d of distances) {
          const proxy = proxies.find((p) => p.entity_id === d.proxy_entity_id);
          if (proxy) {
            proxyMap.set(d.proxy_entity_id, { x: proxy.x, y: proxy.y });
          }
        }

        if (proxyMap.size >= 1) {
          const floor = this._getFloors()[0];
          const imageWidth = floor?.image_width || 20;
          const imageHeight = floor?.image_height || 15;
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
              };

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
      const deviceId = deviceConfig.entity_prefix || deviceConfig.bermuda_device_id || "";
      let history = this._historyStore?.getTrail(deviceId) || [];
      if (position && this._historyStore) {
        this._historyStore.addPoint(deviceId, {
          x: position.x,
          y: position.y,
          timestamp: position.timestamp,
        });
        history = this._historyStore.getTrail(deviceId);
      }

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
            const dist = parseFloat(state.state);
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

    renderCanvas(
      { ctx, width, height, dpr, isDark },
      this._devices,
      proxies,
      zones,
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
        transition: background 0.2s, color 0.2s;
      }

      .header-btn:hover {
        background: var(--divider-color, rgba(0,0,0,0.05));
        color: var(--text-primary);
      }

      .header-btn.off {
        opacity: 0.35;
      }

      .header-btn.off:hover {
        opacity: 0.6;
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

      .maps-wrapper {
        display: flex;
        flex-direction: column;
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

      .floor-label {
        position: absolute;
        top: 8px;
        left: 12px;
        z-index: 5;
        background: rgba(0,0,0,0.5);
        color: white;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .floor-divider {
        height: 2px;
        background: var(--divider-color, rgba(0,0,0,0.08));
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
