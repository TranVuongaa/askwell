import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../packages/db/types';
import { requiredEnv } from './config';

/** Server-only, privileged client. Callers must check authorization before writes. */
export function createServiceClient() {
  return createClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
