# HA Area Registry WebSocket API

## Available Commands

### List Areas
```json
{ "type": "config/area_registry/list" }
```
Returns: array of area entries with `area_id`, `name`, `aliases`, `floor_id`, `icon`, `labels`, `picture`

### Create Area (requires admin)
```json
{
  "type": "config/area_registry/create",
  "name": "Kitchen",
  "floor_id": "optional_floor_id",
  "icon": "mdi:silverware-fork-knife",
  "aliases": ["Köket"],
  "labels": ["room"]
}
```
Returns: the created area entry

### Update Area (requires admin)
```json
{
  "type": "config/area_registry/update",
  "area_id": "existing_area_id",
  "name": "New Name"
}
```

### Delete Area (requires admin)
```json
{
  "type": "config/area_registry/delete",
  "area_id": "area_to_delete"
}
```

## Key Observations
- HA Areas support **aliases** — so "Kök" can have alias "Köket"
- HA Areas support **floor_id** — can be linked to HA Floors
- HA Areas support **icon** and **picture**
- Creating/updating/deleting requires admin privileges
- Area names must be unique (ValueError if duplicate)

## Strategy for Zone-Area Sync
1. When user creates a zone on the map → offer to create a matching HA Area
2. When user opens editor → show existing HA Areas as zone templates
3. Zone name always comes FROM the HA Area (single source of truth)
4. Zone's ha_area_id is the permanent link
