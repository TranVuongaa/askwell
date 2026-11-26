import { DashboardFrame, LoadingState } from '../../../../../components/dashboard/dashboard-ui';

export default function Loading() {
  return <DashboardFrame activeItem="Install" planLoading><LoadingState label="Loading install code" /></DashboardFrame>;
}
