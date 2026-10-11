# TRINACRIA
Gioco 4X a turni stile Civilization ambientato in Sicilia. JS puro + canvas, nessuna build.

## File chiave
- `index.html` — carica gli script con `?v=N` (18 tag): bumpare N a OGNI modifica
- `js/data_game.js` — dati: TECH, UNITA, EDIFICI, QUARTIERI, GRANDI, EDITTI, MERAVIGLIE
- `js/game.js` — motore: rese, turni, combattimento, vittorie (`VIE`), costi (`costoProd`)
- `js/ai.js` — IA fazioni/invasori/ribelli
- `js/ui.js` — pannelli, input, tutorial, schede contestuali
- `js/map.js` — mappa esagonale, rendering, rilievo 2.5D, mare
- `js/audio.js` — grafo Web Audio, effetti sintetizzati, ambiente
- `js/save.js` — salvataggi (VERSIONE 3: salva anche `h.citta`, `h.quart`, `h.imp`)
- `SCALETTA_*.md` — storia delle decisioni di design
- `grafica-chatgpt/` — brief + tavole di ChatGPT (384 previste, fuori da git); `python strumenti/importa_grafica.py`
  le converte in `assets/scene/*.webp` (illustrazioni) e `assets/ui/*.webp` (magenta scontornato).
  Nelle modali `img:"scene/<nome>"` usa le tavole nuove; `era_N` è già rimappato in `srcIllustr`

## Comandi
- Avvio locale: server statico su porta 8743 (`.claude/launch.json`, nome `trinacria`)
- Verifica sintassi: `node --check js/<file>.js`
- Deploy: SOLO GitHub Pages — `git add -A && git commit && git push origin main`
  poi controllare `curl .../index.html | grep v=N` su https://danilopuglisi89.github.io/trinacria/

## Convenzioni
- Commenti e commit in italiano; testo per il giocatore con accenti veri
- `h.comune` = geografia (sempre valido), `h.citta` = possesso (-1 = nessuno): mai confonderli
- Dati sugli hex fuori da `st` vanno salvati a mano in save.js
- Mai scorrere array globali dentro cicli per-entità (usare indici: `territorioDi`, `indiceUnita`, `vicini`)
- Patch grandi: script Python (bash mangia gli apostrofi italiani); se falliscono a metà NON scrivono
- Collaudo bilanciamento: `st.fazioni[0].ai=true` + ciclo di `GAME.fineTurno()` in console
  (~4 s a partita; mai meno di 8 partite per giudicare, e provare anche «facile»: le soglie
  delle `VIE` si comportano diversamente dove le guerre sono poche)
- Pubblicare solo quando Danilo dice "pubblica"
