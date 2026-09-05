// TRINACRIA — SPRITES: asset bitmap generati (AI) che affiancano l'arte procedurale di art.js.
// Manifest-driven: assets/sprites/manifest.json elenca atlanti e frame. Ogni categoria si accende
// con un flag in `abilitato`; se un frame manca, chi disegna ricade su ART.* (mai un errore).
// Convenzioni id frame:  terra_<tipo>_<var>, citta_<stile>_<tier>, mura_<tier>, mon_<tipo|idComune>,
//                        unita_<tipoUnita>, icona_<id>, stemma_<fid>, ritratto_<fid>, sov_<layer>
// Ogni frame può avere una variante "_hi" (LOD 256 px) accanto alla base (LOD 64 px).
window.SPRITES = (function(){

const abilitato = { terreno:false, citta:false, monumenti:false, unita:false, icone:false, ritratti:false, ui:false };
let manifest = null;
const atlanti = {};        // id -> { img: HTMLImageElement, pronto: bool, file }
const frames = {};         // id -> { atlas, x, y, w, h, ax, ay, group }
const tinte = new Map();   // "id|col|col2" -> canvas offscreen (LRU semplice, tetto TINTE_MAX)
const TINTE_MAX = 64;
let versione = "";         // ?v=N per il cache-busting del manifest

// ---- caricamento ----
function caricaImmagine(src){
  return new Promise((ok, ko) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ko(new Error("immagine non caricata: "+src));
    im.src = src;
  });
}

// init: legge il manifest e precarica i gruppi "subito"; gli altri gruppi si caricano quando
// servono (preloadGruppo) o in idle. onProgress(0..1) per la barra dell'intro.
async function init(opz){
  opz = opz || {};
  versione = opz.versione || "";
  const url = "assets/sprites/manifest.json" + (versione ? "?v="+versione : "");
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error("manifest "+r.status);
    manifest = await r.json();
  } catch(e){
    // niente asset AI: il gioco parte interamente procedurale
    manifest = null;
    if (opz.onProgress) opz.onProgress(1);
    return false;
  }
  for (const a of manifest.atlases) atlanti[a.id] = { img:null, pronto:false, file:a.file, group:a.group||"core" };
  for (const id of Object.keys(manifest.frames)) frames[id] = manifest.frames[id];
  const subito = (manifest.atlases||[]).filter(a => (a.group||"core")==="core" || (opz.gruppiSubito||[]).includes(a.group));
  let fatti = 0;
  await Promise.all(subito.map(a => caricaAtlante(a.id).then(() => {
    fatti++; if (opz.onProgress) opz.onProgress(fatti/Math.max(1,subito.length));
  }).catch(()=>{})));
  if (opz.onProgress) opz.onProgress(1);
  // flag: si accende solo se il manifest dichiara il gruppo (i frame esistono)
  const gruppi = new Set((manifest.atlases||[]).map(a => a.group||"core"));
  for (const k of Object.keys(abilitato)) abilitato[k] = gruppi.has(k) || gruppi.has("core") && k==="icone" && Object.keys(frames).some(f=>f.startsWith("icona_"));
  // gruppi non urgenti: in idle
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  idle(() => { for (const a of manifest.atlases) if (!atlanti[a.id].pronto) caricaAtlante(a.id).catch(()=>{}); });
  return true;
}
async function caricaAtlante(id){
  const a = atlanti[id];
  if (!a || a.pronto || a.caricando) return a && a.caricando;
  a.caricando = caricaImmagine("assets/sprites/"+a.file+(versione?"?v="+versione:"")).then(im => {
    a.img = im; a.pronto = true;
    // gli atlanti "cotti" nella cache-mondo arrivano anche a partita avviata: ricuoci una volta
    if (window.MAP && ["terreno","citta","monumenti","icone","core"].includes(a.group)) MAP.invalidate();
    return im;
  });
  return a.caricando;
}
function preloadGruppo(nome){
  if (!manifest) return Promise.resolve();
  return Promise.all(manifest.atlases.filter(a => (a.group||"core")===nome).map(a => caricaAtlante(a.id).catch(()=>{})));
}

// ---- interrogazione ----
// frame pronto da disegnare (atlante caricato), altrimenti null → il chiamante usa ART.*
function getFrame(id){
  const f = frames[id];
  if (!f) return null;
  const a = atlanti[f.atlas];
  if (!a || !a.pronto) return null;
  return f;
}
// sceglie la variante LOD in base alla dimensione a schermo richiesta (px)
function frameLOD(id, px){
  if (px > 80){ const hi = getFrame(id+"_hi"); if (hi) return hi; }
  return getFrame(id);
}
function ha(id){ return !!frames[id]; }

