import { app, safeStorage } from 'electron';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { loadCliCredentials } from './cli-credentials';

// auth manager
// secure storage of api key using electron safestorage.

interface AuthData {
  encryptedApiKey?: string;
}

const AUTH_FILE_NAME = 'auth.json';

// file path management

function getAuthFilePath(): string {
  const userDataPath = app.getPath('userData');
  const authDir = join(userDataPath, 'auth');

  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  return join(authDir, AUTH_FILE_NAME);
}

function readAuthData(): AuthData {
  const authPath = getAuthFilePath();
  
  if (!existsSync(authPath)) {
    return {};
  }

  try {
    const data = readFileSync(authPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Auth] Failed to read auth data:', error);
    return {};
  }
}

function writeAuthData(data: AuthData): void {
  const authPath = getAuthFilePath();
  
  try {
    writeFileSync(authPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Auth] Failed to write auth data:', error);
    throw error;
  }
}

// api key operations

export function hasApiKey(): boolean {
  const data = readAuthData();
  const hasKey = !!data.encryptedApiKey;
  console.log('[Auth] Checking for API key:', hasKey, 'at', getAuthFilePath());
  return hasKey;
}

export function saveApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const encrypted = safeStorage.encryptString(apiKey.trim());
  const encryptedBase64 = encrypted.toString('base64');

  writeAuthData({ encryptedApiKey: encryptedBase64 });
  console.log('[Auth] API key saved successfully to:', getAuthFilePath());
}

export function getApiKey(): string | null {
  const data = readAuthData();
  
  if (!data.encryptedApiKey) {
    return null;
  }

  try {
    const encrypted = Buffer.from(data.encryptedApiKey, 'base64');
    const decrypted = safeStorage.decryptString(encrypted);
    return decrypted;
  } catch (error) {
    console.error('[Auth] Failed to decrypt API key:', error);
    return null;
  }
}

export function clearApiKey(): void {
  writeAuthData({});
  console.log('[Auth] API key cleared');
}
