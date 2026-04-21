const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: 'T of Sword',
    backgroundColor: '#030712',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Show window only when content is ready (prevents white flash)
  win.once('ready-to-show', () => win.show());

  // Resolve index.html — works both in asar and win-unpacked
  const indexPath = path.join(__dirname, '..', 'out', 'index.html');

  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      'T of Sword — 오류',
      `게임 파일을 찾을 수 없습니다.\n경로: ${indexPath}`
    );
    app.quit();
    return;
  }

  win.loadFile(indexPath).catch(err => {
    dialog.showErrorBox('T of Sword — 로딩 오류', String(err));
    app.quit();
  });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    dialog.showErrorBox('T of Sword — 페이지 로딩 실패', `${code}: ${desc}\n경로: ${indexPath}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
