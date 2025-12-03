import React, { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, Terminal } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../hooks/useGemini';

// chat component
// renders the message history and input area.

interface ChatProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  sendPrompt: (prompt: string) => void;
  stopGeneration: () => void;
  error: string | null;
}

export function Chat({ messages, isGenerating, sendPrompt, stopGeneration, error }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    sendPrompt(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* header */}
      <div className="h-12 border-b border-border flex items-center px-4 bg-zinc-900/50 backdrop-blur-sm">
        <span className="text-xs font-medium text-zinc-400">Terminal</span>
      </div>

      {/* messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent p-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 flex items-center justify-center border border-zinc-800">
              <Terminal className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-sm">Ready to assist. Type a message to start.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        
        {error && (
          <div className="p-4 mx-4 my-2 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
            Error: {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input area */}
      <div className="p-4 bg-zinc-900/30 border-t border-border backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all font-mono text-sm"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() && !isGenerating}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <StopCircle size={18} onClick={(e) => { e.preventDefault(); stopGeneration(); }} className="text-red-400 hover:text-red-300" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
        <div className="mt-2 flex justify-between items-center px-1">
          <span className="text-[10px] text-zinc-600 font-mono">Model: gemini-2.0-flash</span>
          <span className="text-[10px] text-zinc-600 font-mono">Status: {isGenerating ? 'Generating' : 'Idle'}</span>
        </div>
      </div>
    </div>
  );
}
