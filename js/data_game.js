// TRINACRIA — dati di gioco: ere, fazioni, tech, unità, edifici, meraviglie, eventi
window.GDATA = (function(){

const ERE = [
  { id:0, nome:"Era Greca",          da:-735, a:-264, cultura:"greca" },
  { id:1, nome:"Era Romana",         da:-264, a:535,  cultura:"romana" },
  { id:2, nome:"Era Bizantina",      da:535,  a:827,  cultura:"bizantina" },
  { id:3, nome:"Era Araba",          da:827,  a:1061, cultura:"araba" },
  { id:4, nome:"Era Normanno-Sveva", da:1061, a:1282, cultura:"normanna" },
  { id:5, nome:"Era Aragonese",      da:1282, a:1700, cultura:"siciliana" }
];

// turni per era in base alla velocità
const VELOCITA = {
  blitz:   { nome:"Blitz",   turniEra: 12 },
  normale: { nome:"Normale", turniEra: 20 },
  epica:   { nome:"Epica",   turniEra: 40 }
};

const CULTURE = {
  greca:     { nome:"Greca",     agg:"greco",     tempio:"Tempio dorico" },
  punica:    { nome:"Punica",    agg:"punico",    tempio:"Tempio di Melqart" },
  sicula:    { nome:"Sicula",    agg:"siculo",    tempio:"Santuario dei Palici" },
  romana:    { nome:"Romana",    agg:"romano",    tempio:"Tempio di Giove" },
  bizantina: { nome:"Bizantina", agg:"bizantino", tempio:"Basilica" },
  araba:     { nome:"Araba",     agg:"arabo",     tempio:"Moschea" },
  normanna:  { nome:"Normanna",  agg:"normanno",  tempio:"Cattedrale normanna" },
  siciliana: { nome:"Siciliana", agg:"siciliano", tempio:"Chiesa barocca" }
};

// Fazioni giocabili — capitale = nome comune in DATA_COMUNI
const FAZIONI = [
  { id:0, nome:"Catania",   colore:"#c8382e", colore2:"#8e2620", capitale:"Catania",
    motto:"Sutta 'a muntagna, supra a tutti!",
    bonus:"Terre vulcaniche: +30% cibo e produzione dagli esagoni vicini all'Etna",
    bonusId:"etna", cultura0:"greca",
    citta:["Acireale","Paternò","Adrano"] },
  { id:1, nome:"Palermo",   colore:"#d9a520", colore2:"#96700f", capitale:"Palermo",
    motto:"Prima sedes, corona regis et regni caput",
    bonus:"Conca d'Oro: +4 oro nella capitale e mercati a metà prezzo",
    bonusId:"oro", cultura0:"punica",
    citta:["Monreale","Bagheria","Carini"] },
  { id:2, nome:"Messina",   colore:"#2e6da4", colore2:"#1d4a75", capitale:"Messina",
    motto:"Cu' teni u Strittu, teni u Munnu",
    bonus:"Lo Stretto: +3 oro per ogni patto commerciale, unità -15% mantenimento",
    bonusId:"stretto", cultura0:"greca",
    citta:["Milazzo","Taormina","Rometta"] },
  { id:3, nome:"Siracusa",  colore:"#159587", colore2:"#0d6459", capitale:"Siracusa",
    motto:"La città più bella tra le città greche",
    bonus:"Eredità di Archimede: +30% scienza",
    bonusId:"scienza", cultura0:"greca",
    citta:["Augusta","Noto","Avola"] },
  { id:4, nome:"Agrigento", colore:"#8a4fa8", colore2:"#5d3373", capitale:"Agrigento",
    motto:"La più bella città dei mortali",
    bonus:"Valle dei Templi: meraviglie e templi -25% costo, +2 cultura",
    bonusId:"templi", cultura0:"greca",
    citta:["Sciacca","Licata","Naro"] },
  { id:5, nome:"Trapani",   colore:"#cf6b1e", colore2:"#8f4712", capitale:"Trapani",
    motto:"Tra u sali e u mari",
    bonus:"Saline e tonnare: +100% oro dalle risorse speciali",
    bonusId:"sale", cultura0:"punica",
    citta:["Marsala","Erice","Mazara del Vallo"] },
  { id:6, nome:"Enna",      colore:"#3d9142", colore2:"#27612b", capitale:"Enna",
    motto:"Urbs Inexpugnabilis — u granaru di Sicilia",
    bonus:"Il Granaio: +2 cibo per città, +30% difesa nelle città",
    bonusId:"grano", cultura0:"sicula",
    citta:["Piazza Armerina","Nicosia","Calascibetta"] }
];

// Leader storici: [fazione][era] -> nome (null = generato dalla dinastia)
const LEADER_STORICI = {
  0: { 0:"Caronda di Katane", 3:"Ibn al-Thumna", 4:"Federico II di Svevia" },
  1: { 0:"Himilkon di Ziz", 3:"al-Hasan al-Kalbi", 4:"Ruggero II d'Altavilla", 5:"Federico III d'Aragona" },
  2: { 0:"Anassila di Zancle", 2:"Eufemio di Messina", 5:"Ruggero di Lauria" },
  3: { 0:"Gelone di Siracusa", 1:"Gerone II", 2:"Costante II", 4:"Tancredi d'Altavilla" },
  4: { 0:"Terone di Akragas", 5:"Andrea Chiaramonte" },
  5: { 0:"Aceste degli Elimi", 3:"Ibn Mankut" },
  6: { 0:"Ducezio dei Siculi", 3:"Ibn al-Hawwas", 5:"Blasco d'Alagona" }
};

// Nomi per eredi generati, per cultura
const NOMI_EREDI = {
  greca:     ["Agatocle","Eraclide","Teocle","Ippia","Nicia","Ermocrate","Dione","Timoleonte","Aristodemo","Cleandro"],
  punica:    ["Annone","Amilcare","Asdrubale","Magone","Bomilcare","Adherbal","Giscone"],
  sicula:    ["Ducezio","Archonide","Sikanos","Morges","Italo","Kokalos"],
  romana:    ["Lucio Siculo","Marco Panormita","Gaio Catinense","Quinto Lilibetano","Tito Mamertino","Publio Agrigentino"],
  bizantina: ["Basilio","Niceforo","Costantino","Teodoro","Michele","Leone","Giorgio","Alessio"],
  araba:     ["Yusuf","Ahmad","Hasan","Ibrahim","Ja'far","Abd Allah","Muhammad","Ali","Khalil"],
  normanna:  ["Ruggero","Roberto","Tancredi","Guglielmo","Boemondo","Goffredo","Costanza","Adelasia","Simone"],
  siciliana: ["Federico","Manfredi","Corrado","Pietro","Giovanni","Martino","Eleonora","Antonio","Vincenzo","Giuseppe","Blasco","Matteo"]
};

const TRATTI = {
  guerriero:  { nome:"Guerriero",  desc:"+15% forza in battaglia", icona:"⚔️" },
  costruttore:{ nome:"Costruttore",desc:"-15% costo edifici",      icona:"🏗️" },
  mercante:   { nome:"Mercante",   desc:"+15% oro",                icona:"💰" },
  dotto:      { nome:"Dotto",      desc:"+15% scienza",            icona:"📜" },
  pio:        { nome:"Pio",        desc:"-2 malcontento in tutte le città", icona:"🙏" },
  ambizioso:  { nome:"Ambizioso",  desc:"-20% costo unità, +1 malcontento", icona:"👑" }
};

// Eroi/condottieri reclutabili per era
const EROI = {
  0: ["Ermocrate","Dione di Siracusa","Falaride","Empedocle in armi"],
  1: ["Salinatore","Aulo Siculo","Trioptolemo"],
  2: ["Giorgio Maniace","Niceta di Rametta","Basilio Boioannes"],
  3: ["Jawhar as-Siqilli","As'ad ibn al-Furat","Abbas ibn Fadhl"],
  4: ["Serlone d'Altavilla","Goffredo di Ragusa","Enrico di Paternò"],
  5: ["Alaimo da Lentini","Giovanni da Procida","Corrado Doria","Matteo Moncada"]
};

// ---- TECNOLOGIE (6 per era) ----
const TECH = [
  // Era 0 — Greca
  { id:"grano_t", intuizione:{ testo:"Costruisci un campo di grano", check:"mig:campo:1" }, req:[],   era:0, nome:"Agricoltura del Grano", costo:25,  desc:"Sblocca la Fattoria. +1 cibo dalle pianure." },
  { id:"falange", intuizione:{ testo:"Sconfiggi una banda di briganti", check:"briganti:1" }, req:[],   era:0, nome:"Falange Oplitica",      costo:30,  desc:"Sblocca gli Opliti." },
  { id:"templi_t", intuizione:{ testo:"Fonda una città accanto a un monte", check:"monte:1" }, req:["moneta"],  era:0, nome:"Templi Dorici",         costo:35,  desc:"Sblocca il Tempio e le meraviglie greche." },
  { id:"moneta", intuizione:{ testo:"Accumula 150 monete d'oro", check:"oro:150" }, req:["ceramica_t"],    era:0, nome:"Monetazione",           costo:35,  desc:"Sblocca il Mercato. +10% oro." },
  { id:"cavalli", intuizione:{ testo:"Possiedi tre città", check:"citta:3" }, req:["falange"],   era:0, nome:"Allevamento dei Cavalli", costo:40, desc:"Sblocca la Cavalleria greca." },
  { id:"poliorcetica", intuizione:{ testo:"Vinci una battaglia", check:"vinte:1" }, req:["falange"], era:0, nome:"Poliorcetica",       costo:45,  desc:"Sblocca l'Ariete. Sblocca le Mura di pietra." },
  { id:"navigazione", intuizione:{ testo:"Fonda una città sulla costa", check:"costiera:1" }, req:["ceramica_t"], era:0, nome:"Navigazione",         costo:40,  desc:"Sblocca la Nave onerarìa e la Bireme. Permette di imbarcare i coloni per popolare le isole." },
  // Era 1 — Romana
  { id:"strade", intuizione:{ testo:"Possiedi quattro città", check:"citta:4" }, req:["moneta"],    era:1, nome:"Strade Romane",         costo:60,  desc:"+1 movimento a tutte le unità. +5% oro." },
  { id:"legioni", intuizione:{ testo:"Addestra tre unità di fanteria", check:"unitaTipo:inf:3" }, req:["falange"],   era:1, nome:"Legioni",               costo:70,  desc:"Sblocca i Legionari e i Sagittari." },
  { id:"latifondo", intuizione:{ testo:"Costruisci tre fattorie", check:"mig:fattoria:3" }, req:["olivicoltura","strade"], era:1, nome:"Latifondo",             costo:70,  desc:"+1 cibo dalle Fattorie. Sblocca il Granaio." },
  { id:"acquedotti", intuizione:{ testo:"Fonda una città su un fiume", check:"fiume:1" }, req:["strade"],era:1, nome:"Acquedotti",            costo:80,  desc:"+25% crescita della popolazione." },
  { id:"baliste", intuizione:{ testo:"Costruisci un arsenale", check:"edificio:arsenale" }, req:["poliorcetica","legioni"],   era:1, nome:"Ars Militaris",         costo:85,  desc:"Sblocca la Balista e gli Equites." },
  { id:"diritto", intuizione:{ testo:"Arriva a 8 abitanti in una città", check:"pop:8" }, req:["templi_t"],   era:1, nome:"Diritto Romano",        costo:90,  desc:"-2 malcontento in tutte le città." },
  // Era 2 — Bizantina
  { id:"fortificazioni", intuizione:{ testo:"Costruisci le mura in una città", check:"edificio:mura1" }, req:["ingegneria_r"], era:2, nome:"Fortificazioni Bizantine", costo:110, desc:"Sblocca le Mura teodosiane (liv.2) e gli Skutatoi." },
  { id:"catafratti", intuizione:{ testo:"Costruisci una scuderia", check:"edificio:scuderia" }, req:["cavalli","legioni"],era:2, nome:"Catafratti",            costo:120, desc:"Sblocca i Catafratti." },
  { id:"monasteri", intuizione:{ testo:"Costruisci due templi", check:"edificioN:tempio:2" }, req:["diritto"], era:2, nome:"Icone e Monasteri",     costo:120, desc:"Sblocca la Basilica (+3 cultura). -1 malcontento." },
  { id:"fuocogreco", intuizione:{ testo:"Vara una nave da guerra", check:"nave:1" }, req:["navigazione","fortificazioni"],era:2, nome:"Fuoco Greco",           costo:130, desc:"Sblocca l'Onagro. +20% difesa nelle città costiere." },
  { id:"thema", intuizione:{ testo:"Possiedi sei città", check:"citta:6" }, req:["diritto"],     era:2, nome:"Amministrazione dei Themata", costo:140, desc:"+15% oro. Sblocca l'Accademia." },
  { id:"seta", intuizione:{ testo:"Controlla due prodotti DOP", check:"dop:2" }, req:["commercio_r"],      era:2, nome:"Seta e Commercio",      costo:150, desc:"Sblocca il Porto. +2 oro dalle città costiere." },
  // Era 3 — Araba
  { id:"agrumi", intuizione:{ testo:"Possiedi una città con 12 abitanti", check:"pop:12" }, req:["qanat"],    era:3, nome:"Agrumi e Giardini",     costo:170, desc:"Attiva la risorsa Agrumi. Sblocca il Frutteto." },
  { id:"qanat", intuizione:{ testo:"Costruisci un frutteto", check:"mig:frutteto:1" }, req:["latifondo"],     era:3, nome:"Qanat e Irrigazione",   costo:180, desc:"+1 cibo da ogni Fattoria e Frutteto." },
  { id:"cavleggera", intuizione:{ testo:"Addestra due unità di cavalleria", check:"unitaTipo:cav:2" }, req:["catafratti"],era:3, nome:"Cavalleria Leggera",    costo:190, desc:"Sblocca la Cavalleria leggera araba e i Fanti saraceni." },
  { id:"scienzearabe", intuizione:{ testo:"Costruisci un'accademia", check:"edificio:accademia" }, req:["filosofia"], era:3, nome:"Casa della Scienza", costo:200, desc:"Sblocca la Casa della Scienza (+4 scienza)." },
  { id:"algebra", intuizione:{ testo:"Costruisci un mercato", check:"edificio:mercato" }, req:["scienzearabe"],   era:3, nome:"Numeri e Algebra",      costo:210, desc:"+20% scienza.", bonus:{ sciPct:0.20 } },
  { id:"arcieria", intuizione:{ testo:"Addestra tre unità da tiro", check:"unitaTipo:ranged:3" }, req:["cavleggera"],  era:3, nome:"Arcieria Saracena",     costo:210, desc:"Sblocca gli Arcieri saraceni e il Mangano." },
  // Era 4 — Normanno-Sveva
  { id:"cavnormanna", intuizione:{ testo:"Vinci cinque battaglie", check:"vinte:5" }, req:["cavleggera"], era:4, nome:"Cavalleria Normanna", costo:240, desc:"Sblocca i Cavalieri normanni." },
  { id:"castelli", intuizione:{ testo:"Costruisci un castello", check:"edificio:castello" }, req:["fortificazioni"],  era:4, nome:"Castelli Normanni",     costo:260, desc:"Sblocca il Castello e le Mura merlate (liv.3)." },
  { id:"scuola", intuizione:{ testo:"Costruisci un teatro", check:"edificio:teatro" }, req:["poesia_greca","algebra"],    era:4, nome:"Scuola Siciliana",      costo:260, desc:"+3 cultura per città. «Amor che lungiamente m'hai menato...»" },
  { id:"balestre", intuizione:{ testo:"Costruisci una caserma", check:"edificio:caserma" }, req:["arcieria"],  era:4, nome:"Balestre",              costo:280, desc:"Sblocca i Balestrieri e il Trabucco." },
  { id:"duana", intuizione:{ testo:"Controlla quattro prodotti DOP", check:"dop:4" }, req:["mercanti_a"],     era:4, nome:"Duana de Secretis",     costo:300, desc:"+20% oro (la dogana normanna)." },
  { id:"cattedrali", intuizione:{ testo:"Costruisci una cattedrale", check:"edificio:cattedrale" }, req:["castelli","monasteri"],era:4, nome:"Cattedrali Arabo-Normanne", costo:320, desc:"Sblocca la Cattedrale e le meraviglie normanne." },
  // Era 5 — Aragonese
  { id:"polvere", intuizione:{ testo:"Costruisci una fonderia", check:"edificio:fonderia" }, req:["algebra","castelli"],   era:5, nome:"Polvere da Sparo",      costo:360, desc:"Sblocca la Bombarda e i Picchieri." },
  { id:"archibugi", intuizione:{ testo:"Conquista tre città", check:"conquiste:3" }, req:["polvere","balestre"], era:5, nome:"Archibugi",             costo:400, desc:"Sblocca gli Archibugieri." },
  { id:"banchi", intuizione:{ testo:"Accumula 2000 monete d'oro", check:"oro:2000" }, req:["fiere_n"],    era:5, nome:"Banchi e Fiere",        costo:400, desc:"Sblocca il Banco (+5 oro)." },
  { id:"barocco", intuizione:{ testo:"Costruisci due cattedrali", check:"edificioN:cattedrale:2" }, req:["cattedrali","stampa"],   era:5, nome:"Barocco Siciliano",     costo:440, desc:"+4 cultura per città. Sblocca la ricostruzione barocca." },
  { id:"cavpesante", intuizione:{ testo:"Costruisci due scuderie", check:"edificioN:scuderia:2" }, req:["araldica"],era:5, nome:"Cavalleria Aragonese",  costo:440, desc:"Sblocca la Cavalleria aragonese." },
  { id:"stato", intuizione:{ testo:"Possiedi dodici città", check:"citta:12" }, req:["universita","duana"],     era:5, nome:"Stato Moderno",         costo:500, desc:"-25% mantenimento unità, -2 malcontento ovunque." },
  // --- Rami tematici (bonus passivi) ---
  // Era 0
  { id:"olivicoltura", intuizione:{ testo:"Possiedi due città", check:"citta:2" }, req:["grano_t"], era:0, ramo:"economia", nome:"Olivicoltura", costo:28, bonus:{ciboPct:0.08}, desc:"+8% cibo: l'olio d'oliva nutre l'isola." },
  { id:"ceramica_t", intuizione:{ testo:"Arriva a 5 abitanti in una città", check:"pop:5" }, req:["grano_t"],   era:0, ramo:"economia", nome:"Ceramica e Vasellame", costo:34, bonus:{oroPct:0.08}, desc:"+8% oro: le anfore siciliane viaggiano." },
  { id:"poesia_greca", intuizione:{ testo:"Costruisci un tempio", check:"edificio:tempio" }, req:["templi_t"], era:0, ramo:"cultura",  nome:"Poesia e Teatro", costo:34, bonus:{culturaPct:0.12}, desc:"+12% cultura: da Stesicoro a Teocrito." },
  // Era 1
  { id:"commercio_r", intuizione:{ testo:"Stringi un accordo commerciale", check:"commercio:1" }, req:["strade"],  era:1, ramo:"economia", nome:"Vie Commerciali", costo:64, bonus:{oroPct:0.10}, desc:"+10% oro: le strade portano ricchezza." },
  { id:"ingegneria_r", intuizione:{ testo:"Conquista una città", check:"conquiste:1" }, req:["baliste"], era:1, ramo:"militare", nome:"Ingegneria Militare", costo:70, bonus:{combatPct:0.08}, desc:"+8% forza in battaglia." },
  { id:"terme", intuizione:{ testo:"Costruisci due mercati", check:"edificioN:mercato:2" }, req:["acquedotti"],        era:1, ramo:"cultura",  nome:"Terme e Ozio", costo:72, bonus:{malcontento:1, culturaPct:0.06}, desc:"-1 malcontento, +6% cultura." },
  // Era 2
  { id:"filosofia", intuizione:{ testo:"Scopri dodici tecnologie", check:"tech:12" }, req:["monasteri"],    era:2, ramo:"civile",   nome:"Filosofia e Scienza", costo:120, bonus:{sciPct:0.15}, desc:"+15% scienza." },
  { id:"diplomazia_b", intuizione:{ testo:"Stringi un patto di non aggressione", check:"patti:1" }, req:["thema"], era:2, ramo:"economia", nome:"Diplomazia Bizantina", costo:120, bonus:{oroPct:0.10}, desc:"+10% oro dai commerci." },
  { id:"tattica_b", intuizione:{ testo:"Vinci tre battaglie", check:"vinte:3" }, req:["thema"],    era:2, ramo:"militare", nome:"Tattica dei Themi", costo:125, bonus:{combatPct:0.10}, desc:"+10% forza in battaglia." },
  // Era 3
  { id:"medicina_a", intuizione:{ testo:"Costruisci una Casa della Scienza", check:"edificio:casascienza" }, req:["scienzearabe"],   era:3, ramo:"civile",   nome:"Medicina Araba", costo:180, bonus:{growthPct:0.20}, desc:"+20% crescita: gli ospedali di Palermo." },
  { id:"astronomia", intuizione:{ testo:"Metti piede su un'isola", check:"isola:1" }, req:["algebra"],   era:3, ramo:"civile",   nome:"Astronomia", costo:190, bonus:{sciPct:0.15, vista:1}, desc:"+15% scienza." },
  { id:"mercanti_a", intuizione:{ testo:"Accumula 800 monete d'oro", check:"oro:800" }, req:["seta"],   era:3, ramo:"economia", nome:"Mercanti d'Oriente", costo:185, bonus:{oroPct:0.12}, desc:"+12% oro." },
  // Era 4
  { id:"universita", intuizione:{ testo:"Scopri trenta tecnologie", check:"tech:30" }, req:["scuola"],   era:4, ramo:"civile",   nome:"Studium di Federico II", costo:250, bonus:{sciPct:0.20, vista:1}, desc:"+20% scienza: la prima università laica." },
  { id:"araldica", intuizione:{ testo:"Recluta un eroe", check:"eroe:1" }, req:["cavnormanna"],     era:4, ramo:"militare", nome:"Araldica e Cavalleria", costo:260, bonus:{combatPct:0.12}, desc:"+12% forza in battaglia." },
  { id:"fiere_n", intuizione:{ testo:"Possiedi nove città", check:"citta:9" }, req:["duana"],      era:4, ramo:"economia", nome:"Fiere e Gabelle", costo:280, bonus:{oroPct:0.12}, desc:"+12% oro." },
  // Era 5
  { id:"stampa", intuizione:{ testo:"Costruisci una meraviglia", check:"meraviglie:1" }, req:["universita"],       era:5, ramo:"cultura",  nome:"La Stampa", costo:380, bonus:{culturaPct:0.20, sciPct:0.10, vista:1}, desc:"+20% cultura, +10% scienza." },
  { id:"artiglieria", intuizione:{ testo:"Addestra due macchine d'assedio", check:"unitaTipo:siege:2" }, req:["archibugi"],  era:5, ramo:"militare", nome:"Artiglieria Moderna", costo:420, bonus:{combatPct:0.15}, desc:"+15% forza in battaglia." },
  { id:"mercantilismo", intuizione:{ testo:"Controlla sei prodotti DOP", check:"dop:6" }, req:["banchi"],era:5, ramo:"economia", nome:"Mercantilismo", costo:440, bonus:{oroPct:0.15}, desc:"+15% oro." }
];

// ---- UNITÀ ----
// tipo: inf, ranged, cav, siege, militia, hero — uu: id fazione con unità unica
const UNITA = {
  // Guarnigione cittadina: non si recluta e non si muove, esiste solo quando qualcuno assale
  // una citta' sguarnita. Serve perche' una citta' non sia terra gratis: difesa alta, attacco
  // scarso. Un singolo assalitore non passa, un esercito si'.
  guarnigione: { nome:"Guarnigione cittadina", era:0, tech:null, tipo:"inf", atk:3, def:15, mov:0, costo:0, mant:0 },
  // ---- NAVI ----
  // Le isole minori non sono piu' collegate da lingue di terra: si raggiungono per mare.
  // dominio:"mare" = si muove solo sull'acqua; capacita = quante unita' di terra imbarca.
  // Le navi si reclutano solo nelle citta' costiere (vedi unitaDisponibili) e non possono
  // conquistare da sole: devono sbarcare le truppe.
  nave_onerar: { nome:"Nave onerarìa",      era:0, tech:"navigazione",       tipo:"naval", dominio:"mare", capacita:2,
                 atk:2,  def:5,  mov:5, costo:45,  mant:1, desc:"Trasporto da carico: imbarca due reparti e li sbarca dove vuoi." },
  nave_birem:  { nome:"Bireme",             era:0, tech:"navigazione",       tipo:"naval", dominio:"mare",
                 atk:7,  def:6,  mov:5, costo:55,  mant:1, desc:"Nave da guerra a due ordini di remi, con rostro." },
  nave_trirem: { nome:"Trireme",            era:1, tech:"navigazione",       tipo:"naval", dominio:"mare",
                 atk:10, def:8,  mov:6, costo:75,  mant:2, desc:"La spina dorsale delle flotte antiche." },
  nave_dromon: { nome:"Dromone",            era:2, tech:"navigazione",       tipo:"naval", dominio:"mare",
                 atk:13, def:11, mov:6, costo:95,  mant:2, muraDanno:18, desc:"Dromone bizantino col fuoco greco: puo' bombardare le citta' costiere." },
  nave_sciab:  { nome:"Sciabecco",          era:3, tech:"navigazione",       tipo:"naval", dominio:"mare",
                 atk:16, def:12, mov:8, costo:110, mant:2, desc:"Veloce e maneggevole, il corsaro del Mediterraneo." },
  nave_galea:  { nome:"Galea",              era:4, tech:"navigazione",       tipo:"naval", dominio:"mare",
                 atk:20, def:16, mov:7, costo:140, mant:3, muraDanno:24, desc:"Galea da battaglia con castello di prua." },
  nave_galeaz: { nome:"Galeazza",           era:5, tech:"navigazione",       tipo:"naval", dominio:"mare",
                 atk:26, def:22, mov:7, costo:180, mant:3, muraDanno:34, desc:"Fortezza galleggiante irta di artiglierie." },
  nave_trasp2: { nome:"Galeone da carico",  era:3, tech:"navigazione",       tipo:"naval", dominio:"mare", capacita:3,
                 atk:4,  def:12, mov:7, costo:100, mant:2, desc:"Trasporto d'alto bordo: tre reparti al sicuro." },
  // Era 0
  oplita:      { nome:"Opliti",              era:0, tech:"falange", tipo:"inf",   atk:6,  def:8,  mov:2, costo:40,  mant:1 },
  fromboliere: { nome:"Frombolieri",         era:0, tech:null,      tipo:"ranged",atk:5,  def:3,  mov:2, costo:30,  mant:1 },
  cav_greca:   { nome:"Cavalleria greca",    era:0, tech:"cavalli", tipo:"cav",   atk:8,  def:4,  mov:4, costo:55,  mant:1 },
  ariete:      { nome:"Ariete",              era:0, tech:"poliorcetica", tipo:"siege", atk:3, def:3, mov:1, costo:50, mant:1, muraDanno:25 },
  oplita_sir:  { nome:"Opliti Siracusani",   era:0, tech:"falange", tipo:"inf",   atk:7,  def:11, mov:2, costo:45,  mant:1, uu:3 },
  cav_akragas: { nome:"Cavalieri di Akragas",era:0, tech:"cavalli", tipo:"cav",   atk:11, def:5,  mov:4, costo:60,  mant:1, uu:4 },
  fromb_elimi: { nome:"Frombolieri Elimi",   era:0, tech:null,      tipo:"ranged",atk:6,  def:4,  mov:2, costo:25,  mant:1, uu:5 },
  // Era 1
  legionario:  { nome:"Legionari",           era:1, tech:"legioni", tipo:"inf",   atk:10, def:10, mov:2, costo:65,  mant:1 },
  sagittario:  { nome:"Sagittari",           era:1, tech:"legioni", tipo:"ranged",atk:8,  def:5,  mov:2, costo:50,  mant:1 },
  equites:     { nome:"Equites",             era:1, tech:"baliste", tipo:"cav",   atk:11, def:6,  mov:4, costo:75,  mant:1 },
  balista:     { nome:"Balista",             era:1, tech:"baliste", tipo:"siege", atk:5,  def:4,  mov:1, costo:70,  mant:1, muraDanno:35 },
  mamertini:   { nome:"Mamertini",           era:1, tech:"legioni", tipo:"inf",   atk:12, def:9,  mov:2, costo:65,  mant:1, uu:2 },
  macchina_arch:{ nome:"Macchine di Archimede", era:1, tech:"baliste", tipo:"siege", atk:6, def:5, mov:1, costo:75, mant:1, muraDanno:55, uu:3 },
  falangi_akr: { nome:"Falangi di Akragas",  era:1, tech:"legioni", tipo:"inf",   atk:10, def:13, mov:2, costo:70,  mant:1, uu:4 },
  // Era 2
  skutato:     { nome:"Skutatoi",            era:2, tech:"fortificazioni", tipo:"inf", atk:13, def:14, mov:2, costo:90, mant:2 },
  arc_comp:    { nome:"Arcieri compositi",   era:2, tech:"fortificazioni", tipo:"ranged", atk:11, def:7, mov:2, costo:75, mant:1 },
  catafratto:  { nome:"Catafratti",          era:2, tech:"catafratti", tipo:"cav", atk:16, def:9,  mov:3, costo:110, mant:2 },
  onagro:      { nome:"Onagro",              era:2, tech:"fuocogreco", tipo:"siege", atk:7, def:5, mov:1, costo:95, mant:2, muraDanno:50 },
  guardia_rocca:{ nome:"Guardia della Rocca",era:2, tech:"fortificazioni", tipo:"inf", atk:12, def:18, mov:2, costo:85, mant:1, uu:6 },
  guardia_agata:{ nome:"Guardia di Sant'Agata", era:2, tech:"fortificazioni", tipo:"inf", atk:12, def:17, mov:2, costo:90, mant:2, uu:0 },
  // Era 3
  fante_sar:   { nome:"Fanti saraceni",      era:3, tech:"cavleggera", tipo:"inf", atk:17, def:16, mov:2, costo:120, mant:2 },
  arc_sar:     { nome:"Arcieri saraceni",    era:3, tech:"arcieria", tipo:"ranged",atk:15, def:9,  mov:2, costo:100, mant:2 },
  arc_sar_pa:  { nome:"Arcieri Saraceni di Palermo", era:3, tech:"arcieria", tipo:"ranged", atk:18, def:11, mov:3, costo:105, mant:2, uu:1 },
  corsari_sale:{ nome:"Corsari del Sale",    era:3, tech:"arcieria", tipo:"ranged", atk:17, def:8, mov:3, costo:100, mant:2, uu:5 },
  cav_araba:   { nome:"Cavalleria leggera",  era:3, tech:"cavleggera", tipo:"cav", atk:20, def:11, mov:5, costo:145, mant:2 },
  mangano:     { nome:"Mangano",             era:3, tech:"arcieria", tipo:"siege", atk:9,  def:7,  mov:1, costo:130, mant:2, muraDanno:70 },
  // Era 4
  fante_giur:  { nome:"Fanti giurati",       era:4, tech:null,       tipo:"inf",  atk:22, def:21, mov:2, costo:160, mant:2 },
  balestriere: { nome:"Balestrieri",         era:4, tech:"balestre", tipo:"ranged",atk:19, def:12, mov:2, costo:140, mant:2 },
  balest_me:   { nome:"Balestrieri dello Stretto", era:4, tech:"balestre", tipo:"ranged", atk:23, def:14, mov:2, costo:145, mant:2, uu:2 },
  cav_norm:    { nome:"Cavalieri normanni",  era:4, tech:"cavnormanna", tipo:"cav", atk:28, def:15, mov:4, costo:200, mant:3 },
  trabucco:    { nome:"Trabucco",            era:4, tech:"balestre", tipo:"siege", atk:12, def:9,  mov:1, costo:180, mant:2, muraDanno:100 },
  // Era 5
  picchiere:   { nome:"Picchieri",           era:5, tech:"polvere",  tipo:"inf",  atk:27, def:27, mov:2, costo:210, mant:3 },
  archibugiere:{ nome:"Archibugieri",        era:5, tech:"archibugi",tipo:"ranged",atk:30, def:16, mov:2, costo:230, mant:3 },
  cav_arag:    { nome:"Cavalleria aragonese",era:5, tech:"cavpesante", tipo:"cav", atk:33, def:19, mov:4, costo:260, mant:3 },
  bombarda:    { nome:"Bombarda",            era:5, tech:"polvere",  tipo:"siege",atk:16, def:11, mov:1, costo:240, mant:3, muraDanno:150 },
  picciotti:   { nome:"Picciotti dell'Etna", era:5, tech:"polvere",  tipo:"inf",  atk:30, def:24, mov:3, costo:190, mant:2, uu:0, collina:true },
  // ---- Unità comiche siciliane (buffe ma vere: si costruiscono e combattono) ----
  carretto_arancini:{ nome:"Catapulta di Arancini", era:1, tech:null, tipo:"siege", atk:7, def:6, mov:1, costo:80, mant:1,
                      muraDanno:60, buffa:"arancini", reqEdificio:"arsenale", splash:true,
                      desc:"Lancia arancini roventi che esplodono in pastella: danneggia più nemici insieme e sbriciola le mura." },
  bomba_granita:    { nome:"Bomba Granita", era:2, tech:null, tipo:"ranged", atk:13, def:8, mov:2, costo:110, mant:2,
                      buffa:"granita", reqEdificio:"arsenale", congela:true,
                      desc:"Palle di granita ghiacciata: i nemici colpiti si congelano e il turno dopo si muovono e combattono peggio." },
  brioche_tuppo:    { nome:"Brioche col Tuppo Esplosiva", era:3, tech:null, tipo:"inf", atk:34, def:10, mov:2, costo:120, mant:1,
                      buffa:"brioche", reqEdificio:"caserma", esplode:true,
                      desc:"Un dolce fatale: esplode al primo assalto con un boato di briciole. Colpo devastante, ma si consuma nell'impresa." },
  carretto_sic:     { nome:"Carretto Siciliano", era:0, tech:null, tipo:"cav", atk:9, def:7, mov:6, costo:70, mant:1,
                      buffa:"carretto", reqEdificio:"scuderia",
                      desc:"Dipinto a mano e tirato a tutta forza: velocissimo per fiancheggiare e razziare." },
  // Unità di supporto (poca forza, grande utilità) — non contano nei ruoli tattici
  esploratore: { nome:"Esploratori",        era:0, tech:null, tipo:"inf", atk:3, def:4, mov:5, costo:35, mant:1, supporto:true },
  tamburino:   { nome:"Tamburini",          era:1, tech:null, tipo:"inf", atk:2, def:5, mov:3, costo:50, mant:1, supporto:true, aura:"morale", reqEdificio:"caserma" },
  geniere:     { nome:"Genieri",            era:1, tech:"poliorcetica", tipo:"inf", atk:4, def:6, mov:2, costo:70, mant:1, supporto:true, aura:"assedio", muraDanno:45, reqEdificio:"arsenale" },
  medico:      { nome:"Medici da campo",    era:2, tech:"monasteri", tipo:"inf", atk:1, def:6, mov:3, costo:65, mant:1, supporto:true, aura:"cura", reqEdificio:"caserma" },
  colono:      { nome:"Coloni",             era:0, tech:null, tipo:"coloni", atk:0, def:2, mov:2, costo:60, mant:1, supporto:true,
                 desc:"Fonda una colonia pacifica in una città indipendente indifesa: si annette senza combattere, ma il colono si consuma nell'impresa." },
  lavoratore:  { nome:"Lavoratori",         era:0, tech:null, tipo:"lavoratori", atk:0, def:1, mov:2, costo:35, mant:0, supporto:true,
                 desc:"Costruisce migliorie nelle campagne vicine (fattorie, vigneti, miniere...): economico e facile da reclutare, ma si esaurisce dopo 3 lavori." },
  // Milizie (indipendenti/ribelli) — stat base moltiplicate per era
  milizia:     { nome:"Milizia",             era:0, tech:null, tipo:"militia", atk:4, def:5, mov:2, costo:0, mant:0 },
  eroe:        { nome:"Condottiero",         era:0, tech:null, tipo:"hero",   atk:8, def:8, mov:3, costo:0, mant:2 }
};

// linea "standard" per era usata da IA e milizie
// per ogni era: [trasporto, nave da guerra] — usata da IA e reclutamento automatico
const LINEA_NAVALE = [
  ["nave_onerar","nave_birem"],
  ["nave_onerar","nave_trirem"],
  ["nave_onerar","nave_dromon"],
  ["nave_trasp2","nave_sciab"],
  ["nave_trasp2","nave_galea"],
  ["nave_trasp2","nave_galeaz"]
];
const LINEA_ERA = [
  ["oplita","fromboliere","cav_greca","ariete"],
  ["legionario","sagittario","equites","balista"],
  ["skutato","arc_comp","catafratto","onagro"],
  ["fante_sar","arc_sar","cav_araba","mangano"],
  ["fante_giur","balestriere","cav_norm","trabucco"],
  ["picchiere","archibugiere","cav_arag","bombarda"]
];

// ---- EDIFICI (nelle città) ----
const EDIFICI = {
  granaio:    { nome:"Granaio",       costo:60,  tech:"latifondo", eff:"+30% crescita", icona:"🏺" },
  mercato:    { nome:"Mercato",       costo:70,  tech:"moneta",    eff:"+3 oro",        icona:"⚖️" },
  porto:      { nome:"Porto",         costo:90,  tech:"seta",      eff:"+3 oro +2 cibo (costiera)", icona:"⚓", costiero:true },
  tempio:     { nome:"Tempio",        costo:70,  tech:"templi_t",  eff:"+2 cultura, -2 malcontento", icona:"🏛️" },
  accademia:  { nome:"Accademia",     costo:110, tech:"thema",     eff:"+3 scienza",    icona:"📚" },
  casascienza:{ nome:"Casa della Scienza", costo:150, tech:"scienzearabe", eff:"+4 scienza", icona:"🔭" },
  teatro:     { nome:"Teatro",        costo:100, tech:"templi_t",  eff:"+3 cultura",    icona:"🎭" },
  mura1:      { nome:"Mura di pietra",costo:80,  tech:"poliorcetica", eff:"Mura liv.1 (100 PV)", icona:"🧱" },
  mura2:      { nome:"Mura teodosiane", costo:160, tech:"fortificazioni", eff:"Mura liv.2 (200 PV)", icona:"🏰", req:"mura1" },
  mura3:      { nome:"Mura merlate",  costo:260, tech:"castelli",  eff:"Mura liv.3 (300 PV)", icona:"🏯", req:"mura2" },
  castello:   { nome:"Castello",      costo:220, tech:"castelli",  eff:"+40% difesa città, +1 prod", icona:"🏰" },
  cattedrale: { nome:"Cattedrale",    costo:240, tech:"cattedrali",eff:"+4 cultura, -3 malcontento", icona:"⛪" },
  banco:      { nome:"Banco",         costo:200, tech:"banchi",    eff:"+5 oro",        icona:"💱" },
  // edifici militari: sbloccano tipi di truppe
  caserma:    { nome:"Caserma",       costo:100, tech:null,        eff:"Sblocca unità uniche, tamburini e medici", icona:"⚔️" },
  scuderia:   { nome:"Scuderia",      costo:110, tech:"cavalli",   eff:"Sblocca la cavalleria", icona:"🐎" },
  arsenale:   { nome:"Arsenale",      costo:130, tech:"poliorcetica", eff:"Sblocca le macchine d'assedio e i genieri", icona:"🛠️" },
  // edifici legati al territorio del comune (terreno dominante): differenziano le città tra loro
  cava_marmo: { nome:"Cava di Marmo", costo:90,  tech:null, eff:"+3 produzione, +2 oro", icona:"⛏️", terrenoDom:["hill","mountain"] },
  silos_grano:{ nome:"Silos del Grano", costo:70, tech:"latifondo", eff:"+3 cibo", icona:"🌾", terrenoDom:["plain"] },
  cantiere:   { nome:"Cantiere Navale", costo:120, tech:"seta", eff:"+3 oro, +2 produzione (costiera)", icona:"⛵", costiero:true },
  fonderia:   { nome:"Fonderia",      costo:150, tech:"poliorcetica", eff:"+4 produzione", icona:"🔥", terrenoDom:["hill","mountain","volcano"] }
};
// edifici caratteristici legati a un comune reale specifico (monumenti/fortificazioni storiche minori,
// distinti dalle Meraviglie: più economici, senza vincoli di era/tech — rappresentano ciò che la città
// possiede già e che il tuo governo restaura/fortifica)
const EDIFICI_LOCALI = [
  // --- Monumenti storici reali (tutti verificati contro i nomi in data_comuni.js) ---
  { id:"templi_agrig",   nome:"Valle dei Templi",         comune:"Agrigento",     costo:200, eff:"+6 cultura, +2 oro", icona:"🏛️", cultura:6, oro:2 },
  { id:"selinunte",      nome:"Acropoli di Selinunte",    comune:"Castelvetrano", costo:170, eff:"+5 cultura", icona:"🏛️", cultura:5 },
  { id:"teatro_taor",    nome:"Teatro Antico",            comune:"Taormina",      costo:170, eff:"+5 cultura, +2 oro", icona:"🎭", cultura:5, oro:2 },
  { id:"villa_casale",   nome:"Villa Romana del Casale",  comune:"Piazza Armerina", costo:180, eff:"+5 cultura, +1 oro", icona:"🖼️", cultura:5, oro:1 },
  { id:"pantalica",      nome:"Necropoli di Pantalica",   comune:"Sortino",       costo:140, eff:"+4 cultura", icona:"⚱️", cultura:4 },
  { id:"mozia",          nome:"Mozia e lo Stagnone",      comune:"Marsala",       costo:150, eff:"+3 cultura, +3 oro", icona:"🏺", cultura:3, oro:3 },
  { id:"palatina",       nome:"Cappella Palatina",        comune:"Palermo",       costo:190, eff:"+6 cultura, -1 malcontento", icona:"✨", cultura:6, malcontento:1 },
  { id:"duomo_monreale", nome:"Duomo di Monreale",        comune:"Monreale",      costo:190, eff:"+6 cultura, -1 malcontento", icona:"⛪", cultura:6, malcontento:1 },
  { id:"barocco_noto",   nome:"Barocco di Noto",          comune:"Noto",          costo:170, eff:"+5 cultura, +1 oro", icona:"⛪", cultura:5, oro:1 },
  { id:"ibla",           nome:"Ragusa Ibla",              comune:"Ragusa",        costo:160, eff:"+4 cultura, +2 oro", icona:"🏘️", cultura:4, oro:2 },
  { id:"cava_ispica",    nome:"Cava d'Ispica",            comune:"Ispica",        costo:130, eff:"+3 cultura, +1 cibo", icona:"🕳️", cultura:3, cibo:1 },
  { id:"orecchio",       nome:"Orecchio di Dionisio",     comune:"Siracusa",      costo:150, eff:"+4 cultura", icona:"👂", cultura:4 },

  // --- Riserve naturali e paesaggi protetti ---
  { id:"zingaro",        nome:"Riserva dello Zingaro",    comune:"San Vito Lo Capo", costo:120, eff:"+3 cultura, +2 cibo", icona:"🌿", cultura:3, cibo:2 },
  { id:"vendicari",      nome:"Oasi di Vendicari",        comune:"Noto",          costo:120, eff:"+2 cultura, +3 cibo", icona:"🦩", cultura:2, cibo:3 },
  { id:"alcantara",      nome:"Gole dell'Alcantara",      comune:"Castiglione di Sicilia", costo:120, eff:"+3 cultura, +1 cibo", icona:"🏞️", cultura:3, cibo:1 },
  { id:"saline_tp",      nome:"Saline di Trapani",        comune:"Trapani",       costo:130, eff:"+4 oro, +1 cibo", icona:"🧂", oro:4, cibo:1 },
  { id:"vulcano_lip",    nome:"Crateri delle Eolie",      comune:"Lipari",        costo:110, eff:"+3 cultura, +2 oro", icona:"🌋", cultura:3, oro:2 },
  { id:"bosco_bronte",   nome:"Pistacchieti di Bronte",   comune:"Bronte",        costo:120, eff:"+4 oro, +1 cibo", icona:"🌰", oro:4, cibo:1 },
  { id:"castello_erice",    nome:"Castello di Venere",       comune:"Erice",         costo:140, eff:"+3 cultura, +20% difesa città", icona:"🏰", cultura:3, difesa:0.20 },
  { id:"rocca_enna",        nome:"Castello di Lombardia",    comune:"Enna",          costo:150, eff:"+30% difesa città", icona:"🏔️", difesa:0.30 },
  { id:"castello_milazzo",  nome:"Castello di Milazzo",      comune:"Milazzo",       costo:140, eff:"+20% difesa città, +2 oro", icona:"🏰", difesa:0.20, oro:2 },
  { id:"duomo_messina",     nome:"Duomo di Messina",         comune:"Messina",       costo:160, eff:"+3 cultura, -1 malcontento", icona:"⛪", cultura:3, malcontento:1 },
  { id:"castello_caccamo",  nome:"Castello di Caccamo",      comune:"Caccamo",       costo:130, eff:"+20% difesa città", icona:"🏰", difesa:0.20 },
  { id:"chiesa_madre_scicli",nome:"Chiesa Madre di Scicli",  comune:"Scicli",        costo:110, eff:"+2 cultura", icona:"⛪", cultura:2 },
  { id:"san_giorgio_modica",nome:"Duomo di San Giorgio",     comune:"Modica",        costo:130, eff:"+3 cultura", icona:"⛪", cultura:3 },
  { id:"basilica_trapani",  nome:"Basilica dell'Annunziata", comune:"Trapani",       costo:130, eff:"+2 cultura, +2 oro", icona:"⛪", cultura:2, oro:2 },
  { id:"castello_paterno",  nome:"Castello Normanno",        comune:"Paternò",       costo:120, eff:"+20% difesa città", icona:"🏰", difesa:0.20 },
  { id:"torre_sciacca",     nome:"Castello Incantato",       comune:"Sciacca",       costo:110, eff:"+2 cultura, +2 oro", icona:"🗼", cultura:2, oro:2 },
  { id:"villa_palagonia",    nome:"Villa Palagonia",              comune:"Bagheria",         costo:140, eff:"+3 cultura, +2 oro", icona:"🏛️", cultura:3, oro:2 },
  { id:"duomo_termini",      nome:"Duomo di Termini Imerese",     comune:"Termini Imerese",  costo:130, eff:"+2 cultura, -1 malcontento", icona:"⛪", cultura:2, malcontento:1 },
  { id:"castello_corleone",  nome:"Castello Soprano",             comune:"Corleone",         costo:120, eff:"+20% difesa città", icona:"🏰", difesa:0.20 },
  { id:"chiesa_petralia",    nome:"Chiesa Madre di Petralia",     comune:"Petralia Sottana", costo:110, eff:"+2 cultura", icona:"⛪", cultura:2 },
  { id:"torre_gangi",        nome:"Torre dei Ventimiglia",        comune:"Gangi",            costo:120, eff:"+20% difesa città", icona:"🗼", difesa:0.20 },
  { id:"castello_castelbuono",nome:"Castello dei Ventimiglia",    comune:"Castelbuono",      costo:140, eff:"+3 cultura, +20% difesa città", icona:"🏰", cultura:3, difesa:0.20 },
  { id:"castello_salemi",    nome:"Castello Normanno-Svevo",      comune:"Salemi",           costo:130, eff:"+20% difesa città", icona:"🏰", difesa:0.20 },
  { id:"castello_alcamo",    nome:"Castello dei Conti di Modica", comune:"Alcamo",           costo:130, eff:"+20% difesa città, +2 oro", icona:"🏰", difesa:0.20, oro:2 },
  { id:"cattedrale_nicosia", nome:"Cattedrale di San Nicola",     comune:"Nicosia",          costo:140, eff:"+3 cultura", icona:"⛪", cultura:3 },
  { id:"castello_randazzo",  nome:"Castello Svevo di Randazzo",   comune:"Randazzo",         costo:130, eff:"+20% difesa città", icona:"🏰", difesa:0.20 },
  { id:"rocca_aci_castello", nome:"Castello Normanno di Aci Castello", comune:"Aci Castello", costo:120, eff:"+2 cultura, +20% difesa città", icona:"🏔️", cultura:2, difesa:0.20 },
  { id:"scalinata_caltagirone",nome:"Scalinata di Santa Maria del Monte", comune:"Caltagirone", costo:140, eff:"+4 cultura, +2 oro", icona:"🏛️", cultura:4, oro:2 }
];

// ---- MIGLIORIE (sugli esagoni, costano oro) ----
// tante e diffuse apposta: ogni terreno ha sempre almeno 2-3 opzioni senza requisiti di tech,
// così i lavoratori trovano sempre qualcosa da fare fin dall'inizio, qualunque sia il territorio
// alcune migliorie fanno parte di una "linea" che si ammoderna con l'era (vedi MIGLIORIE_LINEA
// sotto): linea+tier identificano dove si trova un edificio nella sua catena di successori.
const MIGLIORIE = {
  // pianura
  campo:    { nome:"Campo coltivato", costo:25, tech:null,      terreni:["plain"], cibo:1, eff:"+1 cibo", icona:"🌱", linea:"grano", tier:0 },
  orto:     { nome:"Orto",    costo:35, tech:null,      terreni:["plain"], cibo:1, oro:1, eff:"+1 cibo +1 oro", icona:"🥬", linea:"orto", tier:0 },
  fattoria: { nome:"Fattoria", costo:40, tech:"grano_t", terreni:["plain"], cibo:2, eff:"+2 cibo", icona:"🌾", linea:"grano", tier:1 },
  frutteto: { nome:"Frutteto", costo:50, tech:"agrumi",  terreni:["plain","hill"], cibo:2, oro:1, eff:"+2 cibo +1 oro", icona:"🍊", linea:"orto", tier:1 },
  manifattura_molini: { nome:"Manifattura dei Mulini", costo:80, tech:null, eraMin:4, terreni:["plain"], cibo:3, prod:1, eff:"+3 cibo +1 prod", icona:"🏭", linea:"grano", tier:2 },
  mulino:   { nome:"Mulino",   costo:45, tech:null,      terreni:["plain","hill"], fiume:true, cibo:1, prod:1, eff:"+1 cibo +1 prod", icona:"🌀", linea:"fiume", tier:0 },
  mulino_idraulico: { nome:"Mulino idraulico", costo:80, tech:null, eraMin:3, terreni:["plain","hill"], fiume:true, cibo:1, prod:2, oro:1, eff:"+1 cibo +2 prod +1 oro", icona:"⚙️", linea:"fiume", tier:1 },
  // collina
  vigneto:  { nome:"Vigneto",  costo:50, tech:null,      terreni:["hill"],  cibo:1, oro:2, eff:"+1 cibo +2 oro", icona:"🍇", linea:"vigna", tier:0 },
  cantina:  { nome:"Cantina",  costo:70, tech:null, eraMin:2, terreni:["hill"], cibo:1, oro:3, eff:"+1 cibo +3 oro", icona:"🛢️", linea:"vigna", tier:1 },
  bottaia_export: { nome:"Bottaia da esportazione", costo:100, tech:null, eraMin:4, terreni:["hill"], cibo:1, oro:4, prod:1, eff:"+1 cibo +4 oro +1 prod", icona:"🚢", linea:"vigna", tier:2 },
  miniera:  { nome:"Miniera",  costo:60, tech:null,      terreni:["hill","mountain"], prod:2, eff:"+2 produzione", icona:"⛏️", linea:"miniera", tier:0 },
  miniera_profonda: { nome:"Miniera profonda", costo:85, tech:null, eraMin:2, terreni:["hill","mountain"], prod:3, eff:"+3 produzione", icona:"⛰️", linea:"miniera", tier:1 },
  fonderia_mineraria: { nome:"Fonderia mineraria", costo:120, tech:null, eraMin:4, terreni:["hill","mountain"], prod:4, oro:1, eff:"+4 produzione +1 oro", icona:"🏭", linea:"miniera", tier:2 },
  pascolo:  { nome:"Pascolo", costo:40, tech:null,      terreni:["hill"], cibo:1, oro:1, eff:"+1 cibo +1 oro", icona:"🐑" },
  terrazzamento: { nome:"Terrazzamento", costo:45, tech:null, terreni:["hill"], cibo:2, eff:"+2 cibo", icona:"🏞️" },
  mulino_vento:  { nome:"Mulino a vento", costo:40, tech:null, terreni:["hill"], prod:1, eff:"+1 produzione", icona:"🎐" },
  // montagna
  cava_pietra:   { nome:"Cava di pietra", costo:55, tech:null, terreni:["mountain"], prod:2, eff:"+2 produzione", icona:"🪨" },
  rifugio_pastori:{ nome:"Rifugio dei pastori", costo:50, tech:null, terreni:["mountain"], cibo:1, oro:1, eff:"+1 cibo +1 oro", icona:"🐐" },
  // foresta (prima non aveva NESSUNA miglioria disponibile)
  bosco:    { nome:"Taglio boschivo", costo:45, tech:null, terreni:["forest"], prod:2, eff:"+2 produzione", icona:"🪵", linea:"foresta", tier:0 },
  segheria: { nome:"Segheria idraulica", costo:65, tech:null, eraMin:2, terreni:["forest"], prod:3, eff:"+3 produzione", icona:"🪚", linea:"foresta", tier:1 },
  manifattura_legno: { nome:"Manifattura del legno", costo:95, tech:null, eraMin:4, terreni:["forest"], prod:4, oro:1, eff:"+4 produzione +1 oro", icona:"🏭", linea:"foresta", tier:2 },
  carbonaia:{ nome:"Carbonaia", costo:50, tech:null, terreni:["forest"], prod:1, oro:1, eff:"+1 produzione +1 oro", icona:"🔥" },
  // vulcano (prima non aveva NESSUNA miglioria disponibile)
  solfatara:{ nome:"Solfatara", costo:65, tech:null, terreni:["volcano"], oro:3, eff:"+3 oro", icona:"🌋", linea:"vulcano", tier:0 },
  raffineria_zolfo: { nome:"Raffineria di zolfo", costo:100, tech:null, eraMin:3, terreni:["volcano"], oro:5, eff:"+5 oro", icona:"🧪", linea:"vulcano", tier:1 },
  vigna_vulcanica:{ nome:"Vigna vulcanica", costo:60, tech:null, terreni:["volcano"], cibo:1, oro:2, eff:"+1 cibo +2 oro", icona:"🍷" },
  // costiere
  tonnara:  { nome:"Tonnara",  costo:55, tech:null,      terreni:["plain","hill"], costiero:true, cibo:2, oro:2, eff:"+2 cibo +2 oro", icona:"🐟", linea:"tonnara", tier:0 },
  stabilimento_conserve: { nome:"Stabilimento di conserve", costo:90, tech:null, eraMin:3, terreni:["plain","hill"], costiero:true, cibo:2, oro:4, eff:"+2 cibo +4 oro", icona:"🥫", linea:"tonnara", tier:1 },
  saline:   { nome:"Saline",   costo:55, tech:null,      terreni:["plain","hill"], costiero:true, cibo:1, oro:2, eff:"+1 cibo +2 oro", icona:"🧂" }
};
// catene di ammodernamento per era: chi ha in mano un tier N può, quando l'era lo consente
// (eraMin del tier N+1), passare al tier successivo pagando la differenza (vedi upgradaMiglioria)
const MIGLIORIE_LINEA = { grano:["campo","fattoria","manifattura_molini"], orto:["orto","frutteto"],
  fiume:["mulino","mulino_idraulico"], vigna:["vigneto","cantina","bottaia_export"],
  miniera:["miniera","miniera_profonda","fonderia_mineraria"], foresta:["bosco","segheria","manifattura_legno"],
  vulcano:["solfatara","raffineria_zolfo"], tonnara:["tonnara","stabilimento_conserve"] };

// ---- MERAVIGLIE (legate ai comuni reali) ----
const MERAVIGLIE = [
  { id:"concordia", nome:"Tempio della Concordia", comune:"Agrigento", era:0, tech:"templi_t", costo:220,
    eff:"+5 cultura, -2 malcontento in tutta la provincia", desc:"Il tempio dorico meglio conservato del mondo greco." },
  { id:"teatro_sir", nome:"Teatro Greco di Siracusa", comune:"Siracusa", era:0, tech:"templi_t", costo:200,
    eff:"+4 cultura, +2 scienza", desc:"Scavato nella roccia dell'Epipoli, dove recitò Eschilo." },
  { id:"teatro_tao", nome:"Teatro Antico di Taormina", comune:"Taormina", era:1, tech:"strade", costo:240,
    eff:"+4 cultura, +3 oro", desc:"Il teatro con la vista più bella del Mediterraneo." },
  { id:"villa_casale", nome:"Villa Romana del Casale", comune:"Piazza Armerina", era:1, tech:"latifondo", costo:260,
    eff:"+5 oro, +2 cultura", desc:"I mosaici più straordinari dell'Impero." },
  { id:"cuba", nome:"La Zisa", comune:"Palermo", era:3, tech:"scienzearabe", costo:300,
    eff:"+4 oro, +3 cultura", desc:"Il palazzo del sollazzo, gioiello dell'arte fatimita." },
  { id:"monreale", nome:"Duomo di Monreale", comune:"Monreale", era:4, tech:"cattedrali", costo:380,
    eff:"+6 cultura, -2 malcontento ovunque", desc:"Seimila metri quadri di mosaici d'oro." },
  { id:"palatina", nome:"Cappella Palatina", comune:"Palermo", era:4, tech:"cattedrali", costo:340,
    eff:"+5 cultura, +3 oro", desc:"Dove arabi, bizantini e normanni costruirono insieme." },
  { id:"cefalu", nome:"Duomo di Cefalù", comune:"Cefalù", era:4, tech:"cattedrali", costo:300,
    eff:"+4 cultura, -2 malcontento ovunque", desc:"Il Cristo Pantocratore che guarda il mare." },
  { id:"ursino", nome:"Castello Ursino", comune:"Catania", era:4, tech:"castelli", costo:320,
    eff:"+40% difesa in tutte le tue città, +2 produzione", desc:"La fortezza di Federico II sulla lava." },
  { id:"noto_duomo", nome:"Cattedrale di Noto", comune:"Noto", era:5, tech:"barocco", costo:400,
    eff:"+7 cultura", desc:"Il capolavoro della ricostruzione barocca dopo il 1693." },
  // --- Meraviglie del gusto ---
  { id:"saline_tp", nome:"Saline di Trapani", comune:"Trapani", era:2, tech:"seta", costo:240, gusto:true,
    eff:"+6 oro, +2 cibo", desc:"Mulini a vento e vasche di sale rosa contro il tramonto." },
  { id:"tonnara", nome:"Tonnara di Scopello", comune:"Castellammare del Golfo", era:3, tech:"seta", costo:260, gusto:true,
    eff:"+4 oro, +3 cibo", desc:"La mattanza del tonno, rito antico del mare siciliano." },
  { id:"ballaro", nome:"Mercato di Ballarò", comune:"Palermo", era:4, tech:"duana", costo:300, gusto:true,
    eff:"+7 oro, -1 malcontento ovunque", desc:"«Abbanniate» e colori: il ventre di Palermo." },
  { id:"kolymbethra", nome:"Giardino della Kolymbethra", comune:"Agrigento", era:2, tech:"qanat", costo:250, gusto:true,
    eff:"+3 cibo, +3 cultura", desc:"L'agrumeto segreto nella Valle dei Templi." }
];

// icona disegnata ad hoc per l'arancino siciliano (a punta, dorato e impanato: NON l'onigiri
// giapponese 🍙 — niente alga nori, forma conica/a goccia come l'arancino catanese)
const ICONA_ARANCINO =
  `<svg viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-0.15em"><defs>
   <radialGradient id="ag" cx="35%" cy="28%" r="80%">
     <stop offset="0%" stop-color="#f4bd63"/><stop offset="55%" stop-color="#d68a2e"/><stop offset="100%" stop-color="#a8621c"/>
   </radialGradient></defs>
   <path d="M12 1.3 C9.2 5.8 5.2 9.8 4.6 14.8 C4.2 18.6 7.6 21.6 12 22.6 C16.4 21.6 19.8 18.6 19.4 14.8 C18.8 9.8 14.8 5.8 12 1.3 Z"
     fill="url(#ag)" stroke="#7a4614" stroke-width="0.6"/>
   <circle cx="8.6" cy="12.6" r="0.55" fill="#7a4614" opacity=".5"/><circle cx="14.9" cy="11.7" r="0.5" fill="#7a4614" opacity=".5"/>
   <circle cx="11.6" cy="15.8" r="0.55" fill="#7a4614" opacity=".5"/><circle cx="9.2" cy="18.3" r="0.5" fill="#7a4614" opacity=".45"/>
   <circle cx="14.3" cy="17.6" r="0.5" fill="#7a4614" opacity=".45"/><circle cx="12" cy="9.4" r="0.45" fill="#7a4614" opacity=".4"/></svg>`;

// ---- PRODOTTI DOP/IGP (legati ai comuni reali) ----
// controllare il comune → bonus permanente + entra nella tua collezione
const DOP = [
  { id:"pistacchio_bronte", nome:"Pistacchio di Bronte DOP", comune:"Bronte", icona:"🥜", cat:"frutta", oro:3, desc:"L'oro verde dell'Etna." },
  { id:"cioccolato_modica", nome:"Cioccolato di Modica IGP", comune:"Modica", icona:"🍫", cat:"dolce", oro:2, cultura:1, desc:"Lavorato a freddo, ricetta azteca via Spagna." },
  { id:"arancia_rossa",     nome:"Arancia Rossa di Sicilia IGP", comune:"Lentini", icona:"🍊", cat:"agrumi", cibo:2, oro:1, tech:"agrumi", desc:"Tarocco, Moro e Sanguinello della piana." },
  { id:"sale_trapani",      nome:"Sale Marino di Trapani IGP", comune:"Trapani", icona:"🧂", cat:"mare", oro:3, desc:"Raccolto a mano nelle saline." },
  { id:"vino_etna",         nome:"Etna DOC", comune:"Linguaglossa", icona:"🍷", cat:"vino", oro:2, desc:"Nerello Mascalese sulle sciare laviche." },
  { id:"cannolo",           nome:"Cannolo di Piana", comune:"Piana degli Albanesi", icona:"🍥", cat:"dolce", cultura:2, desc:"Ricotta di pecora e scorza d'arancia." },
  { id:"nero_avola",        nome:"Nero d'Avola", comune:"Avola", icona:"🍇", cat:"vino", oro:3, desc:"Il rosso più siciliano che ci sia." },
  { id:"mandorla_noto",     nome:"Mandorla di Noto", comune:"Noto", icona:"🌰", cat:"frutta", oro:2, cibo:1, desc:"La Pizzuta d'Avola, dolce e pregiata." },
  { id:"caciocavallo",      nome:"Caciocavallo Ibleo", comune:"Ragusa", icona:"🧀", cat:"formaggio", cibo:2, desc:"Stagionato nelle grotte degli Iblei." },
  { id:"grano_enna",        nome:"Grano Duro di Enna", comune:"Enna", icona:"🌾", cat:"grano", cibo:3, desc:"Il granaio d'Italia fin dai Romani." },
  { id:"cassata",           nome:"Cassata Siciliana", comune:"Palermo", icona:"🍰", cat:"dolce", cultura:2, desc:"Pan di Spagna, ricotta e frutta candita." },
  { id:"pomodoro_pachino",  nome:"Pomodoro di Pachino IGP", comune:"Pachino", icona:"🍅", cat:"orto", cibo:2, oro:1, desc:"Ciliegino baciato dal sole del Sud." },
  { id:"marsala",           nome:"Marsala DOC", comune:"Marsala", icona:"🍷", cat:"vino", oro:2, cultura:1, desc:"Il vino liquoroso amato dagli inglesi." }
];

// ---- PIATTI TIPICI (si sbloccano collezionando categorie di prodotti) ----
// reqCat: categorie di DOP che devi controllare. Bonus permanente alla fazione finché li possiedi.
const PIATTI = [
  { id:"arancino", nome:"Arancino", icona:ICONA_ARANCINO, reqCat:{grano:1,formaggio:1}, eff:{ciboPct:0.10}, testo:"+10% cibo in tutte le città" },
  { id:"norma",    nome:"Pasta alla Norma", icona:"🍝", reqCat:{orto:1,formaggio:1}, eff:{malcontento:2}, testo:"-2 malcontento ovunque" },
  { id:"dolci",    nome:"Cannoli e Cassata", icona:"🧁", reqCat:{dolce:2}, eff:{culturaPct:0.15}, testo:"+15% cultura" },
  { id:"cuscus",   nome:"Cùscusu di Pesce", icona:"🥘", reqCat:{mare:1,grano:1}, eff:{oroPct:0.10}, testo:"+10% oro" },
  { id:"brindisi", nome:"Vini di Sicilia", icona:"🍷", reqCat:{vino:2}, eff:{oroPct:0.08,malcontento:1}, testo:"+8% oro, -1 malcontento" },
  { id:"martorana",nome:"Frutta Martorana", icona:"🍬", reqCat:{frutta:1,dolce:1}, eff:{culturaPct:0.10}, testo:"+10% cultura" }
];

// ---- SAGRE (feste patronali): spendi oro → bonus temporaneo alla fazione ----
const SAGRE = [
  { id:"sagra_pistacchio", nome:"Sagra del Pistacchio", icona:"🥜", costo:80, turni:8, eff:{oroPct:0.2}, testo:"+20% oro per 8 turni" },
  { id:"sagra_vino",       nome:"Festa del Vino", icona:"🍷", costo:70, turni:8, eff:{malcontento:3}, testo:"-3 malcontento per 8 turni" },
  { id:"sagra_pesce",      nome:"Sagra del Pesce", icona:"🐟", costo:70, turni:8, eff:{ciboPct:0.2}, testo:"+20% cibo per 8 turni" },
  { id:"festa_patrono",    nome:"Festa del Santo Patrono", icona:"⛪", costo:120, turni:10, eff:{culturaPct:0.25,malcontento:2}, testo:"+25% cultura, -2 malcontento per 10 turni" }
];

// ---- QUARTIERI (i distretti sul territorio) ----
// Un quartiere si costruisce dalla citta' ma occupa una CASELLA del suo territorio, e quanto
// rende dipende da cosa ha intorno: una Fucina fra i monti vale il doppio della stessa Fucina
// in mezzo alla pianura. E' il motivo per cui conviene guardare la mappa prima di costruire,
// invece di premere sempre lo stesso bottone. Le regole sono dichiarative: `base` e' la resa
// fissa, ogni regola conta le caselle adiacenti che la soddisfano e moltiplica per `da`.
const QUARTIERI = [
  { id:"fucina", nome:"Fucina", icona:"\u{1F528}", ico:"fonderia", costo:70, tech:"ceramica_t",
    base:{ prod:2 },
    regole:[ { tipo:"terra", val:["hill","mountain","volcano"], da:{prod:1},   testo:"collina, monte o vulcano" },
             { tipo:"impProd",                                  da:{prod:1},   testo:"miniera, cava o carbonaia" } ],
    desc:"Magli e fornaci alle pendici: piu' pietra e ferro ha intorno, piu' batte." },
  { id:"agora", nome:"Agora", icona:"\u{1F3DB}\uFE0F", ico:"teatro", costo:80, tech:"poesia_greca",
    base:{ cultura:2 },
    regole:[ { tipo:"quartiere", da:{cultura:1}, testo:"altro quartiere" },
             { tipo:"centro",    da:{cultura:2}, testo:"centro della citta'" } ],
    desc:"La piazza dove si parla e si recita: vive di cio' che le sta accanto." },
  { id:"marina", nome:"Marina", icona:"\u2693", ico:"porto", costo:90, tech:"navigazione", costiero:true,
    base:{ oro:2, cibo:1 },
    regole:[ { tipo:"mare",              da:{oro:0.5},  testo:"mare aperto" },
             { tipo:"terra", val:["lago"], da:{cibo:1}, testo:"lago" } ],
    desc:"Banchine e magazzini: si costruisce solo sulla costa, e piu' mare vede piu' incassa." },
  { id:"fondaco", nome:"Fondaco", icona:"\u2696\uFE0F", ico:"mercato", costo:90, tech:"commercio_r",
    base:{ oro:2 },
    regole:[ { tipo:"fiume",     da:{oro:1}, testo:"fiume" },
             { tipo:"quartiere", da:{oro:1}, testo:"altro quartiere" },
             { tipo:"res",       da:{oro:1}, testo:"risorsa pregiata" } ],
    desc:"Il quartiere dei mercanti: prospera sulle vie d'acqua e accanto alle merci." },
  { id:"sagrato", nome:"Sagrato", icona:"\u26EA", ico:"tempio", costo:100, tech:"monasteri",
    base:{ cultura:2, calma:1 },
    regole:[ { tipo:"terra", val:["mountain"], da:{cultura:1},   testo:"montagna" },
             { tipo:"terra", val:["forest"],   da:{cultura:0.5}, testo:"bosco" } ],
    desc:"Chiese e chiostri dove la roccia si fa alta: calma il popolo di una tacca." },
  { id:"studium", nome:"Studium", icona:"\u{1F4DA}", ico:"accademia", costo:110, tech:"filosofia",
    base:{ scienza:2 },
    regole:[ { tipo:"terra", val:["mountain"], da:{scienza:1}, testo:"montagna" },
             { tipo:"terra", val:["lago"],     da:{scienza:1}, testo:"lago" },
             { tipo:"fiume",                   da:{scienza:1}, testo:"fiume" } ],
    desc:"Aule e biblioteche: si studia meglio dove l'acqua scorre e la montagna isola." }
];

// ---- GRANDI SICILIANI ----
// Quattro categorie, sei figure ciascuna, in ordine storico. I punti li fanno i quartieri
// (lo Studium gli scienziati, il Fondaco i mercanti...) e chi arriva primo se li prende:
// gli altri restano a mani vuote davanti al successivo. La competizione per i nomi e' gia'
// una storia — ed e' storia vera, tutta siciliana.
const CAT_GRANDI = [
  { id:"scienziato", nome:"Scienziati",  icona:"\u{1F52D}", da:{ studium:3, accademia:1, casascienza:2 } },
  { id:"condottiero", nome:"Condottieri", icona:"\u2694\uFE0F", da:{ fucina:1, caserma:2, arsenale:1 } },
  { id:"artista",    nome:"Artisti",     icona:"\u{1F3AD}", da:{ agora:3, sagrato:1, teatro:2, cattedrale:1 } },
  { id:"mercante",   nome:"Mercanti",    icona:"\u2696\uFE0F", da:{ fondaco:3, marina:2, mercato:1, banco:2, porto:1 } }
];
const GRANDI = {
  scienziato: [
    { nome:"Empedocle",           luogo:"Agrigento", anno:-450, ritr:"empedocle",  testo:"Quattro elementi, e l'Etna che se lo prese.", eff:{ scienza:60 } },
    { nome:"Archimede",           luogo:"Siracusa",  anno:-250, ritr:"archimede",  testo:"Datemi un punto d'appoggio e solleverò il mondo.", eff:{ scienza:120, unita:"macchina_arch" } },
    { nome:"Diodoro Siculo",      luogo:"Agira",     anno:-40,  ritr:"diodoro",  testo:"Quaranta libri per raccontare tutto il mondo conosciuto.", eff:{ scienza:100, cultura:60 } },
    { nome:"Al-Idrisi",           luogo:"Palermo",   anno:1154, ritr:"idrisi", testo:"Il planisfero d'argento per re Ruggero.", eff:{ scienza:180, vista:1 } },
    { nome:"Federico II",         luogo:"Palermo",   anno:1230, ritr:"federico", testo:"Stupor mundi: falchi, algebra e una corte di sapienti.", eff:{ scienza:220, tech:1 } },
    { nome:"Francesco Maurolico", luogo:"Messina",   anno:1550, ritr:"maurolico", testo:"Misurò la luce e la montagna che fuma.", eff:{ scienza:300, tech:1 } }
  ],
  condottiero: [
    { nome:"Ducezio",             luogo:"Noto",      anno:-450, ritr:"ducezio",  testo:"Il re dei Siculi che tenne testa alle poleis greche.", eff:{ unitaLinea:2 } },
    { nome:"Gelone",              luogo:"Siracusa",  anno:-480, ritr:"gelone",  testo:"A Himera fermò Cartagine con la cavalleria.", eff:{ unitaLinea:2, oro:120 } },
    { nome:"Timoleonte",          luogo:"Siracusa",  anno:-340, ritr:"timoleonte",  testo:"Liberò le città dai tiranni e le ripopolò.", eff:{ fedelta:25 } },
    { nome:"Ruggero I d'Altavilla", luogo:"Mileto",  anno:1091, ritr:"ruggero1", testo:"Trent'anni per prendere l'isola, castello dopo castello.", eff:{ unitaLinea:3, difesaCitta:true } },
    { nome:"Giovanni da Procida", luogo:"Salerno",   anno:1282, ritr:"procida", testo:"Tessé la tela dei Vespri da una corte all'altra.", eff:{ oro:250, fedelta:20 } },
    { nome:"Ruggero di Lauria",   luogo:"Lauria",    anno:1284, ritr:"lauria", testo:"Non perse mai una battaglia navale.", eff:{ unitaNave:2 } }
  ],
  artista: [
    { nome:"Stesicoro",           luogo:"Himera",    anno:-560, ritr:"stesicoro",  testo:"Cantò e ritrattò la sua palinodia, e riebbe la vista.", eff:{ cultura:60 } },
    { nome:"Eschilo",             luogo:"Gela",      anno:-456, ritr:"eschilo",  testo:"Morì a Gela, dicono per una tartaruga caduta dal cielo.", eff:{ cultura:120 } },
    { nome:"Teocrito",            luogo:"Siracusa",  anno:-270, ritr:"teocrito",  testo:"Inventò la poesia bucolica guardando i pastori dell'isola.", eff:{ cultura:150, calma:2 } },
    { nome:"Ciullo d'Alcamo",     luogo:"Alcamo",    anno:1235, ritr:"ciullo", testo:"Rosa fresca aulentissima: il volgare siciliano diventa poesia.", eff:{ cultura:200 } },
    { nome:"Antonello da Messina", luogo:"Messina",  anno:1470, ritr:"antonello", testo:"Portò in Italia la luce dei fiamminghi.", eff:{ cultura:280, oro:150 } },
    { nome:"Giacomo Serpotta",    luogo:"Palermo",   anno:1700, ritr:"serpotta", testo:"Stucchi bianchi come merletti negli oratori di Palermo.", eff:{ cultura:350, calma:3 } }
  ],
  mercante: [
    { nome:"Ierone II",           luogo:"Siracusa",  anno:-260, ritr:"ierone",  testo:"La lex Hieronica: il grano di Sicilia nutre il Mediterraneo.", eff:{ oro:150, cibo:true } },
    { nome:"Ibn Hawqal",          luogo:"Palermo",   anno:970,  ritr:"ibnhawqal", testo:"Contò trecento moschee e i banchi di Ballarò.", eff:{ oro:220 } },
    { nome:"Giorgio di Antiochia", luogo:"Palermo",  anno:1140, ritr:"giorgio", testo:"Ammiraglio e amministratore: sua la Duana dei conti.", eff:{ oro:300, commercio:true } },
    { nome:"Manfredi Chiaramonte", luogo:"Palermo",  anno:1380, ritr:"chiaramonte", testo:"Signore del sale, dei porti e di mezza isola.", eff:{ oro:380 } },
    { nome:"Pietro Speciale",     luogo:"Palermo",   anno:1450, ritr:"speciale", testo:"Pretore di Palermo, il grano che parte dai caricatori.", eff:{ oro:450 } },
    { nome:"Giovanni Ventimiglia", luogo:"Geraci",   anno:1480, ritr:"ventimiglia", testo:"Conte di Geraci: feudi, greggi e nave propria.", eff:{ oro:520, cibo:true } }
  ]
};

// ---- EDITTI (le carte politiche) ----
// Ogni venti turni il gioco chiede al giocatore che cosa sia adesso: un regno di grano o di
// mercanti, di baroni o di monaci. Nessun secondo albero da studiare: gli editti si sbloccano
// dalle tecnologie che gia' esistono, e ogni era apre uno slot in piu'. Hanno tutti un
// prezzo — un editto che dia solo vantaggi non e' una scelta, e' un regalo.
const EDITTI = [
  { id:"latifondo_e", nome:"Il Latifondo",        icona:"\u{1F33E}", tech:"latifondo",     eff:{ ciboPct:0.20, malcontento:1 },
    testo:"Il grano riempie i granai, non i cuori: +20% cibo, +1 malcontento." },
  { id:"corvee",      nome:"Corvée",              icona:"\u26CF\uFE0F", tech:"ingegneria_r", eff:{ prodPct:0.20, oroPct:-0.10 },
    testo:"Braccia requisite per le opere: +20% produzione, −10% oro." },
  { id:"duana",       nome:"Duana de Secretis",   icona:"\u{1F4DC}", tech:"duana",        eff:{ oroPct:0.20, fedelta:-1 },
    testo:"Il fisco normanno non perdona nessuno: +20% oro, −1 fedeltà al turno." },
  { id:"milizie",     nome:"Milizie comunali",    icona:"\u{1F6E1}\uFE0F", tech:"diritto",  eff:{ combatPct:0.15, oroPct:-0.05 },
    testo:"Ogni città arma i suoi: +15% in battaglia, −5% oro." },
  { id:"mecenatismo", nome:"Mecenatismo",         icona:"\u{1F3AD}", tech:"poesia_greca", eff:{ culturaPct:0.25, oroPct:-0.10 },
    testo:"Poeti a corte e marmo agli scultori: +25% cultura, −10% oro." },
  { id:"studia",      nome:"Studia Generalia",    icona:"\u{1F393}", tech:"universita",   eff:{ sciPct:0.25, prodPct:-0.10 },
    testo:"Chi studia non lavora la pietra: +25% scienza, −10% produzione." },
  { id:"annona",      nome:"Annona",              icona:"\u{1F35E}", tech:"moneta",       eff:{ caseExtra:2, oroPct:-0.10 },
    testo:"Pane calmierato per il popolo: +2 case in ogni città, −10% oro." },
  { id:"feste",       nome:"Pane e Feste",        icona:"\u{1F389}", tech:"terme",        eff:{ serviziExtra:1, oroPct:-0.08 },
    testo:"Giochi, terme e sagre: +1 servizio ovunque, −8% oro." },
  { id:"tolleranza",  nome:"Tolleranza",          icona:"\u262E\uFE0F", tech:"monasteri", eff:{ malcontento:-2, fedelta:1 },
    testo:"Greci, arabi e latini sotto una sola corona: −2 malcontento, +1 fedeltà." },
  { id:"cabotaggio",  nome:"Cabotaggio",          icona:"\u26F5", tech:"navigazione",     eff:{ oroPct:0.12, combatPct:-0.05 },
    testo:"Ogni scafo che tocca la costa paga dazio: +12% oro, −5% in battaglia." },
  { id:"vespro",      nome:"Vespro Armato",       icona:"\u{1F514}", tech:"araldica",     eff:{ combatPct:0.20, culturaPct:-0.10 },
    testo:"Al suono della campana, tutti alle armi: +20% in battaglia, −10% cultura." },
  { id:"servizio",    nome:"Servizio militare",   icona:"\u2694\uFE0F", tech:"legioni",  eff:{ mantPct:-0.25, ciboPct:-0.08 },
    testo:"Si serve per dovere, non per paga: −25% mantenimento, −8% cibo." },
  { id:"colonizza_e", nome:"Terre ai coloni",     icona:"\u{1F6E4}\uFE0F", tech:"strade", eff:{ growthPct:0.15, fedelta:1 },
    testo:"Chi disboda la terra la tiene: +15% crescita, +1 fedeltà." },
  { id:"baroni",      nome:"Baroni fedeli",       icona:"\u{1F3F0}", tech:"castelli",     eff:{ fedelta:2, ciboPct:-0.10 },
    testo:"Feudi in cambio di lealtà: +2 fedeltà, −10% cibo." },
  { id:"stato_e",     nome:"Stato moderno",       icona:"\u{1F3DB}\uFE0F", tech:"stato", eff:{ mantPct:-0.20, oroPct:0.10 },
    testo:"Segretari, registri, catasti: −20% mantenimento, +10% oro." },
  { id:"mercantil",   nome:"Mercantilismo",       icona:"\u2696\uFE0F", tech:"mercantilismo", eff:{ oroPct:0.25, culturaPct:-0.15 },
    testo:"Conta solo quanto entra nelle casse: +25% oro, −15% cultura." }
];

// ---- INVASIONI STORICHE ----
// sbarco: comune vicino a cui appaiono; unita: quante; anno
const INVASIONI = [
  { anno:-415, nome:"Ateniesi", colore:"#7d8ca3", sbarco:"Siracusa", n:4,
    titolo:"La Spedizione Ateniese", testo:"Atene manda la più grande flotta della sua storia contro Siracusa. Gli opliti ateniesi sbarcano e assediano la città. «Faranno la guerra più per orgoglio che per ragione» — Tucidide." },
  { anno:-264, nome:"Romani", colore:"#a33e3e", sbarco:"Messina", n:6,
    titolo:"I Romani sbarcano a Messina", testo:"I Mamertini hanno chiamato Roma in aiuto. Le legioni attraversano lo Stretto per la prima volta: inizia la Prima Guerra Punica, e la Sicilia sarà il premio." },
  { anno:440, nome:"Vandali", colore:"#5c5c66", sbarco:"Marsala", n:4,
    titolo:"Le Razzie dei Vandali", testo:"Da Cartagine, le navi di Genserico piombano sulle coste siciliane. I porti bruciano." },
  { anno:535, nome:"Bizantini", colore:"#6a5aa8", sbarco:"Catania", n:6,
    titolo:"Belisario sbarca in Sicilia", testo:"Il generale di Giustiniano riconquista l'isola per l'Impero Romano d'Oriente. La Sicilia torna greca." },
  { anno:827, nome:"Arabi", colore:"#1f7a5c", sbarco:"Mazara del Vallo", n:8,
    titolo:"Lo Sbarco di Mazara", testo:"Il giurista Asad ibn al-Furat guida diecimila uomini dalle coste d'Africa. Sbarcano a Mazara: comincia la conquista islamica della Sicilia, che porterà agrumi, algebra e giardini." },
  { anno:1061, nome:"Normanni", colore:"#b03060", sbarco:"Messina", n:8,
    titolo:"I Normanni attraversano lo Stretto", testo:"Ruggero e Roberto d'Altavilla, con poche centinaia di cavalieri, sbarcano di notte presso Messina. Trent'anni dopo, tutta la Sicilia sarà loro." },
  { anno:1266, nome:"Angioini", colore:"#31489c", sbarco:"Messina", n:7,
    titolo:"Gli Angioini prendono il Regno", testo:"Carlo d'Angiò ha sconfitto e ucciso Manfredi a Benevento. I francesi calano sull'isola con tasse pesanti e mano dura. Il malcontento cova." },
  { anno:1282, nome:"Aragonesi", colore:"#c28f2c", sbarco:"Trapani", n:6,
    titolo:"Pietro d'Aragona sbarca a Trapani", testo:"Chiamato dai siciliani in rivolta, il re d'Aragona sbarca con gli Almogaveri. La guerra del Vespro incendia il Mediterraneo." }
];

// ---- EVENTI STORICI NARRATI ----
const EVENTI_STORICI = [
  { anno:-580, id:"falaride", titolo:"Il Toro di Falaride",
    testo:"Il tiranno di Akragas ha commissionato un toro di bronzo cavo: i condannati vi vengono arsi dentro, e le loro urla escono come muggiti. Il terrore si sparge per l'isola.",
    per:"Agrigento",
    scelte:[ { label:"Usa il terrore", desc:"-4 malcontento in tutte le tue città per 20 turni, ma -3 cultura/turno", eff:"terrore" },
             { label:"Distruggi il toro", desc:"+30 cultura subito: la pietà vale più della paura", eff:"pieta" } ] },
  { anno:-212, id:"archimede", titolo:"L'Assedio di Siracusa", img:"ev_archimede",
    testo:"Le macchine di Archimede — specchi ustori, mani di ferro — tengono a bada gli assedianti. Ma un soldato entra in città e trova il vecchio chino sui suoi cerchi. «Noli turbare circulos meos.»",
    per:"Siracusa",
    scelte:[ { label:"Salva i suoi scritti", desc:"+80 scienza", eff:"scritti" },
             { label:"Onora l'eroe", desc:"Recluta gratis un Condottiero leggendario", eff:"eroe_arch" } ] },
  { anno:663, id:"costante", titolo:"Un Imperatore a Siracusa",
    testo:"L'imperatore Costante II trasferisce la corte imperiale da Costantinopoli a Siracusa. Per cinque anni, la Sicilia è il centro dell'Impero Romano.",
    per:"Siracusa",
    scelte:[ { label:"Accogli la corte", desc:"+60 oro, +30 cultura", eff:"corte" },
             { label:"Tassa i cortigiani", desc:"+100 oro, +2 malcontento a Siracusa", eff:"tassa_corte" } ] },
  { anno:1040, id:"maniace", titolo:"Giorgio Maniace",
    testo:"Il gigantesco generale bizantino riconquista la Sicilia orientale con i suoi variaghi e mercenari normanni. A Troina fonda una fortezza. Ma Costantinopoli lo richiama, geloso della sua gloria.",
    per:null,
    scelte:[ { label:"Assoldalo", desc:"Recluta il Condottiero Giorgio Maniace (100 oro)", eff:"assolda_maniace", costoOro:100 },
             { label:"Lascialo partire", desc:"+20 cultura", eff:"nulla_cult" } ] },
  { anno:1130, id:"ruggero", titolo:"La Corona di Ruggero II", img:"ev_ruggero",
    testo:"Nella Cattedrale di Palermo, la notte di Natale, Ruggero II d'Altavilla è incoronato Re di Sicilia. Il suo regno unisce latini, greci, arabi ed ebrei: la corte più splendida d'Europa.",
    per:"Palermo",
    scelte:[ { label:"Corte multiculturale", desc:"+50 cultura, +30 scienza, -2 malcontento ovunque per 15 turni", eff:"corte_ruggero" },
             { label:"Rafforza il regno", desc:"+80 oro, +1 unità Cavalieri normanni gratis nella capitale", eff:"regno_forte" } ] },
  { anno:1224, id:"federico", titolo:"Stupor Mundi", img:"ev_ruggero",
    testo:"Federico II — lo Stupor Mundi — fa della Sicilia il cuore dell'Impero. Alla sua corte nasce la Scuola Siciliana: per la prima volta si fa poesia in volgare. «E s'io moro, non moro...»",
    per:null,
    scelte:[ { label:"Proteggi i poeti", desc:"+60 cultura", eff:"poeti" },
             { label:"Finanzia i falconieri e i dotti", desc:"+40 scienza, +20 oro", eff:"dotti" } ] },
  { anno:1608, id:"caravaggio", titolo:"Un Fuggiasco Geniale",
    testo:"Un pittore in fuga da Malta sbarca a Siracusa: si fa chiamare Michelangelo Merisi, il Caravaggio. Dipinge il Seppellimento di Santa Lucia con una luce mai vista, poi fugge a Messina.",
    per:null,
    scelte:[ { label:"Commissiona un'opera", desc:"-80 oro, +70 cultura", eff:"quadro", costoOro:80 },
             { label:"Lascialo fuggire", desc:"Nessun effetto: era troppo pericoloso", eff:"nulla" } ] }
];

// Eventi casuali
const EVENTI_CASUALI = [
  { id:"buon_raccolto", p:0.03, titolo:"Annata d'oro", testo:"Piogge generose e sole giusto: i campi traboccano.", tipo:"buono" },
  { id:"fiera", p:0.025, titolo:"La Fiera", testo:"Mercanti da tutto il Mediterraneo affollano le tue piazze.", tipo:"buono" },
  { id:"siccita", p:0.025, titolo:"Siccità", testo:"U suli spacca i petri: raccolti bruciati nelle campagne.", tipo:"cattivo" },
  { id:"briganti", p:0.02, titolo:"Briganti", testo:"Bande armate infestano le trazzere dell'interno.", tipo:"cattivo" },
  { id:"eruzione_min", p:0.03, titolo:"L'Etna borbotta", testo:"'A Muntagna sputa fuoco: colate di lava scendono verso i paesi.", tipo:"etna" },
  { id:"terremoto_min", p:0.02, titolo:"Terremoto", testo:"La terra trema: crolli e paura.", tipo:"terremoto" }
];

// ---- DILEMMI (eventi con scelta: ~uno ogni 5 turni) ----
// eff con mini-linguaggio "fx:chiave:valore;..." — oro, cult, sci (scienza), cibo (tutte le città),
// unrest (tutte le città, negativo = calma), unita:<tipo> (nella capitale), popcap (+1 pop in capitale)
const DILEMMI = [
  { id:"mercanti_genovesi", titolo:"Mercanti genovesi", testo:"Una compagnia di mercanti genovesi chiede un porto franco: niente dazi per loro, oro subito per te. I bottegai locali storcono il naso.",
    scelte:[ {label:"Concedi il porto franco", desc:"+80 oro, +1 malcontento", eff:"fx:oro:80;unrest:1"},
             {label:"Proteggi i nostri mercanti", desc:"+30 cultura", eff:"fx:cult:30"} ] },
  { id:"carestia", titolo:"Carestia nell'interno", testo:"Piove poco, il grano è marcito nei silos. Le famiglie dell'interno chiedono aiuto al sovrano.",
    scelte:[ {label:"Apri i granai reali (60 oro)", desc:"+12 cibo in ogni città, −1 malcontento", eff:"fx:cibo:12;unrest:-1", costoOro:60},
             {label:"Che si arrangino", desc:"+2 malcontento", eff:"fx:unrest:2"} ] },
  { id:"pellegrini", titolo:"Pellegrini alle porte", testo:"Centinaia di pellegrini diretti a un santuario chiedono ospitalità e scorta.",
    scelte:[ {label:"Accoglili (30 oro)", desc:"+40 cultura, −1 malcontento", eff:"fx:cult:40;unrest:-1", costoOro:30},
             {label:"Falli pagare il pedaggio", desc:"+25 oro, +1 malcontento", eff:"fx:oro:25;unrest:1"} ] },
  { id:"mercenari", titolo:"Mercenari in cerca di padrone", testo:"Una compagnia di ventura si offre: «Paga bene e combatteremo sotto la tua bandiera».",
    scelte:[ {label:"Assoldali (90 oro)", desc:"Una truppa di fanteria pronta nella capitale", eff:"fx:unita:linea0", costoOro:90},
             {label:"Mandali via", desc:"Nessun effetto", eff:"nulla"} ] },
  { id:"dotto", titolo:"Un dotto straniero", testo:"Un sapiente arrivato da Alessandria offre i suoi scritti alla tua corte in cambio di una pensione.",
    scelte:[ {label:"Accoglilo a corte (50 oro)", desc:"+90 scienza", eff:"fx:sci:90", costoOro:50},
             {label:"Non abbiamo bisogno di lui", desc:"Nessun effetto", eff:"nulla"} ] },
  { id:"gabelle", titolo:"Protesta contro le gabelle", testo:"Il popolo scende in piazza contro le tasse sul sale e sul grano. Gli esattori sono stati presi a sassate.",
    scelte:[ {label:"Riduci le gabelle", desc:"−40 oro, −3 malcontento ovunque", eff:"fx:unrest:-3"},
             {label:"Manda le guardie", desc:"+40 oro, +3 malcontento ovunque", eff:"fx:oro:40;unrest:3"} ] },
  { id:"tesoro", titolo:"Il tesoro punico", testo:"Scavando le fondamenta di una torre, i muratori trovano un'anfora piena di monete cartaginesi.",
    scelte:[ {label:"Nel tesoro reale", desc:"+120 oro", eff:"fx:oro:120"},
             {label:"Esponilo nel tempio", desc:"+60 cultura", eff:"fx:cult:60"} ] },
  { id:"naufragio", titolo:"Naufragio sulla costa", testo:"Una nave mercantile si è schiantata sugli scogli: il carico è sparso sulla spiaggia, l'equipaggio chiede soccorso.",
    scelte:[ {label:"Requisisci il carico", desc:"+70 oro, +1 malcontento", eff:"fx:oro:70;unrest:1"},
             {label:"Soccorri i naufraghi", desc:"+40 cultura, −1 malcontento", eff:"fx:cult:40;unrest:-1"} ] },
  { id:"predicatore", titolo:"Il predicatore", testo:"Un frate infuocato predica nelle piazze contro i ricchi e — sottovoce — contro il sovrano.",
    scelte:[ {label:"Caccialo dal regno", desc:"−2 malcontento, −20 cultura", eff:"fx:unrest:-2;cult:-20"},
             {label:"Lascialo parlare", desc:"+40 cultura, +2 malcontento", eff:"fx:cult:40;unrest:2"} ] },
  { id:"ceramisti", titolo:"I maestri ceramisti", testo:"I ceramisti di Caltagirone chiedono una bottega reale: «Le nostre maioliche faranno invidia a Bisanzio».",
    scelte:[ {label:"Finanzia la bottega (70 oro)", desc:"+40 cultura, +40 scienza", eff:"fx:cult:40;sci:40", costoOro:70},
             {label:"Non ora", desc:"Nessun effetto", eff:"nulla"} ] },
  { id:"spia", titolo:"Una spia catturata", testo:"Le guardie hanno preso un uomo che copiava le mappe delle mura. Ha un anello di un regno vicino.",
    scelte:[ {label:"Impiccalo sulle mura", desc:"−1 malcontento (il popolo applaude)", eff:"fx:unrest:-1"},
             {label:"Chiedi un riscatto", desc:"+70 oro", eff:"fx:oro:70"} ] },
  { id:"vendemmia", titolo:"Vendemmia straordinaria", testo:"Un'annata come non se ne vedevano da decenni: le botti traboccano di mosto.",
    scelte:[ {label:"Festa in tutto il regno", desc:"−2 malcontento ovunque", eff:"fx:unrest:-2"},
             {label:"Vendi il vino ai mercanti", desc:"+70 oro", eff:"fx:oro:70"} ] },
  { id:"profughi", titolo:"Profughi di guerra", testo:"Famiglie in fuga da una città saccheggiata chiedono di stabilirsi nella tua capitale.",
    scelte:[ {label:"Accoglili", desc:"+1 popolazione nella capitale, +1 malcontento", eff:"fx:popcap:1;unrest:1"},
             {label:"Respingili", desc:"Nessun effetto", eff:"nulla"} ] }
];

// ---- OBIETTIVI D'ERA (3 per era: traguardi intermedi con premio e punteggio) ----
const OBIETTIVI = [
  { id:"e0_citta",    era:0, testo:"Possiedi 14 città",                    check:"citta:14" },
  { id:"e0_tech",     era:0, testo:"Completa 2 ricerche",                  check:"tech:2" },
  { id:"e0_migl",     era:0, testo:"Costruisci 3 migliorie del territorio", check:"migliorie:3" },
  { id:"e1_citta",    era:1, testo:"Possiedi 32 città",                    check:"citta:32" },
  { id:"e1_edif",     era:1, testo:"Costruisci un Tempio o un Mercato",     check:"edificio:tempio,mercato" },
  { id:"e1_vinte",    era:1, testo:"Vinci 3 battaglie",                    check:"vinte:3" },
  { id:"e2_citta",    era:2, testo:"Possiedi 24 città",                    check:"citta:24" },
  { id:"e2_mer",      era:2, testo:"Completa una Meraviglia",               check:"meraviglie:1" },
  { id:"e2_inv",      era:2, testo:"Strappa una città agli invasori",       check:"invasoriCitta:1" },
  { id:"e3_citta",    era:3, testo:"Possiedi 18 città",                    check:"citta:18" },
  { id:"e3_dop",      era:3, testo:"Controlla 4 prodotti DOP",             check:"dop:4" },
  { id:"e3_vinte",    era:3, testo:"Vinci 10 battaglie",                   check:"vinte:10" },
  { id:"e4_citta",    era:4, testo:"Possiedi 42 città",                    check:"citta:42" },
  { id:"e4_mer",      era:4, testo:"Completa 3 Meraviglie",                check:"meraviglie:3" },
  { id:"e4_patti",    era:4, testo:"Hai un patto con 2 regni",             check:"patti:2" },
  { id:"e5_citta",    era:5, testo:"Possiedi 55 città",                    check:"citta:55" },
  { id:"e5_mer",      era:5, testo:"Completa 5 Meraviglie",                check:"meraviglie:5" },
  { id:"e5_tech",     era:5, testo:"Conosci 40 tecnologie",                check:"tech:40" }
];

// ---- GUARDAROBA DEL SOVRANO (sblocchi cosmetici con rarità, durante la partita) ----
// cat: veste/manto/copricapo. "come" = impresa che può sbloccarlo (usato anche per l'acquisto diretto con oro).
// I copricapo sono varianti-gemma applicate sopra il tipo di copricapo già scelto (corona/turbante/diadema/elmo/cappuccio).
const GUARDAROBA_EXTRA = [
  { id:"veste_lino_naturale",    cat:"veste", nome:"Lino Naturale",         rarita:"comune",      colore:"#cfc2a0", come:"battaglia",     costoOro:60 },
  { id:"veste_zafferano",        cat:"veste", nome:"Zafferano d'Oriente",   rarita:"raro",        colore:"#d98c1a", come:"evento",        costoOro:150 },
  { id:"veste_smeraldo",         cat:"veste", nome:"Seta Smeraldo",         rarita:"epico",       colore:"#0f6b4a", come:"tech_avanzata", costoOro:250 },
  { id:"veste_porpora_imperiale",cat:"veste", nome:"Porpora Imperiale",     rarita:"leggendario", colore:"#6b0f2a", come:"meraviglia",    costoOro:400 },
  { id:"veste_bianco_sacro",     cat:"veste", nome:"Bianco Sacro",          rarita:"leggendario", colore:"#f0ead0", come:"vittoria_grande", costoOro:500 },
  { id:"manto_corallo",          cat:"manto", nome:"Corallo di Trapani",    rarita:"comune",      colore:"#c85a4a", come:"battaglia",     costoOro:60 },
  { id:"manto_lapislazzuli",     cat:"manto", nome:"Lapislazzuli",          rarita:"raro",        colore:"#1d4f91", come:"evento",        costoOro:150 },
  { id:"manto_notte_stellata",   cat:"manto", nome:"Notte Stellata",        rarita:"epico",       colore:"#1a1a3a", come:"tech_avanzata", costoOro:250 },
  { id:"manto_ermellino",        cat:"manto", nome:"Ermellino Regale",      rarita:"leggendario", colore:"#f0ead8", come:"meraviglia",    costoOro:400 },
  { id:"manto_oro_puro",         cat:"manto", nome:"Manto d'Oro Puro",      rarita:"leggendario", colore:"#d9a520", come:"vittoria_grande", costoOro:500 },
  { id:"cop_ambra",              cat:"copricapo", nome:"Gemma d'Ambra",       rarita:"comune",      colore:"#d98c1a", come:"battaglia",     costoOro:60 },
  { id:"cop_zaffiro",            cat:"copricapo", nome:"Gemma di Zaffiro",    rarita:"raro",        colore:"#1d4f91", come:"evento",        costoOro:150 },
  { id:"cop_smeraldo",           cat:"copricapo", nome:"Gemma di Smeraldo",   rarita:"epico",       colore:"#0f6b4a", come:"tech_avanzata", costoOro:250 },
  { id:"cop_rubino_imperiale",   cat:"copricapo", nome:"Rubino Imperiale",    rarita:"leggendario", colore:"#a8102a", come:"meraviglia",    costoOro:400 }
];

// ---- POTERI DEL SOVRANO (mosse speciali a ricarica) ----
// bersaglio: "nemico" = un esagono nemico; "amico" = un esagono tuo/area; "globale" = tutto il regno.
const POTERI = [
  { id:"eruzione", nome:"Ira dell'Etna", icona:"🌋", ricarica:16, bersaglio:"nemico", raggio:1,
    desc:"'A Muntagna sputa fuoco sui nemici: colata di lava che brucia le truppe nell'area bersaglio.",
    danno:55, battuta:"Trema 'a terra: l'Etna combatte con noi!" },
  { id:"arancini", nome:"Pioggia di Arancini", icona:ICONA_ARANCINO, ricarica:12, bersaglio:"nemico", raggio:1,
    desc:"Una scarica di arancini roventi dal cielo: danneggia e disorienta i nemici (li congela un turno).",
    danno:28, congela:true, battuta:"Chiovunu arancini! Scappati, forestieri!" },
  { id:"santagata", nome:"Benedizione di Sant'Agata", icona:"🕯️", ricarica:14, bersaglio:"amico", raggio:2,
    desc:"Il velo di Sant'Agata protegge i tuoi: le truppe nell'area guariscono e la città vicina si calma.",
    cura:60, malcontento:3, battuta:"Santuzza, aiutaci tu! U populu si conforta." },
  { id:"scirocco", nome:"U Scirocco", icona:"🌬️", ricarica:18, bersaglio:"globale",
    desc:"Un vento caldo d'Africa acceca i nemici in tutta l'isola: le loro truppe rallentano (−1 movimento) e la nebbia si dirada per te.",
    battuta:"Arriva u scirocco: u celu si fa giallu e i nemici s'appànnanu." },
  { id:"festa", nome:"Grande Sagra", icona:"🎉", ricarica:10, bersaglio:"globale",
    desc:"Indici una sagra improvvisa in tutto il regno: oro subito e popolo felice ovunque.",
    oro:120, malcontento:4, battuta:"Tavulate p'a strata! Viva u Re, viva a Sicilia!" }
];

return { ERE, VELOCITA, CULTURE, FAZIONI, LEADER_STORICI, NOMI_EREDI, TRATTI, EROI,
         TECH, UNITA, LINEA_ERA, LINEA_NAVALE, EDIFICI, EDIFICI_LOCALI, QUARTIERI, CAT_GRANDI, GRANDI, EDITTI, MIGLIORIE, MIGLIORIE_LINEA, MERAVIGLIE, INVASIONI,
         EVENTI_STORICI, EVENTI_CASUALI, DILEMMI, OBIETTIVI, DOP, PIATTI, SAGRE, POTERI, GUARDAROBA_EXTRA };
})();
