/**
 * ha-ble-livemap - Visual Card Editor
 * Author: Jerry Paasovaara
 * License: MIT
 */

import { LitElement, html, css, CSSResultGroup, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  BLELivemapConfig,
  HomeAssistant,
  ProxyConfig,
  TrackedDeviceConfig,
  FloorConfig,
  ZoneConfig,
  DEFAULT_CONFIG,
  DEVICE_COLORS,
  DEVICE_ICONS,
  ZONE_COLORS,
} from "./types";
import { CARD_EDITOR_NAME } from "./const";
import { localize } from "./localize/localize";

@customElement(CARD_EDITOR_NAME)
export class BLELivemapCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: BLELivemapConfig;
  @state() private _activeSection = "floorplan";
  @state() private _placingProxy: number | null = null;
  @state() private _drawingZone: number | null = null;
  @state() private _drawingPoints: { x: number; y: number }[] = [];

  private _lang = "en";

  setConfig(config: BLELivemapConfig): void {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  private _t(key: string): string {
    return localize(key, this._lang);
  }

  private _fireConfigChanged(): void {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private _updateConfig(key: string, value: any): void {
    this._config = { ...this._config, [key]: value };
    this._fireConfigChanged();
  }

  // ─── Section: Floor Plan ───────────────────────────────────

  private _renderFloorplanSection() {
    const floors = this._config.floors || [];
    const useSingleFloor = floors.length === 0;

    return html`
      <div class="section">
        <div class="section-title">${this._t("editor.floorplan")}</div>

        ${useSingleFloor
          ? html`
              <div class="field">
                <label>${this._t("editor.floorplan_image")}</label>
                <input
                  type="text"
                  .value=${this._config.floorplan_image || ""}
                  @input=${(e: Event) =>
                    this._updateConfig("floorplan_image", (e.target as HTMLInputElement).value)}
                  placeholder="/local/floorplan.png"
                />
                <span class="help">${this._t("editor.floorplan_image_help")}</span>
              </div>
            `
          : nothing}

        <div class="field">
          <label>${this._t("editor.real_dimensions")}</label>
          <div class="field-row">
            <input
              type="number"
              .value=${String(this._getFirstFloor()?.image_width || 20)}
              @input=${(e: Event) => this._updateFloorDimension("image_width", e)}
              placeholder="20"
              min="1"
              step="0.5"
            />
            <span class="unit">m</span>
            <span class="separator">x</span>
            <input
              type="number"
              .value=${String(this._getFirstFloor()?.image_height || 15)}
              @input=${(e: Event) => this._updateFloorDimension("image_height", e)}
              placeholder="15"
              min="1"
              step="0.5"
            />
            <span class="unit">m</span>
          </div>
        </div>

        <div class="subsection">
          <div class="subsection-header">
            <span>${this._t("editor.floors")}</span>
            <button class="add-btn" @click=${this._addFloor}>+ ${this._t("editor.add_floor")}</button>
          </div>
          ${floors.map(
            (floor, idx) => html`
              <div class="list-item">
                <div class="list-item-content">
                  <input
                    type="text"
                    .value=${floor.name}
                    @input=${(e: Event) => this._updateFloor(idx, "name", (e.target as HTMLInputElement).value)}
                    placeholder="${this._t("editor.floor_name")}"
                  />
                  <input
                    type="text"
                    .value=${floor.image}
                    @input=${(e: Event) => this._updateFloor(idx, "image", (e.target as HTMLInputElement).value)}
                    placeholder="${this._t("editor.floor_image")}"
                  />
                </div>
                <button class="remove-btn" @click=${() => this._removeFloor(idx)}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  // ─── Section: Proxies ──────────────────────────────────────

  private _renderProxiesSection() {
    const proxies = this._config.proxies || [];
    const floorplanImage = this._getFloorplanImage();

    return html`
      <div class="section">
        <div class="section-title">${this._t("editor.proxies")}</div>

        ${floorplanImage
          ? html`
              <div class="map-preview" @click=${this._handleProxyMapClick}>
                <img src=${floorplanImage} alt="Floor plan" />
                ${proxies.map(
                  (p, idx) => html`
                    <div
                      class="proxy-marker ${this._placingProxy === idx ? "placing" : ""}"
                      style="left: ${p.x}%; top: ${p.y}%"
                      title="${p.name || p.entity_id}"
                    >
                      <span>B</span>
                    </div>
                  `
                )}
                ${this._placingProxy !== null
                  ? html`<div class="placing-hint">${this._t("editor.place_on_map")}</div>`
                  : nothing}
              </div>
            `
          : nothing}

        ${proxies.map(
          (proxy, idx) => html`
            <div class="list-item">
              <div class="list-item-content">
                <input
                  type="text"
                  .value=${proxy.entity_id}
                  @input=${(e: Event) => this._updateProxy(idx, "entity_id", (e.target as HTMLInputElement).value)}
                  placeholder="${this._t("editor.proxy_entity")}"
                />
                <input
                  type="text"
                  .value=${proxy.name || ""}
                  @input=${(e: Event) => this._updateProxy(idx, "name", (e.target as HTMLInputElement).value)}
                  placeholder="${this._t("editor.proxy_name")}"
                />
                <div class="field-row">
                  <span class="label-sm">X: ${proxy.x.toFixed(1)}%</span>
                  <span class="label-sm">Y: ${proxy.y.toFixed(1)}%</span>
                  <button
                    class="place-btn ${this._placingProxy === idx ? "active" : ""}"
                    @click=${() => (this._placingProxy = this._placingProxy === idx ? null : idx)}
                  >
                    ${this._t("editor.place_on_map")}
                  </button>
                </div>
              </div>
              <button class="remove-btn" @click=${() => this._removeProxy(idx)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `
        )}

        <button class="add-btn full" @click=${this._addProxy}>+ ${this._t("editor.add_proxy")}</button>
      </div>
    `;
  }

  // ─── Section: Zones ────────────────────────────────────────

  private _renderZonesSection() {
    const zones = this._config.zones || [];
    const floorplanImage = this._getFloorplanImage();

    return html`
      <div class="section">
        <div class="section-title">${this._t("editor.zones")}</div>
        <p class="help">${this._t("editor.zones_help")}</p>

        ${floorplanImage
          ? html`
              <div class="map-preview zone-drawing" @click=${this._handleZoneMapClick}>
                <img src=${floorplanImage} alt="Floor plan" />
                <!-- Render existing zones as SVG overlay -->
                <svg class="zone-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${zones.map(
                    (z, idx) => html`
                      <polygon
                        points="${z.points.map((p) => `${p.x},${p.y}`).join(" ")}"
                        fill="${z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                        fill-opacity="${z.opacity ?? 0.15}"
                        stroke="${z.border_color || z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                        stroke-width="0.3"
                        stroke-dasharray="1,0.5"
                      />
                    `
                  )}
                  <!-- Drawing in progress -->
                  ${this._drawingZone !== null && this._drawingPoints.length > 0
                    ? html`
                        <polyline
                          points="${this._drawingPoints.map((p) => `${p.x},${p.y}`).join(" ")}"
                          fill="none"
                          stroke="#E57373"
                          stroke-width="0.3"
                          stroke-dasharray="0.5,0.3"
                        />
                        ${this._drawingPoints.map(
                          (p) => html`
                            <circle cx="${p.x}" cy="${p.y}" r="0.6" fill="#E57373" />
                          `
                        )}
                      `
                    : nothing}
                </svg>
                <!-- Zone labels -->
                ${zones.map(
                  (z, idx) => {
                    const c = this._getZoneCentroid(z.points);
                    return html`
                      <div class="zone-label" style="left: ${c.x}%; top: ${c.y}%">
                        ${z.name || `Zone ${idx + 1}`}
                      </div>
                    `;
                  }
                )}
                ${this._drawingZone !== null
                  ? html`<div class="placing-hint">${this._t("editor.zone_draw_hint")}</div>`
                  : nothing}
              </div>
            `
          : nothing}

        ${zones.map(
          (zone, idx) => html`
            <div class="list-item">
              <div class="zone-color-dot" style="background: ${zone.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"></div>
              <div class="list-item-content">
                <input
                  type="text"
                  .value=${zone.name || ""}
                  @input=${(e: Event) => this._updateZone(idx, "name", (e.target as HTMLInputElement).value)}
                  placeholder="${this._t("editor.zone_name")}"
                />
                <div class="field-row">
                  <input
                    type="color"
                    .value=${zone.color || ZONE_COLORS[idx % ZONE_COLORS.length]}
                    @input=${(e: Event) => this._updateZone(idx, "color", (e.target as HTMLInputElement).value)}
                    title="${this._t("editor.zone_color")}"
                  />
                  <input
                    type="color"
                    .value=${zone.border_color || zone.color || ZONE_COLORS[idx % ZONE_COLORS.length]}
                    @input=${(e: Event) => this._updateZone(idx, "border_color", (e.target as HTMLInputElement).value)}
                    title="${this._t("editor.zone_border_color")}"
                  />
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${zone.show_label !== false}
                      @change=${(e: Event) => this._updateZone(idx, "show_label", (e.target as HTMLInputElement).checked)}
                    />
                    ${this._t("editor.zone_show_label")}
                  </label>
                  <span class="label-sm">${zone.points.length} ${this._t("editor.zone_points")}</span>
                </div>
                <div class="field">
                  <label>${this._t("editor.zone_opacity")}</label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.02"
                    .value=${String(zone.opacity ?? 0.12)}
                    @input=${(e: Event) => this._updateZone(idx, "opacity", parseFloat((e.target as HTMLInputElement).value))}
                  />
                </div>
                <div class="field-row">
                  <button
                    class="place-btn ${this._drawingZone === idx ? "active" : ""}"
                    @click=${() => this._startDrawingZone(idx)}
                  >
                    ${this._t("editor.zone_redraw")}
                  </button>
                </div>
              </div>
              <button class="remove-btn" @click=${() => this._removeZone(idx)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `
        )}

        <div class="field-row" style="gap: 8px; margin-top: 4px;">
          <button class="add-btn full" @click=${this._addZone}>+ ${this._t("editor.add_zone")}</button>
          ${this._drawingZone !== null
            ? html`<button class="place-btn active" @click=${this._finishDrawingZone}>${this._t("editor.zone_finish")}</button>`
            : nothing}
        </div>
      </div>
    `;
  }

  // ─── Section: Devices ──────────────────────────────────────

  private _renderDevicesSection() {
    const devices = this._config.tracked_devices || [];

    return html`
      <div class="section">
        <div class="section-title">${this._t("editor.devices")}</div>

        ${devices.map(
          (device, idx) => html`
            <div class="list-item">
              <div class="device-color-dot" style="background: ${device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length]}"></div>
              <div class="list-item-content">
                <input
                  type="text"
                  .value=${device.entity_prefix || ""}
                  @input=${(e: Event) => this._updateDevice(idx, "entity_prefix", (e.target as HTMLInputElement).value)}
                  placeholder="${this._t("editor.device_entity")}"
                />
                <input
                  type="text"
                  .value=${device.name}
                  @input=${(e: Event) => this._updateDevice(idx, "name", (e.target as HTMLInputElement).value)}
                  placeholder="${this._t("editor.device_name")}"
                />
                <div class="field-row">
                  <input
                    type="color"
                    .value=${device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length]}
                    @input=${(e: Event) => this._updateDevice(idx, "color", (e.target as HTMLInputElement).value)}
                    title="${this._t("editor.device_color")}"
                  />
                  <select
                    @change=${(e: Event) => this._updateDevice(idx, "icon", (e.target as HTMLSelectElement).value)}
                  >
                    ${Object.entries(DEVICE_ICONS).map(
                      ([key, _]) => html`
                        <option value=${key} ?selected=${device.icon === key}>${key}</option>
                      `
                    )}
                  </select>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${device.show_trail !== false}
                      @change=${(e: Event) => this._updateDevice(idx, "show_trail", (e.target as HTMLInputElement).checked)}
                    />
                    ${this._t("editor.device_trail")}
                  </label>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${device.show_label !== false}
                      @change=${(e: Event) => this._updateDevice(idx, "show_label", (e.target as HTMLInputElement).checked)}
                    />
                    ${this._t("editor.device_label")}
                  </label>
                </div>
              </div>
              <button class="remove-btn" @click=${() => this._removeDevice(idx)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `
        )}

        <button class="add-btn full" @click=${this._addDevice}>+ ${this._t("editor.add_device")}</button>
      </div>
    `;
  }

  // ─── Section: Appearance ───────────────────────────────────

  private _renderAppearanceSection() {
    return html`
      <div class="section">
        <div class="section-title">${this._t("editor.appearance")}</div>

        <div class="field">
          <label>${this._t("editor.card_title")}</label>
          <input
            type="text"
            .value=${this._config.card_title || ""}
            @input=${(e: Event) => this._updateConfig("card_title", (e.target as HTMLInputElement).value)}
            placeholder="BLE LiveMap"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.update_interval")}</label>
          <input
            type="number"
            .value=${String(this._config.update_interval || 2)}
            @input=${(e: Event) => this._updateConfig("update_interval", Number((e.target as HTMLInputElement).value))}
            min="1"
            max="30"
            step="1"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.theme_mode")}</label>
          <select
            @change=${(e: Event) => this._updateConfig("theme_mode", (e.target as HTMLSelectElement).value)}
          >
            <option value="auto" ?selected=${this._config.theme_mode === "auto"}>${this._t("editor.theme_auto")}</option>
            <option value="dark" ?selected=${this._config.theme_mode === "dark"}>${this._t("editor.theme_dark")}</option>
            <option value="light" ?selected=${this._config.theme_mode === "light"}>${this._t("editor.theme_light")}</option>
          </select>
        </div>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.show_proxies !== false}
            @change=${(e: Event) => this._updateConfig("show_proxies", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.show_proxies")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.show_zones !== false}
            @change=${(e: Event) => this._updateConfig("show_zones", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.show_zones")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.show_zone_labels !== false}
            @change=${(e: Event) => this._updateConfig("show_zone_labels", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.show_zone_labels")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.show_signal_overlay || false}
            @change=${(e: Event) => this._updateConfig("show_signal_overlay", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.show_signal_overlay")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.show_accuracy_indicator !== false}
            @change=${(e: Event) => this._updateConfig("show_accuracy_indicator", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.show_accuracy")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.fullscreen_enabled !== false}
            @change=${(e: Event) => this._updateConfig("fullscreen_enabled", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.fullscreen")}
        </label>
      </div>
    `;
  }

  // ─── Section: History ──────────────────────────────────────

  private _renderHistorySection() {
    return html`
      <div class="section">
        <div class="section-title">${this._t("editor.history")}</div>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.history_enabled !== false}
            @change=${(e: Event) => this._updateConfig("history_enabled", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.history_enabled")}
        </label>

        <div class="field">
          <label>${this._t("editor.history_retention")}</label>
          <input
            type="number"
            .value=${String(this._config.history_retention || 60)}
            @input=${(e: Event) => this._updateConfig("history_retention", Number((e.target as HTMLInputElement).value))}
            min="5"
            max="1440"
            step="5"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.history_trail_length")}</label>
          <input
            type="number"
            .value=${String(this._config.history_trail_length || 50)}
            @input=${(e: Event) => this._updateConfig("history_trail_length", Number((e.target as HTMLInputElement).value))}
            min="10"
            max="500"
            step="10"
          />
        </div>
      </div>
    `;
  }

  // ─── Data Manipulation ─────────────────────────────────────

  private _getFirstFloor(): FloorConfig | null {
    return this._config.floors?.[0] || null;
  }

  private _getFloorplanImage(): string {
    const floor = this._getFirstFloor();
    return floor?.image || this._config.floorplan_image || "";
  }

  private _updateFloorDimension(field: string, e: Event): void {
    const value = Number((e.target as HTMLInputElement).value);
    const floors = [...(this._config.floors || [])];
    if (floors.length > 0) {
      floors[0] = { ...floors[0], [field]: value };
      this._updateConfig("floors", floors);
    }
  }

  private _addFloor(): void {
    const floors = [...(this._config.floors || [])];
    floors.push({
      id: `floor_${Date.now()}`,
      name: `Floor ${floors.length + 1}`,
      image: "",
      image_width: 20,
      image_height: 15,
    });
    this._updateConfig("floors", floors);
  }

  private _removeFloor(idx: number): void {
    const floors = [...(this._config.floors || [])];
    floors.splice(idx, 1);
    this._updateConfig("floors", floors);
  }

  private _updateFloor(idx: number, field: string, value: any): void {
    const floors = [...(this._config.floors || [])];
    floors[idx] = { ...floors[idx], [field]: value };
    this._updateConfig("floors", floors);
  }

  private _addProxy(): void {
    const proxies = [...(this._config.proxies || [])];
    proxies.push({ entity_id: "", x: 50, y: 50, name: "" });
    this._updateConfig("proxies", proxies);
    this._placingProxy = proxies.length - 1;
  }

  private _removeProxy(idx: number): void {
    const proxies = [...(this._config.proxies || [])];
    proxies.splice(idx, 1);
    this._updateConfig("proxies", proxies);
    if (this._placingProxy === idx) this._placingProxy = null;
  }

  private _updateProxy(idx: number, field: string, value: any): void {
    const proxies = [...(this._config.proxies || [])];
    proxies[idx] = { ...proxies[idx], [field]: value };
    this._updateConfig("proxies", proxies);
  }

  private _addDevice(): void {
    const devices = [...(this._config.tracked_devices || [])];
    const idx = devices.length;
    devices.push({
      entity_prefix: "",
      name: `Device ${idx + 1}`,
      color: DEVICE_COLORS[idx % DEVICE_COLORS.length],
      icon: "phone",
      show_trail: true,
      show_label: true,
    });
    this._updateConfig("tracked_devices", devices);
  }

  private _removeDevice(idx: number): void {
    const devices = [...(this._config.tracked_devices || [])];
    devices.splice(idx, 1);
    this._updateConfig("tracked_devices", devices);
  }

  private _updateDevice(idx: number, field: string, value: any): void {
    const devices = [...(this._config.tracked_devices || [])];
    devices[idx] = { ...devices[idx], [field]: value };
    this._updateConfig("tracked_devices", devices);
  }

  // ─── Zone manipulation ────────────────────────────────────

  private _addZone(): void {
    const zones = [...(this._config.zones || [])];
    const idx = zones.length;
    zones.push({
      id: `zone_${Date.now()}`,
      name: "",
      points: [],
      color: ZONE_COLORS[idx % ZONE_COLORS.length],
      border_color: ZONE_COLORS[idx % ZONE_COLORS.length],
      opacity: 0.12,
      show_label: true,
    });
    this._updateConfig("zones", zones);
    this._startDrawingZone(idx);
  }

  private _removeZone(idx: number): void {
    const zones = [...(this._config.zones || [])];
    zones.splice(idx, 1);
    this._updateConfig("zones", zones);
    if (this._drawingZone === idx) {
      this._drawingZone = null;
      this._drawingPoints = [];
    }
  }

  private _updateZone(idx: number, field: string, value: any): void {
    const zones = [...(this._config.zones || [])];
    zones[idx] = { ...zones[idx], [field]: value };
    this._updateConfig("zones", zones);
  }

  private _startDrawingZone(idx: number): void {
    this._drawingZone = idx;
    this._drawingPoints = [];
    this._placingProxy = null; // cancel any proxy placement
  }

  private _finishDrawingZone(): void {
    if (this._drawingZone === null || this._drawingPoints.length < 3) return;

    const zones = [...(this._config.zones || [])];
    zones[this._drawingZone] = {
      ...zones[this._drawingZone],
      points: [...this._drawingPoints],
    };
    this._updateConfig("zones", zones);
    this._drawingZone = null;
    this._drawingPoints = [];
  }

  private _getZoneCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
    if (points.length === 0) return { x: 50, y: 50 };
    let cx = 0;
    let cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    return { x: cx / points.length, y: cy / points.length };
  }

  // ─── Map Click Handlers ───────────────────────────────────

  private _handleProxyMapClick(e: MouseEvent): void {
    if (this._placingProxy === null) return;

    const img = (e.currentTarget as HTMLElement).querySelector("img");
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    this._updateProxy(this._placingProxy, "x", Math.round(x * 10) / 10);
    this._updateProxy(this._placingProxy, "y", Math.round(y * 10) / 10);
    this._placingProxy = null;
  }

  private _handleZoneMapClick(e: MouseEvent): void {
    if (this._drawingZone === null) return;

    const img = (e.currentTarget as HTMLElement).querySelector("img");
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const point = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    this._drawingPoints = [...this._drawingPoints, point];

    // Auto-close polygon if clicking near the first point (within 3%)
    if (this._drawingPoints.length >= 3) {
      const first = this._drawingPoints[0];
      const dist = Math.sqrt(Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2));
      if (dist < 3) {
        // Remove the last point (too close to first) and finish
        this._drawingPoints = this._drawingPoints.slice(0, -1);
        this._finishDrawingZone();
        return;
      }
    }

    this.requestUpdate();
  }

  // ─── Styles ────────────────────────────────────────────────

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --editor-bg: var(--ha-card-background, #fff);
        --editor-text: var(--primary-text-color, #212121);
        --editor-text-secondary: var(--secondary-text-color, #727272);
        --editor-border: var(--divider-color, rgba(0,0,0,0.12));
        --editor-accent: var(--primary-color, #4FC3F7);
      }

      .tabs {
        display: flex;
        border-bottom: 1px solid var(--editor-border);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .tab {
        padding: 10px 16px;
        font-size: 12px;
        font-weight: 500;
        color: var(--editor-text-secondary);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: color 0.2s, border-color 0.2s;
        background: none;
        border-top: none;
        border-left: none;
        border-right: none;
      }

      .tab.active {
        color: var(--editor-accent);
        border-bottom-color: var(--editor-accent);
      }

      .section {
        padding: 16px;
      }

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--editor-text);
        margin-bottom: 12px;
      }

      .field {
        margin-bottom: 12px;
      }

      .field label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--editor-text-secondary);
        margin-bottom: 4px;
      }

      .field input, .field select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        font-size: 13px;
        color: var(--editor-text);
        background: transparent;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s;
      }

      .field input:focus, .field select:focus {
        border-color: var(--editor-accent);
      }

      .field .help, p.help {
        display: block;
        font-size: 11px;
        color: var(--editor-text-secondary);
        margin-top: 4px;
        margin-bottom: 8px;
      }

      .field-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .field-row input[type="number"] {
        flex: 1;
        min-width: 0;
      }

      .field-row .unit {
        font-size: 12px;
        color: var(--editor-text-secondary);
      }

      .field-row .separator {
        font-size: 12px;
        color: var(--editor-text-secondary);
      }

      .checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--editor-text);
        margin-bottom: 8px;
        cursor: pointer;
      }

      .checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--editor-accent);
      }

      .list-item {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        padding: 10px;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .list-item-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .list-item-content input,
      .list-item-content select {
        padding: 6px 8px;
        border: 1px solid var(--editor-border);
        border-radius: 6px;
        font-size: 12px;
        color: var(--editor-text);
        background: transparent;
        outline: none;
      }

      .list-item-content input[type="range"] {
        padding: 0;
        border: none;
        accent-color: var(--editor-accent);
      }

      .device-color-dot, .zone-color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-top: 12px;
        flex-shrink: 0;
      }

      .zone-color-dot {
        border-radius: 3px;
      }

      .label-sm {
        font-size: 11px;
        color: var(--editor-text-secondary);
      }

      .remove-btn {
        background: none;
        border: none;
        color: var(--editor-text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        margin-top: 8px;
      }

      .remove-btn:hover {
        color: #E57373;
        background: rgba(229, 115, 115, 0.1);
      }

      .add-btn {
        background: none;
        border: 1px dashed var(--editor-border);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 12px;
        color: var(--editor-accent);
        cursor: pointer;
        transition: background 0.2s;
      }

      .add-btn:hover {
        background: rgba(79, 195, 247, 0.05);
      }

      .add-btn.full {
        width: 100%;
        margin-top: 4px;
      }

      .place-btn {
        background: var(--editor-accent);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 3px 8px;
        font-size: 11px;
        cursor: pointer;
      }

      .place-btn.active {
        background: #E57373;
        animation: blink 1s ease-in-out infinite;
      }

      @keyframes blink {
        50% { opacity: 0.6; }
      }

      .subsection {
        margin-top: 16px;
      }

      .subsection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--editor-text);
      }

      .map-preview {
        position: relative;
        width: 100%;
        margin-bottom: 12px;
        border-radius: 8px;
        overflow: hidden;
        cursor: crosshair;
        border: 1px solid var(--editor-border);
      }

      .map-preview img {
        width: 100%;
        display: block;
      }

      .zone-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .zone-label {
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 10px;
        font-weight: 500;
        color: var(--editor-text);
        background: rgba(255,255,255,0.7);
        padding: 1px 6px;
        border-radius: 4px;
        pointer-events: none;
        white-space: nowrap;
      }

      .proxy-marker {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--editor-accent);
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        font-weight: bold;
        color: white;
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      }

      .proxy-marker.placing {
        background: #E57373;
        animation: blink 0.5s ease-in-out infinite;
      }

      .placing-hint {
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        z-index: 10;
      }

      input[type="color"] {
        width: 32px;
        height: 28px;
        padding: 0;
        border: 1px solid var(--editor-border);
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
      }
    `;
  }

  protected render() {
    if (!this._config) return nothing;

    if (this.hass) {
      this._lang = this.hass.selectedLanguage || this.hass.language || "en";
    }

    const sections = [
      { id: "floorplan", label: this._t("editor.floorplan") },
      { id: "proxies", label: this._t("editor.proxies") },
      { id: "zones", label: this._t("editor.zones") },
      { id: "devices", label: this._t("editor.devices") },
      { id: "appearance", label: this._t("editor.appearance") },
      { id: "history", label: this._t("editor.history") },
    ];

    return html`
      <div class="tabs">
        ${sections.map(
          (s) => html`
            <button
              class="tab ${this._activeSection === s.id ? "active" : ""}"
              @click=${() => (this._activeSection = s.id)}
            >
              ${s.label}
            </button>
          `
        )}
      </div>

      ${this._activeSection === "floorplan" ? this._renderFloorplanSection() : nothing}
      ${this._activeSection === "proxies" ? this._renderProxiesSection() : nothing}
      ${this._activeSection === "zones" ? this._renderZonesSection() : nothing}
      ${this._activeSection === "devices" ? this._renderDevicesSection() : nothing}
      ${this._activeSection === "appearance" ? this._renderAppearanceSection() : nothing}
      ${this._activeSection === "history" ? this._renderHistorySection() : nothing}
    `;
  }
}
