// Copia i file del gioco dentro desktop/game/ per l'impacchettamento con electron-builder
// (electron-builder non può includere file fuori dalla propria cartella).
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..');
const DST = path.join(__dirname, 'game');
fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(DST, { recursive: true });
for (const nome of ['index.html', 'logic.js']) fs.copyFileSync(path.join(SRC, nome), path.join(DST, nome));
for (const dir of ['css', 'js', 'assets']) fs.cpSync(path.join(SRC, dir), path.join(DST, dir), { recursive: true });
console.log('game/ pronto per electron-builder');
