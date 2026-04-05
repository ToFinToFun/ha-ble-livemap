# BLE LiveMap

[![HACS Badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.8.1-blue.svg)](https://github.com/ToFinToFun/ha-ble-livemap/releases)

**Real-time BLE device position tracking on your floor plan for Home Assistant.**

Track phones, watches, tags, and any Bluetooth device on an interactive floor plan with smooth animations, gradient accuracy circles, and history trails. Powered by [Bermuda BLE Trilateration](https://github.com/agittins/bermuda).

---

## Features

- **Real-time position tracking** on your uploaded floor plan image
- **Gradient accuracy circles** — larger circle means less certainty, smaller means precise
- **Smooth animations** — positions glide between updates at 60fps
- **History trails** — see where devices have moved with fading trail lines
- **Multi-floor support** — switch between floors with a dropdown
- **Gateway transitions** — define stairways, doors, and portals between floors/buildings
- **Zone connectivity** — doors between zones prevent wall-teleportation
- **RSSI calibration wizard** — walk-around calibration for better accuracy
- **Signal coverage overlay** — visualize BLE proxy coverage areas
- **Multi-device tracking** — track multiple people with unique colors
- **Visual card editor** — configure everything through the HA UI, no YAML needed
- **Drag-and-drop proxy placement** — click on the map to place your BLE proxies
- **Auto-discovery** — finds all BLE proxies from the Bluetooth integration automatically
- **Dark/Light mode** — follows your HA theme automatically
- **Fullscreen mode** — expand the map for detailed viewing
- **Device panel** — expandable list showing all tracked devices with accuracy info
- **Local history storage** — uses browser IndexedDB, not your HA database
- **Auto-purge** — old history data is automatically cleaned up
- **Internationalization** — English and Swedish included, easy to add more
- **HACS compatible** — one-click installation

---

## Prerequisites

1. **Home Assistant** 2024.1 or later
2. **[Bermuda BLE Trilateration](https://github.com/agittins/bermuda)** integration installed and configured
3. **BLE Proxies** — ESPHome Bluetooth Proxies, Shelly Gen2+ devices, or ESP32 devices
4. **Tracked BLE devices** — phones with HA Companion App (iBeacon mode), BLE tags, etc.

---

## Installation

### HACS (Recommended)

1. Open **HACS** in your Home Assistant instance
2. Click the three dots menu (top right) → **Custom repositories**
3. Add `ToFinToFun/ha-ble-livemap` as a **Dashboard** repository
4. Search for **BLE LiveMap** and click **Download**
5. Restart Home Assistant

### Manual

1. Download `ble-livemap-card.js` from the [latest release](https://github.com/ToFinToFun/ha-ble-livemap/releases)
2. Copy it to `<config>/www/ble-livemap-card.js`
3. Add a resource in **Settings → Dashboards → Resources**:
   ```yaml
   url: /local/ble-livemap-card.js
   type: module
   ```
4. Restart Home Assistant

---

## Sidebar Panel

You can configure BLE LiveMap from a dedicated full-page panel in your Home Assistant sidebar.

### How to enable the panel:

1. Open your `configuration.yaml` file
2. Add the following configuration:

```yaml
panel_custom:
  - name: ble-livemap-panel
    sidebar_title: BLE LiveMap
    sidebar_icon: mdi:map-marker-radius
    url_path: ble-livemap
    module_url: /hacsfiles/ha-ble-livemap/ble-livemap-card.js
    trust_external_script: true
```

3. Restart Home Assistant
4. You will now see **BLE LiveMap** in your sidebar!

**Important:** Do NOT add `?v=X.X.X` or any query parameters to `module_url`. This prevents automatic updates from working.

---

## Quick Start

### 1. Prepare your floor plan

Upload a floor plan image (PNG, JPG, or SVG) to your Home Assistant `www` folder.

### 2. Add the card

1. Edit a dashboard → **Add Card** → search for **BLE LiveMap**
2. Or manually add:
   ```yaml
   type: custom:ble-livemap-card
   floorplan_image: /local/floorplan.png
   ```

### 3. Configure proxies

In the card editor, go to the **Proxies** tab:
1. Click **Add proxy**
2. Select the BLE proxy from the dropdown (auto-discovered from Bluetooth integration)
3. Click **Place on map** and click where the proxy is physically located
4. Repeat for all your BLE proxies

### 4. Add tracked devices

In the **Devices** tab:
1. Click **Add device**
2. Enter the Bermuda entity prefix (e.g., `sensor.bermuda_jerry_phone`)
3. Set a name, color, and icon
4. Enable trail and label as desired

### 5. Set dimensions

In the **Floor Plan** tab, enter the real-world dimensions of your floor plan in meters.

---

## Configuration

### YAML Example

```yaml
type: custom:ble-livemap-card
card_title: Home Tracker
floorplan_image: /local/floorplan.png
update_interval: 2
show_proxies: true
show_signal_overlay: false
show_accuracy_indicator: true
history_enabled: true
history_retention: 60
history_trail_length: 50
theme_mode: auto
fullscreen_enabled: true
proxies:
  - entity_id: sensor.kitchen_shelly_ble
    name: Kitchen
    x: 25.5
    y: 40.2
  - entity_id: sensor.living_room_shelly_ble
    name: Living Room
    x: 65.0
    y: 35.0
tracked_devices:
  - entity_prefix: sensor.bermuda_jerry_phone
    name: Jerry
    color: "#4FC3F7"
    icon: phone
    show_trail: true
    show_label: true
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `floorplan_image` | string | — | URL to floor plan image |
| `floors` | array | — | Multi-floor configuration |
| `proxies` | array | — | BLE proxy positions |
| `tracked_devices` | array | — | Devices to track |
| `card_title` | string | "BLE LiveMap" | Card header title |
| `update_interval` | number | 2 | Seconds between position updates |
| `show_proxies` | boolean | true | Show proxy indicators on map |
| `show_doors` | boolean | true | Show door/portal markers on map |
| `show_signal_overlay` | boolean | false | Show BLE coverage heatmap |
| `show_accuracy_indicator` | boolean | true | Show dashed accuracy ring |
| `history_enabled` | boolean | true | Enable position history |
| `history_retention` | number | 60 | Minutes to keep history |
| `history_trail_length` | number | 50 | Max trail points per device |
| `theme_mode` | string | "auto" | "auto", "dark", or "light" |
| `fullscreen_enabled` | boolean | true | Show fullscreen button |
| `gateway_timeout` | number | 30 | Seconds a gateway passage is valid |
| `floor_override_timeout` | number | 60 | Seconds before soft floor override |
| `zone_override_timeout` | number | 45 | Seconds before soft zone override |

---

## How It Works

### Trilateration

The card uses **weighted least-squares trilateration** to calculate device positions:

1. Bermuda provides the distance from each BLE proxy to the tracked device
2. Each proxy has a known position on the floor plan (set by you)
3. With 3+ distance measurements, the algorithm calculates the most likely position
4. Closer proxies are weighted more heavily (inverse-square weighting)
5. The result is smoothed over time to prevent jitter

### Zone Connectivity

Doors and portals define valid paths between zones. A device can only move between zones through a defined door, preventing "wall teleportation" from BLE signal bleed.

### Gateway Transitions

Gateway proxies (stairways, elevators, doors) control floor and building transitions. Soft override ensures devices are never permanently stuck on the wrong floor.

---

## Data Storage

Position history is stored in your browser's **IndexedDB**, not in Home Assistant's database.

---

## Development

```bash
git clone https://github.com/ToFinToFun/ha-ble-livemap.git
cd ha-ble-livemap
pnpm install
pnpm build
```

The built file will be at `dist/ble-livemap-card.js`.

---

## License

MIT License — Copyright (c) 2026 Jerry Paasovaara

---

## Credits

- [Bermuda BLE Trilateration](https://github.com/agittins/bermuda) by Andrew Gittins
- [Home Assistant](https://www.home-assistant.io/)
- [Lit](https://lit.dev/) web components library
