import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@clerk/nextjs', () => ({
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));

import { DashboardFrame } from '../dashboard/dashboard-ui';
import { ProjectsDashboard } from './projects-dashboard';

describe('Projects dashboard plan in shared sidebar', () => {
  it('shows the Free limits from the shared plan constants', () => {
    const html = renderToStaticMarkup(<DashboardFrame activeItem="Projects" plan="free">Projects</DashboardFrame>);
    expect(html).toContain('Free plan');
    expect(html).toContain('1 project · 100 messages/mo');
  });

  it('shows the Pro limits without a false Free label', () => {
    const html = renderToStaticMarkup(<DashboardFrame activeItem="Projects" plan="pro">Projects</DashboardFrame>);
    expect(html).toContain('Pro plan');
    expect(html).toContain('5 projects · 2,000 messages/mo');
    expect(html).not.toContain('Free plan');
  });

  it('uses neutral labels while loading and after a failed plan request', () => {
    const loading = renderToStaticMarkup(<ProjectsDashboard />);
    expect(loading).toContain('Loading plan…');
    expect(loading).toContain('Checking your limits');
    expect(loading).not.toContain('Free plan');

    const failed = renderToStaticMarkup(<DashboardFrame activeItem="Projects" plan={null}>Projects</DashboardFrame>);
    expect(failed).toContain('Plan unavailable');
    expect(failed).toContain('Project limits unavailable');
    expect(failed).not.toContain('Free plan');
  });
});
