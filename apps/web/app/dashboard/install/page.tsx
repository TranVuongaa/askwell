import { auth } from '@clerk/nextjs/server';
import { InstallChooser } from '../../../components/install/install-chooser';

export default async function InstallPage() {
  await auth.protect();
  return <InstallChooser />;
}
