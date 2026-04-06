# HA Cache - The Real Problem

## Key insight from card-mod maintainer:

> "A Browser will NOT load any JS file again that has the EXACT same URL 
> including search tags (hacstag etc.), but WILL load a JS file again if 
> it IS a different URL"

## How HA caching works:
1. HA uses a Service Worker with `file-cache` in Cache Storage
2. When a resource URL is loaded, it goes into file-cache
3. Next time the same URL is requested, Service Worker serves from file-cache
4. The URL must be DIFFERENT (including query params) for the browser to re-fetch

## The hacstag mechanism:
- HACS adds `?hacstag=XXXX` to the resource URL
- When HACS updates, it changes the hacstag number
- This makes the URL different → browser fetches the new file
- BUT: the old URL entry stays in file-cache too!

## Why our card doesn't update:
The user had TWO resource entries. Even after removing one, the Service Worker
may still have the old file-cache entry. The hacstag should handle this BUT
if the hacstag doesn't change (or HA doesn't restart properly), the old
cached version is served.

## The REAL fix:
The card itself should detect version mismatch and force a reload.
Like Browser Mod does - check the version, and if outdated, clear
the specific cache entry and reload.

## What we need to do:
1. On card load, check localStorage for last known version
2. If version changed, use Cache API to delete the old entry from file-cache
3. Force page reload ONCE
4. This is what we already tried but maybe the implementation was wrong
