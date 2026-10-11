// Giro di controllo grafico di Trinacria: schermate fisse in desktop e telefono
const { chromium } = require("C:/Users/danil/OneDrive/Desktop/Caterino project/caterino-lead/frontend/node_modules/playwright");
const OUT = (process.env.TEMP || __dirname) + "/trinacria_giro/";
require("fs").mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:8743/index.html?r=" + Date.now();
const attendi = ms => new Promise(r => setTimeout(r, ms));

async function giro(nome, viewport, mobile){
  const b = await chromium.launch({ channel: "msedge" });
  const p = await b.newPage({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const errori = [];
  p.on("pageerror", e => errori.push(String(e)));
  p.on("requestfailed", r => errori.push("rete: " + r.url()));
  p.on("response", r => { if (r.status() >= 400) errori.push(r.status() + " " + r.url()); });
  await p.goto(URL); await attendi(2500);
  await p.screenshot({ path: OUT + nome + "_01_avvio.png" });
  await p.screenshot({ path: OUT + nome + "_02_avvio_intera.png", fullPage: false, clip: undefined });
  await p.evaluate(() => { const a = document.getElementById("avvio"); a.scrollTop = a.scrollHeight; });
  await attendi(400);
  await p.screenshot({ path: OUT + nome + "_03_avvio_fondo.png" });
  await p.click("#btn-inizia"); await attendi(2500);
  await p.screenshot({ path: OUT + nome + "_04_capitale.png" });
  // chiude le finestre iniziali scegliendo l'ultima opzione (posizione storica, salta tutorial...)
  for (let i = 0; i < 8; i++){
    const aperto = await p.evaluate(() => !document.getElementById("modale-sfondo").classList.contains("nascosto"));
    if (!aperto) break;
    await p.evaluate(() => { const bs = [...document.querySelectorAll("#modale .m-btn")]; bs[bs.length-1].click(); });
    await attendi(600);
  }
  await p.evaluate(() => { const s = document.querySelector("#tutorial-card button"); if (s) s.click(); });
  await attendi(800);
  await p.screenshot({ path: OUT + nome + "_05_partita.png" });
  // pannello della capitale
  await p.evaluate(() => { const st = GAME.st; const cm = st.comuni.find(c => c.fazione === st.giocatore && c.fondata);
    window.__cap = cm && cm.hex; });
  await p.evaluate(() => { const c = document.querySelector(".carta-citta, [data-hex]"); });
  // si avanzano 25 turni con l'IA al posto del giocatore, per vedere una mappa piu' piena
  await p.evaluate(async () => {
    const st = GAME.st; st.fazioni[st.giocatore].ai = true;
    for (let i = 0; i < 40; i++){ GAME.fineTurno(); st.pending.length = 0; }
    st.fazioni[st.giocatore].ai = false; UI.aggiornaTutto();
  });
  await attendi(1500);
  await p.screenshot({ path: OUT + nome + "_06_turno40.png" });
  for (const [id, f] of [["regno","btn-regno"],["corte","btn-corte"],["diplo","btn-diplo"],["menu","btn-menu"]]){
    await p.evaluate(f => document.getElementById(f).click(), f); await attendi(900);
    await p.screenshot({ path: OUT + nome + "_07_" + id + ".png" });
    await p.evaluate(() => { const m = document.getElementById("modale-sfondo"); if (!m.classList.contains("nascosto")){ const x = document.querySelector("#modale .m-chiudi, #modale .m-btn:last-child"); if (x) x.click(); else m.classList.add("nascosto"); } });
    await p.evaluate(() => { const pn = document.getElementById("pannello"); if (pn) pn.classList.add("nascosto"); });
    await attendi(400);
  }
  // finestre con illustrazione: era, vittoria, guerra
  for (const [id, img] of [["era","era_3"],["vittoria","scene/vittoria_cultura"],["guerra","scene/guerra_dichiarata"]]){
    await p.evaluate(img => { document.getElementById("modale-sfondo").classList.add("nascosto");
      GAME.st.pending.push({ titolo:"🔱 Prova " + img, img, testo:"Testo di prova della finestra, due righe per vedere come si impagina sotto l'illustrazione.", scelte:[{label:"Avanti", eff:"nulla"},{label:"Seconda scelta", eff:"nulla"}] });
      UI.processaPending(); }, img);
    await attendi(1200);
    await p.screenshot({ path: OUT + nome + "_08_" + id + ".png" });
    await p.evaluate(() => { const b = document.querySelector("#modale .m-btn"); if (b) b.click(); });
    await attendi(500);
  }
  // misure: cose che escono dallo schermo o si sovrappongono
  const misure = await p.evaluate(() => {
    const W = innerWidth, H = innerHeight, out = [];
    for (const id of ["topbar","risorse","bottoni-top","btn-turno","btn-auto","minimappa-box","registro","leader-box"]){
      const e = document.getElementById(id); if (!e) continue; const r = e.getBoundingClientRect();
      if (r.width && (r.right > W + 1 || r.left < -1 || r.bottom > H + 1)) out.push(id + " fuori schermo " + JSON.stringify([r.left, r.right, r.top, r.bottom].map(Math.round)));
    }
    const a = document.getElementById("btn-turno").getBoundingClientRect(), b = document.getElementById("btn-auto").getBoundingClientRect();
    if (!(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top)) out.push("btn-turno e btn-auto si sovrappongono");
    const rot = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src).map(i => i.src);
    if (rot.length) out.push("immagini rotte: " + rot.join(", "));
    return out;
  });
  console.log(nome, "misure:", misure.length ? misure : "ok", "| errori:", errori.length ? errori.slice(0, 8) : "nessuno");
  await b.close();
}

(async () => {
  await giro("pc", { width: 1366, height: 768 }, false);
  await giro("tel", { width: 390, height: 844 }, true);
})().catch(e => { console.error(e); process.exit(1); });
