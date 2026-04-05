/**
 * ha-ble-livemap — Loader (cache-busting)
 *
 * This file is intentionally tiny and MUST NOT change between versions.
 * It dynamically imports the real card code (ble-livemap-core.js) with a
 * unique timestamp query parameter, which forces the browser and
 * Home Assistant's Service Worker to always fetch the latest version
 * from disk instead of serving a stale cached copy.
 *
 * Author: Jerry Paasovaara
 * License: MIT
 */

// Resolve the core file URL relative to this loader's location.
// import.meta.url gives us the full URL of this loader script,
// so we can reliably find ble-livemap-core.js next to it.
const loaderUrl = import.meta.url;
const baseUrl = loaderUrl.substring(0, loaderUrl.lastIndexOf("/") + 1);
const coreUrl = `${baseUrl}ble-livemap-core.js?t=${Date.now()}`;

import(/* @vite-ignore */ coreUrl).catch((err) => {
  console.error("[BLE LiveMap] Failed to load core module:", err);
});
