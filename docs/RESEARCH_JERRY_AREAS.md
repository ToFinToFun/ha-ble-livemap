# Jerry's HA Area Registry (32 areas)

## Physical rooms (relevant for BLE map):
- Allrum, Badrum Nere, Badrum uppe, Celine, Elina, Garage, Hall
- Inglasning, Kök, Lägenhet, Selma, Sovrum, Tvättstuga, Vardagsrum

## Non-room areas (devices/categories):
- Arkiv, Axis, Bilen, Energi, Hus, Huset, Inget Område, Jerry
- Kamera, Larm, Plan1, Plan2, Server, Slask, Telldus, Utomhus, Väder, Trafik

## Key observations:
- None of the areas have floor_id set
- None of the areas have aliases set
- Only "Vardagsrum" is currently reported by Bermuda (only 1 BLE device tracked)
- Many areas are not physical rooms (Energi, Larm, Kamera etc.)
- This means we need to filter the area list to show only "room-like" areas
  OR let the user pick any area they want
