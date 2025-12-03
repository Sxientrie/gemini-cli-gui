# **Gemini Electron Sidecar: Technical Architecture & Specification Document**

## **1\. Architectural Vision and Executive Summary**

In the software development landscape of late 2025, the dichotomy between web-based agility and desktop-grade performance has largely dissolved, yet the specific requirements of developer tooling remain distinct. The "Gemini Electron Sidecar" is conceived not merely as a graphical interface, but as a high-performance orchestration layer—a "Cockpit"—that bridges the gap between the raw, pipe-based interoperability of the command line and the rich, interactive visualization capabilities of modern rendering engines.

The architecture proposed in this document is driven by a philosophy of "Boring Core, Bleeding Edge UI." For the critical data path—process spawning, inter-process communication (IPC), and persistence—we prioritize established, bulletproof technologies like SQLite and Node.js streams. This ensures that the application remains stable and responsive even when mediating high-throughput data from Large Language Models (LLMs). Conversely, the presentation layer adopts the most modern advancements available in December 2025, specifically the Rust-based Tailwind CSS v4 engine and the React 19 compiler-driven rendering model. This duality ensures the application is both robust enough for mission-critical workflows and flexible enough to offer a delight-inducing user experience.

This specification details the complete technical stack, directory structure, and implementation strategy for the Gemini Electron Sidecar. It addresses the specific challenges of the late 2025 ecosystem, including the critical V8 engine compatibility issues in Electron 39, the paradigm shift in CSS processing with Tailwind 4, and the strict security mandates required for applications that interact with system shells.

### **1.1 The Sidecar Pattern Defined**

The "Sidecar" pattern, traditionally associated with container orchestration (Kubernetes), has found a powerful analog in desktop development. In this context, the Electron application does not contain the business logic for the Gemini LLM interaction. Instead, it manages the lifecycle of an external binary—the Gemini CLI—treating it as a local microservice.

This architectural choice provides significant advantages over bundling the API logic directly into the Electron main process:

1. **Decoupling of Concerns:** The CLI tool (@google/gemini-cli) can be updated independently via standard package managers (npm install \-g), allowing the "Sidecar" GUI to benefit from logic updates without requiring a full application rebuild or redistribution.  
2. **Process Isolation:** The heavy computational work of parsing LLM responses, managing network sockets, and handling token streams occurs in a separate operating system process. If the CLI hangs or crashes, the GUI remains responsive, allowing the user to restart the session gracefully rather than experiencing a "White Screen of Death."  
3. **Security Boundaries:** By communicating via standard input/output (stdio) rather than direct function calls, the attack surface is minimized. The GUI strictly sanitizes inputs before passing them to the shell, and validates outputs before rendering them to the DOM.

The following sections will dissect every component of this architecture, justifying version selections against the specific release landscape of December 2025\.1

## ---

**2\. Technology Stack Selection and Validation**

The selection of software versions in late 2025 requires navigating a complex matrix of compatibility, particularly between the Node.js runtime bundled within Electron and native C++ modules like SQLite. The following stack has been validated for stability as of December 3, 2025\.

### **2.1 The Host Runtime: Electron 39**

Version: Electron 39.2.4 (Stable)  
Release Date: November 26, 2025 1  
Underlying Stack: Chromium 142, Node.js 22.21.1, V8 14.2 3  
Electron 39 is chosen as the foundational runtime. While Electron 40 is available in beta 4, the risk profile of a beta runtime is unacceptable for a "Boring Core" stability mandate. Electron 39 represents the "Long Term Support" equivalent for this development cycle, offering a stabilized integration of Node.js 22\.

Node.js 22 Integration:  
The inclusion of Node.js 22 is pivotal. This version introduces significant optimizations to the child\_process module, specifically improving the reliability of stdio piping on Windows systems—a critical requirement for our "Sidecar" mechanism. Furthermore, Node 22 includes a stable, native WebSocket client, reducing dependency bloat if the CLI interaction evolves beyond simple text streams.  
The V8 14.2 Compatibility Challenge:  
A critical architectural consideration for this project is the update to the V8 JavaScript engine (v14.2) included in Electron 39\. This version removed the v8::Context::GetIsolate() C++ API method, which had been deprecated for several major versions.5 This change is a "breaking change" for many native Node.js modules, most notably better-sqlite3, which relies on low-level V8 bindings for its synchronous performance.  
As documented in recent issue trackers, attempting to build older versions of better-sqlite3 (e.g., v12.4.x) against Electron 39 results in compilation failures.6 Therefore, this specification strictly mandates the use of **better-sqlite3 v12.5.0** or higher, which includes the necessary patches to use v8::Isolate::GetCurrent().7 This detail is non-negotiable for a successful build.

