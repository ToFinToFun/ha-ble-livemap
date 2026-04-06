# Data Flow Analysis: Panel → Card

## How it works:

1. **Panel (panel.ts)** = the editor/configuration UI
   - Stores config in `localStorage` under key `ble-livemap-panel-config`
   - Every change calls `_updateConfig()` → `_saveConfigLocal()` → writes to localStorage
   - When user clicks "Spara & uppdatera kort" (Save & update cards), `_saveAndPush()` is called
   - `_saveAndPush()` iterates ALL Lovelace dashboards, finds cards of type `custom:ble-livemap-card`, and REPLACES their entire config with the panel's config
   - It does this via `lovelace/config/save` WebSocket call

2. **Card (ble-livemap-card.ts)** = the live view
   - Receives config via `setConfig(config)` which is called by Lovelace when the card config changes
   - The card ONLY reads from its Lovelace config object, NOT from localStorage
   - So changes in the panel are NOT visible in the card until "Save & update cards" is clicked

## The disconnect Jerry sees:
- Panel saves to localStorage immediately
- Card reads from Lovelace config
- If "Save & update cards" hasn't been clicked, or if it failed to find the card, the card won't see the changes
- Also: if the card is on a YAML dashboard (not storage mode), the panel can't update it

## Key insight:
- The panel is the SINGLE source of truth for editing
- The card is a READ-ONLY consumer of the Lovelace config
- The "Save & update cards" button is the bridge between them

## What Jerry might be experiencing:
1. He edited zones in the panel but didn't click "Save & update cards"
2. OR the save found 0 dashboards to update (YAML mode?)
3. OR the zone names were renamed in HA Areas but the panel config still has old names
