/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message: string) => ipcRenderer.invoke('chat-message', message),
  onResponse: (callback: (response: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_event: any, response: string) => callback(response);
    ipcRenderer.on('agent-response', subscription);
    return () => {
      ipcRenderer.removeListener('agent-response', subscription);
    };
  },
});
