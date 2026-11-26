'use client';

import { DashboardFrame, ErrorState } from '../../../../../components/dashboard/dashboard-ui';
import dashboard from '../../../../../components/dashboard/dashboard.module.css';
import styles from '../../../../../components/install/install.module.css';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <DashboardFrame activeItem="Install"><div className={dashboard['dashboard-panel']}>
    <div className={styles.errorState}><ErrorState title="Could not load install code" />
      <button className={dashboard['dashboard-secondary']} type="button" onClick={reset}>Try again</button></div>
  </div></DashboardFrame>;
}
