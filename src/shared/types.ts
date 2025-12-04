import { z } from 'zod';

// cli event schemas
// defines shape of events streaming from cli process.

export const GeminiToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).optional(),
});

export const GeminiModelSchema = z.object({
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
});

export const GeminiEventTypeSchema = z.enum([
  'init',
  'message',
  'tool_use',
  'tool_result',
  'result',
  'error',
]);

export const GeminiEventBaseSchema = z.object({
  type: GeminiEventTypeSchema,
  sessionId: z.string().optional(),
});

export const GeminiInitEventSchema = GeminiEventBaseSchema.extend({
  type: z.literal('init'),
  models: z.array(GeminiModelSchema),
  tools: z.array(GeminiToolSchema),
  version: z.string(),
});

export const GeminiMessageEventSchema = GeminiEventBaseSchema.extend({
  type: z.literal('message'),
  role: z.enum(['user', 'model', 'system']),
  content: z.string(),
  timestamp: z.string(),
});

export const GeminiToolUseEventSchema = GeminiEventBaseSchema.extend({
  type: z.literal('tool_use'),
  tool_name: z.string(),
  tool_id: z.string(),
  parameters: z.record(z.any()),
});

export const GeminiToolResultEventSchema = GeminiEventBaseSchema.extend({
  type: z.literal('tool_result'),
  tool_id: z.string(),
  status: z.enum(['success', 'error']),
  output: z.string().optional(),
  error: z.object({
    type: z.string(),
    message: z.string(),
  }).optional(),
});

export const GeminiResultEventSchema = GeminiEventBaseSchema.extend({
  type: z.literal('result'),
  status: z.enum(['success', 'failure']),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

export const GeminiErrorEventSchema = GeminiEventBaseSchema.extend({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export const GeminiEventSchema = z.discriminatedUnion('type', [
  GeminiInitEventSchema,
  GeminiMessageEventSchema,
  GeminiToolUseEventSchema,
  GeminiToolResultEventSchema,
  GeminiResultEventSchema,
  GeminiErrorEventSchema,
]);

export type GeminiEvent = z.infer<typeof GeminiEventSchema>;
export type GeminiMessage = z.infer<typeof GeminiMessageEventSchema>;
export type GeminiToolUse = z.infer<typeof GeminiToolUseEventSchema>;
export type GeminiToolResult = z.infer<typeof GeminiToolResultEventSchema>;

// ipc contract
// channels for main <-> renderer communication.

export const IPC_CHANNELS = {
  SEND_PROMPT: 'gemini:prompt',
  STOP_GENERATION: 'gemini:stop',
  LIST_SESSIONS: 'gemini:list-sessions',
  ON_STREAM_EVENT: 'gemini:stream-event',
  ON_SESSIONS: 'gemini:sessions',
  ON_ERROR: 'gemini:error',
  CHOOSE_FOLDER: 'gemini:choose-folder',
  ON_STATUS_CHANGE: 'gemini:status-change',
  GET_STATUS: 'gemini:get-status',
  GET_VERSION: 'gemini:get-version',
  // Auth channels
  AUTH_HAS_KEY: 'auth:has-key',
  AUTH_SAVE_KEY: 'auth:save-key',
  AUTH_CLEAR_KEY: 'auth:clear-key',
} as const;

export type GeminiStatus = 'checking' | 'ready' | 'error' | 'active';

export enum AppErrorCode {
  CLI_NOT_FOUND = 'CLI_NOT_FOUND',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  NO_API_KEY = 'NO_API_KEY',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: string;
}

export interface SendPromptPayload {
  prompt: string;
  sessionId?: string;
  cwd?: string;
  yoloMode?: boolean;
}

export interface GeminiSession {
  id: string;
  title: string;
  lastActive: string;
  preview: string;
}
