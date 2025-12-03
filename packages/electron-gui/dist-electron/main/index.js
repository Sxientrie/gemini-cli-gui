import { app as r, BrowserWindow as h, ipcMain as p } from "electron";
import { dirname as u, join as l } from "node:path";
import { fileURLToPath as g } from "node:url";
import { createRequire as P } from "node:module";
import { EventEmitter as f } from "node:events";
const c = P(import.meta.url), y = c("node-pty");
class v extends f {
  ptyProcess = null;
  constructor() {
    super();
  }
  spawn() {
    if (!this.ptyProcess)
      try {
        let e;
        try {
          e = c.resolve("@google/gemini-cli/bundle/gemini.js");
        } catch {
          try {
            e = c.resolve("@google/gemini-cli");
          } catch (i) {
            console.error("Could not resolve @google/gemini-cli", i);
            return;
          }
        }
        const n = {
          ...process.env,
          FORCE_COLOR: "1"
        };
        console.log("Spawning PTY with CLI path:", e), this.ptyProcess = y.spawn("node", [e, "chat"], {
          name: "xterm-256color",
          cols: 80,
          rows: 24,
          cwd: process.cwd(),
          env: n
        }), this.ptyProcess.onData((i) => {
          this.emit("data", i);
        }), this.ptyProcess.onExit(
          ({ exitCode: i, signal: a }) => {
            console.log(`PTY process exited with code ${i} signal ${a}`), this.ptyProcess = null, this.emit("exit", { exitCode: i, signal: a });
          }
        );
      } catch (e) {
        console.error("Failed to spawn PTY:", e);
      }
  }
  write(e) {
    this.ptyProcess && this.ptyProcess.write(e);
  }
  resize(e, n) {
    if (this.ptyProcess)
      try {
        this.ptyProcess.resize(e, n);
      } catch (i) {
        console.error("Error resizing PTY:", i);
      }
  }
  kill() {
    this.ptyProcess && (this.ptyProcess.kill(), this.ptyProcess = null);
  }
}
const E = g(import.meta.url), m = u(E);
process.env.DIST = l(m, "../../dist");
process.env.VITE_PUBLIC = r.isPackaged ? process.env.DIST : l(process.env.DIST, "../public");
let o, t = null;
const d = process.env.VITE_DEV_SERVER_URL;
function w() {
  if (o = new h({
    width: 1200,
    height: 800,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: l(m, "../preload/index.js"),
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: !0
  }), o.webContents.on("did-finish-load", () => {
    o?.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
  }), d)
    o.loadURL(d);
  else {
    const s = process.env.DIST || "";
    o.loadFile(l(s, "index.html"));
  }
}
r.on("window-all-closed", () => {
  t && t.kill(), o = null, process.platform !== "darwin" && r.quit();
});
r.on("activate", () => {
  h.getAllWindows().length === 0 && w();
});
r.whenReady().then(() => {
  w(), t = new v(), t.spawn(), t.on("data", (s) => {
    o && o.webContents.send("terminal:output", s);
  }), t.on("exit", ({ exitCode: s }) => {
    console.log("PTY exited", s), o && o.webContents.send("terminal:output", `
[Process exited with code ${s}]
`);
  }), p.handle("terminal:input", (s, e) => {
    t && t.write(e);
  }), p.handle("terminal:resize", (s, e, n) => {
    t && t.resize(e, n);
  });
});
