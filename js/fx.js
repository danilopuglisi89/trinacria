// TRINACRIA — sistema di animazioni ed effetti (particelle, movimento, testi)
// Le coordinate di particelle/testi sono in coordinate MONDO (km). Il render le proietta con la view.
window.FX = (function(){
let units = {};        // uid -> {x,y,tx,ty,seen}
let parts = [];        // particelle
let texts = [];        // testi fluttuanti
let pulses = [];       // anelli/flash
let tempo = 0;
let etnaTimer = 0;
let fireTimer = {};    // hex città in fiamme: id -> turni residui (in secondi)
let frame = 0;

function reset(){ units={}; parts=[]; texts=[]; pulses=[]; tempo=0; etnaTimer=0; fireTimer={}; }

// ---- unità: movimento fluido ----
function aimUnit(uid, x, y){
  let u = units[uid];
  if (!u){ u = units[uid] = { x, y, tx:x, ty:y, seen:frame }; }
  u.tx = x; u.ty = y; u.seen = frame;
  return u;
}
function unitXY(uid){ const u=units[uid]; return u ? {x:u.x, y:u.y, phase: tempo*3 + uid} : null; }
function unitMoving(uid){ const u=units[uid]; return u && (Math.hypot(u.tx-u.x, u.ty-u.y) > 0.15); }

// ---- particelle ----
function part(x,y,vx,vy,life,size,color,tipo,grav){
  parts.push({ x,y,vx,vy,life,maxlife:life,size,color,tipo,grav:grav||0 });
  if (parts.length>900) parts.shift();
}
function smoke(x,y,scale){
  scale=scale||1;
  part(x + (Math.random()-0.5)*1.5, y, (Math.random()-0.5)*0.4, -1.6-Math.random()*0.8,
       1.6+Math.random(), (2+Math.random()*2)*scale, "rgba(120,110,105,0.55)", "smoke");
}
function fire(x,y){
  part(x+(Math.random()-0.5)*2, y+(Math.random()-0.5)*1, (Math.random()-0.5)*0.5, -1.2-Math.random(),
       0.6+Math.random()*0.5, 1.4+Math.random()*1.4, Math.random()<0.6?"#e8641e":"#f0b028", "fire");
  if (Math.random()<0.5) smoke(x,y-1,0.7);
}
function dust(x,y,n){
  for (let k=0;k<(n||8);k++)
    part(x,y,(Math.random()-0.5)*3,(Math.random()-0.7)*2.4, 0.5+Math.random()*0.5,
         1.5+Math.random()*2, "rgba(200,180,140,0.7)", "dust", 2);
}
function spark(x,y,color,n){
  for (let k=0;k<(n||10);k++){
    const a=Math.random()*6.28, sp=1.5+Math.random()*3.5;
    part(x,y,Math.cos(a)*sp,Math.sin(a)*sp,0.4+Math.random()*0.5,1+Math.random()*1.5,color||"#ffd97a","spark",1.5);
  }
}
function lava(x,y){
  for (let k=0;k<5;k++){
    const a=-1.5+(Math.random()-0.5)*2, sp=2+Math.random()*4;
    part(x,y,Math.cos(a)*sp,Math.sin(a)*sp-1,0.8+Math.random()*0.8,1.5+Math.random()*2,
         Math.random()<0.5?"#ff5010":"#ffb020","lava",5);
  }
  smoke(x,y-2,1.6);
}

// ---- testi fluttuanti ----
function floatText(x,y,txt,color,big){
  texts.push({ x,y, txt, color:color||"#fff", life:1.6, maxlife:1.6, size:big?18:13, vy:-9 });
  if (texts.length>40) texts.shift();
}

// ---- anelli / flash ----
function pulse(x,y,color,rMax){
  pulses.push({ x,y,color,r:2,rMax:rMax||18,life:0.9,maxlife:0.9 });
  if (pulses.length>40) pulses.shift();
}

// ---- eventi di gioco ----
function battle(x,y,vinta){
  dust(x,y,14);
  spark(x,y,"#e8e0c8",8);
  pulse(x,y, vinta?"#6fbf6f":"#d96c4f", 14);
}
function constructionPop(x,y){
  pulse(x,y,"#ffd97a",12);
  spark(x,y-2,"#ffd97a",12);
  floatText(x,y-4,"✦","#ffd97a");
}
function conquest(x,y,color){
  pulse(x,y,color,20);
  pulse(x,y,"#fff",12);
  for (let k=0;k<16;k++){ const a=Math.random()*6.28,sp=2+Math.random()*3;
    part(x,y,Math.cos(a)*sp,Math.sin(a)*sp,0.8,2,color,"spark",1); }
}
function eruption(x,y){ for (let k=0;k<6;k++) lava(x,y); }
function etnaSmoke(x,y){ /* chiamata ogni frame; throttle in update via etnaTimer */ etnaPos={x,y}; }
let etnaPos=null;

// ---- proiettili comici ----
function arancini(x,y,n){        // arancini dorati che ricadono friggendo
  for (let k=0;k<(n||10);k++){
    const a=-1.4+(Math.random()-0.5)*2.2, sp=2+Math.random()*3;
    part(x,y-1,Math.cos(a)*sp,Math.sin(a)*sp-1.5, 0.8+Math.random()*0.6, 2.2+Math.random()*1.6,
         Math.random()<0.5?"#e0902e":"#c97820","arancino",5);
  }
  pulse(x,y,"#e6a23c",13);
}
function granita(x,y){           // schegge di ghiaccio + nuvola gelata
  for (let k=0;k<12;k++){
    const a=Math.random()*6.28, sp=1.5+Math.random()*3;
    part(x,y,Math.cos(a)*sp,Math.sin(a)*sp,0.6+Math.random()*0.5,1.2+Math.random()*1.6,
         Math.random()<0.5?"#8fd8ec":"#c86fb0","spark",1);
  }
  for (let k=0;k<5;k++) part(x+(Math.random()-0.5)*3,y,(Math.random()-0.5)*0.5,-0.4,1.6,3+Math.random()*2,"rgba(190,232,244,0.5)","smoke");
  floatText(x,y-4,"🧊","#8fd8ec");
  pulse(x,y,"#9fe0f0",15);
}
function brioche(x,y){           // esplosione di briciole + boato
  for (let k=0;k<18;k++){
    const a=Math.random()*6.28, sp=2.5+Math.random()*4.5;
    part(x,y,Math.cos(a)*sp,Math.sin(a)*sp,0.7+Math.random()*0.6,1.5+Math.random()*2,
         Math.random()<0.5?"#e8b860":"#c98a34","dust",2.5);
  }
  spark(x,y,"#ffd060",10);
  pulse(x,y,"#ffcf70",22); pulse(x,y,"#fff",12);
  floatText(x,y-4,"💥","#ffcf70",true);
  shake(7,0.4);
}
function confetti(x,y){          // festa/sagra
  const cols=["#e0402e","#f0c040","#2e8f6a","#3f7fa8","#c86fb0"];
  for (let k=0;k<20;k++){
    const a=Math.random()*6.28, sp=1.5+Math.random()*3.5;
    part(x,y-2,Math.cos(a)*sp,Math.sin(a)*sp-1,1.0+Math.random()*0.8,1.5+Math.random()*1.5,cols[k%cols.length],"dust",2);
  }
  floatText(x,y-4,"🎉","#f0c040",true);
}

// ---- CINEMATICA: scuotimento camera + flash a schermo intero + barre ----
let shakeT=0, shakeDur=0, shakeMag=0;
let flashT=0, flashDur=0, flashCol="255,255,255";
let cineT=0, cineDur=0;
function shake(mag, dur){ shakeMag=Math.max(shakeMag,mag); shakeDur=Math.max(shakeDur,dur||0.4); shakeT=shakeDur; }
function flash(col, dur){ flashCol=col||"255,255,255"; flashDur=dur||0.5; flashT=flashDur; }
function cinema(dur){ cineDur=dur||1.2; cineT=cineDur; }
function shakeXY(){ if (shakeT<=0) return {x:0,y:0}; const k=shakeMag*(shakeT/shakeDur); return {x:(Math.random()-0.5)*k, y:(Math.random()-0.5)*k}; }
// overlay a schermo intero (flash + barre cinematografiche). W,H = viewport.
function renderScreen(ctx, W, H){
  if (flashT>0){ ctx.save(); ctx.globalAlpha=Math.min(0.7, flashT/flashDur*0.7); ctx.fillStyle="rgba("+flashCol+",1)"; ctx.fillRect(0,0,W,H); ctx.restore(); }
  if (cineT>0){ const p=Math.sin(Math.min(1,(cineDur-cineT)/0.35*(cineT<0.35?cineT/0.35:1))); const bar=Math.min(1,(cineDur-cineT)/0.3)*Math.min(1,cineT/0.3)*H*0.09;
    ctx.save(); ctx.fillStyle="rgba(0,0,0,0.85)"; ctx.fillRect(0,0,W,bar); ctx.fillRect(0,H-bar,W,bar); ctx.restore(); }
}

// ---- aggiornamento ----
function update(dt){
  frame++;
  tempo += dt;
  // easing unità
  for (const uid in units){
    const u = units[uid];
    const k = 1 - Math.pow(0.0025, dt); // ~ molto rapido ma morbido
    u.x += (u.tx-u.x)*k; u.y += (u.ty-u.y)*k;
    if (frame - u.seen > 240) delete units[uid]; // pruning unità sparite
  }
  // Etna: sempre viva, fumo denso e qualche brace che sale dal cratere
  if (etnaPos){
    etnaTimer+=dt;
    if (etnaTimer>0.16){ etnaTimer=0; smoke(etnaPos.x, etnaPos.y-3, 1.7);
      if (Math.random()<0.22) spark(etnaPos.x+(Math.random()-0.5)*1.2, etnaPos.y-2, "#ff6a2a", 2);
    }
    etnaPos=null;
  }
  // fuoco città
  for (const id in fireTimer){
    fireTimer[id]-=dt;
    if (fireTimer[id]<=0){ delete fireTimer[id]; continue; }
    const cm = GAME.st && GAME.st.comuni[id];
    if (cm){ const h=MAP.hexes[cm.hex]; if (Math.random()<0.6) fire(h.x, h.y); }
  }
  // particelle
  for (let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.life-=dt;
    if (p.life<=0){ parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=p.grav*dt;
    if (p.tipo==="smoke"){ p.size+=dt*3; }
    if (p.tipo==="dust"){ p.vx*=0.94; }
  }
  // testi
  for (let i=texts.length-1;i>=0;i--){ const t=texts[i]; t.life-=dt; t.y+=t.vy*dt; if(t.life<=0) texts.splice(i,1); }
  // pulses
  for (let i=pulses.length-1;i>=0;i--){ const p=pulses[i]; p.life-=dt; p.r+=(p.rMax-p.r)*dt*6; if(p.life<=0) pulses.splice(i,1); }
  // cinematica
  if (shakeT>0) shakeT-=dt;
  if (flashT>0) flashT-=dt;
  if (cineT>0) cineT-=dt;
}

function active(){
  if (parts.length||texts.length||pulses.length) return true;
  for (const uid in units) if (unitMoving(uid)) return true;
  if (Object.keys(fireTimer).length) return true;
  return false;
}

function cittaInFiamme(cmId, secondi){ fireTimer[cmId] = secondi||3; }

// ---- render (view = {x,y,z}) ----
function render(ctx, view){
  const z=view.z;
  // particelle
  for (const p of parts){
    const s = MAP.w2s(view, p.x, p.y);
    const alpha = Math.min(1, p.life/p.maxlife * (p.tipo==="smoke"?0.9:1.2));
    ctx.globalAlpha = Math.max(0, alpha);
    if (p.tipo==="fire"||p.tipo==="lava"||p.tipo==="spark"||p.tipo==="arancino"){
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(s.x,s.y,Math.max(0.6,p.size*z*0.35),0,7); ctx.fill();
      if (p.tipo==="arancino"){ ctx.fillStyle="rgba(255,240,200,0.5)"; ctx.beginPath(); ctx.arc(s.x-p.size*z*0.12,s.y-p.size*z*0.12,Math.max(0.4,p.size*z*0.12),0,7); ctx.fill(); }
    } else if (p.tipo==="smoke"){
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(s.x,s.y,Math.max(1,p.size*z*0.4),0,7); ctx.fill();
    } else {
      ctx.fillStyle=p.color;
      const sz=Math.max(0.8,p.size*z*0.3);
      ctx.fillRect(s.x-sz/2,s.y-sz/2,sz,sz);
    }
  }
  ctx.globalAlpha=1;
  // pulses
  for (const p of pulses){
    const s=MAP.w2s(view,p.x,p.y);
    ctx.globalAlpha=Math.max(0,p.life/p.maxlife);
    ctx.strokeStyle=p.color; ctx.lineWidth=Math.max(1.5,z*0.4);
    ctx.beginPath(); ctx.arc(s.x,s.y,p.r*z*0.5,0,7); ctx.stroke();
  }
  ctx.globalAlpha=1;
  // testi
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for (const t of texts){
    const s=MAP.w2s(view,t.x,t.y);
    ctx.globalAlpha=Math.max(0,Math.min(1,t.life/t.maxlife*1.5));
    ctx.font="bold "+t.size+"px Georgia";
    ctx.lineWidth=3; ctx.strokeStyle="rgba(0,0,0,0.7)"; ctx.strokeText(t.txt,s.x,s.y);
    ctx.fillStyle=t.color; ctx.fillText(t.txt,s.x,s.y);
  }
  ctx.globalAlpha=1;
}

return { reset, aimUnit, unitXY, unitMoving, update, active, render, renderScreen,
         smoke, fire, dust, spark, lava, floatText, pulse,
         battle, constructionPop, conquest, eruption, etnaSmoke, cittaInFiamme,
         arancini, granita, brioche, confetti, shake, flash, cinema, shakeXY };
})();
