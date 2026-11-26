'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { PLAN_LIMITS, type GetProjectsResponse, type Project } from '@askwell/shared';
import { DashboardFrame, EmptyState, ErrorState, LoadingState } from '../dashboard/dashboard-ui';
import styles from '../dashboard/dashboard.module.css';
import { createProject, deleteProject, listProjects, ProjectApiError, renameProject } from './project-api';

export function ProjectsDashboard() {
  const [data, setData] = useState<GetProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const next = await listProjects(signal);
    setData(next);
    setLoadError(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listProjects(controller.signal)
      .then((next) => { setData(next); setLoadError(false); })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setLoadError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function retry() {
    setLoading(true);
    try { await refresh(); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }

  async function runAction(key: string, action: () => Promise<unknown>, onSuccess?: () => void) {
    setBusy(key);
    setActionError('');
    try {
      await action();
      onSuccess?.();
      await refresh();
    } catch (error) {
      setActionError(error instanceof ProjectApiError ? error.message : 'Could not update projects. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    void runAction('create', () => createProject(name), () => {
      setCreateOpen(false);
      setNewName('');
    });
  }

  function onRename(event: FormEvent<HTMLFormElement>, project: Project) {
    event.preventDefault();
    const name = renameName.trim();
    if (!name || name === project.name) { setRenameId(null); return; }
    void runAction(project.id, () => renameProject(project.id, name), () => setRenameId(null));
  }

  function onDelete(project: Project) {
    if (!window.confirm(`Delete “${project.name}”? This will also delete its knowledge and conversations.`)) return;
    void runAction(project.id, () => deleteProject(project.id), () => {
      if (renameId === project.id) setRenameId(null);
    });
  }

  const count = data?.projects.length ?? 0;
  const limit = data ? PLAN_LIMITS[data.plan].projects : null;

  return (
    <DashboardFrame activeItem="Projects" plan={loadError ? null : data?.plan ?? null} planLoading={loading}>
      <div className={styles['dashboard-breadcrumb']}>Workspace <span>/</span> Projects</div>
      <div className={styles['dashboard-heading']}>
        <div>
          <p className={styles['dashboard-eyebrow']}>YOUR WORKSPACE</p>
          <h1>Projects</h1>
          <p className={styles['dashboard-lede']}>Manage the support experiences you share with your customers.</p>
        </div>
        <button className={styles['dashboard-primary']} type="button" disabled={busy !== null} onClick={() => { setCreateOpen(true); setActionError(''); }}>
          New project <span aria-hidden="true">＋</span>
        </button>
      </div>

      <section className={`${styles['dashboard-panel']} ${styles['dashboard-project-panel']}`} aria-labelledby="projects-title">
        <div className={styles['dashboard-panel-heading']}>
          <div><h2 id="projects-title">All projects</h2><p>Your projects and their support activity.</p></div>
          <span className={styles['dashboard-count']}>
            {data ? `${count} of ${limit} · ${data.plan === 'free' ? 'Free' : 'Pro'}` : 'Projects'}
          </span>
        </div>

        {data && <p className={styles.projectLimit}>
          {data.plan === 'free' ? 'Free includes 1 project. Upgrade to Pro for up to 5 projects.' : 'Pro includes up to 5 projects.'}
        </p>}

        {createOpen && <form className={styles.projectForm} onSubmit={onCreate}>
          <label htmlFor="new-project-name">Project name</label>
          <input id="new-project-name" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={120} required autoFocus placeholder="Your product or business" />
          <button className={styles['dashboard-primary']} type="submit" disabled={busy !== null || !newName.trim()}>{busy === 'create' ? 'Creating…' : 'Create project'}</button>
          <button className={styles.projectTextButton} type="button" disabled={busy !== null} onClick={() => setCreateOpen(false)}>Cancel</button>
        </form>}

        {actionError && <p className={styles.projectActionError} role="alert">{actionError}</p>}

        {loading ? <LoadingState label="Loading your projects" /> : loadError ?
          <div className={styles.projectLoadError}><ErrorState title="Could not load projects" /><button className={styles['dashboard-secondary']} type="button" onClick={() => void retry()}>Try again</button></div> :
          count === 0 ? <EmptyState title="Your workspace is ready" description="Create your first project to add knowledge and share a support widget with customers." action={<button className={styles['dashboard-secondary']} type="button" onClick={() => setCreateOpen(true)}>Create a project <span aria-hidden="true">→</span></button>} /> :
          <ul className={styles.projectList}>{data?.projects.map((project) => <li className={styles.projectRow} key={project.id}>
            <div className={styles.projectDetails}>
              {renameId === project.id ? <form className={styles.projectRename} onSubmit={(event) => onRename(event, project)}>
                <label className={styles.projectSrOnly} htmlFor={`rename-${project.id}`}>Rename {project.name}</label>
                <input id={`rename-${project.id}`} value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={120} required autoFocus />
                <button className={styles['dashboard-secondary']} type="submit" disabled={busy !== null || !renameName.trim()}>{busy === project.id ? 'Saving…' : 'Save'}</button>
                <button className={styles.projectTextButton} type="button" disabled={busy !== null} onClick={() => setRenameId(null)}>Cancel</button>
              </form> : <h3>{project.name}</h3>}
              <p>{project.messagesUsed} messages this month</p>
            </div>
            <div className={styles.projectActions}>
              <Link className={styles['dashboard-secondary']} href={`/dashboard/projects/${project.id}/install`}>Install <span aria-hidden="true">→</span></Link>
              <button className={styles.projectTextButton} type="button" disabled={busy !== null} onClick={() => { setRenameId(project.id); setRenameName(project.name); setActionError(''); }}>Rename</button>
              <button className={styles.projectDelete} type="button" disabled={busy !== null} onClick={() => onDelete(project)}>{busy === project.id ? 'Working…' : 'Delete'}</button>
            </div>
          </li>)}</ul>}
      </section>
      <div className={styles['dashboard-footnote']}>A calm place to build better customer support.</div>
    </DashboardFrame>
  );
}
