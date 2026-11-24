import { ensureCurrentAccount } from "../../lib/auth/account";
import { DashboardFrame } from "../../components/dashboard/dashboard-ui";
import { ProjectsDashboard } from "../../components/projects/projects-dashboard";

export default async function DashboardPage() {
  await ensureCurrentAccount();

  return (
    <DashboardFrame activeItem="Projects">
      <ProjectsDashboard />
    </DashboardFrame>
  );
}
