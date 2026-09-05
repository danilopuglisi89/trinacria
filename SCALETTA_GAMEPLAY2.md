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
