# TRINACRIA su Steam — guida pratica

## La strada in 6 passi

1. **Iscrizione a Steamworks** — https://partner.steamgames.com
   - Serve un account Steam, i dati fiscali/bancari (anche persona fisica va bene) e la
     **Steam Direct Fee: 100 USD una tantum per gioco** (rimborsata se il gioco supera
     1.000 USD di ricavi lordi). La verifica identità/fiscale richiede in genere 1-7 giorni.
2. **Creazione dell'app** — dal pannello Steamworks nasce l'**App ID** del gioco.
   Copialo in `desktop/steam_appid.txt` (solo il numero): da quel momento steamworks.js
   si attiva da solo in sviluppo.
3. **Pagina del negozio** — descrizione, screenshot (min 5), capsule art nei vari formati
   richiesti, trailer (facoltativo ma consigliato), classificazione contenuti.
   La pagina deve restare visibile **almeno 2 settimane** ("coming soon") prima del lancio.
4. **Build** — `npm run dist` produce la cartella `dist/win-unpacked/` con l'eseguibile.
   Si carica su Steam con **SteamPipe** (`steamcmd` + script `app_build`): depot → build → 
   si assegna la build al branch `default` dal pannello.
5. **Review di Valve** — prima del lancio Valve testa la build (giorni, non settimane).
6. **Lancio** — si sceglie il prezzo (o gratis). Valve trattiene il 30%.

## Comandi in questa cartella

- `npm install` — una tantum (Electron + electron-builder)
- `npm start` — avvia il gioco in finestra desktop (usa i file del progetto in ../)
- `npm run smoke` — test automatico: carica il gioco a finestra nascosta e stampa SMOKE_OK
- `npm run dist` — copia il gioco in `game/` e impacchetta `dist/win-unpacked/`

## Steam Cloud (salvataggi sincronizzati)

I salvataggi su desktop vivono in un file (`%APPDATA%/trinacria-desktop/salvataggi.json`,
ponte in `preload.js` + `js/save.js`). Su Steamworks basta configurare **Auto-Cloud** puntando
a quella cartella: nessun codice in più.

## Achievements

`steam.js` espone `achievement(nome)`. Quando avremo l'App ID:
1. definire gli obiettivi nel pannello Steamworks (nome API, icona, descrizione);
2. `npm install steamworks.js`;
3. collegare le chiamate agli eventi di gioco (prima colonia, prima meraviglia, vittoria...).

## Mobile (dopo)

Electron non copre iOS/Android. Quando sarà il momento: **Capacitor** incapsula la stessa
identica base web in un'app nativa per gli store. Il motore a tiles fatto per Steam è già
il prerequisito per non esaurire la RAM dei telefoni.
