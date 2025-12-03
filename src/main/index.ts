import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeminiManager } from './gemini';

// main process entry point
// sets up the electron window and initializes the gemini manager.

// esm helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env['DIST'] = join(__dirname, '../../dist');
process.env['VITE_PUBLIC'] = app.isPackaged
  ? process.env['DIST']
  : join(process.env['DIST'], '../public');

let win: BrowserWindow | null;
let geminiManager: GeminiManager | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
  });

  geminiManager = new GeminiManager(win);

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const dist = process.env['DIST'] || '';
    win.loadFile(join(dist, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (geminiManager) {
    geminiManager.kill();
  }
  win = null;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  createWindow();
});
