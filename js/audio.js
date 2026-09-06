// TRINACRIA — pacchetto audio
//
//   · musica:   un tema per era + tema di battaglia, con dissolvenza incrociata
//   · voce:     Don Calorio e il narratore, in italiano, nei momenti che contano
//   · effetti:  sintetizzati a strati (zero peso da scaricare, zero latenza)
//   · ambiente: onde, vento, cicale, brusio, magli — accesi da CIO' CHE SI VEDE sulla mappa
//
// Tutto passa da un grafo Web Audio con quattro bus (musica, voce, effetti, ambiente) sotto un
// volume generale. Prima musica e voce erano semplici <audio> con `.volume`: non si potevano
// filtrare, l'abbassamento sotto la voce era un moltiplicatore riscritto a mano e gli effetti
// erano oscillatori attaccati diritti all'uscita. Ora l'abbassamento e' una rampa vera sul
// guadagno del bus, e gli effetti condividono un riverbero.
//
// Nessun asset e' obbligatorio: se manifest.json manca restano effetti, ambiente e la
// tarantella procedurale.
window.AUDIO = (function(){
let ctx = null, musicaOn = false;

// ---- impostazioni persistenti ----
const IMP = (function(){
  let o = { musica:0.55, voce:0.9, effetti:0.7, ambiente:0.5, voceOn:true };
  try { Object.assign(o, JSON.parse(localStorage.getItem("trinacria_audio")||"{}")); } catch(e){}
  if (o.ambiente === undefined) o.ambiente = 0.5;
  return o;
})();
function salvaImp(){ try { localStorage.setItem("trinacria_audio", JSON.stringify(IMP)); } catch(e){} }

// ===================== GRAFO =====================
let master = null, busMus = null, busVoce = null, busFx = null, busAmb = null;
let riverbero = null, sendRiv = null;
function ac(){
  if (!ctx){
    ctx = new (window.AudioContext||window.webkitAudioContext)();
    master  = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    busMus  = ctx.createGain(); busMus.gain.value  = IMP.musica;   busMus.connect(master);
    busVoce = ctx.createGain(); busVoce.gain.value = IMP.voce;     busVoce.connect(master);
    busFx   = ctx.createGain(); busFx.gain.value   = IMP.effetti;  busFx.connect(master);
    busAmb  = ctx.createGain(); busAmb.gain.value  = IMP.ambiente; busAmb.connect(master);
    // riverbero condiviso: una piccola sala di pietra, come una piazza o una chiesa
    riverbero = ctx.createConvolver();
    riverbero.buffer = impulso(1.8, 2.5);
    sendRiv = ctx.createGain(); sendRiv.gain.value = 0.22;
    sendRiv.connect(riverbero); riverbero.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
// risposta all'impulso generata: rumore che decade in modo esponenziale, in stereo
function impulso(dur, decadimento){
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c=0;c<2;c++){
    const d = buf.getChannelData(c);
    for (let i=0;i<n;i++){
      const t = i/n;
      d[i] = (Math.random()*2-1) * Math.pow(1-t, decadimento) * (1 - t*0.15);
    }
  }
  return buf;
}
function midi(n){ return 440 * Math.pow(2, (n-69)/12); }

// ===================== MATTONI DEL SUONO =====================
// rumore: bianco (secco, metallico) o bruno (pieno, da mare e tuono)
const cacheRumore = {};
function bufRumore(dur, tipo){
  const chiave = tipo + "_" + dur.toFixed(2);
  if (cacheRumore[chiave]) return cacheRumore[chiave];
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (tipo === "bruno"){
    let ultimo = 0;
    for (let i=0;i<n;i++){ const b = Math.random()*2-1; ultimo = (ultimo + 0.02*b)/1.02; d[i] = ultimo*3.5; }
  } else {
    for (let i=0;i<n;i++) d[i] = Math.random()*2-1;
  }
  cacheRumore[chiave] = buf;
  return buf;
}
// un colpo di rumore filtrato: il mattone di quasi tutti gli effetti percussivi
function colpo(t, o){
  const dur = o.dur || 0.18;
  const s = ctx.createBufferSource();
  s.buffer = bufRumore(Math.max(dur, 0.05), o.rumore || "bianco");
  const f = ctx.createBiquadFilter();
  f.type = o.filtro || "bandpass";
  f.frequency.setValueAtTime(o.freq || 1200, t);
  f.Q.value = o.q || 1;
  if (o.freqFine) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.freqFine), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol || 0.2, t + (o.attacco || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(o.dest || busFx);
  if (o.riverbero !== false) g.connect(sendRiv);
  s.start(t); s.stop(t + dur + 0.05);
  return g;
}
// una nota: onda semplice con inviluppo, con eventuale glissando
function tono(t, o){
  const dur = o.dur || 0.3;
  const osc = ctx.createOscillator();
  osc.type = o.tipo || "sine";
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.freqFine) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqFine), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol || 0.15, t + (o.attacco || 0.01));
  if (o.tenuta) g.gain.setValueAtTime(o.vol || 0.15, t + (o.attacco || 0.01) + o.tenuta);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  let ultimo = g;
  if (o.filtro){
    const f = ctx.createBiquadFilter();
    f.type = o.filtro; f.frequency.value = o.filtroFreq || 1500;
    g.connect(f); ultimo = f;
  }
  osc.connect(g); ultimo.connect(o.dest || busFx);
  if (o.riverbero !== false) ultimo.connect(sendRiv);
  osc.start(t); osc.stop(t + dur + 0.05);
  return g;
}
// Campana vera: parziali NON armoniche, ognuna con la sua durata. E' quello che distingue una
// campana da un bip: il rapporto 1 : 2,76 : 5,40 : 8,93 e' quello del bronzo.
function campana(t, base, vol, durata){
  const parti = [[1,1],[2.76,0.62],[5.40,0.38],[8.93,0.24],[13.3,0.12]];
  for (const p of parti){
    tono(t, { freq: base*p[0], dur: durata/(1 + (p[0]-1)*0.28), tipo:"sine", vol: vol*p[1], attacco:0.004 });
  }
  colpo(t, { freq: base*6, q:2, dur:0.08, vol: vol*0.5 });   // il battacchio
}

