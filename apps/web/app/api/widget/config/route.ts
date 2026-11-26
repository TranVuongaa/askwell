import {
  API_ERROR_STATUS,
  getWidgetConfigInputSchema,
  type ApiError,
  type ApiErrorCode,
  type GetWidgetConfigResponse,
} from '@askwell/shared';
import { publicWidgetConfig } from '../../../../lib/widget/config';
import { createServiceClient } from '../../../../lib/supabase/service';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

type FailureStage = 'service_client' | 'project_query' | 'account_query' | 'config_query' | 'config_mapping';
const environmentNames = new Set(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY']);
const safeDatabaseCode = /^(?:[A-Z0-9]{5}|PGRST[0-9]{3})$/;

function logFailure(stage: FailureStage, error: unknown): void {
  const message = error instanceof Error ? error.message : '';
  const missingVariable = /^Missing required environment variable: ([A-Z0-9_]+)$/.exec(message)?.[1];
  if (missingVariable) {
    console.error('widget_config_failure', {
      stage,
      category: 'missing_env',
      ...(environmentNames.has(missingVariable) ? { variable: missingVariable } : {}),
    });
    return;
  }

  if (stage === 'service_client') {
    console.error('widget_config_failure', { stage, category: 'client_config' });
    return;
  }

  if (message === 'Invalid account plan') {
    console.error('widget_config_failure', { stage, category: 'invalid_account_plan' });
    return;
  }

  const candidate = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  const code = typeof candidate === 'string' && safeDatabaseCode.test(candidate) ? candidate : null;
  console.error('widget_config_failure', {
    stage,
    category: code ? 'database' : 'unexpected',
    ...(code ? { code } : {}),
  });
}

function errorResponse(code: ApiErrorCode, message: string): Response {
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status: API_ERROR_STATUS[code], headers: corsHeaders });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = getWidgetConfigInputSchema.strict().safeParse(query);
  if (!parsed.success) return errorResponse('BAD_REQUEST', 'Invalid public key');

  let stage: FailureStage = 'service_client';
  try {
    const service = createServiceClient();
    stage = 'project_query';
    const { data: project, error: projectError } = await service.from('projects')
      .select('id, owner_id')
      .eq('public_key', parsed.data.key)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) return errorResponse('NOT_FOUND', 'Widget not found');

    stage = 'account_query';
    const { data: account, error: accountError } = await service.from('accounts')
      .select('plan')
      .eq('clerk_user_id', project.owner_id)
      .single();
    if (accountError || !account || (account.plan !== 'free' && account.plan !== 'pro')) {
      throw accountError ?? new Error('Invalid account plan');
    }

    let row = null;
    if (account.plan === 'pro') {
      stage = 'config_query';
      const { data, error } = await service.from('widget_configs')
        .select('button_color, position, label, animation, header_text, show_badge')
        .eq('project_id', project.id)
        .single();
      if (error) throw error;
      row = data;
    }

    stage = 'config_mapping';
    const body: GetWidgetConfigResponse = { config: publicWidgetConfig(account.plan, row) };
    return Response.json(body, { headers: corsHeaders });
  } catch (error) {
    logFailure(stage, error);
    return errorResponse('INTERNAL_ERROR', 'Could not load widget config');
  }
}
