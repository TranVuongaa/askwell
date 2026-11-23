import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createSupabasePglite } from '../supabase-pglite';

const projectA = '11111111-1111-4111-8111-111111111111';
const projectB = '22222222-2222-4222-8222-222222222222';
const sourceA = '33333333-3333-4333-8333-333333333333';
const sourceB = '44444444-4444-4444-8444-444444444444';
const embedding = `[1,${Array(1535).fill(0).join(',')}]`;

describe('database RPCs', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createSupabasePglite();
    await db.query("insert into public.accounts (clerk_user_id, plan) values ('free_owner', 'free'), ('pro_owner', 'pro')");
    await asRole(db, 'service_role');
  });

  afterEach(async () => { await db.close(); });

  it('enforces Free and Pro project limits and creates a widget config', async () => {
    await db.query("select public.create_project('free_owner', 'Free', 'pk_free', 1)");
    await expect(db.query("select public.create_project('free_owner', 'Extra', 'pk_extra', 1)"))
      .rejects.toThrow(/project limit reached/);
    for (let i = 0; i < 5; i++) {
      await db.query('select public.create_project($1, $2, $3, $4)', ['pro_owner', `Pro ${i}`, `pk_pro_${i}`, 5]);
    }
    await expect(db.query("select public.create_project('pro_owner', 'Extra', 'pk_pro_extra', 5)"))
      .rejects.toThrow(/project limit reached/);
    const configs = await db.query("select count(*)::integer as count from public.widget_configs");
    expect(configs.rows[0]).toEqual({ count: 6 });
  });

  it('reserves source slots, including pending uploads, up to the passed limit', async () => {
    await db.query('insert into public.projects (id, owner_id, name, public_key) values ($1, $2, $3, $4)',
      [projectA, 'free_owner', 'Free', 'pk_free']);
    for (let i = 0; i < 3; i++) {
      await db.query('select public.reserve_knowledge_source($1, $2, $3, $4, $5)',
        [projectA, `File ${i}`, 'pdf', `files/${i}.pdf`, 3]);
    }
    await expect(db.query('select public.reserve_knowledge_source($1, $2, $3, $4, $5)',
      [projectA, 'Pasted', 'text', null, 3])).rejects.toThrow(/knowledge source limit reached/);
    const result = await db.query('select status from public.knowledge_sources where project_id = $1', [projectA]);
    expect(result.rows).toEqual(Array(3).fill({ status: 'uploading' }));
  });

  it('honors Pro source and message limits', async () => {
    await db.query('insert into public.projects (id, owner_id, name, public_key, messages_used) values ($1, $2, $3, $4, $5)',
      [projectB, 'pro_owner', 'Pro', 'pk_pro', 1999]);
    for (let i = 0; i < 25; i++) {
      await db.query('select public.reserve_knowledge_source($1, $2, $3, $4, $5)',
        [projectB, `Text ${i}`, 'text', null, 25]);
    }
    await expect(db.query('select public.reserve_knowledge_source($1, $2, $3, $4, $5)',
      [projectB, 'Extra', 'text', null, 25])).rejects.toThrow(/knowledge source limit reached/);
    expect((await db.query('select public.consume_message($1, $2) as used', [projectB, 2000])).rows[0])
      .toEqual({ used: 2000 });
    await expect(db.query('select public.consume_message($1, $2)', [projectB, 2000]))
      .rejects.toThrow(/message limit reached/);
  });

  it('counts messages atomically and resets the monthly period', async () => {
    await db.query('insert into public.projects (id, owner_id, name, public_key, period_start, messages_used) values ($1, $2, $3, $4, $5, $6)',
      [projectA, 'free_owner', 'Free', 'pk_free', '2020-01-01', 100]);
    expect((await db.query('select public.consume_message($1, $2) as used', [projectA, 100])).rows[0])
      .toEqual({ used: 1 });
    const attempts = await Promise.allSettled(Array.from({ length: 110 }, () =>
      db.query('select public.consume_message($1, $2)', [projectA, 100])));
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(99);
    expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(11);
    expect((await db.query('select messages_used from public.projects where id = $1', [projectA])).rows[0])
      .toEqual({ messages_used: 100 });
  });

  it('saves only to the matching visitor and project, and retrieves ready chunks from that project', async () => {
    await db.query('insert into public.projects (id, owner_id, name, public_key) values ($1, $2, $3, $4), ($5, $6, $7, $8)',
      [projectA, 'free_owner', 'A', 'pk_a', projectB, 'pro_owner', 'B', 'pk_b']);
    await db.query("insert into public.knowledge_sources (id, project_id, title, type, status) values ($1, $2, 'A', 'text', 'ready'), ($3, $4, 'B', 'text', 'ready')",
      [sourceA, projectA, sourceB, projectB]);
    await db.query('insert into public.knowledge_chunks (project_id, source_id, content, embedding) values ($1, $2, $3, $5), ($4, $6, $7, $5)',
      [projectA, sourceA, 'A only', projectB, embedding, sourceB, 'B only']);
    const result = await db.query('select content from public.match_chunks($1, $2, $3)', [projectA, embedding, 5]);
    expect(result.rows).toEqual([{ content: 'A only' }]);
    const turn = await db.query('select public.save_chat_turn($1, $2, $3, $4, $5) as id',
      [projectA, 'visitor_a', null, 'Hello', 'Hi']);
    const conversationId = (turn.rows[0] as { id: string }).id;
    await expect(db.query('select public.save_chat_turn($1, $2, $3, $4, $5)',
      [projectB, 'visitor_a', conversationId, 'Wrong', 'No'])).rejects.toThrow(/conversation not found/);
    await expect(db.query('select public.save_chat_turn($1, $2, $3, $4, $5)',
      [projectA, 'visitor_b', conversationId, 'Wrong', 'No'])).rejects.toThrow(/conversation not found/);
    expect((await db.query('select count(*)::integer as count from public.messages')).rows[0]).toEqual({ count: 2 });
  });

  it('grants service functions only to service_role and owner_activity only to authenticated', async () => {
    for (const role of ['anon', 'authenticated'] as const) {
      await asRole(db, role, 'free_owner');
      await expect(db.query("select public.create_project('free_owner', 'X', 'pk_x', 1)"))
        .rejects.toThrow(/permission denied/);
      await expect(db.query('select * from public.match_chunks($1, $2, $3)', [projectA, embedding, 5]))
        .rejects.toThrow(/permission denied/);
    }
    await asRole(db, 'anon');
    await expect(db.query('select * from public.owner_activity()')).rejects.toThrow(/permission denied/);
    await asRole(db, 'authenticated', 'free_owner');
    expect((await db.query('select * from public.owner_activity()')).rows[0]).toEqual({
      project_count: 0, conversation_count: 0, message_count: 0,
    });
    await asRole(db, 'service_role');
    await expect(db.query('select * from public.owner_activity()')).rejects.toThrow(/permission denied/);
  });
});
