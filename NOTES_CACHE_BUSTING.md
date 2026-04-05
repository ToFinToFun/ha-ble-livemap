# Cache Busting Research Notes

## Problem
Home Assistant uses a Service Worker that caches JS files aggressively.
- Browser cache clear (Ctrl+Shift+R) doesn't work because the Service Worker serves from its own cache
- Query parameters (?v=1.7.1) don't work because HACS controls the `hacstag` parameter
- The Service Worker cache is separate from browser cache

## HACS hacstag
- HACS adds `?hacstag=XXXXX` to resource URLs automatically
- This should change on updates, but sometimes doesn't work correctly
- Even Bubble Card developer reports issues with this

## Solutions that work:

### 1. Self-loading with cache-bust (best for non-HACS manual installs)
The card's main JS file acts as a loader that dynamically imports the actual code with a version hash.

### 2. Version-stamped filename in rollup output
Instead of `ble-livemap-card.js`, output `ble-livemap-card.js` but include a content hash.
Problem: HACS expects a specific filename.

### 3. Programmatic Service Worker cache invalidation
The card itself can clear the Service Worker cache for its own URL on load.
This is what card-mod does.

### 4. Best approach: Hybrid
- Keep `ble-livemap-card.js` as a thin loader
- The loader checks version, and if changed, clears the SW cache entry and reloads
- The actual card code is in a separate chunk or inline

## Implementation Plan
Since we have a single-file output, the best approach is:
1. On card load, check if CARD_VERSION matches what's stored in localStorage
2. If version mismatch, programmatically delete the Service Worker cache entry for our file
3. Force reload by re-importing with a cache-busting query param
4. Store new version in localStorage
