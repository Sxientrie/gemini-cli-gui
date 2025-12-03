import { app as a, BrowserWindow as m, ipcMain as v } from "electron";
import { dirname as I, join as l } from "node:path";
import { fileURLToPath as y } from "node:url";
import { GeminiEventType as d, executeToolCall as S, Config as D } from "@google/gemini-cli-core";
async function R() {
  const o = process.cwd(), e = new D({
    sessionId: "electron-session-" + Date.now(),
    targetDir: o,
    debugMode: !0,
    model: "gemini-2.0-flash-001",
    cwd: o
  });
  return await e.initialize(), e;
}
let i = null, p = null;
async function _(o, e) {
  try {
    i || (i = await R()), p || (p = i.getGeminiClient());
    const t = new AbortController(), c = "prompt-" + Date.now(), h = [{ text: o }], E = p.sendMessageStream(
      h,
      t.signal,
      c
    );
    for await (const s of E)
      if (s.type === d.Content)
        s.value && e.send("agent-response", s.value);
      else if (s.type === d.ToolCallRequest) {
        const g = s.value;
        e.send(
          "agent-response",
          `
[Tool Call: ${g.name}]
`
        );
        try {
          const r = await S(
            i,
            g,
            t.signal
          );
          e.send(
            "agent-response",
            `
[Tool Result: ${JSON.stringify(r.response.resultDisplay)}]
`
          );
        } catch (r) {
          const T = r instanceof Error ? r.message : String(r);
          e.send(
            "agent-response",
            `
[Tool Error: ${T}]
`
          );
        }
      } else s.type === d.Error && e.send(
        "agent-response",
        `
Error: ${s.value.error.message}
`
      );
  } catch (t) {
    console.error(t);
    const c = t instanceof Error ? t.message : String(t);
    e.send("agent-response", `Error: ${c}`);
  }
}
const C = y(import.meta.url), u = I(C);
process.env.DIST = l(u, "../../dist");
process.env.VITE_PUBLIC = a.isPackaged ? process.env.DIST : l(process.env.DIST, "../public");
let n;
const f = process.env.VITE_DEV_SERVER_URL;
function w() {
  if (n = new m({
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
  }), n.webContents.on("did-finish-load", () => {
    n?.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
  }), f)
    n.loadURL(f);
  else {
    const o = process.env.DIST || "";
    n.loadFile(l(o, "index.html"));
  }
}
a.on("window-all-closed", () => {
  n = null, process.platform !== "darwin" && a.quit();
});
a.on("activate", () => {
  m.getAllWindows().length === 0 && w();
});
a.whenReady().then(() => {
  w(), v.handle("chat-message", async (o, e) => {
    n && await _(e, n.webContents);
  });
});
