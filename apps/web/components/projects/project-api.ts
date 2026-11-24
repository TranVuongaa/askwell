import {
  apiErrorSchema,
  type ApiErrorCode,
  type DeleteProjectResponse,
  type GetProjectsResponse,
  type PatchProjectInput,
  type PatchProjectResponse,
  type PostProjectsInput,
  type PostProjectsResponse,
} from '@askwell/shared';

export class ProjectApiError extends Error {
  constructor(message: string, readonly code: ApiErrorCode | null, readonly status: number) {
    super(message);
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ProjectApiError(
      parsed.success ? parsed.data.error.message : 'Request failed. Please try again.',
      parsed.success ? parsed.data.error.code : null,
      response.status,
    );
  }
  return body as T;
}

export function listProjects(signal?: AbortSignal): Promise<GetProjectsResponse> {
  return requestJson<GetProjectsResponse>('/api/projects', { signal });
}

export function createProject(name: PostProjectsInput['name']): Promise<PostProjectsResponse> {
  return requestJson<PostProjectsResponse>('/api/projects', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name } satisfies PostProjectsInput),
  });
}

export function renameProject(id: PatchProjectInput['id'], name: PatchProjectInput['name']): Promise<PatchProjectResponse> {
  return requestJson<PatchProjectResponse>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
  });
}

export function deleteProject(id: string): Promise<DeleteProjectResponse> {
  return requestJson<DeleteProjectResponse>(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
