import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import * as schema from './schema';

// database client
// initializes better-sqlite3 connection in user data directory.

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database.Database | null = null;

/**
 * gets database file path in user data directory.
 * creates directory if it doesn't exist.
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = join(userDataPath, 'db');

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  return join(dbDir, 'gemini.db');
}

/**
 * initializes database connection.
 * creates tables if they don't exist.
 * returns drizzle instance.
 */
export function initDatabase(): ReturnType<typeof drizzle> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  console.log('[DB] Initializing database at:', dbPath);

  sqliteInstance = new Database(dbPath);
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('foreign_keys = ON');

  dbInstance = drizzle(sqliteInstance, { schema });

  return dbInstance;
}

/**
 * gets existing database instance.
 * throws if not initialized.
 */
export function getDatabase(): ReturnType<typeof drizzle> {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * closes database connection.
 * used during app shutdown.
 */
export function closeDatabase(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
    console.log('[DB] Database connection closed');
  }
}
