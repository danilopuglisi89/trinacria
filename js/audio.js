// TRINACRIA — musica siciliana procedurale (tarantella in 6/8) + effetti sonori
window.AUDIO = (function(){
let ctx = null, musicaOn = false, timer = null;
let prossimaNota = 0, passo = 0;

function ac(){
  if (!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
function midi(n){ return 440 * Math.pow(2, (n-69)/12); }

// Tarantella in La minore, 6/8 — melodia in crome (0 = pausa)
const MELODIA = [
  69,72,76, 81,79,76,   77,76,74, 76,74,72,
  69,72,76, 81,83,81,   79,77,76, 74,72,69,
  76,76,77, 79,79,77,   76,74,72, 74,76,74,
  72,69,72, 76,74,72,   71,72,74, 69,0,0
];
const BASSO = [45,45,50,52, 45,45,50,52, 48,48,45,45, 43,43,45,45]; // per battuta/mezza

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
  const g = ctx.createGain(); g.gain.value = forte?0.12:0.06;
  const f = ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value = forte?3000:6000;
  s.connect(f); f.connect(g); g.connect(ctx.destination);
  s.start(t);
}

function pianifica(){
  if (!musicaOn) return;
  const BPM = 132, croma = 60/BPM/2 * (2/3) * 2; // crome di 6/8 vivace
  const dur = 0.155;
  while (prossimaNota < ctx.currentTime + 0.35){
    const idx = passo % MELODIA.length;
    const n = MELODIA[idx];
    if (n) nota(midi(n), prossimaNota, dur*1.8, "triangle", 0.10);
    if (idx % 3 === 0){
      const b = BASSO[Math.floor(idx/3) % BASSO.length];
      nota(midi(b), prossimaNota, dur*2.6, "sawtooth", 0.045);
      tamburello(prossimaNota, idx % 6 === 0);
    }
    prossimaNota += dur;
    passo++;
  }
}

function toggleMusica(){
  musicaOn = !musicaOn;
  if (musicaOn){
    ac();
    prossimaNota = ctx.currentTime + 0.1;
    passo = 0;
    timer = setInterval(pianifica, 120);
  } else if (timer){ clearInterval(timer); timer = null; }
  return musicaOn;
}

// ---- effetti ----
function sfx(nome){
  try {
    ac();
    const t = ctx.currentTime;
    if (nome==="click"){ nota(660, t, 0.06, "square", 0.03); }
    if (nome==="costruito"){ nota(523, t, 0.1, "triangle", 0.08); nota(784, t+0.1, 0.15, "triangle", 0.08); }
    if (nome==="battaglia"){
      for (let k=0;k<3;k++) tamburello(t+k*0.12, true);
      nota(110, t, 0.4, "sawtooth", 0.1);
    }
    if (nome==="vittoria"){
      [523,659,784,1047].forEach((f,i)=>nota(f, t+i*0.12, 0.3, "triangle", 0.1));
    }
    if (nome==="sconfitta"){
      [392,349,311,262].forEach((f,i)=>nota(f, t+i*0.2, 0.4, "triangle", 0.09));
    }
    if (nome==="campana"){ nota(880, t, 1.2, "sine", 0.1, 1); nota(1320, t, 0.8, "sine", 0.03, 1); }
    if (nome==="turno"){ nota(440, t, 0.08, "triangle", 0.05); nota(554, t+0.08, 0.1, "triangle", 0.05); }
  } catch(e){}
}

return { toggleMusica, sfx, get musicaOn(){ return musicaOn; } };
})();
