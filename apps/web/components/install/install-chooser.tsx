'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GetProjectsResponse } from '@askwell/shared';
import { DashboardFrame, EmptyState, ErrorState, LoadingState } from '../dashboard/dashboard-ui';
import { listProjects } from '../projects/project-api';
import dashboard from '../dashboard/dashboard.module.css';
import styles from './install.module.css';

export function InstallChooser() {
  const [data, setData] = useState<GetProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void listProjects(controller.signal)
      .then((next) => { if (!controller.signal.aborted) { setData(next); setError(false); } })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted && !(reason instanceof Error && reason.name === 'AbortError')) setError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setLoading(true);
    setError(false);
    setAttempt((value) => value + 1);
  }

  return <DashboardFrame activeItem="Install" plan={error ? null : data?.plan ?? null} planLoading={loading}>
    <div className={dashboard['dashboard-breadcrumb']}>Workspace <span>/</span> Install</div>
    <div className={dashboard['dashboard-heading']}>
      <div><p className={dashboard['dashboard-eyebrow']}>YOUR WORKSPACE</p><h1>Install</h1>
        <p className={dashboard['dashboard-lede']}>Choose a project to add its support chat to your website.</p></div>
    </div>
    <section className={dashboard['dashboard-panel']} aria-labelledby="install-projects-title">
      <div className={dashboard['dashboard-panel-heading']}><div><h2 id="install-projects-title">Your projects</h2><p>Each project has its own install code.</p></div></div>
      {loading ? <LoadingState label="Loading your projects" /> : error ?
        <div className={styles.errorState}><ErrorState title="Could not load projects" />
          <button className={dashboard['dashboard-secondary']} type="button" onClick={retry}>Try again</button></div> :
        data?.projects.length ? <ul className={styles.choices}>{data.projects.map((project) =>
          <li key={project.id}><Link href={`/dashboard/projects/${project.id}/install`}>
            <span><strong>{project.name}</strong><small>Get the install code for this project</small></span><span aria-hidden="true">→</span>
          </Link></li>)}</ul> :
          <EmptyState title="Create a project first" description="Your project will have a public key and an install code you can copy to your website."
            action={<Link className={dashboard['dashboard-secondary']} href="/dashboard">Go to projects →</Link>} />}
    </section>
  </DashboardFrame>;
}
