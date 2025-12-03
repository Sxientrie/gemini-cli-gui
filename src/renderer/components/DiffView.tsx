import React from 'react';
import { DiffEditor } from '@monaco-editor/react';

interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
  height?: string;
}

export function DiffView({ original, modified, language = 'javascript', height = '200px' }: DiffViewProps) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <DiffEditor
        height={height}
        language={language}
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderSideBySide: true,
          padding: { top: 10, bottom: 10 },
          fontSize: 12,
          lineNumbers: 'off',
          renderOverviewRuler: false,
        }}
      />
    </div>
  );
}
