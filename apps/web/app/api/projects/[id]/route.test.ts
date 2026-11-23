import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), createOwnerClient: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('../../../../lib/supabase/owner', () => ({ createOwnerClient: mocks.createOwnerClient }));

import { DELETE, PATCH } from './route';

const id = '11111111-1111-4111-8111-111111111111';
const row = {
  id, owner_id: 'user_1', name: 'Renamed', public_key: 'pk_example',
  messages_used: 0, period_start: '2026-11-01', created_at: '2026-11-23T00:00:00Z',
};
const context = (projectId = id) => ({ params: Promise.resolve({ id: projectId }) });
const request = (body: unknown) => new Request(`http://localhost/api/projects/${id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const deleteRequest = () => new Request(`http://localhost/api/projects/${id}`, { method: 'DELETE' });

describe('/api/projects/:id', () => {
  let rows: typeof row[];
  let update: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;
  let eq: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;
  let deleting: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    rows = [{ ...row, name: 'Original' }];
    deleting = false;
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
    const maybeSingle = vi.fn(async () => {
      const data = rows.find((project) => project.id === eq.mock.lastCall?.[1]) ?? null;
      if (deleting && data) rows = rows.filter((project) => project.id !== data.id);
      return { data, error: null };
    });
    select = vi.fn(() => ({ maybeSingle }));
    eq = vi.fn(() => ({ select }));
    update = vi.fn(({ name }: { name: string }) => {
      rows = rows.map((project) => project.id === id ? { ...project, name } : project);
      return { eq };
    });
    remove = vi.fn(() => {
      deleting = true;
      return { eq };
    });
    mocks.createOwnerClient.mockResolvedValue({ from: (table: string) => {
      expect(table).toBe('projects');
      return { update, delete: remove };
    } });
  });

  it('renames only the name and returns the shared project response', async () => {
    const response = await PATCH(request({ name: '  Renamed  ' }), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ project: {
      id, name: 'Renamed', publicKey: row.public_key, messagesUsed: 0,
      periodStart: row.period_start, createdAt: row.created_at,
    } });
    expect(update).toHaveBeenCalledWith({ name: 'Renamed' });
    expect(eq).toHaveBeenCalledWith('id', id);
    expect(select).toHaveBeenCalledWith('*');
  });

  it('deletes an owned project and returns success', async () => {
    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(remove).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith('id', id);
    expect(select).toHaveBeenCalledWith('id');
  });

  it('returns the same not found response for another owner and a missing ID', async () => {
    rows = [];
    const missingId = '22222222-2222-4222-8222-222222222222';
    for (const projectId of [id, missingId]) {
      for (const response of [
        await PATCH(request({ name: 'Renamed' }), context(projectId)),
        await DELETE(deleteRequest(), context(projectId)),
      ]) {
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }
    }
  });

  it('rejects signed-out requests before creating an owner client', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    for (const response of [
      await PATCH(request({ name: 'Renamed' }), context()),
      await DELETE(deleteRequest(), context()),
    ]) {
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHORIZED');
    }
    expect(mocks.createOwnerClient).not.toHaveBeenCalled();
  });

  it('rejects invalid IDs, names, and extra update fields', async () => {
    for (const response of [
      await PATCH(request({ name: '  ' }), context()),
      await PATCH(request({ name: 'New', owner_id: 'user_2' }), context()),
      await PATCH(request({ name: 'New' }), context('bad-id')),
      await DELETE(deleteRequest(), context('bad-id')),
    ]) {
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('BAD_REQUEST');
    }
    expect(mocks.createOwnerClient).not.toHaveBeenCalled();
  });
});
