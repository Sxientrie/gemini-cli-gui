# deep-dive.md

## architecture overview

system implements "sidecar" pattern. electron main process acts as orchestrator for external `@google/gemini-cli` binary. renderer is dumb view layer.

**topology:**
1.  **main process:** node.js environment. manages window lifecycle. owns `GeminiManager` instance. responsible for spawning/killing cli process and piping stdio.
2.  **sidecar:** separate os process (`gemini`). communicates via jsonl over stdout/stdin.
3.  **renderer:** react application. isolated context. communicates with main via ipc bridge. no direct access to node primitives.

## tech stack

**core:**
-   **runtime:** electron 30.0.1
-   **bundler:** vite 5.2.8
-   **process mgmt:** execa 9.0.0

**frontend:**
-   **framework:** react 18.3.1 (note: docs mention 19, code is 18)
-   **styling:** tailwindcss 3.4.3 (note: docs mention 4, code is 3)
-   **highlighting:** react-syntax-highlighter
-   **editor:** @monaco-editor/react

**protocol:**
-   **inter-process:** ipc (electron)
-   **serialization:** zod (schema validation)

## file map

critical logic paths only.

```text
src/
├── main/
│   ├── index.ts          // entry point. initializes window & gemini manager.
│   └── gemini.ts         // service. handles child process spawning, stdio parsing, lifecycle.
├── preload/
│   └── index.ts          // bridge. exposes sanitized api methods (sendPrompt, onStreamEvent).
├── renderer/
│   ├── App.tsx           // layout. manages active tab state.
│   ├── hooks/
│   │   └── useGemini.ts  // controller. manages chat state, message history, ipc listeners.
│   └── components/
│       └── Chat.tsx      // view. renders message list & input.
└── shared/
    └── types.ts          // contract. shared zod schemas & ipc channel constants.
````

## logic mapping (data flow)

**user prompt -\> response:**

1.  **trigger:** user types in `Chat.tsx`, hits send. calls `sendPrompt` from `useGemini` hook.
2.  **bridge:** `window.api.sendPrompt` invokes `ipcRenderer.send('gemini:prompt')`.
3.  **routing:** `ipcMain` handler in `main/gemini.ts` receives payload.
4.  **execution:** `GeminiManager` checks for active process. if null, spawns `gemini --output-format stream-json`.
5.  **input:** prompt written to child process `stdin`.
6.  **processing:** cli processes input, streams chunks to `stdout`.
7.  **parsing:** `GeminiManager` uses `readline` interface to parse `stdout` line-by-line.
8.  **relay:** valid json lines parsed into `GeminiEvent`. sent to renderer via `webContents.send('gemini:stream-event')`.
9.  **render:** `useGemini` listener receives event. updates `messages` state array. `Chat` component re-renders.

## tech debt & risks

1.  **spec divergence:** `docs/Electron Gemini CLI Sidecar Architecture.md` describes a stack (react 19, tailwind 4, sqlite/drizzle) that does not match actual implementation (react 18, tailwind 3, no db).
2.  **path resolution:** `main/gemini.ts` uses bare `execa('gemini')`. relies on system PATH visibility within electron environment. high failure risk on macos/linux guis where PATH is stripped.
3.  **state volatility:** session history is currently memory-only (array in `useGemini`). lost on reload. cli list-sessions capability exists but integration is shallow.
4.  **zombie processes:** reliance on `process.kill()` without rigorous signal handling might leave orphaned cli processes if electron crashes hard.
5.  **type duplication:** manual interfaces in `electron.d.ts` mirror `preload/index.ts` but aren't strictly derived, risking drift.