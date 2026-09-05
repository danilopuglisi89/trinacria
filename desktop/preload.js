// Ponte fra il gioco (pagina web) e il desktop: salvataggi su file.
// Se window.DESKTOP esiste, save.js specchia i salvataggi su file (per Steam Cloud);
// nel browser normale DESKTOP non esiste e tutto resta su localStorage come sempre.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('DESKTOP', {
  // l'intero archivio (tutte le chiavi trinacria_*) viaggia come un unico JSON
  archivioLeggi: () => ipcRenderer.sendSync('archivio-leggi'),
  archivioScrivi: (dati) => ipcRenderer.send('archivio-scrivi', dati),
});
