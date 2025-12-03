"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (message) => electron.ipcRenderer.invoke("chat-message", message),
  onResponse: (callback) => {
    const subscription = (_event, response) => callback(response);
    electron.ipcRenderer.on("agent-response", subscription);
    return () => {
      electron.ipcRenderer.removeListener("agent-response", subscription);
    };
  }
});
