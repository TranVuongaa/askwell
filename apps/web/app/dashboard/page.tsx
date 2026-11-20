import Link from "next/link";
import { DashboardFrame, EmptyState } from "../../components/dashboard/dashboard-ui";
import styles from "../../components/dashboard/dashboard.module.css";

export default function DashboardPage() {
  return (
    <DashboardFrame activeItem="Projects">
      <div className={styles["dashboard-breadcrumb"]}>Workspace <span>/</span> Projects</div>
      <div className={styles["dashboard-heading"]}>
        <div>
          <p className={styles["dashboard-eyebrow"]}>YOUR WORKSPACE</p>
          <h1>Projects</h1>
          <p className={styles["dashboard-lede"]}>Manage the support experiences you share with your customers.</p>
        </div>
        <button className={styles["dashboard-primary"]} type="button" disabled aria-disabled="true" title="Project creation is coming soon">New project <span aria-hidden="true">＋</span></button>
      </div>

      <section className={`${styles["dashboard-panel"]} ${styles["dashboard-project-panel"]}`} aria-labelledby="projects-title">
        <div className={styles["dashboard-panel-heading"]}>
          <div>
            <h2 id="projects-title">All projects</h2>
            <p>Your projects and their support activity.</p>
          </div>
          <span className={styles["dashboard-count"]}>0 projects</span>
        </div>
        <EmptyState
          title="Your workspace is ready"
          description="Projects you create will appear here. Add your product knowledge, customize your chat, and get ready to help your customers."
          action={<Link href="#navigation" className={styles["dashboard-secondary"]}>Explore your workspace <span aria-hidden="true">→</span></Link>}
        />
      </section>

      <div className={styles["dashboard-footnote"]}>A calm place to build better customer support.</div>
    </DashboardFrame>
  );
}
