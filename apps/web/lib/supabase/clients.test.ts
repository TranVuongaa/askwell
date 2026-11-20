import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('server-only', () => ({}));

import { createOwnerClient } from './owner';
import { createServiceClient } from './service';

describe('Supabase clients', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('sends the caller’s Clerk token on owner reads and refreshes it for later requests', async () => {
    const getToken = vi.fn().mockResolvedValueOnce('clerk_first').mockResolvedValue('clerk_second');
    authMock.mockResolvedValue({ userId: 'user_1', getToken });
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = await createOwnerClient();
    const { error } = await client.from('projects').select('id');

    expect(error).toBeNull();
    expect(getToken.mock.calls.length).toBeGreaterThanOrEqual(2);
    const request = new Request(fetchMock.mock.calls[0][0], fetchMock.mock.calls[0][1]);
    expect(request.headers.get('authorization')).toBe('Bearer clerk_second');
    expect(request.headers.get('apikey')).toBe('sb_publishable_test');
  });

  it('rejects a missing Clerk session or token before making an owner client', async () => {
    authMock.mockResolvedValueOnce({ userId: null, getToken: vi.fn() });
    await expect(createOwnerClient()).rejects.toThrow('authenticated Clerk session');
    authMock.mockResolvedValueOnce({ userId: 'user_1', getToken: vi.fn().mockResolvedValue(null) });
    await expect(createOwnerClient()).rejects.toThrow('Clerk session token');
  });

  it('requires server credentials and sends the secret key for service requests', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect(() => createServiceClient()).toThrow('SUPABASE_SECRET_KEY');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createServiceClient();
    const { error } = await client.from('projects').select('id');

    expect(error).toBeNull();
    const request = new Request(fetchMock.mock.calls[0][0], fetchMock.mock.calls[0][1]);
    expect(request.headers.get('authorization')).toBe('Bearer sb_secret_test');
    expect(request.headers.get('apikey')).toBe('sb_secret_test');
  });

  it('marks privileged modules as server-only so Next rejects client imports', async () => {
    for (const file of ['owner.ts', 'service.ts']) {
      const source = await readFile(new URL(file, import.meta.url), 'utf8');
      expect(source).toMatch(/^import 'server-only';/);
    }
  });
});
