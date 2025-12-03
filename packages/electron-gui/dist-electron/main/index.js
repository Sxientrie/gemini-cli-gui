import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as pty from "node-pty";
import { platform } from "node:os";
class TerminalManager {
  ptyProcess = null;
  mainWindow;
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }
  create(rows = 24, cols = 80, cwd = process.cwd()) {
    const systemShell = process.env["SHELL"] || (platform() === "win32" ? "powershell.exe" : "bash");
    try {
      this.ptyProcess = pty.spawn(systemShell, [], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: process.env
      });
      this.ptyProcess.onData((data) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send("terminal:incoming", data);
        }
      });
      console.log(`Created terminal process with PID: ${this.ptyProcess.pid}`);
    } catch (e) {
      console.error("Failed to create terminal:", e);
    }
  }
  write(data) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }
  resize(cols, rows) {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch (e) {
        console.error("Error resizing terminal:", e);
      }
    }
  }
  kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = dirname(__filename$1);
const execAsync = promisify(exec);
process.env["DIST"] = join(__dirname$1, "../../dist");
process.env["VITE_PUBLIC"] = app.isPackaged ? process.env["DIST"] : join(process.env["DIST"], "../public");
let win;
let terminalManager = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
async function checkGeminiCli() {
  try {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "where gemini" : "which gemini";
    await execAsync(cmd);
    console.log("Gemini CLI found.");
    return true;
  } catch (error) {
    console.warn("Gemini CLI not found:", error);
    if (win) {
      dialog.showMessageBox(win, {
        type: "warning",
        title: "Gemini CLI Not Found",
        message: "The `gemini` command was not found in your PATH. Please ensure it is installed to use all features.",
        buttons: ["OK"]
      });
    }
    return false;
  }
}
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: join(__dirname$1, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true
  });
  terminalManager = new TerminalManager(win);
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const dist = process.env["DIST"] || "";
    win.loadFile(join(dist, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (terminalManager) {
    terminalManager.kill();
  }
  win = null;
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(async () => {
  createWindow();
  await checkGeminiCli();
  ipcMain.on("terminal:create", (event, { cols, rows }) => {
    if (terminalManager) {
      terminalManager.create(rows, cols);
    }
  });
  ipcMain.on("terminal:write", (event, data) => {
    if (terminalManager) {
      terminalManager.write(data);
    }
  });
  ipcMain.on("terminal:resize", (event, { cols, rows }) => {
    if (terminalManager) {
      terminalManager.resize(cols, rows);
    }
  });
});
