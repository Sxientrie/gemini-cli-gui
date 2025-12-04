import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// database schema
// defines sessions and thoughts tables for persistent chat storage.

/**
 * sessions table
 * stores chat session metadata.
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['active', 'archived'] })
    .notNull()
    .default('active'),
});

/**
 * thoughts table
 * stores individual messages/events within a session.
 */
export const thoughts = sqliteTable('thoughts', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['message', 'tool_use', 'tool_result', 'error'],
  }).notNull(),
  content: text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Thought = typeof thoughts.$inferSelect;
export type NewThought = typeof thoughts.$inferInsert;
