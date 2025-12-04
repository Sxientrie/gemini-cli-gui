import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, SendPromptPayload, GeminiEvent, GeminiSession, GeminiStatus } from '../shared/types';

// preload script
// exposes a safe api to the renderer process via contextbridge.

contextBridge.exposeInMainWorld('api', {
  sendPrompt: (payload: SendPromptPayload) => {
    ipcRenderer.send(IPC_CHANNELS.SEND_PROMPT, payload);
  },
  stopGeneration: () => {
    ipcRenderer.send(IPC_CHANNELS.STOP_GENERATION);
  },
  listSessions: () => {
    ipcRenderer.send(IPC_CHANNELS.LIST_SESSIONS);
  },
  onStreamEvent: (callback: (event: GeminiEvent) => void) => {
    const subscription = (_: any, event: GeminiEvent) => callback(event);
    ipcRenderer.on(IPC_CHANNELS.ON_STREAM_EVENT, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_STREAM_EVENT, subscription);
    };
  },
  onError: (callback: (error: any) => void) => {
    const subscription = (_: any, error: any) => callback(error);
    ipcRenderer.on(IPC_CHANNELS.ON_ERROR, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_ERROR, subscription);
    };
  },
  onSessions: (callback: (sessions: GeminiSession[]) => void) => {
    const subscription = (_: any, sessions: GeminiSession[]) => callback(sessions);
    ipcRenderer.on(IPC_CHANNELS.ON_SESSIONS, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_SESSIONS, subscription);
    };
  },
  chooseFolder: () => ipcRenderer.invoke(IPC_CHANNELS.CHOOSE_FOLDER),
  onStatusChange: (callback: (status: GeminiStatus) => void) => {
    const subscription = (_: any, status: GeminiStatus) => callback(status);
    ipcRenderer.on(IPC_CHANNELS.ON_STATUS_CHANGE, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_STATUS_CHANGE, subscription);
    };
  },
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS),
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VERSION),

  // auth
  auth: {
    hasKey: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_HAS_KEY),
    saveKey: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_SAVE_KEY, key),
    clearKey: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_CLEAR_KEY),
  },

  // database operations
  db: {
    getSessions: () => ipcRenderer.invoke('db:get-sessions'),
    getSession: (sessionId: string) => ipcRenderer.invoke('db:get-session', sessionId),
    createSession: (data: { id: string; title: string; createdAt: Date; status?: 'active' | 'archived' }) =>
      ipcRenderer.invoke('db:create-session', data),
    updateSession: (sessionId: string, data: Partial<{ title: string; status: 'active' | 'archived' }>) =>
      ipcRenderer.invoke('db:update-session', sessionId, data),
    deleteSession: (sessionId: string) => ipcRenderer.invoke('db:delete-session', sessionId),
    getThoughts: (sessionId: string) => ipcRenderer.invoke('db:get-thoughts', sessionId),
    saveThought: (data: { id: string; sessionId: string; type: string; content: string; timestamp: Date }) =>
      ipcRenderer.invoke('db:save-thought', data),
    saveThoughts: (data: Array<{ id: string; sessionId: string; type: string; content: string; timestamp: Date }>) =>
      ipcRenderer.invoke('db:save-thoughts', data),
  },
});
