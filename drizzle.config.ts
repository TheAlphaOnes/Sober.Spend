import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * `drizzle-kit generate` reads `db/schema.ts` and emits a versioned SQL
 * migration under `supabase/migrations/`. The migration is then applied
 * to the Supabase Postgres database via the Supabase CLI.
 *
 * The dialect is PostgreSQL — Drizzle only manages the schema here; the
 * React Native client queries through supabase-js, not drizzle-orm.
 */
export default defineConfig({
  schema: './db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
});
