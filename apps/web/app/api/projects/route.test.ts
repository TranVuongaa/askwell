import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ensureAccount: vi.fn(),
  createOwnerClient: vi.fn(),
  createServiceClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('../../../lib/auth/account', () => ({ ensureAccount: mocks.ensureAccount }));
vi.mock('../../../lib/supabase/owner', () => ({ createOwnerClient: mocks.createOwnerClient }));
vi.mock('../../../lib/supabase/service', () => ({ createServiceClient: mocks.createServiceClient }));

import { GET, POST } from './route';

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  owner_id: 'user_1',
  name: 'Docs',
  public_key: 'pk_example',
  messages_used: 0,
  period_start: '2026-11-01',
  created_at: '2026-11-23T00:00:00Z',
};

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function listRequest(): Request {
  return new Request('http://localhost/api/projects');
}

describe('/api/projects', () => {
  let plan: 'free' | 'pro';
  let projectRows: typeof row[];

  beforeEach(() => {
    vi.clearAllMocks();
    plan = 'free';
    projectRows = [];
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
    mocks.ensureAccount.mockResolvedValue(undefined);
    mocks.createOwnerClient.mockImplementation(async () => ({
      from: (table: string) => {
        if (table === 'accounts') return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { plan }, error: null }) }) }),
        };
        if (table === 'projects') return {
          select: () => ({ order: async () => ({ data: projectRows, error: null }) }),
        };
        throw new Error(`Unexpected owner table: ${table}`);
      },
    }));
    mocks.createServiceClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: row, error: null });
  });

  it('lists an empty owner account and returns its server-read plan', async () => {
    const response = await GET(listRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ projects: [], plan: 'free' });
    expect(mocks.ensureAccount).toHaveBeenCalledWith('user_1');
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it('maps owner-client rows to the shared response shape', async () => {
    projectRows = [row];
    plan = 'pro';
    const response = await GET(listRequest());
    expect(await response.json()).toEqual({
      projects: [{
        id: row.id, name: 'Docs', publicKey: 'pk_example', messagesUsed: 0,
        periodStart: '2026-11-01', createdAt: '2026-11-23T00:00:00Z',
      }],
      plan: 'pro',
    });
  });

  it('creates a Free project with the server limit and refuses a second', async () => {
    const first = await POST(createRequest({ name: '  Docs  ', plan: 'pro' }));
    expect(first.status).toBe(201);
    expect((await first.json()).project.name).toBe('Docs');
    expect(mocks.rpc).toHaveBeenCalledWith('create_project', expect.objectContaining({
      p_owner_id: 'user_1', p_name: 'Docs', p_max_projects: 1,
      p_public_key: expect.stringMatching(/^pk_[a-f0-9]{32}$/),
    }));

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'project limit reached' } });
    const second = await POST(createRequest({ name: 'Another' }));
    expect(second.status).toBe(402);
    expect(await second.json()).toEqual({
      error: { code: 'PAYMENT_REQUIRED', message: 'Project limit reached for your plan' },
    });
  });

  it('passes the Pro limit for five creations and maps the sixth limit error', async () => {
    plan = 'pro';
    for (let i = 0; i < 5; i++) {
      const response = await POST(createRequest({ name: `Project ${i}` }));
      expect(response.status).toBe(201);
    }
    expect(mocks.rpc).toHaveBeenCalledTimes(5);
    expect(mocks.rpc.mock.calls.every((call) => call[1].p_max_projects === 5)).toBe(true);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'project limit reached' } });
    expect((await POST(createRequest({ name: 'Sixth' }))).status).toBe(402);
  });

  it('rejects missing auth before any account or database access', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    for (const response of [await GET(listRequest()), await POST(createRequest({ name: 'Docs' }))]) {
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHORIZED');
    }
    expect(mocks.ensureAccount).not.toHaveBeenCalled();
    expect(mocks.createOwnerClient).not.toHaveBeenCalled();
  });

  it('returns structured validation and database errors', async () => {
    const badQuery = await GET(new Request('http://localhost/api/projects?owner_id=user_2'));
    expect(badQuery.status).toBe(400);
    expect((await badQuery.json()).error.code).toBe('BAD_REQUEST');

    const invalid = await POST(createRequest({ name: ' ' }));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe('BAD_REQUEST');
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'XX000', message: 'offline' } });
    const failed = await POST(createRequest({ name: 'Docs' }));
    expect(failed.status).toBe(500);
    expect((await failed.json()).error.code).toBe('INTERNAL_ERROR');
  });
});
