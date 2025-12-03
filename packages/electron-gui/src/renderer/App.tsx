/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';

// Define types for the IPC bridge
interface IElectronAPI {
  sendMessage: (message: string) => Promise<void>;
  onResponse: (callback: (response: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

function App() {
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for responses
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onResponse((response) => {
        setMessages((prev) => {
          // Check if the last message is from assistant, if so append, else create new
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + response },
            ];
          }
          return [...prev, { role: 'assistant', content: response }];
        });
      });
      return cleanup;
    }
    return () => {};
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');

    if (window.electronAPI) {
      await window.electronAPI.sendMessage(userMessage);
    }
  };

  return (
    <div className="flex h-screen w-screen p-3 gap-3 font-sans bg-zinc-950 text-zinc-200 overflow-hidden">
      {/* Sidebar Island */}
      <div className="w-64 flex flex-col bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4">
        <h1 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4">
          EXPLORER
        </h1>
        <div className="flex-1">
          {/* Navigation items would go here */}
          <div className="text-[12px] text-zinc-400 hover:text-zinc-200 cursor-pointer mb-2">
            Chat
          </div>
          <div className="text-[12px] text-zinc-500 hover:text-zinc-200 cursor-pointer mb-2">
            History
          </div>
        </div>
      </div>

      {/* Main Chat Island */}
      <div className="flex-1 flex flex-col bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/50 rounded-lg relative overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-zinc-800/50 flex items-center px-4 shrink-0">
          <h2 className="text-[14px] font-medium text-zinc-200">
            Gemini Agent
          </h2>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 text-[12px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'bg-zinc-900/50 text-zinc-300 font-mono'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/10 shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter instructions..."
              className="w-full bg-transparent border border-zinc-700 rounded-md py-2 px-3 text-[12px] text-zinc-200 focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
