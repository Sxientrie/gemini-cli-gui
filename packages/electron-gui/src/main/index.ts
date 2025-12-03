/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { TerminalManager } from './terminal-manager.js';

// ESM helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

process.env['DIST'] = join(__dirname, '../../dist');
process.env['VITE_PUBLIC'] = app.isPackaged
  ? process.env['DIST']
  : join(process.env['DIST'], '../public');

let win: BrowserWindow | null;
let terminalManager: TerminalManager | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

async function checkGeminiCli() {
  try {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'where gemini' : 'which gemini';
    await execAsync(cmd);
    console.log('Gemini CLI found.');
    return true;
  } catch (error) {
    console.warn('Gemini CLI not found:', error);
    if (win) {
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'Gemini CLI Not Found',
        message:
          'The `gemini` command was not found in your PATH. Please ensure it is installed to use all features.',
        buttons: ['OK'],
      });
    }
    return false;
  }
}

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

  terminalManager = new TerminalManager(win);

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
  if (terminalManager) {
    terminalManager.kill();
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
  await checkGeminiCli();

  ipcMain.on('terminal:create', (event, { cols, rows }) => {
    if (terminalManager) {
      terminalManager.create(rows, cols);
    }
  });

  ipcMain.on('terminal:write', (event, data) => {
    if (terminalManager) {
      terminalManager.write(data);
    }
  });

  ipcMain.on('terminal:resize', (event, { cols, rows }) => {
    if (terminalManager) {
      terminalManager.resize(cols, rows);
    }
  });
});
