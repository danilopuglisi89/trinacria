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
    // La scienza regalata all'IA (+1 per era, ogni turno) era un aiuto invisibile e innocuo
    // finche' la ricerca non decideva la partita. Ora che esiste la vittoria scientifica
    // sarebbe una corsa truccata: resta solo a difficolta' alta, dichiarata.
    if (st.difficolta === "difficile") f.sciAcc += 1 + st.era;
    diplomaziaIA(f);
    gestioneCittaIA(f);
    if (!f.eroeVivo && f.oro > GAME.costoEroe()+100 && rnd()<0.3) GAME.reclutaEroe(f.id);
    if (f.oro > 160 && rnd()<0.5) miglioriaIA(f);
    if (rnd()<0.5) compraCaselleIA(f);
    if (rnd()<0.15) GAME.edittiIA(f);
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
    // Condizioni di guerra ammorbidite. Prima serviva essere il 50% piu' forti: ma con tutte
    // le fazioni allo stesso tetto di citta' e di esercito nessuno lo e' mai, e in 161 turni
    // non scoppiava una sola guerra. Ora basta un vantaggio credibile, e chi non ha piu'
    // spazio per fondare diventa molto piu' propenso a prendersi le terre del vicino.
    // Chi non ha piu' dove espandersi non aspetta di odiare il vicino: gli serve la sua terra.
    // Con le vecchie soglie (vantaggio 1,05 e umore sotto zero) scoppiavano due guerre per
    // partita e la mappa non cambiava mai padrone; ora la Sicilia piena diventa scomoda.
    const stretto = senzaSpazio(f.id);
    const vantaggio = stretto ? 0.95 : 1.20;
    const sogliaUmore = stretto ? 8 : -6;
    // `aggr()` restituisce un OGGETTO: moltiplicarlo dava NaN, e `rnd() < NaN` e' sempre falso.
    // Risultato: fra due IA non scoppiava MAI una guerra, in nessuna partita.
    const mult = st.difficolta==="facile" ? 0.6 : (st.difficolta==="difficile" ? 1.6 : 1);
    const prob = (stretto ? 0.16 : 0.04) * mult;
    if (!faseProtetta() && d.stato==="pace" && !guerraInCorso && confinanti(f.id, g.id) &&
        GAME.forzaTotale(f.id) > GAME.forzaTotale(g.id)*vantaggio &&
        d.atteggiamento < sogliaUmore && rnd()<prob){
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
    if (confinanti(f.id,g.id) && rnd()<(senzaSpazio(f.id) ? 0.40 : 0.25)) d.atteggiamento -= 1;
  }
}

// Due regni sono "vicini" se hanno citta' a portata di marcia, non solo se i territori si
// toccano. Con le citta' fondate e la terra di nessuno in mezzo, il confine diretto e' raro:
// pretenderlo significava atteggiamenti mai in calo e ZERO guerre in tutta la partita.
// In piu' la vecchia versione scorreva tutti i 10.000 esagoni di terra per ogni coppia.
const RAGGIO_VICINANZA = 14;      // esagoni fra due citta' perche' i regni si sentano addosso
// Memoria di turno: confinanti() e senzaSpazio() vengono interrogate per ogni coppia di
// fazioni a ogni turno, e ciascuna scorre citta' e comuni. Ricalcolarle ogni volta faceva
// quadruplicare il costo del turno; i loro risultati non cambiano dentro lo stesso turno.
let _memoTurno = -1, _memoVic = {}, _memoSpazio = {};
function memoriaTurno(){
  const t = GAME.st.turno;
  if (t !== _memoTurno){ _memoTurno = t; _memoVic = {}; _memoSpazio = {}; }
}
function confinanti(a, b){
  memoriaTurno();
  const k = a < b ? a+"_"+b : b+"_"+a;
  if (_memoVic[k] === undefined) _memoVic[k] = confinantiCalc(a, b);
  return _memoVic[k];
}
function confinantiCalc(a, b){
  const st = GAME.st;
  const ca = st.comuni.filter(c => c.fondata && c.fazione===a);
  const cb = st.comuni.filter(c => c.fondata && c.fazione===b);
  const soglia = RAGGIO_VICINANZA * MAP.R * 2;
  for (const x of ca) for (const y of cb)
    if (MAP.distKm(x.hex, y.hex) < soglia) return true;
  return false;
}
// Un regno che non ha piu' dove espandersi diventa aggressivo: e' la molla che accende le
// guerre nelle ere tarde, quando l'isola e' spartita e crescere significa prendersela da qualcuno.
function senzaSpazio(fid){
  memoriaTurno();
  if (_memoSpazio[fid] === undefined) _memoSpazio[fid] = senzaSpazioCalc(fid);
  return _memoSpazio[fid];
}
function senzaSpazioCalc(fid){
  const st = GAME.st;
  const mie = st.comuni.filter(c => c.fondata && c.fazione===fid);
  if (!mie.length) return false;
  if (mie.length >= tettoCittaEra(st.era)) return true;
  // nessun sito libero decente entro una decina di esagoni dalle proprie citta'?
  const soglia = 12 * MAP.R * 2;
  for (const c of st.comuni){
    if (c.fondata) continue;
    for (const m of mie) if (MAP.distKm(c.hex, m.hex) < soglia) return false;
  }
  return true;
}

