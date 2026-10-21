import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/opm/app-layout';
import { ROUTES } from '@/constants/routes';
import { fetchProfilesServer } from '@/lib/api-server';
import { authOptions } from '@/lib/auth';

export default async function AppSectionLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  // Middleware already redirects; this keeps the layout safe on its own.
  if (!session) redirect(ROUTES.login);
  const initialProfiles = await fetchProfilesServer(session.accessToken);
  return <AppLayout initialProfiles={initialProfiles}>{children}</AppLayout>;
}
