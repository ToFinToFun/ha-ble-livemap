# Zone Connectivity Design (v1.7.1)

## Problem
BLE trilateration ignores walls. Two adjacent rooms separated by a wall may show
a device "jumping" through the wall because the signal is strong enough. The device
must physically walk through doors to transition between rooms.

## Solution: Zone Connectivity Graph

### Core Concepts

1. **Zones = Rooms** (already implemented)
2. **Doors** = Connection points between two zones on the same floor
3. **Portals** = Connection points between floors (replaces/extends gateway concept)
4. **Connectivity Graph** = Which zones connect to which via doors/portals

### Door Data Model
```typescript
interface DoorConfig {
  id: string;
  x: number;           // % position on map
  y: number;           // % position on map
  zone_a: string;      // zone_id of first room
  zone_b: string;      // zone_id of second room
  floor_id: string;    // which floor this door is on
  type: "door" | "opening" | "portal";  // portal = floor transition
  portal_target_floor?: string;  // for portals: which floor it connects to
  name?: string;       // optional label
}
```

### Zone Transition Logic

**Rule: A device can only move from Zone A to Zone B if:**
1. There exists a door connecting Zone A and Zone B, OR
2. There exists a chain of doors A→C→...→B (path through intermediate zones), OR
3. The device has been consistently detected in Zone B for `zone_override_timeout` seconds (soft override)

**Approach detection (not requiring "being in" intermediate rooms):**
- The device must show decreasing distance to the door's nearest proxy (approaching)
- Then show proximity to the next door's proxy (arriving)
- Small pass-through rooms (hallways) don't require the device to "settle" there

### Visual Layer Toggles
New config options:
- `show_doors`: boolean (default: true)
- `show_portals`: boolean (default: true)
- Existing: `show_proxies`, `show_zones`, `show_zone_labels`

### UI for Door Placement
In the Zones tab:
1. Click "Add Door" button
2. Click on the map where the door is
3. Select which two zones it connects (auto-detect from position)
4. For portals: also select target floor

### Rendering
- Doors: Small door icon (🚪) or a gap/line marker at the position
- Portals: Stairway/elevator icon with a glow effect
- Both can be toggled off for a clean view
