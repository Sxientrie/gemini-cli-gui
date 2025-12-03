/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pty from 'node-pty';
import { platform } from 'os';
import { BrowserWindow } from 'electron';

export class TerminalManager {
  private ptyProcess: pty.IPty | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  create(rows: number = 24, cols: number = 80, cwd: string = process.cwd()) {
    // Better logic: use process.env.SHELL or fallback.
    const systemShell = process.env['SHELL'] || (platform() === 'win32' ? 'powershell.exe' : 'bash');

    try {
      this.ptyProcess = pty.spawn(systemShell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: process.env as { [key: string]: string },
      });

      this.ptyProcess.onData((data: string) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('terminal:incoming', data);
        }
      });

      console.log(`Created terminal process with PID: ${this.ptyProcess.pid}`);
    } catch (e) {
      console.error('Failed to create terminal:', e);
    }
  }

  write(data: string) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols: number, rows: number) {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch (e) {
        console.error('Error resizing terminal:', e);
      }
    }
  }

  kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}
