# TRINACRIA — Città, ricerca e consigliere azionabile
*Quinta intervista (16 domande) — luglio 2026. Lavoro autonomo.*

## Le scelte
1. **Città**: promemoria come le truppe (avviso + salto), coda vuota/nuovo sblocco/pericolo, avviso a fine costruzione, coda più lunga (6 invece di 3)
2. **Ricerca**: legata alla scienza prodotta (già proporzionale), rami tematici (militare/economia/cultura/civile) con bonus passivi %, promemoria + festa che propone la prossima
3. **Don Calorio**: propone azioni concrete con **Accetta / Rifiuta / Più tardi**, esegue lui l'azione se accetti; aiuto "ottimo ma non perfetto"; parla solo quando serve davvero
4. **Truppe**: soldatini ridisegnati (armatura/scudo/elmo per epoca), speciali che spiccano (mantello, cresta, stendardo), leggero "respiro"

## Implementato
- **Ricerca 2× più veloce**: `costoTech()` dimezza il costo effettivo; scienza base raddoppiata (3→6).
- **18 nuove tecnologie a rami** (`ramo: militare/economia/cultura/civile`) con `bonus:{oroPct, sciPct, culturaPct, ciboPct, combatPct, growthPct, malcontento}` applicati in resa comune/fazione/crescita/combattimento (`techBonus()`, memoizzato).
- **Scoperta con festa**: annuncio + "🔓 Ora puoi: ..." (elenco di cosa sblocca) via `sbloccatiDaTech()`.
- **Consigliere azionabile**: `GAME.propostaConsigliere(fid)` genera proposte concrete (crisi→sagra/tempio, difesa→invia truppe/recluta, ricerca mancante, città ferma) con priorità; `GAME.eseguiProposta(azione)` le esegue; UI con 3 bottoni (`proponiAzione` in ui.js), cooldown per non ripetere (`st.consCooldown`).
- **Città**: `GAME.cittaDaGestire(fid)` (coda vuota), incluse nell'avviso di fine turno e nell'auto-avanzamento (`autoAvanza` ora salta prima le truppe poi le città), icona 🔨 pulsante sulla mappa, pulsante 📜 Ricerca lampeggiante se nessuna ricerca attiva.
- **Grafica truppe**: `soldato(ctx,...,era,speciale)` ridisegnato con elmo/scudo storici per epoca (`elmoEra`, `scudoEra`), armi più dettagliate, mantello/mostrine per unità speciali/eroi, cavalieri e macchine d'assedio per epoca.

## File toccati
`game.js` (costoTech, techBonus, sbloccatiDaTech, cittaDaGestire, propostaConsigliere, eseguiProposta), `data_game.js` (+18 tech a rami), `art.js` (soldato/elmoEra/scudoEra/cavallo/macchina riscritti), `map.js` (icona 🔨, passa era/speciale al soldato), `ui.js` (proponiAzione, autoAvanza esteso, avviso fine turno con città, pulsante ricerca lampeggiante), `style.css` (.cons-azioni, .pulsa, .m-ramo).

## Passata "mai noioso" (settembre 2026, v52) — scelte di Danilo: B+C (pressione, obiettivi, ritmo), IA proporzionata alla difficoltà, città a 3 carte
Diagnosi (partita di 180 turni a giocatore passivo): zero guerre subite, zero città perse, 13 sistemi paralleli con bonus da +8%, turni vuoti.
- **Pressione**: le IA confinanti più forti minacciano il giocatore (3 turni di "Voci di guerra", poi guerra) con parametri per difficoltà (`AGGR` in ai.js: era minima, rapporto di forza, probabilità; coalizione solo a Re di Sicilia). Fase protetta: 2 ere a facile, 1 a normale, 0 a difficile.
- **Invasori-boss**: finché tengono città (<10) annettono ogni 8 turni una città vicina senza guarnigione e ricevono rinforzi ogni 6 turni (max 4 unità); cacciarli del tutto = +150+era×50 oro e +40 punti. Sbarchi scalati con la difficoltà (×0.4/0.55/0.75).
- **Obiettivi d'era** (`OBIETTIVI`, 3 per era) con premio oro/cultura, punteggio (`punteggio()`), pannello "🎯 Obiettivi" nel menu e classifica finale a punti nel 1700.
- **Dilemmi** (`DILEMMI`, 13) con 2 scelte, mini-linguaggio `fx:oro:80;unrest:1;…`, circa uno ogni 5 turni; eventi casuali "senza scelta" dimezzati.
- **Ritmo**: Normale 20 turni/era (era 30), Blitz 12, Epica 40. **Turno automatico** (⏩ accanto a Fine Turno, memorizzato): se non c'è nulla da decidere il turno passa da solo dopo 0,9 s; si ferma su eventi, truppe ferme, città senza ordini, ricerca vuota, crisi (prio ≥ 9).
- **Città a 3 carte**: a fine turno ogni città senza ordini propone 3 costruzioni sensate (`carteCostruzione`) + "Apri la città" + "Automatico per tutte".
Non fatto (pacchetto A, rimandato): taglio tech 54→24, edifici 20→10, pannello Corte unico, diplomazia a 2 azioni.
