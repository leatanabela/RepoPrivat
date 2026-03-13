import { getProfile } from '@/lib/actions/auth.actions';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
