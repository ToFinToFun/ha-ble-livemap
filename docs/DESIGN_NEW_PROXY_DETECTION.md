# Design: New Proxy Auto-Detection & Quick Calibration

## Problem

When a user adds a new BLE proxy to their Home Assistant system:
1. Bermuda auto-creates `sensor.bermuda_*_distance_to_<new_proxy>` entities
2. Our `discoverProxySlugs()` picks it up immediately in the sidebar
3. BUT: the proxy is not in `config.proxies` → tracking engine ignores it
4. After placement: no calibration → uses Bermuda raw distance (often inaccurate)
5. Existing calibration samples may already contain RSSI data from the new proxy
   (if it was broadcasting when samples were taken), but we never check

## Solution: Three-Layer Approach

### Layer 1: Auto-Detection Notification

In `_updateLiveDevices()` (runs every 2s), compare discovered proxies vs configured:

```
discovered = discoverProxySlugs(hass)  // all Bermuda proxies
configured = config.proxies.map(p => extractProxySlug(p.entity_id))
new_proxies = discovered - configured
```

If `new_proxies.length > 0` and we haven't dismissed them, show a notification
banner at the top of the map area:

  "🆕 New proxy detected: <name> — Click to place on map"

State: `_newProxyAlerts: { slug, name, area, dismissed }[]`

### Layer 2: Quick-Place

When user clicks the notification:
1. Auto-add the proxy to config (like _addEntityAsProxy)
2. Enter placement mode (like existing flow)
3. After placement → immediately trigger Layer 3

### Layer 3: Quick Calibration (The Smart Part)

After a new proxy is placed, we have three options, tried in order:

#### Option A: Retroactive Calibration from Existing Samples
Check if any existing `calibration_samples` contain RSSI readings keyed by
the new proxy's slug. This is possible because `_recordCalibrationSample()`
captures RSSI from ALL visible proxies at sample time — including ones not
yet in config.

If we find ≥2 samples with readings for the new proxy:
- Run `_autoCalibrate()` — it will now include the new proxy
- Show toast: "✅ Auto-calibrated from existing samples (R²=0.xx)"
- No user action needed!

If we find 1 sample:
- Use it to estimate ref_rssi at known distance
- Set a baseline calibration with default attenuation (n=2.5)
- Show toast: "📊 Baseline calibration from 1 existing sample"

#### Option B: Quick 1-Point Calibration
If no existing samples have data for this proxy:
- Show a prompt: "Stand ~1m from the new proxy and click 'Quick Calibrate'"
- Take a single RSSI reading at known distance (1m)
- Set ref_rssi = measured RSSI, ref_distance = 1.0, attenuation = 2.5 (default)
- This gives a reasonable baseline without full calibration

#### Option C: Suggest Wizard Re-run
After quick calibration, show a subtle suggestion:
"💡 For better accuracy, run Guided Calibration to include the new proxy"

## Implementation Details

### New State Properties
```typescript
@state() private _newProxyAlerts: Array<{
  slug: string;
  name: string;
  area: string;
  entity_id: string; // synthetic entity_id for _addEntityAsProxy
  dismissed: boolean;
}> = [];
private _lastKnownProxySlugs: Set<string> = new Set();
```

### Detection Logic (in _updateLiveDevices)
```
const discovered = discoverProxySlugs(this.hass);
const configuredSlugs = new Set(
  (this._config.proxies || []).map(p => extractProxySlug(p.entity_id))
);
const newSlugs = [...discovered.keys()].filter(s => !configuredSlugs.has(s));

// Only alert for truly new ones (not already dismissed)
for (const slug of newSlugs) {
  if (!this._lastKnownProxySlugs.has(slug)) {
    // New proxy appeared!
    this._newProxyAlerts = [...alerts, { slug, name, area, ... }];
  }
}
this._lastKnownProxySlugs = new Set(discovered.keys());
```

### Quick Calibrate After Placement
```
private _quickCalibrateNewProxy(proxyIdx: number): void {
  const proxy = config.proxies[proxyIdx];
  const proxySlug = extractProxySlug(proxy.entity_id);
  const samples = config.calibration_samples || [];
  
  // Check existing samples for this proxy's RSSI
  const matchingSamples = samples.filter(s => s.readings[proxySlug] !== undefined);
  
  if (matchingSamples.length >= 2) {
    // Option A: full retroactive calibration
    this._autoCalibrate();
    toast("Auto-calibrated new proxy from existing samples!");
  } else if (matchingSamples.length === 1) {
    // Option A (partial): baseline from 1 sample
    const sample = matchingSamples[0];
    const rssi = sample.readings[proxySlug];
    const dx = ((sample.x - proxy.x) / 100) * imageWidth;
    const dy = ((sample.y - proxy.y) / 100) * imageHeight;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Estimate ref_rssi at 1m using default n=2.5
    const refRssi = Math.round(rssi + 10 * 2.5 * Math.log10(dist));
    proxy.calibration = { ref_rssi: refRssi, ref_distance: 1.0, attenuation: 2.5 };
    toast("Baseline calibration from 1 existing sample");
  } else {
    // Option B: prompt for quick 1-point calibration
    this._quickCalibProxyIdx = proxyIdx;
    this._quickCalibMode = true;
    toast("Stand ~1m from the new proxy and click 'Quick Calibrate'");
  }
}
```

### Notification Banner UI
Placed above the map, below floor tabs:
```html
<div class="new-proxy-banner">
  <span class="new-proxy-icon">🆕</span>
  <span class="new-proxy-text">New proxy: <strong>{name}</strong></span>
  <button @click=${place}>Place on Map</button>
  <button @click=${dismiss}>✕</button>
</div>
```

### Quick Calibrate Mode UI
After placement, a small overlay near the proxy:
```html
<div class="quick-calib-prompt">
  <p>Stand ~1m from this proxy</p>
  <button @click=${quickCalib}>📡 Quick Calibrate</button>
  <span class="quick-calib-rssi">${currentRssi} dBm</span>
</div>
```