// ===================== EFFETTI =====================
// I sette effetti di prima erano oscillatori nudi: bip da calcolatrice sotto una grafica
// dipinta a olio. Questi sono suoni costruiti a strati: transiente, corpo, coda.
const EFFETTI = {
  // legno: il tic di un gettone sul tavolo
  click: function(t, V){
    colpo(t, { freq:1900, q:5, dur:0.05, vol:0.10*V, riverbero:false });
    tono(t, { freq:820, dur:0.05, tipo:"sine", vol:0.05*V, riverbero:false });
  },
  // scalpello sulla pietra: due colpi secchi e un tonfo basso
  costruito: function(t, V){
    colpo(t,      { freq:2600, q:3, dur:0.10, vol:0.16*V });
    colpo(t+0.09, { freq:1500, q:2, dur:0.14, vol:0.13*V });
    tono(t, { freq:150, freqFine:70, dur:0.22, tipo:"sine", vol:0.16*V });
  },
  // maglio su incudine: tre colpi con la coda metallica
  quartiere: function(t, V){
    for (let k=0;k<3;k++){
      const tt = t + k*0.17 + Math.random()*0.02;
      colpo(tt, { freq:2200+k*350, q:4, dur:0.13, vol:0.15*V });
      tono(tt, { freq:420+k*60, dur:0.30, tipo:"triangle", vol:0.05*V });
    }
  },
  // tamburo di guerra e cozzare di lame
  battaglia: function(t, V){
    for (let k=0;k<3;k++){
      const tt = t + k*0.15;
      tono(tt, { freq:95, freqFine:48, dur:0.34, tipo:"sine", vol:0.30*V });
      colpo(tt, { freq:260, filtro:"lowpass", dur:0.22, vol:0.16*V, rumore:"bruno" });
    }
    colpo(t+0.05, { freq:3600, q:2.5, dur:0.30, vol:0.13*V });   // acciaio
    colpo(t+0.22, { freq:4800, q:3,   dur:0.22, vol:0.09*V });
  },
  // fanfara di ottoni
  vittoria: function(t, V){
    [523.25, 659.25, 783.99, 1046.5].forEach(function(f, i){
      tono(t + i*0.11, { freq:f, dur:0.85, tipo:"sawtooth", vol:0.10*V,
                         attacco:0.05, tenuta:0.18, filtro:"lowpass", filtroFreq:2600 });
    });
    campana(t+0.42, 1046.5, 0.07*V, 2.4);
  },
  // corno basso in discesa e un tamburo solo
  sconfitta: function(t, V){
    tono(t, { freq:196, freqFine:110, dur:1.5, tipo:"sawtooth", vol:0.13*V,
              attacco:0.09, filtro:"lowpass", filtroFreq:900 });
    tono(t+0.05, { freq:98, freqFine:55, dur:1.6, tipo:"sine", vol:0.14*V });
    colpo(t, { freq:180, filtro:"lowpass", dur:0.5, vol:0.13*V, rumore:"bruno" });
  },
  campana: function(t, V){ campana(t, 622, 0.16*V, 3.2); },
  // il rintocco grande del cambio d'era
  era: function(t, V){
    campana(t, 233, 0.20*V, 5.0);
    tono(t, { freq:58, dur:3.2, tipo:"sine", vol:0.13*V, attacco:0.25 });
    colpo(t, { freq:400, filtro:"lowpass", dur:2.2, vol:0.07*V, rumore:"bruno" });
  },
  // pagina di pergamena che gira
  turno: function(t, V){
    colpo(t,      { freq:4200, freqFine:1100, q:0.9, dur:0.30, vol:0.10*V, attacco:0.05, riverbero:false });
    colpo(t+0.16, { freq:2600, freqFine:900,  q:0.9, dur:0.22, vol:0.06*V, riverbero:false });
  },
  // monete che cadono nella cassa
  moneta: function(t, V){
    for (let k=0;k<4;k++){
      const tt = t + k*0.055 + Math.random()*0.03;
      const f = 2100 + Math.random()*1500;
      tono(tt, { freq:f, dur:0.28, tipo:"triangle", vol:0.055*V });
      tono(tt, { freq:f*1.51, dur:0.20, tipo:"sine", vol:0.03*V });
    }
    colpo(t, { freq:900, q:1.5, dur:0.10, vol:0.05*V });
  },
  // si fonda una citta': campana, folla, e la pietra che si posa
  fondazione: function(t, V){
    campana(t, 392, 0.13*V, 3.0);
    tono(t, { freq:130, dur:1.6, tipo:"sine", vol:0.10*V, attacco:0.3 });
    colpo(t+0.15, { freq:700, filtro:"lowpass", dur:1.4, vol:0.07*V, rumore:"bruno" });
    colpo(t+0.30, { freq:2200, q:3, dur:0.14, vol:0.10*V });
  },
  // scoperta: un luccichio che sale
  ricerca: function(t, V){
    [523, 659, 784, 1175].forEach(function(f, i){
      tono(t + i*0.07, { freq:f*0.5, freqFine:f, dur:0.7, tipo:"triangle", vol:0.055*V, attacco:0.03 });
    });
    campana(t+0.28, 1568, 0.05*V, 1.8);
  },
  // passi di truppa
  marcia: function(t, V){
    for (let k=0;k<4;k++)
      colpo(t + k*0.13, { freq:220-k*10, filtro:"lowpass", dur:0.12,
                          vol:(k%2 ? 0.07 : 0.10)*V, rumore:"bruno" });
  },
  // scafo in acqua e cima che scricchiola
  nave: function(t, V){
    colpo(t, { freq:600, freqFine:180, filtro:"lowpass", dur:0.9, vol:0.13*V, rumore:"bruno", attacco:0.06 });
    tono(t+0.1, { freq:150, freqFine:128, dur:0.8, tipo:"sawtooth", vol:0.035*V,
                  attacco:0.15, filtro:"lowpass", filtroFreq:600 });
  },
  // azione negata: un tonfo sordo, mai un bip stridulo
  errore: function(t, V){
    tono(t, { freq:150, freqFine:88, dur:0.22, tipo:"sine", vol:0.13*V, riverbero:false });
    colpo(t, { freq:300, filtro:"lowpass", dur:0.14, vol:0.06*V, riverbero:false });
  },
  // la nebbia si apre
  scoperta: function(t, V){
    colpo(t, { freq:900, freqFine:5200, q:0.8, dur:0.8, vol:0.07*V, attacco:0.25 });
    tono(t+0.1, { freq:1568, dur:0.9, tipo:"sine", vol:0.04*V, attacco:0.2 });
  },
  // covo di briganti spazzato via: crollo e crepitio
  covo: function(t, V){
    colpo(t, { freq:340, freqFine:120, filtro:"lowpass", dur:1.1, vol:0.16*V, rumore:"bruno" });
    for (let k=0;k<7;k++)
      colpo(t + 0.1 + Math.random()*0.8, { freq:2400+Math.random()*2000, q:6, dur:0.06, vol:0.05*V });
  },
  // truppa reclutata: squillo corto
  unita: function(t, V){
    [392, 523].forEach(function(f, i){
      tono(t + i*0.09, { freq:f, dur:0.34, tipo:"sawtooth", vol:0.09*V,
                         attacco:0.02, tenuta:0.08, filtro:"lowpass", filtroFreq:2200 });
    });
  }
};
EFFETTI.costruzione = EFFETTI.costruito;   // il vecchio nome continua a funzionare

