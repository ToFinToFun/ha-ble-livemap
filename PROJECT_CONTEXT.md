# Projektbeskrivning: ha-ble-livemap

Detta dokument är avsett att användas som kontext för AI-assistenter (som Manus) vid framtida utveckling av projektet `ha-ble-livemap`. Det innehåller projektets arkitektur, tekniska beslut, kodstandarder och viktiga regler för utvecklingsflödet.

## 1. Projektöversikt

**Namn:** ha-ble-livemap
**Författare:** Jerry Paasovaara
**Typ:** Custom Lovelace Card + Sidebar Panel för Home Assistant (HACS-kompatibelt)
**Syfte:** Att visa realtidspositionering av BLE-enheter (Bluetooth Low Energy) på en uppladdad planritning med hjälp av trilateration från flera BLE-proxies (via Bermuda-integrationen).

### Huvudfunktioner
- **Trilateration:** Beräknar position baserat på avstånd till 1+ proxies (bäst med 3+).
- **Sidebar Panel (panel.ts):** Fullständig konfigurationspanel i HA:s sidopanel med smart entity-discovery via device registry, drag-and-drop, live tracking, debug-panel, zoner, dörrar, gateways och RSSI-kalibrering.
- **Visuell Editor (editor.ts):** En inbyggd, flikbaserad Lovelace-editor för grundläggande konfiguration (planritningar, proxies, enheter, zoner).
- **Lovelace Card (ble-livemap-card.ts):** Själva kortet som renderar kartan med enhetspositioner i realtid.
- **Zoner:** Möjlighet att rita polygoner (och rektanglar) på kartan för att definiera rum/områden.
- **Dörrar & Portaler:** Stöd för att markera dörrar, öppningar och portaler mellan våningar.
- **Gateways:** Proxies kan markeras som gateways (trappor, hissar) för flervåningsnavigering.
- **Historik:** Sparar rörelsespår lokalt i webbläsaren (IndexedDB) för att inte belasta Home Assistants databas.
- **Multi-floor:** Stöd för flera våningar, antingen via flikar eller staplade under varandra.
- **Auto-discovery:** Hittar automatiskt Bermuda-enheter och proxies i Home Assistant.
- **Cache-busting:** Loader/core-arkitektur som säkerställer att uppdateringar alltid laddas korrekt.

## 2. Teknisk Stack & Arkitektur

Projektet är byggt som en modern frontend-applikation utan backend-beroenden (förutom Home Assistant WebSocket API).

- **Språk:** TypeScript
- **Ramverk:** Lit (Web Components)
- **Byggverktyg:** Rollup (med plugins för TS, Node Resolve, CommonJS, JSON, Terser)
- **Pakethanterare:** pnpm
- **Rendering:** HTML5 Canvas för prestanda (60fps animationer av rörelser)

### Byggarkitektur (Cache-busting)

Rollup bygger **två** filer:

1. **`dist/ble-livemap-loader.js`** — Liten, stabil loader som aldrig ändras. Det är denna fil som `panel_custom` pekar på. Den importerar dynamiskt core-filen med en timestamp-parameter för att bryta cache.
2. **`dist/ble-livemap-core.js`** — All faktisk kod (card, panel, editor, renderer). Ändras vid varje uppdatering.

### Projektstruktur
```text
ha-ble-livemap/
├── package.json          # Beroenden (lit, home-assistant-js-websocket)
├── rollup.config.js      # Byggkonfiguration (output: 2 filer, se ovan)
├── tsconfig.json         # TypeScript-konfiguration
├── hacs.json             # HACS-metadata
├── src/
│   ├── loader.ts           # Cache-busting loader (stabil, ändras sällan)
│   ├── ble-livemap-card.ts # Huvudkomponenten (Lovelace-kortet)
│   ├── panel.ts            # Sidebar-panelen (fullständig konfiguration)
│   ├── editor.ts           # Lovelace-editorn (grundläggande konfiguration)
│   ├── bermuda-utils.ts    # Centraliserade Bermuda-entitetshjälpare
│   ├── types.ts            # Alla TypeScript-interfaces och konstanter
│   ├── const.ts            # Versionsnummer och kortnamn
│   ├── trilateration.ts    # Matematik för positionsberäkning
│   ├── renderer.ts         # Canvas-ritning (cirklar, zoner, spår)
│   ├── history-store.ts    # IndexedDB-hantering för historik
│   └── localize/           # i18n (engelska och svenska)
```

### Bermuda Entity Utilities (bermuda-utils.ts)

All logik för att tolka Bermuda-entitets-ID:n, extrahera slugs, bygga sensor-ID:n och samla avstånd är centraliserad i `bermuda-utils.ts`. **Duplicera aldrig** denna logik i andra filer — importera istället från denna modul:

