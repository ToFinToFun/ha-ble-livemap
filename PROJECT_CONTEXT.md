# Projektbeskrivning: ha-ble-livemap

Detta dokument är avsett att användas som kontext för AI-assistenter (som Manus) vid framtida utveckling av projektet `ha-ble-livemap`. Det innehåller projektets arkitektur, tekniska beslut, kodstandarder och viktiga regler för utvecklingsflödet.

## 1. Projektöversikt

**Namn:** ha-ble-livemap
**Författare:** Jerry Paasovaara
**Typ:** Custom Lovelace Card för Home Assistant (HACS-kompatibelt)
**Syfte:** Att visa realtidspositionering av BLE-enheter (Bluetooth Low Energy) på en uppladdad planritning med hjälp av trilateration från flera BLE-proxies (via Bermuda-integrationen).

### Huvudfunktioner
- **Trilateration:** Beräknar position baserat på avstånd till 3+ proxies.
- **Visuell Editor:** En inbyggd, flikbaserad fullscreen-editor för att ladda upp planritningar, kalibrera mått, placera proxies, rita zoner och välja enheter.
- **Zoner:** Möjlighet att rita polygoner på kartan för att definiera rum/områden.
- **Historik:** Sparar rörelsespår lokalt i webbläsaren (IndexedDB) för att inte belasta Home Assistants databas.
- **Multi-floor:** Stöd för flera våningar, antingen via flikar eller staplade under varandra.
- **Auto-discovery:** Hittar automatiskt Bermuda-enheter och proxies i Home Assistant.

## 2. Teknisk Stack & Arkitektur

Projektet är byggt som en modern frontend-applikation utan backend-beroenden (förutom Home Assistant WebSocket API).

- **Språk:** TypeScript
- **Ramverk:** Lit (Web Components)
- **Byggverktyg:** Rollup (med plugins för TS, Node Resolve, CommonJS, Terser)
- **Pakethanterare:** pnpm
- **Rendering:** HTML5 Canvas för prestanda (60fps animationer av rörelser)

### Projektstruktur
```text
ha-ble-livemap/
├── package.json          # Beroenden (lit, home-assistant-js-websocket)
├── rollup.config.js      # Byggkonfiguration (output: dist/ble-livemap-card.js)
├── tsconfig.json         # TypeScript-konfiguration
├── hacs.json             # HACS-metadata
├── src/
│   ├── ble-livemap-card.ts # Huvudkomponenten (Lovelace-kortet)
│   ├── editor.ts           # Den visuella konfigurationseditorn
│   ├── types.ts            # Alla TypeScript-interfaces och konstanter
│   ├── const.ts            # Versionsnummer och kortnamn
│   ├── trilateration.ts    # Matematik för positionsberäkning
│   ├── renderer.ts         # Canvas-ritning (cirklar, zoner, spår)
│   ├── history-store.ts    # IndexedDB-hantering för historik
│   └── localize/           # i18n (engelska och svenska)
```

## 3. Viktiga Designbeslut & Regler

För att undvika att förstöra befintlig funktionalitet måste följande regler följas vid all framtida utveckling:

### 3.1. Editorn (editor.ts)
- Editorn är byggd med **stora interaktiva kartor** i varje flik (Floor Plan, Proxies, Zones). Försök **inte** bygga om detta till en separat Home Assistant-panel eller sidebar. Den nuvarande lösningen med en stor karta inuti Lovelace-editorn är det valda spåret.
- Använd alltid dropdown-listor (`<select>`) för att välja entiteter (proxies och enheter) istället för fritextfält, och använd `_getAllEntities()` eller `_getBermudaDevicePrefixes()` för att populera dem.

### 3.2. Rendering (renderer.ts & ble-livemap-card.ts)
- All dynamisk grafik (enheter, historikspår, zoner) ritas på en `<canvas>` som ligger ovanpå planritningsbilden (`<img>`).
- Rör inte `requestAnimationFrame`-loopen i onödan; den är optimerad för att ge mjuka övergångar när enheter rör sig.

### 3.3. Datahantering
- Historik sparas **aldrig** i Home Assistants databas via recorder. Den sparas enbart lokalt i webbläsaren via `HistoryStore` (IndexedDB).
- Konfigurationen sparas i Lovelace-kortets standard-config-objekt.

## 4. Utvecklingsflöde & Git-strategi

Detta är **kritiskt** för projektet. Jerry använder en specifik Git-strategi för att hantera uppdateringar.

### 4.1. Branch-struktur
- `main`: Utvecklingsbranch. Här sker allt aktivt arbete och alla commits.
- `production`: Produktionsbranch. Denna branch används för att trigga faktiska releaser och uppdateringar.

### 4.2. Arbetsflöde för AI-assistenter
När du (Manus eller annan AI) får en uppgift att ändra i koden, följ **alltid** denna process:

1. **Koda & Bygg:**
   - Gör ändringarna i `src/`.
   - Kör `pnpm build` för att generera en ny `dist/ble-livemap-card.js`.
2. **Commit & Push till Main:**
   - Committa ändringarna till `main`-branchen.
   - Pusha till `origin main`.
   - *Notera: Pusha aldrig direkt till production.*
3. **Merge till Production (När Jerry godkänner):**
   - När funktionen är testad och Jerry uttryckligen ber om att "merga till production" eller "släppa uppdateringen":
   - Byt till production: `git checkout production`
   - Merga main: `git merge main`
   - Pusha: `git push origin production`
   - Byt tillbaka: `git checkout main`
4. **GitHub Release:**
   - Skapa en ny release på GitHub via `gh release create` med den nya `dist/ble-livemap-card.js` bifogad.
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
