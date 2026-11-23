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

      await protectOwnerRequest(pathname, { protect });

      expect(protect).toHaveBeenCalledOnce();
    },
  );

  it.each(['/sign-in', '/', '/api/widget/chat', '/api/clerk/webhook'])(
    'leaves %s public', async (pathname) => {
      const protect = vi.fn().mockResolvedValue(undefined);

      await protectOwnerRequest(pathname, { protect });

      expect(protect).not.toHaveBeenCalled();
    },
  );

  it('propagates Clerk rejection for a signed-out request', async () => {
    const reject = new Error('not authenticated');
    const protect = vi.fn().mockRejectedValue(reject);

    await expect(protectOwnerRequest('/dashboard', { protect })).rejects.toBe(reject);
  });
});
