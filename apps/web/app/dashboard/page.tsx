import { ensureCurrentAccount } from "../../lib/auth/account";
import { ProjectsDashboard } from "../../components/projects/projects-dashboard";

export default async function DashboardPage() {
  await ensureCurrentAccount();

  return <ProjectsDashboard />;
}
