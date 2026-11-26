import Link from 'next/link';
import { DashboardFrame, EmptyState } from '../../../../../components/dashboard/dashboard-ui';
import dashboard from '../../../../../components/dashboard/dashboard.module.css';

export default function NotFound() {
  return <DashboardFrame activeItem="Install">
    <EmptyState title="Project not found" description="This project is unavailable in your workspace."
      action={<Link className={dashboard['dashboard-secondary']} href="/dashboard/install">Choose a project →</Link>} />
  </DashboardFrame>;
}
