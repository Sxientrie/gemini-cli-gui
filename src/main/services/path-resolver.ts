import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const execAsync = promisify(exec);

// path resolver
// locates the gemini cli binary when electron's path is stripped.
// implements fallback strategy: known paths -> npm config -> cache.

interface PathCache {
  path: string | null;
  timestamp: number;
}

let cache: PathCache = { path: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * resolves the path to the gemini cli binary.
 * uses multiple strategies with fallback:
 * 1. check cache
 * 2. check known installation paths (windows/mac/linux)
 * 3. query npm config for global prefix
 * 4. return null (caller should prompt user)
 */
export async function resolveCliPath(): Promise<string | null> {
  // check cache first
  const now = Date.now();
  if (cache.path && (now - cache.timestamp) < CACHE_TTL) {
    console.log('[PathResolver] Using cached path:', cache.path);
    return cache.path;
  }

  console.log('[PathResolver] Resolving gemini CLI path...');

  // strategy 1: check known paths
  const knownPaths = getKnownPaths();
  for (const candidatePath of knownPaths) {
    if (existsSync(candidatePath)) {
      console.log('[PathResolver] Found at known path:', candidatePath);
      cache = { path: candidatePath, timestamp: now };
      return candidatePath;
    }
  }

  // strategy 2: query npm config
  try {
    const { stdout } = await execAsync('npm config get prefix', { timeout: 5000 });
    const npmPrefix = stdout.trim();
    
    const npmPath = process.platform === 'win32'
      ? join(npmPrefix, 'gemini.cmd')
      : join(npmPrefix, 'bin', 'gemini');

    if (existsSync(npmPath)) {
      console.log('[PathResolver] Found via npm config:', npmPath);
      cache = { path: npmPath, timestamp: now };
      return npmPath;
    }
  } catch (error) {
    console.warn('[PathResolver] npm config query failed:', error);
  }

  // strategy 3: try which/where command
  try {
    const whichCmd = process.platform === 'win32' ? 'where gemini' : 'which gemini';
    const { stdout } = await execAsync(whichCmd, { timeout: 3000 });
    const whichPath = stdout.trim().split('\n')[0]; // take first result
    
    if (existsSync(whichPath)) {
      console.log('[PathResolver] Found via which/where:', whichPath);
      cache = { path: whichPath, timestamp: now };
      return whichPath;
    }
  } catch (error) {
    console.warn('[PathResolver] which/where command failed:', error);
  }

  console.warn('[PathResolver] Could not locate gemini CLI binary');
  return null;
}

/**
 * gets platform-specific known installation paths
 */
function getKnownPaths(): string[] {
  const paths: string[] = [];

  if (process.platform === 'win32') {
    // windows: %APPDATA%\npm\gemini.cmd
    const appData = process.env.APPDATA;
    if (appData) {
      paths.push(join(appData, 'npm', 'gemini.cmd'));
    }
    // also check program files
    const programFiles = process.env.ProgramFiles;
    if (programFiles) {
      paths.push(join(programFiles, 'nodejs', 'gemini.cmd'));
    }
  } else if (process.platform === 'darwin') {
    // macos: /usr/local/bin or /opt/homebrew/bin (apple silicon)
    paths.push('/usr/local/bin/gemini');
    paths.push('/opt/homebrew/bin/gemini');
    
    // nvm installations
    const home = homedir();
    paths.push(join(home, '.nvm', 'versions', 'node', 'current', 'bin', 'gemini'));
  } else {
    // linux: /usr/local/bin, /usr/bin
    paths.push('/usr/local/bin/gemini');
    paths.push('/usr/bin/gemini');
    
    // nvm installations
    const home = homedir();
    paths.push(join(home, '.nvm', 'versions', 'node', 'current', 'bin', 'gemini'));
  }

  return paths;
}

/**
 * clears the path cache, forcing a re-resolve on next call
 */
export function clearPathCache(): void {
  cache = { path: null, timestamp: 0 };
  console.log('[PathResolver] Cache cleared');
}

/**
 * manually sets the cli path (e.g., from user selection)
 */
export function setCliPath(path: string): void {
  cache = { path, timestamp: Date.now() };
  console.log('[PathResolver] Path manually set:', path);
}
