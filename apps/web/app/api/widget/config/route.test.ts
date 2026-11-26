import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WIDGET_CONFIG } from '@askwell/shared';

const mocks = vi.hoisted(() => ({ createServiceClient: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../../../lib/supabase/service', () => ({ createServiceClient: mocks.createServiceClient }));

import { GET, OPTIONS } from './route';

const storedConfig = {
  button_color: '#123456', position: 'top-left', label: 'Ask us',
  animation: 'slide', header_text: 'Welcome', show_badge: false,
};

function request(key: string | null, origin = 'https://example.org'): Request {
  const url = new URL('https://askwell.example/api/widget/config');
  if (key !== null) url.searchParams.set('key', key);
  return new Request(url, { headers: { Origin: origin } });
}

describe('GET /api/widget/config', () => {
  let plan: string;
  let project: { id: string; owner_id: string } | null;
  const calls: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    plan = 'free';
    project = { id: 'project-id', owner_id: 'owner-id' };
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        calls.push(table);
        if (table === 'projects') return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: project, error: null }) }) }),
        };
        if (table === 'accounts') return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { plan }, error: null }) }) }),
        };
        if (table === 'widget_configs') return {
          select: () => ({ eq: () => ({ single: async () => ({ data: storedConfig, error: null }) }) }),
        };
        throw new Error(`Unexpected table: ${table}`);
      },
    }));
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns defaults and a badge for Free, without reading stored customization', async () => {
    const response = await GET(request('pk_example'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ config: { ...DEFAULT_WIDGET_CONFIG, showBadge: true } });
    expect(calls).toEqual(['projects', 'accounts']);
  });

  it('returns stored customization for Pro', async () => {
    plan = 'pro';
    const response = await GET(request('pk_example'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ config: {
      buttonColor: '#123456', position: 'top-left', label: 'Ask us',
      animation: 'slide', headerText: 'Welcome', showBadge: false,
    } });
    expect(calls).toEqual(['projects', 'accounts', 'widget_configs']);
  });

  it('returns a structured 404 for an unknown key', async () => {
    project = null;
    const response = await GET(request('pk_unknown'));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Widget not found' } });
    expect(calls).toEqual(['projects']);
  });

  it.each([null, '', 'invalid', 'pk_bad key'])('rejects invalid key %s before database access', async (key) => {
    const response = await GET(request(key));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('BAD_REQUEST');
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it('sends CORS headers on cross-origin success, errors, and preflight', async () => {
    const success = await GET(request('pk_example', 'https://customer.example'));
    project = null;
    const missing = await GET(request('pk_unknown', 'https://other.example'));
    const invalid = await GET(request('bad', 'https://third.example'));
    const preflight = OPTIONS();
    expect(preflight.status).toBe(204);
    for (const response of [success, missing, invalid, preflight]) {
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toContain('GET');
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
  });

  it('reads the current plan for every request', async () => {
    expect((await (await GET(request('pk_example'))).json()).config.showBadge).toBe(true);
    plan = 'pro';
    expect((await (await GET(request('pk_example'))).json()).config.showBadge).toBe(false);
    expect(calls.filter((table) => table === 'accounts')).toHaveLength(2);
  });

  it('logs only an allowlisted missing variable when service client creation fails', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.createServiceClient.mockImplementation(() => {
      throw new Error('Missing required environment variable: SUPABASE_SECRET_KEY');
    });

    const response = await GET(request('pk_sensitive_public_key'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Could not load widget config' } });
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith('widget_config_failure', {
      stage: 'service_client', category: 'missing_env', variable: 'SUPABASE_SECRET_KEY',
    });
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('pk_sensitive_public_key');
  });

  it('logs a fixed query stage and safe code without the raw error or request data', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.createServiceClient.mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({
          data: null,
          error: { code: 'PGRST301', message: 'pk_sensitive_public_key https://private.example/ secret_value' },
        }) }) }),
      }),
    });

    const response = await GET(request('pk_sensitive_public_key'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Could not load widget config' } });
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith('widget_config_failure', {
      stage: 'project_query', category: 'database', code: 'PGRST301',
    });
    const output = JSON.stringify(diagnostic.mock.calls);
    expect(output).not.toContain('pk_sensitive_public_key');
    expect(output).not.toContain('private.example');
    expect(output).not.toContain('secret_value');
  });

  it('does not log an unrecognized environment name or unsafe error code', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.createServiceClient.mockImplementationOnce(() => {
      throw new Error('Missing required environment variable: PRIVATE_TOKEN');
    });
    await GET(request('pk_example'));
    expect(diagnostic).toHaveBeenLastCalledWith('widget_config_failure', {
      stage: 'service_client', category: 'missing_env',
    });

    mocks.createServiceClient.mockReturnValue({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: null, error: { code: 'PRIVATE_TOKEN_12345', message: 'secret_value' },
      }) }) }) }),
    });
    await GET(request('pk_example'));
    expect(diagnostic).toHaveBeenLastCalledWith('widget_config_failure', {
      stage: 'project_query', category: 'unexpected',
    });
    const output = JSON.stringify(diagnostic.mock.calls);
    expect(output).not.toContain('PRIVATE_TOKEN');
    expect(output).not.toContain('secret_value');
  });
});