### **2.2 The Presentation Layer: React 19 and Tailwind CSS v4**

Framework: React v19.2.0  
Styling Engine: Tailwind CSS v4.0 (Stable) 8  
Bundler: Vite 7.2 9  
React 19:  
By late 2025, React 19 has solidified its position as the industry standard. The introduction of the React Compiler (React Forget) has eliminated the need for manual memoization (useMemo, useCallback) in 95% of use cases. For the Gemini Sidecar, this is particularly beneficial in the "Thought Cards" visualization. As tokens stream in from the CLI at high velocity (50-100 tokens per second), the React component tree must re-render frequently. The React Compiler ensures that only the specific text nodes changing are updated, without requiring the developer to implement complex memoization strategies that could degrade code readability.10  
Furthermore, the React 19 "Actions" API simplifies the interaction model for the "Interactive Approval Modals." Managing the pending state of an approval request (e.g., "Applying Diff...") is now handled natively by the framework, reducing the boilerplate state management code typically associated with async UI interactions.

Tailwind CSS v4:  
Tailwind v4 represents a massive architectural shift from version 3\. Written in Rust, the new engine is integrated directly into the build pipeline via the @tailwindcss/vite plugin.11

1. **Performance:** The engine compiles CSS up to 10x faster than the JavaScript-based v3, essentially making style regeneration instantaneous during development.12  
2. **Configuration:** The tailwind.config.js file is deprecated in favor of native CSS variables defined in an @theme block within the CSS entry point. This aligns with the "modernity" mindset of the persona, moving configuration closer to the web platform standards.  
3. **No PostCSS Dependency:** The Rust engine handles imports and nesting natively, removing the need for a separate PostCSS configuration file and simplifying the project's dependency graph.

### **2.3 The Persistence Layer: SQLite and Drizzle ORM**

Database: SQLite 3.46+ (via better-sqlite3 v12.5.0)  
ORM: Drizzle ORM v0.38+ 13  
Why Drizzle over Prisma/TypeORM?  
In an Electron environment, bundle size and startup time are critical metrics. Prisma requires shipping a heavy "Query Engine" binary (often 10MB+) alongside the application. Drizzle, by contrast, is a lightweight TypeScript wrapper around the SQL driver. It imposes zero runtime overhead and adds negligible weight to the application bundle. For a "Sidecar" utility that users expect to launch instantly, Drizzle is the superior choice.  
Why better-sqlite3?  
The choice of better-sqlite3 over the default sqlite3 or the native node:sqlite module (available in Node 22\) is driven by performance and API ergonomics. better-sqlite3 offers a synchronous API that blocks the event loop for the duration of the query. While "blocking" is usually an anti-pattern in Node.js web servers, in a local Electron application with a single user, the overhead of context-switching to the thread pool for a microsecond-scale query is actually more expensive than simply executing it synchronously. This results in snappier UI interactions when loading session history.14

### **2.4 Editor Component: Monaco**

**Library:** @monaco-editor/react v4.7+ (wrapping Monaco 0.55+) 15

For the "Visual Diffing" feature, the Monaco Editor (the core of VS Code) is the industry standard. While heavy, it provides the robust diffing algorithms and syntax highlighting required for code-centric workflows. The React wrapper allows us to control the editor instance declaratively, syncing the diff content with the Electron IPC stream without manual DOM manipulation.

## ---

**3\. System Architecture and Process Topology**

A robust Electron application relies on a strictly defined process topology. We employ a multi-process architecture that enforces security boundaries and ensures the UI remains responsive (60fps) even when the CLI is processing heavy data loads.

### **3.1 The Main Process (Node.js Environment)**

The Main process acts as the application's central nervous system. It has full access to the operating system APIs and runs the Node.js event loop.

