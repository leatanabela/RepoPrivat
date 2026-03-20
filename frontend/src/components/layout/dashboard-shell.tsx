'use client';

import { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { useAuthStore } from '@/stores/auth-store';
import type { Profile } from '@/lib/types';

export function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    setUser(profile);
  }, [profile, setUser]);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-dm-surface text-slate-900 dark:text-dm-on-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">{children}</main>
    </div>
  );
}
