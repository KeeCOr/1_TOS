const { app, BrowserWindow, dialog, protocol, net, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');
const { pathToFileURL } = require('url');

const OUT_DIR = path.join(__dirname, '..', 'out');

// TODO: Replace 480 with actual Steam App ID before release
const STEAM_APP_ID = 480;
let steam = null;
try {
  steam = require('steamworks.js');
  steam.init(STEAM_APP_ID);
  console.log('[Steam] Initialized, user:', steam.localplayer.getName());
} catch (e) {
  console.warn('[Steam] Not available:', e.message);
}

// ── Steam IPC ──────────────────────────────────────────────────────────────
ipcMain.on('steam:available',   e => { e.returnValue = steam !== null; });
ipcMain.on('steam:getUserName', e => { e.returnValue = steam ? steam.localplayer.getName() : null; });
ipcMain.handle('achievement:unlock', async (_, id) => {
  if (!steam) return false;
  try { steam.achievement.activate(id); return true; } catch { return false; }
});
ipcMain.on('achievement:isUnlocked', (e, id) => {
  e.returnValue = steam ? steam.achievement.isActivated(id) : false;
});
ipcMain.handle('steamCloud:save', async (_, key, data) => {
  if (!steam) return false;
  try { steam.cloud.writeFile(key, Buffer.from(JSON.stringify(data), 'utf-8')); return true; } catch { return false; }
});
ipcMain.handle('steamCloud:load', async (_, key) => {
  if (!steam) return null;
  try { return JSON.parse(steam.cloud.readFile(key).toString('utf-8')); } catch { return null; }
});
// ──────────────────────────────────────────────────────────────────────────

// app:// 커스텀 프로토콜 등록 — app.ready 전에 호출해야 함
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    resizable: false,
    title: 'T of Sword',
    backgroundColor: '#030712',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
    show: false,
  });

  win.once('ready-to-show', () => {
    win.center();
    win.show();
  });

  const indexPath = path.join(OUT_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      'T of Sword — 오류',
      `게임 파일을 찾을 수 없습니다.\n경로: ${indexPath}`
    );
    app.quit();
    return;
  }

  win.loadURL('app:///index.html').catch(err => {
    dialog.showErrorBox('T of Sword — 로딩 오류', String(err));
    app.quit();
  });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    dialog.showErrorBox('T of Sword — 페이지 로딩 실패', `${code}: ${desc}`);
  });
}

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    try {
      const url = new URL(request.url);
      const relPath = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
      const filePath = path.join(OUT_DIR, relPath);
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      return new Response(`Not found: ${err}`, { status: 404 });
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
