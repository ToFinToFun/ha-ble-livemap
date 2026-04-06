# Jerry's BLE Devices (from Bluetooth integration)

All 17 devices are under the **Bluetooth** integration, NOT Bermuda.

| Device Name | MAC | Area | Manufacturer | Model |
|---|---|---|---|---|
| Badrum Nere Handukstork | 44:17:93:D4:E6:5E | Badrum Nere | Espressif Inc. (shelly) | SNSW-001P16EU |
| Badrum Uppe Handukstork | 44:17:93:93:83:02 | Badrum uppe | Espressif Inc. (shelly) | SNSW-001P16EU |
| Bluetooth Proxy 40d6f0 | 64:B7:08:40:D6:F2 | Server | Espressif Inc. (esphome) | esp32dev |
| Golvvärme hall | 80:64:6F:E4:4C:86 | Hall | Espressif Inc. (shelly) | SNSW-001P16EU |
| Köket Utebelysning | A8:03:2A:BC:45:B2 | Utomhus | Espressif Inc. (shelly) | SNSW-001X16EU |
| Köks-ö Lampa | A8:03:2A:BA:6C:C2 | Kök | Espressif Inc. (shelly) | SNSW-001X16EU |
| Köksbord | 7C:87:CE:63:BD:0A | Kök | Espressif Inc. (shelly) | SNSW-001X16EU |
| Köksfönster Framsida | A8:03:2A:BD:42:E6 | Kök | Espressif Inc. (shelly) | SNSW-001X16EU |
| Matkällare | B4:8A:0A:22:67:0E | Kök | Espressif Inc. (shelly) | SNSW-102P16EU |
| Motorvärmare Stolpe | 80:64:6F:E4:21:52 | Utomhus | Espressif Inc. (shelly) | SNSW-001P16EU |
| Shelly 1PM Element Garage | 84:FC:E6:3E:4C:1A | Garage | Espressif Inc. (shelly) | S3SW-001P8EU |
| Shelly Elbilsladdning | E4:65:B8:F1:7A:F2 | Utomhus | Espressif Inc. (shelly) | SNSW-001P16EU |
| Shelly LGH Värme L1 | 84:FC:E6:3F:24:7E | Garage | Espressif Inc. (shelly) | S3SW-001P8EU |
| Shelly LGH Värme L1 (Golvvärme) | CC:7B:5C:83:81:B2 | Lägenhet | Espressif Inc. (shelly) | SNSW-001P16EU |
| Shelly LGH Värme L2 | 84:FC:E6:3E:50:A6 | Lägenhet | Espressif Inc. (shelly) | S3SW-001P8EU |
| Shelly LGH Värme L3 | EC:DA:3B:C5:95:B2 | Lägenhet | Espressif Inc. (shelly) | S3SW-001P8EU |
| Vardagsrum Garderober | 54:32:04:B9:87:86 | Vardagsrum | Espressif Inc. (shelly) | SNSW-001X8EU |

## Key Insight
- These are all Shelly switches/relays that have BLE proxy capability
- They are registered under the "Bluetooth" integration in HA
- The device registry has: name, MAC address (in connections), area_id
- Discovery should use `config/device_registry/list` and filter by integration = "bluetooth"
