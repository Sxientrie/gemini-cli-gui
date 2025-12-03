/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

// Define the API exposed by preload
interface ElectronAPI {
  createTerminal: (cols: number, rows: number) => void;
  writeToTerminal: (data: string) => void;
  resizeTerminal: (cols: number, rows: number) => void;
  onTerminalData: (callback: (data: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface TerminalProps {
  className?: string;
  onReady?: (terminal: Xterm) => void;
}

export function Terminal({ className, onReady }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Xterm({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#09090b', // Zinc-950
        foreground: '#e4e4e7', // Zinc-200
        cursor: '#a1a1aa',
        selectionBackground: '#27272a', // Zinc-800
        black: '#000000',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#ffffff',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit and create backend shell
    fitAddon.fit();
    if (window.electronAPI) {
      window.electronAPI.createTerminal(term.cols, term.rows);

      // Handle user input
      term.onData((data) => {
        window.electronAPI.writeToTerminal(data);
      });

      // Handle incoming data from backend
      const cleanup = window.electronAPI.onTerminalData((data) => {
        term.write(data);
      });

      // Handle resize
      const handleResize = () => {
        fitAddon.fit();
        window.electronAPI.resizeTerminal(term.cols, term.rows);
      };

      window.addEventListener('resize', handleResize);

      if (onReady) {
        onReady(term);
      }

      return () => {
        cleanup();
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }

    return () => {
      term.dispose();
    };
  }, [onReady]);

  return <div ref={terminalRef} className={`h-full w-full ${className}`} />;
}
