"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Existing Chat API (Optional / Legacy)
  sendMessage: (message) => electron.ipcRenderer.invoke("chat-message", message),
  onResponse: (callback) => {
    const subscription = (_event, response) => callback(response);
    electron.ipcRenderer.on("agent-response", subscription);
    return () => {
      electron.ipcRenderer.removeListener("agent-response", subscription);
    };
  },
  // Terminal API
  createTerminal: (cols, rows) => electron.ipcRenderer.send("terminal:create", { cols, rows }),
  writeToTerminal: (data) => electron.ipcRenderer.send("terminal:write", data),
  resizeTerminal: (cols, rows) => electron.ipcRenderer.send("terminal:resize", { cols, rows }),
  onTerminalData: (callback) => {
    const subscription = (_event, data) => callback(data);
    electron.ipcRenderer.on("terminal:incoming", subscription);
    return () => {
      electron.ipcRenderer.removeListener("terminal:incoming", subscription);
    };
  }
});
