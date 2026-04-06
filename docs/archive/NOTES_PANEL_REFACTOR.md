# Panel Refactor Notes

## Current Entity Discovery (lines 342-409)
- Detects proxies by keyword matching: ble_proxy, bluetooth_proxy, bermuda+proxy/scanner, espresense+node, esphome+bluetooth/ble, shelly+bluetooth
- Problem: Shelly devices don't have "bluetooth" in entity_id - they're just regular Shelly entities that happen to have BT scanning
- Bermuda sensors like "distance_to_*" contain proxy names in entity_id

## Smart Proxy Discovery Strategy
1. Find all `sensor.bermuda_*_distance_to_*` entities
2. Extract unique proxy identifiers from the suffix after "distance_to_"
3. These ARE the actual BLE scanners/proxies
4. Match them back to HA entities for friendly names

## Smart Device Discovery Strategy
1. Only show `device_tracker.bermuda_*` entities (these have actual position data)
2. Filter out all helper sensors (distance, RSSI, area, calibration, etc.)

## Multi-Floor
- FloorConfig exists in types.ts with id, name, image, image_width, image_height
- Panel has _activeFloorIdx and _getFloors() but no UI to add/remove floors
- Need to add floor management in the map tab

## Key proxy names from Jerry's setup (from Bermuda config):
Shelly Garage Server, Shelly LGH Värme L2, Motorvärmare Stolpe, Shelly LGH Värme L3,
Shelly LGH Värme L1 (Golvvärme), Shelly 1PM Handdukstork Uppe, Bluetooth Proxy,
Köket Utebelysning, Shelly 1PM Handdukstork Badrum Nere, Shelly Elbilsladdning,
Shelly 1PM Element Garage, Shelly Köksbord, Shelly 1PM Golvvärme Hall,
Vardagsrum Garderober, Köks Ö Lampa, Matkällare, Köksfönster Framsida
