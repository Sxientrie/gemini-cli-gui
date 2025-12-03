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
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
