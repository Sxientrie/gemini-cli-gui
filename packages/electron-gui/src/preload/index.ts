/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing Chat API (Optional / Legacy)
  sendMessage: (message: string) => ipcRenderer.invoke('chat-message', message),
  onResponse: (callback: (response: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_event: any, response: string) => callback(response);
    ipcRenderer.on('agent-response', subscription);
    return () => {
      ipcRenderer.removeListener('agent-response', subscription);
    };
  },

  // Terminal API
  createTerminal: (cols: number, rows: number) =>
    ipcRenderer.send('terminal:create', { cols, rows }),
  writeToTerminal: (data: string) => ipcRenderer.send('terminal:write', data),
  resizeTerminal: (cols: number, rows: number) =>
    ipcRenderer.send('terminal:resize', { cols, rows }),
  onTerminalData: (callback: (data: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_event: any, data: string) => callback(data);
    ipcRenderer.on('terminal:incoming', subscription);
    return () => {
      ipcRenderer.removeListener('terminal:incoming', subscription);
    };
  },
});
