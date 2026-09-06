// TRINACRIA — salvataggi su localStorage (autosave + 3 slot)
window.SAVE = (function(){
const PREF = "trinacria_";

// Desktop (Electron/Steam): i salvataggi vivono ANCHE su file, così Steam Cloud li sincronizza.
// All'avvio il file ripopola localStorage (senza sovrascrivere chiavi già presenti);
// a ogni salvataggio il file viene riallineato. Nel browser normale DESKTOP non esiste: no-op.
(function ripristinaDaFile(){
  if (!window.DESKTOP) return;
  try {
    const raw = window.DESKTOP.archivioLeggi();
    if (!raw) return;
    const tutto = JSON.parse(raw);
    for (const k of Object.keys(tutto)) if (!localStorage.getItem(k)) localStorage.setItem(k, tutto[k]);
  } catch(e){ console.warn("archivio desktop illeggibile", e); }
})();
function specchiaSuFile(){
  if (!window.DESKTOP) return;
  const tutto = {};
  for (let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if (k && k.indexOf(PREF)===0) tutto[k] = localStorage.getItem(k);
  }
  window.DESKTOP.archivioScrivi(JSON.stringify(tutto));
}

const VERSIONE = 3;
function fotografa(){
  const st = GAME.st;
  if (!st) return null;
  return {
    // v2 = mappa col mare navigabile. La mappa non viene serializzata ma RIGENERATA, e
    // posizioni di unita', citta' e migliorie sono riferimenti per INDICE di esagono:
    // dalla v1 alla v2 gli esagoni sono passati da ~10.400 a 40.356, quindi un salvataggio
    // vecchio caricherebbe tutto in posti sbagliati invece di dare errore. Meglio rifiutarlo.
    v: VERSIONE, quando: Date.now(),
    st: JSON.parse(JSON.stringify(st)),
    // v3: si salva anche il POSSESSO delle caselle (h.citta) e i quartieri (h.quart). Prima
    // no, e siccome la mappa viene rigenerata invece che serializzata, ricaricare una partita
    // azzerava tutti i territori senza dire nulla: le citta' restavano ma rendevano il minimo.
    imps: MAP.hexes.filter(h => h.imp || h.citta >= 0 || h.quart)
                   .map(h => ({ i:h.i, imp:h.imp||null, c:(h.citta===undefined?-1:h.citta), q:h.quart||null }))
  };
}
function salva(chiave){
  const s = fotografa();
  if (!s) return false;
  try { localStorage.setItem(PREF+chiave, JSON.stringify(s)); specchiaSuFile(); return true; }
  catch(e){ console.warn("Salvataggio fallito", e); return false; }
}
function autosalva(){ salva("auto"); }
function carica(chiave){
  const raw = localStorage.getItem(PREF+chiave);
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    if ((s.v||1) !== VERSIONE){
      GAME.aggiungiLog("Salvataggio di una versione precedente della mappa: non è più compatibile.", "male");
      return false;
    }
    MAP.build();                       // la mappa è deterministica
    GAME.resetIndiceTerritorio();      // il possesso delle caselle sta per essere riscritto
    for (const r of s.imps){
      const h = MAP.hexes[r.i];
      h.imp = r.imp || null;
      if (r.c !== undefined) h.citta = r.c;
      h.quart = r.q || null;
    }
    GAME.st = s.st;
    return true;
  } catch(e){ console.warn("Caricamento fallito", e); return false; }
}
function lista(){
  const out = [];
  for (const k of ["auto","slot1","slot2","slot3"]){
    const raw = localStorage.getItem(PREF+k);
    if (!raw) { out.push({ chiave:k, vuoto:true }); continue; }
    try {
      const s = JSON.parse(raw);
      const f = GDATA.FAZIONI[s.st.giocatore];
      if ((s.v||1) !== VERSIONE){
        out.push({ chiave:k, vuoto:false, obsoleto:true, quando:new Date(s.quando).toLocaleString("it-IT"),
                   info:"versione precedente della mappa — non caricabile" });
        continue;
      }
      out.push({ chiave:k, vuoto:false, quando:new Date(s.quando).toLocaleString("it-IT"),
        info: f.nome+" — turno "+s.st.turno+", "+(s.st.anno<0?Math.round(-s.st.anno)+" a.C.":Math.round(s.st.anno)+" d.C.") });
    } catch(e){ out.push({ chiave:k, vuoto:true }); }
  }
  return out;
}
return { salva, autosalva, carica, lista };
})();
