# Design: Zone-Constrained Trilateration

## Problem

BLE trilateration alone is noisy and often places devices on the wrong side of walls.
Bermuda already does a good job determining *which room* (Area) a device is in, but
it doesn't say *where in the room*.

## Solution: Two-Layer Positioning

### Layer 1: Room Determination (Bermuda Area)
- Read `sensor.bermuda_{device}_area` to get the HA Area name
- Map the HA Area name to a configured Zone on the floor plan
- This is the "truth" for which room the device is in

### Layer 2: Intra-Room Positioning (Constrained Trilateration)
- Run trilateration using only proxies on the same floor
- If the result falls inside the Bermuda-determined zone → use it as-is
- If the result falls outside → constrain it to the nearest point inside the zone polygon
- This prevents "wall jumping" while still showing movement within a room

### Zone-to-Area Mapping
Each ZoneConfig gets a new optional field: `ha_area_id?: string`
This links a drawn zone polygon to a Home Assistant Area.
The editor/panel should offer a dropdown of HA Areas when configuring a zone.

### Fallback Behavior
- If no `ha_area_id` is set on any zone → use current behavior (pure trilateration + door connectivity)
- If Bermuda area sensor is unavailable → fall back to pure trilateration
- If device is in an area that has no matching zone → show at trilaterated position unconstrained

### Smooth Transitions
When Bermuda reports a room change:
1. Don't snap immediately — wait for 2-3 consecutive readings (debounce ~5s)
2. Once confirmed, smoothly animate the device to the new zone
3. The trilateration within the new zone takes over for fine positioning

## Implementation Plan

### types.ts
- Add `ha_area_id?: string` to `ZoneConfig`

### bermuda-utils.ts
- Add `readDeviceArea(hass, entityPrefix)` → returns HA area name from Bermuda sensor
- Add `constrainToPolygon(x, y, polygon)` → returns nearest point inside polygon

### trilateration.ts
- Add Kalman-style RSSI smoothing (1D Kalman per proxy per device)
- Keep existing `smoothPosition` for position-level smoothing

### ble-livemap-card.ts
- In `_updateDevices()`:
  1. Read Bermuda area for each device
  2. Find matching zone (by `ha_area_id`)
  3. Run trilateration as before
  4. If result is outside the matched zone → constrain to zone polygon
  5. Set `device.area` from Bermuda data

### editor.ts / panel.ts
- Add HA Area dropdown to zone configuration
- Load area registry and show available areas
