// TRINACRIA — integrazione Steamworks (achievements, presenza).
// Si attiva da sola SOLO quando entrambe le condizioni sono vere:
//   1) `npm install steamworks.js` è stato eseguito in questa cartella;
//   2) esiste desktop/steam_appid.txt con l'App ID assegnato da Valve
//      (lo si riceve dopo l'iscrizione a Steamworks e la creazione dell'app).
// Senza questi pezzi il gioco funziona identico, semplicemente senza le feature Steam.
let client = null;
try {
  const sw = require('steamworks.js');
  client = sw.init(); // in sviluppo legge steam_appid.txt; in produzione gira sotto il client Steam
  console.log('Steam attivo, giocatore:', client.localplayer.getName());
} catch (e) {
  console.log('Steam non attivo (normale in sviluppo):', e.message);
}
module.exports = {
  attivo: () => !!client,
  // da chiamare quando il gioco segnala un'impresa (es. prima colonia, vittoria, meraviglia)
  achievement(nome){
    if (client) try { client.achievement.activate(nome); } catch(e){ /* ignora */ }
  }
};
