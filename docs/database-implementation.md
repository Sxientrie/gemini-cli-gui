# Database Persistence Layer Implementation

## Overview

Successfully implemented a complete SQLite persistence layer for the Gemini CLI Electron GUI using `better-sqlite3` and `drizzle-orm`. The database stores chat sessions and their associated thoughts (messages, tool uses, etc.) with full CRUD operations exposed via IPC.

## Architecture

### Database Location

- **Path**: `app.getPath('userData')/db/gemini.db`
- **Mode**: WAL (Write-Ahead Logging) for better concurrency
- **Foreign Keys**: Enabled for referential integrity

### Schema

#### `sessions` Table

```typescript
{
  id: string (PK),
  title: string,
  createdAt: timestamp,
  status: 'active' | 'archived'
}
```

#### `thoughts` Table

```typescript
{
  id: string (PK),
  sessionId: string (FK -> sessions.id, CASCADE DELETE),
  type: 'message' | 'tool_use' | 'tool_result' | 'error',
  content: string (JSON),
  timestamp: timestamp
}
```

### Indices

- `idx_thoughts_session_id` - Fast session lookup
- `idx_thoughts_timestamp` - Chronological ordering
- `idx_sessions_created_at` - Session list sorting

## File Structure

```
src/main/database/
├── index.ts          # Barrel export
├── client.ts         # Database initialization & connection management
├── schema.ts         # Drizzle ORM schema definitions
├── migrations.ts     # Schema creation & migration logic
└── handlers.ts       # IPC handlers for renderer communication
```

## IPC API

All database operations are exposed through `window.api.db`:

### Sessions

- `getSessions()` - Retrieve all sessions (ordered by createdAt DESC)
- `getSession(sessionId)` - Get single session by ID
- `createSession(data)` - Create new session
- `updateSession(sessionId, data)` - Update session title/status
- `deleteSession(sessionId)` - Delete session (cascades to thoughts)

### Thoughts

- `getThoughts(sessionId)` - Get all thoughts for a session (ordered by timestamp)
- `saveThought(data)` - Save single thought
- `saveThoughts(data[])` - Batch save multiple thoughts

## Lifecycle

1. **App Startup** (`app.whenReady()`):

   - `initDatabase()` - Creates DB connection
   - `runMigrations()` - Creates tables if needed
   - `registerDatabaseHandlers()` - Sets up IPC

2. **App Shutdown** (`window-all-closed`):
   - `closeDatabase()` - Closes connection gracefully

## Type Safety

- Full TypeScript support via Drizzle ORM
- Type definitions in `src/electron.d.ts`
- Inferred types: `Session`, `NewSession`, `Thought`, `NewThought`

## Usage Example

```typescript
// Renderer process
const sessions = await window.api.db.getSessions();

const newSession = await window.api.db.createSession({
  id: crypto.randomUUID(),
  title: "New Chat",
  createdAt: new Date(),
  status: "active",
});

await window.api.db.saveThought({
  id: crypto.randomUUID(),
  sessionId: newSession.id,
  type: "message",
  content: JSON.stringify({ role: "user", text: "Hello" }),
  timestamp: new Date(),
});
```

## Production Considerations

- ✅ ASAR-compatible (migrations use raw SQL, not file-based)
- ✅ Handles both dev and production paths
- ✅ Idempotent migrations (safe to run multiple times)
- ✅ Foreign key cascades prevent orphaned data
- ✅ WAL mode for better performance
- ✅ Proper connection cleanup on shutdown

## Next Steps

To integrate with the existing chat UI:

1. **Modify `useGemini` hook**:

   - Load sessions from DB on mount
   - Save thoughts as events stream in
   - Create new session on first message

2. **Update session management**:

   - Replace in-memory session array with DB queries
   - Implement session switching/loading
   - Add session deletion UI

3. **Add persistence for**:
   - Tool use events
   - Error states
   - Generation metadata (tokens, timing)

## Dependencies Added

```json
{
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "drizzle-orm": "^0.38.3"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "drizzle-kit": "^0.31.2"
  }
}
```

## Configuration

`drizzle.config.ts` - For future schema management via `drizzle-kit`
