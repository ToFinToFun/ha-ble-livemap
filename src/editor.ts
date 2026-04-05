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
  @state() private _calibrating = false;
  @state() private _calibrationPoints: { x: number; y: number }[] = [];
  @state() private _calibrationMeters = 0;
  @state() private _fullscreenEditor = false;
  @state() private _entityFilter = "";
  @state() private _deviceEntityFilter = "";
  @state() private _showEntityDropdown: number | null = null;
  @state() private _showDeviceEntityDropdown: number | null = null;

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

  // ─── Entity Discovery ─────────────────────────────────────

  private _getAvailableEntities(filter: string, type: "proxy" | "device"): { entity_id: string; name: string }[] {
    if (!this.hass?.states) return [];

    const entities = Object.keys(this.hass.states)
      .filter((eid) => {
        if (type === "proxy") {
          // BLE proxies are typically esphome bluetooth_proxy or esp32_ble_tracker entities
          // Also match common proxy patterns
          return (
            eid.includes("bluetooth") ||
            eid.includes("ble") ||
            eid.includes("proxy") ||
            eid.includes("esp") ||
            eid.startsWith("sensor.") ||
            eid.startsWith("binary_sensor.")
          );
        } else {
          // Bermuda tracked devices
          return (
            eid.includes("bermuda") ||
            eid.includes("ble") ||
            eid.startsWith("sensor.") ||
            eid.startsWith("device_tracker.")
          );
        }
      })
      .filter((eid) => {
        if (!filter) return true;
        const lf = filter.toLowerCase();
        const name = this.hass.states[eid]?.attributes?.friendly_name || "";
        return eid.toLowerCase().includes(lf) || name.toLowerCase().includes(lf);
      })
      .slice(0, 50) // Limit results
      .map((eid) => ({
        entity_id: eid,
        name: this.hass.states[eid]?.attributes?.friendly_name || eid,
      }));

    return entities;
  }

  private _getBermudaDevicePrefixes(): { prefix: string; name: string }[] {
    if (!this.hass?.states) return [];

    // Find all bermuda-related entities and extract unique prefixes
    const prefixes = new Map<string, string>();

    Object.keys(this.hass.states)
      .filter((eid) => eid.includes("bermuda"))
      .forEach((eid) => {
        // Extract prefix: sensor.bermuda_xxx_distance -> sensor.bermuda_xxx
        const parts = eid.split("_");
        // Try to find the device prefix by removing the last part (distance, area, etc.)
        const lastPart = parts[parts.length - 1];
        const suffixes = ["distance", "area", "rssi", "power", "scanner"];
        if (suffixes.includes(lastPart)) {
          const prefix = parts.slice(0, -1).join("_");
          if (!prefixes.has(prefix)) {
            const name = this.hass.states[eid]?.attributes?.friendly_name || prefix;
            // Clean up the name
            const cleanName = name.replace(/ (Distance|Area|RSSI|Power|Scanner)$/i, "");
            prefixes.set(prefix, cleanName);
          }
        }
      });

    return Array.from(prefixes.entries()).map(([prefix, name]) => ({ prefix, name }));
  }

  // ─── Section: Floor Plan ───────────────────────────────────

  private _renderFloorplanSection() {
    const floors = this._config.floors || [];
    const useSingleFloor = floors.length === 0;
    const floorplanImage = this._getFloorplanImage();
    const hasCalibration = this._calibrationPoints.length === 2 && this._calibrationMeters > 0;

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

        <!-- Calibration Tool -->
        ${floorplanImage
          ? html`
              <div class="subsection">
                <div class="subsection-header">
                  <span>${this._t("editor.calibration")}</span>
                </div>
                <p class="help">${this._t("editor.calibration_help")}</p>

                <div class="map-preview calibration-map" @click=${this._handleCalibrationMapClick}>
                  <img src=${floorplanImage} alt="Floor plan" />
                  <svg class="zone-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${this._calibrationPoints.length >= 1
                      ? html`
                          <circle
                            cx="${this._calibrationPoints[0].x}"
                            cy="${this._calibrationPoints[0].y}"
                            r="0.7"
                            fill="#FF5722"
                            stroke="white"
                            stroke-width="0.2"
                          />
                        `
                      : nothing}
                    ${this._calibrationPoints.length === 2
                      ? html`
                          <line
                            x1="${this._calibrationPoints[0].x}"
                            y1="${this._calibrationPoints[0].y}"
                            x2="${this._calibrationPoints[1].x}"
                            y2="${this._calibrationPoints[1].y}"
                            stroke="#FF5722"
                            stroke-width="0.3"
                            stroke-dasharray="1,0.5"
                          />
                          <circle
                            cx="${this._calibrationPoints[1].x}"
                            cy="${this._calibrationPoints[1].y}"
                            r="0.7"
                            fill="#FF5722"
                            stroke="white"
                            stroke-width="0.2"
                          />
                        `
                      : nothing}
                  </svg>
                  ${this._calibrating
                    ? html`<div class="placing-hint">
                        ${this._calibrationPoints.length === 0
                          ? this._t("editor.calibration_click_start")
                          : this._t("editor.calibration_click_end")}
                      </div>`
                    : nothing}
                </div>

                <div class="field-row" style="margin-bottom: 8px;">
                  <button
                    class="place-btn ${this._calibrating ? 'active' : ''}"
                    @click=${this._toggleCalibration}
                  >
                    ${this._calibrating
                      ? this._t("editor.calibration_cancel")
                      : this._t("editor.calibration_start")}
                  </button>
                  ${this._calibrationPoints.length === 2
                    ? html`
                        <button class="place-btn" @click=${this._resetCalibration}>
                          ${this._t("editor.calibration_reset")}
                        </button>
                      `
                    : nothing}
                </div>

                ${this._calibrationPoints.length === 2
                  ? html`
                      <div class="field">
                        <label>${this._t("editor.calibration_distance")}</label>
                        <div class="field-row">
                          <input
                            type="number"
                            .value=${String(this._calibrationMeters || "")}
                            @input=${this._handleCalibrationDistanceInput}
                            placeholder="${this._t("editor.calibration_distance_placeholder")}"
                            min="0.1"
                            step="0.1"
                          />
                          <span class="unit">m</span>
                          ${this._calibrationMeters > 0
                            ? html`
                                <button class="place-btn" @click=${this._applyCalibration}>
                                  ${this._t("editor.calibration_apply")}
                                </button>
                              `
                            : nothing}
                        </div>
                      </div>
                      ${hasCalibration
                        ? html`
                            <div class="calibration-result">
                              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                              ${this._t("editor.calibration_result")}:
                              <strong>${this._getCalibrationResult()}</strong>
                            </div>
                          `
                        : nothing}
                    `
                  : nothing}
              </div>
            `
          : nothing}

        <!-- Manual dimensions -->
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
          <span class="help">${this._t("editor.dimensions_help")}</span>
        </div>

        <!-- Multi-floor management -->
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
                <div class="entity-picker">
                  <input
                    type="text"
                    .value=${proxy.entity_id}
                    @input=${(e: Event) => {
                      const val = (e.target as HTMLInputElement).value;
                      this._updateProxy(idx, "entity_id", val);
                      this._entityFilter = val;
                      this._showEntityDropdown = idx;
                    }}
                    @focus=${() => {
                      this._entityFilter = proxy.entity_id || "";
                      this._showEntityDropdown = idx;
                    }}
                    @blur=${() => setTimeout(() => { this._showEntityDropdown = null; }, 200)}
                    placeholder="${this._t("editor.proxy_entity")}"
                    autocomplete="off"
                  />
                  ${this._showEntityDropdown === idx
                    ? html`
                        <div class="entity-dropdown">
                          ${this._getAvailableEntities(this._entityFilter, "proxy").map(
                            (e) => html`
                              <div
                                class="entity-option"
                                @mousedown=${() => {
                                  this._updateProxy(idx, "entity_id", e.entity_id);
                                  this._showEntityDropdown = null;
                                }}
                              >
                                <span class="entity-id">${e.entity_id}</span>
                                <span class="entity-name">${e.name}</span>
                              </div>
                            `
                          )}
                          ${this._getAvailableEntities(this._entityFilter, "proxy").length === 0
                            ? html`<div class="entity-option empty">${this._t("editor.no_entities_found")}</div>`
                            : nothing}
                        </div>
                      `
                    : nothing}
                </div>
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
                      ${z.show_label !== false
                        ? html`
                            <text
                              x="${this._getZoneCentroid(z.points).x}"
                              y="${this._getZoneCentroid(z.points).y}"
                              text-anchor="middle"
                              dominant-baseline="central"
                              font-size="2.5"
                              fill="${z.border_color || z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                              font-weight="600"
                            >${z.name}</text>
                          `
                        : nothing}
                    `
                  )}
                  <!-- Drawing in progress -->
                  ${this._drawingZone !== null && this._drawingPoints.length > 0
                    ? html`
                        <polyline
                          points="${this._drawingPoints.map((p) => `${p.x},${p.y}`).join(" ")}"
                          fill="none"
                          stroke="#4FC3F7"
                          stroke-width="0.3"
                          stroke-dasharray="0.5,0.5"
                        />
                        ${this._drawingPoints.map(
                          (p) => html`
                            <circle cx="${p.x}" cy="${p.y}" r="0.5" fill="#4FC3F7" />
                          `
                        )}
                      `
                    : nothing}
                </svg>
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
                  .value=${zone.name}
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
                  <span class="label-sm">${zone.points.length} ${this._t("editor.zone_points")}</span>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${zone.show_label !== false}
                      @change=${(e: Event) => this._updateZone(idx, "show_label", (e.target as HTMLInputElement).checked)}
                    />
                    ${this._t("editor.zone_show_label")}
                  </label>
                </div>
                <div class="field-row">
                  <span class="label-sm">${this._t("editor.zone_opacity")}</span>
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
    const bermudaPrefixes = this._getBermudaDevicePrefixes();

    return html`
      <div class="section">
        <div class="section-title">${this._t("editor.devices")}</div>

        ${bermudaPrefixes.length > 0
          ? html`
              <div class="discovered-devices">
                <div class="label-sm" style="margin-bottom: 6px;">${this._t("editor.discovered_devices")}</div>
                <div class="discovered-list">
                  ${bermudaPrefixes
                    .filter((bp) => !devices.some((d) => d.entity_prefix === bp.prefix))
                    .map(
                      (bp) => html`
                        <button class="discovered-btn" @click=${() => this._addDeviceFromDiscovery(bp.prefix, bp.name)}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                          </svg>
                          ${bp.name}
                        </button>
                      `
                    )}
                </div>
              </div>
            `
          : nothing}

        ${devices.map(
          (device, idx) => html`
            <div class="list-item">
              <div class="device-color-dot" style="background: ${device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length]}"></div>
              <div class="list-item-content">
                <div class="entity-picker">
                  <input
                    type="text"
                    .value=${device.entity_prefix || ""}
                    @input=${(e: Event) => {
                      const val = (e.target as HTMLInputElement).value;
                      this._updateDevice(idx, "entity_prefix", val);
                      this._deviceEntityFilter = val;
                      this._showDeviceEntityDropdown = idx;
                    }}
                    @focus=${() => {
                      this._deviceEntityFilter = device.entity_prefix || "";
                      this._showDeviceEntityDropdown = idx;
                    }}
                    @blur=${() => setTimeout(() => { this._showDeviceEntityDropdown = null; }, 200)}
                    placeholder="${this._t("editor.device_entity")}"
                    autocomplete="off"
                  />
                  ${this._showDeviceEntityDropdown === idx
                    ? html`
                        <div class="entity-dropdown">
                          ${bermudaPrefixes
                            .filter((bp) => {
                              if (!this._deviceEntityFilter) return true;
                              const lf = this._deviceEntityFilter.toLowerCase();
                              return bp.prefix.toLowerCase().includes(lf) || bp.name.toLowerCase().includes(lf);
                            })
                            .map(
                              (bp) => html`
                                <div
                                  class="entity-option"
                                  @mousedown=${() => {
                                    this._updateDevice(idx, "entity_prefix", bp.prefix);
                                    if (!device.name || device.name.startsWith("Device ")) {
                                      this._updateDevice(idx, "name", bp.name);
                                    }
                                    this._showDeviceEntityDropdown = null;
                                  }}
                                >
                                  <span class="entity-id">${bp.prefix}</span>
                                  <span class="entity-name">${bp.name}</span>
                                </div>
                              `
                            )}
                          ${bermudaPrefixes.length === 0
                            ? html`<div class="entity-option empty">${this._t("editor.no_bermuda_devices")}</div>`
                            : nothing}
                        </div>
                      `
                    : nothing}
                </div>
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

        <div class="field">
          <label>${this._t("editor.floor_display")}</label>
          <select
            @change=${(e: Event) => this._updateConfig("floor_display_mode", (e.target as HTMLSelectElement).value)}
          >
            <option value="tabs" ?selected=${this._config.floor_display_mode === "tabs"}>${this._t("editor.floor_display_tabs")}</option>
            <option value="stacked" ?selected=${this._config.floor_display_mode === "stacked"}>${this._t("editor.floor_display_stacked")}</option>
          </select>
        </div>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.auto_fit !== false}
            @change=${(e: Event) => this._updateConfig("auto_fit", (e.target as HTMLInputElement).checked)}
          />
          ${this._t("editor.auto_fit")}
        </label>

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

  private _addDeviceFromDiscovery(prefix: string, name: string): void {
    const devices = [...(this._config.tracked_devices || [])];
    const idx = devices.length;
    devices.push({
      entity_prefix: prefix,
      name: name,
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
    this._placingProxy = null;
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

  // ─── Calibration ────────────────────────────────────────────

  private _toggleCalibration(): void {
    if (this._calibrating) {
      this._calibrating = false;
      this._calibrationPoints = [];
    } else {
      this._calibrating = true;
      this._calibrationPoints = [];
      this._calibrationMeters = 0;
      this._placingProxy = null;
      this._drawingZone = null;
    }
  }

  private _resetCalibration(): void {
    this._calibrating = false;
    this._calibrationPoints = [];
    this._calibrationMeters = 0;
  }

  private _handleCalibrationMapClick(e: MouseEvent): void {
    if (!this._calibrating) return;
    if (this._calibrationPoints.length >= 2) return;

    const img = (e.currentTarget as HTMLElement).querySelector("img");
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const point = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    this._calibrationPoints = [...this._calibrationPoints, point];

    if (this._calibrationPoints.length === 2) {
      this._calibrating = false;
    }

    this.requestUpdate();
  }

  private _handleCalibrationDistanceInput(e: Event): void {
    this._calibrationMeters = parseFloat((e.target as HTMLInputElement).value) || 0;
  }

  private _applyCalibration(): void {
    if (this._calibrationPoints.length !== 2 || this._calibrationMeters <= 0) return;

    const p1 = this._calibrationPoints[0];
    const p2 = this._calibrationPoints[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distPercent = Math.sqrt(dx * dx + dy * dy);

    if (distPercent < 0.5) return;

    const img = this.shadowRoot?.querySelector(".calibration-map img") as HTMLImageElement;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const dxNorm = dx / 100 * aspectRatio;
    const dyNorm = dy / 100;
    const normDist = Math.sqrt(dxNorm * dxNorm + dyNorm * dyNorm);

    const realHeight = this._calibrationMeters / normDist;
    const realWidth = realHeight * aspectRatio;

    const roundedWidth = Math.round(realWidth * 10) / 10;
    const roundedHeight = Math.round(realHeight * 10) / 10;

    const floors = [...(this._config.floors || [])];
    if (floors.length > 0) {
      floors[0] = { ...floors[0], image_width: roundedWidth, image_height: roundedHeight };
      this._updateConfig("floors", floors);
    } else {
      this._config = {
        ...this._config,
        floors: [{
          id: "floor_main",
          name: "Main",
          image: this._config.floorplan_image || "",
          image_width: roundedWidth,
          image_height: roundedHeight,
        }],
      };
      this._fireConfigChanged();
    }
  }

  private _getCalibrationResult(): string {
    if (this._calibrationPoints.length !== 2 || this._calibrationMeters <= 0) return "";

    const img = this.shadowRoot?.querySelector(".calibration-map img") as HTMLImageElement;
    if (!img || !img.naturalWidth || !img.naturalHeight) return "";

    const p1 = this._calibrationPoints[0];
    const p2 = this._calibrationPoints[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const aspectRatio = img.naturalWidth / img.naturalHeight;

    const dxNorm = dx / 100 * aspectRatio;
    const dyNorm = dy / 100;
    const normDist = Math.sqrt(dxNorm * dxNorm + dyNorm * dyNorm);

    const realHeight = this._calibrationMeters / normDist;
    const realWidth = realHeight * aspectRatio;

    return `${Math.round(realWidth * 10) / 10}m x ${Math.round(realHeight * 10) / 10}m`;
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

    if (this._drawingPoints.length >= 3) {
      const first = this._drawingPoints[0];
      const dist = Math.sqrt(Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2));
      if (dist < 3) {
        this._drawingPoints = this._drawingPoints.slice(0, -1);
        this._finishDrawingZone();
        return;
      }
    }

    this.requestUpdate();
  }

  // ─── Fullscreen Editor Toggle ─────────────────────────────

  private _toggleFullscreenEditor(): void {
    this._fullscreenEditor = !this._fullscreenEditor;
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

      :host(.fullscreen-editor) {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 999 !important;
        background: var(--editor-bg) !important;
        overflow-y: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
      }

      .editor-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        border-bottom: 1px solid var(--editor-border);
      }

      .editor-toolbar-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--editor-text);
      }

      .expand-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        background: transparent;
        color: var(--editor-text-secondary);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .expand-btn:hover {
        background: var(--editor-accent);
        color: white;
        border-color: var(--editor-accent);
      }

      .expand-btn svg {
        width: 14px;
        height: 14px;
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

      .subsection {
        margin-bottom: 16px;
      }

      .subsection-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--editor-text);
      }

      .add-btn {
        padding: 6px 12px;
        border: 1px dashed var(--editor-border);
        border-radius: 8px;
        background: transparent;
        color: var(--editor-accent);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .add-btn:hover {
        border-color: var(--editor-accent);
        background: rgba(79, 195, 247, 0.05);
      }

      .add-btn.full {
        width: 100%;
        text-align: center;
      }

      .remove-btn {
        background: none;
        border: none;
        color: var(--editor-text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        flex-shrink: 0;
        margin-top: 8px;
      }

      .remove-btn:hover {
        color: #E57373;
      }

      .remove-btn svg {
        width: 16px;
        height: 16px;
      }

      .place-btn {
        padding: 4px 10px;
        border: 1px solid var(--editor-border);
        border-radius: 6px;
        background: transparent;
        color: var(--editor-text-secondary);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .place-btn:hover {
        border-color: var(--editor-accent);
        color: var(--editor-accent);
      }

      .place-btn.active {
        background: var(--editor-accent);
        color: white;
        border-color: var(--editor-accent);
      }

      .map-preview {
        position: relative;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 12px;
        cursor: crosshair;
      }

      .map-preview img {
        width: 100%;
        display: block;
        opacity: 0.7;
      }

      .proxy-marker {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--editor-accent);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 700;
        transform: translate(-50%, -50%);
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        pointer-events: none;
      }

      .proxy-marker.placing {
        animation: pulse 1s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.3); }
      }

      .placing-hint {
        position: absolute;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        z-index: 10;
      }

      .zone-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
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

      .calibration-result {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(76, 175, 80, 0.08);
        border: 1px solid rgba(76, 175, 80, 0.25);
        border-radius: 8px;
        font-size: 12px;
        color: #4CAF50;
        margin-top: 4px;
      }

      .calibration-result strong {
        color: var(--editor-text);
      }

      .calibration-map {
        border: 2px solid transparent;
        transition: border-color 0.2s;
      }

      /* Entity picker dropdown */
      .entity-picker {
        position: relative;
      }

      .entity-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: var(--editor-bg, #fff);
        border: 1px solid var(--editor-border);
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 100;
      }

      .entity-option {
        padding: 8px 10px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid var(--editor-border);
      }

      .entity-option:last-child {
        border-bottom: none;
      }

      .entity-option:hover {
        background: rgba(79, 195, 247, 0.08);
      }

      .entity-option.empty {
        color: var(--editor-text-secondary);
        font-style: italic;
        cursor: default;
      }

      .entity-option .entity-id {
        display: block;
        font-size: 11px;
        color: var(--editor-text);
        font-family: monospace;
      }

      .entity-option .entity-name {
        display: block;
        font-size: 10px;
        color: var(--editor-text-secondary);
        margin-top: 1px;
      }

      /* Discovered devices */
      .discovered-devices {
        padding: 10px;
        border: 1px solid rgba(76, 175, 80, 0.25);
        border-radius: 8px;
        background: rgba(76, 175, 80, 0.04);
        margin-bottom: 12px;
      }

      .discovered-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .discovered-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-radius: 16px;
        background: transparent;
        color: #4CAF50;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .discovered-btn:hover {
        background: #4CAF50;
        color: white;
      }

      .discovered-btn svg {
        width: 14px;
        height: 14px;
      }
    `;
  }

  protected render() {
    if (!this._config) return nothing;

    if (this.hass) {
      this._lang = this.hass.selectedLanguage || this.hass.language || "en";
    }

    // Toggle fullscreen class on host
    if (this._fullscreenEditor) {
      this.classList.add("fullscreen-editor");
    } else {
      this.classList.remove("fullscreen-editor");
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
      <!-- Editor toolbar with expand button -->
      <div class="editor-toolbar">
        <span class="editor-toolbar-title">${this._t("editor.title")}</span>
        <button class="expand-btn" @click=${this._toggleFullscreenEditor}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            ${this._fullscreenEditor
              ? html`<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>`
              : html`<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>`}
          </svg>
          ${this._fullscreenEditor ? this._t("editor.collapse_editor") : this._t("editor.expand_editor")}
        </button>
      </div>

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
