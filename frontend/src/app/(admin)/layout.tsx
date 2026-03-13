import { getProfile } from '@/lib/actions/auth.actions';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (profile.roles?.name !== 'admin') redirect('/chat');

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