function sfx(nome){
  try {
    ac();
    const f = EFFETTI[nome];
    if (!f) return;
    // il bus porta gia' il volume scelto dall'utente: V serve solo a tenere le proporzioni
    f(ctx.currentTime + 0.005, 1);
  } catch(e){}
}

// ===================== AMBIENTE =====================
// Strati continui, accesi in base a cio' che il giocatore ha davvero sotto gli occhi. Ogni
// strato e' una catena permanente il cui guadagno viene portato al peso richiesto con una
// rampa lenta: nessun clic, nessun nodo ricostruito a ogni fotogramma.
let strati = null, ambTimer = null, pesiCorrenti = {}, ambienteAcceso = false;
function creaStrato(cfg){
  const s = ctx.createBufferSource();
  s.buffer = bufRumore(3.0, cfg.rumore || "bianco");
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = cfg.filtro; f.frequency.value = cfg.freq; f.Q.value = cfg.q || 1;
  const g = ctx.createGain(); g.gain.value = 0;
  s.connect(f); f.connect(g); g.connect(busAmb);
  // respiro: un oscillatore lentissimo che fa andare e venire il suono (le onde, il vento)
  if (cfg.respiro){
    const lfo = ctx.createOscillator(); lfo.frequency.value = cfg.respiro;
    const lg = ctx.createGain(); lg.gain.value = cfg.respiroAmp || 0.4;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
  }
  s.start();
  return g;
}
function avviaAmbiente(){
  if (strati) return;
  ac();
  strati = {
    onde:    creaStrato({ filtro:"lowpass",  freq:520,  q:0.8, rumore:"bruno",  respiro:0.11, respiroAmp:0.5 }),
    vento:   creaStrato({ filtro:"bandpass", freq:760,  q:0.6, rumore:"bianco", respiro:0.07, respiroAmp:0.5 }),
    mercato: creaStrato({ filtro:"bandpass", freq:520,  q:1.2, rumore:"bruno",  respiro:0.9,  respiroAmp:0.35 }),
    cicale:  creaStrato({ filtro:"bandpass", freq:4600, q:4,   rumore:"bianco", respiro:22,   respiroAmp:0.6 })
  };
  ambienteAcceso = true;
  // la fucina non e' un tappeto ma una serie di colpi: ha un suo tempo
  if (!ambTimer) ambTimer = setInterval(function(){
    if (!strati || !ambienteAcceso || !ctx) return;
    const p = pesiCorrenti.fucina || 0;
    if (p > 0.05 && Math.random() < 0.35*p){
      const t = ctx.currentTime + 0.02;
      colpo(t, { freq:2100, q:4, dur:0.12, vol:0.05*p, dest:busAmb });
      tono(t, { freq:380, dur:0.25, tipo:"triangle", vol:0.02*p, dest:busAmb });
    }
  }, 900);
}
// pesi fra 0 e 1: { onde, vento, mercato, cicale, fucina }
function ambiente(pesi){
  if (!ctx || !strati || !ambienteAcceso) return;
  pesiCorrenti = pesi || {};
  const t = ctx.currentTime;
  for (const k in strati){
    const obiettivo = Math.max(0, Math.min(1, pesiCorrenti[k] || 0));
    strati[k].gain.setTargetAtTime(obiettivo * 0.5, t, 1.2);   // rampa lenta: 1,2 s
  }
}
function fermaAmbiente(){
  ambienteAcceso = false;
  if (!strati || !ctx) return;
  for (const k in strati) strati[k].gain.setTargetAtTime(0, ctx.currentTime, 0.4);
}