function gestioneCittaIA(f){
  const st = GAME.st;
  const mieCitta = st.comuni.filter(c=>c.fazione===f.id);
  const inGuerra = Object.values(f.diplo).some(d=>d.stato==="guerra") ||
                   st.invasori.some(inv => !f.accordi["inv"+inv.id] && st.unita.some(u=>u.fazione===inv.id));
  // eserciti piccoli ma sempre aggiornati: mai più del limite di truppe del regno (uguale al giocatore)
  const limite = GAME.limiteEsercito(f.id);
  for (const cm of mieCitta){
    if (cm.coda.length) continue;
    // ogni tanto un colono, per espandersi pacificamente verso gli indipendenti indifesi vicini
    const coloniAttivi = st.unita.filter(u=>u.fazione===f.id && u.tipo==="colono").length;
    // Ritmo di espansione legato all'ERA, non alla sola voglia di crescere. Senza tetto l'IA
    // fondava 74 citta' in 121 turni e ricopriva l'isola prima che il giocatore ne avesse
    // cinque: la Sicilia si riempiva in un paio d'ere invece che in ventiquattro secoli.
    const tettoCitta = tettoCittaEra(st.era);
    const sottoTetto = mieCitta.length < tettoCitta;
    const pochiCentri = mieCitta.length < Math.min(4, tettoCitta);
    if (sottoTetto && coloniAttivi < (pochiCentri?2:1) && rnd()<(pochiCentri?0.45:0.10)){
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
        // In guerra servono macchine d'assedio: senza, quattro fanti contro mura di livello 3
        // hanno probabilita' ZERO, con un ariete la stessa citta' cade. Con l'8% fisso l'IA
        // dichiarava guerre che non poteva vincere.
        const haAssedio = st.unita.some(function(x){ return x.fazione===f.id && D().UNITA[x.tipo] && D().UNITA[x.tipo].tipo==="siege"; });
        const pesi = inGuerra
          ? (haAssedio ? [["inf",0.38],["ranged",0.24],["cav",0.20],["siege",0.18]]
                       : [["siege",0.45],["inf",0.30],["ranged",0.15],["cav",0.10]])
          : [["inf",0.4],["ranged",0.28],["cav",0.24],["siege",0.08]];
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
    // QUARTIERI: l'IA sceglie il quartiere e la casella con l'adiacenza migliore. Ci tiene
    // parecchio (60%): sono la costruzione che rende di piu' se piazzata bene, e senza questo
    // ramo il giocatore avrebbe l'isola piu' sviluppata solo perche' l'IA non li usa.
    const quart = GAME.quartieriDisponibili(cm);
    if (quart.length && rnd()<0.6){
      quart.sort((x,y) => y.migliore.totale - x.migliore.totale);
      const q = quart[0];
      if (GAME.accoda(cm.id, { tipo:"quartiere", id:q.id, costo:q.costo, hex:q.migliore.hex })) continue;
    }
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

// L'IA compra caselle come il giocatore: preferisce quelle con una risorsa, poi le piu'
// generose. Senza questo ramo il giocatore avrebbe uno sbocco per l'oro che all'IA manca,
// e i regni ricchi continuerebbero ad accumulare monete senza spenderle.
function compraCaselleIA(f){
  const st = GAME.st;
  if (f.oro < 400) return;
  const mie = st.comuni.filter(c => c.fondata && c.fazione === f.id);
  if (!mie.length) return;
  const cm = scegli(mie);
  const cand = [];
  for (const h of GAME.territorioDi(cm.id)){
    for (const j of MAP.vicini(h.i)){
      const v = MAP.hexes[j];
      if (!v || v.mare || v.terra === "lago" || v.citta >= 0) continue;
      if (cand.some(x => x.i === j)) continue;
      const r = GAME.resaCasella(j);
      cand.push({ i:j, val: r.cibo + r.prod + r.oro*1.2 + r.cultura + (v.res ? 3 : 0) });
    }
  }
  if (!cand.length) return;
  cand.sort((a,b) => b.val - a.val);
  // un regno ricco compra a mani basse: e' l'unico modo perche' l'oro smetta di accumularsi
  // senza sbocco nelle ere tarde, e intanto i confini si muovono davvero
  const quante = f.oro > 4000 ? 3 : (f.oro > 1200 ? 2 : 1);
  for (let k=0; k<quante && k<cand.length; k++) GAME.compraCasella(cand[k].i, f.id);
}
function miglioriaIA(f){
  const st = GAME.st;
  const miei = MAP.terre.filter(h => h.citta>=0 && st.comuni[h.citta].fazione===f.id && !h.imp && h.i!==st.comuni[h.citta].hex);
  if (!miei.length) return;
  const h = scegli(miei);
  for (const id of Object.keys(D().MIGLIORIE))
    if (GAME.migliora(h.i, id)) return;
}

function bersagliFazione(f){
  // una citta' non ancora fondata e' solo un nome sulla mappa: non si conquista
  const st = GAME.st;
  const out = [];
  for (const cm of st.comuni){
    if (!cm.fondata) continue;                 // e' solo un toponimo, non c'e' nulla da prendere
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
// I coloni dell'IA FONDANO citta'. Prima annettevano le citta' indipendenti gia' presenti
// sulla mappa: ora la Sicilia parte vuota e quelle citta' non esistono, quindi senza questa
// logica ogni fazione resterebbe per sempre con la sola capitale.
// L'IA fonda anche dove nessun centro reale presta il nome: in quel caso se ne inventa uno,
// come fa il giocatore col battesimo. Senza, i coloni resterebbero fermi a guardare il posto.
const PRE_IA = ["Borgo","Casale","Rocca","Torre","Serra","Villa","Poggio","Marina"];
const POST_IA = ["Nuova","d'Oro","del Sole","Alta","Verde","Chiara","di Ponente","di Levante","Sicula"];
function fondaConNome(u, fid){
  const p = GAME.puoFondare(u.hex, fid);
  if (!p.ok) return false;
  let nome = null;
  if (!p.nome){
    const r = (n) => Math.abs(Math.sin(n*127.1+311.7)*43758.5453) % 1;
    nome = PRE_IA[Math.floor(r(u.hex)*PRE_IA.length)] + " " + POST_IA[Math.floor(r(u.hex*7+13)*POST_IA.length)];
  }
  return !!GAME.fondaCitta(u.id, nome).ok;
}
// Quante citta' puo' avere una fazione in una data era. Cresce con la storia: si comincia in
// pochi centri e si arriva a dominare l'isola solo nelle ere tarde.
function tettoCittaEra(era){ return 3 + era*2; }      // era 0: 3 citta', era 5: 13
function muoviColoniIA(fid){
  const st = GAME.st;
  const coloni = st.unita.filter(u=>u.fazione===fid && u.tipo==="colono" && u.mov>0);
  if (!coloni.length) return;
  // siti liberi: toponimi non ancora fondati, ordinati per bonta' (grandi e vicini prima)
  const liberi = st.comuni.filter(c => !c.fondata);
  if (!liberi.length) return;
  // oltre il tetto dell'era i coloni gia' costruiti restano in attesa invece di fondare
  const mie = st.comuni.filter(c => c.fazione===fid && c.fondata).length;
  if (mie >= tettoCittaEra(st.era)) return;
  for (const u of coloni){
    // gia' su un punto valido? fonda subito
    if (GAME.puoFondare(u.hex, fid).ok && fondaConNome(u, fid)) continue;
    // altrimenti punta al sito libero piu' promettente
    let best=null, bd=1e9;
    for (const cm of liberi){
      if (cm.fondata) continue;
      const d = MAP.distKm(u.hex, cm.hex) - cm.tier*6;      // le localita' maggiori attirano
      if (d<bd && GAME.puoFondare(cm.hex, fid).ok){ bd=d; best=cm; }
    }
    if (!best) continue;
    // Marcia con il pathfinding vero, non col passo greedy verso il punto piu' vicino in linea
    // d'aria: quel criterio incastra i coloni dietro montagne, laghi e insenature, e infatti
    // tre fazioni su sei restavano ferme a una sola citta' con tre coloni fermi in casa.
    // marcia su piu' turni col pathfinding vero: il passo greedy verso il punto piu' vicino
    // in linea d'aria incastrava i coloni dietro montagne, laghi e insenature
    if (u.goto) continue;                       // gia' in viaggio: ci pensa processaGoto
    // Si imposta solo la destinazione: il percorso lo calcola processaGoto, una volta sola.
    // Calcolarlo anche qui significava due ricerche per colono e per turno, la voce di costo
    // piu' pesante dell'intero turno.
    GAME.impostaGoto(u.id, best.hex);
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
// Bonifica dei covi di briganti. Gira SEMPRE, non solo quando l'IA e' senza bersagli
// (con 7 fazioni c'e' quasi sempre un nemico in lista e la vecchia versione non partiva mai).
// Una squadra di 3 unita' — le piu' vicine al covo — viene distaccata e mossa subito,
// cosi' consuma il movimento e la logica di guerra sotto non la richiama indietro.
// Il raggio e' misurato dalla citta' PIU' VICINA: i covi nascono per costruzione a piu'
// di 14 esagoni da ogni capitale, quindi dalla capitale non se ne trovava mai uno.
// Briganti sotto le mura: ogni pila propria (le unita' sullo stesso esagono attaccano insieme)
// che li ha a tiro li carica, dalla pila piu' forte alla piu' debole, finche' l'esagono e' pulito.
// Prima l'IA provava un'unita' alla volta contro pile da quattro e con pWin 0 non partiva mai.
function difesaDaBrigantiIA(fid){
  const st = GAME.st;
  const mieCitta = st.comuni.filter(c => c.fondata && c.fazione===fid);
  if (!mieCitta.length) return;
  const vicine = st.unita.filter(u => u.fazione===-1 && mieCitta.some(c => MAP.distKm(c.hex, u.hex) < MAP.R*2*3.5));
  if (!vicine.length) return;
  const bersagli = [...new Set(vicine.map(u => u.hex))];
  for (const hexB of bersagli){
    const pile = {};
    for (const u of st.unita) if (u.fazione===fid && u.mov>0 && u.tipo!=="colono" && u.tipo!=="lavoratore" && u.tipo!=="esploratore" && !GAME.eNavale(u)) (pile[u.hex]=pile[u.hex]||[]).push(u);
    const ordine = Object.values(pile).sort((a,b)=>b.length-a.length);
    for (const pila of ordine){
      if (!GAME.nemiciSuHex(hexB, fid).length) break;
      const ids = pila.map(u=>u.id);
      const r = GAME.raggioMovimento(ids);
      if (!r[hexB] || !r[hexB].attacco) continue;
      const ant = GAME.anteprima(ids, hexB);
      if (!ant || ant.vuoto || (ant.pWin!==undefined && ant.pWin > (pila.length>1 ? 0.35 : 0.45))) GAME.attacca(ids, hexB);
    }
  }
}
function cacciaCoviIA(fid){
  const st = GAME.st;
  const covi = GAME.covi || [];
  if (!covi.length) return;
  const mieCitta = st.comuni.filter(c => c.fondata && c.fazione===fid);
  if (!mieCitta.length) return;
  const covo = covi.reduce((b,c)=>{
    const d = Math.min(...mieCitta.map(m => MAP.distKm(m.hex, c.hex)));
    return (d<MAP.R*2*24 && (!b||d<b.d)) ? {c,d} : b; }, null);
  if (!covo) return;
  const truppe = st.unita.filter(x=>x.fazione===fid && x.mov>0 && x.tipo!=="colono" && x.tipo!=="lavoratore" && x.tipo!=="esploratore" && !GAME.eNavale(x));
  if (truppe.length < 3) return;                      // con meno di 3 unita' si tiene tutto a casa
  const squadra = truppe.sort((a,b)=>MAP.distKm(a.hex,covo.c.hex)-MAP.distKm(b.hex,covo.c.hex)).slice(0,3);
  for (const u of squadra){
    u.caccia = st.turno;    // distaccata: la logica di guerra sotto non la richiama indietro con il movimento residuo
    const r = GAME.raggioMovimento([u.id]);
    // nemiciSuHex(i, fid) = nemici DI fid sull'esagono: si filtra sui briganti (fazione -1).
    // La versione precedente chiedeva i nemici di -1, cioe' chiunque tranne i briganti.
    const att = Object.keys(r).find(i => r[i].attacco && GAME.nemiciSuHex(+i,fid).some(x=>x.fazione===-1) && MAP.distKm(+i, covo.c.hex) < MAP.R*2*2.5);
    if (att !== undefined){ const ant=GAME.anteprima([u.id], +att); if (!ant || ant.pWin===undefined || ant.pWin>0.45){ GAME.attacca([u.id], +att); continue; } }
    if (r[covo.c.hex] && !r[covo.c.hex].attacco){ GAME.muovi([u.id], covo.c.hex); continue; }
    passoVerso(u, covo.c.hex);
  }
}
// Quale citta' prendere, per tutta la fazione. Si sceglie una volta per turno e vale per
// tutti i reparti: concentrare e' l'unico modo di far cadere una citta' murata. Il peso
// premia le prede facili — poca guarnigione, mura basse, fedelta' gia' scossa — e penalizza
// la distanza, perche' una marcia di venti esagoni finisce sempre male.
let _pianoTurno = -1, _piani = {};
function obiettivoGuerra(fid, bersagli){
  const st = GAME.st;
  if (st.turno !== _pianoTurno){ _pianoTurno = st.turno; _piani = {}; }
  if (_piani[fid] !== undefined) return _piani[fid];
  let scelto = null;
  if (bersagli.length){
    const mie = st.comuni.filter(function(c){ return c.fondata && c.fazione===fid; });
    let meglio = -1e9;
    for (const cm of bersagli){
      // distanza dalla mia citta' piu' vicina: e' da li' che parte la spedizione
      let d = 1e9;
      for (const m of mie) d = Math.min(d, MAP.distKm(m.hex, cm.hex) / (MAP.R*2));
      if (d > 26) continue;                                   // troppo lontana: non si tiene
      const guardie = st.unita.filter(function(u){ return u.hex===cm.hex && !GAME.alleatiPub(u.fazione, fid); }).length;
      const fed = (cm.fedelta === undefined) ? 100 : cm.fedelta;
      let v = 40 - d*1.6 - guardie*7 - (cm.mura||0)*6 - fed*0.12 + (cm.pop||0)*0.3;
      if (cm.fazione === -1) v += 8;                          // le citta' libere non hanno alleati
      if (v > meglio){ meglio = v; scelto = cm; }
    }
  }
  _piani[fid] = scelto;
  return scelto;
}
function muoviUnitaIA(fid, bersagli){
  const st = GAME.st;
  muoviColoniIA(fid);   // i coloni non combattono mai: hanno una logica di movimento separata
  muoviLavoratoriIA(fid);
  muoviFlottaIA(fid);   // le navi hanno una logica loro: quella di terra le incaglierebbe
  difesaDaBrigantiIA(fid);
  cacciaCoviIA(fid);
  if (!bersagli.length){
    // niente da fare: torna a difendere la capitale
    const f = fid>=0&&fid<100 ? st.fazioni[fid] : null;
    if (!f) return;
    const cap = st.comuni[f.capitale];
    // In pace ogni reparto tornava verso la CAPITALE, e ci restava. Risultato: diciassette
    // unita' ammassate sulla stessa casella, le altre citta' sguarnite, e nessun esercito
    // nemico in grado di prendere niente — quattro attaccanti contro diciassette difensori
    // hanno probabilita' zero, sempre. Ora ognuno presidia la citta' PIU' SGUARNITA fra le
    // proprie: la difesa si distribuisce e le guerre tornano possibili.
    const mieCitta = st.comuni.filter(function(c){ return c.fondata && c.fazione===fid; });
    if (!mieCitta.length) return;
    const presidio = {};
    for (const u of st.unita)
      if (u.fazione===fid && !GAME.eNavale(u) && u.tipo!=="colono" && u.tipo!=="lavoratore")
        presidio[u.hex] = (presidio[u.hex]||0) + 1;
    for (const u of st.unita.filter(x=>x.fazione===fid && x.mov>0 && x.caccia!==st.turno && x.tipo!=="colono" && x.tipo!=="lavoratore" && !GAME.eNavale(x))){
      const qui = presidio[u.hex] || 0;
      const inCitta = mieCitta.some(function(c){ return c.hex === u.hex; });
      if (inCitta && qui <= 3) continue;                 // gia' di guardia dove serve
      // la citta' con meno difensori, a parita' preferendo la piu' vicina
      let meta = null, punteggio = 1e9;
      for (const c of mieCitta){
        const n = presidio[c.hex] || 0;
        const d = MAP.distKm(u.hex, c.hex) / (MAP.R*2);
        const p = n*10 + d;
        if (p < punteggio){ punteggio = p; meta = c; }
      }
      if (!meta) continue;
      if (meta.hex === u.hex) continue;
      if ((presidio[meta.hex]||0) >= 4) continue;        // gia' piena: non ammassare oltre
      presidio[u.hex] = Math.max(0, qui-1);
      presidio[meta.hex] = (presidio[meta.hex]||0) + 1;
      passoVerso(u, meta.hex);
    }
    return;
  }
  const stacks = {};
  for (const u of st.unita) if (u.fazione===fid && u.mov>0 && u.caccia!==st.turno && u.tipo!=="colono" && u.tipo!=="lavoratore" && !GAME.eNavale(u)) (stacks[u.hex]=stacks[u.hex]||[]).push(u);
  for (const k of Object.keys(stacks)){
    const gruppo = stacks[k];
    const hex = parseInt(k);
    // L'obiettivo e' quello deciso dalla fazione, non il piu' vicino a QUESTO gruppo: cosi'
    // i reparti convergono invece di assediare tre citta' per uno.
    let best = obiettivoGuerra(fid, bersagli);
    // se l'obiettivo comune e' lontanissimo per questo gruppo, si prende comunque il piu' vicino
    if (!best || MAP.distKm(hex, best.hex) / (MAP.R*2) > 30){
      let bd = 1e9;
      for (const cm of bersagli){
        const d = MAP.distKm(hex, cm.hex);
        if (d < bd){ bd = d; best = cm; }
      }
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

function passoVerso(u, target, evita){
  const raggio = GAME.raggioMovimento([u.id]);
  let bestHex=-1, bd=MAP.distKm(u.hex,target);
  for (const i of Object.keys(raggio)){
    if (raggio[i].attacco) continue;
    if (evita && evita(parseInt(i))) continue;
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
    // bersaglio: citta' di fazione entro dieci esagoni (la soglia era in unita'-mondo della
    // vecchia scala: 25 unita' = 8 km, e i briganti non si muovevano quasi mai)
    let best=null, bd=MAP.R*2*10;
    for (const cm of st.comuni){
      if (cm.fazione===-1 || !cm.fondata) continue;
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
    } else passoVerso(u, best.hex, i => GAME.unitaSuHex(i).length >= 2);   // mai pile: una pila da 4 nessuno la attacca e non attacca mai
  }
}

return { turnoIA, turnoInvasori, turnoRibelli };
})();
