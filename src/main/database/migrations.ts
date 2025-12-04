import { sql } from 'drizzle-orm';
import { getDatabase } from './client';

// database migrations
// handles schema creation and updates for both dev and production (asar).

/**
 * runs initial migration to create tables.
 * idempotent - safe to run multiple times.
 */
export function runMigrations(): void {
  const db = getDatabase();

  console.log('[DB] Running migrations...');

  // create sessions table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived'))
    )
  `);

  // create thoughts table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS thoughts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('message', 'tool_use', 'tool_result', 'error')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // create indices for performance
  db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_thoughts_session_id 
    ON thoughts(session_id)
  `);

  db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_thoughts_timestamp 
    ON thoughts(timestamp)
  `);

  db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_sessions_created_at 
    ON sessions(created_at)
  `);

  console.log('[DB] Migrations completed successfully');
}

/**
 * checks if database schema is initialized.
 */
export function isDatabaseInitialized(): boolean {
  const db = getDatabase();

  try {
    const result = db.get<{ count: number }>(sql`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name='sessions'
    `);

    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error('[DB] Error checking initialization:', error);
    return false;
  }
}
