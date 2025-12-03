import React from 'react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, User, Terminal, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { ChatMessage } from '../hooks/useGemini';
import { DiffView } from './DiffView';

// message bubble component
// renders a single chat message, handling markdown, code blocks, and tool outputs.

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (message.isThinking) {
    return (
      <div className="flex gap-4 p-4 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
          <Bot size={16} className="text-zinc-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("flex gap-4 p-6 group transition-colors rounded-xl", {
      "bg-zinc-800/30": isUser,
      "bg-transparent": !isUser
    })}>
      <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5", {
        "bg-zinc-800": !isUser,
        "bg-zinc-700": isUser
      })}>
        {isUser ? <User size={16} className="text-zinc-200" /> : 
         isSystem ? <Terminal size={16} className="text-amber-500" /> :
         <Bot size={16} className="text-emerald-500" />}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
            {message.role}
          </span>
          <span className="text-[10px] text-zinc-700 font-mono">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
          </span>
        </div>

        {isSystem && message.tools ? (
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-zinc-900/30 border-b border-zinc-800/50">
              <Loader2 size={12} className="animate-spin text-amber-500" />
              <span className="text-xs font-mono text-zinc-400">Executing: <span className="text-amber-500">{message.tools[0].tool_name}</span></span>
            </div>
            <div className="p-3 bg-zinc-950/30 space-y-2">
              {message.tools[0].tool_name === 'replace_file_content' && message.tools[0].parameters.TargetContent && message.tools[0].parameters.ReplacementContent ? (
                <DiffView
                  original={message.tools[0].parameters.TargetContent}
                  modified={message.tools[0].parameters.ReplacementContent}
                  language={message.tools[0].parameters.CodeMarkdownLanguage || 'javascript'}
                />
              ) : (
                <pre className="font-mono text-[10px] text-zinc-500 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  {JSON.stringify(message.tools[0].parameters, null, 2)}
                </pre>
              )}
              {message.toolResults && message.toolResults.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx("text-[10px] font-bold uppercase", {
                      "text-emerald-500": message.toolResults[0].status === 'success',
                      "text-red-500": message.toolResults[0].status === 'error'
                    })}>
                      {message.toolResults[0].status}
                    </span>
                  </div>
                  <pre className="font-mono text-[10px] text-zinc-400 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    {message.toolResults[0].output || message.toolResults[0].error?.message}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950/50 prose-pre:border prose-pre:border-zinc-800 prose-code:font-mono prose-code:text-zinc-300">
            <Markdown
              components={{
                code(props) {
                  const {children, className, node, ref, ...rest} = props
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SyntaxHighlighter
                      {...rest}
                      PreTag="div"
                      children={String(children).replace(/\n$/, '')}
                      language={match[1]}
                      style={vscDarkPlus}
                      customStyle={{ background: 'transparent', padding: 0 }}
                    />
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
