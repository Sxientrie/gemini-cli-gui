import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

// cli credential loader
// attempts to load oauth credentials from the gemini cli's storage.
// checks ~/.gemini/oauth_creds.json for existing cli authentication.

interface CliOAuthCredentials {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expiry_date?: number;
}

/**
 * attempts to load oauth credentials from the gemini cli storage
 * returns the api key (access token) if found and valid
 */
export function loadCliCredentials(): string | null {
  try {
    const cliCredsPath = join(homedir(), '.gemini', 'oauth_creds.json');
    
    if (!existsSync(cliCredsPath)) {
      console.log('[CliCredentials] No CLI credentials found at', cliCredsPath);
      return null;
    }

    const credsJson = readFileSync(cliCredsPath, 'utf-8');
    const creds = JSON.parse(credsJson) as CliOAuthCredentials;

    if (!creds.access_token) {
      console.log('[CliCredentials] CLI credentials file exists but has no access_token');
      return null;
    }

    // check if token is expired
    if (creds.expiry_date && creds.expiry_date < Date.now()) {
      console.log('[CliCredentials] CLI access token has expired');
      return null;
    }

    console.log('[CliCredentials] Successfully loaded CLI OAuth credentials');
    return creds.access_token;
  } catch (error) {
    console.error('[CliCredentials] Failed to load CLI credentials:', error);
    return null;
  }
}
