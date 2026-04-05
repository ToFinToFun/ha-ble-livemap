/**
 * ha-ble-livemap - Visual Card Editor & Setup Wizard
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * Provides a tabbed Lovelace editor with large interactive maps,
 * entity dropdowns, auto-placement, drag-and-drop, and hover tooltips.
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
  @state() private _activeTab = "floorplan";
  @state() private _placingProxy: number | null = null;
  @state() private _drawingZone: number | null = null;
  @state() private _drawingPoints: { x: number; y: number }[] = [];
  @state() private _calibrating = false;
  @state() private _calibrationPoints: { x: number; y: number }[] = [];
  @state() private _calibrationMeters = 0;
  @state() private _hoveredProxy: number | null = null;
  @state() private _hoverPos: { x: number; y: number } | null = null;
  @state() private _draggingProxy: number | null = null;
  @state() private _autoPlaceResults: string[] = [];

  private _lang = "en";
  private _dragStarted = false;

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

  private _getAllEntities(): { entity_id: string; name: string }[] {
    if (!this.hass?.states) return [];
    return Object.keys(this.hass.states)
      .map((eid) => ({
        entity_id: eid,
        name: this.hass.states[eid]?.attributes?.friendly_name || eid,
      }))
      .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  }

  private _getBermudaEntities(): { entity_id: string; name: string }[] {
    if (!this.hass?.states) return [];
    return Object.keys(this.hass.states)
      .filter((eid) =>
        eid.includes("bermuda") ||
        eid.includes("ble_proxy") ||
        eid.includes("bluetooth_proxy") ||
        eid.includes("esphome")
      )
      .map((eid) => ({
        entity_id: eid,
        name: this.hass.states[eid]?.attributes?.friendly_name || eid,
      }))
      .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  }

  private _getBermudaDevicePrefixes(): { prefix: string; name: string }[] {
    if (!this.hass?.states) return [];
    const prefixes = new Map<string, string>();
    Object.keys(this.hass.states)
      .filter((eid) => eid.includes("bermuda"))
      .forEach((eid) => {
        const parts = eid.split("_");
        const lastPart = parts[parts.length - 1];
        const suffixes = ["distance", "area", "rssi", "power", "scanner"];
        if (suffixes.includes(lastPart)) {
          const prefix = parts.slice(0, -1).join("_");
          if (!prefixes.has(prefix)) {
            const name = this.hass.states[eid]?.attributes?.friendly_name || prefix;
            const cleanName = name.replace(/ (Distance|Area|RSSI|Power|Scanner)$/i, "");
            prefixes.set(prefix, cleanName);
          }
        }
      });
    return Array.from(prefixes.entries()).map(([prefix, name]) => ({ prefix, name }));
  }

  // ─── Auto-Placement Logic ─────────────────────────────────

  private _autoPlaceProxies(): void {
    const proxies = [...(this._config.proxies || [])];
    const zones = this._config.zones || [];
    if (zones.length === 0 || proxies.length === 0) {
      this._autoPlaceResults = [this._t("editor.auto_place_no_zones")];
      this.requestUpdate();
      return;
    }

    const results: string[] = [];
    let placedCount = 0;

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      // Get all name variants to match against
      const proxyName = (proxy.name || "").toLowerCase().trim();
      const proxyEntityId = (proxy.entity_id || "").toLowerCase();
      // Extract meaningful parts from entity_id (e.g. "sensor.bermuda_ble_proxy_kitchen" -> "kitchen")
      const entityParts = proxyEntityId.replace(/^.*\./, "").split("_");

      let bestMatch: { zone: ZoneConfig; score: number } | null = null;

      for (const zone of zones) {
        const zoneName = (zone.name || "").toLowerCase().trim();
        if (!zoneName) continue;

        let score = 0;

        // Exact name match
        if (proxyName && proxyName === zoneName) {
          score = 100;
        }
        // Proxy name contains zone name
        else if (proxyName && proxyName.includes(zoneName)) {
          score = 80;
        }
        // Zone name contains proxy name
        else if (proxyName && zoneName.includes(proxyName)) {
          score = 70;
        }
        // Entity ID parts contain zone name
        else if (entityParts.some((part) => part.length > 2 && zoneName.includes(part))) {
          score = 60;
        }
        // Zone name words match entity parts
        else {
          const zoneWords = zoneName.split(/[\s_-]+/);
          for (const word of zoneWords) {
            if (word.length > 2 && entityParts.some((part) => part.includes(word) || word.includes(part))) {
              score = 50;
              break;
            }
          }
        }

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { zone, score };
        }
      }

      if (bestMatch) {
        // Place proxy at zone centroid
        const centroid = this._getZoneCentroid(bestMatch.zone.points);
        proxies[i] = { ...proxies[i], x: centroid.x, y: centroid.y };
        placedCount++;
        results.push(`✓ "${proxy.name || proxy.entity_id}" → "${bestMatch.zone.name}"`);
      } else {
        results.push(`✗ "${proxy.name || proxy.entity_id}" — ${this._t("editor.auto_place_no_match")}`);
      }
    }

    this._updateConfig("proxies", proxies);
    results.unshift(`${this._t("editor.auto_place_placed")} ${placedCount}/${proxies.length}`);
    this._autoPlaceResults = results;
    this.requestUpdate();
  }

  // ─── Floor Plan Section ───────────────────────────────────

  private _renderFloorplanTab() {
    const floors = this._config.floors || [];
    const floorplanImage = this._getFloorplanImage();
    const hasCalibration = this._calibrationPoints.length === 2 && this._calibrationMeters > 0;

    return html`
      <div class="tab-content">
        <h3>${this._t("editor.floorplan")}</h3>

        ${floors.length === 0
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
                <h4>${this._t("editor.calibration")}</h4>
                <p class="help">${this._t("editor.calibration_help")}</p>

                <div class="large-map" @click=${this._handleCalibrationClick}>
                  <img src=${floorplanImage} alt="Floor plan" />
                  <svg class="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${this._calibrationPoints.length >= 1
                      ? html`
                          <circle cx="${this._calibrationPoints[0].x}" cy="${this._calibrationPoints[0].y}"
                            r="0.6" fill="#FF5722" stroke="white" stroke-width="0.15" />
                        `
                      : nothing}
                    ${this._calibrationPoints.length === 2
                      ? html`
                          <line x1="${this._calibrationPoints[0].x}" y1="${this._calibrationPoints[0].y}"
                            x2="${this._calibrationPoints[1].x}" y2="${this._calibrationPoints[1].y}"
                            stroke="#FF5722" stroke-width="0.25" stroke-dasharray="0.8,0.4" />
                          <circle cx="${this._calibrationPoints[1].x}" cy="${this._calibrationPoints[1].y}"
                            r="0.6" fill="#FF5722" stroke="white" stroke-width="0.15" />
                        `
                      : nothing}
                  </svg>
                  ${this._calibrating
                    ? html`<div class="map-hint">
                        ${this._calibrationPoints.length === 0
                          ? this._t("editor.calibration_click_start")
                          : this._t("editor.calibration_click_end")}
                      </div>`
                    : nothing}
                </div>

                <div class="action-row">
                  <button class="btn ${this._calibrating ? 'btn-active' : ''}"
                    @click=${this._toggleCalibration}>
                    ${this._calibrating ? this._t("editor.calibration_cancel") : this._t("editor.calibration_start")}
                  </button>
                  ${this._calibrationPoints.length === 2
                    ? html`<button class="btn" @click=${this._resetCalibration}>${this._t("editor.calibration_reset")}</button>`
                    : nothing}
                </div>

                ${this._calibrationPoints.length === 2
                  ? html`
                      <div class="field inline">
                        <label>${this._t("editor.calibration_distance")}</label>
                        <div class="inline-group">
                          <input type="number" .value=${String(this._calibrationMeters || "")}
                            @input=${(e: Event) => { this._calibrationMeters = parseFloat((e.target as HTMLInputElement).value) || 0; }}
                            placeholder="${this._t("editor.calibration_distance_placeholder")}" min="0.1" step="0.1" />
                          <span class="unit">m</span>
                          ${this._calibrationMeters > 0
                            ? html`<button class="btn btn-primary" @click=${this._applyCalibration}>${this._t("editor.calibration_apply")}</button>`
                            : nothing}
                        </div>
                      </div>
                      ${hasCalibration
                        ? html`<div class="success-box">${this._t("editor.calibration_result")}: <strong>${this._getCalibrationResult()}</strong></div>`
                        : nothing}
                    `
                  : nothing}
              </div>
            `
          : nothing}

        <!-- Manual dimensions -->
        <div class="field inline">
          <label>${this._t("editor.real_dimensions")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._getFirstFloor()?.image_width || 20)}
              @input=${(e: Event) => this._updateFloorDimension("image_width", e)} placeholder="20" min="1" step="0.5" />
            <span class="unit">m</span>
            <span class="sep">x</span>
            <input type="number" .value=${String(this._getFirstFloor()?.image_height || 15)}
              @input=${(e: Event) => this._updateFloorDimension("image_height", e)} placeholder="15" min="1" step="0.5" />
            <span class="unit">m</span>
          </div>
          <span class="help">${this._t("editor.dimensions_help")}</span>
        </div>

        <!-- Multi-floor management -->
        <div class="subsection">
          <div class="subsection-header">
            <h4>${this._t("editor.floors")}</h4>
            <button class="btn btn-add" @click=${this._addFloor}>+ ${this._t("editor.add_floor")}</button>
          </div>
          ${floors.map(
            (floor, idx) => html`
              <div class="item-card">
                <div class="item-body">
                  <input type="text" .value=${floor.name}
                    @input=${(e: Event) => this._updateFloor(idx, "name", (e.target as HTMLInputElement).value)}
                    placeholder="${this._t("editor.floor_name")}" />
                  <input type="text" .value=${floor.image}
                    @input=${(e: Event) => this._updateFloor(idx, "image", (e.target as HTMLInputElement).value)}
                    placeholder="${this._t("editor.floor_image")}" />
                </div>
                <button class="btn-icon btn-remove" @click=${() => this._removeFloor(idx)}>✕</button>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  // ─── Proxies Section ──────────────────────────────────────

  private _renderProxiesTab() {
    const proxies = this._config.proxies || [];
    const floorplanImage = this._getFloorplanImage();
    const zones = this._config.zones || [];

    return html`
      <div class="tab-content">
        <h3>${this._t("editor.proxies")}</h3>

        ${floorplanImage
          ? html`
              <div class="large-map"
                @click=${this._handleProxyMapClick}
                @mousemove=${this._handleProxyMapMouseMove}
                @mouseleave=${this._handleProxyMapMouseLeave}
                @mousedown=${this._handleProxyMapMouseDown}
                @mouseup=${this._handleProxyMapMouseUp}
              >
                <img src=${floorplanImage} alt="Floor plan" draggable="false" />
                <svg class="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <!-- Draw zones as background reference -->
                  ${zones.map(
                    (z, idx) => html`
                      <polygon
                        points="${z.points.map((p) => `${p.x},${p.y}`).join(" ")}"
                        fill="${z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                        fill-opacity="0.08"
                        stroke="${z.border_color || z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                        stroke-width="0.2" stroke-dasharray="0.8,0.4" />
                      ${z.show_label !== false && z.name
                        ? html`<text x="${this._getZoneCentroid(z.points).x}" y="${this._getZoneCentroid(z.points).y}"
                            text-anchor="middle" dominant-baseline="central" font-size="1.8"
                            fill="${z.border_color || z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                            fill-opacity="0.5" font-weight="500">${z.name}</text>`
                        : nothing}
                    `
                  )}
                  <!-- Draw proxies -->
                  ${proxies.map(
                    (p, idx) => html`
                      <g class="${this._placingProxy === idx ? 'pulse-marker' : ''} ${this._draggingProxy === idx ? 'dragging-marker' : ''}">
                        <circle cx="${p.x}" cy="${p.y}" r="${this._hoveredProxy === idx ? 1.8 : 1.2}"
                          fill="${p.color || '#4FC3F7'}" stroke="white" stroke-width="0.2"
                          style="cursor: ${this._placingProxy !== null ? 'crosshair' : 'grab'}; pointer-events: all; transition: r 0.15s;" />
                        <text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central"
                          font-size="1" fill="white" font-weight="700">B</text>
                        ${p.name
                          ? html`<text x="${p.x}" y="${Number(p.y) + 2.5}" text-anchor="middle"
                              font-size="1.4" fill="${p.color || '#4FC3F7'}" font-weight="500"
                              fill-opacity="0.8">${p.name}</text>`
                          : nothing}
                      </g>
                    `
                  )}
                </svg>
                ${this._placingProxy !== null
                  ? html`<div class="map-hint">${this._t("editor.place_on_map")}</div>`
                  : nothing}
                ${this._draggingProxy !== null
                  ? html`<div class="map-hint">${this._t("editor.drag_to_move")}</div>`
                  : nothing}
                <!-- Hover tooltip -->
                ${this._hoveredProxy !== null && this._hoverPos && this._draggingProxy === null
                  ? this._renderProxyTooltip(proxies[this._hoveredProxy], this._hoveredProxy)
                  : nothing}
              </div>
            `
          : nothing}

        <!-- Auto-place button -->
        ${proxies.length > 0 && zones.length > 0
          ? html`
              <div class="action-row">
                <button class="btn btn-primary" @click=${this._autoPlaceProxies}>
                  ⚡ ${this._t("editor.auto_place")}
                </button>
                <span class="help" style="margin: 0; align-self: center;">${this._t("editor.auto_place_help")}</span>
              </div>
              ${this._autoPlaceResults.length > 0
                ? html`
                    <div class="auto-place-results">
                      ${this._autoPlaceResults.map(
                        (r) => html`<div class="auto-place-line">${r}</div>`
                      )}
                    </div>
                  `
                : nothing}
            `
          : nothing}

        <div class="items-list">
          ${proxies.map(
            (proxy, idx) => html`
              <div class="item-card ${this._hoveredProxy === idx ? 'item-card-highlight' : ''}">
                <div class="item-body">
                  <div class="field">
                    <label>${this._t("editor.proxy_entity")}</label>
                    <select @change=${(e: Event) => this._updateProxy(idx, "entity_id", (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select entity --</option>
                      ${this._getAllEntities().map(
                        (ent) => html`
                          <option value=${ent.entity_id} ?selected=${proxy.entity_id === ent.entity_id}>
                            ${ent.name} (${ent.entity_id})
                          </option>
                        `
                      )}
                    </select>
                  </div>
                  <div class="field">
                    <label>${this._t("editor.proxy_name")}</label>
                    <input type="text" .value=${proxy.name || ""}
                      @input=${(e: Event) => this._updateProxy(idx, "name", (e.target as HTMLInputElement).value)}
                      placeholder="${this._t("editor.proxy_name")}" />
                  </div>
                  <div class="inline-group">
                    <span class="label-sm">X: ${proxy.x.toFixed(1)}%</span>
                    <span class="label-sm">Y: ${proxy.y.toFixed(1)}%</span>
                    <input type="color" .value=${proxy.color || "#4FC3F7"}
                      @input=${(e: Event) => this._updateProxy(idx, "color", (e.target as HTMLInputElement).value)} />
                    <button class="btn ${this._placingProxy === idx ? 'btn-active' : ''}"
                      @click=${() => { this._placingProxy = this._placingProxy === idx ? null : idx; this._draggingProxy = null; }}>
                      ${this._t("editor.place_on_map")}
                    </button>
                  </div>
                </div>
                <button class="btn-icon btn-remove" @click=${() => this._removeProxy(idx)}>✕</button>
              </div>
            `
          )}
        </div>

        <button class="btn btn-add btn-full" @click=${this._addProxy}>+ ${this._t("editor.add_proxy")}</button>
      </div>
    `;
  }

  // ─── Proxy Tooltip ────────────────────────────────────────

  private _renderProxyTooltip(proxy: ProxyConfig, idx: number) {
    if (!this._hoverPos) return nothing;

    const entityState = proxy.entity_id ? this.hass?.states?.[proxy.entity_id] : undefined;
    const friendlyName = entityState?.attributes?.friendly_name || "";
    const state = entityState?.state || "";
    const lastUpdated = entityState?.last_updated
      ? new Date(entityState.last_updated).toLocaleTimeString()
      : "";

    return html`
      <div class="proxy-tooltip" style="left: ${this._hoverPos.x}px; top: ${this._hoverPos.y}px;">
        <div class="tooltip-title">${proxy.name || `Proxy ${idx + 1}`}</div>
        <div class="tooltip-row"><span class="tooltip-label">Entity:</span> <span class="tooltip-value">${proxy.entity_id || "—"}</span></div>
        ${friendlyName
          ? html`<div class="tooltip-row"><span class="tooltip-label">Name:</span> <span class="tooltip-value">${friendlyName}</span></div>`
          : nothing}
        ${state
          ? html`<div class="tooltip-row"><span class="tooltip-label">State:</span> <span class="tooltip-value">${state}</span></div>`
          : nothing}
        <div class="tooltip-row"><span class="tooltip-label">Position:</span> <span class="tooltip-value">X: ${proxy.x.toFixed(1)}% Y: ${proxy.y.toFixed(1)}%</span></div>
        ${proxy.floor_id
          ? html`<div class="tooltip-row"><span class="tooltip-label">Floor:</span> <span class="tooltip-value">${proxy.floor_id}</span></div>`
          : nothing}
        ${lastUpdated
          ? html`<div class="tooltip-row"><span class="tooltip-label">Updated:</span> <span class="tooltip-value">${lastUpdated}</span></div>`
          : nothing}
        <div class="tooltip-hint">${this._t("editor.drag_hint")}</div>
      </div>
    `;
  }

  // ─── Zones Section ────────────────────────────────────────

  private _renderZonesTab() {
    const zones = this._config.zones || [];
    const floorplanImage = this._getFloorplanImage();

    return html`
      <div class="tab-content">
        <h3>${this._t("editor.zones")}</h3>
        <p class="help">${this._t("editor.zones_help")}</p>

        ${floorplanImage
          ? html`
              <div class="large-map" @click=${this._handleZoneMapClick}>
                <img src=${floorplanImage} alt="Floor plan" draggable="false" />
                <svg class="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${zones.map(
                    (z, idx) => html`
                      <polygon
                        points="${z.points.map((p) => `${p.x},${p.y}`).join(" ")}"
                        fill="${z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                        fill-opacity="${z.opacity ?? 0.15}"
                        stroke="${z.border_color || z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                        stroke-width="0.3" stroke-dasharray="1,0.5" />
                      ${z.show_label !== false
                        ? html`
                            <text x="${this._getZoneCentroid(z.points).x}" y="${this._getZoneCentroid(z.points).y}"
                              text-anchor="middle" dominant-baseline="central" font-size="2.2"
                              fill="${z.border_color || z.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"
                              font-weight="600">${z.name}</text>
                          `
                        : nothing}
                    `
                  )}
                  ${this._drawingZone !== null && this._drawingPoints.length > 0
                    ? html`
                        <polyline points="${this._drawingPoints.map((p) => `${p.x},${p.y}`).join(" ")}"
                          fill="none" stroke="#4FC3F7" stroke-width="0.3" stroke-dasharray="0.5,0.5" />
                        ${this._drawingPoints.map(
                          (p) => html`<circle cx="${p.x}" cy="${p.y}" r="0.5" fill="#4FC3F7" />`
                        )}
                      `
                    : nothing}
                </svg>
                ${this._drawingZone !== null
                  ? html`<div class="map-hint">${this._t("editor.zone_draw_hint")}</div>`
                  : nothing}
              </div>
            `
          : nothing}

        <div class="items-list">
          ${zones.map(
            (zone, idx) => html`
              <div class="item-card">
                <div class="color-dot" style="background: ${zone.color || ZONE_COLORS[idx % ZONE_COLORS.length]}"></div>
                <div class="item-body">
                  <input type="text" .value=${zone.name}
                    @input=${(e: Event) => this._updateZone(idx, "name", (e.target as HTMLInputElement).value)}
                    placeholder="${this._t("editor.zone_name")}" />
                  <div class="inline-group">
                    <input type="color" .value=${zone.color || ZONE_COLORS[idx % ZONE_COLORS.length]}
                      @input=${(e: Event) => this._updateZone(idx, "color", (e.target as HTMLInputElement).value)}
                      title="${this._t("editor.zone_color")}" />
                    <input type="color" .value=${zone.border_color || zone.color || ZONE_COLORS[idx % ZONE_COLORS.length]}
                      @input=${(e: Event) => this._updateZone(idx, "border_color", (e.target as HTMLInputElement).value)}
                      title="${this._t("editor.zone_border_color")}" />
                    <span class="label-sm">${zone.points.length} ${this._t("editor.zone_points")}</span>
                    <label class="check">
                      <input type="checkbox" .checked=${zone.show_label !== false}
                        @change=${(e: Event) => this._updateZone(idx, "show_label", (e.target as HTMLInputElement).checked)} />
                      ${this._t("editor.zone_show_label")}
                    </label>
                  </div>
                  <div class="inline-group">
                    <span class="label-sm">${this._t("editor.zone_opacity")}</span>
                    <input type="range" min="0" max="0.5" step="0.02"
                      .value=${String(zone.opacity ?? 0.12)}
                      @input=${(e: Event) => this._updateZone(idx, "opacity", parseFloat((e.target as HTMLInputElement).value))} />
                    <button class="btn ${this._drawingZone === idx ? 'btn-active' : ''}"
                      @click=${() => this._startDrawingZone(idx)}>
                      ${this._t("editor.zone_redraw")}
                    </button>
                  </div>
                </div>
                <button class="btn-icon btn-remove" @click=${() => this._removeZone(idx)}>✕</button>
              </div>
            `
          )}
        </div>

        <div class="action-row">
          <button class="btn btn-add btn-full" @click=${this._addZone}>+ ${this._t("editor.add_zone")}</button>
          ${this._drawingZone !== null
            ? html`<button class="btn btn-active" @click=${this._finishDrawingZone}>${this._t("editor.zone_finish")}</button>`
            : nothing}
        </div>
      </div>
    `;
  }

  // ─── Devices Section ──────────────────────────────────────

  private _renderDevicesTab() {
    const devices = this._config.tracked_devices || [];
    const bermudaPrefixes = this._getBermudaDevicePrefixes();

    return html`
      <div class="tab-content">
        <h3>${this._t("editor.devices")}</h3>

        ${bermudaPrefixes.length > 0
          ? html`
              <div class="discovery-box">
                <div class="label-sm" style="margin-bottom: 6px;">${this._t("editor.discovered_devices")}</div>
                <div class="discovery-list">
                  ${bermudaPrefixes
                    .filter((bp) => !devices.some((d) => d.entity_prefix === bp.prefix))
                    .map(
                      (bp) => html`
                        <button class="btn-chip" @click=${() => this._addDeviceFromDiscovery(bp.prefix, bp.name)}>
                          + ${bp.name}
                        </button>
                      `
                    )}
                </div>
              </div>
            `
          : nothing}

        <div class="items-list">
          ${devices.map(
            (device, idx) => html`
              <div class="item-card">
                <div class="color-dot" style="background: ${device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length]}"></div>
                <div class="item-body">
                  <div class="field">
                    <label>${this._t("editor.device_entity")}</label>
                    <select @change=${(e: Event) => {
                      const val = (e.target as HTMLSelectElement).value;
                      this._updateDevice(idx, "entity_prefix", val);
                      const bp = bermudaPrefixes.find((b) => b.prefix === val);
                      if (bp && (!device.name || device.name.startsWith("Device "))) {
                        this._updateDevice(idx, "name", bp.name);
                      }
                    }}>
                      <option value="">-- Select Bermuda device --</option>
                      ${bermudaPrefixes.map(
                        (bp) => html`
                          <option value=${bp.prefix} ?selected=${device.entity_prefix === bp.prefix}>
                            ${bp.name} (${bp.prefix})
                          </option>
                        `
                      )}
                    </select>
                  </div>
                  <div class="field">
                    <label>${this._t("editor.device_name")}</label>
                    <input type="text" .value=${device.name}
                      @input=${(e: Event) => this._updateDevice(idx, "name", (e.target as HTMLInputElement).value)}
                      placeholder="${this._t("editor.device_name")}" />
                  </div>
                  <div class="inline-group">
                    <input type="color" .value=${device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length]}
                      @input=${(e: Event) => this._updateDevice(idx, "color", (e.target as HTMLInputElement).value)}
                      title="${this._t("editor.device_color")}" />
                    <select @change=${(e: Event) => this._updateDevice(idx, "icon", (e.target as HTMLSelectElement).value)}>
                      ${Object.entries(DEVICE_ICONS).map(
                        ([key, _val]) => html`
                          <option value=${key} ?selected=${device.icon === key}>${key}</option>
                        `
                      )}
                    </select>
                    <label class="check">
                      <input type="checkbox" .checked=${device.show_trail !== false}
                        @change=${(e: Event) => this._updateDevice(idx, "show_trail", (e.target as HTMLInputElement).checked)} />
                      ${this._t("editor.device_trail")}
                    </label>
                    <label class="check">
                      <input type="checkbox" .checked=${device.show_label !== false}
                        @change=${(e: Event) => this._updateDevice(idx, "show_label", (e.target as HTMLInputElement).checked)} />
                      ${this._t("editor.device_label")}
                    </label>
                  </div>
                </div>
                <button class="btn-icon btn-remove" @click=${() => this._removeDevice(idx)}>✕</button>
              </div>
            `
          )}
        </div>

        <button class="btn btn-add btn-full" @click=${this._addDevice}>+ ${this._t("editor.add_device")}</button>
      </div>
    `;
  }

  // ─── Appearance & History Section ─────────────────────────

  private _renderAppearanceTab() {
    return html`
      <div class="tab-content">
        <h3>${this._t("editor.appearance")}</h3>

        <div class="field">
          <label>${this._t("editor.card_title")}</label>
          <input type="text" .value=${this._config.card_title || ""}
            @input=${(e: Event) => this._updateConfig("card_title", (e.target as HTMLInputElement).value)}
            placeholder="BLE LiveMap" />
        </div>

        <div class="toggles">
          <label class="check">
            <input type="checkbox" .checked=${this._config.show_proxies !== false}
              @change=${(e: Event) => this._updateConfig("show_proxies", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.show_proxies")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this._config.show_zones !== false}
              @change=${(e: Event) => this._updateConfig("show_zones", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.show_zones")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this._config.show_zone_labels !== false}
              @change=${(e: Event) => this._updateConfig("show_zone_labels", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.show_zone_labels")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this._config.show_signal_overlay || false}
              @change=${(e: Event) => this._updateConfig("show_signal_overlay", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.show_signal_overlay")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this._config.show_accuracy_indicator !== false}
              @change=${(e: Event) => this._updateConfig("show_accuracy_indicator", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.show_accuracy")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this._config.fullscreen_enabled !== false}
              @change=${(e: Event) => this._updateConfig("fullscreen_enabled", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.fullscreen")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this._config.auto_fit !== false}
              @change=${(e: Event) => this._updateConfig("auto_fit", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.auto_fit")}
          </label>
        </div>

        <div class="field">
          <label>${this._t("editor.theme_mode")}</label>
          <select @change=${(e: Event) => this._updateConfig("theme_mode", (e.target as HTMLSelectElement).value)}>
            <option value="auto" ?selected=${this._config.theme_mode === "auto"}>${this._t("editor.theme_auto")}</option>
            <option value="dark" ?selected=${this._config.theme_mode === "dark"}>${this._t("editor.theme_dark")}</option>
            <option value="light" ?selected=${this._config.theme_mode === "light"}>${this._t("editor.theme_light")}</option>
          </select>
        </div>

        <div class="field">
          <label>${this._t("editor.floor_display")}</label>
          <select @change=${(e: Event) => this._updateConfig("floor_display_mode", (e.target as HTMLSelectElement).value)}>
            <option value="tabs" ?selected=${this._config.floor_display_mode === "tabs"}>${this._t("editor.floor_display_tabs")}</option>
            <option value="stacked" ?selected=${this._config.floor_display_mode === "stacked"}>${this._t("editor.floor_display_stacked")}</option>
          </select>
        </div>

        <h3 style="margin-top: 20px;">${this._t("editor.history")}</h3>

        <div class="toggles">
          <label class="check">
            <input type="checkbox" .checked=${this._config.history_enabled !== false}
              @change=${(e: Event) => this._updateConfig("history_enabled", (e.target as HTMLInputElement).checked)} />
            ${this._t("editor.history_enabled")}
          </label>
        </div>

        <div class="field inline">
          <label>${this._t("editor.history_retention")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._config.history_retention || 60)}
              @input=${(e: Event) => this._updateConfig("history_retention", parseInt((e.target as HTMLInputElement).value) || 60)}
              min="5" max="1440" step="5" />
            <span class="unit">min</span>
          </div>
        </div>

        <div class="field inline">
          <label>${this._t("editor.history_trail_length")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._config.history_trail_length || 50)}
              @input=${(e: Event) => this._updateConfig("history_trail_length", parseInt((e.target as HTMLInputElement).value) || 50)}
              min="5" max="500" step="5" />
          </div>
        </div>

        <div class="field inline">
          <label>${this._t("editor.update_interval")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._config.update_interval || 2)}
              @input=${(e: Event) => this._updateConfig("update_interval", parseInt((e.target as HTMLInputElement).value) || 2)}
              min="1" max="30" step="1" />
            <span class="unit">s</span>
          </div>
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
    floors.push({ id: `floor_${Date.now()}`, name: `Floor ${floors.length + 1}`, image: "", image_width: 20, image_height: 15 });
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
    if (this._hoveredProxy === idx) this._hoveredProxy = null;
    if (this._draggingProxy === idx) this._draggingProxy = null;
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
      entity_prefix: "", name: `Device ${idx + 1}`,
      color: DEVICE_COLORS[idx % DEVICE_COLORS.length], icon: "phone",
      show_trail: true, show_label: true,
    });
    this._updateConfig("tracked_devices", devices);
  }

  private _addDeviceFromDiscovery(prefix: string, name: string): void {
    const devices = [...(this._config.tracked_devices || [])];
    const idx = devices.length;
    devices.push({
      entity_prefix: prefix, name: name,
      color: DEVICE_COLORS[idx % DEVICE_COLORS.length], icon: "phone",
      show_trail: true, show_label: true,
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
      id: `zone_${Date.now()}`, name: "",
      points: [], color: ZONE_COLORS[idx % ZONE_COLORS.length],
      border_color: ZONE_COLORS[idx % ZONE_COLORS.length],
      opacity: 0.12, show_label: true,
    });
    this._updateConfig("zones", zones);
    this._startDrawingZone(idx);
  }

  private _removeZone(idx: number): void {
    const zones = [...(this._config.zones || [])];
    zones.splice(idx, 1);
    this._updateConfig("zones", zones);
    if (this._drawingZone === idx) { this._drawingZone = null; this._drawingPoints = []; }
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
    zones[this._drawingZone] = { ...zones[this._drawingZone], points: [...this._drawingPoints] };
    this._updateConfig("zones", zones);
    this._drawingZone = null;
    this._drawingPoints = [];
  }

  private _getZoneCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
    if (points.length === 0) return { x: 50, y: 50 };
    let cx = 0, cy = 0;
    for (const p of points) { cx += p.x; cy += p.y; }
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

  private _handleCalibrationClick(e: MouseEvent): void {
    if (!this._calibrating) return;
    if (this._calibrationPoints.length >= 2) return;
    const coords = this._getMapCoords(e);
    if (!coords) return;
    this._calibrationPoints = [...this._calibrationPoints, coords];
    if (this._calibrationPoints.length === 2) this._calibrating = false;
    this.requestUpdate();
  }

  private _applyCalibration(): void {
    if (this._calibrationPoints.length !== 2 || this._calibrationMeters <= 0) return;
    const p1 = this._calibrationPoints[0];
    const p2 = this._calibrationPoints[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distPercent = Math.sqrt(dx * dx + dy * dy);
    if (distPercent < 0.5) return;

    const img = this.shadowRoot?.querySelector(".large-map img") as HTMLImageElement;
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
        floors: [{ id: "floor_main", name: "Main", image: this._config.floorplan_image || "", image_width: roundedWidth, image_height: roundedHeight }],
      };
      this._fireConfigChanged();
    }
  }

  private _getCalibrationResult(): string {
    if (this._calibrationPoints.length !== 2 || this._calibrationMeters <= 0) return "";
    const img = this.shadowRoot?.querySelector(".large-map img") as HTMLImageElement;
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

  // ─── Map Click & Drag Handlers ────────────────────────────

  private _getMapCoords(e: MouseEvent): { x: number; y: number } | null {
    const img = (e.currentTarget as HTMLElement).querySelector("img");
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  private _getMapPixelCoords(e: MouseEvent): { x: number; y: number } | null {
    const mapEl = (e.currentTarget as HTMLElement);
    const rect = mapEl.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private _findProxyAtCoords(coords: { x: number; y: number }): number | null {
    const proxies = this._config.proxies || [];
    const hitRadius = 3; // percentage radius for hit detection
    for (let i = proxies.length - 1; i >= 0; i--) {
      const p = proxies[i];
      const dx = p.x - coords.x;
      const dy = p.y - coords.y;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        return i;
      }
    }
    return null;
  }

  private _handleProxyMapClick(e: MouseEvent): void {
    // If we were dragging, don't also place
    if (this._dragStarted) {
      this._dragStarted = false;
      return;
    }
    if (this._placingProxy === null) return;
    const coords = this._getMapCoords(e);
    if (!coords) return;
    this._updateProxy(this._placingProxy, "x", coords.x);
    this._updateProxy(this._placingProxy, "y", coords.y);
    this._placingProxy = null;
  }

  private _handleProxyMapMouseMove(e: MouseEvent): void {
    const coords = this._getMapCoords(e);
    const pixelCoords = this._getMapPixelCoords(e);
    if (!coords || !pixelCoords) return;

    // If dragging, update proxy position
    if (this._draggingProxy !== null) {
      this._dragStarted = true;
      const proxies = [...(this._config.proxies || [])];
      proxies[this._draggingProxy] = {
        ...proxies[this._draggingProxy],
        x: Math.max(0, Math.min(100, coords.x)),
        y: Math.max(0, Math.min(100, coords.y)),
      };
      this._config = { ...this._config, proxies };
      this._fireConfigChanged();
      this.requestUpdate();
      return;
    }

    // Hover detection
    if (this._placingProxy !== null) return;
    const hitIdx = this._findProxyAtCoords(coords);
    if (hitIdx !== this._hoveredProxy) {
      this._hoveredProxy = hitIdx;
    }
    // Update tooltip position
    if (hitIdx !== null) {
      this._hoverPos = { x: pixelCoords.x + 15, y: pixelCoords.y - 10 };
    } else {
      this._hoverPos = null;
    }
    this.requestUpdate();
  }

  private _handleProxyMapMouseLeave(): void {
    this._hoveredProxy = null;
    this._hoverPos = null;
    if (this._draggingProxy !== null) {
      this._draggingProxy = null;
      this._dragStarted = false;
    }
    this.requestUpdate();
  }

  private _handleProxyMapMouseDown(e: MouseEvent): void {
    if (this._placingProxy !== null) return;
    const coords = this._getMapCoords(e);
    if (!coords) return;
    const hitIdx = this._findProxyAtCoords(coords);
    if (hitIdx !== null) {
      this._draggingProxy = hitIdx;
      this._dragStarted = false;
      e.preventDefault();
    }
  }

  private _handleProxyMapMouseUp(): void {
    if (this._draggingProxy !== null) {
      this._draggingProxy = null;
    }
  }

  private _handleZoneMapClick(e: MouseEvent): void {
    if (this._drawingZone === null) return;
    const coords = this._getMapCoords(e);
    if (!coords) return;

    this._drawingPoints = [...this._drawingPoints, coords];

    if (this._drawingPoints.length >= 3) {
      const first = this._drawingPoints[0];
      const dist = Math.sqrt(Math.pow(coords.x - first.x, 2) + Math.pow(coords.y - first.y, 2));
      if (dist < 3) {
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
        --ed-bg: var(--ha-card-background, #fff);
        --ed-text: var(--primary-text-color, #212121);
        --ed-text2: var(--secondary-text-color, #727272);
        --ed-border: var(--divider-color, rgba(0,0,0,0.12));
        --ed-accent: var(--primary-color, #4FC3F7);
        --ed-success: #4CAF50;
      }

      h3 { font-size: 15px; font-weight: 600; color: var(--ed-text); margin: 0 0 12px 0; }
      h4 { font-size: 13px; font-weight: 600; color: var(--ed-text); margin: 0; }

      .tabs {
        display: flex;
        border-bottom: 2px solid var(--ed-border);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        position: sticky;
        top: 0;
        background: var(--ed-bg);
        z-index: 10;
      }

      .tab {
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 500;
        color: var(--ed-text2);
        cursor: pointer;
        border: none;
        border-bottom: 2px solid transparent;
        background: none;
        white-space: nowrap;
        transition: color 0.2s, border-color 0.2s;
        margin-bottom: -2px;
      }

      .tab.active { color: var(--ed-accent); border-bottom-color: var(--ed-accent); }
      .tab-content { padding: 16px; }

      .field { margin-bottom: 12px; }
      .field label { display: block; font-size: 12px; font-weight: 500; color: var(--ed-text2); margin-bottom: 4px; }

      .field input[type="text"],
      .field input[type="number"],
      .field select {
        width: 100%; padding: 8px 10px; border: 1px solid var(--ed-border); border-radius: 8px;
        font-size: 13px; color: var(--ed-text); background: transparent; box-sizing: border-box;
        outline: none; transition: border-color 0.2s;
      }
      .field input:focus, .field select:focus { border-color: var(--ed-accent); }

      .help { display: block; font-size: 11px; color: var(--ed-text2); margin-top: 4px; margin-bottom: 8px; }

      .inline-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .inline-group input[type="number"] {
        flex: 1; min-width: 60px; padding: 6px 8px; border: 1px solid var(--ed-border);
        border-radius: 6px; font-size: 12px; color: var(--ed-text); background: transparent; outline: none;
      }
      .inline-group input[type="range"] { flex: 1; accent-color: var(--ed-accent); }

      .unit, .sep { font-size: 12px; color: var(--ed-text2); }
      .label-sm { font-size: 11px; color: var(--ed-text2); }

      .check {
        display: flex; align-items: center; gap: 6px; font-size: 12px;
        color: var(--ed-text); cursor: pointer; white-space: nowrap;
      }
      .check input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--ed-accent); }

      .toggles { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }

      /* Buttons */
      .btn {
        padding: 6px 14px; border: 1px solid var(--ed-border); border-radius: 8px;
        background: transparent; color: var(--ed-text2); font-size: 12px;
        cursor: pointer; transition: all 0.2s; white-space: nowrap;
      }
      .btn:hover { border-color: var(--ed-accent); color: var(--ed-accent); }
      .btn-active { background: var(--ed-accent); color: white; border-color: var(--ed-accent); }
      .btn-primary { background: var(--ed-accent); color: white; border-color: var(--ed-accent); }
      .btn-primary:hover { opacity: 0.9; }
      .btn-add { border-style: dashed; color: var(--ed-accent); }
      .btn-add:hover { background: rgba(79, 195, 247, 0.06); }
      .btn-full { width: 100%; text-align: center; }

      .btn-icon {
        background: none; border: none; color: var(--ed-text2); cursor: pointer;
        padding: 4px; font-size: 14px; border-radius: 4px; flex-shrink: 0; transition: color 0.2s;
      }
      .btn-remove:hover { color: #E57373; }

      .btn-chip {
        display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px;
        border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 16px;
        background: transparent; color: var(--ed-success); font-size: 11px;
        cursor: pointer; transition: all 0.2s;
      }
      .btn-chip:hover { background: var(--ed-success); color: white; }

      .action-row { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }

      /* Cards & Lists */
      .item-card {
        display: flex; gap: 10px; align-items: flex-start; padding: 12px;
        border: 1px solid var(--ed-border); border-radius: 10px;
        margin-bottom: 8px; transition: border-color 0.2s;
      }
      .item-card:hover { border-color: var(--ed-accent); }
      .item-card-highlight { border-color: var(--ed-accent); background: rgba(79, 195, 247, 0.04); }

      .item-body {
        flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0;
      }
      .item-body input[type="text"], .item-body select {
        padding: 6px 8px; border: 1px solid var(--ed-border); border-radius: 6px;
        font-size: 12px; color: var(--ed-text); background: transparent;
        outline: none; width: 100%; box-sizing: border-box;
      }
      .item-body input:focus, .item-body select:focus { border-color: var(--ed-accent); }

      .items-list { margin-bottom: 8px; }

      .color-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 14px; flex-shrink: 0; }

      input[type="color"] {
        width: 32px; height: 28px; padding: 0; border: 1px solid var(--ed-border);
        border-radius: 4px; cursor: pointer; background: transparent;
      }

      /* Map */
      .large-map {
        position: relative; border: 1px solid var(--ed-border); border-radius: 10px;
        overflow: hidden; margin-bottom: 12px; cursor: crosshair; user-select: none;
      }
      .large-map img { width: 100%; display: block; opacity: 0.8; pointer-events: none; }

      .map-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none;
      }

      .map-hint {
        position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.75); color: white; padding: 6px 16px;
        border-radius: 16px; font-size: 12px; z-index: 10; white-space: nowrap;
        pointer-events: none;
      }

      @keyframes pulse-anim {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .pulse-marker { animation: pulse-anim 1s ease-in-out infinite; }

      .dragging-marker { opacity: 0.7; }

      /* Proxy Tooltip */
      .proxy-tooltip {
        position: absolute;
        z-index: 100;
        background: rgba(0,0,0,0.88);
        color: #fff;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 11px;
        pointer-events: none;
        max-width: 300px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        backdrop-filter: blur(8px);
        line-height: 1.5;
      }
      .tooltip-title {
        font-size: 13px; font-weight: 600; margin-bottom: 6px;
        color: var(--ed-accent); border-bottom: 1px solid rgba(255,255,255,0.15);
        padding-bottom: 4px;
      }
      .tooltip-row { display: flex; gap: 6px; margin-bottom: 2px; }
      .tooltip-label { color: rgba(255,255,255,0.5); flex-shrink: 0; }
      .tooltip-value { color: #fff; word-break: break-all; }
      .tooltip-hint {
        margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.4); font-size: 10px; font-style: italic;
      }

      /* Auto-place results */
      .auto-place-results {
        padding: 10px 14px; background: rgba(79, 195, 247, 0.06);
        border: 1px solid rgba(79, 195, 247, 0.2); border-radius: 10px;
        margin-bottom: 12px; font-size: 11px; color: var(--ed-text);
      }
      .auto-place-line { padding: 2px 0; }
      .auto-place-line:first-child { font-weight: 600; margin-bottom: 4px; }

      /* Discovery box */
      .discovery-box {
        padding: 10px; border: 1px solid rgba(76, 175, 80, 0.25); border-radius: 10px;
        background: rgba(76, 175, 80, 0.04); margin-bottom: 12px;
      }
      .discovery-list { display: flex; flex-wrap: wrap; gap: 6px; }

      /* Success box */
      .success-box {
        display: flex; align-items: center; gap: 6px; padding: 8px 12px;
        background: rgba(76, 175, 80, 0.08); border: 1px solid rgba(76, 175, 80, 0.25);
        border-radius: 8px; font-size: 12px; color: var(--ed-success); margin-top: 4px;
      }
      .success-box strong { color: var(--ed-text); }

      .subsection { margin-bottom: 16px; }
      .subsection-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .field.inline { margin-bottom: 12px; }
      .field.inline label { margin-bottom: 6px; }
    `;
  }

  protected render() {
    if (!this._config) return nothing;

    if (this.hass) {
      this._lang = this.hass.selectedLanguage || this.hass.language || "en";
    }

    const tabs = [
      { id: "floorplan", label: this._t("editor.floorplan") },
      { id: "proxies", label: this._t("editor.proxies") },
      { id: "zones", label: this._t("editor.zones") },
      { id: "devices", label: this._t("editor.devices") },
      { id: "appearance", label: this._t("editor.appearance") + " & " + this._t("editor.history") },
    ];

    return html`
      <div class="tabs">
        ${tabs.map(
          (t) => html`
            <button class="tab ${this._activeTab === t.id ? "active" : ""}"
              @click=${() => (this._activeTab = t.id)}>
              ${t.label}
            </button>
          `
        )}
      </div>

      ${this._activeTab === "floorplan" ? this._renderFloorplanTab() : nothing}
      ${this._activeTab === "proxies" ? this._renderProxiesTab() : nothing}
      ${this._activeTab === "zones" ? this._renderZonesTab() : nothing}
      ${this._activeTab === "devices" ? this._renderDevicesTab() : nothing}
      ${this._activeTab === "appearance" ? this._renderAppearanceTab() : nothing}
    `;
  }
}
