import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject, deleteProject, listProjects, ProjectApiError, renameProject } from './project-api';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => fetchMock.mockReset());

describe('project dashboard API', () => {
  it('loads the owner list and plan without cached data', async () => {
    const body = { plan: 'free', projects: [] };
    fetchMock.mockResolvedValue(Response.json(body));
    expect(await listProjects()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', expect.objectContaining({
      credentials: 'same-origin', cache: 'no-store',
    }));
  });

  it('sends only a project name when creating and exposes the server limit error', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { code: 'PAYMENT_REQUIRED', message: 'Project limit reached for your plan' } }, { status: 402 }));
    await expect(createProject('Second')).rejects.toMatchObject({
      code: 'PAYMENT_REQUIRED', status: 402, message: 'Project limit reached for your plan',
    } satisfies Partial<ProjectApiError>);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/projects');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Second' });
  });

  it('renames and deletes through the project ID route', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ project: { id: 'abc', name: 'Renamed' } }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    expect((await renameProject('abc', 'Renamed')).project.name).toBe('Renamed');
    expect(await deleteProject('abc')).toEqual({ success: true });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/abc');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ name: 'Renamed' });
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
  });
});
