import type { Config } from 'drizzle-kit';

export default {
  schema: './src/main/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'better-sqlite3',
} satisfies Config;
