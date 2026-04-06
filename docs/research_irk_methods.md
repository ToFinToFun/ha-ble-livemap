# IRK Extraction Methods Research

## What is IRK?
- Identity Resolving Key - used by BLE devices that rotate their MAC address for privacy
- Required for tracking iPhones, iPads, Apple Watches, Android phones, Samsung watches
- NOT required for: BLE tags, beacons, BTHome sensors (they use static MAC)

## Method 1: ESPHome IRK Capture Tool (RECOMMENDED - 2026 edition)
- Author: Derek Seaman (github.com/DerekSeaman/irk-capture)
- Works with: iPhone, iPad, Apple Watch, Android (Samsung Galaxy, Pixel), Samsung Watch
- Requires: Any ESP32 device (C3, C6, or basic ESP32)
- Process:
  1. Install ESPHome Device Builder add-on in HA
  2. Flash the irk-capture package to an ESP32
  3. For Apple devices: select "Heart Rate Monitor" BLE emulation
  4. For Android phones: select "Keyboard" BLE emulation
  5. Pair your phone/watch to the ESP32 via Bluetooth settings
  6. IRK appears on the ESPHome device page in HA
  7. Copy IRK into "Private BLE Device" integration in HA
- Note: ESP32 running IRK capture CANNOT be a BLE proxy simultaneously

## Method 2: Macbook Keychain (Apple only)
- Works with: iPhone, iPad, Apple Watch
- Requires: macOS computer
- Process: Pair device with Mac, extract IRK from Keychain Access
- Documented in Private BLE Device setup docs

## Method 3: ESPresence (Legacy)
- Works with: All devices
- Requires: ESP32 running ESPresence firmware
- Process: ESPresence captures IRKs during normal operation
- More complex to set up from scratch

## Method 4: Android Debug Logs (Advanced)
- Works with: Android devices
- Requires: PC, Android SDK, Wireshark
- Process: Enable BT debug logging, pair device, analyze with Wireshark
- Very complex, not recommended for most users

## After getting IRK:
1. In HA: Settings → Devices & Services → Add Integration → "Private BLE Device"
2. Paste the IRK
3. Bermuda will automatically detect the device and create sensors
4. Our livemap will auto-detect the new device_tracker entity

## Device types that DON'T need IRK:
- BLE beacons (iBeacon, Eddystone) - static MAC or UUID
- BLE tags (Tile, some trackers) - static MAC
- BTHome sensors (temperature, humidity) - static MAC
- Shelly devices - static MAC
- These are auto-discovered by Bermuda, just enable tracking in Bermuda settings

## HA Companion App (Android only):
- Can enable "BLE Transmitter" sensor in Companion App settings
- This makes the phone broadcast a BLE signal that Bermuda can track
- Alternative to IRK method for Android
