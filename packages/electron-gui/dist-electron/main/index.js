import { app as o, BrowserWindow as d, ipcMain as l, dialog as f } from "electron";
import { dirname as u, join as r } from "node:path";
import { fileURLToPath as y } from "node:url";
import { exec as g } from "node:child_process";
import { promisify as P } from "node:util";
import * as I from "node-pty";
import { platform as v } from "os";
class E {
  ptyProcess = null;
  mainWindow;
  constructor(e) {
    this.mainWindow = e;
  }
  create(e = 24, s = 80, a = process.cwd()) {
    const h = process.env.SHELL || (v() === "win32" ? "powershell.exe" : "bash");
    try {
      this.ptyProcess = I.spawn(h, [], {
        name: "xterm-256color",
        cols: s,
        rows: e,
        cwd: a,
        env: process.env
      }), this.ptyProcess.onData((c) => {
        this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents.send("terminal:incoming", c);
      }), console.log(`Created terminal process with PID: ${this.ptyProcess.pid}`);
    } catch (c) {
      console.error("Failed to create terminal:", c);
    }
  }
  write(e) {
    this.ptyProcess && this.ptyProcess.write(e);
  }
  resize(e, s) {
    if (this.ptyProcess)
      try {
        this.ptyProcess.resize(e, s);
      } catch (a) {
        console.error("Error resizing terminal:", a);
      }
  }
  kill() {
    this.ptyProcess && (this.ptyProcess.kill(), this.ptyProcess = null);
  }
}
const L = y(import.meta.url), p = u(L), T = P(g);
process.env.DIST = r(p, "../../dist");
process.env.VITE_PUBLIC = o.isPackaged ? process.env.DIST : r(process.env.DIST, "../public");
let i, n = null;
const m = process.env.VITE_DEV_SERVER_URL;
async function _() {
  try {
    const e = process.platform === "win32" ? "where gemini" : "which gemini";
    return await T(e), console.log("Gemini CLI found."), !0;
  } catch (t) {
    return console.warn("Gemini CLI not found:", t), i && f.showMessageBox(i, {
      type: "warning",
      title: "Gemini CLI Not Found",
      message: "The `gemini` command was not found in your PATH. Please ensure it is installed to use all features.",
      buttons: ["OK"]
    }), !1;
  }
}
function w() {
  if (i = new d({
    width: 1200,
    height: 800,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: r(p, "../preload/index.js"),
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: !0
  }), n = new E(i), i.webContents.on("did-finish-load", () => {
    i?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), m)
    i.loadURL(m);
  else {
    const t = process.env.DIST || "";
    i.loadFile(r(t, "index.html"));
  }
}
o.on("window-all-closed", () => {
  n && n.kill(), i = null, process.platform !== "darwin" && o.quit();
});
o.on("activate", () => {
  d.getAllWindows().length === 0 && w();
});
o.whenReady().then(async () => {
  w(), await _(), l.on("terminal:create", (t, { cols: e, rows: s }) => {
    n && n.create(s, e);
  }), l.on("terminal:write", (t, e) => {
    n && n.write(e);
  }), l.on("terminal:resize", (t, { cols: e, rows: s }) => {
    n && n.resize(e, s);
  });
});
