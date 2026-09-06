// TRINACRIA — interfaccia utente
window.UI = (function(){
const D = () => GDATA;
let canvas, ctx2d;
let view = { x:0, y:0, z:4 };
let sel = { hex:-1, unita:[], raggio:null };
let drag = null;
let modoPotere = null;   // {id, bersaglio} quando si sta mirando un potere del sovrano
let posaQuart = null;    // {cmId, qid, celle:[...], mappa:Map} quando si sceglie dove mettere un quartiere
// creazione sovrano (schermata iniziale)
let sovLook = null, sovNome = "", sovFid = 0;

function $(id){ return document.getElementById(id); }
// icona per l'HTML: immagine AI (assets/icons) se esiste nel manifest degli sprite, altrimenti l'emoji dei dati
function ico(x, id){
  const k = id || (x && x.id);
  const src = k && window.SPRITES && SPRITES.abilitato.icone ? SPRITES.srcIcona(k) : null;
  return src ? '<img class="ico" src="'+src+'" alt="">' : (x ? x.icona : "");
}
// Il loop ridisegna ogni frame (blit cache + livello animato): pan/zoom/selezione non fanno nulla di speciale.
// La cache-mondo si invalida SOLO quando il contenuto cambia (territori, edifici, migliorie): vedi aggiornaTutto.
function ridisegna(){ /* no-op: il loop disegna comunque */ }

// ---------- AVVIO ----------
function initAvvio(){
  const box = $("avvio-fazioni");
  box.innerHTML = "";
  // mappa costruita una volta per le anteprime territorio
  const geo = MAP.build();
  for (const f of D().FAZIONI){
    const div = document.createElement("div");
    div.className = "carta-fazione" + (f.id===0 ? " scelta" : "");
    div.dataset.fid = f.id;
    const leader0 = (D().LEADER_STORICI[f.id] && D().LEADER_STORICI[f.id][0]) || "";
    div.innerHTML = `<div class="cf-top">
        <canvas class="cf-crest" width="76" height="86"></canvas>
        <canvas class="cf-terr" width="86" height="66"></canvas>
      </div>
      <div class="cf-nome" style="color:${f.colore}">${f.nome}</div>
      <div class="cf-leader">◆ ${leader0}</div>
      <div class="cf-motto">«${f.motto}»</div>
      <div class="cf-bonus">${f.bonus}</div>`;
    div.onclick = () => {
      document.querySelectorAll(".carta-fazione").forEach(x=>x.classList.remove("scelta"));
      div.classList.add("scelta");
      AUDIO.sfx("click");
      scegliSovrano(f.id);
    };
    box.appendChild(div);
    // stemma
    const crestCv = div.querySelector(".cf-crest");
    if (!(SPRITES.abilitato.ritratti && SPRITES.drawFit(crestCv.getContext("2d"), "stemma_"+f.id, 38, 43, null, 84)))
      ART.stemma(crestCv.getContext("2d"), 38, 44, 72, f.id);
    // mini territorio: evidenzia capitale + città iniziali
    const startNames = new Set([f.capitale, ...f.citta]);
    const fake = geo.comuni.map(c => ({ fazione: startNames.has(c.nome) ? f.id : -1 }));
    ART.siciliaMini(div.querySelector(".cf-terr").getContext("2d"), 86, 66, geo.hexes, fake, f.id, f.colore);
  }
  $("btn-inizia").onclick = () => {
    const fid = parseInt(document.querySelector(".carta-fazione.scelta").dataset.fid);
    const vel = $("sel-velocita").value;
    const dif = $("sel-difficolta").value;
    const neb = $("sel-nebbia").value === "nebbia";
    scegliSitoCapitale({ fazione:fid, velocita:vel, difficolta:dif, nebbia:neb,
                         sovranoLook: sovLook, sovranoNome: sovNome, sovranoRitratto: sovRitratto }, avviaPartita);
  };
  scegliSovrano(0); // preseleziona la prima civiltà
  // carica salvataggi
  const salv = SAVE.lista();
  const boxS = $("avvio-salvataggi");
  boxS.innerHTML = "";
  let almeno = false;
  for (const s of salv){
    if (s.vuoto) continue;
    almeno = true;
    const b = document.createElement("button");
    b.className = "btn-salv";
    b.textContent = (s.chiave==="auto"?"⏱ Auto":"💾 "+s.chiave.toUpperCase()) + " — " + s.info;
    b.onclick = () => { if (SAVE.carica(s.chiave)) entraInGioco(); };
    boxS.appendChild(b);
  }
  if (!almeno) boxS.innerHTML = "<span class='muto'>Nessuna partita salvata</span>";
}

// ---------- CREAZIONE SOVRANO ----------
// nomi storici proposti per la civiltà iniziale della fazione
function nomiSovrano(fid){
  const f = D().FAZIONI[fid];
  const cult = f.cultura0;
  const storici = Object.values(D().LEADER_STORICI[fid]||{});
  const base = D().NOMI_EREDI[cult] || D().NOMI_EREDI.siciliana;
  return [...new Set([...storici, ...base])];
}
function scegliSovrano(fid){
  sovFid = fid;
  sovLook = ART.lookDefault(fid);
  const nomi = nomiSovrano(fid);
  sovNome = nomi[0];
  renderSovranoRitratto();
  renderOpzioniSovrano();
}
// Galleria di ritratti dipinti: 26 volti veri fra uomini e donne, giovani e vecchi, di tutte
// le culture dell'isola. Il vecchio sovrano combinatorio (barba+capelli+copricapo) resta come
// ripiego se gli sprite non sono disponibili, ma un ritratto a olio dice molto di piu' di un
// insieme di pezzi intercambiabili.
const N_RITRATTI = 26;
let sovRitratto = 0;
function ritrattoDisponibile(i){ return SPRITES.abilitato.ritratti && SPRITES.getFrame("sovrano_"+String(i).padStart(2,"0")); }
function renderSovranoRitratto(){
  const cv = $("sov-ritratto"); if (!cv) return;
  const cx = cv.getContext("2d");
  cx.clearRect(0,0,cv.width,cv.height);
  const id = "sovrano_" + String(sovRitratto).padStart(2,"0");
  if (ritrattoDisponibile(sovRitratto)){
    // cornice e velo del colore della civilta' scelta: il ritratto resta dipinto, ma si tinge
    const col = D().FAZIONI[sovFid].colore;
    cx.save();
    SPRITES.drawFit(cx, id, cv.width/2, cv.height/2, null, Math.max(cv.width, cv.height));
    cx.globalCompositeOperation = "multiply"; cx.globalAlpha = 0.16;
    cx.fillStyle = col; cx.fillRect(0,0,cv.width,cv.height);
    cx.restore();
    cx.strokeStyle = col; cx.lineWidth = 4; cx.strokeRect(2,2,cv.width-4,cv.height-4);
    cx.strokeStyle = "rgba(240,220,160,0.7)"; cx.lineWidth = 1.5; cx.strokeRect(6,6,cv.width-12,cv.height-12);
  } else {
    ART.sovrano(cx, cv.width/2, cv.height/2, cv.width*0.86, cv.height*0.92, sovLook, sovFid);
  }
}
// striscia di anteprime: si sceglie il volto anche cliccandolo direttamente
function disegnaGalleria(){
  const box = $("cs-galleria"); if (!box) return;
  box.innerHTML = "";
  for (let i=0;i<N_RITRATTI;i++){
    const cv = document.createElement("canvas");
    cv.width = 52; cv.height = 62; cv.className = "cs-mini" + (i===sovRitratto ? " sel" : "");
    const cx = cv.getContext("2d");
    if (!SPRITES.drawFit(cx, "sovrano_"+String(i).padStart(2,"0"), 26, 31, null, 62)) continue;
    cv.onclick = () => {
      sovRitratto = i;
      const e = $("cs-val-volto"); if (e) e.textContent = (i+1)+" di "+N_RITRATTI;
      renderSovranoRitratto(); disegnaGalleria(); AUDIO.sfx("click");
    };
    box.appendChild(cv);
  }
}
function renderOpzioniSovrano(){
  const box = $("cs-opzioni"); if (!box) return;
  const OP = ART.OPZIONI_SOVRANO;
  const nomi = nomiSovrano(sovFid);
  let html = `<div class="cs-riga cs-nome"><span class="cs-lab">Nome</span>
    <select id="sov-nome">${nomi.map(n=>`<option ${n===sovNome?"selected":""}>${n}</option>`).join("")}</select></div>`;
  if (ritrattoDisponibile(0)){
    // galleria: si scorre fra i volti dipinti
    html += `<div class="cs-riga"><span class="cs-lab">Volto</span>
      <button class="cs-fre" data-r="-1">◀</button>
      <span class="cs-val" id="cs-val-volto">${sovRitratto+1} di ${N_RITRATTI}</span>
      <button class="cs-fre" data-r="1">▶</button></div>`;
    html += `<div class="cs-galleria" id="cs-galleria"></div>`;
  } else {
    const cat = [["copricapo","Copricapo"],["capelli","Capelli"],["barba","Barba"],["pelle","Carnagione"],["veste","Veste"],["manto","Mantello"]];
    for (const [k,lab] of cat){
      html += `<div class="cs-riga"><span class="cs-lab">${lab}</span>
        <button class="cs-fre" data-k="${k}" data-d="-1">◀</button>
        <span class="cs-val" id="cs-val-${k}">${OP[k][sovLook[k]]}</span>
        <button class="cs-fre" data-k="${k}" data-d="1">▶</button></div>`;
    }
  }
  box.innerHTML = html;
  $("sov-nome").onchange = e => { sovNome = e.target.value; };
  box.querySelectorAll(".cs-fre").forEach(b => b.onclick = () => {
    if (b.dataset.r !== undefined){
      sovRitratto = (sovRitratto + parseInt(b.dataset.r) + N_RITRATTI) % N_RITRATTI;
      const e = $("cs-val-volto"); if (e) e.textContent = (sovRitratto+1)+" di "+N_RITRATTI;
      renderSovranoRitratto(); disegnaGalleria(); AUDIO.sfx("click");
      return;
    }
    const k = b.dataset.k, d = parseInt(b.dataset.d), n = OP[k].length;
    sovLook[k] = (sovLook[k] + d + n) % n;
    $("cs-val-"+k).textContent = OP[k][sovLook[k]];
    renderSovranoRitratto();
    AUDIO.sfx("click");
  });
  disegnaGalleria();
}

// Prima di cominciare si sceglie DOVE fondare la capitale, entro pochi passi dalla posizione
// storica. E' il momento piu' identitario della partita: la Sicilia parte vuota e quella e'
// l'unica citta' che si riceve in dono, tutto il resto va fondato coi coloni.
const RAGGIO_SCELTA = 5;                 // esagoni attorno alla posizione storica
function scegliSitoCapitale(opts, poi){
  const fid = opts.fazione !== undefined ? opts.fazione : 0;
  const nomeCap = D().FAZIONI[fid].capitale;
  const cmGeo = MAP.comuniGeo.find(c => c.nome === nomeCap);
  if (!cmGeo){ poi(opts); return; }
  // esagoni ammessi: entro RAGGIO_SCELTA passi, su terra asciutta
  const dist = { [cmGeo.hex]: 0 }; const coda = [cmGeo.hex]; const ammessi = [];
  while (coda.length){
    const cur = coda.shift();
    const h = MAP.hexes[cur];
    if (!h.mare && !h.lago) ammessi.push(cur);
    if (dist[cur] >= RAGGIO_SCELTA) continue;
    for (const nb of MAP.vicini(cur)) if (dist[nb] === undefined){ dist[nb] = dist[cur]+1; coda.push(nb); }
  }
  const set = new Set(ammessi);
  $("avvio").classList.add("nascosto");
  $("gioco").classList.remove("nascosto");
  scelta = { set, hex:-1, centro:cmGeo.hex, nome:nomeCap, opts, poi };
  const h0 = MAP.hexes[cmGeo.hex];
  view.z = 11;
  view.x = window.innerWidth/2 - h0.x*view.z;
  view.y = window.innerHeight/2 - h0.y*view.z;
  $("pannello").classList.add("nascosto");
  mostraModale({ titolo:"🏛️ Dove sorgerà la tua capitale",
    testo:"La Sicilia è ancora tutta da fondare. Scegli l'esagono dove piantare la prima pietra: "+
          "puoi restare sulla posizione storica di "+nomeCap+" oppure spostarti di qualche casella, "+
          "per prenderti una collina difendibile, un fiume o un tratto di costa.\n\n"+
          "Le caselle disponibili sono evidenziate. Il nome della città sarà quello della località più vicina.",
    scelte:[{label:"Scelgo io sulla mappa", eff:"nulla"},{label:"Va bene la posizione storica", eff:"storica"}] },
    idx => { if (idx===1) confermaSito(cmGeo.hex); });
}
// il giocatore ha cliccato (o accettato) un esagono: si parte da lì
function confermaSito(hexIdx){
  if (!scelta) return;
  const o = Object.assign({}, scelta.opts, { hexCapitale: hexIdx });
  const poi = scelta.poi;
  scelta = null;
  poi(o);
}

function avviaPartita(opts){
  FX.reset();
  GAME.nuovaPartita(opts);
  entraInGioco();
  mostraModale({ titolo:"🔱 TRINACRIA", testo:
    "Sicilia, 735 avanti Cristo. Le navi greche toccano le coste, i punici tengono l'occidente, i siculi l'interno.\n\n"+
    "Tu guidi "+D().FAZIONI[GAME.st.giocatore].nome+". Hai una città, due reparti e un colono: tutto il resto dell'isola è da fondare. "+
    "Manda i coloni a piantare nuove città — prenderanno il nome del luogo in cui sorgono — e in ventiquattro secoli fatti la Sicilia.\n\n«"+
    D().FAZIONI[GAME.st.giocatore].motto+"»",
    scelte:[{label:"All'armi, picciotti!", eff:"nulla"}] }, ()=>{
      // Prima partita: si propone sempre il tutorial guidato (sette passi verificati).
      if (!proponiTutorial())
        consigliere("benvenuto", "«Maestà, sugnu Don Calorio, u vostru consigghieri. Cliccati 'na truppa e po' 'na casella verdi p'a moviri. Iu vi dicu chi fari, nun v'agitati.»", 11000);
    });
}

function entraInGioco(){
  FX.reset();
  $("avvio").classList.add("nascosto");
  $("gioco").classList.remove("nascosto");
  const cap = GAME.st.comuni[GAME.st.fazioni[GAME.st.giocatore].capitale];
  const h = MAP.hexes[cap.hex];
  view.z = 7.5;
  view.x = window.innerWidth/2 - h.x*view.z;
  view.y = window.innerHeight/2 - h.y*view.z;
  sel = { hex:-1, unita:[], raggio:null };
  aggiornaTutto();
  // audio: il click su "INIZIA" è il gesto che sblocca la riproduzione nel browser.
  // Musica dell'era in corso + presentazione di Don Calorio, e si scaldano le battute frequenti.
  if (!AUDIO.musicaOn && AUDIO.haMusica){
    AUDIO.toggleMusica(GAME.st.era);
    $("btn-musica").textContent = "🔊";
  } else if (AUDIO.musicaOn) AUDIO.temaEra(GAME.st.era);
  AUDIO.precarica(["don_ambiente_1","don_ambiente_2","don_ambiente_3","don_vinta_1","don_persa_1","don_rivolta_1"]);
  if (GAME.st.turno <= 1) setTimeout(() => AUDIO.parla("don_benvenuto"), 900);
}

// ---------- LOOP ----------
function initGioco(){
  canvas = $("mappa");
  ctx2d = canvas.getContext("2d");
  ridimensiona();
  window.addEventListener("resize", ridimensiona);
  window.addEventListener("orientationchange", ridimensiona);
  canvas.addEventListener("pointerdown", giuPuntatore);
  canvas.addEventListener("pointermove", muoviPuntatore);
  canvas.addEventListener("pointerup", suPuntatore);
  canvas.addEventListener("pointercancel", annullaPuntatore);
  canvas.addEventListener("wheel", rotella, { passive:false });
  $("btn-turno").onclick = () => { if (autoTimer){ annullaAuto(); AUDIO.sfx("click"); return; } fineTurno(); };
  const ba = $("btn-auto");
  if (ba){ ba.onclick = () => { impostaAuto(!autoTurno); AUDIO.sfx("click"); if (autoTurno) pianificaAuto(); }; impostaAuto(autoTurno); }
  $("btn-regno").onclick = apriRegno;
  $("btn-corte").onclick = apriCorte;
  $("btn-diplo").onclick = apriDiplomazia;
  $("btn-menu").onclick = apriMenu;
  $("btn-musica").onclick = () => {
    const on = AUDIO.toggleMusica(GAME.st ? GAME.st.era : 0);
    $("btn-musica").textContent = on ? "🔊" : "🔇";
  };
  document.addEventListener("keydown", e => {
    if (!$("modale-sfondo").classList.contains("nascosto")) return;
    if (e.key === "Enter") fineTurno();
    if (e.key === " " || e.code === "Space"){ e.preventDefault(); autoAvanza(); }
    if (e.key === "Escape"){ annullaPotere(); sel = {hex:-1, unita:[], raggio:null}; chiudiPannello(); aggiornaListaArmata(); }
  });
  // click sul consigliere: salta al punto del suggerimento
  $("consigliere").onclick = () => {
    if (consHex >= 0){ centraSu(consHex); selezionaHex(consHex); aggiornaTutto(); }
    $("consigliere").classList.add("nascosto");
  };
  // minimappa: tocca per spostare la vista
  mmCanvas = $("minimappa");
  mmCtx = mmCanvas.getContext("2d");
  const saltaMinimappa = e => {
    const r = mmCanvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (mmCanvas.width / r.width);
    const my = (e.clientY - r.top) * (mmCanvas.height / r.height);
    const w = MAP.minimappaVersoMondo(mx, my, mmCanvas.width, mmCanvas.height);
    view.x = window.innerWidth/2 - w.x*view.z;
    view.y = window.innerHeight/2 - w.y*view.z;
  };
  mmCanvas.addEventListener("pointerdown", e => { e.stopPropagation(); saltaMinimappa(e); });
  // collassa/espandi: così la minimappa non copre stabilmente una città che finisce nel suo angolo
  const mmBox = $("minimappa-box"), mmToggle = $("mm-toggle");
  if (localStorage.getItem("trinacria_mm_collassata")==="1") mmBox.classList.add("collassata");
  mmToggle.onclick = (e) => {
    e.stopPropagation();
    mmBox.classList.toggle("collassata");
    localStorage.setItem("trinacria_mm_collassata", mmBox.classList.contains("collassata")?"1":"0");
  };
  requestAnimationFrame(loop);
}
let mmCanvas = null, mmCtx = null, mmT = 0;
function ridimensiona(){
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  canvas.style.width = w+"px";
  canvas.style.height = h+"px";
  canvas.width = Math.round(w*dpr);
  canvas.height = Math.round(h*dpr);
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
// Illumina gli esagoni dove si può fondare la capitale, con un pulsare dorato.
function disegnaCaselleScelta(ctx){
  if (!scelta) return;
  const rz = MAP.R*view.z;
  const puls = 0.5 + 0.5*Math.sin(performance.now()/380);
  ctx.save();
  for (const i of scelta.set){
    const h = MAP.hexes[i];
    const s = MAP.w2s(view, h.x, h.y);
    if (s.x<-rz || s.y<-rz || s.x>window.innerWidth+rz || s.y>window.innerHeight+rz) continue;
    ART.hexPath(ctx, s.x, s.y, rz+0.6);
    ctx.fillStyle = "rgba(240,208,110,"+(0.13+puls*0.10).toFixed(3)+")"; ctx.fill();
    ctx.strokeStyle = "rgba(255,232,150,"+(0.55+puls*0.35).toFixed(3)+")";
    ctx.lineWidth = Math.max(1.5, rz*0.06); ctx.stroke();
  }
  // il punto storico si distingue
  const hc = MAP.hexes[scelta.centro];
  const sc = MAP.w2s(view, hc.x, hc.y);
  ART.hexPath(ctx, sc.x, sc.y, rz+0.6);
  ctx.strokeStyle = "#fff6d0"; ctx.lineWidth = Math.max(2.5, rz*0.10); ctx.stroke();
  ctx.font = "bold "+Math.max(12, rz*0.42)+"px Georgia, serif";
  ctx.textAlign="center"; ctx.textBaseline="bottom";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,14,6,0.8)";
  ctx.strokeText(scelta.nome, sc.x, sc.y - rz*1.1);
  ctx.fillStyle = "#fff6d0"; ctx.fillText(scelta.nome, sc.x, sc.y - rz*1.1);
  ctx.restore();
}
// ---------- TAPPETO D'AMBIENTE ----------
// I pesi degli strati (onde, vento, cicale, brusio, magli) si leggono da CIO' CHE SI VEDE:
// si campionano trentacinque punti dello schermo e si guarda su che casella cadono. Costa
// pochissimo e si aggiorna due volte al secondo, non a ogni fotogramma.
let ambT = 0, ambUltimo = null;
function contaEsplorato(){
  const st = GAME.st;
  if (!st || !st.esplorato) return 0;
  let n = 0;
  for (const h of MAP.terre) if (GAME.hexEsplorato(h.i)) n++;
  return n;
}
function aggiornaAmbiente(dt){
  if (!AUDIO.musicaOn || !GAME.st) return;
  ambT += dt;
  if (ambT < 0.5) return;
  ambT = 0;
  const pesi = pesiAmbiente();
  if (!pesi) return;
  const chiave = Object.keys(pesi).map(function(k){ return pesi[k].toFixed(2); }).join(",");
  if (chiave === ambUltimo) return;
  ambUltimo = chiave;
  AUDIO.ambiente(pesi);
}
// Peso di ogni strato d'ambiente, letto da cio' che sta davvero sullo schermo.
function pesiAmbiente(){
  if (!GAME.st) return null;
  const W = window.innerWidth, H = window.innerHeight;
  const st = GAME.st;
  let mare=0, alto=0, verde=0, citta=0, fucina=0, tot=0;
  for (let ix=0; ix<7; ix++){
    for (let iy=0; iy<5; iy++){
      const sx = (ix+0.5)*W/7, sy = (iy+0.5)*H/5;
      const i = MAP.hexAt(view, sx, sy);
      if (i === undefined || i < 0) continue;
      const h = MAP.hexes[i];
      if (!h) continue;
      if (st.nebbia && !GAME.hexEsplorato(i)){ tot++; continue; }
      tot++;
      if (h.mare || h.lago) mare++;
      else if (h.terra === "mountain" || h.terra === "volcano") alto++;
      else if (h.terra === "forest" || h.terra === "plain" || h.terra === "hill") verde++;
      if (h.quart === "fucina") fucina += 1;
      if (h.citta >= 0){
        const cm = st.comuni[h.citta];
        if (cm && cm.fondata && (cm.hex === i || h.quart)) citta += 1;
      }
    }
  }
  if (!tot) return null;
  // il vento cresce con l'altura, le cicale con la campagna, il brusio con l'abitato
  return {
    onde:    Math.min(1, mare/tot * 1.2),
    vento:   Math.min(1, alto/tot * 1.6 + 0.10),
    cicale:  Math.min(1, verde/tot * 0.9) * (view.z > 9 ? 1 : 0.35),
    mercato: Math.min(1, citta/tot * 2.2) * (view.z > 8 ? 1 : 0.3),
    fucina:  Math.min(1, fucina/tot * 3)  * (view.z > 8 ? 1 : 0)
  };
}
let ultimoT = 0;
function loop(t){
  const dt = ultimoT ? Math.min(0.05, (t-ultimoT)/1000) : 0.016;
  ultimoT = t;
  try {
    // Fase di scelta del sito: la partita non esiste ancora, quindi si disegna la mappa nuda
    // con le caselle candidate illuminate. MAP.frame regge st = null (tutti i blocchi che
    // usano lo stato sono gia' protetti da `if (st)`).
    if (!GAME.st && scelta){
      MAP.frame(ctx2d, view, null, null);
      disegnaCaselleScelta(ctx2d);
    }
    if (GAME.st) {
      FX.update(dt);
      // scuotimento cinematografico della camera (non altera lo stato reale della view)
      const sh = FX.shakeXY();
      const vv = (sh.x||sh.y) ? { x:view.x+sh.x, y:view.y+sh.y, z:view.z } : view;
      MAP.frame(ctx2d, vv, GAME.st, sel);
      disegnaPosaQuartiere(ctx2d);
      FX.renderScreen(ctx2d, window.innerWidth, window.innerHeight);
      // minimappa: aggiornata ~8 volte al secondo (non serve ogni frame)
      mmT += dt;
      if (mmCtx && mmT > 0.12){ mmT = 0; MAP.disegnaMinimappa(mmCtx, mmCanvas.width, mmCanvas.height, view, GAME.st); }
      aggiornaAmbiente(dt);
    }
  }
  catch(e){ window.__loopErr = (e && e.message) + " | " + ((e&&e.stack)||"").split("\n").slice(0,3).join(" << "); }
  requestAnimationFrame(loop);
}

// ---------- INPUT ----------
// Pointer Events unificano mouse/touch/penna: un dito trascina la mappa,
// due dita fanno pinch-to-zoom. Il "tap" (nessun trascinamento) seleziona.
const puntatori = new Map();
let pinch = null;

function giuPuntatore(e){
  try { canvas.setPointerCapture(e.pointerId); } catch(err){ /* id non catturabile: ignora */ }
  puntatori.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if (puntatori.size === 1){
    drag = { x:e.clientX, y:e.clientY, vx:view.x, vy:view.y, mosso:false };
  } else if (puntatori.size === 2){
    drag = null;
    const pts = [...puntatori.values()];
    const dist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
    const cx = (pts[0].x+pts[1].x)/2, cy = (pts[0].y+pts[1].y)/2;
    pinch = { dist, z0:view.z, world: MAP.s2w(view, cx, cy) };
  }
}
function muoviPuntatore(e){
  if (!puntatori.has(e.pointerId)) return;
  puntatori.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if (puntatori.size >= 2 && pinch){
    const pts = [...puntatori.values()];
    const dist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
    const cx = (pts[0].x+pts[1].x)/2, cy = (pts[0].y+pts[1].y)/2;
    view.z = Math.max(2, Math.min(42, pinch.z0 * (dist/pinch.dist)));
    view.x = cx - pinch.world.x*view.z;
    view.y = cy - pinch.world.y*view.z;
    ridisegna();
    return;
  }
  if (!drag || puntatori.size !== 1) return;
  const dx = e.clientX-drag.x, dy = e.clientY-drag.y;
  if (Math.abs(dx)+Math.abs(dy) > 6) drag.mosso = true;
  if (drag.mosso){
    view.x = drag.vx+dx; view.y = drag.vy+dy;
    ridisegna();
  }
}
function suPuntatore(e){
  puntatori.delete(e.pointerId);
  if (puntatori.size < 2) pinch = null;
  if (puntatori.size === 0){
    const era = drag;
    drag = null;
    if (!era || era.mosso) return;
    // durante la scelta del sito la partita non esiste ancora: il click serve proprio li'
    if (!GAME.st){
      if (scelta) clickHex(MAP.hexAt(view, e.clientX, e.clientY));
      return;
    }
    const i = MAP.hexAt(view, e.clientX, e.clientY);
    // click su un POI sponsor (ha priorità, tranne quando sto comandando truppe o mirando un potere)
    const comando = sel.unita.length && sel.raggio && i>=0 && sel.raggio[i];
    if (!comando && !modoPotere){
      const sp = MAP.sponsorAt(view, e.clientX, e.clientY);
      if (sp >= 0){ apriSponsor(sp); return; }
      const po = MAP.poiAt(view, e.clientX, e.clientY);
      if (po >= 0){ apriPOI(po); return; }
    }
    if (i < 0){ sel = {hex:-1, unita:[], raggio:null}; chiudiPannello(); ridisegna(); return; }
    clickHex(i);
  } else if (puntatori.size === 1){
    // resta un dito solo dopo un pinch: ripartiamo il trascinamento da qui, senza scatti
    const rimasto = [...puntatori.values()][0];
    drag = { x:rimasto.x, y:rimasto.y, vx:view.x, vy:view.y, mosso:true };
  }
}
function annullaPuntatore(e){
  puntatori.delete(e.pointerId);
  if (puntatori.size < 2) pinch = null;
  if (puntatori.size === 0) drag = null;
}
function rotella(e){
  e.preventDefault();
  const fattore = e.deltaY < 0 ? 1.15 : 1/1.15;
  const nuovo = Math.max(2, Math.min(42, view.z*fattore));
  const w = MAP.s2w(view, e.clientX, e.clientY);
  view.z = nuovo;
  view.x = e.clientX - w.x*view.z;
  view.y = e.clientY - w.y*view.z;
  ridisegna();
}

function clickHex(i){
  // fase di scelta del sito della capitale: il click vale solo per confermare l'esagono
  if (scelta){
    if (scelta.set.has(i)) confermaSito(i);
    else consigliere("cons", "«Maestà, troppo lontano dalle terre dei nostri avi. Scegliete fra le caselle illuminate.»", 3500);
    return;
  }
  const st = GAME.st;
  // mira di un potere del sovrano: il tap sceglie il bersaglio
  if (posaQuart){ confermaPosa(i); return; }
  if (modoPotere){ applicaPotereSuHex(i); return; }
  // unità selezionate: muovi / attacca / viaggia
  if (sel.unita.length && sel.raggio){
    if (sel.raggio[i]){
      if (sel.raggio[i].attacco) preparaAttacco(i);
      else eseguiMovimento(i);
      return;
    }
    // fuori portata: proponi una marcia (ma non se clicco le mie truppe altrove)
    const mieLi = st.unita.some(u=>u.hex===i && u.fazione===st.giocatore);
    if (!mieLi && i !== sel.hex && proponiViaggio(i)) return;
  }
  selezionaHex(i);
}

function selezionaHex(i){
  const st = GAME.st, gioc = st.giocatore;
  sel.hex = i;
  const mie = st.unita.filter(u=>u.hex===i && u.fazione===gioc);
  const cm = st.comuni[MAP.hexes[i].comune];
  if (mie.length){
    mie.forEach(u => GAME.svegliaUnita(u.id));      // selezionare = svegliare le sentinelle
    sel.unita = mie.filter(u=>u.mov>0).map(u=>u.id);
    if (!sel.unita.length) sel.unita = mie.map(u=>u.id);
    sel.raggio = sel.unita.length ? GAME.raggioMovimento(sel.unita) : null;
    apriPannelloUnita(i);
    tutorial("primo_movimento", "Muovere le truppe", "Le caselle <b style='color:#9be89b'>verdi</b> sono dove puoi andare, le <b style='color:#e88'>rosse</b> con le ⚔️ sono nemici da attaccare.<br><br>Clicca una casella evidenziata per muoverti. Clicca un luogo lontano per una <b>marcia</b> di più turni.");
  } else if (cm.hex === i){
    sel.unita = []; sel.raggio = null;
    apriPannelloCitta(cm);
    tutorial("prima_citta", "Le tue città", "Da qui recluti truppe e costruisci edifici e meraviglie. Ogni turno la città cresce e produce oro, cibo e scienza.<br><br>Tieni d'occhio il <b>malcontento</b>: se sale troppo, il popolo si ribella!");
  } else {
    sel.unita = []; sel.raggio = null;
    apriPannelloHex(i);
  }
  aggiornaListaArmata();
}

function eseguiMovimento(i){
  const st = GAME.st;
  const espPrima = contaEsplorato();
  GAME.muovi(sel.unita, i);
  GAME.calcolaVisibilita();
  const u1 = st.unita.find(x => x.id === sel.unita[0]);
  AUDIO.sfx(u1 && GAME.eNavale(u1) ? "nave" : "marcia");
  // se la marcia ha scoperto mappa nuova, si sente la nebbia aprirsi
  if (contaEsplorato() > espPrima + 2) AUDIO.sfx("scoperta");
  incrAiuto();
  aggiornaTutto();
  const u0 = st.unita.find(u=>u.id===sel.unita[0]);
  if (u0 && u0.mov>0){
    sel.hex = i;
    sel.raggio = GAME.raggioMovimento(sel.unita);
    apriPannelloUnita(i);
  } else {
    autoAvanza();
  }
}

function proponiViaggio(i){
  const st = GAME.st;
  const uid = sel.unita[0];
  const p = GAME.trovaPercorso(uid, i);
  if (!p || !p.percorso.length) return false;
  const luogo = nomeLuogo(i);
  mostraModale({ titolo:"🚶 Marcia verso "+luogo,
    testo:"Le tue truppe raggiungeranno "+luogo+" in circa <b>"+p.turni+(p.turni===1?" turno":" turni")+"</b>, muovendosi da sole ogni turno.\n\nTi avviserò se incontrano un nemico lungo la strada.",
    scelte:[{label:"In marcia!", eff:"si"},{label:"Annulla", eff:"nulla"}] }, idx => {
      if (idx===0){
        for (const id of sel.unita) GAME.impostaGoto(id, i);
        AUDIO.sfx("click"); incrAiuto();
        aggiornaTutto();
        tutorial("primo_viaggio", "Marce automatiche", "L'unità ora viaggia da sola verso la meta, turno dopo turno. La linea dorata con la ⚑ mostra dove è diretta.<br><br>Riapparirà tra le truppe da gestire solo quando arriva o incontra un nemico.");
        autoAvanza();
      }
    });
  return true;
}

function nomeLuogo(i){
  const cm = GAME.st.comuni[MAP.hexes[i].comune];
  return cm.hex===i ? cm.nome : ("il territorio di "+cm.nome);
}

// centra la telecamera su un esagono
function centraSu(hex){
  const h = MAP.hexes[hex]; if (!h) return;
  if (view.z < 7) view.z = 7;
  view.x = window.innerWidth/2 - h.x*view.z;
  view.y = window.innerHeight/2 - h.y*view.z;
}

// seleziona e centra la prossima cosa da gestire: prima le truppe ferme, poi le città senza ordini
function autoAvanza(){
  const st = GAME.st;
  const ferme = GAME.unitaFerme(st.giocatore);
  if (ferme.length){
    centraSu(ferme[0].hex);
    selezionaHex(ferme[0].hex);
    aggiornaTutto();
    return;
  }
  const citta = GAME.cittaDaGestire(st.giocatore);
  if (citta.length){
    const cm = citta[0];
    centraSu(cm.hex);
    sel = { hex:cm.hex, unita:[], raggio:null };
    apriPannelloCitta(cm);
    tutorial("prima_citta_ferma", "Città senza ordini", "Anche le città ti avvisano se non stanno costruendo nulla.<br><br>Dai loro un ordine (o metti in <b>coda</b> più cose): non lasciare mai la produzione sprecata!");
    aggiornaTutto();
    return;
  }
  sel = { hex:-1, unita:[], raggio:null };
  chiudiPannello();
  aggiornaListaArmata();
  consigliere("tutto_gestito", "Tuttu fattu, Maestà! Città e truppi hannu 'u so duviri. Putemu chiudiri 'u turnu.", 2500);
  aggiornaTutto();
}

function preparaAttacco(i){
  const st = GAME.st;
  const cm = st.comuni[MAP.hexes[i].comune];
  // colono: non combatte mai, annette solo pacificamente le città indipendenti indifese
  const selUnita = st.unita.filter(u=>sel.unita.includes(u.id));
  if (selUnita.length===1 && selUnita[0].tipo==="colono"){ preparaColonizzazione(selUnita[0], i); return; }
  if (selUnita.length && selUnita.every(u=>u.tipo==="lavoratore")){
    mostraModale({ titolo:"🔧 I lavoratori non combattono", testo:"Questa casella è occupata da forze nemiche: i lavoratori non sanno combattere. Usa altre truppe per sgomberarla, oppure spostali altrove.",
      scelte:[{label:"Capito", eff:"nulla"}] }, ()=>{});
    return;
  }
  const dif = GAME.nemiciSuHex(i, st.giocatore);
  // guerra da dichiarare?
  let bersaglioF = dif.length ? dif[0].fazione : (cm.hex===i ? cm.fazione : -1);
  if (bersaglioF >= 0 && bersaglioF < 100){
    const d = st.fazioni[st.giocatore].diplo[bersaglioF];
    if (d && d.stato === "patto"){
      mostraModale({ titolo:"Patto in vigore", testo:"Hai un patto di non aggressione con "+st.fazioni[bersaglioF].nome+". La tua parola vale ancora qualcosa in Sicilia.", scelte:[{label:"Ritirati", eff:"nulla"}] }, ()=>{});
      return;
    }
    if (d && d.stato === "pace"){
      mostraModale({ titolo:"⚔️ Dichiarare guerra?", testo:"Attaccare significa dichiarare guerra a "+st.fazioni[bersaglioF].nome+". Nessun ripensamento.",
        scelte:[{label:"Guerra!", eff:"guerra"},{label:"Ritirati", eff:"nulla"}] }, idx => {
          if (idx===0){ GAME.dichiaraGuerra(st.giocatore, bersaglioF); mostraAnteprima(i); }
        });
      return;
    }
  }
  mostraAnteprima(i);
}

// il colono non combatte mai: annette pacificamente solo le città indipendenti indifese
function preparaColonizzazione(u, i){
  const st = GAME.st;
  const cm = st.comuni[MAP.hexes[i].comune];
  if (cm.fazione !== -1 || cm.hex !== i){
    mostraModale({ titolo:"Non colonizzabile", testo:"I coloni possono fondare colonie solo in una città indipendente (senza padrone).",
      scelte:[{label:"Capito", eff:"nulla"}] }, ()=>{});
    return;
  }
  const difensori = GAME.nemiciSuHex(i, st.giocatore);
  if (difensori.length){
    mostraModale({ titolo:"🛡️ Città presidiata", testo:cm.nome+" è difesa da milizie indipendenti: i coloni non possono passare senza combattere. Sgombera prima le difese con le tue truppe.",
      scelte:[{label:"Capito", eff:"nulla"}] }, ()=>{});
    return;
  }
  mostraModale({ titolo:"🏘️ Fondare una colonia?",
    testo:"I tuoi coloni possono annettere pacificamente <b>"+cm.nome+"</b> al tuo regno, senza combattere.\n\nIl colono si stabilirà lì per sempre (si consuma nell'impresa), ma la città entra subito ben integrata, senza il malcontento di una conquista militare.",
    scelte:[{label:"Fonda la colonia", eff:"si"},{label:"Ritirati", eff:"nulla"}] }, idx => {
      if (idx===0){
        const r = GAME.colonizza(u.id, cm.id);
        if (r.ok){
          AUDIO.sfx("costruito"); incrAiuto();
          sel = { hex:-1, unita:[], raggio:null }; chiudiPannello();
          GAME.calcolaVisibilita(); centraSu(cm.hex); aggiornaTutto(); mostraFumetti();
        }
      }
    });
}

function mostraAnteprima(i){
  const st = GAME.st;
  const ant = GAME.anteprima(sel.unita, i);
  const cm = st.comuni[MAP.hexes[i].comune];
  if (ant.vuoto){
    // città indifesa senza mura: cattura diretta
    eseguiAttacco(i); return;
  }
  if (ant.assaltoMura){
    mostraModale({ titolo:"🧱 Assalto alle mura di "+cm.nome,
      testo:"La città è indifesa ma le mura reggono ancora: "+ant.muraHP+" PV.\n\nLe tue truppe possono assaltarle (subendo perdite leggere) o le macchine d'assedio possono bombardarle.",
      scelte:[{label:"All'assalto!", eff:"si"},{label:"Ritirati", eff:"nulla"}] }, idx => {
        if (idx===0) eseguiAttacco(i);
      });
    return;
  }
  const pct = Math.round(ant.pWin*100);
  const colore = pct>=65 ? "#6fbf6f" : (pct>=40 ? "#d9b23f" : "#d96c4f");
  mostraModale({ titolo:"⚔️ Anteprima battaglia",
    html:`<div class="ant-box">
      <div class="ant-riga"><span>${ant.nA} unità attaccanti</span><span>${ant.nD} difensori${ant.mura?" 🧱":""}</span></div>
      <div class="ant-barra"><div style="width:${pct}%;background:${colore}"></div></div>
      <div class="ant-pct" style="color:${colore}">${pct}% di vittoria</div>
      <div class="ant-riga muto"><span>Perdite previste: ${ant.perditeA.toFixed(1)}</span><span>Nemici abbattuti: ${ant.perditeD.toFixed(1)}</span></div>
      ${ant.mura ? "<div class='muto'>⚠️ Le mura proteggono i difensori: bombardale prima con le macchine d'assedio!</div>" : ""}
    </div>`,
    scelte:[{label:"Attacca!", eff:"si"},{label:"Ritirati", eff:"nulla"}] }, idx => {
      if (idx===0) eseguiAttacco(i);
    });
}
function eseguiAttacco(i){
  AUDIO.sfx("battaglia");
  GAME.attacca(sel.unita, i);
  sel = { hex:-1, unita:[], raggio:null };
  chiudiPannello();
  aggiornaTutto();
  processaPending();
  controllaFinePartita();
}

// ---------- PANNELLI ----------
function chiudiPannello(){ $("pannello").classList.add("nascosto"); }
function apri(html){
  const p = $("pannello");
  p.innerHTML = '<div class="pannello-handle">▾</div>' + html;
  p.classList.remove("nascosto");
  p.classList.remove("compatta");
  $("armata").classList.remove("espansa"); // su mobile: non coprire il pannello appena aperto
  const maniglia = p.querySelector(".pannello-handle");
  if (maniglia) maniglia.onclick = (e) => {
    e.stopPropagation();
    p.classList.toggle("compatta");
    maniglia.textContent = p.classList.contains("compatta") ? "▴ mostra" : "▾";
  };
}
function nomeTerra(t){
  return { plain:"Pianura", hill:"Collina", mountain:"Montagna", forest:"Bosco", volcano:"L'Etna — a Muntagna" }[t]||t;
}

function apriPannelloHex(i){
  const st = GAME.st;
  const h = MAP.hexes[i];
  const cm = st.comuni[h.comune];                       // il paese piu' vicino: e' geografia
  // Chi possiede DAVVERO la casella e' h.citta. Prima il pannello guardava il comune
  // geografico, e offriva migliorie su caselle fuori dal regno: bottoni che non facevano
  // nulla (anzi, lanciavano) perche' il motore le rifiutava.
  const propr = h.citta >= 0 ? st.comuni[h.citta] : null;
  const mia = !!(propr && propr.fazione === st.giocatore);
  let html = `<div class="p-titolo">${nomeTerra(h.terra)}</div>
    <div class="p-sotto">${propr ? "Territorio di "+propr.nome+" "+proprietario(propr)
                                 : "<span class='fuori'>Fuori dai regni</span> — presso "+cm.nome}</div>`;
  if (h.fiume) html += `<div>💧 Fiume: +1 cibo, difesa +10%</div>`;
  if (h.costa) html += `<div>🌊 Costa: +oro</div>`;
  if (h.res) html += `<div>${ico(RES_INFO[h.res], "res_"+h.res)} <b>${RES_INFO[h.res].nome}</b></div>`;
  if (h.imp) html += `<div>${ico(D().MIGLIORIE[h.imp], h.imp)} ${D().MIGLIORIE[h.imp].nome} — ${D().MIGLIORIE[h.imp].eff}</div>`;
  if (mia && h.imp && propr.hex!==i){
    const f = st.fazioni[st.giocatore];
    const nuovoId = GAME.prossimaMiglioria(h.imp, st.giocatore);
    if (nuovoId){
      const nuovo = D().MIGLIORIE[nuovoId];
      const costo = Math.max(15, Math.ceil((nuovo.costo - D().MIGLIORIE[h.imp].costo)*1.2));
      const ok = f.oro >= costo;
      html += `<div class="p-sez">Il tempo passa (oro: ${Math.floor(f.oro)})</div>
        <button class="btn-lista" id="btn-upg-hex" ${ok?"":"disabled"}>🏭 Ammoderna in ${ico(nuovo, nuovoId)} ${nuovo.nome} <span class="muto">— ${costo} oro (${nuovo.eff})</span></button>`;
    }
  }
  if (h.quart){
    const q = GAME.quartiereDef(h.quart);
    const a = GAME.adiacenzaQuartiere(i, h.quart);
    const voci = [];
    for (const k in a.rese) if (k!=="calma") voci.push(SIMB_RESA[k]+(+a.rese[k].toFixed(1)));
    if (a.rese.calma) voci.push("😊-"+a.rese.calma+" malcontento");
    html += `<div class="p-sez">${q.icona} ${q.nome}</div>
      <div class="p-riga">Rende ${voci.join(" ")}</div>`;
    if (a.dettagli.length)
      html += `<div class="p-riga muto">Grazie a: ${a.dettagli.map(d=>d.testo+" ×"+d.n).join(", ")}</div>`;
  }
  // casella libera: la si puo' comprare, e il pannello dice quanto renderebbe
  if (!propr && !h.mare && h.terra!=="lago"){
    const p = GAME.puoComprareCasella(i, st.giocatore);
    const r = GAME.resaCasella(i);
    const voci = [];
    if (r.cibo) voci.push("🌾"+(+r.cibo.toFixed(1)));
    if (r.prod) voci.push("⚒️"+(+r.prod.toFixed(1)));
    if (r.oro) voci.push("💰"+(+r.oro.toFixed(1)));
    if (r.cultura) voci.push("🎭"+(+r.cultura.toFixed(1)));
    html += `<div class="p-sez">Fuori dal regno</div>
      <div class="p-riga muto">Finché non è tua non rende nulla e non si può migliorare.</div>
      <div class="p-riga">Una volta dentro il regno renderebbe ${voci.length?voci.join(" "):"poco"}.</div>`;
    if (p.costo !== undefined){
      tutorial("compra_casella", "Le caselle si comprano",
        "Fuori dai tuoi confini una casella <b>non rende nulla</b> e non si può migliorare: l'unica cosa che puoi fare è <b>comprarla</b>.<br><br>Il prezzo cresce con la distanza e con quanto sei già grande. Guarda le risorse col cerchietto dorato: quelle valgono la spesa.");
      const oro = Math.floor(st.fazioni[st.giocatore].oro);
      html += `<button class="btn-lista btn-compra-hex" id="btn-compra-hex" ${p.ok?"":"disabled"}>🪙 Compra questa casella — ${p.costo} oro
        <span class="muto">(ne hai ${oro}${p.ok?"":" — non bastano"})</span></button>`;
    } else {
      html += `<div class="p-riga muto">${p.motivo}</div>`;
    }
  }
  if (mia && !h.imp && !h.quart && propr.hex!==i){
    html += `<div class="p-sez">Costruisci miglioria (oro: ${Math.floor(st.fazioni[st.giocatore].oro)})</div>
      <div class="p-riga muto">💰 Paga subito in oro, oppure 🔨 manda un lavoratore: costruisce gratis (ma ci mette il suo tempo).</div>`;
    const f = st.fazioni[st.giocatore];
    for (const id of Object.keys(D().MIGLIORIE)){
      const m = D().MIGLIORIE[id];
      if (!m.terreni.includes(h.terra)) continue;
      if (m.fiume && !h.fiume) continue;
      if (m.costiero && !h.costa) continue;
      if (m.tech && !f.techs.includes(m.tech)) continue;
      if (m.eraMin && st.era < m.eraMin) continue;
      const ok = f.oro >= m.costo;
      html += `<button class="btn-lista" data-mig="${id}" ${ok?"":"disabled"}>${ico(m, id)} ${m.nome} — ${m.costo} oro <span class="muto">${m.eff}</span></button>`;
    }
  }
  apri(html);
  const bCompra = $("btn-compra-hex");
  if (bCompra) bCompra.onclick = () => {
    if (GAME.compraCasella(i, GAME.st.giocatore)){
      AUDIO.sfx("moneta"); incrAiuto(); apriPannelloHex(i); aggiornaTutto();
    } else AUDIO.sfx("errore");
  };
  document.querySelectorAll("[data-mig]").forEach(b => b.onclick = () => {
    if (GAME.migliora(i, b.dataset.mig)){ AUDIO.sfx("costruito"); apriPannelloHex(i); aggiornaTutto(); }
  });
  const btnUpgHex = $("btn-upg-hex");
  if (btnUpgHex) btnUpgHex.onclick = () => {
    if (GAME.upgradaMiglioria(i, st.giocatore)){ AUDIO.sfx("costruito"); apriPannelloHex(i); aggiornaTutto(); }
  };
}

// Nome di una voce in coda, qualunque sia il tipo. Prima si cercava fra le MERAVIGLIE per
// esclusione, e un edificio locale o un quartiere in coda faceva saltare tutto il pannello.
function nomeItem(it){
  if (it.tipo==="unita") return (D().UNITA[it.id]||{}).nome || it.id;
  if (it.tipo==="edificio") return (D().EDIFICI[it.id]||{}).nome || it.id;
  if (it.tipo==="locale"){ const e = D().EDIFICI_LOCALI.find(x=>x.id===it.id); return e ? e.nome : it.id; }
  if (it.tipo==="quartiere"){ const q = GAME.quartiereDef(it.id); return q ? q.nome : it.id; }
  const m = D().MERAVIGLIE.find(x=>x.id===it.id);
  return m ? m.nome : it.id;
}
const SIMB_RESA = { cibo:"🌾", prod:"⚒️", oro:"💰", scienza:"📜", cultura:"🎭" };
function proprietario(cm){
  const st = GAME.st;
  if (cm.fazione===-1) return "<span class='muto'>(indipendente)</span>";
  if (cm.fazione>=100) return "<span class='muto'>(occupata da "+GAME.nomeInvasore(cm.fazione)+")</span>";
  return "<span style='color:"+D().FAZIONI[cm.fazione].colore+"'>("+st.fazioni[cm.fazione].nome+")</span>";
}

function apriPannelloCitta(cm){
  const st = GAME.st;
  const mia = cm.fazione === st.giocatore;
  const r = cm.fazione!==-1 && cm.fazione<100 ? GAME.reseComune(cm) : null;
  const cult = D().CULTURE[cm.cultura] || { nome:cm.cultura };
  let html = `<div class="p-titolo">${cm.tier>=4?"★ ":""}${cm.nome}</div>
    <div class="p-sotto">${proprietario(cm)} — prov. ${cm.prov}</div>
    <div class="p-riga">👥 Popolazione: <b>${cm.pop}</b> &nbsp; 😊 Malcontento: <b class="${cm.unrest>=8?'rosso':(cm.unrest>=5?'giallo':'')}">${cm.unrest}/12</b></div>
    <div class="p-riga">🏺 Cultura ${cult.nome} — integrazione ${Math.round(cm.integr)}%</div>`;
  if (cm.mura>0) html += `<div class="p-riga">🧱 Mura liv.${cm.mura}: ${cm.muraHP}/${cm.mura*100} PV</div>`;
  if (cm.fondata && cm.fazione < 100){
    const fed = cm.fedelta===undefined ? 100 : cm.fedelta;
    const d = GAME.fedeltaDelta(cm);
    const col = fed>=75 ? "#7ec87e" : fed>=50 ? "#e8c86a" : fed>=25 ? "#e0913a" : "#d05a4a";
    const segno = d.delta>0 ? "+" : "";
    html += `<div class="p-riga">🏛️ Fedeltà <b style="color:${col}">${Math.round(fed)}</b>/100
        <span class="muto">(${segno}${d.delta.toFixed(1)} a turno)</span></div>
      <div class="fed-barra"><i style="width:${Math.max(2,Math.round(fed))}%;background:${col}"></i></div>`;
    if (cm.fazione===-1 && cm.versoFaz>=0)
      html += `<div class="p-riga muto">Città libera: sta guardando verso ${GAME.st.fazioni[cm.versoFaz].nome}.</div>`;
    if (mia && fed < 75)
      html += `<div class="p-riga muto">${d.dett.map(x=>x.t+" "+(x.v>0?"+":"")+x.v).join(" · ")}</div>`;
  }
  if (cm.dop){ const d = D().DOP.find(x=>x.id===cm.dop); if (d) html += `<div class="p-riga" style="color:#e8b84a">${ico(d)} <b>${d.nome}</b></div>`; }
  if (st.peste && st.peste.infetti.includes(cm.id)) html += `<div class="p-riga rosso">☠️ LA PESTE infuria in città!</div>`;
  if (r) html += `<div class="p-riga">🌾${r.cibo.toFixed(1)} ⚒️${r.prod.toFixed(1)} 💰${r.oro.toFixed(1)} 📜${r.scienza.toFixed(0)} 🎭${r.cultura.toFixed(0)}</div>`;
  if (cm.fondata && cm.fazione>=0 && cm.fazione<100){
    const ca = GAME.caseComune(cm), sv = GAME.serviziComune(cm);
    const pieno = cm.pop >= ca.n;
    html += `<div class="p-riga">🏠 Case <b class="${pieno?'giallo':''}">${cm.pop}/${ca.n}</b>
        <span class="muto">${pieno?'— la città non può crescere oltre':'abitanti'}</span></div>
      <div class="p-riga">🎪 Servizi <b class="${sv.mancano?'rosso':''}">${sv.offerti}</b>/${sv.richiesti}
        <span class="muto">${sv.mancano?'— ne mancano '+sv.mancano+', il popolo mormora':'il popolo è servito'}</span></div>`;
    if (mia) html += `<div class="p-riga muto">Case: ${ca.dett.map(x=>x.t+' +'+x.v).join(', ')}${sv.dett.length?' · Servizi: '+sv.dett.map(x=>x.t+' +'+x.v).join(', '):''}</div>`;
  }
  if (cm.edifici.length)
    html += `<div class="p-riga muto">Edifici: ${cm.edifici.map(e=>(D().EDIFICI[e]||D().EDIFICI_LOCALI.find(x=>x.id===e)).nome).join(", ")}</div>`;
  for (const mid of Object.keys(st.meraviglie))
    if (st.meraviglie[mid]===cm.id) html += `<div class="p-riga">🏛️ <b>${D().MERAVIGLIE.find(m=>m.id===mid).nome}</b></div>`;
  if (mia){
    // coda
    html += `<div class="p-sez">Produzione (⚒️ ${cm.prodAcc.toFixed(0)} accumulata)</div>`;
    if (cm.coda.length){
      cm.coda.forEach((it, k) => {
        const nome = nomeItem(it);
        const pct = k===0 ? Math.min(100, Math.round(cm.prodAcc/it.costo*100)) : 0;
        html += `<div class="coda-item">${k+1}. ${nome} <span class="muto">(${it.costo}⚒️${k===0?" — "+pct+"%":""})</span> <button class="btn-x" data-coda="${k}">✕</button></div>`;
      });
      const resto = Math.max(0, cm.coda[0].costo - cm.prodAcc);
      html += `<button class="btn-lista" id="btn-compra">💰 Compra subito (${Math.ceil(resto*2)} oro)</button>`;
    } else html += `<div class="muto">Coda vuota</div>`;
    const truppeOra = GAME.truppeFazione(st.giocatore), limiteOra = GAME.limiteEsercito(st.giocatore);
    html += `<div class="p-sez">Recluta unità <span class="muto">(esercito: ${truppeOra}/${limiteOra})</span></div>`;
    for (const u of GAME.unitaDisponibili(cm)){
      const titolo = u.motivoPieno==="niente_da_fare" ? "Non ci sono ancora caselle da migliorare nel tuo territorio"
                   : u.motivoPieno==="al_completo" ? "Hai già 3 lavoratori: fanne finire uno prima di reclutarne altri"
                   : "Esercito al completo: sciogli o muovi truppe per reclutarne altre";
      const suffisso = u.motivoPieno==="niente_da_fare" ? " — nulla da migliorare" : (u.pieno ? " — al completo" : "");
      html += `<button class="btn-lista" data-rec="${u.id}" data-costo="${u.costo}" ${u.pieno?`disabled title='${titolo}'`:""}>${u.uu?"⭐ ":""}${u.nome} <span class="muto">⚔${u.atk} 🛡${u.def} — ${u.costo}⚒️${suffisso}</span></button>`;
    }
    const quart = GAME.quartieriDisponibili(cm);
    const nQ = GAME.quartieriDi(cm.id).length, tettoQ = GAME.tettoQuartieri(cm);
    if (quart.length || nQ){
      html += `<div class="p-sez">Quartieri <span class="muto">(${nQ}/${tettoQ} — servono abitanti per farne altri)</span></div>`;
      html += `<div class="p-riga muto">Occupano una casella del territorio: rendono in base a cosa hanno intorno.</div>`;
      for (const q of quart)
        html += `<button class="btn-lista" data-quart="${q.id}" data-costo="${q.costo}">${ico(q, q.icoId)} ${q.nome}
          <span class="muto">${q.costo}\u2692\uFE0F — ${q.eff}</span>
          <span class="q-best">migliore: +${(+q.migliore.totale.toFixed(1))}</span></button>`;
    }
    html += `<div class="p-sez">Costruisci</div>`;
    for (const c of GAME.costruzioniDisponibili(cm))
      html += `<button class="btn-lista" data-cos="${c.tipo}:${c.id}" data-costo="${c.costo}">${ico(c, c.icoId || c.id)} ${c.nome} <span class="muto">${c.costo}⚒️ — ${c.eff}</span></button>`;
    const f = st.fazioni[st.giocatore];
    if (f.capitale===cm.id && !f.eroeVivo)
      html += `<div class="p-sez"></div><button class="btn-lista" id="btn-eroe" ${f.oro>=GAME.costoEroe()?"":"disabled"}>★ Recluta Condottiero (${GAME.costoEroe()} oro)</button>`;
  }
  apri(html);
  if (mia){
    document.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => {
      const ok = GAME.accoda(cm.id, { tipo:"unita", id:b.dataset.rec, costo:parseInt(b.dataset.costo) });
      if (ok) AUDIO.sfx("unita");
      else { AUDIO.sfx("errore"); consigliere("cons", "Esercito al completo, Maestà: sciogli o impegna qualche truppa prima di reclutarne altre.", 3000); }
      apriPannelloCitta(cm); aggiornaTutto();
    });
    document.querySelectorAll("[data-cos]").forEach(b => b.onclick = () => {
      const [tipo,id] = b.dataset.cos.split(":");
      GAME.accoda(cm.id, { tipo, id, costo:parseInt(b.dataset.costo) });
      AUDIO.sfx("click"); apriPannelloCitta(cm); aggiornaTutto();
    });
    document.querySelectorAll("[data-quart]").forEach(b => b.onclick = () => {
      iniziaPosaQuartiere(cm, b.dataset.quart, parseInt(b.dataset.costo));
    });
    document.querySelectorAll("[data-coda]").forEach(b => b.onclick = () => {
      cm.coda.splice(parseInt(b.dataset.coda), 1);
      apriPannelloCitta(cm); aggiornaTutto();
    });
    const bc = $("btn-compra");
    if (bc) bc.onclick = () => { if (GAME.compraSubito(cm.id)){ AUDIO.sfx("costruito"); apriPannelloCitta(cm); aggiornaTutto(); } };
    const be = $("btn-eroe");
    if (be) be.onclick = () => { if (GAME.reclutaEroe(st.giocatore)){ AUDIO.sfx("vittoria"); apriPannelloCitta(cm); aggiornaTutto(); } };
  }
}

function apriPannelloUnita(i){
  const st = GAME.st;
  const mie = st.unita.filter(u=>u.hex===i && u.fazione===st.giocatore);
  const cm = st.comuni[MAP.hexes[i].comune];
  let html = `<div class="p-titolo">Truppe (${mie.length})</div>
    <div class="p-sotto">${nomeTerra(MAP.hexes[i].terra)} — territorio di ${cm.nome}</div>`;
  for (const u of mie){
    const s = GAME.statU(u.tipo);
    const att = sel.unita.includes(u.id);
    const nome = D().UNITA[u.tipo] ? D().UNITA[u.tipo].nome : s.nome;
    html += `<div class="carta-unita ${att?'attiva':''}" data-uid="${u.id}" data-tipo="${u.tipo}">
      <canvas class="cu-icon" width="42" height="42"></canvas>
      <div class="cu-txt"><b>${u.nome ? "★ "+u.nome : nome}</b><br>
      <span class="muto">⚔${s.atk} 🛡${s.def} 👟${u.mov}/${s.mov} ❤${u.hp}${u.xp?" ✨"+u.xp:""}${u.tipo==="lavoratore"?" 🔧"+u.usiRimasti+"/3":""}</span></div>
    </div>`;
  }
  // bombardamento
  const assedi = mie.filter(u => D().UNITA[u.tipo].muraDanno && u.mov>0);
  if (assedi.length){
    for (const nb of [i, ...MAP.vicini(i)]){
      const c2 = st.comuni[MAP.hexes[nb].comune];
      if (c2.hex===nb && c2.fazione!==st.giocatore && c2.fazione!==-999 && c2.muraHP>0 && c2.fazione!==st.giocatore){
        html += `<button class="btn-lista" id="btn-bomba" data-cm="${c2.id}">💥 Bombarda le mura di ${c2.nome} (${c2.muraHP} PV)</button>`;
        break;
      }
    }
  }
  // azioni sull'unità selezionata
  const selUn = mie.filter(u=>sel.unita.includes(u.id) && u.mov>0);
  if (selUn.length){
    if (selUn.some(u=>u.goto!=null))
      html += `<button class="btn-lista" id="btn-annulla-marcia">✋ Ferma la marcia</button>`;
    if (selUn.every(u=>u.tipo==="lavoratore"))
      html += `<button class="btn-lista" id="btn-migliora-auto">🔧 Migliora automaticamente le vicinanze</button>`;
    if (selUn.every(u=>u.tipo==="colono")){
      // fondare QUI e' l'azione principale del colono: se si puo', va in cima e ben visibile
      const p = GAME.puoFondare(selUn[0].hex, st.giocatore);
      if (p.ok)
        html += `<button class="btn-lista btn-fonda" id="btn-fonda-qui">🏛️ <b>${p.nome ? "Fonda qui la città di "+p.nome : "Fonda qui una nuova città"}</b></button>`;
      else if (p.motivo === "troppo_vicina")
        html += `<div class="p-riga muto">🏛️ Troppo vicino a ${p.vicina.nome}: allontanati di qualche casella per fondare.</div>`;
      else if (p.motivo === "gia_territorio")
        html += `<div class="p-riga muto">🏛️ Questa terra è già di ${p.cm.nome}.</div>`;
      html += `<button class="btn-lista" id="btn-colonizza-auto">🧭 Cerca da solo un buon sito e fonda</button>`;
    }
    if (selUn.every(u=>u.tipo!=="lavoratore" && u.tipo!=="colono"))
      html += `<button class="btn-lista" id="btn-conquista-auto">⚔️ Conquista automaticamente</button>`;
    html += `<button class="btn-lista" id="btn-fortifica">🛡️ Fortifica — di guardia qui (si cura, non ti disturbo più)</button>`;
  }
  if (cm.hex===i && cm.fazione===st.giocatore)
    html += `<button class="btn-lista" id="btn-citta">🏛️ Gestisci ${cm.nome}</button>`;
  html += `<div class="muto p-riga">🟢 casella verde = <b>muovi</b> · 🔴 rossa ⚔️ = <b>attacca</b> · luogo lontano = <b>marcia</b> di più turni.</div>`;
  apri(html);
  const btnFort = $("btn-fortifica");
  if (btnFort) btnFort.onclick = () => {
    for (const u of selUn) GAME.fortifica(u.id);
    AUDIO.sfx("click"); incrAiuto();
    tutorial("prima_fortifica", "Truppe di guardia", "Le unità <b>fortificate</b> restano ferme a difendere, si curano ogni turno e <b>non compaiono più</b> tra quelle da gestire.<br><br>Per risvegliarle, basta selezionarle di nuovo.");
    autoAvanza();
  };
  const btnMigliora = $("btn-migliora-auto");
  if (btnMigliora) btnMigliora.onclick = () => {
    let nOk = 0, nNo = 0;
    for (const u of selUn){
      const r = GAME.miglioramentoAutomatico(u.id);
      if (r.ok) nOk++; else nNo++;
    }
    AUDIO.sfx(nOk ? "costruito" : "click");
    if (nOk) GAME.aggiungiLog("🔧 "+nOk+(nOk===1?" lavoratore ha migliorato":" lavoratori hanno migliorato")+" le campagne vicine.", "bene");
    if (nNo && !nOk) consigliere("cons", "Nessuna casella vicina da migliorare, o fondi insufficienti, Maestà.", 2800);
    sel.unita = sel.unita.filter(id => st.unita.some(u=>u.id===id));
    if (sel.unita.length) apriPannelloUnita(i); else chiudiPannello();
    aggiornaTutto();
  };
  const btnFonda = $("btn-fonda-qui");
  if (btnFonda) btnFonda.onclick = () => {
    const u = selUn[0];
    const p = GAME.puoFondare(u.hex, st.giocatore);
    if (!p.ok){ consigliere("cons", "«Qui non si può fondare, Maestà.»", 3000); return; }
    // Nessun centro importante nei paraggi: la città nasce senza nome ed è il sovrano a
    // battezzarla. Si propone un nome plausibile, ma si può scrivere quello che si vuole.
    if (!p.nome){ chiediNomeCitta(u); return; }
    concludiFondazione(u, null);
  };
  const btnColonizza = $("btn-colonizza-auto");
  if (btnColonizza) btnColonizza.onclick = () => {
    let nOk = 0, nMossi = 0;
    for (const u of selUn){
      const r = GAME.autoColonizza(u.id);
      if (r.ok && !r.mossa) nOk++; else if (r.ok && r.mossa) nMossi++;
    }
    AUDIO.sfx(nOk ? "vittoria" : "click");
    if (nOk) GAME.aggiungiLog("🏘️ "+nOk+(nOk===1?" colonia fondata":" colonie fondate")+"!", "bene");
    else if (nMossi) GAME.aggiungiLog("🏘️ I coloni si avviano verso la città indipendente più vicina.", "info");
    else consigliere("cons", "Nessuna città indipendente indifesa raggiungibile al momento, Maestà.", 2800);
    sel.unita = sel.unita.filter(id => st.unita.some(u=>u.id===id));
    if (sel.unita.length) apriPannelloUnita(i); else chiudiPannello();
    aggiornaTutto();
  };
  const btnConquista = $("btn-conquista-auto");
  if (btnConquista) btnConquista.onclick = () => {
    const r = GAME.autoConquista(selUn.map(u=>u.id), st.giocatore);
    AUDIO.sfx(r.attacco ? "battaglia" : "click");
    if (r.attacco) GAME.aggiungiLog("⚔️ Le truppe attaccano "+r.verso+"!", "bene");
    else if (r.mossa) GAME.aggiungiLog("⚔️ Le truppe marciano verso "+r.verso+".", "info");
    else consigliere("cons", "Nessun bersaglio raggiungibile al momento, Maestà.", 2800);
    incrAiuto(); GAME.calcolaVisibilita();
    apriPannelloUnita(i); aggiornaTutto();
  };
  const btnMarcia = $("btn-annulla-marcia");
  if (btnMarcia) btnMarcia.onclick = () => {
    for (const u of selUn) u.goto = null;
    apriPannelloUnita(i); aggiornaTutto();
  };
  const btnCitta = $("btn-citta");
  if (btnCitta) btnCitta.onclick = () => {
    sel.unita = []; sel.raggio = null;
    apriPannelloCitta(cm);
    ridisegna();
  };
  document.querySelectorAll("[data-uid]").forEach(c => {
    // icona soldatino
    const cv = c.querySelector(".cu-icon");
    if (cv){
      const cc = cv.getContext("2d");
      const cat = ART.categoriaUnita(c.dataset.tipo);
      const ud = GDATA.UNITA[c.dataset.tipo];
      const col = GDATA.FAZIONI[st.giocatore].colore, col2 = GDATA.FAZIONI[st.giocatore].colore2;
      ART.soldato(cc, 21, 36, 36, cat, col, col2, 0, ud?ud.era:0, ud&&(ud.uu!==undefined||ud.tipo==="hero"));
    }
    c.onclick = () => {
      const id = parseInt(c.dataset.uid);
      if (sel.unita.includes(id)) sel.unita = sel.unita.filter(x=>x!==id);
      else sel.unita.push(id);
      sel.raggio = sel.unita.length ? GAME.raggioMovimento(sel.unita) : null;
      apriPannelloUnita(i);
      ridisegna();
    };
  });
  const bb = $("btn-bomba");
  if (bb) bb.onclick = () => {
    const cmId = parseInt(bb.dataset.cm);
    for (const u of assedi) GAME.bombarda(u.id, cmId);
    AUDIO.sfx("battaglia");
    sel.raggio = sel.unita.length ? GAME.raggioMovimento(sel.unita) : null;
    apriPannelloUnita(i); aggiornaTutto();
  };
}

// ---------- TOPBAR ----------
function aggiornaTopbar(){
  const st = GAME.st;
  if (!st) return;
  const f = st.fazioni[st.giocatore];
  const r = GAME.reseFazione(st.giocatore);
  $("info-era").innerHTML = `<b>${D().ERE[st.era].nome}</b> — ${GAME.annoStr(st.anno)} <span class="muto">(turno ${st.turno})</span>`;
  document.body.className = "era-"+st.era;
  const nComuni = st.comuni.filter(c=>c.fazione===st.giocatore).length;
  $("risorse").innerHTML =
    `💰 ${Math.floor(f.oro)} <span class="muto">(${r.oro>=0?"+":""}${r.oro.toFixed(1)})</span> &nbsp; `+
    `📜 +${r.scienza.toFixed(1)} &nbsp; 🎭 ${Math.floor(f.cultura)} &nbsp; 🏘️ ${nComuni}/${st.comuni.length}`;
  const t = D().TRATTI[f.leader.tratto];
  $("leader-box").innerHTML = `<canvas id="sov-topbar" width="40" height="46"></canvas>`+
    `<span class="lb-txt"><span style="color:${D().FAZIONI[st.giocatore].colore}">◆</span> ${f.leader.nome}<br><span class="muto">${ico(t, f.leader.tratto)} ${t.nome},${Math.round(f.leader.eta)} anni</span></span>`;
  const sovCv = $("sov-topbar");
  if (sovCv && ART.sovrano){
    const sc = sovCv.getContext("2d");
    ART.sovrano(sc, 20, 23, 38, 44, f.leader.look, st.giocatore);
  }
  // pulsante Regno: mostra la ricerca in corso e lampeggia se manca (o se ci sono aggiornamenti)
  const btnRegno = $("btn-regno");
  if (btnRegno){
    let txt = "👑 Regno";
    const daFare = GAME.unitaAggiornabili(st.giocatore).length + GAME.migliorieAggiornabili(st.giocatore).length;
    if (f.ricerca){
      const tt = D().TECH.find(x=>x.id===f.ricerca);
      txt = `👑 Regno · 📜 ${Math.min(100,Math.round(f.sciAcc/GAME.costoTech(tt)*100))}%`;
      btnRegno.classList.remove("pulsa");
    } else if (GAME.techDisponibili(st.giocatore).length){
      txt = "👑 Regno · 📜 scegli ricerca!";
      btnRegno.classList.add("pulsa");
    } else btnRegno.classList.remove("pulsa");
    if (daFare) txt += " ·  " + daFare + "▲";
    btnRegno.textContent = txt;
  }
}
function aggiornaRegistro(){
  const st = GAME.st;
  const box = $("registro");
  box.innerHTML = st.log.slice(0,5).map(l =>
    `<div class="log-riga log-${l.tipo}"><span class="muto">${l.anno}</span> ${l.testo}</div>`).join("");
}
function aggiornaTutto(){
  tutorialControlla();          // il tutorial guidato avanza solo quando l'azione e' stata fatta davvero
  aggiornaTopbar();
  aggiornaRegistro();
  aggiornaListaArmata();
  mostraFumetti();
  if (window.MAP) MAP.invalidate(); // il contenuto della mappa può essere cambiato: ricostruisci la cache
}
// svuota la coda delle reazioni-fumetto accumulate dal motore
function mostraFumetti(){
  const st = GAME.st; if (!st || !st.fumetti) return;
  while (st.fumetti.length){ const f = st.fumetti.shift(); battuta(f.tipo, f.ctx); }
}

// ---------- AIUTO ADATTIVO ----------
function incrAiuto(){ const st=GAME.st; if(!st) return; st.aiuto = st.aiuto||{azioni:0}; st.aiuto.azioni++; }
function livelloAiuto(){
  const a = (GAME.st && GAME.st.aiuto && GAME.st.aiuto.azioni) || 0;
  return a < 12 ? "alto" : (a < 45 ? "medio" : "basso");
}

// ---------- CONSIGLIERE (Don Calorio) ----------
let consTimer = null, consHex = -1;
function disegnaVoltoConsigliere(){
  const cv = $("cons-volto");
  if (cv && !cv.dataset.drawn){
    if (!(SPRITES.abilitato.ritratti && SPRITES.drawFit(cv.getContext("2d"), "ritratto_calorio", 36, 44, null, 84)))
      ART.consigliere(cv.getContext("2d"), 36, 46, 66, 82);
    cv.dataset.drawn = "1";
  }
}
function consigliere(id, testo, durata){
  disegnaVoltoConsigliere();
  const box = $("consigliere");
  $("cons-bolla").innerHTML = testo;
  box.classList.remove("nascosto");
  box.classList.remove("cons-in"); void box.offsetWidth; box.classList.add("cons-in");
  if (consTimer) clearTimeout(consTimer);
  consTimer = setTimeout(() => box.classList.add("nascosto"), durata || 6500);
}
// ---------- FUMETTI DEI PERSONAGGI ----------
// reazioni brevi con faccia + nuvoletta; frequenti ma non bloccanti
let fumTimer = null, fumCoda = [];
function disegnaVoltoFumetto(chi){
  const cv = $("fum-volto"); if (!cv) return;
  const cx = cv.getContext("2d"); cx.clearRect(0,0,cv.width,cv.height);
  if (chi.tipo === "calorio"){
    if (!(SPRITES.abilitato.ritratti && SPRITES.drawFit(cx, "ritratto_calorio", 30, 30, null, 58))) ART.consigliere(cx, 30, 34, 56, 62);
  }
  else {
    const st = GAME.st;
    const fid = chi.fid!==undefined ? chi.fid : (st?st.giocatore:0);
    const look = st && st.fazioni[fid] && st.fazioni[fid].leader ? st.fazioni[fid].leader.look : null;
    ART.sovrano(cx, 30, 30, 54, 58, look, fid);
  }
}
// mostra un fumetto (o lo accoda se ce n'è già uno)
function fumetto(chi, testo, durata){
  if (!$("fumetto")) return;
  fumCoda.push({ chi, testo, durata: durata||3600 });
  if (!fumTimer) prossimoFumetto();
}
function prossimoFumetto(){
  const box = $("fumetto");
  if (!fumCoda.length){ box.classList.add("nascosto"); fumTimer = null; return; }
  const f = fumCoda.shift();
  const st = GAME.st;
  let nome = "Don Calorio";
  if (f.chi.tipo !== "calorio"){
    const fid = f.chi.fid!==undefined ? f.chi.fid : (st?st.giocatore:0);
    nome = (st && st.fazioni[fid] && st.fazioni[fid].leader) ? st.fazioni[fid].leader.nome : D().FAZIONI[fid].nome;
  }
  disegnaVoltoFumetto(f.chi);
  $("fum-nome").textContent = nome;
  $("fum-testo").innerHTML = f.testo;
  box.classList.remove("nascosto");
  box.classList.remove("fum-in"); void box.offsetWidth; box.classList.add("fum-in");
  fumTimer = setTimeout(() => { fumTimer = null; prossimoFumetto(); }, f.durata);
}
// battute per tipo di evento (spesso ma brevi); {sov}=sovrano, {cal}=Don Calorio, {riv}=rivale
const BATTUTE = {
  conquista:  [["sov","Un'altra terra sotto la nostra corona! Avanti, picciotti!"],
               ["sov","{luogo} è nostra. Cu' non voli, si nni jssi!"],
               ["cal","Bravu, Maestà! U populu vi acclama."]],
  colonizzazione: [["sov","{luogo} si unisce a noi senza spargere sangue. Accussì si custruisce un regno!"],
               ["cal","Bravi i coloni, Maestà! {luogo} è già una di nuiautri."]],
  ricerca:    [["cal","'Na nova scoperta, Maestà: u sapiri è putenza."],
               ["sov","La saggezza illumina il regno. Continuiamo così."]],
  era:        [["cal","'Na nova era s'apri supra a Sicilia, Maestà."],
               ["sov","Cambia il tempo, ma non la corona!"]],
  costruito:  [["sov","Bella opera! La città splende di più."],
               ["cal","U vostru regnu ciurisci, Maestà."]],
  invasione:  [["sov","Nemici sulle coste! All'armi, difendiamo la Sicilia!"],
               ["cal","Attenti, Maestà: sbarcanu 'i stranei. Priparàmuni."]],
  guerra:     [["riv","La tua isola sarà mia, {sovrano}. Preparati alla guerra!"],
               ["riv","Basta pace: le mie armate marceranno su di te!"]],
  pace:       [["riv","Facciamo pace, {sovrano}. Il sangue è già troppo."],
               ["cal","Torna 'a paci, Maestà. Megghiu accussì."]],
  peste:      [["cal","'A pesti, Maestà... ca Diu ni scanza. Chiudìti 'i porti."],
               ["sov","Il morbo nero ci flagella. Coraggio, popolo mio."]],
  vittoriaBattaglia: [["sov","Vittoria! I nostri stendardi sventolano ancora!"],
               ["cal","Vincìstivu, Maestà! Chi battagghia!"]],
  sconfittaBattaglia:[["sov","Abbiamo perso uomini valorosi. Non sarà vano."],
               ["cal","Mala jurnata, Maestà. Ni rifarèmu."]],
  ambiente:   [["cal","Tuttu tranquillu ppi ora, Maestà. Sviluppàti u regnu."],
               ["sov","La Sicilia prospera. Che i raccolti siano generosi."],
               ["cal","U populu è cuntentu quannu c'è pani e paci."]],
  potere:     [["sov","{testo}"]],
  sponsor:    [["sov","Una tappa da {nome} e si riparte! I picciotti ringraziano."],
               ["cal","Nu muzzicuni ê {nome}, Maestà, e semu pronti."]]};
function battuta(tipo, ctx){
  const arr = BATTUTE[tipo]; if (!arr) return;
  const [chiT, txtBase] = arr[Math.floor(Math.random()*arr.length)];
  const st = GAME.st;
  let testo = txtBase
    .replace(/\{luogo\}/g, (ctx&&ctx.luogo)||"la città")
    .replace(/\{testo\}/g, (ctx&&ctx.testo)||"")
    .replace(/\{nome\}/g, (ctx&&ctx.nome)||"")
    .replace(/\{sovrano\}/g, st?st.fazioni[st.giocatore].leader.nome:"nemico");
  let chi = { tipo:"sovrano" };
  if (chiT==="cal") chi = { tipo:"calorio" };
  else if (chiT==="riv") chi = { tipo:"rivale", fid: (ctx&&ctx.fid!==undefined)?ctx.fid:0 };
  fumetto(chi, testo, tipo==="ambiente"?3200:3800);
  // voce solo quando parla Don Calorio in un momento che vale la pena sentire
  if (chiT==="cal"){
    if (tipo==="ambiente") { if (Math.random() < 0.5) AUDIO.parlaUna("don_ambiente", 8); }
    else if (tipo==="invasione") AUDIO.parlaUna("don_invasori", 2);
    else if (tipo==="colonizzazione"||tipo==="conquista") AUDIO.parlaUna("don_citta_presa", 3);
    else if (tipo==="costruito") AUDIO.parlaUna("don_meraviglia", 2);
  }
}

// valuta le proposte concrete e le mostra con Accetta / Rifiuta / Più tardi
function valutaConsigli(){
  const st = GAME.st; if (!st) return;
  const liv = livelloAiuto();
  if (liv === "basso") return;                 // esperto: nessuna proposta non richiesta
  st.consCooldown = st.consCooldown || {};
  const props = GAME.propostaConsigliere(st.giocatore);
  const prop = props.find(p => !st.consCooldown[p.id] || st.consCooldown[p.id] <= st.turno);
  if (!prop){ consHex = -1; return; }
  if (liv === "medio" && prop.prio < 8) return; // esperto-ish: solo cose importanti
  proponiAzione(prop);
}
// mostra una proposta con i tre bottoni
function proponiAzione(prop){
  disegnaVoltoConsigliere();
  const box = $("consigliere");
  consHex = (prop.hex != null) ? prop.hex : -1;
  $("cons-bolla").innerHTML = "«" + prop.testo + "»" +
    "<div class='cons-azioni'>" +
    "<button class='cons-btn cons-si'>✔ Accetta</button>" +
    "<button class='cons-btn cons-no'>✕ Rifiuta</button>" +
    "<button class='cons-btn cons-dopo'>⏳ Più tardi</button></div>";
  box.classList.remove("nascosto");
  box.classList.remove("cons-in"); void box.offsetWidth; box.classList.add("cons-in");
  // voce solo per le crisi vere: rivolta, casse vuote, carestia (le altre restano scritte)
  if (prop.prio >= 8){
    const id = String(prop.id||"") + " " + String(prop.testo||"").toLowerCase();
    if (/rivolt|malcontent|ribell/.test(id))         AUDIO.parlaUna("don_rivolta", 3);
    else if (/oro|denar|casse|tass|gabell/.test(id)) AUDIO.parlaUna("don_oro", 2);
    else if (/cibo|gran|fame|carest/.test(id))       AUDIO.parlaUna("don_fame", 2);
  }
  if (consTimer) clearTimeout(consTimer);
  consTimer = setTimeout(() => box.classList.add("nascosto"), 20000);
  box.querySelector(".cons-si").onclick = (e) => {
    e.stopPropagation();
    if (GAME.eseguiProposta(prop.azione)){ AUDIO.sfx("costruito"); GAME.aggiungiLog("✔ Fatto! " + prop.testo.split("?")[0], "bene"); }
    box.classList.add("nascosto"); aggiornaTutto();
  };
  box.querySelector(".cons-no").onclick = (e) => {
    e.stopPropagation(); GAME.st.consCooldown[prop.id] = GAME.st.turno + 10; box.classList.add("nascosto");
  };
  box.querySelector(".cons-dopo").onclick = (e) => {
    e.stopPropagation(); GAME.st.consCooldown[prop.id] = GAME.st.turno + 2; box.classList.add("nascosto");
  };
}
// tutorial contestuale al primo uso
// ---- battesimo di una città fondata nel nulla ----
const PRE_NOME = ["Borgo","Casale","Rocca","Torre","Serra","Villa","Poggio","Piano","Marina","Castel"];
const POST_NOME = ["Nuova","d'Oro","del Sole","Bella","Verde","Alta","Chiara","dei Venti","d'Aragona","Normanna",
                   "Sicula","Greca","del Grano","dell'Ulivo","di Ponente","di Levante"];
function nomeProposto(hex){
  const h = MAP.hexes[hex];
  const r = (n) => Math.abs(Math.sin(n*127.1+311.7)*43758.5453) % 1;
  const a = PRE_NOME[Math.floor(r(hex)*PRE_NOME.length)];
  const b = POST_NOME[Math.floor(r(hex*7+13)*POST_NOME.length)];
  return a + " " + b;
}
function chiediNomeCitta(u){
  const proposto = nomeProposto(u.hex);
  mostraModale({ titolo:"🏛️ Come si chiamerà?",
    testo:"Qui attorno non c'è nessun centro di rilievo: questa città nasce dal nulla, e il nome glielo dai tu.",
    html:`<div class="p-sotto muto">Scrivi il nome, o tieni quello proposto.</div>
          <input id="nome-citta-nuova" class="cs-input" maxlength="28" value="${proposto}">`,
    scelte:[{label:"Fonda la città", eff:"nulla"},{label:"Non ancora", eff:"no"}] },
    idx => {
      if (idx !== 0) return;
      const el = $("nome-citta-nuova");
      const nome = (el && el.value.trim()) || proposto;
      concludiFondazione(u, nome);
    });
  setTimeout(() => { const el=$("nome-citta-nuova"); if (el){ el.focus(); el.select(); } }, 60);
}
function concludiFondazione(u, nome){
  AUDIO.sfx("fondazione");
  const r = GAME.fondaCitta(u.id, nome);
  if (r.ok){
    AUDIO.sfx("vittoria"); AUDIO.parlaUna("don_citta_presa", 3);
    chiudiPannello(); aggiornaTutto(); mostraFumetti();
  } else {
    consigliere("cons", "«Qui non si può fondare, Maestà.»", 3000);
  }
}

// ================= TUTORIAL GUIDATO =================
// Non una scheda che spiega e sparisce: una sequenza di passi in cui il gioco CONTROLLA che
// l'azione sia stata davvero eseguita prima di andare avanti. Finche' non la fai, il passo
// resta li'. Cosi' alla fine del tutorial i comandi si conoscono per averli usati.
const PASSI_TUT = [
  { id:"seleziona", titolo:"Scegli una truppa",
    testo:"Clicca su una delle tue truppe, accanto alla città. Le caselle dove può andare si accendono di verde.",
    ok: () => sel.unita.length > 0 },
  { id:"muovi", titolo:"Falla camminare",
    testo:"Ora clicca una casella verde: la truppa ci si sposta. Ogni unità ha un tot di movimento per turno, e la montagna ne consuma di più della pianura.",
    ok: (st) => st.unita.some(u => u.fazione===st.giocatore && u.camminato) },
  { id:"esplora", titolo:"Manda l'esploratore a vedere",
    testo:"La mappa è coperta dalla nebbia: vedi solo attorno a casa tua. Seleziona l'<b>Esploratore</b> — vede più lontano di tutti — e mandalo verso il buio.",
    ok: (st, dati) => Object.keys(st.esplorato).length > dati.esploratoIniziale + 12 },
  { id:"fonda", titolo:"Fonda la tua seconda città",
    testo:"Il <b>Colono</b> serve a questo. Portalo a qualche casella di distanza dalla capitale e premi «Fonda qui la città di…». Prenderà il nome del luogo dove sorge.",
    ok: (st) => st.comuni.filter(c => c.fazione===st.giocatore && c.fondata).length >= 2 },
  { id:"produci", titolo:"Metti al lavoro una città",
    testo:"Clicca una tua città e scegli cosa produrre: altre truppe, un colono per espanderti ancora, o un edificio che la faccia crescere.",
    ok: (st) => st.comuni.some(c => c.fazione===st.giocatore && c.coda.length > 0) },
  { id:"ricerca", titolo:"Decidi cosa studiare",
    testo:"Apri <b>👑 Regno → Ricerca</b> e scegli una tecnologia. Le tecnologie sbloccano truppe, edifici e migliorie: senza, resti fermo all'età della pietra.",
    ok: (st) => { const f = st.fazioni[st.giocatore]; return !!f.ricerca || (f.percorsoRicerca && f.percorsoRicerca.length > 0); } },
  { id:"turno", titolo:"Chiudi il turno",
    testo:"Quando hai finito, premi <b>Fine Turno</b> in basso a destra. Il mondo si muove: le altre città crescono, i rivali agiscono, passano gli anni.",
    ok: (st, dati) => st.turno > dati.turnoIniziale }
];
let tutDati = null;

function tutorialAttivo(){ return !!(GAME.st && GAME.st.tut && GAME.st.tut.attivo); }

function avviaTutorial(){
  const st = GAME.st;
  st.tut = { attivo:true, passo:0 };
  tutDati = { esploratoIniziale: Object.keys(st.esplorato).length, turnoIniziale: st.turno };
  mostraPassoTut();
}
function fineTutorial(completato){
  const st = GAME.st;
  if (st && st.tut) st.tut.attivo = false;
  $("tutorial-card").classList.add("nascosto");
  try { localStorage.setItem("trinacria_tut_fatto", "1"); } catch(e){}
  if (completato){
    AUDIO.sfx("vittoria");
    mostraModale({ titolo:"🎓 Sai giocare",
      testo:"Hai mosso le truppe, esplorato, fondato una città, messo al lavoro la produzione, scelto cosa studiare e chiuso il turno. Il resto si impara giocando.\n\n"+
            "Se ti perdi, Don Calorio è sempre lì che suggerisce, e in ☰ Menu → Come si gioca trovi tutto scritto.",
      scelte:[{label:"Antudo!", eff:"nulla"}] }, ()=>{});
  }
}
function mostraPassoTut(){
  const st = GAME.st;
  if (!tutorialAttivo()) return;
  const p = PASSI_TUT[st.tut.passo];
  if (!p){ fineTutorial(true); return; }
  const card = $("tutorial-card");
  card.innerHTML = `<div class="tut-titolo">🎓 Passo ${st.tut.passo+1} di ${PASSI_TUT.length} — ${p.titolo}</div>`+
                   `<div class="tut-testo">${p.testo}</div>`+
                   `<button class="tut-ok" id="tut-salta">Salta il tutorial</button>`;
  card.classList.remove("nascosto");
  card.classList.remove("tut-in"); void card.offsetWidth; card.classList.add("tut-in");
  const b = $("tut-salta");
  if (b) b.onclick = () => fineTutorial(false);
}
// chiamata dopo ogni azione: se il passo corrente e' stato eseguito, si avanza
function tutorialControlla(){
  const st = GAME.st;
  if (!tutorialAttivo() || !tutDati) return;
  const p = PASSI_TUT[st.tut.passo];
  if (!p) { fineTutorial(true); return; }
  let fatto = false;
  try { fatto = !!p.ok(st, tutDati); } catch(e){ fatto = false; }
  if (!fatto) return;
  st.tut.passo++;
  AUDIO.sfx("costruito");
  if (st.tut.passo >= PASSI_TUT.length){ fineTutorial(true); return; }
  mostraPassoTut();
}
// domanda iniziale: solo alla prima partita, e comunque richiamabile dal Menu
function proponiTutorial(){
  let gia = false;
  try { gia = localStorage.getItem("trinacria_tut_fatto") === "1"; } catch(e){}
  if (gia) return false;
  mostraModale({ titolo:"🎓 Prima partita?",
    testo:"Posso guidarti nei primi passi: muovere le truppe, esplorare con la nebbia, fondare una città, far produrre, studiare e chiudere il turno.\n\n"+
          "Sono sette passi brevi, e a ognuno controllo che l'abbia fatto davvero. Puoi saltarlo quando vuoi.",
    scelte:[{label:"Sì, guidami", eff:"nulla"},{label:"No, so già giocare", eff:"no"}] },
    idx => { if (idx===0) avviaTutorial(); else fineTutorial(false); });
  return true;
}

function tutorial(id, titolo, testo){
  const st = GAME.st; if (!st) return;
  // Durante il tutorial guidato le schede contestuali tacciono: userebbero lo stesso riquadro
  // e cancellerebbero il passo in corso a meta' spiegazione.
  if (tutorialAttivo()) return;
  st.visti = st.visti || {};
  if (st.visti[id]) return;
  st.visti[id] = true;
  if (livelloAiuto() === "basso") return;
  const card = $("tutorial-card");
  card.innerHTML = `<div class="tut-titolo">💡 ${titolo}</div><div class="tut-testo">${testo}</div><button class="tut-ok">Capito!</button>`;
  card.classList.remove("nascosto");
  card.classList.remove("tut-in"); void card.offsetWidth; card.classList.add("tut-in");
  card.querySelector(".tut-ok").onclick = () => card.classList.add("nascosto");
}

// Schede sui sistemi che si sbloccano strada facendo. Ne esce UNA per volta e mai due
// nello stesso turno: sono spiegazioni, non un bombardamento.
function schedeNuoveMeccaniche(){
  const st = GAME.st;
  if (!st || tutorialAttivo()) return;
  const f = st.fazioni[st.giocatore];
  st.visti = st.visti || {};
  const mie = st.comuni.filter(function(c){ return c.fondata && c.fazione === st.giocatore; });

  if (st.turno >= 3 && !st.visti.come_si_vince)
    return tutorial("come_si_vince", "Si vince in quattro modi",
      "Non serve conquistare tutto. Puoi vincere per <b>conquista</b>, <b>cultura</b>, <b>scienza</b> o <b>ricchezza</b>.<br><br>Trovi le quattro strade e a che punto sei in <b>👑 Regno → Come si vince</b>. Guarda anche quanto sono avanti i rivali: è una corsa.");

  if (!st.visti.intuizioni && f.intuizioni && Object.keys(f.intuizioni).length > 0)
    return tutorial("intuizioni", "Le intuizioni",
      "Hai appena scontato una ricerca del <b>40%</b> facendo una cosa sulla mappa, non pagandola.<br><br>Ogni tecnologia ha la sua: fondare sulla costa, battere i briganti, costruire un mercato. Le trovi scritte sotto ogni ricerca con la 💡.");

  for (const cm of mie){
    const q = GAME.quartieriDisponibili(cm);
    if (q.length && !st.visti.quartieri)
      return tutorial("quartieri", "I quartieri",
        "Un quartiere non sta dentro la città: occupa una <b>casella del territorio</b>, e rende in base a <b>cosa ha intorno</b>.<br><br>Una Fucina fra i monti vale il doppio della stessa Fucina in pianura. Quando ne scegli uno, la mappa ti accende le caselle possibili col numero di quanto renderebbero.");
    const ca = GAME.caseComune(cm);
    if (cm.pop >= ca.n && !st.visti.case)
      return tutorial("case", "Le case mettono un tetto",
        cm.nome+" non può più crescere: ha <b>"+cm.pop+" abitanti e "+ca.n+" case</b>.<br><br>Servono granaio, acquedotti, campi coltivati, un porto o una Marina. È il motivo per cui certi edifici esistono.");
    const fe = GAME.fedeltaDelta(cm);
    if (cm.fedelta !== undefined && cm.fedelta < 85 && !st.visti.fedelta)
      return tutorial("fedeltà", "La fedeltà delle città",
        cm.nome+" è a <b>"+Math.round(cm.fedelta)+" di fedeltà</b>. Le città vicine fanno pressione: le tue la tengono su, quelle altrui la tirano giù.<br><br>Sotto 75 rende meno, a zero si ribella e diventa <b>città libera</b>. Le conquiste lontane da casa non si tengono con le sole truppe.");
  }

  if (!st.visti.editti && GAME.edittiDisponibili(st.giocatore).length && !(f.editti||[]).filter(Boolean).length)
    return tutorial("editti", "Gli editti",
      "Puoi proclamare un <b>editto</b>: una scelta politica che vale per tutto il regno.<br><br>Hanno tutti un prezzo — il Latifondo dà cibo ma scontenta, la Corvée dà produzione ma toglie oro. Stanno in <b>👑 Regno → Editti</b>, il primo seggio è gratis.");

  if (!st.visti.grandi){
    // statoGrandi restituisce un ELENCO di categorie, non un oggetto con .disponibili:
    // la scheda esce appena una categoria comincia ad accumulare punti
    const sg = GAME.statoGrandi ? GAME.statoGrandi(st.giocatore) : null;
    if (sg && sg.some(function(c){ return c.punti > 0; }))
      return tutorial("grandi", "I Grandi Siciliani",
        "Archimede, Antonello, Federico II: <b>ventiquattro figure storiche</b>, una sola copia ciascuna.<br><br>I quartieri generano i punti per reclutarli, e chi arriva primo se lo prende. Otto Grandi più quattro meraviglie sono una <b>vittoria culturale</b>.");
  }
  return null;
}
// ---------- LISTA ESERCITO ----------
function aggiornaListaArmata(){
  const st = GAME.st;
  const box = $("armata");
  if (!box) return;
  if (!st){ box.classList.add("nascosto"); return; }
  const mie = st.unita.filter(u => u.fazione === st.giocatore);
  if (!mie.length){ box.classList.add("nascosto"); return; }
  const perHex = {};
  for (const u of mie) (perHex[u.hex] = perHex[u.hex] || []).push(u);
  const nFerme = GAME.unitaFerme(st.giocatore).length;
  let html = `<div class="ar-titolo">⚔️ Esercito <span class="muto">(${mie.length})</span></div>`;
  html += nFerme ? `<div class="ar-ferme">▸ ${nFerme} da gestire</div>` : `<div class="ar-ok">✓ tutte gestite</div>`;
  const keys = Object.keys(perHex).sort((a,b)=>{
    const fa = perHex[a].some(u=>u.mov>0 && !u.goto && !u.fortificata);
    const fb = perHex[b].some(u=>u.mov>0 && !u.goto && !u.fortificata);
    return (fb?1:0)-(fa?1:0);
  });
  for (const k of keys){
    const lista = perHex[k], u0 = lista[0];
    const ferma = lista.some(u=>u.mov>0 && !u.goto && !u.fortificata);
    const stato = u0.goto!=null ? "🚶 in marcia" : (u0.fortificata ? "🛡️ di guardia" : (ferma ? "● da muovere" : "✓ mossa"));
    const nome = D().UNITA[u0.tipo] ? D().UNITA[u0.tipo].nome : u0.tipo;
    html += `<div class="ar-riga ${ferma?'da-muovere':''}" data-hex="${k}">
      <span class="ar-n">${lista.length}</span>
      <span class="ar-info"><b>${nome}</b><br><span class="muto">${nomeLuogo(parseInt(k))} · ${stato}</span></span>
    </div>`;
  }
  box.innerHTML = html;
  box.classList.remove("nascosto");
  box.querySelectorAll("[data-hex]").forEach(r => r.onclick = () => {
    const hex = parseInt(r.dataset.hex);
    centraSu(hex); selezionaHex(hex); aggiornaTutto();
  });
  const titolo = box.querySelector(".ar-titolo");
  if (titolo) titolo.onclick = (e) => { e.stopPropagation(); box.classList.toggle("espansa"); };
}

// ---------- MODALI ----------
let codaModali = [];
function mostraModale(evt, cb){
  const sf = $("modale-sfondo");
  const m = $("modale");
  let html = "";
  if (evt.img) html += `<div class="m-illustr"><img src="assets/${evt.img}.jpg" alt=""></div>`;
  if (evt.ritratto) html += `<canvas class="m-ritratto" width="200" height="260"></canvas>`;
  if (evt.ritrattoGrande !== undefined && evt.ritrattoGrande !== null)
    html += `<canvas class="m-ritratto" id="m-grande" width="200" height="260"></canvas>`;
  html += `<div class="m-titolo">${evt.titolo}</div>`;
  if (evt.html) html += evt.html;
  if (evt.testo) html += `<div class="m-testo">${evt.testo.replace(/\n/g,"<br>")}</div>`;
  html += `<div class="m-scelte">`;
  evt.scelte.forEach((s, k) => {
    const caro = s.costoOro && GAME.st.fazioni[GAME.st.giocatore].oro < s.costoOro;
    html += `<button class="m-btn" data-k="${k}" ${caro?"disabled":""}>${s.label}${s.desc?`<span class="m-desc">${s.desc}</span>`:""}</button>`;
  });
  html += `</div>`;
  m.innerHTML = html;
  sf.classList.remove("nascosto");
  // ritratto araldico su canvas
  if (evt.ritratto){
    const cv = m.querySelector(".m-ritratto");
    if (cv){
      const cc = cv.getContext("2d");
      // ritratto AI del sovrano iniziale della casata; per i leader successivi resta il ritratto araldico procedurale
      const st = GAME.st, fz = st && st.fazioni[evt.ritratto.fid];
      const iniziale = fz && fz.leader && D().LEADER_STORICI[evt.ritratto.fid] && fz.leader.nome === D().LEADER_STORICI[evt.ritratto.fid][0];
      if (!(iniziale && SPRITES.abilitato.ritratti && SPRITES.drawFit(cc, "ritratto_"+evt.ritratto.fid, 100, 130, null, 240)))
        ART.ritratto(cc, 100, 130, 176, 232, evt.ritratto.fid, evt.ritratto.tratto);
    }
  }
  if (evt.ritrattoGrande !== undefined && evt.ritrattoGrande !== null){
    const cv = $("m-grande");
    if (cv){
      const cc = cv.getContext("2d");
      const id = "grande_" + evt.ritrattoGrande;
      if (!(SPRITES.abilitato.ritratti && SPRITES.drawFit(cc, id, 100, 130, null, 250)))
        ART.ritratto(cc, 100, 130, 176, 232, GAME.st.giocatore, null);
    }
  }
  // animazione d'ingresso
  m.classList.remove("m-anim"); void m.offsetWidth; m.classList.add("m-anim");
  m.querySelectorAll(".m-btn").forEach(b => b.onclick = () => {
    sf.classList.add("nascosto");
    AUDIO.sfx("click");
    cb(parseInt(b.dataset.k));
  });
}
function processaPending(){
  const st = GAME.st;
  if (!st) return;
  if (!st.pending.length){ if (typeof pianificaAuto === "function") pianificaAuto(); return; }
  const evt = st.pending.shift();
  // il rintocco grande e' del cambio d'era; gli altri eventi hanno la campana normale
  AUDIO.sfx(evt.titolo && /^[⏳🔱👑]/.test(evt.titolo) ? "era" : "campana");
  if (evt.vox) AUDIO.parla(evt.vox);      // narratore: solo sugli eventi che contano
  // tocco cinematografico sugli eventi maggiori (ere, invasioni, disastri)
  if (window.FX && evt.titolo && /^[🔱🚨💥☠🔥⚱👑]/.test(evt.titolo)){
    FX.cinema(1.6);
    if (/[💥☠🔥]/.test(evt.titolo)) FX.flash("180,40,30",0.5); else FX.flash("240,207,106",0.4);
  }
  mostraModale(evt, idx => {
    GAME.applicaScelta(evt, idx);
    aggiornaTutto();
    processaPending();
  });
}

// ---------- FINE TURNO ----------
let inTurno = false;
let scelta = null;      // scelta del sito della capitale prima dell'inizio
function fineTurno(force){
  if (inTurno || !GAME.st) return;
  if (!$("modale-sfondo").classList.contains("nascosto")) return;
  if (!force){
    const f = GAME.st.fazioni[GAME.st.giocatore];
    if (!f.ricerca && !(f.percorsoRicerca && f.percorsoRicerca.length)){ proponiRicerca(); return; }
    const ferme = GAME.unitaFerme(GAME.st.giocatore);
    if (ferme.length){ proponiAutoTruppe(ferme); return; }
    const citta = GAME.cittaDaGestire(GAME.st.giocatore);
    if (citta.length){ proponiAutoCitta(citta); return; }
  }
  eseguiFineTurno();
}
// nessuna ricerca impostata: chiedi prima di proseguire col resto del turno
function proponiRicerca(){
  const st = GAME.st;
  if (!GAME.techDisponibili(st.giocatore).length){ proseguiDopoRicerca(); return; }
  mostraModale({ titolo:"📜 Nessuna ricerca in corso",
    testo:"Il tuo regno non sta studiando nulla di nuovo. Come vuoi procedere?",
    scelte:[
      {label:"📜 Scelgo io", desc:"Apri l'elenco completo e imposta un percorso"},
      {label:"🎓 Suggeriscimi un percorso", desc:"Accoda automaticamente le 4 ricerche più economiche"},
      {label:"⏭ Ignora per ora", desc:"Nessuna scienza accumulata finché non scegli"}
    ] }, idx => {
      if (idx===0){ apriRicerca(); return; }
      if (idx===1){ GAME.suggerisciPercorso(st.giocatore); AUDIO.sfx("click"); aggiornaTutto(); }
      proseguiDopoRicerca();
    });
}
function proseguiDopoRicerca(){
  const ferme = GAME.unitaFerme(GAME.st.giocatore);
  if (ferme.length){ proponiAutoTruppe(ferme); return; }
  const citta = GAME.cittaDaGestire(GAME.st.giocatore);
  if (citta.length){ proponiAutoCitta(citta); return; }
  eseguiFineTurno();
}
// modalità automatica (chiesta ogni turno, non memorizzata): prima le truppe ferme...
function proponiAutoTruppe(ferme){
  mostraModale({ titolo:"🪖 "+ferme.length+" "+(ferme.length===1?"truppa ferma":"truppe ferme"),
    testo:"Come vuoi gestire le truppe che non hanno ancora ordini questo turno?",
    scelte:[
      {label:"⚔️ Agisci automaticamente", desc:"Truppe: conquista · Coloni: fonda città · Lavoratori: migliora — ognuno secondo il suo mestiere"},
      {label:"🛡️ Fortifica tutte", desc:"Restano di guardia: si curano e non compaiono più tra quelle da gestire"},
      {label:"🖐 Le gestisco io", desc:"Passale in rassegna una per una"},
      {label:"⏭ Lascia così, finisci il turno", desc:"Non cambia nulla per loro: salta direttamente alla fine del turno"}
    ] }, idx => {
      if (idx===2){ autoAvanza(); return; }
      if (idx===3){ eseguiFineTurno(); return; }
      if (idx===0) autoEsploraTruppe(ferme); else for (const u of ferme) GAME.fortifica(u.id);
      AUDIO.sfx("click"); aggiornaTutto();
      // poi (nello stesso turno) le città senza ordini
      const citta = GAME.cittaDaGestire(GAME.st.giocatore);
      if (citta.length) proponiAutoCitta(citta); else eseguiFineTurno();
    });
}
// ...poi le città senza produzione in coda: 3 carte per città (una decisione secca invece di una lista)
function proponiAutoCitta(citta){ proponiCarteCitta(citta, 0); }
function proponiCarteCitta(citta, k){
  if (k >= citta.length){ eseguiFineTurno(); return; }
  const cm = citta[k];
  if (cm.coda.length){ proponiCarteCitta(citta, k+1); return; }
  const carte = GAME.carteCostruzione(cm);
  if (!carte.length){ proponiCarteCitta(citta, k+1); return; }
  const scelte = carte.map(c => ({ label: (c.icona||"🏗️")+" "+c.nome, desc: (c.costo+"⚒️ — "+(c.eff||"")).trim() }));
  scelte.push({ label:"🏘️ Apri la città", desc:"Lista completa di reclutamento e costruzioni" });
  scelte.push({ label:"🤖 Automatico per tutte", desc:"Scelgo io per questa e per le altre città senza ordini" });
  const centra = () => { const h = MAP.hexes[cm.hex]; view.x = window.innerWidth/2 - h.x*view.z; view.y = window.innerHeight/2 - h.y*view.z; };
  centra();
  mostraModale({ titolo:"🏗️ Cosa costruiamo a "+cm.nome+"?", testo:"("+(k+1)+" di "+citta.length+") ⚒️ "+cm.prodAcc.toFixed(0)+" produzione accumulata, 👥 "+cm.pop+" abitanti", scelte }, idx => {
    if (idx < carte.length){
      const c = carte[idx];
      GAME.accoda(cm.id, c.tipo==="unita" ? { tipo:"unita", id:c.id, costo:c.costo } : c);
      AUDIO.sfx("costruito"); aggiornaTutto();
      proponiCarteCitta(citta, k+1);
    } else if (idx === carte.length){
      apriPannelloCitta(cm);
    } else {
      for (const c of citta.slice(k)){ const item = GAME.miglioreCostruzione(c); if (item && !c.coda.length) GAME.accoda(c.id, item); }
      AUDIO.sfx("click"); aggiornaTutto();
      eseguiFineTurno();
    }
  });
}
// ---------- TURNO AUTOMATICO ----------
// se non c'è nulla da decidere (niente eventi, truppe ferme, città senza ordini, ricerca vuota,
// crisi in corso), il turno successivo parte da solo dopo una breve pausa: i turni "morti" durano un secondo
let autoTurno = (() => { try { return localStorage.getItem("trinacria_auto") !== "0"; } catch(e){ return true; } })();
let autoTimer = null;
function impostaAuto(on){
  autoTurno = on; try { localStorage.setItem("trinacria_auto", on ? "1" : "0"); } catch(e){}
  const b = $("btn-auto"); if (b){ b.classList.toggle("attivo", on); b.title = on ? "Turno automatico attivo: i turni senza decisioni passano da soli" : "Turno automatico spento"; }
  if (!on) annullaAuto();
}
function annullaAuto(){ if (autoTimer){ clearTimeout(autoTimer); autoTimer = null; } const b=$("btn-turno"); if (b && !inTurno){ b.textContent = "Fine Turno ⏭"; b.classList.remove("auto"); } }
function pianificaAuto(){
  annullaAuto();
  const st = GAME.st;
  if (!autoTurno || !st || st.vittoria || inTurno) return;
  if (!$("modale-sfondo").classList.contains("nascosto") || st.pending.length) return;
  const f = st.fazioni[st.giocatore];
  if (!f.ricerca && !(f.percorsoRicerca && f.percorsoRicerca.length) && GAME.techDisponibili(st.giocatore).length) return;
  if (GAME.unitaFerme(st.giocatore).length || GAME.cittaDaGestire(st.giocatore).length) return;
  if (GAME.suggerimenti(st.giocatore).some(s => s.prio >= 9)) return;   // crisi: fermati e guarda
  const b = $("btn-turno"); b.textContent = "⏩ Turno automatico… (tocca per fermare)"; b.classList.add("auto");
  autoTimer = setTimeout(() => { autoTimer = null; b.classList.remove("auto"); fineTurno(); }, 900);
}
// azione automatica per le truppe ferme, diversa per tipo: i lavoratori migliorano le
// campagne vicine, i coloni cercano una città indipendente indifesa da fondare, le truppe
// da combattimento (raggruppate per esagono) cercano il bersaglio più vicino da conquistare;
// se per un'unità non c'è nulla di sensato da fare, esplora verso la frontiera/nebbia più
// vicina e in ultima istanza si fortifica (garantisce sempre di "smaltire" la lista).
function autoEsploraTruppe(ferme){
  const st = GAME.st;
  const esploraSingola = (u) => {
    let dest = st.nebbia ? trovaHexNonEsplorato(u.hex) : null;
    if (dest==null) dest = trovaFrontieraPiuVicina(u.hex);
    if (dest!=null && dest!==u.hex && GAME.impostaGoto(u.id, dest)) return;
    GAME.fortifica(u.id);
  };
  const gruppiCombattimento = {};
  for (const u of ferme){
    if (u.tipo==="lavoratore"){
      const r = GAME.miglioramentoAutomatico(u.id);
      if (!r.ok) GAME.fortifica(u.id);
      continue;
    }
    if (u.tipo==="colono"){
      const r = GAME.autoColonizza(u.id);
      if (!r.ok) esploraSingola(u);
      continue;
    }
    (gruppiCombattimento[u.hex] = gruppiCombattimento[u.hex] || []).push(u.id);
  }
  for (const hex of Object.keys(gruppiCombattimento)){
    const uids = gruppiCombattimento[hex];
    const r = GAME.autoConquista(uids, st.giocatore);
    if (r.ok) continue;
    for (const uid of uids){
      const u = st.unita.find(x=>x.id===uid);
      if (u) esploraSingola(u);
    }
  }
}
function trovaHexNonEsplorato(startHex){
  const visti = {}; visti[startHex]=true; const coda=[startHex]; let passi=0;
  while (coda.length && passi<500){
    const cur = coda.shift(); passi++;
    for (const nb of MAP.vicini(cur)){
      if (visti[nb]) continue; visti[nb]=true;
      if (!GAME.hexEsplorato(nb)) return nb;
      coda.push(nb);
    }
  }
  return null;
}
function trovaFrontieraPiuVicina(startHex){
  const st = GAME.st;
  let best=null, bd=1e9;
  for (const cm of st.comuni){
    if (cm.fazione === st.giocatore) continue;
    const d = MAP.distKm(startHex, cm.hex);
    if (d<bd){ bd=d; best=cm.hex; }
  }
  return best;
}
function eseguiFineTurno(){
  inTurno = true;
  $("btn-turno").disabled = true;
  $("btn-turno").textContent = "⏳ La Sicilia si muove...";
  const eraPrima = GAME.st.era;
  setTimeout(() => {
    GAME.fineTurno();
    AUDIO.sfx("turno");
    if (GAME.st.era !== eraPrima){          // cambio d'era: nuovo tema e battuta del consigliere
      AUDIO.temaEra(GAME.st.era);
      AUDIO.parla("don_era_" + GAME.st.era);
      inGuerraPrima = false;                // il tema di battaglia va rivalutato sulla nuova era
    }
    aggiornaMusicaGuerra();
    sel = { hex:-1, unita:[], raggio:null };
    chiudiPannello();
    aggiornaTutto();
    $("btn-turno").disabled = false;
    $("btn-turno").textContent = "Fine Turno ⏭";
    inTurno = false;
    const eventoMostrato = mostraEventiTurno();
    processaPending();
    // battuta ambientale nei turni tranquilli (spesso ma breve)
    if (!eventoMostrato && (!GAME.st.fumetti || !GAME.st.fumetti.length) && Math.random()<0.22) battuta("ambiente");
    if (!GAME.st.vittoria && !eventoMostrato){ valutaConsigli(); schedeNuoveMeccaniche(); }
    controllaFinePartita();
    if (!eventoMostrato) pianificaAuto();
  }, 60);
}

// Il tema di battaglia sostituisce quello dell'era finché il giocatore è in guerra con
// qualcuno (o ha invasori dentro casa); tornata la pace, si riprende il tema dell'era.
let inGuerraPrima = false;
function aggiornaMusicaGuerra(){
  const st = GAME.st; if (!st || !AUDIO.musicaOn) return;
  const f = st.fazioni[st.giocatore];
  const guerra = Object.values(f.diplo||{}).some(d => d.stato === "guerra")
    || st.comuni.some(c => c.fazione >= 100);
  if (guerra === inGuerraPrima) return;
  inGuerraPrima = guerra;
  if (guerra) AUDIO.temaBattaglia(); else AUDIO.fineBattaglia();
}

// evidenzia e centra sullo scontro più importante del turno IA che tocca il giocatore
function mostraEventiTurno(){
  const st = GAME.st;
  if (!st.eventiTurno || !st.eventiTurno.length) return false;
  const ev = st.eventiTurno.slice().sort((a,b)=>(a.vinta?1:0)-(b.vinta?1:0))[0];
  const h = MAP.hexes[ev.hex]; if (!h) return false;
  centraSu(ev.hex);
  if (window.FX){ FX.pulse(h.x, h.y, ev.vinta?"#6fbf6f":"#e05540", 24); FX.battle(h.x, h.y, ev.vinta); }
  AUDIO.sfx(ev.vinta ? "vittoria" : "battaglia");
  AUDIO.parlaUna(ev.vinta ? "don_vinta" : "don_persa", 3);
  const dove = ev.nome ? (" a "+ev.nome) : "";
  consigliere("scontro", ev.vinta
    ? "«Bona nova, Maestà! Li nostri hannu vintu"+dove+"! 🛡️»"
    : "«Maestà, ni hannu attaccatu"+dove+"! Curriti a vidiri chi successi.»", 7000);
  consHex = ev.hex;
  return true;
}

function controllaFinePartita(){
  const st = GAME.st;
  if (!st.vittoria || st.continua) return;
  const vi = st.vittoriaInfo;
  if (st.vittoria==="vinta"){
    AUDIO.sfx("vittoria"); AUDIO.parla("don_vittoria");
    mostraModale({ titolo: vi ? vi.icona+" VITTORIA DI "+vi.nome.toUpperCase() : "🔱 TRINACRIA È TUA!",
      testo:(vi ? "Hai vinto per "+vi.nome.toLowerCase()+".\n\n" : "")+
        "Da Messina a Marsala, da Cefalù a Pachino, ogni campanile suona per te.\n\n"+
        st.fazioni[st.giocatore].leader.nome+" di "+st.fazioni[st.giocatore].nome+" regna sulla Sicilia unita, nell'anno "+GAME.annoStr(st.anno)+", dopo "+st.turno+" turni di sangue, grano e gloria.\n\n«Cu' avi 'a Sicilia, avi u munnu.»",
      scelte:[{label:"Continua a regnare", eff:"nulla"},{label:"Nuova partita", eff:"nuova"}] }, idx => {
        if (idx===1) location.reload();
        else st.continua = true;
      });
  } else {
    AUDIO.sfx("sconfitta"); AUDIO.parla("don_sconfitta");
    const battuto = vi && vi.fazione !== st.giocatore;
    mostraModale({ titolo: battuto ? "🏳️ Ti hanno battuto sul tempo" : "⚰️ La tua dinastia si spegne",
      testo: battuto
        ? vi.nomeFazione+" ha vinto per "+vi.nome.toLowerCase()+" nell'anno "+GAME.annoStr(st.anno)+".\n\nLa tua dinastia è ancora in piedi, ma la storia ricorderà loro.\n\n«Cu' arriva primu, s'assetta.»"
        : "L'ultima città è caduta, l'ultimo stendardo è bruciato. La storia della Sicilia continuerà — ma senza di te.\n\n«Cu' nesci, arrinesci... ma tu nun ha' nisciutu.»",
      // Perdere una CORSA non è perdere il regno: se un rivale arriva primo, il giocatore
      // deve poter tirare avanti fino al 1700 invece di trovarsi il gioco chiuso in faccia.
      scelte: battuto ? [{label:"Continua fino al 1700", eff:"nulla"},{label:"Nuova partita", eff:"nuova"}]
                      : [{label:"Nuova partita", eff:"nuova"}] },
      idx => { if (!battuto || idx===1) location.reload(); else st.continua = true; });
  }
}

// ---------- RICERCA ----------
// ---------- POI SPONSOR (prototipo fase 1) ----------
function apriSponsor(spIdx){
  const st = GAME.st;
  const sp = MAP.sponsor[spIdx]; if (!sp) return;
  centraSu(sp.hex);
  const maps = "https://www.google.com/maps/search/?api=1&query="+sp.lat+","+sp.lon;
  const zona = [sp.hex, ...MAP.vicini(sp.hex)];
  const vicine = st.unita.filter(u => u.fazione===st.giocatore && zona.includes(u.hex)).length;
  const cd = st.sponsorCd && st.sponsorCd[spIdx];
  const inCd = cd && cd > st.turno;
  let html = `<div class="sp-head">
      <div class="sp-logo" style="background:${sp.colore}">${sp.cat}</div>
      <div class="sp-tit"><div class="sp-nome">${sp.nome}</div><div class="sp-cat">${sp.categoria}</div></div>
    </div>
    <div class="sp-desc">${sp.desc}</div>`;
  if (sp.tel) html += `<div class="sp-riga">📞 <a href="tel:${sp.tel.replace(/\s/g,'')}">${sp.tel}</a></div>`;
  html += `<button class="btn-lista sp-maps" id="sp-maps">📍 Apri in Google Maps</button>`;
  if (vicine && !inCd)
    html += `<button class="btn-lista sp-rif" id="sp-rif">☕ Rifocillati qui — +vigore a ${vicine} ${vicine===1?"truppa":"truppe"}</button>`;
  else if (vicine && inCd)
    html += `<div class="sp-riga muto">☕ Già visitato — di nuovo dal turno ${cd}</div>`;
  else
    html += `<div class="sp-riga muto">Porta delle truppe qui vicino per «Rifocillarti».</div>`;
  html += `<div class="sp-ad">Spazio pubblicitario · dimostrativo</div>`;
  apri(html);
  const bm = $("sp-maps");
  if (bm) bm.onclick = () => { try { window.open(maps, "_blank", "noopener"); } catch(e){ GAME.aggiungiLog("Apri: "+maps, "info"); aggiornaTutto(); } };
  const br = $("sp-rif");
  if (br) br.onclick = () => {
    const r = GAME.rifocilla(spIdx);
    if (r.ok){ AUDIO.sfx("costruito"); incrAiuto(); apriSponsor(spIdx); aggiornaTutto(); mostraFumetti(); }
  };
}

// card leggera per un POI di fantasia — nome + link a Maps + invito a "prenderne il posto"
function apriPOI(idx){
  const p = MAP.poi[idx]; if (!p) return;
  centraSu(p.hex);
  const maps = "https://www.google.com/maps/search/?api=1&query="+p.lat+","+p.lon;
  let html = `<div class="sp-head">
      <div class="sp-logo poi-logo">${p.c}</div>
      <div class="sp-tit"><div class="sp-nome">${p.n}</div><div class="sp-cat">Locale di fantasia — questo posto è libero</div></div>
    </div>
    <button class="btn-lista sp-maps" id="poi-maps">📍 Apri la zona in Google Maps</button>
    <button class="btn-lista" id="poi-sponsor">🏪 Inserisci qui la tua vera attività</button>
    <div class="sp-ad">Nome di fantasia, nessun legame con locali reali — prendine il posto tu</div>`;
  apri(html);
  const bm = $("poi-maps");
  if (bm) bm.onclick = () => { try { window.open(maps, "_blank", "noopener"); } catch(e){ GAME.aggiungiLog("Apri: "+maps, "info"); aggiornaTutto(); } };
  const bs = $("poi-sponsor");
  if (bs) bs.onclick = () => apriSponsorForm({ nome:p.n, cat:p.c, lat:p.lat, lon:p.lon });
}

// ---------- PORTALE SPONSOR (prototipo fase 2): form + anteprima + demo locale + richiesta ----------
const SPONSOR_CONTATTO = "info@danilopuglisi.com";  // ⇦ email dove arrivano le richieste (modificabile)
const SP_CAT = ["🍔","🍕","☕","🍦","🍺","🍽️","🥐","🛍️","💈","🏨","⛽","🏋️"];
function apriSponsorForm(pre){
  const st = GAME.st;
  pre = pre || {};
  // città selezionabili (capoluoghi + qualche centro), per posizionare lo sponsor
  const citta = ["Catania","Palermo","Messina","Siracusa","Trapani","Agrigento","Enna","Ragusa","Taormina","Marsala","Caltanissetta","Cefalù"]
    .filter(n => GAME.st.comuni.some(c=>c.nome===n));
  let html = `<div class="spf">
    <p class="spf-intro">Anteprima di come apparirebbe la tua attività sulla mappa. È una <b>demo</b>: prova subito il pin nel gioco, oppure richiedi lo spazio.</p>
    <label>Nome attività<input id="spf-nome" maxlength="30" value="${(pre.nome||'').replace(/"/g,'&quot;')}" placeholder="Es. Bar Centrale"></label>
    <label>Categoria (icona)<div id="spf-cats"></div></label>
    <label>Città<select id="spf-citta">${citta.map(n=>`<option>${n}</option>`).join("")}</select></label>
    <label>Telefono<input id="spf-tel" maxlength="24" placeholder="+39 ..."></label>
    <label>Descrizione<textarea id="spf-desc" maxlength="140" rows="2" placeholder="Cosa offri ai giocatori di passaggio"></textarea></label>
    <div class="spf-prev"><canvas id="spf-canvas" width="120" height="150"></canvas>
      <div class="spf-hint">Anteprima pin</div></div>
    <button class="btn-lista sp-rif" id="spf-prova">✨ Provalo subito nel gioco (demo locale)</button>
    <button class="btn-lista sp-maps" id="spf-invia">✉️ Richiedi questo spazio</button>
    <button class="btn-lista" id="spf-reset">🗑 Rimuovi i miei sponsor demo</button>
    <div class="sp-ad">Prototipo · gli spazi reali si concordano col titolare del gioco</div>
  </div>`;
  mostraModale({ titolo:"📣 Diventa Sponsor", html, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  // selettore categoria
  let catSel = pre.cat && SP_CAT.includes(pre.cat) ? pre.cat : "🍔";
  const catsBox = $("spf-cats");
  const renderCats = () => { catsBox.innerHTML = SP_CAT.map(e=>`<button type="button" class="spf-cat ${e===catSel?'sel':''}" data-e="${e}">${e}</button>`).join("");
    catsBox.querySelectorAll(".spf-cat").forEach(b=>b.onclick=()=>{ catSel=b.dataset.e; renderCats(); aggiornaPrev(); }); };
  const colori = ["#c0392b","#e67e22","#2980b9","#27ae60","#8e44ad","#d4a017"];
  const coloreFor = s => colori[[...s].reduce((a,c)=>a+c.charCodeAt(0),0) % colori.length];
  function datiForm(){
    const nome = ($("spf-nome").value||"").trim() || "La tua attività";
    return { nome, cat:catSel, colore:coloreFor(nome), tel:($("spf-tel").value||"").trim(),
             desc:($("spf-desc").value||"").trim() || "La tua descrizione qui.", citta:$("spf-citta").value };
  }
  function aggiornaPrev(){
    const d = datiForm();
    const cv = $("spf-canvas"); if (!cv) return; const c = cv.getContext("2d");
    c.clearRect(0,0,cv.width,cv.height);
    // pin stile mappa
    const x=60, y=64, r=22;
    c.beginPath(); c.arc(x,y,r+4,0,7); c.fillStyle="rgba(240,207,106,0.3)"; c.fill();
    c.fillStyle=d.colore; c.beginPath(); c.moveTo(x-7,y+r*0.6); c.lineTo(x+7,y+r*0.6); c.lineTo(x,y+r+16); c.closePath(); c.fill();
    c.beginPath(); c.arc(x,y,r,0,7); c.fillStyle="#fff"; c.fill(); c.lineWidth=4; c.strokeStyle=d.colore; c.stroke();
    c.font="26px serif"; c.textAlign="center"; c.textBaseline="middle"; c.fillText(d.cat, x, y+1);
    c.font="bold 12px Georgia"; c.fillStyle="#e8dcc0"; c.fillText(d.nome.slice(0,16), x, y+r+30);
  }
  renderCats(); aggiornaPrev();
  ["spf-nome","spf-tel","spf-desc"].forEach(id=>{ const el=$(id); if(el) el.oninput=aggiornaPrev; });
  $("spf-prova").onclick = () => {
    const d = datiForm();
    const cm = GAME.st.comuni.find(c=>c.nome===d.citta);
    const raw = window.DATA_COMUNI.find(r=>r[0]===d.citta);
    if (!raw) return;
    const seed = [...d.nome].reduce((a,c)=>a+c.charCodeAt(0),0);
    const lat = raw[1] + (((seed*13)%24-12)/1000);
    const lon = raw[2] + (((seed*29)%24-12)/1000);
    const arr = JSON.parse(localStorage.getItem("trinacria_sponsor_custom")||"[]");
    arr.push({ nome:d.nome, categoria:"La tua attività", cat:d.cat, colore:d.colore, tel:d.tel, desc:d.desc, lat, lon });
    localStorage.setItem("trinacria_sponsor_custom", JSON.stringify(arr));
    MAP.build(); GAME.calcolaVisibilita();
    // ricentra sul nuovo pin
    const sp = MAP.sponsor[MAP.sponsor.length-1];
    if (sp){ centraSu(sp.hex); if (view.z<12) view.z=12; view.x=window.innerWidth/2-MAP.hexes[sp.hex].x*view.z; view.y=window.innerHeight/2-MAP.hexes[sp.hex].y*view.z; }
    $("modale-sfondo").classList.add("nascosto");
    GAME.aggiungiLog("📣 Sponsor demo «"+d.nome+"» aggiunto a "+d.citta+" — cercalo sulla mappa!", "bene");
    aggiornaTutto();
  };
  $("spf-invia").onclick = () => {
    const d = datiForm();
    const corpo = `Richiesta spazio pubblicitario in Trinacria%0D%0A%0D%0AAttività: ${encodeURIComponent(d.nome)}%0D%0ACategoria: ${encodeURIComponent(d.cat)}%0D%0ACittà: ${encodeURIComponent(d.citta)}%0D%0ATelefono: ${encodeURIComponent(d.tel)}%0D%0ADescrizione: ${encodeURIComponent(d.desc)}`;
    const url = `mailto:${SPONSOR_CONTATTO}?subject=${encodeURIComponent("Trinacria — spazio sponsor: "+d.nome)}&body=${corpo}`;
    try { window.open(url, "_blank"); } catch(e){ GAME.aggiungiLog("Scrivi a "+SPONSOR_CONTATTO, "info"); }
  };
  $("spf-reset").onclick = () => {
    localStorage.removeItem("trinacria_sponsor_custom");
    MAP.build(); GAME.calcolaVisibilita();
    GAME.aggiungiLog("Sponsor demo rimossi.", "info");
    $("modale-sfondo").classList.add("nascosto"); aggiornaTutto();
  };
}

// ---------- GUARDAROBA DEL SOVRANO ----------
const RARITA_COLORE = { comune:"#9aa0a6", raro:"#4a90d9", epico:"#a05fd9", leggendario:"#e8b83c" };
const RARITA_LABEL  = { comune:"Comune", raro:"Raro", epico:"Epico", leggendario:"Leggendario" };
function apriGuardaroba(){
  const st = GAME.st; if (!st) return;
  const f = st.fazioni[st.giocatore];
  f.leader.look = f.leader.look || (ART.lookDefault ? ART.lookDefault(st.giocatore) : {});
  const stato = GAME.guardarobaStato();
  const cats = [["veste","👘 Veste"],["manto","🧥 Manto"],["copricapo","💎 Gemma del copricapo"]];
  let html = `<div class="p-sotto muto">Battaglie, Meraviglie, tecnologie avanzate ed eventi storici sbloccano nuovi capi. Puoi anche comprarli con l'oro (${Math.floor(f.oro)} 💰).</div>
    <div class="gr-anteprima"><canvas id="gr-canvas" width="130" height="162"></canvas></div>`;
  for (const [cat, titolo] of cats){
    const attivo = f.leader.look[cat+"Extra"] || null;
    html += `<div class="p-sez">${titolo}</div><div class="gr-grid">`;
    html += `<button class="gr-item ${!attivo?'gr-sel':''}" data-cat="${cat}" data-id="">Base</button>`;
    for (const it of stato.filter(x=>x.cat===cat)){
      if (it.sbloccato){
        html += `<button class="gr-item ${attivo===it.id?'gr-sel':''}" style="border-color:${RARITA_COLORE[it.rarita]}" data-cat="${cat}" data-id="${it.id}">
          ${it.nome}<br><small style="color:${RARITA_COLORE[it.rarita]}">${RARITA_LABEL[it.rarita]}</small></button>`;
      } else {
        const puoComprare = f.oro >= it.costoOro;
        html += `<button class="gr-item gr-bloccato" style="border-color:${RARITA_COLORE[it.rarita]}" data-compra="${it.id}" ${puoComprare?"":"disabled"}>
          🔒 ${it.nome}<br><small style="color:${RARITA_COLORE[it.rarita]}">${RARITA_LABEL[it.rarita]} · ${it.costoOro}💰</small></button>`;
      }
    }
    html += `</div>`;
  }
  mostraModale({ titolo:"👗 Guardaroba del Sovrano", html:`<div class="m-scroll">${html}</div>`, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  const disegnaPreview = () => {
    const cv = $("gr-canvas"); if (!cv) return;
    const cx = cv.getContext("2d"); cx.clearRect(0,0,cv.width,cv.height);
    ART.sovrano(cx, 65, 81, 120, 150, f.leader.look, st.giocatore);
  };
  disegnaPreview();
  document.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => {
    GAME.equipaggiaGuardaroba(b.dataset.cat, b.dataset.id || null);
    apriGuardaroba(); // ridisegna con la nuova selezione
  });
  document.querySelectorAll("[data-compra]").forEach(b => b.onclick = () => {
    if (GAME.compraGuardaroba(b.dataset.compra)){ AUDIO.sfx("costruito"); apriGuardaroba(); aggiornaTutto(); }
  });
}

// ---------- AGGIORNAMENTO ESERCITO (unità di linea alla nuova era) ----------
function apriAggiornamento(){
  const st = GAME.st; if (!st) return;
  const f = st.fazioni[st.giocatore];
  const lista = GAME.unitaAggiornabili(st.giocatore);
  let html = `<div class="p-sotto muto">Le unità di linea (non uniche, non di supporto) possono essere aggiornate al modello della tua era attuale, tornando a piena forza. Oro disponibile: ${Math.floor(f.oro)} 💰.</div>`;
  if (!lista.length){
    html += `<div class="p-riga muto">Nessuna truppa da aggiornare al momento: sono già tutte al passo coi tempi.</div>`;
  } else {
    html += `<button class="btn-lista" id="btn-upg-tutte">⚔️ Aggiorna tutte quelle che posso permettermi</button>`;
    for (const it of lista){
      const ok = f.oro >= it.costo;
      html += `<button class="btn-lista" data-upg="${it.uid}" ${ok?"":"disabled"}>${it.vecchioNome} → <b>${it.nuovoNome}</b> <span class="muto">— ${it.costo} oro</span></button>`;
    }
  }
  mostraModale({ titolo:"⚔️ Aggiorna Esercito", html:`<div class="m-scroll">${html}</div>`, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  const btnTutte = $("btn-upg-tutte");
  if (btnTutte) btnTutte.onclick = () => {
    const n = GAME.upgradaEconomiche(st.giocatore);
    AUDIO.sfx(n>0?"costruito":"click");
    apriAggiornamento(); aggiornaTutto();
  };
  document.querySelectorAll("[data-upg]").forEach(b => b.onclick = () => {
    if (GAME.upgradaUnita(parseInt(b.dataset.upg), st.giocatore)){ AUDIO.sfx("costruito"); apriAggiornamento(); aggiornaTutto(); }
  });
}

function apriObiettivi(){
  const st = GAME.st; if (!st) return;
  const p = GAME.punteggio(st.giocatore);
  const lista = GAME.statoObiettivi(st.giocatore);
  let html = `<div class="p-sotto muto">Ogni obiettivo vale 25 punti (+50 se completi tutti e tre quelli di un'era) e dà oro e cultura. Punteggio: città ×10, meraviglie ×15, tecnologie ×2, battaglie vinte ×3, invasori cacciati ×40.</div>
    <div class="p-riga"><b>${p.totale} punti</b> — ${p.citta} città · ${p.meraviglie} meraviglie · ${p.techs} tecnologie · ${p.obiettivi} obiettivi</div>`;
  let eraCorr = -1;
  for (const o of lista){
    if (o.era !== eraCorr){ eraCorr = o.era; html += `<div class="p-sez">${D().ERE[o.era].nome}${o.attuale?" (in corso)":""}</div>`; }
    html += `<div class="p-riga ${o.fatto?"":"muto"}">${o.fatto?"✅":"⬜"} ${o.testo}</div>`;
  }
  const classifica = st.fazioni.filter(f=>!f.eliminata).map(f=>({f,p:GAME.punteggio(f.id)})).sort((a,b)=>b.p.totale-a.p.totale);
  html += `<div class="p-sez">Classifica</div>` + classifica.map((x,i)=>`<div class="p-riga ${x.f.id===st.giocatore?"":"muto"}">${i+1}. ${x.f.nome} — ${x.p.totale} punti</div>`).join("");
  mostraModale({ titolo:"🎯 Obiettivi", html:`<div class="m-scroll">${html}</div>`, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
}
function apriAggiornamentoMigliorie(){
  const st = GAME.st; if (!st) return;
  const f = st.fazioni[st.giocatore];
  const lista = GAME.migliorieAggiornabili(st.giocatore);
  let html = `<div class="p-sotto muto">Le migliorie del territorio si ammodernano con l'era: campi, vigneti, miniere e boschi possono diventare manifatture più redditizie. Oro disponibile: ${Math.floor(f.oro)} 💰.</div>`;
  if (!lista.length){
    html += `<div class="p-riga muto">Nessuna miglioria da ammodernare al momento.</div>`;
  } else {
    html += `<button class="btn-lista" id="btn-upgm-tutte">🏭 Ammoderna tutte quelle che posso permettermi</button>`;
    for (const it of lista){
      const ok = f.oro >= it.costo;
      html += `<button class="btn-lista" data-upgm="${it.hex}" ${ok?"":"disabled"}>${it.vecchioNome} → <b>${it.nuovoNome}</b> <span class="muto">— ${it.costo} oro</span></button>`;
    }
  }
  mostraModale({ titolo:"🏭 Ammoderna Migliorie", html:`<div class="m-scroll">${html}</div>`, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  const btnTutte = $("btn-upgm-tutte");
  if (btnTutte) btnTutte.onclick = () => {
    const n = GAME.upgradaMiglliorieEconomiche(st.giocatore);
    AUDIO.sfx(n>0?"costruito":"click");
    apriAggiornamentoMigliorie(); aggiornaTutto();
  };
  document.querySelectorAll("[data-upgm]").forEach(b => b.onclick = () => {
    if (GAME.upgradaMiglioria(parseInt(b.dataset.upgm), st.giocatore)){ AUDIO.sfx("costruito"); apriAggiornamentoMigliorie(); aggiornaTutto(); }
  });
}

// ---------- POTERI DEL SOVRANO ----------
function apriPoteri(){
  const st = GAME.st; if (!st) return;
  const poteri = GAME.poteriStato();
  let html = `<div class="p-titolo">✨ Poteri del Sovrano</div>
    <div class="p-sotto muto">Mosse speciali a ricarica: usale nei momenti giusti.</div>`;
  for (const p of poteri){
    const stato = p.pronto ? "<span style='color:#9be89b'>● Pronto</span>" : "<span class='muto'>↻ tra "+p.attesa+" turni</span>";
    const tgt = p.bersaglio==="nemico" ? "🎯 area nemica" : (p.bersaglio==="amico" ? "🛡️ tuo territorio" : "🌍 tutto il regno");
    html += `<button class="btn-lista potere-riga" data-potere="${p.id}" ${p.pronto?"":"disabled"}>
      <span class="pot-ico">${ico(p)}</span> <b>${p.nome}</b> ${stato}<br>
      <span class="muto">${tgt} · ricarica ${p.ricarica} turni</span><br>
      <span class="muto pot-desc">${p.desc}</span></button>`;
  }
  apri(html);
  document.querySelectorAll("[data-potere]").forEach(b => b.onclick = () => {
    const id = b.dataset.potere;
    const p = D().POTERI.find(x=>x.id===id);
    if (!GAME.poterePronto(id)) return;
    chiudiPannello();
    if (p.bersaglio==="globale"){
      if (GAME.usaPotere(id, null)){ AUDIO.sfx("vittoria"); incrAiuto(); GAME.calcolaVisibilita(); aggiornaTutto(); mostraFumetti(); }
    } else {
      modoPotere = { id, bersaglio:p.bersaglio };
      const banner = $("potere-banner");
      banner.innerHTML = `${ico(p)} <b>${p.nome}</b> — tocca ${p.bersaglio==="nemico"?"un <b>nemico</b> da colpire":"una <b>tua</b> zona"} <button id="pot-annulla">✕ annulla</button>`;
      banner.classList.remove("nascosto");
      $("pot-annulla").onclick = (e) => { e.stopPropagation(); annullaPotere(); };
    }
  });
}
// ---------- POSA DI UN QUARTIERE ----------
// Come in Civilization: si sceglie la casella guardando i numeri di adiacenza. Il pannello
// si chiude, la mappa si accende sulle caselle possibili e ognuna dice quanto renderebbe.
function iniziaPosaQuartiere(cm, qid, costo){
  const celle = GAME.caselleQuartiere(cm, qid);
  if (!celle.length){ consigliere("cons", "Non c'è una casella libera per questo quartiere, Maestà.", 3000); return; }
  const q = GAME.quartiereDef(qid);
  const mappa = new Map();
  for (const c of celle) mappa.set(c.hex, c);
  posaQuart = { cmId:cm.id, qid, costo, celle, mappa, max:celle[0].totale };
  chiudiPannello();
  centraSu(celle[0].hex);
  const banner = $("potere-banner");
  banner.innerHTML = `${q.icona} <b>${q.nome}</b> — scegli la casella (il numero è quanto rende) <button id="q-annulla">✕ annulla</button>`;
  banner.classList.remove("nascosto");
  $("q-annulla").onclick = (e) => { e.stopPropagation(); annullaPosa(); };
}
function annullaPosa(){ posaQuart = null; const b=$("potere-banner"); if (b) b.classList.add("nascosto"); }
function confermaPosa(i){
  const p = posaQuart;
  if (!p) return;
  const c = p.mappa.get(i);
  if (!c){ consigliere("cons", "Lì non si può: dev'essere una casella accesa del tuo territorio.", 2800); return; }
  const cm = GAME.st.comuni[p.cmId];
  annullaPosa();
  GAME.accoda(cm.id, { tipo:"quartiere", id:p.qid, costo:p.costo, hex:i });
  AUDIO.sfx("quartiere");
  if (c.imp) aggiungiLogUI("Il quartiere prenderà il posto della miglioria su quella casella.");
  apriPannelloCitta(cm); aggiornaTutto();
}
function aggiungiLogUI(t){ GAME.aggiungiLog(t, "info"); }
// Le caselle candidate, con il valore di adiacenza scritto sopra: le migliori piu' luminose.
function disegnaPosaQuartiere(ctx){
  if (!posaQuart) return;
  const rz = MAP.R*view.z;
  const puls = 0.5 + 0.5*Math.sin(performance.now()/380);
  ctx.save();
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for (const c of posaQuart.celle){
    const h = MAP.hexes[c.hex];
    const s = MAP.w2s(view, h.x, h.y);
    if (s.x<-rz || s.y<-rz || s.x>window.innerWidth+rz || s.y>window.innerHeight+rz) continue;
    const q = posaQuart.max > 0 ? c.totale/posaQuart.max : 0;      // 1 = la migliore
    ART.hexPath(ctx, s.x, s.y, rz+0.6);
    ctx.fillStyle = "rgba(150,220,255,"+(0.10 + q*0.22).toFixed(3)+")"; ctx.fill();
    ctx.strokeStyle = q>0.99 ? "rgba(255,240,170,"+(0.6+puls*0.4).toFixed(3)+")" : "rgba(150,220,255,0.55)";
    ctx.lineWidth = Math.max(1.2, rz*(q>0.99?0.09:0.05)); ctx.stroke();
    if (rz > 11){
      const t = "+"+(+c.totale.toFixed(1));
      ctx.font = "bold "+Math.max(11, rz*0.42)+"px Georgia, serif";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(18,12,6,0.85)"; ctx.strokeText(t, s.x, s.y);
      ctx.fillStyle = q>0.99 ? "#fff0aa" : "#dff0ff"; ctx.fillText(t, s.x, s.y);
    }
  }
  ctx.restore();
}
function annullaPotere(){ modoPotere = null; const b=$("potere-banner"); if (b) b.classList.add("nascosto"); }
function applicaPotereSuHex(i){
  const p = modoPotere; annullaPotere();
  if (!p) return;
  if (GAME.usaPotere(p.id, i)){
    AUDIO.sfx("battaglia"); incrAiuto();
    GAME.calcolaVisibilita(); centraSu(i); aggiornaTutto(); mostraFumetti();
  } else {
    consigliere("cons", "Non si può lanciare qui, Maestà.", 2500);
  }
}

// ---------- LE VIE ALLA VITTORIA ----------
function apriVittoria(){
  const st = GAME.st, fid = st.giocatore;
  const mie = GAME.statoVittoria(fid);
  // per ogni via, il rivale piu' avanti: serve a sapere se stai perdendo una corsa
  const rivali = st.fazioni.filter(function(f){ return f.id!==fid && !f.eliminata; })
                           .map(function(f){ return { f:f, s:GAME.statoVittoria(f.id) }; });
  let html = `<div class="p-titolo">🏆 Come si vince</div>
    <div class="p-sotto">Quattro strade. Basta arrivare in fondo a una, prima degli altri.</div>`;
  mie.forEach(function(v, k){
    let capo = null;
    for (const r of rivali){ const p = r.s[k].pct; if (!capo || p > capo.pct) capo = { nome:r.f.nome, pct:p }; }
    const avanti = capo && capo.pct > v.pct;
    html += `<div class="vit-riga ${v.fatta?'fatta':''}">
      <div class="vit-testa">${v.icona} <b>${v.nome}</b> <span class="vit-pct">${v.pct}%</span></div>
      <div class="vit-barra"><i style="width:${v.pct}%"></i></div>
      <div class="p-riga muto">${v.desc}</div>`;
    for (const x of v.voci){
      const ok = x.ora >= x.serve;
      html += `<div class="vit-voce ${ok?'ok':''}">${ok?"✔":"•"} ${x.t}: <b>${x.ora}</b> di ${x.serve}</div>`;
    }
    if (capo) html += `<div class="p-riga muto">Rivale più avanti: ${capo.nome} al ${capo.pct}%${avanti?" — ti sta battendo":""}</div>`;
    html += `</div>`;
  });
  apri(html);
}
// ---------- EDITTI ----------
function apriEditti(){
  const st = GAME.st, fid = st.giocatore, f = st.fazioni[fid];
  const max = GAME.slotEditti(f);
  f.editti = f.editti || [];
  const disp = GAME.edittiDisponibili(fid);
  const costo = GAME.costoCambioEditto();
  let html = `<div class="p-titolo">📜 Editti del Regno</div>
    <div class="p-sotto">${max} ${max===1?"editto":"editti"} in vigore. Ogni era ne concede uno in più; lo Stato moderno un altro ancora.</div>`;
  for (let i=0;i<max;i++){
    const id = f.editti[i];
    const e = id ? D().EDITTI.find(x=>x.id===id) : null;
    html += `<div class="p-sez">Seggio ${i+1}</div>`;
    if (e) html += `<div class="ed-attivo">${e.icona} <b>${e.nome}</b><br><span class="muto">${e.testo}</span>
        <button class="btn-x" data-revoca="${i}">✕</button></div>`;
    else html += `<div class="p-riga muto">Vuoto — scegline uno qui sotto (il primo è gratis).</div>`;
  }
  html += `<div class="p-sez">Da proclamare <span class="muto">(cambiare un seggio già occupato costa ${costo} oro)</span></div>`;
  if (!disp.length) html += `<div class="p-riga muto">Nessun editto ancora sbloccato: servono le tecnologie.</div>`;
  for (const e of disp){
    const attivo = f.editti.includes(e.id);
    html += `<button class="btn-lista ${attivo?'ed-on':''}" data-editto="${e.id}" ${attivo?"disabled":""}>
      ${e.icona} ${e.nome} <span class="muto">${e.testo}${attivo?" — in vigore":""}</span></button>`;
  }
  apri(html);
  document.querySelectorAll("[data-revoca]").forEach(b => b.onclick = () => {
    GAME.revocaEditto(fid, parseInt(b.dataset.revoca)); AUDIO.sfx("click"); apriEditti(); aggiornaTutto();
  });
  document.querySelectorAll("[data-editto]").forEach(b => b.onclick = () => {
    // va nel primo seggio libero; se sono tutti pieni, sostituisce l'ultimo (pagando)
    let slot = -1;
    for (let i=0;i<max;i++) if (!f.editti[i]){ slot = i; break; }
    if (slot < 0) slot = max-1;
    if (GAME.attivaEditto(fid, b.dataset.editto, slot)){ AUDIO.sfx("costruito"); incrAiuto(); }
    else consigliere("cons", "Non basta l'oro per cambiare editto, Maestà.", 2800);
    apriEditti(); aggiornaTutto();
  });
}
// ---------- GRANDI SICILIANI ----------
// Non e' una lista della spesa: e' una corsa. Il pannello dice a che punto sei, quanto rendi
// al turno e quanto e' avanti il rivale piu' vicino — cosi' si capisce se conviene insistere.
function apriGrandi(){
  const st = GAME.st, fid = st.giocatore;
  const s = GAME.statoGrandi(fid);
  let html = `<div class="p-titolo">🏅 Grandi Siciliani</div>
    <div class="p-sotto">I quartieri generano punti. Chi arriva primo se li prende: gli altri restano a mani vuote.</div>`;
  for (const c of s){
    html += `<div class="p-sez">${c.icona} ${c.nome} <span class="muto">+${c.perTurno} a turno</span></div>`;
    if (!c.prossimo){
      html += `<div class="p-riga muto">Non resta nessuno da chiamare.</div>`;
    } else {
      const pct = Math.min(100, Math.round(c.punti/c.costo*100));
      const pctR = Math.min(100, Math.round(c.rivale/c.costo*100));
      const anno = c.prossimo.anno < 0 ? (-c.prossimo.anno)+" a.C." : c.prossimo.anno+" d.C.";
      html += `<div class="gr-riga">
          <canvas class="gr-volto" width="58" height="72" data-volto="${c.prossimo.ritr}"></canvas>
          <div class="gr-testo">
            <div><b>${c.prossimo.nome}</b> <span class="muto">${c.prossimo.luogo}, ${anno}</span></div>
            <div class="muto">«${c.prossimo.testo}»</div>
            <div class="gr-barra"><i style="width:${pct}%"></i><u style="left:${pctR}%"></u></div>
            <div class="muto">${Math.round(c.punti)} / ${c.costo} punti${c.rivale>c.punti?" — un altro regno è più avanti":""}</div>
          </div>
        </div>`;
    }
    if (c.miei.length) html += `<div class="p-riga">Al tuo servizio: <b>${c.miei.join(", ")}</b></div>`;
  }
  apri(html);
  // i volti stanno nell'atlante: si disegnano su canvas, non con un <img>
  document.querySelectorAll("[data-volto]").forEach(cv => {
    const cc = cv.getContext("2d");
    if (!(SPRITES.abilitato.ritratti && SPRITES.drawFit(cc, "grande_"+cv.dataset.volto, 29, 36, null, 72)))
      cv.style.display = "none";
  });
}
// ---------- HUB: 👑 REGNO (governo) e 🍴 CORTE (sapore e sovrano) ----------
// Tutto ciò che serve a governare sta in due sole voci, con lo stato scritto sul pulsante:
// niente più funzioni sparse fra la barra in alto e il menu dei salvataggi.
function vociRegno(){
  const st = GAME.st, fid = st.giocatore, f = st.fazioni[fid];
  const nU = GAME.unitaAggiornabili(fid).length, nM = GAME.migliorieAggiornabili(fid).length;
  const p = GAME.punteggio(fid);
  const obEra = GAME.obiettiviEra(st.era), fatti = obEra.filter(o => GAME.stat().obiettivi.includes(o.id)).length;
  const tt = f.ricerca ? D().TECH.find(x=>x.id===f.ricerca) : null;
  return [
    { icona:"🏆", nome:"Come si vince", stato: (function(){
        const v = GAME.statoVittoria(fid).slice().sort(function(a,b){ return b.pct-a.pct; })[0];
        return v.nome+" al "+v.pct+"% — la tua strada migliore";
      })(), fn: apriVittoria },
    { icona:"📜", nome:"Ricerca", stato: tt ? tt.nome+" — "+Math.min(100,Math.round(f.sciAcc/GAME.costoTech(tt)*100))+"%"
        : (GAME.techDisponibili(fid).length ? "nessuna in corso!" : "tutto scoperto"), fn: apriRicerca, urgente: !tt && GAME.techDisponibili(fid).length>0 },
    { icona:"📜", nome:"Editti", stato: (function(){
        const f = st.fazioni[fid], max = GAME.slotEditti(f);
        const usati = (f.editti||[]).filter(Boolean).length;
        const nomi = (f.editti||[]).filter(Boolean).map(id => (D().EDITTI.find(x=>x.id===id)||{}).nome).join(", ");
        return usati ? nomi+" ("+usati+"/"+max+")" : "nessuno in vigore — "+max+" "+(max===1?"seggio libero":"seggi liberi");
      })(), fn: apriEditti, urgente: (st.fazioni[fid].editti||[]).filter(Boolean).length < GAME.slotEditti(st.fazioni[fid]) && GAME.edittiDisponibili(fid).length>0 },
    { icona:"🏅", nome:"Grandi Siciliani", stato: (function(){
        const s = GAME.statoGrandi(fid);
        const miei = s.reduce((a,x)=>a+x.miei.length, 0);
        const vicino = s.filter(x=>x.prossimo).sort((a,b)=>(b.punti/b.costo)-(a.punti/a.costo))[0];
        return miei+" al tuo servizio" + (vicino ? " — "+vicino.prossimo.nome+" al "+Math.min(99,Math.round(vicino.punti/vicino.costo*100))+"%" : " — nessuno resta da chiamare");
      })(), fn: apriGrandi },
    { icona:"🎯", nome:"Obiettivi e punteggio", stato: p.totale+" punti — "+fatti+"/"+obEra.length+" obiettivi di quest'era", fn: apriObiettivi },
    { icona:"⚔️", nome:"Aggiorna esercito", stato: nU ? nU+" truppe possono passare alle armi della tua era" : "truppe già al passo coi tempi", fn: apriAggiornamento, urgente: nU>0 },
    { icona:"🏭", nome:"Ammoderna migliorie", stato: nM ? nM+" migliorie possono ammodernarsi" : "campagne già aggiornate", fn: apriAggiornamentoMigliorie, urgente: nM>0 },
    { icona:"⛵", nome:"Flotta", stato: statoFlotta(), fn: apriFlotta }
  ];
}
// riepilogo di una riga sulla marineria, mostrato nel pannello Regno
function statoFlotta(){
  const st = GAME.st, fid = st.giocatore, f = st.fazioni[fid];
  if (!f.techs.includes("navigazione")) return "serve la Navigazione per armare navi";
  const n = GAME.flottaFazione(fid), max = GAME.limiteFlotta();
  const porti = st.comuni.filter(c => c.fazione===fid && GAME.cittaCostiera(c)).length;
  if (!porti) return "nessuna città sul mare";
  return n+" navi su "+max+" · "+porti+" città costiere";
}
// Elenco delle navi: dove sono, cosa trasportano, e da dove si possono varare. Serviva un
// posto dove vedere la marineria a colpo d'occhio: le navi stanno in mare, spesso fuori
// schermo, e nella lista Esercito si perdevano tra le truppe di terra.
// citta' (di chiunque) piu' vicina a un esagono, per dire dove si trova una nave
function cittaPiuVicina(hexIdx){
  const st = GAME.st, h = MAP.hexes[hexIdx];
  let best = null, bd = 1e9;
  for (const cm of st.comuni){
    const hc = MAP.hexes[cm.hex];
    const d = Math.hypot(hc.x-h.x, hc.y-h.y);
    if (d < bd){ bd = d; best = cm; }
  }
  return best;
}
function apriFlotta(){
  const st = GAME.st, fid = st.giocatore, f = st.fazioni[fid];
  const navi = st.unita.filter(u => u.fazione===fid && GAME.eNavale(u));
  let html = "";
  if (!f.techs.includes("navigazione")){
    html += `<div class="p-sotto muto">Le isole minori — Lipari, Favignana, Ustica, Pantelleria — si raggiungono soltanto per mare. Scopri la <b>Navigazione</b> per costruire navi, e imbarca i coloni per popolarle.</div>`;
  } else {
    html += `<div class="p-sotto muto">Flotta: <b>${GAME.flottaFazione(fid)}/${GAME.limiteFlotta()}</b>. Le navi si costruiscono nelle città sul mare${st.era>=2?" dotate di porto":""} e non pesano sul limite dell'esercito di terra. Solo i <b>coloni</b> possono imbarcarsi.</div>`;
    if (!navi.length) html += `<div class="p-riga">Nessuna nave in mare.</div>`;
    for (const u of navi){
      const ud = D().UNITA[u.tipo];
      // NB: agli esagoni di mare e' assegnato un comune fittizio (serve solo a non far
      // esplodere le letture st.comuni[h.comune]), quindi qui si cerca la citta' costiera
      // davvero piu' vicina, altrimenti ogni nave risulterebbe "al largo di Palermo".
      const cm = cittaPiuVicina(u.hex);
      const carico = (u.carico||[]).length;
      const cap = ud.capacita || 0;
      html += `<button class="btn-lista" data-nave="${u.hex}">⛵ <b>${ud.nome}</b> — al largo di ${cm?cm.nome:"?"} · ${u.hp} PV`
            + (cap ? ` · stiva ${carico}/${cap}` : ` · ${ud.atk} att / ${ud.def} dif`) + `</button>`;
    }
    const costiere = st.comuni.filter(c => c.fazione===fid && GAME.cittaCostiera(c));
    if (costiere.length) html += `<div class="p-sez">Città da cui varare</div>`
      + costiere.map(c=>`<div class="p-riga">⚓ ${c.nome}${c.edifici.includes("porto")?" — porto":""}</div>`).join("");
  }
  mostraModale({ titolo:"⛵ La Flotta", html:`<div class="m-scroll">${html}</div>`,
    scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  document.querySelectorAll("[data-nave]").forEach(b => b.onclick = () => {
    $("modale-sfondo").classList.add("nascosto");
    centraSu(parseInt(b.dataset.nave));
  });
}
function vociCorte(){
  const st = GAME.st, fid = st.giocatore;
  const cuc = GAME.cucina(fid);
  const poteri = GAME.poteriStato().filter(x=>x.pronto).length;
  const g = GAME.guardarobaStato ? GAME.guardarobaStato() : [];
  const nSblocchi = g.filter(x => x.sbloccato).length;
  return [
    { icona:"🍴", nome:"Cucina di Sicilia", stato: cuc.dop.length+"/"+D().DOP.length+" prodotti tipici · "+cuc.piatti.length+" piatti sbloccati", fn: apriCucina },
    { icona:"✨", nome:"Poteri del Sovrano", stato: poteri ? poteri+" pronti all'uso" : "tutti in ricarica", fn: apriPoteri, urgente: poteri>0 },
    { icona:"👗", nome:"Guardaroba del Sovrano", stato: nSblocchi+" capi sbloccati su "+g.length, fn: apriGuardaroba }
  ];
}
function apriHub(titolo, voci){
  const html = voci.map((v,i) =>
    `<button class="btn-lista hub-voce ${v.urgente?"urgente":""}" data-hub="${i}">
       <span class="hub-ico">${v.icona}</span>
       <span class="hub-txt"><b>${v.nome}</b><br><span class="muto">${v.stato}</span></span>
     </button>`).join("");
  mostraModale({ titolo, html:`<div class="m-scroll">${html}</div>`, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  document.querySelectorAll("[data-hub]").forEach(b => b.onclick = () => {
    AUDIO.sfx("click");
    $("modale-sfondo").classList.add("nascosto");
    voci[parseInt(b.dataset.hub)].fn();
  });
}
function apriRegno(){ apriHub("👑 Il tuo Regno", vociRegno()); }
function apriCorte(){ apriHub("🍴 La Corte", vociCorte()); }

// Menu della ricerca a cascata. Prima elencava tutte e cinquantacinque le tecnologie, era
// dopo era, comprese quelle irraggiungibili: un muro di testo in cui la scelta vera — le tre
// o quattro che puoi davvero cominciare adesso — spariva. Ora si vede quello che puoi
// studiare ORA, e sotto solo cio' che quelle scelte aprirebbero: un passo alla volta.
function schedaTech(t, st, f, stato){
  const ct = GAME.costoTech(t, st.giocatore);
  const badge = t.ramo ? `<span class="m-ramo ramo-${t.ramo}">${t.ramo}</span>` : "";
  const intuita = f.intuizioni && f.intuizioni[t.id];
  const intu = t.intuizione ? (intuita
      ? `<span class="m-intu fatta">💡 ${t.intuizione.testo} — fatto, −40%</span>`
      : `<span class="m-intu">💡 ${t.intuizione.testo} → −40%</span>`) : "";
  // sbloccatiDaTech restituisce una STRINGA gia' formattata ("🔓 Ora puoi: ..."), non un elenco
  const sblocca = GAME.sbloccatiDaTech ? GAME.sbloccatiDaTech(t.id) : "";
  const cosa = sblocca ? `<span class="m-sblocca">${sblocca}</span>` : "";
  if (stato === "incorso"){
    const pct = Math.min(100, Math.round(f.sciAcc/ct*100));
    return `<div class="m-tech incorso">
      <b>${t.nome}</b>${badge} <span class="muto">${Math.round(f.sciAcc)}/${ct}📜</span>
      <div class="m-prog"><i style="width:${pct}%"></i></div>
      <span class="m-desc">${t.desc}</span>${intu}</div>`;
  }
  if (stato === "dopo"){
    const manca = (t.req||[]).filter(r => !f.techs.includes(r))
      .map(r => (D().TECH.find(x=>x.id===r)||{}).nome || r);
    return `<div class="m-tech futura">
      <b>${t.nome}</b>${badge} <span class="muto">${ct}📜</span>
      <span class="m-req">dopo ${manca.join(" e ")}</span></div>`;
  }
  const inCoda = stato === "coda";
  return `<button class="m-tech ${inCoda?'incoda':''}" data-tech="${t.id}">
    <b>${t.nome}</b>${badge} <span class="muto">${ct}📜${inCoda?" — in coda":""}</span>
    <span class="m-desc">${t.desc}</span>${cosa}${intu}</button>`;
}
function apriRicerca(){
  const st = GAME.st;
  const f = st.fazioni[st.giocatore];
  const percorso = GAME.percorsoRicercaStato(st.giocatore);
  const inCoda = new Set(percorso.map(x=>x.id));
  const disp = GAME.techDisponibili(st.giocatore).filter(t => t.id !== f.ricerca);
  const sci = GAME.reseFazione(st.giocatore).scienza;
  let html = "";

  // 1) quella in corso, con la barra
  const corrente = f.ricerca ? D().TECH.find(x=>x.id===f.ricerca) : null;
  if (corrente){
    const ct = GAME.costoTech(corrente, st.giocatore);
    const mancano = Math.max(0, Math.ceil((ct - f.sciAcc) / Math.max(0.1, sci)));
    html += `<div class="m-sez">In corso — pronta fra ${mancano} turni</div>`;
    html += schedaTech(corrente, st, f, "incorso");
  } else if (disp.length){
    html += `<div class="m-sez rosso">Nessuna ricerca in corso: scegline una</div>`;
  }

  // 2) il percorso pianificato
  if (percorso.length){
    html += `<div class="m-sez">🛤️ Poi, in ordine</div>`;
    percorso.forEach((t,k) => { html += `<div class="coda-item">${k+1}. ${t.nome} <button class="btn-x" data-togli="${t.id}">✕</button></div>`; });
  }

  // 3) quello che si puo' cominciare adesso
  if (disp.length){
    html += `<div class="m-sez">Puoi studiarla ora</div><div class="m-tech-gruppo">`;
    for (const t of disp.sort((a,b)=>GAME.costoTech(a,st.giocatore)-GAME.costoTech(b,st.giocatore)))
      html += schedaTech(t, st, f, inCoda.has(t.id) ? "coda" : "libera");
    html += `</div>`;
  } else if (!corrente){
    html += `<div class="m-sez">Hai scoperto tutto quello che si poteva scoprire.</div>`;
  }

  // 4) la cascata: solo cio' che le scelte qui sopra aprirebbero
  const idDisp = new Set(disp.map(t=>t.id));
  if (corrente) idDisp.add(corrente.id);
  const dopo = D().TECH.filter(t => {
    if (f.techs.includes(t.id) || idDisp.has(t.id)) return false;
    const manca = (t.req||[]).filter(r => !f.techs.includes(r));
    return manca.length > 0 && manca.every(r => idDisp.has(r));
  });
  if (dopo.length){
    html += `<div class="m-sez">Si aprono subito dopo</div><div class="m-tech-gruppo">`;
    for (const t of dopo) html += schedaTech(t, st, f, "dopo");
    html += `</div>`;
  }

  html += `<div class="m-sez"></div><button class="btn-lista" id="btn-suggerisci-perc">🎓 Suggeriscimi un percorso (le 4 più economiche)</button>`;
  const fatte = f.techs.length;
  html += `<div class="p-riga muto">Scoperte finora: ${fatte} su ${D().TECH.length}.</div>`;

  mostraModale({ titolo:"📜 Ricerca — +"+sci.toFixed(1)+" scienza al turno",
    html:`<div class="m-scroll">${html}</div>`, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  document.querySelectorAll("[data-tech]").forEach(b => b.onclick = () => {
    GAME.accodaRicerca(st.giocatore, b.dataset.tech);
    AUDIO.sfx("click");
    apriRicerca(); aggiornaTutto();
  });
  document.querySelectorAll("[data-togli]").forEach(b => b.onclick = () => {
    GAME.rimuoviDaPercorso(st.giocatore, b.dataset.togli);
    apriRicerca(); aggiornaTutto();
  });
  const bs = $("btn-suggerisci-perc");
  if (bs) bs.onclick = () => { GAME.suggerisciPercorso(st.giocatore); AUDIO.sfx("click"); apriRicerca(); aggiornaTutto(); };
}

// ---------- CUCINA & TIPICITÀ ----------
function bonusDopTxt(d){
  const p=[]; if(d.oro)p.push("+"+d.oro+" oro"); if(d.cibo)p.push("+"+d.cibo+" cibo"); if(d.cultura)p.push("+"+d.cultura+" cultura");
  return p.join(" ");
}
function apriCucina(){
  const st = GAME.st, fid = st.giocatore;
  const cuc = GAME.cucina(fid);
  const controllati = new Set(cuc.dop.map(d=>d.id));
  let html = `<div class="cuc-sez">🧺 Prodotti tipici — ${cuc.dop.length} su ${D().DOP.length}</div><div class="cuc-grid">`;
  for (const d of D().DOP){
    const ok = controllati.has(d.id);
    const cm = st.comuni.find(c=>c.dop===d.id);
    html += `<div class="cuc-dop ${ok?'ok':''}">
      <div class="cuc-ic">${ico(d)}</div>
      <div class="cuc-info"><b>${d.nome}</b><br>
      <span class="muto">${cm?cm.nome:''} · ${bonusDopTxt(d)}</span>
      ${ok?"<br><span class='cuc-si'>✓ nella tua dispensa</span>":"<br><span class='cuc-lock'>🔒 conquista "+(cm?cm.nome:'il comune')+(d.tech?" e scopri "+(D().TECH.find(t=>t.id===d.tech)||{}).nome:"")+"</span>"}</div>
    </div>`;
  }
  html += `</div>`;
  html += `<div class="cuc-sez">🍽️ Piatti tipici <span class="muto">(bonus permanenti finché possiedi gli ingredienti)</span></div>`;
  for (const p of D().PIATTI){
    const sbloccato = cuc.piatti.some(x=>x.id===p.id);
    const req = Object.entries(p.reqCat).map(([k,v])=>v+" "+k).join(", ");
    html += `<div class="cuc-piatto ${sbloccato?'ok':''}">${ico(p)} <b>${p.nome}</b> — ${p.testo}${sbloccato?" <span class='cuc-si'>✓ servito!</span>":" <span class='muto'>· serve: "+req+"</span>"}</div>`;
  }
  html += `<div class="cuc-sez">🎉 Sagre e feste patronali <span class="muto">(oro: ${Math.floor(st.fazioni[fid].oro)})</span></div>`;
  for (const s of D().SAGRE){
    const attiva = (st.sagreAttive||[]).find(x=>x.fid===fid && x.id===s.id);
    const ok = st.fazioni[fid].oro>=s.costo && !attiva;
    html += `<button class="btn-lista" data-sagra="${s.id}" ${ok?"":"disabled"}>${ico(s)} <b>${s.nome}</b> — ${s.testo} <span class="muto">(${s.costo} oro)${attiva?" · in corso: "+attiva.turni+"t":""}</span></button>`;
  }
  mostraModale({ titolo:"🍴 La Cucina di Sicilia", html:`<div class="m-scroll">${html}</div>`, scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  document.querySelectorAll("[data-sagra]").forEach(b => b.onclick = () => {
    if (GAME.faSagra(fid, b.dataset.sagra)){ AUDIO.sfx("vittoria"); $("modale-sfondo").classList.add("nascosto"); aggiornaTutto(); apriCucina(); }
  });
  tutorial("prima_cucina", "La cucina siciliana", "Ogni territorio dà un <b>prodotto tipico</b> (DOP): conquistalo per un bonus permanente.<br><br>Raccogliendo le categorie giuste sblocchi <b>piatti</b> con grandi bonus, e puoi indire <b>sagre</b> per spinte temporanee. «Cu' mancia fa muddìca!»");
}

// ---------- DIPLOMAZIA ----------
function apriDiplomazia(){
  const st = GAME.st;
  const gioc = st.giocatore;
  let html = "";
  for (const f of st.fazioni){
    if (f.id===gioc) continue;
    if (f.eliminata){ html += `<div class="dip-riga muto">💀 ${f.nome} — eliminata</div>`; continue; }
    const d = st.fazioni[gioc].diplo[f.id];
    const att = d.atteggiamento;
    const faccia = att>15 ? "😊" : (att>-10 ? "😐" : "😠");
    const statoTxt = d.stato==="guerra" ? "<b class='rosso'>⚔️ GUERRA</b>" : (d.stato==="patto" ? "🤝 Patto ("+d.turniPatto+"t)" : "🕊️ Pace");
    const comm = d.commercio>0 ? " 💰("+d.commercio+"t)" : "";
    html += `<div class="dip-riga">
      <span style="color:${D().FAZIONI[f.id].colore}">◆</span> <b>${f.nome}</b> — ${f.leader.nome} ${faccia}
      <span class="muto">forza ${GAME.forzaTotale(f.id)}</span><br>
      ${statoTxt}${comm} &nbsp;`;
    if (d.stato==="guerra") html += `<button class="btn-dip" data-az="pace:${f.id}">Proponi pace</button>`;
    else {
      if (d.stato==="pace") html += `<button class="btn-dip" data-az="guerra:${f.id}">⚔️ Guerra</button>
        <button class="btn-dip" data-az="patto:${f.id}">🤝 Patto</button>`;
      if (d.commercio<=0) html += `<button class="btn-dip" data-az="commercio:${f.id}">💰 Commercio</button>`;
      html += `<button class="btn-dip" data-az="regalo:${f.id}">🎁 Regalo (50)</button>`;
    }
    html += `</div>`;
  }
  for (const inv of st.invasori){
    const attivi = st.unita.some(u=>u.fazione===inv.id) || st.comuni.some(c=>c.fazione===inv.id);
    if (attivi) html += `<div class="dip-riga"><span style="color:${inv.colore}">◆</span> <b>${inv.nome}</b> — invasori ${st.fazioni[gioc].accordi["inv"+inv.id]>0?"(tributo pagato: "+st.fazioni[gioc].accordi["inv"+inv.id]+"t)":"<b class='rosso'>ostili</b>"}</div>`;
  }
  mostraModale({ titolo:"🤝 Diplomazia", html:`<div class="m-scroll">${html}</div>`,
    scelte:[{label:"Chiudi", eff:"nulla"}] }, ()=>{});
  document.querySelectorAll("[data-az]").forEach(b => b.onclick = () => {
    const [az, fidS] = b.dataset.az.split(":");
    const fid = parseInt(fidS);
    let esito = true;
    if (az==="guerra") GAME.dichiaraGuerra(gioc, fid);
    if (az==="pace") esito = GAME.proponiPace(gioc, fid);
    if (az==="patto") esito = GAME.proponiPatto(gioc, fid);
    if (az==="commercio") esito = GAME.proponiCommercio(gioc, fid);
    if (az==="regalo") esito = GAME.regalo(gioc, fid);
    $("modale-sfondo").classList.add("nascosto");
    if (!esito) GAME.aggiungiLog(st.fazioni[fid].nome+" rifiuta la proposta.", "male");
    aggiornaTutto();
    apriDiplomazia();
  });
}

// ---------- MENU ----------
function apriMenu(){
  const salv = SAVE.lista();
  let html = `<div class="m-sez">Salva partita</div>`;
  for (const s of salv){
    if (s.chiave==="auto") continue;
    html += `<button class="btn-lista" data-salva="${s.chiave}">💾 ${s.chiave.toUpperCase()} ${s.vuoto?"(vuoto)":"— "+s.info}</button>`;
  }
  html += `<div class="m-sez">Carica</div>`;
  for (const s of salv){
    if (s.vuoto) continue;
    if (s.obsoleto){   // salvataggio di una mappa precedente: si mostra ma non si carica
      html += `<div class="p-riga muto">📂 ${s.chiave==="auto"?"Autosalvataggio":s.chiave.toUpperCase()} — ${s.info}</div>`;
      continue;
    }
    html += `<button class="btn-lista" data-carica="${s.chiave}">📂 ${s.chiave==="auto"?"Autosalvataggio":s.chiave.toUpperCase()} — ${s.info}</button>`;
  }
  const A = AUDIO.imp;
  html += `<div class="m-sez">Audio</div>
    <div class="m-audio">
      <label>🎵 Musica <input type="range" id="vol-mus" min="0" max="100" value="${Math.round(A.musica*100)}"></label>
      <label>🗣️ Voci <input type="range" id="vol-voce" min="0" max="100" value="${Math.round(A.voce*100)}"></label>
      <label>🔔 Effetti <input type="range" id="vol-fx" min="0" max="100" value="${Math.round(A.effetti*100)}"></label>
      <label>🌊 Ambiente <input type="range" id="vol-amb" min="0" max="100" value="${Math.round(A.ambiente*100)}"></label>
      <label class="m-check"><input type="checkbox" id="voce-on" ${A.voceOn?"checked":""}> Don Calorio e il narratore parlano</label>
    </div>`;
  // il governo del regno sta tutto in 👑 Regno e 🍴 Corte: qui restano partita e utilità
  html += `<div class="m-sez">Partita</div>
    <button class="btn-lista" id="btn-aiuto">❓ Come si gioca</button>
    <button class="btn-lista" id="btn-tutorial">🎓 Rifai il tutorial guidato</button>
    ${window.SPONSOR_ON ? `<button class="btn-lista" id="btn-sponsor">📣 Diventa Sponsor (demo)</button>` : ""}
    <button class="btn-lista" id="btn-nuova">🔄 Nuova partita</button>`;
  mostraModale({ titolo:"☰ Menu", html:`<div class="m-scroll">${html}</div>`,
    scelte:[{label:"Torna al gioco", eff:"nulla"}] }, ()=>{});
  const bTut = $("btn-tutorial");
  if (bTut) bTut.onclick = () => { $("modale-sfondo").classList.add("nascosto"); avviaTutorial(); };
  const sl = (id, set) => { const e = $(id); if (e) e.oninput = () => set(e.value/100); };
  sl("vol-mus",  x => AUDIO.volMusica = x);
  sl("vol-voce", x => AUDIO.volVoce   = x);
  sl("vol-fx",   x => AUDIO.volEffetti= x);
  sl("vol-amb",  x => AUDIO.volAmbiente= x);
  if ($("voce-on")) $("voce-on").onchange = e => AUDIO.voceAttiva = e.target.checked;
  document.querySelectorAll("[data-salva]").forEach(b => b.onclick = () => {
    SAVE.salva(b.dataset.salva);
    $("modale-sfondo").classList.add("nascosto");
    GAME.aggiungiLog("Partita salvata ("+b.dataset.salva+").", "bene");
    aggiornaTutto();
  });
  document.querySelectorAll("[data-carica]").forEach(b => b.onclick = () => {
    if (SAVE.carica(b.dataset.carica)){
      $("modale-sfondo").classList.add("nascosto");
      entraInGioco();
    }
  });
  $("btn-nuova").onclick = () => location.reload();
  const bSp = $("btn-sponsor");
  if (bSp) bSp.onclick = () => { $("modale-sfondo").classList.add("nascosto"); apriSponsorForm(); };
  $("btn-aiuto").onclick = () => {
    $("modale-sfondo").classList.add("nascosto");
    mostraModale({ titolo:"❓ Come si gioca", testo:
      "🖱️ Trascina per muovere la mappa, rotella per lo zoom.\n\n"+
      "⚔️ Clicca le tue truppe → gli esagoni si illuminano → clicca dove muovere o chi attaccare (vedrai l'anteprima della battaglia).\n\n"+
      "🏘️ Clicca una tua città per reclutare truppe e costruire edifici e meraviglie. Clicca un esagono del tuo territorio per costruire fattorie, miniere e vigneti.\n\n"+
      "🧱 Le città murate resistono: bombarda le mura con le macchine d'assedio, poi assalta.\n\n"+
      "👑 Regno: ricerca, obiettivi, aggiornamento di truppe e migliorie. 🍴 Corte: cucina, poteri del sovrano, guardaroba. 🤝 Diplomazia: patti, commerci e guerre.\n\n"+
      "⏩ Il pulsante accanto a Fine Turno accende il turno automatico: i turni senza decisioni passano da soli e si fermano appena serve la tua testa.\n\n"+
      "😊 Tieni basso il malcontento (templi, integrazione culturale) o il popolo insorgerà.\n\n"+
      "🏆 Vinci eliminando le fazioni rivali (e cacciando gli invasori) o controllando il 75% dei comuni.\n\n"+
      "⏭ Invio = Fine turno. Esc = deseleziona.",
      scelte:[{label:"Chiaro!", eff:"nulla"}] }, ()=>{});
  };
}

return { initAvvio, initGioco, aggiornaTutto, processaPending, ridisegna, pesiAmbiente,
         get view(){ return view; } };
})();
