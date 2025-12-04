import { ipcMain } from 'electron';
import { eq, desc } from 'drizzle-orm';
import { getDatabase } from './client';
import { sessions, thoughts, type NewSession, type NewThought } from './schema';

// database ipc handlers
// exposes database operations to renderer process.

/**
 * registers all database-related ipc handlers.
 */
export function registerDatabaseHandlers(): void {
  // get all sessions
  ipcMain.handle('db:get-sessions', async () => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt));
    return result;
  });

  // get session by id
  ipcMain.handle('db:get-session', async (_, sessionId: string) => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    return result[0] ?? null;
  });

  // create new session
  ipcMain.handle('db:create-session', async (_, data: NewSession) => {
    const db = getDatabase();
    await db.insert(sessions).values(data);
    return data;
  });

  // update session
  ipcMain.handle(
    'db:update-session',
    async (_, sessionId: string, data: Partial<NewSession>) => {
      const db = getDatabase();
      await db.update(sessions).set(data).where(eq(sessions.id, sessionId));
      return true;
    }
  );

  // delete session (cascades to thoughts)
  ipcMain.handle('db:delete-session', async (_, sessionId: string) => {
    const db = getDatabase();
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return true;
  });

  // get thoughts for a session
  ipcMain.handle('db:get-thoughts', async (_, sessionId: string) => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(thoughts)
      .where(eq(thoughts.sessionId, sessionId))
      .orderBy(thoughts.timestamp);
    return result;
  });

  // save thought
  ipcMain.handle('db:save-thought', async (_, data: NewThought) => {
    const db = getDatabase();
    await db.insert(thoughts).values(data);
    return data;
  });

  // save multiple thoughts (batch)
  ipcMain.handle('db:save-thoughts', async (_, data: NewThought[]) => {
    const db = getDatabase();
    await db.insert(thoughts).values(data);
    return true;
  });

  console.log('[DB] IPC handlers registered');
}
