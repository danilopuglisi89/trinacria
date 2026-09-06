# TRINACRIA — Terreno e texture della mappa (v67)

Nato da due segnalazioni: «si vedono i quadrati invece degli esagoni» e «le texture sono
messe a caso, gli esagoni devono parlare tra loro e simulare la Sicilia vera».
Erano **tre difetti distinti**, non uno.

## 1. La scala dell'orografia era rotta (il difetto grosso)

`KX/KY` (geografia → mondo) sono passati nel tempo da ~88 a **287/360**: oggi
**1 km reale = 3,25 unità-mondo**. Ma la tabella `ZONE` aveva i raggi già espressi in
unità-mondo, tarati quando 1 unità ≈ 1 km. Quei raggi (11-21) valevano quindi **4-7 km
reali**: le catene montuose erano puntini.

Misura prima del fix: **10.012 esagoni su 10.451 erano pianura (96%)**. Da qui l'impressione
di «stesso motivo ovunque»: non era la texture, era che quasi tutta l'isola *era* pianura.

Ora i raggi sono in **chilometri veri** e si convertono con `KMU = KX/88.3`, quindi un futuro
cambio di scala non li rompe più. Le zone seguono l'orografia reale (Peloritani, Nebrodi,
Madonie, Erei, Iblei, Sicani, Monti di Palermo, Erice) e le pianure vere riconquistano il
terreno sulle colline dove l'isola è davvero piatta (Piana di Catania, Conca d'Oro, Piana di
Gela, Marsala-Mazara, Piana di Milazzo).

| | mappa | Sicilia reale |
|---|---|---|
| montagna | 22,5% | 24,5% |
| collina | 62,3% | 61,4% |
| pianura | 13,8% | 14,1% |

Stesso errore di scala aveva l'Etna (`dEtna < 7` = 2 km!): ora in km, edificio vulcanico ~45 km.

## 2. I boschi erano coriandoli

`build()` sostituiva montagna/collina con foresta usando **rumore bianco per-esagono**
(`rngSeme(row*COLS+col) < 0.30`): due esagoni confinanti ricevevano numeri scorrelati, quindi
alberi isolati sparsi nella roccia. Ora c'è un **rumore coerente** (`rumore`/`fbm`, value noise
con smoothstep + 3 ottave) campionato sulle coordinate-mondo: i boschi formano macchie di
~30 km, come i versanti dei Nebrodi.

Lo stesso rumore sceglie la **variante di texture** (0-2): cambia di rado e sempre lungo un
lato d'esagono, mai lungo una retta che taglia la mappa.

## 3. I quadrati: tre cause in fila, risolte in ordine

1. **Griglia quadrata**: la variante veniva scelta per cella `TEX_KM` (una cella quadrata più
   larga di un esagono). Al confine fra due celle la variante cambiava di netto → righe dritte
   che attraversavano gli esagoni. → variante dal rumore, per esagono.
2. **Cuciture della texture**: le tessere non erano ripetibili, quindi affiancate mostravano il
   bordo. Provato l'affiancamento **a specchio**: elimina le cuciture ma crea una vistosa
   simmetria a farfalla, cioè un altro pattern — **scartato**. Le tessere sono invece state
   rese davvero ripetibili con `scratchpad/seamless.py` (sfalsamento con avvolgimento di mezza
   tessera, che rende i bordi continui per costruzione, più dissolvenza morbida della croce
   centrale rimasta). `TEX_KM` portato a `R*7` (~22 km) perché il motivo si ripeta di rado.
3. **Sbavatura dell'atlante**: il packer lasciava 1 px **trasparente** attorno a ogni frame;
   disegnando la tessera ingrandita, l'interpolazione bilineare ci sbavava dentro e lasciava
   una riga chiara a ogni confine (~313 px a zoom 14, esattamente il passo di `TEX_KM`).
   `sprites_tool.py` ora **estrude i bordi** di 1 px; per il gruppo `terreno` l'estrusione è ad
   **avvolgimento**, così il campionamento a cavallo di due tessere legge i pixel corretti.

## 4. Le tessere di montagna e collina erano vedute in prospettiva

Difetto preesistente emerso dalle catture: `terra_mountain_0..2` e parte delle colline erano
**paesaggi con orizzonte e cielo azzurro**, non terreno visto dall'alto — da cui le bande blu
sulle catene montuose. Rigenerate dall'alto (`nano_banana_pro`, 1 foglio, 2 crediti), ritagliate
e rese ripetibili.

## Regole da rispettare in futuro

- Ogni distanza o raggio nuovo va espresso in **km** e moltiplicato per `KMU`, mai in
  unità-mondo: le costanti in unità-mondo si rompono silenziosamente a ogni cambio di scala.
- Per far variare qualcosa sulla mappa usare `fbm(x, y, scalaKm*KMU, seme)`, **mai** `rngSeme`
  su indice di esagono: quello è rumore bianco e produce coriandoli.
- Ogni texture che viene affiancata dev'essere passata da `seamless.py` **e** impacchettata con
  estrusione ad avvolgimento; una sola delle due non basta.
