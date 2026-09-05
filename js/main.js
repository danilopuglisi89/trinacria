// TRINACRIA — avvio
window.addEventListener("DOMContentLoaded", async () => {
  // asset bitmap AI (facoltativi): se il manifest manca il gioco resta interamente procedurale
  const tag = document.querySelector('script[src*="sprites.js"]');
  const versione = tag && /v=(\d+)/.exec(tag.src) ? /v=(\d+)/.exec(tag.src)[1] : "";
  try { await SPRITES.init({ versione, gruppiSubito:["icone","ritratti"] }); } catch(e){ /* procedurale */ }
  // pacchetto audio (facoltativo): senza manifest restano tarantella procedurale ed effetti
  try { await AUDIO.init(); } catch(e){}
  UI.initGioco();
  UI.initAvvio();
});
