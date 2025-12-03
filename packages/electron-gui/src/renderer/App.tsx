/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Terminal } from './components/Terminal';
import { MacroSidebar } from './components/MacroSidebar';

function App() {
  const [isDragging, setIsDragging] = useState(false);

  const handleMacroRun = (command: string) => {
    if (window.electronAPI) {
      // Send command followed by newline to execute
      window.electronAPI.writeToTerminal(`${command}\r`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const path = e.dataTransfer.files[0].path;
      if (path && window.electronAPI) {
        // Quote path to handle spaces
        window.electronAPI.writeToTerminal(`cd "${path}"\r`);
        window.electronAPI.writeToTerminal(`clear\r`); // Optional: clear screen for fresh start
        window.electronAPI.writeToTerminal(
          `echo "Context switched to: ${path}"\r`,
        );
      }
    }
  };

  return (
    <div
      className="flex h-screen w-screen p-3 gap-3 font-sans bg-zinc-950 text-zinc-200 overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual indicator for Drag & Drop */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 z-50 pointer-events-none border-2 border-blue-500 rounded-lg flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-lg shadow-xl text-zinc-200">
            Drop folder to set terminal context
          </div>
        </div>
      )}

      {/* Sidebar Island */}
      <MacroSidebar onRunMacro={handleMacroRun} />

      {/* Main Terminal Island */}
      <div className="flex-1 flex flex-col bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/50 rounded-lg relative overflow-hidden">
        {/* Header */}
        <div className="h-8 border-b border-zinc-800/50 flex items-center px-4 shrink-0 bg-zinc-900/30">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          </div>
          <div className="ml-4 text-[12px] text-zinc-500 font-mono">
            gemini-deck (~/user)
          </div>
        </div>

        {/* Terminal Area */}
        <div className="flex-1 p-1 bg-zinc-950">
          <Terminal className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

export default App;
