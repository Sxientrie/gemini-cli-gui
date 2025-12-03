import React from 'react';
import { MessageSquarePlus, Clock } from 'lucide-react';
import clsx from 'clsx';
import { GeminiSession, GeminiStatus } from '../../shared/types';

// sidebar component
// displays chat history and current status.

interface SidebarProps {
  sessions: GeminiSession[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  status: GeminiStatus;
  version: string | null;
  className?: string;
}

export function Sidebar({ sessions, currentSessionId, onSessionSelect, onNewChat, status, version, className }: SidebarProps) {
  return (
    <aside className={clsx("flex flex-col bg-surface backdrop-blur-md border border-border rounded-lg p-3 shadow-lg overflow-hidden", className)}>
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all mb-4 group"
      >
        <MessageSquarePlus size={18} className="group-hover:scale-110 transition-transform" />
        <span className="font-medium text-sm">New Chat</span>
      </button>

      <div className="text-xs font-medium text-zinc-500 mb-3 font-sans px-2">History</div>

      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-xs italic">
            No history found
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={clsx(
                "w-full text-left p-3 rounded-lg transition-all border text-xs group",
                currentSessionId === session.id
                  ? "bg-zinc-800/80 border-zinc-700 text-zinc-200"
                  : "bg-transparent border-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300"
              )}
            >
              <div className="font-medium truncate mb-1">{session.title}</div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-zinc-500">
                <Clock size={10} />
                <span>{session.lastActive}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx("w-2 h-2 rounded-full transition-colors", 
            status === 'active' ? "bg-green-500 animate-pulse" :
            status === 'ready' ? "bg-zinc-500" :
            status === 'checking' ? "bg-yellow-500 animate-pulse" :
            "bg-red-500"
          )} />
          <span className="text-[10px] font-medium text-zinc-600">
            Gemini
          </span>
        </div>
        {version && <span className="text-[10px] text-zinc-700 font-mono opacity-75">v{version}</span>}
      </div>
    </aside>
  );
}
