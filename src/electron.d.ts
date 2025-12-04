import { GeminiEvent, GeminiSession, GeminiStatus, SendPromptPayload } from './shared/types';

export interface ElectronAPI {
  sendPrompt: (payload: SendPromptPayload) => void;
  stopGeneration: () => void;
  listSessions: () => void;
  chooseFolder: () => Promise<string | null>;
  onStreamEvent: (callback: (event: GeminiEvent) => void) => () => void;
  onSessions: (callback: (sessions: GeminiSession[]) => void) => () => void;
  onError: (callback: (error: any) => void) => () => void;
  onStatusChange: (callback: (status: GeminiStatus) => void) => () => void;
  getStatus: () => Promise<GeminiStatus>;
  getVersion: () => Promise<string | null>;
  auth: {
    hasKey: () => Promise<boolean>;
    saveKey: (key: string) => Promise<{ success: boolean; error?: string }>;
    clearKey: () => Promise<{ success: boolean; error?: string }>;
  };
  db: {
    getSessions: () => Promise<Array<{
      id: string;
      title: string;
      createdAt: Date;
      status: 'active' | 'archived';
    }>>;
    getSession: (sessionId: string) => Promise<{
      id: string;
      title: string;
      createdAt: Date;
      status: 'active' | 'archived';
    } | null>;
    createSession: (data: {
      id: string;
      title: string;
      createdAt: Date;
      status?: 'active' | 'archived';
    }) => Promise<unknown>;
    updateSession: (
      sessionId: string,
      data: Partial<{ title: string; status: 'active' | 'archived' }>
    ) => Promise<boolean>;
    deleteSession: (sessionId: string) => Promise<boolean>;
    getThoughts: (sessionId: string) => Promise<Array<{
      id: string;
      sessionId: string;
      type: string;
      content: string;
      timestamp: Date;
    }>>;
    saveThought: (data: {
      id: string;
      sessionId: string;
      type: string;
      content: string;
      timestamp: Date;
    }) => Promise<unknown>;
    saveThoughts: (data: Array<{
      id: string;
      sessionId: string;
      type: string;
      content: string;
      timestamp: Date;
    }>) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
