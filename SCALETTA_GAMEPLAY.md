# TRINACRIA — Aggiornamento Gameplay & Guida
*Terza intervista (16 domande) — luglio 2026. Obiettivo: movimenti chiari, niente truppe dimenticate, guida che suggerisce.*

## Le scelte dell'intervista

### Truppe che restano ferme
1. **Promemoria**: il turno non finisce senza avviso → "Hai N unità ferme, gestiscile o finisci comunque"
2. **Dopo un'azione**: auto-avanza alla prossima truppa ferma (seleziona + centra camera)
3. **Riepilogo**: lista laterale dell'esercito sempre visibile (a destra), cliccabile
4. **Comportamento**: fortifica-sentinella (di guardia) + guarigione stando fermi

### Movimenti
5. **Mostra mosse**: frecce rosse verso i bersagli attaccabili
6. **Comando**: clic sull'unità, poi clic sulla destinazione
7. **Viaggi lunghi**: anteprima percorso + conferma, poi marcia automatica (goto) su più turni
8. **Attacco**: caselle nemiche rosse + icona spade ⚔️

### Guida
9. **Tutorial**: cartelli a comparsa al primo uso (non forzato)
10. **Consigliere**: Don Calorio, vecchio saggio con la coppola, parla nei momenti giusti
11. **Suggerimenti**: militari, economici, ricerca, malcontento/crisi
12. **Stile avvisi**: fumetto del consigliere quando serve

### Rifiniture
13. **Personaggio**: Don Calorio, con voce e ironia siciliana
14. **Info unità**: essenziali e compatte + pulsanti azione (Fortifica, Ferma marcia)
15. **Livello aiuto**: si adatta da solo (molti consigli all'inizio, meno col tempo)
16. **Priorità**: tutto insieme in autonomia

## Cosa è stato implementato
- **Movimento**: caselle verdi (muovi) / rosse con ⚔️ (attacca); frecce rosse pulsanti verso i bersagli; clic su luogo lontano → modale "Marcia verso X: ~N turni" → l'unità viaggia da sola (linea dorata con ⚑). Si ferma solo davanti a un **vero** nemico (fazione in guerra o invasore), non ai briganti sparsi.
- **Unità dimenticate**: avviso a Fine Turno se restano truppe ferme; **Barra spaziatrice** salta alla prossima; dopo ogni azione auto-avanza; **lista Esercito** a destra con stato (● da muovere / ✓ mossa / 🚶 in marcia / 🛡️ di guardia), le ferme pulsano.
- **Fortifica**: mette l'unità di guardia (si cura +15/turno, sparisce dalle "da gestire"); si risveglia selezionandola. Guarigione anche per truppe ferme in territorio proprio.
- **Don Calorio** (`ART.consigliere`): ritratto procedurale + fumetto; motore `GAME.suggerimenti()` con priorità (crisi > militare > ricerca > economia); aiuto adattivo (`livelloAiuto`: alto <12 azioni, medio <45, poi basso).
- **Tutorial contestuali**: al primo movimento, prima città, primo viaggio, prima fortifica (flag in `st.visti`).

## File toccati
`game.js` (campi unità goto/fortificata/camminato, trovaPercorso/impostaGoto/processaGoto/fortifica/svegliaUnita/unitaFerme/suggerimenti/minacciaVicina, guarigione estesa), `map.js` (frecce + icona spade + indicatore ⚑ destinazione), `art.js` (`consigliere`), `ui.js` (clickHex/selezionaHex/eseguiMovimento/proponiViaggio/autoAvanza/centraSu + consigliere/tutorial/lista armata/aiuto adattivo + avviso fine turno + Spazio), `index.html` (#armata #consigliere #tutorial-card), `style.css`.

## Bug corretto
Il pulsante Fine Turno passava l'oggetto evento come parametro `force`, saltando l'avviso truppe ferme. Risolto con `onclick = () => fineTurno()`.
