# Quick Start: Using the Database API

## Basic Usage

### 1. Create a New Session

```typescript
const sessionId = crypto.randomUUID();

await window.api.db.createSession({
  id: sessionId,
  title: "My First Chat",
  createdAt: new Date(),
  status: "active",
});
```

### 2. Save a Message

```typescript
await window.api.db.saveThought({
  id: crypto.randomUUID(),
  sessionId: sessionId,
  type: "message",
  content: JSON.stringify({
    role: "user",
    text: "Hello, Gemini!",
  }),
  timestamp: new Date(),
});
```

### 3. Load Session History

```typescript
const thoughts = await window.api.db.getThoughts(sessionId);

const messages = thoughts.map((thought) => ({
  ...JSON.parse(thought.content),
  timestamp: thought.timestamp,
}));
```

### 4. List All Sessions

```typescript
const sessions = await window.api.db.getSessions();
// Returns sessions ordered by createdAt (newest first)
```

### 5. Delete a Session

```typescript
await window.api.db.deleteSession(sessionId);
// Automatically deletes all associated thoughts (CASCADE)
```

## Integration with useGemini Hook

```typescript
// In your useGemini hook
useEffect(() => {
  const unsubscribe = window.api.onStreamEvent(async (event) => {
    // Update UI state
    setMessages((prev) => [...prev, event]);

    // Persist to database
    if (currentSessionId) {
      await window.api.db.saveThought({
        id: crypto.randomUUID(),
        sessionId: currentSessionId,
        type: event.type,
        content: JSON.stringify(event),
        timestamp: new Date(),
      });
    }
  });

  return unsubscribe;
}, [currentSessionId]);
```

## Session Management Pattern

```typescript
function ChatApp() {
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load sessions on mount
  useEffect(() => {
    async function init() {
      const dbSessions = await window.api.db.getSessions();
      setSessions(dbSessions);

      // Auto-load most recent session
      if (dbSessions.length > 0) {
        loadSession(dbSessions[0].id);
      }
    }
    init();
  }, []);

  async function loadSession(id: string) {
    const thoughts = await window.api.db.getThoughts(id);
    const messages = thoughts.map((t) => JSON.parse(t.content));
    setMessages(messages);
    setCurrentSessionId(id);
  }

  async function createNewSession() {
    const id = crypto.randomUUID();
    await window.api.db.createSession({
      id,
      title: "New Chat",
      createdAt: new Date(),
      status: "active",
    });
    setCurrentSessionId(id);
    setMessages([]);
  }

  return (
    <div>
      <SessionList
        sessions={sessions}
        onSelect={loadSession}
        onNew={createNewSession}
      />
      <Chat sessionId={currentSessionId} />
    </div>
  );
}
```

## Type Definitions

```typescript
interface Session {
  id: string;
  title: string;
  createdAt: Date;
  status: "active" | "archived";
}

interface Thought {
  id: string;
  sessionId: string;
  type: "message" | "tool_use" | "tool_result" | "error";
  content: string; // JSON string
  timestamp: Date;
}
```

## Best Practices

1. **Always use UUIDs**: Use `crypto.randomUUID()` for IDs
2. **Store JSON**: Keep `content` flexible by storing JSON strings
3. **Handle errors**: Wrap DB calls in try-catch
4. **Batch operations**: Use `saveThoughts()` for multiple inserts
5. **Clean up**: Delete old sessions to prevent database bloat

## Testing

```typescript
// Test database connection
async function testDatabase() {
  try {
    // Create test session
    const testId = crypto.randomUUID();
    await window.api.db.createSession({
      id: testId,
      title: "Test Session",
      createdAt: new Date(),
      status: "active",
    });

    // Verify it exists
    const session = await window.api.db.getSession(testId);
    console.log("✅ Database working:", session);

    // Clean up
    await window.api.db.deleteSession(testId);
  } catch (error) {
    console.error("❌ Database error:", error);
  }
}
```
