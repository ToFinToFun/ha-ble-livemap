# Floor Click-Through Bug Analysis

## Problem
When editing Plan2 (floor 2), clicking on zones/proxies/doors interacts with Floor 1 items underneath.

## Root Cause
The `_handleMapClick` and `_handleMapMouseDown` methods iterate through ALL zones/proxies/doors
without filtering by the active floor's `floor_id`. Meanwhile, the rendering methods DO filter
(showing only items on the active floor), but items without `floor_id` show on ALL floors.

## Places to fix in panel.ts:

### 1. _handleMapClick zone selection (line ~1201)
- Loops through ALL zones without floor_id check
- FIX: Skip zones not on active floor

### 2. _handleMapClick door selection (line ~1182)  
- Loops through ALL doors without floor_id check
- FIX: Skip doors not on active floor

### 3. _handleMapMouseDown proxy drag (line ~1226)
- Loops through ALL proxies without floor_id check
- FIX: Skip proxies not on active floor

### 4. _handleMapMouseDown door drag (line ~1238)
- Loops through ALL doors without floor_id check
- FIX: Skip doors not on active floor

### 5. _renderZoneOverlays (line ~6477)
- Shows zones without floor_id on ALL floors (by design for legacy)
- This is OK for viewing but causes confusion in editing

### 6. _renderProxyMarkers (line ~6314)
- Shows proxies without floor_id on ALL floors
- Same issue

### 7. _renderDoorMarkers (line ~6283)
- Shows doors without floor_id on ALL floors
- Same issue

## Fix Strategy
Add floor_id filtering helper and use it consistently in all click/drag handlers.
The filter logic should be: `if (floor && item.floor_id && item.floor_id !== floor.id) continue;`
This matches the rendering logic and ensures clicks only affect items on the active floor.