* **Responsibilities:**  
  * **Lifecycle Management:** Creating and destroying application windows (BrowserWindow).  
  * **Sidecar Orchestration:** Spawning the Gemini CLI child process, managing its PID, and killing it upon window closure.  
  * **Data Gatekeeping:** It is the only process allowed to access the SQLite database file. This prevents database corruption that can occur if multiple renderer processes attempt to write to the file simultaneously.  
  * **IPC Routing:** It acts as a router, receiving requests from the Renderer (e.g., "Start Session") and translating them into CLI commands or Database queries.

### **3.2 The Child Process (The Sidecar)**

This is the external Gemini CLI binary. It runs as a subprocess of the Main process.

* **Communication Channel:** stdio (Standard Input/Output). The Main process writes to the child's stdin and reads from stdout and stderr.  
* **Data Format:** Newline Delimited JSON (JSONL). This format is ideal for streaming because every line is a valid, self-contained JSON object. Unlike a monolithic JSON response, JSONL allows the UI to render "Thought Cards" incrementally as they are generated by the LLM.

### **3.3 The Renderer Process (React Environment)**

The Renderer runs the React application in a Chromium web view.

* **Security Configuration:**  
  * nodeIntegration: false: The Renderer has no access to Node.js primitives (require, process, fs).  
  * contextIsolation: true: Preload scripts run in a separate context, exposing only a sanitized API to the window object.  
  * sandbox: true: The renderer is sandboxed to the strict limitations of a web browser.  
* **Responsibilities:**  
  * **Visualization:** Rendering the React component tree.  
  * **State Management:** Holding the transient state of the chat session (using Zustand).  
  * **Diffing:** Hosting the Monaco Editor instance.

### **3.4 Inter-Process Communication (IPC) Strategy**

In late 2025, the "Remote" module is long deprecated. We use a hybrid IPC strategy:

1. **Command/Response (Two-Way):** Used for database operations (e.g., history:get-sessions). We use ipcRenderer.invoke (Renderer) and ipcMain.handle (Main). This returns a Promise to the Renderer, allowing for async/await syntax.  
   * *Example:* User clicks "Load History" \-\> await window.api.history.getAll().  
2. **Streaming (One-Way):** Used for the CLI output. Since the CLI emits data continuously, a Promise-based request/response model is insufficient. We use webContents.send (Main) and ipcRenderer.on (Renderer).  
   * *Example:* CLI emits JSON line \-\> Main parses it \-\> Main sends gemini:stream-chunk \-\> Renderer updates Zustand store.

## ---

**4\. Directory Structure Architecture**

To support this topology, we define a "Feature-Sliced" directory structure that separates concerns by process environment. This structure ensures that code intended for Node.js is never accidentally bundled into the browser, and vice versa.

### **4.1 Root Structure**

gemini-electron-sidecar/  
├──.npmrc \# Enforce hoisting and electron headers  
├── electron-builder.yml \# Build/Distribution configuration  
├── package.json \# Dependencies and scripts  
├── tsconfig.json \# Base TypeScript configuration  
├── vite.config.ts \# Unified build configuration  
├── resources/ \# Static assets not bundled by Vite  
│ ├── icons/ \# Application icons (icns, ico)  
│ └── migrations/ \# SQL Migration files for Drizzle  
│ └── 0000\_init.sql \# Initial schema definition  
└── src/ \# Source Code  
├── main/ \#  
│ ├── index.ts \# Application Entry Point  
│ ├── database/ \# SQLite & Drizzle Logic  
│ │ ├── client.ts \# Database connection singleton  
│ │ ├── schema.ts \# Table definitions  
│ │ └── migrations.ts \# Migration runner logic  
│ ├── services/ \# Business Logic  
│ │ ├── cli-manager.ts \# Child Process orchestration  
│ │ └── path-resolver.ts \# Binary lookup logic  
│ └── ipc/ \# IPC Event Handlers  
│ ├── handlers.ts \# 'invoke' handlers  
│ └── events.ts \# 'send' helpers  
├── preload/ \#  
│ ├── index.ts \# ContextBridge exposure  
│ └── exposed.d.ts \# TypeScript definitions for window.api  
├── renderer/ \#  
│ ├── index.html \# HTML Entry  
│ ├── src/  
│ │ ├── main.tsx \# React Entry  
│ │ ├── App.tsx \# Root Component  
│ │ ├── assets/  
│ │ │ └── main.css \# Tailwind v4 Entry  
│ │ ├── components/ \# UI Components  
│ │ │ ├── ui/ \# Atomic primitives (Button, Modal)  
│ │ │ ├── editor/ \# Monaco Wrappers  
│ │ │ └── thoughts/ \# Thought Card Lists  
│ │ ├── features/ \# Feature Modules  
│ │ │ ├── session/ \# Session management logic  
│ │ │ └── diff/ \# Visual diff logic  
│ │ ├── stores/ \# Zustand Stores  
│ │ │ └── useSessionStore.ts  
│ │ └── hooks/ \# Custom React Hooks  
│ │ └── useGemini.ts  
└── shared/ \#  
├── types/ \# Shared TypeScript Interfaces  
│ ├── ipc.ts \# IPC Payload definitions  
│ └── gemini.ts \# CLI JSON schemas  
└── constants.ts \# Channel names

