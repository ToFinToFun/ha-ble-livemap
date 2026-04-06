# Bermuda Calibration Research

## Three Calibration Levels in Bermuda

### Calibration 1: Global Settings (via config flow UI)
- **ref_power**: Default RSSI at 1 metre (e.g., -73)
- **attenuation**: Environment attenuation factor (e.g., 3.1)
- Set via: Settings > Devices & Services > Bermuda > CONFIGURE > Calibration 1
- These are stored in the integration's config entry options

### Calibration 2: Per-Scanner RSSI Offsets (via config flow UI)
- Per-scanner offset to normalize different hardware (Shelly vs ESP32 etc.)
- Positive offset = decrease distance estimate
- Negative offset = increase distance estimate
- Set via: Settings > Devices & Services > Bermuda > CONFIGURE > Calibration 2
- Stored in config entry options

### Calibration 3: Per-Device Reference_power (via number entity!)
- **This is the key one for us!**
- Each Bermuda device has a `number` entity: "Calibration Ref Power @ 1m"
- Value of 0 = use global default
- Can be set to a custom ref_power per device (e.g., -64)
- **This is a HA number entity** → we can call `number.set_value` service!
- The value saves automatically and restores on restart

## How to Programmatically Update Bermuda Calibration

### Per-Device Ref Power (Calibration 3) — EASY
We can call:
```
hass.callService('number', 'set_value', {
  entity_id: 'number.bermuda_<device>_calibration_ref_power',
  value: -64
});
```
This updates the per-device reference power in Bermuda directly.

### Per-Scanner Offsets (Calibration 2) — HARDER
These are stored in the config entry options, not as entities.
To update these programmatically we would need to:
1. Use `bermuda.dump_devices` to read current state
2. Potentially use the options flow API (not standard)
3. Or find if there are number entities for scanner offsets

### Global Settings (Calibration 1) — NOT RECOMMENDED
These are global and affect all devices. We should not change these.

## Strategy for Our System
1. **Per-device ref_power**: We CAN push this via `number.set_value`
2. **Per-scanner offsets**: Need to check if entities exist on Jerry's HA
3. **Our local calibration**: Continues to work as an additional layer
4. **Sync approach**: After auto-calibrate, offer to push learned ref_rssi to Bermuda
