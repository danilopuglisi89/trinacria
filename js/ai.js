// TRINACRIA — IA delle fazioni, degli invasori e dei ribelli
window.AI = (function(){
const D = () => GDATA;
function rnd(){ return Math.random(); }
function scegli(a){ return a[Math.floor(rnd()*a.length)]; }

const PRIORITA_EDIFICI = ["granaio","mercato","porto","caserma","tempio","mura1","scuderia","arsenale","accademia","teatro","mura2","castello","cattedrale","banco","casascienza","mura3",
  "silos_grano","cava_marmo","cantiere","fonderia"];

// Fase iniziale protetta: fino a QUESTA era le IA restano quasi ferme a svilupparsi,
// non dichiarano guerra e non aggrediscono gli insediamenti indipendenti (li lasciano al giocatore).
// facile: 2 ere di pace; normale: 1; difficile: le IA si muovono da subito
function protettaFinoEra(){ const d = GAME.st.difficolta; return d==="facile" ? 2 : (d==="difficile" ? 0 : 1); }
function faseProtetta(){ return GAME.st.era <= protettaFinoEra(); }
// aggressività verso il GIOCATORE (proporzionata alla difficoltà): l'IA confinante più forte
// prepara un attacco annunciato (3 turni di "minaccia", Don Calorio avverte) e poi dichiara guerra
const AGGR = {
  facile:    { daEra:3, forza:2.0, p:0.04, coalizione:false },
  normale:   { daEra:2, forza:1.3, p:0.10, coalizione:false },
  difficile: { daEra:1, forza:1.0, p:0.15, coalizione:true }
};
function aggr(){ return AGGR[GAME.st.difficolta] || AGGR.normale; }
function minacciaGiocatore(f){
  const st = GAME.st, g = st.giocatore, d = f.diplo[g];
  if (!d || d.stato!=="pace") return;
  const a = aggr();
  // conto alla rovescia già avviato
  if (d.minaccia > 0){
    d.minaccia--;
    if (d.minaccia===0){
      GAME.dichiaraGuerra(f.id, g);
      st.pending.push({ titolo:"🚨 "+f.nome+" dichiara guerra!", testo:f.leader.nome+" di "+f.nome+" ha rotto la pace: le sue truppe marciano verso i tuoi confini.\n\nDifendi le città di frontiera e prepara i picciotti.", scelte:[{label:"Alle armi!", eff:"nulla"}] });
    }
    return;
  }
  if (st.era < a.daEra || Object.values(f.diplo).some(x=>x.stato==="guerra")) return;
  if (!confinanti(f.id, g)) return;
  const mie = st.comuni.filter(c=>c.fazione===g).length;
  const sue = st.comuni.filter(c=>c.fazione===f.id).length;
  const forte = GAME.forzaTotale(f.id) > GAME.forzaTotale(g)*a.forza || sue > mie*1.5;
  // coalizione (solo difficile): se il giocatore è in testa e qualcuno gli fa già guerra, altri si uniscono
  const inTesta = st.fazioni.every(x => x.id===g || x.eliminata || st.comuni.filter(c=>c.fazione===x.id).length <= mie);
  const coalizione = a.coalizione && inTesta && st.fazioni.some(x => x.id!==g && !x.eliminata && x.diplo[g] && x.diplo[g].stato==="guerra");
  const moltoPiuForte = GAME.forzaTotale(f.id) > GAME.forzaTotale(g)*3;   // preda facile: si muove prima
  if ((forte && rnd() < a.p * (moltoPiuForte ? 2 : 1)) || (coalizione && rnd() < 0.05)){
    d.minaccia = 3;
    GAME.aggiungiLog("⚠️ "+f.nome+" ammassa truppe ai tuoi confini!", "male");
    st.pending.push({ titolo:"⚠️ Voci di guerra", testo:"Le spie riferiscono che "+f.nome+" sta ammassando truppe ai tuoi confini. Hai tre turni per prepararti: rinforza le città di frontiera o cerca un patto.", scelte:[{label:"Prepariamoci", eff:"nulla"}] });
  }
}

function sogliaAttacco(){
  const d = GAME.st.difficolta;
  return d==="facile" ? 0.65 : (d==="difficile" ? 0.45 : 0.55);
}
function bonusOro(){
  const d = GAME.st.difficolta;
  return d==="facile" ? 0 : (d==="difficile" ? 6 : 2);
}

function turnoIA(){
  const st = GAME.st;
  for (const f of st.fazioni){
    if (!f.ai || f.eliminata) continue;
    f.oro += bonusOro();
    f.sciAcc += 1 + st.era; // l'IA tiene il passo con le ere
    diplomaziaIA(f);
    gestioneCittaIA(f);
    if (!f.eroeVivo && f.oro > GAME.costoEroe()+100 && rnd()<0.3) GAME.reclutaEroe(f.id);
    if (f.oro > 160 && rnd()<0.5) miglioriaIA(f);
    muoviUnitaIA(f.id, bersagliFazione(f));
  }
}

function diplomaziaIA(f){
  const st = GAME.st;
  minacciaGiocatore(f);
  const guerraInCorso = Object.values(f.diplo).some(d=>d.stato==="guerra");
  for (const g of st.fazioni){
    if (g.id===f.id || g.eliminata) continue;
    const d = f.diplo[g.id];
    // proponi pace se in difficoltà
    if (d.stato==="guerra" && (GAME.forzaTotale(f.id) < GAME.forzaTotale(g.id)*0.6 || d.turniGuerra>18)){
      if (g.ai){ GAME.proponiPace(f.id, g.id); }
      else if (rnd()<0.4 && !st.pending.some(p=>p.dip)){
        st.pending.push({ dip:true, titolo:"🕊️ Ambasciata da "+f.nome,
          testo: f.leader.nome+" di "+f.nome+" chiede la pace: «Basta sangue tra le nostre genti. La Sicilia è grande abbastanza per entrambi.»",
          scelte:[ {label:"Accetta la pace", eff:"dip:pace:"+f.id},
                   {label:"La guerra continua", eff:"nulla"} ] });
      }
      continue;
    }
    // dichiara guerra? (mai nella fase iniziale protetta: le IA si sviluppano in pace)
    if (!faseProtetta() && d.stato==="pace" && !guerraInCorso && confinanti(f.id, g.id) &&
        GAME.forzaTotale(f.id) > GAME.forzaTotale(g.id)*1.5 &&
        d.atteggiamento < -10 && rnd()<0.04){
      GAME.dichiaraGuerra(f.id, g.id);
      continue;
    }
    // patto / commercio
    if (d.stato==="pace" && d.atteggiamento > 12 && rnd()<0.05){
      if (g.ai) GAME.proponiPatto(f.id, g.id);
      else if (!st.pending.some(p=>p.dip))
        st.pending.push({ dip:true, titolo:"🤝 Proposta di "+f.nome,
          testo: f.nome+" propone un patto di non aggressione (25 turni).",
          scelte:[ {label:"Accetta", eff:"dip:patto:"+f.id}, {label:"Rifiuta", eff:"nulla"} ] });
    }
    if (d.stato!=="guerra" && d.commercio<=0 && d.atteggiamento > 0 && rnd()<0.05){
      if (g.ai) GAME.proponiCommercio(f.id, g.id);
      else if (!st.pending.some(p=>p.dip))
        st.pending.push({ dip:true, titolo:"💰 Mercanti di "+f.nome,
          testo: f.nome+" propone un accordo commerciale: +3 oro/turno per entrambi, per 20 turni.",
          scelte:[ {label:"Accetta", eff:"dip:commercio:"+f.id}, {label:"Rifiuta", eff:"nulla"} ] });
    }
    // rivalità di confine
    if (confinanti(f.id,g.id) && rnd()<0.1) d.atteggiamento -= 1;
  }
}

function confinanti(a, b){
  const st = GAME.st;
  for (const h of MAP.terre){
    if (st.comuni[h.comune].fazione !== a) continue;
    for (const nb of MAP.vicini(h.i))
      if (st.comuni[MAP.hexes[nb].comune].fazione === b) return true;
  }
  return false;
}

function gestioneCittaIA(f){
  const st = GAME.st;
  const mieCitta = st.comuni.filter(c=>c.fazione===f.id);
  const inGuerra = Object.values(f.diplo).some(d=>d.stato==="guerra") ||
                   st.invasori.some(inv => !f.accordi["inv"+inv.id] && st.unita.some(u=>u.fazione===inv.id));
  // eserciti piccoli ma sempre aggiornati: mai più del limite di truppe del regno (uguale al giocatore)
  const limite = GAME.limiteEsercito();
  for (const cm of mieCitta){
    if (cm.coda.length) continue;
    // ogni tanto un colono, per espandersi pacificamente verso gli indipendenti indifesi vicini
    const coloniAttivi = st.unita.filter(u=>u.fazione===f.id && u.tipo==="colono").length;
    if (coloniAttivi < 2 && rnd()<0.15){
      const col = GAME.unitaDisponibili(cm).find(x=>x.id==="colono");
      if (col && GAME.accoda(cm.id, col)) continue;
    }
    // e ogni tanto un lavoratore, economico, per migliorare da sola le campagne vicine
    const lavoratoriAttivi = st.unita.filter(u=>u.fazione===f.id && u.tipo==="lavoratore").length;
    if (lavoratoriAttivi < 3 && rnd()<0.2){
      const lav = GAME.unitaDisponibili(cm).find(x=>x.id==="lavoratore");
      if (lav && GAME.accoda(cm.id, lav)) continue;
    }
    // FLOTTA: decisa PRIMA e fuori dal limite dell'esercito di terra. Agganciata al ramo
    // terrestre non veniva mai raggiunta, perche' quel ramo si chiude appena l'esercito e'
    // al completo — ed e' quasi sempre al completo. Risultato: zero navi in tutta la partita.
    if (GAME.cittaCostiera(cm) && GAME.flottaFazione(f.id) < GAME.limiteFlotta()){
      const navi = GAME.unitaDisponibili(cm).filter(x => D().UNITA[x.id].tipo==="naval" && !x.pieno);
      if (navi.length && rnd() < 0.35){
        navi.sort((a,b)=>(b.atk+b.def)-(a.atk+a.def));
        // il primo scafo e' un trasporto, cosi' l'IA puo' popolare le isole; poi da guerra
        const vuoleTrasporto = !GAME.st.unita.some(u=>u.fazione===f.id && D().UNITA[u.tipo] && D().UNITA[u.tipo].capacita);
        const scelta = (vuoleTrasporto && navi.find(x=>D().UNITA[x.id].capacita)) || navi[0];
        if (GAME.accoda(cm.id, scelta)) continue;
      }
    }
    const truppeOra = GAME.truppeFazione(f.id);
    const vuoleUnita = truppeOra < limite && (inGuerra || truppeOra < mieCitta.length);
    let costruito = false;
    if (vuoleUnita){
      const disp = GAME.unitaDisponibili(cm).filter(x=>!D().UNITA[x.id].supporto && !x.pieno);
      if (disp.length){
        // esercito vario: scegli un ruolo con pesi, poi la migliore di quel ruolo
        const perRuolo = { inf:[], ranged:[], cav:[], siege:[] };
        for (const x of disp){ const r=D().UNITA[x.id].tipo; if (perRuolo[r]) perRuolo[r].push(x); }
        for (const r in perRuolo) perRuolo[r].sort((a,b)=>(b.atk+b.def)-(a.atk+a.def));
        const pesi = [["inf",0.4],["ranged",0.28],["cav",0.24],["siege",0.08]];
        let sceltaU = null; const roll = rnd();
        let acc=0; let ruoloVoluto="inf";
        for (const [r,w] of pesi){ acc+=w; if (roll<=acc){ ruoloVoluto=r; break; } }
        if (perRuolo[ruoloVoluto] && perRuolo[ruoloVoluto].length) sceltaU = perRuolo[ruoloVoluto][0];
        if (!sceltaU){ disp.sort((a,b)=>(b.atk+b.def)-(a.atk+a.def)); sceltaU = disp[0]; }
        // ogni tanto un supporto utile (tamburino) se ha già un esercito, sempre entro il limite
        if (truppeOra>=limite-1 && rnd()<0.12){
          const supp = GAME.unitaDisponibili(cm).filter(x=>D().UNITA[x.id].supporto && D().UNITA[x.id].aura && !x.pieno);
          if (supp.length) sceltaU = supp[0];
        }
        costruito = GAME.accoda(cm.id, sceltaU);
      }
    }
    if (costruito) continue;
    const cost = GAME.costruzioniDisponibili(cm);
    const mer = cost.find(x=>x.tipo==="meraviglia");
    if (mer && rnd()<0.5){ GAME.accoda(cm.id, mer); continue; }
    const locale = cost.find(x=>x.tipo==="locale");
    if (locale && rnd()<0.5){ GAME.accoda(cm.id, locale); continue; }
    for (const pid of PRIORITA_EDIFICI){
      const c = cost.find(x=>x.id===pid);
      if (c){ GAME.accoda(cm.id, c); break; }
    }
  }
}

function miglioriaIA(f){
  const st = GAME.st;
  const miei = MAP.terre.filter(h => st.comuni[h.comune].fazione===f.id && !h.imp && h.i!==st.comuni[h.comune].hex);
  if (!miei.length) return;
  const h = scegli(miei);
  for (const id of Object.keys(D().MIGLIORIE))
    if (GAME.migliora(h.i, id)) return;
}

function bersagliFazione(f){
  const st = GAME.st;
  const out = [];
  for (const cm of st.comuni){
    if (cm.fazione === f.id) continue;
    // nella fase protetta le IA NON conquistano gli indipendenti: restano al giocatore
    if (cm.fazione === -1){ if (!faseProtetta()) out.push(cm); continue; }
    if (cm.fazione >= 100){
      if (!f.accordi["inv"+cm.fazione]) out.push(cm);
      continue;
    }
    if (f.diplo[cm.fazione] && f.diplo[cm.fazione].stato==="guerra") out.push(cm);
  }
  return out;
}

// il colono IA non combatte mai: cerca la città indipendente indifesa più vicina e la colonizza
function muoviColoniIA(fid){
  const st = GAME.st;
  const coloni = st.unita.filter(u=>u.fazione===fid && u.tipo==="colono" && u.mov>0);
  if (!coloni.length) return;
  const indifese = st.comuni.filter(c => c.fazione===-1 && !GAME.nemiciSuHex(c.hex, fid).length);
  if (!indifese.length) return;
  for (const u of coloni){
    let best=null, bd=1e9;
    for (const cm of indifese){ const d = MAP.distKm(u.hex, cm.hex); if (d<bd){ bd=d; best=cm; } }
    if (!best) continue;
    const raggio = GAME.raggioMovimento([u.id]);
    if (raggio[best.hex] && raggio[best.hex].attacco){ GAME.colonizza(u.id, best.id); continue; }
    let bestHex=-1, bhd=1e9;
    for (const i of Object.keys(raggio)){
      if (raggio[i].attacco) continue;
      const d = MAP.distKm(parseInt(i), best.hex);
      if (d<bhd){ bhd=d; bestHex=parseInt(i); }
    }
    if (bestHex>=0 && bhd < MAP.distKm(u.hex,best.hex)) GAME.muovi([u.id], bestHex);
  }
}

// i lavoratori non combattono mai: migliorano da soli le campagne vicine finché hanno movimento
function muoviLavoratoriIA(fid){
  const st = GAME.st;
  for (const u of st.unita.filter(x=>x.fazione===fid && x.tipo==="lavoratore" && x.mov>0))
    GAME.miglioramentoAutomatico(u.id);
}
// muove tutte le unità di una fazione verso i bersagli
// quante navi ha questa fazione
function flottaDi(fid){
  return GAME.st.unita.filter(u => u.fazione===fid && GAME.eNavale(u)).length;
}
// Movimento delle navi. La logica di terra insegue il bersaglio con un gradiente sulla distanza
// in linea d'aria: in mare quel criterio incaglia le navi contro la costa, quindi le flotte
// hanno un comportamento loro. Semplice ma coerente: caccia la nave nemica piu' vicina,
// altrimenti bombarda una citta' costiera nemica a tiro, altrimenti pattuglia le proprie coste.
function muoviFlottaIA(fid){
  const st = GAME.st, H = MAP.hexes;
  const navi = st.unita.filter(u => u.fazione===fid && u.mov>0 && GAME.eNavale(u));
  if (!navi.length) return;
  const nemiche = st.unita.filter(u => GAME.eNavale(u) && !GAME.alleatiPub(u.fazione, fid));
  for (const u of navi){
    const r = GAME.raggioMovimento([u.id]);
    // 1) c'e' una nave nemica a tiro? attaccala
    const preda = Object.keys(r).find(i => r[i].attacco);
    if (preda !== undefined){
      const prev = GAME.anteprima([u.id], +preda);
      if (!prev || prev.pWin >= 0.45){ GAME.attacca([u.id], +preda); continue; }
    }
    // 2) bombarda una citta' costiera nemica adiacente
    if ((D().UNITA[u.tipo]||{}).muraDanno){
      const cmAdj = MAP.vicini(u.hex)
        .map(j => st.comuni[H[j].comune])
        .find(cm => cm && cm.fazione!==fid && cm.fazione!==-1 && cm.muraHP>0 && MAP.vicini(u.hex).includes(cm.hex));
      if (cmAdj && GAME.bombarda(u.id, cmAdj.id)) continue;
    }
    // 3) avvicinati alla nave nemica piu' vicina, restando in mare
    let meta = null;
    if (nemiche.length){
      meta = nemiche.reduce((b,n)=>{ const d=MAP.distKm(u.hex,n.hex); return (!b||d<b.d)?{h:n.hex,d}:b; }, null);
    }
    if (!meta) continue;
    const passi = Object.keys(r).filter(i => !r[i].attacco && H[i].mare);
    if (!passi.length) continue;
    const best = passi.reduce((b,i)=>{ const d=MAP.distKm(+i, meta.h); return (!b||d<b.d)?{i:+i,d}:b; }, null);
    if (best && best.d < MAP.distKm(u.hex, meta.h)) GAME.muovi([u.id], best.i);
  }
}
function muoviUnitaIA(fid, bersagli){
  const st = GAME.st;
  muoviColoniIA(fid);   // i coloni non combattono mai: hanno una logica di movimento separata
  muoviLavoratoriIA(fid);
  muoviFlottaIA(fid);   // le navi hanno una logica loro: quella di terra le incaglierebbe
  if (!bersagli.length){
    // niente da fare: torna a difendere la capitale
    const f = fid>=0&&fid<100 ? st.fazioni[fid] : null;
    if (!f) return;
    const cap = st.comuni[f.capitale];
    for (const u of st.unita.filter(x=>x.fazione===fid && x.mov>0 && x.tipo!=="colono" && x.tipo!=="lavoratore" && !GAME.eNavale(x))){
      if (MAP.distKm(u.hex, cap.hex) > 15) passoVerso(u, cap.hex);
    }
    return;
  }
  const stacks = {};
  for (const u of st.unita) if (u.fazione===fid && u.mov>0 && u.tipo!=="colono" && u.tipo!=="lavoratore" && !GAME.eNavale(u)) (stacks[u.hex]=stacks[u.hex]||[]).push(u);
  for (const k of Object.keys(stacks)){
    const gruppo = stacks[k];
    const hex = parseInt(k);
    // bersaglio più vicino
    let best=null, bd=1e9;
    for (const cm of bersagli){
      const d = MAP.distKm(hex, cm.hex);
      if (d<bd){ bd=d; best=cm; }
    }
    if (!best) continue;
    const uids = gruppo.map(u=>u.id);
    const raggio = GAME.raggioMovimento(uids);
    // c'è qualcosa da attaccare nel raggio?
    let attaccato = false;
    const attaccabili = Object.keys(raggio).filter(i=>raggio[i].attacco).map(Number);
    // priorità: il comune bersaglio, poi unità nemiche vicine
    attaccabili.sort((a,b)=>MAP.distKm(a,best.hex)-MAP.distKm(b,best.hex));
    for (const t of attaccabili){
      // dichiarazione di guerra implicita fra IA (già in guerra per definizione di bersaglio)
      const cmT = st.comuni[MAP.hexes[t].comune];
      const difensori = GAME.nemiciSuHex(t, fid);
      // fase protetta: non aggredire gli indipendenti (città o milizie), solo invasori/nemici in guerra
      if (faseProtetta() && cmT.fazione===-1 && (!difensori.length || difensori.every(d=>d.fazione===-1))) continue;
      const eCittaBersaglio = cmT.hex===t && bersagli.includes(cmT);
      const eNemico = difensori.length>0 && (
        difensori[0].fazione===-1 || difensori[0].fazione>=100 ||
        (fid<100 && fid>=0 && st.fazioni[fid].diplo[difensori[0].fazione] && st.fazioni[fid].diplo[difensori[0].fazione].stato==="guerra") ||
        fid>=100 || fid===-1);
      if (!eCittaBersaglio && !eNemico) continue;
      const ant = GAME.anteprima(uids, t);
      if (ant.vuoto || ant.assaltoMura || (ant.pWin!==undefined && ant.pWin > sogliaAttacco())){
        // assedio: prima bombarda con le macchine se le mura reggono
        if (cmT.hex===t && cmT.muraHP>0){
          for (const u of gruppo){
            if (D().UNITA[u.tipo].muraDanno && u.mov>0) GAME.bombarda(u.id, cmT.id);
          }
        }
        const vivi = gruppo.filter(u=>u.mov>0).map(u=>u.id);
        if (vivi.length) GAME.attacca(vivi, t);
        attaccato = true;
        break;
      }
    }
    if (attaccato) continue;
    // altrimenti avvicinati
    let bestHex=-1, bhd=1e9;
    for (const i of Object.keys(raggio)){
      if (raggio[i].attacco) continue;
      const d = MAP.distKm(parseInt(i), best.hex);
      if (d<bhd){ bhd=d; bestHex=parseInt(i); }
    }
    if (bestHex>=0 && bhd < MAP.distKm(hex,best.hex)) GAME.muovi(uids, bestHex);
  }
}

function passoVerso(u, target){
  const raggio = GAME.raggioMovimento([u.id]);
  let bestHex=-1, bd=MAP.distKm(u.hex,target);
  for (const i of Object.keys(raggio)){
    if (raggio[i].attacco) continue;
    const d = MAP.distKm(parseInt(i), target);
    if (d<bd){ bd=d; bestHex=parseInt(i); }
  }
  if (bestHex>=0) GAME.muovi([u.id], bestHex);
}

function turnoInvasori(){
  const st = GAME.st;
  for (const inv of st.invasori){
    const unita = st.unita.filter(u=>u.fazione===inv.id);
    const comuni = st.comuni.filter(c=>c.fazione===inv.id);
    if (!unita.length && !comuni.length){
      if (!inv.respinta){ inv.respinta = true; GAME.aggiungiLog("🛡️ Gli "+inv.nome+" sono stati respinti dalla Sicilia!", "bene"); }
      continue;
    }
    const bersagli = [];
    for (const cm of st.comuni){
      if (cm.fazione===inv.id) continue;
      if (cm.fazione>=0 && cm.fazione<100 && st.fazioni[cm.fazione].accordi["inv"+inv.id]>0) continue;
      bersagli.push(cm);
    }
    // "boss": finché tengono almeno una città, gli invasori dilagano — ogni 5 turni annettono una
    // città vicina indifesa e ogni 6 turni ricevono rinforzi dal mare. Cacciarli conviene presto.
    if (comuni.length && comuni.length < 10){
      if (st.turno % 8 === 0){
        const vicine = [];
        for (const c of comuni) for (const nb of MAP.vicini(c.hex)){
          const t = st.comuni[MAP.hexes[nb].comune];
          if (t.fazione===inv.id || vicine.includes(t)) continue;
          if (t.fazione>=0 && t.fazione<100 && st.fazioni[t.fazione].accordi["inv"+inv.id]>0) continue;
          if (GAME.unitaSuHex(t.hex).length) continue;    // solo città senza guarnigione
          vicine.push(t);
        }
        if (vicine.length){
          const t = scegli(vicine);
          GAME.aggiungiLog("🚨 Gli "+inv.nome+" dilagano: "+t.nome+" si arrende senza combattere.", "male");
          GAME.catturaComune(t, inv.id);
        }
      }
      if (st.turno % 6 === 0 && unita.length < 4){
        const linea = D().LINEA_ERA[st.era];
        GAME.creaUnita(linea[Math.floor(rnd()*3)], inv.id, scegli(comuni).hex);
      }
    }
    muoviUnitaIA(inv.id, bersagli);
  }
}

function turnoRibelli(){
  const st = GAME.st;
  const ribelli = st.unita.filter(u => {
    if (u.fazione!==-1 || u.mov<=0) return false;
    const cm = st.comuni[MAP.hexes[u.hex].comune];
    return !(cm.fazione===-1 && cm.hex===u.hex); // le guarnigioni restano ferme
  });
  for (const u of ribelli){
    // bersaglio: comune di fazione entro 25 km
    let best=null, bd=25;
    for (const cm of st.comuni){
      if (cm.fazione===-1) continue;
      const d = MAP.distKm(u.hex, cm.hex);
      if (d<bd){ bd=d; best=cm; }
    }
    if (!best) continue;
    const raggio = GAME.raggioMovimento([u.id]);
    const att = Object.keys(raggio).filter(i=>raggio[i].attacco).map(Number)
      .filter(i => MAP.hexes[i].comune===best.id || GAME.nemiciSuHex(i,-1).length);
    if (att.length){
      const ant = GAME.anteprima([u.id], att[0]);
      if (ant.vuoto || ant.assaltoMura || (ant.pWin!==undefined && ant.pWin>0.4)) GAME.attacca([u.id], att[0]);
    } else passoVerso(u, best.hex);
  }
}

return { turnoIA, turnoInvasori, turnoRibelli };
})();
