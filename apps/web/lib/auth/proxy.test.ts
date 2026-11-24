import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: (handler: unknown) => handler,
}));

import proxy, { config } from '../../proxy';

const makeRequest = (pathname: string) => ({ nextUrl: new URL(`https://askwell.test${pathname}`) });
const invokeProxy = proxy as unknown as (
  auth: { (): Promise<{ userId: string | null }>; protect: () => Promise<unknown> },
  request: NextRequest,
) => Promise<Response | undefined>;

describe('proxy auth routing', () => {
  it('matches API routes so Clerk session data is available', () => {
    expect(config.matcher).toContain('/(api|trpc)(.*)');
  });

  it('returns structured JSON 401 for a signed-out owner API request', async () => {
    const protect = vi.fn();
    const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });

    const response = await invokeProxy(auth, makeRequest('/api/projects') as NextRequest);

    if (!response) throw new Error('Expected the proxy to return an unauthorized response');
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    expect(protect).not.toHaveBeenCalled();
  });

  it('uses Clerk protection for dashboard requests', async () => {
    const protect = vi.fn().mockResolvedValue(undefined);
    const auth = Object.assign(vi.fn(), { protect });

    await expect(invokeProxy(auth, makeRequest('/dashboard/projects') as NextRequest)).resolves.toBeUndefined();
    expect(protect).toHaveBeenCalledOnce();
  });

  it.each(['/api/widget/chat', '/api/clerk/webhook', '/api/posthog-config'])(
    'leaves public route %s reachable', async (pathname) => {
      const protect = vi.fn();
      const auth = Object.assign(vi.fn(), { protect });

      await expect(invokeProxy(auth, makeRequest(pathname) as NextRequest)).resolves.toBeUndefined();
      expect(auth).not.toHaveBeenCalled();
      expect(protect).not.toHaveBeenCalled();
    },
  );

  it('passes an authenticated owner API request through', async () => {
    const protect = vi.fn();
    const auth = Object.assign(vi.fn().mockResolvedValue({ userId: 'user_123' }), { protect });

    await expect(invokeProxy(auth, makeRequest('/api/projects') as NextRequest)).resolves.toBeUndefined();
    expect(auth).toHaveBeenCalledOnce();
  });
});
