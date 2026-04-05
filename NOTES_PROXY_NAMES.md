# Proxy Names from Bermuda Distance Sensors

The activated distance sensors follow the pattern:
`sensor.bermuda_{device_id}_distance_to_{scanner_slug}`

Scanner slugs (these are the proxy names we need to match):
1. bluetooth_proxy (ESPHome ESP32)
2. shelly_koksbord
3. koks_o_lampa
4. koksfonster_framsida
5. koket_utebelysning
6. shelly_1pm_golvvarme_hall
7. shelly_1pm_handdukstork_badrum_nere
8. shelly_1pm_handdukstork_uppe
9. vardagsrum_garderober
10. shelly_1pm_element_garage
11. shelly_garage_server
12. shelly_elbilsladdning
13. motorvarmare_stolpe
14. shelly_lgh_varme_l1_golvvarme
15. shelly_lgh_varme_l2
16. shelly_lgh_varme_l3
17. shelly_2pm_matkallare

## Key insight for discovery:
The Smart filter should parse `sensor.bermuda_*_distance_to_*` entities.
For each unique `distance_to_{scanner_slug}` suffix, create a proxy entry.
The proxy entity_id should be set to the scanner_slug (e.g., `shelly_koksbord`).
This is what `_getDeviceDistances()` in ble-livemap-card.ts Strategy 1 uses to match.
