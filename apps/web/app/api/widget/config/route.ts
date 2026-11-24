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

  try {
    const service = createServiceClient();
    const { data: project, error: projectError } = await service.from('projects')
      .select('id, owner_id')
      .eq('public_key', parsed.data.key)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) return errorResponse('NOT_FOUND', 'Widget not found');

    const { data: account, error: accountError } = await service.from('accounts')
      .select('plan')
      .eq('clerk_user_id', project.owner_id)
      .single();
    if (accountError || !account || (account.plan !== 'free' && account.plan !== 'pro')) {
      throw accountError ?? new Error('Invalid account plan');
    }

    let row = null;
    if (account.plan === 'pro') {
      const { data, error } = await service.from('widget_configs')
        .select('button_color, position, label, animation, header_text, show_badge')
        .eq('project_id', project.id)
        .single();
      if (error) throw error;
      row = data;
    }

    const body: GetWidgetConfigResponse = { config: publicWidgetConfig(account.plan, row) };
    return Response.json(body, { headers: corsHeaders });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Could not load widget config');
  }
}
