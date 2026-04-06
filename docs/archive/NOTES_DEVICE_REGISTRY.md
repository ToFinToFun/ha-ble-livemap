# Device Registry API Notes

## WebSocket API: `config/device_registry/list`
Returns array of device objects with:
- `id`: Unique device ID (HA-generated)
- `name`: Device name
- `name_by_user`: User-set name (if any)
- `manufacturer`: e.g. "Espressif Inc."
- `model`: e.g. "ESP32"
- `area_id`: Area ID (needs area_registry/list to resolve name)
- `connections`: Array of [connection_type, connection_id] tuples
  - For Bluetooth devices: `["bluetooth", "AA:BB:CC:DD:EE:FF"]`
- `identifiers`: Array of [domain, identifier] tuples
  - For ESPHome: `["esphome", "device_name"]`
- `config_entries`: Array of config entry IDs
- `via_device_id`: Parent device ID

## WebSocket API: `config/area_registry/list`
Returns array of area objects with:
- `area_id`: Unique area ID
- `name`: Area name (e.g. "Kök", "Hall")

## Strategy for BLE Proxy Discovery:
1. Call `config/device_registry/list`
2. Filter devices where `connections` includes a tuple with type "bluetooth"
   OR where `manufacturer` contains "Espressif" or "Shelly"
3. Call `config/area_registry/list` to resolve area_id -> area name
4. The proxy entity_id for config should use the Bermuda distance sensor suffix
   (the part after "distance_to_" in sensor.bermuda_*_distance_to_PROXYNAME)
5. Match device registry entries to Bermuda proxy names by comparing device names
