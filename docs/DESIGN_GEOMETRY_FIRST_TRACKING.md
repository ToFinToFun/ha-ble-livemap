# Design: Geometry-First Tracking Architecture

## Problem Statement

The current tracking engine has a layered approach where:
1. **Bermuda Area** is treated as near-truth for room determination
2. **Trilateration** positions within that room
3. **Door connectivity** is a fallback when no Bermuda Area is available

This creates issues:
- A proxy on an exterior wall reports signals from both inside and outside equally
- A proxy at a doorway between Hall and Kitchen doesn't "belong" to either room
- Bermuda Area can flicker between rooms, causing jumps
- The system treats proxy-room association as meaningful, but it's an abstraction that doesn't match physical reality

## New Architecture: Geometry Decides Everything

### Core Principle
**Proxies are just points on the map. The map geometry (zones, walls, doors) decides where a device is.**

### Pipeline (revised)

```
Step 1: TRILATERATE
  - Collect distances from ALL visible proxies (any floor, any room)
  - Kalman-filter each distance
  - Weighted least-squares → raw position (x, y)

Step 2: DETERMINE CURRENT ZONE
  - Check which zone polygon contains the raw position
  - This is the "candidate zone"

Step 3: VALIDATE ZONE TRANSITION
  - If candidate zone == current zone → accept position as-is
  - If candidate zone != current zone → check door graph:
    a) Direct door exists between current and candidate zone?
       → Check movement direction: is device approaching the door?
       → If approaching AND close enough → allow transition
    b) Path through 1-3 doors exists?
       → Require sustained presence in candidate zone (time-based)
    c) No path exists (e.g., through a wall)?
       → REJECT the zone change entirely
       → Clamp position to nearest point inside current zone

Step 4: BERMUDA AREA AS TIE-BREAKER (hint, not truth)
  - If trilateration is ambiguous (low confidence, few proxies)
  - AND Bermuda Area suggests a specific room
  - → Boost the probability of that zone
  - But NEVER override the door-graph validation

Step 5: CONSTRAIN POSITION
  - Final position must be inside the resolved zone polygon
  - If outside → project to nearest point on zone boundary
```

### Movement Direction Detection

The key improvement: instead of just checking "is the device near a door?", we check "is the device MOVING TOWARD a door?"

```
For each update cycle:
  1. Calculate distance from device to each nearby door
  2. Compare with previous distance (stored in zone state)
  3. If distance is DECREASING over 2+ readings → "approaching"
  4. If approaching AND distance < threshold → "passing through"
  5. Only allow zone transition when "passing through"
```

This prevents BLE fluctuations from being interpreted as door passages. A device that's just sitting near a door won't trigger a transition because it's not consistently moving toward it.

### Edge Cases

**Device starts outside all zones:**
→ Assign to nearest zone (by distance to zone centroid)
→ Once assigned, normal door rules apply

**Device is between two zones (in a wall):**
→ Keep in current zone, clamp position to zone boundary
→ The device appears to "slide along the wall" until it reaches a door

**Proxy on exterior wall (Jerry's Shelly case):**
→ The proxy contributes to trilateration normally
→ If trilateration places device outside (in "Utomhus" zone), 
   but there's no door between current zone and Utomhus → blocked
→ Device stays in current room until it passes through an exterior door

**Bermuda says "Kitchen" but trilateration says "Hall":**
→ Trilateration + door graph wins
→ Bermuda is logged as a hint for debugging
→ If trilateration confidence is very low (<0.3) AND Bermuda is consistent
   for 5+ readings → allow Bermuda to influence zone selection

**Multiple zones overlap:**
→ Use the zone with the best match (most area overlap with accuracy circle)
→ If tied, prefer current zone (sticky)

### What Changes in the Codebase

1. **tracking-engine.ts `update()` pipeline:**
   - Remove Layer 1 (Bermuda Area as primary) as the zone determiner
   - Make Layer 2 (trilateration) always run first
   - Make Layer 3 (zone connectivity) always run (not just when no areaZone)
   - Add new Layer 4: Bermuda hint integration
   - Add movement-direction tracking to door passage logic

2. **DeviceZoneState (enhanced):**
   ```typescript
   interface DeviceZoneState {
     current_zone_id: string | null;
     // Door approach tracking
     door_distances: Map<string, number[]>; // doorId → last N distances
     last_passage_door: string | null;
     last_passage_time: number;
     // Override tracking  
     override_candidate_zone: string | null;
     override_start: number;
     // Bermuda hint
     bermuda_hint_zone: string | null;
     bermuda_hint_count: number;
   }
   ```

3. **ProxyConfig:** Remove any room-association fields (keep only x, y, floor_id, gateway properties)

4. **Zone-area mapping:** Still useful for display (showing HA Area name on zones) but NOT used for tracking decisions

### What Stays the Same

- Kalman filter for distance smoothing
- Weighted least-squares trilateration math
- Position smoothing (EMA)
- Floor resolution via gateway proxies
- History recording
- Zone-area mapping for UI display
- Door/portal configuration
