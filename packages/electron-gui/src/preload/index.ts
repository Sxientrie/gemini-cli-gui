/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendInput: (data: string) => ipcRenderer.invoke('terminal:input', data),
  resizeTerminal: (cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', cols, rows),
  onTerminalData: (callback: (data: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_event: any, data: string) => callback(data);
    ipcRenderer.on('terminal:output', subscription);
    return () => {
      ipcRenderer.removeListener('terminal:output', subscription);
    };
  },
});
