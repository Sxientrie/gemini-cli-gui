/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import type { IPty } from 'node-pty';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

export class PtyManager extends EventEmitter {
  private ptyProcess: IPty | null = null;

  constructor() {
    super();
  }

  spawn() {
    if (this.ptyProcess) {
      return;
    }

    try {
      let cliPath: string;
      try {
        // Try to find the bundled version first (production/intended)
        cliPath = require.resolve('@google/gemini-cli/bundle/gemini.js');
      } catch {
        // Fallback to main entry point (dev)
        try {
          cliPath = require.resolve('@google/gemini-cli');
        } catch (e) {
          console.error('Could not resolve @google/gemini-cli', e);
          return;
        }
      }

      const env = {
        ...process.env,
        FORCE_COLOR: '1',
      };

      console.log('Spawning PTY with CLI path:', cliPath);

      // We assume 'node' is in the PATH.
      // For a packaged app, we might need a bundled node or rely on system node.
      this.ptyProcess = pty.spawn('node', [cliPath, 'chat'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: env,
      });

      this.ptyProcess!.onData((data: string) => {
        this.emit('data', data);
      });

      this.ptyProcess!.onExit(
        ({ exitCode, signal }: { exitCode: number; signal?: number }) => {
          console.log(`PTY process exited with code ${exitCode} signal ${signal}`);
          this.ptyProcess = null;
          this.emit('exit', { exitCode, signal });
        },
      );
    } catch (err) {
      console.error('Failed to spawn PTY:', err);
    }
  }

  write(data: string) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols: number, rows: number) {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch (e) {
        console.error('Error resizing PTY:', e);
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
