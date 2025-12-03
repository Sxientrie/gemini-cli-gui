/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PtyManager } from './pty-manager.js';

// ESM helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ └─┬ preload
// │   └── index.js
// ├─┬ dist
// │ └── index.html

process.env['DIST'] = join(__dirname, '../../dist');
process.env['VITE_PUBLIC'] = app.isPackaged
  ? process.env['DIST']
  : join(process.env['DIST'], '../public');

let win: BrowserWindow | null;
let ptyManager: PtyManager | null = null;

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send(
      'main-process-message',
      new Date().toLocaleString(),
    );
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // Check if DIST is undefined, though it should be set above
    const dist = process.env['DIST'] || '';
    win.loadFile(join(dist, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (ptyManager) {
    ptyManager.kill();
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

app.whenReady().then(() => {
  createWindow();

  ptyManager = new PtyManager();
  ptyManager.spawn();

  ptyManager.on('data', (data: string) => {
    if (win) {
      win.webContents.send('terminal:output', data);
    }
  });

  ptyManager.on('exit', ({ exitCode }: { exitCode: number }) => {
    console.log('PTY exited', exitCode);
    if (win) {
      win.webContents.send('terminal:output', `\n[Process exited with code ${exitCode}]\n`);
    }
  });

  ipcMain.handle('terminal:input', (event, data: string) => {
    if (ptyManager) {
      ptyManager.write(data);
    }
  });

  ipcMain.handle('terminal:resize', (event, cols: number, rows: number) => {
    if (ptyManager) {
      ptyManager.resize(cols, rows);
    }
  });
});