- `extractDeviceSlug(prefix)` — Extraherar enhets-slug från entity prefix
- `extractProxySlug(proxyEntityId)` — Extraherar proxy-slug från config entity_id
- `buildDistanceSensorId(deviceSlug, proxySlug)` — Bygger standard sensor-ID
- `collectDeviceDistances(hass, prefix, proxies, calibFn?)` — Samlar avstånd (3 strategier)
- `discoverProxySlugs(hass)` — Upptäcker proxies från `distance_to_*` sensorer
- `discoverTrackableDevices(hass)` — Upptäcker spårbara Bermuda-enheter
- `discoverDevicePrefixes(hass)` — Upptäcker enhetsprefix (för editor-dropdown)
- `getPolygonCentroid(points)` — Beräknar polygoncentroid
- `isPointInPolygon(x, y, points)` — Punkt-i-polygon-test
- `applyRssiCalibration(rssi, calibration)` — RSSI till avstånd via log-distance modell

## 3. Viktiga Designbeslut & Regler

För att undvika att förstöra befintlig funktionalitet måste följande regler följas vid all framtida utveckling:

### 3.1. Sidebar Panel (panel.ts)
- Panelen är den primära konfigurationsytan med smart entity-discovery, drag-and-drop, live tracking och debug-panel.
- Panelen använder HA:s device registry och area registry för att berika proxy-information.
- Konfigurationen sparas i `localStorage` under nyckeln `ble-livemap-panel-config`.

### 3.2. Editorn (editor.ts)
- Editorn är byggd med **stora interaktiva kartor** i varje flik (Floor Plan, Proxies, Zones).
- Använd alltid dropdown-listor (`<select>`) för att välja entiteter (proxies och enheter).
- Använd `discoverDevicePrefixes()` från `bermuda-utils.ts` för att populera enhetslistor.

### 3.3. Rendering (renderer.ts & ble-livemap-card.ts)
- All dynamisk grafik (enheter, historikspår, zoner, dörrar) ritas på en `<canvas>` som ligger ovanpå planritningsbilden (`<img>`).
- Rör inte `requestAnimationFrame`-loopen i onödan; den är optimerad för att ge mjuka övergångar när enheter rör sig.

### 3.4. Datahantering
- Historik sparas **aldrig** i Home Assistants databas via recorder. Den sparas enbart lokalt i webbläsaren via `HistoryStore` (IndexedDB).
- Konfigurationen sparas i Lovelace-kortets standard-config-objekt (för kortet) och i localStorage (för panelen).

### 3.5. Bermuda-entiteter
- **Duplicera aldrig** slug-extrahering eller sensor-ID-konstruktion. Använd alltid `bermuda-utils.ts`.
- Bermuda skapar sensorer med mönstret: `sensor.bermuda_{device_slug}_distance_to_{proxy_slug}`
- Proxy-slugs kommer från HA:s enhetsnamnshierarki (name_by_user > device registry name > BLE name).

## 4. Utvecklingsflöde & Git-strategi

Detta är **kritiskt** för projektet. Jerry använder en specifik Git-strategi för att hantera uppdateringar.

### 4.1. Branch-struktur
- `main`: Utvecklingsbranch. Här sker allt aktivt arbete och alla commits.
- `production`: Produktionsbranch. Denna branch används för att trigga faktiska releaser och uppdateringar.

### 4.2. Arbetsflöde för AI-assistenter
När du (Manus eller annan AI) får en uppgift att ändra i koden, följ **alltid** denna process:

1. **Hämta senaste ändringar:**
   - Kör `git pull origin main` innan du börjar arbeta.
   - Lös eventuella merge-konflikter.
2. **Koda & Bygg:**
   - Gör ändringarna i `src/`.
   - Kör `pnpm build` för att generera `dist/ble-livemap-loader.js` och `dist/ble-livemap-core.js`.
3. **Commit & Push till Main:**
   - Committa ändringarna till `main`-branchen.
   - Pusha till `origin main`.
   - *Notera: Pusha aldrig direkt till production.*
4. **Merge till Production (När Jerry godkänner):**
   - När funktionen är testad och Jerry uttryckligen ber om att "merga till production" eller "släppa uppdateringen":
   - Byt till production: `git checkout production`
   - Merga main: `git merge main`
   - Pusha: `git push origin production`
   - Byt tillbaka: `git checkout main`
5. **GitHub Release:**
   - Skapa en ny release på GitHub via `gh release create`.
   - Bifoga **båda** dist-filerna: `dist/ble-livemap-loader.js` och `dist/ble-livemap-core.js`.
   - Följ den automatiserade versionshanteringen (se nedan).

### 4.3. Versionshantering
- **Major (X.0.0):** Ändras endast manuellt av Jerry vid massiva ombyggnationer.
- **Minor (0.X.0):** Uppdateras automatiskt vid större nya funktioner (t.ex. från 1.2.0 till 1.3.0).
- **Patch (0.0.X):** Uppdateras automatiskt vid buggfixar och små justeringar (t.ex. från 1.3.0 till 1.3.1).
- Kom ihåg att uppdatera `CARD_VERSION` i `src/const.ts` och `version` i `package.json` innan bygget.

## 5. Hur du använder detta dokument

När du startar en ny session med Manus för att arbeta vidare på detta projekt, be Manus att:
1. Läsa filen `PROJECT_CONTEXT.md` (detta dokument).
2. Bekräfta att den förstått Git-strategin (main vs production).
3. Utföra den nya uppgiften baserat på denna kontext.
