import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { deleteProjectInputSchema, type Plan } from '@askwell/shared';
import { DashboardFrame, ErrorState } from '../../../../../components/dashboard/dashboard-ui';
import { InstallCode } from '../../../../../components/install/install-code';
import { installSnippet } from '../../../../../components/install/snippet';
import { ensureAccount } from '../../../../../lib/auth/account';
import { createOwnerClient } from '../../../../../lib/supabase/owner';
import dashboard from '../../../../../components/dashboard/dashboard.module.css';
import styles from '../../../../../components/install/install.module.css';

type Props = { params: Promise<{ id: string }> };

function appOrigin(requestHeaders: Headers): string {
  const host = (requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'))?.split(',')[0].trim();
  if (!host) {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (!configured) throw new Error('App URL is unavailable');
    return new URL(configured).origin;
  }
  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
    ? forwardedProtocol : host.startsWith('localhost') ? 'http' : 'https';
  return new URL(`${protocol}://${host}`).origin;
}

export default async function ProjectInstallPage({ params }: Props) {
  const { userId } = await auth.protect();
  await ensureAccount(userId);
  const { id } = await params;
  if (!deleteProjectInputSchema.safeParse({ id }).success) notFound();

  const owner = await createOwnerClient();
  const { data: project, error } = await owner.from('projects')
    .select('name,public_key')
    .eq('id', id)
    .maybeSingle();

  if (error) return <DashboardFrame activeItem="Install"><ErrorState title="Could not load install code" /></DashboardFrame>;
  if (!project) notFound();

  const { data: account } = await owner.from('accounts')
    .select('plan')
    .eq('clerk_user_id', userId)
    .maybeSingle();
  const plan: Plan | null = account?.plan === 'free' || account?.plan === 'pro' ? account.plan : null;
  const snippet = installSnippet(project.public_key, appOrigin(await headers()));

  return <DashboardFrame activeItem="Install" plan={plan}>
    <div className={dashboard['dashboard-breadcrumb']}>Workspace <span>/</span> Install <span>/</span> {project.name}</div>
    <div className={dashboard['dashboard-heading']}>
      <div><p className={dashboard['dashboard-eyebrow']}>YOUR WORKSPACE</p><h1>Install {project.name}</h1>
        <p className={dashboard['dashboard-lede']}>Add this project&apos;s support chat to your website.</p></div>
    </div>
    <section className={dashboard['dashboard-panel']} aria-labelledby="install-code-title">
      <div className={dashboard['dashboard-panel-heading']}><div><h2 id="install-code-title">Your install code</h2>
        <p>This public key identifies your project. It cannot access your dashboard.</p></div></div>
      <div className={styles.detail}>
        <h2>Copy the script tag</h2>
        <p>Place it just before the closing <code>&lt;/body&gt;</code> tag on every page where you want chat to appear.</p>
        <InstallCode snippet={snippet} />
        <ol className={styles.steps}>
          <li>Copy the code above.</li>
          <li>Paste it into your site&apos;s HTML, just before <code>&lt;/body&gt;</code>.</li>
          <li>Publish your page, then open it to see the support button.</li>
        </ol>
      </div>
    </section>
  </DashboardFrame>;
}
