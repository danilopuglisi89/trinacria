// TRINACRIA — guscio desktop (Electron) per Steam
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Steam: si attiva da solo quando steamworks.js è installato e c'è l'App ID (vedi steam.js)
const steam = require('./steam');

const SMOKE = process.argv.includes('--smoke');

// Archivio salvataggi su file (al posto di localStorage): è questa cartella che
// Steam Auto-Cloud sincronizzerà tra i PC del giocatore.
function fileSalvataggi(){ return path.join(app.getPath('userData'), 'salvataggi.json'); }
ipcMain.on('archivio-leggi', (e) => {
  try { e.returnValue = fs.readFileSync(fileSalvataggi(), 'utf8'); }
  catch(_) { e.returnValue = null; }
});
ipcMain.on('archivio-scrivi', (e, dati) => {
  try { fs.writeFileSync(fileSalvataggi(), dati); } catch(err){ console.error('salvataggio su file fallito', err); }
});

function creaFinestra(){
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 600,
    show: !SMOKE,
    backgroundColor: '#123f57',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  });
  win.removeMenu();
  // F11 = schermo intero
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11'){
      win.setFullScreen(!win.isFullScreen()); e.preventDefault();
    }
  });
  // in sviluppo il gioco vive nella cartella sopra; nel pacchetto viene copiato in game/ (npm run prepara)
  const inPacchetto = fs.existsSync(path.join(__dirname, 'game', 'index.html'));
  win.loadFile(inPacchetto ? path.join(__dirname, 'game', 'index.html')
                           : path.join(__dirname, '..', 'index.html'));
  if (SMOKE){
    win.webContents.on('did-finish-load', async () => {
      try {
        const ok = await win.webContents.executeJavaScript('!!(window.GAME && window.MAP && window.UI && window.DESKTOP)');
        console.log(ok ? 'SMOKE_OK' : 'SMOKE_FAIL: moduli di gioco o ponte DESKTOP mancanti');
      } catch(e){ console.log('SMOKE_FAIL: ' + e.message); }
      app.quit();
    });
  }
}

app.whenReady().then(creaFinestra);
app.on('window-all-closed', () => app.quit());
