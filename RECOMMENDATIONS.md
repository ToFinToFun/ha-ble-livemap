# Framtida Förbättringar och Rekommendationer för ha-ble-livemap

Efter en djupgående analys av kodbasen, arkitekturen och Bermuda-integrationen har jag identifierat flera områden där vi kan förbättra prestanda, noggrannhet och kodkvalitet. Här är mina rekommendationer uppdelade i kategorier.

## 1. Förbättrad Trilateration och Positionering

Den nuvarande trilaterationsalgoritmen (`weightedLeastSquares`) fungerar bra som en grund, men BLE-signaler (RSSI) är notoriskt instabila inomhus på grund av reflektioner och hinder.

### Rekommendationer:
- **Implementera ett Kalman-filter:** Forskning visar att ett Kalman-filter avsevärt kan minska bruset i RSSI-mätningar och ge en mycket stabilare positionering [1]. Just nu använder vi en enkel exponentiell glidande medelvärdesberäkning (`smoothPosition`), vilket är snabbt men inte lika bra på att hantera plötsliga spikar i signalstyrkan.
- **Viktad Centroid som standard för 3+ proxies:** I många inomhusmiljöer ger en viktad centroid (som vi redan har som fallback) faktiskt ett mer stabilt resultat än least-squares när signalerna är brusiga. Vi bör utvärdera att använda en hybrid där vi litar mer på centroiden när residualerna (felen) i least-squares är höga.
- **Utnyttja Bermudas inbyggda Area-data:** Bermuda räknar redan ut vilken Area (zon) en enhet befinner sig i. Vi skulle kunna använda denna data för att "snappa" positionen till rätt rum om trilaterationen placerar enheten precis utanför väggen.

## 2. Prestanda och Rendering (`renderer.ts`)

Renderingsmotorn är byggd med Canvas2D vilket är bra för prestandan, men det finns utrymme för optimeringar, särskilt om man har många enheter och långa historikspår.

### Rekommendationer:
- **Minska antalet Date.now()-anrop:** I `renderer.ts` anropas `Date.now()` flera gånger per frame för att beräkna pulserande animationer (t.ex. `pulsePhase`). Detta kan optimeras genom att skicka in en gemensam `timestamp` i `RenderContext` som beräknas en gång per frame.
- **Cacha typsnitt och färger:** Canvas-kontextens `font` och `fillStyle` sätts om väldigt ofta. Att gruppera ritoperationer efter färg/typsnitt kan minska antalet state-ändringar i Canvas-API:et.
- **Offscreen Canvas för statiska element:** Zoner och dörrar ritas om varje frame, trots att de aldrig flyttar på sig. Dessa bör ritas en gång till en offscreen-canvas som sedan bara kopieras (`drawImage`) till huvud-canvasen varje frame. Detta skulle spara hundratals ritoperationer per sekund.

## 3. Kodstruktur och Komplexitet (`panel.ts`)

`panel.ts` är den största och mest komplexa filen i projektet (över 2200 rader). Den hanterar allt från UI och konfiguration till live-uppdateringar och kalibrering.

### Rekommendationer:
- **Bryt ut kalibreringsguiden:** RSSI-kalibreringsguiden (`_renderCalibrationWizard` m.fl.) tar upp nästan 400 rader kod. Denna bör brytas ut till en egen webbkomponent (t.ex. `<ble-calibration-wizard>`) för att göra `panel.ts` mer hanterbar.
- **Bryt ut dörr- och zon-editorn:** På samma sätt kan logiken för att rita och redigera zoner och dörrar brytas ut till separata komponenter.
- **Ta bort kvarvarande duplicering:** Även om vi städade upp mycket i förra steget, finns funktionen `_pointInZone` fortfarande kvar i både `ble-livemap-card.ts` och `panel.ts`. Denna bör flyttas till `bermuda-utils.ts` (som redan har `isPointInPolygon`).

## 4. Datahantering och Historik (`history-store.ts`)

Historikhanteringen via IndexedDB är en smart lösning för att inte belasta Home Assistant, men den kan göras mer robust.

### Rekommendationer:
- **Batch-skrivningar:** Just nu skrivs varje ny position direkt till IndexedDB via en ny transaktion i `addPoint`. Om vi har 10 enheter som uppdateras varannan sekund blir det många transaktioner. Vi bör samla upp punkter i minnet och skriva dem i batchar (t.ex. var 10:e sekund).
- **Rensa gammal data oftare:** `purgeOldEntries` körs bara när databasen initieras. Om användaren har fliken öppen i flera dagar kommer databasen att växa tills den laddas om. Vi bör lägga till en schemalagd rensning (t.ex. en gång i timmen).

## 5. Integration och Ekosystem

### Rekommendationer:
- **Stöd för ESPresense:** Många användare i Home Assistant-communityt använder ESPresense istället för Bermuda [2]. Även om Bermuda är framtiden (enligt skaparen), skulle stöd för ESPresense-data (via MQTT Room) göra kortet användbart för en mycket större målgrupp.
- **Bättre felhantering i Loader:** `loader.ts` använder `Date.now()` för cache-busting, vilket är effektivt men kan leda till onödiga nedladdningar. Vi bör överväga att använda `CARD_VERSION` istället, så att webbläsaren kan cacha koden mellan uppdateringar.

---

## Referenser
[1] J. Röbesaat et al., "An Improved BLE Indoor Localization with Kalman-Based Fusion," Sensors, 2017. Available: https://pmc.ncbi.nlm.nih.gov/articles/PMC5461075/
[2] Home Assistant Community, "ESPresence or Bermuda?," Reddit, 2024. Available: https://www.reddit.com/r/homeassistant/comments/1g31nwq/espresence_or_bermuda/
