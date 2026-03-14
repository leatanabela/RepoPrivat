import { getProfile } from '@/lib/actions/auth.actions';
import { redirect } from 'next/navigation';
import { MentenantaPage } from './mentenanta-page';

export default async function Page() {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (profile.roles?.name !== 'admin') redirect('/chat');
  return <MentenantaPage />;
}
