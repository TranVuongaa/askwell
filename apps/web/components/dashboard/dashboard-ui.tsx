import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

const navigation = [
  { label: "Projects", href: "/dashboard", icon: "▦" },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: "▤" },
  { label: "Conversations", href: "/dashboard/conversations", icon: "▱" },
  { label: "Customize", href: "/dashboard/customize", icon: "◈" },
  { label: "Install", href: "/dashboard/install", icon: "⌘" },
  { label: "Billing", href: "/dashboard/billing", icon: "◇" },
];

export function DashboardFrame({ children, activeItem }: { children: ReactNode; activeItem: string }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <Link className={styles.brand} href="/dashboard" aria-label="Askwell dashboard">
          <span className={styles.brandMark}>a</span><span>askwell</span>
        </Link>
        <div className={styles.workspaceLabel}>WORKSPACE</div>
        <button className={styles.workspacePicker} type="button" disabled aria-label="Current workspace: My workspace">
          <span className={styles.workspaceIcon}>M</span><span className={styles.workspaceName}>My workspace<small>Free plan</small></span><span className={styles.chevron}>⌄</span>
        </button>
        <nav className={styles.nav} id="navigation" aria-label="Dashboard">
          {navigation.map((item) => (
            <Link key={item.label} href={item.href} className={`${styles.navLink} ${activeItem === item.label ? styles.navActive : ""}`} aria-current={activeItem === item.label ? "page" : undefined}>
              <span className={styles.navIcon} aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.planCard}><span className={styles.planDot} /><div><strong>Free plan</strong><small>1 project · 100 messages/mo</small></div></div>
          <div className={styles.accountPlaceholder}><span className={styles.accountAvatar}>A</span><span>Account controls<br /><small>Coming soon</small></span><span className={styles.more}>···</span></div>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.topbar}><div className={styles.mobileBrand}><span className={styles.brandMark}>a</span> askwell</div><span className={styles.topbarHint}>Workspace overview</span><span className={styles.topbarStatus}><i /> All systems normal</span></header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className={styles.emptyState}><div className={styles.emptyIllustration} aria-hidden="true"><span>▦</span><i /><i /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function LoadingState({ label = "Loading your workspace" }: { label?: string }) {
  return <div className={styles.messageState} role="status"><span className={styles.spinner} />{label}</div>;
}

export function ErrorState({ title = "Something went wrong", description = "We couldn't load this view. Please try again in a moment." }: { title?: string; description?: string }) {
  return <div className={styles.messageState} role="alert"><span className={styles.errorMark}>!</span><span><strong>{title}</strong><br />{description}</span></div>;
}
