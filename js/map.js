// TRINACRIA — mappa esagonale dalla geografia reale + rendering stile Maps/mosaico
window.MAP = (function(){

// ---- Conversione geografica (gradi -> km di mondo) ----
const LON0 = 12.30, LAT0 = 38.40;
const KX = 287, KY = 360;   // scala geografia->mondo alzata ancora (+45% su v37, +~230% sull'originale): mappa molto più grande
function toXY(lat, lon){ return { x:(lon-LON0)*KX, y:(LAT0-lat)*KY }; }

// ---- Costa della Sicilia (lon,lat) ----
const COSTA = [
  [15.65,38.27],[15.56,38.18],[15.49,38.03],[15.38,37.92],[15.30,37.82],[15.23,37.71],
  [15.17,37.59],[15.10,37.50],[15.08,37.41],[15.17,37.33],[15.23,37.24],[15.30,37.12],
  [15.31,37.05],[15.22,36.95],[15.16,36.87],[15.15,36.78],[15.13,36.68],[15.00,36.65],
  [14.89,36.71],[14.77,36.71],[14.62,36.76],[14.48,36.83],[14.40,36.90],[14.32,36.98],
  [14.25,37.05],[14.10,37.10],[13.95,37.09],[13.80,37.13],[13.65,37.19],[13.52,37.28],
  [13.35,37.34],[13.18,37.44],[13.05,37.49],[12.90,37.56],[12.78,37.57],[12.66,37.62],
  [12.59,37.65],[12.47,37.73],[12.43,37.80],[12.42,37.90],[12.46,38.00],[12.50,38.06],
  [12.55,38.10],[12.63,38.10],[12.70,38.13],[12.73,38.18],[12.80,38.09],[12.88,38.03],
  [12.97,38.04],[13.05,38.10],[13.06,38.16],[13.11,38.19],[13.22,38.19],[13.31,38.21],
  [13.36,38.14],[13.45,38.10],[13.54,38.11],[13.63,38.03],[13.72,37.98],[13.82,38.00],
  [13.92,38.03],[14.02,38.04],[14.14,38.02],[14.27,38.01],[14.40,38.00],[14.54,38.04],
  [14.66,38.09],[14.75,38.16],[14.88,38.12],[14.98,38.14],[15.06,38.12],[15.13,38.15],
  [15.20,38.21],[15.24,38.27],[15.28,38.21],[15.34,38.22],[15.42,38.24],[15.51,38.26]
].map(p => toXY(p[1], p[0]));

function dentroCosta(x, y){
  let inside = false;
  for (let i=0, j=COSTA.length-1; i<COSTA.length; j=i++){
    const xi=COSTA[i].x, yi=COSTA[i].y, xj=COSTA[j].x, yj=COSTA[j].y;
    if (((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside = !inside;
  }
  return inside;
}

// ---- Zone montuose (lat, lon, raggio km, tipo, altezza) ----
// Orografia reale della Sicilia. I raggi sono in CHILOMETRI VERI e vengono convertiti in
// unità-mondo con KMU: la tabella precedente aveva i raggi già in unità-mondo, tarati quando
// KX valeva ~88 (1 unità ≈ 1 km). Dopo gli ingrandimenti della mappa (KX 287) quei raggi
// valevano 4-7 km reali: le catene montuose si erano ridotte a puntini e il 96% dell'isola
// risultava pianura. Con i km espliciti la mappa torna alle proporzioni vere della Sicilia
// (misurato: 22,5% montagna · 62,3% collina · 13,8% pianura, contro 24,5 · 61,4 · 14,1 reali).
const KMU = KX/88.3;            // unità-mondo per chilometro (88,3 km per grado di longitudine a 37,5°N)
const ZONE = [
  // catene montuose
  [38.10,15.42,26,"mountain",0.85],[38.00,15.22,22,"mountain",0.80],   // Peloritani
  [37.95,14.88,29,"mountain",0.90],[37.92,14.62,29,"mountain",1.00],
  [37.90,14.38,25,"mountain",0.85],                                    // Nebrodi
  [37.88,14.02,27,"mountain",0.95],                                    // Madonie
  [38.05,13.30,21,"mountain",0.70],                                    // Monti di Palermo
  [37.66,13.42,23,"mountain",0.80],                                    // Monti Sicani
  [37.13,14.86,18,"mountain",0.65],                                    // Iblei, parte alta
  [38.03,12.59,11,"mountain",0.60],                                    // Erice
  // colline: l'ossatura dell'interno siciliano
  [37.55,14.30,42,"hill",0.50],                                        // Monti Erei
  [37.05,14.85,40,"hill",0.45],                                        // altopiano Ibleo
  [37.65,13.40,40,"hill",0.50],                                        // entroterra sicano
  [37.85,12.85,30,"hill",0.40],                                        // colline del Trapanese
  [37.40,13.60,38,"hill",0.45],                                        // Agrigentino
  [37.45,14.05,32,"hill",0.50],                                        // Nisseno
  [37.90,13.32,28,"hill",0.45],                                        // entroterra palermitano
  [37.95,15.05,20,"hill",0.50],                                        // colline messinesi
  [38.00,14.50,15,"hill",0.50],[37.75,14.95,18,"hill",0.50],
  // pianure vere: riconquistano il terreno sulle colline dove l'isola è davvero piatta
  [37.40,14.92,26,"plain",0.10],                                       // Piana di Catania
  [38.13,13.36,12,"plain",0.10],                                       // Conca d'Oro
  [37.08,14.30,24,"plain",0.10],                                       // Piana di Gela
  [37.72,12.55,29,"plain",0.10],                                       // Marsala-Mazara
  [38.13,15.15,11,"plain",0.10]                                        // Piana di Milazzo
].map(z => { const p=toXY(z[0],z[1]); return {x:p.x,y:p.y,r:z[2]*KMU,tipo:z[3],alt:z[4]}; });

const ETNA = toXY(37.755, 14.995);

// ---- Fiumi (polilinee lat/lon) ----
const FIUMI = [
  [[37.90,14.85],[37.75,14.78],[37.60,14.80],[37.50,14.87],[37.42,14.97],[37.40,15.06]],
  [[37.80,14.20],[37.60,14.10],[37.40,14.05],[37.25,13.98],[37.11,13.94]],
  [[37.90,13.20],[37.80,13.05],[37.70,12.95],[37.60,12.88]],
  [[37.65,13.55],[37.55,13.45],[37.45,13.35],[37.39,13.28]],
  [[37.88,15.00],[37.86,15.10],[37.82,15.19]],
  [[37.10,14.95],[37.06,15.10],[37.05,15.24]]
].map(f => f.map(p => toXY(p[0], p[1])));

function distSeg(px,py, ax,ay, bx,by){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t = l2 ? ((px-ax)*dx+(py-ay)*dy)/l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx=ax+t*dx, qy=ay+t*dy;
  return Math.hypot(px-qx, py-qy);
}
function vicinoFiume(x,y){
  for (const f of FIUMI)
    for (let i=0;i<f.length-1;i++)
      if (distSeg(x,y,f[i].x,f[i].y,f[i+1].x,f[i+1].y) < 3.0) return true;
  return false;
}

// ---- Griglia esagonale (pointy-top, odd-r) ----
const R = 3.2; // più caselle per città (più spazio da sviluppare) — era 4.4
const HEXW = Math.sqrt(3)*R;
const ROWH = 1.5*R;
const COLS = 228, ROWS = 177;   // cresciuti in proporzione a KX/KY per non tagliare la costa

// ---- Isole minori (lat, lon, raggioKm, nome-ancora sulla costa per il ponte di "secche") ----
// Il gap di mare è leggermente compresso per un ponte breve e credibile (mappa stilizzata).
const ISOLE = [
  { lat:38.36, lon:15.02, r:7,  vLat:38.24, vLon:15.22 }, // Eolie (Lipari) ← Milazzo
  { lat:37.95, lon:12.38, r:5,  vLat:38.01, vLon:12.52 }, // Egadi (Favignana) ← Trapani
  { lat:38.38, lon:13.12, r:4,  vLat:38.15, vLon:13.20 }, // Ustica ← Palermo
  { lat:37.46, lon:12.42, r:5,  vLat:37.63, vLon:12.58 }  // Pantelleria (stilizzata) ← Mazara
];

let hexes = [], grid = {}, comuni = [], strade = [], etnaSummit = -1, luoghi = [], sponsor = [], poi = [], monumenti = [];
// --- cache del terreno a due livelli ---
// Prima c'era un unico canvas-mondo a piena risoluzione: con la mappa attuale sarebbe
// ~14.000×9.400px (~530MB di RAM), e ogni invalidate() lo ricuoceva TUTTO. Ora:
//  - "base": il mondo intero a bassa risoluzione (~33MB), per gli zoom lontani e da sfondo;
//  - "tiles": piastrelle a piena risoluzione solo per l'area inquadrata, con cache LRU e
//    budget di ricottura per frame — le zone fuori vista non costano né RAM né CPU.
const BS = 11;            // px/km a piena definizione (tiles)
const BS_BASE = 2.75;     // px/km del livello base (mondo intero, leggero)
const TILE = 1024;        // lato piastrella (px-cache)
const PAD = 8;            // margine interno: il filtro bilineare "sanguina" nel margine, niente cuciture
const MAX_TILES = 28;     // tetto LRU (~120MB nel caso peggiore, in pratica molto meno)
const ZOOM_TILES = 5.5;   // sopra questo zoom la base sgranerebbe: entrano le tiles
const COTTURE_PER_FRAME = 2; // tiles ricotte al massimo per frame (le altre restano di un'epoca fa)
let baseCanvas = null, baseEpoch = -1;
let tiles = new Map();    // "tx,ty" -> { canvas, epoch, last }
let epoch = 0, lruTick = 0;
function invalidate(){ epoch++; }
// livello base: se permettiVecchia, una base di un'epoca passata va bene (fa solo da sfondo)
function ensureBase(st, permettiVecchia){
  if (baseCanvas && (baseEpoch === epoch || permettiVecchia)) return;
  if (!baseCanvas){
    baseCanvas = document.createElement("canvas");
    baseCanvas.width = Math.ceil(WORLD.w*BS_BASE);
    baseCanvas.height = Math.ceil(WORLD.h*BS_BASE);
  }
  const c = baseCanvas.getContext("2d");
  c.clearRect(0,0,baseCanvas.width,baseCanvas.height);
  renderTerreno(c, {x:0,y:0,z:BS_BASE}, st, R*BS_BASE);
  baseEpoch = epoch;
}
// (ri)cuoce la piastrella tx,ty; riusa il canvas di una piastrella sfrattata dall'LRU se possibile
function cuociTile(tx, ty, st, riusa){
  let t = riusa;
  if (!t){
    if (tiles.size >= MAX_TILES){
      let vk=null, vmin=Infinity;
      for (const [k2,t2] of tiles) if (t2.last < vmin){ vmin=t2.last; vk=k2; }
      t = tiles.get(vk); tiles.delete(vk);
    } else {
      const cv = document.createElement("canvas");
      cv.width = TILE+PAD*2; cv.height = TILE+PAD*2;
      t = { canvas: cv, epoch: -1, last: 0 };
    }
  }
  const c = t.canvas.getContext("2d");
  c.clearRect(0,0,t.canvas.width,t.canvas.height);
  renderTerreno(c, { x: -(tx*TILE-PAD), y: -(ty*TILE-PAD), z: BS }, st, R*BS);
  t.epoch = epoch;
  tiles.set(tx+","+ty, t);
  return t;
}

function hexCentro(col,row){ return { x: HEXW*(col + 0.5*(row&1)) + 4, y: ROWH*row + 4 }; }
function rngSeme(n){ const s = Math.sin(n*127.1+311.7)*43758.5453; return s - Math.floor(s); }

// ---- rumore coerente (value noise + fbm) su coordinate-mondo ----
// Il rumore bianco per-esagono (rngSeme) sparpaglia i valori come sale e pepe: due esagoni
// confinanti ottengono numeri scorrelati, e sulla mappa si vedono boschi a coriandoli e
// texture "a caso". Questo rumore invece è CONTINUO nello spazio: esagoni vicini campionano
// quasi lo stesso valore, quindi boschi e varianti formano macchie ampie come in geografia vera.
function _vn(ix, iy, sem){
  let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(sem, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function rumore(x, y, scala, sem){
  const fx = x/scala, fy = y/scala;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx-ix, ty = fy-iy;
  const sx = tx*tx*(3-2*tx), sy = ty*ty*(3-2*ty);          // smoothstep: niente spigoli
  const a = _vn(ix,iy,sem),   b = _vn(ix+1,iy,sem);
  const c = _vn(ix,iy+1,sem), d = _vn(ix+1,iy+1,sem);
  const ab = a + (b-a)*sx, cd = c + (d-c)*sx;
  return ab + (cd-ab)*sy;
}
// somma di ottave: macchie grandi con bordi frastagliati, come i confini di un bosco vero
function fbm(x, y, scala, sem){
  return rumore(x, y, scala, sem)*0.60
       + rumore(x, y, scala*0.45, sem+7)*0.28
       + rumore(x, y, scala*0.19, sem+13)*0.12;
}
// col/row più vicino a una coordinata-mondo (inverso approssimato di hexCentro)
function colRowDaXY(x, y){
  const row = Math.round((y-4)/ROWH);
  const col = Math.round((x-4)/HEXW - 0.5*(row&1));
  return { col, row };
}
// crea (se non esiste) un esagono a col/row con un dato terreno; ritorna l'indice
function creaHex(col, row, terra, elev, etna){
  const key = col+","+row;
  if (grid[key] !== undefined) return grid[key];
  const c = hexCentro(col,row);
  const idx = hexes.length;
  hexes.push({ i:idx, col, row, x:c.x, y:c.y, terra, elev:elev||0.1, fiume:false, costa:false,
               etna:!!etna, comune:-1, imp:null, impTurni:0, res:null, shade:0, isola:true });
  grid[key] = idx;
  return idx;
}
// aggiunge un'isola (cluster di esagoni) e un ponte di "secche" verso la costa
function addIsola(iso){
  const c = toXY(iso.lat, iso.lon);
  // cluster isola: tutti i col/row il cui centro cade entro il raggio
  const cr = colRowDaXY(c.x, c.y);
  const span = Math.ceil(iso.r/ROWH)+1;
  const isolaCells = [];
  for (let dr=-span; dr<=span; dr++){
    for (let dc=-span; dc<=span; dc++){
      const col=cr.col+dc, row=cr.row+dr;
      const hc = hexCentro(col,row);
      const d = Math.hypot(hc.x-c.x, hc.y-c.y);
      if (d < iso.r){
        const terra = d < iso.r*0.5 ? "hill" : "plain";
        creaHex(col, row, terra, d<iso.r*0.5?0.4:0.12);
        isolaCells.push({col,row});
      }
    }
  }
  if (!isolaCells.length) return;
  // ponte di secche: cammino sul grafo di esagoni verso la costa, garantendo l'adiacenza
  const t = toXY(iso.vLat, iso.vLon);
  // parti dalla cella-isola più vicina alla terraferma
  let cur = isolaCells.reduce((best,cell)=>{
    const hc=hexCentro(cell.col,cell.row); const d=Math.hypot(hc.x-t.x,hc.y-t.y);
    return (!best||d<best.d)?{col:cell.col,row:cell.row,d}:best;
  }, null);
  const terraferma = (colrow) => vicinatiCR(colrow.col,colrow.row).some(([nc,nr]) => {
    const k = nc+","+nr;
    return grid[k]!==undefined && !hexes[grid[k]].isola && hexes[grid[k]].terra!=="secca";
  });
  for (let step=0; step<80 && !terraferma(cur); step++){
    // scegli il vicino il cui centro è più vicino al bersaglio
    let next=null, nd=1e9;
    for (const [nc,nr] of vicinatiCR(cur.col,cur.row)){
      const hc=hexCentro(nc,nr); const d=Math.hypot(hc.x-t.x,hc.y-t.y);
      if (d<nd){ nd=d; next={col:nc,row:nr}; }
    }
    if (!next) break;
    const key = next.col+","+next.row;
    if (grid[key] === undefined) creaHex(next.col, next.row, "secca", 0.02);
    cur = next;
  }
  // riparazione: il cammino verso l'ancoraggio approssimato (vLat/vLon) può stallare/oscillare
  // se il punto non cade esattamente sulla vera costa (specie su mappe grandi) — in quel caso si
  // ripunta dritti verso l'esagono di vera terraferma più vicino alla posizione attuale del ponte
  if (!terraferma(cur)){
    const hcCur = hexCentro(cur.col, cur.row);
    let bestH = null, bd = 1e9;
    for (const h of hexes){
      if (h.isola || h.terra==="secca") continue;
      const d = Math.hypot(h.x-hcCur.x, h.y-hcCur.y);
      if (d < bd){ bd = d; bestH = h; }
    }
    for (let step=0; bestH && step<80 && !terraferma(cur); step++){
      let next=null, nd=1e9;
      for (const [nc,nr] of vicinatiCR(cur.col,cur.row)){
        const hc=hexCentro(nc,nr); const d=Math.hypot(hc.x-bestH.x,hc.y-bestH.y);
        if (d<nd){ nd=d; next={col:nc,row:nr}; }
      }
      if (!next) break;
      const key = next.col+","+next.row;
      if (grid[key] === undefined) creaHex(next.col, next.row, "secca", 0.02);
      cur = next;
    }
  }
}

function build(){
  hexes = []; grid = {}; strade = []; mmBounds = null;
  for (let row=0; row<ROWS; row++){
    for (let col=0; col<COLS; col++){
      const c = hexCentro(col,row);
      if (!dentroCosta(c.x, c.y)) continue;
      let terra = "plain", elev = 0.08, best = null;
      for (const z of ZONE){
        const d = Math.hypot(c.x-z.x, c.y-z.y);
        if (d < z.r && (!best || d/z.r < best.q)) best = { q:d/z.r, tipo:z.tipo, alt:z.alt*(1-d/z.r*0.6) };
      }
      if (best){ terra = best.tipo; elev = best.alt; }
      // anche queste soglie erano in unità-mondo tarate sulla vecchia scala (7 unità = 2 km!):
      // ora in chilometri veri — l'edificio vulcanico dell'Etna misura ~45 km di diametro
      const dEtna = Math.hypot(c.x-ETNA.x, c.y-ETNA.y) / KMU;
      let etna = false;
      if (dEtna < 9){ terra = "volcano"; elev = 1.3*(1-dEtna/12); }
      else if (dEtna < 26 && terra === "plain"){ terra = "hill"; elev = 0.5*(1-dEtna/32); }
      if (dEtna < 34) etna = true;
      // Boschi a MACCHIA, non a coriandoli: la foresta segue un campo di rumore continuo
      // (~30 km di respiro), così i Nebrodi e le Madonie hanno versanti boscosi compatti
      // invece di alberi isolati sparsi a caso in mezzo alla roccia.
      const bosco = fbm(c.x, c.y, 30*KMU, 3);          // macchie di ~30 km
      const nord = c.y < (LAT0-37.80)*KY;              // versante tirrenico: è lì che la Sicilia è boscosa
      if (terra==="mountain" && bosco > 0.54) terra="forest";
      if (terra==="hill" && nord && bosco > 0.56) terra="forest";
      if (dEtna>=9 && dEtna<26 && bosco > 0.48) terra="forest";
      const fiume = vicinoFiume(c.x, c.y);
      const idx = hexes.length;
      hexes.push({ i:idx, col, row, x:c.x, y:c.y, terra, elev, fiume, costa:false,
                   etna, comune:-1, imp:null, impTurni:0, res:null, shade:0 });
      grid[col+","+row] = idx;
    }
  }
  // isole minori + ponti di "secche" (aggiunte prima di costa/ombre/voronoi)
  for (const iso of ISOLE) addIsola(iso);
  // costa
  for (const h of hexes){
    for (const [nc,nr] of vicinatiCR(h.col,h.row))
      if (grid[nc+","+nr] === undefined){ h.costa = true; if (h.elev>0.3) h.elev=0.3; break; }
  }
  // hillshade
  calcolaOmbre();
  // Etna summit
  { let bd=1e9; for (const h of hexes){ const d=Math.hypot(h.x-ETNA.x,h.y-ETNA.y); if(h.terra==="volcano"&&d<bd){bd=d;etnaSummit=h.i;} } }
  // comuni + voronoi
  comuni = window.DATA_COMUNI.map((c,id) => {
    const p = toXY(c[1], c[2]);
    return { id, nome:c[0], prov:c[3], tier:c[4], res:c[5], x:p.x, y:p.y, hex:-1 };
  });
  for (const cm of comuni){
    let best=-1, bd=1e9;
    for (const h of hexes){ const d = Math.hypot(h.x-cm.x, h.y-cm.y); if (d < bd){ bd=d; best=h.i; } }
    cm.hex = best;
  }
  const presi = {};
  for (const cm of comuni){
    if (presi[cm.hex] !== undefined){
      let best=-1, bd=1e9;
      for (const h of hexes){ if (presi[h.i]!==undefined) continue; const d = Math.hypot(h.x-cm.x, h.y-cm.y); if (d<bd){ bd=d; best=h.i; } }
      cm.hex = best;
    }
    presi[cm.hex] = cm.id;
  }
  for (const h of hexes){
    let best=-1, bd=1e9;
    for (const cm of comuni){ const hc = hexes[cm.hex]; const d = Math.hypot(h.x-hc.x, h.y-hc.y); if (d<bd){ bd=d; best=cm.id; } }
    h.comune = best;
  }
  for (const cm of comuni){
    const h = hexes[cm.hex];
    if (h.terra==="mountain"||h.terra==="volcano"||h.terra==="forest"){ h.terra="hill"; h.elev=0.4; }
  }
  // risorse
  for (const cm of comuni){
    if (!cm.res) continue;
    const terr = hexes.filter(h => h.comune===cm.id && h.i!==cm.hex);
    let cand = terr;
    if (cm.res==="tonno"||cm.res==="pesce"||cm.res==="sale") cand = terr.filter(h=>h.costa);
    if (cm.res==="zolfo"||cm.res==="marmo") cand = terr.filter(h=>h.terra==="hill"||h.terra==="mountain");
    if (!cand.length) cand = terr;
    if (cand.length) cand[Math.floor(rngSeme(cm.id*7)*cand.length)].res = cm.res;
    else hexes[cm.hex].res = cm.res;
  }
  // monumenti famosi: NON sulla città stessa, ma su una casella del suo territorio,
  // vicina ma non attaccata (adiacente) al centro abitato — come un vero sito fuori dal borgo
  monumenti = [];
  for (const cm of comuni){
    const fam = ART.monumentoFamoso(cm);
    if (!fam) continue;
    const adiacenti = new Set(vicini(cm.hex));
    const proprio = hexes.filter(h => h.comune===cm.id && h.i!==cm.hex && !adiacenti.has(h.i));
    const pool = proprio.length ? proprio : hexes.filter(h => h.comune===cm.id && h.i!==cm.hex);
    if (!pool.length) continue; // territorio troppo piccolo: nessuna casella libera, il comune resta senza sito separato
    pool.sort((a,b) => Math.hypot(a.x-hexes[cm.hex].x,a.y-hexes[cm.hex].y) - Math.hypot(b.x-hexes[cm.hex].x,b.y-hexes[cm.hex].y));
    const scelto = pool[Math.floor(rngSeme(cm.id*13)*Math.min(3,pool.length))];
    monumenti.push({ cmId: cm.id, hex: scelto.i, mon: fam.tipo, etichetta: fam.etichetta,
                     slug: cm.nome.toLowerCase().replace(/[^a-z0-9]/g, "") });   // → sprite "mon_c_<slug>"
  }
  // strade: ogni comune collegato ai 2 comuni-centro più vicini
  const dedup = {};
  for (const cm of comuni){
    const vicini2 = comuni.filter(c=>c.id!==cm.id).sort((a,b)=>
      Math.hypot(a.x-cm.x,a.y-cm.y)-Math.hypot(b.x-cm.x,b.y-cm.y)).slice(0,2);
    for (const v of vicini2){
      const key = Math.min(cm.id,v.id)+"-"+Math.max(cm.id,v.id);
      if (dedup[key]) continue; dedup[key]=1;
      const a=hexes[cm.hex], b=hexes[v.hex];
      strade.push({ ax:a.x, ay:a.y, bx:b.x, by:b.y });
    }
  }
  // luoghi (etichette geografiche/siti)
  luoghi = (window.DATA_LUOGHI||[]).map(l => { const p = toXY(l[1], l[2]); return { nome:l[0], x:p.x, y:p.y, tipo:l[3], zMin:l[4] }; });
  // POI sponsor (prototipo): ancorati all'esagono più vicino alla posizione reale
  sponsor = (window.DATA_SPONSOR||[]).map(s => {
    const p = toXY(s.lat, s.lon);
    let best=-1, bd=1e9;
    for (const h of hexes){ const d = Math.hypot(h.x-p.x, h.y-p.y); if (d<bd){ bd=d; best=h.i; } }
    return Object.assign({}, s, { x:p.x, y:p.y, hex:best });
  });
  // sponsor personalizzati (demo locale) aggiunti dal giocatore via il form "Diventa Sponsor"
  try {
    const custom = JSON.parse(localStorage.getItem("trinacria_sponsor_custom") || "[]");
    for (const s of custom){
      const p = toXY(s.lat, s.lon);
      let best=-1, bd=1e9;
      for (const h of hexes){ const d=Math.hypot(h.x-p.x,h.y-p.y); if(d<bd){bd=d;best=h.i;} }
      sponsor.push(Object.assign({}, s, { x:p.x, y:p.y, hex:best, custom:true }));
    }
  } catch(e){ /* localStorage assente o dati corrotti: ignora */ }
  // POI di contorno (nomi di fantasia, non dati reali): ancorati all'esagono più vicino
  poi = (window.DATA_POI||[]).map(p => {
    const w = toXY(p.lat, p.lon);
    let best=-1, bd=1e9;
    for (const h of hexes){ const d=Math.hypot(h.x-w.x,h.y-w.y); if(d<bd){bd=d;best=h.i;} }
    return { n:p.n, c:p.c, lat:p.lat, lon:p.lon, x:w.x, y:w.y, hex:best };
  });
  epoch++;   // mondo nuovo: base e tiles vanno ricotte
  return { hexes, comuni };
}

function calcolaOmbre(){
  const LX=-0.72, LY=-0.69; // luce da NW
  for (const h of hexes){
    let gx=0, gy=0, n=0;
    for (const j of vicini(h.i)){
      const o=hexes[j], dx=o.x-h.x, dy=o.y-h.y, dl=Math.hypot(dx,dy)||1;
      const de=o.elev-h.elev;
      gx += (dx/dl)*de; gy += (dy/dl)*de; n++;
    }
    if (n){ gx/=n; gy/=n; }
    let s = -(gx*LX+gy*LY)*3.2;
    // rilievi comunque un filo più scuri di base per volume
    s += (h.elev-0.2)*0.15;
    h.shade = Math.max(-0.5, Math.min(0.5, s));
  }
}

// vicini odd-r
function vicinatiCR(col,row){
  const odd = row & 1;
  return odd
    ? [[col+1,row],[col-1,row],[col,row-1],[col+1,row-1],[col,row+1],[col+1,row+1]]
    : [[col+1,row],[col-1,row],[col-1,row-1],[col,row-1],[col-1,row+1],[col,row+1]];
}
function vicini(i){
  const h = hexes[i], out=[];
  for (const [c,r] of vicinatiCR(h.col,h.row)){ const j = grid[c+","+r]; if (j!==undefined) out.push(j); }
  return out;
}
function distKm(a,b){ return Math.hypot(hexes[a].x-hexes[b].x, hexes[a].y-hexes[b].y); }

// ---- proiezione ----
function w2s(v, x, y){ return { x: x*v.z + v.x, y: y*v.z + v.y }; }
function s2w(v, sx, sy){ return { x:(sx-v.x)/v.z, y:(sy-v.y)/v.z }; }
function hexAt(v, sx, sy){
  const w = s2w(v, sx, sy);
  let best=-1, bd=1e9;
  for (const h of hexes){ const d = Math.hypot(h.x-w.x, h.y-w.y); if (d<bd){ bd=d; best=h.i; } }
  return (bd < R*1.25) ? best : -1;
}

function coloreFazione(st, fid){
  if (fid === -1) return "#8a8577";
  if (fid >= 100){ const inv = st.invasori.find(z=>z.id===fid); return inv ? inv.colore : "#666"; }
  return GDATA.FAZIONI[fid].colore;
}
function coloreFazione2(st, fid){
  if (fid >= 0 && fid < 100) return GDATA.FAZIONI[fid].colore2;
  return "#333";
}

// ---- RENDER ----
// entrata per-frame: mare + cache-mondo (blit a due livelli) + livello animato
// Sopra questo zoom la cache (cotta a BS px/km) andrebbe ingrandita e sgranerebbe: da qui in su
// il terreno si disegna dal vivo, alla risoluzione dello schermo — pochi esagoni in vista, costo basso.
const ZOOM_LIVE = 13;
function frame(ctx, v, st, sel){
  const rz = R*v.z;
  drawSea(ctx, v);
  if (v.z >= ZOOM_LIVE){
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    renderTerreno(ctx, v, st, rz);
  } else blit(ctx, v, st);
  renderDynamic(ctx, v, st, sel, rz);
}
// compat: rendering completo diretto (senza cache)
function render(ctx, v, st, sel){ frame(ctx, v, st, sel); }

function drawSea(ctx, v){
  const W = window.innerWidth, H = window.innerHeight;
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, ART.PAL.mareChiaro); g.addColorStop(0.5, ART.PAL.mare); g.addColorStop(1, ART.PAL.mareProf);
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  if (v.z>3){
    ctx.strokeStyle="rgba(255,255,255,0.045)"; ctx.lineWidth=1;
    for (let y=(v.y%22+22)%22; y<H; y+=22){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }
}

// disegna la cache-mondo sullo schermo: base sotto (sempre), tiles nitide sopra a zoom alto
function blit(ctx, v, st){
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  // la base fa da sfondo immediato anche a zoom alto (copre le tiles non ancora pronte);
  // la si ricuoce però solo quando è davvero protagonista (zoom basso)
  ensureBase(st, v.z >= ZOOM_TILES);
  ctx.drawImage(baseCanvas, 0,0, baseCanvas.width, baseCanvas.height,
                v.x, v.y, WORLD.w*v.z, WORLD.h*v.z);
  if (v.z < ZOOM_TILES) return;
  const W = window.innerWidth, H = window.innerHeight;
  const w0 = s2w(v, 0, 0), w1 = s2w(v, W, H);
  const NTX = Math.ceil(WORLD.w*BS/TILE), NTY = Math.ceil(WORLD.h*BS/TILE);
  const x0 = Math.max(0, Math.floor(w0.x*BS/TILE)), y0 = Math.max(0, Math.floor(w0.y*BS/TILE));
  const x1 = Math.min(NTX-1, Math.floor(w1.x*BS/TILE)), y1 = Math.min(NTY-1, Math.floor(w1.y*BS/TILE));
  const k = v.z/BS;
  let budget = COTTURE_PER_FRAME;
  for (let ty=y0; ty<=y1; ty++){
    for (let tx=x0; tx<=x1; tx++){
      let t = tiles.get(tx+","+ty);
      if ((!t || t.epoch !== epoch) && budget > 0){ t = cuociTile(tx, ty, st, t && t.epoch!==epoch ? t : null); budget--; }
      if (!t) continue;   // non ancora cotta: per qualche frame si vede la base (progressivo)
      // una tile di un'epoca passata si disegna comunque: meglio un frame datato che un buco
      t.last = ++lruTick;
      const so = 1;       // 1px-cache di sovrapposizione tra tiles adiacenti: niente fessure
      ctx.drawImage(t.canvas, PAD-so, PAD-so, TILE+2*so, TILE+2*so,
                    v.x + (tx*TILE-so)*k, v.y + (ty*TILE-so)*k, (TILE+2*so)*k, (TILE+2*so)*k);
    }
  }
}

// ---- sprite AI (js/sprites.js): helper di scelta frame; ogni chiamata ricade sull'arte procedurale se manca ----
// Texture di terreno ancorata al MONDO: esagoni confinanti dello stesso terreno mostrano la
// continuazione della stessa immagine, così il paesaggio prosegue da una casella all'altra
// invece di essere un timbro ripetuto in ogni esagono.
// Perché non si vedono più cuciture né quadrati:
//  · le tessere sorgente sono state rese RIPETIBILI (scratchpad/seamless.py): affiancate non
//    hanno bordi visibili, quindi sparisce la griglia di righe dritte ogni TEX_KM che prima
//    faceva leggere quadrati al posto di esagoni — e senza ricorrere al ribaltamento a specchio,
//    che eliminava le cuciture ma creava un'evidente simmetria a farfalla, cioè un altro "pattern";
//  · la variante (0-2) è scelta da un rumore continuo, non dalla cella quadrata: cambia di rado
//    e sempre lungo un lato d'esagono, mai lungo una retta che taglia la mappa.
const TEX_KM = R*7;   // ~22 km per cella: il motivo si ripete di rado nel campo visivo

// Contorno della casella. Una sola linea scura spariva sulla roccia scura delle montagne e
// una sola linea chiara spariva sul grano dorato: qui se ne disegnano DUE, una scura appena
// fuori e una chiara appena dentro. Il bordo resta leggibile su qualunque terreno senza
// dover alzare il contrasto al punto da trasformare la mappa in una griglia da quaderno.
function contornoCasella(ctx, cx, cy, rz){
  const w = Math.max(0.7, rz*0.035);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,246,224,0.30)"; ctx.lineWidth = w;
  ART.hexPath(ctx, cx, cy, rz - w*0.55); ctx.stroke();
  ctx.strokeStyle = "rgba(24,16,8,0.62)";    ctx.lineWidth = w;
  ART.hexPath(ctx, cx, cy, rz + 0.6);        ctx.stroke();
}
function varianteTerreno(h){
  if (h._var === undefined) h._var = Math.min(2, Math.floor(fbm(h.x, h.y, 46*KMU, 21) * 3.2));
  return h._var;
}
function disegnaTexturaHex(ctx, v, s, h, rz){
  const id = "terra_"+h.terra+"_"+varianteTerreno(h);
  if (!SPRITES.getFrame(id)) return false;
  ctx.save();
  ART.hexPath(ctx, s.x, s.y, rz+0.6); ctx.clip();
  const T = TEX_KM*v.z;
  const cx = Math.floor(h.x/TEX_KM), cy = Math.floor(h.y/TEX_KM);
  const x0 = cx*T + v.x, y0 = cy*T + v.y;
  for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++){
    const px = x0+dx*T, py = y0+dy*T;
    if (px > s.x+rz || px+T < s.x-rz || py > s.y+rz || py+T < s.y-rz) continue;
    // Allineamento a pixel INTERI: il bordo destro di una cella coincide esattamente con il
    // bordo sinistro della successiva. Prima ogni cella veniva disegnata mezzo pixel più grande
    // del passo per non lasciare fessure, ma così le celle si sovrapponevano e la striscia
    // comune restava visibile come una riga sottile a ogni confine di tessera.
    const ix = Math.round(px), iy = Math.round(py);
    SPRITES.drawTL(ctx, id, ix, iy, Math.round(px+T)-ix, Math.round(py+T)-iy);
  }
  // hillshade come in mosaicoHex
  const a = Math.min(0.45, Math.abs(h.shade||0));
  if (a > 0.01){ ctx.fillStyle = (h.shade<0 ? "rgba(0,0,0," : "rgba(255,255,255,")+a+")"; ART.hexPath(ctx, s.x, s.y, rz+0.6); ctx.fill(); }
  ctx.restore();
  if (rz >= 4) contornoCasella(ctx, s.x, s.y, rz);
  return true;
}
const STILI_ARCH = ["greca","romana","araba","normanna"];
function stileArch(cm){
  const c = cm.cultura;
  if (c==="araba") return 2;
  if (c==="romana"||c==="bizantina") return 1;
  if (c==="normanna"||c==="siciliana") return 3;
  return 0;
}
function idSpriteCitta(cm, isCap){
  const stile = STILI_ARCH[stileArch(cm)];
  let t = Math.max(1, Math.min(4, cm.tier));
  if (cm.pop >= 14 && t < 4) t++;              // le città crescono a vista
  if (t===1) return "citta_"+stile+"_1";
  if (t===4 && isCap) return "citta_"+stile+"_cap";
  return "citta_"+stile+"_"+t+(cm.mura>0 ? "w" : "");
}
const RUOLI_SPRITE = ["inf","ranged","cav","siege"];
function idSpriteUnita(tipo){
  if (SPRITES.ha("unita_"+tipo)) return "unita_"+tipo;
  const ud = GDATA.UNITA[tipo]; if (!ud) return null;
  const ri = RUOLI_SPRITE.indexOf(ud.tipo); if (ri < 0) return null;
  const linea = GDATA.LINEA_ERA[Math.min(5, ud.era||0)];     // unità uniche → sprite dell'unità di linea coeva
  return linea ? "unita_"+linea[ri] : null;
}
const MON_ALIAS = { duomo:"cattedrale", borgoGrande:"borgo" };

// terreno, fiumi, strade, territorio, migliorie, città — nella cache-mondo (no mare, no selezione, no etichette)
function renderTerreno(ctx, v, st, rz){
  const W = ctx.canvas.width, H = ctx.canvas.height;
  // margine rz*3: gli elementi più larghi di una città (alone capitale rz*2.4, cinta muraria)
  // devono essere disegnati anche quando il loro centro cade appena fuori da una tile
  const vis = h => { const s=w2s(v,h.x,h.y); return !(s.x<-rz*3||s.y<-rz*3||s.x>W+rz*3||s.y>H+rz*3); };
  // coste: alone di sabbia sotto agli esagoni costieri
  for (const h of hexes){
    if (!h.costa || !vis(h)) continue;
    const s = w2s(v,h.x,h.y);
    ctx.fillStyle = "#d8c88f"; ART.hexPath(ctx, s.x, s.y, rz+Math.max(2,rz*0.28)); ctx.fill();
  }
  // terreno mosaico (texture AI se disponibili, altrimenti tessere procedurali)
  const texAI = SPRITES.abilitato.terreno;
  for (const h of hexes){
    if (!vis(h)) continue;
    const s = w2s(v, h.x, h.y);
    if (!(texAI && disegnaTexturaHex(ctx, v, s, h, rz))) ART.mosaicoHex(ctx, s.x, s.y, rz, h.terra, h.i, h.shade);
  }
  // fiumi
  ctx.strokeStyle = "rgba(70,150,205,0.85)"; ctx.lineWidth = Math.max(1.2, rz*0.22);
  ctx.lineJoin="round"; ctx.lineCap="round";
  for (const f of FIUMI){
    ctx.beginPath();
    for (let i=0;i<f.length;i++){ const s=w2s(v,f[i].x,f[i].y); i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y); }
    ctx.stroke();
  }
  // strade (solo a zoom medio-alto)
  if (v.z > 4){
    ctx.strokeStyle = "rgba(180,150,95,0.5)"; ctx.lineWidth = Math.max(0.8, rz*0.07);
    ctx.setLineDash([rz*0.5, rz*0.4]);
    for (const r of strade){
      const a=w2s(v,r.ax,r.ay), b=w2s(v,r.bx,r.by);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  // territorio + confini: come su un atlante, il colore è pieno all'interno del regno
  // e si ammorbidisce verso la frontiera, dove poi la linea di confine netta lo ridisegna
  if (st){
    for (const h of hexes){
      const own = st.comuni[h.comune].fazione;
      if (own===-1 || !vis(h)) continue;
      // velo leggerissimo: il possesso si legge dal confine e dal suo alone, la texture resta protagonista
      const frontiera = vicini(h.i).some(j => st.comuni[hexes[j].comune].fazione !== own);
      const s = w2s(v, h.x, h.y);
      ctx.fillStyle = coloreFazione(st, own) + (frontiera ? "10" : "18");
      ART.hexPath(ctx, s.x, s.y, rz+0.6); ctx.fill();
    }
    disegnaConfini(ctx, v, st, rz, W, H);
  }
  // migliorie e risorse
  if (rz > 6){
    ctx.textAlign="center"; ctx.textBaseline="middle";
    for (const h of hexes){
      if (!vis(h)) continue;
      const s = w2s(v, h.x, h.y);
      const icoAI = SPRITES.abilitato.icone;
      if (h.imp){
        if (!(icoAI && SPRITES.drawFit(ctx, "icona_"+h.imp, s.x, s.y+rz*0.05, null, rz*0.95))){
          ctx.font = Math.floor(rz*0.8)+"px serif"; ctx.fillText(GDATA.MIGLIORIE[h.imp].icona, s.x, s.y+rz*0.05);
        }
      } else if (h.res){
        ctx.globalAlpha=0.92;
        if (!(icoAI && SPRITES.drawFit(ctx, "icona_res_"+h.res, s.x, s.y+rz*0.05, null, rz*0.8))){
          ctx.font = Math.floor(rz*0.68)+"px serif"; ctx.fillText(RES_INFO[h.res].icona, s.x, s.y+rz*0.05);
        }
        ctx.globalAlpha=1;
      }
    }
  }
  // città
  if (st){
    for (const cm of st.comuni){
      const h = hexes[cm.hex];
      if (!vis(h)) continue;
      const s = w2s(v, h.x, h.y);
      const hasCatt = cm.edifici.includes("cattedrale") || cm.edifici.includes("castello");
      const isCap = !!(st.fazioni[cm.fazione] && st.fazioni[cm.fazione].capitale === cm.id);
      const idC = SPRITES.abilitato.citta ? idSpriteCitta(cm, isCap) : null;
      const spriteCitta = idC && SPRITES.getFrame(idC);
      // periferia: le città grandi si allargano visivamente sugli esagoni vicini dello stesso comune
      if (!spriteCitta && (cm.pop >= 6 || cm.tier >= 3)){
        const satelliti = vicini(cm.hex).filter(i => hexes[i].comune === cm.id);
        const nSat = cm.pop >= 12 ? 2 : 1;
        for (let k=0; k<Math.min(nSat, satelliti.length); k++){
          const vh = hexes[satelliti[k]];
          if (!vis(vh)) continue;
          const sp = w2s(v, vh.x, vh.y);
          ART.periferia(ctx, sp.x, sp.y, rz, cm.id, k, coloreFazione(st, cm.fazione));
        }
      }
      // capitale: alone del colore del regno sotto la città, come il pallino della capitale su un atlante
      if (st.fazioni[cm.fazione] && st.fazioni[cm.fazione].capitale === cm.id && rz > 5){
        const g = ctx.createRadialGradient(s.x, s.y, rz*0.3, s.x, s.y, rz*2.4);
        g.addColorStop(0, coloreFazione(st, cm.fazione)+"55"); g.addColorStop(1, coloreFazione(st, cm.fazione)+"00");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, rz*2.4, 0, 7); ctx.fill();
      }
      if (spriteCitta){
        const t = Math.max(1, Math.min(4, cm.tier + (cm.pop>=14 && cm.tier<4 ? 1 : 0)));
        const w = rz * ([0, 2.0, 2.6, 3.2, 3.8][t] + (idC.endsWith("_cap") ? 0.4 : 0));
        ctx.beginPath(); ctx.ellipse(s.x, s.y+rz*0.35, w*0.42, w*0.16, 0, 0, 7);
        ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fill();
        SPRITES.drawFit(ctx, idC, s.x, s.y+rz*0.4, w, null);
      } else {
        ART.citta(ctx, s.x, s.y, rz, cm, coloreFazione(st, cm.fazione), coloreFazione2(st, cm.fazione), hasCatt);
      }
      // capitale: stella sopra la città, centrata e con contorno scuro (si stacca dai tetti)
      if (isCap){
        const fs = Math.max(11, rz*0.6);
        ctx.font = "bold "+Math.floor(fs)+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.lineWidth = Math.max(2, fs*0.22); ctx.strokeStyle = "rgba(20,14,6,0.85)"; ctx.lineJoin="round";
        ctx.strokeText("★", s.x, s.y - rz*1.35);
        ctx.fillStyle = "#ffd700"; ctx.fillText("★", s.x, s.y - rz*1.35);
      }
      // barra assedio
      if (cm.mura>0 && cm.muraHP < cm.mura*100){
        const q = cm.muraHP/(cm.mura*100);
        ctx.fillStyle="#2a2018"; ctx.fillRect(s.x-rz*0.8, s.y+rz*1.0, rz*1.6, 3.5);
        ctx.fillStyle= q>0.5?"#c9bfa8":"#c0392b"; ctx.fillRect(s.x-rz*0.8, s.y+rz*1.0, rz*1.6*q, 3.5);
      }
    }
    // monumenti famosi: sorgono da soli su una casella del territorio, staccati dalla città
    for (const m of monumenti){
      const h = hexes[m.hex];
      if (!vis(h)) continue;
      const s = w2s(v, h.x, h.y);
      ctx.beginPath(); ctx.ellipse(s.x, s.y+rz*0.42, rz*0.6, rz*0.24, 0, 0, 7);
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fill();
      const idM = "mon_"+(MON_ALIAS[m.mon]||m.mon);
      if (!(SPRITES.abilitato.monumenti && (SPRITES.drawFit(ctx, "mon_c_"+m.slug, s.x, s.y+rz*0.55, rz*2.3, null) ||
                                             SPRITES.drawFit(ctx, idM, s.x, s.y+rz*0.55, rz*2.3, null))))
        ART.monumento(ctx, s.x, s.y+rz*0.12, rz*1.55, m.mon);
    }
  }
}

// livello dinamico (screen-space): selezione, Etna, unità animate, particelle, etichette
function renderDynamic(ctx, v, st, sel, rz){
  const W = window.innerWidth, H = window.innerHeight;
  const vis = h => { const s=w2s(v,h.x,h.y); return !(s.x<-rz*3||s.y<-rz*3||s.x>W+rz*3||s.y>H+rz*3); };
  // nebbia di guerra: copre la mappa non in vista
  if (st && st.nebbia){
    for (const h of hexes){
      if (GAME.hexVisibile(h.i)) continue;
      if (!vis(h)) continue;
      const s = w2s(v, h.x, h.y);
      ART.hexPath(ctx, s.x, s.y, rz+1);
      ctx.fillStyle = GAME.hexEsplorato(h.i) ? "rgba(9,14,20,0.55)" : "rgba(6,10,14,0.96)";
      ctx.fill();
    }
  }
  const puls = 0.5 + 0.5*Math.sin(performance.now()*0.005);
  // colono e lavoratore non combattono mai: le caselle "raggiungibili con azione" si colorano di
  // verde-oro (azione pacifica) invece che di rosso (attacco), per non confondere il giocatore
  const soloColono = !!(st && sel && sel.unita && sel.unita.length && sel.unita.every(id => {
    const u = st.unita.find(x=>x.id===id); return u && (u.tipo==="colono" || u.tipo==="lavoratore");
  }));
  // evidenzia raggio movimento
  if (sel && sel.raggio){
    for (const i of Object.keys(sel.raggio)){
      const h = hexes[i]; const s = w2s(v, h.x, h.y);
      ART.hexPath(ctx, s.x, s.y, rz*0.9);
      const azione = sel.raggio[i].attacco;
      ctx.fillStyle = !azione ? "rgba(120,220,120,0.22)" : (soloColono ? "rgba(220,190,80,0.30)" : "rgba(220,80,60,0.34)"); ctx.fill();
      ctx.strokeStyle = !azione ? "rgba(150,235,150,0.7)" : (soloColono ? "rgba(240,215,110,0.9)" : "rgba(235,110,90,0.9)"); ctx.lineWidth = 1.6; ctx.stroke();
    }
    // frecce dal selezionato verso i bersagli attaccabili + icona spade (non per i coloni)
    if (sel.hex >= 0 && !soloColono){
      const o = w2s(v, hexes[sel.hex].x, hexes[sel.hex].y);
      for (const i of Object.keys(sel.raggio)){
        if (!sel.raggio[i].attacco) continue;
        const t = w2s(v, hexes[i].x, hexes[i].y);
        frecciaAttacco(ctx, o.x, o.y, t.x, t.y, rz, puls);
      }
    }
  }
  // casella selezionata: velo viola + doppio contorno pulsante. Prima era un filo bianco,
  // che sul mosaico chiaro spariva e non diceva quale casella fosse davvero scelta.
  if (sel && sel.hex >= 0){
    const h = hexes[sel.hex]; const s = w2s(v, h.x, h.y);
    ctx.save();
    ART.hexPath(ctx, s.x, s.y, rz+0.6);
    ctx.fillStyle = "rgba(150,70,220,"+(0.20+puls*0.10).toFixed(3)+")"; ctx.fill();
    ctx.shadowColor = "rgba(180,100,255,0.9)"; ctx.shadowBlur = 8 + puls*10;
    ctx.strokeStyle = "rgba(60,20,90,0.85)"; ctx.lineWidth = 4.5 + puls*1.6;
    ART.hexPath(ctx, s.x, s.y, rz+0.6); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#c489ff"; ctx.lineWidth = 2.2 + puls*1.4;
    ART.hexPath(ctx, s.x, s.y, rz+0.6); ctx.stroke();
    ctx.restore();
  }
  // città del giocatore senza ordini: martello pulsante
  if (st && rz > 6){
    for (const cm of st.comuni){
      if (cm.fazione!==st.giocatore || cm.coda.length) continue;
      const h = hexes[cm.hex]; if (!vis(h)) continue;
      const s = w2s(v, h.x, h.y);
      ctx.globalAlpha = 0.45 + puls*0.35;
      ctx.font = Math.floor(Math.min(24, rz*0.6))+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("🔨", s.x + rz*0.75, s.y - rz*1.0);
      ctx.globalAlpha = 1;
    }
  }
  // indicatori di destinazione (unità del giocatore in viaggio)
  if (st){
    for (const u of st.unita){
      if (u.fazione!==st.giocatore || u.goto==null) continue;
      const a = w2s(v, hexes[u.hex].x, hexes[u.hex].y);
      const b = w2s(v, hexes[u.goto].x, hexes[u.goto].y);
      ctx.strokeStyle="rgba(240,207,106,0.5)"; ctx.lineWidth=1.5; ctx.setLineDash([5,5]);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle="#f0cf6a"; ctx.font=Math.floor(rz*0.7)+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("⚑", b.x, b.y-rz*0.6);
    }
  }
  // Etna: fumo continuo
  if (etnaSummit>=0){ const h=hexes[etnaSummit]; FX.etnaSmoke(h.x, h.y); }
  // stendardi che sventolano + fumo dei camini sulle città (livello animato, non in cache)
  if (st && rz > 6){
    for (const cm of st.comuni){
      const h = hexes[cm.hex];
      if (!vis(h)) continue;
      if (st.nebbia && !GAME.hexEsplorato(cm.hex)) continue;
      const s = w2s(v, h.x, h.y);
      const col = coloreFazione(st, cm.fazione);
      // bandiera solo dove conta: capitali e città grandi (i borghi restano puliti)
      const isCap = st.fazioni[cm.fazione] && st.fazioni[cm.fazione].capitale === cm.id;
      if (cm.fazione>=0 && (isCap || cm.tier>=3)) ART.bandiera(ctx, s.x + rz*0.9, s.y, rz, col, cm.id);
      // fumo che sale dai tetti delle città vive (di rado, per non appesantire)
      if (cm.fazione>=0 && cm.fazione<100 && cm.pop>=4 && rz>7 && Math.random()<0.012)
        FX.smoke(h.x + (Math.random()-0.5)*R, h.y - R*0.4, 0.6);
    }
  }
  // POI di contorno (fantasia) sotto, poi i pin sponsor sopra
  disegnaPOI(ctx, v, st, rz);
  if (rz > 7) disegnaSponsor(ctx, v, st, rz);
  // unità: mini-eserciti animati
  if (st){
    const perHexFaz = {};
    for (const u of st.unita){
      FX.aimUnit(u.id, hexes[u.hex].x, hexes[u.hex].y);
      // nebbia: nascondi le unità nemiche non in vista
      if (st.nebbia && u.fazione!==st.giocatore && !GAME.hexVisibile(u.hex)) continue;
      const key = u.hex+"_"+u.fazione;
      (perHexFaz[key]=perHexFaz[key]||[]).push(u);
    }
    for (const key of Object.keys(perHexFaz)){
      const lista = perHexFaz[key];
      if (!vis(hexes[lista[0].hex])) continue;
      disegnaEsercito(ctx, v, rz, lista, st, sel);
    }
  }
  // vita sulla mappa: solo da vicino, dove c'è spazio per vederla davvero
  if (rz > 34) vitaSullaMappa(ctx, v, st, rz, W, H);
  // effetti (particelle, testi)
  FX.render(ctx, v);
  // ---- etichette: si disegnano in ordine di importanza e chi si sovrappone viene saltato ----
  LBL.reset();
  // 1) città (le più grandi per prime)
  if (st && rz > 7){
    ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    const cittaVisibili = st.comuni.filter(cm => {
      if (rz < 11 && cm.tier < 3) return false;
      if (rz < 9 && cm.tier < 4) return false;
      if (st.nebbia && !GAME.hexEsplorato(cm.hex)) return false;
      return vis(hexes[cm.hex]);
    }).sort((a,b)=>b.tier-a.tier);
    for (const cm of cittaVisibili){
      const s = w2s(v, hexes[cm.hex].x, hexes[cm.hex].y);
      const fs = cm.tier>=4?14:(cm.tier===3?12:10.5);
      const y = s.y+rz*1.55;
      ctx.font = (cm.tier>=3?"bold ":"")+fs+"px Georgia";
      if (!LBL.prova(s.x, y-fs*0.5, ctx.measureText(cm.nome).width+10, fs+6)) continue;
      etichetta(ctx, cm.nome, s.x, y, fs, cm.tier>=3, cm.fazione, st);
    }
    // ...poi i tetti delle città si riservano il loro spazio: nessun'altra etichetta ci finirà sopra
    for (const cm of st.comuni){
      const h = hexes[cm.hex]; if (!vis(h)) continue;
      const s = w2s(v, h.x, h.y);
      const k = 1 + Math.max(0, Math.min(3, cm.tier-1))*0.28;
      LBL.occupa(s.x, s.y - rz*0.25, rz*2.0*k, rz*1.4*k);
    }
    // 2) targhe dei monumenti-simbolo (icona + nome) sulla loro casella propria
    if (rz > 9){
      for (const m of monumenti){
        if (st.nebbia && !GAME.hexEsplorato(m.hex)) continue;
        const h = hexes[m.hex]; if (!vis(h)) continue;
        const s = w2s(v, h.x, h.y);
        ctx.font = "600 11px Georgia";
        const w = ctx.measureText(m.etichetta).width + 14;
        if (!LBL.prova(s.x, s.y - rz*1.55, w, 20)) continue;
        targaMonumento(ctx, m.etichetta, s.x, s.y - rz*1.55);
      }
    }
  }
  // 3) luoghi geografici (monti, fiumi, golfi…)
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for (const l of luoghi){
    if (v.z < l.zMin) continue;
    const s = w2s(v, l.x, l.y);
    if (s.x<-20||s.y<-20||s.x>W+20||s.y>H+20) continue;
    const stl = STILE_LUOGO[l.tipo] || STILE_LUOGO.sito;
    ctx.font = stl.fs+"px Georgia";
    if (!LBL.prova(s.x, s.y, ctx.measureText(l.nome).width+10, stl.fs+4)) continue;
    etichettaLuogo(ctx, l, s.x, s.y, v.z);
  }
  // 4) targhette degli sponsor (dopo città e monumenti: non devono mai coprirli)
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for (const s of sponsorNomi){
    ctx.font = "bold 11px Georgia";
    const w = ctx.measureText(s.n).width + 12;
    if (!LBL.prova(s.x, s.y, w, 18)) continue;
    ctx.fillStyle = "rgba(24,18,10,0.85)"; ART.roundRect(ctx, s.x-w/2, s.y-8, w, 16, 5); ctx.fill();
    ctx.strokeStyle = s.col; ctx.lineWidth = 1.2; ART.roundRect(ctx, s.x-w/2, s.y-8, w, 16, 5); ctx.stroke();
    ctx.fillStyle = "#f4ead0"; ctx.fillText(s.n, s.x, s.y+0.5);
  }
  sponsorNomi.length = 0;
  // 5) nomi dei POI di contorno: solo se resta spazio (i pallini sono già disegnati sopra)
  if (v.z >= 14){
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.font = "10px Georgia";
    for (const p of poiNomi){
      if (!LBL.prova(p.x, p.y, ctx.measureText(p.n).width+8, 14)) continue;
      ctx.fillStyle = "rgba(20,15,8,0.55)"; ctx.fillText(p.n, p.x, p.y);
      ctx.fillStyle = "#e8dcc0"; ctx.fillText(p.n, p.x, p.y-0.6);
    }
  }
  poiNomi.length = 0;
}

// ---- VITA SULLA MAPPA (solo a zoom alto): barche, carretti, greggi, contadini, onde ----
// Tutto deterministico dalla posizione (nessuno stato da salvare): il moto viene dal tempo,
// così la scena è viva ma identica a ogni ricarica della partita.
// direzione del largo per un esagono costiero: media dei vicini che NON esistono (= mare).
// Calcolata una volta sola e memorizzata sull'esagono (niente stato da salvare).
function dirMare(h){
  if (h._mare !== undefined) return h._mare;
  let vx=0, vy=0;
  for (const [c,r] of vicinatiCR(h.col,h.row)){
    if (grid[c+","+r] !== undefined) continue;
    const p = hexCentro(c, r);
    vx += p.x - h.x; vy += p.y - h.y;
  }
  const len = Math.hypot(vx,vy);
  h._mare = len > 1e-6 ? { x:vx/len, y:vy/len } : null;
  return h._mare;
}

function vitaSullaMappa(ctx, v, st, rz, W, H){
  const t = performance.now()/1000;
  const dentro = (s) => s.x>-rz && s.y>-rz && s.x<W+rz && s.y<H+rz;
  ctx.save();
  // 1) onde lungo la costa
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = Math.max(1, rz*0.035); ctx.lineCap="round";
  for (const h of hexes){
    if (!h.costa) continue;
    const s = w2s(v, h.x, h.y); if (!dentro(s)) continue;
    for (let k=0;k<2;k++){
      const f = rngSeme(h.i*17+k*5);
      const on = ((t*0.6 + f) % 1);
      if (on > 0.55) continue;
      const a = f*6.283, rr = rz*(1.05 + on*0.25);
      const ox = s.x+Math.cos(a)*rr, oy = s.y+Math.sin(a)*rr;
      ctx.globalAlpha = (1 - on/0.55) * 0.5;
      ctx.beginPath(); ctx.arc(ox, oy, rz*0.16, 0.6, 2.5); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // 2) barche che vanno e vengono davanti ai porti (comuni costieri)
  //    rotta SEMPRE verso il largo: la direzione del mare è la media dei vicini mancanti.
  for (const cm of st ? st.comuni : []){
    const h = hexes[cm.hex];
    if (!h.costa || cm.pop < 4) continue;
    const s = w2s(v, h.x, h.y); if (!dentro(s)) continue;
    const m = dirMare(h); if (!m) continue;
    const n = cm.pop >= 12 ? 3 : (cm.pop >= 7 ? 2 : 1);
    for (let k=0;k<n;k++){
      const f = rngSeme(cm.id*31+k*11);
      const fase = (t*0.05 + f) % 1;                       // va e torna lungo una rotta
      const d = rz*(1.5 + 2.4*Math.abs(Math.sin(fase*Math.PI)));
      const lat = rz*(f-0.5)*1.6;                          // ventaglio di rotte
      const bx = s.x + m.x*d - m.y*lat, by = s.y + (m.y*d + m.x*lat)*0.7;
      const scafo = rz*0.16;
      ctx.fillStyle = "rgba(20,14,8,0.5)";
      ctx.beginPath(); ctx.ellipse(bx, by+scafo*0.5, scafo*1.1, scafo*0.35, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#6b4a28";
      ctx.beginPath(); ctx.moveTo(bx-scafo, by); ctx.quadraticCurveTo(bx, by+scafo*0.7, bx+scafo, by);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f2e6cd";                            // vela latina
      ctx.beginPath(); ctx.moveTo(bx, by-scafo*1.9); ctx.lineTo(bx+scafo*0.85, by-scafo*0.1); ctx.lineTo(bx-scafo*0.2, by-scafo*0.1); ctx.closePath(); ctx.fill();
    }
  }
  // 3) carretti che viaggiano sulle strade
  ctx.lineCap = "round";
  for (let i=0;i<strade.length;i++){
    const r = strade[i];
    const f = rngSeme(i*13);
    if (f > 0.45) continue;                                  // non su tutte: solo alcune trazzere
    const fase = ((t*0.03 + f*3) % 1);
    const p = fase < 0.5 ? fase*2 : (1-fase)*2;              // avanti e indietro
    const wx = r.ax + (r.bx-r.ax)*p, wy = r.ay + (r.by-r.ay)*p;
    const s = w2s(v, wx, wy); if (!dentro(s)) continue;
    const sc = rz*0.1;
    ctx.fillStyle = "rgba(20,14,8,0.4)";
    ctx.beginPath(); ctx.ellipse(s.x, s.y+sc*0.9, sc*1.4, sc*0.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#8a5a2a"; ctx.fillRect(s.x-sc, s.y-sc*0.6, sc*1.7, sc*0.9);   // cassa
    ctx.fillStyle = "#c9a227"; ctx.fillRect(s.x-sc, s.y-sc*0.6, sc*1.7, sc*0.25);  // telo giallo
    ctx.fillStyle = "#4a3320";
    ctx.beginPath(); ctx.arc(s.x-sc*0.6, s.y+sc*0.35, sc*0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x+sc*0.4, s.y+sc*0.35, sc*0.3, 0, 7); ctx.fill();
    ctx.fillStyle = "#d8cbb0";                                                       // mulo
    ctx.beginPath(); ctx.ellipse(s.x+sc*1.5, s.y-sc*0.1, sc*0.5, sc*0.3, 0, 0, 7); ctx.fill();
  }
  // 4) chi lavora la terra: greggi sui pascoli, contadini nei campi, vendemmia nei vigneti
  if (rz > 46){
    for (const h of hexes){
      if (!h.imp) continue;
      const s = w2s(v, h.x, h.y); if (!dentro(s)) continue;
      const imp = h.imp;
      const greggi = imp==="pascolo" || imp==="rifugio_pastori";
      const campi = imp==="campo" || imp==="fattoria" || imp==="orto" || imp==="manifattura_molini";
      const vigna = imp==="vigneto" || imp==="cantina" || imp==="vigna_vulcanica" || imp==="bottaia_export";
      if (!greggi && !campi && !vigna) continue;
      const n = greggi ? 5 : 3;
      for (let k=0;k<n;k++){
        const f1 = rngSeme(h.i*23+k*7), f2 = rngSeme(h.i*29+k*3);
        const ang = f1*6.283, rad = Math.sqrt(f2)*rz*0.55;
        const dx = s.x + Math.cos(ang)*rad, dy = s.y + Math.sin(ang)*rad;
        const vag = Math.sin(t*0.5 + f1*6.283) * rz*0.04;   // si spostano piano
        if (greggi){
          ctx.fillStyle = "#f0ece0";
          ctx.beginPath(); ctx.ellipse(dx+vag, dy, rz*0.045, rz*0.032, 0, 0, 7); ctx.fill();
          ctx.fillStyle = "#3a3028";
          ctx.beginPath(); ctx.arc(dx+vag+rz*0.04, dy-rz*0.012, rz*0.016, 0, 7); ctx.fill();
        } else {
          const chino = Math.sin(t*1.6 + k) > 0;             // si chinano a lavorare
          ctx.fillStyle = vigna ? "#7a4a8a" : "#c9b98a";
          ctx.fillRect(dx-rz*0.012, dy-rz*(chino?0.055:0.075), rz*0.024, rz*(chino?0.055:0.075));
          ctx.fillStyle = "#e8c9a0";
          ctx.beginPath(); ctx.arc(dx, dy-rz*(chino?0.065:0.085), rz*0.018, 0, 7); ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

// gestore anti-sovrapposizione delle etichette (box in coordinate schermo, un frame alla volta)
const LBL = (() => {
  let box = [];
  return {
    reset(){ box.length = 0; },
    occupa(cx, cy, w, h){ box.push({ x1:cx-w/2, y1:cy-h/2, x2:cx+w/2, y2:cy+h/2 }); },
    prova(cx, cy, w, h){
      const x1 = cx-w/2, y1 = cy-h/2, x2 = cx+w/2, y2 = cy+h/2;
      for (const b of box) if (x1 < b.x2 && x2 > b.x1 && y1 < b.y2 && y2 > b.y1) return false;
      box.push({ x1, y1, x2, y2 });
      return true;
    }
  };
})();
const poiNomi = [];       // nomi dei POI in attesa: disegnati per ultimi, se resta spazio
const sponsorNomi = [];   // idem per le targhette sponsor

// targhetta dorata con il nome del monumento-simbolo
function targaMonumento(ctx, testo, x, y){
  ctx.font = "600 11px Georgia";
  const w = ctx.measureText(testo).width + 14;
  ctx.save();
  ctx.fillStyle = "rgba(24,18,10,0.82)";
  ART.roundRect(ctx, x-w/2, y-9, w, 18, 5); ctx.fill();
  ctx.strokeStyle = "rgba(240,207,106,0.85)"; ctx.lineWidth = 1.2;
  ART.roundRect(ctx, x-w/2, y-9, w, 18, 5); ctx.stroke();
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle = "#f4ead0"; ctx.fillText(testo, x, y+0.5);
  ctx.restore();
}

const STILE_LUOGO = {
  catena: { col:"#4f3b26", it:false, sc:true,  fs:12, alpha:0.9,  ombra:"rgba(240,230,200,0.6)" },
  monte:  { col:"#4f3b26", it:false, sc:true,  fs:10, alpha:0.88, ombra:"rgba(240,230,200,0.6)" },
  piana:  { col:"#5f5026", it:true,  sc:true,  fs:11, alpha:0.85, ombra:"rgba(240,230,200,0.6)" },
  zona:   { col:"#6e4f26", it:true,  sc:true,  fs:12, alpha:0.82, ombra:"rgba(240,230,200,0.55)" },
  fiume:  { col:"#3f7fa8", it:true,  sc:false, fs:10, alpha:0.9,  ombra:"rgba(255,255,255,0.5)" },
  lago:   { col:"#3f7fa8", it:true,  sc:false, fs:10, alpha:0.9,  ombra:"rgba(255,255,255,0.5)" },
  cascata:{ col:"#2f7fa8", it:true,  sc:false, fs:10, alpha:0.9,  ombra:"rgba(255,255,255,0.5)" },
  golfo:  { col:"#2f6f90", it:true,  sc:false, fs:11, alpha:0.85, ombra:"rgba(255,255,255,0.4)" },
  stretto:{ col:"#2f6f90", it:true,  sc:false, fs:11, alpha:0.9,  ombra:"rgba(255,255,255,0.4)" },
  capo:   { col:"#2f6f90", it:true,  sc:false, fs:10, alpha:0.85, ombra:"rgba(255,255,255,0.4)" },
  sito:   { col:"#caa63c", it:false, sc:false, fs:11, alpha:0.95, ombra:"rgba(30,20,8,0.8)" },
};
function etichettaLuogo(ctx, l, x, y, z){
  const st = STILE_LUOGO[l.tipo] || STILE_LUOGO.sito;
  const fs = st.fs * (z>10 ? 1.1 : 1);
  const testo = st.sc ? l.nome.toUpperCase() : l.nome;
  ctx.globalAlpha = st.alpha;
  ctx.font = (st.it?"italic ":"") + fs + "px Georgia";
  ctx.lineWidth = 3; ctx.strokeStyle = st.ombra; ctx.lineJoin="round";
  if (l.tipo==="sito"){ ctx.textAlign="center"; ctx.fillStyle = st.col; ctx.font = fs+"px serif"; ctx.fillText("⛬", x, y - fs*1.0); ctx.font = fs + "px Georgia"; }
  if (st.sc){
    ctx.textAlign = "left";
    const sp = fs*0.14;
    let tot = -sp; for (const ch of testo) tot += ctx.measureText(ch).width + sp;
    let cx2 = x - tot/2;
    for (const ch of testo){ const w = ctx.measureText(ch).width; ctx.strokeText(ch, cx2, y); ctx.fillStyle = st.col; ctx.fillText(ch, cx2, y); cx2 += w + sp; }
    ctx.textAlign = "center";
  } else {
    ctx.textAlign = "center";
    ctx.strokeText(testo, x, y);
    ctx.fillStyle = st.col; ctx.fillText(testo, x, y);
  }
  ctx.globalAlpha = 1;
}

// freccia rossa d'attacco da (ox,oy) verso (tx,ty) + icona spade sul bersaglio
function frecciaAttacco(ctx, ox, oy, tx, ty, rz, puls){
  const ang = Math.atan2(ty-oy, tx-ox);
  const d = Math.hypot(tx-ox, ty-oy);
  const x0 = ox + Math.cos(ang)*rz*0.55, y0 = oy + Math.sin(ang)*rz*0.55;
  const x1 = tx - Math.cos(ang)*rz*0.7,  y1 = ty - Math.sin(ang)*rz*0.7;
  ctx.strokeStyle = "rgba(230,70,50,"+(0.6+puls*0.35)+")";
  ctx.lineWidth = Math.max(2, rz*0.16); ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
  // punta
  const ah = rz*0.4;
  ctx.fillStyle = "rgba(230,70,50,"+(0.7+puls*0.3)+")";
  ctx.beginPath();
  ctx.moveTo(x1 + Math.cos(ang)*ah, y1 + Math.sin(ang)*ah);
  ctx.lineTo(x1 + Math.cos(ang+2.5)*ah*0.7, y1 + Math.sin(ang+2.5)*ah*0.7);
  ctx.lineTo(x1 + Math.cos(ang-2.5)*ah*0.7, y1 + Math.sin(ang-2.5)*ah*0.7);
  ctx.closePath(); ctx.fill();
  // icona spade sul bersaglio
  ctx.font = "bold "+Math.floor(rz*0.85)+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillText("⚔", tx+1, ty-rz*0.75+1);
  ctx.fillStyle="#ffd9c0"; ctx.fillText("⚔", tx, ty-rz*0.75);
}

function etichetta(ctx, testo, x, y, fs, bold, fid, st){
  ctx.font = (bold?"bold ":"")+fs+"px Georgia";
  ctx.lineWidth = 3.8; ctx.strokeStyle = "rgba(10,7,4,0.92)"; ctx.lineJoin="round";
  ctx.strokeText(testo, x, y);
  ctx.fillStyle = "#fff3d6";
  ctx.fillText(testo, x, y);
  if (st && fid>=0 && fid<100){
    ctx.fillStyle = GDATA.FAZIONI[fid].colore;
    ctx.fillRect(x - ctx.measureText(testo).width/2 - 7, y-fs*0.4, 3.5, fs*0.8);
  }
}

// confini in stile atlante storico: un'ombra scura sotto (per staccare dal terreno) e
// una linea nitida del colore del regno sopra, un filo più spessa dove due regni veri si toccano
// (frontiera "calda") che dove un regno confina con terra indipendente non ancora rivendicata.
// Confine di regno: linea netta continua SOLO verso terra altrui (mai contro il mare: la costa
// è già un confine naturale) più un alone del colore del regno che sfuma verso l'interno, così
// il possesso si legge anche con il velo sul territorio quasi trasparente.
// I segmenti coprono l'intero lato dell'esagono e vengono uniti in polilinee: niente più trattini.
function latiConfine(v, st, rz, W, H){
  const per = {};   // colore -> lista di lati {a:{x,y}, b:{x,y}}
  for (const h of hexes){
    const own = st.comuni[h.comune].fazione;
    if (own===-1) continue;
    const s = w2s(v, h.x, h.y);
    if (s.x<-rz*2||s.y<-rz*2||s.x>W+rz*2||s.y>H+rz*2) continue;
    const dirs = vicinatiCR(h.col,h.row);
    for (let d=0; d<dirs.length; d++){
      const j = grid[dirs[d][0]+","+dirs[d][1]];
      if (j===undefined) continue;                       // mare / fuori mappa: nessuna linea
      const altro = st.comuni[hexes[j].comune].fazione;
      if (altro === own) continue;
      const nx = hexes[j];
      const dx = (nx.x-h.x), dy = (nx.y-h.y);
      const a2 = Math.atan2(dy, dx);
      // punto medio del lato condiviso (apotema = rz*0.866) e mezza corda = lato/2 = rz*0.5
      const mx = s.x + Math.cos(a2)*rz*0.866, my = s.y + Math.sin(a2)*rz*0.866;
      const px = -Math.sin(a2)*rz*0.5, py = Math.cos(a2)*rz*0.5;
      const col = coloreFazione(st, own);
      (per[col] = per[col] || []).push({ a:{x:mx-px, y:my-py}, b:{x:mx+px, y:my+py},
                                          n:{x:Math.cos(a2), y:Math.sin(a2)} });
    }
  }
  return per;
}
function disegnaConfini(ctx, v, st, rz, W, H){
  const per = latiConfine(v, st, rz, W, H);
  const spess = Math.max(1.6, rz*0.16);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const col of Object.keys(per)){
    const lati = per[col];
    // 1) alone verso l'interno del regno: banda sfumata che entra nel territorio
    ctx.save();
    const prof = rz*1.05;                       // quanto l'alone entra nel territorio
    for (const l of lati){
      const g = ctx.createLinearGradient(l.a.x - l.n.x*prof, l.a.y - l.n.y*prof, l.a.x, l.a.y);
      g.addColorStop(0, col+"00"); g.addColorStop(0.55, col+"3a"); g.addColorStop(1, col+"8c");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y);
      ctx.lineTo(l.b.x - l.n.x*prof, l.b.y - l.n.y*prof);
      ctx.lineTo(l.a.x - l.n.x*prof, l.a.y - l.n.y*prof);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // 2) ombra sottile + linea netta del colore del regno (un solo path: giunzioni pulite)
    ctx.beginPath();
    for (const l of lati){ ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y); }
    ctx.strokeStyle = "rgba(18,12,6,0.5)"; ctx.lineWidth = spess + Math.max(1.2, rz*0.05); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = spess; ctx.stroke();
  }
}

const GLYPH_TIPO = { lancia:"⚔", spada:"⚔", fuoco:"⚔", arco:"➹", cavallo:"♞", assedio:"⊙", eroe:"★",
                     esploratore:"◎", geniere:"⚒", medico:"✚", tamburino:"♪", colono:"⚑", lavoratore:"🔨" };
// a basso zoom i soldatini diventano un semplice segnalino: la forma (non solo il colore del
// regno) distingue almeno il ruolo, altrimenti ogni unità sembra identica alle altre
const FORMA_CAT = { arco:"diamante", cavallo:"triangolo", assedio:"quadrato", eroe:"stella",
  esploratore:"anello", tamburino:"anello", medico:"anello", geniere:"anello", colono:"anello", lavoratore:"anello" };
function disegnaSegnalino(ctx, cx, cy, r, forma){
  ctx.beginPath();
  if (forma==="diamante"){
    ctx.moveTo(cx,cy-r*1.15); ctx.lineTo(cx+r*1.15,cy); ctx.lineTo(cx,cy+r*1.15); ctx.lineTo(cx-r*1.15,cy); ctx.closePath();
  } else if (forma==="triangolo"){
    ctx.moveTo(cx,cy-r*1.2); ctx.lineTo(cx+r*1.05,cy+r*0.75); ctx.lineTo(cx-r*1.05,cy+r*0.75); ctx.closePath();
  } else if (forma==="quadrato"){
    ctx.rect(cx-r*0.95,cy-r*0.95,r*1.9,r*1.9);
  } else if (forma==="stella"){
    for (let k=0;k<5;k++){
      const a=-Math.PI/2+k*2*Math.PI/5, ax=cx+Math.cos(a)*r*1.2, ay=cy+Math.sin(a)*r*1.2;
      const a2=a+Math.PI/5, ax2=cx+Math.cos(a2)*r*0.48, ay2=cy+Math.sin(a2)*r*0.48;
      if (k===0) ctx.moveTo(ax,ay); else ctx.lineTo(ax,ay);
      ctx.lineTo(ax2,ay2);
    }
    ctx.closePath();
  } else {
    ctx.arc(cx,cy,r,0,7);   // cerchio: fanteria/assedi comici — il ruolo "di linea" più comune
  }
  ctx.fill(); ctx.stroke();
  if (forma==="anello"){ ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(cx,cy,r*0.4,0,7); ctx.fill(); }
}
function disegnaEsercito(ctx, v, rz, lista, st, sel){
  let ax=0, ay=0;
  for (const u of lista){ const p=FX.unitXY(u.id); ax+=p.x; ay+=p.y; }
  ax/=lista.length; ay/=lista.length;
  const s = w2s(v, ax, ay);
  const fid = lista[0].fazione;
  const col = coloreFazione(st, fid);
  const col2 = coloreFazione2(st, fid);
  const selezionata = sel && sel.unita && lista.some(u=>sel.unita.includes(u.id));
  const mioTurno = st && fid===st.giocatore;
  const puoMuovere = mioTurno && lista.some(u=>u.mov>0 && !u.fortificata && u.goto==null);
  const diGuardia  = mioTurno && lista.every(u=>u.fortificata);
  const mossa      = mioTurno && !puoMuovere && !diGuardia;
  const puls = 0.5 + 0.5*Math.sin(performance.now()*0.004);

  // pedana + anello di stato
  if (rz>6){
    if (puoMuovere){
      ctx.strokeStyle = "rgba(240,207,106,"+(0.4+puls*0.5)+")"; ctx.lineWidth = Math.max(1.5,rz*0.12);
      ctx.beginPath(); ctx.ellipse(s.x, s.y+rz*0.4, rz*0.92, rz*0.46, 0, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = selezionata ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.20)";
    ctx.beginPath(); ctx.ellipse(s.x, s.y+rz*0.4, rz*0.85, rz*0.42, 0, 0, 7); ctx.fill();
  }
  if (mossa) ctx.globalAlpha = 0.65;   // truppe già mosse: leggermente smorzate

  const n = Math.min(lista.length, 5);
  // soldatini più grandi, ma con crescita smorzata oltre rz 40: a zoom estremo un uomo alto
  // quanto una cattedrale rovina la scala della scena (resta comunque ben leggibile).
  const sSize = rz <= 40 ? rz*1.15 : 46 + (rz-40)*0.42;
  const cluster = [[0,-0.12],[-0.44,0.08],[0.44,0.08],[-0.22,0.30],[0.22,0.30]];
  const ordine = [1,2,0,3,4];
  for (const oi of ordine){
    if (oi>=n) continue;
    const u = lista[oi];
    const off = cluster[oi];
    const p = FX.unitXY(u.id);
    const sp = w2s(v, p.x, p.y);
    const cat = ART.categoriaUnita(u.tipo);
    if (rz < 6.5){
      ctx.fillStyle=col; ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=1;
      disegnaSegnalino(ctx, sp.x+off[0]*rz, sp.y+off[1]*rz, rz*0.34, FORMA_CAT[cat]);
    } else {
      const ud = GDATA.UNITA[u.tipo];
      // le milizie/condottieri indipendenti sono "senza tempo": esistono in ogni era e già scalano
      // nelle statistiche con l'era corrente (statU in game.js) — devono aggiornarsi anche nell'aspetto,
      // altrimenti restano vestiti da Greci del 735 a.C. anche nel 1700 d.C.
      const era = ud ? (ud.tipo==="militia"||ud.tipo==="hero" ? (st?st.era:ud.era) : ud.era) : 0;
      const speciale = ud && (ud.uu!==undefined || ud.tipo==="hero");
      const fase = u.id + (FX.unitMoving(u.id)?performance.now()*0.008:performance.now()*0.0018);
      const ux = sp.x+off[0]*rz*0.72, uy = sp.y+off[1]*rz+sSize*0.42;
      const idU = SPRITES.abilitato.unita ? idSpriteUnita(u.tipo) : null;
      if (idU && SPRITES.getFrame(idU)){
        const bob = Math.sin(fase)*sSize*0.035;
        const shg = ctx.createRadialGradient(ux+sSize*0.06, uy+sSize*0.05, 0, ux+sSize*0.06, uy+sSize*0.05, sSize*0.34);
        shg.addColorStop(0,"rgba(0,0,0,0.32)"); shg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=shg; ctx.beginPath(); ctx.ellipse(ux+sSize*0.06, uy+sSize*0.05, sSize*0.34, sSize*0.11, 0, 0, 7); ctx.fill();
        SPRITES.drawTintedFit(ctx, idU, ux, uy+bob, null, sSize*1.25, col, col2);
      } else {
        ART.soldato(ctx, ux, uy, sSize, cat, col, col2, fase, era, speciale);
      }
    }
  }
  ctx.globalAlpha = 1;

  // stendardo con simbolo del tipo
  if (rz > 6.5){
    const cat0 = ART.categoriaUnita(lista[0].tipo);
    const glyph = GLYPH_TIPO[cat0] || "⚔";
    const px = s.x - rz*0.15, top = s.y - rz*1.05, poleLen = rz*0.95;
    ctx.strokeStyle="#3a2f22"; ctx.lineWidth=Math.max(1,rz*0.06);
    ctx.beginPath(); ctx.moveTo(px, top+poleLen); ctx.lineTo(px, top); ctx.stroke();
    // pennone
    const pw = rz*0.7, ph = rz*0.52;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px+pw, top+ph*0.28);
    ctx.lineTo(px+pw*0.72, top+ph*0.55); ctx.lineTo(px+pw, top+ph*0.82);
    ctx.lineTo(px, top+ph); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
    // glifo
    ctx.fillStyle="#fff"; ctx.font="bold "+Math.floor(ph*0.7)+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(glyph, px+pw*0.44, top+ph*0.5);
    // pomo dorato
    ctx.fillStyle="#f0cf6a"; ctx.beginPath(); ctx.arc(px, top-rz*0.03, rz*0.09, 0, 7); ctx.fill();
    // scudo di guardia
    if (diGuardia){ ctx.font=Math.floor(rz*0.55)+"px serif"; ctx.fillText("🛡️", s.x+rz*0.7, s.y-rz*0.65); }
  }

  // conteggio
  if (lista.length>1){
    ctx.strokeStyle="rgba(0,0,0,0.7)"; ctx.lineWidth=1.2;
    ctx.font="bold "+Math.max(9,rz*0.42)+"px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    const bx=s.x+rz*0.78, by=s.y+rz*0.08;
    ctx.beginPath(); ctx.arc(bx,by,rz*0.32,0,7); ctx.fillStyle=col; ctx.fill(); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.fillText(lista.length, bx, by+0.5);
  }
  // galloni veterani (esperienza media)
  const xpMed = lista.reduce((t,u)=>t+(u.xp||0),0)/lista.length;
  const galloni = Math.min(3, Math.floor(xpMed/3));
  if (galloni>0 && rz>7){
    ctx.strokeStyle="#f0cf6a"; ctx.lineWidth=Math.max(1,rz*0.06);
    for (let g=0; g<galloni; g++){
      const gy = s.y+rz*0.5 + g*rz*0.14;
      ctx.beginPath(); ctx.moveTo(s.x-rz*0.14, gy); ctx.lineTo(s.x, gy+rz*0.1); ctx.lineTo(s.x+rz*0.14, gy); ctx.stroke();
    }
  }
  // barra vita media
  const hpMed = lista.reduce((t,u)=>t+u.hp,0)/lista.length;
  if (hpMed<100 && rz>6){
    ctx.fillStyle="#2a2018"; ctx.fillRect(s.x-rz*0.55, s.y-rz*0.72, rz*1.1, 3.5);
    ctx.fillStyle=hpMed>50?"#6fbf6f":"#e05540"; ctx.fillRect(s.x-rz*0.55, s.y-rz*0.72, rz*1.1*hpMed/100, 3.5);
  }
}

// ---- POI SPONSOR (prototipo) ----
const SP_R = 13;   // raggio del pin in px-schermo (dimensione costante col zoom)
function pinCentro(v, sp){ const s = w2s(v, sp.x, sp.y); return { x:s.x, y:s.y - SP_R*1.6, base:s.y }; }
function disegnaSponsor(ctx, v, st, rz){
  const W = window.innerWidth, H = window.innerHeight;
  const puls = 0.5 + 0.5*Math.sin(performance.now()*0.005);
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for (const sp of sponsor){
    if (st && st.nebbia && !GAME.hexEsplorato(sp.hex)) continue;
    const c = pinCentro(v, sp);
    if (c.x<-40 || c.x>W+40 || c.y<-40 || c.y>H+40) continue;
    // alone pulsante (richiama l'attenzione: è uno spazio pubblicitario)
    ctx.beginPath(); ctx.arc(c.x, c.y, SP_R+3+puls*3, 0, 7);
    ctx.fillStyle = "rgba(240,207,106,"+(0.14+puls*0.16)+")"; ctx.fill();
    // punta del segnaposto
    ctx.fillStyle = sp.colore;
    ctx.beginPath(); ctx.moveTo(c.x-4, c.y+SP_R*0.55); ctx.lineTo(c.x+4, c.y+SP_R*0.55); ctx.lineTo(c.x, c.base); ctx.closePath(); ctx.fill();
    // disco bianco bordato
    ctx.beginPath(); ctx.arc(c.x, c.y, SP_R, 0, 7); ctx.fillStyle="#fff"; ctx.fill();
    ctx.lineWidth=2.5; ctx.strokeStyle=sp.colore; ctx.stroke();
    // emoji categoria (segnaposto del logo)
    ctx.font = Math.floor(SP_R*1.2)+"px serif"; ctx.fillText(sp.cat, c.x, c.y+1);
    // etichetta nome: in coda al gestore etichette (cede il passo a città e monumenti)
    if (rz > 9) sponsorNomi.push({ n: sp.nome, x: c.x, y: c.y - SP_R - 13, col: sp.colore });
  }
}
// indice dello sponsor sotto (sx,sy) in px-schermo, oppure -1
function sponsorAt(v, sx, sy){
  if (R*v.z < 7) return -1;                 // pin visibili solo a zoom medio-alto
  for (let k=sponsor.length-1; k>=0; k--){
    const c = pinCentro(v, sponsor[k]);
    if (Math.hypot(sx-c.x, sy-c.y) < SP_R+6) return k;
  }
  return -1;
}

// ---- POI di contorno (nomi di fantasia, colore di mappa) ----
const POI_ZOOM = 10;   // visibili solo molto vicino (view.z)
function disegnaPOI(ctx, v, st, rz){
  if (v.z < POI_ZOOM) return;
  const W = window.innerWidth, H = window.innerHeight;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for (const p of poi){
    if (st && st.nebbia && !GAME.hexEsplorato(p.hex)) continue;
    const s = w2s(v, p.x, p.y);
    if (s.x<-20||s.x>W+20||s.y<-20||s.y>H+20) continue;
    // pallino neutro con emoji piccola (chiaramente diverso dai pin sponsor dorati)
    ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 7);
    ctx.fillStyle = "rgba(28,44,58,0.92)"; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(240,230,200,0.7)"; ctx.stroke();
    ctx.font = "10px serif"; ctx.fillStyle = "#fff"; ctx.fillText(p.c, s.x, s.y+0.5);
    // nome solo a zoom molto alto: in coda, lo disegna il gestore etichette se resta spazio
    if (v.z >= 14) poiNomi.push({ n: p.n, x: s.x, y: s.y-13 });
  }
}
function poiAt(v, sx, sy){
  if (v.z < POI_ZOOM) return -1;
  for (let k=poi.length-1; k>=0; k--){
    const s = w2s(v, poi[k].x, poi[k].y);
    if (Math.hypot(sx-s.x, sy-s.y) < 11) return k;
  }
  return -1;
}

const WORLD = { w: HEXW*COLS+8, h: ROWH*ROWS+8 };

// ---- MINIMAPPA ----
// bounding-box reale degli esagoni (isole incluse), calcolato una volta per partita
let mmBounds = null;
function calcolaBounds(){
  let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
  for (const h of hexes){ minx=Math.min(minx,h.x); miny=Math.min(miny,h.y); maxx=Math.max(maxx,h.x); maxy=Math.max(maxy,h.y); }
  mmBounds = { minx, miny, maxx, maxy };
}
// disegna la minimappa in un canvas mmW×mmH; mostra territori e riquadro-vista
function disegnaMinimappa(ctx, mmW, mmH, v, st){
  if (!mmBounds) calcolaBounds();
  const b = mmBounds, pad=5;
  const sc = Math.min((mmW-pad*2)/(b.maxx-b.minx), (mmH-pad*2)/(b.maxy-b.miny));
  const ox = pad + (mmW-pad*2-(b.maxx-b.minx)*sc)/2;
  const oy = pad + (mmH-pad*2-(b.maxy-b.miny)*sc)/2;
  const P = x => ox+(x-b.minx)*sc, Q = y => oy+(y-b.miny)*sc;
  ctx.clearRect(0,0,mmW,mmH);
  // mare di fondo
  ctx.fillStyle="rgba(18,40,55,0.85)"; ctx.fillRect(0,0,mmW,mmH);
  const dot = Math.max(1.4, sc*R*0.95);
  for (const h of hexes){
    const cm = st ? st.comuni[h.comune] : null;
    let col = "#b7a668"; // terra neutra
    if (h.terra==="secca") col = "#2f6f88";
    else if (cm && cm.fazione>=0 && cm.fazione<100) col = GDATA.FAZIONI[cm.fazione].colore;
    else if (cm && cm.fazione>=100) col = coloreFazione(st, cm.fazione);
    if (st && st.nebbia && !GAME.hexEsplorato(h.i)) col = "#28414f";
    ctx.fillStyle = col;
    ctx.fillRect(P(h.x)-dot/2, Q(h.y)-dot/2, dot, dot);
  }
  // riquadro della vista attuale
  const W = window.innerWidth, H = window.innerHeight;
  const w0 = s2w(v, 0, 0), w1 = s2w(v, W, H);
  ctx.strokeStyle="rgba(255,240,200,0.95)"; ctx.lineWidth=1.5;
  ctx.strokeRect(P(w0.x), Q(w0.y), (w1.x-w0.x)*sc, (w1.y-w0.y)*sc);
  return { ox, oy, sc, b };
}
// converte un punto-minimappa in coordinate-mondo (per il click)
function minimappaVersoMondo(mx, my, mmW, mmH){
  if (!mmBounds) calcolaBounds();
  const b = mmBounds, pad=5;
  const sc = Math.min((mmW-pad*2)/(b.maxx-b.minx), (mmH-pad*2)/(b.maxy-b.miny));
  const ox = pad + (mmW-pad*2-(b.maxx-b.minx)*sc)/2;
  const oy = pad + (mmH-pad*2-(b.maxy-b.miny)*sc)/2;
  return { x: b.minx + (mx-ox)/sc, y: b.miny + (my-oy)/sc };
}

return { build, vicini, distKm, hexAt, render, frame, invalidate, w2s, s2w, R, WORLD,
         disegnaMinimappa, minimappaVersoMondo, sponsorAt, poiAt,
         get hexes(){ return hexes; }, get comuniGeo(){ return comuni; }, get sponsor(){ return sponsor; }, get poi(){ return poi; },
         get monumenti(){ return monumenti; },
         get cacheStats(){ return { tiles: tiles.size, epoch, base: !!baseCanvas, baseEpoch,
           tileBytes: tiles.size*(TILE+PAD*2)*(TILE+PAD*2)*4,
           baseBytes: baseCanvas ? baseCanvas.width*baseCanvas.height*4 : 0 }; } };
})();
