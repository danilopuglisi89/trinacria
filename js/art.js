// TRINACRIA — libreria di arte procedurale in stile mosaico siciliano
// Palette calda mediterranea, tessere musive, monumenti, soldatini, stemmi, ritratti.
window.ART = (function(){

// ---------- PALETTE ----------
const PAL = {
  oro:      "#d9a520", oroChiaro:"#f0cf6a", oroScuro:"#a87b12",
  mare:     "#1c5a7a", mareProf:"#123f57", mareChiaro:"#2f88a8", schiuma:"#cfe8ef",
  pietra:   "#d9cba8", pietraScura:"#b09a6f", tetto:"#b6552e", tettoScuro:"#8a3f20",
  grano:    "#d8b64a",
  skin:     "#d9a878", skinScuro:"#b07d4f",
  ferro:    "#8a929c", ferroScuro:"#5a626c", bronzo:"#b8823a",
  grout:    "#3a2f22", groutOro:"#7a5a1a",
  verde:    "#6b7f3a", verdeScuro:"#4c5c28",
};

// tonalità del terreno (mosaico): più tessere di colori vicini
const TERRENO = {
  plain:    { base:"#dcc363", tess:["#e6cd6c","#cbb154","#d8c169","#c2a34a","#eeda88"] },
  hill:     { base:"#a3813e", tess:["#b0904e","#8f7136","#bd9b5e","#7f6530","#a4813f"] },
  mountain: { base:"#75695a", tess:["#80735f","#665a49","#8c7f6a","#544a3d","#6e6252"] },
  forest:   { base:"#4a6b2c", tess:["#588036","#3d5a22","#679043","#33481c","#557530"] },
  volcano:  { base:"#382e2b", tess:["#443733","#2c2422","#4d3f39","#241d1b","#4a3a32"] },
  secca:    { base:"#2f86a8", tess:["#3b96b6","#256e8c","#48a3c4","#1f5d78","#55acc8"] },
};
function terrenoPalette(t){ return TERRENO[t] || TERRENO.plain; }

// rng deterministico
function rseed(n){ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); }

// ---------- TESSERA MUSIVA ----------
// riempie un esagono come mosaico; dettaglio scala con r (px)
function mosaicoHex(ctx, cx, cy, r, terra, idx, shade){
  const pal = terrenoPalette(terra);
  // fondo con hillshade
  ctx.fillStyle = mix(pal.base, shade<0?"#000":"#fff", Math.min(0.5,Math.abs(shade)));
  hexPath(ctx, cx, cy, r+0.6); ctx.fill();
  // contorno sottile: definisce ogni singola casella (visibile anche a zoom moderato)
  if (r >= 4){
    // doppia linea (chiara dentro, scura fuori): resta leggibile sia sul grano dorato
    // sia sulla roccia scura — vedi contornoCasella in map.js, stessa resa
    const w = Math.max(0.7, r*0.035);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,246,224,0.30)"; ctx.lineWidth = w;
    hexPath(ctx, cx, cy, r - w*0.55); ctx.stroke();
    ctx.strokeStyle = "rgba(24,16,8,0.62)";    ctx.lineWidth = w;
    hexPath(ctx, cx, cy, r+0.6); ctx.stroke();
  }
  if (r < 8) return; // troppo piccolo: fondo liscio
  // tessere (senza clip: leggero overflow accettabile in un mosaico) — più dense che in passato
  const n = r<16 ? 8 : (r<30 ? 14 : (r<45 ? 20 : 26));
  const g = r*0.78;
  for (let k=0;k<n;k++){
    const a = rseed(idx*31+k*7)*6.283;
    const rad = Math.sqrt(rseed(idx*13+k*5))*g;
    const tx = cx + Math.cos(a)*rad, ty = cy + Math.sin(a)*rad;
    const sz = r*(0.18+rseed(idx*17+k*3)*0.14);
    let col = pal.tess[Math.floor(rseed(idx*23+k*11)*pal.tess.length)];
    col = mix(col, shade<0?"#000":"#fff", Math.min(0.45,Math.abs(shade)*0.8));
    ctx.fillStyle = col;
    tessera(ctx, tx, ty, sz, rseed(idx*29+k));
  }
  if (r >= 20) decorazioniHex(ctx, cx, cy, r, terra, idx);
}
// piccoli elementi decorativi (alberi/casette/crepe di lava) visibili solo a zoom alto
function decorazioniHex(ctx, cx, cy, r, terra, idx){
  const n = terra==="forest" ? 5 : (terra==="plain" ? 3 : (terra==="volcano" ? 4 : (terra==="hill" ? 2 : 0)));
  for (let k=0;k<n;k++){
    const a = rseed(idx*41+k*9+3)*6.283;
    const rad = Math.sqrt(rseed(idx*19+k*7+3))*r*0.55;
    const dx = cx+Math.cos(a)*rad, dy = cy+Math.sin(a)*rad;
    if (terra==="forest" || (terra==="hill" && k===0)) alberello(dx, dy, r*0.22, ctx);
    else if (terra==="plain") casetta(dx, dy, r*0.16, ctx);
    else if (terra==="volcano") crepaLava(dx, dy, r*0.22, ctx);
  }
}
function alberello(x, y, s, ctx){
  ctx.fillStyle = "#3d5222";
  ctx.beginPath(); ctx.moveTo(x, y-s); ctx.lineTo(x-s*0.6,y+s*0.3); ctx.lineTo(x+s*0.6,y+s*0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a3d22"; ctx.fillRect(x-s*0.07, y+s*0.25, s*0.14, s*0.35);
}
function casetta(x, y, s, ctx){
  ctx.fillStyle = "#c9b98a"; ctx.fillRect(x-s*0.5, y-s*0.15, s, s*0.6);
  ctx.fillStyle = "#9a4b2e";
  ctx.beginPath(); ctx.moveTo(x-s*0.6,y-s*0.15); ctx.lineTo(x,y-s*0.6); ctx.lineTo(x+s*0.6,y-s*0.15); ctx.closePath(); ctx.fill();
}
function crepaLava(x, y, s, ctx){
  ctx.strokeStyle = "#e0592a"; ctx.lineWidth = Math.max(1,s*0.15);
  ctx.beginPath(); ctx.moveTo(x-s*0.5,y); ctx.lineTo(x,y+s*0.4); ctx.lineTo(x+s*0.5,y-s*0.3); ctx.stroke();
}
function tessera(ctx, x, y, s, r){
  ctx.save();
  ctx.translate(x,y); ctx.rotate((r-0.5)*0.6);
  ctx.beginPath();
  const w=s*(0.8+r*0.4), h=s*(0.7+ (1-r)*0.4);
  const rr = s*0.16;
  roundRect(ctx, -w/2, -h/2, w, h, rr);
  ctx.fill();
  ctx.restore();
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function hexPath(ctx, x, y, r){
  ctx.beginPath();
  for (let k=0;k<6;k++){
    const a = Math.PI/180*(60*k-30);
    const px = x + r*Math.cos(a), py = y + r*Math.sin(a);
    if (k===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath();
}

// ---------- COLORI: util ----------
function hexToRgb(h){
  // accetta sia "#rrggbb"/"#rgb" sia "rgb(r,g,b)" (così mix() è annidabile senza rompersi)
  if (h[0]==="r"){ const m = h.match(/\d+/g); return [ +m[0], +m[1], +m[2] ]; }
  h=h.replace('#','');
  if (h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function mix(a, b, t){
  const A=hexToRgb(a), B=hexToRgb(b);
  const r=Math.round(A[0]+(B[0]-A[0])*t), g=Math.round(A[1]+(B[1]-A[1])*t), bl=Math.round(A[2]+(B[2]-A[2])*t);
  return "rgb("+r+","+g+","+bl+")";
}

// ---------- STEMMI ARALDICI DELLE FAZIONI ----------
// carica araldica per fazione (fid): elefante, aquila, croce, delfino, tempio, falce, grano
const CRESTS = {
  0: { carica:"elefante", campo:"#c8382e", metallo:"#f0cf6a" }, // Catania
  1: { carica:"aquila",   campo:"#d9a520", metallo:"#7a1e14" }, // Palermo
  2: { carica:"croce",    campo:"#2e6da4", metallo:"#f0e8d0" }, // Messina
  3: { carica:"delfino",  campo:"#159587", metallo:"#f0e8d0" }, // Siracusa
  4: { carica:"tempio",   campo:"#8a4fa8", metallo:"#f0cf6a" }, // Agrigento
  5: { carica:"falce",    campo:"#cf6b1e", metallo:"#f0e8d0" }, // Trapani
  6: { carica:"grano",    campo:"#3d9142", metallo:"#f0cf6a" }, // Enna
};
function crestInfo(fid){ return CRESTS[fid] || CRESTS[0]; }

// disegna scudo araldico centrato in (x,y), altezza h
function stemma(ctx, x, y, h, fid){
  const c = crestInfo(fid);
  const w = h*0.82;
  ctx.save();
  ctx.translate(x,y);
  // ombra
  ctx.fillStyle="rgba(0,0,0,0.35)";
  scudoPath(ctx, w*1.03, h*1.03, 3); ctx.fill();
  // campo
  const g = ctx.createLinearGradient(0,-h/2,0,h/2);
  g.addColorStop(0, mix(c.campo,"#fff",0.18)); g.addColorStop(1, mix(c.campo,"#000",0.22));
  ctx.fillStyle = g;
  scudoPath(ctx, w, h, 0); ctx.fill();
  // bordo metallo
  ctx.lineWidth = h*0.05; ctx.strokeStyle = c.metallo; scudoPath(ctx, w, h, 0); ctx.stroke();
  // carica
  ctx.save();
  scudoPath(ctx, w, h, 0); ctx.clip();
  ctx.fillStyle = c.metallo; ctx.strokeStyle = c.metallo;
  disegnaCarica(ctx, c.carica, h*0.62);
  ctx.restore();
  ctx.restore();
}
function scudoPath(ctx, w, h, off){
  const x=-w/2-off/2, y=-h/2-off/2, W=w+off, H=h+off;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x+W, y);
  ctx.lineTo(x+W, y+H*0.55);
  ctx.quadraticCurveTo(x+W, y+H*0.85, x+W/2, y+H);
  ctx.quadraticCurveTo(x, y+H*0.85, x, y+H*0.55);
  ctx.closePath();
}
function disegnaCarica(ctx, tipo, s){
  ctx.lineWidth = s*0.09; ctx.lineJoin="round"; ctx.lineCap="round";
  switch(tipo){
    case "elefante": {
      // corpo
      ctx.beginPath(); ctx.ellipse(0, -s*0.02, s*0.34, s*0.24, 0, 0, 7); ctx.fill();
      // testa
      ctx.beginPath(); ctx.arc(-s*0.30, -s*0.05, s*0.17, 0, 7); ctx.fill();
      // proboscide
      ctx.beginPath(); ctx.moveTo(-s*0.42,-s*0.02);
      ctx.quadraticCurveTo(-s*0.55, s*0.12, -s*0.46, s*0.28); ctx.stroke();
      // zampe
      for (const dx of [-0.16,0.02,0.20]){ ctx.fillRect(dx*s, s*0.16, s*0.09, s*0.20); }
      // orecchio
      ctx.beginPath(); ctx.arc(-s*0.26, -s*0.05, s*0.10, 0, 7); ctx.fill();
      break;
    }
    case "aquila": {
      // corpo
      ctx.beginPath(); ctx.moveTo(0,-s*0.30);
      ctx.quadraticCurveTo(s*0.10,-s*0.10, 0, s*0.30);
      ctx.quadraticCurveTo(-s*0.10,-s*0.10, 0,-s*0.30); ctx.fill();
      // ali
      ctx.beginPath(); ctx.moveTo(0,-s*0.12);
      ctx.quadraticCurveTo(-s*0.42,-s*0.20,-s*0.44,s*0.10);
      ctx.quadraticCurveTo(-s*0.20,-s*0.02,0,s*0.06); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,-s*0.12);
      ctx.quadraticCurveTo(s*0.42,-s*0.20,s*0.44,s*0.10);
      ctx.quadraticCurveTo(s*0.20,-s*0.02,0,s*0.06); ctx.fill();
      // testa
      ctx.beginPath(); ctx.arc(0,-s*0.30,s*0.09,0,7); ctx.fill();
      break;
    }
    case "croce": {
      const t=s*0.16;
      ctx.fillRect(-t/2,-s*0.38,t,s*0.76);
      ctx.fillRect(-s*0.30,-t/2,s*0.60,t);
      break;
    }
    case "delfino": {
      ctx.beginPath();
      ctx.moveTo(-s*0.34,-s*0.05);
      ctx.quadraticCurveTo(-s*0.05,-s*0.42, s*0.30,-s*0.18);
      ctx.quadraticCurveTo(s*0.42,-s*0.10, s*0.40, s*0.02);
      ctx.quadraticCurveTo(s*0.20,-s*0.05, s*0.24, s*0.22);
      ctx.quadraticCurveTo(s*0.10, s*0.05, -s*0.05, s*0.14);
      ctx.quadraticCurveTo(-s*0.24, s*0.20, -s*0.34,-s*0.05);
      ctx.fill();
      break;
    }
    case "tempio": {
      // frontone
      ctx.beginPath(); ctx.moveTo(-s*0.42,-s*0.10); ctx.lineTo(0,-s*0.34); ctx.lineTo(s*0.42,-s*0.10); ctx.closePath(); ctx.fill();
      // architrave
      ctx.fillRect(-s*0.40,-s*0.10,s*0.80,s*0.07);
      // colonne
      for (const dx of [-0.30,-0.10,0.10,0.30]) ctx.fillRect(dx*s-s*0.03,-s*0.02,s*0.07,s*0.34);
      // base
      ctx.fillRect(-s*0.42,s*0.30,s*0.84,s*0.07);
      break;
    }
    case "falce": {
      ctx.lineWidth=s*0.13;
      ctx.beginPath(); ctx.arc(0,0,s*0.30,Math.PI*0.15,Math.PI*1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.05,s*0.28); ctx.lineTo(s*0.05,s*0.42); ctx.stroke();
      break;
    }
    case "grano": {
      // stelo
      ctx.lineWidth=s*0.06;
      for (const dx of [-0.14,0,0.14]){
        ctx.beginPath(); ctx.moveTo(dx*s,s*0.36); ctx.lineTo(dx*s*0.5,-s*0.10); ctx.stroke();
        // chicchi
        for (let i=0;i<5;i++){
          const yy=-s*0.10+i*s*0.09;
          ctx.beginPath(); ctx.ellipse(dx*s*0.5-s*0.06,yy,s*0.05,s*0.09,-0.5,0,7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(dx*s*0.5+s*0.06,yy,s*0.05,s*0.09,0.5,0,7); ctx.fill();
        }
      }
      break;
    }
  }
}

// ---------- MONUMENTI ----------
// tipo monumento per comune
const MONUMENTI_CITTA = {
  "Agrigento":"valle", "Siracusa":"teatro", "Selinunte":"tempio", "Segesta":"tempio",
  "Taormina":"teatro",
  "Palermo":"cattedrale", "Monreale":"duomo", "Catania":"cattedrale",
  "Cefalù":"duomo", "Messina":"campanile", "Noto":"barocca", "Ragusa":"barocca",
  "Modica":"barocca", "Scicli":"barocca", "Enna":"rocca", "Erice":"castello", "Caltabellotta":"castello",
  "Caccamo":"castello", "Sperlinga":"castello",
  "Piazza Armerina":"villa", "Mazara del Vallo":"moschea", "Marsala":"moschea",
  "Trapani":"faro", "Milazzo":"castello", "Sciacca":"faro",
  "Bagheria":"villa", "Termini Imerese":"duomo", "Corleone":"castello",
  "Petralia Sottana":"campanile", "Gangi":"campanile", "Castelbuono":"castello",
  "Salemi":"castello", "Alcamo":"castello", "Nicosia":"cattedrale",
  "Randazzo":"castello", "Aci Castello":"rocca", "Caltagirone":"barocca",
};
// città-simbolo con etichetta grande e ben visibile del monumento (icona + nome)
const ETICHETTA_MON = {
  "Agrigento":"⛩ Valle dei Templi", "Selinunte":"⛩ Templi di Selinunte", "Segesta":"⛩ Tempio di Segesta",
  "Siracusa":"🏛 Teatro Greco", "Taormina":"🏛 Teatro Antico",
  "Palermo":"⛪ Cattedrale", "Monreale":"⛪ Duomo di Monreale", "Cefalù":"⛪ Duomo di Cefalù",
  "Catania":"⛪ Duomo di Sant'Agata", "Messina":"🔔 Campanile del Duomo",
  "Noto":"⛪ Cattedrale di Noto", "Ragusa":"⛪ San Giorgio", "Modica":"⛪ San Giorgio",
  "Enna":"🏰 Castello di Lombardia", "Erice":"🏰 Castello di Venere", "Caccamo":"🏰 Castello",
  "Milazzo":"🏰 Castello", "Piazza Armerina":"🏺 Villa del Casale",
  "Trapani":"🗼 Faro", "Sciacca":"🗼 Faro",
  "Bagheria":"🏛 Villa Palagonia", "Termini Imerese":"⛪ Duomo", "Corleone":"🏰 Castello Soprano",
  "Petralia Sottana":"⛪ Chiesa Madre", "Gangi":"🗼 Torre dei Ventimiglia", "Castelbuono":"🏰 Castello dei Ventimiglia",
  "Salemi":"🏰 Castello Normanno-Svevo", "Alcamo":"🏰 Castello dei Conti", "Nicosia":"⛪ Cattedrale",
  "Randazzo":"🏰 Castello Svevo", "Aci Castello":"🏔 Castello Normanno", "Caltagirone":"🏛 Scalinata",
};
function monumentoTipo(cm){
  if (MONUMENTI_CITTA[cm.nome]) return MONUMENTI_CITTA[cm.nome];
  if (cm.cultura==="araba" && cm.tier>=3) return "moschea";
  return null; // borgo generico
}
// se il comune è una città-simbolo, ritorna {tipo, etichetta}; altrimenti null
function monumentoFamoso(cm){
  if (ETICHETTA_MON[cm.nome]) return { tipo: MONUMENTI_CITTA[cm.nome], etichetta: ETICHETTA_MON[cm.nome] };
  return null;
}

// disegna un borgo/città vista dall'alto a 3/4 (finto-3D). x,y = centro, r = raggio esagono px
// pop influenza dimensione, numero e altezza degli edifici, mura, monumento
function citta(ctx, x, y, r, cm, colFaz, colFaz2, hasCatt){
  const pop = Math.min(cm.pop, 22);
  const s = r*(0.40 + pop*0.020);           // scala degli edifici
  ctx.save();
  ctx.translate(x,y);
  // ombra generale del borgo
  ART3D.ombra(ctx, 0, s*0.55, s*(1.4+pop*0.03), s*0.9);
  // cinta muraria (dietro gli edifici)
  if (cm.mura>0){
    const mc = cm.muraHP>0 ? PAL.pietra : PAL.pietraScura;
    ART3D.cinta(ctx, 0, s*0.30, s*(1.35+pop*0.02), s*0.82, Math.max(2,r*0.14*(1+cm.mura*0.22)), mc);
  }
  // raccogli tutti gli edifici e ordina back-to-front (chi sta più in alto sullo schermo prima)
  const elems = [];
  const nCase = Math.min(11, 3+Math.floor(pop*0.55));
  for (let k=0;k<nCase;k++){
    const a = rseed(cm.id*7+k)*6.283;
    const rad = (0.32+rseed(cm.id*3+k)*0.72)*s;
    const hx = Math.cos(a)*rad, hy = Math.sin(a)*rad*0.60;
    const liv = pop>15 ? (k%3) : (pop>8 ? (k%2) : (k%2===0?0:1)*0);
    const col = (k%3===0) ? mix(PAL.pietra,"#c9b98a",0.5) : (k%4===0 ? mix(PAL.pietra,"#e6d8b0",0.4) : PAL.pietra);
    elems.push({ x:hx, yb:hy, s:s*(0.46+rseed(cm.id*5+k)*0.26), liv, col, tipo:"casa" });
  }
  // monumento centrale generico (il monumento famoso vero e proprio ora sorge fuori dal borgo,
  // su una casella separata del territorio — vedi "monumenti" in map.js — per non sovrapporsi alla città:
  // qui resta solo un edificio generico, mai l'icona specifica, per non duplicarla in due punti)
  const fam = monumentoFamoso(cm);
  const mon = fam ? null : monumentoTipo(cm);
  if (r>6 && (mon || hasCatt || cm.tier>=3 || fam)){
    elems.push({ x:0, yb:-s*0.02, s:s*1.05, tipo:"mon", mon: mon || (hasCatt?"cattedrale":"borgoGrande") });
  }
  elems.sort((a,b)=> a.yb - b.yb);
  for (const e of elems){
    if (e.tipo==="casa") ART3D.edificio(ctx, e.x, e.yb, e.s, e.liv, e.col);
    else ART3D.monumento(ctx, e.x, e.yb, e.s, e.mon);
  }
  // NB: lo stendardo che sventola e il fumo dei camini sono disegnati nel livello
  //     dinamico (map.renderDynamic), così restano animati e non "cotti" nella cache.
  ctx.restore();
}
// altezza (px) approssimata della cima del borgo, per posare l'asta della bandiera
function cittaAltezza(r, pop){ const s=r*(0.40+Math.min(pop,22)*0.020); return s*1.55; }
// stendardo animato che sventola su un'asta (livello dinamico)
function bandiera(ctx, x, y, r, colFaz, seed){
  const top = y - cittaAltezza(r, 12)*0.62 - r*0.2;
  const asta = r*0.95;
  ctx.strokeStyle="#3a2f22"; ctx.lineWidth=Math.max(1,r*0.05);
  ctx.beginPath(); ctx.moveTo(x, top+asta); ctx.lineTo(x, top); ctx.stroke();
  ctx.fillStyle="#f0cf6a"; ctx.beginPath(); ctx.arc(x, top-r*0.03, r*0.08, 0, 7); ctx.fill();
  const w0 = Math.sin(performance.now()*0.005 + (seed||0))*0.28;
  const fw = r*0.85, fh = r*0.55;
  ctx.fillStyle = colFaz;
  ctx.beginPath(); ctx.moveTo(x, top);
  ctx.quadraticCurveTo(x+fw*0.5, top+fh*0.18+w0*r, x+fw, top+fh*0.1);
  ctx.quadraticCurveTo(x+fw*0.5, top+fh*0.5-w0*r, x, top+fh*0.72);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.3)"; ctx.lineWidth=0.8; ctx.stroke();
}

// periferia: piccolo agglomerato satellite su un esagono vicino, per le città grandi
// che si espandono visivamente oltre il proprio esagono centrale
function periferia(ctx, x, y, r, seedId, idx, colFaz){
  const s = r*0.4;
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle="rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(s*0.08,s*0.4,s*0.9,s*0.4,0,0,7); ctx.fill();
  const nCase = 3;
  for (let k=0;k<nCase;k++){
    const a = rseed(seedId*11+idx*13+k*5)*6.283;
    const rad = (0.25+rseed(seedId*7+idx*3+k)*0.5)*s;
    const hx=Math.cos(a)*rad, hy=Math.sin(a)*rad*0.8;
    const cs = r*(0.12+rseed(seedId*5+idx*9+k)*0.06);
    ctx.fillStyle=PAL.pietra; ctx.fillRect(hx-cs/2,hy-cs/2,cs,cs);
    ctx.fillStyle = k%2===0?PAL.tettoScuro:PAL.tetto;
    ctx.beginPath(); ctx.moveTo(hx-cs*0.6,hy-cs*0.35); ctx.lineTo(hx,hy-cs*0.95); ctx.lineTo(hx+cs*0.6,hy-cs*0.35); ctx.closePath(); ctx.fill();
  }
  if (colFaz){
    ctx.globalAlpha=0.55; ctx.fillStyle=colFaz;
    ctx.beginPath(); ctx.arc(0, s*0.1, s*0.11, 0, 7); ctx.fill(); ctx.globalAlpha=1;
  }
  ctx.restore();
}

// disegna un singolo monumento riconoscibile, alto ~h, base a y
function monumento(ctx, x, y, h, tipo){
  ctx.save(); ctx.translate(x,y);
  const P=PAL.pietra, PS=PAL.pietraScura, T=PAL.tetto, O=PAL.oro;
  ctx.strokeStyle=PS; ctx.lineWidth=Math.max(0.6,h*0.03);
  switch(tipo){
    case "tempio": {
      ctx.fillStyle=P;
      ctx.beginPath(); ctx.moveTo(-h*0.55,-h*0.35); ctx.lineTo(0,-h*0.62); ctx.lineTo(h*0.55,-h*0.35); ctx.closePath(); ctx.fill();
      ctx.fillRect(-h*0.52,-h*0.35,h*1.04,h*0.10);
      for (const dx of [-0.40,-0.20,0,0.20,0.40]){ ctx.fillStyle=P; ctx.fillRect(dx*h-h*0.04,-h*0.25,h*0.08,h*0.55); ctx.fillStyle=PS; ctx.fillRect(dx*h-h*0.04,-h*0.25,h*0.02,h*0.55); }
      ctx.fillStyle=PS; ctx.fillRect(-h*0.55,h*0.28,h*1.10,h*0.08);
      break;
    }
    case "teatro": {
      ctx.fillStyle=PS;
      for (let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(0,h*0.35,h*(0.20+i*0.13),Math.PI,0); ctx.lineWidth=h*0.06; ctx.strokeStyle=i%2?P:PS; ctx.stroke(); }
      // arcate
      ctx.fillStyle=P; ctx.fillRect(-h*0.5,-h*0.05,h*1.0,h*0.12);
      break;
    }
    case "cattedrale": {
      // corpo
      ctx.fillStyle=P; ctx.fillRect(-h*0.42,-h*0.30,h*0.84,h*0.55);
      // tetto
      ctx.fillStyle=T; ctx.beginPath(); ctx.moveTo(-h*0.46,-h*0.30); ctx.lineTo(0,-h*0.52); ctx.lineTo(h*0.46,-h*0.30); ctx.closePath(); ctx.fill();
      // torri campanarie
      ctx.fillStyle=P; ctx.fillRect(-h*0.5,-h*0.5,h*0.16,h*0.75); ctx.fillRect(h*0.34,-h*0.5,h*0.16,h*0.75);
      ctx.fillStyle=T; ctx.beginPath(); ctx.moveTo(-h*0.52,-h*0.5); ctx.lineTo(-h*0.42,-h*0.66); ctx.lineTo(-h*0.32,-h*0.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(h*0.32,-h*0.5); ctx.lineTo(h*0.42,-h*0.66); ctx.lineTo(h*0.52,-h*0.5); ctx.closePath(); ctx.fill();
      // rosone
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(0,-h*0.12,h*0.09,0,7); ctx.fill();
      break;
    }
    case "barocca": {
      ctx.fillStyle=P; ctx.fillRect(-h*0.40,-h*0.28,h*0.80,h*0.52);
      // facciata curva
      ctx.beginPath(); ctx.moveTo(-h*0.42,-h*0.28); ctx.quadraticCurveTo(0,-h*0.58,h*0.42,-h*0.28); ctx.lineTo(h*0.42,-h*0.20); ctx.lineTo(-h*0.42,-h*0.20); ctx.closePath(); ctx.fill();
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(0,-h*0.05,h*0.07,0,7); ctx.fill();
      ctx.fillStyle=P; ctx.fillRect(-h*0.5,-h*0.44,h*0.12,h*0.68); ctx.fillRect(h*0.38,-h*0.44,h*0.12,h*0.68);
      break;
    }
    case "moschea": {
      // cupola
      ctx.fillStyle=mix("#2f88a8","#fff",0.1); ctx.beginPath(); ctx.arc(0,-h*0.10,h*0.28,Math.PI,0); ctx.fill();
      ctx.fillStyle=P; ctx.fillRect(-h*0.30,-h*0.10,h*0.60,h*0.35);
      // minareto
      ctx.fillStyle=P; ctx.fillRect(h*0.34,-h*0.55,h*0.12,h*0.80);
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(h*0.40,-h*0.55,h*0.09,Math.PI,0); ctx.fill();
      // pinnacolo
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(0,-h*0.38,h*0.05,0,7); ctx.fill();
      break;
    }
    case "campanile": {
      ctx.fillStyle=P; ctx.fillRect(-h*0.16,-h*0.55,h*0.32,h*0.80);
      ctx.fillStyle=T; ctx.beginPath(); ctx.moveTo(-h*0.20,-h*0.55); ctx.lineTo(0,-h*0.75); ctx.lineTo(h*0.20,-h*0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle=PS; ctx.fillRect(-h*0.08,-h*0.42,h*0.16,h*0.12); ctx.fillRect(-h*0.08,-h*0.20,h*0.16,h*0.12);
      break;
    }
    case "rocca": {
      // rupe
      ctx.fillStyle=PS; ctx.beginPath(); ctx.moveTo(-h*0.5,h*0.35); ctx.lineTo(-h*0.3,-h*0.05); ctx.lineTo(h*0.35,-h*0.02); ctx.lineTo(h*0.5,h*0.35); ctx.closePath(); ctx.fill();
      // castello
      ctx.fillStyle=P; ctx.fillRect(-h*0.28,-h*0.32,h*0.56,h*0.30);
      for (const dx of [-0.28,-0.10,0.10,0.24]) ctx.fillRect(dx*h,-h*0.42,h*0.10,h*0.12);
      break;
    }
    case "castello": {
      ctx.fillStyle=P; ctx.fillRect(-h*0.35,-h*0.30,h*0.70,h*0.55);
      for (const dx of [-0.35,-0.15,0.05,0.25]) ctx.fillRect(dx*h,-h*0.42,h*0.12,h*0.14);
      ctx.fillStyle=PS; ctx.fillRect(-h*0.08,-h*0.05,h*0.16,h*0.30); // portale
      break;
    }
    case "faro": {
      ctx.fillStyle=P; ctx.beginPath(); ctx.moveTo(-h*0.14,h*0.25); ctx.lineTo(-h*0.08,-h*0.45); ctx.lineTo(h*0.08,-h*0.45); ctx.lineTo(h*0.14,h*0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(0,-h*0.5,h*0.10,0,7); ctx.fill();
      ctx.strokeStyle=O; ctx.lineWidth=h*0.03;
      ctx.beginPath(); ctx.moveTo(h*0.10,-h*0.5); ctx.lineTo(h*0.4,-h*0.6); ctx.stroke();
      break;
    }
    case "villa": {
      ctx.fillStyle=P; ctx.fillRect(-h*0.45,-h*0.20,h*0.90,h*0.42);
      ctx.fillStyle=T; ctx.fillRect(-h*0.48,-h*0.26,h*0.96,h*0.08);
      for (const dx of [-0.35,-0.12,0.12,0.35]) { ctx.fillStyle=PS; ctx.fillRect(dx*h-h*0.03,-h*0.18,h*0.06,h*0.38); }
      break;
    }
    default: { // borgoGrande
      ctx.fillStyle=P; ctx.fillRect(-h*0.30,-h*0.22,h*0.60,h*0.42);
      ctx.fillStyle=T; ctx.beginPath(); ctx.moveTo(-h*0.34,-h*0.22); ctx.lineTo(0,-h*0.40); ctx.lineTo(h*0.34,-h*0.22); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- SOLDATINI ----------
// categoria visiva per tipo unità
function categoriaUnita(tipo){
  const u = GDATA.UNITA[tipo]; if (!u) return "spada";
  if (u.buffa) return u.buffa;   // unità comiche: catapulta arancini, bomba granita, brioche col tuppo
  if (u.supporto) return tipo;   // esploratore/tamburino/medico/geniere: glifo dedicato
  if (u.tipo==="siege") return "assedio";
  if (u.tipo==="hero") return "eroe";
  if (u.tipo==="cav") return "cavallo";
  if (u.tipo==="ranged") return "arco";
  // fanteria: distingue per era e ruolo (lancia/falange, spada, scimitarra, spadone, archibugio)
  if (tipo==="picchiere"||tipo==="oplita"||tipo==="oplita_sir"||tipo==="falangi_akr"||tipo==="skutato"||tipo==="guardia_rocca") return "lancia";
  if (u.tech==="polvere"||u.tech==="archibugi"||tipo==="archibugiere") return "fuoco";
  if (tipo==="fante_sar") return "scimitarra";
  if (tipo==="fante_giur") return "spadone";
  return "spada";
}

// disegna un soldatino alto ~s. cat=categoria, era=0..5 (aspetto storico), speciale=unità unica/eroe
function soldato(ctx, x, y, s, cat, col, col2, fase, era, speciale){
  era = era||0;
  ctx.save();
  ctx.translate(x,y);
  const bob = Math.sin(fase)*s*0.035;   // "respiro"
  ctx.translate(0, bob);
  // ombra a terra, morbida e spostata verso SE (coerente con la luce da NW del resto della mappa)
  const shg = ctx.createRadialGradient(s*0.06,s*0.05,0, s*0.06,s*0.05,s*0.34);
  shg.addColorStop(0,"rgba(0,0,0,0.32)"); shg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=shg;
  ctx.beginPath(); ctx.ellipse(s*0.06,s*0.05,s*0.34,s*0.11,0,0,7); ctx.fill();
  if (cat==="cavallo"){ cavallo(ctx,s,col,col2,era,speciale); ctx.restore(); return; }
  if (cat==="assedio"){ macchina(ctx,s,col,era); ctx.restore(); return; }
  if (cat==="arancini"){ catapultaArancini(ctx,s,col); ctx.restore(); return; }
  if (cat==="granita"){ bombaGranita(ctx,s,col); ctx.restore(); return; }
  if (cat==="brioche"){ briocheTuppo(ctx,s,col); ctx.restore(); return; }
  if (cat==="carretto"){ carrettoSiciliano(ctx,s,col); ctx.restore(); return; }
  const skin=PAL.skin, skinS=PAL.skinScuro, col2s=mix(col2,"#000",0.25), cols=mix(col,"#000",0.22);
  // scudo dietro il braccio (mano sinistra) per fanteria — non per chi impugna un'arma a due mani
  const conScudo = (cat==="lancia"||cat==="spada"||cat==="scimitarra");
  if (conScudo) scudoEra(ctx, s, era, col2, speciale, false);
  // gambe con calzari
  ctx.strokeStyle=skinS; ctx.lineWidth=s*0.10; ctx.lineCap="round";
  const step=Math.sin(fase*1.3)*s*0.05;
  ctx.beginPath(); ctx.moveTo(-s*0.07,-s*0.30); ctx.lineTo(-s*0.10+step,-s*0.01); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s*0.07,-s*0.30); ctx.lineTo(s*0.10-step,-s*0.01); ctx.stroke();
  ctx.strokeStyle=PAL.ferroScuro; ctx.lineWidth=s*0.06;
  ctx.beginPath(); ctx.moveTo(-s*0.10+step,-s*0.04); ctx.lineTo(-s*0.13+step,-s*0.01); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s*0.10-step,-s*0.04); ctx.lineTo(s*0.13-step,-s*0.01); ctx.stroke();
  // busto: tunica/armatura con ombreggiatura (proporzioni morbide, un po' "chibi")
  const g = ctx.createLinearGradient(-s*0.17,0,s*0.17,0);
  g.addColorStop(0, mix(col,"#fff",0.16)); g.addColorStop(1, cols);
  ctx.fillStyle=g;
  ctx.beginPath(); roundRect(ctx,-s*0.17,-s*0.60,s*0.34,s*0.33,s*0.13); ctx.fill();
  // bordo scuro netto: silhouette più leggibile e definita
  ctx.strokeStyle=mix(col2,"#000",0.4); ctx.lineWidth=s*0.028;
  ctx.beginPath(); roundRect(ctx,-s*0.17,-s*0.60,s*0.34,s*0.33,s*0.13); ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,0.32)"; ctx.lineWidth=s*0.012; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(-s*0.13,-s*0.56); ctx.lineTo(-s*0.13,-s*0.32); ctx.stroke();
  // spalline/armatura per epoche tarde
  if (era>=2){ ctx.fillStyle=PAL.ferro; ctx.beginPath(); ctx.ellipse(-s*0.15,-s*0.55,s*0.085,s*0.055,0,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(s*0.15,-s*0.55,s*0.085,s*0.055,0,0,7); ctx.fill(); }
  // cintura
  ctx.fillStyle=col2s; ctx.fillRect(-s*0.17,-s*0.36,s*0.34,s*0.055);
  ctx.fillStyle=PAL.oro; ctx.fillRect(-s*0.03,-s*0.36,s*0.06,s*0.055);
  // braccio destro (verso l'arma)
  ctx.strokeStyle=skin; ctx.lineWidth=s*0.08; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(s*0.12,-s*0.54); ctx.lineTo(s*0.21,-s*0.43); ctx.stroke();
  // collo + testa grande e tonda (proporzione "cute"), con occhietti e guance rosee
  ctx.fillStyle=skinS; ctx.fillRect(-s*0.05,-s*0.72,s*0.1,s*0.07);
  ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(0,-s*0.80,s*0.155,0,7); ctx.fill();
  ctx.fillStyle=skinS; ctx.globalAlpha=0.65; ctx.beginPath(); ctx.arc(s*0.045,-s*0.80,s*0.155,-0.55,0.85); ctx.fill(); ctx.globalAlpha=1; // ombra viso
  // riflesso di luce da NW (coerente con l'illuminazione del terreno): piccolo arco chiaro sulla fronte
  ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=s*0.02; ctx.lineCap="round";
  ctx.beginPath(); ctx.arc(-s*0.03,-s*0.80,s*0.135,-2.5,-1.7); ctx.stroke();
  // guance rosee (dimensione generosa: a piccoli zoom i dettagli sub-pixel sparirebbero)
  ctx.fillStyle="rgba(210,110,90,0.4)";
  ctx.beginPath(); ctx.arc(-s*0.08,-s*0.75,s*0.05,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.08,-s*0.75,s*0.05,0,7); ctx.fill();
  // occhietti
  ctx.fillStyle="#2a2018";
  ctx.beginPath(); ctx.arc(-s*0.058,-s*0.805,s*0.032,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.058,-s*0.805,s*0.032,0,7); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.9)";
  ctx.beginPath(); ctx.arc(-s*0.048,-s*0.815,s*0.012,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.068,-s*0.815,s*0.012,0,7); ctx.fill();
  // elmo per epoca — elmoEra() è tarata sulla vecchia testa (centro -0.76, raggio 0.115);
  // la nuova testa più "cute" è più grande (centro -0.80, raggio 0.155): riproiettiamo con una
  // trasformazione canvas invece di riscrivere ogni offset a mano.
  {
    const kHead = 0.155/0.115;
    ctx.save();
    ctx.translate(0, s*(0.76*kHead - 0.80));
    ctx.scale(kHead, kHead);
    elmoEra(ctx, s, era, speciale, col);
    ctx.restore();
  }
  // arma
  drawArma(ctx, cat, s, col, col2, era);
  // mantello per speciali
  if (speciale){
    ctx.fillStyle=mix(col,"#000",0.1);
    ctx.beginPath(); ctx.moveTo(-s*0.15,-s*0.62); ctx.quadraticCurveTo(-s*0.36,-s*0.28,-s*0.16,-s*0.0);
    ctx.lineTo(-s*0.04,-s*0.30); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// elmo secondo l'epoca
function elmoEra(ctx, s, era, speciale, col){
  const F=PAL.ferro, FS=PAL.ferroScuro, B=PAL.bronzo;
  ctx.fillStyle = era<=1 ? B : F;
  if (era===0){ // greco: calotta + cresta
    ctx.beginPath(); ctx.arc(0,-s*0.79,s*0.135,Math.PI,0); ctx.fill();
    ctx.fillRect(-s*0.135,-s*0.79,s*0.27,s*0.05);
    ctx.fillStyle="#b03028"; // cresta rossa
    ctx.beginPath(); ctx.moveTo(-s*0.02,-s*0.93); ctx.quadraticCurveTo(s*0.04,-s*1.04,s*0.16,-s*0.9); ctx.lineTo(s*0.02,-s*0.86); ctx.closePath(); ctx.fill();
  } else if (era===1){ // romano: galea + piccola cresta
    ctx.beginPath(); ctx.arc(0,-s*0.80,s*0.13,Math.PI,0); ctx.fill();
    ctx.fillRect(-s*0.13,-s*0.80,s*0.26,s*0.06);
    ctx.fillStyle=FS; ctx.fillRect(-s*0.13,-s*0.80,s*0.03,s*0.12); ctx.fillRect(s*0.10,-s*0.80,s*0.03,s*0.12);
    if (speciale){ ctx.fillStyle="#c03030"; ctx.fillRect(-s*0.02,-s*0.96,s*0.04,s*0.14); }
  } else if (era===2){ // bizantino: conico
    ctx.beginPath(); ctx.moveTo(-s*0.13,-s*0.78); ctx.lineTo(0,-s*0.98); ctx.lineTo(s*0.13,-s*0.78); ctx.closePath(); ctx.fill();
  } else if (era===3){ // arabo: elmo a punta + turbante
    ctx.fillStyle=mix(col,"#fff",0.3); ctx.beginPath(); ctx.arc(0,-s*0.78,s*0.14,Math.PI,0); ctx.fill();
    ctx.fillStyle=F; ctx.beginPath(); ctx.moveTo(-s*0.05,-s*0.86); ctx.lineTo(0,-s*1.0); ctx.lineTo(s*0.05,-s*0.86); ctx.closePath(); ctx.fill();
    ctx.fillStyle=PAL.oro; ctx.beginPath(); ctx.arc(0,-s*1.0,s*0.025,0,7); ctx.fill();
  } else if (era===4){ // normanno: nasale
    ctx.beginPath(); ctx.arc(0,-s*0.80,s*0.14,Math.PI,0.15); ctx.fill();
    ctx.fillStyle=FS; ctx.fillRect(-s*0.02,-s*0.80,s*0.04,s*0.16); // nasale
  } else { // aragonese: morione a tesa
    ctx.beginPath(); ctx.ellipse(0,-s*0.80,s*0.17,s*0.05,0,Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.arc(0,-s*0.82,s*0.11,Math.PI,0); ctx.fill();
    ctx.fillStyle=FS; ctx.beginPath(); ctx.moveTo(0,-s*0.93); ctx.lineTo(s*0.02,-s*0.82); ctx.lineTo(-s*0.02,-s*0.82); ctx.closePath(); ctx.fill();
    if (speciale){ ctx.fillStyle="#e8d050"; ctx.beginPath(); ctx.moveTo(-s*0.13,-s*0.83); ctx.quadraticCurveTo(-s*0.24,-s*0.98,-s*0.05,-s*0.92); ctx.closePath(); ctx.fill(); }
  }
  if (speciale){ ctx.strokeStyle=PAL.oro; ctx.lineWidth=s*0.02; ctx.beginPath(); ctx.arc(0,-s*0.80,s*0.135,Math.PI,0); ctx.stroke(); }
}
// scudo secondo l'epoca (dietro il braccio sinistro)
function scudoEra(ctx, s, era, col2, speciale, front){
  const cx=-s*0.20, cy=-s*0.44;
  ctx.save();
  const g=ctx.createRadialGradient(cx-s*0.04,cy-s*0.04,s*0.02,cx,cy,s*0.2);
  g.addColorStop(0, mix(col2,"#fff",0.25)); g.addColorStop(1, mix(col2,"#000",0.2));
  ctx.fillStyle=g; ctx.strokeStyle=PAL.oro; ctx.lineWidth=s*0.028;
  if (era===0){ ctx.beginPath(); ctx.arc(cx,cy,s*0.17,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle=PAL.oro; ctx.beginPath(); ctx.arc(cx,cy,s*0.045,0,7); ctx.fill(); }
  else if (era===1){ ctx.beginPath(); roundRect(ctx,cx-s*0.13,cy-s*0.18,s*0.26,s*0.36,s*0.04); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=PAL.oro; ctx.lineWidth=s*0.02; ctx.beginPath(); ctx.moveTo(cx,cy-s*0.16); ctx.lineTo(cx,cy+s*0.16); ctx.stroke(); }
  else if (era===2){ ctx.beginPath(); ctx.ellipse(cx,cy,s*0.14,s*0.18,0,0,7); ctx.fill(); ctx.stroke(); }
  else if (era===4){ // scudo a mandorla (kite)
    ctx.beginPath(); ctx.moveTo(cx,cy-s*0.19); ctx.quadraticCurveTo(cx+s*0.15,cy-s*0.1,cx+s*0.12,cy+s*0.05);
    ctx.quadraticCurveTo(cx+s*0.06,cy+s*0.2,cx,cy+s*0.24); ctx.quadraticCurveTo(cx-s*0.06,cy+s*0.2,cx-s*0.12,cy+s*0.05);
    ctx.quadraticCurveTo(cx-s*0.15,cy-s*0.1,cx,cy-s*0.19); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(cx,cy,s*0.14,0,7); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function drawArma(ctx, cat, s, col, col2, era){
  ctx.lineCap="round";
  if (cat==="lancia"){
    ctx.strokeStyle=PAL.bronzo; ctx.lineWidth=s*0.05;
    ctx.beginPath(); ctx.moveTo(s*0.18,-s*0.95); ctx.lineTo(s*0.24,-s*0.08); ctx.stroke();
    ctx.fillStyle=PAL.ferro; ctx.beginPath(); ctx.moveTo(s*0.18,-s*0.98); ctx.lineTo(s*0.11,-s*0.86); ctx.lineTo(s*0.25,-s*0.86); ctx.closePath(); ctx.fill();
  } else if (cat==="spada"){
    ctx.strokeStyle="#e8e4d8"; ctx.lineWidth=s*0.055;
    ctx.beginPath(); ctx.moveTo(s*0.20,-s*0.46); ctx.lineTo(s*0.34,-s*0.84); ctx.stroke();
    ctx.strokeStyle=PAL.bronzo; ctx.lineWidth=s*0.06;
    ctx.beginPath(); ctx.moveTo(s*0.14,-s*0.46); ctx.lineTo(s*0.26,-s*0.5); ctx.stroke(); // elsa
  } else if (cat==="scimitarra"){
    // lama curva araba, impugnata più bassa dell'elsa dritta della spada
    ctx.strokeStyle="#e8e4d8"; ctx.lineWidth=s*0.06;
    ctx.beginPath(); ctx.moveTo(s*0.18,-s*0.44); ctx.quadraticCurveTo(s*0.40,-s*0.62,s*0.30,-s*0.86); ctx.stroke();
    ctx.strokeStyle=PAL.oro; ctx.lineWidth=s*0.05;
    ctx.beginPath(); ctx.moveTo(s*0.12,-s*0.44); ctx.lineTo(s*0.24,-s*0.48); ctx.stroke(); // elsa
  } else if (cat==="spadone"){
    // lama lunga a due mani: niente scudo, presa più larga e centrale
    ctx.strokeStyle="#e8e4d8"; ctx.lineWidth=s*0.065;
    ctx.beginPath(); ctx.moveTo(s*0.06,-s*0.40); ctx.lineTo(s*0.10,-s*0.98); ctx.stroke();
    ctx.strokeStyle=PAL.ferroScuro; ctx.lineWidth=s*0.07;
    ctx.beginPath(); ctx.moveTo(-s*0.04,-s*0.60); ctx.lineTo(s*0.16,-s*0.56); ctx.stroke(); // guardia larga
    ctx.strokeStyle="#5a4326"; ctx.lineWidth=s*0.05;
    ctx.beginPath(); ctx.moveTo(s*0.02,-s*0.42); ctx.lineTo(s*0.10,-s*0.58); ctx.stroke(); // impugnatura
  } else if (cat==="arco"){
    ctx.strokeStyle=PAL.bronzo; ctx.lineWidth=s*0.05;
    ctx.beginPath(); ctx.arc(s*0.24,-s*0.45,s*0.24,-1.15,1.15); ctx.stroke();
    ctx.strokeStyle="#efe8d4"; ctx.lineWidth=s*0.022;
    ctx.beginPath(); ctx.moveTo(s*0.13,-s*0.66); ctx.lineTo(s*0.13,-s*0.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s*0.13,-s*0.45); ctx.lineTo(s*0.32,-s*0.45); ctx.stroke(); // freccia
  } else if (cat==="fuoco"){
    ctx.strokeStyle="#2e2416"; ctx.lineWidth=s*0.07;
    ctx.beginPath(); ctx.moveTo(-s*0.22,-s*0.36); ctx.lineTo(s*0.34,-s*0.54); ctx.stroke();
    ctx.fillStyle=PAL.ferroScuro; ctx.beginPath(); ctx.arc(s*0.34,-s*0.54,s*0.03,0,7); ctx.fill();
  } else if (cat==="eroe"){
    ctx.strokeStyle=PAL.oroScuro; ctx.lineWidth=s*0.05;
    ctx.beginPath(); ctx.moveTo(s*0.24,-s*0.98); ctx.lineTo(s*0.24,-s*0.04); ctx.stroke();
    ctx.fillStyle=PAL.oro; ctx.beginPath(); ctx.moveTo(s*0.24,-s*0.98); ctx.lineTo(s*0.56,-s*0.88); ctx.lineTo(s*0.24,-s*0.74); ctx.closePath(); ctx.fill();
  } else if (cat==="tamburino"){
    ctx.fillStyle="#8a5a2a"; ctx.beginPath(); ctx.ellipse(-s*0.02,-s*0.4,s*0.16,s*0.12,0,0,7); ctx.fill();
    ctx.fillStyle="#e8dfc8"; ctx.beginPath(); ctx.ellipse(-s*0.02,-s*0.4,s*0.16,s*0.06,0,0,7); ctx.fill();
  } else if (cat==="medico"){
    ctx.fillStyle="#d84040"; ctx.fillRect(-s*0.03,-s*0.55,s*0.06,s*0.18); ctx.fillRect(-s*0.09,-s*0.49,s*0.18,s*0.06);
  } else if (cat==="esploratore"){
    ctx.strokeStyle="#6a5030"; ctx.lineWidth=s*0.04; ctx.beginPath(); ctx.moveTo(s*0.2,-s*0.7); ctx.lineTo(s*0.24,-s*0.1); ctx.stroke();
  } else if (cat==="geniere"){
    ctx.strokeStyle="#5a4326"; ctx.lineWidth=s*0.05; ctx.beginPath(); ctx.moveTo(s*0.14,-s*0.3); ctx.lineTo(s*0.28,-s*0.62); ctx.stroke();
    ctx.fillStyle=PAL.ferro; ctx.fillRect(s*0.22,-s*0.68,s*0.14,s*0.08);
  } else if (cat==="colono"){
    // bastone da viandante + fagotto in spalla (nessun'arma: personaggio pacifico)
    ctx.strokeStyle="#6a5030"; ctx.lineWidth=s*0.045; ctx.beginPath(); ctx.moveTo(s*0.20,-s*0.72); ctx.lineTo(s*0.24,-s*0.08); ctx.stroke();
    ctx.fillStyle="#8a6a3a"; ctx.beginPath(); ctx.arc(-s*0.16,-s*0.60,s*0.10,0,7); ctx.fill();
    ctx.strokeStyle="#5a4326"; ctx.lineWidth=s*0.02; ctx.beginPath(); ctx.arc(-s*0.16,-s*0.60,s*0.10,0,7); ctx.stroke();
    ctx.strokeStyle="#3a2a1a"; ctx.lineWidth=s*0.018;
    ctx.beginPath(); ctx.moveTo(-s*0.10,-s*0.66); ctx.lineTo(-s*0.02,-s*0.56); ctx.stroke();
  } else if (cat==="lavoratore"){
    // zappa in spalla (nessun'arma: personaggio pacifico dedito ai campi)
    ctx.strokeStyle="#6a5030"; ctx.lineWidth=s*0.045; ctx.beginPath(); ctx.moveTo(s*0.10,-s*0.95); ctx.lineTo(s*0.28,-s*0.15); ctx.stroke();
    ctx.fillStyle=PAL.ferro; ctx.beginPath(); ctx.moveTo(s*0.02,-s*0.98); ctx.lineTo(s*0.20,-s*0.88); ctx.lineTo(s*0.10,-s*0.78); ctx.closePath(); ctx.fill();
  }
}
function cavallo(ctx,s,col,col2,era,speciale){
  // ombra
  ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,s*0.03,s*0.42,s*0.11,0,0,7); ctx.fill();
  const g=ctx.createLinearGradient(0,-s*0.3,0,0); g.addColorStop(0,"#7a5636"); g.addColorStop(1,"#5a3f26");
  ctx.fillStyle=g;
  ctx.beginPath(); ctx.ellipse(-s*0.02,-s*0.16,s*0.36,s*0.17,0,0,7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s*0.26,-s*0.24); ctx.quadraticCurveTo(s*0.5,-s*0.44,s*0.48,-s*0.2); ctx.lineTo(s*0.32,-s*0.08); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#3a2a1a"; ctx.beginPath(); ctx.moveTo(s*0.34,-s*0.4); ctx.quadraticCurveTo(s*0.2,-s*0.34,s*0.24,-s*0.16); ctx.lineTo(s*0.3,-s*0.2); ctx.closePath(); ctx.fill(); // criniera
  ctx.strokeStyle="#3a2a1a"; ctx.lineWidth=s*0.06; ctx.lineCap="round";
  for (const dx of [-0.26,-0.08,0.14,0.30]){ ctx.beginPath(); ctx.moveTo(dx*s,-s*0.08); ctx.lineTo(dx*s+(dx>0?s*0.02:-s*0.02),s*0.02); ctx.stroke(); }
  // gualdrappa fazione
  ctx.fillStyle=mix(col,"#000",0.1); ctx.beginPath(); roundRect(ctx,-s*0.24,-s*0.26,s*0.34,s*0.16,s*0.03); ctx.fill();
  ctx.fillStyle=PAL.oro; ctx.fillRect(-s*0.24,-s*0.12,s*0.34,s*0.02);
  // cavaliere
  ctx.save(); ctx.translate(-s*0.04,-s*0.24); ctx.scale(0.78,0.78);
  const skin=PAL.skin;
  ctx.fillStyle=col; ctx.beginPath(); roundRect(ctx,-s*0.14,-s*0.5,s*0.28,s*0.34,s*0.08); ctx.fill();
  ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(0,-s*0.6,s*0.11,0,7); ctx.fill();
  elmoEra(ctx, s, era, speciale, col);
  // lancia da cavaliere
  ctx.strokeStyle=PAL.bronzo; ctx.lineWidth=s*0.05; ctx.beginPath(); ctx.moveTo(-s*0.3,-s*0.1); ctx.lineTo(s*0.5,-s*0.5); ctx.stroke();
  ctx.fillStyle=PAL.ferro; ctx.beginPath(); ctx.moveTo(s*0.5,-s*0.5); ctx.lineTo(s*0.42,-s*0.42); ctx.lineTo(s*0.44,-s*0.54); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function macchina(ctx,s,col,era){
  ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,s*0.04,s*0.4,s*0.1,0,0,7); ctx.fill();
  if (era>=5){ // bombarda/cannone
    ctx.fillStyle="#3a3a40"; ctx.beginPath(); roundRect(ctx,-s*0.34,-s*0.34,s*0.62,s*0.18,s*0.06); ctx.fill();
    ctx.fillStyle="#55555c"; ctx.beginPath(); ctx.arc(s*0.28,-s*0.25,s*0.09,0,7); ctx.fill();
    ctx.fillStyle="#4a3320"; ctx.beginPath(); ctx.moveTo(-s*0.34,-s*0.16); ctx.lineTo(-s*0.12,-s*0.16); ctx.lineTo(-s*0.24,s*0.02); ctx.closePath(); ctx.fill();
  } else { // catapulta/trabucco
    ctx.fillStyle="#5a4326"; ctx.fillRect(-s*0.3,-s*0.18,s*0.6,s*0.12);
    ctx.strokeStyle="#4a3320"; ctx.lineWidth=s*0.06; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(-s*0.22,-s*0.18); ctx.lineTo(s*0.16,-s*0.56); ctx.stroke();
    ctx.fillStyle="#6a5030"; ctx.beginPath(); ctx.arc(s*0.16,-s*0.56,s*0.08,0,7); ctx.fill();
  }
  ctx.fillStyle="#2a2018";
  ctx.beginPath(); ctx.arc(-s*0.2,-s*0.02,s*0.1,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.16,-s*0.02,s*0.1,0,7); ctx.fill();
  ctx.fillStyle="#6a5a3a"; ctx.beginPath(); ctx.arc(-s*0.2,-s*0.02,s*0.04,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.16,-s*0.02,s*0.04,0,7); ctx.fill();
}

// ---------- UNITÀ COMICHE SICILIANE ----------
// Catapulta di Arancini: catapulta con un arancino dorato pronto a partire
function catapultaArancini(ctx, s, col){
  ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,s*0.04,s*0.42,s*0.1,0,0,7); ctx.fill();
  // telaio in legno
  ctx.fillStyle="#6a4a28"; ctx.fillRect(-s*0.32,-s*0.16,s*0.64,s*0.13);
  ctx.strokeStyle="#4a3320"; ctx.lineWidth=s*0.07; ctx.lineCap="round";
  // braccio
  ctx.beginPath(); ctx.moveTo(-s*0.24,-s*0.16); ctx.lineTo(s*0.14,-s*0.62); ctx.stroke();
  // cucchiaio con arancino
  const ax=s*0.14, ay=-s*0.62;
  ctx.fillStyle="#c9781f"; ctx.beginPath(); ctx.arc(ax,ay,s*0.11,0,7); ctx.fill(); // pastella
  ctx.fillStyle="#e69a34"; ctx.beginPath(); ctx.arc(ax-s*0.03,ay-s*0.03,s*0.05,0,7); ctx.fill(); // luce
  // briciole
  ctx.fillStyle="#f0b048"; for(let k=0;k<3;k++) ctx.fillRect(ax-s*0.1+k*s*0.08, ay+s*0.1, s*0.03, s*0.03);
  // ruote
  ctx.fillStyle="#2a2018";
  ctx.beginPath(); ctx.arc(-s*0.22,-s*0.02,s*0.1,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.18,-s*0.02,s*0.1,0,7); ctx.fill();
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(-s*0.22,-s*0.02,s*0.04,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.18,-s*0.02,s*0.04,0,7); ctx.fill();
}
// Bomba Granita: mortaio che spara palle di ghiaccio colorato
function bombaGranita(ctx, s, col){
  ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,s*0.04,s*0.36,s*0.09,0,0,7); ctx.fill();
  // mortaio inclinato
  ctx.save(); ctx.rotate(-0.5);
  const g=ctx.createLinearGradient(-s*0.1,0,s*0.1,0); g.addColorStop(0,"#3a3a44"); g.addColorStop(1,"#66707c");
  ctx.fillStyle=g; roundRect(ctx,-s*0.12,-s*0.5,s*0.24,s*0.5,s*0.05); ctx.fill();
  ctx.restore();
  // base a botte (di legno, come i carretti dei granitari)
  ctx.fillStyle="#7a4a24"; ctx.beginPath(); ctx.ellipse(0,-s*0.02,s*0.26,s*0.16,0,0,7); ctx.fill();
  ctx.strokeStyle="#5a3418"; ctx.lineWidth=s*0.03;
  ctx.beginPath(); ctx.ellipse(0,-s*0.02,s*0.26,s*0.16,0,0,7); ctx.stroke();
  // palla di granita che esce (limone/gelso)
  ctx.fillStyle="#7fd0e8"; ctx.beginPath(); ctx.arc(s*0.22,-s*0.5,s*0.1,0,7); ctx.fill();
  ctx.fillStyle="#c86fb0"; ctx.beginPath(); ctx.arc(s*0.26,-s*0.54,s*0.045,0,7); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(s*0.19,-s*0.53,s*0.03,0,7); ctx.fill();
  // cristalli
  ctx.strokeStyle="#bfe8f4"; ctx.lineWidth=s*0.02;
  for(let k=0;k<3;k++){ const a=k*2.1; ctx.beginPath(); ctx.moveTo(s*0.22,-s*0.5); ctx.lineTo(s*0.22+Math.cos(a)*s*0.16,-s*0.5+Math.sin(a)*s*0.16); ctx.stroke(); }
}
// Brioche col Tuppo esplosiva: una brioche gigante col tuppo, miccia accesa
function briocheTuppo(ctx, s, col){
  ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,s*0.02,s*0.34,s*0.09,0,0,7); ctx.fill();
  // corpo brioche
  const g=ctx.createRadialGradient(-s*0.1,-s*0.28,s*0.05,0,-s*0.2,s*0.4);
  g.addColorStop(0,"#f0c069"); g.addColorStop(1,"#c98a34");
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,-s*0.2,s*0.3,s*0.24,0,0,7); ctx.fill();
  // lucido
  ctx.fillStyle="rgba(255,240,200,0.4)"; ctx.beginPath(); ctx.ellipse(-s*0.1,-s*0.3,s*0.12,s*0.07,-0.5,0,7); ctx.fill();
  // tuppo (pallina in cima)
  ctx.fillStyle="#e0a84c"; ctx.beginPath(); ctx.arc(0,-s*0.46,s*0.13,0,7); ctx.fill();
  ctx.fillStyle="rgba(255,240,200,0.5)"; ctx.beginPath(); ctx.arc(-s*0.04,-s*0.5,s*0.05,0,7); ctx.fill();
  // miccia + scintilla
  ctx.strokeStyle="#3a2a1a"; ctx.lineWidth=s*0.03;
  ctx.beginPath(); ctx.moveTo(0,-s*0.58); ctx.quadraticCurveTo(s*0.1,-s*0.7,s*0.04,-s*0.78); ctx.stroke();
  const sp=0.5+0.5*Math.sin(performance.now()*0.02);
  ctx.fillStyle="#ff7a2a"; ctx.beginPath(); ctx.arc(s*0.04,-s*0.8,s*0.05*(0.7+sp*0.6),0,7); ctx.fill();
  ctx.fillStyle="#ffd060"; ctx.beginPath(); ctx.arc(s*0.04,-s*0.8,s*0.025,0,7); ctx.fill();
}
// Carretto Siciliano: carretto dipinto, veloce (cavalleria comica)
function carrettoSiciliano(ctx, s, col){
  ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0,s*0.04,s*0.44,s*0.1,0,0,7); ctx.fill();
  // cassa dipinta
  ctx.fillStyle=mix(col,"#f0c040",0.35); roundRect(ctx,-s*0.26,-s*0.4,s*0.5,s*0.32,s*0.04); ctx.fill();
  ctx.strokeStyle="#7a1e14"; ctx.lineWidth=s*0.03; roundRect(ctx,-s*0.26,-s*0.4,s*0.5,s*0.32,s*0.04); ctx.stroke();
  // decori a raggiera
  ctx.strokeStyle="#c8382e"; ctx.lineWidth=s*0.02;
  for(let k=0;k<4;k++){ const a=k*0.7-1; ctx.beginPath(); ctx.moveTo(-s*0.02,-s*0.24); ctx.lineTo(-s*0.02+Math.cos(a)*s*0.14,-s*0.24+Math.sin(a)*s*0.1); ctx.stroke(); }
  // ruota grande
  ctx.strokeStyle="#e0b040"; ctx.lineWidth=s*0.04;
  ctx.beginPath(); ctx.arc(-s*0.1,-s*0.02,s*0.15,0,7); ctx.stroke();
  ctx.fillStyle="#7a4a24"; ctx.beginPath(); ctx.arc(-s*0.1,-s*0.02,s*0.04,0,7); ctx.fill();
  for(let k=0;k<6;k++){ const a=k*1.047; ctx.beginPath(); ctx.moveTo(-s*0.1,-s*0.02); ctx.lineTo(-s*0.1+Math.cos(a)*s*0.15,-s*0.02+Math.sin(a)*s*0.15); ctx.stroke(); }
}

// ---------- RITRATTO ARALDICO DEL LEADER ----------
// disegna in un canvas: cornice + stemma + volto stilizzato
function ritratto(ctx, cx, cy, w, h, fid, tratto){
  const c = crestInfo(fid);
  ctx.save();
  ctx.translate(cx,cy);
  // fondo oro musivo
  const g = ctx.createRadialGradient(0,-h*0.1,h*0.1,0,0,h*0.7);
  g.addColorStop(0, PAL.oroChiaro); g.addColorStop(1, PAL.oroScuro);
  ctx.fillStyle=g; roundRect(ctx,-w/2,-h/2,w,h,w*0.06); ctx.fill();
  // tessere oro di sfondo
  ctx.save(); roundRect(ctx,-w/2,-h/2,w,h,w*0.06); ctx.clip();
  for (let k=0;k<80;k++){
    const tx=(rseed(fid*9+k)-0.5)*w, ty=(rseed(fid*4+k*3)-0.5)*h;
    ctx.fillStyle=mix(PAL.oro, rseed(k)>0.5?"#fff":"#000", rseed(k*2)*0.3);
    ctx.globalAlpha=0.5; tessera(ctx,tx,ty,w*0.05,rseed(k*5)); ctx.globalAlpha=1;
  }
  // figura: manto colore fazione
  ctx.fillStyle=c.campo;
  ctx.beginPath(); ctx.moveTo(-w*0.34,h*0.5); ctx.quadraticCurveTo(-w*0.30,h*0.02,0,-h*0.02);
  ctx.quadraticCurveTo(w*0.30,h*0.02,w*0.34,h*0.5); ctx.closePath(); ctx.fill();
  // colletto
  ctx.fillStyle=c.metallo; ctx.beginPath(); ctx.moveTo(-w*0.14,h*0.06); ctx.lineTo(0,h*0.22); ctx.lineTo(w*0.14,h*0.06); ctx.lineTo(0,h*0.12); ctx.closePath(); ctx.fill();
  // collo + volto
  ctx.fillStyle=PAL.skin; ctx.fillRect(-w*0.06,-h*0.06,w*0.12,h*0.16);
  ctx.beginPath(); ctx.arc(0,-h*0.14,w*0.15,0,7); ctx.fill();
  // barba
  ctx.fillStyle=mix(PAL.skinScuro,"#3a2a1a",0.4);
  ctx.beginPath(); ctx.arc(0,-h*0.09,w*0.13,0.2,Math.PI-0.2); ctx.fill();
  // occhi
  ctx.fillStyle="#2a2018"; ctx.beginPath(); ctx.arc(-w*0.05,-h*0.15,w*0.014,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.05,-h*0.15,w*0.014,0,7); ctx.fill();
  // corona
  ctx.fillStyle=PAL.oro; ctx.strokeStyle=PAL.oroScuro; ctx.lineWidth=w*0.01;
  ctx.beginPath();
  ctx.moveTo(-w*0.15,-h*0.24); ctx.lineTo(-w*0.15,-h*0.30); ctx.lineTo(-w*0.08,-h*0.25);
  ctx.lineTo(0,-h*0.32); ctx.lineTo(w*0.08,-h*0.25); ctx.lineTo(w*0.15,-h*0.30);
  ctx.lineTo(w*0.15,-h*0.24); ctx.closePath(); ctx.fill();
  for (const dx of [-0.15,0,0.15]){ ctx.fillStyle=c.campo; ctx.beginPath(); ctx.arc(dx*w,-h*0.30,w*0.018,0,7); ctx.fill(); ctx.fillStyle=PAL.oro; }
  ctx.restore();
  // cornice
  ctx.strokeStyle=PAL.oroScuro; ctx.lineWidth=w*0.045; roundRect(ctx,-w/2,-h/2,w,h,w*0.06); ctx.stroke();
  ctx.strokeStyle=PAL.oro; ctx.lineWidth=w*0.02; roundRect(ctx,-w/2+w*0.03,-h/2+w*0.03,w-w*0.06,h-w*0.06,w*0.05); ctx.stroke();
  // stemmino in basso
  stemma(ctx, 0, h*0.4, h*0.22, fid);
  ctx.restore();
}

// ---------- SILHOUETTE SICILIA (per anteprima territorio) ----------
// disegna la sagoma su un canvas w×h e evidenzia gli esagoni di una fazione
function siciliaMini(ctx, w, h, hexes, comuni, fidEvidenzia, coloreEv){
  // bounding
  let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
  for (const hx of hexes){ if (hx.mare) continue; minx=Math.min(minx,hx.x); miny=Math.min(miny,hx.y); maxx=Math.max(maxx,hx.x); maxy=Math.max(maxy,hx.y); }
  const pad=8; const sc=Math.min((w-pad*2)/(maxx-minx),(h-pad*2)/(maxy-miny));
  const ox=pad+(w-pad*2-(maxx-minx)*sc)/2, oy=pad+(h-pad*2-(maxy-miny)*sc)/2;
  const P=x=>ox+(x-minx)*sc, Q=y=>oy+(y-miny)*sc;
  for (const hx of hexes){
    if (hx.mare) continue;                 // il mare non appartiene a nessun comune
    const own = comuni[hx.comune].fazione;
    ctx.fillStyle = (own===fidEvidenzia) ? coloreEv : "#cdb96a";
    ctx.globalAlpha = (own===fidEvidenzia) ? 1 : 0.55;
    ctx.beginPath(); ctx.arc(P(hx.x),Q(hx.y),sc*2.1,0,7); ctx.fill();
  }
  ctx.globalAlpha=1;
}

// ---------- DON CALORIO (il consigliere) ----------
// vecchio saggio con coppola e barba bianca, in un canvas w×h
function consigliere(ctx, cx, cy, w, h){
  ctx.save();
  ctx.translate(cx, cy);
  // fondo tondo dorato musivo
  const g = ctx.createRadialGradient(0,-h*0.1,2,0,0,w*0.7);
  g.addColorStop(0, PAL.oroChiaro); g.addColorStop(1, PAL.oroScuro);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,w*0.5,0,7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,w*0.5,0,7); ctx.clip();
  // spalle/giacca marrone
  ctx.fillStyle="#5a4326";
  ctx.beginPath(); ctx.moveTo(-w*0.5,h*0.5); ctx.quadraticCurveTo(-w*0.4,h*0.12,0,h*0.1);
  ctx.quadraticCurveTo(w*0.4,h*0.12,w*0.5,h*0.5); ctx.closePath(); ctx.fill();
  // camicia
  ctx.fillStyle="#d8cbb0"; ctx.beginPath(); ctx.moveTo(-w*0.1,h*0.16); ctx.lineTo(0,h*0.34); ctx.lineTo(w*0.1,h*0.16); ctx.closePath(); ctx.fill();
  // collo
  ctx.fillStyle=PAL.skinScuro; ctx.fillRect(-w*0.09,-h*0.02,w*0.18,h*0.16);
  // volto
  ctx.fillStyle=mix(PAL.skin,"#c99a63",0.4);
  ctx.beginPath(); ctx.ellipse(0,-h*0.12,w*0.2,w*0.24,0,0,7); ctx.fill();
  // guance rosee
  ctx.fillStyle="rgba(200,110,80,0.3)";
  ctx.beginPath(); ctx.arc(-w*0.11,-h*0.08,w*0.05,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.11,-h*0.08,w*0.05,0,7); ctx.fill();
  // naso
  ctx.strokeStyle=PAL.skinScuro; ctx.lineWidth=w*0.02; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(0,-h*0.14); ctx.lineTo(w*0.02,-h*0.06); ctx.stroke();
  // occhi + sopracciglia folte
  ctx.fillStyle="#2a2018";
  ctx.beginPath(); ctx.arc(-w*0.08,-h*0.14,w*0.022,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.08,-h*0.14,w*0.022,0,7); ctx.fill();
  ctx.strokeStyle="#d8d0c0"; ctx.lineWidth=w*0.03;
  ctx.beginPath(); ctx.moveTo(-w*0.13,-h*0.19); ctx.lineTo(-w*0.03,-h*0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.03,-h*0.2); ctx.lineTo(w*0.13,-h*0.19); ctx.stroke();
  // barba e baffi bianchi
  ctx.fillStyle="#e8e2d4";
  ctx.beginPath();
  ctx.moveTo(-w*0.2,-h*0.09);
  ctx.quadraticCurveTo(-w*0.22,h*0.12,0,h*0.2);
  ctx.quadraticCurveTo(w*0.22,h*0.12,w*0.2,-h*0.09);
  ctx.quadraticCurveTo(w*0.1,h*0.02,0,-h*0.02);
  ctx.quadraticCurveTo(-w*0.1,h*0.02,-w*0.2,-h*0.09);
  ctx.fill();
  // coppola (flat cap)
  ctx.fillStyle="#6a5238";
  ctx.beginPath(); ctx.ellipse(0,-h*0.26,w*0.26,w*0.14,0,Math.PI,0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-w*0.02,-h*0.28,w*0.28,w*0.13,-0.15,Math.PI,0); ctx.fill();
  ctx.fillStyle="#59452f"; // visiera
  ctx.beginPath(); ctx.ellipse(w*0.12,-h*0.2,w*0.14,w*0.05,0.2,Math.PI,0); ctx.fill();
  ctx.restore();
  // bordo
  ctx.strokeStyle=PAL.oroScuro; ctx.lineWidth=w*0.05; ctx.beginPath(); ctx.arc(0,0,w*0.5,0,7); ctx.stroke();
  ctx.strokeStyle=PAL.oro; ctx.lineWidth=w*0.02; ctx.beginPath(); ctx.arc(0,0,w*0.47,0,7); ctx.stroke();
  ctx.restore();
}

// ---------- SOVRANO PERSONALIZZABILE ----------
// opzioni di personalizzazione (usate anche dalla UI per i selettori)
const OPZIONI_SOVRANO = {
  copricapo: ["Corona","Elmo","Turbante","Diadema","Corona d'alloro","Cappuccio","Nessuno"],
  barba:     ["Folta","Corta","Rasato","Lunga","Baffi"],
  capelli:   ["Neri","Castani","Biondi","Brizzolati","Rossi"],
  pelle:     ["Chiara","Olivastra","Ambrata","Scura"],
  veste:     ["Porpora","Blu","Verde","Viola","Ambra","Cremisi","Bianco"],
  manto:     ["Oro","Rosso","Blu notte","Verde bosco","Nero","Argento"]
};
const COL_CAPELLI = ["#2a2018","#5a3a1a","#d8b048","#9a958a","#8a3418"];
const COL_PELLE   = ["#e2b98f","#d9a878","#c99461","#a9784c"];
const COL_VESTE   = ["#7a1e14","#1d4a75","#2a6a3a","#5d3373","#b0902a","#a3382e","#e8e0cc"];
const COL_MANTO   = ["#d9a520","#a3382e","#1a2f52","#26512b","#26221c","#c8c8c8"];

function lookDefault(fid){
  // preset coerente con la civiltà iniziale della fazione
  const civ = (CRESTS[fid]||{}).campo ? fid : 0;
  const per = { 0:{c:4,b:0,v:0}, 1:{c:2,b:0,v:4}, 2:{c:5,b:1,v:1}, 3:{c:2,b:3,v:2}, 4:{c:0,b:1,v:1}, 5:{c:1,b:0,v:5}, 6:{c:3,b:0,v:2} }[fid] || {c:0,b:0,v:0};
  return { copricapo:per.c, barba:per.b, capelli:0, pelle:1, veste:per.v, manto:0 };
}

// disegna il ritratto del sovrano personalizzato in un riquadro w×h
// look = {copricapo,barba,capelli,pelle,veste,manto}; colFaz = colore araldico
function sovrano(ctx, cx, cy, w, h, look, fid){
  look = look || lookDefault(fid||0);
  const c = crestInfo(fid||0);
  const skin = COL_PELLE[look.pelle||0], skinS = mix(skin,"#000",0.28);
  const capCol = COL_CAPELLI[look.capelli||0];
  // capi sbloccati dal Guardaroba (se equipaggiati) sovrascrivono il colore base
  const extraVeste = look.vesteExtra && window.GDATA ? GDATA.GUARDAROBA_EXTRA.find(x=>x.id===look.vesteExtra) : null;
  const extraManto = look.mantoExtra && window.GDATA ? GDATA.GUARDAROBA_EXTRA.find(x=>x.id===look.mantoExtra) : null;
  const extraCop   = look.copricapoExtra && window.GDATA ? GDATA.GUARDAROBA_EXTRA.find(x=>x.id===look.copricapoExtra) : null;
  const vesteCol = extraVeste ? extraVeste.colore : COL_VESTE[look.veste||0], vesteS = mix(vesteCol,"#000",0.25);
  const mantoCol = extraManto ? extraManto.colore : COL_MANTO[look.manto||0];
  ctx.save();
  ctx.translate(cx,cy);
  // fondo oro musivo
  const g = ctx.createRadialGradient(0,-h*0.12,h*0.08,0,0,h*0.72);
  g.addColorStop(0, PAL.oroChiaro); g.addColorStop(1, PAL.oroScuro);
  ctx.fillStyle=g; roundRect(ctx,-w/2,-h/2,w,h,w*0.06); ctx.fill();
  ctx.save(); roundRect(ctx,-w/2,-h/2,w,h,w*0.06); ctx.clip();
  for (let k=0;k<90;k++){
    const tx=(rseed(fid*9+k)-0.5)*w, ty=(rseed(fid*4+k*3)-0.5)*h;
    ctx.fillStyle=mix(PAL.oro, rseed(k)>0.5?"#fff":"#000", rseed(k*2)*0.3);
    ctx.globalAlpha=0.45; tessera(ctx,tx,ty,w*0.05,rseed(k*5)); ctx.globalAlpha=1;
  }
  // mantello dietro le spalle
  ctx.fillStyle=mantoCol;
  ctx.beginPath(); ctx.moveTo(-w*0.42,h*0.5); ctx.quadraticCurveTo(-w*0.44,h*0.0,-w*0.24,-h*0.08);
  ctx.lineTo(w*0.24,-h*0.08); ctx.quadraticCurveTo(w*0.44,h*0.0,w*0.42,h*0.5); ctx.closePath(); ctx.fill();
  // veste
  const gv = ctx.createLinearGradient(-w*0.3,0,w*0.3,0);
  gv.addColorStop(0, mix(vesteCol,"#fff",0.1)); gv.addColorStop(1, vesteS);
  ctx.fillStyle=gv;
  ctx.beginPath(); ctx.moveTo(-w*0.32,h*0.5); ctx.quadraticCurveTo(-w*0.28,h*0.0,0,-h*0.02);
  ctx.quadraticCurveTo(w*0.28,h*0.0,w*0.32,h*0.5); ctx.closePath(); ctx.fill();
  // colletto araldico
  ctx.fillStyle=c.metallo; ctx.beginPath(); ctx.moveTo(-w*0.15,h*0.05); ctx.lineTo(0,h*0.24); ctx.lineTo(w*0.15,h*0.05); ctx.lineTo(0,h*0.11); ctx.closePath(); ctx.fill();
  // gioielli: collana (se veste scura o sempre un fermaglio)
  ctx.fillStyle=PAL.oro; ctx.beginPath(); ctx.arc(0,h*0.10,w*0.03,0,7); ctx.fill();
  ctx.fillStyle=c.campo; ctx.beginPath(); ctx.arc(0,h*0.10,w*0.014,0,7); ctx.fill();
  // collo + volto
  ctx.fillStyle=skinS; ctx.fillRect(-w*0.06,-h*0.055,w*0.12,h*0.15);
  ctx.fillStyle=skin; ctx.beginPath(); ctx.ellipse(0,-h*0.15,w*0.16,w*0.185,0,0,7); ctx.fill();
  // ombra guancia
  ctx.fillStyle=skinS; ctx.globalAlpha=0.4; ctx.beginPath(); ctx.arc(w*0.05,-h*0.15,w*0.16,-0.5,0.9); ctx.fill(); ctx.globalAlpha=1;
  // capelli (dietro, se non rasato completo)
  ctx.fillStyle=capCol;
  ctx.beginPath(); ctx.arc(0,-h*0.2,w*0.175,Math.PI,0); ctx.fill();
  ctx.fillRect(-w*0.175,-h*0.2,w*0.35,h*0.06);
  // orecchino (gioiello)
  ctx.fillStyle=PAL.oro; ctx.beginPath(); ctx.arc(-w*0.15,-h*0.12,w*0.014,0,7); ctx.fill();
  // occhi
  ctx.fillStyle="#2a2018";
  ctx.beginPath(); ctx.arc(-w*0.055,-h*0.16,w*0.016,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.055,-h*0.16,w*0.016,0,7); ctx.fill();
  // sopracciglia
  ctx.strokeStyle=capCol; ctx.lineWidth=w*0.016; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(-w*0.09,-h*0.19); ctx.lineTo(-w*0.02,-h*0.195); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.02,-h*0.195); ctx.lineTo(w*0.09,-h*0.19); ctx.stroke();
  // naso
  ctx.strokeStyle=skinS; ctx.lineWidth=w*0.017; ctx.beginPath(); ctx.moveTo(0,-h*0.16); ctx.lineTo(w*0.015,-h*0.09); ctx.stroke();
  // barba
  barbaSovrano(ctx, w, h, look.barba||0, capCol, skin);
  // copricapo
  copricapoSovrano(ctx, w, h, look.copricapo!==undefined?look.copricapo:0, c, extraCop?extraCop.colore:null);
  ctx.restore();
  // cornice
  ctx.strokeStyle=PAL.oroScuro; ctx.lineWidth=w*0.045; roundRect(ctx,-w/2,-h/2,w,h,w*0.06); ctx.stroke();
  ctx.strokeStyle=PAL.oro; ctx.lineWidth=w*0.02; roundRect(ctx,-w/2+w*0.03,-h/2+w*0.03,w-w*0.06,h-w*0.06,w*0.05); ctx.stroke();
  stemma(ctx, 0, h*0.42, h*0.2, fid||0);
  ctx.restore();
}
function barbaSovrano(ctx, w, h, tipo, col, skin){
  ctx.fillStyle=col;
  if (tipo===2) return; // rasato
  if (tipo===4){ // baffi
    ctx.lineWidth=w*0.02; ctx.strokeStyle=col; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(-w*0.06,-h*0.085); ctx.quadraticCurveTo(-w*0.02,-h*0.06,0,-h*0.075); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w*0.06,-h*0.085); ctx.quadraticCurveTo(w*0.02,-h*0.06,0,-h*0.075); ctx.stroke();
    return;
  }
  const lung = tipo===3 ? 0.22 : (tipo===1 ? 0.02 : 0.1); // lunga / corta / folta
  ctx.beginPath();
  ctx.moveTo(-w*0.16,-h*0.12);
  ctx.quadraticCurveTo(-w*0.18,h*(0.06+lung),0,h*(0.1+lung));
  ctx.quadraticCurveTo(w*0.18,h*(0.06+lung),w*0.16,-h*0.12);
  ctx.quadraticCurveTo(w*0.08,-h*0.05,0,-h*0.07);
  ctx.quadraticCurveTo(-w*0.08,-h*0.05,-w*0.16,-h*0.12);
  ctx.fill();
}
function copricapoSovrano(ctx, w, h, tipo, c, accent){
  const O=PAL.oro, OS=PAL.oroScuro, F=PAL.ferro, FS=PAL.ferroScuro;
  const acc = accent || c.campo; // colore-gemma: sostituibile da uno sblocco Guardaroba
  ctx.lineWidth=w*0.012; ctx.strokeStyle=OS;
  if (tipo===0){ // corona
    ctx.fillStyle=O;
    ctx.beginPath();
    ctx.moveTo(-w*0.19,-h*0.26); ctx.lineTo(-w*0.19,-h*0.34); ctx.lineTo(-w*0.1,-h*0.28);
    ctx.lineTo(0,-h*0.38); ctx.lineTo(w*0.1,-h*0.28); ctx.lineTo(w*0.19,-h*0.34);
    ctx.lineTo(w*0.19,-h*0.26); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const dx of [-0.19,0,0.19]){ ctx.fillStyle=acc; ctx.beginPath(); ctx.arc(dx*w,-h*0.335,w*0.02,0,7); ctx.fill(); }
    ctx.fillStyle=O; ctx.fillRect(-w*0.19,-h*0.27,w*0.38,h*0.03);
  } else if (tipo===1){ // elmo
    ctx.fillStyle=F; ctx.beginPath(); ctx.arc(0,-h*0.2,w*0.19,Math.PI,0.05); ctx.fill(); ctx.stroke();
    ctx.fillStyle=FS; ctx.fillRect(-w*0.02,-h*0.2,w*0.04,h*0.14); // nasale
    ctx.fillStyle=accent||"#b03028"; ctx.beginPath(); ctx.moveTo(-w*0.02,-h*0.4); ctx.quadraticCurveTo(w*0.06,-h*0.5,w*0.2,-h*0.36); ctx.lineTo(w*0.02,-h*0.3); ctx.closePath(); ctx.fill();
  } else if (tipo===2){ // turbante
    ctx.fillStyle=mix(c.metallo,"#fff",0.3);
    ctx.beginPath(); ctx.ellipse(0,-h*0.24,w*0.21,w*0.14,0,Math.PI,0); ctx.fill();
    ctx.strokeStyle=acc; ctx.lineWidth=w*0.03;
    ctx.beginPath(); ctx.ellipse(0,-h*0.24,w*0.19,w*0.11,0,Math.PI+0.3,-0.3); ctx.stroke();
    ctx.fillStyle=O; ctx.beginPath(); ctx.arc(0,-h*0.33,w*0.025,0,7); ctx.fill();
  } else if (tipo===3){ // diadema
    ctx.strokeStyle=O; ctx.lineWidth=w*0.035;
    ctx.beginPath(); ctx.arc(0,-h*0.2,w*0.18,Math.PI+0.5,-0.5); ctx.stroke();
    ctx.fillStyle=acc; ctx.beginPath(); ctx.arc(0,-h*0.31,w*0.025,0,7); ctx.fill();
  } else if (tipo===4){ // corona d'alloro
    ctx.strokeStyle="#4c7a2c"; ctx.lineWidth=w*0.02;
    for (let s=-1;s<=1;s+=2){
      ctx.beginPath(); ctx.arc(0,-h*0.16,w*0.2,s>0?-2.4:-0.75,s>0?-1.7:-0.4,s<0); ctx.stroke();
      for (let k=0;k<4;k++){ const a=(s>0?-2.3:-0.85)+k*0.18*s; ctx.fillStyle="#5c8a34"; ctx.beginPath(); ctx.ellipse(Math.cos(a)*w*0.2, -h*0.16+Math.sin(a)*w*0.2, w*0.03,w*0.014,a,0,7); ctx.fill(); }
    }
  } else if (tipo===5){ // cappuccio
    ctx.fillStyle=mix(acc,"#000",0.15);
    ctx.beginPath(); ctx.arc(0,-h*0.17,w*0.22,Math.PI,0); ctx.fill();
    ctx.fillRect(-w*0.22,-h*0.17,w*0.44,h*0.08);
  }
  // tipo 6 = nessuno
}

return { PAL, TERRENO, terrenoPalette, mosaicoHex, hexPath, mix, rseed, roundRect, tessera,
         crestInfo, stemma, monumento, monumentoTipo, monumentoFamoso, citta, bandiera, cittaAltezza,
         periferia, categoriaUnita, soldato,
         ritratto, siciliaMini, consigliere, sovrano, lookDefault, OPZIONI_SOVRANO };
})();
