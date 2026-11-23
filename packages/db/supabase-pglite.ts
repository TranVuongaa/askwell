import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

const migrationUrls = [
  new URL('../../supabase/migrations/20261120093243_initial_schema.sql', import.meta.url),
  new URL('../../supabase/migrations/20261123120000_database_functions.sql', import.meta.url),
];

/** A disposable Supabase-like database for migration and RLS tests only. */
export async function createSupabasePglite(): Promise<PGlite> {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(`
    create schema auth;
    create schema extensions;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create function auth.jwt() returns jsonb language sql stable set search_path = '' as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.jwt() to authenticated;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  for (const migrationUrl of migrationUrls) {
    await db.exec(await readFile(fileURLToPath(migrationUrl), 'utf8'));
  }
  return db;
}

/** Switches the database connection into a simulated Supabase request. */
export async function asRole(db: PGlite, role: 'anon' | 'authenticated' | 'service_role', sub?: string): Promise<void> {
  await db.exec('reset role');
  await db.query('select set_config($1, $2, false)', ['request.jwt.claims', sub ? JSON.stringify({ sub }) : '{}']);
  await db.exec(`set role ${role}`);
}
