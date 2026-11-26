import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({
  protect: vi.fn(), ensureAccount: vi.fn(), createOwnerClient: vi.fn(), headers: vi.fn(), notFound: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({ auth: { protect: mocks.protect } }));
vi.mock('@clerk/nextjs', () => ({ UserButton: () => null, SignOutButton: () => null }));
vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('../../../../../lib/auth/account', () => ({ ensureAccount: mocks.ensureAccount }));
vi.mock('../../../../../lib/supabase/owner', () => ({ createOwnerClient: mocks.createOwnerClient }));

import ProjectInstallPage from './page';

const id = '11111111-1111-4111-8111-111111111111';
const context = (projectId = id) => ({ params: Promise.resolve({ id: projectId }) });

describe('project install page', () => {
  let project: { name: string; public_key: string } | null;
  let projectError: { message: string } | null;
  const eq = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    project = { name: 'Docs', public_key: 'pk_example' };
    projectError = null;
    mocks.protect.mockResolvedValue({ userId: 'user_1' });
    mocks.ensureAccount.mockResolvedValue(undefined);
    mocks.headers.mockResolvedValue(new Headers({ host: 'preview.example.com', 'x-forwarded-proto': 'https' }));
    mocks.notFound.mockImplementation(() => { throw new Error('NEXT_NOT_FOUND'); });
    eq.mockImplementation((_field: string, _value: string, table: string) => ({
      maybeSingle: async () => table === 'projects'
        ? { data: project, error: projectError }
        : { data: { plan: 'pro' }, error: null },
    }));
    mocks.createOwnerClient.mockResolvedValue({ from: (table: string) => ({
      select: () => ({ eq: (field: string, value: string) => eq(field, value, table) }),
    }) });
  });

  it('shows the owner-scoped public key, preview URL, and Pro plan', async () => {
    const html = renderToStaticMarkup(await ProjectInstallPage(context()));
    expect(html).toContain('https://preview.example.com/widget.js');
    expect(html).toContain('pk_example');
    expect(html).toContain('Copy code');
    expect(html).toContain('Pro plan');
    expect(eq).toHaveBeenCalledWith('id', id, 'projects');
    expect(mocks.ensureAccount).toHaveBeenCalledWith('user_1');
  });

  it('hides a project that the owner client cannot see', async () => {
    project = null;
    await expect(ProjectInstallPage(context())).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it('shows an error state for a failed owner query', async () => {
    projectError = { message: 'unavailable' };
    const html = renderToStaticMarkup(await ProjectInstallPage(context()));
    expect(html).toContain('Could not load install code');
    expect(html).not.toContain('pk_example');
  });
});
