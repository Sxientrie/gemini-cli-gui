import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message: string) => ipcRenderer.invoke('chat-message', message),
  onResponse: (callback: (response: string) => void) => {
    const subscription = (_event: any, response: string) => callback(response)
    ipcRenderer.on('agent-response', subscription)
    return () => {
      ipcRenderer.removeListener('agent-response', subscription)
    }
  },
})
