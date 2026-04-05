/**
 * ha-ble-livemap - Sidebar Panel
 * Author: Jerry Paasovaara
 * License: MIT
 *
 * Full-page configuration panel accessible from the HA sidebar.
 * Features smart entity discovery, multi-floor support, and
 * interactive map with drag-and-drop entity placement.
 */

import { LitElement, html, css, CSSResultGroup, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  BLELivemapConfig,
  HomeAssistant,
  ProxyConfig,
  TrackedDeviceConfig,
  FloorConfig,
  ZoneConfig,
  DoorConfig,
  DoorType,
  DEFAULT_CONFIG,
  DEVICE_COLORS,
  DEVICE_ICONS,
  ZONE_COLORS,
  GATEWAY_TYPES,
  GatewayType,
  ProxyCalibration,
  ProxyDistance,
  TrilaterationResult,
  DOOR_TYPES,
} from "./types";
import { CARD_VERSION, CARD_NAME } from "./const";
import { localize } from "./localize/localize";
import { trilaterate, smoothPosition } from "./trilateration";

import "./editor";

const PANEL_NAME = "ble-livemap-panel";
const STORAGE_KEY = "ble-livemap-panel-config";

interface DiscoveredEntity {
  entity_id: string;
  friendly_name: string;
  area: string;
  state: string;
  type: "proxy" | "device" | "unknown";
  added: boolean;
  /** For proxies: the scanner/proxy identifier extracted from Bermuda */
  proxy_id?: string;
}

