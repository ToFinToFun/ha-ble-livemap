# Bermuda Entity Naming

## Per-device entities:
- `device_tracker.bermuda_<device_name>` - Home/Away
- `sensor.bermuda_<device_name>_area` - Area name
- `sensor.bermuda_<device_name>_distance` - Distance to nearest scanner

## Per-device-per-scanner entities (disabled by default):
- `sensor.bermuda_<device_name>_distance_to_<scanner_name>` - Distance from specific scanner
- These are the entities we currently parse in `_discoverBermudaProxies()`

## Key insight:
The `<scanner_name>` suffix in `distance_to_<scanner_name>` corresponds to the HA device name 
of the BLE proxy/scanner, slugified (lowercase, spaces to underscores).

So if a Shelly device is named "Shelly Köksbord" in HA, the sensor would be:
`sensor.bermuda_<device>_distance_to_shelly_koksbord`

## Strategy:
1. Get device registry list -> find BLE scanner devices
2. Their device name (slugified) = the scanner_name suffix in Bermuda sensors
3. Use this as the proxy entity_id in our config
4. The card's _getDeviceDistances() already handles matching via Strategy 2 & 3
   using `scanners` attribute on device_tracker entities
