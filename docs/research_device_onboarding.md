# Research: BLE Device Types & Bermuda Onboarding

## How Bermuda Tracks Devices

Bermuda tracks any BLE device that sends advertisements. Three main categories:

### 1. Static MAC Address Devices (simplest)
- Cheap BLE trackers (Aliexpress)
- BTHome devices (Shelly, Xiaomi sensors)
- OBD-II bluetooth interfaces
- Simple smartwatches
- Thermometers, window sensors, plant sensors
- **How to add:** Go to Bermuda → Configure → Select Devices → pick from dropdown list
- **No extra integration needed**

### 2. IRK / Private Resolvable Address Devices (phones/watches)
- iPhone, iPad, Android phones
- Apple Watch, Samsung watches
- **Requires:** Private BLE Device core integration to be set up first
- **How to add:** 
  1. Find the device's IRK (Identity Resolving Key)
  2. Add it in Private BLE Device integration
  3. It then automatically appears in Bermuda's device list
  4. Select it in Bermuda → Configure → Select Devices

### 3. iBeacon Devices
- BLE beacons configured as iBeacons
- HA Companion app (iBeacon transmitter mode)
- **How to add:** Appears automatically in Bermuda's device list
- Select in Bermuda → Configure → Select Devices

## Current Pain Point

The user must:
1. Know which type of device they have
2. For phones: find IRK, set up Private BLE Device first
3. Go to Bermuda → Configure → Select Devices
4. Find the device in a long dropdown list
5. Submit
6. Then come to our panel and add it there too

## What Bermuda Exposes

After a device is added to Bermuda, it creates:
- `device_tracker.bermuda_<device_id>` — home/not home
- `sensor.bermuda_<device_id>_area` — nearest area
- `sensor.bermuda_<device_id>_area_distance` — distance to nearest proxy
- `sensor.bermuda_<device_id>_distance_to_<scanner>` — per-scanner distances (disabled by default)

## What We Can Do

### Option A: Scan HA for ALL BLE devices (not just Bermuda-tracked ones)
- HA's bluetooth integration sees all BLE advertisements
- We could list all visible BLE devices, even those not yet added to Bermuda
- Problem: We can't add them TO Bermuda programmatically (no service call for that)

### Option B: Show Bermuda's "untracked" devices
- Bermuda internally tracks ALL visible BLE devices
- `bermuda.dump_devices` service call returns ALL devices including untracked ones
- We could parse this to show "devices Bermuda can see but hasn't created sensors for"
- Problem: Still can't programmatically add them to Bermuda

### Option C: Simplify the Bermuda side
- Guide the user through adding devices to Bermuda from our UI
- Show step-by-step instructions based on device type
- Deep-link to Bermuda's configure page
- After they add in Bermuda, auto-detect the new device in our panel

### Option D: Work independently of Bermuda for some device types
- For static MAC devices: we could potentially read raw BLE data from ESPHome proxies
- But this would bypass Bermuda entirely and duplicate a lot of work
- Not recommended

## Recommended Approach: Enhanced Discovery + Guided Onboarding

1. **Auto-discover ALL Bermuda-tracked devices** (already works via discoverTrackableDevices)
2. **Show untracked BLE devices** via bermuda.dump_devices service call
3. **Guided onboarding wizard** that:
   - Shows all visible BLE devices (tracked + untracked)
   - For untracked: explains what type it is and how to add it
   - For phones: links to IRK guide + Private BLE Device setup
   - For iBeacons/static MAC: deep-links to Bermuda Configure
4. **Auto-detect when device becomes tracked** and offer to add to our map
5. **Device identification helpers**: show signal strength, manufacturer, last seen time
