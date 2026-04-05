/**
 * ha-ble-livemap - Type Definitions
 * Author: Jerry Paasovaara
 * License: MIT
 */

export interface BLELivemapConfig {
  type: string;
  floorplan_image?: string;
  floors?: FloorConfig[];
  tracked_devices?: TrackedDeviceConfig[];
  proxies?: ProxyConfig[];
  zones?: ZoneConfig[];
  doors?: DoorConfig[];
  update_interval?: number;
  history_enabled?: boolean;
  history_retention?: number; // minutes
  history_trail_length?: number;
  show_proxies?: boolean;
  show_zones?: boolean;
  show_zone_labels?: boolean;
  show_doors?: boolean;
  show_signal_overlay?: boolean;
  show_accuracy_indicator?: boolean;
  theme_mode?: "auto" | "dark" | "light";
  card_title?: string;
  fullscreen_enabled?: boolean;
  active_floor?: string;
  floor_display_mode?: "tabs" | "stacked"; // tabs = one at a time, stacked = all visible
  auto_fit?: boolean; // auto-fit map to available space
  image_width?: number; // real-world width in meters (for single floor)
  image_height?: number; // real-world height in meters (for single floor)
  gateway_timeout?: number; // seconds a gateway detection remains valid (default: 30)
  floor_override_timeout?: number; // seconds before soft floor override without gateway (default: 60)
  floor_override_min_proxies?: number; // min proxies on new floor before soft override (default: 2)
  zone_override_timeout?: number; // seconds before soft zone override without door passage (default: 45)
}

export interface FloorConfig {
  id: string;
  name: string;
  image: string; // URL or /local/ path to floor plan image
  image_width?: number; // real-world width in meters
  image_height?: number; // real-world height in meters
  building_id?: string; // which building this floor belongs to (default: "default")
  proxies?: ProxyConfig[];
}

/** Gateway types for transition proxies */
export type GatewayType = "stairway" | "elevator" | "door" | "passage";

/** RSSI calibration data for a proxy */
export interface ProxyCalibration {
  ref_rssi: number; // RSSI measured at ref_distance (dBm, e.g. -62)
  ref_distance: number; // distance in meters where ref_rssi was measured (default: 1.0)
  attenuation?: number; // path-loss exponent (calculated, typically 2.0-4.0)
  calibrated_at?: number; // timestamp of last calibration
}

export interface ProxyConfig {
  entity_id: string;
  name?: string;
  x: number; // percentage position on image (0-100)
  y: number; // percentage position on image (0-100)
  floor_id?: string;
  icon?: string;
  color?: string;
  // Gateway properties
  is_gateway?: boolean;
  gateway_type?: GatewayType;
  gateway_connects?: string[]; // floor_ids this gateway connects (e.g. ["floor_0", "floor_1"])
  // RSSI calibration
  calibration?: ProxyCalibration;
}

export interface ZoneConfig {
  id: string;
  name: string;
  points: { x: number; y: number }[]; // polygon vertices in % coords
  color?: string; // fill color (hex)
  border_color?: string; // border color (hex)
  opacity?: number; // fill opacity 0-1
  show_label?: boolean;
  floor_id?: string;
}

/** Door/portal connecting two zones or floors */
export type DoorType = "door" | "opening" | "portal";

export interface DoorConfig {
  id: string;
  x: number; // % position on map
  y: number; // % position on map
  zone_a: string; // zone_id of first room
  zone_b: string; // zone_id of second room (empty for portals connecting to other floor)
  floor_id: string; // which floor this door is on
  type: DoorType; // door = closed door, opening = open passage, portal = floor/building transition
  portal_target_floor?: string; // for portals: which floor it connects to
  portal_target_x?: number; // for portals: x position on target floor (%)
  portal_target_y?: number; // for portals: y position on target floor (%)
  name?: string; // optional label (e.g. "Front door", "Stairway")
}

export interface TrackedDeviceConfig {
  bermuda_device_id?: string;
  entity_prefix?: string; // e.g. "sensor.bermuda_xxx"
  name: string;
  icon?: string; // mdi icon name
  color?: string; // hex color
  trail_color?: string;
  show_trail?: boolean;
  show_label?: boolean;
  floor_id?: string;
}

