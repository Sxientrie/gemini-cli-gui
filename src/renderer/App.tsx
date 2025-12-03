import React, { useState } from 'react';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { LayoutGrid, Settings, FolderOpen, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { useGemini } from './hooks/useGemini';
import { StartupModal } from './components/StartupModal';

// app component
// main layout container. manages navigation and global state.

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const { messages, isGenerating, sendPrompt, stopGeneration, error, sessions, listSessions, sessionId, loadSession, clearSession, status, version } = useGemini();

  // load sessions on mount
  React.useEffect(() => {
    listSessions();
  }, []);

  return (
    <div className="flex h-screen w-screen bg-background text-zinc-200 overflow-hidden font-sans selection:bg-zinc-700 selection:text-zinc-200 p-2 gap-1 text-xs">
      <StartupModal status={status} version={version} error={error} />
      {/* navigation island */}
      <nav className="w-12 flex flex-col items-center py-3 gap-3 bg-surface backdrop-blur-md border border-border rounded-lg z-50 shadow-lg">
        <div className="w-8 h-8 rounded-md bg-zinc-200 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          <LayoutGrid className="text-zinc-900 w-5 h-5" />
        </div>
        
        <button 
          onClick={() => setActiveTab('chat')}
          className={clsx("p-2 rounded-md transition-all duration-300 relative group", activeTab === 'chat' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
        >
          <MessageSquare className="w-5 h-5" />
          {activeTab === 'chat' && <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-1 h-4 bg-zinc-200 rounded-r-full" />}
        </button>

        <button 
          onClick={() => setActiveTab('files')}
          className={clsx("p-2 rounded-md transition-all duration-300 relative group", activeTab === 'files' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
        >
          <FolderOpen className="w-5 h-5" />
        </button>

        <div className="flex-1" />

        <button className="p-2 text-zinc-600 hover:text-zinc-400 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </nav>

      {/* sidebar (history) */}
      <Sidebar 
        className="w-64"
        sessions={sessions}
        currentSessionId={sessionId}
        onSessionSelect={loadSession}
        onNewChat={clearSession}
        status={status}
        version={version}
      />

      {/* chat / workspace panel */}
      <main className="flex-1 bg-surface backdrop-blur-md border border-border rounded-lg shadow-2xl overflow-hidden relative flex flex-col">
          <Chat 
            messages={messages}
            isGenerating={isGenerating}
            sendPrompt={sendPrompt}
            stopGeneration={stopGeneration}
            error={error}
          />
      </main>
    </div>
  );
}

export default App;
