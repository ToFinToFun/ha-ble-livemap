# Design: Automatic Zone-Area Matching

## Problem
Users must manually ensure zone names match Bermuda Area sensor names for
zone-constrained trilateration to work. This is error-prone and tedious.

## Solution: Three-tier matching

### Tier 1: Explicit `ha_area_id` (manual override)
If a zone has `ha_area_id` set, it always wins. Set via a dropdown in the editor.

### Tier 2: Proxy-based auto-matching (zero config)
Each proxy in HA belongs to an Area (via device registry → area_id).
Each proxy has an (x,y) position on the map.
If a proxy's position falls inside a zone polygon, that zone is automatically
linked to the proxy's HA Area.

Logic:
1. For each zone, find all proxies whose (x,y) lies inside the zone polygon.
2. Count which HA Area appears most among those proxies.
3. That Area becomes the zone's resolved area.

This requires NO user action — just placing proxies on the map (which they
already do) automatically creates the zone↔area mapping.

### Tier 3: Name matching (fallback)
If no proxy is inside the zone and no explicit ha_area_id is set,
fall back to case-insensitive name matching (existing logic).

## Where to implement

### `bermuda-utils.ts`
New function: `resolveZoneAreaMap(zones, proxies, hass)` that returns
`Map<zoneId, { areaId, areaName }>` using the three-tier logic.

This needs access to HA area registry. Two options:
- a) Pass area registry data as parameter (from card/panel that already loads it)
- b) Read area from proxy entity attributes

Option (b) is simpler: Bermuda already exposes area info on device_tracker
entities. But the card doesn't load device/area registry.

Best approach: The card already reads `readDeviceArea()` for tracked devices.
We can add a similar function `readProxyArea()` that reads the HA Area for
a proxy entity. This avoids needing the full device registry in the card.

Actually, even simpler: we can use the proxy's `entity_id` to look up its
device_tracker entity and read its `area_id`/`area_name` attributes.

### `ble-livemap-card.ts`
Call `resolveZoneAreaMap()` once per update cycle (or cache it).
Use the result in `_updateDevices()` instead of just `findZoneForArea()`.

### `editor.ts`
Add a dropdown per zone showing available HA Areas for manual override.
Show the auto-detected area as a hint/badge.

## Data flow

```
Proxy placed in zone → proxy has HA Area → zone inherits that Area
Device reports Area X → find zone for Area X → constrain trilateration
```