export interface DevicePosition {
  x: number;
  y: number;
  accuracy: number; // radius in pixels
  confidence: number; // 0-1
  timestamp: number;
  floor_id?: string;
}

export interface HistoryPoint {
  x: number;
  y: number;
  timestamp: number;
  floor_id?: string;
}

export interface ProxyDistance {
  proxy_entity_id: string;
  distance: number; // meters
  rssi: number;
  timestamp: number;
}

export interface TrilaterationResult {
  x: number;
  y: number;
  accuracy: number;
  confidence: number;
}

export interface DeviceState {
  device_id: string;
  name: string;
  position: DevicePosition | null;
  history: HistoryPoint[];
  distances: ProxyDistance[];
  nearest_proxy: string | null;
  area: string | null;
  last_seen: number;
  config: TrackedDeviceConfig;
  current_floor_id?: string; // runtime: which floor the device is currently on
}

// Home Assistant types (minimal)
export interface HomeAssistant {
  states: { [entity_id: string]: HassEntity };
  themes: { darkMode: boolean };
  callService: (domain: string, service: string, data?: any, target?: any) => Promise<void>;
  callWS: (msg: any) => Promise<any>;
  connection: any;
  language: string;
  selectedLanguage: string | null;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: { [key: string]: any };
  last_changed: string;
  last_updated: string;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: any): void;
  getCardSize(): number;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: any;
  setConfig(config: any): void;
}

// Default configuration values
export const DEFAULT_CONFIG: Partial<BLELivemapConfig> = {
  update_interval: 2,
  history_enabled: true,
  history_retention: 60,
  history_trail_length: 50,
  show_proxies: true,
  show_zones: true,
  show_zone_labels: true,
  show_doors: true,
  show_signal_overlay: false,
  show_accuracy_indicator: true,
  theme_mode: "auto",
  fullscreen_enabled: true,
  floor_display_mode: "tabs",
  auto_fit: true,
  gateway_timeout: 30,
  floor_override_timeout: 60,
  floor_override_min_proxies: 2,
  zone_override_timeout: 45,
};

// Door type labels and icons
export const DOOR_TYPES: { value: DoorType; label: string; icon: string }[] = [
  { value: "door", label: "Door", icon: "🛏" },
  { value: "opening", label: "Opening", icon: "▯" },
  { value: "portal", label: "Portal (floor/building)", icon: "🕳️" },
];

// Gateway type labels and icons
export const GATEWAY_TYPES: { value: GatewayType; label: string; icon: string }[] = [
  { value: "stairway", label: "Stairway", icon: "🪜" },
  { value: "elevator", label: "Elevator", icon: "🛗" },
  { value: "door", label: "Door", icon: "🚪" },
  { value: "passage", label: "Passage", icon: "🚶" },
];

// Default zone colors (soft pastels — clearly distinct from device colors)
export const ZONE_COLORS = [
  "#B3E5FC", // Pastel Blue
  "#C8E6C9", // Pastel Green
  "#FFE0B2", // Pastel Orange
  "#E1BEE7", // Pastel Purple
  "#B2DFDB", // Pastel Teal
  "#FFF9C4", // Pastel Yellow
  "#F8BBD0", // Pastel Pink
  "#FFCCBC", // Pastel Coral
];

// Default device colors (strong, saturated — clearly distinct from zone colors)
export const DEVICE_COLORS = [
  "#1E88E5", // Strong Blue
  "#43A047", // Strong Green
  "#E53935", // Strong Red
  "#8E24AA", // Strong Purple
  "#FB8C00", // Strong Orange
  "#00ACC1", // Strong Cyan
  "#F4511E", // Strong Deep Orange
  "#3949AB", // Strong Indigo
];

// Default device icons
export const DEVICE_ICONS: { [key: string]: string } = {
  phone: "mdi:cellphone",
  tablet: "mdi:tablet",
  watch: "mdi:watch",
  tag: "mdi:tag",
  pet: "mdi:paw",
  person: "mdi:account",
  car: "mdi:car",
  key: "mdi:key",
};
