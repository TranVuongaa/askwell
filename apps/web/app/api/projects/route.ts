import { auth } from '@clerk/nextjs/server';
import {
  getProjectsInputSchema,
  postProjectsInputSchema,
  PLAN_LIMITS,
  type GetProjectsResponse,
  type PostProjectsResponse,
  type Plan,
} from '@askwell/shared';
import { ensureAccount } from '../../../lib/auth/account';
import { apiError, newPublicKey, projectResponse } from '../../../lib/projects/api';
import { createOwnerClient } from '../../../lib/supabase/owner';
import { createServiceClient } from '../../../lib/supabase/service';

async function ownerContext() {
  const { userId } = await auth();
  if (!userId) return null;

  await ensureAccount(userId);
  const owner = await createOwnerClient();
  const { data, error } = await owner.from('accounts')
    .select('plan')
    .eq('clerk_user_id', userId)
    .single();
  const plan = data?.plan;
  if (error || !data) {
    throw new Error(`Could not read account plan: ${error?.message ?? 'invalid account'}`);
  }
  if (plan !== 'free' && plan !== 'pro') throw new Error('Invalid account plan');
  return { userId, owner, plan: plan as Plan };
}

export async function GET(request: Request) {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  if (!getProjectsInputSchema.strict().safeParse(query).success) {
    return apiError('BAD_REQUEST', 'Invalid request');
  }
  try {
    const context = await ownerContext();
    if (!context) return apiError('UNAUTHORIZED', 'Sign in to view projects');

    const { data, error } = await context.owner.from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Could not list projects: ${error.message}`);

    const body: GetProjectsResponse = {
      projects: (data ?? []).map(projectResponse),
      plan: context.plan,
    };
    return Response.json(body);
  } catch {
    return apiError('INTERNAL_ERROR', 'Could not load projects');
  }
}

export async function POST(request: Request) {
  try {
    const context = await ownerContext();
    if (!context) return apiError('UNAUTHORIZED', 'Sign in to create projects');

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return apiError('BAD_REQUEST', 'Invalid JSON body');
    }
    const parsed = postProjectsInputSchema.safeParse(input);
    if (!parsed.success) return apiError('BAD_REQUEST', 'Project name is required (1–120 characters)');

    const { data, error } = await createServiceClient().rpc('create_project', {
      p_owner_id: context.userId,
      p_name: parsed.data.name,
      p_public_key: newPublicKey(),
      p_max_projects: PLAN_LIMITS[context.plan].projects,
    });
    if (error?.code === 'P0001' && error.message === 'project limit reached') {
      return apiError('PAYMENT_REQUIRED', 'Project limit reached for your plan');
    }
    if (error?.code === '23505') return apiError('CONFLICT', 'Project key conflict; please retry');
    if (error || !data) throw new Error(`Could not create project: ${error?.message ?? 'empty response'}`);

    const body: PostProjectsResponse = { project: projectResponse(data) };
    return Response.json(body, { status: 201 });
  } catch {
    return apiError('INTERNAL_ERROR', 'Could not create project');
  }
}
