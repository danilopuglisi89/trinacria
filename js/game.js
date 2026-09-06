// TRINACRIA — motore di gioco
window.GAME = (function(){
let st = null;
const D = () => GDATA;

function rnd(){ return Math.random(); }
function scegli(arr){ return arr[Math.floor(rnd()*arr.length)]; }

// ---------- CREAZIONE PARTITA ----------
function nuovaPartita(opts){
  resetIndiceTerritorio();
  const geo = MAP.build();
  st = {
    turno: 1, velocita: opts.velocita||"normale", difficolta: opts.difficolta||"normale",
    giocatore: opts.fazione!==undefined ? opts.fazione : 0,
    era: 0, anno: -735,
    comuni: [], fazioni: [], unita: [], invasori: [],
    nextUid: 1, meraviglie: {}, peste: null, eventiFatti: [], invasioniFatte: [],
    log: [], pending: [], vittoria: null, continua: false,
    effettiTemp: {},  // es. {terrore: turniRestanti}
    sagreAttive: [], visti: {}, aiuto: { azioni:0 }, eventiTurno: [], fumetti: [],
    poteri: { cooldown: {} },   // poteri del sovrano (mosse speciali a ricarica)
    sponsorCd: {},              // ricarica per POI sponsor "Rifocillati"
    guardaroba: { veste: [], manto: [], copricapo: [] },  // sblocchi cosmetici del sovrano (id da GUARDAROBA_EXTRA)
    nebbia: !!opts.nebbia, esplorato: {}, visibile: {}
  };
  // mappa DOP: nome comune -> prodotto
  const dopPerComune = {};
  for (const d of D().DOP) dopPerComune[d.comune] = d.id;
  // comuni
  st.comuni = geo.comuni.map(cm => ({
    id: cm.id, nome: cm.nome, prov: cm.prov, tier: cm.tier, hex: cm.hex, res: cm.res,
    // fondata:false = il comune e' solo un TOPONIMO sulla mappa, non una citta'. La partita
    // comincia con l'isola vuota: ogni fazione fonda la sua capitale e poi ci si espande coi
    // coloni. Il nome di una citta' fondata arriva gratis dal Voronoi: l'esagono appartiene
    // gia' al comune piu' vicino, quindi fondare presso Gravina di Catania la chiama cosi'.
    fondata: false,
    fazione: -1, pop: cm.tier+1, cibo: 0, unrest: 0, malusConq: 0, eruzioneMalus: 0,
    cultura: culturaIniziale(cm), integr: 100, dop: dopPerComune[cm.nome] || null,
    edifici: [], mura: 0, muraHP: 0, coda: [], prodAcc: 0, barocca: false, tributi: {}
  }));
  // fazioni
  st.fazioni = D().FAZIONI.map(f => ({
    id: f.id, nome: f.nome, eliminata: false,
    capitale: -1, oro: 120, sciAcc: 0, cultura: 0,
    techs: [], ricerca: null, percorsoRicerca: [], cultureId: f.cultura0,
    leader: null, dinastia: [], eroeVivo: false,
    diplo: {}, accordi: {}, ai: f.id !== st.giocatore,
    cont: { vinte:0, conquiste:0, briganti:0 }, intuizioni: {}, eta: "normale"
  }));
  for (const f of st.fazioni)
    for (const g of st.fazioni)
      if (f.id!==g.id) f.diplo[g.id] = { stato:"pace", atteggiamento: -5, turniPatto:0, turniGuerra:0, commercio:0 };
  // Ogni fazione fonda UNA sola citta': la sua capitale storica. Il giocatore ne sceglie
  // l'esagono esatto entro pochi passi dalla posizione reale (opts.hexCapitale).
  for (const fd of D().FAZIONI){
    const f = st.fazioni[fd.id];
    let cap = st.comuni.find(c => c.nome === fd.capitale);
    if (fd.id === st.giocatore && opts.hexCapitale !== undefined && opts.hexCapitale >= 0){
      const scelto = st.comuni[MAP.hexes[opts.hexCapitale].comune];
      if (scelto && !scelto.fondata){ cap = scelto; cap.hex = opts.hexCapitale; }
    }
    fondaComune(cap, fd.id);
    cap.pop += 2; f.capitale = cap.id;
    f.leader = nuovoLeader(fd.id, 0, true);
    // sovrano personalizzato del giocatore (nome + aspetto scelti nella schermata iniziale)
    if (fd.id === st.giocatore){
      if (opts.sovranoNome) f.leader.nome = opts.sovranoNome;
      if (opts.sovranoLook) f.leader.look = opts.sovranoLook;
      if (opts.sovranoRitratto !== undefined) f.leader.ritratto = opts.sovranoRitratto;
      f.leader.storico = false;
    }
    // Si comincia SENZA esercito: un solo esploratore. Tutto il resto — coloni, lavoratori,
    // prima truppa d'attacco — lo si sceglie in citta', ed e' quella scelta a dare il carattere
    // ai primi turni: chi si espande, chi coltiva, chi arma.
    creaUnita("esploratore", fd.id, cap.hex);
  }
  // NIENTE regno iniziale gia' formato: prima ogni comune entro 9 esagoni dal capoluogo
  // entrava d'ufficio nel regno, e si partiva con una decina di citta' in mano. Ora la
  // Sicilia e' vuota e il territorio se lo guadagna chi fonda.
  // Briganti erranti al posto delle guarnigioni: le milizie stavano DENTRO le citta'
  // indipendenti, che ora non esistono piu'. Restano come pericolo sparso per le campagne,
  // cosi' i primi turni non sono una passeggiata.
  // Covi di briganti: otto accampamenti sui rilievi, lontani dalle capitali, che sfornano
  // bande e crescono se ignorati. Danno ai primi turni un nemico con un indirizzo, e un motivo
  // per addestrare la prima truppa d'attacco invece del terzo colono. Spazzarne uno rende oro
  // e conta per l'Intuizione della Falange. Le bande erranti di prima nascevano a caso.
  st.covi = [];
  {
    const capitali = st.comuni.filter(c => c.fondata).map(c => c.hex);
    const posti = MAP.terre.filter(h => !h.lago && !h.isola && (h.terra==="mountain" || h.terra==="hill" || h.terra==="forest")
                                   && capitali.every(c => MAP.distKm(c, h.i) > MAP.R*2*14));
    for (let tent=0; tent<400 && st.covi.length<8 && posti.length; tent++){
      const h = posti[Math.floor(rnd()*posti.length)];
      if (st.covi.some(c => MAP.distKm(c.hex, h.i) < MAP.R*2*10)) continue;   // ben distanziati
      st.covi.push({ hex:h.i, forza:1, prossimo: 6 + Math.floor(rnd()*6), nato: 1 });
      creaUnita("milizia", -1, h.i);
      const v = MAP.vicini(h.i).find(j => !MAP.hexes[j].mare && !MAP.hexes[j].lago);
      if (v !== undefined) creaUnita("milizia", -1, v);
    }
  }
  aggiungiLog("🔱 " + D().ERE[0].nome + " — La Sicilia attende il suo padrone. " +
    D().FAZIONI[st.giocatore].motto, "era");
  calcolaVisibilita();
  return st;
}

function culturaIniziale(cm){
  const lon = window.DATA_COMUNI[cm.id][2];
  const capoluogo = ["Palermo","Trapani","Marsala","Mazara del Vallo","Erice"].includes(cm.nome);
  if (lon < 13.3 || capoluogo) return "punica";
  if (lon > 14.5) return "greca";
  return "sicula";
}

function nuovoLeader(fid, era, iniziale){
  const storico = D().LEADER_STORICI[fid] && D().LEADER_STORICI[fid][era];
  const f = st ? st.fazioni[fid] : null;
  const cult = f ? f.cultureId : D().FAZIONI[fid].cultura0;
  const nome = storico || scegli(D().NOMI_EREDI[cult] || D().NOMI_EREDI.siciliana);
  const tratti = Object.keys(D().TRATTI);
  return { nome, eta: 25 + Math.floor(rnd()*15), tratto: scegli(tratti), storico: !!storico };
}

// dove nasce un'unita' appena completata: le navi vanno varate in un esagono d'acqua
// adiacente alla citta', non sull'esagono della citta' (che e' terra e le lascerebbe incagliate)
function hexVaro(cm, tipo){
  if (dominioTipo(tipo) !== "mare") return cm.hex;
  const acque = MAP.vicini(cm.hex).filter(j => MAP.hexes[j].mare && unitaSuHex(j).length < 4);
  if (acque.length) return acque[0];
  // nessuna acqua libera adiacente: allarga di un anello
  for (const j of MAP.vicini(cm.hex))
    for (const k of MAP.vicini(j))
      if (MAP.hexes[k].mare && unitaSuHex(k).length < 4) return k;
  return cm.hex;
}
function creaUnita(tipo, fid, hex, nome){
  const u = { id: st.nextUid++, tipo, fazione: fid, hex, hp: 100, mov: statU(tipo).mov, xp: 0,
              nome: nome||null, goto: null, fortificata: false, camminato: false };
  if (tipo==="lavoratore") u.usiRimasti = 3;
  st.unita.push(u);
  return u;
}

// stat unità con scala per era (milizie/eroi)
function statU(tipo){
  const b = D().UNITA[tipo];
  if (tipo==="milizia"){
    // briganti e ribelli: il 70% del fante di linea dell'era corrente. Con il vecchio ×0.75 per
    // era, nell'era 5 una milizia (def 24) batteva un balestriere (def 12) e nessuno la attaccava
    const linea = D().UNITA[(D().LINEA_ERA[st?st.era:0]||[])[0]] || b;
    return { ...b, atk: Math.max(b.atk, Math.round(linea.atk*0.7)), def: Math.max(b.def, Math.round(linea.def*0.7)) };
  }
  if (tipo==="eroe" || tipo==="guarnigione"){
    const m = 1 + (st?st.era:0) * 0.75;
    return { ...b, atk: Math.round(b.atk*m), def: Math.round(b.def*m) };
  }
  return b;
}

function anniPerTurno(){
  if (st.anno >= 1700) return 0; // il calendario si ferma, i turni continuano
  const era = D().ERE[st.era];
  return (era.a - era.da) / D().VELOCITA[st.velocita].turniEra;
}
function annoStr(a){
  a = Math.round(a);
  return a < 0 ? (-a)+" a.C." : a+" d.C.";
}
function aggiungiLog(testo, tipo){
  st.log.unshift({ turno: st.turno, anno: annoStr(st.anno), testo, tipo: tipo||"info" });
  if (st.log.length > 120) st.log.pop();
}
// coda di reazioni-fumetto dei personaggi (svuotata dalla UI)
function spara(tipo, ctx){
  if (!st.fumetti) st.fumetti = [];
  if (st.fumetti.length < 6) st.fumetti.push({ tipo, ctx: ctx||{} });
}

// ---------- RESE / PRODUZIONE ----------
// ---------- CUCINA & TIPICITÀ ----------
function dopInfo(id){ return D().DOP.find(d=>d.id===id); }
// prodotti DOP controllati dalla fazione (comune posseduto + tech eventuale)
function dopControllati(fid){
  const f = st.fazioni[fid]; if (!f) return [];
  const out = [];
  for (const cm of st.comuni){
    if (cm.fazione!==fid || !cm.dop) continue;
    const d = dopInfo(cm.dop);
    if (d.tech && !f.techs.includes(d.tech)) continue;
    out.push(d);
  }
  return out;
}
function conteggioCategorie(dopList){
  const c = {}; for (const d of dopList) c[d.cat]=(c[d.cat]||0)+1; return c;
}
// piatti sbloccati dalle categorie possedute
function piattiSbloccati(fid){
  const cat = conteggioCategorie(dopControllati(fid));
  return D().PIATTI.filter(p => Object.keys(p.reqCat).every(k => (cat[k]||0) >= p.reqCat[k]));
}
// bonus aggregati della cucina (piatti + sagre attive) per la fazione — memoizzato per turno
let _cucinaMemo = {};
function cucinaReset(){ _cucinaMemo = {}; if (typeof serviziReset === 'function') serviziReset(); }
function cucinaBonus(fid){
  if (_cucinaMemo[fid]) return _cucinaMemo[fid];
  const b = { oroPct:0, ciboPct:0, culturaPct:0, malcontento:0 };
  for (const p of piattiSbloccati(fid)){
    const e = p.eff;
    b.oroPct += e.oroPct||0; b.ciboPct += e.ciboPct||0; b.culturaPct += e.culturaPct||0; b.malcontento += e.malcontento||0;
  }
  for (const s of (st.sagreAttive||[])){
    if (s.fid!==fid) continue;
    b.oroPct += s.eff.oroPct||0; b.ciboPct += s.eff.ciboPct||0; b.culturaPct += s.eff.culturaPct||0; b.malcontento += s.eff.malcontento||0;
  }
  _cucinaMemo[fid] = b;
  return b;
}
function cucina(fid){
  const dop = dopControllati(fid);
  return { dop, catCount: conteggioCategorie(dop), piatti: piattiSbloccati(fid), bonus: cucinaBonus(fid) };
}
function faSagra(fid, id){
  const s = D().SAGRE.find(x=>x.id===id); if (!s) return false;
  const f = st.fazioni[fid]; if (f.oro < s.costo) return false;
  f.oro -= s.costo;
  st.sagreAttive = st.sagreAttive || [];
  // rimpiazza una sagra uguale già attiva
  st.sagreAttive = st.sagreAttive.filter(x=>!(x.fid===fid && x.id===id));
  st.sagreAttive.push({ fid, id, turni: s.turni, eff: s.eff, nome: s.nome });
  cucinaReset();
  if (fid===st.giocatore) aggiungiLog("🎉 "+s.nome+"! "+s.testo, "bene");
  return true;
}

// bonus passivi cumulati dalle tecnologie (rami tematici) — memoizzato
let _techMemo = {};
function techBonusReset(){ _techMemo = {}; }
function techBonus(fid){
  if (_techMemo[fid]) return _techMemo[fid];
  const f = st.fazioni[fid];
  const b = { oroPct:0, sciPct:0, culturaPct:0, ciboPct:0, combatPct:0, growthPct:0, malcontento:0,
              prodPct:0, mantPct:0, fedelta:0, caseExtra:0, serviziExtra:0 };
  if (f) for (const id of f.techs){ const t = D().TECH.find(x=>x.id===id); if (t && t.bonus){ for (const k in t.bonus) b[k]=(b[k]||0)+t.bonus[k]; } }
  { const be = bonusEditti(f); for (const k in be) b[k] = (b[k]||0) + be[k]; }
  _techMemo[fid] = b;
  return b;
}

function reseComune(cm){
  let f=1, p=1, o=1, s=0, cu=0;
  if (cm.tier>=3){ f+=1; p+=1; o+=1; }
  const faz = cm.fazione>=0 && cm.fazione<100 ? st.fazioni[cm.fazione] : null;
  const bonusId = faz ? D().FAZIONI[faz.id].bonusId : null;
  for (const h of territorioDi(cm.id)){   // solo le caselle davvero possedute (indice)
    let hf=0, hp=0, ho=0;
    if (h.terra==="plain"){ hf=2; hp=1; if (faz && faz.techs.includes("grano_t")) hf+=0.5; }
    else if (h.terra==="hill"){ hf=1; hp=1; }
    else if (h.terra==="mountain"){ hp=2; }
    else if (h.terra==="forest"){ hf=1; hp=1; }
    else if (h.terra==="volcano"){ hp=1; }
    else if (h.terra==="lago"){ hf=2; ho=0.5; }        // pesca d'acqua dolce e irrigazione
    if (h.fiume) hf+=1;
    if (h.costa) ho+=0.5;
    if (h.imp){
      // bonus letti direttamente dai campi numerici della miglioria (generico: vale per
      // qualunque nuova miglioria aggiunta ai dati, senza dover toccare questo file ogni volta)
      const im = D().MIGLIORIE[h.imp];
      hf += im.cibo||0; hp += im.prod||0; ho += im.oro||0;
      // sinergie con tecnologie specifiche (solo le due migliorie agricole storiche)
      if (h.imp==="fattoria" && faz){ if (faz.techs.includes("latifondo")) hf+=1; if (faz.techs.includes("qanat")) hf+=1; }
      if (h.imp==="frutteto" && faz && faz.techs.includes("qanat")) hf+=1;
    }
    if (h.res){
      const r = RES_INFO[h.res];
      if (!(h.res==="agrumi" && (!faz || !faz.techs.includes("agrumi")))){
        hf += r.cibo||0; hp += r.prod||0;
        let ro = r.oro||0;
        if (bonusId==="sale") ro *= 2;
        ho += ro; cu += r.cultura||0;
      }
    }
    if (h.quart){
      // il quartiere rende per quello che ha intorno (vedi adiacenzaQuartiere)
      const aq = adiacenzaQuartiere(h.i, h.quart).rese;
      hf += aq.cibo||0; hp += aq.prod||0; ho += aq.oro||0;
      s += aq.scienza||0; cu += aq.cultura||0;
    }
    if (h.etna && bonusId==="etna"){ hf*=1.3; hp*=1.3; }
    f+=hf; p+=hp; o+=ho;
  }
  // edifici
  const ed = cm.edifici;
  if (ed.includes("mercato")) o+=3;
  if (ed.includes("porto")){ o+=3; f+=2; if (faz&&faz.techs.includes("seta")) o+=2; }
  if (ed.includes("tempio")) cu+=2;
  if (ed.includes("teatro")) cu+=3;
  if (ed.includes("accademia")) s+=3;
  if (ed.includes("casascienza")) s+=4;
  if (ed.includes("cattedrale")) cu+=4;
  if (ed.includes("banco")) o+=5;
  if (ed.includes("castello")) p+=1;
  // edifici legati al territorio (differenziano le città per terreno/costa)
  if (ed.includes("cava_marmo")){ p+=3; o+=2; }
  if (ed.includes("silos_grano")) f+=3;
  if (ed.includes("cantiere")){ o+=3; p+=2; }
  if (ed.includes("fonderia")) p+=4;
  // edifici caratteristici (monumenti/fortificazioni storiche reali del comune)
  for (const id of ed){
    const el = D().EDIFICI_LOCALI.find(x=>x.id===id);
    if (el){ if (el.cultura) cu+=el.cultura; if (el.oro) o+=el.oro; }
  }
  if (cm.barocca) cu+=4;
  // meraviglie
  for (const mid of Object.keys(st.meraviglie)){
    if (st.meraviglie[mid] !== cm.id) continue;
    if (mid==="concordia") cu+=5;
    if (mid==="teatro_sir"){ cu+=4; s+=2; }
    if (mid==="teatro_tao"){ cu+=4; o+=3; }
    if (mid==="villa_casale"){ o+=5; cu+=2; }
    if (mid==="cuba"){ o+=4; cu+=3; }
    if (mid==="monreale") cu+=6;
    if (mid==="palatina"){ cu+=5; o+=3; }
    if (mid==="cefalu") cu+=4;
    if (mid==="ursino") p+=2;
    if (mid==="noto_duomo") cu+=7;
    // meraviglie del gusto
    if (mid==="saline_tp"){ o+=6; f+=2; }
    if (mid==="tonnara"){ o+=4; f+=3; }
    if (mid==="ballaro") o+=7;
    if (mid==="kolymbethra"){ f+=3; cu+=3; }
  }
  // prodotto DOP del comune (controllato + tech)
  if (cm.dop && faz){
    const d = D().DOP.find(x=>x.id===cm.dop);
    if (d && (!d.tech || faz.techs.includes(d.tech))){
      f += d.cibo||0; o += d.oro||0; cu += d.cultura||0;
    }
  }
  // cucina + tecnologie (bonus % cibo per città)
  if (faz){
    const cb = cucinaBonus(faz.id);
    if (cb.ciboPct) f *= (1 + cb.ciboPct);
    const tb = techBonus(faz.id);
    if (tb.ciboPct) f *= (1 + tb.ciboPct);
    if (tb.prodPct) p *= (1 + tb.prodPct);
  }
  // bonus fazione
  if (bonusId==="grano") f+=2;
  if (bonusId==="oro" && faz && faz.capitale===cm.id) o+=4;
  if (faz && faz.capitale===cm.id){ f*=1.15; p*=1.15; o*=1.15; }
  // popolazione lavora
  const mol = 0.6 + cm.pop*0.06;
  f*=mol; p*=mol; o*=mol;
  // malcontento
  if (cm.unrest>8){ f*=0.5; p*=0.5; o*=0.5; }
  else if (cm.unrest>5){ f*=0.75; p*=0.75; o*=0.75; }
  // cenere e colate laviche: territorio colpito da un'eruzione recente rende meno, si riprende nei turni
  if (cm.eruzioneMalus>0){ f*=0.6; o*=0.7; }
  // scuola siciliana / barocco (tech cultura per città)
  if (faz){
    if (faz.techs.includes("scuola")) cu+=3;
    if (faz.techs.includes("barocco")) cu+=4;
    if (faz.techs.includes("monasteri") && ed.includes("tempio")) cu+=3;
  }
  { const em = etaMult(faz); f *= em.cibo; cu *= em.cultura; }   // età d'oro / oscura
  { const fm = fedeltaMult(cm); if (fm < 1){ f*=fm; p*=fm; o*=fm; s*=fm; cu*=fm; } }   // popolo che non ti vuole
  return { cibo:f, prod:p, oro:o, scienza:s, cultura:cu };
}

function reseFazione(fid){
  const f = st.fazioni[fid];
  let oro=0, sci=0, cul=0;
  for (const cm of st.comuni){
    if (cm.fazione !== fid) continue;
    const r = reseComune(cm);
    oro += r.oro; sci += r.scienza; cul += r.cultura;
  }
  sci += 6; // base (più scienza = ricerche più rapide)
  const fd = D().FAZIONI[fid];
  if (fd.bonusId==="scienza") sci *= 1.3;
  if (f.leader){
    if (f.leader.tratto==="mercante") oro *= 1.15;
    if (f.leader.tratto==="dotto") sci *= 1.15;
  }
  if (f.techs.includes("moneta")) oro *= 1.10;
  if (f.techs.includes("strade")) oro *= 1.05;
  if (f.techs.includes("thema")) oro *= 1.15;
  if (f.techs.includes("duana")) oro *= 1.20;
  // accordi commerciali
  let nAcc = 0;
  for (const k of Object.keys(f.diplo)) if (f.diplo[k].commercio>0) nAcc++;
  oro += nAcc*3 + (fd.bonusId==="stretto" ? nAcc*3 : 0);
  // mantenimento unità (cresce con l'era: eserciti numerosi pesano sempre di più sulle casse)
  let mant = 0;
  for (const u of st.unita) if (u.fazione===fid && u.tipo!=="colono") mant += D().UNITA[u.tipo].mant;
  mant *= 1 + st.era*0.2;
  // Mantenimento degli EDIFICI: senza, l'oro si accumulava all'infinito (oltre centomila a
  // fine partita) perche' nelle ere tarde non c'era piu' nulla su cui spenderlo. Cosi' invece
  // un impero grande e pieno di monumenti costa davvero, e conviene sceglierli.
  let edifici = 0;
  for (const cm of st.comuni) if (cm.fazione===fid) edifici += cm.edifici.length;
  mant += edifici * (1 + st.era*0.35);
  if (fd.bonusId==="stretto") mant *= 0.85;
  if (f.techs.includes("stato")) mant *= 0.75;
  { const tb = techBonus(fid); if (tb.mantPct) mant *= (1 + tb.mantPct); }
  if (st.effettiTemp["quarantena"] && fid===st.giocatore) oro *= 0.5;
  if (fid_effetto("grandeOro", fid)) oro *= 1.25;
  // cucina: piatti + sagre (bonus % oro e cultura)
  const cb = cucinaBonus(fid);
  if (cb.oroPct) oro *= (1 + cb.oroPct);
  if (cb.culturaPct) cul *= (1 + cb.culturaPct);
  // tecnologie (rami tematici)
  const tb = techBonus(fid);
  oro *= (1 + tb.oroPct); cul *= (1 + tb.culturaPct); sci *= (1 + tb.sciPct);
  return { oro: oro-mant, scienza: sci, cultura: cul, mant };
}

// ---------- MALCONTENTO / POPOLAZIONE ----------
function aggiornaComune(cm){
  const faz = cm.fazione>=0 && cm.fazione<100 ? st.fazioni[cm.fazione] : null;
  // integrazione culturale
  let vel = 1;
  if (cm.edifici.includes("tempio")||cm.edifici.includes("cattedrale")) vel = 2;
  cm.integr = Math.min(100, cm.integr + vel);
  if (cm.malusConq>0) cm.malusConq--;
  if (cm.eruzioneMalus>0) cm.eruzioneMalus--;
  // malcontento
  let u = 0;
  if (cm.integr < 40) u += 3; else if (cm.integr < 70) u += 1;
  u += cm.malusConq > 0 ? 4 : 0;
  if (st.peste && st.peste.infetti.includes(cm.id)) u += 3;
  if (cm.edifici.includes("tempio")) u -= 2;
  for (const hq of quartieriDi(cm.id)){                 // il Sagrato tiene buono il popolo
    const qd = quartiereDef(hq.quart);
    if (qd && qd.base.calma) u -= qd.base.calma;
  }
  if (cm.edifici.includes("cattedrale")) u -= 3;
  if (cm.edifici.includes("teatro")) u -= 1;
  for (const id of cm.edifici){ const el = D().EDIFICI_LOCALI.find(x=>x.id===id); if (el && el.malcontento) u -= el.malcontento; }
  if (faz){
    if (faz.leader && faz.leader.tratto==="pio") u -= 2;
    if (faz.leader && faz.leader.tratto==="ambizioso") u += 1;
    if (faz.techs.includes("diritto")) u -= 2;
    if (faz.techs.includes("stato")) u -= 2;
    if (st.meraviglie["monreale"]!==undefined && st.comuni[st.meraviglie["monreale"]] && st.comuni[st.meraviglie["monreale"]].fazione===faz.id) u -= 2;
    if (st.meraviglie["cefalu"]!==undefined && st.comuni[st.meraviglie["cefalu"]] && st.comuni[st.meraviglie["cefalu"]].fazione===faz.id) u -= 2;
    if (st.meraviglie["concordia"]!==undefined && st.comuni[st.meraviglie["concordia"]].fazione===faz.id && st.comuni[st.meraviglie["concordia"]].prov===cm.prov) u -= 2;
    if (fid_effetto("terrore", faz.id)) u -= 4;
    // ballarò: mercato che calma il popolo
    if (st.meraviglie["ballaro"]!==undefined && st.comuni[st.meraviglie["ballaro"]].fazione===faz.id) u -= 1;
    // cucina + tecnologie che riducono il malcontento
    u -= cucinaBonus(faz.id).malcontento;
    if (fid_effetto("grandeCalma", faz.id)) u -= 2;
    u -= techBonus(faz.id).malcontento;
    u += etaMult(faz).unrest;                       // età d'oro calma, età oscura agita
  }
  // pane e feste: se il popolo non ha di che consolarsi, mormora
  {
    const sv = serviziComune(cm);
    if (sv.mancano > 0) u += Math.min(4, sv.mancano);
    else if (sv.offerti > sv.richiesti) u -= 1;
  }
  // malcontento "extra" dei dilemmi: si riassorbe di 1 a turno
  if (cm.unrestExtra){ u += cm.unrestExtra; cm.unrestExtra += cm.unrestExtra > 0 ? -1 : 1; if (Math.abs(cm.unrestExtra) < 1) cm.unrestExtra = 0; }
  cm.unrest = Math.max(0, Math.min(12, u));
  // crescita
  if (cm.fazione !== -1){
    const r = reseComune(cm);
    const mangia = cm.pop * 1.5;
    let sur = r.cibo - mangia;
    if (cm.edifici.includes("granaio")) sur *= 1.3;
    if (faz && faz.techs.includes("acquedotti")) sur *= 1.25;
    if (faz && sur>0) sur *= (1 + techBonus(faz.id).growthPct);
    // le case mettono un tetto: senza acqua, campi e acquedotti una citta' non cresce oltre
    // il suo borgo, e l'oro trova finalmente qualcosa da comprare (granai, porti, quartieri)
    const case_ = caseComune(cm).n;
    if (cm.pop >= case_) sur = Math.min(sur, 0);
    else if (cm.pop >= case_-1) sur *= 0.5;
    // popolo scontento, meno figli: il malcontento vero e' quasi sempre azzerato dai bonus,
    // quindi il peso dei servizi mancanti sta tutto qui, e cresce con quanti ne mancano
    if (sur > 0){
      const mancano = serviziComune(cm).mancano;
      if (mancano > 0) sur *= (1 - Math.min(0.40, 0.10*mancano));
    }
    cm.cibo += sur;
    const soglia = 20 + cm.pop*4;
    if (cm.cibo >= soglia && cm.pop < 25 && cm.pop < case_){
      cm.cibo -= soglia; cm.pop++;
      espandiTerritorio(cm);         // ogni abitante in piu' allarga i confini di una casella
    }
    if (cm.cibo < -10 && cm.pop > 1){ cm.pop--; cm.cibo = 0; aggiungiLog("Carestia a "+cm.nome+": la popolazione cala.", "male"); }
    if (cm.cibo < 0) cm.cibo = Math.max(cm.cibo, -10);
    // produzione coda
    cm.prodAcc += r.prod;
    lavoraCoda(cm);
  }
  // (rimosse su richiesta: rivolte per malcontento, insorgenza contro occupanti stranieri e
  // rigenerazione periodica delle milizie indipendenti — niente più "milizie dal nulla" nelle
  // città. Le uniche milizie indipendenti restano quelle piazzate una tantum a inizio partita.)
}

function fid_effetto(nome, fid){
  return st.effettiTemp[nome+"_"+fid] > 0;
}

function lavoraCoda(cm){
  if (!cm.coda.length) return;
  const item = cm.coda[0];
  if (cm.prodAcc >= item.costo){
    cm.prodAcc -= item.costo;
    completaItem(cm, item);
    cm.coda.shift();
  }
}
function completaItem(cm, item){
  if (window.FX && item.tipo!=="unita"){ const h=MAP.hexes[cm.hex]; FX.constructionPop(h.x, h.y-3); }
  if (item.tipo==="unita"){
    creaUnita(item.id, cm.fazione, hexVaro(cm, item.id));
    if (cm.fazione===st.giocatore) aggiungiLog(D().UNITA[item.id].nome+" pronti a "+cm.nome+".", "bene");
  } else if (item.tipo==="edificio"){
    cm.edifici.push(item.id);
    if (item.id==="mura1"){ cm.mura=1; cm.muraHP=100; }
    if (item.id==="mura2"){ cm.mura=2; cm.muraHP=200; }
    if (item.id==="mura3"){ cm.mura=3; cm.muraHP=300; }
    if (cm.fazione===st.giocatore) aggiungiLog(D().EDIFICI[item.id].nome+" completato a "+cm.nome+".", "bene");
  } else if (item.tipo==="meraviglia"){
    st.meraviglie[item.id] = cm.id;
    const m = D().MERAVIGLIE.find(x=>x.id===item.id);
    aggiungiLog("🏛️ "+st.fazioni[cm.fazione].nome+" ha costruito "+m.nome+" a "+cm.nome+"!", "era");
    if (cm.fazione===st.giocatore){
      st.pending.push({ titolo:m.nome, testo:m.desc+"\n\n"+m.eff, scelte:[{label:"Gloria eterna!", eff:"nulla"}] });
      provaSbloccoGuardaroba("meraviglia", 0.6);
    }
  } else if (item.tipo==="quartiere"){
    // la casella scelta al momento dell'ordine puo' non valere piu' (confine cambiato, un'altra
    // costruzione l'ha occupata): in quel caso si ripiega sulla migliore ancora disponibile
    let dove = (item.hex !== undefined && puoQuartiere(cm, item.hex, item.id, true)) ? item.hex : -1;
    if (dove < 0){ const c = caselleQuartiere(cm, item.id); dove = c.length ? c[0].hex : -1; }
    if (dove < 0 || !posaQuartiere(cm, dove, item.id, true)){
      if (cm.fazione===st.giocatore) aggiungiLog("Nessuna casella libera per il quartiere a "+cm.nome+".", "male");
    } else {
      const q = quartiereDef(item.id);
      if (cm.fazione===st.giocatore){
        aggiungiLog(q.nome+" costruito a "+cm.nome+".", "bene");
        const hq = MAP.hexes[dove];
        if (window.FX) FX.constructionPop(hq.x, hq.y-3);
      }
    }
  } else if (item.tipo==="locale"){
    cm.edifici.push(item.id);
    const el = D().EDIFICI_LOCALI.find(x=>x.id===item.id);
    aggiungiLog("🏛️ "+el.nome+" restaurato a "+cm.nome+"!", cm.fazione===st.giocatore?"bene":"info");
    if (cm.fazione===st.giocatore){
      st.pending.push({ titolo:el.nome, testo:el.eff, scelte:[{label:"Magnifico!", eff:"nulla"}] });
      provaSbloccoGuardaroba("evento", 0.25);
    }
  }
}

// terreno dominante nel territorio di un comune (per differenziare le costruzioni disponibili);
// null se il territorio è troppo misto per avere un carattere unico
function terrenoDominante(cm){
  const cont = {}; let tot = 0;
  for (const h of territorioDi(cm.id)){
    cont[h.terra] = (cont[h.terra]||0)+1; tot++;
  }
  if (!tot) return null;
  let best=null, bn=0;
  for (const t in cont) if (cont[t]>bn){ bn=cont[t]; best=t; }
  return (bn/tot >= 0.35) ? best : null;
}

// ---------- COSTRUZIONI DISPONIBILI ----------
function costruzioniDisponibili(cm){
  const f = st.fazioni[cm.fazione];
  const out = [];
  const costiero = MAP.hexes[cm.hex].costa || MAP.vicini(cm.hex).some(i=>MAP.hexes[i].costa);
  const terrDom = terrenoDominante(cm);
  for (const id of Object.keys(D().EDIFICI)){
    const e = D().EDIFICI[id];
    if (cm.edifici.includes(id)) continue;
    if (cm.coda.some(x=>x.id===id)) continue;
    if (e.tech && !f.techs.includes(e.tech)) continue;
    if (e.req && !cm.edifici.includes(e.req)) continue;
    if (e.costiero && !costiero) continue;
    if (e.terrenoDom && !e.terrenoDom.includes(terrDom)) continue;
    let costo = e.costo;
    if (f.leader && f.leader.tratto==="costruttore") costo = Math.round(costo*0.85);
    if (id==="mercato" && D().FAZIONI[f.id].bonusId==="oro") costo = Math.round(costo*0.5);
    if (id==="tempio" && D().FAZIONI[f.id].bonusId==="templi") costo = Math.round(costo*0.75);
    out.push({ tipo:"edificio", id, nome:e.nome, icona:e.icona, costo, eff:e.eff });
  }
  // edifici caratteristici del comune reale (monumenti/fortificazioni storiche minori)
  for (const el of D().EDIFICI_LOCALI){
    if (el.comune !== cm.nome) continue;
    if (cm.edifici.includes(el.id)) continue;
    if (cm.coda.some(x=>x.id===el.id)) continue;
    let costo = el.costo;
    if (f.leader && f.leader.tratto==="costruttore") costo = Math.round(costo*0.85);
    // icona AI generica per tipo di edificio locale (castello/chiesa/torre/villa/scalinata)
    const n = el.nome.toLowerCase();
    const icoId = /scalinata/.test(n) ? "loc_scalinata" : /torre/.test(n) ? "loc_torre" : /villa/.test(n) ? "loc_villa"
                : /castello|rocca/.test(n) ? "loc_castello" : "loc_chiesa";
    out.push({ tipo:"locale", id:el.id, nome:el.nome, icona:el.icona, costo, eff:el.eff, icoId });
  }
  for (const m of D().MERAVIGLIE){
    if (st.meraviglie[m.id]!==undefined) continue;
    if (m.comune !== cm.nome) continue;
    if (m.era > st.era) continue;
    if (m.tech && !f.techs.includes(m.tech)) continue;
    if (cm.coda.some(x=>x.id===m.id)) continue;
    if (m.id==="noto_duomo" && !cm.barocca) continue;
    let costo = m.costo;
    if (D().FAZIONI[f.id].bonusId==="templi") costo = Math.round(costo*0.75);
    out.push({ tipo:"meraviglia", id:m.id, nome:m.nome, icona:"🏛️", costo, eff:m.eff, desc:m.desc });
  }
  return out;
}
// ---------- LIMITE ESERCITO ----------
// un regno non dovrebbe mai accumulare più di 4-5 truppe assieme: eserciti piccoli ma
// mantenuti bene, non stack infiniti. Si applica identicamente a giocatore e IA.
// Quante truppe puo' mantenere un regno. Era un numero FISSO (4 o 5) qualunque fosse la
// dimensione dell'impero: nato quando ogni fazione partiva con una decina di citta' gia'
// assegnate e il gioco era fatto di scaramucce. Ora che le citta' si fondano e si arriva a
// tredici, cinque soldati non bastano ne' a difendere ne' a conquistare — l'IA aveva eserciti
// ridicoli e le guerre non decidevano nulla. Il limite ora cresce col regno.
function cittaDi(fid){ let n=0; for (const cm of st.comuni) if (cm.fazione===fid && cm.fondata) n++; return n; }
function limiteEsercito(fid){
  const c = (fid === undefined) ? cittaDi(st.giocatore) : cittaDi(fid);
  return Math.max(3, 2 + c*2 + st.era);
}
function limiteLavoratori(fid){
  const c = (fid === undefined) ? cittaDi(st.giocatore) : cittaDi(fid);
  return Math.max(2, 1 + Math.ceil(c/2));
}
function truppeFazione(fid){
  let n = 0;
  for (const u of st.unita) if (u.fazione===fid && !fuoriConteggio(u.tipo)) n++;
  for (const cm of st.comuni) if (cm.fazione===fid)
    for (const it of cm.coda) if (it.tipo==="unita" && !fuoriConteggio(it.id)) n++;
  return n;
}
// coloni, lavoratori e NAVI non pesano sul limite dell'esercito di terra. Le navi in
// particolare: contandole, un'IA col limite gia' saturo non avrebbe mai armato una flotta
// e le isole sarebbero rimaste deserte per sempre.
function fuoriConteggio(tipo){
  return tipo==="colono" || tipo==="lavoratore" || dominioTipo(tipo)==="mare";
}
// tetto separato per le flotte, cresce con le ere
function limiteFlotta(){ return 2 + Math.floor(st.era/2); }
function flottaFazione(fid){
  let n = 0;
  for (const u of st.unita) if (u.fazione===fid && eNavale(u)) n++;
  for (const cm of st.comuni) if (cm.fazione===fid)
    for (const it of cm.coda) if (it.tipo==="unita" && dominioTipo(it.id)==="mare") n++;
  return n;
}
function lavoratoriFazione(fid){
  let n = 0;
  for (const u of st.unita) if (u.fazione===fid && u.tipo==="lavoratore") n++;
  for (const cm of st.comuni) if (cm.fazione===fid)
    for (const it of cm.coda) if (it.tipo==="unita" && it.id==="lavoratore") n++;
  return n;
}
// una citta' e' costiera se il suo esagono tocca il mare: e' li' che si costruiscono le navi
function cittaCostiera(cm){
  const h = MAP.hexes[cm.hex];
  if (!h) return false;
  if (h.costa) return true;
  return MAP.vicini(cm.hex).some(j => MAP.hexes[j].mare);
}
function unitaDisponibili(cm){
  const f = st.fazioni[cm.fazione];
  const alCompleto = truppeFazione(cm.fazione) >= limiteEsercito(cm.fazione);
  const lavCapRaggiunto = lavoratoriFazione(cm.fazione) >= limiteLavoratori(cm.fazione);
  const lavNienteDaFare = !lavCapRaggiunto && !esisteMiglioriaPossibile(cm.fazione);
  const lavoratoriPieni = lavCapRaggiunto || lavNienteDaFare;
  const flottaPiena = flottaFazione(cm.fazione) >= limiteFlotta();
  const out = [];
  for (const id of Object.keys(D().UNITA)){
    const u = D().UNITA[id];
    if (u.tipo==="militia"||u.tipo==="hero") continue;
    if (id==="guarnigione") continue;      // non si recluta: nasce sola quando la citta' e' assalita
    if (u.era > st.era) continue;
    if (u.tech && !f.techs.includes(u.tech)) continue;
    if (u.uu!==undefined && u.uu!==f.id) continue;
    // reclutamento: edifici militari richiesti
    if (u.tipo==="cav" && !cm.edifici.includes("scuderia")) continue;
    if (u.tipo==="siege" && !cm.edifici.includes("arsenale")) continue;
    // navi: solo dove c'e' il mare. Serve una citta' sul mare, e dall'era romana in poi
    // anche un porto: senza banchine non si arma una flotta.
    if (u.tipo==="naval"){
      if (!cittaCostiera(cm)) continue;
      if (st.era >= 2 && !cm.edifici.includes("porto")) continue;
    }
    if (u.uu!==undefined && !cm.edifici.includes("caserma")) continue;
    if (u.reqEdificio && !cm.edifici.includes(u.reqEdificio)) continue;
    let costo = u.costo;
    if (f.leader && f.leader.tratto==="ambizioso") costo = Math.round(costo*0.8);
    const colono = id==="colono", lavoratore = id==="lavoratore";
    out.push({ tipo:"unita", id, nome:u.nome, costo, atk:u.atk, def:u.def, mov:u.mov,
               uu:u.uu!==undefined, supporto:!!u.supporto, buffa:!!u.buffa, colono, lavoratore, ruolo:ruoloUnita(id), era:u.era,
               pieno: lavoratore ? lavoratoriPieni
                      : (u.tipo==="naval" ? flottaPiena : (alCompleto && !colono)),
               motivoPieno: lavoratore && lavNienteDaFare ? "niente_da_fare" : (lavoratore && lavCapRaggiunto ? "al_completo" : null) });
  }
  // le più recenti in cima; mai lasciare la lista vuota
  out.sort((a,b)=> b.era-a.era || (b.atk+b.def)-(a.atk+a.def));
  // le unità comiche siciliane, i coloni e i lavoratori restano sempre visibili (in coda), le altre limitate
  // (hanno statistiche basse: senza questa eccezione sparirebbero dalla lista nelle ere avanzate)
  const sempreVisibili = out.filter(x=>x.buffa || x.colono || x.lavoratore);
  const altri = out.filter(x=>!x.buffa && !x.colono && !x.lavoratore);
  return [...altri.slice(0, 13), ...sempreVisibili];
}
function accoda(cmId, item){
  const cm = st.comuni[cmId];
  if (cm.coda.length >= 6) return false;
  if (item.tipo==="unita" && item.id==="lavoratore" &&
      (lavoratoriFazione(cm.fazione) >= limiteLavoratori(cm.fazione) || !esisteMiglioriaPossibile(cm.fazione))) return false;
  // Le navi hanno un tetto proprio: applicare loro il limite dell'esercito di terra le
  // bloccava sempre (l'esercito e' quasi sempre al completo) e nessuna flotta veniva mai varata.
  if (item.tipo==="unita" && dominioTipo(item.id)==="mare"){
    if (flottaFazione(cm.fazione) >= limiteFlotta()) return false;
  } else if (item.tipo==="unita" && !fuoriConteggio(item.id) && truppeFazione(cm.fazione) >= limiteEsercito(cm.fazione)) return false;
  // `hex` va conservato: e' la casella che il giocatore ha scelto per il quartiere. La riga
  // ricostruiva l'oggetto con i soli tre campi noti e la scelta finiva nel nulla, cosi' il
  // quartiere veniva poi costruito dove capitava (sul ripiego "la casella migliore").
  const voce = { tipo:item.tipo, id:item.id, costo:item.costo };
  if (item.hex !== undefined) voce.hex = item.hex;
  cm.coda.push(voce);
  return true;
}
function compraSubito(cmId){
  const cm = st.comuni[cmId];
  if (!cm.coda.length) return false;
  const f = st.fazioni[cm.fazione];
  const resto = Math.max(0, cm.coda[0].costo - cm.prodAcc);
  const prezzo = Math.ceil(resto*2);
  if (f.oro < prezzo) return false;
  f.oro -= prezzo;
  const item = cm.coda.shift();
  completaItem(cm, item);
  return true;
}
// gratis=true → path del lavoratore (manodopera, non oro): niente costo, niente controllo fondi.
// gratis=false → path diretto dal pannello esagono: il giocatore paga subito in oro.
function migliora(hexIdx, impId, gratis){
  const h = MAP.hexes[hexIdx];
  const cm = h.citta >= 0 ? st.comuni[h.citta] : null;   // solo il territorio posseduto si migliora
  const f = cm && cm.fazione>=0 && cm.fazione<100 ? st.fazioni[cm.fazione] : null;
  const im = D().MIGLIORIE[impId];
  if (!im || h.imp || h.quart) return false;
  if (!f) return false;              // casella fuori da ogni regno: prima si compra
  if (cm.hex === hexIdx) return false;
  if (!gratis && f.oro < im.costo) return false;
  if (im.tech && !f.techs.includes(im.tech)) return false;
  if (!im.terreni.includes(h.terra)) return false;
  if (im.fiume && !h.fiume) return false;
  if (im.costiero && !h.costa) return false;
  if (!gratis) f.oro -= im.costo;
  h.imp = impId;
  if (cm.fazione===st.giocatore) stat().migliorie++;
  return true;
}

// ---------- LAVORATORI (unità economica) ----------
// vero se nel territorio della fazione esiste ALMENO una casella senza miglioria dove una
// miglioria sarebbe valida (terreno/fiume/costa/tech — l'oro non conta, cambia turno per turno):
// altrimenti i lavoratori non saprebbero che fare, meglio non farli reclutare a vuoto
function esisteMiglioriaPossibile(fid){
  const f = st.fazioni[fid];
  for (const h of MAP.terre){
    if (h.imp || h.lago || h.citta < 0) continue;
    const cm = st.comuni[h.citta];
    if (cm.fazione !== fid || cm.hex === h.i) continue;
    for (const id of Object.keys(D().MIGLIORIE)){
      const m = D().MIGLIORIE[id];
      if (!m.terreni.includes(h.terra)) continue;
      if (m.fiume && !h.fiume) continue;
      if (m.costiero && !h.costa) continue;
      if (m.tech && !f.techs.includes(m.tech)) continue;
      if (m.eraMin && st.era < m.eraMin) continue;
      return true;
    }
  }
  return false;
}
// miglioria valida più conveniente per un esagono, per il lavoratore (manodopera gratuita:
// l'oro non è un vincolo, conta solo trovare tra tutte quelle applicabili la resa più alta)
function miglioreMiglioria(h, fid){
  const f = st.fazioni[fid];
  let scelta = null, miglior = -1;
  for (const id of Object.keys(D().MIGLIORIE)){
    const m = D().MIGLIORIE[id];
    if (!m.terreni.includes(h.terra)) continue;
    if (m.fiume && !h.fiume) continue;
    if (m.costiero && !h.costa) continue;
    if (m.tech && !f.techs.includes(m.tech)) continue;
    if (m.eraMin && st.era < m.eraMin) continue;
    const valore = (m.cibo||0) + (m.prod||0) + (m.oro||0);
    if (valore > miglior){ miglior = valore; scelta = id; }
  }
  return scelta;
}
// consuma una delle 3 azioni del lavoratore; lo ritira (si consuma) quando sono esaurite
function azioneLavoratore(uid){
  const u = st.unita.find(x=>x.id===uid);
  if (!u) return true;
  u.usiRimasti = (u.usiRimasti===undefined ? 3 : u.usiRimasti) - 1;
  if (u.usiRimasti <= 0){
    st.unita = st.unita.filter(x=>x.id!==uid);
    if (u.fazione===st.giocatore) aggiungiLog("🔧 Il lavoratore ha esaurito le energie e si ritira dal servizio: ben fatto!", "info");
    return true;
  }
  return false;
}
// il lavoratore cerca da solo il miglior esagono utile e sostenibile nelle vicinanze e ci costruisce sopra
function miglioramentoAutomatico(uid){
  const u = st.unita.find(x=>x.id===uid);
  if (!u || u.tipo!=="lavoratore" || u.mov<=0) return { ok:false, motivo:"non_valido" };
  const fid = u.fazione;
  const raggio = raggioMovimento([uid]);
  const candidati = [u.hex, ...Object.keys(raggio).map(k=>parseInt(k)).filter(i=>!raggio[i].attacco)];
  let scelta = null, miglior = -1;
  for (const i of candidati){
    const h = MAP.hexes[i];
    if (!h || h.imp || h.citta < 0) continue;
    const cm = st.comuni[h.citta];
    if (cm.fazione !== fid || cm.hex === i) continue;
    const impId = miglioreMiglioria(h, fid);
    if (!impId) continue;
    const m = D().MIGLIORIE[impId];
    const valore = (m.cibo||0) + (m.prod||0) + (m.oro||0);
    if (valore > miglior){ miglior = valore; scelta = { hex:i, impId }; }
  }
  if (!scelta) return { ok:false, motivo:"nessuna_meta" };
  u.hex = scelta.hex;
  u.mov = 0;
  if (!migliora(scelta.hex, scelta.impId, true)) return { ok:false, motivo:"fondi" };
  const ritirato = azioneLavoratore(uid);
  return { ok:true, hex:scelta.hex, impId:scelta.impId, ritirato };
}

// ---------- AGGIORNAMENTO MIGLIORIE (cambio era) ----------
// come le truppe, anche i campi/vigneti/miniere... invecchiano: quando l'era lo consente,
// possono passare al tier successivo della loro linea (vedi MIGLIORIE_LINEA in data_game.js)
function costoAggiornamentoMiglioria(vecchioId, nuovoId){
  const v = D().MIGLIORIE[vecchioId], n = D().MIGLIORIE[nuovoId];
  return Math.max(15, Math.ceil((n.costo - v.costo) * 1.2));
}
function prossimaMiglioria(impId, fid){
  const im = D().MIGLIORIE[impId];
  if (!im || !im.linea) return null;
  const linea = D().MIGLIORIE_LINEA[im.linea];
  const tier = im.tier||0;
  if (tier+1 >= linea.length) return null;
  const nuovoId = linea[tier+1];
  const nuovo = D().MIGLIORIE[nuovoId];
  if (nuovo.eraMin && st.era < nuovo.eraMin) return null;
  if (nuovo.tech && !st.fazioni[fid].techs.includes(nuovo.tech)) return null;
  return nuovoId;
}
function migliorieAggiornabili(fid){
  const out = [];
  for (const h of MAP.terre){
    if (!h.imp || h.citta < 0) continue;
    const cm = st.comuni[h.citta];
    if (!cm || cm.fazione !== fid) continue;
    const nuovoId = prossimaMiglioria(h.imp, fid);
    if (!nuovoId) continue;
    out.push({ hex:h.i, vecchio:h.imp, vecchioNome:D().MIGLIORIE[h.imp].nome,
               nuovo:nuovoId, nuovoNome:D().MIGLIORIE[nuovoId].nome,
               costo: costoAggiornamentoMiglioria(h.imp, nuovoId) });
  }
  return out;
}
function upgradaMiglioria(hexIdx, fid){
  const h = MAP.hexes[hexIdx];
  const cm = h.citta >= 0 ? st.comuni[h.citta] : null;
  if (!h.imp || !cm || cm.fazione !== fid) return false;
  const nuovoId = prossimaMiglioria(h.imp, fid);
  if (!nuovoId) return false;
  const costo = costoAggiornamentoMiglioria(h.imp, nuovoId);
  const f = st.fazioni[fid];
  if (f.oro < costo) return false;
  f.oro -= costo;
  h.imp = nuovoId;
  return true;
}
function upgradaMiglliorieEconomiche(fid){
  const f = st.fazioni[fid];
  const lista = migliorieAggiornabili(fid).sort((a,b)=>a.costo-b.costo);
  let n = 0;
  for (const item of lista) if (f.oro >= item.costo && upgradaMiglioria(item.hex, fid)) n++;
  return n;
}

// ---------- AGGIORNAMENTO TRUPPE (cambio era) ----------
// solo le unità "di linea" standard (quelle elencate in LINEA_ERA) hanno un successore chiaro:
// unità uniche, comiche, di supporto e coloni restano quelle che sono.
const RUOLI_LINEA = ["inf","ranged","cav","siege"];
function costoAggiornamento(vecchioId, nuovoId){
  const v = D().UNITA[vecchioId], n = D().UNITA[nuovoId];
  return Math.max(15, Math.ceil((n.costo - v.costo) * 1.2));
}
function unitaAggiornabili(fid){
  const linea = D().LINEA_ERA[st.era];
  const out = [];
  for (const u of st.unita){
    if (u.fazione !== fid) continue;
    const def = D().UNITA[u.tipo];
    if (!def || def.era >= st.era) continue;
    const idx = RUOLI_LINEA.indexOf(def.tipo);
    if (idx < 0) continue;
    const nuovoId = linea[idx];
    if (nuovoId === u.tipo) continue;
    out.push({ uid:u.id, vecchio:u.tipo, vecchioNome:def.nome, nuovo:nuovoId, nuovoNome:D().UNITA[nuovoId].nome,
               costo: costoAggiornamento(u.tipo, nuovoId) });
  }
  return out;
}
function upgradaUnita(uid, fid){
  const u = st.unita.find(x=>x.id===uid && x.fazione===fid);
  if (!u) return false;
  const def = D().UNITA[u.tipo];
  const idx = def ? RUOLI_LINEA.indexOf(def.tipo) : -1;
  if (idx < 0) return false;
  const nuovoId = D().LINEA_ERA[st.era][idx];
  if (nuovoId === u.tipo) return false;
  const costo = costoAggiornamento(u.tipo, nuovoId);
  const f = st.fazioni[fid];
  if (f.oro < costo) return false;
  f.oro -= costo;
  u.tipo = nuovoId;
  u.mov = statU(nuovoId).mov;
  u.hp = 100;
  return true;
}
// aggiorna tutte le unità che il regno può permettersi in questo momento, dalla più economica
function upgradaEconomiche(fid){
  const f = st.fazioni[fid];
  const lista = unitaAggiornabili(fid).sort((a,b)=>a.costo-b.costo);
  let n = 0;
  for (const item of lista) if (f.oro >= item.costo && upgradaUnita(item.uid, fid)) n++;
  return n;
}

// ---------- RICERCA ----------
// Albero delle ricerche: si puo' studiare solo cio' di cui si possiedono i prerequisiti.
// All'inizio le radici sono due — Agricoltura del Grano e Falange Oplitica, il pane e la
// lancia — e ogni scoperta apre le successive. Prima erano tutte disponibili in blocco,
// e la ricerca non aveva ne' percorso ne' identita'.
function prerequisitiSoddisfatti(t, f){
  const req = t.req || [];
  return req.every(r => f.techs.includes(r));
}
function techDisponibili(fid){
  const f = st.fazioni[fid];
  return D().TECH.filter(t => t.era <= st.era && !f.techs.includes(t.id) && prerequisitiSoddisfatti(t, f));
}
// tecnologie che questa sbloccherebbe: serve all'interfaccia per mostrare dove porta un ramo
function techSbloccateDa(id){
  return D().TECH.filter(t => (t.req||[]).includes(id)).map(t => t.nome);
}
function ricerca(fid, techId){
  st.fazioni[fid].ricerca = techId;
}
// ---------- PERCORSO DI RICERCA (coda pianificabile) ----------
// scegliere una singola ricerca ogni volta è noioso: il giocatore può accodarne più d'una
// e passoRicerca avanza da sola non appena la ricerca in corso è completata.
function accodaRicerca(fid, techId){
  const f = st.fazioni[fid];
  f.percorsoRicerca = f.percorsoRicerca || [];
  if (f.techs.includes(techId) || f.ricerca===techId || f.percorsoRicerca.includes(techId)) return false;
  if (!f.ricerca){ f.ricerca = techId; return true; }
  f.percorsoRicerca.push(techId);
  return true;
}
function rimuoviDaPercorso(fid, techId){
  const f = st.fazioni[fid];
  f.percorsoRicerca = (f.percorsoRicerca||[]).filter(id=>id!==techId);
}
function percorsoRicercaStato(fid){
  const f = st.fazioni[fid];
  return (f.percorsoRicerca||[]).map(id => D().TECH.find(t=>t.id===id)).filter(Boolean);
}
// suggerisce e imposta subito un piccolo percorso sensato (le tecnologie più economiche disponibili)
function suggerisciPercorso(fid){
  const f = st.fazioni[fid];
  const disp = techDisponibili(fid).sort((a,b)=>a.costo-b.costo);
  if (!disp.length) return 0;
  const scelta = disp.slice(0, 4);
  let n = 0;
  for (const t of scelta) if (accodaRicerca(fid, t.id)) n++;
  return n;
}
const COSTO_TECH = 0.5;   // ricerche più veloci: costo effettivo dimezzato
// Intuizione ottenuta = tecnologia scontata del 40%, come le Eureka di Civ VI. Lo sconto
// resta valido anche se la si studia molto dopo: e' un premio per aver FATTO la cosa giusta.
function costoTech(t, fid){
  const f = st.fazioni[fid === undefined ? st.giocatore : fid];
  const base = Math.max(8, Math.round(t.costo * COSTO_TECH));
  return (f && f.intuizioni && f.intuizioni[t.id]) ? Math.max(5, Math.round(base * 0.6)) : base;
}
// cosa sblocca una tecnologia (unità + edifici + migliorie)
function sbloccatiDaTech(techId){
  const u = Object.values(D().UNITA).filter(x=>x.tech===techId).map(x=>x.nome);
  const e = Object.keys(D().EDIFICI).filter(k=>D().EDIFICI[k].tech===techId).map(k=>D().EDIFICI[k].nome);
  const m = Object.keys(D().MIGLIORIE).filter(k=>D().MIGLIORIE[k].tech===techId).map(k=>D().MIGLIORIE[k].nome);
  const tutto = [...u, ...e, ...m];
  return tutto.length ? "🔓 Ora puoi: "+tutto.join(", ") : "";
}
function passoRicerca(f, sci){
  f.percorsoRicerca = f.percorsoRicerca || [];
  if (!f.ricerca){
    // pesca dal percorso pianificato, scartando eventuali tech nel frattempo diventate non valide
    while (!f.ricerca && f.percorsoRicerca.length){
      const nextId = f.percorsoRicerca.shift();
      if (!f.techs.includes(nextId) && D().TECH.some(t=>t.id===nextId && t.era<=st.era)) f.ricerca = nextId;
    }
    if (!f.ricerca && f.ai){
      const disp = techDisponibili(f.id);
      if (disp.length) f.ricerca = disp.sort((a,b)=>a.costo-b.costo)[0].id;
    }
    if (!f.ricerca){ f.sciAcc = Math.min(f.sciAcc+sci, 999); return; }
  }
  f.sciAcc += sci;
  const t = D().TECH.find(x=>x.id===f.ricerca);
  if (t && f.sciAcc >= costoTech(t, f.id)){
    f.sciAcc -= costoTech(t, f.id);
    f.techs.push(t.id);
    f.ricerca = null;
    cucinaReset(); techBonusReset();
    if (f.id===st.giocatore){
      aggiungiLog("📜 Scoperta: "+t.nome+"! "+t.desc, "bene");
      spara("ricerca", { tech: t.nome });
      const sb = sbloccatiDaTech(t.id);
      st.pending.push({ titolo:"🎓 Scoperta: "+t.nome, testo:t.desc+(sb?"\n\n"+sb:""),
        ricercaFatta:true, scelte:[{label:"Gloria al sapere!", eff:"nulla"}] });
      if (t.era >= 4) provaSbloccoGuardaroba("tech_avanzata", 0.25);
    }
  }
}

// ---------- MOVIMENTO ----------
const COSTO_TERRA = { plain:1, hill:2, forest:2, mountain:3, volcano:3, secca:2, mare:1, lago:9 };
function costoTerreno(h, fid){
  let c = COSTO_TERRA[h.terra]||1;
  if (h.mare) return c;                                  // in mare le strade non aiutano
  const f = fid>=0&&fid<100 ? st.fazioni[fid] : null;
  if (f && f.techs.includes("strade")) c = Math.max(1, c-0.5);
  return c;
}

// ---------- DOMINIO: chi puo' stare dove ----------
// Con il mare navigabile ogni esagono d'acqua e' una casella vera, quindi senza questa regola
// la fanteria camminerebbe sull'acqua (COSTO_TERRA non aveva la voce "mare" e ricadeva su 1).
function dominioTipo(tipo){
  const ud = GDATA.UNITA[tipo];
  return (ud && ud.dominio) || "terra";
}
function eNavale(u){ return dominioTipo(u.tipo) === "mare"; }
// una casella e' percorribile da questa unita'?
// Le truppe di terra possono entrare in mare SOLO su un esagono dove c'e' un trasporto amico
// con posto libero: quello e' l'imbarco.
function percorribile(h, u){
  if (h.lago) return false;            // acqua interna: non si guada e non ci navigano le flotte
  if (dominioTipo(u.tipo) === "mare") return !!h.mare;
  if (!h.mare) return true;
  // In mare non ci va la truppa di terra: solo i COLONI possono essere imbarcati, e solo
  // dopo aver scoperto la navigazione. Le isole quindi si popolano, non si invadono.
  if (u.tipo !== "colono") return false;
  const f = u.fazione>=0 && u.fazione<100 ? st.fazioni[u.fazione] : null;
  if (!f || !f.techs.includes("navigazione")) return false;
  return !!trasportoLibero(h.i, u.fazione);
}
// trasporto amico con posto disponibile su questo esagono
function trasportoLibero(hexIdx, fid){
  return st.unita.find(t => t.hex===hexIdx && t.fazione===fid && (GDATA.UNITA[t.tipo]||{}).capacita
                            && (t.carico||[]).length < GDATA.UNITA[t.tipo].capacita) || null;
}
function capacitaDi(u){ return (GDATA.UNITA[u.tipo]||{}).capacita || 0; }
// Indice unita' per esagono. nemiciSuHex/unitaSuHex filtravano l'INTERO elenco delle unita'
// a ogni casella esaminata: dentro un pathfinding che ne visita centinaia, con 250 unita' in
// campo, diventavano decine di migliaia di scansioni per singola chiamata — e il turno a fine
// partita e' arrivato a 1,7 secondi. Qui l'indice si costruisce una volta per ricerca.
function indiceUnita(){
  const m = new Map();
  for (const u of st.unita){
    let a = m.get(u.hex);
    if (!a){ a = []; m.set(u.hex, a); }
    a.push(u);
  }
  return m;
}
const VUOTE = [];
function unitaSuHex(i){ return st.unita.filter(u=>u.hex===i); }
function nemiciSuHex(i, fid){ return st.unita.filter(u=>u.hex===i && !alleati(u.fazione, fid)); }
function alleati(a,b){ return a===b; }

function raggioMovimento(uids){
  const us = st.unita.filter(u=>uids.includes(u.id));
  if (!us.length) return {};
  const mov = Math.min(...us.map(u=>u.mov));
  const fid = us[0].fazione;
  const navale = eNavale(us[0]);
  const start = us[0].hex;
  const dist = { [start]:0 };
  const out = {};
  const idx = indiceUnita();
  const suHex = (i) => idx.get(i) || VUOTE;
  const nemiciQui = (i) => suHex(i).filter(u => !alleati(u.fazione, fid));
  const coda = [start];
  while (coda.length){
    coda.sort((a,b)=>dist[a]-dist[b]);
    const cur = coda.shift();
    for (const nb of MAP.vicini(cur)){
      const h = MAP.hexes[nb];
      const nem = nemiciQui(nb);
      const cm = st.comuni[h.comune];
      const cittaNemica = (cm.fondata && cm.hex===nb && cm.fazione!==fid);
      if (nem.length || (cittaNemica && cm.fazione!==-1) || (cittaNemica && cm.fazione===-1)){
        // Si attacca solo chi si puo' raggiungere davvero: una fanteria non colpisce una nave
        // al largo e una nave non assalta un reparto nell'entroterra. Le citta' costiere
        // restano attaccabili dal mare solo col bombardamento (vedi bombarda).
        const bersaglioNavale = nem.length ? eNavale(nem[0]) : false;
        const ok = nem.length ? (bersaglioNavale === navale) : !navale;
        if (ok && dist[cur] < mov) out[nb] = { costo:dist[cur]+1, attacco:true };
        continue;
      }
      if (!percorribile(h, us[0])) continue;
      const c = dist[cur] + costoTerreno(h, fid);
      // Con del movimento ancora disponibile si puo' SEMPRE fare almeno un passo, anche se la
      // casella costa piu' di quanto resta. Senza questa regola un'unita' con 2 movimenti non
      // poteva entrare in montagna (costo 3) e restava murata: i coloni di Palermo, Messina e
      // Trapani, circondate da monti, non uscivano mai di casa e quelle fazioni non fondavano
      // una seconda citta' per l'intera partita.
      const primoPasso = (dist[cur] === 0 && mov > 0);
      if ((c <= mov || primoPasso) && (dist[nb]===undefined || c < dist[nb])){
        if (suHex(nb).length >= 4) continue;
        dist[nb] = c;
        out[nb] = { costo:c, attacco:false };
        coda.push(nb);
      }
    }
  }
  delete out[start];
  return out;
}
// Quando una nave affonda porta giu' il carico, e quando muore un reparto imbarcato va tolto
// dalla stiva: senza questo restano riferimenti a unita' inesistenti e i trasporti risultano
// pieni per sempre.
function affondaConCarico(){
  const morti = st.unita.filter(u => u.hp <= 0);
  for (const m of morti){
    if (m.carico && m.carico.length){
      for (const cid of m.carico){
        const c = st.unita.find(x => x.id === cid);
        if (c) c.hp = 0;
      }
    }
    if (m.imbarcataSu !== undefined) sbarca(m);
  }
}
function muovi(uids, dest){
  const r = raggioMovimento(uids);
  if (!r[dest] || r[dest].attacco) return false;
  const hDest = MAP.hexes[dest];
  for (const u of st.unita){
    if (!uids.includes(u.id)) continue;
    const daMare = MAP.hexes[u.hex] && MAP.hexes[u.hex].mare;
    u.hex = dest;
    if (!eNavale(u) && u.fazione >= 0) liberaCovo(dest, u.fazione);
    u.mov = Math.max(0, u.mov - r[dest].costo);
    u.camminato = true;
    u.fortificata = false;
    if (!eNavale(u)){
      // IMBARCO: una truppa di terra che entra in mare sale sul trasporto che si trova li'
      if (hDest.mare && !daMare){
        const t = trasportoLibero(dest, u.fazione);
        if (t){ (t.carico = t.carico || []).push(u.id); u.imbarcataSu = t.id; u.mov = 0; }
      }
      // SBARCO: tornando a terra la truppa lascia la stiva
      else if (!hDest.mare && daMare) sbarca(u);
    } else {
      // il trasporto porta con se' il carico
      for (const cid of (u.carico||[])){
        const c = st.unita.find(x=>x.id===cid);
        if (c){ c.hex = dest; c.mov = 0; }
      }
    }
  }
  return true;
}
// toglie l'unita' dalla stiva del trasporto su cui viaggiava
function sbarca(u){
  if (u.imbarcataSu === undefined) return;
  const t = st.unita.find(x=>x.id===u.imbarcataSu);
  if (t && t.carico) t.carico = t.carico.filter(id => id !== u.id);
  u.imbarcataSu = undefined;
}

// Coda di priorita' a heap binario. Serve a trovaPercorso: prima la coda veniva RIORDINATA
// per intero a ogni estrazione (`coda.sort(...)`), e su una mappa da 40.000 esagoni una
// singola ricerca di percorso costava 59,7 ms — con sette coloni in marcia, mezzo secondo
// per turno solo di pathfinding. Con lo heap l'estrazione e' logaritmica.
function CodaPri(){
  const a = [];                     // elementi: [priorita', valore]
  return {
    get size(){ return a.length; },
    push(pri, val){
      a.push([pri, val]);
      let i = a.length-1;
      while (i > 0){
        const p = (i-1)>>1;
        if (a[p][0] <= a[i][0]) break;
        const t = a[p]; a[p] = a[i]; a[i] = t; i = p;
      }
    },
    pop(){
      if (!a.length) return undefined;
      const top = a[0], last = a.pop();
      if (a.length){
        a[0] = last;
        let i = 0;
        for (;;){
          const l = i*2+1, r = l+1; let m = i;
          if (l < a.length && a[l][0] < a[m][0]) m = l;
          if (r < a.length && a[r][0] < a[m][0]) m = r;
          if (m === i) break;
          const t = a[m]; a[m] = a[i]; a[i] = t; i = m;
        }
      }
      return top[1];
    }
  };
}

// ---------- PATHFINDING (viaggi lunghi) ----------
let _pfDist=null, _pfPrev=null, _pfGen=null, _pfVis=null, _pfGenCur=0;
// Dijkstra sul grafo di esagoni per una singola unità. Evita nemici e stack pieni.
function trovaPercorso(uid, dest){
  const u = st.unita.find(x=>x.id===uid);
  if (!u) return null;
  const fid = u.fazione;
  const start = u.hex;
  if (start === dest) return { percorso:[], costo:0, turni:0 };
  // Buffer riusati invece di oggetti {chiave:valore} nuovi a ogni chiamata: su 40.000 esagoni
  // l'hashing costava piu' dell'algoritmo stesso. Un contatore di "generazione" evita di
  // azzerarli: cio' che non porta la generazione corrente vale come non ancora visitato.
  const N = MAP.hexes.length;
  if (!_pfGen || _pfGen.length !== N){
    _pfDist = new Float64Array(N); _pfPrev = new Int32Array(N);
    _pfGen = new Int32Array(N); _pfVis = new Int32Array(N); _pfGenCur = 0;
  }
  const gen = ++_pfGenCur;
  const idx = indiceUnita();
  const suHex = (i) => idx.get(i) || VUOTE;
  _pfGen[start] = gen; _pfDist[start] = 0; _pfPrev[start] = -1;
  // A*: alla priorita' si somma una stima di quanto manca, cosi' la ricerca punta alla meta
  // invece di espandersi in tondo su tutta l'isola. La stima non sopravvaluta mai il costo
  // reale, quindi il percorso trovato resta il piu' breve.
  const PASSO = MAP.R*2;
  const hd = MAP.hexes[dest];
  const stima = (i) => { const h = MAP.hexes[i]; return Math.hypot(h.x-hd.x, h.y-hd.y)/PASSO; };
  const coda = CodaPri(); coda.push(stima(start), start);
  let trovato = false;
  while (coda.size){
    const cur = coda.pop();
    if (_pfVis[cur] === gen) continue;
    _pfVis[cur] = gen;
    if (cur === dest){ trovato = true; break; }
    for (const nb of MAP.vicini(cur)){
      const h = MAP.hexes[nb];
      // destinazione raggiunta: consentita anche se citta' nemica (arrivo)
      if (nb !== dest){
        if (suHex(nb).some(u => !alleati(u.fazione, fid))) continue;   // non attraversare nemici
        if (suHex(nb).length >= 4) continue;                          // stack pieno
      }
      if (!percorribile(h, u)) continue;
      const c = _pfDist[cur] + costoTerreno(h, fid);
      if (_pfGen[nb] !== gen || c < _pfDist[nb]){
        _pfGen[nb] = gen; _pfDist[nb] = c; _pfPrev[nb] = cur;
        coda.push(c + stima(nb), nb);
      }
    }
  }
  if (!trovato || _pfGen[dest] !== gen) return null;
  const percorso = []; let n = dest;
  while (n !== start){ percorso.unshift(n); n = _pfPrev[n]; }
  const movTurno = Math.max(1, statU(u.tipo).mov);
  return { percorso, costo: _pfDist[dest], turni: Math.max(1, Math.ceil(_pfDist[dest]/movTurno)) };
}

function impostaGoto(uid, dest){
  const u = st.unita.find(x=>x.id===uid);
  if (!u) return false;
  const p = trovaPercorso(uid, dest);
  if (!p) return false;
  u.goto = dest; u.fortificata = false;
  return true;
}

// una vera minaccia adiacente (fazione in guerra o invasore, NON i briganti indipendenti sparsi)
function minacciaVicina(hex, fid){
  for (const nb of MAP.vicini(hex)){
    for (const e of st.unita){
      if (e.hex !== nb || e.fazione === fid) continue;
      if (e.fazione >= 100) return true;                                   // invasori
      if (e.fazione >= 0 && e.fazione < 100){
        const f = st.fazioni[fid];
        if (f && f.diplo[e.fazione] && f.diplo[e.fazione].stato === "guerra") return true;
      }
    }
  }
  return false;
}
// avanza le unità del giocatore in viaggio (goto) di questo turno
function processaGoto(fid){
  for (const u of st.unita){
    if (u.fazione !== fid || u.goto==null || u.mov <= 0) continue;
    // parti già in mezzo a una minaccia: fermati subito
    if (minacciaVicina(u.hex, fid)){ u.goto = null; continue; }
    // Il percorso si calcola UNA volta e poi lo si percorre. Prima veniva ricalcolato da capo
    // a ogni singolo passo: con una ricerca da ~12 ms su 40.000 esagoni e una quindicina di
    // coloni in marcia, da sola faceva salire il turno da 14 a 257 ms.
    let p = trovaPercorso(u.id, u.goto);
    if (!p || !p.percorso.length){ u.goto = null; continue; }
    let idx = 0, sicurezza = 0;
    while (u.mov > 0 && u.hex !== u.goto && sicurezza++ < 30){
      const prossimo = p.percorso[idx];
      if (prossimo === undefined){ u.goto = null; break; }
      const r = raggioMovimento([u.id]);
      if (!r[prossimo] || r[prossimo].attacco){
        // strada bloccata (qualcuno si e' messo di mezzo): un solo ricalcolo, poi si rinuncia
        if (sicurezza > 1) break;
        p = trovaPercorso(u.id, u.goto);
        if (!p || !p.percorso.length){ u.goto = null; break; }
        idx = 0;
        continue;
      }
      u.hex = prossimo; idx++;
      u.mov = Math.max(0, u.mov - r[prossimo].costo);
      u.camminato = true;
      if (minacciaVicina(u.hex, fid)){ u.goto = null; break; } // fermati vicino a un vero nemico
    }
    if (u.hex === u.goto) u.goto = null;
  }
}

function fortifica(uid){
  const u = st.unita.find(x=>x.id===uid);
  if (!u) return false;
  u.fortificata = true; u.goto = null; u.mov = 0;
  return true;
}

// ---------- NEBBIA DI GUERRA ----------
function calcolaVisibilita(){
  if (!st.nebbia) return;
  const vis = {};
  const gioc = st.giocatore;
  const espandi = (hex, r) => {
    vis[hex] = true; st.esplorato[hex] = true;
    let layer = [hex]; const seen = { [hex]:true };
    for (let d=0; d<r; d++){
      const next = [];
      for (const h of layer) for (const nb of MAP.vicini(h)){
        if (!seen[nb]){ seen[nb]=true; vis[nb]=true; st.esplorato[nb]=true; next.push(nb); }
      }
      layer = next;
    }
  };
  // Quanto lontano si vede. Il raggio base tiene la partenza stretta (una citta' scopre
  // ~19 caselle) e cresce con le tecnologie della conoscenza — astronomia, universita',
  // stampa — cosi' l'orizzonte si allarga man mano che il regno impara.
  const extra = (techBonus(gioc).vista || 0) + ((st.fazioni[gioc] && st.fazioni[gioc].vistaGrande) || 0);
  for (const cm of st.comuni) if (cm.fazione===gioc && cm.fondata) espandi(cm.hex, 2 + extra);
  for (const u of st.unita) if (u.fazione===gioc){
    const ud = D().UNITA[u.tipo];
    let r = 1;                                                // una truppa vede poco: e' fanteria
    if (u.tipo==="esploratore") r = 3;                        // e' il suo mestiere
    else if (ud && ud.dominio==="mare") r = 3;                // dal mare aperto si vede lontano
    espandi(u.hex, r + extra);
  }
  st.visibile = vis;
}
function hexVisibile(hex){ return !st.nebbia || st.visibile[hex]; }
function hexEsplorato(hex){ return !st.nebbia || st.esplorato[hex]; }
function svegliaUnita(uid){
  const u = st.unita.find(x=>x.id===uid);
  if (u) u.fortificata = false;
}
// unità del giocatore ancora da gestire (ferme, non fortificate, non in viaggio)
function unitaFerme(fid){
  return st.unita.filter(u => u.fazione===fid && u.mov>0 && !u.goto && !u.fortificata);
}

// ---------- COMBATTIMENTO ----------
// ruoli tattici (sasso-carta-forbici)
function ruoloUnita(tipo){
  const u = D().UNITA[tipo]; if (!u) return "inf";
  if (u.supporto) return "supporto";
  if (u.tipo==="cav") return "cav";
  if (u.tipo==="ranged") return "ranged";
  if (u.tipo==="siege") return "siege";
  if (u.tipo==="hero") return "hero";
  return "inf";
}
const MATCHUP = {
  cav:    { ranged:1.40, siege:1.50, inf:0.85 },
  ranged: { inf:1.25,   siege:1.20, cav:0.80 },
  inf:    { cav:1.30,    siege:1.15, ranged:0.90 },
  siege:  { inf:0.70,    ranged:0.70, cav:0.60 },
};
function moltiplicatoreRuolo(att, def){ const m = MATCHUP[att]; return (m && m[def]) ? m[def] : 1; }
function ruoloDominante(units){
  const c = {}; for (const u of units){ const r = ruoloUnita(u.tipo); c[r]=(c[r]||0)+1; }
  let best="inf", bn=-1; for (const r in c) if (c[r]>bn){ bn=c[r]; best=r; }
  return best;
}
// esercito con più ruoli (inf+tiro+cav) = più efficace ("armi combinate")
function bonusCombinato(units){
  const rs = new Set(units.map(u=>ruoloUnita(u.tipo)).filter(r=>["inf","ranged","cav"].includes(r)));
  return rs.size>=3 ? 1.22 : (rs.size>=2 ? 1.11 : 1);
}

function multDifesa(hexIdx, defFid){
  const h = MAP.hexes[hexIdx];
  let m = 1;
  if (h.terra==="hill") m*=1.25;
  if (h.terra==="forest") m*=1.2;
  if (h.terra==="mountain"||h.terra==="volcano") m*=1.4;
  if (h.fiume) m*=1.1;
  const cm = st.comuni[h.comune];
  if (cm.hex===hexIdx){
    if (cm.mura>0 && cm.muraHP>0) m *= 1 + 0.4*cm.mura;
    if (cm.edifici.includes("castello")) m *= 1.4;
    for (const id of cm.edifici){ const el = D().EDIFICI_LOCALI.find(x=>x.id===id); if (el && el.difesa) m *= 1+el.difesa; }
    const f = defFid>=0&&defFid<100 ? st.fazioni[defFid] : null;
    if (f){
      if (D().FAZIONI[defFid].bonusId==="grano") m *= 1.3;
      if (f.techs.includes("fuocogreco") && h.costa) m *= 1.2;
      if (st.meraviglie["ursino"]!==undefined && st.comuni[st.meraviglie["ursino"]].fazione===defFid) m *= 1.4;
    }
  }
  return m;
}
function forzaAtk(u, hexDif){
  const s = statU(u.tipo);
  let a = s.atk * (u.hp/100) * (1 + u.xp*0.05);
  if (u.congelato>0) a *= 0.55;   // congelato dalla granita: combatte peggio
  const f = u.fazione>=0&&u.fazione<100 ? st.fazioni[u.fazione] : null;
  if (f && f.leader && f.leader.tratto==="guerriero") a*=1.15;
  if (f) a *= (1 + techBonus(f.id).combatPct);
  if (u.tipo==="picciotti"){
    const t = MAP.hexes[hexDif].terra;
    if (t==="hill"||t==="volcano"||t==="mountain") a*=1.3;
  }
  // aura eroe + tamburino (morale)
  if (f){
    const vic = [u.hex, ...MAP.vicini(u.hex)];
    if (st.unita.some(e=>e.tipo==="eroe" && e.fazione===u.fazione && vic.includes(e.hex))) a*=1.2;
    if (st.unita.some(e=>e.tipo==="tamburino" && e.fazione===u.fazione && vic.includes(e.hex))) a*=1.12;
  }
  return a;
}
function forzaDef(u, hexIdx){
  const s = statU(u.tipo);
  let d = s.def * (u.hp/100) * (1 + u.xp*0.05);
  return d * multDifesa(hexIdx, u.fazione);
}

function simulaBattaglia(atts, defs, hexDif, applica){
  const A = atts.map(u=>({u, hp:u.hp}));
  const B = defs.map(u=>({u, hp:u.hp}));
  const cm = st.comuni[MAP.hexes[hexDif].comune];
  // Brioche col Tuppo: boato iniziale che devasta i difensori e consuma l'unità
  for (const x of A){
    const ud = D().UNITA[x.u.tipo];
    if (ud && ud.esplode && x.hp>0){
      const burst = statU(x.u.tipo).atk * 2.4;
      const vivB = B.filter(b=>b.hp>0);
      for (const b of vivB){ const tough=statU(b.u.tipo).def*multDifesa(hexDif,b.u.fazione); b.hp -= burst/vivB.length/Math.max(1,tough)*30; }
      x.hp = 0;   // si consuma nell'esplosione
    }
  }
  const muraAttive = cm.hex===hexDif && cm.mura>0 && cm.muraHP>0;
  const haAssedio = atts.some(u=>D().UNITA[u.tipo].tipo==="siege");
  // ruoli tattici + armi combinate (a livello di esercito)
  const attRole = ruoloDominante(atts), defRole = ruoloDominante(defs);
  const mA = moltiplicatoreRuolo(attRole, defRole) * bonusCombinato(atts);
  const mB = moltiplicatoreRuolo(defRole, attRole) * bonusCombinato(defs);
  let round = 0;
  while (A.some(x=>x.hp>0) && B.some(x=>x.hp>0) && round<8){
    round++;
    let sA=0, sB=0;
    for (const x of A) if (x.hp>0) sA += forzaAtk({...x.u, hp:x.hp}, hexDif);
    for (const x of B) if (x.hp>0) sB += forzaDef({...x.u, hp:x.hp}, hexDif);
    sA *= mA; sB *= mB;
    if (muraAttive && !haAssedio) sA *= 0.6;
    const vivA = A.filter(x=>x.hp>0), vivB = B.filter(x=>x.hp>0);
    for (const x of vivB){
      const tough = statU(x.u.tipo).def * multDifesa(hexDif, x.u.fazione);
      x.hp -= (sA/vivB.length) / Math.max(1,tough) * 30 * (0.85+rnd()*0.3);
    }
    for (const x of vivA){
      const tough = statU(x.u.tipo).def;
      x.hp -= (sB/vivA.length) / Math.max(1,tough) * 30 * (0.85+rnd()*0.3);
    }
  }
  const vinceA = !B.some(x=>x.hp>0) && A.some(x=>x.hp>0);
  if (applica){
    for (const x of A){ x.u.hp = Math.max(0, Math.round(x.hp)); x.u.mov = 0; }
    for (const x of B){ x.u.hp = Math.max(0, Math.round(x.hp)); }
    const morti = st.unita.filter(u=>u.hp<=0);
    for (const m of morti){
      if (m.tipo==="eroe" && m.fazione>=0 && m.fazione<100){
        st.fazioni[m.fazione].eroeVivo = false;
        aggiungiLog("⚰️ Il condottiero "+(m.nome||"")+" è caduto in battaglia!", "male");
      }
    }
    // Bomba Granita: i difensori sopravvissuti si congelano
    if (atts.some(u=>D().UNITA[u.tipo] && D().UNITA[u.tipo].congela))
      for (const x of B) if (x.u.hp>0) x.u.congelato = 2;
    affondaConCarico();
    st.unita = st.unita.filter(u=>u.hp>0);
    for (const x of A) if (x.u.hp>0) x.u.xp = Math.min(10, x.u.xp+1);
    for (const x of B) if (x.u.hp>0) x.u.xp = Math.min(10, x.u.xp+1);
    if (vinceA){
      // entra nell'esagono / cattura
      const sopravv = A.filter(x=>x.u.hp>0).map(x=>x.u);
      const entrano = sopravv.slice(0, 4);
      for (const u of entrano) u.hex = hexDif;
      if (cm.hex===hexDif && cm.fazione!==atts[0].fazione) catturaComune(cm, atts[0].fazione);
    }
    // registra gli scontri che toccano il giocatore durante il turno IA
    if (st._aiTurn){
      const attP = atts[0] && atts[0].fazione===st.giocatore;
      const defP = defs.some(d=>d.fazione===st.giocatore);
      if (attP || defP)
        st.eventiTurno.push({ hex:hexDif, tipo:"battaglia",
          vinta:(attP&&vinceA)||(defP&&!vinceA), nome:(cm.hex===hexDif?cm.nome:null) });
    }
  }
  return { vinceA,
    perditeA: A.filter(x=>x.hp<=0).length, perditeD: B.filter(x=>x.hp<=0).length,
    hpA: A.reduce((t,x)=>t+Math.max(0,x.hp),0), hpB: B.reduce((t,x)=>t+Math.max(0,x.hp),0) };
}

function anteprima(uids, hexDif){
  const atts = st.unita.filter(u=>uids.includes(u.id) && u.mov>0);
  const defs = nemiciSuHex(hexDif, atts[0].fazione);
  const cm = st.comuni[MAP.hexes[hexDif].comune];
  // città murata senza difensori = assalto alle mura
  if (!defs.length && cm.hex===hexDif && cm.mura>0 && cm.muraHP>0){
    return { assaltoMura: true, muraHP: cm.muraHP };
  }
  if (!defs.length) return { vuoto:true };
  let vittorie=0, pa=0, pd=0;
  const N=30;
  for (let k=0;k<N;k++){
    const r = simulaBattaglia(atts, defs, hexDif, false);
    if (r.vinceA) vittorie++;
    pa+=r.perditeA; pd+=r.perditeD;
  }
  return { pWin: vittorie/N, perditeA: pa/N, perditeD: pd/N, nA: atts.length, nD: defs.length,
           mura: cm.hex===hexDif && cm.mura>0 && cm.muraHP>0 };
}
// Milizia cittadina: una citta' senza guarnigione NON e' terra gratis. Prima bastava
// avvicinarsi a un centro sguarnito per prenderlo, e togliendo le truppe iniziali un singolo
// brigante di passaggio poteva conquistare la capitale ed eliminare il giocatore entro trenta
// turni senza che avesse fatto nulla di sbagliato. Ora ogni citta' si difende da sola, con
// una forza che cresce con la popolazione, le mura e l'era.
function miliziaCittadina(cm){
  if (!cm || !cm.fondata) return null;
  // usa il tipo "milizia" gia' esistente, le cui statistiche scalano con l'era; la robustezza
  // la da' la popolazione, cosi' un capoluogo si difende molto meglio di un borgo appena fondato
  return { id:-1, tipo:"guarnigione", fazione:cm.fazione, hex:cm.hex,
           hp: Math.min(100, 40 + cm.pop*3 + (cm.mura>0 ? 15 : 0)),
           mov:0, xp:0, milizia:true, camminato:false, fortificata:true };
}
function attacca(uids, hexDif){
  const atts = st.unita.filter(u=>uids.includes(u.id) && u.mov>0);
  if (!atts.length) return null;
  let defs = nemiciSuHex(hexDif, atts[0].fazione);
  const cm = st.comuni[MAP.hexes[hexDif].comune];
  // citta' sguarnita: scende in campo la milizia cittadina
  if (!defs.length && cm.fondata && cm.hex===hexDif && cm.fazione!==atts[0].fazione && cm.fazione!==-1){
    const mil = miliziaCittadina(cm);
    if (mil){
      mil.id = st.nextUid++;
      st.unita.push(mil);
      defs = [mil];
      const r0 = simulaBattaglia(atts, defs, hexDif, true);
      // La guarnigione esiste SOLO per la durata dello scontro: va tolta sempre, vinca o
      // perda, altrimenti resta in giro come unita' fantasma che nessuno ha reclutato.
      st.unita = st.unita.filter(u => u.id !== mil.id);
      if (!r0.vinceA){
        aggiungiLog("La guarnigione di "+cm.nome+" respinge l'assalto!", cm.fazione===st.giocatore?"bene":"info");
        return { respinto:true };
      }
      for (const u of atts.slice(0,4)){ u.hex = hexDif; u.mov = 0; }
      if (st.comuni[cm.id].fazione !== atts[0].fazione) catturaComune(cm, atts[0].fazione);
      return { cattura:true };
    }
  }
  if (!defs.length && cm.hex===hexDif && cm.fazione!==atts[0].fazione){
    // assalto alle mura o cattura diretta
    if (cm.mura>0 && cm.muraHP>0){
      let danno = 0;
      for (const u of atts){
        const s = D().UNITA[u.tipo];
        danno += (s.muraDanno||Math.round(statU(u.tipo).atk*1.5));
        u.mov = 0; u.hp = Math.max(1, u.hp-8);
      }
      cm.muraHP = Math.max(0, cm.muraHP - danno);
      aggiungiLog("Assalto alle mura di "+cm.nome+": -"+danno+" PV mura ("+cm.muraHP+" rimasti).", "info");
      if (cm.muraHP<=0){
        for (const u of atts.slice(0,4)) u.hex = hexDif;
        catturaComune(cm, atts[0].fazione);
      }
      return { mura:true };
    }
    for (const u of atts.slice(0,4)){ u.hex = hexDif; u.mov = 0; }
    catturaComune(cm, atts[0].fazione);
    return { cattura:true };
  }
  if (!defs.length) return null;
  const r = simulaBattaglia(atts, defs, hexDif, true);
  if (window.FX){ const h=MAP.hexes[hexDif];
    // effetti comici delle unità speciali
    if (atts.some(u=>D().UNITA[u.tipo].buffa==="arancini")) FX.arancini(h.x, h.y, 14);
    if (atts.some(u=>D().UNITA[u.tipo].buffa==="granita")) FX.granita(h.x, h.y);
    if (atts.some(u=>D().UNITA[u.tipo].esplode)) FX.brioche(h.x, h.y);
    FX.battle(h.x, h.y, r.vinceA); FX.floatText(h.x, h.y-4, (r.vinceA?"−":"+")+(r.vinceA?r.perditeD:r.perditeA), r.vinceA?"#6fbf6f":"#e05540");
    if (atts[0] && atts[0].fazione===st.giocatore) FX.shake(r.vinceA?3:4, 0.3);
  }
  if (r.vinceA && atts[0] && atts[0].fazione===st.giocatore){ provaSbloccoGuardaroba("battaglia", 0.12); stat().vinte++; }
  if (!r.vinceA && defs.some(d=>d.fazione===st.giocatore)) stat().vinte++;   // difesa riuscita
  // contatori per fazione (servono alle Intuizioni, anche dell'IA)
  {
    const vinc = r.vinceA ? atts[0].fazione : (defs[0] ? defs[0].fazione : -1);
    const fv = (vinc>=0 && vinc<100) ? st.fazioni[vinc] : null;
    if (fv){ fv.cont = fv.cont||{vinte:0,conquiste:0,briganti:0}; fv.cont.vinte++;
      if (r.vinceA && defs.some(d=>d.fazione===-1)) fv.cont.briganti++; }
  }
  const nomeDif = cm.hex===hexDif ? cm.nome : "campo aperto";
  aggiungiLog((r.vinceA?"⚔️ Vittoria":"⚔️ Sconfitta")+" a "+nomeDif+" — perdite: "+r.perditeA+" nostre, "+r.perditeD+" nemiche.", r.vinceA?"bene":"male");
  return r;
}
function bombarda(uid, cmId){
  const u = st.unita.find(x=>x.id===uid);
  const cm = st.comuni[cmId];
  if (!u || u.mov<=0 || !D().UNITA[u.tipo].muraDanno) return false;
  if (!MAP.vicini(u.hex).includes(cm.hex) && u.hex!==cm.hex) return false;
  if (cm.muraHP<=0) return false;
  cm.muraHP = Math.max(0, cm.muraHP - D().UNITA[u.tipo].muraDanno);
  u.mov = 0;
  aggiungiLog(D().UNITA[u.tipo].nome+" bombarda le mura di "+cm.nome+" ("+cm.muraHP+" PV rimasti).", "info");
  return true;
}

// Citta' fondata dove non c'era nulla: si crea un comune nuovo di zecca col nome scelto dal
// giocatore. Non tocca DATA_COMUNI (che resta la geografia reale): vive solo nella partita.
function nuovoComuneFondato(nome, hexIdx){
  const h = MAP.hexes[hexIdx];
  const cm = {
    id: st.comuni.length, nome, prov: "", tier: 1, hex: hexIdx, res: null,
    fondata: false, fazione: -1, pop: 1, cibo: 0, unrest: 0, malusConq: 0, eruzioneMalus: 0,
    cultura: "siciliana", integr: 100, dop: null, nuova: true,
    edifici: [], mura: 0, muraHP: 0, coda: [], prodAcc: 0, barocca: false, tributi: {}
  };
  st.comuni.push(cm);
  return cm;
}

// ---------- TERRITORIO DINAMICO ----------
// h.comune resta un fatto GEOGRAFICO (qual e' il paese piu' vicino) e serve perche' in tutto
// il motore st.comuni[h.comune] viene letto senza guardie. Il possesso invece e' h.citta:
// -1 = terra di nessuno. Una citta' nasce padrona del proprio esagono e dei sei adiacenti,
// e allarga i confini di una casella ogni volta che cresce di popolazione.
function fazioneDiHex(h){
  if (!h || h.citta < 0) return -1;
  const cm = st.comuni[h.citta];
  return cm ? cm.fazione : -1;
}
// Indice delle caselle possedute, per citta'. reseComune gira per ogni citta' a ogni turno
// (e piu' volte: rese della fazione, crescita, decisioni dell'IA) e scorreva TUTTI i 10.405
// esagoni di terra ogni volta — mezzo milione di iterazioni a passata. Il possesso cambia solo
// quando una citta' rivendica una casella, quindi l'elenco si costruisce una volta e si
// aggiorna a mano. ATTENZIONE: restituisce l'array vero, non una copia: non va mutato.
let _idxTerr = null;
function indiceTerritorio(){
  if (_idxTerr) return _idxTerr;
  _idxTerr = new Map();
  for (const h of MAP.terre){
    if (h.citta < 0) continue;
    let a = _idxTerr.get(h.citta);
    if (!a) _idxTerr.set(h.citta, a = []);
    a.push(h);
  }
  return _idxTerr;
}
function resetIndiceTerritorio(){ _idxTerr = null; }
const VUOTO = [];
function territorioDi(cmId){ return indiceTerritorio().get(cmId) || VUOTO; }
// rivendica un esagono per una citta' (se libero)
function rivendica(hexIdx, cmId){
  const h = MAP.hexes[hexIdx];
  if (!h || h.mare || h.citta >= 0) return false;
  h.citta = cmId;
  if (_idxTerr){ let a = _idxTerr.get(cmId); if (!a) _idxTerr.set(cmId, a = []); a.push(h); }
  return true;
}
// primo nucleo: l'esagono della citta' e i sei attorno
function nucleoIniziale(cm){
  MAP.hexes[cm.hex].citta = cm.id;
  if (_idxTerr){ let a = _idxTerr.get(cm.id); if (!a) _idxTerr.set(cm.id, a = []); a.push(MAP.hexes[cm.hex]); }
  for (const j of MAP.vicini(cm.hex)) rivendica(j, cm.id);
}
// una casella in piu': la piu' vicina al centro, fra quelle libere che toccano il territorio
function espandiTerritorio(cm){
  const mie = territorioDi(cm.id);
  if (!mie.length) return false;
  const hc = MAP.hexes[cm.hex];
  let best = -1, bd = 1e9;
  for (const h of mie){
    for (const j of MAP.vicini(h.i)){
      const n = MAP.hexes[j];
      if (n.mare || n.citta >= 0) continue;
      const d = Math.hypot(n.x-hc.x, n.y-hc.y);
      if (d < bd){ bd = d; best = j; }
    }
  }
  if (best < 0) return false;
  return rivendica(best, cm.id);
}

// ---------- ETA' D'ORO, NORMALE, OSCURA, EROICA ----------
// A ogni cambio d'era il regno riceve un giudizio sull'era appena chiusa. Il giocatore lo
// guadagna con gli obiettivi d'era (che gia' esistono: qui trovano la conseguenza che mancava);
// l'IA con la classifica del punteggio. Un'eta' oscura seguita da un'eta' d'oro e' EROICA.
function etaDiFazione(f, eraChiusa){
  let livello;
  if (f.id === st.giocatore){
    const fatti = obiettiviEra(eraChiusa).filter(o => stat().obiettivi.includes(o.id)).length;
    livello = fatti >= 2 ? "oro" : (fatti === 1 ? "normale" : "oscura");
  } else {
    const vive = st.fazioni.filter(x => !x.eliminata);
    const ordine = vive.map(x => ({ id:x.id, p:punteggio(x.id).totale })).sort((a,b)=>b.p-a.p);
    const pos = ordine.findIndex(x => x.id === f.id);
    livello = pos < 2 ? "oro" : (pos >= vive.length-2 ? "oscura" : "normale");
  }
  if (livello === "oro" && f.eta === "oscura") livello = "eroica";
  return livello;
}
const ETA_INFO = {
  oro:     { nome:"Età d'oro",   icona:"🌞", desc:"+15% cibo e cultura, il popolo è sereno (−1 malcontento)." },
  eroica:  { nome:"Età eroica",  icona:"🔥", desc:"Dalle ceneri alla gloria: +25% cibo e cultura, −2 malcontento." },
  normale: { nome:"Età normale", icona:"⚖️", desc:"Nessun bonus, nessuna penalità." },
  oscura:  { nome:"Età oscura",  icona:"🌑", desc:"−10% cultura, il popolo mormora (+1 malcontento). Ma da qui si può risorgere: la prossima età d'oro sarà eroica." }
};
function etaMult(faz){
  if (!faz) return { cibo:1, cultura:1, unrest:0 };
  switch(faz.eta){
    case "oro":    return { cibo:1.15, cultura:1.15, unrest:-1 };
    case "eroica": return { cibo:1.25, cultura:1.25, unrest:-2 };
    case "oscura": return { cibo:1.0,  cultura:0.90, unrest:+1 };
  }
  return { cibo:1, cultura:1, unrest:0 };
}

// ---------- EDITTI ----------
// Gli effetti entrano nello stesso sacchetto di techBonus, cosi' tutto cio' che gia' lo
// consuma (oro, cibo, cultura, scienza, malcontento, crescita) li vede senza altre modifiche.
function slotEditti(f){
  return Math.min(4, 1 + Math.floor(st.era/2) + (f && f.techs.includes("stato") ? 1 : 0));
}
function edittiDisponibili(fid){
  const f = st.fazioni[fid];
  return D().EDITTI.filter(e => !e.tech || f.techs.includes(e.tech));
}
function costoCambioEditto(){ return 40 + st.era*35; }
function attivaEditto(fid, id, slot){
  const f = st.fazioni[fid];
  const e = D().EDITTI.find(x => x.id === id);
  if (!e) return false;
  if (e.tech && !f.techs.includes(e.tech)) return false;
  f.editti = f.editti || [];
  if (slot === undefined || slot < 0 || slot >= slotEditti(f)) return false;
  if (f.editti.includes(id) && f.editti[slot] !== id) return false;   // mai due volte lo stesso
  // cambiare idea costa: il primo insediamento di uno slot vuoto e' gratis
  if (f.editti[slot]){
    const c = costoCambioEditto();
    if (f.oro < c) return false;
    f.oro -= c;
  }
  f.editti[slot] = id;
  techBonusReset();
  if (fid === st.giocatore) aggiungiLog(e.icona+" Editto proclamato: "+e.nome+".", "bene");
  return true;
}
function revocaEditto(fid, slot){
  const f = st.fazioni[fid];
  if (!f.editti || !f.editti[slot]) return false;
  f.editti[slot] = null;
  techBonusReset();
  return true;
}
function bonusEditti(f){
  const b = {};
  if (!f || !f.editti) return b;
  const max = slotEditti(f);
  for (let i=0; i<max; i++){
    const id = f.editti[i];
    if (!id) continue;
    const e = D().EDITTI.find(x => x.id === id);
    if (!e) continue;
    for (const k in e.eff) b[k] = (b[k]||0) + e.eff[k];
  }
  return b;
}
// l'IA sceglie gli editti che le somigliano: chi e' in guerra si arma, chi e' in pace produce
function edittiIA(f){
  const max = slotEditti(f);
  f.editti = f.editti || [];
  let vuoti = 0;
  for (let i=0;i<max;i++) if (!f.editti[i]) vuoti++;
  if (!vuoti) return;
  const inGuerra = Object.values(f.diplo||{}).some(d => d.stato === "guerra");
  const gia = new Set(f.editti.filter(Boolean));
  const disp = edittiDisponibili(f.id).filter(e => !gia.has(e.id));
  if (!disp.length) return;
  const voto = e => {
    let v = 0;
    const x = e.eff;
    v += (x.oroPct||0)*10 + (x.ciboPct||0)*8 + (x.prodPct||0)*9 + (x.sciPct||0)*8 + (x.culturaPct||0)*5;
    v += (x.combatPct||0)*(inGuerra ? 20 : 4);
    v += (x.fedelta||0)*2 - (x.malcontento||0)*2 + (x.caseExtra||0)*2 + (x.serviziExtra||0)*2;
    v -= (x.mantPct||0)*8;
    return v;
  };
  // fra le tre migliori si sceglie a caso: con il solo punteggio tutti i regni finivano con
  // gli stessi quattro editti e si somigliavano tutti
  disp.sort((a,b) => voto(b) - voto(a));
  const scelto = disp[Math.floor(rnd() * Math.min(3, disp.length))];
  for (let i=0;i<max;i++) if (!f.editti[i]){ attivaEditto(f.id, scelto.id, i); return; }
}

// ---------- ACQUISTO DELLE CASELLE ----------
// Una casella fuori dal regno non rende nulla e non si puo' migliorare: l'unica cosa che si
// puo' fare e' comprarla. I confini crescono da soli con la popolazione (lentamente); l'oro
// serve a prendere SUBITO quella che ti interessa — la collina col marmo, la costa col tonno.
// Prezzo: sale con la distanza dal centro e con quante caselle la citta' ha gia', cosi'
// allargarsi all'infinito costa sempre di piu'.
const RAGGIO_ACQUISTO = 5;          // esagoni dal centro citta': oltre, non si compra
function costoCasella(cm, hexIdx){
  const h = MAP.hexes[hexIdx];
  if (!h) return 0;
  const d = MAP.distKm(cm.hex, hexIdx) / (MAP.R*2);
  const gia = territorioDi(cm.id).length;
  let c = 45 + Math.round(d*18) + gia*4;
  if (h.res) c += 45;                              // una risorsa vale il suo prezzo
  if (h.terra === "mountain") c = Math.round(c*0.8);
  return c;
}
// si puo' comprare? (ritorna il motivo del no, cosi' il pannello lo puo' spiegare)
function puoComprareCasella(hexIdx, fid){
  const h = MAP.hexes[hexIdx];
  if (!h || h.mare || h.terra === "lago") return { ok:false, motivo:"Non è terra su cui si possa mettere piede." };
  if (h.citta >= 0){
    const p = st.comuni[h.citta];
    return { ok:false, motivo: p.fazione === fid ? "È già tua." : "Appartiene a un altro regno." };
  }
  // dev'essere attaccata al territorio di una TUA citta', ed entro il suo raggio
  let best = null;
  for (const j of MAP.vicini(hexIdx)){
    const v = MAP.hexes[j];
    if (!v || v.citta < 0) continue;
    const cm = st.comuni[v.citta];
    if (!cm || cm.fazione !== fid || !cm.fondata) continue;
    const d = MAP.distKm(cm.hex, hexIdx) / (MAP.R*2);
    if (d > RAGGIO_ACQUISTO) continue;
    const c = costoCasella(cm, hexIdx);
    if (!best || c < best.costo) best = { cm, costo:c };
  }
  if (!best) return { ok:false, motivo:"Troppo lontana: si comprano solo le caselle che toccano il tuo territorio." };
  const f = st.fazioni[fid];
  return { ok: f.oro >= best.costo, costo: best.costo, cm: best.cm,
           motivo: f.oro >= best.costo ? null : "Non hai abbastanza oro." };
}
function compraCasella(hexIdx, fid){
  const p = puoComprareCasella(hexIdx, fid);
  if (!p.ok) return false;
  const f = st.fazioni[fid];
  f.oro -= p.costo;
  rivendica(hexIdx, p.cm.id);
  MAP.invalidate();
  if (fid === st.giocatore){
    const h = MAP.hexes[hexIdx];
    aggiungiLog("🪙 Casella acquistata per "+p.cm.nome+" ("+p.costo+" oro).", "bene");
    if (window.FX){ FX.constructionPop(h.x, h.y); FX.floatText(h.x, h.y-4, "-"+p.costo+" 💰", "#e0c060"); }
  }
  return true;
}
// quanto renderebbe una casella una volta dentro il regno: serve al pannello per far decidere
function resaCasella(hexIdx){
  const h = MAP.hexes[hexIdx];
  const r = { cibo:0, prod:0, oro:0, cultura:0 };
  if (!h || h.mare) return r;
  if (h.terra==="plain"){ r.cibo=2; r.prod=1; }
  else if (h.terra==="hill"){ r.cibo=1; r.prod=1; }
  else if (h.terra==="mountain"){ r.prod=2; }
  else if (h.terra==="forest"){ r.cibo=1; r.prod=1; }
  else if (h.terra==="volcano"){ r.prod=1; }
  else if (h.terra==="lago"){ r.cibo=2; r.oro=0.5; }
  if (h.fiume) r.cibo+=1;
  if (h.costa) r.oro+=0.5;
  if (h.res){
    const ri = RES_INFO[h.res];
    r.cibo+=ri.cibo||0; r.prod+=ri.prod||0; r.oro+=ri.oro||0; r.cultura+=ri.cultura||0;
  }
  return r;
}

// ---------- GRANDI SICILIANI ----------
// I quartieri e gli edifici generano punti in quattro categorie. Il costo del prossimo
// personaggio e' GLOBALE e sale a ogni reclutamento: e' una corsa, non una lista della spesa.
// Il costo sale a ogni personaggio gia' preso (da chiunque: e' una fila sola) e sale ancora
// per chi in quella categoria ne ha gia' presi. Senza il secondo termine un solo regno con
// tanti quartieri si portava via tredici Grandi su ventiquattro e la corsa non esisteva.
function costoGrande(cat, f){
  const presi = (st.grandiPresi && st.grandiPresi[cat]) || 0;
  const miei = f && f.grandi ? f.grandi.filter(x => x.cat === cat).length : 0;
  return Math.round((160 + presi*220) * (1 + 0.35*miei));
}
function prossimoGrande(cat){
  const i = (st.grandiPresi && st.grandiPresi[cat]) || 0;
  const fila = D().GRANDI[cat];
  return i < fila.length ? fila[i] : null;
}
function puntiGrandiTurno(fid){
  const p = { scienziato:0, condottiero:0, artista:0, mercante:0 };
  for (const cm of st.comuni){
    if (cm.fazione !== fid || !cm.fondata) continue;
    for (const c of D().CAT_GRANDI){
      for (const h of quartieriDi(cm.id)) if (c.da[h.quart]) p[c.id] += c.da[h.quart];
      for (const e of cm.edifici) if (c.da[e]) p[c.id] += c.da[e];
    }
  }
  return p;
}
function turnoGrandi(){
  st.grandiPresi = st.grandiPresi || { scienziato:0, condottiero:0, artista:0, mercante:0 };
  for (const f of st.fazioni){
    if (f.eliminata) continue;
    f.grandiPunti = f.grandiPunti || { scienziato:0, condottiero:0, artista:0, mercante:0 };
    const p = puntiGrandiTurno(f.id);
    for (const k in p) f.grandiPunti[k] += p[k];
  }
  // chi ha superato il costo si prende il personaggio; a parita' vince chi ha piu' punti
  for (const c of D().CAT_GRANDI){
    let guard = 0;
    while (guard++ < 6){
      const g = prossimoGrande(c.id);
      if (!g) break;
      // ogni regno ha il suo prezzo: vince chi lo supera piu' largamente
      let best = null, bestCosto = 0, bestRatio = 0;
      for (const f of st.fazioni){
        if (f.eliminata || !f.grandiPunti) continue;
        const costo = costoGrande(c.id, f);
        const r = f.grandiPunti[c.id] / costo;
        if (r >= 1 && r > bestRatio){ bestRatio = r; best = f; bestCosto = costo; }
      }
      if (!best) break;
      reclutaGrande(best, c.id, g, bestCosto);
    }
  }
}
function reclutaGrande(f, cat, g, costo){
  f.grandiPunti[cat] -= costo;
  st.grandiPresi[cat]++;
  f.grandi = f.grandi || [];
  f.grandi.push({ cat, nome:g.nome, turno:st.turno });
  applicaGrande(f, g);
  const info = D().CAT_GRANDI.find(x=>x.id===cat);
  aggiungiLog(info.icona+" "+g.nome+" entra al servizio di "+f.nome+".", f.id===st.giocatore ? "bene" : "info");
  if (f.id === st.giocatore){
    spara("ricerca");
    provaSbloccoGuardaroba("evento", 0.3);
    st.pending.push({ titolo:info.icona+" "+g.nome, img:null, ritrattoGrande:g.ritr,
      testo:g.nome+" di "+g.luogo+".\n\n«"+g.testo+"»\n\n"+testoEffettoGrande(g.eff),
      scelte:[{ label:"Al mio servizio", eff:"nulla" }] });
  }
}
function testoEffettoGrande(e){
  const v = [];
  if (e.scienza) v.push("+"+e.scienza+" scienza");
  if (e.cultura) v.push("+"+e.cultura+" cultura");
  if (e.oro) v.push("+"+e.oro+" oro");
  if (e.tech) v.push("una tecnologia scoperta subito");
  if (e.unita) v.push("una unità speciale nella capitale");
  if (e.unitaLinea) v.push(e.unitaLinea+" truppe nella capitale");
  if (e.unitaNave) v.push(e.unitaNave+" navi da guerra");
  if (e.fedelta) v.push("+"+e.fedelta+" fedeltà in tutte le città");
  if (e.calma) v.push("-"+e.calma+" malcontento ovunque per venti turni");
  if (e.vista) v.push("+1 raggio di vista");
  if (e.cibo) v.push("+2 case in ogni città");
  if (e.commercio) v.push("+25% oro per venti turni");
  if (e.difesaCitta) v.push("mura riparate in tutto il regno");
  return v.join(", ")+".";
}
function applicaGrande(f, g){
  const e = g.eff, cap = st.comuni[f.capitale];
  if (e.scienza) f.sciAcc += e.scienza;
  if (e.cultura) f.cultura = (f.cultura||0) + e.cultura;
  if (e.oro) f.oro += e.oro;
  if (e.tech){
    const disp = techDisponibili(f.id);
    if (disp.length){
      const t = disp.sort((a,b)=>costoTech(a,f.id)-costoTech(b,f.id))[0];
      f.techs.push(t.id);
      techBonusReset();
      aggiungiLog("📜 "+t.nome+" scoperta grazie a "+g.nome+".", f.id===st.giocatore?"bene":"info");
    }
  }
  if (e.unita && cap && D().UNITA[e.unita]) creaUnita(e.unita, f.id, cap.hex);
  if (e.unitaLinea && cap){
    const linea = D().LINEA_ERA[st.era];
    for (let k=0;k<e.unitaLinea;k++) creaUnita(linea[k%2], f.id, cap.hex);
  }
  if (e.unitaNave && cap){
    const porto = st.comuni.find(c=>c.fazione===f.id && c.fondata && cittaCostiera(c));
    if (porto){
      const navi = D().LINEA_NAVALE[Math.min(st.era, D().LINEA_NAVALE.length-1)] || [];
      for (let k=0;k<e.unitaNave && navi.length;k++) creaUnita(navi[navi.length-1], f.id, hexVaro(porto, navi[navi.length-1]));
    }
  }
  if (e.fedelta) for (const cm of st.comuni) if (cm.fazione===f.id && cm.fondata) cm.fedelta = Math.min(100, (cm.fedelta===undefined?100:cm.fedelta) + e.fedelta);
  if (e.calma) st.effettiTemp["grandeCalma_"+f.id] = 20;
  if (e.vista) f.vistaGrande = (f.vistaGrande||0) + e.vista;
  if (e.cibo) f.caseGrande = (f.caseGrande||0) + 2;
  if (e.commercio) st.effettiTemp["grandeOro_"+f.id] = 20;
  if (e.difesaCitta) for (const cm of st.comuni) if (cm.fazione===f.id && cm.mura>0) cm.muraHP = cm.mura*100;
}
function statoGrandi(fid){
  const f = st.fazioni[fid];
  st.grandiPresi = st.grandiPresi || { scienziato:0, condottiero:0, artista:0, mercante:0 };
  f.grandiPunti = f.grandiPunti || { scienziato:0, condottiero:0, artista:0, mercante:0 };
  const perTurno = puntiGrandiTurno(fid);
  return D().CAT_GRANDI.map(c => {
    const g = prossimoGrande(c.id);
    let rivale = 0;
    for (const x of st.fazioni) if (!x.eliminata && x.id!==fid && x.grandiPunti) rivale = Math.max(rivale, x.grandiPunti[c.id]);
    return { cat:c.id, nome:c.nome, icona:c.icona, punti:f.grandiPunti[c.id], perTurno:perTurno[c.id],
             costo:costoGrande(c.id, f), prossimo:g, rivale,
             miei:(f.grandi||[]).filter(x=>x.cat===c.id).map(x=>x.nome) };
  });
}

// ---------- PANE E FESTE (case e servizi) ----------
// Civ VI tiene separate due cose che qui erano confuse in una sola: quanto una citta' PUO'
// crescere (le case: acqua, campi, acquedotti) e quanto e' CONTENTA (i servizi: i prodotti di
// pregio e le feste). Trinacria aveva gia' gli ingredienti — le DOP, le sagre, i fiumi, la
// costa — ma non li legava alla crescita. Cosi' le DOP smettono di essere solo oro: dare il
// pistacchio di Bronte a quattro citta' vale piu' di qualche moneta.
function acquaVicina(cm){
  const h = MAP.hexes[cm.hex];
  if (h.fiume || h.costa) return true;
  return MAP.vicini(cm.hex).some(j => { const v = MAP.hexes[j]; return v && (v.fiume || v.terra==="lago"); });
}
function caseComune(cm){
  const faz = cm.fazione>=0 && cm.fazione<100 ? st.fazioni[cm.fazione] : null;
  const d = [];
  // La base era 3 e la capitale nasceva con sette abitanti: al primo turno la citta' era
  // gia' bloccata, prima ancora che il giocatore potesse farci qualcosa. Un abitato fondato
  // vale sei case, la capitale due in piu' perche' e' il posto dove tutti vogliono stare.
  let n = 5; d.push({ t:"il borgo", v:5 });
  if (faz && faz.capitale === cm.id){ n += 2; d.push({ t:"capitale", v:2 }); }
  if (acquaVicina(cm)){ n += 2; d.push({ t:"acqua vicina", v:2 }); }
  let campi = 0;
  for (const h of territorioDi(cm.id)) if (h.imp && (D().MIGLIORIE[h.imp]||{}).cibo) campi++;
  const bc = Math.min(3, Math.floor(campi/2));
  if (bc){ n += bc; d.push({ t:"campi coltivati", v:bc }); }
  if (cm.edifici.includes("granaio")){ n += 2; d.push({ t:"granaio", v:2 }); }
  if (cm.edifici.includes("porto")){ n += 1; d.push({ t:"porto", v:1 }); }
  if (faz && faz.techs.includes("acquedotti")){ n += 2; d.push({ t:"acquedotti", v:2 }); }
  if (faz && faz.caseGrande){ n += faz.caseGrande; d.push({ t:"lascito dei Grandi", v:faz.caseGrande }); }
  if (faz){ const tb = techBonus(faz.id); if (tb.caseExtra){ n += tb.caseExtra; d.push({ t:"editto", v:tb.caseExtra }); } }
  if (faz && faz.techs.includes("terme")){ n += 1; d.push({ t:"terme", v:1 }); }
  if (faz && faz.techs.includes("qanat")){ n += 1; d.push({ t:"qanat", v:1 }); }
  for (const hq of quartieriDi(cm.id)){
    if (hq.quart === "marina"){ n += 1; d.push({ t:"Marina", v:1 }); }
    if (hq.quart === "fondaco"){ n += 1; d.push({ t:"Fondaco", v:1 }); }
  }
  return { n, dett:d };
}
// A quali citta' tocca il prodotto di pregio: ogni DOP controllata serve quattro citta',
// e vanno alle piu' grandi (sono quelle che ne hanno bisogno). Memorizzato per turno.
let _servMemo = {};
function serviziReset(){ _servMemo = {}; }
function cittaConLusso(fid){
  if (_servMemo[fid]) return _servMemo[fid];
  const posti = dopControllati(fid).length * 4;
  const mie = st.comuni.filter(c => c.fondata && c.fazione === fid).sort((a,b) => b.pop - a.pop);
  const set = new Set();
  for (let i=0; i<Math.min(posti, mie.length); i++) set.add(mie[i].id);
  _servMemo[fid] = set;
  return set;
}
function serviziComune(cm){
  const faz = cm.fazione>=0 && cm.fazione<100 ? st.fazioni[cm.fazione] : null;
  // i primi quattro abitanti non chiedono nulla: una citta' appena fondata non deve nascere
  // gia' scontenta di qualcosa che il giocatore non ha ancora avuto modo di darle
  const richiesti = Math.max(0, Math.floor((cm.pop-4)/4));
  const d = [];
  let n = 0;
  if (faz){
    if (cittaConLusso(faz.id).has(cm.id)){ n += 1; d.push({ t:"prodotto di pregio", v:1 }); }
    const feste = (st.sagreAttive||[]).filter(s => s.fid===faz.id).length;
    if (feste){ const v = Math.min(2, feste*2); n += v; d.push({ t:"sagre in corso", v }); }
  }
  let svaghi = 0;
  if (cm.edifici.includes("teatro")) svaghi++;
  if (cm.edifici.includes("tempio")) svaghi++;
  if (cm.edifici.includes("cattedrale")) svaghi++;
  svaghi = Math.min(2, svaghi);
  if (svaghi){ n += svaghi; d.push({ t:"luoghi di ritrovo", v:svaghi }); }
  if (quartieriDi(cm.id).some(h => h.quart==="agora")){ n += 1; d.push({ t:"Agorà", v:1 }); }
  if (faz){ const tb = techBonus(faz.id); if (tb.serviziExtra){ n += tb.serviziExtra; d.push({ t:"editto", v:tb.serviziExtra }); } }
  return { richiesti, offerti:n, mancano: Math.max(0, richiesti-n), dett:d };
}

// ---------- FEDELTA' E CITTA' LIBERE ----------
// La Sicilia non e' mai stata conquistata citta' per citta': e' passata di mano per
// gravitazione. Le poleis che si arrendono a Roma, le porte aperte ai Normanni, i Vespri.
// Ogni citta' ha una fedelta' 0-100: la popolazione delle citta' vicine fa pressione, la
// propria la tiene su, quella altrui la tira giu'. A zero si ribella e diventa Citta' Libera;
// poi si unisce a chi preme di piu'. E' anche il freno alle conquiste lontane da casa.
const RAGGIO_FEDELTA = 9;          // esagoni entro cui una citta' fa sentire il suo peso
function pesoCitta(c, cm){
  const d = MAP.distKm(c.hex, cm.hex) / (MAP.R*2);
  if (d > RAGGIO_FEDELTA) return 0;
  return c.pop * Math.max(0, 1 - 0.10*d);       // -10% per esagono di distanza
}
// Bilancio della pressione su una citta'. `perFazione` serve alle citta' libere, che devono
// sapere CHI le sta attirando; per le altre conta solo il saldo fra i propri e gli altrui.
function pressioniSu(cm){
  const per = {};                                // fid -> peso
  for (const c of st.comuni){
    if (!c.fondata || c.id === cm.id) continue;
    if (c.fazione < 0 || c.fazione >= 100) continue;
    const p = pesoCitta(c, cm);
    if (p > 0) per[c.fazione] = (per[c.fazione]||0) + p;
  }
  return per;
}
// Quanto cambia la fedelta' di questa citta' in un turno, e perche' (i `dett` finiscono
// nel pannello: il giocatore deve poter capire chi gli sta portando via la citta').
function fedeltaDelta(cm){
  const dett = [];
  if (cm.fazione >= 100) return { delta:0, dett, verso:-1 };
  const per = pressioniSu(cm);
  if (cm.fazione === -1){
    // citta' libera: si accorge di chi la corteggia di piu' e piano piano ci si unisce
    let verso = -1, best = 0;
    for (const k in per) if (per[k] > best){ best = per[k]; verso = +k; }
    if (verso < 0) return { delta:-2, dett:[{ t:"nessuno la reclama", v:-2 }], verso:-1 };
    dett.push({ t:st.fazioni[verso].nome+" preme sui suoi confini", v:+(best*0.3).toFixed(1) });
    return { delta: Math.min(10, best*0.3), dett, verso };
  }
  const mia = per[cm.fazione] || 0;
  let altrui = 0, chi = -1, max = 0;
  for (const k in per){
    if (+k === cm.fazione) continue;
    altrui += per[k];
    if (per[k] > max){ max = per[k]; chi = +k; }
  }
  // La citta' tiene anche a se stessa, ma fino a un certo punto: se il suo peso contasse per
  // intero, un capoluogo da venticinque abitanti sarebbe fedele qualunque cosa gli succeda
  // intorno, e la fedelta' resterebbe inchiodata a 100 per tutta la partita.
  const SCALA = 0.12;                            // quanto lentamente si muove la fedelta'
  const se = Math.min(cm.pop, 12);
  const saldo = se + mia - altrui;
  let delta = saldo * SCALA;
  dett.push({ t:"la tua gente e le tue città vicine", v:+((se+mia)*SCALA).toFixed(1) });
  if (altrui > 0) dett.push({ t:"pressione di "+(chi>=0?st.fazioni[chi].nome:"altri"), v:-(+(altrui*SCALA).toFixed(1)) });
  // cultura e integrazione: una citta' assimilata resta, una appena presa scivola via
  const cult = (cm.integr - 50)/25;
  if (cult) dett.push({ t:"integrazione culturale", v:+cult.toFixed(1) });
  delta += cult;
  if (cm.malusConq > 0){ delta -= 3; dett.push({ t:"conquistata di recente", v:-3 }); }
  if (cm.unrest >= 6){ delta -= 2; dett.push({ t:"malcontento alto", v:-2 }); }
  const faz = st.fazioni[cm.fazione];
  if (faz && faz.capitale === cm.id){ delta += 4; dett.push({ t:"è la capitale", v:+4 }); }
  else if (faz && st.comuni[faz.capitale]){
    // governare da lontano e' difficile: e' il freno alle conquiste dall'altra parte dell'isola
    const dc = MAP.distKm(st.comuni[faz.capitale].hex, cm.hex) / (MAP.R*2);
    if (dc > 20){
      const m = -Math.min(5, (dc-20)/15);
      delta += m; dett.push({ t:"lontana dalla capitale", v:+m.toFixed(1) });
    }
  }
  if (faz){
    const em = etaMult(faz);
    if (em.unrest < 0){ delta += 2; dett.push({ t:"età d'oro", v:+2 }); }
    else if (em.unrest > 0){ delta -= 2; dett.push({ t:"età oscura", v:-2 }); }
  }
  if (faz && faz.techs.includes("diritto")){ delta += 1; dett.push({ t:"Diritto Romano", v:+1 }); }
  if (faz){ const tb = techBonus(faz.id); if (tb.fedelta){ delta += tb.fedelta; dett.push({ t:"editti", v:tb.fedelta }); } }
  return { delta: Math.max(-6, Math.min(6, delta)), dett, verso:-1 };
}
// Le rese calano quando il popolo non ti vuole piu': e' la vera conseguenza della fedelta'.
function fedeltaMult(cm){
  const f = cm.fedelta === undefined ? 100 : cm.fedelta;
  if (f >= 75) return 1;
  if (f >= 50) return 0.85;
  if (f >= 25) return 0.70;
  return 0.5;
}
function turnoFedelta(){
  for (const cm of st.comuni){
    if (!cm.fondata) continue;
    if (cm.fedelta === undefined) cm.fedelta = 100;
    if (cm.fazione >= 100) continue;                 // gli invasori non hanno fedelta'
    const r = fedeltaDelta(cm);
    const prima = cm.fedelta;
    cm.fedelta = Math.max(0, Math.min(100, cm.fedelta + r.delta));
    cm.versoFaz = r.verso;
    if (cm.fazione === -1){
      // citta' libera che ha finito di decidersi
      if (cm.fedelta >= 60 && r.verso >= 0) unisciPerFedelta(cm, r.verso);
      continue;
    }
    // avvisi al giocatore: prima che sia troppo tardi
    if (cm.fazione === st.giocatore){
      if (prima >= 40 && cm.fedelta < 40)
        aggiungiLog("⚠️ "+cm.nome+" comincia a guardare altrove (fedeltà "+Math.round(cm.fedelta)+").", "male");
    }
    if (cm.fedelta <= 0) ribellione(cm);
  }
}
// La citta' si stacca: nessuno la possiede, si difende da sola.
function ribellione(cm){
  const vecchio = cm.fazione;
  cm.fazione = -1;
  cm.fedelta = 15;
  cm.malusConq = 0;
  cm.coda = [];
  cm.integr = 40;
  cucinaReset();
  const liberi = [cm.hex].concat(MAP.vicini(cm.hex)).filter(j => !MAP.hexes[j].mare && !MAP.hexes[j].lago);
  for (let k=0; k<2 && k<liberi.length; k++) creaUnita("milizia", -1, liberi[k]);
  aggiungiLog("🏴 "+cm.nome+" si è ribellata: ora è una città libera!", vecchio===st.giocatore ? "male" : "info");
  if (window.FX){ const h = MAP.hexes[cm.hex]; FX.conquest(h.x, h.y, "#c0392b"); FX.shake(5, 0.4); }
  if (vecchio === st.giocatore){
    spara("sconfittaBattaglia", { luogo: cm.nome });
    st.pending.push({ titolo:"🏴 "+cm.nome+" si è ribellata",
      testo: "Il popolo di "+cm.nome+" non si sente più suddito: le insegne del regno sono state ammainate.\n\nUna città libera non appartiene a nessuno. Puoi riprenderla con le armi, oppure riconquistarla con la cultura: se le tue città vicine crescono, tornerà da sola.",
      scelte:[{ label:"Torneranno", eff:"nulla" }] });
  }
}
// Annessione pacifica: nessun saccheggio, nessun malcontento da conquista.
function unisciPerFedelta(cm, fid){
  cm.fazione = fid;
  cm.fedelta = 65;
  cm.integr = 60;
  cm.malusConq = 0;
  cm.versoFaz = -1;
  cucinaReset();
  st.unita = st.unita.filter(u => !(u.fazione===-1 && u.hex===cm.hex));   // la guarnigione libera si scioglie
  aggiungiLog("🕊️ "+cm.nome+" ha aperto le porte a "+st.fazioni[fid].nome+" senza un colpo.", fid===st.giocatore?"bene":"info");
  if (window.FX){ const h = MAP.hexes[cm.hex]; FX.conquest(h.x, h.y, D().FAZIONI[fid].colore); }
  if (fid === st.giocatore){
    spara("conquista", { luogo: cm.nome });
    st.pending.push({ titolo:"🕊️ "+cm.nome+" si unisce al regno",
      testo: cm.nome+" ha aperto le porte senza che un soldato le si avvicinasse: la tua cultura ha pesato più delle armi.",
      scelte:[{ label:"Così si governa", eff:"nulla" }] });
  }
}

// ---------- QUARTIERI (distretti con bonus di adiacenza) ----------
// Il quartiere sta su una casella del territorio della citta' e rende in base ai suoi vicini.
// Quante caselle guarda: sei. Quindi il calcolo e' minuscolo e si puo' rifare a ogni resa.
function quartiereDef(id){ return D().QUARTIERI.find(q => q.id === id); }
function quartieriDi(cmId){ return territorioDi(cmId).filter(h => h.quart); }
// una citta' piccola non regge molti quartieri: e' la popolazione a fare spazio
function tettoQuartieri(cm){ return Math.min(6, 1 + Math.floor(cm.pop/3)); }
// quartieri gia' costruiti O gia' in coda (altrimenti se ne accodano due uguali)
function haQuartiere(cm, qid){
  return quartieriDi(cm.id).some(h => h.quart === qid) || cm.coda.some(x => x.tipo==="quartiere" && x.id===qid);
}
// `ignoraCoda` serve a chi sta COMPLETANDO il quartiere: la voce e' ancora in coda (lavoraCoda
// la toglie dopo), quindi senza questa deroga la casella risulterebbe prenotata da se stessa e
// il quartiere finirebbe altrove, ignorando la scelta del giocatore.
function puoQuartiere(cm, hexIdx, qid, ignoraCoda){
  const h = MAP.hexes[hexIdx];
  if (!h || h.mare || h.terra === "lago") return false;
  if (h.citta !== cm.id) return false;         // solo sul proprio territorio
  if (h.i === cm.hex) return false;            // il centro e' gia' occupato dalla citta'
  if (h.quart) return false;
  if (!ignoraCoda && cm.coda.some(x => x.tipo==="quartiere" && x.hex===hexIdx)) return false;   // gia' prenotata
  const q = quartiereDef(qid);
  if (!q) return false;
  if (q.costiero && !h.costa) return false;
  return true;
}
// Resa di UN quartiere su UNA casella: base + una riga per ogni regola soddisfatta.
// `dettagli` serve all'anteprima nel pannello: fa vedere PERCHE' quella casella vale tanto.
function adiacenzaQuartiere(hexIdx, qid){
  const q = quartiereDef(qid);
  const rese = {}; const dettagli = [];
  if (!q) return { rese, dettagli, totale:0 };
  for (const k in q.base) rese[k] = q.base[k];
  const vic = MAP.vicini(hexIdx);              // array condiviso: solo lettura
  for (const r of q.regole){
    let n = 0;
    for (const j of vic){
      const v = MAP.hexes[j];
      if (!v) continue;
      if (r.tipo === "terra"){ if (!v.mare && r.val.includes(v.terra)) n++; }
      else if (r.tipo === "mare"){ if (v.mare) n++; }
      else if (r.tipo === "fiume"){ if (v.fiume) n++; }
      else if (r.tipo === "res"){ if (v.res) n++; }
      else if (r.tipo === "quartiere"){ if (v.quart) n++; }
      else if (r.tipo === "centro"){ const c = v.citta>=0 ? st.comuni[v.citta] : null; if (c && c.hex === v.i) n++; }
      else if (r.tipo === "impProd"){ if (v.imp && (D().MIGLIORIE[v.imp]||{}).prod) n++; }
    }
    if (!n) continue;
    dettagli.push({ testo:r.testo, n });
    for (const k in r.da) rese[k] = (rese[k]||0) + r.da[k]*n;
  }
  let totale = 0;
  for (const k in rese) if (k !== "calma") totale += rese[k];
  return { rese, dettagli, totale };
}
// tutte le caselle dove questo quartiere si potrebbe mettere, con quanto renderebbe
function caselleQuartiere(cm, qid){
  const out = [];
  for (const h of territorioDi(cm.id)){
    if (!puoQuartiere(cm, h.i, qid)) continue;
    const a = adiacenzaQuartiere(h.i, qid);
    out.push({ hex:h.i, rese:a.rese, dettagli:a.dettagli, totale:a.totale, imp:h.imp });
  }
  out.sort((a,b) => b.totale - a.totale);
  return out;
}
// quartieri che questa citta' puo' ancora costruire (tech, tetto, almeno una casella libera)
function quartieriDisponibili(cm){
  const f = cm.fazione>=0 && cm.fazione<100 ? st.fazioni[cm.fazione] : null;
  if (!f) return [];
  if (quartieriDi(cm.id).length + cm.coda.filter(x=>x.tipo==="quartiere").length >= tettoQuartieri(cm)) return [];
  const out = [];
  for (const q of D().QUARTIERI){
    if (q.tech && !f.techs.includes(q.tech)) continue;
    if (haQuartiere(cm, q.id)) continue;
    const celle = caselleQuartiere(cm, q.id);
    if (!celle.length) continue;
    let costo = q.costo;
    if (f.leader && f.leader.tratto === "costruttore") costo = Math.round(costo*0.85);
    out.push({ tipo:"quartiere", id:q.id, nome:q.nome, icona:q.icona, icoId:q.ico, costo,
               eff:testoQuartiere(q), desc:q.desc, migliore:celle[0] });
  }
  return out;
}
function testoQuartiere(q){
  const parti = [];
  for (const k in q.base) parti.push("+"+q.base[k]+" "+nomeResa(k));
  for (const r of q.regole){
    const k = Object.keys(r.da)[0];
    parti.push("+"+r.da[k]+" "+nomeResa(k)+" per "+r.testo);
  }
  return parti.join(", ");
}
function nomeResa(k){
  return k==="cibo" ? "cibo" : k==="prod" ? "produzione" : k==="oro" ? "oro"
       : k==="scienza" ? "scienza" : k==="cultura" ? "cultura" : "calma";
}
// posa vera e propria (a costruzione finita)
function posaQuartiere(cm, hexIdx, qid, ignoraCoda){
  if (!puoQuartiere(cm, hexIdx, qid, ignoraCoda)) return false;
  const h = MAP.hexes[hexIdx];
  h.quart = qid;
  h.imp = null;              // il quartiere prende il posto della miglioria: si costruisce sopra
  h.impTurni = 0;
  MAP.invalidate();
  return true;
}

// ---------- COVI DI BRIGANTI ----------
function brigantiVicino(hexIdx, r){
  return st.unita.filter(u => u.fazione===-1 && MAP.distKm(u.hex, hexIdx) < MAP.R*2*r).length;
}
function turnoCovi(){
  if (!st.covi) return;
  // nuovi covi nelle terre disabitate: senza, dopo che l'IA ha bonificato gli otto iniziali
  // (verso il turno 100) la meccanica sparisce per meta' partita. Nascono sui rilievi, a
  // piu' di 8 esagoni da ogni citta' fondata e da ogni altro covo.
  if (st.covi.length < 3 + Math.floor(st.era/2) && rnd() < 0.08){
    const citta = st.comuni.filter(c => c.fondata).map(c => c.hex);
    for (let tent=0; tent<60; tent++){
      const h = MAP.terre[Math.floor(rnd()*MAP.terre.length)];
      if (h.lago || h.isola || !(h.terra==="mountain" || h.terra==="hill" || h.terra==="forest")) continue;
      if (citta.some(c => MAP.distKm(c, h.i) < MAP.R*2*8)) continue;
      if (st.covi.some(c => MAP.distKm(c.hex, h.i) < MAP.R*2*8)) continue;
      if (unitaSuHex(h.i).length) continue;
      st.covi.push({ hex:h.i, forza:1, prossimo: st.turno + 4, nato: st.turno });
      creaUnita("milizia", -1, h.i);
      if (hexVisibile(h.i)) aggiungiLog("🏕️ Un nuovo covo di briganti si è insediato sui monti.", "male");
      break;
    }
  }
  for (const c of st.covi){
    // cresce se nessuno lo disturba a lungo
    if (st.turno - c.nato > 25 * c.forza && c.forza < 3) c.forza++;
    if (st.turno < c.prossimo) continue;
    // tetto globale: i briganti vagano verso le citta' e il covo, restando "vuoto", ne
    // sfornava senza fine (38 sulla mappa al turno 120). Oltre il tetto il covo non recluta.
    const tetto = 6 + st.era*2 + st.covi.length*2;
    const totale = st.unita.reduce((a,u)=>a+(u.fazione===-1?1:0), 0);
    if (totale < tetto && brigantiVicino(c.hex, 5) < 1 + c.forza){
      const liberi = [c.hex].concat(MAP.vicini(c.hex)).filter(j => !MAP.hexes[j].mare && !MAP.hexes[j].lago && unitaSuHex(j).length < 4);
      if (liberi.length) creaUnita("milizia", -1, liberi[Math.floor(rnd()*liberi.length)]);
    }
    c.prossimo = st.turno + Math.max(4, 12 - c.forza*3);
  }
}
// un'unita' di fazione entra nell'esagono del covo senza briganti sopra: il covo e' spazzato via
function liberaCovo(hexIdx, fid){
  if (!st.covi) return false;
  const i = st.covi.findIndex(c => c.hex === hexIdx);
  if (i < 0) return false;
  if (nemiciSuHex(hexIdx, fid).length) return false;
  const c = st.covi[i];
  st.covi.splice(i, 1);
  const f = (fid>=0 && fid<100) ? st.fazioni[fid] : null;
  if (!f) return true;
  const premio = 30 + st.era*20 + c.forza*15;
  f.oro += premio;
  f.cont = f.cont || { vinte:0, conquiste:0, briganti:0 }; f.cont.briganti++;
  if (fid === st.giocatore){
    aggiungiLog("🏕️ Covo di briganti spazzato via! Bottino: +"+premio+" oro.", "bene");
    const h = MAP.hexes[hexIdx];
    if (window.FX){ FX.confetti(h.x, h.y); FX.floatText(h.x, h.y-4, "+"+premio+" 💰", "#e0c060"); }
    spara("vittoriaBattaglia");
  }
  return true;
}

// ---------- INTUIZIONI (le Eureka) ----------
// Ogni tecnologia ha un'azione concreta che, compiuta, la sconta del 40%. Non missioni da
// menu: cose che si fanno comunque giocando, e che il gioco riconosce. Trasforma l'albero
// delle ricerche in una lista di cose da fare sulla mappa.
function checkIntuizione(check, fid){
  const parti = check.split(":");
  const k = parti[0], v = parti[1], w = parti[2];
  const f = st.fazioni[fid];
  const mie = st.comuni.filter(c => c.fazione===fid && c.fondata);
  const mieUnita = st.unita.filter(u => u.fazione===fid);
  const adiac = (cm, pred) => MAP.vicini(cm.hex).some(j => pred(MAP.hexes[j]));
  switch(k){
    case "citta":     return mie.length >= +v;
    case "pop":       return mie.some(c => c.pop >= +v);
    case "oro":       return f.oro >= +v;
    case "tech":      return f.techs.length >= +v;
    case "costiera":  return mie.some(c => cittaCostiera(c));
    case "fiume":     return mie.some(c => MAP.hexes[c.hex].fiume || adiac(c, h => h.fiume));
    case "monte":     return mie.some(c => adiac(c, h => h.terra==="mountain"));
    case "isola":     return mie.some(c => MAP.hexes[c.hex].isola);
    case "nave":      return mieUnita.some(u => eNavale(u) && !capacitaDi(u));
    case "eroe":      return !!f.eroeVivo;
    case "unitaTipo": return mieUnita.filter(u => (D().UNITA[u.tipo]||{}).tipo===v).length >= +w;
    case "edificio":  return mie.some(c => c.edifici.includes(v));
    case "edificioN": return mie.filter(c => c.edifici.includes(v)).length >= +w;
    case "mig":       return MAP.terre.filter(h => h.citta>=0 && st.comuni[h.citta].fazione===fid && h.imp===v).length >= +w;
    case "meraviglie":return Object.keys(st.meraviglie).filter(m => st.comuni[st.meraviglie[m]] && st.comuni[st.meraviglie[m]].fazione===fid).length >= +v;
    case "dop":       return dopControllati(fid).length >= +v;
    case "patti":     return Object.values(f.diplo).filter(d=>d.stato==="patto").length >= +v;
    case "commercio": return Object.values(f.diplo).filter(d=>d.commercio>0).length >= +v;
    case "vinte":     return (f.cont||{}).vinte >= +v;
    case "conquiste": return (f.cont||{}).conquiste >= +v;
    case "briganti":  return (f.cont||{}).briganti >= +v;
  }
  return false;
}
// a fine turno, per ogni fazione: quali intuizioni sono scattate?
function controllaIntuizioni(){
  for (const f of st.fazioni){
    if (f.eliminata) continue;
    f.intuizioni = f.intuizioni || {};
    f.cont = f.cont || { vinte:0, conquiste:0, briganti:0 };
    const nuove = [];
    for (const t of D().TECH){
      if (!t.intuizione || f.techs.includes(t.id) || f.intuizioni[t.id]) continue;
      if (t.era > st.era + 1) continue;             // non si anticipa troppo il futuro
      if (checkIntuizione(t.intuizione.check, f.id)){ f.intuizioni[t.id] = true; nuove.push(t); }
    }
    if (nuove.length && f.id === st.giocatore){
      for (const t of nuove) aggiungiLog("💡 Intuizione: "+t.intuizione.testo+" → "+t.nome+" costa il 40% in meno.", "bene");
      if (nuove.length === 1)
        st.pending.push({ titolo:"💡 Intuizione — "+nuove[0].nome, vox:"don_consiglio_3",
          testo:nuove[0].intuizione.testo+".\n\nI tuoi sapienti hanno capito qualcosa sul campo: "+nuove[0].nome+" costerà il 40% in meno.",
          scelte:[{label:"Eureka!", eff:"nulla"}] });
      else
        st.pending.push({ titolo:"💡 "+nuove.length+" intuizioni", vox:"don_consiglio_3",
          testo:"Dal campo arrivano nuove idee:\n\n"+nuove.map(t=>"• "+t.intuizione.testo+" → "+t.nome).join("\n")+"\n\nCiascuna costerà il 40% in meno.",
          scelte:[{label:"Eureka!", eff:"nulla"}] });
    }
  }
}

// ---------- FONDAZIONE DI CITTA' ----------
// Un comune "fondato" e' una citta' vera; finche' non lo e', e' solo un nome sulla mappa.
function fondaComune(cm, fid){
  if (!cm || cm.fondata) return false;
  cm.fondata = true;
  cm.fazione = fid;
  cm.integr = 100;
  cm.unrest = 0;
  nucleoIniziale(cm);          // nasce padrona del proprio esagono e dei sei attorno
  return true;
}
// si puo' fondare qui? (serve un colono, terra libera, e nessuna citta' troppo vicina)
const DIST_MIN_CITTA = 3;      // in esagoni: due citta' non possono stare appiccicate
const TIER_NOME = 2;          // solo i centri di rango >= 2 (80 su 170) prestano il loro nome
// Quale paese reale da' il nome a una citta' fondata qui? Vale l'esagono stesso o uno dei sei
// adiacenti, e solo per i centri abbastanza grandi: i paesini minori non diventano capoluoghi,
// restano borghi dentro il territorio. Se non c'e' nessuno, la citta' la battezza il giocatore.
function comuneCheDaIlNome(hexIdx){
  const cand = [hexIdx].concat(MAP.vicini(hexIdx));
  let best = null;
  for (const j of cand){
    const h = MAP.hexes[j];
    if (!h || h.mare) continue;
    const cm = st.comuni[h.comune];
    if (!cm || cm.fondata || cm.tier < TIER_NOME) continue;
    // il piu' importante vince; a parita' il piu' vicino
    const d = MAP.distKm(cm.hex, hexIdx);
    if (!best || cm.tier > best.cm.tier || (cm.tier === best.cm.tier && d < best.d)) best = { cm, d };
  }
  return best ? best.cm : null;
}
function puoFondare(hexIdx, fid){
  const h = MAP.hexes[hexIdx];
  if (!h || h.mare || h.lago) return { ok:false, motivo:"acqua" };
  if (h.citta >= 0) return { ok:false, motivo:"gia_territorio", cm: st.comuni[h.citta] };
  for (const c of st.comuni){
    if (!c.fondata) continue;
    if (MAP.distKm(c.hex, hexIdx) < DIST_MIN_CITTA*MAP.R*2) return { ok:false, motivo:"troppo_vicina", vicina:c };
  }
  const cm = comuneCheDaIlNome(hexIdx);
  return { ok:true, cm, nome: cm ? cm.nome : null };
}
// il colono fonda: la citta' prende il nome del comune a cui l'esagono appartiene
function fondaCitta(uid, nomeScelto){
  const u = st.unita.find(x=>x.id===uid);
  if (!u || u.tipo!=="colono" || u.mov<=0) return { ok:false, motivo:"non_valido" };
  const p = puoFondare(u.hex, u.fazione);
  if (!p.ok) return p;
  // se nessun centro importante presta il nome, nasce una citta' nuova col nome scelto
  if (!p.cm){
    if (!nomeScelto) return { ok:false, motivo:"serve_nome" };
    p.cm = nuovoComuneFondato(nomeScelto, u.hex);
  }
  p.cm.hex = u.hex;                       // la citta' nasce dove sta il colono
  fondaComune(p.cm, u.fazione);
  p.cm.pop = 2;
  st.unita = st.unita.filter(x=>x.id!==uid);   // il colono si consuma
  if (window.FX){ const h=MAP.hexes[p.cm.hex]; FX.constructionPop(h.x,h.y); FX.confetti(h.x,h.y); }
  aggiungiLog("🏛️ Fondata la citta' di "+p.cm.nome+"!", "bene");
  spara("colonizzazione", { luogo:p.cm.nome });
  calcolaVisibilita();
  return { ok:true, cm:p.cm };
}

// ---------- COLONIZZAZIONE PACIFICA (unità Colono) ----------
// annette una città indipendente SENZA combattere, ma solo se non ha difensori;
// il colono si consuma nell'impresa (a differenza della conquista militare non lascia malcontento).
function colonizza(uid, cmId){
  const u = st.unita.find(x=>x.id===uid);
  if (!u || u.tipo!=="colono" || u.mov<=0) return { ok:false, motivo:"non_valido" };
  const cm = st.comuni[cmId];
  if (!cm.fondata) return { ok:false, motivo:"non_fondata" };
  if (cm.fazione !== -1) return { ok:false, motivo:"non_indipendente" };
  if (nemiciSuHex(cm.hex, u.fazione).length) return { ok:false, motivo:"difesa" };
  if (u.hex !== cm.hex){
    const raggio = raggioMovimento([u.id]);
    if (!raggio[cm.hex] || !raggio[cm.hex].attacco) return { ok:false, motivo:"fuori_portata" };
  }
  u.hex = cm.hex; u.mov = 0;
  cm.fazione = u.fazione;
  cm.integr = 60;     // colonizzazione pacifica: parte più integrata di una conquista militare
  cm.malusConq = 0;   // nessuna penalità da conquista
  st.unita = st.unita.filter(x=>x.id!==uid); // il colono si stabilisce lì: si consuma
  cucinaReset();
  const nomeF = u.fazione>=0 && u.fazione<100 ? st.fazioni[u.fazione].nome : "una fazione";
  if (window.FX){
    const h = MAP.hexes[cm.hex];
    const col = u.fazione>=0 && u.fazione<100 ? D().FAZIONI[u.fazione].colore : "#8fd08f";
    FX.conquest(h.x, h.y, col);
    FX.floatText(h.x, h.y-5, cm.nome+"!", "#8fd08f", true);
  }
  aggiungiLog("🏘️ "+cm.nome+" si è unita pacificamente a "+nomeF+" grazie ai coloni!", u.fazione===st.giocatore?"bene":"info");
  if (u.fazione===st.giocatore) spara("colonizzazione", { luogo: cm.nome });
  controllaVittoria();
  return { ok:true };
}
// il colono cerca da solo la città indipendente indifesa più vicina e la fonda (o si avvicina)
function autoColonizza(uid){
  const u = st.unita.find(x=>x.id===uid);
  if (!u || u.tipo!=="colono" || u.mov<=0) return { ok:false, motivo:"non_valido" };
  const indifese = st.comuni.filter(c => c.fazione===-1 && !nemiciSuHex(c.hex, u.fazione).length);
  if (!indifese.length) return { ok:false, motivo:"nessun_bersaglio" };
  let best=null, bd=1e9;
  for (const cm of indifese){ const d = MAP.distKm(u.hex, cm.hex); if (d<bd){ bd=d; best=cm; } }
  if (u.hex===best.hex) return colonizza(uid, best.id);
  const raggio = raggioMovimento([uid]);
  if (raggio[best.hex] && raggio[best.hex].attacco) return colonizza(uid, best.id);
  let bestHex=-1, bhd=1e9;
  for (const i of Object.keys(raggio)){
    if (raggio[i].attacco) continue;
    const d = MAP.distKm(parseInt(i), best.hex);
    if (d<bhd){ bhd=d; bestHex=parseInt(i); }
  }
  if (bestHex>=0 && bhd < bd && muovi([uid], bestHex)) return { ok:true, mossa:true, verso:best.nome };
  return { ok:false, motivo:"irraggiungibile" };
}
// un gruppo di truppe (stesso esagono) cerca da solo il bersaglio attaccabile più vicino:
// indipendenti, fazioni in guerra col giocatore, invasori senza accordo — mai fazioni in pace/patto
function autoConquista(uids, fid){
  const us = st.unita.filter(u=>uids.includes(u.id) && u.mov>0);
  if (!us.length) return { ok:false, motivo:"non_valido" };
  const f = st.fazioni[fid];
  const bersagli = st.comuni.filter(cm => {
    if (cm.fazione === fid) return false;
    if (cm.fazione === -1) return true;
    if (cm.fazione >= 100) return !f.accordi["inv"+cm.fazione];
    return f.diplo[cm.fazione] && f.diplo[cm.fazione].stato === "guerra";
  });
  if (!bersagli.length) return { ok:false, motivo:"nessun_bersaglio" };
  const hex = us[0].hex;
  let best=null, bd=1e9;
  for (const cm of bersagli){ const d = MAP.distKm(hex, cm.hex); if (d<bd){ bd=d; best=cm; } }
  const raggio = raggioMovimento(uids);
  if (raggio[best.hex] && raggio[best.hex].attacco){ attacca(uids, best.hex); return { ok:true, attacco:true, verso:best.nome }; }
  let bestHex=-1, bhd=1e9;
  for (const i of Object.keys(raggio)){
    if (raggio[i].attacco) continue;
    const d = MAP.distKm(parseInt(i), best.hex);
    if (d<bhd){ bhd=d; bestHex=parseInt(i); }
  }
  if (bestHex>=0 && bhd < bd && muovi(uids, bestHex)) return { ok:true, mossa:true, verso:best.nome };
  return { ok:false, motivo:"irraggiungibile" };
}

function catturaComune(cm, fid){
  const vecchio = cm.fazione;
  if (window.FX){
    const h = MAP.hexes[cm.hex];
    const col = fid>=0 && fid<100 ? D().FAZIONI[fid].colore : "#c0392b";
    FX.conquest(h.x, h.y, col);
    FX.cittaInFiamme(cm.id, 2.5);
    FX.floatText(h.x, h.y-5, cm.nome+"!", col, true);
    FX.shake(6, 0.5);
    if (fid===st.giocatore) FX.flash("240,207,106", 0.4);
    else if (vecchio===st.giocatore) FX.flash("200,60,50", 0.45);
  }
  if (fid === st.giocatore) spara("conquista", { luogo: cm.nome });
  else if (vecchio === st.giocatore) spara("sconfittaBattaglia", { luogo: cm.nome });
  cm.fazione = fid;
  cucinaReset();
  cm.pop = Math.max(1, cm.pop-1);
  cm.malusConq = 8;
  cm.integr = 20;
  cm.fedelta = 35;              // una citta' presa con le armi non e' ancora tua davvero
  cm.versoFaz = -1;
  cm.muraHP = 0;
  cm.coda = [];
  const bottino = 20 + cm.pop*5;
  if (fid>=0 && fid<100) st.fazioni[fid].oro += bottino;
  const nomeF = fid>=100 ? nomeInvasore(fid) : (fid===-1?"i ribelli":st.fazioni[fid].nome);
  aggiungiLog("🏴 "+cm.nome+" è caduta! Ora è di "+nomeF+".", fid===st.giocatore?"bene":"male");
  if (fid===st.giocatore){
    stat().conquiste++;
    { const fc = st.fazioni[fid]; if (fc){ fc.cont = fc.cont||{vinte:0,conquiste:0,briganti:0}; fc.cont.conquiste++; } }
    if (vecchio>=100){
      stat().invasoriCitta++;
      // ultimo caposaldo degli invasori cacciato: grande ricompensa
      if (!st.comuni.some(c=>c.fazione===vecchio)){
        const premio = 150 + st.era*50;
        st.fazioni[fid].oro += premio; stat().invasoriRespinti++;
        st.unita = st.unita.filter(u=>u.fazione!==vecchio);
        st.pending.push({ titolo:"🛡️ "+nomeInvasore(vecchio).replace(/^gli /,"Gli ")+" sono stati cacciati!", testo:"Le loro ultime bandiere cadono a "+cm.nome+". La Sicilia è di nuovo dei siciliani.\n\nBottino di guerra: +"+premio+" oro, +40 punti.", scelte:[{label:"Antudo!", eff:"nulla"}] });
      }
    }
  }
  // capitale persa?
  if (vecchio>=0 && vecchio<100){
    const f = st.fazioni[vecchio];
    if (f.capitale===cm.id){
      if (fid===st.giocatore) sbloccaGuardaroba("vittoria_grande"); // conquista di una capitale rivale: sblocco garantito
      const altre = st.comuni.filter(c=>c.fazione===vecchio);
      if (altre.length){
        f.capitale = altre.sort((a,b)=>b.pop-a.pop)[0].id;
        aggiungiLog(f.nome+" sposta la capitale a "+st.comuni[f.capitale].nome+".", "info");
      }
    }
    controllaEliminazione(vecchio);
  }
  controllaVittoria();
}
function nomeInvasore(fid){
  const inv = st.invasori.find(x=>x.id===fid);
  return inv ? "gli "+inv.nome : "gli invasori";
}
function controllaEliminazione(fid){
  const f = st.fazioni[fid];
  if (f.eliminata) return;
  if (!st.comuni.some(c=>c.fazione===fid)){
    f.eliminata = true;
    st.unita = st.unita.filter(u=>u.fazione!==fid);
    aggiungiLog("💀 "+f.nome+" è stata cancellata dalla storia!", "era");
    if (fid===st.giocatore){ st.vittoria = "persa"; }
  }
}
function controllaVittoria(){
  if (st.vittoria) return;
  const gioc = st.giocatore;
  const rivaliVivi = st.fazioni.filter(f=>f.id!==gioc && !f.eliminata).length;
  const invOccupano = st.comuni.some(c=>c.fazione>=100);
  const miei = st.comuni.filter(c=>c.fazione===gioc).length;
  if ((rivaliVivi===0 && !invOccupano) || miei >= Math.ceil(st.comuni.length*0.75)){
    st.vittoria = "vinta";
  }
}

// ---------- EROI ----------
function costoEroe(){ return 80 + st.era*40; }
function reclutaEroe(fid){
  const f = st.fazioni[fid];
  if (f.eroeVivo || f.oro < costoEroe()) return false;
  f.oro -= costoEroe();
  f.eroeVivo = true;
  const nome = scegli(D().EROI[st.era]);
  const cap = st.comuni[f.capitale];
  creaUnita("eroe", fid, cap.hex, nome);
  aggiungiLog("★ Il condottiero "+nome+" si unisce a "+f.nome+"!", "bene");
  return true;
}

// ---------- POTERI DEL SOVRANO (mosse speciali) ----------
function poterePronto(id){ return !(st.poteri && st.poteri.cooldown && st.poteri.cooldown[id]>0); }
function poteriStato(){
  const cd = (st.poteri && st.poteri.cooldown) || {};
  return D().POTERI.map(p => ({ id:p.id, nome:p.nome, icona:p.icona, desc:p.desc, bersaglio:p.bersaglio,
    ricarica:p.ricarica, pronto: !(cd[p.id]>0), attesa: cd[p.id]||0 }));
}
// esagoni nell'area (raggio r) attorno a hex, incluso hex
function areaHex(hex, r){
  const z = new Set([hex]); let layer=[hex];
  for (let d=0; d<(r||0); d++){ const nx=[]; for (const hh of layer) for (const nb of MAP.vicini(hh)){ if (!z.has(nb)){ z.add(nb); nx.push(nb); } } layer=nx; }
  return [...z];
}
function usaPotere(id, hex){
  const p = D().POTERI.find(x=>x.id===id);
  if (!p || !poterePronto(id)) return false;
  const fid = st.giocatore;
  st.poteri = st.poteri || { cooldown:{} };
  const h = hex!=null ? MAP.hexes[hex] : null;
  if (p.bersaglio==="nemico"){
    if (hex==null) return false;
    const zona = areaHex(hex, p.raggio||1);
    const bersagli = st.unita.filter(u => zona.includes(u.hex) && !alleati(u.fazione, fid));
    for (const u of bersagli){ u.hp -= p.danno; if (p.congela) u.congelato = 2; }
    affondaConCarico();
    st.unita = st.unita.filter(u=>u.hp>0);
    if (window.FX && h){
      if (id==="eruzione"){ FX.eruption(h.x,h.y); FX.shake(9,0.6); FX.flash("255,120,40",0.5); }
      else { FX.arancini(h.x,h.y,16); FX.shake(5,0.4); }
    }
  } else if (p.bersaglio==="amico"){
    if (hex==null) return false;
    const zona = areaHex(hex, p.raggio||1);
    for (const u of st.unita) if (u.fazione===fid && zona.includes(u.hex)) u.hp = Math.min(100, u.hp + (p.cura||0));
    for (const cm of st.comuni) if (cm.fazione===fid && zona.includes(cm.hex)) cm.unrest = Math.max(0, cm.unrest - (p.malcontento||0));
    if (window.FX && h){ FX.pulse(h.x,h.y,"#ffe08a",26); FX.floatText(h.x,h.y-4,"✚","#ffe08a",true); FX.flash("255,230,150",0.4); }
  } else { // globale
    const f = st.fazioni[fid];
    if (p.oro) f.oro += p.oro;
    if (p.malcontento) for (const cm of st.comuni) if (cm.fazione===fid) cm.unrest = Math.max(0, cm.unrest - p.malcontento);
    if (id==="scirocco"){
      for (const u of st.unita) if (!alleati(u.fazione, fid) && u.fazione!==fid) u.congelato = Math.max(u.congelato||0, 1);
      if (st.nebbia) for (let i=0;i<MAP.hexes.length;i++) st.esplorato[i] = true;
    }
    if (id==="festa" && window.FX)
      for (const cm of st.comuni) if (cm.fazione===fid){ const hh=MAP.hexes[cm.hex]; FX.confetti(hh.x,hh.y); }
    if (window.FX) FX.flash("255,220,120",0.35);
  }
  st.poteri.cooldown[id] = p.ricarica;
  spara("potere", { testo: p.battuta });
  aggiungiLog("✨ "+p.nome+"! "+(p.battuta||""), "era");
  return true;
}

// ---------- POI SPONSOR: "Rifocillati" (prototipo) ----------
// Effetto volutamente PICCOLO (cura simbolica + ricarica): visibilità per l'inserzionista,
// non un vantaggio pay-to-win. Richiede truppe del giocatore sull'esagono o adiacenti.
const SPONSOR_CD = 5, SPONSOR_CURA = 10;
function rifocilla(spIdx){
  const sp = MAP.sponsor[spIdx];
  if (!sp) return { ok:false, motivo:"assente" };
  st.sponsorCd = st.sponsorCd || {};
  if (st.sponsorCd[spIdx] > st.turno) return { ok:false, motivo:"ricarica", turno: st.sponsorCd[spIdx] };
  const zona = [sp.hex, ...MAP.vicini(sp.hex)];
  const mie = st.unita.filter(u => u.fazione===st.giocatore && zona.includes(u.hex));
  if (!mie.length) return { ok:false, motivo:"lontano" };
  for (const u of mie) u.hp = Math.min(100, u.hp + SPONSOR_CURA);
  st.sponsorCd[spIdx] = st.turno + SPONSOR_CD;
  if (window.FX){ const h = MAP.hexes[sp.hex]; FX.confetti(h.x, h.y); FX.floatText(h.x, h.y-4, "🍽 +"+SPONSOR_CURA, "#8fd08f", true); }
  spara("sponsor", { nome: sp.nome });
  aggiungiLog("🍽 Le truppe si rifocillano da "+sp.nome+" (+"+SPONSOR_CURA+" vigore a "+mie.length+").", "bene");
  return { ok:true, n: mie.length };
}

// ---------- GUARDAROBA DEL SOVRANO (sblocchi cosmetici con rarità) ----------
const RARITA_PESO = { comune:50, raro:30, epico:15, leggendario:5 };
// sblocca un capo casuale (pesato per rarità) tra quelli non ancora ottenuti; preferisce quelli
// legati al "motivo" dell'impresa appena compiuta, altrimenti pesca da tutto ciò che resta.
function sbloccaGuardaroba(motivo){
  st.guardaroba = st.guardaroba || { veste:[], manto:[], copricapo:[] };
  const g = st.guardaroba;
  const nonSbloccato = x => !g[x.cat].includes(x.id);
  const candidati = D().GUARDAROBA_EXTRA.filter(x => x.come===motivo && nonSbloccato(x));
  const pool = candidati.length ? candidati : D().GUARDAROBA_EXTRA.filter(nonSbloccato);
  if (!pool.length) return null; // tutto già sbloccato
  const pesi = pool.map(x => RARITA_PESO[x.rarita]||10);
  const tot = pesi.reduce((a,b)=>a+b,0);
  let r = rnd()*tot, scelto = pool[pool.length-1];
  for (let i=0;i<pool.length;i++){ r -= pesi[i]; if (r<=0){ scelto = pool[i]; break; } }
  g[scelto.cat].push(scelto.id);
  aggiungiLog("✨ Guardaroba: hai sbloccato "+scelto.nome+" ("+scelto.rarita+")!", "bene");
  spara("guardaroba", { nome: scelto.nome });
  st.pending.push({ titolo:"✨ Nuovo capo sbloccato!",
    testo:"Il tuo guardaroba si arricchisce: <b>"+scelto.nome+"</b> — rarità <b>"+scelto.rarita+"</b>.\n\nPuoi equipaggiarlo dal menu «👗 Guardaroba».",
    scelte:[{label:"Magnifico!", eff:"nulla"}] });
  return scelto;
}
// tentativo di sblocco con probabilità (per non spammare ad ogni battaglia/tech): usato dai trigger di gioco
function provaSbloccoGuardaroba(motivo, probabilita){
  if (rnd() < probabilita) sbloccaGuardaroba(motivo);
}
function guardarobaStato(){
  st.guardaroba = st.guardaroba || { veste:[], manto:[], copricapo:[] };
  const g = st.guardaroba;
  return D().GUARDAROBA_EXTRA.map(x => ({ ...x, sbloccato: g[x.cat].includes(x.id) }));
}
// equipaggia (o rimuove, id=null) un capo sbloccato sul sovrano del giocatore
function equipaggiaGuardaroba(cat, id){
  const f = st.fazioni[st.giocatore];
  if (id !== null && !st.guardaroba[cat].includes(id)) return false;
  f.leader.look = f.leader.look || lookDefaultSicuro(st.giocatore);
  f.leader.look[cat+"Extra"] = id;
  return true;
}
function lookDefaultSicuro(fid){ return (window.ART && ART.lookDefault) ? ART.lookDefault(fid) : {}; }
// compra direttamente con oro un capo non ancora sbloccato
function compraGuardaroba(id){
  const item = D().GUARDAROBA_EXTRA.find(x=>x.id===id);
  const f = st.fazioni[st.giocatore];
  if (!item || st.guardaroba[item.cat].includes(id) || f.oro < item.costoOro) return false;
  f.oro -= item.costoOro;
  st.guardaroba[item.cat].push(id);
  aggiungiLog("💰 Acquistato dal guardaroba: "+item.nome+" ("+item.rarita+").", "bene");
  return true;
}

// ---------- DIPLOMAZIA ----------
function dichiaraGuerra(a, b){
  const fa=st.fazioni[a], fb=st.fazioni[b];
  fa.diplo[b].stato="guerra"; fb.diplo[a].stato="guerra";
  fa.diplo[b].turniGuerra=0; fb.diplo[a].turniGuerra=0;
  fa.diplo[b].atteggiamento-=40; fb.diplo[a].atteggiamento-=40;
  fa.diplo[b].commercio=0; fb.diplo[a].commercio=0;
  aggiungiLog("⚔️ GUERRA tra "+fa.nome+" e "+fb.nome+"!", "era");
  if (b===st.giocatore) spara("guerra", { fid:a });
  else if (a===st.giocatore) spara("guerra", { fid:b });
}
function proponiPace(a, b){
  const fa=st.fazioni[a], fb=st.fazioni[b];
  if (fa.diplo[b].stato!=="guerra") return false;
  const forzaA = forzaTotale(a), forzaB = forzaTotale(b);
  const ok = fb.ai ? (forzaB < forzaA*0.85 || fa.diplo[b].turniGuerra>12 || rnd()<0.25) : true;
  if (ok){
    fa.diplo[b].stato="pace"; fb.diplo[a].stato="pace";
    fa.diplo[b].atteggiamento+=10; fb.diplo[a].atteggiamento+=10;
    aggiungiLog("🕊️ Pace tra "+fa.nome+" e "+fb.nome+".", "bene");
  }
  return ok;
}
function proponiPatto(a, b){
  const fa=st.fazioni[a], fb=st.fazioni[b];
  if (fa.diplo[b].stato!=="pace") return false;
  const ok = fb.ai ? fb.diplo[a].atteggiamento > 5 : true;
  if (ok){
    fa.diplo[b].stato="patto"; fb.diplo[a].stato="patto";
    fa.diplo[b].turniPatto=25; fb.diplo[a].turniPatto=25;
    fa.diplo[b].atteggiamento+=15; fb.diplo[a].atteggiamento+=15;
    aggiungiLog("🤝 Patto di non aggressione: "+fa.nome+" e "+fb.nome+".", "bene");
  }
  return ok;
}
function proponiCommercio(a, b){
  const fa=st.fazioni[a], fb=st.fazioni[b];
  if (fa.diplo[b].stato==="guerra" || fa.diplo[b].commercio>0) return false;
  const ok = fb.ai ? fb.diplo[a].atteggiamento > -5 : true;
  if (ok){
    fa.diplo[b].commercio=20; fb.diplo[a].commercio=20;
    fa.diplo[b].atteggiamento+=8; fb.diplo[a].atteggiamento+=8;
    aggiungiLog("💰 Accordo commerciale: "+fa.nome+" ⇄ "+fb.nome+" (+3 oro/turno).", "bene");
  }
  return ok;
}
function regalo(a, b){
  const fa=st.fazioni[a];
  if (fa.oro<50) return false;
  fa.oro-=50;
  st.fazioni[b].diplo[a].atteggiamento+=12;
  return true;
}
function forzaTotale(fid){
  let s=0;
  for (const u of st.unita) if (u.fazione===fid) s += statU(u.tipo).atk + statU(u.tipo).def;
  return s + st.comuni.filter(c=>c.fazione===fid).length*10;
}

// ---------- DINASTIE ----------
function passoDinastia(f){
  if (!f.leader || f.eliminata) return;
  // il tempo di gioco scorre veloce: i leader invecchiano in modo attenuato
  f.leader.eta += anniPerTurno()*0.25;
  if (f.leader.eta > 58 && rnd() < (f.leader.eta-58)/50){
    const vecchio = f.leader;
    f.dinastia.push(vecchio.nome);
    f.leader = nuovoLeader(f.id, -1); // -1 = mai storico per eredi
    f.leader.storico = false;
    // la dinastia del giocatore mantiene l'aspetto scelto (identità del casato)
    if (f.id===st.giocatore && vecchio.look) f.leader.look = vecchio.look;
    const t = D().TRATTI[f.leader.tratto];
    if (f.id===st.giocatore){
      st.pending.push({ titolo:"⚱️ Morte di "+vecchio.nome,
        ritratto:{ fid:f.id, tratto:f.leader.tratto, nome:f.leader.nome },
        testo: vecchio.nome+" si spegne a "+Math.round(vecchio.eta)+" anni dopo aver guidato "+f.nome+".\n\nSale al potere "+f.leader.nome+" — "+t.icona+" "+t.nome+": "+t.desc,
        scelte:[{label:"Lunga vita a "+f.leader.nome+"!", eff:"nulla"}] });
    }
    aggiungiLog("⚱️ "+f.nome+": morto "+vecchio.nome+", regna "+f.leader.nome+" ("+t.nome+").", "info");
  }
}

// ---------- ERE ----------
function controllaEra(){
  if (st.era >= 5) return;
  const prossima = D().ERE[st.era+1];
  if (st.anno >= prossima.da){
    st.era++;
    spara("era", { era: D().ERE[st.era].nome });
    const era = D().ERE[st.era];
    for (const f of st.fazioni){
      if (f.eliminata) continue;
      f.cultureId = era.cultura;
      // l'IA aggiorna in automatico le truppe e le migliorie che può permettersi; al giocatore lo si propone sotto
      if (f.id !== st.giocatore){ upgradaEconomiche(f.id); upgradaMiglliorieEconomiche(f.id); }
      // leader storico di era?
      const storico = D().LEADER_STORICI[f.id] && D().LEADER_STORICI[f.id][st.era];
      if (storico){
        const oldLook = f.leader && f.leader.look;
        if (f.leader) f.dinastia.push(f.leader.nome);
        f.leader = { nome:storico, eta: 30+Math.floor(rnd()*10), tratto: scegli(Object.keys(D().TRATTI)), storico:true };
        // il giocatore conserva l'aspetto del proprio sovrano anche col nuovo nome
        if (f.id===st.giocatore && oldLook) f.leader.look = oldLook;
        if (f.id===st.giocatore){
          aggiungiLog("👑 "+storico+" prende il potere a "+f.nome+"!", "era");
          const tr = D().TRATTI[f.leader.tratto];
          st.pending.push({ titolo:"👑 "+storico,
            ritratto:{ fid:f.id, tratto:f.leader.tratto, nome:storico },
            testo:"Con la nuova era, "+storico+" sale alla guida di "+f.nome+".\n\n"+tr.icona+" "+tr.nome+": "+tr.desc,
            scelte:[{label:"Un nuovo regno comincia", eff:"nulla"}] });
        }
      }
    }
    for (const cm of st.comuni) cm.integr = Math.max(0, cm.integr-25);
    // giudizio sull'era appena chiusa
    for (const f of st.fazioni){
      if (f.eliminata) continue;
      f.eta = etaDiFazione(f, st.era-1);
    }
    aggiungiLog("🔱 Inizia l'"+era.nome+" ("+annoStr(era.da)+")! I tempi cambiano, le genti mormorano.", "era");
    st.pending.push({ titolo:"🔱 "+era.nome, img:"era_"+st.era, vox:"nar_era_"+st.era, testo:"Un'epoca nuova cala sulla Sicilia. Nuove tecnologie, nuove genti, nuovi padroni. Le popolazioni guardano con sospetto i nuovi costumi (integrazione -25).\n\n🎯 Obiettivi dell'era:\n• "+obiettiviEra(st.era).map(o=>o.testo).join("\n• ")+"\n\nPunteggio attuale: "+punteggio(st.giocatore).totale,
      scelte:[{label:"La storia avanza", eff:"nulla"}] });
    {
      const fg = st.fazioni[st.giocatore], info = ETA_INFO[fg.eta] || ETA_INFO.normale;
      const fatti = obiettiviEra(st.era-1).filter(o => stat().obiettivi.includes(o.id)).length;
      st.pending.push({ titolo: info.icona+" "+info.nome, vox: fg.eta==="oscura" ? "don_rivolta_3" : "don_meraviglia_1",
        testo:"Nell'era appena conclusa hai compiuto "+fatti+" obiettivi su "+obiettiviEra(st.era-1).length+".\n\n"+info.desc+
              "\n\nL'età dura per tutta l'"+era.nome+".",
        scelte:[{label: fg.eta==="oscura" ? "Risorgeremo" : "Che continui così", eff:"nulla"}] });
    }
    // suggerisci l'aggiornamento delle truppe del giocatore alle unità della nuova era (solo se sostenibile)
    const upg = unitaAggiornabili(st.giocatore);
    if (upg.length){
      const esempi = upg.slice(0,4).map(x=>x.vecchioNome+" → "+x.nuovoNome).join(", ")+(upg.length>4?"…":"");
      st.pending.push({ titolo:"⚔️ Nuove armi per l'esercito",
        testo: upg.length+(upg.length===1?" tua truppa può":" tue truppe possono")+" essere aggiornate alle unità della "+era.nome+":\n"+esempi+"\n\nL'aggiornamento costa oro ma restituisce la truppa a piena forza.",
        scelte:[
          {label:"⚔️ Aggiorna subito quelle che posso permettermi", eff:"upgrade_tutte"},
          {label:"🖐 Decido io dal menu «Esercito»", eff:"nulla"},
          {label:"Non ora", eff:"nulla"}
        ] });
    }
    // idem per le migliorie del territorio (campi, vigneti, miniere... diventano manifatture)
    const upgM = migliorieAggiornabili(st.giocatore);
    if (upgM.length){
      const esempiM = upgM.slice(0,4).map(x=>x.vecchioNome+" → "+x.nuovoNome).join(", ")+(upgM.length>4?"…":"");
      st.pending.push({ titolo:"🌾 Il regno si ammoderna",
        testo: upgM.length+(upgM.length===1?" tua miglioria può":" tue migliorie possono")+" ammodernarsi con la "+era.nome+":\n"+esempiM+"\n\nL'ammodernamento costa oro ma rende di più.",
        scelte:[
          {label:"🏭 Ammoderna subito quelle che posso permettermi", eff:"upgrade_migliorie"},
          {label:"🖐 Decido io dagli esagoni", eff:"nulla"},
          {label:"Non ora", eff:"nulla"}
        ] });
    }
  }
}

// ---------- INVASIONI ----------
function controllaInvasioni(annoPrec){
  for (const inv of D().INVASIONI){
    if (st.invasioniFatte.includes(inv.nome)) continue;
    if (inv.anno > annoPrec && inv.anno <= st.anno){
      st.invasioniFatte.push(inv.nome);
      // Vespri: distruggi gli Angioini prima degli Aragonesi
      if (inv.nome==="Aragonesi"){
        const ang = st.invasori.find(x=>x.nome==="Angioini");
        if (ang){
          st.unita = st.unita.filter(u=>u.fazione!==ang.id);
          for (const c of st.comuni) if (c.fazione===ang.id) c.fazione = -1;
          aggiungiLog("🔥 VESPRI SICILIANI! Al suono dei vespri, il popolo insorge: gli Angioini sono massacrati in tutta l'isola!", "era");
          st.pending.push({ titolo:"🔥 I Vespri Siciliani", img:"ev_vespri", vox:"nar_vespri", testo:"Palermo, lunedì di Pasqua 1282. Un soldato francese insulta una sposa: la folla lo uccide. In poche ore l'isola intera insorge al grido di «Antudo!» — gli Angioini sono cacciati per sempre.\n\nMa dal mare arriva Pietro d'Aragona...", scelte:[{label:"Antudo!", eff:"nulla"}] });
        }
      }
      const fid = 100 + st.invasori.length;
      st.invasori.push({ id:fid, nome:inv.nome, colore:inv.colore });
      const cm = st.comuni.find(c=>c.nome===inv.sbarco);
      const linea = D().LINEA_ERA[st.era];
      // invasioni più rare e più deboli: meno unità e con meno vigore (hp ridotti)
      const kInv = st.difficolta==="facile" ? 0.4 : (st.difficolta==="difficile" ? 0.75 : 0.55);
      const nInv = Math.max(2, Math.round(inv.n * kInv));
      // mobilitazione: chi subisce lo sbarco riceve difensori NELLA CITTA' COLPITA (non nella
      // capitale, che puo' essere altrove) e in numero pari agli sbarcati: da quando si parte
      // con il solo esploratore, due difensori non bastavano e gli Ateniesi al turno 23
      // cancellavano dalla storia chi aveva ancora una citta' sola
      if (cm.fazione>=0 && cm.fazione<100){
        const dif = st.fazioni[cm.fazione];
        const hexDif = cm.fondata ? cm.hex : st.comuni[dif.capitale].hex;
        for (let k=0;k<nInv;k++) creaUnita(linea[k%2], dif.id, hexDif);
        aggiungiLog(dif.nome+" chiama il popolo alle armi contro gli "+inv.nome+"!", "info");
      }
      const liberi = [cm.hex, ...MAP.vicini(cm.hex), ...MAP.vicini(cm.hex).flatMap(i=>MAP.vicini(i))]
        .filter((v,i,a)=>a.indexOf(v)===i)
        .filter(i=>unitaSuHex(i).length<3 && MAP.hexes[i] && !MAP.hexes[i].mare && !MAP.hexes[i].lago);
      for (let k=0;k<nInv;k++){
        const tipo = linea[k%3];
        const u = creaUnita(tipo, fid, liberi[k%liberi.length]);
        u.hp = 72; // sbarcati provati dalla traversata
      }
      aggiungiLog("🚨 "+inv.titolo+"!", "era");
      spara("invasione", { luogo: inv.sbarco });
      st.pending.push({ titolo:"🚨 "+inv.titolo, testo:inv.testo, invasore:fid, img:"ev_sbarco", vox:"nar_sbarco",
        scelte:[ {label:"Resisteremo!", desc:"Che vengano: la Sicilia non si piega", eff:"nulla"},
                 {label:"Paga un tributo ("+(40+st.era*25)+" oro)", desc:"Gli invasori ignoreranno le tue terre per 25 turni", eff:"tributo", costoOro:40+st.era*25} ] });
      // le IA decidono da sole
      for (const f of st.fazioni){
        if (!f.ai || f.eliminata) continue;
        if (f.oro > 150 && rnd()<0.4){ f.oro -= 40+st.era*25; f.accordi["inv"+fid] = 25; }
      }
    }
  }
}

// ---------- EVENTI ----------
function controllaEventiStorici(annoPrec){
  for (const ev of D().EVENTI_STORICI){
    if (st.eventiFatti.includes(ev.id)) continue;
    if (ev.anno > annoPrec && ev.anno <= st.anno){
      st.eventiFatti.push(ev.id);
      let target = st.giocatore;
      if (ev.per){
        const cm = st.comuni.find(c=>c.nome===ev.per);
        if (cm.fazione>=0 && cm.fazione<100) target = cm.fazione; else continue;
      }
      if (target === st.giocatore){
        st.pending.push({ titolo:ev.titolo, testo:ev.testo, scelte:ev.scelte, storico:ev.id, vox:"nar_"+ev.id });
      } else {
        applicaEffetto(ev.scelte[0].eff, target);
        aggiungiLog("📯 "+ev.titolo+" — presso "+st.fazioni[target].nome+".", "info");
      }
    }
  }
  // disastri scriptati
  disastro(annoPrec, 1169, "Terremoto di Catania", "La terra trema sotto l'Etna: Catania è in ginocchio.", 15.09, 37.50, 20);
  disastro(annoPrec, 1669, "La Grande Eruzione", "L'Etna esplode: la colata più imponente della storia scende fino al mare, seppellendo campagne e borghi. Catania trattiene il fiato dietro le mura.", 15.00, 37.70, 16, "ev_eruzione");
  if (annoPrec < 1693 && st.anno >= 1693){
    aggiungiLog("💥 IL GRANDE TERREMOTO DEL VAL DI NOTO! La Sicilia orientale crolla.", "era");
    for (const cm of st.comuni){
      if (["SR","RG"].includes(cm.prov) || (cm.prov==="CT" && window.DATA_COMUNI[cm.id][1] < 37.5)){
        cm.pop = Math.max(1, cm.pop-2);
        cm.barocca = true;
        if (cm.edifici.length && rnd()<0.5) cm.edifici.splice(Math.floor(rnd()*cm.edifici.length),1);
      }
    }
    st.pending.push({ titolo:"💥 Il Terremoto del 1693", vox:"nar_terremoto", testo:"L'11 gennaio 1693 la terra si squarcia: il Val di Noto è raso al suolo, sessantamila morti. Ma dalle macerie nascerà il barocco più bello del mondo — le città colpite si ricostruiranno più splendide di prima (+4 cultura permanente).", scelte:[{label:"Ricostruiremo", eff:"nulla"}] });
  }
  // peste 1347
  if (annoPrec < 1347 && st.anno >= 1347 && !st.peste){
    const me = st.comuni.find(c=>c.nome==="Messina");
    st.peste = { infetti:[me.id], turni: 12 };
    spara("peste", {});
    aggiungiLog("☠️ LA PESTE NERA sbarca a Messina con le galee genovesi!", "era");
    st.pending.push({ titolo:"☠️ La Peste Nera", img:"ev_peste", vox:"nar_peste", testo:"Ottobre 1347: dodici galee genovesi attraccano a Messina. Sulle navi, marinai con strani bubboni neri. In poche settimane la città muore — e da qui la peste conquisterà tutta Europa.\n\nCome rispondi?",
      scelte:[ {label:"Quarantena", desc:"-50% oro per 10 turni, la peste si diffonde più lentamente", eff:"quarantena"},
               {label:"Il commercio non si ferma", desc:"Tutto l'oro, ma la peste correrà veloce", eff:"nulla"} ] });
  }
}
function disastro(annoPrec, anno, titolo, testo, lon, lat, raggio, img){
  if (annoPrec < anno && st.anno >= anno){
    aggiungiLog("💥 "+titolo+"!", "era");
    const p = { x:(lon-12.30)*88.5, y:(38.40-lat)*111 };
    if (window.FX && img==="ev_eruzione") for (const h of MAP.terre) if (h.terra==="volcano") FX.lava(h.x, h.y);
    for (const cm of st.comuni){
      const h = MAP.hexes[cm.hex];
      if (Math.hypot(h.x-p.x, h.y-p.y) < raggio){
        cm.pop = Math.max(1, cm.pop-1);
        cm.unrest = Math.min(12, cm.unrest+2);
        if (img==="ev_eruzione") cm.eruzioneMalus = 8; // cenere e lava: rese ridotte, si riprendono nei turni
      }
    }
    for (const h of MAP.terre){
      if (Math.hypot(h.x-p.x, h.y-p.y) < raggio && h.imp && rnd()<0.4) h.imp = null;
    }
    st.pending.push({ titolo:"💥 "+titolo, testo, img, scelte:[{label:"Che il cielo ci aiuti", eff:"nulla"}] });
  }
}
function passoPeste(){
  if (!st.peste) return;
  st.peste.turni--;
  const lenta = st.effettiTemp["quarantena"] > 0;
  // diffusione
  if (rnd() < (lenta?0.35:0.7)){
    const nuovi = [];
    for (const id of st.peste.infetti){
      const cm = st.comuni[id];
      for (const h of MAP.terre){
        if (h.citta!==id) continue;
        for (const nb of MAP.vicini(h.i)){
          const altro = MAP.hexes[nb].comune;
          if (altro!==id && !st.peste.infetti.includes(altro) && !nuovi.includes(altro) && rnd()<0.15)
            nuovi.push(altro);
        }
      }
    }
    st.peste.infetti.push(...nuovi.slice(0,3));
  }
  for (const id of st.peste.infetti){
    const cm = st.comuni[id];
    if (rnd()<0.4 && cm.pop>1) cm.pop--;
  }
  if (st.peste.turni<=0){
    st.peste = null;
    aggiungiLog("🕊️ La peste si spegne. I sopravvissuti riprendono a vivere.", "bene");
  }
}
function eventiCasuali(){
  for (const ev of D().EVENTI_CASUALI){
    if (rnd() > ev.p) continue;
    const gioc = st.giocatore;
    const mieCitta = st.comuni.filter(c=>c.fazione===gioc);
    if (!mieCitta.length) return;
    if (ev.id==="buon_raccolto"){ for (const c of mieCitta) c.cibo+=8; }
    if (ev.id==="fiera"){ st.fazioni[gioc].oro += 30+st.era*15; }
    if (ev.id==="siccita"){ for (const c of mieCitta) c.cibo-=6; }
    // i briganti non spawnano più milizie dal nulla: derubano semplicemente le trazzere (meno oro)
    if (ev.id==="briganti") st.fazioni[gioc].oro = Math.max(0, st.fazioni[gioc].oro - (15+st.era*5));
    if (ev.id==="eruzione_min"){
      if (window.FX) for (const h of MAP.terre) if (h.terra==="volcano") FX.lava(h.x, h.y);
      for (const h of MAP.terre){
        if (h.etna && h.imp && rnd()<0.3) h.imp=null;
      }
      const vicine = st.comuni.filter(c=>MAP.hexes[c.hex].etna);
      for (const c of vicine){ if (rnd()<0.4 && c.pop>1){ c.pop--; c.unrest=Math.min(12,c.unrest+2); } c.eruzioneMalus = 5; }
    }
    if (ev.id==="terremoto_min"){
      const cm = scegli(st.comuni.filter(c=>["mountain","hill"].includes(MAP.hexes[c.hex].terra)));
      if (cm){ cm.pop=Math.max(1,cm.pop-1); cm.unrest=Math.min(12,cm.unrest+2); }
    }
    st.pending.push({ titolo:(ev.tipo==="buono"?"🌞 ":"⚠️ ")+ev.titolo, testo:ev.testo,
      img: ev.id==="eruzione_min"?"ev_eruzione":null,
      scelte:[{label:"Così va il mondo", eff:"nulla"}] });
    return; // max uno per turno
  }
  // dilemmi con scelta: circa uno ogni 5 turni, mai due di seguito troppo vicini
  const daUltimo = st.turno - (st.ultimoDilemma||0);
  if (daUltimo >= 3 && rnd() < 0.18 + Math.max(0, daUltimo-3)*0.08 && st.comuni.some(c=>c.fazione===st.giocatore)){
    const recenti = st.dilemmiFatti || (st.dilemmiFatti = []);
    const pool = D().DILEMMI.filter(d => !recenti.slice(-6).includes(d.id));
    const d = scegli(pool.length ? pool : D().DILEMMI);
    recenti.push(d.id);
    st.ultimoDilemma = st.turno;
    st.pending.push({ titolo:"⚖️ "+d.titolo, testo:d.testo, vox:"nar_dil_"+d.id, scelte:d.scelte.map(s => ({ ...s })) });
  }
}

// ---------- STATISTICHE, OBIETTIVI D'ERA, PUNTEGGIO ----------
function stat(){ return st.stat || (st.stat = { vinte:0, conquiste:0, migliorie:0, invasoriCitta:0, invasoriRespinti:0, obiettivi:[] }); }
function valoreCheck(check, fid){
  const [k, v] = check.split(":");
  const f = st.fazioni[fid];
  const mie = st.comuni.filter(c=>c.fazione===fid);
  switch(k){
    case "citta": return mie.length >= +v;
    case "tech": return f.techs.length >= +v;
    case "migliorie": return stat().migliorie >= +v;
    case "vinte": return stat().vinte >= +v;
    case "invasoriCitta": return stat().invasoriCitta >= +v;
    case "edificio": return mie.some(c => v.split(",").some(e => c.edifici.includes(e)));
    case "meraviglie": return Object.keys(st.meraviglie).filter(m => st.comuni[st.meraviglie[m]] && st.comuni[st.meraviglie[m]].fazione===fid).length >= +v;
    case "dop": return dopControllati(fid).length >= +v;
    case "patti": return Object.values(f.diplo).filter(d=>d.stato==="patto").length >= +v;
  }
  return false;
}
function obiettiviEra(era){ return D().OBIETTIVI.filter(o => o.era === era); }
function statoObiettivi(fid){
  const fatti = stat().obiettivi;
  return D().OBIETTIVI.filter(o => o.era <= st.era).map(o => ({ ...o, fatto: fatti.includes(o.id), attuale: o.era===st.era }));
}
function premioObiettivo(era){ return { oro: 60 + era*40, cultura: 30 + era*10 }; }
function controllaObiettivi(){
  const fid = st.giocatore, s = stat();
  for (const o of obiettiviEra(st.era)){
    if (s.obiettivi.includes(o.id) || !valoreCheck(o.check, fid)) continue;
    s.obiettivi.push(o.id);
    const p = premioObiettivo(st.era);
    st.fazioni[fid].oro += p.oro; st.fazioni[fid].cultura += p.cultura;
    aggiungiLog("🎯 Obiettivo raggiunto: "+o.testo+" (+"+p.oro+" oro, +"+p.cultura+" cultura)", "bene");
    const restanti = obiettiviEra(st.era).filter(x => !s.obiettivi.includes(x.id));
    st.pending.push({ titolo:"🎯 Obiettivo raggiunto", testo:o.testo+"\n\nPremio: +"+p.oro+" oro, +"+p.cultura+" cultura, +25 punti."+(restanti.length?"\n\nRestano per quest'era:\n• "+restanti.map(x=>x.testo).join("\n• "):"\n\nTutti gli obiettivi dell'era sono compiuti: +50 punti bonus!"),
      scelte:[{label:"Avanti così", eff:"nulla"}] });
    if (!restanti.length) s.bonusEra = (s.bonusEra||0) + 1;
  }
}
function punteggio(fid){
  const s = stat();
  const mie = st.comuni.filter(c=>c.fazione===fid).length;
  const mer = Object.keys(st.meraviglie).filter(m => st.comuni[st.meraviglie[m]] && st.comuni[st.meraviglie[m]].fazione===fid).length;
  const f = st.fazioni[fid];
  const ob = fid===st.giocatore ? s.obiettivi.length*25 + (s.bonusEra||0)*50 : 0;
  return { totale: mie*10 + mer*15 + f.techs.length*2 + ob + (fid===st.giocatore ? s.vinte*3 + s.invasoriRespinti*40 : 0),
           citta:mie, meraviglie:mer, techs:f.techs.length, obiettivi: fid===st.giocatore ? s.obiettivi.length : 0 };
}
// 3 carte di costruzione sensate per una città (al posto della lista lunga)
function carteCostruzione(cm){
  const out = [];
  const push = (it) => { if (it && !out.some(x=>x.tipo===it.tipo && x.id===it.id)) out.push(it); };
  push(miglioreCostruzione(cm));
  const cost = costruzioniDisponibili(cm);
  push(cost.find(x=>x.tipo==="meraviglia"));
  const u = unitaDisponibili(cm).filter(x=>!D().UNITA[x.id].supporto && !x.pieno).sort((a,b)=>(b.atk+b.def)-(a.atk+a.def))[0];
  if (u) push({ tipo:"unita", id:u.id, nome:u.nome, costo:u.costo, icona:"⚔️", eff:"⚔"+u.atk+" 🛡"+u.def });
  for (const c of cost){ if (out.length>=3) break; push(c); }
  const lav = unitaDisponibili(cm).find(x=>x.id==="lavoratore" && !x.pieno);
  if (out.length<3 && lav) push({ tipo:"unita", id:"lavoratore", nome:lav.nome, costo:lav.costo, icona:"🔨", eff:"migliora le campagne" });
  return out.slice(0,3);
}

// ---------- EFFETTI SCELTE EVENTI ----------
function applicaScelta(evento, idx){
  const scelta = evento.scelte[idx];
  if (scelta.costoOro){
    const f = st.fazioni[st.giocatore];
    if (f.oro < scelta.costoOro) return false;
    f.oro -= scelta.costoOro;
  }
  applicaEffetto(scelta.eff, st.giocatore, evento);
  if (evento.storico) provaSbloccoGuardaroba("evento", 0.35);
  return true;
}
function applicaEffetto(eff, fid, evento){
  const f = st.fazioni[fid];
  switch(eff){
    case "nulla": break;
    case "nulla_cult": f.cultura += 20; break;
    case "terrore": st.effettiTemp["terrore_"+fid] = 20; break;
    case "pieta": f.cultura += 30; break;
    case "scritti": f.sciAcc += 80; break;
    case "eroe_arch": if (!f.eroeVivo){ f.eroeVivo=true; creaUnita("eroe", fid, st.comuni[f.capitale].hex, "L'Erede di Archimede"); } break;
    case "corte": f.oro += 60; f.cultura += 30; break;
    case "tassa_corte": { f.oro += 100; const sr = st.comuni.find(c=>c.nome==="Siracusa"); if (sr) sr.unrest=Math.min(12,sr.unrest+2); } break;
    case "assolda_maniace": if (!f.eroeVivo){ f.eroeVivo=true; creaUnita("eroe", fid, st.comuni[f.capitale].hex, "Giorgio Maniace"); } break;
    case "corte_ruggero": f.cultura += 50; f.sciAcc += 30; st.effettiTemp["terrore_"+fid] = 15; break;
    case "regno_forte": f.oro += 80; creaUnita("cav_norm", fid, st.comuni[f.capitale].hex); break;
    case "poeti": f.cultura += 60; break;
    case "dotti": f.sciAcc += 40; f.oro += 20; break;
    case "quadro": f.cultura += 70; break;
    case "quarantena": st.effettiTemp["quarantena"] = 10; break;
    case "tributo": if (evento && evento.invasore!==undefined) f.accordi["inv"+evento.invasore] = 25; break;
    case "upgrade_tutte": {
      const n = upgradaEconomiche(fid);
      aggiungiLog(n>0 ? "⚔️ "+n+(n===1?" truppa aggiornata":" truppe aggiornate")+" alle armi della nuova era." : "⚔️ Non ci sono ancora abbastanza fondi per aggiornare le truppe.", n>0?"bene":"info");
      break;
    }
    case "upgrade_migliorie": {
      const n = upgradaMiglliorieEconomiche(fid);
      aggiungiLog(n>0 ? "🏭 "+n+(n===1?" miglioria ammodernata":" migliorie ammodernate")+" alla nuova era." : "🏭 Non ci sono ancora abbastanza fondi per ammodernare le migliorie.", n>0?"bene":"info");
      break;
    }
    default:
      if (eff && eff.indexOf("fx:")===0){
        // mini-linguaggio dei dilemmi: fx:oro:80;unrest:1;cibo:12;cult:30;sci:90;unita:linea0;popcap:1
        const mie = st.comuni.filter(c=>c.fazione===fid);
        for (const op of eff.slice(3).split(";")){
          const [k, v] = op.split(":"); const n = parseFloat(v);
          if (k==="oro") f.oro += n;
          else if (k==="cult") f.cultura += n;
          else if (k==="sci") f.sciAcc += n;
          else if (k==="cibo") for (const c of mie) c.cibo += n;
          else if (k==="unrest") for (const c of mie){ c.unrestExtra = (c.unrestExtra||0) + n; }
          else if (k==="popcap"){ const cap = st.comuni[f.capitale]; if (cap) cap.pop = Math.min(25, cap.pop + n); }
          else if (k==="unita"){ const tipo = v==="linea0" ? D().LINEA_ERA[st.era][0] : v; creaUnita(tipo, fid, st.comuni[f.capitale].hex); }
        }
        break;
      }
      if (eff && eff.indexOf("coda:")===0){
        // carta di costruzione scelta: coda:<cmId>:<tipo>:<id>
        const p = eff.split(":"); const cm = st.comuni[parseInt(p[1])];
        if (cm && cm.fazione===fid){
          let item = null;
          if (p[2]==="unita"){ const u = unitaDisponibili(cm).find(x=>x.id===p[3]); if (u) item = { tipo:"unita", id:u.id, costo:u.costo }; }
          else item = costruzioniDisponibili(cm).find(x=>x.tipo===p[2] && x.id===p[3]);
          if (item) accoda(cm.id, item);
        }
        break;
      }
      if (eff && eff.indexOf("dip:")===0){
        const p = eff.split(":");
        const tipo = p[1], da = parseInt(p[2]);
        const fa = st.fazioni[da], fb = st.fazioni[st.giocatore];
        if (tipo==="pace"){
          fa.diplo[fb.id].stato="pace"; fb.diplo[da].stato="pace";
          aggiungiLog("🕊️ Pace tra "+fa.nome+" e "+fb.nome+".", "bene");
        }
        if (tipo==="patto"){
          fa.diplo[fb.id].stato="patto"; fb.diplo[da].stato="patto";
          fa.diplo[fb.id].turniPatto=25; fb.diplo[da].turniPatto=25;
          aggiungiLog("🤝 Patto di non aggressione con "+fa.nome+".", "bene");
        }
        if (tipo==="commercio"){
          fa.diplo[fb.id].commercio=20; fb.diplo[da].commercio=20;
          aggiungiLog("💰 Accordo commerciale con "+fa.nome+".", "bene");
        }
      }
      break;
  }
}

// ---------- FINE TURNO ----------
function fineTurno(){
  if (st.vittoria && !st.continua) return;
  const annoPrec = st.anno;
  cucinaReset(); techBonusReset();
  // IA giocano (registra gli scontri che toccano il giocatore)
  st.eventiTurno = [];
  st._aiTurn = true;
  AI.turnoIA();
  AI.turnoInvasori();
  AI.turnoRibelli();
  st._aiTurn = false;
  // mondo
  for (const f of st.fazioni){
    if (f.eliminata) continue;
    const r = reseFazione(f.id);
    f.oro += r.oro;
    f.cultura += r.cultura;
    passoRicerca(f, r.scienza);
    passoDinastia(f);
    if (f.oro < -20){
      // ammutinamento
      const mie = st.unita.filter(u=>u.fazione===f.id && u.tipo!=="eroe");
      if (mie.length){ const u = scegli(mie); st.unita = st.unita.filter(x=>x.id!==u.id);
        if (f.id===st.giocatore) aggiungiLog("💸 Casse vuote: "+D().UNITA[u.tipo].nome+" disertano!", "male"); }
      f.oro = -10;
    }
    // patti scadono
    for (const k of Object.keys(f.diplo)){
      const d = f.diplo[k];
      if (d.stato==="patto" && --d.turniPatto<=0) d.stato="pace";
      if (d.stato==="guerra") d.turniGuerra++;
      if (d.commercio>0) d.commercio--;
      // Il rancore si riassorbe, ma PIANO. Con +0,5 a turno il risentimento di confine
      // (-1 ogni sette turni circa) veniva cancellato tre volte piu' in fretta di quanto
      // nascesse: l'atteggiamento restava inchiodato a zero e nessuna IA arrivava mai alla
      // soglia di guerra. Insieme al bug del NaN, questo teneva l'isola in pace per sempre.
      d.atteggiamento += d.atteggiamento<0 ? 0.10 : (d.atteggiamento>0 ? -0.20 : 0);
      // e non si diventa amici per sempre: patti e accordi commerciali sommavano +15 e +8
      // ogni volta, e dopo cento turni tutti si volevano bene a +36. La simpatia va rinnovata.
      d.atteggiamento = Math.max(-60, Math.min(25, d.atteggiamento));
    }
    for (const k of Object.keys(f.accordi)) if (f.accordi[k]>0) f.accordi[k]--;
  }
  for (const cm of st.comuni) aggiornaComune(cm);
  // mura si riparano
  for (const cm of st.comuni)
    if (cm.mura>0 && cm.muraHP < cm.mura*100 && cm.fazione!==-1)
      cm.muraHP = Math.min(cm.mura*100, cm.muraHP+15);
  // guarigione: in città, fortificate, o ferme nel proprio territorio
  for (const u of st.unita){
    if (u.hp>=100) continue;
    const h = MAP.hexes[u.hex];
    const cm = st.comuni[h.comune];
    const inCitta = cm.hex===u.hex && cm.fazione===u.fazione;
    const territorioMio = cm.fazione===u.fazione;
    let cura = 0;
    if (inCitta) cura = 15;
    else if (u.fortificata && territorioMio) cura = 15;
    else if (u.fortificata) cura = 8;
    else if (territorioMio && !u.camminato) cura = 6;
    // medico da campo adiacente
    const vic = [u.hex, ...MAP.vicini(u.hex)];
    if (st.unita.some(e=>e.tipo==="medico" && e.fazione===u.fazione && vic.includes(e.hex))) cura += 10;
    if (cura) u.hp = Math.min(100, u.hp+cura);
  }
  // effetti temporanei
  for (const k of Object.keys(st.effettiTemp))
    if (--st.effettiTemp[k] <= 0) delete st.effettiTemp[k];
  // sagre in corso
  if (st.sagreAttive && st.sagreAttive.length){
    for (const s of st.sagreAttive) s.turni--;
    st.sagreAttive = st.sagreAttive.filter(s=>s.turni>0);
    cucinaReset();
  }
  // tempo
  st.anno += anniPerTurno();
  st.turno++;
  controllaEra();
  controllaInvasioni(annoPrec);
  controllaEventiStorici(annoPrec);
  passoPeste();
  eventiCasuali();
  controllaObiettivi();
  // ricarica dei poteri del sovrano
  if (st.poteri && st.poteri.cooldown)
    for (const k in st.poteri.cooldown) if (st.poteri.cooldown[k]>0) st.poteri.cooldown[k]--;
  // reset movimento. Le unità fortificate hanno comunque movimento (basta selezionarle per svegliarle),
  // ma non compaiono tra quelle "da gestire".
  for (const u of st.unita){
    u.camminato = false; u.mov = statU(u.tipo).mov;
    if (u.congelato>0){ u.congelato--; u.mov = Math.floor(u.mov/2); }  // scongelamento graduale
  }
  // Viaggi automatici: di TUTTE le fazioni, non solo del giocatore. Le marce impostate
  // dall'IA (impostaGoto) non venivano mai eseguite: i coloni restavano fermi in capitale
  // con la destinazione gia' impostata, e tre fazioni su sei non fondavano mai una seconda citta'.
  for (const f of st.fazioni) if (!f.eliminata) processaGoto(f.id);
  turnoCovi();
  turnoFedelta();
  turnoGrandi();
  serviziReset();
  controllaIntuizioni();
  calcolaVisibilita();
  // eliminazioni e vittoria
  for (const f of st.fazioni) controllaEliminazione(f.id);
  controllaVittoria();
  // fine della storia
  if (st.anno >= 1700 && !st.vittoria && !st.eventiFatti.includes("fine1700")){
    st.eventiFatti.push("fine1700");
    const classifica = st.fazioni.filter(f=>!f.eliminata)
      .map(f=>({f, p:punteggio(f.id)}))
      .sort((a,b)=>b.p.totale-a.p.totale);
    const righe = classifica.map((x,i)=>(i+1)+". "+x.f.nome+" — "+x.p.totale+" punti ("+x.p.citta+" città, "+x.p.meraviglie+" meraviglie"+(x.f.id===st.giocatore?", "+x.p.obiettivi+" obiettivi":"")+")").join("\n");
    const pos = classifica.findIndex(x=>x.f.id===st.giocatore)+1;
    st.pending.push({ titolo:"⏳ L'Anno 1700", testo:"Le ere si sono compiute. La Sicilia entra nell'età moderna.\n\nClassifica finale:\n"+righe+"\n\n"+(pos===1?"👑 Sei il sovrano più glorioso dell'isola!":"Sei arrivato "+pos+"°: la storia ricorderà chi ha fatto di più.")+"\n\nPuoi continuare a giocare fino alla conquista totale.", scelte:[{label:"Continua a giocare", eff:"nulla"}] });
  }
  SAVE.autosalva();
}

// ---------- CONSIGLIERE: motore dei suggerimenti (Don Calorio) ----------
// Ritorna una lista di consigli {id, tipo, testo, prio, hex} ordinati per priorità.
function suggerimenti(fid){
  const f = st.fazioni[fid];
  if (!f || f.eliminata) return [];
  const out = [];
  const mieCitta = st.comuni.filter(c=>c.fazione===fid);
  // crisi: malcontento alto
  for (const cm of mieCitta){
    if (cm.unrest >= 7){
      out.push({ id:"unrest_"+cm.id, tipo:"crisi", prio:9, hex:cm.hex,
        testo:"A "+cm.nome+" u populu murmurìa forti ("+cm.unrest+"/12). Ci vô 'n tempiu o 'na cattedrali, prima ca scoppia 'na rivolta." });
    }
  }
  // crisi: peste vicina
  if (st.peste){
    for (const cm of mieCitta){
      if (st.peste.infetti.includes(cm.id)){
        out.push({ id:"peste_"+cm.id, tipo:"crisi", prio:10, hex:cm.hex,
          testo:"A "+cm.nome+" a pesti fa strage, Maestà. Prega e teni luntanu 'a genti." });
      } else {
        for (const nb of MAP.vicini(cm.hex))
          if (st.peste.infetti.includes(MAP.hexes[nb].comune)){
            out.push({ id:"pestevic_"+cm.id, tipo:"crisi", prio:8, hex:cm.hex,
              testo:"A pesti s'avvicina a "+cm.nome+". Chiudi i porti o priparati ê chianti." });
            break;
          }
      }
    }
  }
  // militare: nemico vicino a una città
  for (const cm of mieCitta){
    let nemicoVicino = null;
    for (const u of st.unita){
      if (u.fazione===fid || u.fazione===-1) continue;
      if (u.fazione>=0 && u.fazione<100 && f.diplo[u.fazione] && f.diplo[u.fazione].stato!=="guerra") continue;
      if (MAP.distKm(u.hex, cm.hex) < 14){ nemicoVicino = u; break; }
    }
    if (nemicoVicino){
      out.push({ id:"nemico_"+cm.id, tipo:"militare", prio:9, hex:cm.hex,
        testo:"Attentu Maestà: un esercitu forestieru gira vicinu a "+cm.nome+". Prepara i picciotti e rinforza i mura." });
    }
  }
  // ricerca: nessuna in corso
  if (!f.ricerca && techDisponibili(fid).length){
    out.push({ id:"ricerca", tipo:"ricerca", prio:6,
      testo:"Nuddu studia nenti alla to corti. Un populu senza sapiri resta arreri: scigliti 'na ricerca." });
  }
  // militare: truppe ferme
  const ferme = unitaFerme(fid);
  if (ferme.length){
    out.push({ id:"ferme", tipo:"militare", prio:5, hex:MAP.hexes[ferme[0].hex]?ferme[0].hex:undefined,
      testo:"Ci sunnu "+ferme.length+" truppi ca s'annacanu senza fari nenti. Mannamuli a cummattiri o a difenniri?" });
  }
  // economia: città senza produzione
  for (const cm of mieCitta){
    if (!cm.coda.length){
      out.push({ id:"cittaferma_"+cm.id, tipo:"economia", prio:4, hex:cm.hex,
        testo:cm.nome+" nun sta custruennu nenti. Manu ca fannu nenti, panza ca s'assicca: dacci 'n travagghiu." });
      break; // una alla volta
    }
  }
  // economia: oro accumulato, suggerisci una meraviglia/edificio
  if (f.oro > 250){
    for (const cm of mieCitta){
      const cost = costruzioniDisponibili(cm);
      const mer = cost.find(x=>x.tipo==="meraviglia");
      if (mer){
        out.push({ id:"meraviglia_"+cm.id, tipo:"economia", prio:5, hex:cm.hex,
          testo:"Aviemu oru assai n cascia. Chi ni dici di 'na gran opira a "+cm.nome+"? "+mer.nome+" ni farà ricurdari p'a storia." });
        break;
      }
    }
  }
  out.sort((a,b)=>b.prio-a.prio);
  return out;
}

// ---------- CONSIGLIERE AZIONABILE (Accetta / Rifiuta / Più tardi) ----------
function cittaDaGestire(fid){ return st.comuni.filter(c=>c.fazione===fid && !c.coda.length); }

function miglioreTech(fid){
  const disp = techDisponibili(fid);
  if (!disp.length) return null;
  const conSblocco = disp.filter(t=>sbloccatiDaTech(t.id));
  const pool = conSblocco.length ? conSblocco : disp;
  return pool.sort((a,b)=>a.costo-b.costo)[0];
}
function miglioreCostruzione(cm){
  const f = st.fazioni[cm.fazione];
  const cost = costruzioniDisponibili(cm);
  const prio = ["granaio","mercato","caserma","mura1","tempio","porto","accademia","scuderia","arsenale","teatro","banco","castello","cattedrale","casascienza"];
  for (const id of prio){ const c = cost.find(x=>x.id===id); if (c) return c; }
  const mer = cost.find(x=>x.tipo==="meraviglia"); if (mer && f.oro>150) return mer;
  const u = unitaDisponibili(cm).filter(x=>!D().UNITA[x.id].supporto && !x.pieno).sort((a,b)=>(b.atk+b.def)-(a.atk+a.def))[0];
  if (u) return { tipo:"unita", id:u.id, nome:u.nome, costo:u.costo };
  return cost[0] || null;
}
// lista di proposte concrete ordinate per priorità (solo cose che servono davvero)
function propostaConsigliere(fid){
  const f = st.fazioni[fid]; if (!f || f.eliminata) return [];
  const mieCitta = st.comuni.filter(c=>c.fazione===fid);
  const out = [];
  // 1. crisi: malcontento alto
  for (const cm of mieCitta){
    if (cm.unrest < 7) continue;
    const fp = D().SAGRE.find(s=>s.id==="festa_patrono");
    const giaFesta = (st.sagreAttive||[]).some(s=>s.fid===fid && s.id==="festa_patrono");
    if (f.oro>=fp.costo && !giaFesta)
      out.push({ id:"crisi_sagra_"+cm.id, prio:10, hex:cm.hex,
        testo:"A "+cm.nome+" u populu murmurìa forti. Facemu 'na Festa dû Patruni p'arriminari l'animi?",
        azione:{ tipo:"sagra", id:"festa_patrono" } });
    else {
      const item = costruzioniDisponibili(cm).find(x=>x.id==="tempio"||x.id==="cattedrale");
      if (item) out.push({ id:"crisi_tempio_"+cm.id, prio:9, hex:cm.hex,
        testo:"A "+cm.nome+" ci vô 'n "+item.nome+" p'a calmari 'a genti. U custruimu?",
        azione:{ tipo:"costruisci", cmId:cm.id, item } });
    }
  }
  // 2. difesa: nemico vicino a una città
  for (const cm of mieCitta){
    let nemico = null;
    for (const u of st.unita){
      if (u.fazione===fid || u.fazione===-1) continue;
      if (u.fazione>=0 && u.fazione<100 && f.diplo[u.fazione] && f.diplo[u.fazione].stato!=="guerra") continue;
      if (MAP.distKm(u.hex, cm.hex) < 13){ nemico=u; break; }
    }
    if (!nemico) continue;
    const ferme = unitaFerme(fid).filter(x=>x.hex!==cm.hex && MAP.distKm(x.hex,cm.hex)<70)
      .sort((a,b)=>MAP.distKm(a.hex,cm.hex)-MAP.distKm(b.hex,cm.hex));
    if (ferme.length)
      out.push({ id:"difesa_inv_"+cm.id, prio:9, hex:cm.hex,
        testo:"Un esercitu nemicu s'avvicina a "+cm.nome+"! Mannamu i truppi a difenniri?",
        azione:{ tipo:"invia", uid:ferme[0].id, hex:cm.hex } });
    else {
      const item = unitaDisponibili(cm).filter(x=>!D().UNITA[x.id].supporto).sort((a,b)=>(b.atk+b.def)-(a.atk+a.def))[0];
      if (item) out.push({ id:"difesa_rec_"+cm.id, prio:8, hex:cm.hex,
        testo:cm.nome+" è in pericolu e senza difisa. Arrolamu subitu "+item.nome+"?",
        azione:{ tipo:"costruisci", cmId:cm.id, item:{ tipo:"unita", id:item.id, costo:item.costo } } });
    }
  }
  // 3. nessuna ricerca in corso
  if (!f.ricerca){
    const t = miglioreTech(fid);
    if (t) out.push({ id:"ricerca", prio:7,
      testo:"Nuddu studia nenti alla to corti. Avviamu 'a ricerca «"+t.nome+"»?",
      azione:{ tipo:"ricerca", techId:t.id } });
  }
  // 4. città senza produzione
  for (const cm of mieCitta){
    if (cm.coda.length) continue;
    const item = miglioreCostruzione(cm);
    if (item) out.push({ id:"citta_"+cm.id, prio:5, hex:cm.hex,
      testo:cm.nome+" nun sta facennu nenti. Ci mittemu "+(item.nome||"quarcosa")+"?",
      azione:{ tipo:"costruisci", cmId:cm.id, item } });
  }
  out.sort((a,b)=>b.prio-a.prio);
  return out;
}
// esegue una proposta accettata dal giocatore
function eseguiProposta(a){
  const fid = st.giocatore;
  if (!a) return false;
  if (a.tipo==="ricerca"){ ricerca(fid, a.techId); return true; }
  if (a.tipo==="costruisci"){ return accoda(a.cmId, a.item); }
  if (a.tipo==="sagra"){ return faSagra(fid, a.id); }
  if (a.tipo==="invia"){ return impostaGoto(a.uid, a.hex); }
  if (a.tipo==="migliora"){ return migliora(a.hex, a.imp); }
  return false;
}

return { nuovaPartita, get st(){ return st; }, set st(v){ st = v; },
  reseComune, reseFazione, anniPerTurno, annoStr, aggiungiLog,
  raggioMovimento, muovi, anteprima, attacca, bombarda,
  eNavale, dominioTipo, cittaCostiera, capacitaDi, trasportoLibero, limiteFlotta, flottaFazione,
  alleatiPub: alleati,
  trovaPercorso, impostaGoto, processaGoto, fortifica, svegliaUnita, unitaFerme, suggerimenti,
  cucina, dopControllati, piattiSbloccati, faSagra,
  calcolaVisibilita, hexVisibile, hexEsplorato,
  fondaCitta, puoFondare, fondaComune, comuneCheDaIlNome, fazioneDiHex, territorioDi, espandiTerritorio, cittaDaGestire, propostaConsigliere, eseguiProposta, techBonus, techBonusReset, costoTech, sbloccatiDaTech, miglioreCostruzione,
  costruzioniDisponibili, unitaDisponibili, accoda, compraSubito, migliora,
  quartieriDisponibili, caselleQuartiere, adiacenzaQuartiere, puoQuartiere, quartiereDef, quartieriDi, tettoQuartieri,
  fedeltaDelta, fedeltaMult, pressioniSu, resetIndiceTerritorio, caseComune, serviziComune, statoGrandi,
  compraCasella, puoComprareCasella, costoCasella, resaCasella,
  slotEditti, edittiDisponibili, attivaEditto, revocaEditto, costoCambioEditto, edittiIA,
  techDisponibili, techSbloccateDa, checkIntuizione, ricerca, ETA_INFO, etaMult, liberaCovo, get covi(){ return st ? st.covi : []; }, statU, costoEroe, reclutaEroe, limiteEsercito, limiteLavoratori, truppeFazione, cittaDi,
  unitaAggiornabili, upgradaUnita, upgradaEconomiche,
  miglioramentoAutomatico, azioneLavoratore, esisteMiglioriaPossibile,
  migliorieAggiornabili, upgradaMiglioria, upgradaMiglliorieEconomiche, prossimaMiglioria,
  stat, statoObiettivi, obiettiviEra, punteggio, carteCostruzione,
  accodaRicerca, rimuoviDaPercorso, percorsoRicercaStato, suggerisciPercorso,
  dichiaraGuerra, proponiPace, proponiPatto, proponiCommercio, regalo, forzaTotale,
  poteriStato, poterePronto, usaPotere, rifocilla,
  guardarobaStato, equipaggiaGuardaroba, compraGuardaroba, sbloccaGuardaroba,
  applicaScelta, fineTurno, unitaSuHex, nemiciSuHex, nomeInvasore, catturaComune, creaUnita, colonizza, autoColonizza, autoConquista,
  controllaVittoria };
})();
