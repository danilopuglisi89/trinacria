# TRINACRIA — Mappa più ricca, truppe e cibo siciliano
*Quarta intervista (16 domande) — luglio 2026. Lavoro autonomo.*

## Le scelte

### Mappa più ampia e più nomi
1. **Ampiezza**: isola più grande e dettagliata (vista iniziale più ravvicinata z=7.5, zoom max 22)
2. **Nomi**: paesi/frazioni + monti/fiumi/laghi + capi/golfi/coste + siti storici/templi (52 luoghi in `data_luoghi.js`)
3. **Etichette**: intelligenti per zoom (LOD, soglia `zMin` per luogo)
4. **Esplorazione**: opzione a inizio partita (Mappa aperta / Nebbia di guerra)

### Truppe più visibili
5. **Resa**: soldatini più grandi + stendardo con simbolo del tipo e colori fazione
6. **Info a colpo d'occhio**: barra vita, numero nel gruppo, anello "da muovere"/scudo di guardia, galloni veterani
7. **Animazioni**: movimento fluido (già presente), resto sobrio
8. **Feedback**: evidenzia e centra sull'azione (scontri che ti toccano nel turno IA → camera + effetto + avviso di Don Calorio)

### Varietà truppe
9. **Nuove**: unità di supporto (esploratore, tamburino, medico, geniere) + unità uniche di fazione
10. **Distinzione**: ruoli tattici chiari (sasso-carta-forbici)
11. **Composizione**: mix bilanciato conta molto (armi combinate)
12. **Reclutamento**: edifici (caserma/scuderia/arsenale) + tech sbloccano i tipi

### Cibo e tipicità
13. **Bonus**: legati alla cucina (prodotti → piatti → bonus)
14. **Premi**: sagre/feste + prodotti DOP collezionabili + meraviglie del gusto
15. **Raccolta**: migliorie + tecnologia (controllo comune + tech eventuale)
16. **Peso**: un bel sistema in più, non invadente

## Cosa è stato implementato
- **Ruoli tattici**: cavalleria batte arcieri, arcieri battono fanteria, fanteria (lance) batte cavalleria; assedio debole in campo aperto ma abbatte le mura. Bonus **armi combinate** se schieri più ruoli.
- **Edifici militari**: 🏛️ Caserma (uniche, tamburini, medici), 🐎 Scuderia (cavalleria), 🛠️ Arsenale (assedio, genieri). L'IA li costruisce e schiera eserciti vari.
- **Unità di supporto**: Esploratori (veloci, ampia vista), Tamburini (+morale ai vicini), Medici (curano i vicini), Genieri (danno alle mura).
- **Cucina** (`GDATA.DOP/PIATTI/SAGRE`): 13 prodotti DOP legati ai comuni reali (Pistacchio di Bronte, Cioccolato di Modica, Nero d'Avola, Grano di Enna, Cassata di Palermo…). Controllare il comune → bonus permanente + entra in dispensa. Collezionando categorie sblocchi **piatti** (Arancino, Pasta alla Norma, Cannoli, Cùscusu…) con bonus %. **Sagre** a pagamento per spinte temporanee. **Meraviglie del gusto** (Saline di Trapani, Tonnara di Scopello, Mercato di Ballarò, Giardino della Kolymbethra). Pannello 🍴 Cucina in alto.
- **Nebbia di guerra** opzionale: territorio non esplorato oscurato, nemici nascosti finché non li avvisti; gli esploratori vedono più lontano.

## File toccati
`data_luoghi.js` (nuovo), `data_game.js` (support units, edifici militari, DOP/PIATTI/SAGRE, meraviglie del gusto), `map.js` (etichette luoghi LOD, stendardi/veterani/stato truppe, frecce, nebbia), `art.js` (categorie supporto), `game.js` (ruoli+armi combinate, cucina+memo, nebbia, evidenzia scontri, gating reclutamento, aure supporto), `ai.js` (edifici militari + eserciti vari), `ui.js` (pannello Cucina, opzione nebbia, centra su scontri), `index.html`, `style.css`.
