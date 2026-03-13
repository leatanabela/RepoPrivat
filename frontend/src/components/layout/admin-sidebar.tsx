'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ticket, FileText, BarChart3, Settings, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { signOut } from '@/lib/actions/auth.actions';

const navItems = [
  { href: '/admin', label: 'Toate Tichetele', icon: Ticket, exact: true },
  { href: '/admin/documents', label: 'Documente', icon: FileText },
  { href: '/admin/reports', label: 'Rapoarte', icon: BarChart3 },
  { href: '/settings', label: 'Setări', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 z-30" onClick={toggleSidebar} />
      )}

      <aside
        className={cn(
          'w-64 border-r border-primary/10 bg-white dark:bg-background-dark flex flex-col fixed h-full z-40 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-primary">Panou Administrare</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Admin Dashboard</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary/5 text-primary font-medium'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-primary/10'
                  )}
                >
                  <item.icon size={20} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium">{user?.full_name || 'Administrator'}</span>
              <span className="text-[10px] text-slate-400">Administrator</span>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-sm"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
