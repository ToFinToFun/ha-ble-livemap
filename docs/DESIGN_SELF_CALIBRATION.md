# Design: Self-Calibration System

## Concept

Two complementary calibration workflows in the debug panel:

### Mode 1: "I Am Here" — Force Position & Record Fingerprint

The user selects a device in the debug panel, then clicks a button "📍 I Am Here"
which enters a mode where they click on the map to say "this device is RIGHT HERE".

When they click:
1. The system records the current RSSI from every visible proxy at that moment
2. This creates a **calibration sample**: `{ position: {x, y}, rssi_readings: { proxyId: rssi, ... }, timestamp }`
3. Multiple samples build up a **fingerprint database** stored in config
4. The system uses these samples to compute per-proxy path-loss exponent (attenuation `n`)
   by fitting the log-distance model: `RSSI = refRSSI - 10*n*log10(d/refDist)`

### Mode 2: "Tweak Distance" — Manual Override per Proxy

In the debug table, each proxy row gets a small slider/input that lets the user
adjust the distance offset for that proxy. This is a simple additive correction:
`corrected_distance = raw_distance + offset`

The offset is stored per-proxy in config as `calibration.distance_offset`.

### Data Model

```typescript
// New: stored in BLELivemapConfig
interface CalibrationSample {
  id: string;           // unique ID
  x: number;            // % position on map
  y: number;            // % position on map
  floor_id: string;
  timestamp: number;
  readings: {           // proxy_entity_id → RSSI at that moment
    [proxyId: string]: number;
  };
}

// Extended ProxyCalibration
interface ProxyCalibration {
  ref_rssi: number;
  ref_distance: number;
  attenuation?: number;
  calibrated_at?: number;
  distance_offset?: number;  // NEW: manual tweak offset in meters
}

// In BLELivemapConfig
interface BLELivemapConfig {
  ...
  calibration_samples?: CalibrationSample[];  // NEW
}
```

### Auto-Learning Pipeline

When calibration_samples exist:
1. For each proxy, collect all samples where that proxy had an RSSI reading
2. For each sample, compute the real distance from sample position to proxy position
   (using the floor's image_width/image_height for % → meters conversion)
3. Fit the log-distance model to find optimal `ref_rssi` and `attenuation` per proxy
4. Store the computed values in `proxy.calibration`
5. These values are then used by `applyRssiCalibration()` during live tracking

### UI Design

In the debug panel, below the device selector:
- **"📍 I Am Here" button** — enters placement mode
  - Click on map → records fingerprint → shows confirmation toast
  - Shows count of samples collected
- **"🧮 Auto-Calibrate" button** — runs the fitting algorithm on all samples
  - Updates all proxy calibrations
  - Shows before/after comparison
- **"🗑 Clear Samples" button** — removes all calibration samples

In the debug table, each proxy row gets:
- A small ±offset input (meters) for manual distance tweaking
- Shows the computed vs raw distance when calibration is active
