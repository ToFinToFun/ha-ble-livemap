"""
HA Area Registry Cleanup Script
Executes all area renames, merges, deletions, and creations via WebSocket API.
"""
import asyncio
import json
import websockets

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI3MmVlYWMzZWEwNDM0MTk3YmZhNzE5M2NkYWM2NmEzMiIsImlhdCI6MTc3NTQyMTgxMSwiZXhwIjoyMDkwNzgxODExfQ.0uQahILIvbt24BkL-zNkjP4Unq2XTxqvTVbWnTgDIVU"
URI = "wss://paasovaara.se/api/websocket"

msg_id = 0

async def call_ws(ws, msg_type, **kwargs):
    global msg_id
    msg_id += 1
    payload = {"id": msg_id, "type": msg_type, **kwargs}
    await ws.send(json.dumps(payload))
    resp = json.loads(await ws.recv())
    if not resp.get("success", True):
        print(f"  ERROR: {resp.get('error', {}).get('message', 'unknown')}")
    return resp

async def main():
    async with websockets.connect(URI, max_size=50*1024*1024) as ws:
        # Auth
        await ws.recv()  # auth_required
        await ws.send(json.dumps({"type": "auth", "access_token": TOKEN}))
        auth = json.loads(await ws.recv())
        print(f"Auth: {auth['type']}")

        # ── Step 1: Renames ──
        renames = {
            "0163afc515db11eb9a9b2b6750b39c44": "Badrum 1",      # Badrum Nere
            "badrum_uppe": "Badrum 2",                             # Badrum uppe
            "ce4e8237cf004d959990aee2aaa8a722": "Céline",         # Celine
            "bilen": "Bil",                                        # Bilen
            "jerry": "Jerry",                                      # jerry
            "kamera": "Kamera",                                    # kamera
            "larm": "Teknik",                                      # Larm → Teknik
            "slask": "Slask",                                      # slask
            "plan1": "Plan 1",                                     # Plan1
            "plan2": "Plan 2",                                     # Plan2
        }
        
        print("\n── RENAMES ──")
        for area_id, new_name in renames.items():
            print(f"  Renaming {area_id} → '{new_name}'...")
            resp = await call_ws(ws, "config/area_registry/update",
                                 area_id=area_id, name=new_name)
            if resp.get("success"):
                print(f"    ✓ Done")

        # ── Step 2: Merge Huset → Hus (move devices, then delete) ──
        print("\n── MERGE: Huset → Hus ──")
        # Get devices in "huset"
        resp = await call_ws(ws, "config/device_registry/list")
        devices = resp.get("result", [])
        huset_devices = [d for d in devices if d.get("area_id") == "huset"]
        print(f"  Found {len(huset_devices)} devices in 'Huset'")
        for d in huset_devices:
            dev_id = d["id"]
            dev_name = d.get("name_by_user") or d.get("name", "?")
            print(f"  Moving device '{dev_name}' to 'Hus'...")
            await call_ws(ws, "config/device_registry/update",
                         device_id=dev_id, area_id="87b68f6045084ce299838d7b73eb815e")
        
        # Also move entities directly assigned to huset
        resp = await call_ws(ws, "config/entity_registry/list")
        entities = resp.get("result", [])
        huset_entities = [e for e in entities if e.get("area_id") == "huset"]
        print(f"  Found {len(huset_entities)} entities directly in 'Huset'")
        for e in huset_entities:
            ent_id = e["entity_id"]
            print(f"  Moving entity '{ent_id}' to 'Hus'...")
            await call_ws(ws, "config/entity_registry/update",
                         entity_id=ent_id, area_id="87b68f6045084ce299838d7b73eb815e")
        
        # Delete Huset
        print("  Deleting 'Huset'...")
        await call_ws(ws, "config/area_registry/delete", area_id="huset")
        print("    ✓ Huset merged into Hus")

        # ── Step 3: Merge Server → Teknik (Larm was renamed to Teknik) ──
        print("\n── MERGE: Server → Teknik ──")
        server_devices = [d for d in devices if d.get("area_id") == "server"]
        print(f"  Found {len(server_devices)} devices in 'Server'")
        for d in server_devices:
            dev_id = d["id"]
            dev_name = d.get("name_by_user") or d.get("name", "?")
            print(f"  Moving device '{dev_name}' to 'Teknik'...")
            await call_ws(ws, "config/device_registry/update",
                         device_id=dev_id, area_id="larm")  # larm was renamed to Teknik
        
        server_entities = [e for e in entities if e.get("area_id") == "server"]
        print(f"  Found {len(server_entities)} entities directly in 'Server'")
        for e in server_entities:
            ent_id = e["entity_id"]
            print(f"  Moving entity '{ent_id}' to 'Teknik'...")
            await call_ws(ws, "config/entity_registry/update",
                         entity_id=ent_id, area_id="larm")
        
        # Delete Server
        print("  Deleting 'Server'...")
        await call_ws(ws, "config/area_registry/delete", area_id="server")
        print("    ✓ Server merged into Teknik")

        # ── Step 4: Delete unused areas ──
        print("\n── DELETIONS ──")
        to_delete = ["arkiv", "axis"]
        for area_id in to_delete:
            print(f"  Deleting '{area_id}'...")
            await call_ws(ws, "config/area_registry/delete", area_id=area_id)
            print(f"    ✓ Deleted")

        # ── Step 5: Create new area ──
        print("\n── CREATE ──")
        print("  Creating 'Skogen'...")
        resp = await call_ws(ws, "config/area_registry/create", name="Skogen")
        if resp.get("success"):
            new_id = resp.get("result", {}).get("area_id", "?")
            print(f"    ✓ Created with ID: {new_id}")

        # ── Final: List all areas ──
        print("\n── FINAL AREA LIST ──")
        resp = await call_ws(ws, "config/area_registry/list")
        areas = sorted(resp.get("result", []), key=lambda a: a.get("name", "").lower())
        print(f"{'#':<3} {'Name':<20} {'Area ID'}")
        print("-" * 70)
        for i, a in enumerate(areas, 1):
            print(f"{i:<3} {a['name']:<20} {a['area_id']}")
        print(f"\nTotal: {len(areas)} areas")

asyncio.run(main())
