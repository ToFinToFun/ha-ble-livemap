# Cache-Busting Design — Definitive Solution

## Problem Analysis

Home Assistant uses a Service Worker with a `file-cache` in Cache Storage.
When a JS file is loaded, it's cached by URL. Even if the file on disk changes,
the Service Worker serves the cached version until the URL changes.

HACS uses `?hacstag=XXXXX` to bust the cache, but this doesn't always work
because:
1. The user has `panel_custom` in configuration.yaml with a hardcoded URL
2. The hacstag doesn't always update properly
3. Even after clearing caches manually, the Service Worker can re-cache the old file

## Root Cause in Our Case

The user's `configuration.yaml` has:
```yaml
module_url: /hacsfiles/ha-ble-livemap/ble-livemap-card.js
```

This URL never changes between versions. The Service Worker caches it once
and serves it forever.

## Solution: Loader + Core Architecture

Split the card into two files:

### 1. `ble-livemap-card.js` (The Loader — ~20 lines, NEVER changes logic)
This is what the user points to in configuration.yaml and what HACS registers.
It does ONE thing: dynamically imports the real card code with a cache-busting
timestamp appended to the URL.

```javascript
// This file is intentionally tiny and stable.
// It dynamically loads the actual card code with cache-busting.
const baseUrl = new URL('ble-livemap-core.js', import.meta.url).href;
const bustUrl = `${baseUrl}?t=${Date.now()}`;
import(bustUrl);
```

Because `import()` with a unique `?t=` parameter creates a NEW URL every time,
the Service Worker will NEVER serve a cached version of `ble-livemap-core.js`.

### 2. `ble-livemap-core.js` (The Real Card — all actual code)
Contains everything: the card, panel, renderer, trilateration, etc.
This file changes with every update.

## Why This Works

1. The loader URL (`ble-livemap-card.js`) stays the same — Service Worker caches it
2. But the loader's code NEVER needs to change — it always does the same thing
3. Every time the loader runs, it imports `ble-livemap-core.js?t=1712345678`
4. The `?t=` timestamp is different every page load
5. Service Worker sees a new URL → fetches from disk → gets the latest version
6. No manual cache clearing, no version parameters, no user intervention EVER

## Rollup Changes

- Output TWO files: `ble-livemap-card.js` (loader) and `ble-livemap-core.js` (code)
- The loader is a separate entry point, not bundled with the rest
- hacs.json filename stays `ble-livemap-card.js`

## One-Time User Action

The user needs to ensure configuration.yaml points to:
```yaml
module_url: /hacsfiles/ha-ble-livemap/ble-livemap-card.js
```
(without any ?v= or ?hacstag= suffix — the loader handles it)

And then clear cache ONE final time or restart HA to load the new loader.
After that, updates work automatically forever.