### **4.2 Structural Rationale**

1. **resources/migrations:** Code bundlers (like Vite or Webpack) operate on a dependency graph. If a file isn't imported, it is tree-shaken (removed). SQL migration files are rarely imported directly into TypeScript; they are read from the filesystem by the migration runner. Therefore, we place them in a top-level resources directory and configure electron-builder to copy them explicitly to the output directory (extraResources). This ensures they exist in the production build.16  
2. **src/shared:** This directory is crucial for type safety. It contains the Zod schemas and TypeScript interfaces that define the data contracts. Both the Main process tsconfig and the Renderer tsconfig include this path. This guarantees that if the Main process changes the structure of the data it sends, the Renderer build will fail immediately, preventing runtime errors caused by mismatched data expectations.

## ---

**5\. The Core Mechanism: CLI Orchestration**

The heart of the application is the CliManager service, responsible for bridging the gap between the GUI and the CLI.

### **5.1 Binary Path Resolution**

One of the most notoriously difficult aspects of "Sidecar" apps is locating the external binary. When a user runs npm install \-g @google/gemini-cli, the binary is placed in a system-dependent location.

* **Windows:** Typically %APPDATA%\\npm\\gemini.cmd.  
* **macOS/Linux:** /usr/local/bin/gemini OR /opt/homebrew/bin/gemini (Apple Silicon) OR \~/.nvm/versions/node/vXX/bin/gemini (NVM users).

Crucially, when an Electron app is launched from the Dock or Start Menu, it *does not* inherit the user's shell PATH variable. It sees a stripped-down, system-default environment.17

**Resolution Algorithm (src/main/services/path-resolver.ts):**

1. **Check Known Paths:** We iterate through a list of standard locations (/usr/local/bin, /opt/homebrew/bin, %APPDATA%/npm).  
2. **NPM Config Query:** If standard paths fail, we attempt to execute npm config get prefix using execSync. This asks the Node.js environment where it installs global modules. We then append /bin/gemini to this prefix.19  
3. **Fallback:** If all else fails, we prompt the user to manually locate the binary via an OpenDialog, saving the path to electron-store.

### **5.2 High-Throughput Stream Processing**

The Gemini CLI emits JSONL. Reading this requires handling the "Split Chunk" problem. Operating systems stream data in buffers (e.g., 64KB chunks). A single JSON line might be split across two chunks.

The Solution:  
We use Node.js's readline module, which is optimized for this specific task. It handles the internal buffering and UTF-8 decoding, emitting a clean line event for every newline character found.20  
**Code Specification (src/main/services/cli-manager.ts):**

TypeScript

import { spawn, ChildProcessWithoutNullStreams } from 'node:child\_process';  
import readline from 'node:readline';  
import { BrowserWindow } from 'electron';  
import { resolveCliPath } from './path-resolver';

export class CliManager {  
  private child: ChildProcessWithoutNullStreams | null \= null;

