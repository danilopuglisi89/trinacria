// TRINACRIA — pacchetto audio
//   · musica: un tema per era + tema di battaglia (file MP3 in streaming, crossfade)
//     con ripiego sulla tarantella procedurale in 6/8 se i file non ci sono
//   · voce: Don Calorio e il narratore degli eventi, in italiano, solo nei momenti importanti
//   · effetti: sintetizzati (zero peso, latenza zero)
// Nessun asset è obbligatorio: se manifest.json manca, il gioco suona esattamente come prima.
window.AUDIO = (function(){
let ctx = null, musicaOn = false, timer = null;
let prossimaNota = 0, passo = 0;

// ---- impostazioni persistenti ----
const IMP = (function(){
  let o = { musica:0.55, voce:0.9, effetti:0.7, voceOn:true };
  try { Object.assign(o, JSON.parse(localStorage.getItem("trinacria_audio")||"{}")); } catch(e){}
  return o;
})();
function salvaImp(){ try { localStorage.setItem("trinacria_audio", JSON.stringify(IMP)); } catch(e){} }

function ac(){
  if (!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
function midi(n){ return 440 * Math.pow(2, (n-69)/12); }

// ===================== MANIFEST =====================
// { musica: { era0:"file.mp3", …, battaglia:"…" }, voce: { chiave:"file.mp3", … } }
let MAN = null, manPronto = false;
function init(){
  return fetch("assets/audio/manifest.json?v=72")
    .then(r => r.ok ? r.json() : null)
    .then(j => { MAN = j; manPronto = true; return j; })
    .catch(() => { manPronto = true; return null; });
}
function fileMusica(k){ return MAN && MAN.musica && MAN.musica[k] ? "assets/audio/"+MAN.musica[k] : null; }
function fileVoce(k){ return MAN && MAN.voce && MAN.voce[k] ? "assets/audio/"+MAN.voce[k] : null; }

// ===================== MUSICA =====================
let elMus = null, temaCorr = null, temaPrima = null, fadeTimer = null;
let duckFino = 0;   // finché il narratore parla, la musica si abbassa

function volMusica(){
  const duck = performance.now() < duckFino ? 0.28 : 1;
  return IMP.musica * duck;
}
function aggiornaVolume(){ if (elMus) elMus.volume = volMusica(); }

function suonaTema(k){
  if (!musicaOn || k === temaCorr) return;
  const src = fileMusica(k);
  if (!src){ temaCorr = k; return; }        // nessun file per quest'era: resta la tarantella
  fermaProcedurale();
  const nuovo = new Audio(src);
  nuovo.loop = true; nuovo.volume = 0; nuovo.preload = "auto";
  const vecchio = elMus;
  nuovo.play().then(() => {
    elMus = nuovo; temaCorr = k;
    if (fadeTimer) clearInterval(fadeTimer);
    let p = 0;
    fadeTimer = setInterval(() => {                     // crossfade 1,2 s
      p = Math.min(1, p + 0.05);
      nuovo.volume = volMusica() * p;
      if (vecchio) vecchio.volume = Math.max(0, volMusica() * (1-p));
      if (p >= 1){
        clearInterval(fadeTimer); fadeTimer = null;
        if (vecchio){ vecchio.pause(); vecchio.src = ""; }
      }
    }, 60);
  }).catch(() => { temaCorr = null; avviaProcedurale(); });
}
function fermaMusicaFile(){
  if (fadeTimer){ clearInterval(fadeTimer); fadeTimer = null; }
  if (elMus){ elMus.pause(); elMus.src = ""; elMus = null; }
  temaCorr = null;
}
// tema dell'era in corso; la battaglia si sovrappone e poi si torna indietro
function temaEra(era){ temaPrima = null; suonaTema("era"+era); }
function temaBattaglia(){
  if (!fileMusica("battaglia")) { sfx("battaglia"); return; }
  temaPrima = temaCorr; suonaTema("battaglia");
}
function fineBattaglia(){ if (temaPrima){ const k = temaPrima; temaPrima = null; suonaTema(k); } }

// ===================== VOCE =====================
// Una battuta per volta: se ne arriva un'altra, la precedente lascia il posto (i momenti
// importanti sono rari, ma un evento può cadere sopra a un altro a fine turno).
let elVoce = null, ultimaVoce = 0;
const cacheVoce = new Map();      // chiave -> Audio già scaricata (max 24)

function precarica(chiavi){
  if (!IMP.voceOn) return;
  for (const k of chiavi){
    if (cacheVoce.has(k)) continue;
    const src = fileVoce(k); if (!src) continue;
    const a = new Audio(); a.preload = "auto"; a.src = src;
    cacheVoce.set(k, a);
    if (cacheVoce.size > 24) cacheVoce.delete(cacheVoce.keys().next().value);
  }
}
// parla(chiave) → true se la battuta esiste ed è partita
function parla(chiave, opz){
  if (!IMP.voceOn) return false;
  const src = fileVoce(chiave); if (!src) return false;
  try {
    if (elVoce){ elVoce.pause(); elVoce.currentTime = 0; }
    const base = cacheVoce.get(chiave);
    const a = base ? (base.cloneNode ? base.cloneNode() : new Audio(src)) : new Audio(src);
    a.volume = IMP.voce * ((opz && opz.vol) || 1);
    a.play().catch(()=>{});
    elVoce = a; ultimaVoce = performance.now();
    // la musica si fa da parte per tutta la battuta (+0,6 s di coda)
    const dur = isFinite(a.duration) && a.duration ? a.duration : 6;
    duckFino = performance.now() + (dur + 0.6)*1000;
    a.addEventListener("loadedmetadata", () => {
      duckFino = performance.now() + (a.duration + 0.6)*1000; aggiornaVolume();
    });
    a.addEventListener("ended", () => { duckFino = 0; aggiornaVolume(); });
    aggiornaVolume();
    return true;
  } catch(e){ return false; }
}
function zittisci(){ if (elVoce){ elVoce.pause(); elVoce = null; } duckFino = 0; aggiornaVolume(); }
// una chiave a scelta fra più varianti (es. don_rivolta_1/2/3) — evita la ripetizione
function parlaUna(prefisso, n){
  const k = prefisso + "_" + (1 + Math.floor(Math.random()*n));
  return parla(k) || parla(prefisso + "_1");
}

// ===================== TARANTELLA PROCEDURALE (ripiego) =====================
const MELODIA = [
  69,72,76, 81,79,76,   77,76,74, 76,74,72,
  69,72,76, 81,83,81,   79,77,76, 74,72,69,
  76,76,77, 79,79,77,   76,74,72, 74,76,74,
  72,69,72, 76,74,72,   71,72,74, 69,0,0
];
const BASSO = [45,45,50,52, 45,45,50,52, 48,48,45,45, 43,43,45,45];

function nota(freq, t, dur, tipo, vol, decay){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t+0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur*(decay||1));
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t+dur*(decay||1)+0.05);
}
function tamburello(t, forte){
  const buf = ctx.createBuffer(1, 2200, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/d.length, 2);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const g = ctx.createGain(); g.gain.value = (forte?0.12:0.06) * IMP.effetti/0.7;
  const f = ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value = forte?3000:6000;
  s.connect(f); f.connect(g); g.connect(ctx.destination);
  s.start(t);
}
function pianifica(){
  if (!musicaOn) return;
  const dur = 0.155;
  const duck = performance.now() < duckFino ? 0.3 : 1;
  const vol = IMP.musica * duck;
  while (prossimaNota < ctx.currentTime + 0.35){
    const idx = passo % MELODIA.length;
    const n = MELODIA[idx];
    if (n) nota(midi(n), prossimaNota, dur*1.8, "triangle", 0.18*vol);
    if (idx % 3 === 0){
      const b = BASSO[Math.floor(idx/3) % BASSO.length];
      nota(midi(b), prossimaNota, dur*2.6, "sawtooth", 0.08*vol);
      tamburello(prossimaNota, idx % 6 === 0);
    }
    prossimaNota += dur;
    passo++;
  }
}
function avviaProcedurale(){
  if (timer) return;
  ac(); prossimaNota = ctx.currentTime + 0.1; passo = 0;
  timer = setInterval(pianifica, 120);
}
function fermaProcedurale(){ if (timer){ clearInterval(timer); timer = null; } }

// ===================== ACCENSIONE =====================
function toggleMusica(era){
  musicaOn = !musicaOn;
  if (musicaOn){
    const k = "era" + (era||0);
    if (fileMusica(k)) suonaTema(k); else avviaProcedurale();
  } else { fermaProcedurale(); fermaMusicaFile(); }
  return musicaOn;
}

// ---- effetti ----
function sfx(nome){
  try {
    ac();
    const t = ctx.currentTime, V = IMP.effetti/0.7;
    if (nome==="click"){ nota(660, t, 0.06, "square", 0.03*V); }
    if (nome==="costruito"){ nota(523, t, 0.1, "triangle", 0.08*V); nota(784, t+0.1, 0.15, "triangle", 0.08*V); }
    if (nome==="battaglia"){
      for (let k=0;k<3;k++) tamburello(t+k*0.12, true);
      nota(110, t, 0.4, "sawtooth", 0.1*V);
    }
    if (nome==="vittoria"){ [523,659,784,1047].forEach((f,i)=>nota(f, t+i*0.12, 0.3, "triangle", 0.1*V)); }
    if (nome==="sconfitta"){ [392,349,311,262].forEach((f,i)=>nota(f, t+i*0.2, 0.4, "triangle", 0.09*V)); }
    if (nome==="campana"){ nota(880, t, 1.2, "sine", 0.1*V, 1); nota(1320, t, 0.8, "sine", 0.03*V, 1); }
    if (nome==="turno"){ nota(440, t, 0.08, "triangle", 0.05*V); nota(554, t+0.08, 0.1, "triangle", 0.05*V); }
  } catch(e){}
}

return {
  init, toggleMusica, sfx,
  temaEra, temaBattaglia, fineBattaglia,
  parla, parlaUna, precarica, zittisci,
  get musicaOn(){ return musicaOn; },
  get imp(){ return IMP; },
  set volMusica(x){ IMP.musica = x; aggiornaVolume(); salvaImp(); },
  set volVoce(x){ IMP.voce = x; salvaImp(); },
  set volEffetti(x){ IMP.effetti = x; salvaImp(); },
  set voceAttiva(x){ IMP.voceOn = !!x; if (!x) zittisci(); salvaImp(); },
  get haVoce(){ return !!(MAN && MAN.voce); },
  get haMusica(){ return !!(MAN && MAN.musica); }
};
})();
