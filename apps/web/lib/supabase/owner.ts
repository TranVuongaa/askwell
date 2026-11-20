import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../packages/db/types';
import { requiredEnv } from './config';

/** A request-scoped client whose Clerk session token is checked by Supabase RLS. */
export async function createOwnerClient() {
  const { userId, getToken } = await auth();
  if (!userId) throw new Error('An authenticated Clerk session is required');
  if (!await getToken()) throw new Error('A Clerk session token is required');

  return createClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      accessToken: async () => {
        const token = await getToken();
        if (!token) throw new Error('A Clerk session token is required');
        return token;
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
