import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn();
  const from = vi.fn(() => ({ upsert }));
  return { upsert, from };
});
vi.mock('server-only', () => ({}));
vi.mock('../supabase/service', () => ({ createServiceClient: () => ({ from }) }));

import { ensureAccount } from './account';

describe('ensureAccount', () => {
  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({ error: null });
    from.mockClear();
  });

  it('inserts the free account while ignoring existing rows and plans', async () => {
    await ensureAccount('user_123');

    expect(from).toHaveBeenCalledWith('accounts');
    expect(upsert).toHaveBeenCalledWith(
      { clerk_user_id: 'user_123', plan: 'free' },
      { onConflict: 'clerk_user_id', ignoreDuplicates: true },
    );
  });

  it('surfaces database failures', async () => {
    upsert.mockResolvedValueOnce({ error: { message: 'database unavailable' } });

    await expect(ensureAccount('user_123')).rejects.toThrow('Could not initialize account: database unavailable');
  });
});
