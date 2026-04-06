# Design: Guided Calibration Wizard

## Concept

A fully automatic guided calibration mode that:
1. Suggests optimal measurement points on the map
2. Waits for user to walk there and confirm "I'm here"
3. Auto-measures RSSI (waits for signal to stabilize)
4. Shows live color-coded status (measuring → stable → calibrated → synced)
5. Auto-cleans outliers, auto-calibrates, auto-syncs to Bermuda
6. Suggests the next point to walk to
7. Shows overall calibration progress

## State Machine

```
IDLE → STARTED → SUGGESTING_POINT → WAITING_FOR_USER → MEASURING → STABLE → 
  → (auto-calibrate + sync) → SUGGESTING_POINT (loop) or COMPLETE
```

### States
- **IDLE**: Wizard not active
- **STARTED**: User clicked "Start Guided Calibration", device selected
- **SUGGESTING_POINT**: A suggested point pulses on the map. User walks there.
- **WAITING_FOR_USER**: User clicked "I'm here" or clicked the suggested point
- **MEASURING**: Collecting RSSI samples over ~5 seconds, checking stability
- **STABLE**: RSSI has stabilized (variance < threshold). Sample recorded.
  - Auto-calibrate runs
  - Auto-clean outliers
  - Auto-sync to Bermuda if enabled
- **COMPLETE**: All suggested points done, or user clicks "Finish"

## Smart Point Suggestion Algorithm

Goal: Suggest points that maximize calibration quality.

Strategy:
1. **Near each proxy**: First suggest a point ~1m from each placed proxy (for ref_rssi)
2. **Between proxies**: Then suggest midpoints between proxy pairs (for attenuation)
3. **Coverage gaps**: Find areas with no nearby samples and suggest points there
4. **Avoid walls**: Stay inside zone polygons if zones are defined

Algorithm:
```
function suggestNextPoint(proxies, existingSamples, zones):
  candidates = []
  
  // Phase 1: Near-proxy points (if no sample within 2m of a proxy)
  for each proxy:
    if no sample within 2m of proxy:
      candidates.push({ x: proxy.x, y: proxy.y + offset, priority: 10 })
  
  // Phase 2: Midpoints between proxy pairs
  for each pair (proxyA, proxyB):
    midpoint = average(proxyA, proxyB)
    if no sample within 3m of midpoint:
      candidates.push({ midpoint, priority: 7 })
  
  // Phase 3: Grid coverage
  for each grid cell (2m spacing):
    if no sample within 2m:
      candidates.push({ cell center, priority: 3 })
  
  // Filter: only keep points inside zones (if zones exist)
  // Sort by priority, return top candidate
```

## RSSI Stability Detection

When measuring at a point:
- Collect RSSI readings every 500ms for up to 10 seconds
- Track rolling window of last 6 readings per proxy
- "Stable" = standard deviation of rolling window < 3 dBm for all active proxies
- Minimum 3 seconds of measurement before accepting stability
- Show a progress indicator: "Measuring... 3/6 proxies stable"

## Color-Coded Status Indicators

### Suggested Point Marker (on map)
- **Pulsing blue circle**: "Walk here next"
- **Yellow circle**: "Waiting for you to confirm"
- **Orange spinning**: "Measuring..."
- **Green solid**: "Done! Sample recorded"
- **Green with checkmark**: "Calibrated and synced"

### Overall Progress Bar
- Shows: "3/8 points completed"
- Color gradient from red → yellow → green based on average R²

## UI Layout

In the debug panel, replace/augment the toolbar:

```
┌─────────────────────────────────────────┐
│ 🧙 Guided Calibration                  │
│ ┌─────────────────────────────────────┐ │
│ │ Step 3/8: Walk to the blue point    │ │
│ │ near "Vardagsrum Garderober"        │ │
│ │                                     │ │
│ │ [████████░░░░] 37% calibrated       │ │
│ │                                     │ │
│ │ Status: Measuring... (4/6 stable)   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [⏸ Pause]  [⏭ Skip Point]  [✓ Finish] │
└─────────────────────────────────────────┘
```

## Implementation Plan

### New State Properties
```typescript
@state() private _wizardActive = false;
@state() private _wizardStep = 0;
@state() private _wizardPoints: WizardPoint[] = [];
@state() private _wizardState: WizardState = 'idle';
@state() private _wizardMeasurements: number[][] = []; // per-proxy rolling RSSI
@state() private _wizardStableCount = 0;
private _wizardMeasureTimer: number | null = null;
```

### New Type
```typescript
interface WizardPoint {
  x: number; // % on map
  y: number;
  floor_id: string;
  label: string; // "Near Vardagsrum proxy" or "Between Kitchen and Hall"
  status: 'pending' | 'active' | 'measuring' | 'done' | 'skipped';
  nearProxy?: string; // proxy entity_id this point is near
}

type WizardState = 'idle' | 'suggesting' | 'waiting' | 'measuring' | 'stable' | 'complete';
```

### Integration with Existing Code
- Wizard mode replaces `_calibrationMode` when active
- Uses same `_recordCalibrationSample()` to save data
- Uses same `_autoCalibrate()` after each stable measurement
- Uses same `_syncToBermuda()` if enabled
- Wizard points rendered in `_renderDebugOverlay()` with special styling
