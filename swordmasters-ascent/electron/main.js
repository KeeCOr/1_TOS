const { app, BrowserWindow, dialog, protocol, net } = require('electron');
const path = require('path');
const fs   = require('fs');
const { pathToFileURL } = require('url');

const OUT_DIR = path.join(__dirname, '..', 'out');

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

  // app:// 프로토콜로 로드 — 절대 경로(/chars/... 등)가 out/ 기준으로 해석됨
  win.loadURL('app:///index.html').catch(err => {
    dialog.showErrorBox('T of Sword — 로딩 오류', String(err));
    app.quit();
  });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    dialog.showErrorBox('T of Sword — 페이지 로딩 실패', `${code}: ${desc}`);
  });
}

app.whenReady().then(() => {
  // app:// 요청을 모두 out/ 디렉토리에서 서빙
  // /chars/player.png → out/chars/player.png
  // /_next/static/... → out/_next/static/...
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
