'use strict';
const o = require('electron'),
  l = require('node:path'),
  i = require('@google/gemini-cli-core');
async function h() {
  const s = process.cwd(),
    e = new i.Config({
      sessionId: 'electron-session-' + Date.now(),
      targetDir: s,
      debugMode: !0,
      model: 'gemini-2.0-flash-001',
      cwd: s,
    });
  return (await e.initialize(), e);
}
let a = null,
  d = null;
async function v(s, e) {
  try {
    (a || (a = await h()), d || (d = a.getGeminiClient()));
    const r = new AbortController(),
      f = 'prompt-' + Date.now(),
      w = [{ text: s }],
      m = d.sendMessageStream(w, r.signal, f);
    for await (const t of m)
      if (t.type === i.GeminiEventType.Content)
        t.value && e.send('agent-response', t.value);
      else if (t.type === i.GeminiEventType.ToolCallRequest) {
        const p = t.value;
        e.send(
          'agent-response',
          `
[Tool Call: ${p.name}]
`,
        );
        try {
          const c = await i.executeToolCall(a, p, r.signal);
          e.send(
            'agent-response',
            `
[Tool Result: ${JSON.stringify(c.response.resultDisplay)}]
`,
          );
        } catch (c) {
          e.send(
            'agent-response',
            `
[Tool Error: ${c.message}]
`,
          );
        }
      } else
        t.type === i.GeminiEventType.Error &&
          e.send(
            'agent-response',
            `
Error: ${t.value.error.message}
`,
          );
  } catch (r) {
    (console.error(r), e.send('agent-response', `Error: ${r.message}`));
  }
}
process.env.DIST = l.join(__dirname, '../../dist');
process.env.VITE_PUBLIC = o.app.isPackaged
  ? process.env.DIST
  : l.join(process.env.DIST, '../public');
let n;
const g = process.env.VITE_DEV_SERVER_URL;
function u() {
  if (
    ((n = new o.BrowserWindow({
      width: 1200,
      height: 800,
      backgroundColor: '#09090b',
      webPreferences: {
        preload: l.join(__dirname, '../preload/index.js'),
        contextIsolation: !0,
        nodeIntegration: !1,
      },
      titleBarStyle: 'hiddenInset',
      autoHideMenuBar: !0,
    })),
    n.webContents.on('did-finish-load', () => {
      n?.webContents.send('main-process-message', new Date().toLocaleString());
    }),
    g)
  )
    n.loadURL(g);
  else {
    const s = process.env.DIST || '';
    n.loadFile(l.join(s, 'index.html'));
  }
}
o.app.on('window-all-closed', () => {
  ((n = null), process.platform !== 'darwin' && o.app.quit());
});
o.app.on('activate', () => {
  o.BrowserWindow.getAllWindows().length === 0 && u();
});
o.app.whenReady().then(() => {
  (u(),
    o.ipcMain.handle('chat-message', async (s, e) => {
      n && (await v(e, n.webContents));
    }));
});
