# TRINACRIA — Adattamento da Civilization VI (settembre 2026)

Studio di partenza: le tre idee che distinguono Civ VI da ogni predecessore — la città che
esce dal suo esagono, la ricerca che si accelera facendo le cose, le città che cambiano
padrone per fedeltà invece che per assedio. Tutte e tre parlano siciliano.

Realizzato in tre fasi, dalla v126 alla v152.

---

## Fase 1 — Intuizioni, Covi, Età (v126→v135)

**Intuizioni (le Eureka).** Tutte e 55 le tecnologie hanno un campo `intuizione:{testo,check}`:
un'azione concreta che, compiuta, sconta la ricerca del 40%. «Fonda una città sulla costa» per
la Navigazione, «Sconfiggi una banda di briganti» per la Falange. Il controllo gira a fine
turno (`controllaIntuizioni`), il mini-linguaggio dei requisiti sta in `checkIntuizione`.

**Covi di briganti.** Otto accampamenti sui rilievi, lontani dalle capitali, che sfornano bande
e crescono se ignorati. Spazzarne uno dà oro e conta per l'Intuizione della Falange. Nascono
nuovi covi nelle terre disabitate quando ne restano pochi, così la meccanica non sparisce a
metà partita.

**Età d'oro, normale, oscura, eroica.** A ogni cambio d'era il regno riceve un giudizio
sull'era appena chiusa: il giocatore dagli obiettivi d'era, l'IA dalla classifica del
punteggio. Un'età oscura seguita da un'età d'oro è eroica. L'età modifica cibo, cultura e
malcontento, e pesa sulla fedeltà.

## Fase 2 — Quartieri (v136→v139)

Sei quartieri occupano una **casella del territorio** della città e rendono in base a cosa
hanno intorno. È il motivo per cui conviene guardare la mappa prima di costruire.

| Quartiere | Rende | Cresce vicino a |
|---|---|---|
| Fucina | produzione | colline, monti, miniere |
| Agorà | cultura | altri quartieri, centro città |
| Marina | oro e cibo | mare aperto (solo sulla costa) |
| Fondaco | oro | fiumi, quartieri, risorse |
| Sagrato | cultura, calma il popolo | montagne, boschi |
| Studium | scienza | montagne, laghi, fiumi |

Quando scegli un quartiere la mappa accende le caselle possibili e scrive su ognuna quanto
renderebbe, con la migliore che pulsa in oro. Il tetto per città è `1 + pop/3`, massimo sei.

Grafica a costo zero: sprite di abitato già esistente più un'insegna con l'icona di un
edificio affine.

## Fase 3 — Fedeltà, Pane e Feste, Grandi Siciliani (v140→v152)

**Fedeltà.** Ogni città ha una fedeltà 0-100. Le città entro nove esagoni fanno pressione
(−10% per esagono): le tue la tengono su, quelle altrui la tirano giù. Contano anche
l'integrazione culturale, il malcontento, l'età del regno e **la distanza dalla capitale**.
Sotto 75 le rese calano; a zero la città si ribella e diventa **libera**, si difende da sola e
poi si unisce a chi preme di più. È il freno che mancava alle conquiste lontane da casa: la
Sicilia non è mai stata presa città per città, è passata di mano per gravitazione.

**Pane e Feste.** Le **case** mettono un tetto alla popolazione (borgo, capitale, acqua, campi,
granaio, porto, acquedotti, terme, qanat, Marina, Fondaco): le città non crescono più tutte
fino a venticinque abitanti, e granai e acquedotti hanno finalmente un motivo di esistere. I
**servizi** arrivano dalle DOP (ognuna serve quattro città), dalle sagre e dai luoghi di
ritrovo; se mancano, la città cresce fino al 40% in meno. I primi quattro abitanti non chiedono
nulla.

**Grandi Siciliani.** Ventiquattro figure storiche in quattro file, in ordine cronologico:

- **Scienziati**: Empedocle, Archimede, Diodoro Siculo, Al-Idrisi, Federico II, Maurolico
- **Condottieri**: Ducezio, Gelone, Timoleonte, Ruggero I, Giovanni da Procida, Ruggero di Lauria
- **Artisti**: Stesicoro, Eschilo, Teocrito, Ciullo d'Alcamo, Antonello da Messina, Serpotta
- **Mercanti**: Ierone II, Ibn Hawqal, Giorgio di Antiochia, Chiaramonte, Speciale, Ventimiglia

