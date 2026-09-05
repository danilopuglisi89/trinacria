# TRINACRIA — Design Document
*Gioco strategico a turni stile Civilization ambientato in Sicilia — deciso con intervista in 32 domande (luglio 2026)*

## Le 32 scelte di design

### Epoca e Mappa
1. **Epoca**: tutte le epoche con progressione (735 a.C. → 1700 d.C., 6 ere)
2. **Territorio**: 151 comuni reali della Sicilia
3. **Mappa**: griglia esagonale sovrapposta alla geografia reale
4. **Geografia**: molto strategica — Etna, Nebrodi, Madonie, fiumi influenzano movimento e battaglie

### Gameplay
5. **Turni**: classici (muovi tutto, Fine Turno)
6. **Vittoria**: conquista totale (elimina le fazioni rivali / controlla l'isola)
7. **Fazioni**: 7 città-stato
8. **Durata**: scelta a inizio partita (Blitz / Normale / Epica)

### Fazioni e Personaggi
9. **Fazioni**: città-stato con anime culturali diverse (Siracusa greca, Palermo punico-araba...)
10. **Leader**: dinastie che si succedono — invecchiano, muoiono, ereditano con tratti diversi
11. **Personaggi storici**: unità eroe sulla mappa + protagonisti di eventi narrati con scelte
12. **Fazione del giocatore**: Catania (default, tutte selezionabili)

### Guerra
13. **Battaglie**: auto-risolte con anteprima delle probabilità
14. **Truppe**: linee classiche (fanteria/tiro/cavalleria/assedio) + unità uniche siciliane
15. **Assedi**: mura con punti vita, macchine d'assedio, i paesi piccoli cadono subito
16. **Peso guerra**: sviluppo dominante (70% sviluppo / 30% guerra)

### Economia
17. **Risorse**: 4 base (oro, cibo, produzione, scienza/cultura) + risorse siciliane reali (zolfo, sale, grano, vino, agrumi, tonno, marmo, pistacchio, ceramica, mandorle, miele)
18. **Edifici**: visibili sulla mappa (fattorie, miniere, vigneti sugli esagoni)
19. **Tecnologie**: albero di ricerca + eventi storici che stravolgono il progresso
20. **Meraviglie**: costruibili con grandi bonus, legate ai luoghi reali (Concordia solo ad Agrigento...)

### Diplomazia ed Eventi
21. **Diplomazia**: media — pace/guerra, patti di non aggressione, commercio risorse
22. **Eventi**: TUTTI — disastri naturali (Etna, 1693), invasioni storiche (Romani, Arabi, Normanni...), rivolte sociali (Vespri), epidemie (peste 1347 da Messina)
23. **Religione**: leggera — templi/chiese per stabilità, senza conversioni
24. **Popolazione**: con identità culturale (greca, araba, normanna...) che si assimila lentamente; rivolte se governata male

### Grafica e Atmosfera
25. **Stile**: satellitare realistico con esagoni
26. **Città**: crescono a vista (borgo → città murata → grande città)
27. **Audio**: musica siciliana d'epoca (tarantella procedurale WebAudio) + effetti
28. **Lingua**: italiano con sapore siciliano ("Picciotti all'armi!")

### Tecnica
29. **Piattaforma**: browser (apri index.html), pubblicabile online per gli amici
30. **Giocatori**: single player contro 6 IA
31. **Salvataggi**: automatico ogni turno + 3 slot manuali (localStorage)
32. **Nome**: TRINACRIA

## Le 6 Ere
| # | Era | Anni | Cultura |
|---|-----|------|---------|
| 1 | Greca | 735–264 a.C. | greca / punica / sicula |
| 2 | Romana | 264 a.C.–535 d.C. | romana |
| 3 | Bizantina | 535–827 | bizantina |
| 4 | Araba | 827–1061 | araba |
| 5 | Normanno-Sveva | 1061–1282 | normanna |
| 6 | Aragonese | 1282–1700 | siciliana |

## Le 7 Fazioni
- **Catania** (rosso) — terre fertili dell'Etna: +cibo/produzione vulcanica, UU Picciotti dell'Etna
- **Palermo** (oro) — la capitale ricca: +oro, UU Arcieri Saraceni
- **Messina** (blu) — lo Stretto: +oro dai commerci, UU Balestrieri dello Stretto
- **Siracusa** (turchese) — la gloria greca: +scienza, UU Opliti Siracusani
- **Agrigento** (viola) — la città dei templi: meraviglie e templi -25%, UU Cavalieri di Akragas
- **Trapani** (arancio) — sale e tonnare: +oro dalle risorse, UU Frombolieri Elimi
- **Enna** (verde) — il granaio: +cibo dal grano, +difesa, UU Guardia della Rocca

## Come si gioca
Apri `index.html` con Chrome/Edge. Nuova partita → scegli fazione, velocità, difficoltà.
Click su unità → esagoni evidenziati → click per muovere/attaccare (anteprima battaglia).
Click su una tua città → pannello costruzioni. Click su esagono del tuo territorio → migliorie.
Fine Turno in basso a destra.