// ===================== MANIFEST =====================
let MAN = null;
function init(){
  return fetch("assets/audio/manifest.json?v=164")
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){ MAN = j; return j; })
    .catch(function(){ return null; });
}
function fileMusica(k){ return MAN && MAN.musica && MAN.musica[k] ? "assets/audio/"+MAN.musica[k] : null; }
function fileVoce(k){ return MAN && MAN.voce && MAN.voce[k] ? "assets/audio/"+MAN.voce[k] : null; }

// ===================== MUSICA =====================
// I file passano dal bus musica come tutto il resto, cosi' l'abbassamento sotto la voce e' una
// rampa sul guadagno e non un numero riscritto a mano a ogni chiamata.
let elMus = null, temaCorr = null, temaPrima = null;
const sorgentiMus = new WeakMap();
function collega(el, bus, respira){
  ac();
  let s = sorgentiMus.get(el);
  if (!s){                       // un elemento puo' avere UNA sola sorgente: si tiene in mappa
    try { s = ctx.createMediaElementSource(el); sorgentiMus.set(el, s); }
    catch(e){ return null; }
  }
  const g = ctx.createGain(); g.gain.value = 0;
  s.connect(g);
  if (respira){
    // Il timbro respira: un passa-basso che si apre e si chiude con un giro di quaranta
    // secondi. Non cambia le note — non posso — ma toglie l'effetto "stessa registrazione
    // per la decima volta", perche' ogni passaggio suona un po' diverso.
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 3200; f.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 1/41;
    const amp = ctx.createGain(); amp.gain.value = 1500;
    lfo.connect(amp); amp.connect(f.frequency); lfo.start();
    g.connect(f); f.connect(bus);
    el._filtro = f; el._lfo = lfo;
  } else {
    g.connect(bus);
  }
  return g;
}
// Il silenzio e' il piu' vecchio rimedio alla ripetizione: ogni tanto la musica si ritira e
// resta solo l'ambiente — onde, vento, cicale — poi rientra. Con brani da un minuto e' cio'
// che fa la differenza fra una colonna sonora e una filastrocca.
let riposoTimer = null;
function pianificaRiposo(){
  if (riposoTimer) clearTimeout(riposoTimer);
  const attesa = (150 + Math.random()*150) * 1000;        // fra due minuti e mezzo e cinque
  riposoTimer = setTimeout(function(){
    if (musicaOn && elMus && elMus._g && !elVoce){
      const t = ctx.currentTime;
      elMus._g.gain.cancelScheduledValues(t);
      elMus._g.gain.setValueAtTime(elMus._g.gain.value, t);
      elMus._g.gain.linearRampToValueAtTime(0.0001, t + 4);      // si ritira in quattro secondi
      const g = elMus._g;
      setTimeout(function(){                                      // venticinque secondi di sola isola
        if (musicaOn && elMus && elMus._g === g){
          const t2 = ctx.currentTime;
          g.gain.setValueAtTime(0.0001, t2);
          g.gain.linearRampToValueAtTime(1, t2 + 5);
        }
      }, 25000);
    }
    pianificaRiposo();
  }, attesa);
}
function suonaTema(k){
  if (!musicaOn || k === temaCorr) return;
  const src = fileMusica(k);
  if (!src){ temaCorr = k; return; }
  fermaProcedurale();
  ac();
  const nuovo = new Audio(src);
  nuovo.loop = true; nuovo.preload = "auto";
  const vecchio = elMus, vecchioG = elMus ? elMus._g : null;
  nuovo.play().then(function(){
    const g = collega(nuovo, busMus, true);
    nuovo._g = g;
    if (!g) nuovo.volume = IMP.musica;        // ripiego: niente grafo, suona diretto
    elMus = nuovo; temaCorr = k;
    const t = ctx.currentTime;
    if (g){ g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 1.4); }
    if (vecchioG){
      vecchioG.gain.setValueAtTime(vecchioG.gain.value, t);
      vecchioG.gain.linearRampToValueAtTime(0.0001, t + 1.4);
    }
    if (vecchio) setTimeout(function(){
      try { vecchio.pause(); } catch(e){}
      if (vecchioG){ try { vecchioG.disconnect(); } catch(e){} }
      if (vecchio._lfo){ try { vecchio._lfo.stop(); } catch(e){} }
    }, 1600);
    pianificaRiposo();
  }).catch(function(){ temaCorr = null; avviaProcedurale(); });
}
function fermaMusicaFile(){
  if (elMus){ try { elMus.pause(); } catch(e){} elMus = null; }
  temaCorr = null;
}
function temaEra(era){ temaPrima = null; suonaTema("era"+era); }
function temaBattaglia(){
  if (!fileMusica("battaglia")){ sfx("battaglia"); return; }
  temaPrima = temaCorr; suonaTema("battaglia");
}
function fineBattaglia(){ if (temaPrima){ const k = temaPrima; temaPrima = null; suonaTema(k); } }

