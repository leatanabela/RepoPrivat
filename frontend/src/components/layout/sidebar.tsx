'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, History, Ticket, Settings, LogOut, Menu, X, Wrench, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { signOut } from '@/lib/actions/auth.actions';
import { getChatSessions, deleteChatSession } from '@/lib/actions/chat.actions';
import type { ChatSession } from '@/lib/types';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/chat', label: 'Asistent AI', icon: MessageSquare },
  { href: '/tickets', label: 'Tichete', icon: Ticket },
  { href: '/settings', label: 'Setări', icon: Settings },
];

const adminItems = [
  { href: '/mentenanta', label: 'Mentenanță', icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, isAdmin } = useAuthStore();
  const { setCurrentSession, setMessages } = useChatStore();

  const [historicOpen, setHistoricOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (historicOpen && !loadedRef.current) {
      loadedRef.current = true;
      loadSessions();
    }
  }, [historicOpen]);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch {
      toast.error('Eroare la încărcarea conversațiilor');
    } finally {
      setLoadingSessions(false);
    }
  }

  function handleSelectSession(session: ChatSession) {
    setCurrentSession(session.id);
    setMessages([]);
    router.push('/chat');
  }

  async function handleDeleteSession(id: string) {
    try {
      await deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Conversație ștearsă');
    } catch {
      toast.error('Eroare la ștergerea conversației');
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-dm-surface-low rounded-lg shadow-md border border-slate-200 dark:border-dm-surface-bright/15"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'w-72 flex flex-col bg-white dark:bg-dm-surface-low border-r border-slate-200 dark:border-transparent fixed lg:static h-full z-40 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 flex flex-col h-full justify-between">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 dark:bg-dm-primary/15 flex items-center justify-center text-primary dark:text-dm-primary font-bold text-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <h1 className="text-slate-900 dark:text-dm-on-surface text-sm font-semibold leading-none">
                  {user?.full_name || 'Utilizator'}
                </h1>
                <p className="text-slate-500 dark:text-dm-on-surface-variant text-xs mt-1">
                  {user?.departments?.name || 'Management cont'}
                </p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {/* Asistent AI */}
              <Link
                href="/chat"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  pathname.startsWith('/chat')
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/15 dark:text-dm-primary'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-100 dark:hover:bg-dm-surface-high'
                )}
              >
                <MessageSquare size={22} />
                <span className="text-sm font-medium">Asistent AI</span>
              </Link>

              {/* Istoric Conversații - expandable */}
              <button
                onClick={() => {
                  setHistoricOpen(!historicOpen);
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full',
                  historicOpen
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/15 dark:text-dm-primary'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-100 dark:hover:bg-dm-surface-high'
                )}
              >
                <History size={22} />
                <span className="text-sm font-medium flex-1 text-left">Istoric Conversații</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform duration-200', historicOpen && 'rotate-180')}
                />
              </button>

              {/* Session list */}
              {historicOpen && (
                <div className="ml-3 pl-5 border-l-2 border-slate-200 dark:border-dm-surface-high flex flex-col gap-0.5 max-h-48 overflow-y-auto py-1">
                  {loadingSessions ? (
                    <div className="py-3 flex justify-center">
                      <div className="size-4 border-2 border-primary/30 dark:border-dm-primary/30 border-t-primary dark:border-t-dm-primary rounded-full animate-spin" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-dm-on-surface-variant py-2 px-2">
                      Nicio conversație
                    </p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-100 dark:hover:bg-dm-surface-high transition-colors"
                        onClick={() => handleSelectSession(session)}
                      >
                        <span className="truncate flex-1">
                          {session.title && session.title !== 'Conversație nouă'
                            ? session.title
                            : 'Conversație fără titlu'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Rest of nav */}
              <Link
                href="/tickets"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  pathname.startsWith('/tickets')
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/15 dark:text-dm-primary'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-100 dark:hover:bg-dm-surface-high'
                )}
              >
                <Ticket size={22} />
                <span className="text-sm font-medium">Tichete</span>
              </Link>

              <Link
                href="/settings"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  pathname.startsWith('/settings')
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/15 dark:text-dm-primary'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-100 dark:hover:bg-dm-surface-high'
                )}
              >
                <Settings size={22} />
                <span className="text-sm font-medium">Setări</span>
              </Link>

              {isAdmin && (
                <>
                  <div className="my-2 border-t border-slate-100 dark:border-dm-surface-high" />
                  {adminItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary dark:bg-dm-primary/15 dark:text-dm-primary'
                            : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-100 dark:hover:bg-dm-surface-high'
                        )}
                      >
                        <item.icon size={22} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-dm-on-surface-variant hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors w-full border-t border-slate-100 dark:border-dm-surface-high pt-6"
            >
              <LogOut size={22} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
