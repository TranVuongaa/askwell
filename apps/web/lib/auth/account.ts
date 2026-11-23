import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '../supabase/service';

/** Create the free account only when none exists; conflict handling preserves paid plans. */
export async function ensureAccount(clerkUserId: string) {
  const { error } = await createServiceClient()
    .from('accounts')
    .upsert({ clerk_user_id: clerkUserId, plan: 'free' }, {
      onConflict: 'clerk_user_id',
      ignoreDuplicates: true,
    });

  if (error) throw new Error(`Could not initialize account: ${error.message}`);
}

export async function ensureCurrentAccount() {
  const { userId } = await auth.protect();
  await ensureAccount(userId);
}