I quartieri generano i punti (lo Studium gli scienziati, il Fondaco i mercanti). Il costo è
globale e sale a ogni personaggio preso, e sale ancora per chi in quella categoria ne ha già
presi: è una corsa, non una lista della spesa. Chi arriva primo se lo prende, gli altri
restano davanti al successivo. Ritratti a olio generati apposta, uno per figura.

---

## Non adottato, e perché

- **Una unità per esagono**: obbliga a schierare ma trasforma ogni spostamento in un rompicapo
  di traffico. Con diecimila esagoni e un giocatore che gioca anche da telefono, la pila di
  quattro è più leggibile. La tattica la danno i ruoli che già esistono.
- **Religione**: in Sicilia sarebbe un tema fortissimo, ma Civ VI la gestisce con missionari
  che si combattono a colpi di preghiera e vuole un intero sottosistema. Meglio farla emergere
  dalla fedeltà e dalla cultura delle città, che sono già greca, araba, normanna.
- **Clima e disastri procedurali**: l'Etna, il terremoto del 1693 e la peste esistono già come
  eventi storici datati. È più forte così.
- **Editti (carte politiche)**: rimandati. Da fare solo se il gioco chiede ancora profondità.

## Prestazioni

L'indice del territorio (`indiceTerritorio`, una Map città → caselle possedute) ha tolto la
scansione di tutti i 10.405 esagoni di terra che `reseComune` faceva per ogni città a ogni
turno. **Il turno è passato da 190 a 21 millisecondi.** Vale la regola già imparata con
`vicini()` e `indiceUnita()`: mai scorrere un array globale dentro un ciclo per-entità.

---

## Fase 4 — Caselle da comprare, risorse visibili, Editti, ricerca a cascata (v153→v163)

**Le caselle si comprano.** Una casella fuori dal regno non rende nulla e non si può migliorare:
l'unica cosa che si può fare è comprarla con l'oro. Il prezzo sale con la distanza dal centro e
con quante caselle la città ha già; si comprano solo quelle che toccano il tuo territorio,
entro cinque esagoni dalla città. Il pannello dice quanto renderebbe una volta dentro il regno,
così la decisione si prende guardando la mappa. I confini continuano a crescere da soli con la
popolazione: l'oro serve a prendere *subito* quella che ti interessa. Anche l'IA compra, tanto
più quanto è ricca, ed è finalmente uno sbocco per l'oro che si accumulava senza scopo.

**Le risorse si vedono.** Erano una per comune, 69 su diecimila caselle: troppo rade perché
guardare la mappa servisse a scegliere. Ora sono circa 360, distribuite per terreno (pesce e
sale sulla costa, marmo e zolfo sui monti, vino e mandorle sulle colline), mai due attaccate,
e si ridisegnano **sopra il velo della nebbia** sulle caselle già scoperte, con un cerchietto
dorato su quelle fuori dai regni: sono le occasioni da comprare.

**Editti.** Sedici carte politiche sbloccate dalle tecnologie che già esistono. Un seggio
all'inizio, uno in più ogni due ere, un altro ancora con lo Stato moderno. Hanno tutti un
prezzo: il Latifondo dà cibo e malcontento, la Corvée produzione e meno oro, il Mecenatismo
cultura e meno oro. Il primo seggio è gratis, cambiare idea costa. L'IA sceglie fra le tre che
le somigliano di più, così i regni non finiscono tutti uguali.

**Ricerca a cascata.** Il menù elencava tutte e cinquantacinque le tecnologie, era dopo era,
comprese quelle irraggiungibili. Ora mostra la ricerca in corso con i turni che mancano, poi
solo quelle che **puoi cominciare adesso** (con costo, cosa sbloccano e l'intuizione che le
sconta), e sotto quelle che quelle scelte aprirebbero, ognuna con scritto dopo quale.

**Due bug che tenevano l'isola in pace per sempre.** La probabilità di guerra fra IA
moltiplicava per un oggetto invece che per un numero: valeva `NaN`, e un confronto con `NaN` è
sempre falso, quindi nessuna IA ha mai dichiarato guerra a un'altra. In più il rancore di
confine calava di uno ogni quattro turni ma si riassorbiva di mezzo punto ogni turno: l'umore
restava inchiodato a zero, sotto la soglia di guerra non ci arrivava mai. Corretti entrambi,
e la simpatia ora ha un tetto, perché patti e accordi commerciali sommandosi rendevano tutti
amici per sempre.
