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
  update_interval?: number;
  history_enabled?: boolean;
  history_retention?: number; // minutes
  history_trail_length?: number;
  show_proxies?: boolean;
  show_zones?: boolean;
  show_zone_labels?: boolean;
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
}

export interface FloorConfig {
  id: string;
  name: string;
  image: string; // URL or /local/ path to floor plan image
  image_width?: number; // real-world width in meters
  image_height?: number; // real-world height in meters
  proxies?: ProxyConfig[];
}

export interface ProxyConfig {
  entity_id: string;
  name?: string;
  x: number; // percentage position on image (0-100)
  y: number; // percentage position on image (0-100)
  floor_id?: string;
  icon?: string;
  color?: string;
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
  show_signal_overlay: false,
  show_accuracy_indicator: true,
  theme_mode: "auto",
  fullscreen_enabled: true,
  floor_display_mode: "tabs",
  auto_fit: true,
};

// Default zone colors
export const ZONE_COLORS = [
  "#4FC3F7", // Light Blue
  "#81C784", // Green
  "#FFB74D", // Orange
  "#BA68C8", // Purple
  "#4DB6AC", // Teal
  "#FFD54F", // Yellow
  "#F06292", // Pink
  "#E57373", // Red
];

// Default device colors
export const DEVICE_COLORS = [
  "#4FC3F7", // Light Blue
  "#81C784", // Green
  "#FFB74D", // Orange
  "#E57373", // Red
  "#BA68C8", // Purple
  "#4DB6AC", // Teal
  "#FFD54F", // Yellow
  "#F06292", // Pink
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
