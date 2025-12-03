"use strict";const n=require("electron");/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */n.contextBridge.exposeInMainWorld("electronAPI",{sendInput:e=>n.ipcRenderer.invoke("terminal:input",e),resizeTerminal:(e,r)=>n.ipcRenderer.invoke("terminal:resize",e,r),onTerminalData:e=>{const r=(i,t)=>e(t);return n.ipcRenderer.on("terminal:output",r),()=>{n.ipcRenderer.removeListener("terminal:output",r)}}});
