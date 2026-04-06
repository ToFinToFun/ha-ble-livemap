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
  FloorConfig,
  ZoneConfig,
  DoorConfig,
  DoorType,
  DeviceState,
  DEFAULT_CONFIG,
  DEVICE_COLORS,
  DEVICE_ICONS,
  ZONE_COLORS,
  GATEWAY_TYPES,
  GatewayType,
  ProxyCalibration,
  CalibrationSample,
  CalibrationHealth,
  CalibrationHealthLevel,
  WizardPoint,
  WizardState,
  DOOR_TYPES,
} from "./types";
import { CARD_VERSION, CARD_NAME } from "./const";
import { localize } from "./localize/localize";
import { TrackingEngine, ProxyDebugInfo } from "./tracking-engine";
import {
  extractProxySlug,
  discoverProxySlugs,
  discoverTrackableDevices,
  getPolygonCentroid,
  isPointInPolygon,
} from "./bermuda-utils";

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

  // Live device tracking via shared TrackingEngine
  private _trackingEngine: TrackingEngine | null = null;
  @state() private _trackedDevices: DeviceState[] = [];
  @state() private _liveDebugInfo: ProxyDebugInfo[] = [];
  @state() private _showDebugPanel: boolean = false;
  /** Currently selected device for debug visualization (entity_prefix) */
  @state() private _debugFollowDevice: string = "";
  /** "I Am Here" calibration mode */
  @state() private _calibrationMode: boolean = false;
  @state() private _calibrationToast: string = "";
  /** Per-proxy calibration health computed after auto-calibrate */
  @state() private _calibrationHealthMap: Map<string, CalibrationHealth> = new Map();

  // ─── Guided Calibration Wizard ─────────────────────────────
  @state() private _wizardActive = false;
  @state() private _wizardStep = 0;
  @state() private _wizardPoints: WizardPoint[] = [];
  @state() private _wizardState: WizardState = 'idle';
  @state() private _wizardStableProxies = 0;
  @state() private _wizardTotalProxies = 0;
  @state() private _wizardMeasureProgress = 0; // 0-100
  private _wizardMeasureTimer: number | null = null;
  private _wizardRssiBuffer: Map<string, number[]> = new Map(); // proxy → rolling RSSI window
  private _wizardMeasureStart = 0;
  private static readonly WIZARD_MEASURE_MIN_MS = 3000; // min 3s measuring
  private static readonly WIZARD_MEASURE_MAX_MS = 12000; // max 12s before auto-accept
  private static readonly WIZARD_STABILITY_THRESHOLD = 3.5; // dBm std dev
  private static readonly WIZARD_WINDOW_SIZE = 6; // rolling window size

  private _liveTrackingTimer: number | null = null;
  private _dragStarted = false;

  // Full area registry for zone-area dropdown (area_id → {area_id, name})
  @state() private _fullAreaRegistry: Array<{area_id: string; name: string}> = [];

  // ─── Lifecycle ──────────────────────────────────────────────

  connectedCallback(): void {
    super.connectedCallback();
    this._loadConfig();
    this._ensureTrackingEngine();
    this._startLiveTracking();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopLiveTracking();
    this._trackingEngine?.destroy();
    this._trackingEngine = null;
    this._removeGlobalDragListeners();
    if (this._calibWizardTimer) {
      clearInterval(this._calibWizardTimer);
      this._calibWizardTimer = null;
    }
  }

  private _ensureTrackingEngine(): void {
    if (!this._trackingEngine) {
      this._trackingEngine = new TrackingEngine({
        enableHistory: this._config.history_enabled ?? false,
        historyRetention: this._config.history_retention ?? 60,
        historyTrailLength: this._config.history_trail_length ?? 50,
      });
    }
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
        const fullAreas: Array<{area_id: string; name: string}> = [];
        for (const area of areas as any[]) {
          this._areaRegistryCache.set(area.area_id, area.name);
          fullAreas.push({ area_id: area.area_id, name: area.name });
        }
        this._fullAreaRegistry = fullAreas.sort((a, b) => a.name.localeCompare(b.name));

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
        "panel.zone_ha_area": "HA Area",
        "panel.zone_no_area": "— No area linked —",
        "panel.zone_area_linked": "Linked to HA",
        "panel.zone_create_in_ha": "Create in HA",
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
        "panel.zone_ha_area": "HA-område",
        "panel.zone_no_area": "— Inget område kopplat —",
        "panel.zone_area_linked": "Kopplat till HA",
        "panel.zone_create_in_ha": "Skapa i HA",
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
   * Uses shared utility for primary discovery, then enriches with device registry data.
   */
  private _discoverBLEProxies(): Map<string, { id: string; friendly_name: string; area: string; mac: string; entity_ids: string[] }> {
    // Primary discovery via shared utility
    const rawProxies = discoverProxySlugs(this.hass);
    const proxyMap = new Map<string, { id: string; friendly_name: string; area: string; mac: string; entity_ids: string[] }>();

    for (const [slug, info] of rawProxies) {
      proxyMap.set(slug, {
        id: slug,
        friendly_name: info.friendlyName,
        area: "",
        mac: "",
        entity_ids: info.entityIds,
      });
    }

    // Enrich proxy entries with device registry data (friendly names, areas, MACs)
    if (this._deviceRegistryCache && proxyMap.size > 0) {
      for (const device of this._deviceRegistryCache) {
        const deviceName = device.name_by_user || device.name || "";
        if (!deviceName) continue;

        const slug = deviceName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

        const matchingProxy = proxyMap.get(slug);
        if (!matchingProxy) continue;

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

  /**
   * Create a new HA Area from a zone's name, then link the zone to it.
   */
  private async _createHaAreaFromZone(idx: number): Promise<void> {
    if (!this.hass) return;
    const zones = this._config.zones || [];
    const zone = zones[idx];
    if (!zone?.name) return;

    try {
      const result = await this.hass.callWS({
        type: "config/area_registry/create",
        name: zone.name,
      }) as any;

      if (result?.area_id) {
        // Link the zone to the newly created area
        const z = [...zones];
        z[idx] = { ...z[idx], ha_area_id: result.area_id };
        this._updateConfig("zones", z);

        // Refresh area registry cache
        this._registryCacheStamp = 0;
        await this._ensureRegistryLoaded();
      }
    } catch (e) {
      console.error("[BLE LiveMap Panel] Failed to create HA Area:", e);
    }
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
    // If we just finished a drag, don't handle as click
    if (this._dragStarted) {
      this._dragStarted = false;
      return;
    }

    const coords = this._getMapCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    // Dimension calibration mode
    if (this._calibrating) {
      this._calibrationPoints = [...this._calibrationPoints, { x, y }];
      if (this._calibrationPoints.length >= 2) {
        this.requestUpdate();
      }
      return;
    }

    // "I Am Here" fingerprint calibration mode
    if (this._calibrationMode && this._debugFollowDevice) {
      this._recordCalibrationSample(x, y);
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

  }

  /**
   * Mousedown on map-inner: detect if we're starting a proxy or door drag.
   * All drag detection happens here (not on individual markers).
   */
  private _handleMapMouseDown(e: MouseEvent): void {
    const coords = this._getMapCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    // Check proxies
    const proxies = this._config.proxies || [];
    for (let i = 0; i < proxies.length; i++) {
      if (Math.abs(x - proxies[i].x) < 3 && Math.abs(y - proxies[i].y) < 3) {
        this._draggingProxy = i;
        this._dragStarted = false;
        e.preventDefault();
        return;
      }
    }

    // Check doors (only in doors tab)
    if (this._activeTab === "doors") {
      const doors = this._config.doors || [];
      for (let i = 0; i < doors.length; i++) {
        const dx = x - doors[i].x;
        const dy = y - doors[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < 4) {
          this._draggingDoor = i;
          this._editingDoorIdx = i;
          this._dragStarted = false;
          e.preventDefault();
          this.requestUpdate();
          return;
        }
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
      this._dragStarted = true;
      const coords = this._getMapCoords(e);
      if (coords) {
        const proxies = [...(this._config.proxies || [])];
        if (proxies[this._draggingProxy]) {
          proxies[this._draggingProxy] = { ...proxies[this._draggingProxy], x: Math.max(0, Math.min(100, coords.x)), y: Math.max(0, Math.min(100, coords.y)) };
          this._config = { ...this._config, proxies };
          this._saveConfigLocal();
          this.requestUpdate();
        }
      }
      return;
    }

    // Door dragging
    if (this._draggingDoor !== null) {
      e.preventDefault();
      this._dragStarted = true;
      const coords = this._getMapCoords(e);
      if (coords) {
        const doors = [...(this._config.doors || [])];
        if (doors[this._draggingDoor]) {
          doors[this._draggingDoor] = { ...doors[this._draggingDoor], x: Math.max(0, Math.min(100, coords.x)), y: Math.max(0, Math.min(100, coords.y)) };
          this._config = { ...this._config, doors };
          this._saveConfigLocal();
          this.requestUpdate();
        }
      }
      return;
    }
  }

  private _handleMapMouseUp(): void {
    if (this._draggingProxy !== null) {
      this._draggingProxy = null;
      this._removeGlobalDragListeners();
    }
    if (this._draggingDoor !== null) {
      this._draggingDoor = null;
      this._removeGlobalDragListeners();
    }
  }

  private _globalMouseUpHandler = () => this._handleMapMouseUp();
  private _globalMouseMoveHandler = (e: MouseEvent) => this._handleMapMouseMove(e);

  private _addGlobalDragListeners(): void {
    document.addEventListener("mouseup", this._globalMouseUpHandler);
    document.addEventListener("mousemove", this._globalMouseMoveHandler);
  }

  private _removeGlobalDragListeners(): void {
    document.removeEventListener("mouseup", this._globalMouseUpHandler);
    document.removeEventListener("mousemove", this._globalMouseMoveHandler);
  }

  // ─── Live Device Tracking (via shared TrackingEngine) ──────

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
   * Update live device positions using the shared TrackingEngine.
   * This ensures panel and card produce identical tracking results.
   */
  private _updateLiveDevices(): void {
    if (!this.hass?.states || !this._trackingEngine) return;
    this._ensureTrackingEngine();

    // Delegate all tracking to the shared engine
    this._trackedDevices = this._trackingEngine!.update(this.hass, this._config);

    // Get debug info for the selected device (or first device as fallback)
    this._liveDebugInfo = this._trackingEngine!.getDebugInfo(this._debugFollowDevice || undefined);

    // Auto-select first device if none selected and devices exist
    if (!this._debugFollowDevice && this._trackedDevices.length > 0) {
      this._debugFollowDevice = this._trackedDevices[0].device_id;
    }
  }

  // ─── Zone Helpers ─────────────────────────────────────────

  private _isPointInZone(x: number, y: number, zone: ZoneConfig): boolean {
    return isPointInPolygon(x, y, zone.points || []);
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

    // Extract proxy slug from entity_id using shared utility
    const proxySlug = extractProxySlug(proxy.entity_id);

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

  // ─── Self-Calibration ("I Am Here" + Auto-Learn) ──────────────

  /**
   * Record a calibration fingerprint sample at the clicked position.
   * Captures the current RSSI from every visible proxy for the followed device.
   */
  private _recordCalibrationSample(x: number, y: number): void {
    if (!this._debugFollowDevice || !this.hass) return;

    const floor = this._getActiveFloor();
    const floorId = floor?.id || "default";

    // Collect current RSSI readings from all proxies for this device
    const readings: { [proxyId: string]: number } = {};
    for (const info of this._liveDebugInfo) {
      if (info.rssi !== null && info.distance !== null) {
        readings[info.proxyId] = info.rssi;
      }
    }

    if (Object.keys(readings).length === 0) {
      this._calibrationToast = "No RSSI readings available!";
      setTimeout(() => { this._calibrationToast = ""; }, 3000);
      return;
    }

    const sample: CalibrationSample = {
      id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x,
      y,
      floor_id: floorId,
      timestamp: Date.now(),
      readings,
      device_id: this._debugFollowDevice,
    };

    const samples = [...(this._config.calibration_samples || []), sample];
    this._updateConfig("calibration_samples", samples);

    this._calibrationToast = `\u2705 Sample #${samples.length} recorded (${Object.keys(readings).length} proxies)`;
    setTimeout(() => { this._calibrationToast = ""; }, 3000);

    // Continuous learning: auto-recalibrate if enabled and enough samples
    if (this._config.continuous_learning && samples.length >= 3) {
      setTimeout(() => this._autoCalibrate(), 500);
    }
  }

  /**
   * Auto-calibrate all proxies using collected fingerprint samples.
   *
   * For each proxy, fits the log-distance path-loss model:
   *   RSSI = ref_rssi - 10 * n * log10(d / ref_dist)
   *
   * Using least-squares regression on all samples where that proxy had a reading.
   * Also computes R², detects outliers, and optionally syncs to Bermuda.
   */
  private _autoCalibrate(): void {
    const allSamples = this._config.calibration_samples || [];
    // Reset outlier flags
    const samples = allSamples.map(s => ({ ...s, is_outlier: false }));
    if (samples.length < 2) {
      this._calibrationToast = "Need at least 2 samples to calibrate";
      setTimeout(() => { this._calibrationToast = ""; }, 3000);
      return;
    }

    const proxies = [...(this._config.proxies || [])];
    const floor = this._getActiveFloor();
    const imageWidth = floor?.image_width || 20;
    const imageHeight = floor?.image_height || 15;
    let calibratedCount = 0;
    const healthMap = new Map<string, CalibrationHealth>();

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      if (!proxy.x && !proxy.y) continue;

      const proxySlug = proxy.entity_id
        .replace(/^ble_proxy_/, "")
        .replace(/^bermuda_proxy_/, "")
        .replace(/^.*\./, "")
        .replace(/_proxy$/, "");

      // Collect all samples that have a reading for this proxy
      const dataPoints: { distance: number; rssi: number; sampleIdx: number }[] = [];

      for (let si = 0; si < samples.length; si++) {
        const sample = samples[si];
        const rssi = sample.readings[proxySlug];
        if (rssi === undefined) continue;
        if (sample.floor_id && proxy.floor_id && sample.floor_id !== proxy.floor_id) continue;

        const dx = ((sample.x - proxy.x) / 100) * imageWidth;
        const dy = ((sample.y - proxy.y) / 100) * imageHeight;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) {
          dataPoints.push({ distance, rssi, sampleIdx: si });
        }
      }

      if (dataPoints.length < 2) {
        healthMap.set(proxy.entity_id, {
          level: dataPoints.length === 0 ? "uncalibrated" : "poor",
          r_squared: 0,
          sample_count: dataPoints.length,
          outlier_count: 0,
          message: dataPoints.length === 0
            ? "No samples for this proxy"
            : "Need at least 2 samples",
        });
        continue;
      }

      // --- Fit log-distance model: RSSI = A + B * log10(d) ---
      let sumLogD = 0, sumRssi = 0, sumLogD2 = 0, sumLogDRssi = 0;
      let count = 0;

      for (const dp of dataPoints) {
        const logD = Math.log10(dp.distance);
        sumLogD += logD;
        sumRssi += dp.rssi;
        sumLogD2 += logD * logD;
        sumLogDRssi += logD * dp.rssi;
        count++;
      }

      const denom = count * sumLogD2 - sumLogD * sumLogD;
      if (Math.abs(denom) < 1e-10) continue;

      const B = (count * sumLogDRssi - sumLogD * sumRssi) / denom;
      const A = (sumRssi - B * sumLogD) / count;
      const n = -B / 10;

      // --- Compute R² ---
      const meanRssi = sumRssi / count;
      let ssTot = 0, ssRes = 0;
      const residuals: { idx: number; residual: number }[] = [];

      for (const dp of dataPoints) {
        const predicted = A + B * Math.log10(dp.distance);
        const res = dp.rssi - predicted;
        ssRes += res * res;
        ssTot += (dp.rssi - meanRssi) * (dp.rssi - meanRssi);
        residuals.push({ idx: dp.sampleIdx, residual: Math.abs(res) });
      }

      const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

      // --- Outlier detection: flag samples with residual > 2× stddev ---
      const stdRes = Math.sqrt(ssRes / count);
      let outlierCount = 0;
      for (const r of residuals) {
        if (r.residual > 2 * stdRes && stdRes > 2) {
          samples[r.idx] = { ...samples[r.idx], is_outlier: true };
          outlierCount++;
        }
      }

      // --- Sanity check ---
      if (n < 1.0 || n > 6.0 || isNaN(n)) {
        healthMap.set(proxy.entity_id, {
          level: "poor",
          r_squared: rSquared,
          sample_count: count,
          outlier_count: outlierCount,
          message: `Path-loss exponent out of range (n=${n.toFixed(1)}). Samples may be contradictory.`,
        });
        continue;
      }

      const refRssi = Math.round(A);
      if (refRssi > -20 || refRssi < -95) {
        healthMap.set(proxy.entity_id, {
          level: "poor",
          r_squared: rSquared,
          sample_count: count,
          outlier_count: outlierCount,
          message: `Ref RSSI out of range (${refRssi} dBm). Check sample positions.`,
        });
        continue;
      }

      // --- Determine health level ---
      let level: CalibrationHealthLevel;
      let message: string;
      if (rSquared >= 0.85 && count >= 5) {
        level = "excellent";
        message = `Excellent fit (R²=${rSquared.toFixed(2)}, ${count} samples)`;
      } else if (rSquared >= 0.65 && count >= 3) {
        level = "good";
        message = `Good fit (R²=${rSquared.toFixed(2)}, ${count} samples)`;
      } else if (rSquared >= 0.4) {
        level = "fair";
        message = `Fair fit (R²=${rSquared.toFixed(2)}). More samples at varied distances would help.`;
      } else {
        level = "poor";
        message = `Poor fit (R²=${rSquared.toFixed(2)}). Samples may be contradictory or noisy.`;
      }
      if (outlierCount > 0) {
        message += ` ${outlierCount} outlier(s) flagged.`;
      }

      healthMap.set(proxy.entity_id, {
        level,
        r_squared: rSquared,
        sample_count: count,
        outlier_count: outlierCount,
        message,
      });

      proxies[i] = {
        ...proxies[i],
        calibration: {
          ...(proxies[i].calibration || {} as ProxyCalibration),
          ref_rssi: refRssi,
          ref_distance: 1.0,
          attenuation: Math.round(n * 100) / 100,
          calibrated_at: Date.now(),
          r_squared: Math.round(rSquared * 1000) / 1000,
          sample_count: count,
        },
      };
      calibratedCount++;
    }

    this._calibrationHealthMap = healthMap;

    if (calibratedCount > 0) {
      this._updateConfig("proxies", proxies);
      // Save updated outlier flags
      this._updateConfig("calibration_samples", samples);
      this._calibrationToast = `\u2705 Calibrated ${calibratedCount} proxies (R\u00b2 avg: ${this._avgR2(healthMap)})`;

      // Bermuda sync if enabled
      if (this._config.bermuda_sync_enabled) {
        this._syncToBermuda(proxies);
      }
    } else {
      this._calibrationToast = "\u26a0 Could not calibrate any proxies (need more diverse samples)";
    }
    setTimeout(() => { this._calibrationToast = ""; }, 6000);
  }

  /** Compute average R² from health map */
  private _avgR2(healthMap: Map<string, CalibrationHealth>): string {
    let sum = 0, count = 0;
    for (const h of healthMap.values()) {
      if (h.r_squared > 0) { sum += h.r_squared; count++; }
    }
    return count > 0 ? (sum / count).toFixed(2) : "N/A";
  }

  /**
   * Push learned ref_rssi to Bermuda's per-device Calibration Ref Power entities.
   * Bermuda has number.bermuda_<device_id>_calibration_ref_power_at_1m_0_for_default
   * for each tracked device. We compute a weighted average ref_power from our
   * per-proxy calibrations and push it.
   */
  private async _syncToBermuda(proxies: ProxyConfig[]): Promise<void> {
    if (!this.hass) return;

    // Collect all calibrated ref_rssi values
    const calibratedProxies = proxies.filter(p => p.calibration?.ref_rssi && p.calibration.calibrated_at);
    if (calibratedProxies.length === 0) return;

    // Compute weighted average ref_rssi (weighted by R²)
    let weightedSum = 0, weightTotal = 0;
    for (const p of calibratedProxies) {
      const weight = p.calibration!.r_squared || 0.5;
      weightedSum += p.calibration!.ref_rssi * weight;
      weightTotal += weight;
    }
    const avgRefPower = Math.round(weightedSum / weightTotal);

    // Find Bermuda number entities for tracked devices
    const devices = this._config.tracked_devices || [];
    let syncCount = 0;

    for (const device of devices) {
      // Find the Bermuda calibration number entity
      const prefix = device.entity_prefix || "";
      // Extract the bermuda device slug from entity_prefix
      // e.g. "sensor.bermuda_3959c5fb..." → "bermuda_3959c5fb..."
      const match = prefix.match(/sensor\.(bermuda_[^_]+.*?)_/);
      if (!match) continue;

      // Search for the number entity
      const numberEntityBase = `number.${match[1]}`;
      const candidates = Object.keys(this.hass.states).filter(
        eid => eid.startsWith(numberEntityBase) && eid.includes("calibration_ref_power")
      );

      for (const entityId of candidates) {
        try {
          await this.hass.callService("number", "set_value", {
            entity_id: entityId,
            value: avgRefPower,
          });
          syncCount++;
        } catch (e) {
          console.warn(`[BLE Livemap] Failed to sync to Bermuda entity ${entityId}:`, e);
        }
      }
    }

    if (syncCount > 0) {
      this._calibrationToast += ` | Synced ref_power=${avgRefPower} to ${syncCount} Bermuda device(s)`;
    }
  }

  /**
   * Remove a specific calibration sample by ID.
   */
  private _removeCalibrationSample(sampleId: string): void {
    const samples = (this._config.calibration_samples || []).filter(s => s.id !== sampleId);
    this._updateConfig("calibration_samples", samples);
    this._calibrationToast = "Sample removed";
    setTimeout(() => { this._calibrationToast = ""; }, 2000);
  }

  /**
   * Remove all outlier-flagged samples.
   */
  private _removeOutlierSamples(): void {
    const samples = (this._config.calibration_samples || []).filter(s => !s.is_outlier);
    const removed = (this._config.calibration_samples || []).length - samples.length;
    this._updateConfig("calibration_samples", samples);
    this._calibrationToast = `Removed ${removed} outlier sample(s)`;
    setTimeout(() => { this._calibrationToast = ""; }, 3000);
  }

  /**
   * Clear all calibration samples.
   */
  private _clearCalibrationSamples(): void {
    this._updateConfig("calibration_samples", []);
    this._calibrationHealthMap = new Map();
    this._calibrationToast = "All calibration samples cleared";
    setTimeout(() => { this._calibrationToast = ""; }, 3000);
  }

  /**
   * Update distance_offset for a specific proxy.
   */
  private _updateProxyDistanceOffset(proxyIdx: number, offset: number): void {
    const proxies = [...(this._config.proxies || [])];
    if (!proxies[proxyIdx]) return;

    proxies[proxyIdx] = {
      ...proxies[proxyIdx],
      calibration: {
        ...(proxies[proxyIdx].calibration || { ref_rssi: 0, ref_distance: 1.0 } as ProxyCalibration),
        distance_offset: offset,
      },
    };
    this._updateConfig("proxies", proxies);
  }

  // ─── Guided Calibration Wizard Methods ─────────────────────

  /**
   * Start the guided calibration wizard.
   * Generates suggested measurement points and begins the flow.
   */
  private _wizardStart(): void {
    if (!this._debugFollowDevice) {
      this._calibrationToast = "Select a device to follow first";
      setTimeout(() => { this._calibrationToast = ""; }, 3000);
      return;
    }

    // Enable continuous learning and Bermuda sync automatically
    if (!this._config.continuous_learning) {
      this._updateConfig("continuous_learning", true);
    }
    if (!this._config.bermuda_sync_enabled) {
      this._updateConfig("bermuda_sync_enabled", true);
    }

    const points = this._wizardGeneratePoints();
    if (points.length === 0) {
      this._calibrationToast = "No proxies placed on the map. Place proxies first.";
      setTimeout(() => { this._calibrationToast = ""; }, 3000);
      return;
    }

    this._wizardActive = true;
    this._wizardPoints = points;
    this._wizardStep = 0;
    this._wizardState = 'suggesting';
    this._calibrationMode = false; // disable manual mode

    // Mark first point as active
    this._wizardPoints = this._wizardPoints.map((p, i) => ({
      ...p,
      status: i === 0 ? 'active' as const : 'pending' as const,
    }));
  }

  /**
   * Stop the wizard.
   */
  private _wizardStop(): void {
    if (this._wizardMeasureTimer) {
      clearInterval(this._wizardMeasureTimer);
      this._wizardMeasureTimer = null;
    }
    this._wizardActive = false;
    this._wizardState = 'idle';
    this._wizardPoints = [];
    this._wizardStep = 0;
    this._wizardRssiBuffer.clear();
  }

  /**
   * User confirms they are at the suggested point.
   * Starts the auto-measurement phase.
   */
  private _wizardConfirmPosition(): void {
    if (this._wizardState !== 'suggesting') return;

    this._wizardState = 'measuring';
    this._wizardRssiBuffer.clear();
    this._wizardMeasureStart = Date.now();
    this._wizardStableProxies = 0;
    this._wizardTotalProxies = 0;
    this._wizardMeasureProgress = 0;

    // Update point status
    this._wizardPoints = this._wizardPoints.map((p, i) => ({
      ...p,
      status: i === this._wizardStep ? 'measuring' as const : p.status,
    }));

    // Start measurement timer (every 500ms)
    this._wizardMeasureTimer = window.setInterval(() => {
      this._wizardMeasureTick();
    }, 500);
  }

  /**
   * Called every 500ms during measurement.
   * Collects RSSI, checks stability, auto-accepts when stable.
   */
  private _wizardMeasureTick(): void {
    const elapsed = Date.now() - this._wizardMeasureStart;
    const maxMs = (this.constructor as typeof BLELivemapPanel).WIZARD_MEASURE_MAX_MS;
    const minMs = (this.constructor as typeof BLELivemapPanel).WIZARD_MEASURE_MIN_MS;
    const windowSize = (this.constructor as typeof BLELivemapPanel).WIZARD_WINDOW_SIZE;
    const threshold = (this.constructor as typeof BLELivemapPanel).WIZARD_STABILITY_THRESHOLD;

    // Collect current RSSI from debug info
    let activeCount = 0;
    let stableCount = 0;

    for (const info of this._liveDebugInfo) {
      if (info.rssi === null) continue;
      activeCount++;

      const key = info.proxyId;
      const buf = this._wizardRssiBuffer.get(key) || [];
      buf.push(info.rssi);
      // Keep only last N readings
      if (buf.length > windowSize) buf.shift();
      this._wizardRssiBuffer.set(key, buf);

      // Check stability: need at least windowSize/2 readings
      if (buf.length >= Math.ceil(windowSize / 2)) {
        const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
        const variance = buf.reduce((a, b) => a + (b - mean) ** 2, 0) / buf.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev < threshold) stableCount++;
      }
    }

    this._wizardStableProxies = stableCount;
    this._wizardTotalProxies = activeCount;
    this._wizardMeasureProgress = Math.min(100, Math.round((elapsed / minMs) * 100));

    // Check if stable enough or timed out
    const allStable = activeCount > 0 && stableCount >= activeCount;
    const minTimePassed = elapsed >= minMs;
    const timedOut = elapsed >= maxMs;

    if ((allStable && minTimePassed) || timedOut) {
      this._wizardAcceptMeasurement();
    }
  }

  /**
   * Accept the current measurement: record sample, auto-calibrate, advance.
   */
  private _wizardAcceptMeasurement(): void {
    // Stop measurement timer
    if (this._wizardMeasureTimer) {
      clearInterval(this._wizardMeasureTimer);
      this._wizardMeasureTimer = null;
    }

    // Record the calibration sample at the current wizard point
    const point = this._wizardPoints[this._wizardStep];
    if (point) {
      this._recordCalibrationSample(point.x, point.y);
      // _recordCalibrationSample triggers auto-calibrate if continuous_learning is on
      // which in turn triggers Bermuda sync if bermuda_sync_enabled is on

      // Auto-remove outliers after calibration (wizard handles cleanup automatically)
      setTimeout(() => {
        const outliers = (this._config.calibration_samples || []).filter(s => s.is_outlier);
        if (outliers.length > 0) {
          this._removeOutlierSamples();
        }
      }, 800);
    }

    this._wizardState = 'stable';

    // Mark point as done
    this._wizardPoints = this._wizardPoints.map((p, i) => ({
      ...p,
      status: i === this._wizardStep ? 'done' as const : p.status,
    }));

    // Auto-advance to next point after a short delay
    setTimeout(() => {
      this._wizardAdvance();
    }, 1500);
  }

  /**
   * Advance to the next wizard point, or complete.
   */
  private _wizardAdvance(): void {
    const nextIdx = this._wizardStep + 1;

    if (nextIdx >= this._wizardPoints.length) {
      // All points done!
      this._wizardState = 'complete';
      this._calibrationToast = `\u2705 Guided calibration complete! ${this._wizardPoints.filter(p => p.status === 'done').length} points measured.`;
      setTimeout(() => { this._calibrationToast = ""; }, 5000);
      return;
    }

    this._wizardStep = nextIdx;
    this._wizardState = 'suggesting';
    this._wizardRssiBuffer.clear();

    // Mark next point as active
    this._wizardPoints = this._wizardPoints.map((p, i) => ({
      ...p,
      status: i === nextIdx ? 'active' as const : p.status,
    }));
  }

  /**
   * Skip the current wizard point.
   */
  private _wizardSkipPoint(): void {
    if (this._wizardMeasureTimer) {
      clearInterval(this._wizardMeasureTimer);
      this._wizardMeasureTimer = null;
    }

    this._wizardPoints = this._wizardPoints.map((p, i) => ({
      ...p,
      status: i === this._wizardStep ? 'skipped' as const : p.status,
    }));

    this._wizardAdvance();
  }

  /**
   * Generate optimal calibration points based on proxy positions.
   * Strategy:
   *   1. Near each proxy (~1.5m offset) for ref_rssi calibration
   *   2. Midpoints between proxy pairs for attenuation calibration
   *   3. Coverage gaps in zones
   */
  private _wizardGeneratePoints(): WizardPoint[] {
    const proxies = (this._config.proxies || []).filter(p => p.x || p.y);
    const floor = this._getActiveFloor();
    const floorId = floor?.id || "default";
    const imageWidth = floor?.image_width || 20;
    const imageHeight = floor?.image_height || 15;
    const zones = (this._config.zones || []).filter(z => !z.floor_id || z.floor_id === floorId);
    const existingSamples = (this._config.calibration_samples || []).filter(s => s.floor_id === floorId);

    const points: WizardPoint[] = [];

    // Helper: check if a point is inside any zone (if zones exist)
    const isInsideAnyZone = (px: number, py: number): boolean => {
      if (zones.length === 0) return true; // no zones = allow everywhere
      return zones.some(z => z.points && isPointInPolygon(px, py, z.points));
    };

    // Helper: check if there's already a sample near this point (within ~2m)
    const hasNearbySample = (px: number, py: number, radiusM: number): boolean => {
      for (const s of existingSamples) {
        const dx = ((s.x - px) / 100) * imageWidth;
        const dy = ((s.y - py) / 100) * imageHeight;
        if (Math.sqrt(dx * dx + dy * dy) < radiusM) return true;
      }
      return false;
    };

    // Helper: offset a point slightly (in % coords) to avoid being right on top of proxy
    const offsetPoint = (px: number, py: number, offsetM: number): { x: number; y: number } => {
      // Offset toward center of map
      const cx = 50, cy = 50;
      const dx = cx - px, dy = cy - py;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const offsetPctX = (offsetM / imageWidth) * 100;
      const offsetPctY = (offsetM / imageHeight) * 100;
      return {
        x: Math.max(2, Math.min(98, px + (dx / dist) * offsetPctX)),
        y: Math.max(2, Math.min(98, py + (dy / dist) * offsetPctY)),
      };
    };

    // Phase 1: Near each proxy (for ref_rssi at ~1.5m)
    for (const proxy of proxies) {
      if (proxy.floor_id && proxy.floor_id !== floorId) continue;
      const offset = offsetPoint(proxy.x, proxy.y, 1.5);
      if (!hasNearbySample(offset.x, offset.y, 2.0) && isInsideAnyZone(offset.x, offset.y)) {
        points.push({
          x: offset.x,
          y: offset.y,
          floor_id: floorId,
          label: `Near ${proxy.name || proxy.entity_id.split('.').pop()}`,
          status: 'pending',
          nearProxy: proxy.entity_id,
        });
      }
    }

    // Phase 2: Midpoints between proxy pairs (for attenuation)
    for (let i = 0; i < proxies.length; i++) {
      for (let j = i + 1; j < proxies.length; j++) {
        const pA = proxies[i];
        const pB = proxies[j];
        if (pA.floor_id && pA.floor_id !== floorId) continue;
        if (pB.floor_id && pB.floor_id !== floorId) continue;

        // Check if proxies are within reasonable distance (< 15m)
        const dx = ((pA.x - pB.x) / 100) * imageWidth;
        const dy = ((pA.y - pB.y) / 100) * imageHeight;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 15) continue;

        const mx = (pA.x + pB.x) / 2;
        const my = (pA.y + pB.y) / 2;

        if (!hasNearbySample(mx, my, 2.5) && isInsideAnyZone(mx, my)) {
          const nameA = pA.name || pA.entity_id.split('.').pop();
          const nameB = pB.name || pB.entity_id.split('.').pop();
          points.push({
            x: mx,
            y: my,
            floor_id: floorId,
            label: `Between ${nameA} and ${nameB}`,
            status: 'pending',
          });
        }
      }
    }

    // Phase 3: Coverage grid (fill gaps)
    if (proxies.length >= 3) {
      const gridSpacingM = 3;
      const gridStepX = (gridSpacingM / imageWidth) * 100;
      const gridStepY = (gridSpacingM / imageHeight) * 100;

      for (let gx = gridStepX; gx < 100 - gridStepX; gx += gridStepX) {
        for (let gy = gridStepY; gy < 100 - gridStepY; gy += gridStepY) {
          // Skip if already have a point or sample nearby
          const alreadyHasPoint = points.some(p => {
            const pdx = ((p.x - gx) / 100) * imageWidth;
            const pdy = ((p.y - gy) / 100) * imageHeight;
            return Math.sqrt(pdx * pdx + pdy * pdy) < 2.5;
          });
          if (alreadyHasPoint) continue;
          if (hasNearbySample(gx, gy, 2.5)) continue;
          if (!isInsideAnyZone(gx, gy)) continue;

          // Only add if at least 2 proxies are within 8m
          let nearbyProxies = 0;
          for (const p of proxies) {
            const pdx = ((p.x - gx) / 100) * imageWidth;
            const pdy = ((p.y - gy) / 100) * imageHeight;
            if (Math.sqrt(pdx * pdx + pdy * pdy) < 8) nearbyProxies++;
          }
          if (nearbyProxies < 2) continue;

          points.push({
            x: gx,
            y: gy,
            floor_id: floorId,
            label: `Coverage point`,
            status: 'pending',
          });
        }
      }
    }

    // Limit to reasonable number of points (max 15)
    return points.slice(0, 15);
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

    const proxySlug = extractProxySlug(proxy.entity_id).toLowerCase();

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
        min-height: 0; /* Allow flex item to shrink below content size */
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
        user-select: none;
        -webkit-user-select: none;
        line-height: 0; /* Remove any inline spacing below image */
      }

      .map-image {
        display: block;
        max-width: 100%;
        max-height: 100%;
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
        pointer-events: none;
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
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        transition: transform 0.1s;
        z-index: 10;
        user-select: none;
        -webkit-user-select: none;
      }

      /* During active drag, disable pointer-events on all markers so mouse events reach map-inner */
      .map-inner.dragging .proxy-marker,
      .map-inner.dragging .door-marker,
      .map-inner.dragging .proxy-label,
      .map-inner.dragging .zone-label-overlay,
      .map-inner.dragging .zone-polygon {
        pointer-events: none !important;
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

      .debug-device-selector {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      }

      .debug-device-selector label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        white-space: nowrap;
      }

      .debug-device-selector select {
        flex: 1;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--divider-color, rgba(255,255,255,0.2));
        background: var(--card-bg, #1e1e1e);
        color: var(--text-primary, #fff);
      }

      /* Debug map overlay elements */
      .debug-proxy-ring {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid var(--ring-color, #4CAF50);
        opacity: var(--ring-opacity, 0.8);
        pointer-events: none;
        z-index: 20;
        animation: debug-ring-pulse 2s ease-in-out infinite;
      }

      @keyframes debug-ring-pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: var(--ring-opacity, 0.8); }
        50% { transform: translate(-50%, -50%) scale(1.15); opacity: calc(var(--ring-opacity, 0.8) * 0.6); }
      }

      .debug-line-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 19;
      }

      .debug-distance-label {
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 9px;
        font-weight: 600;
        color: #fff;
        background: rgba(0, 0, 0, 0.7);
        padding: 2px 5px;
        border-radius: 3px;
        pointer-events: none;
        z-index: 21;
        text-align: center;
        line-height: 1.3;
        white-space: nowrap;
      }

      .debug-rssi {
        font-size: 8px;
        font-weight: 400;
        opacity: 0.7;
      }

      /* Calibration toolbar */
      .calib-toolbar {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      }

      .calib-hint {
        background: rgba(33, 150, 243, 0.15);
        border: 1px solid rgba(33, 150, 243, 0.4);
        border-radius: 6px;
        padding: 8px 12px;
        margin-bottom: 8px;
        font-size: 11px;
        color: #64B5F6;
        animation: calib-hint-pulse 1.5s ease-in-out infinite;
      }

      @keyframes calib-hint-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .calib-toast {
        background: rgba(76, 175, 80, 0.15);
        border: 1px solid rgba(76, 175, 80, 0.4);
        border-radius: 6px;
        padding: 6px 12px;
        margin-bottom: 8px;
        font-size: 11px;
        color: #81C784;
      }

      .offset-input {
        width: 52px;
        padding: 2px 4px;
        font-size: 10px;
        border: 1px solid var(--divider-color, rgba(255,255,255,0.2));
        border-radius: 3px;
        background: var(--card-bg, #1e1e1e);
        color: var(--text-primary, #fff);
        text-align: center;
      }

      .offset-input:focus {
        outline: none;
        border-color: #2196F3;
      }

      /* Calibration toggles */
      .calib-toggles {
        display: flex;
        gap: 12px;
        padding: 4px 0;
        font-size: 11px;
      }
      .calib-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        color: var(--text-secondary, #aaa);
      }
      .calib-toggle input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: #2196F3;
      }

      /* Sample list */
      .sample-details {
        margin-top: 6px;
        font-size: 11px;
      }
      .sample-details summary {
        cursor: pointer;
        color: var(--text-secondary, #aaa);
        padding: 4px 0;
        user-select: none;
      }
      .sample-details summary:hover {
        color: var(--text-primary, #fff);
      }
      .sample-list {
        max-height: 150px;
        overflow-y: auto;
        border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        border-radius: 4px;
        margin-top: 4px;
      }
      .sample-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 6px;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.05));
        font-size: 10px;
      }
      .sample-item:last-child { border-bottom: none; }
      .sample-outlier {
        background: rgba(255, 152, 0, 0.1);
        border-left: 2px solid #FF9800;
      }
      .sample-num {
        font-weight: bold;
        color: var(--text-secondary, #aaa);
        min-width: 24px;
      }
      .sample-info {
        flex: 1;
        color: var(--text-primary, #fff);
      }
      .sample-time {
        color: var(--text-secondary, #888);
        font-size: 9px;
      }
      .sample-remove {
        background: none;
        border: none;
        color: #F44336;
        cursor: pointer;
        font-size: 12px;
        padding: 2px 4px;
        border-radius: 3px;
        opacity: 0.6;
      }
      .sample-remove:hover {
        opacity: 1;
        background: rgba(244, 67, 54, 0.15);
      }

      /* Calibration sample markers on map */
      .calib-sample-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #FF9800;
        border: 2px solid #fff;
        pointer-events: none;
        z-index: 22;
        opacity: 0.7;
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
        pointer-events: none;
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
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #FF5722;
        border: 2px solid white;
        pointer-events: none;
        z-index: 20;
        box-shadow: 0 0 6px rgba(255, 87, 34, 0.7);
      }

      .draw-point-first {
        width: 16px;
        height: 16px;
        background: #4CAF50;
        border: 3px solid white;
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.8);
        animation: pulse-point 1.5s ease-in-out infinite;
      }

      @keyframes pulse-point {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.3); }
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

      .area-select {
        flex: 1;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--bg);
        color: var(--text);
        font-size: 13px;
      }

      .area-badge {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 10px;
        white-space: nowrap;
        font-weight: 600;
      }

      .area-badge-linked {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      .btn-create-area {
        padding: 4px 10px;
        font-size: 11px;
        border-radius: 6px;
        border: 1px dashed var(--accent);
        background: transparent;
        color: var(--accent);
        cursor: pointer;
        white-space: nowrap;
        font-weight: 600;
      }

      .btn-create-area:hover {
        background: rgba(var(--accent-rgb, 66, 133, 244), 0.1);
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

      /* Guided Calibration Wizard Panel */
      .wizard-panel {
        background: var(--card-bg, #1e1e1e);
        border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        border-radius: 8px;
        padding: 10px;
        margin: 4px 0;
      }
      .wizard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .wizard-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary, #fff);
      }
      .wizard-progress-bar {
        height: 6px;
        background: var(--divider-color, rgba(255,255,255,0.1));
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 4px;
      }
      .wizard-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #2196F3, #4CAF50);
        border-radius: 3px;
        transition: width 0.5s ease;
      }
      .wizard-progress-text {
        font-size: 10px;
        color: var(--text-secondary, #aaa);
        margin-bottom: 8px;
      }
      .wizard-instruction {
        padding: 6px 0;
      }
      .wizard-status {
        font-size: 12px;
        padding: 6px 8px;
        border-radius: 6px;
        margin-bottom: 6px;
      }
      .wizard-suggesting {
        background: rgba(33, 150, 243, 0.1);
        color: #64B5F6;
      }
      .wizard-measuring {
        background: rgba(255, 152, 0, 0.1);
        color: #FFB74D;
      }
      .wizard-stable {
        background: rgba(76, 175, 80, 0.1);
        color: #81C784;
      }
      .wizard-complete {
        background: rgba(76, 175, 80, 0.15);
        color: #4CAF50;
        font-weight: 500;
        padding: 12px;
        text-align: center;
      }
      .wizard-label {
        font-size: 11px;
        color: var(--text-secondary, #aaa);
        font-style: italic;
        margin-bottom: 8px;
      }
      .wizard-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 4px;
      }
      .wizard-measure-bar {
        height: 4px;
        background: var(--divider-color, rgba(255,255,255,0.1));
        border-radius: 2px;
        overflow: hidden;
        margin: 4px 0;
      }
      .wizard-measure-fill {
        height: 100%;
        background: #FF9800;
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      .wizard-measure-detail {
        font-size: 10px;
        color: var(--text-secondary, #aaa);
      }
      .wizard-points {
        max-height: 120px;
        overflow-y: auto;
        border-top: 1px solid var(--divider-color, rgba(255,255,255,0.05));
        margin-top: 8px;
        padding-top: 4px;
      }
      .wizard-point-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 4px;
        font-size: 10px;
        color: var(--text-secondary, #aaa);
        border-radius: 3px;
      }
      .wizard-point-active {
        background: rgba(33, 150, 243, 0.1);
        color: var(--text-primary, #fff);
        font-weight: 500;
      }
      .wizard-point-icon {
        font-size: 12px;
        min-width: 16px;
        text-align: center;
      }
      .wizard-point-label {
        flex: 1;
      }

      /* Wizard map markers */
      .wizard-map-point {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 25;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: #fff;
      }
      .wizard-point-pending {
        background: rgba(158, 158, 158, 0.3);
        border: 2px solid rgba(158, 158, 158, 0.5);
      }
      .wizard-point-active-marker {
        background: rgba(33, 150, 243, 0.3);
        border: 2px solid #2196F3;
        animation: wizard-pulse 1.5s ease-in-out infinite;
      }
      .wizard-point-measuring-marker {
        background: rgba(255, 152, 0, 0.3);
        border: 2px solid #FF9800;
        animation: wizard-spin 1s linear infinite;
      }
      .wizard-point-done-marker {
        background: rgba(76, 175, 80, 0.5);
        border: 2px solid #4CAF50;
      }
      .wizard-point-skipped-marker {
        background: rgba(158, 158, 158, 0.2);
        border: 2px dashed rgba(158, 158, 158, 0.4);
      }
      @keyframes wizard-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4); transform: translate(-50%, -50%) scale(1); }
        50% { box-shadow: 0 0 0 12px rgba(33, 150, 243, 0); transform: translate(-50%, -50%) scale(1.1); }
      }
      @keyframes wizard-spin {
        0% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(255, 152, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4); }
      }
      .wizard-point-number {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--card-bg, #1e1e1e);
        color: var(--text-primary, #fff);
        font-size: 8px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--divider-color, rgba(255,255,255,0.2));
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
              @mousedown=${this._handleMapMouseDown}
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
                  ${this._renderDebugOverlay()}
                  ${this._renderDrawingPoints()}
                  ${this._renderRectPreview()}
                  ${this._renderCalibrationOverlay()}
                </div>
              ` : nothing}
            </div>
          </div>
          <!-- Debug toggle -->
          ${this._trackedDevices.length > 0 ? html`
            <button class="btn btn-small" style="margin-top:8px; font-size:11px;" @click=${() => { this._showDebugPanel = !this._showDebugPanel; }}>
              ${this._showDebugPanel ? '▲ Hide' : '▼ Show'} Sensor Debug
            </button>
          ` : nothing}
          ${this._showDebugPanel ? html`
            <div class="debug-panel">
              <!-- Device selector -->
              <div class="debug-device-selector">
                <label>Follow device:</label>
                <select
                  .value=${this._debugFollowDevice}
                  @change=${(e: Event) => {
                    this._debugFollowDevice = (e.target as HTMLSelectElement).value;
                    this._calibrationMode = false;
                    this._liveDebugInfo = this._trackingEngine?.getDebugInfo(this._debugFollowDevice) || [];
                  }}
                >
                  ${this._trackedDevices.map((d) => html`
                    <option value=${d.device_id} ?selected=${d.device_id === this._debugFollowDevice}>
                      ${d.name || d.device_id}${d.area ? ` (${d.area})` : ''}
                    </option>
                  `)}
                </select>
              </div>

              <!-- Wizard or Manual Calibration -->
              ${this._wizardActive ? html`
                <!-- Guided Calibration Wizard Panel -->
                <div class="wizard-panel">
                  <div class="wizard-header">
                    <span class="wizard-title">\ud83e\uddd9 Guided Calibration</span>
                    <button class="btn btn-small btn-danger" @click=${() => this._wizardStop()}>\u2716 Stop</button>
                  </div>

                  <!-- Progress bar -->
                  <div class="wizard-progress-bar">
                    <div class="wizard-progress-fill" style="width: ${Math.round((this._wizardPoints.filter(p => p.status === 'done').length / Math.max(1, this._wizardPoints.length)) * 100)}%"></div>
                  </div>
                  <div class="wizard-progress-text">
                    Step ${this._wizardStep + 1}/${this._wizardPoints.length} \u2014
                    ${this._wizardPoints.filter(p => p.status === 'done').length} completed,
                    ${this._wizardPoints.filter(p => p.status === 'skipped').length} skipped
                  </div>

                  ${this._wizardState === 'complete' ? html`
                    <div class="wizard-status wizard-complete">
                      \u2705 Calibration complete! All points measured and synced.
                    </div>
                  ` : html`
                    <!-- Current step instruction -->
                    <div class="wizard-instruction">
                      ${this._wizardState === 'suggesting' ? html`
                        <div class="wizard-status wizard-suggesting">
                          \ud83d\udeb6 Walk to the <strong>pulsing blue point</strong> on the map
                        </div>
                        <div class="wizard-label">${this._wizardPoints[this._wizardStep]?.label || ''}</div>
                        <div class="wizard-actions">
                          <button class="btn btn-primary" @click=${() => this._wizardConfirmPosition()}>\ud83d\udccd I'm Here</button>
                          <button class="btn btn-small btn-secondary" @click=${() => this._wizardSkipPoint()}>\u23ed Skip</button>
                        </div>
                      ` : nothing}

                      ${this._wizardState === 'measuring' ? html`
                        <div class="wizard-status wizard-measuring">
                          \ud83d\udce1 Measuring... stand still
                        </div>
                        <div class="wizard-measure-bar">
                          <div class="wizard-measure-fill" style="width: ${this._wizardMeasureProgress}%"></div>
                        </div>
                        <div class="wizard-measure-detail">
                          ${this._wizardStableProxies}/${this._wizardTotalProxies} proxies stable
                        </div>
                      ` : nothing}

                      ${this._wizardState === 'stable' ? html`
                        <div class="wizard-status wizard-stable">
                          \u2705 Stable! Sample recorded. Moving to next point...
                        </div>
                      ` : nothing}
                    </div>
                  `}

                  <!-- Point list -->
                  <div class="wizard-points">
                    ${this._wizardPoints.map((p, i) => {
                      const icon = p.status === 'done' ? '\u2705'
                        : p.status === 'measuring' ? '\ud83d\udfe0'
                        : p.status === 'active' ? '\ud83d\udd35'
                        : p.status === 'skipped' ? '\u23ed'
                        : '\u26aa';
                      return html`
                        <div class="wizard-point-item ${p.status === 'active' || p.status === 'measuring' ? 'wizard-point-active' : ''}">
                          <span class="wizard-point-icon">${icon}</span>
                          <span class="wizard-point-label">${p.label}</span>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              ` : html`
                <!-- Manual Calibration Toolbar -->
                <div class="calib-toolbar">
                  <button
                    class="btn btn-small btn-primary"
                    @click=${() => this._wizardStart()}
                    title="Start guided calibration - walks you through optimal measurement points"
                  >
                    \ud83e\uddd9 Guided Calibration
                  </button>
                  <button
                    class="btn btn-small ${this._calibrationMode ? 'btn-danger' : 'btn-secondary'}"
                    @click=${() => { this._calibrationMode = !this._calibrationMode; }}
                    title="Manual: click on the map to record RSSI fingerprint"
                  >
                    ${this._calibrationMode ? '\u2716 Cancel' : '\ud83d\udccd I Am Here'}
                  </button>
                  <button
                    class="btn btn-small btn-secondary"
                    @click=${() => this._autoCalibrate()}
                    title="Fit path-loss model from collected samples"
                    ?disabled=${(this._config.calibration_samples || []).length < 2}
                  >
                    \ud83e\uddee Calibrate (${(this._config.calibration_samples || []).length})
                  </button>
                  ${(this._config.calibration_samples || []).length > 0 ? html`
                    <button
                      class="btn btn-small btn-danger"
                      @click=${() => this._clearCalibrationSamples()}
                      title="Remove all calibration samples"
                    >\ud83d\uddd1</button>
                  ` : nothing}
                  ${(this._config.calibration_samples || []).some(s => s.is_outlier) ? html`
                    <button
                      class="btn btn-small" style="background:#FF9800;color:#000;"
                      @click=${() => this._removeOutlierSamples()}
                      title="Remove outlier samples"
                    >\u26a0 ${(this._config.calibration_samples || []).filter(s => s.is_outlier).length}</button>
                  ` : nothing}
                </div>

                <!-- Toggle options -->
                <div class="calib-toggles">
                  <label class="calib-toggle">
                    <input type="checkbox"
                      .checked=${this._config.continuous_learning || false}
                      @change=${(e: Event) => {
                        this._updateConfig("continuous_learning", (e.target as HTMLInputElement).checked);
                      }}
                    />
                    Auto-learn
                  </label>
                  <label class="calib-toggle">
                    <input type="checkbox"
                      .checked=${this._config.bermuda_sync_enabled || false}
                      @change=${(e: Event) => {
                        this._updateConfig("bermuda_sync_enabled", (e.target as HTMLInputElement).checked);
                      }}
                    />
                    Bermuda sync
                  </label>
                </div>
              `}

              ${this._calibrationMode ? html`
                <div class="calib-hint">\ud83d\udc46 Click on the map where the device is RIGHT NOW to record a fingerprint</div>
              ` : nothing}
              ${this._calibrationToast ? html`
                <div class="calib-toast">${this._calibrationToast}</div>
              ` : nothing}

              <!-- Proxy table with health -->
              ${this._liveDebugInfo.length > 0 ? html`
                <table class="debug-table">
                  <thead>
                    <tr>
                      <th>Proxy</th>
                      <th>Dist</th>
                      <th>RSSI</th>
                      <th>Offset</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this._liveDebugInfo
                      .slice()
                      .sort((a, b) => {
                        if (a.distance !== null && b.distance === null) return -1;
                        if (a.distance === null && b.distance !== null) return 1;
                        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
                        return a.proxyName.localeCompare(b.proxyName);
                      })
                      .map((d) => {
                        const proxyIdx = (this._config.proxies || []).findIndex(p => p.entity_id === d.proxyId);
                        const proxy = proxyIdx >= 0 ? (this._config.proxies || [])[proxyIdx] : null;
                        const offset = proxy?.calibration?.distance_offset || 0;
                        const health = this._calibrationHealthMap.get(d.proxyId);
                        const healthColor = health ? {
                          excellent: '#4CAF50', good: '#8BC34A', fair: '#FF9800', poor: '#F44336', uncalibrated: '#666'
                        }[health.level] : '#666';
                        const healthIcon = health ? {
                          excellent: '\u2705', good: '\ud83d\udfe2', fair: '\ud83d\udfe1', poor: '\ud83d\udd34', uncalibrated: '\u26aa'
                        }[health.level] : '\u26aa';
                        return html`
                        <tr class="${d.distance !== null ? 'debug-active' : 'debug-inactive'}">
                          <td title="${d.sensorId}">${d.proxyName}</td>
                          <td>${d.distance !== null ? d.distance.toFixed(1) + 'm' : '\u2014'}</td>
                          <td>${d.rssi !== null ? d.rssi + '' : '\u2014'}</td>
                          <td>
                            ${proxyIdx >= 0 ? html`
                              <input
                                type="number"
                                class="offset-input"
                                step="0.1"
                                min="-10"
                                max="10"
                                .value=${String(offset)}
                                @change=${(e: Event) => {
                                  const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                                  this._updateProxyDistanceOffset(proxyIdx, val);
                                }}
                                title="Distance offset in meters"
                              />
                            ` : '\u2014'}
                          </td>
                          <td title="${health?.message || 'Not calibrated'}" style="color:${healthColor};cursor:help;">
                            ${healthIcon}
                            ${proxy?.calibration?.r_squared !== undefined
                              ? html`<span style="font-size:9px;"> R\u00b2=${proxy.calibration.r_squared.toFixed(2)}</span>`
                              : nothing}
                          </td>
                        </tr>
                      `;
                      })}
                  </tbody>
                </table>
                <div class="debug-summary">
                  Active: ${this._liveDebugInfo.filter(d => d.distance !== null).length}/${this._liveDebugInfo.length} |
                  Trilat: ${this._liveDebugInfo.filter(d => d.distance !== null && d.placed).length} |
                  Samples: ${(this._config.calibration_samples || []).length}
                  ${(this._config.calibration_samples || []).some(s => s.is_outlier)
                    ? html` | <span style="color:#FF9800;">Outliers: ${(this._config.calibration_samples || []).filter(s => s.is_outlier).length}</span>`
                    : nothing}
                </div>

                <!-- Sample list (collapsible) -->
                ${(this._config.calibration_samples || []).length > 0 ? html`
                  <details class="sample-details">
                    <summary>\ud83d\udcca Calibration Samples (${(this._config.calibration_samples || []).length})</summary>
                    <div class="sample-list">
                      ${(this._config.calibration_samples || []).map((s, idx) => html`
                        <div class="sample-item ${s.is_outlier ? 'sample-outlier' : ''}">
                          <span class="sample-num">#${idx + 1}</span>
                          <span class="sample-info">
                            ${Object.keys(s.readings).length} proxies
                            ${s.is_outlier ? html`<span style="color:#FF9800;"> \u26a0 outlier</span>` : nothing}
                          </span>
                          <span class="sample-time">${new Date(s.timestamp).toLocaleTimeString()}</span>
                          <button class="sample-remove" @click=${() => this._removeCalibrationSample(s.id)} title="Remove this sample">\u2716</button>
                        </div>
                      `)}
                    </div>
                  </details>
                ` : nothing}
              ` : html`<div style="padding:8px;color:var(--text-secondary);font-size:12px;">No debug data available for this device</div>`}
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

    const hasAreaLink = !!zone.ha_area_id;
    const linkedAreaName = hasAreaLink
      ? (this._fullAreaRegistry.find(a => a.area_id === zone.ha_area_id)?.name || zone.ha_area_id)
      : "";
    const zoneName = hasAreaLink ? linkedAreaName : (zone.name || "");

    return html`
      <div class="zone-edit-panel">
        <h4>${this._t("panel.zone_editing")}: ${zoneName || `Zone ${idx + 1}`}</h4>

        <!-- HA Area link -->
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_ha_area")}</label>
          <select class="area-select" @change=${(e: Event) => {
            const val = (e.target as HTMLSelectElement).value;
            const z = [...zones];
            if (val === "__none__") {
              z[idx] = { ...z[idx], ha_area_id: undefined };
            } else {
              const area = this._fullAreaRegistry.find(a => a.area_id === val);
              z[idx] = { ...z[idx], ha_area_id: val, name: area?.name || z[idx].name };
            }
            this._updateConfig("zones", z);
          }}>
            <option value="__none__" ?selected=${!zone.ha_area_id}>
              ${this._t("panel.zone_no_area")}
            </option>
            ${this._fullAreaRegistry.map(area => html`
              <option value=${area.area_id} ?selected=${zone.ha_area_id === area.area_id}>
                ${area.name}
              </option>
            `)}
          </select>
        </div>

        <!-- Zone name: read-only if linked to HA Area, editable otherwise -->
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_name")}</label>
          ${hasAreaLink ? html`
            <input type="text" .value=${linkedAreaName} disabled
              style="opacity:0.7; cursor:not-allowed;" />
            <span class="area-badge area-badge-linked" title="${this._t('panel.zone_area_linked')}">✓ ${this._t('panel.zone_area_linked')}</span>
          ` : html`
            <input type="text" .value=${zone.name || ""} @change=${(e: Event) => {
              const z = [...zones]; z[idx] = { ...z[idx], name: (e.target as HTMLInputElement).value };
              this._updateConfig("zones", z);
            }} />
            ${zone.name && !zone.ha_area_id && !this._fullAreaRegistry.find(a => a.name.toLowerCase() === (zone.name || "").toLowerCase()) ? html`
              <button class="btn-create-area" @click=${() => this._createHaAreaFromZone(idx)}>
                + ${this._t("panel.zone_create_in_ha")}
              </button>
            ` : nothing}
          `}
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

          title="${proxy.name || proxy.entity_id}\n${proxy.entity_id}\nPosition: ${proxy.x.toFixed(1)}%, ${proxy.y.toFixed(1)}%"
        >${idx + 1}</div>
        <div class="proxy-label" style="left: ${proxy.x}%; top: ${proxy.y + 2}%;">
          ${proxy.name || proxy.entity_id.replace(/^.*\./, "").replace(/_/g, " ")}
        </div>
      `;
    });
  }

  private _renderLiveDeviceMarkers() {
    const floor = this._getActiveFloor();
    const floorId = floor?.id || "default";
    // Filter devices to those on the active floor
    const devicesOnFloor = this._trackedDevices.filter(d =>
      d.position && (!d.current_floor_id || d.current_floor_id === floorId)
    );
    if (devicesOnFloor.length === 0) return nothing;

    const markers: any[] = [];
    for (const device of devicesOnFloor) {
      const pos = device.position!;
      const color = device.config.color || DEVICE_COLORS[0];
      const name = device.name || device.device_id;
      markers.push(html`
        <div
          class="live-device-marker"
          style="left: ${pos.x}%; top: ${pos.y}%; --device-color: ${color};"
          title="${name}\nConfidence: ${(pos.confidence * 100).toFixed(0)}%\nAccuracy: ${pos.accuracy.toFixed(1)}m${device.area ? `\nArea: ${device.area}` : ''}"
        >
          <div class="live-device-pulse"></div>
          <div class="live-device-dot"></div>
        </div>
        <div class="live-device-label" style="left: ${pos.x}%; top: ${pos.y + 2.5}%;">
          ${name}
        </div>
      `);
    }
    return markers;
  }

  /**
   * Render debug overlay: when debug panel is open, draw lines from
   * the followed device to each proxy that sees it, with distance labels.
   * Proxies that detect the device get a highlight ring.
   */
  private _renderDebugOverlay() {
    if (!this._showDebugPanel || !this._debugFollowDevice) return nothing;

    const floor = this._getActiveFloor();
    const floorId = floor?.id || "default";

    // Find the followed device's position
    const device = this._trackedDevices.find(d => d.device_id === this._debugFollowDevice);
    if (!device?.position) return nothing;
    if (device.current_floor_id && device.current_floor_id !== floorId) return nothing;

    const pos = device.position;
    const markers: any[] = [];

    for (const info of this._liveDebugInfo) {
      // Only show proxies on the active floor
      if (info.proxyFloorId && info.proxyFloorId !== floorId) continue;
      if (!info.placed) continue;

      const hasSignal = info.distance !== null;
      const color = hasSignal ? '#4CAF50' : '#F44336';
      const opacity = hasSignal ? 0.8 : 0.3;

      // Highlight ring around proxy
      markers.push(html`
        <div
          class="debug-proxy-ring"
          style="left: ${info.proxyX}%; top: ${info.proxyY}%; --ring-color: ${color}; --ring-opacity: ${opacity};"
        ></div>
      `);

      // Draw line from device to proxy (SVG)
      if (hasSignal) {
        markers.push(html`
          <svg class="debug-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              x1="${pos.x}" y1="${pos.y}"
              x2="${info.proxyX}" y2="${info.proxyY}"
              stroke="${color}"
              stroke-width="0.3"
              stroke-dasharray="1,0.5"
              stroke-opacity="0.6"
            />
          </svg>
        `);

        // Distance label at midpoint
        const midX = (pos.x + info.proxyX) / 2;
        const midY = (pos.y + info.proxyY) / 2;
        markers.push(html`
          <div class="debug-distance-label" style="left: ${midX}%; top: ${midY}%;">
            ${info.distance!.toFixed(1)}m
            ${info.rssi !== null ? html`<br><span class="debug-rssi">${info.rssi}dBm</span>` : nothing}
          </div>
        `);
      }
    }

    // Show calibration sample markers on the map
    const samples = this._config.calibration_samples || [];
    for (const sample of samples) {
      if (sample.floor_id && sample.floor_id !== floorId) continue;
      markers.push(html`
        <div
          class="calib-sample-marker"
          style="left: ${sample.x}%; top: ${sample.y}%;"
          title="Sample #${samples.indexOf(sample) + 1} \u2014 ${Object.keys(sample.readings).length} proxies \u2014 ${new Date(sample.timestamp).toLocaleTimeString()}"
        ></div>
      `);
    }

    // Show wizard points on the map
    if (this._wizardActive && this._wizardPoints.length > 0) {
      for (let i = 0; i < this._wizardPoints.length; i++) {
        const wp = this._wizardPoints[i];
        if (wp.floor_id && wp.floor_id !== floorId) continue;

        const markerClass = wp.status === 'done' ? 'wizard-point-done-marker'
          : wp.status === 'measuring' ? 'wizard-point-measuring-marker'
          : (wp.status === 'active') ? 'wizard-point-active-marker'
          : wp.status === 'skipped' ? 'wizard-point-skipped-marker'
          : 'wizard-point-pending';

        const label = wp.status === 'done' ? '\u2713'
          : wp.status === 'measuring' ? '\u2026'
          : String(i + 1);

        markers.push(html`
          <div
            class="wizard-map-point ${markerClass}"
            style="left: ${wp.x}%; top: ${wp.y}%;"
            title="${wp.label} (${wp.status})"
          >
            ${label}
            <span class="wizard-point-number">${i + 1}</span>
          </div>
        `);
      }
    }

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

      const pointsStr = zone.points.map((p) => `${p.x},${p.y}`).join(" ");
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
        <svg class="zone-polygon" viewBox="0 0 100 100" preserveAspectRatio="none">
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
            style="left: ${cx}%; top: ${cy}%; border: ${isEditing ? '2px solid var(--accent, #2196F3)' : 'none'};"
            title="${zone.name}"
          >
            ${zone.name}
          </div>
        ` : nothing}
      `;
    });
  }

  private _renderDrawingPoints() {
    if (!this._drawingZone || this._drawingMode !== "polygon") return nothing;
    const zones = this._config.zones || [];
    const nextColor = ZONE_COLORS[zones.length % ZONE_COLORS.length];
    // Show filled preview polygon when 3+ points
    const showFill = this._drawingPoints.length >= 3;
    const pointsStr = this._drawingPoints.map((p) => `${p.x},${p.y}`).join(" ");
    return html`
      ${this._drawingPoints.map((p, i) => html`
        <div class="draw-point ${i === 0 ? 'draw-point-first' : ''}" style="left: ${p.x}%; top: ${p.y}%;"></div>
      `)}
      ${this._drawingPoints.length >= 2 ? html`
        <svg class="zone-polygon" viewBox="0 0 100 100" preserveAspectRatio="none">
          ${showFill ? html`
            <polygon
              points=${pointsStr}
              fill="${nextColor}"
              fill-opacity="0.4"
              stroke="${nextColor}"
              stroke-width="0.6"
              stroke-opacity="0.9"
            />
          ` : nothing}
          ${this._drawingPoints.map((p, i) => {
            if (i === 0) return nothing;
            const prev = this._drawingPoints[i - 1];
            return html`<line x1="${prev.x}" y1="${prev.y}" x2="${p.x}" y2="${p.y}" stroke="${nextColor}" stroke-width="0.6" stroke-opacity="0.9" />`;
          })}
        </svg>
      ` : nothing}
    `;
  }

  private _renderRectPreview() {
    if (!this._drawingZone || this._drawingMode !== "rectangle" || !this._rectStart) return nothing;
    const zones = this._config.zones || [];
    const nextColor = ZONE_COLORS[zones.length % ZONE_COLORS.length];

    const startHtml = html`<div class="draw-point draw-point-first" style="left: ${this._rectStart.x}%; top: ${this._rectStart.y}%;"></div>`;

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
          fill="${nextColor}"
          fill-opacity="0.4"
          stroke="${nextColor}"
          stroke-width="0.6"
          stroke-opacity="0.9"
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
