# HACS Download Mechanism

## Key findings:

### File search order:
1. The `dist` directory
2. On the latest release (assets)
3. The root of the repository

HACS looks in this order and downloads ALL .js files from the FIRST location where it finds a match.

### Naming rule:
- One of the .js files must have the same name as the repository
- If repo name starts with "lovelace-", it strips that prefix
- Our repo: `ha-ble-livemap` → HACS looks for `ha-ble-livemap.js`

### THE PROBLEM:
Our repo name is `ha-ble-livemap` but our file is called `ble-livemap-card.js` (or now `ble-livemap.js`).
HACS expects a file named `ha-ble-livemap.js` to match the repo name!

But we have `filename` in hacs.json which overrides this. So that should work...

### Download process:
1. Local target directory is DELETED
2. New directory is created  
3. All expected files are downloaded

So when HACS downloads, it should replace everything. The issue might be that HACS
is downloading from `dist/` in the repo (which has the old file) instead of from the release.

### Solution:
Since HACS checks `dist/` FIRST before release assets, and our dist/ is committed to the repo,
HACS might be downloading from the repo's dist/ directory instead of the release asset.

We should either:
1. Remove dist/ from git and only use release assets (like Mushroom and Button Card do)
2. Or make sure dist/ always has the latest file
