# v1.7.0 Design Document

## Feature 1: Gateway Proxies (Floor & Building Transitions)

### Concept
A proxy can be designated as a "gateway" — a transition point between floors or buildings. 
A tracked device can only change floor/building if it has been detected by a gateway proxy 
that connects those two locations.

### Gateway Types
- **stairway** — connects two floors in the same building (e.g., hallway upstairs ↔ downstairs)
- **elevator** — connects multiple floors in the same building
- **door** — connects two buildings or outdoor areas (e.g., main house ↔ garage)
- **passage** — generic transition point

### Data Model Addition to ProxyConfig
```typescript
interface ProxyConfig {
  // ... existing fields ...
  is_gateway?: boolean;
  gateway_type?: "stairway" | "elevator" | "door" | "passage";
  gateway_connects?: string[];  // Array of floor_ids this gateway connects
}
```

### Transition Logic (in ble-livemap-card.ts)
1. Track each device's `current_floor_id` (persisted per device)
2. When trilateration suggests a device is on a different floor:
   - Check if any gateway proxy connecting current_floor and target_floor 
     has recently seen the device (within last N seconds, configurable)
   - If YES: allow floor transition, update current_floor_id
   - If NO: keep device on current floor, ignore the floor-change signal
3. This prevents "phantom jumps" caused by RSSI noise

### UI in Panel
- On the Proxies tab, each proxy gets a toggle "Gateway" 
- When enabled, show gateway_type dropdown and floor connection picker
- Gateway proxies get a special icon on the map (door/stairs icon)

---

## Feature 2: RSSI Walk-Around Calibration Wizard

### Concept
A guided wizard where the user physically walks to each BLE proxy and records 
the actual RSSI at a known distance. This creates per-proxy calibration data 
that dramatically improves distance estimation accuracy.

### Calibration Data Model
```typescript
interface ProxyCalibration {
  ref_rssi: number;       // RSSI measured at ref_distance
  ref_distance: number;   // Distance in meters (default: 1.0)
  attenuation?: number;   // Path-loss exponent (calculated or manual)
  calibrated_at?: number; // Timestamp of calibration
}

// Added to ProxyConfig:
interface ProxyConfig {
  // ... existing fields ...
  calibration?: ProxyCalibration;
}
```

### Wizard Flow
1. User clicks "Calibrate" button (new tab or toolbar button)
2. Panel shows list of all configured proxies with calibration status
3. User clicks a proxy → enters "calibration mode" for that proxy
4. UI shows: 
   - "Stand 1 meter from [Proxy Name] and click Confirm"
   - Live RSSI reading from that proxy (if available from Bermuda sensors)
   - Option to change the reference distance (default 1m)
5. User confirms → RSSI value is saved as ref_rssi at ref_distance
6. Optional: user can do a second point at a different distance for better accuracy
7. Attenuation factor is calculated: n = (ref_rssi - rssi2) / (10 * log10(d2/d1))
8. Repeat for each proxy
9. Calibration data is saved in config and used by trilateration

### How Calibration Improves Accuracy
The standard RSSI-to-distance formula is:
  distance = 10^((ref_rssi - measured_rssi) / (10 * n))

Where:
- ref_rssi = RSSI at 1 meter (typically -59 to -65 dBm, varies per device!)
- n = path-loss exponent (typically 2.0-4.0, varies per environment!)

Without calibration, we use generic defaults. With calibration, each proxy 
gets its own ref_rssi and n values, accounting for:
- Antenna orientation and quality
- Wall materials nearby
- Device enclosure effects
- Environmental factors

### UI in Panel
- New "Calibrate" button in the Proxies toolbar
- Calibration wizard as a modal/overlay on the map
- Each proxy shows calibration status (calibrated/uncalibrated, age)
- Live RSSI display during calibration
- Progress indicator showing how many proxies are calibrated

---

## Feature 3: Improved Proxy Discovery (Device Registry)

### Current Problem
- Uses `sensor.bermuda_*_distance_to_*` pattern matching
- Creates synthetic entity_ids that don't match real HA entities
- No area information

### New Approach
- Query `config/device_registry/list` for devices with Bermuda identifiers
- Query `config/area_registry/list` for area name resolution
- Match device registry entries to Bermuda scanner slugs
- Enrich proxy list with area names and better friendly names

---

## Feature 4: Cache-Busting

### Problem
HA aggressively caches panel_custom modules. Version updates don't reach the browser.

### Solution
- Add version to console.info output (already done)
- Store version in localStorage, detect version changes
- Show update notification banner when version changes
- Document: users should add `?v=X.Y.Z` to module_url in configuration.yaml
