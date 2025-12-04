import { BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import readline from 'node:readline';
import { IPC_CHANNELS, type SendPromptPayload, type GeminiEvent, AppErrorCode, type AppError } from '../shared/types';
import { getApiKey } from './auth';

const execAsync = promisify(exec);

// gemini manager
// manages a persistent cli process that stays alive for the entire session.
// spawns once in interactive mode, sends prompts via stdin.

export class GeminiManager {
  private persistentProcess: ChildProcessWithoutNullStreams | null = null;
  private window: BrowserWindow;
  private status: 'checking' | 'ready' | 'error' | 'active' = 'checking';
  private version: string | null = null;
  private isProcessing = false;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.registerHandlers();
    this.checkCli();
  }

  // state management

  private updateStatus(status: 'checking' | 'ready' | 'error' | 'active') {
    this.status = status;
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(IPC_CHANNELS.ON_STATUS_CHANGE, status);
    }
  }

  private sanitizeError(raw: string): AppError {
    if (/authentication failed|login required|invalid credentials|credential.*fail/i.test(raw)) {
      return { 
        code: AppErrorCode.AUTH_FAILED, 
        message: 'Authentication failed. Please login again.', 
        details: raw 
      };
    }
    if (/rate limit|quota exceeded|429/i.test(raw)) {
      return { 
        code: AppErrorCode.RATE_LIMITED, 
        message: 'Rate limit exceeded. Please try again later.', 
        details: raw 
      };
    }
    return { 
      code: AppErrorCode.UNKNOWN, 
      message: 'An unexpected error occurred.', 
      details: raw 
    };
  }

  // cli initialization

  async checkCli() {
    this.updateStatus('checking');
    try {
      const { stdout } = await execAsync('gemini --version');
      this.version = stdout.trim();
      console.log('[GeminiManager] Gemini CLI found:', this.version);
      
      // start persistent process immediately
      await this.startPersistentCli();
      
      this.updateStatus('ready');
      return true;
    } catch (error) {
      console.warn('[GeminiManager] Gemini CLI not found:', error);
      this.updateStatus('error');
      if (!this.window.isDestroyed()) {
        const appError: AppError = {
          code: AppErrorCode.CLI_NOT_FOUND,
          message: 'The `gemini` command was not found. Please ensure it is installed.',
          details: String(error)
        };
        this.window.webContents.send(IPC_CHANNELS.ON_ERROR, appError);
      }
      return false;
    }
  }

  private async startPersistentCli() {
    console.log('[GeminiManager] Starting persistent CLI in interactive mode...');
    
    // spawn gemini in interactive mode with no output format (default interactive)
    // the cli will stay alive and accept prompts via stdin
    this.persistentProcess = spawn('gemini', [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        // don't pass API key - let CLI use its own credentials
        PYTHONUNBUFFERED: '1',
        NO_COLOR: '1',
      },
    });

    // setup readline to process output line-by-line
    const rl = readline.createInterface({
      input: this.persistentProcess.stdout,
      terminal: false,
    });

    rl.on('line', (line: string) => {
      // in interactive mode, the CLI outputs plain text, not JSONL
      // we need to detect when it's ready and when responses complete
      
      const trimmed = line.trim();
      if (!trimmed) return;

      console.log('[GeminiManager] CLI Output:', trimmed);

      // detect when cli is ready for input
      if (trimmed.includes('>') || trimmed.toLowerCase().includes('gemini')) {
        if (!this.isProcessing) {
          console.log('[GeminiManager] CLI is ready for prompts');
        }
        return;
      }

      // stream the text back to renderer
      if (this.isProcessing && !this.window.isDestroyed()) {
        const geminiEvent: GeminiEvent = {
          type: 'message',
          role: 'model',
          content: trimmed + '\n',
          timestamp: new Date().toISOString(),
        };
        this.window.webContents.send(IPC_CHANNELS.ON_STREAM_EVENT, geminiEvent);
      }
    });

    this.persistentProcess.stderr.on('data', (chunk: Buffer) => {
      const raw = chunk.toString();
      console.log('[GeminiManager] CLI Stderr:', raw);
      
      // ignore informational messages
      if (/Loaded cached credentials|This warning will not show up/i.test(raw)) {
        return;
      }
    });

    this.persistentProcess.on('exit', (code: number | null) => {
      console.log('[GeminiManager] Persistent CLI exited with code', code);
      this.persistentProcess = null;
      this.updateStatus('error');
    });

    this.persistentProcess.on('error', (err: Error) => {
      console.error('[GeminiManager] Persistent CLI error:', err);
      this.persistentProcess = null;
      this.updateStatus('error');
    });

    console.log('[GeminiManager] Persistent CLI started successfully');
  }

  // prompt handling

  async sendPrompt(payload: SendPromptPayload) {
    if (!this.persistentProcess || !this.persistentProcess.stdin) {
      console.error('[GeminiManager] Persistent CLI not running!');
      if (!this.window.isDestroyed()) {
        const error: AppError = {
          code: AppErrorCode.UNKNOWN,
          message: 'CLI process not available. Please restart the application.',
        };
        this.window.webContents.send(IPC_CHANNELS.ON_ERROR, error);
      }
      return;
    }

    if (this.isProcessing) {
      console.log('[GeminiManager] A request is already in progress');
      return;
    }

    this.isProcessing = true;
    this.updateStatus('active');

    console.log('[GeminiManager] Sending prompt to persistent CLI:', payload.prompt.substring(0, 50));
    
    // write prompt to stdin
    try {
      this.persistentProcess.stdin.write(payload.prompt + '\n');
    } catch (error) {
      console.error('[GeminiManager] Failed to write to stdin:', error);
      this.isProcessing = false;
      this.updateStatus('ready');
    }

    // we'll detect completion based on CLI output patterns
    // for now, auto-reset after a timeout
    setTimeout(() => {
      if (this.isProcessing) {
        this.isProcessing = false;
        this.updateStatus('ready');
        
        if (!this.window.isDestroyed()) {
          const geminiEvent: GeminiEvent = {
            type: 'result',
            status: 'success',
          };
          this.window.webContents.send(IPC_CHANNELS.ON_STREAM_EVENT, geminiEvent);
        }
      }
    }, 30000); // 30 second timeout
  }

  stopGeneration() {
    if (this.persistentProcess && this.persistentProcess.stdin) {
      // send Ctrl+C to interrupt
      this.persistentProcess.stdin.write('\x03');
      this.isProcessing = false;
      this.updateStatus('ready');
    }
  }

  async listSessions() {
    console.log('[GeminiManager] listSessions called');
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(IPC_CHANNELS.ON_SESSIONS, []);
    }
  }

  kill() {
    if (this.persistentProcess) {
      this.persistentProcess.kill('SIGTERM');
      this.persistentProcess = null;
    }
  }

  // ipc handlers

  private registerHandlers() {
    ipcMain.on(IPC_CHANNELS.SEND_PROMPT, (_, payload: SendPromptPayload) => {
      this.sendPrompt(payload);
    });

    ipcMain.on(IPC_CHANNELS.STOP_GENERATION, () => {
      this.stopGeneration();
    });

    ipcMain.on(IPC_CHANNELS.LIST_SESSIONS, () => {
      this.listSessions();
    });

    ipcMain.handle(IPC_CHANNELS.CHOOSE_FOLDER, async () => {
      const result = await dialog.showOpenDialog(this.window, {
        properties: ['openDirectory']
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle(IPC_CHANNELS.GET_STATUS, () => {
      return this.status;
    });

    ipcMain.handle(IPC_CHANNELS.GET_VERSION, () => {
      return this.version;
    });
  }
}