  public start(window: BrowserWindow, prompt: string) {  
    const binPath \= resolveCliPath();  
      
    // Spawn the process  
    // We use 'pipe' for stdio to programmatically read output  
    this.child \= spawn(binPath, \['prompt', prompt, '--format=jsonl'\], {  
      stdio: \['pipe', 'pipe', 'pipe'\],  
      env: {   
       ...process.env,   
        // Force unbuffered output to ensure real-time streaming  
        PYTHONUNBUFFERED: '1',   
        NO\_COLOR: '1'   
      }  
    });

    // Create the Line Reader  
    const rl \= readline.createInterface({  
      input: this.child.stdout,  
      terminal: false // Treat as a file stream, not a TTY  
    });

    rl.on('line', (line) \=\> {  
      try {  
        if (\!line.trim()) return;  
        const data \= JSON.parse(line);  
        // Forward to Renderer  
        window.webContents.send('gemini:stream-chunk', data);  
      } catch (err) {  
        console.warn('Malformed JSON chunk received:', line);  
      }  
    });

    // Handle Errors  
    this.child.stderr.on('data', (data) \=\> {  
      window.webContents.send('gemini:error', data.toString());  
    });  
      
    // Cleanup  
    this.child.on('close', (code) \=\> {  
      window.webContents.send('gemini:session-end', { code });  
      this.child \= null;  
    });  
  }

  public stop() {  
    if (this.child) {  
      this.child.kill(); // Sends SIGTERM  
      this.child \= null;  
    }  
  }  
}

*Architectural Insight:* We intentionally do not use the ipcRenderer.invoke (Promise) pattern here. Promises are one-off. Streaming requires an event-driven model. The Main process acts as a "firehose," pushing data to the Renderer as fast as it arrives.

## ---

**6\. Data Persistence and State Management**

### **6.1 Database Schema**

We use **Drizzle ORM** to define the schema. The schema reflects the user's need to store sessions and the granular "thoughts" within them.

**Schema Definition (src/main/database/schema.ts):**

TypeScript

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sessions \= sqliteTable('sessions', {  
  id: text('id').primaryKey(), // UUID  
  title: text('title').notNull(),  
  createdAt: integer('created\_at', { mode: 'timestamp' }).notNull(),  
  status: text('status').notNull() // 'active' | 'completed' | 'archived'  
});

export const thoughts \= sqliteTable('thoughts', {  
  id: text('id').primaryKey(),  
  sessionId: text('session\_id').references(() \=\> sessions.id),  
  type: text('type').notNull(), // 'plan' | 'code' | 'diff'  
  content: text('content').notNull(),  
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull()  
});

### **6.2 Managing Migrations in Production (The ASAR Constraint)**

A critical challenge in Electron is the ASAR (Atom Shell Archive) format. When the app is packaged, the source code is fused into a single read-only file. Native modules like better-sqlite3 cannot execute code that lives *inside* this archive if that code relies on file paths (like reading SQL files).

**Strategy:**

1. **Development:** migrate() reads from src/resources/migrations.  
2. **Production:** migrate() reads from process.resourcesPath \+ '/migrations'.  
3. **Build Config:** We configure electron-builder to copy the folder.

**Migration Runner (src/main/database/migrations.ts):**

TypeScript

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';  
import { db } from './client';  
import path from 'node:path';  
import { app } from 'electron';

export function runMigrations() {  
  const isDev \=\!app.isPackaged;  
    
  // In Prod, 'resources' is at the same level as the executable (or inside Contents/Resources on Mac)  
  const migrationsFolder \= isDev  
   ? path.join(\_\_dirname, '../../resources/migrations')  
    : path.join(process.resourcesPath, 'migrations');

  migrate(db, { migrationsFolder });  
}

## ---

**7\. User Interface Implementation**

### **7.1 Tailwind CSS v4 Architecture**

Tailwind v4 fundamentally changes how styles are integrated. There is no tailwind.config.js. Instead, the configuration lives in the CSS file itself.11

**File: src/renderer/src/assets/main.css**

CSS

@import "tailwindcss";

@theme {  
  /\* Define Semantic Colors for the 'Dark Mode' aesthetic \*/  
  \--color\-surface-base: \#1e1e1e;  
  \--color\-surface-raised: \#252526;  
  \--color\-surface-overlay: \#2d2d2d;  
    
  \--color\-brand: \#3b82f6;  
  \--color\-brand-hover: \#2563eb;  
    
  /\* Typography \*/  
  \--font\-sans: "Inter", system-ui, sans-serif;  
  \--font\-mono: "JetBrains Mono", monospace;  
}

This new "CSS-first" configuration allows for instant style application via the new Rust engine, ensuring that the heavy "Developer Experience" requirement of the prompt is met.

### **7.2 The Visual Diff Viewer (Monaco)**

