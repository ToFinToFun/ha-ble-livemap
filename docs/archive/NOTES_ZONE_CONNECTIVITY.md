# Key Insights for Zone Connectivity Implementation

## Current Architecture
- `types.ts`: ZoneConfig has `id`, `name`, `points`, `floor_id` etc.
- `renderer.ts`: `render()` takes `devices`, `proxies`, `zones`, `config`, `activeFloor`
  - Already has `config.show_zones`, `config.show_proxies` toggles
  - Need to add: `config.show_doors` toggle and `drawDoor()` function
- `ble-livemap-card.ts`: 
  - `_resolveDeviceFloor()` handles floor transitions (gateway logic)
  - Need to add: `_resolveDeviceZone()` for room transitions (door logic)
  - `_renderAllCanvases()` passes effectiveConfig with runtime toggles
  - Already has `_runtimeShowProxies`, `_runtimeShowZones` etc.
  - Need to add: `_runtimeShowDoors`
  - `_getZonesForFloor()` returns zones for a floor
- `panel.ts`:
  - Zone drawing already implemented (polygon/rectangle)
  - Need to add: Door placement mode in zones tab
  - Settings panel needs show_doors toggle

## Implementation Plan

### 1. types.ts
- Add `DoorConfig` interface
- Add `doors?: DoorConfig[]` to `BLELivemapConfig`
- Add `show_doors?: boolean` to `BLELivemapConfig`
- Add `zone_override_timeout?: number` to `BLELivemapConfig`
- Add defaults

### 2. renderer.ts
- Add `drawDoor()` function
- Add `doors` parameter to `render()`
- Draw doors between zones and portals

### 3. ble-livemap-card.ts
- Add `DeviceZoneState` interface for per-device zone tracking
- Add `_resolveDeviceZone()` method
- Build zone connectivity graph from doors
- Validate zone transitions: device must approach door before switching
- Add `_runtimeShowDoors` state
- Pass doors to renderer

### 4. panel.ts
- Add door placement mode in zones tab
- Auto-detect which two zones a door connects (by position)
- Add portal type for floor transitions
- Add show_doors toggle in settings
- Add translations
