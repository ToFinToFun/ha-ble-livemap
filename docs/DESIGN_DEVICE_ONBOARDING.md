# Design: Enhanced Device Discovery & Onboarding

## Problem

Currently, to track a BLE device on the livemap, the user must:
1. Know what type of BLE device they have
2. For phones: find IRK, set up Private BLE Device integration
3. Go to Bermuda → Settings → Configure → Select Devices → find in dropdown
4. Submit to create Bermuda sensors
5. Come to our panel → Devices sidebar → find the device → click to add

This is too many steps. Most users only have one device tracked because of this.

## What Types of Devices Can Be Tracked

| Type | Examples | Prerequisites | How Bermuda Finds It |
|------|----------|---------------|---------------------|
| Static MAC | Cheap BLE tags, BTHome sensors, fitness bands | None | Auto-discovered |
| IRK (Private BLE) | iPhone, Android, Apple Watch, Samsung Watch | Private BLE Device integration + IRK | After Private BLE setup |
| iBeacon | BLE beacons, HA Companion app (iBeacon mode) | None (or Companion app config) | Auto-discovered |

## Solution: Three-Layer Enhanced Discovery

### Layer 1: Show ALL Bermuda-Visible Devices (via dump_devices)

Bermuda internally tracks ALL BLE devices it sees, even those not "selected" for
sensor creation. We can access this via `bermuda.dump_devices` service call.

This gives us a list of ALL visible BLE devices with:
- MAC address (or resolved address for IRK devices)
- Name (if advertised)
- RSSI from each proxy
- Whether it's already tracked (has sensors)

We show these in a new "Discover" tab or section in the sidebar:
- **Already tracked** (green check) — ready to add to our map
- **Visible but untracked** (blue dot) — needs to be added to Bermuda first
- **Signal strength bars** — shows how well each device is seen

### Layer 2: One-Click "Add to Bermuda" (where possible)

For devices that Bermuda can see but hasn't created sensors for:

**Option A: Direct Bermuda Config Update**
Bermuda stores its tracked device list in its config entry. We can potentially
update this via `hass.callWS` with `config_entries/update` or by calling
Bermuda's own options flow. However, this is fragile and may break.

**Option B: Guide + Deep Link** (safer, recommended)
Show a modal with:
1. "This device is visible to Bermuda but not yet tracked"
2. "Click here to open Bermuda settings" → deep link to `/config/integrations/integration/bermuda`
3. "Select this device: **<name>** (<MAC>)"
4. After user adds it, auto-detect the new device_tracker entity
5. Offer to add to our map immediately

### Layer 3: Smart Device Identification

Help users identify which BLE device is which:

1. **Signal Strength Indicator**: Show live RSSI from each proxy
   - "Strongest signal from: Kitchen proxy" → device is probably in kitchen
   
2. **"Find My Device" Mode**: 
   - User clicks a device → we show its signal strength updating live
   - User walks around with the device → signal changes help identify it
   
3. **Device Type Detection**:
   - Parse manufacturer data from BLE advertisements
   - Show icons: 📱 Phone, ⌚ Watch, 🏷️ Tag, 🌡️ Sensor, ❓ Unknown
   
4. **"Is This Your Phone?" Helper**:
   - For IRK devices: "We see a device that might be an iPhone. 
     To track it, you need to set up Private BLE Device."
   - Link to IRK guide for their platform

## Implementation Plan

### Phase 1: Enhanced Device Sidebar (minimum viable)

Enhance `_discoverTrackableDevices()` to also show:
- Bermuda device_tracker entities that exist but aren't added to our map (already works)
- Better device info: show area, signal strength, device type icon
- "New device" banner (like we did for proxies) when a new device_tracker appears

### Phase 2: BLE Device Scanner (via bermuda.dump_devices)

Add a "Scan for Devices" button that calls `bermuda.dump_devices`:
- Shows ALL visible BLE devices in a modal/panel
- Categorizes: Tracked | Untracked | Unknown
- For untracked: shows "Add to Bermuda" guidance
- For tracked: shows "Add to Map" button
- Live RSSI updates to help identify devices

### Phase 3: Guided Setup Wizard

A step-by-step wizard for new users:
1. "What do you want to track?" → Phone / Watch / BLE Tag / Other
2. Based on answer, guide through prerequisites (Private BLE Device, etc.)
3. Deep-link to relevant HA settings pages
4. Auto-detect when device appears in Bermuda
5. Add to map with quick calibration

## Technical Details

### bermuda.dump_devices Service Call

```typescript
const result = await hass.callService('bermuda', 'dump_devices', {});
// Returns device data in service response
```

Or via WebSocket:
```typescript
const result = await hass.callWS({
  type: 'bermuda/dump_devices',
});
```

Note: Need to verify exact API. May need to check Bermuda source code.

### Device Type Detection Heuristics

From BLE advertisement data (if available in Bermuda dump):
- Company ID 0x004C (Apple) → iPhone/iPad/Watch/AirPods
- Company ID 0x0075 (Samsung) → Samsung phone/watch
- Service UUID 0xFE9F (Google) → Android/Pixel
- BTHome service data → BTHome sensor
- iBeacon advertisement → iBeacon device
- Otherwise → Generic BLE device

### New Device Auto-Detection

Similar to proxy detection, check every 2s:
```typescript
private _detectNewDevices(): void {
  const tracked = discoverTrackableDevices(this.hass);
  const configured = new Set(
    (this._config.tracked_devices || []).map(d => d.entity_prefix)
  );
  
  for (const device of tracked) {
    if (!configured.has(device.entityId) && !this._lastKnownDevices.has(device.entityId)) {
      // New device appeared!
      this._newDeviceAlerts.push({ ... });
    }
  }
}
```
