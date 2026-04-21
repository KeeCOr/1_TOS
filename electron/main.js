const { app, BrowserWindow, dialog, session } = require('electron');
const path = require('path');
const fs   = require('fs');
const { pathToFileURL } = require('url');

const OUT_DIR = path.join(__dirname, '..', 'out');

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

  // Show window only when content is ready (prevents white flash)
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

  win.loadFile(indexPath).catch(err => {
    dialog.showErrorBox('T of Sword — 로딩 오류', String(err));
    app.quit();
  });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    dialog.showErrorBox('T of Sword — 페이지 로딩 실패', `${code}: ${desc}\n경로: ${indexPath}`);
  });
}

app.whenReady().then(() => {
  // file:// 로드 시 /chars/, /bg/, /enemy/ 같은 절대 경로가
  // 파일시스템 루트로 해석되는 문제를 out/ 디렉토리로 리다이렉트해서 수정
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['file:///chars/*', 'file:///bg/*', 'file:///enemy/*'] },
    (details, callback) => {
      try {
        const webPath = decodeURIComponent(new URL(details.url).pathname);
        const filePath = path.join(OUT_DIR, webPath);
        callback({ redirectURL: pathToFileURL(filePath).toString() });
      } catch {
        callback({});
      }
    }
  );

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
