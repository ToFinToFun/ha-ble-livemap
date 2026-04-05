# HA Custom Panel Research

## How it works:
1. Create a custom element JS file in `<config>/www/`
2. Register it via `configuration.yaml`:
```yaml
panel_custom:
  - name: ble-livemap-config
    sidebar_title: BLE LiveMap
    sidebar_icon: mdi:bluetooth
    url_path: ble-livemap
    module_url: /local/ble-livemap-panel.js
    config:
      key: value
```

## Properties passed to the panel:
- `hass` - The HA object with all states, services, etc.
- `narrow` - Boolean if screen is narrow
- `route` - Current route
- `panel` - Panel config

## Key insight:
- Panel gets full `hass` object = access to ALL entities
- Panel renders full screen = plenty of space
- Can use `hass.states` to list all entities
- Can use `hass.callWS()` for WebSocket calls
- Can store config in browser localStorage or as HA input_text helpers

## Architecture plan:
1. **Panel** (`ble-livemap-panel.js`) - Full config UI with:
   - Large map for proxy/zone placement
   - Entity picker using hass.states
   - All settings
   - Saves config to localStorage (shared with card)
   
2. **Card** (`ble-livemap-card.js`) - Display only:
   - Reads config from localStorage
   - Shows map with positions
   - Minimal/no editor (just a link to open the panel)

## Config storage options:
- localStorage: Simple, works, but per-browser
- HA input_text: Persists across browsers but limited to 255 chars
- HA REST API / file: Complex
- **Best: localStorage + export/import JSON** for backup
