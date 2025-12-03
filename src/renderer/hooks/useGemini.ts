import { useState, useEffect, useCallback } from 'react';
import type {
  GeminiEvent,
  GeminiToolUse,
  GeminiToolResult,
  GeminiSession,
  GeminiStatus,
  AppError,
} from '../../shared/types';
import { AppErrorCode } from '../../shared/types';

// use gemini hook
// manages chat state, ipc communication, and session logic.

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: string;
  tools?: GeminiToolUse[];
  toolResults?: GeminiToolResult[];
  isThinking?: boolean;
}

export function useGemini() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<GeminiSession[]>([]);
  const [cwd, setCwd] = useState<string | undefined>(undefined);
  const [error, setError] = useState<AppError | null>(null);
  const [status, setStatus] = useState<GeminiStatus>('checking');
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const removeStreamListener = window.api.onStreamEvent((event) => {
      console.log('stream event:', event);

      if (event.type === 'message') {
        if (event.role === 'user') return;

        setIsGenerating(false);
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'model' && lastMsg.isThinking) {
            return [
              ...prev.slice(0, -1),
              {
                role: event.role,
                content: event.content,
                timestamp: event.timestamp,
                isThinking: false,
              },
            ];
          }
          return [
            ...prev,
            {
              role: event.role,
              content: event.content,
              timestamp: event.timestamp,
            },
          ];
        });
        if (event.sessionId) {
          setSessionId(event.sessionId);
        }
      } else if (event.type === 'tool_use') {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          const newMessage: ChatMessage = {
            role: 'system',
            content: `Using tool: ${event.tool_name}`,
            tools: [event],
            toolResults: [],
          };

          if (lastMsg && lastMsg.role === 'model' && lastMsg.isThinking) {
            return [...prev.slice(0, -1), newMessage];
          }
          return [...prev, newMessage];
        });
      } else if (event.type === 'tool_result') {
        setMessages((prev) => {
          const newMessages = [...prev];
          const messageIndex = newMessages.findIndex((msg) =>
            msg.tools?.some((t) => t.tool_id === event.tool_id)
          );

          if (messageIndex !== -1) {
            const message = newMessages[messageIndex];
            newMessages[messageIndex] = {
              ...message,
              toolResults: [...(message.toolResults || []), event],
            };
          }
          return newMessages;
        });
      } else if (event.type === 'error') {
        setIsGenerating(false);
        setError({
          code: AppErrorCode.UNKNOWN,
          message: event.message,
          details: event.code
        });
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'model' && lastMsg.isThinking) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } else if (event.type === 'result') {
        if (event.status === 'success') {
          setIsGenerating(false);
        }
      }
    });

    const removeSessionsListener = window.api.onSessions((newSessions) => {
      setSessions(newSessions);
    });

    const removeErrorListener = window.api.onError((err: AppError) => {
      setIsGenerating(false);
      setError(err);
    });

    const removeStatusListener = window.api.onStatusChange((newStatus: GeminiStatus) => {
      setStatus(newStatus);
    });

    window.api.getStatus().then((initialStatus) => {
      setStatus(initialStatus);
    });

    window.api.getVersion().then((ver) => {
      setVersion(ver);
    });

    return () => {
      removeStreamListener();
      removeSessionsListener();
      removeErrorListener();
      removeStatusListener();
    };
  }, []);

  const sendPrompt = useCallback(
    (prompt: string) => {
      setIsGenerating(true);
      setError(null);

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: prompt, timestamp: new Date().toISOString() },
        { role: 'model', content: '', isThinking: true },
      ]);

      window.api.sendPrompt({ prompt, sessionId, cwd });
    },
    [sessionId, cwd],
  );

  const stopGeneration = useCallback(() => {
    window.api.stopGeneration();
    setIsGenerating(false);
  }, []);

  const chooseFolder = useCallback(async () => {
    const folder = await window.api.chooseFolder();
    if (folder) {
      setCwd(folder);
    }
    return folder;
  }, []);

  return {
    messages,
    isGenerating,
    error,
    sendPrompt,
    stopGeneration,
    sessionId,
    sessions,
    cwd,
    chooseFolder,
    listSessions: () => window.api.listSessions(),
    loadSession: (id: string) => {
      setSessionId(id);
      setMessages([]);
    },
    clearSession: () => {
      setSessionId(undefined);
      setMessages([]);
    },
    status,
    version,
  };
}
