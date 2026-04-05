# Bermuda Device Tracker Attributes

From device_tracker.py source code:
- `scanner`: name of the nearest scanner (area_advert.name)
- `area`: area name of the device

The device_tracker entity does NOT have a `scanners` dict attribute.
The `scanners` attribute might be on the sensor entities instead.

Need to check sensor.py for the distance sensor attributes.
