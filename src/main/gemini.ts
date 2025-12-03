import { BrowserWindow, ipcMain, dialog } from 'electron';
import { execa } from 'execa';
import { createInterface } from 'node:readline';
import { IPC_CHANNELS, type SendPromptPayload, type GeminiEvent } from '../shared/types';

// gemini manager
// handles the persistent cli process, streams output, manages lifecycle.

export class GeminiManager {
  private currentProcess: ReturnType<typeof execa> | null = null;
  private window: BrowserWindow;
  private status: 'checking' | 'ready' | 'error' | 'active' = 'checking';
  private version: string | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.registerHandlers();
    this.checkCli().then((found) => {
      if (found) {
        this.startPersistentProcess();
      }
    });
  }

  private updateStatus(status: 'checking' | 'ready' | 'error' | 'active') {
    this.status = status;
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(IPC_CHANNELS.ON_STATUS_CHANGE, status);
    }
  }

  // checks if gemini is in the path.
  async checkCli() {
    this.updateStatus('checking');
    try {
      const { stdout } = await execa('gemini', ['--version'], { preferLocal: true });
      this.version = stdout.trim();
      console.log('Gemini CLI found:', this.version);
      this.updateStatus('ready');
      return true;
    } catch (error) {
      console.warn('Gemini CLI not found:', error);
      this.updateStatus('error');
      if (!this.window.isDestroyed()) {
        dialog.showMessageBox(this.window, {
          type: 'warning',
          title: 'Gemini CLI Not Found',
          message: 'The `gemini` command was not found. Please ensure it is installed.',
          buttons: ['OK'],
        });
      }
      return false;
    }
  }

  // spawns the cli in persistent mode.
  // uses stream-json output format to pipe events back to renderer.
  private startPersistentProcess() {
    if (this.currentProcess) {
      this.kill();
    }

    this.currentProcess = execa('gemini', ['--output-format', 'stream-json'], {
      preferLocal: true,
      reject: false,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    this.updateStatus('ready');

    if (this.currentProcess.stdout) {
      const rl = createInterface({
        input: this.currentProcess.stdout,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        if (line.trim()) {
          try {
            const event = JSON.parse(line) as GeminiEvent;
            if (!this.window.isDestroyed()) {
              this.window.webContents.send(IPC_CHANNELS.ON_STREAM_EVENT, event);
            }
            
            if (event.type === 'result' || event.type === 'error') {
               this.updateStatus('ready');
            } else {
               this.updateStatus('active');
            }
  
          } catch (e) {
            console.error('Failed to parse JSON line:', e, line);
          }
        }
      });
    }

    if (this.currentProcess.stderr) {
      this.currentProcess.stderr.on('data', (chunk: Buffer) => {
        console.error('Gemini CLI Stderr:', chunk.toString());
      });
    }

    this.currentProcess.on('exit', (code: number | null) => {
      console.log(`Gemini CLI exited with code ${code}`);
      this.currentProcess = null;
      this.updateStatus('error');
    });
  }

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

  sendPrompt(payload: SendPromptPayload) {
    if (!this.currentProcess) {
      this.startPersistentProcess();
    }

    if (this.currentProcess && this.currentProcess.stdin) {
      this.updateStatus('active');
      this.currentProcess.stdin.write(payload.prompt + '\n');
    } else {
      if (!this.window.isDestroyed()) {
        this.window.webContents.send(IPC_CHANNELS.ON_ERROR, {
          message: 'Gemini CLI process is not running',
        });
      }
    }
  }

  stopGeneration() {
    // restart process to kill current generation.
    this.startPersistentProcess();
  }

  kill() {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
      this.updateStatus('ready');
    }
  }

  async listSessions() {
    try {
      const { stdout } = await execa('gemini', [
        '--list-sessions',
      ], { preferLocal: true });

      const sessions = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.match(/^\d+\./))
        .map(line => {
          const match = line.match(/^\d+\.\s+(.+)\s+\((.+?)\)\s+\[([a-f0-9-]+)\]$/);
          if (match) {
            return {
              title: match[1],
              lastActive: match[2],
              id: match[3],
              preview: match[1],
            };
          }
          return null;
        })
        .filter(Boolean);

      if (!this.window.isDestroyed()) {
        this.window.webContents.send(IPC_CHANNELS.ON_SESSIONS, sessions);
      }
    } catch (error) {
      console.error('Failed to list sessions', error);
    }
  }
}
