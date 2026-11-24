import { describe, expect, it, vi } from 'vitest';
import { isOwnerApiPath, protectOwnerRequest } from './routes';

describe('isOwnerApiPath', () => {
  it.each(['/api/projects', '/api/projects/123', '/api/knowledge/456', '/api/conversations/789'])('%s is an owner route', (path) => {
    expect(isOwnerApiPath(path)).toBe(true);
  });

  it.each(['/api/widget/chat', '/api/clerk/webhook', '/api/posthog-config', '/api/projector'])('%s is public or outside owner routes', (path) => {
    expect(isOwnerApiPath(path)).toBe(false);
  });
});

describe('protectOwnerRequest', () => {
  it.each(['/dashboard', '/dashboard/projects', '/api/projects', '/api/knowledge/123', '/api/conversations/456'])(
    'protects %s', async (pathname) => {
      const protect = vi.fn().mockResolvedValue(undefined);
      const auth = Object.assign(vi.fn().mockResolvedValue({ userId: 'user_123' }), { protect });

      await protectOwnerRequest(pathname, auth);

      if (pathname.startsWith('/dashboard')) expect(protect).toHaveBeenCalledOnce();
      else expect(auth).toHaveBeenCalledOnce();
    },
  );

  it.each(['/sign-in', '/', '/api/widget/chat', '/api/clerk/webhook'])(
    'leaves %s public', async (pathname) => {
      const protect = vi.fn().mockResolvedValue(undefined);
      const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });

      await protectOwnerRequest(pathname, auth);

      expect(protect).not.toHaveBeenCalled();
      expect(auth).not.toHaveBeenCalled();
    },
  );

  it('propagates Clerk rejection for a signed-out request', async () => {
    const reject = new Error('not authenticated');
    const protect = vi.fn().mockRejectedValue(reject);
    const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });

    await expect(protectOwnerRequest('/dashboard', auth)).rejects.toBe(reject);
  });

  it('returns structured JSON 401 for a signed-out owner API request', async () => {
    const protect = vi.fn();
    const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });

    const response = await protectOwnerRequest('/api/projects', auth);

    expect(response?.status).toBe(401);
    expect(response?.headers.get('content-type')).toContain('application/json');
    await expect(response?.json()).resolves.toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    expect(protect).not.toHaveBeenCalled();
  });

  it('passes authenticated owner API requests through', async () => {
    const protect = vi.fn();
    const auth = Object.assign(vi.fn().mockResolvedValue({ userId: 'user_123' }), { protect });

    await expect(protectOwnerRequest('/api/projects', auth)).resolves.toBeUndefined();
    expect(auth).toHaveBeenCalledOnce();
  });
});
