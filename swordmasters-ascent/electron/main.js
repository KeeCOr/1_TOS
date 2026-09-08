const { app, BrowserWindow, dialog } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'out');
let staticServer = null;

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    staticServer = http.createServer((req, res) => {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^[/\\]+/, '');
      const file = path.resolve(OUT_DIR, relative);
      if (!file.startsWith(OUT_DIR + path.sep) && file !== OUT_DIR) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); return res.end(); }
        res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    staticServer.once('error', reject);
    staticServer.listen(0, '127.0.0.1', () => resolve(staticServer.address().port));
  });
}

async function createWindow() {
  const indexPath = path.join(OUT_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) { dialog.showErrorBox('T of Sword load error', `Missing game file: ${indexPath}`); app.quit(); return; }
  const port = await startStaticServer();
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 1280, minHeight: 720, resizable: false,
    title: 'T of Sword', backgroundColor: '#030712',
    webPreferences: { nodeIntegration: false, contextIsolation: true }, autoHideMenuBar: true, show: false,
  });
  win.once('ready-to-show', () => { win.center(); win.show(); });
  win.loadURL(`http://127.0.0.1:${port}/`).catch(err => { dialog.showErrorBox('T of Sword load error', String(err)); app.quit(); });
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (staticServer) staticServer.close(); });
