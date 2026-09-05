// TRINACRIA 2.0 — rendering "finto-3D" assonometrico su canvas 2D.
// Edifici, monumenti-simbolo e volumi con facce top/lato, ombre proiettate e luci.
// Vista dall'alto a 3/4: la profondità va verso l'alto-destra (luce da NW, ombra a SE).
window.ART3D = (function(){
const PAL = ART.PAL, mix = ART.mix, rseed = ART.rseed, roundRect = ART.roundRect;

// vettore di profondità (dal fronte verso il retro, in alto-destra) proporzionale alla scala
function dep(s){ return { x: s*0.42, y: -s*0.42 }; }

// ombra proiettata a terra (ellisse morbida spostata verso SE)
function ombra(ctx, x, yb, w, h){
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(x + w*0.14, yb + w*0.05, w*0.62 + h*0.18, w*0.30 + h*0.06, 0, 0, 7);
  ctx.fill();
  ctx.restore();
}

// scatola assonometrica: base centrata in (x,yb), larghezza w, profondità pf, altezza hgt.
// col = colore facciata; ritorna le coordinate delle 4 corde superiori-fronte per posarci un tetto.
function box(ctx, x, yb, w, pf, hgt, col){
  const half = w/2;
  const dx = pf*0.72, dy = -pf*0.72;               // offset retro (alto-destra)
  // corde
  const FBL=[x-half, yb],       FBR=[x+half, yb];
  const FTL=[x-half, yb-hgt],   FTR=[x+half, yb-hgt];
  const BTL=[FTL[0]+dx, FTL[1]+dy], BTR=[FTR[0]+dx, FTR[1]+dy];
  const BBR=[FBR[0]+dx, FBR[1]+dy];
  const colTop  = mix(col, "#ffffff", 0.30);
  const colSide = mix(col, "#000000", 0.28);
  // faccia destra (retro-destra)
  ctx.fillStyle = colSide;
  ctx.beginPath(); ctx.moveTo(FBR[0],FBR[1]); ctx.lineTo(BBR[0],BBR[1]); ctx.lineTo(BTR[0],BTR[1]); ctx.lineTo(FTR[0],FTR[1]); ctx.closePath(); ctx.fill();
  // faccia frontale
  const g = ctx.createLinearGradient(0, yb-hgt, 0, yb);
  g.addColorStop(0, mix(col,"#fff",0.10)); g.addColorStop(1, mix(col,"#000",0.06));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(FBL[0],FBL[1]); ctx.lineTo(FBR[0],FBR[1]); ctx.lineTo(FTR[0],FTR[1]); ctx.lineTo(FTL[0],FTL[1]); ctx.closePath(); ctx.fill();
  // spigolo di luce
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = Math.max(0.4, w*0.02);
  ctx.beginPath(); ctx.moveTo(FTL[0],FTL[1]); ctx.lineTo(FTR[0],FTR[1]); ctx.stroke();
  // faccia superiore
  ctx.fillStyle = colTop;
  ctx.beginPath(); ctx.moveTo(FTL[0],FTL[1]); ctx.lineTo(FTR[0],FTR[1]); ctx.lineTo(BTR[0],BTR[1]); ctx.lineTo(BTL[0],BTL[1]); ctx.closePath(); ctx.fill();
  return { FTL, FTR, BTL, BTR, dx, dy, half };
}

// tetto a due falde (gable) sopra la faccia superiore di una box
function tettoGable(ctx, top, rh, col){
  const { FTL, FTR, BTL, BTR } = top;
  const ridgeL = [(FTL[0]+BTL[0])/2, (FTL[1]+BTL[1])/2 - rh];
  const ridgeR = [(FTR[0]+BTR[0])/2, (FTR[1]+BTR[1])/2 - rh];
  const cS = mix(col,"#000",0.22), cF = col;
  // falda destra (in ombra)
  ctx.fillStyle = cS;
  ctx.beginPath(); ctx.moveTo(FTR[0],FTR[1]); ctx.lineTo(BTR[0],BTR[1]); ctx.lineTo(ridgeR[0],ridgeR[1]); ctx.lineTo(ridgeL[0],ridgeL[1]); ctx.closePath(); ctx.fill();
  // falda frontale (illuminata)
  ctx.fillStyle = mix(cF,"#fff",0.12);
  ctx.beginPath(); ctx.moveTo(FTL[0],FTL[1]); ctx.lineTo(FTR[0],FTR[1]); ctx.lineTo(ridgeR[0],ridgeR[1]); ctx.lineTo(ridgeL[0],ridgeL[1]); ctx.closePath(); ctx.fill();
  // timpano
  ctx.fillStyle = mix(cF,"#000",0.1);
  ctx.beginPath(); ctx.moveTo(FTL[0],FTL[1]); ctx.lineTo(ridgeL[0],ridgeL[1]); ctx.lineTo(BTL[0],BTL[1]); ctx.closePath(); ctx.fill();
  return { ridgeL, ridgeR };
}

// cupola emisferica (moschea/duomo)
function cupola(ctx, x, y, r, col){
  const g = ctx.createRadialGradient(x-r*0.35, y-r*0.35, r*0.1, x, y, r*1.1);
  g.addColorStop(0, mix(col,"#fff",0.5)); g.addColorStop(1, mix(col,"#000",0.2));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, r, r*0.28, 0, 0, Math.PI); ctx.fill();
}

// colonna 3D (tempio)
function colonna(ctx, x, yb, h, r, col){
  const cS = mix(col,"#000",0.22);
  ctx.fillStyle = cS; ctx.fillRect(x-r, yb-h, r*2, h);
  const g = ctx.createLinearGradient(x-r,0,x+r,0);
  g.addColorStop(0, mix(col,"#fff",0.25)); g.addColorStop(0.5, col); g.addColorStop(1, cS);
  ctx.fillStyle = g; ctx.fillRect(x-r, yb-h, r*1.4, h);
  // capitello e base
  ctx.fillStyle = mix(col,"#fff",0.2); ctx.fillRect(x-r*1.25, yb-h, r*2.5, h*0.08);
  ctx.fillRect(x-r*1.25, yb-h*0.06, r*2.5, h*0.06);
}

// ---------- EDIFICIO GENERICO EVOLUTIVO ----------
// livello 0..4 (capanna → casa → casa-torre → palazzetto → palazzo), s = scala px
function edificio(ctx, x, yb, s, liv, col){
  col = col || PAL.pietra;
  const tetto = PAL.tetto;
  if (liv <= 0){
    const t = box(ctx, x, yb, s*0.8, s*0.5, s*0.5, mix(col,"#c9b98a",0.4));
    tettoGable(ctx, t, s*0.35, tetto);
  } else if (liv === 1){
    const t = box(ctx, x, yb, s*0.9, s*0.6, s*0.75, col);
    tettoGable(ctx, t, s*0.45, tetto);
    ctx.fillStyle="rgba(40,30,20,0.5)"; ctx.fillRect(x-s*0.08, yb-s*0.4, s*0.16, s*0.4); // porta
  } else if (liv === 2){
    // corpo + torretta
    const t = box(ctx, x, yb, s*1.0, s*0.7, s*0.7, col);
    tettoGable(ctx, t, s*0.4, tetto);
    const t2 = box(ctx, x+s*0.28, yb, s*0.42, s*0.42, s*1.25, mix(col,"#fff",0.06));
    // merli sulla torretta
    ctx.fillStyle = mix(col,"#000",0.15);
    for (let k=0;k<3;k++) ctx.fillRect(x+s*0.09+k*s*0.14, yb-s*1.28, s*0.08, s*0.1);
  } else if (liv === 3){
    const t = box(ctx, x, yb, s*1.25, s*0.85, s*0.95, col);
    tettoGable(ctx, t, s*0.55, tetto);
    // finestre
    ctx.fillStyle="rgba(50,40,25,0.55)";
    for (let r=0;r<2;r++) for (let c=0;c<3;c++) ctx.fillRect(x-s*0.42+c*s*0.32, yb-s*0.8+r*s*0.42, s*0.16, s*0.24);
  } else {
    // palazzo a due volumi
    const t = box(ctx, x, yb, s*1.5, s*1.0, s*1.15, col);
    // tetto piano con cornicione
    ctx.fillStyle = mix(col,"#fff",0.3);
    ctx.beginPath(); ctx.moveTo(t.FTL[0],t.FTL[1]); ctx.lineTo(t.FTR[0],t.FTR[1]); ctx.lineTo(t.BTR[0],t.BTR[1]); ctx.lineTo(t.BTL[0],t.BTL[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(50,40,25,0.5)";
    for (let r=0;r<3;r++) for (let c=0;c<4;c++) ctx.fillRect(x-s*0.58+c*s*0.32, yb-s*1.0+r*s*0.32, s*0.15, s*0.2);
    const t2 = box(ctx, x-s*0.1, yb-s*1.15, s*0.7, s*0.5, s*0.45, mix(col,"#fff",0.05));
    tettoGable(ctx, t2, s*0.3, tetto);
  }
}

// mura 3D: un tratto di cinta con merli attorno alla città (ellisse), semplificato in archi frontali
function cinta(ctx, x, y, rx, ry, h, muraCol){
  ctx.save();
  const cS = mix(muraCol,"#000",0.25);
  // corpo frontale (arco basso)
  ctx.fillStyle = cS;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0.15, Math.PI-0.15); ctx.lineTo(x-rx*Math.cos(0.15), y+ry*Math.sin(0.15)-h);
  ctx.restore();
  // semplice: anello + merli
  ctx.strokeStyle = muraCol; ctx.lineWidth = h*0.5;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = mix(muraCol,"#fff",0.15);
  for (let k=0;k<10;k++){ const a=k*0.628; const tx=x+Math.cos(a)*rx, ty=y+Math.sin(a)*ry;
    ctx.fillRect(tx-h*0.28, ty-h*0.55, h*0.56, h*0.7); }
}

// ---------- MONUMENTI-SIMBOLO 3D ----------
// disegnati con base a (x,yb), altezza ~ s. Riconoscibili e prominenti.
function monumento(ctx, x, yb, s, tipo){
  const P=PAL.pietra, PS=PAL.pietraScura, T=PAL.tetto, O=PAL.oro;
  ombra(ctx, x, yb, s*1.1, s*0.9);
  switch(tipo){
    case "tempio": case "valle": { // Valle dei Templi / tempio greco dorico
      // basamento
      const base = box(ctx, x, yb, s*1.7, s*1.0, s*0.18, mix(P,"#000",0.05));
      // colonne
      const n=6, span=s*1.5;
      for (let k=0;k<n;k++){ const cx = x - span/2 + k*(span/(n-1)); colonna(ctx, cx, yb-s*0.18, s*0.95, s*0.075, P); }
      // architrave
      const arch = box(ctx, x, yb-s*1.13, s*1.7, s*1.0, s*0.16, mix(P,"#fff",0.1));
      // frontone (timpano triangolare 3D)
      tettoGable(ctx, arch, s*0.5, mix(P,"#fff",0.05));
      break;
    }
    case "teatro": { // Teatro greco (cavea a gradoni)
      ombra(ctx, x, yb, s*1.3, s*0.7);
      for (let i=4;i>=0;i--){
        const rr = s*(0.35+i*0.16);
        ctx.fillStyle = mix(PS, "#fff", 0.05 + i*0.06);
        ctx.beginPath(); ctx.ellipse(x, yb-i*s*0.07, rr, rr*0.5, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = mix(PS,"#000",0.2); ctx.lineWidth=Math.max(0.5,s*0.02);
        ctx.beginPath(); ctx.ellipse(x, yb-i*s*0.07, rr, rr*0.5, 0, Math.PI, 0); ctx.stroke();
      }
      // scena (muro di fondo con archi)
      const sc = box(ctx, x, yb-s*0.05, s*1.4, s*0.3, s*0.4, P);
      ctx.fillStyle="rgba(40,30,20,0.5)";
      for (let k=0;k<4;k++) ctx.beginPath(),ctx.arc(x-s*0.5+k*s*0.33, yb-s*0.05, s*0.09, Math.PI,0),ctx.fill();
      break;
    }
    case "cattedrale": case "duomo": { // Cattedrale arabo-normanna
      const corpo = box(ctx, x, yb, s*1.2, s*0.9, s*0.85, P);
      tettoGable(ctx, corpo, s*0.5, T);
      // due torri campanarie
      const tL = box(ctx, x-s*0.62, yb, s*0.4, s*0.4, s*1.4, mix(P,"#fff",0.04)); tettoGable(ctx, tL, s*0.3, T);
      const tR = box(ctx, x+s*0.62, yb, s*0.4, s*0.4, s*1.4, mix(P,"#fff",0.04)); tettoGable(ctx, tR, s*0.3, T);
      // rosone
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(x, yb-s*0.55, s*0.13, 0, 7); ctx.fill();
      ctx.fillStyle=mix(O,"#000",0.3); ctx.beginPath(); ctx.arc(x, yb-s*0.55, s*0.07, 0, 7); ctx.fill();
      break;
    }
    case "barocca": { // Chiesa barocca (Noto/Ragusa)
      const corpo = box(ctx, x, yb, s*1.15, s*0.8, s*0.9, mix(P,"#f0e2c0",0.4));
      // facciata curva + cupola
      cupola(ctx, x, yb-s*0.9, s*0.32, mix("#3f8f6a","#fff",0.15));
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(x, yb-s*1.2, s*0.05, 0, 7); ctx.fill();
      const tR = box(ctx, x-s*0.6, yb, s*0.3, s*0.3, s*1.15, mix(P,"#fff",0.06));
      const tR2= box(ctx, x+s*0.6, yb, s*0.3, s*0.3, s*1.15, mix(P,"#fff",0.06));
      break;
    }
    case "moschea": { // Moschea (era araba)
      const corpo = box(ctx, x, yb, s*1.0, s*0.9, s*0.55, mix(P,"#fff",0.08));
      cupola(ctx, x, yb-s*0.55, s*0.42, mix("#2f88a8","#fff",0.1));
      ctx.fillStyle=O; ctx.beginPath(); ctx.arc(x, yb-s*0.98, s*0.05,0,7); ctx.fill();
      // minareto
      const min = box(ctx, x+s*0.7, yb, s*0.26, s*0.26, s*1.5, mix(P,"#fff",0.05));
      cupola(ctx, x+s*0.83, yb-s*1.5, s*0.16, O);
      break;
    }
    case "castello": case "rocca": { // Castello/rocca su rupe
      if (tipo==="rocca"){ ctx.fillStyle=mix(PS,"#000",0.1);
        ctx.beginPath(); ctx.moveTo(x-s*0.9,yb+s*0.1); ctx.lineTo(x-s*0.5,yb-s*0.4); ctx.lineTo(x+s*0.6,yb-s*0.35); ctx.lineTo(x+s*0.9,yb+s*0.1); ctx.closePath(); ctx.fill(); yb-=s*0.35; }
      const keep = box(ctx, x, yb, s*1.1, s*0.85, s*0.8, PS);
      // merli sul mastio
      ctx.fillStyle = mix(PS,"#fff",0.1);
      for (let k=0;k<4;k++) ctx.fillRect(x-s*0.5+k*s*0.28, yb-s*0.9, s*0.14, s*0.14);
      // due torri d'angolo
      const t1 = box(ctx, x-s*0.6, yb, s*0.42, s*0.42, s*1.15, mix(PS,"#fff",0.05));
      const t2 = box(ctx, x+s*0.6, yb, s*0.42, s*0.42, s*1.15, mix(PS,"#fff",0.05));
      for (const tx of [x-s*0.6, x+s*0.6]) { ctx.fillStyle=mix(PS,"#fff",0.12);
        for (let k=0;k<2;k++) ctx.fillRect(tx-s*0.2+k*s*0.24, yb-s*1.25, s*0.12, s*0.12); }
      break;
    }
    case "faro": { // Faro (Trapani/Sciacca)
      const b = box(ctx, x, yb, s*0.7, s*0.6, s*0.35, P);
      const torre = box(ctx, x, yb-s*0.35, s*0.34, s*0.34, s*1.2, mix(P,"#fff",0.1));
      // fasce rosse
      ctx.fillStyle="#c0392b"; ctx.fillRect(x-s*0.17, yb-s*1.2, s*0.34, s*0.14); ctx.fillRect(x-s*0.17, yb-s*0.8, s*0.34, s*0.14);
      // lanterna
      ctx.fillStyle=PAL.oroChiaro; ctx.beginPath(); ctx.arc(x, yb-s*1.6, s*0.13, 0, 7); ctx.fill();
      ctx.strokeStyle="rgba(255,230,150,0.5)"; ctx.lineWidth=s*0.04;
      ctx.beginPath(); ctx.moveTo(x+s*0.1,yb-s*1.62); ctx.lineTo(x+s*0.55,yb-s*1.78); ctx.stroke();
      break;
    }
    case "villa": { // Villa romana (Piazza Armerina)
      const corpo = box(ctx, x, yb, s*1.5, s*0.9, s*0.5, mix(P,"#f0e2c0",0.3));
      // portico di colonnine
      for (let k=0;k<5;k++) colonna(ctx, x-s*0.6+k*s*0.3, yb, s*0.45, s*0.045, P);
      ctx.fillStyle=T; ctx.fillRect(x-s*0.75, yb-s*0.5, s*1.5, s*0.09);
      break;
    }
    case "campanile": {
      const b = box(ctx, x, yb, s*0.5, s*0.5, s*1.5, P);
      tettoGable(ctx, b, s*0.55, T);
      ctx.fillStyle="rgba(40,30,20,0.5)";
      ctx.fillRect(x-s*0.1, yb-s*1.1, s*0.2, s*0.28); ctx.fillRect(x-s*0.1, yb-s*0.7, s*0.2, s*0.28);
      break;
    }
    default: { // borgoGrande
      const t = box(ctx, x, yb, s*0.9, s*0.7, s*0.7, P); tettoGable(ctx, t, s*0.4, T);
    }
  }
}

return { box, tettoGable, cupola, colonna, edificio, monumento, ombra, cinta, dep };
})();