The "Visual Diffing" requirement is satisfied by the DiffEditor component. A key challenge with Monaco in Electron is layout thrashing. Monaco requires explicit dimensions or a strictly defined flex container to render correctly.

Component Strategy:  
We wrap the editor in a container that uses Tailwind's flex-1 and h-full to ensure it consumes all available vertical space. We also disable the "minimap" to save rendering resources, as "Sidecar" windows are often narrower than full-screen IDEs.

### **7.3 Interactive Approval Modals**

The prompt specifies "Interactive Approval Modals" for code changes. In a multi-process Electron app, using native OS dialogs (dialog.showMessageBox) is blocking and offers limited customization. Instead, we implement "Soft Modals" within the React Renderer using the HTML \<dialog\> element, which is fully supported in Chromium 142\.

Implementation:  
When the CLI proposes a code change, the stream pauses (if the CLI supports interactive mode) or the Sidecar captures the diff and presents a "Review" card.

1. **State:** The card enters a pending\_approval state.  
2. **UI:** A modal renders via a React Portal to the document root, ensuring it overlays all other content (including the Monaco editor).  
3. **Action:** Clicking "Approve" sends an IPC message gemini:approve-diff to the Main process.  
4. **Orchestration:** The Main process then writes the approval signal to the CLI's stdin, resuming the operation.

## ---

**8\. Performance Optimization & Production Readiness**

### **8.1 60fps Rendering with Virtualization**

The JSONL stream can produce thousands of lines of output. Rendering a DOM node for every line will kill performance. We employ **Virtualization** using react-virtuoso. This library only renders the "Thought Cards" that are currently visible in the viewport, recycling DOM nodes as the user scrolls. This allows the application to handle infinite conversation histories with constant memory usage in the Renderer.

### **8.2 Security: Context Isolation**

We strictly enforce contextIsolation: true. This means the Renderer cannot access window.electron. Instead, we expose a secure API via the preload script.

**Preload Script (src/preload/index.ts):**

TypeScript

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {  
  gemini: {  
    start: (prompt: string) \=\> ipcRenderer.send('gemini:start', prompt),  
    onStream: (callback) \=\> ipcRenderer.on('gemini:stream-chunk', (\_, data) \=\> callback(data)),  
    // Remove listener to prevent memory leaks  
    offStream: () \=\> ipcRenderer.removeAllListeners('gemini:stream-chunk')  
  },  
  history: {  
    getSessions: () \=\> ipcRenderer.invoke('history:get-sessions')  
  }  
});

This pattern prevents the Renderer from executing arbitrary system commands, a crucial defense-in-depth strategy for any application handling untrusted input (even from an LLM).

### **8.3 Distribution Configuration**

Finally, to ship this application, we configure electron-builder.

**File: electron-builder.yml**

YAML

appId: com.example.gemini-sidecar  
productName: Gemini Sidecar  
directories:  
  output: dist  
  buildResources: resources  
files:  
  \- from: out/main  
    to: main  
  \- from: out/preload  
    to: preload  
  \- from: out/renderer  
    to: renderer  
  \- package.json  
extraResources:  
  \- from: resources/migrations  
    to: migrations

This configuration ensures that all compiled code is included, while the source TypeScript is excluded. The extraResources directive is the linchpin that ensures our SQLite migrations travel with the installed application.

## ---

**9\. Conclusion**

The architecture detailed above represents a hardened, production-grade specification for the "Gemini Electron Sidecar." By rigorously aligning version numbers—specifically the critical **Electron 39 / better-sqlite3 v12.5.0** pair—and adopting the high-performance **Tailwind v4** engine, this project is positioned to deliver a superior developer experience. The "Sidecar" process topology ensures stability, the SQLite/Drizzle layer ensures data integrity, and the React 19/Monaco UI ensures a fluid, modern interface. This document serves as the definitive blueprint for the development team commencing work in December 2025\.

#### **Works cited**

