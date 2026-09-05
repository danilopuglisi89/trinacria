# TRINACRIA — Scaletta del Restyling Grafico
*Deciso con seconda intervista (20 domande) — luglio 2026. Lavoro autonomo notturno.*

## Le scelte dell'intervista grafica
### Mappa stile Maps
1. **Base**: "Maps disegnata offline" — ricreo l'aspetto di una mappa moderna nel codice, funziona sempre, veloce
2. **Dettaglio**: rilievi e ombre (hillshade), fiumi/laghi/coste precise, vegetazione e colori del terreno, strade e nomi stile Maps
3. **Città**: monumenti reali riconoscibili (Etna, templi, cattedrali, castelli, teatri)
4. **Zoom**: fluido multi-livello con livelli di dettaglio (LOD)

### Truppe e battaglie
5. **Truppe sulla mappa**: mini-eserciti animati (gruppetti di 3-5 soldatini per unità)
6. **Scheda unità**: icona + statistiche (compatta)
7. **Battaglie**: effetti rapidi sulla mappa (spade incrociate, polvere, numeri di danno)
8. **Effetti mappa**: costruzioni che appaiono, conquiste/eventi evidenziati, movimento animato, fumo/fuoco/eruzioni

### Personaggi
9. **Ritratti**: cornice araldica (volto stilizzato + stemma casata)
10. **Leader in gioco**: ritratto grande solo ai cambi di sovrano
11. **Eventi**: illustrazione grande + testo
12. **Intro**: selezione fazione illustrata (stemma + ritratto leader iniziale + mappa territorio di partenza)

### Stile
13. **Stile artistico**: affresco / mosaico siciliano (bizantino-normanno)
14. **Palette**: caldi mediterranei (ocra, terracotta, oro, blu mare, verde oliva)
15. **Animazioni UI**: molto curate, transizioni ovunque
16. **Identità fazioni**: colore territorio + confini netti

### Produzione
17. **Metodo**: misto — grafica disegnata nel codice (SVG/canvas mosaico) + poche immagini AI per sfondi/eventi chiave
18. **Priorità**: scaletta + tutto in autonomia
19. **Consegna**: fare tutto, mostrare il finito
20. **Ambizione**: massima resa possibile

## Piano di lavoro
1. `js/art.js` — libreria arte procedurale: palette, tesserae mosaico, monumenti, soldatini, stemmi, ritratti, illustrazioni eventi
2. `js/fx.js` — animazioni: tween movimento, particelle (fumo/fuoco/polvere), testo fluttuante, pop costruzioni, flip conquiste
3. `js/map.js` — rendering nuovo: hillshade, terreno mosaico, fiumi/coste/strade, etichette, monumenti, mini-eserciti, LOD zoom
4. `js/ui.js` + `css/style.css` — intro illustrata, modale cambio sovrano, eventi illustrati, scheda unità, transizioni
5. Immagini AI: sfondo titolo (mosaico panoramico) + poche illustrazioni eventi, salvate in `assets/`
6. Collaudo: simulazioni + screenshot

## Vincolo
Mantenere INTATTE tutte le regole, i salvataggi e le meccaniche già collaudate: cambia solo la veste grafica.
Le 32 scelte di gameplay originali restano in DESIGN.md.

## 2ª passata — grafica AI con Higgsfield (settembre 2026, v48)
Scelte di Danilo: tutto in AI **mappa compresa**, stile fedele al mosaico bizantino-normanno, budget fino a ~550 crediti, "prima lo style sheet, poi tutto".
- **Foglio master** (`assets/ref/master.png`, job `2a897e74-…`): approvata la variante B; riusata come `image_references` in ogni foglio successivo (nano_banana_pro 2K — il 4K richiede piano Plus). Icone con `recraft_v4_1` vector (uscita SVG, rasterizzata con PyMuPDF).
- **Metodo**: fogli-griglia su fondo magenta → `scratchpad/sprites_tool.py` (chroma-key, rilevamento celle, atlanti WebP LOD 64/256, `manifest.json`, icone PNG singole) → `js/sprites.js` (loader, tinta fazione via maschera bianca `<id>_m`, fallback a `ART.*` per categoria).
- **Asset**: 21 texture terreno (world-anchored, `TEX_KM=R*2.5`), 32 città (4 stili × 8 tier), 12 monumenti generici + 27 reali (`mon_c_<slug>`), 36 unità, 111 icone, 7 stemmi, 7 ritratti + Don Calorio, 6 illustrazioni-evento rigenerate + 5 cambi d'era (`era_1..5.jpg`) + `intro_bg.jpg` + favicon; capsule Steam in `desktop/steam_art/`.
- **Resta procedurale**: sovrano personalizzabile/guardaroba (combinatorio), effetti FX, hillshade/fiumi/strade/confini, bandiere, segnalini a zoom basso.
- Crediti spesi: ~136 su 596.
