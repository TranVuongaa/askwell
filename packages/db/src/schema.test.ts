import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createSupabasePglite } from '../supabase-pglite';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const ca = '33333333-3333-4333-8333-333333333333';
const cb = '44444444-4444-4444-8444-444444444444';

describe('initial schema permissions', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createSupabasePglite();
    await db.query("insert into public.accounts (clerk_user_id) values ('owner_a'), ('owner_b')");
    await db.query('insert into public.projects (id, owner_id, name, public_key) values ($1, $2, $3, $4), ($5, $6, $7, $8)',
      [a, 'owner_a', 'A', 'pk_a', b, 'owner_b', 'B', 'pk_b']);
    await db.query('insert into public.widget_configs (project_id) values ($1), ($2)', [a, b]);
    await db.query("insert into public.knowledge_sources (id, project_id, title, type) values ('55555555-5555-4555-8555-555555555555', $1, 'A', 'text'), ('66666666-6666-4666-8666-666666666666', $2, 'B', 'text')", [a, b]);
    await db.query("insert into public.knowledge_chunks (project_id, source_id, content, embedding) values ($1, '55555555-5555-4555-8555-555555555555', 'A', $3), ($2, '66666666-6666-4666-8666-666666666666', 'B', $3)", [a, b, `[${Array(1536).fill(0).join(',')}]`]);
    await db.query('insert into public.conversations (id, project_id, visitor_id) values ($1, $2, $3), ($4, $5, $6)', [ca, a, 'visitor_a', cb, b, 'visitor_b']);
    await db.query("insert into public.messages (conversation_id, role, body) values ($1, 'visitor', 'A'), ($2, 'visitor', 'B')", [ca, cb]);
  });

  afterEach(async () => { await db.close(); });

  it('gives anon no table or helper access', async () => {
    await asRole(db, 'anon');
    for (const table of ['accounts', 'projects', 'widget_configs', 'knowledge_sources', 'knowledge_chunks', 'conversations', 'messages']) {
      await expect(db.query(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
    }
    await expect(db.query('select * from private.owned_project_ids()')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from private.owned_conversation_ids()')).rejects.toThrow(/permission denied/);
  });

  it('limits every owner read to their own rows', async () => {
    await asRole(db, 'authenticated', 'owner_a');
    for (const [table, ownerColumn] of [
      ['accounts', 'clerk_user_id'], ['projects', 'owner_id'],
      ['widget_configs', 'project_id'], ['knowledge_sources', 'project_id'],
      ['knowledge_chunks', 'project_id'], ['conversations', 'project_id'],
      ['messages', 'conversation_id'],
    ]) {
      const result = await db.query(`select ${ownerColumn} from public.${table}`);
      expect(result.rows, table).toHaveLength(1);
      expect(Object.values(result.rows[0] as object)[0], table).toBe(
        table === 'accounts' || table === 'projects' ? 'owner_a' : table === 'messages' ? ca : a,
      );
    }
  });

  it('permits only name updates and deletes on owned projects', async () => {
    await asRole(db, 'authenticated', 'owner_a');
    expect((await db.query("update public.projects set name = 'Renamed' where id = $1 returning id", [a])).rows).toHaveLength(1);
    expect((await db.query("update public.projects set name = 'Stolen' where id = $1 returning id", [b])).rows).toHaveLength(0);
    await expect(db.query("update public.projects set public_key = 'pk_bad' where id = $1", [a])).rejects.toThrow(/permission denied/);
    await expect(db.query("insert into public.projects (owner_id, name, public_key) values ('owner_a', 'X', 'pk_x')")).rejects.toThrow(/permission denied/);
    expect((await db.query('delete from public.projects where id = $1 returning id', [b])).rows).toHaveLength(0);
    expect((await db.query('delete from public.projects where id = $1 returning id', [a])).rows).toHaveLength(1);
  });

  it('allows server writes and rejects a chunk linked to a source in another project', async () => {
    await asRole(db, 'service_role');
    expect((await db.query("update public.projects set name = 'Server' where id = $1 returning id", [b])).rows).toHaveLength(1);
    await expect(db.query(
      "insert into public.knowledge_chunks (project_id, source_id, content, embedding) values ($1, '66666666-6666-4666-8666-666666666666', 'wrong project', $2)",
      [a, `[${Array(1536).fill(0).join(',')}]`],
    )).rejects.toThrow(/foreign key constraint/);
  });
});
