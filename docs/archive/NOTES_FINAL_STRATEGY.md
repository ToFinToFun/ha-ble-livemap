# Final Discovery Strategy

## Key findings from Bermuda source code:

1. Scanner devices in device registry have:
   - identifiers: {("bermuda", unique_id)} where unique_id = MAC address
   - connections: {("network_mac", wifi_mac), ("bluetooth", ble_mac)}
   - name: scanner.name (from make_name())

2. Per-scanner distance sensors are named:
   - Entity name: "Distance to {scanner.name}"
   - Entity ID: sensor.bermuda_{device}_distance_to_{slugified_scanner_name}

3. Scanner device_info uses CONNECTION_BLUETOOTH and CONNECTION_NETWORK_MAC

## Implementation plan:

### Approach: Hybrid (Bermuda sensors + Device Registry enrichment)

1. **Keep current Bermuda sensor parsing** to discover proxy names from 
   `sensor.bermuda_*_distance_to_*` - this reliably gives us the scanner slugs

2. **Query device registry** to enrich with:
   - area_id -> area_name (via area_registry)
   - Better friendly names
   - Confirmation that these are real BLE scanners

3. **Match strategy**: 
   - Parse `distance_to_<scanner_slug>` from Bermuda sensors
   - Query device registry for devices with `bermuda` in identifiers
   - Match by comparing slugified device names to scanner slugs
   - Get area_id from matched device registry entry

4. **Proxy entity_id in config**: Use the scanner slug (e.g., "shelly_koksbord")
   - This matches what _getDeviceDistances() Strategy 1 expects
   - Strategy 2 & 3 match by entity_id or name, so also works

### Alternative simpler approach:
Just query device registry for ALL devices with bluetooth connections,
filter by manufacturer containing "Espressif" or "Shelly",
and use their slugified names as proxy identifiers.
This would work without any Bermuda sensors being enabled.