1. Electron | endoflife.date, accessed December 3, 2025, [https://endoflife.date/electron](https://endoflife.date/electron)  
2. All \- Electron Releases, accessed December 3, 2025, [https://releases.electronjs.org/release](https://releases.electronjs.org/release)  
3. Electron v39.0.0 \- Electron Releases, accessed December 3, 2025, [https://releases.electronjs.org/release/v39.0.0](https://releases.electronjs.org/release/v39.0.0)  
4. Electron Releases, accessed December 3, 2025, [https://releases.electronjs.org/](https://releases.electronjs.org/)  
5. better-sqlite3 12.4.1 fails to build with electron 39.1 / new v8 due to Context::GetIsolate removed after being deprecated · Issue \#1416 \- GitHub, accessed December 3, 2025, [https://github.com/WiseLibs/better-sqlite3/issues/1416](https://github.com/WiseLibs/better-sqlite3/issues/1416)  
6. 用Codex 提交第一个GitHub PR-腾讯新闻, accessed December 3, 2025, [https://news.qq.com/rain/a/20251114A03P6900](https://news.qq.com/rain/a/20251114A03P6900)  
7. Releases · WiseLibs/better-sqlite3 \- GitHub, accessed December 3, 2025, [https://github.com/WiseLibs/better-sqlite3/releases](https://github.com/WiseLibs/better-sqlite3/releases)  
8. Tailwind CSS v4 Is Here: All the Updates You Need to Know | by Khushil Shah, accessed December 3, 2025, [https://khushil21.medium.com/tailwind-css-v4-is-here-all-the-updates-you-need-to-know-394645b53755](https://khushil21.medium.com/tailwind-css-v4-is-here-all-the-updates-you-need-to-know-394645b53755)  
9. Releases \- Vite, accessed December 3, 2025, [https://vite.dev/releases](https://vite.dev/releases)  
10. Releases · facebook/react \- GitHub, accessed December 3, 2025, [https://github.com/facebook/react/releases](https://github.com/facebook/react/releases)  
11. Electron-vite \+ React \+ Tailwindcss v4 \- Stack Overflow, accessed December 3, 2025, [https://stackoverflow.com/questions/79562593/electron-vite-react-tailwindcss-v4](https://stackoverflow.com/questions/79562593/electron-vite-react-tailwindcss-v4)  
12. Tailwind CSS v4.0, accessed December 3, 2025, [https://tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4)  
13. SQLite \- Drizzle ORM, accessed December 3, 2025, [https://orm.drizzle.team/docs/get-started-sqlite](https://orm.drizzle.team/docs/get-started-sqlite)  
14. A Step-by-Step Guide to Integrating Better-SQLite3 with Electron JS App Using Create-React-App \- DEV Community, accessed December 3, 2025, [https://dev.to/arindam1997007/a-step-by-step-guide-to-integrating-better-sqlite3-with-electron-js-app-using-create-react-app-3k16](https://dev.to/arindam1997007/a-step-by-step-guide-to-integrating-better-sqlite3-with-electron-js-app-using-create-react-app-3k16)  
15. Monaco Editor, accessed December 3, 2025, [https://microsoft.github.io/monaco-editor/](https://microsoft.github.io/monaco-editor/)  
16. Do migrations work in Electron? · drizzle-team drizzle-orm · Discussion \#1891 \- GitHub, accessed December 3, 2025, [https://github.com/drizzle-team/drizzle-orm/discussions/1891](https://github.com/drizzle-team/drizzle-orm/discussions/1891)  
17. Getting "Command not found" for global node packages \- Super User, accessed December 3, 2025, [https://superuser.com/questions/1531891/getting-command-not-found-for-global-node-packages](https://superuser.com/questions/1531891/getting-command-not-found-for-global-node-packages)  
18. Resolving Compatibility Issues with Node.js child\_process.spawn and Grep Across Platforms | by Denis Bélanger | Medium, accessed December 3, 2025, [https://medium.com/@python-javascript-php-html-css/resolving-compatibility-issues-with-node-js-child-process-spawn-and-grep-across-platforms-b33be96f9438](https://medium.com/@python-javascript-php-html-css/resolving-compatibility-issues-with-node-js-child-process-spawn-and-grep-across-platforms-b33be96f9438)  
19. How to get the npm global path prefix \- node.js \- Stack Overflow, accessed December 3, 2025, [https://stackoverflow.com/questions/18383476/how-to-get-the-npm-global-path-prefix](https://stackoverflow.com/questions/18383476/how-to-get-the-npm-global-path-prefix)  
20. Readline | Node.js v25.2.1 Documentation, accessed December 3, 2025, [https://nodejs.org/api/readline.html](https://nodejs.org/api/readline.html)