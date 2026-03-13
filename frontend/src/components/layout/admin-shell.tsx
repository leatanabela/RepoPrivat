'use client';

import { useEffect } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { useAuthStore } from '@/stores/auth-store';
import type { Profile } from '@/lib/types';

export function AdminShell({
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
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      <AdminSidebar />
      <main className="flex-1 ml-0 lg:ml-64">{children}</main>
    </div>
  );
}
