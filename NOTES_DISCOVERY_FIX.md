# Discovery Fix Notes

## Current approach (broken):
- _discoverBermudaProxies() uses `sensor.bermuda_*_distance_to_*` pattern
- Creates synthetic entity IDs like `bermuda_proxy_shelly_koksbord`
- These don't match real HA entities, so sidebar can't show them properly

## New approach (use HA Bluetooth integration):
- HA's Bluetooth integration lists all BLE scanners as devices
- Each scanner device has manufacturer "Espressif Inc." and connections of type "bluetooth"
- They have area_id assigned (Kök, Hall, Garage, etc.)
- We can use `hass.callWS({ type: "config/device_registry/list" })` to get all devices
- Filter by: has bluetooth connection AND has manufacturer containing "Espressif" or "shelly"
- OR better: use `hass.callWS({ type: "bluetooth/adapters" })` if available

## Jerry's scanners (from screenshot):
All are Espressif Inc. (shelly) or Espressif Inc. (esphome) with Bluetooth type
They have areas assigned: Kök, Hall, Garage, Utomhus, Badrum uppe, Server, Vardagsrum, Lägenhet

## Also need to fix:
- Cache busting for panel_custom (version in URL)
- .gz file issue
