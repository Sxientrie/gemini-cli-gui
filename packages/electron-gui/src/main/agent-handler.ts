import type { WebContents } from 'electron';
import {
  Config,
  GeminiClient,
  GeminiEventType,
  executeToolCall
} from '@google/gemini-cli-core';

// Minimal Config implementation for Electron
async function createConfig(): Promise<Config> {
  const cwd = process.cwd();
  // ConfigParameters requires many fields. We provide minimal set.
  const config = new Config({
    sessionId: 'electron-session-' + Date.now(),
    targetDir: cwd,
    debugMode: true,
    model: 'gemini-2.0-flash-001',
    cwd: cwd,
  });

  await config.initialize();
  // Authentication should be handled here or via config loading

  return config;
}

let config: Config | null = null;
let client: GeminiClient | null = null;

export async function handleAgentMessage(message: string, webContents: WebContents) {
  try {
    if (!config) {
        config = await createConfig();
    }
    if (!client) {
        client = config.getGeminiClient();
    }

    const abortController = new AbortController();
    const promptId = 'prompt-' + Date.now();

    const parts = [{ text: message }];

    const responseStream = client.sendMessageStream(
        parts,
        abortController.signal,
        promptId
    );

    for await (const event of responseStream) {
        if (event.type === GeminiEventType.Content) {
            if (event.value) {
                webContents.send('agent-response', event.value);
            }
        } else if (event.type === GeminiEventType.ToolCallRequest) {
            const requestInfo = event.value;
            webContents.send('agent-response', `\n[Tool Call: ${requestInfo.name}]\n`);

            try {
                // Execute tool
                const completedToolCall = await executeToolCall(
                    config!,
                    requestInfo,
                    abortController.signal
                );

                // TODO: Feed tool result back to Gemini
                webContents.send('agent-response', `\n[Tool Result: ${JSON.stringify(completedToolCall.response.resultDisplay)}]\n`);

            } catch (error: any) {
                webContents.send('agent-response', `\n[Tool Error: ${error.message}]\n`);
            }
        } else if (event.type === GeminiEventType.Error) {
             webContents.send('agent-response', `\nError: ${event.value.error.message}\n`);
        }
    }

  } catch (e: any) {
    console.error(e);
    webContents.send('agent-response', `Error: ${e.message}`);
  }
}
