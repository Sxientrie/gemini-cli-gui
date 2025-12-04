/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              // Externalize core to avoid bundling issues with WASM/Native modules
              external: [
                 'electron',
                 '@google/gemini-cli-core',
                 'node-pty',
                 'better-sqlite3',
                 'drizzle-orm',
                 // Add other dependencies if needed
              ],
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
            }
          }
        }
      },
      renderer: {},
    }),
  ],
});