// ===================== VOCE =====================
let elVoce = null;
const cacheVoce = new Map();
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
// mentre parla il narratore musica e ambiente scendono, e risalgono da soli alla fine
function abbassa(giu){
  if (!ctx) return;
  const t = ctx.currentTime;
  busMus.gain.setTargetAtTime(IMP.musica   * (giu ? 0.25 : 1), t, giu ? 0.15 : 0.5);
  busAmb.gain.setTargetAtTime(IMP.ambiente * (giu ? 0.35 : 1), t, giu ? 0.15 : 0.5);
}
function parla(chiave, opz){
  if (!IMP.voceOn) return false;
  const src = fileVoce(chiave); if (!src) return false;
  try {
    ac();
    if (elVoce){ try { elVoce.pause(); } catch(e){} }
    const base = cacheVoce.get(chiave);
    const a = base && base.cloneNode ? base.cloneNode() : new Audio(src);
    const g = collega(a, busVoce);
    if (g){ a._g = g; g.gain.value = (opz && opz.vol) || 1; }
    else a.volume = IMP.voce * ((opz && opz.vol) || 1);
    a.play().catch(function(){});
    elVoce = a;
    abbassa(true);
    const fine = function(){
      if (elVoce === a){ elVoce = null; abbassa(false); }
      // staccare il nodo e' necessario: ogni battuta e' un clone nuovo, e un guadagno
      // ancora collegato al bus tiene in vita tutta la catena per sempre
      if (a._g){ try { a._g.disconnect(); } catch(e){} a._g = null; }
    };
    a.addEventListener("ended", fine);
    a.addEventListener("error", fine);
    return true;
  } catch(e){ return false; }
}
function zittisci(){
  if (elVoce){
    try { elVoce.pause(); } catch(e){}
    if (elVoce._g){ try { elVoce._g.disconnect(); } catch(e){} elVoce._g = null; }
    elVoce = null;
  }
  abbassa(false);
}
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
let timer = null, prossimaNota = 0, passo = 0;
function pianifica(){
  if (!musicaOn) return;
  const dur = 0.155;
  while (prossimaNota < ctx.currentTime + 0.35){
    const idx = passo % MELODIA.length;
    const n = MELODIA[idx];
    if (n) tono(prossimaNota, { freq:midi(n), dur:dur*1.8, tipo:"triangle", vol:0.16, dest:busMus });
    if (idx % 3 === 0){
      const b = BASSO[Math.floor(idx/3) % BASSO.length];
      tono(prossimaNota, { freq:midi(b), dur:dur*2.6, tipo:"sawtooth", vol:0.07, dest:busMus });
      colpo(prossimaNota, { freq: idx%6===0 ? 3000 : 6000, filtro:"highpass",
                            dur:0.12, vol: idx%6===0 ? 0.10 : 0.05, dest:busMus, riverbero:false });
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
  ac();
  musicaOn = !musicaOn;
  if (musicaOn){
    avviaAmbiente();
    const k = "era" + (era||0);
    if (fileMusica(k)) suonaTema(k); else avviaProcedurale();
  } else {
    fermaProcedurale(); fermaMusicaFile(); fermaAmbiente();
    if (riposoTimer){ clearTimeout(riposoTimer); riposoTimer = null; }
  }
  return musicaOn;
}

return {
  init: init, toggleMusica: toggleMusica, sfx: sfx,
  temaEra: temaEra, temaBattaglia: temaBattaglia, fineBattaglia: fineBattaglia,
  parla: parla, parlaUna: parlaUna, precarica: precarica, zittisci: zittisci,
  ambiente: ambiente, avviaAmbiente: avviaAmbiente,
  get musicaOn(){ return musicaOn; },
  get imp(){ return IMP; },
  // lettura dei guadagni reali dei bus: serve a vedere se l'abbassamento sotto la voce
  // sta davvero avvenendo, invece di fidarsi del fatto che la chiamata non ha lanciato
  get stato(){
    if (!ctx) return { attivo:false };
    const p = {};
    if (strati) for (const k in strati) p[k] = +strati[k].gain.value.toFixed(3);
    return { attivo:true, contesto:ctx.state,
             musica:+busMus.gain.value.toFixed(3), voce:+busVoce.gain.value.toFixed(3),
             effetti:+busFx.gain.value.toFixed(3), ambiente:+busAmb.gain.value.toFixed(3),
             voceInCorso: !!elVoce, tema: temaCorr, strati: p };
  },
  get effettiNoti(){ return Object.keys(EFFETTI); },
  set volMusica(x){ IMP.musica = x; if (busMus) busMus.gain.value = x; salvaImp(); },
  set volVoce(x){ IMP.voce = x; if (busVoce) busVoce.gain.value = x; salvaImp(); },
  set volEffetti(x){ IMP.effetti = x; if (busFx) busFx.gain.value = x; salvaImp(); },
  set volAmbiente(x){ IMP.ambiente = x; if (busAmb) busAmb.gain.value = x; salvaImp(); },
  set voceAttiva(x){ IMP.voceOn = !!x; if (!x) zittisci(); salvaImp(); },
  get haVoce(){ return !!(MAN && MAN.voce); },
  get haMusica(){ return !!(MAN && MAN.musica); }
};
})();
