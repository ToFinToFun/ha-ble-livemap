# Bermuda Scanner Key Insight

## Entity naming for per-scanner distance sensors:
- Entity name: `Distance to {scanner.name}` 
- Where `scanner.name` comes from BermudaDevice.make_name() which prefers:
  1. name_by_user (user-set name in HA UI)
  2. name_devreg (from device registry)
  3. name_bt_local_name (from BLE advertisement)
  4. name_bt_serviceinfo (from BLE service info)
  5. Falls back to manufacturer_slugified_address

## Entity ID for distance sensors:
- HA auto-generates entity_id from the entity name
- So `sensor.bermuda_<device>_distance_to_<scanner_name_slugified>`
- The scanner_name_slugified is the slugified version of scanner.name

## Scanner attributes in distance sensor:
- area_id: scanner's area_id
- area_name: scanner's area_name  
- area_scanner_mac: scanner's MAC address
- area_scanner_name: scanner's name

## Key for matching in our card:
The `_getDeviceDistances()` Strategy 1 strips proxy.entity_id to get proxyName:
```
const proxyName = proxy.entity_id.replace(/^.*\./, "").replace(/_proxy$/, "");
```
Then tries: `${prefix}_${proxyName}_distance` and `${prefix}_distance_${proxyName}`

So the proxy entity_id should match the scanner name slug that Bermuda uses.

## Best approach for discovery:
1. Parse existing Bermuda `sensor.bermuda_*_distance_to_*` entities (current approach)
2. BUT also query device registry to get area_id and friendly names
3. The scanner name suffix in `distance_to_<name>` IS the scanner's slugified name
4. We can match device registry entries to these by comparing slugified device names

## Conclusion:
Keep the current Bermuda sensor parsing for discovering proxy names,
but ENHANCE it with device registry data for areas and better names.
This is more reliable than trying to identify BLE scanners from device registry alone.
