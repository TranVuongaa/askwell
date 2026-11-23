import { auth } from '@clerk/nextjs/server';
import {
  deleteProjectInputSchema,
  patchProjectInputSchema,
  type DeleteProjectResponse,
  type PatchProjectResponse,
} from '@askwell/shared';
import { apiError, projectResponse } from '../../../../lib/projects/api';
import { createOwnerClient } from '../../../../lib/supabase/owner';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('UNAUTHORIZED', 'Sign in to rename projects');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('BAD_REQUEST', 'Invalid JSON body');
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => key !== 'name')) {
      return apiError('BAD_REQUEST', 'Invalid project ID or name');
    }
    const parsed = patchProjectInputSchema.strict().safeParse({ ...await params, ...body });
    if (!parsed.success) return apiError('BAD_REQUEST', 'Invalid project ID or name');

    const owner = await createOwnerClient();
    const { data, error } = await owner.from('projects')
      .update({ name: parsed.data.name })
      .eq('id', parsed.data.id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`Could not rename project: ${error.message}`);
    if (!data) return apiError('NOT_FOUND', 'Project not found');

    const response: PatchProjectResponse = { project: projectResponse(data) };
    return Response.json(response);
  } catch {
    return apiError('INTERNAL_ERROR', 'Could not rename project');
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('UNAUTHORIZED', 'Sign in to delete projects');

    const parsed = deleteProjectInputSchema.strict().safeParse(await params);
    if (!parsed.success) return apiError('BAD_REQUEST', 'Invalid project ID');

    const owner = await createOwnerClient();
    const { data, error } = await owner.from('projects')
      .delete()
      .eq('id', parsed.data.id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Could not delete project: ${error.message}`);
    if (!data) return apiError('NOT_FOUND', 'Project not found');

    const response: DeleteProjectResponse = { success: true };
    return Response.json(response);
  } catch {
    return apiError('INTERNAL_ERROR', 'Could not delete project');
  }
}
