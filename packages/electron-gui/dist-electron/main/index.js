import { app, BrowserWindow, ipcMain } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GeminiEventType, executeToolCall, Config } from "@google/gemini-cli-core";
async function createConfig() {
  const cwd = process.cwd();
  const config2 = new Config({
    sessionId: "electron-session-" + Date.now(),
    targetDir: cwd,
    debugMode: true,
    model: "gemini-2.0-flash-001",
    cwd
  });
  await config2.initialize();
  return config2;
}
let config = null;
let client = null;
async function handleAgentMessage(message, webContents) {
  try {
    if (!config) {
      config = await createConfig();
    }
    if (!client) {
      client = config.getGeminiClient();
    }
    const abortController = new AbortController();
    const promptId = "prompt-" + Date.now();
    const parts = [{ text: message }];
    const responseStream = client.sendMessageStream(
      parts,
      abortController.signal,
      promptId
    );
    for await (const event of responseStream) {
      if (event.type === GeminiEventType.Content) {
        if (event.value) {
          webContents.send("agent-response", event.value);
        }
      } else if (event.type === GeminiEventType.ToolCallRequest) {
        const requestInfo = event.value;
        webContents.send(
          "agent-response",
          `
[Tool Call: ${requestInfo.name}]
`
        );
        try {
          const completedToolCall = await executeToolCall(
            config,
            requestInfo,
            abortController.signal
          );
          webContents.send(
            "agent-response",
            `
[Tool Result: ${JSON.stringify(completedToolCall.response.resultDisplay)}]
`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          webContents.send(
            "agent-response",
            `
[Tool Error: ${errorMessage}]
`
          );
        }
      } else if (event.type === GeminiEventType.Error) {
        webContents.send(
          "agent-response",
          `
Error: ${event.value.error.message}
`
        );
      }
    }
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    webContents.send("agent-response", `Error: ${errorMessage}`);
  }
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = dirname(__filename$1);
process.env["DIST"] = join(__dirname$1, "../../dist");
process.env["VITE_PUBLIC"] = app.isPackaged ? process.env["DIST"] : join(process.env["DIST"], "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
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
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const dist = process.env["DIST"] || "";
    win.loadFile(join(dist, "index.html"));
  }
}
app.on("window-all-closed", () => {
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
app.whenReady().then(() => {
  createWindow();
  ipcMain.handle("chat-message", async (event, message) => {
    if (win) {
      await handleAgentMessage(message, win.webContents);
    }
  });
});
