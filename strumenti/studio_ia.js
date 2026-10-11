// Studio dell'IA: una partita con tutti i regni al computer, registrando cosa fanno davvero
const { chromium } = require("C:/Users/danil/OneDrive/Desktop/Caterino project/caterino-lead/frontend/node_modules/playwright");
const PARTITE = +process.argv[2] || 2;
(async () => {
  const b = await chromium.launch({ channel: "msedge" });
  const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
  await p.goto("http://localhost:8743/index.html?r=" + Date.now()); await new Promise(r => setTimeout(r, 1500));
  const tutti = [];
  for (let g = 0; g < PARTITE; g++){
    const r = await p.evaluate(() => {
      const S = { att: 0, attVinti: 0, attPersi: 0, prese: 0, presePerFaz: {}, guerre: 0, paci: 0, coda: {}, comprate: 0, oroComprato: 0 };
      const o = {};
      for (const k of ["attacca", "accoda", "compraSubito", "dichiaraGuerra", "proponiPace", "catturaComune", "anteprima"]) o[k] = GAME[k];
      S.valuta = 0; S.valutaPw = []; S.attN = []; S.mura = []; S.rinunce = 0;
      GAME.anteprima = function(ids, t){ const r = o.anteprima.apply(this, arguments); const st = GAME.st; const h = MAP.hexes[t]; const cm = h && h.comune>=0 ? st.comuni[h.comune] : null;
        if (cm && cm.hex === t && cm.fazione >= 0 && cm.fazione < 100){ const u = st.unita.find(x => x.id === ids[0]); if (u && u.fazione !== cm.fazione && u.fazione < 100){ S.valuta++; S.valutaPw.push(r.vuoto ? 1 : (r.pWin === undefined ? -1 : Math.round(r.pWin*100)/100)); S.attN.push(ids.length + "v" + GAME.nemiciSuHex(t, u.fazione).length); S.mura.push(cm.mura||0); } }
        return r; };
      GAME.attacca = function(ids, hex){ const st = GAME.st; const u = st.unita.find(x => x.id === ids[0]); const r = o.attacca.apply(this, arguments);
        if (u && u.fazione >= 0 && u.fazione < 100){ S.att++; if (r && (r.vinceA || r.cattura)) S.attVinti++; else if (r && !r.mura) S.attPersi++; } return r; };
      GAME.accoda = function(cmId, item){ const r = o.accoda.apply(this, arguments); if (r){ const k = item.tipo === "unita" ? "unita" : item.tipo; S.coda[k] = (S.coda[k] || 0) + 1; } return r; };
      GAME.compraSubito = function(cmId){ const cm = GAME.st.comuni[cmId]; const f = GAME.st.fazioni[cm.fazione]; const prima = f ? f.oro : 0; const r = o.compraSubito.apply(this, arguments); if (r){ S.comprate++; S.oroComprato += prima - f.oro; } return r; };
      GAME.dichiaraGuerra = function(){ S.guerre++; return o.dichiaraGuerra.apply(this, arguments); };
      GAME.nuovaPartita({ fazione: 0, difficolta: "normale" });
      const st = GAME.st; st.fazioni[0].ai = true;
      const padrone = {}; const campioni = [];
      let ferme = 0, contaU = 0;
      while (st.turno < 175 && !st.vittoria){
        const t = st.turno; GAME.fineTurno(); st.pending.length = 0; if (st.turno === t) break;
        for (const c of st.comuni){ if (!c.fondata) continue; const pr = padrone[c.id]; if (pr !== undefined && pr !== c.fazione && pr >= 0 && pr < 100 && c.fazione >= 0 && c.fazione < 100){ S.prese++; S.presePerFaz[c.fazione] = (S.presePerFaz[c.fazione] || 0) + 1; } padrone[c.id] = c.fazione; }
        // truppe che finiscono il turno col movimento pieno e senza essere in citta' o fortificate
        for (const u of st.unita){ if (u.fazione < 0 || u.fazione >= 100) continue; const ud = GAME.statU ? null : null; contaU++; }
        // sonda guerra: per ogni coppia in guerra, dove stanno le truppe dell'attaccante
        for (const f of st.fazioni){ if (f.eliminata || f.id === 0 && false) continue;
          for (const k in f.diplo){ const d = f.diplo[k]; if (d.stato !== "guerra") continue; const nem = +k;
            const cittaN = st.comuni.filter(c => c.fondata && c.fazione === nem); if (!cittaN.length) continue;
            const mie = st.unita.filter(u => u.fazione === f.id && !GAME.eNavale(u) && u.tipo !== "colono" && u.tipo !== "lavoratore");
            let vicine = 0, somma = 0;
            for (const u of mie){ let m = 1e9; for (const c of cittaN) m = Math.min(m, MAP.distKm(u.hex, c.hex)/(MAP.R*2)); somma += m; if (m <= 4) vicine++; }
            S.guerraTurni = (S.guerraTurni||0) + 1; S.guerraVicine = (S.guerraVicine||0) + vicine; S.guerraTruppe = (S.guerraTruppe||0) + mie.length; S.guerraDist = (S.guerraDist||0) + (mie.length ? somma/mie.length : 0);
            S.distCitta = S.distCitta || []; if (S.distCitta.length < 30){ const mc = st.comuni.filter(c=>c.fondata&&c.fazione===f.id); let dm=1e9; for (const a of mc) for (const b of cittaN) dm=Math.min(dm, MAP.distKm(a.hex,b.hex)/(MAP.R*2)); S.distCitta.push(Math.round(dm)); }
          } }
        if (st.turno % 25 === 0){
          campioni.push({ t: st.turno, era: st.era, faz: st.fazioni.map(f => f.eliminata ? null : {
            citta: GAME.cittaDi(f.id), oro: Math.round(f.oro), truppe: GAME.truppeFazione(f.id), lim: GAME.limiteEsercito(f.id), forza: Math.round(GAME.forzaTotale(f.id)), tech: f.techs.length,
            guerra: Object.values(f.diplo).filter(d => d.stato === "guerra").length,
            codaVuota: st.comuni.filter(c => c.fazione === f.id && !c.coda.length).length,
            edifici: st.comuni.filter(c => c.fazione === f.id).reduce((s, c) => s + c.edifici.length, 0) }) });
        }
      }
      for (const k in o) GAME[k] = o[k];
      const pw = S.valutaPw.filter(x=>x>=0).sort((a,b)=>a-b); S.pwMedio = pw.length ? pw[Math.floor(pw.length/2)] : null; S.pwSopra55 = pw.filter(x=>x>0.55).length; S.attNcampione = S.attN.slice(0,40).join(" "); S.muraMedia = S.mura.length ? (S.mura.reduce((a,b)=>a+b,0)/S.mura.length).toFixed(2) : 0; S.guerraMedia = S.guerraTurni ? { truppe:(S.guerraTruppe/S.guerraTurni).toFixed(1), entro4:(S.guerraVicine/S.guerraTurni).toFixed(1), distMedia:(S.guerraDist/S.guerraTurni).toFixed(1) } : null; delete S.valutaPw; delete S.attN; delete S.mura;
      return { fine: st.vittoriaInfo ? st.vittoriaInfo.tipo + "@" + st.turno : "nessuna@" + st.turno, S, campioni };
    });
    tutti.push(r);
  }
  console.log(JSON.stringify(tutti));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
