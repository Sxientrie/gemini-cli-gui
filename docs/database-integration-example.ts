// example integration with useGemini hook
// demonstrates how to persist chat sessions and thoughts to the database.

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useGeminiWithPersistence() {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sessions, setSessions] = useState<Array<any>>([]);

  // load sessions on mount
  useEffect(() => {
    async function loadSessions() {
      const dbSessions = await window.api.db.getSessions();
      setSessions(dbSessions);
    }
    loadSessions();
  }, []);

  // create new session
  async function startNewSession(title: string) {
    const newSessionId = uuidv4();
    await window.api.db.createSession({
      id: newSessionId,
      title,
      createdAt: new Date(),
      status: 'active',
    });
    setSessionId(newSessionId);
    return newSessionId;
  }

  // load existing session
  async function loadSession(id: string) {
    const thoughts = await window.api.db.getThoughts(id);
    setSessionId(id);
    // convert thoughts back to messages
    return thoughts.map(t => JSON.parse(t.content));
  }

  // save message to database
  async function saveMessage(message: any) {
    if (!sessionId) {
      // create session on first message
      const newId = await startNewSession(
        message.content.substring(0, 50) + '...'
      );
      await persistThought(newId, message);
    } else {
      await persistThought(sessionId, message);
    }
  }

  // persist thought helper
  async function persistThought(sid: string, data: any) {
    await window.api.db.saveThought({
      id: uuidv4(),
      sessionId: sid,
      type: data.type || 'message',
      content: JSON.stringify(data),
      timestamp: new Date(),
    });
  }

  // delete session
  async function deleteSession(id: string) {
    await window.api.db.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  return {
    sessionId,
    sessions,
    startNewSession,
    loadSession,
    saveMessage,
    deleteSession,
  };
}

// example: saving gemini events as they stream in
function handleGeminiEvent(event: GeminiEvent, sessionId: string) {
  switch (event.type) {
    case 'message':
      window.api.db.saveThought({
        id: uuidv4(),
        sessionId,
        type: 'message',
        content: JSON.stringify({
          role: event.role,
          content: event.content,
          timestamp: event.timestamp,
        }),
        timestamp: new Date(),
      });
      break;

    case 'tool_use':
      window.api.db.saveThought({
        id: event.tool_id,
        sessionId,
        type: 'tool_use',
        content: JSON.stringify({
          tool_name: event.tool_name,
          parameters: event.parameters,
        }),
        timestamp: new Date(),
      });
      break;

    case 'tool_result':
      window.api.db.saveThought({
        id: uuidv4(),
        sessionId,
        type: 'tool_result',
        content: JSON.stringify({
          tool_id: event.tool_id,
          status: event.status,
          output: event.output,
          error: event.error,
        }),
        timestamp: new Date(),
      });
      break;

    case 'error':
      window.api.db.saveThought({
        id: uuidv4(),
        sessionId,
        type: 'error',
        content: JSON.stringify({
          code: event.code,
          message: event.message,
          details: event.details,
        }),
        timestamp: new Date(),
      });
      break;
  }
}
