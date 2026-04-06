/**
 * ha-ble-livemap - BLE LiveMap Card for Home Assistant
 * Real-time BLE device position tracking on your floor plan.
 *
 * Author: Jerry Paasovaara
 * License: MIT
 * Version: see const.ts CARD_VERSION
 *
 * This is a thin Lovelace card viewer. All tracking logic lives in
 * tracking-engine.ts so that the panel and card produce identical results.
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
  FloorConfig,
  DEFAULT_CONFIG,
  DEVICE_COLORS,
} from "./types";
import { CARD_VERSION, CARD_NAME, CARD_EDITOR_NAME } from "./const";
import { render as renderCanvas, cleanupAnimations } from "./renderer";
import { localize } from "./localize/localize";
import { TrackingEngine } from "./tracking-engine";

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
  @state() private _runtimeShowDoors: boolean | null = null;
  @state() private _showSetupDialog = false;

  private _canvases: Map<string, HTMLCanvasElement> = new Map();
  private _images: Map<string, HTMLImageElement> = new Map();
  private _animationFrame: number | null = null;
  private _updateTimer: number | null = null;
  private _lang = "en";
  private _resizeObserver: ResizeObserver | null = null;

  /** Shared tracking engine — single source of truth for positions */
  private _engine: TrackingEngine | null = null;

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

    // (Re)create the tracking engine with current settings
    this._engine?.destroy();
    this._engine = new TrackingEngine({
      enableHistory: this._config.history_enabled ?? false,
      historyRetention: this._config.history_retention ?? 60,
      historyTrailLength: this._config.history_trail_length ?? 50,
    });

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
    this._engine?.destroy();
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

    this._updateCanvasRefs();
  }

  getCardSize(): number {
    return 6;
  }

  // ─── Data Update (delegates to TrackingEngine) ─────────────

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
    if (!this.hass || !this._config || !this._engine) return;
    this._devices = this._engine.update(this.hass, this._config);
  }

  // ─── Config Helpers ────────────────────────────────────────

  private _getAllProxies(): ProxyConfig[] {
    if (!this._config) return [];
    const globalProxies = this._config.proxies || [];
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
      (p) => !p.floor_id || p.floor_id === floorId,
    );
    const floor = this._getFloors().find((f) => f.id === floorId);
    const floorProxies = floor?.proxies || [];
    return [...globalProxies, ...floorProxies];
  }

  private _getZonesForFloor(floorId: string): ZoneConfig[] {
    return (this._config.zones || []).filter(
      (z) => !z.floor_id || z.floor_id === floorId,
    );
  }

  private _getDoorsForFloor(floorId: string): DoorConfig[] {
    return (this._config.doors || []).filter(
      (d) => !d.floor_id || d.floor_id === floorId,
    );
  }

  private _getFloors(): FloorConfig[] {
    const floors = this._config?.floors || [];
    if (floors.length === 0 && this._config?.floorplan_image) {
      return [{
        id: "default",
        name: "Floor 1",
        image: this._config.floorplan_image,
        image_width: this._config.image_width || 20,
        image_height: this._config.image_height || 15,
      }];
    }
    return floors;
  }

  private _getActiveFloor(): FloorConfig | null {
    const floors = this._getFloors();
    return floors.find((f) => f.id === this._activeFloor) || floors[0] || null;
  }

  private _isStackedMode(): boolean {
    return this._config?.floor_display_mode === "stacked" && this._getFloors().length > 1;
  }

  // ─── Canvas Rendering ──────────────────────────────────────

  private _updateCanvasRefs(): void {
    const root = this.shadowRoot;
    if (!root) return;

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
      for (const floor of this._getFloors()) {
        this._renderFloorCanvas(floor.id, effectiveConfig, isDark);
      }
    } else {
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
      { ctx, width, height, dpr, isDark, frameTime: Date.now() },
      this._devices,
      proxies,
      zones,
      doors,
      config,
      floorId,
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
    requestAnimationFrame(() => {
      this._updateCanvasRefs();
      this._resizeAllCanvases();
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
    this.updateComplete.then(() => {
      const editor = this.shadowRoot?.querySelector("ble-livemap-card-editor") as any;
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
      const event = new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
      this.setConfig(this._config);
    }
  }

  private _renderSetupDialog() {
    if (!this._showSetupDialog) return nothing;
    const t = (key: string) => localize(key, this._lang);
    return html`
      <div class="setup-overlay" @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains("setup-overlay")) this._closeSetupDialog();
      }}>
        <div class="setup-dialog">
          <div class="setup-header">
            <h2>${t("editor.title")}</h2>
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
                      `,
                    )}
                  </select>
                `
              : nothing}
            <!-- Toggle proxies -->
            <button
              class="header-btn ${(this._runtimeShowProxies ?? this._config.show_proxies ?? true) ? "" : "off"}"
              @click=${this._toggleProxies}
              title="${t("card.toggle_proxies")}"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
              </svg>
            </button>
            <!-- Toggle zones -->
            ${(this._config.zones?.length || 0) > 0
              ? html`
                  <button
                    class="header-btn ${(this._runtimeShowZones ?? this._config.show_zones ?? true) ? "" : "off"}"
                    @click=${this._toggleZones}
                    title="${t("card.toggle_zones")}"
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
                    class="header-btn ${(this._runtimeShowDoors ?? this._config.show_doors ?? true) ? "" : "off"}"
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
            <button class="header-btn" @click=${this._openSetupDialog} title="${t("common.configure")}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/>
              </svg>
            </button>
            <button class="header-btn" @click=${this._toggleDevicePanel} title="Devices">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 1h-8A2.5 2.5 0 005 3.5v17A2.5 2.5 0 007.5 23h8a2.5 2.5 0 002.5-2.5v-17A2.5 2.5 0 0015.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z"/>
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
                      `,
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
                      ? html` <span style="opacity:0.6;">| ${this._getFloors().find((f) => f.id === device.current_floor_id)?.name || device.current_floor_id}</span>`
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
            `,
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
