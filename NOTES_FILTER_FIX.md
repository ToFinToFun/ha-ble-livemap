# Discovery Filter Fix

## Problem
Smart filter shows too many entities - routers, switches, computers etc.
Should only show the 17 actual BLE proxies.

## What's showing that shouldn't:
- LGH AC-PRO (access point)
- Mac Mini (computer)
- Main Router (router)
- Main Switch (network switch)
- MAINFRAME (computer)
- Motorvärmare Carport (heater devices)

## What SHOULD show (the 17 BLE proxies from Bluetooth integration):
1. Badrum Nere Handukstork (44:17:93:D4:E6:5E) - Shelly SNSW-001P16EU
2. Badrum Uppe Handukstork (44:17:93:93:83:02) - Shelly SNSW-001P16EU
3. Bluetooth Proxy 40d6f0 (64:B7:08:40:D6:F2) - ESPHome esp32dev
4. Golvvärme hall (80:64:6F:E4:4C:B6) - Shelly SNSW-001P16EU
5. Köket Utebelysning (A8:03:2A:BC:45:B2) - Shelly SNSW-001X16EU
6. Köks-ö Lampa (A8:03:2A:BA:6C:C2) - Shelly SNSW-001X16EU
7. Köksbord (7C:87:CE:63:BD:0A) - Shelly SNSW-001X16EU
8. Köksfönster Framsida (A8:03:2A:BD:42:E6) - Shelly SNSW-001X16EU
9. Matkällare (B4:8A:0A:22:67:0E) - Shelly SNSW-102P16EU
10. Motorvärmare Stolpe (80:64:6F:E4:21:52) - Shelly SNSW-001P16EU
11. Shelly 1PM Element Garage (B4:FC:E6:3E:4C:1A) - Shelly S3SW-001P8EU
12. Shelly Elbilsladdning (E4:65:B8:F1:7A:F2) - Shelly SNSW-001P16EU
13. Shelly LGH Värme L1 (B4:FC:E6:3F:24:7E) - Shelly S3SW-001P8EU
14. Shelly LGH Värme L1 Golvvärme (CC:7B:5C:83:81:B2) - Shelly SNSW-001P16EU
15. Shelly LGH Värme L2 (B4:FC:E6:3E:50:A6) - Shelly S3SW-001P8EU
16. Shelly LGH Värme L3 (EC:DA:3B:C5:95:B2) - Shelly S3SW-001P8EU
17. Vardagsrum Garderober (54:32:04:B9:87:B6) - Shelly SNSW-001X8EU

## Key difference:
All real BLE proxies are manufactured by "Espressif Inc. (shelly)" or "Espressif Inc. (esphome)"
The non-proxy devices have different manufacturers.

## Filter strategy:
Filter by manufacturer containing "shelly" or "esphome" within the Bluetooth integration devices.