@customElement(PANEL_NAME)
export class BLELivemapPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean, reflect: true }) public narrow = false;
  @property({ attribute: false }) public panel: any;

  @state() private _config: BLELivemapConfig = { type: "custom:ble-livemap-card", ...DEFAULT_CONFIG } as BLELivemapConfig;
  @state() private _activeTab = "map" as string;
  @state() private _saving = false;
  @state() private _saveMessage = "";
  @state() private _loaded = false;
  @state() private _sidebarFilter = "";
  @state() private _sidebarCategory: "smart" | "proxies" | "devices" | "all" = "smart";
  @state() private _activeFloorIdx = 0;

  // Map interaction state
  @state() private _placingEntity: DiscoveredEntity | null = null;
  @state() private _placingMode: "proxy" | "device" | null = null;
  @state() private _drawingZone = false;
  @state() private _drawingPoints: { x: number; y: number }[] = [];
  @state() private _drawingMode: "polygon" | "rectangle" = "rectangle";
  @state() private _rectStart: { x: number; y: number } | null = null;
  @state() private _rectPreview: { x: number; y: number } | null = null;
  @state() private _calibrating = false;
  @state() private _calibrationPoints: { x: number; y: number }[] = [];
  @state() private _calibrationMeters = 0;
  @state() private _draggingProxy: number | null = null;
  @state() private _mapImageLoaded = false;
  @state() private _editingZoneIdx: number | null = null;

  // Door placement state
  @state() private _placingDoor = false;
  @state() private _placingDoorType: DoorType = "door";
  @state() private _editingDoorIdx: number | null = null;
  @state() private _draggingDoor: number | null = null;

  // RSSI Calibration wizard state
  @state() private _calibWizardActive = false;
  @state() private _calibWizardProxyIdx: number | null = null;
  @state() private _calibWizardDistance = 1.0;
  @state() private _calibWizardRssi: number | null = null;
  @state() private _calibWizardSamples: number[] = [];
  private _calibWizardTimer: number | null = null;

  private _lang = "en";

  // Device registry cache for BLE scanner discovery
  private _deviceRegistryCache: any[] | null = null;
  private _areaRegistryCache: Map<string, string> | null = null;
  private _registryCacheStamp = 0;
  private _registryLoadPromise: Promise<void> | null = null;

  // Live device tracking in editor
  @state() private _liveDevicePositions: Map<string, { x: number; y: number; color: string; name: string; accuracy: number; confidence: number }> = new Map();
  @state() private _liveDebugInfo: Array<{ proxyName: string; proxyId: string; distance: number | null; sensorId: string; placed: boolean }> = [];
  @state() private _showDebugPanel: boolean = false;
  private _liveTrackingTimer: number | null = null;
  private _previousPositions: Map<string, TrilaterationResult> = new Map();

  // ─── Lifecycle ──────────────────────────────────────────────

  connectedCallback(): void {
    super.connectedCallback();
    this._loadConfig();
    this._startLiveTracking();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._calibWizardTimer) {
      clearInterval(this._calibWizardTimer);
      this._calibWizardTimer = null;
    }
    this._stopLiveTracking();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("hass") && this.hass) {
      this._lang = this.hass.selectedLanguage || this.hass.language || "en";
      // Load device/area registry when hass becomes available
      this._ensureRegistryLoaded();
    }
  }

  /**
   * Load device and area registries from HA via WebSocket.
   * Caches results for 5 minutes to avoid excessive calls.
   */
  private async _ensureRegistryLoaded(): Promise<void> {
    if (!this.hass) return;
    const now = Date.now();
    // Cache for 5 minutes
    if (this._deviceRegistryCache && (now - this._registryCacheStamp) < 300000) return;
    if (this._registryLoadPromise) return;

    this._registryLoadPromise = (async () => {
      try {
        // Load device registry
        const devices = await this.hass.callWS({ type: "config/device_registry/list" });
        this._deviceRegistryCache = devices as any[];

        // Load area registry
        const areas = await this.hass.callWS({ type: "config/area_registry/list" });
        this._areaRegistryCache = new Map();
        for (const area of areas as any[]) {
          this._areaRegistryCache.set(area.area_id, area.name);
        }

        this._registryCacheStamp = now;
      } catch (e) {
        console.warn("[BLE LiveMap Panel] Failed to load registries:", e);
      } finally {
        this._registryLoadPromise = null;
      }
    })();

    await this._registryLoadPromise;
  }

  // ─── Config Persistence ─────────────────────────────────────

  private _loadConfig(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this._config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn("[BLE LiveMap Panel] Failed to load config:", e);
    }
    this._loaded = true;
  }

  private _saveConfigLocal(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._config));
    } catch (e) { /* ignore */ }
  }

  private _updateConfig(key: string, value: any): void {
    this._config = { ...this._config, [key]: value };
    this._saveConfigLocal();
    this.requestUpdate();
  }

  /**
   * Recursively find and update all BLE LiveMap cards in a cards array.
   * Handles nested structures like sections, vertical-stack, horizontal-stack, etc.
   */
  private _updateCardsRecursive(cards: any[]): boolean {
    let updated = false;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.type === `custom:${CARD_NAME}`) {
        cards[i] = { ...this._config, type: `custom:${CARD_NAME}` };
        updated = true;
      }
      // Check nested cards (vertical-stack, horizontal-stack, grid, etc.)
      if (card.cards && Array.isArray(card.cards)) {
        if (this._updateCardsRecursive(card.cards)) updated = true;
      }
      // Check sections (HA 2024+ section-based views)
      if (card.sections && Array.isArray(card.sections)) {
        for (const section of card.sections) {
          if (section.cards && Array.isArray(section.cards)) {
            if (this._updateCardsRecursive(section.cards)) updated = true;
          }
        }
      }
    }
    return updated;
  }

  private async _saveAndPush(): Promise<void> {
    this._saveConfigLocal();
    this._saving = true;
    this._saveMessage = this._t("panel.saving");

    try {
      // Get list of all dashboards
      const dashboards: any[] = await this.hass.callWS({ type: "lovelace/dashboards/list" }).catch(() => []);
      const urlPaths: (string | null)[] = [null]; // null = default dashboard
      for (const db of dashboards) {
        if (db.url_path && db.mode !== "storage") continue; // skip non-storage dashboards
        if (db.url_path) urlPaths.push(db.url_path);
      }

      let totalUpdated = 0;

      for (const urlPath of urlPaths) {
        try {
          const result: any = await this.hass.callWS({
            type: "lovelace/config",
            url_path: urlPath,
          });

          if (result?.views) {
            let updated = false;
            for (const view of result.views) {
              // Check cards directly on the view
              if (view.cards && Array.isArray(view.cards)) {
                if (this._updateCardsRecursive(view.cards)) updated = true;
              }
              // Check sections (HA 2024+ section-based views)
              if (view.sections && Array.isArray(view.sections)) {
                for (const section of view.sections) {
                  if (section.cards && Array.isArray(section.cards)) {
                    if (this._updateCardsRecursive(section.cards)) updated = true;
                  }
                }
              }
            }

            if (updated) {
              await this.hass.callWS({
                type: "lovelace/config/save",
                url_path: urlPath,
                config: result,
              });
              totalUpdated++;
            }
          }
        } catch (e) {
          // Skip dashboards that fail (e.g., YAML-mode dashboards)
          console.debug(`[BLE LiveMap Panel] Skipped dashboard ${urlPath}:`, e);
        }
      }

      if (totalUpdated > 0) {
        this._saveMessage = this._t("panel.saved");
      } else {
        this._saveMessage = this._t("panel.saved_local");
      }
    } catch (e) {
      this._saveMessage = this._t("panel.save_error");
      console.warn("[BLE LiveMap Panel] Save error:", e);
    }

    setTimeout(() => {
      this._saving = false;
      this._saveMessage = "";
    }, 3000);
  }

  private _handleExportYaml(): void {
    const yaml = this._toYaml();
    navigator.clipboard.writeText(yaml).then(() => {
      this._saveMessage = this._t("panel.yaml_copied");
      this._saving = true;
      setTimeout(() => { this._saving = false; this._saveMessage = ""; }, 2000);
    });
  }

  private _toYaml(): string {
    return `type: custom:${CARD_NAME}\n` + JSON.stringify(this._config, null, 2);
  }

  // ─── Localization Helper ────────────────────────────────────

  private _t(key: string): string {
    const panelStrings: Record<string, Record<string, string>> = {
      en: {
        "panel.title": "BLE LiveMap Setup",
        "panel.subtitle": "Configure your floor plan, proxies, devices and zones",
        "panel.save": "Save & update cards",
        "panel.saving": "Saving...",
        "panel.saved": "Saved & cards updated!",
        "panel.save_error": "Error saving to Lovelace",
        "panel.no_cards_found": "No BLE LiveMap cards found on dashboards",
        "panel.saved_local": "Settings saved locally! Add a BLE LiveMap card to a dashboard to sync.",
        "panel.yaml_copied": "YAML copied to clipboard!",
        "panel.copy_yaml": "Copy YAML",
        "panel.tab_map": "Floor Plan",
        "panel.tab_proxies": "Proxies",
        "panel.tab_devices": "Devices",
        "panel.tab_zones": "Zones",
        "panel.tab_settings": "Settings",
        "panel.sidebar_title": "Available Entities",
        "panel.filter": "Search entities...",
        "panel.category_smart": "Smart",
        "panel.category_proxies": "Proxies",
        "panel.category_devices": "Devices",
        "panel.category_all": "All",
        "panel.click_to_add": "Click to add to map",
        "panel.already_added": "Already added",
        "panel.click_map_to_place": "Click on the map to place",
        "panel.cancel_placement": "Cancel",
        "panel.no_entities": "No matching entities found",
        "panel.floor_image": "Floor plan image URL",
        "panel.floor_image_help": "Use /local/filename.png for images in your www folder",
        "panel.floor_name": "Floor name",
        "panel.add_floor": "+ Add floor",
        "panel.remove_floor": "Remove floor",
        "panel.floor_select": "Select floor",
        "panel.calibrate": "Calibrate dimensions",
        "panel.calibrate_help": "Click two points of a known distance on the map, then enter the real distance.",
        "panel.calibrate_start": "Start calibration",
        "panel.calibrate_cancel": "Cancel",
        "panel.calibrate_distance": "Real distance (meters)",
        "panel.calibrate_apply": "Apply",
        "panel.width_m": "Width (m)",
        "panel.height_m": "Height (m)",
        "panel.zone_name": "Zone name",
        "panel.zone_draw_polygon": "Draw polygon",
        "panel.zone_draw_rectangle": "Draw rectangle",
        "panel.zone_finish": "Finish zone",
        "panel.zone_cancel": "Cancel drawing",
        "panel.add_zone": "Add zone",
        "panel.remove_zone": "Remove zone",
        "panel.zone_color": "Fill color",
        "panel.zone_border_color": "Border color",
        "panel.zone_opacity": "Opacity",
        "panel.zone_show_label": "Show label",
        "panel.zone_edit": "Edit zone",
        "panel.zone_editing": "Editing zone",
        "panel.zone_done_editing": "Done editing",
        "panel.auto_place": "Auto-place all",
        "panel.auto_place_help": "Match proxy/device names to zone names and place at zone centers",
        "panel.remove": "Remove",
        "panel.placed": "Placed",
        "panel.not_placed": "Not placed",
        "panel.drag_to_move": "Drag to reposition",
        "panel.info_banner": "Configure your BLE LiveMap here. Changes are auto-saved locally. Click 'Save & update cards' to push changes to your Lovelace dashboards.",
        "panel.card_title": "Card title",
        "panel.show_proxies": "Show proxy indicators",
        "panel.show_zones": "Show zones",
        "panel.show_zone_labels": "Show zone labels",
        "panel.history_enabled": "Enable position history",
        "panel.history_retention": "History retention (minutes)",
        "panel.update_interval": "Update interval (seconds)",
        "panel.floor_display": "Floor display mode",
        "panel.floor_tabs": "Tabs",
        "panel.floor_stacked": "Stacked",
        "panel.theme": "Theme",
        "panel.theme_auto": "Auto",
        "panel.theme_dark": "Dark",
        "panel.theme_light": "Light",
        "panel.device_name": "Display name",
        "panel.device_color": "Color",
        "panel.device_icon": "Icon",
        "panel.proxy_name": "Display name",
        "panel.smart_help": "Showing only relevant BLE proxies and trackable devices detected from Bermuda",
        "panel.proxy_section": "BLE Scanners / Proxies",
        "panel.device_section": "Trackable Devices",
        "panel.scanner_count": "scanners detected",
        "panel.device_count": "trackable devices",
        "panel.gateway": "Gateway",
        "panel.gateway_type": "Gateway type",
        "panel.gateway_connects": "Connects floors",
        "panel.gateway_stairway": "Stairway",
        "panel.gateway_elevator": "Elevator",
        "panel.gateway_door": "Door",
        "panel.gateway_passage": "Passage",
        "panel.calibrate_rssi": "Calibrate RSSI",
        "panel.calibrate_rssi_help": "Walk to each proxy and record signal strength at a known distance",
        "panel.calibrate_proxy": "Calibrate",
        "panel.calibrate_stand": "Stand at the specified distance from",
        "panel.calibrate_distance_label": "Distance (meters)",
        "panel.calibrate_sampling": "Sampling RSSI...",
        "panel.calibrate_confirm": "Confirm calibration",
        "panel.calibrate_reset": "Reset calibration",
        "panel.calibrate_done": "Done",
        "panel.calibrate_rssi_value": "RSSI",
        "panel.calibrate_samples": "samples",
        "panel.calibrated": "Calibrated",
        "panel.not_calibrated": "Not calibrated",
        "panel.calibrate_saved": "Calibration saved!",
        "panel.gateway_timeout": "Gateway detection timeout (s)",
        "panel.floor_override_timeout": "Soft floor override timeout (s)",
        "panel.floor_override_min_proxies": "Min proxies for floor override",
        "panel.area": "Area",
        "panel.tab_doors": "Doors",
        "panel.add_door": "Add door",
        "panel.remove_door": "Remove",
        "panel.door_name": "Door name",
        "panel.door_type": "Type",
        "panel.door_type_door": "Door",
        "panel.door_type_opening": "Opening",
        "panel.door_type_portal": "Portal (floor/building)",
        "panel.door_zone_a": "Room A",
        "panel.door_zone_b": "Room B",
        "panel.door_portal_target": "Target floor",
        "panel.door_click_to_place": "Click on the map to place the door",
        "panel.door_auto_detect": "Zones auto-detected from position",
        "panel.show_doors": "Show doors",
        "panel.zone_override_timeout": "Zone transition timeout (s)",
        "panel.door_count": "doors configured",
        "panel.door_edit": "Edit",
        "panel.door_done_editing": "Done",
        "panel.door_connects": "Connects",
      },
      sv: {
        "panel.title": "BLE LiveMap Inställningar",
        "panel.subtitle": "Konfigurera planritning, proxies, enheter och zoner",
        "panel.save": "Spara & uppdatera kort",
        "panel.saving": "Sparar...",
        "panel.saved": "Sparat & kort uppdaterade!",
        "panel.save_error": "Fel vid sparning till Lovelace",
        "panel.no_cards_found": "Inga BLE LiveMap-kort hittades på dashboards",
        "panel.saved_local": "Inställningar sparade lokalt! Lägg till ett BLE LiveMap-kort på en dashboard för att synka.",
        "panel.yaml_copied": "YAML kopierad till urklipp!",
        "panel.copy_yaml": "Kopiera YAML",
        "panel.tab_map": "Planritning",
        "panel.tab_proxies": "Proxies",
        "panel.tab_devices": "Enheter",
        "panel.tab_zones": "Zoner",
        "panel.tab_settings": "Inställningar",
        "panel.sidebar_title": "Tillgängliga enheter",
        "panel.filter": "Sök enheter...",
        "panel.category_smart": "Smart",
        "panel.category_proxies": "Proxies",
        "panel.category_devices": "Enheter",
        "panel.category_all": "Alla",
        "panel.click_to_add": "Klicka för att lägga till",
        "panel.already_added": "Redan tillagd",
        "panel.click_map_to_place": "Klicka på kartan för att placera",
        "panel.cancel_placement": "Avbryt",
        "panel.no_entities": "Inga matchande enheter hittades",
        "panel.floor_image": "Planritnings-URL",
        "panel.floor_image_help": "Använd /local/filnamn.png för bilder i din www-mapp",
        "panel.floor_name": "Våningsnamn",
        "panel.add_floor": "+ Lägg till våning",
        "panel.remove_floor": "Ta bort våning",
        "panel.floor_select": "Välj våning",
        "panel.calibrate": "Kalibrera mått",
        "panel.calibrate_help": "Klicka på två punkter med känt avstånd, ange sedan det verkliga avståndet.",
        "panel.calibrate_start": "Starta kalibrering",
        "panel.calibrate_cancel": "Avbryt",
        "panel.calibrate_distance": "Verkligt avstånd (meter)",
        "panel.calibrate_apply": "Tillämpa",
        "panel.width_m": "Bredd (m)",
        "panel.height_m": "Höjd (m)",
        "panel.zone_name": "Zonnamn",
        "panel.zone_draw_polygon": "Rita polygon",
        "panel.zone_draw_rectangle": "Rita rektangel",
        "panel.zone_finish": "Slutför zon",
        "panel.zone_cancel": "Avbryt ritning",
        "panel.add_zone": "Lägg till zon",
        "panel.remove_zone": "Ta bort zon",
        "panel.zone_color": "Fyllnadsfärg",
        "panel.zone_border_color": "Kantfärg",
        "panel.zone_opacity": "Opacitet",
        "panel.zone_show_label": "Visa etikett",
        "panel.zone_edit": "Redigera zon",
        "panel.zone_editing": "Redigerar zon",
        "panel.zone_done_editing": "Klar med redigering",
        "panel.auto_place": "Auto-placera alla",
        "panel.auto_place_help": "Matchar proxy-/enhetsnamn mot zonnamn och placerar i zonens mitt",
        "panel.remove": "Ta bort",
        "panel.placed": "Placerad",
        "panel.not_placed": "Ej placerad",
        "panel.drag_to_move": "Dra för att flytta",
        "panel.info_banner": "Konfigurera din BLE LiveMap här. Ändringar sparas automatiskt lokalt. Klicka 'Spara & uppdatera kort' för att pusha ändringar till dina Lovelace-dashboards.",
        "panel.card_title": "Korttitel",
        "panel.show_proxies": "Visa proxy-indikatorer",
        "panel.show_zones": "Visa zoner",
        "panel.show_zone_labels": "Visa zonetiketter",
        "panel.history_enabled": "Aktivera positionshistorik",
        "panel.history_retention": "Historiklagring (minuter)",
        "panel.update_interval": "Uppdateringsintervall (sekunder)",
        "panel.floor_display": "Våningsvisningsläge",
        "panel.floor_tabs": "Flikar",
        "panel.floor_stacked": "Staplade",
        "panel.theme": "Tema",
        "panel.theme_auto": "Auto",
        "panel.theme_dark": "Mörkt",
        "panel.theme_light": "Ljust",
        "panel.device_name": "Visningsnamn",
        "panel.device_color": "Färg",
        "panel.device_icon": "Ikon",
        "panel.proxy_name": "Visningsnamn",
        "panel.smart_help": "Visar bara relevanta BLE-proxies och spårbara enheter från Bermuda",
        "panel.proxy_section": "BLE-skannrar / Proxies",
        "panel.device_section": "Spårbara enheter",
        "panel.scanner_count": "skannrar hittade",
        "panel.device_count": "spårbara enheter",
        "panel.gateway": "Gateway",
        "panel.gateway_type": "Gateway-typ",
        "panel.gateway_connects": "Förbinder våningar",
        "panel.gateway_stairway": "Trappa",
        "panel.gateway_elevator": "Hiss",
        "panel.gateway_door": "Dörr",
        "panel.gateway_passage": "Passage",
        "panel.calibrate_rssi": "Kalibrera RSSI",
        "panel.calibrate_rssi_help": "Gå till varje proxy och registrera signalstyrka på känt avstånd",
        "panel.calibrate_proxy": "Kalibrera",
        "panel.calibrate_stand": "Stå på angivet avstånd från",
        "panel.calibrate_distance_label": "Avstånd (meter)",
        "panel.calibrate_sampling": "Samplar RSSI...",
        "panel.calibrate_confirm": "Bekräfta kalibrering",
        "panel.calibrate_reset": "Återställ kalibrering",
        "panel.calibrate_done": "Klar",
        "panel.calibrate_rssi_value": "RSSI",
        "panel.calibrate_samples": "sampel",
        "panel.calibrated": "Kalibrerad",
        "panel.not_calibrated": "Ej kalibrerad",
        "panel.calibrate_saved": "Kalibrering sparad!",
        "panel.gateway_timeout": "Gateway-detektions-timeout (s)",
        "panel.floor_override_timeout": "Mjuk våningsövergångs-timeout (s)",
        "panel.floor_override_min_proxies": "Min proxies för våningsövergång",
        "panel.area": "Område",
        "panel.tab_doors": "Dörrar",
        "panel.add_door": "Lägg till dörr",
        "panel.remove_door": "Ta bort",
        "panel.door_name": "Dörrnamn",
        "panel.door_type": "Typ",
        "panel.door_type_door": "Dörr",
        "panel.door_type_opening": "Öppning",
        "panel.door_type_portal": "Portal (våning/byggnad)",
        "panel.door_zone_a": "Rum A",
        "panel.door_zone_b": "Rum B",
        "panel.door_portal_target": "Målvåning",
        "panel.door_click_to_place": "Klicka på kartan för att placera dörren",
        "panel.door_auto_detect": "Zoner auto-detekterade från position",
        "panel.show_doors": "Visa dörrar",
        "panel.zone_override_timeout": "Zonövergångs-timeout (s)",
        "panel.door_count": "dörrar konfigurerade",
        "panel.door_edit": "Redigera",
        "panel.door_done_editing": "Klar",
        "panel.door_connects": "Förbinder",
      },
    };

    const lang = this._lang.startsWith("sv") ? "sv" : "en";
    return panelStrings[lang]?.[key] || panelStrings["en"]?.[key] || key;
  }
  /**
   * Discover BLE proxies from Bermuda distance sensors.
   * Primary source: sensor.bermuda_*_distance_to_PROXYNAME entities.
   * These are the actual BLE scanners/proxies that Bermuda uses for trilateration.
   * Device registry is used only to enrich with friendly names, areas, and MAC addresses.
   */
  private _discoverBLEProxies(): Map<string, { id: string; friendly_name: string; area: string; mac: string; entity_ids: string[] }> {
    const proxyMap = new Map<string, { id: string; friendly_name: string; area: string; mac: string; entity_ids: string[] }>();

    // Primary source: Bermuda distance sensors — these define the actual proxy list.
    // Only include "distance_to" sensors (not "unfiltered_distance_to").
    if (this.hass?.states) {
      for (const [entityId] of Object.entries(this.hass.states)) {
        const eid = entityId.toLowerCase();
        // Match sensor.bermuda_*_distance_to_* but NOT *_unfiltered_distance_to_*
        if (eid.startsWith("sensor.bermuda_") && eid.includes("_distance_to_") && !eid.includes("_unfiltered_distance_to_")) {
          const parts = eid.split("_distance_to_");
          if (parts.length >= 2) {
            const proxyId = parts[parts.length - 1];
            if (proxyMap.has(proxyId)) {
              proxyMap.get(proxyId)!.entity_ids.push(entityId);
            } else {
              const friendlyName = proxyId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              proxyMap.set(proxyId, {
                id: proxyId,
                friendly_name: friendlyName,
                area: "",
                mac: "",
                entity_ids: [entityId],
              });
            }
          }
        }
      }
    }

    // Enrich proxy entries with device registry data (friendly names, areas, MACs)
    if (this._deviceRegistryCache && proxyMap.size > 0) {
      for (const device of this._deviceRegistryCache) {
        const deviceName = device.name_by_user || device.name || "";
        if (!deviceName) continue;

        const slug = deviceName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

        // Check if this device matches any discovered proxy
        const matchingProxy = proxyMap.get(slug);
        if (!matchingProxy) continue;

        // Enrich with device registry data
        matchingProxy.friendly_name = deviceName;

        if (device.area_id && this._areaRegistryCache) {
          matchingProxy.area = this._areaRegistryCache.get(device.area_id) || matchingProxy.area;
        }

        // Get MAC from identifiers or connections
        const identifiers = device.identifiers || [];
        const connections = device.connections || [];
        for (const id of identifiers) {
          if ((id[0] === "bluetooth" || id[0] === "mac") && id[1]) {
            matchingProxy.mac = id[1];
            break;
          }
        }
        if (!matchingProxy.mac) {
          for (const c of connections) {
            if ((c[0] === "bluetooth" || c[0] === "mac") && c[1]) {
              matchingProxy.mac = c[1];
              break;
            }
          }
        }
      }
    }

    return proxyMap;
  }

  /**
   * Find trackable devices - only device_tracker.bermuda_* entities
   * which actually have position/area data.
   */
  private _discoverTrackableDevices(): DiscoveredEntity[] {
    if (!this.hass?.states) return [];

    const addedDevices = new Set((this._config.tracked_devices || []).map((d) => d.entity_prefix));
    const devices: DiscoveredEntity[] = [];

    for (const [entityId, stateObj] of Object.entries(this.hass.states)) {
      const eid = entityId.toLowerCase();

      // Only device_tracker.bermuda_* entities have actual position data
      if (eid.startsWith("device_tracker.bermuda_")) {
        const friendlyName = (stateObj as any)?.attributes?.friendly_name || entityId;
        const area = (stateObj as any)?.state || "";

        devices.push({
          entity_id: entityId,
          friendly_name: friendlyName,
          area: area,
          state: area,
          type: "device",
          added: addedDevices.has(entityId),
        });
      }
    }

    // Sort: not-added first, then by name
    devices.sort((a, b) => {
      if (a.added !== b.added) return a.added ? 1 : -1;
      return a.friendly_name.localeCompare(b.friendly_name);
    });

    return devices;
  }

  /**
   * Main discovery method - combines smart proxy discovery and device discovery.
   * In "smart" mode, shows only relevant entities.
   * In "all" mode, shows everything for manual selection.
   */
  private _discoverEntities(): DiscoveredEntity[] {
    if (!this.hass?.states) return [];

    if (this._sidebarCategory === "smart" || this._sidebarCategory === "proxies") {
      return this._getSmartProxyList();
    }

    if (this._sidebarCategory === "devices") {
      return this._getSmartDeviceList();
    }

    // "all" mode - show everything
    return this._getAllEntities();
  }

  private _getSmartProxyList(): DiscoveredEntity[] {
    const bleProxies = this._discoverBLEProxies();
    const addedProxies = new Set((this._config.proxies || []).map((p) => p.entity_id));

    const entities: DiscoveredEntity[] = [];

    for (const [proxyId, proxyInfo] of bleProxies) {
      // Use the proxy slug as entity_id for config purposes
      const syntheticEntityId = `ble_proxy_${proxyId}`;
      const added = addedProxies.has(syntheticEntityId) ||
        addedProxies.has(proxyId) ||
        addedProxies.has(`bermuda_proxy_${proxyId}`) ||
        // Check if any existing proxy matches by name or slug
        (this._config.proxies || []).some((p) =>
          p.entity_id.includes(proxyId) ||
          (p.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").includes(proxyId)
        );

      const trackedCount = proxyInfo.entity_ids.length;
      const stateText = trackedCount > 0
        ? `${trackedCount} devices tracked`
        : proxyInfo.mac || "BLE Proxy";

      const entity: DiscoveredEntity = {
        entity_id: syntheticEntityId,
        friendly_name: proxyInfo.friendly_name,
        area: proxyInfo.area,
        state: stateText,
        type: "proxy",
        added,
        proxy_id: proxyId,
      };

      // Apply text filter
      if (this._sidebarFilter) {
        const search = this._sidebarFilter.toLowerCase();
        if (!proxyId.includes(search) &&
            !proxyInfo.friendly_name.toLowerCase().includes(search) &&
            !proxyInfo.area.toLowerCase().includes(search)) {
          continue;
        }
      }

      entities.push(entity);
    }

    // Sort: not-added first, then by name
    entities.sort((a, b) => {
      if (a.added !== b.added) return a.added ? 1 : -1;
      return a.friendly_name.localeCompare(b.friendly_name);
    });

    return entities;
  }

  private _getSmartDeviceList(): DiscoveredEntity[] {
    const devices = this._discoverTrackableDevices();

    if (!this._sidebarFilter) return devices;

    const search = this._sidebarFilter.toLowerCase();
    return devices.filter((d) =>
      d.entity_id.toLowerCase().includes(search) ||
      d.friendly_name.toLowerCase().includes(search) ||
      d.area.toLowerCase().includes(search)
    );
  }

  private _getAllEntities(): DiscoveredEntity[] {
    if (!this.hass?.states) return [];

    const addedProxies = new Set((this._config.proxies || []).map((p) => p.entity_id));
    const addedDevices = new Set((this._config.tracked_devices || []).map((d) => d.entity_prefix));
    const entities: DiscoveredEntity[] = [];

    for (const [entityId, stateObj] of Object.entries(this.hass.states)) {
      const friendlyName = (stateObj as any)?.attributes?.friendly_name || entityId;
      const area = (stateObj as any)?.attributes?.area || "";
      const stateVal = (stateObj as any)?.state || "";

      // Apply text filter
      if (this._sidebarFilter) {
        const search = this._sidebarFilter.toLowerCase();
        if (!entityId.toLowerCase().includes(search) && !friendlyName.toLowerCase().includes(search)) {
          continue;
        }
      }

      const eid = entityId.toLowerCase();
      let type: "proxy" | "device" | "unknown" = "unknown";
      let added = false;

      if (eid.startsWith("device_tracker.bermuda_")) {
        type = "device";
        added = addedDevices.has(entityId);
      } else if (eid.includes("bermuda") || eid.includes("ble_proxy") || eid.includes("bluetooth_proxy")) {
        type = "proxy";
        added = addedProxies.has(entityId);
      }

      entities.push({ entity_id: entityId, friendly_name: friendlyName, area, state: stateVal, type, added });
    }

    entities.sort((a, b) => {
      if (a.added !== b.added) return a.added ? 1 : -1;
      if (a.type !== b.type) {
        if (a.type === "proxy") return -1;
        if (b.type === "proxy") return 1;
        if (a.type === "device") return -1;
        return 1;
      }
      return a.friendly_name.localeCompare(b.friendly_name);
    });

    return entities;
  }

  // ─── Floor Helpers ─────────────────────────────────────────

  private _getFloors(): FloorConfig[] {
    if (this._config.floors && this._config.floors.length > 0) {
      return this._config.floors;
    }
    if (this._config.floorplan_image) {
      return [{
        id: "floor_0",
        name: "Floor 1",
        image: this._config.floorplan_image,
        image_width: this._config.image_width || 20,
        image_height: this._config.image_height || 15,
      }];
    }
    return [];
  }

  private _getActiveFloor(): FloorConfig | null {
    const floors = this._getFloors();
    return floors[this._activeFloorIdx] || floors[0] || null;
  }

  private _addFloor(): void {
    const floors = [...this._getFloors()];
    const newId = `floor_${floors.length}`;
    floors.push({
      id: newId,
      name: `Floor ${floors.length + 1}`,
      image: "",
      image_width: 20,
      image_height: 15,
    });
    this._updateConfig("floors", floors);
    this._activeFloorIdx = floors.length - 1;
  }

  private _removeFloor(idx: number): void {
    const floors = [...this._getFloors()];
    if (floors.length <= 1) return;
    const removedId = floors[idx].id;
    floors.splice(idx, 1);
    this._updateConfig("floors", floors);

    // Remove proxies and zones on this floor
    const proxies = (this._config.proxies || []).filter((p) => p.floor_id !== removedId);
    this._updateConfig("proxies", proxies);
    const zones = (this._config.zones || []).filter((z) => z.floor_id !== removedId);
    this._updateConfig("zones", zones);

    if (this._activeFloorIdx >= floors.length) {
      this._activeFloorIdx = floors.length - 1;
    }
  }

  private _updateFloor(idx: number, key: string, value: any): void {
    const floors = [...this._getFloors()];
    if (!floors[idx]) return;
    floors[idx] = { ...floors[idx], [key]: value };
    this._updateConfig("floors", floors);

    // Also update legacy fields for backwards compatibility
    if (idx === 0) {
      if (key === "image") this._updateConfig("floorplan_image", value);
      if (key === "image_width") this._updateConfig("image_width", value);
      if (key === "image_height") this._updateConfig("image_height", value);
    }
  }

  // ─── Entity Actions ────────────────────────────────────────

  private _addEntityAsProxy(entity: DiscoveredEntity): void {
    const proxies = [...(this._config.proxies || [])];
    if (proxies.some((p) => p.entity_id === entity.entity_id)) return;

    const name = entity.friendly_name || entity.entity_id.replace(/^.*\./, "").replace(/_/g, " ");

    proxies.push({
      entity_id: entity.entity_id,
      name: name,
      x: 0,
      y: 0,
      floor_id: this._getActiveFloor()?.id || "floor_0",
    });

    this._updateConfig("proxies", proxies);
    this._placingEntity = entity;
    this._placingMode = "proxy";
  }

  private _addEntityAsDevice(entity: DiscoveredEntity): void {
    const devices = [...(this._config.tracked_devices || [])];
    if (devices.some((d) => d.entity_prefix === entity.entity_id)) return;

    const name = entity.friendly_name || entity.entity_id.replace(/^.*\./, "").replace(/_/g, " ");
    const colorIdx = devices.length % DEVICE_COLORS.length;

    devices.push({
      entity_prefix: entity.entity_id,
      bermuda_device_id: entity.entity_id,
      name: name,
      color: DEVICE_COLORS[colorIdx],
      icon: "phone",
      show_trail: true,
      show_label: true,
    });

    this._updateConfig("tracked_devices", devices);
  }

  private _handleEntityClick(entity: DiscoveredEntity): void {
    if (entity.added) return;

    if (entity.type === "proxy" || (this._activeTab === "proxies" && this._sidebarCategory !== "devices")) {
      this._addEntityAsProxy(entity);
    } else {
      this._addEntityAsDevice(entity);
    }
  }

  private _removeProxy(idx: number): void {
    const proxies = [...(this._config.proxies || [])];
    proxies.splice(idx, 1);
    this._updateConfig("proxies", proxies);
  }

  private _removeDevice(idx: number): void {
    const devices = [...(this._config.tracked_devices || [])];
    devices.splice(idx, 1);
    this._updateConfig("tracked_devices", devices);
  }

  private _removeZone(idx: number): void {
    const zones = [...(this._config.zones || [])];
    zones.splice(idx, 1);
    this._updateConfig("zones", zones);
    if (this._editingZoneIdx === idx) this._editingZoneIdx = null;
  }

  // ─── Map Click Handler ─────────────────────────────────────

  private _getMapCoords(e: MouseEvent): { x: number; y: number } | null {
    const img = this.shadowRoot?.querySelector(".map-image") as HTMLImageElement;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  private _handleMapClick(e: MouseEvent): void {
    const coords = this._getMapCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    // Calibration mode
    if (this._calibrating) {
      this._calibrationPoints = [...this._calibrationPoints, { x, y }];
      if (this._calibrationPoints.length >= 2) {
        this.requestUpdate();
      }
      return;
    }

    // Rectangle drawing mode
    if (this._drawingZone && this._drawingMode === "rectangle") {
      if (!this._rectStart) {
        this._rectStart = { x, y };
        this._rectPreview = null;
      } else {
        const p1 = this._rectStart;
        const p2 = { x, y };
        const points = [
          { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) },
          { x: Math.max(p1.x, p2.x), y: Math.min(p1.y, p2.y) },
          { x: Math.max(p1.x, p2.x), y: Math.max(p1.y, p2.y) },
          { x: Math.min(p1.x, p2.x), y: Math.max(p1.y, p2.y) },
        ];
        this._finishZone(points);
        this._rectStart = null;
        this._rectPreview = null;
      }
      return;
    }

    // Polygon drawing mode
    if (this._drawingZone && this._drawingMode === "polygon") {
      const points = [...this._drawingPoints, { x, y }];
      if (points.length >= 3) {
        const dx = x - points[0].x;
        const dy = y - points[0].y;
        if (Math.sqrt(dx * dx + dy * dy) < 3) {
          this._finishZone(points);
          return;
        }
      }
      this._drawingPoints = points;
      return;
    }

    // Door placement mode
    if (this._placingDoor) {
      this._placeDoor(x, y);
      return;
    }

    // Placing proxy mode
    if (this._placingMode === "proxy" && this._placingEntity) {
      const proxies = [...(this._config.proxies || [])];
      const idx = proxies.findIndex((p) => p.entity_id === this._placingEntity!.entity_id);
      if (idx >= 0) {
        proxies[idx] = { ...proxies[idx], x, y };
        this._updateConfig("proxies", proxies);
      }
      this._placingEntity = null;
      this._placingMode = null;
      return;
    }

    // Check if clicking on a door (for editing) in doors tab
    if (this._activeTab === "doors" && !this._placingDoor) {
      // If we just finished dragging a door, don't re-handle click
      if (this._draggingDoor !== null) return;
      const doors = this._config.doors || [];
      for (let i = doors.length - 1; i >= 0; i--) {
        const dx = x - doors[i].x;
        const dy = y - doors[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < 4) {
          this._editingDoorIdx = i;
          this.requestUpdate();
          return;
        }
      }
      this._editingDoorIdx = null;
      this.requestUpdate();
      return;
    }

    // Check if clicking on a zone (for editing)
    if (this._activeTab === "zones" && !this._drawingZone) {
      const zones = this._config.zones || [];
      for (let i = zones.length - 1; i >= 0; i--) {
        if (this._isPointInZone(x, y, zones[i])) {
          this._editingZoneIdx = i;
          this.requestUpdate();
          return;
        }
      }
      this._editingZoneIdx = null;
      this.requestUpdate();
      return;
    }

    // Check if clicking on an existing proxy to start drag
    const proxies = this._config.proxies || [];
    for (let i = 0; i < proxies.length; i++) {
      const px = proxies[i].x;
      const py = proxies[i].y;
      if (Math.abs(x - px) < 3 && Math.abs(y - py) < 3) {
        this._draggingProxy = i;
        return;
      }
    }
  }

  private _handleMapMouseMove(e: MouseEvent): void {
    // Rectangle preview
    if (this._drawingZone && this._drawingMode === "rectangle" && this._rectStart) {
      const coords = this._getMapCoords(e);
      if (coords) {
        this._rectPreview = coords;
      }
    }

    // Proxy dragging
    if (this._draggingProxy !== null) {
      e.preventDefault();
      const coords = this._getMapCoords(e);
      if (coords) {
        const proxies = [...(this._config.proxies || [])];
        if (proxies[this._draggingProxy]) {
          proxies[this._draggingProxy] = { ...proxies[this._draggingProxy], x: coords.x, y: coords.y };
          this._config = { ...this._config, proxies };
          this._saveConfigLocal();
          this.requestUpdate();
        }
      }
    }

    // Door dragging
    if (this._draggingDoor !== null) {
      e.preventDefault();
      const coords = this._getMapCoords(e);
      if (coords) {
        const doors = [...(this._config.doors || [])];
        if (doors[this._draggingDoor]) {
          doors[this._draggingDoor] = { ...doors[this._draggingDoor], x: coords.x, y: coords.y };
          this._config = { ...this._config, doors };
          this._saveConfigLocal();
          this.requestUpdate();
        }
      }
    }
  }

  private _handleMapMouseUp(): void {
    if (this._draggingProxy !== null) {
      this._draggingProxy = null;
    }
    if (this._draggingDoor !== null) {
      this._draggingDoor = null;
    }
  }

  // ─── Live Device Tracking ─────────────────────────────────

  private _startLiveTracking(): void {
    if (this._liveTrackingTimer) return;
    this._liveTrackingTimer = window.setInterval(() => this._updateLiveDevices(), 2000);
  }

  private _stopLiveTracking(): void {
    if (this._liveTrackingTimer) {
      clearInterval(this._liveTrackingTimer);
      this._liveTrackingTimer = null;
    }
  }

  /**
   * Get device distances from Bermuda sensors — mirrors the card's _getDeviceDistances logic.
   */
  private _getDeviceDistancesForPanel(deviceConfig: TrackedDeviceConfig, proxies: ProxyConfig[]): ProxyDistance[] {
    if (!this.hass?.states) return [];

    const prefix = deviceConfig.entity_prefix;
    const distances: ProxyDistance[] = [];

    if (!prefix) return distances;

    // Extract the Bermuda device slug from the entity prefix.
    // device_tracker.bermuda_XXXX_bermuda_tracker → XXXX
    // sensor.bermuda_XXXX_distance → XXXX
    const rawSlug = prefix
      .replace(/^device_tracker\.bermuda_/, "")
      .replace(/^sensor\.bermuda_/, "")
      .replace(/^bermuda_/, "")
      .replace(/_bermuda_tracker$/, "")
      .replace(/_distance$/, "");

    // Strategy 1: Individual distance sensors per proxy
    for (const proxy of proxies) {
      const proxyName = proxy.entity_id
        .replace(/^ble_proxy_/, "")
        .replace(/^bermuda_proxy_/, "")
        .replace(/^.*\./, "")
        .replace(/_proxy$/, "");

      // Try multiple sensor naming patterns
      const possibleEntities = [
        `sensor.bermuda_${rawSlug}_distance_to_${proxyName}`,
        `${prefix}_${proxyName}_distance`,
        `${prefix}_distance_${proxyName}`,
        `sensor.bermuda_${prefix.replace(/^.*\.bermuda_/, "").replace(/^sensor\.bermuda_/, "")}_distance_to_${proxyName}`,
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

    // Strategy 2: Device tracker attributes
    if (distances.length === 0) {
      const dtEntity = prefix.replace("sensor.bermuda_", "device_tracker.bermuda_");
      const dtState = this.hass.states[dtEntity];
      if (dtState?.attributes?.scanners) {
        for (const [scannerId, scannerData] of Object.entries(dtState.attributes.scanners as Record<string, any>)) {
          const scannerSlug = scannerId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
          const matchingProxy = proxies.find((p) => {
            const pSlug = p.entity_id.replace(/^ble_proxy_/, "").replace(/^bermuda_proxy_/, "");
            return p.entity_id === scannerId || pSlug === scannerSlug || p.name === (scannerData as any)?.name;
          });
          if (matchingProxy && (scannerData as any)?.distance) {
            distances.push({
              proxy_entity_id: matchingProxy.entity_id,
              distance: (scannerData as any).distance,
              rssi: (scannerData as any).rssi || -80,
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    return distances;
  }

  /**
   * Update live device positions using trilateration.
   * Runs every 2 seconds to show real-time device positions in the editor.
   */
  private _updateLiveDevices(): void {
    if (!this.hass?.states) return;
    const devices = this._config.tracked_devices || [];
    const allProxies = this._config.proxies || [];
    const placedProxies = allProxies.filter((p) => p.x > 0 || p.y > 0);
    if (devices.length === 0 || placedProxies.length === 0) return;

    const floor = this._getActiveFloor();
    if (!floor) return;

    const imageWidth = floor.image_width || 20;
    const imageHeight = floor.image_height || 15;
    const newPositions = new Map<string, { x: number; y: number; color: string; name: string; accuracy: number; confidence: number }>();
    const debugInfo: Array<{ proxyName: string; proxyId: string; distance: number | null; sensorId: string; placed: boolean }> = [];

    for (const deviceConfig of devices) {
      const deviceId = deviceConfig.entity_prefix || deviceConfig.bermuda_device_id || "";
      if (!deviceId) continue;

      // Extract raw slug for sensor matching
      const rawSlug = deviceId
        .replace(/^device_tracker\.bermuda_/, "")
        .replace(/^sensor\.bermuda_/, "")
        .replace(/^bermuda_/, "")
        .replace(/_bermuda_tracker$/, "")
        .replace(/_distance$/, "");

      // Collect debug info for ALL proxies (placed and unplaced)
      for (const proxy of allProxies) {
        const proxyName = proxy.entity_id
          .replace(/^ble_proxy_/, "")
          .replace(/^bermuda_proxy_/, "")
          .replace(/^.*\./, "")
          .replace(/_proxy$/, "");
        const sensorId = `sensor.bermuda_${rawSlug}_distance_to_${proxyName}`;
        const state = this.hass!.states[sensorId];
        const dist = state && !isNaN(parseFloat(state.state)) ? parseFloat(state.state) : null;
        const isPlaced = (proxy.x > 0 || proxy.y > 0) && (!proxy.floor_id || proxy.floor_id === floor.id);
        debugInfo.push({
          proxyName: proxy.name || proxyName,
          proxyId: proxyName,
          distance: dist,
          sensorId,
          placed: isPlaced,
        });
      }

      // Only use proxies on the active floor
      const floorProxies = placedProxies.filter((p) => !p.floor_id || p.floor_id === floor.id);
      const distances = this._getDeviceDistancesForPanel(deviceConfig, floorProxies);

      if (distances.length >= 1) {
        const proxyMap = new Map<string, { x: number; y: number }>();
        for (const d of distances) {
          const proxy = floorProxies.find((p) => p.entity_id === d.proxy_entity_id);
          if (proxy) {
            proxyMap.set(d.proxy_entity_id, { x: proxy.x, y: proxy.y });
          }
        }

        if (proxyMap.size >= 1) {
          const result = trilaterate(proxyMap, distances, 100, 100, imageWidth, imageHeight);
          if (result) {
            const prevResult = this._previousPositions.get(deviceId) || null;
            const smoothed = smoothPosition(result, prevResult, 0.3);
            if (smoothed) {
              this._previousPositions.set(deviceId, smoothed);
              newPositions.set(deviceId, {
                x: smoothed.x,
                y: smoothed.y,
                color: deviceConfig.color || DEVICE_COLORS[0],
                name: deviceConfig.name || deviceId,
                accuracy: smoothed.accuracy,
                confidence: smoothed.confidence,
              });
            }
          }
        }
      }
    }

    this._liveDevicePositions = newPositions;
    this._liveDebugInfo = debugInfo;
  }

  // ─── Zone Helpers ─────────────────────────────────────────

  private _isPointInZone(x: number, y: number, zone: ZoneConfig): boolean {
    const points = zone.points || [];
    if (points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private _startDrawingZone(mode: "polygon" | "rectangle"): void {
    this._drawingZone = true;
    this._drawingMode = mode;
    this._drawingPoints = [];
    this._rectStart = null;
    this._rectPreview = null;
    this._editingZoneIdx = null;
  }

  private _cancelDrawing(): void {
    this._drawingZone = false;
    this._drawingPoints = [];
    this._rectStart = null;
    this._rectPreview = null;
  }

  private _finishZone(points?: { x: number; y: number }[]): void {
    const zonePoints = points || this._drawingPoints;
    if (zonePoints.length < 3) return;

    const zones = [...(this._config.zones || [])];
    const colorIdx = zones.length % ZONE_COLORS.length;
    const floor = this._getActiveFloor();

    zones.push({
      id: `zone_${Date.now()}`,
      name: "",
      points: zonePoints,
      color: ZONE_COLORS[colorIdx],
      border_color: ZONE_COLORS[colorIdx],
      opacity: 0.5,
      show_label: true,
      floor_id: floor?.id || "floor_0",
    });

    this._updateConfig("zones", zones);
    this._drawingZone = false;
    this._drawingPoints = [];
    this._rectStart = null;
    this._rectPreview = null;

    // Auto-select the new zone for editing
    this._editingZoneIdx = zones.length - 1;
  }

  // ─── Door Placement ──────────────────────────────────────

  private _startPlacingDoor(type: DoorType = "door"): void {
    this._placingDoor = true;
    this._placingDoorType = type;
  }

  private _cancelPlacingDoor(): void {
    this._placingDoor = false;
  }

  private _placeDoor(x: number, y: number): void {
    const doors = [...(this._config.doors || [])];
    const floor = this._getActiveFloor();
    const floorId = floor?.id || "floor_0";

    // Auto-detect which zones this door connects
    const zones = this._config.zones || [];
    let zoneA: string | null = null;
    let zoneB: string | null = null;

    // Find the two closest zones to this point
    const zoneDists: { id: string; dist: number }[] = [];
    for (const zone of zones) {
      if (zone.floor_id && zone.floor_id !== floorId) continue;
      // Calculate distance from door to zone center
      const pts = zone.points || [];
      if (pts.length < 3) continue;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      zoneDists.push({ id: zone.id, dist });
    }

    // Sort by distance and pick the two closest
    zoneDists.sort((a, b) => a.dist - b.dist);
    if (zoneDists.length >= 2) {
      zoneA = zoneDists[0].id;
      zoneB = zoneDists[1].id;
    } else if (zoneDists.length === 1) {
      zoneA = zoneDists[0].id;
    }

    const newDoor: DoorConfig = {
      id: `door_${Date.now()}`,
      type: this._placingDoorType,
      x,
      y,
      zone_a: zoneA || "",
      zone_b: zoneB || "",
      floor_id: floorId,
      name: "",
    };

    // If it's a portal type, set default target
    if (this._placingDoorType === "portal") {
      const floors = this._config.floors || [];
      const otherFloor = floors.find((f) => f.id !== floorId);
      if (otherFloor) {
        newDoor.portal_target_floor = otherFloor.id;
      }
    }

    doors.push(newDoor);
    this._updateConfig("doors", doors);
    this._placingDoor = false;
    this._editingDoorIdx = doors.length - 1;
  }

  private _removeDoor(idx: number): void {
    const doors = [...(this._config.doors || [])];
    doors.splice(idx, 1);
    this._updateConfig("doors", doors);
    if (this._editingDoorIdx === idx) this._editingDoorIdx = null;
  }

  private _updateDoor(idx: number, key: keyof DoorConfig, value: any): void {
    const doors = [...(this._config.doors || [])];
    doors[idx] = { ...doors[idx], [key]: value };
    this._updateConfig("doors", doors);
  }

  // ─── Calibration ───────────────────────────────────────────

  private _startCalibration(): void {
    this._calibrating = true;
    this._calibrationPoints = [];
    this._calibrationMeters = 0;
  }

  private _cancelCalibration(): void {
    this._calibrating = false;
    this._calibrationPoints = [];
  }

  private _applyCalibration(): void {
    if (this._calibrationPoints.length < 2 || this._calibrationMeters <= 0) return;

    const img = this.shadowRoot?.querySelector(".map-image") as HTMLImageElement;
    if (!img) return;

    const p1 = this._calibrationPoints[0];
    const p2 = this._calibrationPoints[1];
    const pixelDist = Math.sqrt(
      Math.pow((p2.x - p1.x) * img.naturalWidth / 100, 2) +
      Math.pow((p2.y - p1.y) * img.naturalHeight / 100, 2)
    );

    const metersPerPixel = this._calibrationMeters / pixelDist;
    const imageWidth = Math.round(img.naturalWidth * metersPerPixel * 100) / 100;
    const imageHeight = Math.round(img.naturalHeight * metersPerPixel * 100) / 100;

    // Update current floor
    this._updateFloor(this._activeFloorIdx, "image_width", imageWidth);
    this._updateFloor(this._activeFloorIdx, "image_height", imageHeight);

    this._calibrating = false;
    this._calibrationPoints = [];
  }

  // ─── RSSI Calibration Wizard ──────────────────────────────────

  private _startCalibWizard(proxyIdx: number): void {
    this._calibWizardActive = true;
    this._calibWizardProxyIdx = proxyIdx;
    this._calibWizardDistance = 1.0;
    this._calibWizardRssi = null;
    this._calibWizardSamples = [];

    // Start sampling RSSI values
    this._startRssiSampling(proxyIdx);
  }

  private _stopCalibWizard(): void {
    this._calibWizardActive = false;
    this._calibWizardProxyIdx = null;
    this._calibWizardRssi = null;
    this._calibWizardSamples = [];
    if (this._calibWizardTimer) {
      clearInterval(this._calibWizardTimer);
      this._calibWizardTimer = null;
    }
  }

  private _startRssiSampling(proxyIdx: number): void {
    if (this._calibWizardTimer) clearInterval(this._calibWizardTimer);

    this._calibWizardSamples = [];
    this._calibWizardRssi = null;

    // Sample RSSI every 2 seconds for 10 seconds (5 samples)
    this._calibWizardTimer = window.setInterval(() => {
      const rssi = this._getCurrentRssiForProxy(proxyIdx);
      if (rssi !== null) {
        this._calibWizardSamples = [...this._calibWizardSamples, rssi];
        // Calculate running average
        const avg = this._calibWizardSamples.reduce((a, b) => a + b, 0) / this._calibWizardSamples.length;
        this._calibWizardRssi = Math.round(avg);
      }
    }, 2000);
  }

  /**
   * Try to get current RSSI reading for a proxy from Bermuda sensors.
   * Looks for any sensor.bermuda_*_distance_to_PROXYNAME and reads its rssi attribute.
   */
  private _getCurrentRssiForProxy(proxyIdx: number): number | null {
    if (!this.hass?.states) return null;
    const proxies = this._config.proxies || [];
    const proxy = proxies[proxyIdx];
    if (!proxy) return null;

    // Extract proxy slug from entity_id
    const proxySlug = proxy.entity_id.replace(/^bermuda_proxy_/, "").replace(/^.*\./, "");

    // Search for any distance sensor that targets this proxy
    for (const [entityId, stateObj] of Object.entries(this.hass.states)) {
      if (entityId.includes("_distance_to_") && entityId.includes(proxySlug)) {
        const attrs = (stateObj as any)?.attributes;
        if (attrs?.rssi !== undefined) {
          return attrs.rssi;
        }
      }
    }

    return null;
  }

  private _confirmCalibration(): void {
    if (this._calibWizardProxyIdx === null || this._calibWizardRssi === null) return;

    const proxies = [...(this._config.proxies || [])];
    const idx = this._calibWizardProxyIdx;
    if (!proxies[idx]) return;

    proxies[idx] = {
      ...proxies[idx],
      calibration: {
        ref_rssi: this._calibWizardRssi,
        ref_distance: this._calibWizardDistance,
        calibrated_at: Date.now(),
      },
    };

    this._updateConfig("proxies", proxies);
    this._stopCalibWizard();

    // Show success message
    this._saveMessage = this._t("panel.calibrate_saved");
    this._saving = true;
    setTimeout(() => { this._saving = false; this._saveMessage = ""; }, 2000);
  }

  private _resetProxyCalibration(proxyIdx: number): void {
    const proxies = [...(this._config.proxies || [])];
    if (!proxies[proxyIdx]) return;

    const { calibration, ...rest } = proxies[proxyIdx] as any;
    proxies[proxyIdx] = rest;
    this._updateConfig("proxies", proxies);
  }

  // ─── Gateway Config Helpers ─────────────────────────────────

  private _toggleProxyGateway(proxyIdx: number): void {
    const proxies = [...(this._config.proxies || [])];
    if (!proxies[proxyIdx]) return;

    const isGateway = !proxies[proxyIdx].is_gateway;
    proxies[proxyIdx] = {
      ...proxies[proxyIdx],
      is_gateway: isGateway,
      gateway_type: isGateway ? (proxies[proxyIdx].gateway_type || "stairway") : undefined,
      gateway_connects: isGateway ? (proxies[proxyIdx].gateway_connects || []) : undefined,
    };
    this._updateConfig("proxies", proxies);
  }

  private _updateProxyGatewayType(proxyIdx: number, type: GatewayType): void {
    const proxies = [...(this._config.proxies || [])];
    if (!proxies[proxyIdx]) return;
    proxies[proxyIdx] = { ...proxies[proxyIdx], gateway_type: type };
    this._updateConfig("proxies", proxies);
  }

  private _updateProxyGatewayConnects(proxyIdx: number, floorIds: string[]): void {
    const proxies = [...(this._config.proxies || [])];
    if (!proxies[proxyIdx]) return;
    proxies[proxyIdx] = { ...proxies[proxyIdx], gateway_connects: floorIds };
    this._updateConfig("proxies", proxies);
  }

  private _toggleGatewayFloor(proxyIdx: number, floorId: string): void {
    const proxies = this._config.proxies || [];
    const proxy = proxies[proxyIdx];
    if (!proxy) return;

    const current = proxy.gateway_connects || [];
    const newConnects = current.includes(floorId)
      ? current.filter((f) => f !== floorId)
      : [...current, floorId];
    this._updateProxyGatewayConnects(proxyIdx, newConnects);
  }

  /**
   * Get area name for a proxy from device registry.
   */
  private _getProxyAreaName(proxy: ProxyConfig): string {
    if (!this._deviceRegistryCache || !this._areaRegistryCache) return "";

    const proxySlug = proxy.entity_id.replace(/^bermuda_proxy_/, "").replace(/^.*\./, "").toLowerCase();

    for (const device of this._deviceRegistryCache) {
      const deviceName = (device.name || "").toLowerCase().replace(/[\s-]+/g, "_");
      if (deviceName.includes(proxySlug) || proxySlug.includes(deviceName)) {
        if (device.area_id && this._areaRegistryCache.has(device.area_id)) {
          return this._areaRegistryCache.get(device.area_id) || "";
        }
      }
    }
    return "";
  }

  // ─── Auto-place ────────────────────────────────────────────

  private _autoPlaceProxies(): void {
    const zones = this._config.zones || [];
    if (zones.length === 0) return;

    const proxies = [...(this._config.proxies || [])];
    let placed = 0;

    for (let i = 0; i < proxies.length; i++) {
      const proxyName = (proxies[i].name || proxies[i].entity_id || "").toLowerCase();
      const entityParts = proxies[i].entity_id.replace(/^.*\./, "").replace(/_/g, " ").toLowerCase().split(" ");

      for (const zone of zones) {
        const zoneName = (zone.name || "").toLowerCase();
        if (!zoneName) continue;

        const matched = proxyName.includes(zoneName) ||
          zoneName.split(" ").some((zp: string) => zp.length > 2 && proxyName.includes(zp)) ||
          entityParts.some((part: string) => part.length > 2 && zoneName.includes(part));

        if (matched) {
          const cx = zone.points.reduce((s: number, p: { x: number }) => s + p.x, 0) / zone.points.length;
          const cy = zone.points.reduce((s: number, p: { y: number }) => s + p.y, 0) / zone.points.length;
          proxies[i] = { ...proxies[i], x: cx, y: cy, floor_id: zone.floor_id };
          placed++;
          break;
        }
      }
    }

    this._updateConfig("proxies", proxies);
    this._saveMessage = `${this._t("panel.auto_place")}: ${placed} ${this._t("panel.placed").toLowerCase()}`;
    this._saving = true;
    setTimeout(() => { this._saving = false; this._saveMessage = ""; }, 2000);
  }

  // ─── Rendering ─────────────────────────────────────────────

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100%;
        --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
        --text-primary: var(--primary-text-color, #212121);
        --text-secondary: var(--secondary-text-color, #727272);
        --accent: var(--primary-color, #4FC3F7);
        --sidebar-width: 320px;
      }

      .panel-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--primary-background-color, #fafafa);
      }

      /* ── Top Bar ── */
      .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: var(--card-bg);
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        flex-shrink: 0;
        gap: 12px;
      }

      .top-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .top-icon {
        width: 32px;
        height: 32px;
        background: var(--accent);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
      }

      .top-icon svg { width: 20px; height: 20px; }

      .top-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .top-version {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .top-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      /* ── Tabs ── */
      .tab-bar {
        display: flex;
        background: var(--card-bg);
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        flex-shrink: 0;
        overflow-x: auto;
      }

      .tab {
        padding: 10px 20px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        white-space: nowrap;
        background: none;
        border-top: none;
        border-left: none;
        border-right: none;
      }

      .tab:hover { color: var(--text-primary); }

      .tab.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
      }

      /* ── Main Content ── */
      .main-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      /* ── Entity Sidebar ── */
      .entity-sidebar {
        width: var(--sidebar-width);
        flex-shrink: 0;
        background: var(--card-bg);
        border-right: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .sidebar-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06));
      }

      .sidebar-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 8px;
      }

      .sidebar-filter {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 8px;
        font-size: 13px;
        background: var(--primary-background-color, #fafafa);
        color: var(--text-primary);
        outline: none;
        box-sizing: border-box;
      }

      .sidebar-filter:focus {
        border-color: var(--accent);
      }

      .sidebar-categories {
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06));
      }

      .cat-btn {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        background: none;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s;
      }

      .cat-btn.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      .sidebar-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 0;
      }

      .sidebar-section-header {
        padding: 10px 16px 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .sidebar-section-count {
        font-weight: 400;
        opacity: 0.7;
      }

      .entity-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        gap: 10px;
        cursor: pointer;
        transition: background 0.15s;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      }

      .entity-item:hover {
        background: var(--divider-color, rgba(0,0,0,0.03));
      }

      .entity-item.added {
        opacity: 0.5;
        cursor: default;
      }

      .entity-item.placing {
        background: rgba(79, 195, 247, 0.1);
        border-left: 3px solid var(--accent);
      }

      .entity-type-badge {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .badge-proxy {
        background: #E3F2FD;
        color: #1565C0;
      }

      .badge-device {
        background: #E8F5E9;
        color: #2E7D32;
      }

      .badge-unknown {
        background: #F5F5F5;
        color: #757575;
      }

      .entity-info {
        flex: 1;
        min-width: 0;
      }

      .entity-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .entity-id {
        font-size: 11px;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .entity-area {
        font-size: 11px;
        color: var(--accent);
      }

      .entity-status {
        font-size: 10px;
        color: var(--text-secondary);
        flex-shrink: 0;
      }

      .entity-check {
        color: #4CAF50;
        flex-shrink: 0;
      }

      .smart-help {
        padding: 8px 16px;
        font-size: 11px;
        color: var(--text-secondary);
        background: rgba(79, 195, 247, 0.05);
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06));
        font-style: italic;
      }

      /* ── Map Area ── */
      .map-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 16px;
      }

      .map-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .floor-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }

      .floor-tab {
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        background: none;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s;
      }

      .floor-tab.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      .floor-tab:hover:not(.active) {
        background: var(--divider-color, rgba(0,0,0,0.05));
      }

      .map-wrapper {
        flex: 1;
        position: relative;
        overflow: auto;
        background: var(--divider-color, rgba(0,0,0,0.03));
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .map-inner {
        position: relative;
        display: inline-block;
        max-width: 100%;
        max-height: 100%;
        user-select: none;
        -webkit-user-select: none;
      }

      .map-image {
        display: block;
        max-width: 100%;
        max-height: calc(100vh - 260px);
        cursor: crosshair;
      }

      .map-image.dragging {
        cursor: grabbing;
      }

      .map-inner.dragging {
        cursor: grabbing;
      }

      .map-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
      }

      /* Zone overlays */
      .zone-polygon {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      .zone-polygon.clickable {
        pointer-events: all;
        cursor: pointer;
      }

      .zone-label-overlay {
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 11px;
        font-weight: 700;
        color: #1a1a1a;
        background: rgba(255, 255, 255, 0.85);
        padding: 2px 8px;
        border-radius: 4px;
        text-shadow: none;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        z-index: 5;
      }

      /* Proxy markers */
      .proxy-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #2196F3;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        cursor: grab;
        pointer-events: all;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        transition: transform 0.1s;
        z-index: 10;
        user-select: none;
        -webkit-user-select: none;
      }

      .proxy-marker:hover {
        transform: translate(-50%, -50%) scale(1.2);
      }

      .proxy-label {
        position: absolute;
        transform: translate(-50%, 0);
        font-size: 10px;
        color: var(--text-primary);
        text-shadow: 0 0 3px var(--card-bg), 0 0 3px var(--card-bg);
        white-space: nowrap;
        pointer-events: none;
        font-weight: 500;
      }

      /* Live device markers */
      .live-device-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 36px;
        height: 36px;
        pointer-events: none;
        z-index: 15;
      }

      .live-device-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--device-color, #1E88E5);
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      }

      .live-device-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--device-color, #1E88E5);
        opacity: 0.3;
        animation: device-pulse 2s ease-out infinite;
      }

      @keyframes device-pulse {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.4; }
        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
      }

      .live-device-label {
        position: absolute;
        transform: translate(-50%, 0);
        font-size: 11px;
        font-weight: 700;
        color: #1a1a1a;
        background: rgba(255, 255, 255, 0.85);
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        z-index: 15;
      }

      /* Debug panel */
      .debug-panel {
        background: var(--card-bg, #1e1e1e);
        border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        border-radius: 8px;
        padding: 12px;
        margin-top: 4px;
        max-height: 250px;
        overflow-y: auto;
        font-size: 12px;
      }

      .debug-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }

      .debug-table th {
        text-align: left;
        padding: 4px 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.15));
        color: var(--text-secondary);
        font-weight: 600;
      }

      .debug-table td {
        padding: 3px 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.05));
      }

      .debug-active {
        color: #4CAF50;
        font-weight: 500;
      }

      .debug-inactive {
        color: var(--text-secondary);
        opacity: 0.6;
      }

      .debug-summary {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        font-size: 11px;
        color: var(--text-secondary);
      }

      /* Door markers */
      .door-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: var(--door-color, #FF9800);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: all;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        transition: transform 0.15s, box-shadow 0.15s;
        z-index: 9;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
      }

      .door-marker .door-icon {
        font-size: 16px;
        line-height: 1;
      }

      .door-marker.clickable:hover {
        transform: translate(-50%, -50%) scale(1.15);
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      }

      .door-marker.editing {
        transform: translate(-50%, -50%) scale(1.2);
        box-shadow: 0 0 0 3px white, 0 0 0 5px var(--door-color, #FF9800);
      }

      .door-label {
        position: absolute;
        transform: translate(-50%, 0);
        font-size: 9px;
        color: var(--text-primary);
        text-shadow: 0 0 3px var(--card-bg), 0 0 3px var(--card-bg);
        white-space: nowrap;
        pointer-events: none;
        font-weight: 600;
      }

      /* Drawing points */
      .draw-point {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #FF5722;
        border: 2px solid white;
        pointer-events: none;
        z-index: 20;
      }

      .rect-preview, .cal-line {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .cal-point {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #FF9800;
        border: 2px solid white;
        pointer-events: none;
        z-index: 20;
      }

      /* Placement banner */
      .placement-banner {
        background: rgba(79, 195, 247, 0.1);
        border: 1px solid var(--accent);
        border-radius: 8px;
        padding: 10px 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        color: var(--text-primary);
      }

      /* Zone edit panel */
      .zone-edit-panel {
        background: var(--card-bg);
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }

      .zone-edit-panel h4 {
        margin: 0 0 10px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .zone-edit-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .zone-edit-row label {
        font-size: 12px;
        color: var(--text-secondary);
        min-width: 80px;
      }

      .zone-edit-row input[type="text"] {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 6px;
        font-size: 12px;
        background: var(--primary-background-color, #fafafa);
        color: var(--text-primary);
        outline: none;
      }

      .zone-edit-row input[type="color"] {
        width: 36px;
        height: 28px;
        padding: 2px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 4px;
        cursor: pointer;
      }

      .zone-edit-row input[type="range"] {
        flex: 1;
      }

      .zone-edit-row input[type="checkbox"] {
        width: 16px;
        height: 16px;
      }

      /* Config panels */
      .config-panel {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
      }

      .config-section {
        background: var(--card-bg);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      }

      .config-section h3 {
        margin: 0 0 12px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .config-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      .config-row label {
        font-size: 13px;
        color: var(--text-secondary);
        min-width: 140px;
        flex-shrink: 0;
      }

      .config-row input,
      .config-row select {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 8px;
        font-size: 13px;
        background: var(--primary-background-color, #fafafa);
        color: var(--text-primary);
        outline: none;
      }

      .config-row input:focus,
      .config-row select:focus {
        border-color: var(--accent);
      }

      .config-row input[type="checkbox"] {
        flex: none;
        width: 18px;
        height: 18px;
      }

      .config-row input[type="color"] {
        flex: none;
        width: 40px;
        height: 32px;
        padding: 2px;
        cursor: pointer;
      }

      .config-row input[type="range"] {
        flex: 1;
      }

      /* Item list */
      .item-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .item-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: var(--primary-background-color, #fafafa);
        border-radius: 8px;
        transition: background 0.15s;
      }

      .item-card:hover {
        background: var(--divider-color, rgba(0,0,0,0.05));
      }

      .item-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .item-info {
        flex: 1;
        min-width: 0;
      }

      .item-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .item-detail {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .item-actions {
        display: flex;
        gap: 4px;
      }

      /* Buttons */
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 8px;
        border: none;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: var(--accent);
        color: white;
      }

      .btn-primary:hover { filter: brightness(1.1); }

      .btn-secondary {
        background: var(--divider-color, rgba(0,0,0,0.05));
        color: var(--text-primary);
      }

      .btn-secondary:hover {
        background: var(--divider-color, rgba(0,0,0,0.1));
      }

      .btn-danger {
        background: none;
        color: #E53935;
        padding: 4px 8px;
      }

      .btn-danger:hover {
        background: rgba(229, 57, 53, 0.08);
      }

      .btn-small {
        padding: 4px 10px;
        font-size: 11px;
      }

      .btn svg {
        width: 14px;
        height: 14px;
      }

      .save-msg {
        font-size: 12px;
        color: #4CAF50;
        font-weight: 500;
      }

      /* Empty state */
      .empty-map {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: var(--text-secondary);
        text-align: center;
        flex: 1;
      }

      .empty-map svg {
        width: 64px;
        height: 64px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      .empty-map p {
        margin: 4px 0;
        font-size: 14px;
      }

      /* Calibration Wizard */
      .calib-wizard-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .calib-wizard-card {
        background: var(--card-bg);
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .calib-wizard-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .calib-wizard-row label {
        font-size: 13px;
        color: var(--text-primary);
        font-weight: 500;
      }

      .calib-wizard-rssi {
        text-align: center;
        padding: 16px;
        background: var(--primary-background-color, #fafafa);
        border-radius: 12px;
        margin: 8px 0;
      }

      /* Responsive */
      @media (max-width: 900px) {
        .main-content {
          flex-direction: column;
        }

        .entity-sidebar {
          width: 100%;
          max-height: 200px;
          border-right: none;
          border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        }
      }
    `;
  }

  protected render() {
    if (!this._loaded) return html`<div style="padding:40px;text-align:center;">Loading...</div>`;

    return html`
      <div class="panel-container">
        ${this._renderTopBar()}
        ${this._renderTabBar()}
        <div class="main-content">
          ${this._activeTab === "settings"
            ? this._renderSettingsPanel()
            : html`
                ${this._renderEntitySidebar()}
                ${this._renderMapArea()}
              `}
        </div>
      </div>
    `;
  }

  private _renderTopBar() {
    return html`
      <div class="top-bar">
        <div class="top-left">
          <div class="top-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <div class="top-title">BLE LiveMap</div>
            <div class="top-version">v${CARD_VERSION}</div>
          </div>
        </div>
        <div class="top-actions">
          ${this._saving ? html`<span class="save-msg">${this._saveMessage}</span>` : nothing}
          <button class="btn btn-secondary" @click=${this._handleExportYaml}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            ${this._t("panel.copy_yaml")}
          </button>
          <button class="btn btn-primary" @click=${this._saveAndPush}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
            ${this._t("panel.save")}
          </button>
        </div>
      </div>
    `;
  }

  private _renderTabBar() {
    const tabs: { id: string; label: string }[] = [
      { id: "map", label: this._t("panel.tab_map") },
      { id: "proxies", label: this._t("panel.tab_proxies") },
      { id: "devices", label: this._t("panel.tab_devices") },
      { id: "zones", label: this._t("panel.tab_zones") },
      { id: "doors", label: this._t("panel.tab_doors") },
      { id: "settings", label: this._t("panel.tab_settings") },
    ];

    return html`
      <div class="tab-bar">
        ${tabs.map((tab) => html`
          <button
            class="tab ${this._activeTab === tab.id ? "active" : ""}"
            @click=${() => { this._activeTab = tab.id; this._editingZoneIdx = null; }}
          >${tab.label}</button>
        `)}
      </div>
    `;
  }

  private _renderEntitySidebar() {
    const isSmart = this._sidebarCategory === "smart";

    // In smart mode, show proxies and devices in separate sections
    if (isSmart) {
      const proxies = this._getSmartProxyList();
      const devices = this._getSmartDeviceList();

      return html`
        <div class="entity-sidebar">
          <div class="sidebar-header">
            <div class="sidebar-title">${this._t("panel.sidebar_title")}</div>
            <input
              class="sidebar-filter"
              type="text"
              placeholder="${this._t("panel.filter")}"
              .value=${this._sidebarFilter}
              @input=${(e: Event) => { this._sidebarFilter = (e.target as HTMLInputElement).value; }}
            />
          </div>
          <div class="sidebar-categories">
            ${(["smart", "proxies", "devices", "all"] as const).map((cat) => html`
              <button
                class="cat-btn ${this._sidebarCategory === cat ? "active" : ""}"
                @click=${() => { this._sidebarCategory = cat; }}
              >${this._t(`panel.category_${cat}`)}</button>
            `)}
          </div>
          <div class="smart-help">${this._t("panel.smart_help")}</div>
          <div class="sidebar-list">
            <!-- Proxy section -->
            <div class="sidebar-section-header">
              ${this._t("panel.proxy_section")}
              <span class="sidebar-section-count">(${proxies.length} ${this._t("panel.scanner_count")})</span>
            </div>
            ${proxies.length === 0
              ? html`<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);">No Bermuda proxies detected</div>`
              : proxies.map((entity) => this._renderEntityItem(entity))}

            <!-- Device section -->
            <div class="sidebar-section-header" style="margin-top:8px;">
              ${this._t("panel.device_section")}
              <span class="sidebar-section-count">(${devices.length} ${this._t("panel.device_count")})</span>
            </div>
            ${devices.length === 0
              ? html`<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);">No trackable devices found</div>`
              : devices.map((entity) => this._renderEntityItem(entity))}
          </div>
        </div>
      `;
    }

    // Non-smart modes
    const entities = this._discoverEntities();

    return html`
      <div class="entity-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">${this._t("panel.sidebar_title")}</div>
          <input
            class="sidebar-filter"
            type="text"
            placeholder="${this._t("panel.filter")}"
            .value=${this._sidebarFilter}
            @input=${(e: Event) => { this._sidebarFilter = (e.target as HTMLInputElement).value; }}
          />
        </div>
        <div class="sidebar-categories">
          ${(["smart", "proxies", "devices", "all"] as const).map((cat) => html`
            <button
              class="cat-btn ${this._sidebarCategory === cat ? "active" : ""}"
              @click=${() => { this._sidebarCategory = cat; }}
            >${this._t(`panel.category_${cat}`)}</button>
          `)}
        </div>
        <div class="sidebar-list">
          ${entities.length === 0
            ? html`<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">${this._t("panel.no_entities")}</div>`
            : entities.map((entity) => this._renderEntityItem(entity))}
        </div>
      </div>
    `;
  }

  private _renderEntityItem(entity: DiscoveredEntity) {
    return html`
      <button
        class="entity-item ${entity.added ? "added" : ""} ${this._placingEntity?.entity_id === entity.entity_id ? "placing" : ""}"
        @click=${() => this._handleEntityClick(entity)}
      >
        <span class="entity-type-badge badge-${entity.type}">${entity.type === "proxy" ? "P" : entity.type === "device" ? "D" : "?"}</span>
        <div class="entity-info">
          <div class="entity-name">${entity.friendly_name}</div>
          <div class="entity-id">${entity.proxy_id || entity.entity_id}</div>
          ${entity.area ? html`<div class="entity-area">${entity.area}</div>` : nothing}
        </div>
        ${entity.added
          ? html`<span class="entity-check">\u2713</span>`
          : html`<span class="entity-status">${entity.state}</span>`}
      </button>
    `;
  }

  private _renderMapArea() {
    const floors = this._getFloors();
    const floor = this._getActiveFloor();
    const hasImage = floor?.image;

    return html`
      <div class="map-area">
        <!-- Floor tabs (if multiple floors) -->
        ${floors.length > 1 ? html`
          <div class="floor-tabs">
            ${floors.map((f, idx) => html`
              <button
                class="floor-tab ${this._activeFloorIdx === idx ? "active" : ""}"
                @click=${() => { this._activeFloorIdx = idx; this._mapImageLoaded = false; }}
              >${f.name || `Floor ${idx + 1}`}</button>
            `)}
          </div>
        ` : nothing}

        <!-- Placement banner -->
        ${this._placingEntity ? html`
          <div class="placement-banner">
            <span>${this._t("panel.click_map_to_place")}: <strong>${this._placingEntity.friendly_name}</strong></span>
            <button class="btn btn-small btn-secondary" @click=${() => { this._placingEntity = null; this._placingMode = null; }}>
              ${this._t("panel.cancel_placement")}
            </button>
          </div>
        ` : nothing}

        <!-- Map toolbar -->
        ${this._activeTab === "map" ? this._renderMapToolbar() : nothing}
        ${this._activeTab === "zones" ? this._renderZoneToolbar() : nothing}
        ${this._activeTab === "proxies" ? this._renderProxyToolbar() : nothing}
        ${this._activeTab === "doors" ? this._renderDoorToolbar() : nothing}

        <!-- Zone edit panel -->
        ${this._editingZoneIdx !== null && this._activeTab === "zones" ? this._renderZoneEditPanel() : nothing}

        <!-- Door edit panel -->
        ${this._editingDoorIdx !== null && this._activeTab === "doors" ? this._renderDoorEditPanel() : nothing}

        <!-- Map -->
        ${hasImage ? html`
          <div class="map-wrapper">
            <div class="map-inner ${(this._draggingProxy !== null || this._draggingDoor !== null) ? 'dragging' : ''}"
              @click=${this._handleMapClick}
              @mousemove=${this._handleMapMouseMove}
              @mouseup=${this._handleMapMouseUp}
              @mouseleave=${this._handleMapMouseUp}
            >
              <img
                class="map-image ${(this._draggingProxy !== null || this._draggingDoor !== null) ? "dragging" : ""}"
                src=${floor!.image}
                @load=${() => { this._mapImageLoaded = true; }}
                crossorigin="anonymous"
              />
              ${this._mapImageLoaded ? html`
                <div class="map-overlay">
                  ${this._renderZoneOverlays()}
                  ${this._renderDoorMarkers()}
                  ${this._renderProxyMarkers()}
                  ${this._renderLiveDeviceMarkers()}
                  ${this._renderDrawingPoints()}
                  ${this._renderRectPreview()}
                  ${this._renderCalibrationOverlay()}
                </div>
              ` : nothing}
            </div>
          </div>
          <!-- Debug toggle -->
          ${this._liveDebugInfo.length > 0 ? html`
            <button class="btn btn-small" style="margin-top:8px; font-size:11px;" @click=${() => { this._showDebugPanel = !this._showDebugPanel; }}>
              ${this._showDebugPanel ? '▲ Hide' : '▼ Show'} Sensor Debug
            </button>
          ` : nothing}
          ${this._showDebugPanel && this._liveDebugInfo.length > 0 ? html`
            <div class="debug-panel">
              <table class="debug-table">
                <thead>
                  <tr>
                    <th>Proxy</th>
                    <th>Distance</th>
                    <th>Placed</th>
                    <th>Used</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._liveDebugInfo.map((d) => html`
                    <tr class="${d.distance !== null ? 'debug-active' : 'debug-inactive'}">
                      <td title="${d.sensorId}">${d.proxyName}</td>
                      <td>${d.distance !== null ? d.distance.toFixed(2) + 'm' : 'unknown'}</td>
                      <td>${d.placed ? '✓' : '✗'}</td>
                      <td>${d.distance !== null && d.placed ? '✅ YES' : d.distance !== null && !d.placed ? '⚠ NOT PLACED' : '❌'}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
              <div class="debug-summary">
                Active: ${this._liveDebugInfo.filter(d => d.distance !== null).length} / ${this._liveDebugInfo.length} |
                Used for trilateration: ${this._liveDebugInfo.filter(d => d.distance !== null && d.placed).length}
              </div>
            </div>
          ` : nothing}
        ` : html`
          <div class="empty-map">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
            </svg>
            <p>${this._t("panel.floor_image_help")}</p>
            <div style="margin-top:16px;">
              <div class="config-row">
                <label>${this._t("panel.floor_image")}</label>
                <input
                  type="text"
                  placeholder="/local/floorplan.png"
                  .value=${this._config.floorplan_image || ""}
                  @change=${(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    this._updateConfig("floorplan_image", val);
                    // Also create first floor entry
                    const floors = this._getFloors();
                    if (floors.length === 0) {
                      this._updateConfig("floors", [{
                        id: "floor_0",
                        name: "Floor 1",
                        image: val,
                        image_width: 20,
                        image_height: 15,
                      }]);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }

  private _renderMapToolbar() {
    const floor = this._getActiveFloor();
    const floors = this._getFloors();

    return html`
      <div class="map-toolbar">
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.floor_name")}</label>
          <input
            type="text"
            .value=${floor?.name || ""}
            @change=${(e: Event) => this._updateFloor(this._activeFloorIdx, "name", (e.target as HTMLInputElement).value)}
            style="max-width:150px;"
          />
        </div>
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.floor_image")}</label>
          <input
            type="text"
            placeholder="/local/floorplan.png"
            .value=${floor?.image || ""}
            @change=${(e: Event) => this._updateFloor(this._activeFloorIdx, "image", (e.target as HTMLInputElement).value)}
            style="max-width:250px;"
          />
        </div>
        ${this._calibrating ? html`
          ${this._calibrationPoints.length >= 2 ? html`
            <input
              type="number"
              step="0.1"
              placeholder="${this._t("panel.calibrate_distance")}"
              style="width:120px;padding:6px 10px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;"
              @change=${(e: Event) => { this._calibrationMeters = parseFloat((e.target as HTMLInputElement).value) || 0; }}
            />
            <button class="btn btn-small btn-primary" @click=${this._applyCalibration}>${this._t("panel.calibrate_apply")}</button>
          ` : html`
            <span style="font-size:12px;color:var(--text-secondary);">${this._t("panel.calibrate_help")}</span>
          `}
          <button class="btn btn-small btn-secondary" @click=${this._cancelCalibration}>${this._t("panel.calibrate_cancel")}</button>
        ` : html`
          <button class="btn btn-small btn-secondary" @click=${this._startCalibration}>${this._t("panel.calibrate")}</button>
        `}
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.width_m")}</label>
          <input type="number" step="0.1" .value=${String(floor?.image_width || "")} @change=${(e: Event) => this._updateFloor(this._activeFloorIdx, "image_width", parseFloat((e.target as HTMLInputElement).value))} style="width:80px;" />
        </div>
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.height_m")}</label>
          <input type="number" step="0.1" .value=${String(floor?.image_height || "")} @change=${(e: Event) => this._updateFloor(this._activeFloorIdx, "image_height", parseFloat((e.target as HTMLInputElement).value))} style="width:80px;" />
        </div>
        <button class="btn btn-small btn-secondary" @click=${this._addFloor}>
          ${this._t("panel.add_floor")}
        </button>
        ${floors.length > 1 ? html`
          <button class="btn btn-small btn-danger" @click=${() => this._removeFloor(this._activeFloorIdx)}>
            ${this._t("panel.remove_floor")}
          </button>
        ` : nothing}
      </div>
    `;
  }

  private _renderProxyToolbar() {
    return html`
      <div class="map-toolbar">
        <button class="btn btn-small btn-secondary" @click=${this._autoPlaceProxies}>
          ${this._t("panel.auto_place")}
        </button>
        <span style="font-size:11px;color:var(--text-secondary);">${this._t("panel.auto_place_help")}</span>
        <span style="flex:1;"></span>
        <span style="font-size:11px;color:var(--text-secondary);">${this._t("panel.calibrate_rssi_help")}</span>
      </div>
      ${this._calibWizardActive ? this._renderCalibWizardOverlay() : nothing}
    `;
  }

  private _renderCalibWizardOverlay() {
    const proxies = this._config.proxies || [];
    const proxy = this._calibWizardProxyIdx !== null ? proxies[this._calibWizardProxyIdx] : null;
    if (!proxy) return nothing;

    return html`
      <div class="calib-wizard-overlay">
        <div class="calib-wizard-card">
          <h4 style="margin:0 0 12px;">${this._t("panel.calibrate_rssi")}: ${proxy.name || proxy.entity_id}</h4>
          <p style="font-size:13px;color:var(--text-secondary);margin:0 0 12px;">
            ${this._t("panel.calibrate_stand")} <strong>${proxy.name || proxy.entity_id}</strong>
          </p>
          <div class="calib-wizard-row">
            <label>${this._t("panel.calibrate_distance_label")}</label>
            <input type="number" step="0.1" min="0.1" max="10" .value=${String(this._calibWizardDistance)}
              @change=${(e: Event) => {
                this._calibWizardDistance = parseFloat((e.target as HTMLInputElement).value) || 1.0;
              }}
              style="width:80px;padding:6px 10px;border:1px solid var(--divider-color);border-radius:6px;font-size:13px;"
            />
          </div>
          <div class="calib-wizard-rssi">
            <div style="font-size:12px;color:var(--text-secondary);">${this._t("panel.calibrate_sampling")}</div>
            <div style="font-size:28px;font-weight:700;color:var(--accent);margin:8px 0;">
              ${this._calibWizardRssi !== null ? `${this._calibWizardRssi} dBm` : "--"}
            </div>
            <div style="font-size:11px;color:var(--text-secondary);">
              ${this._calibWizardSamples.length} ${this._t("panel.calibrate_samples")}
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px;">
            <button class="btn btn-small btn-primary" @click=${this._confirmCalibration}
              ?disabled=${this._calibWizardRssi === null}>
              ${this._t("panel.calibrate_confirm")}
            </button>
            <button class="btn btn-small btn-secondary" @click=${this._stopCalibWizard}>
              ${this._t("panel.calibrate_cancel")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderZoneToolbar() {
    return html`
      <div class="map-toolbar">
        ${this._drawingZone ? html`
          ${this._drawingMode === "polygon" ? html`
            <button class="btn btn-small btn-primary" @click=${() => this._finishZone()}>
              ${this._t("panel.zone_finish")} (${this._drawingPoints.length} pts)
            </button>
          ` : html`
            <span style="font-size:12px;color:var(--text-secondary);">
              ${this._rectStart ? this._t("panel.zone_finish") : this._t("panel.calibrate_help")}
            </span>
          `}
          <button class="btn btn-small btn-secondary" @click=${this._cancelDrawing}>
            ${this._t("panel.zone_cancel")}
          </button>
        ` : html`
          <button class="btn btn-small btn-primary" @click=${() => this._startDrawingZone("rectangle")}>
            ${this._t("panel.zone_draw_rectangle")}
          </button>
          <button class="btn btn-small btn-secondary" @click=${() => this._startDrawingZone("polygon")}>
            ${this._t("panel.zone_draw_polygon")}
          </button>
          <span style="font-size:11px;color:var(--text-secondary);">${this._t("panel.zone_edit")}</span>
        `}
      </div>
    `;
  }

  private _renderZoneEditPanel() {
    const zones = this._config.zones || [];
    const zone = zones[this._editingZoneIdx!];
    if (!zone) return nothing;
    const idx = this._editingZoneIdx!;

    return html`
      <div class="zone-edit-panel">
        <h4>${this._t("panel.zone_editing")}: ${zone.name || `Zone ${idx + 1}`}</h4>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_name")}</label>
          <input type="text" .value=${zone.name || ""} @change=${(e: Event) => {
            const z = [...zones]; z[idx] = { ...z[idx], name: (e.target as HTMLInputElement).value };
            this._updateConfig("zones", z);
          }} />
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_color")}</label>
          <input type="color" .value=${zone.color || ZONE_COLORS[0]} @input=${(e: Event) => {
            const z = [...zones]; z[idx] = { ...z[idx], color: (e.target as HTMLInputElement).value };
            this._updateConfig("zones", z);
          }} />
          <label>${this._t("panel.zone_border_color")}</label>
          <input type="color" .value=${zone.border_color || zone.color || ZONE_COLORS[0]} @input=${(e: Event) => {
            const z = [...zones]; z[idx] = { ...z[idx], border_color: (e.target as HTMLInputElement).value };
            this._updateConfig("zones", z);
          }} />
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_opacity")}</label>
          <input type="range" min="0.05" max="0.8" step="0.05" .value=${String(zone.opacity || 0.3)} @input=${(e: Event) => {
            const z = [...zones]; z[idx] = { ...z[idx], opacity: parseFloat((e.target as HTMLInputElement).value) };
            this._updateConfig("zones", z);
          }} />
          <span style="font-size:11px;color:var(--text-secondary);min-width:30px;">${Math.round((zone.opacity || 0.3) * 100)}%</span>
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_show_label")}</label>
          <input type="checkbox" ?checked=${zone.show_label !== false} @change=${(e: Event) => {
            const z = [...zones]; z[idx] = { ...z[idx], show_label: (e.target as HTMLInputElement).checked };
            this._updateConfig("zones", z);
          }} />
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-small btn-primary" @click=${() => { this._editingZoneIdx = null; }}>
            ${this._t("panel.zone_done_editing")}
          </button>
          <button class="btn btn-small btn-danger" @click=${() => this._removeZone(idx)}>
            ${this._t("panel.remove_zone")}
          </button>
        </div>
      </div>
    `;
  }

  private _renderDoorToolbar() {
    const doors = this._config.doors || [];
    return html`
      <div class="map-toolbar">
        ${this._placingDoor ? html`
          <span style="font-size:12px;color:var(--accent);font-weight:600;">
            ${this._t("panel.door_click_to_place")}
          </span>
          <button class="btn btn-small btn-secondary" @click=${this._cancelPlacingDoor}>
            ${this._t("panel.cancel_placement")}
          </button>
        ` : html`
          <button class="btn btn-small btn-primary" @click=${() => this._startPlacingDoor("door")}>
            + ${this._t("panel.door_type_door")}
          </button>
          <button class="btn btn-small btn-secondary" @click=${() => this._startPlacingDoor("opening")}>
            + ${this._t("panel.door_type_opening")}
          </button>
          <button class="btn btn-small btn-secondary" @click=${() => this._startPlacingDoor("portal")}>
            + ${this._t("panel.door_type_portal")}
          </button>
          <span style="flex:1;"></span>
          <span style="font-size:11px;color:var(--text-secondary);">
            ${doors.length} ${this._t("panel.door_count")}
          </span>
        `}
      </div>
    `;
  }

  private _renderDoorEditPanel() {
    const doors = this._config.doors || [];
    const door = doors[this._editingDoorIdx!];
    if (!door) return nothing;
    const idx = this._editingDoorIdx!;
    const zones = this._config.zones || [];
    const floors = this._getFloors();

    // Get zone names for display
    const zoneA = zones.find((z) => z.id === door.zone_a);
    const zoneB = zones.find((z) => z.id === door.zone_b);

    return html`
      <div class="zone-edit-panel">
        <h4 style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">${door.type === "door" ? "\uD83D\uDEAA" : door.type === "portal" ? "\uD83E\uDE9C" : "\u25AF"}</span>
          ${this._t("panel.door_edit")}: ${door.name || `Door ${idx + 1}`}
        </h4>
        <div class="zone-edit-row">
          <label>${this._t("panel.door_name")}</label>
          <input type="text" .value=${door.name || ""} @change=${(e: Event) => {
            this._updateDoor(idx, "name", (e.target as HTMLInputElement).value);
          }} />
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.door_type")}</label>
          <select @change=${(e: Event) => {
            this._updateDoor(idx, "type", (e.target as HTMLSelectElement).value as DoorType);
          }}>
            <option value="door" ?selected=${door.type === "door"}>${this._t("panel.door_type_door")}</option>
            <option value="opening" ?selected=${door.type === "opening"}>${this._t("panel.door_type_opening")}</option>
            <option value="portal" ?selected=${door.type === "portal"}>${this._t("panel.door_type_portal")}</option>
          </select>
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.door_zone_a")}</label>
          <select @change=${(e: Event) => {
            this._updateDoor(idx, "zone_a", (e.target as HTMLSelectElement).value);
          }}>
            <option value="">-- Select --</option>
            ${zones.map((z) => html`
              <option value=${z.id} ?selected=${door.zone_a === z.id}>${z.name || z.id}</option>
            `)}
          </select>
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.door_zone_b")}</label>
          <select @change=${(e: Event) => {
            this._updateDoor(idx, "zone_b", (e.target as HTMLSelectElement).value);
          }}>
            <option value="">-- Select --</option>
            ${zones.map((z) => html`
              <option value=${z.id} ?selected=${door.zone_b === z.id}>${z.name || z.id}</option>
            `)}
          </select>
        </div>
        ${door.type === "portal" ? html`
          <div class="zone-edit-row">
            <label>${this._t("panel.door_portal_target")}</label>
            <select @change=${(e: Event) => {
              this._updateDoor(idx, "portal_target_floor", (e.target as HTMLSelectElement).value);
            }}>
              <option value="">-- Select --</option>
              ${floors.map((f) => html`
                <option value=${f.id} ?selected=${door.portal_target_floor === f.id}>${f.name || f.id}</option>
              `)}
            </select>
          </div>
        ` : nothing}
        <div style="font-size:11px;color:var(--text-secondary);margin:4px 0;">
          ${this._t("panel.door_connects")}: ${zoneA?.name || door.zone_a || "?"} \u2194 ${zoneB?.name || door.zone_b || "?"}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-small btn-primary" @click=${() => { this._editingDoorIdx = null; }}>
            ${this._t("panel.door_done_editing")}
          </button>
          <button class="btn btn-small btn-danger" @click=${() => this._removeDoor(idx)}>
            ${this._t("panel.remove_door")}
          </button>
        </div>
      </div>
    `;
  }

  private _renderDoorMarkers() {
    const doors = this._config.doors || [];
    const floor = this._getActiveFloor();
    const isDoorTab = this._activeTab === "doors";

    return doors.map((door, idx) => {
      if (floor && door.floor_id && door.floor_id !== floor.id) return nothing;

      const isEditing = this._editingDoorIdx === idx;
      const icon = door.type === "door" ? "\uD83D\uDEAA" : door.type === "portal" ? "\uD83E\uDE9C" : "\u25AF";
      const color = door.type === "portal" ? "#E040FB" : door.type === "door" ? "#FF9800" : "#78909C";

      return html`
        <div
          class="door-marker ${isEditing ? 'editing' : ''} ${isDoorTab ? 'clickable' : ''}"
          style="left: ${door.x}%; top: ${door.y}%; --door-color: ${color}; cursor: ${isDoorTab ? 'grab' : 'pointer'};"
          title="${door.name || `Door ${idx + 1}`}\n${door.type}"
          @mousedown=${isDoorTab ? (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); this._draggingDoor = idx; this._editingDoorIdx = idx; this.requestUpdate(); } : undefined}
        >
          <span class="door-icon">${icon}</span>
        </div>
        ${door.name ? html`
          <div class="door-label" style="left: ${door.x}%; top: ${door.y + 2}%;">
            ${door.name}
          </div>
        ` : nothing}
      `;
    });
  }

  private _renderProxyMarkers() {
    const proxies = this._config.proxies || [];
    const floor = this._getActiveFloor();

    return proxies.map((proxy, idx) => {
      if (!proxy.x && !proxy.y) return nothing;
      // Only show proxies on the active floor
      if (floor && proxy.floor_id && proxy.floor_id !== floor.id) return nothing;

      return html`
        <div
          class="proxy-marker"
          style="left: ${proxy.x}%; top: ${proxy.y}%;"
          @mousedown=${(e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); this._draggingProxy = idx; }}
          title="${proxy.name || proxy.entity_id}\n${proxy.entity_id}\nPosition: ${proxy.x.toFixed(1)}%, ${proxy.y.toFixed(1)}%"
        >${idx + 1}</div>
        <div class="proxy-label" style="left: ${proxy.x}%; top: ${proxy.y + 2}%;">
          ${proxy.name || proxy.entity_id.replace(/^.*\./, "").replace(/_/g, " ")}
        </div>
      `;
    });
  }

  private _renderLiveDeviceMarkers() {
    if (this._liveDevicePositions.size === 0) return nothing;

    const markers: any[] = [];
    this._liveDevicePositions.forEach((pos, deviceId) => {
      markers.push(html`
        <div
          class="live-device-marker"
          style="left: ${pos.x}%; top: ${pos.y}%; --device-color: ${pos.color};"
          title="${pos.name}\nConfidence: ${(pos.confidence * 100).toFixed(0)}%\nAccuracy: ${pos.accuracy.toFixed(1)}m"
        >
          <div class="live-device-pulse"></div>
          <div class="live-device-dot"></div>
        </div>
        <div class="live-device-label" style="left: ${pos.x}%; top: ${pos.y + 2.5}%;">
          ${pos.name}
        </div>
      `);
    });
    return markers;
  }

  private _renderZoneOverlays() {
    const zones = this._config.zones || [];
    const isZoneTab = this._activeTab === "zones";
    const floor = this._getActiveFloor();

    return zones.map((zone, idx) => {
      if (!zone.points || zone.points.length < 3) return nothing;
      // Only show zones on the active floor
      if (floor && zone.floor_id && zone.floor_id !== floor.id) return nothing;

      const pointsStr = zone.points.map((p) => `${p.x}%,${p.y}%`).join(" ");
      const cx = zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length;
      const cy = zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length;
      const isEditing = this._editingZoneIdx === idx;
      const rawOpacity = zone.opacity ?? 0.5;
      const opacity = Math.max(rawOpacity, 0.35);
      const highlightOpacity = isEditing ? Math.min(opacity + 0.25, 0.9) : opacity;
      // Use saturated fallback colors even for old zones with pastel colors
      const zoneColor = zone.color || ZONE_COLORS[idx % ZONE_COLORS.length];
      const borderColor = isEditing ? "#ffffff" : (zone.border_color || zoneColor);

      return html`
        <svg class="zone-polygon clickable" viewBox="0 0 100 100" preserveAspectRatio="none"
          @click=${(e: Event) => { e.stopPropagation(); this._editingZoneIdx = idx; this._activeTab = 'zones'; this.requestUpdate(); }}>
          <polygon
            points=${pointsStr}
            fill="${zoneColor}"
            fill-opacity="${highlightOpacity}"
            stroke="${borderColor}"
            stroke-width="${isEditing ? "0.8" : "0.5"}"
            stroke-opacity="0.8"
            stroke-dasharray="${isEditing ? "2,1" : "none"}"
          />
        </svg>
        ${zone.show_label !== false && zone.name ? html`
          <div class="zone-label-overlay"
            style="left: ${cx}%; top: ${cy}%; pointer-events: all; cursor: pointer; border: ${isEditing ? '2px solid var(--accent, #2196F3)' : 'none'};"
            @click=${(e: Event) => { e.stopPropagation(); this._editingZoneIdx = idx; this._activeTab = 'zones'; this.requestUpdate(); }}
            title="Click to edit zone"
          >
            ${zone.name}
          </div>
        ` : nothing}
      `;
    });
  }

  private _renderDrawingPoints() {
    if (!this._drawingZone || this._drawingMode !== "polygon") return nothing;
    return html`
      ${this._drawingPoints.map((p) => html`
        <div class="draw-point" style="left: ${p.x}%; top: ${p.y}%;"></div>
      `)}
      ${this._drawingPoints.length >= 2 ? html`
        <svg class="zone-polygon" viewBox="0 0 100 100" preserveAspectRatio="none">
          ${this._drawingPoints.map((p, i) => {
            if (i === 0) return nothing;
            const prev = this._drawingPoints[i - 1];
            return html`<line x1="${prev.x}" y1="${prev.y}" x2="${p.x}" y2="${p.y}" stroke="#FF5722" stroke-width="0.3" stroke-dasharray="1,0.5" />`;
          })}
        </svg>
      ` : nothing}
    `;
  }

  private _renderRectPreview() {
    if (!this._drawingZone || this._drawingMode !== "rectangle" || !this._rectStart) return nothing;

    const startHtml = html`<div class="draw-point" style="left: ${this._rectStart.x}%; top: ${this._rectStart.y}%;"></div>`;

    if (!this._rectPreview) return startHtml;

    const p1 = this._rectStart;
    const p2 = this._rectPreview;
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxX = Math.max(p1.x, p2.x);
    const maxY = Math.max(p1.y, p2.y);

    return html`
      ${startHtml}
      <svg class="rect-preview" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect
          x="${minX}" y="${minY}"
          width="${maxX - minX}" height="${maxY - minY}"
          fill="rgba(255, 87, 34, 0.15)"
          stroke="#FF5722"
          stroke-width="0.3"
          stroke-dasharray="1,0.5"
        />
      </svg>
    `;
  }

  private _renderCalibrationOverlay() {
    if (!this._calibrating || this._calibrationPoints.length === 0) return nothing;

    return html`
      ${this._calibrationPoints.map((p) => html`
        <div class="cal-point" style="left: ${p.x}%; top: ${p.y}%;"></div>
      `)}
      ${this._calibrationPoints.length >= 2 ? html`
        <svg class="cal-line" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            x1="${this._calibrationPoints[0].x}" y1="${this._calibrationPoints[0].y}"
            x2="${this._calibrationPoints[1].x}" y2="${this._calibrationPoints[1].y}"
            stroke="#FF9800" stroke-width="0.3" stroke-dasharray="1,1"
          />
        </svg>
      ` : nothing}
    `;
  }

  private _renderSettingsPanel() {
    return html`
      <div class="config-panel">
        <div class="config-section">
          <h3>${this._t("panel.tab_settings")}</h3>
          <div class="config-row">
            <label>${this._t("panel.card_title")}</label>
            <input type="text" .value=${this._config.card_title || ""} @change=${(e: Event) => this._updateConfig("card_title", (e.target as HTMLInputElement).value)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.floor_display")}</label>
            <select @change=${(e: Event) => this._updateConfig("floor_display_mode", (e.target as HTMLSelectElement).value)}>
              <option value="tabs" ?selected=${this._config.floor_display_mode !== "stacked"}>${this._t("panel.floor_tabs")}</option>
              <option value="stacked" ?selected=${this._config.floor_display_mode === "stacked"}>${this._t("panel.floor_stacked")}</option>
            </select>
          </div>
          <div class="config-row">
            <label>${this._t("panel.theme")}</label>
            <select @change=${(e: Event) => this._updateConfig("theme_mode", (e.target as HTMLSelectElement).value)}>
              <option value="auto" ?selected=${this._config.theme_mode !== "dark" && this._config.theme_mode !== "light"}>${this._t("panel.theme_auto")}</option>
              <option value="dark" ?selected=${this._config.theme_mode === "dark"}>${this._t("panel.theme_dark")}</option>
              <option value="light" ?selected=${this._config.theme_mode === "light"}>${this._t("panel.theme_light")}</option>
            </select>
          </div>
          <div class="config-row">
            <label>${this._t("panel.show_proxies")}</label>
            <input type="checkbox" ?checked=${this._config.show_proxies !== false} @change=${(e: Event) => this._updateConfig("show_proxies", (e.target as HTMLInputElement).checked)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.show_zones")}</label>
            <input type="checkbox" ?checked=${this._config.show_zones !== false} @change=${(e: Event) => this._updateConfig("show_zones", (e.target as HTMLInputElement).checked)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.show_zone_labels")}</label>
            <input type="checkbox" ?checked=${this._config.show_zone_labels !== false} @change=${(e: Event) => this._updateConfig("show_zone_labels", (e.target as HTMLInputElement).checked)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.show_doors")}</label>
            <input type="checkbox" ?checked=${this._config.show_doors !== false} @change=${(e: Event) => this._updateConfig("show_doors", (e.target as HTMLInputElement).checked)} />
          </div>
        </div>

        <!-- Gateway & Floor Override Settings -->
        <div class="config-section">
          <h3>${this._t("panel.gateway")}</h3>
          <div class="config-row">
            <label>${this._t("panel.gateway_timeout")}</label>
            <input type="number" min="5" max="300" .value=${String(this._config.gateway_timeout || 30)} @change=${(e: Event) => this._updateConfig("gateway_timeout", parseInt((e.target as HTMLInputElement).value))} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.floor_override_timeout")}</label>
            <input type="number" min="10" max="600" .value=${String(this._config.floor_override_timeout || 60)} @change=${(e: Event) => this._updateConfig("floor_override_timeout", parseInt((e.target as HTMLInputElement).value))} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.floor_override_min_proxies")}</label>
            <input type="number" min="1" max="10" .value=${String(this._config.floor_override_min_proxies || 2)} @change=${(e: Event) => this._updateConfig("floor_override_min_proxies", parseInt((e.target as HTMLInputElement).value))} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.zone_override_timeout")}</label>
            <input type="number" min="10" max="300" .value=${String(this._config.zone_override_timeout || 45)} @change=${(e: Event) => this._updateConfig("zone_override_timeout", parseInt((e.target as HTMLInputElement).value))} />
          </div>
        </div>

        <div class="config-section">
          <h3>${this._t("panel.history_enabled")}</h3>
          <div class="config-row">
            <label>${this._t("panel.history_enabled")}</label>
            <input type="checkbox" ?checked=${this._config.history_enabled !== false} @change=${(e: Event) => this._updateConfig("history_enabled", (e.target as HTMLInputElement).checked)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.history_retention")}</label>
            <input type="number" min="1" max="1440" .value=${String(this._config.history_retention || 60)} @change=${(e: Event) => this._updateConfig("history_retention", parseInt((e.target as HTMLInputElement).value))} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.update_interval")}</label>
            <input type="number" min="1" max="60" .value=${String(this._config.update_interval || 2)} @change=${(e: Event) => this._updateConfig("update_interval", parseInt((e.target as HTMLInputElement).value))} />
          </div>
        </div>

        <!-- Proxy list -->
        <div class="config-section">
          <h3>${this._t("panel.tab_proxies")} (${(this._config.proxies || []).length})</h3>
          <div class="item-list">
            ${(this._config.proxies || []).map((proxy, idx) => {
              const areaName = this._getProxyAreaName(proxy);
              const isCalibrated = proxy.calibration?.ref_rssi !== undefined;
              const calibAge = proxy.calibration?.calibrated_at
                ? Math.round((Date.now() - proxy.calibration.calibrated_at) / 3600000)
                : null;

              return html`
                <div class="item-card" style="flex-wrap:wrap;">
                  <div class="item-color" style="background: ${proxy.is_gateway ? '#FF9800' : '#2196F3'};"></div>
                  <div class="item-info">
                    <div class="item-name">${proxy.name || proxy.entity_id}</div>
                    <div class="item-detail">
                      ${proxy.entity_id} · ${proxy.x > 0 ? this._t("panel.placed") : this._t("panel.not_placed")}
                      ${areaName ? html` · <span style="color:var(--accent);">${areaName}</span>` : nothing}
                    </div>
                    ${isCalibrated ? html`
                      <div class="item-detail" style="color:#4CAF50;">
                        ${this._t("panel.calibrated")} (${proxy.calibration!.ref_rssi} dBm @ ${proxy.calibration!.ref_distance}m)
                        ${calibAge !== null ? html` · ${calibAge}h ago` : nothing}
                      </div>
                    ` : nothing}
                  </div>
                  <input type="text" placeholder="${this._t("panel.proxy_name")}" .value=${proxy.name || ""} @change=${(e: Event) => {
                    const proxies = [...(this._config.proxies || [])];
                    proxies[idx] = { ...proxies[idx], name: (e.target as HTMLInputElement).value };
                    this._updateConfig("proxies", proxies);
                  }} style="width:100px;padding:4px 8px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;" />
                  <button class="btn btn-small ${proxy.is_gateway ? 'btn-primary' : 'btn-secondary'}" @click=${() => this._toggleProxyGateway(idx)}
                    title="${this._t('panel.gateway')}">
                    ${proxy.is_gateway ? '✓ GW' : 'GW'}
                  </button>
                  <button class="btn btn-small btn-secondary" @click=${() => this._startCalibWizard(idx)}
                    title="${this._t('panel.calibrate_rssi')}">
                    ${isCalibrated ? '✓ Cal' : 'Cal'}
                  </button>
                  ${isCalibrated ? html`
                    <button class="btn btn-small btn-danger" @click=${() => this._resetProxyCalibration(idx)}
                      title="${this._t('panel.calibrate_reset')}">×</button>
                  ` : nothing}
                  <button class="btn btn-danger btn-small" @click=${() => this._removeProxy(idx)}>${this._t("panel.remove")}</button>

                  <!-- Gateway config (expanded when is_gateway) -->
                  ${proxy.is_gateway ? html`
                    <div style="width:100%;padding:8px 0 0 28px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                      <label style="font-size:11px;color:var(--text-secondary);">${this._t("panel.gateway_type")}:</label>
                      <select style="padding:3px 6px;border:1px solid var(--divider-color);border-radius:4px;font-size:11px;"
                        @change=${(e: Event) => this._updateProxyGatewayType(idx, (e.target as HTMLSelectElement).value as GatewayType)}>
                        ${GATEWAY_TYPES.map((gt) => html`
                          <option value=${gt.value} ?selected=${proxy.gateway_type === gt.value}>
                            ${gt.icon} ${this._t(`panel.gateway_${gt.value}`)}
                          </option>
                        `)}
                      </select>
                      <label style="font-size:11px;color:var(--text-secondary);margin-left:8px;">${this._t("panel.gateway_connects")}:</label>
                      ${this._getFloors().map((floor) => html`
                        <label style="font-size:11px;display:flex;align-items:center;gap:3px;cursor:pointer;">
                          <input type="checkbox"
                            ?checked=${(proxy.gateway_connects || []).includes(floor.id)}
                            @change=${() => this._toggleGatewayFloor(idx, floor.id)}
                          />
                          ${floor.name}
                        </label>
                      `)}
                    </div>
                  ` : nothing}
                </div>
              `;
            })}
          </div>
        </div>

        <!-- Device list -->
        <div class="config-section">
          <h3>${this._t("panel.tab_devices")} (${(this._config.tracked_devices || []).length})</h3>
          <div class="item-list">
            ${(this._config.tracked_devices || []).map((device, idx) => html`
              <div class="item-card">
                <div class="item-color" style="background: ${device.color || DEVICE_COLORS[0]};"></div>
                <div class="item-info">
                  <div class="item-name">${device.name || device.entity_prefix}</div>
                  <div class="item-detail">${device.entity_prefix}</div>
                </div>
                <input type="text" placeholder="${this._t("panel.device_name")}" .value=${device.name || ""} @change=${(e: Event) => {
                  const devices = [...(this._config.tracked_devices || [])];
                  devices[idx] = { ...devices[idx], name: (e.target as HTMLInputElement).value };
                  this._updateConfig("tracked_devices", devices);
                }} style="width:100px;padding:4px 8px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;" />
                <input type="color" .value=${device.color || DEVICE_COLORS[0]} @change=${(e: Event) => {
                  const devices = [...(this._config.tracked_devices || [])];
                  devices[idx] = { ...devices[idx], color: (e.target as HTMLInputElement).value };
                  this._updateConfig("tracked_devices", devices);
                }} />
                <button class="btn btn-danger btn-small" @click=${() => this._removeDevice(idx)}>${this._t("panel.remove")}</button>
              </div>
            `)}
          </div>
        </div>

        <!-- Zone list -->
        <div class="config-section">
          <h3>${this._t("panel.tab_zones")} (${(this._config.zones || []).length})</h3>
          <div class="item-list">
            ${(this._config.zones || []).map((zone, idx) => html`
              <div class="item-card">
                <div class="item-color" style="background: ${zone.color || ZONE_COLORS[0]};"></div>
                <div class="item-info">
                  <div class="item-name">${zone.name || `Zone ${idx + 1}`}</div>
                  <div class="item-detail">${zone.points?.length || 0} points</div>
                </div>
                <input type="text" placeholder="${this._t("panel.zone_name")}" .value=${zone.name || ""} @change=${(e: Event) => {
                  const zones = [...(this._config.zones || [])];
                  zones[idx] = { ...zones[idx], name: (e.target as HTMLInputElement).value };
                  this._updateConfig("zones", zones);
                }} style="width:100px;padding:4px 8px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;" />
                <input type="color" .value=${zone.color || ZONE_COLORS[0]} @change=${(e: Event) => {
                  const zones = [...(this._config.zones || [])];
                  zones[idx] = { ...zones[idx], color: (e.target as HTMLInputElement).value };
                  this._updateConfig("zones", zones);
                }} />
                <button class="btn btn-danger btn-small" @click=${() => this._removeZone(idx)}>${this._t("panel.remove")}</button>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }
}
