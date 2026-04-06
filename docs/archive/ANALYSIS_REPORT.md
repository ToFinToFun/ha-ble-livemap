# BLE LiveMap: Architectural Analysis & Recommendations

**Author:** Manus AI
**Date:** April 6, 2026

This document provides a comprehensive analysis of the `ha-ble-livemap` project. It is based on a fresh review of the source code, build system, Git history, and live Home Assistant data. The goal is to identify current issues, architectural duplication, and opportunities for improvement to guide future development.

## 1. Current State & Architecture

The project has evolved rapidly, reaching version 1.9.8. It is a sophisticated Lit-based frontend application that operates without a dedicated backend, relying entirely on the Home Assistant WebSocket API.

### 1.1. Core Components

The architecture is divided into several key components:

*   **The Lovelace Card (`ble-livemap-card.ts`):** The main runtime component that displays the map, tracks devices, and handles gateway/zone transitions.
*   **The Canvas Renderer (`renderer.ts`):** A high-performance rendering engine responsible for drawing zones, doors, proxies, trails, and animated device markers. It implements its own animation loop (`ANIMATION_SPEED = 0.08`) independent of the trilateration smoothing.
*   **The Sidebar Panel (`panel.ts`):** A full-page configuration application accessible from the HA sidebar. It features "smart" entity discovery using HA registries, multi-floor CRUD, and a recursive save mechanism to push configurations to Lovelace dashboards.
*   **The Card Editor (`editor.ts`):** The built-in Lovelace visual editor. It provides a tabbed interface for configuration but uses a simpler, older discovery mechanism compared to the panel.
*   **The Build System (`rollup.config.js` & `loader.ts`):** A robust cache-busting architecture that splits the output into a tiny, stable `ble-livemap-loader.js` and a dynamically imported `ble-livemap-core.js` with a timestamp query parameter.

### 1.2. Recent Velocity

The commit history shows intense recent activity focused on UX improvements, bug fixes, and cache-busting. Key recent updates include:

*   **v1.9.8:** Fixes for drag release and zone drawing visibility.
*   **v1.9.7:** Addition of a sensor debug panel for trilateration diagnostics.
*   **v1.9.6:** Fixes for device tracking (stripping the `_bermuda_tracker` suffix).
*   **v1.9.0:** Implementation of the loader+core cache-busting architecture.
*   **v1.7.0 - v1.8.2:** Iterative improvements to proxy discovery and gateway transitions.

## 2. Identified Issues & Discrepancies

While the project is feature-rich, the rapid development has introduced some architectural duplication and documentation drift.

### 2.1. Architectural Duplication: Panel vs. Editor

There is significant duplication of effort and logic between the Sidebar Panel (`panel.ts`) and the Lovelace Card Editor (`editor.ts`).

*   **Discovery Logic:** The panel uses a sophisticated "smart" discovery mechanism that queries the HA device and area registries (`config/device_registry/list`, `config/area_registry/list`) to enrich proxy and device data. The editor, however, relies on simpler string matching against `hass.states` (e.g., checking for "bermuda" or "ble_proxy"). This leads to inconsistent user experiences depending on where they configure the card.
*   **UI Implementation:** Both files implement complex UI interactions for placing proxies, drawing zones, and calibrating dimensions. Maintaining two separate implementations of these complex interactions is error-prone and increases the maintenance burden.

### 2.2. Documentation Drift

The `README.md` and `ARCHITECTURE.md` files have not kept pace with the recent architectural changes, particularly the cache-busting implementation.

*   **Installation Instructions:** The README instructs users to download `ble-livemap-card.js` and configure the panel `module_url` to point to `/hacsfiles/ha-ble-livemap/ble-livemap-card.js`. However, the build system now outputs `ble-livemap-loader.js` and `ble-livemap-core.js`. The HACS configuration (`hacs.json`) correctly points to `ble-livemap-loader.js`, but manual installation users or those configuring the panel based on the README will encounter errors or caching issues.
*   **Architecture Docs:** `ARCHITECTURE.md` mentions non-existent files (e.g., `proxy-discovery.ts`) and omits major new components like `panel.ts` and `loader.ts`.

### 2.3. Bermuda Entity Naming

The integration relies heavily on parsing Bermuda entity IDs. The live HA data shows that Bermuda creates distance sensors in the format `sensor.bermuda_[device_mac]_[proxy_name]`. The code in `ble-livemap-card.ts` attempts to handle various naming strategies, but the proliferation of synthetic prefixes (`ble_proxy_`, `bermuda_proxy_`) and the need to strip suffixes (`_bermuda_tracker`, `_distance`) indicates a fragile coupling to Bermuda's internal naming conventions.

## 3. Recommendations for Moving Forward

To ensure the long-term stability and maintainability of the project, I recommend the following actions:

### 3.1. Unify Configuration Logic

The most critical architectural improvement is to unify the configuration logic. The Lovelace Card Editor (`editor.ts`) should be refactored to utilize the same "smart" discovery logic and registry caching implemented in the Sidebar Panel (`panel.ts`).

Ideally, the core UI components for map interaction (placing proxies, drawing zones) should be extracted into shared Lit components that both the panel and the editor can consume. This will eliminate duplication and ensure a consistent UX.

### 3.2. Update Documentation

The documentation must be updated immediately to reflect the new cache-busting architecture.

*   **README.md:** Update the manual installation instructions and the sidebar panel configuration example to reference `ble-livemap-loader.js` instead of `ble-livemap-card.js`.
*   **ARCHITECTURE.md:** Rewrite this document to accurately describe the current state, including the loader/core split, the role of the panel, and the dual rendering/trilateration smoothing loops.

### 3.3. Robust Entity Handling

The logic for parsing Bermuda entity IDs should be centralized and made more robust. Instead of scattering `replace()` calls throughout the codebase, create a dedicated utility module for entity ID manipulation. This module should handle the extraction of device slugs and proxy names, making it easier to adapt if Bermuda changes its naming conventions in the future.

### 3.4. Clean Up Notes Files

The repository contains 18 `NOTES_*.md`, `DESIGN_*.md`, and `RESEARCH_*.md` files. While useful during rapid development, these clutter the repository. They should be consolidated into a single developer documentation folder or moved to a project wiki/issue tracker.

## 4. Conclusion

The `ha-ble-livemap` project is a highly capable and visually impressive custom card. The recent additions of zone connectivity, gateway transitions, and the cache-busting loader are significant improvements. By addressing the architectural duplication between the panel and editor, updating the documentation, and centralizing entity parsing logic, the project can achieve greater stability and ease of maintenance.
