# TRINACRIA — Pacchetto audio (v58–v63)

## Cosa c'è

**Musica** — 7 brani strumentali da 60 s in loop (`assets/audio/musica/`, ~2,2 MB l'uno,
generati con `sonilo_music`):

| file | quando |
|---|---|
| `era0.m4a` | Era Greca — lira, aulos, percussioni leggere |
| `era1.m4a` | Era Romana — ottoni bassi, tamburi marziali, oboe |
| `era2.m4a` | Era Bizantina — bordone modale, campanelli, salterio |
| `era3.m4a` | Era Araba — oud, ney, qanun, darbuka in 6/8 |
| `era4.m4a` | Era Normanno-Sveva — viella, liuto, flauto, tabor |
| `era5.m4a` | Era Aragonese — clavicembalo, chitarra barocca, viola da gamba |
| `battaglia.m4a` | mentre il giocatore è in guerra o ha invasori in casa |

Il brano cambia in **crossfade da 1,2 s** al cambio d'era e all'entrata/uscita dallo stato
di guerra. Nessun brano è precaricato: parte solo quello che serve.

**Voce** — 73 clip in italiano (`assets/audio/voci/`, ~9,8 MB in totale, `qwen_audio_tts`,
voce unica guidata da istruzioni di recitazione diverse per i due personaggi):

- **Don Calorio** (44 clip) — presentazione, una battuta per ognuna delle 5 nuove ere,
  vittoria/sconfitta in battaglia (3+3), vittoria e sconfitta finali, rivolta (3),
  oro (2), carestia (2), invasori (2), meraviglie (2), città presa (3) e persa (2),
  8 battute ambientali e 6 consigli. Tono caldo, complice, teatrale.
- **Narratore** (29 clip) — le 5 transizioni d'era, i 7 eventi storici (Falaride,
  Archimede, Costante II, Maniace, Ruggero II, Federico II, Caravaggio), Vespri,
  Terremoto del 1693, Peste Nera, sbarco invasori, e i 13 dilemmi. Tono da documentario.

**Effetti** — restano sintetizzati in WebAudio (zero peso, zero latenza).
La tarantella procedurale in 6/8 resta come **ripiego**: se `assets/audio/manifest.json`
non c'è o non si carica, il gioco suona esattamente come prima di v58.

## Come è fatto (`js/audio.js`)

- `AUDIO.init()` (chiamato da `main.js`) legge `assets/audio/manifest.json`:
  `{ musica:{chiave:file}, voce:{chiave:file} }`. Fallimento = tutto procedurale.
- `AUDIO.temaEra(n)` / `temaBattaglia()` / `fineBattaglia()` — musica in streaming
  (`new Audio`), crossfade, `loop`.
- `AUDIO.parla(chiave)` / `parlaUna(prefisso, n)` — una battuta per volta; la musica
  fa **ducking a 0,28** per tutta la durata della clip + 0,6 s di coda.
- `AUDIO.precarica([chiavi])` — cache LRU di 24 clip, riscaldata all'ingresso in partita.
- Volumi (musica/voci/effetti) e interruttore voce nel **Menu → Audio**, salvati in
  `localStorage` sotto `trinacria_audio`.

## Dove parla

| momento | chiave |
|---|---|
| entrata in partita (turno 1) | `don_benvenuto` |
| cambio d'era | `don_era_N` + evento con `vox:"nar_era_N"` |
| scontro vinto/perso del turno IA | `don_vinta_1..3` / `don_persa_1..3` |
| crisi del consigliere con `prio ≥ 8` | `don_rivolta_*` / `don_oro_*` / `don_fame_*` |
| battuta ambientale (50% delle volte) | `don_ambiente_1..8` |
| evento in `st.pending` con campo `vox` | quella chiave |
| vittoria / sconfitta finale | `don_vittoria` / `don_sconfitta` |

Gli eventi portano la voce tramite un campo **`vox`** aggiunto in `game.js` sui
`st.pending.push(...)` che contano — nessun'altra parte del motore è stata toccata,
i salvataggi restano compatibili.

## Peso

`assets/audio/` = **25 MB** (15 MB musica + 9,8 MB voci). Nulla è bloccante al
caricamento: la musica parte in streaming solo se accesa, le voci si scaricano
alla prima riproduzione.
