# BLE LiveMap

[![HACS Badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/jerrypaasovaara/ha-ble-livemap/releases)

**Real-time BLE device position tracking on your floor plan for Home Assistant.**

Track phones, watches, tags, and any Bluetooth device on an interactive floor plan with smooth animations, gradient accuracy circles, and history trails. Powered by [Bermuda BLE Trilateration](https://github.com/agittins/bermuda).

---

## Features

- **Real-time position tracking** on your uploaded floor plan image
- **Gradient accuracy circles** — larger circle means less certainty, smaller means precise
- **Smooth animations** — positions glide between updates at 60fps
- **History trails** — see where devices have moved with fading trail lines
- **Multi-floor support** — switch between floors with a dropdown
- **Signal coverage overlay** — visualize BLE proxy coverage areas
- **Multi-device tracking** — track multiple people with unique colors
- **Visual card editor** — configure everything through the HA UI, no YAML needed
- **Drag-and-drop proxy placement** — click on the map to place your BLE proxies
- **Dark/Light mode** — follows your HA theme automatically
- **Fullscreen mode** — expand the map for detailed viewing
- **Device panel** — expandable list showing all tracked devices with accuracy info
- **Local history storage** — uses browser IndexedDB, not your HA database
- **Auto-purge** — old history data is automatically cleaned up
- **Internationalization** — English and Swedish included, easy to add more
- **HACS compatible** — one-click installation
- **Lightweight** — 66KB minified, no external dependencies at runtime

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
3. Add `jerrypaasovaara/ha-ble-livemap` as a **Lovelace** repository
4. Search for **BLE LiveMap** and click **Download**
5. Refresh your browser (Ctrl+F5)

### Manual

1. Download `ble-livemap-card.js` from the [latest release](https://github.com/jerrypaasovaara/ha-ble-livemap/releases)
2. Copy it to `<config>/www/ble-livemap-card.js`
3. Add a resource in **Settings → Dashboards → Resources**:
   ```yaml
   url: /local/ble-livemap-card.js
   type: module
   ```
4. Refresh your browser

---

## Quick Start

### 1. Prepare your floor plan

Upload a floor plan image (PNG, JPG, or SVG) to your Home Assistant `www` folder. You can use:
- Architectural drawings
- Hand-drawn sketches
- Screenshots from Google Maps
- Any image that represents your home layout

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
2. Enter the Bermuda scanner entity ID
3. Click **Place on map** and click where the proxy is physically located
4. Repeat for all your BLE proxies

### 4. Add tracked devices

In the **Devices** tab:
1. Click **Add device**
2. Enter the Bermuda entity prefix (e.g., `sensor.bermuda_jerry_phone`)
3. Set a name, color, and icon
4. Enable trail and label as desired

### 5. Set dimensions

In the **Floor Plan** tab, enter the real-world dimensions of your floor plan in meters. This is critical for accurate trilateration.

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
  - entity_id: sensor.bedroom_esp32_ble
    name: Bedroom
    x: 70.0
    y: 80.0
tracked_devices:
  - entity_prefix: sensor.bermuda_jerry_phone
    name: Jerry
    color: "#4FC3F7"
    icon: phone
    show_trail: true
    show_label: true
  - entity_prefix: sensor.bermuda_elina_phone
    name: Elina
    color: "#81C784"
    icon: phone
    show_trail: true
    show_label: true
```

### Multi-Floor Example

```yaml
type: custom:ble-livemap-card
card_title: Home Tracker
floors:
  - id: ground
    name: Ground Floor
    image: /local/floor_ground.png
    image_width: 18
    image_height: 12
  - id: upper
    name: Upper Floor
    image: /local/floor_upper.png
    image_width: 18
    image_height: 10
proxies:
  - entity_id: sensor.kitchen_ble
    name: Kitchen
    x: 30
    y: 50
    floor_id: ground
  - entity_id: sensor.bedroom_ble
    name: Bedroom
    x: 60
    y: 40
    floor_id: upper
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
| `show_signal_overlay` | boolean | false | Show BLE coverage heatmap |
| `show_accuracy_indicator` | boolean | true | Show dashed accuracy ring |
| `history_enabled` | boolean | true | Enable position history |
| `history_retention` | number | 60 | Minutes to keep history |
| `history_trail_length` | number | 50 | Max trail points per device |
| `theme_mode` | string | "auto" | "auto", "dark", or "light" |
| `fullscreen_enabled` | boolean | true | Show fullscreen button |

---

## How It Works

### Trilateration

The card uses **weighted least-squares trilateration** to calculate device positions:

1. Bermuda provides the distance from each BLE proxy to the tracked device
2. Each proxy has a known position on the floor plan (set by you)
3. With 3+ distance measurements, the algorithm calculates the most likely position
4. Closer proxies are weighted more heavily (inverse-square weighting)
5. The result is smoothed over time to prevent jitter

### Accuracy

The gradient circle around each device represents positioning accuracy:
- **Small, tight circle** = high confidence (3+ proxies nearby)
- **Large, faded circle** = lower confidence (fewer proxies or inconsistent readings)

Typical accuracy with BLE:
- **3+ proxies in range**: 2-4 meter accuracy
- **2 proxies**: 4-6 meter accuracy
- **1 proxy**: Room-level only (shows near the proxy)

### Tips for Better Accuracy

1. **More proxies = better accuracy** — aim for 3+ proxies per room
2. **Place proxies at room edges** — not in the center
3. **Avoid metal obstructions** — metal reflects BLE signals
4. **Calibrate Bermuda** — set correct ref_power and attenuation
5. **Use consistent proxy heights** — mount all at similar heights

---

## Data Storage

Position history is stored in your browser's **IndexedDB**, not in Home Assistant's database. This means:
- No impact on your HA recorder database size
- History is per-browser (different on phone vs desktop)
- Automatically purged based on your retention setting
- Cleared when you clear browser data

---

## Adding Languages

Create a new JSON file in `src/localize/languages/` (e.g., `de.json`) following the structure of `en.json`, then import it in `localize.ts`.

---

## Development

```bash
# Clone the repository
git clone https://github.com/jerrypaasovaara/ha-ble-livemap.git
cd ha-ble-livemap

# Install dependencies
pnpm install

# Build for production
pnpm build

# Development with watch mode
pnpm start
```

The built file will be at `dist/ble-livemap-card.js`.

---

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License — Copyright (c) 2026 Jerry Paasovaara

---

## Credits

- [Bermuda BLE Trilateration](https://github.com/agittins/bermuda) by Andrew Gittins
- [Home Assistant](https://www.home-assistant.io/)
- [Lit](https://lit.dev/) web components library
- Built with the [HA Custom Card Boilerplate](https://github.com/custom-cards/boilerplate-card) patterns
