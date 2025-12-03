/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

interface MacroButtonProps {
  label: string;
  command: string;
  onClick: (command: string) => void;
  icon?: string;
}

function MacroButton({ label, command, onClick }: MacroButtonProps) {
  return (
    <button
      onClick={() => onClick(command)}
      className="w-full text-left px-3 py-2 text-[12px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors flex items-center gap-2 group"
    >
      <div className="w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-blue-500 transition-colors" />
      <span className="truncate">{label}</span>
    </button>
  );
}

interface MacroSidebarProps {
  onRunMacro: (command: string) => void;
}

export function MacroSidebar({ onRunMacro }: MacroSidebarProps) {
  const macros = [
    { label: 'Fix this bug', command: 'gemini "Fix the bug in the current file"' },
    { label: 'Explain code', command: 'gemini "Explain this code"' },
    { label: 'Generate Tests', command: 'gemini "Write unit tests for this file"' },
    { label: 'Refactor', command: 'gemini "Refactor this code to be cleaner"' },
    { label: 'Git Status', command: 'git status' },
    { label: 'List Files', command: 'ls -la' },
  ];

  return (
    <div className="w-64 flex flex-col bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 h-full">
      <h1 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4 uppercase">
        Gemini Deck
      </h1>

      <div className="flex-1 overflow-y-auto space-y-1">
        <div className="text-[10px] font-semibold text-zinc-600 mb-2 mt-2 px-3">MACROS</div>
        {macros.map((macro, idx) => (
          <MacroButton
            key={idx}
            label={macro.label}
            command={macro.command}
            onClick={onRunMacro}
          />
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-800/50">
        <div className="text-[10px] text-zinc-600 px-3">
          Drop folder to set context
        </div>
      </div>
    </div>
  );
}
