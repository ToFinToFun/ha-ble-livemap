# ha-ble-livemap — Architecture

## Tech Stack

| Technology | Purpose |
|---|---|
| **Lit 3 + TypeScript 5** | Web Components framework (HA standard) |
| **Rollup 4** | Bundling with cache-busting loader/core split |
| **Canvas API** | High-performance rendering (60fps animations) |
| **IndexedDB** | Local history storage (no HA database load) |
| **pnpm** | Package manager |
| **HACS** | Distribution via Home Assistant Community Store |

## Build Architecture (Cache-busting)

Rollup produces two output files to solve Home Assistant's aggressive service-worker caching:

```
src/loader.ts        → dist/ble-livemap-loader.js   (stable, rarely changes)
src/ble-livemap-card.ts → dist/ble-livemap-core.js  (all code, changes every release)
```

The **loader** is what `panel_custom` points to. It dynamically imports the **core** file with a `?v=timestamp` parameter, ensuring the browser always fetches the latest version.

## Project Structure

```
src/
├── loader.ts             # Cache-busting loader (stable entry point)
├── ble-livemap-card.ts   # Main Lovelace card element
├── panel.ts              # Sidebar panel (full config UI, live tracking)
├── editor.ts             # Lovelace visual config editor
├── bermuda-utils.ts      # Centralized Bermuda entity parsing & discovery
├── types.ts              # TypeScript interfaces and constants
├── const.ts              # Version number and card name
├── trilateration.ts      # Weighted least-squares position calculation
├── renderer.ts           # Canvas rendering (devices, zones, trails, doors)
├── history-store.ts      # IndexedDB history management
└── localize/
    ├── localize.ts
    └── languages/
        ├── en.json
        └── sv.json
```

## Module Responsibilities

The codebase follows a clear separation of concerns. Each module has a single responsibility, and shared logic is centralized in utility modules.

**bermuda-utils.ts** is the single source of truth for all Bermuda entity ID parsing, slug extraction, distance collection, and entity discovery. The three consumer files (card, panel, editor) import from this module instead of duplicating regex chains.

**trilateration.ts** implements weighted least-squares trilateration with fallbacks for 1-proxy and 2-proxy scenarios, plus exponential moving average smoothing.

**renderer.ts** is a pure Canvas2D rendering module with no DOM manipulation. It receives render context and data, and draws zones, doors, proxies, devices, trails, and signal overlays.

**history-store.ts** manages position history in IndexedDB with automatic purging. It maintains an in-memory cache for fast reads and falls back to memory-only mode if IndexedDB is unavailable.

## Data Flow

1. HA WebSocket pushes Bermuda entity state changes to the card
2. `bermuda-utils.collectDeviceDistances()` extracts distance-to-each-proxy from sensor entities (3 fallback strategies)
3. `trilaterate()` calculates weighted position from proxy positions and distances
4. `smoothPosition()` applies exponential moving average for smooth transitions
5. `renderer.render()` draws everything on the Canvas overlay
6. `HistoryStore.addPoint()` persists position to IndexedDB for trail rendering
7. Automatic purge removes entries older than the configured retention period

## Key Design Decisions

Canvas API was chosen over SVG for smooth 60fps animations with many simultaneous devices. IndexedDB stores history locally to avoid loading the HA database. Auto-discovery parses Bermuda's `sensor.bermuda_*_distance_to_*` entities to find proxies, then enriches them with device registry data for friendly names and area assignments. The loader/core split ensures updates are always loaded correctly despite HA's service-worker caching.
