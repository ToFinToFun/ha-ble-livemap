# Panel vs Card Consolidation Plan

## Key Differences Found

### Panel (_updateLiveDevices) — MISSING:
1. **Area constraint** (0 refs) — No readDeviceArea, no constrainToPolygon, no area debounce
2. **Zone connectivity** (0 refs) — No _resolveDeviceZone, no BFS path finding, no door logic
3. **History** (0 refs) — No HistoryStore, no trail recording
4. **Zone-Area mapping** — No resolveZoneAreaMap, no three-tier matching

### Panel HAS that card doesn't:
1. **Debug info** — Collects detailed per-proxy distance debug data
2. **RSSI calibration wizard** — Full calibration UI
3. **Auto-place proxies** — Uses HA area registry to auto-position proxies
4. **Floor management** — Has floor resolution but simpler (just active floor filter)

### Card (_updateDevices) — FULL FEATURE SET:
1. **Area constraint** (18 refs) — Full Bermuda Area reading + zone constraining
2. **Floor resolution** (27 refs) — Gateway logic, soft override, multi-floor
3. **Zone connectivity** (10 refs) — BFS path finding, door-based transitions
4. **History** (7 refs) — Full IndexedDB history with trails
5. **Zone-Area mapping** — Three-tier resolveZoneAreaMap

## Architecture for Shared Engine (tracking-engine.ts)

The engine should contain ALL tracking logic that both panel and card need:

### State (per engine instance):
- previousPositions: Map<string, DevicePosition>
- deviceAreaState: Map<string, AreaDebounceState>
- deviceFloorState: Map<string, DeviceFloorState>
- deviceZoneState: Map<string, DeviceZoneState>
- zoneAreaMap: Map<string, ZoneAreaMapping>
- zoneAreaMapStamp: number
- areaRegistry: Map<string, string>
- historyStore: HistoryStore | null

### Methods:
- constructor(options: { enableHistory: boolean })
- update(hass, config) → TrackedDevice[]
  - For each device:
    1. Collect distances
    2. Read Bermuda Area + debounce
    3. Resolve floor (gateway logic)
    4. Trilaterate (with Kalman)
    5. Smooth position
    6. Constrain to area zone
    7. Resolve zone connectivity
    8. Record history
    9. Return TrackedDevice
- getDebugInfo() → DebugInfo[]
- destroy() — cleanup timers, history store

### What stays in panel.ts:
- All editor UI (zone drawing, proxy placement, calibration wizard, etc.)
- Canvas rendering for editor preview
- Config save/load logic
- Calls engine.update() and uses results for display

### What stays in ble-livemap-card.ts:
- Lovelace card lifecycle (setConfig, render, etc.)
- Canvas rendering via renderer.ts
- Toggle buttons, device panel, floor selector
- Calls engine.update() and uses results for display

### What moves to tracking-engine.ts:
- _updateDevices / _updateLiveDevices → engine.update()
- _resolveDeviceFloor → engine internal
- _resolveDeviceZone → engine internal
- _debounceAreaChange → engine internal
- _findZoneForPosition → engine internal
- _zonesConnected → engine internal
- _findZonePath → engine internal
- Zone-area map resolution → engine internal
- History recording → engine internal
