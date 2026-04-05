# ha-ble-livemap - Architecture Design

## Tech Stack
- **Lit 3** + **TypeScript 5** (HA standard)
- **Rollup 4** for bundling
- **Canvas API** for rendering (performance)
- **HACS compatible** custom Lovelace card

## Project Structure
```
src/
├── ble-livemap-card.ts          # Main card element
├── editor.ts                    # Visual config editor
├── types.ts                     # TypeScript interfaces
├── const.ts                     # Version, defaults
├── trilateration.ts             # Position calculation engine
├── renderer.ts                  # Canvas rendering engine
├── history-store.ts             # IndexedDB history management
├── proxy-discovery.ts           # Auto-discover Bermuda proxies
└── localize/
    ├── localize.ts
    └── languages/
        ├── en.json
        └── sv.json
```

## Data Flow
1. Subscribe to Bermuda entity states via HA WebSocket
2. Extract distance-to-each-proxy from entity attributes
3. Run trilateration algorithm
4. Render position on canvas with gradient circle
5. Store position in IndexedDB for history trail
6. Auto-purge old history based on retention setting

## Key Design Decisions
- Canvas API (not SVG) for smooth 60fps animations
- IndexedDB for history (not HA database)
- Auto-discovery of Bermuda proxies
- Config editor with visual proxy placement
- Responsive - works on mobile, tablet, desktop