// ---- disegno ----
// disegna il frame centrato sull'ancora (ax, ay in frazioni 0..1 del frame) in un box w×h
function draw(ctx, id, x, y, w, h){
  const f = frameLOD(id, Math.max(w,h));
  if (!f) return false;
  const a = atlanti[f.atlas];
  const ax = f.ax===undefined ? 0.5 : f.ax, ay = f.ay===undefined ? 0.5 : f.ay;
  ctx.drawImage(a.img, f.x, f.y, f.w, f.h, x - w*ax, y - h*ay, w, h);
  return true;
}
// versione tinteggiata per fazione: il frame è generato in grigio neutro; col = tinta principale,
// col2 = tinta d'accento applicata sulla maschera "<id>_acc" se esiste nell'atlante.
function canvasTinta(f, col, col2){
  const chiave = f._id+"|"+col+"|"+(col2||"");
  let c = tinte.get(chiave);
  if (c){ tinte.delete(chiave); tinte.set(chiave, c); return c; }   // refresh LRU
  const a = atlanti[f.atlas];
  c = document.createElement("canvas"); c.width = f.w; c.height = f.h;
  const g = c.getContext("2d");
  g.drawImage(a.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  // maschera "<id>_m" (zone bianche = stoffe/scudi da colorare): tinta SOLO lì; senza maschera, tinta tutto
  const mk = getFrame(f._id+"_m");
  if (mk){
    const m = document.createElement("canvas"); m.width = f.w; m.height = f.h;
    const gm = m.getContext("2d");
    gm.drawImage(atlanti[mk.atlas].img, mk.x, mk.y, mk.w, mk.h, 0, 0, f.w, f.h);
    gm.globalCompositeOperation = "source-in"; gm.fillStyle = col; gm.fillRect(0,0,f.w,f.h);
    g.globalCompositeOperation = "multiply"; g.drawImage(m, 0, 0);
  } else {
    g.globalCompositeOperation = "multiply"; g.fillStyle = col; g.fillRect(0,0,f.w,f.h);
  }
  g.globalCompositeOperation = "destination-in"; g.drawImage(a.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const acc = col2 && getFrame(f._id+"_acc");
  if (acc){
    const m = document.createElement("canvas"); m.width = f.w; m.height = f.h;
    const gm = m.getContext("2d");
    gm.drawImage(atlanti[acc.atlas].img, acc.x, acc.y, acc.w, acc.h, 0, 0, f.w, f.h);
    gm.globalCompositeOperation = "source-in"; gm.fillStyle = col2; gm.fillRect(0,0,f.w,f.h);
    g.globalCompositeOperation = "multiply"; g.drawImage(m, 0, 0);
    g.globalCompositeOperation = "destination-in"; g.drawImage(a.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  }
  tinte.set(chiave, c);
  if (tinte.size > TINTE_MAX){ const primo = tinte.keys().next().value; tinte.delete(primo); }
  return c;
}
function drawTinted(ctx, id, x, y, w, h, col, col2){
  const f = frameLOD(id, Math.max(w,h));
  if (!f) return false;
  f._id = (f===frames[id+"_hi"]) ? id+"_hi" : id;
  const c = canvasTinta(f, col, col2);
  const ax = f.ax===undefined ? 0.5 : f.ax, ay = f.ay===undefined ? 0.5 : f.ay;
  ctx.drawImage(c, x - w*ax, y - h*ay, w, h);
  return true;
}
// rapporto larghezza/altezza del frame (per disegnare a misura mantenendo le proporzioni)
function aspetto(id){ const f = getFrame(id); return f ? f.w/f.h : 1; }
// come draw ma con w o h null → calcolato dalle proporzioni del frame
function drawFit(ctx, id, x, y, w, h){
  const f = frameLOD(id, Math.max(w||0, h||0)); if (!f) return false;
  if (w==null) w = h*f.w/f.h; if (h==null) h = w*f.h/f.w;
  return draw(ctx, id, x, y, w, h);
}
function drawTintedFit(ctx, id, x, y, w, h, col, col2){
  const f = frameLOD(id, Math.max(w||0, h||0)); if (!f) return false;
  if (w==null) w = h*f.w/f.h; if (h==null) h = w*f.h/f.w;
  return drawTinted(ctx, id, x, y, w, h, col, col2);
}
// disegno "grezzo" ancorato in alto a sinistra (texture di terreno ripetute nel mondo)
function drawTL(ctx, id, x, y, w, h){
  const f = frameLOD(id, Math.max(w,h)); if (!f) return false;
  ctx.drawImage(atlanti[f.atlas].img, f.x, f.y, f.w, f.h, x, y, w, h);
  return true;
}
// per l'HTML: src di un'icona singola (assets/icons/<id>.png) se esiste nel manifest, altrimenti null
function srcIcona(id){
  if (!manifest || !manifest.icons || !manifest.icons[id]) return null;
  return "assets/icons/"+manifest.icons[id]+(versione?"?v="+versione:"");
}
function svuotaTinte(){ tinte.clear(); }

return { init, preloadGruppo, getFrame, frameLOD, ha, aspetto, draw, drawFit, drawTL, drawTinted, drawTintedFit, srcIcona, svuotaTinte,
         abilitato, get manifest(){ return manifest; },
         get stats(){ return { atlanti: Object.keys(atlanti).length, pronti: Object.values(atlanti).filter(a=>a.pronto).length,
                               frames: Object.keys(frames).length, tinte: tinte.size }; } };
})();
