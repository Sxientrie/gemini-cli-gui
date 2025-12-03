var P = Object.defineProperty;
var f = (t, o, e) => o in t ? P(t, o, { enumerable: !0, configurable: !0, writable: !0, value: e }) : t[o] = e;
var d = (t, o, e) => f(t, typeof o != "symbol" ? o + "" : o, e);
import { app as r, BrowserWindow as w, ipcMain as h } from "electron";
import { dirname as y, join as l } from "node:path";
import { fileURLToPath as v } from "node:url";
import { createRequire as E } from "node:module";
import { EventEmitter as T } from "node:events";
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const a = E(import.meta.url), I = a("node-pty");
class R extends T {
  constructor() {
    super();
    d(this, "ptyProcess", null);
  }
  spawn() {
    if (!this.ptyProcess)
      try {
        let e;
        try {
          e = a.resolve("@google/gemini-cli/bundle/gemini.js");
        } catch {
          try {
            e = a.resolve("@google/gemini-cli");
          } catch (n) {
            console.error("Could not resolve @google/gemini-cli", n);
            return;
          }
        }
        const c = {
          ...process.env,
          FORCE_COLOR: "1"
        };
        console.log("Spawning PTY with CLI path:", e), this.ptyProcess = I.spawn("node", [e, "chat"], {
          name: "xterm-256color",
          cols: 80,
          rows: 24,
          cwd: process.cwd(),
          env: c
        }), this.ptyProcess.onData((n) => {
          this.emit("data", n);
        }), this.ptyProcess.onExit(
          ({ exitCode: n, signal: p }) => {
            console.log(`PTY process exited with code ${n} signal ${p}`), this.ptyProcess = null, this.emit("exit", { exitCode: n, signal: p });
          }
        );
      } catch (e) {
        console.error("Failed to spawn PTY:", e);
      }
  }
  write(e) {
    this.ptyProcess && this.ptyProcess.write(e);
  }
  resize(e, c) {
    if (this.ptyProcess)
      try {
        this.ptyProcess.resize(e, c);
      } catch (n) {
        console.error("Error resizing PTY:", n);
      }
  }
  kill() {
    this.ptyProcess && (this.ptyProcess.kill(), this.ptyProcess = null);
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const _ = v(import.meta.url), u = y(_);
process.env.DIST = l(u, "../../dist");
process.env.VITE_PUBLIC = r.isPackaged ? process.env.DIST : l(process.env.DIST, "../public");
let s, i = null;
const m = process.env.VITE_DEV_SERVER_URL;
function g() {
  if (s = new w({
    width: 1200,
    height: 800,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: l(u, "../preload/index.js"),
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: !0
  }), s.webContents.on("did-finish-load", () => {
    s == null || s.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
  }), m)
    s.loadURL(m);
  else {
    const t = process.env.DIST || "";
    s.loadFile(l(t, "index.html"));
  }
}
r.on("window-all-closed", () => {
  i && i.kill(), s = null, process.platform !== "darwin" && r.quit();
});
r.on("activate", () => {
  w.getAllWindows().length === 0 && g();
});
r.whenReady().then(() => {
  g(), i = new R(), i.spawn(), i.on("data", (t) => {
    s && s.webContents.send("terminal:output", t);
  }), i.on("exit", ({ exitCode: t }) => {
    console.log("PTY exited", t), s && s.webContents.send("terminal:output", `
[Process exited with code ${t}]
`);
  }), h.handle("terminal:input", (t, o) => {
    i && i.write(o);
  }), h.handle("terminal:resize", (t, o, e) => {
    i && i.resize(o, e);
  });
});
