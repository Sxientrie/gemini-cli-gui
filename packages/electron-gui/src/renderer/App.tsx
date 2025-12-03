/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Define types for the IPC bridge
interface IElectronAPI {
  sendInput: (data: string) => Promise<void>;
  resizeTerminal: (cols: number, rows: number) => Promise<void>;
  onTerminalData: (callback: (data: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

function App() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
        cursor: '#71717a', // zinc-500
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send input to main process
    term.onData((data) => {
      if (window.electronAPI) {
        window.electronAPI.sendInput(data);
      }
    });

    // Receive output from main process
    let cleanup: (() => void) | undefined;
    if (window.electronAPI) {
      cleanup = window.electronAPI.onTerminalData((data) => {
        term.write(data);
      });
    }

    // Handle resizing
    const handleResize = () => {
      if (fitAddonRef.current && window.electronAPI) {
        fitAddonRef.current.fit();
        window.electronAPI.resizeTerminal(term.cols, term.rows);
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial resize
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (cleanup) cleanup();
      term.dispose();
    };
  }, []);

  return (
    <div className="flex h-screen w-screen p-3 gap-3 font-sans bg-zinc-950 text-zinc-200 overflow-hidden">
      {/* Sidebar Island */}
      <div className="w-64 flex flex-col bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4">
        <h1 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4">
          EXPLORER
        </h1>
        <div className="flex-1">
          <div className="text-[12px] text-zinc-400 hover:text-zinc-200 cursor-pointer mb-2">
            Terminal
          </div>
        </div>
      </div>

      {/* Main Terminal Island */}
      <div className="flex-1 flex flex-col bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/50 rounded-lg relative overflow-hidden p-4">
        {/* Header */}
        <div className="h-8 border-b border-zinc-800/50 flex items-center mb-2 shrink-0">
          <h2 className="text-[14px] font-medium text-zinc-200">
            Gemini Shell
          </h2>
        </div>

        {/* Terminal Container */}
        <div
          ref={terminalRef}
          className="flex-1 w-full h-full overflow-hidden bg-[#09090b]"
        />
      </div>
    </div>
  );
}

export default App;
